const fs = require('fs');
const postmanPath = 'D:\\New folder\\New folder\\healthvault\\Postman collection\\CareID-Staging.postman_collection.json';
const col = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));

function findRequests(items, prefix = '') {
  let reqs = [];
  for (const it of items) {
    if (it.request) {
      reqs.push({
        folder: prefix,
        name: it.name,
        method: it.request.method,
        url: it.request.url ? (typeof it.request.url === 'string' ? it.request.url : it.request.url.raw) : '',
        body: it.request.body ? it.request.body.raw : null,
        description: it.request.description || ''
      });
    }
    if (it.item) {
      reqs = reqs.concat(findRequests(it.item, prefix ? prefix + ' > ' + it.name : it.name));
    }
  }
  return reqs;
}

const allReqs = findRequests(col.item || []);

console.log('--- PATIENT ONBOARDING / REGISTRATION ENDPOINTS ACROSS ENTIRE COLLECTION ---');
allReqs.forEach(r => {
  const full = (r.name + ' ' + r.url + ' ' + r.folder).toLowerCase();
  if (full.includes('onboard') || (r.url.includes('/patients') && r.method !== 'GET') || (r.name.toLowerCase().includes('patient') && r.method === 'POST')) {
    console.log(`[${r.method}] ${r.name}`);
    console.log(`  Folder: ${r.folder}`);
    console.log(`  URL: ${r.url}`);
    if (r.body) {
      console.log(`  Body: ${r.body.replace(/\s+/g, ' ').slice(0, 200)}`);
    }
    console.log('');
  }
});

