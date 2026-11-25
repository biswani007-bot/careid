const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function searchItems(item, path = '') {
  const currentPath = path ? path + ' > ' + (item.name || '') : (item.name || '');
  if (item.request) {
    const url = typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw || '';
    const method = item.request.method;
    const lower = (currentPath + ' ' + url).toLowerCase();
    if (lower.includes('record') || lower.includes('upload') || lower.includes('file') || lower.includes('attachment') || lower.includes('document')) {
      console.log(`[${method}] ${url} | Name: ${item.name} | Path: ${path}`);
    }
  }
  if (item.item) {
    item.item.forEach(sub => searchItems(sub, currentPath));
  }
}

searchItems(postman);

