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

  function resolvePrimaryFacility(facilities, fallbackFacility, facilityName) {
    const facList = Array.isArray(facilities) && facilities.length > 0
      ? facilities
      : fallbackFacility?.name
      ? [{ id: fallbackFacility.id, name: fallbackFacility.name, assignmentType: "PRIMARY" }]
      : facilityName
      ? [{ id: "", name: facilityName, assignmentType: "PRIMARY" }]
      : [];

    if (facList.length === 0) {
      return {
        primaryFacilityName: "Not assigned",
        assignmentType: undefined,
        facilityId: undefined,
        allFacilities: [],
      };
    }

    const primary = facList.find(f => f.assignmentType?.toUpperCase() === "PRIMARY");
    if (primary) {
      return {
        primaryFacilityName: primary.name,
        assignmentType: primary.assignmentType || "PRIMARY",
        facilityId: primary.id,
        allFacilities: facList,
      };
    }

    return {
      primaryFacilityName: facList.map(f => f.name).join(", "),
      assignmentType: undefined,
      facilityId: facList[0]?.id,
      allFacilities: facList,
    };
  }

  async function testDoctor(id) {
    const res = await get(`/api/v1/doctors/${id}`);
    const doctor = res.body?.data;
    if (!doctor) {
      console.log("Doctor not found:", id);
      return;
    }

    // Lookup in admin doctors
    const cleanName = doctor.fullName.replace(/^Dr\.\s*/i, "").trim();
    const adminRes = await get(`/api/v1/admin/doctors?search=${encodeURIComponent(cleanName)}`);
    let adminDoc = (adminRes.body?.data || []).find(d => d.id === id);
    if (!adminDoc) {
      const allRes = await get("/api/v1/admin/doctors?limit=100");
      adminDoc = (allRes.body?.data || []).find(d => d.id === id);
    }

    const resolved = resolvePrimaryFacility(adminDoc?.facilities, doctor.facility, doctor.facilityName);

    console.log("-----------------------------------------");
    console.log("Doctor ID:", id);
    console.log("Doctor Name:", doctor.fullName);
    console.log("Department (from doctor entity):", doctor.department || "—");
    console.log("Primary Facility (resolved):", resolved.primaryFacilityName);
    console.log("Assignment Type:", resolved.assignmentType || "None");
    console.log("Facility ID:", resolved.facilityId || "None");
    console.log("All Facilities:", JSON.stringify(resolved.allFacilities));
  }

  // 1. Dr. Sara Jenkins (Target)
  await testDoctor("1f06067b-e229-4707-84e2-afa27da2e4cd");
  // 2. Dr. Robert Chen (No facilities)
  await testDoctor("5ab2e715-bf8f-4fd4-98bb-c5166dd7157b");
  // 3. Dr. Swagat Pradhan, MD (Multiple facilities)
  await testDoctor("5c1c3002-30a7-434b-97d0-cf69f2bdd708");
  // 4. Dr. Julian Vance, MD (2 facilities, one PRIMARY, one SECONDARY)
  await testDoctor("7c8fd004-cba1-4a72-9db6-437fc6d2baed");
}
test();

