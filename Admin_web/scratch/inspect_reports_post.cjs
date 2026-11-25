const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findItemByName(name) {
  let found = null;
  function walk(item) {
    if (item.name && item.name.includes(name)) found = item;
    if (item.item) item.item.forEach(walk);
  }
  walk(postman);
  return found;
}

const rep = findItemByName('Upload and register a diagnostic medical report');
console.log('Report request:', JSON.stringify(rep, null, 2));

