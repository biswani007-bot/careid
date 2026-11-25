import { IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { Transform, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordLoginDto {
  @ApiProperty({
    example: 'superadmin@careid.test',
    description: 'Admin username or email address',
  })
  @Expose()
  @Transform(({ value, obj }) => {
    const raw = value ?? obj?.identifier ?? obj?.email ?? obj?.username ?? obj?.phone;
    return typeof raw === 'string' ? raw.trim() : raw;
  })
  @IsNotEmpty({ message: 'Identifier (username, email, or phone) is required' })
  @IsString({ message: 'Identifier must be a string' })
  identifier!: string;

  @ApiProperty({
    example: 'admin@careid.test',
    description: 'Email alias for identifier',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    example: 'superadmin',
    description: 'Username alias for identifier',
    required: false,
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({
    example: '+16505550001',
    description: 'Phone alias for identifier',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'SecureAdminPassword123!',
    description: 'Admin account password',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;
}

export class RoleSummaryDto {
  @ApiProperty({ example: 'e48f72dc-1839-4e4d-8cf4-14b89ee06bbd', description: 'Role unique identifier' })
  id!: string;

  @ApiProperty({ example: 'SUPER_ADMIN', description: 'Role name' })
  name!: string;
}

export class PasswordLoginUserDto {
  @ApiProperty({ example: '1099f683-d9bc-49e0-b4f1-697ded5dd51d', description: 'User unique identifier' })
  id!: string;

  @ApiProperty({ example: 'admin', description: 'User classification type' })
  user_type!: string;

  @ApiProperty({ type: RoleSummaryDto, description: 'Primary assigned role' })
  role!: RoleSummaryDto;

  @ApiProperty({ example: 'superadmin@careid.test', description: 'User email address', required: false })
  email?: string;

  @ApiProperty({ example: '+16505550001', description: 'Associated phone number', required: false })
  phone?: string;

  @ApiProperty({ example: 'ACTIVE', description: 'Account status' })
  status!: string;

  @ApiProperty({ example: ['SUPER_ADMIN'], description: 'Assigned platform roles' })
  roles!: string[];

  @ApiProperty({ example: ['read:all', 'write:all'], description: 'Assigned system permissions' })
  permissions!: string[];

  @ApiProperty({ example: 'HUMAN_HEALTHCARE', description: 'Clinical practice classification', required: false })
  clinicalPracticeType?: string;

  @ApiProperty({ description: 'Associated doctor profile', required: false })
  doctorProfile?: any;
}

export class PasswordLoginDataDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT access token' })
  access_token!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT refresh token' })
  refresh_token!: string;

  @ApiProperty({ example: 'Bearer', description: 'Authorization token type' })
  token_type!: string;

  @ApiProperty({ example: 3600, description: 'Access token expiration period in seconds' })
  expires_in!: number;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'CamelCase alias for access_token' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'CamelCase alias for refresh_token' })
  refreshToken!: string;

  @ApiProperty({ type: PasswordLoginUserDto, description: 'Authenticated administrator profile' })
  user!: PasswordLoginUserDto;
}

export class PasswordLoginResponseEnvelopeDto {
  @ApiProperty({ example: true, description: 'Operation execution flag' })
  success!: boolean;

  @ApiProperty({ example: 200, description: 'HTTP response status code' })
  statusCode!: number;

  @ApiProperty({ example: 'Login successful', description: 'Human-readable response message' })
  message!: string;

  @ApiProperty({ type: PasswordLoginDataDto, description: 'Authentication credentials and administrator profile' })
  data!: PasswordLoginDataDto;
}
