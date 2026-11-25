const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findRequest(urlPattern, method = 'POST') {
  let found = [];
  function walk(item) {
    if (item.request) {
      const url = typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw || '';
      if (item.request.method === method && url.includes(urlPattern)) {
        found.push(item);
      }
    }
    if (item.item) item.item.forEach(walk);
  }
  walk(postman);
  return found;
}

['/attachments', '/medical-records/:id/attachments', '/medical-records', '/admin/medical-records'].forEach(p => {
  console.log('=== SEARCHING FOR:', p);
  const res = findRequest(p, 'POST').concat(findRequest(p, 'GET'));
  res.forEach(r => {
    const url = typeof r.request.url === 'string' ? r.request.url : r.request.url?.raw || '';
    console.log(`[${r.request.method}] ${url} (${r.name})`);
    console.log('Body:', JSON.stringify(r.request.body, null, 2));
    if (r.response && r.response.length > 0) {
      console.log('Response sample:', r.response[0].name, r.response[0].body?.slice(0, 300));
    }
  });
});

