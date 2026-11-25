import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { IOcrRepository } from '../../domain/repositories/ocr.repository.interface';
import {
  OCRJobEntity, OCRPageEntity, ExtractedFieldEntity,
  OCRTemplateEntity, OCRVerificationEntity, OCRAuditLogEntity,
} from '../../domain/entities/ocr.entity';

@Injectable()
export class PrismaOcrRepository implements IOcrRepository {
  constructor(private readonly db: DatabaseService) {}

  // ─── OCR Jobs ─────────────────────────────────────────────────────────────

  async createJob(data: any): Promise<OCRJobEntity> {
    return (await this.db.oCRJob.create({
      data: {
        medicalAttachmentId: data.medicalAttachmentId,
        documentType: (data.documentType as any) || 'UNKNOWN',
        status: (data.status as any) || 'QUEUED',
        submittedBy: data.submittedBy || null,
      },
      include: { pages: true, extractedFields: true, verifications: true },
    })) as unknown as OCRJobEntity;
  }

  async findJobs(status?: string, documentType?: string, page = 1, limit = 50): Promise<OCRJobEntity[]> {
    const validStatuses = ['QUEUED', 'PREPROCESSING', 'OCR_RUNNING', 'EXTRACTING', 'COMPLETED', 'FAILED', 'REVIEW_REQUIRED', 'RETRY_QUEUED'];
    const validDocs = ['PRESCRIPTION', 'LAB_REPORT', 'INSURANCE_CARD', 'DISCHARGE_SUMMARY', 'IDENTITY_CARD', 'VACCINATION_CERT', 'BILLING_INVOICE', 'UNKNOWN'];

    let normalizedStatus: string | undefined;
    if (status) {
      const upper = status.toUpperCase();
      if (!validStatuses.includes(upper)) return [];
      normalizedStatus = upper;
    }

    let normalizedDocType: string | undefined;
    if (documentType) {
      const upper = documentType.toUpperCase();
      if (!validDocs.includes(upper)) return [];
      normalizedDocType = upper;
    }

    const safeLimit = Math.min(Math.max(1, limit || 50), 100);
    const safePage = Math.max(1, page || 1);
    const skip = (safePage - 1) * safeLimit;

    return (await this.db.oCRJob.findMany({
      where: {
        isDeleted: false,
        ...(normalizedStatus ? { status: normalizedStatus as any } : {}),
        ...(normalizedDocType ? { documentType: normalizedDocType as any } : {}),
      },
      include: { pages: true, extractedFields: true, verifications: true },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      skip,
    })) as unknown as OCRJobEntity[];
  }

  async findJobById(id: string): Promise<OCRJobEntity | null> {
    if (!id || typeof id !== 'string') return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return null;
    return (await this.db.oCRJob.findFirst({
      where: { id, isDeleted: false },
      include: { pages: true, extractedFields: true, verifications: true },
    })) as unknown as OCRJobEntity | null;
  }

  async findAttachmentById(attachmentId: string): Promise<any | null> {
    if (!attachmentId || typeof attachmentId !== 'string') return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attachmentId);
    if (!isUuid) return null;
    return this.db.medicalAttachment.findFirst({
      where: { id: attachmentId, isDeleted: false },
      include: {
        medicalRecord: true,
      },
    });
  }

  async findPatientProfileByUserId(userId: string): Promise<{ id: string } | null> {
    if (!userId) return null;
    return this.db.patientProfile.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });
  }

  async findDoctorProfileByUserId(userId: string): Promise<{ id: string } | null> {
    if (!userId) return null;
    return this.db.doctorProfile.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });
  }

  async verifyJobAccess(jobId: string, userId: string, roles: string[] = []): Promise<boolean> {
    if (!jobId || !userId) return false;
    const upperRoles = roles.map((r) => r.toUpperCase());
    if (upperRoles.includes('ADMIN') || upperRoles.includes('SUPER_ADMIN')) {
      return true;
    }

    const job = await this.db.oCRJob.findFirst({
      where: { id: jobId, isDeleted: false },
    });
    if (!job) return false;

    // Direct submitter has access
    if (job.submittedBy === userId) return true;

    const attachment = await this.db.medicalAttachment.findFirst({
      where: { id: job.medicalAttachmentId, isDeleted: false },
      include: {
        medicalRecord: true,
      },
    });

    if (upperRoles.includes('PATIENT')) {
      const patient = await this.findPatientProfileByUserId(userId);
      if (patient && attachment && attachment.patientProfileId === patient.id) {
        return true;
      }
      return false;
    }

    if (upperRoles.includes('DOCTOR')) {
      const doctor = await this.findDoctorProfileByUserId(userId);
      if (attachment?.medicalRecord?.createdById === userId) {
        return true;
      }
      if (doctor) {
        const isDocAttachment = await this.db.doctorDocument.findFirst({
          where: { doctorProfileId: doctor.id, medicalAttachmentId: job.medicalAttachmentId },
        });
        if (isDocAttachment) return true;
      }
      const userFacilities = await this.getUserActiveFacilityIds(userId);
      const jobFacilities = await this.getJobFacilityIds(jobId);
      const hasFacilityOverlap = userFacilities.some((fid) => jobFacilities.includes(fid));
      if (hasFacilityOverlap) return true;

      // Check active referral for this patient
      if (attachment?.patientProfileId && userFacilities.length > 0) {
        const activeReferralStatuses = ['SUBMITTED', 'TRIAGED', 'ACCEPTED', 'IN_PROGRESS'];
        const referral = await this.db.patientReferral.findFirst({
          where: {
            patientId: attachment.patientProfileId,
            isDeleted: false,
            status: { in: activeReferralStatuses as any },
            OR: [
              { referringFacilityId: { in: userFacilities } },
              { receivingFacilityId: { in: userFacilities } },
            ],
          },
        });
        if (referral) return true;
      }
      return false;
    }

    if (upperRoles.includes('STAFF') || upperRoles.includes('FACILITY_ADMIN')) {
      const userFacilities = await this.getUserActiveFacilityIds(userId);
      const jobFacilities = await this.getJobFacilityIds(jobId);
      return userFacilities.some((fid) => jobFacilities.includes(fid));
    }

    return false;
  }

  async findJobsScoped(
    userId: string,
    roles: string[] = [],
    status?: string,
    documentType?: string,
    page = 1,
    limit = 50,
  ): Promise<OCRJobEntity[]> {
    const upperRoles = roles.map((r) => r.toUpperCase());
    if (upperRoles.includes('ADMIN') || upperRoles.includes('SUPER_ADMIN')) {
      return this.findJobs(status, documentType, page, limit);
    }

    const validStatuses = ['QUEUED', 'PREPROCESSING', 'OCR_RUNNING', 'EXTRACTING', 'COMPLETED', 'FAILED', 'REVIEW_REQUIRED', 'RETRY_QUEUED'];
    const validDocs = ['PRESCRIPTION', 'LAB_REPORT', 'INSURANCE_CARD', 'DISCHARGE_SUMMARY', 'IDENTITY_CARD', 'VACCINATION_CERT', 'BILLING_INVOICE', 'UNKNOWN'];

    let normalizedStatus: string | undefined;
    if (status) {
      const upper = status.toUpperCase();
      if (!validStatuses.includes(upper)) return [];
      normalizedStatus = upper;
    }

    let normalizedDocType: string | undefined;
    if (documentType) {
      const upper = documentType.toUpperCase();
      if (!validDocs.includes(upper)) return [];
      normalizedDocType = upper;
    }

    const safeLimit = Math.min(Math.max(1, limit || 50), 100);
    const safePage = Math.max(1, page || 1);
    const skip = (safePage - 1) * safeLimit;

    if (upperRoles.includes('PATIENT')) {
      const patient = await this.findPatientProfileByUserId(userId);
      const attachments = patient
        ? await this.db.medicalAttachment.findMany({
            where: { patientProfileId: patient.id, isDeleted: false },
            select: { id: true },
          })
        : [];
      const attachmentIds = attachments.map((a) => a.id);

      return (await this.db.oCRJob.findMany({
        where: {
          isDeleted: false,
          ...(normalizedStatus ? { status: normalizedStatus as any } : {}),
          ...(normalizedDocType ? { documentType: normalizedDocType as any } : {}),
          OR: [
            { submittedBy: userId },
            ...(attachmentIds.length > 0 ? [{ medicalAttachmentId: { in: attachmentIds } }] : []),
          ],
        },
        include: { pages: true, extractedFields: true, verifications: true },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        skip,
      })) as unknown as OCRJobEntity[];
    }

    if (upperRoles.includes('DOCTOR')) {
      const doctor = await this.findDoctorProfileByUserId(userId);
      const doctorDocs = doctor
        ? await this.db.doctorDocument.findMany({
            where: { doctorProfileId: doctor.id, medicalAttachmentId: { not: null } },
            select: { medicalAttachmentId: true },
          })
        : [];
      const doctorAttachmentIds = doctorDocs
        .map((d) => d.medicalAttachmentId)
        .filter(Boolean) as string[];

      const doctorRecords = await this.db.medicalRecord.findMany({
        where: { createdById: userId, isDeleted: false },
        select: { id: true },
      });
      const recordIds = doctorRecords.map((r) => r.id);

      const recordAttachments = recordIds.length > 0
        ? await this.db.medicalAttachment.findMany({
            where: { medicalRecordId: { in: recordIds }, isDeleted: false },
            select: { id: true },
          })
        : [];

      const facilityIds = await this.getUserActiveFacilityIds(userId);
      const { attachmentIds: facilityAttIds, userIds: facilityUserIds } =
        facilityIds.length > 0
          ? await this.getFacilityScopedAttachmentAndUserIds(facilityIds)
          : { attachmentIds: [], userIds: [] };

      const allAllowedAttachmentIds = new Set<string>([
        ...doctorAttachmentIds,
        ...recordAttachments.map((a) => a.id),
        ...facilityAttIds,
      ]);

      return (await this.db.oCRJob.findMany({
        where: {
          isDeleted: false,
          ...(normalizedStatus ? { status: normalizedStatus as any } : {}),
          ...(normalizedDocType ? { documentType: normalizedDocType as any } : {}),
          OR: [
            { submittedBy: userId },
            ...(facilityUserIds.length > 0 ? [{ submittedBy: { in: facilityUserIds } }] : []),
            ...(allAllowedAttachmentIds.size > 0 ? [{ medicalAttachmentId: { in: Array.from(allAllowedAttachmentIds) } }] : []),
          ],
        },
        include: { pages: true, extractedFields: true, verifications: true },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        skip,
      })) as unknown as OCRJobEntity[];
    }

    if (upperRoles.includes('STAFF') || upperRoles.includes('FACILITY_ADMIN')) {
      const facilityIds = await this.getUserActiveFacilityIds(userId);
      const { attachmentIds: facilityAttIds, userIds: facilityUserIds } =
        facilityIds.length > 0
          ? await this.getFacilityScopedAttachmentAndUserIds(facilityIds)
          : { attachmentIds: [], userIds: [] };

      return (await this.db.oCRJob.findMany({
        where: {
          isDeleted: false,
          ...(normalizedStatus ? { status: normalizedStatus as any } : {}),
          ...(normalizedDocType ? { documentType: normalizedDocType as any } : {}),
          OR: [
            { submittedBy: userId },
            ...(facilityUserIds.length > 0 ? [{ submittedBy: { in: facilityUserIds } }] : []),
            ...(facilityAttIds.length > 0 ? [{ medicalAttachmentId: { in: facilityAttIds } }] : []),
          ],
        },
        include: { pages: true, extractedFields: true, verifications: true },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        skip,
      })) as unknown as OCRJobEntity[];
    }

    // Default: only jobs submitted by this user
    return (await this.db.oCRJob.findMany({
      where: {
        isDeleted: false,
        submittedBy: userId,
        ...(normalizedStatus ? { status: normalizedStatus as any } : {}),
        ...(normalizedDocType ? { documentType: normalizedDocType as any } : {}),
      },
      include: { pages: true, extractedFields: true, verifications: true },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      skip,
    })) as unknown as OCRJobEntity[];
  }

  async updateJobStatus(
    id: string,
    status: string,
    overallConfidence?: number,
    confidenceLevel?: string,
    processingTimeMs?: number,
    failureReason?: string,
  ): Promise<OCRJobEntity> {
    const isFinished = status === 'COMPLETED' || status === 'REVIEW_REQUIRED' || status === 'FAILED';
    return (await this.db.oCRJob.update({
      where: { id },
      data: {
        status: status as any,
        overallConfidence: overallConfidence !== undefined ? overallConfidence : undefined,
        confidenceLevel: confidenceLevel ? (confidenceLevel as any) : undefined,
        processingTimeMs: processingTimeMs !== undefined ? processingTimeMs : undefined,
        failureReason: failureReason !== undefined ? failureReason : (status !== 'FAILED' ? null : undefined),
        startedAt: status === 'PREPROCESSING' || status === 'OCR_RUNNING' ? new Date() : undefined,
        completedAt: isFinished ? new Date() : undefined,
      },
      include: { pages: true, extractedFields: true, verifications: true },
    })) as unknown as OCRJobEntity;
  }

  async softDeleteJob(id: string): Promise<void> {
    await this.db.oCRJob.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  // ─── Pages & Fields ───────────────────────────────────────────────────────

  async createPage(data: any): Promise<OCRPageEntity> {
    return (await this.db.oCRPage.create({
      data: {
        ocrJobId: data.ocrJobId,
        pageNumber: data.pageNumber,
        imagePath: data.imagePath || null,
        rawText: data.rawText || null,
        confidence: data.confidence ?? 0.0,
        rotationAngle: data.rotationAngle ?? 0.0,
        processingMetadata: data.processingMetadata ? JSON.stringify(data.processingMetadata) : null,
      },
    })) as unknown as OCRPageEntity;
  }

  async createExtractedField(data: any): Promise<ExtractedFieldEntity> {
    return (await this.db.extractedField.create({
      data: {
        ocrJobId: data.ocrJobId,
        fieldName: data.fieldName,
        fieldValue: data.fieldValue,
        confidence: data.confidence ?? 0.0,
        boundingBox: data.boundingBox ? JSON.stringify(data.boundingBox) : null,
        validationStatus: data.validationStatus || 'VALIDATED',
        requiresReview: data.requiresReview ?? false,
      },
    })) as unknown as ExtractedFieldEntity;
  }

  async findExtractedFieldsByJobId(ocrJobId: string): Promise<ExtractedFieldEntity[]> {
    return (await this.db.extractedField.findMany({
      where: { ocrJobId },
      orderBy: { createdAt: 'asc' },
    })) as unknown as ExtractedFieldEntity[];
  }

  async findPagesByJobId(ocrJobId: string): Promise<OCRPageEntity[]> {
    return (await this.db.oCRPage.findMany({
      where: { ocrJobId },
      orderBy: { pageNumber: 'asc' },
    })) as unknown as OCRPageEntity[];
  }

  async updateExtractedField(id: string, data: any): Promise<ExtractedFieldEntity> {
    return (await this.db.extractedField.update({
      where: { id },
      data: {
        fieldValue: data.fieldValue !== undefined ? data.fieldValue : undefined,
        confidence: data.confidence !== undefined ? data.confidence : undefined,
        validationStatus: data.validationStatus || undefined,
        requiresReview: data.requiresReview !== undefined ? data.requiresReview : undefined,
      },
    })) as unknown as ExtractedFieldEntity;
  }

  // ─── Templates ───────────────────────────────────────────────────────────

  async createTemplate(data: any): Promise<OCRTemplateEntity> {
    return (await this.db.oCRTemplate.create({
      data: {
        code: data.code,
        name: data.name,
        documentType: (data.documentType as any) || 'MEDICAL_REPORT',
        fieldDefinitions: data.fieldDefinitions ? JSON.stringify(data.fieldDefinitions) : null,
        validationRules: data.validationRules ? JSON.stringify(data.validationRules) : null,
        isActive: data.isActive ?? true,
      },
    })) as unknown as OCRTemplateEntity;
  }

  async findTemplates(): Promise<OCRTemplateEntity[]> {
    return (await this.db.oCRTemplate.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    })) as unknown as OCRTemplateEntity[];
  }

  async findTemplateByCode(code: string): Promise<OCRTemplateEntity | null> {
    return (await this.db.oCRTemplate.findFirst({
      where: { code, isDeleted: false },
    })) as unknown as OCRTemplateEntity | null;
  }

  async findTemplateById(id: string): Promise<OCRTemplateEntity | null> {
    return (await this.db.oCRTemplate.findFirst({
      where: { id, isDeleted: false },
    })) as unknown as OCRTemplateEntity | null;
  }

  async updateTemplate(id: string, data: any): Promise<OCRTemplateEntity> {
    const existing = await this.db.oCRTemplate.findUnique({ where: { id } });
    return (await this.db.oCRTemplate.update({
      where: { id },
      data: {
        name: data.name || undefined,
        documentType: data.documentType ? (data.documentType as any) : undefined,
        fieldDefinitions: data.fieldDefinitions ? JSON.stringify(data.fieldDefinitions) : undefined,
        validationRules: data.validationRules ? JSON.stringify(data.validationRules) : undefined,
        isActive: data.isActive ?? undefined,
        version: (existing?.version || 1) + 1,
      },
    })) as unknown as OCRTemplateEntity;
  }

  async softDeleteTemplate(id: string): Promise<void> {
    await this.db.oCRTemplate.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  // ─── Verification & Review Workflow ──────────────────────────────────────

  async getUserActiveFacilityIds(userId: string): Promise<string[]> {
    const facilityIds = new Set<string>();

    // Check StaffMember
    const staff = await this.db.staffMember.findFirst({
      where: { userId, isDeleted: false, employmentStatus: 'ACTIVE' },
      select: { primaryFacilityId: true, secondaryFacilityId: true },
    });
    if (staff) {
      if (staff.primaryFacilityId) facilityIds.add(staff.primaryFacilityId);
      if (staff.secondaryFacilityId) facilityIds.add(staff.secondaryFacilityId);
    }

    // Check DoctorFacility
    const doctor = await this.db.doctorProfile.findFirst({
      where: { userId, isDeleted: false },
      select: {
        facilities: {
          where: { isActive: true },
          select: { facilityId: true },
        },
      },
    });
    if (doctor && doctor.facilities) {
      for (const f of doctor.facilities) {
        if (f.facilityId) facilityIds.add(f.facilityId);
      }
    }

    return Array.from(facilityIds);
  }

  async getJobFacilityIds(jobId: string): Promise<string[]> {
    const job = await this.db.oCRJob.findFirst({
      where: { id: jobId, isDeleted: false },
    });
    if (!job) return [];

    const facilityIds = new Set<string>();

    // 1. Direct FacilityDocument
    const facilityDoc = await this.db.facilityDocument.findFirst({
      where: { medicalAttachmentId: job.medicalAttachmentId },
      select: { facilityId: true },
    });
    if (facilityDoc && facilityDoc.facilityId) {
      facilityIds.add(facilityDoc.facilityId);
    }

    // 2. MedicalAttachment relations
    const attachment = await this.db.medicalAttachment.findFirst({
      where: { id: job.medicalAttachmentId, isDeleted: false },
      include: {
        facilityDocuments: { select: { facilityId: true } },
        staffDocuments: {
          include: {
            staff: { select: { primaryFacilityId: true, secondaryFacilityId: true } },
          },
        },
        doctorDocuments: {
          include: {
            doctorProfile: {
              include: {
                facilities: { where: { isActive: true }, select: { facilityId: true } },
              },
            },
          },
        },
      },
    });

    if (attachment) {
      for (const fd of attachment.facilityDocuments || []) {
        if (fd.facilityId) facilityIds.add(fd.facilityId);
      }
      for (const sd of attachment.staffDocuments || []) {
        if (sd.staff?.primaryFacilityId) facilityIds.add(sd.staff.primaryFacilityId);
        if (sd.staff?.secondaryFacilityId) facilityIds.add(sd.staff.secondaryFacilityId);
      }
      for (const dd of attachment.doctorDocuments || []) {
        for (const df of dd.doctorProfile?.facilities || []) {
          if (df.facilityId) facilityIds.add(df.facilityId);
        }
      }

      const now = new Date();
      const activeReferralStatuses = ['SUBMITTED', 'TRIAGED', 'ACCEPTED', 'IN_PROGRESS'];

      // 1. Direct referral attachments
      if ((this.db as any).referralAttachment?.findMany) {
        const directReferralAttachments = await (this.db as any).referralAttachment.findMany({
          where: { attachmentId: attachment.id },
          include: {
            referral: {
              select: {
                status: true,
                isDeleted: true,
                expiresAt: true,
                referringFacilityId: true,
                receivingFacilityId: true,
              },
            },
          },
        });

        for (const ra of directReferralAttachments || []) {
          const r = ra.referral;
          if (
            r &&
            !r.isDeleted &&
            activeReferralStatuses.includes(r.status) &&
            (!r.expiresAt || r.expiresAt > now)
          ) {
            if (r.referringFacilityId) facilityIds.add(r.referringFacilityId);
            if (r.receivingFacilityId) facilityIds.add(r.receivingFacilityId);
          }
        }
      }

      // 2. Active patient-level referrals (excluding deleted, completed, cancelled, rejected, expired)
      if (attachment.patientProfileId) {
        const referrals = await this.db.patientReferral.findMany({
          where: {
            patientId: attachment.patientProfileId,
            isDeleted: false,
            status: { in: activeReferralStatuses as any },
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } },
            ],
          },
          select: { referringFacilityId: true, receivingFacilityId: true },
        });
        for (const r of referrals) {
          if (r.referringFacilityId) facilityIds.add(r.referringFacilityId);
          if (r.receivingFacilityId) facilityIds.add(r.receivingFacilityId);
        }
      }
    }

    // 3. User who submitted the job
    if (job.submittedBy) {
      const submitterFacilities = await this.getUserActiveFacilityIds(job.submittedBy);
      for (const fid of submitterFacilities) {
        facilityIds.add(fid);
      }
    }

    return Array.from(facilityIds);
  }

  private async getFacilityScopedAttachmentAndUserIds(facilityIds: string[]): Promise<{
    attachmentIds: string[];
    userIds: string[];
  }> {
    const attachmentIds = new Set<string>();
    const userIds = new Set<string>();

    // 1. Facility documents
    const facilityDocs = await this.db.facilityDocument.findMany({
      where: { facilityId: { in: facilityIds }, medicalAttachmentId: { not: null } },
      select: { medicalAttachmentId: true },
    });
    for (const doc of facilityDocs) {
      if (doc.medicalAttachmentId) attachmentIds.add(doc.medicalAttachmentId);
    }

    // 2. Staff documents & staff users
    const staffMembers = await this.db.staffMember.findMany({
      where: {
        isDeleted: false,
        employmentStatus: 'ACTIVE',
        OR: [
          { primaryFacilityId: { in: facilityIds } },
          { secondaryFacilityId: { in: facilityIds } },
        ],
      },
      select: { id: true, userId: true },
    });
    for (const s of staffMembers) {
      if (s.userId) userIds.add(s.userId);
    }
    const staffIds = staffMembers.map((s) => s.id);
    if (staffIds.length > 0) {
      const staffDocs = await this.db.staffDocument.findMany({
        where: { staffId: { in: staffIds }, medicalAttachmentId: { not: null } },
        select: { medicalAttachmentId: true },
      });
      for (const doc of staffDocs) {
        if (doc.medicalAttachmentId) attachmentIds.add(doc.medicalAttachmentId);
      }
    }

    // 3. Doctor documents & doctor users
    const doctorFacilities = await this.db.doctorFacility.findMany({
      where: { facilityId: { in: facilityIds }, isActive: true },
      include: { doctor: { select: { id: true, userId: true } } },
    });
    for (const df of doctorFacilities) {
      if (df.doctor?.userId) userIds.add(df.doctor.userId);
    }
    const doctorIds = doctorFacilities.map((df) => df.doctorId);
    if (doctorIds.length > 0) {
      const doctorDocs = await this.db.doctorDocument.findMany({
        where: { doctorProfileId: { in: doctorIds }, medicalAttachmentId: { not: null } },
        select: { medicalAttachmentId: true },
      });
      for (const doc of doctorDocs) {
        if (doc.medicalAttachmentId) attachmentIds.add(doc.medicalAttachmentId);
      }
    }

    // 4. Active Patient referrals (excluding deleted, completed, cancelled, rejected, expired)
    const now = new Date();
    const activeReferralStatuses = ['SUBMITTED', 'TRIAGED', 'ACCEPTED', 'IN_PROGRESS'];

    const referrals = await this.db.patientReferral.findMany({
      where: {
        isDeleted: false,
        status: { in: activeReferralStatuses as any },
        OR: [
          { referringFacilityId: { in: facilityIds } },
          { receivingFacilityId: { in: facilityIds } },
        ],
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } },
            ],
          },
        ],
      },
      select: { id: true, patientId: true },
    });

    const activeReferralIds = referrals.map((r) => r.id);
    if (activeReferralIds.length > 0 && (this.db as any).referralAttachment?.findMany) {
      const directRefAttachments = await (this.db as any).referralAttachment.findMany({
        where: { referralId: { in: activeReferralIds } },
        select: { attachmentId: true },
      });
      for (const dra of directRefAttachments || []) {
        if (dra.attachmentId) attachmentIds.add(dra.attachmentId);
      }
    }

    const patientIds = referrals.map((r) => r.patientId);
    if (patientIds.length > 0) {
      const patientAttachments = await this.db.medicalAttachment.findMany({
        where: { patientProfileId: { in: patientIds }, isDeleted: false },
        select: { id: true },
      });
      for (const pa of patientAttachments) {
        attachmentIds.add(pa.id);
      }
    }

    return {
      attachmentIds: Array.from(attachmentIds),
      userIds: Array.from(userIds),
    };
  }

  async findJobsRequiringReview(facilityIds?: string[], limit = 50): Promise<OCRJobEntity[]> {
    const safeLimit = Math.min(Math.max(1, limit || 50), 100);
    const where: any = { isDeleted: false, status: 'REVIEW_REQUIRED' };

    if (facilityIds && facilityIds.length > 0) {
      const { attachmentIds, userIds } = await this.getFacilityScopedAttachmentAndUserIds(facilityIds);
      const orClauses: any[] = [];
      if (attachmentIds.length > 0) {
        orClauses.push({ medicalAttachmentId: { in: attachmentIds } });
      }
      if (userIds.length > 0) {
        orClauses.push({ submittedBy: { in: userIds } });
      }

      if (orClauses.length === 0) {
        return [];
      }
      where.OR = orClauses;
    }

    return (await this.db.oCRJob.findMany({
      where,
      include: { pages: true, extractedFields: true, verifications: true },
      orderBy: { createdAt: 'asc' },
      take: safeLimit,
    })) as unknown as OCRJobEntity[];
  }

  async createVerification(data: any): Promise<OCRVerificationEntity> {
    const ver = await this.db.oCRVerification.create({
      data: {
        ocrJobId: data.ocrJobId,
        reviewedBy: data.reviewedBy,
        reviewStatus: data.reviewStatus || 'APPROVED',
        reviewNotes: data.reviewNotes || null,
        completedAt: new Date(),
      },
    });

    // Update job status to COMPLETED
    await this.db.oCRJob.update({
      where: { id: data.ocrJobId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    return ver as unknown as OCRVerificationEntity;
  }

  async submitVerificationTransaction(
    jobId: string,
    userId: string,
    data: {
      reviewStatus: string;
      reviewNotes?: string;
      corrections?: Array<{
        fieldId?: string;
        fieldName: string;
        correctedValue: string;
        confidence?: number;
      }>;
    },
  ): Promise<OCRVerificationEntity> {
    return await this.db.$transaction(async (tx) => {
      // 1. Fetch current job within transaction
      const job = await tx.oCRJob.findFirst({
        where: { id: jobId, isDeleted: false },
        include: { extractedFields: true },
      });

      if (!job) {
        throw new NotFoundException('OCR job not found');
      }

      if (job.isDeleted) {
        throw new BadRequestException('Cannot review a deleted OCR job');
      }

      if (
        (job.status as string) === 'PROCESSING' ||
        job.status === 'PREPROCESSING' ||
        job.status === 'OCR_RUNNING' ||
        job.status === 'EXTRACTING'
      ) {
        throw new ConflictException('OCR job is currently being processed');
      }

      // Concurrency Guard: Check that status is still REVIEW_REQUIRED
      if (job.status === 'COMPLETED' || job.status === 'FAILED') {
        throw new ConflictException(`OCR job has already been completed with status '${job.status}'. Concurrent review aborted.`);
      }

      if (job.status !== 'REVIEW_REQUIRED') {
        throw new ConflictException(`OCR job is in '${job.status}' status, expected 'REVIEW_REQUIRED'.`);
      }

      // Concurrency Guard: Atomic updateMany on REVIEW_REQUIRED status
      const isRejected = data.reviewStatus === 'REJECTED';
      const updateCount = await tx.oCRJob.updateMany({
        where: { id: jobId, status: 'REVIEW_REQUIRED', isDeleted: false },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          ...(isRejected ? { failureReason: data.reviewNotes || 'Verification rejected by reviewer' } : {}),
        },
      });

      if (updateCount.count === 0) {
        throw new ConflictException('OCR job was reviewed concurrently by another user. Review aborted.');
      }

      // 2. Validate and apply state transitions based on reviewStatus
      if (data.reviewStatus === 'APPROVED') {
        if (typeof tx.extractedField?.updateMany === 'function') {
          await tx.extractedField.updateMany({
            where: { ocrJobId: jobId, requiresReview: true },
            data: { validationStatus: 'VALID', requiresReview: false },
          });
        }
      } else if (data.reviewStatus === 'REJECTED') {
        if (typeof tx.extractedField?.updateMany === 'function') {
          await tx.extractedField.updateMany({
            where: { ocrJobId: jobId },
            data: { validationStatus: 'REJECTED', requiresReview: false },
          });
        }
      } else if (data.reviewStatus === 'CORRECTED') {
        if (!data.corrections || data.corrections.length === 0) {
          throw new BadRequestException('Field corrections must be provided when reviewStatus is CORRECTED');
        }

        // Pre-validate all corrections before applying any database updates
        const seenFields = new Set<string>();
        for (const corr of data.corrections) {
          if (!corr.fieldName || corr.correctedValue === undefined) {
            throw new BadRequestException('Each correction must include fieldName and correctedValue');
          }

          const key = corr.fieldId ? `id:${corr.fieldId}` : `name:${corr.fieldName.trim().toLowerCase()}`;
          if (seenFields.has(key)) {
            throw new BadRequestException(
              `Duplicate correction supplied for field '${corr.fieldName}'. Each field may only be corrected once per review.`,
            );
          }
          seenFields.add(key);

          if (corr.fieldId && !job.extractedFields.some((f) => f.id === corr.fieldId)) {
            throw new BadRequestException(`Field ID '${corr.fieldId}' does not belong to OCR job '${jobId}'`);
          }
        }

        // Apply validated corrections
        for (const corr of data.corrections) {
          const existingField = job.extractedFields.find(
            (f) =>
              (corr.fieldId && f.id === corr.fieldId) ||
              f.fieldName.toLowerCase() === corr.fieldName.trim().toLowerCase(),
          );

          if (existingField) {
            // Log correction to OCRAuditLog preserving original OCR output
            await tx.oCRAuditLog.create({
              data: {
                ocrJobId: jobId,
                action: 'FIELD_CORRECTED',
                performedBy: userId,
                details: JSON.stringify({
                  fieldId: existingField.id,
                  fieldName: existingField.fieldName,
                  originalValue: existingField.fieldValue,
                  originalConfidence: existingField.confidence,
                  correctedValue: corr.correctedValue,
                }),
              },
            });

            // Update extracted field in place using transaction-scoped client
            await tx.extractedField.update({
              where: { id: existingField.id },
              data: {
                fieldValue: corr.correctedValue,
                confidence: corr.confidence ?? 1.0,
                validationStatus: 'CORRECTED',
                requiresReview: false,
              },
            });
          } else {
            // Reviewer added a newly identified field
            await tx.extractedField.create({
              data: {
                ocrJobId: jobId,
                fieldName: corr.fieldName.trim(),
                fieldValue: corr.correctedValue,
                confidence: corr.confidence ?? 1.0,
                validationStatus: 'CORRECTED',
                requiresReview: false,
              },
            });
          }
        }

        // Implicitly approve remaining unchanged fields in this job
        if (typeof tx.extractedField?.updateMany === 'function') {
          await tx.extractedField.updateMany({
            where: { ocrJobId: jobId, requiresReview: true, validationStatus: 'PENDING' },
            data: { validationStatus: 'VALID', requiresReview: false },
          });
        }
      }

      // 3. Create Verification record within transaction
      const ver = await tx.oCRVerification.create({
        data: {
          ocrJobId: jobId,
          reviewedBy: userId,
          reviewStatus: data.reviewStatus || 'APPROVED',
          reviewNotes: data.reviewNotes || null,
          completedAt: new Date(),
        },
      });

      // 4. Log completion audit within transaction
      await tx.oCRAuditLog.create({
        data: {
          ocrJobId: jobId,
          action: 'VERIFICATION_SUBMITTED',
          performedBy: userId,
          details: `Verification completed for job ${jobId} with status ${data.reviewStatus}. Corrections applied: ${data.corrections?.length || 0}`,
        },
      });

      return ver as unknown as OCRVerificationEntity;
    });
  }

  async findReviewHistory(options: {
    page?: number;
    limit?: number;
    status?: string;
    reviewerId?: string;
    facilityIds?: string[];
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ items: any[]; total: number }> {
    const safePage = Math.max(1, options.page || 1);
    const safeLimit = Math.min(Math.max(1, options.limit || 20), 100);
    const skip = (safePage - 1) * safeLimit;

    const where: any = {};
    if (options.status) {
      where.reviewStatus = options.status;
    }
    if (options.reviewerId) {
      where.reviewedBy = options.reviewerId;
    }
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    if (options.facilityIds && options.facilityIds.length > 0) {
      const { attachmentIds, userIds } = await this.getFacilityScopedAttachmentAndUserIds(options.facilityIds);
      const orClauses: any[] = [];
      if (attachmentIds.length > 0) {
        orClauses.push({ medicalAttachmentId: { in: attachmentIds } });
      }
      if (userIds.length > 0) {
        orClauses.push({ submittedBy: { in: userIds } });
      }
      if (options.reviewerId) {
        orClauses.push({ verifications: { some: { reviewedBy: options.reviewerId } } });
      }

      if (orClauses.length === 0) {
        return { total: 0, items: [] };
      }

      where.ocrJob = {
        isDeleted: false,
        OR: orClauses,
      };
    }

    const [total, items] = await Promise.all([
      this.db.oCRVerification.count({ where }),
      this.db.oCRVerification.findMany({
        where,
        include: {
          ocrJob: {
            include: {
              extractedFields: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        skip,
      }),
    ]);

    return { total, items };
  }

  // ─── Audit Logs ──────────────────────────────────────────────────────────

  async createAuditLog(data: { ocrJobId?: string; action: string; performedBy?: string; details?: string }): Promise<OCRAuditLogEntity> {
    return (await this.db.oCRAuditLog.create({
      data: {
        ocrJobId: data.ocrJobId || null,
        action: data.action,
        performedBy: data.performedBy || null,
        details: data.details || null,
      },
    })) as unknown as OCRAuditLogEntity;
  }

  async findAuditLogs(limit = 100): Promise<OCRAuditLogEntity[]> {
    return (await this.db.oCRAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    })) as unknown as OCRAuditLogEntity[];
  }

  // ─── Dashboard Stats ─────────────────────────────────────────────────────

  async getDashboardStats() {
    const [
      totalJobs,
      completedJobs,
      reviewRequiredJobs,
      failedJobs,
      activeTemplatesCount,
      avgConfidenceResult,
    ] = await Promise.all([
      this.db.oCRJob.count({ where: { isDeleted: false } }),
      this.db.oCRJob.count({ where: { isDeleted: false, status: 'COMPLETED' } }),
      this.db.oCRJob.count({ where: { isDeleted: false, status: 'REVIEW_REQUIRED' } }),
      this.db.oCRJob.count({ where: { isDeleted: false, status: 'FAILED' } }),
      this.db.oCRTemplate.count({ where: { isDeleted: false, isActive: true } }),
      this.db.oCRJob.aggregate({
        where: { isDeleted: false, overallConfidence: { not: null } },
        _avg: { overallConfidence: true },
      }),
    ]);

    return {
      totalJobs,
      completedJobs,
      reviewRequiredJobs,
      failedJobs,
      averageConfidence: avgConfidenceResult._avg.overallConfidence || 0.0,
      activeTemplatesCount,
    };
  }
}
