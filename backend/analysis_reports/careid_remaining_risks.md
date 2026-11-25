# CAREID CLINICAL NETWORK — REMAINING RISKS & MITIGATION REPORT

**Document ID:** CR-RISKS-2026-11-10  
**Milestone:** Final Staging Acceptance & Regression Verification  
**Scope:** Forensic Risk Assessment across Architecture, Infrastructure, Data Integrity & Clinical Operations  
**Status:** ACTIVE RISK REGISTER & MITIGATION BLUEPRINT

---

## 1. RESIDUAL RISK TAXONOMY

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CAREID RESIDUAL RISKS                           │
├─────────────────────┬────────────────────┬─────────────────────────────┤
│ Category            │ Severity / Impact  │ Mitigation State            │
├─────────────────────┼────────────────────┼─────────────────────────────┤
│ 1. PACS Live Frames │ MEDIUM (Clinical)  │ Graceful 503 Fallback Active│
│ 2. C-Arm Telemetry  │ LOW (Operational)  │ Manual Feed Fully Functional│
│ 3. CPT/Chargemaster │ LOW (Commercial)   │ In-Memory Core Catalogue    │
│ 4. Notes Delimited  │ LOW (Architectural)│ Strict Regex Isolation Done │
│ 5. Secret Security  │ HIGH (Security)    │ Verified AES-256-GCM        │
│ 6. OCR Dependencies │ MEDIUM (DevOps)    │ Verified aiohttp/PaddleOCR  │
└─────────────────────┴────────────────────┴─────────────────────────────┘
```

---

## 2. DETAILED RISK ASSESSMENT & MITIGATION STRATEGIES

### Risk 1: PACS Binary Frame Retrieval Gated by External Dependency
- **Risk Description:** If clinicians attempt to retrieve live cine-loop frames via `GET /cath-lab/dicom-series/:seriesId/frames/:frameNumber` without an active hospital PACS archive, the backend returns HTTP 503 Service Unavailable.
- **Root Cause:** Staging and local test environments lack an external DICOMweb/WADO-RS PACS node (e.g. Orthanc, dcm4chee, GE Centricity).
- **Mitigation Implemented:**
  - The backend safely handles this condition by returning HTTP 503 with a structured, transparent error message (`status: "BLOCKED_BY_EXTERNAL_DEPENDENCY"`).
  - Metadata registration (`POST /dicom-series`) and series listings (`GET /dicom-series`) operate completely and store permanent `storageKey` references in PostgreSQL.
- **Production Action Item:** Network and configure `PACS_URL` upon commissioning in the hospital data center.

---

### Risk 2: Direct C-Arm Real-Time Hardware Telemetry Unattached
- **Risk Description:** The backend cannot automatically stream real-time radiation exposure directly from the fluoroscopy machine without an active hardware interface (RS-232 / DICOM MPPS gateway).
- **Root Cause:** Hardware interface bridge is absent in staging.
- **Mitigation Implemented:**
  - The manual telemetry logging endpoint (`POST /cath-lab/telemetry/log`) is fully operational and verified.
  - The API response explicitly declares `dataSource: "MANUAL_LOG_FEED"` and `cArmHardwareBridge: "STANDBY_UNCONNECTED"`.
  - Calculations for cumulative DAP ($1\text{ Gy}\cdot\text{cm}^2 = 10,000\text{ mGy}\cdot\text{cm}^2$), fluoroscopy duration, and MAP are deterministically verified by unit tests.
- **Production Action Item:** If the hospital cath lab suite requires direct machine telemetry, provision a C-arm serial gateway adapter.

---

### Risk 3: In-Memory CPT Catalogue & Static Facility Chargemaster
- **Risk Description:** The database schema does not currently contain dedicated `cpt_codes` or `facility_chargemasters` tables. The system relies on an in-memory catalogue of 13 core cardiology/diagnostic codes and a static 8-item default chargemaster in PKR.
- **Root Cause:** Historical claims of 9,944 database-backed CPT codes were unverified report narratives; no such tables exist in `prisma/schema.prisma`.
- **Mitigation Implemented:**
  - The existing in-memory service provides paginated search, category filtering, RVU ratings, and base charges for primary cath lab procedures.
  - `POST /cath-lab/encounters/:encounterId/vessel-findings` enforces clinical validation using `APPROVED_CORONARY_CPT_CODES` and maps procedures without guessing.
- **Production Action Item:** If dynamic facility-specific custom tariffs are required by hospital commercial teams, plan and execute a backward-compatible Prisma migration.

---

### Risk 4: Clinical Data Stored in Delimited Notes Fields
- **Risk Description:** High-frequency procedural telemetry, QCA findings, and checklists are serialized into delimited markdown blocks within `Appointment.notes` and `MedicalRecord.clinicalNotes`.
- **Root Cause:** Initial design placed multi-stage intra-op data in notes to avoid schema migrations.
- **Mitigation Implemented:**
  - Implemented boundary lookahead regexes (`/(?=(\n--- [A-Z0-9_]+ ---|$))/`) across all section parsers.
  - Updating one section (e.g. WHO checklist) strictly preserves all other sections without truncation.
  - Dual-persistence ensures that in-memory state is rehydrated upon process restart.
- **Production Action Item:** For long-term enterprise scalability (>100,000 procedures), migrate intra-op records into dedicated relational tables (`CathLabTimeout`, `CathLabHold`, `CathLabTelemetry`, `CathLabQCA`).

---

### Risk 5: Python OCR Worker Runtime Dependencies on aaPanel
- **Risk Description:** If the staging aaPanel server lacks required Linux shared libraries (`libgomp.so.1`, `libGL.so.1`) or Python 3.10+, the OCR worker on port 5050 will fail to start.
- **Mitigation Implemented:**
  - `requirements.txt` specifies exact verified versions: `aiohttp`, `paddleocr==2.7.3`, `paddlepaddle`, `PyMuPDF`.
  - `server.py` and `OcrWorkerClient` use non-blocking HTTP health probes on `http://127.0.0.1:5050/health`.
  - Failures in the OCR worker degrade gracefully into `OCR_FAILED` status in PostgreSQL without crashing the NestJS API.
- **Production Action Item:** Run `apt-get install -y libgl1 libgomp1 python3-venv` on the host prior to worker startup.

---

### Risk 6: Production Key & Secret Configuration
- **Risk Description:** If `FINANCING_ENCRYPTION_KEY` is not exactly 64 hexadecimal characters, financing encryption will fail. If `CAREID_OCR_SECRET` does not match between backend and worker, OCR calls will return HTTP 403.
- **Mitigation Implemented:**
  - Cryptographic service validates 64-character hex format at startup.
  - Clear, descriptive startup warnings are logged if secrets are misconfigured.
- **Production Action Item:** Populate environment variables via aaPanel secure environment settings before launch.

