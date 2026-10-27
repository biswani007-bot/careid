import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
}

const STORAGE_KEY = 'careid_admin_facilities_records';

export const DEFAULT_MAPPED_DOCTORS: MappedDoctor[] = [
  {
    id: 'doc-michael-chang',
    name: 'Dr. Michael Chang, MD',
    hvId: 'HV-49210',
    npi: '1043928192',
    specialty: 'Interventional Cardiology',
    licenseNumber: 'NY-MED-29401',
    clinicalRole: 'Attending Chief',
    status: 'Verified & Active',
    initials: 'MC',
    avatarBg: 'rgba(40, 0, 109, 0.1)',
    avatarColor: '#28006d',
  },
  {
    id: 'doc-vance',
    name: 'Dr. Julian Vance, MD',
    hvId: 'HV-39508',
    npi: '1849204812',
    specialty: 'Cardiology Specialist',
    licenseNumber: 'NY-MED-55193',
    clinicalRole: 'Associate',
    status: 'Verified & Active',
    initials: 'JV',
    avatarBg: 'rgba(0, 106, 96, 0.1)',
    avatarColor: '#006a60',
  },
  {
    id: 'doc-2',
    name: 'Dr. Sarah Jenkins, MD',
    hvId: 'HV-DOC-8821',
    npi: '1993821036',
    specialty: 'Electrophysiology',
    licenseNumber: 'NY-MED-84920',
    clinicalRole: 'Consultant',
    status: 'Verified & Active',
    initials: 'SJ',
    avatarBg: 'rgba(40, 0, 109, 0.15)',
    avatarColor: '#28006d',
  },
  {
    id: 'doc-1',
    name: 'Dr. Robert Chen, MD',
    hvId: 'HV-39482',
    npi: '1774839201',
    specialty: 'Cardiovascular Surgery',
    licenseNumber: 'NY-MED-43912',
    clinicalRole: 'Attending Surgeon',
    status: 'Verified & Active',
    initials: 'RC',
    avatarBg: 'rgba(0, 106, 96, 0.12)',
    avatarColor: '#006a60',
  },
];

export const DEFAULT_ASSIGNED_STAFF: AssignedStaff[] = [
  {
    id: 'staff-1',
    staffCode: 'STF-4821',
    name: 'Keith Vance, RN',
    roleDesignation: 'Lead Circulating Nurse',
    roleCategory: 'Circulating Nurse (RN)',
    departmentSuite: 'Cath Suite #03',
    shiftRoster: 'Day (07:00 - 15:30)',
    status: 'Active',
    rosterState: 'Active',
    initials: 'KV',
    avatarBg: '#8B5CF6',
    avatarColor: '#ffffff',
    email: 'k.vance@mountsinai.careid.health',
    phone: '+1 (212) 659-4821',
  },
  {
    id: 'staff-2',
    staffCode: 'STF-9022',
    name: 'J. Morales, RCIS',
    roleDesignation: 'Cardiovascular Technologist',
    roleCategory: 'Cath Lab Tech (RCIS)',
    departmentSuite: 'Cath Suite #01',
    shiftRoster: 'Rotation On-Call',
    status: 'Certified',
    rosterState: 'Active',
    initials: 'JM',
    avatarBg: '#0D9488',
    avatarColor: '#ffffff',
    email: 'j.morales@mountsinai.careid.health',
    phone: '+1 (212) 659-9022',
  },
  {
    id: 'staff-3',
    staffCode: 'STF-3319',
    name: 'Rachel Adams, BSN',
    roleDesignation: 'Pre-Op / Post-Op Recovery RN',
    roleCategory: 'Recovery RN (BSN)',
    departmentSuite: 'Currently Unassigned',
    shiftRoster: 'Standby Pool On-Call',
    status: 'Standby Pool',
    rosterState: 'Standby Pool',
    initials: 'RA',
    avatarBg: '#6366F1',
    avatarColor: '#ffffff',
    email: 'r.adams@mountsinai.careid.health',
    phone: '+1 (212) 659-3319',
  },
  {
    id: 'staff-4',
    staffCode: 'STF-7741',
    name: 'Carlos Mendez, RT',
    roleDesignation: 'Fluoroscopy & Radiation Tech',
    roleCategory: 'Radiation Tech',
    departmentSuite: 'Memorial Pavilion',
    shiftRoster: 'Dual-Rotation (08:00 - 16:30)',
    status: 'Active',
    rosterState: 'Dual-Roster',
    initials: 'CM',
    avatarBg: '#9333EA',
    avatarColor: '#ffffff',
    email: 'c.mendez@mountsinai.careid.health',
    phone: '+1 (212) 659-7741',
  },
  {
    id: 'staff-5',
    staffCode: 'STF-1102',
    name: 'Sarah Dunn, RN',
    roleDesignation: 'Clinical Patient Navigator',
    roleCategory: 'Clinical Navigator',
    departmentSuite: 'Outpatient Wing',
    shiftRoster: 'Standard (08:00 - 17:00)',
    status: 'Active',
    rosterState: 'Active',
    initials: 'SD',
    avatarBg: '#06B6D4',
    avatarColor: '#ffffff',
    email: 's.dunn@mountsinai.careid.health',
    phone: '+1 (212) 659-1102',
  },
];

export const DEFAULT_AUDIT_EVENTS: FacilityAuditEvent[] = [
  {
    id: 'audit-1',
    timestamp: 'TODAY, 10:45 AM',
    description: 'Encounter #ENC-2028-88419 completed in Cath Suite 3 by Dr. Michael Chang.',
    category: 'clinical',
  },
  {
    id: 'audit-2',
    timestamp: 'YESTERDAY, 04:15 PM',
    description: 'Staff mapping updated: Nurse Keith Vance assigned to Interventional Roster.',
    category: 'staff',
  },
  {
    id: 'audit-3',
    timestamp: 'OCT 20, 2026',
    description: 'Facility bi-annual accreditation audit approved (Score: 99.4%).',
    category: 'accreditation',
  },
];

const INITIAL_FACILITIES: FacilityItem[] = [
  {
    id: 'fac-1',
    facilityId: 'FAC-NY-4981',
    legalName: 'Mount Sinai Hospital – Interventional Pavilion',
    facilityType: 'Hospital Campus',
    clinicalLicense: 'State Lic #NY-HOSP-88319',
    npiNumber: '1982049102',
    status: 'Active',
    initialAdmin: 'Elena Rostova, MHA — Super Admin Pool (Verified)',
    capabilities: [
      'Inpatient Cath Lab',
      'Emergency Triage',
      'Outpatient Surgery',
      'Diagnostic Radiology / DICOM Vault',
      'Telemedicine Virtual Care Hub',
    ],
    streetAddress1: '1468 Madison Avenue, Interventional Wing 3rd Fl',
    streetAddress2: 'Suite / Pavilion / Interventional Wing',
    city: 'New York',
    state: 'NY',
    postalCode: '10029',
    country: 'United States',
    gpsCoordinates: '40.7712° N, 73.9876° W (Manhattan District)',
    mainTelephone: '+1 (212) 659-8600',
    emergencyTelephone: '+1 (212) 659-9911',
    administrativeEmail: 'interventional@mountsinai.careid.health',
    billingContact: 'billing-ny@careid-health.org',
    timezone: 'Eastern Time (US & Canada) • UTC -5',
    createdAt: '2025-01-15T08:00:00Z',
    departmentsCount: 14,
    doctorsCount: 142,
    patientsCount: 1240,
    tierBadge: 'Tier-1 Hub',
    activeDoctorsCount: 142,
    medicalStaffCount: 420,
    operatingSuitesCount: 12,
    clinicalOperationsHours: '24/7',
    inaugurationDate: 'Oct 12, 2021 (5 Years Operational)',
    internalExtension: 'Ext. 4462',
    adminEmail: 'e.rostova@mountsinai.careid.health',
    adminRole: 'Chief Operations Officer',
    adminTenure: 'Assigned Jan 15, 2023 • 14 mos active',
    adminVaultToken: '#ADM-NY-0941',
    infrastructureHealth: '91.6% Healthy',
    suitesAllocation: '10 Active / 2 In-Maint',
    utilizationPercent: 83.3,
    mappedDoctors: DEFAULT_MAPPED_DOCTORS,
    assignedStaff: DEFAULT_ASSIGNED_STAFF,
    auditEvents: DEFAULT_AUDIT_EVENTS,
  },
  {
    id: 'fac-2',
    facilityId: 'FAC-CA-1024',
    legalName: 'Mercy General Hospital Campus',
    facilityType: 'Hospital Campus',
    clinicalLicense: 'State Lic #CA-HOSP-44102',
    npiNumber: '1043928190',
    status: 'Active',
    initialAdmin: 'Dr. Sarah Jenkins — Clinical Director Pool',
    capabilities: [
      'Inpatient Cath Lab',
      'Emergency Triage',
      'Outpatient Surgery',
      'Telemedicine Virtual Care Hub',
    ],
    streetAddress1: '450 Stanyan Street',
    streetAddress2: 'West Tower',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94117',
    country: 'United States (US)',
    gpsCoordinates: '37.7715° N, 122.4534° W',
    mainTelephone: '+1 (415) 750-5000',
    emergencyTelephone: '+1 (415) 750-5911',
    administrativeEmail: 'admin@mercygeneral.org',
    billingContact: 'billing@mercygeneral.org',
    timezone: 'Pacific Time (US & Canada) [UTC-08:00]',
    createdAt: '2025-02-10T10:30:00Z',
    departmentsCount: 22,
    doctorsCount: 88,
    patientsCount: 3120,
  },
  {
    id: 'fac-3',
    facilityId: 'FAC-WA-8392',
    legalName: 'Valley Children\'s Surgical Center',
    facilityType: 'Ambulatory Surgical Center',
    clinicalLicense: 'State Lic #WA-SURG-77192',
    npiNumber: '1839201948',
    status: 'Pending Review',
    initialAdmin: 'Marcus Vance, MD — Regional Admin',
    capabilities: [
      'Outpatient Surgery',
      'Diagnostic Radiology / DICOM Vault',
    ],
    streetAddress1: '9380 Valley Medical Way',
    streetAddress2: 'Building B, Floor 2',
    city: 'Seattle',
    state: 'WA',
    postalCode: '98101',
    country: 'United States (US)',
    gpsCoordinates: '47.6062° N, 122.3321° W',
    mainTelephone: '+1 (206) 555-8392',
    emergencyTelephone: '+1 (206) 555-8911',
    administrativeEmail: 'ops@valleychildrens-surg.org',
    billingContact: 'finance@valleychildrens-surg.org',
    timezone: 'Pacific Time (US & Canada) [UTC-08:00]',
    createdAt: '2025-03-01T14:15:00Z',
    departmentsCount: 6,
    doctorsCount: 18,
    patientsCount: 450,
  },
  {
    id: 'fac-4',
    facilityId: 'FAC-NY-2201',
    legalName: 'Memorial Sloan Oncology Pavilion',
    facilityType: 'Specialty Clinic',
    clinicalLicense: 'State Lic #NY-SPEC-11029',
    npiNumber: '1293847561',
    status: 'Active',
    initialAdmin: 'Elena Rostova, MHA — Super Admin Pool (Verified)',
    capabilities: [
      'Diagnostic Radiology / DICOM Vault',
      'Telemedicine Virtual Care Hub',
    ],
    streetAddress1: '1275 York Avenue',
    streetAddress2: 'Research & Infusion Wing',
    city: 'New York',
    state: 'NY',
    postalCode: '10065',
    country: 'United States (US)',
    gpsCoordinates: '40.7648° N, 73.9557° W',
    mainTelephone: '+1 (212) 639-2000',
    emergencyTelephone: '+1 (212) 639-2911',
    administrativeEmail: 'intake@sloan-oncology.org',
    billingContact: 'accounts@sloan-oncology.org',
    timezone: 'Eastern Time (US & Canada) [UTC-05:00]',
    createdAt: '2025-03-12T09:45:00Z',
    departmentsCount: 8,
    doctorsCount: 34,
    patientsCount: 890,
  },
  {
    id: 'fac-5',
    facilityId: 'FAC-IL-5541',
    legalName: 'Northwestern Health Community Center',
    facilityType: 'Community Health Center',
    clinicalLicense: 'State Lic #IL-COMM-99381',
    npiNumber: '1948372615',
    status: 'Draft / Staging',
    initialAdmin: 'Marcus Vance, MD — Regional Admin',
    capabilities: [
      'Telemedicine Virtual Care Hub',
      'Emergency Triage',
    ],
    streetAddress1: '251 E Huron Street',
    city: 'Chicago',
    state: 'IL',
    postalCode: '60611',
    country: 'United States (US)',
    gpsCoordinates: '41.8954° N, 87.6200° W',
    mainTelephone: '+1 (312) 926-2000',
    administrativeEmail: 'support@nw-communityhealth.org',
    billingContact: 'billing@nw-communityhealth.org',
    timezone: 'Central Time (US & Canada) [UTC-06:00]',
    createdAt: '2025-03-20T11:00:00Z',
    departmentsCount: 4,
    doctorsCount: 12,
    patientsCount: 310,
  },
];

function loadStoredFacilities(): FacilityItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_FACILITIES));
      return INITIAL_FACILITIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const fac1 = parsed.find((f: FacilityItem) => f.id === 'fac-1');
      if (fac1 && (!fac1.assignedStaff || fac1.assignedStaff.length < 5 || !fac1.assignedStaff[0]?.staffCode)) {
        fac1.assignedStaff = DEFAULT_ASSIGNED_STAFF;
        fac1.adminRole = 'Chief Operations Officer';
        fac1.adminTenure = 'Assigned Jan 15, 2023 • 14 mos active';
        fac1.adminVaultToken = '#ADM-NY-0941';
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_FACILITIES));
    return INITIAL_FACILITIES;
  } catch (err) {
    console.error('Failed to parse stored facilities, using default', err);
    return INITIAL_FACILITIES;
  }
}

function persistFacilities(facilities: FacilityItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(facilities));
  } catch (err) {
    console.error('Failed to persist facilities to storage', err);
  }
}

let inMemoryFacilities: FacilityItem[] = loadStoredFacilities();

export const facilityService = {
  getFacilities: async (): Promise<FacilityItem[]> => {
    await new Promise((r) => setTimeout(r, 80));
    return [...inMemoryFacilities];
  },

  getFacilityById: async (id: string): Promise<FacilityItem | null> => {
    await new Promise((r) => setTimeout(r, 60));
    const found = inMemoryFacilities.find((f) => f.id === id || f.facilityId === id);
    return found ? { ...found } : null;
  },

  createFacility: async (payload: CreateFacilityPayload): Promise<FacilityItem> => {
    await new Promise((r) => setTimeout(r, 180));

    const newId = `fac-${Date.now()}`;
    const generatedFacilityId =
      payload.facilityCode?.trim() ||
      `FAC-${payload.state.toUpperCase() || 'NY'}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newFacility: FacilityItem = {
      id: newId,
      facilityId: generatedFacilityId,
      legalName: payload.legalName.trim(),
      facilityType: payload.facilityType || 'Hospital Campus',
      clinicalLicense: payload.clinicalLicense.trim(),
      npiNumber: payload.npiNumber.trim(),
      status: payload.status || 'Active',
      initialAdmin: payload.initialAdmin || 'Elena Rostova, MHA — Super Admin Pool (Verified)',
      capabilities: payload.capabilities || [],
      streetAddress1: payload.streetAddress1.trim(),
      streetAddress2: payload.streetAddress2?.trim() || '',
      city: payload.city.trim(),
      state: payload.state.trim().toUpperCase(),
      postalCode: payload.postalCode.trim(),
      country: payload.country || 'United States (US)',
      gpsCoordinates: '40.7712° N, 73.9876° W (Manhattan District)',
      mainTelephone: payload.mainTelephone.trim(),
      emergencyTelephone: payload.emergencyTelephone?.trim() || '',
      administrativeEmail: payload.administrativeEmail.trim().toLowerCase(),
      billingContact: payload.billingContact?.trim() || '',
      timezone: payload.timezone || 'Eastern Time (US & Canada) [UTC-05:00]',
      createdAt: new Date().toISOString(),
      departmentsCount: payload.capabilities.length > 0 ? payload.capabilities.length * 2 : 4,
      doctorsCount: 0,
      patientsCount: 0,
    };

    inMemoryFacilities = [newFacility, ...inMemoryFacilities];
    persistFacilities(inMemoryFacilities);
    return newFacility;
  },

  updateFacility: async (id: string, updates: Partial<FacilityItem>): Promise<FacilityItem> => {
    await new Promise((r) => setTimeout(r, 120));
    const index = inMemoryFacilities.findIndex((f) => f.id === id || f.facilityId === id);
    if (index === -1) {
      throw new Error(`Facility ${id} not found`);
    }
    const updated: FacilityItem = {
      ...inMemoryFacilities[index],
      ...updates,
    };
    inMemoryFacilities[index] = updated;
    persistFacilities(inMemoryFacilities);
    return updated;
  },

  mapDoctor: async (facilityId: string, doctor: MappedDoctor): Promise<FacilityItem> => {
    await new Promise((r) => setTimeout(r, 120));
    const index = inMemoryFacilities.findIndex((f) => f.id === facilityId || f.facilityId === facilityId);
    if (index === -1) {
      throw new Error(`Facility ${facilityId} not found`);
    }
    const target = inMemoryFacilities[index];
    const existingDoctors = target.mappedDoctors || DEFAULT_MAPPED_DOCTORS;
    const isAlreadyMapped = existingDoctors.some((d) => d.id === doctor.id || d.npi === doctor.npi);
    const updatedDoctors = isAlreadyMapped ? existingDoctors : [doctor, ...existingDoctors];

    const updated: FacilityItem = {
      ...target,
      mappedDoctors: updatedDoctors,
      doctorsCount: (target.doctorsCount || 0) + (isAlreadyMapped ? 0 : 1),
      activeDoctorsCount: (target.activeDoctorsCount || 0) + (isAlreadyMapped ? 0 : 1),
    };

    inMemoryFacilities[index] = updated;
    persistFacilities(inMemoryFacilities);
    return updated;
  },

  updateStaffRoster: async (facilityId: string, staffList: AssignedStaff[]): Promise<FacilityItem> => {
    await new Promise((r) => setTimeout(r, 120));
    const index = inMemoryFacilities.findIndex((f) => f.id === facilityId || f.facilityId === facilityId);
    if (index === -1) {
      throw new Error(`Facility ${facilityId} not found`);
    }
    const target = inMemoryFacilities[index];
    const updated: FacilityItem = {
      ...target,
      assignedStaff: staffList,
      medicalStaffCount: staffList.filter((s) => s.rosterState !== 'Standby Pool').length > 0 ? 420 : 419,
    };
    inMemoryFacilities[index] = updated;
    persistFacilities(inMemoryFacilities);
    return updated;
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
    await new Promise((r) => setTimeout(r, 150));
    const index = inMemoryFacilities.findIndex((f) => f.id === facilityId || f.facilityId === facilityId);
    if (index === -1) {
      throw new Error(`Facility ${facilityId} not found`);
    }
    const target = inMemoryFacilities[index];
    const updated: FacilityItem = {
      ...target,
      initialAdmin: adminPayload.adminName,
      adminEmail: adminPayload.adminEmail || target.adminEmail,
      adminRole: adminPayload.adminRole || target.adminRole || 'Chief Operations Officer',
      adminTenure: adminPayload.adminTenure || 'Assigned Just Now • Active',
      adminVaultToken: adminPayload.adminVaultToken || target.adminVaultToken || '#ADM-NY-0941',
    };
    inMemoryFacilities[index] = updated;
    persistFacilities(inMemoryFacilities);
    return updated;
  },
};

// ============================================================================
// TanStack Query Hooks
// ============================================================================

export const useFacilitiesQuery = () => {
  return useQuery({
    queryKey: ['facilities'],
    queryFn: () => facilityService.getFacilities(),
  });
};

export const useFacilityQuery = (id: string) => {
  return useQuery({
    queryKey: ['facility', id],
    queryFn: () => facilityService.getFacilityById(id),
    enabled: Boolean(id),
  });
};

export const useCreateFacilityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFacilityPayload) => facilityService.createFacility(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
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
      queryClient.invalidateQueries({ queryKey: ['facility', data.id] });
      queryClient.invalidateQueries({ queryKey: ['facility', data.facilityId] });
    },
  });
};

export const useMapDoctorMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ facilityId, doctor }: { facilityId: string; doctor: MappedDoctor }) =>
      facilityService.mapDoctor(facilityId, doctor),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility', data.id] });
      queryClient.invalidateQueries({ queryKey: ['facility', data.facilityId] });
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


