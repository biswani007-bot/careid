import { Test, TestingModule } from '@nestjs/testing';
import { PatientController } from '../presentation/controllers/patient.controller';
import { PatientService } from '../application/use-cases/patient.service';

describe('PatientController (Route Resolution & Completion Endpoints)', () => {
  let controller: PatientController;
  let mockPatientService: any;

  beforeEach(async () => {
    mockPatientService = {
      getOnboardingProgress: jest.fn(),
      getProfileCompletion: jest.fn(),
      register: jest.fn(),
      getRegistrationStatus: jest.fn(),
      resumeRegistration: jest.fn(),
      onboardDemographics: jest.fn(),
      onboardEmergencyInfo: jest.fn(),
      onboardInsurance: jest.fn(),
      onboardHealthCard: jest.fn(),
      onboardFamilyInvite: jest.fn(),
      completeOnboarding: jest.fn(),
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      getPatientDashboard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientController],
      providers: [
        {
          provide: PatientService,
          useValue: mockPatientService,
        },
      ],
    }).compile();

    controller = module.get<PatientController>(PatientController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCompletionPercentage (GET /patients/onboarding/completion)', () => {
    it('should call patientService.getOnboardingProgress and return completionPercentage object', async () => {
      mockPatientService.getOnboardingProgress.mockResolvedValue({
        completionPercentage: 83,
        status: 'DRAFT',
        steps: [{ step: 1, name: 'Identity Verification', completed: true }],
      });

      const req = { user: { userId: 'user-456' } };
      const result = await controller.getCompletionPercentage(req);

      expect(mockPatientService.getOnboardingProgress).toHaveBeenCalledWith('user-456');
      expect(result).toEqual({ completionPercentage: 83 });
    });
  });

  describe('getProfileCompletion (GET /patients/profile/completion)', () => {
    it('should call patientService.getProfileCompletion and return full ProfileCompletionResponseDto', async () => {
      const mockCompletionDto = {
        completionPercentage: 72,
        status: 'DRAFT',
        sections: [
          { section: 'Basic Information', completed: true, missingFields: [] },
          { section: 'Address', completed: false, missingFields: ['currentCity'] },
        ],
      };
      mockPatientService.getProfileCompletion.mockResolvedValue(mockCompletionDto);

      const req = { user: { userId: 'user-456' } };
      const result = await controller.getProfileCompletion(req);

      expect(mockPatientService.getProfileCompletion).toHaveBeenCalledWith('user-456');
      expect(result).toEqual(mockCompletionDto);
      expect(result.completionPercentage).toBe(72);
      expect(result.sections.length).toBe(2);
    });
  });

  describe('getDashboard (GET /patients/me/dashboard)', () => {
    it('should call patientService.getPatientDashboard and return full dashboard aggregates', async () => {
      const mockDashboard = {
        patientProfile: {
          id: 'prof-1',
          patientNumber: 'PT-1001',
          firstName: 'John',
          lastName: 'Doe',
          status: 'ACTIVE',
        },
        healthCard: {
          id: 'card-1',
          cardNumber: 'CARE-1001-2026',
          status: 'ACTIVE',
          qrPayload: 'eyJhbGciOi...',
        },
        activeInsurance: {
          id: 'ins-1',
          providerName: 'CareShield',
          policyNumber: 'POL-999',
        },
        emergencyContact: {
          name: 'Jane Doe',
          relationship: 'SPOUSE',
          phone: '+16505550005',
        },
        recordCounts: {
          total: 5,
          medical: 3,
          dental: 1,
          vision: 1,
        },
        upcomingAppointments: [],
        unreadNotificationsCount: 2,
      };
      mockPatientService.getPatientDashboard.mockResolvedValue(mockDashboard);

      const req = { user: { userId: 'user-456' } };
      const result = await controller.getDashboard(req);

      expect(mockPatientService.getPatientDashboard).toHaveBeenCalledWith('user-456');
      expect(result).toEqual(mockDashboard);
      expect(result.recordCounts.total).toBe(5);
      expect(result.healthCard.cardNumber).toBe('CARE-1001-2026');
      expect(result.unreadNotificationsCount).toBe(2);
    });
  });
});
