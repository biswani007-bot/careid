/**
 * CareID Doctor Web - CPT & Procedure Catalogue API Service
 *
 * Source of Truth: Postman Collection (CareID-Staging.postman_collection.json)
 * - Folder 28. CPT & Procedure Catalogue:
 *   1. GET /api/v1/cpt?category=...&page=1&limit=20
 *   2. GET /api/v1/cpt/search?q=...
 *   3. GET /api/v1/cpt/:code
 */

import { apiClient, ApiResponse } from './apiClient';

export interface CptProcedureDTO {
  code: string;
  name: string;
  category: string;
  description: string;
  standardCharge: number;
  rvu?: number;
  status: string;
  isOfficialCpt?: boolean;
}

export interface ListCptParams {
  category?: string;
  page?: number;
  limit?: number;
}

function unwrapCptList(
  res: ApiResponse<CptProcedureDTO[] | { data: CptProcedureDTO[] }>
): CptProcedureDTO[] {
  const payload = res.data;
  if (Array.isArray(payload)) {
    return payload;
  }
  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { data?: CptProcedureDTO[] }).data)
  ) {
    return (payload as { data: CptProcedureDTO[] }).data;
  }
  return [];
}

function unwrapCptItem(
  res: ApiResponse<CptProcedureDTO | { data: CptProcedureDTO }>
): CptProcedureDTO {
  const payload = res.data;
  if (payload && typeof payload === 'object') {
    if ('data' in payload && (payload as { data?: CptProcedureDTO }).data) {
      return (payload as { data: CptProcedureDTO }).data;
    }
    if ('code' in payload) {
      return payload as CptProcedureDTO;
    }
  }
  throw new Error('Malformed CPT procedure response received from server');
}

export const cptService = {
  /**
   * List CPT Procedure Codes (Paginated)
   * Endpoint: GET /api/v1/cpt
   */
  async listCptCodes(params?: ListCptParams): Promise<CptProcedureDTO[]> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (typeof params?.page === 'number') query.append('page', String(params.page));
    if (typeof params?.limit === 'number') query.append('limit', String(params.limit));
    const qs = query.toString();
    const res = await apiClient.get<CptProcedureDTO[] | { data: CptProcedureDTO[] }>(
      `/api/v1/cpt${qs ? `?${qs}` : ''}`
    );
    return unwrapCptList(res);
  },

  /**
   * Search CPT Codes by Keyword
   * Endpoint: GET /api/v1/cpt/search?q=...
   */
  async searchCptCodes(q: string): Promise<CptProcedureDTO[]> {
    const res = await apiClient.get<CptProcedureDTO[] | { data: CptProcedureDTO[] }>(
      `/api/v1/cpt/search?q=${encodeURIComponent(q.trim())}`
    );
    return unwrapCptList(res);
  },

  /**
   * Get CPT Code Details
   * Endpoint: GET /api/v1/cpt/:code
   */
  async getCptCode(code: string): Promise<CptProcedureDTO> {
    const res = await apiClient.get<CptProcedureDTO | { data: CptProcedureDTO }>(
      `/api/v1/cpt/${encodeURIComponent(code.trim())}`
    );
    return unwrapCptItem(res);
  },
};

