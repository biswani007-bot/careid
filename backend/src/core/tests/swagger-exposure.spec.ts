import { shouldEnableSwagger } from '../../common/utils/swagger.util';

describe('Swagger Exposure Control (SEC-AUD-07)', () => {
  it('disables Swagger in production by default when ENABLE_SWAGGER is not set', () => {
    const isEnabled = shouldEnableSwagger('production', undefined);
    expect(isEnabled).toBe(false);
  });

  it('disables Swagger in production when ENABLE_SWAGGER is explicitly false or anything other than true', () => {
    expect(shouldEnableSwagger('production', 'false')).toBe(false);
    expect(shouldEnableSwagger('production', '0')).toBe(false);
    expect(shouldEnableSwagger('production', '')).toBe(false);
  });

  it('enables Swagger in production only via explicit opt-in override (ENABLE_SWAGGER=true)', () => {
    const isEnabled = shouldEnableSwagger('production', 'true');
    expect(isEnabled).toBe(true);
  });

  it('enables Swagger in development mode', () => {
    const isEnabled = shouldEnableSwagger('development', undefined);
    expect(isEnabled).toBe(true);
  });

  it('enables Swagger in test mode', () => {
    const isEnabled = shouldEnableSwagger('test', undefined);
    expect(isEnabled).toBe(true);
  });

  it('enables Swagger when NODE_ENV is unset/undefined', () => {
    const isEnabled = shouldEnableSwagger(undefined, undefined);
    expect(isEnabled).toBe(true);
  });
});
