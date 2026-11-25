import {
  BadRequestException,
  GatewayTimeoutException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OcrWorkerClient } from '../infrastructure/clients/ocr-worker.client';

describe('OcrWorkerClient', () => {
  let client: OcrWorkerClient;
  let mockConfigService: Partial<ConfigService>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'CAREID_OCR_WORKER_URL') return 'http://127.0.0.1:5050';
        if (key === 'CAREID_OCR_SECRET') return 'test-secret';
        if (key === 'CAREID_OCR_TIMEOUT_MS') return 5000;
        return undefined;
      }),
    };
    client = new OcrWorkerClient(mockConfigService as ConfigService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should configure URL and secret correctly', () => {
      expect(client.getWorkerUrl()).toBe('http://127.0.0.1:5050');
    });
  });

  describe('Health and Readiness', () => {
    it('should return true when health check responds ok and engine is ready', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok', engineReady: true }),
      } as any);

      const ready = await client.isReady();
      expect(ready).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:5050/health', expect.any(Object));
    });

    it('should return false if health check fails or throws', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const ready = await client.isReady();
      expect(ready).toBe(false);
    });

    it('should return full health status from getHealth', async () => {
      const mockHealth = {
        status: 'ok',
        worker: 'CareID-Persistent-PaddleOCR',
        engineReady: true,
        ocrVersion: 'PP-OCRv4',
        architecture: 'PP-OCRv4_mobile_det + en_PP-OCRv4_mobile_rec',
        uptimeSeconds: 120,
        residentRamMb: 360.5,
        peakWorkingSetMb: 480,
        activeRequests: 0,
        maxConcurrency: 2,
        cpuThreads: 4,
        pdfDpi: 150,
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockHealth,
      } as any);

      const health = await client.getHealth();
      expect(health.worker).toBe('CareID-Persistent-PaddleOCR');
      expect(health.engineReady).toBe(true);
    });
  });

  describe('processFile', () => {
    it('should send POST request with JSON body and secret header', async () => {
      const mockResult = {
        success: true,
        documentType: 'LAB_REPORT',
        sourceFile: 'sample.png',
        pageCount: 1,
        overallConfidence: 0.98,
        combinedText: 'HEALTH VAULT 360',
        pages: [],
        durationMs: 500,
        engine: 'PP-OCRv4-Mobile-CPU',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResult,
      } as any);

      const res = await client.processFile('/path/to/sample.png', 'LAB_REPORT', 150);
      expect(res.combinedText).toBe('HEALTH VAULT 360');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:5050/internal/ocr/process',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-CareID-Internal-Secret': 'test-secret',
          }),
        }),
      );
    });
  });

  describe('processBuffer', () => {
    it('should send multipart form-data with buffer', async () => {
      const mockResult = {
        success: true,
        documentType: 'INSURANCE_CARD',
        sourceFile: 'card.jpg',
        pageCount: 1,
        overallConfidence: 0.97,
        combinedText: 'BLUE SHIELD',
        pages: [],
        durationMs: 400,
        engine: 'PP-OCRv4-Mobile-CPU',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResult,
      } as any);

      const buffer = Buffer.from('fake image content');
      const res = await client.processBuffer(buffer, 'card.jpg', 'INSURANCE_CARD');
      expect(res.combinedText).toBe('BLUE SHIELD');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:5050/internal/ocr/process',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-CareID-Internal-Secret': 'test-secret',
          }),
        }),
      );
    });
  });

  describe('Error handling', () => {
    it('should throw InternalServerErrorException on HTTP 401', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid secret' }),
      } as any);

      await expect(client.processFile('test.png')).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw BadRequestException on HTTP 400', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Unsupported format' }),
      } as any);

      await expect(client.processFile('test.exe')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException on HTTP 404', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'File does not exist' }),
      } as any);

      await expect(client.processFile('nonexistent.png')).rejects.toThrow(NotFoundException);
    });

    it('should throw ServiceUnavailableException on HTTP 429', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Max concurrency reached' }),
      } as any);

      await expect(client.processFile('test.png')).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw GatewayTimeoutException on timeout', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      global.fetch = jest.fn().mockRejectedValue(abortError);

      await expect(client.processFile('test.png')).rejects.toThrow(GatewayTimeoutException);
    });

    it('should throw ServiceUnavailableException on connection failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('fetch failed'));

      await expect(client.processFile('test.png')).rejects.toThrow(ServiceUnavailableException);
    });
  });
});

