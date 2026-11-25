# CAREID CPT / PROCEDURE CATALOGUE AUDIT & REMEDIATION REPORT (AUDIT-010)

**Document Reference:** `CAREID_CPT_PROCEDURE_AUDIT_010.md`  
**Goal Identifier:** `/goal CAREID-DOCTOR-CPT-PROCEDURE-CATALOGUE-AUDIT-010`  
**Execution Date:** November 24, 2026  
**Auditor / Engineer:** Antigravity AI Engineering Assistant  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

An audit was conducted on the Doctor Web application field labeled **"Target Procedure / CPT Code *"** to determine whether its options were hardcoded or backed by a persistent database catalogue, assess its clinical and financial requirements, and implement necessary remediation.

### Key Audit Findings:
1. **Hardcoded Status:** **YES (Hybrid — Backend Hardcoded with Frontend API Integration)**.
   - The Doctor Web frontend dynamically requested procedure options from `GET /api/v1/cpt?page=1&limit=50`.
   - However, the Backend service (`backend/src/modules/cpt/cpt.service.ts`) served these options from a **static in-memory array (`STANDARD_CPT_CATALOGUE`) containing exactly 13 hardcoded procedures**.
   - The Prisma ORM schema contained **no model** for procedure or CPT codes. The backend's `PrismaService` was injected into `CptService` but never queried for CPT/procedure records.
2. **Clinical & Regulatory Scope:**
   - CPT® (Current Procedural Terminology) is copyrighted by the American Medical Association (AMA).
   - In CareID / Health Vault 360, this field is critical for **Treatment Offers (CR-02 / Patient Financing)**, **Procedure Scheduling (CR-04)**, **Cath Lab Clinical Telemetry**, and **Medical Records / EHR**.
   - Facility-specific procedures (e.g., local clinical workflows or unlisted procedures) must not be misrepresented as official AMA CPT codes.
3. **Remediation Completed:**
   - Implemented an idempotent, database-backed PostgreSQL table `procedure_catalogue` in `careid_integration_db` via `CptService`.
   - Seeded baseline standard procedures with an explicit `isOfficialCpt` boolean flag to distinguish AMA CPT codes from facility-specific local procedure codes (`LOCAL-...`).
   - Implemented full Admin CRUD capabilities: `POST /api/v1/cpt`, `PUT /api/v1/cpt/:code`, and `DELETE /api/v1/cpt/:code` (soft deactivation with active state enforcement).
   - Upgraded Doctor Web with live search filtering, procedure badges, and inactive state handling.
   - Created the Admin Web procedure service (`Admin_web/src/services/procedureService.ts`) for administrative catalogue management.
   - Added automated unit tests (`backend/src/modules/cpt/tests/cpt.service.spec.ts`) — all 9 tests passing.
   - Built and validated all three workspaces (`backend`, `doctor_web`, and `Admin_web`) with zero TypeScript errors.

---

## 2. Phase 1 — Source Code Audit

### 2.1 Exact Component Location & Line Numbers
- **Frontend Component:** `TreatmentOfferCreatePage`
- **File Path:** `D:\careid\doctor_web\src\pages\treatment-offers\TreatmentOfferCreatePage.tsx`
- **Exact Line Numbers:**
  - Field Container & Label: Lines 887–891:
    ```tsx
    <div>
      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
        Target Procedure / CPT Code *
      </label>
    ```
  - Dropdown Selection Element: Lines 908–936:
    ```tsx
    <select
      className={`w-full text-xs rounded border bg-white dark:bg-neutral-800 ...`}
      value={form.cptCode}
      onChange={(e) => {
        const selected = cptCatalog.find((c) => c.code === e.target.value);
        setForm((prev) => ({
          ...prev,
          cptCode: e.target.value,
          procedureName: selected?.shortDescription || selected?.name || prev.procedureName,
          category: selected?.category || prev.category,
        }));
      }}
    >
      <option value="">Select CPT / Target Procedure</option>
      ...
    ```

### 2.2 Frontend API Integration & Data Flow
- **Service File:** `D:\careid\doctor_web\src\services\cptService.ts`
- **API Call:** `cptService.listCptCodes({ page: 1, limit: 50 })` → calls `GET /api/v1/cpt?page=1&limit=50`.
- **Query Hook:** In `TreatmentOfferCreatePage.tsx`, fetched on mount via React Query (`queryKey: ['cpt-catalog']`).

### 2.3 Backend Controller & Service Investigation
- **Controller File:** `D:\careid\backend\src\modules\cpt\cpt.controller.ts`
  - Exposed `GET /api/v1/cpt` accepting `search`, `category`, `page`, and `limit`.
- **Service File:** `D:\careid\backend\src\modules\cpt\cpt.service.ts`
  - **Lines 6–124:** Contained `const STANDARD_CPT_CATALOGUE: CptItemDto[] = [ ... ]` holding 13 static entries:
    1. `93458` - Left heart catheterization with coronary angiography
    2. `92928` - Percutaneous transcatheter coronary stent placement, single major coronary artery
    3. `93459` - Left heart cath with coronary angiogram and bypass graft
    4. `92920` - Percutaneous transluminal coronary balloon angioplasty, single vessel
    5. `93454` - Catheter placement in coronary artery(s) for coronary angiography
    6. `93306` - Transthoracic echocardiography (TTE) with Doppler, complete
    7. `93000` - Electrocardiogram (ECG/EKG), routine with at least 12 leads
    8. `93451` - Right heart catheterization
    9. `93503` - Insertion of Swan-Ganz catheter for monitoring
    10. `33533` - Coronary artery bypass graft (CABG), single arterial graft
    11. `33405` - Replacement of aortic valve with cardiopulmonary bypass
    12. `33208` - Insertion of new or replacement permanent pacemaker with transvenous leads
    13. `93580` - Percutaneous transcatheter closure of congenital interatrial communication
  - The method `getCptCodes(...)` merely filtered this in-memory JavaScript array using `.filter(...)` and `.slice(...)`.

### 2.4 Implementation Classification
- **Classification:** **2. Hardcoded in Backend / 5. Hybrid**
  - While the React UI was not hardcoding `<option>` tags directly in TSX, the backend service was purely static and had zero database persistence. No administrative tools existed to add, update, or deactivate procedures.

---

## 3. Phase 2 — Requirements Check & Clinical Dependencies

### 3.1 Business & Clinical Context
1. **Treatment Offers & Patient Financing (CR-02):**
   - When doctors create treatment offers for patients requiring cardiovascular interventions, the target procedure code dictates financing eligibility, baseline cost estimation, insurance pre-authorization, and hospital capacity allocation.
2. **Procedure Scheduling (CR-04) & Cath Lab Clinical Telemetry:**
   - The selected procedure determines operating room / cath lab requirements, sterile tray prep, and telemetry monitoring templates.
3. **Medical Records / EHR Integration:**
   - CPT and clinical procedure codes must correlate with ICD-10 diagnostic codes and billing claims.

### 3.2 Terminology & Licensing Constraints (AMA CPT)
- **CPT® Copyright:** CPT is copyrighted by the American Medical Association. Standard systems must either license the code set or support local facility procedure catalogues while clearly delineating between official CPT codes and facility-defined procedure codes.
- **Delineation Rule:** Added `isOfficialCpt: boolean` to the schema and DTOs:
  - Official 5-digit numeric CPT entries are flagged with `isOfficialCpt: true`.
  - Hospital-specific or non-CPT entries (e.g., prefix `LOCAL-` or custom facility codes) are flagged with `isOfficialCpt: false`.
  - Non-official procedures are displayed in UI as `"Procedure #<CODE>"` rather than `"CPT #<CODE>"`.

---

## 4. Phase 3 — Remediation & Architecture

### 4.1 Database Architecture (`procedure_catalogue`)
In `backend/src/modules/cpt/cpt.service.ts`, implemented automatic idempotent table initialization on `onModuleInit()`:
```sql
CREATE TABLE IF NOT EXISTS procedure_catalogue (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  short_description VARCHAR(255),
  description TEXT,
  category VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  base_cost NUMERIC(12, 2),
  is_official_cpt BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_procedure_catalogue_code ON procedure_catalogue(code);
CREATE INDEX IF NOT EXISTS idx_procedure_catalogue_category ON procedure_catalogue(category);
CREATE INDEX IF NOT EXISTS idx_procedure_catalogue_status ON procedure_catalogue(status);
```
- Automatically seeds the 13 baseline standard procedures if the table is empty.
- Automatically handles schema migration if `is_official_cpt` column is missing from prior runs.

### 4.2 Backend Enhancements
1. **DTOs (`backend/src/modules/cpt/cpt.dto.ts`):**
   - Added `isOfficialCpt?: boolean` to `CptItemDto`.
   - Created `CreateProcedureDto` with validation: `code`, `name`, `category`, `shortDescription`, `description`, `baseCost`, `isOfficialCpt`.
   - Created `UpdateProcedureDto` with partial validation and status updates (`ACTIVE` / `INACTIVE`).
2. **Service (`backend/src/modules/cpt/cpt.service.ts`):**
   - Implemented database querying with fallback:
     - `getCptCodes(query)`: Queries PostgreSQL with ILIKE search, status filtering, category filtering, and pagination.
     - `getCptByCode(code)`: Fetches procedure from PostgreSQL.
     - `createProcedure(dto)`: Inserts new procedure; rejects duplicates with `ConflictException`.
     - `updateProcedure(code, dto)`: Updates details in PostgreSQL.
     - `deleteProcedure(code)`: Performs non-destructive soft deactivation (`status = 'INACTIVE'`).
3. **Controller (`backend/src/modules/cpt/cpt.controller.ts`):**
   - Protected Admin CRUD routes with `@Roles('ADMIN', 'SUPER_ADMIN')` and `@UseGuards(JwtAuthGuard, RolesGuard)`:
     - `POST /api/v1/cpt` → Create procedure.
     - `PUT /api/v1/cpt/:code` → Update procedure.
     - `DELETE /api/v1/cpt/:code` → Soft deactivate procedure.

### 4.3 Doctor Web Enhancements
- **Service (`doctor_web/src/services/cptService.ts`):**
  - Updated `CptProcedureDTO` interface to include `isOfficialCpt?: boolean`.
- **Component (`doctor_web/src/pages/treatment-offers/TreatmentOfferCreatePage.tsx`):**
  - Added real-time text filter input above the dropdown to allow searching procedures by code, name, or description.
  - Enhanced select option labels:
    - Official CPT: `CPT #93458 - Left heart catheterization ...`
    - Local Procedure: `Procedure #LOCAL-01 - Custom Clinic Procedure ...`
  - Added warning banner if the previously selected procedure has been marked inactive by hospital administration.

### 4.4 Admin Web Enhancements
- **Service (`Admin_web/src/services/procedureService.ts`):**
  - Added full API client and React Query hooks (`useProceduresQuery`, `useCreateProcedureMutation`, `useUpdateProcedureMutation`, `useDeleteProcedureMutation`) enabling Admin Web to manage the database-backed procedure catalogue.

---

## 5. Verification & Quality Evidence

### 5.1 Automated Unit Tests (Jest)
Ran the CPT service test suite covering database persistence, duplication handling, and soft deactivation:
```bash
npm --prefix D:\careid\backend run test -- src/modules/cpt/tests/cpt.service.spec.ts
```
**Result:** PASS (9 of 9 passed)
```
 PASS  src/modules/cpt/tests/cpt.service.spec.ts
  CptService
    getCptCodes
      ✓ should return paginated CPT items (in-memory fallback)
      ✓ should filter by category (in-memory fallback)
      ✓ should search by code or description (in-memory fallback)
    getCptByCode
      ✓ should return single CPT item when found
      ✓ should throw NotFoundException when code not found
    database-backed operations
      ✓ should query database when database catalogue is available
      ✓ should create a new procedure in the database
      ✓ should throw ConflictException when creating a duplicate procedure code
      ✓ should soft-deactivate procedure on deleteProcedure

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
Snapshots:   0 total
Time:        1.428 s
```

### 5.2 Application Builds
- **Backend:** `npm --prefix D:\careid\backend run build` → **PASS** (Zero errors)
- **Doctor Web:** `npm --prefix D:\careid\doctor_web run build` → **PASS** (Zero errors, built in 3.12s)
- **Admin Web:** `npm --prefix D:\careid\Admin_web run build` → **PASS** (Zero errors, built in 2.19s)

---

## 6. Scope Compliance & Safety Checklist

- [x] **Zero modifications to Flutter apps:** `CAREID_doctor_app` and `CAREID_patient_app` were untouched.
- [x] **Zero destructive database operations:** No tables dropped, no data wiped; non-destructive schema creation and soft deactivation only.
- [x] **Preserved integration ports:** Target ports (3001, 5173, 5174, 5433) respected; development ports (3000, 5432) untouched.
- [x] **No paid external terminology APIs introduced:** Retained autonomous database persistence without recurring external licensing blockers.

---

<!-- GOAL_COMPLETE -->
