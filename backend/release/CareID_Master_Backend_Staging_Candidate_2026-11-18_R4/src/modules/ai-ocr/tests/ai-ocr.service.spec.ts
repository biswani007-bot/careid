import { AiOcrService } from '../application/use-cases/ai-ocr.service';
import { Logger } from 'nestjs-pino';
import { OcrWorkerClient } from '@modules/ocr/infrastructure/clients/ocr-worker.client';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';

describe('AiOcrService', () => {
  let service: AiOcrService;
  let mockAiOcrRepository: any;
  let mockOcrWorkerClient: any;
  let mockLogger: any;

  const mockWorkerSuccessResult = {
    success: true,
    documentType: 'LAB_REPORT',
    sourceFile: '01_lab_report.png',
    pageCount: 1,
    overallConfidence: 0.94,
    combinedText: 'HEALTH VAULT 360 - CLINICAL LABORATORY REPORT\nPatient Name: John Doe\nTest Name: Complete Blood Count (CBC)\nPrescribed By: Dr. John Watson',
    pages: [
      {
        pageNumber: 1,
        rawText: 'HEALTH VAULT 360 - CLINICAL LABORATORY REPORT\nPatient Name: John Doe\nTest Name: Complete Blood Count (CBC)\nPrescribed By: Dr. John Watson',
        lines: [
          { text: 'Patient Name: John Doe', confidence: 0.96, box: [] },
          { text: 'Test Name: Complete Blood Count (CBC)', confidence: 0.94, box: [] },
          { text: 'Prescribed By: Dr. John Watson', confidence: 0.92, box: [] },
        ],
      },
    ],
    durationMs: 420,
    engine: 'PP-OCRv4-Mobile-CPU',
  };

  beforeEach(() => {
    mockAiOcrRepository = {
      findProfileByUserId: jest.fn(),
      createDocument: jest.fn(),
      createExtraction: jest.fn(),
      findDocumentById: jest.fn(),
      createReview: jest.fn(),
      updateDocumentStatus: jest.fn(),
    };

    mockOcrWorkerClient = {
      processFile: jest.fn().mockResolvedValue(mockWorkerSuccessResult),
      processBuffer: jest.fn().mockResolvedValue(mockWorkerSuccessResult),
    };

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    service = new AiOcrService(mockAiOcrRepository, mockLogger, mockOcrWorkerClient as OcrWorkerClient);

    // Mock global fetch for remote imageUrl resolution
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
    }) as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractDocument', () => {
    it('should successfully upload a document and save parsed extraction details', async () => {
      mockAiOcrRepository.findProfileByUserId.mockResolvedValue({ id: 'profile-123' });
      mockAiOcrRepository.createDocument.mockResolvedValue({ id: 'doc-123' });
      mockAiOcrRepository.createExtraction.mockResolvedValue({ id: 'extract-123' });

      const result = await service.extractDocument('user-123', {
        imageUrl: 'https://storage.healthvault360.com/reports/lab-123.jpg',
      });

      expect(mockAiOcrRepository.createDocument).toHaveBeenCalledWith('profile-123', 'https://storage.healthvault360.com/reports/lab-123.jpg');
      expect(mockOcrWorkerClient.processBuffer).toHaveBeenCalled();
      expect(mockAiOcrRepository.createExtraction).toHaveBeenCalled();
      expect(result.documentId).toBe('doc-123');
      expect(result.extractedData.title).toBe('Complete Blood Count (CBC) OCR');
      expect(result.extractedData.category).toBe('Laboratory');
      expect(result.extractedData.prescribedBy).toBe('Dr. John Watson');
      expect(result.confidence).toBe(0.94);
    });

    it('should throw BadRequestException if source image cannot be resolved (no synthetic fallback)', async () => {
      mockAiOcrRepository.findProfileByUserId.mockResolvedValue({ id: 'profile-123' });
      mockAiOcrRepository.createDocument.mockResolvedValue({ id: 'doc-123' });
      global.fetch = jest.fn().mockRejectedValue(new Error('Network unreachable')) as any;

      await expect(
        service.extractDocument('user-123', {
          imageUrl: 'https://storage.unreachable.example.com/notfound.png',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ServiceUnavailableException if OCR worker client is not provided', async () => {
      mockAiOcrRepository.findProfileByUserId.mockResolvedValue({ id: 'profile-123' });
      mockAiOcrRepository.createDocument.mockResolvedValue({ id: 'doc-123' });
      const serviceWithoutWorker = new AiOcrService(mockAiOcrRepository, mockLogger, undefined);

      await expect(
        serviceWithoutWorker.extractDocument('user-123', {
          imageUrl: 'https://storage.healthvault360.com/reports/lab-123.jpg',
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException if OCR worker returns success: false', async () => {
      mockAiOcrRepository.findProfileByUserId.mockResolvedValue({ id: 'profile-123' });
      mockAiOcrRepository.createDocument.mockResolvedValue({ id: 'doc-123' });
      mockOcrWorkerClient.processBuffer.mockResolvedValue({
        success: false,
        error: 'PaddleOCR engine execution error',
      });

      await expect(
        service.extractDocument('user-123', {
          imageUrl: 'https://storage.healthvault360.com/reports/lab-123.jpg',
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('confirmOcr (Phase 3 IDOR & Ownership Protection)', () => {
    it('should forbid non-owner patient from confirming another patient OCR document', async () => {
      mockAiOcrRepository.findDocumentById.mockResolvedValue({
        id: 'doc-victim-456',
        patientProfileId: 'profile-victim-789',
        status: 'PENDING_REVIEW',
      });
      mockAiOcrRepository.findProfileByUserId.mockResolvedValue({
        id: 'profile-attacker-123',
      });

      await expect(
        service.confirmOcr('user-attacker', {
          documentId: 'doc-victim-456',
          confirmedData: JSON.stringify({ title: 'Hijacked Report' }),
        }, ['PATIENT']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow owner patient to confirm own OCR document', async () => {
      mockAiOcrRepository.findDocumentById.mockResolvedValue({
        id: 'doc-own-123',
        patientProfileId: 'profile-patient-123',
        status: 'PENDING_REVIEW',
      });
      mockAiOcrRepository.findProfileByUserId.mockResolvedValue({
        id: 'profile-patient-123',
      });
      mockAiOcrRepository.createReview.mockResolvedValue({});
      mockAiOcrRepository.updateDocumentStatus.mockResolvedValue({});

      const result = await service.confirmOcr('user-patient-123', {
        documentId: 'doc-own-123',
        confirmedData: JSON.stringify({ title: 'Confirmed Report' }),
      }, ['PATIENT']);

      expect(result.success).toBe(true);
      expect(mockAiOcrRepository.updateDocumentStatus).toHaveBeenCalledWith('doc-own-123', 'CONFIRMED');
    });

    it('should allow admin to confirm any OCR document without matching patient profile', async () => {
      mockAiOcrRepository.findDocumentById.mockResolvedValue({
        id: 'doc-any-999',
        patientProfileId: 'profile-patient-999',
        status: 'PENDING_REVIEW',
      });
      mockAiOcrRepository.createReview.mockResolvedValue({});
      mockAiOcrRepository.updateDocumentStatus.mockResolvedValue({});

      const result = await service.confirmOcr('admin-user-id', {
        documentId: 'doc-any-999',
        confirmedData: JSON.stringify({ title: 'Admin Confirmed' }),
      }, ['ADMIN']);

      expect(result.success).toBe(true);
      expect(mockAiOcrRepository.findProfileByUserId).not.toHaveBeenCalled();
      expect(mockAiOcrRepository.updateDocumentStatus).toHaveBeenCalledWith('doc-any-999', 'CONFIRMED');
    });

    it('should throw BadRequestException if document is already confirmed', async () => {
      mockAiOcrRepository.findDocumentById.mockResolvedValue({
        id: 'doc-already-confirmed',
        patientProfileId: 'profile-patient-123',
        status: 'CONFIRMED',
      });
      mockAiOcrRepository.findProfileByUserId.mockResolvedValue({
        id: 'profile-patient-123',
      });

      await expect(
        service.confirmOcr('user-patient-123', {
          documentId: 'doc-already-confirmed',
          confirmedData: JSON.stringify({ title: 'Re-confirmation attempt' }),
        }, ['PATIENT']),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
