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

const toInspect = allRequests.filter(r => {
  const url = (r.item.request.url.raw || r.item.request.url || '');
  return url.includes('treatment-offers') || url.includes('/financing/');
});

console.log(`Found ${toInspect.length} endpoints to detail.\n`);

const details = toInspect.map(r => {
  const req = r.item.request;
  const urlObj = typeof req.url === 'string' ? { raw: req.url } : req.url;
  return {
    folder: r.folder,
    name: r.item.name,
    description: r.item.description || req.description,
    method: req.method,
    rawUrl: urlObj.raw,
    path: urlObj.path,
    query: urlObj.query || [],
    variable: urlObj.variable || [],
    headers: req.header || [],
    bodyMode: req.body ? req.body.mode : null,
    bodyRaw: req.body ? req.body.raw : null,
    responses: (r.item.response || []).map(res => ({
      name: res.name,
      code: res.code,
      status: res.status,
      body: res.body
    }))
  };
});

fs.writeFileSync(
  path.resolve('.agents/teamwork/spec_miner_survey_consultations_1/treatment_and_financing_details.json'),
  JSON.stringify(details, null, 2),
  'utf8'
);

console.log('Saved details to treatment_and_financing_details.json');
