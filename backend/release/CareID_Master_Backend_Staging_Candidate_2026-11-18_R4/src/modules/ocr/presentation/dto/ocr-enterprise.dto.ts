import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsArray, IsDateString, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '@common/dto/pagination.dto';

export class CreateOCRJobDto {
  @ApiProperty({ example: 'attachment-uuid-1' })
  @IsNotEmpty()
  @IsString()
  medicalAttachmentId!: string;

  @ApiProperty({ example: 'LAB_REPORT', enum: ['UNKNOWN', 'HEALTH_CARD', 'PASSPORT', 'DRIVERS_LICENSE', 'INSURANCE_DOCUMENT', 'LAB_REPORT', 'DIAGNOSTIC_REPORT', 'MEDICAL_REPORT', 'PRESCRIPTION', 'REFERRAL', 'DISCHARGE_SUMMARY', 'CONSENT_FORM', 'REGISTRATION_FORM', 'VACCINATION_RECORD', 'MEDICAL_CERTIFICATE', 'OTHER'], required: false })
  @IsOptional()
  @IsString()
  documentType?: string;
}

export class CreateOCRTemplateDto {
  @ApiProperty({ example: 'TPL_LAB_CBC' })
  @IsNotEmpty()
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Complete Blood Count (CBC) Lab Report Template' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'LAB_REPORT' })
  @IsNotEmpty()
  @IsString()
  documentType!: string;

  @ApiProperty({ example: { patientName: { type: 'string', required: true }, hemoglobin: { type: 'number', min: 5, max: 20 } }, required: false })
  @IsOptional()
  @IsObject()
  fieldDefinitions?: any;

  @ApiProperty({ example: { requireDoctorSignature: true }, required: false })
  @IsOptional()
  @IsObject()
  validationRules?: any;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateOCRTemplateDto {
  @ApiProperty({ example: 'Updated CBC Template Name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'LAB_REPORT', required: false })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class FieldCorrectionDto {
  @ApiPropertyOptional({ example: 'field-uuid-1', description: 'Optional ID of existing ExtractedField' })
  @IsOptional()
  @IsString()
  fieldId?: string;

  @ApiProperty({ example: 'patientName', description: 'Name of the field being corrected' })
  @IsNotEmpty()
  @IsString()
  fieldName!: string;

  @ApiProperty({ example: 'Johnathan Doe', description: 'Verified corrected value' })
  @IsNotEmpty()
  @IsString()
  correctedValue!: string;

  @ApiPropertyOptional({ example: 1.0, description: 'Confidence override score' })
  @IsOptional()
  confidence?: number;
}

export class VerifyOCRDto {
  @ApiProperty({ example: 'APPROVED', enum: ['APPROVED', 'REJECTED', 'CORRECTED'] })
  @IsNotEmpty()
  @IsString()
  reviewStatus!: string;

  @ApiProperty({ example: 'All extracted fields verified against original scan.', required: false })
  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @ApiPropertyOptional({ type: [FieldCorrectionDto], description: 'Field corrections applied when reviewStatus is CORRECTED' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldCorrectionDto)
  corrections?: FieldCorrectionDto[];
}

export class OCRReviewHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'APPROVED', enum: ['APPROVED', 'REJECTED', 'CORRECTED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by reviewing user ID' })
  @IsOptional()
  @IsString()
  reviewerId?: string;

  @ApiPropertyOptional({ description: 'Filter reviews on or after ISO start timestamp' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter reviews on or before ISO end timestamp' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
