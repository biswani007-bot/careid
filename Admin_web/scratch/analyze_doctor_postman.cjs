const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findRequests(items, path = []) {
  let reqs = [];
  for (const item of items) {
    if (item.request) {
      reqs.push({
        path: [...path, item.name].join(' > '),
        name: item.name,
        method: item.request.method,
        url: typeof item.request.url === 'string' ? item.request.url : item.request.url.raw,
        item
      });
    }
    if (item.item) {
      reqs.push(...findRequests(item.item, [...path, item.name]));
    }
  }
  return reqs;
}

const allReqs = findRequests(postman.item);
console.log('Total Postman requests:', allReqs.length);

const doctorReqs = allReqs.filter(r => 
  r.url.toLowerCase().includes('doctor') || 
  r.name.toLowerCase().includes('doctor') || 
  r.path.toLowerCase().includes('doctor')
);

console.log('Doctor-related requests count:', doctorReqs.length);

doctorReqs.forEach((r, idx) => {
  console.log(`\n[${idx + 1}] ${r.path}`);
  console.log(`    Method: ${r.method}`);
  console.log(`    URL: ${r.url}`);
  if (r.item.request.url && r.item.request.url.query) {
    console.log('    Query:', JSON.stringify(r.item.request.url.query));
  }
  if (r.item.request.body && r.item.request.body.raw) {
    console.log('    Body preview:', r.item.request.body.raw.substring(0, 300));
  }
  if (r.item.response && r.item.response.length > 0) {
    console.log(`    Saved responses: ${r.item.response.length}`);
    try {
      const resp0 = r.item.response[0];
      console.log(`    Response status: ${resp0.code} ${resp0.status}`);
      console.log('    Response body preview:', resp0.body ? resp0.body.substring(0, 300) : 'none');
    } catch (e) {}
  }
});

