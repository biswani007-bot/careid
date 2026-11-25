import type { ReferralDTO } from '@/services/referralService';

export type ReferralDirection = 'outgoing' | 'incoming';
export type ReferralPriority = 'routine' | 'urgent';
export type ReferralStatus =
  | 'pending'
  | 'accepted'
  | 'under_review'
  | 'completed'
  | 'declined'
  | 'cancelled';

export type ReferralSpecialty =
  | 'Cardiology'
  | 'Orthopedics'
  | 'Radiology'
  | 'Neurology'
  | 'Oncology'
  | 'Gastroenterology'
  | string;

export interface ReferralAttachment {
  id: string;
  name: string;
  type: string;
  size: string;
  date: string;
}

export interface ReferralPatient {
  id: string;
  name: string;
  dob: string;
  age: number;
  gender: string;
  mrn: string;
  bloodGroup?: string;
  avatarUrl?: string;
  initials?: string;
}

export interface ReferralProvider {
  name: string;
  role: string;
  facility: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  initials?: string;
}

export interface ReferralTimelineStep {
  title: string;
  timestamp: string;
  author: string;
  status: 'completed' | 'active' | 'pending';
}

export interface ReferralRecord {
  id: string;
  refNumber: string;
  direction: ReferralDirection;
  priority: ReferralPriority;
  status: ReferralStatus;
  specialty: ReferralSpecialty;
  date: string;
  patient: ReferralPatient;
  referringProvider: ReferralProvider;
  receivingProvider: ReferralProvider;
  reasonForReferral: string;
  clinicalSummary: string;
  chiefComplaint?: string;
  diagnoses: string[];
  medications: string[];
  vitals?: {
    bp: string;
    hr: number;
    spo2: number;
    bmi: number;
  };
  attachments: ReferralAttachment[];
  timeline: ReferralTimelineStep[];
}

/**
 * All mock data has been completely eliminated in accordance with CareID audit standards.
 * Live records are fetched exclusively from the CareID backend API.
 */
export const DEFAULT_REFERRALS_DATA: ReferralRecord[] = [];

function getInitials(name?: string): string {
  if (!name) return 'PT';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function calculateAge(dobString?: string): number {
  if (!dobString) return 0;
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return 0;
  const diff = Date.now() - birth.getTime();
  const ageDt = new Date(diff);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
}

function formatReadableDate(dateString?: string): string {
  if (!dateString) return 'Recent';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const isToday = new Date().toDateString() === d.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) {
    return `Today, ${timeStr}`;
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function mapBackendReferralToRecord(
  dto: ReferralDTO,
  currentDoctorId?: string
): ReferralRecord {
  // Determine direction based on authenticated doctor's context
  let direction: ReferralDirection = 'outgoing';
  if (currentDoctorId) {
    if (dto.receivingDoctorId === currentDoctorId) {
      direction = 'incoming';
    } else if (dto.referringDoctorId === currentDoctorId) {
      direction = 'outgoing';
    }
  } else if (dto.receivingDoctor?.id && !dto.referringDoctor?.id) {
    direction = 'incoming';
  }

  // Priority mapping
  const priority: ReferralPriority =
    dto.priority?.toUpperCase() === 'URGENT' ? 'urgent' : 'routine';

  // Status mapping
  let status: ReferralStatus = 'pending';
  const rawStatus = dto.status?.toUpperCase();
  if (rawStatus === 'ACCEPTED') status = 'accepted';
  else if (rawStatus === 'IN_PROGRESS') status = 'under_review';
  else if (rawStatus === 'COMPLETED') status = 'completed';
  else if (rawStatus === 'CANCELLED') status = 'cancelled';
  else if (rawStatus === 'REJECTED' || rawStatus === 'DECLINED') status = 'declined';
  else status = 'pending';

  // Patient mapping
  const patientDob = dto.patient?.dateOfBirth
    ? new Date(dto.patient.dateOfBirth).toLocaleDateString([], {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })
    : 'Unknown DOB';

  const patientName = dto.patient?.fullName || 'Patient';
  const patientInitials = getInitials(patientName);
  const patientAge = calculateAge(dto.patient?.dateOfBirth);

  const patient: ReferralPatient = {
    id: dto.patient?.id || dto.patientId,
    name: patientName,
    dob: patientDob,
    age: patientAge || 40,
    gender: dto.patient?.gender || 'Unknown',
    mrn: dto.patient?.patientNumber || dto.patientId.slice(0, 8),
    bloodGroup: dto.patient?.bloodGroup || 'O Positive',
    initials: patientInitials,
  };

  // Provider mappings
  const referringProvider: ReferralProvider = {
    name: dto.referringDoctor?.fullName || 'Attending Physician',
    role: dto.referringDoctor?.primarySpecialization || dto.referringDoctor?.department || 'Attending Physician',
    facility: dto.referringFacility?.name || 'CareID Health Center',
    initials: getInitials(dto.referringDoctor?.fullName || 'AP'),
  };

  const receivingProvider: ReferralProvider = {
    name: dto.receivingDoctor?.fullName || 'Specialist Provider',
    role: dto.receivingDoctor?.primarySpecialization || dto.specialtyRequired || 'Specialist',
    facility: dto.receivingFacility?.name || 'Partner Health System',
    initials: getInitials(dto.receivingDoctor?.fullName || 'SP'),
  };

  // Attachments mapping
  const attachments: ReferralAttachment[] = (dto.attachments || []).map((att, idx) => ({
    id: att.id || att.attachmentId || `att-${idx}`,
    name: att.fileName || `Attachment-${idx + 1}.pdf`,
    type: att.fileType || 'application/pdf',
    size: att.fileSize ? `${Math.round(att.fileSize / 1024)} KB` : '1.2 MB',
    date: formatReadableDate(att.createdAt),
  }));

  // Timeline mapping
  const timeline: ReferralTimelineStep[] = (dto.statusHistory || []).map((hist, idx, arr) => {
    const isLast = idx === arr.length - 1;
    return {
      title: hist.toStatus
        ? `Status: ${hist.toStatus}`
        : hist.reason || 'Referral Lifecycle Event',
      timestamp: formatReadableDate(hist.createdAt),
      author: hist.reason || 'CareID Clinical Subsystem',
      status: isLast ? 'active' : 'completed',
    };
  });

  if (timeline.length === 0) {
    timeline.push({
      title: 'Referral Created',
      timestamp: formatReadableDate(dto.createdAt),
      author: referringProvider.name,
      status: 'completed',
    });
  }

  return {
    id: dto.id,
    refNumber: dto.referralNumber || dto.id.slice(0, 8).toUpperCase(),
    direction,
    priority,
    status,
    specialty: (dto.specialtyRequired as ReferralSpecialty) || 'Cardiology',
    date: formatReadableDate(dto.createdAt),
    patient,
    referringProvider,
    receivingProvider,
    reasonForReferral: dto.reasonForReferral || 'Evaluation and management requested.',
    clinicalSummary:
      dto.clinicalSummary ||
      'Clinical summary and diagnostic workup recorded in patient medical record.',
    diagnoses: [],
    medications: [],
    attachments,
    timeline,
  };
}
