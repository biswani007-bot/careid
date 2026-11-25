const fs = require('fs');

const collectionPath = 'D:\\New folder\\New folder\\healthvault\\Postman collection\\CareID-Staging.postman_collection.json';
const data = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

function findFolder(items, name) {
  for (const item of items) {
    if (item.name && item.name.includes(name)) return item;
    if (item.item) {
      const found = findFolder(item.item, name);
      if (found) return found;
    }
  }
  return null;
}

const adminFolder = findFolder(data.item, '04. Admin Portal');
console.log('Admin folder endpoints:');
if (adminFolder && adminFolder.item) {
  adminFolder.item.forEach(i => {
    const url = i.request?.url?.raw || (typeof i.request?.url === 'string' ? i.request?.url : i.request?.url?.path?.join('/'));
    console.log(`[${i.request?.method}] ${url} - ${i.name}`);
  });
}

