const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findItemByName(name) {
  let found = null;
  function walk(item) {
    if (item.name && item.name.includes(name)) {
      found = item;
    }
    if (item.item) item.item.forEach(walk);
  }
  walk(postman);
  return found;
}

const att1 = findItemByName('Upload an unlinked or global attachment');
console.log('att1:', JSON.stringify(att1, null, 2));

const att2 = findItemByName('Upload and link an attachment to a specific medical record');
console.log('att2:', JSON.stringify(att2, null, 2));

