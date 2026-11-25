# CareID Root Cause Analysis: Clinical Review Dispatch Mismatch (CAREID-018)

**Document Reference:** `CAREID_CLINICAL_REVIEW_DISPATCH_ROOT_CAUSE_018.md`  
**Priority:** P1 — Critical Functional Defect  
**Target Offer UUID:** `fc09c21e-a929-45aa-95d7-fde9c9350279`  
**Affected Workflow:** Stage 3 — Review & Send Treatment Offer to Patient  
**Authorized Clinician:** Dr. Sarah Jenkins, MD (`5cb9e3a5-6dab-4757-9143-524e317c1aaa`)  
**Operating Facility:** Metro General Hospital (`a689df60-58c1-4213-bbd6-5421f9cc49ef`)  
**Integration Database:** `careid_integration_db` (Port 5433)  

---

## 1. Executive Summary & Defect Statement

In the Doctor Web application, when a clinician navigates to the Review & Send Treatment Offer page (`/treatment-offers/:offerId/review`), the UI displayed:
> **"Multidisciplinary Clinical Review: APPROVED"**  
> *"Standard baseline clinical review in effect"*

However, upon clicking **"Send Treatment Offer to Patient"**, the dispatch action was rejected by the Backend API with HTTP 409 Conflict:
> **"Treatment offer cannot be dispatched: Clinical review is missing. A multidisciplinary clinical review (APPROVED) must be documented prior to patient dispatch."**

This presented a direct contradiction between Doctor Web's presentation layer and Backend dispatch governance. Neither layer was bypassed; instead, a critical architectural mismatch existed where the review retrieval endpoint fabricated a synthetic "APPROVED" state while the dispatch guard strictly audited database-persisted clinical history records.

---

## 2. End-to-End Clinical Review Data Flow Trace

Tracing the complete lifecycle of clinical review and dispatch across Doctor Web and the Backend identified the exact components, API routes, database tables, and validation predicates:

```
[Doctor Web UI: TreatmentOfferReviewPage.tsx]
      │
      ├── 1. GET /api/v1/doctors/treatment-offers/:offerId/clinical-review
      │         │
      │         ▼
      │   [DoctorTreatmentOfferController.getClinicalReview()]
      │         │
      │         ▼
      │   [TreatmentOfferService.getClinicalReview()]
      │         │
      │         ▼
      │   [TreatmentOfferRepository.findLatestOfferHistoryByAction(offerId, 'CLINICAL_REVIEW')]
      │         │
      │         ▼
      │   [PostgreSQL Table: treatment_offer_history]
      │
      ├── 2. POST /api/v1/doctors/treatment-offers/:offerId/clinical-review
      │         │
      │         ▼
      │   [DoctorTreatmentOfferController.submitClinicalReview()]
      │         │
      │         ▼
      │   [TreatmentOfferService.submitClinicalReview()]
      │         │
      │         ▼
      │   [Persist to treatment_offer_history with action='CLINICAL_REVIEW']
      │
      └── 3. POST /api/v1/doctors/treatment-offers/:offerId/dispatch
                │
                ▼
          [DoctorTreatmentOfferController.dispatchOffer()]
                │
                ▼
          [TreatmentOfferService.dispatchOffer()]
                │
                ├── Validates Offer Status === 'DRAFT'
                ├── Validates Facility & Clinician Authorization
                ├── Validates Doctor Clinical Attestation
                └── Audits Clinical Review Eligibility (Single Source of Truth)
```

### Exact Source Components:
1. **Frontend Component:** `doctor_web/src/pages/treatment-offers/TreatmentOfferReviewPage.tsx`
2. **Frontend Service:** `doctor_web/src/services/treatmentOfferService.ts` (`getClinicalReview`, `submitClinicalReview`, `dispatchOffer`)
3. **Backend Controller:** `backend/src/modules/treatment-offer/presentation/controllers/doctor-treatment-offer.controller.ts`
4. **Backend Application Service:** `backend/src/modules/treatment-offer/application/use-cases/treatment-offer.service.ts`
5. **Backend Repository:** `backend/src/modules/treatment-offer/infrastructure/database/treatment-offer.repository.ts`
6. **Data Models / Tables:**
   - `treatment_offers` (offer status, version, pricing, ownership)
   - `treatment_offer_history` (audit records, `CLINICAL_REVIEW` action, metadata)
   - `treatment_offer_procedures` (procedural codes covered)
   - `doctor_profiles` (clinical practice type, specialty, credentials)

---

## 3. Investigation of Hypotheses (Phases 2A – 2G)

### Hypothesis A: Incorrect Review Association
- **Finding:** In the integration database, offer `fc09c21e-a929-45aa-95d7-fde9c9350279` had doctor `771bee09-3092-4599-9e76-fc31f97f7d05` and patient `3896bc97-bd3b-40ae-80c1-0cc0455ca3a4`. However, prior to remediation, querying `treatment_offer_history` for `action = 'CLINICAL_REVIEW'` returned zero records. There was no associated review record in existence.

### Hypothesis B: Different Approval Sources
- **Finding:** **Confirmed.** Doctor Web called `GET /doctors/treatment-offers/:offerId/clinical-review`. The backend method `getClinicalReview()` did not check whether an actual review existed before returning a response. Instead, it returned a mock baseline object with `status: APPROVED`. Conversely, `dispatchOffer()` executed a query directly against `treatment_offer_history`. The two endpoints drew from conflicting paradigms: one from a hardcoded fallback mock, the other from live DB persistence.

### Hypothesis C: Status Value Mismatch
- **Finding:** Doctor Web and Backend both recognized `APPROVED` and `REJECTED`. However, `ClinicalReviewAction` enum lacked `PENDING`, causing unreviewed offers to have no valid contract representation other than synthetic `APPROVED`.

### Hypothesis D: Stale React Query / Client Cache
- **Finding:** Not the primary cause. When the review page loaded, Doctor Web performed a fresh HTTP GET to the backend. The backend itself responded with `APPROVED` over the wire. The client cache accurately reflected what the backend falsely reported.

### Hypothesis E: Incorrect Database Validation Query
- **Finding:** The query `findLatestOfferHistoryByAction(offerId, 'CLINICAL_REVIEW')` executed by `dispatchOffer()` was technically correct, but lacked validation of offer versioning, procedure coverage, patient matching, and cross-scope clinical practice isolation.

### Hypothesis F: Default Approval Behavior ("Standard baseline clinical review in effect")
- **Finding:** **Primary Root Cause.** In `treatment-offer.service.ts`:
  ```typescript
  // PRE-FIX FLAW in getClinicalReview():
  if (!latestReview) {
    return {
      status: ClinicalReviewAction.APPROVED,
      comments: 'Standard baseline clinical review in effect',
      reviewedBy: offer.doctor?.user ? ... : 'System Baseline Reviewer',
      reviewedAt: offer.createdAt.toISOString(),
    };
  }
  ```
  This synthetic baseline fabricated an approved review out of thin air for display purposes, but was never persisted to the database.

### Hypothesis G: Review Timing and Versioning
- **Finding:** If an offer was modified after clinical review (e.g., procedure changed, pricing updated), the offer version was bumped (`version: 1 -> 2`), but no mechanism existed to invalidate stale approvals or alert the clinician that re-review was necessary.

---

## 4. Secondary Root Cause: User Role Resolution
When authenticating Dr. Sarah Jenkins (`+16505550003`), her database user profile has multiple roles: `['PATIENT', 'DOCTOR']`.
In `submitClinicalReview()`, code previously evaluated user roles by checking `roles[0]`. Because `roles[0]` was `'PATIENT'`, the request was rejected with `ForbiddenException: Role 'PATIENT' is not authorized to submit clinical reviews`.

---

## 5. Summary of Identified Defects
1. **Synthetic Fallback Defect:** `getClinicalReview()` returned fabricated `APPROVED` status with misleading text "Standard baseline clinical review in effect" when no review existed in `treatment_offer_history`.
2. **UI Deception & Missing CTA:** Doctor Web displayed the fabricated approved status, prevented the clinician from manually recording an approval, and omitted submission during offer dispatch.
3. **Dispatch Enforcement Discrepancy:** `dispatchOffer()` checked `treatment_offer_history` directly and rejected dispatch with 409 Conflict.
4. **Role Resolution Fragility:** User with dual roles (`PATIENT` and `DOCTOR`) had role check resolve to `PATIENT`, blocking legitimate clinician submissions.
5. **Absence of Version Invalidation:** Edits to treatment offers did not invalidate prior clinical reviews, creating potential patient safety hazards if an offer was materially modified after sign-off.
