const sdk = require('postman-collection');

const item1 = new sdk.Item({
  name: "Doctor Audit",
  request: {
    url: "{{baseUrl}}/security/audit",
    method: "GET"
  }
});

const item2 = new sdk.Item({
  name: "Health",
  request: {
    url: "{{baseUrl}}/api/v1/health",
    method: "GET"
  }
});

console.log("Item 1 path:", item1.request.url.getPath());
console.log("Item 2 path:", item2.request.url.getPath());

