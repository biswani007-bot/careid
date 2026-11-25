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
  console.log("Analyzing 23 doctors in /api/v1/admin/doctors:");
  doctors.forEach(d => {
    const facCount = d.facilities?.length || 0;
    const facSummary = d.facilities?.map(f => `${f.name} (${f.assignmentType})`).join(", ") || "None";
    console.log(`- [${d.id}] ${d.fullName} | Dept: "${d.department || ''}" | Facilities (${facCount}): ${facSummary}`);
  });
}
test();

