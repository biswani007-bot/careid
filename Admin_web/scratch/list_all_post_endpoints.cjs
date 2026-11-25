const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function scanItems(items, folder = '') {
  let results = [];
  for (const item of items) {
    const currentPath = folder ? `${folder} > ${item.name}` : item.name;
    if (item.item) {
      results = results.concat(scanItems(item.item, currentPath));
    } else if (item.request && item.request.method === 'POST') {
      const url = item.request.url ? (typeof item.request.url === 'string' ? item.request.url : item.request.url.raw) : '';
      results.push({
        folder: currentPath,
        name: item.name,
        url,
        body: item.request.body?.raw
      });
    }
  }
  return results;
}

const posts = scanItems(postman.item);
console.log(`Total POST endpoints in Postman: ${posts.length}`);
posts.forEach(p => {
  console.log(`- ${p.url}  [${p.name}]`);
});

