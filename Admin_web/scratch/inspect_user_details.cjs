const fs = require('fs');

const collectionPath = 'D:\\New folder\\New folder\\healthvault\\Postman collection\\CareID-Staging.postman_collection.json';
const data = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

function findFolder(items, name) {
  for (const item of items) {
    if (item.name && item.name.includes(name)) return item;
    if (item.item) {
      const found = findFolder(item.item, name);
      if (found) return found;
    }
  }
  return null;
}

const adminFolder = findFolder(data.item, '04. Admin Portal');
const userOps = adminFolder.item.filter(i => {
  const url = i.request?.url?.raw || '';
  return url.includes('/admin/users');
});

const detailed = userOps.map(op => {
  return {
    name: op.name,
    method: op.request?.method,
    url: op.request?.url,
    header: op.request?.header,
    body: op.request?.body,
    description: op.request?.description,
    responses: op.response?.map(r => ({
      name: r.name,
      status: r.status,
      code: r.code,
      body: r.body ? JSON.parse(r.body) : null
    }))
  };
});

fs.writeFileSync('scratch/user_endpoints_detailed.json', JSON.stringify(detailed, null, 2), 'utf8');
console.log('Saved detailed user endpoints. Count:', detailed.length);
detailed.forEach(d => {
  console.log(`\nEndpoint: [${d.method}] ${d.name}`);
  console.log(`URL Raw: ${d.url?.raw}`);
  console.log(`Query Params:`, d.url?.query);
  if (d.body) console.log(`Body:`, d.body);
  if (d.responses && d.responses.length > 0) {
    console.log(`Response sample status: ${d.responses[0].code}`);
    console.log(`Response body preview:`, JSON.stringify(d.responses[0].body).slice(0, 300));
  }
});

