const fs = require('fs');

const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findRequests(items, path = []) {
  let results = [];
  for (const item of items) {
    const currentPath = [...path, item.name];
    if (item.request) {
      let rawUrl = '';
      if (typeof item.request.url === 'string') {
        rawUrl = item.request.url;
      } else if (item.request.url) {
        rawUrl = item.request.url.raw || (item.request.url.path ? item.request.url.path.join('/') : '');
      }
      results.push({
        folder: currentPath.slice(0, -1).join(' > '),
        name: item.name,
        method: item.request.method,
        url: rawUrl,
        request: item.request,
        response: item.response || []
      });
    }
    if (item.item) {
      results = results.concat(findRequests(item.item, currentPath));
    }
  }
  return results;
}

const allRequests = findRequests(postman.item);
console.log('Total requests in collection:', allRequests.length);

const ocrMatches = allRequests.filter(r => 
  r.folder.toLowerCase().includes('ocr') || 
  r.url.toLowerCase().includes('ocr') || 
  r.name.toLowerCase().includes('ocr')
);

console.log('Matching OCR requests count:', ocrMatches.length);
ocrMatches.forEach((r, idx) => {
  console.log(`\n--- [${idx + 1}] ${r.method} ${r.url} ---`);
  console.log(`Folder: ${r.folder} | Name: ${r.name}`);
  if (r.request.body) {
    console.log('Body mode:', r.request.body.mode);
    if (r.request.body.raw) console.log('Body raw:', r.request.body.raw);
  }
  if (r.response && r.response.length > 0) {
    console.log('Saved response examples:', r.response.length);
    const firstResp = r.response[0];
    console.log('Response status:', firstResp.status, firstResp.code);
    if (firstResp.body) {
      try {
        const parsed = JSON.parse(firstResp.body);
        console.log('Response body preview:', JSON.stringify(parsed, null, 2).slice(0, 500));
      } catch {
        console.log('Response raw preview:', firstResp.body.slice(0, 200));
      }
    }
  }
});

// Also search for document review, approve, reject, extraction, etc.
const reviewMatches = allRequests.filter(r => 
  (r.folder.toLowerCase().includes('review') || r.name.toLowerCase().includes('review') ||
   r.url.toLowerCase().includes('review') || r.name.toLowerCase().includes('reject') ||
   r.name.toLowerCase().includes('approve') || r.url.toLowerCase().includes('approve') ||
   r.url.toLowerCase().includes('reject')) &&
  !ocrMatches.includes(r)
);

console.log('\nOther potential review/approve/reject requests:', reviewMatches.length);
reviewMatches.forEach((r, idx) => {
  console.log(`\n--- [OTHER ${idx + 1}] ${r.method} ${r.url} ---`);
  console.log(`Folder: ${r.folder} | Name: ${r.name}`);
});

