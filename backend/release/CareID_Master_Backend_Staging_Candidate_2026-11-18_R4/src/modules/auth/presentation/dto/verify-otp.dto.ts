import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'OTP challenge session UUID' })
  @IsNotEmpty()
  @IsUUID('4', { message: 'challengeId must be a valid UUIDv4' })
  challengeId!: string;

  @ApiProperty({ example: '123456', description: '6-digit numeric OTP code' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'otpCode must be a 6-digit numeric code' })
  otpCode!: string;

  @ApiProperty({ example: '+14155552671', description: 'Optional user phone number for cross-challenge binding', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone number must follow E.164 format (e.g. +14155552671)' })
  phone?: string;

  @ApiProperty({ example: 'DOCTOR', description: 'Optional target role requirement during verification', required: false })
  @IsOptional()
  @IsString()
  role?: string;
}

export class VerifyOtpResponseDto {
  @ApiProperty({ example: 'jwt.access.token', description: 'Short-lived JWT access token' })
  accessToken!: string;

  @ApiProperty({ example: 'jwt.refresh.token', description: 'Long-lived refresh token' })
  refreshToken!: string;

  @ApiProperty({ example: '15m', description: 'Access token expiration period' })
  expiresIn!: string;

  @ApiProperty({ description: 'User account summary', required: false })
  user?: any;

  @ApiProperty({ description: 'User roles list', required: false })
  roles?: string[];

  @ApiProperty({ description: 'Doctor profile if user is a registered doctor', required: false })
  doctorProfile?: any;

  @ApiProperty({ description: 'Patient profile if user is a registered patient', required: false })
  patientProfile?: any;
}
