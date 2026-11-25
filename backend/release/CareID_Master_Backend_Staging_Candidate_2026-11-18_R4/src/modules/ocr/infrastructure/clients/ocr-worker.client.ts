import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  GatewayTimeoutException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OcrWorkerLineResult {
  text: string;
  confidence: number;
  box: number[][];
}

export interface OcrWorkerPageResult {
  pageNumber: number;
  rawText: string;
  lines: OcrWorkerLineResult[];
  imagePath?: string;
  confidence?: number;
}

export interface OcrWorkerResponse {
  success: boolean;
  documentType: string;
  sourceFile: string;
  pageCount: number;
  overallConfidence: number;
  combinedText: string;
  pages: OcrWorkerPageResult[];
  durationMs: number;
  engine: string;
  ocrVersion?: string;
  error?: string;
}

export interface OcrWorkerHealthStatus {
  status: string;
  worker: string;
  engineReady: boolean;
  ocrVersion: string;
  architecture: string;
  uptimeSeconds: number;
  residentRamMb: number;
  peakWorkingSetMb: number;
  activeRequests: number;
  maxConcurrency: number;
  cpuThreads: number;
  pdfDpi: number;
}

@Injectable()
export class OcrWorkerClient {
  private readonly logger = new Logger(OcrWorkerClient.name);
  private readonly workerUrl: string;
  private readonly internalSecret: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production' ||
      process.env.NODE_ENV === 'production' ||
      this.configService.get<string>('APP_ENV') === 'production' ||
      process.env.APP_ENV === 'production';

    const rawWorkerUrl =
      this.configService.get<string>('CAREID_OCR_WORKER_URL') ||
      process.env.CAREID_OCR_WORKER_URL ||
      this.configService.get<string>('OCR_WORKER_URL') ||
      process.env.OCR_WORKER_URL;

    if (isProduction && !rawWorkerUrl) {
      this.logger.error(
        'PRODUCTION CONFIGURATION ERROR: CAREID_OCR_WORKER_URL (or OCR_WORKER_URL) is not set. Silent localhost fallback is strictly prohibited in production.',
      );
      this.workerUrl = '';
    } else {
      this.workerUrl = (rawWorkerUrl || 'http://127.0.0.1:5050').replace(/\/+$/, '');
    }

    this.internalSecret =
      this.configService.get<string>('CAREID_OCR_SECRET') ||
      process.env.CAREID_OCR_SECRET ||
      this.configService.get<string>('OCR_SECRET') ||
      process.env.OCR_SECRET ||
      '';

    if (isProduction && !this.internalSecret) {
      this.logger.error(
        'PRODUCTION CONFIGURATION ERROR: CAREID_OCR_SECRET (or OCR_SECRET) is not configured in production.',
      );
    }

    const configuredTimeout =
      this.configService.get<string | number>('CAREID_OCR_TIMEOUT_MS') ||
      process.env.CAREID_OCR_TIMEOUT_MS;
    this.timeoutMs = configuredTimeout ? Number(configuredTimeout) : 180000;
  }

  getWorkerUrl(): string {
    return this.workerUrl;
  }

  async isReady(): Promise<boolean> {
    if (!this.workerUrl) return false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.workerUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) return false;
      const data = (await response.json()) as OcrWorkerHealthStatus;
      return Boolean(data.engineReady && data.status === 'ok');
    } catch {
      return false;
    }
  }

  async getHealth(): Promise<OcrWorkerHealthStatus> {
    if (!this.workerUrl) {
      throw new ServiceUnavailableException('OCR Worker URL is not configured in production.');
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.workerUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new ServiceUnavailableException(`OCR Worker healthcheck failed with HTTP ${response.status}`);
      }
      return (await response.json()) as OcrWorkerHealthStatus;
    } catch (err: any) {
      if (err instanceof ServiceUnavailableException) throw err;
      throw new ServiceUnavailableException(
        `Persistent PaddleOCR worker is unavailable at ${this.workerUrl}: ${err.message}`,
      );
    }
  }

  async processFile(
    filePath: string,
    documentType = 'UNKNOWN',
    pdfDpi = 150,
  ): Promise<OcrWorkerResponse> {
    if (!this.workerUrl) {
      throw new ServiceUnavailableException('OCR Worker URL is not configured in production.');
    }
    if (!this.internalSecret) {
      this.logger.error('CAREID_OCR_SECRET environment variable is missing or empty.');
      throw new InternalServerErrorException(
        'OCR worker authentication secret is not configured in environment.',
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.workerUrl}/internal/ocr/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CareID-Internal-Secret': this.internalSecret,
        },
        body: JSON.stringify({ filePath, documentType, pdfDpi }),
        signal: controller.signal,
      });

      return await this.handleWorkerResponse(response);
    } catch (err: any) {
      this.handleFetchError(err);
    } finally {
      clearTimeout(timer);
    }
  }

  async processBuffer(
    buffer: Buffer,
    filename: string,
    documentType = 'UNKNOWN',
    pdfDpi = 150,
  ): Promise<OcrWorkerResponse> {
    if (!this.workerUrl) {
      throw new ServiceUnavailableException('OCR Worker URL is not configured in production.');
    }
    if (!this.internalSecret) {
      this.logger.error('CAREID_OCR_SECRET environment variable is missing or empty.');
      throw new InternalServerErrorException(
        'OCR worker authentication secret is not configured in environment.',
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(buffer)]);
      formData.append('file', blob, filename);
      formData.append('documentType', documentType);
      formData.append('pdfDpi', String(pdfDpi));

      const response = await fetch(`${this.workerUrl}/internal/ocr/process`, {
        method: 'POST',
        headers: {
          'X-CareID-Internal-Secret': this.internalSecret,
        },
        body: formData,
        signal: controller.signal,
      });

      return await this.handleWorkerResponse(response);
    } catch (err: any) {
      this.handleFetchError(err);
    } finally {
      clearTimeout(timer);
    }
  }

  private async handleWorkerResponse(response: Response): Promise<OcrWorkerResponse> {
    const status = response.status;
    let responseBody: any;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = { error: 'Invalid JSON response from OCR worker' };
    }

    if (response.ok && responseBody.success) {
      return responseBody as OcrWorkerResponse;
    }

    const errorMessage = responseBody.error || responseBody.message || `OCR Worker returned HTTP ${status}`;

    if (status === 401) {
      this.logger.error(`OCR Worker authentication failed: ${errorMessage}`);
      throw new InternalServerErrorException(
        'OCR worker internal authentication failed. Check CAREID_OCR_SECRET configuration.',
      );
    }
    if (status === 400) {
      throw new BadRequestException(errorMessage);
    }
    if (status === 404) {
      throw new NotFoundException(errorMessage);
    }
    if (status === 429) {
      throw new ServiceUnavailableException('OCR worker is currently processing maximum concurrent jobs. Please retry.');
    }
    if (status === 504) {
      throw new GatewayTimeoutException('OCR worker processing timed out.');
    }

    throw new ServiceUnavailableException(`OCR Worker processing error: ${errorMessage}`);
  }

  private handleFetchError(err: any): never {
    if (
      err instanceof BadRequestException ||
      err instanceof NotFoundException ||
      err instanceof ServiceUnavailableException ||
      err instanceof InternalServerErrorException ||
      err instanceof GatewayTimeoutException
    ) {
      throw err;
    }

    if (err.name === 'AbortError') {
      throw new GatewayTimeoutException(`OCR worker request timed out after ${this.timeoutMs}ms`);
    }

    this.logger.error(`Failed to connect to persistent OCR worker at ${this.workerUrl}: ${err.message}`);
    throw new ServiceUnavailableException(
      `Persistent PaddleOCR worker is unreachable at ${this.workerUrl}. Verify that services/ocr-worker daemon is running.`,
    );
  }
}

