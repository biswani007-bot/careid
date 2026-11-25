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
const posts = allReqs.filter(r => r.method === 'POST');

console.log('--- ALL POST REQUESTS IN POSTMAN COLLECTION ---');
posts.forEach(r => {
  if (r.url.toLowerCase().includes('patient') || r.name.toLowerCase().includes('patient') || r.folder.toLowerCase().includes('patient') || r.folder.toLowerCase().includes('admin') || r.folder.toLowerCase().includes('onboard') || r.folder.toLowerCase().includes('user')) {
    console.log(`[POST] ${r.name}`);
    console.log(`  Folder: ${r.folder}`);
    console.log(`  URL: ${r.url}`);
    if (r.body) {
      console.log(`  Body: ${r.body.slice(0, 300)}`);
    }
    console.log('');
  }
});

