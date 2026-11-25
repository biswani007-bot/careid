import { BadRequestException } from '@nestjs/common';
import {
  validateFileSecurity,
  MAX_ATTACHMENT_FILE_SIZE,
} from '../file-security.util';

describe('file-security.util (SEC-AUD-10 Upload Byte Limits & File Security)', () => {
  const validPdfParams = {
    fileName: 'blood_test_2026.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024 * 1024, // 1MB
    storageKey: 'attachments/2026/blood_test_2026.pdf',
    storageUrl: 'https://cdn.hvapi.com/attachments/2026/blood_test_2026.pdf',
  };

  describe('MIME Type Validation', () => {
    it('should accept allowed clinical MIME types', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          allowedMimeTypes: ['application/pdf', 'image/png'],
        }),
      ).not.toThrow();
    });

    it('should reject unauthorized MIME type', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          mimeType: 'application/x-sh',
          allowedMimeTypes: ['application/pdf', 'image/png'],
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject missing or empty MIME type', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          mimeType: '',
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('File Size Ceiling Enforcement (15MB Maximum)', () => {
    it('should accept file sizes <= 15MB', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          fileSize: MAX_ATTACHMENT_FILE_SIZE,
        }),
      ).not.toThrow();
    });

    it('should reject file sizes exceeding 15MB (15728640 bytes)', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          fileSize: MAX_ATTACHMENT_FILE_SIZE + 1,
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject non-positive file sizes', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          fileSize: 0,
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          fileSize: -100,
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('Filename Path Traversal and Safety', () => {
    it('should accept clean alphanumeric filenames with safe dots and dashes', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          fileName: 'patient-report_2026.07.pdf',
        }),
      ).not.toThrow();
    });

    it('should reject path traversal sequences in fileName (..)', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          fileName: '../../etc/passwd.pdf',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject forward slashes in fileName', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          fileName: 'subfolder/report.pdf',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject backslashes in fileName', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          fileName: 'subfolder\\report.pdf',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject null bytes in fileName', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          fileName: 'report.pdf\0.exe',
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('Dangerous & Executable Extension Prevention', () => {
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.php', '.phtml', '.js', '.py', '.dll', '.msi'];

    dangerousExtensions.forEach((ext) => {
      it(`should reject executable extension '${ext}' even if MIME type is forged`, () => {
        expect(() =>
          validateFileSecurity({
            ...validPdfParams,
            fileName: `exploit${ext}`,
            mimeType: 'application/pdf',
          }),
        ).toThrow(BadRequestException);
      });

      it(`should reject disguised double-extension containing '${ext}'`, () => {
        expect(() =>
          validateFileSecurity({
            ...validPdfParams,
            fileName: `report${ext}.pdf`,
            mimeType: 'application/pdf',
          }),
        ).toThrow(BadRequestException);
      });
    });
  });

  describe('MIME-to-Extension Consistency', () => {
    it('should accept valid PDF extension for application/pdf', () => {
      expect(() =>
        validateFileSecurity({
          fileName: 'report.pdf',
          mimeType: 'application/pdf',
        }),
      ).not.toThrow();
    });

    it('should reject mismatch between .png extension and application/pdf MIME', () => {
      expect(() =>
        validateFileSecurity({
          fileName: 'report.png',
          mimeType: 'application/pdf',
        }),
      ).toThrow(BadRequestException);
    });

    it('should accept valid JPEG extensions (.jpg, .jpeg) for image/jpeg', () => {
      expect(() =>
        validateFileSecurity({
          fileName: 'photo.jpg',
          mimeType: 'image/jpeg',
        }),
      ).not.toThrow();

      expect(() =>
        validateFileSecurity({
          fileName: 'photo.jpeg',
          mimeType: 'image/jpeg',
        }),
      ).not.toThrow();
    });

    it('should accept valid DICOM extensions (.dcm, .dicom) for application/dicom', () => {
      expect(() =>
        validateFileSecurity({
          fileName: 'scan.dcm',
          mimeType: 'application/dicom',
        }),
      ).not.toThrow();

      expect(() =>
        validateFileSecurity({
          fileName: 'scan.dicom',
          mimeType: 'application/dicom',
        }),
      ).not.toThrow();
    });
  });

  describe('Storage Key Validation', () => {
    it('should accept safe hierarchical storage keys', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          storageKey: 'reports/2026/07/cbc_report_2026.pdf',
        }),
      ).not.toThrow();
    });

    it('should reject path traversal sequences (..) in storageKey', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          storageKey: '../../secret/key.pdf',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject Windows backslashes in storageKey', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          storageKey: 'reports\\2026\\key.pdf',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject null bytes in storageKey', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          storageKey: 'reports/key.pdf\0',
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('Storage URL SSRF and Protocol Safety', () => {
    it('should accept safe HTTPS storage URLs', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          storageUrl: 'https://storage.googleapis.com/bucket/report.pdf',
        }),
      ).not.toThrow();
    });

    it('should reject non-HTTP(S) protocols (ftp, file, javascript)', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          storageUrl: 'ftp://ftp.example.com/report.pdf',
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          storageUrl: 'file:///etc/passwd',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject cloud metadata service host (169.254.169.254)', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          storageUrl: 'http://169.254.169.254/latest/meta-data/',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject Google cloud metadata service host (metadata.google.internal)', () => {
      expect(() =>
        validateFileSecurity({
          ...validPdfParams,
          storageUrl: 'http://metadata.google.internal/computeMetadata/v1/',
        }),
      ).toThrow(BadRequestException);
    });
  });
});
