const fs = require('fs');

const collection = JSON.parse(fs.readFileSync('CareID-Staging.postman_collection.json', 'utf8'));

const docPortal = collection.item.find(i => i.name.includes('05. Doctor Portal'));
if (docPortal) {
  console.log('Doc Portal Subfolders:');
  docPortal.item.forEach((sub, idx) => {
    console.log(`[${idx}] ${sub.name} (${sub.item ? sub.item.length + ' items' : 'endpoint'})`);
  });
}

