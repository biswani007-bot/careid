const fs = require('fs');
const token = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8')).token;

async function test() {
  const p1 = await fetch('https://360api.vnvision.in/api/v1/ocr/jobs?limit=100&page=1', {
    headers: { Authorization: 'Bearer ' + token }
  }).then(r => r.json());

  const p2 = await fetch('https://360api.vnvision.in/api/v1/ocr/jobs?limit=100&page=2', {
    headers: { Authorization: 'Bearer ' + token }
  }).then(r => r.json());

  const p1List = p1.data?.data || p1.data?.items || p1.data || [];
  const p2List = p2.data?.data || p2.data?.items || p2.data || [];
  const allJobs = [...p1List, ...p2List];
  console.log('Total fetched jobs:', allJobs.length);

  const failureReasons = {};
  allJobs.forEach(j => {
    if (j.failureReason) {
      failureReasons[j.failureReason] = (failureReasons[j.failureReason] || 0) + 1;
    }
  });
  console.log('Failure reasons breakdown:', JSON.stringify(failureReasons, null, 2));

  const authFailedJobs = allJobs.filter(j => j.failureReason && j.failureReason.includes('CAREID_OCR_SECRET'));
  console.log('Total jobs with CAREID_OCR_SECRET failure:', authFailedJobs.length);
  authFailedJobs.forEach((j, i) => {
    console.log(`[AUTH FAIL #${i+1}] ID: ${j.id}, docType: ${j.documentType}, attachmentId: ${j.medicalAttachmentId}, started: ${j.startedAt}, completed: ${j.completedAt}, created: ${j.createdAt}`);
  });

  fs.writeFileSync('scratch/auth_failed_jobs.json', JSON.stringify(authFailedJobs, null, 2));
}
test();

