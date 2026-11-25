import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateAttachmentDto, ALLOWED_ATTACHMENT_MIME_TYPES } from '../presentation/dto/create-attachment.dto';
import { UploadReportDto, ReplaceReportFileDto, ALLOWED_REPORT_MIME_TYPES } from '../../report/presentation/dto/upload-report.dto';

describe('Attachment DTO Validation (SEC-AUD-08)', () => {
  describe('CreateAttachmentDto', () => {
    const validPayload = {
      fileName: 'cbc_report.pdf',
      originalName: 'Complete_Blood_Count.pdf',
      fileSize: 1048576, // 1MB
      mimeType: 'application/pdf',
      storageKey: 'attachments/2026/10/cbc_report.pdf',
      storageUrl: 'https://cdn.hvapi.com/attachments/2026/10/cbc_report.pdf',
    };

    it('passes validation for valid clinical attachments', async () => {
      const dto = plainToInstance(CreateAttachmentDto, validPayload);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('accepts all permitted clinical MIME types', async () => {
      for (const mime of ALLOWED_ATTACHMENT_MIME_TYPES) {
        const dto = plainToInstance(CreateAttachmentDto, {
          ...validPayload,
          mimeType: mime,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('rejects disallowed executable or script MIME types', async () => {
      const disallowedMimes = [
        'application/x-msdownload',
        'application/octet-stream',
        'text/html',
        'application/javascript',
        'application/x-sh',
        'text/php',
      ];

      for (const mime of disallowedMimes) {
        const dto = plainToInstance(CreateAttachmentDto, {
          ...validPayload,
          mimeType: mime,
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((e) => e.property === 'mimeType')).toBe(true);
      }
    });

    it('rejects files exceeding 15MB limit', async () => {
      const dto = plainToInstance(CreateAttachmentDto, {
        ...validPayload,
        fileSize: 15 * 1024 * 1024 + 1, // 15MB + 1 byte
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'fileSize')).toBe(true);
    });

    it('rejects files with non-positive fileSize (0 or negative)', async () => {
      const zeroDto = plainToInstance(CreateAttachmentDto, {
        ...validPayload,
        fileSize: 0,
      });
      const zeroErrors = await validate(zeroDto);
      expect(zeroErrors.some((e) => e.property === 'fileSize')).toBe(true);

      const negDto = plainToInstance(CreateAttachmentDto, {
        ...validPayload,
        fileSize: -100,
      });
      const negErrors = await validate(negDto);
      expect(negErrors.some((e) => e.property === 'fileSize')).toBe(true);
    });

    it('rejects invalid storageUrl', async () => {
      const invalidUrls = ['not-a-url', 'ftp://internal/path', 'javascript:alert(1)'];
      for (const storageUrl of invalidUrls) {
        const dto = plainToInstance(CreateAttachmentDto, {
          ...validPayload,
          storageUrl,
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'storageUrl')).toBe(true);
      }
    });

    it('accepts standard storageKey paths without requiring them to be URLs', async () => {
      const dto = plainToInstance(CreateAttachmentDto, {
        ...validPayload,
        storageKey: 'internal/storage/path/cbc.pdf',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('rejects path traversal sequences in storageKey (SEC-AUD-08)', async () => {
      const traversalKeys = [
        '../../etc/passwd',
        '..\\windows\\system32',
        'attachments/../../secret.key',
        'path/with/\0nullbyte',
        'reports\\windows\\path.pdf',
      ];
      for (const storageKey of traversalKeys) {
        const dto = plainToInstance(CreateAttachmentDto, {
          ...validPayload,
          storageKey,
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'storageKey')).toBe(true);
      }
    });

    it('rejects path separators and traversal in fileName (SEC-AUD-08)', async () => {
      const invalidFileNames = [
        '../../etc/passwd',
        'subdir/cbc.pdf',
        'subdir\\cbc.pdf',
        'file\0name.pdf',
      ];
      for (const fileName of invalidFileNames) {
        const dto = plainToInstance(CreateAttachmentDto, {
          ...validPayload,
          fileName,
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'fileName')).toBe(true);
      }
    });
  });

  describe('UploadReportDto', () => {
    const validReportPayload = {
      title: 'Lipid Profile',
      fileName: 'lipid_panel.pdf',
      fileSize: 524288,
      mimeType: 'application/pdf',
      storageUrl: 'https://cdn.hvapi.com/reports/2026/10/lipid_panel.pdf',
    };

    it('passes validation for valid report upload', async () => {
      const dto = plainToInstance(UploadReportDto, validReportPayload);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('rejects upload when fileSize exceeds 15MB', async () => {
      const dto = plainToInstance(UploadReportDto, {
        ...validReportPayload,
        fileSize: 20 * 1024 * 1024,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'fileSize')).toBe(true);
    });

    it('rejects upload with disallowed MIME type', async () => {
      const dto = plainToInstance(UploadReportDto, {
        ...validReportPayload,
        mimeType: 'application/x-msdownload',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'mimeType')).toBe(true);
    });

    it('rejects upload with malformed storageUrl', async () => {
      const dto = plainToInstance(UploadReportDto, {
        ...validReportPayload,
        storageUrl: 'malformed_url_string',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'storageUrl')).toBe(true);
    });

    it('rejects upload with path traversal in storageKey or fileName (SEC-AUD-08)', async () => {
      const traversalKeyDto = plainToInstance(UploadReportDto, {
        ...validReportPayload,
        storageKey: '../../etc/passwd',
      });
      const keyErrors = await validate(traversalKeyDto);
      expect(keyErrors.some((e) => e.property === 'storageKey')).toBe(true);

      const traversalFileDto = plainToInstance(UploadReportDto, {
        ...validReportPayload,
        fileName: '../../shadow.pdf',
      });
      const fileErrors = await validate(traversalFileDto);
      expect(fileErrors.some((e) => e.property === 'fileName')).toBe(true);
    });
  });

  describe('ReplaceReportFileDto', () => {
    const validReplacePayload = {
      fileName: 'lipid_panel_v2.pdf',
      fileSize: 600000,
      mimeType: 'application/pdf',
      storageUrl: 'https://cdn.hvapi.com/reports/2026/10/lipid_panel_v2.pdf',
    };

    it('passes validation for valid replace file payload', async () => {
      const dto = plainToInstance(ReplaceReportFileDto, validReplacePayload);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('rejects replace file when fileSize exceeds 15MB', async () => {
      const dto = plainToInstance(ReplaceReportFileDto, {
        ...validReplacePayload,
        fileSize: 25 * 1024 * 1024,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'fileSize')).toBe(true);
    });

    it('rejects replace file with disallowed MIME type', async () => {
      const dto = plainToInstance(ReplaceReportFileDto, {
        ...validReplacePayload,
        mimeType: 'application/zip',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'mimeType')).toBe(true);
    });

    it('rejects replace file with invalid storageUrl', async () => {
      const dto = plainToInstance(ReplaceReportFileDto, {
        ...validReplacePayload,
        storageUrl: 'bad-url',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'storageUrl')).toBe(true);
    });

    it('rejects replace file with path traversal in storageKey or fileName (SEC-AUD-08)', async () => {
      const traversalKeyDto = plainToInstance(ReplaceReportFileDto, {
        ...validReplacePayload,
        storageKey: 'reports/../../passwords.txt',
      });
      const keyErrors = await validate(traversalKeyDto);
      expect(keyErrors.some((e) => e.property === 'storageKey')).toBe(true);

      const traversalFileDto = plainToInstance(ReplaceReportFileDto, {
        ...validReplacePayload,
        fileName: 'dir/subdir/file.pdf',
      });
      const fileErrors = await validate(traversalFileDto);
      expect(fileErrors.some((e) => e.property === 'fileName')).toBe(true);
    });
  });
});
