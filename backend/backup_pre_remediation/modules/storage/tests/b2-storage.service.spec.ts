import { InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { B2StorageService } from '../infrastructure/b2-storage.service';

describe('B2StorageService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Configuration & Initialization', () => {
    it('should report not configured when required environment variables are missing', () => {
      delete process.env.B2_ENDPOINT;
      delete process.env.B2_BUCKET_NAME;
      delete process.env.B2_KEY_ID;
      delete process.env.B2_APPLICATION_KEY;

      const service = new B2StorageService();
      expect(service.isConfigured()).toBe(false);
    });

    it('should report configured when valid configuration is provided', () => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_REGION = 'us-east-005';
      process.env.B2_BUCKET_NAME = 'careid-patient-docs-test';
      process.env.B2_KEY_ID = 'test-key-id-123456';
      process.env.B2_APPLICATION_KEY = 'test-application-key-secret-987654';

      const service = new B2StorageService();
      expect(service.isConfigured()).toBe(true);
    });

    it('should reject placeholder credentials in production or staging environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_BUCKET_NAME = 'careid-patient-docs-prod';
      process.env.B2_KEY_ID = '005placeholderkey';
      process.env.B2_APPLICATION_KEY = 'placeholdersecret';

      const service = new B2StorageService();
      expect(service.isConfigured()).toBe(false);
    });

    it('should parse custom B2_DOWNLOAD_EXPIRY_SECONDS within safe bounds', () => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_BUCKET_NAME = 'careid-patient-docs-test';
      process.env.B2_KEY_ID = 'test-key-id';
      process.env.B2_APPLICATION_KEY = 'test-app-key';
      process.env.B2_DOWNLOAD_EXPIRY_SECONDS = '600';

      const service = new B2StorageService();
      expect(service.isConfigured()).toBe(true);
      expect((service as any).defaultExpirySeconds).toBe(600);
    });
  });

  describe('resolveObjectKey', () => {
    let service: B2StorageService;

    beforeEach(() => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_BUCKET_NAME = 'careid-docs';
      process.env.B2_KEY_ID = 'test-key-id';
      process.env.B2_APPLICATION_KEY = 'test-app-key';
      service = new B2StorageService();
    });

    it('should resolve direct storageKey', () => {
      const key = service.resolveObjectKey('reports/patient-1/cbc.pdf');
      expect(key).toBe('reports/patient-1/cbc.pdf');
    });

    it('should strip leading slashes from storageKey', () => {
      const key = service.resolveObjectKey('///reports/patient-1/cbc.pdf');
      expect(key).toBe('reports/patient-1/cbc.pdf');
    });

    it('should resolve key from storageUrl when storageKey is not provided', () => {
      const key = service.resolveObjectKey(
        null,
        'https://s3.us-east-005.backblazeb2.com/careid-docs/reports/patient-1/scan.pdf',
      );
      expect(key).toBe('reports/patient-1/scan.pdf');
    });

    it('should reject path traversal in storageKey', () => {
      expect(() => service.resolveObjectKey('../../etc/passwd')).toThrow(BadRequestException);
      expect(() => service.resolveObjectKey('reports/../../../secret')).toThrow(BadRequestException);
      expect(() => service.resolveObjectKey('reports\\nested\\file.pdf')).toThrow(BadRequestException);
      expect(() => service.resolveObjectKey('reports/file\0.pdf')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when neither storageKey nor storageUrl are valid', () => {
      expect(() => service.resolveObjectKey(null, null)).toThrow(BadRequestException);
      expect(() => service.resolveObjectKey('', '')).toThrow(BadRequestException);
      expect(() => service.resolveObjectKey('   ', 'not-a-valid-url')).toThrow(BadRequestException);
    });
  });

  describe('generatePresignedDownloadUrl', () => {
    it('should fail closed with InternalServerErrorException when B2 is not configured', async () => {
      delete process.env.B2_ENDPOINT;
      delete process.env.B2_BUCKET_NAME;
      delete process.env.B2_KEY_ID;
      delete process.env.B2_APPLICATION_KEY;

      const service = new B2StorageService();
      await expect(
        service.generatePresignedDownloadUrl({
          storageKey: 'reports/cbc.pdf',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should generate a genuine AWS S3-compatible pre-signed URL with SigV4 parameters', async () => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_REGION = 'us-east-005';
      process.env.B2_BUCKET_NAME = 'careid-patient-docs-test';
      process.env.B2_KEY_ID = 'test-key-id-005';
      process.env.B2_APPLICATION_KEY = 'test-secret-key-005';

      const service = new B2StorageService();
      const result = await service.generatePresignedDownloadUrl({
        storageKey: 'reports/2026/cbc-report.pdf',
        fileName: 'Blood Test Results.pdf',
        expiresInSeconds: 300,
      });

      expect(result).toBeDefined();
      expect(result.expiresInSeconds).toBe(300);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

      const parsedUrl = new URL(result.downloadUrl);
      expect(parsedUrl.hostname).toBe('s3.us-east-005.backblazeb2.com');
      expect(parsedUrl.pathname).toBe('/careid-patient-docs-test/reports/2026/cbc-report.pdf');

      // AWS SigV4 query parameters
      expect(parsedUrl.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
      expect(parsedUrl.searchParams.get('X-Amz-Credential')).toContain('test-key-id-005');
      expect(parsedUrl.searchParams.get('X-Amz-Expires')).toBe('300');
      expect(parsedUrl.searchParams.has('X-Amz-Signature')).toBe(true);

      // Content-Disposition header in pre-signed request
      const disposition = parsedUrl.searchParams.get('response-content-disposition');
      expect(disposition).toBe('attachment; filename="Blood Test Results.pdf"');
    });

    it('should sanitize double quotes and line breaks in filename', async () => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_REGION = 'us-east-005';
      process.env.B2_BUCKET_NAME = 'careid-patient-docs-test';
      process.env.B2_KEY_ID = 'test-key-id-005';
      process.env.B2_APPLICATION_KEY = 'test-secret-key-005';

      const service = new B2StorageService();
      const result = await service.generatePresignedDownloadUrl({
        storageKey: 'reports/cbc.pdf',
        fileName: 'bad"name\r\ntest.pdf',
      });

      const parsedUrl = new URL(result.downloadUrl);
      const disposition = parsedUrl.searchParams.get('response-content-disposition');
      expect(disposition).toBe('attachment; filename="bad_name__test.pdf"');
    });

    it('should clamp expiry seconds between 60 and 86400', async () => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_REGION = 'us-east-005';
      process.env.B2_BUCKET_NAME = 'careid-patient-docs-test';
      process.env.B2_KEY_ID = 'test-key-id-005';
      process.env.B2_APPLICATION_KEY = 'test-secret-key-005';

      const service = new B2StorageService();

      // Too low -> clamped to 60
      const lowResult = await service.generatePresignedDownloadUrl({
        storageKey: 'reports/cbc.pdf',
        expiresInSeconds: 10,
      });
      expect(lowResult.expiresInSeconds).toBe(60);

      // Too high -> clamped to 86400
      const highResult = await service.generatePresignedDownloadUrl({
        storageKey: 'reports/cbc.pdf',
        expiresInSeconds: 999999,
      });
      expect(highResult.expiresInSeconds).toBe(86400);
    });
  });

  describe('uploadFile', () => {
    it('should throw InternalServerErrorException when B2 is not configured', async () => {
      delete process.env.B2_ENDPOINT;
      delete process.env.B2_BUCKET_NAME;
      delete process.env.B2_KEY_ID;
      delete process.env.B2_APPLICATION_KEY;

      const service = new B2StorageService();
      await expect(
        service.uploadFile({
          key: 'attachments/test.pdf',
          buffer: Buffer.from('hello'),
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should reject invalid or missing key', async () => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_BUCKET_NAME = 'careid-bucket';
      process.env.B2_KEY_ID = 'test-key-id';
      process.env.B2_APPLICATION_KEY = 'test-app-key';

      const service = new B2StorageService();
      await expect(
        service.uploadFile({
          key: '',
          buffer: Buffer.from('hello'),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject path traversal in upload key', async () => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_BUCKET_NAME = 'careid-bucket';
      process.env.B2_KEY_ID = 'test-key-id';
      process.env.B2_APPLICATION_KEY = 'test-app-key';

      const service = new B2StorageService();
      await expect(
        service.uploadFile({
          key: '../../etc/passwd',
          buffer: Buffer.from('hello'),
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.uploadFile({
          key: 'attachments\\test.pdf',
          buffer: Buffer.from('hello'),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid buffer', async () => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_BUCKET_NAME = 'careid-bucket';
      process.env.B2_KEY_ID = 'test-key-id';
      process.env.B2_APPLICATION_KEY = 'test-app-key';

      const service = new B2StorageService();
      await expect(
        service.uploadFile({
          key: 'attachments/test.pdf',
          buffer: 'not-a-buffer' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully upload file via S3 client and return upload result', async () => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_BUCKET_NAME = 'careid-bucket';
      process.env.B2_KEY_ID = 'test-key-id';
      process.env.B2_APPLICATION_KEY = 'test-app-key';

      const service = new B2StorageService();
      const mockSend = jest.fn().mockResolvedValue({ ETag: '"test-etag-123"' });
      (service as any).s3Client.send = mockSend;

      const result = await service.uploadFile({
        key: 'attachments/att-123.pdf',
        buffer: Buffer.from('PDF content'),
        contentType: 'application/pdf',
        metadata: { patientProfileId: 'patient-1' },
      });

      expect(result).toBeDefined();
      expect(result.key).toBe('attachments/att-123.pdf');
      expect(result.bucket).toBe('careid-bucket');
      expect(result.eTag).toBe('"test-etag-123"');
      expect(result.storageUrl).toBe('b2://careid-bucket/attachments/att-123.pdf');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException when S3 send fails', async () => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_BUCKET_NAME = 'careid-bucket';
      process.env.B2_KEY_ID = 'test-key-id';
      process.env.B2_APPLICATION_KEY = 'test-app-key';

      const service = new B2StorageService();
      (service as any).s3Client.send = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        service.uploadFile({
          key: 'attachments/att-123.pdf',
          buffer: Buffer.from('PDF content'),
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('deleteFile', () => {
    it('should return false when B2 is not configured', async () => {
      delete process.env.B2_ENDPOINT;
      delete process.env.B2_BUCKET_NAME;
      delete process.env.B2_KEY_ID;
      delete process.env.B2_APPLICATION_KEY;

      const service = new B2StorageService();
      const deleted = await service.deleteFile('attachments/test.pdf');
      expect(deleted).toBe(false);
    });

    it('should return false when key contains path traversal', async () => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_BUCKET_NAME = 'careid-bucket';
      process.env.B2_KEY_ID = 'test-key-id';
      process.env.B2_APPLICATION_KEY = 'test-app-key';

      const service = new B2StorageService();
      const deleted = await service.deleteFile('../../etc/passwd');
      expect(deleted).toBe(false);
    });

    it('should call S3 client send and return true on success', async () => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_BUCKET_NAME = 'careid-bucket';
      process.env.B2_KEY_ID = 'test-key-id';
      process.env.B2_APPLICATION_KEY = 'test-app-key';

      const service = new B2StorageService();
      const mockSend = jest.fn().mockResolvedValue({});
      (service as any).s3Client.send = mockSend;

      const deleted = await service.deleteFile('attachments/att-123.pdf');
      expect(deleted).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should return false when S3 client send throws error', async () => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_BUCKET_NAME = 'careid-bucket';
      process.env.B2_KEY_ID = 'test-key-id';
      process.env.B2_APPLICATION_KEY = 'test-app-key';

      const service = new B2StorageService();
      (service as any).s3Client.send = jest.fn().mockRejectedValue(new Error('S3 error'));

      const deleted = await service.deleteFile('attachments/att-123.pdf');
      expect(deleted).toBe(false);
    });
  });

  describe('getObjectStream', () => {
    it('should throw InternalServerErrorException when B2 is not configured', async () => {
      delete process.env.B2_ENDPOINT;
      delete process.env.B2_BUCKET_NAME;
      delete process.env.B2_KEY_ID;
      delete process.env.B2_APPLICATION_KEY;

      const service = new B2StorageService();
      await expect(service.getObjectStream('attachments/test.pdf')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should reject path traversal in stream key', async () => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_BUCKET_NAME = 'careid-bucket';
      process.env.B2_KEY_ID = 'test-key-id';
      process.env.B2_APPLICATION_KEY = 'test-app-key';

      const service = new B2StorageService();
      await expect(service.getObjectStream('../../etc/shadow')).rejects.toThrow(BadRequestException);
    });

    it('should return object stream and metadata on success', async () => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_BUCKET_NAME = 'careid-bucket';
      process.env.B2_KEY_ID = 'test-key-id';
      process.env.B2_APPLICATION_KEY = 'test-app-key';

      const service = new B2StorageService();
      const mockStream = { pipe: jest.fn() };
      (service as any).s3Client.send = jest.fn().mockResolvedValue({
        Body: mockStream,
        ContentType: 'application/pdf',
        ContentLength: 1024,
      });

      const result = await service.getObjectStream('attachments/att-123.pdf');
      expect(result).toBeDefined();
      expect(result.stream).toBe(mockStream);
      expect(result.contentType).toBe('application/pdf');
      expect(result.contentLength).toBe(1024);
    });

    it('should throw NotFoundException when object does not exist in storage', async () => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_BUCKET_NAME = 'careid-bucket';
      process.env.B2_KEY_ID = 'test-key-id';
      process.env.B2_APPLICATION_KEY = 'test-app-key';

      const service = new B2StorageService();
      (service as any).s3Client.send = jest.fn().mockRejectedValue(new Error('NoSuchKey'));

      await expect(service.getObjectStream('attachments/missing.pdf')).rejects.toThrow();
    });
  });
});
