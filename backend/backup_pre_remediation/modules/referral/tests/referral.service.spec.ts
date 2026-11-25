import { Test, TestingModule } from '@nestjs/testing';
import { ReferralService } from '../application/use-cases/referral.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

const mockUserId = 'doctor-uuid-1';

const mockRepo = {
  createReferral: jest.fn(),
  findReferrals: jest.fn(),
  findReferralById: jest.fn(),
  findReferralByNumber: jest.fn(),
  updateReferralStatus: jest.fn(),
  triageReferral: jest.fn(),
  addNote: jest.fn(),
  findNotes: jest.fn(),
  addAttachment: jest.fn(),
  findAttachments: jest.fn(),
  findStatusHistory: jest.fn(),
  getDashboardStats: jest.fn(),
  softDeleteReferral: jest.fn(),
  validatePatientExists: jest.fn(),
  validateFacilityExists: jest.fn(),
  validateDoctorExists: jest.fn(),
  findDoctorProfileByUserId: jest.fn(),
  findDoctorActiveFacilityIds: jest.fn(),
  isDoctorAffiliatedWithFacility: jest.fn(),
  findStaffFacilitiesByUserId: jest.fn(),
  findPatientProfileIdByUserId: jest.fn(),
  findPatientProfileByIdOrUserId: jest.fn(),
  updateReferral: jest.fn(),
};

const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

describe('ReferralService (Milestone 6)', () => {
  let service: ReferralService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        { provide: 'IReferralRepository', useValue: mockRepo },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ReferralService>(ReferralService);
  });

  describe('Referral Lifecycle', () => {
    it('should create patient referral with validated entities and derived facility', async () => {
      mockRepo.validatePatientExists.mockResolvedValue(true);
      mockRepo.validateFacilityExists.mockResolvedValue(true);
      mockRepo.findDoctorProfileByUserId.mockResolvedValue({ id: 'doc-profile-1', fullName: 'Dr. Test' });
      mockRepo.findDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);

      const mockRef = {
        id: 'ref-1',
        referralNumber: 'REF-2026-00001',
        patientId: 'patient-1',
        referringDoctorId: 'doc-profile-1',
        referringFacilityId: 'facility-1',
        receivingFacilityId: 'facility-2',
        referralType: 'SPECIALIST_CONSULTATION',
        priority: 'URGENT',
        status: 'SUBMITTED',
        accessScope: 'REFERRAL_ONLY',
        reasonForReferral: 'Cardiology evaluation',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createReferral.mockResolvedValue(mockRef);

      const res = await service.createReferral(
        { userId: mockUserId, roles: ['DOCTOR'] },
        {
          patientId: 'patient-1',
          receivingFacilityId: 'facility-2',
          reasonForReferral: 'Cardiology evaluation',
          priority: 'URGENT',
        },
      );

      expect(res.id).toBe('ref-1');
      expect(res.referralNumber).toBe('REF-2026-00001');
      expect(mockRepo.createReferral).toHaveBeenCalledWith(
        expect.objectContaining({
          referringDoctorId: 'doc-profile-1',
          referringFacilityId: 'facility-1',
          accessScope: 'REFERRAL_ONLY',
          status: 'SUBMITTED',
        }),
      );
    });

    it('12. should reject ALL_RECORDS scope when initiated by doctor', async () => {
      await expect(
        service.createReferral(
          { userId: mockUserId, roles: ['DOCTOR'] },
          {
            patientId: 'patient-1',
            receivingFacilityId: 'facility-2',
            reasonForReferral: 'Cardiology evaluation',
            accessScope: 'ALL_RECORDS',
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('13. should reject ALL_RECORDS scope when initiated by staff', async () => {
      await expect(
        service.createReferral(
          { userId: 'staff-1', roles: ['STAFF'] },
          {
            patientId: 'patient-1',
            receivingFacilityId: 'facility-2',
            reasonForReferral: 'Staff broad referral attempt',
            accessScope: 'ALL_RECORDS',
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('14. should reject ALL_RECORDS scope when initiated by facility administrator', async () => {
      await expect(
        service.createReferral(
          { userId: 'facadmin-1', roles: ['FACILITY_ADMIN'] },
          {
            patientId: 'patient-1',
            receivingFacilityId: 'facility-2',
            reasonForReferral: 'Facility admin broad referral attempt',
            accessScope: 'ALL_RECORDS',
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('15. should reject ALL_RECORDS scope when initiated by administrator', async () => {
      await expect(
        service.createReferral(
          { userId: 'admin-1', roles: ['ADMIN'] },
          {
            patientId: 'patient-1',
            receivingFacilityId: 'facility-2',
            reasonForReferral: 'Admin broad referral attempt',
            accessScope: 'ALL_RECORDS',
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('16. should reject ALL_RECORDS scope when initiated by super administrator', async () => {
      await expect(
        service.createReferral(
          { userId: 'superadmin-1', roles: ['SUPER_ADMIN'] },
          {
            patientId: 'patient-1',
            receivingFacilityId: 'facility-2',
            reasonForReferral: 'Super admin broad referral attempt',
            accessScope: 'ALL_RECORDS',
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('17. should allow standard REFERRAL_ONLY creation by administrator', async () => {
      mockRepo.validatePatientExists.mockResolvedValue(true);
      mockRepo.validateFacilityExists.mockResolvedValue(true);
      mockRepo.createReferral.mockResolvedValue({
        id: 'ref-admin-1',
        referralNumber: 'REF-2026-00002',
        patientId: 'patient-1',
        receivingFacilityId: 'facility-2',
        accessScope: 'REFERRAL_ONLY',
        status: 'SUBMITTED',
        reasonForReferral: 'Administrative referral transfer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.createReferral(
        { userId: 'admin-1', roles: ['ADMIN'] },
        {
          patientId: 'patient-1',
          receivingFacilityId: 'facility-2',
          reasonForReferral: 'Administrative referral transfer',
          accessScope: 'REFERRAL_ONLY',
        },
      );

      expect(res.accessScope).toBe('REFERRAL_ONLY');
      expect(mockRepo.createReferral).toHaveBeenCalledWith(
        expect.objectContaining({ accessScope: 'REFERRAL_ONLY' }),
      );
    });

    it('should throw NotFoundException if patient does not exist', async () => {
      mockRepo.validatePatientExists.mockResolvedValue(false);

      await expect(
        service.createReferral(
          { userId: mockUserId, roles: ['DOCTOR'] },
          {
            patientId: 'non-existent-patient',
            receivingFacilityId: 'facility-2',
            reasonForReferral: 'Checkup',
          },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if receiving facility does not exist', async () => {
      mockRepo.validatePatientExists.mockResolvedValue(true);
      mockRepo.validateFacilityExists.mockResolvedValue(false);

      await expect(
        service.createReferral(
          { userId: mockUserId, roles: ['DOCTOR'] },
          {
            patientId: 'patient-1',
            receivingFacilityId: 'non-existent-facility',
            reasonForReferral: 'Checkup',
          },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if receiving doctor is not affiliated with receiving facility', async () => {
      mockRepo.validatePatientExists.mockResolvedValue(true);
      mockRepo.validateFacilityExists.mockResolvedValue(true);
      mockRepo.validateDoctorExists.mockResolvedValue(true);
      mockRepo.isDoctorAffiliatedWithFacility.mockResolvedValue(false); // Not affiliated!

      await expect(
        service.createReferral(
          { userId: mockUserId, roles: ['DOCTOR'] },
          {
            patientId: 'patient-1',
            receivingFacilityId: 'facility-2',
            receivingDoctorId: 'unaffiliated-doctor',
            reasonForReferral: 'Checkup',
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should triage referral to ACCEPTED status when receiving facility staff triages', async () => {
      mockRepo.findReferralById.mockResolvedValue({
        id: 'ref-1',
        receivingFacilityId: 'facility-2',
        status: 'SUBMITTED',
      });
      mockRepo.findStaffFacilitiesByUserId.mockResolvedValue({ primaryFacilityId: 'facility-2' });

      const mockRef = {
        id: 'ref-1',
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.triageReferral.mockResolvedValue(mockRef);

      const res = await service.triageReferral(
        'ref-1',
        { userId: 'staff-1', roles: ['STAFF'] },
        {
          outcome: 'APPROVED',
          reason: 'Accepted by cardiology specialist',
        },
      );

      expect(res.status).toBe('ACCEPTED');
    });

    it('should reject triage if caller belongs to another facility', async () => {
      mockRepo.findReferralById.mockResolvedValue({
        id: 'ref-1',
        receivingFacilityId: 'facility-2',
        status: 'SUBMITTED',
      });
      // Caller is doctor only affiliated with facility-1
      mockRepo.findDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
      mockRepo.findDoctorProfileByUserId.mockResolvedValue({ id: 'doc-profile-1' });

      await expect(
        service.triageReferral(
          'ref-1',
          { userId: 'doc-user-1', roles: ['DOCTOR'] },
          {
            outcome: 'APPROVED',
            reason: 'Unauthorized cross-facility triage',
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject triage if referral is already finalized', async () => {
      mockRepo.findReferralById.mockResolvedValue({
        id: 'ref-1',
        receivingFacilityId: 'facility-2',
        status: 'ACCEPTED', // Already accepted!
      });

      await expect(
        service.triageReferral(
          'ref-1',
          { userId: 'admin-1', roles: ['ADMIN'] },
          {
            outcome: 'APPROVED',
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('18. should preserve original REFERRAL_ONLY scope during triage (cannot broaden scope)', async () => {
      mockRepo.findReferralById.mockResolvedValue({
        id: 'ref-scope-1',
        receivingFacilityId: 'facility-2',
        status: 'SUBMITTED',
        accessScope: 'REFERRAL_ONLY',
      });
      mockRepo.findStaffFacilitiesByUserId.mockResolvedValue({ primaryFacilityId: 'facility-2' });
      mockRepo.triageReferral.mockResolvedValue({
        id: 'ref-scope-1',
        status: 'ACCEPTED',
        accessScope: 'REFERRAL_ONLY',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.triageReferral(
        'ref-scope-1',
        { userId: 'staff-1', roles: ['STAFF'] },
        { outcome: 'APPROVED', reason: 'Normal triage' },
      );

      expect(res.accessScope).toBe('REFERRAL_ONLY');
      expect(mockRepo.triageReferral).toHaveBeenCalledWith(
        'ref-scope-1',
        'APPROVED',
        'staff-1',
        undefined,
        'Normal triage',
      );
    });

    it('19. should preserve original REFERRAL_ONLY scope during status mutation', async () => {
      mockRepo.updateReferralStatus.mockResolvedValue({
        id: 'ref-scope-2',
        status: 'COMPLETED',
        accessScope: 'REFERRAL_ONLY',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.updateStatus('ref-scope-2', 'user-1', {
        status: 'COMPLETED',
        reason: 'Treatment finished',
      });

      expect(res.accessScope).toBe('REFERRAL_ONLY');
      expect(mockRepo.updateReferralStatus).toHaveBeenCalledWith(
        'ref-scope-2',
        'COMPLETED',
        'user-1',
        'Treatment finished',
      );
    });
  });

  describe('Clinical Coordination Notes & Attachments', () => {
    it('should add clinical note to referral', async () => {
      mockRepo.findReferralById.mockResolvedValue({ id: 'ref-1' });
      mockRepo.addNote.mockResolvedValue({
        id: 'note-1',
        referralId: 'ref-1',
        authorId: mockUserId,
        authorRole: 'DOCTOR',
        noteText: 'Reviewed ECG prior to intake',
        isPrivate: false,
        createdAt: new Date(),
      });

      const res = await service.addNote('ref-1', mockUserId, 'DOCTOR', {
        noteText: 'Reviewed ECG prior to intake',
      });

      expect(res.id).toBe('note-1');
      expect(res.noteText).toBe('Reviewed ECG prior to intake');
    });
  });

  describe('Update & Query Referrals', () => {
    it('should update referral details when requested by referring doctor', async () => {
      mockRepo.findReferralById.mockResolvedValue({
        id: 'ref-update-1',
        referringDoctorId: 'doc-profile-1',
        status: 'SUBMITTED',
        reasonForReferral: 'Initial reason',
      });
      mockRepo.findDoctorProfileByUserId.mockResolvedValue({ id: 'doc-profile-1' });
      mockRepo.updateReferral = jest.fn().mockResolvedValue({
        id: 'ref-update-1',
        referringDoctorId: 'doc-profile-1',
        status: 'SUBMITTED',
        reasonForReferral: 'Updated reason',
        priority: 'ROUTINE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updateReferral(
        'ref-update-1',
        { userId: 'user-doc-1', roles: ['DOCTOR'] },
        { reasonForReferral: 'Updated reason', priority: 'ROUTINE' },
      );

      expect(result.id).toBe('ref-update-1');
      expect(result.reasonForReferral).toBe('Updated reason');
      expect(mockRepo.updateReferral).toHaveBeenCalledWith(
        'ref-update-1',
        expect.objectContaining({ reasonForReferral: 'Updated reason', priority: 'ROUTINE' }),
      );
    });

    it('should reject update if referral not found', async () => {
      mockRepo.findReferralById.mockResolvedValue(null);

      await expect(
        service.updateReferral('non-existent', { userId: 'admin-1', roles: ['ADMIN'] }, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should query incoming referrals for doctor', async () => {
      mockRepo.findDoctorProfileByUserId.mockResolvedValue({ id: 'doc-profile-incoming' });
      mockRepo.findReferrals.mockResolvedValue({
        data: [
          {
            id: 'ref-in-1',
            receivingDoctorId: 'doc-profile-incoming',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
      });

      const res = await service.getMyIncoming({ userId: 'user-doc-2' });
      expect(res.total).toBe(1);
      expect(mockRepo.findReferrals).toHaveBeenCalledWith(
        expect.objectContaining({ receivingDoctorId: 'doc-profile-incoming' }),
      );
    });

    it('should query outgoing referrals for doctor', async () => {
      mockRepo.findDoctorProfileByUserId.mockResolvedValue({ id: 'doc-profile-outgoing' });
      mockRepo.findReferrals.mockResolvedValue({
        data: [
          {
            id: 'ref-out-1',
            referringDoctorId: 'doc-profile-outgoing',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
      });

      const res = await service.getMyOutgoing({ userId: 'user-doc-3' });
      expect(res.total).toBe(1);
      expect(mockRepo.findReferrals).toHaveBeenCalledWith(
        expect.objectContaining({ referringDoctorId: 'doc-profile-outgoing' }),
      );
    });

    it('should allow Super Admin to create referral with explicit referring facility and doctor', async () => {
      mockRepo.validatePatientExists.mockResolvedValue(true);
      mockRepo.validateFacilityExists.mockResolvedValue(true);
      mockRepo.validateDoctorExists.mockResolvedValue(true);
      mockRepo.createReferral.mockResolvedValue({
        id: 'ref-admin-1',
        referralNumber: 'REF-2026-00099',
        patientId: 'patient-1',
        referringDoctorId: 'doc-ref-1',
        referringFacilityId: 'facility-ref-1',
        receivingFacilityId: 'facility-rec-2',
        status: 'SUBMITTED',
        accessScope: 'REFERRAL_ONLY',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.createReferral(
        { userId: 'admin-super', roles: ['SUPER_ADMIN'] },
        {
          patientId: 'patient-1',
          receivingFacilityId: 'facility-rec-2',
          referringFacilityId: 'facility-ref-1',
          referringDoctorId: 'doc-ref-1',
          reasonForReferral: 'Executive cardiology consultation',
        },
      );

      expect(res.id).toBe('ref-admin-1');
      expect(mockRepo.createReferral).toHaveBeenCalledWith(
        expect.objectContaining({
          referringDoctorId: 'doc-ref-1',
          referringFacilityId: 'facility-ref-1',
          accessScope: 'REFERRAL_ONLY',
        }),
      );
    });

    it('should allow Super Admin to create referral without facility affiliation falling back to receiving facility', async () => {
      mockRepo.validatePatientExists.mockResolvedValue(true);
      mockRepo.validateFacilityExists.mockResolvedValue(true);
      mockRepo.findDoctorProfileByUserId.mockResolvedValue(null);
      mockRepo.findStaffFacilitiesByUserId.mockResolvedValue(null);
      mockRepo.createReferral.mockResolvedValue({
        id: 'ref-admin-2',
        referralNumber: 'REF-2026-00100',
        patientId: 'patient-1',
        referringDoctorId: 'admin-super',
        referringFacilityId: 'facility-rec-2',
        receivingFacilityId: 'facility-rec-2',
        status: 'SUBMITTED',
        accessScope: 'REFERRAL_ONLY',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.createReferral(
        { userId: 'admin-super', roles: ['SUPER_ADMIN'] },
        {
          patientId: 'patient-1',
          receivingFacilityId: 'facility-rec-2',
          reasonForReferral: 'Emergency transfer',
        },
      );

      expect(res.id).toBe('ref-admin-2');
      expect(mockRepo.createReferral).toHaveBeenCalledWith(
        expect.objectContaining({
          referringFacilityId: 'facility-rec-2',
          referringDoctorId: 'admin-super',
        }),
      );
    });

    it('should return paginated referrals with structured meta envelope { total, page, limit, totalPages }', async () => {
      mockRepo.findReferrals.mockResolvedValue({
        data: [
          {
            id: 'ref-page-1',
            patientId: 'p-1',
            referringDoctorId: 'd-1',
            referringFacilityId: 'f-1',
            receivingFacilityId: 'f-2',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 45,
      });

      const res = await service.getReferrals(
        { page: 2, limit: 10 },
        { userId: 'admin-1', roles: ['ADMIN'] },
      );

      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(45);
      expect(res.meta).toEqual({
        total: 45,
        page: 2,
        limit: 10,
        totalPages: 5,
      });
    });

    it('should enrich referrals with batch patient, doctor, and facility summaries when available', async () => {
      mockRepo.findReferrals.mockResolvedValue({
        data: [
          {
            id: 'ref-enrich-1',
            patientId: 'patient-uuid-1',
            referringDoctorId: 'doctor-uuid-1',
            receivingDoctorId: 'doctor-uuid-2',
            referringFacilityId: 'fac-1',
            receivingFacilityId: 'fac-2',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
      });

      (mockRepo as any).findPatientsSummaries = jest.fn().mockResolvedValue(
        new Map([
          ['patient-uuid-1', { id: 'patient-uuid-1', fullName: 'Jane Doe', mrn: 'MRN-101' }],
        ]),
      );
      (mockRepo as any).findDoctorsSummaries = jest.fn().mockResolvedValue(
        new Map([
          ['doctor-uuid-1', { id: 'doctor-uuid-1', fullName: 'Dr. Alice' }],
          ['doctor-uuid-2', { id: 'doctor-uuid-2', fullName: 'Dr. Bob' }],
        ]),
      );
      (mockRepo as any).findFacilitiesSummaries = jest.fn().mockResolvedValue(
        new Map([
          ['fac-1', { id: 'fac-1', name: 'General Hospital' }],
          ['fac-2', { id: 'fac-2', name: 'Specialty Clinic' }],
        ]),
      );

      const res = await service.getReferrals(
        { page: 1, limit: 10 },
        { userId: 'admin-1', roles: ['ADMIN'] },
      );

      expect(res.data[0].patient).toEqual({ id: 'patient-uuid-1', fullName: 'Jane Doe', mrn: 'MRN-101' });
      expect(res.data[0].referringDoctor).toEqual({ id: 'doctor-uuid-1', fullName: 'Dr. Alice' });
      expect(res.data[0].receivingDoctor).toEqual({ id: 'doctor-uuid-2', fullName: 'Dr. Bob' });
      expect(res.data[0].referringFacility).toEqual({ id: 'fac-1', name: 'General Hospital' });
      expect(res.data[0].receivingFacility).toEqual({ id: 'fac-2', name: 'Specialty Clinic' });
    });

    it('should allow getReferralById for authorized doctor affiliated with receiving facility', async () => {
      mockRepo.findReferralById.mockResolvedValue({
        id: 'ref-by-id-1',
        referralNumber: 'REF-2026-00010',
        patientId: 'p-1',
        referringDoctorId: 'doc-other',
        referringFacilityId: 'fac-1',
        receivingFacilityId: 'fac-2',
        status: 'SUBMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.findDoctorProfileByUserId.mockResolvedValue({ id: 'doc-local-id' });
      mockRepo.findDoctorActiveFacilityIds.mockResolvedValue(['fac-2']);

      const res = await service.getReferralById('ref-by-id-1', {
        userId: 'user-doc-affiliated',
        roles: ['DOCTOR'],
      });

      expect(res.id).toBe('ref-by-id-1');
    });

    it('should reject getReferralById for unauthorized doctor from unrelated facility', async () => {
      mockRepo.findReferralById.mockResolvedValue({
        id: 'ref-by-id-2',
        referralNumber: 'REF-2026-00020',
        patientId: 'p-1',
        referringDoctorId: 'doc-other',
        referringFacilityId: 'fac-1',
        receivingFacilityId: 'fac-2',
        status: 'SUBMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepo.findDoctorProfileByUserId.mockResolvedValue({ id: 'doc-unaffiliated-id' });
      mockRepo.findDoctorActiveFacilityIds.mockResolvedValue(['fac-99']);

      await expect(
        service.getReferralById('ref-by-id-2', {
          userId: 'user-doc-unrelated',
          roles: ['DOCTOR'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('CareID Staging Referral Dual-ID & Backward Compatibility Fixes', () => {
    const historicalUserId = 'fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6';
    const canonicalProfileId = '787e5187-7859-4320-bb1a-465a57dd086a';

    it('1. should normalize referral creation using User ID to canonical PatientProfile ID', async () => {
      mockRepo.findPatientProfileByIdOrUserId.mockResolvedValue({
        id: canonicalProfileId,
        userId: historicalUserId,
      });
      mockRepo.validateFacilityExists.mockResolvedValue(true);
      mockRepo.findDoctorProfileByUserId.mockResolvedValue({ id: 'doc-profile-1' });
      mockRepo.findDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
      mockRepo.createReferral.mockResolvedValue({
        id: 'ref-new-user-id',
        referralNumber: 'REF-2026-00055',
        patientId: canonicalProfileId,
        referringDoctorId: 'doc-profile-1',
        referringFacilityId: 'facility-1',
        receivingFacilityId: 'facility-2',
        status: 'SUBMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.createReferral(
        { userId: 'doc-user-1', roles: ['DOCTOR'] },
        {
          patientId: historicalUserId, // Passed User.id
          receivingFacilityId: 'facility-2',
          reasonForReferral: 'Cardiology follow-up',
        },
      );

      expect(res.patientId).toBe(canonicalProfileId);
      expect(mockRepo.createReferral).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: canonicalProfileId, // Verified stored as PatientProfile.id!
        }),
      );
    });

    it('2. should accept referral creation using PatientProfile ID directly', async () => {
      mockRepo.findPatientProfileByIdOrUserId.mockResolvedValue({
        id: canonicalProfileId,
        userId: historicalUserId,
      });
      mockRepo.validateFacilityExists.mockResolvedValue(true);
      mockRepo.findDoctorProfileByUserId.mockResolvedValue({ id: 'doc-profile-1' });
      mockRepo.findDoctorActiveFacilityIds.mockResolvedValue(['facility-1']);
      mockRepo.createReferral.mockResolvedValue({
        id: 'ref-new-profile-id',
        referralNumber: 'REF-2026-00056',
        patientId: canonicalProfileId,
        referringDoctorId: 'doc-profile-1',
        referringFacilityId: 'facility-1',
        receivingFacilityId: 'facility-2',
        status: 'SUBMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.createReferral(
        { userId: 'doc-user-1', roles: ['DOCTOR'] },
        {
          patientId: canonicalProfileId, // Passed PatientProfile.id directly
          receivingFacilityId: 'facility-2',
          reasonForReferral: 'Endocrinology consult',
        },
      );

      expect(res.patientId).toBe(canonicalProfileId);
      expect(mockRepo.createReferral).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: canonicalProfileId,
        }),
      );
    });

    it('3. should retrieve existing referral REF-CAREID-2026-001 stored with historical User ID', async () => {
      const historicalReferral = {
        id: '226ad0ab-0e15-4ddb-a212-27f0c3963203',
        referralNumber: 'REF-CAREID-2026-001',
        patientId: historicalUserId, // stored with users.id
        referringDoctorId: 'doc-1',
        referringFacilityId: 'fac-1',
        receivingFacilityId: 'fac-2',
        status: 'COMPLETED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepo.findReferralById.mockResolvedValue(historicalReferral);
      mockRepo.findPatientProfileByIdOrUserId.mockResolvedValue({
        id: canonicalProfileId,
        userId: historicalUserId,
      });

      const res = await service.getReferralById('226ad0ab-0e15-4ddb-a212-27f0c3963203', {
        userId: historicalUserId,
        roles: ['PATIENT'],
      });

      expect(res.id).toBe('226ad0ab-0e15-4ddb-a212-27f0c3963203');
      expect(res.referralNumber).toBe('REF-CAREID-2026-001');
      expect(res.patientId).toBe(historicalUserId);
    });

    it('4. should allow patient to filter referrals using either User ID or PatientProfile ID', async () => {
      mockRepo.findPatientProfileByIdOrUserId.mockResolvedValue({
        id: canonicalProfileId,
        userId: historicalUserId,
      });
      mockRepo.findReferrals.mockResolvedValue({
        data: [
          {
            id: '226ad0ab-0e15-4ddb-a212-27f0c3963203',
            referralNumber: 'REF-CAREID-2026-001',
            patientId: historicalUserId,
            referringDoctorId: 'd-1',
            referringFacilityId: 'f-1',
            receivingFacilityId: 'f-2',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
      });

      // Query with User ID
      const res1 = await service.getReferrals(
        { patientId: historicalUserId },
        { userId: historicalUserId, roles: ['PATIENT'] },
      );
      expect(res1.data).toHaveLength(1);

      // Query with Profile ID
      const res2 = await service.getReferrals(
        { patientId: canonicalProfileId },
        { userId: historicalUserId, roles: ['PATIENT'] },
      );
      expect(res2.data).toHaveLength(1);
    });

    it('5. should reject patient attempting to view referrals for another patient (ForbiddenException)', async () => {
      mockRepo.findPatientProfileByIdOrUserId.mockResolvedValue({
        id: canonicalProfileId,
        userId: historicalUserId,
      });

      await expect(
        service.getReferrals(
          { patientId: 'other-patient-uuid-999' },
          { userId: historicalUserId, roles: ['PATIENT'] },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('6. should handle page=0, page=1, and custom pagination with valid bounds', async () => {
      mockRepo.findReferrals.mockResolvedValue({
        data: [],
        total: 0,
      });

      const res0 = await service.getReferrals(
        { page: 0, limit: 10 },
        { userId: 'admin-1', roles: ['ADMIN'] },
      );
      expect(res0.meta.page).toBe(1); // Clamped from 0 to 1
      expect(mockRepo.findReferrals).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
      );

      const res1 = await service.getReferrals(
        { page: 1, limit: 20 },
        { userId: 'admin-1', roles: ['ADMIN'] },
      );
      expect(res1.meta.page).toBe(1);
    });

    it('7. should safely handle missing patient or facility summaries without throwing', async () => {
      mockRepo.findReferralById.mockResolvedValue({
        id: 'ref-missing-summaries',
        referralNumber: 'REF-2026-99999',
        patientId: 'unknown-patient-id',
        referringDoctorId: 'unknown-doc-id',
        referringFacilityId: 'unknown-fac-1',
        receivingFacilityId: 'unknown-fac-2',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.getReferralById('ref-missing-summaries', {
        userId: 'admin-1',
        roles: ['ADMIN'],
      });

      expect(res.id).toBe('ref-missing-summaries');
      expect(res.patient).toBeUndefined();
    });

    it('8. should validate Super Admin referral creation and reject when receiving facility does not exist', async () => {
      mockRepo.findPatientProfileByIdOrUserId.mockResolvedValue({
        id: canonicalProfileId,
        userId: historicalUserId,
      });
      mockRepo.validateFacilityExists.mockResolvedValue(false); // Invalid receiving facility

      await expect(
        service.createReferral(
          { userId: 'super-admin-uuid', roles: ['SUPER_ADMIN'] },
          {
            patientId: historicalUserId,
            receivingFacilityId: 'non-existent-facility',
            reasonForReferral: 'Emergency transfer',
          },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
