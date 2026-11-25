import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminRegisterDoctorDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Unique ID of the existing user account (must have DOCTOR role)',
  })
  @IsNotEmpty()
  @IsString()
  userId!: string;

  @ApiProperty({ example: 'Dr. Sarah Jenkins, MD' })
  @IsNotEmpty()
  @IsString()
  fullName!: string;

  @ApiProperty({ example: 'Cardiology' })
  @IsNotEmpty()
  @IsString()
  primarySpecialization!: string;

  @ApiProperty({ example: 'Pakistan Medical & Dental Council (PMDC)' })
  @IsNotEmpty()
  @IsString()
  medicalCouncil!: string;

  @ApiProperty({
    example: 'PMC-REG-998877',
    description: 'Unique medical registration number',
  })
  @IsNotEmpty()
  @IsString()
  registrationNumber!: string;

  @ApiProperty({
    example: 'LIC-2026-CARDIO-1',
    description: 'Unique medical license number',
  })
  @IsNotEmpty()
  @IsString()
  licenseNumber!: string;

  @ApiProperty({ example: 'FEMALE', required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ example: '1985-06-20', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    example: 'https://storage.healthvault360.com/doctors/photo-dr-sarah.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @ApiProperty({
    example: 'https://storage.healthvault360.com/doctors/sig-dr-sarah.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  digitalSignatureUrl?: string;

  @ApiProperty({
    example: 'Senior Consultant Cardiologist specializing in adult interventional cardiology.',
    required: false,
  })
  @IsOptional()
  @IsString()
  biography?: string;

  @ApiProperty({
    example: 'Expertise in cardiac catheterization, coronary stenting, and echocardiography.',
    required: false,
  })
  @IsOptional()
  @IsString()
  professionalSummary?: string;

  @ApiProperty({ example: 12, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @ApiProperty({
    example: ['Interventional Cardiology', 'Adult Congenital Heart Disease'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondarySpecializations?: string[];

  @ApiProperty({ example: 'Punjab', required: false })
  @IsOptional()
  @IsString()
  registrationState?: string;

  @ApiProperty({ example: 'Pakistan', required: false })
  @IsOptional()
  @IsString()
  registrationCountry?: string;

  @ApiProperty({ example: '2014-07-01', required: false })
  @IsOptional()
  @IsDateString()
  registrationIssueDate?: string;

  @ApiProperty({ example: '2029-06-30', required: false })
  @IsOptional()
  @IsDateString()
  registrationExpiryDate?: string;

  @ApiProperty({ example: 'Department of Cardiology', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({
    example: ['Coronary Angioplasty', 'Heart Failure Management'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subSpecializations?: string[];

  @ApiProperty({
    example: ['Valvular Heart Disease', 'Hypertension'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clinicalInterests?: string[];

  @ApiProperty({
    example: ['ECG', 'Echocardiogram', 'Angiography Consultation'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  servicesOffered?: string[];

  @ApiProperty({
    example: ['English', 'Urdu'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languagesSpoken?: string[];

  @ApiProperty({ example: '+92-300-9876543', required: false })
  @IsOptional()
  @IsString()
  emergencyPhone?: string;
}

export class AdminDoctorUserSummaryDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: '+923001234567', nullable: true, required: false })
  phone?: string;

  @ApiProperty({ example: 'doctor@careid.com', nullable: true, required: false })
  email?: string;
}

export class AdminDoctorResponseDto {
  @ApiProperty({ example: 'd0c70000-0000-0000-0000-000000000001' })
  id!: string;

  @ApiProperty({ example: 'd0c70000-0000-0000-0000-000000000001' })
  doctorProfileId!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  userId!: string;

  @ApiProperty({ example: 'Dr. Sarah Jenkins, MD' })
  fullName!: string;

  @ApiProperty({ type: AdminDoctorUserSummaryDto })
  user!: AdminDoctorUserSummaryDto;

  @ApiProperty({ example: '+923001234567', nullable: true, required: false })
  phone?: string;

  @ApiProperty({ example: 'doctor@careid.com', nullable: true, required: false })
  email?: string;

  @ApiProperty({ example: 'Cardiology' })
  primarySpecialization!: string;

  @ApiProperty({
    example: ['Interventional Cardiology'],
    type: [String],
    required: false,
  })
  secondarySpecializations?: string[];

  @ApiProperty({ example: 'Pakistan Medical & Dental Council (PMDC)' })
  medicalCouncil!: string;

  @ApiProperty({ example: 'PMC-REG-998877' })
  registrationNumber!: string;

  @ApiProperty({ example: 'LIC-2026-CARDIO-1' })
  licenseNumber!: string;

  @ApiProperty({ example: 'DOC-360-123456' })
  providerIdentifier!: string;

  @ApiProperty({ example: 'PENDING' })
  verificationStatus!: string;

  @ApiProperty({ example: 12, required: false })
  yearsOfExperience?: number;

  @ApiProperty({ example: 'Department of Cardiology', nullable: true, required: false })
  department?: string;

  @ApiProperty({ example: 'FEMALE', nullable: true, required: false })
  gender?: string;

  @ApiProperty({ example: '1985-06-20', nullable: true, required: false })
  dateOfBirth?: string;

  @ApiProperty({ example: 'Punjab', nullable: true, required: false })
  registrationState?: string;

  @ApiProperty({ example: 'Pakistan', nullable: true, required: false })
  registrationCountry?: string;

  @ApiProperty({ example: '2014-07-01', nullable: true, required: false })
  registrationIssueDate?: string;

  @ApiProperty({ example: '2029-06-30', nullable: true, required: false })
  registrationExpiryDate?: string;

  @ApiProperty({ type: [String], required: false })
  subSpecializations?: string[];

  @ApiProperty({ type: [String], required: false })
  clinicalInterests?: string[];

  @ApiProperty({ type: [String], required: false })
  servicesOffered?: string[];

  @ApiProperty({ type: [String], required: false })
  languagesSpoken?: string[];

  @ApiProperty({ example: '+92-300-9876543', nullable: true, required: false })
  emergencyPhone?: string;

  @ApiProperty({ nullable: true, required: false })
  biography?: string;

  @ApiProperty({ nullable: true, required: false })
  professionalSummary?: string;

  @ApiProperty({ nullable: true, required: false })
  profilePhotoUrl?: string;

  @ApiProperty({ nullable: true, required: false })
  digitalSignatureUrl?: string;

  @ApiProperty({ example: '2026-11-03T18:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-11-03T18:00:00.000Z' })
  updatedAt!: string;
}

