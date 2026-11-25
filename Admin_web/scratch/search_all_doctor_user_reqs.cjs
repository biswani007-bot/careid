const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function scanItems(items, folder = '') {
  let results = [];
  for (const item of items) {
    const currentPath = folder ? `${folder} > ${item.name}` : item.name;
    if (item.item) {
      results = results.concat(scanItems(item.item, currentPath));
    } else if (item.request) {
      const url = item.request.url ? (typeof item.request.url === 'string' ? item.request.url : item.request.url.raw) : '';
      const method = item.request.method;
      results.push({
        folder: currentPath,
        name: item.name,
        method,
        url,
        body: item.request.body ? item.request.body.raw : undefined
      });
    }
  }
  return results;
}

const allRequests = scanItems(postman.item);
console.log(`Total requests in Postman: ${allRequests.length}`);

const doctorReqs = allRequests.filter(r => 
  r.url.toLowerCase().includes('doctor') || 
  r.name.toLowerCase().includes('doctor') ||
  r.url.toLowerCase().includes('user') ||
  r.name.toLowerCase().includes('user')
);

console.log(`Found ${doctorReqs.length} requests matching doctor/user:`);
doctorReqs.forEach(r => {
  console.log(`[${r.method}] ${r.name}`);
  console.log(`  Path: ${r.folder}`);
  console.log(`  URL: ${r.url}`);
  if (r.body && r.method === 'POST') {
    console.log(`  Body: ${r.body.replace(/\s+/g, ' ').slice(0, 150)}...`);
  }
  console.log('');
});

