import {
  Controller, Get, Post, Patch, Body, Param, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { PrescriptionService } from './prescription.service';
import {
  CreatePrescriptionDto,
  DiscontinuePrescriptionDto,
  CreateRefillDto,
  CheckDrugInteractionRequestDto,
  CheckDrugInteractionResponseDto,
  PrescriptionResponseDto,
} from './dto/prescription.dto';

@ApiTags('Prescriptions & Drug Interactions (Doctor App)')
@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class PrescriptionController {
  constructor(private readonly service: PrescriptionService) {}

  // ─── Drug Interaction Clinical Screening ──────────────────────────────────

  @Post('prescriptions/check-interactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Screen proposed medications for severe drug-drug interactions, duplicate therapies, and patient allergy conflicts' })
  @SwaggerResponse({ status: 200, type: CheckDrugInteractionResponseDto })
  async checkInteractions(
    @Body() dto: CheckDrugInteractionRequestDto,
  ): Promise<CheckDrugInteractionResponseDto> {
    return this.service.checkInteractions(dto);
  }

  // ─── Doctor Scoped Patient Routes ──────────────────────────────────────────

  @Post('doctors/patients/:patientProfileId/prescriptions')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Write and issue a new prescription for an authorized patient' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile UUID' })
  @SwaggerResponse({ status: 201, type: PrescriptionResponseDto })
  async createPatientPrescription(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
    @Body() dto: CreatePrescriptionDto,
  ): Promise<PrescriptionResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.createForPatient(userId, patientProfileId, dto, roles);
  }

  @Get(['doctors/patients/:patientProfileId/prescriptions', 'patients/:patientProfileId/prescriptions'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List chronological prescriptions issued for a patient' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile UUID' })
  @SwaggerResponse({ status: 200, type: [PrescriptionResponseDto] })
  async getPatientPrescriptions(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
  ): Promise<PrescriptionResponseDto[]> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getPatientPrescriptions(userId, patientProfileId, roles);
  }

  // ─── Direct Prescription Entity Routes ────────────────────────────────────

  @Get('prescriptions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get full prescription details and item dispensation instructions' })
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @SwaggerResponse({ status: 200, type: PrescriptionResponseDto })
  async getPrescriptionById(@Req() req: any, @Param('id') id: string): Promise<PrescriptionResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getById(id, userId, roles);
  }

  @Get(['prescriptions/:id/preview', 'prescriptions/:id/export'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate formatted prescription preview for PDF/print generation' })
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @SwaggerResponse({ status: 200, description: 'Formatted printable prescription preview payload' })
  async getPrescriptionPreview(@Req() req: any, @Param('id') id: string): Promise<any> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getPreview(id, userId, roles);
  }

  @Patch('prescriptions/:id/discontinue')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Discontinue an active prescription with documented clinical justification' })
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @SwaggerResponse({ status: 200, type: PrescriptionResponseDto })
  async discontinuePrescription(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: DiscontinuePrescriptionDto,
  ): Promise<PrescriptionResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.discontinue(id, dto, userId, roles);
  }

  @Post('prescriptions/:id/refill')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record prescription refill dispensation' })
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @SwaggerResponse({ status: 201, type: PrescriptionResponseDto })
  async addPrescriptionRefill(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateRefillDto,
  ): Promise<PrescriptionResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.addRefill(id, dto, userId, roles);
  }
}

