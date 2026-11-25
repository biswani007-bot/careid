import { Injectable, NotFoundException, ConflictException, ForbiddenException, UnauthorizedException, Inject } from '@nestjs/common';
import { INotificationRepository } from '../../domain/repositories/notification.repository.interface';
import {
  NotificationTemplateResponseDto, NotificationResponseDto, NotificationPreferenceResponseDto,
  NotificationQueueResponseDto, NotificationAuditLogResponseDto, NotificationDashboardResponseDto,
} from '../../presentation/dto/notification-response.dto';
import {
  CreateTemplateDto, UpdateTemplateDto, CreateNotificationDto,
  UpdateNotificationPreferenceDto, RetryQueueDto,
} from '../../presentation/dto/notification-enterprise.dto';
import { SmsGatewayService } from '../../infrastructure/sms-gateway.service';
import { Optional } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

@Injectable()
export class NotificationService {
  constructor(
    @Inject('INotificationRepository')
    private readonly notificationRepository: INotificationRepository,
    private readonly logger: Logger,
    @Optional()
    private readonly smsGateway?: SmsGatewayService,
  ) {}

  // ─── Dashboard ─────────────────────────────────────────────────────────

  async getDashboardStats(): Promise<NotificationDashboardResponseDto> {
    return this.notificationRepository.getDashboardStats();
  }

  // ─── Templates ───────────────────────────────────────────────────────────

  async createTemplate(userId: string, dto: CreateTemplateDto): Promise<NotificationTemplateResponseDto> {
    const existing = await this.notificationRepository.findTemplateByCode(dto.code);
    if (existing) {
      throw new ConflictException(`Notification template code '${dto.code}' already exists`);
    }

    const template = await this.notificationRepository.createTemplate(dto);
    await this.notificationRepository.createAuditLog({
      action: 'TEMPLATE_CREATED',
      performedBy: userId,
      details: `Created notification template: ${template.name} (${template.code})`,
    });

    return this.mapTemplate(template);
  }

  async getTemplates(): Promise<NotificationTemplateResponseDto[]> {
    const templates = await this.notificationRepository.findTemplates();
    return templates.map((t) => this.mapTemplate(t));
  }

  async getTemplateById(id: string): Promise<NotificationTemplateResponseDto> {
    const template = await this.notificationRepository.findTemplateById(id);
    if (!template) throw new NotFoundException('Notification template not found');
    return this.mapTemplate(template);
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto, userId: string): Promise<NotificationTemplateResponseDto> {
    const template = await this.notificationRepository.findTemplateById(id);
    if (!template) throw new NotFoundException('Notification template not found');

    const updated = await this.notificationRepository.updateTemplate(id, dto);
    await this.notificationRepository.createAuditLog({
      action: 'TEMPLATE_UPDATED',
      performedBy: userId,
      details: `Updated template ${id} to version ${updated.version}`,
    });

    return this.mapTemplate(updated);
  }

  async softDeleteTemplate(id: string, userId: string): Promise<{ message: string }> {
    const template = await this.notificationRepository.findTemplateById(id);
    if (!template) throw new NotFoundException('Notification template not found');

    await this.notificationRepository.softDeleteTemplate(id);
    await this.notificationRepository.createAuditLog({
      action: 'TEMPLATE_DELETED',
      performedBy: userId,
      details: `Soft-deleted template: ${template.name}`,
    });

    return { message: 'Notification template soft-deleted successfully' };
  }

  private mapTemplate(t: any): NotificationTemplateResponseDto {
    return {
      id: t.id,
      code: t.code,
      name: t.name,
      subject: t.subject,
      body: t.body,
      channel: t.channel,
      variables: t.variables ? JSON.parse(t.variables) : undefined,
      isActive: t.isActive,
      version: t.version,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  // ─── Notifications ───────────────────────────────────────────────────────

  async createNotification(userId: string, dto: CreateNotificationDto): Promise<NotificationResponseDto> {
    // Check recipient preferences if recipientUserId provided
    if (dto.recipientUserId) {
      const pref = await this.notificationRepository.getPreferenceByUserId(dto.recipientUserId);
      if (pref) {
        const channel = (dto.channel || 'IN_APP').toUpperCase();
        if (channel === 'EMAIL' && !pref.emailEnabled) {
          this.logger.warn({ msg: 'Email notifications disabled for recipient', recipientUserId: dto.recipientUserId });
        }
      }
    }

    const notification = await this.notificationRepository.createNotification(dto);

    // Queue for delivery
    await this.notificationRepository.createQueueItem(notification.id, 1);
    await this.notificationRepository.updateNotificationStatus(notification.id, 'QUEUED');

    await this.notificationRepository.createAuditLog({
      notificationId: notification.id,
      action: 'NOTIFICATION_QUEUED',
      performedBy: userId,
      details: `Created & queued notification '${notification.title}' for channel ${notification.channel}`,
    });

    return this.mapNotification(notification);
  }

  async getNotifications(
    recipientUserId?: string,
    status?: string,
    callerUserId?: string,
    callerRoles: string[] = [],
  ): Promise<NotificationResponseDto[]> {
    if (!callerUserId) {
      throw new UnauthorizedException('Authentication identity required');
    }
    const isAdmin = callerRoles.includes('ADMIN') || callerRoles.includes('SUPER_ADMIN');
    let targetUserId = recipientUserId;
    if (!isAdmin) {
      if (recipientUserId && recipientUserId !== callerUserId) {
        throw new ForbiddenException('You do not have access to these notifications');
      }
      targetUserId = callerUserId;
    }
    const notifications = await this.notificationRepository.findNotifications(targetUserId, status);
    return notifications.map((n) => this.mapNotification(n));
  }

  async getNotificationById(
    id: string,
    callerUserId?: string,
    callerRoles: string[] = [],
  ): Promise<NotificationResponseDto> {
    if (!callerUserId) {
      throw new UnauthorizedException('Authentication identity required');
    }
    const notification = await this.notificationRepository.findNotificationById(id);
    if (!notification) throw new NotFoundException('Notification not found');

    const isAdmin = callerRoles.includes('ADMIN') || callerRoles.includes('SUPER_ADMIN');
    const isOwner = Boolean(notification.recipientUserId && notification.recipientUserId === callerUserId);
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You do not have access to this notification');
    }

    return this.mapNotification(notification);
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    if (!userId) {
      throw new UnauthorizedException('Authentication identity required');
    }
    const unreadCount = await this.notificationRepository.getUnreadCount(userId);
    return { unreadCount };
  }

  async markAllAsRead(userId: string): Promise<{ success: boolean; markedCount: number }> {
    if (!userId) {
      throw new UnauthorizedException('Authentication identity required');
    }
    const markedCount = await this.notificationRepository.markAllAsRead(userId);
    return { success: true, markedCount };
  }

  async markAsRead(
    id: string,
    userId: string,
    roles: string[] = [],
  ): Promise<NotificationResponseDto> {
    if (!userId) {
      throw new UnauthorizedException('Authentication identity required');
    }
    const notification = await this.notificationRepository.findNotificationById(id);
    if (!notification) throw new NotFoundException('Notification not found');

    const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
    const isOwner = Boolean(notification.recipientUserId && notification.recipientUserId === userId);
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You do not have access to this notification');
    }

    const updated = await this.notificationRepository.markAsRead(id, isAdmin ? undefined : userId);
    await this.notificationRepository.createAuditLog({
      notificationId: id,
      action: 'NOTIFICATION_READ',
      performedBy: userId,
      details: `Marked notification ${id} as READ`,
    });

    return this.mapNotification(updated);
  }

  async softDeleteNotification(
    id: string,
    userId: string,
    roles: string[] = [],
  ): Promise<{ message: string }> {
    if (!userId) {
      throw new UnauthorizedException('Authentication identity required');
    }
    const notification = await this.notificationRepository.findNotificationById(id);
    if (!notification) throw new NotFoundException('Notification not found');

    const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
    const isOwner = Boolean(notification.recipientUserId && notification.recipientUserId === userId);
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You do not have access to this notification');
    }

    await this.notificationRepository.softDeleteNotification(id, isAdmin ? undefined : userId);
    await this.notificationRepository.createAuditLog({
      notificationId: id,
      action: 'NOTIFICATION_DELETED',
      performedBy: userId,
      details: `Soft-deleted notification ${id}`,
    });

    return { message: 'Notification soft-deleted successfully' };
  }

  private mapNotification(n: any): NotificationResponseDto {
    return {
      id: n.id,
      recipientUserId: n.recipientUserId || undefined,
      recipientEmail: n.recipientEmail || undefined,
      recipientPhone: n.recipientPhone || undefined,
      title: n.title,
      message: n.message,
      notificationType: n.notificationType,
      priority: n.priority,
      channel: n.channel,
      status: n.status,
      metadata: n.metadata ? JSON.parse(n.metadata) : undefined,
      scheduledAt: n.scheduledAt ? n.scheduledAt.toISOString() : undefined,
      sentAt: n.sentAt ? n.sentAt.toISOString() : undefined,
      readAt: n.readAt ? n.readAt.toISOString() : undefined,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    };
  }

  // ─── Preferences ─────────────────────────────────────────────────────────

  async getPreferences(userId: string): Promise<NotificationPreferenceResponseDto> {
    if (!userId) {
      throw new UnauthorizedException('Authentication identity required');
    }
    let pref = await this.notificationRepository.getPreferenceByUserId(userId);
    if (!pref) {
      pref = await this.notificationRepository.upsertPreference(userId, {});
    }
    return {
      id: pref.id,
      userId: pref.userId,
      emailEnabled: pref.emailEnabled,
      smsEnabled: pref.smsEnabled,
      pushEnabled: pref.pushEnabled,
      inAppEnabled: pref.inAppEnabled,
      webhookEnabled: pref.webhookEnabled,
      createdAt: pref.createdAt.toISOString(),
      updatedAt: pref.updatedAt.toISOString(),
    };
  }

  async updatePreferences(userId: string, dto: UpdateNotificationPreferenceDto): Promise<NotificationPreferenceResponseDto> {
    if (!userId) {
      throw new UnauthorizedException('Authentication identity required');
    }
    const updated = await this.notificationRepository.upsertPreference(userId, dto);
    await this.notificationRepository.createAuditLog({
      action: 'PREFERENCES_UPDATED',
      performedBy: userId,
      details: `Updated notification preferences for user ${userId}`,
    });
    return {
      id: updated.id,
      userId: updated.userId,
      emailEnabled: updated.emailEnabled,
      smsEnabled: updated.smsEnabled,
      pushEnabled: updated.pushEnabled,
      inAppEnabled: updated.inAppEnabled,
      webhookEnabled: updated.webhookEnabled,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  private maskSensitiveNotification(n: any): NotificationResponseDto {
    const mapped = this.mapNotification(n);
    if (mapped.message) {
      mapped.message = mapped.message.replace(/\b\d{4,8}\b/g, '******');
    }
    return mapped;
  }

  // ─── Queue Operations ───────────────────────────────────────────────────

  async getPendingQueueItems(filters?: {
    status?: string;
    notificationType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<NotificationQueueResponseDto[]> {
    const items = await this.notificationRepository.findPendingQueueItems(filters?.limit || 50, filters);
    return items.map((q) => ({
      id: q.id,
      notificationId: q.notificationId,
      attempt: q.attempt,
      status: q.status,
      nextRetryAt: q.nextRetryAt ? q.nextRetryAt.toISOString() : undefined,
      lastError: q.lastError || undefined,
      notification: q.notification ? this.maskSensitiveNotification(q.notification) : undefined,
      createdAt: q.createdAt.toISOString(),
    }));
  }

  async retryQueue(dto: RetryQueueDto, userId: string): Promise<{ retried: number }> {
    const pending = await this.notificationRepository.findPendingQueueItems(20);
    let retried = 0;

    for (const item of pending) {
      if (dto.queueItemId && item.id !== dto.queueItemId) continue;

      const nextAttempt = item.attempt + 1;
      await this.notificationRepository.updateQueueItem(item.id, 'QUEUED', nextAttempt, undefined, new Date(Date.now() + 60000));
      await this.notificationRepository.updateNotificationStatus(item.notificationId, 'SENT', new Date());
      retried++;

      await this.notificationRepository.createAuditLog({
        notificationId: item.notificationId,
        action: 'QUEUE_RETRY',
        performedBy: userId,
        details: `Retried delivery attempt ${nextAttempt} for queue item ${item.id}`,
      });
    }

    return { retried };
  }

  async processPendingQueue(batchSize = 25): Promise<{ processed: number; sent: number; failed: number }> {
    const pending = await this.notificationRepository.findPendingQueueItems(batchSize);
    let sent = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        const notif = item.notification;
        if (!notif) {
          await this.notificationRepository.updateQueueItem(item.id, 'FAILED', item.attempt + 1, 'Notification record missing');
          failed++;
          continue;
        }

        // Dispatch via SMS gateway if SMS channel
        if (notif.channel === 'SMS' && notif.recipientPhone && this.smsGateway) {
          const smsRes = await this.smsGateway.sendSms(notif.recipientPhone, notif.message);
          if (!smsRes.success) {
            throw new Error(smsRes.error || 'SMS delivery failed');
          }
        }

        const nextAttempt = item.attempt + 1;
        await this.notificationRepository.updateQueueItem(item.id, 'SENT', nextAttempt);
        await this.notificationRepository.updateNotificationStatus(item.notificationId, 'SENT', new Date());
        sent++;

        await this.notificationRepository.createAuditLog({
          notificationId: item.notificationId,
          action: 'NOTIFICATION_DISPATCHED',
          performedBy: 'SYSTEM_QUEUE_WORKER',
          details: `Dispatched notification ${item.notificationId} via channel ${notif.channel}`,
        });
      } catch (err: any) {
        failed++;
        const nextAttempt = item.attempt + 1;
        const isExhausted = nextAttempt >= 3;
        const newStatus = isExhausted ? 'FAILED' : 'QUEUED';
        const nextRetry = isExhausted ? undefined : new Date(Date.now() + nextAttempt * 60000);
        await this.notificationRepository.updateQueueItem(item.id, newStatus, nextAttempt, err.message, nextRetry);
        if (isExhausted) {
          await this.notificationRepository.updateNotificationStatus(item.notificationId, 'FAILED');
        }
      }
    }

    return { processed: pending.length, sent, failed };
  }

  // ─── Audit ───────────────────────────────────────────────────────────────

  async getAuditLogs(): Promise<NotificationAuditLogResponseDto[]> {
    const logs = await this.notificationRepository.findAuditLogs(100);
    return logs.map((l) => ({
      id: l.id,
      notificationId: l.notificationId || undefined,
      action: l.action,
      performedBy: l.performedBy || undefined,
      details: l.details || undefined,
      createdAt: l.createdAt.toISOString(),
    }));
  }
}
