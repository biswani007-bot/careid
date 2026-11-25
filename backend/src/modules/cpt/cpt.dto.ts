import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsNotEmpty, IsNumber, IsBoolean, IsIn } from 'class-validator';

export class CptItemDto {
  @ApiProperty({ example: '93458' })
  code!: string;

  @ApiProperty({ example: 'Left heart catheterization with coronary angiography' })
  name!: string;

  @ApiProperty({ example: 'CARDIOLOGY' })
  category!: string;

  @ApiPropertyOptional({ example: 'Left heart catheterization including intraprocedural coronary angiography and left ventriculography' })
  description?: string;

  @ApiPropertyOptional({ example: 150000 })
  standardCharge?: number;

  @ApiPropertyOptional({ example: 4.5 })
  rvu?: number;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  status?: string;

  @ApiPropertyOptional({ example: true, description: 'True if official licensed AMA CPT code; false for facility-specific/local procedures' })
  isOfficialCpt?: boolean;
}

export class CptQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category (e.g. CARDIOLOGY, SURGICAL, LABORATORY, RADIOLOGY)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Search term for CPT code or procedure description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status (ACTIVE, INACTIVE, ALL)', default: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class CreateProcedureDto {
  @ApiProperty({ example: '93458', description: 'Unique procedure code (e.g. 5-digit CPT or facility identifier LOCAL-PROC-01)' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'Left heart catheterization with coronary angiography' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'CARDIOLOGY' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiPropertyOptional({ example: 'Comprehensive coronary angiography with hemodynamics' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @IsNumber()
  standardCharge?: number;

  @ApiPropertyOptional({ example: 4.5 })
  @IsOptional()
  @IsNumber()
  rvu?: number;

  @ApiPropertyOptional({ example: 'ACTIVE', enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;

  @ApiPropertyOptional({ example: false, description: 'Designates whether this is an official AMA CPT code or a facility local procedure' })
  @IsOptional()
  @IsBoolean()
  isOfficialCpt?: boolean;
}

export class UpdateProcedureDto {
  @ApiPropertyOptional({ example: 'Updated Left Heart Catheterization description' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'CARDIOLOGY' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Updated clinical notes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 160000 })
  @IsOptional()
  @IsNumber()
  standardCharge?: number;

  @ApiPropertyOptional({ example: 5.0 })
  @IsOptional()
  @IsNumber()
  rvu?: number;

  @ApiPropertyOptional({ example: 'INACTIVE', enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isOfficialCpt?: boolean;
}
