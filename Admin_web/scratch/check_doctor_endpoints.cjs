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

  const d1 = await get("/api/v1/doctors/1f06067b-e229-4707-84e2-afa27da2e4cd");
  console.log("GET /doctors/:id status:", d1.status);
  console.log("facilities in /doctors/:id:", d1.body?.data?.facilities, d1.body?.data?.facility);

  const d2 = await get("/api/v1/admin/doctors/1f06067b-e229-4707-84e2-afa27da2e4cd");
  console.log("GET /admin/doctors/:id status:", d2.status);
  if (d2.status === 200) {
    console.log("keys:", Object.keys(d2.body?.data || {}));
    console.log("facilities:", JSON.stringify(d2.body?.data?.facilities));
  } else {
    console.log("body:", d2.body);
  }

  const d3 = await get("/api/v1/admin/doctors?search=Sara");
  console.log("GET /admin/doctors?search=Sara status:", d3.status);
  if (d3.status === 200) {
    const list = d3.body?.data?.data || d3.body?.data || [];
    console.log("list length:", list.length);
    const doc = list[0];
    console.log("doc in /admin/doctors:", doc?.id, doc?.fullName, "facilities:", JSON.stringify(doc?.facilities));
  }

  // Also test /api/v1/doctors/:id/facilities if it exists
  const d4 = await get("/api/v1/doctors/1f06067b-e229-4707-84e2-afa27da2e4cd/facilities");
  console.log("GET /doctors/:id/facilities status:", d4.status, d4.body);

  // Also test /api/v1/admin/doctors with doctor id filter or pagination
  const d5 = await get("/api/v1/admin/doctors?page=1&limit=50");
  console.log("GET /admin/doctors limit=50 status:", d5.status, "total:", d5.body?.data?.total || d5.body?.data?.length);
}
test();

