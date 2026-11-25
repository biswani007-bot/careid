import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsArray, ValidateNested, Min, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePrescriptionItemDto {
  @ApiProperty({ description: 'Generic or brand drug name (e.g. Amoxicillin, Lisinopril, Metformin)' })
  @IsNotEmpty()
  @IsString()
  drugName!: string;

  @ApiProperty({ description: 'Strength and unit (e.g. 500mg, 10mg/mL)' })
  @IsNotEmpty()
  @IsString()
  dosage!: string;

  @ApiProperty({ description: 'Pharmaceutical dosage form (Tablet, Capsule, Oral Suspension, Topical Cream, Inhaler)' })
  @IsNotEmpty()
  @IsString()
  form!: string;

  @ApiPropertyOptional({ description: 'Route of administration (ORAL, IV, IM, TOPICAL, OPHTHALMIC, INHALATION)', default: 'ORAL' })
  @IsOptional()
  @IsString()
  route?: string;

  @ApiProperty({ description: 'Dosing frequency (Once daily, Twice daily (BID), Three times daily (TID), PRN as needed)' })
  @IsNotEmpty()
  @IsString()
  frequency!: string;

  @ApiProperty({ description: 'Treatment duration in days' })
  @IsNumber()
  @Min(1)
  durationDays!: number;

  @ApiPropertyOptional({ description: 'Special administration instructions (e.g. "Take after food with full glass of water")' })
  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreatePrescriptionDto {
  @ApiPropertyOptional({ description: 'Associated ICD-10 or clinical diagnosis code' })
  @IsOptional()
  @IsString()
  diagnosisCode?: string;

  @ApiPropertyOptional({ description: 'General clinical prescriber notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Prescription lifecycle status (DRAFT or ACTIVE)', default: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: true, description: 'CR-08: Whether patient should receive pharmacy pickup reminder' })
  @IsOptional()
  @IsBoolean()
  pickupReminderEnabled?: boolean;

  @ApiPropertyOptional({ example: 2, description: 'CR-08: Reminder interval in hours post-consultation' })
  @IsOptional()
  @IsInt()
  pickupReminderHours?: number;

  @ApiProperty({ type: [CreatePrescriptionItemDto], description: 'Medication items to be dispensed' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDto)
  items!: CreatePrescriptionItemDto[];
}

export class DiscontinuePrescriptionDto {
  @ApiProperty({ description: 'Clinical reason for discontinuing medication' })
  @IsNotEmpty()
  @IsString()
  reason!: string;
}

export class CreateRefillDto {
  @ApiPropertyOptional({ description: 'Refill notes or dispensation remarks' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckDrugInteractionRequestDto {
  @ApiPropertyOptional({ description: 'Patient Profile UUID to verify documented allergies and active medications' })
  @IsOptional()
  @IsString()
  patientProfileId?: string;

  @ApiProperty({ type: [CreatePrescriptionItemDto], description: 'List of proposed medications to screen' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDto)
  medications!: CreatePrescriptionItemDto[];
}

export class DrugInteractionAlertDto {
  @ApiProperty()
  drugA!: string;

  @ApiProperty()
  drugB!: string;

  @ApiProperty()
  severity!: 'MAJOR' | 'MODERATE' | 'MINOR';

  @ApiProperty()
  clinicalDescription!: string;

  @ApiProperty()
  recommendation!: string;

  @ApiProperty()
  source!: string;
}

export class AllergyAlertDto {
  @ApiProperty()
  drugName!: string;

  @ApiProperty()
  allergyMatched!: string;

  @ApiProperty()
  severity!: string;

  @ApiProperty()
  reaction!: string;
}

export class DuplicateTherapyAlertDto {
  @ApiProperty()
  drugA!: string;

  @ApiProperty()
  drugB!: string;

  @ApiProperty()
  therapeuticClass!: string;

  @ApiProperty()
  warning!: string;
}

export class CheckDrugInteractionResponseDto {
  @ApiProperty()
  hasConflict!: boolean;

  @ApiProperty({ enum: ['MAJOR', 'MODERATE', 'MINOR', 'NONE'] })
  severity!: 'MAJOR' | 'MODERATE' | 'MINOR' | 'NONE';

  @ApiProperty({ type: [DrugInteractionAlertDto] })
  interactions!: DrugInteractionAlertDto[];

  @ApiProperty({ type: [AllergyAlertDto] })
  allergyAlerts!: AllergyAlertDto[];

  @ApiProperty({ type: [DuplicateTherapyAlertDto] })
  duplicateTherapyAlerts!: DuplicateTherapyAlertDto[];
}

export class PrescriptionItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  prescriptionId!: string;

  @ApiProperty()
  drugName!: string;

  @ApiProperty()
  dosage!: string;

  @ApiProperty()
  form!: string;

  @ApiProperty()
  route!: string;

  @ApiProperty()
  frequency!: string;

  @ApiProperty()
  durationDays!: number;

  @ApiPropertyOptional()
  instructions?: string;
}

export class PrescriptionRefillResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  prescriptionId!: string;

  @ApiProperty()
  refillDate!: string;

  @ApiProperty()
  refillNumber!: number;

  @ApiPropertyOptional()
  notes?: string;
}

export class PrescriptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  patientProfileId!: string;

  @ApiProperty()
  doctorId!: string;

  @ApiPropertyOptional()
  doctorName?: string;

  @ApiPropertyOptional()
  diagnosisCode?: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  discontinueReason?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  prescribedAt!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: [PrescriptionItemResponseDto] })
  items!: PrescriptionItemResponseDto[];

  @ApiProperty({ type: [PrescriptionRefillResponseDto] })
  refills!: PrescriptionRefillResponseDto[];

  @ApiPropertyOptional({ example: true, description: 'CR-08: Whether patient pharmacy pickup reminder is active' })
  pickupReminderEnabled?: boolean;

  @ApiPropertyOptional({ example: 2, description: 'CR-08: Reminder interval in hours post-consultation' })
  pickupReminderHours?: number;

  @ApiPropertyOptional({ example: false, description: 'CR-08: Whether prescription has been collected' })
  collected?: boolean;

  @ApiPropertyOptional({ example: '2026-11-22T12:00:00.000Z', description: 'CR-08: Collection timestamp' })
  collectedAt?: string;
}
