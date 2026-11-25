import {
  MedicalRecordEntity,
  MedicalAttachmentEntity,
  AttachmentVersionEntity,
  MedicalRecordAuditLogEntity,
} from '../entities/medical-record.entity';

export interface IMedicalRecordRepository {
  // ─── Profile Lookup ───────────────────────────────────────────────────────
  findProfileByUserId(userId: string): Promise<{ id: string } | null>;
  findPatientProfileById(idOrUserId: string): Promise<{ id: string; userId: string } | null>;
  verifyDoctorAccessToPatient(doctorUserId: string, patientProfileId: string): Promise<boolean>;

  // ─── Medical Records ──────────────────────────────────────────────────────
  createRecord(patientProfileId: string, data: any): Promise<MedicalRecordEntity>;
  findRecordById(id: string, includeDeleted?: boolean): Promise<MedicalRecordEntity | null>;
  findRecordsByProfile(patientProfileId: string, includeArchived?: boolean): Promise<MedicalRecordEntity[]>;
  updateRecord(id: string, data: any): Promise<MedicalRecordEntity>;
  softDeleteRecord(id: string): Promise<void>;
  restoreRecord(id: string): Promise<MedicalRecordEntity>;
  searchRecords(patientProfileId: string, query: string): Promise<MedicalRecordEntity[]>;
  getTimeline(patientProfileId: string): Promise<any[]>;

  // ─── Medical Attachments ──────────────────────────────────────────────────
  createAttachment(data: any): Promise<MedicalAttachmentEntity>;
  updatePatientProfilePhoto(patientProfileId: string, photoUrl: string, photoKey?: string): Promise<void>;
  findAttachmentById(id: string, includeDeleted?: boolean): Promise<MedicalAttachmentEntity | null>;
  findAttachmentsByRecord(medicalRecordId: string, includeDeleted?: boolean): Promise<MedicalAttachmentEntity[]>;
  findAttachmentsByProfile(patientProfileId: string, includeDeleted?: boolean): Promise<MedicalAttachmentEntity[]>;
  updateAttachment(id: string, data: any): Promise<MedicalAttachmentEntity>;
  softDeleteAttachment(id: string): Promise<void>;
  restoreAttachment(id: string): Promise<MedicalAttachmentEntity>;

  // ─── Attachment Versions ──────────────────────────────────────────────────
  createAttachmentVersion(data: any): Promise<AttachmentVersionEntity>;
  findAttachmentVersions(attachmentId: string): Promise<AttachmentVersionEntity[]>;

  // ─── Intra-Op Clinical Workflow ──────────────────────────────────────────
  addProcedureToRecord(medicalRecordId: string, data: any): Promise<any>;
  addVitalSignsToRecord(medicalRecordId: string, data: any): Promise<any>;
  findEncounterById(encounterId: string): Promise<any | null>;

  // ─── Addenda ──────────────────────────────────────────────────────────────
  createAddendum(data: {
    medicalRecordId: string;
    authorDoctorId: string;
    authorName: string;
    addendumNotes: string;
    reason?: string;
  }): Promise<any>;
  findAddendaByRecordId(medicalRecordId: string): Promise<any[]>;

  // ─── Record Share Grants ──────────────────────────────────────────────────
  createShareGrant(data: {
    medicalRecordId: string;
    grantedByDoctorId: string;
    recipientType: string;
    recipientTarget: string;
    purpose: string;
    shareToken: string;
    expiresAt: Date;
  }): Promise<any>;
  findShareGrantByToken(shareToken: string): Promise<any | null>;
  findShareGrantsByRecordId(medicalRecordId: string): Promise<any[]>;
  revokeShareGrant(medicalRecordId: string, grantId: string): Promise<any | null>;
  incrementShareAccessCount(grantId: string): Promise<void>;

  // ─── Favorites ─────────────────────────────────────────────────────────────
  getFavoriteRecordIds(patientProfileId: string, userId: string): Promise<string[]>;
  setFavoriteRecord(recordId: string, userId: string, isFav: boolean): Promise<void>;

  // ─── Audit Logs ───────────────────────────────────────────────────────────
  createAuditLog(data: {
    medicalRecordId?: string;
    attachmentId?: string;
    action: string;
    performedBy?: string;
    details?: string;
  }): Promise<MedicalRecordAuditLogEntity>;
}
