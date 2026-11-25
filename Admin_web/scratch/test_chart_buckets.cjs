const token = require('./cached_admin_token.json').token;

async function get(endpoint) {
  const res = await fetch(`https://360api.vnvision.in/api/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

function generateChartBuckets(jobs, timeRange) {
  if (timeRange === 'Today') {
    // Standard 4-hour slots or 2-hour slots for the day
    const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
    const buckets = hours.map(h => ({ hour: h, processed: 0, exceptions: 0 }));

    jobs.forEach(j => {
      const d = new Date(j.createdAt);
      const h = d.getHours();
      // map to nearest 4-hour slot
      const slotIndex = Math.min(5, Math.floor(h / 4));
      if (j.status === 'FAILED') {
        buckets[slotIndex].exceptions++;
      } else {
        buckets[slotIndex].processed++;
      }
    });
    return buckets;
  }

  if (timeRange === 'Last 7 Days') {
    // 7 days ending today
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const isoDate = d.toISOString().slice(0, 10);
      days.push({ label, isoDate, processed: 0, exceptions: 0 });
    }

    jobs.forEach(j => {
      const jDate = j.createdAt ? j.createdAt.slice(0, 10) : '';
      const dayBucket = days.find(d => d.isoDate === jDate);
      if (dayBucket) {
        if (j.status === 'FAILED') dayBucket.exceptions++;
        else dayBucket.processed++;
      }
    });

    return days.map(d => ({ hour: d.label, processed: d.processed, exceptions: d.exceptions }));
  }

  // All time / 30 Days: Group by active dates
  const dateMap = new Map();
  jobs.forEach(j => {
    if (!j.createdAt) return;
    const d = new Date(j.createdAt);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!dateMap.has(label)) {
      dateMap.set(label, { processed: 0, exceptions: 0, time: d.getTime() });
    }
    const b = dateMap.get(label);
    if (j.status === 'FAILED') b.exceptions++;
    else b.processed++;
  });

  const sorted = Array.from(dateMap.entries()).sort((a, b) => a[1].time - b[1].time);
  return sorted.map(([label, b]) => ({
    hour: label,
    processed: b.processed,
    exceptions: b.exceptions
  }));
}

async function test() {
  const p1 = await get('/ocr/jobs?limit=100&page=1');
  const p2 = await get('/ocr/jobs?limit=100&page=2');
  const allJobs = [...(p1.data || []), ...(p2.data || [])];

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayJobs = allJobs.filter(j => j.createdAt && j.createdAt.startsWith(todayStr));

  const d7Cutoff = new Date(Date.now() - 7 * 86400000);
  const d7Jobs = allJobs.filter(j => new Date(j.createdAt) >= d7Cutoff);

  console.log('Today chart buckets:');
  console.log(generateChartBuckets(todayJobs, 'Today'));

  console.log('\n7 Days chart buckets:');
  console.log(generateChartBuckets(d7Jobs, 'Last 7 Days'));

  console.log('\nAll Time chart buckets:');
  console.log(generateChartBuckets(allJobs, 'All Time'));
}
test();

