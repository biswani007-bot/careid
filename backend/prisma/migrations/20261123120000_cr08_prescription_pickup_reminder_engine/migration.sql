-- CreateEnum
CREATE TYPE "ReminderScheduleStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReminderEventStatus" AS ENUM ('SCHEDULED', 'QUEUED', 'PROCESSED_INTERNALLY', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE IF NOT EXISTS "prescription_reminder_schedules" (
    "id" TEXT NOT NULL,
    "prescription_id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "doctor_id" TEXT,
    "facility_id" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "interval_hours" INTEGER NOT NULL DEFAULT 4,
    "reminder_start_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "next_due_at" TIMESTAMP(3),
    "last_processed_at" TIMESTAMP(3),
    "collected_at" TIMESTAMP(3),
    "status" "ReminderScheduleStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescription_reminder_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "prescription_reminder_events" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "prescription_id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "scheduled_due_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),
    "notification_id" TEXT,
    "status" "ReminderEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescription_reminder_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "prescription_reminder_schedules_prescription_id_key" ON "prescription_reminder_schedules"("prescription_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "prescription_reminder_schedules_status_next_due_at_idx" ON "prescription_reminder_schedules"("status", "next_due_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "prescription_reminder_schedules_patient_profile_id_idx" ON "prescription_reminder_schedules"("patient_profile_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "prescription_reminder_events_schedule_id_status_idx" ON "prescription_reminder_events"("schedule_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "prescription_reminder_events_prescription_id_idx" ON "prescription_reminder_events"("prescription_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "prescription_reminder_events_patient_profile_id_idx" ON "prescription_reminder_events"("patient_profile_id");

-- AddForeignKey
ALTER TABLE "prescription_reminder_schedules" ADD CONSTRAINT "prescription_reminder_schedules_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_reminder_schedules" ADD CONSTRAINT "prescription_reminder_schedules_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_reminder_events" ADD CONSTRAINT "prescription_reminder_events_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "prescription_reminder_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_reminder_events" ADD CONSTRAINT "prescription_reminder_events_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
