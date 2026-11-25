import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../application/use-cases/auth.service';
import { AuthRateLimiterService } from '../infrastructure/services/auth-rate-limiter.service';
import { IAuthRepository } from '../domain/repositories/auth.repository.interface';
import {
  SEED_TEST_ACCOUNTS,
  validateSeedEnvironment,
  seedLocalDatabase,
} from '../../../database/seeds/seed-local';
import { RoleName, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

describe('CareID Seeding & Multi-Role Authentication Verification', () => {
  describe('Phase 2: Seed Script Safety Guards & Idempotency', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should abort immediately and throw if NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

      expect(() => validateSeedEnvironment()).toThrow(
        /CRITICAL SAFETY GUARD: Local seeding is strictly forbidden when NODE_ENV=production/i,
      );
    });

    it('should abort immediately and throw if DATABASE_URL points to a remote cloud database', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://user:pass@careid-prod.rds.amazonaws.com:5432/db';

      expect(() => validateSeedEnvironment()).toThrow(
        /CRITICAL SAFETY GUARD: DATABASE_URL appears to target a remote cloud host/i,
      );
    });

    it('should pass environment validation for local development', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/hvapi_db?schema=public';

      expect(() => validateSeedEnvironment()).not.toThrow();
    });

    it('should permit staging seeding when NODE_ENV=production, APP_ENV=staging, and ALLOW_SERVER_TEST_SEED=true', () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_ENV = 'staging';
      process.env.ALLOW_SERVER_TEST_SEED = 'true';
      process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/careid_staging_db?schema=public';

      expect(() => validateSeedEnvironment()).not.toThrow();
    });

    it('should reject staging seeding when ALLOW_SERVER_TEST_SEED is missing or not true', () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_ENV = 'staging';
      delete process.env.ALLOW_SERVER_TEST_SEED;
      process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/careid_staging_db?schema=public';

      expect(() => validateSeedEnvironment()).toThrow(
        /CONTROLLED SERVER TESTING GUARD: To seed synthetic test data into a server staging environment/i,
      );
    });

    it('should strictly reject seeding in production even if operator sets ALLOW_SERVER_TEST_SEED=true', () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_ENV = 'production';
      process.env.ALLOW_SERVER_TEST_SEED = 'true';
      process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/careid_staging_db?schema=public';

      expect(() => validateSeedEnvironment()).toThrow(
        /CRITICAL SAFETY GUARD: Seeding synthetic test data is strictly forbidden when APP_ENV or DEPLOYMENT_ENV is set to production/i,
      );
    });

    it('should reject seeding when APP_ENV=staging and DEPLOYMENT_ENV=production (conflicting declarations)', () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_ENV = 'staging';
      process.env.DEPLOYMENT_ENV = 'production';
      process.env.ALLOW_SERVER_TEST_SEED = 'true';
      process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/careid_staging_db?schema=public';

      expect(() => validateSeedEnvironment()).toThrow(
        /CRITICAL SAFETY GUARD: Conflicting environment declarations detected/i,
      );
    });

    it('should reject seeding when APP_ENV=production and DEPLOYMENT_ENV=staging (conflicting declarations)', () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_ENV = 'production';
      process.env.DEPLOYMENT_ENV = 'staging';
      process.env.ALLOW_SERVER_TEST_SEED = 'true';
      process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/careid_staging_db?schema=public';

      expect(() => validateSeedEnvironment()).toThrow(
        /CRITICAL SAFETY GUARD: Conflicting environment declarations detected/i,
      );
    });

    it('should permit seeding when both APP_ENV and DEPLOYMENT_ENV are set to staging with explicit seed approval', () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_ENV = 'staging';
      process.env.DEPLOYMENT_ENV = 'staging';
      process.env.ALLOW_SERVER_TEST_SEED = 'true';
      process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/careid_staging_db?schema=public';

      expect(() => validateSeedEnvironment()).not.toThrow();
    });

    it('should permit staging seeding when NODE_ENV=production and both application variables are staging', () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_ENV = 'staging';
      process.env.DEPLOYMENT_ENV = 'staging';
      process.env.ALLOW_SERVER_TEST_SEED = 'true';
      process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/careid_staging_db?schema=public';

      expect(() => validateSeedEnvironment()).not.toThrow();
    });

    it('should reject seeding if DATABASE_URL contains production keywords', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/careid_prod_db?schema=public';

      expect(() => validateSeedEnvironment()).toThrow(
        /contains production keywords \('prod'\)/i,
      );
    });

    it('should reject seeding if DATABASE_URL is missing or empty', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.DATABASE_URL;

      expect(() => validateSeedEnvironment()).toThrow(
        /DATABASE_URL environment variable is missing/i,
      );
    });

    it('should execute seedLocalDatabase with Prisma upsert without errors', async () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/hvapi_db?schema=public';

      const mockRoleRecords = new Map<string, any>();
      const mockUserRecords = new Map<string, any>();
      const mockUserRoleRecords = new Map<string, any>();
      const mockDoctorProfiles = new Map<string, any>();
      const mockPatientProfiles = new Map<string, any>();
      const mockStaffMembers = new Map<string, any>();

      const mockPrisma: any = {
        role: {
          upsert: jest.fn().mockImplementation(({ where, update, create }) => {
            const id = mockRoleRecords.get(where.name)?.id || `role-${where.name}`;
            const record = { id, name: where.name, description: create.description };
            mockRoleRecords.set(where.name, record);
            return Promise.resolve(record);
          }),
        },
        user: {
          upsert: jest.fn().mockImplementation(({ where, update, create }) => {
            const id = mockUserRecords.get(where.phone)?.id || `user-${where.phone}`;
            const record = { id, phone: where.phone, status: create.status || 'ACTIVE' };
            mockUserRecords.set(where.phone, record);
            return Promise.resolve(record);
          }),
        },
        userRole: {
          upsert: jest.fn().mockImplementation(({ where, update, create }) => {
            const key = `${where.userId_roleId.userId}_${where.userId_roleId.roleId}`;
            const record = { id: `ur-${key}`, userId: create.userId, roleId: create.roleId };
            mockUserRoleRecords.set(key, record);
            return Promise.resolve(record);
          }),
        },
        facility: {
          upsert: jest.fn().mockResolvedValue({
            id: 'facility-metro-001',
            facilityCode: 'FAC-METRO-001',
            name: 'Metro General Hospital',
          }),
        },
        facilityBranch: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'branch-001', branchName: 'Downtown Main Campus' }),
        },
        facilityDepartment: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'dept-cardiology-001', name: 'Cardiology Department' }),
        },
        doctorProfile: {
          upsert: jest.fn().mockImplementation(({ where, update, create }) => {
            const record = { id: 'doc-prof-001', userId: where.userId, fullName: create.fullName };
            mockDoctorProfiles.set(where.userId, record);
            return Promise.resolve(record);
          }),
        },
        doctorFacility: {
          upsert: jest.fn().mockResolvedValue({ id: 'doc-fac-001' }),
        },
        staffMember: {
          upsert: jest.fn().mockImplementation(({ where, update, create }) => {
            const record = { id: 'staff-001', employeeCode: where.employeeCode, fullName: create.fullName };
            mockStaffMembers.set(where.employeeCode, record);
            return Promise.resolve(record);
          }),
        },
        patientProfile: {
          upsert: jest.fn().mockImplementation(({ where, update, create }) => {
            const record = { id: 'patient-prof-001', userId: where.userId, patientNumber: create.patientNumber };
            mockPatientProfiles.set(where.userId, record);
            return Promise.resolve(record);
          }),
        },
        emergencyContact: {
          upsert: jest.fn().mockResolvedValue({ id: 'ec-001' }),
        },
        insurancePolicy: {
          upsert: jest.fn().mockResolvedValue({ id: 'ins-001' }),
        },
        healthCard: {
          upsert: jest.fn().mockResolvedValue({ id: 'card-001', cardNumber: 'HC-CAREID-2026-0004' }),
        },
        qrCode: {
          upsert: jest.fn().mockResolvedValue({ id: 'qr-001' }),
        },
        medicalRecord: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'rec-001' }),
        },
        medicalAttachment: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'att-001', virusScanStatus: 'CLEAN' }),
        },
        patientReferral: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'ref-001' }),
        },
        notification: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'notif-001' }),
        },
      };

      const result = await seedLocalDatabase(mockPrisma);

      expect(result.rolesSeeded).toBe(7);
      expect(result.usersSeeded).toBe(7);
      expect(result.facilitiesSeeded).toBe(1);
      expect(result.doctorsSeeded).toBe(1);
      expect(result.patientsSeeded).toBe(1);
      expect(result.staffSeeded).toBe(1);

      // Verify all 7 roles were seeded
      expect(mockPrisma.role.upsert).toHaveBeenCalledTimes(7);
      // Verify all 7 users were seeded
      expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(7);
      expect(mockPrisma.userRole.upsert).toHaveBeenCalledTimes(7);
    });
  });

  describe('Phase 3 & 5: Role Authentication & Authorization Contracts', () => {
    let authService: AuthService;
    let mockAuthRepo: any;
    let jwtService: JwtService;
    let configService: ConfigService;
    let rateLimiter: AuthRateLimiterService;

    const testUsers = new Map<string, { id: string; phone: string; status: UserStatus; roles: string[] }>();
    const testOtps = new Map<string, { id: string; userId: string; otpHash: string; expiresAt: Date; isVerified: boolean; attempts: number }>();
    const testSessions = new Map<string, { id: string; userId: string; isActive: boolean }>();
    const testRefreshTokens = new Map<string, { id: string; userId: string; tokenHash: string; expiresAt: Date; isRevoked: boolean; tokenId: string }>();

    beforeEach(async () => {
      testUsers.clear();
      testOtps.clear();
      testSessions.clear();
      testRefreshTokens.clear();

      // Seed in-memory mock repository with all 7 test accounts
      for (const acc of SEED_TEST_ACCOUNTS) {
        testUsers.set(acc.phone, {
          id: `usr-${acc.role.toLowerCase()}`,
          phone: acc.phone,
          status: UserStatus.ACTIVE,
          roles: [acc.role],
        });
      }

      mockAuthRepo = {
        db: {
          user: {
            findUnique: jest.fn().mockImplementation(({ where }) => {
              for (const u of testUsers.values()) {
                if (u.id === where.id || u.phone === where.phone) return Promise.resolve(u);
              }
              return Promise.resolve(null);
            }),
          },
        },
        findUserByPhone: jest.fn().mockImplementation((phone: string) => {
          return Promise.resolve(testUsers.get(phone) || null);
        }),
        createUser: jest.fn().mockImplementation((phone: string) => {
          const user = { id: `usr-${Date.now()}`, phone, status: UserStatus.ACTIVE, roles: ['PATIENT'] };
          testUsers.set(phone, user);
          return Promise.resolve(user);
        }),
        findUserRoles: jest.fn().mockImplementation((userId: string) => {
          for (const u of testUsers.values()) {
            if (u.id === userId) return Promise.resolve(u.roles);
          }
          return Promise.resolve(['PATIENT']);
        }),
        createOtp: jest.fn().mockImplementation((userId: string, otpHash: string, expiresAt: Date) => {
          const id = `otp-ch-${Date.now()}-${Math.random()}`;
          const otp = { id, userId, otpHash, expiresAt, isVerified: false, attempts: 0, resendCount: 0 };
          testOtps.set(id, otp);
          return Promise.resolve(otp);
        }),
        findOtpByChallengeId: jest.fn().mockImplementation((challengeId: string) => {
          return Promise.resolve(testOtps.get(challengeId) || null);
        }),
        markOtpVerified: jest.fn().mockImplementation((id: string) => {
          const otp = testOtps.get(id);
          if (otp) otp.isVerified = true;
          return Promise.resolve(otp);
        }),
        incrementOtpAttempts: jest.fn().mockImplementation((id: string) => {
          const otp = testOtps.get(id);
          if (otp) otp.attempts += 1;
          return Promise.resolve(otp);
        }),
        incrementOtpResends: jest.fn().mockImplementation((id: string, otpHash: string, expiresAt: Date) => {
          const otp = testOtps.get(id);
          if (otp) {
            otp.otpHash = otpHash;
            otp.expiresAt = expiresAt;
          }
          return Promise.resolve(otp);
        }),
        createSession: jest.fn().mockImplementation((userId: string) => {
          const session = { id: `sess-${Date.now()}`, userId, isActive: true };
          testSessions.set(session.id, session);
          return Promise.resolve(session);
        }),
        findSessionById: jest.fn().mockImplementation((sessionId: string) => {
          return Promise.resolve(testSessions.get(sessionId) || null);
        }),
        invalidateSession: jest.fn().mockImplementation((sessionId: string) => {
          const s = testSessions.get(sessionId);
          if (s) s.isActive = false;
          return Promise.resolve();
        }),
        invalidateAllSessions: jest.fn().mockImplementation((userId: string) => {
          for (const s of testSessions.values()) {
            if (s.userId === userId) s.isActive = false;
          }
          return Promise.resolve();
        }),
        createRefreshToken: jest.fn().mockImplementation((userId: string, tokenHash: string, expiresAt: Date, tokenId: string) => {
          const rt = { id: `rt-${tokenId}`, userId, tokenHash, expiresAt, isRevoked: false, tokenId };
          testRefreshTokens.set(tokenId, rt);
          return Promise.resolve(rt);
        }),
        findRefreshTokenById: jest.fn().mockImplementation((tokenId: string) => {
          return Promise.resolve(testRefreshTokens.get(tokenId) || null);
        }),
        revokeRefreshToken: jest.fn().mockImplementation((tokenId: string) => {
          const rt = testRefreshTokens.get(tokenId);
          if (rt) rt.isRevoked = true;
          return Promise.resolve();
        }),
        revokeRefreshTokenIfActive: jest.fn().mockImplementation((id: string) => {
          for (const rt of testRefreshTokens.values()) {
            if (rt.id === id) {
              if (rt.isRevoked) return Promise.resolve(false);
              rt.isRevoked = true;
              return Promise.resolve(true);
            }
          }
          return Promise.resolve(true);
        }),
        revokeAllUserTokens: jest.fn().mockImplementation((userId: string) => {
          for (const rt of testRefreshTokens.values()) {
            if (rt.userId === userId) rt.isRevoked = true;
          }
          return Promise.resolve();
        }),
        createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: 'IAuthRepository', useValue: mockAuthRepo },
          {
            provide: JwtService,
            useValue: new JwtService({
              secret: 'careid-testing-jwt-secret-min-64-characters-for-testing-purposes-only',
            }),
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation((key: string) => {
                const config: Record<string, string> = {
                  NODE_ENV: 'development',
                  JWT_SECRET: 'careid-testing-jwt-secret-min-64-characters-for-testing-purposes-only',
                  JWT_EXPIRATION: '15m',
                  REFRESH_TOKEN_EXPIRATION: '7d',
                  ENABLE_TEST_OTP: 'true',
                  TEST_PHONE_NUMBERS: SEED_TEST_ACCOUNTS.map((a) => a.phone).join(','),
                  TEST_OTP_CODE: '123456',
                };
                return config[key];
              }),
            },
          },
          {
            provide: AuthRateLimiterService,
            useValue: {
              checkRequestOtpLimit: jest.fn(),
              checkVerifyOtpLimit: jest.fn(),
              checkResendOtpCooldown: jest.fn(),
              checkRefreshTokenLimit: jest.fn(),
            },
          },
        ],
      }).compile();

      authService = module.get<AuthService>(AuthService);
      jwtService = module.get<JwtService>(JwtService);
      configService = module.get<ConfigService>(ConfigService);
    });

    it.each(SEED_TEST_ACCOUNTS)(
      'should successfully authenticate %s (%s) using test OTP 123456 and verify claims',
      async (account) => {
        // Step 1: Request OTP challenge
        const otpResponse = await authService.requestOtp({ phone: account.phone }, '127.0.0.1');
        expect(otpResponse).toBeDefined();
        expect(otpResponse.challengeId).toBeDefined();
        expect(otpResponse.message).toContain('OTP sent successfully');

        // Step 2: Verify OTP using standard development bypass code "123456"
        const verifyResponse = await authService.verifyOtp(
          { challengeId: otpResponse.challengeId, otpCode: '123456', phone: account.phone },
          '127.0.0.1',
          'CareID-TestAgent/1.0',
        );

        expect(verifyResponse).toBeDefined();
        expect(verifyResponse.accessToken).toBeDefined();
        expect(verifyResponse.refreshToken).toBeDefined();
        expect(verifyResponse.expiresIn).toBe('15m');

        // Step 3: Decode and verify JWT access token structure & claims
        const decodedAccess: any = jwtService.verify(verifyResponse.accessToken);
        expect(decodedAccess.sub).toBe(`usr-${account.role.toLowerCase()}`);
        expect(decodedAccess.phone).toBe(account.phone);
        expect(decodedAccess.roles).toContain(account.role);

        // Step 4: Verify profile retrieval via getMe
        const me = await authService.getMe(decodedAccess.sub, '127.0.0.1');
        expect(me.phone).toBe(account.phone);
        expect(me.status).toBe('ACTIVE');
        expect(me.roles).toContain(account.role);
        expect(me.permissions.length).toBeGreaterThan(0);
      },
    );

    it('should reject authentication if incorrect OTP is entered', async () => {
      const otpResponse = await authService.requestOtp({ phone: '+16505550004' }, '127.0.0.1');

      await expect(
        authService.verifyOtp(
          { challengeId: otpResponse.challengeId, otpCode: '999999', phone: '+16505550004' },
          '127.0.0.1',
        ),
      ).rejects.toThrow('Invalid OTP code');
    });

    it('should rotate refresh token and revoke previous session token', async () => {
      const otpResponse = await authService.requestOtp({ phone: '+16505550001' }, '127.0.0.1');
      const verifyResponse = await authService.verifyOtp(
        { challengeId: otpResponse.challengeId, otpCode: '123456' },
        '127.0.0.1',
      );

      const refreshResponse = await authService.refreshToken(
        { refreshToken: verifyResponse.refreshToken },
        '127.0.0.1',
      );

      expect(refreshResponse).toBeDefined();
      expect(refreshResponse.accessToken).toBeDefined();
      expect(refreshResponse.refreshToken).toBeDefined();
      expect(refreshResponse.refreshToken).not.toBe(verifyResponse.refreshToken);
    }, 30000);

    it('should successfully logout and invalidate refresh token', async () => {
      const otpResponse = await authService.requestOtp({ phone: '+16505550003' }, '127.0.0.1');
      const verifyResponse = await authService.verifyOtp(
        { challengeId: otpResponse.challengeId, otpCode: '123456' },
        '127.0.0.1',
      );

      const logoutResponse = await authService.logout(
        { refreshToken: verifyResponse.refreshToken },
        '127.0.0.1',
      );

      expect(logoutResponse.success).toBe(true);
      expect(logoutResponse.message).toContain('Logged out successfully');
    });
  });
});
