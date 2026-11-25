const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '..', 'Postman collection', 'CareID-Staging.postman_collection.json');
const raw = fs.readFileSync(collectionPath, 'utf8');
const collection = JSON.parse(raw);

const targetUrls = [
  '/api/v1/admin/dashboard/stats',
  '/api/v1/admin/dashboard/summary',
  '/api/v1/admin/audit-logs',
  '/api/v1/doctors/statistics',
  '/api/v1/referrals/dashboard/stats',
  '/api/v1/ocr/dashboard',
  '/api/v1/ocr/queue',
  '/api/v1/admin/users',
  '/api/v1/admin/patients',
  '/api/v1/admin/doctors',
  '/health'
];

let out = [];

function log(msg = '') {
  out.push(msg);
}

function inspectItems(items, folderPath = '') {
  for (const item of items) {
    if (item.item && Array.isArray(item.item)) {
      inspectItems(item.item, folderPath ? `${folderPath} > ${item.name}` : item.name);
    } else if (item.request) {
      let url = '';
      if (typeof item.request.url === 'string') {
        url = item.request.url;
      } else if (item.request.url && item.request.url.raw) {
        url = item.request.url.raw;
      }
      
      const isTarget = targetUrls.some(t => url.includes(t)) || 
        url.includes('/health') || 
        url.includes('audit-log') ||
        url.includes('dashboard');

      if (isTarget) {
        log('================================================================');
        log(`ENDPOINT: [${item.request.method}] ${url}`);
        log(`NAME: ${item.name}`);
        log(`FOLDER: ${folderPath}`);
        if (item.request.description) {
          const descStr = typeof item.request.description === 'string' 
            ? item.request.description 
            : (item.request.description.content || '');
          log(`DESCRIPTION: ${descStr.slice(0, 200)}`);
        }
        if (item.request.header && item.request.header.length > 0) {
          log('HEADERS: ' + item.request.header.map(h => `${h.key}: ${h.value}`).join(', '));
        }
        if (item.response && item.response.length > 0) {
          log(`RESPONSE EXAMPLES (${item.response.length}):`);
          item.response.forEach((res, idx) => {
            log(`--- Example #${idx + 1} (${res.name || res.status} - ${res.code}) ---`);
            try {
              const body = JSON.parse(res.body);
              log(JSON.stringify(body, null, 2));
            } catch (e) {
              log(res.body ? res.body.slice(0, 300) : 'No body');
            }
          });
        }
      }
    }
  }
}

inspectItems(collection.item);
fs.writeFileSync(path.join(__dirname, 'dashboard_endpoints_detail.txt'), out.join('\n'), 'utf8');
console.log('Saved dashboard_endpoints_detail.txt in UTF-8');
