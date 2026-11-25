import { AuthService } from '../application/use-cases/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthRateLimiterService } from '../infrastructure/services/auth-rate-limiter.service';
import { IAuthRepository } from '../domain/repositories/auth.repository.interface';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AdminLoginDto } from '../presentation/dto/admin-login.dto';
import * as bcrypt from 'bcrypt';
import { RoleName, UserStatus } from '@prisma/client';
import { SEED_TEST_ACCOUNTS, seedLocalDatabase } from '../../../database/seeds/seed-local';

describe('Admin Email/Password Authentication & Seeding Security', () => {
  let service: AuthService;
  let mockAuthRepository: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockRateLimiter: any;

  const rawTestPassword = 'SecureAdminPassword123!';
  let adminPasswordHash: string;

  beforeAll(async () => {
    adminPasswordHash = await bcrypt.hash(rawTestPassword, 10);
  });

  beforeEach(() => {
    mockAuthRepository = {
      db: {
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: 'admin-uuid-1', phone: '+16505550002', email: 'admin@careid.test', status: 'ACTIVE' }),
        },
      },
      findUserByEmail: jest.fn(),
      findUserByPhone: jest.fn(),
      createUser: jest.fn(),
      createOtp: jest.fn(),
      findOtpByChallengeId: jest.fn(),
      markOtpVerified: jest.fn(),
      incrementOtpAttempts: jest.fn(),
      incrementOtpResends: jest.fn(),
      createSession: jest.fn().mockResolvedValue({ id: 'session-admin-1', isActive: true }),
      findActiveSessions: jest.fn().mockResolvedValue([]),
      findSessionById: jest.fn().mockResolvedValue({ id: 'session-admin-1', userId: 'admin-uuid-1', isActive: true }),
      invalidateSession: jest.fn(),
      invalidateAllSessions: jest.fn(),
      invalidateOtherSessions: jest.fn(),
      createRefreshToken: jest.fn().mockResolvedValue({ id: 'rt-1', userId: 'admin-uuid-1' }),
      findRefreshToken: jest.fn().mockResolvedValue(null),
      findRefreshTokenById: jest.fn().mockResolvedValue(null),
      findRecentTokensByUser: jest.fn().mockResolvedValue([]),
      revokeRefreshToken: jest.fn(),
      revokeRefreshTokenIfActive: jest.fn().mockResolvedValue(true),
      revokeAllUserTokens: jest.fn(),
      createAuditLog: jest.fn().mockResolvedValue(undefined),
      findUserRoles: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockImplementation((payload: any) => `mock.jwt.${payload.sub || 'token'}`),
      verify: jest.fn().mockReturnValue({ sub: 'admin-uuid-1', sessionId: 'session-admin-1', jti: 'token-uuid-1', type: 'refresh' }),
      decode: jest.fn(),
    } as unknown as JwtService;

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_EXPIRATION') return '15m';
        if (key === 'REFRESH_TOKEN_EXPIRATION') return '7d';
        if (key === 'JWT_SECRET') return 'careid_test_jwt_secret_32_characters_long!';
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      }),
    } as unknown as ConfigService;

    mockRateLimiter = {
      checkVerifyOtpLimit: jest.fn(),
      checkRequestOtpLimit: jest.fn(),
      checkRefreshTokenLimit: jest.fn(),
      checkResendOtpCooldown: jest.fn(),
    } as unknown as AuthRateLimiterService;

    service = new AuthService(
      mockAuthRepository as IAuthRepository,
      mockJwtService,
      mockConfigService,
      mockRateLimiter,
    );
  });

  describe('1. Successful Admin & Super Admin Login', () => {
    it('should successfully authenticate an ADMIN account with valid email and password', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue({
        id: 'admin-uuid-1',
        phone: '+16505550002',
        email: 'admin@careid.test',
        passwordHash: adminPasswordHash,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockAuthRepository.findUserRoles.mockResolvedValue(['ADMIN']);

      const response = await service.adminLogin(
        { email: 'admin@careid.test', password: rawTestPassword },
        '127.0.0.1',
        'Mozilla/5.0 TestBrowser',
      );

      expect(response).toBeDefined();
      expect(response.accessToken).toBe('mock.jwt.admin-uuid-1');
      expect(response.refreshToken).toBeDefined();
      expect(response.expiresIn).toBe('15m');
      expect(response.user).toEqual({
        id: 'admin-uuid-1',
        email: 'admin@careid.test',
        phone: '+16505550002',
        status: 'ACTIVE',
        roles: ['ADMIN'],
        permissions: ['read:all', 'write:all', 'read:audit-logs'],
      });

      // Verify audit log and session
      expect(mockAuthRepository.createSession).toHaveBeenCalledWith('admin-uuid-1', '127.0.0.1', 'Mozilla/5.0 TestBrowser');
      expect(mockAuthRepository.createAuditLog).toHaveBeenCalledWith('admin-uuid-1', 'ADMIN_LOGIN', expect.stringContaining('Admin logged in'), '127.0.0.1');
    });

    it('should successfully authenticate a SUPER_ADMIN account with elevated permissions', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue({
        id: 'superadmin-uuid-1',
        phone: '+16505550001',
        email: 'superadmin@careid.test',
        passwordHash: adminPasswordHash,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockAuthRepository.findUserRoles.mockResolvedValue(['SUPER_ADMIN']);

      const response = await service.adminLogin(
        { email: 'superadmin@careid.test', password: rawTestPassword },
        '10.0.0.5',
      );

      expect(response).toBeDefined();
      expect(response.user.roles).toContain('SUPER_ADMIN');
      expect(response.user.permissions).toEqual(
        expect.arrayContaining(['read:all', 'write:all', 'delete:all', 'read:audit-logs', 'manage:roles']),
      );
    });

    it('should normalize email address with whitespace and mixed-case', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue({
        id: 'admin-uuid-1',
        phone: '+16505550002',
        email: 'admin@careid.test',
        passwordHash: adminPasswordHash,
        status: 'ACTIVE',
      });
      mockAuthRepository.findUserRoles.mockResolvedValue(['ADMIN']);

      const response = await service.adminLogin(
        { email: '  Admin@CareID.Test  ', password: rawTestPassword },
      );

      expect(mockAuthRepository.findUserByEmail).toHaveBeenCalledWith('admin@careid.test');
      expect(response.user.email).toBe('admin@careid.test');
    });
  });

  describe('2. Authentication Failures (Email & Password)', () => {
    it('should throw UnauthorizedException for an unregistered email address', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.adminLogin({ email: 'nonexistent@careid.test', password: rawTestPassword }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw generic UnauthorizedException for an incorrect password', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue({
        id: 'admin-uuid-1',
        phone: '+16505550002',
        email: 'admin@careid.test',
        passwordHash: adminPasswordHash,
        status: 'ACTIVE',
      });

      await expect(
        service.adminLogin({ email: 'admin@careid.test', password: 'WrongPassword123!' }, '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuthRepository.createAuditLog).toHaveBeenCalledWith(
        'admin-uuid-1',
        'ADMIN_LOGIN_FAILED',
        'Invalid password attempt',
        '127.0.0.1',
      );
    });

    it('should throw generic UnauthorizedException if account has no passwordHash set', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue({
        id: 'user-no-pwd',
        phone: '+16505550002',
        email: 'admin@careid.test',
        passwordHash: null,
        status: 'ACTIVE',
      });

      await expect(
        service.adminLogin({ email: 'admin@careid.test', password: rawTestPassword }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });
  });

  describe('3. Role Authorization & Privilege Guarding', () => {
    it('should reject a PATIENT attempting to use the admin login endpoint with 403 Forbidden', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue({
        id: 'patient-uuid',
        phone: '+16505550004',
        email: 'patient@careid.test',
        passwordHash: adminPasswordHash,
        status: 'ACTIVE',
      });
      mockAuthRepository.findUserRoles.mockResolvedValue(['PATIENT']);

      await expect(
        service.adminLogin({ email: 'patient@careid.test', password: rawTestPassword }, '127.0.0.1'),
      ).rejects.toThrow(new ForbiddenException('Access denied. Administrator privileges required.'));

      expect(mockAuthRepository.createAuditLog).toHaveBeenCalledWith(
        'patient-uuid',
        'ADMIN_LOGIN_FAILED',
        'Non-admin user attempted admin login',
        '127.0.0.1',
      );
    });

    it('should reject a DOCTOR attempting to use the admin login endpoint with 403 Forbidden', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue({
        id: 'doctor-uuid',
        phone: '+16505550003',
        email: 'doctor@careid.test',
        passwordHash: adminPasswordHash,
        status: 'ACTIVE',
      });
      mockAuthRepository.findUserRoles.mockResolvedValue(['DOCTOR']);

      await expect(
        service.adminLogin({ email: 'doctor@careid.test', password: rawTestPassword }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject a STAFF member attempting to use the admin login endpoint with 403 Forbidden', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue({
        id: 'staff-uuid',
        phone: '+16505550006',
        email: 'staff@careid.test',
        passwordHash: adminPasswordHash,
        status: 'ACTIVE',
      });
      mockAuthRepository.findUserRoles.mockResolvedValue(['STAFF']);

      await expect(
        service.adminLogin({ email: 'staff@careid.test', password: rawTestPassword }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('4. Account Status Ineligibility', () => {
    it('should reject an INACTIVE Admin account', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue({
        id: 'admin-uuid-inactive',
        phone: '+16505550002',
        email: 'admin@careid.test',
        passwordHash: adminPasswordHash,
        status: 'INACTIVE',
      });

      await expect(
        service.adminLogin({ email: 'admin@careid.test', password: rawTestPassword }),
      ).rejects.toThrow(new UnauthorizedException('Account is inactive or blocked'));
    });

    it('should reject a BLOCKED Admin account', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue({
        id: 'admin-uuid-blocked',
        phone: '+16505550002',
        email: 'admin@careid.test',
        passwordHash: adminPasswordHash,
        status: 'BLOCKED',
      });

      await expect(
        service.adminLogin({ email: 'admin@careid.test', password: rawTestPassword }),
      ).rejects.toThrow(new UnauthorizedException('Account is inactive or blocked'));
    });
  });

  describe('5. Password Security & Sensitive Field Sanitization', () => {
    it('should never expose password or passwordHash in the returned response object', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue({
        id: 'admin-uuid-1',
        phone: '+16505550002',
        email: 'admin@careid.test',
        passwordHash: adminPasswordHash,
        status: 'ACTIVE',
      });
      mockAuthRepository.findUserRoles.mockResolvedValue(['ADMIN']);

      const response = await service.adminLogin({ email: 'admin@careid.test', password: rawTestPassword });

      expect((response as any).password).toBeUndefined();
      expect((response as any).passwordHash).toBeUndefined();
      expect((response.user as any).password).toBeUndefined();
      expect((response.user as any).passwordHash).toBeUndefined();
    });

    it('should verify password comparison against bcrypt password hash', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue({
        id: 'admin-uuid-1',
        phone: '+16505550002',
        email: 'admin@careid.test',
        passwordHash: adminPasswordHash,
        status: 'ACTIVE',
      });
      mockAuthRepository.findUserRoles.mockResolvedValue(['ADMIN']);

      const response = await service.adminLogin({ email: 'admin@careid.test', password: rawTestPassword });
      expect(response).toBeDefined();

      const isValid = await bcrypt.compare(rawTestPassword, adminPasswordHash);
      expect(isValid).toBe(true);
      const isInvalid = await bcrypt.compare('WrongPassword', adminPasswordHash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('6. DTO Validation Checks', () => {
    it('should reject empty email address', async () => {
      const dto = plainToInstance(AdminLoginDto, { email: '', password: rawTestPassword });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const dto = plainToInstance(AdminLoginDto, { email: 'not-an-email', password: rawTestPassword });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should reject empty password', async () => {
      const dto = plainToInstance(AdminLoginDto, { email: 'admin@careid.test', password: '' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should reject password shorter than 8 characters', async () => {
      const dto = plainToInstance(AdminLoginDto, { email: 'admin@careid.test', password: 'short' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should accept valid email and password with automatic trimming', async () => {
      const dto = plainToInstance(AdminLoginDto, {
        email: '  admin@careid.test  ',
        password: rawTestPassword,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.email).toBe('admin@careid.test');
    });
  });

  describe('7. Seeding Idempotency & Password Preservation', () => {
    let mockPrisma: any;
    const prevEnv = process.env;

    beforeEach(() => {
      process.env = {
        ...prevEnv,
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/hvapi_db?schema=public',
      };
      mockPrisma = {
        role: {
          upsert: jest.fn().mockImplementation(({ where }) => Promise.resolve({ id: `role-${where.name}`, name: where.name })),
        },
        user: {
          findFirst: jest.fn(),
          upsert: jest.fn(),
        },
        userRole: {
          upsert: jest.fn().mockResolvedValue({ id: 'ur-1' }),
        },
        facility: {
          upsert: jest.fn().mockResolvedValue({ id: 'fac-1' }),
        },
        facilityBranch: {
          findFirst: jest.fn().mockResolvedValue({ id: 'branch-1' }),
          create: jest.fn().mockResolvedValue({ id: 'branch-1' }),
        },
        facilityDepartment: {
          findFirst: jest.fn().mockResolvedValue({ id: 'dept-1' }),
          create: jest.fn().mockResolvedValue({ id: 'dept-1' }),
        },
        doctorProfile: {
          upsert: jest.fn().mockResolvedValue({ id: 'doc-1' }),
        },
        doctorFacility: {
          upsert: jest.fn().mockResolvedValue({ id: 'doc-fac-1' }),
        },
        staffMember: {
          upsert: jest.fn().mockResolvedValue({ id: 'staff-1' }),
        },
        patientProfile: {
          upsert: jest.fn().mockResolvedValue({ id: 'patient-1' }),
        },
        emergencyContact: {
          upsert: jest.fn().mockResolvedValue({ id: 'ec-1' }),
        },
        healthCard: {
          upsert: jest.fn().mockResolvedValue({ id: 'card-1', cardNumber: 'HC-CAREID-2026-0004' }),
        },
        medicalRecord: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'record-1' }),
        },
        medicalAttachment: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'att-1' }),
        },
        insurancePolicy: {
          upsert: jest.fn().mockResolvedValue({ id: 'ins-1' }),
        },
        qrCode: {
          upsert: jest.fn().mockResolvedValue({ id: 'qr-1' }),
        },
        patientReferral: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'ref-1' }),
        },
        notification: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
        },
      };
    });

    it('should provision initial password hash when creating Admin account with adminPassword', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null); // User does not exist yet
      mockPrisma.user.upsert.mockImplementation((args: any) => Promise.resolve({ id: 'new-user-1', ...args.create }));

      await seedLocalDatabase(mockPrisma, { adminPassword: 'InitialAdminPassword123!' });

      const adminUpsertCall = mockPrisma.user.upsert.mock.calls.find(
        (call: any) => call[0].where.phone === '+16505550002',
      );

      expect(adminUpsertCall).toBeDefined();
      expect(adminUpsertCall[0].create.email).toBe('admin@careid.test');
      expect(adminUpsertCall[0].create.passwordHash).toBeDefined();
      expect(adminUpsertCall[0].create.passwordHash).not.toBe('InitialAdminPassword123!');
      expect(adminUpsertCall[0].create.passwordHash.startsWith('$2b$')).toBe(true);
    });

    it('should PRESERVE existing password hash on repeated seed runs without overwriting', async () => {
      const existingHash = '$2b$10$existingHashThatShouldNeverBeOverwritten12345';
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'admin-uuid-1',
        phone: '+16505550002',
        email: 'admin@careid.test',
        passwordHash: existingHash,
        status: UserStatus.ACTIVE,
      });
      mockPrisma.user.upsert.mockImplementation((args: any) => Promise.resolve({ id: 'admin-uuid-1', ...args.update }));

      // Seed run without reset flag
      await seedLocalDatabase(mockPrisma, { adminPassword: 'NewDifferentPassword!' });

      const adminUpsertCall = mockPrisma.user.upsert.mock.calls.find(
        (call: any) => call[0].where.phone === '+16505550002',
      );

      expect(adminUpsertCall[0].update.passwordHash).toBe(existingHash);
    });

    it('should reset password when resetAdminPassword flag is explicitly set', async () => {
      const existingHash = '$2b$10$existingHashThatShouldBeReset';
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'admin-uuid-1',
        phone: '+16505550002',
        email: 'admin@careid.test',
        passwordHash: existingHash,
        status: UserStatus.ACTIVE,
      });
      mockPrisma.user.upsert.mockImplementation((args: any) => Promise.resolve({ id: 'admin-uuid-1', ...args.update }));

      await seedLocalDatabase(mockPrisma, {
        adminPassword: 'ResetPassword123!',
        resetAdminPassword: true,
      });

      const adminUpsertCall = mockPrisma.user.upsert.mock.calls.find(
        (call: any) => call[0].where.phone === '+16505550002',
      );

      expect(adminUpsertCall[0].update.passwordHash).not.toBe(existingHash);
      expect(adminUpsertCall[0].update.passwordHash.startsWith('$2b$')).toBe(true);
    });

    afterAll(() => {
      process.env = prevEnv;
    });
  });
});
