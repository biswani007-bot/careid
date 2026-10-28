const fs = require('fs');

const openapi = JSON.parse(fs.readFileSync('scratch/backend_openapi.json', 'utf8'));

console.log('OpenAPI Title:', openapi.info?.title, openapi.info?.version);

const referralEndpoints = Object.keys(openapi.paths).filter(p => p.toLowerCase().includes('referral'));
console.log('Referral endpoints found:');
referralEndpoints.forEach(p => {
  const methods = Object.keys(openapi.paths[p]);
  console.log(`- ${p} [${methods.join(', ').toUpperCase()}]`);
  methods.forEach(m => {
    const op = openapi.paths[p][m];
    console.log(`    operationId: ${op.operationId}, summary: ${op.summary}`);
    console.log(`    parameters:`, op.parameters?.map(param => `${param.name} (${param.in})`));
    if (op.requestBody) {
      console.log(`    requestBody schema:`, JSON.stringify(op.requestBody.content?.['application/json']?.schema || {}));
    }
    console.log(`    responses:`, Object.keys(op.responses || {}));
  });
});
