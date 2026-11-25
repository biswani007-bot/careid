# CAREID CLINICAL NETWORK — DICOM / PACS SECURITY & INTEGRATION REPORT

**Document ID:** CR-DICOM-SEC-2026-11-10  
**Milestone:** Final Forensic Verification & Release Acceptance  
**Endpoints:** `POST /api/v1/cath-lab/encounters/:encounterId/dicom-series`, `GET /api/v1/cath-lab/encounters/:encounterId/dicom-series`, `GET /api/v1/cath-lab/dicom-series/:seriesId/frames/:frameNumber`  
**Inspected Source:** [`cath-lab.dto.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/cath-lab/cath-lab.dto.ts), [`cath-lab.service.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/cath-lab/cath-lab.service.ts)  
**Status:** PASS WITH EXTERNAL DEPENDENCY (METADATA VERIFIED; STREAMING HONESTLY GATED)

---

## 1. ARCHITECTURAL BOUNDARY & SEPARATION

A critical principle of this forensic verification is distinguishing between:
1. **DICOM Series Metadata Registry (Software Component):** Cataloging study/series UIDs, frame counts, keyframe indices, and storage references in PostgreSQL.
2. **PACS Binary Frame Streaming (External Infrastructure):** Direct HTTP/WADO-RS streaming from hospital imaging archives (Orthanc, dcm4chee, GE, Philips, Siemens PACS).

The CareID backend does NOT fabricate image frames or falsely claim that hospital PACS streaming is functional in the development/staging environment.

---

## 2. SECURITY & VALIDATION CONTROLS AUDITED

### 2.1 UID Integrity & Duplicate Prevention
- **Study Instance UID & Series Instance UID:** Validated as non-empty strings conforming to DICOM UID standards.
- **Series Uniqueness:** Attempting to register the same `seriesInstanceUid` more than once for an encounter throws HTTP 409 Conflict.

### 2.2 Keyframe Bounds Validation
- In `CathLabService.registerDicomSeries`, every index in `keyFrameNumbers` is validated against `numberOfFrames`.
- Any index $k < 1$ or $k > \text{numberOfFrames}$ is rejected with HTTP 400 Bad Request.

### 2.3 Storage Reference Strategy (Private Object Keys vs Presigned URLs)
- Storing temporary presigned URLs (which expire in 15–60 minutes) in clinical records causes silent link breakage.
- The backend accepts and stores `storageKey?: string` representing permanent private object identifiers (e.g. `dicom/patients/<id>/encounters/<id>/series-01.dcm`).
- Authorized short-lived retrieval URLs are generated dynamically upon authenticated request through the B2 storage service.

### 2.4 Patient & Encounter Isolation
- Encounters are strictly resolved against `medical_encounters` and verified against the patient's parent `medical_record`.
- Cross-patient attachment of DICOM studies is prevented at the database relationship layer.

### 2.5 Frame Streaming Fallback (`BLOCKED BY EXTERNAL DEPENDENCY`)
When `PACS_URL` / `DICOMWEB_URL` is unconfigured, requesting frames returns HTTP 503 Service Unavailable:
```json
{
  "status": "BLOCKED_BY_EXTERNAL_DEPENDENCY",
  "message": "Direct PACS/DICOMweb frame streaming requires an active PACS archive (Orthanc/dcm4chee) configured via PACS_URL.",
  "seriesId": "series-uuid-1",
  "frameNumber": 12,
  "configuredPacsHost": null
}
```

---

## 3. AUTOMATED VERIFICATION EVIDENCE

Automated tests in `src/modules/cath-lab/tests/cath-lab.service.spec.ts`:
- `should register DICOM series metadata and persist to medical record`: **PASS**
- `should reject keyframe numbers that exceed total number of frames`: **PASS**
- `should reject duplicate seriesInstanceUid for the same encounter`: **PASS**
- `should return BLOCKED_BY_EXTERNAL_DEPENDENCY for frame streaming when PACS node is unconfigured`: **PASS**

