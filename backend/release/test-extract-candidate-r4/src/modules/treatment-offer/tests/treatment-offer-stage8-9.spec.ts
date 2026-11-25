import { Test, TestingModule } from '@nestjs/testing';
import { TreatmentOfferService } from '../application/use-cases/treatment-offer.service';
import { DatabaseService } from '@database/database.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('TreatmentOfferService - Stages 8 & 9', () => {
  let service: TreatmentOfferService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      findOfferById: jest.fn(),
      createHistory: jest.fn().mockResolvedValue({ id: 'hist-1' }),
      findPatientProfileByUserId: jest.fn(),
      findDoctorProfileByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreatmentOfferService,
        {
          provide: 'ITreatmentOfferRepository',
          useValue: mockRepo,
        },
        {
          provide: DatabaseService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TreatmentOfferService>(TreatmentOfferService);
  });

  describe('Stage 8: Acceptance Certificate', () => {
    it('should throw NotFoundException if offer does not exist', async () => {
      mockRepo.findOfferById.mockResolvedValue(null);
      await expect(
        service.getAcceptanceCertificate('user-1', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if offer is not in ACCEPTED status', async () => {
      mockRepo.findOfferById.mockResolvedValue({
        id: 'to-1',
        status: 'DRAFT',
      });
      await expect(
        service.getAcceptanceCertificate('user-1', 'to-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return valid certificate with SHA-256 verification hash for ACCEPTED offer', async () => {
      mockRepo.findOfferById.mockResolvedValue({
        id: 'to-1',
        offerNumber: 'TO-2026-00042',
        status: 'ACCEPTED',
        patientProfileId: 'patient-uuid',
        doctorProfileId: 'doctor-uuid',
        facilityId: 'facility-uuid',
        clinicalIndication: 'Severe 3-vessel coronary artery disease',
        grossEstimate: '250000',
        discountAmount: '25000',
        netPayable: '225000',
        currency: 'PKR',
        financingEligible: true,
        patientRespondedAt: new Date('2026-11-08T10:00:00Z'),
        patientResponseNotes: 'Accepted with 12-month tenure plan',
        termsAndConditions: 'Standard clinical surgical package terms',
        patient: { id: 'patient-uuid', firstName: 'Ali', lastName: 'Khan' },
        doctor: { id: 'doctor-uuid', fullName: 'Dr. Tariq', primarySpecialization: 'Cardiology' },
        facility: { id: 'facility-uuid', name: 'National Institute of Cardiovascular Diseases', city: 'Karachi' },
        procedures: [
          {
            id: 'proc-1',
            procedureCode: '93458',
            procedureName: 'Left Heart Catheterization',
            category: 'SURGICAL',
            quantity: 1,
            unitCost: '225000',
            totalCost: '225000',
            sequenceOrder: 1,
          },
        ],
      });

      const cert = await service.getAcceptanceCertificate('user-1', 'to-1');
      expect(cert).toBeDefined();
      expect(cert.certificateId).toBe('CERT-TO-2026-00042');
      expect(cert.certificateStatus).toBe('VALID');
      expect(cert.verificationHash).toBeDefined();
      expect(cert.verificationHash.length).toBe(64); // SHA-256 hex length
      expect(cert.financialBreakdown.netPayable).toBe(225000);
      expect(cert.procedures.length).toBe(1);
    });
  });

  describe('Stage 9: Multidisciplinary Pre-Op Clearance', () => {
    it('should return default PENDING clearance if none recorded', async () => {
      mockRepo.findOfferById.mockResolvedValue({
        id: 'to-1',
        offerNumber: 'TO-2026-00042',
        status: 'ACCEPTED',
        history: [],
      });

      const clearance = await service.getClearance('user-1', 'to-1');
      expect(clearance).toBeDefined();
      expect(clearance.overallStatus).toBe('PENDING');
      expect(clearance.cardiologyClearance.status).toBe('PENDING');
      expect(clearance.anesthesiaClearance.status).toBe('PENDING');
    });

    it('should update clearance domain and compute CLEARED status when all domains cleared', async () => {
      mockRepo.findOfferById.mockResolvedValue({
        id: 'to-1',
        offerNumber: 'TO-2026-00042',
        status: 'ACCEPTED',
        history: [],
      });

      const updateDto = {
        cardiologyClearance: { status: 'CLEARED', notes: 'ECG and Echo normal' },
        anesthesiaClearance: { status: 'CLEARED', notes: 'Mallampati Class 1' },
        medicalClearance: { status: 'CLEARED', notes: 'Diabetic control optimal' },
        surgicalClearance: { status: 'CLEARED', notes: 'Consent and site marked' },
        labClearance: { status: 'CLEARED', notes: 'CBC, BMP, Coags normal' },
      };

      const result = await service.updateClearance('doctor-1', 'to-1', updateDto, ['DOCTOR']);
      expect(result.overallStatus).toBe('CLEARED');
      expect(result.cardiologyClearance.status).toBe('CLEARED');
      expect(result.cardiologyClearance.clearedBy).toBe('doctor-1');
      expect(mockRepo.createHistory).toHaveBeenCalledWith(
        'to-1',
        'PRE_OP_CLEARANCE_UPDATE',
        'ACCEPTED',
        'ACCEPTED',
        'doctor-1',
        'DOCTOR',
        expect.any(String),
        expect.objectContaining({ overallStatus: 'CLEARED' }),
      );
    });
  });
});

