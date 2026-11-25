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

const hits = [];
for (const r of allRequests) {
  const url = (r.item.request.url.raw || r.item.request.url || '').toLowerCase();
  const name = (r.item.name || '').toLowerCase();
  const desc = (r.item.description || r.item.request.description || '').toLowerCase();
  
  const keywords = ['cpt', 'catalog', 'pricing', 'discount', 'tariff', 'fee', 'charge', 'procedure'];
  for (const kw of keywords) {
    if (url.includes(kw) || name.includes(kw) || desc.includes(kw)) {
      hits.push({ kw, folder: r.folder, name: r.item.name, method: r.item.request.method, url: r.item.request.url.raw || r.item.request.url });
    }
  }
}

console.log(`Found ${hits.length} keyword occurrences.`);
hits.forEach(h => console.log(`[${h.kw}] [${h.method}] ${h.url} (${h.folder} -> ${h.name})`));
