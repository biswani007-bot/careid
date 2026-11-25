const fs = require('fs');
const token = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8')).token;

function resolveOcrJobStatus(raw, reviewHistoryMap) {
  if (Array.isArray(raw?.verifications) && raw.verifications.length > 0) {
    const sorted = [...raw.verifications].sort(
      (a, b) => new Date(b.completedAt || b.createdAt || 0).getTime() - new Date(a.completedAt || a.createdAt || 0).getTime()
    );
    const latest = sorted[0];
    const rev = String(latest.reviewStatus || '').toUpperCase();
    if (rev === 'REJECTED') return 'Rejected';
    if (rev === 'APPROVED') return 'Approved';
  }

  if (reviewHistoryMap && raw?.id && reviewHistoryMap.has(raw.id)) {
    const hist = reviewHistoryMap.get(raw.id);
    const rev = String(hist.reviewStatus || '').toUpperCase();
    if (rev === 'REJECTED') return 'Rejected';
    if (rev === 'APPROVED') return 'Approved';
  }

  if (raw?.reviewStatus) {
    const rev = String(raw.reviewStatus).toUpperCase();
    if (rev === 'REJECTED') return 'Rejected';
    if (rev === 'APPROVED') return 'Approved';
  }

  if (Array.isArray(raw?.extractedFields) && raw.extractedFields.length > 0) {
    const hasRejected = raw.extractedFields.some(f => String(f.validationStatus || '').toUpperCase() === 'REJECTED');
    const hasApproved = raw.extractedFields.some(f => ['APPROVED', 'VALIDATED'].includes(String(f.validationStatus || '').toUpperCase()));
    if (hasRejected && !hasApproved) {
      return 'Rejected';
    }
  }

  const st = String(raw?.status || '').toUpperCase();
  if (st === 'REVIEW_REQUIRED' || st === 'UNDER_REVIEW') return 'Under Review';
  if (st === 'FAILED') return 'Rejected';
  if (st === 'COMPLETED' || st === 'APPROVED') return 'Approved';
  if (st === 'PENDING' || st === 'PROCESSING') return 'Pending';

  return 'Pending';
}

async function test() {
  const [p1, p2, histRes] = await Promise.all([
    fetch('https://360api.vnvision.in/api/v1/ocr/jobs?limit=100&page=1', { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json()),
    fetch('https://360api.vnvision.in/api/v1/ocr/jobs?limit=100&page=2', { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json()),
    fetch('https://360api.vnvision.in/api/v1/ocr/reviews/history?limit=100', { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json()),
  ]);

  const allJobs = [...(p1.data?.data || p1.data?.items || p1.data || []), ...(p2.data?.data || p2.data?.items || p2.data || [])];
  const hist = Array.isArray(histRes.data) ? histRes.data : histRes.data?.data || [];
  const reviewMap = new Map();
  hist.forEach(h => reviewMap.set(h.ocrJobId, h));

  console.log(`Total jobs: ${allJobs.length}, Review history entries: ${hist.length}`);

  const counts = { 'Under Review': 0, 'Approved': 0, 'Rejected': 0, 'Pending': 0 };
  allJobs.forEach(job => {
    const status = resolveOcrJobStatus(job, reviewMap);
    counts[status] = (counts[status] || 0) + 1;
  });

  console.log('Resolved Status Counts:', counts);

  const targetJob = allJobs.find(j => j.id === 'bf760a70-ab5b-4390-b0f4-d2da9b6006c8');
  console.log('\nTarget Job bf760a70-ab5b-4390-b0f4-d2da9b6006c8:');
  console.log('Raw status:', targetJob?.status);
  console.log('Resolved status:', resolveOcrJobStatus(targetJob, reviewMap));
  console.log('Rejection note:', targetJob?.verifications?.[0]?.reviewNotes || targetJob?.failureReason);
}

test();

