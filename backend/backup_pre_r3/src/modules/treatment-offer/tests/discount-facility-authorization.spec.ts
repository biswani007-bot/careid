import { Test, TestingModule } from '@nestjs/testing';
import { TreatmentOfferService } from '../application/use-cases/treatment-offer.service';
import { DatabaseService } from '@database/database.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('Discount Approval Facility Scoping & RBAC Tests', () => {
  let service: TreatmentOfferService;
  let repoMock: any;
  let dbMock: any;

  beforeEach(async () => {
    repoMock = {
      findOfferById: jest.fn(),
      createHistory: jest.fn().mockResolvedValue({ id: 'hist-1', createdAt: new Date() }),
    };

    dbMock = {
      doctorProfile: {
        findUnique: jest.fn(),
      },
      staffMember: {
        findFirst: jest.fn(),
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

  describe('approveDiscount Facility Scoping & Role Enforcement', () => {
    it('should reject non-staff non-admin users (e.g. PATIENT)', async () => {
      await expect(
        service.approveDiscount('patient-user-1', 'offer-1', { approved: true }, ['PATIENT']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject attending physician from self-approving discount >15%', async () => {
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-1',
        facilityId: 'fac-metro-1',
        doctorProfileId: 'doc-profile-100',
        grossEstimate: 10000,
        discountAmount: 2000, // 20%
        status: 'OFFER_CREATED',
      });

      // User resolves to the same doctorProfileId
      dbMock.doctorProfile.findUnique.mockResolvedValue({
        id: 'doc-profile-100',
        isDeleted: false,
        verificationStatus: 'VERIFIED',
      });

      await expect(
        service.approveDiscount('doc-user-100', 'offer-1', { approved: true }, ['STAFF']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject staff supervisor if offer belongs to a facility they are NOT assigned to', async () => {
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-foreign-facility',
        facilityId: 'fac-downtown-2',
        doctorProfileId: 'doc-profile-50',
        grossEstimate: 10000,
        discountAmount: 2000, // 20%
        status: 'OFFER_CREATED',
      });

      // Staff member is only assigned to fac-uptown-1
      dbMock.staffMember.findFirst.mockResolvedValue({
        primaryFacilityId: 'fac-uptown-1',
        secondaryFacilityId: null,
      });

      await expect(
        service.approveDiscount('staff-user-1', 'offer-foreign-facility', { approved: true }, ['STAFF']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow staff supervisor if offer facility matches their primary or secondary facility', async () => {
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-local-facility',
        facilityId: 'fac-uptown-1',
        doctorProfileId: 'doc-profile-50',
        grossEstimate: 10000,
        discountAmount: 2000, // 20%
        status: 'OFFER_CREATED',
      });

      dbMock.staffMember.findFirst.mockResolvedValue({
        primaryFacilityId: 'fac-uptown-1',
        secondaryFacilityId: 'fac-downtown-2',
      });

      dbMock.doctorProfile.findUnique.mockResolvedValue(null);

      const result = await service.approveDiscount(
        'staff-user-1',
        'offer-local-facility',
        { approved: true, comments: 'Supervisor approved 20% discount' },
        ['STAFF'],
      );

      expect(result).toBeDefined();
      expect(result.isApproved).toBe(true);
      expect(result.approvalStatus).toBe('APPROVED');
      expect(result.discountPercent).toBe(20);
      expect(repoMock.createHistory).toHaveBeenCalledWith(
        'offer-local-facility',
        'DISCOUNT_APPROVED',
        'OFFER_CREATED',
        'OFFER_CREATED',
        'staff-user-1',
        'STAFF',
        'Supervisor approved 20% discount',
        expect.any(Object),
      );
    });

    it('should allow platform ADMIN to approve discount for any facility', async () => {
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-any-facility',
        facilityId: 'fac-remote-99',
        doctorProfileId: 'doc-profile-50',
        grossEstimate: 10000,
        discountAmount: 2500, // 25%
        status: 'OFFER_CREATED',
      });

      dbMock.doctorProfile.findUnique.mockResolvedValue(null);

      const result = await service.approveDiscount(
        'admin-user-1',
        'offer-any-facility',
        { approved: true },
        ['ADMIN'],
      );

      expect(result).toBeDefined();
      expect(result.isApproved).toBe(true);
      expect(result.discountPercent).toBe(25);
    });

    it('should reject discount exceeding 30% ceiling even for admin', async () => {
      repoMock.findOfferById.mockResolvedValue({
        id: 'offer-high-discount',
        facilityId: 'fac-remote-99',
        doctorProfileId: 'doc-profile-50',
        grossEstimate: 10000,
        discountAmount: 4000, // 40%
        status: 'OFFER_CREATED',
      });

      await expect(
        service.approveDiscount('admin-user-1', 'offer-high-discount', { approved: true }, ['ADMIN']),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
