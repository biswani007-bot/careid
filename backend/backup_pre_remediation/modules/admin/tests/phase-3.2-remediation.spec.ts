import { AdminRepository } from '../infrastructure/database/admin.repository';
import { PrismaOcrRepository } from '../../ocr/infrastructure/database/ocr.repository';
import { DoctorRepository } from '../../doctor/infrastructure/database/doctor.repository';
import { FacilityRepository } from '../../facility/infrastructure/database/facility.repository';
import { StaffRepository } from '../../staff/infrastructure/database/staff.repository';
import { OCRJobService } from '../../ocr/application/use-cases/ocr.service';
import { ForbiddenException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

describe('CareID Phase 3.2 — Timeline, OCR Referral Scoping & Directory Ordering', () => {
  const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

  // ═════════════════════════════════════════════════════════════════════════════
  // Fix A: Patient Timeline Deep Pagination & Boundaries
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Fix A — Patient Timeline Deep Pagination & Boundaries', () => {
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
        medicalEncounter: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        clinicalDiagnosis: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        $queryRaw: jest.fn(),
      };
      adminRepo = new AdminRepository(mockDb);
    });

    it('A.1: should return empty timeline for 0 records', async () => {
      mockDb.medicalRecord.count.mockResolvedValue(0);
      mockDb.medicalAttachment.count.mockResolvedValue(0);

      const res = await adminRepo.getPatientTimeline('patient-empty', { page: 1, limit: 20 });
      expect(res.total).toBe(0);
      expect(res.items).toEqual([]);
      expect(mockDb.$queryRaw).not.toHaveBeenCalled();
    });

    it('A.2: should return 1 record on page 1 for single-record patient', async () => {
      mockDb.medicalRecord.count.mockResolvedValue(1);
      mockDb.medicalAttachment.count.mockResolvedValue(0);
      mockDb.$queryRaw.mockResolvedValue([
        {
          id: 'rec-single',
          item_type: 'MEDICAL_RECORD',
          title: 'Single Exam',
          item_date: new Date('2026-05-01T10:00:00.000Z'),
          status: 'FINAL',
          summary: 'Routine check',
          category: null,
          original_name: null,
          file_size: null,
          mime_type: null,
          virus_scan_status: null,
        },
      ]);

      const res = await adminRepo.getPatientTimeline('patient-single', { page: 1, limit: 20 });
      expect(res.total).toBe(1);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].id).toBe('rec-single');
      expect(res.items[0].type).toBe('MEDICAL_RECORD');
      expect(res.items[0].title).toBe('Single Exam');
    });

    it('A.3: should paginate through 1,500 medical records without a 1,000 cap (Page 51 around item 1,000-1,020)', async () => {
      mockDb.medicalRecord.count.mockResolvedValue(1500);
      mockDb.medicalAttachment.count.mockResolvedValue(0);

      // Simulating page 51 with limit 20: skip = 1000
      const page51Rows = Array.from({ length: 20 }, (_, i) => ({
        id: `rec-${1001 + i}`,
        item_type: 'MEDICAL_RECORD',
        title: `Exam #${1001 + i}`,
        item_date: new Date(Date.now() - (1001 + i) * 60000),
        status: 'FINAL',
        summary: `Notes for ${1001 + i}`,
        category: null,
        original_name: null,
        file_size: null,
        mime_type: null,
        virus_scan_status: null,
      }));

      mockDb.$queryRaw.mockResolvedValue(page51Rows);

      const res = await adminRepo.getPatientTimeline('patient-1500', { page: 51, limit: 20 });
      expect(res.total).toBe(1500);
      expect(res.items).toHaveLength(20);
      expect(res.items[0].id).toBe('rec-1001');
      expect(res.items[19].id).toBe('rec-1020');
      expect(mockDb.$queryRaw).toHaveBeenCalled();
    });

    it('A.4: should support asymmetric datasets: 1,200 records and 100 attachments (1,300 total) with continuous interleaving', async () => {
      mockDb.medicalRecord.count.mockResolvedValue(1200);
      mockDb.medicalAttachment.count.mockResolvedValue(100);

      // Page 50 (items 981 to 1000)
      const page50Rows = Array.from({ length: 20 }, (_, i) => ({
        id: `item-${981 + i}`,
        item_type: i % 2 === 0 ? 'MEDICAL_RECORD' : 'ATTACHMENT',
        title: `Item ${981 + i}`,
        item_date: new Date(Date.now() - (981 + i) * 60000),
        status: i % 2 === 0 ? 'FINAL' : null,
        summary: i % 2 === 0 ? 'Summary' : null,
        category: i % 2 !== 0 ? 'LAB' : null,
        original_name: i % 2 !== 0 ? `file-${981 + i}.pdf` : null,
        file_size: i % 2 !== 0 ? 5000 : null,
        mime_type: i % 2 !== 0 ? 'application/pdf' : null,
        virus_scan_status: i % 2 !== 0 ? 'CLEAN' : null,
      }));

      mockDb.$queryRaw.mockResolvedValue(page50Rows);

      const res = await adminRepo.getPatientTimeline('patient-1300', { page: 50, limit: 20 });
      expect(res.total).toBe(1300);
      expect(res.items).toHaveLength(20);
      expect(res.items[0].id).toBe('item-981');
      expect(res.items[19].id).toBe('item-1000');
    });

    it('A.5: should support >1,000 attachments and 0 records seamlessly on page 51 (items 1001-1020)', async () => {
      mockDb.medicalRecord.count.mockResolvedValue(0);
      mockDb.medicalAttachment.count.mockResolvedValue(1100);

      const page51Attachments = Array.from({ length: 20 }, (_, i) => ({
        id: `att-${1001 + i}`,
        item_type: 'ATTACHMENT',
        title: `attachment_${1001 + i}.pdf`,
        item_date: new Date(Date.now() - (1001 + i) * 60000),
        status: null,
        summary: null,
        category: 'LAB_REPORT',
        original_name: `lab_${1001 + i}.pdf`,
        file_size: 15000,
        mime_type: 'application/pdf',
        virus_scan_status: 'CLEAN',
      }));

      mockDb.$queryRaw.mockResolvedValue(page51Attachments);

      const res = await adminRepo.getPatientTimeline('patient-atts', { page: 51, limit: 20 });
      expect(res.total).toBe(1100);
      expect(res.items).toHaveLength(20);
      expect(res.items[0].id).toBe('att-1001');
      expect(res.items[0].type).toBe('ATTACHMENT');
      expect(res.items[19].id).toBe('att-1020');
    });

    it('A.6: should sort identical timestamps deterministically by id DESC', async () => {
      mockDb.medicalRecord.count.mockResolvedValue(2);
      mockDb.medicalAttachment.count.mockResolvedValue(2);

      const sameDate = new Date('2026-06-15T12:00:00.000Z');
      mockDb.$queryRaw.mockResolvedValue([
        {
          id: 'uuid-z-last',
          item_type: 'MEDICAL_RECORD',
          title: 'Z Exam',
          item_date: sameDate,
          status: 'FINAL',
          summary: 'Notes Z',
          category: null,
          original_name: null,
          file_size: null,
          mime_type: null,
          virus_scan_status: null,
        },
        {
          id: 'uuid-m-middle',
          item_type: 'ATTACHMENT',
          title: 'm_file.pdf',
          item_date: sameDate,
          status: null,
          summary: null,
          category: 'LAB',
          original_name: 'm_file.pdf',
          file_size: 2048,
          mime_type: 'application/pdf',
          virus_scan_status: 'CLEAN',
        },
        {
          id: 'uuid-a-first',
          item_type: 'MEDICAL_RECORD',
          title: 'A Exam',
          item_date: sameDate,
          status: 'FINAL',
          summary: 'Notes A',
          category: null,
          original_name: null,
          file_size: null,
          mime_type: null,
          virus_scan_status: null,
        },
      ]);

      const res = await adminRepo.getPatientTimeline('patient-tie', { page: 1, limit: 10 });
      expect(res.total).toBe(4);
      expect(res.items[0].id).toBe('uuid-z-last');
      expect(res.items[1].id).toBe('uuid-m-middle');
      expect(res.items[2].id).toBe('uuid-a-first');
    });

    it('A.7: should return empty items when requested page is beyond totalItems', async () => {
      mockDb.medicalRecord.count.mockResolvedValue(50);
      mockDb.medicalAttachment.count.mockResolvedValue(50);

      // Page 10 with limit 20 -> skip = 180 > total 100
      const res = await adminRepo.getPatientTimeline('patient-beyond', { page: 10, limit: 20 });
      expect(res.total).toBe(100);
      expect(res.items).toEqual([]);
      expect(mockDb.$queryRaw).not.toHaveBeenCalled();
    });

    it('A.8: fallback mode without $queryRaw supports >1,000 records without artificial 1,000 fetch cap', async () => {
      delete mockDb.$queryRaw; // Force fallback mode
      mockDb.medicalRecord.count.mockResolvedValue(1200);
      mockDb.medicalAttachment.count.mockResolvedValue(0);

      const allRecords = Array.from({ length: 1200 }, (_, i) => ({
        id: `rec-${String(1200 - i).padStart(4, '0')}`,
        title: `Exam #${1200 - i}`,
        createdAt: new Date(Date.now() - i * 60000),
        status: 'FINAL',
        encounters: [],
        diagnoses: [],
      }));

      mockDb.medicalRecord.findMany.mockResolvedValue(allRecords);
      mockDb.medicalAttachment.findMany.mockResolvedValue([]);

      // Request page 51 (skip = 1000, limit = 20) -> items 1001 to 1020
      const res = await adminRepo.getPatientTimeline('patient-fallback-1200', { page: 51, limit: 20 });
      expect(res.total).toBe(1200);
      expect(res.items).toHaveLength(20);
      // Confirms records past 1000 are not truncated
      expect(res.items[0].id).toBe(allRecords[1000].id);
      expect(res.items[19].id).toBe(allRecords[1019].id);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // Fix B: OCR Referral Facility Scope
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Fix B — OCR Referral Facility Scope', () => {
    let mockDb: any;
    let ocrRepo: PrismaOcrRepository;

    beforeEach(() => {
      mockDb = {
        staffMember: { findFirst: jest.fn(), findMany: jest.fn() },
        doctorProfile: { findFirst: jest.fn() },
        doctorFacility: { findMany: jest.fn() },
        oCRJob: { findFirst: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
        facilityDocument: { findFirst: jest.fn(), findMany: jest.fn() },
        medicalAttachment: { findFirst: jest.fn(), findMany: jest.fn() },
        patientReferral: { findMany: jest.fn() },
        referralAttachment: { findMany: jest.fn() },
        doctorDocument: { findMany: jest.fn() },
        staffDocument: { findMany: jest.fn() },
      };
      ocrRepo = new PrismaOcrRepository(mockDb);
    });

    it('B.1: active referral (ACCEPTED) grants review access to receivingFacilityId', async () => {
      mockDb.oCRJob.findFirst.mockResolvedValue({
        id: 'job-ref-1',
        medicalAttachmentId: 'att-ref-1',
        submittedBy: 'user-other',
      });

      mockDb.facilityDocument.findFirst.mockResolvedValue(null);
      mockDb.medicalAttachment.findFirst.mockResolvedValue({
        id: 'att-ref-1',
        patientProfileId: 'patient-ref-1',
      });

      // Active referral with future expiry
      mockDb.patientReferral.findMany.mockResolvedValue([
        {
          referringFacilityId: 'fac-referring',
          receivingFacilityId: 'fac-receiving',
        },
      ]);
      mockDb.referralAttachment.findMany.mockResolvedValue([]);

      const facilities = await ocrRepo.getJobFacilityIds('job-ref-1');
      expect(facilities).toContain('fac-referring');
      expect(facilities).toContain('fac-receiving');

      // Verify patientReferral was queried with active statuses and non-deleted
      expect(mockDb.patientReferral.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: false,
            status: expect.objectContaining({
              in: ['SUBMITTED', 'TRIAGED', 'ACCEPTED', 'IN_PROGRESS'],
            }),
          }),
        }),
      );
    });

    it('B.2: inactive referral (COMPLETED, CANCELLED, REJECTED, EXPIRED, DRAFT) does not grant review access', async () => {
      mockDb.oCRJob.findFirst.mockResolvedValue({
        id: 'job-ref-2',
        medicalAttachmentId: 'att-ref-2',
        submittedBy: null,
      });

      mockDb.facilityDocument.findFirst.mockResolvedValue(null);
      mockDb.medicalAttachment.findFirst.mockResolvedValue({
        id: 'att-ref-2',
        patientProfileId: 'patient-ref-2',
      });

      // Query returns empty because active filter excludes inactive referrals
      mockDb.patientReferral.findMany.mockResolvedValue([]);
      mockDb.referralAttachment.findMany.mockResolvedValue([]);

      const facilities = await ocrRepo.getJobFacilityIds('job-ref-2');
      expect(facilities).toEqual([]);
    });

    it('B.3: direct ReferralAttachment grants facility access only when referral is active and not deleted', async () => {
      mockDb.oCRJob.findFirst.mockResolvedValue({
        id: 'job-ref-3',
        medicalAttachmentId: 'att-ref-3',
        submittedBy: null,
      });

      mockDb.facilityDocument.findFirst.mockResolvedValue(null);
      mockDb.medicalAttachment.findFirst.mockResolvedValue({
        id: 'att-ref-3',
        patientProfileId: null,
      });

      // Direct referral attachment with active referral
      mockDb.referralAttachment.findMany.mockResolvedValue([
        {
          attachmentId: 'att-ref-3',
          referral: {
            id: 'ref-direct',
            status: 'IN_PROGRESS',
            isDeleted: false,
            expiresAt: new Date(Date.now() + 86400000), // tomorrow
            referringFacilityId: 'fac-ref-direct-1',
            receivingFacilityId: 'fac-rec-direct-2',
          },
        },
      ]);

      const facilities = await ocrRepo.getJobFacilityIds('job-ref-3');
      expect(facilities).toContain('fac-ref-direct-1');
      expect(facilities).toContain('fac-rec-direct-2');
    });

    it('B.4: direct ReferralAttachment with deleted or completed referral is ignored', async () => {
      mockDb.oCRJob.findFirst.mockResolvedValue({
        id: 'job-ref-4',
        medicalAttachmentId: 'att-ref-4',
        submittedBy: null,
      });

      mockDb.facilityDocument.findFirst.mockResolvedValue(null);
      mockDb.medicalAttachment.findFirst.mockResolvedValue({
        id: 'att-ref-4',
        patientProfileId: null,
      });

      mockDb.referralAttachment.findMany.mockResolvedValue([
        {
          attachmentId: 'att-ref-4',
          referral: {
            id: 'ref-deleted',
            status: 'COMPLETED',
            isDeleted: true,
            expiresAt: null,
            referringFacilityId: 'fac-deleted-1',
            receivingFacilityId: 'fac-deleted-2',
          },
        },
      ]);

      const facilities = await ocrRepo.getJobFacilityIds('job-ref-4');
      expect(facilities).toEqual([]);
    });

    it('B.5: unaffiliated clinical user fails closed with 403 when submitting verification', async () => {
      const mockServiceOcrRepo = {
        getUserActiveFacilityIds: jest.fn().mockResolvedValue([]),
        getJobFacilityIds: jest.fn().mockResolvedValue(['fac-metro']),
        findJobById: jest.fn().mockResolvedValue({ id: 'job-1', submittedBy: 'other-user' }),
        submitVerificationTransaction: jest.fn(),
      };

      const ocrService = new OCRJobService(mockServiceOcrRepo as any, mockLogger as any);

      await expect(
        ocrService.submitVerification(
          'job-1',
          { userId: 'doc-unaffiliated', roles: ['DOCTOR'] },
          { reviewStatus: 'APPROVED' },
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockServiceOcrRepo.submitVerificationTransaction).not.toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // Fix C: Deterministic Directory Pagination Ordering
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Fix C — Deterministic Directory Pagination Ordering', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {
        doctorProfile: { findMany: jest.fn().mockResolvedValue([]) },
        facility: { findMany: jest.fn().mockResolvedValue([]) },
        staffMember: { findMany: jest.fn().mockResolvedValue([]) },
      };
    });

    it('C.1: DoctorRepository.findDoctors orders by [{ createdAt: "desc" }, { id: "desc" }]', async () => {
      const doctorRepo = new DoctorRepository(mockDb);
      await doctorRepo.findDoctors(false, 1, 50);

      expect(mockDb.doctorProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 50,
          skip: 0,
        }),
      );
    });

    it('C.2: FacilityRepository.findAllFacilities orders by [{ createdAt: "desc" }, { id: "desc" }]', async () => {
      const facilityRepo = new FacilityRepository(mockDb);
      await facilityRepo.findAllFacilities(false, 2, 25);

      expect(mockDb.facility.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 25,
          skip: 25,
        }),
      );
    });

    it('C.3: StaffRepository.findStaffMembers orders by [{ createdAt: "desc" }, { id: "desc" }]', async () => {
      const staffRepo = new StaffRepository(mockDb);
      await staffRepo.findStaffMembers(false, 3, 20);

      expect(mockDb.staffMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 20,
          skip: 40,
        }),
      );
    });
  });
});

