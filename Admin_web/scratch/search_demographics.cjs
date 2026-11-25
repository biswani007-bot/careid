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

console.log('--- SEARCHING FOR DEMOGRAPHICS / PATIENT UPDATE ENDPOINTS ---');
allReqs.forEach(r => {
  const full = (r.name + ' ' + r.url).toLowerCase();
  if (full.includes('demographic') || (r.url.includes('/patients') && (r.method === 'PUT' || r.method === 'PATCH' || r.method === 'POST'))) {
    console.log(`[${r.method}] ${r.name}`);
    console.log(`  Folder: ${r.folder}`);
    console.log(`  URL: ${r.url}`);
    if (r.body) {
      console.log(`  Body: ${r.body.replace(/\s+/g, ' ').slice(0, 250)}`);
    }
    console.log('');
  }
});

