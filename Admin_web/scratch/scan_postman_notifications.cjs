const fs = require('fs');

const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function scanItems(items, folderPath = '') {
  const matches = [];
  for (const item of items) {
    const currentPath = folderPath ? folderPath + ' > ' + item.name : item.name;
    if (item.item) {
      matches.push(...scanItems(item.item, currentPath));
    } else if (item.request) {
      const url = typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw;
      const method = item.request.method;
      const lower = (item.name + ' ' + currentPath + ' ' + url).toLowerCase();
      if (
        lower.includes('notif') ||
        lower.includes('alert') ||
        lower.includes('announce') ||
        lower.includes('ticket') ||
        lower.includes('support')
      ) {
        matches.push({
          method,
          url,
          name: item.name,
          folder: currentPath,
          description: item.request.description,
          body: item.request.body,
        });
      }
    }
  }
  return matches;
}

console.log('--- Scanning Postman Collection ---');
const results = scanItems(collection.item);
console.log(`Found ${results.length} matches:\n`);
results.forEach((r, idx) => {
  console.log(`${idx + 1}. [${r.method}] ${r.url}`);
  console.log(`   Name: ${r.name}`);
  console.log(`   Folder: ${r.folder}`);
  if (r.body) {
    console.log(`   Body mode: ${r.body.mode}`);
    if (r.body.raw) {
      console.log(`   Body raw: ${r.body.raw.slice(0, 200)}`);
    }
  }
  console.log('');
});

// Also list all top-level folders in the Postman collection
console.log('--- Top-Level Folders in Postman Collection ---');
collection.item.forEach((f, idx) => {
  console.log(`${idx + 1}. ${f.name} (${f.item ? f.item.length + ' items' : 'request'})`);
});

