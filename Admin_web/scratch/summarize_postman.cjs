const fs = require('fs');

const col = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

const folderSummaries = [];

function extractRequests(items) {
  let reqs = [];
  for (const it of items) {
    if (it.request) {
      reqs.push({
        name: it.name,
        method: it.request.method,
        url: typeof it.request.url === 'string' ? it.request.url : (it.request.url?.raw || '')
      });
    }
    if (it.item) {
      reqs = reqs.concat(extractRequests(it.item));
    }
  }
  return reqs;
}

for (const folder of col.item) {
  const reqs = extractRequests(folder.item || (folder.request ? [folder] : []));
  folderSummaries.push({
    folderName: folder.name,
    requestCount: reqs.length,
    requests: reqs
  });
}

fs.writeFileSync('scratch/postman_summary.json', JSON.stringify(folderSummaries, null, 2));
console.log('Postman Folders summarized:', folderSummaries.length);
folderSummaries.forEach((f, i) => {
  console.log(`${i+1}. ${f.folderName} (${f.requestCount} requests)`);
});

