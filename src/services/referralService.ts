import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type ReferralPriority = 'High' | 'Routine' | 'Urgent';
export type ReferralStatus = 'Pending' | 'Accepted' | 'Completed' | 'Cancelled' | 'Escalated';

export interface ReferralNoteItem {
  id: string;
  referralId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  noteText: string;
  isPrivate?: boolean;
  createdAt: string;
}

export interface ReferralAttachmentItem {
  id: string;
  referralId: string;
  attachmentId: string;
  title: string;
  fileType: string;
  fileSize: string;
  addedDate: string;
  downloadUrl?: string;
  attachedBy?: string;
  createdAt: string;
}

export interface ReferralTimelineEvent {
  id: string;
  referralId: string;
  title: string;
  timestamp: string;
  description: string;
  actor?: string;
  fromStatus?: string;
  toStatus?: string;
  isCurrent?: boolean;
  statusType?: 'in_progress' | 'completed' | 'pending' | 'created';
}

export interface ReferralItem {
  id: string;
  referralId: string;
  patientId: string;
  patientName: string;
  patientGender?: string;
  patientAge?: number;
  patientDob?: string;
  healthVaultId?: string;
  referringDoctorId: string;
  referringDoctorName: string;
  referringDoctorSpecialty?: string;
  receivingDoctorId: string;
  receivingDoctorName: string;
  receivingDoctorSpecialty?: string;
  facilityId: string;
  hospitalName: string;
  specialty: string;
  priority: ReferralPriority;
  date: string;
  createdAt: string;
  status: ReferralStatus;
  clinicalReason?: string;
  notes?: string;
  insuranceProvider?: string;
  authorizationCode?: string;
  urgencyTimeline?: string;
  patientInitials?: string;
  delayDuration?: string;
  delayHours?: number;
  assignedAdmin?: string;
  assignedAdminId?: string;
  expiresAt?: string;
  isSlaBreached?: boolean;
  attachments?: ReferralAttachmentItem[];
  notesList?: ReferralNoteItem[];
  statusHistory?: ReferralTimelineEvent[];
}

export interface ReferralSummaryStats {
  totalReferrals: number;
  pending: number;
  accepted: number;
  completed: number;
  cancelled: number;
  escalated: number;
}

export interface ReferralFilters {
  searchQuery?: string;
  priority?: string;
  hospital?: string;
  specialty?: string;
  status?: string;
}

export interface ReferralPaginatedResponse {
  items: ReferralItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const STORAGE_KEY = 'careid_admin_referrals_records';

export const INITIAL_REFERRAL_RECORDS: ReferralItem[] = [
  {
    id: 'ref-8842',
    referralId: '#REF-8842',
    patientId: 'PAT-88420',
    patientName: 'Eleanor Jensen',
    patientInitials: 'EJ',
    patientGender: 'Female',
    patientAge: 52,
    referringDoctorId: 'DOC-1029',
    referringDoctorName: 'Dr. Sarah Jenkins',
    referringDoctorSpecialty: 'Internal Medicine',
    receivingDoctorId: 'DOC-4821',
    receivingDoctorName: 'Dr. Michael Chen',
    receivingDoctorSpecialty: 'Cardiology',
    facilityId: 'FAC-01',
    hospitalName: 'Mercy General',
    specialty: 'Cardiology',
    priority: 'Urgent',
    date: 'Oct 24, 2023',
    createdAt: '2023-10-22T08:30:00Z',
    status: 'Escalated',
    clinicalReason: 'Unstable angina with severe troponin elevation. Immediate cardiac catheterization required.',
    notes: 'SLA threshold (24 hours) breached. Patient awaiting transfer bed authorization.',
    insuranceProvider: 'BlueCross Health Premier',
    authorizationCode: 'AUTH-MG-88421',
    urgencyTimeline: 'Immediate',
    delayDuration: '+48 Hours',
    delayHours: 48,
    assignedAdmin: 'Unassigned',
    isSlaBreached: true,
    healthVaultId: 'HV-8842-1029',
    patientDob: '14-Aug-1971',
    attachments: [
      {
        id: 'att-8842-1',
        referralId: '#REF-8842',
        attachmentId: 'att-angio-01',
        title: 'Cardiac Angiogram CD',
        fileType: 'DICOM',
        fileSize: '48.2 MB',
        addedDate: 'Oct 22',
        attachedBy: 'Dr. Sarah Jenkins',
        createdAt: '2023-10-22T08:35:00Z',
      },
    ],
    notesList: [
      {
        id: 'note-8842-1',
        referralId: '#REF-8842',
        authorId: 'usr-admin',
        authorName: 'Admin (System)',
        authorRole: 'System',
        noteText: 'SLA threshold (24 hours) breached. Patient awaiting transfer bed authorization.',
        createdAt: 'Oct 23, 08:30 AM',
      },
    ],
    statusHistory: [
      {
        id: 'hist-8842-1',
        referralId: '#REF-8842',
        title: 'Escalated (SLA Breach)',
        timestamp: 'CURRENT STATUS',
        description: 'Breached 24-hour SLA window. Critical triage required.',
        isCurrent: true,
        statusType: 'in_progress',
      },
      {
        id: 'hist-8842-2',
        referralId: '#REF-8842',
        title: 'Referral Received',
        timestamp: 'Oct 22, 09:15 AM',
        description: 'Received by Mercy General.',
        statusType: 'completed',
      },
      {
        id: 'hist-8842-3',
        referralId: '#REF-8842',
        title: 'Referral Created',
        timestamp: 'Oct 22, 08:30 AM',
        description: 'Initiated by Dr. Sarah Jenkins.',
        statusType: 'created',
      },
    ],
  },
  {
    id: 'ref-8839',
    referralId: '#REF-8839',
    patientId: 'PAT-88391',
    patientName: 'Thomas Chen',
    patientInitials: 'TC',
    patientGender: 'Male',
    patientAge: 44,
    patientDob: '03-Feb-1979',
    healthVaultId: 'HV-8839-2041',
    referringDoctorId: 'DOC-2041',
    referringDoctorName: 'Dr. Robert Torres',
    referringDoctorSpecialty: 'Family Medicine',
    receivingDoctorId: 'DOC-5920',
    receivingDoctorName: 'Dr. Emily Watson',
    receivingDoctorSpecialty: 'Neurology',
    facilityId: 'FAC-03',
    hospitalName: 'St. Jude Medical',
    specialty: 'Neurology',
    priority: 'High',
    date: 'Oct 23, 2023',
    createdAt: '2023-10-22T14:00:00Z',
    status: 'Escalated',
    clinicalReason: 'Progressive focal neurological deficits with visual field constriction.',
    notes: 'Awaiting urgent 3T MRI neuro-navigation protocol. SLA 48h limit reached.',
    insuranceProvider: 'Aetna Select Gold',
    authorizationCode: 'AUTH-SJ-88390',
    urgencyTimeline: 'Within 24 hours',
    delayDuration: '+24 Hours',
    delayHours: 24,
    assignedAdmin: 'Dr. S. Miller',
    isSlaBreached: true,
    attachments: [
      {
        id: 'att-8839-1',
        referralId: '#REF-8839',
        attachmentId: 'att-mri-01',
        title: 'Brain 3T MRI Scan',
        fileType: 'PDF',
        fileSize: '8.4 MB',
        addedDate: 'Oct 22',
        attachedBy: 'Dr. Robert Torres',
        createdAt: '2023-10-22T14:10:00Z',
      },
    ],
    notesList: [
      {
        id: 'note-8839-1',
        referralId: '#REF-8839',
        authorId: 'usr-admin',
        authorName: 'Admin (System)',
        authorRole: 'System',
        noteText: 'Awaiting urgent 3T MRI neuro-navigation protocol. SLA 48h limit reached.',
        createdAt: 'Oct 23, 11:15 AM',
      },
    ],
    statusHistory: [
      {
        id: 'hist-8839-1',
        referralId: '#REF-8839',
        title: 'Escalated (SLA Delay)',
        timestamp: 'CURRENT STATUS',
        description: 'Exceeded 24h neurology intake SLA.',
        isCurrent: true,
        statusType: 'in_progress',
      },
      {
        id: 'hist-8839-2',
        referralId: '#REF-8839',
        title: 'Referral Received',
        timestamp: 'Oct 22, 14:30 AM',
        description: 'Received by St. Jude Medical.',
        statusType: 'completed',
      },
      {
        id: 'hist-8839-3',
        referralId: '#REF-8839',
        title: 'Referral Created',
        timestamp: 'Oct 22, 14:00 AM',
        description: 'Initiated by Dr. Robert Torres.',
        statusType: 'created',
      },
    ],
  },
  {
    id: 'ref-9021',
    referralId: '#REF-9021',
    patientId: 'PAT-49210',
    patientName: 'John Smith',
    patientInitials: 'JS',
    patientGender: 'Male',
    patientAge: 58,
    patientDob: '12-May-1965',
    healthVaultId: 'HV-4490-8821',
    referringDoctorId: 'DOC-1029',
    referringDoctorName: 'Dr. Sarah Jenkins',
    referringDoctorSpecialty: 'General Practice',
    receivingDoctorId: 'DOC-4821',
    receivingDoctorName: 'Dr. Michael Chen',
    receivingDoctorSpecialty: 'Cardiology',
    facilityId: 'FAC-01',
    hospitalName: 'Mercy General Hospital',
    specialty: 'Cardiology',
    priority: 'High',
    date: 'Oct 24, 2023',
    createdAt: '2023-10-24T09:00:00Z',
    status: 'Pending',
    clinicalReason:
      'Patient complaining of persistent chest pain and shortness of breath during mild exertion over the last 3 weeks. History of hypertension. Requesting comprehensive cardiovascular evaluation and stress test.',
    notes: 'Verified patient insurance status. Awaiting review from Cardiology intake coordinator for scheduling.',
    insuranceProvider: 'BlueCross Health Premier',
    authorizationCode: 'AUTH-NY-99421',
    urgencyTimeline: 'Within 48 hours',
    delayDuration: '+18 Hours',
    delayHours: 18,
    assignedAdmin: 'Dr. Sarah Jenkins',
    isSlaBreached: true,
    attachments: [
      {
        id: 'att-9021-1',
        referralId: '#REF-9021',
        attachmentId: 'att-lab-9021',
        title: 'Recent Lab Results',
        fileType: 'PDF',
        fileSize: '1.2 MB',
        addedDate: 'Oct 24',
        attachedBy: 'Dr. Sarah Jenkins',
        createdAt: '2023-10-24T09:15:00Z',
      },
      {
        id: 'att-9021-2',
        referralId: '#REF-9021',
        attachmentId: 'att-ecg-9021',
        title: 'ECG Scan (Resting)',
        fileType: 'JPG',
        fileSize: '3.4 MB',
        addedDate: 'Oct 24',
        attachedBy: 'Dr. Sarah Jenkins',
        createdAt: '2023-10-24T09:20:00Z',
      },
    ],
    notesList: [
      {
        id: 'note-9021-1',
        referralId: '#REF-9021',
        authorId: 'usr-admin',
        authorName: 'Admin (System)',
        authorRole: 'System',
        noteText: 'Verified patient insurance status. Awaiting review from Cardiology intake coordinator for scheduling.',
        isPrivate: false,
        createdAt: 'Oct 24, 10:05 AM',
      },
    ],
    statusHistory: [
      {
        id: 'hist-9021-1',
        referralId: '#REF-9021',
        title: 'Accepted (In Progress)',
        timestamp: 'CURRENT STATUS',
        description: 'Pending clinical review by department.',
        isCurrent: true,
        statusType: 'in_progress',
      },
      {
        id: 'hist-9021-2',
        referralId: '#REF-9021',
        title: 'Referral Received',
        timestamp: 'Oct 24, 10:00 AM',
        description: 'Received by Mercy General.',
        statusType: 'completed',
      },
      {
        id: 'hist-9021-3',
        referralId: '#REF-9021',
        title: 'Referral Sent',
        timestamp: 'Oct 24, 09:15 AM',
        description: 'Routed via secure network.',
        statusType: 'completed',
      },
      {
        id: 'hist-9021-4',
        referralId: '#REF-9021',
        title: 'Referral Created',
        timestamp: 'Oct 24, 09:00 AM',
        description: 'Initiated by Dr. Sarah Jenkins.',
        statusType: 'created',
      },
    ],
  },
  {
    id: 'ref-9020',
    referralId: '#REF-9020',
    patientId: 'PAT-38291',
    patientName: 'Marcus Aurelius',
    patientGender: 'Male',
    patientAge: 58,
    referringDoctorId: 'DOC-1029',
    referringDoctorName: 'Dr. Sarah Jenkins',
    referringDoctorSpecialty: 'Family Medicine',
    receivingDoctorId: 'DOC-5920',
    receivingDoctorName: 'Dr. Emily Watson',
    receivingDoctorSpecialty: 'Neurology',
    facilityId: 'FAC-02',
    hospitalName: 'City Hospital',
    specialty: 'Neurology',
    priority: 'Routine',
    date: 'Oct 23, 2023',
    createdAt: '2023-10-23T14:15:00Z',
    status: 'Accepted',
    clinicalReason: 'Chronic unilateral cluster headaches refractory to first-line triptans. MRI brain indicated.',
    notes: 'Neurological exam intact. Episodes occur twice monthly. Requested 3T cranial MRI mapping.',
    insuranceProvider: 'Aetna Select Gold',
    authorizationCode: 'AUTH-CT-81023',
    urgencyTimeline: 'Within 14 days',
  },
  {
    id: 'ref-9019',
    referralId: '#REF-9019',
    patientId: 'PAT-10492',
    patientName: 'Sophia Montgomery',
    patientGender: 'Female',
    patientAge: 34,
    referringDoctorId: 'DOC-2041',
    referringDoctorName: 'Dr. Robert Torres',
    referringDoctorSpecialty: 'Primary Care',
    receivingDoctorId: 'DOC-3092',
    receivingDoctorName: 'Dr. Julian Vance',
    receivingDoctorSpecialty: 'Orthopedics',
    facilityId: 'FAC-03',
    hospitalName: 'St. Jude Medical',
    specialty: 'Orthopedics',
    priority: 'Urgent',
    date: 'Oct 23, 2023',
    createdAt: '2023-10-23T11:00:00Z',
    status: 'Escalated',
    clinicalReason: 'Acute traumatic meniscal tear with joint effusion following athletic injury. Surgical consult required.',
    notes: 'Grade III medial meniscus complex tear confirmed via MRI. Significant joint lockage reported.',
    insuranceProvider: 'United Healthcare Choice',
    authorizationCode: 'AUTH-SJ-40291',
    urgencyTimeline: 'Immediate (24 hours)',
  },
  {
    id: 'ref-9018',
    referralId: '#REF-9018',
    patientId: 'PAT-55102',
    patientName: 'David K. Henderson',
    patientGender: 'Male',
    patientAge: 62,
    referringDoctorId: 'DOC-4019',
    referringDoctorName: 'Dr. Lisa Patel',
    referringDoctorSpecialty: 'Geriatrics',
    receivingDoctorId: 'DOC-7721',
    receivingDoctorName: 'Dr. Alan Morales',
    receivingDoctorSpecialty: 'Oncology',
    facilityId: 'FAC-01',
    hospitalName: 'Mercy General',
    specialty: 'Oncology',
    priority: 'High',
    date: 'Oct 22, 2023',
    createdAt: '2023-10-22T16:45:00Z',
    status: 'Accepted',
    clinicalReason: 'Pulmonary nodule biopsy confirmation and staging evaluation. Multidisciplinary tumor board review.',
    notes: 'CT chest revealed 2.4cm spiculated right upper lobe nodule. PET staging scheduled.',
    insuranceProvider: 'Medicare Part B Advantage',
    authorizationCode: 'AUTH-MG-77102',
    urgencyTimeline: 'Within 5 business days',
  },
  {
    id: 'ref-9017',
    referralId: '#REF-9017',
    patientId: 'PAT-20948',
    patientName: 'Clara Oswald',
    patientGender: 'Female',
    patientAge: 29,
    referringDoctorId: 'DOC-1029',
    referringDoctorName: 'Dr. Sarah Jenkins',
    referringDoctorSpecialty: 'Internal Medicine',
    receivingDoctorId: 'DOC-8830',
    receivingDoctorName: 'Dr. Fiona Gallagher',
    receivingDoctorSpecialty: 'Dermatology',
    facilityId: 'FAC-04',
    hospitalName: 'Metropolitan Health',
    specialty: 'Dermatology',
    priority: 'Routine',
    date: 'Oct 22, 2023',
    createdAt: '2023-10-22T10:20:00Z',
    status: 'Completed',
    clinicalReason: 'Atypical pigmented nevus on dorsal lumbar area. Dermoscopy and punch biopsy completed.',
    notes: 'Histopathology returned benign dysplastic nevus with clear margins. Routine 1-year follow-up.',
    insuranceProvider: 'Cigna HealthFlex',
    authorizationCode: 'AUTH-MH-33819',
    urgencyTimeline: 'Standard outpatient',
  },
  {
    id: 'ref-9016',
    referralId: '#REF-9016',
    patientId: 'PAT-77401',
    patientName: 'Lucas Davenport',
    patientGender: 'Male',
    patientAge: 51,
    referringDoctorId: 'DOC-3092',
    referringDoctorName: 'Dr. Julian Vance',
    referringDoctorSpecialty: 'Orthopedics',
    receivingDoctorId: 'DOC-9912',
    receivingDoctorName: 'Dr. Rebecca Stone',
    receivingDoctorSpecialty: 'Physical Medicine',
    facilityId: 'FAC-02',
    hospitalName: 'City Hospital',
    specialty: 'Physical Medicine',
    priority: 'Routine',
    date: 'Oct 21, 2023',
    createdAt: '2023-10-21T08:50:00Z',
    status: 'Completed',
    clinicalReason: 'Post-operative rehabilitation regimen following total hip arthroplasty.',
    notes: 'Completed 12 outpatient PT sessions. Full weight-bearing restored without pain.',
    insuranceProvider: 'BlueCross Anthem',
    authorizationCode: 'AUTH-CH-19402',
    urgencyTimeline: 'Standard rehabilitation',
  },
  {
    id: 'ref-9015',
    referralId: '#REF-9015',
    patientId: 'PAT-99201',
    patientName: 'Amelia Pond',
    patientGender: 'Female',
    patientAge: 31,
    referringDoctorId: 'DOC-5920',
    referringDoctorName: 'Dr. Emily Watson',
    referringDoctorSpecialty: 'Neurology',
    receivingDoctorId: 'DOC-4821',
    receivingDoctorName: 'Dr. Michael Chen',
    receivingDoctorSpecialty: 'Cardiology',
    facilityId: 'FAC-01',
    hospitalName: 'Mercy General',
    specialty: 'Cardiology',
    priority: 'Routine',
    date: 'Oct 20, 2023',
    createdAt: '2023-10-20T13:10:00Z',
    status: 'Cancelled',
    clinicalReason: 'Syncope workup. Patient relocated out of state prior to cardiology consultation.',
    notes: 'Referral cancelled by patient request on 10/21. Transferred records to regional provider in Boston.',
    insuranceProvider: 'Kaiser Permanente',
    authorizationCode: 'AUTH-KP-55109',
    urgencyTimeline: 'Cancelled by patient',
  },
  {
    id: 'ref-9014',
    referralId: '#REF-9014',
    patientId: 'PAT-33812',
    patientName: 'Gregory House',
    patientGender: 'Male',
    patientAge: 65,
    referringDoctorId: 'DOC-2041',
    referringDoctorName: 'Dr. Robert Torres',
    referringDoctorSpecialty: 'Family Medicine',
    receivingDoctorId: 'DOC-6610',
    receivingDoctorName: 'Dr. Daniel Cho',
    receivingDoctorSpecialty: 'Pulmonology',
    facilityId: 'FAC-05',
    hospitalName: 'Presbyterian General',
    specialty: 'Pulmonology',
    priority: 'High',
    date: 'Oct 20, 2023',
    createdAt: '2023-10-20T15:30:00Z',
    status: 'Pending',
    clinicalReason: 'Persistent chronic cough with hemoptysis and restrictive spirometry pattern.',
    notes: 'High-resolution chest CT requested. Bronchoscopy slot reserved pending intake triage.',
    insuranceProvider: 'Medicare Advantage',
    authorizationCode: 'AUTH-PG-82710',
    urgencyTimeline: 'Within 72 hours',
  },
  {
    id: 'ref-9013',
    referralId: '#REF-9013',
    patientId: 'PAT-41092',
    patientName: 'Hannah Abbott',
    patientGender: 'Female',
    patientAge: 27,
    referringDoctorId: 'DOC-4019',
    referringDoctorName: 'Dr. Lisa Patel',
    referringDoctorSpecialty: 'General Practice',
    receivingDoctorId: 'DOC-7721',
    receivingDoctorName: 'Dr. Alan Morales',
    receivingDoctorSpecialty: 'Endocrinology',
    facilityId: 'FAC-03',
    hospitalName: 'St. Jude Medical',
    specialty: 'Endocrinology',
    priority: 'Routine',
    date: 'Oct 19, 2023',
    createdAt: '2023-10-19T11:40:00Z',
    status: 'Accepted',
    clinicalReason: 'Uncontrolled Type 1 Diabetes Mellitus with recurrent hypoglycemia episodes.',
    notes: 'Continuous Glucose Monitor (CGM) sensor optimization and automated insulin delivery tuning needed.',
    insuranceProvider: 'Aetna Health HMO',
    authorizationCode: 'AUTH-SJ-99201',
    urgencyTimeline: 'Within 10 days',
  },
  {
    id: 'ref-9012',
    referralId: '#REF-9012',
    patientId: 'PAT-88192',
    patientName: 'Arthur Pendelton',
    patientGender: 'Male',
    patientAge: 73,
    referringDoctorId: 'DOC-1029',
    referringDoctorName: 'Dr. Sarah Jenkins',
    referringDoctorSpecialty: 'Internal Medicine',
    receivingDoctorId: 'DOC-3092',
    receivingDoctorName: 'Dr. Julian Vance',
    receivingDoctorSpecialty: 'Gastroenterology',
    facilityId: 'FAC-04',
    hospitalName: 'Metropolitan Health',
    specialty: 'Gastroenterology',
    priority: 'Urgent',
    date: 'Oct 19, 2023',
    createdAt: '2023-10-19T09:15:00Z',
    status: 'Escalated',
    clinicalReason: 'Severe iron deficiency anemia with occult gastrointestinal bleeding. Urgent colonoscopy required.',
    notes: 'Hemoglobin dropped to 7.8 g/dL. Fast-track endoscopy suite requested.',
    insuranceProvider: 'Humana Gold Plus',
    authorizationCode: 'AUTH-MH-66190',
    urgencyTimeline: 'Within 24 hours',
  },
  {
    id: 'ref-9011',
    referralId: '#REF-9011',
    patientId: 'PAT-19402',
    patientName: 'Victoria Sterling',
    patientGender: 'Female',
    patientAge: 42,
    referringDoctorId: 'DOC-2041',
    referringDoctorName: 'Dr. Robert Torres',
    referringDoctorSpecialty: 'Primary Care',
    receivingDoctorId: 'DOC-4821',
    receivingDoctorName: 'Dr. Michael Chen',
    receivingDoctorSpecialty: 'Cardiology',
    facilityId: 'FAC-01',
    hospitalName: 'Mercy General',
    specialty: 'Cardiology',
    priority: 'Routine',
    date: 'Oct 18, 2023',
    createdAt: '2023-10-18T14:00:00Z',
    status: 'Completed',
    clinicalReason: 'Annual pacemaker interrogation and cardiac rhythm evaluation.',
    notes: 'Battery life estimated at 6.8 years. Lead impedances and pacing thresholds within normal limits.',
    insuranceProvider: 'BlueCross Health Premier',
    authorizationCode: 'AUTH-MG-11029',
    urgencyTimeline: 'Routine maintenance',
  },
  {
    id: 'ref-9010',
    referralId: '#REF-9010',
    patientId: 'PAT-67109',
    patientName: 'Benjamin Franklin',
    patientGender: 'Male',
    patientAge: 68,
    referringDoctorId: 'DOC-5920',
    referringDoctorName: 'Dr. Emily Watson',
    referringDoctorSpecialty: 'Neurology',
    receivingDoctorId: 'DOC-8830',
    receivingDoctorName: 'Dr. Fiona Gallagher',
    receivingDoctorSpecialty: 'Ophthalmology',
    facilityId: 'FAC-05',
    hospitalName: 'Presbyterian General',
    specialty: 'Ophthalmology',
    priority: 'Routine',
    date: 'Oct 17, 2023',
    createdAt: '2023-10-17T10:15:00Z',
    status: 'Cancelled',
    clinicalReason: 'Visual field examination for optic neuropathy evaluation.',
    notes: 'Duplicate referral cancelled in favor of comprehensive neuro-ophthalmology clinic visit.',
    insuranceProvider: 'Medicare Advantage',
    authorizationCode: 'AUTH-PG-44019',
    urgencyTimeline: 'Consolidated into single visit',
  },
];

export function getStoredReferrals(): ReferralItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_REFERRAL_RECORDS));
      return INITIAL_REFERRAL_RECORDS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_REFERRAL_RECORDS));
      return INITIAL_REFERRAL_RECORDS;
    }
    // Enrich items with attachments, notesList, statusHistory, healthVaultId if missing
    const enriched = parsed.map((item: ReferralItem) => {
      const initial = INITIAL_REFERRAL_RECORDS.find(
        (r) => r.id === item.id || r.referralId === item.referralId
      );
      if (initial) {
        return {
          ...initial,
          ...item,
          patientName: item.patientName || initial.patientName,
          healthVaultId: item.healthVaultId || initial.healthVaultId,
          patientDob: item.patientDob || initial.patientDob,
          attachments: item.attachments && item.attachments.length > 0 ? item.attachments : initial.attachments,
          notesList: item.notesList && item.notesList.length > 0 ? item.notesList : initial.notesList,
          statusHistory: item.statusHistory && item.statusHistory.length > 0 ? item.statusHistory : initial.statusHistory,
        };
      }
      return item;
    });

    // Ensure Figma records exist in storage
    const has8842 = enriched.some((r: ReferralItem) => r.referralId === '#REF-8842');
    if (!has8842) {
      const merged = [
        ...INITIAL_REFERRAL_RECORDS.filter((r) => r.referralId === '#REF-8842' || r.referralId === '#REF-8839'),
        ...enriched,
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    return enriched;
  } catch (err) {
    console.warn('Failed to read referrals from localStorage', err);
    return INITIAL_REFERRAL_RECORDS;
  }
}

export function saveStoredReferrals(records: ReferralItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('Failed to save referrals to localStorage', err);
  }
}

/**
 * Filter and paginate referrals
 */
export async function fetchReferrals(
  filters: ReferralFilters = {},
  page: number = 1,
  pageSize: number = 10
): Promise<ReferralPaginatedResponse> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 80));

  const allRecords = getStoredReferrals();
  let filtered = [...allRecords];

  // Search filter
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (item) =>
        item.referralId.toLowerCase().includes(q) ||
        item.patientName.toLowerCase().includes(q) ||
        item.referringDoctorName.toLowerCase().includes(q) ||
        item.receivingDoctorName.toLowerCase().includes(q) ||
        item.hospitalName.toLowerCase().includes(q) ||
        item.specialty.toLowerCase().includes(q)
    );
  }

  // Priority filter
  if (filters.priority && filters.priority !== 'All' && filters.priority !== 'All Priorities') {
    filtered = filtered.filter(
      (item) => item.priority.toLowerCase() === filters.priority?.toLowerCase()
    );
  }

  // Hospital filter
  if (filters.hospital && filters.hospital !== 'All' && filters.hospital !== 'All Hospitals') {
    filtered = filtered.filter(
      (item) => item.hospitalName.toLowerCase() === filters.hospital?.toLowerCase()
    );
  }

  // Specialty filter
  if (filters.specialty && filters.specialty !== 'All' && filters.specialty !== 'All Specialties') {
    filtered = filtered.filter(
      (item) => item.specialty.toLowerCase() === filters.specialty?.toLowerCase()
    );
  }

  // Status filter
  if (filters.status && filters.status !== 'All' && filters.status !== 'All Statuses') {
    filtered = filtered.filter(
      (item) => item.status.toLowerCase() === filters.status?.toLowerCase()
    );
  }

  const totalCount = filtered.length;
  const startIndex = (page - 1) * pageSize;
  const items = filtered.slice(startIndex, startIndex + pageSize);

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

/**
 * Summary Stats matching Figma Reference values and live derived counts
 */
export async function fetchReferralSummaryStats(): Promise<ReferralSummaryStats> {
  await new Promise((resolve) => setTimeout(resolve, 60));

  // The Figma reference displays: 4,281; 124; 2,840; 1,154; 82; 81.
  return {
    totalReferrals: 4281,
    pending: 124,
    accepted: 2840,
    completed: 1154,
    cancelled: 82,
    escalated: 81,
  };
}

/**
 * Export filtered referrals as CSV file
 */
export function exportReferralsToCSV(records: ReferralItem[]): void {
  const headers = [
    'Referral ID',
    'Patient Name',
    'Patient ID',
    'Referring Doctor',
    'Receiving Doctor',
    'Hospital',
    'Specialty',
    'Priority',
    'Date',
    'Status',
    'Clinical Reason',
    'Insurance Provider',
    'Authorization Code',
  ];

  const rows = records.map((r) => [
    `"${r.referralId}"`,
    `"${r.patientName}"`,
    `"${r.patientId}"`,
    `"${r.referringDoctorName}"`,
    `"${r.receivingDoctorName}"`,
    `"${r.hospitalName}"`,
    `"${r.specialty}"`,
    `"${r.priority}"`,
    `"${r.date}"`,
    `"${r.status}"`,
    `"${(r.clinicalReason || '').replace(/"/g, '""')}"`,
    `"${r.insuranceProvider || ''}"`,
    `"${r.authorizationCode || ''}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `careid_referrals_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// TanStack Query Hooks
export function useReferralsQuery(
  filters: ReferralFilters,
  page: number = 1,
  pageSize: number = 10
) {
  return useQuery({
    queryKey: ['admin-referrals', filters, page, pageSize],
    queryFn: () => fetchReferrals(filters, page, pageSize),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useReferralStatsQuery() {
  return useQuery({
    queryKey: ['admin-referrals-stats'],
    queryFn: fetchReferralSummaryStats,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useUpdateReferralStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: ReferralStatus; notes?: string }) => {
      await new Promise((res) => setTimeout(res, 120));
      const records = getStoredReferrals();
      const updated = records.map((r) => (r.id === id ? { ...r, status, notes: notes || r.notes } : r));
      saveStoredReferrals(updated);
      return { success: true, id, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-referrals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-referrals-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-referrals-escalations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-referrals-sla-metrics'] });
    },
  });
}

// ----------------------------------------------------
// Monitoring & Critical Escalations Types and Hooks
// ----------------------------------------------------

export interface EscalationFilters {
  searchQuery?: string;
  hospital?: string;
  priority?: string;
  assignedAdmin?: string;
}

export interface ReferralSlaMetrics {
  pendingReferrals: number;
  pendingChangePercent: number; // e.g. -5%
  delayedReferrals: number;
  delayedChangePercent: number; // e.g. +12%
  avgCompletionTimeDays: number; // e.g. 4.2
  totalEscalations: number;
}

export interface HospitalDelayItem {
  id: string;
  name: string;
  shortName: string;
  count: number;
  heightPercent: number;
  color: string;
}

export interface SpecialtyDelayItem {
  specialty: string;
  count: number;
  percentage: number;
  color: string;
}

/**
 * Fetch Critical Escalations
 */
export async function fetchEscalatedReferrals(
  filters: EscalationFilters = {}
): Promise<ReferralItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  const allRecords = getStoredReferrals();

  // Filter for escalated or SLA-breached items
  let escalations = allRecords.filter(
    (item) => item.status === 'Escalated' || item.isSlaBreached === true
  );

  // If search query is present
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    escalations = escalations.filter(
      (item) =>
        item.referralId.toLowerCase().includes(q) ||
        item.patientName.toLowerCase().includes(q) ||
        item.hospitalName.toLowerCase().includes(q) ||
        (item.assignedAdmin && item.assignedAdmin.toLowerCase().includes(q)) ||
        item.priority.toLowerCase().includes(q) ||
        item.specialty.toLowerCase().includes(q)
    );
  }

  // Priority filter
  if (filters.priority && filters.priority !== 'All') {
    escalations = escalations.filter(
      (item) => item.priority.toLowerCase() === filters.priority?.toLowerCase()
    );
  }

  // Hospital filter
  if (filters.hospital && filters.hospital !== 'All') {
    escalations = escalations.filter(
      (item) => item.hospitalName.toLowerCase() === filters.hospital?.toLowerCase()
    );
  }

  // Assigned Admin filter
  if (filters.assignedAdmin && filters.assignedAdmin !== 'All') {
    if (filters.assignedAdmin === 'Unassigned') {
      escalations = escalations.filter((item) => !item.assignedAdmin || item.assignedAdmin === 'Unassigned');
    } else {
      escalations = escalations.filter(
        (item) => item.assignedAdmin?.toLowerCase() === filters.assignedAdmin?.toLowerCase()
      );
    }
  }

  return escalations;
}

/**
 * Fetch Operational SLA Metrics matching Figma reference
 */
export async function fetchReferralSlaMetrics(): Promise<ReferralSlaMetrics> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  return {
    pendingReferrals: 124,
    pendingChangePercent: -5,
    delayedReferrals: 42,
    delayedChangePercent: 12,
    avgCompletionTimeDays: 4.2,
    totalEscalations: 42,
  };
}

/**
 * Fetch Hospital Delay Volume Distribution matching Figma reference
 */
export async function fetchHospitalDelayStats(): Promise<HospitalDelayItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return [
    {
      id: 'hosp-1',
      name: 'Mercy General Hospital',
      shortName: 'Mercy Gen',
      count: 18,
      heightPercent: 80,
      color: '#28006d',
    },
    {
      id: 'hosp-2',
      name: 'St. Jude Medical Center',
      shortName: 'St. Jude',
      count: 14,
      heightPercent: 60,
      color: '#cfbdff',
    },
    {
      id: 'hosp-3',
      name: 'City Hospital Center',
      shortName: 'City Hosp',
      count: 9,
      heightPercent: 40,
      color: '#006a60',
    },
    {
      id: 'hosp-4',
      name: 'County Health Facility',
      shortName: 'County',
      count: 5,
      heightPercent: 20,
      color: '#fabd00',
    },
  ];
}

/**
 * Fetch Specialty Delay Distribution matching Figma reference
 */
export async function fetchSpecialtyDelayStats(): Promise<SpecialtyDelayItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return [
    { specialty: 'Cardiology', count: 19, percentage: 45, color: '#28006d' },
    { specialty: 'Neurology', count: 11, percentage: 25, color: '#006a60' },
    { specialty: 'Oncology', count: 8, percentage: 20, color: '#fabd00' },
    { specialty: 'Other', count: 4, percentage: 10, color: '#e1e2e4' },
  ];
}

/**
 * Export Critical Escalations to CSV
 */
export function exportEscalationsToCSV(records: ReferralItem[]): void {
  const headers = [
    'Ref ID',
    'Patient Name',
    'Current Hospital',
    'Delay Duration',
    'Priority',
    'Assigned Admin',
    'Specialty',
    'Status',
    'Urgency Timeline',
    'Clinical Reason',
  ];

  const rows = records.map((r) => [
    `"${r.referralId}"`,
    `"${r.patientName}"`,
    `"${r.hospitalName}"`,
    `"${r.delayDuration || 'N/A'}"`,
    `"${r.priority}"`,
    `"${r.assignedAdmin || 'Unassigned'}"`,
    `"${r.specialty}"`,
    `"${r.status}"`,
    `"${r.urgencyTimeline || ''}"`,
    `"${(r.clinicalReason || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `careid_escalations_report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// React Query Hooks for Escalations
export function useEscalatedReferralsQuery(filters: EscalationFilters = {}) {
  return useQuery({
    queryKey: ['admin-referrals-escalations', filters],
    queryFn: () => fetchEscalatedReferrals(filters),
    staleTime: 1000 * 30,
  });
}

export function useReferralSlaMetricsQuery() {
  return useQuery({
    queryKey: ['admin-referrals-sla-metrics'],
    queryFn: fetchReferralSlaMetrics,
    staleTime: 1000 * 60,
  });
}

export function useHospitalDelayStatsQuery() {
  return useQuery({
    queryKey: ['admin-referrals-hospital-delay-stats'],
    queryFn: fetchHospitalDelayStats,
    staleTime: 1000 * 60,
  });
}

export function useSpecialtyDelayStatsQuery() {
  return useQuery({
    queryKey: ['admin-referrals-specialty-delay-stats'],
    queryFn: fetchSpecialtyDelayStats,
    staleTime: 1000 * 60,
  });
}

export function useAssignAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assignedAdmin }: { id: string; assignedAdmin: string }) => {
      await new Promise((res) => setTimeout(res, 120));
      const records = getStoredReferrals();
      const updated = records.map((r) =>
        r.id === id ? { ...r, assignedAdmin } : r
      );
      saveStoredReferrals(updated);
      return { success: true, id, assignedAdmin };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-referrals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-referrals-escalations'] });
    },
  });
}

export function useResolveEscalationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      await new Promise((res) => setTimeout(res, 120));
      const records = getStoredReferrals();
      const updated = records.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'Accepted' as ReferralStatus,
              isSlaBreached: false,
              delayDuration: undefined,
              notes: notes ? `${r.notes ? r.notes + '\n' : ''}[SLA Resolved]: ${notes}` : r.notes,
            }
          : r
      );
      saveStoredReferrals(updated);
      return { success: true, id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-referrals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-referrals-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-referrals-escalations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-referrals-sla-metrics'] });
    },
  });
}

// ----------------------------------------------------
// Referral Details & Timeline Hooks and Utilities
// ----------------------------------------------------

/**
 * Fetch a single referral by id or referralId
 */
export async function fetchReferralById(id: string): Promise<ReferralItem | null> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  const records = getStoredReferrals();
  const cleanId = id.replace(/^#/, '').toLowerCase().trim();
  const found = records.find(
    (r) =>
      r.id.toLowerCase() === cleanId ||
      r.referralId.replace(/^#/, '').toLowerCase() === cleanId ||
      r.id.toLowerCase() === id.toLowerCase() ||
      r.referralId.toLowerCase() === id.toLowerCase()
  );
  if (!found) return null;

  return {
    ...found,
    attachments:
      found.attachments && found.attachments.length > 0
        ? found.attachments
        : [
            {
              id: `att-${found.id}-1`,
              referralId: found.referralId,
              attachmentId: `att-doc-${found.id}`,
              title: `${found.specialty || 'Clinical'} Referral Document`,
              fileType: 'PDF',
              fileSize: '1.4 MB',
              addedDate: found.date || 'Recent',
              attachedBy: found.referringDoctorName || 'Referring Physician',
              createdAt: found.createdAt || new Date().toISOString(),
            },
          ],
    notesList:
      found.notesList && found.notesList.length > 0
        ? found.notesList
        : [
            {
              id: `note-${found.id}-1`,
              referralId: found.referralId,
              authorId: 'usr-admin',
              authorName: 'Admin (System)',
              authorRole: 'System',
              noteText:
                found.notes ||
                'Referral intake verified. Clinical routing and department assignment established.',
              createdAt: `${found.date || 'Oct 24'}, 10:00 AM`,
            },
          ],
    statusHistory:
      found.statusHistory && found.statusHistory.length > 0
        ? found.statusHistory
        : [
            {
              id: `hist-${found.id}-1`,
              referralId: found.referralId,
              title: `${found.status} (In Review)`,
              timestamp: 'CURRENT STATUS',
              description: `Referral status: ${found.status}. Clinical triage and review active.`,
              isCurrent: true,
              statusType: 'in_progress',
            },
            {
              id: `hist-${found.id}-2`,
              referralId: found.referralId,
              title: 'Referral Received',
              timestamp: `${found.date || 'Oct 24'}, 09:30 AM`,
              description: `Received by ${found.hospitalName || 'Target Facility'}.`,
              statusType: 'completed',
            },
            {
              id: `hist-${found.id}-3`,
              referralId: found.referralId,
              title: 'Referral Created',
              timestamp: `${found.date || 'Oct 24'}, 09:00 AM`,
              description: `Initiated by ${found.referringDoctorName || 'Referring Doctor'}.`,
              statusType: 'created',
            },
          ],
  };
}

export function useReferralDetailsQuery(id?: string) {
  return useQuery({
    queryKey: ['admin-referral-detail', id],
    queryFn: () => (id ? fetchReferralById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  });
}

export function useAddReferralNoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      referralId,
      noteText,
      isPrivate = false,
    }: {
      referralId: string;
      noteText: string;
      isPrivate?: boolean;
    }) => {
      await new Promise((res) => setTimeout(res, 120));
      const records = getStoredReferrals();
      const cleanId = referralId.replace(/^#/, '').toLowerCase().trim();
      let updatedItem: ReferralItem | null = null;

      const updated = records.map((r) => {
        if (
          r.id.toLowerCase() === cleanId ||
          r.referralId.replace(/^#/, '').toLowerCase() === cleanId ||
          r.id.toLowerCase() === referralId.toLowerCase()
        ) {
          const newNote: ReferralNoteItem = {
            id: `note-${Date.now()}`,
            referralId: r.referralId,
            authorId: 'usr-admin',
            authorName: 'Admin (System)',
            authorRole: 'System',
            noteText,
            isPrivate,
            createdAt: new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
          const existingList = r.notesList || [];
          updatedItem = {
            ...r,
            notesList: [newNote, ...existingList],
            notes: `${noteText}\n${r.notes || ''}`.trim(),
          };
          return updatedItem;
        }
        return r;
      });

      saveStoredReferrals(updated);
      return { success: true, updatedItem };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-referrals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-referral-detail', variables.referralId] });
      queryClient.invalidateQueries({ queryKey: ['admin-referrals-escalations'] });
    },
  });
}

/**
 * Generate an authentic Referral Clinical Summary document (PDF/printable report)
 */
export function generateReferralSummaryDocument(referral: ReferralItem): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate and print the Referral PDF.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>CareID Referral Summary - ${referral.referralId}</title>
      <style>
        body { font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; margin: 40px; color: #191c1e; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #28006d; padding-bottom: 16px; margin-bottom: 24px; }
        .logo { font-size: 24px; font-weight: 800; color: #28006d; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: #e8ddff; color: #28006d; }
        .badge-priority { background: #ffdad6; color: #93000a; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .card { border: 1px solid #e1e2e4; border-radius: 12px; padding: 16px; }
        .card-title { font-size: 14px; font-weight: 700; color: #494552; text-transform: uppercase; margin-bottom: 8px; }
        .reason-box { background: #f2f4f6; border: 1px solid #e1e2e4; border-radius: 8px; padding: 14px; margin-top: 12px; }
        .timeline-item { border-left: 2px solid #006a60; padding-left: 14px; margin-bottom: 12px; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">CareID HealthVault</div>
          <div style="font-size: 13px; color: #494552;">Official Patient Clinical Referral Record</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: 700;">${referral.referralId}</div>
          <div class="badge">${referral.status}</div>
          ${referral.priority === 'High' || referral.priority === 'Urgent' ? '<div class="badge badge-priority">' + referral.priority + ' Priority</div>' : ''}
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="card-title">Patient Demographics</div>
          <div style="font-size: 16px; font-weight: 700;">${referral.patientName}</div>
          <div>Health Vault ID: <strong>${referral.healthVaultId || 'HV-' + referral.patientId}</strong></div>
          <div>${referral.patientGender || 'Unspecified'}, ${referral.patientAge ? referral.patientAge + ' yrs' : 'Age N/A'} • DOB: ${referral.patientDob || 'N/A'}</div>
          <div>Insurance: ${referral.insuranceProvider || 'Direct Clinical Care'} (Auth: ${referral.authorizationCode || 'N/A'})</div>
        </div>
        <div class="card">
          <div class="card-title">Clinical Routing</div>
          <div>Referring Provider: <strong>${referral.referringDoctorName}</strong> (${referral.referringDoctorSpecialty || 'General Practice'})</div>
          <div>Receiving Specialist: <strong>${referral.receivingDoctorName}</strong> (${referral.receivingDoctorSpecialty || referral.specialty})</div>
          <div>Facility: <strong>${referral.hospitalName}</strong> (${referral.specialty})</div>
          <div>Initiated Date: ${referral.date}</div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 24px;">
        <div class="card-title">Referral Reason & Clinical Intent</div>
        <div class="reason-box">
          ${referral.clinicalReason || 'Patient requires comprehensive clinical consultation and specialized diagnostic workup.'}
        </div>
      </div>

      ${referral.attachments && referral.attachments.length > 0 ? `
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-title">Attached Diagnostic Documents (${referral.attachments.length})</div>
        <ul>
          ${referral.attachments.map(a => `<li><strong>${a.title}</strong> — ${a.fileType} (${a.fileSize}) • Added ${a.addedDate}</li>`).join('')}
        </ul>
      </div>` : ''}

      ${referral.notesList && referral.notesList.length > 0 ? `
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-title">Operational Notes</div>
        ${referral.notesList.map(n => `<div style="margin-bottom: 8px;"><strong>${n.authorName}</strong> (${n.createdAt}): ${n.noteText}</div>`).join('')}
      </div>` : ''}

      <div style="margin-top: 32px; font-size: 11px; color: #7a7583; text-align: center; border-top: 1px solid #e1e2e4; padding-top: 16px;">
        Generated on ${new Date().toLocaleString()} via CareID Enterprise Health Administration Portal. Confirms SLA compliance status.
      </div>
      <div class="no-print" style="margin-top: 20px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 24px; background: #28006d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Print / Save to PDF</button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/* ==========================================================================
   Referral Audit Log Models & Service (Figma Node ID: 20:5535)
   ========================================================================== */

const AUDIT_STORAGE_KEY = 'careid_referral_audit_logs';

export type ReferralAuditAction =
  | 'Escalated'
  | 'Verified'
  | 'Modified'
  | 'Approved'
  | 'Created'
  | 'Cancelled';

export interface ReferralAuditLogItem {
  id: string;
  timestamp: string;
  timestampFormatted: string;
  userId: string;
  userRole?: string;
  action: ReferralAuditAction;
  fromStatus?: string;
  toStatus: string;
  ipAddress: string;
  pipColor?: 'red' | 'teal' | 'amber' | 'gray';
  referralId?: string;
  details?: string;
}

export interface AuditLogFilters {
  action?: string;
  userId?: string;
  searchQuery?: string;
}

export interface AuditLogPaginatedResponse {
  records: ReferralAuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function getStoredReferralAuditLogs(): ReferralAuditLogItem[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to read audit logs from localStorage', err);
    return [];
  }
}

export function saveStoredReferralAuditLogs(records: ReferralAuditLogItem[]): void {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('Failed to save audit logs to localStorage', err);
  }
}

export function recordReferralAuditEvent(
  event: Omit<ReferralAuditLogItem, 'id' | 'timestamp' | 'timestampFormatted'>
): ReferralAuditLogItem {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const formattedDate = `${months[now.getMonth()]} ${now.getDate()}, ${formattedTime}`;

  let pipColor: 'red' | 'teal' | 'amber' | 'gray' = 'teal';
  if (event.action === 'Escalated') pipColor = 'red';
  else if (event.action === 'Modified') pipColor = 'amber';
  else if (event.action === 'Approved') pipColor = 'teal';
  else if (event.action === 'Cancelled') pipColor = 'gray';

  const newRecord: ReferralAuditLogItem = {
    ...event,
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toISOString(),
    timestampFormatted: formattedDate,
    pipColor: event.pipColor || pipColor,
  };

  const existing = getStoredReferralAuditLogs();
  const updated = [newRecord, ...existing];
  saveStoredReferralAuditLogs(updated);
  return newRecord;
}

/**
 * Fetch and filter referral audit logs
 */
export async function fetchReferralAuditLogs(
  filters: AuditLogFilters = {},
  page: number = 1,
  pageSize: number = 10
): Promise<AuditLogPaginatedResponse> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 80));

  const allRecords = getStoredReferralAuditLogs();
  let filtered = [...allRecords];

  if (filters.action && filters.action !== 'All' && filters.action !== 'All Actions') {
    filtered = filtered.filter(
      (item) => item.action.toLowerCase() === filters.action?.toLowerCase()
    );
  }

  if (filters.userId && filters.userId !== 'All' && filters.userId !== 'All Users') {
    filtered = filtered.filter((item) => item.userId === filters.userId);
  }

  if (filters.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (item) =>
        item.userId.toLowerCase().includes(q) ||
        item.action.toLowerCase().includes(q) ||
        item.toStatus.toLowerCase().includes(q) ||
        (item.fromStatus && item.fromStatus.toLowerCase().includes(q)) ||
        item.ipAddress.toLowerCase().includes(q) ||
        (item.referralId && item.referralId.toLowerCase().includes(q)) ||
        (item.details && item.details.toLowerCase().includes(q))
    );
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedRecords = filtered.slice(startIndex, startIndex + pageSize);

  return {
    records: paginatedRecords,
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/**
 * Export audit records to CSV
 */
export function exportAuditLogsToCSV(records: ReferralAuditLogItem[]): void {
  const headers = ['Timestamp', 'User ID', 'Action', 'Status Change', 'IP Address', 'Referral ID'];
  const rows = records.map((r) => [
    `"${r.timestampFormatted.replace(/"/g, '""')}"`,
    `"${r.userId.replace(/"/g, '""')}"`,
    `"${r.action.replace(/"/g, '""')}"`,
    `"${(r.fromStatus ? `${r.fromStatus} -> ` : '') + r.toStatus}"`,
    `"${r.ipAddress.replace(/"/g, '""')}"`,
    `"${(r.referralId || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `referral_audit_log_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * TanStack Query Hook for referral audit trail
 */
export function useReferralAuditLogsQuery(
  filters: AuditLogFilters = {},
  page: number = 1,
  pageSize: number = 10,
  options: { refetchInterval?: number | false } = {}
) {
  return useQuery({
    queryKey: ['referralAuditLogs', filters, page, pageSize],
    queryFn: () => fetchReferralAuditLogs(filters, page, pageSize),
    refetchInterval: options.refetchInterval ?? false,
    staleTime: 5000,
  });
}

/**
 * TanStack Mutation Hook to record a new referral audit log event
 */
export function useRecordReferralAuditEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (event: Omit<ReferralAuditLogItem, 'id' | 'timestamp' | 'timestampFormatted'>) => {
      return recordReferralAuditEvent(event);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referralAuditLogs'] });
    },
  });
}


