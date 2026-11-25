const fs = require('fs');

const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function extractFolderRequests(folderName) {
  const folder = collection.item.find(f => f.name.includes(folderName));
  if (!folder) return [];
  const reqs = [];
  function recurse(items, p = '') {
    for (const item of items) {
      if (item.item) {
        recurse(item.item, p ? p + ' > ' + item.name : item.name);
      } else if (item.request) {
        const url = typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw;
        reqs.push({
          name: item.name,
          path: p,
          method: item.request.method,
          url,
          query: item.request.url?.query,
          body: item.request.body,
        });
      }
    }
  }
  recurse(folder.item, folder.name);
  return reqs;
}

console.log('=== FOLDER 14: Notifications & Alerts ===');
const f14 = extractFolderRequests('14. Notifications & Alerts');
f14.forEach((r, i) => {
  console.log(`${i + 1}. [${r.method}] ${r.url} | ${r.name}`);
});

console.log('\n=== FOLDER 21: CMS (Announcements) ===');
const f21 = extractFolderRequests('21. Content Management System (CMS)');
f21.filter(r => r.url.includes('announce')).forEach((r, i) => {
  console.log(`${i + 1}. [${r.method}] ${r.url} | ${r.name}`);
});

console.log('\n=== FOLDER 25: Support Tickets & Helpdesk ===');
const f25 = extractFolderRequests('25. Support Tickets & Helpdesk');
f25.forEach((r, i) => {
  console.log(`${i + 1}. [${r.method}] ${r.url} | ${r.name}`);
});

