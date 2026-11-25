import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UploadPatientPhotoDto {
  @ApiPropertyOptional({
    example: 'https://storage.healthvault360.com/photos/patient-1.jpg',
    description: 'Public or cloud storage URL of the photo (when uploading via JSON)',
  })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({
    example: 'patient-photos/patient-1.jpg',
    description: 'Storage key for the photo object',
  })
  @IsOptional()
  @IsString()
  photoKey?: string;
}

