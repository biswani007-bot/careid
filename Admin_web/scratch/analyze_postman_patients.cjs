const fs = require('fs');
const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findRequests(items, folderPath = '') {
  let results = [];
  for (const item of items) {
    const currentPath = folderPath ? folderPath + ' > ' + item.name : item.name;
    if (item.request) {
      const rawUrl = typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw || '';
      if (rawUrl.toLowerCase().includes('patient')) {
        results.push({
          folder: folderPath,
          name: item.name,
          method: item.request.method,
          url: rawUrl,
          description: item.request.description
        });
      }
    }
    if (item.item) {
      results.push(...findRequests(item.item, currentPath));
    }
  }
  return results;
}

const patientReqs = findRequests(collection.item);
console.log('Found ' + patientReqs.length + ' patient requests:');
patientReqs.forEach((r, idx) => {
  console.log(`${idx + 1}. [${r.method}] ${r.url} (${r.folder} > ${r.name})`);
});

