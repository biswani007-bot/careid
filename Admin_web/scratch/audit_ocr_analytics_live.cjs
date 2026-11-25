const fs = require('fs');
const token = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8')).token;
const BASE_URL = 'https://360api.vnvision.in/api/v1';

async function probe() {
  console.log('=== AUDITING LIVE OCR ANALYTICS ENDPOINTS ===\n');

  // 1. GET /ocr/dashboard
  console.log('1. Probing GET /api/v1/ocr/dashboard:');
  const dashRes = await fetch(`${BASE_URL}/ocr/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
  const dashJson = await dashRes.json();
  console.log('Dashboard response:', JSON.stringify(dashJson, null, 2));

  // 2. GET /ocr/statistics
  console.log('\n2. Probing GET /api/v1/ocr/statistics:');
  const statsRes = await fetch(`${BASE_URL}/ocr/statistics`, { headers: { Authorization: `Bearer ${token}` } });
  const statsJson = await statsRes.json();
  console.log('Statistics response:', JSON.stringify(statsJson, null, 2));

  // 3. GET /ocr/jobs (sample 5 jobs)
  console.log('\n3. Probing GET /api/v1/ocr/jobs?limit=5:');
  const jobsRes = await fetch(`${BASE_URL}/ocr/jobs?limit=5`, { headers: { Authorization: `Bearer ${token}` } });
  const jobsJson = await jobsRes.json();
  console.log('Sample jobs:', JSON.stringify(jobsJson, null, 2));

  // 4. GET /ocr/reviews/history
  console.log('\n4. Probing GET /api/v1/ocr/reviews/history?limit=5:');
  const histRes = await fetch(`${BASE_URL}/ocr/reviews/history?limit=5`, { headers: { Authorization: `Bearer ${token}` } });
  const histJson = await histRes.json();
  console.log('Sample reviews history:', JSON.stringify(histJson, null, 2));

  // 5. Test if date filtering is supported on /ocr/jobs or /ocr/dashboard or /ocr/statistics
  console.log('\n5. Testing query parameters on /ocr/jobs:');
  const dateTest = await fetch(`${BASE_URL}/ocr/jobs?startDate=2026-11-17&endDate=2026-11-17`, { headers: { Authorization: `Bearer ${token}` } });
  console.log('jobs with startDate/endDate status:', dateTest.status);
  const dateJson = await dateTest.json();
  console.log('jobs count with startDate/endDate:', Array.isArray(dateJson.data) ? dateJson.data.length : (dateJson.data?.data?.length || 0));
}

probe().catch(console.error);

