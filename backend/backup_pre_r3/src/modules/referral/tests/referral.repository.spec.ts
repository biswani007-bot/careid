import { PrismaReferralRepository } from '../infrastructure/database/referral.repository';

describe('PrismaReferralRepository Unit & Query Integrity Tests', () => {
  let repository: PrismaReferralRepository;

  const mockDb: any = {
    patientReferral: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    patientProfile: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    doctorProfile: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    facility: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(mockDb)),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PrismaReferralRepository(mockDb);
  });

  describe('findPatientProfileByIdOrUserId', () => {
    it('should find patient profile by userId or profile id', async () => {
      mockDb.patientProfile.findFirst.mockResolvedValue({
        id: '787e5187-7859-4320-bb1a-465a57dd086a',
        userId: 'fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6',
      });

      const res = await repository.findPatientProfileByIdOrUserId('fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6');
      expect(res).toEqual({
        id: '787e5187-7859-4320-bb1a-465a57dd086a',
        userId: 'fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6',
      });
      expect(mockDb.patientProfile.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { id: 'fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6' },
            { userId: 'fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6' },
          ],
        },
        select: { id: true, userId: true },
      });
    });

    it('should return null for empty string or missing profile', async () => {
      expect(await repository.findPatientProfileByIdOrUserId('')).toBeNull();

      mockDb.patientProfile.findFirst.mockResolvedValue(null);
      expect(await repository.findPatientProfileByIdOrUserId('non-existent')).toBeNull();
    });
  });

  describe('findReferrals dual patientId resolution', () => {
    it('should query both candidate IDs when patientId filter is provided', async () => {
      mockDb.patientProfile.findFirst.mockResolvedValue({
        id: '787e5187-7859-4320-bb1a-465a57dd086a',
        userId: 'fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6',
      });
      mockDb.patientReferral.findMany.mockResolvedValue([
        {
          id: '226ad0ab-0e15-4ddb-a212-27f0c3963203',
          referralNumber: 'REF-CAREID-2026-001',
          patientId: 'fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6',
        },
      ]);
      mockDb.patientReferral.count.mockResolvedValue(1);

      const res = await repository.findReferrals({
        patientId: '787e5187-7859-4320-bb1a-465a57dd086a',
      });

      expect(res.total).toBe(1);
      expect(res.data[0].referralNumber).toBe('REF-CAREID-2026-001');
      expect(mockDb.patientReferral.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patientId: {
              in: expect.arrayContaining([
                '787e5187-7859-4320-bb1a-465a57dd086a',
                'fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6',
              ]),
            },
          }),
        }),
      );
    });

    it('should clamp page=0 to avoid negative skip', async () => {
      mockDb.patientReferral.findMany.mockResolvedValue([]);
      mockDb.patientReferral.count.mockResolvedValue(0);

      await repository.findReferrals({ page: 0, limit: 20 });

      expect(mockDb.patientReferral.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0, // Not -20!
          take: 20,
        }),
      );
    });
  });

  describe('findPatientSummary and findFacilitySummary', () => {
    it('should correctly synthesize patient summary with fullName, patientProfileId and userId', async () => {
      mockDb.patientProfile.findFirst.mockResolvedValue({
        id: '787e5187-7859-4320-bb1a-465a57dd086a',
        userId: 'fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6',
        firstName: 'Marcus',
        lastName: 'Mishra',
        patientNumber: 'PT-CAREID-2026-0004',
        gender: 'MALE',
        dateOfBirth: new Date('1990-01-01'),
        bloodGroup: 'B+',
      });

      const summary = await repository.findPatientSummary('fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6');
      expect(summary.fullName).toBe('Marcus Mishra');
      expect(summary.patientProfileId).toBe('787e5187-7859-4320-bb1a-465a57dd086a');
      expect(summary.userId).toBe('fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6');
    });

    it('should correctly synthesize facility summary with address and code', async () => {
      mockDb.facility.findFirst.mockResolvedValue({
        id: 'fac-1',
        name: 'Metro Hospital',
        facilityCode: 'METRO-01',
        facilityType: 'HOSPITAL',
        streetAddress: '123 Main St',
        city: 'Metropolis',
        phone: '+15551234567',
      });

      const summary = await repository.findFacilitySummary('fac-1');
      expect(summary.code).toBe('METRO-01');
      expect(summary.facilityCode).toBe('METRO-01');
      expect(summary.address).toBe('123 Main St, Metropolis');
    });

    it('should return null safely if patient or facility not found without throwing', async () => {
      mockDb.patientProfile.findFirst.mockResolvedValue(null);
      mockDb.facility.findFirst.mockResolvedValue(null);

      expect(await repository.findPatientSummary('unknown')).toBeNull();
      expect(await repository.findFacilitySummary('unknown')).toBeNull();
    });
  });
});
