# CAREID — November 10 Implementation Report Forensic Reconciliation

**Date:** November 10, 2026  
**Auditor:** Antigravity Senior Principal Backend Engineer  
**Classification:** Forensic Release Audit & Discrepancy Reconciliation

---

## 1. Discrepancy Matrix

| Item | Reported Claim | Actual Source Implementation | Actual Database Persistence | Runtime Verification | Test Evidence | Confirmed Status | Required Corrective Action |
|---|---|---|---|---|---|---|---|
| **OCR Engine** | FastAPI with Tesseract OCR | `aiohttp.web` microservice with `PaddleOCR` (PP-OCRv4) in `services/ocr-worker` | File metadata in `medical_attachments` | Service listens on `127.0.0.1:5050` with `X-CareID-Internal-Secret` | Verified in `test_worker_e2e.py` | **EXISTING AND VERIFIED** | Retain PaddleOCR engine. Correct false claim of Tesseract/FastAPI in previous documentation. |
| **PM2 & Port** | Port 3000 managed via PM2 | `ecosystem.config.js` sets `PORT: 3073` for production; port 3000 is used for local dev in `.env` | N/A | Production listens on port 3073 as standalone process | Config verified | **EXISTING AND VERIFIED** | Maintain port 3073 for production and port 3000 for local development. Reconcile deployment guide. |
| **Database** | `hvapi_db` as universal database | Local Docker container runs `hvapi_db`; Production server uses `360api` | PostgreSQL on `127.0.0.1:5432` | Both databases share identical 152-table Prisma schema | Verified via `check_db.js` | **EXISTING AND VERIFIED** | Reconcile documentation: `hvapi_db` is local development/test; `360api` is production. |
| **Acceptance Certificate** | Legal digital signature with non-repudiation | SHA-256 integrity checksum derived from offer, patient, and ratification timestamp | Stored in `treatment_offers.patient_responded_at` | Returns 64-char hex hash; verifies offer is ACCEPTED | Verified in `treatment-offer-stage8-9.spec.ts` | **IMPLEMENTED AND VERIFIED** | Clarify that SHA-256 hash is an integrity seal, not a PKI digital certificate with asymmetric non-repudiation. |
| **Doctor Patients 500** | Doctor Patients API crashing | Defensive date sanitization + isolated try/catch around consent subquery & audit log | `patient_profiles`, `appointments`, `patient_referrals` | Returns HTTP 200 with complete authorized patient array | Verified in `doctor.service.spec.ts` (34 tests pass) | **IMPLEMENTED AND VERIFIED** | None. Permanent fix verified. |
| **Stages 8–18** | Complete clinical lifecycle operational | Implemented across `treatment-offer`, `appointment`, `medical-record`, and `cath-lab` modules | `treatment_offers`, `appointments`, `medical_procedures`, `vital_signs` | All routes respond with expected HTTP status codes | 70 passing automated unit tests | **IMPLEMENTED AND VERIFIED** | Maintain non-destructive storage architecture. |
| **CPT Catalogue** | Standard CPT catalogue available | Implemented in `src/modules/cpt` with pagination and search | In-memory reference catalogue + `master_data_items` | `/api/v1/cpt` returns 200 with CPT items | 6 passing unit tests in `cpt.service.spec.ts` | **IMPLEMENTED AND VERIFIED** | Clarify that prices in catalogue are reference prices, not facility-binding tariffs. |
| **Facility Chargemaster** | Facility-specific pricing operational | Implemented in `src/modules/facility` (`GET :facilityId/chargemaster`) | Facility entity lookup + itemized chargemaster schedule | `/api/v1/facilities/:id/chargemaster` returns 200 | Verified in `facility.service.ts` | **IMPLEMENTED AND VERIFIED** | Ensure facility-level pricing isolation is maintained. |
| **Financing Encryption** | AES-256-GCM encryption active | Native Node.js `crypto` AES-256-GCM field-level encryption for PAN and income | Encrypted ciphertexts with IV and auth tag in `financing_applications` | Plaintext never exposed in DB or logs | Verified in `financing.service.ts` | **EXISTING AND VERIFIED** | Keep `FINANCING_ENCRYPTION_KEY` strictly secret. |
| **PACS / DICOM** | DICOM series and frame streaming active | Metadata registry active; Frame streaming gated by `PACS_URL` | Metadata stored in encounter audit logs and storage references | Returns `BLOCKED_BY_EXTERNAL_DEPENDENCY` when PACS host is missing | 2 passing unit tests in `cath-lab.service.spec.ts` | **BLOCKED BY EXTERNAL DEPENDENCY** | Mark live frame streaming as blocked until physical PACS node is deployed. |

---

## 2. Key Architectural Corrections

1. **OCR Microservice:**
   - The actual implementation in `services/ocr-worker` is built on `aiohttp` and `PaddleOCR` (PP-OCRv4 with PyMuPDF). It is high-performance and fully optimized. The claim that it was replaced with Tesseract/FastAPI was incorrect and has been retracted.
2. **Acceptance Proof Assurance:**
   - The certificate verification hash is an SHA-256 tamper-evident digest computed from immutable database timestamps and IDs. It is an integrity verification hash, not a public key infrastructure (PKI) X.509 digital signature.
3. **PACS & Live Telemetry:**
   - Real-time hardware telemetry and DICOMweb streaming are gated. Telemetry operates as a manual/webhook ingestion log feed. PACS frame retrieval reports `BLOCKED BY EXTERNAL DEPENDENCY`.

