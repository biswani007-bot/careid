const fs = require('fs');
const coll = JSON.parse(fs.readFileSync('CareID-Staging.postman_collection.json', 'utf8'));
console.log('Collection variables:', coll.variable ? coll.variable.map(v => ({ key: v.key, value: v.value })) : 'none');

let samples = [];
function findUrls(items) {
  for (const it of items) {
    if (it.request && it.request.url) {
      samples.push(it.request.url.raw || it.request.url);
      if (samples.length >= 15) return;
    }
    if (it.item) findUrls(it.item);
  }
}
findUrls(coll.item);
console.log('URL samples:', samples);

