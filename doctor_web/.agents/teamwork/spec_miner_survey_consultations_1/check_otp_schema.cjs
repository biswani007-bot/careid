const fs = require('fs');
const path = require('path');

const collectionPath = path.resolve('Postman collection', 'CareID-Staging.postman_collection.json');
const raw = fs.readFileSync(collectionPath, 'utf8');
const data = JSON.parse(raw);

function findReq(items, name) {
  for (const item of items) {
    if (item.name && item.name.includes(name)) return item;
    if (item.item) {
      const res = findReq(item.item, name);
      if (res) return res;
    }
  }
  return null;
}

const req = findReq(data.item, 'Request Phone OTP');
console.log(JSON.stringify(req.request, null, 2));

const verifyReq = findReq(data.item, 'Verify Phone OTP');
console.log(JSON.stringify(verifyReq.request, null, 2));
