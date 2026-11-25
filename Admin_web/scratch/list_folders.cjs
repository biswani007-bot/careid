const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '../Postman collection/CareID-Staging.postman_collection.json');
const col = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

col.item.forEach((f, i) => {
  console.log(`[${i + 1}] ${f.name} (${f.item?.length || 0} items)`);
});

