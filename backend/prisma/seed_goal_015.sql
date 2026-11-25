-- Seed Goal 015 Canonical Data

-- 1. Default Financing Packages
INSERT INTO "financing_packages" (
    "id", "code", "name", "provider", "description", "apr", "min_down_payment_percent",
    "max_loan_multiplier", "min_credit_score", "tenure_months", "processing_fee", "is_active", "created_at", "updated_at"
) VALUES
('fp-1', 'FP-INHOUSE-0', 'Care ID In-House 0% APR', 'CareID Financial', 'Zero-interest promotional financing for approved clinical procedures.', 0.00, 10.00, 1.50, 620, ARRAY[6, 12]::INTEGER[], 0.00, true, NOW(), NOW()),
('fp-2', 'FP-BRIDGE-59', 'HealthPay Bridge Credit Line', 'HealthPay Financial', 'Low-APR extended payment plan for procedural healthcare.', 5.90, 10.00, 2.00, 600, ARRAY[12, 24]::INTEGER[], 50.00, true, NOW(), NOW()),
('fp-3', 'FP-MEDPAY-99', 'MedPay Flex Split-Tier', 'MedPay Capital', 'Flexible long-tenure financing with tiered amortization options.', 9.90, 15.00, 2.50, 580, ARRAY[12, 24, 36]::INTEGER[], 75.00, true, NOW(), NOW()),
('fp-4', 'FP-CARED-0', 'CareCredit Health Plan', 'CareCredit', 'Institutional healthcare financing network partner.', 0.00, 10.00, 1.50, 640, ARRAY[6, 12, 18]::INTEGER[], 0.00, true, NOW(), NOW())
ON CONFLICT ("code") DO UPDATE SET
    "name" = EXCLUDED."name",
    "provider" = EXCLUDED."provider",
    "description" = EXCLUDED."description",
    "apr" = EXCLUDED."apr",
    "min_down_payment_percent" = EXCLUDED."min_down_payment_percent",
    "max_loan_multiplier" = EXCLUDED."max_loan_multiplier",
    "min_credit_score" = EXCLUDED."min_credit_score",
    "tenure_months" = EXCLUDED."tenure_months",
    "processing_fee" = EXCLUDED."processing_fee",
    "is_active" = EXCLUDED."is_active",
    "updated_at" = NOW();

-- 2. Global Default Appointment Policy
INSERT INTO "appointment_policies" (
    "id", "facility_id", "min_notice_hours_cancel", "min_notice_hours_reschedule",
    "max_reschedules_allowed", "slot_hold_minutes", "max_advance_booking_days",
    "slot_generation_days", "default_slot_duration", "default_buffer_minutes",
    "is_active", "created_at", "updated_at"
) VALUES (
    'ap-global-default', NULL, 24, 12, 3, 45, 60, 14, 30, 5, true, NOW(), NOW()
) ON CONFLICT ("facility_id") DO NOTHING;

-- 3. Master Data Categories & Items
INSERT INTO "master_data_categories" ("id", "code", "name", "description", "status", "created_at", "updated_at")
VALUES
('cat-cons-reasons', 'CONSULTATION_REASONS', 'Consultation Reasons', 'Chief complaints and consultation indications', 'ACTIVE'::"GovernanceStatus", NOW(), NOW()),
('cat-cancel-reasons', 'CANCELLATION_REASONS', 'Cancellation Reasons', 'Approved reasons for appointment cancellation', 'ACTIVE'::"GovernanceStatus", NOW(), NOW()),
('cat-remark-templates', 'CLINICAL_REMARK_TEMPLATES', 'Clinical Remark Templates', 'Standardized reusable clinician remark snippets', 'ACTIVE'::"GovernanceStatus", NOW(), NOW()),
('cat-appt-modalities', 'APPOINTMENT_MODALITIES', 'Appointment Modalities', 'Care delivery modalities', 'ACTIVE'::"GovernanceStatus", NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

-- Items for CONSULTATION_REASONS
INSERT INTO "master_data_items" ("id", "category_id", "code", "name", "sort_order", "status", "clinical_practice_type", "created_at", "updated_at")
SELECT 'mdi-cr-' || code, (SELECT id FROM "master_data_categories" WHERE code = 'CONSULTATION_REASONS'), code, name, sort_order, 'ACTIVE'::"GovernanceStatus", 'HUMAN_HEALTHCARE', NOW(), NOW()
FROM (VALUES
    ('GENERAL_CONSULT', 'General Clinical Consultation', 1),
    ('PRE_OP_EVAL', 'Pre-Operative Evaluation', 2),
    ('FOLLOW_UP', 'Follow-up Assessment', 3),
    ('POST_PROCEDURE', 'Post-Procedure Review', 4),
    ('CATH_LAB_CONSULT', 'Diagnostic Cath Lab Consultation', 5)
) AS v(code, name, sort_order)
ON CONFLICT ("category_id", "code") DO UPDATE SET "name" = EXCLUDED."name", "sort_order" = EXCLUDED."sort_order";

-- Items for CANCELLATION_REASONS
INSERT INTO "master_data_items" ("id", "category_id", "code", "name", "sort_order", "status", "clinical_practice_type", "created_at", "updated_at")
SELECT 'mdi-cnr-' || code, (SELECT id FROM "master_data_categories" WHERE code = 'CANCELLATION_REASONS'), code, name, sort_order, 'ACTIVE'::"GovernanceStatus", 'HUMAN_HEALTHCARE', NOW(), NOW()
FROM (VALUES
    ('PATIENT_EMERGENCY', 'Patient Emergency / Acute Illness', 1),
    ('CLINICAL_CONFLICT', 'Clinical Conflict / Physician Unavailable', 2),
    ('PATIENT_REQUEST', 'Patient Request / Schedule Conflict', 3),
    ('FACILITY_MAINTENANCE', 'Equipment / Facility Maintenance', 4),
    ('AUTH_DELAY', 'Insurance / Pre-Authorization Delay', 5)
) AS v(code, name, sort_order)
ON CONFLICT ("category_id", "code") DO UPDATE SET "name" = EXCLUDED."name", "sort_order" = EXCLUDED."sort_order";

-- Items for CLINICAL_REMARK_TEMPLATES
INSERT INTO "master_data_items" ("id", "category_id", "code", "name", "description", "sort_order", "status", "clinical_practice_type", "created_at", "updated_at")
SELECT 'mdi-crt-' || code, (SELECT id FROM "master_data_categories" WHERE code = 'CLINICAL_REMARK_TEMPLATES'), code, name, description, sort_order, 'ACTIVE'::"GovernanceStatus", 'HUMAN_HEALTHCARE', NOW(), NOW()
FROM (VALUES
    ('TEMPLATE_INFORMED_CONSENT', 'Informed Consent & Risk Review', 'Standard procedural protocol discussed with patient; risks, benefits, and alternative therapies reviewed in detail.', 1),
    ('TEMPLATE_PRE_OP_FASTING', 'Pre-Op Fasting & Medication', 'Pre-operative fasting guidelines explained; patient instructed to withhold anticoagulants 48 hours prior.', 2),
    ('TEMPLATE_POST_OP_MONITORING', 'Post-Op Observation', 'Post-procedure monitoring required for 4 hours; follow-up visit scheduled in 7 days.', 3),
    ('TEMPLATE_CATH_LAB_INDICATION', 'Cath Lab Protocol', 'Patient consented to cardiac catheterization and stent placement after comprehensive discussion.', 4)
) AS v(code, name, description, sort_order)
ON CONFLICT ("category_id", "code") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description", "sort_order" = EXCLUDED."sort_order";

-- Items for APPOINTMENT_MODALITIES
INSERT INTO "master_data_items" ("id", "category_id", "code", "name", "sort_order", "status", "clinical_practice_type", "created_at", "updated_at")
SELECT 'mdi-am-' || code, (SELECT id FROM "master_data_categories" WHERE code = 'APPOINTMENT_MODALITIES'), code, name, sort_order, 'ACTIVE'::"GovernanceStatus", 'HUMAN_HEALTHCARE', NOW(), NOW()
FROM (VALUES
    ('IN_PERSON', 'In-Person Consultation', 1),
    ('TELECONSULTATION', 'Teleconsultation / Video', 2),
    ('HOME_VISIT', 'Home Visit / Remote Care', 3)
) AS v(code, name, sort_order)
ON CONFLICT ("category_id", "code") DO UPDATE SET "name" = EXCLUDED."name", "sort_order" = EXCLUDED."sort_order";

-- 4. Default System Configurations / Platform Settings
INSERT INTO "system_configurations" ("id", "key", "value", "category", "value_type", "description", "status", "created_at", "updated_at")
VALUES
('sc-curr', 'FINANCIAL_DEFAULT_CURRENCY', 'USD', 'GENERAL'::"ConfigurationType", 'STRING', 'Default system currency for treatments and offers', 'ACTIVE'::"GovernanceStatus", NOW(), NOW()),
('sc-validity', 'OFFER_VALIDITY_DAYS_DEFAULT', '14', 'GENERAL'::"ConfigurationType", 'NUMBER', 'Default validity period in days for treatment offers', 'ACTIVE'::"GovernanceStatus", NOW(), NOW()),
('sc-max-disc', 'DISCOUNT_MAX_DOCTOR_PERCENT', '30', 'GENERAL'::"ConfigurationType", 'NUMBER', 'Maximum doctor discretionary discount percentage', 'ACTIVE'::"GovernanceStatus", NOW(), NOW()),
('sc-sup-disc', 'DISCOUNT_SUPERVISOR_THRESHOLD_PERCENT', '15', 'GENERAL'::"ConfigurationType", 'NUMBER', 'Threshold percentage requiring supervisor approval', 'ACTIVE'::"GovernanceStatus", NOW(), NOW())
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = NOW();
