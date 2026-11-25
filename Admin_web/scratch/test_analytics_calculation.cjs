const fs = require('fs');
const token = require('./cached_admin_token.json').token;

async function get(endpoint) {
  const res = await fetch(`https://360api.vnvision.in/api/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

function formatTimeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

async function testAnalytics(timeRange) {
  console.log(`\n================ Testing Analytics for: "${timeRange}" ================`);
  const [dashRes, statsRes, p1, p2, historyRes] = await Promise.all([
    get('/ocr/dashboard'),
    get('/ocr/statistics'),
    get('/ocr/jobs?limit=100&page=1'),
    get('/ocr/jobs?limit=100&page=2'),
    get('/ocr/reviews/history?limit=100'),
  ]);

  const allJobs = [...(p1.data || []), ...(p2.data || [])];
  const allReviews = historyRes.data || [];

  const now = new Date();
  let filteredJobs = allJobs;
  let filteredReviews = allReviews;

  if (timeRange === 'Today') {
    const todayStr = now.toISOString().slice(0, 10);
    // Also consider local day
    filteredJobs = allJobs.filter(j => j.createdAt && j.createdAt.startsWith(todayStr));
    filteredReviews = allReviews.filter(r => (r.completedAt || r.createdAt || '').startsWith(todayStr));
  } else if (timeRange === 'Last 7 Days') {
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filteredJobs = allJobs.filter(j => new Date(j.createdAt) >= cutoff);
    filteredReviews = allReviews.filter(r => new Date(r.completedAt || r.createdAt) >= cutoff);
  } else if (timeRange === 'Last 30 Days') {
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    filteredJobs = allJobs.filter(j => new Date(j.createdAt) >= cutoff);
    filteredReviews = allReviews.filter(r => new Date(r.completedAt || r.createdAt) >= cutoff);
  }

  console.log(`Filtered jobs count: ${filteredJobs.length}`);
  console.log(`Filtered reviews count: ${filteredReviews.length}`);

  // 1. Volume
  const volume = filteredJobs.length;

  // 2. Avg Confidence
  const scoredJobs = filteredJobs.filter(j => typeof j.overallConfidence === 'number' && j.overallConfidence > 0);
  let avgConfidence = 0;
  if (scoredJobs.length > 0) {
    const sum = scoredJobs.reduce((acc, j) => acc + j.overallConfidence, 0);
    avgConfidence = Math.round((sum / scoredJobs.length) * 100);
  } else if (timeRange === 'All Time' || filteredJobs.length === allJobs.length) {
    const raw = statsRes.data?.averageConfidence || dashRes.data?.averageConfidence || 0;
    avgConfidence = Math.round(raw <= 1 ? raw * 100 : raw);
  }

  // 3. Approval & Rejected Rate
  let approvalRate = 0;
  let rejectedRate = 0;
  let approvedCount = 0;
  let rejectedCount = 0;

  const targetReviews = filteredReviews.length > 0 ? filteredReviews : allReviews;
  targetReviews.forEach(r => {
    const st = String(r.reviewStatus || '').toUpperCase();
    if (st === 'APPROVED') approvedCount++;
    else if (st === 'REJECTED') rejectedCount++;
  });
  const totalReviews = approvedCount + rejectedCount;
  if (totalReviews > 0) {
    approvalRate = Math.round((approvedCount / totalReviews) * 100);
    rejectedRate = Math.round((rejectedCount / totalReviews) * 100);
  }

  // 4. Avg Processing Time in seconds
  const timedJobs = filteredJobs.filter(j => typeof j.processingTimeMs === 'number' && j.processingTimeMs > 0);
  let avgProcessingSec = 0;
  if (timedJobs.length > 0) {
    const sumMs = timedJobs.reduce((acc, j) => acc + j.processingTimeMs, 0);
    avgProcessingSec = Number((sumMs / timedJobs.length / 1000).toFixed(1));
  } else if (allJobs.length > 0) {
    const sumMs = allJobs.reduce((acc, j) => acc + (j.processingTimeMs || 0), 0);
    avgProcessingSec = Number((sumMs / allJobs.length / 1000).toFixed(1));
  }

  // 5. Document Distribution
  const typeMap = new Map();
  filteredJobs.forEach(j => {
    const rawType = j.documentType || 'LAB_REPORT';
    let label = 'Lab Reports';
    if (rawType.includes('PRESCRIPTION')) label = 'Prescriptions';
    else if (rawType.includes('DIAGNOSTIC') || rawType.includes('IMAGING')) label = 'Diagnostic & Scans';
    else if (rawType.includes('DISCHARGE')) label = 'Discharge Summaries';
    typeMap.set(label, (typeMap.get(label) || 0) + 1);
  });
  const colors = ['#28006d', '#006a60', '#ba1a1a', '#483400', '#4f46e5'];
  const distribution = [];
  let cIdx = 0;
  for (const [category, count] of typeMap.entries()) {
    distribution.push({
      category,
      percentage: volume > 0 ? Math.round((count / volume) * 100) : 0,
      color: colors[cIdx++ % colors.length]
    });
  }

  // 6. Recent Exceptions
  const failedJobs = (filteredJobs.length > 0 ? filteredJobs : allJobs)
    .filter(j => j.status === 'FAILED')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const recentExceptions = failedJobs.slice(0, 5).map(j => {
    const reason = j.failureReason || 'Processing failure';
    let excType = 'illegible';
    if (reason.toLowerCase().includes('confidence') || reason.toLowerCase().includes('score')) excType = 'confidence';
    else if (reason.toLowerCase().includes('worker') || reason.toLowerCase().includes('server') || reason.toLowerCase().includes('file')) excType = 'boundary';
    
    return {
      id: j.id,
      title: reason,
      ocrId: '#' + j.id.slice(0, 8),
      timeAgo: formatTimeAgo(j.createdAt),
      type: excType,
    };
  });

  console.log('KPIs:', {
    volume,
    avgConfidence,
    approvalRate,
    rejectedRate,
    avgProcessingSec,
  });
  console.log('Distribution:', distribution);
  console.log('Recent Exceptions count:', recentExceptions.length, 'sample:', recentExceptions[0]);
}

async function run() {
  await testAnalytics('Today');
  await testAnalytics('Last 7 Days');
  await testAnalytics('All Time');
}
run();

