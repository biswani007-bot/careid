import { PrismaFinancingRepository } from '../infrastructure/database/prisma-financing.repository';
import { FinancingCryptoService } from '../infrastructure/security/financing-crypto.service';
import { DatabaseService } from '@database/database.service';

describe('PrismaFinancingRepository Unit Tests', () => {
  let repo: PrismaFinancingRepository;
  let mockDb: any;
  let mockCrypto: any;

  beforeEach(() => {
    mockCrypto = {
      encrypt: jest.fn().mockReturnValue('v1:iv:tag:cipher'),
      decrypt: jest.fn().mockReturnValue('DEC_VAL'),
      isCiphertext: jest.fn().mockReturnValue(true),
    };

    mockDb = {
      $queryRaw: jest.fn().mockResolvedValue([{ seq: '15' }]),
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockDb)),
      patientProfile: {
        findUnique: jest.fn().mockResolvedValue({ id: 'pat-prof-1' }),
      },
      financingApplication: {
        create: jest.fn().mockImplementation(({ data }) => ({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        findUnique: jest.fn().mockResolvedValue({
          id: 'app-1',
          applicationNumber: 'FIN-2026-00015',
          userId: 'user-1',
          optionId: 'opt-zerocost-care',
          partnerName: 'CareCredit Health',
          requestedAmount: 50000,
          tenureMonths: 6,
          monthlyEstimatedEmi: 8333,
          status: 'PENDING',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockImplementation(({ data }) => ({
          id: 'app-1',
          status: data.status,
          adminNotes: data.adminNotes,
          version: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      },
      financingApplicationHistory: {
        create: jest.fn().mockResolvedValue({ id: 'hist-1' }),
      },
    };

    repo = new PrismaFinancingRepository(mockDb as unknown as DatabaseService, mockCrypto as unknown as FinancingCryptoService);
  });

  it('should list configured financing options', async () => {
    const options = await repo.getAvailableOptions();
    expect(options.length).toBe(3);
    expect(options.map((o) => o.id)).toContain('opt-zerocost-care');
  });

  it('should create an application with atomic sequence number and encrypted sensitive fields', async () => {
    const created = await repo.createApplication({
      userId: 'user-1',
      optionId: 'opt-zerocost-care',
      partnerName: 'CareCredit Health',
      requestedAmount: 50000,
      tenureMonths: 6,
      monthlyEstimatedEmi: 8333,
      monthlyIncome: 75000,
      panOrNationalId: 'ABCDE1234F',
      status: 'PENDING',
    });

    expect(created.id).toBeDefined();
    expect(created.applicationNumber).toBe('FIN-2026-00015');
    expect(mockCrypto.encrypt).toHaveBeenCalledTimes(2);
    expect(mockDb.financingApplication.create).toHaveBeenCalled();
    expect(mockDb.financingApplicationHistory.create).toHaveBeenCalled();
  });

  it('should update application status and write audit history atomically', async () => {
    const updated = await repo.updateApplicationStatus('app-1', 'APPROVED', 'Verified by clinical desk');
    expect(updated).toBeDefined();
    expect(updated?.status).toBe('APPROVED');
    expect(mockDb.financingApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'app-1' },
      }),
    );
    expect(mockDb.financingApplicationHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          applicationId: 'app-1',
          newStatus: 'APPROVED',
        }),
      }),
    );
  });
});

