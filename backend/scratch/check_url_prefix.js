const fs = require('fs');
const coll = JSON.parse(fs.readFileSync('CareID-Staging.postman_collection.json', 'utf8'));

let withApiV1 = 0;
let withoutApiV1 = 0;
let other = 0;

function checkItem(it) {
  if (it.request && it.request.url) {
    const raw = it.request.url.raw || '';
    if (raw.includes('/api/v1/')) {
      withApiV1++;
    } else {
      withoutApiV1++;
    }
  }
  if (it.item) {
    it.item.forEach(checkItem);
  }
}
coll.item.forEach(checkItem);
console.log('Requests with /api/v1/ in raw url:', withApiV1);
console.log('Requests without /api/v1/ in raw url:', withoutApiV1);

