const fs = require('fs');

const swagger = JSON.parse(fs.readFileSync('docs/swagger-spec.json', 'utf8'));
const postman = JSON.parse(fs.readFileSync('CareID-Staging.postman_collection.json', 'utf8'));

function extractPostmanRequests(item, list = []) {
  if (item.request) {
    let url = '';
    if (typeof item.request.url === 'string') {
      url = item.request.url;
    } else if (item.request.url?.raw) {
      url = item.request.url.raw;
    } else if (item.request.url?.path) {
      url = '/' + item.request.url.path.join('/');
    }
    const method = (item.request.method || 'GET').toUpperCase();
    // Normalize url: remove {{baseUrl}}, query params, etc.
    let cleanUrl = url.replace(/{{baseUrl}}/g, '').split('?')[0];
    cleanUrl = cleanUrl.replace(/\/+/g, '/').replace(/\/$/, '');
    list.push({
      name: item.name,
      method,
      rawUrl: url,
      cleanUrl
    });
  }
  if (item.item && Array.isArray(item.item)) {
    for (const child of item.item) extractPostmanRequests(child, list);
  }
  return list;
}

const pmRequests = extractPostmanRequests(postman);
console.log('Postman total requests:', pmRequests.length);

const swaggerEndpoints = [];
for (const [path, methods] of Object.entries(swagger.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method.toLowerCase())) {
      let cleanPath = path.replace(/\/+/g, '/').replace(/\/$/, '');
      const postmanStylePath = cleanPath.replace(/{([^}]+)}/g, ':$1');
      swaggerEndpoints.push({
        method: method.toUpperCase(),
        path: cleanPath,
        postmanStylePath,
        summary: op.summary || op.operationId || ''
      });
    }
  }
}
console.log('Swagger total endpoints:', swaggerEndpoints.length);

function normalize(url) {
  return url.toLowerCase()
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .replace(/:[a-z0-9_-]+/g, '{param}')
    .replace(/{[a-z0-9_-]+}/g, '{param}');
}

// 1. In Swagger but NOT in Postman
const missingInPostman = [];
for (const s of swaggerEndpoints) {
  const sNorm = normalize(s.path);
  const match = pmRequests.find(p => {
    return p.method === s.method && normalize(p.cleanUrl) === sNorm;
  });
  if (!match) {
    missingInPostman.push(s);
  }
}

console.log('\n=== Endpoints in Backend/Swagger but NOT in CareID-Staging Postman ===');
console.log('Count:', missingInPostman.length);
missingInPostman.forEach(e => console.log(`- ${e.method} ${e.postmanStylePath} (${e.summary})`));

// 2. In Postman but NOT in Swagger
const missingInBackend = [];
for (const p of pmRequests) {
  const pNorm = normalize(p.cleanUrl);
  const match = swaggerEndpoints.find(s => {
    return s.method === p.method && normalize(s.path) === pNorm;
  });
  if (!match) {
    missingInBackend.push(p);
  }
}

console.log('\n=== Endpoints in Postman but NOT in Backend/Swagger ===');
console.log('Count:', missingInBackend.length);
missingInBackend.forEach(e => console.log(`- ${e.method} ${e.cleanUrl} (${e.name})`));

