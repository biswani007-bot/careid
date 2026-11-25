const fs = require("fs");
const col = JSON.parse(fs.readFileSync("Postman collection/CareID-Staging.postman_collection.json", "utf8"));

function findRequests(items, path = "") {
  for (const item of items) {
    const currentPath = path ? path + " / " + item.name : item.name;
    if (item.request) {
      const url = typeof item.request.url === "string" ? item.request.url : item.request.url?.raw || "";
      if (url.includes("admin/doctors") || (url.includes("facilities") && url.includes("doctor")) || url.includes("doctors")) {
        console.log(item.request.method, url, "-->", currentPath);
      }
    }
    if (item.item) findRequests(item.item, currentPath);
  }
}
findRequests(col.item);

