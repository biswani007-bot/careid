import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePetDto {
  @ApiProperty({ example: 'Max' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'DOG', description: 'DOG, CAT, BIRD, OTHER' })
  @IsNotEmpty()
  @IsString()
  species!: string;

  @ApiProperty({ example: 'Golden Retriever', required: false })
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiProperty({ example: 3, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  age?: number;

  @ApiProperty({ example: '2023-04-12', required: false })
  @IsOptional()
  @IsString()
  dob?: string;

  @ApiProperty({ example: 'MALE', enum: ['MALE', 'FEMALE', 'UNKNOWN'], required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ example: 28.5, description: 'Weight in kg', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiProperty({ example: '985141002341592', required: false })
  @IsOptional()
  @IsString()
  microchipId?: string;

  @ApiProperty({ example: 'Allergic to chicken proteins', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePetDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  species?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  age?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dob?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  microchipId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddPetVaccinationDto {
  @ApiProperty({ example: 'Rabies Booster' })
  @IsNotEmpty()
  @IsString()
  vaccineName!: string;

  @ApiProperty({ example: '2026-02-15' })
  @IsNotEmpty()
  @IsString()
  administeredDate!: string;

  @ApiProperty({ example: '2027-02-15', required: false })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiProperty({ example: 'RAB-9921', required: false })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiProperty({ example: 'Dr. Sarah Wilson', required: false })
  @IsOptional()
  @IsString()
  veterinarian?: string;

  @ApiProperty({ example: 'City Veterinary Hospital', required: false })
  @IsOptional()
  @IsString()
  clinicName?: string;

  @ApiProperty({ example: 'Administered in right shoulder, no adverse reaction', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PetVaccinationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() petId!: string;
  @ApiProperty() vaccineName!: string;
  @ApiProperty() administeredDate!: string;
  @ApiProperty({ nullable: true }) dueDate?: string;
  @ApiProperty({ nullable: true }) batchNumber?: string;
  @ApiProperty({ nullable: true }) veterinarian?: string;
  @ApiProperty({ nullable: true }) clinicName?: string;
  @ApiProperty({ nullable: true }) notes?: string;
  @ApiProperty() createdAt!: string;
}

export class CreatePetClinicalRecordDto {
  @ApiProperty({ example: 'Canine Parvovirus Enteritis' })
  @IsNotEmpty()
  @IsString()
  diagnosis!: string;

  @ApiPropertyOptional({ example: 'IV fluid hydration, antiemetics, broad spectrum antibiotic prophylaxis' })
  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @ApiPropertyOptional({ example: 'Patient showing moderate lethargy and dehydration' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 12.5 })
  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @ApiPropertyOptional({ example: 38.8 })
  @IsOptional()
  @IsNumber()
  temperatureC?: number;
}

export class PetClinicalRecordResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() petId!: string;
  @ApiProperty() doctorId!: string;
  @ApiPropertyOptional() doctorName?: string;
  @ApiProperty() diagnosis!: string;
  @ApiPropertyOptional() treatmentPlan?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiPropertyOptional() weightKg?: number;
  @ApiPropertyOptional() temperatureC?: number;
  @ApiProperty() createdAt!: string;
}

export class PetTimelineItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() eventType!: 'VACCINATION' | 'CLINICAL_RECORD' | 'DOCUMENT';
  @ApiProperty() title!: string;
  @ApiProperty() date!: string;
  @ApiPropertyOptional() details?: any;
}

export class PetResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() ownerUserId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() species!: string;
  @ApiProperty({ nullable: true }) breed?: string;
  @ApiProperty({ nullable: true }) age?: number;
  @ApiProperty({ nullable: true }) dob?: string;
  @ApiProperty({ nullable: true }) gender?: string;
  @ApiProperty({ nullable: true }) weight?: number;
  @ApiProperty({ nullable: true }) microchipId?: string;
  @ApiProperty({ nullable: true }) notes?: string;
  @ApiPropertyOptional({ nullable: true }) ownerName?: string;
  @ApiPropertyOptional({ nullable: true }) ownerPhone?: string;
  @ApiPropertyOptional({ nullable: true }) ownerEmail?: string;
  @ApiProperty({ type: [PetVaccinationResponseDto], required: false }) vaccinations?: PetVaccinationResponseDto[];
  @ApiProperty({ type: [PetClinicalRecordResponseDto], required: false }) clinicalRecords?: PetClinicalRecordResponseDto[];
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiPropertyOptional() isDemonstrationStorage?: boolean;
  @ApiPropertyOptional() storageNotice?: string;
}

