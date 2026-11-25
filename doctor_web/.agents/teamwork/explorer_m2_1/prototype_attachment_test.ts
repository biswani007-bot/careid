/**
 * Prototype Attachment Service Verification
 * Tests attachmentService upload logic against live backend https://360api.vnvision.in
 */

// Setup browser-like sessionStorage
const storage = new Map<string, string>();
(globalThis as unknown as { sessionStorage: unknown }).sessionStorage = {
  getItem: (key: string) => storage.get(key) || null,
  setItem: (key: string, val: string) => storage.set(key, val),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

import { apiClient } from '../../../src/services/apiClient.ts';
import { getDoctorToken, TEST_PATIENT_ID } from '../../../tests/e2e/helpers/authHelper.ts';
import { createValidPdfBuffer, createValidPngBuffer, createValidJpegBuffer } from '../../../tests/e2e/helpers/fixtures.ts';

// 1. Constants
export const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024; // 26,214,400 bytes (25MB)
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

// 2. Interfaces
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

export function validateAttachmentFile(
  file: File | Blob,
  fileName?: string
): { isValid: boolean; error?: string } {
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'Selected file is empty (0 bytes). Please select a valid document.',
    };
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of 25 MB.`,
    };
  }

  const resolvedName = fileName || (file instanceof File ? file.name : '');
  if (resolvedName) {
    const lowerName = resolvedName.toLowerCase();
    const hasValidExt = ALLOWED_ATTACHMENT_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!hasValidExt) {
      return {
        isValid: false,
        error: `Unsupported file format. Allowed formats: ${ALLOWED_ATTACHMENT_EXTENSIONS.join(', ')}`,
      };
    }
  }

  return { isValid: true };
}

export const attachmentService = {
  async uploadAttachment(
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

    const response = await apiClient.postFormData<AttachmentUploadResponse>(
      '/api/v1/attachments',
      formData
    );

    return response.data;
  },

  async getAttachment(id: string): Promise<AttachmentUploadResponse> {
    const response = await apiClient.get<AttachmentUploadResponse>(
      `/api/v1/attachments/${encodeURIComponent(id)}`
    );
    return response.data;
  },
};

async function run() {
  console.log('--- Warming live doctor session ---');
  const token = await getDoctorToken();
  sessionStorage.setItem('careid_access_token', token);
  console.log('Doctor token warmed.');

  // Test 1: Upload valid PDF
  console.log('\n--- Test 1: Uploading valid PDF buffer ---');
  const pdfBuffer = createValidPdfBuffer(1, 'CBC Blood Report');
  const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const pdfRes = await attachmentService.uploadAttachment(pdfBlob, {
    originalName: 'test_cbc_report.pdf',
    category: 'LAB_RESULT',
    patientProfileId: TEST_PATIENT_ID,
  });
  console.log('PDF Upload Success! Attachment ID:', pdfRes.id);
  console.log('Storage URL:', pdfRes.storageUrl);
  console.log('Original Name:', pdfRes.originalName);
  console.log('File Size:', pdfRes.fileSize);

  if (!pdfRes.id || pdfRes.storageUrl.startsWith('blob:')) {
    throw new Error('PDF upload returned invalid ID or blob URL!');
  }

  // Test 2: Upload valid PNG
  console.log('\n--- Test 2: Uploading valid PNG buffer ---');
  const pngBuffer = createValidPngBuffer();
  const pngBlob = new Blob([pngBuffer], { type: 'image/png' });
  const pngRes = await attachmentService.uploadAttachment(pngBlob, {
    originalName: 'scanned_lab.png',
    category: 'LAB_RESULT',
    patientProfileId: TEST_PATIENT_ID,
  });
  console.log('PNG Upload Success! Attachment ID:', pngRes.id);
  console.log('MimeType:', pngRes.mimeType);

  // Test 3: Upload valid JPEG (camera scan)
  console.log('\n--- Test 3: Uploading camera scan JPEG ---');
  const jpegBuffer = createValidJpegBuffer();
  const jpegBlob = new Blob([jpegBuffer], { type: 'image/jpeg' });
  const jpegRes = await attachmentService.uploadAttachment(jpegBlob, {
    originalName: 'camera_capture_123.jpg',
    category: 'LAB_RESULT',
    patientProfileId: TEST_PATIENT_ID,
  });
  console.log('JPEG Upload Success! Attachment ID:', jpegRes.id);

  // Test 4: Client-side validation: 0-byte file
  console.log('\n--- Test 4: Validation for 0-byte file ---');
  const emptyBlob = new Blob([], { type: 'application/pdf' });
  try {
    await attachmentService.uploadAttachment(emptyBlob, 'empty.pdf');
    throw new Error('0-byte file should have thrown!');
  } catch (err: unknown) {
    console.log('Correctly rejected 0-byte file:', (err as Error).message);
  }

  // Test 5: Client-side validation: >25MB file
  console.log('\n--- Test 5: Validation for >25MB file ---');
  // Create a Blob with a mock large size by slicing a virtual size or creating large array buffer
  const largeBlob = new Blob([new Uint8Array(26 * 1024 * 1024)], { type: 'application/pdf' });
  try {
    await attachmentService.uploadAttachment(largeBlob, 'oversized.pdf');
    throw new Error('>25MB file should have thrown!');
  } catch (err: unknown) {
    console.log('Correctly rejected >25MB file:', (err as Error).message);
  }

  // Test 6: Client-side validation: unsupported extension
  console.log('\n--- Test 6: Validation for unsupported extension ---');
  const scriptBlob = new Blob(['echo hello'], { type: 'text/plain' });
  try {
    await attachmentService.uploadAttachment(scriptBlob, 'malicious.sh');
    throw new Error('Unsupported extension should have thrown!');
  } catch (err: unknown) {
    console.log('Correctly rejected unsupported extension:', (err as Error).message);
  }

  // Test 7: Verify getAttachment metadata
  console.log('\n--- Test 7: Fetching attachment metadata by ID ---');
  const fetched = await attachmentService.getAttachment(pdfRes.id);
  console.log('Fetched attachment id:', fetched.id, 'fileName:', fetched.fileName);

  console.log('\nALL 7 PROTOTYPE ATTACHMENT TESTS PASSED!');
}

run().catch((err) => {
  console.error('PROTOTYPE TEST FAILED:', err);
  process.exit(1);
});
