import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../application/use-cases/auth.service';
import { AuthRateLimiterService } from '../infrastructure/services/auth-rate-limiter.service';
import { DoctorService } from '../../doctor/application/use-cases/doctor.service';

describe('Doctor OTP Authentication Specification (Phase 12)', () => {
  let authService: AuthService;
  let jwtService: JwtService;
  let mockAuthRepo: any;
  let mockDoctorRepo: any;
  let mockConfigService: any;
  let mockRateLimiter: any;

  const validDoctorPhone = '+919876543210';
  const pendingDoctorPhone = '+919876543211';
  const suspendedDoctorPhone = '+919876543212';
  const blockedDoctorPhone = '+919876543213';
  const patientOnlyPhone = '+919876543214';
  const unregisteredDoctorPhone = '+919876543299';

  const mockDoctorUser = {
    id: 'doc-user-1',
    phone: validDoctorPhone,
    status: 'ACTIVE',
    userRoles: [{ role: { name: 'DOCTOR' } }],
    doctorProfile: {
      id: 'doc-prof-1',
      userId: 'doc-user-1',
      fullName: 'Dr. John Doe',
      primarySpecialization: 'Cardiology',
      registrationNumber: 'MED-12345',
      licenseNumber: 'LIC-67890',
      verificationStatus: 'VERIFIED',
    },
  };

  const mockPendingDoctorUser = {
    id: 'doc-user-2',
    phone: pendingDoctorPhone,
    status: 'ACTIVE',
    userRoles: [{ role: { name: 'DOCTOR' } }],
    doctorProfile: {
      id: 'doc-prof-2',
      userId: 'doc-user-2',
      fullName: 'Dr. Jane Pending',
      primarySpecialization: 'Dermatology',
      registrationNumber: 'MED-54321',
      licenseNumber: 'LIC-09876',
      verificationStatus: 'PENDING',
    },
  };

  const mockSuspendedDoctorUser = {
    id: 'doc-user-3',
    phone: suspendedDoctorPhone,
    status: 'ACTIVE',
    userRoles: [{ role: { name: 'DOCTOR' } }],
    doctorProfile: {
      id: 'doc-prof-3',
      userId: 'doc-user-3',
      fullName: 'Dr. Bad Actor',
      primarySpecialization: 'General',
      registrationNumber: 'MED-99999',
      licenseNumber: 'LIC-99999',
      verificationStatus: 'SUSPENDED',
    },
  };

  const mockBlockedUser = {
    id: 'doc-user-4',
    phone: blockedDoctorPhone,
    status: 'BLOCKED',
    userRoles: [{ role: { name: 'DOCTOR' } }],
    doctorProfile: {
      id: 'doc-prof-4',
      userId: 'doc-user-4',
      fullName: 'Dr. Blocked',
      primarySpecialization: 'Neurology',
      registrationNumber: 'MED-88888',
      licenseNumber: 'LIC-88888',
      verificationStatus: 'VERIFIED',
    },
  };

  const mockPatientOnlyUser = {
    id: 'pat-user-1',
    phone: patientOnlyPhone,
    status: 'ACTIVE',
    userRoles: [{ role: { name: 'PATIENT' } }],
    patientProfile: {
      id: 'pat-prof-1',
      userId: 'pat-user-1',
      patientNumber: 'PAT-123456',
    },
  };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          APP_ENV: 'staging',
          DEPLOYMENT_ENV: 'staging',
          ENABLE_TEST_OTP: 'true',
          TEST_OTP_CODE: '123456',
          TEST_PHONE_NUMBERS: '+16505550001,+16505550002',
          JWT_SECRET: 'test_jwt_secret_minimum_32_characters_long_for_security',
          JWT_EXPIRATION: '15m',
          REFRESH_TOKEN_EXPIRATION: '7d',
        };
        return config[key];
      }),
    };

    mockRateLimiter = {
      checkRequestOtpLimit: jest.fn(),
      checkResendOtpCooldown: jest.fn(),
      checkVerifyOtpLimit: jest.fn(),
    };

    mockAuthRepo = {
      findUserByPhone: jest.fn(async (phone: string) => {
        if (phone === validDoctorPhone) return mockDoctorUser;
        if (phone === pendingDoctorPhone) return mockPendingDoctorUser;
        if (phone === suspendedDoctorPhone) return mockSuspendedDoctorUser;
        if (phone === blockedDoctorPhone) return mockBlockedUser;
        if (phone === patientOnlyPhone) return mockPatientOnlyUser;
        return null;
      }),
      findUserWithProfiles: jest.fn(async (phone: string) => {
        if (phone === validDoctorPhone) return mockDoctorUser;
        if (phone === pendingDoctorPhone) return mockPendingDoctorUser;
        if (phone === suspendedDoctorPhone) return mockSuspendedDoctorUser;
        if (phone === blockedDoctorPhone) return mockBlockedUser;
        if (phone === patientOnlyPhone) return mockPatientOnlyUser;
        return null;
      }),
      findUserById: jest.fn(async (id: string) => {
        if (id === 'doc-user-1') return mockDoctorUser;
        if (id === 'doc-user-2') return mockPendingDoctorUser;
        if (id === 'doc-user-3') return mockSuspendedDoctorUser;
        if (id === 'doc-user-4') return mockBlockedUser;
        if (id === 'pat-user-1') return mockPatientOnlyUser;
        return null;
      }),
      findDoctorProfileByUserId: jest.fn(async (userId: string) => {
        if (userId === 'doc-user-1') return mockDoctorUser.doctorProfile;
        if (userId === 'doc-user-2') return mockPendingDoctorUser.doctorProfile;
        if (userId === 'doc-user-3') return mockSuspendedDoctorUser.doctorProfile;
        if (userId === 'doc-user-4') return mockBlockedUser.doctorProfile;
        return null;
      }),
      createUser: jest.fn(async (phone: string) => ({
        id: 'new-user',
        phone,
        status: 'ACTIVE',
      })),
      createOtp: jest.fn(async (userId: string, otpHash: string, expiresAt: Date) => ({
        id: 'challenge-1',
        userId,
        otpHash,
        expiresAt,
        isVerified: false,
        attempts: 0,
        resendCount: 0,
      })),
      findOtpByChallengeId: jest.fn(),
      markOtpVerified: jest.fn(),
      incrementOtpAttempts: jest.fn(),
      incrementOtpResends: jest.fn(),
      createSession: jest.fn(async (userId: string) => ({ id: 'session-1', userId, isActive: true })),
      findUserRoles: jest.fn(async (userId: string) => {
        if (userId.startsWith('doc-user')) return ['DOCTOR'];
        if (userId === 'pat-user-1') return ['PATIENT'];
        return ['PATIENT'];
      }),
      createRefreshToken: jest.fn(),
      createAuditLog: jest.fn(),
      revokeRefreshTokenIfActive: jest.fn().mockResolvedValue(true),
      revokeRefreshToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
      invalidateSession: jest.fn(),
      invalidateAllSessions: jest.fn(),
      findSessionById: jest.fn().mockResolvedValue({ id: 'session-1', isActive: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthRateLimiterService, useValue: mockRateLimiter },
        { provide: 'IAuthRepository', useValue: mockAuthRepo },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('1. Doctor OTP Request Flow', () => {
    it('should generate staging test OTP 123456 for a valid registered doctor', async () => {
      const res = await authService.requestOtp({ phone: validDoctorPhone, role: 'DOCTOR' });
      expect(res.challengeId).toBe('challenge-1');
      expect(mockAuthRepo.createOtp).toHaveBeenCalled();
      const storedHash = mockAuthRepo.createOtp.mock.calls[0][1];
      const matchesTestOtp = await bcrypt.compare('123456', storedHash);
      expect(matchesTestOtp).toBe(true);
    });

    it('should reject unregistered phone number when role DOCTOR is requested', async () => {
      await expect(
        authService.requestOtp({ phone: unregisteredDoctorPhone, role: 'DOCTOR' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject existing user who does not possess a DoctorProfile when role DOCTOR is requested', async () => {
      await expect(
        authService.requestOtp({ phone: patientOnlyPhone, role: 'DOCTOR' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject suspended doctor profile during requestOtp', async () => {
      await expect(
        authService.requestOtp({ phone: suspendedDoctorPhone, role: 'DOCTOR' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject disabled/blocked doctor user account during requestOtp', async () => {
      await expect(
        authService.requestOtp({ phone: blockedDoctorPhone, role: 'DOCTOR' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('2. Doctor OTP Verification Flow', () => {
    it('should verify registered doctor with valid staging test OTP and return enriched response', async () => {
      const otpHash = await bcrypt.hash('123456', 10);
      mockAuthRepo.findOtpByChallengeId.mockResolvedValue({
        id: 'challenge-1',
        userId: 'doc-user-1',
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        isVerified: false,
        attempts: 0,
      });

      const res = await authService.verifyOtp({
        challengeId: 'challenge-1',
        otpCode: '123456',
        role: 'DOCTOR',
      });

      expect(res.accessToken).toBeDefined();
      expect(res.refreshToken).toBeDefined();
      expect(res.roles).toContain('DOCTOR');
      expect(res.doctorProfile).toBeDefined();
      expect(res.doctorProfile.fullName).toBe('Dr. John Doe');
      expect(res.doctorProfile.primarySpecialization).toBe('Cardiology');
      expect(res.doctorProfile.verificationStatus).toBe('VERIFIED');
    });

    it('should allow pending verification doctor to authenticate and view pending status', async () => {
      const otpHash = await bcrypt.hash('123456', 10);
      mockAuthRepo.findOtpByChallengeId.mockResolvedValue({
        id: 'challenge-2',
        userId: 'doc-user-2',
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        isVerified: false,
        attempts: 0,
      });

      const res = await authService.verifyOtp({
        challengeId: 'challenge-2',
        otpCode: '123456',
        role: 'DOCTOR',
      });

      expect(res.accessToken).toBeDefined();
      expect(res.doctorProfile.verificationStatus).toBe('PENDING');
    });

    it('should reject invalid OTP code and increment attempts', async () => {
      const otpHash = await bcrypt.hash('123456', 10);
      mockAuthRepo.findOtpByChallengeId.mockResolvedValue({
        id: 'challenge-1',
        userId: 'doc-user-1',
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        isVerified: false,
        attempts: 0,
      });

      await expect(
        authService.verifyOtp({
          challengeId: 'challenge-1',
          otpCode: '999999',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuthRepo.incrementOtpAttempts).toHaveBeenCalledWith('challenge-1');
    });

    it('should reject expired OTP challenge', async () => {
      const otpHash = await bcrypt.hash('123456', 10);
      mockAuthRepo.findOtpByChallengeId.mockResolvedValue({
        id: 'challenge-expired',
        userId: 'doc-user-1',
        otpHash,
        expiresAt: new Date(Date.now() - 1000),
        isVerified: false,
        attempts: 0,
      });

      await expect(
        authService.verifyOtp({
          challengeId: 'challenge-expired',
          otpCode: '123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject already verified (reused) OTP challenge', async () => {
      const otpHash = await bcrypt.hash('123456', 10);
      mockAuthRepo.findOtpByChallengeId.mockResolvedValue({
        id: 'challenge-reused',
        userId: 'doc-user-1',
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        isVerified: true,
        attempts: 0,
      });

      await expect(
        authService.verifyOtp({
          challengeId: 'challenge-reused',
          otpCode: '123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject OTP challenge when 3 incorrect attempts have been exceeded', async () => {
      const otpHash = await bcrypt.hash('123456', 10);
      mockAuthRepo.findOtpByChallengeId.mockResolvedValue({
        id: 'challenge-locked',
        userId: 'doc-user-1',
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        isVerified: false,
        attempts: 3,
      });

      await expect(
        authService.verifyOtp({
          challengeId: 'challenge-locked',
          otpCode: '123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject cross-challenge phone mismatch', async () => {
      const otpHash = await bcrypt.hash('123456', 10);
      mockAuthRepo.findOtpByChallengeId.mockResolvedValue({
        id: 'challenge-phone-mismatch',
        userId: 'doc-user-1',
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        isVerified: false,
        attempts: 0,
      });

      await expect(
        authService.verifyOtp({
          challengeId: 'challenge-phone-mismatch',
          otpCode: '123456',
          phone: '+14155559999',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('3. Session Lifecycle & Token Management', () => {
    it('should issue valid JWT access token embedding DOCTOR role and clinical permissions', async () => {
      const otpHash = await bcrypt.hash('123456', 10);
      mockAuthRepo.findOtpByChallengeId.mockResolvedValue({
        id: 'challenge-1',
        userId: 'doc-user-1',
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        isVerified: false,
        attempts: 0,
      });

      const res = await authService.verifyOtp({
        challengeId: 'challenge-1',
        otpCode: '123456',
      });

      const decoded: any = jwtService.decode(res.accessToken);
      expect(decoded.sub).toBe('doc-user-1');
      expect(decoded.roles).toContain('DOCTOR');
      expect(decoded.permissions).toContain('read:profile');
      expect(decoded.permissions).toContain('read:reports');
      expect(decoded.permissions).toContain('write:reports');
      expect(decoded.permissions).toContain('read:health-card');
      expect(decoded.permissions).toContain('verify:health-card');
    });

    it('should successfully logout doctor and invalidate session and refresh token', async () => {
      const secret = 'test_jwt_secret_minimum_32_characters_long_for_security';
      const refreshToken = jwtService.sign(
        { sub: 'doc-user-1', sessionId: 'session-1', jti: 'token-uuid', type: 'refresh' },
        { secret, expiresIn: '7d' },
      );

      const logoutRes = await authService.logout({ refreshToken });
      expect(logoutRes.success).toBe(true);
      expect(mockAuthRepo.revokeRefreshToken).toHaveBeenCalledWith('token-uuid');
      expect(mockAuthRepo.invalidateSession).toHaveBeenCalledWith('session-1', 'doc-user-1');
    });
  });
});
