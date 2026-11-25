import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrescriptionService } from '../prescription.service';
import { PrescriptionRepository } from '../prescription.repository';
import { DrugInteractionService } from '../drug-interaction.service';

describe('PrescriptionService (Phase 22)', () => {
  let service: PrescriptionService;
  let repo: jest.Mocked<PrescriptionRepository>;
  let interactionService: DrugInteractionService;

  const mockPatient = {
    id: 'pat-123',
    userId: 'user-pat-123',
  };

  const mockPrescription = {
    id: 'rx-001',
    patientProfileId: 'pat-123',
    doctorId: 'doc-456',
    doctorName: 'Dr. Jane Smith',
    diagnosisCode: 'J02.9',
    status: 'ACTIVE',
    discontinueReason: null,
    notes: 'Take full course',
    prescribedAt: new Date('2026-11-14T10:00:00Z'),
    createdAt: new Date('2026-11-14T10:00:00Z'),
    updatedAt: new Date('2026-11-14T10:00:00Z'),
    items: [
      {
        id: 'rx-item-1',
        prescriptionId: 'rx-001',
        drugName: 'Amoxicillin',
        dosage: '500mg',
        form: 'Capsule',
        route: 'ORAL',
        frequency: 'TID',
        durationDays: 7,
        instructions: 'Take after meals',
      },
    ],
    refills: [],
  };

  beforeEach(async () => {
    const mockRepo: Partial<jest.Mocked<PrescriptionRepository>> = {
      findPatientProfile: jest.fn(),
      findDoctorProfileByUserId: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findByPatient: jest.fn(),
      discontinue: jest.fn(),
      addRefill: jest.fn(),
      getPatientAllergies: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionService,
        DrugInteractionService,
        { provide: PrescriptionRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<PrescriptionService>(PrescriptionService);
    repo = module.get(PrescriptionRepository) as jest.Mocked<PrescriptionRepository>;
    interactionService = module.get<DrugInteractionService>(DrugInteractionService);
  });

  describe('createForPatient', () => {
    it('should throw ForbiddenException if user is not DOCTOR or ADMIN', async () => {
      await expect(
        service.createForPatient('user-patient', 'pat-123', {
          items: [{ drugName: 'Amoxicillin', dosage: '500mg', form: 'Capsule', frequency: 'TID', durationDays: 7 }],
        }, ['PATIENT']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if no items provided', async () => {
      repo.findPatientProfile.mockResolvedValue(mockPatient as any);
      await expect(
        service.createForPatient('user-doc', 'pat-123', {
          items: [],
        }, ['DOCTOR']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create prescription and return formatted DTO', async () => {
      repo.findPatientProfile.mockResolvedValue(mockPatient as any);
      repo.findDoctorProfileByUserId.mockResolvedValue({ id: 'doc-456', fullName: 'Dr. Jane Smith' } as any);
      repo.create.mockResolvedValue(mockPrescription as any);

      const res = await service.createForPatient('user-doc', 'pat-123', {
        diagnosisCode: 'J02.9',
        items: [{ drugName: 'Amoxicillin', dosage: '500mg', form: 'Capsule', frequency: 'TID', durationDays: 7 }],
      }, ['DOCTOR']);

      expect(res.id).toBe('rx-001');
      expect(res.items).toHaveLength(1);
      expect(res.status).toBe('ACTIVE');
      expect(repo.create).toHaveBeenCalled();
    });
  });

  describe('discontinue & refill', () => {
    it('should discontinue prescription with documented reason', async () => {
      repo.findById.mockResolvedValue(mockPrescription as any);
      repo.discontinue.mockResolvedValue({
        ...mockPrescription,
        status: 'DISCONTINUED',
        discontinueReason: 'Adverse GI distress reported',
      } as any);

      const res = await service.discontinue('rx-001', { reason: 'Adverse GI distress reported' }, 'user-doc', ['DOCTOR']);
      expect(res.status).toBe('DISCONTINUED');
      expect(res.discontinueReason).toBe('Adverse GI distress reported');
    });

    it('should issue refill with auto-incremented refill number', async () => {
      repo.findById.mockResolvedValue(mockPrescription as any);
      repo.addRefill.mockResolvedValue({
        ...mockPrescription,
        refills: [
          {
            id: 'refill-1',
            prescriptionId: 'rx-001',
            refillDate: new Date('2026-11-21T10:00:00Z'),
            refillNumber: 1,
            notes: 'Dispensed 30 capsules',
          },
        ],
      } as any);

      const res = await service.addRefill('rx-001', { notes: 'Dispensed 30 capsules' }, 'user-doc', ['DOCTOR']);
      expect(res.refills).toHaveLength(1);
      expect(res.refills[0].refillNumber).toBe(1);
    });
  });
});
