const fs = require('fs');
const token = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8')).token;
const BASE_URL = 'https://360api.vnvision.in/api/v1';

async function analyze() {
  const [p1, p2, histRes] = await Promise.all([
    fetch(`${BASE_URL}/ocr/jobs?limit=100&page=1`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    fetch(`${BASE_URL}/ocr/jobs?limit=100&page=2`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    fetch(`${BASE_URL}/ocr/reviews/history?limit=100`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  ]);

  const jobs = [...(p1.data?.data || p1.data || []), ...(p2.data?.data || p2.data || [])];
  const reviews = histRes.data?.data || histRes.data || [];

  console.log(`Total jobs: ${jobs.length}, Total reviews: ${reviews.length}\n`);

  // 1. Creation dates distribution
  const dateCounts = {};
  jobs.forEach(j => {
    const d = (j.createdAt || '').slice(0, 10) || 'Unknown';
    dateCounts[d] = (dateCounts[d] || 0) + 1;
  });
  console.log('Jobs by creation date (UTC):', dateCounts);

  // 2. Document types distribution
  const docTypes = {};
  jobs.forEach(j => {
    const dt = j.documentType || 'Unknown';
    docTypes[dt] = (docTypes[dt] || 0) + 1;
  });
  console.log('\nDocument types distribution:', docTypes);

  // 3. Processing durations
  const validProcessingTimes = jobs
    .map(j => j.processingTimeMs)
    .filter(t => typeof t === 'number' && !isNaN(t) && t > 0);
  const avgDurationMs = validProcessingTimes.length > 0
    ? validProcessingTimes.reduce((a, b) => a + b, 0) / validProcessingTimes.length
    : 0;
  console.log(`\nValid processing durations count: ${validProcessingTimes.length}`);
  console.log(`Average duration: ${avgDurationMs.toFixed(1)} ms (${(avgDurationMs / 1000).toFixed(2)} seconds)`);

  // 4. Confidences
  const validConfidences = jobs
    .map(j => j.overallConfidence)
    .filter(c => typeof c === 'number' && !isNaN(c) && c > 0);
  const avgConf = validConfidences.length > 0
    ? validConfidences.reduce((a, b) => a + b, 0) / validConfidences.length
    : 0;
  console.log(`\nValid non-zero confidences count: ${validConfidences.length}`);
  console.log(`Average confidence of non-zero jobs: ${(avgConf * 100).toFixed(2)}%`);

  // 5. Review outcomes
  let approvedCount = 0;
  let rejectedCount = 0;
  reviews.forEach(r => {
    if (r.reviewStatus === 'APPROVED') approvedCount++;
    if (r.reviewStatus === 'REJECTED') rejectedCount++;
  });
  console.log(`\nHuman reviews in history: Approved: ${approvedCount}, Rejected: ${rejectedCount}, Total: ${reviews.length}`);

  // 6. Exceptions / Failures
  const failedJobs = jobs.filter(j => j.status === 'FAILED');
  console.log(`\nTotal FAILED jobs: ${failedJobs.length}`);
  const failureReasons = {};
  failedJobs.forEach(j => {
    const r = j.failureReason || 'No reason specified';
    failureReasons[r] = (failureReasons[r] || 0) + 1;
  });
  console.log('Failure reasons breakdown:', failureReasons);
}

analyze().catch(console.error);

