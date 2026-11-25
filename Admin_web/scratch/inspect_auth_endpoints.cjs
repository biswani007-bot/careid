const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function scanFolder(items, targetFolder) {
  let results = [];
  for (const item of items) {
    if (item.name.includes(targetFolder)) {
      if (item.item) {
        for (const sub of item.item) {
          results.push({
            name: sub.name,
            method: sub.request?.method,
            url: typeof sub.request?.url === 'string' ? sub.request?.url : sub.request?.url?.raw,
            body: sub.request?.body?.raw
          });
        }
      }
    }
  }
  return results;
}

console.log(JSON.stringify(scanFolder(postman.item, '02. Authentication'), null, 2));

