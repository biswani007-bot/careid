const fs = require('fs');
const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findReqs(items, path = []) {
  let list = [];
  for (const it of items) {
    if (it.request) {
      list.push({ folder: path.join(' > '), name: it.name, request: it.request, responses: it.response });
    }
    if (it.item) {
      list = list.concat(findReqs(it.item, [...path, it.name]));
    }
  }
  return list;
}

const all = findReqs(collection.item);
const adminDoctorReq = all.find(r => r.name.includes('Register/Create a doctor profile for an existing user account') || (r.request.url?.raw && r.request.url.raw.includes('/admin/doctors')));
const masterDoctorReq = all.find(r => r.name.includes('Register/Create a doctor profile in Master Registry') || (r.request.url?.raw && r.request.url.raw.includes('/api/v1/doctors') && r.request.method === 'POST'));

console.log('=== ADMIN DOCTOR REQUEST ===');
if (adminDoctorReq) {
  console.log('Name:', adminDoctorReq.name);
  console.log('URL:', adminDoctorReq.request.url?.raw || adminDoctorReq.request.url);
  console.log('Method:', adminDoctorReq.request.method);
  console.log('Body:', adminDoctorReq.request.body?.raw);
  if (adminDoctorReq.responses?.length) {
    console.log('Response example 0:', adminDoctorReq.responses[0].body);
  }
}

console.log('\n=== MASTER DOCTOR REGISTRY REQUEST ===');
if (masterDoctorReq) {
  console.log('Name:', masterDoctorReq.name);
  console.log('URL:', masterDoctorReq.request.url?.raw || masterDoctorReq.request.url);
  console.log('Method:', masterDoctorReq.request.method);
  console.log('Body:', masterDoctorReq.request.body?.raw);
  if (masterDoctorReq.responses?.length) {
    console.log('Response example 0:', masterDoctorReq.responses[0].body);
  }
}

// Also check user creation endpoints
const userCreationReqs = all.filter(r => r.request.method === 'POST' && (r.request.url?.raw?.includes('/users') || r.request.url?.raw?.includes('/auth/register') || r.name.toLowerCase().includes('create user') || r.name.toLowerCase().includes('register user')));
console.log('\n=== USER CREATION REQUESTS (' + userCreationReqs.length + ') ===');
userCreationReqs.forEach(r => {
  console.log(`[${r.request.method}] ${r.name} -> ${r.request.url?.raw || r.request.url}`);
  if (r.request.body?.raw) console.log('  Body:', r.request.body.raw.slice(0, 150));
});

