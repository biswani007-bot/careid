const fs = require('fs');
const coll = JSON.parse(fs.readFileSync('CareID-Staging.postman_collection.json', 'utf8'));
const sec = coll.item.find(i => i.name.includes('18. Security'));
console.log('Total items in 18. Security:', sec.item.length);
sec.item.forEach((it, idx) => {
  console.log(`${idx + 1}. [${it.request ? it.request.method : 'FOLDER'}] ${it.name}`);
});

