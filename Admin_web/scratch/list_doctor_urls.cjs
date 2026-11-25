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
const matches = all.filter(r => {
  const url = r.request.url?.raw || (typeof r.request.url === 'string' ? r.request.url : '');
  return url.includes('/api/v1/doctors') || url.includes('/api/v1/admin/doctors');
});

console.log('Found ' + matches.length + ' doctor endpoints:');
matches.forEach(m => {
  const url = m.request.url?.raw || m.request.url;
  console.log(`[${m.request.method}] ${m.name}`);
  console.log(`   URL: ${url}`);
  if (m.request.body?.raw) {
    console.log(`   Body: ${m.request.body.raw}`);
  }
  console.log('---');
});

