const fs = require('fs');
const coll = JSON.parse(fs.readFileSync('CareID-Staging.postman_collection.json', 'utf8'));
let subfolderCount = 0;
coll.item.forEach(f => {
  if (f.item) {
    f.item.forEach(sub => {
      if (sub.item) {
        console.log(`Subfolder found in ${f.name}: ${sub.name} (${sub.item.length} items)`);
        subfolderCount++;
      }
    });
  }
});
console.log('Total subfolders across collection:', subfolderCount);

