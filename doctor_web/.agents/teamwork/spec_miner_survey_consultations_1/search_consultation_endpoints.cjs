const fs = require('fs');
const path = require('path');

const collectionPath = path.resolve('Postman collection', 'CareID-Staging.postman_collection.json');
const raw = fs.readFileSync(collectionPath, 'utf8');

const matches = raw.match(/\/api\/v1\/[a-zA-Z0-9_-]*consult[a-zA-Z0-9_/-]*/gi);
console.log('Consultation URL matches:', matches);

// Check if word "consultation" appears anywhere
let count = 0;
let pos = 0;
while ((pos = raw.toLowerCase().indexOf('consultation', pos)) !== -1) {
  count++;
  pos += 12;
}
console.log('Occurrences of word "consultation" in entire collection:', count);

// Where does "consultation" appear?
const lines = raw.split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('consultation')) {
    console.log(`Line ${idx + 1}: ${line.trim().slice(0, 150)}`);
  }
});
