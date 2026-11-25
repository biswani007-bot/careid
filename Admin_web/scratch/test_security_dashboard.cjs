const { getAdminToken } = require("./token_helper.cjs");
const https = require("https");

async function test() {
  const token = await getAdminToken();
  const headers = { Authorization: "Bearer " + token, "Content-Type": "application/json" };

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

  const d = await get("/api/v1/security/dashboard");
  console.log("GET /api/v1/security/dashboard status:", d.status, JSON.stringify(d.body, null, 2));
}
test();

