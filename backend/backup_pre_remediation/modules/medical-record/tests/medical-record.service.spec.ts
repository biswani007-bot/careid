import { Test, TestingModule } from '@nestjs/testing';
import { MedicalRecordService } from '../application/use-cases/medical-record.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

const mockProfileId = 'profile-uuid-1';
const mockUserId = 'user-uuid-1';
const mockRecordId = 'record-uuid-1';
const mockAttachmentId = 'attachment-uuid-1';

const mockRepo = {
  findProfileByUserId: jest.fn(),
  createRecord: jest.fn(),
  findRecordById: jest.fn(),
  findRecordsByProfile: jest.fn(),
  updateRecord: jest.fn(),
  softDeleteRecord: jest.fn(),
  restoreRecord: jest.fn(),
  searchRecords: jest.fn(),
  getTimeline: jest.fn(),
  createAttachment: jest.fn(),
  findAttachmentById: jest.fn(),
  findAttachmentsByRecord: jest.fn(),
  findAttachmentsByProfile: jest.fn(),
  updateAttachment: jest.fn(),
  softDeleteAttachment: jest.fn(),
  restoreAttachment: jest.fn(),
  createAttachmentVersion: jest.fn(),
  findAttachmentVersions: jest.fn(),
  createAuditLog: jest.fn(),
  findPatientProfileById: jest.fn(),
  verifyDoctorAccessToPatient: jest.fn(),
  updatePatientProfilePhoto: jest.fn(),
};

import { QrService } from '@modules/qr/application/use-cases/qr.service';

const mockQrService = {
  generateQr: jest.fn(),
  verifyQrPayload: jest.fn(),
  rotateQr: jest.fn(),
  revokeQr: jest.fn(),
};

describe('MedicalRecordService', () => {
  let service: MedicalRecordService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalRecordService,
        { provide: 'IMedicalRecordRepository', useValue: mockRepo },
        { provide: QrService, useValue: mockQrService },
      ],
    }).compile();
    service = module.get<MedicalRecordService>(MedicalRecordService);
  });


  describe('createRecord', () => {
    it('should throw if patient profile is not found', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(null);
      await expect(service.createRecord(mockUserId, { title: 'Test Record' })).rejects.toThrow(NotFoundException);
    });

    it('should calculate BMI when height and weight are provided and create record', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      const mockCreated = {
        id: mockRecordId,
        patientProfileId: mockProfileId,
        title: 'Routine Checkup',
        status: 'FINAL',
        isDeleted: false,
        encounters: [],
        diagnoses: [],
        vitalSigns: [{ heightCm: 175, weightKg: 70, bmi: 22.9 }],
        procedures: [],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createRecord.mockResolvedValue(mockCreated);
      mockRepo.createAuditLog.mockResolvedValue({});

      const result = await service.createRecord(mockUserId, {
        title: 'Routine Checkup',
        vitalSigns: { heightCm: 175, weightKg: 70 },
      });

      expect(result.id).toBe(mockRecordId);
      expect(result.title).toBe('Routine Checkup');
      expect(mockRepo.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATED',
        medicalRecordId: mockRecordId,
      }));
    });
  });

  describe('updateRecord', () => {
    it('should throw if record is archived', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findRecordById.mockResolvedValue({
        id: mockRecordId,
        patientProfileId: mockProfileId,
        status: 'ARCHIVED',
      });

      await expect(service.updateRecord(mockUserId, mockRecordId, { title: 'New Title' })).rejects.toThrow(BadRequestException);
    });

    it('should throw if record belongs to another user', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findRecordById.mockResolvedValue({
        id: mockRecordId,
        patientProfileId: 'other-profile',
        status: 'FINAL',
      });

      await expect(service.updateRecord(mockUserId, mockRecordId, { title: 'New Title' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('uploadAttachment', () => {
    it('should reject unsupported MIME type', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      await expect(service.uploadAttachment(mockUserId, null, {
        fileName: 'test.exe',
        originalName: 'test.exe',
        fileSize: 1000,
        mimeType: 'application/x-msdownload',
        storageKey: 'key',
        storageUrl: 'url',
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject file exceeding 15MB size limit', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      await expect(service.uploadAttachment(mockUserId, null, {
        fileName: 'large.pdf',
        originalName: 'large.pdf',
        fileSize: 20 * 1024 * 1024,
        mimeType: 'application/pdf',
        storageKey: 'key',
        storageUrl: 'url',
      })).rejects.toThrow(BadRequestException);
    });

    it('should upload valid PDF attachment successfully', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      const mockCreatedAtt = {
        id: mockAttachmentId,
        patientProfileId: mockProfileId,
        fileName: 'report.pdf',
        originalName: 'report.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        category: 'LAB_RESULT',
        storageKey: 'key',
        storageUrl: 'https://storage.provider.com/report.pdf',
        version: 1,
        isDeleted: false,
        virusScanStatus: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createAttachment.mockResolvedValue(mockCreatedAtt);
      mockRepo.createAuditLog.mockResolvedValue({});

      const result = await service.uploadAttachment(mockUserId, null, {
        fileName: 'report.pdf',
        originalName: 'report.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        category: 'LAB_RESULT' as any,
        storageKey: 'key',
        storageUrl: 'https://storage.provider.com/report.pdf',
      });

      expect(result.id).toBe(mockAttachmentId);
      expect(result.virusScanStatus).toBe('PENDING');
    });

    it('should reject attachment with extension mismatch against declared MIME', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      await expect(service.uploadAttachment(mockUserId, null, {
        fileName: 'script.exe',
        originalName: 'script.exe',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        storageKey: 'key',
        storageUrl: 'https://storage.provider.com/script.exe',
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject attachment with path traversal in fileName', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      await expect(service.uploadAttachment(mockUserId, null, {
        fileName: '../../secret.pdf',
        originalName: 'secret.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        storageKey: 'key',
        storageUrl: 'https://storage.provider.com/secret.pdf',
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject attachment with path traversal in storageKey', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      await expect(service.uploadAttachment(mockUserId, null, {
        fileName: 'report.pdf',
        originalName: 'report.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        storageKey: '../../etc/shadow',
        storageUrl: 'https://storage.provider.com/report.pdf',
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject attachment targeting cloud metadata service', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      await expect(service.uploadAttachment(mockUserId, null, {
        fileName: 'report.pdf',
        originalName: 'report.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        storageKey: 'key',
        storageUrl: 'http://169.254.169.254/latest/meta-data/',
      })).rejects.toThrow(BadRequestException);
    });

    describe('PROFILE_PHOTO integration', () => {
      const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60]);

      it('should successfully upload profile photo when initiated by authorized doctor', async () => {
        mockRepo.findPatientProfileById.mockResolvedValue({ id: 'target-patient-uuid', userId: 'pat-user-uuid' });
        mockRepo.verifyDoctorAccessToPatient.mockResolvedValue(true);
        const mockCreatedPhotoAtt = {
          id: 'photo-att-1',
          patientProfileId: 'target-patient-uuid',
          fileName: 'att-target-patient-uuid-photo.jpg',
          originalName: 'avatar.jpg',
          fileSize: 2048,
          mimeType: 'image/jpeg',
          category: 'IMAGE',
          storageKey: 'attachments/att-target-patient-uuid-photo.jpg',
          storageUrl: '/api/v1/attachments/file/att-target-patient-uuid-photo.jpg',
          version: 1,
          isDeleted: false,
          virusScanStatus: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockRepo.createAttachment.mockResolvedValue(mockCreatedPhotoAtt);
        mockRepo.updatePatientProfilePhoto.mockResolvedValue(undefined);

        const file = {
          originalname: 'avatar.jpg',
          mimetype: 'image/jpeg',
          size: 2048,
          buffer: validJpegBuffer,
        };

        const result = await service.uploadAttachment(
          'doctor-user-uuid',
          null,
          { patientProfileId: 'target-patient-uuid', category: 'PROFILE_PHOTO' },
          ['DOCTOR'],
          file,
        );

        expect(mockRepo.verifyDoctorAccessToPatient).toHaveBeenCalledWith('doctor-user-uuid', 'target-patient-uuid');
        expect(mockRepo.createAttachment).toHaveBeenCalledWith(expect.objectContaining({
          category: 'IMAGE',
          patientProfileId: 'target-patient-uuid',
        }));
        expect(mockRepo.updatePatientProfilePhoto).toHaveBeenCalledWith(
          'target-patient-uuid',
          expect.stringContaining('/api/v1/attachments/file/'),
          expect.stringContaining('attachments/'),
        );
        expect(result.category).toBe('PROFILE_PHOTO');
      });

      it('should reject profile photo upload if image content is invalid or corrupted', async () => {
        mockRepo.findPatientProfileById.mockResolvedValue({ id: 'target-patient-uuid', userId: 'pat-user-uuid' });
        mockRepo.verifyDoctorAccessToPatient.mockResolvedValue(true);

        const corruptedBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);
        const file = {
          originalname: 'corrupted.jpg',
          mimetype: 'image/jpeg',
          size: 100,
          buffer: corruptedBuffer,
        };

        await expect(
          service.uploadAttachment(
            'doctor-user-uuid',
            null,
            { patientProfileId: 'target-patient-uuid', category: 'PROFILE_PHOTO' },
            ['DOCTOR'],
            file,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject profile photo exceeding 5MB limit', async () => {
        mockRepo.findPatientProfileById.mockResolvedValue({ id: 'target-patient-uuid', userId: 'pat-user-uuid' });
        mockRepo.verifyDoctorAccessToPatient.mockResolvedValue(true);

        const file = {
          originalname: 'huge.jpg',
          mimetype: 'image/jpeg',
          size: 6 * 1024 * 1024,
          buffer: validJpegBuffer,
        };

        await expect(
          service.uploadAttachment(
            'doctor-user-uuid',
            null,
            { patientProfileId: 'target-patient-uuid', category: 'PROFILE_PHOTO' },
            ['DOCTOR'],
            file,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject profile photo association if doctor is not authorized for patient', async () => {
        mockRepo.findPatientProfileById.mockResolvedValue({ id: 'target-patient-uuid', userId: 'pat-user-uuid' });
        mockRepo.verifyDoctorAccessToPatient.mockResolvedValue(false);

        const file = {
          originalname: 'avatar.jpg',
          mimetype: 'image/jpeg',
          size: 2048,
          buffer: validJpegBuffer,
        };

        await expect(
          service.uploadAttachment(
            'unrelated-doc-uuid',
            null,
            { patientProfileId: 'target-patient-uuid', category: 'PROFILE_PHOTO' },
            ['DOCTOR'],
            file,
          ),
        ).rejects.toThrow(ForbiddenException);
      });
    });
  });

  describe('updateAttachment', () => {
    it('should increment version when a new storage key is provided', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findAttachmentById.mockResolvedValue({
        id: mockAttachmentId,
        patientProfileId: mockProfileId,
        version: 1,
        fileSize: 1048576,
      });

      const mockUpdated = {
        id: mockAttachmentId,
        patientProfileId: mockProfileId,
        version: 2,
        fileSize: 2048576,
        fileName: 'v2.pdf',
        originalName: 'v2.pdf',
        mimeType: 'application/pdf',
        category: 'LAB_RESULT',
        storageKey: 'key2',
        storageUrl: 'url2',
        isDeleted: false,
        virusScanStatus: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.updateAttachment.mockResolvedValue(mockUpdated);

      const result = await service.updateAttachment(mockUserId, mockAttachmentId, {
        storageKey: 'key2',
        storageUrl: 'url2',
        fileSize: 2048576,
      });

      expect(result.version).toBe(2);
    });
  });

  describe('Health Records Categorization & PDF Export (PRD Compliant)', () => {
    it('should categorize dental and vision records correctly and filter by category', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      const records = [
        {
          id: 'rec-1',
          patientProfileId: mockProfileId,
          title: 'Routine General Checkup',
          chiefComplaint: 'Headache',
          status: 'FINAL',
          isDeleted: false,
          encounters: [{ encounterType: 'CONSULTATION' }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'rec-2',
          patientProfileId: mockProfileId,
          title: 'Dental Cavity Filling',
          chiefComplaint: 'Toothache in lower molar',
          status: 'FINAL',
          isDeleted: false,
          encounters: [{ encounterType: 'DENTAL' }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'rec-3',
          patientProfileId: mockProfileId,
          title: 'Ophthalmology Eye Exam',
          chiefComplaint: 'Blurry vision',
          status: 'FINAL',
          isDeleted: false,
          encounters: [{ encounterType: 'VISION' }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockRepo.findRecordsByProfile.mockResolvedValue(records);

      const dentalResults = await service.getRecords(mockUserId, 'DENTAL');
      expect(dentalResults).toHaveLength(1);
      expect(dentalResults[0].category).toBe('DENTAL');
      expect(dentalResults[0].id).toBe('rec-2');

      const visionResults = await service.getRecords(mockUserId, 'VISION');
      expect(visionResults).toHaveLength(1);
      expect(visionResults[0].category).toBe('VISION');
      expect(visionResults[0].id).toBe('rec-3');

      const medicalResults = await service.getRecords(mockUserId, 'GENERAL_MEDICAL');
      expect(medicalResults).toHaveLength(1);
      expect(medicalResults[0].category).toBe('GENERAL_MEDICAL');
      expect(medicalResults[0].id).toBe('rec-1');
    });

    it('should generate a valid PDF 1.4 buffer for patient self-service clinical record export', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({
        id: mockProfileId,
        fullName: 'Test Patient',
        patientNumber: 'P-12345',
      });
      mockRepo.findRecordsByProfile.mockResolvedValue([
        {
          id: 'rec-1',
          title: 'Annual Physical',
          chiefComplaint: 'Routine checkup',
          clinicalNotes: 'All clear',
          status: 'FINAL',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      mockRepo.getTimeline.mockResolvedValue([]);
      mockRepo.createAuditLog.mockResolvedValue({});

      const pdfBuffer = await service.exportRecordsPdf(mockUserId);
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.toString('latin1', 0, 8)).toContain('%PDF-1.4');
      expect(mockRepo.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'PATIENT_EXPORT_PDF_GENERATED',
      }));
    });
  });
});
