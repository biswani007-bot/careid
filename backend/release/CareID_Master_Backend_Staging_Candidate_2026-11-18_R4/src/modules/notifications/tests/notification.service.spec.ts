import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../application/use-cases/notification.service';
import { NotFoundException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

const mockUserId = 'user-uuid-1';

const mockRepo = {
  createTemplate: jest.fn(),
  findTemplates: jest.fn(),
  findTemplateByCode: jest.fn(),
  findTemplateById: jest.fn(),
  updateTemplate: jest.fn(),
  softDeleteTemplate: jest.fn(),
  createNotification: jest.fn(),
  findNotifications: jest.fn(),
  findNotificationById: jest.fn(),
  markAsRead: jest.fn(),
  softDeleteNotification: jest.fn(),
  updateNotificationStatus: jest.fn(),
  getPreferenceByUserId: jest.fn(),
  upsertPreference: jest.fn(),
  createQueueItem: jest.fn(),
  findPendingQueueItems: jest.fn(),
  updateQueueItem: jest.fn(),
  createAuditLog: jest.fn(),
  findAuditLogs: jest.fn(),
  getDashboardStats: jest.fn(),
};

const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

describe('NotificationService (Phase 21)', () => {
  let service: NotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: 'INotificationRepository', useValue: mockRepo },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('Templates', () => {
    it('should throw ConflictException if code exists', async () => {
      mockRepo.findTemplateByCode.mockResolvedValue({ id: 'tpl-1', code: 'TPL_WELCOME' });

      await expect(service.createTemplate(mockUserId, {
        code: 'TPL_WELCOME',
        name: 'Welcome',
        subject: 'Sub',
        body: 'Body',
      })).rejects.toThrow(ConflictException);
    });

    it('should create template and audit log', async () => {
      mockRepo.findTemplateByCode.mockResolvedValue(null);
      const mockTpl = {
        id: 'tpl-1',
        code: 'TPL_WELCOME',
        name: 'Welcome',
        subject: 'Sub',
        body: 'Body',
        channel: 'IN_APP',
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createTemplate.mockResolvedValue(mockTpl);
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.createTemplate(mockUserId, {
        code: 'TPL_WELCOME',
        name: 'Welcome',
        subject: 'Sub',
        body: 'Body',
      });

      expect(res.id).toBe('tpl-1');
      expect(mockRepo.createAuditLog).toHaveBeenCalled();
    });
  });

  describe('Notifications', () => {
    it('should create notification, queue item, and record audit log', async () => {
      mockRepo.getPreferenceByUserId.mockResolvedValue({ userId: mockUserId, emailEnabled: true });
      const mockNotif = {
        id: 'notif-1',
        title: 'Security Alert',
        message: 'Password changed',
        notificationType: 'SECURITY',
        priority: 'HIGH',
        channel: 'IN_APP',
        status: 'QUEUED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createNotification.mockResolvedValue(mockNotif);
      mockRepo.createQueueItem.mockResolvedValue({});
      mockRepo.updateNotificationStatus.mockResolvedValue(mockNotif);
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.createNotification(mockUserId, {
        title: 'Security Alert',
        message: 'Password changed',
      });

      expect(res.id).toBe('notif-1');
      expect(mockRepo.createQueueItem).toHaveBeenCalledWith('notif-1', 1);
      expect(mockRepo.createAuditLog).toHaveBeenCalled();
    });

    it('should mark notification as READ', async () => {
      const mockNotif = { id: 'notif-1', recipientUserId: mockUserId, status: 'SENT', title: 'Alert', message: 'Msg', notificationType: 'GENERAL', priority: 'NORMAL', channel: 'IN_APP', createdAt: new Date(), updatedAt: new Date() };
      mockRepo.findNotificationById.mockResolvedValue(mockNotif);
      mockRepo.markAsRead.mockResolvedValue({ ...mockNotif, status: 'READ', readAt: new Date() });
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.markAsRead('notif-1', mockUserId);
      expect(res.status).toBe('READ');
      expect(mockRepo.createAuditLog).toHaveBeenCalled();
    });
  });

  describe('Queue Retry', () => {
    it('should process pending queue items and increment retry attempt', async () => {
      const mockQueueItems = [{
        id: 'q-1',
        notificationId: 'notif-1',
        attempt: 1,
        status: 'QUEUED',
        createdAt: new Date(),
      }];
      mockRepo.findPendingQueueItems.mockResolvedValue(mockQueueItems);
      mockRepo.updateQueueItem.mockResolvedValue({});
      mockRepo.updateNotificationStatus.mockResolvedValue({});
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.retryQueue({}, mockUserId);
      expect(res.retried).toBe(1);
      expect(mockRepo.updateQueueItem).toHaveBeenCalledWith('q-1', 'QUEUED', 2, undefined, expect.any(Date));
    });
  });

  describe('Authorization & Ownership Verification (SEC-AUD-01 Regression Tests)', () => {
    const callerUserA = 'user-uuid-A';
    const callerUserB = 'user-uuid-B';
    const adminUser = 'admin-uuid-1';

    const notifUserA = {
      id: 'notif-A',
      recipientUserId: callerUserA,
      status: 'SENT',
      title: 'Alert A',
      message: 'Msg A',
      notificationType: 'GENERAL',
      priority: 'NORMAL',
      channel: 'IN_APP',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('getNotifications', () => {
      it('should throw ForbiddenException when non-admin queries another user notifications', async () => {
        await expect(
          service.getNotifications(callerUserB, undefined, callerUserA, ['PATIENT']),
        ).rejects.toThrow(ForbiddenException);
        expect(mockRepo.findNotifications).not.toHaveBeenCalled();
      });

      it('should scope query to caller user ID when non-admin leaves recipientUserId blank', async () => {
        mockRepo.findNotifications.mockResolvedValue([notifUserA]);

        const res = await service.getNotifications(undefined, undefined, callerUserA, ['PATIENT']);
        expect(mockRepo.findNotifications).toHaveBeenCalledWith(callerUserA, undefined);
        expect(res).toHaveLength(1);
        expect(res[0].id).toBe('notif-A');
      });

      it('should allow non-admin to query their own notifications', async () => {
        mockRepo.findNotifications.mockResolvedValue([notifUserA]);

        const res = await service.getNotifications(callerUserA, 'SENT', callerUserA, ['PATIENT']);
        expect(mockRepo.findNotifications).toHaveBeenCalledWith(callerUserA, 'SENT');
        expect(res).toHaveLength(1);
      });

      it('should allow ADMIN to query any specific user notifications', async () => {
        mockRepo.findNotifications.mockResolvedValue([notifUserA]);

        const res = await service.getNotifications(callerUserA, undefined, adminUser, ['ADMIN']);
        expect(mockRepo.findNotifications).toHaveBeenCalledWith(callerUserA, undefined);
        expect(res).toHaveLength(1);
      });

      it('should allow SUPER_ADMIN to query all platform notifications', async () => {
        mockRepo.findNotifications.mockResolvedValue([notifUserA]);

        const res = await service.getNotifications(undefined, undefined, adminUser, ['SUPER_ADMIN']);
        expect(mockRepo.findNotifications).toHaveBeenCalledWith(undefined, undefined);
        expect(res).toHaveLength(1);
      });
    });

    describe('getNotificationById', () => {
      it('should throw ForbiddenException when non-admin retrieves another user notification', async () => {
        mockRepo.findNotificationById.mockResolvedValue(notifUserA);

        await expect(
          service.getNotificationById('notif-A', callerUserB, ['PATIENT']),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should return notification when owner retrieves it', async () => {
        mockRepo.findNotificationById.mockResolvedValue(notifUserA);

        const res = await service.getNotificationById('notif-A', callerUserA, ['PATIENT']);
        expect(res.id).toBe('notif-A');
      });

      it('should return notification when ADMIN retrieves another user notification', async () => {
        mockRepo.findNotificationById.mockResolvedValue(notifUserA);

        const res = await service.getNotificationById('notif-A', adminUser, ['ADMIN']);
        expect(res.id).toBe('notif-A');
      });
    });

    describe('markAsRead', () => {
      it('should throw ForbiddenException when non-admin marks another user notification as read', async () => {
        mockRepo.findNotificationById.mockResolvedValue(notifUserA);

        await expect(
          service.markAsRead('notif-A', callerUserB, ['PATIENT']),
        ).rejects.toThrow(ForbiddenException);
        expect(mockRepo.markAsRead).not.toHaveBeenCalled();
      });

      it('should allow owner to mark notification as read with atomic ownership check', async () => {
        mockRepo.findNotificationById.mockResolvedValue(notifUserA);
        mockRepo.markAsRead.mockResolvedValue({ ...notifUserA, status: 'READ', readAt: new Date() });
        mockRepo.createAuditLog.mockResolvedValue({});

        const res = await service.markAsRead('notif-A', callerUserA, ['PATIENT']);
        expect(res.status).toBe('READ');
        expect(mockRepo.markAsRead).toHaveBeenCalledWith('notif-A', callerUserA);
      });

      it('should allow ADMIN to mark another user notification as read', async () => {
        mockRepo.findNotificationById.mockResolvedValue(notifUserA);
        mockRepo.markAsRead.mockResolvedValue({ ...notifUserA, status: 'READ', readAt: new Date() });
        mockRepo.createAuditLog.mockResolvedValue({});

        const res = await service.markAsRead('notif-A', adminUser, ['ADMIN']);
        expect(res.status).toBe('READ');
        expect(mockRepo.markAsRead).toHaveBeenCalledWith('notif-A', undefined);
      });

      it('should fail if atomic conditional update in repository fails due to concurrent race', async () => {
        mockRepo.findNotificationById.mockResolvedValue(notifUserA);
        mockRepo.markAsRead.mockRejectedValue(new NotFoundException('Notification not found or access denied'));

        await expect(
          service.markAsRead('notif-A', callerUserA, ['PATIENT']),
        ).rejects.toThrow(NotFoundException);
        expect(mockRepo.markAsRead).toHaveBeenCalledWith('notif-A', callerUserA);
      });
    });

    describe('softDeleteNotification', () => {
      it('should throw ForbiddenException when non-admin deletes another user notification', async () => {
        mockRepo.findNotificationById.mockResolvedValue(notifUserA);

        await expect(
          service.softDeleteNotification('notif-A', callerUserB, ['PATIENT']),
        ).rejects.toThrow(ForbiddenException);
        expect(mockRepo.softDeleteNotification).not.toHaveBeenCalled();
      });

      it('should allow owner to soft delete notification with atomic ownership check', async () => {
        mockRepo.findNotificationById.mockResolvedValue(notifUserA);
        mockRepo.softDeleteNotification.mockResolvedValue({});
        mockRepo.createAuditLog.mockResolvedValue({});

        const res = await service.softDeleteNotification('notif-A', callerUserA, ['PATIENT']);
        expect(res.message).toBe('Notification soft-deleted successfully');
        expect(mockRepo.softDeleteNotification).toHaveBeenCalledWith('notif-A', callerUserA);
      });

      it('should allow ADMIN to soft delete another user notification', async () => {
        mockRepo.findNotificationById.mockResolvedValue(notifUserA);
        mockRepo.softDeleteNotification.mockResolvedValue({});
        mockRepo.createAuditLog.mockResolvedValue({});

        const res = await service.softDeleteNotification('notif-A', adminUser, ['ADMIN']);
        expect(res.message).toBe('Notification soft-deleted successfully');
        expect(mockRepo.softDeleteNotification).toHaveBeenCalledWith('notif-A', undefined);
      });

      it('should fail if atomic conditional soft-delete fails due to concurrent race', async () => {
        mockRepo.findNotificationById.mockResolvedValue(notifUserA);
        mockRepo.softDeleteNotification.mockRejectedValue(new NotFoundException('Notification not found or access denied'));

        await expect(
          service.softDeleteNotification('notif-A', callerUserA, ['PATIENT']),
        ).rejects.toThrow(NotFoundException);
        expect(mockRepo.softDeleteNotification).toHaveBeenCalledWith('notif-A', callerUserA);
      });
    });

    describe('Fail-Closed Missing Identity and Null-Recipient Enforcement', () => {
      const nullRecipientNotif = {
        id: 'notif-null-1',
        recipientUserId: null,
        title: 'System Alert',
        message: 'Platform maintenance notice',
        notificationType: 'SYSTEM',
        priority: 'NORMAL',
        channel: 'IN_APP',
        status: 'SENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      it('should fail closed with UnauthorizedException when caller identity is missing in getNotifications', async () => {
        await expect(service.getNotifications(undefined, undefined, undefined)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should fail closed with UnauthorizedException when caller identity is missing in getNotificationById', async () => {
        await expect(service.getNotificationById('notif-A', undefined)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should fail closed with UnauthorizedException when caller identity is missing in markAsRead', async () => {
        await expect(service.markAsRead('notif-A', '')).rejects.toThrow(UnauthorizedException);
      });

      it('should fail closed with UnauthorizedException when caller identity is missing in softDeleteNotification', async () => {
        await expect(service.softDeleteNotification('notif-A', '')).rejects.toThrow(UnauthorizedException);
      });

      it('should fail closed with UnauthorizedException when caller identity is missing in getPreferences', async () => {
        await expect(service.getPreferences('')).rejects.toThrow(UnauthorizedException);
      });

      it('should fail closed with UnauthorizedException when caller identity is missing in updatePreferences', async () => {
        await expect(service.updatePreferences('', {})).rejects.toThrow(UnauthorizedException);
      });

      it('should block non-admin from reading null-recipient notification (SEC-AUD-01)', async () => {
        mockRepo.findNotificationById.mockResolvedValue(nullRecipientNotif);

        await expect(
          service.getNotificationById('notif-null-1', callerUserA, ['PATIENT']),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should block non-admin from marking null-recipient notification as read', async () => {
        mockRepo.findNotificationById.mockResolvedValue(nullRecipientNotif);

        await expect(
          service.markAsRead('notif-null-1', callerUserA, ['PATIENT']),
        ).rejects.toThrow(ForbiddenException);
        expect(mockRepo.markAsRead).not.toHaveBeenCalled();
      });

      it('should block non-admin from deleting null-recipient notification', async () => {
        mockRepo.findNotificationById.mockResolvedValue(nullRecipientNotif);

        await expect(
          service.softDeleteNotification('notif-null-1', callerUserA, ['PATIENT']),
        ).rejects.toThrow(ForbiddenException);
        expect(mockRepo.softDeleteNotification).not.toHaveBeenCalled();
      });

      it('should allow ADMIN to read null-recipient notification', async () => {
        mockRepo.findNotificationById.mockResolvedValue(nullRecipientNotif);

        const res = await service.getNotificationById('notif-null-1', adminUser, ['ADMIN']);
        expect(res.id).toBe('notif-null-1');
      });

      it('should allow SUPER_ADMIN to read null-recipient notification', async () => {
        mockRepo.findNotificationById.mockResolvedValue(nullRecipientNotif);

        const res = await service.getNotificationById('notif-null-1', adminUser, ['SUPER_ADMIN']);
        expect(res.id).toBe('notif-null-1');
      });

      it('should allow ADMIN to mark null-recipient notification as read', async () => {
        mockRepo.findNotificationById.mockResolvedValue(nullRecipientNotif);
        mockRepo.markAsRead.mockResolvedValue({ ...nullRecipientNotif, status: 'READ', readAt: new Date() });
        mockRepo.createAuditLog.mockResolvedValue({});

        const res = await service.markAsRead('notif-null-1', adminUser, ['ADMIN']);
        expect(res.status).toBe('READ');
        expect(mockRepo.markAsRead).toHaveBeenCalledWith('notif-null-1', undefined);
      });

      it('should allow ADMIN to soft delete null-recipient notification', async () => {
        mockRepo.findNotificationById.mockResolvedValue(nullRecipientNotif);
        mockRepo.softDeleteNotification.mockResolvedValue({});
        mockRepo.createAuditLog.mockResolvedValue({});

        const res = await service.softDeleteNotification('notif-null-1', adminUser, ['ADMIN']);
        expect(res.message).toBe('Notification soft-deleted successfully');
        expect(mockRepo.softDeleteNotification).toHaveBeenCalledWith('notif-null-1', undefined);
      });
    });
  });
});
