import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail } from 'class-validator';

export class UpdateMeDto {
  @ApiProperty({ required: false, description: 'Updated email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Updated phone number' })
  @IsOptional()
  @IsString()
  phone?: string;
}

