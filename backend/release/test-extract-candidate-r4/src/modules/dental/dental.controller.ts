import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { DentalService } from './dental.service';
import { CreateDentalRecordDto, UpdateDentalRecordDto, DentalRecordResponseDto } from './dto/dental.dto';

@ApiTags('Dental Records (Doctor App)')
@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class DentalController {
  constructor(private readonly service: DentalService) {}

  // ─── Doctor Scoped Patient Routes ──────────────────────────────────────────

  @Post('doctors/patients/:patientProfileId/dental-records')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new dental record for an authorized patient' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile UUID' })
  @SwaggerResponse({ status: 201, type: DentalRecordResponseDto })
  async createPatientDentalRecord(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
    @Body() dto: CreateDentalRecordDto,
  ): Promise<DentalRecordResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.createForPatient(userId, patientProfileId, dto, roles);
  }

  @Get(['doctors/patients/:patientProfileId/dental-records', 'patients/:patientProfileId/dental-records'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List chronological dental records for an authorized patient' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile UUID' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @SwaggerResponse({ status: 200, type: [DentalRecordResponseDto] })
  async getPatientDentalRecords(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
    @Query('includeArchived') includeArchived?: boolean,
  ): Promise<DentalRecordResponseDto[]> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getPatientDentalRecords(userId, patientProfileId, roles, Boolean(includeArchived));
  }

  // ─── Direct Dental Record Entity Routes ────────────────────────────────────

  @Get('dental-records/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get dental record details by ID' })
  @ApiParam({ name: 'id', description: 'Dental Record UUID' })
  @SwaggerResponse({ status: 200, type: DentalRecordResponseDto })
  async getDentalRecordById(@Req() req: any, @Param('id') id: string): Promise<DentalRecordResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getById(id, userId, roles);
  }

  @Put('dental-records/:id')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update dental record fields' })
  @ApiParam({ name: 'id', description: 'Dental Record UUID' })
  @SwaggerResponse({ status: 200, type: DentalRecordResponseDto })
  async updateDentalRecord(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDentalRecordDto,
  ): Promise<DentalRecordResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.update(id, dto, userId, roles);
  }

  @Post('dental-records/:id/archive')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a dental record' })
  @ApiParam({ name: 'id', description: 'Dental Record UUID' })
  @SwaggerResponse({ status: 200, type: DentalRecordResponseDto })
  async archiveDentalRecord(@Req() req: any, @Param('id') id: string): Promise<DentalRecordResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.setArchiveStatus(id, true, userId, roles);
  }

  @Post('dental-records/:id/restore')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore an archived dental record' })
  @ApiParam({ name: 'id', description: 'Dental Record UUID' })
  @SwaggerResponse({ status: 200, type: DentalRecordResponseDto })
  async restoreDentalRecord(@Req() req: any, @Param('id') id: string): Promise<DentalRecordResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.setArchiveStatus(id, false, userId, roles);
  }
}

