const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '..', 'Postman collection', 'CareID-Staging.postman_collection.json');
const raw = fs.readFileSync(collectionPath, 'utf8');
const collection = JSON.parse(raw);

console.log('Collection Name:', collection.info?.name);
console.log('Collection Description:', collection.info?.description?.slice(0, 100));

const endpoints = [];

function extractItems(items, folderPath = '') {
  for (const item of items) {
    if (item.item && Array.isArray(item.item)) {
      extractItems(item.item, folderPath ? `${folderPath} > ${item.name}` : item.name);
    } else if (item.request) {
      const method = item.request.method;
      let url = '';
      if (typeof item.request.url === 'string') {
        url = item.request.url;
      } else if (item.request.url && item.request.url.raw) {
        url = item.request.url.raw;
      } else if (item.request.url && item.request.url.path) {
        url = '/' + item.request.url.path.join('/');
      }
      endpoints.push({
        folder: folderPath,
        name: item.name,
        method,
        url,
        hasAuth: !!item.request.auth,
        hasBody: !!item.request.body,
        responses: item.response ? item.response.length : 0
      });
    }
  }
}

extractItems(collection.item);
console.log(`Extracted ${endpoints.length} total endpoints from Postman collection.\n`);

// Save all endpoints to a json for detailed inspection
fs.writeFileSync(path.join(__dirname, 'postman_endpoints_summary.json'), JSON.stringify(endpoints, null, 2));

// Search for keywords
const keywords = [
  'dash', 'stat', 'metric', 'count', 'overview', 'kpi',
  'patient', 'doctor', 'user', 'session', 'ocr', 'referral',
  'health', 'ping', 'system', 'task', 'audit', 'log'
];

console.log('--- RELEVANT ENDPOINTS GROUPED BY DOMAIN ---');
keywords.forEach(kw => {
  const matched = endpoints.filter(e => 
    e.name.toLowerCase().includes(kw) || 
    e.url.toLowerCase().includes(kw) || 
    e.folder.toLowerCase().includes(kw)
  );
  console.log(`\nKeyword "${kw}" matches (${matched.length}):`);
  matched.slice(0, 10).forEach(m => {
    console.log(`  [${m.method}] ${m.url}  (${m.folder} -> ${m.name})`);
  });
});

