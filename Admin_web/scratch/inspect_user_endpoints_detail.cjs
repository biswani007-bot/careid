const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '..', 'Postman collection', 'CareID-Staging.postman_collection.json');
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

function findItemByUrl(items, pathFragment) {
  let found = [];
  for (const item of items) {
    if (item.request) {
      const url = typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw || '';
      if (url.includes(pathFragment)) {
        found.push(item);
      }
    }
    if (item.item) {
      found = found.concat(findItemByUrl(item.item, pathFragment));
    }
  }
  return found;
}

const statusItems = findItemByUrl(collection.item, '/admin/users/:id/status');
console.log('=== /admin/users/:id/status ===');
statusItems.forEach(i => {
  console.log('Method:', i.request.method);
  console.log('URL:', i.request.url);
  console.log('Body:', i.request.body);
  console.log('Description:', i.request.description);
});

const roleItems = findItemByUrl(collection.item, '/admin/users/:id/roles');
console.log('\n=== /admin/users/:id/roles ===');
roleItems.forEach(i => {
  console.log('Method:', i.request.method);
  console.log('URL:', i.request.url);
  console.log('Body:', i.request.body);
  console.log('Description:', i.request.description);
});

const listUsers = findItemByUrl(collection.item, '/admin/users?');
console.log('\n=== /admin/users? ===');
listUsers.forEach(i => {
  console.log('Method:', i.request.method);
  console.log('URL:', JSON.stringify(i.request.url, null, 2));
  console.log('Description:', i.request.description);
});

