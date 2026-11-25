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

  // Test various searches on /api/v1/admin/doctors
  const searches = [
    "Sara",
    "Sara Jenkins",
    "Dr. Sara Jenkins, MD",
    "NPI-DOC-2026-9081",
    "LIC-MD-2026-9081"
  ];

  for (const s of searches) {
    const res = await get(`/api/v1/admin/doctors?search=${encodeURIComponent(s)}`);
    const list = res.body?.data || [];
    console.log(`Search "${s}" -> found: ${list.length}, first: ${list[0]?.fullName} (id: ${list[0]?.id})`);
  }
}
test();

