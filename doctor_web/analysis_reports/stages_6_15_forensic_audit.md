# Forensic Audit Report: CareID Clinical & Financing Trajectory Stages 6–15

**Document Status:** Official Forensic Audit Report  
**Audit Target:** `doctor-web-frontend-main` (CareID Doctor Web Portal)  
**Workspace Path:** `d:\New folder\New folder\doctor web\doctor-web-frontend-main`  
**Audit Scope:** Trajectory Stages 6 through 15 (Clinical Review through Day-of-Checkin)  
**Backend Reference:** `https://360api.vnvision.in/api/v1` (Staging API)  
**Authoritative API Contract:** `Postman collection/CareID-Staging.postman_collection.json` (559 Requests, 27 Top-Level Folders)  
**Figma Workspace Reference:** Canvas `0:1` (`https://www.figma.com/design/Fxtcm2B1eab5Z8qVBjnsQI/CareID_int?node-id=0-1&m=dev`), Frames `1:7538`, `1:7986`, `1:8548`, `1:9001`, `1:9573`, `1:10206`, `1:10786`, `1:11274`, `1:11774`, `1:12355`, `1:13596`  
**Audit Date:** November 9, 2026  
**Auditor:** Teamwork Forensic Report Compiler & Multi-Agent Audit Council  
**Integrity Mode:** Strict Read-Only Audit (Zero source code, UI, or configuration files modified)  

---

## Executive Summary

This forensic audit evaluates the technical implementation, architectural integrity, and contract compliance of Stages 6 through 15 within the CareID Doctor Web Portal (`doctor-web-frontend-main`). The evaluated trajectory spans from initial clinical offer review to day-of-surgery procedural check-in:
- **Stage 6:** Clinical Review (`/treatment-offers/:id/review`)
- **Stage 7:** Dispatched Status (`/treatment-offers/:id/status`, `/treatment-offers/:id/sent`)
- **Stage 8:** Offer Accepted (`/treatment-offers/:id/accepted`)
- **Stage 9:** Pre-Op Clearance (`/treatment-offers/:id/clearance`)
- **Stage 10:** Suite Scheduling (`/treatment-offers/:id/schedule`)
- **Stage 11:** Hold Review (`/treatment-offers/:id/schedule/review`)
- **Stage 12:** Slot Confirmed (`/treatment-offers/:id/scheduled`)
- **Stage 13:** Appointment Ledger (`/treatment-offers/:id/appointment`)
- **Stage 14:** Pre-Op Readiness (`/treatment-offers/:id/pre-op`)
- **Stage 15:** Day-of-Checkin (`/treatment-offers/:id/check-in`, `/treatment-offers/:id/day-of-checkin`)

### Global Verdict & Forensic Summary
1. **Static Quality Health:** The codebase compiles cleanly. `npm run type-check` (`tsc -b --noEmit`), `npm run lint` (`eslint .`), and `npm run build` (`tsc -b && vite build`) all pass with **0 errors, 0 warnings, and exit code 0** (production bundle generated in 7.08s). Stages 1 through 5 remain 100% untouched.
2. **Visual Design Fidelity:** React components reproduce the corresponding Figma frames with high visual precision (>95% fidelity against Figma canvas nodes `1:7538` through `1:13596`). Layouts, color palettes, stepper navigation, cards, and data badges closely match the design system.
3. **Severe Contract & Persistence Gaps:** Beneath the high-fidelity UI shell, **zero stages qualify as 100% production-ready and fully implemented end-to-end**:
   - **4 Stages have NO Backend API in Postman (Stages 9, 11, 14, 15):** The authoritative Postman collection (559 requests) contains zero endpoints for clinical clearance gates, procedural suite holds, pre-operative readiness checklists, or patient check-in admissions.
   - **3 Stages bypass available Postman APIs (Stages 10, 12, 13):** Postman contains endpoints for facility suites (`GET /facilities/:id/rooms`), doctor schedule slots (`GET /schedules/:id/slots`), appointment creation (`POST /appointments`), and appointment details (`GET /appointments/:id`). The frontend completely ignores these endpoints, using client-side React state, hardcoded calendar arrays, and fabricated appointment records.
   - **Critical Invariant Violations across all 10 stages:** Stage 6 hardcodes optimistic locking versions and fails forward on dispatch failure; Stage 7 lacks live polling and uses fake toast SMS resends; Stage 8 unconditionally assumes patient acceptance without verifying backend status; Stage 14 directly embeds simulation buttons that fabricate lab results (`INR 1.1 (Normal)`) and anesthesia clearance; Stage 15 displays hardcoded arrival times and triage vitals without check-in persistence.

---

## Master Stage-Wise Summary Table

The table below summarizes the forensic status of Stages 6 through 15 across the mandatory 7 evaluation criteria:

| Stage | Component | Route | API | Mock Data | UI Match | Actual Status |
|:---|:---|:---|:---|:---|:---|:---|
| **Stage 6: Clinical Review** | `TreatmentOfferReviewPage` (`src/pages/treatment-offers/TreatmentOfferReviewPage.tsx`) | `/treatment-offers/:id/review` | Partial: `POST /api/v1/doctors/treatment-offers/:id/dispatch` called via `treatmentOfferService.dispatchTreatmentOffer()`, but `expectedVersion: 1` is hardcoded. Error catch block navigates forward even on failure. | High: Fallback state (lines 35–73), hardcoded `expectedVersion: 1` (line 121), simulated mobile preview modal. | High: 95% match with Figma Frame `1:7538` ("Review & Send Treatment Offer") and `1:8548`. | **Partially Implemented**: Real dispatch endpoint exists and is wired, but optimistic locking version is hardcoded to 1, errors fail forward, and local persistence uses volatile memory. |
| **Stage 7: Dispatched Status** | `TreatmentOfferStatusPage` (`src/pages/treatment-offers/TreatmentOfferStatusPage.tsx`) | `/treatment-offers/:id/status`, `/treatment-offers/:id/sent` | Partial: `GET /api/v1/doctors/treatment-offers/:id/status` and `POST /cancel` exist in Postman; status fetched once on mount without polling. SMS resend is a fake toast without backend call. Cancellation hardcodes `expectedVersion: 1`. | High: Hardcoded slot "Cath Lab Room 2 • Nov 4, 2026" (line 206), fake delivery chips (lines 646–672), mock timeline dates (lines 384–396), static audit hash `SHA256-8921-TR-VERIFIED-7A890D` (line 777). | High: 95% match with Figma Frame `1:7986` ("offer status"). | **Partially Implemented**: Live status endpoint is called on mount, but lacks polling; SMS resend is simulated; lifecycle advance to Stage 8 bypasses patient acceptance check. |
| **Stage 8: Offer Accepted** | `TreatmentOfferAcceptedPage` (`src/pages/treatment-offers/TreatmentOfferAcceptedPage.tsx`) | `/treatment-offers/:id/accepted` | Missing / Bypassed: Doctor portal only calls `GET /api/v1/doctors/treatment-offers/:id`. Component **never** checks `dto.status === 'RATIFIED_ACCEPTED'`. It unconditionally assumes acceptance. | Extreme: Hardcoded monogram "RS" (line 262), static acceptance timestamp "Oct 19, 2026 • 2:15 PM EST" (lines 148, 341, 567, 808), fake biometric SHA tokens (lines 190, 817), hardcoded hold slot (lines 166, 755), fake 8-step timeline (lines 366–446). | High: 95% match with Figma Frame `1:9001` ("Accepted Treatment Offer"). | **Mock / Non-Functional**: Unconditionally assumes acceptance for any offer ID without validating backend status; zero authentic acceptance, biometric, or signature data is retrieved. |
| **Stage 9: Pre-Op Clearance** | `ClinicalHandoffPage` (`src/pages/treatment-offers/ClinicalHandoffPage.tsx`) | `/treatment-offers/:id/clearance` | Missing: Zero clearance APIs exist in Postman or backend (`POST/GET /api/v1/treatment-offers/:id/clearance` does not exist). Component only calls `GET /api/v1/doctors/treatment-offers/:id` for base metadata. | Extreme: All 7 gatekeeper checklist items (lines 451–546) and 3 diagnostic files (lines 564–604) are 100% hardcoded static mock data. Hardcoded clearance rule `#CR-FIN-15 Approved` (line 742), static tokens (line 755). | High: 95% match with Figma Frame `1:9573` ("Treatment Cleared to Proceed"). | **Mock / Non-Functional**: Completely missing backend APIs; automatically displays "Treatment Cleared (100%)" and "Gate 4 of 5 Passed" without any actual clinical clearance logic. |
| **Stage 10: Suite Scheduling** | `ProcedureSchedulingPage` (`src/pages/treatment-offers/ProcedureSchedulingPage.tsx`, mode `select`) | `/treatment-offers/:id/schedule` | Missing / Bypassed: Postman defines `POST /api/v1/appointments`, `GET /schedules/:id/slots`, `GET /facilities/:id/rooms`, but the frontend **calls none of them**. `handleConfirmBooking` makes zero HTTP calls. | Extreme: 100% fabricated calendar week (Nov 2–8, lines 384–419), fabricated suites & morning/afternoon slots (lines 456–624), fabricated appointment ID `#PROC-2026-93458` (lines 158, 1133), hardcoded doctor signature (line 1447). | High: 95% match across Figma Frame `1:10206` ("Schedule Clinical Slot"). | **Mock / Non-Functional**: Calendar and availability slots are entirely fabricated; zero appointment persistence to backend database; booking confirmation is a client-side navigation simulation. |
| **Stage 11: Hold Review** | `ProcedureSchedulingPage` (`src/pages/treatment-offers/ProcedureSchedulingPage.tsx`, mode `review`) | `/treatment-offers/:id/schedule/review` | Missing: Zero slot hold or temporary hold review endpoints exist in Postman. Postman has schedule blocking, but no procedural hold reservation or release API. | High: Static slots, static hold countdown "Lock expires in 42:15 min" (line 509), Mary Sterling escort, Nov 4 Suite 3 specs (lines 840–897), readiness gauge hardcoded to 60% (line 1001). | High: 95% match with Figma Frame `1:10786` ("Slot Confirmation & Final Review"). | **Mock / Non-Functional**: UI Shell complete; backend hold API missing in Postman; hold timer and lock verification simulated via toast. |
| **Stage 12: Slot Confirmed** | `ProcedureSchedulingPage` (`src/pages/treatment-offers/ProcedureSchedulingPage.tsx`, mode `confirmed`) | `/treatment-offers/:id/scheduled` | Partial / Bypassed: Postman contains generic `POST /api/v1/appointments`, but `handleConfirmBooking` makes zero HTTP calls. Booking executes in local memory. | High: Fabricated Case `#PROC-2026-93458` (line 1133), Nov 4 09:30 AM (line 1137), iPhone 15 Pro push receipt `#SMS-884920` (line 1308), static SHA-256 seal (line 1444). | High: 95% match with Figma Frame `1:11274` ("Procedure Scheduled Successfully"). | **Mock / Non-Functional**: In-memory navigation only; zero backend appointment persistence; directly navigating to `/scheduled` displays confirmed booking for any ID. |
| **Stage 13: Appointment Ledger** | `AppointmentDetailsPage` (`src/pages/treatment-offers/AppointmentDetailsPage.tsx`) | `/treatment-offers/:id/appointment` | Partial / Bypassed: Generic `GET /api/v1/appointments/:id` exists in Postman, but component queries only `treatmentOfferService.getTreatmentOffer(id)`. | High: Synthesized `AppointmentRecord` from offer metadata (lines 100–122); hardcoded time (09:30 AM), room, lab `#LAB-8821`, `epicx-hls-cath3` endpoint (line 730). | High: 95% match with Figma Frame `1:11774` ("Scheduled Procedure & Appointment Details"). | **Partially Implemented**: High-fidelity UI disconnected from backend appointment APIs; synthesizes mock appointment entity from offer; actions trigger dummy toasts. |
| **Stage 14: Pre-Op Readiness** | `PreOpReadinessPage` (`src/pages/treatment-offers/PreOpReadinessPage.tsx`) | `/treatment-offers/:id/pre-op` | Missing: Zero clinical readiness, prerequisite checklist, or lab clearance endpoints exist in Postman or backend API. | Critical: Interactive simulation buttons fabricate lab results (`INR 1.1 (Normal)`, lines 485–488) and anesthesia clearance (`NP Elena Rostova`, lines 653–656); static orders and audit IDs. | High: 95% match with Figma Frame `1:12355` ("Pre-Procedure Readiness Checklist"). | **Mock / Non-Functional**: Mock simulation explicitly violating Critical Invariant R2; state is held in volatile React `useState` and lost on page refresh. |
| **Stage 15: Day-of-Checkin** | `DayOfCheckinPage` (`src/pages/treatment-offers/DayOfCheckinPage.tsx`) | `/treatment-offers/:id/check-in`, `/treatment-offers/:id/day-of-checkin` | Missing: Zero check-in or admission endpoints exist in Postman; generic `PUT /api/v1/appointments/:id/status` is not invoked. | High: Static arrival "07:28 AM EST • Bay #04" (line 256), hardcoded vitals (BP 128/82, HR 68, SpO2 99%, Temp 68.2°F, lines 499, 551–570). | High: 95% match with Figma Frame `1:13596` ("Day-of-Procedure Check-In"). | **Mock / Non-Functional**: Purely visual clinical workstation; zero check-in persistence; any offer ID displays as checked-in and arrived at 07:28 AM. |

---

## Stage-by-Stage Forensic Analysis (Stages 6–15)

### Stage 6: Clinical Review

#### 1. React Component and Route Binding
- **Component:** `TreatmentOfferReviewPage`
- **File Path:** `src/pages/treatment-offers/TreatmentOfferReviewPage.tsx` (761 lines)
- **Route Path:** `/treatment-offers/:id/review`
- **Router Configuration:** `src/routes/index.tsx`, lines 456–458:
  ```typescript
  {
    path: '/treatment-offers/:id/review',
    element: <TreatmentOfferReviewPage />,
  }
  ```
- **Protected Layout:** Enclosed under `ProtectedLayout` (`src/routes/index.tsx:184`), requiring authenticated doctor session.
- **Export/Import Integrity:** Named export `TreatmentOfferReviewPage`, imported directly in `src/routes/index.tsx:23`. Compiles cleanly without errors.

#### 2. Figma Design Correspondence
- **Authoritative Reference:** Frame `1:7538` ("Care ID Doctor - Review & Send Treatment Offer", 1280 × 2014) and Frame `1:8548` ("Treatment offer lifecycle", 1280 × 1734.5).
- **Design Inventory:** `analysis_reports/01_figma_design_inventory.md`, Domain 9, Screen #33.
- **Visual Alignment:**
  - Patient Context Capsule (`1:7548`): Monogram, Patient Name, Insurance Status, CID, Age, Gender, Blood group, Severe Allergy indicator (`TreatmentOfferReviewPage.tsx:238-292`).
  - Stepper (`1:7563`): Step 1 (Financing Options Complete), Step 2 (Configure Offer Complete), Step 3 (Review & Send Active), Step 4 (Patient Acceptance Upcoming) (`lines 295-384`).
  - Review Grid (`1:7588`): Left column contains 4 numbered cards:
    1. Target Procedure & Baseline Verification (`lines 391-444`).
    2. Prompt Payment Incentive & Discount Structure (`lines 447-512`).
    3. Active Healthcare Financing Integration (`lines 515-568`).
    4. Clinical Justification & Attestation (`lines 571-638`).
  - Right Column (`lines 642-758`): Live Patient Mobile Preview card (`1:7710`), Expand Simulator modal trigger, Clinician Attestation checkbox, Dispatch CTA button (`1:7760`).
- **Visual Deviations:**
  - Clinician attestation checkbox defaults to `true` (`useState<boolean>(true)` at line 105), allowing single-click bypass of affirmative attestation.
  - Mobile preview modal renders a simulated web container rather than utilizing authentic mobile iframe or native view encapsulation.

#### 3. Backend API Availability
- **Primary Dispatch Endpoint:**
  - Endpoint Path: `POST /api/v1/doctors/treatment-offers/:offerId/dispatch`
  - Postman Path: `05. Doctor Portal > Lock draft and dispatch treatment offer to patient`
  - Auth: Bearer Token required (`Authorization: Bearer {{accessToken}}`)
  - Request Body: `{ "expectedVersion": 1 }`
  - Expected Response: `200 OK` with updated `TreatmentOfferDTO` (`status: "DISPATCHED"`, `dispatchedAt: "<ISO8601>"`).
- **Secondary Retrieval Endpoint:**
  - Endpoint Path: `GET /api/v1/doctors/treatment-offers/:offerId`
  - Postman Path: `05. Doctor Portal > Get treatment offer details`
- **Assessment:** Both endpoints exist in Postman collection and backend contracts.

#### 4. Actual Frontend Service Implementation
- **Service Path:** `src/services/treatmentOfferService.ts`
- **Method Implementation:**
  - `dispatchTreatmentOffer(id: string, expectedVersion: number)` (lines 301–307):
    ```typescript
    async dispatchTreatmentOffer(id: string, expectedVersion: number): Promise<TreatmentOfferDTO> {
      const res = await apiClient.post<TreatmentOfferDTO | { data: TreatmentOfferDTO }>(
        `/api/v1/doctors/treatment-offers/${encodeURIComponent(id)}/dispatch`,
        { expectedVersion }
      );
      return unwrapOfferDTO(res);
    }
    ```
- **Component Invocation (`TreatmentOfferReviewPage.tsx:110-141`):**
  ```typescript
  const handleSendOffer = async () => {
    ...
    try {
      if (offer.offerId) {
        await treatmentOfferService.dispatchTreatmentOffer(offer.offerId, 1);
      }
      consultationService.saveTreatmentOffer({
        ...offer,
        dispatchedAt: new Date().toLocaleString(),
      });
      navigate(`/treatment-offers/${offer.offerId}/status`, {
        state: { ...offer, dispatchedAt: new Date().toLocaleString() },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to dispatch offer to patient.';
      setErrorMessage(msg);
      // Navigate to status if already dispatched or exists
      navigate(`/treatment-offers/${offer.offerId}/status`, { state: offer });
    } finally {
      setIsSending(false);
    }
  };
  ```
- **Critical Architectural Flaws:**
  1. `expectedVersion` is hardcoded to `1` (line 121). If an offer draft was updated during editing, its version will be 2 or greater, causing HTTP 409 Conflict.
  2. The `catch` block (lines 133–138) sets `errorMessage`, but then unconditionally executes `navigate('/treatment-offers/${offer.offerId}/status')`! A failed dispatch fails forward into Stage 7 as if it succeeded.

#### 5. Request and Response DTO Alignment
- Matches Postman schema for `grossEstimate`, `discountAmount`, `netPayable`, `currency`, `status`, `validUntil`, `version`, `procedures`.
- Backend Postman contract does not guarantee populated `patientName`, `facilityName`, or `doctorName` on `TreatmentOfferDTO`. The frontend handles this by calling `patientService.getPatientById(dto.patientProfileId)` in `useEffect` (line 82) to enrich the state.

#### 6. Patient and Treatment-Offer ID Propagation
- `id` (Offer ID) is bound from route param (`useParams<{ id: string }>()`).
- State is passed to Stage 7 via `navigate('/treatment-offers/${offer.offerId}/status', { state: offer })`.
- Direct URL hydration works via `useEffect` calling `treatmentOfferService.getTreatmentOffer(id)`.

#### 7. Authentication and Authorization
- Enforced by `ProtectedLayout`. Token injected into headers by `apiClient.ts` via `sessionStorage.getItem('careid_access_token')`.
- No role verification: Doctor, Nurse, or Front Desk staff can execute dispatch.

#### 8. Loading, Error, and Empty States
- Button displays `isSending` loading spinner.
- Error banner renders conditionally on `errorMessage` (lines 146–160).
- Missing full-page loading skeleton while `getTreatmentOffer(id)` executes on initial mount.

#### 9. Actual Data Persistence
- Backend `POST /dispatch` is triggered when `offer.offerId` is truthy.
- `consultationService.saveTreatmentOffer(offer)` writes to an in-memory `Map` (`_inMemoryOfferStore`, `consultationService.ts:543`) which is wiped on browser refresh.

#### 10. Hardcoded Values and Mock Data Locations
- Lines 35–73: Fallback default state (`patientName: 'Patient Record'`, `financingPackageId: 'careid-0'`).
- Line 121: `expectedVersion: 1` hardcoded.
- Line 216: Simulated quotation string `"{offer.doctorNotes}"`.

#### 11. Lifecycle Transition Validation
- Expected Transition: `DRAFT` -> `DISPATCHED`.
- Invariant Violation: If backend dispatch rejects the payload (e.g., due to expired validity date or version conflict), the error is caught, dismissed, and the UI transitions to `DISPATCHED` regardless (line 137).

#### 12. Refresh and Direct URL Hydration
- Direct URL access (`/treatment-offers/:id/review`):
  Hydrates via `treatmentOfferService.getTreatmentOffer(id)` and `patientService.getPatientById()`. If the ID exists in backend DB, hydration succeeds. If the ID is invalid, falls back to blank defaults without an explicit 404 error screen.

#### Stage-Specific Critical Invariant Assessment: Stage 6
- **Requirement:** "Actual treatment offer retrieval, clinical review data, and real dispatch operation with no simulated dispatch."
- **Verdict: PARTIALLY MET / FLAWED.**
  - Retrieval and dispatch API endpoints are authentic and connected to backend contracts.
  - However, hardcoding `expectedVersion: 1` breaks optimistic locking, and catching dispatch errors to unconditionally navigate forward violates the integrity of the dispatch gate.

---

### Stage 7: Dispatched Status

#### 1. React Component and Route Binding
- **Component:** `TreatmentOfferStatusPage`
- **File Path:** `src/pages/treatment-offers/TreatmentOfferStatusPage.tsx` (786 lines)
- **Route Paths:** `/treatment-offers/:id/status` and `/treatment-offers/:id/sent`
- **Router Configuration:** `src/routes/index.tsx`, lines 460–466:
  ```typescript
  {
    path: '/treatment-offers/:id/sent',
    element: <TreatmentOfferStatusPage />,
  },
  {
    path: '/treatment-offers/:id/status',
    element: <TreatmentOfferStatusPage />,
  }
  ```
- **Protected Layout:** Enclosed under `ProtectedLayout`. Named export imported in `src/routes/index.tsx:24`.

#### 2. Figma Design Correspondence
- **Authoritative Reference:** Frame `1:7986` ("offer status", 1280 × 2167).
- **Design Inventory:** `analysis_reports/01_figma_design_inventory.md`, Domain 9, Screen #34.
- **Visual Alignment:**
  - Patient Context Capsule (`1:7987`): Monogram, name, insurance chip, CID, allergy (`TreatmentOfferStatusPage.tsx:284-322`).
  - Success & Status Hero Banner (`1:7990`): Green gradient banner ("Treatment Offer Sent Successfully", status badge, metadata strip) (`lines 325-366`).
  - Stepper (`1:8000`): 5-phase trajectory (1. Draft Created, 2. Dispatched, 3. Patient Review, 4. Digital Sign-Off, 5. Clinical Handoff) (`lines 369-431`).
  - Main Grid (`1:8020`): Left column with 4 cards (Procedure Specs, Financial Matrix, Financing Integration, Automated Sequence); right column with Live Dispatch Monitor (`lines 624-686`), Clinician Actions (`lines 689-751`), Audit & Governance Trail (`lines 754-780`).
- **Visual Deviations:**
  - Phase 5 stepper card is rendered as a clickable button ("5. Clinical Handoff - Proceed") allowing immediate jump to Stage 8.
  - Delivery channels in Live Dispatch Monitor are static HTML chips ("Delivered", "Synced") rather than dynamic webhooks.

#### 3. Backend API Availability
- **Live Status Endpoint:**
  - Path: `GET /api/v1/doctors/treatment-offers/:offerId/status`
  - Postman Path: `05. Doctor Portal > Inspect live offer lifecycle status and review timestamps`
  - Response: `{ id, offerNumber, status, isExpired, validUntil, version, dispatchedAt, patientViewedAt, patientRespondedAt, patientResponseNotes, cancellationReason }`.
- **Cancellation Endpoint:**
  - Path: `POST /api/v1/doctors/treatment-offers/:offerId/cancel`
  - Postman Path: `05. Doctor Portal > Doctor cancels active treatment proposal with clinical justification`
  - Request Body: `{ cancellationReason: string, expectedVersion: number }`
- **Assessment:** Both endpoints exist in Postman collection and backend contracts.

#### 4. Actual Frontend Service Implementation
- **Service Path:** `src/services/treatmentOfferService.ts`
- **Methods:**
  - `getTreatmentOfferStatus(id: string)` (lines 313–318): Calls `/api/v1/doctors/treatment-offers/:id/status`.
  - `cancelTreatmentOffer(id, reason, expectedVersion)` (lines 324–334): Calls `/api/v1/doctors/treatment-offers/:id/cancel`.
- **Component Invocation (`TreatmentOfferStatusPage.tsx`):**
  - Line 82: `treatmentOfferService.getTreatmentOfferStatus(id)` called in `useEffect` on mount.
  - Line 137: `treatmentOfferService.cancelTreatmentOffer(offer.offerId, 'Doctor requested withdrawal of proposal.', 1)`.
  - Line 129: `handleResendSms()` only triggers `triggerToast('Priority SMS notification link resent...')`. **Zero API call executed.**
- **Critical Architectural Flaws:**
  1. No polling mechanism: Status is fetched once when component mounts. If the patient views or accepts the offer in their app, the doctor page never updates unless manually refreshed.
  2. Cancellation hardcodes `expectedVersion: 1` (line 140).
  3. SMS Resend is entirely cosmetic.

#### 5. Request and Response DTO Alignment
- Postman `GET /status` matches `TreatmentOfferStatusResponse` in `types.ts:130-142`.
- Cancel payload matches Postman `{ cancellationReason, expectedVersion }`.

#### 6. Patient and Treatment-Offer ID Propagation
- Bound via URL param `:id`. Passed forward to Stage 8 via `navigate('/treatment-offers/${offer.offerId}/accepted', { state: offer })`.
- Deep links hydrate from backend using `getTreatmentOfferStatus(id)` and `getTreatmentOffer(id)`.

#### 7. Authentication and Authorization
- Protected by `ProtectedLayout`. Token injected. No role checks.

#### 8. Loading, Error, and Empty States
- Missing skeleton loader. Fetch errors are caught and swallowed silently (lines 86, 104).

#### 9. Actual Data Persistence
- Status query is live from backend. Cancellation requests persist to backend DB when version matches.
- Resend SMS does not persist or trigger any outbound gateway event.

#### 10. Hardcoded Values and Mock Data Locations
- Line 206: "Cath Lab Room 2 • Nov 4, 2026"
- Lines 359–363: "Expiration: Nov 1, 2026 (14 Days Remaining)", "Dispatch Channel: SMS (+1 555-***-9182)"
- Lines 384–395: Phase 1 & 2 timestamps: "Oct 18, 10:30 AM", "Dr. M. Chang", "Oct 18, 10:42 AM", "Care ID Gateway"
- Line 405: "14 Days Remaining"
- Line 607: "Cath Lab slot for Nov 4 is automatically booked"
- Line 655: "+1 (555) •••-9182"
- Line 668: "Active session 12 mins ago"
- Line 777: `SHA256-8921-TR-VERIFIED-7A890D`
- Lines 738–749: Developer bypass button to Cath Lab safety check.

#### 11. Lifecycle Transition Validation
- The button "Proceed to Clinical Handoff & Scheduling" (`lines 697-703`) navigates to `/treatment-offers/:id/accepted` without checking `liveStatus?.status === 'RATIFIED_ACCEPTED'`. The doctor can advance before the patient accepts.

#### 12. Refresh and Direct URL Hydration
- Direct URL hydration works correctly for base offer and live status via `getTreatmentOfferStatus(id)`.

#### Stage-Specific Critical Invariant Assessment: Stage 7
- **Requirement:** "Actual dispatch status, real-time status retrieval, and correct cancellation workflow with no fake polling or status changes."
- **Verdict: PARTIALLY MET / VIOLATED.**
  - Live status endpoint is called on mount, and cancellation endpoint is wired.
  - However, there is zero polling (status is static after mount), SMS resend is a simulated toast, and stage progression completely bypasses verification of patient acceptance.

---

### Stage 8: Offer Accepted

#### 1. React Component and Route Binding
- **Component:** `TreatmentOfferAcceptedPage`
- **File Path:** `src/pages/treatment-offers/TreatmentOfferAcceptedPage.tsx` (851 lines)
- **Route Path:** `/treatment-offers/:id/accepted`
- **Router Configuration:** `src/routes/index.tsx`, line 469:
  ```typescript
  {
    path: '/treatment-offers/:id/accepted',
    element: <TreatmentOfferAcceptedPage />,
  }
  ```
- **Protected Layout:** Enclosed under `ProtectedLayout`. Named export imported in `src/routes/index.tsx:25`.

#### 2. Figma Design Correspondence
- **Authoritative Reference:** Frame `1:9001` ("Care ID Doctor - Accepted Treatment Offer", 1280 × 2111.9).
- **Design Inventory:** `analysis_reports/01_figma_design_inventory.md`, Domain 9, Screen #36.
- **Visual Alignment:**
  - Header & Breadcrumb (`1:9002`): Patients / Patient Name / Insurance / Offer / Accepted (`TreatmentOfferAcceptedPage.tsx:219-254`).
  - Identity Capsule (`1:9005`): Monogram, patient name, CID, demographics (`lines 259-307`).
  - Hero Acceptance Banner (`1:9010`): Dark green gradient ("ACCEPTED BY PATIENT", "FINANCING CONFIRMED", Acceptance Timestamp, Biometric e-Signature Confirmed) (`lines 310-348`).
  - Offer Lifecycle Trajectory (`1:9020`): 8-step pipeline (Draft, Eligibility, Prepared, Sent, Viewed, Accepted [Active], Confirmed, Next Action) (`lines 351-447`).
  - Main Grid (`1:9040`): Left column with Confirmed Financial Structure card, Patient Acceptance card, Financing Confirmation card, Clinical & Treatment Next Steps; right column with Clinician Actions, Linked Procedural Hold, Audit & Governance Log (`lines 450-832`).
- **Visual Deviations:**
  - Monogram is hardcoded to `"RS"` (line 262) regardless of patient name.
  - Hospital name hardcoded to "Mount Sinai Hospital Heart Center" (line 143).

#### 3. Backend API Availability
- **Patient Acceptance Endpoint in Postman:**
  - Path: `POST /api/v1/patients/treatment-offers/:offerId/accept`
  - Postman Path: `06. Patient App > Patient ratifies and accepts treatment offer (RATIFIED_ACCEPTED)`
  - Note: This is an authenticated patient-facing endpoint. In the Doctor Portal, the doctor does not accept; the doctor reads the updated offer status via `GET /api/v1/doctors/treatment-offers/:offerId`.
- **Doctor Portal Retrieval Endpoint:** `GET /api/v1/doctors/treatment-offers/:offerId`.

#### 4. Actual Frontend Service Implementation
- **Service Path:** `src/services/treatmentOfferService.ts`
- **Method Implementation:** `treatmentOfferService.getTreatmentOffer(id)` (lines 278–284).
- **Component Invocation (`TreatmentOfferAcceptedPage.tsx:76-95`):**
  - Fetches offer by ID on mount if not in `location.state`.
  - **CRITICAL FLAW:** It NEVER checks `dto.status === 'RATIFIED_ACCEPTED'`. Any offer (even in `DRAFT` or `CANCELLED` status) navigated to `/accepted` displays the accepted green banner.

#### 5. Request and Response DTO Alignment
- The backend DTO contains `patientRespondedAt` and `patientResponseNotes`.
- However, the component completely ignores these fields and renders hardcoded static strings.

#### 6. Patient and Treatment-Offer ID Propagation
- `offerId` from URL param `:id`.
- Propagates forward to `/treatment-offers/${offer.offerId}/clearance` via `navigate(..., { state: offer })`.

#### 7. Authentication and Authorization
- Protected by `ProtectedLayout`. Token injected. No role checks.

#### 8. Loading, Error, and Empty States
- No loading skeletons or error boundary.

#### 9. Actual Data Persistence
- Zero acceptance data persistence verified. The page assumes acceptance has occurred.

#### 10. Hardcoded Values and Mock Data Locations
- Line 143: "Mount Sinai Hospital Heart Center"
- Lines 148, 341, 567, 808: Hardcoded acceptance timestamp "Oct 19, 2026 • 2:15 PM EST"
- Lines 166, 659, 755: "Cath Lab Room 3 • Nov 4, 2026" / "Nov 4, 2026 • 09:30 AM"
- Line 190: Cryptographic token `7f89b4c09a823...318e`
- Line 262: Hardcoded monogram `"RS"`
- Lines 366–446: All 8 step dates/names/statuses hardcoded
- Line 481, 561, 763: Referral ID `#REF-4491`
- Line 586: "v1.0 (Final Approved)"
- Lines 638, 812: Financing Reference ID `FIN-TR8921-12M`
- Line 817: Token `SHA256: 7f89b...c438`

#### 11. Lifecycle Transition Validation
- Any offer ID can be loaded into this route, presenting full ratification banners even if the offer is an un-dispatched draft or cancelled proposal.

#### 12. Refresh and Direct URL Hydration
- Direct URL hydration fetches base offer demographics from backend, but all acceptance details remain hardcoded mock values.

#### Stage-Specific Critical Invariant Assessment: Stage 8
- **Requirement:** "Actual patient acceptance status and authentic offer/patient data with no assumed acceptance."
- **Verdict: VIOLATED.**
  - Acceptance is 100% assumed. The page does not validate the offer status before presenting full financial ratification.
  - Monogram, signature timestamps, and financing reference IDs are entirely hardcoded strings.

---

### Stage 9: Pre-Op Clearance

#### 1. React Component and Route Binding
- **Component:** `ClinicalHandoffPage`
- **File Path:** `src/pages/treatment-offers/ClinicalHandoffPage.tsx` (777 lines)
- **Route Path:** `/treatment-offers/:id/clearance`
- **Router Configuration:** `src/routes/index.tsx`, line 473:
  ```typescript
  {
    path: '/treatment-offers/:id/clearance',
    element: <ClinicalHandoffPage />,
  }
  ```
- **Protected Layout:** Enclosed under `ProtectedLayout`. Named export imported in `src/routes/index.tsx:26`.

#### 2. Figma Design Correspondence
- **Authoritative Reference:** Frame `1:9573` ("Care ID Doctor - Treatment Cleared to Proceed (Clinical Handoff)", 1280 × 3025).
- **Design Inventory:** `analysis_reports/01_figma_design_inventory.md`, Domain 9, Screen #37.
- **Visual Alignment:**
  - Top Workspace Header (`1:9574`): Clinical Workspace > Enterprise View (`ClinicalHandoffPage.tsx:134-192`).
  - Patient Context Capsule (`1:9580`): Demographics and designated clinical target badge (`lines 219-258`).
  - Hero Status Banner (`1:9590`): Deep Indigo banner ("Treatment Cleared to Proceed — Clinical Handoff Complete", Digital Authorization Seal) (`lines 261-301`).
  - Stepper (`1:9600`): 5-stage pipeline ("Gate 4 of 5 Passed") (`lines 304-368`).
  - Main Grid (`1:9620`): Left column contains Primary Treatment Summary (4-metric grid), Pre-Treatment Requirements & Readiness (7-item checklist), Linked Records & Diagnostic Vault (3 files); right column contains Procedural Appointment Scheduling card, Quick Links, Audit Trail (`lines 371-761`).
- **Visual Deviations:**
  - All 7 checklist items and 3 packaged files are static hardcoded HTML blocks.

#### 3. Backend API Availability
- **Static Contract Analysis against Postman Collection:**
  - **CRITICAL BACKEND GAP: ZERO pre-op clearance endpoints exist in Postman.**
  - There is NO endpoint for Clinical Clearance (e.g. `POST/GET /api/v1/treatment-offers/:id/clearance` or `/api/v1/clinical-handoff` DOES NOT EXIST in Postman).
  - There is NO endpoint for Anesthesia Clearance.
  - There is NO endpoint for Pre-Op Lab Requisition ordering or lab panel clearance.
  - There is NO endpoint for Escort designation.
  - The only endpoint called is `GET /api/v1/doctors/treatment-offers/:offerId`.

#### 4. Actual Frontend Service Implementation
- **Service Path:** NO clearance service exists in `src/services/` (neither `clearanceService.ts` nor `clinicalHandoffService.ts`).
- Component only invokes `treatmentOfferService.getTreatmentOffer(id)` and `patientService.getPatientById()` in `useEffect` (lines 74–93).
- `handleAdvanceToScheduling` (lines 119–121): Navigates to `/treatment-offers/${offer.offerId}/schedule` with `{ state: offer }`.

#### 5. Request and Response DTO Alignment
- Completely missing contracts: No DTOs exist in frontend or backend for Pre-Op Clearance.

#### 6. Patient and Treatment-Offer ID Propagation
- `offerId` from URL param `:id`.
- Propagates forward to `/treatment-offers/${offer.offerId}/schedule` via `navigate(..., { state: offer })`.

#### 7. Authentication and Authorization
- Protected by `ProtectedLayout`. Token injected. No role checks.

#### 8. Loading, Error, and Empty States
- No loading skeletons or error boundary.

#### 9. Actual Data Persistence
- Zero persistence: No clearance records are created, queried, or updated in the backend database.

#### 10. Hardcoded Values and Mock Data Locations
- Line 235: "45 y/o (Male)"
- Lines 287–300: Digital Authorization Seal: "Oct 19, 2026 • 2:15 PM EST", "FST #{offer.offerId} | v1.0 Final", "Plan #FIN-TR8921-12M"
- Line 326: "-$780"
- Lines 389–432: Target procedure specs: "Mount Sinai Hospital", "Cath Lab Suite 3", "Lic #88392", "Hold Slot Active • Suite 3", "Nov 4, 2026 • 09:30 AM EST"
- Lines 451–546: All 7 checklist items:
  - Item 1: "Prompt cash settlement & 0% APR plan underwritten" (COMPLETED)
  - Item 2: "Signed by {offer.patientName} via Care ID App on Oct 19, 2:15 PM EST" (COMPLETED)
  - Item 3: "Offer #{offer.offerId} v1.0 Final archived" (RATIFIED)
  - Item 4: "Lab requisition order pending specimen collection" (REQUIRED)
  - Item 5: "Scheduled clinical review with NP Elena Rostova on Nov 2, 2026 at 11:00 AM" (PENDING)
  - Item 6: "Tentative hold Nov 4, 2026 at 09:30 AM awaiting doctor 1-click confirmation" (READY TO BOOK)
  - Item 7: "Patient spouse Mary Sterling designated and confirmed as day-of transport" (NOTED)
- Lines 564–604: Diagnostic vault files: "Abnormal Stress ECG Report" (Oct 12, 2026, 2.4 MB), "Pre-Cath Echocardiogram", "Signed Financing Contract" (SHA256: 7f89b...318e)
- Lines 741–757: Clearance Rule `#CR-FIN-15 Approved`, Plan Reference `FIN-TR8921-12M`, Timestamp `Oct 19, 2026 • 2:16:44 PM EST`, Token `SHA256: 4a61e9...c712b`

#### 11. Lifecycle Transition Validation
- The page presents clearance as automatically 100% complete without executing any prerequisite checks or validations.

#### 12. Refresh and Direct URL Hydration
- Direct URL hydration reloads basic offer demographics from `getTreatmentOffer(id)`. All clearance data remains hardcoded mock elements.

#### Stage-Specific Critical Invariant Assessment: Stage 9
- **Requirement:** "Actual clearance information and identified missing APIs with no automatic clearance completion."
- **Verdict: VIOLATED.**
  - Clearance is automatically marked 100% complete with "Treatment Cleared to Proceed — Clinical Handoff Complete" and "Gate 4 of 5 Passed".
  - Zero clearance logic, zero API validation, and zero checking of prerequisite lab results.

---

### Stage 10: Suite Scheduling

#### 1. React Component and Route Binding
- **Component:** `ProcedureSchedulingPage`
- **File Path:** `src/pages/treatment-offers/ProcedureSchedulingPage.tsx` (1472 lines, 84.8 KB)
- **Route Path:** `/treatment-offers/:id/schedule` (rendered when mode is `'select'`)
- **Router Configuration:** `src/routes/index.tsx`, lines 476–479:
  ```typescript
  {
    path: '/treatment-offers/:id/schedule',
    element: <ProcedureSchedulingPage initialMode="select" />,
  }
  ```
- **Protected Layout:** Enclosed under `ProtectedLayout`. Named export imported in `src/routes/index.tsx:27`.

#### 2. Figma Design Correspondence
- **Authoritative Reference:** Frame `1:10206` ("Care ID Doctor - Schedule Clinical Slot", 1280 × 2050).
- **Design Inventory:** `analysis_reports/01_figma_design_inventory.md`, Domain 9, Screen #38.
- **Visual Alignment:**
  - Mode 1 (`select`, lines 276–766): Filter buttons, horizontal spec card, week date navigator (Nov 2–8), 5 day selector pills, morning window (3 slots), afternoon window (3 slots), equipment capsule, selected slot summary card.
- **Visual Deviations:**
  - Visually almost identical to Figma, but 100% of the operational data is hardcoded mock state.

#### 3. Backend API Availability
- **Postman Collection Static Contract Analysis:**
  - Folder `10. Appointments, Schedules & Shifts`:
    - `POST /api/v1/appointments` (Book a new appointment)
    - `GET /api/v1/schedules/:id/slots?fromDate=...&toDate=...` (Get generated slots)
  - Folder `09. Facilities & Branches`:
    - `GET /api/v1/facilities/:id/rooms` (List facility rooms)
  - Folder `05. Doctor Portal`:
    - `GET /api/v1/doctors/:id/slots` (Get Doctor Availability Schedule Slots)
- **CRITICAL DEFECT: The frontend calls none of these endpoints.**
  - It does NOT query `GET /schedules/:id/slots` or `GET /doctors/:id/slots` for availability.
  - It does NOT query `GET /facilities/:id/rooms` for suites.
  - It does NOT call `POST /api/v1/appointments` to create the appointment.

#### 4. Actual Frontend Service Implementation
- **Service Path:** `src/services/treatmentOfferService.ts` is imported, but only `getTreatmentOffer(id)` is used.
- **Slot Selection Implementation:**
  - Slot selection updates local component state `selectedSlot` (line 141).
  - Clicking "Continue to Confirm Slot" calls `handleProceedToReview` (lines 145–148), executing `navigate('/treatment-offers/' + offer.offerId + '/schedule/review', { state: offer })`.
  - Zero HTTP requests are dispatched to reserve or lock the slot.

#### 5. Request and Response DTO Alignment
- Postman `POST /api/v1/appointments` requires `{ patientProfileId, doctorProfileId, facilityId, appointmentDate, startTime, endTime, type, reasonForVisit }`.
- In `ProcedureSchedulingPage`, no request payload is generated or transmitted.

#### 6. Patient and Treatment-Offer ID Propagation
- `offerId` from URL param `:id`.
- Passed forward to `/schedule/review` via router state (`{ state: offer }`).
- Deep links hydrate the offer by ID, but lose the selected slot and fallback to hardcoded default slot "Cath Lab Suite 3, Nov 4, 09:30 AM".

#### 7. Authentication and Authorization
- Protected by `ProtectedLayout`. Token injected. No role checks.

#### 8. Loading, Error, and Empty States
- Zero loading states or error boundaries for slots or booking.

#### 9. Actual Data Persistence
- **ZERO PERSISTENCE:** The procedure slot selection is not persisted to the backend database. It exists purely in React component state.

#### 10. Hardcoded Values and Mock Data Locations
- Lines 354, 384–419: Week of November 2–8, 2026; days: Mon Nov 2 (2 slots), Tue Nov 3 (1 slot), Wed Nov 4 (4 slots, SELECTED), Thu Nov 5 (Full), Fri Nov 6 (3 slots).
- Lines 456–624: All morning and afternoon slots:
  - 08:00 AM (Occupied, Dr. Aris Thorne, CPT #92928)
  - 09:30 AM (Cath Lab Suite 3, Held, C-Arm Fluoroscopy #3 Ready, Recovery Bay #104 Held, Lock expires in 42:15 min, Matched to Care ID #8472-9901)
  - 11:15 AM (Cath Lab Suite 2, Available)
  - 01:30 PM (Cath Lab Suite 3, Available)
  - 03:15 PM (Cath Lab Suite 1, Clinical Conflict, Anesthesia turnover delay)
  - 05:00 PM (Cath Lab Suite 2, Maintenance)
- Lines 687–688: Clinical staff: "Lead RN K. Vance", "Scrub Tech J. Morales", "MAC Tier 1 Standby"
- Line 727: Escort "Mary Sterling"

#### 11. Lifecycle Transition Validation
- Any offer ID can be scheduled into Suite 3 regardless of offer status or clearance.

#### 12. Refresh and Direct URL Hydration
- Direct URL hydration reloads basic offer demographics from `getTreatmentOffer(id)`. All suite calendar data remains hardcoded mock elements.

#### Stage-Specific Critical Invariant Assessment: Stage 10
- **Requirement:** "Real facility/suite availability and actual scheduling/appointment persistence with no fabricated slots."
- **Verdict: VIOLATED.**
  - Available Postman endpoints for facility rooms and slots are completely bypassed.
  - The calendar week (Nov 2–8) and all morning/afternoon slots are 100% fabricated in code.
  - Zero appointment or slot reservation is persisted.

---

### Stage 11: Hold Review

#### 1. React Component and Route Binding
- **Component:** `ProcedureSchedulingPage`
- **File Path:** `src/pages/treatment-offers/ProcedureSchedulingPage.tsx` (lines 772–1100, mode `'review'`)
- **Route Path:** `/treatment-offers/:id/schedule/review`
- **Router Configuration:** `src/routes/index.tsx`, lines 480–483:
  ```typescript
  {
    path: '/treatment-offers/:id/schedule/review',
    element: <ProcedureSchedulingPage initialMode="review" />,
  }
  ```
- **Protected Layout:** Enclosed under `ProtectedLayout`. Named export imported in `src/routes/index.tsx:27`.

#### 2. Figma Design Correspondence
- **Authoritative Reference:** Frame `1:10786` ("Care ID Doctor - Slot Confirmation & Final Review", 1280 × 2614).
- **Design Inventory:** `analysis_reports/01_figma_design_inventory.md`, Domain 9, Screen #39.
- **Visual Alignment:**
  - 3-step progress bar (Step 1 Complete, Step 2 Active, Step 3 Upcoming) in lines 775–808.
  - "Procedural Slot Locked - Ready to Schedule Cath Lab Procedure" banner (lines 810–834).
  - Procedural & Facility Specifications card (lines 840–897).
  - Financial Ratification Snapshot card (lines 899–937).
  - Patient Preparation & Clinical Instructions card (lines 939–982).
  - Prerequisite Gatekeeper (lines 988–1039).
  - Automated Dispatches card (lines 1042–1063).
- **Visual Deviations:**
  - Prerequisite readiness gauge is statically hardcoded to 60% (line 1001).

#### 3. Backend API Availability
- **Static Contract Analysis against Postman Collection:**
  - **CRITICAL BACKEND GAP: ZERO endpoints for procedural slot holds exist in Postman.**
  - Postman contains calendar blocking (`POST /api/v1/schedules/:id/block`), but no temporary reservation, hold countdown, hold extension, or hold release endpoint for procedural suites.

#### 4. Actual Frontend Service Implementation
- Neither `treatmentOfferService.ts` nor `consultationService.ts` contains any methods for slot hold management.
- The component invokes only `treatmentOfferService.getTreatmentOffer(id)` and `patientService.getPatientById(...)`.
- Action `onClick={() => triggerToast('Slot hold verified: Active for 42 mins.')}` (line 304) simulates hold review via a toast notification.

#### 5. Request and Response DTO Alignment
- No backend DTO exists. Interface `ProceduralSlot` in `src/pages/treatment-offers/types.ts` is purely a local frontend interface.

#### 6. Patient and Treatment-Offer ID Propagation
- Route param `:id` binds `offerId`.
- No `holdId` or `slotId` is tracked or propagated.
- Navigates to Stage 12 via `setMode('confirmed')` and `navigate('/treatment-offers/${offer.offerId}/scheduled', { state: offer })`.

#### 7. Authentication and Authorization
- Protected by `ProtectedLayout`. Doctor information loaded from `useAuth()`. No hold review authorization checks.

#### 8. Loading, Error, and Empty States
- Silent catch blocks (`.catch(() => {})`) swallow offer fetch errors, leaving fallback strings.

#### 9. Actual Data Persistence
- Zero persistence: No slot hold record exists on the backend server.

#### 10. Hardcoded Values and Mock Data Locations
- Line 509: `"Lock expires in 42:15 min"` (static countdown string)
- Line 827: `"Nov 4, 2026 @ 09:30 AM EST"`
- Line 850: `"Cath Lab Suite 3 Locked"`
- Line 858: `"CPT Code #93458"`
- Line 870: `"Cath Lab Suite 3 (Interventional Wing, 4th Fl)"`
- Line 876: `"Wed, Nov 4, 2026 • 09:30 AM – 11:00 AM • 90 Mins OR Block Allocation"`
- Line 881: `"07:30 AM EST (2 Hours Prior)"`
- Line 888: `"State Lic #88392"`
- Line 894: `"Lead RN K. Vance + Scrub Tech J. Morales + MAC Tier 1 Standby"`
- Line 935: `"Signed via Mobile App (Oct 19, 2026)"`
- Line 958: `"Strict fasting ... beginning at 01:30 AM EST on Nov 4"`
- Line 968: `"Hold Metformin 48 hours prior to contrast dye injection"`
- Line 978: `"Designated escort verified: Mary Sterling (Spouse)"`
- Line 1001: Prerequisite readiness gauge hardcoded to `"60%"`
- Line 1028: `"req #LAB-8821. Draw by Nov 2."`
- Line 1035: `"NP Rostova"`
- Line 1052: `"+1 555-***-9182"`

#### 11. Lifecycle Transition Validation
- Clicking "Continue to Confirm Slot" executes `handleProceedToReview` (lines 145–148), which merely performs an in-memory route navigation without backend verification.

#### 12. Refresh and Direct URL Hydration
- Refreshing preserves mode `'review'`, reloads basic demographics, but renders identical hardcoded slot specifications and hold timer strings.

#### Stage-Specific Critical Invariant Assessment: Stage 11
- **Requirement:** "Actual hold status and review with no simulated approval or release."
- **Verdict: VIOLATED.**
  - Zero hold review endpoints exist in Postman or backend.
  - Hold verification is simulated via a toast message (`'Slot hold verified: Active for 42 mins.'`).
  - Hold timer and slot specifications are static mock strings.


---

### Stage 12: Slot Confirmed

#### 1. React Component and Route Binding
- **Component:** `ProcedureSchedulingPage`
- **File Path:** `src/pages/treatment-offers/ProcedureSchedulingPage.tsx` (lines 1105–1454, mode `'confirmed'`)
- **Route Path:** `/treatment-offers/:id/scheduled`
- **Router Configuration:** `src/routes/index.tsx`, lines 484–487:
  ```typescript
  {
    path: '/treatment-offers/:id/scheduled',
    element: <ProcedureSchedulingPage initialMode="confirmed" />,
  }
  ```
- **Protected Layout:** Enclosed under `ProtectedLayout`. Named export imported in `src/routes/index.tsx:27`.

#### 2. Figma Design Correspondence
- **Authoritative Reference:** Frame `1:11274` ("Care ID Doctor - Procedure Scheduled Successfully", 1280 × 2393).
- **Design Inventory:** `analysis_reports/01_figma_design_inventory.md`, Domain 9, Screen #40.
- **Visual Alignment:**
  - Hero success banner with deep purple gradient, green shield, and 5-metric quick bar (lines 1108–1152).
  - 6-step Procedural Booking Lifecycle stepper (Phase 5 of 6 Completed) in lines 1154–1200.
  - Confirmed Procedural Record card with Mount Sinai Cath Bay #4, arrival window, anesthesia protocol, and facility map pin (lines 1206–1271).
  - Automatic Patient Dispatch Status (push, SMS, digital health pass, escort) in lines 1273–1337.
  - Required Clinical Milestones card (lines 1342–1387).
  - Physician Action Console (lines 1389–1433).
  - Cryptographic EHR Verification card (lines 1434–1451).
- **Visual Deviations:**
  - High visual fidelity to Figma, but all confirmed data is statically generated in JSX.

#### 3. Backend API Availability
- **Postman Collection Static Contract Analysis:**
  - Postman Folder `10. Appointments, Schedules & Shifts` contains `POST /api/v1/appointments` (Book a new appointment), requiring `patientProfileId`, `doctorProfileId`, `facilityId`, `appointmentDate`, `startTime`, `endTime`, `type`.
  - **CRITICAL DEFECT:** The frontend component **never calls** `POST /api/v1/appointments`.

#### 4. Actual Frontend Service Implementation
- Transitioning from Stage 11 to Stage 12 is handled by `handleConfirmBooking` in `ProcedureSchedulingPage.tsx` lines 155–159:
  ```typescript
  const handleConfirmBooking = () => {
    setMode('confirmed');
    navigate(`/treatment-offers/${offer.offerId}/scheduled`, { state: offer });
    triggerToast('Procedure #PROC-2026-93458 locked into Cath Lab Suite 3.');
  };
  ```
- **Zero network calls** are made. The booking confirmation is executed purely in local state.

#### 5. Request and Response DTO Alignment
- No request payload is built or sent.
- The returned UI display fabricates the appointment ID `#PROC-2026-93458` directly in JSX.

#### 6. Patient and Treatment-Offer ID Propagation
- Route path is `/treatment-offers/:id/scheduled`. `:id` is the `offerId`.
- The navigation button "View Scheduled Procedure & Appointment Details" calls `handleGoToAppointmentDetails` (lines 161–163):
  `navigate('/treatment-offers/' + offer.offerId + '/appointment', { state: offer });`
- It does NOT pass an authentic backend `appointmentId`.

#### 7. Authentication and Authorization
- Protected by `ProtectedLayout`. Attending physician profile is displayed.
- No backend authorization is checked because no API call is made.

#### 8. Loading, Error, and Empty States
- Since no network request is executed, there are no loading indicators, error boundaries, or retry buttons for appointment booking.

#### 9. Actual Data Persistence
- **Zero data persistence.** No record is saved in the backend database.

#### 10. Hardcoded Values and Mock Data Locations
- Line 1133: Appointment ID `#PROC-2026-93458`
- Line 1137: `"Wed, Nov 4 • 09:30 AM"`
- Line 1141: `"Mount Sinai • Suite 3"`
- Line 1149: `"Oct 19, 2026 • 02:45 PM"`
- Lines 1249–1250: `"1468 Madison Ave, 3rd Floor Cath Lab Pavilion, New York, NY"`
- Line 1265: `"Total Protected Amount: $4,420.00 • Agreement #FIN-TR8921-12M (0% APR)"`
- Line 1295: `"Device: iPhone 15 Pro • Token verified • Acknowledged by patient"`
- Line 1308: `"Delivery Receipt #SMS-884920"`
- Line 1320: `"NFC Check-In Beacon enabled for Mount Sinai Pavilion Entrance"`
- Line 1330: `"Mary Sterling (Spouse)"`
- Line 1444: `"SHA256: 4b91f638c502e8f118de00184bba74902b7c7a5128106c820a"`
- Line 1447: `"Signed: Michael Chang, MD"`

#### 11. Lifecycle Transition Validation
- Completely bypassed. Entering `/treatment-offers/:id/scheduled` directly in the browser immediately displays a confirmed booking for any offer ID, with zero validation that the offer was accepted or that a slot was selected.

#### 12. Refresh and Direct URL Hydration
- On refresh (F5), `mode = 'confirmed'` is preserved via pathname parsing (line 128).
- `treatmentOfferService.getTreatmentOffer(id)` loads the offer, but the appointment details (Case `#PROC-2026-93458`, Nov 4 09:30 AM) remain hardcoded in JSX.

#### Stage-Specific Critical Invariant Assessment: Stage 12
- **Requirement:** "Actual confirmed appointment and correct appointment/offer relationship with no fabricated confirmation."
- **Verdict: VIOLATED.**
  - Postman contains `POST /api/v1/appointments`, but the frontend never invokes it.
  - Appointment Case `#PROC-2026-93458` is 100% fabricated in JSX.
  - Confirmation is an in-memory simulation; refreshing or direct-navigating bypasses all booking preconditions.

---

### Stage 13: Appointment Ledger

#### 1. React Component and Route Binding
- **Component:** `AppointmentDetailsPage`
- **File Path:** `src/pages/treatment-offers/AppointmentDetailsPage.tsx` (752 lines)
- **Route Path:** `/treatment-offers/:id/appointment`
- **Router Configuration:** `src/routes/index.tsx`, lines 488–490:
  ```typescript
  {
    path: '/treatment-offers/:id/appointment',
    element: <AppointmentDetailsPage />,
  }
  ```
- **Protected Layout:** Enclosed under `ProtectedLayout`. Named export imported in `src/routes/index.tsx:28`.

#### 2. Figma Design Correspondence
- **Authoritative Reference:** Frame `1:11774` ("Care ID Doctor - Scheduled Procedure & Appointment Details", 1280 × 2360.75).
- **Design Inventory:** `analysis_reports/01_figma_design_inventory.md`, Domain 9, Screen #41.
- **Visual Alignment:**
  - Status badges ("CONFIRMED", "UPCOMING • IN 16 DAYS") and Case ID header (lines 257–273).
  - Action buttons: "Reschedule", "Cancel", "Print Sheet" (lines 276–300).
  - 4-card metric summary ribbon (Scheduled Procedure Time, Surgical Location, Attending Specialist, Underwritten Settlement) in lines 304–383.
  - Clinical Indication & Surgical Scope card (lines 389–437).
  - Clinical Orders & Preparation Mandates card (lines 439–525).
  - Linked Clinical Documentation Vault (lines 527–595).
  - Procedure Readiness card with 60% gauge and gate checklist (lines 599–658).
  - Patient Dispatch Audit card (lines 660–696).
  - HIPAA & HL7 FHIR compliance footnote (lines 729–732).
- **Visual Deviations:**
  - Layout matches Figma closely, but values (dates, times, staff, lab requisitions) are synthesized from mock templates.

#### 3. Backend API Availability
- **Postman Collection Static Contract Analysis:**
  - Postman Folder `10. Appointments, Schedules & Shifts` contains:
    - `GET /api/v1/appointments/:id` (Get appointment details by ID)
    - `GET /api/v1/appointments/doctor/me` (List doctor appointments)
    - `PUT /api/v1/appointments/:id/reschedule`
    - `PUT /api/v1/appointments/:id/cancel`
    - `PUT /api/v1/appointments/:id/status`
  - **CRITICAL ARCHITECTURAL DISCONNECTION:** Backend HAS appointment endpoints, but `AppointmentDetailsPage.tsx` does **NOT** invoke `GET /api/v1/appointments/:id` or any appointment endpoint.

#### 4. Actual Frontend Service Implementation
- In `AppointmentDetailsPage.tsx` lines 79–98, the page invokes only `treatmentOfferService.getTreatmentOffer(id)`.
- It never queries the appointment service or fetches an actual appointment entity.
- Reschedule button (line 278): `onClick={() => triggerToast('Reschedule modal opened.')}` (no API call to `PUT /appointments/:id/reschedule`).
- Cancel button (line 286): `onClick={() => triggerToast('Cancellation protocol initiated.')}` (no API call to `PUT /appointments/:id/cancel`).

#### 5. Request and Response DTO Alignment
- The component fabricates an in-memory `AppointmentRecord` object (lines 100–122) directly from `offer`:
  ```typescript
  const appointment: AppointmentRecord = {
    appointmentId: offer.offerId ? `#PROC-${offer.offerId.slice(0, 8).toUpperCase()}` : '',
    offerId: offer.offerId || id || '',
    patientId: offer.patientId || '',
    patientName: offer.patientName || '',
    procedureName: offer.procedureName || 'Clinical Procedure',
    cptCode: offer.cptCode || '',
    facility: offer.facility || 'Heart Center Outpatient Unit',
    facilityAddress: offer.facility || 'Cardiac Outpatient Pavilion',
    suite: 'Cath Lab Suite (Interventional Wing)',
    scheduledDate: offer.expirationDate || 'Pending Final Schedule',
    scheduledTime: '09:30 AM – 11:00 AM EST',
    arrivalWindow: '07:30 AM EST (2 Hours Prior)',
    attendingDoctor: user?.fullName || offer.attendingDoctor || 'Attending Physician, MD',
    attendingLicense: 'Interventional Specialist',
    anesthesiaProtocol: 'MAC Tier 1 Standby (Mild conscious sedation / Local lidocaine 1%)',
    anesthesiaStaff: 'NP / CRNA Standby',
    underwrittenAmount: offer.totalPayable,
    financingPlan: offer.financingPackageName,
    lockedTimestamp: offer.dispatchedAt || 'Active Protocol',
    auditHash: offer.auditHash || `SHA256:${(offer.offerId || '').replace(/-/g, '').slice(0, 16)}`,
    readinessPercentage: 60,
  };
  ```
- None of these fields come from the backend `Appointment` table schema.

#### 6. Patient and Treatment-Offer ID Propagation
- Route is `/treatment-offers/:id/appointment`.
- The parameter `:id` is the `offerId`.
- The backend `appointmentId` (UUID) is never bound, queried, or passed.
- Clicking "Detailed Readiness View" (line 652) navigates to `/treatment-offers/${offer.offerId}/pre-op` with `{ state: offer }`.

#### 7. Authentication and Authorization
- Protected by `ProtectedLayout`. Attending physician profile displayed.
- No appointment ownership or tenant verification on the backend.

#### 8. Loading, Error, and Empty States
- No loading spinner or skeleton during offer fetch.
- Silently catches fetch failure with no error notice or retry option.

#### 9. Actual Data Persistence
- Purely read-only frontend view synthesized from offer metadata. No appointment data is read from or written to backend.

#### 10. Hardcoded Values and Mock Data Locations
- Line 111: `scheduledTime: '09:30 AM – 11:00 AM EST'`
- Line 112: `arrivalWindow: '07:30 AM EST (2 Hours Prior)'`
- Line 115: `anesthesiaProtocol: 'MAC Tier 1 Standby ...'`
- Line 116: `anesthesiaStaff: 'NP / CRNA Standby'`
- Line 121: `readinessPercentage: 60`
- Line 264: `"UPCOMING • IN 16 DAYS"`
- Lines 334–340: `"Cath Lab Suite 3 • Mount Sinai Hospital • Interventional Wing • 3rd Fl (Tower B)"`
- Line 360: `"NPI #19820491 • Lic #88392-NY"`
- Line 380: `"Ref #FIN-TR8921-12M"`
- Line 409: `"Linked to referral #REF-4491 initiated by Dr. Sarah Lin"`
- Lines 420–422: `"Fluoroscopy 15fps"`, `"Isovue-370"`, `"Angio-Seal™ VIP"`
- Line 465: `"Nothing by mouth after 01:30 AM EST on Nov 4, 2026"`
- Line 494: `"Order #LAB-8821 DISPATCHED"`
- Line 521: `"CRNA/NP Elena Rostova scheduled for Nov 2, 2026 at 03:00 PM EST"`
- Lines 548–592: Mock records in documentation vault ("Stress ECG Full Report", "Pre-Cath Echocardiogram", etc.)
- Lines 668–693: Mock dispatch audit entries
- Line 730: Mock EHR endpoint `epicx-hls-cath3`

#### 11. Lifecycle Transition Validation
- Unvalidated. Can be viewed at any time for any `:id`, even without an appointment ever being scheduled.

#### 12. Refresh and Direct URL Hydration
- On refresh (F5), `treatmentOfferService.getTreatmentOffer(id)` hydrates the offer title, patient name, and financial figures.
- However, the scheduled appointment time, suite, clinical orders, and readiness score are static mock values that are not hydrated from a real appointment record.

#### Stage-Specific Critical Invariant Assessment: Stage 13
- **Requirement:** "Authentic appointment ledger with actual appointment date, time, patient, and procedure."
- **Verdict: VIOLATED.**
  - The appointment ledger does not query `GET /api/v1/appointments/:id`.
  - It synthesizes an appointment entity from the treatment offer DTO, hardcoding the appointment time (09:30 AM), suite (Cath Lab Suite 3), anesthesia protocol, and preparation orders.

---

### Stage 14: Pre-Op Readiness

#### 1. React Component and Route Binding
- **Component:** `PreOpReadinessPage`
- **File Path:** `src/pages/treatment-offers/PreOpReadinessPage.tsx` (787 lines)
- **Route Path:** `/treatment-offers/:id/pre-op`
- **Router Configuration:** `src/routes/index.tsx`, lines 492–494:
  ```typescript
  {
    path: '/treatment-offers/:id/pre-op',
    element: <PreOpReadinessPage />,
  }
  ```
- **Protected Layout:** Enclosed under `ProtectedLayout`. Named export imported in `src/routes/index.tsx:29`.

#### 2. Figma Design Correspondence
- **Authoritative Reference:** Frame `1:12355` ("Care ID Doctor - Pre-Procedure Readiness Checklist", 1280 × 3369).
- **Design Inventory:** `analysis_reports/01_figma_design_inventory.md`, Domain 9, Screen #42.
- **Visual Alignment:**
  - Readiness indicator banner with dynamic percentage gauge (8 of 11 = 73% or 60% base) in lines 296–345.
  - Category 1: Financial & Legal Authorization (Settlement, Care ID 0% APR Financing, Biometric Consent) in lines 349–436.
  - Category 2: Laboratory & Diagnostic Prerequisites (Coagulation Panel PT/INR, BMP & Creatinine, 12-lead ECG & Echo review) in lines 438–557.
  - Category 3: Pharmacological & Safety Protocols (Penicillin Allergy, Medication Hold for Metformin, Pre-Op Anesthesia Clearance) in lines 559–667.
  - Category 4: Facility & Logistical Preparations (Cath Lab Suite 3 Reservation, NPO Fasting & Escort) in lines 669–732.
  - Bottom Action Bar: "Return to Scheduled Procedure Details", "Download Readiness Audit Report (PDF)", "Sign Off Final Clinical Clearance" (lines 735–772).
- **Visual Deviations:**
  - High visual fidelity to Figma, but all checklist items are hardcoded cards with interactive mock simulation toggles.

#### 3. Backend API Availability
- **Static Contract Analysis against Postman Collection:**
  - **CRITICAL BACKEND GAP: ZERO endpoints for clinical readiness checklists, prerequisite gates, or lab clearances exist in Postman.**
  - Confirmed by `feature05_trajectory_18_stage_navigation.test.ts` line 25: `backendStatus: 'NOT_IMPLEMENTED'`.

#### 4. Actual Frontend Service Implementation
- No service method exists for pre-op readiness in frontend services.
- The component only loads `treatmentOfferService.getTreatmentOffer(id)` on mount (lines 75–92).

#### 5. Request and Response DTO Alignment
- No backend DTOs exist. All checklist states are stored in local React component state (lines 136–137):
  ```typescript
  const [labCleared, setLabCleared] = useState<boolean>(false);
  const [anesthesiaCleared, setAnesthesiaCleared] = useState<boolean>(false);
  ```

#### 6. Patient and Treatment-Offer ID Propagation
- Route is `/treatment-offers/:id/pre-op`. `:id` is the `offerId`.
- Advance action `handleSignOffAndAdvance` (lines 151–157) navigates:
  `navigate('/treatment-offers/' + offer.offerId + '/check-in', { state: offer });`
- Only propagates state in `location.state`.

#### 7. Authentication and Authorization
- Protected by `ProtectedLayout`. Attending physician profile displayed.
- No role check or credential verification for signing off clinical clearance.

#### 8. Loading, Error, and Empty States
- No loading indicators during offer fetch.
- Catch block silently swallows fetch errors.

#### 9. Actual Data Persistence
- **Zero persistence.** All checklist toggles and the final sign-off are discarded on page unmount or reload.

#### 10. Hardcoded Values and Mock Data Locations
- Line 312: `"Scheduled: Wed, Nov 4, 2026 @ 09:30 AM EST"`
- Lines 374–376: `"$4,420.00 underwritten • Ledger Ref: #REV-2026-88519 • Settled Oct 18, 2026 @ 14:22 EST"`
- Line 400: `"Credit Assurance ID: #CRD-0052-768"`
- Line 424: `"Witnessed by Clinical Navigator Merri Dunn, RN"`
- Line 476: `"INR: 1.1 (Target: <= 1.5)"`
- Line 477: `"Requisition #LAB-8821 dispatched to Mount Sinai Central Lab"`
- **Lines 485–488 (Direct Simulation of Lab Results):**
  ```typescript
  onClick={() => {
    setLabCleared(!labCleared);
    triggerToast(labCleared ? 'Lab reset to pending draw.' : 'Simulated lab results received: INR 1.1 (Normal). Gate cleared!');
  }}
  ```
- Line 515: `"CLEARED (eGFR 88)"`
- Line 521: `"Order #BMP-48812-NEPH"`
- Line 545: `"EKG Reading #EKG-2412 verified"`
- Line 588: `"EHR Pharmacy Flag ID: #PHA-ALLERGY-11 • Double-verification Signed by Staff Pharm. R. Nelco"`
- Line 612: `"Discontinuation Target: Nov 2 @ 09:30 AM"`
- **Lines 653–656 (Direct Simulation of Anesthesia Clearance):**
  ```typescript
  onClick={() => {
    setAnesthesiaCleared(!anesthesiaCleared);
    triggerToast(anesthesiaCleared ? 'Anesthesia clearance reset.' : 'Anesthesia evaluation signed off by NP Elena Rostova!');
  }}
  ```
- Line 696: `"Resource Allocation #STE-SUITE-391 • Team Leads: Lead RN / Ramos"`
- Line 720: `"Escort: Mary Sterling (+1 555-***-9182)"`
- Line 778: `"Audit Trail ID #AUD-93458-READINESS"`

#### 11. Lifecycle Transition Validation
- Line 152 checks `if (!isFullyCleared)`, blocking transition to Stage 15 unless all gates are cleared.
- However, this is bypassed simply by clicking the two simulation buttons (lines 485 and 653) to flip the React boolean state to `true`, or by navigating directly to `/treatment-offers/:id/check-in`.

#### 12. Refresh and Direct URL Hydration
- On refresh (F5), `labCleared` and `anesthesiaCleared` reset to `false`.
- Clearance progress resets to 73% (or 60%), losing any in-session sign-offs because nothing was saved to the backend.

#### Stage-Specific Critical Invariant Assessment: Stage 14
- **Requirement:** "Actual pre-operative readiness information and real clinical prerequisites with no fabricated lab or clearance results."
- **Verdict: FLAGRANTLY VIOLATED.**
  - The component contains explicit simulation handlers that fabricate lab results (`'Simulated lab results received: INR 1.1 (Normal). Gate cleared!'`) and anesthesia evaluations (`'Anesthesia evaluation signed off by NP Elena Rostova!'`).
  - Zero backend clearance APIs exist; all data resets upon refresh.

---

### Stage 15: Day-of-Checkin

#### 1. React Component and Route Binding
- **Component:** `DayOfCheckinPage`
- **File Path:** `src/pages/treatment-offers/DayOfCheckinPage.tsx` (703 lines)
- **Route Paths:** `/treatment-offers/:id/check-in` and `/treatment-offers/:id/day-of-checkin`
- **Router Configuration:** `src/routes/index.tsx`, lines 496–502:
  ```typescript
  {
    path: '/treatment-offers/:id/check-in',
    element: <DayOfCheckinPage />,
  },
  {
    path: '/treatment-offers/:id/day-of-checkin',
    element: <DayOfCheckinPage />,
  }
  ```
- **Protected Layout:** Enclosed under `ProtectedLayout`. Named export imported in `src/routes/index.tsx:30`.

#### 2. Figma Design Correspondence
- **Authoritative Reference:** Frame `1:13596` ("Care ID Doctor - Day-of-Procedure Check-In", 1280 × 1746.5).
- **Design Inventory:** `analysis_reports/01_figma_design_inventory.md`, Domain 9, Screen #43.
- **Visual Alignment:**
  - Top clinical bar with "Cath Lab Station #04", Live EHR Sync badge, Doctor profile (lines 129–172).
  - Context ribbon with DOB 04/18/1962, ID: CID-9048-28, Workflow breadcrumb (lines 175–203).
  - Patient Identification & Arrival Hero card with photo placeholder, CID, allergy alert, escort Mary Sterling in Suite 3B (lines 208–247).
  - Arrival Timestamp: "07:28 AM EST • Bay #04 Outpatient Pre-Op", Status box: "ARRIVED & CHECKED IN • Scheduled: Today 09:30 AM" (lines 251–275).
  - Inner banner: CPT #93458, Care ID 0% APR Plan $4,420.00 Locked & Settled (lines 278–304).
  - Pre-Procedure Readiness Matrix (7 cards) in lines 309–502.
  - Gateway Ratified Bottom Banner: "Patient Cleared for Pre-Procedure Clinical Safety Timeout" with CTA "Begin Patient Verification" (lines 504–536).
  - Right Column: Baseline Triage Vitals (BP 128/82, HR 68, SpO2 99%, Temp 98.4°F, Heparin 1.1 INR), Assigned Team (Doctor, K. Vance RN, J. Morales RCIS), Supporting actions (lines 540–699).
- **Visual Deviations:**
  - Matches Figma frame `1:13596` with high fidelity, but all arrival details and triage vitals are hardcoded JSX.

#### 3. Backend API Availability
- **Postman Collection Static Contract Analysis:**
  - Generic appointment status mutation exists: `PUT /api/v1/appointments/:id/status` (folder `10. Appointments, Schedules & Shifts`), accepting `status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'`.
  - **CRITICAL BACKEND GAP:** There is **NO dedicated check-in or admission endpoint** (such as `POST /appointments/:id/checkin` or `POST /checkin`).
  - Furthermore, `DayOfCheckinPage.tsx` does **NOT** call `PUT /api/v1/appointments/:id/status` or any other API to record check-in.

#### 4. Actual Frontend Service Implementation
- `DayOfCheckinPage.tsx` contains **no service method calls** to perform or confirm check-in.
- It only calls `treatmentOfferService.getTreatmentOffer(id)` and `patientService.getPatientById(...)` in `useEffect` (lines 77–95).
- The action `handleBeginVerification` (lines 114–116) only navigates to Stage 16:
  `navigate('/treatment-offers/' + offer.offerId + '/cath-lab-safety', { state: offer });`

#### 5. Request and Response DTO Alignment
- No check-in request payload is dispatched.
- No check-in response DTO is handled.
- The arrival timestamp ("07:28 AM EST"), bay number ("Bay #04 Outpatient Pre-Op"), and check-in status ("ARRIVED & CHECKED IN") are hardcoded in the JSX (lines 256–270).

#### 6. Patient and Treatment-Offer ID Propagation
- Route path is `/treatment-offers/:id/check-in` or `/treatment-offers/:id/day-of-checkin`.
- `:id` is the `offerId`.
- No `appointmentId` is passed in URL params or query strings.
- State is passed to Stage 16 via `location.state`.

#### 7. Authentication and Authorization
- Protected by `ProtectedLayout`. Doctor details displayed from `useAuth()`.
- No backend authorization or check-in staff verification.

#### 8. Loading, Error, and Empty States
- No loading skeletons or error banners.

#### 9. Actual Data Persistence
- **Zero persistence.** No check-in event, timestamp, or vital signs are stored in the database.

#### 10. Hardcoded Values and Mock Data Locations
- Line 138: `"Cath Lab Station #04"`
- Line 181: `"DOB: 04/18/1962"`
- Line 184: `"ID: CID-9048-28"`
- Line 240: `"Escort: Mary Sterling (Spouse) - Waiting Suite 3B"`
- Line 256: `"07:28 AM EST • Bay #04 Outpatient Pre-Op"`
- Line 269: `"ARRIVED & CHECKED IN • Scheduled: Today 09:30 AM"`
- Line 345: `"-$780.00 Applied"`
- Line 350: `"$4,420.00 (0% APR)"`
- Line 372: `"0x8892...3E41"`
- Line 394: `"1.1 (Norm)"`
- Line 402: `"0.95 mg/dL"`
- Line 424: `"MAC Tier 1 Standby Approved"`
- Line 444: `"NPO since 01:30 AM EST (6h 00m)"`
- Line 493: `"Lead RN K. Vance & Tech J. Morales scrubbed"`
- Line 499: `"Room 3 Temp: 68.2°F"`
- Lines 551–570: Vitals: BP 128/82, HR 68 BPM, SpO2 99%, Temp 98.4°F
- Line 578: `"1.1 INR (Optimal)"`

#### 11. Lifecycle Transition Validation
- Any user can open `/treatment-offers/:id/check-in` directly in the browser, showing the patient as already checked-in and arrived at 07:28 AM, without validating whether an appointment exists or whether the patient is actually on-site.

#### 12. Refresh and Direct URL Hydration
- On refresh (F5), the offer and patient demographics hydrate from the backend if `:id` exists.
- However, the check-in status and vitals do not hydrate from an authentic admission record; they remain hardcoded JSX values.

#### Stage-Specific Critical Invariant Assessment: Stage 15
- **Requirement:** "Actual day-of-check-in information, real patient/appointment identification, and persisted check-in state."
- **Verdict: VIOLATED.**
  - Zero check-in APIs are called.
  - Check-in status is 100% hardcoded in JSX ("07:28 AM EST • Bay #04 Outpatient Pre-Op").
  - Baseline triage vitals (BP 128/82, SpO2 99%) are static text blocks.
  - Refreshing or direct navigation renders an arrived patient for any arbitrary offer ID.

---

## Section A: Fully Implemented Stages

### Exhaustive Forensic Analysis
Based on strict forensic examination across all 12 dimensions and critical invariants:

**ZERO stages across Stages 6 through 15 qualify as 100% fully implemented end-to-end.**

While the Doctor Web Portal compiles cleanly (`tsc -b`, `eslint`, and `vite build` all succeed with 0 errors) and demonstrates high UI fidelity to Figma designs, not a single stage in this 10-stage trajectory functions end-to-end without architectural caveats, unhandled optimistic locking errors, missing polling listeners, simulated toast actions, or complete bypass of backend persistence.

### Specific Operation-Level Functional Analysis
The only backend-integrated operations that genuinely execute live HTTP network requests to the Staging API (`https://360api.vnvision.in/api/v1`) are:
1. **Treatment Offer Retrieval (Stages 6–15):** `treatmentOfferService.getTreatmentOffer(id)` correctly hits `GET /api/v1/doctors/treatment-offers/:offerId` (Postman Folder 05) and returns authentic offer numbers, procedure codes, pricing estimates, and financing flags.
2. **Patient Profile Enrichment (Stages 6–15):** `patientService.getPatientById(patientProfileId)` correctly queries `GET /api/v1/patients/:id` to populate patient demographics.
3. **Offer Lock & Dispatch (Stage 6):** `treatmentOfferService.dispatchTreatmentOffer(id, expectedVersion)` correctly calls `POST /api/v1/doctors/treatment-offers/:offerId/dispatch` (Postman Folder 05). However, as documented in Stage 6, it hardcodes `expectedVersion: 1` and fails forward on rejection.
4. **Offer Status Query (Stage 7):** `treatmentOfferService.getTreatmentOfferStatus(id)` correctly queries `GET /api/v1/doctors/treatment-offers/:offerId/status` on mount.
5. **Offer Cancellation (Stage 7):** `treatmentOfferService.cancelTreatmentOffer(id, reason, expectedVersion)` correctly hits `POST /api/v1/doctors/treatment-offers/:offerId/cancel`. However, it hardcodes `expectedVersion: 1`.

All other operations across Stages 8 through 15—including patient acceptance verification, clinical handoff gates, suite slot reservations, hold reviews, appointment booking, pre-op checklist clearance, and day-of-surgery check-in—are either entirely disconnected from available backend APIs or rely on APIs that do not exist in the backend collection.

---

## Section B: Partially Implemented Stages

Three stages in the trajectory possess authentic, functioning backend integration for core operations but suffer from specific flaws, missing real-time capabilities, or architectural disconnections:

### 1. Stage 6: Clinical Review (`TreatmentOfferReviewPage`)
- **What Works:**
  - Route `/treatment-offers/:id/review` binds correctly and is protected by `ProtectedLayout`.
  - Authentically retrieves treatment offer details via `treatmentOfferService.getTreatmentOffer(id)`.
  - Dispatches the offer to the patient via live HTTP POST to `/api/v1/doctors/treatment-offers/:offerId/dispatch`.
  - Transitions the backend offer status from `DRAFT` to `DISPATCHED`.
- **What Is Missing / Flawed:**
  - **Hardcoded Version:** Hardcodes `expectedVersion: 1` at line 121. If the offer version was incremented (e.g., version 2 or 3), the backend returns HTTP 409 Conflict.
  - **Fail-Forward Bug:** In lines 133–138, if the dispatch API fails, the catch block logs the error but unconditionally executes `navigate('/treatment-offers/${offer.offerId}/status')`, falsely advancing to Stage 7.
  - **Persistence Gap:** Local persistence relies on `consultationService.saveTreatmentOffer`, which writes to an in-memory `Map` that is destroyed on browser refresh.

### 2. Stage 7: Dispatched Status (`TreatmentOfferStatusPage`)
- **What Works:**
  - Route `/treatment-offers/:id/status` binds correctly and loads authentic offer details.
  - Authentically queries live status from `GET /api/v1/doctors/treatment-offers/:offerId/status`.
  - Doctor cancellation is wired to authentic `POST /api/v1/doctors/treatment-offers/:offerId/cancel`.
- **What Is Missing / Flawed:**
  - **No Polling Engine:** Status is queried exactly once on mount. The doctor cannot observe patient view or acceptance events without manually refreshing the browser.
  - **Simulated SMS Resend:** The "Resend SMS Link" button (lines 129–131) triggers a dummy toast (`triggerToast('Priority SMS notification link resent...')`) without calling any backend notification endpoint (e.g. `POST /api/v1/notifications/sms`).
  - **Unchecked Transition:** The CTA button "Proceed to Clinical Handoff & Scheduling" navigates to `/accepted` without verifying `liveStatus?.status === 'RATIFIED_ACCEPTED'`.
  - **Hardcoded Version:** Cancellation hardcodes `expectedVersion: 1`.

### 3. Stage 13: Appointment Ledger (`AppointmentDetailsPage`)
- **What Works:**
  - Route `/treatment-offers/:id/appointment` binds correctly and renders a high-fidelity 752-line clinical ledger matching Figma frame `1:11774`.
  - Successfully hydrates core offer demographics and procedures via `treatmentOfferService.getTreatmentOffer(id)`.
- **What Is Missing / Flawed:**
  - **Disconnected from Appointment API:** Although Postman Folder 10 provides `GET /api/v1/appointments/:id`, the component never calls it.
  - **Synthesized Mock Ledger:** Synthesizes an `AppointmentRecord` (lines 100–122) directly from offer fields, hardcoding surgical time ("09:30 AM – 11:00 AM EST"), arrival window ("07:30 AM EST"), suite ("Cath Lab Suite 3"), lab order `#LAB-8821`, and readiness percentage (60%).
  - **Dummy Action Handlers:** Action buttons for "Reschedule" and "Cancel" trigger dummy toasts (`triggerToast('Reschedule modal opened.')`) instead of calling `PUT /api/v1/appointments/:id/reschedule` or `PUT /api/v1/appointments/:id/cancel`.

---

## Section C: Missing Backend APIs

The authoritative Postman collection (`CareID-Staging.postman_collection.json`, 559 requests) was comprehensively searched. The following REST endpoints are entirely missing from the backend collection and must be developed by the backend engineering team:

### 1. Stage 9: Pre-Op Clearance & Clinical Handoff
- **Missing Endpoint 1:** `POST /api/v1/treatment-offers/:id/clearance`
  - **Purpose:** Record clinical clearance authorization, gatekeeper verifications, and anesthesia review.
  - **Proposed Request Body:**
    ```json
    {
      "clinicalClearanceApproved": true,
      "clearedByDoctorProfileId": "uuid-v4",
      "anesthesiaClearanceApproved": true,
      "anesthesiaReviewNotes": "MAC Tier 1 Standby approved by NP Elena Rostova",
      "labPanelCleared": true,
      "escortDesignated": true,
      "escortName": "Mary Sterling",
      "escortPhone": "+15550199182",
      "clearanceRuleRef": "CR-FIN-15"
    }
    ```
  - **Proposed Response (200 OK):**
    ```json
    {
      "clearanceId": "uuid-v4",
      "offerId": "uuid-v4",
      "status": "CLEARED_TO_PROCEED",
      "gateCount": 5,
      "gatesPassed": 5,
      "clearedAt": "2026-11-09T18:30:00.000Z",
      "digitalSealHash": "SHA256:4a61e9b28c04918e..."
    }
    ```
- **Missing Endpoint 2:** `GET /api/v1/treatment-offers/:id/clearance`
  - **Purpose:** Retrieve existing clearance status, checklist items, and diagnostic vault references.

### 2. Stage 11: Procedural Suite Hold & Reservation
- **Missing Endpoint 1:** `POST /api/v1/facilities/:facilityId/rooms/:roomId/holds`
  - **Purpose:** Place a temporary locking hold on a procedural suite for an accepted treatment offer.
  - **Proposed Request Body:**
    ```json
    {
      "offerId": "uuid-v4",
      "patientProfileId": "uuid-v4",
      "holdDate": "2026-11-15",
      "startTime": "09:30",
      "endTime": "11:00",
      "holdDurationMinutes": 45
    }
    ```
  - **Proposed Response (201 Created):**
    ```json
    {
      "holdId": "uuid-v4",
      "roomId": "uuid-v4",
      "roomName": "Cath Lab Suite 3",
      "expiresAt": "2026-11-09T19:15:00.000Z",
      "remainingSeconds": 2700,
      "status": "ACTIVE_HOLD"
    }
    ```
- **Missing Endpoint 2:** `DELETE /api/v1/facilities/:facilityId/rooms/:roomId/holds/:holdId`
  - **Purpose:** Release or expire an active procedural suite hold.

### 3. Stage 14: Pre-Operative Readiness Checklist
- **Missing Endpoint 1:** `GET /api/v1/treatment-offers/:id/pre-op-readiness`
  - **Purpose:** Retrieve the live 11-point clinical readiness checklist, including verified lab results (INR, BMP) and EHR pharmacy allergy flags.
  - **Proposed Response (200 OK):**
    ```json
    {
      "offerId": "uuid-v4",
      "readinessPercentage": 73,
      "totalGates": 11,
      "passedGates": 8,
      "gates": [
        { "id": "LAB_INR", "category": "DIAGNOSTIC", "title": "Coagulation Panel PT/INR", "status": "PENDING", "value": null, "requisitionId": "LAB-8821" },
        { "id": "ANESTHESIA", "category": "PHARMACOLOGICAL", "title": "Pre-Op Anesthesia Clearance", "status": "PENDING", "attending": "NP Elena Rostova" }
      ]
    }
    ```
- **Missing Endpoint 2:** `POST /api/v1/treatment-offers/:id/pre-op-readiness/sign-off`
  - **Purpose:** Clinician signs off final pre-operative clearance and authorizes patient for day-of admission.

### 4. Stage 15: Day-of-Checkin & Admission
- **Missing Endpoint 1:** `POST /api/v1/appointments/:id/checkin`
  - **Purpose:** Persist patient arrival, bay assignment, and admission timestamp.
  - **Proposed Request Body:**
    ```json
    {
      "arrivedAt": "2026-11-09T07:28:00.000Z",
      "bayNumber": "Bay #04 Outpatient Pre-Op",
      "escortConfirmed": true,
      "vitals": {
        "bloodPressure": "128/82",
        "heartRate": 68,
        "spO2": 99,
        "temperature": 98.4,
        "inr": 1.1
      }
    }
    ```
  - **Proposed Response (200 OK):**
    ```json
    {
      "checkInId": "uuid-v4",
      "appointmentId": "uuid-v4",
      "status": "ARRIVED_CHECKED_IN",
      "admittedAt": "2026-11-09T07:28:00.000Z",
      "clearedForTimeout": true
    }
    ```

---

## Section D: Missing Frontend Functionality

To achieve end-to-end operational readiness, the following missing frontend workflows and mechanisms must be constructed:

1. **Real-Time Polling / WebSocket Engine (Stage 7):**
   - Implement an active polling loop (e.g., exponential backoff polling every 5–15 seconds with window focus detection) or an SSE/WebSocket listener in `TreatmentOfferStatusPage.tsx`.
   - The engine must observe `patientViewedAt` and `patientRespondedAt` and automatically transition the UI state when `status === 'RATIFIED_ACCEPTED'`.
2. **Strict Lifecycle State Machine Guards (Stages 7, 8, 10, 11, 12, 15):**
   - Eliminate unverified navigation transitions:
     - Disallow advancing from Stage 7 to Stage 8 unless backend status is strictly `'RATIFIED_ACCEPTED'`.
     - In `TreatmentOfferAcceptedPage.tsx`, render an explicit error/unauthorized state if `dto.status !== 'RATIFIED_ACCEPTED'`.
     - Disallow advancing to Suite Scheduling (Stage 10) unless Stage 9 clearance has completed.
     - Disallow direct access to `/scheduled` (Stage 12) or `/appointment` (Stage 13) unless a verified appointment UUID exists in backend state.
3. **Appointment Creation & Linkage Workflow (Stage 10 -> Stage 12):**
   - Replace the simulated `handleConfirmBooking` handler in `ProcedureSchedulingPage.tsx` with a live service call to `POST /api/v1/appointments`.
   - Propagate the resulting backend `appointmentId` (UUID) forward to Stage 12 and Stage 13.
   - Persist the relationship between `treatmentOfferId` and `appointmentId` in both local store and backend metadata.
4. **Authentic Appointment Ledger Data Retrieval (Stage 13):**
   - Update `AppointmentDetailsPage.tsx` to read `:id` as either an `appointmentId` or look up the linked appointment via `GET /api/v1/appointments?treatmentOfferId=:id`.
   - Bind all clinical fields (scheduled time, suite, assigned staff, anesthesia protocol) directly to the returned backend `AppointmentDTO`.
5. **Elimination of Simulation Handlers (Stage 14):**
   - Remove the interactive simulation buttons in `PreOpReadinessPage.tsx` (lines 485–488 and 653–656) that fabricate lab results and anesthesia sign-offs.
   - Replace them with real integration to the diagnostic laboratory service and EHR clinical documentation.
6. **Day-of-Checkin Admission Mutation (Stage 15):**
   - Connect the check-in workstation in `DayOfCheckinPage.tsx` to the backend appointment check-in API, capturing real triage vitals from medical devices or clinical staff input.
7. **Error Handling & Optimistic Lock Rollback:**
   - Across all mutation handlers (`TreatmentOfferReviewPage`, `TreatmentOfferStatusPage`), pass the authentic current `version` from the retrieved DTO instead of a hardcoded `1`.
   - On HTTP 409 Conflict or 500 error, halt navigation, display an inline alert banner, and provide a "Reload Latest Version" action.

---

## Section E: Hardcoded Data Locations

The following comprehensive catalog documents the exact file paths, component names, and line numbers of all hardcoded strings, mock objects, static numbers, simulated timers, and fake cryptographic tokens discovered across Stages 6 through 15:

```
====================================================================================================
STAGE 6: Clinical Review (TreatmentOfferReviewPage.tsx)
====================================================================================================
• Lines 35–73:   Fallback default state object:
                 patientName: 'Patient Record', age: 45, gender: 'Male', bloodGroup: 'A+',
                 facilityName: 'Main Medical Center', financingPackageId: 'careid-0'
• Line 105:      Attestation pre-check: useState<boolean>(true) (defaults to pre-attested)
• Line 121:      Hardcoded optimistic locking version: expectedVersion: 1
• Line 216:      Simulated quotation string: `"{offer.doctorNotes}"`

====================================================================================================
STAGE 7: Dispatched Status (TreatmentOfferStatusPage.tsx)
====================================================================================================
• Line 140:      Hardcoded cancellation version: expectedVersion: 1
• Line 206:      Hardcoded procedural slot: "Cath Lab Room 2 • Nov 4, 2026"
• Lines 359–363: Static dispatch metadata: "Expiration: Nov 1, 2026 (14 Days Remaining)",
                 "Dispatch Channel: SMS (+1 555-***-9182)"
• Lines 384–395: Mock timeline audit entries: "Oct 18, 10:30 AM", "Dr. M. Chang",
                 "Oct 18, 10:42 AM", "Care ID Gateway"
• Line 405:      Static timeline badge: "14 Days Remaining"
• Line 607:      Hardcoded schedule notice: "Cath Lab slot for Nov 4 is automatically booked"
• Line 655:      Masked phone number: "+1 (555) •••-9182"
• Line 668:      Simulated activity string: "Active session 12 mins ago"
• Line 777:      Hardcoded cryptographic token: SHA256-8921-TR-VERIFIED-7A890D
• Lines 738–749: Developer bypass button linking directly to cath lab safety check

====================================================================================================
STAGE 8: Offer Accepted (TreatmentOfferAcceptedPage.tsx)
====================================================================================================
• Line 143:      Hardcoded facility: "Mount Sinai Hospital Heart Center"
• Lines 148, 341, 567, 808: Static acceptance timestamp: "Oct 19, 2026 • 2:15 PM EST"
• Lines 166, 659, 755: Static procedural slot: "Cath Lab Room 3 • Nov 4, 2026" / "Nov 4, 2026 • 09:30 AM"
• Line 190:      Static cryptographic hash: "7f89b4c09a823...318e"
• Line 262:      Hardcoded patient monogram: "RS"
• Lines 366–446: All 8 step dates, reviewer names, and statuses hardcoded in JSX
• Lines 481, 561, 763: Static referral identifier: "#REF-4491"
• Line 586:      Hardcoded contract version: "v1.0 (Final Approved)"
• Lines 638, 812: Static financing reference: "FIN-TR8921-12M"
• Line 817:      Static SHA token: "SHA256: 7f89b...c438"

====================================================================================================
STAGE 9: Pre-Op Clearance (ClinicalHandoffPage.tsx)
====================================================================================================
• Line 235:      Hardcoded demographic: "45 y/o (Male)"
• Lines 287–300: Digital Authorization Seal: "Oct 19, 2026 • 2:15 PM EST",
                 "FST #{offer.offerId} | v1.0 Final", "Plan #FIN-TR8921-12M"
• Line 326:      Static prompt payment discount: "-$780"
• Lines 389–432: Target procedure specs: "Mount Sinai Hospital", "Cath Lab Suite 3",
                 "Lic #88392", "Hold Slot Active • Suite 3", "Nov 4, 2026 • 09:30 AM EST"
• Lines 451–546: All 7 checklist items statically hardcoded in JSX:
                 - Item 1: "Prompt cash settlement & 0% APR plan underwritten" (COMPLETED)
                 - Item 2: "Signed by {offer.patientName} via Care ID App on Oct 19, 2:15 PM EST" (COMPLETED)
                 - Item 3: "Offer #{offer.offerId} v1.0 Final archived" (RATIFIED)
                 - Item 4: "Lab requisition order pending specimen collection" (REQUIRED)
                 - Item 5: "Scheduled clinical review with NP Elena Rostova on Nov 2, 2026 at 11:00 AM" (PENDING)
                 - Item 6: "Tentative hold Nov 4, 2026 at 09:30 AM awaiting doctor 1-click confirmation" (READY TO BOOK)
                 - Item 7: "Patient spouse Mary Sterling designated and confirmed as day-of transport" (NOTED)
• Lines 564–604: Diagnostic vault files: "Abnormal Stress ECG Report" (Oct 12, 2026, 2.4 MB),
                 "Pre-Cath Echocardiogram", "Signed Financing Contract" (SHA256: 7f89b...318e)
• Lines 741–757: Clearance Rule "#CR-FIN-15 Approved", Plan Reference "FIN-TR8921-12M",
                 Timestamp "Oct 19, 2026 • 2:16:44 PM EST", Token "SHA256: 4a61e9...c712b"

====================================================================================================
STAGE 10: Suite Scheduling (ProcedureSchedulingPage.tsx, mode 'select')
====================================================================================================
• Lines 354, 384–419: Fabricated calendar week: November 2–8, 2026; days: Mon Nov 2 (2 slots),
                      Tue Nov 3 (1 slot), Wed Nov 4 (4 slots, SELECTED), Thu Nov 5 (Full), Fri Nov 6 (3 slots)
• Lines 456–624: All morning and afternoon slots hardcoded:
                 - 08:00 AM (Occupied, Dr. Aris Thorne, CPT #92928)
                 - 09:30 AM (Cath Lab Suite 3, Held, C-Arm Fluoroscopy #3 Ready, Recovery Bay #104 Held,
                   Lock expires in 42:15 min, Matched to Care ID #8472-9901)
                 - 11:15 AM (Cath Lab Suite 2, Available)
                 - 01:30 PM (Cath Lab Suite 3, Available)
                 - 03:15 PM (Cath Lab Suite 1, Clinical Conflict, Anesthesia turnover delay)
                 - 05:00 PM (Cath Lab Suite 2, Maintenance)
• Lines 687–688: Clinical staff: "Lead RN K. Vance", "Scrub Tech J. Morales", "MAC Tier 1 Standby"
• Line 727:      Escort: "Mary Sterling"

====================================================================================================
STAGE 11: Hold Review (ProcedureSchedulingPage.tsx, mode 'review')
====================================================================================================
• Line 509:      Static countdown string: "Lock expires in 42:15 min"
• Line 827:      Static locked slot: "Nov 4, 2026 @ 09:30 AM EST"
• Line 850:      Static suite lock banner: "Cath Lab Suite 3 Locked"
• Line 858:      Static CPT code: "CPT Code #93458"
• Line 870:      Static room spec: "Cath Lab Suite 3 (Interventional Wing, 4th Fl)"
• Line 876:      Static block allocation: "Wed, Nov 4, 2026 • 09:30 AM – 11:00 AM • 90 Mins OR Block Allocation"
• Line 881:      Static arrival window: "07:30 AM EST (2 Hours Prior)"
• Line 888:      Static state license: "State Lic #88392"
• Line 894:      Static team roster: "Lead RN K. Vance + Scrub Tech J. Morales + MAC Tier 1 Standby"
• Line 935:      Static signature notice: "Signed via Mobile App (Oct 19, 2026)"
• Line 958:      Static NPO fasting instructions: "Strict fasting ... beginning at 01:30 AM EST on Nov 4"
• Line 968:      Static medication hold: "Hold Metformin 48 hours prior to contrast dye injection"
• Line 978:      Static escort designation: "Designated escort verified: Mary Sterling (Spouse)"
• Line 1001:     Static readiness gauge: 60%
• Line 1028:     Static lab requisition order: "req #LAB-8821. Draw by Nov 2."
• Line 1035:     Static provider reference: "NP Rostova"
• Line 1052:     Static contact number: "+1 555-***-9182"

====================================================================================================
STAGE 12: Slot Confirmed (ProcedureSchedulingPage.tsx, mode 'confirmed')
====================================================================================================
• Line 1133:     Fabricated appointment identifier: "#PROC-2026-93458"
• Line 1137:     Static confirmed slot: "Wed, Nov 4 • 09:30 AM"
• Line 1141:     Static location: "Mount Sinai • Suite 3"
• Line 1149:     Static locking timestamp: "Oct 19, 2026 • 02:45 PM"
• Lines 1249–1250: Static facility address: "1468 Madison Ave, 3rd Floor Cath Lab Pavilion, New York, NY"
• Line 1265:     Static settlement string: "Total Protected Amount: $4,420.00 • Agreement #FIN-TR8921-12M (0% APR)"
• Line 1295:     Static push dispatch: "Device: iPhone 15 Pro • Token verified • Acknowledged by patient"
• Line 1308:     Static delivery receipt: "Delivery Receipt #SMS-884920"
• Line 1320:     Static beacon announcement: "NFC Check-In Beacon enabled for Mount Sinai Pavilion Entrance"
• Line 1330:     Static escort name: "Mary Sterling (Spouse)"
• Line 1444:     Static cryptographic seal: "SHA256: 4b91f638c502e8f118de00184bba74902b7c7a5128106c820a"
• Line 1447:     Static doctor signature: "Signed: Michael Chang, MD"

====================================================================================================
STAGE 13: Appointment Ledger (AppointmentDetailsPage.tsx)
====================================================================================================
• Line 111:      Hardcoded time: scheduledTime: '09:30 AM – 11:00 AM EST'
• Line 112:      Hardcoded arrival: arrivalWindow: '07:30 AM EST (2 Hours Prior)'
• Line 115:      Hardcoded anesthesia: anesthesiaProtocol: 'MAC Tier 1 Standby ...'
• Line 116:      Hardcoded anesthesia staff: anesthesiaStaff: 'NP / CRNA Standby'
• Line 121:      Hardcoded readiness percentage: readinessPercentage: 60
• Line 264:      Static relative countdown: "UPCOMING • IN 16 DAYS"
• Lines 334–340: Static facility hierarchy: "Cath Lab Suite 3 • Mount Sinai Hospital • Interventional Wing • 3rd Fl (Tower B)"
• Line 360:      Static provider credentials: "NPI #19820491 • Lic #88392-NY"
• Line 380:      Static financing reference: "Ref #FIN-TR8921-12M"
• Line 409:      Static referral link: "Linked to referral #REF-4491 initiated by Dr. Sarah Lin"
• Lines 420–422: Hardcoded clinical equipment: "Fluoroscopy 15fps", "Isovue-370", "Angio-Seal™ VIP"
• Line 465:      Hardcoded fasting order: "Nothing by mouth after 01:30 AM EST on Nov 4, 2026"
• Line 494:      Hardcoded lab order: "Order #LAB-8821 DISPATCHED"
• Line 521:      Hardcoded anesthesia consultation: "CRNA/NP Elena Rostova scheduled for Nov 2, 2026 at 03:00 PM EST"
• Lines 548–592: Mock records in documentation vault ("Stress ECG Full Report", "Pre-Cath Echocardiogram")
• Lines 668–693: Mock dispatch audit records
• Line 730:      Hardcoded FHIR endpoint: "epicx-hls-cath3"

====================================================================================================
STAGE 14: Pre-Op Readiness (PreOpReadinessPage.tsx)
====================================================================================================
• Line 312:      Static scheduled slot: "Scheduled: Wed, Nov 4, 2026 @ 09:30 AM EST"
• Lines 374–376: Static settlement metadata: "$4,420.00 underwritten • Ledger Ref: #REV-2026-88519 • Settled Oct 18, 2026 @ 14:22 EST"
• Line 400:      Static credit assurance ID: "Credit Assurance ID: #CRD-0052-768"
• Line 424:      Static witness notice: "Witnessed by Clinical Navigator Merri Dunn, RN"
• Line 476:      Hardcoded lab target: "INR: 1.1 (Target: <= 1.5)"
• Line 477:      Hardcoded requisition: "Requisition #LAB-8821 dispatched to Mount Sinai Central Lab"
• Lines 485–488: DIRECT LAB RESULT SIMULATION HANDLER:
                 onClick={() => { setLabCleared(!labCleared); triggerToast(labCleared ? 'Lab reset to pending draw.' : 'Simulated lab results received: INR 1.1 (Normal). Gate cleared!'); }}
• Line 515:      Hardcoded diagnostic result: "CLEARED (eGFR 88)"
• Line 521:      Hardcoded BMP order: "Order #BMP-48812-NEPH"
• Line 545:      Hardcoded EKG reading: "EKG Reading #EKG-2412 verified"
• Line 588:      Hardcoded pharmacy allergy flag: "EHR Pharmacy Flag ID: #PHA-ALLERGY-11 • Double-verification Signed by Staff Pharm. R. Nelco"
• Line 612:      Hardcoded medication discontinuation: "Discontinuation Target: Nov 2 @ 09:30 AM"
• Lines 653–656: DIRECT ANESTHESIA CLEARANCE SIMULATION HANDLER:
                 onClick={() => { setAnesthesiaCleared(!anesthesiaCleared); triggerToast(anesthesiaCleared ? 'Anesthesia clearance reset.' : 'Anesthesia evaluation signed off by NP Elena Rostova!'); }}
• Line 696:      Hardcoded resource allocation: "Resource Allocation #STE-SUITE-391 • Team Leads: Lead RN / Ramos"
• Line 720:      Hardcoded escort contact: "Escort: Mary Sterling (+1 555-***-9182)"
• Line 778:      Hardcoded audit trail ID: "Audit Trail ID #AUD-93458-READINESS"

====================================================================================================
STAGE 15: Day-of-Checkin (DayOfCheckinPage.tsx)
====================================================================================================
• Line 138:      Hardcoded workstation: "Cath Lab Station #04"
• Line 181:      Hardcoded date of birth: "DOB: 04/18/1962"
• Line 184:      Hardcoded CID identifier: "ID: CID-9048-28"
• Line 240:      Hardcoded escort waiting location: "Escort: Mary Sterling (Spouse) - Waiting Suite 3B"
• Line 256:      Hardcoded arrival record: "07:28 AM EST • Bay #04 Outpatient Pre-Op"
• Line 269:      Hardcoded status banner: "ARRIVED & CHECKED IN • Scheduled: Today 09:30 AM"
• Line 345:      Static prompt payment discount: "-$780.00 Applied"
• Line 350:      Static net payable: "$4,420.00 (0% APR)"
• Line 372:      Static biometric hash: "0x8892...3E41"
• Line 394:      Static coagulation lab result: "1.1 (Norm)"
• Line 402:      Static creatinine lab result: "0.95 mg/dL"
• Line 424:      Static anesthesia sign-off: "MAC Tier 1 Standby Approved"
• Line 444:      Static NPO fasting status: "NPO since 01:30 AM EST (6h 00m)"
• Line 493:      Static clinical staff: "Lead RN K. Vance & Tech J. Morales scrubbed"
• Line 499:      Static environmental telemetry: "Room 3 Temp: 68.2°F"
• Lines 551–570: Static vital signs: Blood Pressure 128/82 mmHg, Heart Rate 68 BPM, SpO2 99%, Temperature 98.4°F
• Line 578:      Static intraoperative lab: "1.1 INR (Optimal)"
====================================================================================================
```

---

## Section F: Broken Navigation and ID Propagation

### Detailed Forensic Breakdown

#### 1. Over-Reliance on `location.state`
Throughout Stages 6 through 15, page transitions primarily propagate data using React Router's ephemeral `location.state`:
- Stage 6 -> Stage 7: `navigate('/treatment-offers/${offer.offerId}/status', { state: offer })`
- Stage 7 -> Stage 8: `navigate('/treatment-offers/${offer.offerId}/accepted', { state: offer })`
- Stage 8 -> Stage 9: `navigate('/treatment-offers/${offer.offerId}/clearance', { state: offer })`
- Stage 9 -> Stage 10: `navigate('/treatment-offers/${offer.offerId}/schedule', { state: offer })`
- Stage 10 -> Stage 11: `navigate('/treatment-offers/${offer.offerId}/schedule/review', { state: offer })`
- Stage 11 -> Stage 12: `navigate('/treatment-offers/${offer.offerId}/scheduled', { state: offer })`
- Stage 12 -> Stage 13: `navigate('/treatment-offers/${offer.offerId}/appointment', { state: offer })`
- Stage 13 -> Stage 14: `navigate('/treatment-offers/${offer.offerId}/pre-op', { state: offer })`
- Stage 14 -> Stage 15: `navigate('/treatment-offers/${offer.offerId}/check-in', { state: offer })`

#### 2. Loss of Context on Browser Refresh (F5) & Direct Deep Links
When a clinician refreshes the page or bookmarks a deep link:
- `location.state` becomes `null` or `undefined`.
- Components implement a fallback `useEffect` that calls `treatmentOfferService.getTreatmentOffer(id)`.
- While the basic offer DTO is retrieved, **all stage-specific transitional context is lost**:
  - In Stage 10 (`ProcedureSchedulingPage`), refreshing at `/schedule` resets the selected slot to empty, while refreshing at `/schedule/review` falls back to the hardcoded Suite 3 Nov 4 default slot.
  - In Stage 12 (`/scheduled`), refreshing resets the in-memory booking state. The page renders mode `'confirmed'`, but displays static Case `#PROC-2026-93458` with no backend appointment record.
  - In Stage 13 (`/appointment`), the route parameter is the `offerId`, not an `appointmentId`. No appointment record is queried, and the synthesized appointment ledger defaults back to static mock orders.
  - In Stage 14 (`/pre-op`), refreshing immediately resets `labCleared` and `anesthesiaCleared` back to `false`, discarding any sign-offs.
  - In Stage 15 (`/check-in`), the arrival time and vitals never hydrate from an admission record; they are purely hardcoded strings.

#### 3. Bypassed URL Parameter Contracts
The routing architecture binds only `:id` across all 10 stages:
- There is no `:appointmentId` parameter in the route hierarchy for Stages 12, 13, 14, or 15.
- Because `appointmentId` is never reflected in the URL or stored as a relational foreign key on `TreatmentOfferDTO`, deep linking into an appointment requires synthesizing an appointment from the treatment offer.

---

## Section G: Figma Mismatches

Comparison against the 10 authoritative Figma Frames (`1:7538` through `1:13596`):

| Figma Frame ID | Screen Title | Dimensions | Matching Elements | Identified Mismatches / Structural Deviations |
|:---|:---|:---|:---|:---|
| `1:7538` / `1:8548` | Review & Send Treatment Offer | 1280 × 2014 | Patient Capsule, 4-card Review Grid, Mobile Preview Frame, Dispatch CTA | Attestation checkbox defaults to pre-checked `true` (line 105), allowing single-click bypass. Mobile preview is an HTML simulation rather than an isolated iframe. |
| `1:7986` | Offer Status | 1280 × 2167 | Green Hero Banner, 5-Phase Trajectory, Financial Summary, Live Dispatch Monitor | Delivery channels in Dispatch Monitor are static chips rather than live webhooks. Stepper Step 5 is rendered as a clickable bypass button to Stage 8. |
| `1:9001` | Accepted Treatment Offer | 1280 × 2111.9 | Hero Acceptance Banner, 8-Step Lifecycle, Confirmed Financials, Biometric Seal | Patient monogram is hardcoded to "RS" (line 262) regardless of patient name. Monogram should dynamically render initials of `patientName`. |
| `1:9573` | Treatment Cleared to Proceed | 1280 × 3025 | Indigo Banner, 5-Stage Gatekeeper ("Gate 4 of 5"), 7-item Readiness Checklist | Checklist items are static HTML blocks. Component displays "Treatment Cleared (100%)" without validating any actual lab or anesthesia records. |
| `1:10206` | Schedule Clinical Slot | 1280 × 2050 | Week Navigator, Day Selector Pills, Morning/Afternoon Slot Grid, Equipment Specs | 100% of calendar dates (Nov 2–8) and slots are hardcoded arrays. Real facility rooms (`GET /facilities/:id/rooms`) and doctor slots are not queried. |
| `1:10786` | Slot Confirmation & Final Review | 1280 × 2614 | 3-Step Tracker, Slot Locked Banner, Procedural Specs, Financial Snapshot | Hold countdown timer ("42:15 min") is a static string (line 509). Readiness gauge is statically pinned to 60% (line 1001). Escort is hardcoded to Mary Sterling. |
| `1:11274` | Procedure Scheduled Successfully | 1280 × 2393 | Deep Purple Hero Banner, 6-Phase Stepper, Confirmed Record, Dispatch Receipts | Case `#PROC-2026-93458` is fabricated in JSX (line 1133). SHA-256 seal is a static string (line 1444). Direct URL navigation displays confirmation for any ID. |
| `1:11774` | Scheduled Procedure & Appointment Details | 1280 × 2360.75 | Metric Ribbon, Clinical Indication Card, Preparation Orders, Documentation Vault | Disconnected from backend appointment API. Synthesizes an appointment from offer metadata. Reschedule and cancel buttons trigger dummy toasts. |
| `1:12355` | Pre-Procedure Readiness Checklist | 1280 × 3369 | 11-Gate Readiness Grid, Category 1–4 Panels, Progress Gauge, Sign-Off Bar | Contains explicit simulation buttons that fabricate lab results (`INR 1.1 (Normal)`) and anesthesia clearance (`NP Elena Rostova`). Zero backend persistence. |
| `1:13596` | Day-of-Procedure Check-In | 1280 × 1746.5 | Cath Lab Bar, Patient Arrival Hero, Readiness Matrix, Baseline Triage Vitals | Arrival timestamp ("07:28 AM EST"), Bay #04, and baseline vitals (BP 128/82, HR 68, SpO2 99%) are static text blocks. No check-in mutation is dispatched. |

---

## Section H: Required Implementation Order

To remediate all identified architectural flaws, missing contracts, and invariant violations, engineering work must proceed in five strict sequential phases:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Backend REST Contract Delivery (Postman Folders Update)        │
│ • Pre-Op Clearance API (Stage 9)                                        │
│ • Suite Hold & Reservation API (Stage 11)                               │
│ • Pre-Op Readiness Gate API (Stage 14)                                  │
│ • Dedicated Patient Check-In API (Stage 15)                             │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Frontend Data Models & Service Layer Wiring                    │
│ • Define TypeScript DTOs for Clearance, Holds, Readiness, and Check-In  │
│ • Wire treatmentOfferService to real appointment APIs in Folder 10      │
│ • Pass authentic expectedVersion on all mutation requests               │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Lifecycle State Machine & Guard Implementation                 │
│ • Enforce strict status checking before stage progression               │
│ • Build real-time polling engine / WebSocket listener in Stage 7        │
│ • Fix fail-forward catch blocks in Stage 6                              │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: UI Hydration, Deep Linking & Simulation Elimination            │
│ • Bind Stage 10 calendar to GET /facilities/:id/rooms & /slots          │
│ • Replace Stage 12/13 synthesized objects with real AppointmentDTOs     │
│ • Remove simulation buttons in Stage 14; bind to real lab records       │
│ • Connect Stage 15 triage vitals to check-in mutation endpoints         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: End-to-End Verification & Quality Gates                        │
│ • Verify F5 refresh hydration across all 10 stages                      │
│ • Run full type-check, lint, and build verification                     │
│ • Execute e2e consultation trajectory test suite                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Detailed Phasing Breakdown

#### Phase 1: Backend REST Contract Delivery (Backend Prerequisites)
1. **Deliver Stage 9 Clearance APIs:** `POST /api/v1/treatment-offers/:id/clearance` and `GET /api/v1/treatment-offers/:id/clearance`.
2. **Deliver Stage 11 Hold APIs:** `POST /api/v1/facilities/:facilityId/rooms/:roomId/holds` and `DELETE /api/v1/facilities/:facilityId/rooms/:roomId/holds/:holdId`.
3. **Deliver Stage 14 Readiness APIs:** `GET /api/v1/treatment-offers/:id/pre-op-readiness` and `POST /api/v1/treatment-offers/:id/pre-op-readiness/sign-off`.
4. **Deliver Stage 15 Check-In API:** `POST /api/v1/appointments/:id/checkin`.
5. **Update Postman Collection:** Commit updated staging collection with sample payloads and 200/201 schemas.

#### Phase 2: Frontend Data Models & Service Layer Wiring
1. **Create TypeScript DTOs:** In `src/types/` and `src/pages/treatment-offers/types.ts`, declare authentic interfaces matching Phase 1 backend contracts.
2. **Wire Appointment Persistence (Stage 10 -> Stage 12):** Create `appointmentService.createAppointment()` invoking `POST /api/v1/appointments`.
3. **Wire Appointment Retrieval (Stage 13):** Update `appointmentService.getAppointment(id)` invoking `GET /api/v1/appointments/:id`.
4. **Fix Concurrency Versioning:** Ensure `dispatchTreatmentOffer` and `cancelTreatmentOffer` receive the current `version` from the retrieved `TreatmentOfferDTO`.

#### Phase 3: Lifecycle State Machine & Guard Implementation
1. **Remediate Fail-Forward in Stage 6:** Remove `navigate()` from the error `catch` block in `TreatmentOfferReviewPage.tsx`. Halt on error and show an inline alert.
2. **Build Stage 7 Polling Engine:** Implement `useInterval` polling in `TreatmentOfferStatusPage.tsx` to detect `status === 'RATIFIED_ACCEPTED'`.
3. **Enforce Route Guards:** In `TreatmentOfferAcceptedPage.tsx`, verify `offer.status === 'RATIFIED_ACCEPTED'`. If unratified, show an unauthorized access banner.
4. **Enforce Clearance Gate:** In `ProcedureSchedulingPage.tsx`, disallow slot selection if clinical clearance has not passed.

#### Phase 4: UI Hydration, Deep Linking & Simulation Elimination
1. **Connect Stage 10 Availability:** Query `GET /api/v1/facilities/:id/rooms` and `GET /api/v1/doctors/:id/slots`. Replace the hardcoded Nov 2–8 week with authentic availability.
2. **Eliminate Stage 14 Simulation Handlers:** Remove lines 485–488 and 653–656 in `PreOpReadinessPage.tsx`. Bind checklist cards to real lab orders and anesthesia consultations.
3. **Connect Stage 15 Check-In:** Connect the check-in button to `POST /api/v1/appointments/:id/checkin`. Hydrate triage vitals dynamically.
4. **Deep Link Hydration:** Ensure every stage fully hydrates its required entities on F5 refresh.

#### Phase 5: End-to-End Verification & Quality Gates
1. Run `npm run type-check`, `npm run lint`, and `npm run build` to confirm zero regressions.
2. Execute `npm run test:consultations` against the live staging environment to verify that all trajectory transitions pass.

---

## Section I: Static Analysis Verification Results

### 1. Static Verification Command Outputs

#### Command 1: TypeScript Type Check
- **Command:** `npm run type-check` (`tsc -b --noEmit`)
- **Execution Working Directory:** `d:\New folder\New folder\doctor web\doctor-web-frontend-main`
- **Exit Code:** `0`
- **Output:**
  ```
  > doctor-web-frontend@0.1.0 type-check
  > tsc -b --noEmit
  ```
- **Finding:** Clean compilation across all TypeScript project references. Zero type errors.

#### Command 2: ESLint Code Quality Check
- **Command:** `npm run lint` (`eslint .`)
- **Execution Working Directory:** `d:\New folder\New folder\doctor web\doctor-web-frontend-main`
- **Exit Code:** `0`
- **Output:**
  ```
  > doctor-web-frontend@0.1.0 lint
  > eslint .
  ```
- **Finding:** Zero ESLint errors, zero warnings.

#### Command 3: Vite Production Build
- **Command:** `npm run build` (`tsc -b && vite build`)
- **Execution Working Directory:** `d:\New folder\New folder\doctor web\doctor-web-frontend-main`
- **Exit Code:** `0`
- **Build Duration:** `7.08s`
- **Output:**
  ```
  vite v6.4.5 building for production...
  transforming...
  ✓ 1673 modules transformed.
  rendering chunks...
  computing gzip size...
  dist/index.html                                      0.94 kB │ gzip:   0.54 kB
  dist/assets/patient-avatar-hero-Bl82rVt4.png         5.53 kB
  dist/assets/careid-card-logo-Bjm3fhnY.png           19.04 kB
  dist/assets/scanned-lab-report-DXtgyO6y.png         21.86 kB
  dist/assets/cath-lab-fluoroscopy-DptCxNGo.png       35.93 kB
  dist/assets/careid-security-shield-BMneS90f.png    133.68 kB
  dist/assets/careid-logo-CHIgI4ME.png               285.04 kB
  dist/assets/careid-auth-logo-C790OuH6.png          516.53 kB
  dist/assets/careid-cloud-mark-Bqgtf55b.png         954.92 kB
  dist/assets/index-C7s3Y_td.css                     107.31 kB │ gzip:  16.77 kB
  dist/assets/index-Cm09t7Eh.js                    1,307.65 kB │ gzip: 275.79 kB
  ✓ built in 7.08s
  ```
- **Finding:** Production packaging completes successfully.

#### Command 4: Consultations & Trajectory Test Suite
- **Command:** `npm run test:consultations` (`node --experimental-strip-types tests/e2e/consultations/runner.ts`)
- **Exit Code:** `0`
- **Output Summary:**
  ```
  Total Suites: 43
  Total Tests:  189
  Passed:       189 (100.0%)
  Failed:       0
  Duration:     290.87s
  Live Backend: https://360api.vnvision.in/api/v1
  ```
- **Finding:** The consultation test suite verifies trajectory navigation and asserts that Stages 9, 11, 14, and 16 are documented as `NOT_IMPLEMENTED` on the backend.

---

### 2. Workspace & Repository Integrity Attestation

1. **Git Repository Status:**
   - Command: `git status`
   - Output: `fatal: not a git repository (or any of the parent directories): .git`
   - Finding: The working directory `doctor-web-frontend-main` is an extracted archive release and does not contain a `.git` database.
2. **File Modification & Baseline Integrity:**
   - File timestamps across `src/` were audited. The newest source file prior to the audit was `src/pages/patients/PatientProfilePage.tsx` (timestamp `09-11-2026 22:20:19`).
   - Stages 1 through 5 files (`TreatmentOfferCreatePage.tsx`, timestamp `09-11-2026 22:12:32`) were untouched during this audit session.
   - **ZERO source code files, ZERO configuration files, and ZERO UI components were modified during this audit session.**
   - The only file written to the project workspace is this authoritative forensic report (`analysis_reports/stages_6_15_forensic_audit.md`).
   - All agent state data was strictly confined to `.agents/teamwork/`.

---

## Conclusion

This forensic audit confirms that while the CareID Doctor Web Portal achieves high visual fidelity to Figma designs and passes all static TypeScript and ESLint verification gates, it currently operates with critical architectural, persistence, and contract deficiencies across Stages 6 through 15:
- **Stages 6, 7, and 13** are **Partially Implemented**, requiring version concurrency fixes, polling listeners, and real appointment API wiring.
- **Stages 8, 10, and 12** are **Mock / Non-Functional due to API Bypass**, requiring integration with existing Postman endpoints and strict lifecycle verification.
- **Stages 9, 11, 14, and 15** are **Mock / Non-Functional due to Missing Backend APIs**, requiring the backend engineering team to implement new REST endpoints for clinical clearance, procedural suite holds, pre-operative readiness checklists, and patient check-in admissions.
- **Stage 14** contains explicit simulation handlers that fabricate clinical lab results and anesthesia clearance in direct violation of clinical safety invariants.

Following the phased implementation roadmap in Section H will systematically transform this high-fidelity UI prototype into a production-grade clinical workstation.
