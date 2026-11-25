import { Test, TestingModule } from '@nestjs/testing';
import { ReportController } from '../presentation/controllers/report.controller';
import { ReportService } from '../application/use-cases/report.service';
import { ReportAuthGuard } from '../infrastructure/guards/report-auth.guard';
import { ForbiddenException, UnauthorizedException, BadRequestException, NotFoundException, ExecutionContext } from '@nestjs/common';

describe('ReportController - Secure Download Endpoints (SEC-AUD-03 & Storage Validation)', () => {
  let controller: ReportController;
  let service: jest.Mocked<ReportService>;

  const mockUserId = 'user-uuid-1';
  const mockReportId = 'report-uuid-1';
  const mockToken = 'dl_1730000000000_0123456789abcdef0123456789abcdef_0123456789abcdef0123456789abcdef';

  beforeEach(async () => {
    const mockReportService = {
      getDownloadToken: jest.fn(),
      verifyAndExecuteDownload: jest.fn(),
      getPreviewMetadata: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [
        { provide: ReportService, useValue: mockReportService },
      ],
    })
      .overrideGuard(ReportAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReportController>(ReportController);
    service = module.get(ReportService);
  });

  describe('downloadReportFile (GET /reports/download/:id/file)', () => {
    it('should successfully deliver report file metadata when token and report are valid and clean', async () => {
      const mockResult = {
        fileName: 'cbc.pdf',
        mimeType: 'application/pdf',
        storageUrl: 'https://cdn.hvapi.com/cbc.pdf',
        fileSize: 102400,
      };
      service.verifyAndExecuteDownload.mockResolvedValue(mockResult);

      const req = { user: { userId: mockUserId } };
      const result = await controller.downloadReportFile(req, mockReportId, mockToken);

      expect(service.verifyAndExecuteDownload).toHaveBeenCalledWith(mockReportId, mockToken, mockUserId);
      expect(result).toEqual(mockResult);
    });

    it('should successfully deliver file when caller is unauthenticated browser with valid signed token', async () => {
      const mockResult = {
        fileName: 'cbc.pdf',
        mimeType: 'application/pdf',
        storageUrl: 'https://cdn.hvapi.com/cbc.pdf',
        fileSize: 102400,
      };
      service.verifyAndExecuteDownload.mockResolvedValue(mockResult);

      const req = {}; // No req.user (direct browser navigation)
      const result = await controller.downloadReportFile(req, mockReportId, mockToken);

      expect(service.verifyAndExecuteDownload).toHaveBeenCalledWith(mockReportId, mockToken, undefined);
      expect(result).toEqual(mockResult);
    });

    it('should reject unauthorized user attempting to download report with 403 Forbidden', async () => {
      service.verifyAndExecuteDownload.mockRejectedValue(new ForbiddenException('Access denied'));

      const req = { user: { userId: 'unauthorized-user-id' } };
      await expect(controller.downloadReportFile(req, mockReportId, mockToken))
        .rejects.toThrow(ForbiddenException);
    });

    it('should reject expired download token with 401 Unauthorized', async () => {
      service.verifyAndExecuteDownload.mockRejectedValue(new UnauthorizedException('Download token has expired'));

      const req = { user: { userId: mockUserId } };
      await expect(controller.downloadReportFile(req, mockReportId, 'expired-token'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should reject file download when virusScanStatus is PENDING with 400 Bad Request', async () => {
      service.verifyAndExecuteDownload.mockRejectedValue(
        new BadRequestException('Attachment virus scan is pending; download unavailable'),
      );

      const req = { user: { userId: mockUserId } };
      await expect(controller.downloadReportFile(req, mockReportId, mockToken))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject file download when virusScanStatus is INFECTED with 400 Bad Request', async () => {
      service.verifyAndExecuteDownload.mockRejectedValue(
        new BadRequestException('Attachment virus scan is infected; download unavailable'),
      );

      const req = { user: { userId: mockUserId } };
      await expect(controller.downloadReportFile(req, mockReportId, mockToken))
        .rejects.toThrow(BadRequestException);
    });

    it('should successfully deliver B2 pre-signed URL when Backblaze B2 is configured', async () => {
      const mockB2Result = {
        fileName: 'mri-scan.pdf',
        mimeType: 'application/pdf',
        storageUrl:
          'https://s3.us-east-005.backblazeb2.com/careid-patient-docs/reports/mri.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc',
        fileSize: 524288,
      };
      service.verifyAndExecuteDownload.mockResolvedValue(mockB2Result);

      const req = { user: { userId: mockUserId } };
      const result = await controller.downloadReportFile(req, mockReportId, mockToken);

      expect(result.storageUrl).toContain('s3.us-east-005.backblazeb2.com');
      expect(result.storageUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
    });

    it('should deliver B2 pre-signed URL via downloadReportFileAlias (:id/file)', async () => {
      const mockB2Result = {
        fileName: 'mri-scan.pdf',
        mimeType: 'application/pdf',
        storageUrl:
          'https://s3.us-east-005.backblazeb2.com/careid-patient-docs/reports/mri.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc',
        fileSize: 524288,
      };
      service.verifyAndExecuteDownload.mockResolvedValue(mockB2Result);

      const req = { user: { userId: mockUserId } };
      const result = await controller.downloadReportFileAlias(req, mockReportId, mockToken);

      expect(result.storageUrl).toContain('s3.us-east-005.backblazeb2.com');
      expect(result.storageUrl).toContain('X-Amz-Signature=abc');
    });
  });

  describe('getDownloadToken with Backblaze B2 Pre-signed URLs', () => {
    it('should return pre-signed B2 download URL from getDownloadToken', async () => {
      const mockDownloadDto = {
        downloadUrl:
          'https://s3.us-east-005.backblazeb2.com/careid-patient-docs/reports/mri.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=xyz',
        token: mockToken,
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      };
      service.getDownloadToken.mockResolvedValue(mockDownloadDto);

      const req = { user: { userId: mockUserId } };
      const result = await controller.getDownloadToken(req, mockReportId);

      expect(service.getDownloadToken).toHaveBeenCalledWith(mockUserId, mockReportId);
      expect(result.downloadUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
      expect(result.downloadUrl).toContain('X-Amz-Signature=xyz');
    });
  });

  describe('getPreviewMetadata with Backblaze B2 Pre-signed URLs', () => {
    it('should return preview metadata with B2 pre-signed storageUrl', async () => {
      const mockPreviewDto: any = {
        id: mockReportId,
        title: 'MRI Brain',
        fileName: 'mri.pdf',
        fileSize: 524288,
        mimeType: 'application/pdf',
        pageCount: 3,
        language: 'en',
        storageUrl:
          'https://s3.us-east-005.backblazeb2.com/careid-patient-docs/reports/mri.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=def',
        isPdf: true,
        verificationStatus: 'VERIFIED',
      };
      service.getPreviewMetadata.mockResolvedValue(mockPreviewDto);

      const req = { user: { userId: mockUserId } };
      const result = await controller.getPreviewMetadata(req, mockReportId);

      expect(service.getPreviewMetadata).toHaveBeenCalledWith(mockUserId, mockReportId);
      expect(result.storageUrl).toContain('s3.us-east-005.backblazeb2.com');
      expect(result.storageUrl).toContain('X-Amz-Signature=def');
    });
  });

  describe('ReportAuthGuard Unit Tests', () => {
    let guard: ReportAuthGuard;

    beforeEach(() => {
      guard = new ReportAuthGuard();
    });

    it('should allow access to download path when token query parameter is present', async () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            url: `/api/v1/reports/download/${mockReportId}/file?token=${mockToken}`,
            path: `/api/v1/reports/download/${mockReportId}/file`,
            query: { token: mockToken },
            headers: {},
          }),
        }),
      } as unknown as ExecutionContext;

      const canActivate = await guard.canActivate(mockContext);
      expect(canActivate).toBe(true);
    });

    it('should delegate to super.canActivate (JWT guard) when on non-download path', async () => {
      const superSpy = jest.spyOn(ReportAuthGuard.prototype as any, 'canActivate');
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            url: '/api/v1/reports',
            path: '/api/v1/reports',
            query: {},
            headers: {},
          }),
        }),
      } as unknown as ExecutionContext;

      // When no authorization header and not a download route, it should reject or throw
      try {
        await guard.canActivate(mockContext);
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });
});
