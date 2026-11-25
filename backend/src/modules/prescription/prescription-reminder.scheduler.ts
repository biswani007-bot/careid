import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrescriptionReminderService } from './prescription-reminder.service';

@Injectable()
export class PrescriptionReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrescriptionReminderScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private pollIntervalMs = 30000; // 30 seconds default evaluation frequency

  constructor(private readonly reminderService: PrescriptionReminderService) {}

  async onModuleInit() {
    this.logger.log('Initializing CareID CR-08 Prescription Pickup Reminder Engine...');
    
    // 1. Backfill any historical prescriptions missing durable schedules
    await this.reminderService.backfillExistingPrescriptions();

    // 2. Start periodic background evaluation loop
    const envInterval = process.env.PRESCRIPTION_REMINDER_POLL_INTERVAL_MS;
    if (envInterval) {
      const parsed = parseInt(envInterval, 10);
      if (!isNaN(parsed) && parsed >= 5000) {
        this.pollIntervalMs = parsed;
      }
    }

    if (process.env.NODE_ENV !== 'test') {
      this.startScheduler();
    }
  }

  onModuleDestroy() {
    this.stopScheduler();
  }

  startScheduler() {
    if (this.timer) return;
    this.logger.log(`Starting Prescription Reminder Scheduler (interval: ${this.pollIntervalMs}ms)`);
    this.timer = setInterval(() => {
      this.triggerProcessingCycle().catch((err) => {
        this.logger.error(`Unhandled error in prescription reminder processing cycle: ${err.message}`, err.stack);
      });
    }, this.pollIntervalMs);
  }

  stopScheduler() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('Prescription Reminder Scheduler stopped.');
    }
  }

  /**
   * Executes a complete processing cycle for all due prescription reminder schedules.
   * Can be invoked programmatically with a deterministic reference date for testing.
   */
  async triggerProcessingCycle(asOfDate: Date = new Date()): Promise<{
    processedCount: number;
    skippedCount: number;
    errorCount: number;
  }> {
    if (this.isRunning) {
      this.logger.debug('Cycle already in progress; skipping duplicate trigger.');
      return { processedCount: 0, skippedCount: 0, errorCount: 0 };
    }

    this.isRunning = true;
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
      // 1. Find all active schedules whose next due date is due
      const dueSchedules = await this.reminderService.getDueSchedules(asOfDate);

      for (const schedule of dueSchedules) {
        try {
          const result = await this.reminderService.processDueSchedule(schedule.id, asOfDate);
          if (result.status === 'PROCESSED') {
            processedCount++;
          } else if (result.status === 'FAILED') {
            errorCount++;
          } else {
            skippedCount++;
          }
        } catch (err: any) {
          errorCount++;
          this.logger.error(`Error processing schedule ${schedule.id}: ${err.message}`);
        }
      }

      if (processedCount > 0 || errorCount > 0) {
        this.logger.log(`Prescription Reminder Cycle Complete: ${processedCount} processed, ${skippedCount} skipped, ${errorCount} errors (asOf=${asOfDate.toISOString()})`);
      }
    } finally {
      this.isRunning = false;
    }

    return { processedCount, skippedCount, errorCount };
  }
}
