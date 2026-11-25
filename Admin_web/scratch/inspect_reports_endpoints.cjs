const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findReports(items, folder = '') {
  for (const item of items) {
    const fName = folder ? folder + ' > ' + item.name : item.name;
    if (item.request) {
      const url = item.request.url?.raw || '';
      if (url.includes('/reports') || url.includes('/dashboard') || url.includes('analytics')) {
        console.log(`=== ${item.name} ===`);
        console.log(`Method: ${item.request.method}`);
        console.log(`URL: ${url}`);
        console.log(`Description: ${item.request.description || 'none'}`);
        if (item.request.url?.query) {
          console.log(`Query parameters:`, item.request.url.query);
        }
        console.log('');
      }
    }
    if (item.item) {
      findReports(item.item, fName);
    }
  }
}

findReports(postman.item);

