import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ─── Requirement Catalogue DTOs ─────────────────────────────────────────────

export class CreateClearanceRequirementDto {
  @ApiProperty({ description: 'Stable unique code (e.g. REQ-LAB-METABOLIC)' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Display name for clinician checklist' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Clinical explanation and instructions' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 'LABORATORY', description: 'Category: LABORATORY, SPECIALIST_CLEARANCE, LEGAL_CONSENT, FINANCIAL, OPERATIONAL, SURGICAL_PREP' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ default: 'ALL', description: 'Clinical practice type: ALL, HUMAN_HEALTHCARE, VETERINARY' })
  @IsOptional()
  @IsString()
  clinicalPracticeType?: string;

  @ApiPropertyOptional({ description: 'Applicable procedure group or null for all' })
  @IsOptional()
  @IsString()
  procedureGroup?: string;

  @ApiPropertyOptional({ description: 'Facility ID if facility-specific or null for global' })
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional({ default: 'NONE', description: 'Evidence type: NONE, LAB_RESULT, SPECIALIST_SIGN_OFF, DOCUMENT, VITALS_SIGN_OFF' })
  @IsOptional()
  @IsString()
  requiredEvidenceType?: string;

  @ApiPropertyOptional({ default: 'DOCTOR', description: 'Eligible reviewer role: DOCTOR, ANESTHESIOLOGIST, CARDIOLOGIST, ADMIN, STAFF, ANY_CLINICIAN' })
  @IsOptional()
  @IsString()
  reviewerRole?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  requiredApprovalsCount?: number;

  @ApiPropertyOptional({ type: [String], description: 'Required specialties (e.g. ANESTHESIA, CARDIOLOGY, MEDICAL)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSpecialties?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Codes of prerequisite requirements' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ default: 'ACTIVE' })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}

export class UpdateClearanceRequirementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clinicalPracticeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  procedureGroup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requiredEvidenceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewerRole?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  requiredApprovalsCount?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSpecialties?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}

export class QueryClearanceRequirementsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clinicalPracticeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

// ─── Policy DTOs ─────────────────────────────────────────────────────────────

export class PolicyRequirementItemDto {
  @ApiProperty({ description: 'Clearance requirement UUID or Code' })
  @IsString()
  requirementId!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSpecialties?: string[];

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsNumber()
  validityDays?: number;
}

export class CreateClearancePolicyDto {
  @ApiProperty({ description: 'Policy number (e.g. POL-CLEAR-CATH-001)' })
  @IsString()
  policyNumber!: string;

  @ApiProperty({ description: 'Policy title' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Facility ID or null for global' })
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Procedure code or CPT (e.g. 93458)' })
  @IsOptional()
  @IsString()
  procedureCode?: string;

  @ApiPropertyOptional({ default: 'HUMAN_HEALTHCARE' })
  @IsOptional()
  @IsString()
  clinicalPracticeType?: string;

  @ApiPropertyOptional({ default: 'PUBLISHED' })
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: string;

  @ApiPropertyOptional({ type: [String], description: 'Prerequisite requirement codes required before booking' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  schedulingPrerequisites?: string[];

  @ApiPropertyOptional({ type: [PolicyRequirementItemDto] })
  @IsOptional()
  @IsArray()
  items?: PolicyRequirementItemDto[];
}

export class UpdateClearancePolicyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  procedureCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clinicalPracticeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  schedulingPrerequisites?: string[];

  @ApiPropertyOptional({ type: [PolicyRequirementItemDto] })
  @IsOptional()
  @IsArray()
  items?: PolicyRequirementItemDto[];
}

export class QueryClearancePoliciesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  procedureCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clinicalPracticeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

// ─── Clearance Decision & Checklist DTOs ────────────────────────────────────

export class SubmitClearanceDecisionDto {
  @ApiProperty({ description: 'Requirement code or ID (e.g. REQ-LAB-METABOLIC)' })
  @IsString()
  requirementCode!: string;

  @ApiProperty({ default: 'CLEARED', description: 'CLEARED, REJECTED, NOT_REQUIRED, PENDING' })
  @IsString()
  status!: string;

  @ApiPropertyOptional({ description: 'Specialty for specialist reviews (e.g. ANESTHESIA, CARDIOLOGY, MEDICAL)' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({ description: 'Evidence type (e.g. LAB_RESULT, DOCUMENT)' })
  @IsOptional()
  @IsString()
  evidenceType?: string;

  @ApiPropertyOptional({ description: 'ID of patient lab report or medical record' })
  @IsOptional()
  @IsString()
  evidenceRecordId?: string;

  @ApiPropertyOptional({ description: 'Metadata regarding evidence values' })
  @IsOptional()
  evidenceMetadata?: any;

  @ApiPropertyOptional({ description: 'Clinician evaluation notes and remarks' })
  @IsOptional()
  @IsString()
  clinicalRemarks?: string;
}

export class UpdateOfferClearancePayloadDto {
  @ApiPropertyOptional()
  @IsOptional()
  cardiologyClearance?: any;

  @ApiPropertyOptional()
  @IsOptional()
  anesthesiaClearance?: any;

  @ApiPropertyOptional()
  @IsOptional()
  medicalClearance?: any;

  @ApiPropertyOptional()
  @IsOptional()
  surgicalClearance?: any;

  @ApiPropertyOptional()
  @IsOptional()
  labClearance?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [SubmitClearanceDecisionDto] })
  @IsOptional()
  @IsArray()
  decisions?: SubmitClearanceDecisionDto[];

  // Also accept single decision top-level fields for convenience
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requirementCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evidenceRecordId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clinicalRemarks?: string;
}
