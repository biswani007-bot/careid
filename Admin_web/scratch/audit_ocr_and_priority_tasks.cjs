const https = require('https');
const { getAdminToken } = require('./token_helper.cjs');

function request(path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '360api.vnvision.in',
      path,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      rejectUnauthorized: false
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function probe() {
  const token = await getAdminToken();
  console.log('Got token.');

  // 1. Probe /api/v1/ocr/review
  const review = await request('/api/v1/ocr/review', token);
  console.log(`\n=== GET /api/v1/ocr/review (Status: ${review.status}) ===`);
  const reviewData = review.body?.data || review.body;
  if (Array.isArray(reviewData)) {
    console.log(`Length: ${reviewData.length}`);
    console.log('Statuses in reviewData:', [...new Set(reviewData.map(r => r.status))]);
    console.log('Sample item:', JSON.stringify(reviewData[0], null, 2));
  } else {
    console.log('Response:', reviewData);
  }

  // 2. Probe /api/v1/ocr/jobs
  const jobs = await request('/api/v1/ocr/jobs', token);
  console.log(`\n=== GET /api/v1/ocr/jobs (Status: ${jobs.status}) ===`);
  const jobsData = jobs.body?.data || jobs.body;
  if (Array.isArray(jobsData)) {
    console.log(`Length: ${jobsData.length}`);
    console.log('Statuses in jobsData:', [...new Set(jobsData.map(j => j.status))]);
    const statusCounts = {};
    jobsData.forEach(j => {
      statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
    });
    console.log('Status counts in jobs:', statusCounts);
    console.log('Sample COMPLETED item:', JSON.stringify(jobsData.find(j => j.status === 'COMPLETED'), null, 2));
    console.log('Sample REVIEW_REQUIRED item:', JSON.stringify(jobsData.find(j => j.status === 'REVIEW_REQUIRED'), null, 2));
    console.log('Sample FAILED item:', JSON.stringify(jobsData.find(j => j.status === 'FAILED'), null, 2));
  } else {
    console.log('Response:', jobsData);
  }

  // 3. Probe /api/v1/referrals
  const referrals = await request('/api/v1/referrals', token);
  console.log(`\n=== GET /api/v1/referrals (Status: ${referrals.status}) ===`);
  const refData = referrals.body?.data || referrals.body;
  if (Array.isArray(refData)) {
    console.log(`Length: ${refData.length}`);
    const refStatuses = {};
    refData.forEach(r => {
      refStatuses[r.status] = (refStatuses[r.status] || 0) + 1;
    });
    console.log('Status counts in referrals:', refStatuses);
    console.log('Sample referral:', JSON.stringify(refData[0], null, 2));
  } else if (refData?.data && Array.isArray(refData.data)) {
    console.log(`Length: ${refData.data.length}, total: ${refData.total}`);
    const refStatuses = {};
    refData.data.forEach(r => {
      refStatuses[r.status] = (refStatuses[r.status] || 0) + 1;
    });
    console.log('Status counts in referrals:', refStatuses);
    console.log('Sample referral:', JSON.stringify(refData.data[0], null, 2));
  }
}

probe().catch(console.error);

