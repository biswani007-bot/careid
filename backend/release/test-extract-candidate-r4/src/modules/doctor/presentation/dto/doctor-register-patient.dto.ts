import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EmergencyContactInputDto {
  @ApiProperty({ example: 'Jane Doe', description: 'Emergency contact full name' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'SPOUSE', description: 'Relationship to patient (e.g. SPOUSE, PARENT, SIBLING, FRIEND)' })
  @IsNotEmpty()
  @IsString()
  relationship!: string;

  @ApiProperty({ example: '+16505550005', description: 'Emergency contact phone number' })
  @IsNotEmpty()
  @IsString()
  phone!: string;
}

export class InitialVitalsInputDto {
  @ApiPropertyOptional({ example: 120, description: 'Systolic blood pressure (mmHg)' })
  @IsOptional()
  @IsNumber()
  systolicBp?: number;

  @ApiPropertyOptional({ example: 80, description: 'Diastolic blood pressure (mmHg)' })
  @IsOptional()
  @IsNumber()
  diastolicBp?: number;

  @ApiPropertyOptional({ example: 72, description: 'Pulse rate (beats per minute)' })
  @IsOptional()
  @IsNumber()
  pulseBpm?: number;

  @ApiPropertyOptional({ example: 36.8, description: 'Body temperature (°C)' })
  @IsOptional()
  @IsNumber()
  temperatureC?: number;

  @ApiPropertyOptional({ example: 70.5, description: 'Weight in kg' })
  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @ApiPropertyOptional({ example: 175, description: 'Height in cm' })
  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @ApiPropertyOptional({ example: 16, description: 'Respiration rate (breaths per minute)' })
  @IsOptional()
  @IsNumber()
  respirationRate?: number;

  @ApiPropertyOptional({ example: 98.0, description: 'Blood oxygen saturation percentage (% SpO2)' })
  @IsOptional()
  @IsNumber()
  oxygenSaturation?: number;
}

export class DoctorRegisterPatientDto {
  @ApiProperty({ example: 'John', description: 'Patient first name' })
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Doe', description: 'Patient last name' })
  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @ApiProperty({ example: '+16505550004', description: 'Patient mobile phone number for CareID authentication' })
  @IsNotEmpty()
  @IsString()
  phone!: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com', description: 'Patient email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '1985-06-15', description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'MALE', enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: 'O+', enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] })
  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @ApiPropertyOptional({ example: '123 Main Street', description: 'Street address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Metropolis' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'NY' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '10001' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'USA' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ type: EmergencyContactInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactInputDto)
  emergencyContact?: EmergencyContactInputDto;

  @ApiPropertyOptional({ example: 'Walk-in consultation for recurring migraine', description: 'Initial chief complaint' })
  @IsOptional()
  @IsString()
  initialChiefComplaint?: string;

  @ApiPropertyOptional({ example: 'Patient walked in without prior appointment. Initiated direct clinical registration.' })
  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @ApiPropertyOptional({ type: InitialVitalsInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InitialVitalsInputDto)
  initialVitals?: InitialVitalsInputDto;

  @ApiPropertyOptional({ example: 'fac-metro-001', description: 'Healthcare facility UUID where patient is registering' })
  @IsOptional()
  @IsString()
  facilityId?: string;
}

export class DoctorRegisterPatientResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Patient registered successfully in CareID Master Vault' })
  message!: string;

  @ApiProperty({ example: false, description: 'True if patient already had an existing account and was linked' })
  isExistingPatient!: boolean;

  @ApiProperty({ description: 'Created or linked patient profile' })
  patientProfile!: {
    id: string;
    userId: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string | null;
    gender?: string | null;
    bloodGroup?: string | null;
    phone?: string | null;
    email?: string | null;
    status: string;
    onboardingStep: number;
    createdAt: string;
  };

  @ApiPropertyOptional({ description: 'Active digital health card issued to the patient' })
  healthCard?: {
    id: string;
    cardNumber: string;
    status: string;
    expiresAt: string;
    qrPayload?: string | null;
  } | null;

  @ApiPropertyOptional({ description: 'Clinical authorization grant' })
  clinicalAuthorization!: {
    authorizedDoctorId: string;
    authSource: string;
    consentGranted: boolean;
    grantedAt: string;
  };

  @ApiPropertyOptional({ description: 'Initial encounter/record if vitals or complaint were provided' })
  initialRecord?: {
    id: string;
    title: string;
    chiefComplaint?: string | null;
    clinicalNotes?: string | null;
  } | null;
}

