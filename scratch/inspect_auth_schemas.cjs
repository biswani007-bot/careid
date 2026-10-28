const fs = require('fs');

const doc = JSON.parse(fs.readFileSync('scratch/backend_openapi.json', 'utf8'));

console.log('=== AUTH SCHEMAS & DETAILS ===');

// Check all paths with 'auth' or 'login'
for (const [p, ops] of Object.entries(doc.paths || {})) {
  if (p.includes('auth') || p.includes('login') || p.includes('token') || p.includes('password')) {
    for (const [m, op] of Object.entries(ops)) {
      console.log(`\nEndpoint: ${m.toUpperCase()} ${p}`);
      console.log(`Summary: ${op.summary}`);
      if (op.requestBody) {
        const schemaRef = op.requestBody.content?.['application/json']?.schema;
        console.log('Request Body Schema:', JSON.stringify(schemaRef, null, 2));
      }
      for (const [code, resp] of Object.entries(op.responses || {})) {
        console.log(`Response ${code}:`, resp.description);
        if (resp.content?.['application/json']?.schema) {
          console.log(`  Schema:`, JSON.stringify(resp.content['application/json'].schema, null, 2));
        }
      }
    }
  }
}
