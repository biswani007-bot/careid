import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({
    example: 'admin@careid.test',
    description: 'Admin or Super Admin account email address (case-insensitive)',
  })
  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @ApiProperty({
    example: 'the-seeded-password',
    description: 'Admin account password',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;
}

export class AdminUserSummaryDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'User unique identifier' })
  id!: string;

  @ApiProperty({ example: 'admin@careid.test', description: 'Admin email address' })
  email!: string;

  @ApiProperty({ example: '+16505550002', description: 'Associated phone number', required: false })
  phone?: string;

  @ApiProperty({ example: 'ACTIVE', description: 'Account status' })
  status!: string;

  @ApiProperty({ example: ['ADMIN'], description: 'Assigned roles' })
  roles!: string[];

  @ApiProperty({ example: ['read:all', 'write:all', 'read:audit-logs'], description: 'Assigned permissions' })
  permissions!: string[];
}

export class AdminLoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'Short-lived JWT access token' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'Long-lived refresh token' })
  refreshToken!: string;

  @ApiProperty({ example: '15m', description: 'Access token expiration period' })
  expiresIn!: string;

  @ApiProperty({ type: AdminUserSummaryDto, description: 'Authenticated admin profile' })
  user!: AdminUserSummaryDto;
}
