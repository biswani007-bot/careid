import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { IReportsRepository } from '../../domain/repositories/reports.repository.interface';
import {
  ReportDefinitionEntity, GeneratedReportEntity, DashboardWidgetEntity,
  AnalyticsSnapshotEntity, ReportAuditLogEntity,
} from '../../domain/entities/reports.entity';

@Injectable()
export class ReportsRepository implements IReportsRepository {
  constructor(private readonly db: DatabaseService) {}

  // ─── Report Definitions ──────────────────────────────────────────────────

  async createDefinition(data: any): Promise<ReportDefinitionEntity> {
    const code = data.code || `RPT-${data.module.toUpperCase()}-${Date.now().toString().slice(-4)}`;
    return (await this.db.reportDefinition.create({
      data: {
        name: data.name,
        code,
        description: data.description || null,
        reportType: (data.reportType as any) || 'SUMMARY',
        module: data.module,
        configuration: data.configuration ? JSON.stringify(data.configuration) : null,
        isSystem: data.isSystem ?? false,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy || null,
      },
    })) as unknown as ReportDefinitionEntity;
  }

  async findDefinitions(module?: string): Promise<ReportDefinitionEntity[]> {
    return (await this.db.reportDefinition.findMany({
      where: {
        isDeleted: false,
        ...(module ? { module } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })) as unknown as ReportDefinitionEntity[];
  }

  async findDefinitionByCode(code: string): Promise<ReportDefinitionEntity | null> {
    return (await this.db.reportDefinition.findFirst({
      where: { code, isDeleted: false },
    })) as unknown as ReportDefinitionEntity | null;
  }

  async findDefinitionById(id: string): Promise<ReportDefinitionEntity | null> {
    return (await this.db.reportDefinition.findFirst({
      where: { id, isDeleted: false },
    })) as unknown as ReportDefinitionEntity | null;
  }

  async updateDefinition(id: string, data: any): Promise<ReportDefinitionEntity> {
    return (await this.db.reportDefinition.update({
      where: { id },
      data: {
        name: data.name || undefined,
        description: data.description || undefined,
        reportType: data.reportType as any || undefined,
        module: data.module || undefined,
        configuration: data.configuration ? JSON.stringify(data.configuration) : undefined,
        isActive: data.isActive ?? undefined,
        updatedBy: data.updatedBy || undefined,
      },
    })) as unknown as ReportDefinitionEntity;
  }

  async softDeleteDefinition(id: string): Promise<void> {
    await this.db.reportDefinition.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  // ─── Generated Reports ───────────────────────────────────────────────────

  async createGeneratedReport(data: any): Promise<GeneratedReportEntity> {
    return (await this.db.generatedReport.create({
      data: {
        reportDefinitionId: data.reportDefinitionId || null,
        generatedBy: data.generatedBy || null,
        reportName: data.reportName,
        filters: data.filters ? JSON.stringify(data.filters) : null,
        exportFormat: (data.exportFormat as any) || 'JSON',
        filePath: data.filePath || null,
        status: (data.status as any) || 'GENERATED',
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    })) as unknown as GeneratedReportEntity;
  }

  async findGeneratedReports(userId?: string): Promise<GeneratedReportEntity[]> {
    return (await this.db.generatedReport.findMany({
      where: userId ? { generatedBy: userId } : {},
      include: { reportDefinition: true },
      orderBy: { generatedAt: 'desc' },
    })) as unknown as GeneratedReportEntity[];
  }

  async findGeneratedReportById(id: string): Promise<GeneratedReportEntity | null> {
    return (await this.db.generatedReport.findUnique({
      where: { id },
      include: { reportDefinition: true },
    })) as unknown as GeneratedReportEntity | null;
  }

  async updateGeneratedReportStatus(id: string, status: string, filePath?: string): Promise<GeneratedReportEntity> {
    return (await this.db.generatedReport.update({
      where: { id },
      data: {
        status: status as any,
        filePath: filePath || undefined,
      },
    })) as unknown as GeneratedReportEntity;
  }

  // ─── Dashboard Widgets ───────────────────────────────────────────────────

  async createWidget(data: any): Promise<DashboardWidgetEntity> {
    return (await this.db.dashboardWidget.create({
      data: {
        title: data.title,
        widgetCode: data.widgetCode,
        widgetType: data.widgetType,
        module: data.module,
        configuration: data.configuration ? JSON.stringify(data.configuration) : null,
        displayOrder: data.displayOrder ?? 0,
        isEnabled: data.isEnabled ?? true,
      },
    })) as unknown as DashboardWidgetEntity;
  }

  async findWidgets(isEnabledOnly = false): Promise<DashboardWidgetEntity[]> {
    return (await this.db.dashboardWidget.findMany({
      where: isEnabledOnly ? { isEnabled: true } : {},
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    })) as unknown as DashboardWidgetEntity[];
  }

  async findWidgetByCode(code: string): Promise<DashboardWidgetEntity | null> {
    return (await this.db.dashboardWidget.findUnique({
      where: { widgetCode: code },
    })) as unknown as DashboardWidgetEntity | null;
  }

  async findWidgetById(id: string): Promise<DashboardWidgetEntity | null> {
    return (await this.db.dashboardWidget.findUnique({
      where: { id },
    })) as unknown as DashboardWidgetEntity | null;
  }

  async updateWidget(id: string, data: any): Promise<DashboardWidgetEntity> {
    return (await this.db.dashboardWidget.update({
      where: { id },
      data: {
        title: data.title || undefined,
        widgetType: data.widgetType || undefined,
        module: data.module || undefined,
        configuration: data.configuration ? JSON.stringify(data.configuration) : undefined,
        displayOrder: data.displayOrder ?? undefined,
        isEnabled: data.isEnabled ?? undefined,
      },
    })) as unknown as DashboardWidgetEntity;
  }

  async reorderWidgets(widgetOrders: { id: string; displayOrder: number }[]): Promise<void> {
    for (const item of widgetOrders) {
      await this.db.dashboardWidget.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder },
      });
    }
  }

  // ─── Analytics Snapshots ─────────────────────────────────────────────────

  async createSnapshot(data: any): Promise<AnalyticsSnapshotEntity> {
    return (await this.db.analyticsSnapshot.create({
      data: {
        module: data.module,
        metric: data.metric,
        metricValue: data.metricValue,
        snapshotDate: new Date(data.snapshotDate || Date.now()),
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    })) as unknown as AnalyticsSnapshotEntity;
  }

  async findSnapshots(module: string, metric: string, startDate?: Date, endDate?: Date): Promise<AnalyticsSnapshotEntity[]> {
    const where: any = { module, metric };
    if (startDate || endDate) {
      where.snapshotDate = {};
      if (startDate) where.snapshotDate.gte = startDate;
      if (endDate) where.snapshotDate.lte = endDate;
    }
    return (await this.db.analyticsSnapshot.findMany({
      where,
      orderBy: { snapshotDate: 'asc' },
    })) as unknown as AnalyticsSnapshotEntity[];
  }

  // ─── Audit ───────────────────────────────────────────────────────────────

  async createAuditLog(data: { reportId?: string; action: string; performedBy?: string; details?: string }): Promise<ReportAuditLogEntity> {
    return (await this.db.analyticsReportAuditLog.create({
      data: {
        reportId: data.reportId || null,
        action: data.action,
        performedBy: data.performedBy || null,
        details: data.details || null,
      },
    })) as unknown as ReportAuditLogEntity;
  }

  // ─── Aggregated Domain Analytics (Read-Only) ─────────────────────────────

  private async safeCount(
    arg1: string | (() => Promise<number>) | Promise<number>,
    arg2?: (() => Promise<number>) | Promise<number>,
    unavailableList?: string[],
  ): Promise<number> {
    const metricName = typeof arg1 === 'string' ? arg1 : 'unknown';
    const query = typeof arg1 === 'string' ? arg2 : arg1;

    try {
      if (typeof query === 'function') {
        return await query();
      } else if (query && typeof (query as any).then === 'function') {
        return await query;
      }
      return 0;
    } catch {
      if (unavailableList && typeof arg1 === 'string') {
        unavailableList.push(arg1);
      }
      return 0;
    }
  }

  async getExecutiveDashboardData(startDate?: Date, endDate?: Date, facilityId?: string): Promise<any> {
    const validStart = startDate instanceof Date && !isNaN(startDate.getTime()) ? startDate : undefined;
    const validEnd = endDate instanceof Date && !isNaN(endDate.getTime()) ? endDate : undefined;

    const dateFilter = validStart || validEnd ? {
      createdAt: {
        ...(validStart ? { gte: validStart } : {}),
        ...(validEnd ? { lte: validEnd } : {}),
      },
    } : {};

    const unavailableMetrics: string[] = [];

    const [
      totalPatients,
      totalDoctors,
      totalFacilities,
      totalStaff,
      totalHealthCards,
      totalInsurancePolicies,
      totalImmunisations,
      totalReports,
      totalAuditLogs,
      totalAppointments,
      totalReferrals,
      pendingReferrals,
      completedReferrals,
      totalMedicalRecords,
      totalOcrJobs,
    ] = await Promise.all([
      this.safeCount('totalPatients', () => (this.db?.patientProfile ? this.db.patientProfile.count({ where: { ...dateFilter, isDeleted: false } }) : Promise.resolve(0)), unavailableMetrics),
      this.safeCount('totalDoctors', () => (this.db?.doctorProfile ? this.db.doctorProfile.count({ where: { ...dateFilter, isDeleted: false } }) : Promise.resolve(0)), unavailableMetrics),
      this.safeCount('totalFacilities', () => (this.db?.facility ? (facilityId ? this.db.facility.count({ where: { id: facilityId, isDeleted: false } }) : this.db.facility.count({ where: { ...dateFilter, isDeleted: false } })) : Promise.resolve(0)), unavailableMetrics),
      this.safeCount('totalStaff', () => (this.db?.staffMember ? this.db.staffMember.count({ where: { ...dateFilter, isDeleted: false, ...(facilityId ? { OR: [{ primaryFacilityId: facilityId }, { secondaryFacilityId: facilityId }] } : {}) } }) : Promise.resolve(0)), unavailableMetrics),
      this.safeCount('totalHealthCards', () => (this.db?.healthCard ? this.db.healthCard.count({ where: { ...dateFilter, isDeleted: false } }) : Promise.resolve(0)), unavailableMetrics),
      this.safeCount('totalInsurancePolicies', () => (this.db?.insurancePolicy ? this.db.insurancePolicy.count({ where: { ...dateFilter, isDeleted: false } }) : Promise.resolve(0)), unavailableMetrics),
      this.safeCount('totalImmunisations', () => (this.db?.vaccinationRecord ? this.db.vaccinationRecord.count({ where: dateFilter }) : Promise.resolve(0)), unavailableMetrics),
      this.safeCount('totalReports', () => (this.db?.generatedReport ? this.db.generatedReport.count({ where: dateFilter }) : Promise.resolve(0)), unavailableMetrics),
      this.safeCount('totalAuditLogs', () => (this.db?.auditLog ? this.db.auditLog.count({ where: dateFilter }) : Promise.resolve(0)), unavailableMetrics),
      this.safeCount('totalAppointments', () => (this.db?.appointment ? this.db.appointment.count({ where: { ...dateFilter, ...(facilityId ? { facilityId } : {}) } }) : Promise.resolve(0)), unavailableMetrics),
      this.safeCount('totalReferrals', () => (this.db?.patientReferral ? this.db.patientReferral.count({ where: { ...dateFilter, isDeleted: false, ...(facilityId ? { OR: [{ referringFacilityId: facilityId }, { receivingFacilityId: facilityId }] } : {}) } }) : Promise.resolve(0)), unavailableMetrics),
      this.safeCount('pendingReferrals', () => (this.db?.patientReferral ? this.db.patientReferral.count({ where: { ...dateFilter, status: 'SUBMITTED', isDeleted: false, ...(facilityId ? { OR: [{ referringFacilityId: facilityId }, { receivingFacilityId: facilityId }] } : {}) } }) : Promise.resolve(0)), unavailableMetrics),
      this.safeCount('completedReferrals', () => (this.db?.patientReferral ? this.db.patientReferral.count({ where: { ...dateFilter, status: 'COMPLETED', isDeleted: false, ...(facilityId ? { OR: [{ referringFacilityId: facilityId }, { receivingFacilityId: facilityId }] } : {}) } }) : Promise.resolve(0)), unavailableMetrics),
      this.safeCount('totalMedicalRecords', () => (this.db?.medicalRecord ? this.db.medicalRecord.count({ where: { ...dateFilter, isDeleted: false, ...(facilityId ? { facilityId } : {}) } }) : Promise.resolve(0)), unavailableMetrics),
      this.safeCount('totalOcrJobs', () => (this.db?.oCRJob ? this.db.oCRJob.count({ where: dateFilter }) : Promise.resolve(0)), unavailableMetrics),
    ]);

    // Live measured database connectivity check
    let dbStatus = 'CONNECTED';
    try {
      if (typeof this.db.$queryRaw === 'function') {
        await this.db.$queryRaw`SELECT 1`;
      }
    } catch {
      dbStatus = 'DISCONNECTED';
    }

    const isPartialData = unavailableMetrics.length > 0;

    return {
      platformOverview: {
        totalPatients,
        totalDoctors,
        totalFacilities,
        totalStaff,
        totalHealthCards,
        totalInsurancePolicies,
        totalImmunisations,
        totalReports,
        totalAuditLogs,
        totalAppointments,
        totalReferrals,
        pendingReferrals,
        completedReferrals,
        totalMedicalRecords,
        totalOcrJobs,
      },
      isPartialData,
      unavailableMetrics: isPartialData ? unavailableMetrics : undefined,
      systemHealth: {
        status: dbStatus === 'CONNECTED' && !isPartialData ? 'UP' : 'DEGRADED',
        database: dbStatus,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getModuleAnalytics(module: string, startDate?: Date, endDate?: Date): Promise<any> {
    const validStart = startDate instanceof Date && !isNaN(startDate.getTime()) ? startDate : undefined;
    const validEnd = endDate instanceof Date && !isNaN(endDate.getTime()) ? endDate : undefined;

    const dateFilter = validStart || validEnd ? {
      createdAt: {
        ...(validStart ? { gte: validStart } : {}),
        ...(validEnd ? { lte: validEnd } : {}),
      },
    } : {};

    const mod = (module || '').toLowerCase().replace(/[-_]/g, '');

    switch (mod) {
      case 'patient': {
        const total = await this.safeCount(this.db.patientProfile.count({ where: { ...dateFilter, isDeleted: false } }));
        const male = await this.safeCount(this.db.patientProfile.count({ where: { ...dateFilter, gender: 'MALE', isDeleted: false } }));
        const female = await this.safeCount(this.db.patientProfile.count({ where: { ...dateFilter, gender: 'FEMALE', isDeleted: false } }));
        return { module: 'patient', total, genderDistribution: { male, female, other: Math.max(0, total - male - female) } };
      }
      case 'doctor': {
        const total = await this.safeCount(this.db.doctorProfile.count({ where: { ...dateFilter, isDeleted: false } }));
        const verified = await this.safeCount(this.db.doctorProfile.count({ where: { ...dateFilter, verificationStatus: 'VERIFIED', isDeleted: false } }));
        const pending = await this.safeCount(this.db.doctorProfile.count({ where: { ...dateFilter, verificationStatus: 'PENDING', isDeleted: false } }));
        return { module: 'doctor', total, verificationStatus: { verified, pending, other: Math.max(0, total - verified - pending) } };
      }
      case 'facility': {
        const total = await this.safeCount(this.db.facility.count({ where: { ...dateFilter, isDeleted: false } }));
        const verified = await this.safeCount(this.db.facility.count({ where: { ...dateFilter, verificationStatus: 'VERIFIED', isDeleted: false } }));
        return { module: 'facility', total, verified };
      }
      case 'staff': {
        const total = await this.safeCount(this.db.staffMember.count({ where: { ...dateFilter, isDeleted: false } }));
        const active = await this.safeCount(this.db.staffMember.count({ where: { ...dateFilter, employmentStatus: 'ACTIVE', isDeleted: false } }));
        return { module: 'staff', total, active };
      }
      case 'insurance': {
        const policies = await this.safeCount(this.db.insurancePolicy.count({ where: { ...dateFilter, isDeleted: false } }));
        const active = await this.safeCount(this.db.insurancePolicy.count({ where: { ...dateFilter, status: 'ACTIVE', isDeleted: false } }));
        return { module: 'insurance', policies, activePolicies: active };
      }
      case 'immunisation':
      case 'vaccination': {
        const total = await this.safeCount(this.db.vaccinationRecord.count({ where: dateFilter }));
        const completed = await this.safeCount(this.db.vaccinationRecord.count({ where: { ...dateFilter, status: 'COMPLETED' } }));
        return { module: 'immunisation', totalRecords: total, completed };
      }
      case 'appointment': {
        const total = await this.safeCount(this.db.appointment.count({ where: dateFilter }));
        const scheduled = await this.safeCount(this.db.appointment.count({ where: { ...dateFilter, status: 'SCHEDULED' } }));
        const completed = await this.safeCount(this.db.appointment.count({ where: { ...dateFilter, status: 'COMPLETED' } }));
        const cancelled = await this.safeCount(this.db.appointment.count({ where: { ...dateFilter, status: 'CANCELLED' } }));
        return { module: 'appointment', total, scheduled, completed, cancelled };
      }
      case 'referral': {
        const total = await this.safeCount(this.db.patientReferral.count({ where: { ...dateFilter, isDeleted: false } }));
        const submitted = await this.safeCount(this.db.patientReferral.count({ where: { ...dateFilter, status: 'SUBMITTED', isDeleted: false } }));
        const accepted = await this.safeCount(this.db.patientReferral.count({ where: { ...dateFilter, status: 'ACCEPTED', isDeleted: false } }));
        const completed = await this.safeCount(this.db.patientReferral.count({ where: { ...dateFilter, status: 'COMPLETED', isDeleted: false } }));
        const rejected = await this.safeCount(this.db.patientReferral.count({ where: { ...dateFilter, status: 'REJECTED', isDeleted: false } }));
        return { module: 'referral', total, submitted, accepted, completed, rejected };
      }
      case 'medicalrecord':
      case 'clinical': {
        const records = await this.safeCount(this.db.medicalRecord.count({ where: { ...dateFilter, isDeleted: false } }));
        const encounters = await this.safeCount(this.db.medicalEncounter.count({ where: dateFilter }));
        return { module: 'medicalrecord', records, encounters };
      }
      case 'ocr': {
        const total = await this.safeCount(this.db.oCRJob.count({ where: dateFilter }));
        const completed = await this.safeCount(this.db.oCRJob.count({ where: { ...dateFilter, status: 'COMPLETED' } }));
        const failed = await this.safeCount(this.db.oCRJob.count({ where: { ...dateFilter, status: 'FAILED' } }));
        return { module: 'ocr', total, completed, failed };
      }
      case 'user': {
        const total = await this.safeCount(this.db.user.count({ where: { ...dateFilter, isDeleted: false } }));
        const active = await this.safeCount(this.db.user.count({ where: { ...dateFilter, status: 'ACTIVE', isDeleted: false } }));
        return { module: 'user', total, active };
      }
      default: {
        return { module, count: 0 };
      }
    }
  }
}
