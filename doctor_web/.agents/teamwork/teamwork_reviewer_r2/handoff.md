# Adversarial Review & QA Handoff Report (Round 2): Patient Selection & Treatment Offer Lifecycle

## 1. Executive Summary & Root Cause Analysis
During comprehensive adversarial review of the Round 1 implementation, the zero-latency hydration and `isResolvingPatient` state machine were verified as functional improvements. However, deep probing and adversarial stress testing of rapid history navigation, URL normalization, and downstream review pages exposed five critical flaws that undermined requirements R1, R2, and R3:

### Flaw 1: 1-Frame Stale Patient Demographic Leakage During Cross-Patient Switching
- **Input**: Doctor opens Treatment Offer for Patient Alpha, then navigates to Patient Beta (via browser Back/Forward history navigation, direct URL change, or in-app patient switching).
- **Expected**: Demographics for Patient Alpha (name, CID, age, DOB, blood group, allergies, insurance status) must be immediately purged and NEVER displayed while Patient Beta is resolving.
- **Actual**: `usePatientProfile` only scheduled state reset inside `useEffect`. Because `useEffect` executes after the component renders and commits to the DOM, on the first render with `patientId = Beta`, `patient` in state was still Patient Alpha. Furthermore, `TreatmentOfferCreatePage.tsx` did not verify whether `livePatient.id` matched `targetPatientId`. Consequently, Patient Alpha's full name, CID, and demographics were rendered for Patient Beta for 1 frame before `useEffect` cleared state. If an in-flight network request for Alpha completed later, it also risked overwriting Beta's state.
- **Root Cause**: Missing render-time synchronous state reset in `usePatientProfile` and absence of an authoritative `livePatient.id === targetPatientId` matching guard in `TreatmentOfferCreatePage.tsx`.

### Flaw 2: Demographic String Corruption: Malformed or Empty DOB Displayed Literal `"null yrs"`
- **Input**: A patient record without a date of birth or with an unparseable DOB string (e.g., `null`, `""`, or non-ISO string).
- **Expected**: Age displays gracefully as empty or omitted without corrupting the demographic badge.
- **Actual**: `calculateAge` returns `null` for unparseable dates. In `TreatmentOfferCreatePage.tsx`, `PatientDirectoryPage.tsx`, and `PatientProfilePage.tsx`, the code used string interpolation:
  ```ts
  `${calculateAge(patient.dateOfBirth)}`
  ```
  In JavaScript, `${null}` evaluates to the literal string `"null"`. The UI rendered:
  `null yrs Male • DOB: ...` in the patient context bar!
- **Root Cause**: Unsafe template interpolation without null-checking the `number | null` return value of `calculateAge`.

### Flaw 3: Direct URL / Uppercase UUIDs Triggered HTTP 404 from Live Backend
- **Input**: Navigating directly to `/treatment-offers/new/step-1?patientId=787E5187-7859-4320-BB1A-465A57DD086A` (uppercase or mixed-case UUID, common when copied from external medical systems or referral letters).
- **Expected**: Normalizes UUID and successfully resolves Marcus Doe (`787e5187-7859-4320-bb1a-465a57dd086a`) with HTTP 200.
- **Actual**: Backend PostgreSQL database returned HTTP 404 Not Found, causing the frontend to display:
  `Invalid patient identifier or profile not found: "787E5187-7859-4320-BB1A-465A57DD086A"`.
- **Root Cause**: `patientService.getDoctorPatientProfile` and `patientService.getPatientById` passed the raw unnormalized UUID string directly to `/api/v1/doctors/patients/:patientProfileId` without `.toLowerCase()` normalization.

### Flaw 4: Step 3 Review & Status Pages Navigated Without URL `patientId`, Breaking Refresh Durability & Containing Hardcoded Mocks
- **Input**: Doctor on Step 3 Review page (`/treatment-offers/:id/review`) clicks "Back to Edit Offer" or "Modify Offer Terms" from Status page, lands on `/treatment-offers/new/step-1`, then refreshes browser.
- **Expected**: Step 1 retains Marcus Doe across page refresh using the patient UUID in the URL as mandated by R2.
- **Actual**: `TreatmentOfferReviewPage.tsx` lines 279, 323, and 575 and `TreatmentOfferStatusPage.tsx` line 725 navigated to `/treatment-offers/new/step-1` with only `state: offer` (omitting `?patientId=...` from the URL). Upon browser refresh, transient `location.state` was wiped and the page fell back to `"No Patient Selected"`.
  Additionally:
  - Line 302 of `TreatmentOfferReviewPage.tsx` contained hardcoded route: `navigate('/patients/8472-9901/financing')` (mock ID).
  - Line 565 of `TreatmentOfferReviewPage.tsx` contained hardcoded clinician attestation text: `"transmitted to Robert's Care ID mobile application."`.
- **Root Cause**: Failure to append `?patientId=${encodeURIComponent(offer.patientId)}` during edit navigation and presence of hardcoded mock patient references.

### Flaw 5: In-Flight Demographic and Insurance Flicker from Insurance Financing Hub and Directory
- **Input**: Navigating from Insurance Financing Hub or Directory table row to Treatment Offer creation.
- **Expected**: Full demographics (DOB, insurance status, blood group, allergies) immediately render without layout shift or badge flicker while live verification occurs.
- **Actual**: `handleContinueToTreatmentOffer` in `InsuranceFinancingHubPage.tsx` and `handleStartConsult` in `PatientDirectoryPage.tsx` omitted `patientDob` and `insuranceStatus` from navigation state, causing the header badge to briefly display `"Self-Pay / Clinical Financing"` before flashing to `"Insured"` once the live API response completed.
- **Root Cause**: Incomplete state propagation in navigation handlers.

---

## 2. Changes Made
1. **`src/hooks/usePatients.ts`**:
   - Implemented render-time synchronous state reset in `usePatientProfile`:
     ```tsx
     const [prevPatientId, setPrevPatientId] = useState<string | undefined>(patientId);
     if (patientId !== prevPatientId) {
       setPrevPatientId(patientId);
       setPatient(null);
       setError(null);
       setIsLoading(Boolean(patientId?.trim()));
     }
     ```
   - Added `safePatient` return filter ensuring that `patient` is only returned if `patient.id.toLowerCase() === cleanId.toLowerCase()`, eliminating any possibility of stale patient data leaking across renders.
2. **`src/services/patientService.ts`**:
   - Normalized patient IDs to lowercase (`cleanId = patientProfileId.trim().toLowerCase()`) in `getDoctorPatientProfile` and `getPatientById`, resolving case sensitivity issues with backend PostgreSQL lookups.
3. **`src/pages/treatment-offers/TreatmentOfferCreatePage.tsx`**:
   - Added `matchingLivePatient` guard:
     ```tsx
     const matchingLivePatient = livePatient && (!targetPatientId || livePatient.id.toLowerCase() === targetPatientId.toLowerCase()) ? livePatient : null;
     ```
   - Fixed null coercion in `patientAge` calculation:
     ```tsx
     const calculatedAgeNum = matchingLivePatient?.dateOfBirth ? calculateAge(matchingLivePatient.dateOfBirth) : null;
     const patientAge = calculatedAgeNum !== null ? `${calculatedAgeNum}` : hasSelectedPatient ? activeHubPayload?.patientAge || '' : '';
     ```
   - Added fallback for `formattedDob` to check `activeHubPayload?.patientDob` during in-flight resolution.
   - Enhanced `isStateMatchingQuery` to case-insensitively match query parameters and reject state payloads that lack `patientId`.
   - Propagated `patientDob` into both draft and review submission payloads.
4. **`src/pages/treatment-offers/TreatmentOfferReviewPage.tsx`**:
   - Replaced all 3 occurrences of `navigate('/treatment-offers/new/step-1', { state: offer })` with `navigate(offer.patientId ? `/treatment-offers/new/step-1?patientId=${encodeURIComponent(offer.patientId)}` : '/treatment-offers/new/step-1', { state: offer })`.
   - Replaced hardcoded `navigate('/patients/8472-9901/financing')` with `navigate(offer.patientId ? `/patients/${encodeURIComponent(offer.patientId)}/financing` : '/treatment-offers')`.
   - Replaced hardcoded attestation string `"Robert's Care ID mobile application"` with dynamic `${offer.patientName || 'the patient'}'s Care ID mobile application`.
5. **`src/pages/treatment-offers/TreatmentOfferStatusPage.tsx`**:
   - Updated "Modify Offer Terms" button to navigate with `?patientId=${encodeURIComponent(offer.patientId)}`.
6. **`src/pages/financing/InsuranceFinancingHubPage.tsx`**:
   - Enriched `handleContinueToTreatmentOffer` with full demographics (`patientCid`, `patientGender`, `patientAge`, `patientBlood`, `patientAllergy`, `patientDob`, and `insuranceStatus`).
7. **`src/pages/patients/PatientDirectoryPage.tsx` & `PatientProfilePage.tsx` & `MedicalRecordsPage.tsx`**:
   - Safe-guarded `calculateAge` checks so `patientAge` is never set to `"null"`.
   - Enriched navigation payloads with `patientDob` and resolved `insuranceStatus`.
8. **`src/pages/treatment-offers/types.ts`**:
   - Added optional `patientDob?: string` to `TreatmentOfferState`.
9. **`tests/e2e/consultations/patient_selection_workflow.test.ts` & `consultationApiHelper.ts`**:
   - Normalized `getDoctorPatientProfile` endpoint URL to lowercase UUID.
   - Added 5 new adversarial test cases:
     - `AC-11`: Cross-patient rapid switching guarantees zero stale data leakage across transitions.
     - `AC-12`: Case-insensitive UUID matching in URL query parameter resolves identical backend patient profile.
     - `AC-13`: `calculateAge` null safety prevents displaying literal "null yrs" on malformed or empty DOB.
     - `AC-14`: Conflicting transient location.state with mismatched patientId is strictly ignored in favor of query param.
     - `AC-15`: Review and Status pages "Back to Edit Offer" propagates patientId query parameter to preserve refresh durability.

---

## 3. Verification Record
- **Quality Gates**:
  - `npm run type-check`: Passed (`tsc -b --noEmit`) with 0 errors.
  - `npm run lint`: Passed (`eslint .`) with 0 errors.
  - `npm run build`: Passed (`tsc -b && vite build`) in 5.67s.
- **Deep Verification (E2E Test Suites against Live API `https://360api.vnvision.in/api/v1`)**:
  - `node --experimental-strip-types tests/e2e/consultations/runner.ts --tier=1` executed 15 suites and **88/88 test cases passed** (100.0% pass rate in 103.71s).
  - All 17 acceptance criteria in `patient_selection_workflow.test.ts` passed:
    - AC-01: Authentic backend UUID capture from Patient Directory (Marcus Doe)
    - AC-02: Start Consult from Directory opens Treatment Offer with patient loaded (no "No Patient Selected")
    - AC-03: Start Consult from Patient Profile (/patients/:id) resolves and loads same patient
    - AC-04: New Consultation -> Select Patient from Directory resolves and loads same patient
    - AC-05: Page refresh preserves patient identity via URL patientId
    - AC-06: Direct URL navigation with valid patientId hydrates full demographics
    - AC-07: Direct URL navigation without patientId displays "No Patient Selected"
    - AC-08: Direct URL navigation with invalid patientId displays proper error handling without crashing
    - AC-08b: In-flight navigation with active hub payload provides instant zero-latency hydration without "No Patient Selected" flicker
    - AC-08c: Direct URL navigation with valid patientId exhibits resolving state before backend loads and hydrates without false "No Patient Selected"
    - AC-09: Switching Patient A -> Patient B clears previous patient state (no stale data)
    - AC-10: Submitting new treatment offer sends authentic backend patientProfileId UUID
    - AC-11: Cross-patient rapid switching guarantees zero stale data leakage across transitions
    - AC-12: Case-insensitive UUID matching in URL query parameter resolves identical backend patient profile
    - AC-13: calculateAge null safety prevents displaying literal "null yrs" on malformed or empty DOB
    - AC-14: Conflicting transient location.state with mismatched patientId is strictly ignored in favor of query param
    - AC-15: Review and Status pages "Back to Edit Offer" propagates patientId query parameter to preserve refresh durability
- **UI Preservation Confirmation**:
  - All Figma layout nodes, Tailwind utility classes, typography, colors, and button placements remain strictly unchanged.

---

## 4. Known Issues
- `None` — All 88 test cases pass against the live backend; type-check, lint, and build quality gates pass cleanly with zero errors.
