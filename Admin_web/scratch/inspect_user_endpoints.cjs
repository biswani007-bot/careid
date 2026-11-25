const fs = require('fs');

const collectionPath = 'D:\\New folder\\New folder\\healthvault\\Postman collection\\CareID-Staging.postman_collection.json';
const data = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

const userEndpoints = [];

function traverse(items, path = []) {
  for (const item of items) {
    const currentPath = [...path, item.name];
    if (item.item && Array.isArray(item.item)) {
      traverse(item.item, currentPath);
    } else if (item.request) {
      const url = item.request.url?.raw || (typeof item.request.url === 'string' ? item.request.url : item.request.url?.path?.join('/') || '');
      const method = item.request.method || 'GET';
      const name = item.name;
      const lowerUrl = url.toLowerCase();
      const lowerName = name.toLowerCase();

      if (
        lowerUrl.includes('/users') ||
        lowerUrl.includes('/admin/users') ||
        lowerUrl.includes('/user') ||
        lowerName.includes('user')
      ) {
        let queryParams = [];
        if (item.request.url?.query) {
          queryParams = item.request.url.query.map(q => ({ key: q.key, value: q.value, description: q.description }));
        }

        let responseSample = null;
        if (item.response && item.response.length > 0) {
          const resp = item.response[0];
          try {
            responseSample = JSON.parse(resp.body);
          } catch(e) {
            responseSample = resp.body?.slice(0, 200);
          }
        }

        userEndpoints.push({
          folder: path.join(' > '),
          name,
          method,
          url,
          queryParams,
          headers: item.request.header,
          auth: item.request.auth?.type || 'inherit',
          hasResponseSample: !!responseSample,
          responseSample
        });
      }
    }
  }
}

traverse(data.item);

fs.writeFileSync('scratch/user_endpoints_found.json', JSON.stringify(userEndpoints, null, 2), 'utf8');
console.log(`Found ${userEndpoints.length} user-related endpoints. Summary:`);
userEndpoints.forEach(ep => {
  console.log(`[${ep.method}] ${ep.url}  (${ep.folder} -> ${ep.name})`);
});

