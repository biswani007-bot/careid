import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSafetyHoldCategoryDto {
  @ApiProperty({ description: 'Unique category identifier code', example: 'RADIATION_OR_CONTRAST_HAZARD' })
  @IsNotEmpty()
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Human-readable category display name', example: 'Radiation or Contrast Hazard' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Clinical hazard description and resolution protocol' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Practice type applicability', default: 'ALL' })
  @IsOptional()
  @IsString()
  clinicalPracticeType?: string;

  @ApiPropertyOptional({ description: 'Applicable procedure categories or codes', type: [String] })
  @IsOptional()
  @IsArray()
  procedureCategories?: string[];

  @ApiPropertyOptional({ description: 'Applicable facility UUIDs', type: [String] })
  @IsOptional()
  @IsArray()
  facilityIds?: string[];

  @ApiPropertyOptional({ description: 'Display sort order', default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Minimum reviewer qualification role required to clear', default: 'DOCTOR' })
  @IsOptional()
  @IsString()
  requiredReviewerRole?: string;

  @ApiPropertyOptional({ description: 'Required evidence type to clear hold', default: 'NONE' })
  @IsOptional()
  @IsString()
  requiredEvidenceType?: string;

  @ApiPropertyOptional({ description: 'Resolution governance policy' })
  @IsOptional()
  @IsString()
  resolutionPolicy?: string;
}

export class UpdateSafetyHoldCategoryDto {
  @ApiPropertyOptional({ description: 'Human-readable category display name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Clinical hazard description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Practice type applicability' })
  @IsOptional()
  @IsString()
  clinicalPracticeType?: string;

  @ApiPropertyOptional({ description: 'Applicable procedure categories or codes', type: [String] })
  @IsOptional()
  @IsArray()
  procedureCategories?: string[];

  @ApiPropertyOptional({ description: 'Applicable facility UUIDs', type: [String] })
  @IsOptional()
  @IsArray()
  facilityIds?: string[];

  @ApiPropertyOptional({ description: 'Display sort order' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Active governance status', enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Minimum reviewer qualification role required to clear', default: 'DOCTOR' })
  @IsOptional()
  @IsString()
  requiredReviewerRole?: string;

  @ApiPropertyOptional({ description: 'Required evidence type to clear hold', default: 'NONE' })
  @IsOptional()
  @IsString()
  requiredEvidenceType?: string;

  @ApiPropertyOptional({ description: 'Resolution governance policy' })
  @IsOptional()
  @IsString()
  resolutionPolicy?: string;
}

export class QuerySafetyHoldCategoriesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clinicalPracticeType?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class ClinicalSummaryConfigDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  showProcedureCode?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  showClinicalIndication?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  showFacility?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  showSupervisingAttending?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  showFinancialTerms?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  showProceduralHoldWindow?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  showSafetyHoldHistory?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  safetyHoldPanelCollapsedByDefault?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requireClinicalReviewForHoldClearance?: boolean;

  @ApiPropertyOptional({ description: 'Configurable section labels map' })
  @IsOptional()
  customSectionLabels?: Record<string, string>;
}

export class ReconcileLegacySafetyHoldsDto {
  @ApiPropertyOptional({ description: 'Optional specific Treatment Offer UUID to reconcile' })
  @IsOptional()
  @IsString()
  targetOfferId?: string;

  @ApiPropertyOptional({ description: 'Dry run check without mutation', default: false })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
