import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { SecurityService } from '../../application/use-cases/security.service';
import {
  ConsentRecordResponseDto, RetentionPolicyResponseDto, SecurityIncidentResponseDto,
  EncryptionKeyResponseDto, ComplianceReportResponseDto, SecurityAuditLogResponseDto,
  SecurityDashboardResponseDto, ApiKeyResponseDto,
} from '../dto/security-response.dto';
import {
  CreateConsentDto, CreateRetentionPolicyDto, UpdateRetentionPolicyDto,
  CreateSecurityIncidentDto, ResolveSecurityIncidentDto, GenerateComplianceReportDto,
  CreateApiKeyDto,
} from '../dto/security-enterprise.dto';

@ApiTags('Security & Compliance')
@Controller('security')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth('JWT-Auth')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  // ─── Dashboard Stats ─────────────────────────────────────────────────────

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Enterprise Security & Compliance Dashboard summary' })
  @SwaggerResponse({ status: 200, type: SecurityDashboardResponseDto })
  async getDashboard(): Promise<SecurityDashboardResponseDto> {
    return this.securityService.getDashboardStats();
  }

  // ─── Consents ─────────────────────────────────────────────────────────────

  @Post(['consents', 'consents/grant'])
  @Roles('ADMIN', 'SUPER_ADMIN', 'PATIENT', 'STAFF', 'FACILITY_ADMIN', 'DOCTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Capture patient consent record' })
  @SwaggerResponse({ status: 201, type: ConsentRecordResponseDto })
  async createConsent(@Req() req: any, @Body() dto: CreateConsentDto): Promise<ConsentRecordResponseDto> {
    return this.securityService.createConsent(req.user, dto);
  }

  @Get('consents')
  @Roles('ADMIN', 'SUPER_ADMIN', 'PATIENT', 'DOCTOR', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List patient consents with optional filters' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'consentType', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @SwaggerResponse({ status: 200, description: 'Paginated list of patient consent records' })
  async getConsents(
    @Req() req: any,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('consentType') consentType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    return this.securityService.getConsents(req.user, {
      patientId,
      status,
      consentType,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('consents/active')
  @Roles('ADMIN', 'SUPER_ADMIN', 'PATIENT', 'DOCTOR', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active consents for current patient' })
  @SwaggerResponse({ status: 200, type: [ConsentRecordResponseDto] })
  async getActiveConsents(@Req() req: any): Promise<ConsentRecordResponseDto[]> {
    return this.securityService.getActiveConsents(req.user);
  }

  @Get('consents/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'PATIENT', 'DOCTOR', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get consent record details by ID' })
  @ApiParam({ name: 'id', description: 'Consent ID' })
  @SwaggerResponse({ status: 200, type: ConsentRecordResponseDto })
  async getConsentById(@Req() req: any, @Param('id') id: string): Promise<ConsentRecordResponseDto> {
    return this.securityService.getConsentById(id, req.user);
  }

  @Post('consents/:id/withdraw')
  @Roles('ADMIN', 'SUPER_ADMIN', 'PATIENT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw patient consent' })
  @ApiParam({ name: 'id', description: 'Consent ID' })
  @SwaggerResponse({ status: 200, type: ConsentRecordResponseDto })
  async withdrawConsent(@Req() req: any, @Param('id') id: string): Promise<ConsentRecordResponseDto> {
    return this.securityService.withdrawConsent(id, req.user);
  }

  @Post('consents/:id/confirm')
  @Roles('PATIENT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm and grant a pending patient consent record' })
  @ApiParam({ name: 'id', description: 'Consent ID' })
  @SwaggerResponse({ status: 200, type: ConsentRecordResponseDto })
  async confirmConsent(@Req() req: any, @Param('id') id: string): Promise<ConsentRecordResponseDto> {
    return this.securityService.confirmConsent(id, req.user);
  }

  // ─── Retention Policies ──────────────────────────────────────────────────

  @Post('retention')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create data retention policy' })
  @SwaggerResponse({ status: 201, type: RetentionPolicyResponseDto })
  async createRetentionPolicy(
    @Req() req: any,
    @Body() dto: CreateRetentionPolicyDto,
  ): Promise<RetentionPolicyResponseDto> {
    return this.securityService.createRetentionPolicy(req.user.userId, dto);
  }

  @Get('retention')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all retention policies' })
  @SwaggerResponse({ status: 200, type: [RetentionPolicyResponseDto] })
  async getRetentionPolicies(): Promise<RetentionPolicyResponseDto[]> {
    return this.securityService.getRetentionPolicies();
  }

  @Put('retention/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update retention policy parameters' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @SwaggerResponse({ status: 200, type: RetentionPolicyResponseDto })
  async updateRetentionPolicy(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRetentionPolicyDto,
  ): Promise<RetentionPolicyResponseDto> {
    return this.securityService.updateRetentionPolicy(id, dto, req.user.userId);
  }

  @Delete('retention/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate / soft-delete retention policy' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @SwaggerResponse({ status: 200, description: 'Policy deactivated' })
  async softDeleteRetentionPolicy(@Req() req: any, @Param('id') id: string): Promise<any> {
    return this.securityService.softDeleteRetentionPolicy(id, req.user.userId);
  }

  // ─── Security Incidents ──────────────────────────────────────────────────

  @Post('incidents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log new security incident' })
  @SwaggerResponse({ status: 201, type: SecurityIncidentResponseDto })
  async createIncident(
    @Req() req: any,
    @Body() dto: CreateSecurityIncidentDto,
  ): Promise<SecurityIncidentResponseDto> {
    return this.securityService.createIncident(req.user.userId, dto);
  }

  @Get('incidents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List security incidents with severity/status filters' })
  @ApiQuery({ name: 'severity', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @ApiQuery({ name: 'status', required: false })
  @SwaggerResponse({ status: 200, type: [SecurityIncidentResponseDto] })
  async getIncidents(
    @Query('severity') severity?: string,
    @Query('status') status?: string,
  ): Promise<SecurityIncidentResponseDto[]> {
    return this.securityService.getIncidents(severity, status);
  }

  @Put('incidents/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve an open security incident' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @SwaggerResponse({ status: 200, type: SecurityIncidentResponseDto })
  async resolveIncident(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ResolveSecurityIncidentDto,
  ): Promise<SecurityIncidentResponseDto> {
    return this.securityService.resolveIncident(id, req.user.userId, dto);
  }

  // ─── Encryption Key Management ───────────────────────────────────────────

  @Get('keys/active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active KMS encryption key metadata' })
  @SwaggerResponse({ status: 200, type: EncryptionKeyResponseDto })
  async getActiveEncryptionKey(): Promise<EncryptionKeyResponseDto> {
    return this.securityService.getActiveEncryptionKey();
  }

  @Post('keys/rotate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger KMS encryption key rotation' })
  @SwaggerResponse({ status: 200, type: EncryptionKeyResponseDto })
  async rotateEncryptionKey(@Req() req: any): Promise<EncryptionKeyResponseDto> {
    return this.securityService.rotateEncryptionKey(req.user.userId);
  }

  // ─── Compliance Reports ─────────────────────────────────────────────────

  @Post('compliance/report')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate automated compliance assessment report' })
  @SwaggerResponse({ status: 201, type: ComplianceReportResponseDto })
  async generateComplianceReport(
    @Req() req: any,
    @Body() dto: GenerateComplianceReportDto,
  ): Promise<ComplianceReportResponseDto> {
    return this.securityService.generateComplianceReport(req.user.userId, dto);
  }

  @Get('compliance/reports')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List generated compliance reports' })
  @SwaggerResponse({ status: 200, type: [ComplianceReportResponseDto] })
  async getComplianceReports(): Promise<ComplianceReportResponseDto[]> {
    return this.securityService.getComplianceReports();
  }

  // ─── Audit ───────────────────────────────────────────────────────────────

  @Get('audit')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List security audit logs (scoped to authenticated doctor, or administrative view for admins)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Target user ID filter (Admin/Super Admin only)' })
  @ApiQuery({ name: 'resource', required: false, description: 'Resource filter (e.g. PATIENTS, AUTH_SESSION, CONSENT)' })
  @ApiQuery({ name: 'action', required: false, description: 'Specific action type' })
  @ApiQuery({ name: 'startDate', required: false, description: 'ISO date filter start' })
  @ApiQuery({ name: 'endDate', required: false, description: 'ISO date filter end' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (max: 100, default: 50)' })
  @SwaggerResponse({ status: 200, type: [SecurityAuditLogResponseDto] })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getAuditLogs(
    @Req() req: any,
    @Query('userId') userId?: string,
    @Query('resource') resource?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<SecurityAuditLogResponseDto[]> {
    return this.securityService.getAuditLogs(req.user, {
      userId,
      resource,
      action,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ─── Integration API Keys ──────────────────────────────────────────────────

  @Post('api-keys')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create API key for developer / partner system integration' })
  @SwaggerResponse({ status: 201, type: ApiKeyResponseDto })
  async createApiKey(@Req() req: any, @Body() dto: CreateApiKeyDto): Promise<ApiKeyResponseDto> {
    return this.securityService.createApiKey(req.user.userId, dto);
  }

  @Get('api-keys')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all active and revoked API keys' })
  @SwaggerResponse({ status: 200, type: [ApiKeyResponseDto] })
  async getApiKeys(): Promise<ApiKeyResponseDto[]> {
    return this.securityService.getApiKeys();
  }

  @Get('api-keys/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get API key metadata by ID' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @SwaggerResponse({ status: 200, type: ApiKeyResponseDto })
  async getApiKeyById(@Param('id') id: string): Promise<ApiKeyResponseDto> {
    return this.securityService.getApiKeyById(id);
  }

  @Delete('api-keys/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @SwaggerResponse({ status: 200, description: 'API key deleted' })
  async deleteApiKey(@Req() req: any, @Param('id') id: string): Promise<{ message: string }> {
    return this.securityService.deleteApiKey(id, req.user.userId);
  }

  @Patch('api-keys/:id/revoke')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an active API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @SwaggerResponse({ status: 200, type: ApiKeyResponseDto })
  async revokeApiKey(@Req() req: any, @Param('id') id: string): Promise<ApiKeyResponseDto> {
    return this.securityService.revokeApiKey(id, req.user.userId);
  }
}
