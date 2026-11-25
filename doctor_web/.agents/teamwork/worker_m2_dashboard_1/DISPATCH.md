# Dispatch for worker_m2_dashboard_1

## Task Objective
Implement Milestone 2: Module A — Consultations & 18-Stage Trajectory (`/treatment-offers`) and associated trajectory sub-pages. Remove all mock/hardcoded data while strictly preserving the UI pixel-for-pixel.

## MANDATORY INTEGRITY WARNING
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A teamwork_auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

## Write Ownership (Exclusive)
You have exclusive write ownership of these files only:
1. `src/pages/treatment-offers/TreatmentOffersDashboardPage.tsx`
2. `src/pages/treatment-offers/AppointmentDetailsPage.tsx`
3. `src/pages/treatment-offers/PreOpReadinessPage.tsx`
4. `src/pages/treatment-offers/ProcedureSchedulingPage.tsx`
5. `src/pages/treatment-offers/ClinicalHandoffPage.tsx`
6. `src/pages/treatment-offers/DayOfCheckinPage.tsx`

DO NOT modify files outside this list.

## Inputs & Architectural Blueprints
Read the handoff reports from the 3 Milestone 2 Explorers:
- `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m2_dashboard_1\handoff.md`
- `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m2_trajectory_1\handoff.md`
- `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m2_actions_1\handoff.md`
- `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md`
- `d:\New folder\New folder\doctor web\doctor-web-frontend-main\PROJECT.md`

## Detailed Implementation Directives

### 1. `TreatmentOffersDashboardPage.tsx`
- **Dashboard Metrics**:
  - Bind `const stats = useMemo(() => consultationService.calculateMetrics(consultations), [consultations]);`.
  - Import `ConsultationMetrics` from `@/services/consultationService`.
  - Ensure zero static numbers. Render `—` while `isLoading`.
- **18-Stage Clinical & Financing Trajectory**:
  - Replace hardcoded `TR-8921` in `lifecycleStages` (lines 86-105).
  - Implement dynamic offer ID resolution:
    - Check URL query parameter `?offerId=...`
    - Or selected consultation in state
    - Or first active offer from backend (`consultations.find(c => Boolean(c.offerId))?.offerId`)
  - Stage navigation:
    - For stages 1-5 (Offer creation steps): Navigate to `/treatment-offers/new/step-1` through `step-5` (with `patientId` if known).
    - For stages 6-18: If active offer ID exists, navigate to `/treatment-offers/${activeOfferId}/${subpath}`; if none exists, guide user (e.g. toast or scroll to consultation list) to select a consultation first rather than navigating to dummy `TR-8921`.
    - Document Stages 9, 11, 14, 16 as NOT IMPLEMENTED without simulated progression.
- **Consultation Listing, Filters & Search**:
  - Filter tabs: `'accepted'` tab must include:
    `c.offerStatus === 'ACCEPTED' || c.offerStatus === 'RATIFIED_ACCEPTED' || c.offerStatus === 'PROCEDURE_READY'`
  - Search query: case-insensitive safe null checking on `patientName`, `patientMrn`, `procedureName`, `cptCode`, `facilityName`, `title`.
  - Manual refresh: add `disabled={isLoading}` debounce protection to the refresh button.
  - Action CTAs:
    - "Create Offer": Remove mock fallbacks (`'CPT #93458'`, `'Left Heart Catheterization with Coronary Angiogram'`). Pass authentic patient context and append `?patientId=${item.patientProfileId}` for refresh persistence.
    - "Proceed Lifecycle": Remove `'TR-8921'`. Route dynamically based on `offerStatus` (`DRAFT` -> `/review`, `ACCEPTED`/`RATIFIED_ACCEPTED` -> `/accepted`, other -> `/status`; if no offer -> Step 1).
    - Card appointment time: Remove `'10:00 AM'` fake fallback. Render authentic `item.appointmentTime` only if present.
  - Status badges: Add `'CANCELLED'` badge styling (`bg-rose-50 text-rose-700 border border-rose-200`).

### 2. Trajectory Sub-Pages Hydration & Mock Removal
In all 5 sub-pages (`AppointmentDetailsPage.tsx`, `PreOpReadinessPage.tsx`, `ProcedureSchedulingPage.tsx`, `ClinicalHandoffPage.tsx`, `DayOfCheckinPage.tsx`):
- Extract route param `const { id } = useParams<{ id: string }>()`.
- Hydrate offer/appointment from `location.state` OR async fetch from `treatmentOfferService.getTreatmentOffer(id)` or `consultationService.listConsultations()`.
- Completely eradicate imports and usages of `DEFAULT_OFFER_STATE` and `DEFAULT_APPOINTMENT_RECORD`.
- In `PreOpReadinessPage.tsx`: Completely remove the fake simulation function `handleSimulateAllCleared` ("Simulate Lab & Anesthesia Clearances") and its fake button trigger.
- In `DayOfCheckinPage.tsx`: Fix hardcoded `/patients/8472-9901` link to use the dynamic patient ID.

### 3. Strict UI Preservation
Preserve all visual styling, layout, Tailwind classes, colors, icons, spacing, typography, and card dimensions pixel-for-pixel.

## Quality Gates & Verification Requirements
Before delivering handoff, Worker must run and verify:
1. `npm run type-check` — Must exit with 0 errors.
2. `npx eslint src` (or `npm run lint`) — Must exit with 0 errors/warnings on modified files.
3. `npm run build` — Must produce clean production build without errors.
4. `node --experimental-strip-types tests/e2e/consultations/runner.ts --tier=1` — Must pass 100% of tests.

## Deliverables
Write a 5-component handoff report to:
`d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\worker_m2_dashboard_1\handoff.md`
containing Observation, Logic Chain, Caveats, Conclusion, and Verification Method.
When finished, send a message to the orchestrator.


## 2026-11-09T13:11:44Z
From: 53af432e-22d9-4708-98b8-a589bf7d3f85
Content:
You are worker_m2_dashboard_1. Your task is to implement Milestone 2 (Module A: Dashboard, 18-stage Trajectory, and sub-pages).
Read your detailed instructions and blueprints in:
- d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\worker_m2_dashboard_1\DISPATCH.md
- d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m2_dashboard_1\handoff.md
- d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m2_trajectory_1\handoff.md
- d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m2_actions_1\handoff.md
- d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md
- d:\New folder\New folder\doctor web\doctor-web-frontend-main\PROJECT.md
