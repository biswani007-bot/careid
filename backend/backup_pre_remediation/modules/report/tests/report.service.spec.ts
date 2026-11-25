import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from '../application/use-cases/report.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';

const mockProfileId = 'profile-uuid-1';
const mockUserId = 'user-uuid-1';
const mockReportId = 'report-uuid-1';

const mockRepo = {
  findProfileByUserId: jest.fn(),
  findProfileById: jest.fn(),
  createReport: jest.fn(),
  findReportById: jest.fn(),
  findReportsByProfile: jest.fn(),
  updateReport: jest.fn(),
  softDeleteReport: jest.fn(),
  restoreReport: jest.fn(),
  searchReports: jest.fn(),
  getCategoriesCount: jest.fn(),
  getTimeline: jest.fn(),
  createAttachment: jest.fn(),
  createReportVersion: jest.fn(),
  findReportVersions: jest.fn(),
  createAuditLog: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

import { QrService } from '@modules/qr/application/use-cases/qr.service';
import { B2StorageService } from '../../storage/infrastructure/b2-storage.service';

const mockQrService = {
  generateQr: jest.fn(),
  verifyQrPayload: jest.fn(),
  rotateQr: jest.fn(),
  revokeQr: jest.fn(),
};

const mockB2StorageService = {
  isConfigured: jest.fn().mockReturnValue(false),
  generatePresignedDownloadUrl: jest.fn(),
  resolveObjectKey: jest.fn(),
};

describe('ReportService', () => {
  let service: ReportService;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalReportSecret = process.env.REPORT_DOWNLOAD_SECRET;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockB2StorageService.isConfigured.mockReturnValue(false);
    process.env.JWT_SECRET = 'a_very_strong_cryptographic_test_jwt_secret_key_32_chars';
    delete process.env.REPORT_DOWNLOAD_SECRET;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: 'IReportRepository', useValue: mockRepo },
        { provide: QrService, useValue: mockQrService },
        { provide: Logger, useValue: mockLogger },
        { provide: B2StorageService, useValue: mockB2StorageService },
      ],
    }).compile();
    service = module.get<ReportService>(ReportService);
  });

  afterEach(() => {
    if (originalJwtSecret !== undefined) {
      process.env.JWT_SECRET = originalJwtSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
    if (originalReportSecret !== undefined) {
      process.env.REPORT_DOWNLOAD_SECRET = originalReportSecret;
    } else {
      delete process.env.REPORT_DOWNLOAD_SECRET;
    }
  });


  describe('uploadReport', () => {
    it('should throw if patient profile is not found', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue(null);
      await expect(service.uploadReport(mockUserId, {
        title: 'CBC Report',
        fileName: 'cbc.pdf',
        fileSize: 500000,
        mimeType: 'application/pdf',
        storageUrl: 'https://cdn.hvapi.com/cbc.pdf',
      })).rejects.toThrow(NotFoundException);
    });

    it('should throw if MIME type is not allowed', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      await expect(service.uploadReport(mockUserId, {
        title: 'Executable',
        fileName: 'malware.exe',
        fileSize: 500000,
        mimeType: 'application/x-msdownload',
        storageUrl: 'https://cdn.hvapi.com/malware.exe',
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject upload when file extension does not match MIME type (SEC-AUD-10)', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      await expect(service.uploadReport(mockUserId, {
        title: 'Disguised Executable',
        fileName: 'payload.exe',
        fileSize: 500000,
        mimeType: 'application/pdf',
        storageUrl: 'https://cdn.hvapi.com/payload.exe',
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject upload when file contains dangerous executable extension', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      await expect(service.uploadReport(mockUserId, {
        title: 'Double extension script',
        fileName: 'report.php.pdf',
        fileSize: 500000,
        mimeType: 'application/pdf',
        storageUrl: 'https://cdn.hvapi.com/report.php.pdf',
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject upload when storageKey contains path traversal', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      await expect(service.uploadReport(mockUserId, {
        title: 'Traversal Key',
        fileName: 'report.pdf',
        fileSize: 500000,
        mimeType: 'application/pdf',
        storageKey: '../../etc/passwd',
        storageUrl: 'https://cdn.hvapi.com/report.pdf',
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject upload when storageUrl targets cloud metadata services (SSRF protection)', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      await expect(service.uploadReport(mockUserId, {
        title: 'SSRF Attack',
        fileName: 'report.pdf',
        fileSize: 500000,
        mimeType: 'application/pdf',
        storageUrl: 'http://169.254.169.254/latest/meta-data/',
      })).rejects.toThrow(BadRequestException);
    });

    it('should successfully upload report and log audit event', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      const mockCreated = {
        id: mockReportId,
        patientProfileId: mockProfileId,
        title: 'CBC Report',
        category: 'LAB',
        status: 'UPLOADED',
        pageCount: 1,
        language: 'en',
        tags: [],
        verificationStatus: 'UNVERIFIED',
        currentVersion: 1,
        isDeleted: false,
        attachments: [{
          id: 'att-1',
          fileName: 'cbc.pdf',
          fileSize: 500000,
          mimeType: 'application/pdf',
          storageUrl: 'https://cdn.hvapi.com/cbc.pdf',
          createdAt: new Date(),
        }],
        versions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createReport.mockResolvedValue(mockCreated);
      mockRepo.createAuditLog.mockResolvedValue({});

      const result = await service.uploadReport(mockUserId, {
        title: 'CBC Report',
        fileName: 'cbc.pdf',
        fileSize: 500000,
        mimeType: 'application/pdf',
        storageUrl: 'https://cdn.hvapi.com/cbc.pdf',
      });

      expect(result.id).toBe(mockReportId);
      expect(result.category).toBe('LAB');
      expect(mockRepo.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'UPLOADED',
        medicalReportId: mockReportId,
      }));
    });
  });

  describe('replaceReportFile', () => {
    it('should create new version and update currentVersion', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        status: 'UPLOADED',
        currentVersion: 1,
      });

      const mockUpdated = {
        id: mockReportId,
        patientProfileId: mockProfileId,
        title: 'CBC Report',
        category: 'LAB',
        status: 'UPLOADED',
        pageCount: 1,
        language: 'en',
        tags: [],
        verificationStatus: 'UNVERIFIED',
        currentVersion: 2,
        isDeleted: false,
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createAttachment.mockResolvedValue({});
      mockRepo.createReportVersion.mockResolvedValue({});
      mockRepo.updateReport.mockResolvedValue(mockUpdated);
      mockRepo.createAuditLog.mockResolvedValue({});

      const result = await service.replaceReportFile(mockUserId, mockReportId, {
        fileName: 'cbc_v2.pdf',
        fileSize: 600000,
        mimeType: 'application/pdf',
        storageUrl: 'https://cdn.hvapi.com/cbc_v2.pdf',
      });

      expect(result.currentVersion).toBe(2);
      expect(mockRepo.createReportVersion).toHaveBeenCalledWith(expect.objectContaining({
        version: 2,
        fileName: 'cbc_v2.pdf',
      }));
    });

    it('should throw if report is archived', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        status: 'ARCHIVED',
        currentVersion: 1,
      });

      await expect(service.replaceReportFile(mockUserId, mockReportId, {
        fileName: 'cbc_v2.pdf',
        fileSize: 600000,
        mimeType: 'application/pdf',
        storageUrl: 'https://cdn.hvapi.com/cbc_v2.pdf',
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyReport', () => {
    it('should update verificationStatus to VERIFIED', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        status: 'UPLOADED',
        verificationStatus: 'UNVERIFIED',
      });

      const mockVerified = {
        id: mockReportId,
        patientProfileId: mockProfileId,
        title: 'CBC Report',
        category: 'LAB',
        status: 'VERIFIED',
        pageCount: 1,
        language: 'en',
        tags: [],
        verificationStatus: 'VERIFIED',
        currentVersion: 1,
        isDeleted: false,
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.updateReport.mockResolvedValue(mockVerified);
      mockRepo.createAuditLog.mockResolvedValue({});

      const result = await service.verifyReport(mockUserId, mockReportId, { notes: 'All values checked' });
      expect(result.verificationStatus).toBe('VERIFIED');
      expect(result.status).toBe('VERIFIED');
    });
  });

  describe('getDownloadToken (SEC-AUD-03 Hardening)', () => {
    it('should generate secure download link with verifiable token when scan status is CLEAN', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        attachments: [{ storageUrl: 'https://cdn.hvapi.com/cbc.pdf', virusScanStatus: 'CLEAN' }],
      });

      const result = await service.getDownloadToken(mockUserId, mockReportId);
      expect(result.downloadUrl).toContain('token=dl_');
      expect(result.token).toMatch(/^dl_\d+_[a-f0-9]{32}_[a-f0-9]{32}$/);
      expect(result.expiresAt).toBeDefined();

      const isValid = service.verifyDownloadToken(result.token, mockReportId, mockUserId);
      expect(isValid).toBe(true);
    });

    it('should reject verification if token is tampered with', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        attachments: [{ storageUrl: 'https://cdn.hvapi.com/cbc.pdf', virusScanStatus: 'CLEAN' }],
      });

      const result = await service.getDownloadToken(mockUserId, mockReportId);
      const isTamperedReport = service.verifyDownloadToken(result.token, 'wrong-report-id', mockUserId);
      expect(isTamperedReport).toBe(false);

      const isTamperedUser = service.verifyDownloadToken(result.token, mockReportId, 'wrong-user-id');
      expect(isTamperedUser).toBe(false);

      const isTamperedToken = service.verifyDownloadToken(result.token.slice(0, -4) + '0000', mockReportId, mockUserId);
      expect(isTamperedToken).toBe(false);

      expect(service.verifyDownloadToken('', mockReportId, mockUserId)).toBe(false);
      expect(service.verifyDownloadToken('invalid-format', mockReportId, mockUserId)).toBe(false);
    });

    it('should reject verification if token is expired', () => {
      const expiredMs = Date.now() - 1000;
      const expiredToken = `dl_${expiredMs}_0123456789abcdef0123456789abcdef_0123456789abcdef0123456789abcdef`;
      expect(service.verifyDownloadToken(expiredToken, mockReportId, mockUserId)).toBe(false);
    });

    it('should fail closed with InternalServerErrorException if signing secret is missing (SEC-AUD-03)', async () => {
      delete process.env.JWT_SECRET;
      delete process.env.REPORT_DOWNLOAD_SECRET;

      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        attachments: [{ storageUrl: 'https://cdn.hvapi.com/cbc.pdf', virusScanStatus: 'CLEAN' }],
      });

      await expect(service.getDownloadToken(mockUserId, mockReportId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should fail closed with InternalServerErrorException if signing secret is default key (SEC-AUD-03)', async () => {
      process.env.JWT_SECRET = 'hvapi_default_secret_key';

      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        attachments: [{ storageUrl: 'https://cdn.hvapi.com/cbc.pdf', virusScanStatus: 'CLEAN' }],
      });

      await expect(service.getDownloadToken(mockUserId, mockReportId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should fail closed with InternalServerErrorException if signing secret is too short (SEC-AUD-03)', async () => {
      process.env.JWT_SECRET = 'short_key';

      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        attachments: [{ storageUrl: 'https://cdn.hvapi.com/cbc.pdf', virusScanStatus: 'CLEAN' }],
      });

      await expect(service.getDownloadToken(mockUserId, mockReportId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should fail closed in verifyDownloadToken when signing secret is missing or invalid (SEC-AUD-03)', () => {
      delete process.env.JWT_SECRET;
      delete process.env.REPORT_DOWNLOAD_SECRET;

      const validLookingToken = `dl_${Date.now() + 60000}_0123456789abcdef0123456789abcdef_0123456789abcdef0123456789abcdef`;
      expect(service.verifyDownloadToken(validLookingToken, mockReportId, mockUserId)).toBe(false);
    });

    it('should reject verification if token is oversized (> 256 chars) (SEC-AUD-03)', () => {
      const oversizedToken = 'dl_' + 'a'.repeat(300);
      expect(service.verifyDownloadToken(oversizedToken, mockReportId, mockUserId)).toBe(false);
    });

    it('should reject verification if nonce or signature has invalid hex characters (SEC-AUD-03)', () => {
      const invalidNonceToken = `dl_${Date.now() + 60000}_0123456789abcdef0123456789abcdeg_0123456789abcdef0123456789abcdef`;
      expect(service.verifyDownloadToken(invalidNonceToken, mockReportId, mockUserId)).toBe(false);

      const invalidSigToken = `dl_${Date.now() + 60000}_0123456789abcdef0123456789abcdef_0123456789abcdef0123456789abcdeg`;
      expect(service.verifyDownloadToken(invalidSigToken, mockReportId, mockUserId)).toBe(false);
    });

    it('should reject download when virusScanStatus is PENDING', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        attachments: [{ storageUrl: 'https://cdn.hvapi.com/cbc.pdf', virusScanStatus: 'PENDING' }],
      });

      await expect(service.getDownloadToken(mockUserId, mockReportId)).rejects.toThrow(BadRequestException);
    });

    it('should reject download when virusScanStatus is INFECTED', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        attachments: [{ storageUrl: 'https://cdn.hvapi.com/cbc.pdf', virusScanStatus: 'INFECTED' }],
      });

      await expect(service.getDownloadToken(mockUserId, mockReportId)).rejects.toThrow(BadRequestException);
    });

    it('should reject download when virusScanStatus is missing or undefined', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        attachments: [{ storageUrl: 'https://cdn.hvapi.com/cbc.pdf' }],
      });

      await expect(service.getDownloadToken(mockUserId, mockReportId)).rejects.toThrow(BadRequestException);
    });

    it('should reject download when report has no attachments', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        attachments: [],
      });

      await expect(service.getDownloadToken(mockUserId, mockReportId)).rejects.toThrow(NotFoundException);
    });

    it('should reject download when attachment has no storageUrl without using hardcoded fallback', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        attachments: [{ storageUrl: '', virusScanStatus: 'CLEAN' }],
      });

      await expect(service.getDownloadToken(mockUserId, mockReportId)).rejects.toThrow(BadRequestException);
    });

    it('should reject download when user does not own patient profile', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: 'other-patient-profile',
        attachments: [{ storageUrl: 'https://cdn.hvapi.com/cbc.pdf', virusScanStatus: 'CLEAN' }],
      });

      await expect(service.getDownloadToken(mockUserId, mockReportId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getPreviewMetadata (SEC-AUD-09 Delivery & Preview Hardening)', () => {
    it('should return preview metadata with signed token when attachment is CLEAN', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        title: 'CBC Blood Panel',
        patientProfileId: mockProfileId,
        pageCount: 2,
        language: 'en',
        verificationStatus: 'VERIFIED',
        attachments: [{
          fileName: 'cbc.pdf',
          fileSize: 524288,
          mimeType: 'application/pdf',
          storageUrl: 'https://storage.provider.com/reports/cbc.pdf',
          virusScanStatus: 'CLEAN',
        }],
      });

      const result = await service.getPreviewMetadata(mockUserId, mockReportId);
      expect(result.id).toBe(mockReportId);
      expect(result.fileName).toBe('cbc.pdf');
      expect(result.storageUrl).toContain('https://storage.provider.com/reports/cbc.pdf?token=dl_');
      expect(result.storageUrl).not.toContain('sample.pdf');

      // Verify the generated token verifies successfully
      const token = new URL(result.storageUrl).searchParams.get('token');
      expect(token).toBeTruthy();
      expect(service.verifyDownloadToken(token!, mockReportId, mockUserId)).toBe(true);
    });

    it('should reject preview when report has no attachments without fallback to sample PDF', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        title: 'CBC Report',
        patientProfileId: mockProfileId,
        attachments: [],
      });

      await expect(service.getPreviewMetadata(mockUserId, mockReportId)).rejects.toThrow(NotFoundException);
    });

    it('should reject preview when attachment storageUrl is missing', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        title: 'CBC Report',
        patientProfileId: mockProfileId,
        attachments: [{ fileName: 'cbc.pdf', storageUrl: '', virusScanStatus: 'CLEAN' }],
      });

      await expect(service.getPreviewMetadata(mockUserId, mockReportId)).rejects.toThrow(BadRequestException);
    });

    it('should reject preview when attachment virusScanStatus is PENDING', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        title: 'CBC Report',
        patientProfileId: mockProfileId,
        attachments: [{
          fileName: 'cbc.pdf',
          storageUrl: 'https://storage.provider.com/reports/cbc.pdf',
          virusScanStatus: 'PENDING',
        }],
      });

      await expect(service.getPreviewMetadata(mockUserId, mockReportId)).rejects.toThrow(BadRequestException);
    });

    it('should reject preview when attachment virusScanStatus is INFECTED', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        title: 'CBC Report',
        patientProfileId: mockProfileId,
        attachments: [{
          fileName: 'cbc.pdf',
          storageUrl: 'https://storage.provider.com/reports/cbc.pdf',
          virusScanStatus: 'INFECTED',
        }],
      });

      await expect(service.getPreviewMetadata(mockUserId, mockReportId)).rejects.toThrow(BadRequestException);
    });

    it('should reject preview when user does not own patient profile', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        title: 'CBC Report',
        patientProfileId: 'other-patient-profile',
        attachments: [{
          fileName: 'cbc.pdf',
          storageUrl: 'https://storage.provider.com/reports/cbc.pdf',
          virusScanStatus: 'CLEAN',
        }],
      });

      await expect(service.getPreviewMetadata(mockUserId, mockReportId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('verifyAndExecuteDownload (Secure Download Flow Verification)', () => {
    it('should successfully execute download when user is authorized, token is valid, and virus scan is CLEAN', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        patientProfile: { id: mockProfileId, userId: mockUserId },
        attachments: [{
          fileName: 'cbc.pdf',
          mimeType: 'application/pdf',
          fileSize: 102400,
          storageUrl: 'https://cdn.hvapi.com/cbc.pdf',
          virusScanStatus: 'CLEAN',
        }],
      });

      const { token } = await service.getDownloadToken(mockUserId, mockReportId);
      const download = await service.verifyAndExecuteDownload(mockReportId, token, mockUserId);

      expect(download.fileName).toBe('cbc.pdf');
      expect(download.mimeType).toBe('application/pdf');
      expect(download.storageUrl).toBe('https://cdn.hvapi.com/cbc.pdf');
      expect(download.fileSize).toBe(102400);
    });

    it('should successfully execute download via token-only (browser download) when report owner matches token and status is CLEAN', async () => {
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        patientProfile: { id: mockProfileId, userId: mockUserId },
        attachments: [{
          fileName: 'cbc.pdf',
          mimeType: 'application/pdf',
          fileSize: 102400,
          storageUrl: 'https://cdn.hvapi.com/cbc.pdf',
          virusScanStatus: 'CLEAN',
        }],
      });
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });

      const { token } = await service.getDownloadToken(mockUserId, mockReportId);
      // Call verifyAndExecuteDownload without callerUserId (simulates unauthenticated browser clicking signed link)
      const download = await service.verifyAndExecuteDownload(mockReportId, token);

      expect(download.fileName).toBe('cbc.pdf');
      expect(download.storageUrl).toBe('https://cdn.hvapi.com/cbc.pdf');
    });

    it('should reject download when unauthorized user attempts to access report', async () => {
      mockRepo.findProfileByUserId.mockResolvedValueOnce({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId, // belongs to victim mockProfileId
        patientProfile: { id: mockProfileId, userId: mockUserId },
        attachments: [{
          fileName: 'cbc.pdf',
          mimeType: 'application/pdf',
          storageUrl: 'https://cdn.hvapi.com/cbc.pdf',
          virusScanStatus: 'CLEAN',
        }],
      });

      const validTokenForOwner = (await service.getDownloadToken(mockUserId, mockReportId)).token;

      // Attacker tries to download with their own userId
      mockRepo.findProfileByUserId.mockResolvedValueOnce({ id: 'attacker-profile' });
      await expect(service.verifyAndExecuteDownload(mockReportId, validTokenForOwner, 'attacker-user-id'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should reject download when token is expired', async () => {
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        patientProfile: { id: mockProfileId, userId: mockUserId },
        attachments: [{
          fileName: 'cbc.pdf',
          mimeType: 'application/pdf',
          storageUrl: 'https://cdn.hvapi.com/cbc.pdf',
          virusScanStatus: 'CLEAN',
        }],
      });

      const expiredMs = Date.now() - 5000;
      const expiredToken = `dl_${expiredMs}_0123456789abcdef0123456789abcdef_0123456789abcdef0123456789abcdef`;

      await expect(service.verifyAndExecuteDownload(mockReportId, expiredToken))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should reject download when token is tampered or forged', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        patientProfile: { id: mockProfileId, userId: mockUserId },
        attachments: [{
          fileName: 'cbc.pdf',
          mimeType: 'application/pdf',
          storageUrl: 'https://cdn.hvapi.com/cbc.pdf',
          virusScanStatus: 'CLEAN',
        }],
      });

      const { token } = await service.getDownloadToken(mockUserId, mockReportId);
      const tamperedToken = token.slice(0, -4) + '0000';

      await expect(service.verifyAndExecuteDownload(mockReportId, tamperedToken))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should reject download when virusScanStatus is PENDING', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        patientProfile: { id: mockProfileId, userId: mockUserId },
        attachments: [{
          fileName: 'cbc.pdf',
          mimeType: 'application/pdf',
          storageUrl: 'https://cdn.hvapi.com/cbc.pdf',
          virusScanStatus: 'PENDING',
        }],
      });

      const futureMs = Date.now() + 60000;
      const dummyToken = `dl_${futureMs}_0123456789abcdef0123456789abcdef_0123456789abcdef0123456789abcdef`;

      await expect(service.verifyAndExecuteDownload(mockReportId, dummyToken, mockUserId))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject download when virusScanStatus is INFECTED', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        patientProfile: { id: mockProfileId, userId: mockUserId },
        attachments: [{
          fileName: 'cbc.pdf',
          mimeType: 'application/pdf',
          storageUrl: 'https://cdn.hvapi.com/cbc.pdf',
          virusScanStatus: 'INFECTED',
        }],
      });

      const futureMs = Date.now() + 60000;
      const dummyToken = `dl_${futureMs}_0123456789abcdef0123456789abcdef_0123456789abcdef0123456789abcdef`;

      await expect(service.verifyAndExecuteDownload(mockReportId, dummyToken, mockUserId))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject download when virusScanStatus is missing or undefined', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        patientProfile: { id: mockProfileId, userId: mockUserId },
        attachments: [{
          fileName: 'cbc.pdf',
          mimeType: 'application/pdf',
          storageUrl: 'https://cdn.hvapi.com/cbc.pdf',
        }],
      });

      const futureMs = Date.now() + 60000;
      const dummyToken = `dl_${futureMs}_0123456789abcdef0123456789abcdef_0123456789abcdef0123456789abcdef`;

      await expect(service.verifyAndExecuteDownload(mockReportId, dummyToken, mockUserId))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject download when report does not exist', async () => {
      mockRepo.findReportById.mockResolvedValue(null);
      const futureMs = Date.now() + 60000;
      const dummyToken = `dl_${futureMs}_0123456789abcdef0123456789abcdef_0123456789abcdef0123456789abcdef`;

      await expect(service.verifyAndExecuteDownload('non-existent-report', dummyToken))
        .rejects.toThrow(NotFoundException);
    });

    it('should reject download when report has no attachments', async () => {
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        patientProfile: { id: mockProfileId, userId: mockUserId },
        attachments: [],
      });
      const futureMs = Date.now() + 60000;
      const dummyToken = `dl_${futureMs}_0123456789abcdef0123456789abcdef_0123456789abcdef0123456789abcdef`;

      await expect(service.verifyAndExecuteDownload(mockReportId, dummyToken))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('Backblaze B2 Pre-signed S3 Download Flow (Option B)', () => {
    const mockPresignedUrl =
      'https://s3.us-east-005.backblazeb2.com/careid-patient-docs-test/reports/patient-1/lab-report.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=testkey%2F20261027%2Fus-east-005%2Fs3%2Faws4_request&X-Amz-Date=20261027T000000Z&X-Amz-Expires=900&X-Amz-SignedHeaders=host&X-Amz-Signature=abcdef1234567890';

    it('should generate genuine AWS S3-compatible pre-signed download URL when Backblaze B2 is configured', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        attachments: [
          {
            fileName: 'lab-report.pdf',
            storageKey: 'reports/patient-1/lab-report.pdf',
            virusScanStatus: 'CLEAN',
          },
        ],
      });

      mockB2StorageService.isConfigured.mockReturnValue(true);
      mockB2StorageService.generatePresignedDownloadUrl.mockResolvedValue({
        downloadUrl: mockPresignedUrl,
        expiresInSeconds: 900,
        expiresAt: new Date(Date.now() + 900000),
      });

      const result = await service.getDownloadToken(mockUserId, mockReportId);

      expect(mockB2StorageService.generatePresignedDownloadUrl).toHaveBeenCalledWith({
        storageKey: 'reports/patient-1/lab-report.pdf',
        storageUrl: undefined,
        fileName: 'lab-report.pdf',
      });
      expect(result.downloadUrl).toBe(mockPresignedUrl);
      expect(result.downloadUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
      expect(result.downloadUrl).toContain('X-Amz-Signature=');
      expect(result.expiresAt).toBeDefined();
    });

    it('should reject B2 download token generation when caller is not the report owner', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: 'other-patient-profile',
        attachments: [
          {
            fileName: 'lab-report.pdf',
            storageKey: 'reports/patient-1/lab-report.pdf',
            virusScanStatus: 'CLEAN',
          },
        ],
      });

      mockB2StorageService.isConfigured.mockReturnValue(true);

      await expect(service.getDownloadToken(mockUserId, mockReportId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockB2StorageService.generatePresignedDownloadUrl).not.toHaveBeenCalled();
    });

    it('should reject B2 download token generation when virusScanStatus is PENDING', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        attachments: [
          {
            fileName: 'lab-report.pdf',
            storageKey: 'reports/patient-1/lab-report.pdf',
            virusScanStatus: 'PENDING',
          },
        ],
      });

      mockB2StorageService.isConfigured.mockReturnValue(true);

      await expect(service.getDownloadToken(mockUserId, mockReportId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockB2StorageService.generatePresignedDownloadUrl).not.toHaveBeenCalled();
    });

    it('should reject B2 download token generation when virusScanStatus is INFECTED', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        attachments: [
          {
            fileName: 'lab-report.pdf',
            storageKey: 'reports/patient-1/lab-report.pdf',
            virusScanStatus: 'INFECTED',
          },
        ],
      });

      mockB2StorageService.isConfigured.mockReturnValue(true);

      await expect(service.getDownloadToken(mockUserId, mockReportId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockB2StorageService.generatePresignedDownloadUrl).not.toHaveBeenCalled();
    });

    it('should reject B2 download token generation when virusScanStatus is missing', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        attachments: [
          {
            fileName: 'lab-report.pdf',
            storageKey: 'reports/patient-1/lab-report.pdf',
          },
        ],
      });

      mockB2StorageService.isConfigured.mockReturnValue(true);

      await expect(service.getDownloadToken(mockUserId, mockReportId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockB2StorageService.generatePresignedDownloadUrl).not.toHaveBeenCalled();
    });

    it('should fail closed with InternalServerErrorException if B2 signing fails and never return raw URL', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        attachments: [
          {
            fileName: 'lab-report.pdf',
            storageKey: 'reports/patient-1/lab-report.pdf',
            storageUrl: 'https://s3.us-east-005.backblazeb2.com/careid-patient-docs/reports/patient-1/lab-report.pdf',
            virusScanStatus: 'CLEAN',
          },
        ],
      });

      mockB2StorageService.isConfigured.mockReturnValue(true);
      mockB2StorageService.generatePresignedDownloadUrl.mockRejectedValue(
        new InternalServerErrorException('Failed to generate secure presigned download URL'),
      );

      await expect(service.getDownloadToken(mockUserId, mockReportId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should return genuine B2 pre-signed URL in verifyAndExecuteDownload when B2 is configured', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        patientProfile: { id: mockProfileId, userId: mockUserId },
        attachments: [
          {
            fileName: 'lab-report.pdf',
            mimeType: 'application/pdf',
            fileSize: 204800,
            storageKey: 'reports/patient-1/lab-report.pdf',
            virusScanStatus: 'CLEAN',
          },
        ],
      });

      mockB2StorageService.isConfigured.mockReturnValue(true);
      mockB2StorageService.generatePresignedDownloadUrl.mockResolvedValue({
        downloadUrl: mockPresignedUrl,
        expiresInSeconds: 900,
        expiresAt: new Date(Date.now() + 900000),
      });

      const { token } = await service.getDownloadToken(mockUserId, mockReportId);
      const result = await service.verifyAndExecuteDownload(mockReportId, token, mockUserId);

      expect(result.fileName).toBe('lab-report.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.storageUrl).toBe(mockPresignedUrl);
      expect(result.storageUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
    });

    it('should return genuine B2 pre-signed URL in getPreviewMetadata when B2 is configured and CLEAN', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        title: 'Complete Blood Count',
        patientProfileId: mockProfileId,
        verificationStatus: 'VERIFIED',
        attachments: [
          {
            fileName: 'cbc.pdf',
            mimeType: 'application/pdf',
            fileSize: 102400,
            storageKey: 'reports/cbc.pdf',
            virusScanStatus: 'CLEAN',
          },
        ],
      });

      mockB2StorageService.isConfigured.mockReturnValue(true);
      mockB2StorageService.generatePresignedDownloadUrl.mockResolvedValue({
        downloadUrl: mockPresignedUrl,
        expiresInSeconds: 900,
        expiresAt: new Date(Date.now() + 900000),
      });

      const result = await service.getPreviewMetadata(mockUserId, mockReportId);

      expect(result.storageUrl).toBe(mockPresignedUrl);
      expect(result.storageUrl).toContain('X-Amz-Signature');
      expect(result.fileName).toBe('cbc.pdf');
    });

    it('should reject getPreviewMetadata when virusScanStatus is PENDING or INFECTED', async () => {
      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        title: 'Blood Test',
        patientProfileId: mockProfileId,
        attachments: [
          {
            fileName: 'cbc.pdf',
            storageKey: 'reports/cbc.pdf',
            virusScanStatus: 'PENDING',
          },
        ],
      });

      mockB2StorageService.isConfigured.mockReturnValue(true);

      await expect(service.getPreviewMetadata(mockUserId, mockReportId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should generate pre-signed URL end-to-end with real S3 presigner', async () => {
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
      process.env.B2_REGION = 'us-east-005';
      process.env.B2_BUCKET_NAME = 'careid-patient-docs-test';
      process.env.B2_KEY_ID = 'test-key-id-005';
      process.env.B2_APPLICATION_KEY = 'test-secret-key-005';

      const realB2Service = new B2StorageService();
      const realReportService = new ReportService(
        mockRepo as any,
        mockQrService as any,
        mockLogger as any,
        realB2Service,
      );

      mockRepo.findProfileByUserId.mockResolvedValue({ id: mockProfileId });
      mockRepo.findReportById.mockResolvedValue({
        id: mockReportId,
        patientProfileId: mockProfileId,
        attachments: [
          {
            fileName: 'real-test-report.pdf',
            storageKey: 'reports/2026/real-test-report.pdf',
            virusScanStatus: 'CLEAN',
          },
        ],
      });

      const result = await realReportService.getDownloadToken(mockUserId, mockReportId);

      expect(result.downloadUrl).toBeDefined();
      expect(result.downloadUrl).toContain('s3.us-east-005.backblazeb2.com');
      expect(result.downloadUrl).toContain('/careid-patient-docs-test/reports/2026/real-test-report.pdf');
      expect(result.downloadUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
      expect(result.downloadUrl).toContain('X-Amz-Credential=');
      expect(result.downloadUrl).toContain('X-Amz-Signature=');
      expect(result.downloadUrl).toContain('response-content-disposition=');
    });
  });
});
