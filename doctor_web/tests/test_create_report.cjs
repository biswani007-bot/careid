const fs = require('fs');
const BASE_URL = 'https://360api.vnvision.in/api/v1';
const token = JSON.parse(fs.readFileSync('.token_cache.json', 'utf8')).accessToken;

async function testCreate() {
  const payload = {
    title: "Complete Blood Count (CBC) Lab Report",
    fileName: "cbc_report_2026.pdf",
    fileSize: 524288,
    mimeType: "application/pdf",
    storageUrl: "https://cdn.hvapi.com/reports/2026/07/cbc_report_2026.pdf",
    storageKey: "reports/2026/07/cbc_report_2026.pdf",
    category: "LAB",
    reportDate: "2026-07-28",
    providerName: "City General Hospital",
    doctorName: "Dr. Sarah Connor",
    description: "Annual routine complete blood count with differential",
    tags: ["blood", "routine", "annual"]
  };

  const res = await fetch(`${BASE_URL}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  console.log(`[${res.status}] POST /reports without patientProfileId =>`, await res.text());
}

testCreate();
