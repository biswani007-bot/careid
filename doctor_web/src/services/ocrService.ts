/**
 * CareID Doctor Web - OCR Service
 * 
 * Source of Truth: Postman Collection (CareID-Staging.postman_collection.json)
 * Folder: 15. OCR & Document Verification
 * - POST /api/v1/ocr/jobs
 * - GET  /api/v1/ocr/jobs
 * - GET  /api/v1/ocr/jobs/:id
 * - GET  /api/v1/ocr/jobs/:id/fields
 * - GET  /api/v1/ocr/jobs/:id/text
 * - GET  /api/v1/ocr/jobs/:id/json
 * - GET  /api/v1/ocr/dashboard
 * - GET  /api/v1/ocr/statistics
 * - POST /api/v1/ocr/reprocess/:jobId
 * - POST /api/v1/ai/ocr/extract
 * - POST /api/v1/ai/ocr/confirm
 */

import { apiClient } from './apiClient';

export type BackendOcrStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'REVIEW_REQUIRED'
  | 'NEEDS_REVIEW'
  | 'COMPLETED'
  | 'FAILED';

export interface BackendOcrPage {
  id: string;
  ocrJobId: string;
  pageNumber: number;
  imagePath?: string;
  rawText?: string;
  confidence?: number;
  rotationAngle?: number;
  processingMetadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface BackendOcrField {
  id: string;
  ocrJobId: string;
  fieldName: string;
  fieldValue: string;
  confidence: number;
  validationStatus: string;
  requiresReview?: boolean;
  boundingBox?: Record<string, unknown>;
  createdAt?: string;
}

export type ExtractedOcrField = BackendOcrField;

export interface BackendOcrJob {
  id: string;
  medicalAttachmentId?: string;
  documentType: string;
  status: BackendOcrStatus;
  submittedBy?: string;
  startedAt?: string;
  completedAt?: string;
  processingTimeMs?: number;
  overallConfidence: number;
  confidenceLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  isSimulated?: boolean;
  extractionEngine?: string;
  failureReason?: string;
  pages?: BackendOcrPage[];
  extractedFields?: BackendOcrField[];
  verifications?: unknown[];
  updatedAt?: string;
}

export interface BackendOcrStructuredJson {
  jobId: string;
  medicalAttachmentId?: string;
  documentType?: string;
  overallConfidence?: number;
  confidenceLevel?: string;
  status: BackendOcrStatus | string;
  isSimulated?: boolean;
  engine?: string;
  fields?: Record<
    string,
    {
      value: string;
      confidence?: number;
      status?: string;
    }
  >;
  [key: string]: unknown;
}

export interface SubmitOcrJobPayload {
  medicalAttachmentId: string;
  documentType?: string;
}

export interface PollOcrJobOptions {
  onStatusChange?: (status: string) => void;
  intervalMs?: number;
  timeoutMs?: number;
  maxAttempts?: number;
}

export interface OcrJobListResponse {
  total: number;
  page: number;
  limit: number;
  items: BackendOcrJob[];
}

export interface OcrDashboardSummary {
  totalJobs?: number;
  completedJobs?: number;
  failedJobs?: number;
  averageConfidence?: number;
  averageProcessingTimeMs?: number;
  jobsByType?: Record<string, number>;
  jobsByStatus?: Record<string, number>;
}

export interface AiOcrExtractResponse {
  documentId: string;
  extractedData: {
    title?: string;
    category?: string;
    prescribedBy?: string;
    patientName?: string;
    mrn?: string;
    date?: string;
    [key: string]: unknown;
  };
  confidence: number;
}

export interface AiOcrConfirmResponse {
  success: boolean;
  message: string;
}

export const ocrService = {
  /**
   * Submit an attachment for local CPU OCR processing
   * POST /api/v1/ocr/jobs
   */
  async submitOcrJob(
    payloadOrAttachmentId: SubmitOcrJobPayload | string,
    documentType?: string
  ): Promise<BackendOcrJob> {
    const payload: SubmitOcrJobPayload =
      typeof payloadOrAttachmentId === 'string'
        ? {
            medicalAttachmentId: payloadOrAttachmentId,
            documentType: documentType || 'LAB_REPORT',
          }
        : {
            medicalAttachmentId: payloadOrAttachmentId.medicalAttachmentId,
            documentType: payloadOrAttachmentId.documentType || 'LAB_REPORT',
          };

    const res = await apiClient.post<BackendOcrJob>('/api/v1/ocr/jobs', payload);
    return res.data;
  },

  /**
   * Get OCR job status and details by ID (canonical contract)
   * GET /api/v1/ocr/jobs/:id
   */
  async getOcrJobStatus(jobId: string): Promise<BackendOcrJob> {
    if (!jobId || !jobId.trim()) {
      throw new Error('Valid OCR Job ID is required.');
    }
    const res = await apiClient.get<BackendOcrJob>(`/api/v1/ocr/jobs/${encodeURIComponent(jobId)}`);
    return res.data;
  },

  /**
   * Backward-compatible alias for getOcrJobStatus
   */
  async getOcrJob(jobId: string): Promise<BackendOcrJob> {
    return this.getOcrJobStatus(jobId);
  },

  /**
   * Get extracted structured fields with confidence scores for a job
   * GET /api/v1/ocr/jobs/:id/fields
   */
  async getOcrJobFields(jobId: string): Promise<ExtractedOcrField[]> {
    if (!jobId || !jobId.trim()) {
      throw new Error('Valid OCR Job ID is required.');
    }
    const res = await apiClient.get<ExtractedOcrField[]>(`/api/v1/ocr/jobs/${encodeURIComponent(jobId)}/fields`);
    return Array.isArray(res.data) ? res.data : [];
  },

  /**
   * Backward-compatible alias for getOcrJobFields
   */
  async getOcrFields(jobId: string): Promise<ExtractedOcrField[]> {
    return this.getOcrJobFields(jobId);
  },

  /**
   * Get extracted raw text for a job
   * GET /api/v1/ocr/jobs/:id/text
   */
  async getOcrJobText(jobId: string): Promise<{ text: string }> {
    if (!jobId || !jobId.trim()) {
      throw new Error('Valid OCR Job ID is required.');
    }
    const res = await apiClient.get<string | { text: string }>(`/api/v1/ocr/jobs/${encodeURIComponent(jobId)}/text`);
    if (typeof res.data === 'string') {
      return { text: res.data };
    }
    if (res.data && typeof (res.data as { text?: string }).text === 'string') {
      return { text: (res.data as { text: string }).text };
    }
    return { text: '' };
  },

  /**
   * Backward-compatible alias for getOcrJobText
   */
  async getOcrText(jobId: string): Promise<{ text: string }> {
    return this.getOcrJobText(jobId);
  },

  /**
   * Get complete structured document representation as JSON
   * GET /api/v1/ocr/jobs/:id/json
   */
  async getOcrJobJson(jobId: string): Promise<BackendOcrStructuredJson> {
    if (!jobId || !jobId.trim()) {
      throw new Error('Valid OCR Job ID is required.');
    }
    const res = await apiClient.get<BackendOcrStructuredJson>(`/api/v1/ocr/jobs/${encodeURIComponent(jobId)}/json`);
    return res.data;
  },

  /**
   * Backward-compatible alias for getOcrJobJson
   */
  async getOcrJson(jobId: string): Promise<BackendOcrStructuredJson> {
    return this.getOcrJobJson(jobId);
  },

  /**
   * List all OCR jobs with optional status, document type, and pagination filters
   * GET /api/v1/ocr/jobs
   */
  async listOcrJobs(params?: {
    page?: number;
    limit?: number;
    status?: string;
    documentType?: string;
  }): Promise<OcrJobListResponse | BackendOcrJob[]> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.status) query.append('status', params.status);
    if (params?.documentType) query.append('documentType', params.documentType);

    const queryString = query.toString();
    const endpoint = `/api/v1/ocr/jobs${queryString ? `?${queryString}` : ''}`;
    const res = await apiClient.get<OcrJobListResponse | BackendOcrJob[]>(endpoint);
    return res.data;
  },

  /**
   * Get OCR analytics dashboard summary
   * GET /api/v1/ocr/dashboard
   */
  async getOcrDashboard(): Promise<OcrDashboardSummary> {
    const res = await apiClient.get<OcrDashboardSummary>('/api/v1/ocr/dashboard');
    return res.data;
  },

  /**
   * Reprocess a completed, failed, or review-required OCR job
   * Primary route: POST /api/v1/ocr/jobs/:jobId/reprocess
   * Fallback route: POST /api/v1/ocr/reprocess/:jobId
   */
  async reprocessOcrJob(jobId: string): Promise<BackendOcrJob> {
    if (!jobId || !jobId.trim()) {
      throw new Error('Valid OCR Job ID is required for reprocessing.');
    }
    try {
      const res = await apiClient.post<BackendOcrJob>(`/api/v1/ocr/jobs/${encodeURIComponent(jobId)}/reprocess`);
      return res.data;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 404) {
        const fallback = await apiClient.post<BackendOcrJob>(`/api/v1/ocr/reprocess/${encodeURIComponent(jobId)}`);
        return fallback.data;
      }
      throw err;
    }
  },

  /**
   * AI Image Scan & Candidate Metadata Extraction
   * POST /api/v1/ai/ocr/extract
   */
  async extractAiOcr(imageUrl: string): Promise<AiOcrExtractResponse> {
    const res = await apiClient.post<AiOcrExtractResponse>('/api/v1/ai/ocr/extract', { imageUrl });
    return res.data;
  },

  /**
   * AI OCR Candidate Field Review & Confirmation
   * POST /api/v1/ai/ocr/confirm
   */
  async confirmAiOcr(documentId: string, confirmedData: Record<string, unknown>): Promise<AiOcrConfirmResponse> {
    const res = await apiClient.post<AiOcrConfirmResponse>('/api/v1/ai/ocr/confirm', {
      documentId,
      confirmedData: JSON.stringify(confirmedData),
    });
    return res.data;
  },

  /**
   * Poll OCR job until completion, review-required, or clock-based timeout
   * - Treats COMPLETED, REVIEW_REQUIRED, and NEEDS_REVIEW as successful terminal statuses
   * - Treats FAILED as terminal failure and throws descriptive Error
   * - Notifies onStatusChange callback with authentic status transitions
   * - Supports flexible options object or backward-compatible arguments
   */
  async pollOcrJob(
    jobId: string,
    optionsOrOnProgress?:
      | ((status: string) => void)
      | PollOcrJobOptions
      | number,
    timeoutMsOrMaxAttempts?: number,
    intervalMsParam?: number
  ): Promise<BackendOcrJob> {
    if (!jobId || !jobId.trim()) {
      throw new Error('Valid OCR Job ID is required for status polling.');
    }

    let onStatusChange: ((status: string) => void) | undefined;
    let intervalMs = 800;
    let timeoutMs = 60000;
    let maxAttempts = 100;

    if (typeof optionsOrOnProgress === 'function') {
      onStatusChange = optionsOrOnProgress;
      if (typeof timeoutMsOrMaxAttempts === 'number') {
        timeoutMs = timeoutMsOrMaxAttempts;
      }
      if (typeof intervalMsParam === 'number') {
        intervalMs = intervalMsParam;
      }
    } else if (typeof optionsOrOnProgress === 'object' && optionsOrOnProgress !== null) {
      onStatusChange = optionsOrOnProgress.onStatusChange;
      if (optionsOrOnProgress.intervalMs) intervalMs = optionsOrOnProgress.intervalMs;
      if (optionsOrOnProgress.timeoutMs) timeoutMs = optionsOrOnProgress.timeoutMs;
      if (optionsOrOnProgress.maxAttempts) maxAttempts = optionsOrOnProgress.maxAttempts;
    } else if (typeof optionsOrOnProgress === 'number') {
      // Legacy signature: (jobId, intervalMs, maxAttempts)
      intervalMs = optionsOrOnProgress;
      if (typeof timeoutMsOrMaxAttempts === 'number') {
        maxAttempts = timeoutMsOrMaxAttempts;
        timeoutMs = maxAttempts * intervalMs + 5000;
      }
    }

    const startTime = Date.now();
    let attempts = 0;
    let lastStatus: string | undefined;

    while (attempts < maxAttempts && Date.now() - startTime < timeoutMs) {
      attempts++;
      let job: BackendOcrJob;
      try {
        job = await this.getOcrJobStatus(jobId);
      } catch (err: unknown) {
        // Fast-fail on fatal client/auth errors (404, 400, 401, 403)
        if (err && typeof err === 'object' && 'statusCode' in err) {
          const code = (err as { statusCode: number }).statusCode;
          if (code === 404 || code === 400 || code === 401 || code === 403) {
            throw err;
          }
        }
        // Transient network or 503 errors: sleep and retry
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        continue;
      }

      if (job.status !== lastStatus) {
        lastStatus = job.status;
        try {
          onStatusChange?.(job.status);
        } catch {
          // Callback execution errors should not crash the poller
        }
      }

      // Terminal successful statuses
      if (
        job.status === 'COMPLETED' ||
        job.status === 'REVIEW_REQUIRED' ||
        job.status === 'NEEDS_REVIEW'
      ) {
        return job;
      }

      // Terminal failure status
      if (job.status === 'FAILED') {
        const reason =
          job.failureReason ||
          `OCR Processing was reported as FAILED by backend (Job ID: ${job.id})`;
        const err = new Error(reason);
        (err as { job?: BackendOcrJob }).job = job;
        throw err;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(
      `OCR job polling timed out after ${timeoutMs}ms (attempts: ${attempts}, lastStatus: ${lastStatus || 'unknown'}).`
    );
  },
};

export const {
  submitOcrJob,
  getOcrJob,
  getOcrJobStatus,
  getOcrJobFields,
  getOcrFields,
  getOcrJobText,
  getOcrText,
  getOcrJobJson,
  getOcrJson,
  listOcrJobs,
  getOcrDashboard,
  reprocessOcrJob,
  extractAiOcr,
  confirmAiOcr,
  pollOcrJob,
} = ocrService;
