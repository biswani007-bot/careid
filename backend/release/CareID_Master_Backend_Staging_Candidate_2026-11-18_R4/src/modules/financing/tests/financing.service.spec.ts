import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FinancingService } from '../application/use-cases/financing.service';
import { IFinancingRepository } from '../domain/repositories/financing.repository.interface';
import { FinancingApplication, FinancingOption } from '../domain/entities/financing.entity';

describe('FinancingService', () => {
  let service: FinancingService;
  let mockRepo: jest.Mocked<IFinancingRepository>;

  const mockOption: FinancingOption = {
    id: 'opt-zerocost-care',
    partnerName: 'CareCredit Health',
    name: 'Zero-Cost Medical EMI',
    description: 'Interest-free medical financing',
    minAmount: 5000,
    maxAmount: 200000,
    tenureMonths: [3, 6, 9, 12],
    interestRate: 0,
    processingFee: 0,
    features: ['Zero Interest'],
  };

  const mockApplication: FinancingApplication = {
    id: 'fin-1',
    applicationNumber: 'FIN-2026-00001',
    userId: 'user-1',
    userEmail: 'user1@example.com',
    userName: 'John Doe',
    optionId: 'opt-zerocost-care',
    partnerName: 'CareCredit Health',
    treatmentName: 'Dental Crown',
    requestedAmount: 30000,
    tenureMonths: 6,
    monthlyEstimatedEmi: 5000,
    status: 'PENDING',
    adminNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockRepo = {
      getAvailableOptions: jest.fn().mockResolvedValue([mockOption]),
      getOptionById: jest.fn().mockImplementation(async (id) => (id === mockOption.id ? mockOption : null)),
      createApplication: jest.fn().mockResolvedValue(mockApplication),
      findApplications: jest.fn().mockResolvedValue({
        data: [mockApplication],
        total: 1,
        page: 1,
        limit: 20,
      }),
      findApplicationById: jest.fn().mockResolvedValue(mockApplication),
      updateApplicationStatus: jest.fn().mockImplementation(async (id, status, notes) => ({
        ...mockApplication,
        status,
        adminNotes: notes || null,
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancingService,
        {
          provide: 'IFinancingRepository',
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<FinancingService>(FinancingService);
  });

  it('should list financing options', async () => {
    const list = await service.getOptions();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('opt-zerocost-care');
  });

  it('should calculate zero-interest EMI correctly when applying', async () => {
    const res = await service.apply('user-1', 'user1@example.com', 'John Doe', {
      optionId: 'opt-zerocost-care',
      requestedAmount: 30000,
      tenureMonths: 6,
      treatmentName: 'Dental Crown',
    });

    expect(res).toBeDefined();
    expect(res.id).toBe('fin-1');
    expect(mockRepo.createApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedAmount: 30000,
        tenureMonths: 6,
        monthlyEstimatedEmi: 5000,
      }),
    );
  });

  it('should reject application if requested amount exceeds option limits', async () => {
    await expect(
      service.apply('user-1', 'user1@example.com', 'John Doe', {
        optionId: 'opt-zerocost-care',
        requestedAmount: 500000, // max is 200000
        tenureMonths: 6,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject application if tenure is invalid for option', async () => {
    await expect(
      service.apply('user-1', 'user1@example.com', 'John Doe', {
        optionId: 'opt-zerocost-care',
        requestedAmount: 20000,
        tenureMonths: 24, // valid: 3, 6, 9, 12
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should list applications for user scoped', async () => {
    const res = await service.getApplications('user-1', ['PATIENT'], {});
    expect(res.data.length).toBe(1);
    expect(mockRepo.findApplications).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
  });

  it('should list all applications for admin', async () => {
    const res = await service.getApplications('admin-1', ['ADMIN'], {});
    expect(res.data.length).toBe(1);
    expect(mockRepo.findApplications).toHaveBeenCalledWith(expect.objectContaining({ userId: undefined }));
  });

  it('should get application by ID for owner', async () => {
    const res = await service.getApplicationById('fin-1', 'user-1', ['PATIENT']);
    expect(res.id).toBe('fin-1');
  });

  it('should throw ForbiddenException if another user accesses application', async () => {
    await expect(service.getApplicationById('fin-1', 'user-other', ['PATIENT'])).rejects.toThrow(ForbiddenException);
  });

  it('should update status when admin', async () => {
    const res = await service.updateStatus('fin-1', ['ADMIN'], {
      status: 'APPROVED',
      notes: 'Credit verified',
    });
    expect(res.status).toBe('APPROVED');
  });

  it('should reject status update if non-admin attempts it', async () => {
    await expect(
      service.updateStatus('fin-1', ['PATIENT'], { status: 'APPROVED' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject status update with invalid status string', async () => {
    await expect(
      service.updateStatus('fin-1', ['ADMIN'], { status: 'INVALID_STATUS' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject transition from a terminal status like DISBURSED', async () => {
    mockRepo.findApplicationById.mockResolvedValueOnce({
      ...mockApplication,
      status: 'DISBURSED',
    });
    await expect(
      service.updateStatus('fin-1', ['ADMIN'], { status: 'PENDING' }),
    ).rejects.toThrow('Cannot change status of an application in terminal');
  });
});

