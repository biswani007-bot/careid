/**
 * CareID Doctor Web - Facility & Room API Service
 * 
 * Source of Truth: Postman Collection (CareID-Staging.postman_collection.json)
 * - Folder 07. Facility Management:
 *   1. GET /api/v1/facilities (List all registered facility profiles)
 *   2. GET /api/v1/facilities/:id (Get complete facility details)
 *   3. GET /api/v1/facilities/:id/rooms (List facility rooms)
 *   4. GET /api/v1/facilities/:id/departments (List facility departments)
 */

import { apiClient, ApiResponse } from './apiClient';

export interface FacilityRoomDTO {
  id: string;
  facilityId: string;
  departmentId?: string;
  roomNumber: string;
  roomName: string;
  building?: string;
  block?: string;
  floor?: string;
  wing?: string;
  roomCategory?: string;
  capacity?: number;
  isOperational?: boolean;
}

export interface FacilityDepartmentDTO {
  id: string;
  facilityId: string;
  name: string;
  code?: string;
  headOfDepartment?: string;
}

export interface FacilityProfileDTO {
  id: string;
  name: string;
  code?: string;
  type?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: string;
  timezone?: string;
  billingCurrency?: string;
  unconfiguredPricingPolicy?: string;
}

export interface FacilityDoctorDTO {
  id: string;
  fullName: string;
  specialization?: string;
  credentials?: string;
  department?: string;
  assignmentType?: 'PRIMARY' | 'SECONDARY' | string;
}

export interface PrimaryFacilityInfo {
  id: string;
  name: string;
  assignmentType: 'PRIMARY' | 'SECONDARY' | string;
  facilityCode?: string;
  departmentId?: string;
  departmentName?: string;
}

export interface DoctorFacilityAssignmentDTO {
  id?: string;
  facilityId: string;
  facilityName?: string;
  name?: string;
  assignmentType?: 'PRIMARY' | 'SECONDARY' | string;
  isPrimary?: boolean;
  departmentId?: string;
  departmentName?: string;
}

export interface PaginatedFacilities {
  data: FacilityProfileDTO[];
  total: number;
  page: number;
  limit: number;
}

export interface FacilityPricingRulesDTO {
  facilityId: string;
  maxDiscountWithoutApproval?: number;
  standardDiscounts?: Array<{ name: string; percentage: number }>;
  currency?: string;
  tier?: string;
  [key: string]: unknown;
}

function unwrapFacilityRooms(res: ApiResponse<FacilityRoomDTO[] | { data: FacilityRoomDTO[] }>): FacilityRoomDTO[] {
  const payload = res.data;
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data: FacilityRoomDTO[] }).data)) {
    return (payload as { data: FacilityRoomDTO[] }).data;
  }
  return [];
}

function unwrapFacilitiesList(
  res: ApiResponse<PaginatedFacilities | FacilityProfileDTO[] | { data: FacilityProfileDTO[]; meta?: { totalItems: number; page: number; limit: number } }>
): PaginatedFacilities {
  const payload = res.data;
  if (Array.isArray(payload)) {
    return {
      data: payload,
      total: payload.length,
      page: 1,
      limit: payload.length,
    };
  }
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) {
      const meta = (payload as { meta?: { totalItems: number; page: number; limit: number } }).meta;
      return {
        data: payload.data,
        total: meta?.totalItems ?? payload.data.length,
        page: meta?.page ?? 1,
        limit: meta?.limit ?? 20,
      };
    }
  }
  return { data: [], total: 0, page: 1, limit: 20 };
}

export const facilityService = {
  /**
   * List all registered facility profiles
   * Endpoint: GET /api/v1/facilities
   */
  async getFacilities(params?: { page?: number; limit?: number }): Promise<PaginatedFacilities> {
    const query = new URLSearchParams();
    if (typeof params?.page === 'number') query.append('page', params.page.toString());
    if (typeof params?.limit === 'number') query.append('limit', params.limit.toString());
    const qs = query.toString();
    const endpoint = `/api/v1/facilities${qs ? `?${qs}` : ''}`;
    const res = await apiClient.get<PaginatedFacilities | FacilityProfileDTO[]>(endpoint);
    return unwrapFacilitiesList(res);
  },

  /**
   * Get complete facility details
   * Endpoint: GET /api/v1/facilities/:id
   */
  async getFacilityById(id: string): Promise<FacilityProfileDTO> {
    const res = await apiClient.get<FacilityProfileDTO | { data: FacilityProfileDTO }>(
      `/api/v1/facilities/${encodeURIComponent(id)}`
    );
    const payload = res.data;
    if (payload && typeof payload === 'object') {
      if ('data' in payload && (payload as { data: FacilityProfileDTO }).data) {
        return (payload as { data: FacilityProfileDTO }).data;
      }
      return payload as FacilityProfileDTO;
    }
    throw new Error('Malformed facility response');
  },

  /**
   * List facility rooms
   * Endpoint: GET /api/v1/facilities/:id/rooms
   */
  async getFacilityRooms(facilityId: string): Promise<FacilityRoomDTO[]> {
    const res = await apiClient.get<FacilityRoomDTO[] | { data: FacilityRoomDTO[] }>(
      `/api/v1/facilities/${encodeURIComponent(facilityId)}/rooms`
    );
    return unwrapFacilityRooms(res);
  },

  /**
   * List facility departments
   * Endpoint: GET /api/v1/facilities/:id/departments
   */
  async getFacilityDepartments(facilityId: string): Promise<FacilityDepartmentDTO[]> {
    const res = await apiClient.get<FacilityDepartmentDTO[] | { data: FacilityDepartmentDTO[] }>(
      `/api/v1/facilities/${encodeURIComponent(facilityId)}/departments`
    );
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object' && Array.isArray((payload as { data: FacilityDepartmentDTO[] }).data)) {
      return (payload as { data: FacilityDepartmentDTO[] }).data;
    }
    return [];
  },

  /**
   * List associated facility doctors
   * Endpoint: GET /api/v1/facilities/:id/doctors
   */
  async getFacilityDoctors(facilityId: string): Promise<FacilityDoctorDTO[]> {
    const res = await apiClient.get<FacilityDoctorDTO[] | { data: FacilityDoctorDTO[] }>(
      `/api/v1/facilities/${encodeURIComponent(facilityId)}/doctors`
    );
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object' && Array.isArray((payload as { data: FacilityDoctorDTO[] }).data)) {
      return (payload as { data: FacilityDoctorDTO[] }).data;
    }
    return [];
  },

  /**
   * Enterprise facility search (by name, code, city, type)
   * Endpoint: GET /api/v1/facilities/search?q=string
   */
  async searchFacilities(q: string): Promise<FacilityProfileDTO[]> {
    const trimmed = q.trim();
    if (!trimmed) return [];
    const res = await apiClient.get<FacilityProfileDTO[] | { data: FacilityProfileDTO[] }>(
      `/api/v1/facilities/search?q=${encodeURIComponent(trimmed)}`
    );
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object' && Array.isArray((payload as { data: FacilityProfileDTO[] }).data)) {
      return (payload as { data: FacilityProfileDTO[] }).data;
    }
    return [];
  },

  /**
   * Get facility pricing and discount governance rules (Stages 1–6)
   * Endpoint: GET /api/v1/facilities/:id/pricing-rules
   */
  async getFacilityPricingRules(facilityId: string): Promise<FacilityPricingRulesDTO> {
    const res = await apiClient.get<FacilityPricingRulesDTO | { data: FacilityPricingRulesDTO }>(
      `/api/v1/facilities/${encodeURIComponent(facilityId)}/pricing-rules`
    );
    const data = res.data;
    if (data && typeof data === 'object' && 'data' in data && (data as { data: FacilityPricingRulesDTO }).data) {
      return (data as { data: FacilityPricingRulesDTO }).data;
    }
    return data as FacilityPricingRulesDTO;
  },

  /**
   * Resolves platform facility assignments for an authenticated doctor.
   * Priority:
   * 1. Direct assignments from doctor profile if already provided by backend.
   * 2. Query registered platform facilities and inspect doctor association.
   * Rules:
   * - Identifies facility marked PRIMARY.
   * - If multiple facilities without PRIMARY, returns null for primaryFacility and logs warning.
   * - If no assignments, returns null.
   */
  async resolveDoctorFacilityAssignments(
    doctorId: string,
    existingAssignments?: DoctorFacilityAssignmentDTO[]
  ): Promise<{
    primaryFacility: PrimaryFacilityInfo | null;
    facilities: DoctorFacilityAssignmentDTO[];
  }> {
    if (!doctorId) {
      return { primaryFacility: null, facilities: [] };
    }

    // 1. If explicit assignments are already provided by backend
    if (Array.isArray(existingAssignments) && existingAssignments.length > 0) {
      const primary = existingAssignments.find(
        (a) => a.assignmentType === 'PRIMARY' || a.isPrimary === true
      );
      if (primary) {
        return {
          primaryFacility: {
            id: primary.facilityId || primary.id || '',
            name: primary.facilityName || primary.name || '',
            assignmentType: primary.assignmentType || 'PRIMARY',
            facilityCode: (primary as { facilityCode?: string }).facilityCode,
            departmentId: primary.departmentId,
            departmentName: primary.departmentName,
          },
          facilities: existingAssignments,
        };
      }
      // If multiple assignments are present but none is marked PRIMARY
      if (existingAssignments.length > 1) {
        console.warn(
          `[facilityService] Doctor ${doctorId} has ${existingAssignments.length} facility assignments but none designated as PRIMARY.`
        );
        return { primaryFacility: null, facilities: existingAssignments };
      }
      // If exactly 1 assignment exists
      const single = existingAssignments[0];
      return {
        primaryFacility: {
          id: single.facilityId || single.id || '',
          name: single.facilityName || single.name || '',
          assignmentType: single.assignmentType || 'PRIMARY',
          facilityCode: (single as { facilityCode?: string }).facilityCode,
          departmentId: single.departmentId,
          departmentName: single.departmentName,
        },
        facilities: existingAssignments,
      };
    }

    // 2. Query registered platform facilities and inspect doctor association
    try {
      const facsRes = await this.getFacilities({ limit: 50 });
      const facs = facsRes.data || [];
      if (facs.length === 0) {
        return { primaryFacility: null, facilities: [] };
      }

      // Check doctor association across facilities in parallel
      const doctorChecks = await Promise.allSettled(
        facs.map(async (f) => {
          const docs = await this.getFacilityDoctors(f.id);
          const match = docs.find((d) => d.id === doctorId);
          return match ? { facility: f, doctorMatch: match } : null;
        })
      );

      const matchedResults: Array<{ facility: FacilityProfileDTO; doctorMatch: FacilityDoctorDTO }> = [];
      for (const res of doctorChecks) {
        if (res.status === 'fulfilled' && res.value) {
          matchedResults.push(res.value);
        }
      }

      if (matchedResults.length === 0) {
        return { primaryFacility: null, facilities: [] };
      }

      const assignments: DoctorFacilityAssignmentDTO[] = matchedResults.map(
        ({ facility, doctorMatch }) => {
          const assignmentType = doctorMatch.assignmentType || (matchedResults.length === 1 ? 'PRIMARY' : 'SECONDARY');
          return {
            facilityId: facility.id,
            facilityName: facility.name,
            name: facility.name,
            assignmentType,
            isPrimary: assignmentType === 'PRIMARY',
          };
        }
      );

      // Check if any matched facility explicitly has assignmentType === 'PRIMARY'
      const primaryAssignment = assignments.find((a) => a.assignmentType === 'PRIMARY' || a.isPrimary);
      if (primaryAssignment) {
        const facProfile = matchedResults.find((m) => m.facility.id === primaryAssignment.facilityId)?.facility;
        return {
          primaryFacility: {
            id: primaryAssignment.facilityId,
            name: primaryAssignment.facilityName || primaryAssignment.name || '',
            assignmentType: 'PRIMARY',
            facilityCode: facProfile?.code,
          },
          facilities: assignments,
        };
      }

      // If multiple facilities matched without explicit PRIMARY metadata
      if (matchedResults.length > 1) {
        console.warn(
          `[facilityService] Doctor ${doctorId} associated with multiple facilities (${matchedResults.map(m => m.facility.name).join(', ')}) without PRIMARY designation.`
        );
        return {
          primaryFacility: null,
          facilities: assignments,
        };
      }

      // Exactly 1 facility matched
      const single = matchedResults[0].facility;
      return {
        primaryFacility: {
          id: single.id,
          name: single.name,
          assignmentType: 'PRIMARY',
          facilityCode: single.code,
        },
        facilities: assignments,
      };
    } catch (err) {
      console.error('[facilityService] Failed to resolve doctor facility assignments:', err);
      return { primaryFacility: null, facilities: [] };
    }
  },
};

