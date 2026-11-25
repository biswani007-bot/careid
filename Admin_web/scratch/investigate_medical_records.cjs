const fs = require('fs');

const collectionPath = 'D:/New folder/New folder/healthvault/Postman collection/CareID-Staging.postman_collection.json';
const data = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

console.log('Searching Postman collection for medical-records, attachments, records...');

function searchItems(items, parentPath = '') {
  let matches = [];
  for (const item of items) {
    const currentPath = parentPath ? `${parentPath} > ${item.name}` : item.name;
    if (item.request) {
      const url = item.request.url?.raw || (typeof item.request.url === 'string' ? item.request.url : item.request.url?.path?.join('/'));
      const method = item.request.method;
      if (url && (url.includes('record') || url.includes('attachment') || url.includes('upload'))) {
        matches.push({
          path: currentPath,
          name: item.name,
          method,
          url,
          query: item.request.url?.query || [],
          body: item.request.body?.raw || item.request.body?.formdata || null,
          description: item.request.description
        });
      }
    }
    if (item.item) {
      matches = matches.concat(searchItems(item.item, currentPath));
    }
  }
  return matches;
}

const results = searchItems(data.item);
console.log(`Found ${results.length} matching endpoints:`);
results.forEach(r => {
  console.log(`\n[${r.method}] ${r.url} (${r.path})`);
  if (r.query && r.query.length > 0) {
    console.log('  Query Params:', r.query.map(q => `${q.key}=${q.value || ''} (${q.disabled ? 'disabled' : 'active'})`).join(', '));
  }
  if (r.body) {
    console.log('  Body:', typeof r.body === 'string' ? r.body.slice(0, 150) : JSON.stringify(r.body).slice(0, 150));
  }
});

