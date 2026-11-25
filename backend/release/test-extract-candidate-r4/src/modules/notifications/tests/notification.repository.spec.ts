import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationRepository } from '../infrastructure/database/notification.repository';
import { DatabaseService } from '@database/database.service';

describe('NotificationRepository (Atomic Conditional Mutations)', () => {
  let repository: NotificationRepository;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      notification: {
        updateMany: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      notificationTemplate: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      notificationPreference: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      notificationQueue: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      notificationAuditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationRepository,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    repository = module.get<NotificationRepository>(NotificationRepository);
  });

  describe('markAsRead atomic conditional mutations', () => {
    const notifId = 'notif-123';
    const recipientUserId = 'user-owner-456';

    it('should atomically update notification if user owns it and return updated entity', async () => {
      mockDb.notification.updateMany.mockResolvedValue({ count: 1 });
      mockDb.notification.findFirst.mockResolvedValue({
        id: notifId,
        recipientUserId,
        status: 'READ',
        isDeleted: false,
      });

      const result = await repository.markAsRead(notifId, recipientUserId);

      expect(mockDb.notification.updateMany).toHaveBeenCalledWith({
        where: { id: notifId, recipientUserId, isDeleted: false },
        data: {
          status: 'READ',
          readAt: expect.any(Date),
        },
      });
      expect(result.id).toBe(notifId);
      expect(result.status).toBe('READ');
    });

    it('should throw NotFoundException if updateMany matches 0 rows (foreign recipient / already deleted)', async () => {
      mockDb.notification.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        repository.markAsRead(notifId, 'different-user'),
      ).rejects.toThrow(NotFoundException);

      expect(mockDb.notification.updateMany).toHaveBeenCalledWith({
        where: { id: notifId, recipientUserId: 'different-user', isDeleted: false },
        data: {
          status: 'READ',
          readAt: expect.any(Date),
        },
      });
      expect(mockDb.notification.findFirst).not.toHaveBeenCalled();
    });

    it('should use update without recipient condition when recipientUserId is undefined (admin role)', async () => {
      mockDb.notification.update.mockResolvedValue({
        id: notifId,
        recipientUserId,
        status: 'READ',
        isDeleted: false,
      });

      const result = await repository.markAsRead(notifId, undefined);

      expect(mockDb.notification.update).toHaveBeenCalledWith({
        where: { id: notifId },
        data: {
          status: 'READ',
          readAt: expect.any(Date),
        },
      });
      expect(result.status).toBe('READ');
    });
  });

  describe('softDeleteNotification atomic conditional mutations', () => {
    const notifId = 'notif-123';
    const recipientUserId = 'user-owner-456';

    it('should atomically soft delete notification if user owns it', async () => {
      mockDb.notification.updateMany.mockResolvedValue({ count: 1 });

      await repository.softDeleteNotification(notifId, recipientUserId);

      expect(mockDb.notification.updateMany).toHaveBeenCalledWith({
        where: { id: notifId, recipientUserId, isDeleted: false },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if updateMany matches 0 rows during soft delete', async () => {
      mockDb.notification.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        repository.softDeleteNotification(notifId, 'different-user'),
      ).rejects.toThrow(NotFoundException);

      expect(mockDb.notification.updateMany).toHaveBeenCalledWith({
        where: { id: notifId, recipientUserId: 'different-user', isDeleted: false },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
        },
      });
    });

    it('should use update without recipient condition when recipientUserId is undefined (admin role)', async () => {
      mockDb.notification.update.mockResolvedValue({
        id: notifId,
        isDeleted: true,
      });

      await repository.softDeleteNotification(notifId, undefined);

      expect(mockDb.notification.update).toHaveBeenCalledWith({
        where: { id: notifId },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
        },
      });
    });
  });
});
