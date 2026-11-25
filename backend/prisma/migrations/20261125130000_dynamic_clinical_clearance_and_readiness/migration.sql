-- Migration: 20261125130000_dynamic_clinical_clearance_and_readiness
-- Creates clearance_requirements, clearance_policies, clearance_policy_items,
-- treatment_offer_clearance_records, and clearance_decision_items

-- 1. Clearance Requirement Catalogue
CREATE TABLE IF NOT EXISTS "clearance_requirements" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL DEFAULT 'LABORATORY',
    "clinical_practice_type" VARCHAR(50) NOT NULL DEFAULT 'ALL',
    "procedure_group" VARCHAR(100),
    "facility_id" TEXT,
    "required_evidence_type" VARCHAR(50) NOT NULL DEFAULT 'NONE',
    "reviewer_role" VARCHAR(50) NOT NULL DEFAULT 'DOCTOR',
    "required_approvals_count" INTEGER NOT NULL DEFAULT 1,
    "required_specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "dependencies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clearance_requirements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cr_facility" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "clearance_requirements_code_key" ON "clearance_requirements"("code");
CREATE INDEX IF NOT EXISTS "idx_clearance_requirements_category_status" ON "clearance_requirements"("category", "status");
CREATE INDEX IF NOT EXISTS "idx_clearance_requirements_practice_status" ON "clearance_requirements"("clinical_practice_type", "status");

-- 2. Clearance Policies
CREATE TABLE IF NOT EXISTS "clearance_policies" (
    "id" TEXT NOT NULL,
    "policy_number" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "facility_id" TEXT,
    "procedure_id" TEXT,
    "procedure_code" VARCHAR(50),
    "clinical_practice_type" VARCHAR(50) NOT NULL DEFAULT 'HUMAN_HEALTHCARE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "scheduling_prerequisites" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clearance_policies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cp_facility" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_cp_procedure" FOREIGN KEY ("procedure_id") REFERENCES "procedure_catalogue"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "clearance_policies_policy_number_key" ON "clearance_policies"("policy_number");
CREATE INDEX IF NOT EXISTS "idx_clearance_policies_facility_status" ON "clearance_policies"("facility_id", "status");
CREATE INDEX IF NOT EXISTS "idx_clearance_policies_procedure_code_status" ON "clearance_policies"("procedure_code", "status");
CREATE INDEX IF NOT EXISTS "idx_clearance_policies_practice_status" ON "clearance_policies"("clinical_practice_type", "status");

-- 3. Clearance Policy Items (Join Table between Policies and Requirements)
CREATE TABLE IF NOT EXISTS "clearance_policy_items" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "required_specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "validity_days" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clearance_policy_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cpi_policy" FOREIGN KEY ("policy_id") REFERENCES "clearance_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_cpi_requirement" FOREIGN KEY ("requirement_id") REFERENCES "clearance_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "clearance_policy_items_policy_id_requirement_id_key"
    ON "clearance_policy_items"("policy_id", "requirement_id");

-- 4. Treatment Offer Clearance Records
CREATE TABLE IF NOT EXISTS "treatment_offer_clearance_records" (
    "id" TEXT NOT NULL,
    "treatment_offer_id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "procedure_id" TEXT,
    "policy_id" TEXT,
    "policy_version" INTEGER NOT NULL DEFAULT 1,
    "overall_status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "completed_gates_count" INTEGER NOT NULL DEFAULT 0,
    "total_gates_count" INTEGER NOT NULL DEFAULT 0,
    "readiness_percentage" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "cleared_at" TIMESTAMP(3),
    "cleared_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatment_offer_clearance_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_tocr_offer" FOREIGN KEY ("treatment_offer_id") REFERENCES "treatment_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_tocr_patient" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_tocr_facility" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_tocr_policy" FOREIGN KEY ("policy_id") REFERENCES "clearance_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fk_tocr_cleared_by" FOREIGN KEY ("cleared_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "treatment_offer_clearance_records_treatment_offer_id_key"
    ON "treatment_offer_clearance_records"("treatment_offer_id");
CREATE INDEX IF NOT EXISTS "idx_tocr_patient_status" ON "treatment_offer_clearance_records"("patient_profile_id", "overall_status");
CREATE INDEX IF NOT EXISTS "idx_tocr_facility_status" ON "treatment_offer_clearance_records"("facility_id", "overall_status");

-- 5. Clearance Decision Items (Granular per-requirement/specialty decisions)
CREATE TABLE IF NOT EXISTS "clearance_decision_items" (
    "id" TEXT NOT NULL,
    "clearance_record_id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "requirement_code" VARCHAR(50) NOT NULL,
    "specialty" VARCHAR(50),
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "reviewer_id" TEXT,
    "reviewer_role" VARCHAR(50),
    "evidence_type" VARCHAR(50),
    "evidence_record_id" TEXT,
    "evidence_metadata" JSONB,
    "clinical_remarks" TEXT,
    "decision_timestamp" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "audit_trail" JSONB NOT NULL DEFAULT '[]'::JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clearance_decision_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cdi_record" FOREIGN KEY ("clearance_record_id") REFERENCES "treatment_offer_clearance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_cdi_requirement" FOREIGN KEY ("requirement_id") REFERENCES "clearance_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_cdi_reviewer" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "clearance_decision_items_clearance_record_id_requirement_id_specialty_key"
    ON "clearance_decision_items"("clearance_record_id", "requirement_id", COALESCE("specialty", ''));
CREATE INDEX IF NOT EXISTS "idx_cdi_code_status" ON "clearance_decision_items"("requirement_code", "status");

-- 6. Seed Baseline Requirements into Catalogue (Idempotent)
INSERT INTO "clearance_requirements" (
    "id", "code", "name", "description", "category", "clinical_practice_type",
    "required_evidence_type", "reviewer_role", "required_approvals_count",
    "required_specialties", "is_mandatory", "dependencies", "sort_order", "status", "version"
) VALUES
('req-001-financial', 'REQ-FINANCIAL', 'Financial Authorization & Settlement', 'Prompt cash settlement & financing plan underwritten and ratified.', 'FINANCIAL', 'ALL', 'NONE', 'STAFF', 1, ARRAY[]::TEXT[], true, ARRAY[]::TEXT[], 1, 'ACTIVE', 1),
('req-002-consent', 'REQ-LEGAL-CONSENT', 'Informed Consent & Digital Authorization', 'Ratified by patient with informed consent and digital authorization seal.', 'LEGAL_CONSENT', 'ALL', 'DOCUMENT', 'DOCTOR', 1, ARRAY[]::TEXT[], true, ARRAY[]::TEXT[], 2, 'ACTIVE', 1),
('req-003-offer', 'REQ-OFFER-AGREEMENT', 'Treatment Offer & Financing Agreement', 'Treatment proposal and financing agreement archived in CareID treatment ledger.', 'FINANCIAL', 'ALL', 'NONE', 'DOCTOR', 1, ARRAY[]::TEXT[], true, ARRAY[]::TEXT[], 3, 'ACTIVE', 1),
('req-004-lab', 'REQ-LAB-METABOLIC', 'Pre-Procedure Metabolic & Coagulation Panel', 'Pre-operative coagulation panel (PT/INR, aPTT), comprehensive metabolic panel, and CBC verification.', 'LABORATORY', 'ALL', 'LAB_RESULT', 'DOCTOR', 1, ARRAY[]::TEXT[], true, ARRAY[]::TEXT[], 4, 'ACTIVE', 1),
('req-005-spec', 'REQ-SPEC-CLEARANCE', 'Pre-Op Anesthesia & Clinical Clearance', 'Multidisciplinary specialist evaluation including anesthesia, cardiology, and medical evaluation.', 'SPECIALIST_CLEARANCE', 'ALL', 'SPECIALIST_SIGN_OFF', 'DOCTOR', 3, ARRAY['ANESTHESIA', 'CARDIOLOGY', 'MEDICAL']::TEXT[], true, ARRAY[]::TEXT[], 5, 'ACTIVE', 1),
('req-006-slot', 'REQ-SLOT-CONFIRM', 'Procedural Suite Slot Confirmation & Check-In', 'Procedural suite slot reservation, resource readiness, and day-of-procedure admission hold.', 'OPERATIONAL', 'ALL', 'NONE', 'STAFF', 1, ARRAY[]::TEXT[], true, ARRAY['REQ-FINANCIAL', 'REQ-LEGAL-CONSENT']::TEXT[], 6, 'ACTIVE', 1),
('req-007-surg', 'REQ-SURGICAL-PREP', 'Surgical & Discharge Readiness', 'Surgical site verification, NPO fasting compliance, and post-procedure escort confirmation.', 'SURGICAL_PREP', 'ALL', 'VITALS_SIGN_OFF', 'DOCTOR', 1, ARRAY[]::TEXT[], true, ARRAY[]::TEXT[], 7, 'ACTIVE', 1)
ON CONFLICT ("code") DO UPDATE SET
    "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "category" = EXCLUDED."category",
    "required_evidence_type" = EXCLUDED."required_evidence_type",
    "required_approvals_count" = EXCLUDED."required_approvals_count",
    "required_specialties" = EXCLUDED."required_specialties",
    "sort_order" = EXCLUDED."sort_order";

-- 7. Seed Standard Baseline Policy
INSERT INTO "clearance_policies" (
    "id", "policy_number", "name", "facility_id", "procedure_id", "procedure_code",
    "clinical_practice_type", "version", "status", "scheduling_prerequisites"
) VALUES
('pol-001-default', 'POL-CLEAR-DEFAULT', 'Standard Outpatient Clinical Clearance Policy', NULL, NULL, NULL, 'HUMAN_HEALTHCARE', 1, 'PUBLISHED', ARRAY['REQ-FINANCIAL', 'REQ-LEGAL-CONSENT', 'REQ-OFFER-AGREEMENT', 'REQ-LAB-METABOLIC', 'REQ-SPEC-CLEARANCE']::TEXT[]),
('pol-002-cathlab', 'POL-CLEAR-CATHLAB', 'Interventional Cath Lab Pre-Procedure Clearance Policy', NULL, NULL, '93458', 'HUMAN_HEALTHCARE', 1, 'PUBLISHED', ARRAY['REQ-FINANCIAL', 'REQ-LEGAL-CONSENT', 'REQ-OFFER-AGREEMENT', 'REQ-LAB-METABOLIC', 'REQ-SPEC-CLEARANCE']::TEXT[])
ON CONFLICT ("policy_number") DO UPDATE SET
    "name" = EXCLUDED."name",
    "procedure_code" = EXCLUDED."procedure_code",
    "scheduling_prerequisites" = EXCLUDED."scheduling_prerequisites";

-- 8. Link Policy Items for Default & Cathlab Policies
INSERT INTO "clearance_policy_items" ("id", "policy_id", "requirement_id", "is_mandatory", "sort_order", "required_specialties", "validity_days")
SELECT 'cpi-def-' || r.code, 'pol-001-default', r.id, r.is_mandatory, r.sort_order, r.required_specialties, 30
FROM "clearance_requirements" r
ON CONFLICT ("policy_id", "requirement_id") DO UPDATE SET
    "is_mandatory" = EXCLUDED."is_mandatory",
    "sort_order" = EXCLUDED."sort_order",
    "required_specialties" = EXCLUDED."required_specialties";

INSERT INTO "clearance_policy_items" ("id", "policy_id", "requirement_id", "is_mandatory", "sort_order", "required_specialties", "validity_days")
SELECT 'cpi-cath-' || r.code, 'pol-002-cathlab', r.id, r.is_mandatory, r.sort_order, r.required_specialties, 30
FROM "clearance_requirements" r
ON CONFLICT ("policy_id", "requirement_id") DO UPDATE SET
    "is_mandatory" = EXCLUDED."is_mandatory",
    "sort_order" = EXCLUDED."sort_order",
    "required_specialties" = EXCLUDED."required_specialties";
