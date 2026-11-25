const fs = require('fs');
const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findReqs(items, path = []) {
  let list = [];
  for (const it of items) {
    if (it.request) {
      list.push({ folder: path.join(' > '), name: it.name, request: it.request });
    }
    if (it.item) {
      list = list.concat(findReqs(it.item, [...path, it.name]));
    }
  }
  return list;
}

const all = findReqs(collection.item);
const authOrUser = all.filter(r => {
  const url = r.request.url?.raw || (typeof r.request.url === 'string' ? r.request.url : '');
  return url.includes('auth') || url.includes('user') || url.includes('admin') || url.includes('doctor');
});

console.log('Total matching requests: ' + authOrUser.length);
authOrUser.forEach(r => {
  const url = r.request.url?.raw || r.request.url;
  console.log(`[${r.request.method}] ${r.folder} > ${r.name}`);
  console.log(`     ${url}`);
});

