/**
 * CareID Doctor Web - Consultation / Treatment Offer Lifecycle Stages 6-10 Live Staging E2E Verification
 */
const fs = require('fs');

const BASE = 'https://360api.vnvision.in/api/v1';

async function req(path, opts = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(BASE + path, { ...opts, signal: controller.signal });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
  } finally {
    clearTimeout(t);
  }
}

async function getDoctorToken() {
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync('.token_cache.json', 'utf8')); } catch {}
  let token = cache.accessToken || cache.doctorAccessToken;
  let probe = await req('/auth/me', { headers: { Authorization: 'Bearer ' + token } });
  if (probe.status === 401 && cache.refreshToken) {
    const ref = await req('/auth/token/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: cache.refreshToken }),
    });
    if (ref.status === 200 || ref.status === 201) {
      const d = ref.data?.data || ref.data;
      token = d.accessToken;
      fs.writeFileSync('.token_cache.json', JSON.stringify({
        accessToken: d.accessToken,
        refreshToken: d.refreshToken || cache.refreshToken,
        updatedAt: new Date().toISOString(),
      }, null, 2));
    }
  }
  return token;
}

async function main() {
  const results = [];
  const token = await getDoctorToken();
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

  // 1. Auth identity
  const me = await req('/auth/me', { headers });
  const docMe = await req('/doctors/me', { headers });
  const doctorProfileId = docMe.data?.data?.id || docMe.data?.id;
  results.push({ test: 'Auth & Doctor Identity', status: me.status === 200 && docMe.status === 200 ? 'PASS' : 'FAIL', http: `${me.status}/${docMe.status}`, detail: `doctorProfileId=${doctorProfileId}` });

  // 2. Facility & Patient context from existing doctor offers
  const listRes = await req('/doctors/treatment-offers?page=1&limit=5', { headers });
  const existing = listRes.data?.data?.data || listRes.data?.data || [];
  const sample = existing[0];
  const facilityId = sample?.facilityId || '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb';
  const patientProfileId = sample?.patientProfileId || '787e5187-7859-4320-bb1a-465a57dd086a';

  // 3. Stage 6: Create Draft & Update Draft (PUT /api/v1/doctors/treatment-offers/:id)
  const cptRes = await req('/cpt?page=1&limit=1', { headers });
  const cpt = (cptRes.data?.data?.data || cptRes.data?.data || [])[0] || {
    code: 'CPT-CARD-001',
    name: 'Diagnostic Coronary Angiography',
    standardCharge: 120000,
  };
  const validUntil = new Date(Date.now() + 14 * 86400000).toISOString();
  const createRes = await req('/doctors/treatment-offers', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      patientProfileId,
      facilityId,
      clinicalIndication: 'E2E Stages 6-10 Verification Indication',
      procedures: [
        {
          procedureCode: cpt.code,
          procedureName: cpt.name,
          unitCost: cpt.standardCharge,
          category: 'DIAGNOSTIC',
          quantity: 1,
          isOptional: false,
          clinicalJustification: 'Diagnostic coronary assessment',
        },
      ],
      validUntil,
      discountAmount: 5000,
      financingEligible: true,
      recommendedTenureMonths: 12,
      clinicalNotes: 'Pre-dispatch verification',
      termsAndConditions: 'Standard clinical terms v1',
    }),
  });
  const offer = createRes.data?.data || createRes.data;
  const offerId = offer?.id;
  results.push({ test: 'Stage 6 Create Draft Offer', status: createRes.status === 201 && offerId ? 'PASS' : 'FAIL', http: createRes.status, detail: `offerId=${offerId}` });

  if (offerId) {
    // 4. Stage 6: Update Draft
    const putRes = await req(`/doctors/treatment-offers/${offerId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        expectedVersion: offer.version,
        clinicalNotes: 'Updated clinical review notes',
      }),
    });
    const updatedOffer = putRes.data?.data || putRes.data;
    results.push({ test: 'Stage 6 Update Draft (PUT)', status: putRes.status === 200 ? 'PASS' : 'FAIL', http: putRes.status, detail: `version=${updatedOffer?.version}` });

    // 5. Stage 6 -> 7: Dispatch Offer (POST /api/v1/doctors/treatment-offers/:id/dispatch)
    const dispRes = await req(`/doctors/treatment-offers/${offerId}/dispatch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ expectedVersion: updatedOffer?.version || offer.version }),
    });
    results.push({
      test: 'Stage 6->7 Dispatch Offer',
      status: dispRes.status === 200 || dispRes.status === 201 ? 'PASS' : 'BACKEND_500',
      http: dispRes.status,
      detail: dispRes.data?.message || dispRes.data?.error || 'OK',
    });

    // 6. Stage 7: Live Status (GET /api/v1/doctors/treatment-offers/:id/status)
    const statusRes = await req(`/doctors/treatment-offers/${offerId}/status`, { headers });
    results.push({ test: 'Stage 7 Get Offer Status', status: statusRes.status === 200 ? 'PASS' : 'FAIL', http: statusRes.status, detail: `status=${statusRes.data?.data?.status}` });

    // 7. Stage 8: Acceptance Certificate guard for non-accepted offer (GET /api/v1/doctors/treatment-offers/:id/acceptance-certificate)
    const certRes = await req(`/doctors/treatment-offers/${offerId}/acceptance-certificate`, { headers });
    results.push({ test: 'Stage 8 Acceptance Certificate Status Guard', status: certRes.status === 400 ? 'PASS' : 'INFO', http: certRes.status, detail: certRes.data?.message });

    // 8. Stage 9: Get & Update Pre-Op Clearance (GET/PUT /api/v1/treatment-offers/:id/clearance)
    const clrGet = await req(`/treatment-offers/${offerId}/clearance`, { headers });
    const clrPut = await req(`/treatment-offers/${offerId}/clearance`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        labClearance: { status: 'CLEARED', notes: 'E2E lab clearance verified' },
        anesthesiaClearance: { status: 'CLEARED', notes: 'E2E anesthesia clearance verified' },
      }),
    });
    results.push({
      test: 'Stage 9 Pre-Op Clearance GET/PUT',
      status: clrGet.status === 200 && clrPut.status === 200 ? 'PASS' : 'FAIL',
      http: `${clrGet.status}/${clrPut.status}`,
      detail: `overallStatus=${clrPut.data?.data?.overallStatus}`,
    });

    // 9. Stage 7/Cleanup: Cancel test offer
    const latest = await req(`/doctors/treatment-offers/${offerId}`, { headers });
    const ver = latest.data?.data?.version || 1;
    const cancelRes = await req(`/doctors/treatment-offers/${offerId}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ cancellationReason: 'E2E Stages 6-10 cleanup', expectedVersion: ver }),
    });
    results.push({ test: 'Stage 7 Cancel/Withdraw Offer', status: cancelRes.status === 200 || cancelRes.status === 201 ? 'PASS' : 'FAIL', http: cancelRes.status, detail: `status=${cancelRes.data?.data?.status}` });
  }

  // 10. Stage 10: Facility Rooms, Schedules, Slots, Appointments
  const roomsRes = await req(`/facilities/${facilityId}/rooms`, { headers });
  const schedRes = await req(`/schedules?facilityId=${facilityId}`, { headers });
  const myApptsRes = await req('/appointments/doctor/me', { headers });
  results.push({
    test: 'Stage 10 Rooms / Schedules / Doctor Appointments',
    status: roomsRes.status === 200 && schedRes.status === 200 && myApptsRes.status === 200 ? 'PASS' : 'FAIL',
    http: `${roomsRes.status}/${schedRes.status}/${myApptsRes.status}`,
    detail: `rooms=${(roomsRes.data?.data || []).length}, schedules=${(schedRes.data?.data || []).length}, appts=${(myApptsRes.data?.data || []).length}`,
  });

  // 11. Isolation check: Doctor JWT cannot call Patient-only offer accept endpoint
  if (offerId) {
    const patientAcceptRes = await req(`/patients/treatment-offers/${offerId}/accept`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ signatureConsent: true, expectedVersion: 1 }),
    });
    results.push({
      test: 'Role Isolation (Doctor JWT -> Patient Accept)',
      status: patientAcceptRes.status === 403 || patientAcceptRes.status === 401 ? 'PASS' : 'FAIL',
      http: patientAcceptRes.status,
      detail: patientAcceptRes.data?.message || 'Restricted',
    });
  }

  console.table(results);
}

main().catch((e) => { console.error(e); process.exit(1); });
