const fs = require('fs');
const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));
collection.item.forEach((folder, i) => {
  console.log((i + 1) + '. ' + folder.name + ' (' + (folder.item ? folder.item.length : 0) + ' items)');
});

