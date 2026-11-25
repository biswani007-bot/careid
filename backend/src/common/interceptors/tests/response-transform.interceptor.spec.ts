import { ExecutionContext, CallHandler, StreamableFile } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseTransformInterceptor } from '../response-transform.interceptor';

describe('ResponseTransformInterceptor', () => {
  let interceptor: ResponseTransformInterceptor<any>;
  let mockContext: ExecutionContext;
  let mockResponse: any;

  beforeEach(() => {
    interceptor = new ResponseTransformInterceptor();
    mockResponse = {
      statusCode: 200,
      getHeader: jest.fn(),
    };
    mockContext = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({}),
      }),
    } as unknown as ExecutionContext;
  });

  it('should wrap standard object responses in standard ApiResponse structure', (done) => {
    const rawData = { message: 'hello', count: 42 };
    const callHandler: CallHandler = {
      handle: () => of(rawData),
    };

    interceptor.intercept(mockContext, callHandler).subscribe((result) => {
      expect(result).toMatchObject({
        success: true,
        statusCode: 200,
        message: 'Operation executed successfully',
        data: rawData,
      });
      expect(result.meta).toBeDefined();
      expect(result.meta.timestamp).toBeDefined();
      done();
    });
  });

  it('should pass through already-wrapped ApiResponse objects untouched', (done) => {
    const preWrapped = {
      success: true,
      statusCode: 201,
      message: 'Created explicitly',
      data: { id: 'uuid-123' },
    };
    const callHandler: CallHandler = {
      handle: () => of(preWrapped),
    };

    interceptor.intercept(mockContext, callHandler).subscribe((result) => {
      expect(result).toBe(preWrapped);
      done();
    });
  });

  it('should unwrap paginated data and merge meta', (done) => {
    const paginated = {
      data: [{ id: 1 }, { id: 2 }],
      meta: { page: 1, limit: 10, total: 2 },
    };
    const callHandler: CallHandler = {
      handle: () => of(paginated),
    };

    interceptor.intercept(mockContext, callHandler).subscribe((result) => {
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.meta.page).toBe(1);
      expect(result.meta.total).toBe(2);
      done();
    });
  });

  it('should NOT wrap StreamableFile binary responses into JSON', (done) => {
    const mockBuffer = Buffer.from('%PDF-1.4\n%synthetic-pdf-stream');
    const streamableFile = new StreamableFile(mockBuffer);
    const callHandler: CallHandler = {
      handle: () => of(streamableFile),
    };

    interceptor.intercept(mockContext, callHandler).subscribe((result) => {
      expect(result).toBe(streamableFile);
      expect(result instanceof StreamableFile).toBe(true);
      expect(result.getStream).toBeDefined();
      expect(result).not.toHaveProperty('success');
      expect(result).not.toHaveProperty('statusCode');
      done();
    });
  });

  it('should NOT wrap raw Buffer binary responses into JSON', (done) => {
    const mockBuffer = Buffer.from('%PDF-1.7\n%raw-binary-buffer');
    const callHandler: CallHandler = {
      handle: () => of(mockBuffer),
    };

    interceptor.intercept(mockContext, callHandler).subscribe((result) => {
      expect(result).toBe(mockBuffer);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result).not.toHaveProperty('success');
      done();
    });
  });
});
