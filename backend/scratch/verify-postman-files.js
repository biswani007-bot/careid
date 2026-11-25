const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '../CareID-Staging.postman_collection.json');
const stagingEnvPath = path.join(__dirname, '../CareID-Staging.postman_environment.json');
const localEnvPath = path.join(__dirname, '../Health-Vault-360-Local.postman_environment.json');

console.log('--- Checking File Existence & Sizes ---');
[
  collectionPath,
  stagingEnvPath,
  localEnvPath,
  path.join(__dirname, '../docs/postman/CareID-Staging.postman_collection.json'),
  path.join(__dirname, '../docs/postman/CareID-Staging.postman_environment.json'),
  path.join(__dirname, '../Health-Vault-360-API.postman_collection.json'),
  path.join(__dirname, '../docs/postman/Health-Vault-360-API.postman_collection.json'),
  path.join(__dirname, '../docs/postman/Health-Vault-360-Local.postman_environment.json'),
].forEach(p => {
  if (fs.existsSync(p)) {
    const stat = fs.statSync(p);
    console.log(`OK: ${path.basename(p)} (${(stat.size / 1024).toFixed(1)} KB)`);
  } else {
    console.error(`MISSING: ${p}`);
  }
});

console.log('\n--- Checking Collection Structure ---');
const col = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
console.log('Collection Name:', col.info.name);
console.log('Folder count:', col.item.length);

console.log('\n--- Folder Breakdown ---');
let totalReqs = 0;
col.item.forEach((folder, idx) => {
  const reqCount = folder.item ? folder.item.length : 1;
  totalReqs += reqCount;
  console.log(`${(idx + 1).toString().padStart(2, '0')}. ${folder.name.padEnd(45)} : ${reqCount} requests`);
});
console.log('Total Requests:', totalReqs);

console.log('\n--- Verifying Key Endpoints ---');

// 1. Find /auth/password/login
function findRequest(items, urlMatcher, method) {
  for (const item of items) {
    if (item.item) {
      const res = findRequest(item.item, urlMatcher, method);
      if (res) return res;
    } else if (item.request) {
      const url = item.request.url?.raw || (item.request.url?.path ? '/' + item.request.url.path.join('/') : '');
      const m = item.request.method;
      if ((!method || m === method) && urlMatcher(url)) {
        return item;
      }
    }
  }
  return null;
}

const pwdLogin = findRequest(col.item, u => u.includes('/auth/password/login'), 'POST');
console.log('POST /auth/password/login found:', !!pwdLogin);
if (pwdLogin) {
  console.log('  Name:', pwdLogin.name);
  console.log('  Auth:', JSON.stringify(pwdLogin.request.auth));
  console.log('  Body:', pwdLogin.request.body?.raw?.replace(/\n/g, ' '));
  console.log('  Test script lines:', pwdLogin.event?.[0]?.script?.exec?.length);
}

const adminLogin = findRequest(col.item, u => u.includes('/auth/admin/login'), 'POST');
console.log('POST /auth/admin/login found:', !!adminLogin);
if (adminLogin) {
  console.log('  Name:', adminLogin.name);
  console.log('  Auth:', JSON.stringify(adminLogin.request.auth));
}

// 2. Check Appointments folder
const apptFolder = col.item.find(f => f.name.includes('Appointments'));
if (apptFolder) {
  console.log('\nAppointments Folder Name:', apptFolder.name);
  console.log('Appointments Request Count:', apptFolder.item.length);
  apptFolder.item.forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.request.method}] ${r.name} -> ${r.request.url.raw}`);
  });
}

// 3. Environment Variables
console.log('\n--- Staging Environment Variables ---');
const stagingEnv = JSON.parse(fs.readFileSync(stagingEnvPath, 'utf8'));
console.log('Staging Env Name:', stagingEnv.name);
console.log('Variable count:', stagingEnv.values.length);
stagingEnv.values.forEach(v => {
  console.log(`  ${v.key.padEnd(20)} = ${v.value ? (v.type === 'secret' && v.value !== '{{accessToken}}' && v.value !== '{{refreshToken}}' ? '***' : v.value) : '(empty)'} [${v.type}]`);
});

console.log('\n--- Local Environment Variables ---');
const localEnv = JSON.parse(fs.readFileSync(localEnvPath, 'utf8'));
console.log('Local baseUrl:', localEnv.values.find(v => v.key === 'baseUrl')?.value);
console.log('Local base_url:', localEnv.values.find(v => v.key === 'base_url')?.value);

