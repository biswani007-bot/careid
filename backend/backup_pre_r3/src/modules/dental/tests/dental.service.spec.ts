import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DentalService } from '../dental.service';
import { DentalRepository } from '../dental.repository';

describe('DentalService (Phase 22)', () => {
  let service: DentalService;
  let repo: jest.Mocked<DentalRepository>;

  const mockPatient = {
    id: 'pat-123',
    userId: 'user-pat-123',
  };

  const mockDentalRecord = {
    id: 'dent-001',
    patientProfileId: 'pat-123',
    doctorId: 'doc-456',
    toothNumber: '18',
    toothSurface: 'MOD',
    procedureName: 'Composite Restoration',
    procedureCode: 'D2393',
    clinicalFindings: 'Mesial-occlusal-distal recurrent caries',
    treatmentDate: new Date('2026-11-14T10:00:00Z'),
    followUpDate: new Date('2026-11-28T10:00:00Z'),
    status: 'COMPLETED',
    isArchived: false,
    createdAt: new Date('2026-11-14T10:00:00Z'),
    updatedAt: new Date('2026-11-14T10:00:00Z'),
    attachments: [],
  };

  beforeEach(async () => {
    const mockRepo: Partial<jest.Mocked<DentalRepository>> = {
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
        DentalService,
        { provide: DentalRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<DentalService>(DentalService);
    repo = module.get(DentalRepository) as jest.Mocked<DentalRepository>;
  });

  describe('createForPatient', () => {
    it('should throw ForbiddenException if user is not DOCTOR or ADMIN', async () => {
      await expect(
        service.createForPatient('user-doc', 'pat-123', {
          procedureName: 'Crown Prep',
        }, ['PATIENT']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if patient does not exist', async () => {
      repo.findPatientProfile.mockResolvedValue(null);
      await expect(
        service.createForPatient('user-doc', 'pat-nonexistent', {
          procedureName: 'Crown Prep',
        }, ['DOCTOR']),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create dental record with toothNumber and FDI surface', async () => {
      repo.findPatientProfile.mockResolvedValue(mockPatient as any);
      repo.findDoctorProfileByUserId.mockResolvedValue({ id: 'doc-456' } as any);
      repo.create.mockResolvedValue(mockDentalRecord as any);

      const res = await service.createForPatient('user-doc', 'pat-123', {
        toothNumber: '18',
        toothSurface: 'MOD',
        procedureName: 'Composite Restoration',
        procedureCode: 'D2393',
      }, ['DOCTOR']);

      expect(res.id).toBe('dent-001');
      expect(res.toothNumber).toBe('18');
      expect(res.procedureName).toBe('Composite Restoration');
      expect(repo.create).toHaveBeenCalled();
    });
  });

  describe('getPatientDentalRecords', () => {
    it('should return chronological dental records for doctor', async () => {
      repo.findPatientProfile.mockResolvedValue(mockPatient as any);
      repo.findByPatient.mockResolvedValue([mockDentalRecord as any]);

      const list = await service.getPatientDentalRecords('user-doc', 'pat-123', ['DOCTOR']);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('dent-001');
    });

    it('should forbid unauthorized user access to patient records', async () => {
      repo.findPatientProfile.mockResolvedValue(mockPatient as any);
      await expect(
        service.getPatientDentalRecords('other-user', 'pat-123', []),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update & archive', () => {
    it('should update unarchived record', async () => {
      repo.findById.mockResolvedValue(mockDentalRecord as any);
      repo.update.mockResolvedValue({ ...mockDentalRecord, clinicalFindings: 'Updated findings' } as any);

      const res = await service.update('dent-001', { clinicalFindings: 'Updated findings' }, 'user-doc', ['DOCTOR']);
      expect(res.clinicalFindings).toBe('Updated findings');
    });

    it('should reject modification of archived record', async () => {
      repo.findById.mockResolvedValue({ ...mockDentalRecord, isArchived: true } as any);
      await expect(
        service.update('dent-001', { clinicalFindings: 'Updated' }, 'user-doc', ['DOCTOR']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should toggle archive status', async () => {
      repo.findById.mockResolvedValue(mockDentalRecord as any);
      repo.setArchived.mockResolvedValue({ ...mockDentalRecord, isArchived: true } as any);

      const res = await service.setArchiveStatus('dent-001', true, 'user-doc', ['DOCTOR']);
      expect(res.isArchived).toBe(true);
    });
  });
});

