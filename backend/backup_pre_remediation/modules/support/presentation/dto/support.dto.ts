import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTicketDto {
  @ApiProperty({ example: 'Cannot access my medical lab report' })
  @IsNotEmpty()
  @IsString()
  subject!: string;

  @ApiProperty({ example: 'When I tap on report attachment, it shows loading and times out' })
  @IsNotEmpty()
  @IsString()
  description!: string;

  @ApiProperty({ example: 'TECHNICAL', enum: ['TECHNICAL', 'BILLING', 'APPOINTMENT', 'ACCOUNT', 'GENERAL'], required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 'MEDIUM', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], required: false })
  @IsOptional()
  @IsString()
  priority?: string;
}

export class UpdateTicketDto {
  @ApiProperty({ required: false, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class TicketReplyDto {
  @ApiProperty({ example: 'We have resolved the attachment download issue. Please try again.' })
  @IsNotEmpty()
  @IsString()
  message!: string;
}

export class TicketQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SupportTicketResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() ticketNumber!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() subject!: string;
  @ApiProperty() description!: string;
  @ApiProperty() category!: string;
  @ApiProperty() priority!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true }) assignedTo?: string;
  @ApiProperty({ type: [Object], required: false }) replies?: any[];
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiPropertyOptional() isDemonstrationStorage?: boolean;
  @ApiPropertyOptional() storageNotice?: string;
}

