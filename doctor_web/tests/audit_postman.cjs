const fs = require('fs');
const col = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

const targets = ['safety-hold', 'safety-timeout', 'cath-lab', 'dicom', 'hemodynamics', 'procedures', 'encounters', 'medical-records', 'addenda'];

function search(items, prefix = '') {
  for (const item of items) {
    if (item.request) {
      const url = item.request.url.raw || '';
      const method = item.request.method;
      for (const t of targets) {
        if (url.toLowerCase().includes(t) || item.name.toLowerCase().includes(t)) {
          console.log('[' + method + '] ' + url + ' | ' + prefix + item.name);
          break;
        }
      }
    }
    if (item.item) {
      search(item.item, prefix + item.name + ' > ');
    }
  }
}

search(col.item);

