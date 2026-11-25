const fs = require('fs');
const col = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findRequest(items, name) {
  for (const item of items) {
    if (item.name && item.name.includes(name)) return item;
    if (item.item) {
      const found = findRequest(item.item, name);
      if (found) return found;
    }
  }
}

const req = findRequest(col.item, 'Get authorized patient medical records with pagination');
console.log('Postman Request:');
console.log(JSON.stringify(req, null, 2));

const vitalsReq = findRequest(col.item, 'List vital signs records for an authorized patient');
console.log('\nPostman Vitals Request:');
console.log(JSON.stringify(vitalsReq, null, 2));

