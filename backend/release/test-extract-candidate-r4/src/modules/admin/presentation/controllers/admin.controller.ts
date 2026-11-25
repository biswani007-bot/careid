import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { AdminService } from '../../application/use-cases/admin.service';
import {
  AdminDashboardStatsDto, AdminDashboardSummaryResponseDto, ManagedUserResponseDto,
  OrganizationResponseDto, PlatformSettingResponseDto, AuditLogResponseDto,
  PermissionGroupResponseDto, PermissionResponseDto, AdminRegisterDoctorDto, AdminDoctorResponseDto,
} from '../dto/admin.dto';
import {
  UpdateUserStatusDto, AssignUserRolesDto, CreatePermissionGroupDto, CreatePermissionDto,
  AssignRolePermissionsDto, CreateOrganizationDto, UpsertPlatformSettingDto,
} from '../dto/admin-enterprise.dto';
import {
  AdminPatientQueryDto, AdminPatientSummaryResponseDto, AdminPatientDetailResponseDto,
  AdminCreatePatientDto, AdminUpdatePatientDto,
} from '../dto/admin-patient.dto';
import {
  AdminMedicalRecordQueryDto, AdminPatientMedicalRecordQueryDto,
  AdminMedicalRecordResponseDto, AdminCreateMedicalRecordDto,
} from '../dto/admin-medical-record.dto';
import {
  AdminUserFilterDto, CreateAdminUserDto, UpdateAdminUserDto, AdminResetPasswordDto,
  CreateRoleDto, UpdateRoleDto, RoleResponseDto, AdminAuditLogQueryDto, AuditLogExportQueryDto,
} from '../dto/admin-user-management.dto';
import { PaginationQueryDto } from '@common/dto/pagination.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth('JWT-Auth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ─────────────────────────────────────────────────────────

  @Get('dashboard/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get quick legacy dashboard statistics' })
  @SwaggerResponse({ status: 200, type: AdminDashboardStatsDto })
  async getDashboardStats(): Promise<AdminDashboardStatsDto> {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get platform-wide aggregated summary & growth metrics' })
  @SwaggerResponse({ status: 200, type: AdminDashboardSummaryResponseDto })
  async getDashboardSummary(): Promise<AdminDashboardSummaryResponseDto> {
    return this.adminService.getDashboardSummary();
  }

  // ─── User Administration ───────────────────────────────────────────────

  @Get('users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and list platform users with filter & roles' })
  @SwaggerResponse({ status: 200, description: 'Paginated user list or array of managed users' })
  async getUsers(
    @Query() filterDto: AdminUserFilterDto,
  ): Promise<any> {
    return this.adminService.getUsers(filterDto);
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create user with role and linked profile' })
  @SwaggerResponse({ status: 201, type: ManagedUserResponseDto })
  async createUser(
    @Req() req: any,
    @Body() dto: CreateAdminUserDto,
  ): Promise<ManagedUserResponseDto> {
    return this.adminService.createUser(req.user.userId, dto);
  }

  @Post('doctors')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register/Create a doctor profile for an existing user account' })
  @SwaggerResponse({ status: 201, type: AdminDoctorResponseDto })
  async registerDoctor(
    @Req() req: any,
    @Body() dto: AdminRegisterDoctorDto,
  ): Promise<AdminDoctorResponseDto> {
    return this.adminService.registerDoctor(req.user.userId, dto);
  }

  @Get('doctors')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List doctor registry for Admin portal' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'specialty', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getDoctors(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('specialty') specialty?: string,
    @Query('search') search?: string,
  ): Promise<any> {
    return this.adminService.getDoctors(
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
      specialty,
      search,
    );
  }

  @Get('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @SwaggerResponse({ status: 200, type: ManagedUserResponseDto })
  async getUserById(@Param('id') id: string): Promise<ManagedUserResponseDto> {
    return this.adminService.getUserById(id);
  }

  @Put('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Direct demographic and account edit for user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @SwaggerResponse({ status: 200, type: ManagedUserResponseDto })
  async updateUser(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
  ): Promise<ManagedUserResponseDto> {
    return this.adminService.updateUser(id, req.user.userId, dto);
  }

  @Post('users/:id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Administrator-initiated password reset and session revocation' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @SwaggerResponse({ status: 200, description: 'Password reset confirmation' })
  async resetPassword(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AdminResetPasswordDto,
  ): Promise<{ message: string; userId: string }> {
    return this.adminService.resetUserPassword(id, req.user.userId, dto);
  }

  // ─── Patient Administration (Workstream A) ──────────────────────────────

  @Post('patients')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register and create a new patient profile from Admin Web' })
  @SwaggerResponse({ status: 201, type: AdminPatientDetailResponseDto })
  async createPatient(
    @Req() req: any,
    @Body() dto: AdminCreatePatientDto,
  ): Promise<AdminPatientDetailResponseDto> {
    return this.adminService.createPatient(req.user.userId, dto);
  }

  @Put('patients/:patientId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update patient profile demographic details from Admin Web' })
  @ApiParam({ name: 'patientId', description: 'Patient Profile ID or User ID' })
  @SwaggerResponse({ status: 200, type: AdminPatientDetailResponseDto })
  async updatePatient(
    @Req() req: any,
    @Param('patientId') patientId: string,
    @Body() dto: AdminUpdatePatientDto,
  ): Promise<AdminPatientDetailResponseDto> {
    return this.adminService.updatePatient(req.user.userId, patientId, dto);
  }

  @Get('patients')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and list patients with server-side pagination and filters' })
  @SwaggerResponse({ status: 200, type: [AdminPatientSummaryResponseDto] })
  async getPatients(@Query() query: AdminPatientQueryDto) {
    return this.adminService.getPatients(query);
  }

  @Get('patients/:patientId/medical-records/timeline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get unified medical timeline for a specific patient' })
  @ApiParam({ name: 'patientId', description: 'Patient Profile ID or User ID' })
  @SwaggerResponse({ status: 200 })
  async getPatientTimeline(
    @Param('patientId') patientId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.adminService.getPatientTimeline(patientId, query);
  }

  @Get('patients/:patientId/medical-records')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List medical records for a specific patient with pagination' })
  @ApiParam({ name: 'patientId', description: 'Patient Profile ID or User ID' })
  @SwaggerResponse({ status: 200, type: [AdminMedicalRecordResponseDto] })
  async getPatientMedicalRecords(
    @Param('patientId') patientId: string,
    @Query() query: AdminPatientMedicalRecordQueryDto,
  ) {
    return this.adminService.getPatientMedicalRecords(patientId, query);
  }

  @Get('patients/:patientId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get comprehensive patient details by ID or User ID' })
  @ApiParam({ name: 'patientId', description: 'Patient Profile ID or User ID' })
  @SwaggerResponse({ status: 200, type: AdminPatientDetailResponseDto })
  async getPatientById(@Param('patientId') patientId: string) {
    return this.adminService.getPatientById(patientId);
  }

  // ─── Health & Medical Records Administration (Workstream B) ─────────────

  @Post('medical-records')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Create and ingest a medical record from Admin Web with optional file scan' })
  @SwaggerResponse({ status: 201, type: AdminMedicalRecordResponseDto })
  async createMedicalRecord(
    @Req() req: any,
    @Body() dto: AdminCreateMedicalRecordDto,
    @UploadedFile() file?: any,
  ): Promise<AdminMedicalRecordResponseDto> {
    return this.adminService.createMedicalRecord(req.user.userId, dto, file);
  }

  @Get('medical-records')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and list medical records platform-wide with pagination' })
  @SwaggerResponse({ status: 200, type: [AdminMedicalRecordResponseDto] })
  async getMedicalRecords(@Query() query: AdminMedicalRecordQueryDto) {
    return this.adminService.getMedicalRecords(query);
  }

  @Get('medical-records/:recordId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get clinical details of a specific medical record' })
  @ApiParam({ name: 'recordId', description: 'Medical Record ID' })
  @SwaggerResponse({ status: 200, type: AdminMedicalRecordResponseDto })
  async getMedicalRecordById(@Param('recordId') recordId: string) {
    return this.adminService.getMedicalRecordById(recordId);
  }

  @Put('users/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate, deactivate, or lock/block user account' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @SwaggerResponse({ status: 200, type: ManagedUserResponseDto })
  async updateUserStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<ManagedUserResponseDto> {
    return this.adminService.updateUserStatus(id, dto, req.user.userId);
  }

  @Put('users/:id/roles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign RBAC roles to user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @SwaggerResponse({ status: 200, type: ManagedUserResponseDto })
  async assignUserRoles(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AssignUserRolesDto,
  ): Promise<ManagedUserResponseDto> {
    return this.adminService.assignUserRoles(id, dto, req.user.userId);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete / block a user account' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @SwaggerResponse({ status: 200, description: 'User blocked' })
  async softDeleteUser(@Req() req: any, @Param('id') id: string): Promise<any> {
    return this.adminService.softDeleteUser(id, req.user.userId);
  }

  @Post('users/:id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a blocked/soft-deleted user account' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @SwaggerResponse({ status: 200, type: ManagedUserResponseDto })
  async restoreUser(@Req() req: any, @Param('id') id: string): Promise<ManagedUserResponseDto> {
    return this.adminService.restoreUser(id, req.user.userId);
  }

  // ─── Role & Permission Management ────────────────────────────────────

  @Get('roles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all RBAC roles with assigned permissions' })
  @SwaggerResponse({ status: 200, description: 'List of roles' })
  async getRoles(): Promise<any[]> {
    return this.adminService.getRoles();
  }

  @Post('roles')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create custom or system role' })
  @SwaggerResponse({ status: 201, description: 'Role created' })
  async createRole(
    @Req() req: any,
    @Body() dto: CreateRoleDto,
  ): Promise<any> {
    return this.adminService.createRole(req.user.userId, dto);
  }

  @Get('roles/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get role details with permissions' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @SwaggerResponse({ status: 200, description: 'Role details' })
  async getRoleById(@Param('id') id: string): Promise<any> {
    return this.adminService.getRoleById(id);
  }

  @Put('roles/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update role description or assigned permissions' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @SwaggerResponse({ status: 200, description: 'Role updated' })
  async updateRole(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<any> {
    return this.adminService.updateRole(id, req.user.userId, dto);
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete custom role (core roles protected)' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @SwaggerResponse({ status: 200, description: 'Role deleted' })
  async deleteRole(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.adminService.deleteRole(id, req.user.userId);
  }

  @Get('permissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all system permissions' })
  @SwaggerResponse({ status: 200, type: [PermissionResponseDto] })
  async getPermissions(): Promise<PermissionResponseDto[]> {
    return this.adminService.getPermissions();
  }

  @Get('permission-groups')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List permission groups with permissions' })
  @SwaggerResponse({ status: 200, type: [PermissionGroupResponseDto] })
  async getPermissionGroups(): Promise<PermissionGroupResponseDto[]> {
    return this.adminService.getPermissionGroups();
  }

  @Post('permission-groups')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new permission group' })
  @SwaggerResponse({ status: 201, type: PermissionGroupResponseDto })
  async createPermissionGroup(
    @Req() req: any,
    @Body() dto: CreatePermissionGroupDto,
  ): Promise<PermissionGroupResponseDto> {
    return this.adminService.createPermissionGroup(dto, req.user.userId);
  }

  @Post('permissions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new granular permission' })
  @SwaggerResponse({ status: 201, type: PermissionResponseDto })
  async createPermission(
    @Req() req: any,
    @Body() dto: CreatePermissionDto,
  ): Promise<PermissionResponseDto> {
    return this.adminService.createPermission(dto, req.user.userId);
  }

  @Put('roles/:id/permissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign permissions to a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @SwaggerResponse({ status: 200, description: 'Role updated with permissions' })
  async assignRolePermissions(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AssignRolePermissionsDto,
  ): Promise<any> {
    return this.adminService.assignRolePermissions(id, dto, req.user.userId);
  }

  @Get('permission-matrix')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get complete Role-Permission matrix' })
  @SwaggerResponse({ status: 200, description: 'Matrix of roles and assigned permission codes' })
  async getPermissionMatrix(): Promise<any> {
    return this.adminService.getPermissionMatrix();
  }

  // ─── Organization Management ──────────────────────────────────────────

  @Post('organizations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an organization profile' })
  @SwaggerResponse({ status: 201, type: OrganizationResponseDto })
  async createOrganization(
    @Req() req: any,
    @Body() dto: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    return this.adminService.createOrganization(dto, req.user.userId);
  }

  @Get('organizations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all registered organizations' })
  @SwaggerResponse({ status: 200, type: [OrganizationResponseDto] })
  async getOrganizations(): Promise<OrganizationResponseDto[]> {
    return this.adminService.getOrganizations();
  }

  @Get('organizations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get organization details' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @SwaggerResponse({ status: 200, type: OrganizationResponseDto })
  async getOrganizationById(@Param('id') id: string): Promise<OrganizationResponseDto> {
    return this.adminService.getOrganizationById(id);
  }

  @Put('organizations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update organization details and settings' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @SwaggerResponse({ status: 200, type: OrganizationResponseDto })
  async updateOrganization(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateOrganizationDto>,
  ): Promise<OrganizationResponseDto> {
    return this.adminService.updateOrganization(id, dto, req.user.userId);
  }

  @Delete('organizations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @SwaggerResponse({ status: 200, description: 'Organization soft-deleted' })
  async softDeleteOrganization(@Req() req: any, @Param('id') id: string): Promise<any> {
    return this.adminService.softDeleteOrganization(id, req.user.userId);
  }

  // ─── Platform Configuration ─────────────────────────────────────────────

  @Get('settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get system settings by category or all' })
  @ApiQuery({ name: 'category', required: false, enum: ['GENERAL', 'SECURITY', 'STORAGE', 'API_LIMITS', 'MAINTENANCE', 'FEATURE_TOGGLES'] })
  @SwaggerResponse({ status: 200, type: [PlatformSettingResponseDto] })
  async getSettings(@Query('category') category?: string): Promise<PlatformSettingResponseDto[]> {
    return this.adminService.getSettings(category);
  }

  @Put('settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert platform configuration setting' })
  @SwaggerResponse({ status: 200, type: PlatformSettingResponseDto })
  async upsertSetting(
    @Req() req: any,
    @Body() dto: UpsertPlatformSettingDto,
  ): Promise<PlatformSettingResponseDto> {
    return this.adminService.upsertSetting(dto, req.user.userId);
  }

  @Post('settings/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset platform settings to authoritative baseline for specified category' })
  @ApiQuery({ name: 'category', required: true, enum: ['SECURITY'] })
  @SwaggerResponse({ status: 200, type: [PlatformSettingResponseDto] })
  async resetSettings(
    @Req() req: any,
    @Query('category') category: string,
  ): Promise<PlatformSettingResponseDto[]> {
    if (!category || category.toUpperCase() !== 'SECURITY') {
      throw new BadRequestException("Only category 'SECURITY' is supported for settings reset");
    }
    const adminUserId = req.user?.id || req.user?.userId;
    return this.adminService.resetSecuritySettings(adminUserId);
  }

  // ─── Audit Logs ────────────────────────────────────────────────────────

  @Get('audit-logs/export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export system audit logs as CSV or JSON' })
  @SwaggerResponse({ status: 200, description: 'Exported audit log payload' })
  async exportAuditLogs(
    @Query() query: AuditLogExportQueryDto,
  ): Promise<any> {
    return this.adminService.exportAuditLogs(query);
  }

  @Get('audit-logs/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get single audit log entry by ID' })
  @ApiParam({ name: 'id', description: 'Audit log ID' })
  @SwaggerResponse({ status: 200, type: AuditLogResponseDto })
  async getAuditLogById(@Param('id') id: string): Promise<AuditLogResponseDto> {
    return this.adminService.getAuditLogById(id);
  }

  @Get('audit-logs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get global system audit trail with filtering and pagination' })
  @SwaggerResponse({ status: 200, description: 'Paginated audit logs or array' })
  async getAuditLogs(@Query() query: AdminAuditLogQueryDto): Promise<any> {
    return this.adminService.getFilteredAuditLogs(query);
  }
}
