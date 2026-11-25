# Milestone 1 Technical Investigation & Implementation Design: Patient Context Resolution

**Subagent**: Explorer 2 (Milestone 1 — API Client Multipart & Patient Context Resolution)  
**Date**: November 9, 2026  
**Target File**: `src/services/patientService.ts`  
**Backend Target**: `https://360api.vnvision.in`  
**Authoritative Sources**:
1. Postman Collection: `Postman collection/CareID-Staging.postman_collection.json`
2. Postman Environment: `Postman collection/CareID-Staging.postman_environment.json`
3. Live Backend empirical validation against `https://360api.vnvision.in/api/v1`
4. Codebase inspection: `src/services/patientService.ts`, `src/services/apiClient.ts`, `src/pages/ocr/MedicalRecordUploadPage.tsx`, `src/hooks/usePatients.ts`

---

## 1. Executive Summary

This investigation resolves the root cause of demographic resolution failures and synthetic fallback names in the CareID Doctor Web Portal. 

Previously, resolving test patient `787e5187-7859-4320-bb1a-465a57dd086a` resulted in 403 Forbidden errors or synthetic fallback strings (e.g. `"Patient #787E5187"`, `"PT-787E5187"`, `"Not Specified"`). Our investigation established that:
1. `src/services/patientService.ts` **never called** the authoritative doctor portal endpoint `GET /api/v1/doctors/patients/:patientProfileId`.
2. Instead, it checked `isUserAdmin()` and attempted `/api/v1/admin/patients/:id` (which returned `403 Forbidden` for doctor sessions), and then attempted to scrape demographics from `/api/v1/appointments/doctor/me`.
3. When test patient `787e5187-7859-4320-bb1a-465a57dd086a` was not found in the doctor's appointment list, it synthesized fake fallback demographics.
4. Calling the authoritative endpoint `GET /api/v1/doctors/patients/787e5187-7859-4320-bb1a-465a57dd086a` against the live backend returns `200 OK` with authentic demographics: **Marcus Doe**, DOB: **1990-01-01**, Gender: **Male**, MRN/PatientNumber: **+16505550004**, Blood Group: **O+**, Address: **Karachi, Pakistan**.

This document specifies the exact TypeScript interfaces, method rewrites, error handling logic, and code diffs for Worker 1 to implement cleanly.

---

## 2. Investigation of Current Implementation

### 2.1 File Location & Structure
- **File**: `src/services/patientService.ts` (1,396 lines)
- **Key Methods Under Review**:
  - `getDoctorPatientProfile(patientId: string)` (lines 830–930)
  - `getPatientById(patientId: string)` (lines 810–825)
  - `getPatientMedicalRecords(patientId: string, params?: ...)` (lines 936–976)
  - `mapRawToProfileDetail(raw: Record<string, unknown>)` (lines 1348–1396)

### 2.2 Deep Dive into `getDoctorPatientProfile(patientId: string)`
Lines 830–930 of `src/services/patientService.ts` currently execute three steps:
1. **Fetch medical records & timeline**: Calls `getPatientMedicalRecords(patientId)` and `getPatientTimeline(patientId)`.
2. **Scrape doctor appointments**: Queries `GET /api/v1/appointments/doctor/me` and searches for an appointment matching `patientId`. If found, extracts `firstName`, `lastName`, `mrn`, `gender`, and `phone`. If not found, `patientDemographics` remains `{}`.
3. **Query insurance cards**: Queries `GET /api/v1/patients/:patientId/insurance-cards`.
4. **Construct profile with hardcoded synthetic fallbacks**:
   ```typescript
   // Lines 912-929 in src/services/patientService.ts:
   return {
     id: patientId,
     patientNumber: patientDemographics.patientNumber || `PT-${patientId.slice(0, 8).toUpperCase()}`,
     firstName: patientDemographics.firstName || 'Patient',
     lastName: patientDemographics.lastName || '',
     fullName:
       patientDemographics.fullName ||
       (patientDemographics.firstName
         ? `${patientDemographics.firstName} ${patientDemographics.lastName || ''}`.trim()
         : `Patient #${patientId.slice(0, 8)}`),
     gender: patientDemographics.gender || 'Not Specified',
     phone: patientDemographics.phone || null,
     knownAllergies: [],
     chronicConditions,
     profileStatus: 'COMPLETED',
     insurancePolicy,
     healthCard,
     vitals,
   };
   ```

### 2.3 Deep Dive into `getPatientById(patientId: string)`
Lines 810–825 of `src/services/patientService.ts`:
```typescript
async getPatientById(patientId: string): Promise<PatientProfileDetail> {
  if (authService.isUserAdmin()) {
    try {
      const response = await apiClient.get<unknown>(`/api/v1/admin/patients/${encodeURIComponent(patientId)}`);
      const raw = response.data as Record<string, unknown>;
      return mapRawToProfileDetail(raw);
    } catch (err: unknown) {
      if (!(err instanceof ApiError && err.statusCode === 403)) {
        throw err;
      }
    }
  }

  // Directly call doctor-authorized profile aggregation
  return await patientService.getDoctorPatientProfile(patientId);
}
```

### 2.4 Deep Dive into `getPatientMedicalRecords(patientId: string, params?: ...)`
Lines 949–976 of `src/services/patientService.ts`:
```typescript
  // 1. Try Doctor Portal endpoint: /api/v1/doctors/patients/:patientProfileId/medical-records
  try {
    const response = await apiClient.get<unknown>(
      `/api/v1/doctors/patients/${encodeURIComponent(patientId)}/medical-records${qs}`
    );
    const list = unwrapMedicalRecords(response.data);
    if (list.length > 0) return list;
  } catch {
    // Continue to fallbacks
  }

  // 2. Try Admin Portal endpoint if session has admin privileges
  if (authService.isUserAdmin()) {
    try {
      const adminRes = await apiClient.get<unknown>(
        `/api/v1/admin/patients/${encodeURIComponent(patientId)}/medical-records${qs}`
      );
      const list = unwrapMedicalRecords(adminRes.data);
      if (list.length > 0) return list;
    } catch (err: unknown) { ... }
  }
```
**Defect Identified**: If a patient legitimately has `0` medical records (`list.length === 0`), the method treats this valid response as a failure and falls through to the admin route `/api/v1/admin/patients/:id/medical-records` which generates 403 Forbidden!

### 2.5 Root Causes of Previous Failures
| Issue | Previous Behavior | Consequence |
| :--- | :--- | :--- |
| **Missing Endpoint Call** | Did not call `/api/v1/doctors/patients/:patientProfileId` | Never contacted backend for patient demographic records |
| **Admin Route Fallback** | Checked `isUserAdmin()` and called `/api/v1/admin/patients/:id` | Doctor JWT lacks Admin scope -> HTTP 403 Forbidden |
| **Appointment Scraper** | Relied on `/api/v1/appointments/doctor/me` matching | Test patient `787e5187-7859-4320-bb1a-465a57dd086a` has no active appointment -> empty demographic record |
| **Synthetic Fallbacks** | Injected `"Patient #787E5187"`, `"PT-787E5187"`, `"Not Specified"` | Direct violation of R1 and R6 (prohibition of mock/placeholder data) |
| **Empty Records Fallback** | `if (list.length > 0) return list;` in medical records | Empty record lists erroneously triggered 403 admin fallback |

---

## 3. Authoritative API Contract

### 3.1 Postman Specification
- **Postman Collection**: `Postman collection/CareID-Staging.postman_collection.json`
- **Folder**: `05. Doctor Portal`
- **Request ID**: `3174739d-8ce7-435b-bd9b-ce908bf62823`
- **Name**: `Get complete demographic information for an authorized patient`
- **HTTP Method**: `GET`
- **URL**: `{{baseUrl}}/api/v1/doctors/patients/:patientProfileId`
- **Security Scheme**: `Bearer <token>` (`roles: ["DOCTOR"]`)
- **Headers**:
  ```http
  Accept: application/json
  Authorization: Bearer <accessToken>
  ```

### 3.2 Live Backend Validation (Empirical Proof)
- **Request**:
  `GET https://360api.vnvision.in/api/v1/doctors/patients/787e5187-7859-4320-bb1a-465a57dd086a`
- **Response Status**: `200 OK`
- **Live Response Payload**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Operation executed successfully",
    "data": {
      "id": "787e5187-7859-4320-bb1a-465a57dd086a",
      "userId": "fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6",
      "patientNumber": "+16505550004",
      "firstName": "Marcus",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-01",
      "gender": "Male",
      "bloodGroup": "O+",
      "nationality": "Pakistani",
      "occupation": "Software Engineer",
      "maritalStatus": "MARRIED",
      "languages": ["English", "Urdu"],
      "phone": "+16505550004",
      "email": null,
      "address": "123 Main St, New York, NY",
      "currentAddress": {
        "line1": "123 Main Street, Karachi, Sindh, 74200, Pakistan",
        "line2": "Apartment 4B",
        "city": "Karachi",
        "state": "Sindh",
        "district": "South",
        "postalCode": "74200",
        "country": "Pakistan"
      },
      "permanentAddress": {
        "line1": "123 Main Street",
        "line2": "Apartment 4B",
        "city": "Karachi",
        "state": "Sindh",
        "postalCode": "74200",
        "country": "Pakistan"
      },
      "photoUrl": "https://storage.healthvault360.com/photos/patient-sample.jpg",
      "knownAllergies": ["Penicillin", "Nuts"],
      "chronicConditions": ["Diabetes Type 2", "Hypertension"],
      "disabilities": ["Visual Impairment"],
      "prefContactMethod": "EMAIL",
      "emergencyContact": {
        "id": "fbe7008f-4636-4726-8206-d11d9455ee07",
        "name": "Jane Doe",
        "relationship": "Spouse",
        "phone": "+14155552671"
      },
      "status": "COMPLETED",
      "authSource": "REFERRAL",
      "createdAt": "2026-10-28T07:40:44.397Z",
      "updatedAt": "2026-11-06T11:49:02.638Z"
    },
    "meta": {
      "timestamp": "2026-11-09T07:14:23.738Z"
    }
  }
  ```

### 3.3 Authoritative Field Mapping
| Backend Field | Type | Expected Value for `787e5187...` | Frontend Target Field |
| :--- | :--- | :--- | :--- |
| `id` | `string` (UUID) | `"787e5187-7859-4320-bb1a-465a57dd086a"` | `profile.id` |
| `patientNumber` | `string` | `"+16505550004"` | `profile.patientNumber` (Health ID / MRN) |
| `firstName` | `string` | `"Marcus"` | `profile.firstName` |
| `lastName` | `string` | `"Doe"` | `profile.lastName` |
| `dateOfBirth` | `string` (ISO date) | `"1990-01-01"` | `profile.dateOfBirth` |
| `gender` | `string` | `"Male"` | `profile.gender` |
| `bloodGroup` | `string` | `"O+"` | `profile.bloodGroup` |
| `phone` / `phoneNumber` | `string` | `"+16505550004"` | `profile.phone` / `profile.phoneNumber` |
| `currentAddress` | `object` | `{ line1, line2, city, state, postalCode, country }` | `profile.currentAddress` |
| `address` | `string` | `"123 Main St, New York, NY"` | `profile.address` |
| `knownAllergies` | `string[]` | `["Penicillin", "Nuts"]` | `profile.knownAllergies` |
| `chronicConditions` | `string[]` | `["Diabetes Type 2", "Hypertension"]` | `profile.chronicConditions` |
| `emergencyContact` | `object` | `{ name: "Jane Doe", phone: "+14155552671", ... }` | `profile.emergencyContact` |

### 3.4 Error Responses & Handling
| HTTP Status | Backend Cause | Frontend Error Handling |
| :--- | :--- | :--- |
| `400 Bad Request` | Missing or malformed UUID | Throw `ApiError(400, 'Invalid patient ID format')` |
| `401 Unauthorized` | Expired or missing Bearer token | Handled automatically by `apiClient.ts` token refresh |
| `403 Forbidden` | Doctor not authorized for this patient | Throw `ApiError(403, 'Access denied: You are not authorized to access patient records for this patient.')` |
| `404 Not Found` | Patient UUID not in registry | Throw `ApiError(404, 'Patient record not found in the CareID registry.')` |
| `500 Server Error` | Database/backend internal error | Throw `ApiError(500, 'CareID Server error. Please try again later.')` |

**Zero Fallback Rule**: In no circumstance should an error result in returning synthetic names like `"Patient #..."` or placeholder IDs like `"PT-..."`. The error MUST propagate to the caller (`MedicalRecordUploadPage.tsx` or `usePatientProfile`) to display the authentic error banner to the doctor.

---

## 4. Architecture & Implementation Design

### 4.1 Interface Definitions
In `src/services/patientService.ts`:
1. Export `PatientAddress` for structured current/permanent addresses.
2. Export `PatientProfileResponse` adhering strictly to `PROJECT.md` line 55 while including optional demographic extensions.
3. Keep `PatientProfileDetail` extending `PatientProfileResponse` for backward compatibility across existing pages (`usePatients.ts`, `LabReportPage.tsx`, `RecordDetailPage.tsx`).

```typescript
export interface PatientAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  district?: string;
  postalCode?: string;
  country?: string;
}

export interface PatientProfileResponse {
  id: string; // Patient Profile UUID
  patientNumber: string; // Health ID / MRN
  firstName: string;
  lastName: string;
  fullName?: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string | null;
  phoneNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  nationality?: string | null;
  occupation?: string | null;
  maritalStatus?: string | null;
  languages?: string[];
  address?: string | null;
  currentAddress?: PatientAddress | null;
  permanentAddress?: PatientAddress | null;
  photoUrl?: string | null;
  knownAllergies?: string[];
  chronicConditions?: string[];
  disabilities?: string[];
  emergencyContact?: EmergencyContact | null;
  status?: string;
  userStatus?: string;
  profileStatus?: string;
  authSource?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PatientProfileDetail extends PatientProfileResponse {
  fullName: string;
  userStatus?: string;
  profileStatus?: string;
  onboardingStep?: number;
  currentAddressLine1?: string | null;
  currentCity?: string | null;
  currentState?: string | null;
  currentPostalCode?: string | null;
  currentCountry?: string | null;
  insurancePolicy?: InsurancePolicySummary | null;
  healthCard?: HealthCardSummary | null;
  vitals?: {
    bp?: string;
    bpUnit?: string;
    hr?: string;
    hrUnit?: string;
    temp?: string;
    tempUnit?: string;
    spo2?: string;
    spo2Unit?: string;
    resp?: string;
    respUnit?: string;
    bmi?: string;
    lastUpdated?: string;
  };
}
```

### 4.2 Rewriting `getDoctorPatientProfile(patientProfileId: string)`
1. Validate input parameter (`cleanId`).
2. Query `GET /api/v1/doctors/patients/${encodeURIComponent(cleanId)}`.
3. Safely unwrap response payload (handling standard CareID envelope `{ success: true, data: { ... } }`).
4. Validate that a genuine record was returned (presence of `id` or `patientNumber` or `firstName`).
5. Map raw record using `mapRawToProfileDetail(rawProfile)`.
6. Non-blocking enrichment: Fetch medical records and insurance cards in parallel using `Promise.allSettled`. If records exist, calculate telemetry vitals. If insurance exists, populate policy and health card summaries. Crucially, failures during telemetry enrichment **never fail or corrupt** the authentic demographics.
7. Return completed `PatientProfileDetail`.

### 4.3 Rewriting `getPatientById(patientId: string)`
Directly call `getDoctorPatientProfile(patientId)`. Eliminate all calls to `/api/v1/admin/patients/:id`.

### 4.4 Fixing `getPatientMedicalRecords(patientId: string, params?: ...)`
Fix the check `if (list.length > 0) return list;` to `return list;`. If the endpoint succeeds with `200 OK` and returns `[]`, return `[]` immediately without falling back to the forbidden admin endpoint.

### 4.5 Updating `mapRawToProfileDetail(raw: Record<string, unknown>)`
Extract and format all authentic fields returned by the live API, including `currentAddress`, `permanentAddress`, `bloodGroup`, `dateOfBirth`, `gender`, `knownAllergies`, `chronicConditions`, `phone`, and `phoneNumber`.

---

## 5. Concrete Code Diffs and Proposals for Worker

Below are the exact code replacements to be applied by Worker 1 in `src/services/patientService.ts`.

### Diff 1: Add `PatientAddress` & Update Interfaces (around line 93)

```typescript
<<<<
export interface PatientProfileDetail {
  id: string;
  userId?: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  nationality?: string | null;
  phone?: string | null;
  email?: string | null;
  userStatus?: string;
  profileStatus?: string;
  onboardingStep?: number;
  occupation?: string | null;
  maritalStatus?: string | null;
  languages?: string[];
  address?: string | null;
  currentAddressLine1?: string | null;
  currentCity?: string | null;
  currentState?: string | null;
  currentPostalCode?: string | null;
  currentCountry?: string | null;
  photoUrl?: string | null;
  knownAllergies: string[];
  chronicConditions: string[];
  disabilities?: string[];
  emergencyContact?: EmergencyContact | null;
  insurancePolicy?: InsurancePolicySummary | null;
  healthCard?: HealthCardSummary | null;
  createdAt?: string;
  updatedAt?: string;
  vitals?: {
    bp?: string;
    bpUnit?: string;
    hr?: string;
    hrUnit?: string;
    temp?: string;
    tempUnit?: string;
    spo2?: string;
    spo2Unit?: string;
    resp?: string;
    respUnit?: string;
    bmi?: string;
    lastUpdated?: string;
  };
}
====
export interface PatientAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  district?: string;
  postalCode?: string;
  country?: string;
}

export interface PatientProfileResponse {
  id: string; // Patient Profile ID
  patientNumber: string; // Health ID / MRN
  firstName: string;
  lastName: string;
  fullName?: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string | null;
  phoneNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  nationality?: string | null;
  occupation?: string | null;
  maritalStatus?: string | null;
  languages?: string[];
  address?: string | null;
  currentAddress?: PatientAddress | null;
  permanentAddress?: PatientAddress | null;
  photoUrl?: string | null;
  knownAllergies?: string[];
  chronicConditions?: string[];
  disabilities?: string[];
  emergencyContact?: EmergencyContact | null;
  status?: string;
  userStatus?: string;
  profileStatus?: string;
  authSource?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PatientProfileDetail extends PatientProfileResponse {
  fullName: string;
  userStatus?: string;
  profileStatus?: string;
  onboardingStep?: number;
  currentAddressLine1?: string | null;
  currentCity?: string | null;
  currentState?: string | null;
  currentPostalCode?: string | null;
  currentCountry?: string | null;
  insurancePolicy?: InsurancePolicySummary | null;
  healthCard?: HealthCardSummary | null;
  vitals?: {
    bp?: string;
    bpUnit?: string;
    hr?: string;
    hrUnit?: string;
    temp?: string;
    tempUnit?: string;
    spo2?: string;
    spo2Unit?: string;
    resp?: string;
    respUnit?: string;
    bmi?: string;
    lastUpdated?: string;
  };
}
>>>>
```

### Diff 2: Replace `getPatientById` and `getDoctorPatientProfile` (lines 806–930)

```typescript
<<<<
  /**
   * Get complete patient profile details by ID or MRN
   * Doctor-authorized: Assembles from /api/v1/doctors/patients/:id/medical-records + appointments + insurance-cards
   */
  async getPatientById(patientId: string): Promise<PatientProfileDetail> {
    if (authService.isUserAdmin()) {
      try {
        const response = await apiClient.get<unknown>(`/api/v1/admin/patients/${encodeURIComponent(patientId)}`);
        const raw = response.data as Record<string, unknown>;
        return mapRawToProfileDetail(raw);
      } catch (err: unknown) {
        if (!(err instanceof ApiError && err.statusCode === 403)) {
          throw err;
        }
      }
    }

    // Directly call doctor-authorized profile aggregation
    return await patientService.getDoctorPatientProfile(patientId);
  },

  /**
   * Doctor-authorized profile builder for patient
   */
  async getDoctorPatientProfile(patientId: string): Promise<PatientProfileDetail> {
    // 1. Fetch authorized medical records & timeline using canonical multi-source unwrapping
    let medicalRecords: MedicalRecord[] = [];
    try {
      const [recs, tl] = await Promise.allSettled([
        patientService.getPatientMedicalRecords(patientId),
        patientService.getPatientTimeline(patientId),
      ]);
      const recList = recs.status === 'fulfilled' ? [...recs.value] : [];
      const tlList = tl.status === 'fulfilled' ? [...tl.value] : [];
      const seen = new Set(recList.map((r) => r.id));
      for (const ev of tlList) {
        if (!seen.has(ev.id)) {
          recList.push(timelineEventToMedicalRecord(ev, patientId));
          seen.add(ev.id);
        }
      }
      medicalRecords = recList;
    } catch {
      medicalRecords = [];
    }

    // 2. Fetch doctor appointments to get basic demographics if available
    let patientDemographics: Partial<PatientProfileDetail> = {};
    try {
      const apptRes = await apiClient.get<unknown>('/api/v1/appointments/doctor/me');
      const appts = Array.isArray(apptRes.data) ? apptRes.data : [];
      const match = appts.find(
        (a: Record<string, unknown>) =>
          (a.patient as Record<string, unknown> | undefined)?.id === patientId ||
          a.patientProfileId === patientId ||
          a.patientId === patientId
      );
      if (match) {
        const p = (match.patient as Record<string, unknown>) || {};
        patientDemographics = {
          firstName: String(p.firstName || ''),
          lastName: String(p.lastName || ''),
          fullName: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Patient Record',
          patientNumber: String(p.mrn || p.patientNumber || 'CAREID-PT'),
          gender: (p.gender as string) || null,
          phone: (p.phone as string) || null,
        };
      }
    } catch {
      // Continue without appointments
    }

    // 3. Fetch insurance cards for this patient
    let insurancePolicy: InsurancePolicySummary | null = null;
    let healthCard: HealthCardSummary | null = null;
    try {
      const insRes = await apiClient.get<Array<Record<string, unknown>>>(
        `/api/v1/patients/${encodeURIComponent(patientId)}/insurance-cards`
      );
      const cards = Array.isArray(insRes.data) ? insRes.data : [];
      if (cards.length > 0) {
        const primaryCard = cards[0];
        insurancePolicy = {
          id: String(primaryCard.id || ''),
          policyNumber: String(primaryCard.policyNumber || 'POL-UNSPECIFIED'),
          providerName: String(primaryCard.providerName || 'Healthcare Provider'),
          status: String(primaryCard.status || 'ACTIVE'),
        };
        healthCard = {
          id: String(primaryCard.id || ''),
          cardNumber: String(primaryCard.policyNumber || primaryCard.groupNumber || primaryCard.id || ''),
          status: String(primaryCard.status || 'ACTIVE'),
        };
      }
    } catch {
      // Continue without insurance cards
    }

    // Extract latest vitals from records if any
    const vitals = extractLatestVitalsFromRecords(medicalRecords);

    const chronicConditions = medicalRecords.flatMap((r) =>
      Array.isArray(r.diagnoses) ? r.diagnoses.map((d) => d.description) : []
    );

    return {
      id: patientId,
      patientNumber: patientDemographics.patientNumber || `PT-${patientId.slice(0, 8).toUpperCase()}`,
      firstName: patientDemographics.firstName || 'Patient',
      lastName: patientDemographics.lastName || '',
      fullName:
        patientDemographics.fullName ||
        (patientDemographics.firstName
          ? `${patientDemographics.firstName} ${patientDemographics.lastName || ''}`.trim()
          : `Patient #${patientId.slice(0, 8)}`),
      gender: patientDemographics.gender || 'Not Specified',
      phone: patientDemographics.phone || null,
      knownAllergies: [],
      chronicConditions,
      profileStatus: 'COMPLETED',
      insurancePolicy,
      healthCard,
      vitals,
    };
  },
====
  /**
   * Get complete patient profile details by ID
   * Primary route: GET /api/v1/doctors/patients/:patientProfileId
   */
  async getPatientById(patientId: string): Promise<PatientProfileDetail> {
    if (!patientId || !patientId.trim()) {
      throw new ApiError(400, 'A valid patientId is required.', 'BadRequestException');
    }
    return await patientService.getDoctorPatientProfile(patientId);
  },

  /**
   * Doctor-authorized profile resolution for an authorized patient.
   * Endpoint: GET /api/v1/doctors/patients/:patientProfileId
   * Authoritative source: CareID Staging Postman Collection (05. Doctor Portal)
   */
  async getDoctorPatientProfile(patientProfileId: string): Promise<PatientProfileDetail> {
    if (!patientProfileId || !patientProfileId.trim()) {
      throw new ApiError(400, 'A valid patientProfileId is required.', 'BadRequestException');
    }

    const cleanId = patientProfileId.trim();

    // 1. Authoritative Doctor Endpoint: GET /api/v1/doctors/patients/:patientProfileId
    let rawProfile: Record<string, unknown>;
    try {
      const response = await apiClient.get<PatientProfileResponse | { data: PatientProfileResponse }>(
        `/api/v1/doctors/patients/${encodeURIComponent(cleanId)}`
      );

      const payload = response.data;
      if (payload && typeof payload === 'object' && 'data' in payload && (payload as { data: PatientProfileResponse }).data) {
        rawProfile = (payload as { data: PatientProfileResponse }).data as unknown as Record<string, unknown>;
      } else if (payload && typeof payload === 'object') {
        rawProfile = payload as Record<string, unknown>;
      } else {
        throw new ApiError(404, `Patient profile #${cleanId} returned an invalid or empty response.`, 'NotFoundException');
      }

      if (!rawProfile.id && !rawProfile.patientNumber && !rawProfile.firstName) {
        throw new ApiError(404, `Patient record #${cleanId} was not found in CareID registry.`, 'NotFoundException');
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 404) {
          throw new ApiError(
            404,
            `Patient record #${cleanId} was not found in the CareID registry.`,
            'NotFoundException'
          );
        }
        if (err.statusCode === 403) {
          throw new ApiError(
            403,
            `Access denied: You are not authorized to access patient records for #${cleanId}.`,
            'ForbiddenException'
          );
        }
        throw err;
      }
      const msg = err instanceof Error ? err.message : 'Failed to retrieve patient profile from server';
      throw new ApiError(500, msg, 'InternalServerError');
    }

    // 2. Map authentic demographics into canonical PatientProfileDetail
    const detail = mapRawToProfileDetail(rawProfile);

    // 3. Enrich with authentic clinical telemetry (vitals, insurance) non-blockingly
    try {
      const [recordsResult, insuranceResult] = await Promise.allSettled([
        patientService.getPatientMedicalRecords(cleanId),
        apiClient.get<Array<Record<string, unknown>>>(`/api/v1/patients/${encodeURIComponent(cleanId)}/insurance-cards`),
      ]);

      if (recordsResult.status === 'fulfilled' && recordsResult.value.length > 0) {
        detail.vitals = extractLatestVitalsFromRecords(recordsResult.value);
        if (detail.chronicConditions.length === 0) {
          detail.chronicConditions = recordsResult.value.flatMap((r) =>
            Array.isArray(r.diagnoses) ? r.diagnoses.map((d) => d.description) : []
          );
        }
      }

      if (insuranceResult.status === 'fulfilled') {
        const insPayload = insuranceResult.value.data;
        const cards = Array.isArray(insPayload) ? insPayload : [];
        if (cards.length > 0) {
          const primaryCard = cards[0];
          detail.insurancePolicy = {
            id: String(primaryCard.id || ''),
            policyNumber: String(primaryCard.policyNumber || primaryCard.cardNumber || 'POL-UNSPECIFIED'),
            providerName: String(primaryCard.providerName || 'Healthcare Provider'),
            status: String(primaryCard.status || 'ACTIVE'),
          };
          detail.healthCard = {
            id: String(primaryCard.id || ''),
            cardNumber: String(primaryCard.policyNumber || primaryCard.cardNumber || primaryCard.groupNumber || primaryCard.id || ''),
            status: String(primaryCard.status || 'ACTIVE'),
          };
        }
      }
    } catch {
      // Non-blocking enrichment failure does NOT affect resolved demographics
    }

    return detail;
  },
>>>>
```

### Diff 3: Fix `getPatientMedicalRecords` (around line 950)

```typescript
<<<<
    // 1. Try Doctor Portal endpoint: /api/v1/doctors/patients/:patientProfileId/medical-records
    try {
      const response = await apiClient.get<unknown>(
        `/api/v1/doctors/patients/${encodeURIComponent(patientId)}/medical-records${qs}`
      );
      const list = unwrapMedicalRecords(response.data);
      if (list.length > 0) return list;
    } catch {
      // Continue to fallbacks
    }
====
    // 1. Authoritative Doctor Portal endpoint: /api/v1/doctors/patients/:patientProfileId/medical-records
    try {
      const response = await apiClient.get<unknown>(
        `/api/v1/doctors/patients/${encodeURIComponent(patientId)}/medical-records${qs}`
      );
      return unwrapMedicalRecords(response.data);
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 204)) {
        return [];
      }
    }
>>>>
```

### Diff 4: Update `mapRawToProfileDetail` (around line 1348)

```typescript
<<<<
function mapRawToProfileDetail(raw: Record<string, unknown>): PatientProfileDetail {
  const firstName = String(raw.firstName || '');
  const lastName = String(raw.lastName || '');
  const fullName = `${firstName} ${lastName}`.trim() || 'Patient Record';
  const mrn = String(raw.patientNumber || raw.mrn || 'CAREID-PT');

  const allergies = Array.isArray(raw.knownAllergies)
    ? raw.knownAllergies.map(String)
    : [];
  const chronicConditions = Array.isArray(raw.chronicConditions)
    ? raw.chronicConditions.map(String)
    : [];

  return {
    id: String(raw.id || ''),
    userId: raw.userId ? String(raw.userId) : undefined,
    patientNumber: mrn,
    firstName,
    lastName,
    fullName,
    dateOfBirth: raw.dateOfBirth ? String(raw.dateOfBirth) : null,
    gender: raw.gender ? String(raw.gender) : null,
    bloodGroup: raw.bloodGroup ? String(raw.bloodGroup) : null,
    nationality: raw.nationality ? String(raw.nationality) : null,
    phone: raw.phone ? String(raw.phone) : null,
    email: raw.email ? String(raw.email) : null,
    userStatus: raw.userStatus ? String(raw.userStatus) : 'ACTIVE',
    profileStatus: raw.profileStatus ? String(raw.profileStatus) : 'COMPLETED',
    onboardingStep: typeof raw.onboardingStep === 'number' ? raw.onboardingStep : undefined,
    occupation: raw.occupation ? String(raw.occupation) : null,
    maritalStatus: raw.maritalStatus ? String(raw.maritalStatus) : null,
    languages: Array.isArray(raw.languages) ? raw.languages.map(String) : [],
    address: raw.address ? String(raw.address) : null,
    currentAddressLine1: raw.currentAddressLine1 ? String(raw.currentAddressLine1) : null,
    currentCity: raw.currentCity ? String(raw.currentCity) : null,
    currentState: raw.currentState ? String(raw.currentState) : null,
    currentPostalCode: raw.currentPostalCode ? String(raw.currentPostalCode) : null,
    currentCountry: raw.currentCountry ? String(raw.currentCountry) : null,
    photoUrl: raw.photoUrl ? String(raw.photoUrl) : null,
    knownAllergies: allergies,
    chronicConditions,
    disabilities: Array.isArray(raw.disabilities) ? raw.disabilities.map(String) : [],
    emergencyContact: raw.emergencyContact as EmergencyContact | null,
    insurancePolicy: raw.insurancePolicy as InsurancePolicySummary | null,
    healthCard: raw.healthCard as HealthCardSummary | null,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}
====
function mapRawToProfileDetail(raw: Record<string, unknown>): PatientProfileDetail {
  const firstName = String(raw.firstName || '').trim();
  const lastName = String(raw.lastName || '').trim();
  const fullName =
    raw.fullName && String(raw.fullName).trim()
      ? String(raw.fullName).trim()
      : `${firstName} ${lastName}`.trim() || 'Patient Record';

  const patientNumber = String(raw.patientNumber || raw.mrn || raw.healthVaultId || '');

  const allergies = Array.isArray(raw.knownAllergies)
    ? raw.knownAllergies.map(String)
    : [];
  const chronicConditions = Array.isArray(raw.chronicConditions)
    ? raw.chronicConditions.map(String)
    : [];
  const disabilities = Array.isArray(raw.disabilities)
    ? raw.disabilities.map(String)
    : [];
  const languages = Array.isArray(raw.languages)
    ? raw.languages.map(String)
    : [];

  let currentAddress: PatientAddress | null = null;
  if (raw.currentAddress && typeof raw.currentAddress === 'object') {
    const ca = raw.currentAddress as Record<string, unknown>;
    currentAddress = {
      line1: ca.line1 ? String(ca.line1) : undefined,
      line2: ca.line2 ? String(ca.line2) : undefined,
      city: ca.city ? String(ca.city) : undefined,
      state: ca.state ? String(ca.state) : undefined,
      district: ca.district ? String(ca.district) : undefined,
      postalCode: ca.postalCode ? String(ca.postalCode) : undefined,
      country: ca.country ? String(ca.country) : undefined,
    };
  }

  let permanentAddress: PatientAddress | null = null;
  if (raw.permanentAddress && typeof raw.permanentAddress === 'object') {
    const pa = raw.permanentAddress as Record<string, unknown>;
    permanentAddress = {
      line1: pa.line1 ? String(pa.line1) : undefined,
      line2: pa.line2 ? String(pa.line2) : undefined,
      city: pa.city ? String(pa.city) : undefined,
      state: pa.state ? String(pa.state) : undefined,
      district: pa.district ? String(pa.district) : undefined,
      postalCode: pa.postalCode ? String(pa.postalCode) : undefined,
      country: pa.country ? String(pa.country) : undefined,
    };
  }

  let addressStr: string | null = null;
  if (raw.address && typeof raw.address === 'string' && raw.address.trim()) {
    addressStr = raw.address.trim();
  } else if (currentAddress) {
    addressStr = [
      currentAddress.line1,
      currentAddress.city,
      currentAddress.state,
      currentAddress.postalCode,
      currentAddress.country,
    ]
      .filter(Boolean)
      .join(', ');
  }

  const phone = raw.phone ? String(raw.phone) : (raw.phoneNumber ? String(raw.phoneNumber) : null);
  const phoneNumber = raw.phoneNumber ? String(raw.phoneNumber) : phone;

  return {
    id: String(raw.id || ''),
    userId: raw.userId ? String(raw.userId) : undefined,
    patientNumber,
    firstName,
    lastName,
    fullName,
    dateOfBirth: raw.dateOfBirth ? String(raw.dateOfBirth) : null,
    gender: raw.gender ? String(raw.gender) : null,
    bloodGroup: raw.bloodGroup ? String(raw.bloodGroup) : null,
    nationality: raw.nationality ? String(raw.nationality) : null,
    phone,
    phoneNumber,
    email: raw.email ? String(raw.email) : null,
    userStatus: raw.status ? String(raw.status) : (raw.userStatus ? String(raw.userStatus) : 'ACTIVE'),
    profileStatus: raw.profileStatus ? String(raw.profileStatus) : 'COMPLETED',
    onboardingStep: typeof raw.onboardingStep === 'number' ? raw.onboardingStep : undefined,
    occupation: raw.occupation ? String(raw.occupation) : null,
    maritalStatus: raw.maritalStatus ? String(raw.maritalStatus) : null,
    languages,
    address: addressStr,
    currentAddress,
    permanentAddress,
    currentAddressLine1: currentAddress?.line1 || (raw.currentAddressLine1 ? String(raw.currentAddressLine1) : null),
    currentCity: currentAddress?.city || (raw.currentCity ? String(raw.currentCity) : null),
    currentState: currentAddress?.state || (raw.currentState ? String(raw.currentState) : null),
    currentPostalCode: currentAddress?.postalCode || (raw.currentPostalCode ? String(raw.currentPostalCode) : null),
    currentCountry: currentAddress?.country || (raw.currentCountry ? String(raw.currentCountry) : null),
    photoUrl: raw.photoUrl ? String(raw.photoUrl) : null,
    knownAllergies: allergies,
    chronicConditions,
    disabilities,
    emergencyContact: raw.emergencyContact as EmergencyContact | null,
    insurancePolicy: raw.insurancePolicy as InsurancePolicySummary | null,
    healthCard: raw.healthCard as HealthCardSummary | null,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}
>>>>
```

---

## 6. Verification and Independent Testing Strategy

### 6.1 Automated Verification Commands
After the Worker applies the patch, execute:
```bash
# 1. Verify TypeScript types and interface contracts
npm run type-check

# 2. Verify ESLint compliance
npm run lint

# 3. Verify clean production bundle build
npm run build
```

### 6.2 Empirical Integration Verification
A verification test script can be executed via Node.js or Vitest/Jest to test patient resolution against `https://360api.vnvision.in`:
1. Authenticate or refresh doctor JWT token.
2. Call `patientService.getDoctorPatientProfile('787e5187-7859-4320-bb1a-465a57dd086a')`:
   - Assert `result.firstName === 'Marcus'`
   - Assert `result.lastName === 'Doe'`
   - Assert `result.patientNumber === '+16505550004'`
   - Assert `result.dateOfBirth === '1990-01-01'`
   - Assert `result.gender === 'Male'`
   - Assert `result.bloodGroup === 'O+'`
   - Assert `result.knownAllergies` contains `'Penicillin'` and `'Nuts'`
   - Assert `result.chronicConditions` contains `'Diabetes Type 2'` and `'Hypertension'`
3. Call `patientService.getDoctorPatientProfile('00000000-0000-0000-0000-000000000000')`:
   - Assert throws `ApiError` with `statusCode: 404`
   - Assert error message indicates patient was not found.
   - Assert no fake `"Patient #00000000"` is generated.
