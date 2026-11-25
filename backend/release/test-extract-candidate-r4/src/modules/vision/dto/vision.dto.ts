import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateVisionRecordDto {
  @ApiPropertyOptional({ description: 'Examination date ISO string' })
  @IsOptional()
  @IsString()
  examinationDate?: string;

  // Right Eye (OD)
  @ApiPropertyOptional({ description: 'Right Eye Sphere (OD)' })
  @IsOptional()
  @IsNumber()
  odSphere?: number;

  @ApiPropertyOptional({ description: 'Right Eye Cylinder (OD)' })
  @IsOptional()
  @IsNumber()
  odCylinder?: number;

  @ApiPropertyOptional({ description: 'Right Eye Axis (OD) in degrees 1-180' })
  @IsOptional()
  @IsNumber()
  odAxis?: number;

  @ApiPropertyOptional({ description: 'Right Eye Reading Addition (OD)' })
  @IsOptional()
  @IsNumber()
  odAddition?: number;

  @ApiPropertyOptional({ description: 'Right Eye Visual Acuity (OD) e.g. "20/20"' })
  @IsOptional()
  @IsString()
  odVisualAcuity?: string;

  @ApiPropertyOptional({ description: 'Right Eye Intraocular Pressure (OD) in mmHg' })
  @IsOptional()
  @IsNumber()
  odIopMmHg?: number;

  // Left Eye (OS)
  @ApiPropertyOptional({ description: 'Left Eye Sphere (OS)' })
  @IsOptional()
  @IsNumber()
  osSphere?: number;

  @ApiPropertyOptional({ description: 'Left Eye Cylinder (OS)' })
  @IsOptional()
  @IsNumber()
  osCylinder?: number;

  @ApiPropertyOptional({ description: 'Left Eye Axis (OS) in degrees 1-180' })
  @IsOptional()
  @IsNumber()
  osAxis?: number;

  @ApiPropertyOptional({ description: 'Left Eye Reading Addition (OS)' })
  @IsOptional()
  @IsNumber()
  osAddition?: number;

  @ApiPropertyOptional({ description: 'Left Eye Visual Acuity (OS) e.g. "20/20"' })
  @IsOptional()
  @IsString()
  osVisualAcuity?: string;

  @ApiPropertyOptional({ description: 'Left Eye Intraocular Pressure (OS) in mmHg' })
  @IsOptional()
  @IsNumber()
  osIopMmHg?: number;

  // Contact Lens & Notes
  @ApiPropertyOptional({ description: 'Contact Lens Base Curve (BC) in mm' })
  @IsOptional()
  @IsNumber()
  contactLensBaseCurve?: number;

  @ApiPropertyOptional({ description: 'Contact Lens Diameter (DIA) in mm' })
  @IsOptional()
  @IsNumber()
  contactLensDiameter?: number;

  @ApiPropertyOptional({ description: 'Clinical findings, fundoscopy, or slit lamp notes' })
  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @ApiPropertyOptional({ description: 'Doctor recommendations, eyewear advice, or referral notes' })
  @IsOptional()
  @IsString()
  recommendations?: string;

  @ApiPropertyOptional({ description: 'Status (FINAL, PRELIMINARY)', default: 'FINAL' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateVisionRecordDto extends CreateVisionRecordDto {}

export class VisionRecordResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  patientProfileId!: string;

  @ApiProperty()
  doctorId!: string;

  @ApiProperty()
  examinationDate!: string;

  @ApiPropertyOptional()
  odSphere?: number;

  @ApiPropertyOptional()
  odCylinder?: number;

  @ApiPropertyOptional()
  odAxis?: number;

  @ApiPropertyOptional()
  odAddition?: number;

  @ApiPropertyOptional()
  odVisualAcuity?: string;

  @ApiPropertyOptional()
  odIopMmHg?: number;

  @ApiPropertyOptional()
  osSphere?: number;

  @ApiPropertyOptional()
  osCylinder?: number;

  @ApiPropertyOptional()
  osAxis?: number;

  @ApiPropertyOptional()
  osAddition?: number;

  @ApiPropertyOptional()
  osVisualAcuity?: string;

  @ApiPropertyOptional()
  osIopMmHg?: number;

  @ApiPropertyOptional()
  contactLensBaseCurve?: number;

  @ApiPropertyOptional()
  contactLensDiameter?: number;

  @ApiPropertyOptional()
  clinicalNotes?: string;

  @ApiPropertyOptional()
  recommendations?: string;

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
