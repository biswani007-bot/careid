import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLaboratoryTestItemDto {
  @ApiProperty({ description: 'Specific test parameter name (e.g. Hemoglobin, Fasting Blood Glucose, Platelet Count)' })
  @IsNotEmpty()
  @IsString()
  testName!: string;

  @ApiPropertyOptional({ description: 'Test category (e.g. Complete Blood Count, Lipid Profile, Renal Function)' })
  @IsOptional()
  @IsString()
  testCategory?: string;

  @ApiPropertyOptional({ description: 'Quantitative numeric result value if applicable' })
  @IsOptional()
  @IsNumber()
  numericValue?: number;

  @ApiPropertyOptional({ description: 'Qualitative or text result value if applicable' })
  @IsOptional()
  @IsString()
  textValue?: string;

  @ApiPropertyOptional({ description: 'Unit of measurement (e.g. g/dL, mg/dL, /uL)' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ description: 'Reference normal range string (e.g. "13.5 - 17.5 g/dL")' })
  @IsNotEmpty()
  @IsString()
  referenceRange!: string;

  @ApiPropertyOptional({ description: 'Lower normal reference limit' })
  @IsOptional()
  @IsNumber()
  referenceLow?: number;

  @ApiPropertyOptional({ description: 'Upper normal reference limit' })
  @IsOptional()
  @IsNumber()
  referenceHigh?: number;

  @ApiPropertyOptional({ description: 'Clinical flag: NORMAL, LOW, HIGH, CRITICAL', default: 'NORMAL' })
  @IsOptional()
  @IsString()
  flag?: string;

  @ApiPropertyOptional({ description: 'Item status', default: 'COMPLETED' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateLaboratoryReportDto {
  @ApiProperty({ description: 'Accredited clinical diagnostic laboratory name' })
  @IsNotEmpty()
  @IsString()
  laboratoryName!: string;

  @ApiPropertyOptional({ description: 'Biological specimen type (e.g. Whole Blood, Serum, Plasma, Urine)' })
  @IsOptional()
  @IsString()
  specimenType?: string;

  @ApiPropertyOptional({ description: 'Specimen collection timestamp ISO string' })
  @IsOptional()
  @IsString()
  collectedDate?: string;

  @ApiPropertyOptional({ description: 'Lab report issue timestamp ISO string' })
  @IsOptional()
  @IsString()
  reportedDate?: string;

  @ApiPropertyOptional({ description: 'Status (FINAL, PRELIMINARY, CORRECTED)', default: 'FINAL' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Overall pathologist or lab technician notes' })
  @IsOptional()
  @IsString()
  overallNotes?: string;

  @ApiPropertyOptional({ description: 'Optional linked source document MedicalAttachment UUID' })
  @IsOptional()
  @IsString()
  attachmentId?: string;

  @ApiProperty({ type: [CreateLaboratoryTestItemDto], description: 'Discrete test items and biomarkers' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLaboratoryTestItemDto)
  testItems!: CreateLaboratoryTestItemDto[];
}

export class UpdateLaboratoryReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  laboratoryName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specimenType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  overallNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class LaboratoryTestItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  reportId!: string;

  @ApiProperty()
  testName!: string;

  @ApiPropertyOptional()
  testCategory?: string;

  @ApiPropertyOptional()
  numericValue?: number;

  @ApiPropertyOptional()
  textValue?: string;

  @ApiPropertyOptional()
  unit?: string;

  @ApiProperty()
  referenceRange!: string;

  @ApiPropertyOptional()
  referenceLow?: number;

  @ApiPropertyOptional()
  referenceHigh?: number;

  @ApiProperty()
  flag!: string;

  @ApiProperty()
  status!: string;
}

export class LaboratoryReportResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  patientProfileId!: string;

  @ApiPropertyOptional()
  doctorId?: string;

  @ApiProperty()
  laboratoryName!: string;

  @ApiPropertyOptional()
  specimenType?: string;

  @ApiProperty()
  collectedDate!: string;

  @ApiProperty()
  reportedDate!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  overallNotes?: string;

  @ApiPropertyOptional()
  attachmentId?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: [LaboratoryTestItemResponseDto] })
  testItems!: LaboratoryTestItemResponseDto[];

  @ApiPropertyOptional()
  attachment?: any;
}
