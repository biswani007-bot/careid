import { AuthService } from '../application/use-cases/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthRateLimiterService } from '../infrastructure/services/auth-rate-limiter.service';
import { BadRequestException, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let mockAuthRepository: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockRateLimiter: any;

  beforeEach(() => {
    mockAuthRepository = {
      db: {
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: 'user-123', phone: '+14155552671', status: 'ACTIVE' }),
        },
      },
      findUserByPhone: jest.fn(),
      createUser: jest.fn(),
      createOtp: jest.fn(),
      findOtpByChallengeId: jest.fn(),
      markOtpVerified: jest.fn(),
      incrementOtpAttempts: jest.fn(),
      incrementOtpResends: jest.fn(),
      createSession: jest.fn().mockResolvedValue({ id: 'session-123' }),
      findActiveSessions: jest.fn().mockResolvedValue([]),
      findSessionById: jest.fn().mockResolvedValue({ id: 'session-123', userId: 'user-123', isActive: true }),
      invalidateSession: jest.fn(),
      invalidateAllSessions: jest.fn(),
      invalidateOtherSessions: jest.fn(),
      createRefreshToken: jest.fn(),
      findRefreshToken: jest.fn().mockResolvedValue(null),
      findRefreshTokenById: jest.fn().mockResolvedValue(null),
      findRecentTokensByUser: jest.fn().mockResolvedValue([]),
      revokeRefreshToken: jest.fn(),
      revokeRefreshTokenIfActive: jest.fn().mockResolvedValue(true),
      revokeAllUserTokens: jest.fn(),
      createAuditLog: jest.fn(),
      findUserRoles: jest.fn().mockResolvedValue(['PATIENT']),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock.jwt.token'),
      verify: jest.fn().mockReturnValue({ sub: 'user-123', sessionId: 'session-123', jti: 'token-uuid-1', type: 'refresh' }),
      decode: jest.fn().mockReturnValue({ sub: 'user-123', sessionId: 'session-123', jti: 'token-uuid-1', type: 'refresh' }),
    } as unknown as JwtService;

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_EXPIRATION') return '15m';
        if (key === 'REFRESH_TOKEN_EXPIRATION') return '7d';
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'NODE_ENV') return 'development';
        if (key === 'ENABLE_TEST_OTP') return 'false';
        if (key === 'TEST_PHONE_NUMBERS') return '+14155552671';
        if (key === 'TEST_OTP_CODE') return '123456';
        return null;
      }),
    } as unknown as ConfigService;

    mockRateLimiter = {
      checkRequestOtpLimit: jest.fn(),
      checkResendOtpCooldown: jest.fn(),
      checkVerifyOtpLimit: jest.fn(),
      checkRefreshTokenLimit: jest.fn(),
    } as unknown as AuthRateLimiterService;

    service = new AuthService(
      mockAuthRepository,
      mockJwtService,
      mockConfigService,
      mockRateLimiter,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestOtp', () => {
    it('should create user if phone not found and return challengeId with random OTP', async () => {
      mockAuthRepository.findUserByPhone.mockResolvedValue(null);
      mockAuthRepository.createUser.mockResolvedValue({ id: 'user-123', phone: '+14155552671' });
      mockAuthRepository.createOtp.mockResolvedValue({ id: 'challenge-456' });

      const result = await service.requestOtp({ phone: '+14155552671' }, '127.0.0.1');

      expect(mockRateLimiter.checkRequestOtpLimit).toHaveBeenCalledWith('127.0.0.1', '+14155552671');
      expect(mockAuthRepository.createUser).toHaveBeenCalledWith('+14155552671');
      expect(mockAuthRepository.createOtp).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
        expect.any(Date),
      );
      expect(result.challengeId).toBe('challenge-456');
      expect(result.message).toBe('OTP sent successfully to registered phone number');
    });

    it('should reuse existing user if phone already registered', async () => {
      mockAuthRepository.findUserByPhone.mockResolvedValue({ id: 'user-existing', phone: '+14155552671' });
      mockAuthRepository.createOtp.mockResolvedValue({ id: 'challenge-789' });

      const result = await service.requestOtp({ phone: '+14155552671' });

      expect(mockAuthRepository.createUser).not.toHaveBeenCalled();
      expect(result.challengeId).toBe('challenge-789');
    });

    it('should use test OTP bypass when explicitly enabled in non-production for whitelisted phone', async () => {
      mockConfigService.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'ENABLE_TEST_OTP') return 'true';
        if (key === 'TEST_PHONE_NUMBERS') return '+14155552671, +19999999999';
        if (key === 'TEST_OTP_CODE') return '654321';
        return null;
      });

      mockAuthRepository.findUserByPhone.mockResolvedValue({ id: 'user-123', phone: '+14155552671' });
      mockAuthRepository.createOtp.mockResolvedValue({ id: 'challenge-test' });

      await service.requestOtp({ phone: '+14155552671' });

      const savedOtpHash = mockAuthRepository.createOtp.mock.calls[0][1];
      const matchesTestOtp = await bcrypt.compare('654321', savedOtpHash);
      expect(matchesTestOtp).toBe(true);
    });

    it('should NOT use test OTP in production by default (ENABLE_TEST_OTP unset)', async () => {
      mockConfigService.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'TEST_PHONE_NUMBERS') return '+14155552671';
        if (key === 'TEST_OTP_CODE') return '123456';
        return null;
      });

      mockAuthRepository.findUserByPhone.mockResolvedValue({ id: 'user-123', phone: '+14155552671' });
      mockAuthRepository.createOtp.mockResolvedValue({ id: 'challenge-prod' });

      await service.requestOtp({ phone: '+14155552671' });

      const savedOtpHash = mockAuthRepository.createOtp.mock.calls[0][1];
      const matchesHardcoded = await bcrypt.compare('123456', savedOtpHash);
      expect(matchesHardcoded).toBe(false);
    });

    it('should allow test OTP in production for controlled testing when explicitly enabled and phone is in approved test list', async () => {
      mockConfigService.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'ENABLE_TEST_OTP') return 'true';
        if (key === 'TEST_PHONE_NUMBERS') return '+14155552671, +14155559999';
        if (key === 'TEST_OTP_CODE') return '123456';
        return null;
      });

      mockAuthRepository.findUserByPhone.mockResolvedValue({ id: 'user-123', phone: '+14155552671' });
      mockAuthRepository.createOtp.mockResolvedValue({ id: 'challenge-prod' });

      await service.requestOtp({ phone: '+14155552671' });

      const savedOtpHash = mockAuthRepository.createOtp.mock.calls[0][1];
      const matchesHardcoded = await bcrypt.compare('123456', savedOtpHash);
      expect(matchesHardcoded).toBe(true);
    });

    it('should NOT use test OTP in production for non-approved phone even if ENABLE_TEST_OTP is true', async () => {
      mockConfigService.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'ENABLE_TEST_OTP') return 'true';
        if (key === 'TEST_PHONE_NUMBERS') return '+14155552671';
        if (key === 'TEST_OTP_CODE') return '123456';
        return null;
      });

      mockAuthRepository.findUserByPhone.mockResolvedValue({ id: 'user-unlisted', phone: '+19999999999' });
      mockAuthRepository.createOtp.mockResolvedValue({ id: 'challenge-prod' });

      await service.requestOtp({ phone: '+19999999999' });

      const savedOtpHash = mockAuthRepository.createOtp.mock.calls[0][1];
      const matchesHardcoded = await bcrypt.compare('123456', savedOtpHash);
      expect(matchesHardcoded).toBe(false);
    });

    it('should use test OTP in staging deployment when NODE_ENV=production but APP_ENV=staging for allowlisted phone', async () => {
      mockConfigService.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'APP_ENV') return 'staging';
        if (key === 'ENABLE_TEST_OTP') return 'true';
        if (key === 'TEST_PHONE_NUMBERS') return '+16505550001, +16505550002';
        if (key === 'TEST_OTP_CODE') return '123456';
        return null;
      });

      mockAuthRepository.findUserByPhone.mockResolvedValue({ id: 'user-staging-1', phone: '+16505550001' });
      mockAuthRepository.createOtp.mockResolvedValue({ id: 'challenge-staging-1' });

      await service.requestOtp({ phone: '+16505550001' });

      const savedOtpHash = mockAuthRepository.createOtp.mock.calls[0][1];
      const matchesTestOtp = await bcrypt.compare('123456', savedOtpHash);
      expect(matchesTestOtp).toBe(true);
    });

    it('should NOT use test OTP in staging deployment for non-allowlisted phone number', async () => {
      mockConfigService.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'APP_ENV') return 'staging';
        if (key === 'ENABLE_TEST_OTP') return 'true';
        if (key === 'TEST_PHONE_NUMBERS') return '+16505550001, +16505550002';
        if (key === 'TEST_OTP_CODE') return '123456';
        return null;
      });

      mockAuthRepository.findUserByPhone.mockResolvedValue({ id: 'user-staging-unlisted', phone: '+19999999999' });
      mockAuthRepository.createOtp.mockResolvedValue({ id: 'challenge-staging-unlisted' });

      await service.requestOtp({ phone: '+19999999999' });

      const savedOtpHash = mockAuthRepository.createOtp.mock.calls[0][1];
      const matchesTestOtp = await bcrypt.compare('123456', savedOtpHash);
      expect(matchesTestOtp).toBe(false);
    });

    it('should NOT use test OTP in APP_ENV=production if phone is unlisted, but allow listed test account', async () => {
      mockConfigService.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'APP_ENV') return 'production';
        if (key === 'ENABLE_TEST_OTP') return 'true';
        if (key === 'TEST_PHONE_NUMBERS') return '+16505550001';
        if (key === 'TEST_OTP_CODE') return '123456';
        return null;
      });

      // Listed phone receives test OTP
      mockAuthRepository.findUserByPhone.mockResolvedValue({ id: 'user-prod', phone: '+16505550001' });
      mockAuthRepository.createOtp.mockResolvedValue({ id: 'challenge-prod' });
      await service.requestOtp({ phone: '+16505550001' });
      const savedOtpHash = mockAuthRepository.createOtp.mock.calls[0][1];
      const matchesTestOtp = await bcrypt.compare('123456', savedOtpHash);
      expect(matchesTestOtp).toBe(true);

      // Unlisted phone does NOT receive test OTP
      mockAuthRepository.createOtp.mockClear();
      mockAuthRepository.findUserByPhone.mockResolvedValue({ id: 'user-unlisted', phone: '+19999999999' });
      await service.requestOtp({ phone: '+19999999999' });
      const unlistedHash = mockAuthRepository.createOtp.mock.calls[0][1];
      const matchesUnlisted = await bcrypt.compare('123456', unlistedHash);
      expect(matchesUnlisted).toBe(false);
    });

    it('should NOT use test OTP if APP_ENV=staging and DEPLOYMENT_ENV=production (conflicting/production)', async () => {
      mockConfigService.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'APP_ENV') return 'staging';
        if (key === 'DEPLOYMENT_ENV') return 'production';
        if (key === 'ENABLE_TEST_OTP') return 'true';
        if (key === 'TEST_PHONE_NUMBERS') return '+16505550001';
        if (key === 'TEST_OTP_CODE') return '123456';
        return null;
      });

      mockAuthRepository.findUserByPhone.mockResolvedValue({ id: 'user-conflict-1', phone: '+16505550001' });
      mockAuthRepository.createOtp.mockResolvedValue({ id: 'challenge-conflict-1' });

      await service.requestOtp({ phone: '+16505550001' });

      const savedOtpHash = mockAuthRepository.createOtp.mock.calls[0][1];
      const matchesTestOtp = await bcrypt.compare('123456', savedOtpHash);
      expect(matchesTestOtp).toBe(false);
    });

    it('should NOT use test OTP if APP_ENV=production and DEPLOYMENT_ENV=staging (conflicting/production)', async () => {
      mockConfigService.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'APP_ENV') return 'production';
        if (key === 'DEPLOYMENT_ENV') return 'staging';
        if (key === 'ENABLE_TEST_OTP') return 'true';
        if (key === 'TEST_PHONE_NUMBERS') return '+16505550001';
        if (key === 'TEST_OTP_CODE') return '123456';
        return null;
      });

      mockAuthRepository.findUserByPhone.mockResolvedValue({ id: 'user-conflict-2', phone: '+16505550001' });
      mockAuthRepository.createOtp.mockResolvedValue({ id: 'challenge-conflict-2' });

      await service.requestOtp({ phone: '+16505550001' });

      const savedOtpHash = mockAuthRepository.createOtp.mock.calls[0][1];
      const matchesTestOtp = await bcrypt.compare('123456', savedOtpHash);
      expect(matchesTestOtp).toBe(false);
    });

    it('should use test OTP when both APP_ENV and DEPLOYMENT_ENV are staging and phone is allowlisted', async () => {
      mockConfigService.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'APP_ENV') return 'staging';
        if (key === 'DEPLOYMENT_ENV') return 'staging';
        if (key === 'ENABLE_TEST_OTP') return 'true';
        if (key === 'TEST_PHONE_NUMBERS') return '+16505550001';
        if (key === 'TEST_OTP_CODE') return '123456';
        return null;
      });

      mockAuthRepository.findUserByPhone.mockResolvedValue({ id: 'user-staging-both', phone: '+16505550001' });
      mockAuthRepository.createOtp.mockResolvedValue({ id: 'challenge-staging-both' });

      await service.requestOtp({ phone: '+16505550001' });

      const savedOtpHash = mockAuthRepository.createOtp.mock.calls[0][1];
      const matchesTestOtp = await bcrypt.compare('123456', savedOtpHash);
      expect(matchesTestOtp).toBe(true);
    });

    it('should throw HttpException(429) when rate limit is exceeded', async () => {
      mockRateLimiter.checkRequestOtpLimit.mockImplementation(() => {
        throw new HttpException('Too many OTP requests for this IP', HttpStatus.TOO_MANY_REQUESTS);
      });

      await expect(service.requestOtp({ phone: '+14155552671' }, '10.0.0.1')).rejects.toThrow(HttpException);
    });
  });

  describe('resendOtp', () => {
    it('should throw BadRequestException if challenge is not found', async () => {
      mockAuthRepository.findOtpByChallengeId.mockResolvedValue(null);

      await expect(service.resendOtp({ challengeId: 'invalid-challenge' })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OTP is already verified', async () => {
      mockAuthRepository.findOtpByChallengeId.mockResolvedValue({
        id: 'challenge-1',
        isVerified: true,
        resendCount: 0,
      });

      await expect(service.resendOtp({ challengeId: 'challenge-1' })).rejects.toThrow('OTP has already been verified');
    });

    it('should throw BadRequestException if resend count is 3 or more', async () => {
      mockAuthRepository.findOtpByChallengeId.mockResolvedValue({
        id: 'challenge-1',
        isVerified: false,
        resendCount: 3,
      });

      await expect(service.resendOtp({ challengeId: 'challenge-1' })).rejects.toThrow('OTP resend limit reached');
    });

    it('should reject if resend cooldown is active', async () => {
      mockRateLimiter.checkResendOtpCooldown.mockImplementation(() => {
        throw new HttpException('Please wait 60 seconds before requesting another OTP', HttpStatus.TOO_MANY_REQUESTS);
      });

      await expect(service.resendOtp({ challengeId: 'challenge-1' })).rejects.toThrow(HttpException);
    });

    it('should successfully resend OTP and increment count', async () => {
      mockAuthRepository.findOtpByChallengeId.mockResolvedValue({
        id: 'challenge-1',
        userId: 'user-123',
        isVerified: false,
        resendCount: 1,
      });

      const result = await service.resendOtp({ challengeId: 'challenge-1' });

      expect(mockAuthRepository.incrementOtpResends).toHaveBeenCalledWith(
        'challenge-1',
        expect.any(String),
        expect.any(Date),
      );
      expect(result.challengeId).toBe('challenge-1');
      expect(result.message).toBe('OTP resent successfully');
    });
  });

  describe('verifyOtp', () => {
    const validOtp = '543210';
    let otpHash: string;

    beforeEach(async () => {
      otpHash = await bcrypt.hash(validOtp, 10);
    });

    it('should verify OTP successfully and return tokens with jti', async () => {
      mockAuthRepository.findOtpByChallengeId.mockResolvedValue({
        id: 'challenge-1',
        userId: 'user-123',
        otpHash,
        isVerified: false,
        attempts: 0,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const result = await service.verifyOtp(
        { challengeId: 'challenge-1', otpCode: validOtp, phone: '+14155552671' },
        '127.0.0.1',
        'JestTestAgent',
      );

      expect(mockRateLimiter.checkVerifyOtpLimit).toHaveBeenCalledWith('127.0.0.1');
      expect(mockAuthRepository.markOtpVerified).toHaveBeenCalledWith('challenge-1');
      expect(mockAuthRepository.createSession).toHaveBeenCalledWith('user-123', '127.0.0.1', 'JestTestAgent');
      expect(mockAuthRepository.createRefreshToken).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
        expect.any(Date),
        expect.any(String), // tokenId (jti)
      );
      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBe('mock.jwt.token');
    });

    it('should reject when cross-challenge phone does not match', async () => {
      mockAuthRepository.findOtpByChallengeId.mockResolvedValue({
        id: 'challenge-1',
        userId: 'user-123',
        otpHash,
        isVerified: false,
        attempts: 0,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await expect(
        service.verifyOtp({ challengeId: 'challenge-1', otpCode: validOtp, phone: '+19999999999' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuthRepository.incrementOtpAttempts).toHaveBeenCalledWith('challenge-1');
    });

    it('should reject invalid OTP and increment attempts', async () => {
      mockAuthRepository.findOtpByChallengeId.mockResolvedValue({
        id: 'challenge-1',
        userId: 'user-123',
        otpHash,
        isVerified: false,
        attempts: 1,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await expect(
        service.verifyOtp({ challengeId: 'challenge-1', otpCode: '000000' }),
      ).rejects.toThrow('Invalid OTP code');

      expect(mockAuthRepository.incrementOtpAttempts).toHaveBeenCalledWith('challenge-1');
    });

    it('should reject if OTP attempts reached 3 (locked)', async () => {
      mockAuthRepository.findOtpByChallengeId.mockResolvedValue({
        id: 'challenge-1',
        userId: 'user-123',
        otpHash,
        isVerified: false,
        attempts: 3,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await expect(
        service.verifyOtp({ challengeId: 'challenge-1', otpCode: validOtp }),
      ).rejects.toThrow('OTP challenge locked');
    });

    it('should reject if OTP is expired', async () => {
      mockAuthRepository.findOtpByChallengeId.mockResolvedValue({
        id: 'challenge-1',
        userId: 'user-123',
        otpHash,
        isVerified: false,
        attempts: 0,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.verifyOtp({ challengeId: 'challenge-1', otpCode: validOtp }),
      ).rejects.toThrow('OTP has expired');
    });

    it('should reject if challenge not found', async () => {
      mockAuthRepository.findOtpByChallengeId.mockResolvedValue(null);

      await expect(
        service.verifyOtp({ challengeId: 'non-existent', otpCode: validOtp }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if OTP is already verified', async () => {
      mockAuthRepository.findOtpByChallengeId.mockResolvedValue({
        id: 'challenge-1',
        userId: 'user-123',
        otpHash,
        isVerified: true,
        attempts: 0,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await expect(
        service.verifyOtp({ challengeId: 'challenge-1', otpCode: validOtp }),
      ).rejects.toThrow('OTP has already been verified');
    });
  });

  describe('refreshToken', () => {
    const rawRefreshToken = 'valid.refresh.token';
    let tokenHash: string;

    beforeEach(async () => {
      tokenHash = await bcrypt.hash(rawRefreshToken, 10);
    });

    it('should rotate token successfully using jti indexed lookup and bcrypt comparison', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        sessionId: 'session-123',
        jti: 'token-uuid-1',
        type: 'refresh',
      });

      mockAuthRepository.findRefreshTokenById.mockResolvedValue({
        id: 'token-uuid-1',
        userId: 'user-123',
        tokenHash,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const result = await service.refreshToken({ refreshToken: rawRefreshToken });

      expect(mockAuthRepository.findRefreshTokenById).toHaveBeenCalledWith('token-uuid-1');
      expect(mockAuthRepository.revokeRefreshTokenIfActive).toHaveBeenCalledWith('token-uuid-1');
      expect(mockAuthRepository.createRefreshToken).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
        expect.any(Date),
        expect.any(String),
      );
      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBe('mock.jwt.token');
    });

    it('should rotate legacy token without jti via candidate comparison fallback', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        sessionId: 'session-123',
        type: 'refresh',
        // no jti
      });

      mockAuthRepository.findRecentTokensByUser.mockResolvedValue([
        {
          id: 'legacy-token-1',
          userId: 'user-123',
          tokenHash,
          isRevoked: false,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      ]);

      const result = await service.refreshToken({ refreshToken: rawRefreshToken });

      expect(mockAuthRepository.findRecentTokensByUser).toHaveBeenCalledWith('user-123', 10);
      expect(mockAuthRepository.revokeRefreshTokenIfActive).toHaveBeenCalledWith('legacy-token-1');
      expect(result.accessToken).toBe('mock.jwt.token');
    });

    it('should reject refresh when user session is inactive or revoked', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        sessionId: 'revoked-session',
        jti: 'token-uuid-1',
        type: 'refresh',
      });

      mockAuthRepository.findSessionById.mockResolvedValue({
        id: 'revoked-session',
        userId: 'user-123',
        isActive: false, // Inactive session
      });

      await expect(
        service.refreshToken({ refreshToken: rawRefreshToken }),
      ).rejects.toThrow('Session is inactive or revoked');
    });

    it('should reject when token does not exist without triggering false replay revocation', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        sessionId: 'session-123',
        jti: 'non-existent-token',
        type: 'refresh',
      });

      mockAuthRepository.findRefreshTokenById.mockResolvedValue(null);

      await expect(
        service.refreshToken({ refreshToken: rawRefreshToken }),
      ).rejects.toThrow('Invalid refresh token');

      expect(mockAuthRepository.revokeAllUserTokens).not.toHaveBeenCalled();
    });

    it('should reject token ownership mismatch before replay attribution', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        sessionId: 'session-123',
        jti: 'stolen-token-uuid',
        type: 'refresh',
      });

      mockAuthRepository.findRefreshTokenById.mockResolvedValue({
        id: 'stolen-token-uuid',
        userId: 'different-user-456', // Ownership mismatch!
        tokenHash,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await expect(
        service.refreshToken({ refreshToken: rawRefreshToken }),
      ).rejects.toThrow('Invalid token ownership');

      // Crucial: Must NOT revoke user-123's legitimate tokens or sessions
      expect(mockAuthRepository.revokeAllUserTokens).not.toHaveBeenCalled();
    });

    it('should return cached result for concurrent refresh within rotation window', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        sessionId: 'session-123',
        jti: 'token-uuid-concurrent',
        type: 'refresh',
      });

      mockAuthRepository.findRefreshTokenById.mockResolvedValue({
        id: 'token-uuid-concurrent',
        userId: 'user-123',
        tokenHash,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      // First request rotates the token
      const firstResult = await service.refreshToken({ refreshToken: rawRefreshToken });
      expect(firstResult).toBeDefined();

      // Second concurrent request within rotation window returns the same cached result
      const secondResult = await service.refreshToken({ refreshToken: rawRefreshToken });
      expect(secondResult).toEqual(firstResult);
      // No replay attack revocation triggered
      expect(mockAuthRepository.revokeAllUserTokens).not.toHaveBeenCalled();
    });

    it('should detect replay attack on revoked token, revoke all user tokens and sessions', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        sessionId: 'session-123',
        jti: 'replayed-token-uuid',
        type: 'refresh',
      });

      mockAuthRepository.findRefreshTokenById.mockResolvedValue({
        id: 'replayed-token-uuid',
        userId: 'user-123',
        tokenHash,
        isRevoked: true, // REVOKED TOKEN REUSED
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await expect(
        service.refreshToken({ refreshToken: rawRefreshToken }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuthRepository.revokeAllUserTokens).toHaveBeenCalledWith('user-123');
      expect(mockAuthRepository.invalidateAllSessions).toHaveBeenCalledWith('user-123');
      expect(mockAuthRepository.createAuditLog).toHaveBeenCalledWith(
        'user-123',
        'REFRESH_TOKEN_REPLAY_ATTACK',
        expect.any(String),
        undefined,
      );
    });

    it('should reject expired refresh token in database', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        sessionId: 'session-123',
        jti: 'token-uuid-1',
        type: 'refresh',
      });

      mockAuthRepository.findRefreshTokenById.mockResolvedValue({
        id: 'token-uuid-1',
        userId: 'user-123',
        tokenHash,
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      await expect(
        service.refreshToken({ refreshToken: rawRefreshToken }),
      ).rejects.toThrow('Refresh token has expired');
    });

    it('should reject when cryptographic token hash does not match', async () => {
      const differentHash = await bcrypt.hash('different-token', 10);

      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        sessionId: 'session-123',
        jti: 'token-uuid-1',
        type: 'refresh',
      });

      mockAuthRepository.findRefreshTokenById.mockResolvedValue({
        id: 'token-uuid-1',
        userId: 'user-123',
        tokenHash: differentHash,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await expect(
        service.refreshToken({ refreshToken: rawRefreshToken }),
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should reject malformed or invalid JWT signature', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await expect(
        service.refreshToken({ refreshToken: 'malformed.jwt.token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke specific token by jti and invalidate session with cryptographically verified token', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        sessionId: 'session-123',
        jti: 'token-uuid-1',
        type: 'refresh',
      });

      const result = await service.logout({ refreshToken: 'valid.refresh.token' });

      expect(mockJwtService.verify).toHaveBeenCalledWith('valid.refresh.token', {
        secret: 'test-secret',
        ignoreExpiration: true,
      });
      expect(mockAuthRepository.revokeRefreshToken).toHaveBeenCalledWith('token-uuid-1');
      expect(mockAuthRepository.invalidateSession).toHaveBeenCalledWith('session-123', 'user-123');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');
    });

    it('should reject forged or invalid signature JWT on logout', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(
        service.logout({ refreshToken: 'forged.refresh.token' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuthRepository.revokeRefreshToken).not.toHaveBeenCalled();
      expect(mockAuthRepository.invalidateSession).not.toHaveBeenCalled();
    });

    it('should fallback to revokeAllUserTokens when token has no jti', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        sessionId: 'session-123',
        type: 'refresh',
      });

      const result = await service.logout({ refreshToken: 'valid.refresh.token' });

      expect(mockAuthRepository.revokeAllUserTokens).toHaveBeenCalledWith('user-123');
      expect(mockAuthRepository.invalidateSession).toHaveBeenCalledWith('session-123', 'user-123');
      expect(result.success).toBe(true);
    });
  });

  describe('logoutAll', () => {
    it('should revoke all tokens and invalidate all sessions for verified user', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        type: 'refresh',
      });

      const result = await service.logoutAll({ refreshToken: 'valid.refresh.token' });

      expect(mockJwtService.verify).toHaveBeenCalledWith('valid.refresh.token', {
        secret: 'test-secret',
        ignoreExpiration: true,
      });
      expect(mockAuthRepository.revokeAllUserTokens).toHaveBeenCalledWith('user-123');
      expect(mockAuthRepository.invalidateAllSessions).toHaveBeenCalledWith('user-123');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out all devices successfully');
    });

    it('should reject forged or invalid signature JWT on logoutAll', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(
        service.logoutAll({ refreshToken: 'forged.refresh.token' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuthRepository.revokeAllUserTokens).not.toHaveBeenCalled();
      expect(mockAuthRepository.invalidateAllSessions).not.toHaveBeenCalled();
    });
  });
});
