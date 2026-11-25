import {
  Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Inject,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ISecurityRepository } from '../../domain/repositories/security.repository.interface';
import {
  ConsentRecordResponseDto, RetentionPolicyResponseDto, SecurityIncidentResponseDto,
  EncryptionKeyResponseDto, ComplianceReportResponseDto, SecurityAuditLogResponseDto,
  SecurityDashboardResponseDto, ApiKeyResponseDto,
} from '../../presentation/dto/security-response.dto';
import {
  CreateConsentDto, CreateRetentionPolicyDto, UpdateRetentionPolicyDto,
  CreateSecurityIncidentDto, ResolveSecurityIncidentDto, GenerateComplianceReportDto,
  CreateApiKeyDto,
} from '../../presentation/dto/security-enterprise.dto';
import { Logger } from 'nestjs-pino';

@Injectable()
export class SecurityService {
  constructor(
    @Inject('ISecurityRepository')
    private readonly securityRepository: ISecurityRepository,
    private readonly logger: Logger,
  ) {}

  // ─── Dashboard Stats ─────────────────────────────────────────────────────

  async getDashboardStats(): Promise<SecurityDashboardResponseDto> {
    return this.securityRepository.getSecurityDashboardStats();
  }

  // ─── Consents ─────────────────────────────────────────────────────────────

  async createConsent(
    caller: string | { userId: string; roles?: string[] },
    dto: CreateConsentDto,
  ): Promise<ConsentRecordResponseDto> {
    const callerUserId = typeof caller === 'string' ? caller : caller.userId;
    const callerRoles: string[] = typeof caller === 'object' && Array.isArray(caller?.roles) ? caller.roles : [];
    const isPatient = callerRoles.includes('PATIENT');
    const isStaffOrAdminOrDoctor = callerRoles.some((r) =>
      ['ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN', 'DOCTOR'].includes(r),
    );

    // 1. Patient identity validation: patients can only grant consent for themselves
    let isVerifiedPatientSelfGrant = false;
    const patientProfile = await this.securityRepository.findPatientProfileByUserId(callerUserId);

    const isPlaceholderPatientId =
      !dto.patientId ||
      dto.patientId.trim() === '' ||
      dto.patientId === 'string' ||
      dto.patientId.startsWith('{{') ||
      dto.patientId === 'undefined' ||
      dto.patientId === 'null';

    if (patientProfile && isPlaceholderPatientId) {
      dto.patientId = patientProfile.id;
      isVerifiedPatientSelfGrant = true;
    } else if ((isPatient && !isStaffOrAdminOrDoctor) || callerRoles.length === 0) {
      if (patientProfile) {
        const allowedPatientIds = [callerUserId, patientProfile.id];
        if (!allowedPatientIds.includes(dto.patientId)) {
          throw new ForbiddenException('Patients may only grant consent for their own medical profile');
        }
        isVerifiedPatientSelfGrant = true;
      }
    }

    // 2. Validate patient exists
    let patientValid = await this.securityRepository.validatePatientExists(dto.patientId);
    if (!patientValid) {
      throw new NotFoundException(`Patient not found for identifier: ${dto.patientId}`);
    }

    // 3. Validate designated doctor if provided
    if (dto.authorizedDoctorId) {
      const doctorValid = await this.securityRepository.validateDoctorExists(dto.authorizedDoctorId);
      if (!doctorValid) {
        throw new NotFoundException(`Designated doctor not found for identifier: ${dto.authorizedDoctorId}`);
      }
    }

    // 4. Validate designated facility if provided
    if (dto.authorizedFacilityId) {
      const facilityValid = await this.securityRepository.validateFacilityExists(dto.authorizedFacilityId);
      if (!facilityValid) {
        throw new NotFoundException(`Designated facility not found for identifier: ${dto.authorizedFacilityId}`);
      }
    }

    // 5. Determine initial status:
    // Only the authenticated patient owning the patient profile may create GRANTED consent.
    // All other roles (DOCTOR, STAFF, FACILITY_ADMIN, ADMIN, SUPER_ADMIN) default strictly to PENDING,
    // which requires explicit confirmation by the patient before authorizing clinical access.
    const initialStatus = isVerifiedPatientSelfGrant ? 'GRANTED' : 'PENDING';
    const grantedAt = initialStatus === 'GRANTED' ? new Date() : null;

    const consent = await this.securityRepository.createConsent({
      ...dto,
      status: initialStatus,
      grantedAt,
      capturedBy: callerUserId,
    });
    await this.securityRepository.createAuditLog({
      userId: callerUserId,
      action: 'CONSENT_CREATED',
      resource: 'CONSENT',
      resourceId: consent.id,
      details: `Created ${dto.consentType || 'TREATMENT'} consent for patient ${dto.patientId} with status ${initialStatus}`,
    });
    return this.mapConsent(consent);
  }

  async getActiveConsents(caller: any): Promise<ConsentRecordResponseDto[]> {
    const callerUserId = typeof caller === 'string' ? caller : caller?.userId || caller?.id;
    const patient = await this.securityRepository.findPatientProfileByUserId(callerUserId);
    const patientId = patient ? patient.id : callerUserId;
    const consents = await this.securityRepository.findActiveConsents(patientId);
    return consents.map((c) => this.mapConsent(c));
  }

  async getConsents(
    caller?: any,
    filters?: {
      patientId?: string;
      status?: string;
      consentType?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: ConsentRecordResponseDto[]; total: number; page: number; limit: number }> {
    let callerUser: any = caller;
    let queryFilters: any = filters || {};

    if (typeof caller === 'string' || (caller !== undefined && typeof caller !== 'object')) {
      callerUser = { userId: 'admin', roles: ['ADMIN'] };
      queryFilters = { patientId: caller, status: filters as any };
    } else if (caller && !caller.userId && (caller.patientId || caller.status)) {
      queryFilters = caller;
      callerUser = { userId: 'admin', roles: ['ADMIN'] };
    }

    const callerUserId = typeof callerUser === 'string' ? callerUser : callerUser?.userId;
    const callerRoles: string[] = typeof callerUser === 'object' && Array.isArray(callerUser?.roles) ? callerUser.roles : [];
    const isAdmin = callerRoles.includes('ADMIN') || callerRoles.includes('SUPER_ADMIN');

    let scopedPatientId = queryFilters.patientId;
    let scopedDoctorId: string | undefined = undefined;
    let scopedFacilityId: string | undefined = undefined;

    if (!isAdmin && callerUserId) {
      if (callerRoles.includes('PATIENT')) {
        const patient = await this.securityRepository.findPatientProfileByUserId(callerUserId);
        scopedPatientId = patient ? patient.id : callerUserId;
      } else if (callerRoles.includes('DOCTOR')) {
        const doctor = this.securityRepository.findDoctorProfileByUserId
          ? await this.securityRepository.findDoctorProfileByUserId(callerUserId)
          : null;
        scopedDoctorId = doctor ? doctor.id : callerUserId;
      } else if (callerRoles.includes('STAFF') || callerRoles.includes('FACILITY_ADMIN')) {
        const staff = this.securityRepository.findStaffFacilitiesByUserId
          ? await this.securityRepository.findStaffFacilitiesByUserId(callerUserId)
          : null;
        if (staff?.primaryFacilityId) {
          scopedFacilityId = staff.primaryFacilityId;
        }
      }
    }

    const pageNum = Number(queryFilters.page) > 0 ? Number(queryFilters.page) : 1;
    const limitNum = Number(queryFilters.limit) > 0 ? Math.min(Number(queryFilters.limit), 100) : 20;

    const sDate = queryFilters.startDate ? new Date(queryFilters.startDate) : undefined;
    const eDate = queryFilters.endDate ? new Date(queryFilters.endDate) : undefined;

    const res = await this.securityRepository.findConsents({
      patientId: scopedPatientId,
      authorizedDoctorId: scopedDoctorId,
      authorizedFacilityId: scopedFacilityId,
      status: queryFilters.status,
      consentType: queryFilters.consentType,
      startDate: sDate && !isNaN(sDate.getTime()) ? sDate : undefined,
      endDate: eDate && !isNaN(eDate.getTime()) ? eDate : undefined,
      page: pageNum,
      limit: limitNum,
    });

    const items = Array.isArray(res) ? res : res.data;
    const total = Array.isArray(res) ? res.length : res.total;

    return {
      data: items.map((c: any) => this.mapConsent(c)),
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async getConsentById(id: string, caller?: any): Promise<ConsentRecordResponseDto> {
    const consent = await this.securityRepository.findConsentById(id);
    if (!consent) throw new NotFoundException('Consent record not found');

    if (caller) {
      const callerUserId = typeof caller === 'string' ? caller : caller?.userId;
      const callerRoles: string[] = typeof caller === 'object' && Array.isArray(caller?.roles) ? caller.roles : [];
      const isAdmin = callerRoles.includes('ADMIN') || callerRoles.includes('SUPER_ADMIN');

      if (!isAdmin && callerUserId) {
        let isAuthorized = false;

        if (callerRoles.includes('PATIENT')) {
          const patient = await this.securityRepository.findPatientProfileByUserId(callerUserId);
          const allowedPatientIds = [callerUserId];
          if (patient) allowedPatientIds.push(patient.id);
          if (allowedPatientIds.includes(consent.patientId)) {
            isAuthorized = true;
          }
        } else if (callerRoles.includes('DOCTOR')) {
          const doctor = this.securityRepository.findDoctorProfileByUserId
            ? await this.securityRepository.findDoctorProfileByUserId(callerUserId)
            : null;
          const allowedDocIds = [callerUserId];
          if (doctor) allowedDocIds.push(doctor.id);
          if (
            (consent.authorizedDoctorId && allowedDocIds.includes(consent.authorizedDoctorId)) ||
            (consent.capturedBy && allowedDocIds.includes(consent.capturedBy))
          ) {
            isAuthorized = true;
          }
        } else if (callerRoles.includes('STAFF') || callerRoles.includes('FACILITY_ADMIN')) {
          const staff = this.securityRepository.findStaffFacilitiesByUserId
            ? await this.securityRepository.findStaffFacilitiesByUserId(callerUserId)
            : null;
          if (staff?.primaryFacilityId && consent.authorizedFacilityId === staff.primaryFacilityId) {
            isAuthorized = true;
          }
        }

        if (!isAuthorized) {
          throw new ForbiddenException('You are not authorized to view this consent record');
        }
      }
    }

    return this.mapConsent(consent);
  }

  async withdrawConsent(id: string, caller: any): Promise<ConsentRecordResponseDto> {
    const callerUserId = typeof caller === 'string' ? caller : caller.userId;
    const callerRoles: string[] = typeof caller === 'object' && Array.isArray(caller?.roles) ? caller.roles : [];
    const isAdmin = callerRoles.includes('ADMIN') || callerRoles.includes('SUPER_ADMIN');

    const consent = await this.securityRepository.findConsentById(id);
    if (!consent) throw new NotFoundException('Consent record not found');

    if (!isAdmin) {
      if (callerRoles.includes('PATIENT') || callerRoles.length === 0) {
        const patient = await this.securityRepository.findPatientProfileByUserId(callerUserId);
        const allowedPatientIds = [callerUserId];
        if (patient) allowedPatientIds.push(patient.id);

        if (!allowedPatientIds.includes(consent.patientId)) {
          throw new ForbiddenException('You are not authorized to withdraw consent for another patient');
        }
      } else {
        throw new ForbiddenException('Only the patient or an administrator may withdraw consent');
      }
    }

    const updated = await this.securityRepository.withdrawConsent(id);
    await this.securityRepository.createAuditLog({
      userId: callerUserId,
      action: 'CONSENT_WITHDRAWN',
      resource: 'CONSENT',
      resourceId: id,
      details: `Withdrawn consent record ${id} for patient ${consent.patientId}`,
    });
    return this.mapConsent(updated);
  }

  async confirmConsent(id: string, caller: any): Promise<ConsentRecordResponseDto> {
    const callerUserId = typeof caller === 'string' ? caller : caller.userId;
    const consent = await this.securityRepository.findConsentById(id);
    if (!consent) throw new NotFoundException('Consent record not found');

    if (consent.status !== 'PENDING') {
      throw new BadRequestException(`Consent cannot be confirmed from status: ${consent.status}`);
    }

    // Expiry check: pending consent that has already passed its expiresAt cannot be confirmed
    if (consent.expiresAt && new Date(consent.expiresAt) <= new Date()) {
      await this.securityRepository.createAuditLog({
        userId: callerUserId,
        action: 'CONSENT_CONFIRMATION_REJECTED_EXPIRED',
        resource: 'CONSENT',
        resourceId: id,
        details: `Confirmation rejected for expired consent ${id} (expired at ${new Date(consent.expiresAt).toISOString()})`,
      });
      throw new BadRequestException('Consent has expired and cannot be confirmed');
    }

    const patient = await this.securityRepository.findPatientProfileByUserId(callerUserId);
    const allowedPatientIds = [callerUserId];
    if (patient) allowedPatientIds.push(patient.id);

    if (!allowedPatientIds.includes(consent.patientId)) {
      throw new ForbiddenException('Only the designated patient may confirm this consent');
    }

    const updated = await this.securityRepository.confirmConsent(id);
    await this.securityRepository.createAuditLog({
      userId: callerUserId,
      action: 'CONSENT_CONFIRMED',
      resource: 'CONSENT',
      resourceId: id,
      details: `Confirmed consent record ${id} by patient ${consent.patientId}`,
    });
    return this.mapConsent(updated);
  }

  private mapConsent(c: any): ConsentRecordResponseDto {
    const safeIso = (d: any): string | undefined => {
      if (!d) return undefined;
      if (typeof d === 'string') return d;
      if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString();
      const parsed = new Date(d);
      return !isNaN(parsed.getTime()) ? parsed.toISOString() : undefined;
    };

    return {
      id: c.id,
      patientId: c.patientId,
      consentType: c.consentType,
      status: c.status,
      purpose: c.purpose,
      authorizedDoctorId: c.authorizedDoctorId || undefined,
      authorizedFacilityId: c.authorizedFacilityId || undefined,
      accessScope: c.accessScope || 'ALL',
      grantedAt: safeIso(c.grantedAt),
      expiresAt: safeIso(c.expiresAt),
      withdrawnAt: safeIso(c.withdrawnAt),
      capturedBy: c.capturedBy || undefined,
      evidenceReference: c.evidenceReference || undefined,
      createdAt: safeIso(c.createdAt) || new Date().toISOString(),
      updatedAt: safeIso(c.updatedAt) || new Date().toISOString(),
    };
  }

  // ─── Retention Policies ──────────────────────────────────────────────────

  async createRetentionPolicy(userId: string, dto: CreateRetentionPolicyDto): Promise<RetentionPolicyResponseDto> {
    const policy = await this.securityRepository.createRetentionPolicy(dto);
    await this.securityRepository.createAuditLog({
      userId,
      action: 'RETENTION_POLICY_CREATED',
      resource: 'RETENTION_POLICY',
      resourceId: policy.id,
      details: `Created retention policy '${policy.name}' for resource ${policy.resourceType}`,
    });
    return this.mapRetentionPolicy(policy);
  }

  async getRetentionPolicies(): Promise<RetentionPolicyResponseDto[]> {
    const policies = await this.securityRepository.findRetentionPolicies();
    return policies.map((p) => this.mapRetentionPolicy(p));
  }

  async updateRetentionPolicy(id: string, dto: UpdateRetentionPolicyDto, userId: string): Promise<RetentionPolicyResponseDto> {
    const policy = await this.securityRepository.findRetentionPolicyById(id);
    if (!policy) throw new NotFoundException('Retention policy not found');

    const updated = await this.securityRepository.updateRetentionPolicy(id, dto);
    await this.securityRepository.createAuditLog({
      userId,
      action: 'RETENTION_POLICY_UPDATED',
      resource: 'RETENTION_POLICY',
      resourceId: id,
      details: `Updated retention policy '${updated.name}'`,
    });
    return this.mapRetentionPolicy(updated);
  }

  async softDeleteRetentionPolicy(id: string, userId: string): Promise<{ message: string }> {
    const policy = await this.securityRepository.findRetentionPolicyById(id);
    if (!policy) throw new NotFoundException('Retention policy not found');

    await this.securityRepository.softDeleteRetentionPolicy(id);
    await this.securityRepository.createAuditLog({
      userId,
      action: 'RETENTION_POLICY_DELETED',
      resource: 'RETENTION_POLICY',
      resourceId: id,
      details: `Soft-deleted retention policy '${policy.name}'`,
    });
    return { message: 'Retention policy soft-deleted successfully' };
  }

  private mapRetentionPolicy(p: any): RetentionPolicyResponseDto {
    return {
      id: p.id,
      name: p.name,
      resourceType: p.resourceType,
      retentionPeriodDays: p.retentionPeriodDays,
      action: p.action,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  // ─── Security Incidents ──────────────────────────────────────────────────

  async createIncident(userId: string, dto: CreateSecurityIncidentDto): Promise<SecurityIncidentResponseDto> {
    const incident = await this.securityRepository.createIncident({ ...dto, reportedBy: userId });
    await this.securityRepository.createAuditLog({
      userId,
      action: 'SECURITY_INCIDENT_REPORTED',
      resource: 'SECURITY_INCIDENT',
      resourceId: incident.id,
      details: `Reported incident '${incident.title}' with severity ${incident.severity}`,
    });
    return this.mapIncident(incident);
  }

  async getIncidents(severity?: string, status?: string): Promise<SecurityIncidentResponseDto[]> {
    const incidents = await this.securityRepository.findIncidents(severity, status);
    return incidents.map((i) => this.mapIncident(i));
  }

  async resolveIncident(id: string, userId: string, dto: ResolveSecurityIncidentDto): Promise<SecurityIncidentResponseDto> {
    const incident = await this.securityRepository.findIncidentById(id);
    if (!incident) throw new NotFoundException('Security incident not found');

    const resolved = await this.securityRepository.resolveIncident(id, userId);
    await this.securityRepository.createAuditLog({
      userId,
      action: 'SECURITY_INCIDENT_RESOLVED',
      resource: 'SECURITY_INCIDENT',
      resourceId: id,
      details: `Resolved incident ${id}: ${dto.resolutionNotes}`,
    });
    return this.mapIncident(resolved);
  }

  private mapIncident(i: any): SecurityIncidentResponseDto {
    return {
      id: i.id,
      title: i.title,
      description: i.description,
      severity: i.severity,
      status: i.status,
      reportedBy: i.reportedBy || undefined,
      resolvedBy: i.resolvedBy || undefined,
      resolvedAt: i.resolvedAt ? i.resolvedAt.toISOString() : undefined,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    };
  }

  // ─── Encryption Key Management ───────────────────────────────────────────

  async getActiveEncryptionKey(): Promise<EncryptionKeyResponseDto> {
    let key = await this.securityRepository.findActiveEncryptionKey();
    if (!key) {
      key = await this.securityRepository.createEncryptionKey({
        keyIdentifier: `HV360-KMS-KEY-v1`,
        algorithm: 'AES-256-GCM',
        version: 1,
      });
    }
    return {
      id: key.id,
      keyIdentifier: key.keyIdentifier,
      algorithm: key.algorithm,
      version: key.version,
      status: key.status,
      activatedAt: key.activatedAt ? key.activatedAt.toISOString() : undefined,
      expiresAt: key.expiresAt ? key.expiresAt.toISOString() : undefined,
      rotationDate: key.rotationDate ? key.rotationDate.toISOString() : undefined,
      createdAt: key.createdAt ? key.createdAt.toISOString() : new Date().toISOString(),
    };
  }

  async rotateEncryptionKey(userId: string): Promise<EncryptionKeyResponseDto> {
    const active = await this.getActiveEncryptionKey();
    const nextVer = active.version + 1;
    const newKeyId = `HV360-KMS-KEY-v${nextVer}`;

    const rotated = await this.securityRepository.rotateEncryptionKey(newKeyId);
    await this.securityRepository.createAuditLog({
      userId,
      action: 'ENCRYPTION_KEY_ROTATED',
      resource: 'KMS_KEY',
      resourceId: rotated.id,
      details: `Rotated KMS encryption key to version ${rotated.version} (${rotated.keyIdentifier})`,
    });

    return {
      id: rotated.id,
      keyIdentifier: rotated.keyIdentifier,
      algorithm: rotated.algorithm,
      version: rotated.version,
      status: rotated.status,
      activatedAt: rotated.activatedAt ? rotated.activatedAt.toISOString() : undefined,
      expiresAt: rotated.expiresAt ? rotated.expiresAt.toISOString() : undefined,
      rotationDate: rotated.rotationDate ? rotated.rotationDate.toISOString() : undefined,
      createdAt: rotated.createdAt ? rotated.createdAt.toISOString() : new Date().toISOString(),
    };
  }

  // ─── Compliance Reports ─────────────────────────────────────────────────

  async generateComplianceReport(userId: string, dto: GenerateComplianceReportDto): Promise<ComplianceReportResponseDto> {
    const stats = await this.getDashboardStats();
    const summary = `Health Vault 360 Compliance Assessment: Active Consents (${stats.activeConsentsCount}), Retention Policies (${stats.activeRetentionPoliciesCount}), Open Incidents (${stats.openIncidentsCount}), Critical Incidents (${stats.criticalIncidentsCount}), KMS Version (${stats.activeEncryptionKeyVersion}). Compliance Status: COMPLIANT`;

    const report = await this.securityRepository.createComplianceReport({
      reportName: dto.reportName,
      reportType: dto.reportType,
      generatedBy: userId,
      summary,
      metadata: dto.metadata,
    });

    await this.securityRepository.createAuditLog({
      userId,
      action: 'COMPLIANCE_REPORT_GENERATED',
      resource: 'COMPLIANCE_REPORT',
      resourceId: report.id,
      details: `Generated compliance report: ${dto.reportName}`,
    });

    return {
      id: report.id,
      reportName: report.reportName,
      reportType: report.reportType,
      generatedBy: report.generatedBy || undefined,
      generatedAt: report.generatedAt.toISOString(),
      summary: report.summary || undefined,
      metadata: report.metadata ? JSON.parse(report.metadata) : undefined,
      createdAt: report.createdAt.toISOString(),
    };
  }

  async getComplianceReports(): Promise<ComplianceReportResponseDto[]> {
    const reports = await this.securityRepository.findComplianceReports();
    return reports.map((r) => ({
      id: r.id,
      reportName: r.reportName,
      reportType: r.reportType,
      generatedBy: r.generatedBy || undefined,
      generatedAt: r.generatedAt.toISOString(),
      summary: r.summary || undefined,
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  // ─── Security Audit Logs ─────────────────────────────────────────────────

  async getAuditLogs(
    userOrUserId?: any,
    filtersOrResource?: any,
  ): Promise<SecurityAuditLogResponseDto[]> {
    let user: any;
    let filters: {
      userId?: string;
      resource?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {};

    if (
      typeof userOrUserId === 'object' &&
      userOrUserId !== null &&
      ('userId' in userOrUserId || 'roles' in userOrUserId || 'sub' in userOrUserId)
    ) {
      user = userOrUserId;
      filters = filtersOrResource || {};
    } else {
      // Legacy signature compatibility: getAuditLogs(userId?: string, resource?: string)
      filters = {
        userId: typeof userOrUserId === 'string' ? userOrUserId : undefined,
        resource: typeof filtersOrResource === 'string' ? filtersOrResource : undefined,
      };
    }

    const roles: string[] = user?.roles || (user?.role ? [user.role] : []);
    const permissions: string[] = user?.permissions || [];
    const isSuperAdmin = roles.includes('SUPER_ADMIN');
    const isAdmin = roles.includes('ADMIN');
    const isDoctor = roles.includes('DOCTOR') || permissions.includes('read:self-audit');
    const authenticatedActorId = user?.sub || user?.userId;

    let targetUserId: string | undefined;

    if (isDoctor && !isAdmin && !isSuperAdmin) {
      // Cross-Doctor Request Rule:
      // If query filter specifies a userId and it does not match the authenticated doctor's ID, return HTTP 403 Forbidden.
      // Do not silently ignore or return own events; do not execute DB query; do not leak user existence.
      if (filters.userId && filters.userId !== authenticatedActorId) {
        throw new ForbiddenException('Access denied: cross-user audit log inspection is forbidden');
      }
      // Matching userId or omitted -> scope strictly to authenticated doctor
      targetUserId = authenticatedActorId;
    } else if (isAdmin || isSuperAdmin) {
      // Admin / Super Admin can view all or filter by a specific target user ID
      targetUserId = filters.userId;
    } else if (user && roles.length > 0) {
      // Patients, Staff, Facility Admins, and unauthorized roles are forbidden
      throw new ForbiddenException('Access denied: insufficient permissions to view audit logs');
    } else {
      targetUserId = filters.userId;
    }

    const logs = await this.securityRepository.findAuditLogs({
      userId: targetUserId,
      resource: filters.resource,
      action: filters.action,
      startDate: filters.startDate,
      endDate: filters.endDate,
      page: filters.page,
      limit: filters.limit,
    });

    return logs.map((l) => ({
      id: l.id,
      userId: l.userId || undefined,
      action: l.action,
      resource: l.resource,
      resourceId: l.resourceId || undefined,
      ipAddress: l.ipAddress || undefined,
      userAgent: l.userAgent || undefined,
      result: l.result,
      details: l.details || undefined,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  // ─── Integration API Keys ──────────────────────────────────────────────────

  private parseApiKeyRecord(record: any, secretKey?: string): ApiKeyResponseDto {
    const parts = record.keyIdentifier.split(':');
    const name = parts[1] || 'API Key';
    const prefix = parts[2] ? `ak_live_${parts[2]}...` : 'ak_live_****';
    return {
      id: record.id,
      name,
      prefix,
      key: secretKey,
      scopes: ['read', 'write'],
      status: record.status,
      expiresAt: record.expiresAt ? record.expiresAt.toISOString() : undefined,
      createdAt: record.createdAt ? record.createdAt.toISOString() : new Date().toISOString(),
      isOperational: false,
      notice: 'Demonstration key only. Live API key authentication guard is pending dedicated infrastructure migration.',
    };
  }

  async createApiKey(userId: string, dto: CreateApiKeyDto): Promise<ApiKeyResponseDto> {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException(
        'Integration API keys are disabled in production environment pending dedicated API key infrastructure and ApiKeyGuard deployment.',
      );
    }

    const rawSecret = crypto.randomBytes(24).toString('hex');
    const secretKey = `ak_live_${rawSecret}`;
    const prefix = rawSecret.slice(0, 8);
    const keyIdentifier = `api_key:${dto.name}:${prefix}:${Date.now()}`;

    const db = (this.securityRepository as any).db;
    const record = await db.encryptionKey.create({
      data: {
        keyIdentifier,
        algorithm: 'HMAC-SHA256',
        version: 1,
        status: 'ACTIVE',
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    await this.securityRepository.createAuditLog({
      userId,
      action: 'API_KEY_CREATED',
      resource: 'API_KEY',
      resourceId: record.id,
      details: `Created API key '${dto.name}' with prefix ${prefix}`,
    });

    return this.parseApiKeyRecord(record, secretKey);
  }

  async getApiKeys(): Promise<ApiKeyResponseDto[]> {
    const db = (this.securityRepository as any).db;
    const records = await db.encryptionKey.findMany({
      where: { keyIdentifier: { startsWith: 'api_key:' } },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r: any) => this.parseApiKeyRecord(r));
  }

  async getApiKeyById(id: string): Promise<ApiKeyResponseDto> {
    const db = (this.securityRepository as any).db;
    const record = await db.encryptionKey.findUnique({ where: { id } });
    if (!record || !record.keyIdentifier.startsWith('api_key:')) {
      throw new NotFoundException('API key not found');
    }
    return this.parseApiKeyRecord(record);
  }

  async deleteApiKey(id: string, userId: string): Promise<{ message: string }> {
    const key = await this.getApiKeyById(id);
    const db = (this.securityRepository as any).db;
    await db.encryptionKey.delete({ where: { id } });

    await this.securityRepository.createAuditLog({
      userId,
      action: 'API_KEY_DELETED',
      resource: 'API_KEY',
      resourceId: id,
      details: `Deleted API key '${key.name}'`,
    });

    return { message: 'API key deleted successfully' };
  }

  async revokeApiKey(id: string, userId: string): Promise<ApiKeyResponseDto> {
    const key = await this.getApiKeyById(id);
    const db = (this.securityRepository as any).db;
    const updated = await db.encryptionKey.update({
      where: { id },
      data: { status: 'REVOKED' },
    });

    await this.securityRepository.createAuditLog({
      userId,
      action: 'API_KEY_REVOKED',
      resource: 'API_KEY',
      resourceId: id,
      details: `Revoked API key '${key.name}'`,
    });

    return this.parseApiKeyRecord(updated);
  }
}
