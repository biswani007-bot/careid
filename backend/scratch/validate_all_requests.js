const fs = require('fs');

const coll = JSON.parse(fs.readFileSync('CareID-Staging.postman_collection.json', 'utf8'));

let errors = [];
let totalRequests = 0;
let totalScripts = 0;

function validateItems(items, folderPath = '') {
  for (const it of items) {
    const currentPath = folderPath ? `${folderPath} > ${it.name}` : it.name;
    if (it.item) {
      validateItems(it.item, currentPath);
    } else if (it.request) {
      totalRequests++;
      // Check request URL
      if (!it.request.url) {
        errors.push(`Missing url in ${currentPath}`);
      } else {
        const raw = it.request.url.raw || '';
        if (!raw) errors.push(`Empty raw url in ${currentPath}`);
      }
      // Check method
      if (!it.request.method) errors.push(`Missing method in ${currentPath}`);
      
      // Check test scripts
      if (it.event) {
        for (const ev of it.event) {
          if (ev.listen === 'test' && ev.script && ev.script.exec) {
            totalScripts++;
            const scriptText = Array.isArray(ev.script.exec) ? ev.script.exec.join('\n') : ev.script.exec;
            try {
              new Function(scriptText);
            } catch (syntaxErr) {
              errors.push(`Syntax error in test script of ${currentPath}: ${syntaxErr.message}`);
            }
          }
        }
      }
    }
  }
}

validateItems(coll.item);
console.log(`Validated ${totalRequests} requests, ${totalScripts} test scripts.`);
console.log(`Errors found: ${errors.length}`);
if (errors.length > 0) {
  errors.slice(0, 10).forEach(e => console.log(' - ' + e));
}

