const fs = require('fs');
const path = require('path');

const postmanPath = path.resolve(__dirname, '../../../Postman collection/CareID-Staging.postman_collection.json');
const collection = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));

console.log('Collection Name:', collection.info?.name);
console.log('Top-level folders count:', collection.item?.length);

function extractRequests(items, folderPath = '') {
  let results = [];
  for (const item of items) {
    const currentPath = folderPath ? `${folderPath} > ${item.name}` : item.name;
    if (item.item && Array.isArray(item.item)) {
      results = results.concat(extractRequests(item.item, currentPath));
    } else if (item.request) {
      const req = item.request;
      const method = req.method;
      let rawUrl = '';
      if (typeof req.url === 'string') {
        rawUrl = req.url;
      } else if (req.url && req.url.raw) {
        rawUrl = req.url.raw;
      } else if (req.url && req.url.path) {
        rawUrl = '/' + (Array.isArray(req.url.path) ? req.url.path.join('/') : req.url.path);
      }
      
      const headers = req.header ? req.header.map(h => `${h.key}: ${h.value}`) : [];
      let bodyMode = req.body?.mode;
      let bodyRaw = req.body?.raw || '';
      
      let responses = [];
      if (item.response && Array.isArray(item.response)) {
        responses = item.response.map(r => ({
          name: r.name,
          code: r.code,
          status: r.status,
          body: r.body ? r.body.slice(0, 500) : ''
        }));
      }

      results.push({
        folder: folderPath,
        name: item.name,
        method,
        url: rawUrl,
        headers,
        bodyMode,
        bodyRaw,
        responses
      });
    }
  }
  return results;
}

const allRequests = extractRequests(collection.item);
console.log('Total requests in collection:', allRequests.length);

const summary = allRequests.map((r, i) => {
  return `[${i + 1}] [${r.method}] ${r.url} | Folder: ${r.folder} | Name: ${r.name}`;
});

fs.writeFileSync(path.resolve(__dirname, 'all_endpoints.txt'), summary.join('\n'), 'utf8');
fs.writeFileSync(path.resolve(__dirname, 'all_endpoints_detail.json'), JSON.stringify(allRequests, null, 2), 'utf8');
console.log('Wrote all_endpoints.txt and all_endpoints_detail.json');
