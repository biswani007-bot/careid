import { Injectable, NotFoundException, BadRequestException, ForbiddenException, InternalServerErrorException, Inject } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { pipeline } from 'stream';
import { IMedicalRecordRepository } from '../../domain/repositories/medical-record.repository.interface';
import { CreateMedicalRecordDto, UpdateMedicalRecordDto, ProcedureDto, VitalSignsDto } from '../../presentation/dto/create-medical-record.dto';
import { CreateAttachmentDto, UpdateAttachmentDto } from '../../presentation/dto/create-attachment.dto';
import {
  MedicalRecordResponseDto,
  MedicalAttachmentResponseDto,
  AttachmentVersionResponseDto,
  MedicalTimelineItemDto,
} from '../../presentation/dto/medical-record-response.dto';
import { validateFileSecurity, validateDocumentBuffer, validateImageBuffer } from '@common/utils/file-security.util';
import { PresignedDownloadResult } from '@modules/storage/infrastructure/b2-storage.service';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/dicom',
  'image/tiff',
];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

import { QrService } from '@modules/qr/application/use-cases/qr.service';
import { QrEntityType } from '@modules/qr/presentation/dto/generate-qr.dto';
import { AntivirusScannerService } from '@modules/storage/infrastructure/antivirus-scanner.service';
import { B2StorageService } from '@modules/storage/infrastructure/b2-storage.service';
import { ClinicalPdfBuilder } from '@common/utils/clinical-pdf.builder';
import { Optional } from '@nestjs/common';

@Injectable()
export class MedicalRecordService {
  constructor(
    @Inject('IMedicalRecordRepository')
    private readonly repository: IMedicalRecordRepository,
    private readonly qrService: QrService,
    @Optional()
    private readonly antivirusScanner?: AntivirusScannerService,
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

  private calculateBmi(heightCm?: number, weightKg?: number): number | undefined {
    if (heightCm && weightKg && heightCm > 0) {
      const heightM = heightCm / 100;
      return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
    }
    return undefined;
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private deriveCategory(r: any): string {
    const encTypes = (r.encounters || []).map((e: any) => (e.encounterType || '').toUpperCase()).join(' ');
    const text = `${r.title || ''} ${r.chiefComplaint || ''} ${r.clinicalNotes || ''} ${encTypes}`.toUpperCase();
    if (encTypes.includes('DENTAL') || text.includes('DENTAL') || text.includes('TOOTH') || text.includes('TEETH')) {
      return 'DENTAL';
    }
    if (encTypes.includes('VISION') || encTypes.includes('OPHTHAL') || text.includes('VISION') || text.includes('EYE') || text.includes('OPTOMETRY')) {
      return 'VISION';
    }
    return 'GENERAL_MEDICAL';
  }

  private mapRecord(r: any, isFav = false): MedicalRecordResponseDto {
    const category = this.deriveCategory(r);
    return {
      id: r.id,
      patientProfileId: r.patientProfileId,
      title: r.title,
      chiefComplaint: r.chiefComplaint || undefined,
      clinicalNotes: r.clinicalNotes || undefined,
      treatmentPlan: r.treatmentPlan || undefined,
      followUpInstructions: r.followUpInstructions || undefined,
      category,
      subCategory: r.encounters?.[0]?.encounterType || undefined,
      status: r.status,
      isDeleted: r.isDeleted,
      deletedAt: r.deletedAt?.toISOString() || undefined,
      encounters: r.encounters || [],
      diagnoses: r.diagnoses || [],
      vitalSigns: r.vitalSigns || [],
      procedures: r.procedures || [],
      attachments: r.attachments?.map((a: any) => this.mapAttachment(a)) || [],
      isFavorite: isFav,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private mapAttachment(a: any): MedicalAttachmentResponseDto {
    return {
      id: a.id,
      medicalRecordId: a.medicalRecordId || undefined,
      patientProfileId: a.patientProfileId,
      fileName: a.fileName,
      originalName: a.originalName,
      fileSize: a.fileSize,
      mimeType: a.mimeType,
      category: a.category,
      storageKey: a.storageKey,
      storageUrl: a.storageUrl,
      checksum: a.checksum || undefined,
      version: a.version,
      isDeleted: a.isDeleted,
      virusScanStatus: a.virusScanStatus,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }

  // ─── Medical Records Lifecycle ────────────────────────────────────────────

  async createRecord(
    userId: string,
    dto: CreateMedicalRecordDto,
    roles: string[] = [],
  ): Promise<MedicalRecordResponseDto> {
    const isStaffOrDoctorOrAdmin = roles.some((r) =>
      ['DOCTOR', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );

    let profileId: string;
    if (isStaffOrDoctorOrAdmin && (dto.patientProfileId || dto.patientId)) {
      const targetIdentifier = dto.patientProfileId || dto.patientId;
      const targetPatient = await this.repository.findPatientProfileById(targetIdentifier!);
      if (!targetPatient) {
        throw new NotFoundException(`Patient profile '${targetIdentifier}' not found`);
      }
      profileId = targetPatient.id;
    } else {
      profileId = await this.resolveProfile(userId);
    }

    // Calculate BMI if vitals provided
    if (dto.vitalSigns && dto.vitalSigns.heightCm && dto.vitalSigns.weightKg) {
      (dto.vitalSigns as any).bmi = this.calculateBmi(dto.vitalSigns.heightCm, dto.vitalSigns.weightKg);
    }

    const recordPayload: any = {
      ...dto,
      createdById: userId,
    };

    // If category (e.g. DENTAL, VISION) is specified, ensure encounterType reflects it
    if (dto.category && ['DENTAL', 'VISION'].includes(dto.category.toUpperCase())) {
      const cat = dto.category.toUpperCase();
      if (!recordPayload.encounter) {
        recordPayload.encounter = {
          encounterType: cat,
          encounterDate: new Date().toISOString(),
        };
      } else if (!recordPayload.encounter.encounterType || recordPayload.encounter.encounterType === 'CONSULTATION') {
        recordPayload.encounter.encounterType = cat;
      }
    }

    const record = await this.repository.createRecord(profileId, recordPayload);

    await this.repository.createAuditLog({
      medicalRecordId: record.id,
      action: 'CREATED',
      performedBy: userId,
      details: `Created medical record: ${record.title} [${dto.category || 'GENERAL_MEDICAL'}]`,
    });

    return this.mapRecord(record);
  }

  async getRecords(userId: string, category?: string, onlyFavorites = false): Promise<MedicalRecordResponseDto[]> {
    const profileId = await this.resolveProfile(userId);
    const records = await this.repository.findRecordsByProfile(profileId, true);
    const favIds = (typeof this.repository.getFavoriteRecordIds === 'function' ? await this.repository.getFavoriteRecordIds(profileId, userId) : []) || [];
    let mapped = records.map((r) => this.mapRecord(r, favIds.includes(r.id)));

    if (onlyFavorites) {
      mapped = mapped.filter((r) => r.isFavorite);
    }

    if (category) {
      const catUpper = category.toUpperCase();
      if (catUpper === 'DENTAL') {
        mapped = mapped.filter((r) => r.category === 'DENTAL');
      } else if (catUpper === 'VISION') {
        mapped = mapped.filter((r) => r.category === 'VISION');
      } else if (catUpper === 'MEDICAL' || catUpper === 'GENERAL_MEDICAL') {
        mapped = mapped.filter((r) => r.category === 'GENERAL_MEDICAL');
      }
    }

    return mapped;
  }

  async setFavoriteRecord(userId: string, recordId: string, isFav: boolean): Promise<{ success: boolean; isFavorite: boolean }> {
    const profileId = await this.resolveProfile(userId);
    const record = await this.repository.findRecordById(recordId);
    if (!record) {
      throw new NotFoundException(`Medical record '${recordId}' not found`);
    }
    if (record.patientProfileId !== profileId) {
      throw new ForbiddenException('Access denied');
    }
    await this.repository.setFavoriteRecord(record.id, userId, isFav);
    return { success: true, isFavorite: isFav };
  }

  async getFavoriteRecords(userId: string): Promise<MedicalRecordResponseDto[]> {
    return this.getRecords(userId, undefined, true);
  }

  async exportRecordsPdf(userId: string, recordIds?: string[]): Promise<Buffer> {
    const profile = await this.repository.findProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Patient profile not found. Please complete registration first.');
    }
    let records = await this.repository.findRecordsByProfile(profile.id, true);
    if (recordIds && recordIds.length > 0) {
      records = records.filter((r) => recordIds.includes(r.id));
    }

    const mappedRecords = records.map((r: any) => ({
      title: r.title,
      encounterDate: r.encounters?.[0]?.encounterDate || r.createdAt,
      chiefComplaint: r.chiefComplaint,
      clinicalNotes: r.clinicalNotes,
      status: r.status,
    }));

    const timeline = await this.getTimeline(userId);

    const buffer = ClinicalPdfBuilder.generateUnifiedClinicalRecordPdf({
      patient: profile,
      doctor: { fullName: 'CareID Self-Service Export', primarySpecialization: 'Personal Health Records' },
      prescriptions: [],
      medicalRecords: mappedRecords,
      timeline: timeline || [],
      admissions: [],
    });

    await this.repository.createAuditLog({
      action: 'PATIENT_EXPORT_PDF_GENERATED',
      performedBy: userId,
      details: `Patient exported ${mappedRecords.length} clinical records as unified PDF`,
    });

    return buffer;
  }

  async getRecordById(userId: string, recordId: string, roles: string[] = []): Promise<MedicalRecordResponseDto> {
    const isStaffOrDoctorOrAdmin = roles.some((r) =>
      ['DOCTOR', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    const record = await this.repository.findRecordById(recordId);

    if (!record) throw new NotFoundException('Medical record not found');
    if (!isStaffOrDoctorOrAdmin) {
      const profileId = await this.resolveProfile(userId);
      if (record.patientProfileId !== profileId) throw new ForbiddenException('Access denied');
      const favIds = (typeof this.repository.getFavoriteRecordIds === 'function' ? await this.repository.getFavoriteRecordIds(profileId, userId) : []) || [];
      return this.mapRecord(record, favIds.includes(record.id));
    }

    return this.mapRecord(record, false);
  }

  async updateRecord(
    userId: string,
    recordId: string,
    dto: UpdateMedicalRecordDto,
    roles: string[] = [],
  ): Promise<MedicalRecordResponseDto> {
    const isStaffOrAdmin = roles.some((r) =>
      ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()),
    );
    const record = await this.repository.findRecordById(recordId);

    if (!record) throw new NotFoundException('Medical record not found');
    if (!isStaffOrAdmin) {
      const profileId = await this.resolveProfile(userId);
      if (record.patientProfileId !== profileId) throw new ForbiddenException('Access denied');
    }
    if (record.status === 'ARCHIVED' && !isStaffOrAdmin) {
      throw new BadRequestException('Archived medical records are immutable and cannot be updated. Restore it first.');
    }

    const updated = await this.repository.updateRecord(recordId, dto);

    await this.repository.createAuditLog({
      medicalRecordId: recordId,
      action: 'UPDATED',
      performedBy: userId,
      details: `Updated medical record fields`,
    });

    return this.mapRecord(updated);
  }

  async softDeleteRecord(userId: string, recordId: string): Promise<{ message: string }> {
    const profileId = await this.resolveProfile(userId);
    const record = await this.repository.findRecordById(recordId);

    if (!record) throw new NotFoundException('Medical record not found');
    if (record.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    await this.repository.softDeleteRecord(recordId);

    await this.repository.createAuditLog({
      medicalRecordId: recordId,
      action: 'SOFT_DELETED',
      performedBy: userId,
    });

    return { message: 'Medical record soft-deleted successfully' };
  }

  async archiveRecord(
    userId: string,
    recordId: string,
    roles: string[] = [],
  ): Promise<MedicalRecordResponseDto> {
    const isStaffOrAdmin = roles.some((r) =>
      ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()),
    );
    const record = await this.repository.findRecordById(recordId);

    if (!record) throw new NotFoundException('Medical record not found');
    if (!isStaffOrAdmin) {
      const profileId = await this.resolveProfile(userId);
      if (record.patientProfileId !== profileId) throw new ForbiddenException('Access denied');
    }
    if (record.status === 'ARCHIVED') throw new BadRequestException('Record is already archived');

    const updated = await this.repository.updateRecord(recordId, { status: 'ARCHIVED' });

    await this.repository.createAuditLog({
      medicalRecordId: recordId,
      action: 'ARCHIVED',
      performedBy: userId,
    });

    return this.mapRecord(updated);
  }

  async restoreRecord(
    userId: string,
    recordId: string,
    roles: string[] = [],
  ): Promise<MedicalRecordResponseDto> {
    const isStaffOrAdmin = roles.some((r) =>
      ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()),
    );
    const record = await this.repository.findRecordById(recordId, true);

    if (!record) throw new NotFoundException('Medical record not found');
    if (!isStaffOrAdmin) {
      const profileId = await this.resolveProfile(userId);
      if (record.patientProfileId !== profileId) throw new ForbiddenException('Access denied');
    }
    if (!record.isDeleted && record.status !== 'ARCHIVED') {
      throw new BadRequestException('Record is not deleted or archived');
    }

    const restored = await this.repository.restoreRecord(recordId);

    await this.repository.createAuditLog({
      medicalRecordId: recordId,
      action: 'RESTORED',
      performedBy: userId,
    });

    return this.mapRecord(restored);
  }

  async searchRecords(userId: string, query: string): Promise<MedicalRecordResponseDto[]> {
    const profileId = await this.resolveProfile(userId);
    if (!query || query.trim().length === 0) {
      return this.getRecords(userId);
    }
    const records = await this.repository.searchRecords(profileId, query.trim());
    return records.map((r) => this.mapRecord(r));
  }

  async getTimeline(userId: string): Promise<MedicalTimelineItemDto[]> {
    const profileId = await this.resolveProfile(userId);
    const rawEvents = await this.repository.getTimeline(profileId);
    return rawEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      title: e.title,
      status: e.status || undefined,
      category: e.category || undefined,
      date: new Date(e.date).toISOString(),
      details: e.details,
    }));
  }

  // ─── Attachments Infrastructure ──────────────────────────────────────────

  async uploadAttachment(
    userId: string,
    recordId: string | null,
    dto: any,
    roles: string[] = [],
    file?: any,
  ): Promise<MedicalAttachmentResponseDto> {
    const isStaffOrDoctorOrAdmin = roles.some((r) =>
      ['DOCTOR', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );

    let targetProfileId: string;

    if (!isStaffOrDoctorOrAdmin) {
      const callerProfile = await this.repository.findProfileByUserId(userId);
      if (!callerProfile) {
        throw new NotFoundException('Patient profile not found. Please complete registration first.');
      }
      if (dto?.patientProfileId && dto.patientProfileId !== callerProfile.id && dto.patientProfileId !== userId) {
        throw new ForbiddenException('Patients may only upload attachments for their own profile');
      }
      targetProfileId = callerProfile.id;
    } else {
      let targetIdentifier = dto?.patientProfileId || dto?.patientId;
      if (!targetIdentifier && recordId) {
        const existingRecord = await this.repository.findRecordById(recordId);
        if (existingRecord?.patientProfileId) {
          targetIdentifier = existingRecord.patientProfileId;
        }
      }
      if (!targetIdentifier) {
        throw new BadRequestException('patientProfileId or recordId is required for clinical attachment uploads');
      }
      const targetPatient = await this.repository.findPatientProfileById(targetIdentifier);
      if (!targetPatient) {
        throw new NotFoundException(`Patient profile '${targetIdentifier}' not found`);
      }
      targetProfileId = targetPatient.id;

      const isDoctor = roles.some((r) => r.toUpperCase() === 'DOCTOR');
      const isSuperOrAdmin = roles.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()));
      if (isDoctor && !isSuperOrAdmin) {
        const hasAccess = await this.repository.verifyDoctorAccessToPatient(userId, targetProfileId);
        if (!hasAccess) {
          throw new ForbiddenException('Access denied: You are not authorized to upload attachments for this patient');
        }
      }
    }

    let fileName: string;
    let originalName: string;
    let fileSize: number;
    let mimeType: string;
    let storageKey: string;
    let storageUrl: string;
    let checksum: string | undefined = dto?.checksum;
    let targetDiskPath: string | undefined;

    const isProfilePhoto = dto?.category?.toUpperCase() === 'PROFILE_PHOTO';

    if (file) {
      if (isProfilePhoto) {
        if (file.size > 5 * 1024 * 1024) {
          throw new BadRequestException(`Profile photo size exceeds maximum limit of 5MB (${file.size} bytes provided)`);
        }
        const photoExt = path.extname(file.originalname || '').toLowerCase();
        const allowedPhotoExts = ['.jpg', '.jpeg', '.png', '.webp'];
        if (!allowedPhotoExts.includes(photoExt)) {
          throw new BadRequestException(`Profile photo extension '${photoExt}' is not supported. Allowed: ${allowedPhotoExts.join(', ')}`);
        }
        const photoMime = file.mimetype || '';
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(photoMime)) {
          throw new BadRequestException('Profile photo must be a valid JPEG, PNG, or WebP image');
        }
        if (file.buffer) {
          validateImageBuffer(file.buffer);
          checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
        }
      } else {
        if (file.size > MAX_FILE_SIZE) {
          throw new BadRequestException(`File size exceeds maximum limit of 15MB (${file.size} bytes provided)`);
        }
        const rawExt = path.extname(file.originalname || '').toLowerCase();
        const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.dcm'];
        if (!allowedExts.includes(rawExt)) {
          throw new BadRequestException(`File extension '${rawExt}' is not supported. Allowed: ${allowedExts.join(', ')}`);
        }

        if (file.buffer) {
          validateDocumentBuffer(file.buffer);
          checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
        }
      }

      originalName = (file.originalname || 'document').replace(/[\0\r\n]/g, '');
      const safeOriginal = originalName.replace(/[^a-zA-Z0-9_.-]/g, '_');
      fileName = `att-${targetProfileId}-${Date.now()}-${safeOriginal}`;
      fileSize = file.size;
      mimeType = file.mimetype || 'application/octet-stream';
      storageKey = `attachments/${fileName}`;
      storageUrl = `/api/v1/attachments/file/${fileName}`;

      const uploadDir = path.join(process.cwd(), 'data', 'uploads', 'attachments');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      targetDiskPath = path.join(uploadDir, fileName);
      if (file.buffer) {
        fs.writeFileSync(targetDiskPath, file.buffer);

        if (this.b2StorageService?.isConfigured()) {
          try {
            await this.b2StorageService.uploadFile({
              key: storageKey,
              buffer: file.buffer,
              contentType: mimeType,
              metadata: {
                patientProfileId: targetProfileId,
                originalName: safeOriginal,
              },
            });
          } catch (b2Err: any) {
            if (targetDiskPath && fs.existsSync(targetDiskPath)) {
              try {
                fs.unlinkSync(targetDiskPath);
              } catch {}
            }
            throw new InternalServerErrorException(`Failed to upload attachment to object storage: ${b2Err.message}`);
          }
        }
      }
    } else {
      if (isProfilePhoto) {
        if (dto.fileSize && dto.fileSize > 5 * 1024 * 1024) {
          throw new BadRequestException('Profile photo size exceeds maximum limit of 5MB');
        }
        if (dto.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(dto.mimeType)) {
          throw new BadRequestException('Profile photo must be a valid JPEG, PNG, or WebP image');
        }
      }

      validateFileSecurity({
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        storageKey: dto.storageKey,
        storageUrl: dto.storageUrl,
        allowedMimeTypes: isProfilePhoto ? ['image/jpeg', 'image/png', 'image/webp'] : ALLOWED_MIME_TYPES,
      });

      fileName = this.sanitizeFilename(dto.fileName);
      originalName = dto.originalName;
      fileSize = dto.fileSize;
      mimeType = dto.mimeType;
      storageKey = dto.storageKey;
      storageUrl = dto.storageUrl;
    }

    // If recordId provided, verify record ownership
    if (recordId) {
      const record = await this.repository.findRecordById(recordId);
      if (!record) throw new NotFoundException('Target medical record not found');
      if (record.patientProfileId !== targetProfileId) throw new ForbiddenException('Access denied');
    }

    const validCategories = [
      'IMAGE', 'PDF', 'DICOM', 'SCANNED_DOC', 'PRESCRIPTION',
      'REFERRAL_LETTER', 'LAB_RESULT', 'RADIOLOGY', 'CLINICAL_NOTE', 'OTHER',
    ];
    let sanitizedCategory = 'OTHER';
    if (isProfilePhoto) {
      sanitizedCategory = 'IMAGE';
    } else if (dto?.category && validCategories.includes(dto.category.toUpperCase())) {
      sanitizedCategory = dto.category.toUpperCase();
    } else if (dto?.category?.toUpperCase() === 'LAB_REPORT') {
      sanitizedCategory = 'LAB_RESULT';
    }

    let attachment: any;
    try {
      attachment = await this.repository.createAttachment({
        medicalRecordId: recordId,
        patientProfileId: targetProfileId,
        fileName,
        originalName,
        fileSize,
        mimeType,
        category: sanitizedCategory,
        storageKey,
        storageUrl,
        checksum,
        virusScanStatus: 'PENDING',
        createdById: userId,
      });

      if (isProfilePhoto && this.repository.updatePatientProfilePhoto) {
        await this.repository.updatePatientProfilePhoto(targetProfileId, storageUrl, storageKey);
      }
    } catch (dbErr: any) {
      if (targetDiskPath && fs.existsSync(targetDiskPath)) {
        try {
          fs.unlinkSync(targetDiskPath);
        } catch {}
      }
      if (this.b2StorageService?.isConfigured() && storageKey) {
        await this.b2StorageService.deleteFile(storageKey).catch(() => {});
      }
      throw dbErr;
    }

    await this.repository.createAuditLog({
      medicalRecordId: recordId || undefined,
      attachmentId: attachment.id,
      action: 'ATTACHMENT_UPLOADED',
      performedBy: userId,
      details: `Uploaded attachment: ${fileName} for patient ${targetProfileId}`,
    });

    if (this.antivirusScanner && attachment?.id) {
      this.antivirusScanner.scanAttachment(attachment.id).catch(() => {});
    }

    const mapped = this.mapAttachment(attachment);
    if (isProfilePhoto) {
      mapped.category = 'PROFILE_PHOTO' as any;
    }
    return mapped;
  }

  async serveAttachmentFile(
    filename: string,
    callerUserId?: string,
    roles: string[] = [],
    res?: any,
  ): Promise<void> {
    if (
      !filename ||
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\') ||
      !/^att-[a-zA-Z0-9_.-]+$/i.test(filename)
    ) {
      throw new BadRequestException('Invalid filename format or path traversal attempt detected');
    }

    const uploadDir = path.resolve(process.cwd(), 'data', 'uploads', 'attachments');
    const filePath = path.resolve(uploadDir, filename);
    if (!filePath.startsWith(uploadDir)) {
      throw new BadRequestException('Path traversal attempt detected');
    }

    // Authorization against attachment owner/patient
    const uuidMatch = filename.match(/^att-([0-9a-fA-F-]{36})-/);
    const fileTargetProfileId = uuidMatch ? uuidMatch[1] : (filename.split('-')[1] || null);

    const isAdmin = roles.some((r) => ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(r.toUpperCase()));
    if (!isAdmin && callerUserId) {
      if (roles.some((r) => ['DOCTOR', 'PRACTITIONER'].includes(r.toUpperCase()))) {
        if (fileTargetProfileId) {
          const hasAccess = await this.repository.verifyDoctorAccessToPatient(callerUserId, fileTargetProfileId);
          if (!hasAccess) {
            throw new ForbiddenException('Access denied: You do not have permission to view this attachment');
          }
        }
      } else {
        let callerProfileId: string | null = null;
        try {
          callerProfileId = await this.resolveProfile(callerUserId);
        } catch {
          callerProfileId = null;
        }
        if (fileTargetProfileId && fileTargetProfileId !== callerProfileId) {
          throw new ForbiddenException('Access denied: You do not have permission to view this attachment');
        }
      }
    } else if (!callerUserId) {
      throw new ForbiddenException('Authentication required');
    }

    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.tiff': 'image/tiff',
      '.dcm': 'application/dicom',
    };

    if (!fs.existsSync(filePath)) {
      if (this.b2StorageService?.isConfigured()) {
        try {
          const { stream, contentType } = await this.b2StorageService.getObjectStream(`attachments/${filename}`);
          if (res) {
            res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Content-Type', contentType || mimeMap[ext] || 'application/octet-stream');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

            const onAbort = () => {
              if (stream && typeof stream.destroy === 'function' && !res.writableEnded) {
                stream.destroy();
              }
            };
            res.on('close', onAbort);

            pipeline(stream, res, (err) => {
              res.removeListener('close', onAbort);
              if (err && !res.headersSent) {
                res.status(502).end();
              }
            });
            return;
          }
        } catch (err: any) {
          if (res && !res.headersSent) {
            if (err instanceof NotFoundException || err.status === 404) {
              res.status(404).json({ success: false, message: 'Attachment file not found' });
              return;
            }
            res.status(502).json({ success: false, message: `Storage stream unavailable: ${err.message}` });
            return;
          }
          throw err;
        }
      }
      throw new NotFoundException('Attachment file not found');
    }

    if (res) {
      res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

      const fileStream = fs.createReadStream(filePath);
      const onAbort = () => {
        if (!res.writableEnded) {
          fileStream.destroy();
        }
      };
      res.on('close', onAbort);

      pipeline(fileStream, res, (err) => {
        res.removeListener('close', onAbort);
        if (err && !res.headersSent) {
          res.status(500).end();
        }
      });
    }
  }

  async uploadRecordWithFile(
    userId: string,
    dto: {
      category?: string;
      title?: string;
      recordType?: string;
      serviceDate?: string;
      doctorName?: string;
      facilityName?: string;
      department?: string;
      notes?: string;
      chiefComplaint?: string;
      fileCategory?: string;
      patientProfileId?: string;
      patientId?: string;
    },
    roles: string[] = [],
    file?: any,
  ): Promise<MedicalRecordResponseDto> {
    const rawCategory = dto?.category?.toUpperCase() || 'GENERAL_MEDICAL';
    const category = ['GENERAL_MEDICAL', 'DENTAL', 'VISION'].includes(rawCategory)
      ? rawCategory
      : 'GENERAL_MEDICAL';

    const cleanTitle = dto?.title?.trim() || (file?.originalname ? `Record: ${file.originalname}` : `${category} Clinical Record`);
    const serviceDate = dto?.serviceDate ? new Date(dto.serviceDate).toISOString() : new Date().toISOString();

    const targetPatientId = dto?.patientProfileId || dto?.patientId;
    const createdRecord = await this.createRecord(userId, {
      title: cleanTitle,
      category: category as any,
      patientProfileId: targetPatientId,
      patientId: targetPatientId,
      chiefComplaint: dto?.chiefComplaint || dto?.recordType || undefined,
      clinicalNotes: dto?.notes || undefined,
      encounter: (dto?.doctorName || dto?.facilityName) ? {
        providerName: dto.doctorName,
        facilityName: dto.facilityName,
        encounterDate: serviceDate,
      } : undefined,
    } as CreateMedicalRecordDto, roles);

    if (file) {
      await this.uploadAttachment(
        userId,
        createdRecord.id,
        {
          category: dto?.fileCategory || 'SCANNED_DOC',
          patientProfileId: createdRecord.patientProfileId,
        },
        roles,
        file,
      );
    }

    return this.getRecordById(userId, createdRecord.id, roles);
  }

  async getRecordAttachments(userId: string, recordId: string): Promise<MedicalAttachmentResponseDto[]> {
    const profileId = await this.resolveProfile(userId);
    const record = await this.repository.findRecordById(recordId);

    if (!record) throw new NotFoundException('Medical record not found');
    if (record.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    const attachments = await this.repository.findAttachmentsByRecord(recordId);
    return attachments.map((a) => this.mapAttachment(a));
  }

  async getAttachmentById(userId: string, attachmentId: string): Promise<MedicalAttachmentResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const attachment = await this.repository.findAttachmentById(attachmentId);

    if (!attachment) throw new NotFoundException('Attachment not found');
    if (attachment.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    return this.mapAttachment(attachment);
  }

  async updateAttachment(userId: string, attachmentId: string, dto: UpdateAttachmentDto): Promise<MedicalAttachmentResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const attachment = await this.repository.findAttachmentById(attachmentId);

    if (!attachment) throw new NotFoundException('Attachment not found');
    if (attachment.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    const updated = await this.repository.updateAttachment(attachmentId, {
      ...dto,
      createdById: userId,
    });

    await this.repository.createAuditLog({
      attachmentId,
      action: 'ATTACHMENT_UPDATED',
      performedBy: userId,
      details: dto.storageKey ? 'Uploaded new attachment version' : 'Updated attachment metadata',
    });

    return this.mapAttachment(updated);
  }

  async softDeleteAttachment(userId: string, attachmentId: string): Promise<{ message: string }> {
    const profileId = await this.resolveProfile(userId);
    const attachment = await this.repository.findAttachmentById(attachmentId);

    if (!attachment) throw new NotFoundException('Attachment not found');
    if (attachment.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    await this.repository.softDeleteAttachment(attachmentId);

    await this.repository.createAuditLog({
      attachmentId,
      action: 'ATTACHMENT_DELETED',
      performedBy: userId,
    });

    return { message: 'Attachment soft-deleted successfully' };
  }

  async restoreAttachment(userId: string, attachmentId: string): Promise<MedicalAttachmentResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const attachment = await this.repository.findAttachmentById(attachmentId, true);

    if (!attachment) throw new NotFoundException('Attachment not found');
    if (attachment.patientProfileId !== profileId) throw new ForbiddenException('Access denied');
    if (!attachment.isDeleted) throw new BadRequestException('Attachment is not deleted');

    const restored = await this.repository.restoreAttachment(attachmentId);

    await this.repository.createAuditLog({
      attachmentId,
      action: 'ATTACHMENT_RESTORED',
      performedBy: userId,
    });

    return this.mapAttachment(restored);
  }

  async getAttachmentVersions(userId: string, attachmentId: string): Promise<AttachmentVersionResponseDto[]> {
    const profileId = await this.resolveProfile(userId);
    const attachment = await this.repository.findAttachmentById(attachmentId, true);

    if (!attachment) throw new NotFoundException('Attachment not found');
    if (attachment.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    const versions = await this.repository.findAttachmentVersions(attachmentId);
    return versions.map((v) => ({
      id: v.id,
      attachmentId: v.attachmentId,
      version: v.version,
      storageKey: v.storageKey,
      storageUrl: v.storageUrl,
      fileSize: v.fileSize,
      createdById: v.createdById || undefined,
      createdAt: v.createdAt.toISOString(),
    }));
  }

  async getPresignedAttachmentUrl(
    attachmentId: string,
    callerUserId: string,
    roles: string[] = [],
    expiresInSeconds?: number,
  ): Promise<PresignedDownloadResult> {
    const attachment = await this.repository.findAttachmentById(attachmentId);
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const isAdmin = roles.some((r) => ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(r.toUpperCase()));
    if (!isAdmin) {
      if (roles.some((r) => ['DOCTOR', 'PRACTITIONER'].includes(r.toUpperCase()))) {
        const hasAccess = await this.repository.verifyDoctorAccessToPatient(callerUserId, attachment.patientProfileId);
        if (!hasAccess) {
          throw new ForbiddenException('Access denied: You do not have permission to download this attachment');
        }
      } else {
        let profileId: string | null = null;
        try {
          profileId = await this.resolveProfile(callerUserId);
        } catch {
          profileId = null;
        }
        if (!profileId || attachment.patientProfileId !== profileId) {
          throw new ForbiddenException('Access denied: You do not have permission to download this attachment');
        }
      }
    }

    if (!this.b2StorageService || !this.b2StorageService.isConfigured()) {
      throw new InternalServerErrorException('Backblaze B2 storage is not configured for presigned downloads');
    }

    return this.b2StorageService.generatePresignedDownloadUrl({
      storageKey: attachment.storageKey,
      storageUrl: attachment.storageUrl,
      fileName: attachment.originalName || attachment.fileName,
      expiresInSeconds,
    });
  }

  // ─── Stage 17: Document Procedure Details (Cath Lab / Intra-Op) ────────────
  async addEncounterProcedure(
    userId: string,
    encounterOrRecordId: string,
    dto: ProcedureDto,
  ): Promise<any> {
    const encounter = await this.repository.findEncounterById(encounterOrRecordId);
    let targetRecordId: string;
    if (encounter) {
      targetRecordId = encounter.medicalRecordId;
    } else {
      const record = await this.repository.findRecordById(encounterOrRecordId);
      if (!record) {
        throw new NotFoundException(`Encounter or Medical Record '${encounterOrRecordId}' not found`);
      }
      targetRecordId = record.id;
    }

    const created = await this.repository.addProcedureToRecord(targetRecordId, dto);

    try {
      await this.repository.createAuditLog({
        medicalRecordId: targetRecordId,
        action: 'PROCEDURE_DOCUMENTED',
        performedBy: userId,
        details: `Documented procedure: ${dto.name} (${dto.code || 'NO_CODE'})`,
      });
    } catch {}

    return {
      id: created.id,
      encounterId: encounter?.id || null,
      medicalRecordId: created.medicalRecordId,
      name: created.name,
      code: created.code,
      performedAt: created.performedAt ? new Date(created.performedAt).toISOString() : null,
      notes: created.notes,
      createdAt: created.createdAt ? new Date(created.createdAt).toISOString() : new Date().toISOString(),
    };
  }

  // ─── Stage 18: Record Hemodynamic Vitals (Cath Lab / Intra-Op) ──────────────
  async addEncounterHemodynamics(
    userId: string,
    encounterOrRecordId: string,
    dto: VitalSignsDto,
  ): Promise<any> {
    const encounter = await this.repository.findEncounterById(encounterOrRecordId);
    let targetRecordId: string;
    if (encounter) {
      targetRecordId = encounter.medicalRecordId;
    } else {
      const record = await this.repository.findRecordById(encounterOrRecordId);
      if (!record) {
        throw new NotFoundException(`Encounter or Medical Record '${encounterOrRecordId}' not found`);
      }
      targetRecordId = record.id;
    }

    const created = await this.repository.addVitalSignsToRecord(targetRecordId, dto);

    try {
      await this.repository.createAuditLog({
        medicalRecordId: targetRecordId,
        action: 'HEMODYNAMICS_DOCUMENTED',
        performedBy: userId,
        details: `Intra-op vitals recorded: BP ${dto.systolicBp}/${dto.diastolicBp}, Pulse ${dto.pulseBpm}, SpO2 ${dto.oxygenSaturation}%`,
      });
    } catch {}

    return {
      id: created.id,
      encounterId: encounter?.id || null,
      medicalRecordId: created.medicalRecordId,
      systolicBp: created.systolicBp,
      diastolicBp: created.diastolicBp,
      pulseBpm: created.pulseBpm,
      respirationRate: created.respirationRate,
      temperatureC: created.temperatureC,
      oxygenSaturation: created.oxygenSaturation,
      recordedAt: created.recordedAt ? new Date(created.recordedAt).toISOString() : new Date().toISOString(),
    };
  }

  // ─── Clinical Addenda (Priority 2) ────────────────────────────────────────

  async createAddendum(
    userId: string,
    recordId: string,
    dto: { addendumNotes: string; reason?: string },
    roles: string[] = [],
    ipAddress?: string,
  ): Promise<any> {
    const record = await this.repository.findRecordById(recordId);
    if (!record) {
      throw new NotFoundException(`Medical record '${recordId}' not found`);
    }

    const isStaffOrDoctorOrAdmin = roles.some((r) =>
      ['DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    if (!isStaffOrDoctorOrAdmin) {
      throw new ForbiddenException('Only clinicians and authorized staff may append clinical addenda');
    }

    let authorName = 'Dr. Clinical Provider';
    try {
      const callerProfile: any = await this.repository.findProfileByUserId(userId);
      if (callerProfile) {
        authorName = `${callerProfile.firstName || ''} ${callerProfile.lastName || ''}`.trim() || authorName;
      }
    } catch {}

    const addendum = await this.repository.createAddendum({
      medicalRecordId: record.id,
      authorDoctorId: userId,
      authorName,
      addendumNotes: dto.addendumNotes,
      reason: dto.reason,
    });

    try {
      await this.repository.createAuditLog({
        medicalRecordId: record.id,
        action: 'ADDENDUM_APPENDED',
        performedBy: userId,
        details: `Clinical addendum appended by ${authorName} (${userId})`,
      });
    } catch {}

    return {
      id: addendum.id,
      medicalRecordId: addendum.medicalRecordId,
      authorDoctorId: addendum.authorDoctorId,
      authorName: addendum.authorName,
      addendumNotes: addendum.addendumNotes,
      reason: addendum.reason || undefined,
      createdAt: addendum.createdAt.toISOString(),
    };
  }

  async getAddenda(userId: string, recordId: string, roles: string[] = []): Promise<any[]> {
    const record = await this.repository.findRecordById(recordId);
    if (!record) {
      throw new NotFoundException(`Medical record '${recordId}' not found`);
    }

    const isStaffOrDoctorOrAdmin = roles.some((r) =>
      ['DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    if (!isStaffOrDoctorOrAdmin) {
      const callerProfile = await this.repository.findProfileByUserId(userId);
      if (!callerProfile || callerProfile.id !== record.patientProfileId) {
        throw new ForbiddenException('Access to medical record addenda denied');
      }
    }

    const list = await this.repository.findAddendaByRecordId(record.id);
    return list.map((a: any) => ({
      id: a.id,
      medicalRecordId: a.medicalRecordId,
      authorDoctorId: a.authorDoctorId,
      authorName: a.authorName,
      addendumNotes: a.addendumNotes,
      reason: a.reason || undefined,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  // ─── Record Share Grants (Priority 9) ─────────────────────────────────────

  async createShareGrant(
    userId: string,
    recordId: string,
    dto: { recipientType: string; recipientTarget: string; purpose: string; expiryHours?: number },
    roles: string[] = [],
    ipAddress?: string,
  ): Promise<any> {
    const record = await this.repository.findRecordById(recordId);
    if (!record) {
      throw new NotFoundException(`Medical record '${recordId}' not found`);
    }

    const isAuthorized = roles.some((r) =>
      ['DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    if (!isAuthorized) {
      const callerProfile = await this.repository.findProfileByUserId(userId);
      if (!callerProfile || callerProfile.id !== record.patientProfileId) {
        throw new ForbiddenException('You do not have permission to share this record');
      }
    }

    const hours = Math.min(Math.max(1, dto.expiryHours || 72), 720);
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000);
    const shareToken = `csg_${crypto.randomBytes(24).toString('hex')}`;

    const grant = await this.repository.createShareGrant({
      medicalRecordId: record.id,
      grantedByDoctorId: userId,
      recipientType: dto.recipientType.toUpperCase(),
      recipientTarget: dto.recipientTarget,
      purpose: dto.purpose,
      shareToken,
      expiresAt,
    });

    try {
      await this.repository.createAuditLog({
        medicalRecordId: record.id,
        action: 'RECORD_SHARED',
        performedBy: userId,
        details: `Share grant created for ${grant.recipientType} (${grant.recipientTarget}). Purpose: ${grant.purpose}`,
      });
    } catch {}

    const baseUrl = process.env.BASE_URL || 'https://360api.vnvision.in';
    return {
      id: grant.id,
      medicalRecordId: grant.medicalRecordId,
      grantedByDoctorId: grant.grantedByDoctorId,
      recipientType: grant.recipientType,
      recipientTarget: grant.recipientTarget,
      purpose: grant.purpose,
      shareToken: grant.shareToken,
      shareUrl: `${baseUrl}/api/v1/shares/${grant.shareToken}`,
      expiresAt: grant.expiresAt.toISOString(),
      isRevoked: grant.isRevoked,
      revokedAt: grant.revokedAt ? grant.revokedAt.toISOString() : undefined,
      accessCount: grant.accessCount,
      createdAt: grant.createdAt.toISOString(),
    };
  }

  async getShareGrants(userId: string, recordId: string, roles: string[] = []): Promise<any[]> {
    const record = await this.repository.findRecordById(recordId);
    if (!record) {
      throw new NotFoundException(`Medical record '${recordId}' not found`);
    }

    const grants = await this.repository.findShareGrantsByRecordId(record.id);
    const baseUrl = process.env.BASE_URL || 'https://360api.vnvision.in';
    return grants.map((g: any) => ({
      id: g.id,
      medicalRecordId: g.medicalRecordId,
      grantedByDoctorId: g.grantedByDoctorId,
      recipientType: g.recipientType,
      recipientTarget: g.recipientTarget,
      purpose: g.purpose,
      shareToken: g.shareToken,
      shareUrl: `${baseUrl}/api/v1/shares/${g.shareToken}`,
      expiresAt: g.expiresAt.toISOString(),
      isRevoked: g.isRevoked,
      revokedAt: g.revokedAt ? g.revokedAt.toISOString() : undefined,
      accessCount: g.accessCount,
      createdAt: g.createdAt.toISOString(),
    }));
  }

  async revokeShareGrant(
    userId: string,
    recordId: string,
    grantId: string,
    roles: string[] = [],
    ipAddress?: string,
  ): Promise<{ message: string; revokedAt: string }> {
    const revoked = await this.repository.revokeShareGrant(recordId, grantId);
    if (!revoked) {
      throw new NotFoundException(`Share grant '${grantId}' not found for medical record '${recordId}'`);
    }

    try {
      await this.repository.createAuditLog({
        medicalRecordId: recordId,
        action: 'RECORD_SHARE_REVOKED',
        performedBy: userId,
        details: `Share grant ${grantId} revoked by user ${userId}`,
      });
    } catch {}

    return {
      message: 'Record share grant revoked successfully',
      revokedAt: new Date().toISOString(),
    };
  }

  async accessSharedRecord(shareToken: string): Promise<any> {
    const grant = await this.repository.findShareGrantByToken(shareToken);
    if (!grant) {
      throw new NotFoundException('Invalid or non-existent record share link');
    }
    if (grant.isRevoked) {
      throw new ForbiddenException('This record share link has been revoked by the clinician');
    }
    if (new Date() > new Date(grant.expiresAt)) {
      throw new ForbiddenException('This record share link has expired');
    }

    await this.repository.incrementShareAccessCount(grant.id);

    const rec = grant.medicalRecord;
    return {
      shareMetadata: {
        shareId: grant.id,
        recipientType: grant.recipientType,
        recipientTarget: grant.recipientTarget,
        purpose: grant.purpose,
        expiresAt: grant.expiresAt.toISOString(),
        accessCount: grant.accessCount + 1,
      },
      medicalRecord: {
        id: rec.id,
        title: rec.title,
        chiefComplaint: rec.chiefComplaint,
        clinicalNotes: rec.clinicalNotes,
        treatmentPlan: rec.treatmentPlan,
        followUpInstructions: rec.followUpInstructions,
        status: rec.status,
        createdAt: rec.createdAt.toISOString(),
        encounters: rec.encounters || [],
        diagnoses: rec.diagnoses || [],
        vitalSigns: rec.vitalSigns || [],
        procedures: rec.procedures || [],
        attachments: (rec.attachments || []).map((att: any) => ({
          id: att.id,
          fileName: att.fileName,
          originalName: att.originalName,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
          category: att.category,
        })),
        addenda: (rec.addenda || []).map((add: any) => ({
          id: add.id,
          authorName: add.authorName,
          addendumNotes: add.addendumNotes,
          reason: add.reason,
          createdAt: add.createdAt.toISOString(),
        })),
      },
    };
  }
}
