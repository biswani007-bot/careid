import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException, BadGatewayException, Logger } from '@nestjs/common';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { validateDocumentBuffer } from '../../../common/utils/file-security.util';

export interface PresignedDownloadOptions {
  storageKey?: string | null;
  storageUrl?: string | null;
  fileName?: string | null;
  expiresInSeconds?: number;
}

export interface PresignedDownloadResult {
  downloadUrl: string;
  expiresInSeconds: number;
  expiresAt: Date;
}

export interface B2UploadOptions {
  key: string;
  buffer: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface B2UploadResult {
  key: string;
  bucket: string;
  eTag?: string;
  storageUrl: string;
}

@Injectable()
export class B2StorageService {
  private readonly logger = new Logger(B2StorageService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string | null = null;
  private defaultExpirySeconds: number = 900; // 15 minutes default

  constructor() {
    this.initClient();
  }

  initClient(): void {
    const endpoint = process.env.B2_ENDPOINT;
    const region = process.env.B2_REGION || 'us-east-005';
    const bucket = process.env.B2_BUCKET_NAME;
    const keyId = process.env.B2_KEY_ID;
    const applicationKey = process.env.B2_APPLICATION_KEY;

    const expiryEnv = process.env.B2_DOWNLOAD_EXPIRY_SECONDS;
    if (expiryEnv) {
      const parsed = parseInt(expiryEnv, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 86400) {
        this.defaultExpirySeconds = parsed;
      }
    }

    if (!endpoint || !bucket || !keyId || !applicationKey) {
      this.s3Client = null;
      this.bucketName = null;
      return;
    }

    const trimmedKeyId = keyId.trim();
    const trimmedAppKey = applicationKey.trim();

    // Guard against blank or obvious placeholder credentials in production/staging
    const isPlaceholder =
      trimmedKeyId === '' ||
      trimmedAppKey === '' ||
      trimmedKeyId.toLowerCase().includes('placeholder') ||
      trimmedAppKey.toLowerCase().includes('placeholder');

    const isProdOrStaging = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
    if (isPlaceholder && isProdOrStaging) {
      this.logger.error('Backblaze B2 storage credentials contain invalid placeholders in production/staging');
      this.s3Client = null;
      this.bucketName = null;
      return;
    }

    let normalizedEndpoint = endpoint.trim();
    if (!normalizedEndpoint.startsWith('http://') && !normalizedEndpoint.startsWith('https://')) {
      normalizedEndpoint = `https://${normalizedEndpoint}`;
    }

    this.bucketName = bucket.trim();
    this.s3Client = new S3Client({
      endpoint: normalizedEndpoint,
      region: region.trim(),
      credentials: {
        accessKeyId: trimmedKeyId,
        secretAccessKey: trimmedAppKey,
      },
      forcePathStyle: true, // Backblaze B2 S3 API supports path-style URLs
    });
  }

  /**
   * Returns true if Backblaze B2 S3 client and bucket are fully configured
   */
  isConfigured(): boolean {
    if (!this.s3Client || !this.bucketName) {
      this.initClient();
    }
    return this.s3Client !== null && this.bucketName !== null;
  }

  /**
   * Extracts and validates the object key from storageKey or storageUrl
   */
  resolveObjectKey(storageKey?: string | null, storageUrl?: string | null): string {
    let key: string | null = null;

    if (storageKey && typeof storageKey === 'string' && storageKey.trim() !== '') {
      key = storageKey.trim();
    } else if (storageUrl && typeof storageUrl === 'string' && storageUrl.trim() !== '') {
      try {
        const parsed = new URL(storageUrl);
        let path = parsed.pathname.replace(/^\/+/, '');
        // If path starts with bucket name (e.g. /my-bucket/reports/cbc.pdf), strip the bucket segment
        if (this.bucketName && path.startsWith(`${this.bucketName}/`)) {
          path = path.slice(this.bucketName.length + 1);
        }
        if (path) key = path;
      } catch {
        // malformed URL
      }
    }

    if (!key) {
      throw new BadRequestException('Cannot resolve storage object key for presigned download');
    }

    // Path traversal and dangerous character check
    if (key.includes('..') || key.includes('\\') || key.includes('\0')) {
      throw new BadRequestException('Invalid storageKey: path traversal detected');
    }

    return key.replace(/^\/+/, '');
  }

  /**
   * Generates a genuine AWS S3-compatible pre-signed GET URL for Backblaze B2.
   * Strictly fails closed: never falls back to an unauthenticated public file URL if signing fails.
   */
  async generatePresignedDownloadUrl(options: PresignedDownloadOptions): Promise<PresignedDownloadResult> {
    if (!this.isConfigured() || !this.s3Client || !this.bucketName) {
      throw new InternalServerErrorException(
        'Backblaze B2 storage credentials are not configured; secure presigned download is unavailable',
      );
    }

    const objectKey = this.resolveObjectKey(options.storageKey, options.storageUrl);

    // Enforce expiry ceiling (min 60s, max 86400s / 24h, default 900s / 15m)
    let expiresIn = this.defaultExpirySeconds;
    if (options.expiresInSeconds && options.expiresInSeconds > 0) {
      expiresIn = Math.min(Math.max(options.expiresInSeconds, 60), 86400);
    }

    const commandInput: any = {
      Bucket: this.bucketName,
      Key: objectKey,
    };

    if (options.fileName) {
      const sanitizedName = options.fileName.replace(/["\r\n]/g, '_');
      commandInput.ResponseContentDisposition = `attachment; filename="${sanitizedName}"`;
    }

    try {
      const command = new GetObjectCommand(commandInput);
      const downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      return {
        downloadUrl,
        expiresInSeconds: expiresIn,
        expiresAt,
      };
    } catch (err: any) {
      this.logger.error(`Failed to generate Backblaze B2 presigned download URL: ${err.message}`, err.stack);
      // Strictly fail closed: never return raw public storageUrl
      throw new InternalServerErrorException('Failed to generate secure presigned download URL');
    }
  }

  /**
   * Validates buffer size and magic-byte signature against allowed content types.
   */
  validateBuffer(
    buffer: Buffer,
    maxSizeBytes: number = 15 * 1024 * 1024,
    allowedMimeTypes?: string[],
  ): { mimeType: string; size: number; detectedExt: string } {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new BadRequestException('A non-empty file buffer is required for upload');
    }
    if (buffer.length > maxSizeBytes) {
      throw new BadRequestException(
        `File size (${buffer.length} bytes) exceeds maximum permitted limit of ${maxSizeBytes} bytes`,
      );
    }
    const detectedExt = validateDocumentBuffer(buffer);
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const mimeType = mimeMap[detectedExt] || 'application/octet-stream';
    if (allowedMimeTypes && allowedMimeTypes.length > 0) {
      const lowerAllowed = allowedMimeTypes.map((m) => m.toLowerCase());
      if (!lowerAllowed.includes(mimeType.toLowerCase())) {
        throw new BadRequestException(
          `Detected content type '${mimeType}' is not among allowed types: ${allowedMimeTypes.join(', ')}`,
        );
      }
    }
    return { mimeType, size: buffer.length, detectedExt };
  }

  /**
   * Generates a non-guessable, path-traversal-safe object key.
   */
  generateUniqueKey(prefix: string, profileId: string, originalName: string, ext?: string): string {
    const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').trim() || 'documents';
    const cleanProfileId = profileId.replace(/[^a-zA-Z0-9_-]/g, '').trim() || 'global';
    const safeOriginal = path.basename(originalName || 'document').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const randomHex = randomBytes(8).toString('hex');
    const fileExt = ext ? `.${ext.replace(/^\./, '')}` : path.extname(safeOriginal) || '.bin';
    const nameWithoutExt = path.basename(safeOriginal, fileExt);

    return `${cleanPrefix}/${cleanProfileId}/${Date.now()}-${randomHex}-${nameWithoutExt}${fileExt}`;
  }

  /**
   * Uploads a file buffer directly to Backblaze B2 bucket via AWS S3 PutObjectCommand.
   * Strictly validates object key for path traversal and dangerous characters.
   */
  async uploadFile(options: B2UploadOptions): Promise<B2UploadResult> {
    if (!this.isConfigured() || !this.s3Client || !this.bucketName) {
      throw new InternalServerErrorException(
        'Backblaze B2 storage credentials are not configured; cloud upload is unavailable',
      );
    }

    if (!options.key || typeof options.key !== 'string' || options.key.trim() === '') {
      throw new BadRequestException('Storage object key is required for upload');
    }

    const cleanKey = options.key.trim().replace(/^\/+/, '');
    if (cleanKey.includes('..') || cleanKey.includes('\\') || cleanKey.includes('\0')) {
      throw new BadRequestException('Invalid storageKey: path traversal detected');
    }

    if (!options.buffer || !Buffer.isBuffer(options.buffer)) {
      throw new BadRequestException('A valid Buffer is required for file upload');
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: cleanKey,
        Body: options.buffer,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata,
      });

      const response = await this.s3Client.send(command);
      this.logger.log(`Successfully uploaded object '${cleanKey}' to B2 bucket '${this.bucketName}'`);

      return {
        key: cleanKey,
        bucket: this.bucketName,
        eTag: response.ETag,
        storageUrl: `b2://${this.bucketName}/${cleanKey}`,
      };
    } catch (err: any) {
      this.logger.error(`Failed to upload object '${cleanKey}' to Backblaze B2: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Failed to upload file to object storage');
    }
  }

  /**
   * Deletes an object from Backblaze B2 bucket (e.g. for rollback cleanup if DB transaction fails).
   */
  async deleteFile(key: string): Promise<boolean> {
    if (!this.isConfigured() || !this.s3Client || !this.bucketName) {
      return false;
    }

    try {
      const cleanKey = key.trim().replace(/^\/+/, '');
      if (cleanKey.includes('..') || cleanKey.includes('\\') || cleanKey.includes('\0')) {
        return false;
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: cleanKey,
      });

      await this.s3Client.send(command);
      this.logger.log(`Deleted object '${cleanKey}' from B2 bucket '${this.bucketName}'`);
      return true;
    } catch (err: any) {
      this.logger.warn(`Failed to delete object '${key}' from Backblaze B2: ${err.message}`);
      return false;
    }
  }

  /**
   * Retrieves an object stream directly from Backblaze B2.
   */
  async getObjectStream(key: string): Promise<{ stream: any; contentType?: string; contentLength?: number }> {
    if (!this.isConfigured() || !this.s3Client || !this.bucketName) {
      throw new InternalServerErrorException('Backblaze B2 storage credentials are not configured');
    }

    const cleanKey = key.trim().replace(/^\/+/, '');
    if (cleanKey.includes('..') || cleanKey.includes('\\') || cleanKey.includes('\0')) {
      throw new BadRequestException('Invalid storageKey: path traversal detected');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: cleanKey,
      });

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort(new Error('Backblaze B2 getObjectStream timed out after 15000ms'));
      }, 15000);

      try {
        const response = await this.s3Client.send(command, {
          abortSignal: abortController.signal,
        });
        clearTimeout(timeoutId);
        return {
          stream: response.Body,
          contentType: response.ContentType,
          contentLength: response.ContentLength,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err: any) {
      this.logger.error(`Failed to retrieve object stream for '${cleanKey}' from Backblaze B2: ${err.message}`);
      if (
        err.name === 'NoSuchKey' ||
        err.$metadata?.httpStatusCode === 404 ||
        err.code === 'NoSuchKey' ||
        err.statusCode === 404
      ) {
        throw new NotFoundException('Object not found in storage');
      }
      throw new BadGatewayException(`Object storage service temporarily unavailable: ${err.message}`);
    }
  }
}
