const fs = require('fs');

const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

console.log('=== 1. SEARCH FOR "ROOM" IN ENTIRE POSTMAN COLLECTION ===');
function searchRequests(items, folderPath = '') {
  const matches = [];
  for (const item of items) {
    const curPath = folderPath ? folderPath + ' > ' + item.name : item.name;
    if (item.item) {
      matches.push(...searchRequests(item.item, curPath));
    } else if (item.request) {
      const url = typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw;
      const lower = (item.name + ' ' + curPath + ' ' + url + ' ' + (item.request.description || '')).toLowerCase();
      if (lower.includes('room')) {
        matches.push({
          name: item.name,
          folder: curPath,
          method: item.request.method,
          url,
          body: item.request.body,
          description: item.request.description,
        });
      }
    }
  }
  return matches;
}

const roomMatches = searchRequests(collection.item);
console.log(`Found ${roomMatches.length} room-related requests:\n`);
roomMatches.forEach((m, i) => {
  console.log(`${i + 1}. [${m.method}] ${m.url}`);
  console.log(`   Name: ${m.name}`);
  console.log(`   Folder: ${m.folder}`);
  if (m.body?.raw) {
    console.log(`   Body: ${m.body.raw.slice(0, 300)}`);
  }
  console.log('');
});

console.log('=== 2. ALL REQUESTS IN FOLDER 09: Facilities & Branches ===');
const f09 = collection.item.find(f => f.name.includes('09. Facilities'));
if (f09 && f09.item) {
  function listItems(items, p = '') {
    for (const item of items) {
      if (item.item) {
        listItems(item.item, p ? p + ' > ' + item.name : item.name);
      } else if (item.request) {
        const url = typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw;
        console.log(`[${item.request.method}] ${url} | ${item.name}`);
      }
    }
  }
  listItems(f09.item);
}

