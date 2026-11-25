const fs = require('fs');
const collText = fs.readFileSync('CareID-Staging.postman_collection.json', 'utf8');
const lines = collText.split('\n');
console.log(lines.slice(364, 375).join('\n'));

