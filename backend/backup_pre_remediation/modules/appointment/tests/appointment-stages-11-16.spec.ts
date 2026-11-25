import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentService } from '../application/use-cases/appointment.service';
import { AppointmentStatus } from '../domain/entities/appointment.entity';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

describe('AppointmentService - Stages 11, 14, 15, 16', () => {
  let service: AppointmentService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      findById: jest.fn(),
      findSlotById: jest.fn(),
      updateSlotStatus: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data })),
      generateNextAppointmentNumber: jest.fn().mockResolvedValue('APT-20261110-XYZ123'),
      findPatientProfileByUserId: jest.fn(),
      findDoctorProfileByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentService,
        {
          provide: 'IAppointmentRepository',
          useValue: mockRepo,
        },
        {
          provide: Logger,
          useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AppointmentService>(AppointmentService);
  });

  describe('Stage 11: Procedure Suite Temporary Slot Hold', () => {
    it('should throw NotFoundException if slot does not exist', async () => {
      mockRepo.findSlotById.mockResolvedValue(null);
      await expect(
        service.holdSlot('user-1', ['DOCTOR'], { facilityId: 'fac-1', slotId: 'slot-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if slot is already booked', async () => {
      mockRepo.findSlotById.mockResolvedValue({ id: 'slot-1', status: 'BOOKED' });
      await expect(
        service.holdSlot('user-1', ['DOCTOR'], { facilityId: 'fac-1', slotId: 'slot-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully place a hold and return remaining seconds', async () => {
      mockRepo.findSlotById.mockResolvedValue({ id: 'slot-1', status: 'AVAILABLE' });
      const hold = await service.holdSlot('user-1', ['DOCTOR'], {
        facilityId: 'fac-1',
        slotId: 'slot-1',
        procedureCategory: 'CATH_LAB',
        holdDurationMinutes: 45,
      });

      expect(hold).toBeDefined();
      expect(hold.status).toBe('HELD');
      expect(hold.procedureCategory).toBe('CATH_LAB');
      expect(hold.remainingSeconds).toBe(45 * 60);

      // Verify getHold works
      const retrieved = await service.getHold(hold.holdId);
      expect(retrieved.holdId).toBe(hold.holdId);
      expect(retrieved.status).toBe('HELD');

      // Verify release works
      const released = await service.releaseHold('user-1', hold.holdId);
      expect(released.status).toBe('RELEASED');
    });
  });

  describe('Stage 14: Pre-Op Day -1 Readiness Checklist & Decision', () => {
    it('should return default readiness if none recorded', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'apt-1',
        appointmentNumber: 'APT-20261110-001',
        notes: null,
      });

      const readiness = await service.getReadiness('apt-1');
      expect(readiness.appointmentId).toBe('apt-1');
      expect(readiness.decision).toBe('PENDING');
      expect(readiness.fastingConfirmed).toBe(false);
    });

    it('should update readiness checklist and record clinical decision', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'apt-1',
        appointmentNumber: 'APT-20261110-001',
        notes: 'Pre-existing clinical notes',
      });

      const updated = await service.updateReadiness('doctor-1', 'apt-1', {
        fastingConfirmed: true,
        medicationHoldConfirmed: true,
        transportationArranged: true,
        consentVerified: true,
        vitalsWithinThreshold: true,
        decision: 'GO',
        notes: 'Patient ready for PCI at 08:00',
      });

      expect(updated.decision).toBe('GO');
      expect(updated.fastingConfirmed).toBe(true);
      expect(updated.decidedBy).toBe('doctor-1');
      expect(mockRepo.update).toHaveBeenCalledWith('apt-1', {
        notes: expect.stringContaining('--- READINESS ---'),
      });
    });
  });

  describe('Stage 15: Day of Procedure Patient Check-In', () => {
    it('should throw BadRequestException if appointment is cancelled', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'apt-1',
        status: AppointmentStatus.CANCELLED,
      });

      await expect(
        service.checkIn('staff-1', 'apt-1', { bedOrBayNumber: 'BAY-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should transition appointment status to IN_PROGRESS upon check-in', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'apt-1',
        appointmentNumber: 'APT-20261110-001',
        facilityId: 'fac-1',
        status: AppointmentStatus.CONFIRMED,
      });

      const result = await service.checkIn('staff-1', 'apt-1', {
        bedOrBayNumber: 'PRE-OP-BAY-3',
        vitals: { bloodPressure: '125/80', heartRate: 72, oxygenSaturation: 99 },
      });

      expect(result.status).toBe(AppointmentStatus.IN_PROGRESS);
      expect(result.bedOrBayNumber).toBe('PRE-OP-BAY-3');
      expect(result.checkedInBy).toBe('staff-1');
      expect(mockRepo.update).toHaveBeenCalledWith('apt-1', {
        status: AppointmentStatus.IN_PROGRESS,
      });
    });

    it('should reject check-in if appointment has an active emergency safety hold', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'apt-held-checkin',
        status: AppointmentStatus.CONFIRMED,
        notes: `--- ACTIVE_SAFETY_HOLD ---\n{"status":"ACTIVE","holdId":"hold-chk-1"}`,
      });

      await expect(
        service.checkIn('staff-1', 'apt-held-checkin', { bedOrBayNumber: 'BAY-1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Stage 16: Cath Lab WHO Surgical Safety Checklist', () => {
    it('should return default safety checklist', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'apt-1',
        appointmentNumber: 'APT-20261110-001',
        notes: null,
      });

      const checklist = await service.getCathLabChecklist('apt-1');
      expect(checklist.overallStatus).toBe('INCOMPLETE');
      expect(checklist.signIn.patientIdentityConfirmed).toBe(false);
      expect(checklist.timeOut.allTeamMembersIntroduced).toBe(false);
      expect(checklist.signOut.specimenLabeled).toBe(false);
    });

    it('should complete checklist when all sign-in, timeout, sign-out verified', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'apt-1',
        appointmentNumber: 'APT-20261110-001',
        notes: null,
      });

      const result = await service.updateCathLabChecklist('doctor-1', 'apt-1', {
        signIn: {
          patientIdentityConfirmed: true,
          siteMarked: true,
          anesthesiaSafetyCheckCompleted: true,
          pulseOximeterOn: true,
          allergiesChecked: true,
        },
        timeOut: {
          allTeamMembersIntroduced: true,
          patientNameProcedureSiteConfirmed: true,
          anticipatedCriticalEventsReviewed: true,
          antibioticProphylaxisAdministered: true,
          imagingDisplayed: true,
        },
        signOut: {
          procedureNameRecorded: true,
          instrumentSpongeNeedleCountsCorrect: true,
          specimenLabeled: true,
          equipmentProblemsAddressed: true,
          keyPostOpConcernsReviewed: true,
        },
      });

      expect(result.overallStatus).toBe('COMPLETED');
      expect(result.lastUpdatedBy).toBe('doctor-1');
      expect(mockRepo.update).toHaveBeenCalledWith('apt-1', {
        notes: expect.stringContaining('--- CATH_LAB_CHECKLIST ---'),
      });
    });

    it('should preserve existing sections when updating Cath Lab WHO checklist', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'apt-preserve',
        appointmentNumber: 'APT-PRESERVE-01',
        notes: `--- CATH_LAB_SAFETY_TIMEOUT ---\n{"status":"RATIFIED"}\n\n--- ACTIVE_SAFETY_HOLD ---\n{"status":"RESOLVED"}`,
      });

      await service.updateCathLabChecklist('doctor-1', 'apt-preserve', {
        signIn: {
          patientIdentityConfirmed: true,
          siteMarked: true,
          anesthesiaSafetyCheckCompleted: true,
          pulseOximeterOn: true,
          allergiesChecked: true,
        },
      });

      expect(mockRepo.update).toHaveBeenCalledWith('apt-preserve', {
        notes: expect.stringMatching(/--- CATH_LAB_SAFETY_TIMEOUT ---[\s\S]*--- CATH_LAB_CHECKLIST ---/),
      });
    });

    it('should block status advancement to IN_PROGRESS when active safety hold is present', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'apt-hold',
        status: AppointmentStatus.SCHEDULED,
        notes: `--- ACTIVE_SAFETY_HOLD ---\n{"status":"ACTIVE","holdId":"hold-123"}`,
      });

      await expect(
        service.updateAppointmentStatus('admin-1', ['ADMIN'], 'apt-hold', {
          status: AppointmentStatus.IN_PROGRESS,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});

