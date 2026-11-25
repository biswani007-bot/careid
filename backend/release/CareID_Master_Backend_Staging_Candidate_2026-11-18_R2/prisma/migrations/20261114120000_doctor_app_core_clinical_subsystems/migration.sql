-- AlterEnum: Expand AttachmentCategory with Doctor App Clinical Subcategories
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'GENERAL_MEDICAL_REPORT';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'MEDICAL_CERTIFICATE';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'DISCHARGE_SUMMARY';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'OTHER_MEDICAL';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'DENTAL_REPORT';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'DENTAL_IMAGING';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'DENTAL_XRAY';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'DENTAL_TREATMENT_RECORD';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'DENTAL_PRESCRIPTION';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'VISION_EXAMINATION';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'EYE_TEST_REPORT';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'RETINAL_IMAGING';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'OPTICAL_PRESCRIPTION';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'CONTACT_LENS_RECORD';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'PET_HEALTH_RECORD';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'PET_VACCINATION_RECORD';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'DOCTOR_CREDENTIAL';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'INSURANCE_DOCUMENT';
ALTER TYPE "AttachmentCategory" ADD VALUE IF NOT EXISTS 'REFERRAL_ATTACHMENT';

-- AlterTable: medical_attachments (Linkage to Dental & Vision records)
ALTER TABLE "medical_attachments" ADD COLUMN IF NOT EXISTS "dental_record_id" TEXT;
ALTER TABLE "medical_attachments" ADD COLUMN IF NOT EXISTS "vision_record_id" TEXT;

-- CreateTable: medical_record_addenda
CREATE TABLE IF NOT EXISTS "medical_record_addenda" (
    "id" TEXT NOT NULL,
    "medical_record_id" TEXT NOT NULL,
    "author_doctor_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "addendum_notes" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_record_addenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable: dental_records
CREATE TABLE IF NOT EXISTS "dental_records" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "tooth_number" TEXT,
    "tooth_surface" TEXT,
    "procedure_name" TEXT NOT NULL,
    "procedure_code" TEXT,
    "clinical_findings" TEXT,
    "treatment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "follow_up_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dental_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable: vision_records
CREATE TABLE IF NOT EXISTS "vision_records" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "examination_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "od_sphere" DOUBLE PRECISION,
    "od_cylinder" DOUBLE PRECISION,
    "od_axis" INTEGER,
    "od_addition" DOUBLE PRECISION,
    "od_visual_acuity" TEXT,
    "od_iop_mm_hg" DOUBLE PRECISION,
    "os_sphere" DOUBLE PRECISION,
    "os_cylinder" DOUBLE PRECISION,
    "os_axis" INTEGER,
    "os_addition" DOUBLE PRECISION,
    "os_visual_acuity" TEXT,
    "os_iop_mm_hg" DOUBLE PRECISION,
    "contact_lens_base_curve" DOUBLE PRECISION,
    "contact_lens_diameter" DOUBLE PRECISION,
    "clinical_notes" TEXT,
    "recommendations" TEXT,
    "status" TEXT NOT NULL DEFAULT 'FINAL',
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vision_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable: laboratory_reports
CREATE TABLE IF NOT EXISTS "laboratory_reports" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "doctor_id" TEXT,
    "laboratory_name" TEXT NOT NULL,
    "specimen_type" TEXT,
    "collected_date" TIMESTAMP(3) NOT NULL,
    "reported_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'FINAL',
    "overall_notes" TEXT,
    "attachment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "laboratory_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable: laboratory_test_items
CREATE TABLE IF NOT EXISTS "laboratory_test_items" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "test_name" TEXT NOT NULL,
    "test_category" TEXT,
    "numeric_value" DOUBLE PRECISION,
    "text_value" TEXT,
    "unit" TEXT,
    "reference_range" TEXT NOT NULL,
    "reference_low" DOUBLE PRECISION,
    "reference_high" DOUBLE PRECISION,
    "flag" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',

    CONSTRAINT "laboratory_test_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: prescriptions
CREATE TABLE IF NOT EXISTS "prescriptions" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "diagnosis_code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "discontinue_reason" TEXT,
    "notes" TEXT,
    "prescribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: prescription_items
CREATE TABLE IF NOT EXISTS "prescription_items" (
    "id" TEXT NOT NULL,
    "prescription_id" TEXT NOT NULL,
    "drug_name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "route" TEXT NOT NULL DEFAULT 'ORAL',
    "frequency" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "instructions" TEXT,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: prescription_refills
CREATE TABLE IF NOT EXISTS "prescription_refills" (
    "id" TEXT NOT NULL,
    "prescription_id" TEXT NOT NULL,
    "refill_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refill_number" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "prescription_refills_pkey" PRIMARY KEY ("id")
);

-- CreateTable: conversations
CREATE TABLE IF NOT EXISTS "conversations" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "facility_id" TEXT,
    "subject" TEXT,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: direct_messages
CREATE TABLE IF NOT EXISTS "direct_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_user_id" TEXT NOT NULL,
    "sender_role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachment_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: record_share_grants
CREATE TABLE IF NOT EXISTS "record_share_grants" (
    "id" TEXT NOT NULL,
    "medical_record_id" TEXT NOT NULL,
    "granted_by_doctor_id" TEXT NOT NULL,
    "recipient_type" TEXT NOT NULL,
    "recipient_target" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "share_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_share_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "medical_record_addenda_medical_record_id_created_at_idx" ON "medical_record_addenda"("medical_record_id", "created_at");
CREATE INDEX IF NOT EXISTS "dental_records_patient_profile_id_treatment_date_idx" ON "dental_records"("patient_profile_id", "treatment_date");
CREATE INDEX IF NOT EXISTS "vision_records_patient_profile_id_examination_date_idx" ON "vision_records"("patient_profile_id", "examination_date");
CREATE INDEX IF NOT EXISTS "laboratory_reports_patient_profile_id_reported_date_idx" ON "laboratory_reports"("patient_profile_id", "reported_date");
CREATE INDEX IF NOT EXISTS "laboratory_test_items_report_id_idx" ON "laboratory_test_items"("report_id");
CREATE INDEX IF NOT EXISTS "prescriptions_patient_profile_id_prescribed_at_idx" ON "prescriptions"("patient_profile_id", "prescribed_at");
CREATE INDEX IF NOT EXISTS "prescriptions_doctor_id_prescribed_at_idx" ON "prescriptions"("doctor_id", "prescribed_at");
CREATE INDEX IF NOT EXISTS "prescription_items_prescription_id_idx" ON "prescription_items"("prescription_id");
CREATE INDEX IF NOT EXISTS "prescription_refills_prescription_id_idx" ON "prescription_refills"("prescription_id");
CREATE INDEX IF NOT EXISTS "conversations_patient_profile_id_last_message_at_idx" ON "conversations"("patient_profile_id", "last_message_at");
CREATE INDEX IF NOT EXISTS "conversations_doctor_id_last_message_at_idx" ON "conversations"("doctor_id", "last_message_at");
CREATE INDEX IF NOT EXISTS "direct_messages_conversation_id_created_at_idx" ON "direct_messages"("conversation_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "record_share_grants_share_token_key" ON "record_share_grants"("share_token");
CREATE INDEX IF NOT EXISTS "record_share_grants_medical_record_id_idx" ON "record_share_grants"("medical_record_id");
CREATE INDEX IF NOT EXISTS "record_share_grants_share_token_idx" ON "record_share_grants"("share_token");

-- Foreign Keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medical_attachments_dental_record_id_fkey') THEN
        ALTER TABLE "medical_attachments" ADD CONSTRAINT "medical_attachments_dental_record_id_fkey" FOREIGN KEY ("dental_record_id") REFERENCES "dental_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medical_attachments_vision_record_id_fkey') THEN
        ALTER TABLE "medical_attachments" ADD CONSTRAINT "medical_attachments_vision_record_id_fkey" FOREIGN KEY ("vision_record_id") REFERENCES "vision_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medical_record_addenda_medical_record_id_fkey') THEN
        ALTER TABLE "medical_record_addenda" ADD CONSTRAINT "medical_record_addenda_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dental_records_patient_profile_id_fkey') THEN
        ALTER TABLE "dental_records" ADD CONSTRAINT "dental_records_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vision_records_patient_profile_id_fkey') THEN
        ALTER TABLE "vision_records" ADD CONSTRAINT "vision_records_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'laboratory_reports_patient_profile_id_fkey') THEN
        ALTER TABLE "laboratory_reports" ADD CONSTRAINT "laboratory_reports_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'laboratory_reports_attachment_id_fkey') THEN
        ALTER TABLE "laboratory_reports" ADD CONSTRAINT "laboratory_reports_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "medical_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'laboratory_test_items_report_id_fkey') THEN
        ALTER TABLE "laboratory_test_items" ADD CONSTRAINT "laboratory_test_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "laboratory_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prescriptions_patient_profile_id_fkey') THEN
        ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prescriptions_doctor_id_fkey') THEN
        ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prescription_items_prescription_id_fkey') THEN
        ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prescription_refills_prescription_id_fkey') THEN
        ALTER TABLE "prescription_refills" ADD CONSTRAINT "prescription_refills_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_patient_profile_id_fkey') THEN
        ALTER TABLE "conversations" ADD CONSTRAINT "conversations_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_doctor_id_fkey') THEN
        ALTER TABLE "conversations" ADD CONSTRAINT "conversations_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'direct_messages_conversation_id_fkey') THEN
        ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'record_share_grants_medical_record_id_fkey') THEN
        ALTER TABLE "record_share_grants" ADD CONSTRAINT "record_share_grants_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

