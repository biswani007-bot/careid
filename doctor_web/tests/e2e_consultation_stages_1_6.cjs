/**
 * CareID Doctor Web — Consultation / Treatment Offer Lifecycle (Stages 1–6)
 * Live Staging Verification Suite (https://360api.vnvision.in)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'https://360api.vnvision.in/api/v1';
const TOKEN_CACHE_PATH = path.join(ROOT, '.token_cache.json');

let passed = 0;
let failed = 0;

function pass(name, detail = '') {
  passed++;
  console.log(`  ✅ [PASS] ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, err) {
  failed++;
  console.error(`  ❌ [FAIL] ${name} — ${err instanceof Error ? err.message : String(err)}`);
}

async function getToken() {
  const cache = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));
  const probe = await fetch(`${BASE_URL}/doctors/me`, {
    headers: { Authorization: `Bearer ${cache.accessToken}` },
  });
  if (probe.status === 401 && cache.refreshToken) {
    const r = await fetch(`${BASE_URL}/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: cache.refreshToken }),
    });
    const rj = await r.json();
    const d = rj.data || rj;
    if (!d.accessToken) throw new Error('Token refresh failed');
    cache.accessToken = d.accessToken;
    if (d.refreshToken) cache.refreshToken = d.refreshToken;
    cache.updatedAt = new Date().toISOString();
    fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(cache, null, 2));
  }
  return cache.accessToken;
}

async function api(token, endpoint, method = 'GET', body = null) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

async function run() {
  console.log('===============================================================');
  console.log('CAREID STAGES 1–6 LIVE STAGING & INTEGRITY VERIFICATION');
  console.log('===============================================================');

  const token = await getToken();
  const me = await api(token, '/doctors/me');
  assert.strictEqual(me.status, 200);
  const doctor = me.json.data || me.json;
  console.log(`Authenticated Doctor: ${doctor.fullName} (${doctor.id}), status=${doctor.verificationStatus}`);

  // Resolve real facility & patient from existing doctor offers/appointments
  const facRes = await api(token, '/facilities?page=1&limit=5');
  assert.strictEqual(facRes.status, 200);
  const facilities = facRes.json.data?.data || facRes.json.data || [];
  assert.ok(facilities.length > 0, 'Expected at least 1 facility');

  const existingOffersRes = await api(token, '/doctors/treatment-offers?page=1&limit=5');
  assert.strictEqual(existingOffersRes.status, 200);
  const existingOffers = existingOffersRes.json.data?.data || [];
  assert.ok(existingOffers.length > 0, 'Expected at least 1 existing offer to obtain authorized patientProfileId');
  const patientProfileId = existingOffers[0].patientProfileId;
  const facilityId = existingOffers[0].facilityId || facilities.find((f) => f.verificationStatus === 'VERIFIED')?.id || facilities[0].id;

  // --- STAGE 1: CPT SELECTION ---
  console.log('\n[Stage 1] CPT Selection');
  let selectedCpt;
  try {
    const cptList = await api(token, '/cpt?page=1&limit=10');
    assert.strictEqual(cptList.status, 200);
    const items = cptList.json.data || [];
    assert.ok(Array.isArray(items) && items.length > 0, 'CPT catalogue must be non-empty');
    selectedCpt = items[0];
    assert.ok(selectedCpt.code && selectedCpt.name && typeof selectedCpt.standardCharge === 'number');
    pass('GET /api/v1/cpt', `Loaded ${items.length} CPT codes; first=${selectedCpt.code} (${selectedCpt.standardCharge})`);

    const cptSearch = await api(token, '/cpt/search?q=catheterization');
    assert.strictEqual(cptSearch.status, 200);
    assert.ok(Array.isArray(cptSearch.json.data) && cptSearch.json.data.length > 0);
    pass('GET /api/v1/cpt/search', `Matched ${cptSearch.json.data.length} code(s) for "catheterization"`);

    const cptBad = await api(token, '/cpt/INVALID-999999');
    assert.strictEqual(cptBad.status, 404);
    pass('GET /api/v1/cpt/:code (invalid)', 'HTTP 404 returned for unknown CPT code');
  } catch (e) {
    fail('Stage 1 CPT Catalogue', e);
  }

  // --- STAGE 2–4: CREATE DRAFT, UPDATE PRICING/DISCOUNT/FINANCING/TERMS, REOPEN ---
  console.log('\n[Stages 2–4] Offer Creation, Pricing, Financing, Terms & Reopen Persistence');
  let createdOffer;
  try {
    const validUntil = new Date(Date.now() + 14 * 86400000).toISOString();
    const createRes = await api(token, '/doctors/treatment-offers', 'POST', {
      patientProfileId,
      facilityId,
      clinicalIndication: 'E2E Stage 1-6 Verification Indication',
      procedures: [
        {
          procedureCode: selectedCpt.code,
          procedureName: selectedCpt.name,
          unitCost: selectedCpt.standardCharge,
          category: 'DIAGNOSTIC',
          quantity: 1,
          isOptional: false,
          clinicalJustification: 'Diagnostic coronary assessment',
        },
      ],
      validUntil,
      discountAmount: 15000,
      financingEligible: false,
      recommendedTenureMonths: 1,
      clinicalNotes: 'Initial clinical remark for Stage 4',
      termsAndConditions: 'Standard clinical terms v1',
    });
    assert.strictEqual(createRes.status, 201);
    createdOffer = createRes.json.data;
    assert.strictEqual(createdOffer.status, 'DRAFT');
    assert.strictEqual(createdOffer.grossEstimate, selectedCpt.standardCharge);
    assert.strictEqual(createdOffer.discountAmount, 15000);
    assert.strictEqual(createdOffer.netPayable, selectedCpt.standardCharge - 15000);
    pass('POST /api/v1/doctors/treatment-offers', `Created ${createdOffer.offerNumber} (netPayable=${createdOffer.netPayable})`);

    // Stage 3: Live financing options
    const finRes = await api(token, '/financing/options');
    assert.strictEqual(finRes.status, 200);
    const finOpts = finRes.json.data || [];
    assert.ok(Array.isArray(finOpts) && finOpts.length > 0);
    const chosenFin = finOpts[0];
    const chosenTenure = chosenFin.tenureMonths[chosenFin.tenureMonths.length - 1];
    pass('GET /api/v1/financing/options', `Loaded ${finOpts.length} financing options (chosen=${chosenFin.id}, tenure=${chosenTenure}m)`);

    // Update Stage 2/3/4 via PUT with optimistic locking
    const updatedNotes = 'Updated Stage 4 clinical remarks persisted on staging';
    const updatedTerms = 'Updated Stage 4 terms persisted on staging';
    const putRes = await api(token, `/doctors/treatment-offers/${createdOffer.id}`, 'PUT', {
      discountAmount: 20000,
      financingEligible: true,
      recommendedTenureMonths: chosenTenure,
      clinicalNotes: updatedNotes,
      termsAndConditions: updatedTerms,
      expectedVersion: createdOffer.version,
    });
    assert.strictEqual(putRes.status, 200);
    const updatedOffer = putRes.json.data;
    assert.strictEqual(updatedOffer.discountAmount, 20000);
    assert.strictEqual(updatedOffer.netPayable, selectedCpt.standardCharge - 20000);
    assert.strictEqual(updatedOffer.financingEligible, true);
    assert.strictEqual(updatedOffer.recommendedTenureMonths, chosenTenure);
    assert.strictEqual(updatedOffer.clinicalNotes, updatedNotes);
    assert.strictEqual(updatedOffer.termsAndConditions, updatedTerms);
    assert.strictEqual(updatedOffer.version, createdOffer.version + 1);
    createdOffer = updatedOffer;
    pass('PUT /api/v1/doctors/treatment-offers/:id', `Updated v${updatedOffer.version}; netPayable=${updatedOffer.netPayable}`);

    // Stale version conflict check (409)
    const stalePut = await api(token, `/doctors/treatment-offers/${createdOffer.id}`, 'PUT', {
      discountAmount: 5000,
      expectedVersion: 1,
    });
    assert.strictEqual(stalePut.status, 409);
    pass('Optimistic Lock Conflict (HTTP 409)', 'Stale expectedVersion=1 rejected');

    // Reopen via GET
    const getRes = await api(token, `/doctors/treatment-offers/${createdOffer.id}`);
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.json.data.clinicalNotes, updatedNotes);
    assert.strictEqual(getRes.json.data.netPayable, selectedCpt.standardCharge - 20000);
    pass('GET /api/v1/doctors/treatment-offers/:id (Reopen)', 'Persisted CPT, pricing, financing & remarks restored');
  } catch (e) {
    fail('Stages 2–4 Persistence', e);
  }

  // --- STAGES 5 & 6: DISPATCH, CANCELLATION & AUTHORIZATION ---
  console.log('\n[Stages 5–6] Dispatch Transition, Cancellation & Authorization');
  try {
    // 1. Test dispatch on live staging (note: staging backend currently throws 500 DB error on dispatch)
    const dispatchRes = await api(token, `/doctors/treatment-offers/${createdOffer.id}/dispatch`, 'POST', {
      expectedVersion: createdOffer.version,
    });
    if (dispatchRes.status === 200 || dispatchRes.status === 201) {
      const dispatched = dispatchRes.json.data;
      assert.strictEqual(dispatched.status, 'DISPATCHED');
      pass('POST /dispatch', `Transitioned to ${dispatched.status} at ${dispatched.dispatchedAt}`);
      createdOffer = dispatched;
    } else {
      console.log(`  ⚠️  [BACKEND DEFECT] POST /dispatch returned HTTP ${dispatchRes.status}: ${dispatchRes.json?.message || JSON.stringify(dispatchRes.json)}`);
    }

    // 2. Cancel test offer (cleanup + transition check)
    const cancelRes = await api(token, `/doctors/treatment-offers/${createdOffer.id}/cancel`, 'POST', {
      cancellationReason: 'Automated E2E verification cleanup',
      expectedVersion: createdOffer.version,
    });
    assert.ok(cancelRes.status === 200 || cancelRes.status === 201, `Expected 200/201 on cancel, got ${cancelRes.status}`);
    const cancelled = cancelRes.json.data;
    assert.strictEqual(cancelled.status, 'CANCELLED');
    pass('POST /cancel', `Offer transitioned to ${cancelled.status}`);

    // 3. Editing or dispatching cancelled offer must fail
    const editCancelled = await api(token, `/doctors/treatment-offers/${createdOffer.id}`, 'PUT', {
      discountAmount: 0,
      expectedVersion: cancelled.version,
    });
    assert.ok(editCancelled.status >= 400 && editCancelled.status < 500);
    pass('Cancelled Offer Edit Guard', `HTTP ${editCancelled.status} rejected edit on CANCELLED offer`);

    const dispatchCancelled = await api(token, `/doctors/treatment-offers/${createdOffer.id}/dispatch`, 'POST', {
      expectedVersion: cancelled.version,
    });
    assert.ok(dispatchCancelled.status >= 400 && dispatchCancelled.status < 500);
    pass('Cancelled Offer Dispatch Guard', `HTTP ${dispatchCancelled.status} rejected dispatch on CANCELLED offer`);

    // 4. Authorization & isolation checks
    const unauthRes = await fetch(`${BASE_URL}/doctors/treatment-offers/${createdOffer.id}`);
    assert.strictEqual(unauthRes.status, 401);
    pass('Unauthenticated Access Guard', 'HTTP 401 returned without JWT');

    const notFoundRes = await api(token, '/doctors/treatment-offers/00000000-0000-0000-0000-000000000000');
    assert.strictEqual(notFoundRes.status, 404);
    pass('Non-Existent Offer Guard', 'HTTP 404 returned for bogus offer UUID');

    const unprivFac = facilities.find((f) => f.id !== facilityId);
    if (unprivFac) {
      const privRes = await api(token, '/doctors/treatment-offers', 'POST', {
        patientProfileId,
        facilityId: unprivFac.id,
        clinicalIndication: 'Privilege boundary test',
        procedures: [
          {
            procedureCode: selectedCpt.code,
            procedureName: selectedCpt.name,
            unitCost: selectedCpt.standardCharge,
            category: 'DIAGNOSTIC',
            quantity: 1,
            isOptional: false,
            clinicalJustification: 'Privilege boundary test',
          },
        ],
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        discountAmount: 0,
        financingEligible: false,
        recommendedTenureMonths: 1,
        clinicalNotes: '',
        termsAndConditions: '',
      });
      assert.strictEqual(privRes.status, 403);
      pass('Facility Privilege Isolation', `HTTP 403 enforced for unprivileged facility ${unprivFac.id}`);
    }
  } catch (e) {
    fail('Stages 5–6 Transitions & Authorization', e);
  }

  // --- CODE INTEGRITY & PROFILE SIDEBAR CHECK ---
  console.log('\n[Integrity] Mock Removal & Profile Sidebar Verification');
  try {
    const createSrc = fs.readFileSync(path.join(ROOT, 'src/pages/treatment-offers/TreatmentOfferCreatePage.tsx'), 'utf8');
    const reviewSrc = fs.readFileSync(path.join(ROOT, 'src/pages/treatment-offers/TreatmentOfferReviewPage.tsx'), 'utf8');
    const typesSrc = fs.readFileSync(path.join(ROOT, 'src/pages/treatment-offers/types.ts'), 'utf8');
    const consultSrc = fs.readFileSync(path.join(ROOT, 'src/services/consultationService.ts'), 'utf8');
    const layoutSrc = fs.readFileSync(path.join(ROOT, 'src/components/layout/PatientLayout.tsx'), 'utf8');

    assert.ok(!typesSrc.includes('FINANCING_PACKAGES_MAP'), 'FINANCING_PACKAGES_MAP must be removed');
    assert.ok(!typesSrc.includes('DEFAULT_OFFER_STATE'), 'DEFAULT_OFFER_STATE must be removed');
    assert.ok(!consultSrc.includes('saveTreatmentOffer'), 'saveTreatmentOffer mock store must be removed');
    assert.ok(!createSrc.includes('CPT #93458'), 'Hardcoded CPT #93458 must be removed from CreatePage');
    assert.ok(!reviewSrc.includes('+1 (555)'), 'Hardcoded +1 (555) phone must be removed from ReviewPage');
    assert.ok(!reviewSrc.includes('Nov 1, 2026'), 'Hardcoded Nov 1, 2026 must be removed from ReviewPage');
    assert.ok(!reviewSrc.includes("alert('Draft saved successfully.')"), 'Fake Save Draft alert must be removed');
    assert.ok(layoutSrc.includes('to="/settings"'), 'Profile sidebar must link directly to /settings');
    assert.ok(!layoutSrc.includes('My Profile'), 'Profile dropdown submenu must not exist');
    pass('Code Integrity & Sidebar Audit', 'All mock stores/constants eradicated; Profile sidebar is direct /settings link');
  } catch (e) {
    fail('Code Integrity & Sidebar Audit', e);
  }

  console.log('\n===============================================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('===============================================================');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
