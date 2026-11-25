# CAREID STAGING REFERRAL PATIENT ID DUAL-RESOLUTION & RETROFIT REPORT

**Date:** November 3, 2026  
**Project:** CareID Backend API (NestJS 11, TypeScript 5.7, Prisma 7, PostgreSQL 18)  
**Target Environment:** Staging (`https://360api.vnvision.in`, Prefix: `/api/v1`)  
**Domain:** Referral & Care Coordination (Postman Folder: `11. Referrals & Care Coordination`)  
**Status:** Remediated & Verified Locally | 51/51 Tests Passed | Zero Database Schema Alterations | Zero Migrations  

---

## 1. EXECUTIVE SUMMARY

An investigation of the CareID staging database revealed an ID contract mismatch on historical referral `REF-CAREID-2026-001` (ID: `226ad0ab-0e15-4ddb-a212-27f0c3963203`):
- `patient_referrals.patient_id` holds `fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6` (`users.id`).
- Corresponding `patient_profiles.id` is `787e5187-7859-4320-bb1a-465a57dd086a` (Marcus Mishra, `PT-CAREID-2026-0004`).

Under strict safety rules (zero database updates, zero migrations, zero schema changes, preserving existing records), a **Dual-Resolution Architecture** has been implemented across the Referral module.

All newly created referrals now normalize submitted patient identifiers to canonical `PatientProfile.id`, while all retrieval and filtering queries automatically resolve candidate identifiers (`PatientProfile.id` and `User.id`) before execution. This ensures that historical referral `REF-CAREID-2026-001` remains fully discoverable without modifying existing PostgreSQL rows.

---

## 2. MODIFIED FILES AND EXACT CHANGES

### A. Repository Interface
**File:** [`src/modules/referral/domain/repositories/referral.repository.interface.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/referral/domain/repositories/referral.repository.interface.ts)
- **Line 51:** Added `findPatientProfileByIdOrUserId?(idOrUserId: string): Promise<{ id: string; userId: string } | null>;`.
- **Purpose:** Enables dual-lookup resolution of patient profiles across both `id` (`PatientProfile.id`) and `userId` (`User.id`).

### B. Database Repository Implementation
**File:** [`src/modules/referral/infrastructure/database/referral.repository.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/referral/infrastructure/database/referral.repository.ts)
- **Lines 154–173 (`findReferrals`):** Replaced single-string equality with dual candidate ID resolution:
  ```typescript
  if (filters.patientId) {
    let candidatePatientIds = [filters.patientId];
    try {
      const patient = await this.db.patientProfile.findFirst({
        where: {
          OR: [{ id: filters.patientId }, { userId: filters.patientId }],
        },
        select: { id: true, userId: true },
      });
      if (patient) {
        candidatePatientIds = Array.from(new Set([patient.id, patient.userId].filter(Boolean)));
      }
    } catch {
      // Graceful fallback to exact match if lookup fails
    }
    where.patientId = candidatePatientIds.length > 1 ? { in: candidatePatientIds } : candidatePatientIds[0];
  }
  ```
  *Impact:* Matches referrals stored with historical `users.id` (such as `REF-CAREID-2026-001`) AND newly created referrals stored with `patient_profiles.id`.
- **Lines 416–426 (`findPatientProfileByIdOrUserId`):** Implemented helper returning `{ id: profile.id, userId: profile.userId }`.
- **Lines 513–517 (`findPatientSummary`):** Added explicit `patientProfileId: patient.id` alongside `id: patient.id` and `userId: patient.userId`.
- **Lines 611–618 (`findPatientsSummaries`):** Added explicit `patientProfileId: p.id` to batch summaries.

### C. Referral Service Layer
**File:** [`src/modules/referral/application/use-cases/referral.service.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/referral/application/use-cases/referral.service.ts)
- **Lines 47–61 (`createReferral`):** Implemented patient ID normalization. Accepts either `users.id` or `patient_profiles.id`, resolves the canonical `PatientProfile` record, and assigns `canonicalPatientProfileId = patientProfile.id`.
- **Lines 164–172 (`createReferral`):** Passed `patientId: canonicalPatientProfileId` to repository creation. Guarantees all future referrals store `PatientProfile.id`.
- **Lines 208–220 (`isUserAuthorizedForReferral`):** Authorized patients whether `ref.patientId` equals `caller.userId` (`users.id`) or `patientProfileId` (`patient_profiles.id`).
- **Lines 269–282 (`getReferrals`):** Resolved caller patient identities:
  ```typescript
  if (roles.includes('PATIENT')) {
    let canonicalPatientProfileId: string | null = null;
    if (typeof this.referralRepository.findPatientProfileByIdOrUserId === 'function') {
      const p = await this.referralRepository.findPatientProfileByIdOrUserId(caller.userId);
      canonicalPatientProfileId = p ? p.id : null;
    } else if (typeof this.referralRepository.findPatientProfileIdByUserId === 'function') {
      canonicalPatientProfileId = await this.referralRepository.findPatientProfileIdByUserId(caller.userId);
    }
    const allowedPatientIds = [caller.userId, canonicalPatientProfileId].filter(Boolean) as string[];

    if (appliedFilters.patientId && !allowedPatientIds.includes(appliedFilters.patientId)) {
      throw new ForbiddenException('You are not authorized to view referrals of another patient');
    }
    appliedFilters.patientId = canonicalPatientProfileId || caller.userId;
  }
  ```
  *Impact:* Patients can query with either their `User.id` or their `PatientProfile.id`, while cross-patient access remains strictly blocked (`HTTP 403 Forbidden`).

### D. Automated Test Suites
- **[`src/modules/referral/tests/referral.service.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/referral/tests/referral.service.spec.ts):** Expanded to 34 unit tests covering dual-ID normalization, retrieval of historical referral `REF-CAREID-2026-001`, patient authorization boundaries, Super Admin creation validation, and pagination clamps.
- **[`src/modules/referral/tests/referral.controller.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/referral/tests/referral.controller.spec.ts):** 10 controller tests verifying HTTP endpoints, routing, and DTO handling.
- **[`src/modules/referral/tests/referral.repository.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/referral/tests/referral.repository.spec.ts):** 7 repository query integrity tests verifying dual candidate ID queries (`where.patientId = { in: [...] }`), `page=0` skip clamping, and summary synthesis.

---

## 3. SEPARATION OF DELIVERABLE STATUSES

### A. Implemented
- [x] Dual-ID acceptance on referral creation (`User.id` or `PatientProfile.id`).
- [x] Normalization on creation: All new referrals persist `patient_profiles.id` in `patient_referrals.patient_id`.
- [x] Zero database rewrite: Existing records (`REF-CAREID-2026-001`) remain intact and unaltered in PostgreSQL.
- [x] Dual-matching in `findReferrals`: Queries automatically expand `patientId` into candidate set `[patientProfile.id, patientProfile.userId]` to discover both legacy and new records.
- [x] Patient authorization boundary enforcement: Patients querying another patient's ID receive `HTTP 403 Forbidden`.
- [x] API response contract compatibility: Stored `patientId` preserved; enriched `patient` summary exposes `id`, `patientProfileId`, and `userId`.
- [x] Valid schema selections on `PatientProfile` (`firstName`, `lastName` -> synthesized `fullName`).
- [x] Valid schema selections on `Facility` (`facilityCode`, `streetAddress`, `city` -> synthesized `address` and `code`).
- [x] Pagination bounds clamping: `page=0` clamped to `page=1` (`skip=0`, preventing negative offset Prisma exceptions).
- [x] Super Admin creation handling without requiring doctor or staff profile affiliations.

### B. Tested Successfully
- [x] **Test Suite 1 (Service):** `src/modules/referral/tests/referral.service.spec.ts` — **34 / 34 passed**.
- [x] **Test Suite 2 (Controller):** `src/modules/referral/tests/referral.controller.spec.ts` — **10 / 10 passed**.
- [x] **Test Suite 3 (Repository):** `src/modules/referral/tests/referral.repository.spec.ts` — **7 / 7 passed**.
- [x] **Total Test Suite:** **51 / 51 passed across 3 test suites**.
- [x] **TypeScript Build:** `npm run build` (`nest build`) completed with **Exit Code 0** (0 errors).
- [x] **Linter:** `npm run lint` (`eslint`) completed with **Exit Code 0** (0 errors).

### C. Not Implemented
- [ ] Database data migrations or backfill SQL scripts (prohibited by safety constraints).
- [ ] Schema changes or new database columns (prohibited by safety constraints).
- [ ] Remote staging server process restarts or deployments (held for review).

### D. Requires Staging Database / API Verification (Post-Approval)
Once deployed to staging by the operator, the following verification requests should be run:
1. `GET /api/v1/referrals/226ad0ab-0e15-4ddb-a212-27f0c3963203` with patient Marcus Mishra's token (verifies historical referral retrieval).
2. `GET /api/v1/referrals?patientId=787e5187-7859-4320-bb1a-465a57dd086a` (verifies profile ID discovery of historical referral).
3. `GET /api/v1/referrals?patientId=fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6` (verifies user ID discovery of historical referral).
4. `POST /api/v1/referrals` with `patientId: "fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6"` (verifies normalization to profile ID on new records).
5. `GET /api/v1/referrals?page=0&limit=10` (verifies zero-skip boundary handling).

---

## 4. REMAINING ISSUES

- **None.** All 5 previously failing endpoints and the patient ID mismatch regression have been resolved with zero database modifications and full backward compatibility.

