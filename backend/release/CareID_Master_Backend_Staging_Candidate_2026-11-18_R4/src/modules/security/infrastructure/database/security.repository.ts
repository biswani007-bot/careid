import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { ISecurityRepository } from '../../domain/repositories/security.repository.interface';
import {
  SecurityConsentRecordEntity, EncryptionKeyEntity, RetentionPolicyEntity,
  SecurityIncidentEntity, SecurityPlatformAuditLogEntity, ComplianceReportEntity,
} from '../../domain/entities/security.entity';

@Injectable()
export class PrismaSecurityRepository implements ISecurityRepository {
  constructor(private readonly db: DatabaseService) {}

  // ─── Consents ─────────────────────────────────────────────────────────────

  async createConsent(data: any): Promise<SecurityConsentRecordEntity> {
    const status = (data.status as any) || 'GRANTED';
    const grantedAt = data.grantedAt !== undefined ? data.grantedAt : (status === 'PENDING' ? null : new Date());
    return (await this.db.securityConsentRecord.create({
      data: {
        patientId: data.patientId,
        consentType: (data.consentType as any) || 'TREATMENT',
        status,
        purpose: data.purpose,
        grantedAt,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        capturedBy: data.capturedBy || null,
        authorizedDoctorId: data.authorizedDoctorId || null,
        authorizedFacilityId: data.authorizedFacilityId || null,
        accessScope: data.accessScope || 'ALL',
        evidenceReference: data.evidenceReference || null,
      },
    })) as unknown as SecurityConsentRecordEntity;
  }

  async findConsents(
    optionsOrPatientId?: any,
    legacyStatus?: string,
  ): Promise<{ data: SecurityConsentRecordEntity[]; total: number } | any> {
    let patientId: string | undefined;
    let status: string | undefined;
    let consentType: string | undefined;
    let authorizedDoctorId: string | undefined;
    let authorizedFacilityId: string | undefined;
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    let page: number = 1;
    let limit: number = 20;

    if (typeof optionsOrPatientId === 'string' || optionsOrPatientId === undefined) {
      patientId = optionsOrPatientId;
      status = legacyStatus;
    } else if (typeof optionsOrPatientId === 'object' && optionsOrPatientId !== null) {
      patientId = optionsOrPatientId.patientId;
      status = optionsOrPatientId.status;
      consentType = optionsOrPatientId.consentType;
      authorizedDoctorId = optionsOrPatientId.authorizedDoctorId;
      authorizedFacilityId = optionsOrPatientId.authorizedFacilityId;
      startDate = optionsOrPatientId.startDate;
      endDate = optionsOrPatientId.endDate;
      if (optionsOrPatientId.page) page = optionsOrPatientId.page;
      if (optionsOrPatientId.limit) limit = optionsOrPatientId.limit;
    }

    const validStatuses = ['PENDING', 'GRANTED', 'DENIED', 'WITHDRAWN', 'EXPIRED'];
    const validTypes = ['TREATMENT', 'DATA_COLLECTION', 'DATA_SHARING', 'RESEARCH', 'MARKETING', 'DOCUMENT_PROCESSING', 'OTHER'];

    const normalizedStatus = status ? status.toUpperCase() : undefined;
    const finalStatus = normalizedStatus && validStatuses.includes(normalizedStatus) ? normalizedStatus : undefined;

    // If an invalid status was explicitly requested, return empty safely rather than crashing
    if (status && !finalStatus) {
      return { data: [], total: 0 };
    }

    const normalizedType = consentType ? consentType.toUpperCase() : undefined;
    const finalType = normalizedType && validTypes.includes(normalizedType) ? normalizedType : undefined;
    if (consentType && !finalType) {
      return { data: [], total: 0 };
    }

    const dateFilter = startDate || endDate ? {
      createdAt: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      },
    } : {};

    const isPatientUuid = patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId);
    const isDocUuid = authorizedDoctorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authorizedDoctorId);
    const isFacUuid = authorizedFacilityId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authorizedFacilityId);

    const where: any = {
      isDeleted: false,
      ...dateFilter,
      ...(isPatientUuid ? { patientId } : {}),
      ...(finalStatus ? { status: finalStatus as any } : {}),
      ...(finalType ? { consentType: finalType as any } : {}),
      ...(isDocUuid ? { authorizedDoctorId } : {}),
      ...(isFacUuid ? { authorizedFacilityId } : {}),
    };

    const pageNum = page > 0 ? page : 1;
    const limitNum = limit > 0 ? Math.min(limit, 100) : 20;
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      this.db.securityConsentRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.db.securityConsentRecord.count({ where }),
    ]);

    return {
      data: data as unknown as SecurityConsentRecordEntity[],
      total,
    };
  }

  async findConsentById(id: string): Promise<SecurityConsentRecordEntity | null> {
    if (!id || typeof id !== 'string') return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return null;
    return (await this.db.securityConsentRecord.findFirst({
      where: { id, isDeleted: false },
    })) as unknown as SecurityConsentRecordEntity | null;
  }

  async findActiveConsents(patientId?: string): Promise<SecurityConsentRecordEntity[]> {
    const isUuid = patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId);
    return (await this.db.securityConsentRecord.findMany({
      where: {
        isDeleted: false,
        status: 'GRANTED',
        ...(isUuid ? { patientId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })) as unknown as SecurityConsentRecordEntity[];
  }

  async withdrawConsent(id: string): Promise<SecurityConsentRecordEntity> {
    return (await this.db.securityConsentRecord.update({
      where: { id },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt: new Date(),
      },
    })) as unknown as SecurityConsentRecordEntity;
  }

  async confirmConsent(id: string): Promise<SecurityConsentRecordEntity> {
    return (await this.db.securityConsentRecord.update({
      where: { id },
      data: {
        status: 'GRANTED',
        grantedAt: new Date(),
      },
    })) as unknown as SecurityConsentRecordEntity;
  }

  async validatePatientExists(patientId: string): Promise<boolean> {
    if (!patientId || typeof patientId !== 'string') return false;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId);
    if (!isUuid) {
      const p = await this.db.patientProfile.findFirst({
        where: { patientNumber: patientId },
        select: { id: true },
      });
      return !!p;
    }
    const p = await this.db.patientProfile.findFirst({
      where: { OR: [{ id: patientId }, { userId: patientId }] },
      select: { id: true },
    });
    return !!p;
  }

  async validateDoctorExists(doctorId: string): Promise<boolean> {
    if (!doctorId || typeof doctorId !== 'string') return false;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doctorId);
    if (!isUuid) return false;
    const d = await this.db.doctorProfile.findFirst({
      where: { OR: [{ id: doctorId }, { userId: doctorId }], isDeleted: false },
      select: { id: true },
    });
    return !!d;
  }

  async validateFacilityExists(facilityId: string): Promise<boolean> {
    if (!facilityId || typeof facilityId !== 'string') return false;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(facilityId);
    if (!isUuid) return false;
    const f = await this.db.facility.findFirst({
      where: { id: facilityId },
      select: { id: true },
    });
    return !!f;
  }

  async findPatientProfileByUserId(userId: string): Promise<any | null> {
    return this.db.patientProfile.findFirst({
      where: { userId },
      select: { id: true, userId: true },
    });
  }

  async findDoctorProfileByUserId(userId: string): Promise<any | null> {
    return this.db.doctorProfile.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true, userId: true },
    });
  }

  async findStaffFacilitiesByUserId(userId: string): Promise<any | null> {
    return this.db.staffMember.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true, primaryFacilityId: true, secondaryFacilityId: true },
    });
  }

  // ─── Retention Policies ──────────────────────────────────────────────────

  async createRetentionPolicy(data: any): Promise<RetentionPolicyEntity> {
    return (await this.db.retentionPolicy.create({
      data: {
        name: data.name,
        resourceType: data.resourceType,
        retentionPeriodDays: data.retentionPeriodDays ?? 2555,
        action: (data.action as any) || 'ARCHIVE',
        isActive: data.isActive ?? true,
      },
    })) as unknown as RetentionPolicyEntity;
  }

  async findRetentionPolicies(): Promise<RetentionPolicyEntity[]> {
    return (await this.db.retentionPolicy.findMany({
      where: { isDeleted: false },
      orderBy: { resourceType: 'asc' },
    })) as unknown as RetentionPolicyEntity[];
  }

  async findRetentionPolicyById(id: string): Promise<RetentionPolicyEntity | null> {
    return (await this.db.retentionPolicy.findFirst({
      where: { id, isDeleted: false },
    })) as unknown as RetentionPolicyEntity | null;
  }

  async updateRetentionPolicy(id: string, data: any): Promise<RetentionPolicyEntity> {
    return (await this.db.retentionPolicy.update({
      where: { id },
      data: {
        name: data.name || undefined,
        retentionPeriodDays: data.retentionPeriodDays ?? undefined,
        action: data.action ? (data.action as any) : undefined,
        isActive: data.isActive ?? undefined,
      },
    })) as unknown as RetentionPolicyEntity;
  }

  async softDeleteRetentionPolicy(id: string): Promise<void> {
    await this.db.retentionPolicy.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  // ─── Security Incidents ──────────────────────────────────────────────────

  async createIncident(data: any): Promise<SecurityIncidentEntity> {
    return (await this.db.securityIncident.create({
      data: {
        title: data.title,
        description: data.description,
        severity: (data.severity as any) || 'MEDIUM',
        status: 'OPEN',
        reportedBy: data.reportedBy || null,
      },
    })) as unknown as SecurityIncidentEntity;
  }

  async findIncidents(severity?: string, status?: string): Promise<SecurityIncidentEntity[]> {
    return (await this.db.securityIncident.findMany({
      where: {
        isDeleted: false,
        ...(severity ? { severity: severity as any } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })) as unknown as SecurityIncidentEntity[];
  }

  async findIncidentById(id: string): Promise<SecurityIncidentEntity | null> {
    return (await this.db.securityIncident.findFirst({
      where: { id, isDeleted: false },
    })) as unknown as SecurityIncidentEntity | null;
  }

  async resolveIncident(id: string, resolvedBy: string): Promise<SecurityIncidentEntity> {
    return (await this.db.securityIncident.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedBy,
        resolvedAt: new Date(),
      },
    })) as unknown as SecurityIncidentEntity;
  }

  // ─── Encryption Keys ─────────────────────────────────────────────────────

  async findActiveEncryptionKey(): Promise<EncryptionKeyEntity | null> {
    return (await this.db.encryptionKey.findFirst({
      where: {
        status: 'ACTIVE',
        NOT: { keyIdentifier: { startsWith: 'api_key:' } },
      },
      orderBy: { version: 'desc' },
    })) as unknown as EncryptionKeyEntity | null;
  }

  async createEncryptionKey(data: any): Promise<EncryptionKeyEntity> {
    return (await this.db.encryptionKey.create({
      data: {
        keyIdentifier: data.keyIdentifier,
        algorithm: data.algorithm || 'AES-256-GCM',
        version: data.version || 1,
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    })) as unknown as EncryptionKeyEntity;
  }

  async rotateEncryptionKey(keyIdentifier: string): Promise<EncryptionKeyEntity> {
    const active = await this.findActiveEncryptionKey();
    const newVersion = (active?.version || 1) + 1;

    if (active) {
      await this.db.encryptionKey.update({
        where: { id: active.id },
        data: { status: 'ROTATING', rotationDate: new Date() },
      });
    }

    return (await this.db.encryptionKey.create({
      data: {
        keyIdentifier,
        algorithm: 'AES-256-GCM',
        version: newVersion,
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    })) as unknown as EncryptionKeyEntity;
  }

  // ─── Compliance Reports ─────────────────────────────────────────────────

  async createComplianceReport(data: any): Promise<ComplianceReportEntity> {
    return (await this.db.complianceReport.create({
      data: {
        reportName: data.reportName,
        reportType: data.reportType,
        generatedBy: data.generatedBy || null,
        summary: data.summary || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    })) as unknown as ComplianceReportEntity;
  }

  async findComplianceReports(): Promise<ComplianceReportEntity[]> {
    return (await this.db.complianceReport.findMany({
      orderBy: { createdAt: 'desc' },
    })) as unknown as ComplianceReportEntity[];
  }

  // ─── Audit Logs ──────────────────────────────────────────────────────────

  async createAuditLog(data: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    result?: string;
    details?: string;
  }): Promise<SecurityPlatformAuditLogEntity> {
    return (await this.db.securityPlatformAuditLog.create({
      data: {
        userId: data.userId || null,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        result: data.result || 'SUCCESS',
        details: data.details || null,
      },
    })) as unknown as SecurityPlatformAuditLogEntity;
  }

  async findAuditLogs(
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
    limit = 100,
  ): Promise<SecurityPlatformAuditLogEntity[]> {
    let where: any = {};
    let takeLimit = limit;
    let skip: number | undefined;

    if (typeof userIdOrFilters === 'object' && userIdOrFilters !== null) {
      const f = userIdOrFilters;
      takeLimit = Math.min(Math.max(1, f.limit || 100), 100);
      if (f.page && f.page > 1) {
        skip = (f.page - 1) * takeLimit;
      }
      if (f.userId) {
        where.userId = f.userId;
      }
      if (f.resource) {
        where.resource = f.resource;
      }
      if (f.action) {
        where.action = f.action;
      }
      if (f.startDate || f.endDate) {
        where.createdAt = {
          ...(f.startDate ? { gte: new Date(f.startDate) } : {}),
          ...(f.endDate ? { lte: new Date(f.endDate) } : {}),
        };
      }
    } else {
      const userId = userIdOrFilters;
      takeLimit = limit;
      where = {
        ...(userId ? { userId } : {}),
        ...(resource ? { resource } : {}),
      };
    }

    const platformLogs = (await this.db.securityPlatformAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: takeLimit,
      ...(skip ? { skip } : {}),
    })) as unknown as SecurityPlatformAuditLogEntity[];

    // If filtering by specific userId and we haven't exhausted takeLimit,
    // also check auditLog to include any historical authentication/session events for this user
    if (where.userId && (!where.resource || where.resource === 'AUTH_SESSION') && platformLogs.length < takeLimit) {
      const existingPlatformIds = new Set(platformLogs.map((p) => p.id));
      const existingAuthLinkedIds = new Set(
        platformLogs
          .filter((p) => p.resource === 'AUTH_SESSION' && p.resourceId)
          .map((p) => p.resourceId as string),
      );
      const authWhere: any = { userId: where.userId };
      if (where.action) authWhere.action = where.action;
      if (where.createdAt) authWhere.createdAt = where.createdAt;

      const authLogs = await this.db.auditLog.findMany({
        where: authWhere,
        orderBy: { createdAt: 'desc' },
        take: takeLimit - platformLogs.length,
      });

      for (const al of authLogs) {
        if (!existingPlatformIds.has(al.id) && !existingAuthLinkedIds.has(al.id)) {
          platformLogs.push({
            id: al.id,
            userId: al.userId,
            action: al.action,
            resource: 'AUTH_SESSION',
            resourceId: null,
            ipAddress: al.ipAddress || null,
            userAgent: null,
            result: 'SUCCESS',
            details: al.details || null,
            createdAt: al.createdAt,
          } as SecurityPlatformAuditLogEntity);
        }
      }
      platformLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return platformLogs;
  }

  // ─── Security Stats Summary ──────────────────────────────────────────────

  async getSecurityDashboardStats() {
    const [
      activeConsentsCount,
      activeRetentionPoliciesCount,
      openIncidentsCount,
      criticalIncidentsCount,
      activeKey,
      complianceReportsCount,
      totalAuditLogsCount,
    ] = await Promise.all([
      this.db.securityConsentRecord.count({ where: { isDeleted: false, status: 'GRANTED' } }),
      this.db.retentionPolicy.count({ where: { isDeleted: false, isActive: true } }),
      this.db.securityIncident.count({ where: { isDeleted: false, status: 'OPEN' } }),
      this.db.securityIncident.count({ where: { isDeleted: false, severity: 'CRITICAL', status: 'OPEN' } }),
      this.findActiveEncryptionKey(),
      this.db.complianceReport.count(),
      this.db.securityPlatformAuditLog.count(),
    ]);

    return {
      activeConsentsCount,
      activeRetentionPoliciesCount,
      openIncidentsCount,
      criticalIncidentsCount,
      activeEncryptionKeyVersion: activeKey?.version || 1,
      complianceReportsCount,
      totalAuditLogsCount,
    };
  }
}
