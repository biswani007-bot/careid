const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '../CareID-Staging.postman_collection.json');
const stagingEnvPath = path.join(__dirname, '../CareID-Staging.postman_environment.json');

console.log('--- Verifying Generated Postman Files ---');
const col = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
const env = JSON.parse(fs.readFileSync(stagingEnvPath, 'utf8'));

console.log('Collection Name:', col.info.name);
console.log('Schema:', col.info.schema);
console.log('Total Folders:', col.item.length);

let totalRequests = 0;
let classifiedRequests = 0;
let testsCount = 0;
let bearerCount = 0;
let noauthCount = 0;

col.item.forEach((f, idx) => {
  const reqs = f.item ? f.item.length : 1;
  totalRequests += reqs;
  console.log(`${(idx + 1).toString().padStart(2, '0')}. ${f.name.padEnd(50)} : ${reqs} requests`);
  
  (f.item || []).forEach(item => {
    if (item.request?.description && item.request.description.includes('[Classification:')) {
      classifiedRequests++;
    }
    if (item.event && item.event.some(e => e.listen === 'test')) {
      testsCount++;
    }
    if (item.request?.auth?.type === 'bearer') {
      bearerCount++;
    } else if (item.request?.auth?.type === 'noauth') {
      noauthCount++;
    }
  });
});

console.log('\n--- Metrics ---');
console.log('Total Requests:', totalRequests);
console.log('Classified Requests:', classifiedRequests);
console.log('Requests with Test Scripts:', testsCount);
console.log('Bearer Auth Requests:', bearerCount);
console.log('NoAuth Requests:', noauthCount);

console.log('\n--- Environment Variables ---');
console.log('Environment Name:', env.name);
console.log('Variables Count:', env.values.length);
env.values.forEach(v => {
  const val = v.type === 'secret' && v.value ? '***' : (v.value || '(empty)');
  console.log(`  ${v.key.padEnd(25)} = ${val.padEnd(45)} [type: ${v.type}, enabled: ${v.enabled}]`);
});

// Check if any secrets are leaked
const leaked = env.values.filter(v => v.type !== 'secret' && (v.key.toLowerCase().includes('password') || v.key.toLowerCase().includes('token') && v.value && !v.value.startsWith('{{')));
console.log('\nSecret leak check (should be 0):', leaked.length);

