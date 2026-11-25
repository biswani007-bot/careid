import { Test, TestingModule } from '@nestjs/testing';
import { DoctorService } from '../application/use-cases/doctor.service';
import { NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { QrService } from '@modules/qr/application/use-cases/qr.service';

const mockProfileId = 'doctor-uuid-1';
const mockUserId = 'user-uuid-1';

const mockRepo = {
  findProfileByUserId: jest.fn(),
  createDoctor: jest.fn(),
  findDoctorById: jest.fn(),
  findDoctorByRegistrationNumber: jest.fn(),
  findDoctorByLicenseNumber: jest.fn(),
  findDoctorByProviderIdentifier: jest.fn(),
  findDoctors: jest.fn(),
  findPendingDoctors: jest.fn(),
  updateDoctor: jest.fn(),
  softDeleteDoctor: jest.fn(),
  searchDoctors: jest.fn(),
  addQualification: jest.fn(),
  addCertification: jest.fn(),
  addExperience: jest.fn(),
  attachDocument: jest.fn(),
  findDocumentsByDoctorId: jest.fn(),
  findSlotsByDoctorId: jest.fn(),
  createHistory: jest.fn(),
  findHistoryByDoctorId: jest.fn(),
  createAuditLog: jest.fn(),
  getStatistics: jest.fn(),
  findPatientProfileById: jest.fn(),
  getDoctorActiveFacilityIds: jest.fn(),
  getUserFacilityIds: jest.fn(),
  verifyDoctorPatientAccess: jest.fn(),
  findPatientMedicalRecords: jest.fn(),
  getPatientTimeline: jest.fn(),
  createMedicalRecord: jest.fn(),
  findMedicalRecordById: jest.fn(),
  updateMedicalRecord: jest.fn(),
  createMedicalRecordAuditLog: jest.fn(),
  createSecurityAuditLog: jest.fn(),
  findAuthorizedPatients: jest.fn(),
  findPatientDetailsForDoctor: jest.fn(),
  findPatientPrescriptions: jest.fn(),
  createPatientPrescription: jest.fn(),
  findPatientVitals: jest.fn(),
  createPatientVitals: jest.fn(),
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

describe('DoctorService', () => {
  let service: DoctorService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorService,
        { provide: 'IDoctorRepository', useValue: mockRepo },
        { provide: QrService, useValue: mockQrService },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();
    service = module.get<DoctorService>(DoctorService);
  });

  describe('registerDoctor', () => {
    it('should throw if registration number is duplicate', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(null);
      mockRepo.findDoctorByRegistrationNumber.mockResolvedValue({ id: 'existing' });

      await expect(service.registerDoctor(mockUserId, {
        fullName: 'Dr. Fleming',
        primarySpecialization: 'Cardiology',
        medicalCouncil: 'PMDC',
        registrationNumber: 'REG-100',
        licenseNumber: 'LIC-100',
      })).rejects.toThrow(ConflictException);
    });

    it('should register doctor profile, issue provider ID, and generate QR identity', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(null);
      mockRepo.findDoctorByRegistrationNumber.mockResolvedValue(null);
      mockRepo.findDoctorByLicenseNumber.mockResolvedValue(null);

      const mockCreated = {
        id: mockProfileId,
        userId: mockUserId,
        fullName: 'Dr. Fleming',
        yearsOfExperience: 15,
        primarySpecialization: 'Cardiology',
        medicalCouncil: 'PMDC',
        registrationNumber: 'REG-100',
        licenseNumber: 'LIC-100',
        providerIdentifier: 'DOC-360-123456',
        verificationStatus: 'PENDING',
        isDeleted: false,
        qualifications: [],
        certifications: [],
        experiences: [],
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createDoctor.mockResolvedValue(mockCreated);
      mockQrService.generateQr.mockResolvedValue({ token: 'HVQR-DOCTOR100' });
      mockRepo.createAuditLog.mockResolvedValue({});

      const result = await service.registerDoctor(mockUserId, {
        fullName: 'Dr. Fleming',
        primarySpecialization: 'Cardiology',
        medicalCouncil: 'PMDC',
        registrationNumber: 'REG-100',
        licenseNumber: 'LIC-100',
      });

      expect(result.id).toBe(mockProfileId);
      expect(result.providerIdentifier).toBe('DOC-360-123456');
      expect(result.verificationStatus).toBe('PENDING');
      expect(mockQrService.generateQr).toHaveBeenCalledWith(mockUserId, expect.objectContaining({
        entityId: mockProfileId,
      }));
    });
  });

  describe('verification workflow (verify / reject / renew)', () => {
    it('should verify doctor credentials and set status to VERIFIED', async () => {
      mockRepo.findDoctorById.mockResolvedValue({
        id: mockProfileId,
        verificationStatus: 'PENDING',
        isDeleted: false,
        qualifications: [],
        certifications: [],
        experiences: [],
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockVerified = {
        id: mockProfileId,
        verificationStatus: 'VERIFIED',
        verifiedBy: 'admin-1',
        verifiedAt: new Date(),
        isDeleted: false,
        qualifications: [],
        certifications: [],
        experiences: [],
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.updateDoctor.mockResolvedValue(mockVerified);
      mockRepo.createHistory.mockResolvedValue({});
      mockRepo.createAuditLog.mockResolvedValue({});

      const result = await service.verifyDoctor(mockProfileId, { reason: 'Council record checked' }, 'admin-1');
      expect(result.verificationStatus).toBe('VERIFIED');
      expect(mockRepo.createHistory).toHaveBeenCalledWith(mockProfileId, expect.objectContaining({
        action: 'VERIFIED',
      }));
    });

    it('should renew medical registration license', async () => {
      mockRepo.findDoctorById.mockResolvedValue({
        id: mockProfileId,
        verificationStatus: 'VERIFIED',
        isDeleted: false,
        qualifications: [],
        certifications: [],
        experiences: [],
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockRenewed = {
        id: mockProfileId,
        registrationExpiryDate: new Date('2029-12-31'),
        verificationStatus: 'VERIFIED',
        isDeleted: false,
        qualifications: [],
        certifications: [],
        experiences: [],
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.updateDoctor.mockResolvedValue(mockRenewed);
      mockRepo.createHistory.mockResolvedValue({});

      const result = await service.renewLicense(mockProfileId, { newExpiryDate: '2029-12-31' }, 'admin-1');
      expect(result.verificationStatus).toBe('VERIFIED');
    });

    it('should restore previously verified doctor to VERIFIED status', async () => {
      mockRepo.findDoctorById.mockResolvedValue({
        id: mockProfileId,
        verificationStatus: 'SUSPENDED',
        verifiedAt: new Date('2025-01-01'),
        verifiedBy: 'admin-1',
        isDeleted: false,
        qualifications: [],
        certifications: [],
        experiences: [],
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.updateDoctor.mockResolvedValue({
        id: mockProfileId,
        verificationStatus: 'VERIFIED',
        isDeleted: false,
        deletedAt: null,
        qualifications: [],
        certifications: [],
        experiences: [],
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.createHistory.mockResolvedValue({});
      mockRepo.createAuditLog.mockResolvedValue({});

      const result = await service.restoreDoctor(mockProfileId, { reason: 'Suspension lifted' }, 'admin-1');
      expect(result.verificationStatus).toBe('VERIFIED');
      expect(mockRepo.updateDoctor).toHaveBeenCalledWith(mockProfileId, expect.objectContaining({
        verificationStatus: 'VERIFIED',
        isDeleted: false,
      }));
    });

    it('should restore unverified doctor to PENDING status without bypassing credentials check', async () => {
      mockRepo.findDoctorById.mockResolvedValue({
        id: mockProfileId,
        verificationStatus: 'SUSPENDED',
        verifiedAt: null,
        verifiedBy: null,
        isDeleted: false,
        qualifications: [],
        certifications: [],
        experiences: [],
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.updateDoctor.mockResolvedValue({
        id: mockProfileId,
        verificationStatus: 'PENDING',
        isDeleted: false,
        deletedAt: null,
        qualifications: [],
        certifications: [],
        experiences: [],
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.createHistory.mockResolvedValue({});
      mockRepo.createAuditLog.mockResolvedValue({});

      const result = await service.restoreDoctor(mockProfileId, { reason: 'Restoring unverified profile' }, 'admin-1');
      expect(result.verificationStatus).toBe('PENDING');
      expect(mockRepo.updateDoctor).toHaveBeenCalledWith(mockProfileId, expect.objectContaining({
        verificationStatus: 'PENDING',
      }));
    });

    it('should allow FACILITY_ADMIN to restore doctor affiliated with their facility', async () => {
      mockRepo.findDoctorById.mockResolvedValue({
        id: mockProfileId,
        verificationStatus: 'SUSPENDED',
        verifiedAt: new Date('2025-01-01'),
        verifiedBy: 'admin-1',
        isDeleted: false,
        qualifications: [],
        certifications: [],
        experiences: [],
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.getUserFacilityIds.mockResolvedValue(['fac-metro-1']);
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['fac-metro-1']);
      mockRepo.updateDoctor.mockResolvedValue({
        id: mockProfileId,
        verificationStatus: 'VERIFIED',
        isDeleted: false,
        deletedAt: null,
        qualifications: [],
        certifications: [],
        experiences: [],
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.createHistory.mockResolvedValue({});
      mockRepo.createAuditLog.mockResolvedValue({});

      const caller = { userId: 'fac-admin-1', roles: ['FACILITY_ADMIN'] };
      const result = await service.restoreDoctor(mockProfileId, { reason: 'Affiliated facility restoration' }, caller);
      expect(result.verificationStatus).toBe('VERIFIED');
    });

    it('should reject FACILITY_ADMIN restoring doctor not affiliated with their facility', async () => {
      mockRepo.findDoctorById.mockResolvedValue({
        id: mockProfileId,
        verificationStatus: 'SUSPENDED',
        verifiedAt: new Date('2025-01-01'),
        verifiedBy: 'admin-1',
        isDeleted: false,
        qualifications: [],
        certifications: [],
        experiences: [],
        documents: [],
      });
      mockRepo.getUserFacilityIds.mockResolvedValue(['fac-metro-1']);
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['fac-city-2']);

      const caller = { userId: 'fac-admin-1', roles: ['FACILITY_ADMIN'] };
      await expect(
        service.restoreDoctor(mockProfileId, { reason: 'Unauthorized restoration' }, caller),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('document linkage (reusing MedicalAttachment)', () => {
    it('should attach document and link to MedicalAttachment ID', async () => {
      mockRepo.findDoctorById.mockResolvedValue({ id: mockProfileId });
      const mockDoc = {
        id: 'doc-1',
        doctorProfileId: mockProfileId,
        documentType: 'MEDICAL_LICENSE',
        medicalAttachmentId: 'attachment-uuid-1',
        verificationStatus: 'PENDING',
        createdAt: new Date(),
      };
      mockRepo.attachDocument.mockResolvedValue(mockDoc);
      mockRepo.createAuditLog.mockResolvedValue({});

      const result = await service.attachDocument(mockProfileId, {
        documentType: 'MEDICAL_LICENSE',
        medicalAttachmentId: 'attachment-uuid-1',
      });

      expect(result.id).toBe('doc-1');
      expect(result.medicalAttachmentId).toBe('attachment-uuid-1');
    });
  });

  describe('getMyProfile', () => {
    it('should return complete doctor profile when profile exists for authenticated userId', async () => {
      const mockDoctor = {
        id: mockProfileId,
        userId: mockUserId,
        fullName: 'Dr. Sarah Connor',
        primarySpecialization: 'Cardiology',
        medicalCouncil: 'MCI',
        registrationNumber: 'MCI-998877',
        licenseNumber: 'LIC-998877',
        providerIdentifier: 'DOC-360-998877',
        verificationStatus: 'VERIFIED',
        yearsOfExperience: 12,
        isDeleted: false,
        qualifications: [
          {
            id: 'q-1',
            degreeName: 'MBBS',
            instituteName: 'City Medical College',
            passingYear: 2012,
            createdAt: new Date(),
          },
        ],
        certifications: [],
        experiences: [
          {
            id: 'exp-1',
            designation: 'Senior Cardiologist',
            hospitalName: 'General Hospital',
            startDate: new Date('2018-01-01'),
            isCurrent: true,
            createdAt: new Date(),
          },
        ],
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.findProfileByUserId.mockResolvedValue(mockDoctor);

      const result = await service.getMyProfile(mockUserId);

      expect(mockRepo.findProfileByUserId).toHaveBeenCalledWith(mockUserId);
      expect(result.id).toBe(mockProfileId);
      expect(result.userId).toBe(mockUserId);
      expect(result.fullName).toBe('Dr. Sarah Connor');
      expect(result.verificationStatus).toBe('VERIFIED');
      expect(result.qualifications).toHaveLength(1);
      expect(result.qualifications[0].degreeName).toBe('MBBS');
      expect(result.experiences).toHaveLength(1);
    });

    it('should throw NotFoundException when doctor profile does not exist for userId', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(null);

      await expect(service.getMyProfile('non-existent-user-id')).rejects.toThrow(NotFoundException);
      await expect(service.getMyProfile('non-existent-user-id')).rejects.toThrow(
        'Doctor profile not found for authenticated user',
      );
      expect(mockRepo.findProfileByUserId).toHaveBeenCalledWith('non-existent-user-id');
    });

    it('should throw NotFoundException when doctor profile exists but is marked isDeleted: true', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({
        id: mockProfileId,
        userId: mockUserId,
        fullName: 'Dr. Deleted',
        isDeleted: true,
      });

      await expect(service.getMyProfile(mockUserId)).rejects.toThrow(NotFoundException);
      await expect(service.getMyProfile(mockUserId)).rejects.toThrow(
        'Doctor profile not found for authenticated user',
      );
    });
  });

  describe('Doctor Clinical Access (GET /doctors/patients/:patientProfileId/medical-records)', () => {
    const mockDoctor = {
      id: mockProfileId,
      userId: mockUserId,
      fullName: 'Dr. Evelyn Reed',
      verificationStatus: 'VERIFIED',
      isDeleted: false,
    };
    const mockPatient = {
      id: 'patient-uuid-1',
      userId: 'patient-user-1',
      patientNumber: 'PT-360-12345',
      firstName: 'John',
      lastName: 'Doe',
    };
    const mockRecord = {
      id: 'rec-1',
      patientProfileId: 'patient-uuid-1',
      title: 'Cardiology Consultation',
      chiefComplaint: 'Chest tightness',
      clinicalNotes: 'Normal sinus rhythm',
      treatmentPlan: 'Lifestyle modifications',
      followUpInstructions: 'Review in 3 weeks',
      status: 'FINAL',
      isDeleted: false,
      encounters: [],
      diagnoses: [],
      vitalSigns: [],
      procedures: [],
      attachments: [
        {
          id: 'att-1',
          patientProfileId: 'patient-uuid-1',
          fileName: 'ecg.pdf',
          originalName: 'ecg_scan.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          category: 'LAB_RESULT',
          storageKey: 'sensitive-s3-key-must-not-leak',
          storageUrl: 'https://cdn.example.com/ecg.pdf',
          version: 1,
          isDeleted: false,
          virusScanStatus: 'CLEAN',
          createdAt: new Date('2026-02-01'),
          updatedAt: new Date('2026-02-01'),
        },
      ],
      createdAt: new Date('2026-02-01'),
      updatedAt: new Date('2026-02-01'),
    };

    it('should throw NotFoundException when doctor profile does not exist', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(null);

      await expect(
        service.getPatientMedicalRecords('non-existent-doc', 'patient-uuid-1', {}),
      ).rejects.toThrow(NotFoundException);
      expect(mockRepo.createSecurityAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CLINICAL_ACCESS_DENIED', result: 'DENIED' }),
      );
    });

    it('should throw ForbiddenException when doctor registration is SUSPENDED', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({
        ...mockDoctor,
        verificationStatus: 'SUSPENDED',
      });

      await expect(
        service.getPatientMedicalRecords(mockUserId, 'patient-uuid-1', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when doctor registration was REJECTED', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({
        ...mockDoctor,
        verificationStatus: 'REJECTED',
      });

      await expect(
        service.getPatientMedicalRecords(mockUserId, 'patient-uuid-1', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when doctor has no active facility affiliations', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(mockDoctor);
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue([]);

      await expect(
        service.getPatientMedicalRecords(mockUserId, 'patient-uuid-1', {}),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.getPatientMedicalRecords(mockUserId, 'patient-uuid-1', {}),
      ).rejects.toThrow('Active healthcare facility affiliation is required');
    });

    it('should throw NotFoundException when patient profile does not exist', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(mockDoctor);
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
      mockRepo.findPatientProfileById.mockResolvedValue(null);

      await expect(
        service.getPatientMedicalRecords(mockUserId, 'unknown-patient', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException and log audit when authorization is not established', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(mockDoctor);
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
      mockRepo.findPatientProfileById.mockResolvedValue(mockPatient);
      mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
        isAuthorized: false,
        reason: 'No active referral or consent found',
      });

      await expect(
        service.getPatientMedicalRecords(mockUserId, 'patient-uuid-1', {}),
      ).rejects.toThrow(ForbiddenException);
      expect(mockRepo.createSecurityAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CLINICAL_ACCESS_DENIED',
          resource: 'PATIENT_MEDICAL_RECORDS',
          result: 'DENIED',
        }),
      );
    });

    it('should retrieve records, suppress storageKey, and write audit log when authorized via REFERRAL', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(mockDoctor);
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
      mockRepo.findPatientProfileById.mockResolvedValue(mockPatient);
      mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
        isAuthorized: true,
        authSource: 'REFERRAL',
      });
      mockRepo.findPatientMedicalRecords.mockResolvedValue({
        items: [mockRecord],
        total: 1,
      });

      const response = await service.getPatientMedicalRecords(mockUserId, 'patient-uuid-1', {
        page: 1,
        limit: 20,
      });

      expect(response.data).toHaveLength(1);
      expect(response.data[0].id).toBe('rec-1');
      expect(response.data[0].attachments![0].storageKey).toBe('');
      expect(response.meta.totalItems).toBe(1);
      expect(mockRepo.createMedicalRecordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DOCTOR_PATIENT_RECORDS_VIEWED',
          performedBy: mockUserId,
        }),
      );
    });

    it('should retrieve records when authorized via CONSENT', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(mockDoctor);
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
      mockRepo.findPatientProfileById.mockResolvedValue(mockPatient);
      mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
        isAuthorized: true,
        authSource: 'CONSENT',
      });
      mockRepo.findPatientMedicalRecords.mockResolvedValue({
        items: [mockRecord],
        total: 1,
      });

      const response = await service.getPatientMedicalRecords(mockUserId, 'patient-uuid-1', {});
      expect(response.data).toHaveLength(1);
      expect(response.meta.totalItems).toBe(1);
    });

    it('should restrict query to scopedRecordId when referral has specific record scope', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(mockDoctor);
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
      mockRepo.findPatientProfileById.mockResolvedValue(mockPatient);
      mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
        isAuthorized: true,
        authSource: 'REFERRAL',
        scopeRecordId: 'rec-1',
      });
      mockRepo.findPatientMedicalRecords.mockResolvedValue({
        items: [mockRecord],
        total: 1,
      });

      await service.getPatientMedicalRecords(mockUserId, 'patient-uuid-1', {});

      expect(mockRepo.findPatientMedicalRecords).toHaveBeenCalledWith(
        'patient-uuid-1',
        expect.objectContaining({ scopedRecordId: 'rec-1' }),
      );
    });
  });

  describe('Doctor Patient Timeline (GET /doctors/patients/:patientProfileId/medical-records/timeline)', () => {
    const mockDoctor = {
      id: mockProfileId,
      userId: mockUserId,
      fullName: 'Dr. Evelyn Reed',
      verificationStatus: 'VERIFIED',
      isDeleted: false,
    };
    const mockPatient = {
      id: 'patient-uuid-1',
      userId: 'patient-user-1',
      patientNumber: 'PT-360-12345',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should reject timeline access if doctor is not authorized', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(mockDoctor);
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
      mockRepo.findPatientProfileById.mockResolvedValue(mockPatient);
      mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
        isAuthorized: false,
        reason: 'Expired referral',
      });

      await expect(
        service.getPatientTimeline(mockUserId, 'patient-uuid-1', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return paginated timeline items and log audit when authorized', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(mockDoctor);
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
      mockRepo.findPatientProfileById.mockResolvedValue(mockPatient);
      mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
        isAuthorized: true,
        authSource: 'REFERRAL',
      });
      mockRepo.getPatientTimeline.mockResolvedValue({
        items: [
          {
            id: 'rec-1',
            type: 'MEDICAL_RECORD',
            title: 'Consultation',
            date: '2026-02-01T00:00:00.000Z',
            status: 'FINAL',
            details: {},
          },
          {
            id: 'att-1',
            type: 'ATTACHMENT',
            title: 'lab_report.pdf',
            date: '2026-02-01T00:00:00.000Z',
            category: 'LAB_RESULT',
            details: { fileSize: 500 },
          },
        ],
        total: 2,
      });

      const response = await service.getPatientTimeline(mockUserId, 'patient-uuid-1', {
        page: 1,
        limit: 20,
      });

      expect(response.data).toHaveLength(2);
      expect(response.data[0].eventType).toBe('MEDICAL_RECORD');
      expect(response.data[1].eventType).toBe('ATTACHMENT');
      expect(response.meta.totalItems).toBe(2);
      expect(mockRepo.createMedicalRecordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DOCTOR_PATIENT_TIMELINE_VIEWED',
          performedBy: mockUserId,
        }),
      );
    });
  });

  describe('Doctor Clinical Encounters Documentation (Phase 5.2B)', () => {
    const mockDoctor = {
      id: mockProfileId,
      userId: mockUserId,
      fullName: 'Dr. Evelyn Reed',
      verificationStatus: 'VERIFIED',
      isDeleted: false,
    };
    const mockPatient = {
      id: 'patient-uuid-1',
      userId: 'patient-user-1',
      patientNumber: 'PT-360-12345',
      firstName: 'John',
      lastName: 'Doe',
    };
    const mockRecord = {
      id: 'rec-1',
      patientProfileId: 'patient-uuid-1',
      title: 'Cardiology Consultation',
      chiefComplaint: 'Chest tightness',
      clinicalNotes: 'Normal sinus rhythm',
      treatmentPlan: 'Lifestyle modifications',
      followUpInstructions: 'Review in 3 weeks',
      status: 'FINAL',
      createdById: mockDoctor.userId,
      isDeleted: false,
      encounters: [],
      diagnoses: [],
      vitalSigns: [],
      procedures: [],
      attachments: [],
      createdAt: new Date('2026-02-01'),
      updatedAt: new Date('2026-02-01'),
    };

    it('should successfully document clinical encounter when doctor has valid clinical authorization', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(mockDoctor as any);
      mockRepo.findPatientProfileById.mockResolvedValue(mockPatient as any);
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
      mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
        isAuthorized: true,
        authSource: 'ACTIVE_CONSENT',
      });
      mockRepo.createMedicalRecord = jest.fn().mockResolvedValue({
        ...mockRecord,
        id: 'new-rec-1',
        title: 'New Clinical Consultation',
        createdById: mockDoctor.userId,
      });

      const result = await service.createPatientEncounter(mockUserId, 'patient-uuid-1', {
        title: 'New Clinical Consultation',
        chiefComplaint: 'Headache',
        clinicalNotes: 'Tension headache diagnosed',
        treatmentPlan: 'Hydration and rest',
        status: 'FINAL' as any,
        vitalSigns: {
          heightCm: 175,
          weightKg: 70,
          systolicBp: 120,
          diastolicBp: 80,
        },
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('new-rec-1');
      expect(mockRepo.createMedicalRecordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DOCTOR_ENCOUNTER_CREATED',
          performedBy: mockUserId,
        }),
      );
    });

    it('should reject encounter creation with ForbiddenException when doctor lacks clinical authorization', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(mockDoctor as any);
      mockRepo.findPatientProfileById.mockResolvedValue(mockPatient as any);
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
      mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
        isAuthorized: false,
        reason: 'NO_VALID_AUTHORIZATION',
      });

      await expect(
        service.createPatientEncounter(mockUserId, 'patient-uuid-1', {
          title: 'Unauthorized Consultation',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully update clinical record authored by doctor', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(mockDoctor as any);
      mockRepo.findPatientProfileById.mockResolvedValue(mockPatient as any);
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
      mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
        isAuthorized: true,
        authSource: 'ACTIVE_CONSENT',
      });
      mockRepo.findMedicalRecordById = jest.fn().mockResolvedValue({
        ...mockRecord,
        createdById: mockDoctor.userId,
      });
      mockRepo.updateMedicalRecord = jest.fn().mockResolvedValue({
        ...mockRecord,
        title: 'Updated Consultation',
      });

      const result = await service.updatePatientMedicalRecord(mockUserId, 'patient-uuid-1', 'rec-1', {
        title: 'Updated Consultation',
      });

      expect(result).toBeDefined();
      expect(result.title).toBe('Updated Consultation');
      expect(mockRepo.createMedicalRecordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DOCTOR_RECORD_UPDATED',
          performedBy: mockUserId,
        }),
      );
    });

    it('should reject update if clinical record was authored by a different doctor', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(mockDoctor as any);
      mockRepo.findPatientProfileById.mockResolvedValue(mockPatient as any);
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
      mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
        isAuthorized: true,
        authSource: 'ACTIVE_CONSENT',
      });
      mockRepo.findMedicalRecordById = jest.fn().mockResolvedValue({
        ...mockRecord,
        createdById: 'different-doctor-user-id',
      });

      await expect(
        service.updatePatientMedicalRecord(mockUserId, 'patient-uuid-1', 'rec-1', {
          title: 'Tampered Title',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject update if clinical record is ARCHIVED', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(mockDoctor as any);
      mockRepo.findPatientProfileById.mockResolvedValue(mockPatient as any);
      mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
      mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
        isAuthorized: true,
        authSource: 'ACTIVE_CONSENT',
      });
      mockRepo.findMedicalRecordById = jest.fn().mockResolvedValue({
        ...mockRecord,
        status: 'ARCHIVED',
        createdById: mockDoctor.userId,
      });

      await expect(
        service.updatePatientMedicalRecord(mockUserId, 'patient-uuid-1', 'rec-1', {
          title: 'Update Archived',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Doctor Patient Management Use-Cases', () => {
    const mockDoctorActive = {
      id: mockProfileId,
      userId: mockUserId,
      fullName: 'Dr. Evelyn Reed',
      verificationStatus: 'VERIFIED',
      isDeleted: false,
    };

    const mockPatientProfile = {
      id: 'patient-uuid-1',
      userId: 'patient-user-1',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1985-06-15'),
      gender: 'MALE',
      bloodGroup: 'O+',
      status: 'ACTIVE',
      photoUrl: null,
      authSource: 'APPOINTMENT',
      createdAt: new Date('2026-01-10'),
      updatedAt: new Date('2026-01-15'),
      user: {
        id: 'patient-user-1',
        phone: '+1234567890',
        email: 'john@example.com',
      },
    };

    describe('getAuthorizedPatients', () => {
      it('should return paginated list of authorized patients', async () => {
        mockRepo.findProfileByUserId.mockResolvedValue(mockDoctorActive as any);
        mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
        mockRepo.findAuthorizedPatients.mockResolvedValue({
          items: [mockPatientProfile],
          total: 1,
        });

        const result = await service.getAuthorizedPatients(mockUserId, { page: 1, limit: 10 });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe('patient-uuid-1');
        expect(result.data[0].phone).toBe('+1234567890');
        expect(result.meta.totalItems).toBe(1);
        expect(mockRepo.createSecurityAuditLog).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'DOCTOR_PATIENTS_LIST_VIEWED' }),
        );
      });

      it('should throw ForbiddenException if doctor is suspended', async () => {
        mockRepo.findProfileByUserId.mockResolvedValue({
          ...mockDoctorActive,
          verificationStatus: 'SUSPENDED',
        } as any);

        await expect(service.getAuthorizedPatients(mockUserId, {})).rejects.toThrow(ForbiddenException);
      });
    });

    describe('getPatientProfile', () => {
      it('should return full demographic details when authorized', async () => {
        mockRepo.findProfileByUserId.mockResolvedValue(mockDoctorActive as any);
        mockRepo.findPatientProfileById.mockResolvedValue(mockPatientProfile as any);
        mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
        mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
          isAuthorized: true,
          authSource: 'APPOINTMENT',
        });
        mockRepo.findPatientDetailsForDoctor.mockResolvedValue({
          ...mockPatientProfile,
          nationality: 'American',
          occupation: 'Developer',
          maritalStatus: 'SINGLE',
          languages: ['English'],
          knownAllergies: ['Sulfa'],
          chronicConditions: [],
          disabilities: [],
          emergencyContact: null,
        });

        const profile = await service.getPatientProfile(mockUserId, 'patient-uuid-1');

        expect(profile.id).toBe('patient-uuid-1');
        expect(profile.nationality).toBe('American');
        expect(profile.authSource).toBe('APPOINTMENT');
      });

      it('should throw ForbiddenException if doctor has no authorization for patient', async () => {
        mockRepo.findProfileByUserId.mockResolvedValue(mockDoctorActive as any);
        mockRepo.findPatientProfileById.mockResolvedValue(mockPatientProfile as any);
        mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
        mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
          isAuthorized: false,
          reason: 'No relationship',
        });

        await expect(service.getPatientProfile(mockUserId, 'patient-uuid-1')).rejects.toThrow(ForbiddenException);
      });
    });

    describe('getPatientPrescriptions & createPatientPrescription', () => {
      it('should return prescriptions list when authorized', async () => {
        mockRepo.findProfileByUserId.mockResolvedValue(mockDoctorActive as any);
        mockRepo.findPatientProfileById.mockResolvedValue(mockPatientProfile as any);
        mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
        mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
          isAuthorized: true,
          authSource: 'REFERRAL',
        });
        mockRepo.findPatientPrescriptions.mockResolvedValue({
          items: [
            {
              id: 'rx-1',
              patientProfileId: 'patient-uuid-1',
              title: 'Prescription 1',
              category: 'PRESCRIPTION',
              status: 'UPLOADED',
              reportDate: new Date('2026-11-05'),
              prescribedBy: 'Dr. Evelyn Reed',
              notes: 'Take with food\n[JSON_MEDICATIONS]:[{"name":"Amox","dosage":"500mg","frequency":"TID","duration":"7d"}]',
              createdAt: new Date('2026-11-05'),
              updatedAt: new Date('2026-11-05'),
            },
          ],
          total: 1,
        });

        const result = await service.getPatientPrescriptions(mockUserId, 'patient-uuid-1', {});

        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe('rx-1');
        expect(result.data[0].medications[0].name).toBe('Amox');
        expect(result.data[0].notes).toBe('Take with food');
      });

      it('should create prescription and record audit log', async () => {
        mockRepo.findProfileByUserId.mockResolvedValue(mockDoctorActive as any);
        mockRepo.findPatientProfileById.mockResolvedValue(mockPatientProfile as any);
        mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
        mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
          isAuthorized: true,
          authSource: 'REFERRAL',
        });
        mockRepo.createPatientPrescription.mockResolvedValue({
          id: 'rx-created-1',
          patientProfileId: 'patient-uuid-1',
          title: 'Amoxicillin RX',
          category: 'PRESCRIPTION',
          status: 'UPLOADED',
          reportDate: new Date('2026-11-05'),
          prescribedBy: 'Dr. Evelyn Reed',
          notes: '[JSON_MEDICATIONS]:[{"name":"Amoxicillin","dosage":"500mg","frequency":"TID","duration":"7d"}]',
          createdAt: new Date('2026-11-05'),
          updatedAt: new Date('2026-11-05'),
        });

        const created = await service.createPatientPrescription(mockUserId, 'patient-uuid-1', {
          title: 'Amoxicillin RX',
          medications: [
            { name: 'Amoxicillin', dosage: '500mg', frequency: 'TID', duration: '7d' },
          ],
        });

        expect(created.id).toBe('rx-created-1');
        expect(created.medications[0].name).toBe('Amoxicillin');
        expect(mockRepo.createMedicalRecordAuditLog).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'DOCTOR_PRESCRIPTION_CREATED' }),
        );
      });

      it('should reject prescription creation if medications array is empty', async () => {
        mockRepo.findProfileByUserId.mockResolvedValue(mockDoctorActive as any);
        mockRepo.findPatientProfileById.mockResolvedValue(mockPatientProfile as any);
        mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
        mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
          isAuthorized: true,
          authSource: 'CONSENT',
        });

        await expect(
          service.createPatientPrescription(mockUserId, 'patient-uuid-1', {
            title: 'Empty RX',
            medications: [],
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('getPatientVitals & createPatientVitals', () => {
      it('should return vitals list with formatted blood pressure', async () => {
        mockRepo.findProfileByUserId.mockResolvedValue(mockDoctorActive as any);
        mockRepo.findPatientProfileById.mockResolvedValue(mockPatientProfile as any);
        mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
        mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
          isAuthorized: true,
          authSource: 'APPOINTMENT',
        });
        mockRepo.findPatientVitals.mockResolvedValue({
          items: [
            {
              id: 'vital-1',
              medicalRecordId: 'rec-1',
              heightCm: 180,
              weightKg: 80,
              bmi: 24.69,
              systolicBp: 120,
              diastolicBp: 80,
              pulseBpm: 72,
              respirationRate: 16,
              temperatureC: 37.0,
              bloodSugarMgDl: 100,
              oxygenSaturation: 98,
              recordedAt: new Date('2026-11-05'),
              medicalRecord: { createdById: mockProfileId },
            },
          ],
          total: 1,
        });

        const result = await service.getPatientVitals(mockUserId, 'patient-uuid-1', {});

        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe('vital-1');
        expect(result.data[0].bloodPressure).toBe('120/80 mmHg');
        expect(result.data[0].bmi).toBe(24.69);
      });

      it('should create vitals and calculate BMI accurately', async () => {
        mockRepo.findProfileByUserId.mockResolvedValue(mockDoctorActive as any);
        mockRepo.findPatientProfileById.mockResolvedValue(mockPatientProfile as any);
        mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
        mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
          isAuthorized: true,
          authSource: 'APPOINTMENT',
        });
        mockRepo.createPatientVitals.mockResolvedValue({
          id: 'vital-new',
          medicalRecordId: 'rec-new',
          heightCm: 175,
          weightKg: 70,
          bmi: 22.86,
          systolicBp: 120,
          diastolicBp: 80,
          pulseBpm: 72,
          respirationRate: 16,
          temperatureC: 36.6,
          bloodSugarMgDl: null,
          oxygenSaturation: 98,
          recordedAt: new Date('2026-11-05'),
          medicalRecord: { createdById: mockProfileId },
        });

        const created = await service.createPatientVitals(mockUserId, 'patient-uuid-1', {
          heightCm: 175,
          weightKg: 70,
          systolicBp: 120,
          diastolicBp: 80,
        });

        expect(created.id).toBe('vital-new');
        expect(created.bmi).toBe(22.86);
        expect(created.bloodPressure).toBe('120/80 mmHg');
        expect(mockRepo.createMedicalRecordAuditLog).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'DOCTOR_VITALS_RECORDED' }),
        );
      });

      it('should reject vitals creation if no metrics provided', async () => {
        mockRepo.findProfileByUserId.mockResolvedValue(mockDoctorActive as any);
        mockRepo.findPatientProfileById.mockResolvedValue(mockPatientProfile as any);
        mockRepo.getDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
        mockRepo.verifyDoctorPatientAccess.mockResolvedValue({
          isAuthorized: true,
          authSource: 'APPOINTMENT',
        });

        await expect(service.createPatientVitals(mockUserId, 'patient-uuid-1', {})).rejects.toThrow(BadRequestException);
      });
    });
  });
});
