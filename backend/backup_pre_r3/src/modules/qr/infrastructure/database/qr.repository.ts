import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { IQrRepository } from '../../domain/repositories/qr.repository.interface';
import {
  QrCodeEntity,
  QrHistoryEntity,
  QrScanLogEntity,
  QrAuditLogEntity,
} from '../../domain/entities/qr.entity';

@Injectable()
export class QrRepository implements IQrRepository {
  constructor(private readonly db: DatabaseService) {}

  async findProfileByUserId(userId: string) {
    return this.db.patientProfile.findUnique({ where: { userId }, select: { id: true } });
  }

  async createQr(data: any): Promise<QrCodeEntity> {
    const created = await this.db.qrCode.create({
      data: {
        entityId: data.entityId,
        entityType: data.entityType as any,
        ownerId: data.ownerId,
        token: data.token,
        signature: data.signature,
        status: data.status || 'ACTIVE',
        version: 1,
        nonce: data.nonce,
        checksum: data.checksum || null,
        expiresAt: new Date(data.expiresAt),
      },
    });

    await this.createHistory({
      qrCodeId: created.id,
      action: 'GENERATED',
      newToken: data.token,
      newStatus: 'ACTIVE',
      reason: 'Initial QR identity generation',
      performedBy: data.ownerId,
    });

    return created as unknown as QrCodeEntity;
  }

  async findQrById(id: string, includeDeleted = false): Promise<QrCodeEntity | null> {
    if (!id || typeof id !== 'string') return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return null;
    return (await this.db.qrCode.findFirst({
      where: { id, ...(includeDeleted ? {} : { isDeleted: false }) },
    })) as unknown as QrCodeEntity | null;
  }

  async findQrByToken(token: string): Promise<QrCodeEntity | null> {
    return (await this.db.qrCode.findUnique({
      where: { token },
    })) as unknown as QrCodeEntity | null;
  }

  async findQrByEntity(entityId: string, entityType: string): Promise<QrCodeEntity | null> {
    const validEntityTypes = ['HEALTH_CARD', 'MEDICAL_RECORD', 'MEDICAL_REPORT', 'INSURANCE', 'IMMUNISATION', 'DOCTOR_ID', 'FACILITY_ID', 'STAFF_ID', 'EMERGENCY_CARD', 'CUSTOM'];
    const upperType = entityType ? entityType.toUpperCase() : '';
    if (!validEntityTypes.includes(upperType)) return null;
    return (await this.db.qrCode.findFirst({
      where: { entityId, entityType: upperType as any, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    })) as unknown as QrCodeEntity | null;
  }

  async findQrsByOwner(ownerId: string, entityType?: string): Promise<QrCodeEntity[]> {
    const validEntityTypes = ['HEALTH_CARD', 'MEDICAL_RECORD', 'MEDICAL_REPORT', 'INSURANCE', 'IMMUNISATION', 'DOCTOR_ID', 'FACILITY_ID', 'STAFF_ID', 'EMERGENCY_CARD', 'CUSTOM'];
    let normalizedType: string | undefined;
    if (entityType) {
      const upper = entityType.toUpperCase();
      if (!validEntityTypes.includes(upper)) return [];
      normalizedType = upper;
    }

    return (await this.db.qrCode.findMany({
      where: {
        ownerId,
        isDeleted: false,
        ...(normalizedType ? { entityType: normalizedType as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })) as unknown as QrCodeEntity[];
  }

  async updateQr(id: string, data: any): Promise<QrCodeEntity> {
    return (await this.db.qrCode.update({
      where: { id },
      data: {
        token: data.token || undefined,
        signature: data.signature || undefined,
        status: data.status as any || undefined,
        version: data.version || undefined,
        nonce: data.nonce || undefined,
        checksum: data.checksum || undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        rotatedAt: data.rotatedAt || undefined,
        revokedAt: data.revokedAt || undefined,
        revocationReason: data.revocationReason || undefined,
        isDeleted: data.isDeleted ?? undefined,
        deletedAt: data.deletedAt || undefined,
      },
    })) as unknown as QrCodeEntity;
  }

  async softDeleteQr(id: string): Promise<void> {
    await this.db.qrCode.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async searchQrs(query: string): Promise<QrCodeEntity[]> {
    const q = query.toLowerCase();
    return (await this.db.qrCode.findMany({
      where: {
        isDeleted: false,
        OR: [
          { token: { contains: q, mode: 'insensitive' } },
          { entityId: { contains: q, mode: 'insensitive' } },
          { ownerId: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    })) as unknown as QrCodeEntity[];
  }

  async createHistory(data: {
    qrCodeId: string;
    action: string;
    previousToken?: string;
    newToken?: string;
    previousStatus?: string;
    newStatus: string;
    reason?: string;
    performedBy?: string;
  }): Promise<QrHistoryEntity> {
    return (await this.db.qrHistory.create({
      data: {
        qrCodeId: data.qrCodeId,
        action: data.action,
        previousToken: data.previousToken || null,
        newToken: data.newToken || null,
        previousStatus: data.previousStatus || null,
        newStatus: data.newStatus,
        reason: data.reason || null,
        performedBy: data.performedBy || null,
      },
    })) as unknown as QrHistoryEntity;
  }

  async findHistoryByQrId(qrCodeId: string): Promise<QrHistoryEntity[]> {
    return (await this.db.qrHistory.findMany({
      where: { qrCodeId },
      orderBy: { createdAt: 'desc' },
    })) as unknown as QrHistoryEntity[];
  }

  async createScanLog(data: {
    qrCodeId?: string;
    entityId: string;
    entityType: string;
    verifierUserId?: string;
    validationResult: string;
    failureReason?: string;
    deviceInfo?: string;
    ipAddress?: string;
    location?: string;
    platform?: string;
  }): Promise<QrScanLogEntity> {
    return (await this.db.qrScanLog.create({
      data: {
        qrCodeId: data.qrCodeId || null,
        entityId: data.entityId,
        entityType: data.entityType as any,
        verifierUserId: data.verifierUserId || null,
        validationResult: data.validationResult,
        failureReason: data.failureReason || null,
        deviceInfo: data.deviceInfo || null,
        ipAddress: data.ipAddress || null,
        location: data.location || null,
        platform: data.platform || null,
      },
    })) as unknown as QrScanLogEntity;
  }

  async findScanLogsByQrId(qrCodeId: string): Promise<QrScanLogEntity[]> {
    return (await this.db.qrScanLog.findMany({
      where: { qrCodeId },
      orderBy: { scannedAt: 'desc' },
    })) as unknown as QrScanLogEntity[];
  }

  async findScanLogsByVerifier(verifierUserId: string): Promise<QrScanLogEntity[]> {
    return (await this.db.qrScanLog.findMany({
      where: { verifierUserId },
      orderBy: { scannedAt: 'desc' },
      take: 50,
    })) as unknown as QrScanLogEntity[];
  }

  async createAuditLog(data: {
    qrCodeId?: string;
    action: string;
    performedBy?: string;
    details?: string;
  }): Promise<QrAuditLogEntity> {
    return (await this.db.qrAuditLog.create({
      data: {
        qrCodeId: data.qrCodeId || null,
        action: data.action,
        performedBy: data.performedBy || null,
        details: data.details || null,
      },
    })) as unknown as QrAuditLogEntity;
  }

  async getAnalytics() {
    try {
      const totalQrs = await this.db.qrCode.count({ where: { isDeleted: false } });
      const activeQrs = await this.db.qrCode.count({ where: { status: 'ACTIVE', isDeleted: false } });
      const revokedQrs = await this.db.qrCode.count({ where: { status: 'REVOKED', isDeleted: false } });
      const totalScans = await this.db.qrScanLog.count();
      const successfulScans = await this.db.qrScanLog.count({ where: { validationResult: 'VALID' } });
      const failedScans = totalScans - successfulScans;

      const scansByEntity: Record<string, number> = {};
      try {
        const scansGroup = await this.db.qrScanLog.groupBy({
          by: ['entityType'],
          _count: { id: true },
        });
        scansGroup.forEach((g) => {
          scansByEntity[g.entityType] = g._count.id;
        });
      } catch (err) {
        // GroupBy fallback if empty
      }

      return {
        totalQrs,
        activeQrs,
        revokedQrs,
        totalScans,
        successfulScans,
        failedScans,
        scansByEntity,
      };
    } catch (err) {
      return {
        totalQrs: 0,
        activeQrs: 0,
        revokedQrs: 0,
        totalScans: 0,
        successfulScans: 0,
        failedScans: 0,
        scansByEntity: {},
      };
    }
  }
}
