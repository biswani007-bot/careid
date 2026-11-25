import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../presentation/controllers/auth.controller';
import { AuthService } from '../application/use-cases/auth.service';
import { PasswordLoginDto } from '../presentation/dto/password-login.dto';
import { HttpStatus } from '@nestjs/common';

describe('AuthController — Password and Admin Login Endpoints', () => {
  let controller: AuthController;
  let mockAuthService: any;

  const mockSuccessResponse = {
    success: true,
    statusCode: 200,
    message: 'Login successful',
    data: {
      access_token: 'mock.access.token',
      refresh_token: 'mock.refresh.token',
      token_type: 'Bearer',
      expires_in: 3600,
      accessToken: 'mock.access.token',
      refreshToken: 'mock.refresh.token',
      user: {
        id: 'user-admin-1',
        user_type: 'admin',
        role: { id: 'role-superadmin-id', name: 'SUPER_ADMIN' },
        email: 'superadmin@careid.test',
        phone: '+16505550001',
        status: 'ACTIVE',
        roles: ['SUPER_ADMIN'],
        permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs', 'manage:roles'],
      },
    },
  };

  beforeEach(async () => {
    mockAuthService = {
      passwordLogin: jest.fn().mockResolvedValue(mockSuccessResponse),
      adminLogin: jest.fn().mockResolvedValue(mockSuccessResponse),
      requestOtp: jest.fn(),
      verifyOtp: jest.fn(),
      resendOtp: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      logoutAll: jest.fn(),
      getActiveSessions: jest.fn(),
      revokeSession: jest.fn(),
      getMe: jest.fn(),
      updateMe: jest.fn(),
      changePassword: jest.fn(),
      getAllRoles: jest.fn(),
      getAllPermissions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('POST /api/v1/auth/password/login', () => {
    it('should be defined on AuthController', () => {
      expect(controller.passwordLogin).toBeDefined();
    });

    it('should delegate to authService.passwordLogin with extracted IP and User-Agent', async () => {
      const dto: PasswordLoginDto = {
        identifier: 'superadmin@careid.test',
        password: 'SecureSuperAdminPassword123!',
      };
      const req = {
        ip: '192.168.1.50',
        headers: { 'user-agent': 'CareID-Admin-Browser/1.0' },
      };

      const result = await controller.passwordLogin(req, dto);

      expect(mockAuthService.passwordLogin).toHaveBeenCalledWith(
        dto,
        '192.168.1.50',
        'CareID-Admin-Browser/1.0',
      );
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusCode).toBe(HttpStatus.OK);
      expect(result.data.user.roles).toContain('SUPER_ADMIN');
    });

    it('should safely handle missing IP and missing headers without crashing', async () => {
      const dto: PasswordLoginDto = {
        identifier: 'admin@careid.test',
        password: 'SecureAdminPassword123!',
      };
      const req = {
        headers: {},
      };

      const result = await controller.passwordLogin(req, dto);

      expect(mockAuthService.passwordLogin).toHaveBeenCalledWith(dto, '', '');
      expect(result).toEqual(mockSuccessResponse);
    });
  });

  describe('POST /api/v1/auth/admin/login (Legacy Alias)', () => {
    it('should be defined on AuthController', () => {
      expect(controller.adminLogin).toBeDefined();
    });

    it('should delegate to authService.passwordLogin for unified backward compatibility', async () => {
      const dto: PasswordLoginDto = {
        identifier: 'admin@careid.test',
        password: 'SecureAdminPassword123!',
      };
      const req = {
        ip: '10.0.0.1',
        headers: { 'user-agent': 'LegacyAdminClient/2.0' },
      };

      const result = await controller.adminLogin(req, dto);

      expect(mockAuthService.passwordLogin).toHaveBeenCalledWith(
        dto,
        '10.0.0.1',
        'LegacyAdminClient/2.0',
      );
      expect(result).toEqual(mockSuccessResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('PUT / PATCH /api/v1/auth/me', () => {
    it('should delegate updateMePut to authService.updateMe', async () => {
      mockAuthService.updateMe.mockResolvedValue({ id: 'user-1', email: 'updated@test.com' });
      const req = { user: { userId: 'user-1' }, ip: '127.0.0.1' };
      const dto = { email: 'updated@test.com' };

      const res = await controller.updateMePut(req, dto);
      expect(mockAuthService.updateMe).toHaveBeenCalledWith('user-1', dto, '127.0.0.1');
      expect(res.email).toBe('updated@test.com');
    });

    it('should delegate updateMePatch to authService.updateMe', async () => {
      mockAuthService.updateMe.mockResolvedValue({ id: 'user-1', phone: '+923009999999' });
      const req = { user: { userId: 'user-1' }, ip: '127.0.0.1' };
      const dto = { phone: '+923009999999' };

      const res = await controller.updateMePatch(req, dto);
      expect(mockAuthService.updateMe).toHaveBeenCalledWith('user-1', dto, '127.0.0.1');
      expect(res.phone).toBe('+923009999999');
    });
  });

  describe('POST /api/v1/auth/password/change', () => {
    it('should delegate changePassword to authService.changePassword', async () => {
      mockAuthService.changePassword.mockResolvedValue({ message: 'Password changed successfully' });
      const req = { user: { userId: 'user-1', sessionId: 'sess-1' }, ip: '127.0.0.1' };
      const dto = { currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' };

      const res = await controller.changePassword(req, dto);
      expect(mockAuthService.changePassword).toHaveBeenCalledWith('user-1', dto, 'sess-1', '127.0.0.1');
      expect(res.message).toBe('Password changed successfully');
    });
  });
});
