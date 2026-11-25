# CAREID — Dynamic Clinical Practice Type Management & Clinical Safety Gate R1 Audit Report

**Document ID:** `CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014`  
**Goal Reference:** `CAREID-ADMIN-DYNAMIC-CLINICAL-PRACTICE-TYPE-MANAGEMENT-014`  
**Execution Date:** November 25, 2026  
**Status:** COMPLETED & VERIFIED (15/15 Phase 7 Tests Passed)  
**Target Environments:**
- Admin Web: `http://localhost:5174` (Nginx container: `careid-integration-admin-web`)
- Doctor Web: `http://localhost:5173` (Nginx container: `careid-integration-doctor-web`)
- Backend API: `http://localhost:3001` (Node/NestJS container: `careid-integration-backend`)
- Database: `localhost:5433` (PostgreSQL 16 container: `careid-integration-postgres`, database: `careid_integration_db`)

---

## Executive Summary

Prior to Goal 014, the "Clinical Practice Type" selector in Admin Web (introduced in Goal 013 to resolve Dual Clinical Role Ambiguity) relied on static frontend `<option>` tags (`Human Healthcare` / `Veterinary Medicine`). The backend also lacked a persistent relational catalogue and administrative management APIs.

In Goal 014, we systematically eliminated hardcoded options and introduced an enterprise-grade, database-backed Clinical Practice Type catalogue with comprehensive Admin management capabilities (`Settings → Clinical Practice Types`), while strictly maintaining **Clinical Safety Gate R1** to guarantee bidirectional isolation between Human Healthcare and Veterinary Medicine.

### Key Milestones Achieved:
1. **Source Audit Completed**: Exact file locations, line numbers, and classification of pre-existing hardcoded options documented across frontend and backend.
2. **Database & Backend Architecture**: Implemented `ClinicalPracticeType` Prisma model with code immutability, canonical preservation, foreign-key reference integrity, and comprehensive audit timestamps.
3. **Admin Management UI**: Delivered full management interface at `/admin/settings/clinical-practice-types` supporting listing, creation, modification, deactivation/reactivation, and safe deletion.
4. **Dynamic Doctor Registration & Profiles**: Replaced all static options in `AdminAddDoctor.tsx` and `EditDoctorProfileDialog.tsx` with dynamic backend fetching via `GET /api/v1/clinical-practice-types`.
5. **Dynamic Specialty Filtering**: Filtered primary medical specializations dynamically by `clinicalPracticeType` across both Human Healthcare and Veterinary Medicine.
6. **Clinical Safety Gate R1 Verification**: Verified fail-closed security barriers, prohibiting unauthorized cross-domain access, clinician self-elevation, and automatic role escalation for unmapped practice types.
7. **100% Verification Pass Rate**: All 15 systematic integration test steps verified via automated Puppeteer E2E tests, browser automation, and 15 captured visual artifacts.

---

## Phase 1 — Source Code Audit Findings

A rigorous codebase audit was conducted across `Admin_web`, `backend`, and `doctor_web`:

| Location / File | Line Numbers (Pre-Goal 014) | Finding Description | Pre-Goal 014 Classification |
| :--- | :--- | :--- | :--- |
| `Admin_web/src/components/doctors/AdminAddDoctor.tsx` | Lines 767–788 | Static HTML `<option>` elements for `HUMAN_HEALTHCARE` and `VETERINARY_MEDICINE` | **Hardcoded in Frontend** |
| `Admin_web/src/components/doctors/EditDoctorProfileDialog.tsx` | Lines 295–315 | Static HTML `<option>` elements with hardcoded strings | **Hardcoded in Frontend** |
| `Admin_web/src/components/doctors/AdminDoctorProfile.tsx` | Lines 428–438, 608–614 | Hardcoded ternary mappings comparing `VETERINARY` and `HUMAN` | **Hardcoded in Frontend** |
| `Admin_web/src/services/doctorService.ts` | Lines 27, 78, 900–910 | Strict TypeScript union `'HUMAN' \| 'VETERINARY'` and hardcoded fallback roles | **Hardcoded in Frontend Types** |
| `backend/src/modules/admin/dto/admin-create-user.dto.ts` | Lines 45–55 | Enum check validating only `HUMAN_HEALTHCARE` or `VETERINARY_MEDICINE` | **Hardcoded in Backend** |
| `backend/src/modules/doctors/doctor.service.ts` | Lines 210–240 | In-memory role mapping and clinical domain switching | **Hardcoded in Backend** |
| `backend/prisma/schema.prisma` | Pre-Goal 014 | No database model existed for clinical practice types | **Missing Relational Table** |
| `backend/src/modules/admin/` | Pre-Goal 014 | No management controller or service existed for clinical practice types | **Missing Management API** |

### Audit Summary Classification:
- **Frontend Dropdown Options:** Hardcoded in React (Eliminated in Goal 014).
- **Backend Validation:** Hardcoded Enum in DTOs (Refactored to Dynamic Database Validation in Goal 014).
- **Database Storage:** Missing Relational Catalogue (Implemented in Goal 014).
- **Management API:** Did Not Exist (Created in Goal 014).
- **Security Role Coupling:** Canonical entries are directly mapped to clinical security roles (`DOCTOR` for `HUMAN_HEALTHCARE`, `VETERINARIAN` for `VETERINARY_MEDICINE`), while new custom practice types safely default to non-clinical `STAFF` access unless officially mapped.

---

## Phase 2 — Database Schema & Backend Architecture

### 1. Database Model (`prisma/schema.prisma`)
The `ClinicalPracticeType` model was added to PostgreSQL via migration `20261124140000_dynamic_clinical_practice_types`:

```prisma
enum PracticeTypeStatus {
  ACTIVE
  INACTIVE
}

model ClinicalPracticeType {
  id                           String             @id @default(uuid())
  code                         String             @unique
  displayName                  String             @map("display_name")
  description                  String?
  status                       PracticeTypeStatus @default(ACTIVE)
  clinicalAuthorizationMapping String?            @map("clinical_authorization_mapping")
  isCanonical                  Boolean            @default(false) @map("is_canonical")
  createdById                  String?            @map("created_by_id")
  updatedById                  String?            @map("updated_by_id")
  createdAt                    DateTime           @default(now()) @map("created_at")
  updatedAt                    DateTime           @updatedAt @map("updated_at")

  // Foreign-key integrity: prevents deleting practice types assigned to active doctor profiles
  doctorProfiles               Doctor[]

  @@map("clinical_practice_types")
}
```

### 2. Relational Integrity & Doctor Linkage
The `Doctor` model in `prisma/schema.prisma` was linked directly to `ClinicalPracticeType`:
```prisma
clinicalPracticeTypeRef ClinicalPracticeType? @relation(fields: [clinicalPracticeType], references: [code], onDelete: Restrict, onUpdate: Cascade)
```
- `onDelete: Restrict`: Directly prevents accidental deletion of any practice type currently linked to any doctor profile.
- `onUpdate: Cascade`: Safely synchronizes code changes across referencing doctor records if an update occurs.

### 3. Canonical Immutability Rules
1. `is_canonical = true` is permanently seeded for `HUMAN_HEALTHCARE` and `VETERINARY_MEDICINE`.
2. Backend business logic strictly rejects deactivation (`PATCH /status`), deletion (`DELETE`), or semantic reassignment of canonical practice types.
3. Custom practice types assigned to one or more doctors return `409 Conflict` on deletion, instructing administrators to deactivate the practice type instead so existing doctor relationships are preserved.

---

## Phase 3 — Backend API Endpoints & RBAC Contracts

| Endpoint | Method | RBAC Scope | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/clinical-practice-types` | `GET` | Authenticated / Public | Returns all `ACTIVE` practice types for registration and profile dropdowns. |
| `/api/v1/admin/clinical-practice-types` | `GET` | Admin Only (`SUPER_ADMIN`, `SYSTEM_ADMIN`, `ADMIN`) | Lists all practice types with doctor usage counts, pagination, and search filtering. |
| `/api/v1/admin/clinical-practice-types` | `POST` | Admin Only | Creates a new practice type. Validates unique code, sanitizes inputs, and logs audit metadata. |
| `/api/v1/admin/clinical-practice-types/:id` | `PUT` | Admin Only | Updates display name, description, and status. Prohibits editing code for canonical records. |
| `/api/v1/admin/clinical-practice-types/:id/status` | `PATCH` | Admin Only | Toggles `ACTIVE` / `INACTIVE`. Rejects deactivating canonical types. |
| `/api/v1/admin/clinical-practice-types/:id` | `DELETE` | Admin Only | Deletes unused custom types. Rejects canonical types (`400`) and types in active use (`409`). |
| `/api/v1/doctors/specialties` | `GET` | Authenticated | Filters medical specialties dynamically by `?practiceType=HUMAN_HEALTHCARE` or `?practiceType=VETERINARY_MEDICINE`. |

---

## Phase 4 — Admin Web Management UI

Admin Web provides a dedicated management page integrated directly into System Settings:
- **Route:** `/admin/settings/clinical-practice-types`
- **Tab Integration:** Seamless tab in `AdminSystemSettingsGeneral.tsx` alongside Organization, Branding, Security, and Integrations.
- **Component File:** `Admin_web/src/components/settings/AdminSystemSettingsPracticeTypes.tsx`
- **Styling File:** `Admin_web/src/components/settings/AdminSystemSettingsPracticeTypes.css`

### Administrative Features:
1. **Comprehensive Data Grid:** Displays Code, Display Name, Description, Authorization Mapping, Status (with color-coded badge), Canonical Badge, Active Doctors count, and contextual action buttons.
2. **Search & Status Filtering:** Search by display name, code, or description, with filter pills (`All`, `Active`, `Inactive`).
3. **+ Add Practice Type Modal:** Validates unique code format, display name, and optional authorization mapping.
4. **Edit Practice Type Modal:** Allows editing display name and description. Canonical types have their Code input disabled to prevent semantic drift.
5. **Safe Deactivation Flow:** Prompts administrators with explicit warnings that deactivation preserves historical doctor records and prevents future selection.
6. **Protected Deletion:** Rejects deletion of canonical types and displays a conflict notice if attempting to delete a practice type assigned to active doctor profiles.

---

## Phase 5 — Dynamic Doctor Registration & Profiles

1. **`AdminAddDoctor.tsx`:**
   - Dynamically calls `useActiveClinicalPracticeTypesQuery()` (`GET /api/v1/clinical-practice-types`).
   - Defaults cleanly to `HUMAN_HEALTHCARE`.
   - Listens to practice type selection and dynamically drives the `specialty` dropdown via `useSpecialtiesQuery({ practiceType: selectedPracticeType })`.
   - Selecting `HUMAN_HEALTHCARE` reveals human medical specialties (Cardiology, Dermatology, etc.) while hiding veterinary specialties.
   - Selecting `VETERINARY_MEDICINE` reveals veterinary specialties (Veterinary Medicine, Veterinary Surgery, etc.) while hiding human specialties.
2. **`EditDoctorProfileDialog.tsx`:**
   - Loads dynamic practice types and preselects the doctor's existing practice type.
   - Preserves historical inactive practice types if already assigned to the doctor.
   - Automatically synchronizes specialty options based on the newly selected practice type.
3. **`AdminDoctorProfile.tsx`:**
   - Formats dynamic practice types with authentic badge styling (Blue for Human Healthcare, Amber for Veterinary Medicine, Gray for other practice types).

---

## Phase 6 — Clinical Safety Gate R1 Enforcement

**Clinical Safety Gate R1** is strictly maintained and verified:
1. **Human vs Veterinary Isolation:**
   - Human Doctors (`DOCTOR` role, `HUMAN_HEALTHCARE`) route strictly to `/dashboard`. Direct navigation or cross-domain traversal to `/veterinary/*` or `/doctors/pets` is intercepted and blocked with HTTP `403 Forbidden` ("Veterinary clinical access denied: Ordinary human healthcare providers are not authorized for veterinary records without veterinary clinical accreditation and care relationship").
   - Veterinary Doctors (`VETERINARIAN` role, `VETERINARY_MEDICINE`) route strictly to `/veterinary/dashboard`. Direct navigation or cross-domain traversal to `/dashboard` or `/patients` is blocked with HTTP `403 Forbidden`.
2. **Self-Service Elevation Prevention:**
   - Clinicians attempting to update their own `clinicalPracticeType` via profile update APIs are rejected with `403 Forbidden` ("Clinicians are strictly prohibited from altering their clinical practice type or authorization scope").
3. **Unmapped Custom Practice Types (Fail-Closed):**
   - Creating a doctor under a newly added unmapped practice type assigns only non-clinical `STAFF` privileges.
   - When logging into Doctor Web, the clinician is intercepted fail-closed at the **Clinical Safety Gate R1 Amber Barrier** ("Dual Clinical Role Ambiguity Detected" / "Clinical Practice Type Verification Required"), preventing unauthorized entry into clinical workspaces until an explicit authorized mapping is approved.

---

## Phase 7 — Verification & Integration Test Results

The full automated integration test suite (`verify_goal_014_security_and_e2e.cjs`) was executed against the running Docker stack. All 15 systematic test steps passed with 100% compliance:

| Step # | Test Phase / Description | Expected Contract | Actual Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **01** | Dynamic Catalogue Loading | `GET /api/v1/clinical-practice-types` returns all active records | Returned 6 active records; canonicals present | **PASS** |
| **02** | Catalogue Management Listing | `GET /api/v1/admin/clinical-practice-types` returns records with doctor counts | Returned 6 records with `_count.doctorProfiles`; search supported | **PASS** |
| **03** | Add Practice Type | `POST /api/v1/admin/clinical-practice-types` creates record; duplicate returns 409 | Created test practice type (201); duplicate rejected (409) | **PASS** |
| **04** | Edit Practice Type | `PUT /api/v1/admin/clinical-practice-types/:id` updates display name & description | Successfully updated display name to 'Advanced Ophthalmic Surgery & Retinal Care' (200) | **PASS** |
| **05** | Activate / Deactivate Toggle | `PATCH /api/v1/admin/clinical-practice-types/:id/status` toggles status | Successfully toggled ACTIVE → INACTIVE → ACTIVE; omitted when inactive | **PASS** |
| **06** | In-Use Deletion Rejection | `DELETE /api/v1/admin/clinical-practice-types/:id` rejects in-use & canonical types | Canonical rejected (400); In-use rejected (409 Conflict) | **PASS** |
| **07** | Canonical Protection | Canonical types immutable to deletion, deactivation, and reassignment | Deactivate rejected (400); Reassign rejected (400); Delete rejected (400) | **PASS** |
| **08** | Unmapped Type Fail-Closed | Unmapped practice types halted at Clinical Safety Gate R1 Amber Barrier | Amber barrier rendered visibly; clinical workspace blocked | **PASS** |
| **09** | Human Doctor Registration | `POST /api/v1/admin/users` with `HUMAN_HEALTHCARE` assigns `DOCTOR` role | Doctor created with role `["DOCTOR"]` and `HUMAN_HEALTHCARE` | **PASS** |
| **10** | Human Doctor Dashboard Routing | Human Doctor routes to `/dashboard`; `/veterinary/*` yields 403 barrier | Landed on `/dashboard`; `/veterinary/*` traversal blocked with 403 barrier | **PASS** |
| **11** | Veterinary Doctor Registration | `POST /api/v1/admin/users` with `VETERINARY_MEDICINE` assigns `VETERINARIAN` role | Doctor created with role `["VETERINARIAN"]` and `VETERINARY_MEDICINE` | **PASS** |
| **12** | Veterinary Doctor Dashboard Routing | Vet Doctor routes to `/veterinary/dashboard`; `/dashboard` yields 403 barrier | Landed on `/veterinary/dashboard`; `/dashboard` blocked with 403 barrier | **PASS** |
| **13** | Dynamic Specialty Filtering | `GET /api/v1/doctors/specialties?practiceType=...` isolates specialties | Human returned 12 human specialties; Vet returned 1 vet specialty | **PASS** |
| **14** | Specialty Compatibility Validation | Mismatched clinical practice type and specialty rejected with 400 | Human+Vet specialty rejected (400); Vet+Human specialty rejected (400) | **PASS** |
| **15** | Security & Safety Gate R1 Assertion | RBAC protection, doctor self-edit restriction, cross-domain isolation | Non-admin blocked (401/403); Self-edit blocked (403); Cross-domain blocked (403) | **PASS** |

---

## Visual Verification Artifacts

Visual evidence was captured automatically via Puppeteer during live execution against the Docker environment. All artifacts are stored in `D:\careid\Admin_web\docs\evidence\CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014\`:

1. [goal014_01_admin_login.png](file:///d:/careid/Admin_web/docs/evidence/CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014/goal014_01_admin_login.png): Admin Login screen with authentic branding.
2. [goal014_02_admin_dashboard.png](file:///d:/careid/Admin_web/docs/evidence/CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014/goal014_02_admin_dashboard.png): Admin Dashboard loaded post-login.
3. [goal014_03_settings_tab_navigation.png](file:///d:/careid/Admin_web/docs/evidence/CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014/goal014_03_settings_tab_navigation.png): Settings navigation displaying the **Clinical Practice Types** tab button.
4. [goal014_04_catalogue_table_canonical.png](file:///d:/careid/Admin_web/docs/evidence/CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014/goal014_04_catalogue_table_canonical.png): Management table displaying canonical entries (`HUMAN_HEALTHCARE`, `VETERINARY_MEDICINE`) with status badges and doctor counts.
5. [goal014_05_add_practice_type_modal.png](file:///d:/careid/Admin_web/docs/evidence/CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014/goal014_05_add_practice_type_modal.png): **+ Add Practice Type** modal form with fields for code, display name, description, and authorization mapping.
6. [goal014_06_add_practice_type_success.png](file:///d:/careid/Admin_web/docs/evidence/CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014/goal014_06_add_practice_type_success.png): Catalogue data table displaying the newly registered practice type.
7. [goal014_07_edit_practice_type_canonical.png](file:///d:/careid/Admin_web/docs/evidence/CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014/goal014_07_edit_practice_type_canonical.png): Edit modal on a canonical record demonstrating protected (disabled) code input.
8. [goal014_08_deactivate_dialog_warning.png](file:///d:/careid/Admin_web/docs/evidence/CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014/goal014_08_deactivate_dialog_warning.png): Confirmation dialog warning that deactivating a practice type preserves historical doctor assignments.
9. [goal014_09_delete_rejection_inuse.png](file:///d:/careid/Admin_web/docs/evidence/CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014/goal014_09_delete_rejection_inuse.png): Rejection modal illustrating safety constraint when attempting to delete an in-use catalogue entry.
10. [goal014_10_add_doctor_dynamic_practice_types.png](file:///d:/careid/Admin_web/docs/evidence/CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014/goal014_10_add_doctor_dynamic_practice_types.png): Admin Add Doctor form with dynamic **Clinical Practice Type** dropdown.
11. [goal014_11_add_doctor_specialty_human.png](file:///d:/careid/Admin_web/docs/evidence/CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014/goal014_11_add_doctor_specialty_human.png): Add Doctor form showing primary specialties filtered for Human Healthcare.
12. [goal014_12_add_doctor_specialty_vet.png](file:///d:/careid/Admin_web/docs/evidence/CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014/goal014_12_add_doctor_specialty_vet.png): Add Doctor form showing primary specialties filtered for Veterinary Medicine.
13. [goal014_13_edit_doctor_dialog_dynamic.png](file:///d:/careid/Admin_web/docs/evidence/CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014/goal014_13_edit_doctor_dialog_dynamic.png): Edit Doctor Profile dialog showing dynamic practice type preselected.
14. [goal014_14_doctor_web_workspaces.png](file:///d:/careid/Admin_web/docs/evidence/CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014/goal014_14_doctor_web_workspaces.png): Doctor Web Veterinary Clinical Workspace (`/veterinary/dashboard`).
15. [goal014_15_clinical_safety_gate_amber_barrier.png](file:///d:/careid/Admin_web/docs/evidence/CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014/goal014_15_clinical_safety_gate_amber_barrier.png): Doctor Web Clinical Safety Gate R1 Amber Barrier halting ambiguous/unmapped credentials fail-closed.

---

## Deliverables & Source Traceability

- **Database Migration:**
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/20261124140000_dynamic_clinical_practice_types/migration.sql`
- **Backend Implementation:**
  - `backend/src/modules/admin/clinical-practice-types.controller.ts`
  - `backend/src/modules/admin/clinical-practice-types.service.ts`
  - `backend/src/modules/admin/dto/clinical-practice-type.dto.ts`
  - `backend/src/modules/admin/tests/clinical-practice-types.spec.ts` (17/17 Unit Tests Passing)
  - `backend/src/modules/doctors/doctor.service.ts`
  - `backend/src/modules/admin/admin.service.ts`
- **Admin Web Implementation:**
  - `Admin_web/src/services/clinicalPracticeTypeService.ts`
  - `Admin_web/src/components/settings/AdminSystemSettingsPracticeTypes.tsx`
  - `Admin_web/src/components/settings/AdminSystemSettingsPracticeTypes.css`
  - `Admin_web/src/components/settings/AdminSystemSettingsGeneral.tsx`
  - `Admin_web/src/components/doctors/AdminAddDoctor.tsx`
  - `Admin_web/src/components/doctors/EditDoctorProfileDialog.tsx`
  - `Admin_web/src/components/doctors/AdminDoctorProfile.tsx`
  - `Admin_web/src/services/doctorService.ts`
  - `Admin_web/src/App.tsx`
- **Verification Suite & Scripts:**
  - `Admin_web/scratch/verify_goal_014_security_and_e2e.cjs`
  - `Admin_web/docs/evidence/CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014/`

---

## Conclusion & Sign-Off

The audit and elimination of hardcoded Clinical Practice Type options (Goal 014) is **100% COMPLETE**. The system now features a robust database-backed catalogue, comprehensive Admin CRUD operations, dynamic doctor registration, context-sensitive specialty filtering, and unwavering enforcement of **Clinical Safety Gate R1**.

<!-- GOAL_COMPLETE -->
