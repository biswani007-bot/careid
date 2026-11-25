import { Test, TestingModule } from '@nestjs/testing';
import { MedicalRecordService } from '../application/use-cases/medical-record.service';
import { NotFoundException } from '@nestjs/common';
import { QrService } from '@modules/qr/application/use-cases/qr.service';

describe('MedicalRecordService - Stages 17 & 18 (Encounters)', () => {
  let service: MedicalRecordService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      findEncounterById: jest.fn(),
      findRecordById: jest.fn(),
      addProcedureToRecord: jest.fn().mockImplementation((recId, data) =>
        Promise.resolve({ id: 'proc-uuid-1', medicalRecordId: recId, ...data }),
      ),
      addVitalSignsToRecord: jest.fn().mockImplementation((recId, data) =>
        Promise.resolve({ id: 'vital-uuid-1', medicalRecordId: recId, ...data }),
      ),
      createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-uuid-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalRecordService,
        {
          provide: 'IMedicalRecordRepository',
          useValue: mockRepo,
        },
        {
          provide: QrService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<MedicalRecordService>(MedicalRecordService);
  });

  describe('Stage 17: Intra-Op Procedures', () => {
    it('should throw NotFoundException if neither encounter nor medical record exists', async () => {
      mockRepo.findEncounterById.mockResolvedValue(null);
      mockRepo.findRecordById.mockResolvedValue(null);

      await expect(
        service.addEncounterProcedure('doctor-1', 'non-existent', {
          name: 'Stent placement',
          code: '92928',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should document procedure linked to encounter', async () => {
      mockRepo.findEncounterById.mockResolvedValue({
        id: 'enc-1',
        medicalRecordId: 'med-rec-1',
      });

      const result = await service.addEncounterProcedure('doctor-1', 'enc-1', {
        name: 'Percutaneous coronary intervention of LAD',
        code: '92928',
        notes: 'Drug-eluting stent (3.0 x 18mm) successfully placed with 0% residual stenosis',
      });

      expect(result).toBeDefined();
      expect(result.medicalRecordId).toBe('med-rec-1');
      expect(result.code).toBe('92928');
      expect(mockRepo.addProcedureToRecord).toHaveBeenCalledWith('med-rec-1', expect.any(Object));
      expect(mockRepo.createAuditLog).toHaveBeenCalled();
    });
  });

  describe('Stage 18: Intra-Op Hemodynamics', () => {
    it('should record intra-operative hemodynamic observations', async () => {
      mockRepo.findEncounterById.mockResolvedValue({
        id: 'enc-1',
        medicalRecordId: 'med-rec-1',
      });

      const result = await service.addEncounterHemodynamics('doctor-1', 'enc-1', {
        systolicBp: 118,
        diastolicBp: 74,
        pulseBpm: 68,
        respirationRate: 14,
        oxygenSaturation: 99,
        temperatureC: 36.8,
      });

      expect(result).toBeDefined();
      expect(result.medicalRecordId).toBe('med-rec-1');
      expect(result.systolicBp).toBe(118);
      expect(result.diastolicBp).toBe(74);
      expect(result.pulseBpm).toBe(68);
      expect(mockRepo.addVitalSignsToRecord).toHaveBeenCalledWith('med-rec-1', expect.any(Object));
      expect(mockRepo.createAuditLog).toHaveBeenCalled();
    });
  });
});

