import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InsuranceOcrScanDto {
  @ApiPropertyOptional({ example: 'https://storage.healthvault360.com/cards/ins-123.jpg', description: 'URL of the uploaded insurance card image (when uploading via JSON)' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Target patient profile UUID (for Admin/Staff or multi-profile operations)' })
  @IsOptional()
  @IsString()
  patientId?: string;
}

export class InsuranceOcrScanResponseDto {
  @ApiProperty({ example: 'ocr-uuid', description: 'Identifier of the created OCR task' })
  ocrId!: string;

  @ApiProperty({
    example: { providerName: 'Blue Shield', policyNumber: 'POL987654321', coverageDetails: 'OCR Extracted Details' },
    description: 'Extracted candidate policy values',
  })
  extractedData!: {
    providerName: string;
    policyNumber: string;
    coverageDetails?: string;
  };

  @ApiProperty({ example: 0.95, description: 'OCR extraction confidence score (0.0 to 1.0)' })
  confidence!: number;

  @ApiPropertyOptional({ example: true })
  isSimulated?: boolean;

  @ApiPropertyOptional({ example: 'SIMULATED_CPU_DEMO' })
  engine?: string;

  @ApiPropertyOptional()
  disclaimer?: string;
}
