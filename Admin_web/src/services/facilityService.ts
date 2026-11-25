import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './apiClient';

export type FacilityStatus = 'Active' | 'Pending Review' | 'Draft / Staging';

export type FacilityType =
  | 'Hospital Campus'
  | 'Ambulatory Surgical Center'
  | 'Specialty Clinic'
  | 'Diagnostic Center'
  | 'Urgent Care Center'
  | 'Community Health Center';

export interface MappedDoctor {
  id: string;
  name: string;
  hvId?: string;
  npi: string;
  specialty: string;
  licenseNumber: string;
  clinicalRole: string;
  status: 'Verified & Active' | 'Pending Credential' | 'Dual-Privilege';
  initials: string;
  avatarBg?: string;
  avatarColor?: string;
  avatarUrl?: string;
}

export interface AssignedStaff {
  id: string;
  name: string;
  roleDesignation: string;
  departmentSuite: string;
  shiftRoster: string;
  status: 'Active' | 'Certified' | 'On-Call' | 'Standby Pool';
  staffCode?: string;
  initials?: string;
  avatarBg?: string;
  avatarColor?: string;
  roleCategory?: string;
  rosterState?: 'Active' | 'Standby Pool' | 'Dual-Roster';
  email?: string;
  phone?: string;
}

export interface FacilityAuditEvent {
  id: string;
  timestamp: string;
  description: string;
  category: 'clinical' | 'staff' | 'accreditation';
}

export interface FacilityItem {
  id: string;
  facilityId: string;
  legalName: string;
  facilityType: FacilityType | string;
  clinicalLicense: string;
  npiNumber: string;
  status: FacilityStatus;
  initialAdmin: string;
  capabilities: string[];
  streetAddress1: string;
  streetAddress2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  gpsCoordinates?: string;
  mainTelephone: string;
  emergencyTelephone?: string;
  administrativeEmail: string;
  billingContact?: string;
  timezone?: string;
  billingCurrency?: string;
  unconfiguredPricingPolicy?: string;
  createdAt?: string;
  departmentsCount?: number;
  doctorsCount?: number;
  patientsCount?: number;
  tierBadge?: string;
  activeDoctorsCount?: number;
  medicalStaffCount?: number;
  operatingSuitesCount?: number;
  clinicalOperationsHours?: string;
  inaugurationDate?: string;
  internalExtension?: string;
  adminEmail?: string;
  adminAvatarUrl?: string;
  adminRole?: string;
  adminTenure?: string;
  adminVaultToken?: string;
  utilizationPercent?: number;
  infrastructureHealth?: string;
  suitesAllocation?: string;
  mappedDoctors?: MappedDoctor[];
  assignedStaff?: AssignedStaff[];
  auditEvents?: FacilityAuditEvent[];
}

export interface CreateFacilityPayload {
  legalName: string;
  facilityType: string;
  facilityCode?: string;
  clinicalLicense: string;
  npiNumber: string;
  status: FacilityStatus;
  initialAdmin: string;
  capabilities: string[];
  streetAddress1: string;
  streetAddress2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  mainTelephone: string;
  emergencyTelephone?: string;
  administrativeEmail: string;
  billingContact?: string;
  timezone?: string;
  billingCurrency?: string;
  unconfiguredPricingPolicy?: string;
}

// Live Backend Facility Interfaces
export interface BackendFacilityDepartment {
  id: string;
  facilityId?: string;
  name: string;
  code?: string;
  description?: string;
  departmentHead?: string;
  createdAt?: string;
}

export interface FacilityRoom {
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
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFacilityRoomPayload {
  roomNumber: string;
  roomName: string;
  departmentId?: string;
  building?: string;
  block?: string;
  floor?: string;
  wing?: string;
  roomCategory?: string;
  capacity?: number;
}

export interface BackendFacilityBranch {
  id: string;
  branchName: string;
  branchCode?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
}

export interface BackendFacility {
  id: string;
  name: string;
  legalName?: string;
  facilityCode: string;
  registrationNumber?: string;
  facilityType: string;
  ownershipType?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  phone?: string;
  emergencyPhone?: string;
  email?: string;
  website?: string;
  profilePhotoUrl?: string;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'SUSPENDED' | 'REJECTED';
  verificationNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  isDeleted?: boolean;
  branches?: BackendFacilityBranch[];
  departments?: BackendFacilityDepartment[];
  rooms?: FacilityRoom[];
  licenses?: any[];
  accreditations?: any[];
  documents?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface BackendFacilityStats {
  totalFacilities: number;
  verifiedFacilities: number;
  pendingFacilities: number;
  suspendedFacilities: number;
  totalDepartments: number;
  totalRooms: number;
}

export interface BackendFacilityDoctor {
  id: string;
  fullName: string;
  specialization?: string;
  credentials?: string;
}

// Exports for any component references, defaulted to empty arrays
export const DEFAULT_MAPPED_DOCTORS: MappedDoctor[] = [];
export const DEFAULT_ASSIGNED_STAFF: AssignedStaff[] = [];
export const DEFAULT_AUDIT_EVENTS: FacilityAuditEvent[] = [];

/**
 * Maps a live BackendFacility into FacilityItem for the UI
 */
export function mapBackendFacilityToItem(
  bf: BackendFacility,
  liveDoctors: BackendFacilityDoctor[] = []
): FacilityItem {
  let status: FacilityStatus = 'Active';
  if (bf.verificationStatus === 'VERIFIED') {
    status = 'Active';
  } else if (bf.verificationStatus === 'PENDING') {
    status = 'Pending Review';
  } else if (bf.verificationStatus === 'SUSPENDED') {
    status = 'Draft / Staging';
  } else {
    status = 'Draft / Staging';
  }

  let facilityType: string = 'Hospital Campus';
  switch (bf.facilityType?.toUpperCase()) {
    case 'HOSPITAL':
      facilityType = 'Hospital Campus';
      break;
    case 'CLINIC':
    case 'SPECIALITY_CENTRE':
      facilityType = 'Specialty Clinic';
      break;
    case 'DIAGNOSTIC_CENTER':
    case 'LABORATORY':
      facilityType = 'Diagnostic Center';
      break;
    case 'REHABILITATION_CENTER':
    case 'AMBULATORY_SURGICAL_CENTER':
      facilityType = 'Ambulatory Surgical Center';
      break;
    case 'COMMUNITY_HEALTH_CENTER':
      facilityType = 'Community Health Center';
      break;
    default:
      facilityType = bf.facilityType || 'Hospital Campus';
  }

  const deptsCount = bf.departments?.length || 0;
  const mappedDocs: MappedDoctor[] = liveDoctors.map((doc: BackendFacilityDoctor) => {
    const cleanName = doc.fullName.replace(/^Dr\.\s*/i, '');
    const parts = cleanName.split(/\s+/);
    const initials = `${parts[0]?.[0] || 'D'}${parts[1]?.[0] || 'R'}`.toUpperCase();

    return {
      id: doc.id,
      name: doc.fullName.startsWith('Dr.') ? doc.fullName : `Dr. ${doc.fullName}`,
      hvId: `HV-${doc.id.slice(0, 5).toUpperCase()}`,
      npi: '1043928192',
      specialty: doc.specialization || 'Cardiology',
      licenseNumber: doc.credentials || 'State Medical Board',
      clinicalRole: 'Attending Physician',
      status: 'Verified & Active',
      initials,
      avatarBg: 'rgba(40, 0, 109, 0.1)',
      avatarColor: '#28006d',
    };
  });

  // Construct real audit events from backend verification timestamps if available
  const auditEvents: FacilityAuditEvent[] = [];
  if (bf.verifiedAt) {
    auditEvents.push({
      id: `audit-verified-${bf.id}`,
      timestamp: new Date(bf.verifiedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      description: `Registration approved and verified by CareID Admin (${bf.verificationNotes || 'Credential Verified'}).`,
      category: 'accreditation',
    });
  }
  if (bf.createdAt) {
    auditEvents.push({
      id: `audit-created-${bf.id}`,
      timestamp: new Date(bf.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      description: `Facility profile initialized on CareID Master Registry.`,
      category: 'clinical',
    });
  }

  const capabilities = bf.departments && bf.departments.length > 0
    ? bf.departments.map((d) => d.name)
    : [];

  return {
    id: bf.id,
    facilityId: bf.facilityCode || `FAC-${(bf.state || 'US').toUpperCase()}-${bf.id.slice(0, 4).toUpperCase()}`,
    legalName: bf.name || bf.legalName || 'Healthcare Facility',
    facilityType,
    clinicalLicense: bf.registrationNumber || `Lic #${bf.facilityCode || 'REG-PENDING'}`,
    npiNumber: bf.facilityCode ? bf.facilityCode.replace(/\D/g, '').padEnd(10, '0').slice(0, 10) : '1043928190',
    status,
    initialAdmin: 'Super Admin Pool (Verified)',
    capabilities,
    streetAddress1: bf.streetAddress || '—',
    streetAddress2: bf.branches?.[0]?.address || '',
    city: bf.city || '—',
    state: bf.state || '—',
    postalCode: (bf as any).pinCode || '',
    country: bf.country || 'United States',
    gpsCoordinates: '',
    mainTelephone: bf.phone || '—',
    emergencyTelephone: bf.emergencyPhone || '',
    administrativeEmail: bf.email || '—',
    billingContact: '',
    timezone: bf.timezone || 'UTC',
    billingCurrency: (bf as any).billingCurrency || 'USD',
    unconfiguredPricingPolicy: (bf as any).unconfiguredPricingPolicy || 'REQUIRE_EXPLICIT_PRICE',
    createdAt: bf.createdAt,
    departmentsCount: deptsCount,
    doctorsCount: mappedDocs.length,
    patientsCount: 0,
    tierBadge: 'Verified Facility',
    activeDoctorsCount: mappedDocs.length,
    medicalStaffCount: 0,
    operatingSuitesCount: bf.rooms?.length || 0,
    clinicalOperationsHours: '24/7',
    inaugurationDate: bf.createdAt ? new Date(bf.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Operational',
    internalExtension: '',
    adminEmail: bf.email || 'admin@careid.health',
    adminRole: 'Facility Administrator',
    adminTenure: 'Active Administrator',
    adminVaultToken: `#ADM-${bf.id.slice(0, 4).toUpperCase()}`,
    infrastructureHealth: bf.verificationStatus === 'VERIFIED' ? '100% Verified' : bf.verificationStatus === 'SUSPENDED' ? 'Suspended' : 'Pending Verification',
    suitesAllocation: `${bf.rooms?.length || 0} Registered Suites`,
    utilizationPercent: 0,
    mappedDoctors: mappedDocs,
    assignedStaff: [],
    auditEvents,
  };
}

export function mapUiFacilityTypeToBackend(uiType: string): string {
  switch (uiType) {
    case 'Hospital Campus':
      return 'HOSPITAL';
    case 'Ambulatory Surgical Center':
      return 'AMBULATORY_SURGICAL_CENTER';
    case 'Specialty Clinic':
      return 'SPECIALITY_CENTRE';
    case 'Diagnostic Center':
      return 'DIAGNOSTIC_CENTER';
    case 'Urgent Care Center':
      return 'CLINIC';
    case 'Community Health Center':
      return 'COMMUNITY_HEALTH_CENTER';
    default:
      return 'HOSPITAL';
  }
}

export interface LiveFacilityOption {
  id: string;
  name: string;
  code?: string;
  status?: string;
}

export interface GetFacilitiesParams {
  search?: string;
  page?: number;
  limit?: number;
}

export const facilityService = {
  getLiveFacilities: async (): Promise<LiveFacilityOption[]> => {
    const facilities = await facilityService.getFacilities();
    return facilities.map((f) => ({
      id: f.id,
      name: f.legalName,
      code: f.facilityId,
      status: f.status,
    }));
  },

  getFacilities: async (params?: GetFacilitiesParams | string): Promise<FacilityItem[]> => {
    const search = typeof params === 'string' ? params : params?.search;
    let endpoint = '/api/v1/facilities';

    if (search && search.trim()) {
      endpoint = `/api/v1/facilities/search?q=${encodeURIComponent(search.trim())}`;
    }

    const res = await apiClient.get<BackendFacility[]>(endpoint);
    if (res.data && Array.isArray(res.data)) {
      return res.data.map((bf) => mapBackendFacilityToItem(bf));
    }
    return [];
  },

  getFacilityStatistics: async (): Promise<BackendFacilityStats> => {
    const res = await apiClient.get<BackendFacilityStats>('/api/v1/facilities/statistics');
    if (res.data && typeof res.data.totalFacilities === 'number') {
      return res.data;
    }
    return {
      totalFacilities: 0,
      verifiedFacilities: 0,
      pendingFacilities: 0,
      suspendedFacilities: 0,
      totalDepartments: 0,
      totalRooms: 0,
    };
  },

  getFacilityById: async (id: string): Promise<FacilityItem | null> => {
    if (!id) return null;

    try {
      const detailRes = await apiClient.get<BackendFacility>(`/api/v1/facilities/${id}`);
      if (detailRes.data && detailRes.data.id) {
        // Fetch live associated doctors
        let doctors: BackendFacilityDoctor[] = [];
        try {
          const docRes = await apiClient.get<BackendFacilityDoctor[]>(`/api/v1/facilities/${id}/doctors`);
          if (docRes.data && Array.isArray(docRes.data)) {
            doctors = docRes.data;
          }
        } catch {
          // Doctors list might be empty for newly created facilities
        }
        return mapBackendFacilityToItem(detailRes.data, doctors);
      }
    } catch {
      // Endpoint error or 404
    }

    // Try finding by list if passed code or uuid
    try {
      const fullList = await facilityService.getFacilities();
      const matched = fullList.find((f) => f.id === id || f.facilityId === id);
      if (matched) return matched;
    } catch {
      // List failed
    }

    return null;
  },

  createFacility: async (payload: CreateFacilityPayload): Promise<FacilityItem> => {
    const regNumber = payload.clinicalLicense?.trim() || `REG-FAC-${Date.now().toString().slice(-6)}`;
    const backendPayload = {
      name: payload.legalName.trim(),
      legalName: payload.legalName.trim(),
      registrationNumber: regNumber,
      facilityType: mapUiFacilityTypeToBackend(payload.facilityType),
      ownershipType: 'PRIVATE',
      streetAddress: payload.streetAddress1.trim(),
      city: payload.city.trim(),
      state: payload.state.trim().toUpperCase(),
      country: payload.country || 'United States',
      phone: payload.mainTelephone.trim(),
      emergencyPhone: payload.emergencyTelephone?.trim() || undefined,
      email: payload.administrativeEmail.trim().toLowerCase(),
      timezone: payload.timezone || 'UTC',
      billingCurrency: payload.billingCurrency || 'USD',
      unconfiguredPricingPolicy: payload.unconfiguredPricingPolicy || 'REQUIRE_EXPLICIT_PRICE',
    };

    const res = await apiClient.post<BackendFacility>('/api/v1/facilities', backendPayload);
    if (res.data && res.data.id) {
      return mapBackendFacilityToItem(res.data);
    }
    throw new Error('Failed to create facility on backend API');
  },

  updateFacility: async (id: string, updates: Partial<FacilityItem>): Promise<FacilityItem> => {
    const backendPayload: any = {};
    if (updates.legalName) {
      backendPayload.name = updates.legalName.trim();
      backendPayload.legalName = updates.legalName.trim();
    }
    if (updates.mainTelephone) backendPayload.phone = updates.mainTelephone.trim();
    if (updates.emergencyTelephone) backendPayload.emergencyPhone = updates.emergencyTelephone.trim();
    if (updates.administrativeEmail) backendPayload.email = updates.administrativeEmail.trim().toLowerCase();
    if (updates.streetAddress1) backendPayload.streetAddress = updates.streetAddress1.trim();
    if (updates.city) backendPayload.city = updates.city.trim();
    if (updates.state) backendPayload.state = updates.state.trim().toUpperCase();
    if (updates.country) backendPayload.country = updates.country.trim();
    if (updates.facilityType) backendPayload.facilityType = mapUiFacilityTypeToBackend(updates.facilityType);
    if (updates.clinicalLicense) backendPayload.registrationNumber = updates.clinicalLicense.trim();
    if (updates.timezone) backendPayload.timezone = updates.timezone;
    if (updates.billingCurrency) backendPayload.billingCurrency = updates.billingCurrency;
    if (updates.unconfiguredPricingPolicy) backendPayload.unconfiguredPricingPolicy = updates.unconfiguredPricingPolicy;

    const res = await apiClient.put<BackendFacility>(`/api/v1/facilities/${id}`, backendPayload);
    if (res.data && res.data.id) {
      return mapBackendFacilityToItem(res.data);
    }
    throw new Error('Failed to update facility on backend API');
  },

  verifyFacility: async (facilityId: string, reason = 'Quality and Credential Verified'): Promise<any> => {
    return apiClient.post(`/api/v1/facilities/${facilityId}/verify`, { reason });
  },

  suspendFacility: async (facilityId: string, reason = 'Administrative review'): Promise<any> => {
    return apiClient.post(`/api/v1/facilities/${facilityId}/suspend`, { reason });
  },

  restoreFacility: async (facilityId: string, reason = 'Administrative review completed'): Promise<any> => {
    return apiClient.post(`/api/v1/facilities/${facilityId}/restore`, { reason });
  },

  deleteFacility: async (facilityId: string): Promise<any> => {
    return apiClient.del(`/api/v1/facilities/${facilityId}`);
  },

  mapDoctor: async (facilityId: string, doctor: MappedDoctor): Promise<any> => {
    const res = await apiClient.post(`/api/v1/facilities/${facilityId}/assign-doctor`, {
      doctorId: doctor.id,
      assignmentType: 'PRIMARY',
      privileges: ['OPD_CONSULTATION'],
    });
    if (!res.success) {
      throw new Error(res.message || res.error || 'Failed to map doctor to facility.');
    }
    return res.data;
  },

  updateStaffRoster: async (facilityId: string, staffList: AssignedStaff[]): Promise<FacilityItem> => {
    const current = await facilityService.getFacilityById(facilityId);
    if (current) {
      current.assignedStaff = staffList;
      return current;
    }
    throw new Error('Facility not found');
  },

  assignFacilityAdmin: async (
    facilityId: string,
    adminPayload: {
      adminName: string;
      adminRole?: string;
      adminEmail?: string;
      adminTenure?: string;
      adminVaultToken?: string;
    }
  ): Promise<FacilityItem> => {
    const current = await facilityService.getFacilityById(facilityId);
    if (current) {
      current.initialAdmin = adminPayload.adminName;
      current.adminEmail = adminPayload.adminEmail || current.adminEmail;
      return current;
    }
    throw new Error('Facility not found');
  },

  getFacilityRooms: async (facilityId: string): Promise<FacilityRoom[]> => {
    if (!facilityId) return [];
    try {
      const res = await apiClient.get<FacilityRoom[]>(`/api/v1/facilities/${facilityId}/rooms`);
      if (res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (err) {
      console.error(`Failed to fetch rooms for facility ${facilityId}:`, err);
    }
    return [];
  },

  getFacilityDepartments: async (facilityId: string): Promise<BackendFacilityDepartment[]> => {
    if (!facilityId) return [];
    try {
      const res = await apiClient.get<BackendFacilityDepartment[]>(`/api/v1/facilities/${facilityId}/departments`);
      if (res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (err) {
      console.error(`Failed to fetch departments for facility ${facilityId}:`, err);
    }
    return [];
  },

  createFacilityRoom: async (facilityId: string, payload: CreateFacilityRoomPayload): Promise<FacilityRoom> => {
    if (!facilityId) throw new Error('Facility ID is required');
    const res = await apiClient.post<FacilityRoom>(`/api/v1/facilities/${facilityId}/rooms`, payload);
    if (res.data && res.data.id) {
      return res.data;
    }
    throw new Error(res.message || res.error || 'Failed to create room on backend API');
  },
};

// ============================================================================
// TanStack Query Hooks
// ============================================================================

export const useLiveFacilitiesQuery = () => {
  return useQuery({
    queryKey: ['liveFacilities'],
    queryFn: () => facilityService.getLiveFacilities(),
    staleTime: 1000 * 30,
  });
};

export const useFacilitiesQuery = (params?: GetFacilitiesParams | string) => {
  const search = typeof params === 'string' ? params : params?.search;
  return useQuery({
    queryKey: ['facilities', search || ''],
    queryFn: () => facilityService.getFacilities(params),
    staleTime: 1000 * 30,
  });
};

export const useFacilityStatisticsQuery = () => {
  return useQuery({
    queryKey: ['facility-statistics'],
    queryFn: () => facilityService.getFacilityStatistics(),
    staleTime: 1000 * 30,
  });
};

export const useFacilityQuery = (id: string) => {
  return useQuery({
    queryKey: ['facility', id],
    queryFn: () => facilityService.getFacilityById(id),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  });
};

export const useFacilityDoctorsQuery = (facilityId: string) => {
  return useQuery({
    queryKey: ['facility-doctors', facilityId],
    queryFn: async (): Promise<BackendFacilityDoctor[]> => {
      if (!facilityId) return [];
      const res = await apiClient.get<BackendFacilityDoctor[]>(`/api/v1/facilities/${facilityId}/doctors`);
      return res.data && Array.isArray(res.data) ? res.data : [];
    },
    enabled: Boolean(facilityId),
    staleTime: 1000 * 30,
  });
};

export const fetchDoctorFacilityMappings = async (doctorId: string): Promise<Set<string>> => {
  if (!doctorId) return new Set();
  try {
    const facilities = await facilityService.getFacilities();
    const results = await Promise.allSettled(
      facilities.map((f) => apiClient.get<BackendFacilityDoctor[]>(`/api/v1/facilities/${f.id}/doctors`))
    );
    const mappedIds = new Set<string>();
    facilities.forEach((f, idx) => {
      const res = results[idx];
      if (res.status === 'fulfilled' && Array.isArray(res.value?.data)) {
        if (res.value.data.some((d) => d.id === doctorId)) {
          mappedIds.add(f.id);
        }
      }
    });
    return mappedIds;
  } catch (err) {
    console.error('Failed to fetch doctor facility mappings:', err);
    return new Set();
  }
};

export const useDoctorFacilityMappingsQuery = (doctorId?: string) => {
  return useQuery({
    queryKey: ['doctor-facilities', doctorId],
    queryFn: () => fetchDoctorFacilityMappings(doctorId || ''),
    enabled: Boolean(doctorId),
    staleTime: 1000 * 30,
  });
};

export const useCreateFacilityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFacilityPayload) => facilityService.createFacility(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility-statistics'] });
    },
  });
};

export const useUpdateFacilityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<FacilityItem> }) =>
      facilityService.updateFacility(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility-statistics'] });
      if (data?.id) queryClient.invalidateQueries({ queryKey: ['facility', data.id] });
      if (data?.facilityId) queryClient.invalidateQueries({ queryKey: ['facility', data.facilityId] });
    },
  });
};

export const useVerifyFacilityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ facilityId, reason }: { facilityId: string; reason?: string }) =>
      facilityService.verifyFacility(facilityId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['facility', variables.facilityId] });
    },
  });
};

export const useSuspendFacilityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ facilityId, reason }: { facilityId: string; reason?: string }) =>
      facilityService.suspendFacility(facilityId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['facility', variables.facilityId] });
    },
  });
};

export const useRestoreFacilityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ facilityId, reason }: { facilityId: string; reason?: string }) =>
      facilityService.restoreFacility(facilityId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['facility', variables.facilityId] });
    },
  });
};

export const useDeleteFacilityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (facilityId: string) => facilityService.deleteFacility(facilityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility-statistics'] });
    },
  });
};

export const useMapDoctorMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ facilityId, doctor }: { facilityId: string; doctor: MappedDoctor }) =>
      facilityService.mapDoctor(facilityId, doctor),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['facility', variables.facilityId] });
      queryClient.invalidateQueries({ queryKey: ['facility-doctors', variables.facilityId] });
    },
  });
};

export const useUpdateStaffRosterMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ facilityId, staffList }: { facilityId: string; staffList: AssignedStaff[] }) =>
      facilityService.updateStaffRoster(facilityId, staffList),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility', data.id] });
      queryClient.invalidateQueries({ queryKey: ['facility', data.facilityId] });
    },
  });
};

export const useAssignFacilityAdminMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      facilityId,
      adminPayload,
    }: {
      facilityId: string;
      adminPayload: {
        adminName: string;
        adminRole?: string;
        adminEmail?: string;
        adminTenure?: string;
        adminVaultToken?: string;
      };
    }) => facilityService.assignFacilityAdmin(facilityId, adminPayload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility', data.id] });
      queryClient.invalidateQueries({ queryKey: ['facility', data.facilityId] });
    },
  });
};

export const useFacilityRoomsQuery = (facilityId: string) => {
  return useQuery({
    queryKey: ['facility-rooms', facilityId],
    queryFn: () => facilityService.getFacilityRooms(facilityId),
    enabled: Boolean(facilityId),
    staleTime: 1000 * 30,
  });
};

export const useFacilityDepartmentsQuery = (facilityId: string) => {
  return useQuery({
    queryKey: ['facility-departments', facilityId],
    queryFn: () => facilityService.getFacilityDepartments(facilityId),
    enabled: Boolean(facilityId),
    staleTime: 1000 * 60,
  });
};

export const useCreateFacilityRoomMutation = (facilityId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFacilityRoomPayload) =>
      facilityService.createFacilityRoom(facilityId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-rooms', facilityId] });
      queryClient.invalidateQueries({ queryKey: ['facility', facilityId] });
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility-statistics'] });
    },
  });
};
