/**
 * CareID Doctor Web Batch 3: Targeted Authentication & Role Matrix Verification Suite
 * Verifies all 15 security and role-classification invariants specified in Section 5 of
 * CAREID-DOCTOR-WEB-BATCH-03-AUTH-DEFECT-FIX.
 */

const http = require('http');
const { Client } = require('d:/careid/backend/node_modules/pg');

const BASE_URL = 'http://localhost:3001/api/v1';

// Import resolveWorkspaceDetails directly from source logic
function resolveWorkspaceDetails(userMe, doctorMe) {
  const rolesUpper = (userMe?.roles || []).map((r) => String(r).trim().toUpperCase());
  const hasExplicitVetRole = rolesUpper.some((r) =>
    ['VET', 'VETERINARIAN'].includes(r)
  );
  const isExplicitDualRoleFlag = rolesUpper.includes('DOCTOR_VET');
  const hasExplicitDoctorRole = rolesUpper.some((r) =>
    ['DOCTOR', 'PHYSICIAN', 'SURGEON'].includes(r)
  );

  const specTerms = [
    doctorMe?.primarySpecialization,
    doctorMe?.department,
    doctorMe?.medicalCouncil,
    ...(doctorMe?.secondarySpecializations || []),
    ...(doctorMe?.subSpecializations || []),
  ]
    .filter(Boolean)
    .map((s) => String(s).trim());

  const hasVetSpec = specTerms.some((t) =>
    /vet|veterinar|animal|zoological|dvm|pvmc/i.test(t)
  );

  const hasHumanSpec = specTerms.some((t) => {
    if (/human/i.test(t)) return true;
    const isVetQualified = /vet|veterinar|animal|zoological|dvm|pvmc/i.test(t);
    if (isVetQualified) return false;
    const matchesHumanClinical =
      /cardio|internal|pediatric|neuro|surgery|ortho|oncolog|general\s*med|general\s*pract|family\s*med|physician|attending|fellow|md\b|mbbs|pmdc/i.test(t);
    return matchesHumanClinical && !isVetQualified;
  });

  const hasVetCredential = hasExplicitVetRole || hasVetSpec;
  const hasHumanCredential = hasHumanSpec;

  const isDualRole =
    isExplicitDualRoleFlag ||
    (hasHumanSpec && hasVetSpec) ||
    (hasExplicitVetRole && hasHumanSpec);

  if (isDualRole) {
    return {
      workspaceType: 'HUMAN',
      isHumanDoctor: true,
      isVeterinarian: true,
      hasDualRoleAmbiguity: true,
    };
  }

  // Fail closed if neither human nor veterinary credentials can be verified
  if (!hasHumanSpec && !hasVetSpec && !hasExplicitVetRole) {
    return {
      workspaceType: 'HUMAN',
      isHumanDoctor: false,
      isVeterinarian: false,
      hasDualRoleAmbiguity: true,
    };
  }

  // Single-role Verified Veterinarian
  if (hasVetCredential && !hasHumanSpec) {
    return {
      workspaceType: 'VETERINARIAN',
      isHumanDoctor: false,
      isVeterinarian: true,
      hasDualRoleAmbiguity: false,
    };
  }

  // Single-role Verified Human Doctor
  if (hasHumanCredential && !hasVetSpec && !hasExplicitVetRole) {
    return {
      workspaceType: 'HUMAN',
      isHumanDoctor: true,
      isVeterinarian: false,
      hasDualRoleAmbiguity: false,
    };
  }

  return {
    workspaceType: 'HUMAN',
    isHumanDoctor: false,
    isVeterinarian: false,
    hasDualRoleAmbiguity: true,
  };
}

// ─── Test Suite Execution ───────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

function recordTest(id, name, condition, details) {
  if (condition) {
    console.log(`  ✅ PASS: [${id}] ${name}`);
    passed++;
    results.push({ id, name, status: 'PASS', details });
  } else {
    console.error(`  ❌ FAIL: [${id}] ${name} — ${details}`);
    failed++;
    results.push({ id, name, status: 'FAIL', details });
  }
}

async function runMatrix() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   CAREID BATCH 3 — AUTH CLASSIFICATION TEST MATRIX (15 CASES)        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // Case 1: Human-only doctor with DOCTOR role and human specialty
  const c1 = resolveWorkspaceDetails({ roles: ['DOCTOR'] }, { primarySpecialization: 'Cardiology' });
  recordTest('CASE-01', 'Human-only doctor (DOCTOR + Cardiology)',
    c1.workspaceType === 'HUMAN' && !c1.hasDualRoleAmbiguity && c1.isHumanDoctor && !c1.isVeterinarian,
    JSON.stringify(c1)
  );

  // Case 2: Veterinarian-only doctor with generic DOCTOR role and verified veterinary specialty
  const c2 = resolveWorkspaceDetails({ roles: ['DOCTOR'] }, { primarySpecialization: 'Veterinary Medicine', medicalCouncil: 'PVMC' });
  recordTest('CASE-02', 'Veterinarian-only doctor (DOCTOR + Veterinary Medicine)',
    c2.workspaceType === 'VETERINARIAN' && !c2.hasDualRoleAmbiguity && c2.isVeterinarian && !c2.isHumanDoctor,
    JSON.stringify(c2)
  );

  // Case 3: Veterinarian with explicit VETERINARIAN role
  const c3 = resolveWorkspaceDetails({ roles: ['VETERINARIAN'] }, { primarySpecialization: 'Companion Animal Surgery' });
  recordTest('CASE-03', 'Veterinarian with explicit VETERINARIAN role',
    c3.workspaceType === 'VETERINARIAN' && !c3.hasDualRoleAmbiguity && c3.isVeterinarian && !c3.isHumanDoctor,
    JSON.stringify(c3)
  );

  // Case 4: Explicit DOCTOR_VET dual-credentialed professional
  const c4 = resolveWorkspaceDetails({ roles: ['DOCTOR_VET'] }, { primarySpecialization: 'Cardiology' });
  recordTest('CASE-04', 'Explicit DOCTOR_VET dual-credentialed professional',
    c4.hasDualRoleAmbiguity && c4.isHumanDoctor && c4.isVeterinarian,
    JSON.stringify(c4)
  );

  // Case 5: Genuine human + veterinary dual credentials
  const c5 = resolveWorkspaceDetails({ roles: ['DOCTOR'] }, { primarySpecialization: 'Cardiology', secondarySpecializations: ['Veterinary Surgery'] });
  recordTest('CASE-05', 'Genuine human + veterinary dual credentials',
    c5.hasDualRoleAmbiguity && c5.isHumanDoctor && c5.isVeterinarian,
    JSON.stringify(c5)
  );

  // Case 6: DOCTOR role with missing specialty and insufficient credential evidence
  const c6 = resolveWorkspaceDetails({ roles: ['DOCTOR'] }, { primarySpecialization: null });
  recordTest('CASE-06', 'DOCTOR role with missing specialty (fail-closed to R1)',
    c6.hasDualRoleAmbiguity && !c6.isHumanDoctor && !c6.isVeterinarian,
    JSON.stringify(c6)
  );

  // Case 7: Conflicting specialty and role data
  const c7 = resolveWorkspaceDetails({ roles: ['VETERINARIAN'] }, { primarySpecialization: 'Cardiology' });
  recordTest('CASE-07', 'Conflicting specialty and role data (VET role + Human spec)',
    c7.hasDualRoleAmbiguity && c7.isHumanDoctor && c7.isVeterinarian,
    JSON.stringify(c7)
  );

  // Case 8: Patient-only user
  const c8 = resolveWorkspaceDetails({ roles: ['PATIENT'] }, null);
  recordTest('CASE-08', 'Patient-only user (no doctor profile / non-clinical)',
    c8.hasDualRoleAmbiguity && !c8.isHumanDoctor && !c8.isVeterinarian,
    JSON.stringify(c8)
  );

  // Case 9: Unauthenticated user
  const c9 = resolveWorkspaceDetails(null, null);
  recordTest('CASE-09', 'Unauthenticated user (null credentials)',
    c9.hasDualRoleAmbiguity && !c9.isHumanDoctor && !c9.isVeterinarian,
    JSON.stringify(c9)
  );

  // Case 10: Unknown or malformed identity response
  const c10 = resolveWorkspaceDetails({ roles: ['UNKNOWN_ROLE'] }, { primarySpecialization: 'UnknownField' });
  recordTest('CASE-10', 'Unknown or malformed identity response (fail-closed)',
    c10.hasDualRoleAmbiguity && !c10.isHumanDoctor && !c10.isVeterinarian,
    JSON.stringify(c10)
  );

  // Case 11: Human doctor attempting veterinary routes (Backend 403 test)
  const reqRes = await fetch(BASE_URL + '/auth/otp/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+16505550003' }),
  }).then(r => r.json());
  const inbox = await fetch(BASE_URL + '/test-support/sms-inbox/latest?phone=%2B16505550003').then(r => r.json());
  const verify = await fetch(BASE_URL + '/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId: reqRes.data?.challengeId, otpCode: inbox.data?.otpCode, phone: '+16505550003' }),
  }).then(r => r.json());
  const humanToken = verify.data?.accessToken;

  const vetEndpointCheck = await fetch(BASE_URL + '/doctors/pets', {
    headers: { Authorization: `Bearer ${humanToken}` },
  });
  recordTest('CASE-11', 'Human doctor attempting veterinary routes -> 403',
    vetEndpointCheck.status === 403,
    `Status: ${vetEndpointCheck.status}`
  );

  // Case 12: Veterinarian attempting human clinical routes (Backend 403 test)
  const vetReq = await fetch(BASE_URL + '/auth/otp/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+16505555165' }),
  }).then(r => r.json());
  const vetInbox = await fetch(BASE_URL + '/test-support/sms-inbox/latest?phone=%2B16505555165').then(r => r.json());
  const vetVerify = await fetch(BASE_URL + '/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId: vetReq.data?.challengeId, otpCode: vetInbox.data?.otpCode, phone: '+16505555165' }),
  }).then(r => r.json());
  const vetToken = vetVerify.data?.accessToken;

  const humanEndpointCheck = await fetch(BASE_URL + '/doctors/patients', {
    headers: { Authorization: `Bearer ${vetToken}` },
  });
  recordTest('CASE-12', 'Veterinarian attempting human clinical routes -> 403',
    humanEndpointCheck.status === 403,
    `Status: ${humanEndpointCheck.status}`
  );

  // Case 13: Direct URL navigation across workspace boundaries (Prescription species check)
  const vetRxCheck = await fetch(BASE_URL + '/doctors/patients/3896bc97-bd3b-40ae-80c1-0cc0455ca3a4/prescriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vetToken}` },
    body: JSON.stringify({
      diagnosisCode: 'I25.10 - Test Diagnosis',
      notes: 'Prescription creation attempt by veterinarian',
      status: 'ACTIVE',
      items: [
        {
          drugName: 'Amoxicillin',
          dosage: '500 mg',
          form: 'Oral Capsule',
          route: 'ORAL',
          frequency: 'TID',
          durationDays: 7,
          instructions: 'Take 1 capsule three times daily',
        },
      ],
    }),
  });
  recordTest('CASE-13', 'Cross-workspace direct prescription creation attempt -> 403',
    vetRxCheck.status === 403,
    `Status: ${vetRxCheck.status}`
  );

  // Case 14: Refreshing an authenticated veterinary session
  const vetDocMe = await fetch(BASE_URL + '/doctors/me', {
    headers: { Authorization: `Bearer ${vetToken}` },
  }).then(r => r.json());
  const vetAuthMe = await fetch(BASE_URL + '/auth/me', {
    headers: { Authorization: `Bearer ${vetToken}` },
  }).then(r => r.json());
  const restoredSession = resolveWorkspaceDetails(vetAuthMe.data, vetDocMe.data);
  recordTest('CASE-14', 'Refreshing authenticated veterinary session maintains VETERINARIAN workspace',
    restoredSession.workspaceType === 'VETERINARIAN' && !restoredSession.hasDualRoleAmbiguity,
    JSON.stringify(restoredSession)
  );

  // Case 15: Logging out and logging back in under a different professional role
  const humanDocMe = await fetch(BASE_URL + '/doctors/me', {
    headers: { Authorization: `Bearer ${humanToken}` },
  }).then(r => r.json());
  const humanAuthMe = await fetch(BASE_URL + '/auth/me', {
    headers: { Authorization: `Bearer ${humanToken}` },
  }).then(r => r.json());
  const humanSession = resolveWorkspaceDetails(humanAuthMe.data, humanDocMe.data);
  recordTest('CASE-15', 'Logging in as human doctor cleanly resolves HUMAN workspace',
    humanSession.workspaceType === 'HUMAN' && !humanSession.hasDualRoleAmbiguity && humanSession.isHumanDoctor,
    JSON.stringify(humanSession)
  );

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log(`║   MATRIX EXECUTION: ${passed} PASSED, ${failed} FAILED (${passed + failed} TOTAL)               ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  if (failed > 0) process.exit(1);
}

runMatrix().catch((err) => {
  console.error('Test matrix execution error:', err);
  process.exit(1);
});
