import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { DoctorService } from '../application/use-cases/doctor.service';
import { DoctorController } from '../presentation/controllers/doctor.controller';
import { IDoctorRepository } from '../domain/repositories/doctor.repository.interface';
import { QrService } from '@modules/qr/application/use-cases/qr.service';
import { Logger } from 'nestjs-pino';
import { DoctorRegisterPatientDto } from '../presentation/dto/doctor-register-patient.dto';

describe('Doctor-initiated Patient Registration Suite', () => {
  let service: DoctorService;
  let controller: DoctorController;
  let repository: jest.Mocked<IDoctorRepository>;

  const mockDoctor: any = {
    id: 'doc-uuid-1',
    userId: 'user-doc-1',
    fullName: 'Dr. Gregory House',
    registrationNumber: 'MED-12345',
    verificationStatus: 'VERIFIED',
    isActive: true,
  };

  const sampleRegisterDto: DoctorRegisterPatientDto = {
    firstName: 'Alice',
    lastName: 'Walker',
    phone: '+16505550099',
    email: 'alice.walker@example.com',
    dateOfBirth: '1992-04-10',
    gender: 'FEMALE',
    bloodGroup: 'A+',
    address: '742 Evergreen Terrace',
    city: 'Springfield',
    state: 'OR',
    postalCode: '97477',
    country: 'USA',
    emergencyContact: {
      name: 'Bob Walker',
      relationship: 'SPOUSE',
      phone: '+16505550098',
    },
    initialChiefComplaint: 'Acute seasonal allergies and nasal congestion',
    clinicalNotes: 'Walk-in patient without previous digital CareID. Registered in clinic.',
    initialVitals: {
      systolicBp: 118,
      diastolicBp: 78,
      pulseBpm: 70,
      temperatureC: 36.6,
      weightKg: 65,
      heightCm: 168,
      oxygenSaturation: 99,
    },
    facilityId: 'fac-metro-001',
  };

  const mockRegistrationResult: any = {
    success: true,
    message: 'Patient registered and clinical access authorized successfully',
    isExistingPatient: false,
    patientProfile: {
      id: 'patient-prof-99',
      userId: 'user-patient-99',
      patientNumber: 'PT-999999',
      firstName: 'Alice',
      lastName: 'Walker',
      dateOfBirth: '1992-04-10',
      gender: 'FEMALE',
      bloodGroup: 'A+',
      phone: '+16505550099',
      email: 'alice.walker@example.com',
      status: 'ACTIVE',
      onboardingStep: 6,
      createdAt: '2026-11-14T12:00:00.000Z',
    },
    healthCard: {
      id: 'hc-99',
      cardNumber: 'HC-999999',
      status: 'ACTIVE',
      expiresAt: '2027-11-14T12:00:00.000Z',
      qrPayload: 'CAREID:HC:hc-99:patient-prof-99:1731585600',
    },
    clinicalAuthorization: {
      authorizedDoctorId: 'doc-uuid-1',
      authSource: 'CONSENT',
      consentGranted: true,
      grantedAt: '2026-11-14T12:00:00.000Z',
    },
    initialRecord: {
      id: 'rec-init-99',
      title: 'Acute seasonal allergies and nasal congestion',
      chiefComplaint: 'Acute seasonal allergies and nasal congestion',
      clinicalNotes: 'Walk-in patient without previous digital CareID. Registered in clinic.',
    },
  };

  beforeEach(async () => {
    const mockRepo: Partial<jest.Mocked<IDoctorRepository>> = {
      findProfileByUserId: jest.fn().mockResolvedValue(mockDoctor),
      registerPatientByDoctor: jest.fn().mockResolvedValue(mockRegistrationResult),
      createSecurityAuditLog: jest.fn().mockResolvedValue(undefined),
    };

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const mockQrService = {
      generateAndSignQr: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DoctorController],
      providers: [
        DoctorService,
        { provide: 'IDoctorRepository', useValue: mockRepo },
        { provide: Logger, useValue: mockLogger },
        { provide: QrService, useValue: mockQrService },
      ],
    }).compile();

    service = module.get<DoctorService>(DoctorService);
    controller = module.get<DoctorController>(DoctorController);
    repository = module.get('IDoctorRepository');
  });

  describe('DoctorService.registerPatientByDoctor', () => {
    it('should register a new patient successfully when initiated by verified doctor', async () => {
      const result = await service.registerPatientByDoctor('user-doc-1', sampleRegisterDto, '192.168.1.100');

      expect(repository.findProfileByUserId).toHaveBeenCalledWith('user-doc-1');
      expect(repository.registerPatientByDoctor).toHaveBeenCalledWith(mockDoctor, sampleRegisterDto);
      expect(repository.createSecurityAuditLog).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.isExistingPatient).toBe(false);
      expect(result.patientProfile.patientNumber).toBe('PT-999999');
      expect(result.healthCard?.cardNumber).toBe('HC-999999');
      expect(result.clinicalAuthorization.authSource).toBe('CONSENT');
      expect(result.initialRecord?.title).toContain('Acute seasonal allergies');
    });

    it('should reject duplicate registration of existing patient with ConflictException to prevent unauthorized linking or data leakage', async () => {
      repository.registerPatientByDoctor.mockRejectedValueOnce(
        new ConflictException(
          'A user or patient profile with this phone number or email is already registered in CareID. Existing patients cannot be automatically linked or overwritten without patient-initiated consent or QR verification.',
        ),
      );

      await expect(service.registerPatientByDoctor('user-doc-1', sampleRegisterDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if required patient fields are missing', async () => {
      const invalidDto: any = { firstName: '', lastName: 'Walker', phone: '' };

      await expect(
        service.registerPatientByDoctor('user-doc-1', invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if phone number format is invalid (< 8 chars)', async () => {
      const invalidDto: any = { firstName: 'Alice', lastName: 'Walker', phone: '123' };

      await expect(
        service.registerPatientByDoctor('user-doc-1', invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if doctor profile is not found', async () => {
      repository.findProfileByUserId.mockResolvedValueOnce(null);

      await expect(
        service.registerPatientByDoctor('non-existent-doc', sampleRegisterDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if doctor is suspended', async () => {
      repository.findProfileByUserId.mockResolvedValueOnce({
        ...mockDoctor,
        verificationStatus: 'SUSPENDED',
      });

      await expect(
        service.registerPatientByDoctor('user-doc-1', sampleRegisterDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if doctor registration is rejected', async () => {
      repository.findProfileByUserId.mockResolvedValueOnce({
        ...mockDoctor,
        verificationStatus: 'REJECTED',
      });

      await expect(
        service.registerPatientByDoctor('user-doc-1', sampleRegisterDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DoctorController.registerPatient (POST /doctors/patients and /doctors/patients/register)', () => {
    it('should handle controller request and delegate to DoctorService', async () => {
      const req = {
        user: { userId: 'user-doc-1', roles: ['DOCTOR'] },
        ip: '127.0.0.1',
      };

      const response = await controller.registerPatient(req, sampleRegisterDto);

      expect(response).toEqual(mockRegistrationResult);
      expect(response.patientProfile.firstName).toBe('Alice');
      expect(response.healthCard?.status).toBe('ACTIVE');
    });
  });
});

