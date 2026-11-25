/**
 * CareID Security & Compliance Service
 *
 * Implements genuine backend communication with https://360api.vnvision.in
 * following the authoritative Postman collection and live endpoints:
 * - Security Dashboard Summary: GET /api/v1/security/dashboard
 * - Security Incidents / Alerts: GET/POST /api/v1/security/incidents
 * - Resolve Security Incident: PUT /api/v1/security/incidents/:id/resolve
 * - Active KMS Key Metadata: GET /api/v1/security/keys/active
 * - Rotate KMS Encryption Key: POST /api/v1/security/keys/rotate
 * - Generate Compliance Report: POST /api/v1/security/compliance/report
 * - List Compliance Reports: GET /api/v1/security/compliance/reports
 * - Security Audit Logs: GET /api/v1/security/audit
 * - User Active Sessions: GET /api/v1/auth/sessions
 * - Terminate Specific Session: DELETE /api/v1/auth/sessions/:sessionId
 * - Terminate All Other Sessions: DELETE /api/v1/auth/sessions
 * - Comprehensive Audit Log Feed: GET /api/v1/admin/audit-logs
 */

import { apiClient, type ApiResponse } from './apiClient';

export interface SecurityDashboardData {
  activeConsentsCount: number;
  activeRetentionPoliciesCount: number;
  openIncidentsCount: number;
  criticalIncidentsCount: number;
  activeEncryptionKeyVersion: number;
  complianceReportsCount: number;
  totalAuditLogsCount: number;
}

export interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  reportedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KmsKeyMetadata {
  id: string;
  keyIdentifier: string;
  algorithm: string;
  version: number;
  status: string;
  activatedAt: string;
  createdAt: string;
}

export interface ComplianceReport {
  id: string;
  reportName: string;
  reportType: string;
  generatedBy?: string;
  generatedAt?: string;
  summary?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface UserSessionData {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  isCurrent?: boolean;
}

export interface SecurityAuditItem {
  id: string;
  action: string;
  userId?: string;
  userName?: string;
  resource?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface FullAdminProfile {
  id: string;
  email: string;
  phone: string;
  status: string;
  roles: string[];
  permissions: string[];
  createdAt?: string;
  updatedAt?: string;
  doctorProfileId?: string;
  fullName: string;
  designation: string;
  department: string;
  licenseNumber?: string;
}

export const securityService = {
  /**
   * Fetch authenticated administrator profile with claims & linked directory metadata
   * Verified endpoints: GET /api/v1/auth/me -> GET /api/v1/admin/users/:id -> GET /api/v1/doctors/:id
   */
  async getAdminProfile(): Promise<ApiResponse<FullAdminProfile>> {
    const meRes = await apiClient.get<any>('/api/v1/auth/me');
    if (!meRes.success || !meRes.data) {
      return meRes;
    }
    const me = meRes.data;
    let fullName = 'Super Admin';
    let designation = me.roles?.includes('SUPER_ADMIN') ? 'Super Administrator' : 'Administrator';
    let department = 'System Administration & Security';
    let createdAt = undefined;
    let updatedAt = undefined;
    let doctorProfileId = undefined;
    let licenseNumber = undefined;

    if (me.id) {
      try {
        const userRes = await apiClient.get<any>(`/api/v1/admin/users/${me.id}`);
        if (userRes.success && userRes.data) {
          createdAt = userRes.data.createdAt;
          updatedAt = userRes.data.updatedAt;
          doctorProfileId = userRes.data.doctorProfileId;

          if (doctorProfileId) {
            const docRes = await apiClient.get<any>(`/api/v1/doctors/${doctorProfileId}`);
            if (docRes.success && docRes.data) {
              fullName = docRes.data.fullName || fullName;
              if (docRes.data.department) {
                department = docRes.data.department;
              }
              if (docRes.data.primarySpecialization) {
                designation = `${docRes.data.primarySpecialization} Specialist / ${designation}`;
              }
              licenseNumber = docRes.data.licenseNumber;
            }
          }
        }
      } catch {
        // Non-blocking
      }
    }

    return {
      success: true,
      statusCode: 200,
      data: {
        id: me.id,
        email: me.email || 'superadmin@careid.test',
        phone: me.phone || '',
        status: me.status || 'ACTIVE',
        roles: me.roles || ['SUPER_ADMIN'],
        permissions: me.permissions || [],
        createdAt,
        updatedAt,
        doctorProfileId,
        fullName,
        designation,
        department,
        licenseNumber,
      }
    };
  },
  /**
   * Fetch Enterprise Security & Compliance Dashboard summary
   */
  async getDashboardSummary(): Promise<ApiResponse<SecurityDashboardData>> {
    return apiClient.get<SecurityDashboardData>('/api/v1/security/dashboard');
  },

  /**
   * List reported security incidents / alerts
   */
  async getIncidents(params?: {
    severity?: string;
    status?: string;
  }): Promise<ApiResponse<SecurityIncident[]>> {
    const query = new URLSearchParams();
    if (params?.severity) query.append('severity', params.severity);
    if (params?.status) query.append('status', params.status);

    const qs = query.toString();
    const url = `/api/v1/security/incidents${qs ? `?${qs}` : ''}`;
    return apiClient.get<SecurityIncident[]>(url);
  },

  /**
   * Report a new security incident
   */
  async reportIncident(payload: {
    title: string;
    description: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  }): Promise<ApiResponse<SecurityIncident>> {
    return apiClient.post<SecurityIncident>('/api/v1/security/incidents', payload);
  },

  /**
   * Mark a security incident as resolved
   */
  async resolveIncident(
    id: string,
    payload: { resolutionNotes: string }
  ): Promise<ApiResponse<SecurityIncident>> {
    return apiClient.put<SecurityIncident>(`/api/v1/security/incidents/${id}/resolve`, payload);
  },

  /**
   * Get active KMS encryption key metadata
   */
  async getActiveKey(): Promise<ApiResponse<KmsKeyMetadata>> {
    return apiClient.get<KmsKeyMetadata>('/api/v1/security/keys/active');
  },

  /**
   * Trigger KMS encryption key rotation
   */
  async rotateKey(payload?: { reason?: string }): Promise<ApiResponse<KmsKeyMetadata>> {
    return apiClient.post<KmsKeyMetadata>('/api/v1/security/keys/rotate', payload || {});
  },

  /**
   * Generate automated compliance assessment report
   */
  async generateComplianceReport(payload: {
    reportName: string;
    reportType: string;
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<ComplianceReport>> {
    return apiClient.post<ComplianceReport>('/api/v1/security/compliance/report', payload);
  },

  /**
   * List generated compliance reports
   */
  async getComplianceReports(): Promise<ApiResponse<ComplianceReport[]>> {
    return apiClient.get<ComplianceReport[]>('/api/v1/security/compliance/reports');
  },

  /**
   * List active sessions for authenticated user
   */
  async getActiveSessions(): Promise<ApiResponse<UserSessionData[]>> {
    return apiClient.get<UserSessionData[]>('/api/v1/auth/sessions');
  },

  /**
   * Terminate a specific active session
   */
  async terminateSession(sessionId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/v1/auth/sessions/${sessionId}`);
  },

  /**
   * Terminate all other active sessions
   */
  async terminateAllOtherSessions(): Promise<ApiResponse<void>> {
    return apiClient.delete<void>('/api/v1/auth/sessions');
  },

  /**
   * List security audit events
   */
  async getSecurityAuditLogs(params?: {
    userId?: string;
    resource?: string;
  }): Promise<ApiResponse<SecurityAuditItem[]>> {
    const query = new URLSearchParams();
    if (params?.userId) query.append('userId', params.userId);
    if (params?.resource) query.append('resource', params.resource);

    const qs = query.toString();
    const url = `/api/v1/security/audit${qs ? `?${qs}` : ''}`;
    return apiClient.get<SecurityAuditItem[]>(url);
  },

  /**
   * List comprehensive admin audit logs (100+ events) for telemetry feed
   */
  async getAuditLogs(params?: { limit?: number; offset?: number }): Promise<ApiResponse<any[]>> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));

    const qs = query.toString();
    const url = `/api/v1/admin/audit-logs${qs ? `?${qs}` : ''}`;
    return apiClient.get<any[]>(url);
  }
};

export default securityService;

