# CAREID — DICOM / PACS Integration & Imaging Architecture Report

**Capability:** DICOM XA Angiography Series & PACS Integration (Stage 18)  
**Status:** **BLOCKED BY EXTERNAL DEPENDENCY** (Live PACS Node) / **IMPLEMENTED AND VERIFIED** (Metadata Registry)  
**Source File:** `src/modules/cath-lab/cath-lab.service.ts`  
**Controller:** `src/modules/cath-lab/cath-lab.controller.ts`

---

## 1. Forensic Infrastructure Inspection

An inspection of the local, staging, and configuration environments was conducted to evaluate readiness for medical imaging:

| Infrastructure Component | Configured / Available? | Evidence |
|---|---|---|
| Backblaze B2 Storage | **Yes** | `B2_ENDPOINT`, `B2_BUCKET_NAME`, `B2_KEY_ID`, `B2_APPLICATION_KEY` configured in `.env` |
| Local Disk Attachment Storage | **Yes** | `uploads/attachments/` operational with SHA-256 validation |
| Dedicated PACS Server | **No** | No PACS host, DICOM AET, or port configured in `.env` or `.env.staging.example` |
| DICOMweb Archive (WADO-RS / QIDO-RS) | **No** | No active Orthanc or dcm4chee node reachable in current environment |

---

## 2. Technical Implementation

To ensure standards compatibility without faking unavailable services:

### Endpoints Implemented:
1. `POST /api/v1/cath-lab/encounters/:encounterId/dicom-series` (HTTP 201 Created)
   - Registers standards-compliant DICOM study and series metadata:
     - `studyInstanceUid` (e.g. `1.2.840.10008.5.1.4.1.1.12.1...`)
     - `seriesInstanceUid`
     - `modality` (`XA` - X-Ray Angiography)
     - `seriesDescription` (e.g. "LAD Cranial 30/30 Run 02")
     - `numberOfFrames`
     - `keyFrameNumbers` (indices of key cine frames)
     - `storageUrl` (presigned B2 attachment URL or DICOM archive reference)
     - `kvp` and `exposureTimeMs`
2. `GET /api/v1/cath-lab/encounters/:encounterId/dicom-series` (HTTP 200 OK)
   - Returns all registered angiography series for the encounter.
3. `GET /api/v1/cath-lab/dicom-series/:seriesId/frames/:frameNumber` (HTTP 200 OK)
   - **External Dependency Gate:** When `process.env.PACS_URL` is undefined, honestly returns:
     ```json
     {
       "status": "BLOCKED_BY_EXTERNAL_DEPENDENCY",
       "message": "Direct PACS/DICOMweb frame streaming requires an active PACS archive (Orthanc/dcm4chee) configured via PACS_URL.",
       "seriesId": "...",
       "frameNumber": 12,
       "configuredPacsHost": null
     }
     ```
   - Does NOT fabricate streaming binary image bytes when the PACS archive is offline.

---

## 3. Test Evidence

The test suite [`cath-lab.service.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/cath-lab/tests/cath-lab.service.spec.ts) validates:
1. Valid DICOM series metadata registers with study UID, series UID, modality, and frame count.
2. Frame retrieval cleanly returns `BLOCKED_BY_EXTERNAL_DEPENDENCY` status when the PACS host is unconfigured.

