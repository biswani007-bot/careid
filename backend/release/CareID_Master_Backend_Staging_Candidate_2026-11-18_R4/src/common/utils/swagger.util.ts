/**
 * Resolves whether Swagger/OpenAPI documentation should be enabled.
 *
 * Security Rules (SEC-AUD-07):
 * 1. Disabled in production by default (NODE_ENV === 'production').
 * 2. Enabled in non-production environments (development, test, staging, or unset).
 * 3. In production, requires explicit opt-in override: ENABLE_SWAGGER === 'true'.
 */
export function shouldEnableSwagger(nodeEnv?: string, enableSwaggerOverride?: string): boolean {
  const isProd = nodeEnv === 'production';
  return !isProd || enableSwaggerOverride === 'true';
}
