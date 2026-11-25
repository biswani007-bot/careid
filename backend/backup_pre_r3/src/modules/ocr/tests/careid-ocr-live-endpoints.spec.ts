import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { OcrWorkerClient } from '../infrastructure/clients/ocr-worker.client';
import { OCRJobService } from '../application/use-cases/ocr.service';
import { AiOcrService } from '@modules/ai-ocr/application/use-cases/ai-ocr.service';
import { InsuranceService } from '@modules/insurance/application/use-cases/insurance.service';
import { QrService } from '@modules/qr/application/use-cases/qr.service';

describe('CareID Live OCR Endpoints Integration (PP-OCRv4 Mobile CPU Worker)', () => {
  let ocrWorkerClient: OcrWorkerClient;
  let ocrJobService: OCRJobService;
  let aiOcrService: AiOcrService;
  let insuranceService: InsuranceService;

  // In-memory repositories to isolate database interactions while running full business logic
  const mockJobs = new Map<string, any>();
  const mockPages = new Map<string, any[]>();
  const mockFields = new Map<string, any[]>();
  const mockAuditLogs: any[] = [];
  const mockAiOcrDocs = new Map<string, any>();
  const mockAiOcrExtractions = new Map<string, any>();
  const mockInsuranceRecords = new Map<string, any>();

  let labJobId: string;

  const mockOcrRepo: any = {
    createJob: jest.fn(async (data) => {
      const id = `job-live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const job = {
        id,
        medicalAttachmentId: data.medicalAttachmentId,
        documentType: data.documentType || 'UNKNOWN',
        status: data.status || 'QUEUED',
        submittedBy: data.submittedBy || null,
        confidenceLevel: 'MEDIUM',
        createdAt: new Date(),
        updatedAt: new Date(),
        pages: [],
        extractedFields: [],
        verifications: [],
      };
      mockJobs.set(id, job);
      return job;
    }),
    findJobById: jest.fn(async (id) => {
      const job = mockJobs.get(id);
      if (!job) return null;
      return {
        ...job,
        pages: mockPages.get(id) || [],
        extractedFields: mockFields.get(id) || [],
      };
    }),
    findAttachmentById: jest.fn(async (attachmentId) => {
      return null; // Triggers sample fallback
    }),
    updateJobStatus: jest.fn(async (id, status, overallConfidence, confidenceLevel, processingTimeMs, failureReason) => {
      const job = mockJobs.get(id);
      if (job) {
        job.status = status;
        if (overallConfidence !== undefined) job.overallConfidence = overallConfidence;
        if (confidenceLevel !== undefined) job.confidenceLevel = confidenceLevel;
        if (processingTimeMs !== undefined) job.processingTimeMs = processingTimeMs;
        if (failureReason !== undefined) job.failureReason = failureReason;
        if (status === 'COMPLETED' || status === 'REVIEW_REQUIRED') job.completedAt = new Date();
      }
      return job;
    }),
    createPage: jest.fn(async (data) => {
      const pages = mockPages.get(data.ocrJobId) || [];
      const page = { id: `page-${pages.length + 1}`, ...data, createdAt: new Date() };
      pages.push(page);
      mockPages.set(data.ocrJobId, pages);
      return page;
    }),
    createExtractedField: jest.fn(async (data) => {
      const fields = mockFields.get(data.ocrJobId) || [];
      const field = { id: `field-${fields.length + 1}`, ...data, createdAt: new Date() };
      fields.push(field);
      mockFields.set(data.ocrJobId, fields);
      return field;
    }),
    findPagesByJobId: jest.fn(async (jobId) => mockPages.get(jobId) || []),
    findExtractedFieldsByJobId: jest.fn(async (jobId) => mockFields.get(jobId) || []),
    createAuditLog: jest.fn(async (data) => {
      mockAuditLogs.push(data);
      return data;
    }),
  };

  const mockAiOcrRepo: any = {
    findProfileByUserId: jest.fn(async (userId) => ({ id: `profile-${userId}` })),
    createDocument: jest.fn(async (profileId, imageUrl) => {
      const id = `ai-doc-${Date.now()}`;
      const doc = { id, profileId, imageUrl, status: 'UPLOADED', createdAt: new Date() };
      mockAiOcrDocs.set(id, doc);
      return doc;
    }),
    createExtraction: jest.fn(async (documentId, dataJson, confidence) => {
      const id = `ai-extract-${Date.now()}`;
      const ext = { id, documentId, extractedData: dataJson, confidence, createdAt: new Date() };
      mockAiOcrExtractions.set(id, ext);
      return ext;
    }),
  };

  const mockInsuranceRepo: any = {
    findProfileByUserId: jest.fn(async (userId) => ({ id: `profile-${userId}` })),
    saveOcrRecord: jest.fn(async (patientProfileId, cardImageUrl, candidateDetailsJson) => {
      const id = `ins-ocr-${Date.now()}`;
      const rec = { id, patientProfileId, cardImageUrl, candidateDetails: candidateDetailsJson, status: 'PENDING' };
      mockInsuranceRecords.set(id, rec);
      return rec;
    }),
  };

  const mockQrService = {
    generateEmergencyAccessCard: jest.fn(),
  } as unknown as QrService;

  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  beforeAll(async () => {
    let resolvedSecret = process.env.CAREID_OCR_SECRET;
    const rootEnv = path.join(process.cwd(), '.env');
    if (!resolvedSecret && fs.existsSync(rootEnv)) {
      const match = fs.readFileSync(rootEnv, 'utf-8').match(/CAREID_OCR_SECRET=([^\r\n]+)/);
      if (match) resolvedSecret = match[1].trim();
    }

    const configService = {
      get: (key: string) => {
        if (key === 'CAREID_OCR_WORKER_URL') return 'http://127.0.0.1:5050';
        if (key === 'CAREID_OCR_SECRET') return resolvedSecret || 'test-secret';
        if (key === 'CAREID_OCR_TIMEOUT_MS') return 180000;
        return undefined;
      },
    } as unknown as ConfigService;

    ocrWorkerClient = new OcrWorkerClient(configService);
    ocrJobService = new OCRJobService(mockOcrRepo, mockLogger, ocrWorkerClient);
    aiOcrService = new AiOcrService(mockAiOcrRepo, mockLogger, ocrWorkerClient);
    insuranceService = new InsuranceService(
      mockInsuranceRepo,
      mockQrService,
      mockLogger,
      undefined,
      ocrWorkerClient,
    );

    const isWorkerReady = await ocrWorkerClient.isReady();
    if (!isWorkerReady) {
      console.warn('Persistent OCR Worker at http://127.0.0.1:5050 is not responding. Skipping live tests.');
    }
  });

  describe('Pre-flight: Worker Daemon Health', () => {
    it('should connect to persistent worker and verify PP-OCRv4 Mobile engine is ready', async () => {
      const health = await ocrWorkerClient.getHealth();
      expect(health.status).toBe('ok');
      expect(health.engineReady).toBe(true);
      expect(health.worker).toBe('CareID-Persistent-PaddleOCR');
      expect(health.ocrVersion).toBe('PP-OCRv4');
      expect(health.architecture).toContain('PP-OCRv4_mobile');
      expect(health.residentRamMb).toBeLessThan(450);
    });
  });

  describe('Endpoint 1: POST /api/v1/ocr/jobs (Real Laboratory Report OCR)', () => {
    it('should submit an OCR job, process via PaddleOCR worker, and persist genuine extracted fields', async () => {
      const result = await ocrJobService.submitJob('user-clinical-1', {
        medicalAttachmentId: 'att-lab-001',
        documentType: 'LAB_REPORT',
      });

      labJobId = result.id;
      expect(result.id).toBeDefined();
      expect(['COMPLETED', 'REVIEW_REQUIRED']).toContain(result.status);
      expect(result.isSimulated).toBe(false);
      expect(result.extractionEngine).toBe('PP-OCRv4-Mobile-CPU');
      expect(result.overallConfidence).toBeGreaterThan(0.85);
      expect(result.pages.length).toBeGreaterThanOrEqual(1);

      // Verify real OCR text from 01_lab_report.png
      const rawText = result.pages[0].rawText || '';
      expect(rawText).toMatch(/HEALTH VAULT 360/i);
      expect(rawText).toMatch(/DIAGNOSTIC LABORATORY/i);
      expect(rawText).toMatch(/Hemoglobin|WBC|Platelet/i);

      // Verify structured clinical fields were extracted
      expect(result.extractedFields.length).toBeGreaterThan(0);
      const fieldNames = result.extractedFields.map((f) => f.fieldName);
      expect(fieldNames).toContain('patient_name');
    }, 90000);
  });

  describe('Endpoint 2: POST /api/v1/ocr/reprocess/:jobId (Real Prescription OCR)', () => {
    it('should reprocess an existing job using live PaddleOCR worker', async () => {
      const created = await ocrJobService.submitJob('user-clinical-1', {
        medicalAttachmentId: 'att-rx-002',
        documentType: 'PRESCRIPTION',
      });

      const reprocessed = await ocrJobService.reprocessJob(created.id, {
        userId: 'user-clinical-1',
        roles: ['ADMIN'],
      });

      expect(reprocessed.id).toBe(created.id);
      expect(['COMPLETED', 'REVIEW_REQUIRED']).toContain(reprocessed.status);
      expect(reprocessed.isSimulated).toBe(false);
      expect(reprocessed.extractionEngine).toBe('PP-OCRv4-Mobile-CPU');
    }, 45000);
  });

  describe('Endpoint 3: GET /api/v1/ocr/jobs/:id/text', () => {
    it('should return genuine raw combined OCR text', async () => {
      expect(labJobId).toBeDefined();
      const textResponse = await ocrJobService.getJobText(labJobId);
      expect(textResponse.text).toBeDefined();
      expect(textResponse.text.length).toBeGreaterThan(50);
      expect(textResponse.text).toMatch(/HEALTH VAULT 360/i);
      expect(textResponse.text).toMatch(/Hemoglobin/i);
    }, 15000);
  });

  describe('Endpoint 4: GET /api/v1/ocr/jobs/:id/fields', () => {
    it('should return list of real extracted fields with bounding boxes and validation status', async () => {
      expect(labJobId).toBeDefined();
      const fields = await ocrJobService.getJobFields(labJobId);
      expect(fields.length).toBeGreaterThan(0);
      for (const field of fields) {
        expect(field.fieldName).toBeDefined();
        expect(field.fieldValue).toBeDefined();
        expect(field.confidence).toBeGreaterThan(0.5);
        expect(['VALIDATED', 'REVIEW_REQUIRED']).toContain(field.validationStatus);
      }
    }, 15000);
  });

  describe('Endpoint 5: GET /api/v1/ocr/jobs/:id/json', () => {
    it('should return structured JSON without simulation disclaimers', async () => {
      expect(labJobId).toBeDefined();
      const jsonResponse = await ocrJobService.getJobJson(labJobId);
      expect(jsonResponse.isSimulated).toBe(false);
      expect(jsonResponse.engine).toBe('PP-OCRv4-Mobile-CPU');
      expect(jsonResponse.disclaimer).toBeUndefined();
      expect(jsonResponse.fields).toBeDefined();
      expect(Object.keys(jsonResponse.fields).length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Endpoint 6: POST /api/v1/ai/ocr/extract (AI Document OCR)', () => {
    it('should extract document candidate data using persistent PaddleOCR worker', async () => {
      const samplePath = path.join(process.cwd(), 'ocr-poc', 'sample_docs', '01_lab_report.png');
      const result = await aiOcrService.extractDocument('patient-user-1', {
        imageUrl: samplePath,
      });

      expect(result.documentId).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.85);
      expect(result.extractedData.title).toMatch(/Laboratory|Blood|Report|CBC/i);
      expect(result.extractedData.category).toBe('Laboratory');
      expect(result.extractedData.prescribedBy).toMatch(/Dr\./i);
    }, 45000);
  });

  describe('Endpoint 7: POST /api/v1/insurance/ocr & /scan (Insurance Card OCR)', () => {
    it('should scan insurance card image buffer and extract candidate policy details with real OCR', async () => {
      const cardPath = path.join(process.cwd(), 'ocr-poc', 'sample_docs', '03_insurance_card.png');
      const cardBuffer = fs.readFileSync(cardPath);

      const result = await insuranceService.scanInsuranceCard(
        'patient-user-1',
        ['PATIENT'],
        undefined,
        {
          buffer: cardBuffer,
          size: cardBuffer.length,
          originalname: '03_insurance_card.png',
          mimetype: 'image/png',
        },
      );

      expect(result.ocrId).toBeDefined();
      expect(result.isSimulated).toBe(false);
      expect(result.engine).toBe('PP-OCRv4-Mobile-CPU');
      expect(result.disclaimer).toBeUndefined();
      expect(result.confidence).toBeGreaterThan(0.85);
      expect(result.extractedData.providerName).toMatch(/Blue Shield/i);
      expect(result.extractedData.policyNumber).toBeDefined();
    }, 45000);
  });
});
