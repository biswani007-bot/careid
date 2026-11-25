/**
 * CareID E2E Test Suite - API Helper
 * Encapsulates live HTTP endpoints, multipart payload construction, and response parsing.
 */

import { BASE_URL, getAuthHeaders, TEST_PATIENT_ID } from './authHelper.ts';

export interface AttachmentUploadResult {
  id: string;
  patientProfileId?: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  storageKey: string;
  storageUrl: string;
  checksum?: string;
}

export interface BackendOcrJobResult {
  id: string;
  medicalAttachmentId?: string;
  documentType: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVIEW_REQUIRED' | 'NEEDS_REVIEW';
  submittedBy?: string;
  startedAt?: string;
  completedAt?: string;
  processingTimeMs?: number;
  overallConfidence?: number;
  confidenceLevel?: string;
  failureReason?: string;
  pages?: Array<{
    id: string;
    pageNumber: number;
    rawText?: string;
    confidence?: number;
  }>;
  extractedFields?: Array<{
    id: string;
    fieldName: string;
    fieldValue: string;
    confidence: number;
    validationStatus?: string;
    requiresReview?: boolean;
  }>;
}

/**
 * Upload binary document via multipart/form-data to POST /api/v1/attachments
 */
export async function uploadMultipartAttachment(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  options: {
    category?: string;
    patientProfileId?: string;
    token?: string;
  } = {}
): Promise<{ status: number; body: { data?: AttachmentUploadResult; message?: string | string[]; error?: string } }> {
  const token = options.token;
  const headers = await getAuthHeaders(token);
  // Remove Content-Type so fetch calculates multipart boundary
  delete headers['Content-Type'];

  const form = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeType });
  form.append('file', blob, filename);
  form.append('category', options.category || 'LAB_RESULT');
  form.append('patientProfileId', options.patientProfileId || TEST_PATIENT_ID);

  const res = await fetch(`${BASE_URL}/attachments`, {
    method: 'POST',
    headers,
    body: form,
  });

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * Submit OCR job to POST /api/v1/ocr/jobs
 */
export async function submitOcrJob(
  attachmentId: string,
  documentType: string = 'LAB_REPORT',
  token?: string
): Promise<{ status: number; body: { data?: BackendOcrJobResult; message?: string | string[]; error?: string } }> {
  const headers = await getAuthHeaders(token);
  headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}/ocr/jobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      medicalAttachmentId: attachmentId,
      documentType,
    }),
  });

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * Poll OCR job status via GET /api/v1/ocr/jobs/:id
 */
export async function pollOcrJob(
  jobId: string,
  maxAttempts: number = 10,
  intervalMs: number = 800,
  token?: string
): Promise<BackendOcrJobResult> {
  const headers = await getAuthHeaders(token);

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${BASE_URL}/ocr/jobs/${encodeURIComponent(jobId)}`, {
      method: 'GET',
      headers,
    });

    if (res.ok) {
      const json = await res.json();
      const job: BackendOcrJobResult = json?.data || json;
      if (
        job.status === 'COMPLETED' ||
        job.status === 'FAILED' ||
        job.status === 'REVIEW_REQUIRED' ||
        job.status === 'NEEDS_REVIEW'
      ) {
        return job;
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  // Final fetch
  const finalRes = await fetch(`${BASE_URL}/ocr/jobs/${encodeURIComponent(jobId)}`, {
    method: 'GET',
    headers,
  });
  const finalJson = await finalRes.json();
  return finalJson?.data || finalJson;
}

/**
 * Fetch OCR fields from GET /api/v1/ocr/jobs/:id/fields
 */
export async function getOcrJobFields(
  jobId: string,
  token?: string
): Promise<Array<{ id: string; fieldName: string; fieldValue: string; confidence: number }>> {
  const headers = await getAuthHeaders(token);
  const res = await fetch(`${BASE_URL}/ocr/jobs/${encodeURIComponent(jobId)}/fields`, {
    method: 'GET',
    headers,
  });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
}

/**
 * Fetch OCR raw text from GET /api/v1/ocr/jobs/:id/text
 */
export async function getOcrJobText(jobId: string, token?: string): Promise<string> {
  const headers = await getAuthHeaders(token);
  const res = await fetch(`${BASE_URL}/ocr/jobs/${encodeURIComponent(jobId)}/text`, {
    method: 'GET',
    headers,
  });
  if (!res.ok) return '';
  const json = await res.json();
  if (typeof json?.data === 'string') return json.data;
  if (typeof json?.data?.text === 'string') return json.data.text;
  return typeof json?.text === 'string' ? json.text : '';
}

/**
 * Reprocess OCR job via POST /api/v1/ocr/jobs/:jobId/reprocess (or /ocr/reprocess/:jobId)
 */
export async function reprocessOcrJob(
  jobId: string,
  token?: string
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers = await getAuthHeaders(token);
  headers['Content-Type'] = 'application/json';

  let res = await fetch(`${BASE_URL}/ocr/jobs/${encodeURIComponent(jobId)}/reprocess`, {
    method: 'POST',
    headers,
  });
  if (!res.ok && res.status === 404) {
    res = await fetch(`${BASE_URL}/ocr/reprocess/${encodeURIComponent(jobId)}`, {
      method: 'POST',
      headers,
    });
  }
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * Fetch patient demographics via GET /api/v1/doctors/patients/:patientProfileId
 */
export async function getDoctorPatientProfile(
  patientId: string = TEST_PATIENT_ID,
  token?: string
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers = await getAuthHeaders(token);
  const res = await fetch(`${BASE_URL}/doctors/patients/${encodeURIComponent(patientId)}`, {
    method: 'GET',
    headers,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * Fetch authorized patient medical records via GET /api/v1/doctors/patients/:patientProfileId/medical-records
 */
export async function getPatientMedicalRecords(
  patientId: string = TEST_PATIENT_ID,
  token?: string
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers = await getAuthHeaders(token);
  const res = await fetch(`${BASE_URL}/doctors/patients/${encodeURIComponent(patientId)}/medical-records`, {
    method: 'GET',
    headers,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * Create medical record via POST /api/v1/doctors/patients/:patientProfileId/medical-records
 */
export async function createMedicalRecord(
  patientId: string = TEST_PATIENT_ID,
  payload: Record<string, unknown>,
  token?: string
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers = await getAuthHeaders(token);
  headers['Content-Type'] = 'application/json';

  // CreateMedicalRecordDto strictly forbids 'attachments' in the root JSON payload.
  // We sanitize payload so that clinical notes and encounters are persisted cleanly.
  const cleanPayload = { ...payload };
  delete cleanPayload.attachments;

  const res = await fetch(`${BASE_URL}/doctors/patients/${encodeURIComponent(patientId)}/medical-records`, {
    method: 'POST',
    headers,
    body: JSON.stringify(cleanPayload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * Link an attachment to an existing medical record via POST /api/v1/medical-records/:id/attachments
 */
export async function linkAttachmentToMedicalRecord(
  recordId: string,
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  patientProfileId: string = TEST_PATIENT_ID,
  token?: string
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers = await getAuthHeaders(token);
  delete headers['Content-Type'];

  const form = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeType });
  form.append('file', blob, filename);
  form.append('category', 'LAB_RESULT');
  form.append('patientProfileId', patientProfileId);

  const res = await fetch(`${BASE_URL}/medical-records/${encodeURIComponent(recordId)}/attachments`, {
    method: 'POST',
    headers,
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}
