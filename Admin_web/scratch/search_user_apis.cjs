const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '..', 'Postman collection', 'CareID-Staging.postman_collection.json');
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

console.log('Collection Name:', collection.info.name);

function scanItems(items, folderPath = '') {
  let results = [];
  for (const item of items) {
    const currentPath = folderPath ? `${folderPath} > ${item.name}` : item.name;
    if (item.item && Array.isArray(item.item)) {
      results = results.concat(scanItems(item.item, currentPath));
    } else if (item.request) {
      results.push({
        folder: folderPath,
        name: item.name,
        method: item.request.method,
        url: typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw || '',
        description: item.request.description || item.description || '',
        body: item.request.body?.raw || ''
      });
    }
  }
  return results;
}

const allRequests = scanItems(collection.item);
console.log('Total Requests in collection:', allRequests.length);

// Filter requests related to users, admin, identity, roles, sessions, audit
const userRelated = allRequests.filter(r => {
  const text = `${r.folder} ${r.name} ${r.url}`.toLowerCase();
  return (
    text.includes('user') ||
    text.includes('admin') ||
    text.includes('role') ||
    text.includes('session') ||
    text.includes('device') ||
    text.includes('audit') ||
    text.includes('identity') ||
    text.includes('auth') ||
    text.includes('staff') ||
    text.includes('permission')
  );
});

console.log('\n=== USER / ADMIN / ROLE / SESSION / AUDIT REQUESTS (' + userRelated.length + ') ===');
userRelated.forEach((r, idx) => {
  console.log(`\n[${idx + 1}] Folder: ${r.folder}`);
  console.log(`     Name: ${r.name}`);
  console.log(`     Method: ${r.method} ${r.url}`);
  if (r.body) {
    console.log(`     Body: ${r.body.slice(0, 150).replace(/\n/g, ' ')}...`);
  }
});

