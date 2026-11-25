# Milestone 2 Investigation Report: 18-Stage Clinical & Financing Trajectory & Sub-Pages

**Investigator**: `explorer_m2_trajectory_1`  
**Target Milestone**: Milestone 2 (Module A: 18-Stage Trajectory & Sub-Pages)  
**Workspace**: `d:\New folder\New folder\doctor web\doctor-web-frontend-main`  
**Date**: 2026-11-09T13:10:00Z  

---

## 1. Observation

### 1.1 Direct Inspection of `TreatmentOffersDashboardPage.tsx`
- **File Path**: `src/pages/treatment-offers/TreatmentOffersDashboardPage.tsx`
- **Hardcoded `TR-8921` in Stage Definitions (Lines 86–105)**:
  ```typescript
  const lifecycleStages = [
    { num: 1, name: 'CPT Selection', path: '/treatment-offers/new/step-1' },
    { num: 2, name: 'Pricing & Discount', path: '/treatment-offers/new/step-2' },
    { num: 3, name: 'Financing Package', path: '/treatment-offers/new/step-3' },
    { num: 4, name: 'Terms & Remarks', path: '/treatment-offers/new/step-4' },
    { num: 5, name: 'Attestation', path: '/treatment-offers/new/step-5' },
    { num: 6, name: 'Clinical Review', path: '/treatment-offers/TR-8921/review' },
    { num: 7, name: 'Dispatched Status', path: '/treatment-offers/TR-8921/status' },
    { num: 8, name: 'Offer Accepted', path: '/treatment-offers/TR-8921/accepted' },
    { num: 9, name: 'Pre-Op Clearance', path: '/treatment-offers/TR-8921/clearance' },
    { num: 10, name: 'Suite Scheduling', path: '/treatment-offers/TR-8921/schedule' },
    { num: 11, name: 'Hold Review', path: '/treatment-offers/TR-8921/schedule/review' },
    { num: 12, name: 'Slot Confirmed', path: '/treatment-offers/TR-8921/scheduled' },
    { num: 13, name: 'Appointment Ledger', path: '/treatment-offers/TR-8921/appointment' },
    { num: 14, name: 'Pre-Op Readiness', path: '/treatment-offers/TR-8921/pre-op' },
    { num: 15, name: 'Day-of-Checkin', path: '/treatment-offers/TR-8921/check-in' },
    { num: 16, name: 'Cath Lab Safety', path: '/treatment-offers/TR-8921/cath-lab-safety' },
    { num: 17, name: 'Encounter Induction', path: '/treatment-offers/TR-8921/encounter' },
    { num: 18, name: 'Active Documentation', path: '/treatment-offers/TR-8921/in-progress' },
  ];
  ```
  Every single stage from Stage 6 through Stage 18 explicitly hardcodes `TR-8921` in its path string.
- **Hardcoded Fallback in "Proceed Lifecycle" Row Action (Lines 428–439)**:
  ```typescript
  onClick={() =>
    navigate(`/treatment-offers/${item.offerId || 'TR-8921'}/accepted`, {
      state: {
        offerId: item.offerId || 'TR-8921',
        patientId: item.patientProfileId,
        patientName: item.patientName,
        patientCid: item.patientMrn,
        procedureName: item.procedureName || 'Left Heart Catheterization with Coronary Angiogram',
        facility: item.facilityName,
        attendingDoctor: user.fullName || 'Attending Physician',
      },
    })
  }
  ```
  When `item.offerId` is undefined (e.g. initial consultation before an offer is created), it falls back to the dummy `'TR-8921'`.

### 1.2 Direct Inspection of Trajectory Sub-Pages

#### 1. `src/pages/treatment-offers/AppointmentDetailsPage.tsx`
- **Imports & State Binding (Lines 26–36)**:
  ```typescript
  import { TreatmentOfferState, DEFAULT_OFFER_STATE, DEFAULT_APPOINTMENT_RECORD } from './types';

  export const AppointmentDetailsPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // Load offer state from navigation payload or default fallback
    const offer = (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE;
    const appointment = DEFAULT_APPOINTMENT_RECORD;
  ```
- **Observations**:
  1. The page does NOT call `useParams<{ id: string }>()`, even though the route in `src/routes/index.tsx` is defined as `/treatment-offers/:id/appointment`.
  2. On page refresh (F5), `location.state` is lost, causing the component to silently render `DEFAULT_OFFER_STATE` with fake patient "Patient Record" and ID `TR-8921`.
  3. `const appointment = DEFAULT_APPOINTMENT_RECORD` completely hardcodes the appointment data (`#PROC-2026-93458`).
  4. Line 293 hardcodes reference `Ref #FIN-TR8921-12M`.

#### 2. `src/pages/treatment-offers/PreOpReadinessPage.tsx`
- **Imports & State Binding (Lines 20–30)**:
  ```typescript
  import { TreatmentOfferState, DEFAULT_OFFER_STATE, DEFAULT_APPOINTMENT_RECORD } from './types';

  export const PreOpReadinessPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // Load offer state from navigation payload or default fallback
    const offer = (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE;
    const appointment = DEFAULT_APPOINTMENT_RECORD;
  ```
- **Simulated Progression Violation (Lines 64–76, 676–685)**:
  ```typescript
  const handleSimulateAllCleared = () => {
    setLabCleared(true);
    setAnesthesiaCleared(true);
    triggerToast('All remaining clinical gates ratified! Gatekeeper unlocked.');
  };
  ```
  ```tsx
  {!isFullyCleared && (
    <button
      type="button"
      onClick={handleSimulateAllCleared}
      className="border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#3f1d8b] text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
    >
      Simulate Lab & Anesthesia Clearances
    </button>
  )}
  ```
- **Observations**:
  1. The page uses fake simulated state changes (`handleSimulateAllCleared`) violating R1 and R4 ("remove all simulated lifecycle transitions").
  2. Does not call `useParams<{ id: string }>()`, relying on `location.state` and falling back to `DEFAULT_OFFER_STATE`.

#### 3. `src/pages/treatment-offers/ProcedureSchedulingPage.tsx`
- **Imports & State Binding (Lines 28–41)**:
  ```typescript
  import { TreatmentOfferState, DEFAULT_OFFER_STATE } from './types';
  ...
  export const ProcedureSchedulingPage: React.FC<ProcedureSchedulingPageProps> = ({ initialMode }) => {
    ...
    const offer = (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE;
  ```
- **Hardcoded Identifiers (Line 94)**:
  ```typescript
  triggerToast('Procedure #PROC-2026-93458 locked into Cath Lab Suite 3.');
  ```
- **Observations**:
  1. Lacks `useParams<{ id: string }>()`.
  2. Falls back to `DEFAULT_OFFER_STATE` on refresh.
  3. Hardcodes `#PROC-2026-93458` in toast.

#### 4. `src/pages/treatment-offers/ClinicalHandoffPage.tsx`
- **Imports & State Binding (Lines 21–30)**:
  ```typescript
  import { TreatmentOfferState, DEFAULT_OFFER_STATE } from './types';
  ...
  export const ClinicalHandoffPage: React.FC = () => {
    ...
    const offer = (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE;
  ```
- **Hardcoded Strings (Lines 234, 682)**:
  ```tsx
  Plan #FIN-TR8921-12M
  ...
  FIN-TR8921-12M ({offer.totalPayable})
  ```
- **Observations**:
  1. Lacks `useParams<{ id: string }>()`.
  2. Falls back to `DEFAULT_OFFER_STATE` on refresh.

#### 5. `src/pages/treatment-offers/DayOfCheckinPage.tsx`
- **Imports & State Binding (Lines 23–32)**:
  ```typescript
  import { TreatmentOfferState, DEFAULT_OFFER_STATE } from './types';
  ...
  export const DayOfCheckinPage: React.FC = () => {
    ...
    const offer = (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE;
  ```
- **Hardcoded Patient ID Navigation (Line 592)**:
  ```tsx
  <button
    type="button"
    onClick={() => navigate('/patients/8472-9901')}
    className="..."
  >
  ```
  Navigates to `/patients/8472-9901` instead of `/patients/${offer.patientId}`.
- **Hardcoded Demographics & Ref Strings (Lines 117, 120, 277)**:
  - Line 117: `(DOB: 04/18/1962)`
  - Line 120: `ID: CID-9048-28`
  - Line 277: `Ref #FIN-TR8921-12M`

### 1.3 Postman API Collection Audit (`CareID-Staging.postman_collection.json`)
A complete scan of the Postman collection against trajectory terminology returned:
- `pre-op`: 0 matches
- `preop`: 0 matches
- `clearance`: 0 matches
- `check-in` / `checkin`: 0 matches
- `induction`: 0 matches
- `cath-lab`: Only found in doctor profile free-text strings (`"Expertise in cardiac catheterization"`).
- `Appointments`: Documented under `10. Appointments, Schedules & Shifts`:
  - `GET /api/v1/appointments/doctor/me` (Doctor appointments)
  - `GET /api/v1/appointments/:id` (Appointment details by ID)
  - `PUT /api/v1/appointments/:id/status` (Update appointment status to `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW`)
- `Doctor Treatment Offers`: Documented under `05. Doctor Portal`:
  - `POST /api/v1/doctors/treatment-offers` (Create draft proposal)
  - `GET /api/v1/doctors/treatment-offers` (List authored proposals)
  - `GET /api/v1/doctors/treatment-offers/:id` (Get offer details)
  - `PUT /api/v1/doctors/treatment-offers/:id` (Update draft)
  - `POST /api/v1/doctors/treatment-offers/:id/dispatch` (Dispatch to patient)
  - `GET /api/v1/doctors/treatment-offers/:id/status` (Inspect lifecycle status)
  - `POST /api/v1/doctors/treatment-offers/:id/cancel` (Cancel proposal)
- `Patient Ratification`: Documented under `06. Patient App`:
  - `POST /api/v1/patients/treatment-offers/:id/accept` (Patient ratifies/accepts offer)
  - `POST /api/v1/patients/treatment-offers/:id/reject` (Patient declines offer)

### 1.4 E2E Test Suite Verification
- Running `node --experimental-strip-types tests/e2e/consultations/runner.ts --tier=1`:
  - 14 suites, 71 test cases executed.
  - **71 / 71 passed (100.0%)** in 89.49s.
  - Validates `TC-F05-01` through `TC-F05-05` in `feature05_trajectory_18_stage_navigation.test.ts`.
- Running `node --experimental-strip-types tests/e2e/consultations/runner.ts --tier=2`:
  - 14 suites, 70 test cases executed.
  - **70 / 70 passed (100.0%)** in 87.11s.
  - Validates boundary edge cases in `boundary05_trajectory_navigation_edges.test.ts`.

---

## 2. Logic Chain

### 2.1 The Dynamic Offer ID Resolution Strategy
1. **Premise**: In `TreatmentOffersDashboardPage.tsx`, stages 6 through 18 navigate to routes like `/treatment-offers/TR-8921/review`. The string `'TR-8921'` is hardcoded because when the stepper was initially mocked, there was no active offer entity wired up.
2. **Dynamic Context Resolution**:
   - The dashboard retrieves consultations via `consultationService.listConsultations()`, where each consultation item contains authentic `patientProfileId`, `appointmentId`, and `offerId` (if authored).
   - The active offer ID should be resolved hierarchically:
     - **Level 1 (Direct Query Parameter)**: Read `const [searchParams] = useSearchParams();` -> `searchParams.get('offerId')`.
     - **Level 2 (User-Selected Row)**: When a clinician clicks on a consultation card/row in the listing table, set `selectedOfferId = item.offerId` in component state.
     - **Level 3 (First Active Offer in Dataset)**: Default to `consultations.find(c => Boolean(c.offerId))?.offerId || null`.
3. **Stepper Action Behavior**:
   - When a stage button is clicked:
     - If `stage.num <= 5`: navigate to `/treatment-offers/new/step-${stage.num}` (creating a new offer).
     - If `stage.num >= 6`:
       - If `activeOfferId` exists: navigate to `/treatment-offers/${activeOfferId}/${stageRouteSuffix}` passing the active consultation/offer context in `location.state`.
       - If `activeOfferId` is null (no offers exist in doctor's roster): do NOT navigate to a dummy ID. Instead, display an informative toast/modal: *"No active treatment offer found. Please select an existing consultation or click 'New Consultation / Treatment Offer' to begin."*
4. **Consultation Listing Row Actions**:
   - In `TreatmentOffersDashboardPage.tsx` line 429:
     - If `item.offerId` exists: navigate to `/treatment-offers/${item.offerId}/accepted` with the live consultation state.
     - If `item.offerId` does NOT exist: navigate to `/treatment-offers/new/step-1` pre-populating patient demographics (`patientId`, `patientName`, `patientMrn`, `cptCode`), allowing the doctor to create the treatment offer.

### 2.2 18-Stage Trajectory Pipeline Status & Backend Mapping Matrix

Based on Postman collection analysis and project specifications, the 18 stages map as follows:

| Stage # | Stage Name | Route Path | Component | Backend Endpoint | Status / Behavior |
|:---:|:---|:---|:---|:---|:---|
| **1** | CPT Selection | `/treatment-offers/new/step-1` | `TreatmentOfferCreatePage` | `GET /api/v1/doctors/patients/:id` | **GENUINE**. Form step 1 for CPT and patient selection. |
| **2** | Pricing & Discount | `/treatment-offers/new/step-2` | `TreatmentOfferCreatePage` | Calculated in frontend / validated in `POST /doctors/treatment-offers` | **GENUINE**. Form step 2 for pricing and discount logic. |
| **3** | Financing Package | `/treatment-offers/new/step-3` | `TreatmentOfferCreatePage` | `GET /api/v1/financing/options` | **GENUINE**. Form step 3 for partner financing packages. |
| **4** | Terms & Remarks | `/treatment-offers/new/step-4` | `TreatmentOfferCreatePage` | Payload fields for `POST /doctors/treatment-offers` | **GENUINE**. Form step 4 for clinical notes and expiration. |
| **5** | Attestation | `/treatment-offers/new/step-5` | `TreatmentOfferCreatePage` | `POST /api/v1/doctors/treatment-offers` | **GENUINE**. Submits draft proposal to backend. |
| **6** | Clinical Review | `/treatment-offers/:id/review` | `TreatmentOfferReviewPage` | `GET .../:id`, `POST .../:id/dispatch` | **GENUINE**. Review draft; dispatch to patient. |
| **7** | Dispatched Status | `/treatment-offers/:id/status` | `TreatmentOfferStatusPage` | `GET .../:id/status` | **GENUINE**. Live status tracking. |
| **8** | Offer Accepted | `/treatment-offers/:id/accepted` | `TreatmentOfferAcceptedPage` | `POST /patients/treatment-offers/:id/accept`, `GET .../:id` | **GENUINE**. Ratified offer details. |
| **9** | Pre-Op Clearance | `/treatment-offers/:id/clearance` | `ClinicalHandoffPage` | *None* | **NOT IMPLEMENTED** per R1. UI displays authentic patient/offer context; actions labeled as governance review pending without simulated mutation. |
| **10** | Suite Scheduling | `/treatment-offers/:id/schedule` | `ProcedureSchedulingPage (select)` | `GET /api/v1/schedules/:id/slots`, `GET /api/v1/appointments` | **GENUINE**. Cath lab suite schedule viewing. |
| **11** | Hold Review | `/treatment-offers/:id/schedule/review` | `ProcedureSchedulingPage (review)` | *None* | **NOT IMPLEMENTED** per R1. Temporary procedure slot hold engine does not exist in backend. |
| **12** | Slot Confirmed | `/treatment-offers/:id/scheduled` | `ProcedureSchedulingPage (confirmed)` | `POST /api/v1/appointments`, `PUT .../:id/status` | **GENUINE**. Confirms booking via appointment status. |
| **13** | Appointment Ledger | `/treatment-offers/:id/appointment` | `AppointmentDetailsPage` | `GET /api/v1/appointments/:id` | **GENUINE**. Full appointment record ledger. |
| **14** | Pre-Op Readiness | `/treatment-offers/:id/pre-op` | `PreOpReadinessPage` | *None* | **NOT IMPLEMENTED** per R1. 11 surgical clearance gates do not have backend API. Remove `handleSimulateAllCleared`. |
| **15** | Day-of-Checkin | `/treatment-offers/:id/check-in` | `DayOfCheckinPage` | `PUT /api/v1/appointments/:id/status` | **GENUINE**. Transitions appointment status to `IN_PROGRESS` / `ARRIVED`. |
| **16** | Cath Lab Safety | `/treatment-offers/:id/cath-lab-safety` | `CathLabSafetyCheckinPage` | *None* | **NOT IMPLEMENTED** per R1. Surgical safety checklist sign-off API missing from backend. |
| **17** | Encounter Induction | `/treatment-offers/:id/encounter` | `StartClinicalEncounterPage` | `POST /api/v1/doctors/patients/:id/encounters` | **GENUINE**. Documented clinical encounter creation. |
| **18** | Active Procedure | `/treatment-offers/:id/in-progress` | `ActiveProcedureDocumentationPage` | `POST /api/v1/doctors/patients/:id/medical-records` | **GENUINE**. Clinical encounter and notes documentation. |

### 2.3 Eradication of `DEFAULT_OFFER_STATE` and `DEFAULT_APPOINTMENT_RECORD`

#### Standard Pattern for Sub-Pages
Currently, all 5 sub-pages (`AppointmentDetailsPage`, `PreOpReadinessPage`, `ProcedureSchedulingPage`, `ClinicalHandoffPage`, `DayOfCheckinPage`) use:
```typescript
const offer = (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE;
const appointment = DEFAULT_APPOINTMENT_RECORD;
```
This causes:
1. Complete loss of data on page refresh (F5).
2. Permanent presence of hardcoded mock defaults in production code.
3. Inability to deep-link to any specific offer/appointment.

#### Proposed Clean Architecture for Sub-Pages
Replace this pattern in each sub-page with the following structure:
```typescript
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { treatmentOfferService, TreatmentOfferDTO } from '@/services/treatmentOfferService';
import { consultationService, ConsultationItem } from '@/services/consultationService';

export const AppointmentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // 1. Initialize from location.state if passed during in-app navigation
  const incomingOffer = location.state as TreatmentOfferDTO | undefined;
  const [offer, setOffer] = useState<TreatmentOfferDTO | null>(incomingOffer || null);
  const [consultation, setConsultation] = useState<ConsultationItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!incomingOffer);
  const [error, setError] = useState<string | null>(null);

  // 2. Hydrate from live backend when ID is present in URL
  useEffect(() => {
    if (!id) {
      setError('No treatment offer ID provided in route.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch authentic offer from backend
        const liveOffer = await treatmentOfferService.getTreatmentOffer(id!);
        if (isMounted) setOffer(liveOffer);

        // Fetch matching appointment/consultation if exists
        const allConsultations = await consultationService.listConsultations();
        const match = allConsultations.find(
          (c) => c.offerId === id || c.id === id || (liveOffer.encounterId && c.appointmentId === liveOffer.encounterId)
        );
        if (isMounted && match) setConsultation(match);
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to load treatment offer details.';
          setError(msg);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [id]);

  // 3. Render authentic Loading / Error / Empty states
  if (isLoading) {
    return <LoadingStateSkeleton />;
  }

  if (error || !offer) {
    return (
      <ErrorStateAlert
        title="Treatment Offer Not Found"
        message={error || 'Unable to locate treatment offer record.'}
        onRetry={() => navigate('/treatment-offers')}
      />
    );
  }

  // 4. Render UI strictly bound to authentic offer properties
  ...
```

#### Detailed Page-by-Page Modifications
1. **`AppointmentDetailsPage.tsx`**:
   - Extract `id` using `useParams<{ id: string }>()`.
   - Remove imports and usages of `DEFAULT_OFFER_STATE` and `DEFAULT_APPOINTMENT_RECORD`.
   - Bind patient demographics (`patientName`, `patientMrn`, allergy) to `offer.patientName`, `consultation?.patientMrn`.
   - Bind procedure information to `offer.procedures[0]?.procedureName`.
   - Bind financial settlement to `offer.netPayable`.
   - Replace `Ref #FIN-TR8921-12M` with dynamic `Ref #FIN-${offer.offerNumber || offer.id.slice(0, 8)}`.

2. **`PreOpReadinessPage.tsx`**:
   - Extract `id` using `useParams<{ id: string }>()`.
   - Remove `DEFAULT_OFFER_STATE` and `DEFAULT_APPOINTMENT_RECORD`.
   - **Eradicate `handleSimulateAllCleared`** and the button "Simulate Lab & Anesthesia Clearances" (lines 676–685).
   - Display Stage 14 Pre-Op Readiness informational notice: *"Clinical Gate Sign-off API is NOT IMPLEMENTED in the backend per R1. Parameters reflect authentic treatment offer context."*
   - Allow navigation to `/treatment-offers/${offer.id}/check-in` based on offer state rather than synthetic gate variables.

3. **`ProcedureSchedulingPage.tsx`**:
   - Extract `id` using `useParams<{ id: string }>()`.
   - Remove `DEFAULT_OFFER_STATE`.
   - Replace `#PROC-2026-93458` with dynamic procedure code from `offer.procedures[0]?.procedureCode`.
   - Replace `#FIN-TR8921-12M` with dynamic `FIN-${offer.offerNumber || offer.id.slice(0, 8)}`.
   - Document Mode "review" (Stage 11) as NOT IMPLEMENTED per R1.

4. **`ClinicalHandoffPage.tsx`**:
   - Extract `id` using `useParams<{ id: string }>()`.
   - Remove `DEFAULT_OFFER_STATE`.
   - Replace `#FIN-TR8921-12M` with dynamic `FIN-${offer.offerNumber || offer.id.slice(0, 8)}`.
   - Document Stage 9 as NOT IMPLEMENTED per R1 without synthetic clearance transitions.

5. **`DayOfCheckinPage.tsx`**:
   - Extract `id` using `useParams<{ id: string }>()`.
   - Remove `DEFAULT_OFFER_STATE`.
   - **Fix Line 592**: change `navigate('/patients/8472-9901')` to `navigate('/patients/' + offer.patientProfileId)`.
   - **Fix Lines 117, 120**: replace hardcoded `(DOB: 04/18/1962)` and `ID: CID-9048-28` with dynamic patient data.
   - Replace `Ref #FIN-TR8921-12M` on line 277 with dynamic `Ref #FIN-${offer.offerNumber || offer.id.slice(0, 8)}`.
   - Connect check-in action to `consultationService.updateAppointmentStatus(appointmentId, 'IN_PROGRESS')`.

6. **`TreatmentOfferAcceptedPage.tsx`**:
   - Extract `id` using `useParams<{ id: string }>()`.
   - Remove `DEFAULT_OFFER_STATE`.
   - Hydrate directly via `treatmentOfferService.getTreatmentOffer(id)`.

7. **Cath Lab Sub-Pages**:
   - `CathLabSafetyCheckinPage.tsx`: change hardcoded `/treatment-offers/TR-8921/...` navigations on lines 130 and 962 to use the active `:id` route parameter.
   - `ActiveProcedureDocumentationPage.tsx`, `PostProcedureSummaryPage.tsx`, `StartClinicalEncounterPage.tsx`: remove `id || 'TR-8921'` fallback and handle `id` strictly.

---

## 3. Caveats

1. **Backend Absence of Clearance & Check-In Signoff Endpoints**:
   - As documented in Section 1.3, the staging backend (`https://360api.vnvision.in/api/v1`) does not currently provide dedicated endpoints for WHO surgical safety checklists, 11-gate pre-op clearances, or slot holding. Per Requirement R1 and R4, these must be treated as NOT IMPLEMENTED rather than introducing local storage or simulated API calls.
2. **Patient Demographics in Treatment Offer DTO**:
   - The backend `TreatmentOfferDTO` includes `patientProfileId` and `patientName`. For extended fields (such as blood group and allergies), these are enriched either from the matching appointment in `consultationService.listConsultations()` or through `GET /api/v1/doctors/patients/:id/medical-records`. The fallback defaults in the UI must gracefully display "Not Recorded" or "Standard Precautions" if the patient has no recorded allergies, rather than hardcoding "Penicillin".
3. **UI Preservation (Pixel-for-Pixel)**:
   - All layout dimensions, Tailwind color tokens, Lucide icons, and structure in the Figma designs must remain 100% intact when replacing the static mock variables with dynamic DTO properties.

---

## 4. Conclusion

1. **Root Cause**: The presence of `'TR-8921'`, `DEFAULT_OFFER_STATE`, and `DEFAULT_APPOINTMENT_RECORD` stems from initial UI scaffolding where components were created to match Figma mockups before API services were integrated in Milestone 1.
2. **Feasibility**: With `treatmentOfferService` and `consultationService` fully operational and passing 100% of live Tier 1 and Tier 2 E2E tests, all sub-pages can now be directly wired to live backend data using `useParams<{ id: string }>()` and the standard hydration pattern.
3. **Scope of Implementation for Milestone 2**:
   - **`TreatmentOffersDashboardPage.tsx`**: Add `useSearchParams`, implement dynamic stage URL generation, remove hardcoded `TR-8921` from 13 stages and row action, handle empty offer states gracefully.
   - **5 Trajectory Sub-Pages**: Implement route param extraction (`useParams`), backend hydration via `treatmentOfferService.getTreatmentOffer(id)`, eradicate `DEFAULT_OFFER_STATE` and `DEFAULT_APPOINTMENT_RECORD`, fix hardcoded patient link `/patients/8472-9901` in `DayOfCheckinPage.tsx`, and remove fake button simulation `handleSimulateAllCleared` in `PreOpReadinessPage.tsx`.
   - **Document NOT IMPLEMENTED Stages**: Explicitly annotate Stages 9, 11, 14, and 16 as NOT IMPLEMENTED per R1.

---

## 5. Verification Method

### 5.1 Independent Automated Test Verification
Run the following commands in the workspace root:

1. **Tier 1 Feature Coverage Suite**:
   ```powershell
   node --experimental-strip-types tests/e2e/consultations/runner.ts --tier=1
   ```
   *Expected Result*: All 14 suites, 71 test cases pass (100.0%). Confirms Feature 05 (Trajectory 18-Stage Navigation) and Feature 06 (Listing & Filters).

2. **Tier 2 Boundary & Corner Cases Suite**:
   ```powershell
   node --experimental-strip-types tests/e2e/consultations/runner.ts --tier=2
   ```
   *Expected Result*: All 14 suites, 70 test cases pass (100.0%). Confirms Boundary 05 (Trajectory Navigation Edges) and Boundary 11 (Workflow State Lost / Refresh Edges).

3. **TypeScript Type-Check Gate**:
   ```powershell
   npm run type-check
   ```
   *Expected Result*: Exit code 0, 0 errors.

4. **ESLint Quality Gate**:
   ```powershell
   npm run lint
   ```
   *Expected Result*: Exit code 0, 0 lint warnings or errors.

5. **Production Build Gate**:
   ```powershell
   npm run build
   ```
   *Expected Result*: Successful Vite build with output in `dist/`.

### 5.2 Source Code Integrity Verification
Run grep / Select-String checks to verify zero occurrences of forbidden mock artifacts in affected files:
```powershell
Get-ChildItem -Path src/pages/treatment-offers -Recurse -Filter "*.tsx" | Select-String -Pattern "DEFAULT_OFFER_STATE|DEFAULT_APPOINTMENT_RECORD|TR-8921|8472-9901"
```
*Expected Result*: Zero occurrences across all treatment offer pages.

### 5.3 Browser Invalidation Conditions
- Clicking any of stages 6–18 in `TreatmentOffersDashboardPage` must navigate to the URL corresponding to the active/selected offer ID, never to `/treatment-offers/TR-8921/...`.
- Navigating directly to `/treatment-offers/:id/appointment` and hitting refresh (F5) must fetch and render the live offer data for `:id` without falling back to "Patient Record" or `#PROC-2026-93458`.
- If an invalid or non-existent ID is entered in the URL (e.g. `/treatment-offers/invalid-uuid/appointment`), the page must display an authentic error / Not Found banner rather than crashing or rendering fallback demo data.
