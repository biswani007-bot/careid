import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Req, Res, HttpCode, HttpStatus, StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { ReferralService } from '../../application/use-cases/referral.service';
import {
  ReferralResponseDto, ReferralNoteResponseDto, ReferralAttachmentResponseDto,
  ReferralStatusHistoryResponseDto, ReferralDashboardStatsResponseDto,
} from '../dto/referral-response.dto';
import {
  CreateReferralDto, UpdateReferralDto, TriageReferralDto, UpdateReferralStatusDto, AddReferralNoteDto, AddReferralAttachmentDto, ReferralQueryDto,
} from '../dto/referral-enterprise.dto';

@ApiTags('Referral & Care Coordination')
@Controller('referrals')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Post()
  @Roles('DOCTOR', 'STAFF', 'FACILITY_ADMIN', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create patient care referral' })
  @SwaggerResponse({ status: 201, type: ReferralResponseDto })
  async createReferral(@Req() req: any, @Body() dto: CreateReferralDto): Promise<ReferralResponseDto> {
    return this.referralService.createReferral(req.user, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List patient care referrals with optional filters' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'referringDoctorId', required: false })
  @ApiQuery({ name: 'receivingDoctorId', required: false })
  @ApiQuery({ name: 'receivingFacilityId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @SwaggerResponse({ status: 200, description: 'Paginated referral list' })
  async getReferrals(
    @Req() req: any,
    @Query() query: ReferralQueryDto,
  ) {
    return this.referralService.getReferrals(query, req.user);
  }

  @Get('my-incoming')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List incoming referrals for current doctor/facility' })
  @SwaggerResponse({ status: 200, description: 'Incoming referral list' })
  async getMyIncoming(@Req() req: any, @Query() query: ReferralQueryDto) {
    return this.referralService.getMyIncoming(req.user, query);
  }

  @Get('my-outgoing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List outgoing referrals created by current doctor' })
  @SwaggerResponse({ status: 200, description: 'Outgoing referral list' })
  async getMyOutgoing(@Req() req: any, @Query() query: ReferralQueryDto) {
    return this.referralService.getMyOutgoing(req.user, query);
  }

  @Get('dashboard/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get referral dashboard metrics and SLA performance analytics' })
  @ApiQuery({ name: 'facilityId', required: false })
  @SwaggerResponse({ status: 200, type: ReferralDashboardStatsResponseDto })
  async getDashboardStats(@Query('facilityId') facilityId?: string): Promise<ReferralDashboardStatsResponseDto> {
    return this.referralService.getDashboardStats(facilityId);
  }

  @Get('export')
  @Roles('DOCTOR', 'STAFF', 'FACILITY_ADMIN', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export referral registry as CSV, structured JSON, or printable PDF' })
  @ApiQuery({ name: 'format', required: false, enum: ['CSV', 'JSON', 'PDF'], description: 'Export format: CSV (default), JSON, or PDF binary stream' })
  async exportReferrals(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
    @Query('format') format = 'CSV',
  ): Promise<any> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    const upperFormat = format?.toUpperCase() || 'CSV';

    if (upperFormat === 'PDF') {
      const result = await this.referralService.exportReferrals({ userId, roles }, 'PDF');
      if (result.buffer) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="careid-referrals-export.pdf"');
        return new StreamableFile(result.buffer);
      }
    }

    const isCsv = upperFormat === 'CSV' || req.headers?.accept?.includes('text/csv');
    const result = await this.referralService.exportReferrals({ userId, roles }, isCsv ? 'CSV' : 'JSON');

    if (isCsv && result.csv) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="careid-referrals-export.csv"');
      return new StreamableFile(Buffer.from(result.csv, 'utf-8'));
    }

    return result.data;
  }

  @Get(':id/pdf')
  @Roles('DOCTOR', 'STAFF', 'FACILITY_ADMIN', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export single referral dossier as binary PDF' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  async getReferralPdf(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
    @Param('id') id: string,
  ): Promise<StreamableFile> {
    const buffer = await this.referralService.getReferralPdf(id, req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="careid-referral-${id.slice(0, 8)}.pdf"`);
    res.setHeader('Content-Length', buffer.length.toString());
    return new StreamableFile(buffer);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get referral details by ID' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  @SwaggerResponse({ status: 200, type: ReferralResponseDto })
  async getReferralById(@Req() req: any, @Param('id') id: string): Promise<ReferralResponseDto> {
    return this.referralService.getReferralById(id, req.user);
  }

  @Put(':id')
  @Roles('DOCTOR', 'STAFF', 'FACILITY_ADMIN', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update referral clinical details' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  @SwaggerResponse({ status: 200, type: ReferralResponseDto })
  async updateReferral(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateReferralDto,
  ): Promise<ReferralResponseDto> {
    return this.referralService.updateReferral(id, req.user, dto);
  }

  @Put(':id/triage')
  @Roles('DOCTOR', 'STAFF', 'FACILITY_ADMIN', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Triage patient referral (Approve/Decline/Redirect)' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  @SwaggerResponse({ status: 200, type: ReferralResponseDto })
  async triageReferral(@Req() req: any, @Param('id') id: string, @Body() dto: TriageReferralDto): Promise<ReferralResponseDto> {
    return this.referralService.triageReferral(id, req.user, dto);
  }

  @Put(':id/status')
  @Roles('DOCTOR', 'STAFF', 'FACILITY_ADMIN', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update referral status (IN_PROGRESS, COMPLETED, CANCELLED)' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  @SwaggerResponse({ status: 200, type: ReferralResponseDto })
  async updateStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateReferralStatusDto): Promise<ReferralResponseDto> {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    return this.referralService.updateStatus(id, userId, dto);
  }

  @Patch(':id/status')
  @Roles('DOCTOR', 'STAFF', 'FACILITY_ADMIN', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update referral status (alias for PUT :id/status)' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  @SwaggerResponse({ status: 200, type: ReferralResponseDto })
  async patchStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateReferralStatusDto): Promise<ReferralResponseDto> {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    return this.referralService.updateStatus(id, userId, dto);
  }

  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add clinical coordination note to referral' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  @SwaggerResponse({ status: 201, type: ReferralNoteResponseDto })
  async addNote(@Req() req: any, @Param('id') id: string, @Body() dto: AddReferralNoteDto): Promise<ReferralNoteResponseDto> {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    const userRole = req.user?.role || (Array.isArray(req.user?.roles) ? req.user.roles[0] : 'DOCTOR');
    return this.referralService.addNote(id, userId, userRole, dto);
  }

  @Get(':id/notes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List clinical notes for referral' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  @SwaggerResponse({ status: 200, type: [ReferralNoteResponseDto] })
  async getNotes(@Param('id') id: string): Promise<ReferralNoteResponseDto[]> {
    return this.referralService.getNotes(id);
  }

  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Link medical attachment to referral' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  @SwaggerResponse({ status: 201, type: ReferralAttachmentResponseDto })
  async addAttachment(@Req() req: any, @Param('id') id: string, @Body() dto: AddReferralAttachmentDto): Promise<ReferralAttachmentResponseDto> {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    return this.referralService.addAttachment(id, userId, dto);
  }

  @Get(':id/attachments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List linked medical attachments for referral' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  @SwaggerResponse({ status: 200, type: [ReferralAttachmentResponseDto] })
  async getAttachments(@Param('id') id: string): Promise<ReferralAttachmentResponseDto[]> {
    return this.referralService.getAttachments(id);
  }

  @Get(':id/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get immutable status transition history for referral' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  @SwaggerResponse({ status: 200, type: [ReferralStatusHistoryResponseDto] })
  async getHistory(@Param('id') id: string): Promise<ReferralStatusHistoryResponseDto[]> {
    return this.referralService.getHistory(id);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete referral' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  @SwaggerResponse({ status: 200, description: 'Referral soft-deleted' })
  async softDeleteReferral(@Param('id') id: string) {
    return this.referralService.softDeleteReferral(id);
  }
}
