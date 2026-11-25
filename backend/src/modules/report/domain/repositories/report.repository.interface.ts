import { MedicalReportEntity, ReportAttachmentEntity, ReportVersionEntity, ReportAuditLogEntity } from '../entities/report.entity';

export interface IReportRepository {
  findProfileByUserId(userId: string): Promise<{ id: string } | null>;
  findProfileById?(id: string): Promise<{ id: string; userId: string } | null>;

  createReport(data: any): Promise<MedicalReportEntity>;
  findReportById(id: string, includeDeleted?: boolean): Promise<MedicalReportEntity | null>;
  findReportsByProfile(patientProfileId: string, category?: string): Promise<MedicalReportEntity[]>;
  findAllReports?(category?: string, limit?: number): Promise<MedicalReportEntity[]>;
  updateReport(id: string, data: any): Promise<MedicalReportEntity>;
  softDeleteReport(id: string): Promise<void>;
  restoreReport(id: string): Promise<MedicalReportEntity>;

  searchReports(patientProfileId: string, query: string): Promise<MedicalReportEntity[]>;
  getCategoriesCount(patientProfileId: string): Promise<Record<string, number>>;
  getTimeline(patientProfileId: string): Promise<any[]>;

  createAttachment(reportId: string, data: any): Promise<ReportAttachmentEntity>;
  createReportVersion(data: any): Promise<ReportVersionEntity>;
  findReportVersions(medicalReportId: string): Promise<ReportVersionEntity[]>;

  createAuditLog(data: {
    medicalReportId: string;
    action: string;
    performedBy?: string;
    details?: string;
  }): Promise<ReportAuditLogEntity>;
}
