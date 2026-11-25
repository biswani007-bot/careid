import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { LaboratoryService } from '../laboratory.service';
import { LaboratoryRepository } from '../laboratory.repository';

describe('LaboratoryService (Phase 22)', () => {
  let service: LaboratoryService;
  let repo: jest.Mocked<LaboratoryRepository>;

  const mockPatient = {
    id: 'pat-123',
    userId: 'user-pat-123',
  };

  const mockLabReport = {
    id: 'lab-001',
    patientProfileId: 'pat-123',
    doctorId: 'doc-456',
    laboratoryName: 'Metropolis Central Pathology',
    specimenType: 'Venous Whole Blood',
    collectedDate: new Date('2026-11-14T08:00:00Z'),
    reportedDate: new Date('2026-11-14T11:00:00Z'),
    status: 'FINAL',
    overallNotes: 'Mild microcytic hypochromic anemia',
    attachmentId: null,
    createdAt: new Date('2026-11-14T11:00:00Z'),
    updatedAt: new Date('2026-11-14T11:00:00Z'),
    testItems: [
      {
        id: 'item-001',
        reportId: 'lab-001',
        testName: 'Hemoglobin (Hb)',
        testCategory: 'Complete Blood Count',
        numericValue: 11.2,
        textValue: null,
        unit: 'g/dL',
        referenceRange: '13.5 - 17.5 g/dL',
        referenceLow: 13.5,
        referenceHigh: 17.5,
        flag: 'LOW',
        status: 'COMPLETED',
      },
    ],
  };

  beforeEach(async () => {
    const mockRepo: Partial<jest.Mocked<LaboratoryRepository>> = {
      findPatientProfile: jest.fn(),
      findDoctorProfileByUserId: jest.fn(),
      createReport: jest.fn(),
      findReportById: jest.fn(),
      findReportsByPatient: jest.fn(),
      updateReport: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LaboratoryService,
        { provide: LaboratoryRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<LaboratoryService>(LaboratoryService);
    repo = module.get(LaboratoryRepository) as jest.Mocked<LaboratoryRepository>;
  });

  describe('createForPatient', () => {
    it('should throw ForbiddenException if user is not DOCTOR or ADMIN', async () => {
      await expect(
        service.createForPatient('user-doc', 'pat-123', {
          laboratoryName: 'Metropolis',
          testItems: [],
        }, ['PATIENT']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create lab report with auto-flagging of out-of-range values', async () => {
      repo.findPatientProfile.mockResolvedValue(mockPatient as any);
      repo.findDoctorProfileByUserId.mockResolvedValue({ id: 'doc-456' } as any);
      repo.createReport.mockResolvedValue(mockLabReport as any);

      const res = await service.createForPatient('user-doc', 'pat-123', {
        laboratoryName: 'Metropolis Central Pathology',
        specimenType: 'Venous Whole Blood',
        testItems: [
          {
            testName: 'Hemoglobin (Hb)',
            numericValue: 11.2,
            unit: 'g/dL',
            referenceRange: '13.5 - 17.5 g/dL',
            referenceLow: 13.5,
            referenceHigh: 17.5,
          },
        ],
      }, ['DOCTOR']);

      expect(res.id).toBe('lab-001');
      expect(res.testItems).toHaveLength(1);
      expect(res.testItems[0].flag).toBe('LOW');
      expect(repo.createReport).toHaveBeenCalled();
    });
  });

  describe('getPatientLabResults', () => {
    it('should return chronological lab reports for authorized clinician', async () => {
      repo.findPatientProfile.mockResolvedValue(mockPatient as any);
      repo.findReportsByPatient.mockResolvedValue([mockLabReport as any]);

      const list = await service.getPatientLabResults('user-doc', 'pat-123', ['DOCTOR']);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('lab-001');
    });

    it('should forbid unauthorized user access to patient lab reports', async () => {
      repo.findPatientProfile.mockResolvedValue(mockPatient as any);
      await expect(
        service.getPatientLabResults('other-user', 'pat-123', []),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
