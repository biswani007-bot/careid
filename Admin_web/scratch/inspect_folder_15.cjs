const fs = require('fs');
const col = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

const folder15 = col.item[14];
console.log('Folder name:', folder15.name);

function inspectItem(item, idx) {
  console.log(`\n============================================================`);
  console.log(`REQUEST #${idx + 1}: ${item.name}`);
  const req = item.request;
  if (!req) {
    console.log('No request object (subfolder)');
    return;
  }
  console.log(`Method: ${req.method}`);
  const rawUrl = typeof req.url === 'string' ? req.url : req.url?.raw || '';
  console.log(`URL: ${rawUrl}`);
  
  if (req.url?.variable) {
    console.log('URL Variables:', JSON.stringify(req.url.variable, null, 2));
  }
  if (req.url?.query) {
    console.log('Query Params:', JSON.stringify(req.url.query, null, 2));
  }
  if (req.header) {
    console.log('Headers:', req.header.map(h => `${h.key}: ${h.value}`).join(', '));
  }
  if (req.auth) {
    console.log('Auth:', JSON.stringify(req.auth));
  }
  if (req.body) {
    console.log('Body Mode:', req.body.mode);
    if (req.body.raw) {
      console.log('Body Raw:', req.body.raw);
    } else if (req.body.formdata) {
      console.log('Body Formdata:', JSON.stringify(req.body.formdata, null, 2));
    }
  }
  if (req.description) {
    console.log('Description:', req.description);
  }
  if (item.response && item.response.length > 0) {
    console.log(`Examples count: ${item.response.length}`);
    item.response.forEach((res, rIdx) => {
      console.log(`  Example #${rIdx + 1} (${res.name || res.status}): code ${res.code}`);
      if (res.body) {
        console.log(`  Body preview: ${res.body.slice(0, 200)}...`);
      }
    });
  }
}

folder15.item.forEach((child, idx) => {
  inspectItem(child, idx);
});
