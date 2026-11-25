import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { CathLabService } from './cath-lab.service';
import {
  SubmitSafetyTimeoutDto,
  DeclareSafetyHoldDto,
  ClearSafetyHoldDto,
  LogTelemetryDto,
  CreateVesselFindingsDto,
  RegisterDicomSeriesDto,
} from './cath-lab.dto';

@ApiTags('Cath Lab & Interventional Cardiology')
@Controller('cath-lab')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class CathLabController {
  constructor(private readonly service: CathLabService) {}

  // ─── 1. Surgical Safety Time-Out (Stage 16) ─────────────────────────────────

  @Post('safety-timeout')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ratify 6-gate Cath Lab Surgical Safety Time-Out before vascular access (Stage 16)' })
  @SwaggerResponse({ status: 201, description: 'Safety time-out ratified with SHA-256 integrity hash' })
  async submitSafetyTimeout(@Req() req: any, @Body() dto: SubmitSafetyTimeoutDto) {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.submitSafetyTimeout(userId, roles, dto);
  }

  @Get('safety-timeout/:appointmentId')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN', 'PATIENT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve ratified Cath Lab Surgical Safety Time-Out record (Stage 16)' })
  @ApiParam({ name: 'appointmentId', description: 'Appointment UUID' })
  @SwaggerResponse({ status: 200, description: 'Ratified safety time-out record' })
  async getSafetyTimeout(@Param('appointmentId') appointmentId: string) {
    return this.service.getSafetyTimeout(appointmentId);
  }

  // ─── 2. Emergency Safety Hold (Stage 16–17) ─────────────────────────────────

  @Post('safety-hold')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Declare an emergency procedural safety hold (Stage 16–17)' })
  @SwaggerResponse({ status: 201, description: 'Safety hold declared' })
  async declareSafetyHold(@Req() req: any, @Body() dto: DeclareSafetyHoldDto) {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.declareSafetyHold(userId, roles, dto);
  }

  @Post('safety-hold/:holdId/clear')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve an emergency procedural safety hold with clinical sign-off (Stage 16–17)' })
  @ApiParam({ name: 'holdId', description: 'Safety Hold UUID' })
  @SwaggerResponse({ status: 200, description: 'Safety hold cleared and resolution duration recorded' })
  async clearSafetyHold(
    @Req() req: any,
    @Param('holdId') holdId: string,
    @Body() dto: ClearSafetyHoldDto,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.service.clearSafetyHold(userId, holdId, dto);
  }

  @Get('safety-hold/active')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Query active unresolved emergency safety hold for appointment (Stage 16–17)' })
  @ApiQuery({ name: 'appointmentId', description: 'Appointment UUID', required: true })
  @SwaggerResponse({ status: 200, description: 'Active safety hold status' })
  async getActiveSafetyHold(@Query('appointmentId') appointmentId: string) {
    return this.service.getActiveSafetyHold(appointmentId);
  }

  @Get('safety-hold/history')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN', 'PATIENT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Query structured procedural safety hold history (Stage 16–17)' })
  @ApiQuery({ name: 'appointmentId', description: 'Appointment UUID', required: false })
  @ApiQuery({ name: 'treatmentOfferId', description: 'Treatment Offer UUID', required: false })
  @SwaggerResponse({ status: 200, description: 'Safety hold history' })
  async getSafetyHoldHistory(
    @Query('appointmentId') appointmentId?: string,
    @Query('treatmentOfferId') treatmentOfferId?: string,
  ) {
    return this.service.getSafetyHoldHistory(appointmentId, treatmentOfferId);
  }

  // ─── 3. Telemetry & Fluoroscopy (Stage 17–18) ───────────────────────────────

  @Post('telemetry/log')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log fluoroscopy radiation and hemodynamic telemetry observation (Stage 17–18)' })
  @SwaggerResponse({ status: 201, description: 'Telemetry observation logged' })
  async logTelemetry(@Req() req: any, @Body() dto: LogTelemetryDto) {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.logTelemetry(userId, roles, dto);
  }

  @Get('telemetry/live')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current procedure cumulative telemetry and latest vitals (Stage 17–18)' })
  @ApiQuery({ name: 'appointmentId', description: 'Appointment UUID', required: true })
  @SwaggerResponse({ status: 200, description: 'Cumulative fluoroscopy, contrast, and vitals summary' })
  async getLiveTelemetry(@Query('appointmentId') appointmentId: string) {
    return this.service.getLiveTelemetry(appointmentId);
  }

  // ─── 4. Coronary Vessel Findings / QCA (Stage 18) ───────────────────────────

  @Post('encounters/:encounterId/vessel-findings')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Document coronary arterial lesion findings and QCA metrics (Stage 18)' })
  @ApiParam({ name: 'encounterId', description: 'Encounter or Medical Record UUID' })
  @SwaggerResponse({ status: 201, description: 'Coronary vessel findings documented' })
  async createVesselFindings(
    @Req() req: any,
    @Param('encounterId') encounterId: string,
    @Body() dto: CreateVesselFindingsDto,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.service.createVesselFindings(userId, encounterId, dto);
  }

  @Get('encounters/:encounterId/vessel-findings')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve coronary vessel findings and dominance for encounter (Stage 18)' })
  @ApiParam({ name: 'encounterId', description: 'Encounter or Medical Record UUID' })
  @SwaggerResponse({ status: 200, description: 'Coronary vessel findings record' })
  async getVesselFindings(@Param('encounterId') encounterId: string) {
    return this.service.getVesselFindings(encounterId);
  }

  // ─── 5. DICOM / PACS (Stage 18) ─────────────────────────────────────────────

  @Post('encounters/:encounterId/dicom-series')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register DICOM XA angiography study & series metadata (Stage 18)' })
  @ApiParam({ name: 'encounterId', description: 'Encounter or Medical Record UUID' })
  @SwaggerResponse({ status: 201, description: 'DICOM series registered' })
  async registerDicomSeries(
    @Req() req: any,
    @Param('encounterId') encounterId: string,
    @Body() dto: RegisterDicomSeriesDto,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.service.registerDicomSeries(userId, encounterId, dto);
  }

  @Get('encounters/:encounterId/dicom-series')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List registered DICOM angiography series for encounter (Stage 18)' })
  @ApiParam({ name: 'encounterId', description: 'Encounter or Medical Record UUID' })
  @SwaggerResponse({ status: 200, description: 'List of registered DICOM series' })
  async getDicomSeries(@Param('encounterId') encounterId: string) {
    return this.service.getDicomSeries(encounterId);
  }

  @Get('dicom-series/:seriesId/frames/:frameNumber')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve DICOM cine keyframe (Stage 18)' })
  @ApiParam({ name: 'seriesId', description: 'DICOM Series UUID' })
  @ApiParam({ name: 'frameNumber', description: 'Frame number (1-based)' })
  @SwaggerResponse({ status: 200, description: 'Frame locator or external dependency status' })
  async getDicomFrame(
    @Param('seriesId') seriesId: string,
    @Param('frameNumber') frameNumber: number,
  ) {
    return this.service.getDicomFrame(seriesId, frameNumber);
  }
}

