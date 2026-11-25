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

const appts = findReq(data.item, i => (i.request.url.raw || i.request.url || '').includes('/appointments') && i.request.method === 'POST');
console.log('--- APPOINTMENT POST REQUESTS ---');
appts.forEach(e => {
  console.log(`[${e.request.method}] ${e.request.url.raw || e.request.url} | ${e.name}`);
  if (e.request.body && e.request.body.raw) {
    console.log('Body:', e.request.body.raw);
  }
});

const apptStatus = findReq(data.item, i => (i.request.url.raw || i.request.url || '').includes('/status') && (i.request.url.raw || '').includes('appointments'));
console.log('--- APPOINTMENT STATUS REQUESTS ---');
apptStatus.forEach(e => {
  console.log(`[${e.request.method}] ${e.request.url.raw || e.request.url} | ${e.name}`);
  if (e.request.body && e.request.body.raw) {
    console.log('Body:', e.request.body.raw);
  }
});
