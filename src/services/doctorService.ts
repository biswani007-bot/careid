import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Local authentic Figma doctor avatars
import doctorChenImg from '../assets/doctors/doctor-robert-chen.png';
import doctorJenkinsLargeImg from '../assets/doctors/doctor-sarah-jenkins-large.png';

export type DoctorStatus = 'Verified' | 'Pending' | 'Suspended';

export interface VerificationTimelineItem {
  title: string;
  subtitle: string;
  isCompleted: boolean;
}

export interface DoctorItem {
  id: string;
  name: string;
  hvId: string;
  license: string;
  specialty: string;
  hospital: string;
  status: DoctorStatus;
  avatarUrl?: string;
  initials?: string;
  avatarBg?: string;
  avatarColor?: string;
  email?: string;
  phone?: string;
  registered?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dob?: string;
  issuingBody?: string;
  licenseExpiry?: string;
  experienceYears?: string | number;
  subSpecialty?: string;
  department?: string;
  officeNumber?: string;
  temporaryPassword?: string;
  medicalCouncilRegistration?: string;
  officeAddress?: string;
  twoFactorStatus?: 'Enabled' | 'Disabled';
  lastLogin?: string;
  accountStatus?: 'Active' | 'Suspended';
  npi?: string;
  primaryFacility?: string;
  affiliationStatus?: string;
  privilegeStatus?: 'Currently Mapped' | 'Dual-Privilege Requested' | 'Available Immediately' | 'Dual-Privilege Eligible';
  verificationDocuments?: {
    medicalLicense?: string;
    governmentId?: string;
    affiliationLetter?: string;
  };
  verificationTimeline?: VerificationTimelineItem[];
}

export interface CreateDoctorPayload {
  firstName: string;
  lastName: string;
  gender?: string;
  dob?: string;
  avatarUrl?: string;
  license: string;
  issuingBody?: string;
  licenseExpiry?: string;
  experienceYears?: string | number;
  specialty: string;
  subSpecialty?: string;
  hospital: string;
  department?: string;
  officeNumber?: string;
  email: string;
  phone: string;
  temporaryPassword?: string;
  verificationDocuments?: {
    medicalLicense?: string;
    governmentId?: string;
    affiliationLetter?: string;
  };
  status?: DoctorStatus;
}

export interface DoctorDirectoryKPIs {
  totalDoctors: number;
  verifiedDoctors: number;
  pendingDoctors: number;
  suspendedDoctors: number;
}

export interface FetchDoctorsParams {
  search?: string;
  statusFilter?: 'All' | 'Verified' | 'Pending' | 'Suspended';
  specialtyFilter?: string;
  hospitalFilter?: string;
  sortBy?: 'name' | 'hvId' | 'specialty' | 'status' | 'default';
  page?: number;
  limit?: number;
}

export interface FetchDoctorsResult {
  doctors: DoctorItem[];
  total: number;
  page: number;
  limit: number;
  kpis: DoctorDirectoryKPIs;
}

// Initial mock dataset matching Figma Node 20:2270 (Admin Portal - Doctor Directory)
const INITIAL_DOCTORS: DoctorItem[] = [
  {
    id: 'doc-1',
    name: 'Dr. Robert Chen',
    hvId: 'HV-39482',
    license: 'MD-119284',
    specialty: 'Cardiology',
    subSpecialty: 'Interventional Cardiology',
    hospital: 'Metropolitan General',
    department: 'Cardiovascular Medicine',
    status: 'Verified',
    avatarUrl: doctorChenImg,
    email: 'robert.chen@careid.health',
    phone: '+1 (555) 392-4820',
    registered: '14 Jan 2022',
    medicalCouncilRegistration: 'MC-1192-US',
    licenseExpiry: 'Sep 2026',
    experienceYears: '14 Years',
    officeAddress: 'Suite 501, West Wing, Metropolitan General Hospital Campus',
    twoFactorStatus: 'Enabled',
    lastLogin: 'Today, 09:15 AM',
    accountStatus: 'Active',
    verificationDocuments: {
      medicalLicense: 'medical_license_chen.pdf',
      governmentId: 'id_chen.jpg',
      affiliationLetter: 'metro_affiliation.pdf',
    },
    verificationTimeline: [
      { title: 'Approved', subtitle: 'Jan 15, 2022 by Admin User', isCompleted: true },
      { title: 'Under Review', subtitle: 'Jan 14, 2022', isCompleted: true },
      { title: 'Documents Submitted', subtitle: 'Jan 14, 2022 via Portal', isCompleted: true },
    ],
  },
  {
    id: 'doc-michael-chang',
    name: 'Dr. Michael Chang, MD',
    hvId: 'HV-49210',
    license: 'NY-29401',
    npi: '1043928192',
    specialty: 'Interventional Cardiology',
    subSpecialty: 'Structural Heart Disease',
    hospital: 'Mount Sinai Hospital',
    department: 'Cardiovascular Institute',
    status: 'Verified',
    initials: 'MC',
    avatarBg: 'rgba(40, 0, 109, 0.1)',
    avatarColor: '#28006d',
    email: 'm.chang@mountsinai.careid.health',
    phone: '+1 (212) 659-4921',
    registered: '10 Jan 2021',
    primaryFacility: 'Mount Sinai Hospital',
    affiliationStatus: 'Primary Lead',
    privilegeStatus: 'Currently Mapped',
  },
  {
    id: 'doc-vance',
    name: 'Dr. Julian Vance, MD',
    hvId: 'HV-39508',
    license: 'NY-55193',
    npi: '1849204812',
    specialty: 'Cardiology Specialist',
    subSpecialty: 'General Practice',
    hospital: 'Mount Sinai Hospital',
    department: 'Outpatient Care',
    status: 'Verified',
    initials: 'JV',
    avatarBg: 'rgba(63, 29, 139, 0.15)',
    avatarColor: '#3f1d8b',
    email: 'dr.vance@clinic.org',
    phone: '+1 (555) 789-0123',
    registered: '20 May 2023',
    primaryFacility: 'Mount Sinai Hospital',
    affiliationStatus: 'Associate Attending',
    privilegeStatus: 'Currently Mapped',
    medicalCouncilRegistration: 'MC-8819-V',
    licenseExpiry: 'Nov 2027',
    experienceYears: '10 Years',
    officeAddress: 'Suite 210, Clinic Building\nMount Sinai Medical Center',
    twoFactorStatus: 'Enabled',
    lastLogin: 'Yesterday, 04:15 PM',
    accountStatus: 'Active',
    verificationDocuments: {
      medicalLicense: 'medical_license_vance.pdf',
      governmentId: 'id_vance.jpg',
      affiliationLetter: 'st_jude_affiliation.pdf',
    },
    verificationTimeline: [
      { title: 'CareID Card Issued', subtitle: 'May 22, 2023', isCompleted: true },
      { title: 'Hospital Affiliation Confirmed', subtitle: 'May 21, 2023', isCompleted: true },
      { title: 'Credentials Verified', subtitle: 'May 20, 2023', isCompleted: true },
      { title: 'Application Submitted', subtitle: 'May 18, 2023', isCompleted: true },
    ],
  },
  {
    id: 'doc-aris-thorne',
    name: 'Dr. Aris Thorne, MD',
    hvId: 'HV-44812',
    license: 'NY-44812',
    npi: '1679021485',
    specialty: 'Interventional Cardiology',
    subSpecialty: 'Complex Coronary Interventions',
    hospital: 'Presbyterian Plaza',
    department: 'Cardiac Catheterization',
    status: 'Verified',
    initials: 'AT',
    avatarBg: 'rgba(63, 29, 139, 0.15)',
    avatarColor: '#3f1d8b',
    email: 'a.thorne@presbyterian.careid.health',
    phone: '+1 (212) 746-4481',
    registered: '12 May 2022',
    primaryFacility: 'Presbyterian Plaza',
    affiliationStatus: 'Dual-Privilege Requested',
    privilegeStatus: 'Dual-Privilege Requested',
  },
  {
    id: 'doc-amanda-foster',
    name: 'Dr. Amanda Foster, MD',
    hvId: 'HV-88402',
    license: 'NY-88402',
    npi: '1447812903',
    specialty: 'Vascular Surgery',
    subSpecialty: 'Endovascular & Aortic Repair',
    hospital: 'Unassigned / Independent',
    department: 'Vascular & Interventional Services',
    status: 'Verified',
    avatarUrl: doctorJenkinsLargeImg,
    initials: 'AF',
    avatarBg: 'rgba(0, 106, 96, 0.15)',
    avatarColor: '#006a60',
    email: 'a.foster@careid.health',
    phone: '+1 (212) 555-8840',
    registered: '04 Oct 2023',
    primaryFacility: 'Unassigned / Independent',
    affiliationStatus: 'Available Immediately',
    privilegeStatus: 'Available Immediately',
  },
  {
    id: 'doc-james-wilson',
    name: 'Dr. James Wilson, MD',
    hvId: 'HV-66129',
    license: 'NY-66129',
    npi: '1982347109',
    specialty: 'Radiology & Imaging',
    subSpecialty: 'Diagnostic & Fluoroscopy',
    hospital: 'Mount Sinai West',
    department: 'Diagnostic Radiology',
    status: 'Verified',
    initials: 'JW',
    avatarBg: 'rgba(0, 106, 96, 0.12)',
    avatarColor: '#006a60',
    email: 'j.wilson@mountsinaiwest.careid.health',
    phone: '+1 (212) 523-6612',
    registered: '18 Aug 2023',
    primaryFacility: 'Mount Sinai West',
    affiliationStatus: 'Dual-Privilege Eligible',
    privilegeStatus: 'Dual-Privilege Eligible',
  },
  {
    id: 'doc-2',
    name: 'Dr. Sarah Jenkins',
    hvId: 'HV-DOC-8821',
    license: 'MC-9921-X',
    specialty: 'Cardiology',
    subSpecialty: 'Interventional Cardiology',
    hospital: 'Mercy General',
    department: 'Cardiovascular',
    status: 'Verified',
    avatarUrl: doctorJenkinsLargeImg,
    email: 'dr.jenkins@hospital.org',
    phone: '+1 555-019-2834',
    registered: 'March 15, 2022',
    medicalCouncilRegistration: 'Reg. 882910-US',
    licenseExpiry: 'Oct 2026',
    experienceYears: '12+ Years',
    officeAddress: 'Building 4, Suite 402\nMercy General Hospital Campus',
    twoFactorStatus: 'Enabled',
    lastLogin: 'Today, 08:42 AM',
    accountStatus: 'Active',
    verificationDocuments: {
      medicalLicense: 'medical_license_md9921.pdf',
      governmentId: 'passport_scan.jpg',
      affiliationLetter: 'mercy_affiliation_2022.pdf',
    },
    verificationTimeline: [
      { title: 'Approved', subtitle: 'Mar 16, 2022 by Admin User', isCompleted: true },
      { title: 'Under Review', subtitle: 'Mar 15, 2022', isCompleted: false },
      { title: 'Documents Submitted', subtitle: 'Mar 15, 2022 via Portal', isCompleted: false },
    ],
  },
  {
    id: 'doc-3',
    name: 'Dr. Elena Rostova',
    hvId: 'HV-39488',
    license: 'MD-310452',
    specialty: 'Oncology',
    subSpecialty: 'Medical Oncology',
    hospital: 'City Health Clinic',
    department: 'Cancer Care Center',
    status: 'Verified',
    initials: 'ER',
    avatarBg: 'rgba(0, 106, 96, 0.15)',
    avatarColor: '#006a60',
    email: 'elena.rostova@healthvault.org',
    phone: '+1 (555) 482-9102',
    registered: '10 Mar 2022',
    medicalCouncilRegistration: 'MC-3104-NY',
    licenseExpiry: 'Jun 2027',
    experienceYears: '9 Years',
    officeAddress: 'Floor 3, Oncology Wing, City Health Clinic',
    twoFactorStatus: 'Enabled',
    lastLogin: 'Yesterday, 02:40 PM',
    accountStatus: 'Active',
    verificationDocuments: {
      medicalLicense: 'medical_license_rostova.pdf',
      governmentId: 'id_rostova.jpg',
      affiliationLetter: 'city_health_letter.pdf',
    },
    verificationTimeline: [
      { title: 'Approved', subtitle: 'Mar 11, 2022 by Admin User', isCompleted: true },
      { title: 'Under Review', subtitle: 'Mar 10, 2022', isCompleted: true },
      { title: 'Documents Submitted', subtitle: 'Mar 10, 2022 via Portal', isCompleted: true },
    ],
  },
  {
    id: 'doc-4',
    name: 'Dr. Marcus Sterling',
    hvId: 'HV-39491',
    license: 'MD-402911',
    specialty: 'Pediatrics',
    subSpecialty: 'Pediatric Pulmonology',
    hospital: 'Valley Children\'s Hospital',
    department: 'Pediatric Care Unit',
    status: 'Pending',
    initials: 'MS',
    avatarBg: 'rgba(250, 189, 0, 0.2)',
    avatarColor: '#cb9900',
    email: 'marcus.sterling@childrenshealth.org',
    phone: '+1 (555) 923-1120',
    registered: '28 Oct 2023',
    medicalCouncilRegistration: 'MC-4029-CA',
    licenseExpiry: 'Dec 2025',
    experienceYears: '6 Years',
    officeAddress: 'Building B, Valley Children\'s Hospital',
    twoFactorStatus: 'Disabled',
    lastLogin: '3 days ago',
    accountStatus: 'Active',
    verificationDocuments: {
      medicalLicense: 'medical_license_sterling.pdf',
      governmentId: 'id_sterling.jpg',
      affiliationLetter: 'valley_affiliation.pdf',
    },
    verificationTimeline: [
      { title: 'Under Review', subtitle: 'Oct 28, 2023', isCompleted: false },
      { title: 'Documents Submitted', subtitle: 'Oct 28, 2023 via Portal', isCompleted: true },
    ],
  },
  {
    id: 'doc-5',
    name: 'Dr. Lisa Montgomery',
    hvId: 'HV-39494',
    license: 'MD-519384',
    specialty: 'Dermatology',
    subSpecialty: 'Cosmetic & Surgical Dermatology',
    hospital: 'Metropolitan General',
    department: 'Dermatology Clinic',
    status: 'Suspended',
    initials: 'LM',
    avatarBg: 'rgba(186, 26, 26, 0.15)',
    avatarColor: '#ba1a1a',
    email: 'lisa.montgomery@clinic.org',
    phone: '+1 (555) 442-9981',
    registered: '05 Jan 2022',
    medicalCouncilRegistration: 'MC-5193-IL',
    licenseExpiry: 'Mar 2026',
    experienceYears: '11 Years',
    officeAddress: 'Suite 104, Metropolitan General',
    twoFactorStatus: 'Enabled',
    lastLogin: '2 weeks ago',
    accountStatus: 'Suspended',
    verificationDocuments: {
      medicalLicense: 'medical_license_montgomery.pdf',
      governmentId: 'id_montgomery.jpg',
      affiliationLetter: 'metro_affiliation_letter.pdf',
    },
    verificationTimeline: [
      { title: 'Account Suspended', subtitle: 'May 04, 2024 by Compliance', isCompleted: true },
      { title: 'Approved', subtitle: 'Jan 06, 2022 by Admin User', isCompleted: true },
      { title: 'Documents Submitted', subtitle: 'Jan 05, 2022 via Portal', isCompleted: true },
    ],
  },
  {
    id: 'doc-6',
    name: 'Dr. David K. Chen',
    hvId: 'HV-39497',
    license: 'MD-610294',
    specialty: 'Orthopedics',
    subSpecialty: 'Joint Replacement Surgery',
    hospital: 'St. Jude Medical Center',
    department: 'Orthopedic Surgery',
    status: 'Verified',
    initials: 'DC',
    avatarBg: 'rgba(40, 0, 109, 0.1)',
    avatarColor: '#28006d',
    email: 'david.chen@orthosurgeon.com',
    phone: '+1 (555) 721-7700',
    registered: '14 Nov 2023',
    medicalCouncilRegistration: 'MC-6102-TX',
    licenseExpiry: 'Aug 2027',
    experienceYears: '15 Years',
    officeAddress: 'Pavilion 2, St. Jude Medical Center',
    twoFactorStatus: 'Enabled',
    lastLogin: 'Today, 11:30 AM',
    accountStatus: 'Active',
    verificationDocuments: {
      medicalLicense: 'medical_license_chen_dk.pdf',
      governmentId: 'passport_scan.jpg',
      affiliationLetter: 'st_jude_letter.pdf',
    },
    verificationTimeline: [
      { title: 'Approved', subtitle: 'Nov 15, 2023 by Admin User', isCompleted: true },
      { title: 'Under Review', subtitle: 'Nov 14, 2023', isCompleted: true },
      { title: 'Documents Submitted', subtitle: 'Nov 14, 2023 via Portal', isCompleted: true },
    ],
  },
  {
    id: 'doc-7',
    name: 'Dr. Rachel Adams',
    hvId: 'HV-39501',
    license: 'MD-729104',
    specialty: 'Cardiology',
    subSpecialty: 'Cardiac Electrophysiology',
    hospital: 'City Health Clinic',
    department: 'Cardiovascular Care',
    status: 'Suspended',
    initials: 'RA',
    avatarBg: 'rgba(186, 26, 26, 0.15)',
    avatarColor: '#ba1a1a',
    email: 'rachel.adams@careid.health',
    phone: '+1 (555) 612-4029',
    registered: '19 Apr 2023',
    medicalCouncilRegistration: 'MC-7291-FL',
    licenseExpiry: 'Jan 2026',
    experienceYears: '8 Years',
    officeAddress: 'Suite 220, City Health Clinic',
    twoFactorStatus: 'Enabled',
    lastLogin: '1 month ago',
    accountStatus: 'Suspended',
    verificationDocuments: {
      medicalLicense: 'medical_license_adams.pdf',
      governmentId: 'id_adams.jpg',
      affiliationLetter: 'city_health_affil.pdf',
    },
    verificationTimeline: [
      { title: 'Account Suspended', subtitle: 'Jun 12, 2024 by Security', isCompleted: true },
      { title: 'Approved', subtitle: 'Apr 20, 2023 by Admin User', isCompleted: true },
      { title: 'Documents Submitted', subtitle: 'Apr 19, 2023 via Portal', isCompleted: true },
    ],
  },
  {
    id: 'doc-8',
    name: 'Dr. James Wilson',
    hvId: 'HV-39504',
    license: 'MD-839201',
    specialty: 'Neurology',
    subSpecialty: 'Clinical Neurophysiology',
    hospital: 'Valley Children\'s Hospital',
    department: 'Neurology Department',
    status: 'Verified',
    initials: 'JW',
    avatarBg: 'rgba(0, 106, 96, 0.15)',
    avatarColor: '#006a60',
    email: 'james.wilson@neurologypartners.org',
    phone: '+1 (555) 589-3211',
    registered: '02 Aug 2023',
    medicalCouncilRegistration: 'MC-8392-WA',
    licenseExpiry: 'May 2028',
    experienceYears: '16 Years',
    officeAddress: 'Suite 412, Valley Children\'s Hospital Campus',
    twoFactorStatus: 'Enabled',
    lastLogin: 'Yesterday, 05:10 PM',
    accountStatus: 'Active',
    verificationDocuments: {
      medicalLicense: 'medical_license_wilson.pdf',
      governmentId: 'id_wilson.jpg',
      affiliationLetter: 'valley_affiliation_2023.pdf',
    },
    verificationTimeline: [
      { title: 'Approved', subtitle: 'Aug 03, 2023 by Admin User', isCompleted: true },
      { title: 'Under Review', subtitle: 'Aug 02, 2023', isCompleted: true },
      { title: 'Documents Submitted', subtitle: 'Aug 02, 2023 via Portal', isCompleted: true },
    ],
  },
];

// In-memory store for active session persistence
let inMemoryDoctors: DoctorItem[] = [...INITIAL_DOCTORS];

// Mock API Call simulating network request
export const fetchDoctors = async (
  params: FetchDoctorsParams = {}
): Promise<FetchDoctorsResult> => {
  await new Promise((resolve) => setTimeout(resolve, 80));

  const {
    search = '',
    statusFilter = 'All',
    specialtyFilter = 'All Specialties',
    hospitalFilter = 'All Hospitals',
    sortBy = 'default',
    page = 1,
    limit = 10,
  } = params;

  let filtered = [...inMemoryDoctors];

  // Search by name, HV ID, license, or specialty
  if (search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (doc) =>
        doc.name.toLowerCase().includes(q) ||
        doc.hvId.toLowerCase().includes(q) ||
        doc.license.toLowerCase().includes(q) ||
        doc.specialty.toLowerCase().includes(q) ||
        doc.hospital.toLowerCase().includes(q)
    );
  }

  // Filter by Status Tab
  if (statusFilter !== 'All') {
    filtered = filtered.filter((doc) => doc.status === statusFilter);
  }

  // Filter by Specialty Dropdown
  if (specialtyFilter && specialtyFilter !== 'All Specialties' && specialtyFilter !== 'All') {
    filtered = filtered.filter(
      (doc) => doc.specialty.toLowerCase() === specialtyFilter.toLowerCase()
    );
  }

  // Filter by Hospital Dropdown
  if (hospitalFilter && hospitalFilter !== 'All Hospitals' && hospitalFilter !== 'All') {
    filtered = filtered.filter(
      (doc) => doc.hospital.toLowerCase() === hospitalFilter.toLowerCase()
    );
  }

  // Sort
  if (sortBy === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'hvId') {
    filtered.sort((a, b) => a.hvId.localeCompare(b.hvId));
  } else if (sortBy === 'specialty') {
    filtered.sort((a, b) => a.specialty.localeCompare(b.specialty));
  } else if (sortBy === 'status') {
    filtered.sort((a, b) => a.status.localeCompare(b.status));
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  // Derive KPIs or preserve authentic Figma counts
  // Figma exact: TOTAL DOCTORS 3,842, VERIFIED 3,510, PENDING 248, SUSPENDED 84
  const verifiedCount = inMemoryDoctors.filter((d) => d.status === 'Verified').length;
  const pendingCount = inMemoryDoctors.filter((d) => d.status === 'Pending').length;
  const suspendedCount = inMemoryDoctors.filter((d) => d.status === 'Suspended').length;

  return {
    doctors: paginated,
    total,
    page,
    limit,
    kpis: {
      totalDoctors: 3842 + (inMemoryDoctors.length - INITIAL_DOCTORS.length),
      verifiedDoctors: 3510 + (verifiedCount - 4),
      pendingDoctors: 248 + (pendingCount - 2),
      suspendedDoctors: 84 + (suspendedCount - 2),
    },
  };
};

// React Query Hooks
export const useDoctorsQuery = (params: FetchDoctorsParams = {}) => {
  return useQuery({
    queryKey: ['doctors', params],
    queryFn: () => fetchDoctors(params),
    staleTime: 1000 * 60 * 2,
  });
};

export const useToggleDoctorStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      doctorId,
      nextStatus,
    }: {
      doctorId: string;
      nextStatus: DoctorStatus;
    }) => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      inMemoryDoctors = inMemoryDoctors.map((doc) =>
        doc.id === doctorId ? { ...doc, status: nextStatus } : doc
      );
      return { success: true, doctorId, nextStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
};

export const useAddDoctorMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateDoctorPayload) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const initials = `${payload.firstName[0] || ''}${payload.lastName[0] || ''}`.toUpperCase();
      const generatedHvId = `HV-${Math.floor(39500 + Math.random() * 490)}`;
      const newDoctor: DoctorItem = {
        id: `doc-${Date.now()}`,
        name: `Dr. ${payload.firstName} ${payload.lastName}`.trim(),
        hvId: generatedHvId,
        license: payload.license,
        specialty: payload.specialty,
        hospital: payload.hospital,
        status: payload.status || 'Pending',
        avatarUrl: payload.avatarUrl,
        initials,
        avatarBg: 'rgba(40, 0, 109, 0.1)',
        avatarColor: '#28006d',
        email: payload.email,
        phone: payload.phone,
        registered: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        firstName: payload.firstName,
        lastName: payload.lastName,
        gender: payload.gender,
        dob: payload.dob,
        issuingBody: payload.issuingBody,
        licenseExpiry: payload.licenseExpiry,
        experienceYears: payload.experienceYears,
        subSpecialty: payload.subSpecialty,
        department: payload.department,
        officeNumber: payload.officeNumber,
        temporaryPassword: payload.temporaryPassword || 'HV360-T9x#m2L',
        verificationDocuments: payload.verificationDocuments,
      };
      inMemoryDoctors = [newDoctor, ...inMemoryDoctors];
      return newDoctor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
};

export const fetchDoctorById = async (id: string): Promise<DoctorItem | null> => {
  await new Promise((resolve) => setTimeout(resolve, 80));
  if (!id) return null;
  const found = inMemoryDoctors.find((d) => d.id === id);
  if (found) return found;
  if (id === 'doc-vance' || id === 'julian-vance' || id === 'vance') {
    return inMemoryDoctors.find((d) => d.id === 'doc-vance') || null;
  }
  if (id === 'doc-2' || id === 'sarah-jenkins') {
    return inMemoryDoctors.find((d) => d.id === 'doc-2') || null;
  }
  return null;
};

export const useDoctorQuery = (doctorId: string) => {
  return useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () => fetchDoctorById(doctorId),
    enabled: !!doctorId,
    staleTime: 1000 * 60 * 2,
  });
};

export const useUpdateDoctorProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updated: Partial<DoctorItem> & { id: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      inMemoryDoctors = inMemoryDoctors.map((doc) => {
        if (doc.id === updated.id) {
          const merged = { ...doc, ...updated };
          if (updated.name && !doc.avatarUrl) {
            const clean = updated.name.replace(/^Dr\.\s*/i, '').trim();
            const parts = clean.split(/\s+/);
            const initials = `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase();
            if (initials) merged.initials = initials;
          }
          return merged;
        }
        return doc;
      });
      const saved = inMemoryDoctors.find((d) => d.id === updated.id);
      return saved;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctor', variables.id] });
    },
  });
};

export const useSuspendDoctorMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ doctorId, isSuspended }: { doctorId: string; isSuspended: boolean }) => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      inMemoryDoctors = inMemoryDoctors.map((doc) =>
        doc.id === doctorId
          ? {
              ...doc,
              status: isSuspended ? 'Suspended' : 'Verified',
              accountStatus: isSuspended ? 'Suspended' : 'Active',
            }
          : doc
      );
      const saved = inMemoryDoctors.find((d) => d.id === doctorId);
      return saved;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctor', variables.doctorId] });
    },
  });
};

export const useResetDoctorPasswordMutation = () => {
  return useMutation({
    mutationFn: async ({ doctorId, email }: { doctorId: string; email: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { success: true, doctorId, email };
    },
  });
};

