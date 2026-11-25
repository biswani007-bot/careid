const fs = require('fs');
const path = require('path');

const collectionPath = path.resolve('Postman collection', 'CareID-Staging.postman_collection.json');
const raw = fs.readFileSync(collectionPath, 'utf8');
const data = JSON.parse(raw);

function findReq(items, matchFn) {
  let results = [];
  for (const item of items) {
    if (item.request && matchFn(item)) {
      results.push(item);
    }
    if (item.item) {
      results = results.concat(findReq(item.item, matchFn));
    }
  }
  return results;
}

const encounters = findReq(data.item, i => (i.request.url.raw || i.request.url || '').includes('encounters'));
console.log('--- ENCOUNTER REQUESTS ---');
encounters.forEach(e => {
  console.log(`[${e.request.method}] ${e.request.url.raw || e.request.url} | ${e.name}`);
  if (e.request.body && e.request.body.raw) {
    console.log('Body:', e.request.body.raw);
  }
  if (e.response && e.response[0] && e.response[0].body) {
    console.log('Resp:', e.response[0].body.slice(0, 300));
  }
});
