import {
  Controller, Get, Post, Put, Body, Param, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { LaboratoryService } from './laboratory.service';
import {
  CreateLaboratoryReportDto,
  UpdateLaboratoryReportDto,
  LaboratoryReportResponseDto,
} from './dto/laboratory.dto';

@ApiTags('Laboratory Results (Doctor App)')
@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class LaboratoryController {
  constructor(private readonly service: LaboratoryService) {}

  // ─── Doctor Scoped Patient Routes ──────────────────────────────────────────

  @Post('doctors/patients/:patientProfileId/lab-results')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create structured laboratory report with discrete test items for an authorized patient' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile UUID' })
  @SwaggerResponse({ status: 201, type: LaboratoryReportResponseDto })
  async createPatientLabReport(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
    @Body() dto: CreateLaboratoryReportDto,
  ): Promise<LaboratoryReportResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.createForPatient(userId, patientProfileId, dto, roles);
  }

  @Get(['doctors/patients/:patientProfileId/lab-results', 'patients/:patientProfileId/lab-results'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List chronological structured laboratory reports and test items for a patient' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile UUID' })
  @SwaggerResponse({ status: 200, type: [LaboratoryReportResponseDto] })
  async getPatientLabResults(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
  ): Promise<LaboratoryReportResponseDto[]> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getPatientLabResults(userId, patientProfileId, roles);
  }

  // ─── Direct Laboratory Report Entity Routes ───────────────────────────────

  @Get('lab-results/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get laboratory report details and discrete test item flags by ID' })
  @ApiParam({ name: 'id', description: 'Laboratory Report UUID' })
  @SwaggerResponse({ status: 200, type: LaboratoryReportResponseDto })
  async getLabReportById(@Req() req: any, @Param('id') id: string): Promise<LaboratoryReportResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getById(id, userId, roles);
  }

  @Put('lab-results/:id')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update laboratory report details' })
  @ApiParam({ name: 'id', description: 'Laboratory Report UUID' })
  @SwaggerResponse({ status: 200, type: LaboratoryReportResponseDto })
  async updateLabReport(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateLaboratoryReportDto,
  ): Promise<LaboratoryReportResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.update(id, dto, userId, roles);
  }
}

