# Milestone 1 Investigation Report: Patient Context Resolution & UI Banner Integration

**Target**: `src/pages/ocr/MedicalRecordUploadPage.tsx` and associated components  
**Milestone**: Milestone 1 — API Client Multipart & Patient Context Resolution  
**Author**: Explorer 3  
**Date**: 2026-11-09  

---

## 1. Executive Summary

This investigation examines the end-to-end patient context pipeline driving the Upload Health Record page (`/records/upload` and related `/records/ocr/*` routes). 

Key discoveries:
1. **Context Passing Protocol**: In the CareID Doctor Web Portal, there is no global `PatientContext` React context provider (only `AuthContext` exists). Patient context is passed via URL search parameters (`?patientId=...`), React Router navigation state (`location.state`), or resolved dynamically from doctor-assigned directory patients.
2. **Missing Parameter Keys**: `MedicalRecordUploadPage.tsx` currently only inspects `searchParams.get('patientId')`. It misses `patientProfileId` and `id`, and does not fall back to the project canonical test patient `787e5187-7859-4320-bb1a-465a57dd086a` when directly accessed without parameters and when the patient directory is empty.
3. **Upstream Demographics Blocker in `patientService.ts`**: `patientService.getDoctorPatientProfile` was previously synthesizing dummy demographics from `/api/v1/appointments/doctor/me` and defaulting to `'Patient #' + patientId.slice(0, 8)` and `'Age N/A'` when the patient was not in the appointment list, completely bypassing the authoritative Postman endpoint `GET /api/v1/doctors/patients/:patientProfileId`. When resolved via that endpoint, genuine patient demographics (Full Name: John Doe, MRN: HV-..., DOB: 1985-04-12, Gender: MALE, Status: ACTIVE) flow into `MedicalRecordUploadPage`.
4. **Mock / Fallback Audit**: 
   - `avatarUrl: patientAvatarOcr` hardcoded in `resolveTargetPatient` (should prioritize `profile.photoUrl`).
   - Verified check checked only `profileStatus === 'COMPLETED'` and `userStatus === 'ACTIVE'`, missing `status === 'ACTIVE'` which the live backend returns.
   - Missing query parameter propagation in navigation buttons in `MedicalRecordsPage.tsx` and `AppointmentDetailsPage.tsx`.
5. **UI Integration**: `MedicalRecordUploadPage` renders patient context across 8 critical locations:
   - Top breadcrumb chain
   - Figma Node 1:1192 Patient Summary Card
   - Recent Uploads table header
   - OCR Review exit navigation
   - Document viewer cross-patient mismatch warning banner
   - Demographics form pre-fill & fallback
   - Medical record submission payload (`patientService.createMedicalRecord(patient.id, ...)`)
   - Figma Node 1:1381 Patient Safety Interlock Mismatch Hard Stop Modal

---

## 2. Patient Context in `/records/upload`

### 2.1 Route Architecture & Layout Hierarchy
In `src/routes/index.tsx`:
```tsx
// Unified Clinical Portal Route Group
{
  element: <ProtectedLayout />,
  children: [
    ...
    // 4. OCR & Document Processing
    { path: '/records/upload', element: <MedicalRecordUploadPage /> },
    { path: '/records/ocr', element: <MedicalRecordUploadPage /> },
    { path: '/records/ocr/upload', element: <MedicalRecordUploadPage /> },
    { path: '/records/ocr/processing', element: <MedicalRecordUploadPage /> },
    { path: '/records/ocr/review', element: <MedicalRecordUploadPage /> },
    { path: '/records/ocr/success', element: <MedicalRecordUploadPage /> },
    { path: '/ocr/upload', element: <MedicalRecordUploadPage /> },
    { path: '/ocr/verify/:id', element: <MedicalRecordUploadPage /> },
  ]
}
```

In `src/routes/index.tsx`, `ProtectedLayout` returns `<PatientLayout />`.  
In `src/components/layout/PatientLayout.tsx`:
```tsx
const isSpecialWorkstation =
  location.pathname.includes('/ocr') ||
  location.pathname.includes('/records/upload') ||
  location.pathname.includes('/records/ocr') ||
  ...
```
When `isSpecialWorkstation` is `true`:
- The general layout header (`TopNavBar` with global search, notifications, settings) is hidden (`{!isSpecialWorkstation && <header ... />}`).
- The main content padding is removed (`p-0` instead of `p-6`).
- Full width is allocated (`w-full` instead of `max-w-[1440px]`).

This design gives `MedicalRecordUploadPage.tsx` complete architectural control over its patient ribbon, step header, and clinical canvas.

### 2.2 Absence of Global `PatientContext`
A search for `createContext` across the entire codebase confirmed that `src/context/AuthContext.tsx` is the sole React Context. There is NO `PatientContext.tsx`.

Therefore, patient context resolution must be handled through:
1. Primary: URL search parameters (`searchParams.get('patientId')`, `searchParams.get('patientProfileId')`, `searchParams.get('id')`).
2. Secondary: React Router `location.state` (`state?.patientId`, `state?.patientProfileId`, `state?.patient?.id`).
3. Tertiary: Route params (`useParams()`, e.g., `:id` in `/ocr/verify/:id`).
4. Quaternary: First item from `patientService.listPatients({ limit: 5 })`.
5. Canonical Fallback: Project specification test patient `DEFAULT_TEST_PATIENT_ID = '787e5187-7859-4320-bb1a-465a57dd086a'`.

### 2.3 Resolving Test Patient `787e5187-7859-4320-bb1a-465a57dd086a`
Currently, `MedicalRecordUploadPage.tsx:116-129` performs:
```tsx
const urlPatientId =
  searchParams.get('patientId') ||
  (location.state as { patientId?: string })?.patientId ||
  (location.state as { patient?: { id?: string } })?.patient?.id;

let activePatientId = urlPatientId;

if (!activePatientId) {
  const listRes = await patientService.listPatients({ limit: 5 });
  if (listRes.data && listRes.data.length > 0) {
    activePatientId = listRes.data[0].id;
  }
}
```
**Deficiency**:
- If a tester or link uses `?patientProfileId=787e5187-7859-4320-bb1a-465a57dd086a` (matching the Postman variable name `:patientProfileId`), `urlPatientId` is `null`.
- If the doctor session does not have patients in `listPatients()`, `activePatientId` remains `undefined`, triggering an error: `No patient context selected. Please select a patient from the directory.`
- It does not fall back to the canonical test patient `787e5187-7859-4320-bb1a-465a57dd086a` specified in `ORIGINAL_REQUEST.md`.

**Required Solution**:
```tsx
export const DEFAULT_TEST_PATIENT_ID = '787e5187-7859-4320-bb1a-465a57dd086a';

const urlPatientId =
  searchParams.get('patientId') ||
  searchParams.get('patientProfileId') ||
  searchParams.get('id') ||
  (location.state as { patientId?: string; patientProfileId?: string })?.patientId ||
  (location.state as { patientId?: string; patientProfileId?: string })?.patientProfileId ||
  (location.state as { patient?: { id?: string } })?.patient?.id;

let activePatientId = urlPatientId;

if (!activePatientId) {
  try {
    const listRes = await patientService.listPatients({ limit: 5 });
    if (listRes.data && listRes.data.length > 0) {
      activePatientId = listRes.data[0].id;
    }
  } catch {
    // Graceful fallback to default test patient
  }
}

// Fallback to canonical test patient ID
if (!activePatientId) {
  activePatientId = DEFAULT_TEST_PATIENT_ID;
}
```
*Note on Boundary Testing*: When an invalid or non-existent patient ID is explicitly provided in the URL (e.g. `?patientId=invalid-uuid-0000`), `urlPatientId` is non-empty, so it attempts to fetch that ID, fails at backend with 404, sets `patientError`, and renders the UI error alert as expected.

---

## 3. UI Demographics Display Locations in `MedicalRecordUploadPage.tsx`

| Location | Component / Element | Displayed Demographics | Source |
|---|---|---|---|
| **1. Step 1: Upload Card** | Figma 1:1192 Patient Summary Bar (`lines 592-638`) | • Full Name (`patient.name`)<br>• Verified Status (`patient.verified`)<br>• Health ID / MRN (`patient.healthVaultId`)<br>• Age (`patient.age`)<br>• Gender (`patient.gender`)<br>• Avatar (`patient.avatarUrl`) | `PatientSummary` derived from `profile` |
| **2. Step 1: Recent Uploads** | Table Header Subtitle (`lines 811-815`) | `Target Chart: {patient.name} ({patient.healthVaultId})` | `patient.name`, `patient.healthVaultId` |
| **3. Step 1: Breadcrumbs** | Navigation chain (`lines 528-555`) | Link to Patient Profile: `/patients/${patient.id}`<br>Link to Medical Records: `/records?patientId=${patient.id}` | `patient.id` |
| **4. Step 3: Review Header** | Exit Review Action (`lines 1010-1018`) | `onClick={() => navigate('/records?patientId=' + patient.id)}` | `patient.id` |
| **5. Step 3: Safety Banner** | Mismatch Warning Box (`lines 1173-1222`) | Target Chart Name (`patient.name`) vs Extracted Document Name (`extractedName`)<br>Target Chart ID (`patient.healthVaultId`) vs Extracted ID (`extractedHvId`) | Interlock safety check |
| **6. Step 3: Demographics Form** | Section 1 Inputs (`lines 1232-1310`) | Inputs for Patient Name, HV ID, DOB, Gender. Populated by `parseOcrFields()` with fallbacks to `patient.name`, `patient.healthVaultId`, `patient.dob`, `patient.gender`. | Editable form state |
| **7. Step 4: Success Card** | Success Confirmation (`lines 1520-1532`) | `Patient: {patient?.name} ({patient?.healthVaultId})` | `patient.name`, `patient.healthVaultId` |
| **8. Mismatch Modal** | Safety Hard Stop Modal (`lines 1563-1657`) | `Target Active Patient Chart`: `{patient.name}`, `{patient.healthVaultId}`, `{patient.age} • {patient.gender}`, `Verified Active Chart` badge | EHR safety interlock |

---

## 4. Verification and Removal of Mock / Placeholder Patient Values

### 4.1 Upstream Dummy Profile Generation in `patientService.ts`
Investigation of `patientService.ts` (lines 830-925) revealed that `getDoctorPatientProfile` did not call `GET /api/v1/doctors/patients/:patientProfileId`. Instead:
1. It queried `/api/v1/appointments/doctor/me`.
2. If patient was absent from doctor appointments, it created a mock profile:
   ```typescript
   fullName: patientDemographics.fullName || `Patient #${patientId.slice(0, 8)}`,
   patientNumber: patientDemographics.patientNumber || `PT-${patientId.slice(0, 8).toUpperCase()}`,
   dateOfBirth: undefined,
   gender: 'Not Specified'
   ```
This caused any patient (including test patient `787e5187-7859-4320-bb1a-465a57dd086a`) to display placeholder values like "Patient #787E5187" and "Age N/A".  
*Milestone 1 Explorer 2 is addressing `patientService.ts` to call the genuine endpoint `GET /api/v1/doctors/patients/:patientProfileId`.*

### 4.2 In-Component Mock / Placeholder Values in `MedicalRecordUploadPage.tsx`
1. **Hardcoded Avatar**:
   `avatarUrl: patientAvatarOcr` (line 146).
   *Fix*: Replace with `avatarUrl: profile.photoUrl || patientAvatarOcr`.
2. **Partial Verified Check**:
   `verified: profile.profileStatus === 'COMPLETED' || profile.userStatus === 'ACTIVE'` (line 145).
   In the Postman collection and backend schema, the status field on `GET /api/v1/doctors/patients/:patientProfileId` is `status: 'ACTIVE'`.
   *Fix*: Add `profile.status === 'ACTIVE'`.
3. **Hardcoded Fallback Attachment ID**:
   `medicalAttachmentId: 'attachment-uuid-1'` in `handleStartProcessing` (line 275).
   *(Documented for Milestone 2 / 3 when authentic upload is wired).*
4. **Synthetic CBC Rows in `types.ts`**:
   Lines 290-296 of `types.ts` append hardcoded CBC rows (`Hemoglobin: 13.2`, etc.) when no fields are parsed.
   *(Documented for Milestone 4).*

### 4.3 Missing Patient ID Propagation in Caller Pages
1. **`src/pages/records/MedicalRecordsPage.tsx`**:
   Line 573:
   ```tsx
   <button type="button" onClick={() => navigate('/records/upload')} ...>
     <Upload className="size-4 text-[#5b14b8]" />
     <span>Upload Record</span>
   </button>
   ```
   When an active patient is selected on `MedicalRecordsPage` (`activePatientId`), clicking "Upload Record" navigates to `/records/upload` without the `?patientId=` query parameter!
   *Fix*: Update to:
   ```tsx
   onClick={() => navigate(activePatientId ? `/records/upload?patientId=${activePatientId}` : '/records/upload')}
   ```
2. **`src/pages/treatment-offers/AppointmentDetailsPage.tsx`**:
   Line 451:
   ```tsx
   onClick={() => navigate('/records/upload')}
   ```
   *Fix*: Update to:
   ```tsx
   onClick={() => navigate(offer.patientId ? `/records/upload?patientId=${offer.patientId}` : '/records/upload')}
   ```

---

## 5. State Handling Design (Loading, Loaded, Error)

The component lifecycle must robustly handle three patient resolution states:

```
                  ┌────────────────────────┐
                  │ Component Mounts       │
                  └───────────┬────────────┘
                              │
                              ▼
                  ┌────────────────────────┐
                  │ patientLoading = true  │
                  │ patientError = null    │
                  └───────────┬────────────┘
                              │
                    Fetch Profile via API
                              │
             ┌────────────────┴────────────────┐
             │                                 │
             ▼ Success                         ▼ Error (404/403/Net)
┌─────────────────────────┐       ┌─────────────────────────┐
│ patient = profileData   │       │ patient = null          │
│ patientLoading = false  │       │ patientError = err.msg  │
│ loadRecentRecords()     │       │ patientLoading = false  │
└─────────────────────────┘       └─────────────────────────┘
             │                                 │
             ▼                                 ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│ Render Patient Card     │       │ Render Amber Alert Box  │
│ Enable Upload Dropzone  │       │ Offer "Retry" &         │
│ Enable Camera Capture   │       │ "Choose Patient" CTAs   │
└─────────────────────────┘       │ Block OCR Submission    │
                                  └─────────────────────────┘
```

### 5.1 Loading State
- State: `patientLoading === true`.
- UI: Display centered loading box:
  ```tsx
  <div className="bg-white border border-[#e7e8e9] rounded-[12px] p-5 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] flex items-center justify-center gap-3 py-8">
    <Loader2 className="w-6 h-6 animate-spin text-[#5b14b8]" />
    <span className="text-sm text-[#494552]">Loading authenticated patient chart...</span>
  </div>
  ```
- Guard: Prevent user from triggering OCR or file processing while patient chart is unresolved.

### 5.2 Error State
- State: `patientError !== null && !patientLoading`.
- UI: Display amber alert notification box with action buttons:
  - Button 1: "Retry" — triggers `resolveTargetPatient()`.
  - Button 2: "Choose Patient" — navigates to `/patients`.
- Guard: In `handleStartProcessing` or `processSelectedFile`:
  ```tsx
  if (!patient) {
    setUploadError('Active patient chart required. Please select or verify a patient before processing documents.');
    return;
  }
  ```

### 5.3 Loaded State
- State: `patient !== null && !patientLoading`.
- UI: Render Figma Node 1:1192 Patient Summary Bar.
- Trigger: Automatically trigger `loadPatientRecentRecords(profile.id)`.

---

## 6. Concrete Implementation Proposals & Code Diffs

### Proposal 1: `src/pages/ocr/MedicalRecordUploadPage.tsx`
Enhance `resolveTargetPatient` to check `patientProfileId` and `id`, fall back to canonical test patient `DEFAULT_TEST_PATIENT_ID`, map `profile.photoUrl` and `profile.status`, and add Retry button to error UI.

```diff
--- a/src/pages/ocr/MedicalRecordUploadPage.tsx
+++ b/src/pages/ocr/MedicalRecordUploadPage.tsx
@@ -49,6 +49,8 @@
   previewUrl?: string;
 }
 
+export const DEFAULT_TEST_PATIENT_ID = '787e5187-7859-4320-bb1a-465a57dd086a';
+
 export const MedicalRecordUploadPage: React.FC = () => {
   const navigate = useNavigate();
   const location = useLocation();
@@ -115,19 +117,29 @@
     try {
       const urlPatientId =
         searchParams.get('patientId') ||
-        (location.state as { patientId?: string })?.patientId ||
+        searchParams.get('patientProfileId') ||
+        searchParams.get('id') ||
+        (location.state as { patientId?: string; patientProfileId?: string })?.patientId ||
+        (location.state as { patientId?: string; patientProfileId?: string })?.patientProfileId ||
         (location.state as { patient?: { id?: string } })?.patient?.id;
 
       let activePatientId = urlPatientId;
 
       if (!activePatientId) {
         // Fetch doctor-assigned patients or patient list to get the active patient context
-        const listRes = await patientService.listPatients({ limit: 5 });
-        if (listRes.data && listRes.data.length > 0) {
-          activePatientId = listRes.data[0].id;
+        try {
+          const listRes = await patientService.listPatients({ limit: 5 });
+          if (listRes.data && listRes.data.length > 0) {
+            activePatientId = listRes.data[0].id;
+          }
+        } catch {
+          // Directory list lookup failed, fall through to canonical test patient
         }
       }
 
+      // Fall back to canonical test patient if no context is provided
+      if (!activePatientId) {
+        activePatientId = DEFAULT_TEST_PATIENT_ID;
+      }
+
       if (activePatientId) {
         const profile = await patientService.getDoctorPatientProfile(activePatientId);
         const ageNum = calculateAge(profile.dateOfBirth);
@@ -142,8 +154,11 @@
           healthVaultId: formattedHvId,
           age: ageStr,
           gender: profile.gender || 'Not Specified',
           dob: profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-US') : undefined,
-          verified: profile.profileStatus === 'COMPLETED' || profile.userStatus === 'ACTIVE',
-          avatarUrl: patientAvatarOcr,
+          verified:
+            profile.status === 'ACTIVE' ||
+            profile.profileStatus === 'COMPLETED' ||
+            profile.userStatus === 'ACTIVE',
+          avatarUrl: profile.photoUrl || patientAvatarOcr,
         };
         setPatient(summary);
 
@@ -580,12 +595,21 @@
               <div className="flex items-center gap-2">
                 <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                 <span>{patientError}</span>
               </div>
-              <button
-                type="button"
-                onClick={() => navigate('/patients')}
-                className="font-semibold text-[#5b14b8] hover:underline cursor-pointer"
-              >
-                Choose Patient
-              </button>
+              <div className="flex items-center gap-3">
+                <button
+                  type="button"
+                  onClick={resolveTargetPatient}
+                  className="font-semibold text-[#5b14b8] hover:underline cursor-pointer flex items-center gap-1"
+                >
+                  <RefreshCw className="w-3.5 h-3.5" />
+                  <span>Retry</span>
+                </button>
+                <button
+                  type="button"
+                  onClick={() => navigate('/patients')}
+                  className="font-semibold text-[#5b14b8] hover:underline cursor-pointer"
+                >
+                  Choose Patient
+                </button>
+              </div>
             </div>
           )}
```

### Proposal 2: `src/pages/records/MedicalRecordsPage.tsx`
Preserve `activePatientId` query parameter when navigating to Upload Record:

```diff
--- a/src/pages/records/MedicalRecordsPage.tsx
+++ b/src/pages/records/MedicalRecordsPage.tsx
@@ -570,7 +570,7 @@
 
           <button
             type="button"
-            onClick={() => navigate('/records/upload')}
+            onClick={() => navigate(activePatientId ? `/records/upload?patientId=${activePatientId}` : '/records/upload')}
             className="h-10 px-5 rounded-lg bg-white border border-[#cbc4d4] text-sm font-semibold text-[#191c1d] hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5b14b8] flex items-center gap-1.5 cursor-pointer"
           >
             <Upload className="size-4 text-[#5b14b8]" />
```

### Proposal 3: `src/pages/treatment-offers/AppointmentDetailsPage.tsx`
Preserve `offer.patientId` query parameter when navigating to Upload Record:

```diff
--- a/src/pages/treatment-offers/AppointmentDetailsPage.tsx
+++ b/src/pages/treatment-offers/AppointmentDetailsPage.tsx
@@ -448,7 +448,7 @@
                 </div>
                 <button
                   type="button"
-                  onClick={() => navigate('/records/upload')}
+                  onClick={() => navigate(offer.patientId ? `/records/upload?patientId=${offer.patientId}` : '/records/upload')}
                   className="border border-purple-200 hover:bg-purple-50 text-[#3f1d8b] text-xs font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer"
                 >
                   Upload Record
```

---

## 7. Verification Method

1. **Static Typing & Compilation Verification**:
   ```powershell
   npm run type-check
   npm run build
   ```
2. **Patient Resolution Functional Test**:
   - Access `/records/upload?patientId=787e5187-7859-4320-bb1a-465a57dd086a`:
     - Verify patient name is not "Patient #787E5187" but real patient name (John Doe).
     - Verify Health ID / MRN displays valid identifier.
     - Verify Age displays calculated years (not "Age N/A").
     - Verify Gender is displayed.
     - Verify Verified badge is rendered.
   - Access `/records/upload?patientProfileId=787e5187-7859-4320-bb1a-465a57dd086a`:
     - Verify identical demographics resolve.
   - Access `/records/upload` with no query parameters:
     - Verify default test patient `787e5187-7859-4320-bb1a-465a57dd086a` loads cleanly.
   - Access `/records/upload?patientId=non-existent-uuid-0000`:
     - Verify amber error alert is displayed with message and Retry / Choose Patient buttons.
3. **Safety Interlock Verification**:
   - Enter OCR review with mismatched demographics.
   - Verify mismatch banner appears.
   - Click "Save to Medical Record".
   - Verify modal opens and prevents persistence.
