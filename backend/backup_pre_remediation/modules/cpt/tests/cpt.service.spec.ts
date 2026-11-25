import { Test, TestingModule } from '@nestjs/testing';
import { CptService } from '../cpt.service';
import { DatabaseService } from '@database/database.service';
import { NotFoundException } from '@nestjs/common';

describe('CptService', () => {
  let service: CptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CptService,
        {
          provide: DatabaseService,
          useValue: {},
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
});

