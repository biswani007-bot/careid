const fs = require('fs');
const token = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8')).token;

async function checkReviews() {
  const r = await fetch('https://360api.vnvision.in/api/v1/ocr/reviews/history?limit=100', {
    headers: { Authorization: 'Bearer ' + token }
  });
  console.log('Reviews history status:', r.status);
  const j = await r.json();
  const list = j.data?.data || j.data?.items || j.data || [];
  console.log('Total review entries:', list.length);
  list.forEach((item, idx) => {
    console.log(`[Review #${idx + 1}] ID: ${item.id}, ocrJobId: ${item.ocrJobId}, reviewStatus: ${item.reviewStatus}, notes: ${item.reviewNotes}, reviewedBy: ${item.reviewedBy}`);
  });
}
checkReviews();

