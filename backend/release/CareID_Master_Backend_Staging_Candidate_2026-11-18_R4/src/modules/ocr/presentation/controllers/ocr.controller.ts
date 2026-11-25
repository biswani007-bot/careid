import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { OCRJobService } from '../../application/use-cases/ocr.service';
import {
  OCRJobResponseDto, ExtractedFieldResponseDto, OCRTemplateResponseDto,
  OCRVerificationResponseDto, OCRDashboardResponseDto, OCRReviewHistoryItemDto,
} from '../dto/ocr-response.dto';
import {
  CreateOCRJobDto, CreateOCRTemplateDto, UpdateOCRTemplateDto, VerifyOCRDto,
  OCRReviewHistoryQueryDto,
} from '../dto/ocr-enterprise.dto';

@ApiTags('OCR & Document Processing')
@Controller('ocr')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class OCRController {
  constructor(private readonly ocrJobService: OCRJobService) {}

  // ─── Analytics & Dashboard ───────────────────────────────────────────────

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Enterprise OCR Platform analytics dashboard summary' })
  @SwaggerResponse({ status: 200, type: OCRDashboardResponseDto })
  async getDashboard(): Promise<OCRDashboardResponseDto> {
    return this.ocrJobService.getDashboardStats();
  }

  @Get('statistics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Enterprise OCR accuracy & throughput statistics' })
  @SwaggerResponse({ status: 200, type: OCRDashboardResponseDto })
  async getStatistics(): Promise<OCRDashboardResponseDto> {
    return this.ocrJobService.getDashboardStats();
  }

  // ─── OCR Jobs ─────────────────────────────────────────────────────────────

  @Post('jobs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit medical attachment for local CPU OCR processing' })
  @SwaggerResponse({ status: 201, type: OCRJobResponseDto })
  async submitJob(@Req() req: any, @Body() dto: CreateOCRJobDto): Promise<OCRJobResponseDto> {
    return this.ocrJobService.submitJob(req.user.userId, dto);
  }

  @Post(['reprocess/:jobId', 'jobs/:jobId/reprocess'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reprocess a completed, failed, or review-required OCR job' })
  @ApiParam({ name: 'jobId', description: 'OCR Job ID' })
  @SwaggerResponse({ status: 200, type: OCRJobResponseDto })
  async reprocessJob(@Req() req: any, @Param('jobId') jobId: string): Promise<OCRJobResponseDto> {
    return this.ocrJobService.reprocessJob(jobId, req.user);
  }

  @Get('jobs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all OCR jobs with optional status, document type and pagination filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'documentType', required: false })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 50, max: 100)' })
  @SwaggerResponse({ status: 200, type: [OCRJobResponseDto] })
  async getJobs(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('documentType') documentType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<OCRJobResponseDto[]> {
    let effectiveReq = req;
    let effStatus = status;
    let effDocType = documentType;
    let effPage = page;
    let effLimit = limit;
    if (typeof req === 'string') {
      effStatus = req;
      effDocType = status;
      effPage = documentType as any;
      effLimit = page as any;
      effectiveReq = undefined;
    }
    const caller = effectiveReq?.user || (effectiveReq?.roles ? effectiveReq : undefined);
    return this.ocrJobService.getJobs(effStatus, effDocType, effPage, effLimit, caller);
  }

  @Get('jobs/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get OCR job status and details by ID' })
  @ApiParam({ name: 'id', description: 'OCR Job ID' })
  @SwaggerResponse({ status: 200, type: OCRJobResponseDto })
  async getJobById(
    @Req() req: any,
    @Param('id') id?: string,
  ): Promise<OCRJobResponseDto> {
    const effectiveId = typeof id === 'string' ? id : (typeof req === 'string' ? req : req?.params?.id);
    const effectiveReq = typeof id === 'string' ? req : undefined;
    const caller = effectiveReq?.user || (effectiveReq?.roles ? effectiveReq : undefined);
    return this.ocrJobService.getJobById(effectiveId, caller);
  }

  // ─── OCR Results ─────────────────────────────────────────────────────────

  @Get('jobs/:id/text')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get extracted raw OCR text for job' })
  @ApiParam({ name: 'id', description: 'OCR Job ID' })
  @SwaggerResponse({ status: 200, description: 'Raw text result' })
  async getJobText(
    @Req() req: any,
    @Param('id') id?: string,
  ): Promise<{ text: string }> {
    const effectiveId = typeof id === 'string' ? id : (typeof req === 'string' ? req : req?.params?.id);
    const effectiveReq = typeof id === 'string' ? req : undefined;
    const caller = effectiveReq?.user || (effectiveReq?.roles ? effectiveReq : undefined);
    return this.ocrJobService.getJobText(effectiveId, caller);
  }

  @Get('jobs/:id/fields')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get extracted structured fields with confidence scores' })
  @ApiParam({ name: 'id', description: 'OCR Job ID' })
  @SwaggerResponse({ status: 200, type: [ExtractedFieldResponseDto] })
  async getJobFields(
    @Req() req: any,
    @Param('id') id?: string,
  ): Promise<ExtractedFieldResponseDto[]> {
    const effectiveId = typeof id === 'string' ? id : (typeof req === 'string' ? req : req?.params?.id);
    const effectiveReq = typeof id === 'string' ? req : undefined;
    const caller = effectiveReq?.user || (effectiveReq?.roles ? effectiveReq : undefined);
    return this.ocrJobService.getJobFields(effectiveId, caller);
  }

  @Get('jobs/:id/json')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get formatted structured JSON output of OCR job' })
  @ApiParam({ name: 'id', description: 'OCR Job ID' })
  @SwaggerResponse({ status: 200, description: 'Structured JSON object' })
  async getJobJson(
    @Req() req: any,
    @Param('id') id?: string,
  ): Promise<any> {
    const effectiveId = typeof id === 'string' ? id : (typeof req === 'string' ? req : req?.params?.id);
    const effectiveReq = typeof id === 'string' ? req : undefined;
    const caller = effectiveReq?.user || (effectiveReq?.roles ? effectiveReq : undefined);
    return this.ocrJobService.getJobJson(effectiveId, caller);
  }

  // ─── Templates ───────────────────────────────────────────────────────────

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an OCR Document Template with field definitions' })
  @SwaggerResponse({ status: 201, type: OCRTemplateResponseDto })
  async createTemplate(@Req() req: any, @Body() dto: CreateOCRTemplateDto): Promise<OCRTemplateResponseDto> {
    return this.ocrJobService.createTemplate(req.user.userId, dto);
  }

  @Get('templates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all OCR Document Templates' })
  @SwaggerResponse({ status: 200, type: [OCRTemplateResponseDto] })
  async getTemplates(): Promise<OCRTemplateResponseDto[]> {
    return this.ocrJobService.getTemplates();
  }

  @Put('templates/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update OCR Document Template and increment version' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @SwaggerResponse({ status: 200, type: OCRTemplateResponseDto })
  async updateTemplate(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOCRTemplateDto,
  ): Promise<OCRTemplateResponseDto> {
    return this.ocrJobService.updateTemplate(id, dto, req.user.userId);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete an OCR Document Template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @SwaggerResponse({ status: 200, description: 'Template soft-deleted' })
  async softDeleteTemplate(@Req() req: any, @Param('id') id: string): Promise<any> {
    return this.ocrJobService.softDeleteTemplate(id, req.user.userId);
  }

  // ─── Human Verification Workflow ─────────────────────────────────────────

  @Get('reviews/history')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'STAFF')
  @ApiOperation({ summary: 'Get paginated audit history of completed human OCR reviews' })
  @SwaggerResponse({ status: 200, type: [OCRReviewHistoryItemDto] })
  async getReviewHistory(
    @Req() req?: any,
    @Query() query?: OCRReviewHistoryQueryDto,
  ) {
    const isFirstArgQuery = req && !req.user && !req.headers && !req.roles;
    const effectiveQuery = isFirstArgQuery ? req : (query || {});
    const caller = isFirstArgQuery ? undefined : (req?.user || (req?.roles ? req : undefined));
    return this.ocrJobService.getReviewHistory(effectiveQuery, caller);
  }

  @Get('review')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'STAFF')
  @ApiOperation({ summary: 'List OCR jobs requiring manual human verification' })
  @SwaggerResponse({ status: 200, type: [OCRJobResponseDto] })
  async getJobsRequiringReview(@Req() req?: any): Promise<OCRJobResponseDto[]> {
    const caller = req?.user || (req?.roles ? req : undefined);
    return this.ocrJobService.getJobsRequiringReview(caller);
  }

  @Post('review/:jobId')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'STAFF')
  @ApiOperation({ summary: 'Submit human verification review for low-confidence OCR job' })
  @ApiParam({ name: 'jobId', description: 'OCR Job ID' })
  @SwaggerResponse({ status: 200, type: OCRVerificationResponseDto })
  async submitVerification(
    @Req() req: any,
    @Param('jobId') jobId: string,
    @Body() dto: VerifyOCRDto,
  ): Promise<OCRVerificationResponseDto> {
    const caller = req?.user || (req?.roles ? req : req);
    return this.ocrJobService.submitVerification(jobId, caller, dto);
  }
}
