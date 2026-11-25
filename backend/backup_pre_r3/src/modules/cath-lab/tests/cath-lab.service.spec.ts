import { Test, TestingModule } from '@nestjs/testing';
import { CathLabService } from '../cath-lab.service';
import { DatabaseService } from '@database/database.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import {
  SafetyHoldCategory,
  CoronaryVesselEnum,
  CoronaryDominanceEnum,
  TimiFlowEnum,
} from '../cath-lab.dto';

describe('CathLabService - Stages 16–18 Addendum & Forensic Verification', () => {
  let service: CathLabService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      appointment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({ id: where.id, ...data }),
        ),
      },
      medicalEncounter: {
        findUnique: jest.fn(),
      },
      medicalRecord: {
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({ id: where.id, ...data }),
        ),
      },
      medicalProcedure: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'proc-id', ...data }),
        ),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-log-id' }),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockDb)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CathLabService,
        {
          provide: DatabaseService,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<CathLabService>(CathLabService);
  });

  describe('1. Cath Lab Surgical Safety Time-Out (Stage 16)', () => {
    it('should throw NotFoundException if appointment does not exist', async () => {
      mockDb.appointment.findUnique.mockResolvedValue(null);
      await expect(
        service.submitSafetyTimeout('doctor-1', ['DOCTOR'], {
          appointmentId: 'non-existent',
          gates: {
            patientIdentityConfirmed: true,
            procedureConfirmed: true,
            accessSiteConfirmed: true,
            consentAndAnticoagulationVerified: true,
            equipmentAndEmergencyPrepared: true,
            radiationAndShieldingVerified: true,
          },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject time-out submission if any of the 6 safety gates is false', async () => {
      mockDb.appointment.findUnique.mockResolvedValue({
        id: 'apt-1',
        appointmentNumber: 'APT-001',
        patientProfileId: 'patient-1',
      });

      await expect(
        service.submitSafetyTimeout('doctor-1', ['DOCTOR'], {
          appointmentId: 'apt-1',
          gates: {
            patientIdentityConfirmed: true,
            procedureConfirmed: true,
            accessSiteConfirmed: false, // Incomplete gate!
            consentAndAnticoagulationVerified: true,
            equipmentAndEmergencyPrepared: true,
            radiationAndShieldingVerified: true,
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject time-out submission if appointment has an active safety hold', async () => {
      mockDb.appointment.findUnique.mockResolvedValue({
        id: 'apt-held',
        appointmentNumber: 'APT-009',
        patientProfileId: 'patient-1',
        notes: '--- ACTIVE_SAFETY_HOLD ---\n{"status":"ACTIVE","holdId":"hold-999","declaredAt":"2026-11-10T10:00:00Z"}',
      });

      await expect(
        service.submitSafetyTimeout('doctor-1', ['DOCTOR'], {
          appointmentId: 'apt-held',
          gates: {
            patientIdentityConfirmed: true,
            procedureConfirmed: true,
            accessSiteConfirmed: true,
            consentAndAnticoagulationVerified: true,
            equipmentAndEmergencyPrepared: true,
            radiationAndShieldingVerified: true,
          },
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should ratify time-out, compute SHA-256 integrity hash, and record audit log', async () => {
      mockDb.appointment.findUnique.mockResolvedValue({
        id: 'apt-1',
        appointmentNumber: 'APT-001',
        patientProfileId: 'patient-1',
        facilityId: 'fac-1',
        notes: null,
      });

      const result = await service.submitSafetyTimeout('doctor-1', ['DOCTOR'], {
        appointmentId: 'apt-1',
        circulatingNurseId: 'nurse-1',
        gates: {
          patientIdentityConfirmed: true,
          procedureConfirmed: true,
          accessSiteConfirmed: true,
          consentAndAnticoagulationVerified: true,
          equipmentAndEmergencyPrepared: true,
          radiationAndShieldingVerified: true,
        },
        notes: 'Right radial access prepped. Heparin 5000 IU administered.',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('RATIFIED');
      expect(result.interventionalistId).toBe('doctor-1');
      expect(result.integrityHash).toBeDefined();
      expect(result.integrityHash.length).toBe(64);
      expect(mockDb.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'apt-1' },
          data: expect.objectContaining({
            notes: expect.stringContaining('--- CATH_LAB_SAFETY_TIMEOUT ---'),
          }),
        }),
      );
      expect(mockDb.auditLog.create).toHaveBeenCalled();
    });

    it('should reject duplicate ratification unless isAmendment is true with amendmentReason', async () => {
      mockDb.appointment.findUnique.mockResolvedValue({
        id: 'apt-1',
        appointmentNumber: 'APT-001',
        patientProfileId: 'patient-1',
        notes: '--- CATH_LAB_SAFETY_TIMEOUT ---\n{"status":"RATIFIED","ratifiedAt":"2026-11-10T10:00:00Z"}',
      });

      await expect(
        service.submitSafetyTimeout('doctor-1', ['DOCTOR'], {
          appointmentId: 'apt-1',
          gates: {
            patientIdentityConfirmed: true,
            procedureConfirmed: true,
            accessSiteConfirmed: true,
            consentAndAnticoagulationVerified: true,
            equipmentAndEmergencyPrepared: true,
            radiationAndShieldingVerified: true,
          },
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('2. Emergency Safety Hold (Stage 16–17)', () => {
    it('should declare an active emergency safety hold', async () => {
      mockDb.appointment.findUnique.mockResolvedValue({
        id: 'apt-hold-1',
        appointmentNumber: 'APT-002',
        patientProfileId: 'patient-1',
        facilityId: 'fac-1',
        notes: null,
      });

      const hold = await service.declareSafetyHold('doctor-1', ['DOCTOR'], {
        appointmentId: 'apt-hold-1',
        holdCategory: SafetyHoldCategory.PATIENT_HEMODYNAMIC_INSTABILITY,
        reason: 'Sudden transient bradycardia during catheter engagement',
      });

      expect(hold).toBeDefined();
      expect(hold.status).toBe('ACTIVE');
      expect(hold.holdCategory).toBe(SafetyHoldCategory.PATIENT_HEMODYNAMIC_INSTABILITY);
      expect(hold.declaredBy).toBe('doctor-1');

      const active = await service.getActiveSafetyHold('apt-hold-1');
      expect(active.hasActiveHold).toBe(true);
      expect(active.activeHold.holdId).toBe(hold.holdId);
    });

    it('should reject declaring a duplicate active hold for the same appointment', async () => {
      mockDb.appointment.findUnique.mockResolvedValue({
        id: 'apt-hold-1',
        appointmentNumber: 'APT-002',
        patientProfileId: 'patient-1',
        notes: null,
      });

      await expect(
        service.declareSafetyHold('doctor-2', ['DOCTOR'], {
          appointmentId: 'apt-hold-1',
          holdCategory: SafetyHoldCategory.EQUIPMENT_MALFUNCTION,
          reason: 'Duplicate hold attempt',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should clear an active safety hold and calculate hold duration in seconds', async () => {
      const active = await service.getActiveSafetyHold('apt-hold-1');
      expect(active.hasActiveHold).toBe(true);

      const resolved = await service.clearSafetyHold('doctor-1', active.activeHold.holdId, {
        resolutionNotes: 'Atropine administered, rhythm returned to normal sinus. Procedure resumed.',
      });

      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolvedBy).toBe('doctor-1');
      expect(resolved.durationSeconds).toBeGreaterThanOrEqual(0);
      expect(mockDb.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('3. Fluoroscopy & Hemodynamic Telemetry (Stage 17–18)', () => {
    it('should log procedural telemetry observation with radiation and contrast metrics', async () => {
      mockDb.appointment.findUnique.mockResolvedValue({
        id: 'apt-telem-1',
        appointmentNumber: 'APT-003',
        patientProfileId: 'patient-1',
        facilityId: 'fac-1',
      });

      const point = await service.logTelemetry('doctor-1', ['DOCTOR'], {
        appointmentId: 'apt-telem-1',
        fluoroscopyDurationSeconds: 480,
        doseAreaProductDap: 32000,
        contrastVolumeMl: 80,
        contrastAgent: 'Iohexol 350',
        systolicBp: 120,
        diastolicBp: 76,
        heartRate: 72,
        oxygenSaturation: 99,
        activatedClottingTimeSeconds: 275,
      });

      expect(point).toBeDefined();
      expect(point.fluoroscopyDurationSeconds).toBe(480);
      expect(point.doseAreaProductDap).toBe(32000);
      expect(point.meanArterialPressure).toBe(91);
      expect(point.recordedBy).toBe('doctor-1');
    });

    it('should aggregate cumulative telemetry totals with accurate mGy*cm2 to Gy*cm2 conversion', async () => {
      mockDb.appointment.findUnique.mockResolvedValue({
        id: 'apt-telem-1',
        appointmentNumber: 'APT-003',
      });

      // Log a second reading
      await service.logTelemetry('doctor-1', ['DOCTOR'], {
        appointmentId: 'apt-telem-1',
        fluoroscopyDurationSeconds: 720,
        doseAreaProductDap: 18000,
        contrastVolumeMl: 40,
        systolicBp: 118,
        diastolicBp: 74,
        heartRate: 70,
        oxygenSaturation: 99,
      });

      const summary = await service.getLiveTelemetry('apt-telem-1');
      expect(summary.readingCount).toBe(2);
      expect(summary.totals.totalFluoroscopyDurationSeconds).toBe(720);
      expect(summary.totals.totalDoseAreaProductDap_mGy_cm2).toBe(50000);
      expect(summary.totals.totalDoseAreaProductDap_Gy_cm2).toBe(5.0); // 50000 / 10000 = 5.0 Gy*cm2
      expect(summary.totals.totalContrastVolumeMl).toBe(120); // 80 + 40
      expect(summary.dataSource).toBe('MANUAL_LOG_FEED');
    });

    it('should reliably restore telemetry from database notes after in-memory store restart', async () => {
      // Simulate server restart by clearing in-memory store
      (CathLabService as any).telemetryStore.clear();

      mockDb.appointment.findUnique.mockResolvedValue({
        id: 'apt-restart-1',
        appointmentNumber: 'APT-004',
        notes: `--- CATH_LAB_TELEMETRY ---\n[{"fluoroscopyDurationSeconds":300,"doseAreaProductDap":15000,"contrastVolumeMl":50}]`,
      });

      const summary = await service.getLiveTelemetry('apt-restart-1');
      expect(summary.readingCount).toBe(1);
      expect(summary.totals.totalFluoroscopyDurationSeconds).toBe(300);
      expect(summary.totals.totalDoseAreaProductDap_mGy_cm2).toBe(15000);
      expect(summary.totals.totalDoseAreaProductDap_Gy_cm2).toBe(1.5);
      expect(summary.totals.totalContrastVolumeMl).toBe(50);
    });

    it('should handle machine counter resets by aggregating discrete procedural run segments', async () => {
      (CathLabService as any).telemetryStore.clear();
      mockDb.appointment.findUnique.mockResolvedValue({
        id: 'apt-reset-1',
        appointmentNumber: 'APT-RESET',
      });

      // Reading 1: 300s fluoro before machine reset
      await service.logTelemetry('doctor-1', ['DOCTOR'], {
        appointmentId: 'apt-reset-1',
        fluoroscopyDurationSeconds: 300,
        doseAreaProductDap: 10000,
        contrastVolumeMl: 30,
        systolicBp: 120,
        diastolicBp: 80,
        heartRate: 75,
        oxygenSaturation: 98,
      });

      // Reading 2: Timer reset back to 120s
      await service.logTelemetry('doctor-1', ['DOCTOR'], {
        appointmentId: 'apt-reset-1',
        fluoroscopyDurationSeconds: 120,
        doseAreaProductDap: 5000,
        contrastVolumeMl: 20,
        systolicBp: 122,
        diastolicBp: 78,
        heartRate: 74,
        oxygenSaturation: 99,
      });

      const summary = await service.getLiveTelemetry('apt-reset-1');
      expect(summary.totals.aggregationMode).toBe('INCREMENTAL_EVENT_SUM');
      expect(summary.totals.totalFluoroscopyDurationSeconds).toBe(420); // 300 + 120
      expect(summary.totals.totalDoseAreaProductDap_mGy_cm2).toBe(15000);
      expect(summary.totals.totalDoseAreaProductDap_Gy_cm2).toBe(1.5);
      expect(summary.totals.totalContrastVolumeMl).toBe(50);
    });

    it('should prevent double-counting on repeated cumulative snapshots', async () => {
      (CathLabService as any).telemetryStore.clear();
      mockDb.appointment.findUnique.mockResolvedValue({
        id: 'apt-repeat-1',
        appointmentNumber: 'APT-REPEAT',
      });

      // Three consecutive cumulative snapshots with identical cumulative totals
      for (let i = 0; i < 3; i++) {
        await service.logTelemetry('doctor-1', ['DOCTOR'], {
          appointmentId: 'apt-repeat-1',
          readingType: 'CUMULATIVE_SNAPSHOT',
          fluoroscopyDurationSeconds: 600,
          doseAreaProductDap: 45000,
          contrastVolumeMl: 0,
          systolicBp: 125,
          diastolicBp: 80,
          heartRate: 70,
          oxygenSaturation: 99,
        });
      }

      const summary = await service.getLiveTelemetry('apt-repeat-1');
      expect(summary.totals.aggregationMode).toBe('CUMULATIVE_SNAPSHOT_MAX');
      expect(summary.totals.totalFluoroscopyDurationSeconds).toBe(600); // Does NOT triple to 1800!
      expect(summary.totals.totalDoseAreaProductDap_mGy_cm2).toBe(45000); // Does NOT triple to 135000!
      expect(summary.totals.totalDoseAreaProductDap_Gy_cm2).toBe(4.5);
    });
  });

  describe('4. Coronary Vessel Findings / QCA (Stage 18) & Procedure Coding', () => {
    it('should map BALLOON_ANGIOPLASTY to CPT 92920 and NOT assign CPT 92928', async () => {
      mockDb.medicalEncounter.findUnique.mockResolvedValue({
        id: 'enc-ptca-1',
        medicalRecordId: 'med-rec-ptca',
      });
      mockDb.medicalRecord.findUnique.mockResolvedValue({
        id: 'med-rec-ptca',
        clinicalNotes: null,
      });

      const findings = await service.createVesselFindings('doctor-1', 'enc-ptca-1', {
        coronaryDominance: CoronaryDominanceEnum.RIGHT,
        findings: [
          {
            vessel: CoronaryVesselEnum.RCA,
            segment: 'MID',
            stenosisPercentage: 75,
            timiFlowPre: TimiFlowEnum.TIMI_1,
            timiFlowPost: TimiFlowEnum.TIMI_3,
            interventionPerformed: true,
            procedureType: 'BALLOON_ANGIOPLASTY', // Balloon angioplasty without stent
          },
        ],
      });

      expect(findings).toBeDefined();
      expect(mockDb.medicalProcedure.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: expect.stringContaining('PTCA'),
            code: '92920', // Verified CPT 92920, NOT 92928!
          }),
        }),
      );
    });

    it('should map STENT_PLACEMENT to CPT 92928 with implant details', async () => {
      mockDb.medicalEncounter.findUnique.mockResolvedValue({
        id: 'enc-stent-1',
        medicalRecordId: 'med-rec-stent',
      });
      mockDb.medicalRecord.findUnique.mockResolvedValue({
        id: 'med-rec-stent',
        clinicalNotes: null,
      });

      await service.createVesselFindings('doctor-1', 'enc-stent-1', {
        coronaryDominance: CoronaryDominanceEnum.LEFT,
        findings: [
          {
            vessel: CoronaryVesselEnum.LAD,
            segment: 'PROXIMAL',
            stenosisPercentage: 95,
            timiFlowPre: TimiFlowEnum.TIMI_0,
            timiFlowPost: TimiFlowEnum.TIMI_3,
            interventionPerformed: true,
            procedureType: 'STENT_PLACEMENT',
            stentDetails: 'Onyx 3.5 x 18 mm DES deployed at 16 atm',
          },
        ],
      });

      expect(mockDb.medicalProcedure.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: '92928',
            notes: expect.stringContaining('Onyx 3.5 x 18 mm'),
          }),
        }),
      );
    });

    it('should map DIAGNOSTIC_ANGIOGRAPHY to CPT 93454 without therapeutic intervention', async () => {
      mockDb.medicalEncounter.findUnique.mockResolvedValue({
        id: 'enc-diag-1',
        medicalRecordId: 'med-rec-diag',
      });
      mockDb.medicalRecord.findUnique.mockResolvedValue({
        id: 'med-rec-diag',
        clinicalNotes: null,
      });

      await service.createVesselFindings('doctor-1', 'enc-diag-1', {
        coronaryDominance: CoronaryDominanceEnum.CO_DOMINANT,
        findings: [
          {
            vessel: CoronaryVesselEnum.LCX,
            segment: 'MID',
            stenosisPercentage: 30,
            timiFlowPre: TimiFlowEnum.TIMI_3,
            interventionPerformed: false,
            procedureType: 'DIAGNOSTIC_ANGIOGRAPHY',
            isDiagnosticOnly: true,
          },
        ],
      });

      expect(mockDb.medicalProcedure.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: '93454',
          }),
        }),
      );
    });

    it('should mark unspecified intervention as PENDING_CLINICAL_CODING without guessing 92928', async () => {
      mockDb.medicalEncounter.findUnique.mockResolvedValue({
        id: 'enc-unspec-1',
        medicalRecordId: 'med-rec-unspec',
      });
      mockDb.medicalRecord.findUnique.mockResolvedValue({
        id: 'med-rec-unspec',
        clinicalNotes: null,
      });

      await service.createVesselFindings('doctor-1', 'enc-unspec-1', {
        coronaryDominance: CoronaryDominanceEnum.RIGHT,
        findings: [
          {
            vessel: CoronaryVesselEnum.LAD,
            segment: 'DISTAL',
            stenosisPercentage: 70,
            timiFlowPre: TimiFlowEnum.TIMI_2,
            interventionPerformed: true, // No procedureType, no stentDetails, no cptCode
          },
        ],
      });

      expect(mockDb.medicalProcedure.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'PENDING_CLINICAL_CODING',
          }),
        }),
      );
    });

    it('should reject client submission of unsupported or invalid coronary CPT code', async () => {
      mockDb.medicalEncounter.findUnique.mockResolvedValue({
        id: 'enc-bad-cpt',
        medicalRecordId: 'med-rec-bad',
      });
      mockDb.medicalRecord.findUnique.mockResolvedValue({
        id: 'med-rec-bad',
        clinicalNotes: null,
      });

      await expect(
        service.createVesselFindings('doctor-1', 'enc-bad-cpt', {
          coronaryDominance: CoronaryDominanceEnum.RIGHT,
          findings: [
            {
              vessel: CoronaryVesselEnum.LAD,
              segment: 'MID',
              stenosisPercentage: 80,
              timiFlowPre: TimiFlowEnum.TIMI_1,
              interventionPerformed: true,
              cptCode: 'INVALID_OR_DENTAL_CODE', // Unsupported/unapproved code
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent creating duplicate procedure if same procedure already exists for record', async () => {
      mockDb.medicalEncounter.findUnique.mockResolvedValue({
        id: 'enc-dup-1',
        medicalRecordId: 'med-rec-dup',
      });
      mockDb.medicalRecord.findUnique.mockResolvedValue({
        id: 'med-rec-dup',
        clinicalNotes: null,
      });

      // Simulate procedure already existing
      mockDb.medicalProcedure.findFirst.mockResolvedValue({
        id: 'proc-existing',
        code: '92928',
      });

      await service.createVesselFindings('doctor-1', 'enc-dup-1', {
        coronaryDominance: CoronaryDominanceEnum.RIGHT,
        findings: [
          {
            vessel: CoronaryVesselEnum.LAD,
            segment: 'MID',
            stenosisPercentage: 90,
            timiFlowPre: TimiFlowEnum.TIMI_1,
            interventionPerformed: true,
            procedureType: 'STENT_PLACEMENT',
          },
        ],
      });

      // Should NOT create duplicate procedure
      expect(mockDb.medicalProcedure.create).not.toHaveBeenCalled();
    });

    it('should restore vessel findings from medicalRecord.clinicalNotes after in-memory store restart', async () => {
      (CathLabService as any).vesselFindingsStore.clear();

      mockDb.medicalEncounter.findUnique.mockResolvedValue({
        id: 'enc-restart-1',
        medicalRecord: {
          id: 'med-rec-restart',
          clinicalNotes: `--- CATH_LAB_VESSEL_FINDINGS ---\n{"findingsId":"f-123","encounterId":"enc-restart-1","coronaryDominance":"RIGHT","findings":[]}`,
        },
      });

      const retrieved = await service.getVesselFindings('enc-restart-1');
      expect(retrieved).toBeDefined();
      expect(retrieved.findingsId).toBe('f-123');
      expect(retrieved.coronaryDominance).toBe('RIGHT');
    });
  });

  describe('5. DICOM / PACS (Stage 18)', () => {
    it('should register DICOM series metadata and persist to medical record', async () => {
      mockDb.medicalEncounter.findUnique.mockResolvedValue({
        id: 'enc-dicom-1',
        medicalRecordId: 'med-rec-dicom',
      });
      mockDb.medicalRecord.findUnique.mockResolvedValue({
        id: 'med-rec-dicom',
        clinicalNotes: null,
      });

      const series = await service.registerDicomSeries('doctor-1', 'enc-dicom-1', {
        studyInstanceUid: '1.2.840.10008.5.1.4.1.1.12.1.20261110.001',
        seriesInstanceUid: '1.2.840.10008.5.1.4.1.1.12.1.20261110.001.01',
        modality: 'XA',
        seriesDescription: 'LAD Cranial Run 01',
        numberOfFrames: 64,
        keyFrameNumbers: [16, 32, 48],
        storageKey: 'dicom/patients/p-1/enc-dicom-1/series-01.dcm',
      });

      expect(series).toBeDefined();
      expect(series.seriesDescription).toBe('LAD Cranial Run 01');
      expect(series.storageKey).toBe('dicom/patients/p-1/enc-dicom-1/series-01.dcm');
      expect(mockDb.medicalRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clinicalNotes: expect.stringContaining('--- CATH_LAB_DICOM_SERIES ---'),
          }),
        }),
      );
    });

    it('should reject keyframe numbers that exceed total number of frames', async () => {
      mockDb.medicalEncounter.findUnique.mockResolvedValue({ id: 'enc-dicom-1' });
      mockDb.medicalRecord.findUnique.mockResolvedValue({ id: 'med-rec-1' });

      await expect(
        service.registerDicomSeries('doctor-1', 'enc-dicom-1', {
          studyInstanceUid: '1.2.840.001',
          seriesInstanceUid: '1.2.840.002',
          seriesDescription: 'Invalid Keyframe Run',
          numberOfFrames: 30,
          keyFrameNumbers: [10, 45], // 45 exceeds 30!
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate seriesInstanceUid for the same encounter', async () => {
      mockDb.medicalEncounter.findUnique.mockResolvedValue({ id: 'enc-dicom-1' });
      mockDb.medicalRecord.findUnique.mockResolvedValue({ id: 'med-rec-1' });

      await expect(
        service.registerDicomSeries('doctor-1', 'enc-dicom-1', {
          studyInstanceUid: '1.2.840.10008.5.1.4.1.1.12.1.20261110.001',
          seriesInstanceUid: '1.2.840.10008.5.1.4.1.1.12.1.20261110.001.01', // Already registered in previous test!
          seriesDescription: 'Duplicate Series Run',
          numberOfFrames: 64,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should return BLOCKED_BY_EXTERNAL_DEPENDENCY for frame streaming when PACS node is unconfigured', async () => {
      delete process.env.PACS_URL;
      delete process.env.DICOMWEB_URL;

      const frameResult = await service.getDicomFrame('series-uuid-1', 12);
      expect(frameResult.status).toBe('BLOCKED_BY_EXTERNAL_DEPENDENCY');
      expect(frameResult.message).toContain('Direct PACS/DICOMweb frame streaming requires an active PACS archive');
      expect(frameResult.seriesId).toBe('series-uuid-1');
      expect(frameResult.frameNumber).toBe(12);
    });
  });
});
