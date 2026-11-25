import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ROLES_KEY } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { DoctorController } from '../presentation/controllers/doctor.controller';
import { DoctorService } from '../application/use-cases/doctor.service';
import {
  DoctorPatientsQueryDto,
  CreateDoctorPrescriptionDto,
  CreateDoctorVitalsDto,
} from '../presentation/dto/doctor-patient-management.dto';

describe('Doctor Patient Module Management APIs (Integration & Security)', () => {
  let controller: DoctorController;
  let service: DoctorService;
  let reflector: Reflector;

  const mockDoctorService = {
    getAuthorizedPatients: jest.fn(),
    getPatientProfile: jest.fn(),
    getPatientPrescriptions: jest.fn(),
    createPatientPrescription: jest.fn(),
    getPatientVitals: jest.fn(),
    createPatientVitals: jest.fn(),
    getMyProfile: jest.fn(),
    getDoctorById: jest.fn(),
    getPatientTimeline: jest.fn(),
    getPatientMedicalRecords: jest.fn(),
    createPatientEncounter: jest.fn(),
    updatePatientMedicalRecord: jest.fn(),
  };

  const mockDoctor = {
    id: 'doc-profile-100',
    userId: 'user-doc-1',
    fullName: 'Dr. Evelyn Reed',
    primarySpecialization: 'Cardiology',
    verificationStatus: 'VERIFIED',
    isDeleted: false,
  };

  const mockPatient = {
    id: 'pat-profile-200',
    userId: 'user-pat-2',
    patientNumber: '+1234567890',
    firstName: 'John',
    lastName: 'Doe',
    gender: 'MALE',
    dateOfBirth: '1985-06-15',
    bloodGroup: 'O+',
    phone: '+1234567890',
    email: 'john.doe@example.com',
    status: 'ACTIVE',
    photoUrl: 'https://cdn.careid.com/photos/john.jpg',
    authSource: 'APPOINTMENT',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-02-01T15:30:00.000Z',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DoctorController],
      providers: [
        {
          provide: DoctorService,
          useValue: mockDoctorService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<DoctorController>(DoctorController);
    service = module.get<DoctorService>(DoctorService);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('1. Security & RBAC Guards Enforcement', () => {
    it('should strictly require DOCTOR role for GET /doctors/patients', () => {
      const requiredRoles = reflector.get<string[]>(ROLES_KEY, controller.getPatients);
      expect(requiredRoles).toBeDefined();
      expect(requiredRoles).toEqual(['DOCTOR']);
    });

    it('should strictly require DOCTOR role for GET /doctors/patients/:patientProfileId', () => {
      const requiredRoles = reflector.get<string[]>(ROLES_KEY, controller.getPatientProfile);
      expect(requiredRoles).toBeDefined();
      expect(requiredRoles).toEqual(['DOCTOR']);
    });

    it('should strictly require DOCTOR role for GET /doctors/patients/:patientProfileId/prescriptions', () => {
      const requiredRoles = reflector.get<string[]>(ROLES_KEY, controller.getPatientPrescriptions);
      expect(requiredRoles).toBeDefined();
      expect(requiredRoles).toEqual(['DOCTOR']);
    });

    it('should strictly require DOCTOR role for POST /doctors/patients/:patientProfileId/prescriptions', () => {
      const requiredRoles = reflector.get<string[]>(ROLES_KEY, controller.createPatientPrescription);
      expect(requiredRoles).toBeDefined();
      expect(requiredRoles).toEqual(['DOCTOR']);
    });

    it('should strictly require DOCTOR role for GET /doctors/patients/:patientProfileId/vitals', () => {
      const requiredRoles = reflector.get<string[]>(ROLES_KEY, controller.getPatientVitals);
      expect(requiredRoles).toBeDefined();
      expect(requiredRoles).toEqual(['DOCTOR']);
    });

    it('should strictly require DOCTOR role for POST /doctors/patients/:patientProfileId/vitals', () => {
      const requiredRoles = reflector.get<string[]>(ROLES_KEY, controller.createPatientVitals);
      expect(requiredRoles).toBeDefined();
      expect(requiredRoles).toEqual(['DOCTOR']);
    });

    it('should declare all new patient routes before generic :id route in controller prototype', () => {
      const controllerProto = Object.getPrototypeOf(controller);
      const propertyNames = Object.getOwnPropertyNames(controllerProto);

      const patientsListIndex = propertyNames.indexOf('getPatients');
      const patientProfileIndex = propertyNames.indexOf('getPatientProfile');
      const prescriptionsGetIndex = propertyNames.indexOf('getPatientPrescriptions');
      const prescriptionsPostIndex = propertyNames.indexOf('createPatientPrescription');
      const vitalsGetIndex = propertyNames.indexOf('getPatientVitals');
      const vitalsPostIndex = propertyNames.indexOf('createPatientVitals');
      const getByIdIndex = propertyNames.indexOf('getDoctorById');

      expect(patientsListIndex).toBeGreaterThan(-1);
      expect(patientProfileIndex).toBeGreaterThan(-1);
      expect(prescriptionsGetIndex).toBeGreaterThan(-1);
      expect(prescriptionsPostIndex).toBeGreaterThan(-1);
      expect(vitalsGetIndex).toBeGreaterThan(-1);
      expect(vitalsPostIndex).toBeGreaterThan(-1);
      expect(getByIdIndex).toBeGreaterThan(-1);

      // Crucial: All patient routes precede getDoctorById to prevent route shadowing
      expect(patientsListIndex).toBeLessThan(getByIdIndex);
      expect(patientProfileIndex).toBeLessThan(getByIdIndex);
      expect(prescriptionsGetIndex).toBeLessThan(getByIdIndex);
      expect(prescriptionsPostIndex).toBeLessThan(getByIdIndex);
      expect(vitalsGetIndex).toBeLessThan(getByIdIndex);
      expect(vitalsPostIndex).toBeLessThan(getByIdIndex);
    });
  });

  describe('2. Patient Listing (GET /api/v1/doctors/patients)', () => {
    it('should delegate to service with doctor userId and pagination/search queries', async () => {
      const mockResult = {
        data: [mockPatient],
        meta: { totalItems: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
      };
      mockDoctorService.getAuthorizedPatients.mockResolvedValue(mockResult);

      const req = { user: { userId: 'user-doc-1', roles: ['DOCTOR'] }, ip: '127.0.0.1' };
      const query: DoctorPatientsQueryDto = { page: 1, limit: 20, search: 'John', gender: 'MALE' };

      const response = await controller.getPatients(req, query);

      expect(mockDoctorService.getAuthorizedPatients).toHaveBeenCalledWith('user-doc-1', query, '127.0.0.1');
      expect(response).toEqual(mockResult);
      expect(response.data[0].authSource).toBe('APPOINTMENT');
    });

    it('should reject non-doctor caller attempting to access patients list', async () => {
      mockDoctorService.getAuthorizedPatients.mockRejectedValue(new ForbiddenException('Doctor registration is currently suspended'));

      const req = { user: { userId: 'suspended-doc-user', roles: ['DOCTOR'] } };
      await expect(controller.getPatients(req, {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('3. Patient Demographic Profile (GET /api/v1/doctors/patients/:patientProfileId)', () => {
    it('should return complete demographic profile for authorized doctor', async () => {
      const mockDetail = {
        ...mockPatient,
        nationality: 'American',
        occupation: 'Engineer',
        maritalStatus: 'MARRIED',
        languages: ['English'],
        knownAllergies: ['Penicillin'],
        chronicConditions: ['Hypertension'],
        emergencyContact: {
          id: 'ec-1',
          name: 'Jane Doe',
          relationship: 'SPOUSE',
          phone: '+1987654321',
        },
      };
      mockDoctorService.getPatientProfile.mockResolvedValue(mockDetail);

      const req = { user: { userId: 'user-doc-1', roles: ['DOCTOR'] }, ip: '127.0.0.1' };
      const response = await controller.getPatientProfile(req, 'pat-profile-200');

      expect(mockDoctorService.getPatientProfile).toHaveBeenCalledWith('user-doc-1', 'pat-profile-200', '127.0.0.1');
      expect(response.id).toBe('pat-profile-200');
      expect(response.knownAllergies).toContain('Penicillin');
      expect(response.emergencyContact?.name).toBe('Jane Doe');
    });

    it('should throw ForbiddenException if doctor is not authorized to treat patient', async () => {
      mockDoctorService.getPatientProfile.mockRejectedValue(
        new ForbiddenException('Access denied: You do not have valid clinical authorization to access this patient\'s records'),
      );

      const req = { user: { userId: 'user-doc-1', roles: ['DOCTOR'] } };
      await expect(controller.getPatientProfile(req, 'unauthorized-patient')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if patient does not exist', async () => {
      mockDoctorService.getPatientProfile.mockRejectedValue(
        new NotFoundException('Patient not found for identifier: invalid-id'),
      );

      const req = { user: { userId: 'user-doc-1', roles: ['DOCTOR'] } };
      await expect(controller.getPatientProfile(req, 'invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('4. Patient Prescriptions — List (GET /api/v1/doctors/patients/:patientProfileId/prescriptions)', () => {
    it('should return paginated prescriptions list for authorized doctor', async () => {
      const mockPrescriptions = {
        data: [
          {
            id: 'rx-1',
            patientProfileId: 'pat-profile-200',
            title: 'Prescription for Acute Bronchitis',
            category: 'PRESCRIPTION',
            status: 'UPLOADED',
            reportDate: '2026-11-05T09:00:00.000Z',
            prescribedBy: 'Dr. Evelyn Reed',
            medications: [
              {
                name: 'Amoxicillin',
                dosage: '500mg',
                frequency: 'Three times daily',
                duration: '7 days',
              },
            ],
            tags: ['Amoxicillin', 'Acute Bronchitis'],
            verificationStatus: 'VERIFIED',
          },
        ],
        meta: { totalItems: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
      };
      mockDoctorService.getPatientPrescriptions.mockResolvedValue(mockPrescriptions);

      const req = { user: { userId: 'user-doc-1', roles: ['DOCTOR'] }, ip: '127.0.0.1' };
      const response = await controller.getPatientPrescriptions(req, 'pat-profile-200', { page: 1, limit: 10 });

      expect(mockDoctorService.getPatientPrescriptions).toHaveBeenCalledWith('user-doc-1', 'pat-profile-200', { page: 1, limit: 10 }, '127.0.0.1');
      expect(response.data[0].id).toBe('rx-1');
      expect(response.data[0].medications[0].name).toBe('Amoxicillin');
    });

    it('should reject prescription listing for unauthorized doctor with 403', async () => {
      mockDoctorService.getPatientPrescriptions.mockRejectedValue(new ForbiddenException('Access denied'));

      const req = { user: { userId: 'user-doc-1', roles: ['DOCTOR'] } };
      await expect(controller.getPatientPrescriptions(req, 'pat-profile-200', {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('5. Patient Prescriptions — Create (POST /api/v1/doctors/patients/:patientProfileId/prescriptions)', () => {
    const validPrescriptionDto: CreateDoctorPrescriptionDto = {
      title: 'Prescription for Acute Pharyngitis',
      description: 'Sore throat and mild fever for 2 days',
      medications: [
        {
          name: 'Azithromycin',
          dosage: '250mg',
          frequency: 'Once daily',
          duration: '5 days',
          instructions: 'Take 1 hour before meal',
        },
      ],
      diagnosis: 'Acute Pharyngitis',
      notes: 'Stay hydrated',
    };

    it('should successfully create prescription associated with doctor and patient', async () => {
      const mockCreated = {
        id: 'rx-new-1',
        patientProfileId: 'pat-profile-200',
        title: validPrescriptionDto.title,
        description: validPrescriptionDto.description,
        category: 'PRESCRIPTION',
        status: 'UPLOADED',
        prescribedBy: 'Dr. Evelyn Reed',
        doctorName: 'Dr. Evelyn Reed',
        medications: validPrescriptionDto.medications,
        verificationStatus: 'VERIFIED',
        createdAt: '2026-11-05T09:30:00.000Z',
      };
      mockDoctorService.createPatientPrescription.mockResolvedValue(mockCreated);

      const req = { user: { userId: 'user-doc-1', roles: ['DOCTOR'] }, ip: '127.0.0.1' };
      const response = await controller.createPatientPrescription(req, 'pat-profile-200', validPrescriptionDto);

      expect(mockDoctorService.createPatientPrescription).toHaveBeenCalledWith('user-doc-1', 'pat-profile-200', validPrescriptionDto, '127.0.0.1');
      expect(response.id).toBe('rx-new-1');
      expect(response.prescribedBy).toBe('Dr. Evelyn Reed');
    });

    it('should reject prescription creation if medications array is empty', async () => {
      mockDoctorService.createPatientPrescription.mockRejectedValue(new BadRequestException('Prescription must include at least one medication item'));

      const req = { user: { userId: 'user-doc-1', roles: ['DOCTOR'] } };
      await expect(controller.createPatientPrescription(req, 'pat-profile-200', { ...validPrescriptionDto, medications: [] })).rejects.toThrow(BadRequestException);
    });

    it('should reject prescription creation for unauthorized doctor with 403', async () => {
      mockDoctorService.createPatientPrescription.mockRejectedValue(new ForbiddenException('Access denied'));

      const req = { user: { userId: 'user-doc-1', roles: ['DOCTOR'] } };
      await expect(controller.createPatientPrescription(req, 'pat-profile-200', validPrescriptionDto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('6. Patient Vitals — List (GET /api/v1/doctors/patients/:patientProfileId/vitals)', () => {
    it('should return paginated vitals history with BMI and blood pressure string', async () => {
      const mockVitals = {
        data: [
          {
            id: 'vital-1',
            medicalRecordId: 'med-rec-1',
            heightCm: 175,
            weightKg: 70,
            bmi: 22.86,
            systolicBp: 120,
            diastolicBp: 80,
            bloodPressure: '120/80 mmHg',
            pulseBpm: 72,
            respirationRate: 16,
            temperatureC: 36.8,
            bloodSugarMgDl: 95.0,
            oxygenSaturation: 98.0,
            recordedAt: '2026-11-05T09:00:00.000Z',
          },
        ],
        meta: { totalItems: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
      };
      mockDoctorService.getPatientVitals.mockResolvedValue(mockVitals);

      const req = { user: { userId: 'user-doc-1', roles: ['DOCTOR'] }, ip: '127.0.0.1' };
      const response = await controller.getPatientVitals(req, 'pat-profile-200', { page: 1, limit: 10 });

      expect(mockDoctorService.getPatientVitals).toHaveBeenCalledWith('user-doc-1', 'pat-profile-200', { page: 1, limit: 10 }, '127.0.0.1');
      expect(response.data[0].bmi).toBe(22.86);
      expect(response.data[0].bloodPressure).toBe('120/80 mmHg');
    });

    it('should reject vitals listing for unauthorized doctor with 403', async () => {
      mockDoctorService.getPatientVitals.mockRejectedValue(new ForbiddenException('Access denied'));

      const req = { user: { userId: 'user-doc-1', roles: ['DOCTOR'] } };
      await expect(controller.getPatientVitals(req, 'pat-profile-200', {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('7. Patient Vitals — Create (POST /api/v1/doctors/patients/:patientProfileId/vitals)', () => {
    const validVitalsDto: CreateDoctorVitalsDto = {
      heightCm: 180,
      weightKg: 75,
      systolicBp: 118,
      diastolicBp: 78,
      pulseBpm: 70,
      respirationRate: 14,
      temperatureC: 36.6,
      oxygenSaturation: 99,
    };

    it('should successfully record vitals and calculate BMI', async () => {
      const mockRecorded = {
        id: 'vital-new-1',
        medicalRecordId: 'med-rec-auto-1',
        heightCm: 180,
        weightKg: 75,
        bmi: 23.15,
        systolicBp: 118,
        diastolicBp: 78,
        bloodPressure: '118/78 mmHg',
        pulseBpm: 70,
        respirationRate: 14,
        temperatureC: 36.6,
        bloodSugarMgDl: null,
        oxygenSaturation: 99,
        recordedAt: '2026-11-05T09:45:00.000Z',
      };
      mockDoctorService.createPatientVitals.mockResolvedValue(mockRecorded);

      const req = { user: { userId: 'user-doc-1', roles: ['DOCTOR'] }, ip: '127.0.0.1' };
      const response = await controller.createPatientVitals(req, 'pat-profile-200', validVitalsDto);

      expect(mockDoctorService.createPatientVitals).toHaveBeenCalledWith('user-doc-1', 'pat-profile-200', validVitalsDto, '127.0.0.1');
      expect(response.id).toBe('vital-new-1');
      expect(response.bmi).toBe(23.15);
      expect(response.bloodPressure).toBe('118/78 mmHg');
    });

    it('should reject vitals recording if no metrics are provided', async () => {
      mockDoctorService.createPatientVitals.mockRejectedValue(new BadRequestException('At least one vital sign metric must be provided'));

      const req = { user: { userId: 'user-doc-1', roles: ['DOCTOR'] } };
      await expect(controller.createPatientVitals(req, 'pat-profile-200', {})).rejects.toThrow(BadRequestException);
    });

    it('should reject vitals recording if non-existent medicalRecordId is passed', async () => {
      mockDoctorService.createPatientVitals.mockRejectedValue(new NotFoundException('Medical record not found'));

      const req = { user: { userId: 'user-doc-1', roles: ['DOCTOR'] } };
      await expect(controller.createPatientVitals(req, 'pat-profile-200', { ...validVitalsDto, medicalRecordId: 'invalid-rec' })).rejects.toThrow(NotFoundException);
    });

    it('should reject vitals recording for unauthorized doctor with 403', async () => {
      mockDoctorService.createPatientVitals.mockRejectedValue(new ForbiddenException('Access denied'));

      const req = { user: { userId: 'user-doc-1', roles: ['DOCTOR'] } };
      await expect(controller.createPatientVitals(req, 'pat-profile-200', validVitalsDto)).rejects.toThrow(ForbiddenException);
    });
  });
});

