const fs = require('fs');
const path = require('path');

const collectionPath = path.resolve('Postman collection', 'CareID-Staging.postman_collection.json');
const raw = fs.readFileSync(collectionPath, 'utf8');

// Let's search for status matches
const statusRegex = /(DRAFT|DISPATCHED|PATIENT_REVIEWING|RATIFIED_ACCEPTED|ACCEPTED|DECLINED|REJECTED|CANCELLED|EXPIRED|PENDING)/g;
const matches = new Set(raw.match(statusRegex) || []);
console.log('Status tokens found:', Array.from(matches));

// Let's also check descriptions in the treatment offers folder
const data = JSON.parse(raw);
function findFolder(items, name) {
  for (const item of items) {
    if (item.name === name) return item;
    if (item.item) {
      const res = findFolder(item.item, name);
      if (res) return res;
    }
  }
  return null;
}

const doctorPortal = findFolder(data.item, '05. Doctor Portal');
if (doctorPortal) {
  console.log('\nDoctor Portal items count:', doctorPortal.item.length);
  const toItems = doctorPortal.item.filter(i => (i.request && (i.request.url.raw || i.request.url || '').includes('treatment-offer')));
  toItems.forEach(i => {
    console.log(`\nItem: ${i.name}`);
    console.log(`Desc: ${i.description || (i.request && i.request.description) || ''}`);
  });
}
