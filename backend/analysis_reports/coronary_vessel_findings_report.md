# CAREID — Coronary Vessel Findings & QCA Report

**Capability:** Quantitative Coronary Angiography (QCA) & Vessel Lesion Documentation (Stage 18)  
**Status:** **IMPLEMENTED AND VERIFIED**  
**Source File:** `src/modules/cath-lab/cath-lab.service.ts`  
**Controller:** `src/modules/cath-lab/cath-lab.controller.ts`

---

## 1. Clinical Specification

Coronary angiography requires structured documentation of arterial anatomy, lesion severity, TIMI flow, and revascularization interventions:

### 1. Arterial Dominance
- `RIGHT`: Posterior descending artery (PDA) arises from the Right Coronary Artery (~85% of population).
- `LEFT`: PDA arises from the Left Circumflex Artery (~10% of population).
- `CO_DOMINANT`: PDA and PLV supplied by both RCA and LCx (~5% of population).

### 2. Anatomical Vessel Tree
Standard enumerated vessel branches:
- `LMCA`: Left Main Coronary Artery
- `LAD`: Left Anterior Descending (Segments: Ostial, Proximal, Mid, Distal)
- `DIAGONAL_1`, `DIAGONAL_2`: Diagonal branches of LAD
- `LCX`: Left Circumflex Artery (Segments: Ostial, Proximal, Mid, Distal)
- `OM_1`, `OM_2`: Obtuse Marginal branches of LCx
- `RAMUS`: Ramus Intermedius (when present)
- `RCA`: Right Coronary Artery (Segments: Proximal, Mid, Distal)
- `PDA`: Posterior Descending Artery
- `PLV`: Posterolateral Ventricular Branch
- `GRAFT_SVG`, `GRAFT_LIMA`, `GRAFT_RIMA`: Bypass conduits

### 3. Lesion Metrics & TIMI Flow
- `stenosisPercentage`: Visual or quantitative caliper diameter stenosis (0% to 100%).
- `timiFlowPre` / `timiFlowPost`:
  - `TIMI_0`: Complete lack of perfusion (no antegrade flow beyond occlusion).
  - `TIMI_1`: Faint flow beyond occlusion, fails to opacify the entire distal bed.
  - `TIMI_2`: Delayed flow; opacifies distal bed but at a slower rate than normal.
  - `TIMI_3`: Normal, prompt antegrade flow opacifying the distal bed completely.

---

## 2. Technical Implementation

### Endpoints
- `POST /api/v1/cath-lab/encounters/:encounterId/vessel-findings` (HTTP 201 Created)
- `GET /api/v1/cath-lab/encounters/:encounterId/vessel-findings` (HTTP 200 OK)

### Processing & Relational Linkage
1. Resolves `encounterId` via `db.medicalEncounter.findUnique` or direct `db.medicalRecord.findUnique`.
2. Validates non-empty `findings` array.
3. Automatically links interventions: If any lesion has `interventionPerformed: true`, the service automatically inserts a corresponding `MedicalProcedure` record in PostgreSQL with CPT code `92928` and stent specifications.
4. Preserves recording clinician ID, timestamp, and writes to `audit_logs`.

---

## 3. Test Evidence

The test suite [`cath-lab.service.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/cath-lab/tests/cath-lab.service.spec.ts) validates:
1. Valid submission documents vessel lesions, dominance, LVEF, and hemostasis method.
2. Automatically generates linked `MedicalProcedure` record for deployed stents.
3. Successfully retrieves persisted findings for the encounter.

