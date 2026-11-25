import {
  PatientReferralEntity, ReferralNoteEntity, ReferralAttachmentEntity, ReferralStatusHistoryEntity,
} from '../entities/referral.entity';

export interface IReferralRepository {
  createReferral(data: any, callerUserId?: string): Promise<PatientReferralEntity>;
  findReferrals(filters: {
    patientId?: string;
    referringDoctorId?: string;
    receivingDoctorId?: string;
    receivingFacilityId?: string;
    facilityId?: string;
    doctorId?: string;
    status?: string;
    priority?: string;
    search?: string;
    q?: string;
    dateFrom?: string;
    fromDate?: string;
    dateTo?: string;
    toDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ data: PatientReferralEntity[]; total: number }>;

  findReferralById(id: string): Promise<PatientReferralEntity | null>;
  findReferralByNumber(referralNumber: string): Promise<PatientReferralEntity | null>;
  updateReferral(id: string, data: any): Promise<PatientReferralEntity>;
  updateReferralStatus(id: string, status: string, changedBy: string, reason?: string): Promise<PatientReferralEntity>;
  triageReferral(id: string, outcome: string, changedBy: string, receivingDoctorId?: string, reason?: string): Promise<PatientReferralEntity>;

  addNote(data: { referralId: string; authorId: string; authorRole: string; noteText: string; isPrivate?: boolean }): Promise<ReferralNoteEntity>;
  findNotes(referralId: string, includePrivate?: boolean): Promise<ReferralNoteEntity[]>;

  addAttachment(data: { referralId: string; attachmentId: string; attachedBy: string }): Promise<ReferralAttachmentEntity>;
  findAttachments(referralId: string): Promise<ReferralAttachmentEntity[]>;

  findStatusHistory(referralId: string): Promise<ReferralStatusHistoryEntity[]>;
  getDashboardStats(facilityId?: string): Promise<{
    totalReferrals: number;
    pendingTriageCount: number;
    acceptedCount: number;
    completedCount: number;
    avgCompletionTimeHours: number;
  }>;

  softDeleteReferral(id: string): Promise<PatientReferralEntity>;
  findPatientProfileIdByUserId(userId: string): Promise<string | null>;
  findPatientProfileByIdOrUserId?(idOrUserId: string): Promise<{ id: string; userId: string } | null>;
  findStaffFacilitiesByUserId(userId: string): Promise<{ primaryFacilityId: string; secondaryFacilityId?: string | null } | null>;
  validatePatientExists(patientId: string): Promise<boolean>;
  validateFacilityExists(facilityId: string): Promise<boolean>;
  validateDoctorExists(doctorId: string): Promise<boolean>;
  findDoctorProfileByUserId(userId: string): Promise<{ id: string; fullName: string } | null>;
  findDoctorActiveFacilityIds(doctorIdOrUserId: string): Promise<string[]>;
  isDoctorAffiliatedWithFacility(doctorIdOrUserId: string, facilityId: string): Promise<boolean>;
  findPatientSummary(patientId: string): Promise<any>;
  findDoctorSummary(doctorId: string): Promise<any>;
  findFacilitySummary(facilityId: string): Promise<any>;
  findPatientsSummaries?(patientIds: string[]): Promise<Map<string, any>>;
  findDoctorsSummaries?(doctorIds: string[]): Promise<Map<string, any>>;
  findFacilitiesSummaries?(facilityIds: string[]): Promise<Map<string, any>>;
}
