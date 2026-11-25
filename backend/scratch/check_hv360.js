const fs = require('fs');
if (fs.existsSync('Health-Vault-360-API.postman_collection.json')) {
  const coll2 = JSON.parse(fs.readFileSync('Health-Vault-360-API.postman_collection.json', 'utf8'));
  let sampleUrls = [];
  function checkItem2(it) {
    if (it.request && it.request.url) {
      sampleUrls.push(it.request.url.raw || '');
      if (sampleUrls.length >= 5) return;
    }
    if (it.item) it.item.forEach(checkItem2);
  }
  coll2.item.forEach(checkItem2);
  console.log('Health-Vault-360-API samples:', sampleUrls);
}

