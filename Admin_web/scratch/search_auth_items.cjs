const fs = require('fs');

const collectionPath = 'D:\\New folder\\New folder\\healthvault\\Postman collection\\CareID-Staging.postman_collection.json';
const data = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

function findAuthItems(items) {
  const res = [];
  for (const item of items) {
    if (item.name && (item.name.toLowerCase().includes('login') || item.name.toLowerCase().includes('auth') || item.name.toLowerCase().includes('otp'))) {
      if (item.request) {
        res.push({
          name: item.name,
          method: item.request.method,
          url: item.request.url?.raw || item.request.url,
          body: item.request.body
        });
      }
    }
    if (item.item) {
      res.push(...findAuthItems(item.item));
    }
  }
  return res;
}

const auths = findAuthItems(data.item);
console.log('Auth items:', JSON.stringify(auths, null, 2));

