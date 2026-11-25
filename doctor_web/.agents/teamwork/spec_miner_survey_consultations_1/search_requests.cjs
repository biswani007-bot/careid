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
console.log(`Total requests parsed: ${allRequests.length}`);

// Keywords to inspect
const keywords = [
  'consult', 'offer', 'treatment', 'cpt', 'procedur', 'pric', 'discount',
  'financ', 'package', 'attest', 'clearance', 'suite', 'hold', 'slot',
  'ledger', 'checkin', 'check-in', 'appointment', 'proposal', 'catalog', 'trajectory'
];

const matches = [];

for (const reqObj of allRequests) {
  const item = reqObj.item;
  const name = item.name || '';
  const req = item.request;
  const method = req.method;
  const url = req.url ? (typeof req.url === 'string' ? req.url : (req.url.raw || '')) : '';
  const desc = item.description || (req.description || '');
  
  const textToSearch = `${reqObj.folder} ${name} ${url} ${desc}`.toLowerCase();
  
  const matchedKeywords = keywords.filter(k => textToSearch.includes(k));
  if (matchedKeywords.length > 0) {
    matches.push({
      folder: reqObj.folder,
      name,
      method,
      url,
      matchedKeywords,
      hasBody: !!(req.body && (req.body.raw || req.body.urlencoded || req.body.formdata)),
      bodyMode: req.body ? req.body.mode : null,
      rawBody: req.body && req.body.raw ? req.body.raw : null,
      responsesCount: item.response ? item.response.length : 0
    });
  }
}

console.log(`Matches found: ${matches.length}`);
fs.writeFileSync(
  path.resolve('.agents/teamwork/spec_miner_survey_consultations_1/matched_requests.json'),
  JSON.stringify(matches, null, 2),
  'utf8'
);

for (const m of matches) {
  console.log(`[${m.method}] ${m.url} | ${m.folder} -> ${m.name}`);
}
