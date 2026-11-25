import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
  Inject,
  Optional,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { IReportRepository } from '../../domain/repositories/report.repository.interface';
import { UploadReportDto, UpdateReportDto, ReplaceReportFileDto, VerifyReportDto } from '../../presentation/dto/upload-report.dto';
import {
  FullReportResponseDto,
  DownloadTokenResponseDto,
  PreviewMetadataResponseDto,
  ReportVersionResponseDto,
} from '../../presentation/dto/report-detail-response.dto';
import { Logger } from 'nestjs-pino';
import { validateFileSecurity } from '@common/utils/file-security.util';
import { B2StorageService } from '@modules/storage/infrastructure/b2-storage.service';

const ALLOWED_REPORT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'application/dicom',
];

import { QrService } from '@modules/qr/application/use-cases/qr.service';
import { QrEntityType } from '@modules/qr/presentation/dto/generate-qr.dto';

@Injectable()
export class ReportService {
  constructor(
    @Inject('IReportRepository')
    private readonly repository: IReportRepository,
    private readonly qrService: QrService,
    private readonly logger: Logger,
    @Optional()
    private readonly b2StorageService?: B2StorageService,
  ) {}


  private async resolveProfile(userId: string): Promise<string> {
    const profile = await this.repository.findProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Patient profile not found. Please complete registration first.');
    }
    return profile.id;
  }

  private mapReport(r: any): FullReportResponseDto {
    return {
      id: r.id,
      patientProfileId: r.patientProfileId,
      title: r.title,
      description: r.description || undefined,
      category: r.category,
      status: r.status,
      reportDate: r.reportDate ? new Date(r.reportDate).toISOString().split('T')[0] : undefined,
      prescribedBy: r.prescribedBy || undefined,
      providerName: r.providerName || undefined,
      facilityName: r.facilityName || undefined,
      doctorName: r.doctorName || undefined,
      pageCount: r.pageCount || 1,
      language: r.language || 'en',
      tags: r.tags || [],
      notes: r.notes || undefined,
      verificationStatus: r.verificationStatus,
      verifiedBy: r.verifiedBy || undefined,
      verifiedAt: r.verifiedAt?.toISOString() || undefined,
      currentVersion: r.currentVersion || 1,
      isDeleted: r.isDeleted,
      attachments: r.attachments?.map((a: any) => ({
        id: a.id,
        fileName: a.fileName,
        originalName: a.originalName || undefined,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        storageKey: a.storageKey || undefined,
        storageUrl: a.storageUrl,
        checksum: a.checksum || undefined,
        createdAt: a.createdAt.toISOString(),
      })) || [],
      versions: r.versions?.map((v: any) => this.mapVersion(v)),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private mapVersion(v: any): ReportVersionResponseDto {
    return {
      id: v.id,
      medicalReportId: v.medicalReportId,
      version: v.version,
      fileName: v.fileName,
      storageKey: v.storageKey || undefined,
      storageUrl: v.storageUrl,
      fileSize: v.fileSize,
      mimeType: v.mimeType,
      createdById: v.createdById || undefined,
      createdAt: v.createdAt.toISOString(),
    };
  }

  // ─── Core Report Lifecycle ────────────────────────────────────────────────

  async uploadReport(userId: string, dto: UploadReportDto): Promise<FullReportResponseDto> {
    const profileId = await this.resolveProfile(userId);

    validateFileSecurity({
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      fileSize: dto.fileSize,
      storageKey: dto.storageKey,
      storageUrl: dto.storageUrl,
      allowedMimeTypes: ALLOWED_REPORT_MIME_TYPES,
    });

    const report = await this.repository.createReport({
      patientProfileId: profileId,
      title: dto.title,
      description: dto.description,
      category: dto.category || 'LAB',
      status: 'UPLOADED',
      reportDate: dto.reportDate,
      prescribedBy: dto.prescribedBy,
      providerName: dto.providerName,
      facilityName: dto.facilityName,
      doctorName: dto.doctorName,
      pageCount: dto.pageCount || 1,
      language: dto.language || 'en',
      tags: dto.tags || [],
      notes: dto.notes,
      fileName: dto.fileName,
      originalName: dto.fileName,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      storageKey: dto.storageKey,
      storageUrl: dto.storageUrl,
      checksum: dto.checksum,
      createdById: userId,
    });

    await this.repository.createAuditLog({
      medicalReportId: report.id,
      action: 'UPLOADED',
      performedBy: userId,
      details: `Uploaded report: ${report.title} (${dto.fileName})`,
    });

    this.logger.log({ msg: 'Report uploaded successfully', reportId: report.id, userId });
    return this.mapReport(report);
  }

  async getReportsList(userId: string, category?: string): Promise<FullReportResponseDto[]> {
    const profileId = await this.resolveProfile(userId);
    const reports = await this.repository.findReportsByProfile(profileId, category);
    return reports.map((r) => this.mapReport(r));
  }

  async getReportDetails(userId: string, reportId: string): Promise<FullReportResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const report = await this.repository.findReportById(reportId);

    if (!report) throw new NotFoundException('Medical report not found');
    if (report.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    return this.mapReport(report);
  }

  async updateReport(userId: string, reportId: string, dto: UpdateReportDto): Promise<FullReportResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const report = await this.repository.findReportById(reportId);

    if (!report) throw new NotFoundException('Medical report not found');
    if (report.patientProfileId !== profileId) throw new ForbiddenException('Access denied');
    if (report.status === 'ARCHIVED') {
      throw new BadRequestException('Archived reports are read-only. Restore the report before updating.');
    }

    const updated = await this.repository.updateReport(reportId, dto);

    await this.repository.createAuditLog({
      medicalReportId: reportId,
      action: 'UPDATED',
      performedBy: userId,
      details: 'Updated report metadata',
    });

    return this.mapReport(updated);
  }

  async softDeleteReport(userId: string, reportId: string): Promise<{ message: string }> {
    const profileId = await this.resolveProfile(userId);
    const report = await this.repository.findReportById(reportId);

    if (!report) throw new NotFoundException('Medical report not found');
    if (report.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    await this.repository.softDeleteReport(reportId);

    await this.repository.createAuditLog({
      medicalReportId: reportId,
      action: 'SOFT_DELETED',
      performedBy: userId,
    });

    return { message: 'Report soft-deleted successfully' };
  }

  async archiveReport(userId: string, reportId: string): Promise<FullReportResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const report = await this.repository.findReportById(reportId);

    if (!report) throw new NotFoundException('Medical report not found');
    if (report.patientProfileId !== profileId) throw new ForbiddenException('Access denied');
    if (report.status === 'ARCHIVED') throw new BadRequestException('Report is already archived');

    const updated = await this.repository.updateReport(reportId, { status: 'ARCHIVED' });

    await this.repository.createAuditLog({
      medicalReportId: reportId,
      action: 'ARCHIVED',
      performedBy: userId,
    });

    return this.mapReport(updated);
  }

  async restoreReport(userId: string, reportId: string): Promise<FullReportResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const report = await this.repository.findReportById(reportId, true);

    if (!report) throw new NotFoundException('Medical report not found');
    if (report.patientProfileId !== profileId) throw new ForbiddenException('Access denied');
    if (!report.isDeleted && report.status !== 'ARCHIVED') {
      throw new BadRequestException('Report is not deleted or archived');
    }

    const restored = await this.repository.restoreReport(reportId);

    await this.repository.createAuditLog({
      medicalReportId: reportId,
      action: 'RESTORED',
      performedBy: userId,
    });

    return this.mapReport(restored);
  }

  // ─── PDF Replacement & Versioning ────────────────────────────────────────

  async replaceReportFile(userId: string, reportId: string, dto: ReplaceReportFileDto): Promise<FullReportResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const report = await this.repository.findReportById(reportId);

    if (!report) throw new NotFoundException('Medical report not found');
    if (report.patientProfileId !== profileId) throw new ForbiddenException('Access denied');
    if (report.status === 'ARCHIVED') {
      throw new BadRequestException('Archived reports cannot be replaced. Restore the report first.');
    }

    validateFileSecurity({
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      fileSize: dto.fileSize,
      storageKey: dto.storageKey,
      storageUrl: dto.storageUrl,
      allowedMimeTypes: ALLOWED_REPORT_MIME_TYPES,
    });

    const newVersionNumber = report.currentVersion + 1;

    // Create attachment entry
    await this.repository.createAttachment(reportId, {
      fileName: dto.fileName,
      originalName: dto.fileName,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      storageKey: dto.storageKey,
      storageUrl: dto.storageUrl,
    });

    // Create immutable version entry
    await this.repository.createReportVersion({
      medicalReportId: reportId,
      version: newVersionNumber,
      fileName: dto.fileName,
      storageKey: dto.storageKey,
      storageUrl: dto.storageUrl,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      createdById: userId,
    });

    const updated = await this.repository.updateReport(reportId, {
      currentVersion: newVersionNumber,
    });

    await this.repository.createAuditLog({
      medicalReportId: reportId,
      action: 'REPLACED',
      performedBy: userId,
      details: `Replaced report PDF with version ${newVersionNumber} (${dto.fileName})`,
    });

    return this.mapReport(updated);
  }

  async getReportVersions(userId: string, reportId: string): Promise<ReportVersionResponseDto[]> {
    const profileId = await this.resolveProfile(userId);
    const report = await this.repository.findReportById(reportId, true);

    if (!report) throw new NotFoundException('Medical report not found');
    if (report.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    const versions = await this.repository.findReportVersions(reportId);
    return versions.map((v) => this.mapVersion(v));
  }

  // ─── Verification ─────────────────────────────────────────────────────────

  async verifyReport(userId: string, reportId: string, dto: VerifyReportDto): Promise<FullReportResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const report = await this.repository.findReportById(reportId);

    if (!report) throw new NotFoundException('Medical report not found');
    if (report.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    const updated = await this.repository.updateReport(reportId, {
      status: 'VERIFIED',
      verificationStatus: 'VERIFIED',
      verifiedBy: userId,
      verifiedAt: new Date(),
      notes: dto.notes ? `${report.notes || ''}\n[Verification Note]: ${dto.notes}`.trim() : report.notes,
    });

    await this.repository.createAuditLog({
      medicalReportId: reportId,
      action: 'VERIFIED',
      performedBy: userId,
      details: `Report marked as VERIFIED: ${dto.notes || 'No notes'}`,
    });

    return this.mapReport(updated);
  }

  // ─── Search & Categories & Timeline ──────────────────────────────────────

  async searchReports(userId: string, query: string): Promise<FullReportResponseDto[]> {
    const profileId = await this.resolveProfile(userId);
    if (!query || query.trim().length === 0) {
      return this.getReportsList(userId);
    }
    const reports = await this.repository.searchReports(profileId, query.trim());
    return reports.map((r) => this.mapReport(r));
  }

  async getCategories(userId: string): Promise<{ categories: Record<string, number> }> {
    const profileId = await this.resolveProfile(userId);
    const counts = await this.repository.getCategoriesCount(profileId);
    return { categories: counts };
  }

  async getTimeline(userId: string): Promise<any[]> {
    const profileId = await this.resolveProfile(userId);
    return this.repository.getTimeline(profileId);
  }

  // ─── Secure Download & Preview Metadata ───────────────────────────────────

  private generateDownloadToken(reportId: string, userId: string): { token: string; expiresAt: string } {
    const secret = this.getSigningSecret();
    const expiresAtMs = Date.now() + 15 * 60 * 1000; // 15 min expiry
    const randomNonce = crypto.randomBytes(16).toString('hex');
    const signature = crypto.createHmac('sha256', secret)
      .update(`${reportId}:${userId}:${expiresAtMs}:${randomNonce}`)
      .digest('hex');
    const token = `dl_${expiresAtMs}_${randomNonce}_${signature.slice(0, 32)}`;
    const expiresAt = new Date(expiresAtMs).toISOString();
    return { token, expiresAt };
  }

  async getDownloadToken(userId: string, reportId: string): Promise<DownloadTokenResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const report = await this.repository.findReportById(reportId);

    if (!report) throw new NotFoundException('Medical report not found');
    if (report.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    const attachment = report.attachments?.[0];
    if (!attachment) {
      throw new NotFoundException('Medical report attachment not found');
    }
    if (!attachment.storageUrl && !attachment.storageKey) {
      throw new BadRequestException('Attachment storage URL is not available');
    }
    if (!attachment.virusScanStatus || attachment.virusScanStatus !== 'CLEAN') {
      throw new BadRequestException('Attachment virus scan is pending or failed; download unavailable');
    }

    // 1. If Backblaze B2 is configured, generate genuine AWS S3-compatible pre-signed URL
    if (this.b2StorageService && this.b2StorageService.isConfigured()) {
      const presigned = await this.b2StorageService.generatePresignedDownloadUrl({
        storageKey: attachment.storageKey,
        storageUrl: attachment.storageUrl,
        fileName: attachment.fileName,
      });

      const { token } = this.generateDownloadToken(report.id, userId);
      return {
        downloadUrl: presigned.downloadUrl,
        token,
        expiresAt: presigned.expiresAt.toISOString(),
      };
    }

    // 2. Fail-closed: If B2 storage configuration is specified in environment but invalid, fail closed
    if (process.env.B2_BUCKET_NAME || process.env.B2_KEY_ID || process.env.B2_APPLICATION_KEY) {
      if (this.b2StorageService) {
        await this.b2StorageService.generatePresignedDownloadUrl({
          storageKey: attachment.storageKey,
          storageUrl: attachment.storageUrl,
          fileName: attachment.fileName,
        });
      } else {
        throw new InternalServerErrorException(
          'Backblaze B2 storage credentials are not configured; secure presigned download is unavailable',
        );
      }
    }

    // 3. Fallback to timed HMAC signed token for local development / non-B2 environments
    const { token, expiresAt } = this.generateDownloadToken(report.id, userId);
    const separator = (attachment.storageUrl || '').includes('?') ? '&' : '?';
    return {
      downloadUrl: `${attachment.storageUrl}${separator}token=${token}`,
      token,
      expiresAt,
    };
  }

  private getSigningSecret(): string {
    const secret = process.env.REPORT_DOWNLOAD_SECRET || process.env.JWT_SECRET;
    const knownDefaultSecrets = [
      'hvapi_default_secret_key',
      'secret',
      'secret123',
      'changeme',
      'default_secret',
      'your_jwt_secret_key_here',
      'your-jwt-secret',
    ];

    if (!secret || typeof secret !== 'string' || secret.trim() === '') {
      throw new InternalServerErrorException('Download token signing secret is not configured');
    }

    const trimmed = secret.trim();
    if (knownDefaultSecrets.includes(trimmed.toLowerCase())) {
      throw new InternalServerErrorException('Download token signing secret is using an insecure default key');
    }

    const isProdOrStaging = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
    const minLength = isProdOrStaging ? 32 : 16;
    if (trimmed.length < minLength) {
      throw new InternalServerErrorException(
        `Download token signing secret must be at least ${minLength} characters in ${process.env.NODE_ENV || 'current'} environment`,
      );
    }

    return trimmed;
  }

  verifyDownloadToken(token: string, reportId: string, userId: string): boolean {
    if (!token || typeof token !== 'string' || !token.startsWith('dl_')) return false;
    // Guard against oversized tokens
    if (token.length > 256) return false;

    const parts = token.split('_');
    if (parts.length !== 4) return false;
    const [, expiresAtStr, nonce, sig] = parts;
    if (!expiresAtStr || !nonce || !sig) return false;

    // Nonce must be 32 hex chars, signature slice must be 32 hex chars
    if (!/^[a-f0-9]{32}$/i.test(nonce) || !/^[a-f0-9]{32}$/i.test(sig)) return false;

    const expiresAtMs = Number(expiresAtStr);
    if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= Date.now()) return false;

    let secret: string;
    try {
      secret = this.getSigningSecret();
    } catch {
      return false; // Fail-closed when signing secret is missing, weak, or invalid
    }

    const expectedSig = crypto.createHmac('sha256', secret)
      .update(`${reportId}:${userId}:${expiresAtMs}:${nonce}`)
      .digest('hex')
      .slice(0, 32);

    try {
      const sigBuf = Buffer.from(sig, 'hex');
      const expectedBuf = Buffer.from(expectedSig, 'hex');
      if (sigBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  async verifyAndExecuteDownload(
    reportId: string,
    token: string,
    callerUserId?: string,
  ): Promise<{ fileName: string; mimeType: string; storageUrl: string; fileSize?: number }> {
    if (!token || typeof token !== 'string' || !token.startsWith('dl_')) {
      throw new UnauthorizedException('Download token is required and must be valid');
    }

    const report = await this.repository.findReportById(reportId);
    if (!report) {
      throw new NotFoundException('Medical report not found');
    }

    const attachment = report.attachments?.[0];
    if (!attachment) {
      throw new NotFoundException('Medical report attachment not found');
    }
    if (!attachment.storageUrl && !attachment.storageKey) {
      throw new BadRequestException('Attachment storage URL is not available');
    }

    // 1. Enforce virus scan status: PENDING, INFECTED, or missing/undefined are strictly rejected
    if (!attachment.virusScanStatus || attachment.virusScanStatus !== 'CLEAN') {
      throw new BadRequestException(
        `Attachment virus scan is ${attachment.virusScanStatus ? attachment.virusScanStatus.toLowerCase() : 'incomplete'}; download unavailable`,
      );
    }

    // 2. Caller profile authorization check if callerUserId is provided
    if (callerUserId) {
      const callerProfileId = await this.resolveProfile(callerUserId);
      if (report.patientProfileId !== callerProfileId) {
        throw new ForbiddenException('Access denied');
      }
    }

    // 3. Resolve owner's userId to verify the signed token
    let ownerUserId = callerUserId;
    if (!ownerUserId) {
      if ((report as any).patientProfile?.userId) {
        ownerUserId = (report as any).patientProfile.userId;
      } else if (this.repository.findProfileById) {
        const profile = await this.repository.findProfileById(report.patientProfileId);
        ownerUserId = profile?.userId;
      }
    }

    if (!ownerUserId) {
      throw new ForbiddenException('Access denied');
    }

    // 4. Validate the cryptographic token
    const isTokenValid = this.verifyDownloadToken(token, reportId, ownerUserId);
    if (!isTokenValid) {
      const parts = token.split('_');
      if (parts.length === 4) {
        const expiresAtMs = Number(parts[1]);
        if (Number.isSafeInteger(expiresAtMs) && expiresAtMs <= Date.now()) {
          throw new UnauthorizedException('Download token has expired');
        }
      }
      throw new UnauthorizedException('Invalid or tampered download token');
    }

    // 5. Generate genuine S3 pre-signed URL if Backblaze B2 is configured, or fail-closed if B2 is invalid
    let finalStorageUrl = attachment.storageUrl || '';
    if (this.b2StorageService && this.b2StorageService.isConfigured()) {
      const presigned = await this.b2StorageService.generatePresignedDownloadUrl({
        storageKey: attachment.storageKey,
        storageUrl: attachment.storageUrl,
        fileName: attachment.fileName,
      });
      finalStorageUrl = presigned.downloadUrl;
    } else if (process.env.B2_BUCKET_NAME || process.env.B2_KEY_ID || process.env.B2_APPLICATION_KEY) {
      if (this.b2StorageService) {
        await this.b2StorageService.generatePresignedDownloadUrl({
          storageKey: attachment.storageKey,
          storageUrl: attachment.storageUrl,
          fileName: attachment.fileName,
        });
      } else {
        throw new InternalServerErrorException(
          'Backblaze B2 storage credentials are not configured; secure presigned download is unavailable',
        );
      }
    }

    // 6. Non-blocking audit log
    try {
      await this.repository.createAuditLog({
        medicalReportId: report.id,
        action: 'DOWNLOAD',
        performedBy: callerUserId || ownerUserId,
        details: JSON.stringify({ fileName: attachment.fileName, downloadedAt: new Date().toISOString() }),
      });
    } catch {
      // Non-blocking audit failure
    }

    return {
      fileName: attachment.fileName || 'report.pdf',
      mimeType: attachment.mimeType || 'application/pdf',
      fileSize: attachment.fileSize,
      storageUrl: finalStorageUrl,
    };
  }

  async getPreviewMetadata(userId: string, reportId: string): Promise<PreviewMetadataResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const report = await this.repository.findReportById(reportId);

    if (!report) throw new NotFoundException('Medical report not found');
    if (report.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    const attachment = report.attachments?.[0];
    if (!attachment) {
      throw new NotFoundException('Medical report attachment not found');
    }
    if (!attachment.storageUrl && !attachment.storageKey) {
      throw new BadRequestException('Attachment storage URL is not available');
    }
    if (!attachment.virusScanStatus || attachment.virusScanStatus !== 'CLEAN') {
      throw new BadRequestException('Attachment virus scan is pending or failed; preview unavailable');
    }

    let signedStorageUrl: string;
    if (this.b2StorageService && this.b2StorageService.isConfigured()) {
      const presigned = await this.b2StorageService.generatePresignedDownloadUrl({
        storageKey: attachment.storageKey,
        storageUrl: attachment.storageUrl,
        fileName: attachment.fileName,
      });
      signedStorageUrl = presigned.downloadUrl;
    } else {
      const { token } = this.generateDownloadToken(report.id, userId);
      const separator = (attachment.storageUrl || '').includes('?') ? '&' : '?';
      signedStorageUrl = `${attachment.storageUrl}${separator}token=${token}`;
    }

    return {
      id: report.id,
      title: report.title,
      fileName: attachment.fileName || 'report.pdf',
      fileSize: attachment.fileSize || 524288,
      mimeType: attachment.mimeType || 'application/pdf',
      pageCount: report.pageCount || 1,
      language: report.language || 'en',
      storageUrl: signedStorageUrl,
      isPdf: (attachment.mimeType || 'application/pdf').toLowerCase() === 'application/pdf',
      verificationStatus: report.verificationStatus,
    };
  }
}
