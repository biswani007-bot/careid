const fs = require('fs');

const collection = JSON.parse(fs.readFileSync('CareID-Staging.postman_collection.json', 'utf8'));

console.log('Collection Name:', collection.info.name);
console.log('Folders count:', collection.item.length);

const folderNames = collection.item.map(f => f.name);
console.log('Folders:', folderNames);

let totalRequests = 0;
const requestsByFolder = {};

function countRequests(items, folderName) {
  items.forEach(item => {
    if (item.item && Array.isArray(item.item)) {
      countRequests(item.item, folderName);
    } else if (item.request) {
      totalRequests++;
      requestsByFolder[folderName] = (requestsByFolder[folderName] || 0) + 1;
    }
  });
}

collection.item.forEach(folder => {
  countRequests(folder.item || [], folder.name);
});

console.log('\nTotal Requests:', totalRequests);
console.log('Requests per folder:', requestsByFolder);

// Check for password/login and admin/login
const allRequests = [];
function gatherRequests(items) {
  items.forEach(item => {
    if (item.item) gatherRequests(item.item);
    else if (item.request) allRequests.push(item);
  });
}
gatherRequests(collection.item);

const passLogins = allRequests.filter(r => {
  const raw = r.request.url?.raw || '';
  const path = r.request.url?.path ? '/' + r.request.url.path.join('/') : '';
  return path.includes('password/login') || path.includes('admin/login');
});

console.log('\nPassword/Admin login requests found:');
passLogins.forEach(r => {
  console.log(`- [${r.request.method}] ${r.name}: ${r.request.url?.raw || '/' + r.request.url?.path?.join('/')}`);
});

// Check for appointment requests
const appointments = allRequests.filter(r => {
  const path = r.request.url?.path ? '/' + r.request.url.path.join('/') : '';
  return path.includes('appointment');
});

console.log(`\nAppointment requests found (${appointments.length}):`);
appointments.forEach(r => {
  console.log(`- [${r.request.method}] ${r.name}: ${r.request.url?.raw || '/' + r.request.url?.path?.join('/')}`);
});

