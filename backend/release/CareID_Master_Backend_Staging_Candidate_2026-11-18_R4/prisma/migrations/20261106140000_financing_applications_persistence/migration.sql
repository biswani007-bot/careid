-- CreateEnum
CREATE TYPE "FinancingApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED');

-- CreateSequence
CREATE SEQUENCE IF NOT EXISTS financing_application_seq
    START WITH 12
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- CreateTable
CREATE TABLE "financing_applications" (
    "id" TEXT NOT NULL,
    "application_number" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "patient_profile_id" TEXT,
    "facility_id" TEXT,
    "treatment_offer_id" TEXT,
    "financing_offer_id" TEXT,
    "option_id" TEXT NOT NULL,
    "partner_name" TEXT NOT NULL,
    "treatment_name" TEXT,
    "requested_amount" DECIMAL(12,2) NOT NULL,
    "tenure_months" INTEGER NOT NULL,
    "monthly_estimated_emi" DECIMAL(12,2) NOT NULL,
    "monthly_income_encrypted" TEXT,
    "employment_type" TEXT,
    "pan_or_national_id" TEXT,
    "notes" TEXT,
    "status" "FinancingApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "admin_notes" TEXT,
    "rejection_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "disbursed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financing_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financing_application_history" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "previous_status" "FinancingApplicationStatus",
    "new_status" "FinancingApplicationStatus" NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT NOT NULL,
    "performer_role" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financing_application_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "financing_applications_application_number_key" ON "financing_applications"("application_number");

-- CreateIndex
CREATE INDEX "financing_applications_user_id_status_idx" ON "financing_applications"("user_id", "status");

-- CreateIndex
CREATE INDEX "financing_applications_patient_profile_id_status_idx" ON "financing_applications"("patient_profile_id", "status");

-- CreateIndex
CREATE INDEX "financing_applications_facility_id_status_idx" ON "financing_applications"("facility_id", "status");

-- CreateIndex
CREATE INDEX "financing_applications_status_created_at_idx" ON "financing_applications"("status", "created_at");

-- CreateIndex
CREATE INDEX "financing_applications_partner_name_status_idx" ON "financing_applications"("partner_name", "status");

-- CreateIndex
CREATE INDEX "financing_applications_treatment_offer_id_idx" ON "financing_applications"("treatment_offer_id");

-- CreateIndex
CREATE INDEX "financing_applications_financing_offer_id_idx" ON "financing_applications"("financing_offer_id");

-- CreateIndex
CREATE INDEX "financing_application_history_application_id_created_at_idx" ON "financing_application_history"("application_id", "created_at");

-- AddForeignKey
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_treatment_offer_id_fkey" FOREIGN KEY ("treatment_offer_id") REFERENCES "treatment_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_financing_offer_id_fkey" FOREIGN KEY ("financing_offer_id") REFERENCES "financing_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_application_history" ADD CONSTRAINT "financing_application_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "financing_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

