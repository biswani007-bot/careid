const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '..', 'Postman collection', 'CareID-Staging.postman_collection.json');
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

function findFolder(items, name) {
  for (const item of items) {
    if (item.name && item.name.toLowerCase().includes(name.toLowerCase())) {
      return item;
    }
    if (item.item) {
      const found = findFolder(item.item, name);
      if (found) return found;
    }
  }
  return null;
}

const adminFolder = findFolder(collection.item, '04. Admin');

function dumpFolder(folder) {
  if (!folder) return;
  console.log(`\n======================================================`);
  console.log(`FOLDER: ${folder.name}`);
  console.log(`======================================================`);
  
  function dumpItems(items, depth = 0) {
    for (const item of items) {
      if (item.item) {
        console.log(`${'  '.repeat(depth)}[SUBFOLDER] ${item.name}`);
        dumpItems(item.item, depth + 1);
      } else if (item.request) {
        const url = typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw || '';
        console.log(`${'  '.repeat(depth)}-> ${item.request.method} ${url}`);
        console.log(`${'  '.repeat(depth)}   Name: ${item.name}`);
        if (item.request.body?.raw) {
          console.log(`${'  '.repeat(depth)}   Body:\n${item.request.body.raw}`);
        }
      }
    }
  }
  dumpItems(folder.item || []);
}

dumpFolder(adminFolder);

// Also check if there is an Identity / RBAC / Roles folder
const rbacFolder = findFolder(collection.item, 'Roles') || findFolder(collection.item, 'RBAC');
if (rbacFolder) dumpFolder(rbacFolder);

// Also check Security folder
const secFolder = findFolder(collection.item, '18. Security');
if (secFolder) dumpFolder(secFolder);

