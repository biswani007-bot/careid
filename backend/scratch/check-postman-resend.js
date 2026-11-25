const fs = require('fs');

const collectionPath = 'CareID-Staging.postman_collection.json';
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

// Check if resend endpoint is already present
let found = false;
function checkItem(items) {
  for (const item of items) {
    if (item.name && item.name.includes('Resend')) {
      found = true;
    }
    if (item.item) checkItem(item.item);
  }
}
checkItem(collection.item);
console.log('Resend endpoint found in collection:', found);

