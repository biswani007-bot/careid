import { PrismaOcrRepository } from '@modules/ocr/infrastructure/database/ocr.repository';
import { AdminRepository } from '@modules/admin/infrastructure/database/admin.repository';
import { DoctorRepository } from '@modules/doctor/infrastructure/database/doctor.repository';
import { FacilityRepository } from '@modules/facility/infrastructure/database/facility.repository';
import { StaffRepository } from '@modules/staff/infrastructure/database/staff.repository';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('Phase 3.1 Corrective Remediation Verification Suite', () => {
  // ─── Task 3: Timeline Accurate Counts & Secondary Tie-Breaker ─────────────

  describe('Task 3 — Timeline Pagination & Deterministic Secondary Sort', () => {
    let mockDb: any;
    let adminRepo: AdminRepository;

    beforeEach(() => {
      mockDb = {
        medicalRecord: {
          count: jest.fn(),
          findMany: jest.fn(),
        },
        medicalAttachment: {
          count: jest.fn(),
          findMany: jest.fn(),
        },
      };
      adminRepo = new AdminRepository(mockDb);
    });

    it('should compute exact total count from both records and attachments in parallel', async () => {
      mockDb.medicalRecord.count.mockResolvedValue(42);
      mockDb.medicalAttachment.count.mockResolvedValue(18);
      mockDb.medicalRecord.findMany.mockResolvedValue([]);
      mockDb.medicalAttachment.findMany.mockResolvedValue([]);

      const result = await adminRepo.getPatientTimeline('patient-uuid-1', { page: 1, limit: 20 });

      expect(mockDb.medicalRecord.count).toHaveBeenCalledWith({
        where: { patientProfileId: 'patient-uuid-1', isDeleted: false },
      });
      expect(mockDb.medicalAttachment.count).toHaveBeenCalledWith({
        where: { patientProfileId: 'patient-uuid-1', isDeleted: false },
      });
      expect(result.total).toBe(60); // 42 + 18
      expect(result.items).toEqual([]);
    });

    it('should sort identical timestamps deterministically using secondary ID tie-breaker', async () => {
      mockDb.medicalRecord.count.mockResolvedValue(1);
      mockDb.medicalAttachment.count.mockResolvedValue(2);

      const sameDate = new Date('2026-06-01T12:00:00.000Z');
      mockDb.medicalRecord.findMany.mockResolvedValue([
        {
          id: 'rec-bbb',
          title: 'Consultation',
          createdAt: sameDate,
          status: 'FINAL',
          encounters: [],
          diagnoses: [],
          attachments: [],
        },
      ]);
      mockDb.medicalAttachment.findMany.mockResolvedValue([
        {
          id: 'att-aaa',
          fileName: 'scan_a.pdf',
          createdAt: sameDate,
          originalName: 'scan_a.pdf',
          fileSize: 1000,
          mimeType: 'application/pdf',
          category: 'LAB',
          virusScanStatus: 'CLEAN',
        },
        {
          id: 'att-ccc',
          fileName: 'scan_c.pdf',
          createdAt: sameDate,
          originalName: 'scan_c.pdf',
          fileSize: 2000,
          mimeType: 'application/pdf',
          category: 'LAB',
          virusScanStatus: 'CLEAN',
        },
      ]);

      const result = await adminRepo.getPatientTimeline('patient-uuid-1', { page: 1, limit: 10 });

      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(3);
      // When timestamps are identical, items are sorted descending by id: 'rec-bbb', 'att-ccc', 'att-aaa'
      // Note: 'rec-bbb' > 'att-ccc' > 'att-aaa' in localeCompare
      expect(result.items[0].id).toBe('rec-bbb');
      expect(result.items[1].id).toBe('att-ccc');
      expect(result.items[2].id).toBe('att-aaa');
    });
  });

  // ─── Task 4: Legacy Directory Pagination ──────────────────────────────────

  describe('Task 4 — Legacy Directory Pagination & Bounded Limits', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {
        doctorProfile: { findMany: jest.fn() },
        facility: { findMany: jest.fn() },
        staffMember: { findMany: jest.fn() },
      };
    });

    it('should paginate DoctorRepository.findDoctors with default limit=50 and skip calculation', async () => {
      const doctorRepo = new DoctorRepository(mockDb);
      mockDb.doctorProfile.findMany.mockResolvedValue([]);

      await doctorRepo.findDoctors(false, 3, 25);

      expect(mockDb.doctorProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
          skip: 50, // (3 - 1) * 25
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      );
    });

    it('should cap DoctorRepository.findDoctors limit to safe maximum 100', async () => {
      const doctorRepo = new DoctorRepository(mockDb);
      mockDb.doctorProfile.findMany.mockResolvedValue([]);

      await doctorRepo.findDoctors(false, 1, 500);

      expect(mockDb.doctorProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Capped at 100
          skip: 0,
        }),
      );
    });

    it('should paginate FacilityRepository.findAllFacilities with skip and bounded limit', async () => {
      const facilityRepo = new FacilityRepository(mockDb);
      mockDb.facility.findMany.mockResolvedValue([]);

      await facilityRepo.findAllFacilities(false, 2, 30);

      expect(mockDb.facility.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 30,
          skip: 30, // (2 - 1) * 30
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      );
    });

    it('should paginate StaffRepository.findStaffMembers with skip and bounded limit', async () => {
      const staffRepo = new StaffRepository(mockDb);
      mockDb.staffMember.findMany.mockResolvedValue([]);

      await staffRepo.findStaffMembers(false, 4, 20);

      expect(mockDb.staffMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 60, // (4 - 1) * 20
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      );
    });
  });

  // ─── Task 2: Transaction Atomicity & Concurrency Guards ───────────────────

  describe('Task 2 — Prisma Interactive Transaction Atomicity & Concurrency', () => {
    let mockTx: any;
    let mockDb: any;
    let ocrRepo: PrismaOcrRepository;

    beforeEach(() => {
      mockTx = {
        oCRJob: {
          findFirst: jest.fn(),
          updateMany: jest.fn(),
        },
        extractedField: {
          update: jest.fn(),
          create: jest.fn(),
        },
        oCRVerification: {
          create: jest.fn(),
        },
        oCRAuditLog: {
          create: jest.fn(),
        },
      };

      mockDb = {
        $transaction: jest.fn((callback) => callback(mockTx)),
        oCRJob: { findFirst: jest.fn() },
      };

      ocrRepo = new PrismaOcrRepository(mockDb);
    });

    it('should execute all review operations using transaction client', async () => {
      mockTx.oCRJob.findFirst.mockResolvedValue({
        id: 'job-100',
        status: 'REVIEW_REQUIRED',
        isDeleted: false,
        extractedFields: [
          { id: 'f-1', fieldName: 'testName', fieldValue: 'Old Val', confidence: 0.5 },
        ],
      });
      mockTx.oCRJob.updateMany.mockResolvedValue({ count: 1 });
      mockTx.extractedField.update.mockResolvedValue({});
      mockTx.oCRAuditLog.create.mockResolvedValue({});
      mockTx.oCRVerification.create.mockResolvedValue({
        id: 'ver-100',
        ocrJobId: 'job-100',
        reviewedBy: 'user-1',
        reviewStatus: 'CORRECTED',
        completedAt: new Date(),
        createdAt: new Date(),
      });

      const res = await ocrRepo.submitVerificationTransaction('job-100', 'user-1', {
        reviewStatus: 'CORRECTED',
        corrections: [
          { fieldId: 'f-1', fieldName: 'testName', correctedValue: 'New Val', confidence: 1.0 },
        ],
      });

      expect(mockDb.$transaction).toHaveBeenCalled();
      expect(mockTx.oCRJob.updateMany).toHaveBeenCalledWith({
        where: { id: 'job-100', status: 'REVIEW_REQUIRED', isDeleted: false },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      });
      expect(mockTx.extractedField.update).toHaveBeenCalledWith({
        where: { id: 'f-1' },
        data: expect.objectContaining({ fieldValue: 'New Val', validationStatus: 'CORRECTED' }),
      });
      expect(mockTx.oCRVerification.create).toHaveBeenCalled();
      expect(res.id).toBe('ver-100');
    });

    it('should throw ConflictException and abort if concurrent reviewer completes job first (updateMany count=0)', async () => {
      mockTx.oCRJob.findFirst.mockResolvedValue({
        id: 'job-race',
        status: 'REVIEW_REQUIRED',
        isDeleted: false,
        extractedFields: [],
      });
      // Another user updated the job status right after findFirst
      mockTx.oCRJob.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        ocrRepo.submitVerificationTransaction('job-race', 'user-2', {
          reviewStatus: 'APPROVED',
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockTx.oCRVerification.create).not.toHaveBeenCalled();
    });

    it('should reject review with ConflictException if job is already COMPLETED', async () => {
      mockTx.oCRJob.findFirst.mockResolvedValue({
        id: 'job-done',
        status: 'COMPLETED',
        isDeleted: false,
        extractedFields: [],
      });

      await expect(
        ocrRepo.submitVerificationTransaction('job-done', 'user-1', {
          reviewStatus: 'APPROVED',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject duplicate field corrections with BadRequestException before applying updates', async () => {
      mockTx.oCRJob.findFirst.mockResolvedValue({
        id: 'job-dup',
        status: 'REVIEW_REQUIRED',
        isDeleted: false,
        extractedFields: [{ id: 'f-1', fieldName: 'hemoglobin', fieldValue: '12.0' }],
      });
      mockTx.oCRJob.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        ocrRepo.submitVerificationTransaction('job-dup', 'user-1', {
          reviewStatus: 'CORRECTED',
          corrections: [
            { fieldName: 'hemoglobin', correctedValue: '14.0' },
            { fieldName: 'hemoglobin', correctedValue: '14.5' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockTx.extractedField.update).not.toHaveBeenCalled();
    });

    it('should reject unknown fieldId with BadRequestException before applying updates', async () => {
      mockTx.oCRJob.findFirst.mockResolvedValue({
        id: 'job-unknown',
        status: 'REVIEW_REQUIRED',
        isDeleted: false,
        extractedFields: [{ id: 'f-existing', fieldName: 'wbc', fieldValue: '5000' }],
      });
      mockTx.oCRJob.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        ocrRepo.submitVerificationTransaction('job-unknown', 'user-1', {
          reviewStatus: 'CORRECTED',
          corrections: [
            { fieldId: 'f-nonexistent', fieldName: 'wbc', correctedValue: '6000' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockTx.extractedField.update).not.toHaveBeenCalled();
    });

    it('should roll back and leave zero changes if database error occurs midway', async () => {
      mockTx.oCRJob.findFirst.mockResolvedValue({
        id: 'job-err',
        status: 'REVIEW_REQUIRED',
        isDeleted: false,
        extractedFields: [{ id: 'f-1', fieldName: 'platelets', fieldValue: '200000' }],
      });
      mockTx.oCRJob.updateMany.mockResolvedValue({ count: 1 });
      // Simulate database failure during audit log creation
      mockTx.oCRAuditLog.create.mockRejectedValue(new Error('DB_DEADLOCK'));

      await expect(
        ocrRepo.submitVerificationTransaction('job-err', 'user-1', {
          reviewStatus: 'CORRECTED',
          corrections: [
            { fieldId: 'f-1', fieldName: 'platelets', correctedValue: '250000' },
          ],
        }),
      ).rejects.toThrow('DB_DEADLOCK');

      expect(mockTx.oCRVerification.create).not.toHaveBeenCalled();
    });
  });
});
