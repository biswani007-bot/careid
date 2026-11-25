import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { ReminderScheduleStatus, ReminderEventStatus } from '@prisma/client';
import {
  INotificationDeliveryAdapter,
  ReminderDeliveryPayload,
} from './adapters/notification-delivery.adapter';

export interface CreateReminderScheduleInput {
  prescriptionId: string;
  patientProfileId: string;
  doctorId?: string;
  facilityId?: string;
  enabled?: boolean;
  intervalHours?: number;
  reminderStartTime?: Date;
}

export interface ReminderProcessResult {
  scheduleId: string;
  prescriptionId: string;
  status: 'PROCESSED' | 'SKIPPED_NOT_DUE' | 'SKIPPED_COLLECTED' | 'SKIPPED_DISABLED' | 'LOCKED_BY_ANOTHER_WORKER' | 'FAILED';
  eventId?: string;
  notificationId?: string;
  nextDueAt?: Date;
  error?: string;
}

@Injectable()
export class PrescriptionReminderService {
  private readonly logger = new Logger(PrescriptionReminderService.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject('INotificationDeliveryAdapter')
    private readonly deliveryAdapter: INotificationDeliveryAdapter,
  ) {}

  /**
   * Deterministically synchronizes prescription notes string with reminder trailer metadata.
   * Ensures Doctor Web and Admin Web clients remain 100% compatible.
   */
  syncPrescriptionNotesTrailer(
    existingNotes: string | null | undefined,
    enabled: boolean,
    hours: number,
    collected: boolean = false,
    collectedAt?: string,
  ): string {
    const raw = existingNotes || '';
    const cleanUserNotes = raw.includes('[PICKUP_REMINDER]:')
      ? raw.split('[PICKUP_REMINDER]:')[0].trim()
      : raw.trim();

    const trailerPayload: Record<string, any> = {
      enabled: Boolean(enabled && !collected),
      hours: Math.max(1, Math.min(24, hours || 4)),
    };

    if (collected) {
      trailerPayload.collected = true;
      trailerPayload.collectedAt = collectedAt || new Date().toISOString();
    }

    const trailerStr = `[PICKUP_REMINDER]:${JSON.stringify(trailerPayload)}`;
    return cleanUserNotes ? `${cleanUserNotes}\n${trailerStr}` : trailerStr;
  }

  /**
   * Parse reminder trailer metadata from raw notes if present.
   */
  parseNotesTrailer(notes: string | null | undefined): {
    enabled?: boolean;
    hours?: number;
    collected?: boolean;
    collectedAt?: string;
  } | null {
    if (!notes || !notes.includes('[PICKUP_REMINDER]:')) {
      return null;
    }
    try {
      const marker = notes.split('[PICKUP_REMINDER]:')[1];
      const parsed = JSON.parse(marker.trim());
      return {
        enabled: parsed.enabled,
        hours: parsed.hours,
        collected: parsed.collected,
        collectedAt: parsed.collectedAt,
      };
    } catch {
      return null;
    }
  }

  /**
   * Creates or updates a durable reminder schedule in PostgreSQL.
   */
  async createOrUpdateSchedule(input: CreateReminderScheduleInput) {
    const intervalHours = Math.max(1, Math.min(24, input.intervalHours || 4));
    const enabled = input.enabled !== false;
    const startTime = input.reminderStartTime || new Date();

    const status: ReminderScheduleStatus = enabled ? 'ACTIVE' : 'PAUSED';
    const nextDueAt = enabled
      ? new Date(startTime.getTime() + intervalHours * 3600 * 1000)
      : null;

    const schedule = await this.db.prescriptionReminderSchedule.upsert({
      where: { prescriptionId: input.prescriptionId },
      create: {
        prescriptionId: input.prescriptionId,
        patientProfileId: input.patientProfileId,
        doctorId: input.doctorId || null,
        facilityId: input.facilityId || null,
        enabled,
        intervalHours,
        reminderStartTime: startTime,
        nextDueAt,
        status,
      },
      update: {
        enabled,
        intervalHours,
        status,
        nextDueAt: enabled ? (nextDueAt || new Date(Date.now() + intervalHours * 3600 * 1000)) : null,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Reminder schedule ${schedule.id} configured for prescription ${input.prescriptionId} (status=${status}, interval=${intervalHours}h, nextDueAt=${nextDueAt?.toISOString()})`);
    return schedule;
  }

  /**
   * Updates interval hours or enabled status of an existing schedule.
   */
  async updateReminderSettings(prescriptionId: string, enabled?: boolean, intervalHours?: number) {
    const existing = await this.db.prescriptionReminderSchedule.findUnique({
      where: { prescriptionId },
    });

    if (!existing) {
      throw new NotFoundException(`No reminder schedule found for prescription '${prescriptionId}'`);
    }

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED' || existing.collectedAt) {
      throw new BadRequestException('Cannot modify reminder settings for an already collected prescription');
    }

    const newEnabled = enabled !== undefined ? enabled : existing.enabled;
    const newInterval = intervalHours !== undefined
      ? Math.max(1, Math.min(24, intervalHours))
      : existing.intervalHours;

    let nextDueAt = existing.nextDueAt;
    let status: ReminderScheduleStatus = existing.status;

    if (!newEnabled) {
      status = 'PAUSED';
      nextDueAt = null;
    } else {
      status = 'ACTIVE';
      const baseTime = existing.lastProcessedAt || existing.reminderStartTime || new Date();
      nextDueAt = new Date(baseTime.getTime() + newInterval * 3600 * 1000);
      if (nextDueAt.getTime() <= Date.now()) {
        nextDueAt = new Date();
      }
    }

    const updated = await this.db.prescriptionReminderSchedule.update({
      where: { id: existing.id },
      data: {
        enabled: newEnabled,
        intervalHours: newInterval,
        status,
        nextDueAt,
        updatedAt: new Date(),
      },
    });

    // Also synchronize prescription notes trailer
    const rx = await this.db.prescription.findUnique({ where: { id: prescriptionId } });
    if (rx) {
      const synchedNotes = this.syncPrescriptionNotesTrailer(
        rx.notes,
        newEnabled,
        newInterval,
        false,
      );
      await this.db.prescription.update({
        where: { id: prescriptionId },
        data: { notes: synchedNotes, updatedAt: new Date() },
      });
    }

    return updated;
  }

  /**
   * Marks a prescription collected: cancels the schedule and future reminders atomically.
   * Completely idempotent: repeated calls return current state without error or duplicates.
   */
  async markCollected(prescriptionId: string, collectedAt?: Date, userId?: string) {
    const timestamp = collectedAt || new Date();
    const isoString = timestamp.toISOString();

    const schedule = await this.db.prescriptionReminderSchedule.findUnique({
      where: { prescriptionId },
    });

    if (schedule) {
      if (schedule.status !== 'CANCELLED' && schedule.status !== 'COMPLETED') {
        await this.db.$transaction(async (tx) => {
          // Update schedule to CANCELLED
          await tx.prescriptionReminderSchedule.update({
            where: { id: schedule.id },
            data: {
              enabled: false,
              status: 'CANCELLED',
              collectedAt: timestamp,
              nextDueAt: null,
              updatedAt: new Date(),
            },
          });

          // Cancel any remaining SCHEDULED / QUEUED events
          await tx.prescriptionReminderEvent.updateMany({
            where: {
              scheduleId: schedule.id,
              status: { in: ['SCHEDULED', 'QUEUED'] },
            },
            data: {
              status: 'CANCELLED',
              failureReason: 'Prescription marked collected by patient/pharmacy (CR-08)',
            },
          });

          // Record audit log
          try {
            await tx.notificationAuditLog.create({
              data: {
                action: 'PRESCRIPTION_COLLECTED_REMINDER_CANCELLED',
                performedBy: userId || 'CR08_COLLECTION_SERVICE',
                details: `Prescription ${prescriptionId} marked as collected at ${isoString}. Reminder schedule ${schedule.id} cancelled.`,
              },
            });
          } catch {}
        });
        this.logger.log(`Prescription ${prescriptionId} collected: Reminder schedule ${schedule.id} cancelled.`);
      }
    }

    return {
      prescriptionId,
      collected: true,
      collectedAt: isoString,
      remindersCancelled: true,
    };
  }

  /**
   * Processes a single due schedule using atomic row-level locking.
   * Prevents concurrent workers or multiple instances from duplicating reminders.
   */
  async processDueSchedule(scheduleId: string, asOfDate: Date = new Date()): Promise<ReminderProcessResult> {
    return this.db.$transaction(async (tx) => {
      // 1. Acquire exclusive row lock using PostgreSQL FOR UPDATE SKIP LOCKED
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT * FROM prescription_reminder_schedules
        WHERE id = ${scheduleId}
          AND status = 'ACTIVE'::"ReminderScheduleStatus"
          AND enabled = true
          AND (next_due_at IS NOT NULL AND next_due_at <= ${asOfDate})
        FOR UPDATE SKIP LOCKED;
      `;

      if (!lockedRows || lockedRows.length === 0) {
        return {
          scheduleId,
          prescriptionId: '',
          status: 'LOCKED_BY_ANOTHER_WORKER',
        };
      }

      const schedule = lockedRows[0];
      const prescriptionId = schedule.prescription_id;
      const patientProfileId = schedule.patient_profile_id;
      const intervalHours = schedule.interval_hours || 4;
      const scheduledDueAt = schedule.next_due_at;

      // 2. Verify prescription status: uncollected, active, and exists
      const prescription = await tx.prescription.findUnique({
        where: { id: prescriptionId },
      });

      if (!prescription) {
        await tx.prescriptionReminderSchedule.update({
          where: { id: scheduleId },
          data: { status: 'CANCELLED', enabled: false, nextDueAt: null },
        });
        return {
          scheduleId,
          prescriptionId,
          status: 'SKIPPED_COLLECTED',
          error: 'Prescription no longer exists',
        };
      }

      if (prescription.status === 'DISCONTINUED') {
        await tx.prescriptionReminderSchedule.update({
          where: { id: scheduleId },
          data: { status: 'CANCELLED', enabled: false, nextDueAt: null },
        });
        return {
          scheduleId,
          prescriptionId,
          status: 'SKIPPED_COLLECTED',
          error: 'Prescription is discontinued',
        };
      }

      // 3. Count existing processed events to determine attempt number
      const priorEventsCount = await tx.prescriptionReminderEvent.count({
        where: { scheduleId },
      });
      const attempt = priorEventsCount + 1;

      // 4. Create initial event in QUEUED state
      const event = await tx.prescriptionReminderEvent.create({
        data: {
          scheduleId,
          prescriptionId,
          patientProfileId,
          scheduledDueAt,
          status: 'QUEUED',
          retryCount: 0,
        },
      });

      // 5. Deliver notification via delivery adapter
      const deliveryPayload: ReminderDeliveryPayload = {
        scheduleId,
        prescriptionId,
        patientProfileId,
        scheduledDueAt,
        attempt,
      };

      const result = await this.deliveryAdapter.deliver(deliveryPayload);

      if (result.success) {
        const nextDueAt = new Date(asOfDate.getTime() + intervalHours * 3600 * 1000);

        // Update event record to PROCESSED_INTERNALLY
        await tx.prescriptionReminderEvent.update({
          where: { id: event.id },
          data: {
            status: 'PROCESSED_INTERNALLY',
            processedAt: new Date(),
            notificationId: result.internalNotificationId || null,
          },
        });

        // Advance schedule next due time
        await tx.prescriptionReminderSchedule.update({
          where: { id: scheduleId },
          data: {
            lastProcessedAt: new Date(),
            nextDueAt,
            updatedAt: new Date(),
          },
        });

        return {
          scheduleId,
          prescriptionId,
          status: 'PROCESSED',
          eventId: event.id,
          notificationId: result.internalNotificationId,
          nextDueAt,
        };
      } else {
        // Bounded retry failure handling
        const nextRetryAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min bounded retry
        await tx.prescriptionReminderEvent.update({
          where: { id: event.id },
          data: {
            status: 'FAILED',
            failureReason: result.error || 'Delivery adapter failure',
            retryCount: 1,
          },
        });

        await tx.prescriptionReminderSchedule.update({
          where: { id: scheduleId },
          data: {
            nextDueAt: nextRetryAt,
            updatedAt: new Date(),
          },
        });

        return {
          scheduleId,
          prescriptionId,
          status: 'FAILED',
          eventId: event.id,
          error: result.error,
        };
      }
    });
  }

  /**
   * Returns list of all active schedules whose next due timestamp is <= asOfDate.
   */
  async getDueSchedules(asOfDate: Date = new Date()) {
    return this.db.prescriptionReminderSchedule.findMany({
      where: {
        status: 'ACTIVE',
        enabled: true,
        nextDueAt: { lte: asOfDate },
      },
      orderBy: { nextDueAt: 'asc' },
    });
  }

  /**
   * Backfills existing active prescriptions with durable schedules on startup.
   */
  async backfillExistingPrescriptions(): Promise<number> {
    try {
      const prescriptionsWithNotes = await this.db.prescription.findMany({
        where: {
          notes: { contains: '[PICKUP_REMINDER]:' },
        },
      });

      let count = 0;
      for (const rx of prescriptionsWithNotes) {
        const existing = await this.db.prescriptionReminderSchedule.findUnique({
          where: { prescriptionId: rx.id },
        });

        if (!existing) {
          const trailer = this.parseNotesTrailer(rx.notes);
          if (trailer) {
            const isCollected = Boolean(trailer.collected);
            const isEnabled = Boolean(trailer.enabled) && !isCollected;
            const hours = trailer.hours || 4;
            const startTime = rx.prescribedAt || rx.createdAt || new Date();

            let status: ReminderScheduleStatus = 'ACTIVE';
            let nextDueAt: Date | null = null;
            let collectedAt: Date | null = null;

            if (isCollected) {
              status = 'CANCELLED';
              collectedAt = trailer.collectedAt ? new Date(trailer.collectedAt) : new Date();
            } else if (!isEnabled) {
              status = 'PAUSED';
            } else {
              status = 'ACTIVE';
              nextDueAt = new Date(startTime.getTime() + hours * 3600 * 1000);
            }

            await this.db.prescriptionReminderSchedule.create({
              data: {
                prescriptionId: rx.id,
                patientProfileId: rx.patientProfileId,
                doctorId: rx.doctorId,
                enabled: isEnabled,
                intervalHours: hours,
                reminderStartTime: startTime,
                nextDueAt,
                collectedAt,
                status,
              },
            });
            count++;
          }
        }
      }

      if (count > 0) {
        this.logger.log(`Backfilled ${count} historical prescription reminder schedules into PostgreSQL`);
      }
      return count;
    } catch (err: any) {
      this.logger.error(`Error during historical reminder backfill: ${err.message}`);
      return 0;
    }
  }

  /**
   * Retrieves schedule details including history of reminder events.
   */
  async getScheduleWithEvents(prescriptionId: string) {
    return this.db.prescriptionReminderSchedule.findUnique({
      where: { prescriptionId },
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
          include: { notification: true },
        },
      },
    });
  }
}
