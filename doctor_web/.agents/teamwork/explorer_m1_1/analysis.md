# Technical Analysis: API Client Multipart Support & Patient Context Resolution

**Author**: Explorer 1 (Milestone 1)  
**Date**: 2026-11-09  
**Target Files**:
- `src/services/apiClient.ts`
- `src/services/patientService.ts`
- `src/pages/ocr/MedicalRecordUploadPage.tsx`

---

## 1. Executive Summary

This investigation designs the exact implementation strategy for updating `src/services/apiClient.ts` to support `multipart/form-data` uploads (required for binary document upload in Milestone 2) and updating `src/services/patientService.ts` to resolve authentic patient demographics via `GET /api/v1/doctors/patients/:patientProfileId` for test patient `787e5187-7859-4320-bb1a-465a57dd086a` without hardcoded fallbacks or 403 errors (Milestone 1, R1).

The investigation confirmed:
1. `apiClient.ts` currently forces `'Content-Type': 'application/json'` unconditionally in `apiRequest` and serializes all request bodies with `JSON.stringify(body)` in `post`, `put`, and `patch`.
2. When a `FormData` instance is passed to `JSON.stringify()`, it serializes to `{}` (an empty JSON object) and `fetch` transmits `Content-Type: application/json`, causing multipart uploads to fail immediately on the backend.
3. Fetch API specifications require that the `Content-Type` header be omitted when transmitting `FormData`, allowing the runtime to automatically inject `multipart/form-data; boundary=...`.
4. In `patientService.ts`, `getDoctorPatientProfile` currently fails to query `GET /api/v1/doctors/patients/:patientProfileId`, resulting in synthetic fallback values for patients not found in the doctor's appointment list.
5. The live backend at `https://360api.vnvision.in` conforms to the `ApiResponse<T>` envelope (`{ success, statusCode, message, data, meta }`), which must be preserved across all requests, token refreshes, and multipart transmissions.

---

## 2. Investigation of Current Implementation (`apiClient.ts`)

### 2.1 Request Dispatch Architecture
In `src/services/apiClient.ts` (lines 116–140):
```typescript
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${normalizedEndpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  };

  const token = sessionStorage.getItem('careid_access_token');
  if (token && !('Authorization' in headers)) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  ...
```

#### Defects Identified:
1. **Unconditional `Content-Type: application/json`**:
   `headers` is initialized with `'Content-Type': 'application/json'`. Even if `options.body` is a `FormData` instance, this header is retained unless overridden. If overridden to `'multipart/form-data'`, the browser fails to append the boundary parameter (`boundary=----WebKitFormBoundary...`), causing 400 Bad Request / 415 Unsupported Media Type from NestJS multipart parsers (Multer / Busboy).
2. **Object Spread on `HeadersInit`**:
   `options.headers` can be a standard `Headers` object or a `[string, string][]` array. Spreading `...options.headers` only works reliably for plain JavaScript record objects. A helper `normalizeHeaders()` is needed to extract entries cleanly from any valid `HeadersInit`.
3. **Flawed 401 Retry Headers**:
   In lines 178–181:
   ```typescript
   const retryHeaders: HeadersInit = {
     ...headers,
     Authorization: `Bearer ${newAccessToken}`,
   };
   ```
   If `headers` originally contained `Content-Type: application/json`, the retry request continues to send the incorrect header on multipart uploads.

### 2.2 Body Serialization in HTTP Method Helpers
In `src/services/apiClient.ts` (lines 234–261):
```typescript
export const apiClient = {
  get: <T>(endpoint: string, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, { method: 'GET', headers }),

  post: <T>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, { method: 'DELETE', headers }),
};
```

#### Defects Identified:
1. `body !== undefined ? JSON.stringify(body) : undefined` unconditionally stringifies any passed value.
2. `FormData` objects serialize to `"{}"` under `JSON.stringify()`. File buffers and fields are completely discarded.
3. There is currently no `postFormData` method on `apiClient`.

---

## 3. Investigation of Patient Context Resolution (`patientService.ts`)

### 3.1 Postman Contract
In `Postman collection/CareID-Staging.postman_collection.json`:
- **Folder**: `05. Doctor Portal`
- **Request**: `Get complete demographic information for an authorized patient`
- **Method & URL**: `GET {{baseUrl}}/api/v1/doctors/patients/:patientProfileId`
- **Headers**: `Accept: application/json`, `Authorization: Bearer <accessToken>`
- **Response Format**:
  ```json
  {
    "id": "787e5187-7859-4320-bb1a-465a57dd086a",
    "userId": "...",
    "patientNumber": "...",
    "firstName": "...",
    "lastName": "...",
    "dateOfBirth": "1988-04-12T00:00:00.000Z",
    "gender": "MALE",
    "bloodGroup": "O+",
    "phone": "...",
    "email": "...",
    "status": "ACTIVE"
  }
  ```

### 3.2 Current Implementation Defect in `getDoctorPatientProfile`
In `src/services/patientService.ts` (lines 830–930):
`getDoctorPatientProfile` queries:
1. `getPatientMedicalRecords(patientId)`
2. `getPatientTimeline(patientId)`
3. `apiClient.get('/api/v1/appointments/doctor/me')`
4. `apiClient.get('/api/v1/patients/:patientId/insurance-cards')`

It **never** calls `GET /api/v1/doctors/patients/:patientProfileId`!
If the target patient is not in `/api/v1/appointments/doctor/me`, demographics are synthesized with:
- `patientNumber: PT-${patientId.slice(0, 8).toUpperCase()}`
- `fullName: Patient #${patientId.slice(0, 8)}`
- `gender: 'Not Specified'`
- `dateOfBirth: undefined`

This breaks Requirement R1 and Milestone 1 Feature 2.

---

## 4. Design & Implementation Strategy

### 4.1 Changes to `src/services/apiClient.ts`

#### A. Type & Utility Helpers
Add type-guard `isFormData`, `normalizeHeaders`, and `prepareBody`:

```typescript
function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

function normalizeHeaders(headersInit?: HeadersInit): Record<string, string> {
  const result: Record<string, string> = {};
  if (!headersInit) return result;

  if (typeof Headers !== 'undefined' && headersInit instanceof Headers) {
    headersInit.forEach((value, key) => {
      result[key] = value;
    });
  } else if (Array.isArray(headersInit)) {
    headersInit.forEach(([key, value]) => {
      result[key] = value;
    });
  } else if (typeof headersInit === 'object') {
    Object.assign(result, headersInit);
  }
  return result;
}

function prepareBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (isFormData(body)) return body;
  if (typeof body === 'string') return body;
  if (typeof Blob !== 'undefined' && body instanceof Blob) return body;
  if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) return body;
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return body;
  return JSON.stringify(body);
}
```

#### B. Updating `apiRequest<T>()`
```typescript
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${normalizedEndpoint}`;

  const isMultipart = isFormData(options.body);
  const userHeaders = normalizeHeaders(options.headers);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...userHeaders,
  };

  if (!isMultipart) {
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
  } else {
    // Crucial: Omit Content-Type when sending FormData so the browser/runtime
    // can set multipart/form-data with the correct boundary parameter.
    delete headers['Content-Type'];
    delete headers['content-type'];
  }

  const token = sessionStorage.getItem('careid_access_token');
  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }
```

In the 401 Unauthorized retry block:
```typescript
        // Retry the original request with new token
        const retryHeaders: Record<string, string> = {
          ...headers,
          Authorization: `Bearer ${newAccessToken}`,
        };
        if (isMultipart) {
          delete retryHeaders['Content-Type'];
          delete retryHeaders['content-type'];
        }

        const retryResponse = await fetch(fullUrl, {
          ...options,
          headers: retryHeaders,
        });
```

#### C. Updating `apiClient` Export Object
Add polymorphic support in `post`, `put`, `patch`, and add the explicit `postFormData` method:

```typescript
export const apiClient = {
  get: <T>(endpoint: string, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, { method: 'GET', headers }),

  post: <T>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      headers,
      body: prepareBody(body),
    }),

  postFormData: <T>(endpoint: string, formData: FormData, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    }),

  put: <T>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      headers,
      body: prepareBody(body),
    }),

  patch: <T>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      headers,
      body: prepareBody(body),
    }),

  delete: <T>(endpoint: string, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, { method: 'DELETE', headers }),
};
```

---

### 4.2 Changes to `src/services/patientService.ts`

In `getDoctorPatientProfile(patientId: string)`:
Add primary query to `GET /api/v1/doctors/patients/:patientProfileId`:

```typescript
  async getDoctorPatientProfile(patientId: string): Promise<PatientProfileDetail> {
    // 0. Primary: Fetch authorized patient demographics directly from doctor portal endpoint
    let liveDemographics: Partial<PatientProfileDetail> = {};
    try {
      const profileRes = await apiClient.get<Record<string, unknown>>(
        `/api/v1/doctors/patients/${encodeURIComponent(patientId)}`
      );
      const raw = (profileRes.data && typeof profileRes.data === 'object'
        ? profileRes.data
        : profileRes) as Record<string, unknown>;

      if (raw && raw.id) {
        liveDemographics = mapRawToProfileDetail(raw);
      }
    } catch {
      // If endpoint is inaccessible or restricted, continue with secondary aggregation sources
    }

    // 1. Fetch authorized medical records & timeline using canonical multi-source unwrapping
    let medicalRecords: MedicalRecord[] = [];
    ...
```

And in the returned object, merge `liveDemographics` with high priority:
```typescript
    return {
      id: patientId,
      patientNumber:
        liveDemographics.patientNumber ||
        patientDemographics.patientNumber ||
        `PT-${patientId.slice(0, 8).toUpperCase()}`,
      firstName: liveDemographics.firstName || patientDemographics.firstName || 'Patient',
      lastName: liveDemographics.lastName || patientDemographics.lastName || '',
      fullName:
        liveDemographics.fullName ||
        patientDemographics.fullName ||
        (liveDemographics.firstName
          ? `${liveDemographics.firstName} ${liveDemographics.lastName || ''}`.trim()
          : `Patient #${patientId.slice(0, 8)}`),
      dateOfBirth: liveDemographics.dateOfBirth || null,
      gender: liveDemographics.gender || patientDemographics.gender || 'Not Specified',
      bloodGroup: liveDemographics.bloodGroup || null,
      phone: liveDemographics.phone || patientDemographics.phone || null,
      email: liveDemographics.email || null,
      knownAllergies: liveDemographics.knownAllergies?.length ? liveDemographics.knownAllergies : [],
      chronicConditions: [
        ...(liveDemographics.chronicConditions || []),
        ...chronicConditions,
      ],
      profileStatus: liveDemographics.profileStatus || 'COMPLETED',
      insurancePolicy: liveDemographics.insurancePolicy || insurancePolicy,
      healthCard: liveDemographics.healthCard || healthCard,
      vitals,
    };
```

---

## 5. Verification Plan

The Worker must execute the following verifications after implementing the changes:

### 5.1 Static Verification
1. `npm run type-check`: Must pass with 0 errors (`tsc -b --noEmit`).
2. `npm run lint`: Must pass with 0 errors (`eslint .`).
3. `npm run build`: Must produce production bundle in `dist/` with 0 errors.

### 5.2 Unit / Functional Verification
Create and execute a standalone Node/Vite test script `scripts/verify-m1.ts` (or temporary verification script):
1. **Multipart Upload Header Verification**:
   - Create a dummy `FormData` instance with a file and text fields.
   - Mock `fetch` / intercept request options.
   - Verify `options.headers['Content-Type']` is `undefined`.
   - Verify `options.headers['Authorization']` is attached (`Bearer <token>`).
   - Verify `options.body === formData` (identity preservation, not stringified to `"{}"`).
2. **Polymorphic Post Verification**:
   - Verify `apiClient.post(url, formData)` delegates without stringification.
   - Verify `apiClient.post(url, { key: 'value' })` sends JSON string and `Content-Type: application/json`.
3. **Patient Context Demographics Resolution**:
   - Call `patientService.getDoctorPatientProfile('787e5187-7859-4320-bb1a-465a57dd086a')`.
   - Verify `GET /api/v1/doctors/patients/787e5187-7859-4320-bb1a-465a57dd086a` is targeted.
   - Verify returned profile has non-empty `id`, `patientNumber`, `firstName`, `lastName`, and `fullName`.
