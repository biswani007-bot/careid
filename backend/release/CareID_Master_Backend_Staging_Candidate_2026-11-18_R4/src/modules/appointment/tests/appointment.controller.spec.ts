import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentController } from '../presentation/controllers/appointment.controller';
import { AppointmentService } from '../application/use-cases/appointment.service';
import { AppointmentStatus, AppointmentType } from '../domain/entities/appointment.entity';

describe('AppointmentController', () => {
  let controller: AppointmentController;
  let service: jest.Mocked<AppointmentService>;

  const sampleResponse = {
    id: 'appt-1',
    appointmentNumber: 'APT-20261115-A1B2C3',
    patientProfileId: 'patient-prof-1',
    doctorProfileId: 'doc-prof-1',
    appointmentDate: '2026-11-15',
    startTime: '09:00',
    endTime: '09:15',
    durationMinutes: 15,
    type: AppointmentType.IN_PERSON,
    status: AppointmentStatus.SCHEDULED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const mockService = {
      bookAppointment: jest.fn().mockResolvedValue(sampleResponse),
      getAppointments: jest.fn().mockResolvedValue({ data: [sampleResponse], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }),
      getMyAppointmentsForDoctor: jest.fn().mockResolvedValue({ data: [sampleResponse], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }),
      getMyAppointmentsForPatient: jest.fn().mockResolvedValue({ data: [sampleResponse], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }),
      getAppointmentById: jest.fn().mockResolvedValue(sampleResponse),
      rescheduleAppointment: jest.fn().mockResolvedValue({ ...sampleResponse, status: AppointmentStatus.RESCHEDULED }),
      cancelAppointment: jest.fn().mockResolvedValue({ ...sampleResponse, status: AppointmentStatus.CANCELLED }),
      updateAppointmentStatus: jest.fn().mockResolvedValue({ ...sampleResponse, status: AppointmentStatus.CONFIRMED }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppointmentController],
      providers: [
        {
          provide: AppointmentService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AppointmentController>(AppointmentController);
    service = module.get(AppointmentService);
  });

  it('should book an appointment', async () => {
    const req = { user: { userId: 'u-1', roles: ['PATIENT'] } };
    const result = await controller.bookAppointment(req, {
      doctorProfileId: 'doc-prof-1',
      appointmentDate: '2026-11-15',
      startTime: '09:00',
    });
    expect(result).toBeDefined();
    expect(service.bookAppointment).toHaveBeenCalledWith('u-1', ['PATIENT'], expect.any(Object));
  });

  it('should get appointments', async () => {
    const req = { user: { userId: 'u-1', roles: ['ADMIN'] } };
    const result = await controller.getAppointments(req, {});
    expect(result.data).toHaveLength(1);
    expect(service.getAppointments).toHaveBeenCalledWith('u-1', ['ADMIN'], {});
  });

  it('should get doctor appointments', async () => {
    const req = { user: { userId: 'u-doc-1', roles: ['DOCTOR'] } };
    const result = await controller.getDoctorAppointments(req, {});
    expect(result.data).toHaveLength(1);
    expect(service.getMyAppointmentsForDoctor).toHaveBeenCalledWith('u-doc-1', {});
  });

  it('should get patient appointments', async () => {
    const req = { user: { userId: 'u-pat-1', roles: ['PATIENT'] } };
    const result = await controller.getPatientAppointments(req, {});
    expect(result.data).toHaveLength(1);
    expect(service.getMyAppointmentsForPatient).toHaveBeenCalledWith('u-pat-1', {});
  });

  it('should reschedule appointment', async () => {
    const req = { user: { userId: 'u-1', roles: ['PATIENT'] } };
    const result = await controller.rescheduleAppointment(req, 'appt-1', {
      appointmentDate: '2026-11-20',
      startTime: '10:00',
    });
    expect(result.status).toBe(AppointmentStatus.RESCHEDULED);
  });

  it('should cancel appointment', async () => {
    const req = { user: { userId: 'u-1', roles: ['PATIENT'] } };
    const result = await controller.cancelAppointment(req, 'appt-1', {
      cancellationReason: 'Conflict',
    });
    expect(result.status).toBe(AppointmentStatus.CANCELLED);
  });

  it('should update appointment status', async () => {
    const req = { user: { userId: 'u-doc-1', roles: ['DOCTOR'] } };
    const result = await controller.updateAppointmentStatus(req, 'appt-1', {
      status: AppointmentStatus.CONFIRMED,
    });
    expect(result.status).toBe(AppointmentStatus.CONFIRMED);
  });
});

