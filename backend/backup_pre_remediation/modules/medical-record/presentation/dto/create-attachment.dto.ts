import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, Min, Max, IsIn, IsUrl, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AttachmentCategory } from './create-medical-record.dto';

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'application/dicom',
] as const;

export class CreateAttachmentDto {
  @ApiProperty({ example: 'patient-profile-uuid', required: false, description: 'Target patient profile ID (required for clinical/doctor uploads)' })
  @IsOptional()
  @IsString()
  patientProfileId?: string;

  @ApiProperty({ example: 'patient-profile-uuid', required: false, description: 'Target patient ID alias' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiProperty({ example: 'blood_report_2026.pdf', description: 'Target filename' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(?!.*(\.\.|\0|[\\/]))[a-zA-Z0-9_. -]+$/, {
    message: 'fileName must not contain path separators (/, \\), path traversal (..), or null bytes',
  })
  fileName!: string;

  @ApiProperty({ example: 'Blood_Test_Report_Final.pdf', description: 'Original uploaded filename' })
  @IsNotEmpty()
  @IsString()
  originalName!: string;

  @ApiProperty({ example: 1048576, description: 'File size in bytes (max 15MB)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(15 * 1024 * 1024, { message: 'fileSize must not exceed 15MB (15728640 bytes)' })
  fileSize!: number;

  @ApiProperty({ example: 'application/pdf', description: 'MIME content type', enum: ALLOWED_ATTACHMENT_MIME_TYPES })
  @IsNotEmpty()
  @IsString()
  @IsIn(ALLOWED_ATTACHMENT_MIME_TYPES, { message: 'mimeType must be one of the permitted clinical attachment types' })
  mimeType!: string;

  @ApiProperty({ enum: AttachmentCategory, example: 'LAB_RESULT', required: false })
  @IsOptional()
  @IsEnum(AttachmentCategory)
  category?: AttachmentCategory;

  @ApiProperty({ example: 'attachments/2026/07/blood_report_2026.pdf', description: 'Storage key/path' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(?!.*(\.\.|\0|\\))[a-zA-Z0-9_./-]+$/, {
    message: 'storageKey must not contain path traversal sequences (.., \\, null bytes)',
  })
  storageKey!: string;

  @ApiProperty({ example: 'https://cdn.hvapi.com/attachments/2026/07/blood_report_2026.pdf', description: 'CDN or direct retrieval URL' })
  @IsNotEmpty()
  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })
  storageUrl!: string;

  @ApiProperty({ example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', required: false })
  @IsOptional()
  @IsString()
  checksum?: string;
}

export class UpdateAttachmentDto {
  @ApiProperty({ enum: AttachmentCategory, required: false })
  @IsOptional()
  @IsEnum(AttachmentCategory)
  category?: AttachmentCategory;

  @ApiProperty({ example: 'updated_file_name.pdf', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^(?!.*(\.\.|\0|[\\/]))[a-zA-Z0-9_. -]+$/, {
    message: 'fileName must not contain path separators (/, \\), path traversal (..), or null bytes',
  })
  fileName?: string;

  @ApiProperty({ example: 'attachments/2026/07/new_version.pdf', required: false, description: 'New storage key if uploading new version' })
  @IsOptional()
  @IsString()
  @Matches(/^(?!.*(\.\.|\0|\\))[a-zA-Z0-9_./-]+$/, {
    message: 'storageKey must not contain path traversal sequences (.., \\, null bytes)',
  })
  storageKey?: string;

  @ApiProperty({ example: 'https://cdn.hvapi.com/attachments/2026/07/new_version.pdf', required: false })
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })
  storageUrl?: string;

  @ApiProperty({ example: 2048576, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(15 * 1024 * 1024, { message: 'fileSize must not exceed 15MB (15728640 bytes)' })
  fileSize?: number;
}
