import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateDentalRecordDto {
  @ApiPropertyOptional({ description: 'Tooth identifier (e.g. FDI "11", "26" or Universal "8", "14")' })
  @IsOptional()
  @IsString()
  toothNumber?: string;

  @ApiPropertyOptional({ description: 'Tooth surface (Mesial, Distal, Occlusal, Incisal, Buccal, Lingual)' })
  @IsOptional()
  @IsString()
  toothSurface?: string;

  @ApiProperty({ description: 'Dental clinical procedure name (e.g. Composite Restoration, Root Canal, Prophylaxis)' })
  @IsNotEmpty()
  @IsString()
  procedureName!: string;

  @ApiPropertyOptional({ description: 'Procedure code (e.g. ADA CDT code D2391, D3330)' })
  @IsOptional()
  @IsString()
  procedureCode?: string;

  @ApiPropertyOptional({ description: 'Clinical findings, caries classification, and pathology notes' })
  @IsOptional()
  @IsString()
  clinicalFindings?: string;

  @ApiPropertyOptional({ description: 'Treatment date ISO string' })
  @IsOptional()
  @IsString()
  treatmentDate?: string;

  @ApiPropertyOptional({ description: 'Recommended follow-up appointment date ISO string' })
  @IsOptional()
  @IsString()
  followUpDate?: string;

  @ApiPropertyOptional({ description: 'Record status (COMPLETED, IN_PROGRESS, PLANNED)', default: 'COMPLETED' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateDentalRecordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toothNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toothSurface?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  procedureName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  procedureCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clinicalFindings?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  followUpDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class DentalRecordResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  patientProfileId!: string;

  @ApiProperty()
  doctorId!: string;

  @ApiPropertyOptional()
  toothNumber?: string;

  @ApiPropertyOptional()
  toothSurface?: string;

  @ApiProperty()
  procedureName!: string;

  @ApiPropertyOptional()
  procedureCode?: string;

  @ApiPropertyOptional()
  clinicalFindings?: string;

  @ApiProperty()
  treatmentDate!: string;

  @ApiPropertyOptional()
  followUpDate?: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  isArchived!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ type: Array })
  attachments?: any[];
}
