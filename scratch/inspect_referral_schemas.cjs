const fs = require('fs');

const openapi = JSON.parse(fs.readFileSync('scratch/backend_openapi.json', 'utf8'));

console.log('--- GET /api/v1/referrals response schema ---');
const listResp = openapi.paths['/api/v1/referrals']?.get?.responses?.['200']?.content?.['application/json']?.schema;
console.log(JSON.stringify(listResp, null, 2));

console.log('\n--- GET /api/v1/referrals/dashboard/stats response schema ---');
const statsResp = openapi.paths['/api/v1/referrals/dashboard/stats']?.get?.responses?.['200']?.content?.['application/json']?.schema;
console.log(JSON.stringify(statsResp, null, 2));

console.log('\n--- Referrals Schemas in components ---');
Object.keys(openapi.components.schemas).filter(k => k.toLowerCase().includes('referral')).forEach(k => {
  console.log(k, JSON.stringify(openapi.components.schemas[k]));
});
