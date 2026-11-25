const fs = require('fs');

const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findRequests(items, folderPath = []) {
  let results = [];
  for (const item of items) {
    const currentPath = [...folderPath, item.name];
    if (item.item) {
      results = results.concat(findRequests(item.item, currentPath));
    } else if (item.request) {
      const urlObj = item.request.url;
      let rawUrl = '';
      if (typeof urlObj === 'string') rawUrl = urlObj;
      else if (urlObj && urlObj.raw) rawUrl = urlObj.raw;
      
      const isDoctorRelated = 
        currentPath.some(p => /doctor/i.test(p)) ||
        /doctor/i.test(rawUrl) ||
        /doctor/i.test(item.name);

      if (isDoctorRelated) {
        results.push({
          folder: currentPath.slice(0, -1).join(' -> '),
          name: item.name,
          method: item.request.method,
          url: rawUrl,
          bodyMode: item.request.body ? item.request.body.mode : undefined,
          rawBody: item.request.body && item.request.body.raw ? item.request.body.raw : undefined
        });
      }
    }
  }
  return results;
}

const doctorRequests = findRequests(collection.item);
console.log(`Found ${doctorRequests.length} doctor-related requests in collection:`);
console.log(JSON.stringify(doctorRequests, null, 2));

