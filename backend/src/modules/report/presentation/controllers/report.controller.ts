import {
  Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards, Req, Res, HttpCode, HttpStatus, StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ReportAuthGuard } from '../../infrastructure/guards/report-auth.guard';
import { ReportService } from '../../application/use-cases/report.service';
import { UploadReportDto, UpdateReportDto, ReplaceReportFileDto, VerifyReportDto } from '../dto/upload-report.dto';
import {
  FullReportResponseDto,
  DownloadTokenResponseDto,
  PreviewMetadataResponseDto,
  ReportVersionResponseDto,
} from '../dto/report-detail-response.dto';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(ReportAuthGuard)
@ApiBearerAuth('JWT-Auth')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload and register a diagnostic medical report' })
  @SwaggerResponse({ status: 201, type: FullReportResponseDto })
  async uploadReport(@Req() req: any, @Body() dto: UploadReportDto): Promise<FullReportResponseDto> {
    return this.reportService.uploadReport(req.user.userId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all diagnostic reports for the patient (supports category filtering)' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category (LAB, RADIOLOGY, etc.)' })
  @SwaggerResponse({ status: 200, type: [FullReportResponseDto] })
  async getReportsList(@Req() req: any, @Query('category') category?: string): Promise<FullReportResponseDto[]> {
    return this.reportService.getReportsList(req.user.userId, category);
  }

  @Get('categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get report categories list with record count breakdown' })
  @SwaggerResponse({ status: 200, description: 'Category count map' })
  async getCategories(@Req() req: any): Promise<any> {
    return this.reportService.getCategories(req.user.userId);
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search diagnostic reports by title, description, doctor, provider, or tags' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @SwaggerResponse({ status: 200, type: [FullReportResponseDto] })
  async searchReports(@Req() req: any, @Query('q') query: string): Promise<FullReportResponseDto[]> {
    return this.reportService.searchReports(req.user.userId, query);
  }

  @Get('timeline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get diagnostic reports timeline ordered by report date' })
  @SwaggerResponse({ status: 200, description: 'Diagnostic timeline items' })
  async getTimeline(@Req() req: any): Promise<any[]> {
    return this.reportService.getTimeline(req.user.userId);
  }

  @Get('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export diagnostic reports as PDF or CSV' })
  @ApiQuery({ name: 'format', required: false, enum: ['PDF', 'CSV'] })
  @ApiQuery({ name: 'category', required: false })
  async exportReports(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
    @Query('format') format = 'PDF',
    @Query('category') category?: string,
  ): Promise<any> {
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    const userId = req.user?.userId || req.user?.id;
    const upperFormat = format?.toUpperCase() || 'PDF';

    if (upperFormat === 'PDF') {
      const { buffer } = await this.reportService.exportReports({ userId, roles }, 'PDF', category);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="careid-diagnostic-reports.pdf"');
      res.setHeader('Content-Length', (buffer?.length || 0).toString());
      return new StreamableFile(buffer!);
    }

    const { csv } = await this.reportService.exportReports({ userId, roles }, 'CSV', category);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="careid-diagnostic-reports.csv"');
    return new StreamableFile(Buffer.from(csv || '', 'utf-8'));
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get specific diagnostic report details by ID' })
  @ApiParam({ name: 'id', description: 'Medical Report ID' })
  @SwaggerResponse({ status: 200, type: FullReportResponseDto })
  async getReportDetails(@Req() req: any, @Param('id') id: string): Promise<FullReportResponseDto> {
    return this.reportService.getReportDetails(req.user.userId, id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update diagnostic report metadata (blocked if ARCHIVED)' })
  @ApiParam({ name: 'id', description: 'Medical Report ID' })
  @SwaggerResponse({ status: 200, type: FullReportResponseDto })
  async updateReport(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateReportDto): Promise<FullReportResponseDto> {
    return this.reportService.updateReport(req.user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a diagnostic report' })
  @ApiParam({ name: 'id', description: 'Medical Report ID' })
  @SwaggerResponse({ status: 200, description: 'Report soft-deleted' })
  async softDeleteReport(@Req() req: any, @Param('id') id: string): Promise<any> {
    return this.reportService.softDeleteReport(req.user.userId, id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a report (makes report read-only)' })
  @ApiParam({ name: 'id', description: 'Medical Report ID' })
  @SwaggerResponse({ status: 200, type: FullReportResponseDto })
  async archiveReport(@Req() req: any, @Param('id') id: string): Promise<FullReportResponseDto> {
    return this.reportService.archiveReport(req.user.userId, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted or archived report' })
  @ApiParam({ name: 'id', description: 'Medical Report ID' })
  @SwaggerResponse({ status: 200, type: FullReportResponseDto })
  async restoreReport(@Req() req: any, @Param('id') id: string): Promise<FullReportResponseDto> {
    return this.reportService.restoreReport(req.user.userId, id);
  }

  @Post(':id/replace')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace PDF file for report — creates a new immutable version snapshot' })
  @ApiParam({ name: 'id', description: 'Medical Report ID' })
  @SwaggerResponse({ status: 200, type: FullReportResponseDto })
  async replaceReportFile(@Req() req: any, @Param('id') id: string, @Body() dto: ReplaceReportFileDto): Promise<FullReportResponseDto> {
    return this.reportService.replaceReportFile(req.user.userId, id, dto);
  }

  @Get(':id/versions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get full version history for a diagnostic report' })
  @ApiParam({ name: 'id', description: 'Medical Report ID' })
  @SwaggerResponse({ status: 200, type: [ReportVersionResponseDto] })
  async getReportVersions(@Req() req: any, @Param('id') id: string): Promise<ReportVersionResponseDto[]> {
    return this.reportService.getReportVersions(req.user.userId, id);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark diagnostic report as VERIFIED with verification notes' })
  @ApiParam({ name: 'id', description: 'Medical Report ID' })
  @SwaggerResponse({ status: 200, type: FullReportResponseDto })
  async verifyReport(@Req() req: any, @Param('id') id: string, @Body() dto: VerifyReportDto): Promise<FullReportResponseDto> {
    return this.reportService.verifyReport(req.user.userId, id, dto);
  }

  @Get('download/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a secure timed download URL/token for a report file' })
  @ApiParam({ name: 'id', description: 'Medical Report ID' })
  @SwaggerResponse({ status: 200, type: DownloadTokenResponseDto })
  async getDownloadToken(@Req() req: any, @Param('id') id: string): Promise<DownloadTokenResponseDto> {
    return this.reportService.getDownloadToken(req.user.userId, id);
  }

  @Get('download/:id/file')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute verified secure download of a report attachment' })
  @ApiParam({ name: 'id', description: 'Medical Report ID' })
  @ApiQuery({ name: 'token', required: true, description: 'Signed download token (from GET /reports/download/:id)' })
  @SwaggerResponse({ status: 200, description: 'Verified report file metadata and delivery endpoint' })
  async downloadReportFile(
    @Req() req: any,
    @Param('id') id: string,
    @Query('token') token: string,
  ): Promise<{ fileName: string; mimeType: string; storageUrl: string; fileSize?: number }> {
    return this.reportService.verifyAndExecuteDownload(id, token, req.user?.userId);
  }

  @Get(':id/file')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute verified secure download of a report attachment (alias)' })
  @ApiParam({ name: 'id', description: 'Medical Report ID' })
  @ApiQuery({ name: 'token', required: true, description: 'Signed download token' })
  @SwaggerResponse({ status: 200, description: 'Verified report file metadata and delivery endpoint' })
  async downloadReportFileAlias(
    @Req() req: any,
    @Param('id') id: string,
    @Query('token') token: string,
  ): Promise<{ fileName: string; mimeType: string; storageUrl: string; fileSize?: number }> {
    return this.reportService.verifyAndExecuteDownload(id, token, req.user?.userId);
  }

  @Get('preview/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get PDF preview metadata (page count, size, MIME type, storage URL)' })
  @ApiParam({ name: 'id', description: 'Medical Report ID' })
  @SwaggerResponse({ status: 200, type: PreviewMetadataResponseDto })
  async getPreviewMetadata(@Req() req: any, @Param('id') id: string): Promise<PreviewMetadataResponseDto> {
    return this.reportService.getPreviewMetadata(req.user.userId, id);
  }
}
