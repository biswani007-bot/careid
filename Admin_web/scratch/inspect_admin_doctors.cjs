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

  const res = await get("/api/v1/admin/doctors?limit=100");
  const doctors = res.body?.data || [];
  console.log("Total doctors from /api/v1/admin/doctors:", doctors.length);
  const sample = doctors.find(d => d.id === "1f06067b-e229-4707-84e2-afa27da2e4cd");
  console.log("Sara Jenkins record:", JSON.stringify(sample, null, 2));

  // Also check other doctors with facilities
  const withFacilities = doctors.filter(d => d.facilities && d.facilities.length > 0);
  console.log(`Doctors with facilities: ${withFacilities.length} / ${doctors.length}`);
  withFacilities.slice(0, 3).forEach(d => {
    console.log(`- Doctor ${d.fullName} (${d.id}): facilities count = ${d.facilities.length}:`, d.facilities);
  });
}
test();

