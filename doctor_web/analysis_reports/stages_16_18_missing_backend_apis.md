# CareID Doctor Web — Stages 16–18 Missing Backend APIs Specification

**Document Version:** 2.0.0 (Post-Audit Forensic Reconciliation)  
**Target Backend:** `https://360api.vnvision.in/api/v1`  
**Authoritative Reference:** `CareID-Staging.postman_collection.json` (559 documented items)  
**Date:** November 10, 2026  
**Audience:** Backend Engineering Team, Tech Leads, Clinical Solutions Architecture, QA Leads

---

## 1. Executive Summary & Verification Scope

A comprehensive forensic reconciliation was executed comparing:
1. `analysis_reports/stages_16_18_missing_backend_apis.md` (Initial gap draft)
2. `analysis_reports/stages_16_18_api_verification_matrix.md` (Implementation and runtime test matrix)
3. `analysis_reports/stages_16_18_api_integration_report.md` (Engineering execution report)
4. `CareID-Staging.postman_collection.json` (Authoritative Postman contract comprising 559 items across 27 domain folders)

### Forensic Findings:
- **No False Missing APIs:** An API is declared missing **only** after confirming that neither `05. Doctor Portal`, `08. Medical Records`, `10. Appointments, Schedules & Shifts`, `16. File Uploads & Attachments`, nor `20. Clinical Reports & Analytics` contains a controller, service, or database schema supporting the required clinical operation.
- **Strict Classification Enforced:** All endpoints related to Stages 16, 17, and 18 are strictly separated into four distinct architectural tiers:
  1. **Already Implemented APIs:** Documented in Postman, live on backend, integrated and verified in Doctor Web.
  2. **Existing APIs That Need Frontend Integration:** Documented in Postman and live on backend, but currently underutilized in frontend views.
  3. **Existing APIs That Need Backend Enhancement:** Documented in Postman and live, but with schemas too narrow to support specialized cath lab workflows without data loss.
  4. **Completely Missing Backend APIs:** Zero endpoints, schemas, or controllers exist in Postman or backend source.

---

## 2. Four-Way Architectural Classification Matrix

### Category 1: Already Implemented & Verified APIs
These endpoints are fully documented in `CareID-Staging.postman_collection.json`, operational on `https://360api.vnvision.in/api/v1`, integrated into the React codebase, and verified live with HTTP 200/201 responses.

| # | HTTP Method | Endpoint | Postman Folder | Stage Bound | Verified Operation |
|---|:---:|---|---|:---:|---|
| 1 | `GET` | `/api/v1/doctors/treatment-offers/:offerId` | `05. Doctor Portal` | 16, 17, 18 | Resolves authentic offer DTO, CPT code, procedure title, financing package, and version hash. |
| 2 | `GET` | `/api/v1/doctors/patients/:patientProfileId` | `05. Doctor Portal` | 16, 17, 18 | Resolves patient name, MRN, date of birth, blood group, and known allergies. |
| 3 | `GET` | `/api/v1/doctors/patients/:patientProfileId/vitals` | `05. Doctor Portal` | 16 | Resolves baseline triage vitals (systolic/diastolic BP, pulse rate, SpO2, temperature). |
| 4 | `GET` | `/api/v1/appointments` & `/api/v1/appointments/:id` | `10. Appointments, Schedules & Shifts` | 16, 17 | Resolves procedure appointment ID, suite assignment, and scheduled time window. |
| 5 | `PUT` | `/api/v1/appointments/:id/status` | `10. Appointments, Schedules & Shifts` | 16, 17, 18 | Transitions appointment lifecycle status (`SCHEDULED` → `IN_PROGRESS` → `COMPLETED`). |
| 6 | `POST` | `/api/v1/doctors/patients/:patientProfileId/encounters` | `05. Doctor Portal` | 18 | Documents complete surgical encounter with vitals, diagnoses, and procedure line items; returns `MedicalRecord`. |
| 7 | `PUT` | `/api/v1/doctors/patients/:patientProfileId/medical-records/:recordId` | `05. Doctor Portal` | 18 | Amends clinical documentation and physician attestation notes. |
| 8 | `GET` | `/api/v1/doctors/patients/:patientProfileId/medical-records` | `05. Doctor Portal` | 18 | Verifies documented encounter appears in the patient's longitudinal EHR. |

---

### Category 2: Existing APIs That Need Frontend Integration
These endpoints already exist in Postman and are deployed on staging, but the frontend currently uses client-side fallbacks or has not fully wired them into the intra-procedure UI.

| # | HTTP Method | Endpoint | Postman Folder | Target Stage | Required Frontend Integration |
|---|:---:|---|---|:---:|---|
| 1 | `POST` | `/api/v1/medical-records/:id/attachments` | `08. Medical Records` | Stage 18 | **Angiographic Frame Snapshot Upload:** Frontend should allow saving static fluoroscopy frames directly as image attachments linked to the procedure's `MedicalRecord` UUID. |
| 2 | `GET` | `/api/v1/medical-records/:id/attachments` | `08. Medical Records` | Stage 18 | **Procedure Attachment Retrieval:** Hydrate previously captured procedural snapshots or referral EKGs directly within the active workstation. |
| 3 | `POST` | `/api/v1/doctors/patients/:patientProfileId/vitals` | `05. Doctor Portal` | Stage 17 & 18 | **Intra-Op Vitals Checkpoint Logging:** Instead of only logging vitals once inside the encounter payload, call this endpoint to persist discrete hemodynamic checkpoints during procedure progression. |

---

### Category 3: Existing APIs That Need Backend Enhancement
These endpoints exist in Postman, but their request schemas or backend logic are too generic to support specialized cath lab business requirements without flattening data into unstructured text blobs.

| # | HTTP Method | Endpoint | Postman Folder | Target Stage | Required Backend Enhancement |
|---|:---:|---|---|:---:|---|
| 1 | `PUT` | `/api/v1/appointments/:id/status` | `10. Appointments, Schedules & Shifts` | Stage 16 & 17 | **Support Structured Standby Hold Reasons:** Currently only accepts `{ status: string, notes: string }`. Backend should support `{ status: "ON_HOLD", holdReason: "HEMODYNAMIC_INSTABILITY" \| "EQUIPMENT_FAULT" \| "ANAPHYLAXIS", holdStartedAt: string, clinicalRemarks: string }`. |
| 2 | `POST` | `/api/v1/doctors/patients/:patientProfileId/encounters` | `05. Doctor Portal` | Stage 18 | **Support Structured Procedure Telemetry:** Currently `procedures` is an array of `{ name, code, performedAt, notes }`. Backend should add a `metadata` JSONB column to accept `{ accessSite, closureDevice, fluoroTimeMinutes, radiationDapGyCm2, contrastVolumeMl, vesselFindings }` rather than forcing serialization into the `notes` text string. |

---

### Category 4: Completely Missing Backend APIs
Zero endpoints, database tables, or controller handlers exist in `CareID-Staging.postman_collection.json` or the NestJS backend for these five critical capabilities.

| API Code | Proposed Method | Proposed Endpoint | Stage Bound | Clinical Workflow | Priority |
|---|:---:|---|:---:|---|:---:|
| **API-M16** | `POST` | `/api/v1/cath-lab/safety-timeout` | Stage 16 | WHO Surgical Safety 6-Gate Time-Out Verification | **Critical (P0)** |
| **API-M17** | `POST` | `/api/v1/cath-lab/safety-hold`<br>`POST /api/v1/cath-lab/safety-hold/:holdId/clear` | Stage 16 & 17 | Emergency Standby Hold Declaration & Clearance | **High (P1)** |
| **API-M18** | `GET` / `POST` | `/api/v1/cath-lab/telemetry/live`<br>`POST /api/v1/cath-lab/telemetry/log` | Stage 17 & 18 | Real-Time Fluoroscopy & Hemodynamic Telemetry Sync | **High (P1)** |
| **API-M19** | `POST` / `GET` | `/api/v1/cath-lab/encounters/:encounterId/vessel-findings` | Stage 18 | Quantitative Coronary Angiography (QCA) 4-Vessel Tree | **High (P1)** |
| **API-M20** | `POST` / `GET` | `/api/v1/cath-lab/encounters/:encounterId/dicom-series` | Stage 18 | Multi-Frame DICOM Cine Loop Streamer & PACS Frame Linker | **Medium (P2)** |

---

## 3. Comprehensive Specifications for Completely Missing Backend APIs

### 1. API-M16: WHO Surgical Safety Time-Out Checklist Sign-Off
- **1. Stage Number & Workflow:**  
  **Stage 16 — Cath Lab Safety Verification** (Figma Frame `1:14096`). Pre-puncture procedural pause in the catheterization suite prior to vascular sheath insertion.
- **2. Required Business Operation:**  
  The attending interventional cardiologist, circulating nurse, and scrub technologist must execute and ratify a formal 6-gate surgical safety check:
  1. Dual-identity verification & biometric match.
  2. Clinical safety & active allergy safeguards (iodinated contrast, latex, heparin).
  3. Diagnostic imaging & prior angiogram/stress correlation.
  4. Planned procedure, vascular access site (Right Radial vs. Femoral), and contrast limit calculation.
  5. Signed informed surgical consent & financial settlement verification.
  6. Multidisciplinary cath team roster presence.  
  Once ratified, the backend must generate an immutable, cryptographically sealed time-out audit record required for JCAHO, NABH, and medical-legal compliance.
- **3. Existing Related API Endpoints:**  
  - `PUT /api/v1/appointments/:id/status` (Updates general appointment status to `IN_PROGRESS`)
  - `POST /api/v1/doctors/patients/:patientProfileId/encounters` (Creates generic post-visit encounter)
- **4. Why Existing Endpoints Cannot Support the Complete Operation:**  
  - Neither endpoint stores discrete booleans for the 6 WHO gates.
  - No capability to store multidisciplinary team signatures (Attending Doctor, Circulating RN, Scrub Tech).
  - No access-site anatomical validation (Right Radial, Left Radial, Right Femoral).
  - Cannot enforce non-repudiation or store cryptographic time-out SHA-256 seal hashes.
- **5. Proposed HTTP Method & Endpoint:**  
  `POST /api/v1/cath-lab/safety-timeout`  
  `GET /api/v1/cath-lab/safety-timeout/:appointmentId`
- **6. Required Request Payload:**
  ```json
  {
    "appointmentId": "1b5ae56a-d2ac-4884-9c32-7d50ef8d9547",
    "patientProfileId": "787e5187-7859-4320-bb1a-465a57dd086a",
    "treatmentOfferId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "suiteNumber": "Cath Suite #03",
    "safeguards": {
      "patientIdentity": true,
      "clinicalSafety": true,
      "diagnosticImaging": true,
      "plannedProcedure": true,
      "signedConsents": true,
      "teamRoster": true
    },
    "allergyAcknowledged": true,
    "primaryAccessSite": "RIGHT_RADIAL",
    "secondaryAccessSite": "RIGHT_FEMORAL",
    "attendingDoctorId": "1f06067b-e229-4707-84e2-afa27da2e4cd",
    "rosterMembers": [
      { "role": "ATTENDING_PHYSICIAN", "name": "Dr. Sarah Connor, MD", "verified": true },
      { "role": "CIRCULATING_NURSE", "name": "Keith Vance, RN", "verified": true },
      { "role": "SCRUB_TECHNOLOGIST", "name": "J. Morales, CST", "verified": true }
    ],
    "cryptoSealHash": "SHA256-CATH-TIMEOUT-93458-VERIFIED-9B41E8C2"
  }
  ```
- **7. Expected Response:**
  ```json
  {
    "success": true,
    "statusCode": 201,
    "data": {
      "timeoutId": "TO-20261110-88419",
      "appointmentId": "1b5ae56a-d2ac-4884-9c32-7d50ef8d9547",
      "ratifiedAt": "2026-11-10T09:15:00.000Z",
      "status": "RATIFIED",
      "cryptoSealHash": "SHA256-CATH-TIMEOUT-93458-VERIFIED-9B41E8C2",
      "auditLogId": "AUD-991240"
    }
  }
  ```
- **8. Required Database Persistence:**  
  New table `cath_lab_safety_timeouts`:
  - `id` (UUID, Primary Key)
  - `appointment_id` (UUID, Foreign Key to `appointments.id`, Unique Constraint)
  - `patient_profile_id` (UUID, Foreign Key to `patient_profiles.id`)
  - `treatment_offer_id` (UUID, Foreign Key to `treatment_offers.id`)
  - `suite_number` (VARCHAR(64))
  - `safeguards` (JSONB: `{ patientIdentity: boolean, ... }`)
  - `allergy_acknowledged` (BOOLEAN, NOT NULL)
  - `primary_access_site` (ENUM: `RIGHT_RADIAL`, `LEFT_RADIAL`, `RIGHT_FEMORAL`, `LEFT_FEMORAL`, `BRACHIAL`)
  - `roster_members` (JSONB)
  - `crypto_seal_hash` (VARCHAR(128), NOT NULL)
  - `ratified_at` (TIMESTAMP WITH TIME ZONE, NOT NULL)
  - `created_at`, `updated_at` (TIMESTAMP)
- **9. Priority:** **Critical (P0)** — Mandatory for clinical governance and regulatory compliance before live procedural deployment.

---

### 2. API-M17: Emergency Surgical Standby Hold Declaration & Clearance
- **1. Stage Number & Workflow:**  
  **Stages 16 & 17 — Safety Check-in & Encounter Induction** (Figma Frames `1:14508`, `1:14597`). Emergency pause during pre-op verification or induction.
- **2. Required Business Operation:**  
  When acute hemodynamic instability (e.g. abrupt hypotension), severe contrast allergy, or equipment malfunction occurs, the attending physician flags an emergency standby hold. This must:
  1. Record structured hold taxonomy reasons.
  2. Immediately broadcast an alert webhook to the cath lab nursing cart.
  3. Freeze procedure clocks.
  4. Track total hold duration until an explicit clearance action is ratified.
- **3. Existing Related API Endpoints:**  
  - `PUT /api/v1/appointments/:id/status` (Can change status string, but provides no hold workflow or duration calculation)
- **4. Why Existing Endpoints Cannot Support the Complete Operation:**  
  - No support for active hold state vs. resolved hold state.
  - Lacks structured clinical reasons (e.g. `VITALS_DISCREPANCY`, `EQUIPMENT_MALFUNCTION`, `ANESTHESIA_DELAY`).
  - No tracking of `holdStartedAt`, `holdClearedAt`, or `durationSeconds`.
  - Overwriting appointment status to `CANCELLED` or `SCHEDULED` destroys the active suite workflow.
- **5. Proposed HTTP Method & Endpoint:**  
  `POST /api/v1/cath-lab/safety-hold`  
  `POST /api/v1/cath-lab/safety-hold/:holdId/clear`  
  `GET /api/v1/cath-lab/safety-hold/active?appointmentId=:id`
- **6. Required Request Payload:**
  - **Declaration Payload (`POST /api/v1/cath-lab/safety-hold`):**
    ```json
    {
      "appointmentId": "1b5ae56a-d2ac-4884-9c32-7d50ef8d9547",
      "holdCategory": "HEMODYNAMIC_INSTABILITY",
      "clinicalRemarks": "Systolic BP dropped to 82 mmHg following premedication. IV fluid resuscitation initiated.",
      "flaggedByDoctorId": "1f06067b-e229-4707-84e2-afa27da2e4cd"
    }
    ```
  - **Clearance Payload (`POST /api/v1/cath-lab/safety-hold/:holdId/clear`):**
    ```json
    {
      "resolutionNotes": "BP stabilized to 124/78 mmHg following 500mL saline bolus. Anesthesiology cleared resumption.",
      "clearedByDoctorId": "1f06067b-e229-4707-84e2-afa27da2e4cd"
    }
    ```
- **7. Expected Response:**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "holdId": "HOLD-CATH3-9921",
      "appointmentId": "1b5ae56a-d2ac-4884-9c32-7d50ef8d9547",
      "status": "CLEARED",
      "flaggedAt": "2026-11-10T09:20:00.000Z",
      "clearedAt": "2026-11-10T09:34:12.000Z",
      "durationSeconds": 852
    }
  }
  ```
- **8. Required Database Persistence:**  
  New table `cath_lab_safety_holds`:
  - `id` (UUID, Primary Key)
  - `appointment_id` (UUID, Foreign Key to `appointments.id`, Indexed)
  - `hold_category` (ENUM: `HEMODYNAMIC_INSTABILITY`, `ALLERGIC_REACTION`, `EQUIPMENT_MALFUNCTION`, `ANESTHESIA_DELAY`, `PATIENT_REFUSAL`, `CONSENT_AMBIGUITY`)
  - `clinical_remarks` (TEXT, NOT NULL)
  - `flagged_by_doctor_id` (UUID, Foreign Key to `doctors.id`)
  - `flagged_at` (TIMESTAMP WITH TIME ZONE, NOT NULL)
  - `is_active` (BOOLEAN, DEFAULT TRUE)
  - `resolution_notes` (TEXT)
  - `cleared_by_doctor_id` (UUID, Foreign Key to `doctors.id`)
  - `cleared_at` (TIMESTAMP WITH TIME ZONE)
  - `duration_seconds` (INTEGER)
- **9. Priority:** **High (P1)** — Essential for intra-operative patient safety logging and surgical pause analytics.

---

### 3. API-M18: Real-Time Fluoroscopy & Hemodynamic Telemetry Synchronization
- **1. Stage Number & Workflow:**  
  **Stages 17 & 18 — Encounter Induction & Active Documentation** (Figma Frames `1:14597`, `1:15031`). Workstation interface with fluoroscopy C-arm and hemodynamic consoles.
- **2. Required Business Operation:**  
  Intra-operative monitoring workstations in the cath lab display real-time fluoroscopy cumulative timers, radiation DAP dosimetry, contrast agent cumulative volume, and invasive arterial pressure waveforms. The backend must ingest periodic telemetry packets from suite IoT gateways and serve the live state to connected doctor web instances via REST / WebSocket.
- **3. Existing Related API Endpoints:**  
  - `GET /api/v1/doctors/patients/:patientProfileId/vitals` (Queries static outpatient triage vitals: height, weight, BP, temperature)
  - `POST /api/v1/doctors/patients/:patientProfileId/vitals` (Records standard triage vitals)
- **4. Why Existing Endpoints Cannot Support the Complete Operation:**  
  - Standard triage vitals schemas have no fields for fluoroscopy time (minutes/seconds), radiation DAP ($Gy\cdot cm^2$), contrast volume injected (mL), aortic root systolic/diastolic pressure, or activated clotting time (ACT seconds).
  - Calling outpatient vitals endpoints every few seconds pollutes the patient's permanent longitudinal vital signs chart with noisy intra-op ticks.
- **5. Proposed HTTP Method & Endpoint:**  
  `GET /api/v1/cath-lab/telemetry/live?appointmentId=:id`  
  `POST /api/v1/cath-lab/telemetry/log`
- **6. Required Request Payload:**
  ```json
  {
    "appointmentId": "1b5ae56a-d2ac-4884-9c32-7d50ef8d9547",
    "fluoroTimeMinutes": 4.8,
    "radiationDapGyCm2": 32.4,
    "contrastInjectedMl": 65.0,
    "contrastType": "ISOVUE_370",
    "arterialBp": "124/76",
    "heartRateBpm": 72,
    "aorticRootBp": "122/74",
    "lvedpMmHg": 14,
    "actSeconds": 265
  }
  ```
- **7. Expected Response:**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "telemetryId": "TEL-CATH3-88120",
      "appointmentId": "1b5ae56a-d2ac-4884-9c32-7d50ef8d9547",
      "recordedAt": "2026-11-10T09:45:10.000Z",
      "contrastThresholdWarning": false,
      "maxContrastAllowedMl": 180.0
    }
  }
  ```
- **8. Required Database Persistence:**  
  New table `cath_lab_telemetry_logs`:
  - `id` (UUID, Primary Key)
  - `appointment_id` (UUID, Foreign Key to `appointments.id`, Indexed)
  - `fluoro_time_minutes` (NUMERIC(5, 2))
  - `radiation_dap_gy_cm2` (NUMERIC(6, 2))
  - `contrast_injected_ml` (NUMERIC(5, 1))
  - `arterial_bp` (VARCHAR(16))
  - `heart_rate_bpm` (INTEGER)
  - `aortic_root_bp` (VARCHAR(16))
  - `lvedp_mm_hg` (INTEGER)
  - `act_seconds` (INTEGER)
  - `recorded_at` (TIMESTAMP WITH TIME ZONE, NOT NULL)
- **9. Priority:** **High (P1)** — Required for acute contrast-induced nephropathy prevention, ALARA radiation monitoring, and CathPCI registry export.

---

### 4. API-M19: Quantitative Coronary Angiography (QCA) & 4-Vessel Lesion Tree
- **1. Stage Number & Workflow:**  
  **Stage 18 — Active Procedure Documentation** (Figma Frame `1:15031`). Coronary anatomical diagram and lesion quantification panel.
- **2. Required Business Operation:**  
  During diagnostic catheterization and PCI, the cardiologist documents stenosis findings across each primary coronary branch (Left Main, LAD, LCx, RCA) including stenosis percentage, TIMI flow grade (TIMI 0 to 3), lesion morphology (calcified, bifurcated), and intervention status (medical therapy vs. drug-eluting stent).
- **3. Existing Related API Endpoints:**  
  - `POST /api/v1/doctors/patients/:patientProfileId/encounters` (Accepts `procedures` array with `name`, `code`, and `notes` text string)
- **4. Why Existing Endpoints Cannot Support the Complete Operation:**  
  - An unindexed text string inside `procedures[].notes` cannot support structured coronary queries (e.g. "Find all patients with LAD stenosis $\ge 70\%$").
  - Cannot enforce strict TIMI flow enums (`TIMI_0`, `TIMI_1`, `TIMI_2`, `TIMI_3`).
  - Does not support SYNTAX score computation or longitudinal lesion progression comparisons across serial catheterizations.
- **5. Proposed HTTP Method & Endpoint:**  
  `POST /api/v1/cath-lab/encounters/:encounterId/vessel-findings`  
  `GET /api/v1/cath-lab/encounters/:encounterId/vessel-findings`
- **6. Required Request Payload:**
  ```json
  {
    "encounterId": "103941ad-08e6-455e-8f67-d9202bc7b8f2",
    "vesselFindings": [
      {
        "vessel": "LM",
        "segmentName": "Left Main Coronary Artery",
        "stenosisPercent": 0,
        "timiFlow": "TIMI_3",
        "description": "Smooth caliber without narrowing."
      },
      {
        "vessel": "LAD",
        "segmentName": "Left Anterior Descending",
        "stenosisPercent": 40,
        "timiFlow": "TIMI_3",
        "description": "Eccentric atheromatous plaque in mid-vessel."
      },
      {
        "vessel": "LCX",
        "segmentName": "Left Circumflex",
        "stenosisPercent": 20,
        "timiFlow": "TIMI_3",
        "description": "Mild luminal irregularity."
      },
      {
        "vessel": "RCA",
        "segmentName": "Right Coronary Artery",
        "stenosisPercent": 30,
        "timiFlow": "TIMI_3",
        "description": "Dominant vessel, mild proximal narrowing."
      }
    ],
    "coronaryDominance": "RIGHT",
    "lvefPercent": 58,
    "hemostasisMethod": "TR_BAND",
    "trBandAirVolumeMl": 13.0,
    "finalImpression": "Non-obstructive coronary artery disease (40% mid-LAD). No revascularization indicated."
  }
  ```
- **7. Expected Response:**
  ```json
  {
    "success": true,
    "statusCode": 201,
    "data": {
      "id": "QCA-20261110-44910",
      "encounterId": "103941ad-08e6-455e-8f67-d9202bc7b8f2",
      "totalVesselsScored": 4,
      "maxStenosisPercent": 40,
      "maxStenosisVessel": "LAD",
      "revascularizationIndicated": false,
      "updatedAt": "2026-11-10T10:14:00.000Z"
    }
  }
  ```
- **8. Required Database Persistence:**  
  New table `cath_lab_coronary_findings`:
  - `id` (UUID, Primary Key)
  - `encounter_id` (UUID, Foreign Key to `medical_records.id`, Unique Constraint)
  - `coronary_dominance` (ENUM: `RIGHT`, `LEFT`, `CO_DOMINANT`)
  - `lvef_percent` (INTEGER)
  - `hemostasis_method` (ENUM: `TR_BAND`, `MANUAL_COMPRESSION`, `ANGIO_SEAL`, `PERCLOSE`)
  - `tr_band_air_volume_ml` (NUMERIC(4, 1))
  - `final_impression` (TEXT)
  - `vessel_findings` (JSONB array containing segment-level stenosis, TIMI flow, and notes)
  - `created_at`, `updated_at` (TIMESTAMP)
- **9. Priority:** **High (P1)** — Core clinical deliverable of an interventional cardiac catheterization report.

---

### 5. API-M20: DICOM Angiographic Cine Series Streaming & PACS Frame Linker
- **1. Stage Number & Workflow:**  
  **Stage 18 — Active Procedure Documentation** (Figma Frame `1:15031`). Live fluoroscopy cine loop playback and keyframe capture.
- **2. Required Business Operation:**  
  Workstations play multi-frame angiographic cine runs (e.g., Spider view RAO 30° / CAUD 25° at 15 fps) and allow interventionalists to tag specific keyframes (e.g., maximal stenosis frame) for permanent embedding in the post-procedure summary.
- **3. Existing Related API Endpoints:**  
  - `POST /api/v1/medical-records/:id/attachments` (Attaches single generic PDF/image files)
  - `POST /api/v1/attachments` (Generic file upload)
- **4. Why Existing Endpoints Cannot Support the Complete Operation:**  
  - Generic attachment endpoints accept file blobs without DICOM Web protocol compliance (WADO-RS / STOW-RS).
  - No extraction of DICOM header attributes: Study Instance UID, Series Instance UID, SOP Class UID, projection angles (RAO/LAO, CRAN/CAUD), frame count, and acquisition frame rate.
  - Cannot stream multi-frame video chunks with HTML5 Canvas / WebGL hardware acceleration.
- **5. Proposed HTTP Method & Endpoint:**  
  `POST /api/v1/cath-lab/encounters/:encounterId/dicom-series`  
  `GET /api/v1/cath-lab/encounters/:encounterId/dicom-series`  
  `GET /api/v1/cath-lab/dicom-series/:seriesId/frames/:frameNumber`
- **6. Required Request Payload:**
  ```json
  {
    "encounterId": "103941ad-08e6-455e-8f67-d9202bc7b8f2",
    "pacsStudyUid": "1.2.840.113619.2.55.3.60468841.981",
    "seriesNumber": 3,
    "seriesDescription": "Coronary Angio - Spider View RAO 30 CAUD 25",
    "projection": {
      "primaryAngle": "RAO 30",
      "secondaryAngle": "CAUD 25"
    },
    "totalFrames": 45,
    "frameRateFps": 15,
    "keyFrames": [18, 24],
    "storageS3Key": "dicom/2026-11-10/study-981/series-3.dcm"
  }
  ```
- **7. Expected Response:**
  ```json
  {
    "success": true,
    "statusCode": 201,
    "data": {
      "seriesId": "DCM-SERIES-99142",
      "encounterId": "103941ad-08e6-455e-8f67-d9202bc7b8f2",
      "streamUrl": "https://pacs.vnvision.in/wado/studies/1.2.840/series/3",
      "keyFrameThumbnails": [
        "https://cdn.vnvision.in/dicom/series-3/frame-18.jpg",
        "https://cdn.vnvision.in/dicom/series-3/frame-24.jpg"
      ]
    }
  }
  ```
- **8. Required Database Persistence:**  
  New table `cath_lab_dicom_series`:
  - `id` (UUID, Primary Key)
  - `encounter_id` (UUID, Foreign Key to `medical_records.id`, Indexed)
  - `pacs_study_uid` (VARCHAR(128))
  - `series_number` (INTEGER)
  - `series_description` (VARCHAR(255))
  - `projection_rao_lao` (VARCHAR(32))
  - `projection_cran_caud` (VARCHAR(32))
  - `total_frames` (INTEGER)
  - `frame_rate_fps` (INTEGER)
  - `key_frames` (INTEGER[])
  - `storage_s3_key` (VARCHAR(512))
  - `created_at` (TIMESTAMP WITH TIME ZONE)
- **9. Priority:** **Medium (P2)** — High clinical value for imaging review; non-blocking for procedural sign-off if static captures are attached via existing `POST /medical-records/:id/attachments`.

---

## 4. Technical Summary for Backend Engineering Sprints

| API Code | HTTP Method | Proposed Path | Bound Stage | Priority | Immediate Frontend Workaround Active | Target Sprint |
|---|:---:|---|:---:|:---:|---|:---:|
| **API-M16** | `POST` | `/api/v1/cath-lab/safety-timeout` | Stage 16 | **Critical (P0)** | Ratifies via `PUT /appointments/:id/status` with formatted safety notes | Sprint 1 |
| **API-M17** | `POST` | `/api/v1/cath-lab/safety-hold` | Stage 16 & 17 | **High (P1)** | Local modal state + appointment status notes | Sprint 1 |
| **API-M18** | `GET/POST` | `/api/v1/cath-lab/telemetry/live` | Stage 17 & 18 | **High (P1)** | Dynamic initial state hydrated from `GET .../vitals` | Sprint 2 |
| **API-M19** | `POST` | `/api/v1/cath-lab/encounters/:id/vessel-findings` | Stage 18 | **High (P1)** | Serialized into `POST .../encounters` procedure line item notes | Sprint 2 |
| **API-M20** | `POST` | `/api/v1/cath-lab/encounters/:id/dicom-series` | Stage 18 | **Medium (P2)** | Client-side Canvas cine playback simulation | Sprint 3 |
