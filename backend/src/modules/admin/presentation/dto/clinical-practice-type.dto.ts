import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEnum, IsInt, Min, Matches } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ClinicalAuthorizationScope, GovernanceStatus } from '@prisma/client';

export class CreateClinicalPracticeTypeDto {
  @ApiProperty({
    example: 'DENTAL_CLINIC',
    description: 'Unique uppercase identifier code for the clinical practice type',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Code must contain only uppercase alphanumeric characters and underscores',
  })
  code!: string;

  @ApiProperty({
    example: 'Dental Medicine',
    description: 'User-facing display name of the clinical practice type',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Display name cannot be empty or whitespace' })
  @IsString()
  displayName!: string;

  @ApiProperty({
    required: false,
    example: 'Clinical dentistry, oral healthcare, and maxillofacial surgery',
    description: 'Detailed description of the clinical practice type',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    required: false,
    enum: ClinicalAuthorizationScope,
    default: ClinicalAuthorizationScope.UNMAPPED,
    description: 'Clinical authorization mapping scope determining platform access boundary',
  })
  @IsOptional()
  @IsEnum(ClinicalAuthorizationScope)
  clinicalAuthorizationMapping?: ClinicalAuthorizationScope;

  @ApiProperty({
    required: false,
    enum: GovernanceStatus,
    default: GovernanceStatus.ACTIVE,
    description: 'Governance status of the practice type',
  })
  @IsOptional()
  @IsEnum(GovernanceStatus)
  status?: GovernanceStatus;

  @ApiProperty({
    required: false,
    default: 0,
    description: 'Sort ordering for display in select lists and dropdowns',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateClinicalPracticeTypeDto {
  @ApiProperty({
    required: false,
    example: 'Human Healthcare (Primary)',
    description: 'Updated display name',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Display name cannot be empty or whitespace' })
  @IsString()
  displayName?: string;

  @ApiProperty({
    required: false,
    example: 'Updated description of healthcare services',
    description: 'Updated description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    required: false,
    enum: GovernanceStatus,
    description: 'Updated governance status',
  })
  @IsOptional()
  @IsEnum(GovernanceStatus)
  status?: GovernanceStatus;

  @ApiProperty({
    required: false,
    enum: ClinicalAuthorizationScope,
    description: 'Updated clinical authorization mapping (immutable for canonical types)',
  })
  @IsOptional()
  @IsEnum(ClinicalAuthorizationScope)
  clinicalAuthorizationMapping?: ClinicalAuthorizationScope;

  @ApiProperty({
    required: false,
    description: 'Sort ordering for UI dropdown display',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateClinicalPracticeTypeStatusDto {
  @ApiProperty({
    enum: GovernanceStatus,
    description: 'Target governance status (ACTIVE or INACTIVE)',
  })
  @IsNotEmpty()
  @IsEnum(GovernanceStatus)
  status!: GovernanceStatus;
}

export class QueryClinicalPracticeTypesDto {
  @ApiProperty({
    required: false,
    description: 'Search filter on code or displayName',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    required: false,
    enum: GovernanceStatus,
    description: 'Filter by governance status',
  })
  @IsOptional()
  @IsEnum(GovernanceStatus)
  status?: GovernanceStatus;

  @ApiProperty({
    required: false,
    description: 'Include inactive records in query results',
  })
  @IsOptional()
  includeInactive?: string | boolean;
}

export class ClinicalPracticeTypeCountsDto {
  @ApiProperty({ example: 23, description: 'Number of active doctors assigned to this practice type' })
  doctors!: number;

  @ApiProperty({ example: 12, description: 'Number of master specialty items mapped to this practice type' })
  specialties!: number;
}

export class ClinicalPracticeTypeDetailDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ nullable: true }) description?: string | null;
  @ApiProperty({ enum: GovernanceStatus }) status!: GovernanceStatus;
  @ApiProperty({ enum: ClinicalAuthorizationScope }) clinicalAuthorizationMapping!: ClinicalAuthorizationScope;
  @ApiProperty() isCanonical!: boolean;
  @ApiProperty() sortOrder!: number;
  @ApiProperty({ nullable: true }) createdBy?: string | null;
  @ApiProperty({ nullable: true }) updatedBy?: string | null;
  @ApiProperty() isDeleted!: boolean;
  @ApiProperty({ nullable: true }) deletedAt?: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiProperty({ type: ClinicalPracticeTypeCountsDto, required: false }) _count?: ClinicalPracticeTypeCountsDto;
}
