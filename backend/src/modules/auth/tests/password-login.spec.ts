import { AuthService } from '../application/use-cases/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthRateLimiterService } from '../infrastructure/services/auth-rate-limiter.service';
import { IAuthRepository } from '../domain/repositories/auth.repository.interface';
import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PasswordLoginDto } from '../presentation/dto/password-login.dto';
import * as bcrypt from 'bcrypt';

describe('CareID Admin Portal Password Login (POST /api/v1/auth/password/login)', () => {
  let service: AuthService;
  let mockAuthRepository: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockRateLimiter: any;

  const rawSuperAdminPassword = 'SecureSuperAdminPassword123!';
  const rawAdminPassword = 'SecureAdminPassword123!';
  let superAdminHash: string;
  let adminHash: string;

  beforeAll(async () => {
    superAdminHash = await bcrypt.hash(rawSuperAdminPassword, 10);
    adminHash = await bcrypt.hash(rawAdminPassword, 10);
  });

  beforeEach(() => {
    mockAuthRepository = {
      db: {
        user: {
          findUnique: jest.fn().mockImplementation(({ where }) => {
            if (where.id === 'superadmin-uuid-1') {
              return Promise.resolve({
                id: 'superadmin-uuid-1',
                phone: '+16505550001',
                email: 'superadmin@careid.test',
                status: 'ACTIVE',
              });
            }
            if (where.id === 'admin-uuid-1') {
              return Promise.resolve({
                id: 'admin-uuid-1',
                phone: '+16505550002',
                email: 'admin@careid.test',
                status: 'ACTIVE',
              });
            }
            return Promise.resolve(null);
          }),
        },
      },
      findUserByIdentifier: jest.fn(),
      findUserByEmail: jest.fn(),
      findUserByPhone: jest.fn(),
      createUser: jest.fn(),
      createOtp: jest.fn(),
      findOtpByChallengeId: jest.fn(),
      markOtpVerified: jest.fn(),
      incrementOtpAttempts: jest.fn(),
      incrementOtpResends: jest.fn(),
      createSession: jest.fn().mockResolvedValue({ id: 'session-careid-001', isActive: true }),
      findActiveSessions: jest.fn().mockResolvedValue([]),
      findSessionById: jest.fn().mockResolvedValue({ id: 'session-careid-001', userId: 'superadmin-uuid-1', isActive: true }),
      invalidateSession: jest.fn(),
      invalidateAllSessions: jest.fn(),
      invalidateOtherSessions: jest.fn(),
      createRefreshToken: jest.fn().mockResolvedValue({ id: 'rt-careid-001', userId: 'superadmin-uuid-1' }),
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
      sign: jest.fn().mockImplementation((payload: any) => `jwt.token.${payload.sub || 'token'}.${payload.sessionId || 'session'}`),
      verify: jest.fn().mockImplementation((token: string) => ({
        sub: 'superadmin-uuid-1',
        sessionId: 'session-careid-001',
        jti: 'jti-token-001',
        type: 'refresh',
      })),
      decode: jest.fn(),
    } as unknown as JwtService;

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_EXPIRATION') return '1h';
        if (key === 'REFRESH_TOKEN_EXPIRATION') return '7d';
        if (key === 'JWT_SECRET') return 'careid_super_admin_jwt_secret_32_characters_minimum!';
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

  describe('Requirement 1: Valid Super Admin Email/Password Login', () => {
    it('should authenticate SUPER_ADMIN with email and return genuine tokens and documented schema', async () => {
      mockAuthRepository.findUserByIdentifier.mockResolvedValue({
        id: 'superadmin-uuid-1',
        phone: '+16505550001',
        email: 'superadmin@careid.test',
        passwordHash: superAdminHash,
        status: 'ACTIVE',
        userRoles: [
          {
            roleId: 'role-superadmin-id',
            role: { id: 'role-superadmin-id', name: 'SUPER_ADMIN' },
          },
        ],
      });
      mockAuthRepository.findUserRoles.mockResolvedValue(['SUPER_ADMIN']);

      const result = await service.passwordLogin(
        { identifier: 'superadmin@careid.test', password: rawSuperAdminPassword },
        '192.168.1.100',
        'CareID-Admin-Portal/1.0',
      );

      // Verify exact documented envelope
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Login successful');
      expect(result.data).toBeDefined();

      // Verify genuine token fields
      expect(result.data.access_token).toBeDefined();
      expect(result.data.refresh_token).toBeDefined();
      expect(result.data.token_type).toBe('Bearer');
      expect(result.data.expires_in).toBe(3600);

      // Verify user and role structure
      expect(result.data.user).toBeDefined();
      expect(result.data.user.id).toBe('superadmin-uuid-1');
      expect(result.data.user.user_type).toBe('admin');
      expect(result.data.user.role).toEqual({
        id: 'role-superadmin-id',
        name: 'SUPER_ADMIN',
      });
      expect(result.data.user.email).toBe('superadmin@careid.test');
      expect(result.data.user.status).toBe('ACTIVE');
      expect(result.data.user.roles).toContain('SUPER_ADMIN');
      expect(result.data.user.permissions).toEqual(
        expect.arrayContaining(['read:all', 'write:all', 'delete:all', 'read:audit-logs', 'manage:roles']),
      );

      // Verify session and audit creation
      expect(mockAuthRepository.createSession).toHaveBeenCalledWith('superadmin-uuid-1', '192.168.1.100', 'CareID-Admin-Portal/1.0');
      expect(mockAuthRepository.createAuditLog).toHaveBeenCalledWith(
        'superadmin-uuid-1',
        'ADMIN_PASSWORD_LOGIN',
        expect.stringContaining('session-careid-001'),
        '192.168.1.100',
      );
    });

    it('should authenticate Super Admin using username identifier ("superadmin")', async () => {
      mockAuthRepository.findUserByIdentifier.mockResolvedValue({
        id: 'superadmin-uuid-1',
        phone: '+16505550001',
        email: 'superadmin@careid.test',
        passwordHash: superAdminHash,
        status: 'ACTIVE',
        userRoles: [
          {
            roleId: 'role-superadmin-id',
            role: { id: 'role-superadmin-id', name: 'SUPER_ADMIN' },
          },
        ],
      });

      const result = await service.passwordLogin(
        { identifier: 'superadmin', password: rawSuperAdminPassword },
      );

      expect(mockAuthRepository.findUserByIdentifier).toHaveBeenCalledWith('superadmin');
      expect(result.success).toBe(true);
      expect(result.data.user.id).toBe('superadmin-uuid-1');
      expect(result.data.user.role.name).toBe('SUPER_ADMIN');
    });
  });

  describe('Requirement 2: Valid Ordinary Admin Credentials', () => {
    it('should authenticate ordinary ADMIN and return role "ADMIN"', async () => {
      mockAuthRepository.findUserByIdentifier.mockResolvedValue({
        id: 'admin-uuid-1',
        phone: '+16505550002',
        email: 'admin@careid.test',
        passwordHash: adminHash,
        status: 'ACTIVE',
        userRoles: [
          {
            roleId: 'role-admin-id',
            role: { id: 'role-admin-id', name: 'ADMIN' },
          },
        ],
      });

      const result = await service.passwordLogin(
        { identifier: 'admin@careid.test', password: rawAdminPassword },
        '127.0.0.1',
      );

      expect(result.success).toBe(true);
      expect(result.data.user.id).toBe('admin-uuid-1');
      expect(result.data.user.user_type).toBe('admin');
      expect(result.data.user.role).toEqual({
        id: 'role-admin-id',
        name: 'ADMIN',
      });
      expect(result.data.user.roles).toEqual(['ADMIN']);
      expect(result.data.user.permissions).toEqual(['read:all', 'write:all', 'read:audit-logs']);
    });

    it('should authenticate Admin using phone identifier ("+16505550002")', async () => {
      mockAuthRepository.findUserByIdentifier.mockResolvedValue({
        id: 'admin-uuid-1',
        phone: '+16505550002',
        email: 'admin@careid.test',
        passwordHash: adminHash,
        status: 'ACTIVE',
        userRoles: [
          {
            roleId: 'role-admin-id',
            role: { id: 'role-admin-id', name: 'ADMIN' },
          },
        ],
      });

      const result = await service.passwordLogin(
        { identifier: '+16505550002', password: rawAdminPassword },
      );

      expect(mockAuthRepository.findUserByIdentifier).toHaveBeenCalledWith('+16505550002');
      expect(result.success).toBe(true);
      expect(result.data.user.id).toBe('admin-uuid-1');
      expect(result.data.user.role.name).toBe('ADMIN');
    });

    it('should authenticate Admin using phone property in DTO', async () => {
      mockAuthRepository.findUserByIdentifier.mockResolvedValue({
        id: 'admin-uuid-1',
        phone: '+16505550002',
        email: 'admin@careid.test',
        passwordHash: adminHash,
        status: 'ACTIVE',
        userRoles: [
          {
            roleId: 'role-admin-id',
            role: { id: 'role-admin-id', name: 'ADMIN' },
          },
        ],
      });

      const dto = plainToInstance(PasswordLoginDto, {
        phone: '+16505550002',
        password: rawAdminPassword,
      });

      const result = await service.passwordLogin(dto);
      expect(mockAuthRepository.findUserByIdentifier).toHaveBeenCalledWith('+16505550002');
      expect(result.success).toBe(true);
      expect(result.data.user.id).toBe('admin-uuid-1');
    });
  });

  describe('Requirement 3: Invalid Password Authentication Failure', () => {
    it('should throw UnauthorizedException and log failure when password is incorrect', async () => {
      mockAuthRepository.findUserByIdentifier.mockResolvedValue({
        id: 'admin-uuid-1',
        phone: '+16505550002',
        email: 'admin@careid.test',
        passwordHash: adminHash,
        status: 'ACTIVE',
        userRoles: [{ role: { name: 'ADMIN' } }],
      });

      await expect(
        service.passwordLogin(
          { identifier: 'admin@careid.test', password: 'WrongPassword999!' },
          '203.0.113.42',
        ),
      ).rejects.toThrow(new UnauthorizedException('Invalid identifier or password'));

      expect(mockAuthRepository.createAuditLog).toHaveBeenCalledWith(
        'admin-uuid-1',
        'ADMIN_PASSWORD_LOGIN_FAILED',
        'Invalid password attempt',
        '203.0.113.42',
      );
    });

    it('should throw UnauthorizedException when account does not exist', async () => {
      mockAuthRepository.findUserByIdentifier.mockResolvedValue(null);

      await expect(
        service.passwordLogin(
          { identifier: 'unknown@careid.test', password: 'AnyPassword123!' },
        ),
      ).rejects.toThrow(new UnauthorizedException('Invalid identifier or password'));
    });
  });

  describe('Requirement 4: Missing or Empty Credentials Validation', () => {
    it('should reject missing identifier via service', async () => {
      await expect(
        service.passwordLogin({ identifier: '', password: 'Password123!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject missing password via service', async () => {
      await expect(
        service.passwordLogin({ identifier: 'admin@careid.test', password: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid DTO payload via class-validator', async () => {
      const dto = plainToInstance(PasswordLoginDto, { identifier: '', password: '123' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'identifier')).toBe(true);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should support legacy email/username fields in DTO transform', () => {
      const dtoFromEmail = plainToInstance(PasswordLoginDto, {
        email: 'admin@careid.test',
        password: 'ValidPassword123!',
      });
      expect(dtoFromEmail.identifier).toBe('admin@careid.test');

      const dtoFromUsername = plainToInstance(PasswordLoginDto, {
        username: 'superadmin',
        password: 'ValidPassword123!',
      });
      expect(dtoFromUsername.identifier).toBe('superadmin');
    });
  });

  describe('Requirement 5: Inactive or Blocked Account Rejection', () => {
    it('should reject INACTIVE Admin account with 401 Unauthorized', async () => {
      mockAuthRepository.findUserByIdentifier.mockResolvedValue({
        id: 'admin-uuid-1',
        phone: '+16505550002',
        email: 'admin@careid.test',
        passwordHash: adminHash,
        status: 'INACTIVE',
        userRoles: [{ role: { name: 'ADMIN' } }],
      });

      await expect(
        service.passwordLogin({ identifier: 'admin@careid.test', password: rawAdminPassword }, '127.0.0.1'),
      ).rejects.toThrow(new UnauthorizedException('Account is inactive or blocked'));

      expect(mockAuthRepository.createAuditLog).toHaveBeenCalledWith(
        'admin-uuid-1',
        'ADMIN_PASSWORD_LOGIN_FAILED',
        'Account status is INACTIVE',
        '127.0.0.1',
      );
    });

    it('should reject BLOCKED Admin account with 401 Unauthorized', async () => {
      mockAuthRepository.findUserByIdentifier.mockResolvedValue({
        id: 'admin-uuid-1',
        phone: '+16505550002',
        email: 'admin@careid.test',
        passwordHash: adminHash,
        status: 'BLOCKED',
        userRoles: [{ role: { name: 'ADMIN' } }],
      });

      await expect(
        service.passwordLogin({ identifier: 'admin@careid.test', password: rawAdminPassword }),
      ).rejects.toThrow(new UnauthorizedException('Account is inactive or blocked'));
    });
  });

  describe('Requirement 6: Non-Admin Role and Doctor Authentication', () => {
    it('should reject PATIENT role attempting password login with 403 Forbidden', async () => {
      mockAuthRepository.findUserByIdentifier.mockResolvedValue({
        id: 'patient-uuid-1',
        phone: '+16505550004',
        email: 'patient@careid.test',
        passwordHash: adminHash,
        status: 'ACTIVE',
        userRoles: [{ role: { name: 'PATIENT' } }],
      });

      await expect(
        service.passwordLogin({ identifier: 'patient@careid.test', password: rawAdminPassword }),
      ).rejects.toThrow(new ForbiddenException('Access denied. Administrator privileges required.'));
    });

    it('should successfully authenticate active DOCTOR role via password login and issue genuine JWT pair', async () => {
      mockAuthRepository.findUserByIdentifier.mockResolvedValue({
        id: 'doctor-uuid-1',
        phone: '+16505550003',
        email: 'doctor@careid.test',
        passwordHash: adminHash,
        status: 'ACTIVE',
        userRoles: [{ role: { id: 'role-doc-1', name: 'DOCTOR' } }],
      });

      const res = await service.passwordLogin({ identifier: 'doctor@careid.test', password: rawAdminPassword });
      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.data.accessToken).toBeDefined();
      expect(res.data.user.roles).toContain('DOCTOR');
      expect(res.data.user.user_type).toBe('doctor');
      expect(mockAuthRepository.createAuditLog).toHaveBeenCalledWith(
        'doctor-uuid-1',
        'DOCTOR_PASSWORD_LOGIN',
        expect.stringContaining('Doctor logged in successfully'),
        undefined,
      );
    });

    it('should successfully authenticate active VETERINARIAN role via password login', async () => {
      mockAuthRepository.findUserByIdentifier.mockResolvedValue({
        id: 'vet-uuid-1',
        phone: '+16505555120',
        email: 'dr.thorne@careid.test',
        passwordHash: adminHash,
        status: 'ACTIVE',
        userRoles: [{ role: { id: 'role-vet-1', name: 'VETERINARIAN' } }],
      });

      const res = await service.passwordLogin({ identifier: 'dr.thorne@careid.test', password: rawAdminPassword });
      expect(res.success).toBe(true);
      expect(res.data.accessToken).toBeDefined();
      expect(res.data.user.roles).toContain('VETERINARIAN');
      expect(res.data.user.user_type).toBe('doctor');
    });

    it('should reject INACTIVE DOCTOR account with 401 Unauthorized', async () => {
      mockAuthRepository.findUserByIdentifier.mockResolvedValue({
        id: 'doctor-uuid-inactive',
        phone: '+16505559999',
        email: 'inactive.doc@careid.test',
        passwordHash: adminHash,
        status: 'INACTIVE',
        userRoles: [{ role: { name: 'DOCTOR' } }],
      });

      await expect(
        service.passwordLogin({ identifier: 'inactive.doc@careid.test', password: rawAdminPassword }),
      ).rejects.toThrow(new UnauthorizedException('Account is inactive or blocked'));
    });

    it('should reject DOCTOR with incorrect password with 401 Unauthorized', async () => {
      mockAuthRepository.findUserByIdentifier.mockResolvedValue({
        id: 'doctor-uuid-1',
        phone: '+16505550003',
        email: 'doctor@careid.test',
        passwordHash: adminHash,
        status: 'ACTIVE',
        userRoles: [{ role: { name: 'DOCTOR' } }],
      });

      await expect(
        service.passwordLogin({ identifier: 'doctor@careid.test', password: 'WrongPassword123!' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid identifier or password'));
    });
  });

  describe('Requirement 7: /api/v1/auth/me Integration Compatibility', () => {
    it('should retrieve user details from getMe using the sub identifier from token payload', async () => {
      mockAuthRepository.findUserRoles.mockResolvedValue(['SUPER_ADMIN']);

      const meResult = await service.getMe('superadmin-uuid-1', '127.0.0.1');

      expect(meResult).toBeDefined();
      expect(meResult.id).toBe('superadmin-uuid-1');
      expect(meResult.email).toBe('superadmin@careid.test');
      expect(meResult.phone).toBe('+16505550001');
      expect(meResult.status).toBe('ACTIVE');
      expect(meResult.roles).toContain('SUPER_ADMIN');
      expect(meResult.permissions).toEqual(
        expect.arrayContaining(['read:all', 'write:all', 'delete:all', 'manage:roles']),
      );
    });
  });

  describe('Requirement 8: Refresh Token Rotation and Logout Compatibility', () => {
    it('should rotate refresh token and revoke previous token', async () => {
      const hashedRefreshToken = await bcrypt.hash('mock.valid.refresh.token', 10);
      mockAuthRepository.findRefreshTokenById.mockResolvedValue({
        id: 'jti-token-001',
        userId: 'superadmin-uuid-1',
        sessionId: 'session-careid-001',
        tokenHash: hashedRefreshToken,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockAuthRepository.findUserRoles.mockResolvedValue(['SUPER_ADMIN']);
      mockAuthRepository.revokeRefreshTokenIfActive.mockResolvedValue(true);

      const refreshResult = await service.refreshToken(
        { refreshToken: 'mock.valid.refresh.token' },
        '127.0.0.1',
      );

      expect(refreshResult).toBeDefined();
      expect(refreshResult.accessToken).toBeDefined();
      expect(refreshResult.refreshToken).toBeDefined();
      expect(mockAuthRepository.createRefreshToken).toHaveBeenCalled();
    });

    it('should invalidate all sessions on logout-all', async () => {
      mockAuthRepository.revokeAllUserTokens.mockResolvedValue(undefined);
      mockAuthRepository.invalidateAllSessions.mockResolvedValue(undefined);

      const logoutAllResult = await service.logoutAll(
        { refreshToken: 'mock.valid.refresh.token' },
        '127.0.0.1',
      );

      expect(logoutAllResult.success).toBe(true);
      expect(mockAuthRepository.revokeAllUserTokens).toHaveBeenCalledWith('superadmin-uuid-1');
      expect(mockAuthRepository.invalidateAllSessions).toHaveBeenCalledWith('superadmin-uuid-1');
    });
  });
});
