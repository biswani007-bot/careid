const fs = require('fs');

const collection = JSON.parse(fs.readFileSync('CareID-Staging.postman_collection.json', 'utf8'));

function findResend(items) {
  for (const item of items) {
    if (item.name && item.name.includes('Resend')) {
      console.log('Item Name:', item.name);
      console.log('Request Method:', item.request.method);
      console.log('Request URL:', JSON.stringify(item.request.url));
      console.log('Request Body:', item.request.body ? item.request.body.raw : 'none');
    }
    if (item.item) findResend(item.item);
  }
}
findResend(collection.item);

