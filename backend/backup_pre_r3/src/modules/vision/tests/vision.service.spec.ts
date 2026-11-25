import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { VisionService } from '../vision.service';
import { VisionRepository } from '../vision.repository';

describe('VisionService (Phase 22)', () => {
  let service: VisionService;
  let repo: jest.Mocked<VisionRepository>;

  const mockPatient = {
    id: 'pat-123',
    userId: 'user-pat-123',
  };

  const mockVisionRecord = {
    id: 'vis-001',
    patientProfileId: 'pat-123',
    doctorId: 'doc-456',
    examinationDate: new Date('2026-11-14T10:00:00Z'),
    odSphere: -2.5,
    odCylinder: -0.75,
    odAxis: 180,
    odAddition: 1.5,
    odVisualAcuity: '20/20',
    odIopMmHg: 14.5,
    osSphere: -2.75,
    osCylinder: -0.5,
    osAxis: 175,
    osAddition: 1.5,
    osVisualAcuity: '20/20',
    osIopMmHg: 15.0,
    contactLensBaseCurve: 8.6,
    contactLensDiameter: 14.2,
    clinicalNotes: 'Clear cornea, normal anterior chamber, intraocular pressure within normal limits',
    recommendations: 'Prescription for progressive lenses approved',
    status: 'FINAL',
    isArchived: false,
    createdAt: new Date('2026-11-14T10:00:00Z'),
    updatedAt: new Date('2026-11-14T10:00:00Z'),
    attachments: [],
  };

  beforeEach(async () => {
    const mockRepo: Partial<jest.Mocked<VisionRepository>> = {
      findPatientProfile: jest.fn(),
      findDoctorProfileByUserId: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findByPatient: jest.fn(),
      update: jest.fn(),
      setArchived: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisionService,
        { provide: VisionRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<VisionService>(VisionService);
    repo = module.get(VisionRepository) as jest.Mocked<VisionRepository>;
  });

  describe('createForPatient', () => {
    it('should throw ForbiddenException if user is not DOCTOR or ADMIN', async () => {
      await expect(
        service.createForPatient('user-doc', 'pat-123', {
          odSphere: -1.0,
        }, ['PATIENT']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if patient does not exist', async () => {
      repo.findPatientProfile.mockResolvedValue(null);
      await expect(
        service.createForPatient('user-doc', 'pat-nonexistent', {
          odSphere: -1.0,
        }, ['DOCTOR']),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create vision record with bilateral refractive values', async () => {
      repo.findPatientProfile.mockResolvedValue(mockPatient as any);
      repo.findDoctorProfileByUserId.mockResolvedValue({ id: 'doc-456' } as any);
      repo.create.mockResolvedValue(mockVisionRecord as any);

      const res = await service.createForPatient('user-doc', 'pat-123', {
        odSphere: -2.5,
        odCylinder: -0.75,
        odAxis: 180,
        osSphere: -2.75,
        osCylinder: -0.5,
        osAxis: 175,
      }, ['DOCTOR']);

      expect(res.id).toBe('vis-001');
      expect(res.odSphere).toBe(-2.5);
      expect(res.osSphere).toBe(-2.75);
      expect(repo.create).toHaveBeenCalled();
    });
  });

  describe('getPatientVisionRecords', () => {
    it('should return chronological vision records for doctor', async () => {
      repo.findPatientProfile.mockResolvedValue(mockPatient as any);
      repo.findByPatient.mockResolvedValue([mockVisionRecord as any]);

      const list = await service.getPatientVisionRecords('user-doc', 'pat-123', ['DOCTOR']);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('vis-001');
    });

    it('should forbid unauthorized user access to patient vision records', async () => {
      repo.findPatientProfile.mockResolvedValue(mockPatient as any);
      await expect(
        service.getPatientVisionRecords('other-user', 'pat-123', []),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update & archive', () => {
    it('should update unarchived record', async () => {
      repo.findById.mockResolvedValue(mockVisionRecord as any);
      repo.update.mockResolvedValue({ ...mockVisionRecord, odSphere: -3.0 } as any);

      const res = await service.update('vis-001', { odSphere: -3.0 }, 'user-doc', ['DOCTOR']);
      expect(res.odSphere).toBe(-3.0);
    });

    it('should reject modification of archived record', async () => {
      repo.findById.mockResolvedValue({ ...mockVisionRecord, isArchived: true } as any);
      await expect(
        service.update('vis-001', { odSphere: -3.0 }, 'user-doc', ['DOCTOR']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should toggle archive status', async () => {
      repo.findById.mockResolvedValue(mockVisionRecord as any);
      repo.setArchived.mockResolvedValue({ ...mockVisionRecord, isArchived: true } as any);

      const res = await service.setArchiveStatus('vis-001', true, 'user-doc', ['DOCTOR']);
      expect(res.isArchived).toBe(true);
    });
  });
});

