import { Test, TestingModule } from '@nestjs/testing';
import { CptService } from '../cpt.service';
import { DatabaseService } from '@database/database.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('CptService', () => {
  let service: CptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CptService,
        {
          provide: DatabaseService,
          useValue: {
            $executeRawUnsafe: jest.fn().mockResolvedValue(1),
            $queryRawUnsafe: jest.fn().mockResolvedValue([{ count: 13 }]),
          },
        },
      ],
    }).compile();

    service = module.get<CptService>(CptService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list CPT codes with pagination', async () => {
    const result = await service.getCptCodes({ page: 1, limit: 5 });
    expect(result.data).toBeDefined();
    expect(result.data.length).toBeLessThanOrEqual(5);
    expect(result.meta.page).toBe(1);
    expect(result.meta.totalItems).toBeGreaterThan(0);
  });

  it('should filter CPT codes by category', async () => {
    const result = await service.getCptCodes({ category: 'CARDIOLOGY' });
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.every((c) => c.category === 'CARDIOLOGY')).toBe(true);
  });

  it('should search CPT codes by keyword or code', async () => {
    const results = await service.searchCptCodes('93458');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].code).toBe('93458');
    expect(results[0].name).toContain('Left Heart Catheterization');
  });

  it('should retrieve a CPT item by exact code', async () => {
    const item = await service.getCptByCode('92928');
    expect(item).toBeDefined();
    expect(item.code).toBe('92928');
    expect(item.category).toBe('CARDIOLOGY');
  });

  it('should throw NotFoundException for non-existent code', async () => {
    await expect(service.getCptByCode('INVALID_CODE_99999')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should support creating a local hospital procedure without official CPT attribution', async () => {
    const created = await service.createProcedure({
      code: 'LOCAL-TEST-001',
      name: 'Specialized In-House Cardiopulmonary Stress Test',
      category: 'CARDIOLOGY',
      description: 'Clinic-specific proprietary protocol',
      standardCharge: 8500,
      isOfficialCpt: false,
    });

    expect(created).toBeDefined();
    expect(created.code).toBe('LOCAL-TEST-001');
    expect(created.isOfficialCpt).toBe(false);
  });

  it('should reject duplicate procedure code with ConflictException', async () => {
    await expect(
      service.createProcedure({
        code: '93458', // Already exists
        name: 'Duplicate Angiography',
        category: 'CARDIOLOGY',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should support updating procedure details and deactivating without deletion', async () => {
    const updated = await service.updateProcedure('LOCAL-TEST-001', {
      standardCharge: 9500,
      status: 'INACTIVE',
    });

    expect(updated.standardCharge).toBe(9500);
    expect(updated.status).toBe('INACTIVE');

    // Deactivated procedure should still be retrievable by code for historical preservation
    const item = await service.getCptByCode('LOCAL-TEST-001');
    expect(item.status).toBe('INACTIVE');
  });
});
