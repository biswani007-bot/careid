import { Test, TestingModule } from '@nestjs/testing';
import { OCRJobService } from '../application/use-cases/ocr.service';
import {
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { OcrWorkerClient } from '../infrastructure/clients/ocr-worker.client';

describe('OCR Authorization & Fallbacks Elimination (Phase 1 & Phase 2)', () => {
  let service: OCRJobService;
  let mockRepo: any;
  let mockOcrWorkerClient: any;
  let mockLogger: any;

  const mockJobA = {
    id: 'job-aaa-111',
    medicalAttachmentId: 'att-aaa-111',
    documentType: 'LAB_REPORT',
    status: 'COMPLETED',
    overallConfidence: 0.95,
    confidenceLevel: 'HIGH',
    submittedBy: 'patient-a-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockJobB = {
    id: 'job-bbb-222',
    medicalAttachmentId: 'att-bbb-222',
    documentType: 'PRESCRIPTION',
    status: 'COMPLETED',
    overallConfidence: 0.92,
    confidenceLevel: 'HIGH',
    submittedBy: 'patient-b-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockRepo = {
      createJob: jest.fn(),
      findJobs: jest.fn(),
      findJobsScoped: jest.fn(),
      findJobById: jest.fn(),
      findAttachmentById: jest.fn(),
      verifyJobAccess: jest.fn(),
      findPatientProfileByUserId: jest.fn(),
      findDoctorProfileByUserId: jest.fn(),
      updateJobStatus: jest.fn(),
      softDeleteJob: jest.fn(),
      createPage: jest.fn(),
      createExtractedField: jest.fn(),
      findExtractedFieldsByJobId: jest.fn().mockResolvedValue([
        { id: 'f-1', ocrJobId: 'job-aaa-111', fieldName: 'hemoglobin', fieldValue: '14.2', confidence: 0.95, validationStatus: 'VALIDATED', requiresReview: false, createdAt: new Date() },
      ]),
      findPagesByJobId: jest.fn().mockResolvedValue([
        { pageNumber: 1, rawText: 'Hemoglobin: 14.2 g/dL' },
      ]),
      createTemplate: jest.fn(),
      findTemplates: jest.fn(),
      findTemplateByCode: jest.fn(),
      findTemplateById: jest.fn(),
      updateTemplate: jest.fn(),
      softDeleteTemplate: jest.fn(),
      getUserActiveFacilityIds: jest.fn(),
      getJobFacilityIds: jest.fn(),
      findJobsRequiringReview: jest.fn(),
      submitVerificationTransaction: jest.fn(),
      createVerification: jest.fn(),
      createAuditLog: jest.fn(),
      findAuditLogs: jest.fn(),
      getDashboardStats: jest.fn(),
    };

    mockOcrWorkerClient = {
      isReady: jest.fn().mockResolvedValue(true),
      processFile: jest.fn().mockResolvedValue({
        success: true,
        documentType: 'LAB_REPORT',
        sourceFile: '01_lab_report.png',
        pageCount: 1,
        overallConfidence: 0.95,
        combinedText: 'Lab Report Text',
        pages: [],
        durationMs: 350,
        engine: 'PP-OCRv4-Mobile-CPU',
      }),
      processBuffer: jest.fn().mockResolvedValue({
        success: true,
        documentType: 'LAB_REPORT',
        sourceFile: '01_lab_report.png',
        pageCount: 1,
        overallConfidence: 0.95,
        combinedText: 'Lab Report Text',
        pages: [],
        durationMs: 350,
        engine: 'PP-OCRv4-Mobile-CPU',
      }),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

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

  describe('Phase 1: Patient Ownership & IDOR Protection', () => {
    it('should allow Patient A to view their own OCR job (submitted by them)', async () => {
      mockRepo.findJobById.mockResolvedValue(mockJobA);

      const caller = { userId: 'patient-a-user-id', roles: ['PATIENT'] };
      const job = await service.getJobById('job-aaa-111', caller);

      expect(job.id).toBe('job-aaa-111');
      expect(mockRepo.findJobById).toHaveBeenCalledWith('job-aaa-111');
    });

    it('should allow Patient A to view their own OCR job via attachment ownership', async () => {
      mockRepo.findJobById.mockResolvedValue({
        ...mockJobA,
        submittedBy: 'hospital-kiosk-user-id',
      });
      mockRepo.verifyJobAccess.mockResolvedValue(true);

      const caller = { userId: 'patient-a-user-id', roles: ['PATIENT'] };
      const job = await service.getJobById('job-aaa-111', caller);

      expect(job.id).toBe('job-aaa-111');
      expect(mockRepo.verifyJobAccess).toHaveBeenCalledWith('job-aaa-111', 'patient-a-user-id', ['PATIENT']);
    });

    it('should forbid Patient A from accessing Patient B OCR job (getJobById)', async () => {
      mockRepo.findJobById.mockResolvedValue(mockJobB);
      mockRepo.verifyJobAccess.mockResolvedValue(false);

      const caller = { userId: 'patient-a-user-id', roles: ['PATIENT'] };
      await expect(
        service.getJobById('job-bbb-222', caller),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forbid Patient A from accessing Patient B raw text (getJobText)', async () => {
      mockRepo.findJobById.mockResolvedValue(mockJobB);
      mockRepo.verifyJobAccess.mockResolvedValue(false);

      const caller = { userId: 'patient-a-user-id', roles: ['PATIENT'] };
      await expect(
        service.getJobText('job-bbb-222', caller),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forbid Patient A from accessing Patient B extracted fields (getJobFields)', async () => {
      mockRepo.findJobById.mockResolvedValue(mockJobB);
      mockRepo.verifyJobAccess.mockResolvedValue(false);

      const caller = { userId: 'patient-a-user-id', roles: ['PATIENT'] };
      await expect(
        service.getJobFields('job-bbb-222', caller),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forbid Patient A from accessing Patient B JSON output (getJobJson)', async () => {
      mockRepo.findJobById.mockResolvedValue(mockJobB);
      mockRepo.verifyJobAccess.mockResolvedValue(false);

      const caller = { userId: 'patient-a-user-id', roles: ['PATIENT'] };
      await expect(
        service.getJobJson('job-bbb-222', caller),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Phase 1: Role-Based Clinical & Administrative Access Control', () => {
    it('should allow ADMIN / SUPER_ADMIN platform-wide access to any job', async () => {
      mockRepo.findJobById.mockResolvedValue(mockJobB);

      const adminCaller = { userId: 'admin-1', roles: ['ADMIN'] };
      const job = await service.getJobById('job-bbb-222', adminCaller);

      expect(job.id).toBe('job-bbb-222');
      expect(mockRepo.verifyJobAccess).not.toHaveBeenCalled();
    });

    it('should allow authorized Doctor with facility relationship to access patient OCR job', async () => {
      mockRepo.findJobById.mockResolvedValue(mockJobA);
      mockRepo.verifyJobAccess.mockResolvedValue(true);

      const doctorCaller = { userId: 'dr-smith', roles: ['DOCTOR'] };
      const job = await service.getJobById('job-aaa-111', doctorCaller);

      expect(job.id).toBe('job-aaa-111');
      expect(mockRepo.verifyJobAccess).toHaveBeenCalledWith('job-aaa-111', 'dr-smith', ['DOCTOR']);
    });

    it('should forbid unauthorized Doctor with no facility/patient relationship from accessing job', async () => {
      mockRepo.findJobById.mockResolvedValue(mockJobA);
      mockRepo.verifyJobAccess.mockResolvedValue(false);

      const doctorCaller = { userId: 'dr-stranger', roles: ['DOCTOR'] };
      await expect(
        service.getJobById('job-aaa-111', doctorCaller),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should scope job listings for callers with identity using findJobsScoped', async () => {
      mockRepo.findJobsScoped.mockResolvedValue([mockJobA]);

      const patientCaller = { userId: 'patient-a-user-id', roles: ['PATIENT'] };
      const jobs = await service.getJobs('COMPLETED', 'LAB_REPORT', 1, 20, patientCaller);

      expect(jobs.length).toBe(1);
      expect(mockRepo.findJobsScoped).toHaveBeenCalledWith('patient-a-user-id', ['PATIENT'], 'COMPLETED', 'LAB_REPORT', 1, 20);
      expect(mockRepo.findJobs).not.toHaveBeenCalled();
    });

    it('should return unscoped job listing for unauthenticated or admin callers', async () => {
      mockRepo.findJobs.mockResolvedValue([mockJobA, mockJobB]);

      const jobs = await service.getJobs('COMPLETED', undefined, 1, 50);

      expect(jobs.length).toBe(2);
      expect(mockRepo.findJobs).toHaveBeenCalledWith('COMPLETED', undefined, 1, 50);
      expect(mockRepo.findJobsScoped).not.toHaveBeenCalled();
    });
  });

  describe('Phase 2: Removal of Synthetic & Demo Fallbacks', () => {
    it('should throw NotFoundException and mark job FAILED when source attachment file does not exist (zero synthetic sample doc fallback)', async () => {
      const mockNewJob = {
        id: 'job-missing-file',
        medicalAttachmentId: 'att-nonexistent',
        documentType: 'LAB_REPORT',
        status: 'QUEUED',
        submittedBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createJob.mockResolvedValue(mockNewJob);
      mockRepo.findJobById.mockResolvedValue(mockNewJob);
      mockRepo.findAttachmentById.mockResolvedValue(null);
      mockRepo.updateJobStatus.mockResolvedValue(mockNewJob);

      await expect(
        service.submitJob('user-1', {
          medicalAttachmentId: 'att-nonexistent',
          documentType: 'LAB_REPORT',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockRepo.updateJobStatus).toHaveBeenCalledWith(
        'job-missing-file',
        'FAILED',
        0.0,
        'LOW',
        expect.any(Number),
        expect.stringContaining('could not be resolved from storage or disk'),
      );
    });

    it('should throw ServiceUnavailableException and mark job FAILED when OCR worker client is not provided (zero synthetic John Doe fallback)', async () => {
      const serviceNoWorker = new OCRJobService(mockRepo, mockLogger, undefined);

      const mockNewJob = {
        id: 'job-no-worker',
        medicalAttachmentId: 'att-with-file',
        documentType: 'LAB_REPORT',
        status: 'QUEUED',
        submittedBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createJob.mockResolvedValue(mockNewJob);
      mockRepo.findJobById.mockResolvedValue(mockNewJob);
      mockRepo.findAttachmentById.mockResolvedValue({
        id: 'att-with-file',
        storageKey: 'ocr-poc/sample_docs/01_lab_report.png',
        fileName: '01_lab_report.png',
      });
      mockRepo.updateJobStatus.mockResolvedValue(mockNewJob);

      await expect(
        serviceNoWorker.submitJob('user-1', {
          medicalAttachmentId: 'att-with-file',
          documentType: 'LAB_REPORT',
        }),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(mockRepo.updateJobStatus).toHaveBeenCalledWith(
        'job-no-worker',
        'FAILED',
        0.0,
        'LOW',
        expect.any(Number),
        expect.stringContaining('OCR worker client service is unavailable'),
      );
    });

    it('should throw ServiceUnavailableException and mark job FAILED when OCR worker reports success: false', async () => {
      const mockNewJob = {
        id: 'job-worker-err',
        medicalAttachmentId: 'att-with-file',
        documentType: 'LAB_REPORT',
        status: 'QUEUED',
        submittedBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createJob.mockResolvedValue(mockNewJob);
      mockRepo.findJobById.mockResolvedValue(mockNewJob);
      mockRepo.findAttachmentById.mockResolvedValue({
        id: 'att-with-file',
        storageKey: 'ocr-poc/sample_docs/01_lab_report.png',
        fileName: '01_lab_report.png',
      });
      mockRepo.updateJobStatus.mockResolvedValue(mockNewJob);
      mockOcrWorkerClient.processFile.mockResolvedValue({
        success: false,
        error: 'Engine segmentation fault',
      });

      await expect(
        service.submitJob('user-1', {
          medicalAttachmentId: 'att-with-file',
          documentType: 'LAB_REPORT',
        }),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(mockRepo.updateJobStatus).toHaveBeenCalledWith(
        'job-worker-err',
        'FAILED',
        0.0,
        'LOW',
        expect.any(Number),
        'Engine segmentation fault',
      );
    });
  });
});
