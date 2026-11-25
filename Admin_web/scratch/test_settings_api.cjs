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

  const allSettings = await get("/api/v1/admin/settings");
  console.log("GET /api/v1/admin/settings status:", allSettings.status);
  console.log("Total settings count:", allSettings.body?.data?.length);
  if (Array.isArray(allSettings.body?.data)) {
    console.log("Settings categories:", Array.from(new Set(allSettings.body.data.map(s => s.category))));
    const securitySettings = allSettings.body.data.filter(s => s.category === 'SECURITY');
    console.log("SECURITY settings count:", securitySettings.length);
    console.log("SECURITY settings:", JSON.stringify(securitySettings, null, 2));
  } else {
    console.log("Response body:", allSettings.body);
  }

  const catSecurity = await get("/api/v1/admin/settings?category=SECURITY");
  console.log("GET /api/v1/admin/settings?category=SECURITY status:", catSecurity.status);
  console.log("Returned settings count:", catSecurity.body?.data?.length);

  // Check if any reset endpoint exists, e.g. /api/v1/admin/settings/reset
  const resetRes = await get("/api/v1/admin/settings/reset");
  console.log("GET /api/v1/admin/settings/reset status:", resetRes.status);
}
test();

