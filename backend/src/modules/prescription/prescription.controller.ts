import {
  Controller, Get, Post, Patch, Query, Body, Param, UseGuards, Req, HttpCode, HttpStatus,
  Optional, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { PrescriptionService } from './prescription.service';
import { PrescriptionReminderService } from './prescription-reminder.service';
import { PrescriptionReminderScheduler } from './prescription-reminder.scheduler';
import {
  CreatePrescriptionDto,
  CheckDrugInteractionRequestDto,
  CheckDrugInteractionResponseDto,
  PrescriptionResponseDto,
} from './dto/prescription.dto';

@ApiTags('Prescriptions & Drug Interactions (Doctor App)')
@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class PrescriptionController {
  constructor(
    private readonly service: PrescriptionService,
    @Optional() private readonly reminderService?: PrescriptionReminderService,
    @Optional() private readonly scheduler?: PrescriptionReminderScheduler,
  ) {}

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

  @Get('prescriptions')
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF', 'DOCTOR', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all prescriptions across clinical network (Staff / Admin oversight)' })
  @SwaggerResponse({ status: 200, type: [PrescriptionResponseDto] })
  async getAllPrescriptions(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ): Promise<PrescriptionResponseDto[]> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getAllPrescriptions(userId, roles, { status, limit, page });
  }

  @Patch(['prescriptions/:id/collect', 'doctors/patients/:patientProfileId/prescriptions/:id/collect'])
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF', 'DOCTOR', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark prescription medication as collected by patient (CR-08 pickup reminder termination)' })
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @SwaggerResponse({ status: 200, type: PrescriptionResponseDto, description: 'Prescription marked collected' })
  async markCollected(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<PrescriptionResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.markCollected(id, userId, roles);
  }

  @Patch('prescriptions/:id/reminder')
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF', 'DOCTOR', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update prescription pickup reminder configuration (enabled state and interval hours)' })
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @SwaggerResponse({ status: 200, type: PrescriptionResponseDto })
  async updateReminderSettings(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { enabled?: boolean; hours?: number },
  ): Promise<PrescriptionResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.updateReminderSettings(id, dto.enabled, dto.hours, userId, roles);
  }

  // ─── Direct Prescription Entity Routes ────────────────────────────────────
  // Note: Canonical prescription lifecycle endpoints (:id, :id/refill, :id/discontinue, :id/export)
  // are authoritatively provided by DoctorModule PrescriptionController with full clinical
  // authorization, RBAC, StreamableFile PDF generation, and audit logging.

  @Get('prescriptions/:id/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate formatted prescription preview for PDF/print generation' })
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @SwaggerResponse({ status: 200, description: 'Formatted printable prescription preview payload' })
  async getPrescriptionPreview(@Req() req: any, @Param('id') id: string): Promise<any> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getPreview(id, userId, roles);
  }

  // ─── Deterministic Sandbox Test-Clock Trigger (CR-08 LifeCycle QA) ───────
  @Post('prescriptions/test-cycle/trigger')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger a deterministic test reminder evaluation cycle (Sandbox/Testing Only)' })
  async triggerTestReminderCycle(
    @Body() dto: { asOfDate?: string; scheduleId?: string },
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Deterministic test time evaluation is disabled in production runtime');
    }
    const asOf = dto?.asOfDate ? new Date(dto.asOfDate) : new Date();
    if (dto?.scheduleId && this.reminderService) {
      const singleResult = await this.reminderService.processDueSchedule(dto.scheduleId, asOf);
      return { success: true, mode: 'single_schedule', result: singleResult };
    }
    if (this.scheduler) {
      const batchResult = await this.scheduler.triggerProcessingCycle(asOf);
      return { success: true, mode: 'scheduler_cycle', result: batchResult };
    }
    return { success: false, message: 'Scheduler not initialized' };
  }
}

