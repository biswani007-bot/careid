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
const item = all.find(r => r.name === 'Register/Create a doctor profile in Master Registry');
console.log('Name:', item.name);
console.log('Folder:', item.folder);
console.log('Method:', item.request.method);
console.log('URL:', item.request.url);
console.log('Body:', item.request.body);
console.log('Responses count:', item.responses?.length);
if (item.responses?.length) {
  console.log('Response 0:', JSON.stringify(item.responses[0], null, 2));
}

