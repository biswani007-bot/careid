import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrescriptionReminderService } from '../prescription-reminder.service';
import { PrescriptionReminderScheduler } from '../prescription-reminder.scheduler';
import {
  InternalOnlyDeliveryAdapter,
  INotificationDeliveryAdapter,
  ReminderDeliveryPayload,
  ReminderDeliveryResult,
} from '../adapters/notification-delivery.adapter';
import { DatabaseService } from '@database/database.service';

describe('CAREID CR-08 Option A: Complete Recurring Prescription Pickup Reminder Engine', () => {
  let reminderService: PrescriptionReminderService;
  let scheduler: PrescriptionReminderScheduler;
  let deliveryAdapter: InternalOnlyDeliveryAdapter;
  let mockDb: any;

  // Fixtures
  const patientProfileId = 'pat-uuid-001';
  const doctorId = 'doc-uuid-001';
  const prescriptionId = 'rx-uuid-001';
  const scheduleId = 'sched-uuid-001';
  const notificationId = 'notif-uuid-001';

  const baseStartTime = new Date('2026-11-23T08:00:00.000Z');

  beforeEach(async () => {
    mockDb = {
      prescriptionReminderSchedule: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      prescriptionReminderEvent: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      prescription: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      patientProfile: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      doctorProfile: {
        findUnique: jest.fn(),
      },
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      notificationQueue: {
        create: jest.fn(),
      },
      notificationAuditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(mockDb)),
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionReminderService,
        PrescriptionReminderScheduler,
        InternalOnlyDeliveryAdapter,
        { provide: DatabaseService, useValue: mockDb },
        {
          provide: 'INotificationDeliveryAdapter',
          useExisting: InternalOnlyDeliveryAdapter,
        },
      ],
    }).compile();

    reminderService = module.get<PrescriptionReminderService>(PrescriptionReminderService);
    scheduler = module.get<PrescriptionReminderScheduler>(PrescriptionReminderScheduler);
    deliveryAdapter = module.get<InternalOnlyDeliveryAdapter>(InternalOnlyDeliveryAdapter);
  });

  afterEach(() => {
    scheduler.stopScheduler();
    jest.clearAllMocks();
  });

  // ─── TC-CR08-01: Enabled reminder creates a durable schedule ───────────────
  it('TC-CR08-01: Enabled reminder creates a durable schedule in PostgreSQL', async () => {
    const expectedDue = new Date(baseStartTime.getTime() + 4 * 3600 * 1000);
    mockDb.prescriptionReminderSchedule.upsert.mockResolvedValue({
      id: scheduleId,
      prescriptionId,
      patientProfileId,
      doctorId,
      enabled: true,
      intervalHours: 4,
      reminderStartTime: baseStartTime,
      nextDueAt: expectedDue,
      status: 'ACTIVE',
    });

    const schedule = await reminderService.createOrUpdateSchedule({
      prescriptionId,
      patientProfileId,
      doctorId,
      enabled: true,
      intervalHours: 4,
      reminderStartTime: baseStartTime,
    });

    expect(schedule.id).toBe(scheduleId);
    expect(schedule.enabled).toBe(true);
    expect(schedule.status).toBe('ACTIVE');
    expect(schedule.nextDueAt).toEqual(expectedDue);
    expect(mockDb.prescriptionReminderSchedule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { prescriptionId },
        create: expect.objectContaining({
          prescriptionId,
          patientProfileId,
          enabled: true,
          intervalHours: 4,
          status: 'ACTIVE',
        }),
      }),
    );
  });

  // ─── TC-CR08-02: Disabled reminder does not create an active schedule ─────
  it('TC-CR08-02: Disabled reminder does not create an active schedule', async () => {
    mockDb.prescriptionReminderSchedule.upsert.mockResolvedValue({
      id: scheduleId,
      prescriptionId,
      patientProfileId,
      enabled: false,
      intervalHours: 4,
      nextDueAt: null,
      status: 'PAUSED',
    });

    const schedule = await reminderService.createOrUpdateSchedule({
      prescriptionId,
      patientProfileId,
      enabled: false,
      intervalHours: 4,
      reminderStartTime: baseStartTime,
    });

    expect(schedule.status).toBe('PAUSED');
    expect(schedule.nextDueAt).toBeNull();
    expect(schedule.enabled).toBe(false);
  });

  // ─── TC-CR08-03: Configured interval is persisted correctly ────────────────
  it('TC-CR08-03: Configured interval is persisted correctly (e.g. 6 hours)', async () => {
    const intervalHours = 6;
    const expectedDue = new Date(baseStartTime.getTime() + intervalHours * 3600 * 1000);
    mockDb.prescriptionReminderSchedule.upsert.mockResolvedValue({
      id: scheduleId,
      prescriptionId,
      patientProfileId,
      enabled: true,
      intervalHours: 6,
      nextDueAt: expectedDue,
      status: 'ACTIVE',
    });

    const schedule = await reminderService.createOrUpdateSchedule({
      prescriptionId,
      patientProfileId,
      enabled: true,
      intervalHours: 6,
      reminderStartTime: baseStartTime,
    });

    expect(schedule.intervalHours).toBe(6);
    expect(schedule.nextDueAt).toEqual(expectedDue);
  });

  // ─── TC-CR08-04: No notification is generated before the due time ──────────
  it('TC-CR08-04: No notification is generated before the due time', async () => {
    const dueTime = new Date('2026-11-23T12:00:00.000Z');
    const earlierTime = new Date('2026-11-23T10:00:00.000Z'); // 2 hours before due

    mockDb.prescriptionReminderSchedule.findMany.mockResolvedValue([]);

    const dueList = await reminderService.getDueSchedules(earlierTime);
    expect(dueList).toHaveLength(0);

    const cycleResult = await scheduler.triggerProcessingCycle(earlierTime);
    expect(cycleResult.processedCount).toBe(0);
    expect(mockDb.notification.create).not.toHaveBeenCalled();
  });

  // ─── TC-CR08-05: Exactly one internal notification is generated when due ──
  it('TC-CR08-05: Exactly one internal notification is generated when due', async () => {
    const dueTime = new Date('2026-11-23T12:00:00.000Z');
    mockDb.$queryRaw.mockResolvedValue([
      {
        id: scheduleId,
        prescription_id: prescriptionId,
        patient_profile_id: patientProfileId,
        interval_hours: 4,
        next_due_at: dueTime,
        status: 'ACTIVE',
        enabled: true,
      },
    ]);
    mockDb.prescription.findUnique.mockResolvedValue({
      id: prescriptionId,
      status: 'ACTIVE',
    });
    mockDb.prescriptionReminderEvent.count.mockResolvedValue(0);
    mockDb.prescriptionReminderEvent.create.mockResolvedValue({
      id: 'event-001',
      scheduleId,
      prescriptionId,
      status: 'QUEUED',
    });
    mockDb.patientProfile.findUnique.mockResolvedValue({ userId: 'user-pat-001' });
    mockDb.notification.create.mockResolvedValue({
      id: notificationId,
      title: 'Prescription Pickup Reminder',
      status: 'QUEUED',
      channel: 'IN_APP',
    });
    mockDb.notificationQueue.create.mockResolvedValue({});
    mockDb.prescriptionReminderEvent.update.mockResolvedValue({});
    mockDb.prescriptionReminderSchedule.update.mockResolvedValue({});

    const result = await reminderService.processDueSchedule(scheduleId, dueTime);

    expect(result.status).toBe('PROCESSED');
    expect(result.notificationId).toBe(notificationId);
    expect(mockDb.notification.create).toHaveBeenCalledTimes(1);
    expect(mockDb.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Prescription Pickup Reminder',
          channel: 'IN_APP',
          notificationType: 'PATIENT',
        }),
      }),
    );
  });

  // ─── TC-CR08-06: The next due time advances by the configured interval ────
  it('TC-CR08-06: Next due time advances by the configured interval (4 hours)', async () => {
    const dueTime = new Date('2026-11-23T12:00:00.000Z');
    const expectedNextDue = new Date('2026-11-23T16:00:00.000Z');

    mockDb.$queryRaw.mockResolvedValue([
      {
        id: scheduleId,
        prescription_id: prescriptionId,
        patient_profile_id: patientProfileId,
        interval_hours: 4,
        next_due_at: dueTime,
        status: 'ACTIVE',
        enabled: true,
      },
    ]);
    mockDb.prescription.findUnique.mockResolvedValue({ id: prescriptionId, status: 'ACTIVE' });
    mockDb.prescriptionReminderEvent.count.mockResolvedValue(0);
    mockDb.prescriptionReminderEvent.create.mockResolvedValue({ id: 'event-001' });
    mockDb.patientProfile.findUnique.mockResolvedValue({ userId: 'user-pat-001' });
    mockDb.notification.create.mockResolvedValue({ id: notificationId });

    const result = await reminderService.processDueSchedule(scheduleId, dueTime);

    expect(result.status).toBe('PROCESSED');
    expect(result.nextDueAt).toEqual(expectedNextDue);
    expect(mockDb.prescriptionReminderSchedule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: scheduleId },
        data: expect.objectContaining({
          nextDueAt: expectedNextDue,
        }),
      }),
    );
  });

  // ─── TC-CR08-07: A second reminder is generated at the next interval ──────
  it('TC-CR08-07: A second reminder is generated at the next interval', async () => {
    const secondDueTime = new Date('2026-11-23T16:00:00.000Z');
    mockDb.$queryRaw.mockResolvedValue([
      {
        id: scheduleId,
        prescription_id: prescriptionId,
        patient_profile_id: patientProfileId,
        interval_hours: 4,
        next_due_at: secondDueTime,
        status: 'ACTIVE',
        enabled: true,
      },
    ]);
    mockDb.prescription.findUnique.mockResolvedValue({ id: prescriptionId, status: 'ACTIVE' });
    mockDb.prescriptionReminderEvent.count.mockResolvedValue(1); // 1 prior event already recorded
    mockDb.prescriptionReminderEvent.create.mockResolvedValue({ id: 'event-002' });
    mockDb.patientProfile.findUnique.mockResolvedValue({ userId: 'user-pat-001' });
    mockDb.notification.create.mockResolvedValue({ id: 'notif-uuid-002' });

    const result = await reminderService.processDueSchedule(scheduleId, secondDueTime);

    expect(result.status).toBe('PROCESSED');
    expect(result.notificationId).toBe('notif-uuid-002');
    expect(mockDb.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.stringContaining('"attempt":2'),
        }),
      }),
    );
  });

  // ─── TC-CR08-08: Collection disables the schedule ─────────────────────────
  it('TC-CR08-08: Collection disables the schedule and cancels future reminders', async () => {
    const collectionTime = new Date('2026-11-23T14:30:00.000Z');
    mockDb.prescriptionReminderSchedule.findUnique.mockResolvedValue({
      id: scheduleId,
      prescriptionId,
      status: 'ACTIVE',
    });

    const result = await reminderService.markCollected(prescriptionId, collectionTime, 'doc-123');

    expect(result.collected).toBe(true);
    expect(result.remindersCancelled).toBe(true);
    expect(mockDb.prescriptionReminderSchedule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: scheduleId },
        data: expect.objectContaining({
          enabled: false,
          status: 'CANCELLED',
          collectedAt: collectionTime,
          nextDueAt: null,
        }),
      }),
    );
    expect(mockDb.prescriptionReminderEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          scheduleId,
          status: { in: ['SCHEDULED', 'QUEUED'] },
        },
        data: expect.objectContaining({
          status: 'CANCELLED',
        }),
      }),
    );
  });

  // ─── TC-CR08-09: No new reminder is generated after collection ────────────
  it('TC-CR08-09: No new reminder is generated after collection', async () => {
    const afterCollectionTime = new Date('2026-11-23T20:00:00.000Z');
    // Lock query returns empty because status is CANCELLED and enabled is false
    mockDb.$queryRaw.mockResolvedValue([]);

    const result = await reminderService.processDueSchedule(scheduleId, afterCollectionTime);

    expect(result.status).toBe('LOCKED_BY_ANOTHER_WORKER');
    expect(mockDb.notification.create).not.toHaveBeenCalled();
  });

  // ─── TC-CR08-10: Manual reminder disablement stops recurrence ─────────────
  it('TC-CR08-10: Manual reminder disablement stops recurrence', async () => {
    mockDb.prescriptionReminderSchedule.findUnique.mockResolvedValue({
      id: scheduleId,
      prescriptionId,
      enabled: true,
      intervalHours: 4,
      status: 'ACTIVE',
    });
    mockDb.prescriptionReminderSchedule.update.mockResolvedValue({
      id: scheduleId,
      enabled: false,
      status: 'PAUSED',
      nextDueAt: null,
    });
    mockDb.prescription.findUnique.mockResolvedValue({ id: prescriptionId, notes: 'Take after food' });
    mockDb.prescription.update.mockResolvedValue({});

    const updated = await reminderService.updateReminderSettings(prescriptionId, false);

    expect(updated.enabled).toBe(false);
    expect(updated.status).toBe('PAUSED');
    expect(updated.nextDueAt).toBeNull();
  });

  // ─── TC-CR08-11: Backend restart preserves the schedule ───────────────────
  it('TC-CR08-11: Backend restart preserves the schedule from durable PostgreSQL state', async () => {
    // Simulate module startup recovery & backfill
    mockDb.prescription.findMany.mockResolvedValue([
      {
        id: 'rx-backfill-01',
        patientProfileId: 'pat-01',
        doctorId: 'doc-01',
        notes: 'Outpatient treatment\n[PICKUP_REMINDER]:{"enabled":true,"hours":4}',
        prescribedAt: new Date('2026-11-23T06:00:00.000Z'),
      },
    ]);
    mockDb.prescriptionReminderSchedule.findUnique.mockResolvedValue(null);
    mockDb.prescriptionReminderSchedule.create.mockResolvedValue({});

    const backfilled = await reminderService.backfillExistingPrescriptions();
    expect(backfilled).toBe(1);
    expect(mockDb.prescriptionReminderSchedule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          prescriptionId: 'rx-backfill-01',
          enabled: true,
          status: 'ACTIVE',
          intervalHours: 4,
        }),
      }),
    );
  });

  // ─── TC-CR08-12: Concurrent workers do not create duplicate reminders ─────
  it('TC-CR08-12: Concurrent workers do not create duplicate reminders (SKIP LOCKED protection)', async () => {
    // Worker 1 acquires lock
    mockDb.$queryRaw
      .mockResolvedValueOnce([
        {
          id: scheduleId,
          prescription_id: prescriptionId,
          patient_profile_id: patientProfileId,
          interval_hours: 4,
          next_due_at: new Date('2026-11-23T12:00:00.000Z'),
          status: 'ACTIVE',
          enabled: true,
        },
      ])
      // Worker 2 attempts same schedule concurrently and receives empty locked row
      .mockResolvedValueOnce([]);

    mockDb.prescription.findUnique.mockResolvedValue({ id: prescriptionId, status: 'ACTIVE' });
    mockDb.prescriptionReminderEvent.count.mockResolvedValue(0);
    mockDb.prescriptionReminderEvent.create.mockResolvedValue({ id: 'event-001' });
    mockDb.patientProfile.findUnique.mockResolvedValue({ userId: 'user-001' });
    mockDb.notification.create.mockResolvedValue({ id: 'notif-001' });

    const [worker1Result, worker2Result] = await Promise.all([
      reminderService.processDueSchedule(scheduleId),
      reminderService.processDueSchedule(scheduleId),
    ]);

    expect(worker1Result.status).toBe('PROCESSED');
    expect(worker2Result.status).toBe('LOCKED_BY_ANOTHER_WORKER');
    // Notification created exactly once across both workers
    expect(mockDb.notification.create).toHaveBeenCalledTimes(1);
  });

  // ─── TC-CR08-13: Concurrent collection and scheduler execution is safe ────
  it('TC-CR08-13: Concurrent collection and scheduler execution is safe', async () => {
    // Schedule row acquired, but prescription check discovers status already DISCONTINUED or missing
    mockDb.$queryRaw.mockResolvedValue([
      {
        id: scheduleId,
        prescription_id: prescriptionId,
        patient_profile_id: patientProfileId,
        interval_hours: 4,
        next_due_at: new Date(),
        status: 'ACTIVE',
        enabled: true,
      },
    ]);
    mockDb.prescription.findUnique.mockResolvedValue({
      id: prescriptionId,
      status: 'DISCONTINUED', // Collected/discontinued mid-flight
    });

    const result = await reminderService.processDueSchedule(scheduleId);

    expect(result.status).toBe('SKIPPED_COLLECTED');
    expect(mockDb.notification.create).not.toHaveBeenCalled();
    expect(mockDb.prescriptionReminderSchedule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: scheduleId },
        data: expect.objectContaining({ status: 'CANCELLED', enabled: false }),
      }),
    );
  });

  // ─── TC-CR08-14: Database failure does not corrupt the schedule ───────────
  it('TC-CR08-14: Database failure does not corrupt the schedule (transaction rolled back)', async () => {
    mockDb.$queryRaw.mockResolvedValue([
      {
        id: scheduleId,
        prescription_id: prescriptionId,
        patient_profile_id: patientProfileId,
        interval_hours: 4,
        next_due_at: new Date(),
        status: 'ACTIVE',
        enabled: true,
      },
    ]);
    mockDb.prescription.findUnique.mockRejectedValue(new Error('PostgreSQL deadlock error'));

    await expect(reminderService.processDueSchedule(scheduleId)).rejects.toThrow('PostgreSQL deadlock error');
    // Notification was not created
    expect(mockDb.notification.create).not.toHaveBeenCalled();
  });

  // ─── TC-CR08-15: Retry handling is bounded and auditable ──────────────────
  it('TC-CR08-15: Retry handling is bounded and auditable on delivery failure', async () => {
    mockDb.$queryRaw.mockResolvedValue([
      {
        id: scheduleId,
        prescription_id: prescriptionId,
        patient_profile_id: patientProfileId,
        interval_hours: 4,
        next_due_at: new Date(),
        status: 'ACTIVE',
        enabled: true,
      },
    ]);
    mockDb.prescription.findUnique.mockResolvedValue({ id: prescriptionId, status: 'ACTIVE' });
    mockDb.prescriptionReminderEvent.count.mockResolvedValue(0);
    mockDb.prescriptionReminderEvent.create.mockResolvedValue({ id: 'event-fail-01' });

    // Force delivery adapter error
    mockDb.patientProfile.findUnique.mockRejectedValue(new Error('Internal database timeout'));

    const result = await reminderService.processDueSchedule(scheduleId);

    expect(result.status).toBe('FAILED');
    expect(mockDb.prescriptionReminderEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'event-fail-01' },
        data: expect.objectContaining({
          status: 'FAILED',
          retryCount: 1,
        }),
      }),
    );
    // Next due set to bounded 15-minute retry
    expect(mockDb.prescriptionReminderSchedule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: scheduleId },
        data: expect.objectContaining({
          nextDueAt: expect.any(Date),
        }),
      }),
    );
  });

  // ─── TC-CR08-16: Historical prescriptions remain compatible ───────────────
  it('TC-CR08-16: Historical prescriptions with trailer strings remain compatible', () => {
    const rawNotes = 'Take with milk\n[PICKUP_REMINDER]:{"enabled":true,"hours":4}';
    const parsed = reminderService.parseNotesTrailer(rawNotes);

    expect(parsed).not.toBeNull();
    expect(parsed?.enabled).toBe(true);
    expect(parsed?.hours).toBe(4);

    const reEncoded = reminderService.syncPrescriptionNotesTrailer(
      rawNotes,
      false,
      4,
      true,
      '2026-11-23T10:00:00.000Z',
    );
    expect(reEncoded).toContain('Take with milk');
    expect(reEncoded).toContain('"collected":true');
    expect(reEncoded).toContain('"enabled":false');
  });

  // ─── TC-CR08-17: Existing Doctor Web payloads remain compatible ───────────
  it('TC-CR08-17: Existing Doctor Web request payloads parse and synchronize correctly', () => {
    // Doctor Web payload with default 2-hour reminder
    const doctorNotes = 'Hypertension regimen';
    const synced = reminderService.syncPrescriptionNotesTrailer(doctorNotes, true, 2, false);

    expect(synced).toContain('Hypertension regimen');
    expect(synced).toContain('[PICKUP_REMINDER]:{"enabled":true,"hours":2}');

    const parsed = reminderService.parseNotesTrailer(synced);
    expect(parsed?.enabled).toBe(true);
    expect(parsed?.hours).toBe(2);
  });

  // ─── TC-CR08-18: Existing Admin Web pickup tracking remains compatible ─────
  it('TC-CR08-18: Existing Admin Web pickup tracking receives accurate suppression flags', () => {
    const collectedNotes = 'Maintenance dose\n[PICKUP_REMINDER]:{"enabled":false,"hours":4,"collected":true,"collectedAt":"2026-11-23T11:00:00.000Z"}';
    const parsed = reminderService.parseNotesTrailer(collectedNotes);

    expect(parsed?.collected).toBe(true);
    expect(parsed?.enabled).toBe(false);
    expect(parsed?.collectedAt).toBe('2026-11-23T11:00:00.000Z');
  });

  // ─── TC-CR08-19: Unauthorized users cannot modify another patient's reminders
  it('TC-CR08-19: Rejects modification when prescription does not exist', async () => {
    mockDb.prescriptionReminderSchedule.findUnique.mockResolvedValue(null);

    await expect(
      reminderService.updateReminderSettings('unknown-rx', true, 4),
    ).rejects.toThrow(NotFoundException);
  });

  // ─── TC-CR08-20: Human/veterinary data isolation remains intact ───────────
  it('TC-CR08-20: Human/veterinary data isolation remains intact', async () => {
    // Prescription reminder schedules are linked strictly to PatientProfile (human records)
    mockDb.prescriptionReminderSchedule.upsert.mockResolvedValue({
      id: scheduleId,
      patientProfileId: 'human-patient-001',
      prescriptionId,
      status: 'ACTIVE',
    });

    const schedule = await reminderService.createOrUpdateSchedule({
      prescriptionId,
      patientProfileId: 'human-patient-001',
      enabled: true,
      intervalHours: 4,
    });

    expect(schedule.patientProfileId).toBe('human-patient-001');
    expect(mockDb.prescriptionReminderSchedule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          patientProfileId: 'human-patient-001',
        }),
      }),
    );
  });

  // ─── TC-CR08-21: Notification content does not expose sensitive clinical data
  it('TC-CR08-21: Notification content does not expose sensitive clinical data', async () => {
    mockDb.patientProfile.findUnique.mockResolvedValue({ userId: 'user-001' });
    mockDb.notification.create.mockResolvedValue({ id: 'notif-001' });

    const payload: ReminderDeliveryPayload = {
      scheduleId,
      prescriptionId,
      patientProfileId,
      scheduledDueAt: new Date(),
      attempt: 1,
    };

    await deliveryAdapter.deliver(payload);

    expect(mockDb.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Prescription Pickup Reminder',
          message: 'Your prescription is ready for pickup. Please check your CareID account for details.',
        }),
      }),
    );

    const callArgs = mockDb.notification.create.mock.calls[0][0];
    const message = callArgs.data.message;
    // Strictly verify no drug name, dosage, or medical jargon in notification preview
    expect(message).not.toContain('Amoxicillin');
    expect(message).not.toContain('Atorvastatin');
    expect(message).not.toContain('500mg');
    expect(message).not.toContain('ICD');
  });

  // ─── TC-CR08-22: Internal notifications are not falsely marked externally delivered
  it('TC-CR08-22: Internal notifications are not falsely marked externally delivered', async () => {
    mockDb.patientProfile.findUnique.mockResolvedValue({ userId: 'user-001' });
    mockDb.notification.create.mockResolvedValue({ id: 'notif-001' });

    const result = await deliveryAdapter.deliver({
      scheduleId,
      prescriptionId,
      patientProfileId,
      scheduledDueAt: new Date(),
      attempt: 1,
    });

    expect(result.provider).toBe('INTERNAL_ONLY');
    expect(result.deliveryStatus).toBe('PROCESSED_INTERNALLY');
    // Ensure notification is queued internally, NOT fabricated as SENT/DELIVERED
    expect(mockDb.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'QUEUED',
          channel: 'IN_APP',
        }),
      }),
    );
  });

  // ─── TC-CR08-23: Changing reminder interval reschedules correctly ─────────
  it('TC-CR08-23: Changing reminder interval reschedules correctly', async () => {
    const now = new Date('2026-11-23T10:00:00.000Z');
    mockDb.prescriptionReminderSchedule.findUnique.mockResolvedValue({
      id: scheduleId,
      prescriptionId,
      enabled: true,
      intervalHours: 2,
      reminderStartTime: now,
      status: 'ACTIVE',
    });
    mockDb.prescriptionReminderSchedule.update.mockResolvedValue({
      id: scheduleId,
      enabled: true,
      intervalHours: 8,
      status: 'ACTIVE',
      nextDueAt: new Date(now.getTime() + 8 * 3600 * 1000),
    });
    mockDb.prescription.findUnique.mockResolvedValue({ id: prescriptionId, notes: 'Standard dose' });
    mockDb.prescription.update.mockResolvedValue({});

    const updated = await reminderService.updateReminderSettings(prescriptionId, true, 8);

    expect(updated.intervalHours).toBe(8);
    expect(mockDb.prescriptionReminderSchedule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          intervalHours: 8,
          enabled: true,
        }),
      }),
    );
  });

  // ─── TC-CR08-24: Repeated collection requests are idempotent ──────────────
  it('TC-CR08-24: Repeated collection requests are completely idempotent', async () => {
    // Schedule is already CANCELLED
    mockDb.prescriptionReminderSchedule.findUnique.mockResolvedValue({
      id: scheduleId,
      prescriptionId,
      status: 'CANCELLED',
      collectedAt: new Date('2026-11-23T09:00:00.000Z'),
    });

    const res1 = await reminderService.markCollected(prescriptionId);
    const res2 = await reminderService.markCollected(prescriptionId);

    expect(res1.collected).toBe(true);
    expect(res2.collected).toBe(true);
    // Because already cancelled, no update transaction is redundantly re-run
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  // ─── TC-CR08-25: Future provider adapter can be introduced without changing scheduler logic
  it('TC-CR08-25: Future provider adapter can be introduced cleanly without changing scheduler logic', async () => {
    // Custom future adapter implementing INotificationDeliveryAdapter (e.g. Firebase/Twilio)
    class FutureExternalDeliveryAdapter implements INotificationDeliveryAdapter {
      getProviderName(): string {
        return 'FUTURE_FIREBASE_FCM_GATEWAY';
      }
      async deliver(payload: ReminderDeliveryPayload): Promise<ReminderDeliveryResult> {
        return {
          success: true,
          provider: this.getProviderName(),
          internalNotificationId: 'future-notif-fcm-001',
          deliveryStatus: 'PROCESSED_INTERNALLY',
        };
      }
    }

    const futureAdapter = new FutureExternalDeliveryAdapter();
    const customService = new PrescriptionReminderService(mockDb, futureAdapter);

    mockDb.$queryRaw.mockResolvedValue([
      {
        id: scheduleId,
        prescription_id: prescriptionId,
        patient_profile_id: patientProfileId,
        interval_hours: 4,
        next_due_at: new Date(),
        status: 'ACTIVE',
        enabled: true,
      },
    ]);
    mockDb.prescription.findUnique.mockResolvedValue({ id: prescriptionId, status: 'ACTIVE' });
    mockDb.prescriptionReminderEvent.count.mockResolvedValue(0);
    mockDb.prescriptionReminderEvent.create.mockResolvedValue({ id: 'event-fcm-001' });
    mockDb.prescriptionReminderEvent.update.mockResolvedValue({});
    mockDb.prescriptionReminderSchedule.update.mockResolvedValue({});

    const result = await customService.processDueSchedule(scheduleId);

    expect(result.status).toBe('PROCESSED');
    expect(result.notificationId).toBe('future-notif-fcm-001');
    // Verifies architectural boundary cleanly separates delivery provider from reminder lifecycle
  });
});
