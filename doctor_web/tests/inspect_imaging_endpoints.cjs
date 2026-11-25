const fs = require('fs');
const col = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function search(items, path = []) {
  let results = [];
  for (const item of items) {
    const currentPath = [...path, item.name];
    if (item.request) {
      const url = item.request.url?.raw || (Array.isArray(item.request.url?.path) ? item.request.url.path.join('/') : '');
      const method = item.request.method;
      const fullText = (currentPath.join(' ') + ' ' + url + ' ' + JSON.stringify(item.request)).toLowerCase();
      if (['imaging', 'radiology', 'dicom', 'attachment', 'media', 'download'].some(w => fullText.includes(w))) {
        results.push({ folder: currentPath.slice(0, -1).join(' > '), name: item.name, method, url });
      }
    }
    if (item.item) {
      results = results.concat(search(item.item, currentPath));
    }
  }
  return results;
}

const matches = search(col.item);
console.log('Matches:', matches.length);
matches.forEach(m => console.log(`[${m.method}] ${m.url} | ${m.folder} > ${m.name}`));

