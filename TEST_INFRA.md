# CareID Goal 014: E2E Test Infrastructure & 4-Tier Verification Matrix

**Specification & Infrastructure Document:** Goal 014 E2E Test Suite, Feature Inventory, 4-Tier Opaque-Box Matrix, and Security Architecture  
**Author:** `teamwork_test_writer_1` (E2E & Security Test Writer)  
**Primary Test Runner:** `D:\careid\Admin_web\scratch\verify_goal_014_security_and_e2e.cjs`  
**Evidence Artifacts:** `D:\careid\Admin_web\docs\evidence\CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014\`  
**Target Environment:** Live Docker Integration Containers (`backend:3001`, `postgres:5433`, `doctor_web:5173`, `admin_web:5174`)  
**Status:** READY FOR VERIFICATION

---

## 1. Test Architecture Overview

The CareID Goal 014 verification infrastructure operates as a dual-track opaque-box automated test framework verifying both backend REST APIs / security invariants and frontend browser UI interactions.

### 1.1 Target Architecture & Services

| Service Name | Container / Process | Network Address | Authentication / Protocol | Primary Responsibilities |
|---|---|---|---|---|
| **Backend REST API** | `careid-integration-backend` | `http://localhost:3001/api/v1` | Bearer JWT (Roles: ADMIN, SUPER_ADMIN, DOCTOR, VETERINARIAN) | Catalogue CRUD, dynamic dropdown API, specialty filtering, specialty compatibility validation, doctor self-edit lockdown, Clinical Safety Gate R1 |
| **PostgreSQL Database** | `careid-integration-postgres` | `localhost:5433` (`careid_integration_db`) | `careid_test_user` / `careid_test_password` | Dedicated `clinical_practice_types` table, foreign keys with `onDelete: Restrict`, 25 doctor profiles, 13 medical specialties |
| **Admin Web SPA** | `careid-integration-admin-web` | `http://localhost:5174` | Session localStorage injection / Form login | Settings → Clinical Practice Types page, Add/Edit modals, deactivation warning, in-use rejection, Add/Edit Doctor dynamic dropdowns |
| **Doctor Web SPA** | `careid-integration-doctor-web` | `http://localhost:5173` | Session localStorage injection / Form login | Human workspace (`/dashboard`), Veterinary workspace (`/veterinary/dashboard`), Clinical Safety Gate R1 Amber Barrier (`hasDualRoleAmbiguity`), symmetrical 403 barriers |

### 1.2 Automated Runner Components

- **Runtime**: Node.js v25.7.0 (or v18+) CommonJS runner `verify_goal_014_security_and_e2e.cjs`.
- **Browser Automation**: Puppeteer using native Chrome executable (`C:\Program Files\Google\Chrome\Application\chrome.exe` or bundled Chromium) with flags `['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']`.
- **HTTP Engine**: Node.js native `http`/`https` (`apiRequest` with 15-second timeout) with standardized response unwrapping for NestJS `ResponseTransformInterceptor` and `GlobalExceptionFilter`.
- **Synthetic Input Adapters**: React 18 prototype setter dispatches for controlled date/text inputs (`#dob`, `#licenseExpiry`).
- **Dynamic Element Polling & Text Helpers**: `waitForFunction` polling predicates and valid W3C CSS + `evaluateHandle` text-matching helpers (zero Playwright `:has-text(...)` pseudo-selectors).
- **Strict Evidence Integrity**: Screenshots are captured strictly when the target UI element/modal/barrier is visibly mounted in the DOM (never placeholder captures).

---

## 2. Feature Inventory

| # | Feature Code | Feature Name | Description | Target Milestone | Source Requirement |
|---|---|---|---|---|---|
| 1 | `FEAT-AUDIT` | Source Audit Documentation | Formal audit report with exact file paths and line numbers answering Q1–Q5 | M1 & M3 | ORIGINAL_REQUEST §R1 |
| 2 | `FEAT-SCHEMA` | Dedicated Prisma Model | `ClinicalPracticeType` model (`code`, `displayName`, `status`, `clinicalAuthorizationMapping`, `isCanonical`) | M1 | ORIGINAL_REQUEST §R2, §R5 |
| 3 | `FEAT-MIGRATION` | Non-Destructive Migration | Idempotent SQL migration seeding canonical classifications and setting FK constraints | M1 | ORIGINAL_REQUEST §R5 |
| 4 | `FEAT-CRUD-API` | Admin Catalogue CRUD APIs | GET, POST, PUT, DELETE, PATCH status under `@Roles('ADMIN', 'SUPER_ADMIN')` | M1 | ORIGINAL_REQUEST §R3, §R5 |
| 5 | `FEAT-DD-API` | Active Dropdown API | Authenticated `GET /api/v1/clinical-practice-types` returning active types for form dropdowns | M1 | ORIGINAL_REQUEST §R4 |
| 6 | `FEAT-SPEC-VAL` | Specialty Compatibility Validation | Validate specialty and practice-type compatibility via DB lookup in `admin.service.ts` | M1 | ORIGINAL_REQUEST §R4, §R5 |
| 7 | `FEAT-CANON-DEL` | In-Use & Canonical Deletion Rules | Reject deletion if referenced by doctors/specialties (409); reject deletion/deactivation of canonical codes (400) | M1 | ORIGINAL_REQUEST §R2, §R3 |
| 8 | `FEAT-SELF-LOCK` | Doctor Self-Edit Lockdown | Prevent clinicians from modifying `clinicalPracticeType` via doctor profile update endpoints (403) | M1 | ORIGINAL_REQUEST §R6 |
| 9 | `FEAT-SETT-PAGE` | Admin Settings Practice Types Page | Settings → Clinical Practice Types (`/admin/settings/clinical-practice-types`) with tab nav | M2 | ORIGINAL_REQUEST §R3 |
| 10 | `FEAT-CAT-UI` | Catalogue Management UI & Modals | Catalogue table, search/filter, Add modal, Edit modal, Deactivate modal, Delete modal | M2 | ORIGINAL_REQUEST §R3 |
| 11 | `FEAT-ADD-DOC` | Admin Add Doctor Dynamic Integration | Dynamic practice type loading, no hardcoded options, loading/error states, dynamic specialty filtering | M2 | ORIGINAL_REQUEST §R4 |
| 12 | `FEAT-EDIT-DOC` | Admin Edit Doctor Dynamic Integration | Dynamic practice type dropdown, preselection of existing practice type, historical label for inactive types | M2 | ORIGINAL_REQUEST §R4 |
| 13 | `FEAT-PROF-DISP` | Doctor Profile Display & Cleanup | Update `AdminDoctorProfile.tsx` and `doctorService.ts`, eliminate hardcoded fallback arrays | M2 | ORIGINAL_REQUEST §R4 |
| 14 | `FEAT-GATE-R1` | Clinical Safety Gate R1 Preservation | Symmetrical cross-domain 403 enforcement, fail-closed handling for unmapped practice types | M1 & M2 | ORIGINAL_REQUEST §R6 |
| 15 | `FEAT-E2E-15` | 15 Phase 7 Integration Tests Pass | Automated integration tests passing all 15 verification steps against Docker environment | M3 & E2E Track | ORIGINAL_REQUEST §Acceptance Criteria |
| 16 | `FEAT-DOCS` | Deliverable Report & Screenshots | Create `CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014.md` with audit, implementation, tests, screenshots | M3 | ORIGINAL_REQUEST §R7 |

---

## 3. Bidirectional Mapping of the 15 Phase 7 Integration Test Steps

| Step # | Verification Area | Target Endpoint / UI Component | Test Tier Mapping | Test ID(s) | Expected Outcome |
|:---:|:---|:---|:---:|:---:|:---|
| **1** | Dynamic Catalogue Loading | `GET /api/v1/clinical-practice-types` & `/admin/doctors/create` | Tier 1 (Dropdown) & Tier 2 | `TC-T1-DD-01`, `TC-T1-DD-02` | Status 200 OK; active entries loaded dynamically; zero static fallback options. |
| **2** | Catalogue Management Listing | `GET /api/v1/admin/clinical-practice-types` & Settings Page | Tier 1 (Catalogue CRUD) | `TC-T1-CRUD-01`, `TC-T1-CRUD-02` | Status 200 OK; returns all entries with code, displayName, status, usage counts. |
| **3** | Add Practice Type | `POST /api/v1/admin/clinical-practice-types` & Modal | Tier 1 (Catalogue CRUD) & Tier 2 | `TC-T1-CRUD-03`, `TC-T2-BC-01` | Status 201 Created; persists in database; rejects duplicate codes (409 Conflict). |
| **4** | Edit Practice Type | `PUT /api/v1/admin/clinical-practice-types/:id` & Modal | Tier 1 (Catalogue CRUD) & Tier 2 | `TC-T1-CRUD-04`, `TC-T2-BC-03` | Status 200 OK; updates displayName/description; code is immutable. |
| **5** | Activate / Deactivate Toggle | `PATCH /api/v1/admin/clinical-practice-types/:id/status` | Tier 1 (Catalogue CRUD) & Tier 2 | `TC-T1-CRUD-05`, `TC-T2-BC-04` | Status 200 OK; status transitions ACTIVE ↔ INACTIVE; canonical toggle rejected (400). |
| **6** | In-Use Deletion Rejection | `DELETE /api/v1/admin/clinical-practice-types/:id` | Tier 2 (Boundary) | `TC-T2-BC-16`, `TC-T2-BC-17` | Status 400 Bad Request for canonical types; 409 Conflict for custom practice types assigned to doctors/specialties. |
| **7** | Canonical Protection | `DELETE` / `PATCH` / `PUT` on `HUMAN_HEALTHCARE` or `VETERINARY_MEDICINE` | Tier 2 (Boundary) | `TC-T2-BC-11`, `TC-T2-BC-13` | Status 400 Bad Request; canonical codes cannot be deleted, deactivated, or reassigned. |
| **8** | Unmapped Type Fail-Closed | Doctor login with unmapped practice type | Tier 2 (Boundary) & Tier 4 | `TC-T2-BC-22`, `TC-T4-RW-03` | Doctor Web halts at Clinical Safety Gate R1 Amber Banner; no clinical records accessible. |
| **9** | Human Doctor Registration | `POST /api/v1/admin/users` with `HUMAN_HEALTHCARE` | Tier 1 (Doctor Reg) & Tier 4 | `TC-T1-REG-01`, `TC-T4-RW-01` | Status 201 Created; doctor assigned role `DOCTOR`; persisted with `HUMAN_HEALTHCARE`. |
| **10** | Human Doctor Dashboard | Doctor Web `/auth/login` as Human Doctor | Tier 1 (Routing) & Tier 4 | `TC-T1-ROUT-01`, `TC-T4-RW-01` | Redirects to `/dashboard`; Human features visible; `/veterinary/*` returns 403 barrier. |
| **11** | Veterinary Doctor Registration | `POST /api/v1/admin/users` with `VETERINARY_MEDICINE` | Tier 1 (Doctor Reg) & Tier 4 | `TC-T1-REG-02`, `TC-T4-RW-02` | Status 201 Created; doctor assigned role `VETERINARIAN`; persisted with `VETERINARY_MEDICINE`. |
| **12** | Veterinary Doctor Dashboard | Doctor Web `/auth/login` as Veterinary Doctor | Tier 1 (Routing) & Tier 4 | `TC-T1-ROUT-02`, `TC-T4-RW-02` | Redirects to `/veterinary/dashboard`; Vet features visible; `/dashboard` returns 403 barrier. |
| **13** | Dynamic Specialty Filtering | Dynamic filter on `/admin/doctors/create` | Tier 1 (Dropdown) & Tier 3 | `TC-T1-DD-03`, `TC-T1-DD-04` | Specialty dropdown dynamically updates based on practice type; incompatible specialties hidden. |
| **14** | Specialty Compatibility Validation | `POST /api/v1/admin/users` with mismatched specialty | Tier 1 (Doctor Reg) & Tier 3 | `TC-T1-REG-03`, `TC-T3-PAIR-02` | Status 400 Bad Request; DB validation ("Specialization is not compatible with selected clinical practice type") or legacy fallback rejects mismatch. |
| **15** | Security & Safety Gate R1 Assertion | Backend RBAC & Cross-Domain Access | Tier 1, Tier 2, Tier 4 | `TC-T1-ROUT-05`, `TC-T2-BC-24` | Non-admin catalogue call -> 401/403; doctor self-edit blocked (403); cross-domain record access -> 403. |

---

## 4. 4-Tier Test Matrix Breakdown

### Tier 1: Feature Coverage (21 Test Cases)
- **Catalogue CRUD Management (`TC-T1-CRUD-01` to `06`)**: Listing catalogue entries, search/filtering, creation of custom practice types, updating display name/description, status toggle (ACTIVE/INACTIVE), and deletion of unused entries.
- **Dynamic Dropdown & Specialty Filtering (`TC-T1-DD-01` to `05`)**: Dynamic loading via `GET /api/v1/clinical-practice-types`, dynamic select population in `AdminAddDoctor.tsx`, dynamic query filtering for Human specialties (12 items) vs Veterinary specialties (1 item), and reactive specialty clearing on practice type change.
- **Doctor Registration & Profile Integration (`TC-T1-REG-01` to `05`)**: Registering Human Doctor with `DOCTOR` role, registering Veterinary Doctor with `VETERINARIAN` role, rejection of incompatible specialty combinations, preselection in `EditDoctorProfileDialog.tsx`, and dynamic classification badges in `AdminDoctorProfile.tsx`.
- **Workspace Routing & Cross-Domain Isolation (`TC-T1-ROUT-01` to `05`)**: Human Doctor landing on `/dashboard`, Veterinary Doctor landing on `/veterinary/dashboard`, URL traversal blocks rendering 403 barrier screens, and backend `doctor.service` vs `pet.service` 403 interceptions.

### Tier 2: Boundary & Corner Cases (25 Test Cases)
- **Code Uniqueness & Format Validation (`TC-T2-BC-01` to `05`)**: Rejection of duplicate codes (`409 Conflict`), case normalization collision prevention, alphanumeric format regex enforcement (`400 Bad Request`), whitespace trimming, and string boundary lengths.
- **Text Fields & Payload Constraints (`TC-T2-BC-06` to `10`)**: Empty display name rejection (`400`), UTF-8 special character handling, large description handling, null description handling, and XSS script tag escaping.
- **Canonical Immutability Protection (`TC-T2-BC-11` to `15`)**: Blocking hard deletion of `HUMAN_HEALTHCARE` (`400`), blocking hard deletion of `VETERINARY_MEDICINE` (`400`), blocking deactivation of canonical types (`400`), and blocking code/authorization modification on canonical records (`400`).
- **In-Use Referential Integrity & Deletion Rejection (`TC-T2-BC-16` to `20`)**: Rejecting deletion of practice types referenced by active doctors (`409`), rejecting deletion of practice types referenced by specialties (`409`), cascade updates on foreign keys, and clean deletion of 100% unreferenced types.
- **Unmapped Scope & Authorization Safety Gates (`TC-T2-BC-21` to `25`)**: Creation of unmapped practice type without clinical role escalation, fail-closed handling in Doctor Web at Clinical Safety Gate R1 Amber Banner, clinician self-elevation prevention (`403`), and unauthenticated/unauthorized non-admin rejection (`401`/`403`).

### Tier 3: Cross-Feature Combinations (8 Pairwise Scenarios)
- `TC-T3-PAIR-01`: Create Custom Practice Type ↔ Dynamic Dropdown Immediate Availability.
- `TC-T3-PAIR-02`: Practice Type Switch ↔ Dynamic Specialty Repopulation & Incompatible Value Purge.
- `TC-T3-PAIR-03`: Practice Type Deactivation ↔ Exclusion from Public Dropdown.
- `TC-T3-PAIR-04`: Inactive Practice Type ↔ Historical Label Display in Edit Doctor Dialog.
- `TC-T3-PAIR-05`: Add Medical Specialty ↔ Instant Inclusion in Filtered Specialty Dropdown.
- `TC-T3-PAIR-06`: Dual Registration (Human & Vet) ↔ Symmetrical Cross-Workspace Isolation.
- `TC-T3-PAIR-07`: Specialty Compatibility Mismatch ↔ Transaction Rollback & Error Feedback.
- `TC-T3-PAIR-08`: In-Use Practice Type ↔ Disabled UI Delete Button with Informational Tooltip.

### Tier 4: Real-World Scenarios (4 End-to-End User Journeys)
- `TC-T4-RW-01`: Complete Human Doctor Onboarding, Registration, Profile Inspection, and Workspace Execution.
- `TC-T4-RW-02`: Complete Veterinary Doctor Onboarding, Registration, Profile Inspection, and Workspace Execution.
- `TC-T4-RW-03`: Ambiguous / Unmapped Clinician Authentication and Fail-Closed Amber Barrier Halting.
- `TC-T4-RW-04`: Unauthorized Cross-Domain Traversal and Tampering Defense (Human -> Pet, Vet -> Human Patient, Clinician Self-Edit Scope).

---

## 5. Master DOM Selectors & API Endpoints

### 5.1 Admin Web Selectors
- **Admin Login**:
  - Email Tab: `button.login-tab-pill:first-child`
  - Email Input: `#admin-email`
  - Password Input: `#admin-password`
  - Submit: `button.submit-btn[type="submit"]`
- **Settings → Clinical Practice Types**:
  - Tab Navigation Button: `button.settings-tab-btn[data-tab="clinical-practice-types"]`
  - Table: `table.practice-types-table, table`
  - Add Button: `button#btn-add-practice-type`
  - Add Modal Code: `input#practice-type-code, input[name="code"]`
  - Add Modal Name: `input#practice-type-display-name, input[name="displayName"]`
  - Add Modal Mapping: `select#practice-type-auth-mapping, select[name="clinicalAuthorizationMapping"]`
  - Add Modal Submit: `button.practice-type-modal-submit[type="submit"]`
  - Edit Row Button: `button.practice-type-row-edit`
  - Edit Modal Name: `input#edit-practice-type-display-name, input[name="displayName"]`
  - Deactivate Toggle Button: `button.practice-type-row-status`
  - Deactivate Dialog: `div.deactivate-confirmation-dialog`
  - Delete Row Button: `button.practice-type-row-delete`
  - Delete Rejection: `div.delete-rejection-dialog, div.action-error-toast`
- **Add Doctor Form**:
  - Clinical Practice Type Select: `#clinicalPracticeType`
  - Primary Specialty Select: `#specialty`
  - Submit: `button.add-doctor-submit-btn[type="submit"]`
- **Edit Doctor Profile Dialog**:
  - Edit Button: `button.doctor-profile-btn.edit`
  - Practice Type Select: `form#edit-doctor-form select[name="clinicalPracticeType"]`
  - Primary Specialty Select: `form#edit-doctor-form select[name="specialty"]`
  - Save: `button.doctor-edit-btn-save`

### 5.2 Doctor Web Selectors
- **Doctor Login**:
  - Email Input: `#auth-email-address, input[name="email"]`
  - Password Input: `#auth-password, input[name="password"]`
  - Submit: `button[type="submit"]`
  - Session Storage Keys: `sessionStorage.careid_access_token`, `sessionStorage.careid_refresh_token`, `sessionStorage.careid_user_profile_cache`
- **Routing & Barriers**:
  - Human Dashboard: `/dashboard`
  - Vet Dashboard: `/veterinary/dashboard`
  - Symmetrical 403 Barrier Badge: `span.bg-rose-100` (verified text: `"403 Access Denied"`)
  - Clinical Safety Gate R1 Amber Badge: `span.bg-amber-100.text-amber-900` (verified text: `"Clinical Safety Gate R1"`)
  - Ambiguity Title: `h1` (verified text: `"Dual Clinical Role Ambiguity Detected"`)

### 5.3 Backend REST Endpoints
- `POST /api/v1/auth/password/login`: Authenticates Admin, Human Doctor, or Vet Doctor.
- `GET /api/v1/clinical-practice-types`: Returns active types for form dropdowns.
- `GET /api/v1/admin/clinical-practice-types`: Admin catalogue listing with doctor/specialty counts and search filter.
- `POST /api/v1/admin/clinical-practice-types`: Creates custom practice type (rejects duplicate codes with 409).
- `PUT /api/v1/admin/clinical-practice-types/:id`: Updates display name/description (canonical code is immutable).
- `PATCH /api/v1/admin/clinical-practice-types/:id/status`: Toggles ACTIVE / INACTIVE (canonical toggle rejected with 400).
- `DELETE /api/v1/admin/clinical-practice-types/:id`: Deletes unused type (in-use rejected with 409, canonical rejected with 400).
- `GET /api/v1/doctors/specialties?practiceType=...`: Dynamically filters specialties by practice type.
- `POST /api/v1/admin/users`: Creates doctor profile and validates specialty compatibility (mismatch rejected with 400).
- `PUT /api/v1/doctors/:id`: Updates doctor profile (clinician self-edit of `clinicalPracticeType` rejected with 403).
- `GET /api/v1/doctors/pets`: Veterinary records (Human Doctor access rejected with 403).
- `GET /api/v1/doctors/patients`: Human patient records (Veterinarian access rejected with 403).

---

## 6. Execution Guide

### 6.1 Invocation Commands

```bash
# 1. Validate script syntax
node -c D:\careid\Admin_web\scratch\verify_goal_014_security_and_e2e.cjs

# 2. Run full test suite (API integration + Puppeteer browser UI automation)
node D:\careid\Admin_web\scratch\verify_goal_014_security_and_e2e.cjs

# 3. Run API integration tests only (fast REST & security assertions without browser)
node D:\careid\Admin_web\scratch\verify_goal_014_security_and_e2e.cjs --api-only

# 4. Run UI automation and screenshot captures only
node D:\careid\Admin_web\scratch\verify_goal_014_security_and_e2e.cjs --ui-only
```

### 6.2 Pre-Requisites & Container Health Probes

Ensure Docker integration containers are running:
```bash
# Verify backend API health
curl.exe -s http://localhost:3001/api/v1/health

# Verify Admin Web webserver
curl.exe -s -I http://localhost:5174

# Verify Doctor Web webserver
curl.exe -s -I http://localhost:5173

# Verify PostgreSQL container
docker exec careid-integration-postgres pg_isready -U careid_test_user -d careid_integration_db
```

---

## 7. Mandatory 15 Verification Screenshots Catalog

Directory: `D:\careid\Admin_web\docs\evidence\CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014\`  
Viewport: `1440 x 900`  
Capture Rule: Screenshots are captured **only** when the genuine target UI element/modal/barrier is mounted and visible in the DOM (never dummy or placeholder background captures).

| # | Filename | Page Route | Trigger / Visual Assertion |
|:---:|:---|:---|:---|
| 1 | `goal014_01_admin_login.png` | `http://localhost:5174/` | Admin Login screen with email & password fields rendered |
| 2 | `goal014_02_admin_dashboard.png` | `http://localhost:5174/admin/dashboard` | Post-login dashboard confirming active admin session and sidebar |
| 3 | `goal014_03_settings_tab_navigation.png` | `http://localhost:5174/admin/settings/general` | Settings page showing "Clinical Practice Types" tab in navigation |
| 4 | `goal014_04_catalogue_table_canonical.png` | `http://localhost:5174/admin/settings/clinical-practice-types` | Catalogue table displaying `HUMAN_HEALTHCARE` and `VETERINARY_MEDICINE` |
| 5 | `goal014_05_add_practice_type_modal.png` | `http://localhost:5174/admin/settings/clinical-practice-types` | "+ Add Practice Type" modal open with code, name, description, auth mapping |
| 6 | `goal014_06_add_practice_type_success.png` | `http://localhost:5174/admin/settings/clinical-practice-types` | Catalogue table displaying newly created practice type record |
| 7 | `goal014_07_edit_practice_type_canonical.png` | `http://localhost:5174/admin/settings/clinical-practice-types` | Edit modal for canonical entry showing protected/disabled code field |
| 8 | `goal014_08_deactivate_dialog_warning.png` | `http://localhost:5174/admin/settings/clinical-practice-types` | Deactivation dialog displaying warning about preserving historical doctor links |
| 9 | `goal014_09_delete_rejection_inuse.png` | `http://localhost:5174/admin/settings/clinical-practice-types` | Delete rejection dialog/toast for in-use or canonical practice type |
| 10 | `goal014_10_add_doctor_dynamic_practice_types.png` | `http://localhost:5174/admin/doctors/create` | Add Doctor form showing dynamic `#clinicalPracticeType` select populated from DB |
| 11 | `goal014_11_add_doctor_specialty_human.png` | `http://localhost:5174/admin/doctors/create` | Add Doctor form showing `#specialty` dynamically filtered for Human Healthcare |
| 12 | `goal014_12_add_doctor_specialty_vet.png` | `http://localhost:5174/admin/doctors/create` | Add Doctor form showing `#specialty` dynamically filtered for Veterinary Medicine |
| 13 | `goal014_13_edit_doctor_dialog_dynamic.png` | `http://localhost:5174/admin/doctors/:id` | Edit Doctor Profile dialog showing dynamic practice type preselected |
| 14 | `goal014_14_doctor_web_workspaces.png` | `http://localhost:5173/veterinary/dashboard` | Doctor Web successfully routed to isolated clinical workspace |
| 15 | `goal014_15_clinical_safety_gate_amber_barrier.png` | `http://localhost:5173/dashboard` | Clinical Safety Gate R1 amber barrier displayed for unmapped/ambiguous credentials |
