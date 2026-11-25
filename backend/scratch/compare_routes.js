const fs = require('fs');

const coll = JSON.parse(fs.readFileSync('CareID-Staging.postman_collection.json', 'utf8'));

const postmanRoutes = new Set();
function collectRoutes(items) {
  for (const it of items) {
    if (it.request && it.request.url) {
      const method = (it.request.method || 'GET').toUpperCase();
      let raw = it.request.url.raw || '';
      raw = raw.replace(/\{\{baseUrl\}\}/g, '').replace(/\{\{base_url\}\}/g, '');
      if (raw.startsWith('/api/v1')) raw = raw.replace('/api/v1', '');
      const cleanPath = raw.split('?')[0].replace(/\/+$/, '');
      postmanRoutes.add(`${method} ${cleanPath}`);
    }
    if (it.item) collectRoutes(it.item);
  }
}
collectRoutes(coll.item);

if (fs.existsSync('docs/swagger-spec.json')) {
  const spec = JSON.parse(fs.readFileSync('docs/swagger-spec.json', 'utf8'));
  const missing = [];
  const found = [];
  for (const [p, methods] of Object.entries(spec.paths)) {
    let cleanP = p;
    if (cleanP.startsWith('/api/v1')) cleanP = cleanP.replace('/api/v1', '');
    for (const m of Object.keys(methods)) {
      const norm = `${m.toUpperCase()} ${cleanP}`.replace(/\{([^}]+)\}/g, ':$1');
      if (!postmanRoutes.has(norm)) {
        missing.push(norm);
      } else {
        found.push(norm);
      }
    }
  }
  console.log(`Routes matched in Postman: ${found.length} / ${found.length + missing.length}`);
  console.log('Routes in Swagger missing in Postman:', missing.length);
  if (missing.length > 0) {
    console.log('Missing routes:', missing);
  }
}
