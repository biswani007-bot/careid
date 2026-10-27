import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import avatarEleanor from '../assets/patients/avatar-eleanor.png';
import heroEleanor from '../assets/patients/patient-eleanor-hero.png';
import avatarSarah from '../assets/patients/avatar-sarah-patient.png';

export type PatientStatus = 'ACTIVE' | 'INACTIVE';
export type VerificationStatus = 'Verified' | 'Pending';
export type PatientGender = 'Female' | 'Male' | 'Other';

export interface PatientEmergencyContact {
  name: string;
  relation: string;
  phone: string;
  authFormUrl?: string;
}

export interface PatientDependent {
  initials: string;
  name: string;
  relation: string;
}

export interface PatientVaultSummary {
  totalRecords: number;
  totalRecordsSub?: string;
  latestUpload: string;
  pendingOcrCount: number;
  vaxPassStatus: string;
}

export interface PatientPrimaryAddress {
  line1: string;
  line2?: string;
  cityStateZip: string;
}

export interface PatientProfileDetails {
  dob: string;
  gender: string;
  bloodGroup: string;
  registeredDateFormatted: string;
  verificationLevel: string;
  lastLogin: string;
  email: string;
  emailVerified: boolean;
  phone: string;
  phoneVerified: boolean;
  primaryAddress: PatientPrimaryAddress;
  emergencyContact: PatientEmergencyContact;
  vaultSummary: PatientVaultSummary;
  dependents: PatientDependent[];
  dataSharingConsent: string;
  activeProviderLinks: string;
}

export interface PatientItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  vaultId: string;
  demographics: string;
  gender: PatientGender;
  age: number;
  registered: string;
  registeredDate: string; // ISO format for reliable sorting
  verification: VerificationStatus;
  status: PatientStatus;
  links: {
    family: number;
    records: number;
  };
  avatarUrl?: string;
  heroPhotoUrl?: string;
  initials?: string;
  avatarBg?: string;
  avatarColor?: string;
  profile?: PatientProfileDetails;
}

export interface PatientDirectoryKPIs {
  totalPatients: number;
  totalGrowthText: string;
  verifiedPatients: number;
  verifiedRatioText: string;
  pendingVerification: number;
  pendingNoticeText: string;
  inactiveAccounts: number;
  inactiveNoticeText: string;
}

export interface FetchPatientsParams {
  search?: string;
  statusFilter?: string; // 'All' | 'Active' | 'Inactive'
  dateRangeFilter?: string; // 'All' | '30days' | 'year'
  genderFilter?: string; // 'All' | 'Female' | 'Male'
  sortBy?: 'newest' | 'oldest' | 'name' | 'vaultId';
  page?: number;
  limit?: number;
}

export interface FetchPatientsResult {
  patients: PatientItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  kpis: PatientDirectoryKPIs;
}

export interface UpdatePatientPayload {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: PatientStatus;
  dob?: string;
  bloodGroup?: string;
  addressLine1?: string;
  addressLine2?: string;
  cityStateZip?: string;
  avatarUrl?: string;
}

export interface CreatePatientPayload {
  firstName: string;
  lastName: string;
  dob: string;
  gender: PatientGender;
  email: string;
  phone: string;
  zipCode: string;
  address: string;
  photoUrl?: string;
}

// Initial mock dataset faithfully reproducing Figma Node 20:1643 and Node 20:1368
const INITIAL_PATIENTS: PatientItem[] = [
  {
    id: 'pat-1',
    name: 'Eleanor Vance',
    phone: '+1 (555) 842-9931',
    email: 'eleanor.vance@example.com',
    vaultId: 'HV-3928-8472-91',
    demographics: 'Female, 39',
    gender: 'Female',
    age: 39,
    registered: '04 Mar 2022',
    registeredDate: '2022-03-04',
    verification: 'Verified',
    status: 'ACTIVE',
    links: { family: 2, records: 142 },
    avatarUrl: avatarEleanor,
    heroPhotoUrl: heroEleanor,
    profile: {
      dob: '12 Oct 1984 (39y)',
      gender: 'Female',
      bloodGroup: 'O+',
      registeredDateFormatted: '04 Mar 2022',
      verificationLevel: 'Tier 3 (Gov ID)',
      lastLogin: '2 hours ago',
      email: 'eleanor.vance@example.com',
      emailVerified: true,
      phone: '+1 (555) 842-9931',
      phoneVerified: true,
      primaryAddress: {
        line1: '4822 Willow Creek Dr.',
        line2: 'Apt 4B',
        cityStateZip: 'Seattle, WA 98101',
      },
      emergencyContact: {
        name: 'James Vance',
        relation: 'Husband',
        phone: '+1 (555) 842-9932',
        authFormUrl: '#',
      },
      vaultSummary: {
        totalRecords: 142,
        totalRecordsSub: 'Encrypted & Stored',
        latestUpload: '12 Oct 2023',
        pendingOcrCount: 2,
        vaxPassStatus: 'Up to date',
      },
      dependents: [
        { initials: 'LV', name: 'Lucas Vance', relation: 'Son (8y)' },
        { initials: 'MV', name: 'Mia Vance', relation: 'Daughter (5y)' },
      ],
      dataSharingConsent: 'Granted',
      activeProviderLinks: '3 Facilities',
    },
  },
  {
    id: 'pat-2',
    name: 'Marcus Sterling',
    phone: '+1 (555) 923-1120',
    email: 'marcus.sterling@healthvault.org',
    vaultId: 'HV-9102-C',
    demographics: 'Male, 28',
    gender: 'Male',
    age: 28,
    registered: 'Oct 28, 2023',
    registeredDate: '2023-10-28',
    verification: 'Pending',
    status: 'ACTIVE',
    links: { family: 0, records: 2 },
    initials: 'MS',
    avatarBg: '#edeef0',
    avatarColor: '#494552',
    profile: {
      dob: '15 Jul 1995 (28y)',
      gender: 'Male',
      bloodGroup: 'A+',
      registeredDateFormatted: '28 Oct 2023',
      verificationLevel: 'Tier 2 (ID Document)',
      lastLogin: '1 day ago',
      email: 'marcus.sterling@healthvault.org',
      emailVerified: true,
      phone: '+1 (555) 923-1120',
      phoneVerified: true,
      primaryAddress: {
        line1: '742 Evergreen Terrace',
        line2: '',
        cityStateZip: 'Springfield, OR 97477',
      },
      emergencyContact: {
        name: 'Rachel Sterling',
        relation: 'Sister',
        phone: '+1 (555) 923-1121',
        authFormUrl: '#',
      },
      vaultSummary: {
        totalRecords: 2,
        totalRecordsSub: 'Encrypted & Stored',
        latestUpload: '28 Oct 2023',
        pendingOcrCount: 1,
        vaxPassStatus: 'Pending review',
      },
      dependents: [],
      dataSharingConsent: 'Granted',
      activeProviderLinks: '1 Facility',
    },
  },
  {
    id: 'pat-3',
    name: 'Sarah Jenkins',
    phone: '+1 (555) 442-9981',
    email: 'sarah.jenkins@healthvault.org',
    vaultId: 'HV-1029-B',
    demographics: 'Female, 67',
    gender: 'Female',
    age: 67,
    registered: 'Jan 05, 2022',
    registeredDate: '2022-01-05',
    verification: 'Verified',
    status: 'INACTIVE',
    links: { family: 0, records: 45 },
    avatarUrl: avatarSarah,
    profile: {
      dob: '18 Nov 1956 (67y)',
      gender: 'Female',
      bloodGroup: 'B+',
      registeredDateFormatted: '05 Jan 2022',
      verificationLevel: 'Tier 3 (Gov ID)',
      lastLogin: '3 weeks ago',
      email: 'sarah.jenkins@healthvault.org',
      emailVerified: true,
      phone: '+1 (555) 442-9981',
      phoneVerified: false,
      primaryAddress: {
        line1: '1204 Pine Hollow Road',
        line2: 'Suite 201',
        cityStateZip: 'Denver, CO 80203',
      },
      emergencyContact: {
        name: 'Robert Jenkins',
        relation: 'Spouse',
        phone: '+1 (555) 442-9982',
        authFormUrl: '#',
      },
      vaultSummary: {
        totalRecords: 45,
        totalRecordsSub: 'Encrypted & Stored',
        latestUpload: '14 Jan 2024',
        pendingOcrCount: 0,
        vaxPassStatus: 'Up to date',
      },
      dependents: [],
      dataSharingConsent: 'Revoked',
      activeProviderLinks: '0 Facilities',
    },
  },
  {
    id: 'pat-4',
    name: 'David K. Chen',
    phone: '+1 (555) 321-7788',
    email: 'david.chen@healthvault.org',
    vaultId: 'HV-7734-D',
    demographics: 'Male, 51',
    gender: 'Male',
    age: 51,
    registered: 'Nov 14, 2023',
    registeredDate: '2023-11-14',
    verification: 'Verified',
    status: 'ACTIVE',
    links: { family: 2, records: 18 },
    initials: 'DC',
    avatarBg: '#e0f2fe',
    avatarColor: '#0369a1',
  },
  {
    id: 'pat-5',
    name: 'Elena Rostova',
    phone: '+1 (555) 887-2109',
    email: 'elena.rostova@healthvault.org',
    vaultId: 'HV-5521-E',
    demographics: 'Female, 34',
    gender: 'Female',
    age: 34,
    registered: 'Dec 02, 2023',
    registeredDate: '2023-12-02',
    verification: 'Verified',
    status: 'ACTIVE',
    links: { family: 1, records: 8 },
    initials: 'ER',
    avatarBg: '#fce7f3',
    avatarColor: '#be185d',
  },
  {
    id: 'pat-6',
    name: 'Arthur Pendelton',
    phone: '+1 (555) 654-9912',
    email: 'arthur.p@healthvault.org',
    vaultId: 'HV-3310-F',
    demographics: 'Male, 63',
    gender: 'Male',
    age: 63,
    registered: 'Aug 19, 2022',
    registeredDate: '2022-08-19',
    verification: 'Pending',
    status: 'ACTIVE',
    links: { family: 4, records: 27 },
    initials: 'AP',
    avatarBg: '#fef3c7',
    avatarColor: '#b45309',
  },
  {
    id: 'pat-7',
    name: 'Clara Oswald',
    phone: '+1 (555) 789-4321',
    email: 'clara.o@healthvault.org',
    vaultId: 'HV-6649-G',
    demographics: 'Female, 29',
    gender: 'Female',
    age: 29,
    registered: 'Jan 15, 2024',
    registeredDate: '2024-01-15',
    verification: 'Verified',
    status: 'ACTIVE',
    links: { family: 0, records: 14 },
    initials: 'CO',
    avatarBg: '#ede9fe',
    avatarColor: '#6d28d9',
  },
  {
    id: 'pat-8',
    name: 'Michael B. Jordan',
    phone: '+1 (555) 234-8765',
    email: 'm.jordan@healthvault.org',
    vaultId: 'HV-2291-H',
    demographics: 'Male, 36',
    gender: 'Male',
    age: 36,
    registered: 'Sep 03, 2023',
    registeredDate: '2023-09-03',
    verification: 'Verified',
    status: 'ACTIVE',
    links: { family: 1, records: 9 },
    initials: 'MJ',
    avatarBg: '#dcfce7',
    avatarColor: '#15803d',
  },
  {
    id: 'pat-9',
    name: 'Sophia Lorenze',
    phone: '+1 (555) 987-1234',
    email: 'sophia.l@healthvault.org',
    vaultId: 'HV-4402-J',
    demographics: 'Female, 45',
    gender: 'Female',
    age: 45,
    registered: 'Feb 10, 2024',
    registeredDate: '2024-02-10',
    verification: 'Pending',
    status: 'ACTIVE',
    links: { family: 3, records: 31 },
    initials: 'SL',
    avatarBg: '#fef9c3',
    avatarColor: '#a16207',
  },
  {
    id: 'pat-10',
    name: 'James H. Watson',
    phone: '+1 (555) 678-5432',
    email: 'j.watson@healthvault.org',
    vaultId: 'HV-1193-K',
    demographics: 'Male, 58',
    gender: 'Male',
    age: 58,
    registered: 'Jul 22, 2022',
    registeredDate: '2022-07-22',
    verification: 'Verified',
    status: 'ACTIVE',
    links: { family: 2, records: 52 },
    initials: 'JW',
    avatarBg: '#ffedd5',
    avatarColor: '#c2410c',
  },
  {
    id: 'pat-11',
    name: 'Rebecca Nurse',
    phone: '+1 (555) 345-6789',
    email: 'rebecca.n@healthvault.org',
    vaultId: 'HV-8812-L',
    demographics: 'Female, 72',
    gender: 'Female',
    age: 72,
    registered: 'Nov 30, 2021',
    registeredDate: '2021-11-30',
    verification: 'Verified',
    status: 'INACTIVE',
    links: { family: 5, records: 64 },
    initials: 'RN',
    avatarBg: '#f1f5f9',
    avatarColor: '#475569',
  },
  {
    id: 'pat-12',
    name: 'Lucas Davenport',
    phone: '+1 (555) 456-7890',
    email: 'lucas.d@healthvault.org',
    vaultId: 'HV-9923-M',
    demographics: 'Male, 44',
    gender: 'Male',
    age: 44,
    registered: 'Feb 18, 2024',
    registeredDate: '2024-02-18',
    verification: 'Verified',
    status: 'ACTIVE',
    links: { family: 2, records: 19 },
    initials: 'LD',
    avatarBg: '#ccfbf1',
    avatarColor: '#0f766e',
  },
];

// In-memory state store persisting updates across mutations
let patientsStore = [...INITIAL_PATIENTS];

const BASE_KPIS: PatientDirectoryKPIs = {
  totalPatients: 28420,
  totalGrowthText: '+12% from last month',
  verifiedPatients: 24725,
  verifiedRatioText: '87% of total base',
  pendingVerification: 3108,
  pendingNoticeText: 'Requires manual OCR review',
  inactiveAccounts: 587,
  inactiveNoticeText: 'Archived or locked',
};

// Generates fallback profile details if patient record doesn't have an explicit profile
export const getOrGeneratePatientProfile = (patient: PatientItem): PatientProfileDetails => {
  if (patient.profile) {
    return patient.profile;
  }

  return {
    dob: `14 Mar ${2024 - patient.age} (${patient.age}y)`,
    gender: patient.gender,
    bloodGroup: patient.gender === 'Female' ? 'O+' : 'A+',
    registeredDateFormatted: patient.registered,
    verificationLevel: patient.verification === 'Verified' ? 'Tier 3 (Gov ID)' : 'Tier 1 (Email/Phone)',
    lastLogin: '3 hours ago',
    email: patient.email,
    emailVerified: patient.verification === 'Verified',
    phone: patient.phone,
    phoneVerified: true,
    primaryAddress: {
      line1: '100 Medical Center Blvd',
      line2: 'Apt 12B',
      cityStateZip: 'Seattle, WA 98104',
    },
    emergencyContact: {
      name: 'Emergency Contact',
      relation: 'Family',
      phone: patient.phone,
      authFormUrl: '#',
    },
    vaultSummary: {
      totalRecords: patient.links.records || 12,
      totalRecordsSub: 'Encrypted & Stored',
      latestUpload: patient.registered,
      pendingOcrCount: patient.verification === 'Pending' ? 1 : 0,
      vaxPassStatus: 'Up to date',
    },
    dependents: patient.links.family > 0 ? [
      { initials: 'FD', name: 'Family Dependent', relation: 'Child' }
    ] : [],
    dataSharingConsent: 'Granted',
    activeProviderLinks: `${Math.max(1, patient.links.family)} Facilities`,
  };
};

export const fetchPatients = async (
  params: FetchPatientsParams = {}
): Promise<FetchPatientsResult> => {
  // Simulate natural async API response latency (150ms)
  await new Promise((r) => setTimeout(r, 150));

  let filtered = [...patientsStore];

  // 1. Full-text search
  if (params.search && params.search.trim()) {
    const raw = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(raw) ||
        p.vaultId.toLowerCase().includes(raw) ||
        p.phone.toLowerCase().includes(raw) ||
        p.email.toLowerCase().includes(raw) ||
        p.demographics.toLowerCase().includes(raw)
    );
  }

  // 2. Status Filter
  if (params.statusFilter && params.statusFilter !== 'All') {
    const targetStatus = params.statusFilter.toUpperCase();
    filtered = filtered.filter((p) => p.status === targetStatus);
  }

  // 3. Gender Filter
  if (params.genderFilter && params.genderFilter !== 'All') {
    filtered = filtered.filter((p) => p.gender === params.genderFilter);
  }

  // 4. Date Range Filter
  if (params.dateRangeFilter && params.dateRangeFilter !== 'All') {
    if (params.dateRangeFilter === '30days') {
      const cutoff = new Date('2024-02-01').getTime();
      filtered = filtered.filter((p) => new Date(p.registeredDate).getTime() >= cutoff);
    } else if (params.dateRangeFilter === 'year') {
      const cutoff = new Date('2024-01-01').getTime();
      filtered = filtered.filter((p) => new Date(p.registeredDate).getTime() >= cutoff);
    }
  }

  // 5. Sorting
  if (params.sortBy === 'oldest') {
    filtered.sort((a, b) => new Date(a.registeredDate).getTime() - new Date(b.registeredDate).getTime());
  } else if (params.sortBy === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (params.sortBy === 'vaultId') {
    filtered.sort((a, b) => a.vaultId.localeCompare(b.vaultId));
  }
  // Default 'newest' retains the curated Figma showcase order (Eleanor Vance, Marcus Sterling, Sarah Jenkins)

  const page = params.page || 1;
  const limit = params.limit || 10;
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    patients: paginated,
    total: BASE_KPIS.totalPatients, // Preserves Figma total metric in pagination footer
    page,
    limit,
    totalPages,
    kpis: BASE_KPIS,
  };
};

export const fetchPatientById = async (id?: string): Promise<PatientItem | null> => {
  await new Promise((r) => setTimeout(r, 120));

  if (!id || id === 'pat-1' || id === 'HV-3928-8472-91' || id === 'profile' || id === 'HV-8842-A') {
    const eleanor = patientsStore.find((p) => p.id === 'pat-1') || patientsStore[0];
    return {
      ...eleanor,
      profile: getOrGeneratePatientProfile(eleanor),
    };
  }

  const found = patientsStore.find((p) => p.id === id || p.vaultId.toLowerCase() === id.toLowerCase());
  if (!found) {
    // If not found in store, default to Eleanor Vance
    const fallback = patientsStore[0];
    return {
      ...fallback,
      profile: getOrGeneratePatientProfile(fallback),
    };
  }

  return {
    ...found,
    profile: getOrGeneratePatientProfile(found),
  };
};

export const usePatientsQuery = (params: FetchPatientsParams = {}) => {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: () => fetchPatients(params),
    staleTime: 30000,
  });
};

export const usePatientQuery = (id?: string) => {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: () => fetchPatientById(id),
    staleTime: 30000,
  });
};

export const useTogglePatientStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, nextStatus }: { patientId: string; nextStatus: PatientStatus }) => {
      await new Promise((r) => setTimeout(r, 200));
      patientsStore = patientsStore.map((p) =>
        p.id === patientId ? { ...p, status: nextStatus } : p
      );
      return { patientId, nextStatus };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient'] });
    },
  });
};

export const useUpdatePatientMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdatePatientPayload) => {
      await new Promise((r) => setTimeout(r, 250));
      patientsStore = patientsStore.map((p) => {
        if (p.id === payload.id) {
          const currentProfile = getOrGeneratePatientProfile(p);
          const updatedProfile: PatientProfileDetails = {
            ...currentProfile,
            dob: payload.dob ?? currentProfile.dob,
            bloodGroup: payload.bloodGroup ?? currentProfile.bloodGroup,
            email: payload.email ?? currentProfile.email,
            phone: payload.phone ?? currentProfile.phone,
            primaryAddress: {
              ...currentProfile.primaryAddress,
              line1: payload.addressLine1 ?? currentProfile.primaryAddress.line1,
              line2: payload.addressLine2 ?? currentProfile.primaryAddress.line2,
              cityStateZip: payload.cityStateZip ?? currentProfile.primaryAddress.cityStateZip,
            },
          };

          return {
            ...p,
            name: payload.name ?? p.name,
            email: payload.email ?? p.email,
            phone: payload.phone ?? p.phone,
            status: payload.status ?? p.status,
            avatarUrl: payload.avatarUrl ?? p.avatarUrl,
            heroPhotoUrl: payload.avatarUrl ?? p.heroPhotoUrl,
            profile: updatedProfile,
          };
        }
        return p;
      });
      return payload;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', data.id] });
      queryClient.invalidateQueries({ queryKey: ['patient'] });
    },
  });
};

export const useResetPatientAccountMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId }: { patientId: string }) => {
      await new Promise((r) => setTimeout(r, 250));
      return { patientId, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
    },
  });
};

export const useCreatePatientMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePatientPayload) => {
      await new Promise((r) => setTimeout(r, 300));
      const fullName = `${payload.firstName.trim()} ${payload.lastName.trim()}`;
      const newId = `pat-${Date.now()}`;
      const randomSuffix1 = Math.floor(1000 + Math.random() * 9000);
      const randomSuffix2 = Math.floor(1000 + Math.random() * 9000);
      const randomSuffix3 = Math.floor(10 + Math.random() * 90);
      const vaultId = `HV-${randomSuffix1}-${randomSuffix2}-${randomSuffix3}`;

      // Calculate approximate age
      let age = 30;
      if (payload.dob) {
        const birthDate = new Date(payload.dob);
        if (!isNaN(birthDate.getTime())) {
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }
      }

      const todayFormatted = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date());

      const newPatient: PatientItem = {
        id: newId,
        name: fullName,
        phone: payload.phone.trim(),
        email: payload.email.trim(),
        vaultId,
        demographics: `${payload.gender}, ${age}`,
        gender: payload.gender,
        age,
        registered: todayFormatted,
        registeredDate: new Date().toISOString().split('T')[0],
        verification: 'Pending',
        status: 'ACTIVE',
        links: {
          family: 0,
          records: 0,
        },
        avatarUrl: payload.photoUrl,
        heroPhotoUrl: payload.photoUrl,
        profile: {
          dob: payload.dob ? `${payload.dob} (${age}y)` : 'Not specified',
          gender: payload.gender,
          bloodGroup: 'O+',
          registeredDateFormatted: todayFormatted,
          verificationLevel: 'Tier 1 (Pending Verification)',
          lastLogin: 'Just now',
          email: payload.email.trim(),
          emailVerified: false,
          phone: payload.phone.trim(),
          phoneVerified: false,
          primaryAddress: {
            line1: payload.address.trim(),
            cityStateZip: payload.zipCode.trim(),
          },
          emergencyContact: {
            name: 'Not provided',
            relation: 'Unspecified',
            phone: payload.phone.trim(),
          },
          vaultSummary: {
            totalRecords: 0,
            latestUpload: 'None',
            pendingOcrCount: 0,
            vaxPassStatus: 'Not Issued',
          },
          dependents: [],
          dataSharingConsent: 'Active',
          activeProviderLinks: '0 Active',
        },
      };

      patientsStore = [newPatient, ...patientsStore];
      return newPatient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
};

