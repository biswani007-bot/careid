const fs = require('fs');
const coll = JSON.parse(fs.readFileSync('CareID-Staging.postman_collection.json', 'utf8'));
console.log('Collection events:', JSON.stringify(coll.event, null, 2));

