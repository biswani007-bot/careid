/**
 * CareID Doctor-Web Attachment Service
 * 
 * Manages authentic binary document uploads and attachment streaming
 * against https://360api.vnvision.in/api/v1/attachments.
 * 
 * Source of Truth: Postman Collection Folder 16 ("File Uploads & Attachments")
 */

import { apiClient, ApiResponse } from './apiClient';

export const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15,728,640 bytes (15 MB matching live backend limit)

export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.tiff',
  '.dcm',
  '.dicom',
] as const;

export type AllowedAttachmentExtension = typeof ALLOWED_ATTACHMENT_EXTENSIONS[number];

export interface AttachmentUploadOptions {
  originalName?: string;
  category?: string;
  patientProfileId?: string;
}

export interface AttachmentUploadResponse {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  storageUrl: string;
  category?: string;
  patientProfileId?: string;
  medicalRecordId?: string | null;
  checksum?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttachmentValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates file size and format before initiating network upload.
 * Enforces:
 * 1. Non-zero byte size (file.size > 0).
 * 2. Max 15MB threshold (file.size <= 15 * 1024 * 1024).
 * 3. Allowed extensions (.pdf, .jpg, .jpeg, .png, .webp, .tiff, .dcm, .dicom).
 */
export function validateAttachmentFile(
  file: File | Blob,
  fileName?: string
): AttachmentValidationResult {
  if (!file || file.size === 0) {
    return {
      isValid: false,
      error: 'Selected file is empty (0 bytes). Please select a valid document.',
    };
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File size (${sizeMb} MB) exceeds the maximum allowed limit of 15 MB.`,
    };
  }

  const resolvedName = fileName || (file instanceof File ? file.name : '');
  if (resolvedName) {
    const lower = resolvedName.toLowerCase();
    const hasValidExt = ALLOWED_ATTACHMENT_EXTENSIONS.some((ext) => lower.endsWith(ext));
    if (!hasValidExt) {
      return {
        isValid: false,
        error: `Unsupported file format. Allowed formats: ${ALLOWED_ATTACHMENT_EXTENSIONS.join(', ')}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Returns relative streaming URL for attachment file
 */
export function getAttachmentFileUrl(fileName: string): string {
  return `/api/v1/attachments/file/${encodeURIComponent(fileName)}`;
}

/**
 * Upload binary document via multipart/form-data to POST /api/v1/attachments
 * Supports both options object and positional arguments:
 * - uploadAttachment(file, options)
 * - uploadAttachment(file, originalName, category, patientProfileId)
 */
export async function uploadAttachment(
  file: File | Blob,
  optionsOrOriginalName?: AttachmentUploadOptions | string,
  category?: string,
  patientProfileId?: string
): Promise<AttachmentUploadResponse> {
  let options: AttachmentUploadOptions = {};

  if (typeof optionsOrOriginalName === 'string') {
    options = {
      originalName: optionsOrOriginalName,
      category,
      patientProfileId,
    };
  } else if (optionsOrOriginalName) {
    options = optionsOrOriginalName;
  }

  const originalName =
    options.originalName ||
    (file instanceof File ? file.name : `attachment_${Date.now()}.bin`);

  // Client-side pre-flight validation
  const validation = validateAttachmentFile(file, originalName);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const formData = new FormData();
  formData.append('file', file, originalName);
  formData.append('category', options.category || 'LAB_RESULT');
  if (options.patientProfileId) {
    formData.append('patientProfileId', options.patientProfileId);
  }

  const response: ApiResponse<AttachmentUploadResponse> =
    await apiClient.postFormData<AttachmentUploadResponse>(
      '/api/v1/attachments',
      formData
    );

  return response.data;
}

export const attachmentService = {
  uploadAttachment,
  validateAttachmentFile,
  getAttachmentFileUrl,
};
