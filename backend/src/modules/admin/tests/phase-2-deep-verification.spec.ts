import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AdminService } from '../application/use-cases/admin.service';
import { ReferralService } from '@modules/referral/application/use-cases/referral.service';
import { SecurityService } from '@modules/security/application/use-cases/security.service';
import { ReportingService } from '@modules/reports/application/use-cases/reports.service';
import { SupportService } from '@modules/support/application/use-cases/support.service';
import { PetService } from '@modules/pet/application/use-cases/pet.service';
import { FinancingService } from '@modules/financing/application/use-cases/financing.service';
import { Logger } from 'nestjs-pino';

describe('CareID Phase 2 Deep Verification & Security Audit Suite', () => {
  const mockAdminId = 'admin-uuid-1';
  const mockPatientId = 'patient-user-1';
  const mockDoctorAId = 'doctor-uuid-A';
  const mockDoctorBId = 'doctor-uuid-B';

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  };

  // ─── 1. Authentication Architecture & Password vs OTP Integrity ───────────

  describe('1. Authentication Architecture & Role-Specific Credential Enforcement', () => {
    let adminService: AdminService;
    let mockAdminRepo: any;

    beforeEach(async () => {
      mockAdminRepo = {
        findUserById: jest.fn(),
        resetUserPassword: jest.fn(),
        createAuditLog: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AdminService,
          { provide: 'IAdminRepository', useValue: mockAdminRepo },
          { provide: Logger, useValue: mockLogger },
        ],
      }).compile();

      adminService = module.get<AdminService>(AdminService);
    });

    it('should strictly reject administrator password reset for OTP-only PATIENT accounts', async () => {
      mockAdminRepo.findUserById.mockResolvedValue({
        id: mockPatientId,
        phone: '+923001234567',
        status: 'ACTIVE',
        roles: ['PATIENT'],
      });

      await expect(
        adminService.resetUserPassword(mockPatientId, mockAdminId, {
          newPassword: 'AttemptedPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockAdminRepo.resetUserPassword).not.toHaveBeenCalled();
    });

    it('should strictly reject administrator password reset for OTP-only FAMILY_MEMBER accounts', async () => {
      mockAdminRepo.findUserById.mockResolvedValue({
        id: 'family-user-1',
        phone: '+923009999999',
        status: 'ACTIVE',
        roles: ['FAMILY_MEMBER'],
      });

      await expect(
        adminService.resetUserPassword('family-user-1', mockAdminId, {
          newPassword: 'AttemptedPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockAdminRepo.resetUserPassword).not.toHaveBeenCalled();
    });

    it('should permit password reset only for administrative accounts (ADMIN, SUPER_ADMIN)', async () => {
      mockAdminRepo.findUserById.mockResolvedValue({
        id: 'admin-target-2',
        email: 'subadmin@careid.test',
        status: 'ACTIVE',
        roles: ['ADMIN'],
      });
      mockAdminRepo.resetUserPassword.mockResolvedValue(undefined);
      mockAdminRepo.createAuditLog.mockResolvedValue({});

      const result = await adminService.resetUserPassword('admin-target-2', mockAdminId, {
        newPassword: 'ValidAdminPassword123!',
      });

      expect(result.userId).toBe('admin-target-2');
      expect(mockAdminRepo.resetUserPassword).toHaveBeenCalled();
      expect(mockAdminRepo.createAuditLog).toHaveBeenCalledWith(
        mockAdminId,
        'ADMIN_PASSWORD_RESET',
        expect.any(String),
        undefined,
      );
    });
  });

  // ─── 2. Referral Scoping & Clinical Access Boundaries ─────────────────────

  describe('2. Referral Privacy & Multi-Doctor Access Control', () => {
    let referralService: ReferralService;
    let mockReferralRepo: any;

    beforeEach(async () => {
      mockReferralRepo = {
        findReferrals: jest.fn(),
        findDoctorProfileByUserId: jest.fn(),
        findPatientProfileIdByUserId: jest.fn(),
        findStaffFacilitiesByUserId: jest.fn(),
      };

      referralService = new ReferralService(mockReferralRepo, mockLogger as any);
    });

    it('should forbid Doctor A from querying Doctor B private referrals', async () => {
      mockReferralRepo.findDoctorProfileByUserId.mockResolvedValue({ id: 'doc-profile-A' });

      const doctorACaller = { userId: mockDoctorAId, roles: ['DOCTOR'] };

      await expect(
        referralService.getReferrals({ referringDoctorId: 'doc-profile-B' }, doctorACaller),
      ).rejects.toThrow(ForbiddenException);

      expect(mockReferralRepo.findReferrals).not.toHaveBeenCalled();
    });

    it('should forbid Patient A from querying Patient B referrals', async () => {
      mockReferralRepo.findPatientProfileIdByUserId.mockResolvedValue('patient-profile-A');

      const patientACaller = { userId: 'patient-A', roles: ['PATIENT'] };

      await expect(
        referralService.getReferrals({ patientId: 'patient-profile-B' }, patientACaller),
      ).rejects.toThrow(ForbiddenException);

      expect(mockReferralRepo.findReferrals).not.toHaveBeenCalled();
    });
  });

  // ─── 3. Executive Reporting Partial-Data Transparency ─────────────────────

  describe('3. Executive Reports Partial-Data Resilience', () => {
    let reportsService: ReportingService;
    let mockReportsRepo: any;

    beforeEach(async () => {
      mockReportsRepo = {
        getExecutiveDashboardData: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ReportingService,
          { provide: 'IReportsRepository', useValue: mockReportsRepo },
          { provide: Logger, useValue: mockLogger },
        ],
      }).compile();

      reportsService = module.get<ReportingService>(ReportingService);
    });

    it('should surface isPartialData and unavailableMetrics when database queries fail', async () => {
      mockReportsRepo.getExecutiveDashboardData.mockResolvedValue({
        platformOverview: { totalPatients: 100, totalAppointments: 0 },
        isPartialData: true,
        unavailableMetrics: ['totalAppointments'],
        systemHealth: { status: 'DEGRADED', database: 'CONNECTED', timestamp: new Date().toISOString() },
      });

      const res = await reportsService.getExecutiveDashboard();

      expect(res.isPartialData).toBe(true);
      expect(res.unavailableMetrics).toContain('totalAppointments');
      expect(res.systemHealth?.status).toBe('DEGRADED');
    });
  });

  // ─── 4. Support Tickets Ownership & RBAC ──────────────────────────────────

  describe('4. Support Tickets Ownership & Staff Scoping', () => {
    let supportService: SupportService;
    let mockSupportRepo: any;

    const mockTicket = {
      id: 'ticket-1',
      ticketNumber: 'TKT-2026-00001',
      userId: 'user-patient-1',
      subject: 'Lab download issue',
      description: 'Timeout error',
      category: 'TECHNICAL',
      priority: 'MEDIUM',
      status: 'OPEN',
      assignedTo: null,
      replies: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(async () => {
      mockSupportRepo = {
        findTicketById: jest.fn().mockResolvedValue(mockTicket),
        updateTicket: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SupportService,
          { provide: 'ISupportRepository', useValue: mockSupportRepo },
        ],
      }).compile();

      supportService = module.get<SupportService>(SupportService);
    });

    it('should reject non-owner patient from viewing another users support ticket', async () => {
      await expect(
        supportService.getTicketById('ticket-1', 'attacker-user', ['PATIENT']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent regular patient from altering ticket status or assignment', async () => {
      await expect(
        supportService.updateTicket('ticket-1', { status: 'CLOSED' }, 'user-patient-1', ['PATIENT']),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── 5. Pet Health Records Ownership ──────────────────────────────────────

  describe('5. Pet Health Records Ownership Scoping', () => {
    let petService: PetService;
    let mockPetRepo: any;

    const mockPet = {
      id: 'pet-1',
      ownerUserId: 'owner-user-1',
      name: 'Buddy',
      species: 'DOG',
      vaccinations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(async () => {
      mockPetRepo = {
        findPetById: jest.fn().mockResolvedValue(mockPet),
        deletePet: jest.fn().mockResolvedValue(true),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PetService,
          { provide: 'IPetRepository', useValue: mockPetRepo },
        ],
      }).compile();

      petService = module.get<PetService>(PetService);
    });

    it('should prevent unauthorized user from deleting anothers pet profile', async () => {
      await expect(
        petService.deletePet('pet-1', 'unauthorized-user', ['PATIENT']),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPetRepo.deletePet).not.toHaveBeenCalled();
    });
  });

  // ─── 6. Financing Application Boundaries ──────────────────────────────────

  describe('6. Financing Assistance Ownership & Review Permissions', () => {
    let financingService: FinancingService;
    let mockFinancingRepo: any;

    const mockApp = {
      id: 'fin-1',
      applicationNumber: 'FIN-2026-00001',
      userId: 'patient-user-1',
      optionId: 'opt-zerocost-care',
      partnerName: 'CareCredit Health',
      requestedAmount: 50000,
      tenureMonths: 6,
      monthlyEstimatedEmi: 8333,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(async () => {
      mockFinancingRepo = {
        findApplicationById: jest.fn().mockResolvedValue(mockApp),
        updateApplicationStatus: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FinancingService,
          { provide: 'IFinancingRepository', useValue: mockFinancingRepo },
        ],
      }).compile();

      financingService = module.get<FinancingService>(FinancingService);
    });

    it('should prevent non-staff user from mutating financing application status', async () => {
      await expect(
        financingService.updateStatus('fin-1', ['PATIENT'], { status: 'APPROVED' }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockFinancingRepo.updateApplicationStatus).not.toHaveBeenCalled();
    });
  });
});
