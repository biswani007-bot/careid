import { Test, TestingModule } from '@nestjs/testing';
import { SecurityService } from '../application/use-cases/security.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

const mockUserId = 'user-uuid-1';

const mockRepo = {
  createConsent: jest.fn(),
  findConsents: jest.fn(),
  findConsentById: jest.fn(),
  withdrawConsent: jest.fn(),
  confirmConsent: jest.fn(),
  validatePatientExists: jest.fn(),
  validateDoctorExists: jest.fn(),
  validateFacilityExists: jest.fn(),
  findPatientProfileByUserId: jest.fn(),
  findDoctorProfileByUserId: jest.fn(),
  findStaffFacilitiesByUserId: jest.fn(),
  createRetentionPolicy: jest.fn(),
  findRetentionPolicies: jest.fn(),
  findRetentionPolicyById: jest.fn(),
  updateRetentionPolicy: jest.fn(),
  softDeleteRetentionPolicy: jest.fn(),
  createIncident: jest.fn(),
  findIncidents: jest.fn(),
  findIncidentById: jest.fn(),
  resolveIncident: jest.fn(),
  findActiveEncryptionKey: jest.fn(),
  createEncryptionKey: jest.fn(),
  rotateEncryptionKey: jest.fn(),
  createComplianceReport: jest.fn(),
  findComplianceReports: jest.fn(),
  createAuditLog: jest.fn(),
  findAuditLogs: jest.fn(),
  getSecurityDashboardStats: jest.fn(),
};

const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

describe('SecurityService (Phase 23)', () => {
  let service: SecurityService;

  beforeEach(async () => {
    jest.clearAllMocks();
    (mockRepo as any).db = {
      encryptionKey: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityService,
        { provide: 'ISecurityRepository', useValue: mockRepo },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<SecurityService>(SecurityService);
  });

  describe('Consents', () => {
    it('1. should create patient consent record as GRANTED when initiated by patient owner', async () => {
      mockRepo.findPatientProfileByUserId.mockResolvedValue({ id: 'patient-1', userId: mockUserId });
      mockRepo.validatePatientExists.mockResolvedValue(true);
      mockRepo.validateDoctorExists.mockResolvedValue(true);
      mockRepo.validateFacilityExists.mockResolvedValue(true);

      const mockConsent = {
        id: 'consent-1',
        patientId: 'patient-1',
        consentType: 'TREATMENT',
        status: 'GRANTED',
        purpose: 'Medical treatment',
        authorizedDoctorId: 'doc-1',
        authorizedFacilityId: 'fac-1',
        accessScope: 'ALL',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createConsent.mockResolvedValue(mockConsent);
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.createConsent(
        { userId: mockUserId, roles: ['PATIENT'] },
        {
          patientId: 'patient-1',
          purpose: 'Medical treatment',
          authorizedDoctorId: 'doc-1',
          authorizedFacilityId: 'fac-1',
          accessScope: 'ALL',
        },
      );

      expect(res.id).toBe('consent-1');
      expect(res.status).toBe('GRANTED');
      expect(mockRepo.createConsent).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'GRANTED', grantedAt: expect.any(Date) }),
      );
      expect(mockRepo.createAuditLog).toHaveBeenCalled();
    });

    it('should forbid patient from creating consent for another patient', async () => {
      mockRepo.findPatientProfileByUserId.mockResolvedValue({ id: 'p-own', userId: mockUserId });

      await expect(
        service.createConsent(mockUserId, {
          patientId: 'p-other',
          purpose: 'Medical treatment',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if patient does not exist', async () => {
      mockRepo.findPatientProfileByUserId.mockResolvedValue(null);
      mockRepo.validatePatientExists.mockResolvedValue(false);

      await expect(
        service.createConsent(mockUserId, {
          patientId: 'non-existent',
          purpose: 'Medical treatment',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if designated doctor does not exist', async () => {
      mockRepo.findPatientProfileByUserId.mockResolvedValue(null);
      mockRepo.validatePatientExists.mockResolvedValue(true);
      mockRepo.validateDoctorExists.mockResolvedValue(false);

      await expect(
        service.createConsent(mockUserId, {
          patientId: 'patient-1',
          purpose: 'Medical treatment',
          authorizedDoctorId: 'non-existent-doc',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if designated facility does not exist', async () => {
      mockRepo.findPatientProfileByUserId.mockResolvedValue(null);
      mockRepo.validatePatientExists.mockResolvedValue(true);
      mockRepo.validateFacilityExists.mockResolvedValue(false);

      await expect(
        service.createConsent(mockUserId, {
          patientId: 'patient-1',
          purpose: 'Medical treatment',
          authorizedFacilityId: 'non-existent-fac',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('2. should create PENDING consent when initiated by doctor', async () => {
      mockRepo.findPatientProfileByUserId.mockResolvedValue(null);
      mockRepo.validatePatientExists.mockResolvedValue(true);
      mockRepo.validateDoctorExists.mockResolvedValue(true);
      mockRepo.validateFacilityExists.mockResolvedValue(true);

      const mockPendingConsent = {
        id: 'consent-pending-doc',
        patientId: 'patient-1',
        consentType: 'TREATMENT',
        status: 'PENDING',
        purpose: 'Doctor requested consent',
        authorizedDoctorId: 'doc-1',
        accessScope: 'ALL',
        capturedBy: 'doc-user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createConsent.mockResolvedValue(mockPendingConsent);
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.createConsent(
        { userId: 'doc-user-1', roles: ['DOCTOR'] },
        {
          patientId: 'patient-1',
          purpose: 'Doctor requested consent',
          authorizedDoctorId: 'doc-1',
        },
      );

      expect(res.status).toBe('PENDING');
      expect(mockRepo.createConsent).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING', grantedAt: null }),
      );
    });

    it('3. should create PENDING consent when initiated by staff', async () => {
      mockRepo.findPatientProfileByUserId.mockResolvedValue(null);
      mockRepo.validatePatientExists.mockResolvedValue(true);
      mockRepo.validateDoctorExists.mockResolvedValue(true);
      mockRepo.validateFacilityExists.mockResolvedValue(true);

      const mockPendingConsent = {
        id: 'consent-pending-staff',
        patientId: 'patient-1',
        status: 'PENDING',
        purpose: 'Staff assisted intake',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createConsent.mockResolvedValue(mockPendingConsent);
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.createConsent(
        { userId: 'staff-user-1', roles: ['STAFF'] },
        {
          patientId: 'patient-1',
          purpose: 'Staff assisted intake',
        },
      );

      expect(res.status).toBe('PENDING');
      expect(mockRepo.createConsent).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING', grantedAt: null }),
      );
    });

    it('4. should create PENDING consent when initiated by facility administrator', async () => {
      mockRepo.findPatientProfileByUserId.mockResolvedValue(null);
      mockRepo.validatePatientExists.mockResolvedValue(true);
      mockRepo.validateDoctorExists.mockResolvedValue(true);
      mockRepo.validateFacilityExists.mockResolvedValue(true);

      const mockPendingConsent = {
        id: 'consent-pending-facadmin',
        patientId: 'patient-1',
        status: 'PENDING',
        purpose: 'Facility admin intake',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createConsent.mockResolvedValue(mockPendingConsent);
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.createConsent(
        { userId: 'facadmin-user-1', roles: ['FACILITY_ADMIN'] },
        {
          patientId: 'patient-1',
          purpose: 'Facility admin intake',
        },
      );

      expect(res.status).toBe('PENDING');
      expect(mockRepo.createConsent).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING', grantedAt: null }),
      );
    });

    it('5. should create PENDING consent when initiated by administrator (never GRANTED)', async () => {
      mockRepo.findPatientProfileByUserId.mockResolvedValue(null);
      mockRepo.validatePatientExists.mockResolvedValue(true);
      mockRepo.validateDoctorExists.mockResolvedValue(true);
      mockRepo.validateFacilityExists.mockResolvedValue(true);

      const mockPendingConsent = {
        id: 'consent-pending-admin',
        patientId: 'patient-1',
        status: 'PENDING',
        purpose: 'Admin initiated intake',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createConsent.mockResolvedValue(mockPendingConsent);
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.createConsent(
        { userId: 'admin-user-1', roles: ['ADMIN'] },
        {
          patientId: 'patient-1',
          purpose: 'Admin initiated intake',
        },
      );

      expect(res.status).toBe('PENDING');
      expect(mockRepo.createConsent).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING', grantedAt: null }),
      );
    });

    it('6. should create PENDING consent when initiated by super administrator (never GRANTED)', async () => {
      mockRepo.findPatientProfileByUserId.mockResolvedValue(null);
      mockRepo.validatePatientExists.mockResolvedValue(true);
      mockRepo.validateDoctorExists.mockResolvedValue(true);
      mockRepo.validateFacilityExists.mockResolvedValue(true);

      const mockPendingConsent = {
        id: 'consent-pending-superadmin',
        patientId: 'patient-1',
        status: 'PENDING',
        purpose: 'Super admin initiated intake',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createConsent.mockResolvedValue(mockPendingConsent);
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.createConsent(
        { userId: 'superadmin-user-1', roles: ['SUPER_ADMIN'] },
        {
          patientId: 'patient-1',
          purpose: 'Super admin initiated intake',
        },
      );

      expect(res.status).toBe('PENDING');
      expect(mockRepo.createConsent).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING', grantedAt: null }),
      );
    });

    it('should allow patient to confirm their own PENDING consent', async () => {
      mockRepo.findConsentById.mockResolvedValue({
        id: 'consent-pending-1',
        patientId: 'patient-uuid-1',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.findPatientProfileByUserId.mockResolvedValue({
        id: 'patient-uuid-1',
        userId: 'patient-user-1',
      });
      mockRepo.confirmConsent.mockResolvedValue({
        id: 'consent-pending-1',
        patientId: 'patient-uuid-1',
        status: 'GRANTED',
        grantedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.confirmConsent('consent-pending-1', {
        userId: 'patient-user-1',
        roles: ['PATIENT'],
      });

      expect(res.status).toBe('GRANTED');
      expect(mockRepo.confirmConsent).toHaveBeenCalledWith('consent-pending-1');
    });

    it('should reject confirmation of someone elses consent', async () => {
      mockRepo.findConsentById.mockResolvedValue({
        id: 'consent-pending-1',
        patientId: 'patient-uuid-1',
        status: 'PENDING',
      });
      mockRepo.findPatientProfileByUserId.mockResolvedValue({
        id: 'patient-uuid-2', // Different patient!
        userId: 'patient-user-2',
      });

      await expect(
        service.confirmConsent('consent-pending-1', {
          userId: 'patient-user-2',
          roles: ['PATIENT'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject confirmation of non-PENDING consent', async () => {
      mockRepo.findConsentById.mockResolvedValue({
        id: 'consent-already-granted',
        patientId: 'patient-uuid-1',
        status: 'GRANTED',
      });

      await expect(
        service.confirmConsent('consent-already-granted', {
          userId: 'patient-user-1',
          roles: ['PATIENT'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('8 & 9. should reject confirmation of expired PENDING consent and not mutate the record', async () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      mockRepo.findConsentById.mockResolvedValue({
        id: 'consent-expired-1',
        patientId: 'patient-uuid-1',
        status: 'PENDING',
        expiresAt: pastDate,
      });
      mockRepo.createAuditLog.mockResolvedValue({});

      await expect(
        service.confirmConsent('consent-expired-1', {
          userId: 'patient-user-1',
          roles: ['PATIENT'],
        }),
      ).rejects.toThrow(BadRequestException);

      // Verify the record was NOT mutated (confirmConsent repo method never called)
      expect(mockRepo.confirmConsent).not.toHaveBeenCalled();
      expect(mockRepo.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CONSENT_CONFIRMATION_REJECTED_EXPIRED',
          resourceId: 'consent-expired-1',
        }),
      );
    });

    it('should allow patient to withdraw their own consent', async () => {
      mockRepo.findConsentById.mockResolvedValue({
        id: 'consent-1',
        patientId: 'patient-uuid-1',
        status: 'GRANTED',
      });
      mockRepo.findPatientProfileByUserId.mockResolvedValue({
        id: 'patient-uuid-1',
        userId: mockUserId,
      });
      mockRepo.withdrawConsent.mockResolvedValue({
        id: 'consent-1',
        patientId: 'patient-uuid-1',
        status: 'WITHDRAWN',
        withdrawnAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.withdrawConsent('consent-1', {
        userId: mockUserId,
        roles: ['PATIENT'],
      });
      expect(res.status).toBe('WITHDRAWN');
      expect(mockRepo.createAuditLog).toHaveBeenCalled();
    });

    it('should reject patient attempt to withdraw another patients consent', async () => {
      mockRepo.findConsentById.mockResolvedValue({
        id: 'consent-1',
        patientId: 'another-patient-uuid',
        status: 'GRANTED',
      });
      mockRepo.findPatientProfileByUserId.mockResolvedValue({
        id: 'patient-uuid-1',
        userId: mockUserId,
      });

      await expect(
        service.withdrawConsent('consent-1', {
          userId: mockUserId,
          roles: ['PATIENT'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject doctor or staff attempt to withdraw patient consent', async () => {
      mockRepo.findConsentById.mockResolvedValue({
        id: 'consent-1',
        patientId: 'patient-uuid-1',
        status: 'GRANTED',
      });

      await expect(
        service.withdrawConsent('consent-1', {
          userId: 'doc-user-1',
          roles: ['DOCTOR'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow administrator to withdraw any consent', async () => {
      mockRepo.findConsentById.mockResolvedValue({
        id: 'consent-1',
        patientId: 'patient-uuid-1',
        status: 'GRANTED',
      });
      mockRepo.withdrawConsent.mockResolvedValue({
        id: 'consent-1',
        patientId: 'patient-uuid-1',
        status: 'WITHDRAWN',
        withdrawnAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.withdrawConsent('consent-1', {
        userId: 'admin-user-1',
        roles: ['ADMIN'],
      });
      expect(res.status).toBe('WITHDRAWN');
    });

    it('should list consents scoped for patient owner', async () => {
      mockRepo.findPatientProfileByUserId.mockResolvedValue({ id: 'pat-profile-1' });
      mockRepo.findConsents.mockResolvedValue({
        data: [
          {
            id: 'c-1',
            patientId: 'pat-profile-1',
            consentType: 'TREATMENT',
            status: 'GRANTED',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
      });

      const res = await service.getConsents(
        { userId: 'user-pat-1', roles: ['PATIENT'] },
        { status: 'GRANTED', page: 1, limit: 10 },
      );

      expect(res.total).toBe(1);
      expect(res.data[0].id).toBe('c-1');
      expect(mockRepo.findConsents).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 'pat-profile-1', status: 'GRANTED', page: 1, limit: 10 }),
      );
    });

    it('should list consents scoped for doctor', async () => {
      mockRepo.findDoctorProfileByUserId.mockResolvedValue({ id: 'doc-profile-1' });
      mockRepo.findConsents.mockResolvedValue({
        data: [
          {
            id: 'c-2',
            patientId: 'pat-profile-2',
            authorizedDoctorId: 'doc-profile-1',
            status: 'GRANTED',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
      });

      const res = await service.getConsents(
        { userId: 'user-doc-1', roles: ['DOCTOR'] },
        { status: 'GRANTED' },
      );

      expect(res.total).toBe(1);
      expect(mockRepo.findConsents).toHaveBeenCalledWith(
        expect.objectContaining({ authorizedDoctorId: 'doc-profile-1' }),
      );
    });

    it('should allow admin to list all consents with filters', async () => {
      mockRepo.findConsents.mockResolvedValue({
        data: [],
        total: 0,
      });

      const res = await service.getConsents(
        { userId: 'user-admin-1', roles: ['ADMIN'] },
        { patientId: 'pat-any', status: 'PENDING' },
      );

      expect(res.total).toBe(0);
      expect(mockRepo.findConsents).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 'pat-any', status: 'PENDING' }),
      );
    });
  });

  describe('Encryption Key Management & Rotation', () => {
    it('should rotate encryption key and increment version', async () => {
      mockRepo.findActiveEncryptionKey.mockResolvedValue({ id: 'key-1', version: 1, keyIdentifier: 'KMS-v1', createdAt: new Date() });
      mockRepo.rotateEncryptionKey.mockResolvedValue({
        id: 'key-2',
        keyIdentifier: 'HV360-KMS-KEY-v2',
        algorithm: 'AES-256-GCM',
        version: 2,
        status: 'ACTIVE',
        createdAt: new Date(),
      });
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.rotateEncryptionKey(mockUserId);
      expect(res.version).toBe(2);
      expect(mockRepo.createAuditLog).toHaveBeenCalled();
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate automated compliance assessment report', async () => {
      mockRepo.getSecurityDashboardStats.mockResolvedValue({
        activeConsentsCount: 50,
        activeRetentionPoliciesCount: 5,
        openIncidentsCount: 1,
        criticalIncidentsCount: 0,
        activeEncryptionKeyVersion: 2,
        complianceReportsCount: 3,
        totalAuditLogsCount: 500,
      });

      const mockReport = {
        id: 'report-1',
        reportName: 'HIPAA Assessment',
        reportType: 'HIPAA_GDPR',
        generatedAt: new Date(),
        summary: 'Compliant summary',
        createdAt: new Date(),
      };
      mockRepo.createComplianceReport.mockResolvedValue(mockReport);
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.generateComplianceReport(mockUserId, {
        reportName: 'HIPAA Assessment',
        reportType: 'HIPAA_GDPR',
      });

      expect(res.id).toBe('report-1');
      expect(mockRepo.createAuditLog).toHaveBeenCalled();
    });
  });

  describe('Security Incidents', () => {
    it('should report and resolve security incident', async () => {
      const mockIncident = {
        id: 'inc-1',
        title: 'Spike in logins',
        description: 'Failed logins from IP',
        severity: 'HIGH',
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createIncident.mockResolvedValue(mockIncident);
      mockRepo.findIncidentById.mockResolvedValue(mockIncident);
      mockRepo.resolveIncident.mockResolvedValue({ ...mockIncident, status: 'RESOLVED', resolvedBy: mockUserId, resolvedAt: new Date() });
      mockRepo.createAuditLog.mockResolvedValue({});

      const created = await service.createIncident(mockUserId, { title: 'Spike in logins', description: 'Failed logins from IP' });
      expect(created.id).toBe('inc-1');

      const resolved = await service.resolveIncident('inc-1', mockUserId, { resolutionNotes: 'IP blocked' });
      expect(resolved.status).toBe('RESOLVED');
    });
  });

  describe('Integration API Keys', () => {
    it('should create API key and return masked prefix with secret key once', async () => {
      (mockRepo as any).db.encryptionKey.create.mockResolvedValue({
        id: 'key-record-1',
        keyIdentifier: 'api_key:PartnerApp:12345678:1700000000',
        status: 'ACTIVE',
        createdAt: new Date(),
      });
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.createApiKey(mockUserId, { name: 'PartnerApp' });
      expect(res.id).toBe('key-record-1');
      expect(res.name).toBe('PartnerApp');
      expect(res.key).toBeDefined();
      expect(res.key?.startsWith('ak_live_')).toBe(true);
      expect(res.isOperational).toBe(false);
      expect(res.notice).toContain('Demonstration key only');
      expect(mockRepo.createAuditLog).toHaveBeenCalled();
    });

    it('should throw BadRequestException if creating API key in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        await expect(service.createApiKey(mockUserId, { name: 'PartnerApp' })).rejects.toThrow(
          'Integration API keys are disabled in production environment',
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should list API keys with masked prefix', async () => {
      (mockRepo as any).db.encryptionKey.findMany.mockResolvedValue([
        {
          id: 'key-record-1',
          keyIdentifier: 'api_key:PartnerApp:12345678:1700000000',
          status: 'ACTIVE',
          createdAt: new Date(),
        },
      ]);

      const res = await service.getApiKeys();
      expect(res.length).toBe(1);
      expect(res[0].name).toBe('PartnerApp');
      expect(res[0].key).toBeUndefined();
    });

    it('should revoke API key by ID', async () => {
      (mockRepo as any).db.encryptionKey.findUnique.mockResolvedValue({
        id: 'key-record-1',
        keyIdentifier: 'api_key:PartnerApp:12345678:1700000000',
        status: 'ACTIVE',
        createdAt: new Date(),
      });
      (mockRepo as any).db.encryptionKey.update.mockResolvedValue({
        id: 'key-record-1',
        keyIdentifier: 'api_key:PartnerApp:12345678:1700000000',
        status: 'REVOKED',
        createdAt: new Date(),
      });
      mockRepo.createAuditLog.mockResolvedValue({});

      const res = await service.revokeApiKey('key-record-1', mockUserId);
      expect(res.status).toBe('REVOKED');
      expect(mockRepo.createAuditLog).toHaveBeenCalled();
    });
  });
});
