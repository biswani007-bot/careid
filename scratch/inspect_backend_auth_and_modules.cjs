const fs = require('fs');

const doc = JSON.parse(fs.readFileSync('scratch/backend_openapi.json', 'utf8'));

console.log('=== SECURITY SCHEMES ===');
console.log(JSON.stringify(doc.components?.securitySchemes, null, 2));

console.log('\n=== GLOBAL SECURITY ===');
console.log(JSON.stringify(doc.security, null, 2));

console.log('\n=== SERVERS ===');
console.log(JSON.stringify(doc.servers, null, 2));

function getEndpointsForTag(tagName) {
  const list = [];
  for (const [pathStr, methods] of Object.entries(doc.paths || {})) {
    for (const [method, op] of Object.entries(methods)) {
      if ((op.tags || []).includes(tagName)) {
        list.push({
          method: method.toUpperCase(),
          path: pathStr,
          operationId: op.operationId,
          summary: op.summary,
          parameters: (op.parameters || []).map(p => ({ name: p.name, in: p.in, required: p.required, schema: p.schema?.type })),
          hasRequestBody: !!op.requestBody,
          requestBodyContent: op.requestBody?.content ? Object.keys(op.requestBody.content) : [],
          responses: Object.keys(op.responses || {})
        });
      }
    }
  }
  return list;
}

const interestingTags = [
  'Authentication & Identity',
  'Admin',
  'Patients',
  'Doctors',
  'Facilities',
  'Staff',
  'Medical Records',
  'OCR & Document Processing',
  'Attachments Platform',
  'Reports',
  'Governance',
  'Security & Compliance',
  'Observability & Performance'
];

const report = {};
for (const tag of interestingTags) {
  report[tag] = getEndpointsForTag(tag);
}

fs.writeFileSync('scratch/module_endpoints_summary.json', JSON.stringify(report, null, 2));
console.log('\nSaved module_endpoints_summary.json with detailed endpoints for all key tags!');
