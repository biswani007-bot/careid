const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findFormDataAndUploads(item, path = '') {
  const currentPath = path ? path + ' > ' + (item.name || '') : (item.name || '');
  if (item.request) {
    const url = typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw || '';
    const method = item.request.method;
    const bodyMode = item.request.body?.mode;

    if (bodyMode === 'formdata' || url.toLowerCase().includes('upload') || url.toLowerCase().includes('attachment') || item.name.toLowerCase().includes('upload') || item.name.toLowerCase().includes('attachment')) {
      console.log('==================================================');
      console.log(`[${method}] ${url}`);
      console.log(`Name: ${item.name}`);
      console.log(`Path: ${currentPath}`);
      console.log(`Body Mode: ${bodyMode}`);
      if (bodyMode === 'formdata') {
        console.log('FormData fields:');
        item.request.body.formdata.forEach(f => {
          console.log(`  key: "${f.key}", type: "${f.type}", src: "${f.src}", value: "${f.value}", desc: "${f.description || ''}"`);
        });
      }
      if (bodyMode === 'raw') {
        console.log('Raw body:', item.request.body.raw.slice(0, 300));
      }
      console.log('Headers:', item.request.header);
    }
  }
  if (item.item) {
    item.item.forEach(sub => findFormDataAndUploads(sub, currentPath));
  }
}

findFormDataAndUploads(postman);

