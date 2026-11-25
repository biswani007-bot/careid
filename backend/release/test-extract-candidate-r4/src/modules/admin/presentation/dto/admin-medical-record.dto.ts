import { IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '@common/dto/pagination.dto';

export class AdminMedicalRecordQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search term across title, complaints, notes, plan, diagnoses' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by record status (FINAL, DRAFT, ARCHIVED, AMENDED)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by patient profile ID' })
  @IsOptional()
  @IsString()
  patientProfileId?: string;

  @ApiPropertyOptional({ description: 'Filter by record created after ISO timestamp' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter by record created before ISO timestamp' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class AdminPatientMedicalRecordQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by record status (FINAL, DRAFT, ARCHIVED, AMENDED)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by record created after ISO timestamp' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter by record created before ISO timestamp' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Include archived records in results', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeArchived?: boolean = true;
}

export class AdminPatientSummaryDto {
  @ApiProperty({ example: 'patient-profile-uuid' })
  id!: string;

  @ApiProperty({ example: 'P-100234', nullable: true })
  patientNumber!: string | null;

  @ApiProperty({ example: 'Jane', nullable: true })
  firstName!: string | null;

  @ApiProperty({ example: 'Doe', nullable: true })
  lastName!: string | null;

  @ApiProperty({ example: '+923001234567', nullable: true })
  phone!: string | null;
}

export class AdminMedicalAttachmentSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  fileSize!: number;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  virusScanStatus!: string;

  @ApiProperty()
  createdAt!: string;
}

export class AdminMedicalRecordResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  patientProfileId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  chiefComplaint?: string;

  @ApiProperty({ nullable: true })
  clinicalNotes?: string;

  @ApiProperty({ nullable: true })
  treatmentPlan?: string;

  @ApiProperty({ nullable: true })
  followUpInstructions?: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  isDeleted!: boolean;

  @ApiProperty({ nullable: true })
  deletedAt?: string;

  @ApiProperty({ type: AdminPatientSummaryDto, nullable: true })
  patient?: AdminPatientSummaryDto | null;

  @ApiProperty({ isArray: true })
  encounters!: any[];

  @ApiProperty({ isArray: true })
  diagnoses!: any[];

  @ApiProperty({ isArray: true })
  vitalSigns!: any[];

  @ApiProperty({ isArray: true })
  procedures!: any[];

  @ApiProperty({ type: [AdminMedicalAttachmentSummaryDto] })
  attachments!: AdminMedicalAttachmentSummaryDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AdminTimelineItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: 'MEDICAL_RECORD' | 'ATTACHMENT';

  @ApiProperty()
  title!: string;

  @ApiProperty()
  date!: string;

  @ApiProperty({ nullable: true })
  category?: string;

  @ApiProperty({ nullable: true })
  status?: string;

  @ApiProperty({ nullable: true })
  summary?: string;

  @ApiProperty()
  details!: any;
}

export class AdminCreateMedicalRecordDto {
  @ApiProperty({ description: 'Target patient profile ID, user ID, or patient number', example: 'pat-100234' })
  @IsString()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Clinical record category (e.g. Medical, Dental, Vision)', example: 'Dental' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Record title or type', example: 'Full Panoramic OPG X-Ray' })
  @IsOptional()
  @IsString()
  recordType?: string;

  @ApiPropertyOptional({ description: 'Record title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Attending provider name', example: 'Dr. Michael Chen' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'Facility name', example: 'Apex Dental Care Center' })
  @IsOptional()
  @IsString()
  facility?: string;

  @ApiPropertyOptional({ description: 'Clinical summary or chief complaint', example: 'High-resolution digital orthopantomogram evaluating mandibular and maxillary bone density.' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: 'Chief complaint' })
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional({ description: 'Clinical notes' })
  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @ApiPropertyOptional({ description: 'Treatment plan' })
  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @ApiPropertyOptional({ description: 'Record status (FINAL, DRAFT, etc.)', default: 'FINAL' })
  @IsOptional()
  @IsString()
  status?: string;
}

