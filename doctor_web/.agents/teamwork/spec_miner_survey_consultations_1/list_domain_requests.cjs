const fs = require('fs');
const path = require('path');

const collectionPath = path.resolve('Postman collection', 'CareID-Staging.postman_collection.json');
const raw = fs.readFileSync(collectionPath, 'utf8');
const data = JSON.parse(raw);

function traverse(items, currentPath = []) {
  let results = [];
  for (const item of items) {
    const newPath = [...currentPath, item.name];
    if (item.item && Array.isArray(item.item)) {
      results = results.concat(traverse(item.item, newPath));
    } else if (item.request) {
      results.push({
        folder: currentPath.join(' > '),
        item: item
      });
    }
  }
  return results;
}

const allRequests = traverse(data.item);

console.log('=== FOLDER 05: Doctor Portal Requests ===');
allRequests
  .filter(r => r.folder.startsWith('05. Doctor Portal'))
  .forEach(r => {
    console.log(`[${r.item.request.method}] ${r.item.request.url.raw || r.item.request.url} | ${r.item.name}`);
  });

console.log('\n=== FOLDER 10: Appointments Requests ===');
allRequests
  .filter(r => r.folder.startsWith('10. Appointments'))
  .forEach(r => {
    console.log(`[${r.item.request.method}] ${r.item.request.url.raw || r.item.request.url} | ${r.item.name}`);
  });

console.log('\n=== FOLDER 27: Healthcare Financing Requests ===');
allRequests
  .filter(r => r.folder.startsWith('27. Healthcare Financing'))
  .forEach(r => {
    console.log(`[${r.item.request.method}] ${r.item.request.url.raw || r.item.request.url} | ${r.item.name}`);
  });

console.log('\n=== ANY OTHER MATCHES FOR "offer" OR "treatment" OR "cpt" OR "procedure" ===');
allRequests
  .filter(r => {
    const isAlreadyShown = r.folder.startsWith('05. Doctor Portal') || 
                           r.folder.startsWith('10. Appointments') || 
                           r.folder.startsWith('27. Healthcare Financing');
    if (isAlreadyShown) return false;
    const s = `${r.folder} ${r.item.name} ${(r.item.request.url.raw || r.item.request.url)}`.toLowerCase();
    return s.includes('offer') || s.includes('treatment') || s.includes('cpt') || s.includes('procedure') || s.includes('consult');
  })
  .forEach(r => {
    console.log(`[${r.item.request.method}] ${r.item.request.url.raw || r.item.request.url} | ${r.folder} -> ${r.item.name}`);
  });
