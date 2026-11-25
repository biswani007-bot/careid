const fs = require('fs');
const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findRequestByName(items, name) {
  for (const item of items) {
    if (item.name === name) return item;
    if (item.item) {
      const found = findRequestByName(item.item, name);
      if (found) return found;
    }
  }
  return null;
}

const req = findRequestByName(collection.item, 'Get comprehensive patient details by ID or User ID');
console.log('Request:', JSON.stringify(req.request, null, 2));
if (req.response) {
  console.log('Example Responses Count:', req.response.length);
  req.response.forEach((r, idx) => {
    console.log(`\nExample Response ${idx + 1} (${r.status} ${r.code}):`);
    console.log(r.body ? r.body.slice(0, 1000) : 'No body');
  });
}

