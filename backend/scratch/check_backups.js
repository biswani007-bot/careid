const fs = require('fs');

const backups = [
  'CareID-Staging.postman_collection.backup-phase8.json',
  'CareID-Staging.postman_collection.backup-phase6a.json',
  'CareID-Staging.postman_collection.backup-2026-10-30.json'
];

backups.forEach(b => {
  if (fs.existsSync(b)) {
    const coll = JSON.parse(fs.readFileSync(b, 'utf8'));
    const names = [];
    function findSec(items) {
      items.forEach(it => {
        if (it.name && it.name.toLowerCase().includes('audit')) names.push(it.name);
        if (it.item) findSec(it.item);
      });
    }
    findSec(coll.item);
    console.log(`=== ${b} audit items (${names.length}) ===`);
    console.log(names.slice(0, 10));
  }
});

