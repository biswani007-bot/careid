import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  Inject,
  Optional,
} from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { IAiOcrRepository } from '../../domain/repositories/ai-ocr.repository.interface';
import { AiOcrExtractDto, AiOcrExtractResponseDto, AiOcrConfirmDto, AiOcrConfirmResponseDto } from '../../presentation/dto/ai-ocr.dto';
import { Logger } from 'nestjs-pino';
import { OcrWorkerClient, OcrWorkerResponse } from '@modules/ocr/infrastructure/clients/ocr-worker.client';
import { DocumentFieldExtractor } from '@modules/ocr/domain/services/document-field-extractor';

@Injectable()
export class AiOcrService {
  constructor(
    @Inject('IAiOcrRepository')
    private readonly aiOcrRepository: IAiOcrRepository,
    private readonly logger: Logger,
    @Optional()
    private readonly ocrWorkerClient?: OcrWorkerClient,
  ) {}

  async extractDocument(userId: string, dto: AiOcrExtractDto): Promise<AiOcrExtractResponseDto> {
    const profile = await this.aiOcrRepository.findProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Patient profile not found');
    }

    this.logger.log({ msg: 'OCR upload started' });

    const doc = await this.aiOcrRepository.createDocument(profile.id, dto.imageUrl);

    // 1. Resolve source image for OCR processing
    let resolvedFilePath: string | undefined;
    let fileBuffer: Buffer | undefined;

    // Check if imageUrl points to a local file
    const localUploadsDir = path.join(process.cwd(), 'data', 'uploads');
    const filename = path.basename(dto.imageUrl);
    const localCandidate = path.join(localUploadsDir, filename);

    if (fs.existsSync(localCandidate)) {
      resolvedFilePath = localCandidate;
    } else if (dto.imageUrl.startsWith('http://') || dto.imageUrl.startsWith('https://')) {
      try {
        const resp = await fetch(dto.imageUrl);
        if (resp.ok) {
          const arr = await resp.arrayBuffer();
          fileBuffer = Buffer.from(arr);
        }
      } catch (fetchErr: any) {
        this.logger.warn(`Could not download image from remote URL: ${fetchErr.message}`);
      }
    }

    if (!resolvedFilePath && !fileBuffer) {
      throw new BadRequestException('Source image could not be resolved for OCR processing from provided imageUrl');
    }

    let workerResult: OcrWorkerResponse;
    if (this.ocrWorkerClient) {
      if (fileBuffer) {
        workerResult = await this.ocrWorkerClient.processBuffer(fileBuffer, filename || 'lab_report.png', 'LAB_REPORT');
      } else if (resolvedFilePath) {
        workerResult = await this.ocrWorkerClient.processFile(resolvedFilePath, 'LAB_REPORT');
      } else {
        throw new BadRequestException('Source image could not be resolved for OCR processing');
      }
    } else {
      throw new ServiceUnavailableException('OCR worker client service is unavailable. Cannot process document.');
    }

    if (!workerResult.success) {
      throw new ServiceUnavailableException(workerResult.error || 'OCR processing failed on worker');
    }

    // Extract genuine clinical fields
    const fields = DocumentFieldExtractor.extractFields(workerResult, 'LAB_REPORT');
    const testNameField = fields.find((f) => f.name === 'test_name');
    const doctorField = fields.find((f) => f.name === 'prescribed_by' || f.name === 'doctor_name');

    const extractedData = {
      title: testNameField ? `${testNameField.value} OCR` : 'Clinical Report OCR',
      category: /prescription/i.test(workerResult.combinedText) ? 'Prescription' : 'Laboratory',
      prescribedBy: doctorField?.value || undefined,
    };

    await this.aiOcrRepository.createExtraction(doc.id, JSON.stringify(extractedData), workerResult.overallConfidence);
    this.logger.log({ msg: 'OCR extraction completed', documentId: doc.id });

    return {
      documentId: doc.id,
      extractedData,
      confidence: workerResult.overallConfidence,
    };
  }

  async confirmOcr(userId: string, dto: AiOcrConfirmDto, roles: string[] = []): Promise<AiOcrConfirmResponseDto> {
    const doc = await this.aiOcrRepository.findDocumentById(dto.documentId);
    if (!doc) {
      throw new NotFoundException('OCR Document not found');
    }

    const upperRoles = roles.map((r) => r.toUpperCase());
    const isAdmin = upperRoles.includes('ADMIN') || upperRoles.includes('SUPER_ADMIN');

    if (!isAdmin) {
      const profile = await this.aiOcrRepository.findProfileByUserId(userId);
      if (!profile) {
        throw new NotFoundException('Patient profile not found');
      }

      if (doc.patientProfileId !== profile.id) {
        throw new ForbiddenException('Access denied: You do not have permission to confirm this OCR document');
      }
    }

    if (doc.status === 'CONFIRMED') {
      throw new BadRequestException('OCR Document has already been confirmed');
    }

    await this.aiOcrRepository.createReview(dto.documentId, dto.confirmedData);
    await this.aiOcrRepository.updateDocumentStatus(dto.documentId, 'CONFIRMED');

    this.logger.log({ msg: 'OCR confirmation completed', documentId: dto.documentId });

    return {
      success: true,
      message: 'OCR extraction verified and saved successfully',
    };
  }
}
