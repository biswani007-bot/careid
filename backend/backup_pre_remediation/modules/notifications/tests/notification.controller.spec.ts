import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { NotificationController } from '../presentation/controllers/notification.controller';
import { NotificationService } from '../application/use-cases/notification.service';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { ROLES_KEY } from '@modules/auth/infrastructure/decorators/roles.decorator';

describe('NotificationController (SEC-AUD-01 Authorization & Ownership Tests)', () => {
  let controller: NotificationController;
  let service: NotificationService;
  let reflector: Reflector;
  let rolesGuard: RolesGuard;

  const mockNotificationService = {
    getDashboardStats: jest.fn().mockResolvedValue({ totalTemplates: 5 }),
    createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    getNotifications: jest.fn().mockResolvedValue([{ id: 'notif-1' }]),
    getNotificationById: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    markAsRead: jest.fn().mockResolvedValue({ id: 'notif-1', status: 'READ' }),
    softDeleteNotification: jest.fn().mockResolvedValue({ message: 'Notification soft-deleted successfully' }),
    getPreferences: jest.fn().mockResolvedValue({ userId: 'u-1', emailEnabled: true }),
    updatePreferences: jest.fn().mockResolvedValue({ userId: 'u-1', emailEnabled: false }),
    getPendingQueueItems: jest.fn().mockResolvedValue([]),
    retryQueue: jest.fn().mockResolvedValue({ retried: 0 }),
    getAuditLogs: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get<NotificationService>(NotificationService);
  });

  describe('Administrative Role Metadata', () => {
    it('getDashboardStats should require ADMIN or SUPER_ADMIN', () => {
      const roles = reflector.get<string[]>(ROLES_KEY, controller.getDashboardStats);
      expect(roles).toEqual(expect.arrayContaining(['ADMIN', 'SUPER_ADMIN']));
    });

    it('createNotification should require ADMIN, SUPER_ADMIN, or FACILITY_ADMIN', () => {
      const roles = reflector.get<string[]>(ROLES_KEY, controller.createNotification);
      expect(roles).toEqual(expect.arrayContaining(['ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN']));
    });

    it('getPendingQueueItems should require ADMIN or SUPER_ADMIN', () => {
      const roles = reflector.get<string[]>(ROLES_KEY, controller.getPendingQueueItems);
      expect(roles).toEqual(expect.arrayContaining(['ADMIN', 'SUPER_ADMIN']));
    });

    it('retryQueue should require ADMIN or SUPER_ADMIN', () => {
      const roles = reflector.get<string[]>(ROLES_KEY, controller.retryQueue);
      expect(roles).toEqual(expect.arrayContaining(['ADMIN', 'SUPER_ADMIN']));
    });

    it('getAuditLogs should require ADMIN or SUPER_ADMIN', () => {
      const roles = reflector.get<string[]>(ROLES_KEY, controller.getAuditLogs);
      expect(roles).toEqual(expect.arrayContaining(['ADMIN', 'SUPER_ADMIN']));
    });
  });

  describe('User Ownership Forwarding to NotificationService', () => {
    const mockReq = {
      user: {
        userId: 'patient-uuid-1',
        roles: ['PATIENT'],
      },
    };

    it('getNotifications forwards caller user ID and roles to service', async () => {
      await controller.getNotifications(mockReq, 'patient-uuid-1', 'SENT');
      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith(
        'patient-uuid-1',
        'SENT',
        'patient-uuid-1',
        ['PATIENT'],
      );
    });

    it('getNotificationById forwards caller user ID and roles to service', async () => {
      await controller.getNotificationById(mockReq, 'notif-123');
      expect(mockNotificationService.getNotificationById).toHaveBeenCalledWith(
        'notif-123',
        'patient-uuid-1',
        ['PATIENT'],
      );
    });

    it('markAsRead forwards caller user ID and roles to service', async () => {
      await controller.markAsRead(mockReq, 'notif-123');
      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(
        'notif-123',
        'patient-uuid-1',
        ['PATIENT'],
      );
    });

    it('softDeleteNotification forwards caller user ID and roles to service', async () => {
      await controller.softDeleteNotification(mockReq, 'notif-123');
      expect(mockNotificationService.softDeleteNotification).toHaveBeenCalledWith(
        'notif-123',
        'patient-uuid-1',
        ['PATIENT'],
      );
    });
  });
});
