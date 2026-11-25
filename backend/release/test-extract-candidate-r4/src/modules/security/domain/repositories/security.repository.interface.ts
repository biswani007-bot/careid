import {
  SecurityConsentRecordEntity, EncryptionKeyEntity, RetentionPolicyEntity,
  SecurityIncidentEntity, SecurityPlatformAuditLogEntity, ComplianceReportEntity,
} from '../entities/security.entity';

export interface ISecurityRepository {
  // Consents
  createConsent(data: any): Promise<SecurityConsentRecordEntity>;
  findConsents(filters?: any, status?: string): Promise<{ data: SecurityConsentRecordEntity[]; total: number } | any>;
  findActiveConsents(patientId?: string): Promise<SecurityConsentRecordEntity[]>;
  findConsentById(id: string): Promise<SecurityConsentRecordEntity | null>;
  withdrawConsent(id: string): Promise<SecurityConsentRecordEntity>;
  confirmConsent(id: string): Promise<SecurityConsentRecordEntity>;
  validatePatientExists(patientId: string): Promise<boolean>;
  validateDoctorExists(doctorId: string): Promise<boolean>;
  validateFacilityExists(facilityId: string): Promise<boolean>;
  findPatientProfileByUserId(userId: string): Promise<any | null>;
  findDoctorProfileByUserId?(userId: string): Promise<any | null>;
  findStaffFacilitiesByUserId?(userId: string): Promise<any | null>;

  // Retention Policies
  createRetentionPolicy(data: any): Promise<RetentionPolicyEntity>;
  findRetentionPolicies(): Promise<RetentionPolicyEntity[]>;
  findRetentionPolicyById(id: string): Promise<RetentionPolicyEntity | null>;
  updateRetentionPolicy(id: string, data: any): Promise<RetentionPolicyEntity>;
  softDeleteRetentionPolicy(id: string): Promise<void>;

  // Security Incidents
  createIncident(data: any): Promise<SecurityIncidentEntity>;
  findIncidents(severity?: string, status?: string): Promise<SecurityIncidentEntity[]>;
  findIncidentById(id: string): Promise<SecurityIncidentEntity | null>;
  resolveIncident(id: string, resolvedBy: string): Promise<SecurityIncidentEntity>;

  // Encryption Keys
  findActiveEncryptionKey(): Promise<EncryptionKeyEntity | null>;
  createEncryptionKey(data: any): Promise<EncryptionKeyEntity>;
  rotateEncryptionKey(keyIdentifier: string): Promise<EncryptionKeyEntity>;

  // Compliance Reports
  createComplianceReport(data: any): Promise<ComplianceReportEntity>;
  findComplianceReports(): Promise<ComplianceReportEntity[]>;

  // Audit Logs
  createAuditLog(data: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    result?: string;
    details?: string;
  }): Promise<SecurityPlatformAuditLogEntity>;
  findAuditLogs(
    userIdOrFilters?: string | {
      userId?: string;
      resource?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
    resource?: string,
    limit?: number,
  ): Promise<SecurityPlatformAuditLogEntity[]>;

  // Security Stats Summary
  getSecurityDashboardStats(): Promise<{
    activeConsentsCount: number;
    activeRetentionPoliciesCount: number;
    openIncidentsCount: number;
    criticalIncidentsCount: number;
    activeEncryptionKeyVersion: number;
    complianceReportsCount: number;
    totalAuditLogsCount: number;
  }>;
}
