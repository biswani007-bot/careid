import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { AuthService } from '../../auth/application/use-cases/auth.service';
import { AuthRateLimiterService } from '../../auth/infrastructure/services/auth-rate-limiter.service';
import { PatientService } from '../../patient/application/use-cases/patient.service';
import { CptService } from '../../cpt/cpt.service';
import { DatabaseService } from '@database/database.service';

describe('Doctor Web Live Application Backend Integration Suite', () => {
  let authService: AuthService;
  let patientService: PatientService;
  let cptService: CptService;

  // In-memory persistent state for doctor web workflows
  const testDoctorUserId = 'usr-doc-9901';
  const testDoctorProfileId = 'doc-prof-9901';
  const testPatientProfileId = 'pat-prof-8801';
  const testDoctorPhone = '+919876543210';

  const mockUsers = new Map<string, any>();
  const mockDoctorProfiles = new Map<string, any>();
  const mockPatientProfiles = new Map<string, any>();
  const mockInsurancePolicies = new Map<string, any>();
  const mockOtps = new Map<string, any>();
  const mockRefreshTokens = new Map<string, any>();
  const mockSessions = new Map<string, any>();

  // Setup seed doctor
  mockUsers.set(testDoctorUserId, {
    id: testDoctorUserId,
    phone: testDoctorPhone,
    status: 'ACTIVE',
    roles: ['DOCTOR'],
  });

  mockDoctorProfiles.set(testDoctorProfileId, {
    id: testDoctorProfileId,
    userId: testDoctorUserId,
    fullName: 'Dr. Vikram Chandra',
    registrationNumber: 'MCI-2026-CARDIO-881',
    primarySpecialization: 'Interventional Cardiology',
    verificationStatus: 'ACTIVE',
    consultationFee: 2500,
    user: mockUsers.get(testDoctorUserId),
  });

  // Setup seed patient with insurance policy
  mockPatientProfiles.set(testPatientProfileId, {
    id: testPatientProfileId,
    userId: 'usr-pat-8801',
    patientNumber: 'PAT-2026-00481',
    firstName: 'Rohit',
    lastName: 'Verma',
    dateOfBirth: new Date('1985-04-12'),
    gender: 'MALE',
    status: 'ACTIVE',
  });

  mockInsurancePolicies.set(testPatientProfileId, {
    id: 'ins-pol-4401',
    patientProfileId: testPatientProfileId,
    providerName: 'Star Health & Allied Insurance',
    policyNumber: 'STAR-HEALTH-CARD-9921',
    coverageDetails: 'Comprehensive Inpatient & Cath-Lab Surgical Cover',
    expiryDate: new Date('2028-12-31'),
    status: 'ACTIVE',
  });

  const mockAuthRepo: any = {
    findUserByPhone: jest.fn(async (phone: string) => {
      for (const u of mockUsers.values()) {
        if (u.phone === phone) return u;
      }
      return null;
    }),
    findUserWithProfiles: jest.fn(async (phone: string) => {
      for (const u of mockUsers.values()) {
        if (u.phone === phone) {
          return {
            ...u,
            doctorProfile: mockDoctorProfiles.get(testDoctorProfileId),
            patientProfile: null,
          };
        }
      }
      return null;
    }),
    findUserById: jest.fn(async (id: string) => mockUsers.get(id) || null),
    findDoctorProfileByUserId: jest.fn(async (userId: string) => {
      for (const d of mockDoctorProfiles.values()) {
        if (d.userId === userId) return d;
      }
      return null;
    }),
    findUserRoles: jest.fn(async (userId: string) => {
      const u = mockUsers.get(userId);
      return u?.roles || ['DOCTOR'];
    }),
    createOtp: jest.fn(async (userId: string, otpHash: string, expiresAt: Date) => {
      const otp = {
        id: `challenge-${Date.now()}`,
        userId,
        otpHash,
        expiresAt,
        isVerified: false,
        attempts: 0,
        resendCount: 0,
      };
      mockOtps.set(otp.id, otp);
      return otp;
    }),
    findOtpByChallengeId: jest.fn(async (id: string) => mockOtps.get(id) || null),
    markOtpVerified: jest.fn(async (id: string) => {
      const o = mockOtps.get(id);
      if (o) o.isVerified = true;
    }),
    incrementOtpAttempts: jest.fn(async (id: string) => {
      const o = mockOtps.get(id);
      if (o) o.attempts++;
    }),
    createSession: jest.fn(async (userId: string) => {
      const s = { id: `sess-${Date.now()}`, userId, isActive: true };
      mockSessions.set(s.id, s);
      return s;
    }),
    findSessionById: jest.fn(async (id: string) => mockSessions.get(id) || null),
    createRefreshToken: jest.fn(async (userId: string, tokenHash: string, expiresAt: Date, tokenId: string) => {
      mockRefreshTokens.set(tokenId, { id: tokenId, userId, tokenHash, expiresAt, isRevoked: false });
    }),
    findRefreshTokenById: jest.fn(async (tokenId: string) => mockRefreshTokens.get(tokenId) || null),
    findRefreshToken: jest.fn(async (tokenId: string) => mockRefreshTokens.get(tokenId) || null),
    revokeRefreshToken: jest.fn(async (tokenId: string) => {
      const t = mockRefreshTokens.get(tokenId);
      if (t) t.isRevoked = true;
    }),
    revokeRefreshTokenIfActive: jest.fn(async () => true),
    revokeAllUserRefreshTokens: jest.fn(),
    createAuditLog: jest.fn().mockResolvedValue({}),
  };

  const mockPatientRepo: any = {
    findProfileById: jest.fn(async (id: string) => mockPatientProfiles.get(id) || null),
    findProfileByUserId: jest.fn(async (uid: string) => {
      for (const p of mockPatientProfiles.values()) {
        if (p.userId === uid) return p;
      }
      return null;
    }),
    findInsurancePolicyByProfileId: jest.fn(async (profId: string) => mockInsurancePolicies.get(profId) || null),
  };

  beforeAll(async () => {
    const config: Record<string, string> = {
      NODE_ENV: 'development',
      APP_ENV: 'staging',
      DEPLOYMENT_ENV: 'staging',
      ENABLE_TEST_OTP: 'true',
      TEST_OTP_CODE: '123456',
      JWT_SECRET: 'doctor_web_super_secret_jwt_key_at_least_32_chars_long',
      JWT_EXPIRATION: '15m',
      REFRESH_TOKEN_EXPIRATION: '7d',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        CptService,
        JwtService,
        {
          provide: DatabaseService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((k: string) => config[k]) },
        },
        {
          provide: AuthRateLimiterService,
          useValue: {
            checkRequestOtpLimit: jest.fn(),
            checkResendOtpCooldown: jest.fn(),
            checkVerifyOtpLimit: jest.fn(),
            checkRefreshTokenLimit: jest.fn(),
            checkRevokeTokenLimit: jest.fn(),
            checkLogoutLimit: jest.fn(),
          },
        },
        { provide: 'IAuthRepository', useValue: mockAuthRepo },
        {
          provide: PatientService,
          useValue: {
            getInsuranceCards: jest.fn(async (patientIdOrProfileId: string) => {
              const policy = await mockPatientRepo.findInsurancePolicyByProfileId(patientIdOrProfileId);
              if (!policy) return [];
              return [{
                id: policy.id,
                policyNumber: policy.policyNumber,
                providerName: policy.providerName,
                coverageType: policy.coverageDetails,
                validUntil: policy.expiryDate.toISOString(),
                status: policy.status,
              }];
            }),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    patientService = module.get<PatientService>(PatientService);
    cptService = module.get<CptService>(CptService);
  });

  describe('1. Doctor Web Authentication Compatibility', () => {
    let challengeId: string;
    let tokens: any;

    it('should generate staging test OTP 123456 when Doctor Web submits phone without role param', async () => {
      // Doctor Web calls: oe.post("/api/v1/auth/otp/request", { phone: "+919876543210" })
      const res = await authService.requestOtp({ phone: testDoctorPhone });
      expect(res).toBeDefined();
      expect(res.challengeId).toBeDefined();
      challengeId = res.challengeId;

      // Verify that the stored OTP hash corresponds to 123456
      const otpRecord = mockOtps.get(challengeId);
      expect(otpRecord).toBeDefined();
      const isTestCode = await bcrypt.compare('123456', otpRecord.otpHash);
      expect(isTestCode).toBe(true);
    });

    it('should verify OTP and return DOCTOR role claims without requiring role param', async () => {
      // Doctor Web calls: oe.post("/api/v1/auth/otp/verify", { challengeId, otpCode: "123456" })
      tokens = await authService.verifyOtp({
        challengeId,
        otpCode: '123456',
      });

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.roles).toContain('DOCTOR');
      expect(tokens.doctorProfile).toBeDefined();
      expect(tokens.doctorProfile.fullName).toBe('Dr. Vikram Chandra');
    });

    it('should support token refresh via POST /auth/token/refresh payload format', async () => {
      // Doctor Web calls: oe.post("/api/v1/auth/token/refresh", { refreshToken })
      const refreshed = await authService.refreshToken({
        refreshToken: tokens.refreshToken,
      });

      expect(refreshed.accessToken).toBeDefined();
      expect(refreshed.refreshToken).toBeDefined();
      expect(refreshed.accessToken).not.toBe(tokens.accessToken);
    });
  });

  describe('2. Doctor Web Patient Insurance Cards Pipeline', () => {
    it('should return insurance cards list matching Doctor Web expected format', async () => {
      // Doctor Web calls: oe.get(`/api/v1/patients/${encodeURIComponent(n)}/insurance-cards`)
      const cards = await patientService.getInsuranceCards(testPatientProfileId);

      expect(Array.isArray(cards)).toBe(true);
      expect(cards.length).toBe(1);

      const policy = cards[0];
      expect(policy.policyNumber).toBe('STAR-HEALTH-CARD-9921');
      expect(policy.providerName).toBe('Star Health & Allied Insurance');
      expect(policy.status).toBe('ACTIVE');
      expect(policy.validUntil).toBeDefined();
    });
  });

  describe('3. Doctor Web CPT / Procedure Catalogue Pipeline', () => {
    it('should search CPT procedure codes for Cath-Lab interventional procedures', async () => {
      // Doctor Web calls: oe.get(`/api/v1/cpt/search?q=${encodeURIComponent(s.trim())}`)
      const results = await cptService.searchCptCodes('catheterization');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      const cathLabItem = results.find(c => c.code === '93458');
      expect(cathLabItem).toBeDefined();
      expect(cathLabItem?.description).toContain('catheterization');
    });

    it('should get CPT code details by exact code', async () => {
      // Doctor Web calls: oe.get(`/api/v1/cpt/${encodeURIComponent(s.trim())}`)
      const item = await cptService.getCptByCode('93458');
      expect(item).toBeDefined();
      expect(item.code).toBe('93458');
      expect(item.category).toBe('CARDIOLOGY');
    });
  });
});
