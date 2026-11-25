const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '../Postman collection/CareID-Staging.postman_collection.json');
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

const results = [];

function traverse(item, folderHierarchy = []) {
  if (!item) return;
  if (item.item && Array.isArray(item.item)) {
    const newHierarchy = [...folderHierarchy, item.name];
    for (const child of item.item) {
      traverse(child, newHierarchy);
    }
  } else if (item.request) {
    const name = item.name;
    const method = item.request.method;
    let url = '';
    if (typeof item.request.url === 'string') {
      url = item.request.url;
    } else if (item.request.url && item.request.url.raw) {
      url = item.request.url.raw;
    }
    
    // Check if referral is in name or url
    if ((name && name.toLowerCase().includes('referral')) || (url && url.toLowerCase().includes('referral'))) {
      results.push({
        folder: folderHierarchy.join(' > '),
        name,
        method,
        url,
        body: item.request.body ? (item.request.body.raw || item.request.body.mode) : null,
        description: item.request.description
      });
    }
  }
}

traverse(collection);

console.log(`Found ${results.length} referral-related requests in Postman collection:\n`);
results.forEach((r, idx) => {
  console.log(`[${idx + 1}] [${r.method}] ${r.name}`);
  console.log(`    Folder: ${r.folder}`);
  console.log(`    URL:    ${r.url}`);
  if (r.body && typeof r.body === 'string' && r.body.length < 500) {
    console.log(`    Body:   ${r.body.replace(/\n/g, ' ')}`);
  }
});

fs.writeFileSync(path.join(__dirname, 'referral_postman_items.json'), JSON.stringify(results, null, 2));

