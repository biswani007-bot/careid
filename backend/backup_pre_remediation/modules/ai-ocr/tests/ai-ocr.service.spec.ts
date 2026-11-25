import { AiOcrService } from '../application/use-cases/ai-ocr.service';
import { Logger } from 'nestjs-pino';
import { OcrWorkerClient } from '@modules/ocr/infrastructure/clients/ocr-worker.client';

describe('AiOcrService', () => {
  let service: AiOcrService;
  let mockAiOcrRepository: any;
  let mockOcrWorkerClient: any;
  let mockLogger: any;

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
      processFile: jest.fn().mockResolvedValue({
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
      }),
      processBuffer: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    service = new AiOcrService(mockAiOcrRepository, mockLogger, mockOcrWorkerClient as OcrWorkerClient);
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
      expect(mockOcrWorkerClient.processFile).toHaveBeenCalled();
      expect(mockAiOcrRepository.createExtraction).toHaveBeenCalled();
      expect(result.documentId).toBe('doc-123');
      expect(result.extractedData.title).toBe('Complete Blood Count (CBC) OCR');
      expect(result.extractedData.category).toBe('Laboratory');
      expect(result.extractedData.prescribedBy).toBe('Dr. John Watson');
      expect(result.confidence).toBe(0.94);
    });
  });
});
