const https = require("https");

async function test() {
  async function request(method, path, body, token) {
    return new Promise(resolve => {
      const dataStr = body ? JSON.stringify(body) : "";
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = "Bearer " + token;
      if (body) headers["Content-Length"] = Buffer.byteLength(dataStr);

      const req = https.request("https://360api.vnvision.in" + path, { method, headers }, res => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch(e) { resolve({ status: res.statusCode, raw: data }); }
        });
      });
      req.on("error", e => resolve({ error: e.message }));
      if (body) req.write(dataStr);
      req.end();
    });
  }

  // 1. Without token
  const noTokenGet = await request("GET", "/api/v1/admin/settings?category=SECURITY");
  console.log("No token GET -> status:", noTokenGet.status, noTokenGet.body?.message || noTokenGet.body);

  const noTokenPut = await request("PUT", "/api/v1/admin/settings", { key: "TEST", value: "val", category: "SECURITY" });
  console.log("No token PUT -> status:", noTokenPut.status, noTokenPut.body?.message || noTokenPut.body);

  // 2. Invalid validation (empty key or missing fields)
  const { getAdminToken } = require("./token_helper.cjs");
  const adminToken = await getAdminToken();

  const invalidPut = await request("PUT", "/api/v1/admin/settings", { key: "", value: "val" }, adminToken);
  console.log("Invalid PUT (empty key) -> status:", invalidPut.status, JSON.stringify(invalidPut.body));
}
test();

