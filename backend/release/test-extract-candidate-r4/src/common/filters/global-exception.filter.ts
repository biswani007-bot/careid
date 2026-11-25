import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../interfaces/api-response.interface';
import { Logger } from 'nestjs-pino';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isProduction = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal Server Error';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resPayload = exception.getResponse() as any;
      errorName = exception.name;
      if (status < 500) {
        message = typeof resPayload === 'object' && resPayload.message ? resPayload.message : exception.message;
      } else {
        message = isProduction
          ? 'An unexpected internal server error occurred.'
          : (typeof resPayload === 'object' && resPayload.message ? resPayload.message : exception.message);
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        errorName = isProduction ? 'ConflictError' : `DatabaseError(${exception.code})`;
        message = 'A unique constraint violation occurred on the database fields.';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        errorName = isProduction ? 'NotFoundError' : `DatabaseError(${exception.code})`;
        message = 'Record requested for operation does not exist.';
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        errorName = isProduction ? 'InternalServerError' : `DatabaseError(${exception.code})`;
        message = isProduction ? 'An unexpected database error occurred.' : exception.message;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorName = isProduction ? 'InternalServerError' : exception.name;
      message = isProduction ? 'An internal server error occurred.' : exception.message;
    }

    // Standard safe server-side diagnostics without logging tokens, cookies, or clinical payloads
    this.logger.error({
      msg: 'Exception caught by filter',
      error: exception instanceof Error ? exception.name : errorName,
      message: exception instanceof Error ? exception.message : String(exception),
      statusCode: status,
      path: request.url,
      method: request.method,
      exception: exception instanceof Error ? { stack: exception.stack } : exception,
    });

    const errorResponse: ApiErrorResponse = {
      success: false,
      statusCode: status,
      error: errorName,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
        traceId: (request.headers['x-trace-id'] as string) || undefined,
      },
    };

    response.status(status).json(errorResponse);
  }
}
