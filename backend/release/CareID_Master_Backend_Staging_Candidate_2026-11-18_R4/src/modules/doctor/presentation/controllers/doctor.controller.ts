import {
  Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards, Req, Res, StreamableFile, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { DoctorService } from '../../application/use-cases/doctor.service';
import {
  RegisterDoctorDto, AddQualificationDto, AddCertificationDto, AddExperienceDto,
  AttachDoctorDocumentDto, DoctorActionDto, RenewLicenseDto,
} from '../dto/register-doctor.dto';
import {
  DoctorProfileFullResponseDto, DoctorDocumentResponseDto, DoctorHistoryItemDto, DoctorStatsResponseDto,
} from '../dto/doctor-response.dto';
import { DoctorProfileResponseDto, ScheduleSlotResponseDto } from '../dto/doctor-profile.dto';
import { DoctorPatientRecordsQueryDto } from '../dto/doctor-patient-records.dto';
import {
  DoctorPatientsQueryDto,
  DoctorPatientSummaryDto,
  DoctorPatientDetailDto,
  CreateDoctorPrescriptionDto,
  DoctorPrescriptionResponseDto,
  CreateDoctorVitalsDto,
  DoctorVitalSignsResponseDto,
  CreateHospitalAdmissionDto,
  HospitalAdmissionResponseDto,
} from '../dto/doctor-patient-management.dto';
import {
  DoctorRegisterPatientDto,
  DoctorRegisterPatientResponseDto,
} from '../dto/doctor-register-patient.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '@common/dto/pagination.dto';
import {
  MedicalRecordResponseDto,
  MedicalTimelineItemDto,
} from '@modules/medical-record/presentation/dto/medical-record-response.dto';
import {
  CreateMedicalRecordDto,
  UpdateMedicalRecordDto,
} from '@modules/medical-record/presentation/dto/create-medical-record.dto';

@ApiTags('Doctors')
@Controller('doctors')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register/Create a doctor profile in Master Registry' })
  @SwaggerResponse({ status: 201, type: DoctorProfileFullResponseDto })
  async registerDoctor(@Req() req: any, @Body() dto: RegisterDoctorDto): Promise<DoctorProfileFullResponseDto> {
    return this.doctorService.registerDoctor(req.user.userId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all registered doctor profiles in Master Registry with optional specialty and search filter' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max: 100, default: 50)' })
  @ApiQuery({ name: 'specialty', required: false, type: String, description: 'Filter by doctor specialization (e.g., Dentist, Cardiology)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search doctor name or license' })
  @SwaggerResponse({ status: 200, type: [DoctorProfileFullResponseDto] })
  async getDoctors(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('specialty') specialty?: string,
    @Query('search') search?: string,
  ): Promise<DoctorProfileFullResponseDto[]> {
    return this.doctorService.getDoctors(
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
      specialty,
      search,
    );
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enterprise doctor search (by name, registration, license, dept, specialization)' })
  @ApiQuery({ name: 'q', required: true })
  @SwaggerResponse({ status: 200, type: [DoctorProfileFullResponseDto] })
  async searchDoctors(@Query('q') query: string): Promise<DoctorProfileFullResponseDto[]> {
    return this.doctorService.searchDoctors(query);
  }

  @Get('statistics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get platform-wide doctor directory statistics' })
  @SwaggerResponse({ status: 200, type: DoctorStatsResponseDto })
  async getStatistics(): Promise<DoctorStatsResponseDto> {
    return this.doctorService.getStatistics();
  }

  @Get('verification/pending')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List doctor profiles pending admin verification' })
  @SwaggerResponse({ status: 200, type: [DoctorProfileFullResponseDto] })
  async getPendingDoctors(): Promise<DoctorProfileFullResponseDto[]> {
    return this.doctorService.getPendingDoctors();
  }

  @Get('me')
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current authenticated doctor profile' })
  @SwaggerResponse({ status: 200, type: DoctorProfileFullResponseDto })
  async getMyProfile(@Req() req: any): Promise<DoctorProfileFullResponseDto> {
    return this.doctorService.getMyProfile(req.user.userId);
  }

  @Post(['patients', 'patients/register'])
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Doctor-initiated direct patient registration and clinical onboarding' })
  @SwaggerResponse({ status: 201, type: DoctorRegisterPatientResponseDto })
  @SwaggerResponse({ status: 400, description: 'Bad Request - Validation failure or malformed payload' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Doctor authorization active status required' })
  async registerPatient(
    @Req() req: any,
    @Body() dto: DoctorRegisterPatientDto,
  ): Promise<DoctorRegisterPatientResponseDto> {
    const callerUserId = req.user?.id || req.user?.userId;
    return this.doctorService.registerPatientByDoctor(callerUserId, dto, req.ip);
  }

  @Get('patients')
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List patients the authenticated doctor is authorized to treat' })
  @SwaggerResponse({ status: 200, type: PaginatedResponseDto })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Doctor role required' })
  async getPatients(
    @Req() req: any,
    @Query() query: DoctorPatientsQueryDto,
  ): Promise<PaginatedResponseDto<DoctorPatientSummaryDto>> {
    return this.doctorService.getAuthorizedPatients(req.user.userId, query, req.ip);
  }

  @Get('patients/:patientProfileId/medical-records/timeline')
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get authorized patient medical record timeline' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile ID' })
  @SwaggerResponse({ status: 200, type: PaginatedResponseDto })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Doctor authorization required' })
  @SwaggerResponse({ status: 404, description: 'Patient or Doctor profile not found' })
  async getPatientTimeline(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<MedicalTimelineItemDto>> {
    return this.doctorService.getPatientTimeline(req.user.userId, patientProfileId, query, req.ip);
  }

  @Get('patients/:patientProfileId/medical-records/export')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export complete unified clinical medical record for authorized patient (JSON or PDF)' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile UUID' })
  @ApiQuery({ name: 'format', required: false, enum: ['JSON', 'PDF'], description: 'Export format: JSON (default) or PDF binary stream' })
  @SwaggerResponse({ status: 200, description: 'Unified clinical record exported successfully' })
  @SwaggerResponse({ status: 400, description: 'Bad Request - Invalid UUID' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Doctor authorization required' })
  @SwaggerResponse({ status: 404, description: 'Patient or Doctor profile not found' })
  async exportPatientMedicalRecords(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
    @Param('patientProfileId') patientProfileId: string,
    @Query('format') format?: string,
  ): Promise<any> {
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    const reqFormat = format || (req.headers?.accept?.includes('application/pdf') ? 'PDF' : 'JSON');
    const result = await this.doctorService.exportPatientMedicalRecords(
      req.user.userId,
      patientProfileId,
      reqFormat,
      roles,
      req.ip,
    );

    if (result.format === 'PDF' && result.buffer) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="careid-clinical-record-${patientProfileId.substring(0, 8).toUpperCase()}.pdf"`,
      );
      res.setHeader('Content-Length', result.buffer.length.toString());
      return new StreamableFile(result.buffer);
    }

    return result.data;
  }

  @Get('patients/:patientProfileId/medical-records')
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get authorized patient medical records with pagination' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile ID' })
  @SwaggerResponse({ status: 200, type: PaginatedResponseDto })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Doctor authorization required' })
  @SwaggerResponse({ status: 404, description: 'Patient or Doctor profile not found' })
  async getPatientMedicalRecords(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
    @Query() query: DoctorPatientRecordsQueryDto,
  ): Promise<PaginatedResponseDto<MedicalRecordResponseDto>> {
    return this.doctorService.getPatientMedicalRecords(req.user.userId, patientProfileId, query, req.ip);
  }

  @Post('patients/:patientProfileId/encounters')
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Document clinical encounter, diagnoses, vitals, procedures for an authorized patient' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile ID' })
  @SwaggerResponse({ status: 201, type: MedicalRecordResponseDto })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Doctor authorization required' })
  @SwaggerResponse({ status: 404, description: 'Patient or Doctor profile not found' })
  async createPatientEncounter(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
    @Body() dto: CreateMedicalRecordDto,
  ): Promise<MedicalRecordResponseDto> {
    return this.doctorService.createPatientEncounter(req.user.userId, patientProfileId, dto, req.ip);
  }

  @Post('patients/:patientProfileId/medical-records')
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create medical record for an authorized patient' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile ID' })
  @SwaggerResponse({ status: 201, type: MedicalRecordResponseDto })
  async createPatientMedicalRecord(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
    @Body() dto: CreateMedicalRecordDto,
  ): Promise<MedicalRecordResponseDto> {
    return this.doctorService.createPatientEncounter(req.user.userId, patientProfileId, dto, req.ip);
  }

  @Put('patients/:patientProfileId/medical-records/:recordId')
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update clinical notes/record documented by doctor' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile ID' })
  @ApiParam({ name: 'recordId', description: 'Medical Record ID' })
  @SwaggerResponse({ status: 200, type: MedicalRecordResponseDto })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Authorship required' })
  @SwaggerResponse({ status: 404, description: 'Record not found' })
  async updatePatientMedicalRecord(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
    @Param('recordId') recordId: string,
    @Body() dto: UpdateMedicalRecordDto,
  ): Promise<MedicalRecordResponseDto> {
    return this.doctorService.updatePatientMedicalRecord(req.user.userId, patientProfileId, recordId, dto, req.ip);
  }

  @Get('patients/:patientProfileId/prescriptions')
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List prescriptions for an authorized patient' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile ID' })
  @SwaggerResponse({ status: 200, type: PaginatedResponseDto })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Doctor authorization required' })
  @SwaggerResponse({ status: 404, description: 'Patient or Doctor profile not found' })
  async getPatientPrescriptions(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<DoctorPrescriptionResponseDto>> {
    return this.doctorService.getPatientPrescriptions(req.user.userId, patientProfileId, query, req.ip);
  }

  @Post('patients/:patientProfileId/prescriptions')
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new prescription for an authorized patient' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile ID' })
  @SwaggerResponse({ status: 201, type: DoctorPrescriptionResponseDto })
  @SwaggerResponse({ status: 400, description: 'Bad Request - Validation failure' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Doctor authorization required' })
  @SwaggerResponse({ status: 404, description: 'Patient or Doctor profile not found' })
  async createPatientPrescription(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
    @Body() dto: CreateDoctorPrescriptionDto,
  ): Promise<DoctorPrescriptionResponseDto> {
    return this.doctorService.createPatientPrescription(req.user.userId, patientProfileId, dto, req.ip);
  }

  @Get('patients/:patientProfileId/vitals')
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List vital signs records for an authorized patient' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile ID' })
  @SwaggerResponse({ status: 200, type: PaginatedResponseDto })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Doctor authorization required' })
  @SwaggerResponse({ status: 404, description: 'Patient or Doctor profile not found' })
  async getPatientVitals(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<DoctorVitalSignsResponseDto>> {
    return this.doctorService.getPatientVitals(req.user.userId, patientProfileId, query, req.ip);
  }

  @Post('patients/:patientProfileId/vitals')
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record vital signs for an authorized patient' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile ID' })
  @SwaggerResponse({ status: 201, type: DoctorVitalSignsResponseDto })
  @SwaggerResponse({ status: 400, description: 'Bad Request - Validation failure' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Doctor authorization required' })
  @SwaggerResponse({ status: 404, description: 'Patient or Doctor profile not found' })
  async createPatientVitals(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
    @Body() dto: CreateDoctorVitalsDto,
  ): Promise<DoctorVitalSignsResponseDto> {
    return this.doctorService.createPatientVitals(req.user.userId, patientProfileId, dto, req.ip);
  }

  @Get('patients/:patientProfileId/admissions')
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List hospital admission records for an authorized patient' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile ID' })
  @SwaggerResponse({ status: 200, type: PaginatedResponseDto })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Doctor authorization required' })
  @SwaggerResponse({ status: 404, description: 'Patient or Doctor profile not found' })
  async getPatientAdmissions(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<HospitalAdmissionResponseDto>> {
    return this.doctorService.getPatientAdmissions(req.user.userId, patientProfileId, query, req.ip);
  }

  @Post('patients/:patientProfileId/admissions')
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a hospital admission for an authorized patient' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile ID' })
  @SwaggerResponse({ status: 201, type: HospitalAdmissionResponseDto })
  @SwaggerResponse({ status: 400, description: 'Bad Request - Validation failure' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Doctor authorization required' })
  @SwaggerResponse({ status: 404, description: 'Patient or Doctor profile not found' })
  async createPatientAdmission(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
    @Body() dto: CreateHospitalAdmissionDto,
  ): Promise<HospitalAdmissionResponseDto> {
    return this.doctorService.createPatientAdmission(req.user.userId, patientProfileId, dto, req.ip);
  }

  @Get('patients/:patientProfileId')
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get complete demographic information for an authorized patient' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile ID' })
  @SwaggerResponse({ status: 200, type: DoctorPatientDetailDto })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Doctor authorization required' })
  @SwaggerResponse({ status: 404, description: 'Patient or Doctor profile not found' })
  async getPatientProfile(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
  ): Promise<DoctorPatientDetailDto> {
    return this.doctorService.getPatientProfile(req.user.userId, patientProfileId, req.ip);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get complete doctor profile details' })
  @ApiParam({ name: 'id', description: 'Doctor Profile ID' })
  @SwaggerResponse({ status: 200, type: DoctorProfileFullResponseDto })
  async getDoctorById(@Param('id') id: string): Promise<DoctorProfileFullResponseDto> {
    return this.doctorService.getDoctorById(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update doctor profile details' })
  @ApiParam({ name: 'id', description: 'Doctor Profile ID' })
  @SwaggerResponse({ status: 200, type: DoctorProfileFullResponseDto })
  async updateDoctor(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<RegisterDoctorDto>,
  ): Promise<DoctorProfileFullResponseDto> {
    return this.doctorService.updateDoctor(id, dto, req.user);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a doctor profile' })
  @ApiParam({ name: 'id', description: 'Doctor Profile ID' })
  @SwaggerResponse({ status: 200, description: 'Doctor profile soft-deleted' })
  async softDeleteDoctor(@Param('id') id: string): Promise<any> {
    return this.doctorService.softDeleteDoctor(id);
  }

  @Post(':id/verify')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve & verify doctor registration' })
  @ApiParam({ name: 'id', description: 'Doctor Profile ID' })
  @SwaggerResponse({ status: 200, type: DoctorProfileFullResponseDto })
  async verifyDoctor(@Req() req: any, @Param('id') id: string, @Body() dto: DoctorActionDto): Promise<DoctorProfileFullResponseDto> {
    return this.doctorService.verifyDoctor(id, dto, req.user.userId);
  }

  @Post(':id/reject')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject doctor verification with reason' })
  @ApiParam({ name: 'id', description: 'Doctor Profile ID' })
  @SwaggerResponse({ status: 200, type: DoctorProfileFullResponseDto })
  async rejectDoctor(@Req() req: any, @Param('id') id: string, @Body() dto: DoctorActionDto): Promise<DoctorProfileFullResponseDto> {
    return this.doctorService.rejectDoctor(id, dto, req.user.userId);
  }

  @Post(':id/suspend')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend doctor registration' })
  @ApiParam({ name: 'id', description: 'Doctor Profile ID' })
  @SwaggerResponse({ status: 200, type: DoctorProfileFullResponseDto })
  async suspendDoctor(@Req() req: any, @Param('id') id: string, @Body() dto: DoctorActionDto): Promise<DoctorProfileFullResponseDto> {
    return this.doctorService.suspendDoctor(id, dto, req.user.userId);
  }

  @Post(':id/restore')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore suspended doctor registration' })
  @ApiParam({ name: 'id', description: 'Doctor Profile ID' })
  @SwaggerResponse({ status: 200, type: DoctorProfileFullResponseDto })
  async restoreDoctor(@Req() req: any, @Param('id') id: string, @Body() dto: DoctorActionDto): Promise<DoctorProfileFullResponseDto> {
    return this.doctorService.restoreDoctor(id, dto, req.user);
  }

  @Post(':id/renew-license')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renew medical registration license (extends expiry)' })
  @ApiParam({ name: 'id', description: 'Doctor Profile ID' })
  @SwaggerResponse({ status: 200, type: DoctorProfileFullResponseDto })
  async renewLicense(@Req() req: any, @Param('id') id: string, @Body() dto: RenewLicenseDto): Promise<DoctorProfileFullResponseDto> {
    return this.doctorService.renewLicense(id, dto, req.user.userId);
  }

  @Post(':id/generate-qr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate/Issue Doctor Digital Verification QR token' })
  @ApiParam({ name: 'id', description: 'Doctor Profile ID' })
  @SwaggerResponse({ status: 200, description: 'Generated QR Token details' })
  async generateQr(@Req() req: any, @Param('id') id: string): Promise<any> {
    return this.doctorService.generateQr(req.user.userId, id);
  }

  @Get(':id/documents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List attached doctor credential documents' })
  @ApiParam({ name: 'id', description: 'Doctor Profile ID' })
  @SwaggerResponse({ status: 200, type: [DoctorDocumentResponseDto] })
  async getDocuments(@Param('id') id: string): Promise<DoctorDocumentResponseDto[]> {
    return this.doctorService.getDocuments(id);
  }

  @Post(':id/documents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Attach credential document (reusing MedicalAttachment)' })
  @ApiParam({ name: 'id', description: 'Doctor Profile ID' })
  @SwaggerResponse({ status: 201, type: DoctorDocumentResponseDto })
  async attachDocument(@Param('id') id: string, @Body() dto: AttachDoctorDocumentDto): Promise<DoctorDocumentResponseDto> {
    return this.doctorService.attachDocument(id, dto);
  }

  @Get(':id/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get complete verification & status lifecycle history' })
  @ApiParam({ name: 'id', description: 'Doctor Profile ID' })
  @SwaggerResponse({ status: 200, type: [DoctorHistoryItemDto] })
  async getHistory(@Param('id') id: string): Promise<DoctorHistoryItemDto[]> {
    return this.doctorService.getHistory(id);
  }

  @Get(':id/slots')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Doctor Availability Schedule Slots' })
  @ApiParam({ name: 'id', description: 'Doctor Profile ID' })
  @SwaggerResponse({ status: 200, type: [ScheduleSlotResponseDto] })
  async getDoctorSlots(@Param('id') doctorId: string): Promise<ScheduleSlotResponseDto[]> {
    return this.doctorService.getDoctorSlots(doctorId);
  }
}
