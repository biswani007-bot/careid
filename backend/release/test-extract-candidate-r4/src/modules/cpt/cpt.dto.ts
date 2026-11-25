import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

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

