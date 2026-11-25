const fs = require('fs');

const data = fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8');
const col = JSON.parse(data);
console.log('Collection name:', col.info.name);

function getRequests(items) {
  let reqs = [];
  for (const item of items) {
    if (item.request) {
      const url = item.request.url.raw || (item.request.url.path ? item.request.url.path.join('/') : '');
      reqs.push({ name: item.name, method: item.request.method, url });
    }
    if (item.item) {
      reqs = reqs.concat(getRequests(item.item));
    }
  }
  return reqs;
}

const reqs = getRequests(col.item);
console.log('Total requests in collection:', reqs.length);

const targets = ['dispatch', 'treatment-offers', 'clearance', 'readiness', 'check-in', 'checkin', 'hold', 'rooms', 'slots', 'appointments'];
for (const t of targets) {
  const matches = reqs.filter(r => (r.url && r.url.toLowerCase().includes(t)) || (r.name && r.name.toLowerCase().includes(t)));
  console.log(`Keyword "${t}": found ${matches.length} matches`);
  matches.slice(0, 5).forEach(m => console.log(`   - [${m.method}] ${m.name} -> ${m.url}`));
}
