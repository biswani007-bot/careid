/**
 * CareID Doctor Web — Referral & Care Coordination API Service
 * 
 * Source of Truth: Postman Collection (CareID-Staging.postman_collection.json)
 * Folder: 11. Referrals & Care Coordination (16 documented endpoints)
 * 
 * 1. POST   /api/v1/referrals                      - Create patient care referral
 * 2. GET    /api/v1/referrals                      - List patient care referrals with optional filters
 * 3. GET    /api/v1/referrals/my-incoming          - List incoming referrals for current doctor/facility
 * 4. GET    /api/v1/referrals/my-outgoing          - List outgoing referrals created by current doctor
 * 5. GET    /api/v1/referrals/dashboard/stats      - Get referral dashboard metrics and SLA performance
 * 6. GET    /api/v1/referrals/:id                  - Get referral details by ID
 * 7. PUT    /api/v1/referrals/:id                  - Update referral clinical details
 * 8. DELETE /api/v1/referrals/:id                  - Soft-delete pending referral
 * 9. PUT    /api/v1/referrals/:id/triage           - Triage patient referral (Approve/Decline/Redirect)
 * 10. PUT   /api/v1/referrals/:id/status           - Update referral status (IN_PROGRESS, COMPLETED, CANCELLED)
 * 11. PATCH /api/v1/referrals/:id/status           - Update referral status (alias for PUT :id/status)
 * 12. POST  /api/v1/referrals/:id/notes            - Add clinical coordination note to referral
 * 13. GET   /api/v1/referrals/:id/notes            - List clinical notes for referral
 * 14. POST  /api/v1/referrals/:id/attachments      - Link medical attachment to referral
 * 15. GET   /api/v1/referrals/:id/attachments      - List linked medical attachments for referral
 * 16. GET   /api/v1/referrals/:id/history          - Get immutable status transition history
 */

import { apiClient, ApiResponse, ApiDownloadResult, triggerBrowserDownload } from './apiClient';

// --- Referral DTO Contracts strictly matching backend schema ---

export interface ReferralPatientDTO {
  id: string;
  patientProfileId?: string;
  userId?: string;
  fullName: string;
  patientNumber?: string;
  gender?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
}

export interface ReferralDoctorDTO {
  id: string;
  userId?: string;
  fullName: string;
  primarySpecialization?: string;
  licenseNumber?: string;
  department?: string;
}

export interface ReferralFacilityDTO {
  id: string;
  name: string;
  code?: string;
  facilityCode?: string;
  facilityType?: string;
  address?: string;
  streetAddress?: string;
  phone?: string;
}

export interface ReferralNoteDTO {
  id: string;
  referralId: string;
  authorId: string;
  authorRole: string;
  noteText: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface ReferralAttachmentDTO {
  id: string;
  referralId: string;
  attachmentId: string;
  attachedBy?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  url?: string;
  createdAt: string;
}

export interface ReferralStatusHistoryDTO {
  id: string;
  referralId: string;
  fromStatus?: string;
  toStatus: string;
  changedBy: string;
  reason?: string;
  createdAt: string;
}

export interface ReferralDTO {
  id: string;
  referralNumber: string;
  patientId: string;
  referringDoctorId: string;
  referringFacilityId?: string;
  receivingDoctorId?: string;
  receivingFacilityId?: string;
  medicalRecordId?: string;
  accessScope?: string;
  referralType: string;
  priority: 'URGENT' | 'ROUTINE' | string;
  status: 'SUBMITTED' | 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED' | string;
  reasonForReferral: string;
  clinicalSummary?: string;
  specialtyRequired: string;
  expiresAt?: string;
  acceptedAt?: string;
  completedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  notes?: ReferralNoteDTO[];
  attachments?: ReferralAttachmentDTO[];
  statusHistory?: ReferralStatusHistoryDTO[];
  patient?: ReferralPatientDTO;
  referringDoctor?: ReferralDoctorDTO;
  receivingDoctor?: ReferralDoctorDTO;
  referringFacility?: ReferralFacilityDTO;
  receivingFacility?: ReferralFacilityDTO;
}

export interface ReferralPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  timestamp?: string;
}

export interface PaginatedReferralsResponse {
  data: ReferralDTO[];
  meta: ReferralPaginationMeta;
}

export interface ReferralDashboardStatsDTO {
  totalReferrals: number;
  pendingTriageCount: number;
  acceptedCount: number;
  completedCount: number;
  avgCompletionTimeHours: number;
}

// --- Request Payloads ---

export interface CreateReferralPayload {
  patientId: string;
  receivingFacilityId: string;
  receivingDoctorId?: string;
  priority: 'URGENT' | 'ROUTINE';
  referralType: 'SPECIALIST_CONSULTATION' | string;
  reasonForReferral: string;
  clinicalSummary: string;
  specialtyRequired: string;
  medicalRecordId?: string;
  accessScope?: string;
}

export interface UpdateReferralClinicalPayload {
  priority?: 'URGENT' | 'ROUTINE';
  reasonForReferral?: string;
  clinicalSummary?: string;
  specialtyRequired?: string;
}

export interface TriageReferralPayload {
  outcome: 'APPROVED' | 'REJECTED' | 'REDIRECTED';
  receivingDoctorId?: string;
  reason?: string;
  priority?: 'URGENT' | 'ROUTINE';
  specialtyRequired?: string;
  clinicalSummary?: string;
}

export interface UpdateReferralStatusPayload {
  status: 'SUBMITTED' | 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  reason?: string;
}

export interface AddReferralNotePayload {
  noteText: string;
  isPrivate?: boolean;
}

export interface DoctorDirectoryItem {
  id: string;
  fullName: string;
  primarySpecialization?: string;
  department?: string;
  licenseNumber?: string;
}

// Helper to normalize paginated or list response
function unwrapReferralList(
  res: ApiResponse<ReferralDTO[] | PaginatedReferralsResponse | { data: ReferralDTO[]; meta?: ReferralPaginationMeta }>
): PaginatedReferralsResponse {
  const payload = res.data;
  if (Array.isArray(payload)) {
    return {
      data: payload,
      meta: {
        total: payload.length,
        page: 1,
        limit: payload.length,
        totalPages: 1,
      },
    };
  }
  if (payload && typeof payload === 'object') {
    if (Array.isArray((payload as { data: ReferralDTO[] }).data)) {
      const cast = payload as { data: ReferralDTO[]; meta?: ReferralPaginationMeta };
      return {
        data: cast.data,
        meta: cast.meta || {
          total: cast.data.length,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      };
    }
  }
  return {
    data: [],
    meta: {
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
  };
}

export const referralService = {
  /**
   * 1. Create patient care referral
   * POST /api/v1/referrals
   */
  async createReferral(payload: CreateReferralPayload): Promise<ReferralDTO> {
    const res: ApiResponse<ReferralDTO> = await apiClient.post<ReferralDTO>(
      '/api/v1/referrals',
      payload
    );
    return res.data;
  },

  /**
   * 2. List patient care referrals with optional filters
   * GET /api/v1/referrals
   */
  async getReferrals(params?: {
    page?: number;
    limit?: number;
    priority?: string;
    status?: string;
  }): Promise<PaginatedReferralsResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.priority) query.append('priority', params.priority);
    if (params?.status) query.append('status', params.status);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient.get<ReferralDTO[] | PaginatedReferralsResponse>(
      `/api/v1/referrals${queryString}`
    );
    return unwrapReferralList(res);
  },

  /**
   * 3. List incoming referrals for current doctor/facility
   * GET /api/v1/referrals/my-incoming
   */
  async getIncomingReferrals(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedReferralsResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient.get<ReferralDTO[] | PaginatedReferralsResponse>(
      `/api/v1/referrals/my-incoming${queryString}`
    );
    return unwrapReferralList(res);
  },

  /**
   * 4. List outgoing referrals created by current doctor
   * GET /api/v1/referrals/my-outgoing
   */
  async getOutgoingReferrals(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedReferralsResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient.get<ReferralDTO[] | PaginatedReferralsResponse>(
      `/api/v1/referrals/my-outgoing${queryString}`
    );
    return unwrapReferralList(res);
  },

  /**
   * 5. Get referral dashboard metrics and SLA performance analytics
   * GET /api/v1/referrals/dashboard/stats?facilityId=string
   */
  async getDashboardStats(facilityId?: string): Promise<ReferralDashboardStatsDTO> {
    const query = facilityId ? `?facilityId=${encodeURIComponent(facilityId)}` : '';
    const res = await apiClient.get<ReferralDashboardStatsDTO>(
      `/api/v1/referrals/dashboard/stats${query}`
    );
    return res.data;
  },

  /**
   * 6. Get referral details by ID
   * GET /api/v1/referrals/:id
   */
  async getReferralById(id: string): Promise<ReferralDTO> {
    const res = await apiClient.get<ReferralDTO>(`/api/v1/referrals/${encodeURIComponent(id)}`);
    return res.data;
  },

  /**
   * 7. Update referral clinical details
   * PUT /api/v1/referrals/:id
   */
  async updateClinicalDetails(
    id: string,
    payload: UpdateReferralClinicalPayload
  ): Promise<ReferralDTO> {
    const res = await apiClient.put<ReferralDTO>(
      `/api/v1/referrals/${encodeURIComponent(id)}`,
      payload
    );
    return res.data;
  },

  /**
   * 8. Soft-delete referral
   * DELETE /api/v1/referrals/:id
   */
  async deleteReferral(id: string): Promise<void> {
    await apiClient.delete<unknown>(`/api/v1/referrals/${encodeURIComponent(id)}`);
  },

  /**
   * 9. Triage patient referral (Approve/Decline/Redirect)
   * PUT /api/v1/referrals/:id/triage
   */
  async triageReferral(id: string, payload: TriageReferralPayload): Promise<ReferralDTO> {
    const res = await apiClient.put<ReferralDTO>(
      `/api/v1/referrals/${encodeURIComponent(id)}/triage`,
      payload
    );
    return res.data;
  },

  /**
   * 10. Update referral status (IN_PROGRESS, COMPLETED, CANCELLED)
   * PUT /api/v1/referrals/:id/status
   */
  async updateReferralStatus(
    id: string,
    payload: UpdateReferralStatusPayload
  ): Promise<ReferralDTO> {
    const res = await apiClient.put<ReferralDTO>(
      `/api/v1/referrals/${encodeURIComponent(id)}/status`,
      payload
    );
    return res.data;
  },

  /**
   * 11. Update referral status (alias for PUT :id/status)
   * PATCH /api/v1/referrals/:id/status
   */
  async patchReferralStatus(
    id: string,
    payload: UpdateReferralStatusPayload
  ): Promise<ReferralDTO> {
    const res = await apiClient.patch<ReferralDTO>(
      `/api/v1/referrals/${encodeURIComponent(id)}/status`,
      payload
    );
    return res.data;
  },

  /**
   * 12. Add clinical coordination note to referral
   * POST /api/v1/referrals/:id/notes
   */
  async addReferralNote(id: string, payload: AddReferralNotePayload): Promise<ReferralNoteDTO> {
    const res = await apiClient.post<ReferralNoteDTO>(
      `/api/v1/referrals/${encodeURIComponent(id)}/notes`,
      payload
    );
    return res.data;
  },

  /**
   * 13. List clinical notes for referral
   * GET /api/v1/referrals/:id/notes
   */
  async getReferralNotes(id: string): Promise<ReferralNoteDTO[]> {
    const res = await apiClient.get<ReferralNoteDTO[]>(
      `/api/v1/referrals/${encodeURIComponent(id)}/notes`
    );
    return Array.isArray(res.data) ? res.data : [];
  },

  /**
   * 14. Link medical attachment to referral
   * POST /api/v1/referrals/:id/attachments
   */
  async linkAttachment(id: string, attachmentId: string): Promise<ReferralAttachmentDTO> {
    const res = await apiClient.post<ReferralAttachmentDTO>(
      `/api/v1/referrals/${encodeURIComponent(id)}/attachments`,
      { attachmentId }
    );
    return res.data;
  },

  /**
   * 15. List linked medical attachments for referral
   * GET /api/v1/referrals/:id/attachments
   */
  async getReferralAttachments(id: string): Promise<ReferralAttachmentDTO[]> {
    const res = await apiClient.get<ReferralAttachmentDTO[]>(
      `/api/v1/referrals/${encodeURIComponent(id)}/attachments`
    );
    return Array.isArray(res.data) ? res.data : [];
  },

  /**
   * 16. Get immutable status transition history for referral
   * GET /api/v1/referrals/:id/history
   */
  async getReferralHistory(id: string): Promise<ReferralStatusHistoryDTO[]> {
    const res = await apiClient.get<ReferralStatusHistoryDTO[]>(
      `/api/v1/referrals/${encodeURIComponent(id)}/history`
    );
    return Array.isArray(res.data) ? res.data : [];
  },

  /**
   * Helper: Get list of registered doctors for specialist assignment
   * GET /api/v1/doctors
   */
  async getRegisteredDoctors(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<DoctorDirectoryItem[]> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';

    if (params?.search && params.search.trim()) {
      return this.searchDoctors(params.search.trim());
    }

    const res = await apiClient.get<DoctorDirectoryItem[] | { data: DoctorDirectoryItem[] }>(
      `/api/v1/doctors${queryString}`
    );
    if (Array.isArray(res.data)) return res.data;
    if (res.data && typeof res.data === 'object' && Array.isArray((res.data as { data: DoctorDirectoryItem[] }).data)) {
      return (res.data as { data: DoctorDirectoryItem[] }).data;
    }
    return [];
  },

  /**
   * Enterprise doctor search (by name, registration, license, dept, specialization)
   * GET /api/v1/doctors/search?q=string
   */
  async searchDoctors(query: string): Promise<DoctorDirectoryItem[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const res = await apiClient.get<DoctorDirectoryItem[] | { data: DoctorDirectoryItem[] }>(
      `/api/v1/doctors/search?q=${encodeURIComponent(trimmed)}`
    );
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object' && Array.isArray((payload as { data: DoctorDirectoryItem[] }).data)) {
      return (payload as { data: DoctorDirectoryItem[] }).data;
    }
    return [];
  },

  /**
   * Download single referral dossier as standard binary PDF
   * Endpoint: GET /api/v1/referrals/:id/pdf
   */
  async downloadReferralPdf(referralId: string): Promise<ApiDownloadResult> {
    if (!referralId) {
      throw new Error('Referral ID is required to download PDF.');
    }
    const result = await apiClient.download(
      `/api/v1/referrals/${encodeURIComponent(referralId)}/pdf`
    );
    const filename = result.filename || `careid-referral-${referralId.slice(0, 8)}.pdf`;
    triggerBrowserDownload(result.blob, filename);
    return { ...result, filename };
  },
};

