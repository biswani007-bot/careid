import { Test, TestingModule } from '@nestjs/testing';
import { OCRJobService } from '../application/use-cases/ocr.service';
import { OCRController } from '../presentation/controllers/ocr.controller';
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { Reflector } from '@nestjs/core';
import { OcrWorkerClient } from '../infrastructure/clients/ocr-worker.client';

describe('OCR Review History, Authorization & Transaction Atomicity (Phase 3.1 Tasks 1 & 2)', () => {
  let ocrService: OCRJobService;
  let ocrController: OCRController;

  const mockStaffUserId = 'staff-user-uuid-1';
  const mockDoctorUserId = 'doctor-user-uuid-1';
  const mockAdminUserId = 'admin-user-uuid-1';
  const mockFacilityA = 'facility-uuid-alpha';
  const mockFacilityB = 'facility-uuid-beta';

  const mockOcrRepo = {
    findJobById: jest.fn(),
    createVerification: jest.fn(),
    createAuditLog: jest.fn(),
    updateExtractedField: jest.fn(),
    createExtractedField: jest.fn(),
    findReviewHistory: jest.fn(),
    findJobsRequiringReview: jest.fn(),
    findJobs: jest.fn(),
    getDashboardStats: jest.fn(),
    getUserActiveFacilityIds: jest.fn(),
    getJobFacilityIds: jest.fn(),
    submitVerificationTransaction: jest.fn(),
  };

  const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OCRController],
      providers: [
        OCRJobService,
        { provide: 'IOcrRepository', useValue: mockOcrRepo },
        {
          provide: OcrWorkerClient,
          useValue: {
            isReady: jest.fn().mockResolvedValue(true),
            processFile: jest.fn(),
            processBuffer: jest.fn(),
          },
        },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    ocrService = module.get<OCRJobService>(OCRJobService);
    ocrController = module.get<OCRController>(OCRController);
  });

  // ─── Task 1: Scoped Access & Authorization for DOCTOR and STAFF ──────────

  describe('Task 1 — Facility Scoping & Role Authorization', () => {
    it('should allow ADMIN to view review queue platform-wide without facility restrictions', async () => {
      mockOcrRepo.findJobsRequiringReview.mockResolvedValue([
        { id: 'job-1', status: 'REVIEW_REQUIRED', isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
      ]);

      const req = { user: { userId: mockAdminUserId, roles: ['ADMIN'] } };
      const jobs = await ocrController.getJobsRequiringReview(req);

      expect(mockOcrRepo.getUserActiveFacilityIds).not.toHaveBeenCalled();
      expect(mockOcrRepo.findJobsRequiringReview).toHaveBeenCalledWith(undefined);
      expect(jobs).toHaveLength(1);
    });

    it('should scope DOCTOR review queue to their active facilities', async () => {
      mockOcrRepo.getUserActiveFacilityIds.mockResolvedValue([mockFacilityA]);
      mockOcrRepo.findJobsRequiringReview.mockResolvedValue([
        { id: 'job-10', status: 'REVIEW_REQUIRED', isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
      ]);

      const req = { user: { userId: mockDoctorUserId, roles: ['DOCTOR'] } };
      const jobs = await ocrController.getJobsRequiringReview(req);

      expect(mockOcrRepo.getUserActiveFacilityIds).toHaveBeenCalledWith(mockDoctorUserId);
      expect(mockOcrRepo.findJobsRequiringReview).toHaveBeenCalledWith([mockFacilityA]);
      expect(jobs).toHaveLength(1);
    });

    it('should deny DOCTOR/STAFF access to review queue if user has no active facility affiliation', async () => {
      mockOcrRepo.getUserActiveFacilityIds.mockResolvedValue([]);

      const req = { user: { userId: mockStaffUserId, roles: ['STAFF'] } };
      await expect(ocrController.getJobsRequiringReview(req)).rejects.toThrow(ForbiddenException);
    });

    it('should permit STAFF to submit review when job belongs to their active facility', async () => {
      mockOcrRepo.getUserActiveFacilityIds.mockResolvedValue([mockFacilityA]);
      mockOcrRepo.getJobFacilityIds.mockResolvedValue([mockFacilityA]);
      mockOcrRepo.submitVerificationTransaction.mockResolvedValue({
        id: 'ver-alpha-1',
        ocrJobId: 'job-alpha-1',
        reviewedBy: mockStaffUserId,
        reviewStatus: 'APPROVED',
        completedAt: new Date(),
        createdAt: new Date(),
      });

      const req = { user: { userId: mockStaffUserId, roles: ['STAFF'] } };
      const result = await ocrController.submitVerification(req, 'job-alpha-1', {
        reviewStatus: 'APPROVED',
        reviewNotes: 'Verified at Facility Alpha',
      });

      expect(mockOcrRepo.getUserActiveFacilityIds).toHaveBeenCalledWith(mockStaffUserId);
      expect(mockOcrRepo.getJobFacilityIds).toHaveBeenCalledWith('job-alpha-1');
      expect(mockOcrRepo.submitVerificationTransaction).toHaveBeenCalledWith(
        'job-alpha-1',
        mockStaffUserId,
        expect.objectContaining({ reviewStatus: 'APPROVED' }),
      );
      expect(result.id).toBe('ver-alpha-1');
    });

    it('should deny DOCTOR/STAFF from reviewing OCR jobs belonging to another facility (cross-facility denial)', async () => {
      // Caller affiliated with Facility A, but job belongs exclusively to Facility B
      mockOcrRepo.getUserActiveFacilityIds.mockResolvedValue([mockFacilityA]);
      mockOcrRepo.getJobFacilityIds.mockResolvedValue([mockFacilityB]);
      mockOcrRepo.findJobById.mockResolvedValue({ id: 'job-beta-1', submittedBy: 'other-user' });

      const req = { user: { userId: mockDoctorUserId, roles: ['DOCTOR'] } };
      await expect(
        ocrController.submitVerification(req, 'job-beta-1', {
          reviewStatus: 'APPROVED',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockOcrRepo.submitVerificationTransaction).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to review jobs regardless of facility affiliation', async () => {
      mockOcrRepo.submitVerificationTransaction.mockResolvedValue({
        id: 'ver-admin-1',
        ocrJobId: 'job-admin-1',
        reviewedBy: mockAdminUserId,
        reviewStatus: 'APPROVED',
        completedAt: new Date(),
        createdAt: new Date(),
      });

      const req = { user: { userId: mockAdminUserId, roles: ['SUPER_ADMIN'] } };
      const result = await ocrController.submitVerification(req, 'job-admin-1', {
        reviewStatus: 'APPROVED',
      });

      expect(mockOcrRepo.getUserActiveFacilityIds).not.toHaveBeenCalled();
      expect(result.id).toBe('ver-admin-1');
    });

    it('should prevent DOCTOR/STAFF from querying review history of another reviewer from a foreign facility', async () => {
      mockOcrRepo.getUserActiveFacilityIds
        .mockResolvedValueOnce([mockFacilityA]) // caller's facility
        .mockResolvedValueOnce([mockFacilityB]); // target reviewer's facility

      const req = { user: { userId: mockDoctorUserId, roles: ['DOCTOR'] } };
      await expect(
        ocrController.getReviewHistory(req, { reviewerId: 'foreign-staff-id' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── Task 2: Transaction Atomicity & Concurrency ─────────────────────────

  describe('Task 2 — Atomic Verification, Validation & Concurrency Guards', () => {
    it('should execute atomic transaction on valid submission', async () => {
      mockOcrRepo.submitVerificationTransaction.mockResolvedValue({
        id: 'ver-tx-100',
        ocrJobId: 'job-100',
        reviewedBy: mockAdminUserId,
        reviewStatus: 'APPROVED',
        completedAt: new Date(),
        createdAt: new Date(),
      });

      const req = { user: { userId: mockAdminUserId, roles: ['ADMIN'] } };
      const res = await ocrController.submitVerification(req, 'job-100', {
        reviewStatus: 'APPROVED',
        reviewNotes: 'All clear',
      });

      expect(mockOcrRepo.submitVerificationTransaction).toHaveBeenCalledWith(
        'job-100',
        mockAdminUserId,
        expect.objectContaining({
          reviewStatus: 'APPROVED',
          reviewNotes: 'All clear',
        }),
      );
      expect(res.id).toBe('ver-tx-100');
    });

    it('should reject review when reviewStatus is CORRECTED but no corrections are provided', async () => {
      const req = { user: { userId: mockAdminUserId, roles: ['ADMIN'] } };
      await expect(
        ocrController.submitVerification(req, 'job-400', {
          reviewStatus: 'CORRECTED',
          corrections: [],
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockOcrRepo.submitVerificationTransaction).not.toHaveBeenCalled();
    });

    it('should reject invalid reviewStatus before starting transaction', async () => {
      const req = { user: { userId: mockAdminUserId, roles: ['ADMIN'] } };
      await expect(
        ocrController.submitVerification(req, 'job-invalid', {
          reviewStatus: 'UNKNOWN_STATUS',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockOcrRepo.submitVerificationTransaction).not.toHaveBeenCalled();
    });

    it('should propagate rollback exception when transaction fails midway', async () => {
      mockOcrRepo.submitVerificationTransaction.mockRejectedValue(
        new Error('Transaction rolled back: database connection dropped during correction update'),
      );

      const req = { user: { userId: mockAdminUserId, roles: ['ADMIN'] } };
      await expect(
        ocrController.submitVerification(req, 'job-fail', {
          reviewStatus: 'APPROVED',
        }),
      ).rejects.toThrow('Transaction rolled back');
    });

    it('should propagate ConflictException when concurrent review update fails', async () => {
      mockOcrRepo.submitVerificationTransaction.mockRejectedValue(
        new ConflictException('OCR job was reviewed concurrently by another user. Review aborted.'),
      );

      const req = { user: { userId: mockAdminUserId, roles: ['ADMIN'] } };
      await expect(
        ocrController.submitVerification(req, 'job-race', {
          reviewStatus: 'APPROVED',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should propagate ConflictException for repeated review on already completed job', async () => {
      mockOcrRepo.submitVerificationTransaction.mockRejectedValue(
        new ConflictException("OCR job has already been completed with status 'COMPLETED'. Concurrent review aborted."),
      );

      const req = { user: { userId: mockAdminUserId, roles: ['ADMIN'] } };
      await expect(
        ocrController.submitVerification(req, 'job-already-done', {
          reviewStatus: 'APPROVED',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should propagate BadRequestException for duplicate corrections on same field', async () => {
      mockOcrRepo.submitVerificationTransaction.mockRejectedValue(
        new BadRequestException("Duplicate correction supplied for field 'hemoglobin'. Each field may only be corrected once per review."),
      );

      const req = { user: { userId: mockAdminUserId, roles: ['ADMIN'] } };
      await expect(
        ocrController.submitVerification(req, 'job-dup', {
          reviewStatus: 'CORRECTED',
          corrections: [
            { fieldName: 'hemoglobin', correctedValue: '14.0' },
            { fieldName: 'hemoglobin', correctedValue: '14.2' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Review History Pagination & Mapping ─────────────────────────────────

  describe('Review History Listing & Filters', () => {
    it('should return paginated review history with job summary and extracted fields', async () => {
      const mockHistoryItems = [
        {
          id: 'ver-1',
          ocrJobId: 'job-1',
          reviewedBy: mockStaffUserId,
          reviewStatus: 'CORRECTED',
          reviewNotes: 'Corrected patient name',
          completedAt: new Date('2026-08-01T10:00:00Z'),
          createdAt: new Date('2026-08-01T10:00:00Z'),
          ocrJob: {
            id: 'job-1',
            medicalAttachmentId: 'att-1',
            documentType: 'LAB_REPORT',
            status: 'COMPLETED',
            overallConfidence: 0.88,
            extractedFields: [
              {
                id: 'field-1',
                ocrJobId: 'job-1',
                fieldName: 'patientName',
                fieldValue: 'Johnathan Doe',
                confidence: 1.0,
                validationStatus: 'CORRECTED',
                requiresReview: false,
                createdAt: new Date('2026-08-01T10:00:00Z'),
              },
            ],
          },
        },
      ];

      mockOcrRepo.findReviewHistory.mockResolvedValue({
        total: 15,
        items: mockHistoryItems,
      });

      const result = await ocrController.getReviewHistory(
        { user: { userId: mockAdminUserId, roles: ['ADMIN'] } },
        { page: 1, limit: 10, status: 'CORRECTED' },
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].reviewStatus).toBe('CORRECTED');
      expect(result.data[0].job.status).toBe('COMPLETED');
      expect(result.data[0].fields[0].fieldValue).toBe('Johnathan Doe');
      expect(result.meta.totalItems).toBe(15);
      expect(result.meta.totalPages).toBe(2);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPreviousPage).toBe(false);
    });
  });

  // ─── Reflector RBAC Check ────────────────────────────────────────────────

  describe('Reflector RBAC Verification', () => {
    it('should declare @Roles("ADMIN", "SUPER_ADMIN", "DOCTOR", "STAFF") on all review endpoints', () => {
      const reflector = new Reflector();
      const reviewRoles = reflector.get<string[]>('roles', ocrController.getJobsRequiringReview);
      const historyRoles = reflector.get<string[]>('roles', ocrController.getReviewHistory);
      const submitRoles = reflector.get<string[]>('roles', ocrController.submitVerification);

      const expectedRoles = ['ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'STAFF'];
      expect(reviewRoles).toEqual(expectedRoles);
      expect(historyRoles).toEqual(expectedRoles);
      expect(submitRoles).toEqual(expectedRoles);
    });
  });
});
