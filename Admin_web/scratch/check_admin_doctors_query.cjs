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

  // Check queries supported by /api/v1/admin/doctors
  const tests = [
    "/api/v1/admin/doctors?id=1f06067b-e229-4707-84e2-afa27da2e4cd",
    "/api/v1/admin/doctors?doctorId=1f06067b-e229-4707-84e2-afa27da2e4cd",
    "/api/v1/admin/doctors?search=1f06067b-e229-4707-84e2-afa27da2e4cd",
    "/api/v1/admin/doctors?limit=100"
  ];

  for (const t of tests) {
    const res = await get(t);
    const count = res.body?.data?.data?.length ?? res.body?.data?.length;
    console.log(t, "-> status:", res.status, "count:", count);
  }
}
test();

