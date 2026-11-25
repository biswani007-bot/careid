import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateRecordShareGrantDto {
  @ApiProperty({ description: 'Target recipient type: DOCTOR, FACILITY, or EMAIL', default: 'DOCTOR' })
  @IsNotEmpty()
  @IsString()
  recipientType!: string;

  @ApiProperty({ description: 'Recipient identifier: Doctor UUID, Facility UUID, or Email' })
  @IsNotEmpty()
  @IsString()
  recipientTarget!: string;

  @ApiProperty({ description: 'Clinical or legal purpose for sharing this record' })
  @IsNotEmpty()
  @IsString()
  purpose!: string;

  @ApiPropertyOptional({ description: 'Validity duration in hours (1 to 720 hours, default: 72)', default: 72 })
  @IsOptional()
  @IsNumber()
  expiryHours?: number;
}

export class RecordShareGrantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  medicalRecordId!: string;

  @ApiProperty()
  grantedByDoctorId!: string;

  @ApiProperty()
  recipientType!: string;

  @ApiProperty()
  recipientTarget!: string;

  @ApiProperty()
  purpose!: string;

  @ApiProperty()
  shareToken!: string;

  @ApiProperty()
  shareUrl!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty()
  isRevoked!: boolean;

  @ApiPropertyOptional()
  revokedAt?: string;

  @ApiProperty()
  accessCount!: number;

  @ApiProperty()
  createdAt!: string;
}
