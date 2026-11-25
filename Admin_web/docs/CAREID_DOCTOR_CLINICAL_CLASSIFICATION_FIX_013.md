# CAREID Clinical Role Classification & Dual Clinical Role Ambiguity Resolution Report

**Document Reference:** CAREID_DOCTOR_CLINICAL_CLASSIFICATION_FIX_013  
**Milestone:** Resolving CAREID Dual Clinical Role Ambiguity Defect  
**Date:** 2026-11-24  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

This report documents the forensic investigation, architectural remediation, and end-to-end verification of the dual clinical role ambiguity defect in CAREID doctor registration and routing. 

Prior to this fix, all doctors created via Admin Web were assigned a generic `DOCTOR` role without clinical classification (`HUMAN_HEALTHCARE` vs `VETERINARY_MEDICINE`). Furthermore, Doctor Web relied on a brittle regex heuristic that triggered a fail-closed ambiguity block ("Clinical Safety Gate R1") for valid human doctors with specialties not matching 15 regex patterns (such as Nephrology or Dermatology), while also failing closed when accredited veterinarians received human defaults (`General Medicine` department) alongside veterinary specialties.

The resolution adds a first-class, mandatory **Clinical Practice Type** field across the entire stack—database schema, backend NestJS services, Admin Web registration & edit dialogues, and Doctor Web authentication context—guaranteeing genuine single-role isolation without weakening Clinical Safety Gate R1.

---

## 2. Confirmed Root Cause Analysis

Tracing the doctor registration, persistence, authentication, and routing lifecycle uncovered four intersecting root causes:

### 2.1 Admin Web Hardcoding & Omission
In `AdminAddDoctor.tsx`, the registration form jumped directly from personal/license details to "Primary Specialty" without an antecedent "Clinical Practice Type" selector. The specialty dropdown listed both human specialties and "Veterinary Medicine" together in one unsegregated list. In `doctorService.ts` (`useAddDoctorMutation`), outbound payloads hardcoded `role: 'DOCTOR'` and omitted `clinicalPracticeType`.

### 2.2 PostgreSQL Schema & Role Limitations
The PostgreSQL `RoleName` enum and `roles` table in `careid_integration_db` contained only 7 legacy values (`PATIENT`, `FAMILY_MEMBER`, `DOCTOR`, `FACILITY_ADMIN`, `STAFF`, `ADMIN`, `SUPER_ADMIN`). Neither `VETERINARIAN` nor `DOCTOR_VET` existed in `pg_enum`. The `doctor_profiles` table lacked a `clinical_practice_type` column, forcing all clinicians into generic doctor records.

### 2.3 Backend Validation & Guard Misalignments
`POST /api/v1/admin/users` lacked validation between the selected specialty and clinical practice classification. Furthermore, `doctor.controller.ts` guarded `GET /api/v1/doctors/me` with `@Roles('DOCTOR')`, which prohibited any doctor assigned a canonical `VETERINARIAN` role from retrieving their profile during Doctor Web initialization.

### 2.4 Doctor Web Overly Restrictive Fail-Closed Heuristic
In `AuthContext.tsx` (`resolveWorkspaceDetails`), the fail-closed check at line 166:
```typescript
if (!hasHumanSpec && !hasVetSpec && !hasExplicitVetRole)
```
failed closed whenever a doctor's specialty was not matched by the 15 narrow regex keywords in `matchesHumanClinical` (e.g. Dermatology, Nephrology, Pulmonology, Psychiatry). This ignored `hasExplicitDoctorRole`, causing valid human doctors to be intercepted by Clinical Safety Gate R1.

---

## 3. Database Schema & Data Migration Changes

All database changes were executed against PostgreSQL database `careid_integration_db` on port 5433 (container `careid-integration-postgres`):

```sql
-- 1. Extend RoleName enum with canonical roles
ALTER TYPE "RoleName" ADD VALUE IF NOT EXISTS 'VETERINARIAN';
ALTER TYPE "RoleName" ADD VALUE IF NOT EXISTS 'DOCTOR_VET';

-- 2. Insert canonical role definitions into roles table
INSERT INTO roles (id, name, description) 
VALUES (gen_random_uuid(), 'VETERINARIAN', 'Veterinary Medical Practitioner with animal clinical management capabilities')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (id, name, description) 
VALUES (gen_random_uuid(), 'DOCTOR_VET', 'Dual-scope clinician with verified human and veterinary clinical credentials')
ON CONFLICT (name) DO NOTHING;

-- 3. Add clinical_practice_type column to doctor_profiles
ALTER TABLE doctor_profiles 
ADD COLUMN IF NOT EXISTS clinical_practice_type TEXT DEFAULT 'HUMAN_HEALTHCARE';

-- 4. Add clinical_practice_type column to master_data_items
ALTER TABLE master_data_items 
ADD COLUMN IF NOT EXISTS clinical_practice_type TEXT DEFAULT 'HUMAN_HEALTHCARE';

-- 5. Classify master catalogue specialties
UPDATE master_data_items 
SET clinical_practice_type = 'VETERINARY_MEDICINE' 
WHERE code = 'VETERINARY_MEDICINE' OR name ILIKE '%veterinary%';

UPDATE master_data_items 
SET clinical_practice_type = 'HUMAN_HEALTHCARE' 
WHERE code != 'VETERINARY_MEDICINE' AND name NOT ILIKE '%veterinary%';
```

---

## 4. Exact Source Files Changed

### 4.1 Backend (`D:\careid\backend`)
1. **`prisma/schema.prisma`**
   - Added `VETERINARIAN` and `DOCTOR_VET` to `enum RoleName`.
   - Added `clinicalPracticeType String? @default("HUMAN_HEALTHCARE") @map("clinical_practice_type")` to `DoctorProfile` and `MasterDataItem`.
   - Regenerated Prisma Client (`npx prisma generate`).

2. **DTOs**
   - `src/modules/admin/presentation/dto/admin-user-management.dto.ts`: Added `clinicalPracticeType?: string` to `CreateAdminUserDto` and `UpdateAdminUserDto`; added `VETERINARIAN` and `DOCTOR_VET` to role enum.
   - `src/modules/admin/presentation/dto/admin-doctor-registration.dto.ts`: Added `clinicalPracticeType?: string` to `AdminRegisterDoctorDto` and `AdminDoctorResponseDto`.
   - `src/modules/doctor/presentation/dto/doctor-response.dto.ts`: Added `clinicalPracticeType?: string` to `DoctorProfileFullResponseDto`.
   - `src/modules/doctor/presentation/dto/register-doctor.dto.ts`: Added `clinicalPracticeType?: string` to `RegisterDoctorDto`.
   - `src/modules/auth/presentation/dto/password-login.dto.ts`: Added `clinicalPracticeType?: string` and `doctorProfile?: any` to `PasswordLoginUserDto`.

3. **Repositories & Interfaces**
   - `src/modules/admin/domain/repositories/admin.repository.interface.ts`: Added `practiceType?: string` parameter to `getSpecialties`.
   - `src/modules/admin/infrastructure/database/admin.repository.ts`: Added `VETERINARIAN` and `DOCTOR_VET` to `validRoles`; supported them in `registerDoctorForExistingUser` and `createUser`; persisted `clinicalPracticeType`; added `practiceType` query filter in `getSpecialties`.
   - `src/modules/doctor/domain/repositories/doctor.repository.interface.ts`: Added `practiceType?: string` parameter to `getSpecialties`.
   - `src/modules/doctor/infrastructure/database/doctor.repository.ts`: Supported `practiceType` query parameter in `getSpecialties`.

4. **Services & Controllers**
   - `src/modules/admin/application/use-cases/admin.service.ts`: Enforced server-side validation between `clinicalPracticeType` and `primarySpecialization`; mapped practice type to canonical roles (`HUMAN_HEALTHCARE` -> `DOCTOR`, `VETERINARY_MEDICINE` -> `VETERINARIAN`); passed `practiceType` filter to repository.
   - `src/modules/admin/presentation/controllers/admin.controller.ts`: Accepted `@Query('practiceType') practiceType?: string` on `getSpecialties`.
   - `src/modules/doctor/application/use-cases/doctor.service.ts`: Enhanced `isPureVeterinarian` to check `clinicalPracticeType === 'VETERINARY_MEDICINE'` / `'HUMAN_HEALTHCARE'` with fallback; added `clinicalPracticeType` in `mapDoctor`; passed `practiceType` filter in `getSpecialties`.
   - `src/modules/doctor/presentation/controllers/doctor.controller.ts`: Updated `@Get('me')` to `@Roles('DOCTOR', 'VETERINARIAN', 'DOCTOR_VET')`; accepted `@Query('practiceType') practiceType?: string` on `getSpecialties`.
   - `src/modules/auth/application/use-cases/auth.service.ts`: Added permissions for `VETERINARIAN` and `DOCTOR_VET` to `permissionMap`; returned `clinicalPracticeType` in `verifyOtp` and `passwordLogin` responses.

### 4.2 Admin Web (`D:\careid\Admin_web`)
1. **`src/services/doctorService.ts`**
   - Added `clinicalPracticeType?: 'HUMAN' | 'VETERINARY'` to `DoctorItem`, `CreateDoctorPayload`, `BackendDoctor`, and `SpecialtyItem`.
   - Added `practiceType: 'HUMAN' | 'VETERINARY'` to `DEFAULT_SPECIALTIES`.
   - Updated `useSpecialtiesQuery` to accept `practiceType?: 'HUMAN' | 'VETERINARY'` and forward query parameter `practiceType`.
   - Updated `mapBackendDoctorToItem` to extract and normalize `clinicalPracticeType`.
   - Updated `useAddDoctorMutation` to assign role `DOCTOR` vs `VETERINARIAN`, set `clinicalPracticeType`, and assign appropriate department default (`Veterinary Clinical Services` vs `General Medicine`).
   - Updated `useUpdateDoctorProfileMutation` to persist `clinicalPracticeType`.

2. **`src/components/doctors/AdminAddDoctor.tsx`**
   - Added mandatory `clinicalPracticeType: z.enum(['HUMAN', 'VETERINARY'])` to `addDoctorSchema`.
   - Positioned the Clinical Practice Type dropdown before Primary Specialty.
   - Implemented dynamic filtering of the specialty dropdown based on `clinicalPracticeType`.
   - Automatically resets selected specialty if the user switches practice type to avoid mismatched entries.

3. **`src/components/doctors/EditDoctorProfileDialog.tsx`**
   - Added `clinicalPracticeType` to `editDoctorSchema`.
   - Positioned Clinical Practice Type selector before Primary Specialty.
   - Filtered specialties dynamically and reset invalid specialty selections on practice type switch.
   - Forwarded `clinicalPracticeType` on save.

4. **`src/components/doctors/AdminDoctorProfile.tsx`**
   - Rendered Clinical Practice Type badge in Header region (`Human Healthcare` vs `Veterinary Medicine`).
   - Added a dedicated "Clinical Practice Type" field in the Professional Details 3-column grid before Primary Specialty.

### 4.3 Doctor Web (`D:\careid\doctor_web`)
1. **`src/context/AuthContext.tsx`**
   - Refined `resolveWorkspaceDetails` to enforce symmetrical, fail-closed clinical credential classification:
     ```typescript
     const hasVetCredential = hasExplicitVetRole || hasVetSpec;
     const hasHumanCredential = hasExplicitDoctorRole || hasHumanSpec;

     // Genuine dual-credential ambiguity:
     // - Holds explicit DOCTOR_VET role
     // - Or holds conflicting credentials across both disciplines
     const isDualRole =
       isExplicitDualRoleFlag ||
       (hasHumanCredential && hasVetCredential);

     if (isDualRole) {
       return {
         workspaceType: 'HUMAN',
         isHumanDoctor: true,
         isVeterinarian: true,
         hasDualRoleAmbiguity: true,
       };
     }

     // Fail closed if neither human nor veterinary credentials can be verified
     if (!hasHumanCredential && !hasVetCredential) {
       return {
         workspaceType: 'HUMAN',
         isHumanDoctor: false,
         isVeterinarian: false,
         hasDualRoleAmbiguity: true,
       };
     }

     // Single-role Verified Veterinarian
     if (hasVetCredential && !hasHumanCredential) {
       return {
         workspaceType: 'VETERINARIAN',
         isHumanDoctor: false,
         isVeterinarian: true,
         hasDualRoleAmbiguity: false,
       };
     }

     // Single-role Verified Human Doctor
     if (hasHumanCredential && !hasVetCredential) {
       return {
         workspaceType: 'HUMAN',
         isHumanDoctor: true,
         isVeterinarian: false,
         hasDualRoleAmbiguity: false,
       };
     }
     ```
   - **Security Bypass Remediation (Iteration 2 refinement):** Symmetrically evaluates `hasHumanCredential` vs `hasVetCredential`. Previously, an asymmetric check (`!hasHumanSpec`) at the veterinarian resolution branch permitted accounts with role `['DOCTOR']` and specialty `'Veterinary Medicine'` (lacking an explicit human department), or dual roles `['DOCTOR', 'VETERINARIAN']` with non-regex specialty (e.g. `'Dermatology'`), to bypass Clinical Safety Gate R1 directly into the Veterinary workspace. With full credential cross-evaluation (`hasHumanCredential && hasVetCredential`), all cross-discipline combinations reliably trigger Clinical Safety Gate R1 (`hasDualRoleAmbiguity: true`), while single-credential clinicians route smoothly to their respective clinical workspaces.

---

## 5. UI Layout & ASCII Screenshots

### 5.1 Admin Web — Add Doctor Form (Section 2: Professional Details)
```
+---------------------------------------------------------------------------------------+
|  SECTION 2: PROFESSIONAL DETAILS                                                      |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|  Medical License *                   Issuing Body *                                   |
|  [ LIC-MD-2026-9081              ]   [ State Medical Board                        ]   |
|                                                                                       |
|  License Expiry *                    Years of Experience *                            |
|  [ 2029-12-31                    ]   [ 12                                         ]   |
|                                                                                       |
|  Clinical Practice Type *                                                             |
|  [ Human Healthcare (HUMAN)                                                        v ]|
|                                                                                       |
|  Primary Specialty *                                                   + Add Specialty|
|  [ Cardiology                                                                      v ]|
|  (Dropdown shows ONLY Human specialties: Cardiology, Neurology, Nephrology, etc.)     |
|                                                                                       |
|  Sub-specialty (Optional)                                                             |
|  [ Interventional Cardiology                                                         ]|
|                                                                                       |
+---------------------------------------------------------------------------------------+
```

### 5.2 Admin Web — Doctor Profile Header & Professional Details
```
+---------------------------------------------------------------------------------------+
|  Dr. John Smith, MD   [ Human Healthcare ]   [ Verified ]                             |
|  Cardiology                                                                           |
|  Care ID: DOC-360-SMITH1  |  Medical License: LIC-MD-2026-SMITH                       |
+---------------------------------------------------------------------------------------+
|  PROFESSIONAL DETAILS                                                                 |
|                                                                                       |
|  Medical Council Reg:        License Expiry:            Years of Experience:          |
|  MED-REG-2026-SMITH          2029-12-31                 10 Years                      |
|                                                                                       |
|  Clinical Practice Type:     Primary Specialty:         Sub-specialty:                |
|  Human Healthcare            Cardiology                 Interventional Cardiology     |
|                                                                                       |
|  Primary Facility:                                                                    |
|  Department of Cardiology [PRIMARY]                                                   |
+---------------------------------------------------------------------------------------+
```

### 5.3 Doctor Web — Routing & Species Isolation Architecture (Option A)
```
                                 [ Doctor Web Login ]
                                          │
                                          ▼
                             [ GET /api/v1/auth/me ]
                           [ GET /api/v1/doctors/me ]
                                          │
                                          ▼
                             resolveWorkspaceDetails()
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
             Single Human Role     Single Vet Role      Credential Conflict /
             (roles: ['DOCTOR'])   (roles: ['VET...'])   Dual Roles / Missing
                    │                     │                     │
                    ▼                     ▼                     ▼
              /dashboard         /veterinary/dashboard   Clinical Safety Gate R1
            (PatientLayout)       (VeterinaryLayout)      [ AMBER ALERT BANNER ]
                    │                     │               Execution Halted.
         (Blocks Vet URL direct) (Blocks Human URL direct)
```

---

## 6. Role Isolation Test Results & Evidence

### 6.1 Backend API Endpoint Tests

#### Test 1: Dynamic Catalogue Filter for Human Specialties
```http
GET /api/v1/doctors/specialties?practiceType=HUMAN_HEALTHCARE
Authorization: Bearer <TOKEN>
```
**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    { "code": "CARDIOLOGY", "name": "Cardiology", "clinicalPracticeType": "HUMAN_HEALTHCARE" },
    { "code": "NEUROLOGY", "name": "Neurology", "clinicalPracticeType": "HUMAN_HEALTHCARE" },
    { "code": "ONCOLOGY", "name": "Oncology", "clinicalPracticeType": "HUMAN_HEALTHCARE" },
    { "code": "PEDIATRICS", "name": "Pediatrics", "clinicalPracticeType": "HUMAN_HEALTHCARE" },
    { "code": "DERMATOLOGY", "name": "Dermatology", "clinicalPracticeType": "HUMAN_HEALTHCARE" },
    { "code": "ORTHOPEDICS", "name": "Orthopedics", "clinicalPracticeType": "HUMAN_HEALTHCARE" },
    { "code": "GENERAL_SURGERY", "name": "General Surgery", "clinicalPracticeType": "HUMAN_HEALTHCARE" },
    { "code": "PSYCHIATRY", "name": "Psychiatry", "clinicalPracticeType": "HUMAN_HEALTHCARE" },
    { "code": "INTERNAL_MEDICINE", "name": "Internal Medicine", "clinicalPracticeType": "HUMAN_HEALTHCARE" },
    { "code": "PULMONOLOGY", "name": "Pulmonology", "clinicalPracticeType": "HUMAN_HEALTHCARE" },
    { "code": "RHEUMATOLOGY", "name": "Rheumatology", "clinicalPracticeType": "HUMAN_HEALTHCARE" },
    { "code": "NEPHROLOGY", "name": "Nephrology", "clinicalPracticeType": "HUMAN_HEALTHCARE" }
  ]
}
```
*Result:* Returns only Human Healthcare specialties (12 items). `Veterinary Medicine` is 100% excluded.

#### Test 2: Dynamic Catalogue Filter for Veterinary Specialties
```http
GET /api/v1/doctors/specialties?practiceType=VETERINARY_MEDICINE
Authorization: Bearer <TOKEN>
```
**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    { "code": "VETERINARY_MEDICINE", "name": "Veterinary Medicine", "clinicalPracticeType": "VETERINARY_MEDICINE" }
  ]
}
```
*Result:* Returns only Veterinary Medicine. All Human Healthcare specialties are 100% excluded.

#### Test 3: QA Test Doctor (`dr.smith@careid.com`) Authentication & Scope Verification
```http
POST /api/v1/auth/password/login
Content-Type: application/json

{
  "email": "dr.smith@careid.com",
  "password": "Password123!"
}
```
**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "e392e66d-7e5a-43a8-9c38-a4ab39c8dbfa",
      "user_type": "doctor",
      "role": { "id": "01b28e0c-e5f0-4df9-98d2-cc61f1e51bd5", "name": "DOCTOR" },
      "email": "dr.smith@careid.com",
      "roles": ["DOCTOR"],
      "clinicalPracticeType": "HUMAN_HEALTHCARE"
    }
  }
}
```
*Result:* Authentic single role (`DOCTOR`) and clinical classification (`HUMAN_HEALTHCARE`) returned without dual credentials.

#### Test 4: Profile Endpoint Authorization (`GET /api/v1/doctors/me`)
```http
GET /api/v1/doctors/me
Authorization: Bearer <dr.smith-token>
```
**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "fullName": "Dr. John Smith, MD",
    "primarySpecialization": "Cardiology",
    "clinicalPracticeType": "HUMAN_HEALTHCARE",
    "medicalCouncil": "State Medical Board",
    "verificationStatus": "VERIFIED"
  }
}
```
*Result:* Cleanly authorized and returned profile.

### 6.2 Doctor Web Workspace Resolution Matrix (14 Empirical Stress Test Cases)

| # | Scenario & Test Case Description | Roles Input | Specialization / Context | Resolved Workspace | Ambiguity Status | Expected Routing / Result | Status |
|:--|:---|:---|:---|:---|:---|:---|:---|
| 1 | **a. Human doctor (regex specialty)** | `['DOCTOR']` | `Cardiology` | `HUMAN` | `false` | Direct to `/dashboard` | **PASS** |
| 2 | **b1. Human doctor (non-regex specialty)** | `['DOCTOR']` | `Dermatology` | `HUMAN` | `false` | Direct to `/dashboard` | **PASS** |
| 3 | **b2. Human doctor (non-regex specialty)** | `['DOCTOR']` | `Nephrology` | `HUMAN` | `false` | Direct to `/dashboard` | **PASS** |
| 4 | **b3. Human doctor (non-regex specialty)** | `['DOCTOR']` | `Psychiatry` | `HUMAN` | `false` | Direct to `/dashboard` | **PASS** |
| 5 | **c. Accredited Veterinarian** | `['VETERINARIAN']` | `Veterinary Medicine` | `VETERINARIAN` | `false` | Direct to `/veterinary/dashboard` | **PASS** |
| 6 | **d. Genuine Dual Role (`DOCTOR_VET`)** | `['DOCTOR_VET']` | `General Medicine` | `HUMAN` | `true` | Halted at Clinical Safety Gate R1 | **PASS** |
| 7 | **e1. Conflicting credentials (human role + vet spec + human dept)** | `['DOCTOR']` | `Veterinary Medicine`, Dept: `General Medicine` | `HUMAN` | `true` | Halted at Clinical Safety Gate R1 | **PASS** |
| 8 | **e2. Conflicting credentials (human role + vet spec, no dept)** | `['DOCTOR']` | `Veterinary Medicine` | `HUMAN` | `true` | Halted at Clinical Safety Gate R1 | **PASS** |
| 9 | **e3. Conflicting credentials (vet role + human spec)** | `['VETERINARIAN']` | `Cardiology` | `HUMAN` | `true` | Halted at Clinical Safety Gate R1 | **PASS** |
| 10| **e4. Conflicting credentials (human spec + vet secondary)** | `['DOCTOR']` | Primary: `Cardiology`, Secondary: `Veterinary Medicine` | `HUMAN` | `true` | Halted at Clinical Safety Gate R1 | **PASS** |
| 11| **e5. Conflicting credentials (dual roles + non-regex spec)** | `['DOCTOR', 'VETERINARIAN']` | `Dermatology` | `HUMAN` | `true` | Halted at Clinical Safety Gate R1 | **PASS** |
| 12| **f1. Missing clinical role (PATIENT role)** | `['PATIENT']` | `None` | `HUMAN` | `true` | Halted at Clinical Safety Gate R1 | **PASS** |
| 13| **f2. Missing clinical role (empty roles array)** | `[]` | `None` | `HUMAN` | `true` | Halted at Clinical Safety Gate R1 | **PASS** |
| 14| **f3. Unresolvable inputs (null user / doctor)** | `null` | `null` | `HUMAN` | `true` | Halted at Clinical Safety Gate R1 | **PASS** |

*Outcome:* 14/14 tests pass (100% pass rate). Clinical Safety Gate R1 prevents all ambiguous, conflicting, and missing credential vectors from accessing single-role workspaces without ambiguity resolution.

### 6.3 Automated Test Suites Pass Status
- **Backend Tests:**
  - `src/modules/auth/tests/password-login.spec.ts`: **PASS** (21/21 tests passed)
  - `src/modules/admin/tests/admin-doctor-creation.spec.ts`: **PASS** (14/14 tests passed)
  - `src/modules/admin/tests/admin-doctor-registration.spec.ts`: **PASS** (21/21 tests passed)
  - `src/modules/doctor/tests/doctor.service.spec.ts`: **PASS** (40/40 tests passed)
- **Application Builds:**
  - `backend`: `npm run build` -> Exit code 0 (TypeScript compile clean)
  - `Admin_web`: `npm run build` -> Exit code 0 (`tsc -b && vite build` clean)
  - `doctor_web`: `npm run build` -> Exit code 0 (`tsc -b && vite build` clean)

---

## 7. Safety Constraints Compliance Attestation

In accordance with mandatory constraints:
1. **Flutter Mobile Apps:** Untouched (zero modifications made).
2. **`careid_integration_db`:** Preserved (no reset, re-seed, or loss of existing clinical records).
3. **`C:\Users\biswa\Downloads`:** Untouched.
4. **Ports 3000/5432:** Untouched (integration environment runs on 3001, 5174, 5173, and 5433).
5. **Docker Volumes:** Preserved (no volumes removed or deleted).

---

## 8. Remaining Issues & Next Steps

There are zero outstanding regressions or defects. The implementation has been validated across database, backend API, admin web, and doctor web routing.
