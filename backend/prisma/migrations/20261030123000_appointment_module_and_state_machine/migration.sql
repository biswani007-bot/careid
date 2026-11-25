-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AppointmentStatus') THEN
    CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW');
  END IF;
END $$;

-- AlterEnum
ALTER TYPE "SlotStatus" ADD VALUE IF NOT EXISTS 'BOOKED';

-- CreateTable
CREATE TABLE IF NOT EXISTS "appointments" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "appointment_number" TEXT NOT NULL,
  "patient_profile_id" TEXT NOT NULL,
  "doctor_profile_id" TEXT NOT NULL,
  "facility_id" TEXT,
  "schedule_id" TEXT,
  "slot_id" TEXT,
  "appointment_date" TIMESTAMP(3) NOT NULL,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL,
  "duration_minutes" INTEGER NOT NULL DEFAULT 15,
  "type" TEXT NOT NULL DEFAULT 'IN_PERSON',
  "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
  "reason" TEXT,
  "notes" TEXT,
  "booked_by" TEXT,
  "cancelled_at" TIMESTAMP(3),
  "cancellation_reason" TEXT,
  "cancelled_by" TEXT,
  "rescheduled_from_id" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_appointment_number_key" ON "appointments"("appointment_number");
CREATE INDEX IF NOT EXISTS "appointments_patient_profile_id_appointment_date_idx" ON "appointments"("patient_profile_id", "appointment_date");
CREATE INDEX IF NOT EXISTS "appointments_doctor_profile_id_appointment_date_idx" ON "appointments"("doctor_profile_id", "appointment_date");
CREATE INDEX IF NOT EXISTS "appointments_facility_id_appointment_date_idx" ON "appointments"("facility_id", "appointment_date");
CREATE INDEX IF NOT EXISTS "appointments_slot_id_idx" ON "appointments"("slot_id");
CREATE INDEX IF NOT EXISTS "appointments_status_idx" ON "appointments"("status");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_patient_profile_id_fkey') THEN
    ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_doctor_profile_id_fkey') THEN
    ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_profile_id_fkey" FOREIGN KEY ("doctor_profile_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_facility_id_fkey') THEN
    ALTER TABLE "appointments" ADD CONSTRAINT "appointments_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_schedule_id_fkey') THEN
    ALTER TABLE "appointments" ADD CONSTRAINT "appointments_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_slot_id_fkey') THEN
    ALTER TABLE "appointments" ADD CONSTRAINT "appointments_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "generated_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_rescheduled_from_id_fkey') THEN
    ALTER TABLE "appointments" ADD CONSTRAINT "appointments_rescheduled_from_id_fkey" FOREIGN KEY ("rescheduled_from_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

