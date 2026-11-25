import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentService } from '../application/use-cases/appointment.service';
import { IAppointmentRepository } from '../domain/repositories/appointment.repository.interface';
import { AppointmentStatus, AppointmentType, AppointmentEntity } from '../domain/entities/appointment.entity';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';

describe('AppointmentService', () => {
  let service: AppointmentService;
  let repository: jest.Mocked<IAppointmentRepository>;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const sampleAppointment: AppointmentEntity = {
    id: 'appt-1',
    appointmentNumber: 'APT-20261115-A1B2C3',
    patientProfileId: 'patient-prof-1',
    doctorProfileId: 'doc-prof-1',
    facilityId: 'fac-1',
    scheduleId: 'sched-1',
    slotId: 'slot-1',
    appointmentDate: new Date('2026-11-15T00:00:00.000Z'),
    startTime: '09:00',
    endTime: '09:15',
    durationMinutes: 15,
    type: AppointmentType.IN_PERSON,
    status: AppointmentStatus.SCHEDULED,
    reason: 'Routine checkup',
    notes: 'First time visit',
    bookedBy: 'user-patient-1',
    cancelledAt: null,
    cancellationReason: null,
    cancelledBy: null,
    rescheduledFromId: null,
    isDeleted: false,
    createdAt: new Date('2026-10-30T10:00:00.000Z'),
    updatedAt: new Date('2026-10-30T10:00:00.000Z'),
    patientProfile: {
      id: 'patient-prof-1',
      firstName: 'Alice',
      lastName: 'Smith',
      mrn: 'MRN-101',
    },
    doctorProfile: {
      id: 'doc-prof-1',
      firstName: 'Bob',
      lastName: 'Jones',
      specialization: 'Cardiology',
    },
    facility: {
      id: 'fac-1',
      name: 'City Hospital',
    },
  };

  beforeEach(async () => {
    const mockRepo: Partial<jest.Mocked<IAppointmentRepository>> = {
      create: jest.fn().mockResolvedValue(sampleAppointment),
      findById: jest.fn().mockResolvedValue(sampleAppointment),
      findByAppointmentNumber: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue({ items: [sampleAppointment], total: 1 }),
      update: jest.fn().mockImplementation((id, data) => Promise.resolve({ ...sampleAppointment, ...data })),
      checkDoctorConflict: jest.fn().mockResolvedValue(false),
      checkPatientConflict: jest.fn().mockResolvedValue(false),
      findPatientProfileByUserId: jest.fn().mockResolvedValue({ id: 'patient-prof-1', userId: 'user-patient-1' }),
      findDoctorProfileByUserId: jest.fn().mockResolvedValue({ id: 'doc-prof-1', userId: 'user-doc-1' }),
      findPatientProfileById: jest.fn().mockResolvedValue({ id: 'patient-prof-1' }),
      findDoctorProfileById: jest.fn().mockResolvedValue({ id: 'doc-prof-1' }),
      findFacilityById: jest.fn().mockResolvedValue({ id: 'fac-1', name: 'City Hospital' }),
      findSlotById: jest.fn().mockResolvedValue({
        id: 'slot-1',
        slotDate: new Date('2026-11-15T00:00:00.000Z'),
        startTime: '09:00',
        endTime: '09:15',
        status: 'AVAILABLE',
      }),
      updateSlotStatus: jest.fn().mockResolvedValue(undefined),
      reserveSlotAtomic: jest.fn().mockResolvedValue(true),
      generateNextAppointmentNumber: jest.fn().mockResolvedValue('APT-20261115-A1B2C3'),
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
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AppointmentService>(AppointmentService);
    repository = module.get('IAppointmentRepository');
  });

  describe('bookAppointment', () => {
    it('should successfully book an appointment for a patient', async () => {
      const result = await service.bookAppointment('user-patient-1', ['PATIENT'], {
        doctorProfileId: 'doc-prof-1',
        appointmentDate: '2026-11-15',
        startTime: '09:00',
        durationMinutes: 15,
        slotId: 'slot-1',
        facilityId: 'fac-1',
      });

      expect(result).toBeDefined();
      expect(result.appointmentNumber).toBe('APT-20261115-A1B2C3');
      expect(result.status).toBe(AppointmentStatus.SCHEDULED);
      expect(repository.updateSlotStatus).toHaveBeenCalledWith('slot-1', 'BOOKED');
    });

    it('should forbid patient from booking on behalf of another patient profile', async () => {
      await expect(
        service.bookAppointment('user-patient-1', ['PATIENT'], {
          patientProfileId: 'different-profile-id',
          doctorProfileId: 'doc-prof-1',
          appointmentDate: '2026-11-15',
          startTime: '09:00',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow staff/admin to book on behalf of a patient', async () => {
      const result = await service.bookAppointment('admin-user-1', ['ADMIN'], {
        patientProfileId: 'patient-prof-1',
        doctorProfileId: 'doc-prof-1',
        appointmentDate: '2026-11-15',
        startTime: '09:00',
      });

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalled();
    });

    it('should reject booking if patient profile not found', async () => {
      repository.findPatientProfileById.mockResolvedValueOnce(null);

      await expect(
        service.bookAppointment('admin-user-1', ['ADMIN'], {
          patientProfileId: 'non-existent-patient',
          doctorProfileId: 'doc-prof-1',
          appointmentDate: '2026-11-15',
          startTime: '09:00',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject booking if doctor profile not found', async () => {
      repository.findDoctorProfileById.mockResolvedValueOnce(null);

      await expect(
        service.bookAppointment('user-patient-1', ['PATIENT'], {
          doctorProfileId: 'non-existent-doctor',
          appointmentDate: '2026-11-15',
          startTime: '09:00',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject booking if doctor has conflict', async () => {
      repository.checkDoctorConflict.mockResolvedValueOnce(true);

      await expect(
        service.bookAppointment('user-patient-1', ['PATIENT'], {
          doctorProfileId: 'doc-prof-1',
          appointmentDate: '2026-11-15',
          startTime: '09:00',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject booking if patient has conflict', async () => {
      repository.checkPatientConflict.mockResolvedValueOnce(true);

      await expect(
        service.bookAppointment('user-patient-1', ['PATIENT'], {
          doctorProfileId: 'doc-prof-1',
          appointmentDate: '2026-11-15',
          startTime: '09:00',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject booking if slot is not AVAILABLE', async () => {
      repository.findSlotById.mockResolvedValueOnce({
        id: 'slot-1',
        slotDate: new Date('2026-11-15T00:00:00.000Z'),
        startTime: '09:00',
        endTime: '09:15',
        status: 'BOOKED',
      });

      await expect(
        service.bookAppointment('user-patient-1', ['PATIENT'], {
          doctorProfileId: 'doc-prof-1',
          slotId: 'slot-1',
          appointmentDate: '2026-11-15',
          startTime: '09:00',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('rescheduleAppointment', () => {
    it('should successfully reschedule appointment', async () => {
      const result = await service.rescheduleAppointment('user-patient-1', ['PATIENT'], 'appt-1', {
        appointmentDate: '2026-11-20',
        startTime: '10:00',
        reason: 'Schedule conflict',
      });

      expect(result).toBeDefined();
      expect(repository.update).toHaveBeenCalledWith(
        'appt-1',
        expect.objectContaining({
          status: AppointmentStatus.RESCHEDULED,
          startTime: '10:00',
        }),
      );
    });

    it('should reject reschedule if already cancelled', async () => {
      repository.findById.mockResolvedValueOnce({
        ...sampleAppointment,
        status: AppointmentStatus.CANCELLED,
      });

      await expect(
        service.rescheduleAppointment('user-patient-1', ['PATIENT'], 'appt-1', {
          appointmentDate: '2026-11-20',
          startTime: '10:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject reschedule if doctor has conflict on new date/time', async () => {
      repository.checkDoctorConflict.mockResolvedValueOnce(true);

      await expect(
        service.rescheduleAppointment('user-patient-1', ['PATIENT'], 'appt-1', {
          appointmentDate: '2026-11-20',
          startTime: '10:00',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel appointment and release slot to AVAILABLE', async () => {
      const result = await service.cancelAppointment('user-patient-1', ['PATIENT'], 'appt-1', {
        cancellationReason: 'Feeling better',
      });

      expect(result).toBeDefined();
      expect(repository.updateSlotStatus).toHaveBeenCalledWith('slot-1', 'AVAILABLE');
      expect(repository.update).toHaveBeenCalledWith(
        'appt-1',
        expect.objectContaining({
          status: AppointmentStatus.CANCELLED,
          cancellationReason: 'Feeling better',
          cancelledBy: 'user-patient-1',
        }),
      );
    });

    it('should reject cancellation if already cancelled', async () => {
      repository.findById.mockResolvedValueOnce({
        ...sampleAppointment,
        status: AppointmentStatus.CANCELLED,
      });

      await expect(
        service.cancelAppointment('user-patient-1', ['PATIENT'], 'appt-1', {
          cancellationReason: 'Already cancelled',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateAppointmentStatus', () => {
    it('should allow doctor to update status to COMPLETED', async () => {
      const result = await service.updateAppointmentStatus('user-doc-1', ['DOCTOR'], 'appt-1', {
        status: AppointmentStatus.COMPLETED,
        notes: 'Consultation concluded',
      });

      expect(result).toBeDefined();
      expect(repository.update).toHaveBeenCalledWith(
        'appt-1',
        expect.objectContaining({
          status: AppointmentStatus.COMPLETED,
        }),
      );
    });

    it('should forbid patient from changing appointment status directly', async () => {
      await expect(
        service.updateAppointmentStatus('user-patient-1', ['PATIENT'], 'appt-1', {
          status: AppointmentStatus.COMPLETED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

