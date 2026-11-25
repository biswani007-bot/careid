const fs = require('fs');
const path = require('path');

const postmanPath = path.resolve(__dirname, '../../../Postman collection/CareID-Staging.postman_collection.json');
const collection = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));

const folders = collection.item.map((item, idx) => {
  const reqCount = item.item ? countReqs(item.item) : (item.request ? 1 : 0);
  return `${idx + 1}. ${item.name} (${reqCount} requests)`;
});

function countReqs(items) {
  let count = 0;
  for (const it of items) {
    if (it.item) count += countReqs(it.item);
    if (it.request) count += 1;
  }
  return count;
}

console.log('Top level folders:');
console.log(folders.join('\n'));

fs.writeFileSync(path.resolve(__dirname, 'folders_summary.txt'), folders.join('\n'), 'utf8');
