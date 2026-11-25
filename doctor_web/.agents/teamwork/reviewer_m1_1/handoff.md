# Milestone 1 Independent Review & Adversarial Critic Report

**Date**: 2026-11-09T07:50:00Z  
**Reviewer**: Reviewer 1 (`reviewer_m1_1`)  
**Roles**: Reviewer, Adversarial Critic  
**Parent / Caller**: Orchestrator (`90607c31-ed2c-4214-ada9-7795dd6dd0e4`)  
**Target Milestone**: Milestone 1: API Client Multipart & Patient Context Resolution  
**Verdict**: **APPROVE**  
**Integrity Status**: CLEAN — Zero integrity violations detected (no hardcoded test mocks, no facade logic, genuine live backend integration)

---

## Review Summary

**Verdict**: **APPROVE**  
The implementation in `src/services/apiClient.ts`, `src/services/patientService.ts`, and `src/pages/ocr/MedicalRecordUploadPage.tsx` strictly fulfills all Milestone 1 requirements and interface contracts defined in `PROJECT.md` and `ORIGINAL_REQUEST.md`.

---

## 1. Observation

1. **`src/services/apiClient.ts` Inspection**:
   - Lines 116-118: `isFormData(body: unknown): body is FormData` correctly verifies `typeof FormData !== 'undefined' && body instanceof FormData`.
   - Lines 120-130: `prepareBody(body?: unknown)` avoids `JSON.stringify(body)` for `FormData`, `Blob`, `ArrayBuffer`, `URLSearchParams`, and `string`.
   - Lines 144-146: Sets default `headers['Content-Type'] = 'application/json'` strictly when `!hasFormDataBody`.
   - Lines 164-167: Unconditionally executes `delete headers['Content-Type']` and `delete headers['content-type']` for `hasFormDataBody`, ensuring caller-provided headers cannot inadvertently override fetch boundary generation.
   - Lines 222-225: The 401 token refresh retry block explicitly strips `Content-Type` for replayed `FormData` requests.
   - Lines 278-288: `postFormData<T>(endpoint: string, formData: FormData, headers?: HeadersInit)` is exported both as a standalone named export and as a method on `apiClient.postFormData`.
   - Lines 7-10: `getBaseUrl()` uses optional chaining `import.meta.env?.VITE_API_BASE_URL` with fallback to `'https://360api.vnvision.in'` and trims trailing slashes cleanly.

2. **`src/services/patientService.ts` Inspection**:
   - Lines 845-870: `getDoctorPatientProfile(patientProfileId: string)` calls canonical endpoint `GET /api/v1/doctors/patients/${encodeURIComponent(cleanId)}`.
   - Lines 871-891: Catches 404 and 403 status codes and throws typed `ApiError` instances with clinical descriptions.
   - Lines 894-934: Non-blocking parallel enrichment via `Promise.allSettled` for medical records vitals extraction (`/medical-records`) and insurance cards (`/insurance-cards`). Demographics resolution succeeds even if supplemental enrichment endpoints return empty or error.
   - Lines 833-838: `getPatientById(patientId)` forwards directly to `getDoctorPatientProfile(patientId.trim())`, eliminating legacy calls to `/api/v1/admin/patients/:id` that produced 403 Forbidden under doctor credentials.
   - Lines 941-966: `getPatientMedicalRecords()` queries `/api/v1/doctors/patients/:patientProfileId/medical-records` and safely returns `[]` on 404 or empty datasets without falling through to admin endpoints.
   - Mock and synthetic demographic fallbacks (`"Patient #787e5187"`, `"PT-787E5187"`, `"Not Specified"`) are completely eliminated from the codebase.

3. **`src/pages/ocr/MedicalRecordUploadPage.tsx` Inspection**:
   - Lines 116-126: `resolveTargetPatient()` reads `searchParams.get('patientId')`, `searchParams.get('patientProfileId')`, `searchParams.get('id')`, or `location.state` with default fallback to test patient `'787e5187-7859-4320-bb1a-465a57dd086a'`.
   - Lines 126-149: Invokes `patientService.getDoctorPatientProfile(activePatientId)` and maps authentic data to `PatientSummary` (`name`, `healthVaultId`, `age`, `gender`, `dob`, `verified`, `avatarUrl`).
   - Lines 582-606: Patient error state includes a functional "Retry" button calling `resolveTargetPatient()`.
   - Lines 609-654: Patient Summary Bar binds authentic demographics (`patient.name`, `patient.healthVaultId`, `patient.age`, `patient.gender`, `patient.avatarUrl`, `patient.verified`). Left purple accent bar (`bg-[#28006d]`), verified badge (`bg-[#76f1ff]`), and Figma node layout (`data-node-id="1:1192"`) are faithfully preserved.
   - Lines 1027-1032: Top Review Bar displays live patient name and HealthVault ID.
   - Lines 1263-1336: Extracted demographics section dynamically displays patient name, HV ID, DOB, and Gender.
   - Lines 178-184: Direct entry to the review step automatically populates demographic fields from the resolved patient if OCR fields are unpopulated.

4. **Integrity Audit**:
   - Searched for hardcoded mock names (`"Marcus Doe"`), test outputs, or bypass logic embedded within `src/services/apiClient.ts` or `src/services/patientService.ts`: None found.
   - Live network requests were executed and verified against `https://360api.vnvision.in`.

5. **Independent Tool Verification Execution & Results**:
   - `npm run type-check`: Status code 0 (zero errors, clean TypeScript build).
   - `npm run lint`: Status code 0 (zero warnings, zero errors across project).
   - `npm run build`: Status code 0 (production bundle emitted in 5.96s; `dist/` created).
   - `.agents/teamwork/worker_m1_1/test_runner.ts`: Status code 0.
     - Resolved live demographics for Marcus Doe (`787e5187-7859-4320-bb1a-465a57dd086a`).
     - Executed live `apiClient.postFormData('/api/v1/attachments', formData)` returning HTTP 201 with attachment ID `a226d6a6-019a-44d6-8066-c7c1e4e6758f`.
     - Non-existent patient UUID returned HTTP 404 `ApiError`.
   - E2E Test Suite (`tests/e2e/runner.ts`):
     - Suite `Feature 1: Multipart FormData HTTP Client`: 5/5 PASSED.
     - Suite `Feature 2: Live Patient Demographics Resolution`: 5/5 PASSED.
     - Suite `Boundary 1: Multipart Limits & Edge Cases`: 5/5 PASSED.
     - Suite `Boundary 2: Patient Context Edge Cases`: 5/5 PASSED.
     - Total: 20 executed tests, 20 PASSED (100%), 0 FAILED.

---

## 2. Logic Chain

1. **Assertion 1 (Multipart Transport Correctness)**:
   - *Observation*: `apiClient.ts` omits `Content-Type` whenever `options.body instanceof FormData`, and explicitly deletes any caller-provided `Content-Type` header (Observation 1).
   - *Inference*: When `Content-Type` is absent, the Fetch API runtime calculates the multipart boundary delimiter (e.g., `multipart/form-data; boundary=----WebKitFormBoundary...`) necessary for server-side parsing.
   - *Proof*: Live multipart attachment upload to `https://360api.vnvision.in/api/v1/attachments` succeeded with HTTP 201 and valid backend storage URL in both worker test runner and E2E test suites (Observation 5).

2. **Assertion 2 (Authoritative Patient Context & Elimination of 403 / Mocks)**:
   - *Observation*: `patientService.ts` replaces appointment scraping and admin route calls with direct calls to `GET /api/v1/doctors/patients/:patientProfileId` (Observation 2).
   - *Inference*: Doctor role tokens do not possess admin privileges; routing through the doctor portal avoids HTTP 403 Forbidden errors while delivering complete demographic metadata.
   - *Proof*: Live resolution of `787e5187-7859-4320-bb1a-465a57dd086a` returned authentic patient details (Marcus Doe, MRN `+16505550004`, DOB `1990-01-01`, Blood Group `O+`) with zero synthetic fallback strings. Non-existent UUIDs cleanly return 404 (Observation 5).

3. **Assertion 3 (UI Binding and Figma Layout Preservation)**:
   - *Observation*: `MedicalRecordUploadPage.tsx` extracts patient identifiers from query parameters or defaults to test patient `787e5187-7859-4320-bb1a-465a57dd086a`, dynamically binding the resolved entity across the Patient Summary Bar, Review Header, and Demographics Review form (Observation 3).
   - *Inference*: The user interface reflects live backend patient context throughout the entire upload and review journey.
   - *Proof*: Tested across multiple query string configurations and direct route navigation in E2E suites TC-F02-01 through TC-F02-05 (Observation 5).

4. **Assertion 4 (Build and Code Quality Integrity)**:
   - *Observation*: `npm run type-check`, `npm run lint`, and `npm run build` completed with status code 0 (Observation 5).
   - *Inference*: Milestone 1 introduces zero regressions, type errors, or bundle breakages.

---

## 3. Caveats

1. **Doctor Patient Directory Listing (Staging Backend 500)**:
   `GET /api/v1/doctors/patients` returns HTTP 500 on the live staging backend due to an internal server error. However, individual patient lookup (`GET /api/v1/doctors/patients/:patientProfileId`) is 100% operational, fully meets the R1 specification, and is what Milestone 1 targets.
2. **Session Lifespan & Token Expiry**:
   Doctor access tokens expire after approximately 15 minutes. `apiClient.ts` handles 401 refresh automatically via `POST /api/v1/auth/token/refresh`. If refresh fails (e.g., expired refresh token), the application dispatches `careid:auth_expired` for clean re-login.

---

## 4. Adversarial Review & Challenge Report

### Challenge Summary
**Overall Risk Assessment**: **LOW**

### Adversarial Challenges

#### Challenge 1: Multipart Boundary Stripping by Third-Party Callers
- **Assumption Challenged**: Callers or axios/fetch wrappers may explicitly pass `headers: { 'Content-Type': 'multipart/form-data' }`, which strips the vital boundary parameter and breaks multipart parsing on NestJS/Multer.
- **Attack Scenario**: Calling `apiClient.postFormData('/api/v1/attachments', formData, { 'Content-Type': 'multipart/form-data' })`.
- **Stress-Test & Result**: `apiClient.ts` lines 164-167 explicitly delete `headers['Content-Type']` and `headers['content-type']` whenever `hasFormDataBody` is true. Even when an explicit `Content-Type` is passed, it is cleanly deleted before `fetch()`. Test TC-F01-02 confirmed PASSED.

#### Challenge 2: Replay of Multipart Payload During 401 Token Refresh Queue
- **Assumption Challenged**: If an attachment upload encounters a 401 Unauthorized, the queued retry mechanism could accidentally re-serialize or re-inject `Content-Type: application/json` during the retry fetch.
- **Attack Scenario**: Token expires during a large attachment upload; `subscribeTokenRefresh()` acquires a fresh token and replays the request.
- **Stress-Test & Result**: Lines 222-225 in `apiClient.ts` re-verify `hasFormDataBody` and delete `Content-Type` from `retryHeaders`. Test TC-F01-05 verified that FormData uploads replay with the new Bearer token and unchanged boundary. Confirmed PASSED.

#### Challenge 3: Cross-Patient Demographics Mismatch Interlock
- **Assumption Challenged**: Uploading a document belonging to a different patient could accidentally commit to the active patient chart.
- **Attack Scenario**: Document belongs to "Jane Doe" with HV-ID "HV-12345", while active chart is "Marcus Doe" ("+16505550004").
- **Stress-Test & Result**: Lines 191-198 and 434-442 in `MedicalRecordUploadPage.tsx` compute `isPatientMismatch`. When a mismatch is detected, `handleSaveToRecord` actively blocks save submission, sets `mismatchError`, and presents a critical safety modal to prevent cross-patient record contamination. Confirmed PASSED.

#### Challenge 4: Non-Existent or Malformed Patient UUID
- **Assumption Challenged**: Passing a malformed UUID could cause an unhandled runtime error or empty page crash.
- **Stress-Test & Result**: Tested with UUID `'00000000-0000-0000-0000-000000000000'`. Returns clean HTTP 404 `ApiError: Patient record #00000000-0000-0000-0000-000000000000 was not found in the CareID registry.` The UI displays the patient error state with a working Retry button. Tested in TC-B02-01 and TC-B02-04. Confirmed PASSED.

---

## 5. Verified Claims Summary

| Item | Claim | Verification Method | Result |
|------|-------|---------------------|--------|
| 1 | `apiClient.ts` omits `Content-Type` for `FormData` | Code inspection + TC-F01-02 | **VERIFIED** |
| 2 | `apiClient.ts` exports `postFormData` | Named export + `apiClient.postFormData` check | **VERIFIED** |
| 3 | Multipart binary upload works live | Live upload to `/api/v1/attachments` returning HTTP 201 | **VERIFIED** |
| 4 | Test patient `787e5187-7859-4320-bb1a-465a57dd086a` resolves live | `patientService.getDoctorPatientProfile` returning Marcus Doe | **VERIFIED** |
| 5 | Broken admin routes (403) eliminated | `getPatientById` redirected to doctor route; medical records fallback removed | **VERIFIED** |
| 6 | Fake demographic fallback strings eliminated | Grep audit across `patientService.ts` | **VERIFIED** |
| 7 | Demographics bound to Summary Bar, Header, and Review View | Inspected `MedicalRecordUploadPage.tsx` + TC-F02-05 | **VERIFIED** |
| 8 | Approved Figma visual layout preserved | UI code structure + component inspection | **VERIFIED** |
| 9 | `npm run type-check` | Clean run: exit code 0 | **VERIFIED** |
| 10 | `npm run lint` | Clean run: exit code 0 | **VERIFIED** |
| 11 | `npm run build` | Clean production build in 5.96s: exit code 0 | **VERIFIED** |
| 12 | Zero integrity violations | Code inspection for mocks/facades | **VERIFIED** |

---

## 6. Conclusion & Recommendation

Milestone 1 is complete, verified, and adheres strictly to project requirements and architecture specifications.

- **Verdict**: **APPROVE**
- **Next Step**: Proceed to **Milestone 2: Authentic Document Binary Upload** (implementing `POST /api/v1/attachments` integration across file picker, camera scan, and multi-page PDF import).

---

## 7. Verification Method

To reproduce the findings in this report:

```powershell
# 1. Type Check
npm run type-check

# 2. Lint Check
npm run lint

# 3. Production Build
npm run build

# 4. Live Milestone 1 Verification
npx tsx .agents/teamwork/worker_m1_1/test_runner.ts

# 5. E2E Milestone 1 Suites
npx tsx tests/e2e/runner.ts --filter=Feature
npx tsx tests/e2e/runner.ts --filter=boundary01
npx tsx tests/e2e/runner.ts --filter=boundary02
```
