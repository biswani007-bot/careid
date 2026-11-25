import {
  Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards, Req, Res, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { InsuranceService } from '../../application/use-cases/insurance.service';
import { OnboardInsuranceDto, OnboardInsuranceResponseDto } from '../dto/onboard-insurance.dto';
import { InsuranceOcrScanDto, InsuranceOcrScanResponseDto } from '../dto/insurance-ocr-scan.dto';
import { InsuranceOcrConfirmDto, InsuranceOcrConfirmResponseDto } from '../dto/insurance-ocr-confirm.dto';
import {
  CreateProviderDto, CreatePlanDto, CreateFullPolicyDto, PolicyActionDto, CreateClaimDraftDto,
} from '../dto/create-provider.dto';
import {
  InsuranceProviderResponseDto, InsurancePlanResponseDto, InsurancePolicyResponseDto,
  InsuranceClaimDraftResponseDto, InsuranceStatsResponseDto,
} from '../dto/insurance-response.dto';

@ApiTags('Insurance Platform')
@Controller('insurance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  // ─── Provider & Plan Endpoints ──────────────────────────────────────────

  @Post('providers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an insurance provider' })
  @SwaggerResponse({ status: 201, type: InsuranceProviderResponseDto })
  async createProvider(@Body() dto: CreateProviderDto): Promise<InsuranceProviderResponseDto> {
    return this.insuranceService.createProvider(dto);
  }

  @Get('providers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active insurance providers' })
  @SwaggerResponse({ status: 200, type: [InsuranceProviderResponseDto] })
  async getProviders(): Promise<InsuranceProviderResponseDto[]> {
    return this.insuranceService.getProviders();
  }

  @Post('plans')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN', 'STAFF')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an insurance plan' })
  @SwaggerResponse({ status: 201, type: InsurancePlanResponseDto })
  async createPlan(@Body() dto: CreatePlanDto): Promise<InsurancePlanResponseDto> {
    return this.insuranceService.createPlan(dto);
  }

  @Get('plans')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List insurance plans (supports providerId filter)' })
  @ApiQuery({ name: 'providerId', required: false })
  @SwaggerResponse({ status: 200, type: [InsurancePlanResponseDto] })
  async getPlans(@Query('providerId') providerId?: string): Promise<InsurancePlanResponseDto[]> {
    return this.insuranceService.getPlans(providerId);
  }

  // ─── Policy Endpoints ───────────────────────────────────────────────────

  @Post('policies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Issue/Register a full insurance policy for patient' })
  @SwaggerResponse({ status: 201, type: InsurancePolicyResponseDto })
  async createFullPolicy(@Req() req: any, @Body() dto: CreateFullPolicyDto): Promise<InsurancePolicyResponseDto> {
    return this.insuranceService.createFullPolicy(req.user.userId, dto);
  }

  @Get('policies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all insurance policies for current patient' })
  @SwaggerResponse({ status: 200, type: [InsurancePolicyResponseDto] })
  async getPolicies(@Req() req: any): Promise<InsurancePolicyResponseDto[]> {
    return this.insuranceService.getPolicies(req.user.userId);
  }

  @Get('search')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN', 'STAFF')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search insurance policies by provider or policy number' })
  @ApiQuery({ name: 'q', required: true })
  @SwaggerResponse({ status: 200, type: [InsurancePolicyResponseDto] })
  async searchPolicies(@Query('q') query: string): Promise<InsurancePolicyResponseDto[]> {
    return this.insuranceService.searchPolicies(query);
  }

  @Get('statistics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get platform-wide insurance statistics' })
  @SwaggerResponse({ status: 200, type: InsuranceStatsResponseDto })
  async getStatistics(): Promise<InsuranceStatsResponseDto> {
    return this.insuranceService.getStatistics();
  }

  @Get('policies/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get specific insurance policy details' })
  @ApiParam({ name: 'id', description: 'Insurance Policy ID' })
  @SwaggerResponse({ status: 200, type: InsurancePolicyResponseDto })
  async getPolicyById(@Req() req: any, @Param('id') id: string): Promise<InsurancePolicyResponseDto> {
    return this.insuranceService.getPolicyById(req.user.userId, id);
  }

  @Put('policies/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update insurance policy details (blocked if ARCHIVED)' })
  @ApiParam({ name: 'id', description: 'Insurance Policy ID' })
  @SwaggerResponse({ status: 200, type: InsurancePolicyResponseDto })
  async updatePolicyDetails(@Req() req: any, @Param('id') id: string, @Body() dto: Partial<CreateFullPolicyDto>): Promise<InsurancePolicyResponseDto> {
    return this.insuranceService.updatePolicyDetails(req.user.userId, id, dto);
  }

  @Post('policies/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate an insurance policy' })
  @ApiParam({ name: 'id', description: 'Insurance Policy ID' })
  @SwaggerResponse({ status: 200, type: InsurancePolicyResponseDto })
  async activatePolicy(@Req() req: any, @Param('id') id: string, @Body() dto: PolicyActionDto): Promise<InsurancePolicyResponseDto> {
    return this.insuranceService.activatePolicy(req.user.userId, id, dto);
  }

  @Post('policies/:id/renew')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renew an insurance policy (extends validity by 1 year)' })
  @ApiParam({ name: 'id', description: 'Insurance Policy ID' })
  @SwaggerResponse({ status: 200, type: InsurancePolicyResponseDto })
  async renewPolicy(@Req() req: any, @Param('id') id: string, @Body() dto: PolicyActionDto): Promise<InsurancePolicyResponseDto> {
    return this.insuranceService.renewPolicy(req.user.userId, id, dto);
  }

  @Post('policies/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend an insurance policy' })
  @ApiParam({ name: 'id', description: 'Insurance Policy ID' })
  @SwaggerResponse({ status: 200, type: InsurancePolicyResponseDto })
  async suspendPolicy(@Req() req: any, @Param('id') id: string, @Body() dto: PolicyActionDto): Promise<InsurancePolicyResponseDto> {
    return this.insuranceService.suspendPolicy(req.user.userId, id, dto);
  }

  @Post('policies/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an insurance policy' })
  @ApiParam({ name: 'id', description: 'Insurance Policy ID' })
  @SwaggerResponse({ status: 200, type: InsurancePolicyResponseDto })
  async cancelPolicy(@Req() req: any, @Param('id') id: string, @Body() dto: PolicyActionDto): Promise<InsurancePolicyResponseDto> {
    return this.insuranceService.cancelPolicy(req.user.userId, id, dto);
  }

  @Post('policies/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive an insurance policy' })
  @ApiParam({ name: 'id', description: 'Insurance Policy ID' })
  @SwaggerResponse({ status: 200, type: InsurancePolicyResponseDto })
  async archivePolicy(@Req() req: any, @Param('id') id: string, @Body() dto: PolicyActionDto): Promise<InsurancePolicyResponseDto> {
    return this.insuranceService.archivePolicy(req.user.userId, id, dto);
  }

  @Post('policies/:id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore an archived insurance policy' })
  @ApiParam({ name: 'id', description: 'Insurance Policy ID' })
  @SwaggerResponse({ status: 200, type: InsurancePolicyResponseDto })
  async restorePolicy(@Req() req: any, @Param('id') id: string, @Body() dto: PolicyActionDto): Promise<InsurancePolicyResponseDto> {
    return this.insuranceService.restorePolicy(req.user.userId, id, dto);
  }

  @Post('policies/:id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify coverage status for an insurance policy' })
  @ApiParam({ name: 'id', description: 'Insurance Policy ID' })
  @SwaggerResponse({ status: 200, type: InsurancePolicyResponseDto })
  async verifyPolicy(@Req() req: any, @Param('id') id: string): Promise<InsurancePolicyResponseDto> {
    return this.insuranceService.verifyPolicy(req.user.userId, id);
  }

  // ─── Claim Draft Endpoints ───────────────────────────────────────────────

  @Post('claims')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a claim draft attaching medical records and reports' })
  @SwaggerResponse({ status: 201, type: InsuranceClaimDraftResponseDto })
  async createClaimDraft(@Req() req: any, @Body() dto: CreateClaimDraftDto): Promise<InsuranceClaimDraftResponseDto> {
    return this.insuranceService.createClaimDraft(req.user.userId, dto);
  }

  @Get('claims')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all claim drafts for current patient' })
  @SwaggerResponse({ status: 200, type: [InsuranceClaimDraftResponseDto] })
  async getClaimDrafts(@Req() req: any): Promise<InsuranceClaimDraftResponseDto[]> {
    return this.insuranceService.getClaimDrafts(req.user.userId);
  }

  // ─── Onboarding & OCR Hooks (Backward Compatibility) ─────────────────────

  @Post('onboard')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save insurance details during 6-step patient onboarding (Step 4)' })
  @SwaggerResponse({ status: 201, type: OnboardInsuranceResponseDto })
  async onboardInsurance(@Req() req: any, @Body() dto: OnboardInsuranceDto): Promise<OnboardInsuranceResponseDto> {
    return this.insuranceService.onboardInsurance(req.user.userId, dto);
  }

  @Post('ocr')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Scan insurance card image via OCR extraction (standard endpoint)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @SwaggerResponse({ status: 200, type: InsuranceOcrScanResponseDto })
  async scanInsuranceCardAlias(
    @Req() req: any,
    @Body() dto?: InsuranceOcrScanDto,
    @UploadedFile() file?: any,
  ): Promise<InsuranceOcrScanResponseDto> {
    const roles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.insuranceService.scanInsuranceCard(req.user.userId, roles, dto, file);
  }

  @Get('ocr/file/:filename')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Serve uploaded insurance card file' })
  async serveCardFile(@Req() req: any, @Param('filename') filename: string, @Res() res: any) {
    const roles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.insuranceService.serveCardFile(filename, req.user?.userId, roles, res);
  }

  @Get('ocr/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get insurance card OCR scan record details by ID' })
  @ApiParam({ name: 'id', description: 'OCR record ID' })
  @SwaggerResponse({ status: 200, description: 'OCR record details' })
  async getOcrRecord(@Req() req: any, @Param('id') id: string): Promise<any> {
    const roles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.insuranceService.getOcrRecord(id, req.user?.userId, roles);
  }

  @Post(['ocr/scan', 'ocr/extract'])
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Scan or extract insurance card image via OCR' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @SwaggerResponse({ status: 200, type: InsuranceOcrScanResponseDto })
  async scanInsuranceCard(
    @Req() req: any,
    @Body() dto?: InsuranceOcrScanDto,
    @UploadedFile() file?: any,
  ): Promise<InsuranceOcrScanResponseDto> {
    const roles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    const userId = req.user?.id || req.user?.userId;
    return this.insuranceService.scanInsuranceCard(userId, roles, dto, file);
  }

  @Post('manual-review')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN', 'STAFF')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit manual verification review for insurance card OCR record' })
  @SwaggerResponse({ status: 200, description: 'Manual review recorded' })
  async manualReview(
    @Req() req: any,
    @Body() dto: { ocrRecordId?: string; ocrJobId?: string; reviewStatus?: string; reviewNotes?: string; correctedData?: any },
  ): Promise<any> {
    const roles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    const userId = req.user?.id || req.user?.userId;
    return this.insuranceService.submitManualReview(userId, roles, dto);
  }

  @Post('ocr/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm extracted OCR data to create insurance policy' })
  @SwaggerResponse({ status: 200, type: InsuranceOcrConfirmResponseDto })
  async confirmOcrScan(@Req() req: any, @Body() dto: InsuranceOcrConfirmDto): Promise<InsuranceOcrConfirmResponseDto> {
    const roles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.insuranceService.confirmOcrScan(req.user.userId, roles, dto);
  }
}
