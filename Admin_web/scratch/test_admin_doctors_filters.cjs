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

  const tests = [
    "/api/v1/admin/doctors?limit=50",
    "/api/v1/admin/doctors?search=Sara",
    "/api/v1/admin/doctors?specialty=Cardiology",
    "/api/v1/admin/doctors?status=ACTIVE",
    "/api/v1/admin/doctors?verificationStatus=VERIFIED"
  ];

  for (const t of tests) {
    const res = await get(t);
    const count = res.body?.data?.length ?? res.body?.data?.data?.length;
    console.log(t, "-> status:", res.status, "count:", count);
  }
}
test();

