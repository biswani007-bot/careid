const fs = require('fs');
const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findReqs(items, path = []) {
  let list = [];
  for (const it of items) {
    if (it.request) {
      list.push({ folder: path.join(' > '), name: it.name, request: it.request, description: it.request.description });
    }
    if (it.item) {
      list = list.concat(findReqs(it.item, [...path, it.name]));
    }
  }
  return list;
}

const all = findReqs(collection.item);
const posts = all.filter(r => r.request.method === 'POST');

console.log('Total POST requests in Postman:', posts.length);
posts.forEach(p => {
  const url = p.request.url?.raw || p.request.url;
  if (url.includes('doctor') || url.includes('user') || url.includes('admin') || url.includes('register') || url.includes('auth')) {
    console.log(`[POST] ${p.folder} > ${p.name}`);
    console.log(`   URL: ${url}`);
    if (p.request.body?.raw) {
      console.log(`   Body: ${p.request.body.raw.slice(0, 150)}...`);
    }
  }
});

