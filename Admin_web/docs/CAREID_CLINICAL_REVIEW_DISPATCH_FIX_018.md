# CareID Technical Fix Specification: Clinical Review Dispatch Alignment (CAREID-018)

**Document Reference:** `CAREID_CLINICAL_REVIEW_DISPATCH_FIX_018.md`  
**Priority:** P1 — Critical Functional Defect  
**Target Offer UUID:** `fc09c21e-a929-45aa-95d7-fde9c9350279`  
**Target Repositories:** `D:\careid\backend`, `D:\careid\doctor_web`  
**Integration Stack:** Port 3001 (Backend), Port 5173 (Doctor Web), Port 5433 (PostgreSQL)  

---

## 1. Overview of Architecture & Design Principles

To resolve the discrepancy between Doctor Web and the Backend dispatch guard without weakening clinical review safety, the solution establishes a **Single Authoritative Clinical Review Eligibility Contract** owned strictly by the Backend:

1. **No Fake Fallback Data:** The retrieval endpoint `GET /doctors/treatment-offers/:offerId/clinical-review` no longer fabricates an `APPROVED` review when none exists.
2. **Unified Evaluator:** Both `getClinicalReview()` and `dispatchOffer()` invoke the exact same evaluator: `evaluateClinicalReviewEligibility()`.
3. **Transparent Review States:** Added explicit `PENDING` state to `ClinicalReviewAction`.
4. **Offer Versioning Invalidation:** If an offer is updated, any prior review approval is marked outdated (`isOutdatedVersion: true`), blocking dispatch until a clinician re-reviews the modified offer.
5. **Role Array Matching:** Clinicians with multi-role accounts (e.g. `['PATIENT', 'DOCTOR']`) correctly resolve their clinician privileges.
6. **Practice Scope Isolation:** Human clinicians cannot review veterinary treatment offers and vice versa.
7. **Actionable UI States:** Doctor Web dynamically renders distinct UI states (APPROVED, PENDING, REJECTED, OUTDATED) and provides an immediate one-click approval action on the Review & Send page.

---

## 2. Backend Modifications

### A. Data Transfer Objects (`backend/src/modules/treatment-offer/presentation/dto/treatment-offer.dto.ts`)
1. Extended `ClinicalReviewAction`:
   ```typescript
   export enum ClinicalReviewAction {
     APPROVED = 'APPROVED',
     REJECTED = 'REJECTED',
     NEEDS_INFORMATION = 'NEEDS_INFORMATION',
     PENDING = 'PENDING',
   }
   ```
2. Extended `ClinicalReviewResponseDto`:
   ```typescript
   export class ClinicalReviewResponseDto {
     treatmentOfferId!: string;
     status!: ClinicalReviewAction;
     comments?: string;
     reviewedBy?: string;
     reviewedAt?: string;
     eligibleForDispatch?: boolean;
     eligibilityReason?: string;
     offerVersion?: number;
     isOutdatedVersion?: boolean;
   }
   ```

### B. Repository Layer (`backend/src/modules/treatment-offer/infrastructure/database/treatment-offer.repository.ts`)
Updated `offerInclude()` to select `clinicalPracticeType` from `doctorProfile`:
```typescript
doctor: {
  select: {
    id: true,
    userId: true,
    clinicalPracticeType: true,
    user: { ... }
  }
}
```

### C. Application Service (`backend/src/modules/treatment-offer/application/use-cases/treatment-offer.service.ts`)
1. **Added `evaluateClinicalReviewEligibility()`:**
   - Validates existence of a recorded review in `treatment_offer_history` with `action === 'CLINICAL_REVIEW'`.
   - Validates status is `APPROVED`. If `REJECTED` or `NEEDS_INFORMATION`, marks ineligible with descriptive reason.
   - Validates that review metadata matches the target patient (`patientProfileId`).
   - Validates offer version (`metadata.offerVersion === offer.version`). If outdated, flags `isOutdatedVersion: true`.
   - Validates procedure coverage against current offer procedures.
   - Validates clinical practice type consistency (Human vs Veterinary).
   - Validates reviewer role authorization (`DOCTOR`, `PRACTITIONER`, `ADMIN`, `SUPER_ADMIN`, `FACILITY_ADMIN`).

2. **Refactored `getClinicalReview()`:**
   - Evaluates eligibility via `evaluateClinicalReviewEligibility()`.
   - If no review exists, returns `status: PENDING`, `eligibleForDispatch: false`, and an actionable message indicating a multidisciplinary review is required.
   - Returns real reviewer identifier and timestamp from persisted metadata.

3. **Enhanced `submitClinicalReview()`:**
   - Enforces offer status check: `offer.status === TreatmentOfferStatus.DRAFT`.
   - Resolves role using `.find((r) => authorizedRoles.includes(r))` across `roles[]`.
   - Validates clinical practice type compatibility between clinician and offer.
   - Persists rich audit metadata in `treatment_offer_history`:
     ```json
     {
       "offerVersion": 1,
       "patientProfileId": "...",
       "procedureCodes": ["9852"],
       "clinicalPracticeType": "HUMAN_HEALTHCARE",
       "reviewerRole": "DOCTOR"
     }
     ```

4. **Updated `dispatchOffer()`:**
   - Replaced fragmented historical query with `evaluateClinicalReviewEligibility()`.
   - If not eligible, throws HTTP 409 Conflict with `eligibility.reason`.
   - **Enforces Facility Procedure Chargemaster Pricing (Phase 5 Requirement 6 & Phase 11 TEST 18):**
     Validates active `facilityProcedurePrice` record for every procedure in the offer matching the facility's billing currency and unconfigured pricing policy (`REQUIRE_EXPLICIT_PRICE`). If missing, throws HTTP 409 Conflict prior to dispatch.
   - Preserves row-level locking (`SELECT ... FOR UPDATE`) in `treatment-offer.repository.ts` to prevent race conditions during concurrent dispatch attempts.

5. **Reviewer Name Resolution:**
   - `submitClinicalReview()` and `evaluateClinicalReviewEligibility()` look up the reviewer's registered name (`doctorProfile.fullName` or `user.firstName / lastName`) and expose `reviewerName` alongside `reviewedBy`, enabling the UI to render "Dr. Sarah Jenkins" rather than an opaque UUID.

---

## 3. Doctor Web Modifications

### A. API Service (`doctor_web/src/services/treatmentOfferService.ts`)
Extended `ClinicalReviewDTO` interface with eligibility metadata:
```typescript
export interface ClinicalReviewDTO {
  treatmentOfferId: string;
  status: 'APPROVED' | 'REJECTED' | 'NEEDS_INFORMATION' | 'PENDING';
  comments?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  eligibleForDispatch?: boolean;
  eligibilityReason?: string;
  offerVersion?: number;
  isOutdatedVersion?: boolean;
}
```

### B. Review & Send Offer Page (`doctor_web/src/pages/treatment-offers/TreatmentOfferReviewPage.tsx`)
1. **Removed Auto-Approval Bypass:** Removed fragile auto-approval attempts in `handleSendOffer()`. The page strictly honors the backend eligibility state.
2. **Double-Click Dispatch Debounce:** Added `if (isSending) return;` guard to `handleSendOffer()` to prevent concurrent duplicate dispatch triggers before React re-render.
3. **Dedicated Review Loading State:** Added `isLoadingReview` state and spinner in the clinical review card while live eligibility is being retrieved from the backend, eliminating visual flash of pending review.
4. **Clinical Review Card UI States:**
   - **`APPROVED` & `eligibleForDispatch: true`:**
     - Emerald badge: `Clinical Review: APPROVED`.
     - Displays reviewer credentials (`reviewerName || doctorName`: "Dr. Sarah Jenkins") and formatted approval timestamp.
     - "Send Treatment Offer to Patient" button is enabled.
   - **`PENDING` / Unreviewed:**
     - Amber badge: `Clinical Review Required` (or `Clinical Review: PENDING` if pending panel review).
     - Displays warning: *"A multidisciplinary clinical review (APPROVED) must be documented prior to patient dispatch."*
     - CTA Button: **"Record Clinical Review (APPROVED)"** (`data-testid="record-clinical-review-btn"`).
     - Clicking button submits approval via `submitClinicalReview()`, immediately updating the card to `APPROVED`, refreshing offer details, clearing stale error banners, and enabling dispatch.
   - **`REJECTED`:**
     - Rose badge: `Clinical Review: REJECTED`.
     - Explanatory alert and action to re-evaluate or modify proposal.
   - **`OUTDATED` (`isOutdatedVersion: true`):**
     - Amber badge: `Clinical Review: OUTDATED (vX vs current vY)`.
     - Warning: *"Offer proposal was updated since previous review. Re-approval required for version X."*
     - CTA Button: **"Re-approve Clinical Review (vX)"**.
5. **Dispatch Button Guard:** Disables dispatch button if `clinicalReview?.eligibleForDispatch === false`, providing an explicit error message.

---

## 4. Database Integrity & Reproduction Record Protection
- **Zero Destructive Schema Migrations:** All review metadata (`offerVersion`, `patientProfileId`, `procedureCodes`, `clinicalPracticeType`, `reviewerName`) is persisted within the JSON `metadata` column of `treatment_offer_history`.
- **Pristine Reproduction Offer Preserved:** The original target offer `fc09c21e-a929-45aa-95d7-fde9c9350279` remains untouched in its original draft state without synthetic records or fabricated approvals. Navigating to its review page correctly shows "Clinical Review Required", completely eliminating the contradiction.
