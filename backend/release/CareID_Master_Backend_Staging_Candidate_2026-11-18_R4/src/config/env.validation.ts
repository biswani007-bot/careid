import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export enum Environment {
  Development = 'development',
  Staging = 'staging',
  Test = 'test',
  Production = 'production',
}

export class EnvironmentVariablesDto {
  @IsNumber()
  PORT!: number;

  @IsEnum(Environment)
  NODE_ENV!: Environment;

  @IsOptional()
  @IsEnum(Environment)
  APP_ENV?: Environment;

  @IsOptional()
  @IsEnum(Environment)
  DEPLOYMENT_ENV?: Environment;

  @IsOptional()
  @IsString()
  ENABLE_TEST_OTP?: string;

  @IsOptional()
  @IsString()
  TEST_PHONE_NUMBERS?: string;

  @IsOptional()
  @IsString()
  TEST_OTP_CODE?: string;

  @IsString()
  GLOBAL_PREFIX!: string;

  @IsString()
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  JWT_SECRET?: string;

  @IsOptional()
  @IsString()
  CORS_ALLOWED_ORIGINS?: string;

  @IsOptional()
  @IsString()
  ALLOWED_ORIGINS?: string;

  @IsOptional()
  @IsString()
  HOST?: string;

  @IsOptional()
  @IsString()
  TRUST_PROXY?: string;

  @IsOptional()
  @IsNumber()
  DB_POOL_MAX?: number;

  @IsOptional()
  @IsNumber()
  DB_CONNECTION_TIMEOUT_MS?: number;

  @IsOptional()
  @IsNumber()
  DB_IDLE_TIMEOUT_MS?: number;

  @IsOptional()
  @IsString()
  DATABASE_SSL?: string;

  @IsOptional()
  @IsString()
  DATABASE_SSL_REJECT_UNAUTHORIZED?: string;

  @IsOptional()
  @IsString()
  B2_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  B2_REGION?: string;

  @IsOptional()
  @IsString()
  B2_BUCKET_NAME?: string;

  @IsOptional()
  @IsString()
  B2_KEY_ID?: string;

  @IsOptional()
  @IsString()
  B2_APPLICATION_KEY?: string;

  @IsOptional()
  @IsNumber()
  B2_DOWNLOAD_EXPIRY_SECONDS?: number;

  @IsOptional()
  @IsString()
  FINANCING_ENCRYPTION_KEY?: string;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariablesDto, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Environment Validation Error: ${errors.toString()}`);
  }

  const rawNodeEnv = String(config.NODE_ENV || '').trim().toLowerCase();
  const rawAppEnv = config.APP_ENV !== undefined && config.APP_ENV !== null && String(config.APP_ENV).trim() !== ''
    ? String(config.APP_ENV).trim().toLowerCase()
    : undefined;
  const rawDepEnv = config.DEPLOYMENT_ENV !== undefined && config.DEPLOYMENT_ENV !== null && String(config.DEPLOYMENT_ENV).trim() !== ''
    ? String(config.DEPLOYMENT_ENV).trim().toLowerCase()
    : undefined;

  const validEnvs = Object.values(Environment) as string[];
  if (rawAppEnv && !validEnvs.includes(rawAppEnv)) {
    throw new Error(
      `Environment Validation Error: Invalid APP_ENV='${rawAppEnv}'. Must be one of: ${validEnvs.join(', ')}.`,
    );
  }
  if (rawDepEnv && !validEnvs.includes(rawDepEnv)) {
    throw new Error(
      `Environment Validation Error: Invalid DEPLOYMENT_ENV='${rawDepEnv}'. Must be one of: ${validEnvs.join(', ')}.`,
    );
  }

  const enableTestOtp = config.ENABLE_TEST_OTP === 'true' || config.ENABLE_TEST_OTP === true;
  const eitherIsProduction = rawAppEnv === Environment.Production || rawDepEnv === Environment.Production;

  // Reject conflicting deployment-environment declarations
  if (rawAppEnv && rawDepEnv && rawAppEnv !== rawDepEnv) {
    throw new Error(
      `Environment Validation Error: Conflicting environment declarations detected: APP_ENV='${rawAppEnv}' and DEPLOYMENT_ENV='${rawDepEnv}'. Both variables must be consistent when present.`,
    );
  }

  const resolvedAppEnv = rawAppEnv || rawDepEnv;
  const isExplicitStagingOrTest = !eitherIsProduction && [Environment.Staging, Environment.Test].includes(resolvedAppEnv as Environment);

  const isProduction = eitherIsProduction || (!isExplicitStagingOrTest && rawNodeEnv === Environment.Production);
  const isStaging = isExplicitStagingOrTest || (!eitherIsProduction && (rawNodeEnv === Environment.Staging || rawNodeEnv === Environment.Test));

  // Test OTP validation: disabled by default; when enabled, strictly validated across all environments
  if (enableTestOtp) {
    const rawTestOtp = String(config.TEST_OTP_CODE || '').trim();
    if (!/^\d{6}$/.test(rawTestOtp)) {
      throw new Error(
        'Environment Validation Error: When ENABLE_TEST_OTP is true, TEST_OTP_CODE must be a valid 6-digit numeric string.',
      );
    }
    const rawWhitelist = String(config.TEST_PHONE_NUMBERS || '').trim();
    const numbers = rawWhitelist.split(',').map((p) => p.trim()).filter(Boolean);
    if (numbers.length === 0) {
      throw new Error(
        'Environment Validation Error: When ENABLE_TEST_OTP is true, TEST_PHONE_NUMBERS must contain at least one allowlisted phone number.',
      );
    }

    // In production, test OTP is strictly restricted for controlled testing: wildcards (*) are forbidden
    if (isProduction) {
      if (numbers.includes('*')) {
        throw new Error(
          'CRITICAL SECURITY ERROR: Wildcard (*) is strictly forbidden in TEST_PHONE_NUMBERS in a production environment.',
        );
      }
    }
  }

  if (isProduction || isStaging) {
    const rawJwtSecret = (config.JWT_SECRET as string) || '';
    const knownDefaultSecrets = [
      'hvapi_default_secret_key',
      'secret',
      'secret123',
      'changeme',
      'default_secret',
      'your_jwt_secret_key_here',
      'your-jwt-secret',
    ];

    if (!rawJwtSecret || rawJwtSecret.trim() === '') {
      throw new Error(
        'Environment Validation Error: JWT_SECRET is required in production and staging environments.',
      );
    }

    if (knownDefaultSecrets.includes(rawJwtSecret.trim().toLowerCase()) || rawJwtSecret.length < 32) {
      throw new Error(
        'Environment Validation Error: Production/staging JWT_SECRET must be at least 32 characters and cannot use a known default secret.',
      );
    }
  }

  if (isProduction) {
    const rawCors = (config.CORS_ALLOWED_ORIGINS as string) || (config.ALLOWED_ORIGINS as string) || '';
    const origins = rawCors.split(',').map((o) => o.trim()).filter(Boolean);
    if (origins.length === 0) {
      throw new Error(
        'Environment Validation Error: Production requires explicitly configured CORS_ALLOWED_ORIGINS (or ALLOWED_ORIGINS). Failing safely.',
      );
    }
    if (origins.some((o) => o === '*' || o.includes('*'))) {
      throw new Error(
        'Environment Validation Error: Production CORS_ALLOWED_ORIGINS cannot contain wildcards (*). Failing safely.',
      );
    }
  }

  if (config.FINANCING_ENCRYPTION_KEY) {
    const rawKey = String(config.FINANCING_ENCRYPTION_KEY).trim();
    if (!/^[0-9a-fA-F]{64}$/.test(rawKey)) {
      throw new Error(
        'Environment Validation Error: FINANCING_ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes).',
      );
    }
  }

  return validatedConfig;
}
