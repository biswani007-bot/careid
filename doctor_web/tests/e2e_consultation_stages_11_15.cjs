/**
 * CareID Doctor Web - Consultation / Treatment Offer Lifecycle Stages 11-15 Live Staging E2E Verification
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

  // 1. Auth & Doctor ID
  const docMe = await req('/doctors/me', { headers });
  const doctorProfileId = docMe.data?.data?.id || docMe.data?.id;
  results.push({ test: 'Auth & Doctor Identity', status: docMe.status === 200 ? 'PASS' : 'FAIL', http: docMe.status, detail: `doctorProfileId=${doctorProfileId}` });

  // 2. Get facilityId and patientProfileId
  const offersRes = await req('/doctors/treatment-offers?page=1&limit=5', { headers });
  const sample = (offersRes.data?.data?.data || offersRes.data?.data || [])[0];
  const facilityId = sample?.facilityId || '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb';
  const patientProfileId = sample?.patientProfileId || '787e5187-7859-4320-bb1a-465a57dd086a';

  // 3. Stage 11: Check schedules/slots & holds endpoint
  const scheds = await req(`/schedules?facilityId=${facilityId}`, { headers });
  const schedList = scheds.data?.data || [];
  let holdStatus = 'NO_SLOTS';
  if (Array.isArray(schedList) && schedList[0]?.id) {
    const slots = await req(`/schedules/${schedList[0].id}/slots?fromDate=2026-11-12&toDate=2026-11-26`, { headers });
    holdStatus = `slots=${(slots.data?.data || []).length}`;
  }
  results.push({ test: 'Stage 11 Schedules Probe', status: scheds.status === 200 ? 'PASS' : 'FAIL', http: scheds.status, detail: holdStatus });

  // 4. Stage 12: Book Appointment (POST /api/v1/appointments)
  const futureDate = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];
  const createAppt = await req('/appointments', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      doctorProfileId,
      patientProfileId,
      facilityId,
      appointmentDate: futureDate,
      startTime: '14:00',
      endTime: '15:30',
      durationMinutes: 90,
      type: 'IN_PERSON',
      reason: 'E2E Stages 11-15 Verification Procedure',
      notes: 'Automated E2E verification booking',
    }),
  });
  const appt = createAppt.data?.data || createAppt.data;
  const apptId = appt?.id;
  results.push({
    test: 'Stage 12 Create Appointment (POST)',
    status: (createAppt.status === 201 || createAppt.status === 200) && apptId ? 'PASS' : 'FAIL',
    http: createAppt.status,
    detail: apptId ? `appointmentNumber=${appt.appointmentNumber}` : JSON.stringify(createAppt.data).slice(0, 120),
  });

  if (apptId) {
    // 5. Stage 13: Get Appointment Details (GET /api/v1/appointments/:id)
    const getAppt = await req(`/appointments/${apptId}`, { headers });
    results.push({ test: 'Stage 13 Get Appointment Details', status: getAppt.status === 200 ? 'PASS' : 'FAIL', http: getAppt.status, detail: `status=${getAppt.data?.data?.status}` });

    // 6. Stage 13: Reschedule Appointment (PUT /api/v1/appointments/:id/reschedule)
    const resched = await req(`/appointments/${apptId}/reschedule`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        appointmentDate: futureDate,
        startTime: '15:00',
        endTime: '16:30',
        reason: 'E2E reschedule verification',
      }),
    });
    results.push({
      test: 'Stage 13 Reschedule Appointment (PUT)',
      status: resched.status === 200 ? 'PASS' : 'FAIL',
      http: resched.status,
      detail: resched.data?.data?.startTime || resched.data?.message || '',
    });

    // 7. Stage 14: Pre-Op Day -1 Readiness GET & PATCH
    const rdGet = await req(`/appointments/${apptId}/readiness`, { headers });
    const rdPatch = await req(`/appointments/${apptId}/readiness`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fastingConfirmed: true,
        medicationHoldConfirmed: true,
        transportationArranged: true,
        consentVerified: true,
        vitalsWithinThreshold: true,
        decision: 'GO',
        notes: 'E2E Stage 14 readiness verified',
      }),
    });
    results.push({
      test: 'Stage 14 Pre-Op Readiness GET/PATCH',
      status: rdGet.status === 200 && rdPatch.status === 200 ? 'PASS' : 'FAIL',
      http: `${rdGet.status}/${rdPatch.status}`,
      detail: `decision=${rdPatch.data?.data?.decision}`,
    });

    // 8. Stage 15: Day-of-Procedure Check-In (POST /api/v1/appointments/:id/check-in)
    const chk = await req(`/appointments/${apptId}/check-in`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        bedOrBayNumber: 'PRE-OP-BAY-01',
        vitals: {
          bloodPressure: '122/80',
          heartRate: 72,
          oxygenSaturation: 99,
          temperature: 36.6,
        },
        notes: 'E2E Stage 15 check-in verified',
      }),
    });
    results.push({
      test: 'Stage 15 Day-of Check-In (POST)',
      status: chk.status === 200 || chk.status === 201 ? 'PASS' : 'FAIL',
      http: chk.status,
      detail: chk.data?.data?.status || chk.data?.message || '',
    });

    // 9. Cleanup: Cancel test appointment
    const cancel = await req(`/appointments/${apptId}/cancel`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ cancellationReason: 'E2E Stages 11-15 cleanup' }),
    });
    results.push({
      test: 'Stage 13 Cancel Appointment (Cleanup)',
      status: cancel.status === 200 ? 'PASS' : 'INFO',
      http: cancel.status,
      detail: cancel.data?.data?.status || cancel.data?.message || '',
    });
  }

  console.table(results);
}

main().catch((e) => { console.error(e); process.exit(1); });

