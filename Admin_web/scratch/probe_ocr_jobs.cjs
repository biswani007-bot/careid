const fs = require('fs');

const token = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8')).token;
const baseUrl = 'https://360api.vnvision.in/api/v1';

async function req(endpoint) {
  const url = `${baseUrl}${endpoint}`;
  console.log(`\n>>> GET ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });
    console.log(`Status: ${res.status} ${res.statusText}`);
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  } catch (err) {
    console.error('Fetch error:', err.message);
    return null;
  }
}

async function run() {
  // 1. Dashboard summary
  const dash = await req('/ocr/dashboard');
  console.log('Dashboard Data:', JSON.stringify(dash?.data, null, 2));

  // 2. Statistics
  const stats = await req('/ocr/statistics');
  console.log('Statistics Data:', JSON.stringify(stats?.data, null, 2));

  // 3. List all OCR jobs
  const jobsRes = await req('/ocr/jobs?limit=100');
  const jobs = Array.isArray(jobsRes?.data)
    ? jobsRes.data
    : Array.isArray(jobsRes?.data?.data)
    ? jobsRes.data.data
    : Array.isArray(jobsRes?.data?.items)
    ? jobsRes.data.items
    : [];

  console.log(`\nFound ${jobs.length} jobs via /ocr/jobs?limit=100`);
  fs.writeFileSync('scratch/all_ocr_jobs.json', JSON.stringify(jobsRes?.data, null, 2));

  // Summarize status distribution
  const statusCounts = {};
  jobs.forEach(j => {
    statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
  });
  console.log('Status distribution:', statusCounts);

  // Inspect first 5 jobs
  jobs.slice(0, 5).forEach((j, i) => {
    console.log(`\n--- Job #${i + 1} ---`);
    console.log(`ID: ${j.id}`);
    console.log(`Status: ${j.status}`);
    console.log(`Document Type: ${j.documentType}`);
    console.log(`Failure Reason: ${j.failureReason}`);
    console.log(`Reprocess Count: ${j.reprocessCount}`);
    console.log(`Error: ${j.error}`);
    console.log(`StartedAt: ${j.startedAt}, CompletedAt: ${j.completedAt}, CreatedAt: ${j.createdAt}`);
  });

  // Filter specifically for FAILED jobs
  const failedJobs = jobs.filter(j => j.status === 'FAILED');
  console.log(`\nTotal FAILED jobs: ${failedJobs.length}`);
  if (failedJobs.length > 0) {
    console.log('Sample FAILED jobs:');
    failedJobs.slice(0, 5).forEach((j, i) => {
      console.log(`[FAILED #${i + 1}] ID: ${j.id}, FailureReason: "${j.failureReason}", Error: "${j.error}", ReprocessCount: ${j.reprocessCount}, UpdatedAt: ${j.updatedAt}`);
    });
  }
}

run();

