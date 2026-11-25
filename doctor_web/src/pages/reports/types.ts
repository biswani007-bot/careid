export type ReportType =
  | 'CBC Panel'
  | 'MRI Scan'
  | 'Consult Note'
  | 'Pathology'
  | 'Cardiac Biomarkers'
  | 'CT Angiography'
  | 'Comprehensive Metabolic Panel (CMP)';

export type ReportStatus = 'verified' | 'pending' | 'critical';

export type ReportPriority = 'routine' | 'urgent' | 'stat';

export interface CriticalFindingValue {
  name: string;
  value: number | string;
  unit: string;
  refRange: string;
  status: 'critical_high' | 'critical_low' | 'normal';
}

export interface ReportRecord {
  id: string;
  patientName: string;
  patientInitials: string;
  patientId: string;
  patientProfileId?: string;
  patientAge: number;
  patientGender: string;
  patientMrn: string;
  avatarUrl?: string;
  reportType: ReportType;
  hospital: string;
  createdDate: string;
  status: ReportStatus;
  priority: ReportPriority;
  receivedAgo: string;
  primaryDx: string;
  lastVisit: string;
  panelName: string;
  narrativeSummary: string;
  criticalValues?: CriticalFindingValue[];
  followUpWorkflow: {
    title: string;
    description: string;
    actions: string[];
  };
  reviewedAt?: string;
  reviewedBy?: string;
}
