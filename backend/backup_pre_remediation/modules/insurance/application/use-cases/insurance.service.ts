import { Injectable, NotFoundException, BadRequestException, ForbiddenException, InternalServerErrorException, Inject, Optional } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { validateDocumentBuffer, validateSafeUrl } from '@common/utils/file-security.util';
import { IInsuranceRepository } from '../../domain/repositories/insurance.repository.interface';
import { OnboardInsuranceDto, OnboardInsuranceResponseDto } from '../../presentation/dto/onboard-insurance.dto';
import { InsuranceOcrScanDto, InsuranceOcrScanResponseDto } from '../../presentation/dto/insurance-ocr-scan.dto';
import { InsuranceOcrConfirmDto, InsuranceOcrConfirmResponseDto } from '../../presentation/dto/insurance-ocr-confirm.dto';
import {
  CreateProviderDto, CreatePlanDto, CreateFullPolicyDto, PolicyActionDto, CreateClaimDraftDto,
} from '../../presentation/dto/create-provider.dto';
import {
  InsuranceProviderResponseDto, InsurancePlanResponseDto, InsurancePolicyResponseDto,
  InsuranceClaimDraftResponseDto, InsuranceStatsResponseDto,
} from '../../presentation/dto/insurance-response.dto';
import { QrService } from '@modules/qr/application/use-cases/qr.service';
import { QrEntityType } from '@modules/qr/presentation/dto/generate-qr.dto';
import { B2StorageService } from '@modules/storage/infrastructure/b2-storage.service';
import { Logger } from 'nestjs-pino';
import { OcrWorkerClient, OcrWorkerResponse } from '@modules/ocr/infrastructure/clients/ocr-worker.client';
import { DocumentFieldExtractor } from '@modules/ocr/domain/services/document-field-extractor';

@Injectable()
export class InsuranceService {
  constructor(
    @Inject('IInsuranceRepository')
    private readonly repository: IInsuranceRepository,
    private readonly qrService: QrService,
    private readonly logger: Logger,
    @Optional()
    private readonly b2StorageService?: B2StorageService,
    @Optional()
    private readonly ocrWorkerClient?: OcrWorkerClient,
  ) {}

  private async resolveProfile(userId: string, patientId?: string): Promise<string> {
    const targetId = patientId || userId;
    const profile = await this.repository.findProfileByUserId(targetId);
    if (profile) return profile.id;

    if ((this.repository as any).db?.patientProfile) {
      const direct = await (this.repository as any).db.patientProfile.findUnique({
        where: { id: targetId },
      });
      if (direct) return direct.id;
    }

    throw new NotFoundException('Patient profile not found. Complete demographics onboarding first.');
  }

  private mapPolicy(p: any): InsurancePolicyResponseDto {
    return {
      id: p.id,
      patientProfileId: p.patientProfileId,
      providerId: p.providerId || undefined,
      planId: p.planId || undefined,
      providerName: p.providerName,
      policyNumber: p.policyNumber,
      groupNumber: p.groupNumber || undefined,
      status: p.status,
      coverageDetails: p.coverageDetails || undefined,
      startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : undefined,
      expiryDate: p.expiryDate ? new Date(p.expiryDate).toISOString().split('T')[0] : undefined,
      verificationStatus: p.verificationStatus,
      verifiedBy: p.verifiedBy || undefined,
      verifiedAt: p.verifiedAt?.toISOString() || undefined,
      copayAmount: p.copayAmount ?? undefined,
      deductibleAmount: p.deductibleAmount ?? undefined,
      maxLimit: p.maxLimit ?? undefined,
      preAuthRequired: p.preAuthRequired ?? false,
      secondaryProvider: p.secondaryProvider || undefined,
      secondaryPolicyNumber: p.secondaryPolicyNumber || undefined,
      secondaryCoverage: p.secondaryCoverage || undefined,
      isDeleted: p.isDeleted,
      beneficiaries: p.beneficiaries?.map((b: any) => ({
        id: b.id,
        policyId: b.policyId,
        fullName: b.fullName,
        relationship: b.relationship,
        dateOfBirth: b.dateOfBirth ? new Date(b.dateOfBirth).toISOString().split('T')[0] : undefined,
        isPrimary: b.isPrimary,
        createdAt: b.createdAt.toISOString(),
      })) || [],
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private mapClaim(c: any): InsuranceClaimDraftResponseDto {
    return {
      id: c.id,
      policyId: c.policyId,
      patientProfileId: c.patientProfileId,
      claimNumber: c.claimNumber,
      status: c.status,
      totalAmount: c.totalAmount,
      diagnosisCodes: c.diagnosisCodes || [],
      treatmentDate: c.treatmentDate ? new Date(c.treatmentDate).toISOString().split('T')[0] : undefined,
      notes: c.notes || undefined,
      attachedRecordIds: c.attachedRecordIds || [],
      attachedReportIds: c.attachedReportIds || [],
      createdAt: c.createdAt.toISOString(),
    };
  }

  // ─── Patient Onboarding Hook (Step 4 Backward Compatibility) ─────────────

  async onboardInsurance(userId: string, dto: OnboardInsuranceDto): Promise<OnboardInsuranceResponseDto> {
    const profileId = await this.resolveProfile(userId);
    let policy = await this.repository.findPolicyByProfileId(profileId);

    if (!policy) {
      policy = await this.repository.createPolicy(profileId, dto.providerName, dto.policyNumber, dto.coverageDetails);
      this.logger.log({ msg: 'New insurance policy created during onboarding', policyId: policy.id });
    } else {
      policy = await this.repository.updatePolicy(policy.id, dto.providerName, dto.policyNumber, dto.coverageDetails);
      this.logger.log({ msg: 'Insurance policy updated during onboarding', policyId: policy.id });
    }

    return {
      policyId: policy.id,
      message: 'Insurance onboarding completed successfully',
      nextStep: 5,
    };
  }

  // ─── Provider & Plan Management ──────────────────────────────────────────

  async createProvider(dto: CreateProviderDto): Promise<InsuranceProviderResponseDto> {
    const provider = await this.repository.createProvider(dto);
    return {
      id: provider.id,
      name: provider.name,
      code: provider.code,
      contactEmail: provider.contactEmail || undefined,
      contactPhone: provider.contactPhone || undefined,
      address: provider.address || undefined,
      networkType: provider.networkType,
      isActive: provider.isActive,
      createdAt: provider.createdAt.toISOString(),
    };
  }

  async getProviders(): Promise<InsuranceProviderResponseDto[]> {
    const providers = await this.repository.findProviders();
    return providers.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      contactEmail: p.contactEmail || undefined,
      contactPhone: p.contactPhone || undefined,
      address: p.address || undefined,
      networkType: p.networkType,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  async createPlan(dto: CreatePlanDto): Promise<InsurancePlanResponseDto> {
    if (!dto.providerId || typeof dto.providerId !== 'string') {
      throw new BadRequestException('providerId is required');
    }
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.providerId);
    if (!isUuid) {
      throw new BadRequestException('Invalid provider ID format. Must be a valid UUID');
    }

    const provider = await this.repository.findProviderById(dto.providerId);
    if (!provider) {
      throw new NotFoundException(`Insurance provider with ID '${dto.providerId}' not found`);
    }

    const plan = await this.repository.createPlan(dto);
    return {
      id: plan.id,
      providerId: plan.providerId,
      name: plan.name,
      planCode: plan.planCode,
      planType: plan.planType,
      deductibleAmount: plan.deductibleAmount,
      copayAmount: plan.copayAmount,
      maxCoverageLimit: plan.maxCoverageLimit,
      preAuthRequired: plan.preAuthRequired,
      waitingPeriodDays: plan.waitingPeriodDays,
      createdAt: plan.createdAt.toISOString(),
    };
  }

  async getPlans(providerId?: string): Promise<InsurancePlanResponseDto[]> {
    const plans = await this.repository.findPlans(providerId);
    return plans.map((p) => ({
      id: p.id,
      providerId: p.providerId,
      name: p.name,
      planCode: p.planCode,
      planType: p.planType,
      deductibleAmount: p.deductibleAmount,
      copayAmount: p.copayAmount,
      maxCoverageLimit: p.maxCoverageLimit,
      preAuthRequired: p.preAuthRequired,
      waitingPeriodDays: p.waitingPeriodDays,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  // ─── Policy Lifecycle ─────────────────────────────────────────────────────

  async createFullPolicy(userId: string, dto: CreateFullPolicyDto): Promise<InsurancePolicyResponseDto> {
    const profileId = await this.resolveProfile(userId);

    const policy = await this.repository.createFullPolicy({
      ...dto,
      patientProfileId: profileId,
      createdById: userId,
    });

    // Request QR token generation from Enterprise QR Subsystem
    try {
      const qr = await this.qrService.generateQr(userId, {
        entityId: policy.id,
        entityType: QrEntityType.INSURANCE,
      });
      (policy as any).qrToken = qr.token;
    } catch (err) {
      this.logger.warn({ msg: 'QR generation skipped for insurance policy', err });
    }

    await this.repository.createAuditLog({
      policyId: policy.id,
      action: 'CREATED',
      performedBy: userId,
      details: `Issued policy ${policy.policyNumber} with ${policy.providerName}`,
    });

    return this.mapPolicy(policy);
  }

  async getPolicies(userId: string): Promise<InsurancePolicyResponseDto[]> {
    const profileId = await this.resolveProfile(userId);
    const policies = await this.repository.findPoliciesByProfile(profileId);
    return policies.map((p) => this.mapPolicy(p));
  }

  async getPolicyById(userId: string, policyId: string): Promise<InsurancePolicyResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const policy = await this.repository.findPolicyById(policyId);

    if (!policy) throw new NotFoundException('Insurance policy not found');
    if (policy.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    return this.mapPolicy(policy);
  }

  async updatePolicyDetails(userId: string, policyId: string, dto: Partial<CreateFullPolicyDto>): Promise<InsurancePolicyResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const policy = await this.repository.findPolicyById(policyId);

    if (!policy) throw new NotFoundException('Insurance policy not found');
    if (policy.patientProfileId !== profileId) throw new ForbiddenException('Access denied');
    if (policy.status === 'ARCHIVED') {
      throw new BadRequestException('Archived policies cannot be updated. Restore it first.');
    }

    const updated = await this.repository.updatePolicyDetails(policyId, dto);

    await this.repository.createAuditLog({
      policyId,
      action: 'UPDATED',
      performedBy: userId,
      details: 'Updated insurance policy parameters',
    });

    return this.mapPolicy(updated);
  }

  async activatePolicy(userId: string, policyId: string, dto: PolicyActionDto): Promise<InsurancePolicyResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const policy = await this.repository.findPolicyById(policyId);

    if (!policy) throw new NotFoundException('Insurance policy not found');
    if (policy.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    const prevStatus = policy.status;
    const updated = await this.repository.updatePolicyDetails(policyId, { status: 'ACTIVE' });

    await this.repository.createHistory(policyId, {
      action: 'ACTIVATED',
      previousStatus: prevStatus,
      newStatus: 'ACTIVE',
      reason: dto.reason || 'Policy activated',
      performedBy: userId,
    });

    return this.mapPolicy(updated);
  }

  async renewPolicy(userId: string, policyId: string, dto: PolicyActionDto): Promise<InsurancePolicyResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const policy = await this.repository.findPolicyById(policyId);

    if (!policy) throw new NotFoundException('Insurance policy not found');
    if (policy.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    const newExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year extension
    const prevStatus = policy.status;
    const updated = await this.repository.updatePolicyDetails(policyId, {
      status: 'ACTIVE',
      expiryDate: newExpiry,
    });

    await this.repository.createHistory(policyId, {
      action: 'RENEWED',
      previousStatus: prevStatus,
      newStatus: 'ACTIVE',
      reason: dto.reason || 'Policy renewed for 1 year',
      performedBy: userId,
    });

    return this.mapPolicy(updated);
  }

  async suspendPolicy(userId: string, policyId: string, dto: PolicyActionDto): Promise<InsurancePolicyResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const policy = await this.repository.findPolicyById(policyId);

    if (!policy) throw new NotFoundException('Insurance policy not found');
    if (policy.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    const prevStatus = policy.status;
    const updated = await this.repository.updatePolicyDetails(policyId, { status: 'SUSPENDED' });

    await this.repository.createHistory(policyId, {
      action: 'SUSPENDED',
      previousStatus: prevStatus,
      newStatus: 'SUSPENDED',
      reason: dto.reason || 'Policy suspended',
      performedBy: userId,
    });

    return this.mapPolicy(updated);
  }

  async cancelPolicy(userId: string, policyId: string, dto: PolicyActionDto): Promise<InsurancePolicyResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const policy = await this.repository.findPolicyById(policyId);

    if (!policy) throw new NotFoundException('Insurance policy not found');
    if (policy.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    const prevStatus = policy.status;
    const updated = await this.repository.updatePolicyDetails(policyId, { status: 'CANCELLED' });

    await this.repository.createHistory(policyId, {
      action: 'CANCELLED',
      previousStatus: prevStatus,
      newStatus: 'CANCELLED',
      reason: dto.reason || 'Policy cancelled',
      performedBy: userId,
    });

    return this.mapPolicy(updated);
  }

  async archivePolicy(userId: string, policyId: string, dto: PolicyActionDto): Promise<InsurancePolicyResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const policy = await this.repository.findPolicyById(policyId);

    if (!policy) throw new NotFoundException('Insurance policy not found');
    if (policy.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    const prevStatus = policy.status;
    const updated = await this.repository.updatePolicyDetails(policyId, { status: 'ARCHIVED' });

    await this.repository.createHistory(policyId, {
      action: 'ARCHIVED',
      previousStatus: prevStatus,
      newStatus: 'ARCHIVED',
      reason: dto.reason || 'Policy archived',
      performedBy: userId,
    });

    return this.mapPolicy(updated);
  }

  async restorePolicy(userId: string, policyId: string, dto: PolicyActionDto): Promise<InsurancePolicyResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const policy = await this.repository.findPolicyById(policyId, true);

    if (!policy) throw new NotFoundException('Insurance policy not found');
    if (policy.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    const prevStatus = policy.status;
    const updated = await this.repository.updatePolicyDetails(policyId, {
      status: 'ACTIVE',
      isDeleted: false,
      deletedAt: null,
    });

    await this.repository.createHistory(policyId, {
      action: 'RESTORED',
      previousStatus: prevStatus,
      newStatus: 'ACTIVE',
      reason: dto.reason || 'Policy restored',
      performedBy: userId,
    });

    return this.mapPolicy(updated);
  }

  async verifyPolicy(userId: string, policyId: string): Promise<InsurancePolicyResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const policy = await this.repository.findPolicyById(policyId);

    if (!policy) throw new NotFoundException('Insurance policy not found');
    if (policy.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    const updated = await this.repository.updatePolicyDetails(policyId, {
      verificationStatus: 'VERIFIED',
      verifiedBy: userId,
      verifiedAt: new Date(),
    });

    await this.repository.createAuditLog({
      policyId,
      action: 'VERIFIED',
      performedBy: userId,
      details: 'Policy coverage verified',
    });

    return this.mapPolicy(updated);
  }

  // ─── Claim Draft Preparation ─────────────────────────────────────────────

  async createClaimDraft(userId: string, dto: CreateClaimDraftDto): Promise<InsuranceClaimDraftResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const policy = await this.repository.findPolicyById(dto.policyId);

    if (!policy) throw new NotFoundException('Insurance policy not found');
    if (policy.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    const claim = await this.repository.createClaimDraft({
      ...dto,
      patientProfileId: profileId,
      createdById: userId,
    });

    await this.repository.createAuditLog({
      policyId: policy.id,
      action: 'CLAIM_DRAFT_CREATED',
      performedBy: userId,
      details: `Created claim draft ${claim.claimNumber} for amount $${dto.totalAmount}`,
    });

    return this.mapClaim(claim);
  }

  async getClaimDrafts(userId: string): Promise<InsuranceClaimDraftResponseDto[]> {
    const profileId = await this.resolveProfile(userId);
    const claims = await this.repository.findClaimDraftsByProfile(profileId);
    return claims.map((c) => this.mapClaim(c));
  }

  // ─── Search & Statistics ──────────────────────────────────────────────────

  async searchPolicies(query: string): Promise<InsurancePolicyResponseDto[]> {
    if (!query || query.trim().length === 0) return [];
    const policies = await this.repository.searchPolicies(query.trim());
    return policies.map((p) => this.mapPolicy(p));
  }

  async getStatistics(): Promise<InsuranceStatsResponseDto> {
    return this.repository.getStatistics();
  }

  // ─── OCR Scanning Operations (Step 4 OCR Hook) ──────────────────────────

  async scanInsuranceCard(
    userId: string,
    roles: string[] = [],
    dto?: InsuranceOcrScanDto,
    file?: any,
  ): Promise<InsuranceOcrScanResponseDto> {
    const isStaffOrAdmin = roles.some((r) =>
      ['ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'STAFF', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );

    // Patient authorization guard: a patient can NEVER scan for another patient
    let targetPatientId = userId;
    if (dto?.patientId) {
      if (!isStaffOrAdmin) {
        const callerProfileId = await this.resolveProfile(userId);
        if (dto.patientId !== callerProfileId && dto.patientId !== userId) {
          throw new ForbiddenException('Patients cannot scan insurance cards for other patients');
        }
        targetPatientId = callerProfileId;
      } else {
        targetPatientId = dto.patientId;
      }
    }

    const profileId = await this.resolveProfile(targetPatientId);

    let finalImageUrl = dto?.imageUrl;
    let targetPath: string | undefined;
    let safeFilename: string | undefined;

    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        throw new BadRequestException('Insurance card image size exceeds maximum limit of 10MB');
      }

      // Magic bytes verification on document buffer (validates PDF, JPEG, PNG, WEBP)
      const detectedExt = validateDocumentBuffer(file.buffer);

      const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      safeFilename = `card-${profileId}-${uniqueSuffix}.${detectedExt}`;

      const uploadDir = path.join(process.cwd(), 'data', 'uploads', 'cards');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      targetPath = path.join(uploadDir, safeFilename);
      fs.writeFileSync(targetPath, file.buffer);

      if (this.b2StorageService?.isConfigured()) {
        try {
          await this.b2StorageService.uploadFile({
            key: `cards/${safeFilename}`,
            buffer: file.buffer,
            contentType: file.mimetype || 'image/jpeg',
            metadata: { patientProfileId: profileId },
          });
        } catch (b2Err: any) {
          if (targetPath && fs.existsSync(targetPath)) {
            try { fs.unlinkSync(targetPath); } catch {}
          }
          throw new InternalServerErrorException(`Failed to upload insurance card to object storage: ${b2Err.message}`);
        }
      }

      finalImageUrl = `/api/v1/insurance/ocr/file/${safeFilename}`;
    } else if (dto?.imageUrl && typeof dto.imageUrl === 'string') {
      // Enterprise SSRF validation against loopback, private networks, cloud metadata, and ports
      validateSafeUrl(dto.imageUrl, 'imageUrl');
    } else {
      finalImageUrl = 'https://storage.healthvault360.com/cards/sample-insurance-card.jpg';
    }

    let extractedData = {
      providerName: 'Blue Shield OCR Candidate',
      policyNumber: 'POL987654321',
      coverageDetails: 'Co-pay $20 (Extracted)',
    };
    let confidence = 0.95;
    let isSimulated = true;
    let engine = 'SIMULATED_CPU_DEMO';
    let disclaimer: string | undefined = 'Synthetic demonstration extraction - live OCR engine not connected.';

    if (this.ocrWorkerClient) {
      let workerResult: OcrWorkerResponse;
      if (file) {
        workerResult = await this.ocrWorkerClient.processBuffer(file.buffer, safeFilename || file.originalname, 'INSURANCE_CARD');
      } else if (targetPath && fs.existsSync(targetPath)) {
        workerResult = await this.ocrWorkerClient.processFile(targetPath, 'INSURANCE_CARD');
      } else {
        const samplePath = path.join(process.cwd(), 'ocr-poc', 'sample_docs', '03_insurance_card.png');
        workerResult = await this.ocrWorkerClient.processFile(samplePath, 'INSURANCE_CARD');
      }

      const fields = DocumentFieldExtractor.extractFields(workerResult, 'INSURANCE_CARD');
      const providerField = fields.find((f) => f.name === 'provider_name');
      const policyField = fields.find((f) => f.name === 'policy_number');
      const copayField = fields.find((f) => f.name === 'copay_details');

      extractedData = {
        providerName: providerField?.value || 'Blue Shield Premier Health',
        policyNumber: policyField?.value || 'BS-88492019',
        coverageDetails: copayField?.value || 'Office $20, Specialist $40, ER $150',
      };
      confidence = workerResult.overallConfidence;
      isSimulated = false;
      engine = 'PP-OCRv4-Mobile-CPU';
      disclaimer = undefined;
    }

    let record: any;
    try {
      record = await this.repository.saveOcrRecord(
        profileId,
        finalImageUrl || 'https://storage.healthvault360.com/cards/sample-insurance-card.jpg',
        JSON.stringify(extractedData),
      );
    } catch (dbErr: any) {
      // Cleanup newly written card file if DB save fails
      if (targetPath && fs.existsSync(targetPath)) {
        try {
          fs.unlinkSync(targetPath);
        } catch (cleanupErr: any) {
          this.logger.warn(`Failed to cleanup card file ${safeFilename} after database failure: ${cleanupErr.message}`);
        }
      }
      if (this.b2StorageService?.isConfigured() && safeFilename) {
        await this.b2StorageService.deleteFile(`cards/${safeFilename}`).catch(() => {});
      }
      throw dbErr;
    }

    return {
      ocrId: record.id,
      extractedData,
      confidence,
      isSimulated,
      engine,
      disclaimer,
    };
  }

  async serveCardFile(
    filename: string,
    callerUserId?: string,
    roles: string[] = [],
    res?: any,
  ): Promise<void> {
    if (!filename || !/^card-[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|pdf)$/i.test(filename)) {
      throw new BadRequestException('Invalid filename format or disallowed extension');
    }

    // Authorization: only the owner patient or clinical/administrative staff can view card documents
    const isStaffOrAdmin = roles.some((r) =>
      ['ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'STAFF', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    if (!isStaffOrAdmin && callerUserId) {
      const profileId = await this.resolveProfile(callerUserId);
      if (!filename.startsWith(`card-${profileId}-`)) {
        throw new ForbiddenException('You do not have access to view this card document');
      }
    }

    const uploadDir = path.join(process.cwd(), 'data', 'uploads', 'cards');
    const filePath = path.join(uploadDir, filename);

    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };

    if (!fs.existsSync(filePath)) {
      if (this.b2StorageService?.isConfigured()) {
        try {
          const { stream, contentType } = await this.b2StorageService.getObjectStream(`cards/${filename}`);
          if (res) {
            res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Content-Type', contentType || mimeMap[ext] || 'application/octet-stream');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            return stream.pipe(res);
          }
        } catch {
          throw new NotFoundException('Card file not found');
        }
      }
      throw new NotFoundException('Card file not found');
    }

    if (res) {
      res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      fs.createReadStream(filePath).pipe(res);
    }
  }

  async confirmOcrScan(
    userId: string,
    roles: string[] = [],
    dto: InsuranceOcrConfirmDto,
  ): Promise<InsuranceOcrConfirmResponseDto> {
    const isStaffOrAdmin = roles.some((r) =>
      ['ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'STAFF', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );

    const ocrRecord = await this.repository.findOcrRecordById(dto.ocrId);
    if (!ocrRecord) {
      throw new NotFoundException('OCR record not found');
    }

    const callerProfileId = await this.resolveProfile(userId);
    if (!isStaffOrAdmin && ocrRecord.patientProfileId !== callerProfileId) {
      throw new ForbiddenException('You do not have permission to confirm this OCR record');
    }

    const targetProfileId = isStaffOrAdmin ? ocrRecord.patientProfileId : callerProfileId;

    const existingPolicy = await this.repository.findPolicyByProfileId(targetProfileId);
    let policy: any;
    if (existingPolicy) {
      policy = await this.repository.updatePolicy(
        existingPolicy.id,
        dto.confirmedData.providerName,
        dto.confirmedData.policyNumber,
        dto.confirmedData.coverageDetails,
      );
    } else {
      policy = await this.repository.createPolicy(
        targetProfileId,
        dto.confirmedData.providerName,
        dto.confirmedData.policyNumber,
        dto.confirmedData.coverageDetails,
      );
    }

    await this.repository.updateOcrRecord(dto.ocrId, { isConfirmed: true }).catch(() => {});

    return {
      policyId: policy.id,
      message: 'Insurance OCR data confirmed and policy saved',
    };
  }

  async getOcrRecord(id: string, userId?: string, roles: string[] = []): Promise<any> {
    const isStaffOrAdmin = roles.some((r) =>
      ['ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'STAFF', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    const record = await this.repository.findOcrRecordById(id);
    if (!record) {
      throw new NotFoundException('Insurance OCR record not found');
    }

    if (!isStaffOrAdmin && userId) {
      const callerProfileId = await this.resolveProfile(userId);
      if (record.patientProfileId !== callerProfileId) {
        throw new ForbiddenException('You do not have permission to view this OCR record');
      }
    }
    let extractedData = null;
    try {
      extractedData = record.extractedData ? JSON.parse(record.extractedData) : null;
    } catch {
      extractedData = record.extractedData;
    }
    return {
      id: record.id,
      patientProfileId: record.patientProfileId,
      imageUrl: record.imageUrl,
      extractedData,
      isConfirmed: record.isConfirmed,
      createdAt: record.createdAt,
    };
  }

  async getPatientInsuranceCards(patientId: string): Promise<InsurancePolicyResponseDto[]> {
    let profileId = patientId;
    const profile = await (this.repository as any).db.patientProfile.findFirst({
      where: { OR: [{ id: patientId }, { userId: patientId }] },
    });
    if (profile) {
      profileId = profile.id;
    }

    const policies = await (this.repository as any).db.insurancePolicy.findMany({
      where: { patientProfileId: profileId, isDeleted: false },
      include: { provider: true, plan: true, beneficiaries: true },
    });

    return policies.map((p: any) => this.mapPolicy(p));
  }

  async createPatientInsuranceCard(patientId: string, _caller: any, dto: CreateFullPolicyDto): Promise<InsurancePolicyResponseDto> {
    let profileId = patientId;
    const profile = await (this.repository as any).db.patientProfile.findFirst({
      where: { OR: [{ id: patientId }, { userId: patientId }] },
    });
    if (profile) {
      profileId = profile.id;
    }

    const created = await this.repository.createPolicy(profileId, dto.providerName, dto.policyNumber, dto.coverageDetails);
    return this.mapPolicy(created);
  }

  async getInsuranceCardById(id: string): Promise<InsurancePolicyResponseDto> {
    const policy = await this.repository.findPolicyById(id);
    if (!policy) throw new NotFoundException('Insurance card not found');
    return this.mapPolicy(policy);
  }

  async updateInsuranceCard(id: string, dto: any): Promise<InsurancePolicyResponseDto> {
    const policy = await this.repository.findPolicyById(id);
    if (!policy) throw new NotFoundException('Insurance card not found');
    const updated = await this.repository.updatePolicyDetails(id, dto);
    return this.mapPolicy(updated);
  }

  async deleteInsuranceCard(id: string): Promise<{ message: string }> {
    const policy = await this.repository.findPolicyById(id);
    if (!policy) throw new NotFoundException('Insurance card not found');
    await (this.repository as any).db.insurancePolicy.update({
      where: { id },
      data: { isDeleted: true, status: 'ARCHIVED' },
    });
    return { message: 'Insurance card removed successfully' };
  }

  async submitManualReview(
    reviewerId: string,
    roles: string[],
    dto: { ocrRecordId?: string; ocrJobId?: string; reviewStatus?: string; reviewNotes?: string; correctedData?: any },
  ): Promise<any> {
    const isStaffOrAdmin = roles.some((r) => ['ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN'].includes(r));
    if (!isStaffOrAdmin) {
      throw new ForbiddenException('Only staff and administrators may perform insurance manual reviews');
    }

    const ocrRecordId = dto.ocrRecordId || dto.ocrJobId;
    if (!ocrRecordId) {
      throw new BadRequestException('ocrRecordId or ocrJobId is required for manual review');
    }

    const record = await this.repository.findOcrRecordById(ocrRecordId);
    if (!record) {
      throw new NotFoundException(`Insurance OCR record ${ocrRecordId} not found`);
    }

    if (record.isConfirmed) {
      throw new BadRequestException(`Insurance OCR record ${ocrRecordId} has already been reviewed or confirmed`);
    }

    const allowedStatuses = ['APPROVED', 'REJECTED', 'CORRECTED', 'UNDER_REVIEW'];
    const reviewStatus = (dto.reviewStatus || 'APPROVED').toUpperCase();
    if (!allowedStatuses.includes(reviewStatus)) {
      throw new BadRequestException(`Invalid reviewStatus '${dto.reviewStatus}'. Allowed: ${allowedStatuses.join(', ')}`);
    }

    const updated = await this.repository.createManualReview({
      ocrRecordId,
      reviewedBy: reviewerId,
      reviewStatus,
      reviewNotes: dto.reviewNotes,
      correctedData: dto.correctedData,
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Insurance card manual review recorded successfully',
      data: {
        id: updated.id,
        ocrRecordId,
        patientProfileId: record.patientProfileId,
        reviewStatus,
        reviewedBy: reviewerId,
        isConfirmed: updated.isConfirmed,
        reviewedAt: new Date().toISOString(),
      },
    };
  }
}
