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

  const r1 = await get("/api/v1/doctors");
  const r2 = await get("/api/v1/admin/doctors");

  console.log("/api/v1/doctors item 0 keys:", Object.keys(r1.body?.data?.[0] || {}));
  console.log("has facilities in /api/v1/doctors:", "facilities" in (r1.body?.data?.[0] || {}));

  console.log("/api/v1/admin/doctors item 0 keys:", Object.keys(r2.body?.data?.[0] || {}));
  console.log("has facilities in /api/v1/admin/doctors:", "facilities" in (r2.body?.data?.[0] || {}));
}
test();

