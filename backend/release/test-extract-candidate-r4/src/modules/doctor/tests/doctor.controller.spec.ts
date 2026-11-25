import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { NotFoundException, HttpStatus } from '@nestjs/common';
import { DoctorController } from '../presentation/controllers/doctor.controller';
import { DoctorService } from '../application/use-cases/doctor.service';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { ROLES_KEY } from '@modules/auth/infrastructure/decorators/roles.decorator';

describe('DoctorController — Authenticated Doctor Profile (GET /api/v1/doctors/me)', () => {
  let controller: DoctorController;
  let service: DoctorService;
  let reflector: Reflector;
  let rolesGuard: RolesGuard;

  const mockDoctorProfile = {
    id: 'doctor-uuid-100',
    userId: 'user-doctor-1',
    fullName: 'Dr. Evelyn Reed',
    primarySpecialization: 'Cardiology',
    medicalCouncil: 'Medical Council of India',
    registrationNumber: 'MCI-2018-445566',
    licenseNumber: 'LIC-2018-445566',
    providerIdentifier: 'DOC-360-445566',
    verificationStatus: 'VERIFIED',
    yearsOfExperience: 10,
    isDeleted: false,
    qualifications: [
      {
        id: 'qual-1',
        degreeName: 'MBBS',
        instituteName: 'National Medical Institute',
        passingYear: 2014,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    certifications: [],
    experiences: [],
    documents: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockDoctorService = {
    getMyProfile: jest.fn(),
    getDoctorById: jest.fn(),
    registerDoctor: jest.fn(),
    getDoctors: jest.fn(),
    searchDoctors: jest.fn(),
    getStatistics: jest.fn(),
    getPendingDoctors: jest.fn(),
    updateDoctor: jest.fn(),
    softDeleteDoctor: jest.fn(),
    verifyDoctor: jest.fn(),
    rejectDoctor: jest.fn(),
    suspendDoctor: jest.fn(),
    restoreDoctor: jest.fn(),
    renewLicense: jest.fn(),
    generateQr: jest.fn(),
    getDocuments: jest.fn(),
    attachDocument: jest.fn(),
    getHistory: jest.fn(),
    getDoctorSlots: jest.fn(),
    getPatientMedicalRecords: jest.fn(),
    getPatientTimeline: jest.fn(),
    createPatientEncounter: jest.fn(),
    updatePatientMedicalRecord: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DoctorController],
      providers: [
        { provide: DoctorService, useValue: mockDoctorService },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    controller = module.get<DoctorController>(DoctorController);
    service = module.get<DoctorService>(DoctorService);
  });

  describe('1. Endpoint Definition & Route Integrity', () => {
    it('should have getMyProfile defined on DoctorController', () => {
      expect(controller.getMyProfile).toBeDefined();
    });

    it('should have getDoctorById defined on DoctorController for legacy /:id lookups', () => {
      expect(controller.getDoctorById).toBeDefined();
    });
  });

  describe('2. Role-Based Access Control (RBAC)', () => {
    it('should strictly require the DOCTOR role via @Roles decorator', () => {
      const requiredRoles = reflector.get<string[]>(ROLES_KEY, controller.getMyProfile);
      expect(requiredRoles).toBeDefined();
      expect(requiredRoles).toEqual(['DOCTOR']);
    });

    it('should permit access when user has DOCTOR role', () => {
      const mockContext: any = {
        getHandler: () => controller.getMyProfile,
        getClass: () => DoctorController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: { userId: 'user-doctor-1', roles: ['DOCTOR'] },
          }),
        }),
      };

      const canActivate = rolesGuard.canActivate(mockContext);
      expect(canActivate).toBe(true);
    });

    it('should reject access (403) when user has only PATIENT role', () => {
      const mockContext: any = {
        getHandler: () => controller.getMyProfile,
        getClass: () => DoctorController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: { userId: 'user-patient-1', roles: ['PATIENT'] },
          }),
        }),
      };

      const canActivate = rolesGuard.canActivate(mockContext);
      expect(canActivate).toBe(false);
    });

    it('should reject access (403) when user has STAFF role without DOCTOR', () => {
      const mockContext: any = {
        getHandler: () => controller.getMyProfile,
        getClass: () => DoctorController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: { userId: 'user-staff-1', roles: ['STAFF'] },
          }),
        }),
      };

      const canActivate = rolesGuard.canActivate(mockContext);
      expect(canActivate).toBe(false);
    });

    it('should reject access (401/403) when unauthenticated or user is missing', () => {
      const mockContext: any = {
        getHandler: () => controller.getMyProfile,
        getClass: () => DoctorController,
        switchToHttp: () => ({
          getRequest: () => ({ user: null }),
        }),
      };

      const canActivate = rolesGuard.canActivate(mockContext);
      expect(canActivate).toBe(false);
    });
  });

  describe('3. Execution & Identity Isolation', () => {
    it('should return 200 and the complete profile for an authenticated DOCTOR with a profile', async () => {
      mockDoctorService.getMyProfile.mockResolvedValue(mockDoctorProfile);

      const req = {
        user: { userId: 'user-doctor-1', roles: ['DOCTOR'] },
      };

      const result = await controller.getMyProfile(req);

      expect(mockDoctorService.getMyProfile).toHaveBeenCalledTimes(1);
      expect(mockDoctorService.getMyProfile).toHaveBeenCalledWith('user-doctor-1');
      expect(result).toEqual(mockDoctorProfile);
      expect(result.id).toBe('doctor-uuid-100');
      expect(result.userId).toBe('user-doctor-1');
      expect(result.fullName).toBe('Dr. Evelyn Reed');
    });

    it('should return 404 when authenticated DOCTOR does not have a profile in the registry', async () => {
      mockDoctorService.getMyProfile.mockRejectedValue(
        new NotFoundException('Doctor profile not found for authenticated user'),
      );

      const req = {
        user: { userId: 'user-without-profile', roles: ['DOCTOR'] },
      };

      await expect(controller.getMyProfile(req)).rejects.toThrow(NotFoundException);
      await expect(controller.getMyProfile(req)).rejects.toThrow(
        'Doctor profile not found for authenticated user',
      );
      expect(mockDoctorService.getMyProfile).toHaveBeenCalledWith('user-without-profile');
    });

    it('should strictly use req.user.userId and ignore any client-supplied parameters', async () => {
      mockDoctorService.getMyProfile.mockResolvedValue(mockDoctorProfile);

      // Client attempts to pass a spoofed doctorId in query or params
      const req = {
        user: { userId: 'legitimate-doctor-user-id', roles: ['DOCTOR'] },
        params: { id: 'spoofed-id' },
        query: { doctorId: 'spoofed-id', userId: 'spoofed-user' },
        body: { id: 'spoofed-id' },
      };

      const result = await controller.getMyProfile(req);

      expect(mockDoctorService.getMyProfile).toHaveBeenCalledWith('legitimate-doctor-user-id');
      expect(mockDoctorService.getMyProfile).not.toHaveBeenCalledWith('spoofed-id');
      expect(mockDoctorService.getMyProfile).not.toHaveBeenCalledWith('spoofed-user');
      expect(result.userId).toBe('user-doctor-1');
    });
  });

  describe('4. Preservation of Existing GET /doctors/:id Endpoint', () => {
    it('should route GET /doctors/:id to getDoctorById without shadowing or interference', async () => {
      mockDoctorService.getDoctorById.mockResolvedValue(mockDoctorProfile);

      const result = await controller.getDoctorById('doctor-uuid-100');

      expect(mockDoctorService.getDoctorById).toHaveBeenCalledTimes(1);
      expect(mockDoctorService.getDoctorById).toHaveBeenCalledWith('doctor-uuid-100');
      expect(mockDoctorService.getMyProfile).not.toHaveBeenCalled();
      expect(result).toEqual(mockDoctorProfile);
    });
  });

  describe('5. Doctor Patient Medical Records & Timeline Routes', () => {
    it('should have getPatientMedicalRecords defined on DoctorController', () => {
      expect(controller.getPatientMedicalRecords).toBeDefined();
    });

    it('should have getPatientTimeline defined on DoctorController', () => {
      expect(controller.getPatientTimeline).toBeDefined();
    });

    it('should strictly require DOCTOR role for getPatientMedicalRecords', () => {
      const requiredRoles = reflector.get<string[]>(ROLES_KEY, controller.getPatientMedicalRecords);
      expect(requiredRoles).toBeDefined();
      expect(requiredRoles).toEqual(['DOCTOR']);
    });

    it('should strictly require DOCTOR role for getPatientTimeline', () => {
      const requiredRoles = reflector.get<string[]>(ROLES_KEY, controller.getPatientTimeline);
      expect(requiredRoles).toBeDefined();
      expect(requiredRoles).toEqual(['DOCTOR']);
    });

    it('should delegate getPatientMedicalRecords to DoctorService with caller userId and patientProfileId', async () => {
      const mockResult = { data: [], meta: { totalItems: 0, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false } };
      mockDoctorService.getPatientMedicalRecords.mockResolvedValue(mockResult);

      const req = {
        user: { userId: 'doc-user-1', roles: ['DOCTOR'] },
        ip: '127.0.0.1',
      };
      const query = { page: 1, limit: 10, status: 'FINAL' };

      const res = await controller.getPatientMedicalRecords(req, 'pat-1', query);

      expect(mockDoctorService.getPatientMedicalRecords).toHaveBeenCalledWith(
        'doc-user-1',
        'pat-1',
        query,
        '127.0.0.1',
      );
      expect(res).toEqual(mockResult);
    });

    it('should delegate getPatientTimeline to DoctorService with caller userId and patientProfileId', async () => {
      const mockResult = { data: [], meta: { totalItems: 0, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false } };
      mockDoctorService.getPatientTimeline.mockResolvedValue(mockResult);

      const req = {
        user: { userId: 'doc-user-1', roles: ['DOCTOR'] },
        ip: '127.0.0.1',
      };
      const query = { page: 1, limit: 20 };

      const res = await controller.getPatientTimeline(req, 'pat-1', query);

      expect(mockDoctorService.getPatientTimeline).toHaveBeenCalledWith(
        'doc-user-1',
        'pat-1',
        query,
        '127.0.0.1',
      );
      expect(res).toEqual(mockResult);
    });

    it('should declare patient routes before the generic :id route in controller prototype', () => {
      const controllerProto = Object.getPrototypeOf(controller);
      const propertyNames = Object.getOwnPropertyNames(controllerProto);

      const timelineIndex = propertyNames.indexOf('getPatientTimeline');
      const recordsIndex = propertyNames.indexOf('getPatientMedicalRecords');
      const getByIdIndex = propertyNames.indexOf('getDoctorById');

      expect(timelineIndex).toBeGreaterThan(-1);
      expect(recordsIndex).toBeGreaterThan(-1);
      expect(getByIdIndex).toBeGreaterThan(-1);

      // Verify that patient routes precede getDoctorById
      expect(timelineIndex).toBeLessThan(getByIdIndex);
      expect(recordsIndex).toBeLessThan(getByIdIndex);
    });

    it('should delegate createPatientEncounter to doctorService', async () => {
      const mockResult = { id: 'rec-1', title: 'Consultation' } as any;
      mockDoctorService.createPatientEncounter.mockResolvedValue(mockResult);

      const req = { user: { userId: 'doc-user-1' }, ip: '127.0.0.1' };
      const dto = { title: 'Consultation' } as any;

      const res = await controller.createPatientEncounter(req, 'pat-1', dto);

      expect(mockDoctorService.createPatientEncounter).toHaveBeenCalledWith(
        'doc-user-1',
        'pat-1',
        dto,
        '127.0.0.1',
      );
      expect(res).toEqual(mockResult);
    });

    it('should delegate updatePatientMedicalRecord to doctorService', async () => {
      const mockResult = { id: 'rec-1', title: 'Updated Consultation' } as any;
      mockDoctorService.updatePatientMedicalRecord.mockResolvedValue(mockResult);

      const req = { user: { userId: 'doc-user-1' }, ip: '127.0.0.1' };
      const dto = { title: 'Updated Consultation' } as any;

      const res = await controller.updatePatientMedicalRecord(req, 'pat-1', 'rec-1', dto);

      expect(mockDoctorService.updatePatientMedicalRecord).toHaveBeenCalledWith(
        'doc-user-1',
        'pat-1',
        'rec-1',
        dto,
        '127.0.0.1',
      );
      expect(res).toEqual(mockResult);
    });
  });
});

