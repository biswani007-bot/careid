const fs = require('fs');
const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function searchItems(items, folderPath = []) {
  let results = [];
  for (const item of items) {
    const currentPath = [...folderPath, item.name];
    if (item.request) {
      const url = typeof item.request.url === 'string' ? item.request.url : (item.request.url?.raw || '');
      const method = item.request.method;
      const lower = (item.name + ' ' + url + ' ' + (item.request.description || '')).toLowerCase();
      if (lower.includes('audit') || lower.includes('log') || lower.includes('event') || lower.includes('activity')) {
        results.push({
          folder: folderPath.join(' > '),
          name: item.name,
          method,
          url,
          queryParams: item.request.url?.query || [],
          header: item.request.header || [],
          body: item.request.body?.raw || null,
        });
      }
    }
    if (item.item) {
      results = results.concat(searchItems(item.item, currentPath));
    }
  }
  return results;
}

const matches = searchItems(collection.item);
console.log(`Found ${matches.length} matches:`);
matches.forEach((m, idx) => {
  console.log(`\n--- [${idx + 1}] ${m.folder} -> ${m.name} ---`);
  console.log(`${m.method} ${m.url}`);
  if (m.queryParams.length > 0) {
    console.log('Query Params:', m.queryParams.map(q => `${q.key}=${q.value} (${q.description || ''})`).join(', '));
  }
});
fs.writeFileSync('scratch/audit_postman_matches.json', JSON.stringify(matches, null, 2));

