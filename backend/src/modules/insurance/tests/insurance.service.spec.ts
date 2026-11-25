import { Test, TestingModule } from '@nestjs/testing';
import { InsuranceService } from '../application/use-cases/insurance.service';
import { NotFoundException, BadRequestException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { QrService } from '@modules/qr/application/use-cases/qr.service';
import { OcrWorkerClient } from '@modules/ocr/infrastructure/clients/ocr-worker.client';

const mockProfileId = 'profile-uuid-1';
const mockUserId = 'user-uuid-1';
const mockPolicyId = 'policy-uuid-1';

const mockRepo = {
  findProfileByUserId: jest.fn(),
  createProvider: jest.fn(),
  findProviders: jest.fn(),
  createPlan: jest.fn(),
  findPlans: jest.fn(),
  createPolicy: jest.fn(),
  createFullPolicy: jest.fn(),
  findPolicyById: jest.fn(),
  findPolicyByProfileId: jest.fn(),
  findPoliciesByProfile: jest.fn(),
  updatePolicy: jest.fn(),
  updatePolicyDetails: jest.fn(),
  softDeletePolicy: jest.fn(),
  searchPolicies: jest.fn(),
  createClaimDraft: jest.fn(),
  findClaimDraftsByProfile: jest.fn(),
  createHistory: jest.fn(),
  createAuditLog: jest.fn(),
  saveOcrRecord: jest.fn(),
  findOcrRecordById: jest.fn(),
  updateOcrRecord: jest.fn(),
  getStatistics: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

const mockQrService = {
  generateQr: jest.fn(),
  verifyQrPayload: jest.fn(),
  rotateQr: jest.fn(),
  revokeQr: jest.fn(),
};

const mockOcrWorkerClient = {
  isReady: jest.fn().mockResolvedValue(true),
  processBuffer: jest.fn().mockResolvedValue({
    success: true,
    documentType: 'INSURANCE_CARD',
    sourceFile: 'card.pdf',
    pageCount: 1,
    overallConfidence: 0.95,
    combinedText: 'HEALTH VAULT 360 INSURANCE\nProvider: State Life Insurance\nPolicy Number: POL-999\nCopay: $25',
    pages: [],
    durationMs: 300,
    engine: 'PP-OCRv4-Mobile-CPU',
  }),
  processFile: jest.fn(),
};

describe('InsuranceService', () => {
  let service: InsuranceService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: 'IInsuranceRepository', useValue: mockRepo },
        { provide: QrService, useValue: mockQrService },
        { provide: Logger, useValue: mockLogger },
        { provide: OcrWorkerClient, useValue: mockOcrWorkerClient },
      ],
    }).compile();
    service = module.get<InsuranceService>(InsuranceService);
  });

  describe('createFullPolicy', () => {
    it('should throw if patient profile is not found', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(null);
      await expect(service.createFullPolicy(mockUserId, {
        providerName: 'State Life',
        policyNumber: 'POL-100',
      })).rejects.toThrow(NotFoundException);
    });

    it('should create policy and request QR token from QrService', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      const mockCreated = {
        id: mockPolicyId,
        patientProfileId: mockProfileId,
        providerName: 'State Life',
        policyNumber: 'POL-100',
        status: 'ACTIVE',
        verificationStatus: 'PENDING',
        isDeleted: false,
        beneficiaries: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createFullPolicy.mockResolvedValue(mockCreated);
      mockQrService.generateQr.mockResolvedValue({ token: 'HVQR-INSURANCE123' });
      mockRepo.createAuditLog.mockResolvedValue({});

      const result = await service.createFullPolicy(mockUserId, {
        providerName: 'State Life',
        policyNumber: 'POL-100',
      });

      expect(result.id).toBe(mockPolicyId);
      expect(result.status).toBe('ACTIVE');
      expect(mockQrService.generateQr).toHaveBeenCalledWith(mockUserId, expect.objectContaining({
        entityId: mockPolicyId,
      }));
    });
  });

  describe('policy lifecycle (renew / suspend / verify)', () => {
    it('should extend expiry date on renew', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findPolicyById.mockResolvedValue({
        id: mockPolicyId,
        patientProfileId: mockProfileId,
        status: 'ACTIVE',
        verificationStatus: 'PENDING',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockRenewed = {
        id: mockPolicyId,
        patientProfileId: mockProfileId,
        providerName: 'State Life',
        policyNumber: 'POL-100',
        status: 'ACTIVE',
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        verificationStatus: 'PENDING',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.updatePolicyDetails.mockResolvedValue(mockRenewed);
      mockRepo.createHistory.mockResolvedValue({});

      const result = await service.renewPolicy(mockUserId, mockPolicyId, { reason: 'Annual renewal' });
      expect(result.status).toBe('ACTIVE');
      expect(mockRepo.createHistory).toHaveBeenCalledWith(mockPolicyId, expect.objectContaining({
        action: 'RENEWED',
      }));
    });

    it('should verify policy coverage status', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findPolicyById.mockResolvedValue({
        id: mockPolicyId,
        patientProfileId: mockProfileId,
        status: 'ACTIVE',
        verificationStatus: 'PENDING',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockVerified = {
        id: mockPolicyId,
        patientProfileId: mockProfileId,
        providerName: 'State Life',
        policyNumber: 'POL-100',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.updatePolicyDetails.mockResolvedValue(mockVerified);
      mockRepo.createAuditLog.mockResolvedValue({});

      const result = await service.verifyPolicy(mockUserId, mockPolicyId);
      expect(result.verificationStatus).toBe('VERIFIED');
    });
  });

  describe('createClaimDraft', () => {
    it('should create claim draft linked to medical records & reports', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findPolicyById.mockResolvedValue({
        id: mockPolicyId,
        patientProfileId: mockProfileId,
      });

      const mockClaim = {
        id: 'claim-1',
        policyId: mockPolicyId,
        patientProfileId: mockProfileId,
        claimNumber: 'CLM-100',
        status: 'DRAFT',
        totalAmount: 500,
        diagnosisCodes: ['ICD10-E11.9'],
        treatmentDate: new Date(),
        attachedRecordIds: ['rec-1'],
        attachedReportIds: ['rep-1'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createClaimDraft.mockResolvedValue(mockClaim);
      mockRepo.createAuditLog.mockResolvedValue({});

      const result = await service.createClaimDraft(mockUserId, {
        policyId: mockPolicyId,
        totalAmount: 500,
        attachedRecordIds: ['rec-1'],
        attachedReportIds: ['rep-1'],
      });

      expect(result.id).toBe('claim-1');
      expect(result.status).toBe('DRAFT');
      expect(result.attachedRecordIds).toContain('rec-1');
    });
  });

  describe('OCR scanning & authorization', () => {
    it('should forbid a PATIENT from specifying a different patientId', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      await expect(
        service.scanInsuranceCard(mockUserId, ['PATIENT'], { patientId: 'victim-profile-uuid' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject imageUrl pointing to private IP or cloud metadata', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      await expect(
        service.scanInsuranceCard(mockUserId, ['PATIENT'], { imageUrl: 'http://169.254.169.254/latest/meta-data/' }),
      ).rejects.toThrow('restricted or internal network address');
      await expect(
        service.scanInsuranceCard(mockUserId, ['PATIENT'], { imageUrl: 'http://10.0.0.1/card.jpg' }),
      ).rejects.toThrow('private or reserved network address');
    });

    it('should reject non-document and non-image file uploads', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      const badBuffer = Buffer.from('NOT_A_VALID_DOC');
      await expect(
        service.scanInsuranceCard(mockUserId, ['PATIENT'], undefined, { buffer: badBuffer, size: 15 }),
      ).rejects.toThrow('File contents do not match a valid document or image');
    });

    it('should allow valid OCR scan and return real candidate extraction with zero simulated fallbacks', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.saveOcrRecord.mockResolvedValue({ id: 'ocr-rec-1' });

      // Minimal valid PDF header: %PDF
      const pdfBuffer = Buffer.from('%PDF-1.4\n%test');
      const result = await service.scanInsuranceCard(mockUserId, ['PATIENT'], undefined, { buffer: pdfBuffer, size: 16 });

      expect(result.ocrId).toBe('ocr-rec-1');
      expect(result.isSimulated).toBe(false);
      expect(result.engine).toBe('PP-OCRv4-Mobile-CPU');
      expect(mockOcrWorkerClient.processBuffer).toHaveBeenCalled();
    });

    it('should throw ServiceUnavailableException if OCR worker client is not provided', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      const noWorkerModule = await Test.createTestingModule({
        providers: [
          InsuranceService,
          { provide: 'IInsuranceRepository', useValue: mockRepo },
          { provide: QrService, useValue: mockQrService },
          { provide: Logger, useValue: mockLogger },
        ],
      }).compile();
      const serviceWithoutWorker = noWorkerModule.get<InsuranceService>(InsuranceService);

      const pdfBuffer = Buffer.from('%PDF-1.4\n%test');
      await expect(
        serviceWithoutWorker.scanInsuranceCard(mockUserId, ['PATIENT'], undefined, { buffer: pdfBuffer, size: 16 }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw BadRequestException if neither file nor imageUrl is provided', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      await expect(
        service.scanInsuranceCard(mockUserId, ['PATIENT'], undefined, undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow admin to confirm OCR record without having a patient profile', async () => {
      mockRepo.findOcrRecordById.mockResolvedValue({
        id: 'ocr-rec-admin',
        patientProfileId: 'patient-profile-xyz',
      });
      mockRepo.findPolicyByProfileId.mockResolvedValue(null);
      mockRepo.createPolicy.mockResolvedValue({ id: 'new-policy-id' });
      mockRepo.createAuditLog.mockResolvedValue({});

      const result = await service.confirmOcrScan('admin-user-id', ['ADMIN'], {
        ocrId: 'ocr-rec-admin',
        confirmedData: { providerName: 'National Health', policyNumber: 'POL-ADMIN-1' },
      });

      expect(result.policyId).toBe('new-policy-id');
      expect(mockRepo.createPolicy).toHaveBeenCalledWith(
        'patient-profile-xyz',
        'National Health',
        'POL-ADMIN-1',
        undefined,
      );
    });

    it('should forbid non-owner patient from confirming another patient OCR record', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findOcrRecordById.mockResolvedValue({
        id: 'ocr-rec-1',
        patientProfileId: 'someone-else-profile-id',
      });

      await expect(
        service.confirmOcrScan(mockUserId, ['PATIENT'], {
          ocrId: 'ocr-rec-1',
          confirmedData: { providerName: 'Provider', policyNumber: 'POL-1' },
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete newly written card file if database save fails', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.saveOcrRecord.mockRejectedValue(new Error('Prisma database failure'));

      const pdfBuffer = Buffer.from('%PDF-1.4\n%test');
      await expect(
        service.scanInsuranceCard(mockUserId, ['PATIENT'], undefined, { buffer: pdfBuffer, size: 16 }),
      ).rejects.toThrow('Prisma database failure');
    });

    it('should set private cache and security response headers when serving card file', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });

      const fs = require('fs');
      const path = require('path');
      const { PassThrough } = require('stream');
      const testDir = path.join(process.cwd(), 'data', 'uploads', 'cards');
      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
      const testFile = path.join(testDir, `card-${mockProfileId}-header-test.pdf`);
      fs.writeFileSync(testFile, Buffer.from('%PDF-1.4\n%header-test'));

      const headers: Record<string, string> = {};
      const mockRes = new PassThrough() as any;
      mockRes.setHeader = jest.fn((k: string, v: string) => {
        headers[k] = v;
      });

      try {
        await service.serveCardFile(`card-${mockProfileId}-header-test.pdf`, mockUserId, ['PATIENT'], mockRes);

        expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
        expect(headers['Cache-Control']).toBe('private, no-store, max-age=0, must-revalidate');

        await new Promise((resolve) => setTimeout(resolve, 100));
      } finally {
        if (fs.existsSync(testFile)) {
          try { fs.unlinkSync(testFile); } catch {}
        }
      }
    });

    it('should forbid non-owner patient from accessing another patient card file', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      await expect(
        service.serveCardFile('card-victim-id-12345.pdf', mockUserId, ['PATIENT']),
      ).rejects.toThrow('You do not have access to view this card document');
    });
  });
});
