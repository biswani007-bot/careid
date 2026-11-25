const fs = require('fs');

const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findRequests(items, path = []) {
  let results = [];
  for (const item of items) {
    if (item.request) {
      results.push({
        folder: path.join(' > '),
        name: item.name,
        method: item.request.method,
        url: typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw,
        body: item.request.body?.raw,
        responses: item.response?.map(res => ({
          name: res.name,
          status: res.status,
          code: res.code,
          body: res.body
        }))
      });
    }
    if (item.item) {
      results = results.concat(findRequests(item.item, [...path, item.name]));
    }
  }
  return results;
}

const reqs = findRequests(collection.item);
const doctorReqs = reqs.filter(r => 
  r.name.toLowerCase().includes('doctor') || 
  (r.url && r.url.toLowerCase().includes('doctor')) || 
  r.folder.toLowerCase().includes('doctor')
);

console.log('=== DOCTOR REQUESTS IN POSTMAN (' + doctorReqs.length + ') ===');
doctorReqs.forEach(r => {
  console.log(`[${r.method}] ${r.name} -> ${r.url} (Folder: ${r.folder})`);
  if (r.body) {
    console.log('  Body snippet:', r.body.slice(0, 150));
  }
});

const postReqs = reqs.filter(r => r.method === 'POST');
console.log('\n=== ALL POST REQUESTS IN POSTMAN (' + postReqs.length + ') ===');
postReqs.forEach(r => {
  console.log(`[POST] ${r.name} -> ${r.url} (Folder: ${r.folder})`);
});

