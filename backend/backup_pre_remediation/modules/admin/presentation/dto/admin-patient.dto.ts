import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '@common/dto/pagination.dto';

export class AdminPatientQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search query across name, phone, email, or patient number' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by patient profile status (e.g. DRAFT, COMPLETED)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by gender' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'Filter by blood group' })
  @IsOptional()
  @IsString()
  bloodGroup?: string;
}

export class AdminPatientSummaryResponseDto {
  @ApiProperty({ example: 'patient-profile-uuid' })
  id!: string;

  @ApiProperty({ example: 'user-uuid' })
  userId!: string;

  @ApiProperty({ example: 'P-100234', nullable: true })
  patientNumber!: string | null;

  @ApiProperty({ example: 'Jane', nullable: true })
  firstName!: string | null;

  @ApiProperty({ example: 'Doe', nullable: true })
  lastName!: string | null;

  @ApiProperty({ example: '1990-05-15T00:00:00.000Z', nullable: true })
  dateOfBirth!: string | null;

  @ApiProperty({ example: 'FEMALE', nullable: true })
  gender!: string | null;

  @ApiProperty({ example: 'O+', nullable: true })
  bloodGroup!: string | null;

  @ApiProperty({ example: 'Pakistani', nullable: true })
  nationality!: string | null;

  @ApiProperty({ example: '+923001234567' })
  phone!: string;

  @ApiProperty({ example: 'jane.doe@example.com', nullable: true })
  email!: string | null;

  @ApiProperty({ example: 'ACTIVE' })
  userStatus!: string;

  @ApiProperty({ example: 'COMPLETED' })
  profileStatus!: string;

  @ApiProperty({ example: 6 })
  onboardingStep!: number;

  @ApiProperty({ example: '2026-01-10T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-01-15T12:00:00.000Z' })
  updatedAt!: string;
}

export class AdminEmergencyContactDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  relationship!: string;

  @ApiProperty()
  phone!: string;
}

export class AdminPatientDetailResponseDto extends AdminPatientSummaryResponseDto {
  @ApiProperty({ nullable: true })
  occupation!: string | null;

  @ApiProperty({ nullable: true })
  maritalStatus!: string | null;

  @ApiProperty({ isArray: true })
  languages!: string[];

  @ApiProperty({ nullable: true })
  address!: string | null;

  @ApiProperty({ nullable: true })
  currentAddressLine1!: string | null;

  @ApiProperty({ nullable: true })
  currentAddressLine2!: string | null;

  @ApiProperty({ nullable: true })
  currentCity!: string | null;

  @ApiProperty({ nullable: true })
  currentState!: string | null;

  @ApiProperty({ nullable: true })
  currentDistrict!: string | null;

  @ApiProperty({ nullable: true })
  currentPostalCode!: string | null;

  @ApiProperty({ nullable: true })
  currentCountry!: string | null;

  @ApiProperty({ nullable: true })
  permanentAddressLine1!: string | null;

  @ApiProperty({ nullable: true })
  permanentCity!: string | null;

  @ApiProperty({ nullable: true })
  permanentState!: string | null;

  @ApiProperty({ nullable: true })
  permanentPostalCode!: string | null;

  @ApiProperty({ nullable: true })
  permanentCountry!: string | null;

  @ApiProperty({ nullable: true })
  photoUrl!: string | null;

  @ApiProperty({ isArray: true })
  knownAllergies!: string[];

  @ApiProperty({ isArray: true })
  chronicConditions!: string[];

  @ApiProperty({ isArray: true })
  disabilities!: string[];

  @ApiProperty({ nullable: true })
  prefContactMethod!: string | null;

  @ApiProperty({ type: AdminEmergencyContactDto, nullable: true })
  emergencyContact?: AdminEmergencyContactDto | null;

  @ApiProperty({ nullable: true })
  insurancePolicy?: {
    id: string;
    policyNumber: string;
    providerName: string;
    status: string;
  } | null;

  @ApiProperty({ nullable: true })
  healthCard?: {
    id: string;
    cardNumber: string;
    status: string;
  } | null;
}

export class AdminCreatePatientDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName!: string;

  @ApiProperty({ example: '1990-05-15' })
  @IsString()
  dob!: string;

  @ApiProperty({ example: 'MALE' })
  @IsString()
  gender!: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: '+923001234567' })
  @IsString()
  phone!: string;

  @ApiPropertyOptional({ example: '75000' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ example: '742 Evergreen Terrace, Springfield' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ example: 'O+' })
  @IsOptional()
  @IsString()
  bloodGroup?: string;
}

export class AdminUpdatePatientDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsString()
  dob?: string;

  @ApiPropertyOptional({ example: 'MALE' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: 'O+' })
  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @ApiPropertyOptional({ example: '742 Evergreen Terrace, Springfield' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '742 Evergreen Terrace, Springfield' })
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiPropertyOptional({ example: '75000' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '+923001234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}


