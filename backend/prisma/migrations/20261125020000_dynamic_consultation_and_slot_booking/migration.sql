-- Migration: 20261125020000_dynamic_consultation_and_slot_booking
-- Formalizes procedure_catalogue and adds facility_procedure_prices, financing_packages, and appointment_policies

-- 1. Ensure procedure_catalogue exists and has all required columns
CREATE TABLE IF NOT EXISTS "procedure_catalogue" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "standard_charge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rvu" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "is_official_cpt" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procedure_catalogue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "procedure_catalogue_code_key" ON "procedure_catalogue"("code");
CREATE INDEX IF NOT EXISTS "idx_procedure_catalogue_category" ON "procedure_catalogue"("category");
CREATE INDEX IF NOT EXISTS "idx_procedure_catalogue_code" ON "procedure_catalogue"("code");
CREATE INDEX IF NOT EXISTS "idx_procedure_catalogue_status" ON "procedure_catalogue"("status");

-- 2. Facility Procedure Prices table (Facility Chargemaster overrides)
CREATE TABLE IF NOT EXISTS "facility_procedure_prices" (
    "id" TEXT NOT NULL,
    "procedure_id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facility_procedure_prices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_fpp_procedure" FOREIGN KEY ("procedure_id") REFERENCES "procedure_catalogue"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_fpp_facility" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "facility_procedure_prices_procedure_id_facility_id_effective_from_key"
    ON "facility_procedure_prices"("procedure_id", "facility_id", "effective_from");
CREATE INDEX IF NOT EXISTS "facility_procedure_prices_facility_id_procedure_id_idx"
    ON "facility_procedure_prices"("facility_id", "procedure_id");

-- 3. Financing Packages table
CREATE TABLE IF NOT EXISTS "financing_packages" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "apr" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "min_down_payment_percent" DOUBLE PRECISION NOT NULL DEFAULT 10.00,
    "max_loan_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.50,
    "min_credit_score" INTEGER NOT NULL DEFAULT 600,
    "tenure_months" INTEGER[] NOT NULL DEFAULT ARRAY[6, 12, 24]::INTEGER[],
    "processing_fee" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "facility_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financing_packages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_fp_facility" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "financing_packages_code_key" ON "financing_packages"("code");
CREATE INDEX IF NOT EXISTS "financing_packages_facility_id_idx" ON "financing_packages"("facility_id");

-- 4. Appointment Policies table
CREATE TABLE IF NOT EXISTS "appointment_policies" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT,
    "min_notice_hours_cancel" INTEGER NOT NULL DEFAULT 24,
    "min_notice_hours_reschedule" INTEGER NOT NULL DEFAULT 12,
    "max_reschedules_allowed" INTEGER NOT NULL DEFAULT 3,
    "slot_hold_minutes" INTEGER NOT NULL DEFAULT 45,
    "max_advance_booking_days" INTEGER NOT NULL DEFAULT 60,
    "slot_generation_days" INTEGER NOT NULL DEFAULT 14,
    "default_slot_duration" INTEGER NOT NULL DEFAULT 30,
    "default_buffer_minutes" INTEGER NOT NULL DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_policies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_ap_facility" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "appointment_policies_facility_id_key" ON "appointment_policies"("facility_id");
