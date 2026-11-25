const https = require('https');
const { getAdminToken } = require('./token_helper.cjs');

async function checkAllReviewJobs() {
  const token = await getAdminToken();
  const opts = {
    hostname: '360api.vnvision.in',
    path: '/api/v1/ocr/review',
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    rejectUnauthorized: false
  };

  const res = await new Promise(resolve => {
    https.get(opts, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve(JSON.parse(d)));
    });
  });

  const jobs = res.data || res;
  console.log('Total review jobs:', jobs.length);
  jobs.forEach((j, i) => {
    console.log(`[${i+1}] ID: ${j.id.slice(0, 8)} | status: ${j.status} | conf: ${j.overallConfidence} | confLvl: ${j.confidenceLevel} | createdAt: ${j.createdAt} | startedAt: ${j.startedAt}`);
  });
}

checkAllReviewJobs();

