import { Injectable, NestInterceptor, ExecutionContext, CallHandler, StreamableFile } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | StreamableFile | Buffer> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map(data => {
        // If data is a StreamableFile or Buffer (binary file stream), or response is CSV, pass through directly without JSON wrapping
        const contentType = (response?.getHeader && response.getHeader('content-type')) || '';
        if (
          data instanceof StreamableFile ||
          data instanceof Buffer ||
          data instanceof Uint8Array ||
          String(contentType).includes('text/csv') ||
          (data && typeof data === 'object' && typeof (data as any).getStream === 'function')
        ) {
          return data;
        }

        // If data already matches standard response format, output directly
        if (data && typeof data === 'object' && 'success' in data && 'statusCode' in data) {
          return data;
        }

        let responseData = data !== undefined ? data : null;
        let responseMeta: any = {
          timestamp: new Date().toISOString(),
        };

        // If paginated response structure with data and meta is returned, merge meta and unwrap data
        if (data && typeof data === 'object' && !Array.isArray(data) && 'meta' in data && 'data' in data) {
          responseData = (data as any).data;
          responseMeta = {
            ...responseMeta,
            ...(data as any).meta,
          };
        }

        return {
          success: true,
          statusCode: response.statusCode,
          message: 'Operation executed successfully',
          data: responseData,
          meta: responseMeta,
        };
      }),
    );
  }
}
