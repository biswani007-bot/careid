import { Test, TestingModule } from '@nestjs/testing';
import { TreatmentOfferService } from '../application/use-cases/treatment-offer.service';
import { DatabaseService } from '@database/database.service';
import { ForbiddenException, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { TreatmentOfferStatus, ProcedureCategory } from '../presentation/dto/treatment-offer.dto';

describe('TreatmentOfferService', () => {
  let service: TreatmentOfferService;
  let repoMock: any;
  let dbMock: any;

  beforeEach(async () => {
    repoMock = {
      createOffer: jest.fn(),
      findOfferById: jest.fn(),
      findOffersForDoctor: jest.fn(),
      findOffersForPatient: jest.fn(),
      generateOfferNumber: jest.fn().mockResolvedValue('TO-2026-00001'),
      updateOffer: jest.fn(),
      dispatchOffer: jest.fn(),
      cancelOffer: jest.fn(),
      markOfferReviewing: jest.fn(),
      ratifyOffer: jest.fn(),
      declineOffer: jest.fn(),
      expireOffer: jest.fn(),
      findFinancingOffersForPatient: jest.fn(),
      findFinancingOfferById: jest.fn(),
      findOfferHistoryByAction: jest.fn().mockResolvedValue([]),
      findLatestOfferHistoryByAction: jest.fn().mockResolvedValue(null),
      createHistory: jest.fn().mockResolvedValue({ id: 'hist-1', createdAt: new Date() }),
      findFinancingOfferByTreatmentOfferId: jest.fn(),
      upsertFinancingOffer: jest.fn(),
    };

    dbMock = {
      doctorProfile: {
        findUnique: jest.fn().mockResolvedValue({ id: 'doc-1', isDeleted: false, verificationStatus: 'VERIFIED' }),
      },
      patientProfile: {
        findUnique: jest.fn().mockResolvedValue({ id: 'pat-1', userId: 'pat-user-uuid', user: { phone: '+16505550003', email: 'pat@example.com' } }),
      },
      facility: {
        findUnique: jest.fn(),
      },
      doctorFacility: {
        findFirst: jest.fn(),
      },
      staffMember: {
        findFirst: jest.fn(),
      },
      securityPlatformAuditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-2' }),
      },
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
      },
      treatmentOffer: {
        update: jest.fn().mockResolvedValue({ id: 'offer-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreatmentOfferService,
        {
          provide: 'ITreatmentOfferRepository',
          useValue: repoMock,
        },
        {
          provide: DatabaseService,
          useValue: dbMock,
        },
      ],
    }).compile();

    service = module.get<TreatmentOfferService>(TreatmentOfferService);
  });

  describe('createOffer', () => {
    it('should throw ForbiddenException if caller is not a doctor', async () => {
      dbMock.doctorProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.createOffer('user-1', {
          patientProfileId: 'patient-1',
          facilityId: 'facility-1',
          clinicalIndication: 'Test Indication',
          procedures: [{ procedureCode: 'P-1', procedureName: 'Procedure 1', unitCost: 1000 }],
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if doctor has no active privileges at facility', async () => {
      dbMock.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-1', isDeleted: false });
      dbMock.patientProfile.findUnique.mockResolvedValue({ id: 'pat-1' });
      dbMock.facility.findUnique.mockResolvedValue({ id: 'fac-1' });
      dbMock.doctorFacility.findFirst.mockResolvedValue(null); // No active privilege

      await expect(
        service.createOffer('user-1', {
          patientProfileId: 'pat-1',
          facilityId: 'fac-1',
          clinicalIndication: 'Test',
          procedures: [{ procedureCode: 'P-1', procedureName: 'Procedure 1', unitCost: 1000 }],
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully compute gross and net payable and create draft offer', async () => {
      dbMock.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-1', isDeleted: false, verificationStatus: 'VERIFIED' });
      dbMock.patientProfile.findUnique.mockResolvedValue({ id: 'pat-1' });
      dbMock.facility.findUnique.mockResolvedValue({ id: 'fac-1' });
      dbMock.doctorFacility.findFirst.mockResolvedValue({ id: 'priv-1', isActive: true });

      const mockCreated = {
        id: 'offer-1',
        offerNumber: 'DRAFT-123',
        doctorProfileId: 'doc-1',
        patientProfileId: 'pat-1',
        facilityId: 'fac-1',
        clinicalIndication: 'PCI',
        grossEstimate: 200000,
        discountAmount: 10000,
        netPayable: 190000,
        currency: 'PKR',
        status: TreatmentOfferStatus.DRAFT,
        validUntil: new Date(Date.now() + 86400000),
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        procedures: [],
        history: [],
      };
      repoMock.createOffer.mockResolvedValue(mockCreated);

      const res = await service.createOffer('user-1', {
        patientProfileId: 'pat-1',
        facilityId: 'fac-1',
        clinicalIndication: 'PCI',
        procedures: [
          { procedureCode: 'PCI-1', procedureName: 'Stent', quantity: 2, unitCost: 100000 },
        ],
        discountAmount: 10000,
        validUntil: new Date(Date.now() + 86400000).toISOString(),
      });

      expect(res.id).toBe('offer-1');
      expect(repoMock.createOffer).toHaveBeenCalledWith(
        expect.objectContaining({
          grossEstimate: 200000,
          discountAmount: 10000,
          netPayable: 190000,
        }),
      );
    });

    it('should correctly compute discountPercent (15,000 / 150,000 = 10%) on created offer', async () => {
      dbMock.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-1', isDeleted: false, verificationStatus: 'VERIFIED' });
      dbMock.patientProfile.findUnique.mockResolvedValue({ id: 'pat-1' });
      dbMock.facility.findUnique.mockResolvedValue({ id: 'fac-1' });
      dbMock.doctorFacility.findFirst.mockResolvedValue({ id: 'df-1', isActive: true });
      repoMock.createOffer.mockResolvedValue({
        id: 'offer-discount-test',
        offerNumber: 'TO-2026-00002',
        doctorProfileId: 'doc-1',
        patientProfileId: 'pat-1',
        facilityId: 'fac-1',
        grossEstimate: 150000,
        discountAmount: 15000,
        netPayable: 135000,
        currency: 'PKR',
        status: TreatmentOfferStatus.DRAFT,
        validUntil: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
        procedures: [],
        history: [],
      });

      const res = await service.createOffer('user-doc', {
        patientProfileId: 'pat-1',
        facilityId: 'fac-1',
        clinicalIndication: 'Angiography',
        procedures: [
          { procedureCode: '93458', procedureName: 'Left Heart Catheterization', quantity: 1, unitCost: 150000 },
        ],
        discountAmount: 15000,
        validUntil: new Date(Date.now() + 86400000).toISOString(),
      });

      expect(res.id).toBe('offer-discount-test');
      expect(res.grossEstimate).toBe(150000);
      expect(res.discountAmount).toBe(15000);
      expect(res.discountPercent).toBe(10);
      expect(res.netPayable).toBe(135000);
    });
  });

  describe('dispatchOffer', () => {
    it('should throw ConflictException if offer is not DRAFT', async () => {
      dbMock.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-1', verificationStatus: 'VERIFIED' });
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        doctorProfileId: 'doc-1',
        status: TreatmentOfferStatus.DISPATCHED,
        validUntil: new Date(Date.now() + 86400000),
      });

      await expect(service.dispatchOffer('user-1', 'offer-1')).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException if doctor account is SUSPENDED', async () => {
      dbMock.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-1', verificationStatus: 'SUSPENDED' });

      await expect(service.dispatchOffer('user-1', 'offer-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if doctor account is PENDING verification', async () => {
      dbMock.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-1', verificationStatus: 'PENDING' });

      await expect(service.dispatchOffer('user-1', 'offer-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if doctor user account is INACTIVE', async () => {
      dbMock.doctorProfile.findUnique.mockResolvedValue({
        id: 'doc-1',
        verificationStatus: 'VERIFIED',
        user: { status: 'DEACTIVATED' },
      });

      await expect(service.dispatchOffer('user-1', 'offer-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if discount exceeds 15% and is not approved by supervisor', async () => {
      dbMock.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-1', verificationStatus: 'VERIFIED' });
      dbMock.doctorFacility.findFirst.mockResolvedValue({ id: 'priv-1' });
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        doctorProfileId: 'doc-1',
        facilityId: 'fac-1',
        status: TreatmentOfferStatus.DRAFT,
        validUntil: new Date(Date.now() + 86400000),
        grossEstimate: 100000,
        discountAmount: 20000, // 20% > 15%
        procedures: [{ id: 'p1', procedureCode: 'P-1', procedureName: 'Proc 1', unitCost: 100000 }],
      });
      repoMock.findLatestOfferHistoryByAction.mockResolvedValue(null); // not approved

      await expect(service.dispatchOffer('user-1', 'offer-1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if clinical review is missing on dispatch', async () => {
      dbMock.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-1', verificationStatus: 'VERIFIED' });
      dbMock.doctorFacility.findFirst.mockResolvedValue({ id: 'priv-1', isActive: true });
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        doctorProfileId: 'doc-1',
        facilityId: 'fac-1',
        status: TreatmentOfferStatus.DRAFT,
        validUntil: new Date(Date.now() + 86400000),
        grossEstimate: 1000,
        discountAmount: 0,
        procedures: [{ id: 'p1', procedureCode: 'P-1', procedureName: 'Proc 1', unitCost: 1000 }],
      });
      repoMock.findLatestOfferHistoryByAction.mockResolvedValue(null); // No clinical review

      await expect(service.dispatchOffer('user-1', 'offer-1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if clinical review was REJECTED', async () => {
      dbMock.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-1', verificationStatus: 'VERIFIED' });
      dbMock.doctorFacility.findFirst.mockResolvedValue({ id: 'priv-1', isActive: true });
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        doctorProfileId: 'doc-1',
        facilityId: 'fac-1',
        status: TreatmentOfferStatus.DRAFT,
        validUntil: new Date(Date.now() + 86400000),
        grossEstimate: 1000,
        discountAmount: 0,
        procedures: [{ id: 'p1', procedureCode: 'P-1', procedureName: 'Proc 1', unitCost: 1000 }],
      });
      repoMock.findLatestOfferHistoryByAction.mockImplementation(async (id: string, action: string) => {
        if (action === 'CLINICAL_REVIEW') {
          return { metadata: { reviewStatus: 'REJECTED' } };
        }
        return null;
      });

      await expect(service.dispatchOffer('user-1', 'offer-1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if clinical review status is NEEDS_INFORMATION', async () => {
      dbMock.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-1', verificationStatus: 'VERIFIED' });
      dbMock.doctorFacility.findFirst.mockResolvedValue({ id: 'priv-1', isActive: true });
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        doctorProfileId: 'doc-1',
        facilityId: 'fac-1',
        status: TreatmentOfferStatus.DRAFT,
        validUntil: new Date(Date.now() + 86400000),
        grossEstimate: 1000,
        discountAmount: 0,
        procedures: [{ id: 'p1', procedureCode: 'P-1', procedureName: 'Proc 1', unitCost: 1000 }],
      });
      repoMock.findLatestOfferHistoryByAction.mockImplementation(async (id: string, action: string) => {
        if (action === 'CLINICAL_REVIEW') {
          return { metadata: { reviewStatus: 'NEEDS_INFORMATION' } };
        }
        return null;
      });

      await expect(service.dispatchOffer('user-1', 'offer-1')).rejects.toThrow(ConflictException);
    });

    it('should dispatch draft offer when approved review and attestation statement provided', async () => {
      dbMock.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-1', verificationStatus: 'VERIFIED', licenseNumber: 'LIC-123' });
      dbMock.doctorFacility.findFirst.mockResolvedValue({ id: 'priv-1', isActive: true });
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        doctorProfileId: 'doc-1',
        facilityId: 'fac-1',
        status: TreatmentOfferStatus.DRAFT,
        validUntil: new Date(Date.now() + 86400000),
        grossEstimate: 1000,
        discountAmount: 0,
        procedures: [{ id: 'p1', procedureCode: 'P-1', procedureName: 'Proc 1', unitCost: 1000 }],
        version: 1,
      });
      repoMock.generateOfferNumber.mockResolvedValue('TO-2026-00001');
      repoMock.findOfferHistoryByAction.mockResolvedValue([]);
      repoMock.findLatestOfferHistoryByAction.mockImplementation(async (id: string, action: string) => {
        if (action === 'CLINICAL_REVIEW') {
          return { metadata: { reviewStatus: 'APPROVED' } };
        }
        return null;
      });
      repoMock.dispatchOffer.mockResolvedValue({
        id: 'offer-1',
        offerNumber: 'TO-2026-00001',
        doctorProfileId: 'doc-1',
        patientProfileId: 'pat-1',
        facilityId: 'fac-1',
        grossEstimate: 1000,
        discountAmount: 0,
        netPayable: 1000,
        status: TreatmentOfferStatus.DISPATCHED,
        validUntil: new Date(Date.now() + 86400000),
        dispatchedAt: new Date(),
        version: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.dispatchOffer('user-1', 'offer-1', {
        attestationStatement: 'I attest that these procedures are clinically indicated and medically necessary.',
      });
      expect(res.status).toBe('DISPATCHED');
      expect(res.offerNumber).toBe('TO-2026-00001');
    });

    it('should throw ConflictException if prior attestation was for an earlier version of the offer', async () => {
      dbMock.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-1', verificationStatus: 'VERIFIED', licenseNumber: 'LIC-123' });
      dbMock.doctorFacility.findFirst.mockResolvedValue({ id: 'priv-1', isActive: true });
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        doctorProfileId: 'doc-1',
        facilityId: 'fac-1',
        status: TreatmentOfferStatus.DRAFT,
        validUntil: new Date(Date.now() + 86400000),
        grossEstimate: 1000,
        discountAmount: 0,
        procedures: [{ id: 'p1', procedureCode: 'P-1', procedureName: 'Proc 1', unitCost: 1000 }],
        version: 3, // current version is 3
      });
      repoMock.findLatestOfferHistoryByAction.mockImplementation(async (id: string, action: string) => {
        if (action === 'CLINICAL_REVIEW') {
          return { metadata: { reviewStatus: 'APPROVED' } };
        }
        if (action === 'CLINICIAN_ATTESTATION') {
          return { metadata: { offerVersion: 1 } }; // Stale attestation for version 1
        }
        return null;
      });

      await expect(service.dispatchOffer('user-1', 'offer-1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if clinician attestation is missing on dispatch', async () => {
      dbMock.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-1', verificationStatus: 'VERIFIED', licenseNumber: 'LIC-123' });
      dbMock.doctorFacility.findFirst.mockResolvedValue({ id: 'priv-1', isActive: true });
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        doctorProfileId: 'doc-1',
        patientProfileId: 'pat-1',
        facilityId: 'fac-1',
        status: TreatmentOfferStatus.DRAFT,
        validUntil: new Date(Date.now() + 86400000),
        procedures: [{ procedureCode: 'PCI-001' }],
        grossEstimate: 1000,
        discountAmount: 0,
        netPayable: 1000,
        version: 1,
      });
      repoMock.findLatestOfferHistoryByAction.mockImplementation(async (id: string, action: string) => {
        if (action === 'CLINICAL_REVIEW') {
          return { metadata: { reviewStatus: 'APPROVED' } };
        }
        return null;
      });

      await expect(
        service.dispatchOffer('user-1', 'offer-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('ratifyOffer', () => {
    it('should reject acceptance without signatureConsent', async () => {
      dbMock.patientProfile.findUnique.mockResolvedValue({ id: 'pat-1' });
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        patientProfileId: 'pat-1',
        status: TreatmentOfferStatus.PATIENT_REVIEWING,
        validUntil: new Date(Date.now() + 86400000),
      });

      await expect(
        service.ratifyOffer('user-patient', 'offer-1', { signatureConsent: false as any }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject acceptance if offer already RATIFIED_ACCEPTED', async () => {
      dbMock.patientProfile.findUnique.mockResolvedValue({ id: 'pat-1' });
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        patientProfileId: 'pat-1',
        status: TreatmentOfferStatus.RATIFIED_ACCEPTED,
        validUntil: new Date(Date.now() + 86400000),
      });

      await expect(
        service.ratifyOffer('user-patient', 'offer-1', { signatureConsent: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should ratify offer successfully', async () => {
      dbMock.patientProfile.findUnique.mockResolvedValue({ id: 'pat-1' });
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        patientProfileId: 'pat-1',
        status: TreatmentOfferStatus.PATIENT_REVIEWING,
        validUntil: new Date(Date.now() + 86400000),
      });
      repoMock.ratifyOffer.mockResolvedValue({
        id: 'offer-1',
        offerNumber: 'TO-2026-00001',
        doctorProfileId: 'doc-1',
        patientProfileId: 'pat-1',
        facilityId: 'fac-1',
        grossEstimate: 1000,
        discountAmount: 0,
        netPayable: 1000,
        status: TreatmentOfferStatus.RATIFIED_ACCEPTED,
        validUntil: new Date(Date.now() + 86400000),
        patientRespondedAt: new Date(),
        version: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.ratifyOffer('user-patient', 'offer-1', {
        signatureConsent: true,
        patientResponseNotes: 'Agreed',
      });
      expect(res.status).toBe('RATIFIED_ACCEPTED');
    });

    it('should reject family member access when no direct patient profile is present', async () => {
      dbMock.patientProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.ratifyOffer('user-family', 'offer-1', { signatureConsent: true }, ['FAMILY_MEMBER']),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('facility-level staff authorization', () => {
    it('should allow staff to view offer belonging to their primary facility', async () => {
      dbMock.staffMember.findFirst.mockResolvedValue({
        id: 'staff-1',
        primaryFacilityId: 'fac-1',
        secondaryFacilityId: null,
      });
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        offerNumber: 'TO-2026-00001',
        facilityId: 'fac-1',
        doctorProfileId: 'doc-999',
        status: TreatmentOfferStatus.DISPATCHED,
        validUntil: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
        grossEstimate: 1000,
        discountAmount: 0,
        netPayable: 1000,
        procedures: [],
        history: [],
      });

      const res = await service.getDoctorOfferById('user-staff', 'offer-1', ['STAFF']);
      expect(res.id).toBe('offer-1');
    });

    it('should reject staff from viewing offer of an unauthorized facility (cross-facility)', async () => {
      dbMock.staffMember.findFirst.mockResolvedValue({
        id: 'staff-1',
        primaryFacilityId: 'fac-hospital-A',
        secondaryFacilityId: null,
      });
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        facilityId: 'fac-hospital-B',
        doctorProfileId: 'doc-999',
        status: TreatmentOfferStatus.DISPATCHED,
        validUntil: new Date(Date.now() + 86400000),
      });

      await expect(
        service.getDoctorOfferById('user-staff', 'offer-1', ['STAFF']),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('concurrency protection (expectedVersion)', () => {
    it('should throw ConflictException on expectedVersion mismatch during dispatch', async () => {
      dbMock.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-1', verificationStatus: 'VERIFIED' });
      dbMock.doctorFacility.findFirst.mockResolvedValue({ id: 'priv-1', isActive: true });
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        doctorProfileId: 'doc-1',
        facilityId: 'fac-1',
        status: TreatmentOfferStatus.DRAFT,
        version: 2,
        validUntil: new Date(Date.now() + 86400000),
      });

      await expect(
        service.dispatchOffer('user-1', 'offer-1', { expectedVersion: 1 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('discount ceiling governance', () => {
    it('should reject draft creation if discount exceeds 30%', async () => {
      dbMock.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-1', verificationStatus: 'VERIFIED' });
      dbMock.patientProfile.findUnique.mockResolvedValue({ id: 'pat-1' });
      dbMock.facility.findUnique.mockResolvedValue({ id: 'fac-1' });
      dbMock.doctorFacility.findFirst.mockResolvedValue({ id: 'df-1' });

      await expect(
        service.createOffer('user-1', {
          patientProfileId: 'pat-1',
          facilityId: 'fac-1',
          clinicalIndication: 'Test Indication',
          procedures: [{ procedureCode: 'P-1', procedureName: 'Procedure 1', unitCost: 10000 }],
          discountAmount: 4000, // 40% > 30%
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Clinical Review (Stages 1–6)', () => {
    it('should record clinical review decision and notes in history', async () => {
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        status: TreatmentOfferStatus.DRAFT,
      });

      const res = await service.submitClinicalReview('user-1', 'offer-1', {
        action: 'APPROVED' as any,
        comments: 'Verified medical indication and clinical feasibility',
        reviewCriteria: ['medicalNecessityVerified'],
      }, ['DOCTOR']);

      expect(res.status).toBe('APPROVED');
      expect(res.comments).toContain('Verified medical indication');
      expect(repoMock.createHistory).toHaveBeenCalledWith(
        'offer-1',
        'CLINICAL_REVIEW',
        TreatmentOfferStatus.DRAFT,
        TreatmentOfferStatus.DRAFT,
        'user-1',
        'DOCTOR',
        expect.any(String),
        expect.objectContaining({ reviewStatus: 'APPROVED' }),
      );
    });

    it('should return latest clinical review status', async () => {
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        status: TreatmentOfferStatus.DRAFT,
        createdAt: new Date(),
      });
      repoMock.findLatestOfferHistoryByAction.mockResolvedValue({
        notes: 'Needs additional lab work',
        metadata: {
          reviewStatus: 'NEEDS_INFORMATION',
          comments: 'Needs additional lab work',
          reviewedBy: 'doc-2',
          reviewedAt: new Date().toISOString(),
        },
      });

      const res = await service.getClinicalReview('user-1', 'offer-1');
      expect(res.status).toBe('NEEDS_INFORMATION');
      expect(res.comments).toBe('Needs additional lab work');
    });
  });

  describe('Clinician Attestation (Stages 1–6)', () => {
    it('should reject attestation without truthfulness confirmation', async () => {
      await expect(
        service.submitAttestation('user-1', 'offer-1', {
          statement: 'I attest medical necessity',
          confirmTruthfulness: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate digital signature hash and persist attestation', async () => {
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        doctorProfileId: 'doc-1',
        status: TreatmentOfferStatus.DRAFT,
      });
      dbMock.doctorProfile.findFirst = jest.fn().mockResolvedValue({ licenseNumber: 'LIC-777' });
      repoMock.createHistory.mockResolvedValue({ id: 'attest-1', createdAt: new Date() });

      const res = await service.submitAttestation('user-1', 'offer-1', {
        statement: 'I attest that procedures are clinically indicated and necessary',
        confirmTruthfulness: true,
      });

      expect(res.id).toBe('attest-1');
      expect(res.statement).toContain('clinically indicated');
      expect(res.digitalSignatureHash).toBeDefined();
      expect(res.digitalSignatureHash.length).toBe(64); // SHA-256
    });
  });

  describe('Facility Pricing Rules & Discount Approval', () => {
    it('should return facility pricing rules and discount thresholds', async () => {
      dbMock.facility.findUnique.mockResolvedValue({
        id: 'fac-1',
        name: 'National Hospital',
      });

      const res = await service.getFacilityPricingRules('fac-1');
      expect(res.facilityId).toBe('fac-1');
      expect(res.rules.standardDoctorDiscountThresholdPercent).toBe(15);
      expect(res.rules.maxDiscountCeilingPercent).toBe(30);
    });

    it('should reject discount approval by unauthorized doctor', async () => {
      await expect(
        service.approveDiscount('doc-1', 'offer-1', { approved: true }, ['DOCTOR']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should approve discount by supervisor (FACILITY_ADMIN/ADMIN)', async () => {
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        grossEstimate: 100000,
        discountAmount: 20000,
        status: TreatmentOfferStatus.DRAFT,
      });

      const res = await service.approveDiscount('admin-1', 'offer-1', {
        approved: true,
        comments: 'Indigent care discount approved',
      }, ['FACILITY_ADMIN']);

      expect(res.isApproved).toBe(true);
      expect(res.approvalStatus).toBe('APPROVED');
      expect(res.discountPercent).toBe(20);
    });
  });

  describe('Financing Options & Preview', () => {
    it('should calculate EMI preview across multiple tenures', async () => {
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        netPayable: 200000,
      });

      const res = await service.getFinancingPreview('user-1', 'offer-1', {
        partnerName: 'MediLend Financial',
        interestRate: 8.5,
        downPaymentPercent: 10,
        tenureMonths: [12, 18, 24],
      });

      expect(res.netPayable).toBe(200000);
      expect(res.downPayment).toBe(20000); // 10%
      expect(res.principalAmount).toBe(180000);
      expect(res.simulationEstimateOnly).toBe(true);
      expect(res.options.length).toBe(3);
      expect(res.options[0].monthlyEmi).toBeGreaterThan(0);
    });

    it('should reject financing preview with unsupported partner', async () => {
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        netPayable: 200000,
      });

      await expect(
        service.getFinancingPreview('user-1', 'offer-1', {
          partnerName: 'Unknown Bank Ltd',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject bindFinancing if tenure is not supported by partner', async () => {
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        doctorProfileId: 'doc-1',
        patientProfileId: 'pat-1',
        netPayable: 50000,
      });

      await expect(
        service.bindFinancing('user-1', 'offer-1', {
          partnerName: 'CareCredit Health',
          tenureMonths: [60], // CareCredit only supports [3, 6, 9, 12]
          interestRate: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Notification & SMS Resend (Stage 16)', () => {
    it('should reject resend if offer is in DRAFT state', async () => {
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        doctorProfileId: 'doc-1',
        status: TreatmentOfferStatus.DRAFT,
        validUntil: new Date(Date.now() + 86400000),
      });

      await expect(
        service.resendOfferNotification('user-1', 'offer-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject resend if offer has expired', async () => {
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        doctorProfileId: 'doc-1',
        status: TreatmentOfferStatus.DISPATCHED,
        validUntil: new Date(Date.now() - 10000), // Expired
      });

      await expect(
        service.resendOfferNotification('user-1', 'offer-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject resend if 60s cooldown is active', async () => {
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        doctorProfileId: 'doc-1',
        status: TreatmentOfferStatus.DISPATCHED,
        validUntil: new Date(Date.now() + 86400000),
      });

      repoMock.findOfferHistoryByAction.mockResolvedValue([
        { action: 'NOTIFICATION_RESENT', createdAt: new Date(Date.now() - 10000) }, // 10s ago
      ]);

      await expect(
        service.resendOfferNotification('user-1', 'offer-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should resend notification / SMS reminder to patient successfully', async () => {
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        offerNumber: 'TO-2026-00001',
        doctorProfileId: 'doc-1',
        patientProfileId: 'pat-1',
        facilityId: 'fac-1',
        status: TreatmentOfferStatus.DISPATCHED,
        validUntil: new Date(Date.now() + 86400000),
      });

      repoMock.findOfferHistoryByAction.mockResolvedValue([]);

      dbMock.patientProfile.findUnique.mockResolvedValue({
        id: 'pat-1',
        userId: 'pat-user-uuid',
        user: { phone: '+16505550003', email: 'patient@example.com' },
      });

      const res = await service.resendOfferNotification('user-1', 'offer-1');
      expect(res.treatmentOfferId).toBe('offer-1');
      expect(res.offerNumber).toBe('TO-2026-00001');
      expect(res.channel).toBe('SMS');
      expect(res.recipientMasked).toBe('+165****03');
      expect(['SENT', 'QUEUED']).toContain(res.status);
      expect(res.cooldownSeconds).toBe(60);
      expect(repoMock.createHistory).toHaveBeenCalledWith(
        'offer-1',
        'NOTIFICATION_RESENT',
        TreatmentOfferStatus.DISPATCHED,
        TreatmentOfferStatus.DISPATCHED,
        'user-1',
        'DOCTOR',
        expect.any(String),
        expect.any(Object),
      );
    });
  });
});

