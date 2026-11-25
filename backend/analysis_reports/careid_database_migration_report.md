# CAREID DATABASE MIGRATION & RELATIONAL SCHEMA REPORT
## Proposed Schema Migrations for Stages 16–18 & Standalone Refills

**Date:** November 10, 2026  
**Auditor & Database Architect:** Antigravity Forensic Engineering  
**Repository:** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main`  
**Prisma Version:** `@prisma/client@7.9.1` / Schema 5.22.0  
**Target Database (Future Staging):** `360api_staging`  
**Production Status:** **STRICTLY BLOCKED — ZERO PRODUCTION MIGRATIONS**

---

## 1. MIGRATION SAFETY POLICY & AUDIT DIRECTIVE

> [!CAUTION]
> **PRODUCTION MIGRATION PROHIBITION**  
> In accordance with release safety directives, **no migrations have been executed against database `360api`**.  
> The target database `360api` on host `360api.vnvision.in` is the **LIVE PRODUCTION** environment. Executing DDL migrations against it without staging isolation risks table locks, schema drift, and patient data loss.  
> The migrations proposed below are **strictly reserved for execution against the dedicated staging database (`360api_staging`)** once provisioned.

---

## 2. EXISTING MIGRATION HISTORY INVENTORY

Inspection of `prisma/migrations/` confirms exactly 6 historical migrations in chronological sequence:
1. `0_init`: Core database schema (users, patients, doctors, appointments, medical records, medical reports).
2. `20261030113000_add_atomic_offers_and_audit`: Atomic offer sequences and audit logging.
3. `20261030123000_add_patient_insurance_and_history`: Insurance policies, patient medical history.
4. `20261106110000_add_financing_workflow_schema`: Financing applications, AES-256-GCM metadata.
5. `20261106120000_add_treatment_offer_cascade_and_indexes`: Offer relations and cascade indices.
6. `20261106140000_add_ocr_processing_indexes`: OCR jobs and document processing indexing.

**Current Pending Migrations in Production:** **0**

---

## 3. PROPOSED RELATIONAL SCHEMA SPECIFICATION (STAGING STAGE 16–18)

To transition from the current delimited notes persistence model to fully indexed, dedicated relational PostgreSQL tables on staging, the following Prisma models and SQL DDL are formally proposed.

### A. Proposed Prisma Schema Definitions

```prisma
// ─── 1. Cath Lab Surgical Safety Time-Out ────────────────────────────────────
model CathLabSafetyTimeout {
  id                                 String      @id @default(uuid())
  appointmentId                      String      @unique @map("appointment_id")
  patientProfileId                   String      @map("patient_profile_id")
  facilityId                         String?     @map("facility_id")
  treatmentOfferId                   String?     @map("treatment_offer_id")
  encounterId                        String?     @map("encounter_id")
  status                             String      @default("RATIFIED")
  ratifiedAt                         DateTime    @default(now()) @map("ratified_at")
  interventionalistId                String      @map("interventionalist_id")
  circulatingNurseId                 String?     @map("circulating_nurse_id")
  anesthesiaProviderId               String?     @map("anesthesia_provider_id")
  integrityHash                      String      @map("integrity_hash")
  patientIdentityConfirmed           Boolean     @map("patient_identity_confirmed")
  procedureConfirmed                 Boolean     @map("procedure_confirmed")
  accessSiteConfirmed                Boolean     @map("access_site_confirmed")
  consentAndAnticoagulationVerified  Boolean     @map("consent_and_anticoagulation_verified")
  equipmentAndEmergencyPrepared      Boolean     @map("equipment_and_emergency_prepared")
  radiationAndShieldingVerified      Boolean     @map("radiation_and_shielding_verified")
  notes                              String?
  isAmendment                        Boolean     @default(false) @map("is_amendment")
  amendmentReason                    String?     @map("amendment_reason")
  createdAt                          DateTime    @default(now()) @map("created_at")

  appointment                        Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  patientProfile                     PatientProfile @relation(fields: [patientProfileId], references: [id], onDelete: Cascade)

  @@map("cath_lab_safety_timeouts")
  @@index([appointmentId])
  @@index([patientProfileId])
  @@index([ratifiedAt])
}

// ─── 2. Emergency Procedural Safety Holds ─────────────────────────────────────
model CathLabSafetyHold {
  id                   String      @id @default(uuid())
  appointmentId        String      @map("appointment_id")
  patientProfileId     String      @map("patient_profile_id")
  category             String
  clinicalRemarks      String      @map("clinical_remarks")
  status               String      @default("ACTIVE") // ACTIVE, CLEARED
  declaredAt           DateTime    @default(now()) @map("declared_at")
  declaredBy           String      @map("declared_by")
  clearedAt            DateTime?   @map("cleared_at")
  clearedBy            String?     @map("cleared_by")
  resolutionRemarks    String?     @map("resolution_remarks")
  durationMinutes      Int?        @map("duration_minutes")
  createdAt            DateTime    @default(now()) @map("created_at")

  appointment          Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  patientProfile       PatientProfile @relation(fields: [patientProfileId], references: [id], onDelete: Cascade)

  @@map("cath_lab_safety_holds")
  @@index([appointmentId, status])
  @@index([patientProfileId])
}

// ─── 3. Procedural Fluoroscopy & Hemodynamic Telemetry ────────────────────────
model CathLabTelemetryLog {
  id                   String      @id @default(uuid())
  appointmentId        String      @map("appointment_id")
  patientProfileId     String      @map("patient_profile_id")
  fluoroscopyTimeSec   Float       @default(0) @map("fluoroscopy_time_sec")
  radiationDapGyCm2    Float       @default(0) @map("radiation_dap_gy_cm2")
  contrastVolumeMl     Float       @default(0) @map("contrast_volume_ml")
  heartRateBpm         Int?        @map("heart_rate_bpm")
  systolicBpMmHg       Int?        @map("systolic_bp_mm_hg")
  diastolicBpMmHg      Int?        @map("diastolic_bp_mm_hg")
  actSec               Int?        @map("act_sec")
  source               String      @default("MANUAL_ENTRY") // MANUAL_ENTRY, DEVICE_STREAM
  loggedAt             DateTime    @default(now()) @map("logged_at")
  loggedBy             String      @map("logged_by")

  appointment          Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)

  @@map("cath_lab_telemetry_logs")
  @@index([appointmentId, loggedAt])
}

// ─── 4. Coronary Vessel Findings & QCA ─────────────────────────────────────────
model CathLabVesselFinding {
  id                   String           @id @default(uuid())
  encounterId          String           @map("encounter_id")
  patientProfileId     String           @map("patient_profile_id")
  vesselName           String           @map("vessel_name") // RCA, LM, LAD, LCX, RAMUS, GRAFT
  rvdMm                Float?           @map("rvd_mm")
  mldMm                Float?           @map("mld_mm")
  stenosisPercent      Int              @map("stenosis_percent")
  timiFlow             String           @default("TIMI_3") @map("timi_flow")
  interventionType     String?          @map("intervention_type")
  coronaryDominance    String           @default("RIGHT") @map("coronary_dominance")
  lvefPercent          Int?             @map("lvef_percent")
  hemostasisMethod     String?          @map("hemostasis_method")
  cptCode              String?          @map("cpt_code")
  recordedAt           DateTime         @default(now()) @map("recorded_at")
  recordedBy           String           @map("recorded_by")

  encounter            MedicalEncounter @relation(fields: [encounterId], references: [id], onDelete: Cascade)

  @@map("cath_lab_vessel_findings")
  @@index([encounterId])
}

// ─── 5. Dedicated Prescription Refill History ────────────────────────────────
model PrescriptionRefill {
  id                   String           @id @default(uuid())
  medicalReportId      String           @map("medical_report_id")
  refillNumber         Int              @map("refill_number")
  refilledAt           DateTime         @default(now()) @map("refilled_at")
  refilledBy           String           @map("refilled_by")
  refilledByName       String?          @map("refilled_by_name")
  quantity             Int              @default(1)
  notes                String?
  createdAt            DateTime         @default(now()) @map("created_at")

  medicalReport        MedicalReport    @relation(fields: [medicalReportId], references: [id], onDelete: Cascade)

  @@map("prescription_refills")
  @@index([medicalReportId, refillNumber])
}
```

---

## 4. PROPOSED SQL MIGRATION SCRIPT FOR STAGING

Upon provisioning and verification of `360api_staging`, the following DDL script will be placed in `prisma/migrations/20261111000000_add_cath_lab_and_refills_schema/migration.sql`:

```sql
-- CreateTable: cath_lab_safety_timeouts
CREATE TABLE "cath_lab_safety_timeouts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointment_id" TEXT NOT NULL UNIQUE,
    "patient_profile_id" TEXT NOT NULL,
    "facility_id" TEXT,
    "treatment_offer_id" TEXT,
    "encounter_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RATIFIED',
    "ratified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interventionalist_id" TEXT NOT NULL,
    "circulating_nurse_id" TEXT,
    "anesthesia_provider_id" TEXT,
    "integrity_hash" TEXT NOT NULL,
    "patient_identity_confirmed" BOOLEAN NOT NULL,
    "procedure_confirmed" BOOLEAN NOT NULL,
    "access_site_confirmed" BOOLEAN NOT NULL,
    "consent_and_anticoagulation_verified" BOOLEAN NOT NULL,
    "equipment_and_emergency_prepared" BOOLEAN NOT NULL,
    "radiation_and_shielding_verified" BOOLEAN NOT NULL,
    "notes" TEXT,
    "is_amendment" BOOLEAN NOT NULL DEFAULT false,
    "amendment_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cath_lab_safety_timeouts_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "cath_lab_safety_timeouts_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: cath_lab_safety_holds
CREATE TABLE "cath_lab_safety_holds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointment_id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "clinical_remarks" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "declared_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "declared_by" TEXT NOT NULL,
    "cleared_at" TIMESTAMP(3),
    "cleared_by" TEXT,
    "resolution_remarks" TEXT,
    "duration_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cath_lab_safety_holds_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "cath_lab_safety_holds_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: cath_lab_telemetry_logs
CREATE TABLE "cath_lab_telemetry_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointment_id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "fluoroscopy_time_sec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "radiation_dap_gy_cm2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contrast_volume_ml" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "heart_rate_bpm" INTEGER,
    "systolic_bp_mm_hg" INTEGER,
    "diastolic_bp_mm_hg" INTEGER,
    "act_sec" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'MANUAL_ENTRY',
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logged_by" TEXT NOT NULL,
    CONSTRAINT "cath_lab_telemetry_logs_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: cath_lab_vessel_findings
CREATE TABLE "cath_lab_vessel_findings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounter_id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "vessel_name" TEXT NOT NULL,
    "rvd_mm" DOUBLE PRECISION,
    "mld_mm" DOUBLE PRECISION,
    "stenosis_percent" INTEGER NOT NULL,
    "timi_flow" TEXT NOT NULL DEFAULT 'TIMI_3',
    "intervention_type" TEXT,
    "coronary_dominance" TEXT NOT NULL DEFAULT 'RIGHT',
    "lvef_percent" INTEGER,
    "hemostasis_method" TEXT,
    "cpt_code" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" TEXT NOT NULL,
    CONSTRAINT "cath_lab_vessel_findings_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "medical_encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: prescription_refills
CREATE TABLE "prescription_refills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medical_report_id" TEXT NOT NULL,
    "refill_number" INTEGER NOT NULL,
    "refilled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refilled_by" TEXT NOT NULL,
    "refilled_by_name" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prescription_refills_medical_report_id_fkey" FOREIGN KEY ("medical_report_id") REFERENCES "medical_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indices
CREATE INDEX "cath_lab_safety_timeouts_patient_profile_id_idx" ON "cath_lab_safety_timeouts"("patient_profile_id");
CREATE INDEX "cath_lab_safety_holds_appointment_id_status_idx" ON "cath_lab_safety_holds"("appointment_id", "status");
CREATE INDEX "cath_lab_telemetry_logs_appointment_id_logged_at_idx" ON "cath_lab_telemetry_logs"("appointment_id", "logged_at");
CREATE INDEX "cath_lab_vessel_findings_encounter_id_idx" ON "cath_lab_vessel_findings"("encounter_id");
CREATE INDEX "prescription_refills_medical_report_id_refill_number_idx" ON "prescription_refills"("medical_report_id", "refill_number");
```

---

## 5. DUAL-READ / ZERO-DOWNTIME PERSISTENCE STRATEGY

While awaiting server administrator provisioning of `360api_staging`:
1. The backend application currently uses structured delimited JSON within `appointment.notes`, `medical_record.clinical_notes`, and `medical_report.notes`.
2. This design allows immediate 100% operational functionality for all Cath Lab and Refill workflows with zero schema migrations, zero database lock risks, and zero downtime.
3. When the dedicated relational tables are deployed on staging, the service layer will automatically query the dedicated table first, falling back to the delimited notes for historical records, ensuring seamless bidirectional backward compatibility.

