# Milestone 1 - Component 1: `src/services/treatmentOfferService.ts` Architectural Blueprint & Handoff Report

**Agent**: `explorer_m1_services_1`  
**Date**: November 9, 2026  
**Status**: COMPLETE (Hard Handoff)  
**Target File**: `src/services/treatmentOfferService.ts`  
**Base Client**: `src/services/apiClient.ts`  
**Authoritative Contracts**:
- `Postman collection/CareID-Staging.postman_collection.json` (Folder 05. Doctor Portal & Folder 06. Patient App)
- `spec_miner_survey_consultations_1/handoff.md` (Live Server Probing against `https://360api.vnvision.in`)
- `PROJECT.md` (Milestone 1 Architecture & Interfaces)

---

## 1. Observation

### 1.1 Source Code Inspections

1. **`src/services/apiClient.ts` Transport Layer (Lines 12-49, 132-186, 290-319)**:
   ```typescript
   export interface ApiResponse<T = unknown> {
     success: boolean;
     statusCode: number;
     message?: string;
     data: T;
     meta?: { timestamp?: string; path?: string; };
   }

   export class ApiError extends Error {
     statusCode: number;
     errorType?: string;
     messages: string[];
     ...
   }

   export const apiClient = {
     get: <T>(endpoint: string, headers?: HeadersInit) =>
       apiRequest<T>(endpoint, { method: 'GET', headers }),
     post: <T>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
       apiRequest<T>(endpoint, { method: 'POST', headers, body: prepareBody(body) }),
     put: <T>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
       apiRequest<T>(endpoint, { method: 'PUT', headers, body: prepareBody(body) }),
     ...
   };
   ```
   - `apiRequest<T>` unwraps HTTP fetch response JSON into `ApiResponse<T>`.
   - `res.data` contains the inner payload of type `T`.
   - Automatic bearer token injection occurs from `sessionStorage.getItem('careid_access_token')`.
   - HTTP 401 triggers an automatic token refresh queue via `/api/v1/auth/token/refresh`.
   - Any non-2xx response throws `ApiError(statusCode, message, errorType)`.

2. **Existing `consultationService.ts` Mock Storage (Lines 118-121, 362-387)**:
   ```typescript
   const STORAGE_KEYS = {
     TREATMENT_OFFERS: 'careid_treatment_offers_store',
     ACTIVE_ENCOUNTERS: 'careid_active_encounters_store',
   };
   ...
   getTreatmentOffers(): TreatmentOfferState[] {
     const raw = localStorage.getItem(STORAGE_KEYS.TREATMENT_OFFERS);
     ...
   }
   ```
   - Currently, treatment offers are saved to and read from `localStorage.getItem('careid_treatment_offers_store')`.
   - No dedicated `src/services/treatmentOfferService.ts` exists yet.

3. **Postman Collection Inspections (`CareID-Staging.postman_collection.json`)**:
   - `POST /api/v1/doctors/treatment-offers` (201 Created) — Creates a draft proposal.
   - `GET /api/v1/doctors/treatment-offers` (200 OK) — Query params: `status`, `patientId`, `search`, `page`, `limit`.
   - `GET /api/v1/doctors/treatment-offers/:offerId` (200 OK) — Single offer retrieval.
   - `PUT /api/v1/doctors/treatment-offers/:offerId` (200 OK) — Update draft; body requires `expectedVersion: number`.
   - `POST /api/v1/doctors/treatment-offers/:offerId/dispatch` (200 OK) — Locks and dispatches; body requires `expectedVersion: number`.
   - `GET /api/v1/doctors/treatment-offers/:offerId/status` (200 OK) — Returns lifecycle timestamps and status.
   - `POST /api/v1/doctors/treatment-offers/:offerId/cancel` (200 OK) — Cancels offer; body requires `{ cancellationReason: string, expectedVersion: number }`.
   - `POST /api/v1/patients/treatment-offers/:offerId/accept` (200 OK) — Patient acceptance; body requires `{ signatureConsent: boolean, patientResponseNotes?: string, expectedVersion: number }`.
   - `POST /api/v1/patients/treatment-offers/:offerId/reject` (200 OK) — Patient decline; body requires `{ declineReason: string, expectedVersion: number }`.

4. **Live Server Verification (`https://360api.vnvision.in`)**:
   - Authenticated probe of `GET /api/v1/doctors/treatment-offers` returns:
     ```json
     {
       "success": true,
       "statusCode": 200,
       "message": "Operation executed successfully",
       "data": { "data": [], "total": 0, "page": 1, "limit": 20 },
       "meta": { "timestamp": "2026-11-09T11:41:30.397Z" }
     }
     ```
   - Note the double wrapping on the list endpoint: `response.data` is `{ data: TreatmentOfferDTO[], total: number, page: number, limit: number }`, so the array is at `response.data.data`!
   - Conversely, single object endpoints (e.g. `POST`, `GET /:id`, `PUT`, `dispatch`, `cancel`) return the offer object directly in `response.data`.

---

## 2. Logic Chain

1. **Envelope Unwrapping Architecture (`response.data.data` vs `response.data`)**:
   - When calling `apiClient.get<T>(url)` or `apiClient.post<T>(url, body)`, `apiClient` returns `Promise<ApiResponse<T>>`.
   - For single-record endpoints (`create`, `get`, `update`, `dispatch`, `cancel`, `accept`), the backend envelope is:
     `{ success: true, statusCode: 200, data: TreatmentOfferDTO }`.
     Therefore, `res.data` is the `TreatmentOfferDTO`.
   - For the list endpoint (`listTreatmentOffers`), the backend envelope is:
     `{ success: true, statusCode: 200, data: { data: TreatmentOfferDTO[], total: number, page: number, limit: number } }`.
     Therefore, `res.data` is `{ data: TreatmentOfferDTO[], total, page, limit }`, and the items array is at `res.data.data`.
   - To prevent runtime regressions from envelope variations across staging/production, `treatmentOfferService` must include defensive unwrappers:
     - `unwrapOfferDTO`: Checks if payload has nested `data.id` vs `id`.
     - `unwrapTreatmentOffersList`: Checks whether payload is a direct array `T[]` or paginated `{ data: T[], total, page, limit }`.
     - `unwrapStatusResponse`: Checks if status object is at `res.data` or nested.

2. **Optimistic Concurrency Control (Version Locking)**:
   - Staging enforces optimistic locking: `PUT`, `dispatch`, `cancel`, `accept`, and `reject` all expect `expectedVersion: number`.
   - When a draft is created, the backend sets `version: 1`.
   - Every mutation increments `version`.
   - Submitting an outdated `expectedVersion` returns HTTP 409 Conflict.
   - The service must enforce `expectedVersion` in payload interfaces and provide an `isVersionConflictError(error)` helper.

3. **Status State Machine**:
   - `DRAFT`: Can be updated via `updateTreatmentOffer`.
   - `DISPATCHED`: Transitioned by `dispatchTreatmentOffer`. Immutable.
   - `PATIENT_REVIEWING`: Triggered when patient opens offer (`patientViewedAt` populated).
   - `RATIFIED_ACCEPTED` / `ACCEPTED`: Triggered when patient accepts (`patientRespondedAt` populated).
   - `DECLINED`: Triggered when patient rejects.
   - `CANCELLED`: Triggered when doctor cancels (`cancellationReason` populated).
   - `EXPIRED`: Triggered when `validUntil < NOW()`.

4. **URL Parameter Encoding**:
   - All dynamic path segments (`id`, `offerId`) must be passed through `encodeURIComponent(id)` to prevent URL injection and path traversal.

---

## 3. Caveats

1. **Read-Only Explorer Scope**:
   - This report does NOT modify project source files directly. The complete, production-ready TypeScript code is provided in Section 4 for the implementer agent.
2. **Patient Accept Endpoint Context**:
   - `POST /api/v1/patients/treatment-offers/:id/accept` is technically a Patient App endpoint (Postman Folder 06). In Doctor Web, this endpoint is provided as a test/simulation utility so doctors and QA testers can ratify proposals during development/testing without switching apps.
3. **Currency Units**:
   - Staging returns `"currency": "PKR"`, but the Doctor Web frontend UI displays `$` (USD). The frontend UI formatting handles display symbols without altering the raw numeric amounts in DTOs.
4. **CPT Catalog Absence**:
   - No backend `/api/v1/cpt` catalog endpoint exists. The `procedures` array accepts freeform procedure codes and names inputted by the doctor.

---

## 4. Conclusion: Complete Implementation Blueprint

### 4.1 Target File Location
`src/services/treatmentOfferService.ts`

### 4.2 Exact TypeScript Source Code

```typescript
/**
 * CareID Doctor Web - Treatment Offer API Service
 * 
 * Source of Truth: Postman Collection (CareID-Staging.postman_collection.json)
 * - Folder 05. Doctor Portal:
 *   1. POST /api/v1/doctors/treatment-offers (Create a new draft treatment proposal)
 *   2. GET /api/v1/doctors/treatment-offers (List authored treatment proposals)
 *   3. GET /api/v1/doctors/treatment-offers/:id (Get treatment offer details)
 *   4. PUT /api/v1/doctors/treatment-offers/:id (Update draft treatment offer)
 *   5. POST /api/v1/doctors/treatment-offers/:id/dispatch (Lock draft and dispatch to patient)
 *   6. GET /api/v1/doctors/treatment-offers/:id/status (Inspect live offer lifecycle status)
 *   7. POST /api/v1/doctors/treatment-offers/:id/cancel (Doctor cancels active treatment proposal)
 * - Folder 06. Patient App:
 *   8. POST /api/v1/patients/treatment-offers/:id/accept (Patient ratifies/accepts offer)
 *   9. POST /api/v1/patients/treatment-offers/:id/reject (Patient declines offer)
 */

import { apiClient, ApiResponse, ApiError } from './apiClient';

// --- Type Definitions ---

export type TreatmentOfferStatus =
  | 'DRAFT'
  | 'DISPATCHED'
  | 'PATIENT_REVIEWING'
  | 'RATIFIED_ACCEPTED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED';

export type ProcedureCategory = 'SURGICAL' | 'DIAGNOSTIC' | 'THERAPEUTIC';

export interface TreatmentProcedureItem {
  id?: string;
  procedureCode: string;
  procedureName: string;
  category: ProcedureCategory | string;
  quantity: number;
  unitCost: number;
  totalCost?: number;
  isOptional: boolean;
  sequenceOrder?: number;
  clinicalJustification: string;
}

export interface CreateTreatmentOfferProcedurePayload {
  procedureCode: string;
  procedureName: string;
  unitCost: number;
  category: ProcedureCategory | string;
  quantity: number;
  isOptional: boolean;
  clinicalJustification: string;
}

export interface TreatmentOfferHistoryEntry {
  id: string;
  action: string;
  previousStatus: string;
  newStatus: string;
  performedBy: string;
  performerRole: string;
  notes?: string;
  createdAt: string;
}

export interface CreateTreatmentOfferPayload {
  patientProfileId: string;
  facilityId: string;
  clinicalIndication: string;
  procedures: CreateTreatmentOfferProcedurePayload[];
  validUntil: string; // ISO 8601 string (e.g. 2026-12-31T23:59:59.000Z)
  encounterId?: string;
  discountAmount: number;
  financingEligible: boolean;
  recommendedTenureMonths: number;
  clinicalNotes: string;
  termsAndConditions: string;
}

export interface UpdateTreatmentOfferPayload {
  clinicalIndication?: string;
  procedures?: CreateTreatmentOfferProcedurePayload[];
  discountAmount?: number;
  financingEligible?: boolean;
  recommendedTenureMonths?: number;
  validUntil?: string;
  clinicalNotes?: string;
  termsAndConditions?: string;
  expectedVersion: number;
}

export interface DispatchTreatmentOfferPayload {
  expectedVersion: number;
}

export interface CancelTreatmentOfferPayload {
  cancellationReason: string;
  expectedVersion: number;
}

export interface PatientAcceptTreatmentOfferPayload {
  signatureConsent: boolean;
  patientResponseNotes?: string;
  expectedVersion: number;
}

export interface PatientDeclineTreatmentOfferPayload {
  declineReason: string;
  expectedVersion: number;
}

export interface TreatmentOfferDTO {
  id: string;
  offerNumber: string;
  doctorProfileId: string;
  patientProfileId: string;
  facilityId: string;
  clinicalIndication: string;
  grossEstimate: number;
  discountAmount: number;
  netPayable: number;
  currency: string;
  financingEligible: boolean;
  status: TreatmentOfferStatus;
  validUntil: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  dispatchedAt?: string;
  patientViewedAt?: string;
  patientRespondedAt?: string;
  patientResponseNotes?: string;
  cancellationReason?: string;
  encounterId?: string;
  clinicalNotes: string;
  termsAndConditions: string;
  doctorName?: string;
  patientName?: string;
  facilityName?: string;
  recommendedTenureMonths?: number;
  procedures: TreatmentProcedureItem[];
  history?: TreatmentOfferHistoryEntry[];
}

export interface TreatmentOfferStatusResponse {
  id: string;
  offerNumber: string;
  status: TreatmentOfferStatus | string;
  isExpired: boolean;
  validUntil: string;
  version: number;
  dispatchedAt?: string;
  patientViewedAt?: string;
  patientRespondedAt?: string;
  patientResponseNotes?: string;
  cancellationReason?: string;
}

export interface ListTreatmentOffersParams {
  status?: TreatmentOfferStatus | string;
  patientId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedTreatmentOffers {
  data: TreatmentOfferDTO[];
  total: number;
  page: number;
  limit: number;
}

// --- Defensive Envelope Unwrapping Helpers ---

/**
 * Defensive unwrapper for single TreatmentOfferDTO responses.
 * Handles both { success: true, data: TreatmentOfferDTO }
 * and double-wrapped { success: true, data: { data: TreatmentOfferDTO } }.
 */
function unwrapOfferDTO(res: ApiResponse<TreatmentOfferDTO | { data: TreatmentOfferDTO }>): TreatmentOfferDTO {
  const payload = res.data;
  if (payload && typeof payload === 'object') {
    if ('data' in payload && (payload as { data: TreatmentOfferDTO }).data) {
      return (payload as { data: TreatmentOfferDTO }).data;
    }
    return payload as TreatmentOfferDTO;
  }
  throw new Error('Malformed treatment offer response received from server');
}

/**
 * Defensive unwrapper for paginated TreatmentOfferDTO lists.
 * Handles:
 * - Direct pagination: res.data = { data: TreatmentOfferDTO[], total, page, limit } (Postman & live backend)
 * - Flat array: res.data = TreatmentOfferDTO[]
 */
function unwrapTreatmentOffersList(
  res: ApiResponse<PaginatedTreatmentOffers | TreatmentOfferDTO[]>
): PaginatedTreatmentOffers {
  const payload = res.data;
  if (Array.isArray(payload)) {
    return {
      data: payload,
      total: payload.length,
      page: 1,
      limit: payload.length,
    };
  }
  if (payload && typeof payload === 'object' && Array.isArray((payload as PaginatedTreatmentOffers).data)) {
    const p = payload as PaginatedTreatmentOffers;
    return {
      data: p.data,
      total: typeof p.total === 'number' ? p.total : p.data.length,
      page: typeof p.page === 'number' ? p.page : 1,
      limit: typeof p.limit === 'number' ? p.limit : 20,
    };
  }
  return { data: [], total: 0, page: 1, limit: 20 };
}

/**
 * Defensive unwrapper for TreatmentOfferStatusResponse.
 */
function unwrapStatusResponse(
  res: ApiResponse<TreatmentOfferStatusResponse | { data: TreatmentOfferStatusResponse }>
): TreatmentOfferStatusResponse {
  const payload = res.data;
  if (payload && typeof payload === 'object') {
    if ('data' in payload && (payload as { data: TreatmentOfferStatusResponse }).data) {
      return (payload as { data: TreatmentOfferStatusResponse }).data;
    }
    return payload as TreatmentOfferStatusResponse;
  }
  throw new Error('Malformed treatment offer status response received from server');
}

// --- Service Implementation ---

export const treatmentOfferService = {
  /**
   * 1. Create a new draft treatment proposal
   * Endpoint: POST /api/v1/doctors/treatment-offers
   */
  async createTreatmentOffer(payload: CreateTreatmentOfferPayload): Promise<TreatmentOfferDTO> {
    const res = await apiClient.post<TreatmentOfferDTO | { data: TreatmentOfferDTO }>(
      '/api/v1/doctors/treatment-offers',
      payload
    );
    return unwrapOfferDTO(res);
  },

  /**
   * 2. List authored treatment proposals with optional filters and pagination
   * Endpoint: GET /api/v1/doctors/treatment-offers
   */
  async listTreatmentOffers(params?: ListTreatmentOffersParams): Promise<PaginatedTreatmentOffers> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.patientId) query.append('patientId', params.patientId);
    if (params?.search) query.append('search', params.search);
    if (typeof params?.page === 'number') query.append('page', params.page.toString());
    if (typeof params?.limit === 'number') query.append('limit', params.limit.toString());

    const qs = query.toString();
    const endpoint = `/api/v1/doctors/treatment-offers${qs ? `?${qs}` : ''}`;

    const res = await apiClient.get<PaginatedTreatmentOffers | TreatmentOfferDTO[]>(endpoint);
    return unwrapTreatmentOffersList(res);
  },

  /**
   * 3. Get complete treatment offer details by ID
   * Endpoint: GET /api/v1/doctors/treatment-offers/:id
   */
  async getTreatmentOffer(id: string): Promise<TreatmentOfferDTO> {
    const res = await apiClient.get<TreatmentOfferDTO | { data: TreatmentOfferDTO }>(
      `/api/v1/doctors/treatment-offers/${encodeURIComponent(id)}`
    );
    return unwrapOfferDTO(res);
  },

  /**
   * 4. Update draft treatment offer (requires expectedVersion for optimistic locking)
   * Endpoint: PUT /api/v1/doctors/treatment-offers/:id
   */
  async updateTreatmentOffer(id: string, payload: UpdateTreatmentOfferPayload): Promise<TreatmentOfferDTO> {
    const res = await apiClient.put<TreatmentOfferDTO | { data: TreatmentOfferDTO }>(
      `/api/v1/doctors/treatment-offers/${encodeURIComponent(id)}`,
      payload
    );
    return unwrapOfferDTO(res);
  },

  /**
   * 5. Lock draft and dispatch treatment offer to patient
   * Endpoint: POST /api/v1/doctors/treatment-offers/:id/dispatch
   */
  async dispatchTreatmentOffer(id: string, expectedVersion: number): Promise<TreatmentOfferDTO> {
    const res = await apiClient.post<TreatmentOfferDTO | { data: TreatmentOfferDTO }>(
      `/api/v1/doctors/treatment-offers/${encodeURIComponent(id)}/dispatch`,
      { expectedVersion }
    );
    return unwrapOfferDTO(res);
  },

  /**
   * 6. Inspect live offer lifecycle status and review timestamps
   * Endpoint: GET /api/v1/doctors/treatment-offers/:id/status
   */
  async getTreatmentOfferStatus(id: string): Promise<TreatmentOfferStatusResponse> {
    const res = await apiClient.get<TreatmentOfferStatusResponse | { data: TreatmentOfferStatusResponse }>(
      `/api/v1/doctors/treatment-offers/${encodeURIComponent(id)}/status`
    );
    return unwrapStatusResponse(res);
  },

  /**
   * 7. Doctor cancels active treatment proposal with clinical justification
   * Endpoint: POST /api/v1/doctors/treatment-offers/:id/cancel
   */
  async cancelTreatmentOffer(
    id: string,
    reason: string,
    expectedVersion: number
  ): Promise<TreatmentOfferDTO> {
    const res = await apiClient.post<TreatmentOfferDTO | { data: TreatmentOfferDTO }>(
      `/api/v1/doctors/treatment-offers/${encodeURIComponent(id)}/cancel`,
      { cancellationReason: reason, expectedVersion }
    );
    return unwrapOfferDTO(res);
  },

  /**
   * 8. Patient ratifies and accepts treatment offer (Simulation & Test Support)
   * Endpoint: POST /api/v1/patients/treatment-offers/:id/accept
   */
  async patientAcceptTreatmentOffer(
    id: string,
    payload: {
      signatureConsent: boolean;
      patientResponseNotes?: string;
      expectedVersion: number;
    }
  ): Promise<TreatmentOfferDTO> {
    const res = await apiClient.post<TreatmentOfferDTO | { data: TreatmentOfferDTO }>(
      `/api/v1/patients/treatment-offers/${encodeURIComponent(id)}/accept`,
      payload
    );
    return unwrapOfferDTO(res);
  },

  /**
   * Companion: Patient declines treatment offer proposal (Simulation & Test Support)
   * Endpoint: POST /api/v1/patients/treatment-offers/:id/reject
   */
  async patientDeclineTreatmentOffer(
    id: string,
    payload: {
      declineReason: string;
      expectedVersion: number;
    }
  ): Promise<TreatmentOfferDTO> {
    const res = await apiClient.post<TreatmentOfferDTO | { data: TreatmentOfferDTO }>(
      `/api/v1/patients/treatment-offers/${encodeURIComponent(id)}/reject`,
      payload
    );
    return unwrapOfferDTO(res);
  },
};

// --- Error Handling Utilities ---

/**
 * Checks whether an error is an optimistic locking conflict (HTTP 409).
 */
export function isVersionConflictError(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 409;
}

/**
 * Extracts a user-facing error message from an ApiError or unknown exception.
 */
export function formatTreatmentOfferError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 409) {
      return 'The offer has been modified by another session. Please refresh and try again.';
    }
    if (error.statusCode === 400) {
      return error.messages.length > 0 ? error.messages.join('. ') : 'Invalid treatment offer parameters.';
    }
    if (error.statusCode === 404) {
      return 'Treatment offer not found.';
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred while processing the treatment offer.';
}
```

---

## 5. Verification Method

To independently verify the implementation blueprint once created:

1. **Static Type Checking**:
   Run TypeScript compiler check across the workspace:
   ```powershell
   npm run type-check
   ```
   *Expected Result*: 0 errors.

2. **Linting Check**:
   ```powershell
   npm run lint
   ```
   *Expected Result*: 0 errors.

3. **Production Build Compilation**:
   ```powershell
   npm run build
   ```
   *Expected Result*: Successful Vite bundle compilation.

4. **Integration Test Verification**:
   Execute Node script to assert all methods and types are exported correctly:
   ```powershell
   node -e "
   const service = require('./src/services/treatmentOfferService');
   console.log('Available methods:', Object.keys(service.treatmentOfferService));
   "
   ```

5. **Invalidation Conditions**:
   - Any backend response format deviation on staging where `POST /api/v1/doctors/treatment-offers` does not return `id` in `res.data`.
   - Modifying `apiClient.ts` to return raw `fetch` Responses instead of `ApiResponse<T>`.
