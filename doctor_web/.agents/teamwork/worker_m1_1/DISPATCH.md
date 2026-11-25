## 2026-11-09T07:19:36Z
You are the Implementation Worker for Milestone 1: API Client Multipart & Patient Context Resolution.
Working directory: d:\New folder\New folder\doctor web\doctor-web-frontend-main
Your state folder: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\worker_m1_1\
Original request path: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md
Project specification path: d:\New folder\New folder\doctor web\doctor-web-frontend-main\PROJECT.md

MANDATORY FIRST STEP:
Read `ORIGINAL_REQUEST.md` and `PROJECT.md` before starting work. Do NOT summarize or filter them.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You own exclusively:
- `src/services/apiClient.ts`
- `src/services/patientService.ts`
- `src/pages/ocr/MedicalRecordUploadPage.tsx`
Do NOT edit any other source code files.

INPUT ARTIFACTS TO READ:
1. `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m1_1\handoff.md`
2. `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m1_2\handoff.md`
3. `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m1_3\handoff.md`

YOUR TASKS:
1. Update `src/services/apiClient.ts`:
   - Support `FormData` in `apiRequest()` by omitting the `Content-Type` header so the Fetch runtime sets the proper `multipart/form-data; boundary=...`. Ensure 401 token refresh retry logic also respects this.
   - Update `post`, `put`, `patch` to avoid `JSON.stringify()` when `body instanceof FormData` (or Blob/Buffer).
   - Export `postFormData<T>(endpoint: string, formData: FormData, headers?: HeadersInit): Promise<ApiResponse<T>>`.
2. Update `src/services/patientService.ts`:
   - Implement `getDoctorPatientProfile(patientProfileId: string)` using the authoritative endpoint `GET /api/v1/doctors/patients/:patientProfileId`.
   - Map real demographics: `firstName`, `lastName`, `patientNumber` (Health ID / MRN), `dateOfBirth`, `gender`, `bloodGroup`, `phoneNumber`, `currentAddress`.
   - Completely eliminate broken calls to `/api/v1/admin/patients/:id` (which returned 403) and remove any fake demographic string synthesis (`"Patient #..."`, `"Not Specified"`).
3. Update `src/pages/ocr/MedicalRecordUploadPage.tsx`:
   - Ensure patient context resolution handles `searchParams.get('patientId') || searchParams.get('patientProfileId') || '787e5187-7859-4320-bb1a-465a57dd086a'`.
   - Bind the live demographics to the patient summary bar, header, and demographics view.
   - Ensure Figma layout and styling are preserved exactly.

VERIFICATION REQUIREMENTS:
Run:
- `npm run type-check`
- `npm run lint`
- `npm run build`
All must pass with 0 errors.
Additionally, execute a verification script confirming that calling `patientService.getDoctorPatientProfile('787e5187-7859-4320-bb1a-465a57dd086a')` retrieves real demographics from `https://360api.vnvision.in`.

OUTPUT REQUIREMENTS:
Write your complete report to:
`d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\worker_m1_1\handoff.md`.
Then send a completion message with summary of changes and verification results.
