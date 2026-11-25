import pino from 'pino';

describe('Pino Sensitive Header Redaction (SEC-AUD-05)', () => {
  it('redacts authorization, cookie, x-api-key, and set-cookie in serialized output', () => {
    let output = '';
    const destination = {
      write: (str: string) => {
        output += str;
      },
    };

    const logger = pino(
      {
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-api-key"]',
            'req.headers["set-cookie"]',
          ],
          censor: '[REDACTED]',
        },
      },
      destination as any,
    );

    logger.info(
      {
        req: {
          id: 'req-abc-123',
          method: 'GET',
          url: '/api/v1/auth/me',
          headers: {
            host: 'api.careid.com',
            authorization: 'Bearer super-secret-jwt-token-12345',
            cookie: 'session_token=abcdef123456; refresh_token=secret_refresh',
            'x-api-key': 'live_key_99998888',
            'set-cookie': ['token=xyz; Path=/; HttpOnly'],
            'x-trace-id': 'trace-999',
          },
        },
      },
      'Request incoming',
    );

    // Verify raw secrets never appear in cleartext
    expect(output).not.toContain('super-secret-jwt-token-12345');
    expect(output).not.toContain('session_token=abcdef123456');
    expect(output).not.toContain('live_key_99998888');
    expect(output).toContain('[REDACTED]');
    expect(output).toContain('api.careid.com');
    expect(output).toContain('trace-999');

    // Verify structured redacted output
    const parsed = JSON.parse(output.trim());
    expect(parsed.req.headers.authorization).toBe('[REDACTED]');
    expect(parsed.req.headers.cookie).toBe('[REDACTED]');
    expect(parsed.req.headers['x-api-key']).toBe('[REDACTED]');
    expect(parsed.req.headers['set-cookie']).toBe('[REDACTED]');
    expect(parsed.req.headers.host).toBe('api.careid.com');
    expect(parsed.req.headers['x-trace-id']).toBe('trace-999');
  });
});
