/**
 * CareID Consultations & Treatment Lifecycle - API Helper
 * Encapsulates live HTTP endpoints, auth headers, and response parsing against
 * https://360api.vnvision.in/api/v1.
 */

import { BASE_URL, getDoctorToken, TEST_PATIENT_ID, TEST_DOCTOR_ID, TEST_FACILITY_ID } from '../../helpers/authHelper.ts';

export { BASE_URL, getDoctorToken, TEST_PATIENT_ID, TEST_DOCTOR_ID, TEST_FACILITY_ID };

export interface ProcedureItemPayload {
  procedureCode: string;
  procedureName: string;
  unitCost: number;
  category: 'SURGICAL' | 'DIAGNOSTIC' | 'THERAPEUTIC';
  quantity: number;
  isOptional: boolean;
  clinicalJustification: string;
}

export interface CreateOfferPayload {
  patientProfileId: string;
  facilityId: string;
  clinicalIndication: string;
  procedures: ProcedureItemPayload[];
  validUntil: string;
  encounterId?: string;
  discountAmount: number;
  financingEligible: boolean;
  recommendedTenureMonths: number;
  clinicalNotes: string;
  termsAndConditions: string;
}

export interface UpdateOfferPayload {
  clinicalIndication?: string;
  procedures?: ProcedureItemPayload[];
  discountAmount?: number;
  financingEligible?: boolean;
  recommendedTenureMonths?: number;
  validUntil?: string;
  clinicalNotes?: string;
  termsAndConditions?: string;
  expectedVersion: number;
}

export interface TreatmentOfferDTO {
  id: string;
  offerNumber: string;
  doctorProfileId: string;
  doctorName?: string;
  patientProfileId: string;
  patientName?: string;
  facilityId: string;
  facilityName?: string;
  clinicalIndication: string;
  grossEstimate: number;
  discountAmount: number;
  netPayable: number;
  currency: string;
  financingEligible: boolean;
  recommendedTenureMonths: number;
  status: 'DRAFT' | 'DISPATCHED' | 'PATIENT_REVIEWING' | 'RATIFIED_ACCEPTED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
  validUntil: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  dispatchedAt?: string;
  patientViewedAt?: string;
  patientRespondedAt?: string;
  patientResponseNotes?: string;
  cancellationReason?: string;
  clinicalNotes: string;
  termsAndConditions: string;
  procedures: Array<{
    id?: string;
    procedureCode: string;
    procedureName: string;
    category: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    isOptional: boolean;
    sequenceOrder?: number;
    clinicalJustification: string;
  }>;
  history?: Array<{
    id: string;
    previousStatus?: string;
    newStatus: string;
    action: string;
    performedBy?: string;
    performerRole?: string;
    notes?: string;
    createdAt: string;
  }>;
}

export interface FinancingOptionDTO {
  id: string;
  partnerName: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  tenureMonths: number[];
  interestRate: number;
  processingFee: number;
  features: string[];
}

export interface ApiResponse<T = unknown> {
  status: number;
  body: {
    success?: boolean;
    statusCode?: number;
    message?: string | string[];
    error?: string;
    data?: T;
    meta?: Record<string, unknown>;
  };
}

/**
 * Build Authorization headers
 */
export async function getAuthHeaders(explicitToken?: string): Promise<Record<string, string>> {
  const token = explicitToken || (await getDoctorToken());
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

/**
 * Robust fetch with automatic retry on transient network drops
 */
async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 2): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err: unknown) {
      lastErr = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 750 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

/**
 * 1. POST /api/v1/doctors/treatment-offers - Create draft offer
 */
export async function createTreatmentOffer(
  payload: CreateOfferPayload | Record<string, unknown>,
  token?: string
): Promise<ApiResponse<TreatmentOfferDTO>> {
  const headers = await getAuthHeaders(token);
  const res = await fetchWithRetry(`${BASE_URL}/doctors/treatment-offers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * 2. GET /api/v1/doctors/treatment-offers - List offers
 */
export async function listTreatmentOffers(
  params: { status?: string; patientId?: string; search?: string; page?: number; limit?: number } = {},
  token?: string
): Promise<ApiResponse<{ data: TreatmentOfferDTO[]; total: number; page: number; limit: number }>> {
  const headers = await getAuthHeaders(token);
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.patientId) query.set('patientId', params.patientId);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  const url = `${BASE_URL}/doctors/treatment-offers${qs ? '?' + qs : ''}`;
  const res = await fetchWithRetry(url, { method: 'GET', headers });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * 3. GET /api/v1/doctors/treatment-offers/:offerId - Get offer details
 */
export async function getTreatmentOfferById(
  offerId: string,
  token?: string
): Promise<ApiResponse<TreatmentOfferDTO>> {
  const headers = await getAuthHeaders(token);
  const res = await fetchWithRetry(`${BASE_URL}/doctors/treatment-offers/${encodeURIComponent(offerId)}`, {
    method: 'GET',
    headers,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * 4. PUT /api/v1/doctors/treatment-offers/:offerId - Update draft offer
 */
export async function updateTreatmentOffer(
  offerId: string,
  payload: UpdateOfferPayload | Record<string, unknown>,
  token?: string
): Promise<ApiResponse<TreatmentOfferDTO>> {
  const headers = await getAuthHeaders(token);
  const res = await fetchWithRetry(`${BASE_URL}/doctors/treatment-offers/${encodeURIComponent(offerId)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * 5. POST /api/v1/doctors/treatment-offers/:offerId/dispatch - Dispatch offer
 */
export async function dispatchTreatmentOffer(
  offerId: string,
  expectedVersion: number = 1,
  token?: string
): Promise<ApiResponse<TreatmentOfferDTO>> {
  const headers = await getAuthHeaders(token);
  const res = await fetchWithRetry(`${BASE_URL}/doctors/treatment-offers/${encodeURIComponent(offerId)}/dispatch`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ expectedVersion }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * 6. GET /api/v1/doctors/treatment-offers/:offerId/status - Lifecycle status query
 */
export async function getTreatmentOfferStatus(
  offerId: string,
  token?: string
): Promise<ApiResponse<{
  id: string;
  offerNumber: string;
  status: string;
  isExpired: boolean;
  validUntil: string;
  version: number;
  dispatchedAt?: string;
  patientViewedAt?: string;
  patientRespondedAt?: string;
  patientResponseNotes?: string;
  cancellationReason?: string;
}>> {
  const headers = await getAuthHeaders(token);
  const res = await fetchWithRetry(`${BASE_URL}/doctors/treatment-offers/${encodeURIComponent(offerId)}/status`, {
    method: 'GET',
    headers,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * 7. POST /api/v1/doctors/treatment-offers/:offerId/cancel - Doctor cancels offer
 */
export async function cancelTreatmentOffer(
  offerId: string,
  cancellationReason: string,
  expectedVersion: number,
  token?: string
): Promise<ApiResponse<TreatmentOfferDTO>> {
  const headers = await getAuthHeaders(token);
  const res = await fetchWithRetry(`${BASE_URL}/doctors/treatment-offers/${encodeURIComponent(offerId)}/cancel`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ cancellationReason, expectedVersion }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * 8. GET /api/v1/financing/options - Available financing programs
 */
export async function getFinancingOptions(token?: string): Promise<ApiResponse<FinancingOptionDTO[]>> {
  const headers = await getAuthHeaders(token);
  const res = await fetchWithRetry(`${BASE_URL}/financing/options`, { method: 'GET', headers });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * 9. GET /api/v1/financing/offers - Pre-approved financing offers
 */
export async function getFinancingOffers(token?: string): Promise<ApiResponse<FinancingOptionDTO[]>> {
  const headers = await getAuthHeaders(token);
  const res = await fetchWithRetry(`${BASE_URL}/financing/offers`, { method: 'GET', headers });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * 10. POST /api/v1/financing/apply - Apply for financing
 */
export async function applyForFinancing(
  payload: Record<string, unknown>,
  token?: string
): Promise<ApiResponse<Record<string, unknown>>> {
  const headers = await getAuthHeaders(token);
  const res = await fetchWithRetry(`${BASE_URL}/financing/apply`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * 11. GET /api/v1/appointments/doctor/me - Doctor appointments
 */
export async function getDoctorAppointments(token?: string): Promise<ApiResponse<Array<Record<string, unknown>>>> {
  const headers = await getAuthHeaders(token);
  const res = await fetchWithRetry(`${BASE_URL}/appointments/doctor/me`, { method: 'GET', headers });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * 12. GET /api/v1/doctors/me - Doctor profile
 */
export async function getDoctorProfile(token?: string): Promise<ApiResponse<Record<string, unknown>>> {
  const headers = await getAuthHeaders(token);
  const res = await fetchWithRetry(`${BASE_URL}/doctors/me`, { method: 'GET', headers });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * 13. GET /api/v1/doctors/patients/:patientProfileId - Authoritative patient profile resolution
 */
export async function getDoctorPatientProfile(
  patientProfileId: string,
  token?: string
): Promise<ApiResponse<Record<string, unknown>>> {
  const headers = await getAuthHeaders(token);
  const res = await fetchWithRetry(
    `${BASE_URL}/doctors/patients/${encodeURIComponent(patientProfileId.trim().toLowerCase())}`,
    { method: 'GET', headers }
  );
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}


