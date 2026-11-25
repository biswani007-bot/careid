const https = require('https');
const { getAdminToken } = require('./token_helper.cjs');

function httpRequest(path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '360api.vnvision.in',
      path,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
      rejectUnauthorized: false
    };
    https.get(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ success: res.statusCode === 200, data: JSON.parse(d) }); }
        catch (e) { resolve({ success: false, data: d }); }
      });
    }).on('error', reject);
  });
}

function formatTaskDateTime(dateString) {
  if (!dateString) return 'Recent';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Recent';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Recent';
  }
}

function formatDocType(rawType) {
  if (!rawType) return 'Clinical Document';
  const upper = rawType.toUpperCase();
  if (upper.includes('LAB') || upper.includes('BLOOD')) return 'Lab Report';
  if (upper.includes('MRI') || upper.includes('LUMBAR')) return 'MRI Scan';
  if (upper.includes('PRESCRIPTION')) return 'Prescription';
  if (upper.includes('DISCHARGE')) return 'Discharge Summary';
  if (upper.includes('PATHOLOGY')) return 'Pathology Report';
  if (upper.includes('CARDIO') || upper.includes('ECG')) return 'Cardiology ECG';
  if (upper.includes('DIAGNOSTIC')) return 'Diagnostic Report';
  return rawType.replace(/_/g, ' ');
}

async function simulateGetPriorityTasks() {
  const token = await getAdminToken();
  const tasks = [];

  const [ocrRes, refRes] = await Promise.allSettled([
    httpRequest('/api/v1/ocr/review', token),
    httpRequest('/api/v1/referrals?limit=100', token),
  ]);

  // 1. Process OCR review jobs
  if (ocrRes.status === 'fulfilled' && ocrRes.value.success) {
    const ocrJobs = Array.isArray(ocrRes.value.data?.data)
      ? ocrRes.value.data.data
      : Array.isArray(ocrRes.value.data)
      ? ocrRes.value.data
      : [];

    ocrJobs.forEach(job => {
      const rawStatus = (job.status || '').toUpperCase();
      // EXCLUDE completed, approved, failed, rejected, cancelled
      if (['COMPLETED', 'APPROVED', 'FAILED', 'REJECTED', 'CANCELLED'].includes(rawStatus)) {
        return;
      }
      // Only include review required / pending
      if (rawStatus !== 'REVIEW_REQUIRED' && rawStatus !== 'UNDER_REVIEW' && rawStatus !== 'PENDING' && !job.requiresReview) {
        return;
      }
      // If already verified, exclude
      if (Array.isArray(job.verifications) && job.verifications.some(v => v.reviewStatus === 'APPROVED')) {
        return;
      }

      const confLvl = (job.confidenceLevel || '').toUpperCase();
      const confScore = job.overallConfidence ?? 1;
      const isLowConf = confLvl === 'LOW' || confScore < 0.7;
      const priority = isLowConf ? 'High' : 'Medium';

      const docName = formatDocType(job.documentType);
      const rawTimestamp = job.createdAt || job.startedAt || new Date().toISOString();

      tasks.push({
        id: `ocr-${job.id}`,
        taskType: 'OCR Verification',
        typeIconKey: 'ocr',
        entity: `Batch #${String(job.id).slice(0, 8)} — ${docName}`,
        submittedAt: formatTaskDateTime(rawTimestamp),
        rawTimestamp,
        status: 'Under Review',
        priority,
        actionLabel: 'Review',
        actionPath: `/admin/ocr/verify/${job.id}`,
        isPrimaryAction: true,
      });
    });
  }

  // 2. Process Referrals
  if (refRes.status === 'fulfilled' && refRes.value.success) {
    const refList = refRes.value.data?.data || (Array.isArray(refRes.value.data) ? refRes.value.data : []);
    refList.forEach(r => {
      const rawStatus = (r.status || '').toUpperCase();
      // Exclude accepted, completed, cancelled, rejected
      if (['ACCEPTED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(rawStatus)) {
        return;
      }
      // Only actionable: SUBMITTED, PENDING, ESCALATED
      if (rawStatus !== 'SUBMITTED' && rawStatus !== 'PENDING' && rawStatus !== 'ESCALATED') {
        return;
      }

      const rawPriority = (r.priority || '').toUpperCase();
      const isCritical = rawPriority === 'CRITICAL' || rawPriority === 'STAT' || rawStatus === 'ESCALATED';
      const isUrgent = rawPriority === 'URGENT';
      const priority = isCritical ? 'Critical' : isUrgent ? 'Urgent' : 'Routine';

      const status = rawStatus === 'ESCALATED' ? 'Escalated' : 'Pending';
      const rawTimestamp = r.createdAt || new Date().toISOString();

      tasks.push({
        id: `ref-${r.id}`,
        taskType: 'Referral Review',
        typeIconKey: 'referral',
        entity: `${r.referralNumber || 'Referral #' + String(r.id).slice(0, 6)} — ${r.specialtyRequired || 'Specialist'}`,
        submittedAt: formatTaskDateTime(rawTimestamp),
        rawTimestamp,
        status,
        priority,
        actionLabel: 'Process',
        actionPath: `/admin/referrals/details/${r.id}`,
        isPrimaryAction: false,
      });
    });
  }

  // Sort tasks: Critical / Escalated first, then by date descending
  tasks.sort((a, b) => {
    const score = (t) => (t.status === 'Escalated' || t.priority === 'Critical' ? 2 : t.priority === 'Urgent' || t.priority === 'High' ? 1 : 0);
    const scoreDiff = score(b) - score(a);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(b.rawTimestamp).getTime() - new Date(a.rawTimestamp).getTime();
  });

  console.log(`Total actionable priority tasks: ${tasks.length}`);
  console.log('Sample top 10 tasks:');
  console.table(tasks.slice(0, 10).map(t => ({
    Type: t.taskType,
    Entity: t.entity,
    Submitted: t.submittedAt,
    Status: t.status,
    Priority: t.priority,
    Action: t.actionLabel,
    Path: t.actionPath
  })));
}

simulateGetPriorityTasks();

