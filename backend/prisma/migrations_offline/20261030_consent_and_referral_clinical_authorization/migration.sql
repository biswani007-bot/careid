-- AlterTable
-- CareID Schema Migration: Add explicit clinical authorization fields to security_consent_records
-- Decouples clinical access from capturedBy; introduces explicit authorizedDoctorId and authorizedFacilityId.
-- Introduces accessScope to enforce clinical data boundaries (defaults to 'ALL' for consent).
ALTER TABLE "security_consent_records" ADD COLUMN IF NOT EXISTS "authorized_doctor_id" TEXT;
ALTER TABLE "security_consent_records" ADD COLUMN IF NOT EXISTS "authorized_facility_id" TEXT;
ALTER TABLE "security_consent_records" ADD COLUMN IF NOT EXISTS "access_scope" TEXT NOT NULL DEFAULT 'ALL';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "security_consent_records_patient_id_status_authorized_doctor_id_idx"
  ON "security_consent_records"("patient_id", "status", "authorized_doctor_id");

CREATE INDEX IF NOT EXISTS "security_consent_records_patient_id_status_authorized_facility_id_idx"
  ON "security_consent_records"("patient_id", "status", "authorized_facility_id");

-- AlterTable
-- CareID Schema Migration: Add accessScope to patient_referrals to prevent unrestricted EHR access.
-- Defaults to 'REFERRAL_ONLY' to ensure legacy referrals do not inherit broad access.
ALTER TABLE "patient_referrals" ADD COLUMN IF NOT EXISTS "access_scope" TEXT NOT NULL DEFAULT 'REFERRAL_ONLY';

