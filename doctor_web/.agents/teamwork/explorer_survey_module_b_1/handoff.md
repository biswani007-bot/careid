# In-Depth Codebase Exploration Report: Module B — Multi-Step Treatment Offer Creation Workflow

**Target Module**: Module B — Multi-Step Treatment Offer Creation Workflow (`/treatment-offers/new/step-1` to `step-4`)  
**Workspace**: `d:\New folder\New folder\doctor web\doctor-web-frontend-main`  
**State Folder**: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_survey_module_b_1`  
**Authoritative API Reference**: `Postman collection/CareID-Staging.postman_collection.json`  
**Backend Base URL**: `https://360api.vnvision.in`  
**Date**: November 9, 2026  

---

## 1. Observation

### 1.1 Multi-Step Route Structure and Navigation Topology

In `src/routes/index.tsx` (lines 426–471), the treatment offer routes are defined inside the `ProtectedLayout` route group:

```tsx
// 9. CareID Treatment Offer & Procedure Lifecycle (All 18 authorized steps)
{
  path: '/treatment-offers',
  element: <TreatmentOffersDashboardPage />,
},
{
  path: '/treatment-offers/new',
  element: <TreatmentOfferCreatePage />,
},
{
  path: '/treatment-offers/new/step-1',
  element: <TreatmentOfferCreatePage />,
},
{
  path: '/treatment-offers/new/step-2',
  element: <TreatmentOfferCreatePage />,
},
{
  path: '/treatment-offers/new/step-3',
  element: <TreatmentOfferCreatePage />,
},
{
  path: '/treatment-offers/new/step-4',
  element: <TreatmentOfferCreatePage />,
},
{
  path: '/treatment-offers/new/step-5',
  element: <TreatmentOfferCreatePage />,
},
{
  path: '/treatment-offers/:id/review',
  element: <TreatmentOfferReviewPage />,
},
{
  path: '/treatment-offers/:id/sent',
  element: <TreatmentOfferStatusPage />,
},
{
  path: '/treatment-offers/:id/status',
  element: <TreatmentOfferStatusPage />,
},
{
  path: '/treatment-offers/:id/accepted',
  element: <TreatmentOfferAcceptedPage />,
},
```

Also related:
- `/patients/:id/financing` mounts `InsuranceFinancingHubPage` (`src/pages/financing/InsuranceFinancingHubPage.tsx`).

#### Routing Discrepancies and Behavioral Observations:
1. **Subroute Collapsing**: Routes `/treatment-offers/new`, `/treatment-offers/new/step-1`, `/treatment-offers/new/step-2`, `/treatment-offers/new/step-3`, `/treatment-offers/new/step-4`, and `/treatment-offers/new/step-5` all mount the single identical component `<TreatmentOfferCreatePage />`.
2. **Ignored URL Pathname**: In `src/pages/treatment-offers/TreatmentOfferCreatePage.tsx`, `location.pathname` is never inspected. Navigating to `/treatment-offers/new/step-1`, `/step-2`, or `/step-4` renders the exact same monolithic page containing Sections 1 through 4 simultaneously.
3. **Step Mapping vs. UI Stepper Divergence**:
   - In `TreatmentOfferCreatePage.tsx` (lines 285–357), the UI stepper shows:
     - **Step 1: Completed** ("Select Financing Options") — A link navigating backwards to `/patients/${targetPatientId}/financing` (or `/treatment-offers`).
     - **Step 2: Active** ("Configure Treatment Offer") — The form on this current page.
     - **Step 3: Upcoming** ("Review & Send to Patient").
     - **Step 4: Upcoming** ("Patient Acceptance").
   - In `TreatmentOffersDashboardPage.tsx` (lines 87–95), the 18-stage trajectory lists stages 1 to 5 as individual subroutes:
     - `1: CPT Selection` -> `/treatment-offers/new/step-1`
     - `2: Pricing & Discount` -> `/treatment-offers/new/step-2`
     - `3: Financing Package` -> `/treatment-offers/new/step-3`
     - `4: Terms & Remarks` -> `/treatment-offers/new/step-4`
     - `5: Attestation` -> `/treatment-offers/new/step-5`
     - `6: Clinical Review` -> `/treatment-offers/TR-8921/review`
     - `7: Dispatched Status` -> `/treatment-offers/TR-8921/status`
     - `8: Offer Accepted` -> `/treatment-offers/TR-8921/accepted`

---

### 1.2 Step 1: Select Financing Options (`InsuranceFinancingHubPage.tsx`)

File: `src/pages/financing/InsuranceFinancingHubPage.tsx`

#### Patient Context Resolution:
Lines 116–143:
```tsx
const { id } = useParams<{ id: string }>();
const { patient: livePatient } = usePatientProfile(id);

const patient = {
  id: id || livePatient?.id || 'patient-record',
  name: livePatient?.fullName || 'Patient Record',
  cid: livePatient?.patientNumber || 'CAREID-PT',
  monogram: (livePatient?.fullName || 'PT')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase(),
  demographics: livePatient?.dateOfBirth
    ? `${calculateAge(livePatient.dateOfBirth)} ${livePatient?.gender?.charAt(0) || ''}`
    : '45 M',
  bloodGroup: livePatient?.bloodGroup || 'O Pos (+)',
  statusBadge: livePatient?.insurancePolicy?.status
    ? `Active (${livePatient.insurancePolicy.providerName})`
    : 'Self-Pay / Non-Insured',
  allergy: livePatient?.knownAllergies?.length
    ? livePatient.knownAllergies.join(', ')
    : 'No known allergies documented',
  pendingProcedure: 'Diagnostic Cardiac Catheterization & Angiogram',
  cptCode: '#93458 • Outpatient Cardiac Recovery Tier 1',
};
```

#### Hardcoded CPT, Pricing, and Discounts:
Lines 314–341:
- Procedure: `"Diagnostic Cardiac Catheterization & Angiogram"`, CPT `#93458 • Outpatient Cardiac Recovery Tier 1`
- Hospital Standard Baseline: `$5,200.00`
- 15% Prompt Cash Settlement: `-$780.00`
- Net Financing Base: `$4,420.00`

#### Static Financing Packages:
Lines 42–112: `FINANCING_PACKAGES` constant array:
1. `careid-0`: "Care ID In-House 0% APR", 12 Months Fixed, `$368.33 / mo`, Total `$4,420.00`, 0.0% APR, Credit up to `$6,000.00`.
2. `healthpay-bridge`: "HealthPay Bridge Credit Line", 24 Months, `$198.50 / mo`, Total `$4,764.00`, 5.9% APR, Credit up to `$15,000.00`.
3. `medpay-flex`: "MedPay Flex Split-Tier", 36 Months, `$141.20 / mo`, Total `$5,083.20`, 9.9% APR, Credit up to `$10,000.00`.
Lines 550–791: Side-by-side comparison table hardcodes these exact numerical values across 8 term rows.

#### Workflow Hand-off to Step 2:
Lines 154–167:
```tsx
const handleContinueToTreatmentOffer = () => {
  navigate('/treatment-offers/new/step-1', {
    state: {
      patientId: patient.id,
      patientName: patient.name,
      financingPackageId: selectedPkg.id,
      financingPackageName: selectedPkg.name,
      monthlyInstallment: selectedPkg.monthlyAmountDisplay,
      termMonths: selectedPkg.termMonths,
      apr: selectedPkg.apr,
      totalPayable: selectedPkg.totalPayableDisplay,
    },
  });
};
```
No backend call is made on package selection. It navigates to `/treatment-offers/new/step-1` passing transient router state.

---

### 1.3 Step 2: Configure Treatment Offer (`TreatmentOfferCreatePage.tsx`)

File: `src/pages/treatment-offers/TreatmentOfferCreatePage.tsx`

#### State Initialization and Inbound Context Resolution:
Lines 36–58:
- Extracts `hubPayload = location.state as Partial<TreatmentOfferState> | undefined;`
- Extracts `queryPatientId = searchParams.get('patientId');`
- Resolves patient via `usePatientProfile(targetPatientId)`.
- If missing, defaults to: `'Authorized Patient Record'`, `'CAREID-PT'`, `'Not specified'`, `'45'`, `'O Pos (+)'`, `'No known allergies documented'`, `'Self-Pay / Non-Insured'`.

#### Form Fields and Hardcoded Data:
1. **Target Procedure / CPT Code** (lines 386–406):
   - Dropdown with only 2 hardcoded options:
     - `CPT #93458`: "Left Heart Catheterization with Coronary Angiogram", Baseline fee `$5,200`.
     - `CPT #92928`: "Percutaneous Coronary Intervention (PCI) with Single Stent", Baseline fee `$8,400`.
   - Hardcoded badge: `"CPT #93458 Verified"`, `"Tier 1 Cath Lab Procedure"`.
2. **Clinical Necessity Summary** (lines 423–429):
   - Initialized to: `"Diagnostic assessment following exertional angina and abnormal treadmill ECG stress test. Linked Referral: #REF-4491."`
3. **Standard Chargemaster Baseline Fee** (lines 433–448):
   - Numeric input defaulted to `$5,200`. Text note cites: `"Hospital master chargemaster fee calibrated for Mount Sinai Heart Center Outpatient Unit."`
4. **Treatment Discount** (lines 453–593):
   - Toggle: `discountEnabled` (default `true`).
   - Mode: `percentage` (default 15%, slider 0–20%) or `fixed` (default `$780`).
   - Hardcoded strings referencing "Robert":
     - Line 578: `"Calculated Savings for Robert: ..."`
5. **Financing Packages** (lines 598–776):
   - Hardcoded cards for `careid-0`, `healthpay-bridge`, `medpay-flex`, and `prompt-cash`.
   - Line 616: Hardcoded back-link: `onClick={() => navigate('/patients/8472-9901/financing')}` (hardcoded patient ID `8472-9901`).
6. **Offer Validity & Clinical Remarks** (lines 778–852):
   - Offer Title: `"Cardiac Catheterization Treatment Package"`.
   - Expiration Date: read-only `"11 / 01 / 2026"`.
   - Line 789: Hardcoded label: `"Define the validity period and customized clinical remarks for Robert"`.
   - Doctor Notes: `"This offer reflects our standard diagnostic catheterization package with an authorized prompt settlement cash discount paired with our in-house 0% financing option. Reviewing and accepting this in your Care ID app secures your Cath Lab slot."`.
   - Compliance Checkbox: `"I confirm that this prompt cash settlement discount complies with Metro General Hospital financial governance and does not exceed the clinical threshold of 20%."`.

#### Form Submission / Next Step:
Lines 139–179 (`handleProceedToReview`):
```tsx
const handleProceedToReview = () => {
  const offerId = hubPayload?.offerId || `TR-${Math.floor(1000 + Math.random() * 9000)}`;
  const payload: TreatmentOfferState = {
    ...DEFAULT_OFFER_STATE,
    offerId,
    patientId: targetPatientId || livePatient?.id || 'patient-assigned',
    patientName,
    ...
  };
  consultationService.saveTreatmentOffer(payload); // Writes to localStorage
  navigate(`/treatment-offers/${offerId}/review`, { state: payload });
};
```
Lines 181–222 (`handleSaveDraft`):
- Saves to `localStorage` via `consultationService.saveTreatmentOffer(payload)`.
- Triggers local UI toast (`setTimeout` 3000ms).
- Zero network requests.

---

### 1.4 Step 3: Review & Send to Patient (`TreatmentOfferReviewPage.tsx`)

File: `src/pages/treatment-offers/TreatmentOfferReviewPage.tsx`

#### State Loading:
Line 29:
```tsx
const offer = (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE;
```
If refreshed, `location.state` is lost, immediately falling back to `DEFAULT_OFFER_STATE`.

#### Components Displayed:
- Patient Context Capsule (with monogram, demographics, and back-link).
  - Line 192: Back-link navigates to `/treatment-offers/new/step-1` passing `state: offer`.
  - Line 215: Stepper Step 1 button navigates to hardcoded `/patients/8472-9901/financing`.
- Section 1: Target Procedure & Baseline Verification (`CPT #93458`).
- Section 2: Financial Breakdown & Discount Matrix (Chargemaster `$5,200`, Discount `-$780`, Net `$4,420`).
- Section 3: Integrated Financing Structure (`Care ID In-House 0% APR`, `$368.33 / mo`).
- Section 4: Clinical Message, Validity & Doctor Attestation:
  - Line 478: Hardcoded reference to "Robert": `"...transmitted to Robert's Care ID mobile application."`
  - Attestation checkbox: `attestationChecked` (defaults to `true`).
- Right Column:
  - Patient-Facing Device Preview with Care ID Mobile App simulation.
  - "Open Expanded Patient Preview Modal" opens modal simulator.
  - Audit log ID: hardcoded `"AUD-2026-TR8921-INIT"`.

#### Dispatch Action & Simulation:
Lines 45–64:
```tsx
const [attestationChecked, setAttestationChecked] = useState<boolean>(true);
const [isSending, setIsSending] = useState<boolean>(false);
const [simulatedError, setSimulatedError] = useState<string | null>(null);

const handleSendOffer = () => {
  if (!attestationChecked) {
    alert('Please certify clinician attestation before dispatching the treatment offer.');
    return;
  }

  setIsSending(true);
  consultationService.saveTreatmentOffer(offer); // localStorage only
  setTimeout(() => {
    setIsSending(false);
    navigate(`/treatment-offers/${offer.offerId || 'TR-8921'}/status`, { state: offer });
  }, 600);
};

const handleSimulateError = () => {
  setSimulatedError(
    'Simulated Verification Warning: Patient insurance re-check detected potential secondary medicaid filing. Continue with prompt self-pay settlement?'
  );
};
```
- No call is made to `POST /api/v1/doctors/treatment-offers` or `POST /api/v1/doctors/treatment-offers/:offerId/dispatch`.
- A 600ms fake timer simulates network delay before navigating to `TreatmentOfferStatusPage`.
- A "Simulate Error" button injects a static warning string.

---

### 1.5 Step 4: Patient Acceptance (`TreatmentOfferStatusPage.tsx` & `TreatmentOfferAcceptedPage.tsx`)

#### A. Dispatched / Pending State (`TreatmentOfferStatusPage.tsx`)
File: `src/pages/treatment-offers/TreatmentOfferStatusPage.tsx`
- State: `const offer = (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE;`
- Hero Banner: `"Treatment Offer Sent Successfully"`, `"Pending Patient Review (#{offer.offerId})"`.
- Hardcoded references:
  - Line 252: `"Robert can now review, authorize digital financing..."`
  - Line 266: `"Dispatched: Oct 18, 2026 • 10:42 AM EST"`
  - Line 270: `"Expiration: Nov 1, 2026 (14 Days Remaining)"`
  - Line 274: `"Dispatch Channel: SMS (+1 555-***-9182)"`
  - Line 681: `"SHA256-8921-TR-VERIFIED-7A890D"`
- Trajectory Stepper (5 phases):
  - Phase 1: Draft Created (Oct 18, 10:30 AM)
  - Phase 2: Dispatched (Oct 18, 10:42 AM)
  - Phase 3: Patient Review (Active)
  - Phase 4: Digital Sign-Off
  - Phase 5: Clinical Handoff (button links to `/treatment-offers/${offer.offerId}/accepted`)
- Live Dispatch Monitor:
  - Hardcoded channel statuses: Care ID App ("Delivered"), SMS Link ("Delivered"), Patient Portal ("Synced").
  - "Resend Patient SMS Link": Triggers 3500ms timeout toast: `"Priority SMS notification link resent to +1 (555) •••-9182."`
  - "Withdraw / Cancel Offer": Triggers toast: `"Offer #TR-8921 has been marked as Withdrawn."`
  - "Proceed to Clinical Handoff & Scheduling": Navigates to `/treatment-offers/${offer.offerId}/accepted`.
  - Polling: **Zero polling**. There are no `setInterval`, `setTimeout` loops, or API calls to fetch updated status.

#### B. Ratified / Accepted State (`TreatmentOfferAcceptedPage.tsx`)
File: `src/pages/treatment-offers/TreatmentOfferAcceptedPage.tsx`
- State: `const offer = (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE;`
- Hero Banner: `"ACCEPTED BY PATIENT"`, `"FINANCING CONFIRMED"`, `"Treatment Offer Accepted & Financial Plan Ratified"`.
- Hardcoded acceptance details:
  - Monogram: Hardcoded `'RS'` (line 196).
  - Timestamp: `"Oct 19, 2026 • 2:15 PM EST"` (lines 81, 275, 501, 742).
  - Biometric token: `"SHA-256 token: 7f89b4c09a823...318e"` (line 124).
  - Financing reference: `"FIN-TR8921-12M"`, `"First draft scheduled Nov 15, 2026"` (lines 572, 578).
  - Hold slot: `"Cath Lab Room 3 • Nov 4, 2026"` (line 100).
- 8-Step Verification Trajectory: Hardcoded timestamps and completion statuses for all 8 steps.
- Action: "Continue to Treatment" navigates to `/treatment-offers/${offer.offerId}/clearance`.
- "View Full Offer Agreement (PDF)": Opens modal; "Download PDF" fires fake toast with 3500ms timer.

---

### 1.6 Workflow State Persistence & Duplicate Submission Analysis

1. **Transient Navigation State (`location.state`)**:
   - Data passed exclusively via React Router `navigate(url, { state: payload })`.
   - Refreshing any page (`/treatment-offers/:id/review`, `/status`, `/accepted`) immediately wipes `location.state`, causing an instant fallback to `DEFAULT_OFFER_STATE` with fake patient "Patient Record" (CID `#CID-ACTIVE`, CPT `#93458`).
2. **Local Storage Storage Key (`careid_treatment_offers_store`)**:
   - `consultationService.saveTreatmentOffer` writes offers to `localStorage.getItem('careid_treatment_offers_store')`.
   - `consultationService.getTreatmentOffers()` parses this array.
   - **Critical Gap**: Neither `TreatmentOfferReviewPage`, `TreatmentOfferStatusPage`, nor `TreatmentOfferAcceptedPage` invokes `getTreatmentOfferById(id)` during mount when `location.state` is empty.
3. **Query Parameters**:
   - Only `patientId` is supported on `/treatment-offers/new?patientId=...` in `TreatmentOfferCreatePage.tsx`. No other step preserves or consumes query params.
4. **Duplicate Submission Prevention**:
   - None on the frontend. Clicking "Send Treatment Offer" multiple times or reloading/resubmitting creates redundant random IDs (`TR-XXXX`) or overwrites `TR-8921`.
   - No idempotency key is generated or sent.

---

### 1.7 Postman Collection API Contract Analysis

Authoritative File: `Postman collection/CareID-Staging.postman_collection.json`  
Inspection of `05. Doctor Portal` and `27. Healthcare Financing & Financial Assistance` reveals the following documented endpoints:

#### A. Documented Treatment Offer Endpoints (`05. Doctor Portal`)
| Endpoint | Method | Postman Request DTO | Postman Response DTO | Notes |
|---|---|---|---|---|
| `/api/v1/doctors/treatment-offers` | POST | `patientProfileId` (UUID), `facilityId` (UUID), `clinicalIndication` (str), `procedures` (array of `{procedureCode, procedureName, unitCost, category, quantity, isOptional, clinicalJustification}`), `validUntil` (ISO str), `encounterId` (opt UUID), `discountAmount` (num), `financingEligible` (bool), `recommendedTenureMonths` (num), `clinicalNotes` (str), `termsAndConditions` (str) | 201 Created: Full Treatment Offer entity (`id`, `offerNumber` e.g. `TO-2026-00001`, `grossEstimate`, `discountAmount`, `netPayable`, `status: "DRAFT"`, `version`, `procedures`, `doctorName`, `patientName`, `facilityName`, etc.) | Creates draft treatment proposal |
| `/api/v1/doctors/treatment-offers` | GET | Query params: `status`, `patientId`, `search`, `page`, `limit` | 200 OK: Paginated list of authored treatment offers | Lists doctor's treatment offers |
| `/api/v1/doctors/treatment-offers/:offerId` | GET | Path param: `:offerId` (UUID) | 200 OK: Complete treatment offer details | Fetches single offer |
| `/api/v1/doctors/treatment-offers/:offerId` | PUT | `clinicalIndication`, `procedures`, `discountAmount`, `financingEligible`, `recommendedTenureMonths`, `validUntil`, `clinicalNotes`, `termsAndConditions`, `expectedVersion` (num) | 200 OK: Updated treatment offer entity | Updates draft offer with optimistic locking |
| `/api/v1/doctors/treatment-offers/:offerId/dispatch` | POST | `expectedVersion` (num) | 200 OK: Treatment offer with `status: "DISPATCHED"`, `dispatchedAt` timestamp | Locks draft and dispatches to patient |
| `/api/v1/doctors/treatment-offers/:offerId/status` | GET | Path param: `:offerId` (UUID) | 200 OK: `{id, offerNumber, status, isExpired, validUntil, version, dispatchedAt, patientViewedAt, patientRespondedAt, patientResponseNotes, cancellationReason}` | Live lifecycle status & timestamps |
| `/api/v1/doctors/treatment-offers/:offerId/cancel` | POST | `cancellationReason` (str), `expectedVersion` (num) | 200 OK: Treatment offer with `status: "CANCELLED"` | Cancels active proposal |

#### B. Documented Financing Endpoints (`27. Healthcare Financing & Financial Assistance`)
| Endpoint | Method | Postman Request DTO | Postman Response DTO | Notes |
|---|---|---|---|---|
| `/api/v1/financing/options` | GET | None | 200 OK: Array of `{id, partnerName, name, description, minAmount, maxAmount, tenureMonths, interestRate, processingFee, features}` | Available financing options & partners |
| `/api/v1/financing/offers` | GET | None | 200 OK: Array of pre-approved financing offers for patient | Pre-approved financing offers |
| `/api/v1/financing/offers/:id` | GET | Path param: `:id` | 200 OK: Specific financing offer details | Single offer proposal |
| `/api/v1/financing/apply` | POST | `optionId`, `facilityId`, `treatmentName`, `requestedAmount`, `tenureMonths`, `monthlyIncome`, `employmentType`, `panOrNationalId`, `notes` | 201 Created: Application confirmation | Healthcare financing application |
| `/api/v1/financing/applications` | GET | Query params: `status`, `partnerName`, `search`, `page`, `limit` | 200 OK: Financing applications list | Patient/admin scoped list |

#### C. Documented Patient-Side Acceptance Endpoints (`Patient Portal`)
| Endpoint | Method | Postman Request DTO | Postman Response DTO | Notes |
|---|---|---|---|---|
| `/api/v1/patients/treatment-offers/:offerId/accept` | POST | `signatureConsent` (bool), `patientResponseNotes` (str), `expectedVersion` (num) | 200 OK: Updated offer with `status: "RATIFIED_ACCEPTED"` | Executed by patient in mobile/web app |
| `/api/v1/patients/treatment-offers/:offerId/reject` | POST | `declineReason` (str), `expectedVersion` (num) | 200 OK: Updated offer with `status: "DECLINED"` | Executed by patient |

#### D. Missing Backend APIs (Not Implemented in Backend Postman Collection)
1. **CPT / Procedure Master Catalog**: No `/api/v1/procedures` or `/api/v1/cpt-codes` endpoint exists in Postman.
2. **Hospital Baseline Chargemaster Pricing**: No `/api/v1/facilities/:id/chargemaster` or procedure baseline fee endpoint exists in Postman.
3. **Discount Policy Governance**: No `/api/v1/facilities/:id/discount-policies` endpoint exists in Postman.
4. **Doctor-Side Simulated Patient Acceptance**: Acceptance is exclusively authenticated as patient (`/api/v1/patients/treatment-offers/:offerId/accept`). The doctor API only exposes read status (`GET /api/v1/doctors/treatment-offers/:offerId/status`).

---

### 1.8 Build and Quality Gate Observations

Commands executed:
1. `npm run type-check`:
   - Command: `tsc -b --noEmit`
   - Result: Exited with code 0 (zero errors).
2. `npm run lint`:
   - Command: `eslint .`
   - Result: Exited with code 0 (zero errors).
3. `npm run build`:
   - Command: `tsc -b && vite build`
   - Result: Exited with code 0. Built `dist/` successfully in 5.40s.

---

## 2. Logic Chain

```
Observation 1.1: Routes /treatment-offers/new/step-1 through step-5 all mount TreatmentOfferCreatePage without checking location.pathname.
Observation 1.2 & 1.3: Step 1 in the UI links to /patients/:id/financing, while Step 2 is the form on TreatmentOfferCreatePage.
==> INFERENCE 1: The route definitions /treatment-offers/new/step-1 through step-5 are legacy flat aliases. Step 1 (Financing Options) is physically housed in InsuranceFinancingHubPage, Step 2 (Configure Treatment Offer) is in TreatmentOfferCreatePage, Step 3 (Review & Send) is in TreatmentOfferReviewPage, and Step 4 (Acceptance) is split across TreatmentOfferStatusPage and TreatmentOfferAcceptedPage.

Observation 1.2 & 1.3: InsuranceFinancingHubPage hardcodes $5,200 baseline, -$780 discount, $4,420 net, and static FINANCING_PACKAGES. TreatmentOfferCreatePage hardcodes CPT #93458 ($5,200) and CPT #92928 ($8,400).
Observation 1.7: Postman collection has zero endpoints for CPT catalogs, hospital chargemaster pricing, or discount policy rules.
==> INFERENCE 2: The backend API contract treats procedures, baseline prices, and discounts as free-form inputs submitted inside the treatment offer creation payload (procedures array and discountAmount number) rather than providing pre-configured catalog endpoints.

Observation 1.3, 1.4, 1.5: handleProceedToReview, handleSendOffer, and handleSaveDraft interact strictly with localStorage via consultationService.saveTreatmentOffer.
Observation 1.7: Postman collection contains a complete, authoritative suite of 7 dedicated doctor treatment offer endpoints under 05. Doctor Portal.
==> INFERENCE 3: The existing Module B frontend has zero real backend integration for treatment offers. It operates entirely as an in-memory / localStorage simulation.

Observation 1.4 & 1.5: TreatmentOfferReviewPage uses setTimeout(..., 600) to simulate sending. TreatmentOfferStatusPage uses setTimeout(..., 3500) for fake SMS resend and withdrawal. TreatmentOfferAcceptedPage uses static timestamps (Oct 19, 2026 • 2:15 PM EST) and fake download toasts.
==> INFERENCE 4: All workflow transitions and status changes across Steps 3 and 4 are mock simulations with hardcoded delays and static data.

Observation 1.6: All pages resolve their state via (location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE.
Observation 1.6: Neither review, status, nor accepted pages query consultationService.getTreatmentOfferById(id) or GET /api/v1/doctors/treatment-offers/:offerId on mount.
==> INFERENCE 5: Browser refresh completely breaks the user workflow, instantly reverting all patient, clinical, and financial details to the static DEFAULT_OFFER_STATE.

Observation 1.3 & 1.4: TreatmentOfferCreatePage and TreatmentOfferReviewPage contain hardcoded patient ID 8472-9901 in back buttons and hardcoded references to "Robert".
==> INFERENCE 6: Static mock artifacts from Figma design node 1:7041 ("Robert Sanchez", patient ID 8472-9901) were directly copied into template JSX strings.
```

---

## 3. Caveats

1. **Patient Portal Acceptance Role**: The backend API for patient acceptance (`POST /api/v1/patients/treatment-offers/:offerId/accept`) is designed for patient JWT credentials, not doctor credentials. In the Doctor Web portal, Step 4 can only inspect live status (`GET /api/v1/doctors/treatment-offers/:offerId/status`) unless an administrative or testing bypass is permitted.
2. **Missing Catalog Endpoints**: Because the backend does not provide a CPT Chargemaster endpoint, procedure selection must either be user-inputted or drawn from an agreed-upon clinical reference catalog conforming to the backend's `procedures` schema.
3. **Module A Interdependence**: Treatment offers saved locally or created via API must correlate with `consultationService.listConsultations()` so that offers appear in the dashboard.

---

## 4. Conclusion

Module B (`/treatment-offers/new/step-1` to `step-4`) currently contains **zero backend integration for treatment proposals**, relying entirely on mock state, hardcoded numbers, `localStorage`, and `setTimeout` fake operations:
1. **Step 1 (Select Financing Options)**: Housed in `InsuranceFinancingHubPage.tsx`, using static packages and hardcoded pricing ($5,200 / $4,420). Live backend endpoints `GET /api/v1/financing/options` and `GET /api/v1/financing/offers` exist in Postman but are not called.
2. **Step 2 (Configure Treatment Offer)**: Housed in `TreatmentOfferCreatePage.tsx`, using hardcoded CPT options, hardcoded "Robert" strings, and saving only to `localStorage`. Documented endpoint `POST /api/v1/doctors/treatment-offers` is not integrated.
3. **Step 3 (Review & Send to Patient)**: Housed in `TreatmentOfferReviewPage.tsx`, using a 600ms fake timer and a fake error simulation button. Documented dispatch endpoint `POST /api/v1/doctors/treatment-offers/:offerId/dispatch` is not integrated.
4. **Step 4 (Patient Acceptance)**: Split across `TreatmentOfferStatusPage.tsx` (pending review) and `TreatmentOfferAcceptedPage.tsx` (ratified acceptance), both using static timestamps ("Oct 19, 2026 • 2:15 PM EST") and zero polling. Documented endpoint `GET /api/v1/doctors/treatment-offers/:offerId/status` is not integrated.
5. **State Persistence**: Browser refresh destroys active offer state due to sole reliance on transient `location.state`.
6. **Postman Contract Readiness**: The backend has a complete, robust REST API under `05. Doctor Portal` ready for full implementation.

---

## 5. Comprehensive Mock Data & Hardcoded Object Inventory

| File Path | Line Range | Hardcoded Value / Simulated Operation | Classification | Proposed Live Backend Replacement |
|---|---|---|---|---|
| `src/pages/treatment-offers/types.ts` | 17–93 | `FINANCING_PACKAGES_MAP` (`careid-0`, `healthpay-bridge`, `medpay-flex`, `prompt-cash`) | Hardcoded financing catalog | Fetch via `GET /api/v1/financing/options` and `GET /api/v1/financing/offers` |
| `src/pages/treatment-offers/types.ts` | 95–188 | `DEFAULT_OFFER_STATE` (Patient: `PT-ACTIVE`, `Patient Record`, CPT `#93458`, `$5,200`, `$4,420`, `TR-8921`) | Static mock fallback object | Fetch live patient via `GET /api/v1/doctors/patients/:id` and live offer via `GET /api/v1/doctors/treatment-offers/:id` |
| `src/pages/treatment-offers/types.ts` | 228–250 | `DEFAULT_APPOINTMENT_RECORD` (`#PROC-2026-93458`, `Cath Lab Suite 3`, `Nov 4, 2026`) | Hardcoded appointment record | Fetch live appointment via `GET /api/v1/appointments/:id` |
| `src/pages/financing/InsuranceFinancingHubPage.tsx` | 42–112 | `FINANCING_PACKAGES` constant array ($368.33, $198.50, $141.20) | Hardcoded financing plans | `GET /api/v1/financing/options` |
| `src/pages/financing/InsuranceFinancingHubPage.tsx` | 314–341 | Hardcoded `$5,200.00` baseline, `-$780.00` discount, `$4,420.00` net | Static procedure pricing | Calculate from procedure unit costs and live financing terms |
| `src/pages/financing/InsuranceFinancingHubPage.tsx` | 550–791 | Side-by-side comparison table hardcoded values | Hardcoded comparison matrix | Dynamically calculate from live `FinancingOption` models |
| `src/pages/treatment-offers/TreatmentOfferCreatePage.tsx` | 400–406 | Hardcoded CPT options (`CPT #93458` $5,200, `CPT #92928` $8,400) | Hardcoded procedure options | Conforming `procedures` DTO with validated input/options |
| `src/pages/treatment-offers/TreatmentOfferCreatePage.tsx` | 578, 789 | Hardcoded patient name `"Robert"` in template text | Hardcoded patient name | Dynamic `{patientName}` from context |
| `src/pages/treatment-offers/TreatmentOfferCreatePage.tsx` | 616 | Hardcoded back link `/patients/8472-9901/financing` | Hardcoded patient ID | Dynamic `/patients/${targetPatientId}/financing` |
| `src/pages/treatment-offers/TreatmentOfferCreatePage.tsx` | 91, 170, 963 | Hardcoded date `"November 1, 2026"`, `"11 / 01 / 2026"` | Hardcoded expiration date | Dynamic calculated date (e.g. +14 days formatted ISO) |
| `src/pages/treatment-offers/TreatmentOfferCreatePage.tsx` | 140, 182 | Random offer ID generator `TR-${Math.floor(1000 + Math.random() * 9000)}` | Client-generated fake ID | Backend-generated `offerNumber` from `POST /api/v1/doctors/treatment-offers` |
| `src/pages/treatment-offers/TreatmentOfferCreatePage.tsx` | 221 | `setTimeout(() => setShowSavedToast(false), 3000)` | Fake toast timer | Standard UI notification dismiss |
| `src/pages/treatment-offers/TreatmentOfferReviewPage.tsx` | 53–56 | `setTimeout(() => { setIsSending(false); navigate(...); }, 600)` | Fake send timer | Real asynchronous `POST /api/v1/doctors/treatment-offers/:id/dispatch` |
| `src/pages/treatment-offers/TreatmentOfferReviewPage.tsx` | 60–63 | `handleSimulateError` with hardcoded string | Fake error simulation | Real Axios error handling from backend response |
| `src/pages/treatment-offers/TreatmentOfferReviewPage.tsx` | 215 | Hardcoded back link `/patients/8472-9901/financing` | Hardcoded patient ID | Dynamic `/patients/${offer.patientId}/financing` |
| `src/pages/treatment-offers/TreatmentOfferReviewPage.tsx` | 479 | Hardcoded `"Robert's Care ID mobile application"` | Hardcoded patient name | Dynamic `{offer.patientName}` |
| `src/pages/treatment-offers/TreatmentOfferReviewPage.tsx` | 647 | Hardcoded audit log ID `"AUD-2026-TR8921-INIT"` | Static audit ID | Real offer ID / hash |
| `src/pages/treatment-offers/TreatmentOfferStatusPage.tsx` | 46 | `setTimeout(() => setToastMessage(null), 3500)` | Fake toast timer | Real async status feedback |
| `src/pages/treatment-offers/TreatmentOfferStatusPage.tsx` | 51–54 | `handleResendSms` fake toast | Simulated SMS dispatch | Real notification dispatch API (or not implemented) |
| `src/pages/treatment-offers/TreatmentOfferStatusPage.tsx` | 55–58 | `handleWithdrawOffer` fake toast | Simulated withdrawal | `POST /api/v1/doctors/treatment-offers/:offerId/cancel` |
| `src/pages/treatment-offers/TreatmentOfferStatusPage.tsx` | 98, 117, 266, 270 | Hardcoded dates `"Oct 18, 2026"`, `"Nov 4, 2026"`, `"Nov 1, 2026"` | Hardcoded lifecycle timestamps | Real dates from `GET /api/v1/doctors/treatment-offers/:offerId/status` |
| `src/pages/treatment-offers/TreatmentOfferStatusPage.tsx` | 252 | Hardcoded `"Robert can now review..."` | Hardcoded patient name | Dynamic `{offer.patientName}` |
| `src/pages/treatment-offers/TreatmentOfferStatusPage.tsx` | 642–653 | Developer test bypass to Cath Lab safety check | Testing bypass | Remove or scope to live testing flag |
| `src/pages/treatment-offers/TreatmentOfferAcceptedPage.tsx` | 81, 275, 501, 742 | Hardcoded `"Oct 19, 2026 • 2:15 PM EST"` | Hardcoded acceptance timestamp | Real timestamp from backend `patientRespondedAt` |
| `src/pages/treatment-offers/TreatmentOfferAcceptedPage.tsx` | 100, 689 | Hardcoded `"Cath Lab Room 3 • Nov 4, 2026"` | Hardcoded procedural hold | Real schedule from appointment service |
| `src/pages/treatment-offers/TreatmentOfferAcceptedPage.tsx` | 124, 751 | Hardcoded SHA-256 tokens (`7f89b4c09a823...318e`, `SHA256: 7f89b...c438`) | Fake cryptographic tokens | Real consent token or backend hash |
| `src/pages/treatment-offers/TreatmentOfferAcceptedPage.tsx` | 196 | Hardcoded initials `'RS'` | Hardcoded patient monogram | Dynamic patient monogram |
| `src/pages/treatment-offers/TreatmentOfferAcceptedPage.tsx` | 572, 746 | Hardcoded financing ID `"FIN-TR8921-12M"` | Fake financing contract ID | Real application reference from financing service |
| `src/pages/treatment-offers/TreatmentOffersDashboardPage.tsx` | 87–104 | Hardcoded `'TR-8921'` across 13 stage paths | Hardcoded offer ID in navigation | Dynamic offer ID from consultation record |
| `src/services/consultationService.ts` | 170–172 | Hardcoded `cptCode: 'CPT #93458'`, `procedureName: 'Left Heart Catheterization...'` in all appointments | Static procedure tagging | Dynamic procedure from appointment / treatment offer |
| `src/services/consultationService.ts` | 362–387 | `localStorage.getItem/setItem('careid_treatment_offers_store')` | LocalStorage mock repository | Dedicated HTTP client calling `/api/v1/doctors/treatment-offers` |

---

## 6. Verification Method

To independently verify these findings:

1. **Verify Route Structure**:
   - Inspect `src/routes/index.tsx` lines 426–471. Confirm that `/treatment-offers/new`, `/step-1`, `/step-2`, `/step-3`, `/step-4`, and `/step-5` all reference `TreatmentOfferCreatePage`.
2. **Verify Hardcoded Data and "Robert" References**:
   - Run grep command:
     ```powershell
     Select-String -Path "src\pages\treatment-offers\*.tsx", "src\pages\financing\*.tsx" -Pattern "Robert", "8472-9901", "TR-8921", "Oct 18, 2026", "Nov 4, 2026"
     ```
   - Observe verbatim occurrences in `TreatmentOfferCreatePage.tsx`, `TreatmentOfferReviewPage.tsx`, `TreatmentOfferStatusPage.tsx`, and `TreatmentOfferAcceptedPage.tsx`.
3. **Verify Absence of Backend Treatment Offer Calls**:
   - Inspect `src/services/consultationService.ts`. Notice that `saveTreatmentOffer` writes solely to `localStorage` (lines 378–387).
   - Search for `/api/v1/doctors/treatment-offers` in `src/`. Confirm zero occurrences in the codebase despite its availability in `Postman collection/CareID-Staging.postman_collection.json`.
4. **Verify Quality Gates**:
   - Execute:
     ```powershell
     npm run type-check
     npm run lint
     npm run build
     ```
   - Confirm all three commands pass with code 0.
