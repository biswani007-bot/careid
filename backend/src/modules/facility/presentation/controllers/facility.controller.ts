import {
  Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { FacilityService } from '../../application/use-cases/facility.service';
import {
  RegisterFacilityDto, CreateDepartmentDto, CreateRoomDto, AddFacilityLicenseDto,
  AddFacilityAccreditationDto, AttachFacilityDocumentDto, AssignDoctorToFacilityDto, FacilityActionDto,
} from '../dto/register-facility.dto';
import {
  FacilityFullResponseDto, FullDepartmentResponseDto, RoomResponseDto,
  FacilityDocumentResponseDto, FacilityHistoryItemDto, FacilityStatsResponseDto,
} from '../dto/facility-response.dto';
import { FacilityResponseDto, DepartmentResponseDto } from '../dto/facility.dto';
import { DoctorProfileResponseDto } from '../../../../modules/doctor/presentation/dto/doctor-profile.dto';

@ApiTags('Facilities')
@Controller('facilities')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class FacilityController {
  constructor(private readonly facilityService: FacilityService) {}

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register/Create a facility profile in Master Registry' })
  @SwaggerResponse({ status: 201, type: FacilityFullResponseDto })
  async registerFacility(@Req() req: any, @Body() dto: RegisterFacilityDto): Promise<FacilityFullResponseDto> {
    return this.facilityService.registerFacility(req.user.userId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all registered facility profiles' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max: 100, default: 50)' })
  @SwaggerResponse({ status: 200, type: [FacilityFullResponseDto] })
  async getFacilities(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<FacilityFullResponseDto[]> {
    return this.facilityService.getFacilities(page ? Number(page) : 1, limit ? Number(limit) : 50);
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enterprise facility search (by name, code, city, type)' })
  @ApiQuery({ name: 'q', required: true })
  @SwaggerResponse({ status: 200, type: [FacilityFullResponseDto] })
  async searchFacilities(@Query('q') query: string): Promise<FacilityFullResponseDto[]> {
    return this.facilityService.searchFacilities(query);
  }

  @Get('statistics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get platform-wide facility directory statistics' })
  @SwaggerResponse({ status: 200, type: FacilityStatsResponseDto })
  async getStatistics(): Promise<FacilityStatsResponseDto> {
    return this.facilityService.getStatistics();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get complete facility details' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 200, type: FacilityFullResponseDto })
  async getFacilityById(@Param('id') id: string): Promise<FacilityFullResponseDto> {
    return this.facilityService.getFacilityById(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update facility details' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 200, type: FacilityFullResponseDto })
  async updateFacility(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<RegisterFacilityDto>,
  ): Promise<FacilityFullResponseDto> {
    return this.facilityService.updateFacility(id, dto, req.user);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a facility' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 200, description: 'Facility soft-deleted' })
  async softDeleteFacility(@Param('id') id: string): Promise<any> {
    return this.facilityService.softDeleteFacility(id);
  }

  @Post(':id/verify')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve & verify facility registration' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 200, type: FacilityFullResponseDto })
  async verifyFacility(@Req() req: any, @Param('id') id: string, @Body() dto: FacilityActionDto): Promise<FacilityFullResponseDto> {
    return this.facilityService.verifyFacility(id, dto, req.user.userId);
  }

  @Post(':id/suspend')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend facility registration' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 200, type: FacilityFullResponseDto })
  async suspendFacility(@Req() req: any, @Param('id') id: string, @Body() dto: FacilityActionDto): Promise<FacilityFullResponseDto> {
    return this.facilityService.suspendFacility(id, dto, req.user.userId);
  }

  @Post(':id/restore')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore suspended facility registration' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 200, type: FacilityFullResponseDto })
  async restoreFacility(@Req() req: any, @Param('id') id: string, @Body() dto: FacilityActionDto): Promise<FacilityFullResponseDto> {
    return this.facilityService.restoreFacility(id, dto, req.user.userId);
  }

  @Post(':id/generate-qr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate Facility Digital Identity QR token' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 200, description: 'Generated QR Token details' })
  async generateQr(@Req() req: any, @Param('id') id: string): Promise<any> {
    return this.facilityService.generateQr(req.user.userId, id);
  }

  @Get(':id/chargemaster')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get facility procedure chargemaster and standard pricing schedule (Phase 9)' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 200, description: 'Facility chargemaster catalogue' })
  async getChargemaster(@Param('id') id: string) {
    return this.facilityService.getChargemaster(id);
  }

  @Post(':id/chargemaster')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Configure or override procedure price for a facility' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 201, description: 'Facility procedure price configured' })
  async setFacilityProcedurePrice(
    @Param('id') id: string,
    @Body() dto: { procedureCode: string; price: number; currency?: string; effectiveFrom?: string; effectiveTo?: string },
  ) {
    return this.facilityService.setFacilityProcedurePrice(id, dto);
  }

  @Get(':id/procedures/:code/price')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active procedure price for a specific facility' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @ApiParam({ name: 'code', description: 'CPT or Procedure Code' })
  @SwaggerResponse({ status: 200, description: 'Effective procedure price details' })
  async getFacilityProcedurePrice(
    @Param('id') id: string,
    @Param('code') code: string,
  ) {
    return this.facilityService.getFacilityProcedurePrice(id, code);
  }

  @Get(':id/departments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List facility departments' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 200, type: [FullDepartmentResponseDto] })
  async getDepartments(@Param('id') id: string): Promise<FullDepartmentResponseDto[]> {
    return this.facilityService.getDepartments(id);
  }

  @Post(':id/departments')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create facility department' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 201, type: FullDepartmentResponseDto })
  async createDepartment(@Param('id') id: string, @Body() dto: CreateDepartmentDto): Promise<FullDepartmentResponseDto> {
    return this.facilityService.createDepartment(id, dto);
  }

  @Get(':id/rooms')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List facility rooms' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 200, type: [RoomResponseDto] })
  async getRooms(@Param('id') id: string): Promise<RoomResponseDto[]> {
    return this.facilityService.getRooms(id);
  }

  @Post(':id/rooms')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create facility room' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 201, type: RoomResponseDto })
  async createRoom(@Param('id') id: string, @Body() dto: CreateRoomDto): Promise<RoomResponseDto> {
    return this.facilityService.createRoom(id, dto);
  }

  @Post(':id/assign-doctor')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign doctor to facility' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 200, description: 'Doctor assigned to facility' })
  async assignDoctor(@Param('id') id: string, @Body() dto: AssignDoctorToFacilityDto): Promise<any> {
    return this.facilityService.assignDoctor(id, dto);
  }

  @Get(':id/doctors')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List associated facility doctors' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 200, type: [DoctorProfileResponseDto] })
  async listDoctors(@Param('id') id: string): Promise<DoctorProfileResponseDto[]> {
    return this.facilityService.listDoctors(id);
  }

  @Get(':id/documents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List attached facility credential documents' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 200, type: [FacilityDocumentResponseDto] })
  async getDocuments(@Param('id') id: string): Promise<FacilityDocumentResponseDto[]> {
    return this.facilityService.getDocuments(id);
  }

  @Post(':id/documents')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Attach credential document (reusing MedicalAttachment)' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 201, type: FacilityDocumentResponseDto })
  async attachDocument(@Param('id') id: string, @Body() dto: AttachFacilityDocumentDto): Promise<FacilityDocumentResponseDto> {
    return this.facilityService.attachDocument(id, dto);
  }

  @Get(':id/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get complete verification & status lifecycle history' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 200, type: [FacilityHistoryItemDto] })
  async getHistory(@Param('id') id: string): Promise<FacilityHistoryItemDto[]> {
    return this.facilityService.getHistory(id);
  }

  @Get(':id/pricing-rules')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get facility pricing and discount governance rules (Stages 1–6)' })
  @ApiParam({ name: 'id', description: 'Facility Profile ID' })
  @SwaggerResponse({ status: 200, description: 'Facility pricing rules and discount approval thresholds' })
  async getPricingRules(@Param('id') id: string): Promise<any> {
    return this.facilityService.getPricingRules(id);
  }
}
