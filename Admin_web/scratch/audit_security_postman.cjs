const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '../Postman collection/CareID-Staging.postman_collection.json');
const col = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

const results = [];

function searchItems(items, folderPath = '') {
  for (const item of items) {
    const currentPath = folderPath ? `${folderPath} / ${item.name}` : item.name;
    if (item.request) {
      const url = typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw || '';
      const method = item.request.method;
      const name = item.name;
      const desc = item.request.description || '';
      
      const combined = `${currentPath} ${url} ${name} ${desc}`.toLowerCase();
      
      if (
        combined.includes('setting') ||
        combined.includes('secur') ||
        combined.includes('policy') ||
        combined.includes('policies') ||
        combined.includes('password') ||
        combined.includes('session') ||
        combined.includes('mfa') ||
        combined.includes('two-factor') ||
        combined.includes('2fa') ||
        combined.includes('lockout') ||
        combined.includes('whitelist') ||
        combined.includes('ip') ||
        combined.includes('audit') ||
        combined.includes('auth') ||
        combined.includes('token')
      ) {
        results.push({
          folder: folderPath,
          name: item.name,
          method,
          url,
          body: item.request.body?.raw || (item.request.body?.mode ? `[mode: ${item.request.body.mode}]` : ''),
          response: item.response?.[0]?.body || ''
        });
      }
    }
    if (item.item) {
      searchItems(item.item, currentPath);
    }
  }
}

searchItems(col.item);
console.log(`Found ${results.length} matched requests.`);
results.forEach((r, i) => {
  console.log(`\n[${i + 1}] ${r.method} ${r.url}`);
  console.log(`    Folder: ${r.folder} | Name: ${r.name}`);
  if (r.body) {
    const preview = r.body.length > 200 ? r.body.slice(0, 200) + '...' : r.body;
    console.log(`    Body: ${preview.replace(/\s+/g, ' ')}`);
  }
});

