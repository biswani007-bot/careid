import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';

export interface ReminderDeliveryPayload {
  scheduleId: string;
  prescriptionId: string;
  patientProfileId: string;
  recipientUserId?: string;
  patientName?: string;
  doctorName?: string;
  scheduledDueAt: Date;
  attempt: number;
}

export interface ReminderDeliveryResult {
  success: boolean;
  provider: string;
  internalNotificationId?: string;
  deliveryStatus: 'PROCESSED_INTERNALLY' | 'FAILED';
  error?: string;
}

export interface INotificationDeliveryAdapter {
  getProviderName(): string;
  deliver(payload: ReminderDeliveryPayload): Promise<ReminderDeliveryResult>;
}

@Injectable()
export class InternalOnlyDeliveryAdapter implements INotificationDeliveryAdapter {
  private readonly logger = new Logger(InternalOnlyDeliveryAdapter.name);

  constructor(private readonly db: DatabaseService) {}

  getProviderName(): string {
    return 'INTERNAL_ONLY';
  }

  /**
   * Generates a durable internal in-app notification record for the patient.
   * STRICT OPTION A: External SMS, Firebase push, and email integrations are deferred.
   * This implementation does NOT claim external delivery and records honest internal status.
   */
  async deliver(payload: ReminderDeliveryPayload): Promise<ReminderDeliveryResult> {
    try {
      // 1. Resolve recipient user ID if not explicitly provided
      let recipientUserId = payload.recipientUserId;
      if (!recipientUserId) {
        const patientProfile = await this.db.patientProfile.findUnique({
          where: { id: payload.patientProfileId },
          select: { userId: true },
        });
        recipientUserId = patientProfile?.userId;
      }

      // 2. Privacy-safe notification content (no medication names or clinical diagnosis codes in preview)
      const title = 'Prescription Pickup Reminder';
      const message = 'Your prescription is ready for pickup. Please check your CareID account for details.';

      // 3. Create durable Notification record in PostgreSQL
      const notification = await this.db.notification.create({
        data: {
          recipientUserId: recipientUserId || null,
          title,
          message,
          notificationType: 'PATIENT',
          channel: 'IN_APP',
          priority: 'NORMAL',
          status: 'QUEUED',
          scheduledAt: payload.scheduledDueAt,
          metadata: JSON.stringify({
            source: 'CR-08-PRESCRIPTION-PICKUP-REMINDER',
            scheduleId: payload.scheduleId,
            prescriptionId: payload.prescriptionId,
            attempt: payload.attempt,
            provider: 'INTERNAL_ONLY',
            externalDeliveryDeferred: true,
          }),
        },
      });

      // 4. Create internal queue item for notification tracking
      await this.db.notificationQueue.create({
        data: {
          notificationId: notification.id,
          attempt: payload.attempt,
          status: 'QUEUED',
        },
      });

      // 5. Audit log entry for internal reminder generation
      try {
        await this.db.notificationAuditLog.create({
          data: {
            notificationId: notification.id,
            action: 'PRESCRIPTION_PICKUP_REMINDER_GENERATED',
            performedBy: 'CR08_RECURRING_REMINDER_ENGINE',
            details: `Internal pickup reminder generated for prescription ${payload.prescriptionId} (Patient Profile: ${payload.patientProfileId}, Schedule: ${payload.scheduleId}, Attempt: ${payload.attempt}). External delivery deferred per Option A.`,
          },
        });
      } catch (auditErr: any) {
        this.logger.warn(`Failed to write notification audit log: ${auditErr.message}`);
      }

      this.logger.log(`Internal pickup reminder notification created [id=${notification.id}] for prescription ${payload.prescriptionId}`);

      return {
        success: true,
        provider: this.getProviderName(),
        internalNotificationId: notification.id,
        deliveryStatus: 'PROCESSED_INTERNALLY',
      };
    } catch (err: any) {
      this.logger.error(`Failed to generate internal pickup reminder: ${err.message}`, err.stack);
      return {
        success: false,
        provider: this.getProviderName(),
        deliveryStatus: 'FAILED',
        error: err.message,
      };
    }
  }
}
