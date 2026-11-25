const fs = require('fs');
const col = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findItem(items, name) {
  for (const it of items) {
    if (it.name && it.name.includes(name)) return it;
    if (it.item) {
      const found = findItem(it.item, name);
      if (found) return found;
    }
  }
}

const req1 = findItem(col.item, 'Get all diagnostic reports for the patient');
console.log('GET /reports:');
console.log(JSON.stringify(req1, null, 2));

const req2 = findItem(col.item, 'Get report categories list with record count breakdown');
console.log('\nGET /reports/categories:');
console.log(JSON.stringify(req2, null, 2));

const req3 = findItem(col.item, 'Get specific diagnostic report details by ID');
console.log('\nGET /reports/:id:');
console.log(JSON.stringify(req3, null, 2));

