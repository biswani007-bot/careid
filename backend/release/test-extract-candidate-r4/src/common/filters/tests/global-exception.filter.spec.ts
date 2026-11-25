import { GlobalExceptionFilter } from '../global-exception.filter';
import { ArgumentsHost, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Logger } from 'nestjs-pino';

describe('GlobalExceptionFilter (SEC-AUD-04 Sanitization Tests)', () => {
  let filter: GlobalExceptionFilter;
  let mockLogger: any;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = {
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
    };
    filter = new GlobalExceptionFilter(mockLogger as unknown as Logger);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockRequest = {
      url: '/api/v1/test',
      method: 'POST',
      headers: {
        authorization: 'Bearer sensitive-token',
        cookie: 'sessionId=secret-cookie',
        'x-trace-id': 'trace-123',
      },
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('HttpException handling (expected application exceptions)', () => {
    it('preserves validation error messages from BadRequestException in production', () => {
      process.env.NODE_ENV = 'production';
      const validationMessages = ['email must be a valid email', 'fileSize must not exceed 15MB'];
      const exception = new BadRequestException({ message: validationMessages, error: 'Bad Request' });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 400,
          error: 'BadRequestException',
          message: validationMessages,
          meta: expect.objectContaining({
            path: '/api/v1/test',
            traceId: 'trace-123',
          }),
        }),
      );
    });

    it('preserves NotFoundException in development and production', () => {
      process.env.NODE_ENV = 'production';
      const exception = new NotFoundException('Medical report attachment not found');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          error: 'NotFoundException',
          message: 'Medical report attachment not found',
        }),
      );
    });

    it('sanitizes unexpected InternalServerErrorException in production', () => {
      process.env.NODE_ENV = 'production';
      const exception = new InternalServerErrorException('Secret database host 10.0.0.5 is unreachable');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'An unexpected internal server error occurred.',
        }),
      );
    });
  });

  describe('Prisma database exception handling', () => {
    it('returns 409 Conflict with safe message on P2002 unique constraint error in production', () => {
      process.env.NODE_ENV = 'production';
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`email`)',
        { code: 'P2002', clientVersion: '5.0.0' },
      );

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          error: 'ConflictError',
          message: 'A unique constraint violation occurred on the database fields.',
        }),
      );
    });

    it('returns 404 NotFound on P2025 record not found error in production', () => {
      process.env.NODE_ENV = 'production';
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'An operation failed because it depends on one or more records that were required but not found',
        { code: 'P2025', clientVersion: '5.0.0' },
      );

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          error: 'NotFoundError',
          message: 'Record requested for operation does not exist.',
        }),
      );
    });

    it('sanitizes unexpected Prisma database errors in production (masks raw SQL/query details)', () => {
      process.env.NODE_ENV = 'production';
      const rawSqlError = 'Invalid `prisma.user.findMany()` invocation: SELECT * FROM "users" WHERE "secret" = 123';
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        rawSqlError,
        { code: 'P2010', clientVersion: '5.0.0' },
      );

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          error: 'InternalServerError',
          message: 'An unexpected database error occurred.',
        }),
      );
      // Verify raw SQL is not in response
      const responsePayload = mockResponse.json.mock.calls[0][0];
      expect(JSON.stringify(responsePayload)).not.toContain('SELECT');
      expect(JSON.stringify(responsePayload)).not.toContain('P2010');
    });

    it('exposes detailed Prisma database errors in non-production mode for developer diagnostics', () => {
      process.env.NODE_ENV = 'development';
      const rawSqlError = 'Raw database syntax error in migration query';
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        rawSqlError,
        { code: 'P2010', clientVersion: '5.0.0' },
      );

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          error: 'DatabaseError(P2010)',
          message: rawSqlError,
        }),
      );
    });
  });

  describe('Unexpected runtime Error handling', () => {
    it('masks raw runtime errors in production mode with generic message', () => {
      process.env.NODE_ENV = 'production';
      const runtimeError = new Error('Database password expired or connection refused at 192.168.1.100');

      filter.catch(runtimeError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          error: 'InternalServerError',
          message: 'An internal server error occurred.',
        }),
      );

      const responsePayload = mockResponse.json.mock.calls[0][0];
      expect(JSON.stringify(responsePayload)).not.toContain('192.168.1.100');
    });

    it('returns exact error details in non-production mode', () => {
      process.env.NODE_ENV = 'development';
      const runtimeError = new Error('Custom diagnostic failure detail');

      filter.catch(runtimeError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          error: 'Error',
          message: 'Custom diagnostic failure detail',
        }),
      );
    });

    it('logs diagnostics without logging request authorization headers or cookies', () => {
      process.env.NODE_ENV = 'production';
      const runtimeError = new Error('Internal failure');

      filter.catch(runtimeError, mockHost);

      expect(mockLogger.error).toHaveBeenCalled();
      const loggedData = mockLogger.error.mock.calls[0][0];
      expect(loggedData.path).toBe('/api/v1/test');
      expect(loggedData.method).toBe('POST');
      expect(JSON.stringify(loggedData)).not.toContain('Bearer sensitive-token');
      expect(JSON.stringify(loggedData)).not.toContain('sessionId=secret-cookie');
    });
  });
});
