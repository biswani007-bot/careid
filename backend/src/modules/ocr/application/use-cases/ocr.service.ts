import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  ServiceUnavailableException,
  Inject,
  Optional,
} from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { IOcrRepository } from '../../domain/repositories/ocr.repository.interface';
import {
  OCRJobResponseDto, ExtractedFieldResponseDto, OCRTemplateResponseDto,
  OCRVerificationResponseDto, OCRDashboardResponseDto,
} from '../../presentation/dto/ocr-response.dto';
import {
  CreateOCRJobDto, CreateOCRTemplateDto, UpdateOCRTemplateDto, VerifyOCRDto,
  OCRReviewHistoryQueryDto,
} from '../../presentation/dto/ocr-enterprise.dto';
import { buildPaginationMeta } from '@common/dto/pagination.dto';
import { Logger } from 'nestjs-pino';
import { OcrWorkerClient, OcrWorkerResponse } from '../../infrastructure/clients/ocr-worker.client';
import { DocumentFieldExtractor } from '../../domain/services/document-field-extractor';

@Injectable()
export class OCRJobService {
  constructor(
    @Inject('IOcrRepository')
    private readonly ocrRepository: IOcrRepository,
    private readonly logger: Logger,
    @Optional()
    private readonly ocrWorkerClient?: OcrWorkerClient,
  ) {}

  // ─── Dashboard Stats ─────────────────────────────────────────────────────

  async getDashboardStats(): Promise<OCRDashboardResponseDto> {
    return this.ocrRepository.getDashboardStats();
  }

  // ─── OCR Jobs ─────────────────────────────────────────────────────────────

  async submitJob(userId: string, dto: CreateOCRJobDto): Promise<OCRJobResponseDto> {
    const job = await this.ocrRepository.createJob({ ...dto, submittedBy: userId });

    // Trigger local CPU-based OCR pipeline processing
    await this.processJobLocalPipeline(job.id);

    const processedJob = await this.ocrRepository.findJobById(job.id);
    await this.ocrRepository.createAuditLog({
      ocrJobId: job.id,
      action: 'JOB_SUBMITTED',
      performedBy: userId,
      details: `Submitted OCR job for attachment ${dto.medicalAttachmentId}`,
    });

    return this.mapJob(processedJob || job);
  }

  async reprocessJob(jobId: string, caller?: { userId: string; roles: string[] }): Promise<OCRJobResponseDto> {
    const job = await this.ocrRepository.findJobById(jobId);
    if (!job) {
      throw new NotFoundException('OCR job not found');
    }

    if (caller) {
      const roles = caller.roles || [];
      const isSuperAdmin = roles.includes('SUPER_ADMIN');
      const isAdmin = roles.includes('ADMIN');
      const isOwner = job.submittedBy === caller.userId;

      if (!isSuperAdmin && !isAdmin && !isOwner) {
        throw new ForbiddenException('You are not authorized to reprocess this OCR job');
      }
    }

    // State transition validation: active processing cannot be reprocessed simultaneously
    const inProgressStates = ['PREPROCESSING', 'OCR_RUNNING', 'EXTRACTING'];
    if (inProgressStates.includes(job.status)) {
      throw new ConflictException(`Cannot reprocess OCR job in active state '${job.status}'. Wait for current execution to finish.`);
    }

    // Execute local OCR processing pipeline
    await this.processJobLocalPipeline(job.id);

    const reprocessed = await this.ocrRepository.findJobById(job.id);
    await this.ocrRepository.createAuditLog({
      ocrJobId: job.id,
      action: 'JOB_REPROCESSED',
      performedBy: caller?.userId,
      details: `Reprocessed OCR job for attachment ${job.medicalAttachmentId}`,
    });

    return this.mapJob(reprocessed || job);
  }

  async validateJobAccess(jobId: string, caller?: any): Promise<any> {
    const job = await this.ocrRepository.findJobById(jobId);
    if (!job) {
      throw new NotFoundException('OCR job not found');
    }
    if (!caller) {
      return job;
    }

    const roles: string[] = Array.isArray(caller.roles)
      ? caller.roles
      : (caller.role ? [caller.role] : []);
    const upperRoles = roles.map((r) => r.toUpperCase());
    const userId = caller.userId || caller.id;

    if (upperRoles.includes('ADMIN') || upperRoles.includes('SUPER_ADMIN')) {
      return job;
    }

    if (job.submittedBy && job.submittedBy === userId) {
      return job;
    }

    if (typeof this.ocrRepository.verifyJobAccess === 'function') {
      const allowed = await this.ocrRepository.verifyJobAccess(jobId, userId, roles);
      if (!allowed) {
        throw new ForbiddenException('Access denied: You do not have permission to view or manage this OCR job.');
      }
    } else {
      if (typeof this.ocrRepository.findAttachmentById === 'function') {
        const att = await this.ocrRepository.findAttachmentById(job.medicalAttachmentId);
        if (att && caller.patientProfileId && att.patientProfileId === caller.patientProfileId) {
          return job;
        }
      }
      throw new ForbiddenException('Access denied: You do not have permission to view or manage this OCR job.');
    }

    return job;
  }

  async getJobs(status?: string, documentType?: string, page = 1, limit = 50, caller?: any): Promise<OCRJobResponseDto[]> {
    let jobs: any[];
    if (caller && typeof this.ocrRepository.findJobsScoped === 'function') {
      const roles: string[] = Array.isArray(caller.roles)
        ? caller.roles
        : (caller.role ? [caller.role] : []);
      const userId = caller.userId || caller.id;
      jobs = await this.ocrRepository.findJobsScoped(userId, roles, status, documentType, page, limit);
    } else {
      jobs = await this.ocrRepository.findJobs(status, documentType, page, limit);
    }
    return jobs.map((j) => this.mapJob(j));
  }

  async getJobById(id: string, caller?: any): Promise<OCRJobResponseDto> {
    const job = await this.validateJobAccess(id, caller);
    return this.mapJob(job);
  }

  async getJobText(id: string, caller?: any): Promise<{ text: string }> {
    await this.validateJobAccess(id, caller);
    const pages = await this.ocrRepository.findPagesByJobId(id);
    const combinedText = pages.map((p) => p.rawText || '').join('\n\n--- Page Break ---\n\n');
    return { text: combinedText };
  }

  async getJobFields(id: string, caller?: any): Promise<ExtractedFieldResponseDto[]> {
    await this.validateJobAccess(id, caller);
    const fields = await this.ocrRepository.findExtractedFieldsByJobId(id);
    return fields.map((f) => ({
      id: f.id,
      ocrJobId: f.ocrJobId,
      fieldName: f.fieldName,
      fieldValue: f.fieldValue,
      confidence: f.confidence,
      boundingBox: f.boundingBox
        ? typeof f.boundingBox === 'string'
          ? (() => {
              try {
                return JSON.parse(f.boundingBox);
              } catch {
                return f.boundingBox;
              }
            })()
          : f.boundingBox
        : undefined,
      validationStatus: f.validationStatus,
      requiresReview: f.requiresReview,
      createdAt: f.createdAt.toISOString(),
    }));
  }

  async getJobJson(id: string, caller?: any): Promise<any> {
    const job = await this.validateJobAccess(id, caller);
    const fields = await this.ocrRepository.findExtractedFieldsByJobId(id);
    const structuredObject: Record<string, any> = {};
    for (const f of fields) {
      structuredObject[f.fieldName] = {
        value: f.fieldValue,
        confidence: f.confidence,
        status: f.validationStatus,
      };
    }

    return {
      jobId: job.id,
      medicalAttachmentId: job.medicalAttachmentId,
      documentType: job.documentType,
      overallConfidence: job.overallConfidence,
      confidenceLevel: job.confidenceLevel,
      status: job.status,
      isSimulated: false,
      engine: 'PP-OCRv4-Mobile-CPU',
      fields: structuredObject,
    };
  }

  // ─── Templates ───────────────────────────────────────────────────────────

  async createTemplate(userId: string, dto: CreateOCRTemplateDto): Promise<OCRTemplateResponseDto> {
    const existing = await this.ocrRepository.findTemplateByCode(dto.code);
    if (existing) throw new ConflictException(`OCR Template code '${dto.code}' already exists`);

    const tpl = await this.ocrRepository.createTemplate(dto);
    await this.ocrRepository.createAuditLog({
      action: 'TEMPLATE_CREATED',
      performedBy: userId,
      details: `Created OCR Template ${tpl.name} (${tpl.code})`,
    });
    return this.mapTemplate(tpl);
  }

  async getTemplates(): Promise<OCRTemplateResponseDto[]> {
    const templates = await this.ocrRepository.findTemplates();
    return templates.map((t) => this.mapTemplate(t));
  }

  async updateTemplate(id: string, dto: UpdateOCRTemplateDto, userId: string): Promise<OCRTemplateResponseDto> {
    const tpl = await this.ocrRepository.findTemplateById(id);
    if (!tpl) throw new NotFoundException('OCR Template not found');

    const updated = await this.ocrRepository.updateTemplate(id, dto);
    await this.ocrRepository.createAuditLog({
      action: 'TEMPLATE_UPDATED',
      performedBy: userId,
      details: `Updated OCR Template ${id} to version ${updated.version}`,
    });
    return this.mapTemplate(updated);
  }

  async softDeleteTemplate(id: string, userId: string): Promise<{ message: string }> {
    const tpl = await this.ocrRepository.findTemplateById(id);
    if (!tpl) throw new NotFoundException('OCR Template not found');

    await this.ocrRepository.softDeleteTemplate(id);
    await this.ocrRepository.createAuditLog({
      action: 'TEMPLATE_DELETED',
      performedBy: userId,
      details: `Soft-deleted OCR Template ${tpl.name}`,
    });
    return { message: 'OCR Template soft-deleted successfully' };
  }

  private mapTemplate(t: any): OCRTemplateResponseDto {
    return {
      id: t.id,
      code: t.code,
      name: t.name,
      documentType: t.documentType,
      fieldDefinitions: t.fieldDefinitions ? JSON.parse(t.fieldDefinitions) : undefined,
      validationRules: t.validationRules ? JSON.parse(t.validationRules) : undefined,
      version: t.version,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  // ─── Verification ────────────────────────────────────────────────────────

  async getJobsRequiringReview(caller?: { userId: string; roles: string[] }): Promise<OCRJobResponseDto[]> {
    let facilityIds: string[] | undefined = undefined;

    if (caller) {
      const roles = caller.roles || [];
      const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

      if (!isAdmin) {
        facilityIds = await this.ocrRepository.getUserActiveFacilityIds(caller.userId);
        if (facilityIds.length === 0) {
          throw new ForbiddenException('Active healthcare facility affiliation is required to access the OCR review queue');
        }
      }
    }

    const jobs = await this.ocrRepository.findJobsRequiringReview(facilityIds);
    return jobs.map((j) => this.mapJob(j));
  }

  async submitVerification(
    jobId: string,
    caller: string | { userId: string; roles: string[] },
    dto: VerifyOCRDto,
  ): Promise<OCRVerificationResponseDto> {
    const userId = typeof caller === 'string' ? caller : caller.userId;
    const roles = typeof caller === 'object' && caller?.roles ? caller.roles : [];

    const validStatuses = ['APPROVED', 'REJECTED', 'CORRECTED'];
    if (!validStatuses.includes(dto.reviewStatus)) {
      throw new BadRequestException(`Invalid review status: ${dto.reviewStatus}. Must be APPROVED, REJECTED, or CORRECTED.`);
    }

    if (dto.reviewStatus === 'CORRECTED') {
      if (!dto.corrections || dto.corrections.length === 0) {
        throw new BadRequestException('Field corrections must be provided when reviewStatus is CORRECTED');
      }
    }

    const isSuperAdmin = roles.includes('SUPER_ADMIN');
    const isAdmin = roles.includes('ADMIN');

    // For DOCTOR and STAFF, enforce facility scoping and active facility requirement
    if (!isSuperAdmin && !isAdmin && roles.length > 0) {
      const userFacilityIds = await this.ocrRepository.getUserActiveFacilityIds(userId);
      if (userFacilityIds.length === 0) {
        throw new ForbiddenException('Active healthcare facility affiliation is required to review OCR jobs');
      }

      const jobFacilityIds = await this.ocrRepository.getJobFacilityIds(jobId);
      const hasFacilityMatch = jobFacilityIds.some((fid) => userFacilityIds.includes(fid));

      if (!hasFacilityMatch) {
        // Also check if caller submitted this job
        const job = await this.ocrRepository.findJobById(jobId);
        if (!job) {
          throw new NotFoundException('OCR job not found');
        }
        if (job.submittedBy !== userId) {
          throw new ForbiddenException('You are not authorized to review OCR jobs outside your affiliated facility');
        }
      }
    }

    // Execute atomic transaction for corrections, verification, audit log, and job status transition
    const ver = await this.ocrRepository.submitVerificationTransaction(jobId, userId, {
      reviewStatus: dto.reviewStatus,
      reviewNotes: dto.reviewNotes,
      corrections: dto.corrections,
    });

    return {
      id: ver.id,
      ocrJobId: ver.ocrJobId,
      reviewedBy: ver.reviewedBy,
      reviewStatus: ver.reviewStatus,
      reviewNotes: ver.reviewNotes || undefined,
      completedAt: ver.completedAt ? ver.completedAt.toISOString() : undefined,
      createdAt: ver.createdAt.toISOString(),
    };
  }

  async getReviewHistory(
    dto: OCRReviewHistoryQueryDto,
    caller?: { userId: string; roles: string[] },
  ): Promise<{ data: any[]; meta: any }> {
    this.logger.log({ msg: 'OCR review history requested', query: dto });
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;

    let facilityIds: string[] | undefined = undefined;

    if (caller) {
      const roles = caller.roles || [];
      const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

      if (!isAdmin) {
        facilityIds = await this.ocrRepository.getUserActiveFacilityIds(caller.userId);
        if (facilityIds.length === 0) {
          throw new ForbiddenException('Active healthcare facility affiliation is required to view OCR review history');
        }

        // If reviewerId filter is provided for another user, verify they share facility
        if (dto.reviewerId && dto.reviewerId !== caller.userId) {
          const targetFacilityIds = await this.ocrRepository.getUserActiveFacilityIds(dto.reviewerId);
          const shareFacility = targetFacilityIds.some((fid) => facilityIds?.includes(fid));
          if (!shareFacility) {
            throw new ForbiddenException('You are not authorized to view review history from other facilities');
          }
        }
      }
    }

    const result = await this.ocrRepository.findReviewHistory({
      page,
      limit,
      status: dto.status,
      reviewerId: dto.reviewerId,
      facilityIds,
      startDate,
      endDate,
    });

    const items = result.items.map((v) => ({
      id: v.id,
      ocrJobId: v.ocrJobId,
      reviewedBy: v.reviewedBy,
      reviewStatus: v.reviewStatus,
      reviewNotes: v.reviewNotes || undefined,
      completedAt: v.completedAt ? v.completedAt.toISOString() : undefined,
      createdAt: v.createdAt.toISOString(),
      job: v.ocrJob ? {
        id: v.ocrJob.id,
        medicalAttachmentId: v.ocrJob.medicalAttachmentId,
        documentType: v.ocrJob.documentType,
        status: v.ocrJob.status,
        overallConfidence: v.ocrJob.overallConfidence,
      } : undefined,
      fields: v.ocrJob?.extractedFields?.map((f: any) => ({
        id: f.id,
        ocrJobId: f.ocrJobId,
        fieldName: f.fieldName,
        fieldValue: f.fieldValue,
        confidence: f.confidence,
        validationStatus: f.validationStatus,
        requiresReview: f.requiresReview,
        createdAt: f.createdAt.toISOString(),
      })) || [],
    }));

    return {
      data: items,
      meta: buildPaginationMeta(result.total, dto.page, dto.limit),
    };
  }

  // ─── Local CPU OCR Pipeline Engine ───────────────────────────────────────

  private async processJobLocalPipeline(jobId: string): Promise<void> {
    const startTime = Date.now();
    const job = await this.ocrRepository.findJobById(jobId);
    if (!job) {
      throw new NotFoundException('OCR job not found');
    }

    await this.ocrRepository.updateJobStatus(jobId, 'PREPROCESSING');

    // 1. Resolve document source file
    let resolvedFilePath: string | undefined;
    let fileBuffer: Buffer | undefined;
    let originalFilename = 'document.png';

    if (job.medicalAttachmentId) {
      const attachment = typeof this.ocrRepository.findAttachmentById === 'function'
        ? await this.ocrRepository.findAttachmentById(job.medicalAttachmentId)
        : null;
      if (attachment) {
        originalFilename = attachment.fileName || attachment.originalName || originalFilename;

        // Check local storage locations
        const candidatePaths = [
          path.join(process.cwd(), 'data', 'uploads', 'attachments', originalFilename),
          path.join(process.cwd(), 'data', 'uploads', originalFilename),
          attachment.storageKey ? path.join(process.cwd(), attachment.storageKey) : null,
          attachment.storageKey ? path.join(process.cwd(), 'data', attachment.storageKey) : null,
        ].filter(Boolean) as string[];

        for (const p of candidatePaths) {
          if (fs.existsSync(p)) {
            resolvedFilePath = p;
            break;
          }
        }

        // If not found locally and storageUrl is http/https, fetch buffer
        if (!resolvedFilePath && attachment.storageUrl && /^https?:\/\//i.test(attachment.storageUrl)) {
          try {
            const resp = await fetch(attachment.storageUrl);
            if (resp.ok) {
              const arrayBuf = await resp.arrayBuffer();
              fileBuffer = Buffer.from(arrayBuf);
            }
          } catch (fetchErr: any) {
            this.logger.warn(`Could not fetch attachment from remote URL ${attachment.storageUrl}: ${fetchErr.message}`);
          }
        }
      }
    }

    // Ensure source document file was resolved from storage or local disk
    if (!resolvedFilePath && !fileBuffer) {
      const errMsg = `Source document file for medical attachment '${job.medicalAttachmentId}' could not be resolved from storage or disk.`;
      const durationMs = Date.now() - startTime;
      await this.ocrRepository.updateJobStatus(jobId, 'FAILED', 0.0, 'LOW', durationMs, errMsg);
      throw new NotFoundException(errMsg);
    }

    const ext = path.extname(originalFilename).toLowerCase();
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.webp', '.pdf'];
    if (ext && !allowedExtensions.includes(ext)) {
      const errMsg = `Unsupported file format '${ext}'. OCR engine only supports standard image files (PNG, JPG, TIFF, BMP, WEBP) and PDF documents.`;
      const durationMs = Date.now() - startTime;
      await this.ocrRepository.updateJobStatus(jobId, 'FAILED', 0.0, 'LOW', durationMs, errMsg);
      throw new BadRequestException(errMsg);
    }

    await this.ocrRepository.updateJobStatus(jobId, 'OCR_RUNNING');

    let workerResult: OcrWorkerResponse;
    if (this.ocrWorkerClient) {
      try {
        if (fileBuffer) {
          workerResult = await this.ocrWorkerClient.processBuffer(fileBuffer, originalFilename, job.documentType);
        } else if (resolvedFilePath) {
          const workerUrl = typeof this.ocrWorkerClient.getWorkerUrl === 'function' ? this.ocrWorkerClient.getWorkerUrl() : '';
          const isRemoteWorker = Boolean(
            workerUrl &&
            !workerUrl.startsWith('http://127.0.0.1') &&
            !workerUrl.startsWith('http://localhost') &&
            !workerUrl.startsWith('http://0.0.0.0')
          );

          if (isRemoteWorker) {
            if (fs.existsSync(resolvedFilePath)) {
              const diskBuf = await fs.promises.readFile(resolvedFilePath);
              workerResult = await this.ocrWorkerClient.processBuffer(diskBuf, originalFilename, job.documentType);
            } else {
              throw new BadRequestException(
                'Remote OCR service requires binary multipart transfer (processBuffer), but source document file is not found on disk.',
              );
            }
          } else {
            workerResult = await this.ocrWorkerClient.processFile(resolvedFilePath, job.documentType);
          }
        } else {
          throw new BadRequestException('No source document file available for OCR processing');
        }
      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        await this.ocrRepository.updateJobStatus(jobId, 'FAILED', 0.0, 'LOW', durationMs, err.message);
        this.logger.error(`OCR processing failed for job ${jobId}: ${err.message}`);
        throw err;
      }
    } else {
      const errMsg = 'OCR worker client service is unavailable. Cannot process document.';
      const durationMs = Date.now() - startTime;
      await this.ocrRepository.updateJobStatus(jobId, 'FAILED', 0.0, 'LOW', durationMs, errMsg);
      throw new ServiceUnavailableException(errMsg);
    }

    if (!workerResult.success) {
      const errMsg = workerResult.error || 'OCR worker reported failure processing document.';
      const durationMs = Date.now() - startTime;
      await this.ocrRepository.updateJobStatus(jobId, 'FAILED', 0.0, 'LOW', durationMs, errMsg);
      throw new ServiceUnavailableException(errMsg);
    }

    // Persist OCR pages
    await this.ocrRepository.updateJobStatus(jobId, 'EXTRACTING');

    for (const page of workerResult.pages || []) {
      await this.ocrRepository.createPage({
        ocrJobId: jobId,
        pageNumber: page.pageNumber,
        imagePath: page.imagePath || resolvedFilePath || originalFilename,
        rawText: page.rawText,
        confidence: page.confidence || workerResult.overallConfidence,
        rotationAngle: 0.0,
        processingMetadata: {
          engine: workerResult.engine,
          ocrVersion: workerResult.ocrVersion || 'PP-OCRv4',
          isSimulated: false,
          durationMs: workerResult.durationMs,
        },
      });
    }

    // Extract structured clinical / financial fields
    const fieldsToExtract = DocumentFieldExtractor.extractFields(workerResult, job.documentType);

    let sumConfidence = 0;
    for (const f of fieldsToExtract) {
      sumConfidence += f.confidence;
      await this.ocrRepository.createExtractedField({
        ocrJobId: jobId,
        fieldName: f.name,
        fieldValue: f.value,
        confidence: f.confidence,
        boundingBox: f.boundingBox ? JSON.stringify(f.boundingBox) : undefined,
        validationStatus: f.validationStatus,
        requiresReview: f.requiresReview,
      });
    }

    const overallConfidence = fieldsToExtract.length > 0 ? sumConfidence / fieldsToExtract.length : workerResult.overallConfidence;
    const confidenceLevel = overallConfidence >= 0.90 ? 'HIGH' : overallConfidence >= 0.75 ? 'MEDIUM' : 'LOW';
    const finalStatus = overallConfidence < 0.85 ? 'REVIEW_REQUIRED' : 'COMPLETED';
    const durationMs = Date.now() - startTime;

    await this.ocrRepository.updateJobStatus(jobId, finalStatus, overallConfidence, confidenceLevel, durationMs);
  }

  private mapJob(j: any): OCRJobResponseDto {
    return {
      id: j.id,
      medicalAttachmentId: j.medicalAttachmentId,
      documentType: j.documentType,
      status: j.status,
      submittedBy: j.submittedBy || undefined,
      startedAt: j.startedAt ? j.startedAt.toISOString() : undefined,
      completedAt: j.completedAt ? j.completedAt.toISOString() : undefined,
      processingTimeMs: j.processingTimeMs || undefined,
      overallConfidence: j.overallConfidence || undefined,
      confidenceLevel: j.confidenceLevel,
      failureReason: j.failureReason || undefined,
      isSimulated: false,
      extractionEngine: 'PP-OCRv4-Mobile-CPU',
      pages: j.pages?.map((p: any) => ({
        id: p.id,
        ocrJobId: p.ocrJobId,
        pageNumber: p.pageNumber,
        imagePath: p.imagePath || undefined,
        rawText: p.rawText || undefined,
        confidence: p.confidence,
        rotationAngle: p.rotationAngle,
        processingMetadata: p.processingMetadata
          ? typeof p.processingMetadata === 'string'
            ? (() => {
                try {
                  return JSON.parse(p.processingMetadata);
                } catch {
                  return p.processingMetadata;
                }
              })()
            : p.processingMetadata
          : undefined,
        createdAt: p.createdAt.toISOString(),
      })) || [],
      extractedFields: j.extractedFields?.map((f: any) => ({
        id: f.id,
        ocrJobId: f.ocrJobId,
        fieldName: f.fieldName,
        fieldValue: f.fieldValue,
        confidence: f.confidence,
        boundingBox: f.boundingBox
          ? typeof f.boundingBox === 'string'
            ? (() => {
                try {
                  return JSON.parse(f.boundingBox);
                } catch {
                  return f.boundingBox;
                }
              })()
            : f.boundingBox
          : undefined,
        validationStatus: f.validationStatus,
        requiresReview: f.requiresReview,
        createdAt: f.createdAt.toISOString(),
      })) || [],
      verifications: j.verifications?.map((v: any) => ({
        id: v.id,
        ocrJobId: v.ocrJobId,
        reviewedBy: v.reviewedBy,
        reviewStatus: v.reviewStatus,
        reviewNotes: v.reviewNotes || undefined,
        completedAt: v.completedAt ? v.completedAt.toISOString() : undefined,
        createdAt: v.createdAt.toISOString(),
      })) || [],
      createdAt: j.createdAt ? (typeof j.createdAt === 'string' ? j.createdAt : j.createdAt.toISOString()) : new Date().toISOString(),
      updatedAt: j.updatedAt ? (typeof j.updatedAt === 'string' ? j.updatedAt : j.updatedAt.toISOString()) : new Date().toISOString(),
    };
  }
}
