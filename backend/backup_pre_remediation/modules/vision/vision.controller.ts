import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { VisionService } from './vision.service';
import { CreateVisionRecordDto, UpdateVisionRecordDto, VisionRecordResponseDto } from './dto/vision.dto';

@ApiTags('Vision Records (Doctor App)')
@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class VisionController {
  constructor(private readonly service: VisionService) {}

  // ─── Doctor Scoped Patient Routes ──────────────────────────────────────────

  @Post('doctors/patients/:patientProfileId/vision-records')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new vision examination record for an authorized patient' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile UUID' })
  @SwaggerResponse({ status: 201, type: VisionRecordResponseDto })
  async createPatientVisionRecord(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
    @Body() dto: CreateVisionRecordDto,
  ): Promise<VisionRecordResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.createForPatient(userId, patientProfileId, dto, roles);
  }

  @Get(['doctors/patients/:patientProfileId/vision-records', 'patients/:patientProfileId/vision-records'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List chronological vision records for an authorized patient' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile UUID' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @SwaggerResponse({ status: 200, type: [VisionRecordResponseDto] })
  async getPatientVisionRecords(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
    @Query('includeArchived') includeArchived?: boolean,
  ): Promise<VisionRecordResponseDto[]> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getPatientVisionRecords(userId, patientProfileId, roles, Boolean(includeArchived));
  }

  // ─── Direct Vision Record Entity Routes ────────────────────────────────────

  @Get('vision-records/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get vision record details by ID' })
  @ApiParam({ name: 'id', description: 'Vision Record UUID' })
  @SwaggerResponse({ status: 200, type: VisionRecordResponseDto })
  async getVisionRecordById(@Req() req: any, @Param('id') id: string): Promise<VisionRecordResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getById(id, userId, roles);
  }

  @Put('vision-records/:id')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update vision record fields' })
  @ApiParam({ name: 'id', description: 'Vision Record UUID' })
  @SwaggerResponse({ status: 200, type: VisionRecordResponseDto })
  async updateVisionRecord(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateVisionRecordDto,
  ): Promise<VisionRecordResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.update(id, dto, userId, roles);
  }

  @Post('vision-records/:id/archive')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a vision record' })
  @ApiParam({ name: 'id', description: 'Vision Record UUID' })
  @SwaggerResponse({ status: 200, type: VisionRecordResponseDto })
  async archiveVisionRecord(@Req() req: any, @Param('id') id: string): Promise<VisionRecordResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.setArchiveStatus(id, true, userId, roles);
  }

  @Post('vision-records/:id/restore')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore an archived vision record' })
  @ApiParam({ name: 'id', description: 'Vision Record UUID' })
  @SwaggerResponse({ status: 200, type: VisionRecordResponseDto })
  async restoreVisionRecord(@Req() req: any, @Param('id') id: string): Promise<VisionRecordResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.setArchiveStatus(id, false, userId, roles);
  }
}

