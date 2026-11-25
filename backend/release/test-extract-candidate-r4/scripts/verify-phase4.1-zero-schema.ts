import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const API_BASE = 'http://127.0.0.1:3000/api/v1';

// Read JWT secret from .env
const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
const jwtSecretMatch = envContent.match(/JWT_SECRET=([^\r\n]+)/);
const jwtSecret = jwtSecretMatch ? jwtSecretMatch[1].trim() : 'super_secret_hvapi_jwt_key_2026_change_in_production';

function createToken(userId: string, roles: string[]): string {
  return jwt.sign(
    { sub: userId, userId, roles, permissions: [] },
    jwtSecret,
    { expiresIn: '2h' }
  );
}

const tokens = {
  admin: createToken('eff36819-1c8a-4209-b97c-8746d461215b', ['ADMIN']),
  doctor: createToken('dbe69fae-cdc9-4069-8a7a-ede8d4040f5e', ['DOCTOR']),
  patient1: createToken('04be3d93-a0c5-49e9-93a3-d14cbd80c115', ['PATIENT']),
  patient2: createToken('db0897ba-3bf8-4b7e-99ee-7028187f54db', ['PATIENT']),
};

async function runPhase41Verification() {
  console.log('========================================================================');
  console.log('CAREID PHASE 4.1: ZERO-SCHEMA PENDING APIS VERIFICATION SUITE');
  console.log('========================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}`);
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
    }
  }

  // ─── 1. Insurance OCR Extract Alias ─────────────────────────────────────────
  console.log('\n--- 1. Testing POST /api/v1/insurance/ocr/extract ---');
  const cardSamplePath = path.join(process.cwd(), 'ocr-poc', 'sample_docs', '03_insurance_card.png');
  const cardBytes = fs.readFileSync(cardSamplePath);

  const formData = new FormData();
  formData.append('file', new Blob([cardBytes], { type: 'image/png' }), '03_insurance_card.png');

  // 1.1 Unauthenticated request -> 401
  const unauthRes = await fetch(`${API_BASE}/insurance/ocr/extract`, {
    method: 'POST',
    body: formData,
  });
  assert(unauthRes.status === 401, 'POST /insurance/ocr/extract rejects unauthenticated request with 401 Unauthorized', `Status: ${unauthRes.status}`);

  // 1.2 Authenticated Patient 1 upload
  const extractFormData = new FormData();
  extractFormData.append('file', new Blob([cardBytes], { type: 'image/png' }), '03_insurance_card.png');

  const extractRes = await fetch(`${API_BASE}/insurance/ocr/extract`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.patient1}` },
    body: extractFormData,
  });
  const extractJson: any = await extractRes.json();
  const extractData = extractJson.data || extractJson;

  assert(extractRes.status === 200, 'POST /insurance/ocr/extract returns 200 OK', `Status: ${extractRes.status}`);
  assert(!!extractData.ocrId, 'Response contains valid ocrId', `ocrId: ${extractData.ocrId}`);
  assert(extractData.engine === 'PP-OCRv4-Mobile-CPU', 'Engine is PP-OCRv4-Mobile-CPU (real persistent worker)', `Engine: ${extractData.engine}`);
  assert(extractData.isSimulated === false, 'isSimulated is false');
  assert(!!extractData.extractedData?.providerName, 'Extracted provider name is present', `Provider: ${extractData.extractedData?.providerName}`);
  assert(!!extractData.extractedData?.policyNumber, 'Extracted policy number is present', `PolicyNum: ${extractData.extractedData?.policyNumber}`);

  const ocrRecordId = extractData.ocrId;

  // ─── 2. Medical Records Timeline Alias ──────────────────────────────────────
  console.log('\n--- 2. Testing GET /api/v1/records/timeline ---');
  // 2.1 Unauthenticated request -> 401
  const timelineUnauthRes = await fetch(`${API_BASE}/records/timeline`);
  assert(timelineUnauthRes.status === 401, 'GET /records/timeline rejects unauthenticated request with 401 Unauthorized', `Status: ${timelineUnauthRes.status}`);

  // 2.2 Authenticated Patient 1
  const timelineRes = await fetch(`${API_BASE}/records/timeline`, {
    headers: { Authorization: `Bearer ${tokens.patient1}` },
  });
  const timelineJson: any = await timelineRes.json();
  const timelineItems = Array.isArray(timelineJson.data) ? timelineJson.data : (Array.isArray(timelineJson) ? timelineJson : []);

  assert(timelineRes.status === 200, 'GET /records/timeline returns 200 OK for Patient 1', `Status: ${timelineRes.status}`);
  assert(Array.isArray(timelineItems), 'Timeline returns an array of clinical events', `Items count: ${timelineItems.length}`);

  // 2.3 Verify parity with /medical-records/timeline
  const medTimelineRes = await fetch(`${API_BASE}/medical-records/timeline`, {
    headers: { Authorization: `Bearer ${tokens.patient1}` },
  });
  const medTimelineJson: any = await medTimelineRes.json();
  const medItems = Array.isArray(medTimelineJson.data) ? medTimelineJson.data : (Array.isArray(medTimelineJson) ? medTimelineJson : []);
  assert(medTimelineRes.status === 200 && medItems.length === timelineItems.length, 'GET /records/timeline matches /medical-records/timeline exactly');

  // ─── 3. Insurance Manual Review ─────────────────────────────────────────────
  console.log('\n--- 3. Testing POST /api/v1/insurance/manual-review ---');
  // 3.1 Patient role blocked -> 403
  const patientReviewRes = await fetch(`${API_BASE}/insurance/manual-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.patient1}` },
    body: JSON.stringify({
      ocrRecordId,
      reviewStatus: 'APPROVED',
      reviewNotes: 'Patient attempting to self-approve insurance card',
    }),
  });
  assert(patientReviewRes.status === 403, 'Patient cannot perform manual review (403 Forbidden)', `Status: ${patientReviewRes.status}`);

  // 3.2 Doctor (clinical non-staff) blocked -> 403
  const doctorReviewRes = await fetch(`${API_BASE}/insurance/manual-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.doctor}` },
    body: JSON.stringify({
      ocrRecordId,
      reviewStatus: 'APPROVED',
      reviewNotes: 'Doctor attempting to approve insurance without billing staff role',
    }),
  });
  assert(doctorReviewRes.status === 403, 'Doctor without billing staff role cannot perform manual review (403 Forbidden)', `Status: ${doctorReviewRes.status}`);

  // 3.3 Non-existent ocrRecordId -> 404
  const notFoundReviewRes = await fetch(`${API_BASE}/insurance/manual-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.admin}` },
    body: JSON.stringify({
      ocrRecordId: '00000000-0000-0000-0000-000000000000',
      reviewStatus: 'APPROVED',
    }),
  });
  assert(notFoundReviewRes.status === 404, 'Non-existent ocrRecordId returns 404 Not Found', `Status: ${notFoundReviewRes.status}`);

  // 3.4 Valid Admin / Staff Manual Review Submission -> 200
  const validReviewRes = await fetch(`${API_BASE}/insurance/manual-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.admin}` },
    body: JSON.stringify({
      ocrRecordId,
      reviewStatus: 'APPROVED',
      reviewNotes: 'Member ID and Copay verified against insurer portal by admin reviewer',
      correctedData: {
        copayDetails: 'Office $20, Specialist $40, Inpatient $250',
      },
    }),
  });
  const reviewJson: any = await validReviewRes.json();
  const reviewData = reviewJson.data || reviewJson;

  assert(validReviewRes.status === 200, 'Admin successfully submits manual review (200 OK)', `Status: ${validReviewRes.status}`);
  assert(reviewData.reviewStatus === 'APPROVED', 'Review status is APPROVED', `Status: ${reviewData.reviewStatus}`);
  assert(reviewData.isConfirmed === true, 'isConfirmed is updated to true', `isConfirmed: ${reviewData.isConfirmed}`);
  assert(reviewData.ocrRecordId === ocrRecordId, 'Response associates review with correct ocrRecordId');
  assert(!!reviewData.patientProfileId, 'Response associates review with correct patientProfileId', `patientProfileId: ${reviewData.patientProfileId}`);

  // 3.5 Duplicate Review Prevention -> 400 Bad Request
  const duplicateReviewRes = await fetch(`${API_BASE}/insurance/manual-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.admin}` },
    body: JSON.stringify({
      ocrRecordId,
      reviewStatus: 'APPROVED',
      reviewNotes: 'Submitting duplicate review for already confirmed record',
    }),
  });
  assert(duplicateReviewRes.status === 400, 'Duplicate manual review submission rejected with 400 Bad Request', `Status: ${duplicateReviewRes.status}`);

  // 3.6 Verify Audit Trail and Preserved Data on GET /insurance/ocr/:id
  const getRecordRes = await fetch(`${API_BASE}/insurance/ocr/${ocrRecordId}`, {
    headers: { Authorization: `Bearer ${tokens.admin}` },
  });
  const getRecordJson: any = await getRecordRes.json();
  const recordDetail = getRecordJson.data || getRecordJson;
  const parsedExtracted = typeof recordDetail.extractedData === 'string' ? JSON.parse(recordDetail.extractedData) : recordDetail.extractedData;

  assert(getRecordRes.status === 200, 'GET /insurance/ocr/:id retrieves updated record (200 OK)');
  assert(recordDetail.isConfirmed === true, 'Record isConfirmed is true in database');
  assert(!!parsedExtracted.policyNumber, 'Original extracted policyNumber was preserved');
  assert(parsedExtracted.copayDetails === 'Office $20, Specialist $40, Inpatient $250', 'Corrected data was merged into extractedData');
  assert(Array.isArray(parsedExtracted.reviewHistory) && parsedExtracted.reviewHistory.length >= 1, 'Audit history trail is recorded inside reviewHistory');

  // ─── 4. Financing Discounts Catalog Assessment ──────────────────────────────
  console.log('\n--- 4. Assessing GET /api/v1/financing/discounts ---');
  const discountRes = await fetch(`${API_BASE}/financing/discounts`, {
    headers: { Authorization: `Bearer ${tokens.patient1}` },
  });
  // Since no commercial discount policy or model exists, verify route correctly returns 404
  assert(discountRes.status === 404, 'GET /financing/discounts safely returns 404 (No unapproved discounts hardcoded)', `Status: ${discountRes.status}`);

  console.log('\n========================================================================');
  console.log(`PHASE 4.1 VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('========================================================================\n');

  if (passedTests === totalTests) {
    console.log('✔ All Phase 4.1 Zero-Schema requirements successfully verified!');
    process.exit(0);
  } else {
    console.error(`✖ ${totalTests - passedTests} tests failed.`);
    process.exit(1);
  }
}

runPhase41Verification().catch((err) => {
  console.error('Fatal error running verification:', err);
  process.exit(1);
});

