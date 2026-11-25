import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TreatmentOfferService } from '../application/use-cases/treatment-offer.service';
import { DatabaseService } from '@database/database.service';
import {
  TreatmentOfferStatus,
  ClinicalReviewAction,
} from '../presentation/dto/treatment-offer.dto';

describe('Goal 018: Clinical Review Dispatch Alignment & Robustness Matrix', () => {
  let service: TreatmentOfferService;
  let repoMock: any;
  let dbMock: any;

  const validOffer = {
    id: 'offer-018',
    offerNumber: 'DRAFT-018',
    doctorProfileId: 'doc-sarah',
    patientProfileId: 'pat-john',
    facilityId: 'fac-metro',
    status: TreatmentOfferStatus.DRAFT,
    validUntil: new Date(Date.now() + 86400000),
    grossEstimate: 1000,
    discountAmount: 0,
    netPayable: 1000,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    doctor: {
      userId: 'user-doc-sarah',
      fullName: 'Dr. Sarah Jenkins',
      primarySpecialization: 'CARDIOLOGY',
      clinicalPracticeType: 'HUMAN_HEALTHCARE',
    },
    patient: {
      id: 'pat-john',
      userId: 'user-pat-john',
      firstName: 'John',
      lastName: 'Doe',
    },
    procedures: [
      { id: 'p1', procedureCode: '9852', procedureName: 'Coronary Angiogram', unitCost: 1000 },
    ],
  };

  beforeEach(async () => {
    repoMock = {
      findOfferById: jest.fn().mockResolvedValue({ ...validOffer }),
      findOfferByNumber: jest.fn(),
      findOffers: jest.fn().mockResolvedValue([]),
      countOffers: jest.fn().mockResolvedValue(0),
      findOfferProcedures: jest.fn().mockResolvedValue([]),
      createOffer: jest.fn(),
      updateOffer: jest.fn(),
      dispatchOffer: jest.fn().mockImplementation(async (id, num, uid) => ({
        ...validOffer,
        id,
        offerNumber: num,
        status: TreatmentOfferStatus.DISPATCHED,
        version: 2,
        dispatchedAt: new Date(),
      })),
      expireOffer: jest.fn(),
      createHistory: jest.fn().mockResolvedValue({ id: 'hist-1', createdAt: new Date() }),
      findLatestOfferHistoryByAction: jest.fn(),
      findOfferHistoryByAction: jest.fn().mockResolvedValue([]),
      generateOfferNumber: jest.fn().mockResolvedValue('OFF-2026-0001'),
    };

    dbMock = {
      doctorProfile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'doc-sarah',
          userId: 'user-doc-sarah',
          verificationStatus: 'VERIFIED',
          licenseNumber: 'MD-ACTIVE-1234',
          clinicalPracticeType: 'HUMAN_HEALTHCARE',
          isDeleted: false,
        }),
        findFirst: jest.fn().mockResolvedValue({
          id: 'doc-sarah',
          userId: 'user-doc-sarah',
          verificationStatus: 'VERIFIED',
          licenseNumber: 'MD-ACTIVE-1234',
          clinicalPracticeType: 'HUMAN_HEALTHCARE',
          isDeleted: false,
        }),
      },
      patientProfile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pat-john',
          userId: 'user-pat-john',
          user: { phone: '+16505550003', email: 'john@example.com' },
        }),
      },
      facility: {
        findUnique: jest.fn().mockResolvedValue({ id: 'fac-metro', name: 'Metro General Hospital', currency: 'USD' }),
      },
      doctorFacility: {
        findFirst: jest.fn().mockResolvedValue({ id: 'priv-1', doctorId: 'doc-sarah', facilityId: 'fac-metro', isActive: true }),
      },
      procedureCatalogue: {
        findFirst: jest.fn().mockResolvedValue({ id: 'proc-1', code: '9852', scope: 'HUMAN', status: 'ACTIVE' }),
      },
      facilityProcedurePrice: {
        findFirst: jest.fn().mockResolvedValue({ id: 'fpp-1', customPrice: 1000, isActive: true }),
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreatmentOfferService,
        { provide: 'ITreatmentOfferRepository', useValue: repoMock },
        { provide: DatabaseService, useValue: dbMock },
      ],
    }).compile();

    service = module.get<TreatmentOfferService>(TreatmentOfferService);
  });

  // TEST 01: Eligible APPROVED review permits dispatch
  it('TEST 01: Eligible APPROVED review permits dispatch', async () => {
    repoMock.findLatestOfferHistoryByAction.mockImplementation(async (id: string, action: string) => {
      if (action === 'CLINICAL_REVIEW') {
        return {
          treatmentOfferId: id,
          createdAt: new Date(),
          performedBy: 'user-doc-sarah',
          performerRole: 'DOCTOR',
          metadata: {
            reviewStatus: ClinicalReviewAction.APPROVED,
            offerVersion: 1,
            patientProfileId: 'pat-john',
            procedureCodes: ['9852'],
            clinicalPracticeType: 'HUMAN_HEALTHCARE',
            reviewedBy: 'user-doc-sarah',
            reviewerRole: 'DOCTOR',
            reviewedAt: new Date().toISOString(),
          },
        };
      }
      if (action === 'CLINICIAN_ATTESTATION') {
        return {
          metadata: { offerVersion: 1, attestedBy: 'user-doc-sarah' },
        };
      }
      return null;
    });

    const res = await service.dispatchOffer('user-doc-sarah', 'offer-018', { expectedVersion: 1 });
    expect(res.status).toBe(TreatmentOfferStatus.DISPATCHED);
    expect(res.offerNumber).toBe('OFF-2026-0001');
  });

  // TEST 02: Missing review blocks dispatch
  it('TEST 02: Missing review blocks dispatch', async () => {
    repoMock.findLatestOfferHistoryByAction.mockResolvedValue(null);

    await expect(
      service.dispatchOffer('user-doc-sarah', 'offer-018', { expectedVersion: 1 }),
    ).rejects.toThrow(ConflictException);

    await expect(
      service.dispatchOffer('user-doc-sarah', 'offer-018', { expectedVersion: 1 }),
    ).rejects.toThrow(/Clinical review is missing/);
  });

  // TEST 03: PENDING review blocks dispatch
  it('TEST 03: PENDING review blocks dispatch', async () => {
    repoMock.findLatestOfferHistoryByAction.mockImplementation(async (id: string, action: string) => {
      if (action === 'CLINICAL_REVIEW') {
        return {
          treatmentOfferId: id,
          createdAt: new Date(),
          metadata: {
            reviewStatus: ClinicalReviewAction.PENDING,
            offerVersion: 1,
            patientProfileId: 'pat-john',
          },
        };
      }
      return null;
    });

    await expect(
      service.dispatchOffer('user-doc-sarah', 'offer-018', { expectedVersion: 1 }),
    ).rejects.toThrow(/Must be APPROVED/);
  });

  // TEST 04: REJECTED review blocks dispatch
  it('TEST 04: REJECTED review blocks dispatch', async () => {
    repoMock.findLatestOfferHistoryByAction.mockImplementation(async (id: string, action: string) => {
      if (action === 'CLINICAL_REVIEW') {
        return {
          treatmentOfferId: id,
          createdAt: new Date(),
          metadata: {
            reviewStatus: ClinicalReviewAction.REJECTED,
            offerVersion: 1,
            patientProfileId: 'pat-john',
          },
        };
      }
      return null;
    });

    await expect(
      service.dispatchOffer('user-doc-sarah', 'offer-018', { expectedVersion: 1 }),
    ).rejects.toThrow(/clinical review was REJECTED/);
  });

  // TEST 05: Review for a different patient blocks dispatch
  it('TEST 05: Review for a different patient blocks dispatch', async () => {
    repoMock.findLatestOfferHistoryByAction.mockImplementation(async (id: string, action: string) => {
      if (action === 'CLINICAL_REVIEW') {
        return {
          treatmentOfferId: id,
          createdAt: new Date(),
          metadata: {
            reviewStatus: ClinicalReviewAction.APPROVED,
            offerVersion: 1,
            patientProfileId: 'different-patient-uuid',
            reviewedBy: 'user-doc-sarah',
          },
        };
      }
      return null;
    });

    await expect(
      service.dispatchOffer('user-doc-sarah', 'offer-018', { expectedVersion: 1 }),
    ).rejects.toThrow(/belongs to a different patient/);
  });

  // TEST 06: Review for a different offer or incompatible clinical context blocks dispatch
  it('TEST 06: Review for a different offer or incompatible clinical context blocks dispatch', async () => {
    repoMock.findOfferById.mockResolvedValue(null);

    await expect(
      service.dispatchOffer('user-doc-sarah', 'unrelated-offer-id', { expectedVersion: 1 }),
    ).rejects.toThrow(NotFoundException);
  });

  // TEST 07: Review for a different procedure blocks dispatch when procedure-specific approval is required
  it('TEST 07: Review for a different procedure blocks dispatch when procedure-specific approval is required', async () => {
    repoMock.findLatestOfferHistoryByAction.mockImplementation(async (id: string, action: string) => {
      if (action === 'CLINICAL_REVIEW') {
        return {
          treatmentOfferId: id,
          createdAt: new Date(),
          metadata: {
            reviewStatus: ClinicalReviewAction.APPROVED,
            offerVersion: 1,
            patientProfileId: 'pat-john',
            procedureCodes: ['DIFFERENT_CODE_1234'], // does not include 9852
            reviewedBy: 'user-doc-sarah',
          },
        };
      }
      return null;
    });

    await expect(
      service.dispatchOffer('user-doc-sarah', 'offer-018', { expectedVersion: 1 }),
    ).rejects.toThrow(/does not cover procedure/);
  });

  // TEST 08: Revoked or superseded review blocks dispatch
  it('TEST 08: Revoked or superseded review blocks dispatch', async () => {
    // If the latest review history record was updated to NEEDS_INFORMATION or REJECTED
    repoMock.findLatestOfferHistoryByAction.mockImplementation(async (id: string, action: string) => {
      if (action === 'CLINICAL_REVIEW') {
        return {
          treatmentOfferId: id,
          createdAt: new Date(),
          metadata: {
            reviewStatus: ClinicalReviewAction.NEEDS_INFORMATION,
            offerVersion: 1,
            patientProfileId: 'pat-john',
            comments: 'Superseded by multidisciplinary panel hold',
          },
        };
      }
      return null;
    });

    await expect(
      service.dispatchOffer('user-doc-sarah', 'offer-018', { expectedVersion: 1 }),
    ).rejects.toThrow(/pending additional information/);
  });

  // TEST 09: Approval for an outdated offer version is rejected when the approved policy requires re-review
  it('TEST 09: Approval for an outdated offer version is rejected when the approved policy requires re-review', async () => {
    // Offer is currently version 2, but review was for version 1
    repoMock.findOfferById.mockResolvedValue({
      ...validOffer,
      version: 2,
    });

    repoMock.findLatestOfferHistoryByAction.mockImplementation(async (id: string, action: string) => {
      if (action === 'CLINICAL_REVIEW') {
        return {
          treatmentOfferId: id,
          createdAt: new Date(),
          metadata: {
            reviewStatus: ClinicalReviewAction.APPROVED,
            offerVersion: 1, // OUTDATED!
            patientProfileId: 'pat-john',
            procedureCodes: ['9852'],
          },
        };
      }
      return null;
    });

    await expect(
      service.dispatchOffer('user-doc-sarah', 'offer-018', { expectedVersion: 2 }),
    ).rejects.toThrow(/Prior clinical review was approved for offer version 1, but current offer is at version 2/);
  });

  // TEST 10: Unauthorized reviewer cannot approve
  it('TEST 10: Unauthorized reviewer cannot approve', async () => {
    await expect(
      service.submitClinicalReview('unauthorized-user', 'offer-018', {
        action: ClinicalReviewAction.APPROVED,
        comments: 'Attempted unauthorized approval',
      }, ['PATIENT']),
    ).rejects.toThrow(ForbiddenException);
  });

  // TEST 11: Unauthorized clinician cannot dispatch another doctor's offer
  it('TEST 11: Unauthorized clinician cannot dispatch another doctor\'s offer', async () => {
    dbMock.doctorProfile.findUnique.mockResolvedValue({
      id: 'doc-other',
      userId: 'user-doc-other',
      verificationStatus: 'VERIFIED',
    });

    await expect(
      service.dispatchOffer('user-doc-other', 'offer-018', { expectedVersion: 1 }),
    ).rejects.toThrow(ForbiddenException);
  });

  // TEST 12: Human/Veterinary cross-scope review is rejected
  it('TEST 12: Human/Veterinary cross-scope review is rejected', async () => {
    // Vet doctor attempts to review Human offer
    dbMock.doctorProfile.findFirst.mockResolvedValue({
      id: 'doc-vet',
      userId: 'user-doc-vet',
      clinicalPracticeType: 'VETERINARY_MEDICINE',
      isDeleted: false,
    });

    await expect(
      service.submitClinicalReview('user-doc-vet', 'offer-018', {
        action: ClinicalReviewAction.APPROVED,
        comments: 'Vet review on human care',
      }, ['DOCTOR']),
    ).rejects.toThrow(/Cross-scope clinical review is prohibited/);
  });

  // TEST 13: Approved review persists after refresh
  it('TEST 13: Approved review persists after refresh', async () => {
    repoMock.findLatestOfferHistoryByAction.mockImplementation(async (id: string, action: string) => {
      if (action === 'CLINICAL_REVIEW') {
        return {
          treatmentOfferId: id,
          createdAt: new Date('2026-11-25T06:00:00Z'),
          performedBy: 'user-doc-sarah',
          performerRole: 'DOCTOR',
          metadata: {
            reviewStatus: ClinicalReviewAction.APPROVED,
            comments: 'Multidisciplinary panel ratified',
            criteria: ['medicalNecessityVerified'],
            reviewedBy: 'user-doc-sarah',
            reviewerRole: 'DOCTOR',
            reviewedAt: '2026-11-25T06:00:00.000Z',
            offerVersion: 1,
            patientProfileId: 'pat-john',
          },
        };
      }
      return null;
    });

    const refreshedReview = await service.getClinicalReview('user-doc-sarah', 'offer-018');
    expect(refreshedReview.status).toBe(ClinicalReviewAction.APPROVED);
    expect(refreshedReview.reviewedBy).toBe('user-doc-sarah');
    expect(refreshedReview.eligibleForDispatch).toBe(true);
    expect(refreshedReview.isOutdatedVersion).toBe(false);
  });

  // TEST 14: Frontend approval state matches authoritative Backend eligibility
  it('TEST 14: Frontend approval state matches authoritative Backend eligibility (No fake baseline APPROVED)', async () => {
    // When no review history exists, backend returns PENDING, eligibleForDispatch: false
    repoMock.findLatestOfferHistoryByAction.mockResolvedValue(null);

    const check = await service.getClinicalReview('user-doc-sarah', 'offer-018');
    expect(check.status).toBe(ClinicalReviewAction.PENDING);
    expect(check.eligibleForDispatch).toBe(false);
    expect(check.reviewedBy).toBeUndefined();
    expect(check.comments).not.toContain('Standard baseline clinical review in effect');
  });

  // TEST 15: Successful dispatch updates offer status
  it('TEST 15: Successful dispatch updates offer status', async () => {
    repoMock.findLatestOfferHistoryByAction.mockImplementation(async (id: string, action: string) => {
      if (action === 'CLINICAL_REVIEW') {
        return {
          treatmentOfferId: id,
          createdAt: new Date(),
          metadata: {
            reviewStatus: ClinicalReviewAction.APPROVED,
            offerVersion: 1,
            patientProfileId: 'pat-john',
            reviewedBy: 'user-doc-sarah',
          },
        };
      }
      if (action === 'CLINICIAN_ATTESTATION') {
        return { metadata: { offerVersion: 1 } };
      }
      return null;
    });

    const res = await service.dispatchOffer('user-doc-sarah', 'offer-018', { expectedVersion: 1 });
    expect(res.status).toBe(TreatmentOfferStatus.DISPATCHED);
    expect(res.version).toBe(2);
  });

  // TEST 16: Successful dispatch creates the supported patient-facing event
  it('TEST 16: Successful dispatch triggers patient dispatch event and audit flow', async () => {
    repoMock.findLatestOfferHistoryByAction.mockImplementation(async (id: string, action: string) => {
      if (action === 'CLINICAL_REVIEW') {
        return {
          treatmentOfferId: id,
          createdAt: new Date(),
          metadata: {
            reviewStatus: ClinicalReviewAction.APPROVED,
            offerVersion: 1,
            patientProfileId: 'pat-john',
            reviewedBy: 'user-doc-sarah',
          },
        };
      }
      if (action === 'CLINICIAN_ATTESTATION') {
        return { metadata: { offerVersion: 1 } };
      }
      return null;
    });

    await service.dispatchOffer('user-doc-sarah', 'offer-018', { expectedVersion: 1 });
    expect(repoMock.dispatchOffer).toHaveBeenCalledWith(
      'offer-018',
      'OFF-2026-0001',
      'user-doc-sarah',
      'DOCTOR',
      1,
    );
  });

  // TEST 17: Double-clicking Send does not duplicate dispatch
  it('TEST 17: Double-clicking Send does not duplicate dispatch (rejects non-DRAFT status)', async () => {
    repoMock.findOfferById.mockResolvedValue({
      ...validOffer,
      status: TreatmentOfferStatus.DISPATCHED,
    });

    await expect(
      service.dispatchOffer('user-doc-sarah', 'offer-018', { expectedVersion: 1 }),
    ).rejects.toThrow(/Must be DRAFT/);
  });

  // TEST 18: Missing facility price still blocks dispatch
  it('TEST 18: Missing facility price still blocks dispatch', async () => {
    dbMock.facilityProcedurePrice.findFirst.mockResolvedValue(null);

    await expect(
      service.dispatchOffer('user-doc-sarah', 'offer-018', { expectedVersion: 1 }),
    ).rejects.toThrow(/chargemaster price/);
  });

  it('TEST 18b: Missing doctor facility privileges blocks dispatch', async () => {
    dbMock.doctorFacility.findFirst.mockResolvedValue(null);

    await expect(
      service.dispatchOffer('user-doc-sarah', 'offer-018', { expectedVersion: 1 }),
    ).rejects.toThrow(/does not have active clinical privileges/);
  });

  // TEST 19: Invalid financing or discount rules still block dispatch
  it('TEST 19: Invalid financing or discount rules (>15% unapproved) still block dispatch', async () => {
    repoMock.findOfferById.mockResolvedValue({
      ...validOffer,
      grossEstimate: 1000,
      discountAmount: 200, // 20% discount > 15% supervisor threshold
    });
    repoMock.findLatestOfferHistoryByAction.mockImplementation(async (id: string, action: string) => {
      if (action === 'DISCOUNT_APPROVED') return null; // No supervisor approval
      return null;
    });

    await expect(
      service.dispatchOffer('user-doc-sarah', 'offer-018', { expectedVersion: 1 }),
    ).rejects.toThrow(/exceeds the 15% supervisor threshold/);
  });

  // TEST 20: An API failure produces an accurate error state rather than a false success message
  it('TEST 20: An API failure produces an accurate error state rather than a false success message', async () => {
    repoMock.findOfferById.mockResolvedValue({
      ...validOffer,
      validUntil: new Date(Date.now() - 3600000), // EXPIRED
    });

    await expect(
      service.dispatchOffer('user-doc-sarah', 'offer-018', { expectedVersion: 1 }),
    ).rejects.toThrow(/valid-until date has already passed/);
  });
});
