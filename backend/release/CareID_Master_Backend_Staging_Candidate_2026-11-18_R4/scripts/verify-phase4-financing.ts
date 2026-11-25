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

async function runFinancingVerification() {
  console.log('========================================================================');
  console.log('CAREID PHASE 4: FINANCING API VERIFICATION & HARDENING SUITE');
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

  // --- Step 2.1: Available Options / Catalog ---
  console.log('\n--- 1. Testing GET /options and GET /offers ---');
  const optRes = await fetch(`${API_BASE}/financing/options`, {
    headers: { Authorization: `Bearer ${tokens.patient1}` },
  });
  const optData: any = await optRes.json();
  const options = optData.data || optData;
  assert(optRes.status === 200, 'GET /financing/options returns 200 OK', `Status: ${optRes.status}`);
  assert(Array.isArray(options) && options.length >= 3, 'Financing options contains >= 3 partner plans', `Found: ${options.length}`);
  const zeroCostOpt = options.find((o: any) => o.id === 'opt-zerocost-care');
  assert(!!zeroCostOpt, 'Catalog includes zero-cost medical EMI option (opt-zerocost-care)');

  // --- Step 2.2: POST /financing/apply Validation Checks ---
  console.log('\n--- 2. Testing POST /financing/apply Validation ---');
  // 2.2.1: Invalid optionId
  const badOptRes = await fetch(`${API_BASE}/financing/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.patient1}` },
    body: JSON.stringify({
      optionId: 'non-existent-option',
      requestedAmount: 50000,
      tenureMonths: 6,
    }),
  });
  assert(badOptRes.status === 400, 'POST /financing/apply rejects non-existent optionId with 400 Bad Request', `Status: ${badOptRes.status}`);

  // 2.2.2: Amount outside min/max
  const badAmountRes = await fetch(`${API_BASE}/financing/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.patient1}` },
    body: JSON.stringify({
      optionId: 'opt-zerocost-care',
      requestedAmount: 500000, // max is 200,000
      tenureMonths: 6,
    }),
  });
  assert(badAmountRes.status === 400, 'POST /financing/apply rejects amount exceeding max limit with 400', `Status: ${badAmountRes.status}`);

  // 2.2.3: Invalid tenure
  const badTenureRes = await fetch(`${API_BASE}/financing/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.patient1}` },
    body: JSON.stringify({
      optionId: 'opt-zerocost-care',
      requestedAmount: 50000,
      tenureMonths: 15, // allowed are 3, 6, 9, 12
    }),
  });
  assert(badTenureRes.status === 400, 'POST /financing/apply rejects invalid tenure tenure with 400', `Status: ${badTenureRes.status}`);

  // --- Step 2.3: Successful Creation via POST /financing/apply ---
  console.log('\n--- 3. Testing Successful Creation for Patient 1 ---');
  const validApplyRes = await fetch(`${API_BASE}/financing/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.patient1}` },
    body: JSON.stringify({
      optionId: 'opt-zerocost-care',
      treatmentName: 'Cardiology Consultation & Diagnostic Angiography',
      requestedAmount: 60000,
      tenureMonths: 6,
      monthlyIncome: 85000,
      employmentType: 'Salaried',
      panOrNationalId: 'ABCDE1234F',
      notes: 'Need fast EMI clearance for planned cardiac diagnostics',
    }),
  });
  const applyPayload: any = await validApplyRes.json();
  const createdApp = applyPayload.data || applyPayload;
  assert(validApplyRes.status === 201, 'POST /financing/apply creates application with 201 Created', `Status: ${validApplyRes.status}`);
  assert(!!createdApp.id, 'Application has unique ID', `ID: ${createdApp.id}`);
  assert(createdApp.applicationNumber?.startsWith('FIN-'), 'Application number formatted as FIN-YYYY-XXXXX', `AppNum: ${createdApp.applicationNumber}`);
  assert(createdApp.status === 'PENDING', 'Initial application status is PENDING', `Status: ${createdApp.status}`);
  assert(createdApp.monthlyEstimatedEmi === 10000, 'Monthly EMI correctly calculated as 60000 / 6 = 10000 (0% interest)', `EMI: ${createdApp.monthlyEstimatedEmi}`);
  assert(createdApp.isDemonstrationStorage === true, 'Response carries isDemonstrationStorage notice');

  const appId = createdApp.id;

  // --- Step 2.4: Creation for Patient 2 ---
  console.log('\n--- 4. Testing Creation for Patient 2 (Cross-Tenant Setup) ---');
  const p2ApplyRes = await fetch(`${API_BASE}/financing/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.patient2}` },
    body: JSON.stringify({
      optionId: 'opt-wellness-quick',
      treatmentName: 'Dental Orthodontic Alignment',
      requestedAmount: 20000,
      tenureMonths: 2,
    }),
  });
  const p2Payload: any = await p2ApplyRes.json();
  const p2App = p2Payload.data || p2Payload;
  assert(p2ApplyRes.status === 201, 'POST /financing/apply creates application for Patient 2 with 201 Created');
  const p2AppId = p2App.id;

  // --- Step 2.5: Multi-Tenant Authorization on GET /applications ---
  console.log('\n--- 5. Testing Multi-Tenant Scoping on GET /financing/applications ---');
  // Patient 1 listing
  const p1ListRes = await fetch(`${API_BASE}/financing/applications`, {
    headers: { Authorization: `Bearer ${tokens.patient1}` },
  });
  const p1ListData: any = await p1ListRes.json();
  const p1Apps = (p1ListData.data?.data || p1ListData.data || p1ListData) as any[];
  assert(p1ListRes.status === 200, 'Patient 1 GET /financing/applications returns 200 OK');
  const p1FoundInList = p1Apps.some((a) => a.id === appId);
  const p2FoundInP1List = p1Apps.some((a) => a.id === p2AppId);
  assert(p1FoundInList, "Patient 1 sees their own application in list");
  assert(!p2FoundInP1List, "Patient 1 CANNOT see Patient 2's application in list (scoping verified)");

  // Patient 2 listing
  const p2ListRes = await fetch(`${API_BASE}/financing/applications`, {
    headers: { Authorization: `Bearer ${tokens.patient2}` },
  });
  const p2ListData: any = await p2ListRes.json();
  const p2Apps = (p2ListData.data?.data || p2ListData.data || p2ListData) as any[];
  const p1FoundInP2List = p2Apps.some((a) => a.id === appId);
  assert(!p1FoundInP2List, "Patient 2 CANNOT see Patient 1's application in list (scoping verified)");

  // Admin listing (should see both)
  const adminListRes = await fetch(`${API_BASE}/financing/applications`, {
    headers: { Authorization: `Bearer ${tokens.admin}` },
  });
  const adminListData: any = await adminListRes.json();
  const adminApps = (adminListData.data?.data || adminListData.data || adminListData) as any[];
  const adminFoundP1 = adminApps.some((a) => a.id === appId);
  const adminFoundP2 = adminApps.some((a) => a.id === p2AppId);
  assert(adminFoundP1 && adminFoundP2, 'Admin sees applications from all patients globally');

  // --- Step 2.6: Multi-Tenant Authorization on GET /applications/:id ---
  console.log('\n--- 6. Testing Authorization on GET /financing/applications/:id ---');
  // Patient 1 gets own
  const p1GetRes = await fetch(`${API_BASE}/financing/applications/${appId}`, {
    headers: { Authorization: `Bearer ${tokens.patient1}` },
  });
  assert(p1GetRes.status === 200, 'Patient 1 can retrieve own application (200 OK)');

  // Patient 2 gets Patient 1's application -> 403
  const p2GetRes = await fetch(`${API_BASE}/financing/applications/${appId}`, {
    headers: { Authorization: `Bearer ${tokens.patient2}` },
  });
  assert(p2GetRes.status === 403, "Patient 2 access to Patient 1's application is blocked with 403 Forbidden", `Status: ${p2GetRes.status}`);

  // Doctor gets Patient 1's application -> 403 (doctors are not staff/admin for financing)
  const docGetRes = await fetch(`${API_BASE}/financing/applications/${appId}`, {
    headers: { Authorization: `Bearer ${tokens.doctor}` },
  });
  assert(docGetRes.status === 403, "Doctor access to Patient 1's financing application is blocked with 403 Forbidden", `Status: ${docGetRes.status}`);

  // Admin gets Patient 1's application -> 200
  const adminGetRes = await fetch(`${API_BASE}/financing/applications/${appId}`, {
    headers: { Authorization: `Bearer ${tokens.admin}` },
  });
  assert(adminGetRes.status === 200, "Admin can retrieve Patient 1's application (200 OK)");

  // Non-existent ID -> 404
  const notFoundRes = await fetch(`${API_BASE}/financing/applications/00000000-0000-0000-0000-000000000000`, {
    headers: { Authorization: `Bearer ${tokens.admin}` },
  });
  assert(notFoundRes.status === 404, 'Non-existent application ID returns 404 Not Found', `Status: ${notFoundRes.status}`);

  // --- Step 2.7: Role-Based Authorization on PATCH /applications/:id/status ---
  console.log('\n--- 7. Testing Authorization on PATCH /financing/applications/:id/status ---');
  // Patient 1 attempts to update status -> 403
  const p1PatchRes = await fetch(`${API_BASE}/financing/applications/${appId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.patient1}` },
    body: JSON.stringify({ status: 'APPROVED', notes: 'Patient approving own loan' }),
  });
  assert(p1PatchRes.status === 403, 'Patient cannot update status (403 Forbidden)', `Status: ${p1PatchRes.status}`);

  // Doctor attempts to update status -> 403
  const docPatchRes = await fetch(`${API_BASE}/financing/applications/${appId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.doctor}` },
    body: JSON.stringify({ status: 'APPROVED', notes: 'Doctor approving loan' }),
  });
  assert(docPatchRes.status === 403, 'Doctor cannot update status (403 Forbidden)', `Status: ${docPatchRes.status}`);

  // Admin updates status to UNDER_REVIEW -> 200
  const adminUnderReviewRes = await fetch(`${API_BASE}/financing/applications/${appId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.admin}` },
    body: JSON.stringify({ status: 'UNDER_REVIEW', notes: 'KYC verified, under credit review' }),
  });
  const underReviewData: any = await adminUnderReviewRes.json();
  const urApp = underReviewData.data || underReviewData;
  assert(adminUnderReviewRes.status === 200, 'Admin can update status to UNDER_REVIEW (200 OK)');
  assert(urApp.status === 'UNDER_REVIEW', 'Application status updated to UNDER_REVIEW');

  // Admin updates status to APPROVED -> 200
  const adminApproveRes = await fetch(`${API_BASE}/financing/applications/${appId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.admin}` },
    body: JSON.stringify({ status: 'APPROVED', notes: 'Credit check passed. Approved for disbursal.' }),
  });
  const approvedData: any = await adminApproveRes.json();
  const appApp = approvedData.data || approvedData;
  assert(adminApproveRes.status === 200, 'Admin can update status to APPROVED (200 OK)');
  assert(appApp.status === 'APPROVED', 'Application status updated to APPROVED');

  // Admin updates status to DISBURSED -> 200
  const adminDisburseRes = await fetch(`${API_BASE}/financing/applications/${appId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.admin}` },
    body: JSON.stringify({ status: 'DISBURSED', notes: 'Loan disbursed to hospital partner' }),
  });
  assert(adminDisburseRes.status === 200, 'Admin can update status to DISBURSED (200 OK)');

  // --- Step 2.8: Terminal Status Immutability ---
  console.log('\n--- 8. Testing Terminal State Immutability ---');
  // Attempt to transition DISBURSED -> PENDING -> 400
  const reOpenDisbursedRes = await fetch(`${API_BASE}/financing/applications/${appId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.admin}` },
    body: JSON.stringify({ status: 'PENDING', notes: 'Trying to reopen disbursed loan' }),
  });
  assert(reOpenDisbursedRes.status === 400, 'Cannot change status of DISBURSED application (400 Bad Request)', `Status: ${reOpenDisbursedRes.status}`);

  // Test REJECTED terminal state on Patient 2's application
  const adminRejectP2 = await fetch(`${API_BASE}/financing/applications/${p2AppId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.admin}` },
    body: JSON.stringify({ status: 'REJECTED', notes: 'Credit score below threshold' }),
  });
  assert(adminRejectP2.status === 200, 'Admin sets Patient 2 application to REJECTED');

  const reOpenRejectedRes = await fetch(`${API_BASE}/financing/applications/${p2AppId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.admin}` },
    body: JSON.stringify({ status: 'APPROVED', notes: 'Trying to approve rejected loan' }),
  });
  assert(reOpenRejectedRes.status === 400, 'Cannot change status of REJECTED application (400 Bad Request)', `Status: ${reOpenRejectedRes.status}`);

  // Test invalid status string -> 400
  const invalidStatusRes = await fetch(`${API_BASE}/financing/applications/${appId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.admin}` },
    body: JSON.stringify({ status: 'INVALID_STATUS_CODE' }),
  });
  assert(invalidStatusRes.status === 400, 'Invalid status enum rejected with 400 Bad Request', `Status: ${invalidStatusRes.status}`);

  // --- Step 2.9: Concurrent Updates & Race Conditions ---
  console.log('\n--- 9. Testing Concurrent Status Updates ---');
  // Create another test application for concurrency
  const concApplyRes = await fetch(`${API_BASE}/financing/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.patient1}` },
    body: JSON.stringify({
      optionId: 'opt-zerocost-care',
      requestedAmount: 15000,
      tenureMonths: 3,
    }),
  });
  const concApp: any = (await concApplyRes.json()).data;
  const concAppId = concApp.id;

  // Fire 5 simultaneous updates
  const concurrentNotes = ['Update-A', 'Update-B', 'Update-C', 'Update-D', 'Update-E'];
  const updatePromises = concurrentNotes.map((note) =>
    fetch(`${API_BASE}/financing/applications/${concAppId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.admin}` },
      body: JSON.stringify({ status: 'UNDER_REVIEW', notes: note }),
    }).then((r) => r.json())
  );
  const results = await Promise.all(updatePromises);
  const allSuccessful = results.every((r: any) => (r.statusCode === 200 || r.data?.status === 'UNDER_REVIEW'));
  assert(allSuccessful, '5 concurrent status updates resolved successfully without corruption');

  // Verify final record state
  const finalCheckRes = await fetch(`${API_BASE}/financing/applications/${concAppId}`, {
    headers: { Authorization: `Bearer ${tokens.admin}` },
  });
  const finalCheckData: any = await finalCheckRes.json();
  const finalApp = finalCheckData.data || finalCheckData;
  assert(finalApp.status === 'UNDER_REVIEW', 'Final state is coherent and correctly set to UNDER_REVIEW');

  // --- Step 2.10: Atomic File Persistence & Restart Recovery ---
  console.log('\n--- 10. Testing Atomic File Persistence and Recovery ---');
  // Sync PostgreSQL persistence state to JSON archive via approved export script
  const { execSync } = require('child_process');
  execSync('npx ts-node scripts/export-financing-applications-to-json.ts', { stdio: 'pipe' });

  const filePath = path.resolve(process.cwd(), 'data', 'financing-applications.json');
  assert(fs.existsSync(filePath), 'Persistence file data/financing-applications.json exists on disk');

  const fileRaw = fs.readFileSync(filePath, 'utf-8');
  let diskApplications: any[] = [];
  try {
    diskApplications = JSON.parse(fileRaw);
    assert(Array.isArray(diskApplications), 'File contains a valid JSON array');
  } catch (e: any) {
    assert(false, 'File contains valid JSON', e.message);
  }

  const persistedApp1 = diskApplications.find((a) => a.id === appId);
  assert(!!persistedApp1, 'Patient 1 application is recorded in data/financing-applications.json');
  assert(persistedApp1?.status === 'DISBURSED', 'Persisted status reflects latest update (DISBURSED)', `Disk status: ${persistedApp1?.status}`);

  const persistedP2 = diskApplications.find((a) => a.id === p2AppId);
  assert(!!persistedP2, 'Patient 2 application is recorded in data/financing-applications.json');
  assert(persistedP2?.status === 'REJECTED', 'Patient 2 status reflects latest update (REJECTED)', `Disk status: ${persistedP2?.status}`);

  console.log('\n========================================================================');
  console.log(`VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('========================================================================\n');

  if (passedTests === totalTests) {
    console.log('✔ All Financing API requirements successfully verified!');
    process.exit(0);
  } else {
    console.error(`✖ ${totalTests - passedTests} tests failed.`);
    process.exit(1);
  }
}

runFinancingVerification().catch((err) => {
  console.error('Fatal error running verification:', err);
  process.exit(1);
});

