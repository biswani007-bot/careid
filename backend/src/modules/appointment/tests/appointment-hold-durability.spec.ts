import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentService } from '../application/use-cases/appointment.service';
import { AppointmentStatus } from '../domain/entities/appointment.entity';
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

describe('AppointmentHoldDurability & Security Tests', () => {
  let service: AppointmentService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      findById: jest.fn(),
      findSlotById: jest.fn(),
      findSlotByHoldId: jest.fn(),
      holdSlotAtomic: jest.fn().mockResolvedValue(true),
      convertHoldToBookedAtomic: jest.fn().mockResolvedValue(true),
      releaseHoldAtomic: jest.fn().mockResolvedValue(true),
      updateSlotStatus: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data })),
      generateNextAppointmentNumber: jest.fn().mockResolvedValue('APT-20261118-TEST01'),
      findPatientProfileByUserId: jest.fn(),
      findDoctorProfileByUserId: jest.fn(),
      findPatientProfileById: jest.fn(),
      findDoctorProfileById: jest.fn(),
      findFacilityById: jest.fn(),
      checkDoctorConflict: jest.fn().mockResolvedValue(false),
      checkPatientConflict: jest.fn().mockResolvedValue(false),
      reserveSlotAtomic: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'new-apt-uuid', ...data })),
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

  describe('Hold Durability & Crash Recovery', () => {
    it('should serialize full hold JSON to slot.statusReason upon creation', async () => {
      mockRepo.findSlotById.mockResolvedValue({ id: 'slot-101', status: 'AVAILABLE' });

      const hold = await service.holdSlot('user-alice', ['PATIENT'], {
        facilityId: 'fac-1',
        slotId: 'slot-101',
        procedureCategory: 'PROCEDURE_SUITE',
        holdDurationMinutes: 30,
      });

      expect(hold).toBeDefined();
      expect(hold.status).toBe('HELD');
      expect(mockRepo.holdSlotAtomic).toHaveBeenCalledWith(
        'slot-101',
        expect.stringContaining(`HELD_JSON:{"holdId":"${hold.holdId}"`),
      );
    });

    it('should restore hold from DB statusReason if in-memory cache is wiped (simulated process restart)', async () => {
      const holdId = 'persisted-hold-uuid-1';
      const slotId = 'slot-persisted-1';
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const persistedHold = {
        holdId,
        slotId,
        facilityId: 'fac-1',
        procedureCategory: 'CATH_LAB',
        status: 'HELD',
        heldAt: new Date().toISOString(),
        expiresAt,
        heldBy: 'user-alice',
      };

      // Ensure in-memory cache does not have it
      (AppointmentService as any).activeHolds.delete(holdId);

      // DB returns the slot with the serialized hold in statusReason
      mockRepo.findSlotByHoldId.mockResolvedValue({
        id: slotId,
        status: 'BLOCKED',
        statusReason: `HELD_JSON:${JSON.stringify(persistedHold)}`,
      });

      const retrieved = await service.getHold(holdId);
      expect(retrieved).toBeDefined();
      expect(retrieved.holdId).toBe(holdId);
      expect(retrieved.status).toBe('HELD');
      expect(retrieved.remainingSeconds).toBeGreaterThan(0);
      expect(retrieved.isExpired).toBe(false);
    });

    it('should automatically mark expired hold as EXPIRED and release slot back to AVAILABLE', async () => {
      const holdId = 'expired-hold-uuid';
      const slotId = 'slot-expired-1';
      const pastTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const expiredHold = {
        holdId,
        slotId,
        facilityId: 'fac-1',
        procedureCategory: 'CATH_LAB',
        status: 'HELD',
        heldAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        expiresAt: pastTime,
        heldBy: 'user-alice',
      };

      (AppointmentService as any).activeHolds.delete(holdId);

      mockRepo.findSlotByHoldId.mockResolvedValue({
        id: slotId,
        status: 'BLOCKED',
        statusReason: `HELD_JSON:${JSON.stringify(expiredHold)}`,
      });

      const result = await service.getHold(holdId);
      expect(result.status).toBe('EXPIRED');
      expect(result.isExpired).toBe(true);
      expect(result.remainingSeconds).toBe(0);
      expect(mockRepo.updateSlotStatus).toHaveBeenCalledWith(slotId, 'AVAILABLE', null);
    });

    it('should allow hold release by creator and reject release by an unauthorized user', async () => {
      const holdId = 'release-test-hold';
      const slotId = 'slot-release-1';
      const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
      const holdData = {
        holdId,
        slotId,
        facilityId: 'fac-1',
        procedureCategory: 'CATH_LAB',
        status: 'HELD',
        heldAt: new Date().toISOString(),
        expiresAt,
        heldBy: 'user-alice',
      };

      (AppointmentService as any).activeHolds.set(holdId, holdData);

      // Attempt release by another user (not staff, not admin) -> Forbidden
      await expect(
        service.releaseHold('user-bob', holdId, ['PATIENT']),
      ).rejects.toThrow(ForbiddenException);

      // Attempt release by creator -> Success
      const released = await service.releaseHold('user-alice', holdId, ['PATIENT']);
      expect(released.status).toBe('RELEASED');
      expect(mockRepo.releaseHoldAtomic).toHaveBeenCalledWith(slotId, holdId);
    });

    it('should allow staff or admin to release any hold', async () => {
      const holdId = 'staff-release-hold';
      const slotId = 'slot-release-2';
      const holdData = {
        holdId,
        slotId,
        facilityId: 'fac-1',
        procedureCategory: 'CATH_LAB',
        status: 'HELD',
        heldAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        heldBy: 'user-alice',
      };

      (AppointmentService as any).activeHolds.set(holdId, holdData);

      const releasedByStaff = await service.releaseHold('staff-user', holdId, ['STAFF']);
      expect(releasedByStaff.status).toBe('RELEASED');
    });
  });

  describe('Hold to Booking Conversion & Authorization', () => {
    it('should allow booking conversion by hold creator and clear statusReason on booking', async () => {
      const holdId = 'booking-hold-uuid';
      const slotId = 'slot-booking-1';
      const holdData = {
        holdId,
        slotId,
        facilityId: 'fac-1',
        procedureCategory: 'CATH_LAB',
        status: 'HELD',
        heldAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        heldBy: 'patient-user-1',
      };

      (AppointmentService as any).activeHolds.set(holdId, holdData);

      mockRepo.findPatientProfileByUserId.mockResolvedValue({ id: 'pat-prof-1' });
      mockRepo.findPatientProfileById.mockResolvedValue({ id: 'pat-prof-1' });
      mockRepo.findDoctorProfileById.mockResolvedValue({ id: 'doc-prof-1' });
      mockRepo.findSlotById.mockResolvedValue({
        id: slotId,
        status: 'BLOCKED',
        slotDate: new Date('2026-11-20'),
        startTime: '10:00',
        endTime: '10:30',
      });

      const appointment = await service.bookAppointment('patient-user-1', ['PATIENT'], {
        doctorProfileId: 'doc-prof-1',
        patientProfileId: 'pat-prof-1',
        slotId,
        holdId,
        appointmentDate: '2026-11-20',
        startTime: '10:00',
      });

      expect(appointment).toBeDefined();
      expect(mockRepo.convertHoldToBookedAtomic).toHaveBeenCalledWith(slotId, holdId);
      expect((AppointmentService as any).activeHolds.has(holdId)).toBe(false);
    });

    it('should reject booking conversion if an unauthorized user attempts to use another user hold', async () => {
      const holdId = 'hijack-hold-uuid';
      const slotId = 'slot-hijack-1';
      const holdData = {
        holdId,
        slotId,
        facilityId: 'fac-1',
        procedureCategory: 'CATH_LAB',
        status: 'HELD',
        heldAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        heldBy: 'patient-user-1',
      };

      (AppointmentService as any).activeHolds.set(holdId, holdData);

      mockRepo.findPatientProfileByUserId.mockResolvedValue({ id: 'pat-prof-2' });
      mockRepo.findPatientProfileById.mockResolvedValue({ id: 'pat-prof-2' });
      mockRepo.findDoctorProfileById.mockResolvedValue({ id: 'doc-prof-1' });

      await expect(
        service.bookAppointment('attacker-user-2', ['PATIENT'], {
          doctorProfileId: 'doc-prof-1',
          patientProfileId: 'pat-prof-2',
          slotId,
          holdId,
          appointmentDate: '2026-11-20',
          startTime: '10:00',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Check-In Vitals Validation & Access Scoping', () => {
    it('should reject check-in if heart rate is out of reasonable range', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'apt-vitals-1',
        appointmentNumber: 'APT-1',
        status: AppointmentStatus.SCHEDULED,
        notes: null,
      });

      await expect(
        service.checkIn('staff-1', 'apt-vitals-1', {
          vitals: { heartRate: 999 },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject check-in if oxygen saturation is below physiological minimum', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'apt-vitals-2',
        appointmentNumber: 'APT-2',
        status: AppointmentStatus.SCHEDULED,
        notes: null,
      });

      await expect(
        service.checkIn('staff-1', 'apt-vitals-2', {
          vitals: { oxygenSaturation: 20 },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid physiological vitals on check-in', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'apt-vitals-3',
        appointmentNumber: 'APT-3',
        status: AppointmentStatus.SCHEDULED,
        notes: null,
      });

      const result = await service.checkIn('staff-1', 'apt-vitals-3', {
        vitals: {
          heartRate: 72,
          oxygenSaturation: 98,
          temperature: 36.8,
        },
      });

      expect(result).toBeDefined();
      expect(result.vitals.heartRate).toBe(72);
      expect(result.status).toBe(AppointmentStatus.IN_PROGRESS);
    });

    it('should allow patient to view only their own check-in record and reject other patients', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'apt-privacy-1',
        appointmentNumber: 'APT-P1',
        patientProfileId: 'pat-owner-id',
        doctorProfileId: 'doc-assigned-id',
        notes: `--- CHECK_IN ---\n{"appointmentId":"apt-privacy-1","vitals":{"heartRate":70}}`,
      });

      mockRepo.findPatientProfileByUserId.mockImplementation((userId: string) => {
        if (userId === 'user-owner') return Promise.resolve({ id: 'pat-owner-id' });
        if (userId === 'user-intruder') return Promise.resolve({ id: 'pat-intruder-id' });
        return Promise.resolve(null);
      });

      // Authorized owner patient -> Success
      const record = await service.getCheckInRecord('user-owner', ['PATIENT'], 'apt-privacy-1');
      expect(record).toBeDefined();
      expect(record.appointmentId).toBe('apt-privacy-1');

      // Unauthorized intruder patient -> Forbidden
      await expect(
        service.getCheckInRecord('user-intruder', ['PATIENT'], 'apt-privacy-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow assigned doctor to view check-in and reject unassigned doctor', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'apt-privacy-2',
        appointmentNumber: 'APT-D1',
        patientProfileId: 'pat-owner-id',
        doctorProfileId: 'doc-assigned-id',
        notes: `--- CHECK_IN ---\n{"appointmentId":"apt-privacy-2","vitals":{"heartRate":75}}`,
      });

      mockRepo.findDoctorProfileByUserId.mockImplementation((userId: string) => {
        if (userId === 'doc-assigned') return Promise.resolve({ id: 'doc-assigned-id' });
        if (userId === 'doc-stranger') return Promise.resolve({ id: 'doc-stranger-id' });
        return Promise.resolve(null);
      });

      // Assigned doctor -> Success
      const record = await service.getCheckInRecord('doc-assigned', ['DOCTOR'], 'apt-privacy-2');
      expect(record).toBeDefined();

      // Unassigned doctor -> Forbidden
      await expect(
        service.getCheckInRecord('doc-stranger', ['DOCTOR'], 'apt-privacy-2'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('High-Concurrency Contention & Resilient Parsing', () => {
    it('should allow exactly 1 winner and 19 ConflictExceptions when 20 concurrent sessions contest the same slot hold', async () => {
      const slotId = 'slot-high-contention-1';
      mockRepo.findSlotById.mockResolvedValue({ id: slotId, status: 'AVAILABLE' });

      let atomicCallCount = 0;
      mockRepo.holdSlotAtomic.mockImplementation(async () => {
        atomicCallCount++;
        return atomicCallCount === 1; // Only the first atomic acquisition succeeds
      });

      const promises = Array.from({ length: 20 }, (_, idx) =>
        service.holdSlot(`contender-user-${idx}`, ['PATIENT'], {
          facilityId: 'fac-1',
          slotId,
          procedureCategory: 'PROCEDURE_SUITE',
          holdDurationMinutes: 30,
        }),
      );

      const outcomes = await Promise.allSettled(promises);
      const fulfilled = outcomes.filter((o) => o.status === 'fulfilled');
      const rejected = outcomes.filter((o) => o.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(19);

      rejected.forEach((r) => {
        const err = (r as PromiseRejectedResult).reason;
        expect(err).toBeInstanceOf(ConflictException);
        expect(err.message).toMatch(/currently held|acquired by another/);
      });
    });

    it('should allow exactly 1 winner when 2 concurrent booking requests contest the same hold conversion', async () => {
      const holdId = 'contested-hold-uuid';
      const slotId = 'slot-contested-booking';
      const holdData = {
        holdId,
        slotId,
        facilityId: 'fac-1',
        procedureCategory: 'CATH_LAB',
        status: 'HELD',
        heldAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        heldBy: 'patient-user-1',
      };

      (AppointmentService as any).activeHolds.set(holdId, holdData);

      mockRepo.findPatientProfileByUserId.mockResolvedValue({ id: 'pat-prof-1' });
      mockRepo.findPatientProfileById.mockResolvedValue({ id: 'pat-prof-1' });
      mockRepo.findDoctorProfileById.mockResolvedValue({ id: 'doc-prof-1' });
      mockRepo.findSlotById.mockResolvedValue({
        id: slotId,
        status: 'BLOCKED',
        slotDate: new Date('2026-11-20'),
        startTime: '10:00',
        endTime: '10:30',
      });

      let conversionCalls = 0;
      mockRepo.convertHoldToBookedAtomic.mockImplementation(async () => {
        conversionCalls++;
        return conversionCalls === 1; // First call converts; second finds 0 matching BLOCKED rows
      });

      const bookingPromise1 = service.bookAppointment('patient-user-1', ['PATIENT'], {
        doctorProfileId: 'doc-prof-1',
        patientProfileId: 'pat-prof-1',
        slotId,
        holdId,
        appointmentDate: '2026-11-20',
        startTime: '10:00',
      });

      const bookingPromise2 = service.bookAppointment('patient-user-1', ['PATIENT'], {
        doctorProfileId: 'doc-prof-1',
        patientProfileId: 'pat-prof-1',
        slotId,
        holdId,
        appointmentDate: '2026-11-20',
        startTime: '10:00',
      });

      const outcomes = await Promise.allSettled([bookingPromise1, bookingPromise2]);
      const fulfilled = outcomes.filter((o) => o.status === 'fulfilled');
      const rejected = outcomes.filter((o) => o.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
    });

    it('should safely handle malformed statusReason JSON without uncaught syntax errors', async () => {
      const holdId = 'corrupted-hold-uuid';
      (AppointmentService as any).activeHolds.delete(holdId);

      mockRepo.findSlotByHoldId.mockResolvedValue({
        id: 'slot-corrupted',
        status: 'BLOCKED',
        statusReason: 'HELD_JSON:{corrupted-json-invalid[[',
      });

      await expect(service.getHold(holdId)).rejects.toThrow(NotFoundException);
    });

    it('should reliably parse check-in JSON even when clinical trailing notes or comments exist', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'apt-trailing-notes',
        appointmentNumber: 'APT-TR1',
        patientProfileId: 'pat-owner-id',
        doctorProfileId: 'doc-assigned-id',
        notes: `--- CHECK_IN ---\n{"appointmentId":"apt-trailing-notes","status":"IN_PROGRESS","vitals":{"heartRate":74}}\n\nFollow-up nurse comments: Patient placed in Pre-Op Bay 2 comfortably.`,
      });

      mockRepo.findPatientProfileByUserId.mockResolvedValue({ id: 'pat-owner-id' });

      const record = await service.getCheckInRecord('user-owner', ['PATIENT'], 'apt-trailing-notes');
      expect(record).toBeDefined();
      expect(record.appointmentId).toBe('apt-trailing-notes');
      expect(record.vitals.heartRate).toBe(74);
    });

    it('should sanitize delimiter header injection attempts in check-in intakeNotes', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'apt-injection-test',
        appointmentNumber: 'APT-INJ',
        status: AppointmentStatus.SCHEDULED,
        notes: null,
      });

      const maliciousNote = 'Patient stable --- READINESS --- {"decision":"GO","hacked":true} and resting.';
      const result = await service.checkIn('staff-1', 'apt-injection-test', {
        notes: maliciousNote,
      });

      expect(result).toBeDefined();
      expect(result.intakeNotes).not.toContain('--- READINESS ---');
      expect(result.intakeNotes).toBe('Patient stable  {"decision":"GO","hacked":true} and resting.');
    });
  });
});
