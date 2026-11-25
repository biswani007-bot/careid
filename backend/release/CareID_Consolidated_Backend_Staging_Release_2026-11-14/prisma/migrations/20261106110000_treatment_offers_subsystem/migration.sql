-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TreatmentOfferStatus') THEN
    CREATE TYPE "TreatmentOfferStatus" AS ENUM ('DRAFT', 'DISPATCHED', 'PATIENT_REVIEWING', 'RATIFIED_ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProcedureCategory') THEN
    CREATE TYPE "ProcedureCategory" AS ENUM ('SURGICAL', 'DIAGNOSTIC', 'ANESTHESIA', 'ROOM_SUITE', 'MEDICATION', 'DEVICE_IMPLANT', 'OTHER');
  END IF;
END $$;

-- CreateTable treatment_offers
CREATE TABLE IF NOT EXISTS "treatment_offers" (
    "id" TEXT NOT NULL,
    "offer_number" TEXT NOT NULL,
    "doctor_profile_id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "encounter_id" TEXT,
    "clinical_indication" TEXT NOT NULL,
    "gross_estimate" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_payable" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'PKR',
    "financing_eligible" BOOLEAN NOT NULL DEFAULT false,
    "recommended_tenure_months" INTEGER,
    "status" "TreatmentOfferStatus" NOT NULL DEFAULT 'DRAFT',
    "valid_until" TIMESTAMP(3) NOT NULL,
    "dispatched_at" TIMESTAMP(3),
    "patient_viewed_at" TIMESTAMP(3),
    "patient_responded_at" TIMESTAMP(3),
    "patient_response_notes" TEXT,
    "cancellation_reason" TEXT,
    "clinical_notes" TEXT,
    "terms_and_conditions" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable treatment_offer_procedures
CREATE TABLE IF NOT EXISTS "treatment_offer_procedures" (
    "id" TEXT NOT NULL,
    "treatment_offer_id" TEXT NOT NULL,
    "procedure_code" TEXT NOT NULL,
    "procedure_name" TEXT NOT NULL,
    "category" "ProcedureCategory" NOT NULL DEFAULT 'SURGICAL',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_cost" DECIMAL(12,2) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "sequence_order" INTEGER NOT NULL DEFAULT 0,
    "clinical_justification" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_offer_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable treatment_offer_history
CREATE TABLE IF NOT EXISTS "treatment_offer_history" (
    "id" TEXT NOT NULL,
    "treatment_offer_id" TEXT NOT NULL,
    "previous_status" "TreatmentOfferStatus",
    "new_status" "TreatmentOfferStatus" NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT NOT NULL,
    "performer_role" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatment_offer_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable financing_offers
CREATE TABLE IF NOT EXISTS "financing_offers" (
    "id" TEXT NOT NULL,
    "offer_number" TEXT NOT NULL,
    "treatment_offer_id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "partner_name" TEXT NOT NULL,
    "credit_tier" TEXT,
    "max_approved_amount" DECIMAL(12,2) NOT NULL,
    "min_down_payment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tenure_months" INTEGER[],
    "interest_rate" DECIMAL(5,2) NOT NULL,
    "processing_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financing_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "treatment_offers_offer_number_key" ON "treatment_offers"("offer_number");
CREATE INDEX IF NOT EXISTS "treatment_offers_doctor_profile_id_status_idx" ON "treatment_offers"("doctor_profile_id", "status");
CREATE INDEX IF NOT EXISTS "treatment_offers_patient_profile_id_status_idx" ON "treatment_offers"("patient_profile_id", "status");
CREATE INDEX IF NOT EXISTS "treatment_offers_facility_id_status_idx" ON "treatment_offers"("facility_id", "status");
CREATE INDEX IF NOT EXISTS "treatment_offers_valid_until_status_idx" ON "treatment_offers"("valid_until", "status");

CREATE INDEX IF NOT EXISTS "treatment_offer_procedures_treatment_offer_id_sequence_orde_idx" ON "treatment_offer_procedures"("treatment_offer_id", "sequence_order");
CREATE INDEX IF NOT EXISTS "treatment_offer_history_treatment_offer_id_created_at_idx" ON "treatment_offer_history"("treatment_offer_id", "created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "financing_offers_offer_number_key" ON "financing_offers"("offer_number");
CREATE INDEX IF NOT EXISTS "financing_offers_treatment_offer_id_idx" ON "financing_offers"("treatment_offer_id");
CREATE INDEX IF NOT EXISTS "financing_offers_patient_profile_id_status_idx" ON "financing_offers"("patient_profile_id", "status");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'treatment_offers_doctor_profile_id_fkey') THEN
    ALTER TABLE "treatment_offers" ADD CONSTRAINT "treatment_offers_doctor_profile_id_fkey" FOREIGN KEY ("doctor_profile_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'treatment_offers_patient_profile_id_fkey') THEN
    ALTER TABLE "treatment_offers" ADD CONSTRAINT "treatment_offers_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'treatment_offers_facility_id_fkey') THEN
    ALTER TABLE "treatment_offers" ADD CONSTRAINT "treatment_offers_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'treatment_offers_encounter_id_fkey') THEN
    ALTER TABLE "treatment_offers" ADD CONSTRAINT "treatment_offers_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "medical_encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'treatment_offer_procedures_treatment_offer_id_fkey') THEN
    ALTER TABLE "treatment_offer_procedures" ADD CONSTRAINT "treatment_offer_procedures_treatment_offer_id_fkey" FOREIGN KEY ("treatment_offer_id") REFERENCES "treatment_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'treatment_offer_history_treatment_offer_id_fkey') THEN
    ALTER TABLE "treatment_offer_history" ADD CONSTRAINT "treatment_offer_history_treatment_offer_id_fkey" FOREIGN KEY ("treatment_offer_id") REFERENCES "treatment_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financing_offers_treatment_offer_id_fkey') THEN
    ALTER TABLE "financing_offers" ADD CONSTRAINT "financing_offers_treatment_offer_id_fkey" FOREIGN KEY ("treatment_offer_id") REFERENCES "treatment_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financing_offers_patient_profile_id_fkey') THEN
    ALTER TABLE "financing_offers" ADD CONSTRAINT "financing_offers_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

