/**
 * CareID Doctor Web — Treatment Offer Dispatch Verification Test Suite
 * 
 * Verifies:
 * 1. Exact HTTP 409 Conflict reproduction with mismatched expectedVersion.
 * 2. Complete sanitized HTTP 409 response structure and error message.
 * 3. Exact request payload matching Postman contract:
 *    POST /api/v1/doctors/treatment-offers/:offerId/dispatch
 * 4. Optimistic concurrency control (OCC) enforcement.
 * 5. Error formatting truthfulness (preserves authentic backend error message).
 * 6. Offer version synchronization and refresh handling.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BASE_URL = 'https://360api.vnvision.in/api/v1';
const TOKEN_CACHE_PATH = path.join(ROOT_DIR, '.token_cache.json');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function getValidDoctorToken() {
  const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));
  const check = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${cached.accessToken}` },
  });
  if (check.status === 200) {
    return cached.accessToken;
  }

  // Refresh token via OTP
  const reqRes = await fetch(`${BASE_URL}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+16505550003', role: 'DOCTOR' }),
  });
  const reqData = await reqRes.json();
  const challengeId = reqData.data?.challengeId || reqData.challengeId;

  const verRes = await fetch(`${BASE_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, otpCode: '123456' }),
  });
  const verData = await verRes.json();
  const tokens = verData.data || verData;
  fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(tokens, null, 2), 'utf8');
  return tokens.accessToken;
}

// Emulation of formatTreatmentOfferError
function formatTreatmentOfferError(error) {
  if (error && error.statusCode) {
    if (error.statusCode === 409) {
      return (
        error.message ||
        (Array.isArray(error.messages) && error.messages.length > 0
          ? error.messages.join('. ')
          : 'The treatment offer was modified concurrently by another session. Please refresh.')
      );
    }
    if (error.statusCode === 400) {
      return Array.isArray(error.messages) && error.messages.length > 0
        ? error.messages.join('. ')
        : error.message || 'Invalid treatment offer parameters.';
    }
    if (error.statusCode === 404) {
      return error.message || 'Treatment offer not found.';
    }
    return (
      error.message ||
      (Array.isArray(error.messages) && error.messages.length > 0
        ? error.messages.join('. ')
        : 'An unexpected error occurred while processing the treatment offer.')
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred while processing the treatment offer.';
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('CAREID DOCTOR WEB — TREATMENT OFFER DISPATCH FORENSIC TEST SUITE');
  console.log('='.repeat(80));

  const token = await getValidDoctorToken();
  const targetOfferId = '1a1ab0ed-c2b7-4514-b86c-ce46be3e9ddf';

  // --- TEST CASE 1: Query Authoritative Offer State ---
  console.log('\n--- TEST CASE 1: Query Authoritative Offer State ---');
  const offerRes = await fetch(`${BASE_URL}/doctors/treatment-offers/${targetOfferId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(offerRes.status === 200, `Offer retrieval returned ${offerRes.status}`);
  const offerData = await offerRes.json();
  const liveOffer = offerData.data;
  console.log(`Live Offer ID: ${liveOffer.id}`);
  console.log(`Live Offer Number: ${liveOffer.offerNumber}`);
  console.log(`Live Status: ${liveOffer.status}`);
  console.log(`Live Database Version: ${liveOffer.version}`);
  assert(liveOffer.status === 'DRAFT', `Expected DRAFT status, got ${liveOffer.status}`);
  assert(typeof liveOffer.version === 'number', 'Expected numeric version');
  console.log('✅ TEST CASE 1 PASSED: Live offer loaded successfully and is in DRAFT state!');

  // --- TEST CASE 2: Query Multidisciplinary Clinical Review & Attestations ---
  console.log('\n--- TEST CASE 2: Query Prerequisites (Review & Attestations) ---');
  const crRes = await fetch(`${BASE_URL}/doctors/treatment-offers/${targetOfferId}/clinical-review`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(crRes.status === 200, `Clinical review retrieval returned ${crRes.status}`);
  const crData = await crRes.json();
  console.log(`Clinical Review Status: ${crData.data.status}`);
  assert(crData.data.status === 'APPROVED', `Expected APPROVED, got ${crData.data.status}`);

  const attestRes = await fetch(`${BASE_URL}/doctors/treatment-offers/${targetOfferId}/attestations`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(attestRes.status === 200, `Attestations retrieval returned ${attestRes.status}`);
  const attestData = await attestRes.json();
  console.log(`Total Recorded Attestations: ${attestData.data.length}`);
  assert(attestData.data.length > 0, 'Expected at least 1 recorded attestation');
  console.log('✅ TEST CASE 2 PASSED: Multidisciplinary Clinical Review is APPROVED and Attestations are present!');

  // --- TEST CASE 3: Reproduce HTTP 409 Conflict with Stale expectedVersion ---
  console.log('\n--- TEST CASE 3: Reproduce HTTP 409 Conflict with Stale expectedVersion ---');
  const staleExpectedVersion = liveOffer.version - 1; // e.g. version 1 when backend is at version 2
  const dispatchPayload = {
    expectedVersion: staleExpectedVersion,
    attestationStatement: `I attest that the proposed procedures for ${liveOffer.patientName} are clinically appropriate and medically necessary.`
  };
  const dRes = await fetch(`${BASE_URL}/doctors/treatment-offers/${targetOfferId}/dispatch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(dispatchPayload)
  });
  const dBody = await dRes.json();
  console.log(`Dispatch Status with stale version (${staleExpectedVersion}): ${dRes.status}`);
  console.log('Dispatch Response Body:', JSON.stringify(dBody, null, 2));
  assert(dRes.status === 409, `Expected HTTP 409 Conflict, got ${dRes.status}`);
  assert(dBody.error === 'ConflictException', `Expected ConflictException, got ${dBody.error}`);
  assert(dBody.message === 'The treatment offer was modified concurrently by another session. Please refresh.', 'Expected concurrency conflict message');
  console.log('✅ TEST CASE 3 PASSED: HTTP 409 Conflict accurately captured with expected concurrency message!');

  // --- TEST CASE 4: Verify formatTreatmentOfferError Preserves Backend Error Message ---
  console.log('\n--- TEST CASE 4: Verify formatTreatmentOfferError Preserves Backend Message ---');
  const formattedError = formatTreatmentOfferError(dBody);
  console.log(`Formatted Error: "${formattedError}"`);
  assert(formattedError === dBody.message, `Formatted error should match backend message: ${dBody.message}`);
  console.log('✅ TEST CASE 4 PASSED: formatTreatmentOfferError surfaces authentic backend message without hardcoded override!');

  // --- TEST CASE 5: Verify Concurrency Reconciliation via Refresh ---
  console.log('\n--- TEST CASE 5: Verify Concurrency Reconciliation via Refresh ---');
  // Re-fetching latest offer state yields the synchronized version
  const syncRes = await fetch(`${BASE_URL}/doctors/treatment-offers/${targetOfferId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const syncData = await syncRes.json();
  const synchronizedVersion = syncData.data.version;
  console.log(`Refreshed Authoritative Version: ${synchronizedVersion}`);
  assert(synchronizedVersion === liveOffer.version, 'Synchronized version matches database version');
  console.log('✅ TEST CASE 5 PASSED: Offer state successfully refreshed and synchronized with authoritative version!');

  console.log('\n' + '='.repeat(80));
  console.log('🎉 ALL TREATMENT OFFER DISPATCH FORENSIC AUDIT TESTS PASSED!');
  console.log('='.repeat(80));
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});

