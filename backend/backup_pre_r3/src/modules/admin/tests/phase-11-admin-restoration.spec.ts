import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from '../application/use-cases/admin.service';
import { AdminController } from '../presentation/controllers/admin.controller';
import { MedicalRecordService } from '../../medical-record/application/use-cases/medical-record.service';
import { MedicalRecordController } from '../../medical-record/presentation/controllers/medical-record.controller';
import { QrService } from '@modules/qr/application/use-cases/qr.service';
import { AntivirusScannerService } from '@modules/storage/infrastructure/antivirus-scanner.service';
import { B2StorageService } from '@modules/storage/infrastructure/b2-storage.service';
import { NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { Reflector } from '@nestjs/core';

describe('Phase 11: Admin Web Management Functionality Restoration', () => {
  let adminService: AdminService;
  let adminController: AdminController;
  let medicalRecordService: MedicalRecordService;
  let medicalRecordController: MedicalRecordController;

  const mockAdminRepo = {
    findUsers: jest.fn(),
    findUserById: jest.fn(),
    findUserByPhone: jest.fn(),
    findUserByEmail: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    updateUserStatus: jest.fn(),
    findPatients: jest.fn(),
    findPatientById: jest.fn(),
    createPatient: jest.fn(),
    updatePatient: jest.fn(),
    findMedicalRecords: jest.fn(),
    findMedicalRecordById: jest.fn(),
    createMedicalRecord: jest.fn(),
    findDoctors: jest.fn(),
    registerDoctorForExistingUser: jest.fn(),
    createAuditLog: jest.fn(),
  };

  const mockMedicalRecordRepo = {
    findRecordById: jest.fn(),
    findProfileByUserId: jest.fn(),
    findPatientProfileById: jest.fn(),
    createRecord: jest.fn(),
    updateRecord: jest.fn(),
    restoreRecord: jest.fn(),
    createAuditLog: jest.fn(),
    createAttachment: jest.fn(),
    verifyDoctorAccessToPatient: jest.fn(),
  };

  const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
  const mockQrService = { generateRecordQr: jest.fn().mockResolvedValue('data:image/png;base64,mockQr') };
  const mockAntivirus = {
    scanBuffer: jest.fn().mockResolvedValue({ status: 'CLEAN' }),
    scanAttachment: jest.fn().mockResolvedValue({ status: 'CLEAN' }),
  };
  const mockB2 = { isConfigured: jest.fn().mockReturnValue(false) };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController, MedicalRecordController],
      providers: [
        AdminService,
        MedicalRecordService,
        { provide: 'IAdminRepository', useValue: mockAdminRepo },
        { provide: 'IMedicalRecordRepository', useValue: mockMedicalRecordRepo },
        { provide: QrService, useValue: mockQrService },
        { provide: AntivirusScannerService, useValue: mockAntivirus },
        { provide: B2StorageService, useValue: mockB2 },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    adminService = module.get<AdminService>(AdminService);
    adminController = module.get<AdminController>(AdminController);
    medicalRecordService = module.get<MedicalRecordService>(MedicalRecordService);
    medicalRecordController = module.get<MedicalRecordController>(MedicalRecordController);
  });

  // ─── CIR-001: Patient Creation from Admin Web ─────────────────────────────

  describe('CIR-001: POST /api/v1/admin/patients', () => {
    const validPatientDto = {
      firstName: 'Fatima',
      lastName: 'Khan',
      dob: '1995-08-20',
      gender: 'FEMALE',
      email: 'fatima.khan@example.com',
      phone: '+923001234567',
      zipCode: '75000',
      address: '742 Evergreen Terrace, Springfield',
      photoUrl: 'https://example.com/avatar.jpg',
      bloodGroup: 'B+',
    };

    it('should successfully register a patient, provision profile, and generate health card', async () => {
      const mockCreated = {
        id: 'patient-profile-new-uuid',
        userId: 'user-new-uuid',
        patientNumber: 'P-987654',
        firstName: 'Fatima',
        lastName: 'Khan',
        dateOfBirth: '1995-08-20T00:00:00.000Z',
        gender: 'FEMALE',
        bloodGroup: 'B+',
        phone: '+923001234567',
        email: 'fatima.khan@example.com',
        userStatus: 'ACTIVE',
        profileStatus: 'COMPLETED',
        onboardingStep: 6,
        address: '742 Evergreen Terrace, Springfield',
        currentAddressLine1: '742 Evergreen Terrace, Springfield',
        currentPostalCode: '75000',
        photoUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        healthCard: {
          id: 'hc-new-uuid',
          cardNumber: 'HC-CAREID-9999',
          status: 'ACTIVE',
        },
      };

      mockAdminRepo.findUserByPhone.mockResolvedValue(null);
      mockAdminRepo.findUserByEmail.mockResolvedValue(null);
      mockAdminRepo.createPatient.mockResolvedValue(mockCreated);

      const req = { user: { userId: 'admin-uuid-1', roles: ['ADMIN'] } };
      const result = await adminController.createPatient(req, validPatientDto);

      expect(mockAdminRepo.findUserByPhone).toHaveBeenCalledWith('+923001234567');
      expect(mockAdminRepo.findUserByEmail).toHaveBeenCalledWith('fatima.khan@example.com');
      expect(mockAdminRepo.createPatient).toHaveBeenCalledWith({
        ...validPatientDto,
        adminUserId: 'admin-uuid-1',
      });
      expect(result.id).toBe('patient-profile-new-uuid');
      expect(result.patientNumber).toBe('P-987654');
      expect(result.healthCard?.cardNumber).toBe('HC-CAREID-9999');
    });

    it('should reject registration if phone number already exists', async () => {
      mockAdminRepo.findUserByPhone.mockResolvedValue({ id: 'existing-user-id' });

      const req = { user: { userId: 'admin-uuid-1', roles: ['ADMIN'] } };
      await expect(adminController.createPatient(req, validPatientDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockAdminRepo.createPatient).not.toHaveBeenCalled();
    });
  });

  // ─── CIR-002: Patient Demographic Update from Admin Web ──────────────────

  describe('CIR-002: PUT /api/v1/admin/patients/:patientId', () => {
    it('should update patient demographics and return updated profile', async () => {
      const updateDto = {
        firstName: 'Fatima Updated',
        lastName: 'Khan',
        dob: '1995-08-20',
        gender: 'FEMALE',
        bloodGroup: 'AB+',
        address: 'New Address, Suite 100',
        zipCode: '75100',
      };

      const mockUpdated = {
        id: 'patient-profile-new-uuid',
        userId: 'user-new-uuid',
        patientNumber: 'P-987654',
        firstName: 'Fatima Updated',
        lastName: 'Khan',
        dateOfBirth: '1995-08-20T00:00:00.000Z',
        gender: 'FEMALE',
        bloodGroup: 'AB+',
        phone: '+923001234567',
        email: 'fatima.khan@example.com',
        userStatus: 'ACTIVE',
        profileStatus: 'COMPLETED',
        onboardingStep: 6,
        address: 'New Address, Suite 100',
        currentAddressLine1: 'New Address, Suite 100',
        currentPostalCode: '75100',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockAdminRepo.updatePatient.mockResolvedValue(mockUpdated);

      const req = { user: { userId: 'admin-uuid-1', roles: ['ADMIN'] } };
      const result = await adminController.updatePatient(req, 'patient-profile-new-uuid', updateDto);

      expect(mockAdminRepo.updatePatient).toHaveBeenCalledWith(
        'patient-profile-new-uuid',
        expect.objectContaining({
          firstName: 'Fatima Updated',
          bloodGroup: 'AB+',
          adminUserId: 'admin-uuid-1',
        }),
      );
      expect(result.firstName).toBe('Fatima Updated');
      expect(result.bloodGroup).toBe('AB+');
    });

    it('should throw NotFoundException if patient does not exist', async () => {
      mockAdminRepo.updatePatient.mockResolvedValue(null);

      const req = { user: { userId: 'admin-uuid-1', roles: ['ADMIN'] } };
      await expect(
        adminController.updatePatient(req, 'non-existent-patient', { firstName: 'Ghost' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── CIR-003: Doctor Listing & Creation for Admin Web ─────────────────────

  describe('CIR-003: GET & POST /api/v1/admin/doctors', () => {
    it('should return doctor list with specialties and facility links for Admin', async () => {
      const mockDoctors = [
        {
          id: 'doc-uuid-1',
          userId: 'user-doc-1',
          fullName: 'Dr. Michael Chen',
          primarySpecialization: 'Dentist',
          registrationNumber: 'MED-12345',
          licenseNumber: 'LIC-98765',
          status: 'ACTIVE',
          facilities: [{ id: 'fac-1', name: 'Apex Dental Care Center' }],
        },
      ];

      mockAdminRepo.findDoctors.mockResolvedValue({ total: 1, items: mockDoctors });

      const result = await adminController.getDoctors(1, 50, 'Dentist');

      expect(mockAdminRepo.findDoctors).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        specialty: 'Dentist',
        search: undefined,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].fullName).toBe('Dr. Michael Chen');
      expect(result.meta.totalItems).toBe(1);
    });
  });

  // ─── CIR-004: Medical Record Creation from Admin Web ──────────────────────

  describe('CIR-004: POST /api/v1/admin/medical-records', () => {
    it('should create medical record with encounter and optional attachment', async () => {
      const recordDto = {
        patientId: 'patient-profile-uuid',
        category: 'Dental',
        recordType: 'Full Panoramic OPG X-Ray',
        provider: 'Dr. Michael Chen',
        facility: 'Apex Dental Care Center',
        summary: 'High-resolution digital orthopantomogram evaluating bone density.',
      };

      const mockPatient = {
        id: 'patient-profile-uuid',
        firstName: 'Jane',
        lastName: 'Doe',
      };

      const mockCreatedRecord = {
        id: 'rec-admin-new-uuid',
        patientProfileId: 'patient-profile-uuid',
        title: 'Full Panoramic OPG X-Ray',
        chiefComplaint: recordDto.summary,
        clinicalNotes: recordDto.summary,
        status: 'FINAL',
        patient: { id: 'patient-profile-uuid', firstName: 'Jane', lastName: 'Doe' },
        encounters: [{ providerName: 'Dr. Michael Chen', facilityName: 'Apex Dental Care Center' }],
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockAdminRepo.findPatientById.mockResolvedValue(mockPatient);
      mockAdminRepo.createMedicalRecord.mockResolvedValue(mockCreatedRecord);

      const req = { user: { userId: 'admin-uuid-1', roles: ['ADMIN'] } };
      const result = await adminController.createMedicalRecord(req, recordDto);

      expect(mockAdminRepo.findPatientById).toHaveBeenCalledWith('patient-profile-uuid');
      expect(mockAdminRepo.createMedicalRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          patientProfileId: 'patient-profile-uuid',
          title: 'Full Panoramic OPG X-Ray',
          provider: 'Dr. Michael Chen',
          facility: 'Apex Dental Care Center',
        }),
      );
      expect(result.id).toBe('rec-admin-new-uuid');
      expect(result.encounters[0].facilityName).toBe('Apex Dental Care Center');
    });
  });

  // ─── CIR-005: Medical Record Management Role Permissions ─────────────────

  describe('CIR-005: Medical Record Lifecycle for Admin & Staff', () => {
    it('should allow Admin to update medical record status and clinical notes without patient profile', async () => {
      const mockRecord = {
        id: 'rec-target-1',
        patientProfileId: 'patient-uuid-target',
        status: 'FINAL',
      };

      const mockUpdatedRecord = {
        ...mockRecord,
        clinicalNotes: 'Flagged for clarification: Discrepancy in dosage',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockMedicalRecordRepo.findRecordById.mockResolvedValue(mockRecord);
      mockMedicalRecordRepo.updateRecord.mockResolvedValue(mockUpdatedRecord);

      const result = await medicalRecordService.updateRecord(
        'admin-user-uuid',
        'rec-target-1',
        { clinicalNotes: 'Flagged for clarification: Discrepancy in dosage' },
        ['ADMIN'],
      );

      expect(result.id).toBe('rec-target-1');
      expect(mockMedicalRecordRepo.findProfileByUserId).not.toHaveBeenCalled();
      expect(mockMedicalRecordRepo.updateRecord).toHaveBeenCalledWith('rec-target-1', {
        clinicalNotes: 'Flagged for clarification: Discrepancy in dosage',
      });
    });

    it('should allow Admin to archive and restore records without patient profile ownership', async () => {
      const mockRecord = {
        id: 'rec-target-2',
        patientProfileId: 'patient-uuid-target',
        status: 'FINAL',
        isDeleted: false,
      };

      mockMedicalRecordRepo.findRecordById.mockResolvedValue(mockRecord);
      mockMedicalRecordRepo.updateRecord.mockResolvedValue({
        ...mockRecord,
        status: 'ARCHIVED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const archiveResult = await medicalRecordService.archiveRecord(
        'admin-user-uuid',
        'rec-target-2',
        ['ADMIN'],
      );

      expect(archiveResult.status).toBe('ARCHIVED');

      // Now restore
      const mockArchivedRecord = {
        id: 'rec-target-2',
        patientProfileId: 'patient-uuid-target',
        status: 'ARCHIVED',
        isDeleted: false,
      };

      mockMedicalRecordRepo.findRecordById.mockResolvedValue(mockArchivedRecord);
      mockMedicalRecordRepo.restoreRecord.mockResolvedValue({
        ...mockRecord,
        status: 'FINAL',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const restoreResult = await medicalRecordService.restoreRecord(
        'admin-user-uuid',
        'rec-target-2',
        ['ADMIN'],
      );

      expect(restoreResult.status).toBe('FINAL');
    });

    it('should allow Admin to upload attachment for a patient without patient profile on admin user', async () => {
      const mockPatient = {
        id: 'target-patient-uuid',
        userId: 'target-patient-user-uuid',
      };

      mockMedicalRecordRepo.findPatientProfileById.mockResolvedValue(mockPatient);
      mockMedicalRecordRepo.createAttachment.mockResolvedValue({
        id: 'att-new-uuid',
        patientProfileId: 'target-patient-uuid',
        fileName: 'lab_scan.pdf',
        originalName: 'lab_scan.pdf',
        fileSize: 2048,
        mimeType: 'application/pdf',
        category: 'LAB_REPORT',
        storageKey: 'attachments/lab_scan.pdf',
        storageUrl: '/api/v1/attachments/file/lab_scan.pdf',
        version: 1,
        isDeleted: false,
        virusScanStatus: 'CLEAN',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await medicalRecordService.uploadAttachment(
        'admin-user-uuid',
        null,
        {
          patientProfileId: 'target-patient-uuid',
          category: 'LAB_REPORT',
          storageUrl: 'https://cdn.careid.com/attachments/file/lab_scan.pdf',
          storageKey: 'attachments/lab_scan.pdf',
          fileName: 'lab_scan.pdf',
          originalName: 'lab_scan.pdf',
          fileSize: 2048,
          mimeType: 'application/pdf',
        },
        ['ADMIN'],
      );

      expect(result.patientProfileId).toBe('target-patient-uuid');
      expect(mockMedicalRecordRepo.findProfileByUserId).not.toHaveBeenCalled();
    });
  });
});
