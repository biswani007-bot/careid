const fs = require('fs');
const collText = fs.readFileSync('CareID-Staging.postman_collection.json', 'utf8');
const lines = collText.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('eyJhbGci')) {
    console.log(`Line ${idx + 1}: ${l.trim().substring(0, 100)}`);
  }
});

