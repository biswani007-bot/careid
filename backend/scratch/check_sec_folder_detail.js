const fs = require('fs');
const coll = JSON.parse(fs.readFileSync('CareID-Staging.postman_collection.json', 'utf8'));
const sec = coll.item.find(i => i.name.startsWith('18. Security'));
console.log('Folder name:', sec.name);
console.log('Total items in folder:', sec.item.length);
sec.item.forEach((it, idx) => {
  if (it.item) {
    console.log(`${idx + 1}. [SUBFOLDER] ${it.name} (${it.item.length} requests)`);
    it.item.forEach((subIt, subIdx) => {
      console.log(`    ${subIdx + 1}. [${subIt.request.method}] ${subIt.name} -> ${subIt.request.url.raw}`);
    });
  } else {
    console.log(`${idx + 1}. [${it.request.method}] ${it.name}`);
  }
});

