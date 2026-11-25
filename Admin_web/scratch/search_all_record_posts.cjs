const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findPosts(item, path = '') {
  const currentPath = path ? path + ' > ' + (item.name || '') : (item.name || '');
  if (item.request && item.request.method === 'POST') {
    const url = typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw || '';
    if (url.includes('record') || item.name.toLowerCase().includes('record') || url.includes('attach') || item.name.toLowerCase().includes('attach') || url.includes('upload') || item.name.toLowerCase().includes('upload') || url.includes('report') || item.name.toLowerCase().includes('report')) {
      console.log(`[POST] ${url} | "${item.name}" | in: ${currentPath}`);
      if (item.request.body) {
        console.log(`   mode: ${item.request.body.mode}`);
        if (item.request.body.mode === 'raw') {
          console.log(`   sample: ${item.request.body.raw.slice(0, 150)}`);
        }
      }
    }
  }
  if (item.item) item.item.forEach(sub => findPosts(sub, currentPath));
}

findPosts(postman);

