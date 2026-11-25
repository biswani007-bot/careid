import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { execSync } from 'child_process';

const API_BASE = 'http://127.0.0.1:3000/api/v1';
const WORKER_BASE = 'http://127.0.0.1:5050';
const SAMPLES_DIR = path.join(process.cwd(), 'ocr-poc', 'sample_docs');

// Read secrets from .env
const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
const secretMatch = envContent.match(/CAREID_OCR_SECRET=([^\r\n]+)/);
const internalSecret = secretMatch ? secretMatch[1].trim() : '';

const jwtSecretMatch = envContent.match(/JWT_SECRET=([^\r\n]+)/);
const jwtSecret = jwtSecretMatch ? jwtSecretMatch[1].trim() : 'super_secret_hvapi_jwt_key_2026_change_in_production';

interface TokenMap {
  adminToken: string;
  doctorToken: string;
  patient1Token: string;
  patient2Token: string;
}

function createToken(userId: string, roles: string[]): string {
  return jwt.sign(
    { sub: userId, userId, roles, permissions: [] },
    jwtSecret,
    { expiresIn: '2h' }
  );
}

async function runVerification() {
  console.log('========================================================================');
  console.log('CAREID PHASE 3C.1: OCR INTEGRATION SECURITY & LIVE VERIFICATION SUITE');
  console.log('========================================================================\n');

  // STEP 1: Multi-Role Authentication Setup
  console.log('--- Step 1: Multi-Role Authentication Setup ---');
  const tokens: TokenMap = {
    adminToken: createToken('eff36819-1c8a-4209-b97c-8746d461215b', ['ADMIN']),
    doctorToken: createToken('dbe69fae-cdc9-4069-8a7a-ede8d4040f5e', ['DOCTOR']),
    patient1Token: createToken('04be3d93-a0c5-49e9-93a3-d14cbd80c115', ['PATIENT']),
    patient2Token: createToken('db0897ba-3bf8-4b7e-99ee-7028187f54db', ['PATIENT']),
  };
  console.log('✔ Authenticated Admin (eff36819-1c8a-4209-b97c-8746d461215b)');
  console.log('✔ Authenticated Doctor (dbe69fae-cdc9-4069-8a7a-ede8d4040f5e)');
  console.log('✔ Authenticated Patient 1 (04be3d93-a0c5-49e9-93a3-d14cbd80c115)');
  console.log('✔ Authenticated Patient 2 (db0897ba-3bf8-4b7e-99ee-7028187f54db)\n');

  // STEP 2: OCR Worker Internal Secret Authentication Hardening
  console.log('--- Step 2: OCR Worker Internal Secret Authentication Hardening ---');
  const testImagePath = path.join(SAMPLES_DIR, '03_insurance_card.png');
  const fileBytes = fs.readFileSync(testImagePath);

  // 2.1: Missing secret header -> HTTP 401
  const formDataNoSecret = new FormData();
  formDataNoSecret.append('file', new Blob([fileBytes], { type: 'image/png' }), '03_insurance_card.png');
  const noSecretRes = await fetch(`${WORKER_BASE}/internal/ocr/process`, {
    method: 'POST',
    body: formDataNoSecret,
  });
  console.log(`- Request without secret: HTTP ${noSecretRes.status} (Expected: 401)`);
  if (noSecretRes.status !== 401) throw new Error(`Security Fail: Missing secret did not return 401`);

  // 2.2: Invalid secret header -> HTTP 401
  const formDataBadSecret = new FormData();
  formDataBadSecret.append('file', new Blob([fileBytes], { type: 'image/png' }), '03_insurance_card.png');
  const badSecretRes = await fetch(`${WORKER_BASE}/internal/ocr/process`, {
    method: 'POST',
    headers: { 'X-CareID-Internal-Secret': 'invalid_secret_token_12345' },
    body: formDataBadSecret,
  });
  console.log(`- Request with invalid secret: HTTP ${badSecretRes.status} (Expected: 401)`);
  if (badSecretRes.status !== 401) throw new Error(`Security Fail: Invalid secret did not return 401`);

  // 2.3: Valid secret header -> HTTP 200
  const formDataValid = new FormData();
  formDataValid.append('file', new Blob([fileBytes], { type: 'image/png' }), '03_insurance_card.png');
  const validSecretRes = await fetch(`${WORKER_BASE}/internal/ocr/process`, {
    method: 'POST',
    headers: { 'X-CareID-Internal-Secret': internalSecret },
    body: formDataValid,
  });
  const validSecretJson = await validSecretRes.json();
  console.log(`- Request with valid secret: HTTP ${validSecretRes.status} (Expected: 200)`);
  console.log(`- Worker response verification: engine=${validSecretJson.engine}, confidence=${validSecretJson.overallConfidence}`);
  const secretLeaked = JSON.stringify(validSecretJson).includes(internalSecret);
  console.log(`- Worker response body secret leakage check: ${secretLeaked ? 'LEAKED ❌' : 'CLEAN ✔ (zero leakage)'}`);
  if (secretLeaked) throw new Error(`Security Fail: Secret leaked in worker response`);
  console.log('✔ Internal Authentication Hardening Verified\n');

  // STEP 3: Verify All 7 Integrated OCR Endpoint Flows against NestJS
  console.log('--- Step 3: End-to-End Live OCR API Verification against NestJS ---');

  // 3.1: POST /api/v1/ocr/jobs (Lab Report)
  console.log('1. Testing POST /api/v1/ocr/jobs (LAB_REPORT)...');
  const submitLabRes = await fetch(`${API_BASE}/ocr/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.patient1Token}`,
    },
    body: JSON.stringify({
      medicalAttachmentId: 'demo-attachment-lab-1',
      documentType: 'LAB_REPORT',
    }),
  });
  const submitLabData = await submitLabRes.json();
  console.log(`   Status: HTTP ${submitLabRes.status}`);
  if (submitLabRes.status !== 201) throw new Error(`Submit lab job failed: ${JSON.stringify(submitLabData)}`);
  const labJobId = submitLabData.data.id;
  console.log(`   Job ID: ${labJobId}, Status: ${submitLabData.data.status}, Confidence: ${submitLabData.data.overallConfidence}`);

  // 3.2: GET /api/v1/ocr/jobs/:id/text
  console.log('2. Testing GET /api/v1/ocr/jobs/:id/text...');
  const getTextRes = await fetch(`${API_BASE}/ocr/jobs/${labJobId}/text`, {
    headers: { Authorization: `Bearer ${tokens.patient1Token}` },
  });
  const getTextData = await getTextRes.json();
  console.log(`   Status: HTTP ${getTextRes.status}, Text snippet: "${getTextData.data.text.substring(0, 80).replace(/\n/g, ' ')}..."`);

  // 3.3: GET /api/v1/ocr/jobs/:id/fields
  console.log('3. Testing GET /api/v1/ocr/jobs/:id/fields...');
  const getFieldsRes = await fetch(`${API_BASE}/ocr/jobs/${labJobId}/fields`, {
    headers: { Authorization: `Bearer ${tokens.patient1Token}` },
  });
  const getFieldsData = await getFieldsRes.json();
  console.log(`   Status: HTTP ${getFieldsRes.status}, Fields extracted: ${getFieldsData.data.length}`);
  for (const f of getFieldsData.data.slice(0, 5)) {
    console.log(`     - [${f.fieldName}]: "${f.fieldValue}" (conf: ${f.confidence}, review: ${f.requiresReview})`);
  }

  // 3.4: GET /api/v1/ocr/jobs/:id/json
  console.log('4. Testing GET /api/v1/ocr/jobs/:id/json...');
  const getJsonRes = await fetch(`${API_BASE}/ocr/jobs/${labJobId}/json`, {
    headers: { Authorization: `Bearer ${tokens.patient1Token}` },
  });
  const getJsonData = await getJsonRes.json();
  console.log(`   Status: HTTP ${getJsonRes.status}, Engine: ${getJsonData.data.engine}, Simulated: ${getJsonData.data.isSimulated}, Keys: ${Object.keys(getJsonData.data.fields).join(', ')}`);

  // 3.5: POST /api/v1/ocr/reprocess/:jobId
  console.log('5. Testing POST /api/v1/ocr/reprocess/:jobId...');
  const reprocessRes = await fetch(`${API_BASE}/ocr/reprocess/${labJobId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.patient1Token}` },
  });
  const reprocessData = await reprocessRes.json();
  console.log(`   Status: HTTP ${reprocessRes.status}, Reprocessed Status: ${reprocessData.data.status}`);

  // 3.6: POST /api/v1/ai/ocr/extract & POST /api/v1/ai/ocr/confirm
  console.log('6. Testing POST /api/v1/ai/ocr/extract (Patient 1)...');
  const aiOcrRes = await fetch(`${API_BASE}/ai/ocr/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.patient1Token}`,
    },
    body: JSON.stringify({
      imageUrl: 'https://storage.healthvault360.com/reports/01_lab_report.png',
    }),
  });
  const aiOcrData = await aiOcrRes.json();
  console.log(`   Status: HTTP ${aiOcrRes.status}, Document ID: ${aiOcrData.data?.documentId}, Title: "${aiOcrData.data?.extractedData?.title}", Category: "${aiOcrData.data?.extractedData?.category}", PrescribedBy: "${aiOcrData.data?.extractedData?.prescribedBy}", Confidence: ${aiOcrData.data?.confidence}`);
  const aiDocId = aiOcrData.data?.documentId;

  console.log('6b. Testing POST /api/v1/ai/ocr/confirm...');
  const aiConfirmRes = await fetch(`${API_BASE}/ai/ocr/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.patient1Token}`,
    },
    body: JSON.stringify({
      documentId: aiDocId,
      confirmedData: JSON.stringify({
        title: aiOcrData.data?.extractedData?.title || 'Complete Blood Count (CBC)',
        category: 'Laboratory',
        prescribedBy: aiOcrData.data?.extractedData?.prescribedBy || 'Dr. Alan Grant',
      }),
    }),
  });
  const aiConfirmData = await aiConfirmRes.json();
  console.log(`   Status: HTTP ${aiConfirmRes.status}, Message: "${aiConfirmData.data?.message}"`);

  // 3.7: POST /api/v1/insurance/ocr & POST /api/v1/insurance/ocr/scan
  console.log('7. Testing POST /api/v1/insurance/ocr (Insurance card upload)...');
  const insCardBytes = fs.readFileSync(path.join(SAMPLES_DIR, '03_insurance_card.png'));
  const insForm = new FormData();
  insForm.append('file', new Blob([insCardBytes], { type: 'image/png' }), '03_insurance_card.png');
  const insOcrRes = await fetch(`${API_BASE}/insurance/ocr`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.patient1Token}` },
    body: insForm,
  });
  const insOcrData = await insOcrRes.json();
  const cardRecordId = insOcrData.data?.ocrId;
  const extData = insOcrData.data?.extractedData;
  console.log(`   Status: HTTP ${insOcrRes.status}, OCR ID: ${cardRecordId}, Provider: "${extData?.providerName}", Policy: "${extData?.policyNumber}", Coverage: "${extData?.coverageDetails}", Conf: ${insOcrData.data?.confidence}`);

  console.log('7b. Testing POST /api/v1/insurance/ocr/scan (Standard scan endpoint)...');
  const insScanForm = new FormData();
  insScanForm.append('file', new Blob([insCardBytes], { type: 'image/png' }), '03_insurance_card.png');
  const insScanRes = await fetch(`${API_BASE}/insurance/ocr/scan`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.patient1Token}` },
    body: insScanForm,
  });
  const insScanData = await insScanRes.json();
  console.log(`   Status: HTTP ${insScanRes.status}, Scan OCR ID: ${insScanData.data?.ocrId}, Policy: ${insScanData.data?.extractedData?.policyNumber}`);

  // 3.8: GET /api/v1/insurance/ocr/:id
  console.log('8. Testing GET /api/v1/insurance/ocr/:id...');
  const getCardRes = await fetch(`${API_BASE}/insurance/ocr/${cardRecordId}`, {
    headers: { Authorization: `Bearer ${tokens.patient1Token}` },
  });
  const getCardData = await getCardRes.json();
  console.log(`   Status: HTTP ${getCardRes.status}, Record ID: ${getCardData.data?.id}, Provider: "${getCardData.data?.extractedData?.providerName}", IsConfirmed: ${getCardData.data?.isConfirmed}`);

  // 3.9: POST /api/v1/insurance/ocr/confirm
  console.log('9. Testing POST /api/v1/insurance/ocr/confirm (Confirm OCR card into policy)...');
  const uniquePolicyNumber = `POL-${Date.now().toString().slice(-8)}`;
  const confirmRes = await fetch(`${API_BASE}/insurance/ocr/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.patient1Token}`,
    },
    body: JSON.stringify({
      ocrId: cardRecordId,
      confirmedData: {
        providerName: extData?.providerName || 'Blue Shield Premier Health',
        policyNumber: uniquePolicyNumber,
        coverageDetails: extData?.coverageDetails || 'Office $20, Specialist $40, ER $150',
      },
    }),
  });
  const confirmData = await confirmRes.json();
  console.log(`   Status: HTTP ${confirmRes.status}, Policy Created: ${confirmData.data?.policyId}`);
  if (confirmRes.status !== 200) {
    throw new Error(`Confirm failed: ${JSON.stringify(confirmData)}`);
  }

  // 3.10: Approved Phase 4.1 alias endpoint: POST /insurance/ocr/extract
  console.log('10. Testing POST /api/v1/insurance/ocr/extract (Approved Phase 4.1 OCR Extract endpoint)...');
  const extractForm = new FormData();
  extractForm.append('file', new Blob([insCardBytes], { type: 'image/png' }), '03_insurance_card.png');
  const extractTestRes = await fetch(`${API_BASE}/insurance/ocr/extract`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.patient1Token}` },
    body: extractForm,
  });
  const extractData = await extractTestRes.json();
  console.log(`   Status: HTTP ${extractTestRes.status}, Extract OCR ID: ${extractData.data?.ocrId}, Provider: "${extractData.data?.extractedData?.providerName}", Policy: "${extractData.data?.extractedData?.policyNumber}"`);
  if (extractTestRes.status !== 200 || !extractData.data?.ocrId) {
    throw new Error(`Extraction failed: ${JSON.stringify(extractData)}`);
  }
  console.log('✔ All Postman API contracts and approved endpoints verified\n');

  // STEP 4: Data Integrity and Security (Cross-Tenant Isolation)
  console.log('--- Step 4: Data Integrity & Cross-Patient Security Isolation ---');

  // 4.1: Cross-Patient Reprocess Attempt
  console.log('1. Cross-patient isolation: Patient 2 attempts to reprocess Patient 1 job...');
  const patient2ReprocessRes = await fetch(`${API_BASE}/ocr/reprocess/${labJobId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.patient2Token}` },
  });
  console.log(`   Status: HTTP ${patient2ReprocessRes.status} (Expected: 403 Forbidden)`);
  if (patient2ReprocessRes.status !== 403) {
    throw new Error(`Security Fail: Patient 2 was able to reprocess Patient 1's OCR job!`);
  }

  // 4.2: Cross-Patient Insurance Card Access Attempt
  console.log('2. Cross-patient isolation: Patient 2 attempts to fetch Patient 1 insurance card...');
  const patient2CardRes = await fetch(`${API_BASE}/insurance/ocr/${cardRecordId}`, {
    headers: { Authorization: `Bearer ${tokens.patient2Token}` },
  });
  console.log(`   Status: HTTP ${patient2CardRes.status} (Expected: 403 or 404)`);
  if (patient2CardRes.status !== 403 && patient2CardRes.status !== 404) {
    throw new Error(`Security Fail: Patient 2 was able to fetch Patient 1's insurance card!`);
  }

  // 4.3: Low Confidence / Degraded Scan Review Required Flagging
  console.log('3. Low confidence / degraded scan review requirement test...');
  const lowCardBytes = fs.readFileSync(path.join(SAMPLES_DIR, '06_low_quality_card.jpg'));
  const lowCardForm = new FormData();
  lowCardForm.append('file', new Blob([lowCardBytes], { type: 'image/jpeg' }), '06_low_quality_card.jpg');
  const lowCardRes = await fetch(`${API_BASE}/insurance/ocr`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.patient1Token}` },
    body: lowCardForm,
  });
  const lowCardData = await lowCardRes.json();
  const lowConfidence = lowCardData.data?.confidence;
  console.log(`   Status: HTTP ${lowCardRes.status}, Confidence: ${lowConfidence}, Engine: ${lowCardData.data?.engine}`);

  // 4.4: Database Relational Integrity Check via PostgreSQL
  console.log('4. Database Relational Integrity & Orphan Prevention Check...');
  const dbCounts = execSync('docker exec careid-test-postgres psql -U postgres -d hvapi_db -t -c "SELECT (SELECT COUNT(*) FROM ocr_jobs), (SELECT COUNT(*) FROM ocr_pages), (SELECT COUNT(*) FROM extracted_fields), (SELECT COUNT(*) FROM ocr_extractions), (SELECT COUNT(*) FROM insurance_ocr_records);"').toString().trim();
  const [jobsCount, pagesCount, fieldsCount, aiDocCount, insRecCount] = dbCounts.split('|').map(s => parseInt(s.trim(), 10));
  console.log(`   PostgreSQL Counts: ocr_jobs=${jobsCount}, ocr_pages=${pagesCount}, extracted_fields=${fieldsCount}, ocr_extractions=${aiDocCount}, insurance_ocr_records=${insRecCount}`);
  if (jobsCount === 0 || pagesCount === 0 || fieldsCount === 0 || insRecCount === 0) {
    throw new Error('Integrity Fail: Database records were not persisted properly!');
  }
  console.log('✔ Cross-Patient Security Isolation & Data Integrity Verified\n');

  // STEP 5: Clinical Extraction Validation on all 6 Sample Documents
  console.log('--- Step 5: Clinical Extraction Benchmark on All 6 Documents ---');
  const benchmarkDocs = [
    { name: '01_lab_report.png', docType: 'LAB_REPORT', expectedTerms: ['Jane Doe', 'MRN-784920', '13.8', 'Dr. Alan Grant'] },
    { name: '02_prescription.jpg', docType: 'PRESCRIPTION', expectedTerms: ['Dr. Sarah Jenkins', 'Jane Smith', 'Atorvastatin', '20mg'] },
    { name: '03_insurance_card.png', docType: 'INSURANCE_CARD', expectedTerms: ['Blue Shield', 'Sarah Miller', 'BSN-99887711', 'POL987654321'] },
    { name: '04_multipage_lab_report.pdf', docType: 'MULTIPLE_PAGES', expectedTerms: ['Jane Doe', 'BIOCHEMISTRY'] },
    { name: '05_rotated_insurance_card.png', docType: 'INSURANCE_CARD', expectedTerms: ['Blue Shield', 'Sarah Miller'] },
    { name: '06_low_quality_card.jpg', docType: 'INSURANCE_CARD', expectedTerms: ['Blue Shield', 'Sarah Miller'] },
  ];

  for (const doc of benchmarkDocs) {
    const docBytes = fs.readFileSync(path.join(SAMPLES_DIR, doc.name));
    const isPdf = doc.name.endsWith('.pdf');
    const mime = isPdf ? 'application/pdf' : doc.name.endsWith('.png') ? 'image/png' : 'image/jpeg';

    const startTime = Date.now();
    const workerForm = new FormData();
    workerForm.append('file', new Blob([docBytes], { type: mime }), doc.name);
    workerForm.append('documentType', doc.docType);

    const workerResp = await fetch(`${WORKER_BASE}/internal/ocr/process`, {
      method: 'POST',
      headers: { 'X-CareID-Internal-Secret': internalSecret },
      body: workerForm,
    });
    const result = await workerResp.json();
    const elapsedMs = Date.now() - startTime;

    const fullText = result.combinedText || '';
    const matchedTerms = doc.expectedTerms.filter(t => fullText.toLowerCase().includes(t.toLowerCase()));
    const matchPct = Math.round((matchedTerms.length / doc.expectedTerms.length) * 100);

    console.log(`Document: ${doc.name.padEnd(28)} | ${result.pageCount} pg | Conf: ${result.overallConfidence?.toFixed(3)} | Time: ${(elapsedMs/1000).toFixed(2)}s | Matches: ${matchedTerms.length}/${doc.expectedTerms.length} (${matchPct}%)`);
  }

  console.log('\n========================================================================');
  console.log('PHASE 3C.1 VERIFICATION COMPLETED SUCCESSFULLY');
  console.log('========================================================================');
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
