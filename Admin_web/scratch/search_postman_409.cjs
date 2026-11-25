const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

const content = fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8');

function findMatches(str, term) {
  let idx = 0;
  const results = [];
  while ((idx = str.indexOf(term, idx)) !== -1) {
    const start = Math.max(0, idx - 150);
    const end = Math.min(str.length, idx + 150);
    results.push(str.slice(start, end).replace(/\s+/g, ' '));
    idx += term.length;
  }
  return results;
}

console.log('Matches for "already exists":', findMatches(content, 'already exists'));
console.log('Matches for "Conflict":', findMatches(content, 'Conflict'));
console.log('Matches for "409":', findMatches(content, '409'));

