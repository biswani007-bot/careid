const { apiGet, apiPost } = require('./api_helper.cjs');

async function testEndpoint(name, fn) {
  try {
    const res = await fn();
    console.log(`\n======================================================`);
    console.log(`Endpoint: ${name}`);
    console.log(`Status: ${res.status}`);
    console.log(`Success: ${res.body?.success}`);
    const data = res.body?.data !== undefined ? res.body.data : res.body;
    if (Array.isArray(data)) {
      console.log(`Data is array of length: ${data.length}`);
      if (data.length > 0) {
        console.log(`First item keys:`, Object.keys(data[0]));
        console.log(`Sample item:\n`, JSON.stringify(data[0], null, 2).slice(0, 500));
      }
    } else if (typeof data === 'object' && data !== null) {
      console.log(`Data keys:`, Object.keys(data));
      console.log(`Preview:\n`, JSON.stringify(data, null, 2).slice(0, 500));
    } else {
      console.log(`Response body:\n`, res.body);
    }
    return { name, status: res.status, data };
  } catch (err) {
    console.log(`\n======================================================`);
    console.log(`Endpoint: ${name}`);
    console.log(`ERROR:`, err.message);
    return { name, status: 'ERROR', error: err.message };
  }
}

async function run() {
  console.log('Testing live OCR endpoints against https://360api.vnvision.in/api/v1 ...');

  // 1. Dashboard summary
  const dash = await testEndpoint('GET /api/v1/ocr/dashboard', () => apiGet('/api/v1/ocr/dashboard'));

  // 2. Statistics
  const stats = await testEndpoint('GET /api/v1/ocr/statistics', () => apiGet('/api/v1/ocr/statistics'));

  // 3. Jobs listing
  const jobs = await testEndpoint('GET /api/v1/ocr/jobs?limit=50', () => apiGet('/api/v1/ocr/jobs?limit=50'));

  // 4. Jobs review queue
  const reviewQueue = await testEndpoint('GET /api/v1/ocr/review', () => apiGet('/api/v1/ocr/review'));

  // 5. Review history
  const history = await testEndpoint('GET /api/v1/ocr/reviews/history?limit=20', () => apiGet('/api/v1/ocr/reviews/history?limit=20'));

  // 6. Templates
  const templates = await testEndpoint('GET /api/v1/ocr/templates', () => apiGet('/api/v1/ocr/templates'));

  // If jobs exist, inspect the first job in detail
  const jobList = Array.isArray(jobs.data) ? jobs.data : jobs.data?.data || [];
  if (jobList.length > 0) {
    const sampleJob = jobList[0];
    const jobId = sampleJob.id;
    console.log(`\nInspecting sample job ${jobId}...`);
    await testEndpoint(`GET /api/v1/ocr/jobs/${jobId}`, () => apiGet(`/api/v1/ocr/jobs/${jobId}`));
    await testEndpoint(`GET /api/v1/ocr/jobs/${jobId}/text`, () => apiGet(`/api/v1/ocr/jobs/${jobId}/text`));
    await testEndpoint(`GET /api/v1/ocr/jobs/${jobId}/fields`, () => apiGet(`/api/v1/ocr/jobs/${jobId}/fields`));
  }
}

run();

