import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { AppointmentService } from '../../application/use-cases/appointment.service';
import {
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  UpdateAppointmentStatusDto,
  AppointmentQueryDto,
  AppointmentResponseDto,
  CreateSlotHoldDto,
  SlotHoldResponseDto,
  UpdateReadinessDto,
  AppointmentCheckInDto,
  UpdateCathLabChecklistDto,
} from '../dto/appointment.dto';
import { PaginatedResponseDto } from '@common/dto/pagination.dto';

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Book a new appointment' })
  @SwaggerResponse({ status: 201, type: AppointmentResponseDto })
  async bookAppointment(@Req() req: any, @Body() dto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    return this.appointmentService.bookAppointment(req.user.userId, req.user.roles || [], dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List appointments with filtering and pagination' })
  @SwaggerResponse({ status: 200, type: PaginatedResponseDto })
  async getAppointments(
    @Req() req: any,
    @Query() query: AppointmentQueryDto,
  ): Promise<PaginatedResponseDto<AppointmentResponseDto>> {
    return this.appointmentService.getAppointments(req.user.userId, req.user.roles || [], query);
  }

  @Get(['doctor/my-appointments', 'doctor/me'])
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get appointments scheduled for authenticated doctor' })
  @SwaggerResponse({ status: 200, type: PaginatedResponseDto })
  async getDoctorAppointments(
    @Req() req: any,
    @Query() query: AppointmentQueryDto,
  ): Promise<PaginatedResponseDto<AppointmentResponseDto>> {
    return this.appointmentService.getMyAppointmentsForDoctor(req.user.userId, query);
  }

  @Get(['patient/my-appointments', 'patient/me'])
  @Roles('PATIENT', 'USER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get appointments scheduled for authenticated patient' })
  @SwaggerResponse({ status: 200, type: PaginatedResponseDto })
  async getPatientAppointments(
    @Req() req: any,
    @Query() query: AppointmentQueryDto,
  ): Promise<PaginatedResponseDto<AppointmentResponseDto>> {
    return this.appointmentService.getMyAppointmentsForPatient(req.user.userId, query);
  }

  @Get('policies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get appointment booking, cancellation and rescheduling policies' })
  async getAppointmentPolicy(@Query('facilityId') facilityId?: string) {
    return this.appointmentService.getAppointmentPolicy(facilityId);
  }

  @Put('policies')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Configure appointment booking and cancellation policies (Admin)' })
  async updateAppointmentPolicy(@Body() dto: any) {
    return this.appointmentService.updateAppointmentPolicy(dto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get appointment details by ID' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @SwaggerResponse({ status: 200, type: AppointmentResponseDto })
  async getAppointmentById(@Req() req: any, @Param('id') id: string): Promise<AppointmentResponseDto> {
    return this.appointmentService.getAppointmentById(req.user.userId, req.user.roles || [], id);
  }

  @Put(':id/reschedule')
  @Patch(':id/reschedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reschedule an existing appointment' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @SwaggerResponse({ status: 200, type: AppointmentResponseDto })
  async rescheduleAppointment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.rescheduleAppointment(req.user.userId, req.user.roles || [], id, dto);
  }

  @Put(':id/cancel')
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an appointment' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @SwaggerResponse({ status: 200, type: AppointmentResponseDto })
  async cancelAppointment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.cancelAppointment(req.user.userId, req.user.roles || [], id, dto);
  }

  @Put(':id/status')
  @Patch(':id/status')
  @Roles('DOCTOR', 'STAFF', 'FACILITY_ADMIN', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update appointment status (clinical & operational staff)' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @SwaggerResponse({ status: 200, type: AppointmentResponseDto })
  async updateAppointmentStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.updateAppointmentStatus(req.user.userId, req.user.roles || [], id, dto);
  }

  // ─── Stage 11: Procedure Suite Temporary Slot Hold ───────────────────────────

  @Post('holds')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place a temporary hold on a procedure suite slot (Stage 11)' })
  @SwaggerResponse({ status: 201, type: SlotHoldResponseDto })
  async holdSlot(
    @Req() req: any,
    @Body() dto: CreateSlotHoldDto,
  ): Promise<SlotHoldResponseDto> {
    return this.appointmentService.holdSlot(req.user.userId, req.user.roles || [], dto);
  }

  @Get('holds/:id')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inspect temporary procedure slot hold status (Stage 11)' })
  @ApiParam({ name: 'id', description: 'Hold UUID' })
  @SwaggerResponse({ status: 200, type: SlotHoldResponseDto })
  async getHold(@Param('id') id: string): Promise<SlotHoldResponseDto> {
    return this.appointmentService.getHold(id);
  }

  @Delete('holds/:id')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release temporary procedure suite slot hold early (Stage 11)' })
  @ApiParam({ name: 'id', description: 'Hold UUID' })
  @SwaggerResponse({ status: 200, description: 'Hold released successfully' })
  async releaseHold(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const roles = req.user.roles || (req.user.role ? [req.user.role] : []);
    return this.appointmentService.releaseHold(req.user.userId, id, roles);
  }

  // ─── Stage 14: Pre-Op Day -1 Readiness Checklist & Decision ──────────────────

  @Get(':id/readiness')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get pre-op Day -1 readiness checklist and decision (Stage 14)' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @SwaggerResponse({ status: 200, description: 'Readiness checklist and clinical decision' })
  async getReadiness(@Param('id') id: string) {
    return this.appointmentService.getReadiness(id);
  }

  @Patch(':id/readiness')
  @Put(':id/readiness')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update pre-op Day -1 readiness checklist & clinical decision (Stage 14)' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @SwaggerResponse({ status: 200, description: 'Updated readiness checklist' })
  async updateReadiness(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateReadinessDto,
  ) {
    return this.appointmentService.updateReadiness(req.user.userId, id, dto);
  }

  // ─── Stage 15: Day of Procedure Patient Check-In ─────────────────────────────

  @Post(':id/check-in')
  @Roles('STAFF', 'FACILITY_ADMIN', 'NURSE', 'ADMIN', 'SUPER_ADMIN', 'DOCTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Day-of-procedure patient intake check-in (Stage 15)' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @SwaggerResponse({ status: 200, description: 'Check-in confirmed and appointment marked in progress' })
  async checkIn(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AppointmentCheckInDto,
  ) {
    return this.appointmentService.checkIn(req.user.userId, id, dto);
  }

  @Get(':id/check-in')
  @Roles('STAFF', 'FACILITY_ADMIN', 'NURSE', 'ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get procedure day patient check-in record and vitals' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @SwaggerResponse({ status: 200, description: 'Check-in record with bed assignment and intake vitals' })
  async getCheckInRecord(@Req() req: any, @Param('id') id: string) {
    const roles = req.user.roles || (req.user.role ? [req.user.role] : []);
    return this.appointmentService.getCheckInRecord(req.user.userId, roles, id);
  }

  // ─── Stage 16: Cath Lab / Intra-Op Safety Checklist ──────────────────────────

  @Get(':id/cath-lab-checklist')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Cath Lab / Intra-Op WHO Surgical Safety Checklist (Stage 16)' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @SwaggerResponse({ status: 200, description: 'Safety checklist status' })
  async getCathLabChecklist(@Param('id') id: string) {
    return this.appointmentService.getCathLabChecklist(id);
  }

  @Post(':id/cath-lab-checklist')
  @Put(':id/cath-lab-checklist')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update Cath Lab / Intra-Op WHO Surgical Safety Checklist (Stage 16)' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @SwaggerResponse({ status: 200, description: 'Updated safety checklist' })
  async updateCathLabChecklist(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCathLabChecklistDto,
  ) {
    return this.appointmentService.updateCathLabChecklist(req.user.userId, id, dto);
  }
}
