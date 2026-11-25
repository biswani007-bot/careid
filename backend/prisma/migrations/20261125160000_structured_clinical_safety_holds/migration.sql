-- Migration: 20261125160000_structured_clinical_safety_holds
-- Creates structured safety_hold_records, dynamic safety hold master data, and clinical summary display config

-- 1. Structured Safety Hold Records Table
CREATE TABLE IF NOT EXISTS "safety_hold_records" (
    "id" TEXT NOT NULL,
    "hold_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "treatment_offer_id" TEXT,
    "patient_profile_id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "encounter_id" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "hold_category" VARCHAR(100) NOT NULL,
    "reason" TEXT NOT NULL,
    "clinical_notes" TEXT,
    "declared_by" TEXT NOT NULL,
    "declared_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolution_notes" TEXT,
    "duration_seconds" INTEGER,
    "evidence_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_hold_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_shr_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fk_shr_offer" FOREIGN KEY ("treatment_offer_id") REFERENCES "treatment_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fk_shr_patient" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_shr_facility" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_shr_declared_by" FOREIGN KEY ("declared_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_shr_resolved_by" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "safety_hold_records_hold_id_key" ON "safety_hold_records"("hold_id");
CREATE INDEX IF NOT EXISTS "idx_shr_appointment_status" ON "safety_hold_records"("appointment_id", "status");
CREATE INDEX IF NOT EXISTS "idx_shr_offer_status" ON "safety_hold_records"("treatment_offer_id", "status");
CREATE INDEX IF NOT EXISTS "idx_shr_patient_status" ON "safety_hold_records"("patient_profile_id", "status");
CREATE INDEX IF NOT EXISTS "idx_shr_facility_status" ON "safety_hold_records"("facility_id", "status");
CREATE INDEX IF NOT EXISTS "idx_shr_category_status" ON "safety_hold_records"("hold_category", "status");

-- 2. Dynamic Safety Hold Master Data Categories & Items
INSERT INTO "master_data_categories" ("id", "code", "name", "description", "status", "created_at", "updated_at")
VALUES
('cat-safety-holds', 'SAFETY_HOLD_CATEGORIES', 'Clinical Safety Hold Categories', 'Dynamic procedural safety hold categories and hazard definitions', 'ACTIVE'::"GovernanceStatus", NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "master_data_items" ("id", "category_id", "code", "name", "description", "sort_order", "status", "clinical_practice_type", "created_at", "updated_at")
SELECT 'mdi-sh-' || code, (SELECT id FROM "master_data_categories" WHERE code = 'SAFETY_HOLD_CATEGORIES'), code, name, description, sort_order, 'ACTIVE'::"GovernanceStatus", 'ALL', NOW(), NOW()
FROM (VALUES
    ('RADIATION_OR_CONTRAST_HAZARD', 'Radiation or Contrast Hazard', 'Exceeded fluoroscopic dose, contrast volume limit, or acute adverse hypersensitivity response', 1),
    ('PATIENT_HEMODYNAMIC_INSTABILITY', 'Patient Hemodynamic Instability', 'Sustained hypotension, severe arrhythmia, or hemodynamic decompensation requiring acute stabilization', 2),
    ('ANESTHESIA_AIRWAY_COMPROMISE', 'Anesthesia / Airway Compromise', 'Acute hypoxemia, airway obstruction, laryngospasm, or sedation depth discrepancy', 3),
    ('CONSENT_OR_IDENTIFICATION_DISCREPANCY', 'Consent or Identification Discrepancy', 'Patient wristband discrepancy, unsigned informed consent, or procedure site mismatch', 4),
    ('MEDICATION_ERROR', 'Medication or Anticoagulation Hazard', 'ACT or heparin dosing discrepancy, anticoagulant timing violation, or medication contraindication', 5),
    ('STERILITY_BREACH', 'Sterility Breach or Contamination', 'Sterile field contamination, compromised implant packaging, or autoclave indicator failure', 6),
    ('EQUIPMENT_MALFUNCTION', 'Equipment or Fluoroscopy Malfunction', 'C-arm imaging failure, injector malfunction, hemodynamic monitor failure, or table power failure', 7),
    ('STAFF_UNAVAILABILITY', 'Critical Clinical Staff Unavailability', 'Unavailability of attending specialist, perfusionist, or scrub personnel for emergent intervention', 8),
    ('OTHER_SAFETY_HAZARD', 'Other Procedural Safety Hazard', 'Other clinician-identified intra-operative or pre-procedural safety concern requiring multidisciplinary resolution', 9)
) AS v(code, name, description, sort_order)
ON CONFLICT ("category_id", "code") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description", "sort_order" = EXCLUDED."sort_order";

-- 3. Dynamic Clinical Summary Display Configuration
INSERT INTO "system_configurations" ("id", "key", "value", "category", "value_type", "description", "status", "created_at", "updated_at")
VALUES
('sc-clin-summary-cfg', 'CLINICAL_SUMMARY_CONFIG', '{"showProcedureCode":true,"showClinicalIndication":true,"showFacility":true,"showSupervisingAttending":true,"showFinancialTerms":true,"showProceduralHoldWindow":true,"showSafetyHoldHistory":true,"safetyHoldPanelCollapsedByDefault":false,"requireClinicalReviewForHoldClearance":true}', 'GENERAL'::"ConfigurationType", 'JSON', 'Dynamic display and workflow configuration for Consultation & Clearance Clinical Summaries', 'ACTIVE'::"GovernanceStatus", NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;
