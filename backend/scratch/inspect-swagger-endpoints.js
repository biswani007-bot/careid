const fs = require('fs');

try {
  const { DatabaseService } = require('../dist/src/database/database.service');
  DatabaseService.prototype.onModuleInit = async function () {};
} catch (e) {
  console.log('Error stubbing DB:', e.message);
}
const { NestFactory } = require('@nestjs/core');
const { VersioningType } = require('@nestjs/common');
const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');
const { AppModule } = require('../dist/src/app.module');

async function inspectEndpoints() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  const config = new DocumentBuilder().setTitle('Analysis').build();
  const doc = SwaggerModule.createDocument(app, config);
  await app.close();

  const targetPaths = [
    '/api/v1/auth/me',
    '/api/v1/auth/password/change',
    '/api/v1/insurance/ocr',
    '/api/v1/insurance/ocr/{id}',
    '/api/v1/patients/{patientId}/insurance-cards',
    '/api/v1/insurance-cards/{id}',
    '/api/v1/admin/users',
    '/api/v1/admin/users/{id}',
    '/api/v1/admin/users/{id}/reset-password',
    '/api/v1/admin/roles',
    '/api/v1/admin/roles/{id}',
    '/api/v1/admin/audit-logs/export',
    '/api/v1/admin/audit-logs/{id}',
    '/api/v1/security/api-keys',
    '/api/v1/security/api-keys/{id}',
    '/api/v1/security/api-keys/{id}/revoke',
    '/api/v1/support/tickets',
    '/api/v1/support/tickets/{id}',
    '/api/v1/support/tickets/{id}/reply',
    '/api/v1/support/tickets/{id}/replies',
    '/api/v1/pets',
    '/api/v1/pets/{id}',
    '/api/v1/pets/{id}/vaccinations',
    '/api/v1/financing/options',
    '/api/v1/financing/offers',
    '/api/v1/financing/apply',
    '/api/v1/financing/applications',
    '/api/v1/financing/applications/{id}',
    '/api/v1/financing/applications/{id}/status',
    '/api/v1/referrals/{id}',
    '/api/v1/referrals/{id}/status',
  ];

  for (const p of targetPaths) {
    const pathItem = doc.paths[p];
    if (!pathItem) {
      console.log(`Path not found in Swagger: ${p}`);
      continue;
    }
    console.log(`\n================= Path: ${p} =================`);
    for (const [m, op] of Object.entries(pathItem)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(m)) {
        console.log(`Method: ${m.toUpperCase()} | Summary: ${op.summary}`);
        if (op.parameters) {
          console.log('  Parameters:', op.parameters.map(param => `${param.name} (${param.in}, req=${param.required})`).join(', '));
        }
        if (op.requestBody) {
          const content = op.requestBody.content || {};
          const schema = content['application/json']?.schema || content['multipart/form-data']?.schema;
          console.log('  Body Schema:', JSON.stringify(schema));
        }
        if (op.responses) {
          console.log('  Responses:', Object.keys(op.responses).join(', '));
        }
      }
    }
  }
}

inspectEndpoints().catch(console.error);

