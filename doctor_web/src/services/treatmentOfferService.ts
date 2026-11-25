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
  currency?: string;
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
  attestationStatement?: string;
}

export interface AttestTreatmentOfferPayload {
  statement: string;
  confirmTruthfulness: boolean;
  licenseNumber: string;
  termsVersion: string;
  digitalSignatureHash: string;
}

export interface TreatmentOfferAttestationDTO {
  id: string;
  treatmentOfferId: string;
  statement: string;
  cryptographicAttestationHash?: string;
  digitalSignatureHash?: string;
  attestedBy: string;
  attestedAt: string;
  licenseNumber?: string;
  termsVersion?: string;
  confirmTruthfulness?: boolean;
}

export type ClinicalReviewAction = 'APPROVED' | 'REJECTED' | 'NEEDS_INFORMATION';

export interface SubmitClinicalReviewPayload {
  action: ClinicalReviewAction;
  comments: string;
  reviewCriteria?: string[];
}

export interface ClinicalReviewDTO {
  treatmentOfferId: string;
  status: 'APPROVED' | 'REJECTED' | 'NEEDS_INFORMATION' | 'PENDING' | string;
  comments?: string;
  reviewedBy?: string;
  reviewerName?: string;
  reviewedAt?: string;
  reviewerRole?: string;
  reviewCriteria?: string[];
  eligibleForDispatch?: boolean;
  eligibilityReason?: string;
  offerVersion?: number;
  isOutdatedVersion?: boolean;
  meta?: { timestamp?: string };
}

export interface FinancingSimulationPayload {
  partnerName: string;
  tenureMonths: number[];
  interestRate: number;
  downPaymentPercent: number;
}

export interface FinancingSimulationOptionItem {
  tenureMonths: number;
  interestRate: number;
  monthlyEmi: number;
  downPayment: number;
  totalPayable: number;
  totalInterest: number;
}

export interface FinancingSimulationDTO {
  treatmentOfferId: string;
  partnerName: string;
  netPayable: number;
  downPayment: number;
  principalAmount: number;
  simulationEstimateOnly?: boolean;
  options: FinancingSimulationOptionItem[];
}

export interface BindFinancingPayload {
  partnerName: string;
  tenureMonths: number[];
  interestRate: number;
  minDownPayment: number;
  maxApprovedAmount: number;
  processingFee: number;
  creditTier: string;
}

export interface BoundFinancingOfferDTO {
  id: string;
  offerNumber?: string;
  treatmentOfferId: string;
  patientProfileId?: string;
  partnerName: string;
  maxApprovedAmount: number;
  minDownPayment: number;
  tenureMonths: number[];
  interestRate: number;
  processingFee: number;
  creditTier?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TreatmentOfferDiscountStatusDTO {
  treatmentOfferId: string;
  grossEstimate: number;
  discountAmount: number;
  discountPercent: number;
  requiresSupervisorApproval: boolean;
  isApproved: boolean;
  approvalStatus: string;
  maxAllowedDiscountPercent?: number;
  supervisorThresholdPercent?: number;
  approvedBy?: string;
  approvedAt?: string;
  comments?: string;
}

export interface ApproveDiscountPayload {
  approved: boolean;
  comments: string;
  approvedDiscountPercent: number;
}

export interface FacilityPricingRulesDTO {
  facilityId: string;
  maxDiscountWithoutApproval?: number;
  standardDiscounts?: Array<{ name: string; percentage: number }>;
  currency?: string;
  tier?: string;
  [key: string]: unknown;
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
  async dispatchTreatmentOffer(
    id: string,
    expectedVersion: number,
    attestationStatement?: string
  ): Promise<TreatmentOfferDTO> {
    const payload: DispatchTreatmentOfferPayload = { expectedVersion };
    if (attestationStatement) {
      payload.attestationStatement = attestationStatement;
    }
    const res = await apiClient.post<TreatmentOfferDTO | { data: TreatmentOfferDTO }>(
      `/api/v1/doctors/treatment-offers/${encodeURIComponent(id)}/dispatch`,
      payload
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

  /**
   * 9. Get digital acceptance certificate for an accepted treatment offer
   * Endpoint: GET /api/v1/doctors/treatment-offers/:offerId/acceptance-certificate
   */
  async getAcceptanceCertificate(offerId: string): Promise<AcceptanceCertificateDTO> {
    const res = await apiClient.get<AcceptanceCertificateDTO | { data: AcceptanceCertificateDTO }>(
      `/api/v1/doctors/treatment-offers/${encodeURIComponent(offerId)}/acceptance-certificate`
    );
    const payload = res.data;
    if (payload && typeof payload === 'object' && 'data' in payload && (payload as { data: AcceptanceCertificateDTO }).data) {
      return (payload as { data: AcceptanceCertificateDTO }).data;
    }
    return payload as AcceptanceCertificateDTO;
  },

  /**
   * 10. Get pre-operative clinical clearance checklist for a treatment offer
   * Endpoints: GET /api/v1/doctors/treatment-offers/:offerId/clearance
   *   fallback: GET /api/v1/treatment-offers/:offerId/clearance
   */
  async getPreOpClearance(offerId: string): Promise<PreOpClearanceDTO> {
    try {
      const res = await apiClient.get<PreOpClearanceDTO | { data: PreOpClearanceDTO }>(
        `/api/v1/doctors/treatment-offers/${encodeURIComponent(offerId)}/clearance`
      );
      const payload = res.data;
      if (payload && typeof payload === 'object' && 'data' in payload && (payload as { data: PreOpClearanceDTO }).data) {
        return (payload as { data: PreOpClearanceDTO }).data;
      }
      return payload as PreOpClearanceDTO;
    } catch {
      const res = await apiClient.get<PreOpClearanceDTO | { data: PreOpClearanceDTO }>(
        `/api/v1/treatment-offers/${encodeURIComponent(offerId)}/clearance`
      );
      const payload = res.data;
      if (payload && typeof payload === 'object' && 'data' in payload && (payload as { data: PreOpClearanceDTO }).data) {
        return (payload as { data: PreOpClearanceDTO }).data;
      }
      return payload as PreOpClearanceDTO;
    }
  },

  /**
   * 11. Update pre-operative clinical clearance checklist
   * Endpoints: PUT /api/v1/doctors/treatment-offers/:offerId/clearance
   *   fallback: PUT /api/v1/treatment-offers/:offerId/clearance
   */
  async updatePreOpClearance(
    offerId: string,
    payload: UpdatePreOpClearancePayload
  ): Promise<PreOpClearanceDTO> {
    try {
      const res = await apiClient.put<PreOpClearanceDTO | { data: PreOpClearanceDTO }>(
        `/api/v1/doctors/treatment-offers/${encodeURIComponent(offerId)}/clearance`,
        payload
      );
      const data = res.data;
      if (data && typeof data === 'object' && 'data' in data && (data as { data: PreOpClearanceDTO }).data) {
        return (data as { data: PreOpClearanceDTO }).data;
      }
      return data as PreOpClearanceDTO;
    } catch {
      const res = await apiClient.put<PreOpClearanceDTO | { data: PreOpClearanceDTO }>(
        `/api/v1/treatment-offers/${encodeURIComponent(offerId)}/clearance`,
        payload
      );
      const data = res.data;
      if (data && typeof data === 'object' && 'data' in data && (data as { data: PreOpClearanceDTO }).data) {
        return (data as { data: PreOpClearanceDTO }).data;
      }
      return data as PreOpClearanceDTO;
    }
  },

  /**
   * Stage 2: Inspect discount approval audit status, thresholds, and supervisor decision
   * Endpoint: GET /api/v1/doctors/treatment-offers/:offerId/discount-status
   */
  async getDiscountStatus(offerId: string): Promise<TreatmentOfferDiscountStatusDTO> {
    const res = await apiClient.get<TreatmentOfferDiscountStatusDTO | { data: TreatmentOfferDiscountStatusDTO }>(
      `/api/v1/doctors/treatment-offers/${encodeURIComponent(offerId)}/discount-status`
    );
    const payload = res.data;
    if (payload && typeof payload === 'object' && 'data' in payload && (payload as { data: TreatmentOfferDiscountStatusDTO }).data) {
      return (payload as { data: TreatmentOfferDiscountStatusDTO }).data;
    }
    return payload as TreatmentOfferDiscountStatusDTO;
  },

  /**
   * Stage 2: Supervisor approves or rejects treatment offer discount exceeding threshold
   * Endpoint: POST /api/v1/doctors/treatment-offers/:offerId/approve-discount
   */
  async approveDiscount(
    offerId: string,
    payload: ApproveDiscountPayload
  ): Promise<TreatmentOfferDiscountStatusDTO> {
    const res = await apiClient.post<TreatmentOfferDiscountStatusDTO | { data: TreatmentOfferDiscountStatusDTO }>(
      `/api/v1/doctors/treatment-offers/${encodeURIComponent(offerId)}/approve-discount`,
      payload
    );
    const data = res.data;
    if (data && typeof data === 'object' && 'data' in data && (data as { data: TreatmentOfferDiscountStatusDTO }).data) {
      return (data as { data: TreatmentOfferDiscountStatusDTO }).data;
    }
    return data as TreatmentOfferDiscountStatusDTO;
  },

  /**
   * Stage 3: Calculate financing tenure, down-payment, and monthly EMI simulation
   * Endpoint: POST /api/v1/doctors/treatment-offers/:offerId/financing-preview
   */
  async previewFinancingSimulation(
    offerId: string,
    payload: FinancingSimulationPayload
  ): Promise<FinancingSimulationDTO> {
    const res = await apiClient.post<FinancingSimulationDTO | { data: FinancingSimulationDTO }>(
      `/api/v1/doctors/treatment-offers/${encodeURIComponent(offerId)}/financing-preview`,
      payload
    );
    const data = res.data;
    if (data && typeof data === 'object' && 'data' in data && (data as { data: FinancingSimulationDTO }).data) {
      return (data as { data: FinancingSimulationDTO }).data;
    }
    return data as FinancingSimulationDTO;
  },

  /**
   * Stage 3: Bind partner healthcare financing package to treatment proposal
   * Endpoint: PUT /api/v1/doctors/treatment-offers/:offerId/financing
   */
  async bindFinancingPackage(
    offerId: string,
    payload: BindFinancingPayload
  ): Promise<BoundFinancingOfferDTO> {
    const res = await apiClient.put<BoundFinancingOfferDTO | { data: BoundFinancingOfferDTO }>(
      `/api/v1/doctors/treatment-offers/${encodeURIComponent(offerId)}/financing`,
      payload
    );
    const data = res.data;
    if (data && typeof data === 'object' && 'data' in data && (data as { data: BoundFinancingOfferDTO }).data) {
      return (data as { data: BoundFinancingOfferDTO }).data;
    }
    return data as BoundFinancingOfferDTO;
  },

  /**
   * Stage 3: Retrieve bound partner financing offer for treatment proposal
   * Endpoint: GET /api/v1/doctors/treatment-offers/:offerId/financing
   */
  async getBoundFinancing(offerId: string): Promise<BoundFinancingOfferDTO> {
    const res = await apiClient.get<BoundFinancingOfferDTO | { data: BoundFinancingOfferDTO }>(
      `/api/v1/doctors/treatment-offers/${encodeURIComponent(offerId)}/financing`
    );
    const data = res.data;
    if (data && typeof data === 'object' && 'data' in data && (data as { data: BoundFinancingOfferDTO }).data) {
      return (data as { data: BoundFinancingOfferDTO }).data;
    }
    return data as BoundFinancingOfferDTO;
  },

  /**
   * Stage 5: Physician attests to clinical necessity and appropriateness of proposed care
   * Endpoint: POST /api/v1/doctors/treatment-offers/:offerId/attest
   */
  async attestTreatmentOffer(
    offerId: string,
    payload: AttestTreatmentOfferPayload
  ): Promise<TreatmentOfferAttestationDTO> {
    const res = await apiClient.post<TreatmentOfferAttestationDTO | { data: TreatmentOfferAttestationDTO }>(
      `/api/v1/doctors/treatment-offers/${encodeURIComponent(offerId)}/attest`,
      payload
    );
    const data = res.data;
    if (data && typeof data === 'object' && 'data' in data && (data as { data: TreatmentOfferAttestationDTO }).data) {
      return (data as { data: TreatmentOfferAttestationDTO }).data;
    }
    return data as TreatmentOfferAttestationDTO;
  },

  /**
   * Stage 5: List physician attestations and digital signature records for treatment offer
   * Endpoint: GET /api/v1/doctors/treatment-offers/:offerId/attestations
   */
  async listTreatmentOfferAttestations(offerId: string): Promise<TreatmentOfferAttestationDTO[]> {
    const res = await apiClient.get<TreatmentOfferAttestationDTO[] | { data: TreatmentOfferAttestationDTO[] }>(
      `/api/v1/doctors/treatment-offers/${encodeURIComponent(offerId)}/attestations`
    );
    const payload = res.data;
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && typeof payload === 'object' && Array.isArray((payload as { data: TreatmentOfferAttestationDTO[] }).data)) {
      return (payload as { data: TreatmentOfferAttestationDTO[] }).data;
    }
    return [];
  },

  /**
   * Stage 6: Submit multidisciplinary clinical review for treatment offer
   * Endpoint: POST /api/v1/doctors/treatment-offers/:offerId/clinical-review
   */
  async submitClinicalReview(
    offerId: string,
    payload: SubmitClinicalReviewPayload
  ): Promise<ClinicalReviewDTO> {
    const res = await apiClient.post<ClinicalReviewDTO | { data: ClinicalReviewDTO }>(
      `/api/v1/doctors/treatment-offers/${encodeURIComponent(offerId)}/clinical-review`,
      payload
    );
    const data = res.data;
    if (data && typeof data === 'object' && 'data' in data && (data as { data: ClinicalReviewDTO }).data) {
      return (data as { data: ClinicalReviewDTO }).data;
    }
    return data as ClinicalReviewDTO;
  },

  /**
   * Stage 6: Get current clinical review decision and notes
   * Endpoint: GET /api/v1/doctors/treatment-offers/:offerId/clinical-review
   */
  async getClinicalReview(offerId: string): Promise<ClinicalReviewDTO> {
    const res = await apiClient.get<ClinicalReviewDTO | { data: ClinicalReviewDTO }>(
      `/api/v1/doctors/treatment-offers/${encodeURIComponent(offerId)}/clinical-review`
    );
    const data = res.data;
    if (data && typeof data === 'object' && 'data' in data && (data as { data: ClinicalReviewDTO }).data) {
      return (data as { data: ClinicalReviewDTO }).data;
    }
    return data as ClinicalReviewDTO;
  },

  /**
   * Stage 7: Resend treatment proposal notification / SMS reminder to patient
   * Endpoint: POST /api/v1/doctors/treatment-offers/:offerId/resend
   */
  async resendOfferNotification(offerId: string): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient.post<{ success: boolean; message?: string } | { data: { success: boolean; message?: string } }>(
      `/api/v1/doctors/treatment-offers/${encodeURIComponent(offerId)}/resend`
    );
    const data = res.data;
    if (data && typeof data === 'object' && 'data' in data && (data as { data: { success: boolean; message?: string } }).data) {
      return (data as { data: { success: boolean; message?: string } }).data;
    }
    return data as { success: boolean; message?: string };
  },
};

export interface AcceptanceCertificateDTO {
  offerId?: string;
  treatmentOfferId?: string;
  offerNumber?: string;
  certificateId?: string;
  status?: string;
  acceptedAt?: string;
  patientRespondedAt?: string;
  signatureHash?: string;
  auditHash?: string;
  patientName?: string;
  doctorName?: string;
  facilityName?: string;
  netAmount?: number;
  totalAmount?: number;
  [key: string]: unknown;
}

export interface PreOpClearanceItemDTO {
  status: string;
  clearedBy?: string | null;
  clearedAt?: string | null;
  notes?: string | null;
}

export interface SpecialistReviewItemDTO {
  specialty: string;
  status: string;
  decision?: string;
  reviewerId?: string | null;
  reviewerName?: string | null;
  decisionTimestamp?: string | null;
  clinicalRemarks?: string | null;
}

export interface DynamicClearanceRequirementDTO {
  id: string;
  requirementId?: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  isMandatory: boolean;
  isSchedulingPrerequisite?: boolean;
  sortOrder: number;
  status: string;
  requiredEvidenceType: string;
  reviewerRole: string;
  specialistReviews?: SpecialistReviewItemDTO[];
  clearedAt?: string | null;
  clearedBy?: string | null;
  notes?: string | null;
  clinicalRemarks?: string | null;
  unmetReason?: string | null;
}

export interface LabReportTestItemDTO {
  testName: string;
  resultValue: string;
  unit: string;
  referenceRange: string;
  interpretation: string;
}

export interface PatientLabReportDTO {
  id: string;
  laboratoryName: string;
  reportedDate: string;
  status: string;
  overallNotes?: string;
  testItems?: LabReportTestItemDTO[];
}

import { StructuredSafetyHoldItem } from '@/utils/clinicalDataSanitizer';

export interface PreOpClearanceDTO {
  treatmentOfferId: string;
  offerNumber?: string;
  overallStatus: string;
  completedGatesCount?: number;
  totalGatesCount?: number;
  readinessPercentage?: number;
  cleanClinicalIndication?: string;
  hasLegacySafetyHoldData?: boolean;
  hasAmbiguousLegacyData?: boolean;
  safetyHolds?: StructuredSafetyHoldItem[];
  policy?: {
    id: string;
    policyNumber: string;
    name: string;
    version: number;
    schedulingPrerequisites?: string[];
  };
  requirements?: DynamicClearanceRequirementDTO[];
  availableLabReports?: PatientLabReportDTO[];
  cardiologyClearance?: PreOpClearanceItemDTO | string | null;
  anesthesiaClearance?: PreOpClearanceItemDTO | string | null;
  medicalClearance?: PreOpClearanceItemDTO | string | null;
  surgicalClearance?: PreOpClearanceItemDTO | string | null;
  labClearance?: PreOpClearanceItemDTO | string | null;
  notes?: string | null;
  updatedAt?: string;
}

export interface UpdatePreOpClearancePayload {
  cardiologyClearance?: string | { status: string; notes?: string };
  anesthesiaClearance?: string | { status: string; notes?: string };
  medicalClearance?: string | { status: string; notes?: string };
  surgicalClearance?: string | { status: string; notes?: string };
  labClearance?: string | { status: string; notes?: string };
  requirementCode?: string;
  status?: string;
  specialty?: string;
  evidenceRecordId?: string;
  clinicalRemarks?: string;
  notes?: string;
}

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
      return (
        error.message ||
        (error.messages && error.messages.length > 0
          ? error.messages.join('. ')
          : 'The treatment offer was modified concurrently by another session. Please refresh.')
      );
    }
    if (error.statusCode === 400) {
      return error.messages.length > 0 ? error.messages.join('. ') : error.message || 'Invalid treatment offer parameters.';
    }
    if (error.statusCode === 404) {
      return error.message || 'Treatment offer not found.';
    }
    return (
      error.message ||
      (error.messages && error.messages.length > 0
        ? error.messages.join('. ')
        : 'An unexpected error occurred while processing the treatment offer.')
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred while processing the treatment offer.';
}
