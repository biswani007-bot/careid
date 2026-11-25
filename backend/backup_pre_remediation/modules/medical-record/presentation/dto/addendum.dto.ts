import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateMedicalRecordAddendumDto {
  @ApiProperty({ description: 'Clinical remarks and additional findings to append' })
  @IsNotEmpty()
  @IsString()
  addendumNotes!: string;

  @ApiPropertyOptional({ description: 'Clinical justification or reason for addendum' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class MedicalRecordAddendumResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  medicalRecordId!: string;

  @ApiProperty()
  authorDoctorId!: string;

  @ApiProperty()
  authorName!: string;

  @ApiProperty()
  addendumNotes!: string;

  @ApiPropertyOptional()
  reason?: string;

  @ApiProperty()
  createdAt!: string;
}
