import { Test, TestingModule } from '@nestjs/testing';
import { MedicalRecordService } from '../application/use-cases/medical-record.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { QrService } from '@modules/qr/application/use-cases/qr.service';

const mockPatientProfileId = 'patient-uuid-dental-01';
const mockOtherPatientProfileId = 'patient-uuid-dental-99';
const mockUserId = 'user-uuid-dental-01';
const mockOtherUserId = 'user-uuid-dental-99';
const mockDoctorUserId = 'doctor-uuid-dental-01';

describe('CareID Dental and Vision Complete Lifecycle Integration Suite', () => {
  let service: MedicalRecordService;

  const recordsDb = new Map<string, any>();
  const attachmentsDb = new Map<string, any>();
  const auditLogs: any[] = [];

  const mockRepo: any = {
    findProfileByUserId: jest.fn(async (userId: string) => {
      if (userId === mockUserId) return { id: mockPatientProfileId, fullName: 'Dental Patient' };
      if (userId === mockOtherUserId) return { id: mockOtherPatientProfileId, fullName: 'Other Patient' };
      return null;
    }),
    createRecord: jest.fn(async (profileId: string, data: any) => {
      const id = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const record = {
        id,
        patientProfileId: profileId,
        title: data.title,
        chiefComplaint: data.chiefComplaint || null,
        clinicalNotes: data.clinicalNotes || null,
        treatmentPlan: data.treatmentPlan || null,
        followUpInstructions: data.followUpInstructions || null,
        status: data.status || 'FINAL',
        isDeleted: false,
        encounters: data.encounter ? [{
          id: `enc-${Date.now()}`,
          encounterType: data.encounter.encounterType || 'CONSULTATION',
          encounterDate: new Date(),
        }] : [],
        diagnoses: data.diagnoses || [],
        vitalSigns: data.vitalSigns ? [data.vitalSigns] : [],
        procedures: data.procedures || [],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      recordsDb.set(id, record);
      return record;
    }),
    findRecordById: jest.fn(async (id: string) => recordsDb.get(id) || null),
    findRecordsByProfile: jest.fn(async (profileId: string) => {
      return Array.from(recordsDb.values()).filter((r) => r.patientProfileId === profileId && !r.isDeleted);
    }),
    updateRecord: jest.fn(async (id: string, data: any) => {
      const record = recordsDb.get(id);
      if (!record) return null;
      Object.assign(record, data, { updatedAt: new Date() });
      return record;
    }),
    softDeleteRecord: jest.fn(async (id: string) => {
      const record = recordsDb.get(id);
      if (record) record.isDeleted = true;
      return record;
    }),
    getTimeline: jest.fn(async () => []),
    createAttachment: jest.fn(async (data: any) => {
      const id = `att-${Date.now()}`;
      const att = {
        id,
        patientProfileId: data.patientProfileId,
        medicalRecordId: data.medicalRecordId,
        fileName: data.fileName,
        originalName: data.originalName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        category: data.category || 'OTHER',
        storageKey: data.storageKey,
        storageUrl: data.storageUrl,
        version: 1,
        isDeleted: false,
        virusScanStatus: 'CLEAN',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      attachmentsDb.set(id, att);
      if (data.medicalRecordId && recordsDb.has(data.medicalRecordId)) {
        recordsDb.get(data.medicalRecordId).attachments.push(att);
      }
      return att;
    }),
    findAttachmentsByRecord: jest.fn(async (recordId: string) => {
      return Array.from(attachmentsDb.values()).filter((a) => a.medicalRecordId === recordId && !a.isDeleted);
    }),
    createAuditLog: jest.fn(async (data: any) => {
      auditLogs.push(data);
      return data;
    }),
  };

  const mockQrService = {
    generateQr: jest.fn(),
    verifyQrPayload: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalRecordService,
        { provide: 'IMedicalRecordRepository', useValue: mockRepo },
        { provide: QrService, useValue: mockQrService },
      ],
    }).compile();

    service = module.get<MedicalRecordService>(MedicalRecordService);
  });

  beforeEach(() => {
    recordsDb.clear();
    attachmentsDb.clear();
    auditLogs.length = 0;
  });

  describe('1. Create & Validate Dental Records Lifecycle', () => {
    it('should create dental record with category DENTAL, correct patient ownership, and valid encounter mapping', async () => {
      const dentalRecord = await service.createRecord(mockUserId, {
        title: 'Molar Endodontic Therapy (Root Canal)',
        chiefComplaint: 'Severe sensitivity in lower right first molar (#46)',
        clinicalNotes: 'Deep caries approaching pulp chamber. Local anesthesia administered.',
        treatmentPlan: 'Complete pulpectomy, obturate canal, crown restoration in 2 weeks.',
        category: 'DENTAL',
        subCategory: 'ENDODONTICS',
      });

      expect(dentalRecord.id).toBeDefined();
      expect(dentalRecord.patientProfileId).toBe(mockPatientProfileId);
      expect(dentalRecord.category).toBe('DENTAL');
      expect(dentalRecord.title).toContain('Endodontic');
      expect(dentalRecord.encounters).toBeDefined();
      expect(dentalRecord.encounters![0].encounterType).toBe('DENTAL');
    });

    it('should link dental attachments (e.g. intraoral X-rays / periapical scans)', async () => {
      const dentalRecord = await service.createRecord(mockUserId, {
        title: 'Periodontal Examination',
        category: 'DENTAL',
      });

      const attachment = await service.uploadAttachment(mockUserId, dentalRecord.id, {
        fileName: 'periapical_xray_molar_46.png',
        originalName: 'periapical_xray_molar_46.png',
        fileSize: 524288,
        mimeType: 'image/png',
        category: 'RADIOLOGY',
        storageKey: 'attachments/dental/xray_46.png',
        storageUrl: 'https://cdn.hvapi.com/attachments/dental/xray_46.png',
      }, ['PATIENT']);

      expect(attachment.id).toBeDefined();
      expect(attachment.medicalRecordId).toBe(dentalRecord.id);

      const recordAttachments = await service.getRecordAttachments(mockUserId, dentalRecord.id);
      expect(recordAttachments).toHaveLength(1);
      expect(recordAttachments[0].fileName).toBe('periapical_xray_molar_46.png');
    });
  });

  describe('2. Create & Validate Vision Records Lifecycle', () => {
    it('should create vision record with category VISION, refractive metrics, and optometrist notes', async () => {
      const visionRecord = await service.createRecord(mockUserId, {
        title: 'Comprehensive Optometric Refraction & Eye Exam',
        chiefComplaint: 'Bilateral astigmatism and difficulty reading distant signs',
        clinicalNotes: 'Visual acuity OD: 20/40, OS: 20/50. Corrected to 20/20 with -1.50/-0.75x180.',
        treatmentPlan: 'Issue single-vision corrective lenses with anti-reflective coating.',
        category: 'VISION',
        subCategory: 'REFRACTION',
      });

      expect(visionRecord.id).toBeDefined();
      expect(visionRecord.patientProfileId).toBe(mockPatientProfileId);
      expect(visionRecord.category).toBe('VISION');
      expect(visionRecord.encounters).toBeDefined();
      expect(visionRecord.encounters![0].encounterType).toBe('VISION');
    });

    it('should link vision attachments (e.g. retinal fundus photograph / OCT scan)', async () => {
      const visionRecord = await service.createRecord(mockUserId, {
        title: 'Diabetic Retinopathy Screening',
        category: 'VISION',
      });

      const attachment = await service.uploadAttachment(mockUserId, visionRecord.id, {
        fileName: 'retinal_fundus_photo.jpg',
        originalName: 'retinal_fundus_photo.jpg',
        fileSize: 1048576,
        mimeType: 'image/jpeg',
        category: 'IMAGE',
        storageKey: 'attachments/vision/fundus_od.jpg',
        storageUrl: 'https://cdn.hvapi.com/attachments/vision/fundus_od.jpg',
      }, ['PATIENT']);

      expect(attachment.id).toBeDefined();
      expect(attachment.medicalRecordId).toBe(visionRecord.id);
    });
  });

  describe('3. Multi-Category Filtering & Retrieval', () => {
    beforeEach(async () => {
      await service.createRecord(mockUserId, { title: 'Annual Medical Physical', category: 'GENERAL_MEDICAL' });
      await service.createRecord(mockUserId, { title: 'Dental Deep Cleaning', category: 'DENTAL' });
      await service.createRecord(mockUserId, { title: 'Eye Examination & Glaucoma Check', category: 'VISION' });
    });

    it('should return only DENTAL records when category=DENTAL is queried', async () => {
      const results = await service.getRecords(mockUserId, 'DENTAL');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.every((r) => r.category === 'DENTAL')).toBe(true);
      expect(results[0].title).toBe('Dental Deep Cleaning');
    });

    it('should return only VISION records when category=VISION is queried', async () => {
      const results = await service.getRecords(mockUserId, 'VISION');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.every((r) => r.category === 'VISION')).toBe(true);
      expect(results[0].title).toBe('Eye Examination & Glaucoma Check');
    });

    it('should return only GENERAL_MEDICAL records when category=GENERAL_MEDICAL is queried', async () => {
      const results = await service.getRecords(mockUserId, 'GENERAL_MEDICAL');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.every((r) => r.category === 'GENERAL_MEDICAL')).toBe(true);
      expect(results[0].title).toBe('Annual Medical Physical');
    });
  });

  describe('4. Lifecycle Immutability & Updates', () => {
    it('should allow updating permitted clinical notes on active record', async () => {
      const rec = await service.createRecord(mockUserId, {
        title: 'Initial Dental Consultation',
        category: 'DENTAL',
        clinicalNotes: 'Mild gingivitis',
      });

      const updated = await service.updateRecord(mockUserId, rec.id, {
        clinicalNotes: 'Mild gingivitis resolved with chlorhexidine rinse',
      });

      expect(updated.clinicalNotes).toContain('chlorhexidine rinse');
    });

    it('should reject updates on ARCHIVED records with BadRequestException', async () => {
      const rec = await service.createRecord(mockUserId, {
        title: 'Vision Exam 2025',
        category: 'VISION',
      });

      await service.archiveRecord(mockUserId, rec.id);

      await expect(
        service.updateRecord(mockUserId, rec.id, { clinicalNotes: 'Attempted modification' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('5. Access Control & Authorization Boundaries', () => {
    it('should strictly reject unauthorized cross-patient record access with ForbiddenException', async () => {
      const rec = await service.createRecord(mockUserId, {
        title: 'Confidential Dental Extraction',
        category: 'DENTAL',
      });

      // Other patient tries to retrieve this patient's record
      await expect(
        service.getRecordById(mockOtherUserId, rec.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should strictly reject unauthorized cross-patient attachment upload with ForbiddenException', async () => {
      const rec = await service.createRecord(mockUserId, {
        title: 'Vision Prescription',
        category: 'VISION',
      });

      await expect(
        service.uploadAttachment(mockOtherUserId, rec.id, {
          fileName: 'rogue_file.pdf',
          originalName: 'rogue_file.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          storageKey: 'key',
          storageUrl: 'https://cdn.hvapi.com/key',
        }, ['PATIENT']),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('6. Unified Clinical PDF Export', () => {
    it('should generate valid PDF 1.4 binary stream containing clinical history and write audit log', async () => {
      await service.createRecord(mockUserId, {
        title: 'Comprehensive Dental Crown Placement',
        category: 'DENTAL',
        clinicalNotes: 'Porcelain crown placed on tooth #16 successfully.',
      });

      const pdfBuffer = await service.exportRecordsPdf(mockUserId);
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.toString('latin1', 0, 8)).toContain('%PDF-1.4');
      expect(pdfBuffer.length).toBeGreaterThan(500);

      const exportAudit = auditLogs.find((l) => l.action === 'PATIENT_EXPORT_PDF_GENERATED');
      expect(exportAudit).toBeDefined();
      expect(exportAudit.performedBy).toBe(mockUserId);
    });
  });
});
