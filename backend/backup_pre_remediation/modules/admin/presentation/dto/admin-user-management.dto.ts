import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEmail, MinLength, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminUserFilterDto {
  @ApiProperty({ required: false, description: 'Search phone, email, or user ID' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Alias for search' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({ required: false, description: 'Filter by role name (e.g. PATIENT, DOCTOR, ADMIN)' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ required: false, enum: ['ACTIVE', 'INACTIVE', 'BLOCKED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiProperty({ required: false, default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({ required: false, enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class CreateAdminUserDto {
  @ApiProperty({ description: 'User phone number' })
  @IsNotEmpty()
  @IsString()
  phone!: string;

  @ApiProperty({ required: false, description: 'User email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Initial password' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({
    enum: ['PATIENT', 'FAMILY_MEMBER', 'DOCTOR', 'FACILITY_ADMIN', 'STAFF', 'ADMIN', 'SUPER_ADMIN'],
    description: 'Initial assigned RBAC role',
  })
  @IsNotEmpty()
  @IsString()
  role!: string;

  @ApiProperty({ required: false, enum: ['ACTIVE', 'INACTIVE', 'BLOCKED'], default: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ required: false, description: 'Primary facility ID for staff or doctor' })
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiProperty({ required: false, description: 'Medical primary specialization (required when role is DOCTOR)' })
  @IsOptional()
  @IsString()
  primarySpecialization?: string;

  @ApiProperty({ required: false, description: 'Medical council name (required when role is DOCTOR)' })
  @IsOptional()
  @IsString()
  medicalCouncil?: string;

  @ApiProperty({ required: false, description: 'Medical registration number (required when role is DOCTOR)' })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiProperty({ required: false, description: 'Medical license number (required when role is DOCTOR)' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({ required: false, type: [String], description: 'Secondary specializations' })
  @IsOptional()
  @IsString({ each: true })
  secondarySpecializations?: string[];

  @ApiProperty({ required: false, description: 'Years of medical experience' })
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @ApiProperty({ required: false, description: 'Clinical department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ required: false, description: 'Unique provider identifier override' })
  @IsOptional()
  @IsString()
  providerIdentifier?: string;
}

export class UpdateAdminUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, enum: ['ACTIVE', 'INACTIVE', 'BLOCKED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;
}

export class AdminResetPasswordDto {
  @ApiProperty({ description: 'New password (minimum 6 characters)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword!: string;
}

export class CreateRoleDto {
  @ApiProperty({ description: 'Role name', enum: ['PATIENT', 'FAMILY_MEMBER', 'DOCTOR', 'FACILITY_ADMIN', 'STAFF', 'ADMIN', 'SUPER_ADMIN'] })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, type: [String], description: 'Permission codes to assign' })
  @IsOptional()
  permissionCodes?: string[];
}

export class UpdateRoleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  permissionCodes?: string[];
}

export class RoleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) description?: string;
  @ApiProperty({ type: [Object], required: false }) permissions?: any[];
}

export class AdminAuditLogQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class AuditLogExportQueryDto {
  @ApiProperty({ required: false, enum: ['csv', 'json'], default: 'csv' })
  @IsOptional()
  @IsEnum(['csv', 'json'])
  format?: 'csv' | 'json' = 'csv';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  endDate?: string;
}

