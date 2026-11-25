import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class FinancingOptionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() partnerName!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() minAmount!: number;
  @ApiProperty() maxAmount!: number;
  @ApiProperty({ type: [Number] }) tenureMonths!: number[];
  @ApiProperty() interestRate!: number;
  @ApiProperty() processingFee!: number;
  @ApiProperty({ type: [String] }) features!: string[];
  @ApiPropertyOptional() isDemonstrationCatalog?: boolean;
  @ApiPropertyOptional() disclaimer?: string;
}

export class ApplyFinancingDto {
  @ApiProperty({ example: 'opt-zerocost-care' })
  @IsNotEmpty()
  @IsString()
  optionId!: string;

  @ApiProperty({ example: 'fac-1001', required: false })
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiProperty({ example: 'Orthopedic Knee Replacement Surgery', required: false })
  @IsOptional()
  @IsString()
  treatmentName?: string;

  @ApiProperty({ example: 50000 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1000)
  requestedAmount!: number;

  @ApiProperty({ example: 6, description: 'Tenure in months' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  tenureMonths!: number;

  @ApiProperty({ example: 65000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyIncome?: number;

  @ApiProperty({ example: 'SALARIED', required: false, enum: ['SALARIED', 'SELF_EMPLOYED', 'BUSINESS', 'OTHER'] })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiProperty({ example: 'ABCDE1234F', required: false })
  @IsOptional()
  @IsString()
  panOrNationalId?: string;

  @ApiProperty({ example: 'Planned surgery next month', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateApplicationStatusDto {
  @ApiProperty({ enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED'] })
  @IsNotEmpty()
  @IsString()
  status!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AcceptFinancingOfferDto {
  @ApiPropertyOptional({
    description: 'Patient acceptance notes or special instructions for underwriting',
    example: 'Patient accepts verified partner financing terms. Initiate credit underwriting review.',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Patient consent confirmation for credit underwriting',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  signatureConsent?: boolean;
}

export class RejectFinancingOfferDto {
  @ApiPropertyOptional({
    description: 'Patient decline rationale for financing assistance',
    example: 'Patient declined financing assistance; choosing self-pay.',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Alias for reason',
    example: 'Patient declined financing assistance; choosing self-pay.',
  })
  @IsOptional()
  @IsString()
  declineReason?: string;
}

export class FinancingApplicationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() applicationNumber!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() optionId!: string;
  @ApiProperty() partnerName!: string;
  @ApiProperty({ nullable: true }) treatmentName?: string;
  @ApiProperty() requestedAmount!: number;
  @ApiProperty() tenureMonths!: number;
  @ApiProperty() monthlyEstimatedEmi!: number;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true }) adminNotes?: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiPropertyOptional() isDemonstrationStorage?: boolean;
  @ApiPropertyOptional() storageNotice?: string;
}

