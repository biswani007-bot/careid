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
        body: it.request.body ? it.request.body.raw : null
      });
    }
    if (it.item) {
      reqs = reqs.concat(findRequests(it.item, prefix ? prefix + ' > ' + it.name : it.name));
    }
  }
  return reqs;
}

const allReqs = findRequests(col.item || []);
const patientReqs = allReqs.filter(r => r.name.toLowerCase().includes('patient') || r.url.toLowerCase().includes('patient'));
console.log(`Found ${patientReqs.length} patient requests:`);
patientReqs.forEach(r => {
  console.log(`[${r.method}] ${r.name}`);
  console.log(`  URL: ${r.url}`);
  console.log(`  Folder: ${r.folder}`);
  if (r.body) {
    console.log(`  Body sample: ${r.body.slice(0, 150)}...`);
  }
});

