import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { RolesGuard } from '../infrastructure/guards/roles.guard';
import { ROLES_KEY } from '../infrastructure/decorators/roles.decorator';

import { DoctorService } from '../../doctor/application/use-cases/doctor.service';
import { FacilityService } from '../../facility/application/use-cases/facility.service';
import { ReferralService } from '../../referral/application/use-cases/referral.service';
import { OCRJobService } from '../../ocr/application/use-cases/ocr.service';
import { ReportService } from '../../report/application/use-cases/report.service';

describe('CareID Phase 2 Security Remediation Regression Suite', () => {
  let reflector: Reflector;
  let rolesGuard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  function createMockContext(user?: { userId: string; roles?: string[] }, routeRoles?: string[]): ExecutionContext {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(routeRoles);
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKSTREAM B: ROUTE-LEVEL ROLE GUARDS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Route-Level Role Guard Verification (Workstream B)', () => {
    it('Doctor Profile Update: PUT /doctors/:id allows DOCTOR, ADMIN, SUPER_ADMIN but denies PATIENT and STAFF', () => {
      const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'DOCTOR'];
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u1', roles: ['DOCTOR'] }, allowedRoles))).toBe(true);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u2', roles: ['ADMIN'] }, allowedRoles))).toBe(true);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u3', roles: ['SUPER_ADMIN'] }, allowedRoles))).toBe(true);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u4', roles: ['PATIENT'] }, allowedRoles))).toBe(false);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u5', roles: ['STAFF'] }, allowedRoles))).toBe(false);
    });

    it('Health Cards Global Search: GET /health-cards/search denies PATIENT and FAMILY_MEMBER but allows clinical/admin roles', () => {
      const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'STAFF', 'FACILITY_ADMIN'];
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u1', roles: ['PATIENT'] }, allowedRoles))).toBe(false);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u2', roles: ['FAMILY_MEMBER'] }, allowedRoles))).toBe(false);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u3', roles: ['DOCTOR'] }, allowedRoles))).toBe(true);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u4', roles: ['STAFF'] }, allowedRoles))).toBe(true);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u5', roles: ['FACILITY_ADMIN'] }, allowedRoles))).toBe(true);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u6', roles: ['ADMIN'] }, allowedRoles))).toBe(true);
    });

    it('Insurance Policy Global Search: GET /insurance/search denies PATIENT and DOCTOR but allows admin/billing roles', () => {
      const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN', 'STAFF'];
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u1', roles: ['PATIENT'] }, allowedRoles))).toBe(false);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u2', roles: ['DOCTOR'] }, allowedRoles))).toBe(false);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u3', roles: ['FACILITY_ADMIN'] }, allowedRoles))).toBe(true);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u4', roles: ['STAFF'] }, allowedRoles))).toBe(true);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u5', roles: ['ADMIN'] }, allowedRoles))).toBe(true);
    });

    it('Immunisation Directory Mutations: POST /immunisation/vaccines and schedules deny DOCTOR and PATIENT', () => {
      const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u1', roles: ['PATIENT'] }, allowedRoles))).toBe(false);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u2', roles: ['DOCTOR'] }, allowedRoles))).toBe(false);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u3', roles: ['ADMIN'] }, allowedRoles))).toBe(true);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u4', roles: ['SUPER_ADMIN'] }, allowedRoles))).toBe(true);
    });

    it('Scheduling Mutations: POST/PUT/DELETE /schedules, POST /shifts, POST /holidays deny PATIENT and DOCTOR', () => {
      const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'];
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u1', roles: ['PATIENT'] }, allowedRoles))).toBe(false);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u2', roles: ['DOCTOR'] }, allowedRoles))).toBe(false);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u3', roles: ['FACILITY_ADMIN'] }, allowedRoles))).toBe(true);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u4', roles: ['ADMIN'] }, allowedRoles))).toBe(true);
      expect(rolesGuard.canActivate(createMockContext({ userId: 'u5', roles: ['SUPER_ADMIN'] }, allowedRoles))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKSTREAM B: DOMAIN & SERVICE OBJECT OWNERSHIP ENFORCEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Doctor Profile Ownership Enforcement (DoctorService.updateDoctor)', () => {
    let service: DoctorService;
    let mockRepo: any;
    let mockQrService: any;
    let mockLogger: any;

    beforeEach(() => {
      mockRepo = {
        findDoctorById: jest.fn(),
        updateDoctor: jest.fn(),
        createAuditLog: jest.fn(),
      };
      mockQrService = { generateQr: jest.fn() };
      mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      service = new DoctorService(mockRepo, mockQrService, mockLogger as any);
    });

    it('should allow a DOCTOR to update their own profile', async () => {
      const doctorId = 'doc-profile-1';
      const doctorUserId = 'user-doctor-1';
      mockRepo.findDoctorById.mockResolvedValue({
        id: doctorId,
        userId: doctorUserId,
        fullName: 'Dr. Jane Smith',
        verificationStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.updateDoctor.mockResolvedValue({
        id: doctorId,
        userId: doctorUserId,
        fullName: 'Dr. Jane Smith MD',
        verificationStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const caller = { userId: doctorUserId, roles: ['DOCTOR'] };
      const res = await service.updateDoctor(doctorId, { fullName: 'Dr. Jane Smith MD' }, caller);

      expect(res.fullName).toBe('Dr. Jane Smith MD');
      expect(mockRepo.updateDoctor).toHaveBeenCalledWith(doctorId, { fullName: 'Dr. Jane Smith MD' });
    });

    it('should reject a DOCTOR attempting to update another doctor profile with 403 Forbidden', async () => {
      const doctorId = 'doc-profile-1';
      const actualOwnerUserId = 'user-doctor-1';
      mockRepo.findDoctorById.mockResolvedValue({
        id: doctorId,
        userId: actualOwnerUserId,
        fullName: 'Dr. Jane Smith',
        verificationStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const attackerDoctor = { userId: 'user-doctor-2', roles: ['DOCTOR'] };
      await expect(
        service.updateDoctor(doctorId, { fullName: 'Hacked Profile' }, attackerDoctor),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRepo.updateDoctor).not.toHaveBeenCalled();
    });

    it('should allow an ADMIN to update any doctor profile', async () => {
      const doctorId = 'doc-profile-1';
      mockRepo.findDoctorById.mockResolvedValue({
        id: doctorId,
        userId: 'user-doctor-1',
        fullName: 'Dr. Jane Smith',
        verificationStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.updateDoctor.mockResolvedValue({
        id: doctorId,
        userId: 'user-doctor-1',
        fullName: 'Dr. Jane Smith (Admin Updated)',
        verificationStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const adminCaller = { userId: 'admin-user-1', roles: ['ADMIN'] };
      const res = await service.updateDoctor(doctorId, { fullName: 'Dr. Jane Smith (Admin Updated)' }, adminCaller);

      expect(res.fullName).toBe('Dr. Jane Smith (Admin Updated)');
    });

    it('should throw 404 NotFoundException if doctor profile does not exist', async () => {
      mockRepo.findDoctorById.mockResolvedValue(null);
      const caller = { userId: 'admin-1', roles: ['ADMIN'] };
      await expect(service.updateDoctor('non-existent', {}, caller)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Facility Affiliation Enforcement (FacilityService.updateFacility)', () => {
    let service: FacilityService;
    let mockRepo: any;
    let mockQrService: any;
    let mockLogger: any;

    beforeEach(() => {
      mockRepo = {
        findFacilityById: jest.fn(),
        updateFacility: jest.fn(),
        createAuditLog: jest.fn(),
        isUserAffiliatedWithFacility: jest.fn(),
      };
      mockQrService = { generateQr: jest.fn() };
      mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      service = new FacilityService(mockRepo, mockQrService, mockLogger as any);
    });

    it('should allow FACILITY_ADMIN to update their affiliated facility', async () => {
      const facilityId = 'fac-metro-001';
      const facilityAdminUserId = 'user-fac-admin-1';

      mockRepo.findFacilityById.mockResolvedValue({
        id: facilityId,
        name: 'Metro General Hospital',
        facilityCode: 'FAC-METRO-001',
        verificationStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.isUserAffiliatedWithFacility.mockResolvedValue(true);
      mockRepo.updateFacility.mockResolvedValue({
        id: facilityId,
        name: 'Metro General Hospital (Updated)',
        facilityCode: 'FAC-METRO-001',
        verificationStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const caller = { userId: facilityAdminUserId, roles: ['FACILITY_ADMIN'] };
      const res = await service.updateFacility(facilityId, { name: 'Metro General Hospital (Updated)' }, caller);

      expect(res.name).toBe('Metro General Hospital (Updated)');
      expect(mockRepo.isUserAffiliatedWithFacility).toHaveBeenCalledWith(facilityId, facilityAdminUserId);
    });

    it('should reject FACILITY_ADMIN attempting to update a foreign facility with 403 Forbidden', async () => {
      const targetFacilityId = 'fac-city-hospital';
      const foreignAdminUserId = 'user-fac-admin-other';

      mockRepo.findFacilityById.mockResolvedValue({
        id: targetFacilityId,
        name: 'City Central Hospital',
        facilityCode: 'FAC-CITY-001',
        verificationStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.isUserAffiliatedWithFacility.mockResolvedValue(false);

      const caller = { userId: foreignAdminUserId, roles: ['FACILITY_ADMIN'] };
      await expect(
        service.updateFacility(targetFacilityId, { name: 'Unauthorized Renaming' }, caller),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRepo.updateFacility).not.toHaveBeenCalled();
    });

    it('should allow SUPER_ADMIN to update any facility without affiliation check', async () => {
      const facilityId = 'fac-city-hospital';
      mockRepo.findFacilityById.mockResolvedValue({
        id: facilityId,
        name: 'City Central Hospital',
        verificationStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.updateFacility.mockResolvedValue({
        id: facilityId,
        name: 'City Central Hospital (Verified)',
        verificationStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const superAdmin = { userId: 'super-admin-1', roles: ['SUPER_ADMIN'] };
      const res = await service.updateFacility(facilityId, { name: 'City Central Hospital (Verified)' }, superAdmin);

      expect(res.name).toBe('City Central Hospital (Verified)');
      expect(mockRepo.isUserAffiliatedWithFacility).not.toHaveBeenCalled();
    });
  });

  describe('Referral Privacy & Scoping Enforcement (ReferralService)', () => {
    let service: ReferralService;
    let mockRepo: any;
    let mockLogger: any;

    beforeEach(() => {
      mockRepo = {
        findReferralById: jest.fn(),
        findReferrals: jest.fn(),
        findPatientProfileIdByUserId: jest.fn(),
        findStaffFacilitiesByUserId: jest.fn(),
      };
      mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      service = new ReferralService(mockRepo, mockLogger as any);
    });

    describe('getReferralById (GET /referrals/:id)', () => {
      const mockReferral = {
        id: 'ref-1',
        referralNumber: 'REF-2026-00001',
        patientId: 'patient-profile-100',
        referringDoctorId: 'doctor-user-1',
        referringFacilityId: 'fac-1',
        receivingDoctorId: 'doctor-user-2',
        receivingFacilityId: 'fac-2',
        referralType: 'SPECIALIST_CONSULTATION',
        priority: 'ROUTINE',
        status: 'SUBMITTED',
        reasonForReferral: 'Cardiology consult',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      it('should allow referring doctor to view referral', async () => {
        mockRepo.findReferralById.mockResolvedValue(mockReferral);
        const caller = { userId: 'doctor-user-1', roles: ['DOCTOR'] };
        const res = await service.getReferralById('ref-1', caller);
        expect(res.id).toBe('ref-1');
      });

      it('should allow receiving doctor to view referral', async () => {
        mockRepo.findReferralById.mockResolvedValue(mockReferral);
        const caller = { userId: 'doctor-user-2', roles: ['DOCTOR'] };
        const res = await service.getReferralById('ref-1', caller);
        expect(res.id).toBe('ref-1');
      });

      it('should allow patient owner to view referral', async () => {
        mockRepo.findReferralById.mockResolvedValue(mockReferral);
        mockRepo.findPatientProfileIdByUserId.mockResolvedValue('patient-profile-100');
        const caller = { userId: 'patient-user-1', roles: ['PATIENT'] };
        const res = await service.getReferralById('ref-1', caller);
        expect(res.id).toBe('ref-1');
      });

      it('should allow affiliated facility staff to view referral', async () => {
        mockRepo.findReferralById.mockResolvedValue(mockReferral);
        mockRepo.findStaffFacilitiesByUserId.mockResolvedValue({ primaryFacilityId: 'fac-2' });
        const caller = { userId: 'staff-user-1', roles: ['STAFF'] };
        const res = await service.getReferralById('ref-1', caller);
        expect(res.id).toBe('ref-1');
      });

      it('should reject an unrelated patient attempting to view referral with 403 Forbidden', async () => {
        mockRepo.findReferralById.mockResolvedValue(mockReferral);
        mockRepo.findPatientProfileIdByUserId.mockResolvedValue('different-patient-profile');
        mockRepo.findStaffFacilitiesByUserId.mockResolvedValue(null);

        const attacker = { userId: 'unrelated-patient', roles: ['PATIENT'] };
        await expect(service.getReferralById('ref-1', attacker)).rejects.toThrow(ForbiddenException);
      });

      it('should reject an unrelated doctor attempting to view referral with 403 Forbidden', async () => {
        mockRepo.findReferralById.mockResolvedValue(mockReferral);
        mockRepo.findPatientProfileIdByUserId.mockResolvedValue(null);
        mockRepo.findStaffFacilitiesByUserId.mockResolvedValue(null);

        const thirdPartyDoctor = { userId: 'unrelated-doctor-3', roles: ['DOCTOR'] };
        await expect(service.getReferralById('ref-1', thirdPartyDoctor)).rejects.toThrow(ForbiddenException);
      });

      it('should throw 404 NotFoundException for nonexistent referral', async () => {
        mockRepo.findReferralById.mockResolvedValue(null);
        await expect(service.getReferralById('nonexistent', { userId: 'admin', roles: ['ADMIN'] })).rejects.toThrow(NotFoundException);
      });
    });

    describe('getReferrals (GET /referrals) Scoping', () => {
      it('should scope PATIENT queries strictly to their own patientId', async () => {
        mockRepo.findPatientProfileIdByUserId.mockResolvedValue('patient-profile-100');
        mockRepo.findReferrals.mockResolvedValue({ data: [], total: 0 });

        const patientCaller = { userId: 'patient-user-1', roles: ['PATIENT'] };
        await service.getReferrals({}, patientCaller);

        expect(mockRepo.findReferrals).toHaveBeenCalledWith(
          expect.objectContaining({ patientId: 'patient-profile-100' }),
        );
      });

      it('should reject PATIENT query attempting to specify another patientId with 403 Forbidden', async () => {
        mockRepo.findPatientProfileIdByUserId.mockResolvedValue('patient-profile-100');

        const patientCaller = { userId: 'patient-user-1', roles: ['PATIENT'] };
        await expect(
          service.getReferrals({ patientId: 'victim-patient-profile' }, patientCaller),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should scope DOCTOR queries to their own referrals when no filter is provided', async () => {
        mockRepo.findReferrals.mockResolvedValue({ data: [], total: 0 });

        const doctorCaller = { userId: 'doctor-user-1', roles: ['DOCTOR'] };
        await service.getReferrals({}, doctorCaller);

        expect(mockRepo.findReferrals).toHaveBeenCalledWith(
          expect.objectContaining({ doctorId: 'doctor-user-1' }),
        );
      });

      it('should reject DOCTOR query attempting to spy on another doctor referrals with 403 Forbidden', async () => {
        const doctorCaller = { userId: 'doctor-user-1', roles: ['DOCTOR'] };
        await expect(
          service.getReferrals({ referringDoctorId: 'other-doctor-99' }, doctorCaller),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should allow ADMIN to query across all filters without restriction', async () => {
        mockRepo.findReferrals.mockResolvedValue({ data: [], total: 0 });

        const adminCaller = { userId: 'admin-1', roles: ['ADMIN'] };
        await service.getReferrals({ status: 'PENDING', patientId: 'any-patient' }, adminCaller);

        expect(mockRepo.findReferrals).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'PENDING', patientId: 'any-patient' }),
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKSTREAM D: OCR REPROCESSING ROUTE & STATE MACHINE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('OCR Reprocessing Route & State Machine (Workstream D)', () => {
    let service: OCRJobService;
    let mockRepo: any;
    let mockLogger: any;

    beforeEach(() => {
      mockRepo = {
        findJobById: jest.fn(),
        updateJobStatus: jest.fn(),
        createPage: jest.fn(),
        createExtractedField: jest.fn(),
        createAuditLog: jest.fn(),
      };
      mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      service = new OCRJobService(mockRepo, mockLogger as any);
    });

    it('should successfully reprocess a COMPLETED or FAILED job when requested by owner', async () => {
      const jobId = 'ocr-job-1';
      const ownerUserId = 'submitter-user-1';

      mockRepo.findJobById.mockResolvedValue({
        id: jobId,
        medicalAttachmentId: 'attachment-1',
        documentType: 'LAB_REPORT',
        status: 'COMPLETED',
        submittedBy: ownerUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const caller = { userId: ownerUserId, roles: ['DOCTOR'] };
      const res = await service.reprocessJob(jobId, caller);

      expect(res.id).toBe(jobId);
      expect(mockRepo.updateJobStatus).toHaveBeenCalledWith(jobId, 'PREPROCESSING');
      expect(mockRepo.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        ocrJobId: jobId,
        action: 'JOB_REPROCESSED',
        performedBy: ownerUserId,
      }));
    });

    it('should throw 404 NotFoundException if OCR job does not exist', async () => {
      mockRepo.findJobById.mockResolvedValue(null);
      const caller = { userId: 'admin-1', roles: ['ADMIN'] };
      await expect(service.reprocessJob('nonexistent', caller)).rejects.toThrow(NotFoundException);
    });

    it('should reject non-owner user attempting to reprocess job with 403 Forbidden', async () => {
      mockRepo.findJobById.mockResolvedValue({
        id: 'ocr-job-1',
        submittedBy: 'owner-user',
        status: 'FAILED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const attacker = { userId: 'attacker-user', roles: ['PATIENT'] };
      await expect(service.reprocessJob('ocr-job-1', attacker)).rejects.toThrow(ForbiddenException);
    });

    it('should reject reprocessing when job is already running (PREPROCESSING, OCR_RUNNING) with 409 Conflict', async () => {
      mockRepo.findJobById.mockResolvedValue({
        id: 'ocr-job-1',
        submittedBy: 'owner-user',
        status: 'OCR_RUNNING',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const caller = { userId: 'owner-user', roles: ['DOCTOR'] };
      await expect(service.reprocessJob('ocr-job-1', caller)).rejects.toThrow(ConflictException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKSTREAM C: FAIL-CLOSED REPORT DOWNLOAD VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Report Download Fail-Closed Security Policy (Workstream C)', () => {
    let service: ReportService;
    let mockRepo: any;
    let mockB2Storage: any;
    let mockPatientRepo: any;
    let mockAuditService: any;
    let mockLogger: any;

    beforeEach(() => {
      process.env.REPORT_DOWNLOAD_SECRET = 'a_very_secure_test_download_signing_secret_32_bytes_long';
      mockRepo = {
        findReportById: jest.fn(),
        findProfileByUserId: jest.fn().mockResolvedValue({ id: 'prof-1', userId: 'user-1' }),
      };
      mockB2Storage = {
        isConfigured: jest.fn().mockReturnValue(false),
        generatePresignedDownloadUrl: jest.fn(),
      };
      mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      const mockQrService = { generateQr: jest.fn() };

      service = new ReportService(
        mockRepo,
        mockQrService as any,
        mockLogger as any,
        mockB2Storage,
      );
    });

    it('should strictly reject download when virusScanStatus is PENDING (fail-closed)', async () => {
      mockRepo.findReportById.mockResolvedValue({
        id: 'rep-1',
        patientProfileId: 'prof-1',
        attachments: [
          {
            storageUrl: 'https://storage.careid.com/file.pdf',
            virusScanStatus: 'PENDING',
          },
        ],
      });

      await expect(service.getDownloadToken('rep-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should strictly reject download when virusScanStatus is INFECTED (fail-closed)', async () => {
      mockRepo.findReportById.mockResolvedValue({
        id: 'rep-1',
        patientProfileId: 'prof-1',
        attachments: [
          {
            storageUrl: 'https://storage.careid.com/malware.pdf',
            virusScanStatus: 'INFECTED',
          },
        ],
      });

      await expect(service.getDownloadToken('rep-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should strictly reject download when virusScanStatus is missing/undefined', async () => {
      mockRepo.findReportById.mockResolvedValue({
        id: 'rep-1',
        patientProfileId: 'prof-1',
        attachments: [
          {
            storageUrl: 'https://storage.careid.com/unscanned.pdf',
            virusScanStatus: undefined,
          },
        ],
      });

      await expect(service.getDownloadToken('rep-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should permit download token generation only when virusScanStatus is confirmed CLEAN', async () => {
      mockRepo.findReportById.mockResolvedValue({
        id: 'rep-1',
        patientProfileId: 'prof-1',
        attachments: [
          {
            storageUrl: 'https://storage.careid.com/clean-lab.pdf',
            virusScanStatus: 'CLEAN',
          },
        ],
      });

      const res = await service.getDownloadToken('rep-1', 'user-1');
      expect(res.downloadUrl).toBeDefined();
      expect(res.token).toBeDefined();
    });
  });
});
