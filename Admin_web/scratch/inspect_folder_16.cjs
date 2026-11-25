const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

const folder16 = postman.item.find(i => i.name.startsWith('16.'));
console.log('Folder name:', folder16?.name);

function dumpFolder(folder, indent = '') {
  if (!folder) return;
  if (folder.item) {
    folder.item.forEach(sub => {
      if (sub.request) {
        const url = typeof sub.request.url === 'string' ? sub.request.url : sub.request.url?.raw || '';
        console.log(`${indent}[${sub.request.method}] ${url} -- "${sub.name}"`);
        if (sub.request.description) {
          console.log(`${indent}  Description: ${sub.request.description.slice(0, 300)}`);
        }
        if (sub.request.body) {
          console.log(`${indent}  Body Mode: ${sub.request.body.mode}`);
          if (sub.request.body.mode === 'formdata') {
            console.log(`${indent}  FormData:`, JSON.stringify(sub.request.body.formdata, null, 2));
          } else if (sub.request.body.mode === 'raw') {
            console.log(`${indent}  Raw Body:`, sub.request.body.raw.slice(0, 300));
          }
        }
        console.log(`${indent}  Headers:`, JSON.stringify(sub.request.header));
      } else {
        console.log(`${indent}> Folder: ${sub.name}`);
        dumpFolder(sub, indent + '  ');
      }
    });
  }
}

dumpFolder(folder16);

