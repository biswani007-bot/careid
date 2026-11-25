import { Test, TestingModule } from '@nestjs/testing';
import { OCRJobService } from '../application/use-cases/ocr.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { OcrWorkerClient } from '../infrastructure/clients/ocr-worker.client';

const mockUserId = 'user-uuid-1';

const mockRepo = {
  createJob: jest.fn(),
  findJobs: jest.fn(),
  findJobById: jest.fn(),
  findAttachmentById: jest.fn(),
  updateJobStatus: jest.fn(),
  softDeleteJob: jest.fn(),
  createPage: jest.fn(),
  createExtractedField: jest.fn(),
  findExtractedFieldsByJobId: jest.fn(),
  findPagesByJobId: jest.fn(),
  createTemplate: jest.fn(),
  findTemplates: jest.fn(),
  findTemplateByCode: jest.fn(),
  findTemplateById: jest.fn(),
  updateTemplate: jest.fn(),
  softDeleteTemplate: jest.fn(),
  findJobsRequiringReview: jest.fn(),
  getUserActiveFacilityIds: jest.fn(),
  getJobFacilityIds: jest.fn(),
  submitVerificationTransaction: jest.fn(),
  createVerification: jest.fn(),
  createAuditLog: jest.fn(),
  findAuditLogs: jest.fn(),
  getDashboardStats: jest.fn(),
};

const mockOcrWorkerClient = {
  isReady: jest.fn().mockResolvedValue(true),
  processFile: jest.fn().mockResolvedValue({
    success: true,
    documentType: 'LAB_REPORT',
    sourceFile: 'sample.png',
    pageCount: 1,
    overallConfidence: 0.94,
    combinedText: 'HEALTH VAULT 360 - CLINICAL LABORATORY REPORT\nPatient Name: John Doe\nMRN: MRN-987654\nTest Name: Complete Blood Count (CBC)\nHemoglobin: 14.5 g/dL (Normal)\nWBC: 6,800 /uL\nPlatelet Count: 250,000 /uL\nDate of Report: 2026-07-31\nStatus: Final Approved',
    pages: [
      {
        pageNumber: 1,
        rawText: 'HEALTH VAULT 360 - CLINICAL LABORATORY REPORT\nPatient Name: John Doe\nMRN: MRN-987654\nTest Name: Complete Blood Count (CBC)\nHemoglobin: 14.5 g/dL (Normal)\nWBC: 6,800 /uL\nPlatelet Count: 250,000 /uL\nDate of Report: 2026-07-31\nStatus: Final Approved',
        lines: [
          { text: 'Patient Name: John Doe', confidence: 0.96, box: [[0, 0], [1, 1]] },
          { text: 'MRN: MRN-987654', confidence: 0.95, box: [[0, 0], [1, 1]] },
          { text: 'Test Name: Complete Blood Count (CBC)', confidence: 0.94, box: [[0, 0], [1, 1]] },
          { text: 'Hemoglobin: 14.5 g/dL', confidence: 0.92, box: [[0, 0], [1, 1]] },
          { text: 'WBC: 6,800 /uL', confidence: 0.90, box: [[0, 0], [1, 1]] },
          { text: 'Date of Report: 2026-07-31', confidence: 0.93, box: [[0, 0], [1, 1]] },
        ],
      },
    ],
    durationMs: 450,
    engine: 'PP-OCRv4-Mobile-CPU',
    ocrVersion: 'PP-OCRv4',
  }),
  processBuffer: jest.fn(),
};

const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

describe('OCRJobService (Phase 22)', () => {
  let service: OCRJobService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OCRJobService,
        { provide: 'IOcrRepository', useValue: mockRepo },
        { provide: OcrWorkerClient, useValue: mockOcrWorkerClient },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<OCRJobService>(OCRJobService);
  });

  describe('OCR Job Submission & CPU Pipeline', () => {
    it('should submit job, run local OCR pipeline, and calculate overall confidence', async () => {
      const mockInitialJob = {
        id: 'job-1',
        medicalAttachmentId: 'attachment-1',
        documentType: 'LAB_REPORT',
        status: 'QUEUED',
        submittedBy: mockUserId,
        confidenceLevel: 'MEDIUM',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createJob.mockResolvedValue(mockInitialJob);
      mockRepo.findAttachmentById.mockResolvedValue({
        id: 'attachment-1',
        storageKey: 'ocr-poc/sample_docs/01_lab_report.png',
        fileName: '01_lab_report.png',
      });
      mockRepo.updateJobStatus.mockResolvedValue(mockInitialJob);
      mockRepo.createPage.mockResolvedValue({});
      mockRepo.createExtractedField.mockResolvedValue({});
      mockRepo.createAuditLog.mockResolvedValue({});
      mockRepo.findJobById.mockResolvedValue({
        ...mockInitialJob,
        status: 'COMPLETED',
        overallConfidence: 0.93,
        confidenceLevel: 'HIGH',
      });

      const res = await service.submitJob(mockUserId, {
        medicalAttachmentId: 'attachment-1',
        documentType: 'LAB_REPORT',
      });

      expect(res.id).toBe('job-1');
      expect(mockRepo.createPage).toHaveBeenCalled();
      expect(mockRepo.createExtractedField).toHaveBeenCalled();
      expect(mockRepo.createAuditLog).toHaveBeenCalled();
    });
  });

  describe('OCR Results Extraction', () => {
    it('should return raw OCR text combined from pages', async () => {
      mockRepo.findJobById.mockResolvedValue({ id: 'job-1' });
      mockRepo.findPagesByJobId.mockResolvedValue([
        { pageNumber: 1, rawText: 'Header info' },
        { pageNumber: 2, rawText: 'Lab values' },
      ]);

      const res = await service.getJobText('job-1');
      expect(res.text).toContain('Header info');
      expect(res.text).toContain('Lab values');
    });

    it('should return structured JSON object of extracted fields', async () => {
      mockRepo.findJobById.mockResolvedValue({ id: 'job-1', medicalAttachmentId: 'att-1', documentType: 'LAB_REPORT', overallConfidence: 0.94, confidenceLevel: 'HIGH', status: 'COMPLETED' });
      mockRepo.findExtractedFieldsByJobId.mockResolvedValue([
        { fieldName: 'patient_name', fieldValue: 'John Doe', confidence: 0.96, validationStatus: 'VALIDATED' },
      ]);

      const res = await service.getJobJson('job-1');
      expect(res.fields.patient_name.value).toBe('John Doe');
      expect(res.fields.patient_name.confidence).toBe(0.96);
    });
  });

  describe('Human Verification Workflow', () => {
    it('should submit human verification for review required job', async () => {
      mockRepo.findJobById.mockResolvedValue({ id: 'job-1', status: 'REVIEW_REQUIRED' });
      mockRepo.submitVerificationTransaction.mockResolvedValue({
        id: 'ver-1',
        ocrJobId: 'job-1',
        reviewedBy: mockUserId,
        reviewStatus: 'APPROVED',
        completedAt: new Date(),
        createdAt: new Date(),
      });

      const res = await service.submitVerification('job-1', mockUserId, {
        reviewStatus: 'APPROVED',
        reviewNotes: 'Verified manually',
      });

      expect(res.reviewStatus).toBe('APPROVED');
      expect(mockRepo.submitVerificationTransaction).toHaveBeenCalledWith(
        'job-1',
        mockUserId,
        expect.objectContaining({
          reviewStatus: 'APPROVED',
          reviewNotes: 'Verified manually',
        }),
      );
    });
  });

  describe('OCR Dashboard Stats', () => {
    it('should return dashboard stats', async () => {
      mockRepo.getDashboardStats.mockResolvedValue({
        totalJobs: 150,
        completedJobs: 130,
        reviewRequiredJobs: 15,
        failedJobs: 5,
        averageConfidence: 0.92,
        activeTemplatesCount: 10,
      });

      const res = await service.getDashboardStats();
      expect(res.totalJobs).toBe(150);
      expect(res.averageConfidence).toBe(0.92);
    });
  });
});
