import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../health.controller';
import { DatabaseService } from '@database/database.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let mockDb: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    mockDb = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DatabaseService,
          useValue: mockDb,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('getHealth', () => {
    it('should return status ok and service name', () => {
      const result = controller.getHealth();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('HVAPI Backend');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getReadiness', () => {
    it('should return ready and connected when database query succeeds', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

      const result = await controller.getReadiness();
      expect(result.status).toBe('ready');
      expect(result.database).toBe('connected');
      expect(result.timestamp).toBeDefined();
      expect(mockDb.$queryRaw).toHaveBeenCalled();
    });

    it('should throw HttpException 503 SERVICE_UNAVAILABLE when database connectivity fails', async () => {
      mockDb.$queryRaw.mockRejectedValueOnce(new Error('Connection terminated unexpectedly'));

      try {
        await controller.getReadiness();
        fail('Expected getReadiness to throw HttpException 503');
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
        const httpErr = err as HttpException;
        expect(httpErr.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        const response: any = httpErr.getResponse();
        expect(response.status).toBe('unready');
        expect(response.database).toBe('disconnected');
        expect(response.error).toBe('Database connectivity probe failed');
      }
    });
  });

  describe('getLiveness', () => {
    it('should return status live and process uptime', () => {
      const result = controller.getLiveness();
      expect(result.status).toBe('live');
      expect(typeof result.uptimeSeconds).toBe('number');
      expect(result.timestamp).toBeDefined();
    });
  });
});
