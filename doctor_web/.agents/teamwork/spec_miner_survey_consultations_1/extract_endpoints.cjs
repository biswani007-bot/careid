const fs = require('fs');
const path = require('path');

const collectionPath = path.resolve('Postman collection', 'CareID-Staging.postman_collection.json');
const raw = fs.readFileSync(collectionPath, 'utf8');
const data = JSON.parse(raw);

function traverse(items, currentPath = []) {
  let results = [];
  for (const item of items) {
    const newPath = [...currentPath, item.name];
    if (item.item && Array.isArray(item.item)) {
      results = results.concat(traverse(item.item, newPath));
    } else if (item.request) {
      results.push({
        folder: currentPath.join(' > '),
        item: item
      });
    }
  }
  return results;
}

const allRequests = traverse(data.item);

// Let's filter target requests
const targetPredicates = [
  r => r.folder.includes('Doctor Portal') && (r.item.request.url.raw || '').includes('treatment-offer'),
  r => r.folder.includes('Patient App') && (r.item.request.url.raw || '').includes('treatment-offer'),
  r => r.folder.includes('Financing'),
  r => (r.item.request.url.raw || '').includes('encounter') || (r.item.request.url.raw || '').includes('medical-record'),
  r => r.folder.includes('Appointments') && (r.item.request.url.raw || '').includes('appointment'),
  r => (r.item.request.url.raw || '').toLowerCase().includes('cpt') || (r.item.name || '').toLowerCase().includes('cpt') || (r.item.name || '').toLowerCase().includes('procedure') || (r.item.request.url.raw || '').toLowerCase().includes('procedure')
];

const selected = allRequests.filter(r => targetPredicates.some(p => p(r)));

const dump = selected.map(r => {
  const req = r.item.request;
  return {
    id: r.item.id || r.item._postman_id,
    folder: r.folder,
    name: r.item.name,
    description: r.item.description || req.description,
    method: req.method,
    url: req.url,
    headers: req.header,
    body: req.body,
    responses: (r.item.response || []).map(res => ({
      name: res.name,
      status: res.status,
      code: res.code,
      body: res.body ? (res.body.length > 2000 ? res.body.slice(0, 2000) + '...[truncated]' : res.body) : null
    }))
  };
});

fs.writeFileSync(
  path.resolve('.agents/teamwork/spec_miner_survey_consultations_1/treatment_and_consultations_dump.json'),
  JSON.stringify(dump, null, 2),
  'utf8'
);

console.log(`Dumped ${dump.length} target requests.`);
