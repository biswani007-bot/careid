const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

if (postman.variable) {
  console.log('Variables:', postman.variable.map(v => ({ key: v.key, value: v.value })));
} else {
  console.log('No top-level variables array');
}

