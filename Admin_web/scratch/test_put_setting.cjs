const { getAdminToken } = require("./token_helper.cjs");
const https = require("https");

async function test() {
  const token = await getAdminToken();
  const headers = { Authorization: "Bearer " + token, "Content-Type": "application/json" };

  async function put(path, body) {
    return new Promise(resolve => {
      const dataStr = JSON.stringify(body);
      const req = https.request("https://360api.vnvision.in" + path, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Length": Buffer.byteLength(dataStr)
        }
      }, res => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch(e) { resolve({ status: res.statusCode, raw: data }); }
        });
      });
      req.on("error", e => resolve({ error: e.message }));
      req.write(dataStr);
      req.end();
    });
  }

  async function get(path) {
    return new Promise(resolve => {
      const req = https.request("https://360api.vnvision.in" + path, { method: "GET", headers }, res => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch(e) { resolve({ status: res.statusCode, raw: data }); }
        });
      });
      req.on("error", e => resolve({ error: e.message }));
      req.end();
    });
  }

  // Test upserting a test setting
  const testPayload = {
    key: "MFA_ENFORCED",
    value: "true",
    category: "SECURITY",
    valueType: "BOOLEAN",
    description: "Two-factor multi-factor authentication enforcement"
  };

  const putRes = await put("/api/v1/admin/settings", testPayload);
  console.log("PUT /api/v1/admin/settings status:", putRes.status);
  console.log("PUT response body:", JSON.stringify(putRes.body, null, 2));

  // Check if it's now in GET /api/v1/admin/settings?category=SECURITY
  const getRes = await get("/api/v1/admin/settings?category=SECURITY");
  console.log("GET /api/v1/admin/settings?category=SECURITY status:", getRes.status);
  console.log("GET response items:", JSON.stringify(getRes.body, null, 2));
}
test();

