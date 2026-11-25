const fs = require('fs');

const postmanPath = './Postman collection/CareID-Staging.postman_collection.json';
const postman = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));

function findItem(items, targetName) {
  for (const it of items) {
    if (it.name && it.name.includes(targetName)) {
      console.log('Found:', it.name);
      console.log('Request:', JSON.stringify(it.request, null, 2));
      if (it.response && it.response.length > 0) {
        console.log('Sample Response Status:', it.response[0].status, it.response[0].code);
        console.log('Sample Response Body:', it.response[0].body ? it.response[0].body.slice(0, 500) : 'none');
      }
    }
    if (it.item) {
      findItem(it.item, targetName);
    }
  }
}

findItem(postman.item, 'medical records platform-wide');
findItem(postman.item, 'unified medical timeline');

