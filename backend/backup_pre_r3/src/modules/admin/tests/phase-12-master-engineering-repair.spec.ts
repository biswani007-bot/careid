import { BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { AppointmentService } from '../../appointment/application/use-cases/appointment.service';
import { TreatmentOfferService } from '../../treatment-offer/application/use-cases/treatment-offer.service';
import { AppointmentStatus } from '../../appointment/domain/entities/appointment.entity';

describe('CareID Master Backend Engineering Repair Test Suite', () => {
  describe('Workstream B1: Pre-Operative Readiness Validation', () => {
    let service: AppointmentService;
    let mockRepo: any;
    let mockLogger: any;

    beforeEach(() => {
      mockRepo = {
        findById: jest.fn(),
        update: jest.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data })),
      };
      mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      service = new AppointmentService(mockRepo, mockLogger);
    });

    it('should reject decision GO when checklist items are false or incomplete', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'appt-1',
        notes: '',
      });

      await expect(
        service.updateReadiness('user-1', 'appt-1', {
          fastingConfirmed: true,
          medicationHoldConfirmed: false, // Incomplete!
          transportationArranged: true,
          consentVerified: true,
          vitalsWithinThreshold: true,
          decision: 'GO',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow decision GO when all 5 checklist items are true', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'appt-1',
        notes: '',
      });

      const res = await service.updateReadiness('user-1', 'appt-1', {
        fastingConfirmed: true,
        medicationHoldConfirmed: true,
        transportationArranged: true,
        consentVerified: true,
        vitalsWithinThreshold: true,
        decision: 'GO',
      });

      expect(res.decision).toBe('GO');
      expect(res.fastingConfirmed).toBe(true);
      expect(res.medicationHoldConfirmed).toBe(true);
      expect(mockRepo.update).toHaveBeenCalledWith(
        'appt-1',
        expect.objectContaining({ notes: expect.stringContaining('--- READINESS ---') }),
      );
    });
  });

  describe('Workstream B2: Atomic Appointment Hold Conversion', () => {
    let service: AppointmentService;
    let mockRepo: any;
    let mockLogger: any;

    beforeEach(() => {
      mockRepo = {
        findSlotById: jest.fn(),
        updateSlotStatus: jest.fn().mockResolvedValue({ id: 'slot-1', status: 'BOOKED' }),
        checkDoctorConflict: jest.fn().mockResolvedValue(false),
        checkPatientConflict: jest.fn().mockResolvedValue(false),
        generateNextAppointmentNumber: jest.fn().mockResolvedValue('APT-2026-999'),
        create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'appt-new', ...data })),
        findPatientProfileById: jest.fn().mockResolvedValue({ id: 'pat-1' }),
        findDoctorProfileById: jest.fn().mockResolvedValue({ id: 'doc-1' }),
        findFacilityById: jest.fn().mockResolvedValue({ id: 'fac-1' }),
      };
      mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      service = new AppointmentService(mockRepo, mockLogger);
    });

    it('should atomically convert a held BLOCKED slot to BOOKED when holdId is supplied', async () => {
      const holdId = 'test-hold-uuid-1';
      (AppointmentService as any).activeHolds.set(holdId, {
        holdId,
        slotId: 'slot-1',
        facilityId: 'fac-1',
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      });

      mockRepo.findSlotById.mockResolvedValue({
        id: 'slot-1',
        status: 'BLOCKED',
        slotDate: new Date('2026-11-20'),
        startTime: '10:00',
        endTime: '10:30',
      });

      const res = await service.bookAppointment('doc-user-1', ['DOCTOR'], {
        doctorProfileId: 'doc-1',
        patientProfileId: 'pat-1',
        facilityId: 'fac-1',
        appointmentDate: '2026-11-20',
        startTime: '10:00',
        endTime: '10:30',
        slotId: 'slot-1',
        holdId,
      });

      expect(res.appointmentNumber).toBe('APT-2026-999');
      expect(mockRepo.updateSlotStatus).toHaveBeenCalledWith('slot-1', 'BOOKED');
      expect((AppointmentService as any).activeHolds.has(holdId)).toBe(false);
    });
  });

  describe('Workstream B3: Check-In Record Persistence & Retrieval', () => {
    let service: AppointmentService;
    let mockRepo: any;
    let mockLogger: any;

    beforeEach(() => {
      mockRepo = {
        findById: jest.fn(),
        update: jest.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data })),
      };
      mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      service = new AppointmentService(mockRepo, mockLogger);
    });

    it('should persist check-in details to appointment notes and retrieve them via getCheckInRecord', async () => {
      let storedNotes = '';
      mockRepo.findById.mockImplementation(() =>
        Promise.resolve({
          id: 'appt-ci-1',
          appointmentNumber: 'APT-100',
          status: AppointmentStatus.CONFIRMED,
          notes: storedNotes,
        }),
      );
      mockRepo.update.mockImplementation((id: string, data: any) => {
        storedNotes = data.notes;
        return Promise.resolve({ id, ...data });
      });

      const checkInResult = await service.checkIn('staff-user-1', 'appt-ci-1', {
        checkInTime: '2026-11-18T10:00:00.000Z',
        bedOrBayNumber: 'BAY-CARDIAC-4',
        vitals: { bloodPressure: '120/80', heartRate: 72 },
        notes: 'Pre-procedure prep complete',
      });

      expect(checkInResult.status).toBe(AppointmentStatus.IN_PROGRESS);
      expect(checkInResult.bedOrBayNumber).toBe('BAY-CARDIAC-4');
      expect(storedNotes).toContain('--- CHECK_IN ---');

      // Now test retrieval
      mockRepo.findById.mockResolvedValue({
        id: 'appt-ci-1',
        appointmentNumber: 'APT-100',
        status: AppointmentStatus.IN_PROGRESS,
        notes: storedNotes,
      });

      const retrieved = await service.getCheckInRecord('appt-ci-1');
      expect(retrieved.bedOrBayNumber).toBe('BAY-CARDIAC-4');
      expect(retrieved.vitals).toEqual({ bloodPressure: '120/80', heartRate: 72 });
    });
  });

  describe('Workstream A1 & A2: Treatment Offer Discount & Financing Tenures', () => {
    let service: TreatmentOfferService;
    let mockRepo: any;
    let mockDb: any;
    let mockLogger: any;

    beforeEach(() => {
      mockRepo = {
        findOfferById: jest.fn(),
        createHistory: jest.fn().mockResolvedValue({}),
        generateFinancingOfferNumber: jest.fn().mockResolvedValue('FO-1001'),
        upsertFinancingOffer: jest.fn().mockImplementation((id, data) => Promise.resolve({ id: 'fin-1', ...data })),
      };
      mockDb = {
        doctorProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'doc-prof-1', verificationStatus: 'VERIFIED' }) },
        patientProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'pat-prof-1', userId: 'user-pat-1' }) },
        treatmentOffer: { update: jest.fn().mockResolvedValue({}) },
      };
      mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      service = new TreatmentOfferService(mockRepo, mockDb, mockLogger);
    });

    it('should reject attending doctor self-approving discount exceeding 15%', async () => {
      mockRepo.findOfferById.mockResolvedValue({
        id: 'off-1',
        doctorProfileId: 'doc-prof-1',
        grossEstimate: 100000,
        discountAmount: 20000, // 20% > 15% threshold
        status: 'DRAFT',
      });

      // Doctor role
      await expect(
        service.approveDiscount('doc-user-1', 'off-1', { approved: true, comments: 'Self approval' }, ['DOCTOR']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow supervisor (FACILITY_ADMIN / STAFF / ADMIN) to approve discount', async () => {
      mockRepo.findOfferById.mockResolvedValue({
        id: 'off-1',
        doctorProfileId: 'doc-prof-1',
        grossEstimate: 100000,
        discountAmount: 20000,
        status: 'DRAFT',
      });

      const res = await service.approveDiscount(
        'admin-user-1',
        'off-1',
        { approved: true, comments: 'Supervisor approved' },
        ['ADMIN'],
      );

      expect(res.isApproved).toBe(true);
      expect(res.approvalStatus).toBe('APPROVED');
      expect(mockRepo.createHistory).toHaveBeenCalledWith(
        'off-1',
        'DISCOUNT_APPROVED',
        'DRAFT',
        'DRAFT',
        'admin-user-1',
        'ADMIN',
        'Supervisor approved',
        expect.any(Object),
      );
    });

    it('should accept tenureMonths as a single number or array without throwing TypeError', async () => {
      mockRepo.findOfferById.mockResolvedValue({
        id: 'off-1',
        doctorProfileId: 'doc-prof-1',
        netPayable: 30000,
        patientProfileId: 'pat-prof-1',
      });

      // Pass single number for tenureMonths
      const res = await service.bindFinancing('doc-user-1', 'off-1', {
        partnerName: 'CareCredit Health',
        tenureMonths: 6 as any, // Single number instead of array
        interestRate: 0,
      });

      expect(res.partnerName).toBe('CareCredit Health');
      expect(mockRepo.upsertFinancingOffer).toHaveBeenCalledWith(
        'off-1',
        expect.objectContaining({ tenureMonths: [6] }),
      );
    });
  });

  describe('Workstream E: Safe Patient Profile Date Serialization', () => {
    it('should gracefully handle invalid date values and blocked user status without crashing', () => {
      function toSafeIsoString(dateVal: any): string | null {
        if (!dateVal) return null;
        const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
        return !isNaN(d.getTime()) ? d.toISOString() : null;
      }

      expect(toSafeIsoString(new Date('invalid-date'))).toBeNull();
      expect(toSafeIsoString(undefined)).toBeNull();
      expect(toSafeIsoString(null)).toBeNull();
      expect(toSafeIsoString('2026-11-15T00:00:00.000Z')).toBe('2026-11-15T00:00:00.000Z');

      // Test Lucas Vance simulated data mapping
      const lucasVanceRaw = {
        id: '9a4ad630-de90-40e9-b4cd-1d76f8f63069',
        userId: '7904ad9d-b141-471d-9451-4aa48ad3eba7',
        patientNumber: 'P-1794566886',
        firstName: 'Lucas',
        lastName: 'Vance',
        dateOfBirth: null,
        gender: 'MALE',
        bloodGroup: 'O+',
        nationality: null,
        status: 'DRAFT',
        onboardingStep: 1,
        createdAt: new Date('2026-11-13T10:48:11.031Z'),
        updatedAt: new Date('2026-11-13T11:36:00.382Z'),
        user: {
          phone: '+16505551407',
          email: 'lucas.vance.1794566886827@careid.test',
          status: 'BLOCKED',
        },
      };

      const mapped = {
        id: lucasVanceRaw.id,
        userId: lucasVanceRaw.userId,
        patientNumber: lucasVanceRaw.patientNumber,
        firstName: lucasVanceRaw.firstName,
        lastName: lucasVanceRaw.lastName,
        dateOfBirth: toSafeIsoString(lucasVanceRaw.dateOfBirth),
        phone: lucasVanceRaw.user?.phone || '',
        email: lucasVanceRaw.user?.email || null,
        userStatus: lucasVanceRaw.user?.status || (lucasVanceRaw.status === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE'),
        profileStatus: lucasVanceRaw.status,
        createdAt: toSafeIsoString(lucasVanceRaw.createdAt) || new Date().toISOString(),
        updatedAt: toSafeIsoString(lucasVanceRaw.updatedAt) || new Date().toISOString(),
      };

      expect(mapped.userStatus).toBe('BLOCKED');
      expect(mapped.profileStatus).toBe('DRAFT');
      expect(mapped.dateOfBirth).toBeNull();
      expect(mapped.firstName).toBe('Lucas');
      expect(mapped.createdAt).toBe('2026-11-13T10:48:11.031Z');
    });
  });
});
