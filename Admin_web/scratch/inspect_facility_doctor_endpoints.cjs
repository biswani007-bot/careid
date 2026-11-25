const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findFacilityDoctor(items, folder = '') {
  for (const item of items) {
    const fName = folder ? folder + ' > ' + item.name : item.name;
    if (item.request) {
      const url = item.request.url?.raw || '';
      if (url.includes('/facilities') || url.includes('/doctors')) {
        console.log(`=== ${item.name} ===`);
        console.log(`Method: ${item.request.method}`);
        console.log(`URL: ${url}`);
        if (item.request.url?.query) {
          console.log(`Query parameters:`, item.request.url.query.map(q => q.key + (q.value ? '=' + q.value : '')));
        }
        console.log('');
      }
    }
    if (item.item) {
      findFacilityDoctor(item.item, fName);
    }
  }
}

findFacilityDoctor(postman.item);

