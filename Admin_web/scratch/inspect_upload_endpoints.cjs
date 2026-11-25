const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

const results = [];

function search(item, folderPath = '') {
  const currentPath = folderPath ? `${folderPath} / ${item.name}` : (item.name || '');
  if (item.request) {
    const url = typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw || '';
    const method = item.request.method;
    const bodyMode = item.request.body?.mode;
    const name = item.name;

    // Check if relevant to health records, upload, files, attachments
    if (
      url.includes('/medical-records') ||
      url.includes('/records') ||
      url.includes('/upload') ||
      url.includes('/attachments') ||
      url.includes('/files') ||
      url.includes('/documents') ||
      url.includes('/reports')
    ) {
      results.push({
        name,
        path: currentPath,
        method,
        url,
        bodyMode,
        body: item.request.body,
        description: item.request.description
      });
    }
  }
  if (item.item) {
    item.item.forEach(sub => search(sub, currentPath));
  }
}

search(postman);

console.log(`Found ${results.length} endpoints matching criteria:`);
results.forEach(r => {
  console.log(`--------------------------------------------------`);
  console.log(`[${r.method}] ${r.url}`);
  console.log(`Name: ${r.name}`);
  console.log(`Path: ${r.path}`);
  console.log(`Body Mode: ${r.bodyMode}`);
  if (r.bodyMode === 'formdata') {
    console.log(`FormData fields:`, r.body.formdata.map(f => `${f.key} (${f.type}): ${f.value || f.src}`));
  } else if (r.bodyMode === 'raw') {
    console.log(`Raw Body sample:`, (r.body.raw || '').slice(0, 300));
  }
});

