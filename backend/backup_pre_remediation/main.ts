import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from '@common/filters/global-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { resolveTrustProxyConfig } from './common/utils/proxy-trust.util';
import { shouldEnableSwagger } from './common/utils/swagger.util';
import { getCorsOptions } from './common/utils/cors.util';

export { shouldEnableSwagger, getCorsOptions };

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

  // Configure Express proxy trust (DEP-01 Hardening)
  const trustProxySetting = resolveTrustProxyConfig(process.env.TRUST_PROXY);
  app.set('trust proxy', trustProxySetting);

  // Enforce incoming payload limits at HTTP boundary
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ limit: '15mb', extended: true }));

  // Security & Compression Middleware
  app.use(helmet());
  app.use(compression());

  // Environment configuration
  const isProduction = process.env.NODE_ENV === 'production';
  const rawCorsOrigins = process.env.CORS_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS;

  // Configure CORS using explicit origin allowlist (CRIT-SEC-01 Hardening)
  const corsOptions = getCorsOptions(rawCorsOrigins, isProduction);
  app.enableCors(corsOptions);

  // Global API prefix: /api
  const globalPrefix = process.env.GLOBAL_PREFIX || 'api';
  app.setGlobalPrefix(globalPrefix);

  // URI versioning: /api/v1/...
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Response Transformation & Global Exception Filters
  app.useGlobalInterceptors(new ResponseTransformInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  // Swagger documentation
  if (shouldEnableSwagger(process.env.NODE_ENV, process.env.ENABLE_SWAGGER)) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CareID API — Health Vault 360')
      .setDescription('CareID Health Vault 360 Enterprise API documentation')
      .setVersion('1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT-Auth')
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    const swaggerPath = process.env.SWAGGER_PATH || 'docs';
    SwaggerModule.setup(swaggerPath, app, swaggerDocument);
    SwaggerModule.setup('api/docs', app, swaggerDocument);

    // Direct OpenAPI / Swagger specification JSON export endpoints
    const httpAdapter = app.getHttpAdapter();
    httpAdapter.get('/docs-json', (_req: any, res: any) => {
      res.setHeader('Content-Type', 'application/json');
      res.json(swaggerDocument);
    });
    httpAdapter.get(`/${globalPrefix}/docs-json`, (_req: any, res: any) => {
      res.setHeader('Content-Type', 'application/json');
      res.json(swaggerDocument);
    });
    httpAdapter.get(`/${globalPrefix}/v1/docs-json`, (_req: any, res: any) => {
      res.setHeader('Content-Type', 'application/json');
      res.json(swaggerDocument);
    });
  }

  // Graceful Shutdown Hooks
  app.enableShutdownHooks();

  // Start the API
  const port = Number(process.env.PORT) || 3073;
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);

  logger.log(
    `CareID API is running on http://${host}:${port}/${globalPrefix}/v1 (${
      isProduction ? 'production' : 'development'
    })`,
  );
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start CareID API:', error);
  process.exit(1);
});
