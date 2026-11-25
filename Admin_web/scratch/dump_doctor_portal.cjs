const fs = require('fs');

const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findFolder(items, folderName) {
  for (const item of items) {
    if (item.name && item.name.includes(folderName)) return item;
    if (item.item) {
      const found = findFolder(item.item, folderName);
      if (found) return found;
    }
  }
  return null;
}

const doctorFolder = findFolder(collection.item, 'Doctor Portal');
if (!doctorFolder) {
  console.log('Doctor Portal folder not found');
  process.exit(1);
}

function dumpRequests(folder, prefix = '') {
  let list = [];
  for (const item of folder.item || []) {
    if (item.item) {
      list = list.concat(dumpRequests(item, `${prefix}${item.name} > `));
    } else if (item.request) {
      let rawUrl = '';
      if (typeof item.request.url === 'string') rawUrl = item.request.url;
      else if (item.request.url && item.request.url.raw) rawUrl = item.request.url.raw;
      
      list.push({
        path: `${prefix}${item.name}`,
        method: item.request.method,
        url: rawUrl,
        headers: item.request.header ? item.request.header.map(h => `${h.key}: ${h.value}`) : [],
        rawBody: item.request.body && item.request.body.raw ? item.request.body.raw : null
      });
    }
  }
  return list;
}

const requests = dumpRequests(doctorFolder);
console.log(`Found ${requests.length} requests in Doctor Portal:`);
for (const r of requests) {
  console.log(`\n======================================================`);
  console.log(`${r.method} ${r.url}`);
  console.log(`Name: ${r.path}`);
  if (r.rawBody) {
    console.log(`Body:\n${r.rawBody.slice(0, 300)}...`);
  }
}

