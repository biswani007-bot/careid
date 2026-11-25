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

async function analyze() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  const config = new DocumentBuilder().setTitle('Analysis').build();
  const doc = SwaggerModule.createDocument(app, config);
  await app.close();

  // Load existing collection
  const existingCol = JSON.parse(fs.readFileSync('CareID-Staging.postman_collection.json', 'utf8'));

  const existingEndpoints = new Set();
  function collectExisting(items) {
    for (const it of items) {
      if (it.request) {
        const method = it.request.method.toUpperCase();
        let raw = it.request.url.raw || '';
        // normalize {{baseUrl}}
        raw = raw.replace('{{baseUrl}}', '').split('?')[0];
        // normalize path variables e.g. :id, {{doctorId}}, etc. -> {id}
        const normalized = raw
          .replace(/:([a-zA-Z0-9_]+)/g, '{$1}')
          .replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, '{$1}');
        existingEndpoints.add(`${method} ${normalized}`);
      }
      if (it.item) collectExisting(it.item);
    }
  }
  collectExisting(existingCol.item);

  console.log(`Existing collection has ${existingEndpoints.size} unique method+endpoint pairs.`);

  const swaggerEndpoints = [];
  const tagsMap = new Map();

  for (const [pathUrl, pathObj] of Object.entries(doc.paths)) {
    for (const [method, opObj] of Object.entries(pathObj)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
        const m = method.toUpperCase();
        const tag = (opObj.tags && opObj.tags[0]) || 'Untagged';
        swaggerEndpoints.push({
          method: m,
          path: pathUrl,
          tag,
          summary: opObj.summary || opObj.operationId || '',
          key: `${m} ${pathUrl}`
        });

        if (!tagsMap.has(tag)) tagsMap.set(tag, []);
        tagsMap.get(tag).push(`${m} ${pathUrl}`);
      }
    }
  }

  console.log(`Current Swagger doc has ${swaggerEndpoints.length} total operations across ${Object.keys(doc.paths).length} paths.`);
  console.log(`Swagger tags count: ${tagsMap.size}`);

  console.log('\n--- Swagger Tags Breakdown ---');
  for (const [tag, ops] of tagsMap.entries()) {
    console.log(`  ${tag.padEnd(35)}: ${ops.length} operations`);
  }

  // Find added endpoints (in Swagger but not in existing collection)
  const added = swaggerEndpoints.filter(ep => {
    // try exact key or with parameter replacements
    const normSwagger = ep.path.replace(/\{[a-zA-Z0-9_]+\}/g, '{id}');
    let found = false;
    for (const ex of existingEndpoints) {
      const normEx = ex.replace(/\{[a-zA-Z0-9_]+\}/g, '{id}');
      if (normEx === `${ep.method} ${normSwagger}`) {
        found = true;
        break;
      }
    }
    return !found;
  });

  console.log(`\n--- Added Endpoints (${added.length} total) ---`);
  added.forEach(a => {
    console.log(`  [${a.tag}] ${a.method} ${a.path} - ${a.summary}`);
  });
}

analyze().catch(console.error);
