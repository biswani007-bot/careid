# CAREID-CR08-BACKEND-REMINDER-001: Implementation Report
## Option A — Complete Internal Recurring Prescription Pickup Reminder Engine

### 1. Executive Summary
Under approved Change Request **CR-08** and the client-authorized **Option A** implementation decision, the backend has implemented the complete internal recurring prescription pickup reminder engine. The engine provides durable relational data modeling, scheduled background evaluation, atomic concurrency-safe processing, internal notification generation, audit trail logging, and collection-based cancellation. External telecommunications and push delivery gateways (Twilio, Firebase Cloud Messaging, SendGrid) are intentionally deferred per Option A approval.

---

### 2. Architecture & Data Model

#### 2.1 Prisma Schema & Database Models
An additive, non-destructive migration (`20261123120000_cr08_prescription_pickup_reminder_engine`) was deployed to `careid_integration_db` without modifying existing columns or breaking existing clinical records.

```prisma
enum ReminderScheduleStatus {
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED
}

enum ReminderEventStatus {
  SCHEDULED
  QUEUED
  PROCESSED_INTERNALLY
  FAILED
  CANCELLED
}

model PrescriptionReminderSchedule {
  id                String                 @id @default(uuid())
  prescriptionId    String                 @unique @map("prescription_id")
  patientProfileId  String                 @map("patient_profile_id")
  doctorId          String?                @map("doctor_id")
  facilityId        String?                @map("facility_id")
  enabled           Boolean                @default(true)
  intervalHours     Int                    @default(4) @map("interval_hours")
  reminderStartTime DateTime               @default(now()) @map("reminder_start_time")
  nextDueAt         DateTime?              @map("next_due_at")
  lastProcessedAt   DateTime?              @map("last_processed_at")
  collectedAt       DateTime?              @map("collected_at")
  status            ReminderScheduleStatus @default(ACTIVE)
  createdAt         DateTime               @default(now()) @map("created_at")
  updatedAt         DateTime               @updatedAt @map("updated_at")

  prescription      Prescription           @relation(fields: [prescriptionId], references: [id], onDelete: Cascade)
  patientProfile    PatientProfile         @relation(fields: [patientProfileId], references: [id], onDelete: Cascade)
  events            PrescriptionReminderEvent[]

  @@index([status, nextDueAt])
  @@index([patientProfileId])
  @@map("prescription_reminder_schedules")
}

model PrescriptionReminderEvent {
  id               String                       @id @default(uuid())
  scheduleId       String                       @map("schedule_id")
  prescriptionId   String                       @map("prescription_id")
  patientProfileId String                       @map("patient_profile_id")
  scheduledDueAt   DateTime                     @map("scheduled_due_at")
  processedAt      DateTime?                    @map("processed_at")
  notificationId   String?                      @map("notification_id")
  status           ReminderEventStatus          @default(SCHEDULED)
  retryCount       Int                          @default(0) @map("retry_count")
  failureReason    String?                      @map("failure_reason")
  createdAt        DateTime                     @default(now()) @map("created_at")

  schedule         PrescriptionReminderSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  notification     Notification?                @relation(fields: [notificationId], references: [id], onDelete: SetNull)

  @@index([scheduleId, status])
  @@index([prescriptionId])
  @@index([patientProfileId])
  @@map("prescription_reminder_events")
}
```

#### 2.2 Relational Synchronization with Compatibility Notes
For backward compatibility with existing Doctor Web (`PrescriptionsPage.tsx`) and Admin Web (`AdminPrescriptionPickupDashboard.tsx`), the serialized metadata trailer in `prescription.notes` is deterministically synchronized on every schedule creation, configuration change, and collection event:
- Active: `[PICKUP_REMINDER]:{"enabled":true,"hours":4}`
- Collected: `[PICKUP_REMINDER]:{"enabled":false,"hours":4,"collected":true,"collectedAt":"2026-11-23T07:15:43.233Z"}`

---

### 3. Subsystem Implementation Details

#### 3.1 `PrescriptionReminderService`
Located at `src/modules/prescription/prescription-reminder.service.ts`:
- **`createOrUpdateSchedule`**: Establishes schedule with `status: ACTIVE`, computes `nextDueAt = reminderStartTime + intervalHours`.
- **`updateReminderSettings`**: Allows adjusting interval (1–24h) or disabling reminders (`status: PAUSED`, `nextDueAt: null`).
- **`markCollected`**: Idempotent cancellation routine. Sets schedule `status: CANCELLED`, sets `collectedAt`, cancels any pending events, and records audit logs.
- **`processDueSchedule`**: Processes a due schedule under a PostgreSQL atomic row-lock (`FOR UPDATE SKIP LOCKED`), ensuring zero duplicates across concurrent workers.
- **`backfillExistingPrescriptions`**: Bootstraps historical prescriptions that have `[PICKUP_REMINDER]` metadata into canonical database schedules.

#### 3.2 `PrescriptionReminderScheduler`
Located at `src/modules/prescription/prescription-reminder.scheduler.ts`:
- Implements `OnModuleInit` and `OnModuleDestroy`.
- Runs a background evaluation loop every 30 seconds (configurable via `PRESCRIPTION_REMINDER_POLL_INTERVAL_MS`).
- Invokes `triggerProcessingCycle()`, finding active schedules where `nextDueAt <= NOW()`.
- Automatically resumes after backend restarts by reading durable schedule records from PostgreSQL.

#### 3.3 `InternalOnlyDeliveryAdapter`
Located at `src/modules/prescription/adapters/notification-delivery.adapter.ts`:
- Implements `INotificationDeliveryAdapter`.
- Generates durable in-app notifications in `notifications` and `notification_queues`.
- Sets `channel: 'IN_APP'`, `status: 'QUEUED'`, `notificationType: 'PATIENT'`.
- Content: `"Your prescription is ready for pickup. Please check your CareID account for details."` (zero clinical PHI or medication details exposed in notification copy).
- Returns honest status `PROCESSED_INTERNALLY`. Does not fabricate external delivery receipts.

---

### 4. Modified & New Files in Backend

| File Path | Type | Role |
| :--- | :--- | :--- |
| `prisma/schema.prisma` | Modified | Added `PrescriptionReminderSchedule`, `PrescriptionReminderEvent`, and related relations/enums |
| `prisma/migrations/20261123120000_cr08_prescription_pickup_reminder_engine/migration.sql` | Created | Additive PostgreSQL migration for CR-08 tables, enums, indices, and constraints |
| `src/modules/prescription/adapters/notification-delivery.adapter.ts` | Created | Option A delivery adapter and provider boundary |
| `src/modules/prescription/prescription-reminder.service.ts` | Created | Core reminder business logic, atomic row-lock processing, and notes trailer synchronization |
| `src/modules/prescription/prescription-reminder.scheduler.ts` | Created | Periodic background scheduler with restart recovery and concurrency safety |
| `src/modules/prescription/prescription.module.ts` | Modified | Registered new services, providers, scheduler, and delivery adapter |
| `src/modules/prescription/prescription.repository.ts` | Modified | Included `reminderSchedule` relation in prescription queries and updates |
| `src/modules/prescription/prescription.service.ts` | Modified | Integrated reminder schedule creation, notes synchronization, and collection cancellation |
| `src/modules/prescription/prescription.controller.ts` | Modified | Added `PATCH /prescriptions/:id/reminder` endpoint for reminder configuration |
| `src/modules/doctor/infrastructure/database/doctor.repository.ts` | Modified | Synchronized reminder schedule cancellation in doctor repository `updatePrescription` |
| `src/modules/prescription/tests/prescription-reminder-cr08.spec.ts` | Created | Complete automated test suite covering all 25 test cases (TC-CR08-01 through TC-CR08-25) |
| `scripts/verify-cr08-reminder-engine.ts` | Created | Live HTTP integration verification script testing real API endpoints against live PostgreSQL |
