# CareID Doctor Web: Master Implementation Backlog & Phased Execution Plan (Reconciled)

**Document ID:** CAREID-BACKLOG-DOCWEB-001-RECONCILED  
**Project Code:** CAREID-MASTER-DOCTOR-WEB-001 / CAREID-MASTER-DOCTOR-WEB-002  
**Target:** CareID Doctor Web Application, NestJS Backend & PostgreSQL Database  
**Authoritative Sources:** `HEALTH VAULT 360.pdf`, `Care ID_ CR Sheet.xlsx`, `CAREID AIO FIGMA.fig`, and active codebase.  
**Execution Policy:** **STRICT SEQUENTIAL BATCHING WITH CLIENT APPROVAL CHECKPOINTS**  

---

## 1. Source-Document Conflict Analysis & Reconciliation

| Area of Conflict | Source A (`HEALTH VAULT 360.pdf`) | Source B (`Care ID_ CR Sheet.xlsx`) | Source C (`CAREID AIO FIGMA.fig`) | Authoritative Resolution & Contractual Guidance |
| :--- | :--- | :--- | :--- | :--- |
| **Specialized Cath Lab & Surgical Modules** | Zero mention of Cath Lab, surgical time-outs, fluoroscopy, or cardiac procedures. Focuses on general outpatient Health Vault. | Zero mention of Cath Lab. CR-02 introduces treatment financing; CR-04 introduces appointment booking. | 5 illustrative frames (`1:14096` to `1:16047`) displaying an example surgical walkthrough of Treatment Offer #TR-8921. | **FORMALLY DESCOPED FROM DOCTOR WEB**. Classified as Category C/D unapproved expansion. The engineering proposal for Batch 4 Cath Lab was rejected. Code is preserved as dormant/specialized. |
| **QR Code Scanning Architecture** | Doctor scans patient QR code from Apple/Google Wallet. | Silent on hardware mechanism. | Illustrates QR scanning action. | **Camera QR assigned to Flutter Doctor App**. Doctor Web utilizes patient directory search and direct URL routing (`/patients/:id`). Backend `POST /api/v1/qr/verify` is verified. |
| **Pharmacy Operations vs Prescriptions** | Doctor edits/issues prescriptions. Patient downloads Health Card. | CR-08 mandates prescription pickup reminder notifications. | Prescriptions screen and dosage editor. | **In-Scope**: Electronic prescribing, PDF export, pickup reminders.<br>**Out-of-Scope**: Pharmacy drug inventory, POS, cash register, dispensing. |
| **Laboratory Operations vs Reports** | Doctor views and uploads medical records and X-rays. | Synchronized patient records. | Diagnostic report viewer and panic alerts. | **In-Scope**: Diagnostic report viewing, upload, OCR review.<br>**Out-of-Scope**: Lab specimen collection, analyzer ingestion, lab technician entry. |
| **Human vs Veterinary Healthcare** | Defines human patient and family health card. | Focuses on healthcare financing and appointments. | General clinical layouts. | **Option A Approved**: Dual role-separated workspaces (`HUMAN_DOCTOR` and `VETERINARIAN`) with strict species isolation. |

---

## 2. Completed & Verified Batches (Accepted Core)

### Batch 1: Longitudinal EHR & Clinical Documentation (ACCEPTED)
- **Longitudinal Medical History**: Condition timeline, surgical history, PostgreSQL persistence.
- **Physiological Vitals & Diagnostics**: Vitals trends, blood pressure, BMI, PostgreSQL persistence.
- **Structured SOAP Clinical Documentation**: 4-quadrant SOAP clinical note editor, clinician attribution.
- **Diagnostic Pathology Reports**: Panel results, normal/panic reference ranges, laboratory verification.

### Batch 2: Electronic Prescriptions & Document Exports (ACCEPTED)
- **Electronic Prescriptions Lifecycle**: Active medication management, dosage, frequency, refills, status tracking.
- **Prescription PDF Document Export**: Verified binary PDF streaming with digital clinician stamp.
- **Referral PDF Document Export**: Verified binary PDF streaming for outgoing clinical referrals.

### Batch 3: Role-Separated Workspaces & Veterinary Health Vault (ACCEPTED)
- **Role-Separated Clinical Workspaces**: Strict clinical isolation between `HUMAN_DOCTOR` and `VETERINARIAN`.
- **Veterinary Health Vault**: Dedicated dashboard, pet profile, rabies/DHPP vaccination records in PostgreSQL.
- **Single-Specialty Dual-Role Auth Defect Fix**: Verified with 15/15 automated role tests and browser tests.
- **Flutter QR API Contract**: Verified `POST /api/v1/qr/verify` contract with audit logging.

---

## 3. Remaining Phased Implementation Backlog

### Batch 4: Doctor Schedule & Slot Availability Management + Prescription Pickup Reminders (COMPLETED & VERIFIED)
- **Status**: **ACCEPTED & VERIFIED (GOAL 003)**
- **In-Scope Requirements**:
  1. `CR-03`: AI-enabled vacant/cancelled slot listing in Doctor Web — Verified.
  2. `CR-04`: Working hours configuration, weekly availability editor, slot durations at `/settings/schedule` — Verified.
  3. `CR-08`: Prescription pickup reminder toggle and reminder hours selector in prescribing modal — Verified in PostgreSQL.
- **Frontend Components**:
  - `doctor_web/src/pages/settings/ScheduleManagementPage.tsx` (replaces `/settings/schedule` placeholder `1:9120`).
  - `doctor_web/src/pages/records/PrescriptionsPage.tsx` (reminder controls & badge).
- **Backend Endpoints**:
  - `GET /api/v1/schedules`, `POST /api/v1/schedules`, `GET /api/v1/schedules/:id/slots`.

### Batch 5: Facility Management & Administrative Delegation + 2-Way Office Communication (COMPLETED & VERIFIED)
- **Status**: **ACCEPTED & VERIFIED (GOAL 003)**
- **In-Scope Requirements**:
  1. `PRD-FAC-01`: Doctor affiliated facilities view with operational status — Verified.
  2. `PRD-FAC-02`: Facility staff, departments, rooms, and doctor roster directory — Verified.
  3. `CR-07`: Clinician 2-way messaging console, inquiry queue, and quick-reply templates — Verified.
- **Frontend Components**:
  - `doctor_web/src/pages/facilities/FacilityManagementPage.tsx`.
  - `doctor_web/src/pages/communication/OfficeChatConsolePage.tsx`.
- **Backend Endpoints**:
  - `GET /api/v1/facilities`, `GET /api/v1/facilities/:id/rooms`, `GET /api/v1/facilities/:id/departments`, `GET /api/v1/conversations`.

### Batch 6: Advanced Clinical Reports, PDF/Excel Exports & Bi-Directional EHR Sync (COMPLETED & VERIFIED)
- **Status**: **ACCEPTED & VERIFIED (GOAL 003)**
- **In-Scope Requirements**:
  1. `PRD-DASH-03`: Reports Dashboard exports in CSV and PDF format — Verified.
  2. `PRD-REP-02`: Clinical outcomes dashboard (`1:7120`) at `/reports/outcomes` — Verified.
  3. `PRD-REP-03`: Custom dataset export and HIPAA access audit log viewer (`1:7230`) at `/reports/exports` — Verified.
  4. `CR-06`: Bi-directional EHR synchronization monitor and manual sync trigger at `/settings/ehr` — Verified.
- **Frontend Components**:
  - `doctor_web/src/pages/reports/ClinicalOutcomesPage.tsx`.
  - `doctor_web/src/pages/reports/AuditExportCenterPage.tsx`.
  - `doctor_web/src/pages/settings/EhrIntegrationPage.tsx`.

---

## 4. Implementation Governance Directive

> [!NOTE]
> **CAREID-MASTER-DOCTOR-WEB-003 STATUS: COMPLETE.**  
> All confirmed client-required Doctor Web features across Batches 1 through 6 are fully implemented, connected to PostgreSQL, and verified with 100% passing tests. Cath Lab scope remains preserved as dormant. Zero Flutter or Admin Web code was touched.
