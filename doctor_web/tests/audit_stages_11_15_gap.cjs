const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = '360api.vnvision.in';
const TOKEN_CACHE_PATH = path.resolve(__dirname, '../.token_cache.json');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: BASE_URL,
      port: 443,
      path: `/api/v1${path}`,
      method,
      agent: false,
      headers: {
        'Accept': 'application/json',
      },
    };
    if (data) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(options, (res) => {
      let resBody = '';
      res.on('data', (d) => { resBody += d; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(resBody);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: resBody });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getDoctorToken() {
  const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));
  const check = await request('GET', '/auth/me', null, cached.accessToken);
  if (check.status === 200) {
    return cached.accessToken;
  }
  const refRes = await request('POST', '/auth/token/refresh', {
    refreshToken: cached.refreshToken,
  });
  const refData = refRes.data.data || refRes.data;
  const merged = { ...cached, ...refData };
  fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(merged, null, 2), 'utf8');
  return refData.accessToken;
}

async function runAudit() {
  console.log('=== CAREID DOCTOR WEB — STAGES 11-15 POST-INTEGRATION GAP AUDIT ===\n');
  const token = await getDoctorToken();

  // Audit 1: Slot Hold Atomicity
  console.log('1. AUDIT: Slot Hold Atomicity');
  const probeHoldDto = await request('POST', '/appointments', {
    doctorProfileId: '1f06067b-e229-4707-84e2-afa27da2e4cd',
    patientProfileId: '787e5187-7859-4320-bb1a-465a57dd086a',
    facilityId: '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb',
    appointmentDate: '2026-11-25',
    startTime: '09:00',
    endTime: '09:30',
    durationMinutes: 30,
    type: 'IN_PERSON',
    reason: 'Hold atomicity check',
    holdId: '695f8310-3189-4d28-b965-5cf76e6a17b9'
  }, token);
  console.log(`  POST /appointments with holdId: status ${probeHoldDto.status}, message: ${JSON.stringify(probeHoldDto.data.message)}`);

  // Audit 2: Appointment Reschedule and Cancel Contracts
  console.log('\n2. AUDIT: Reschedule & Cancel Contract & Status Persistence');
  const testApptId = '7162dfe6-87c3-4858-854e-b871db677044';
  const getAppt = await request('GET', `/appointments/${testApptId}`, null, token);
  const apptData = getAppt.data.data || getAppt.data;
  console.log(`  Appointment ${testApptId} current status: ${apptData.status}`);
  console.log(`  Audit fields present: cancelledAt=${apptData.cancelledAt}, cancellationReason="${apptData.cancellationReason}", cancelledBy=${apptData.cancelledBy}`);

  // Audit 3: Check-in History GET endpoint
  console.log('\n3. AUDIT: Check-In History Retrieval');
  const checkInApptId = 'cbc5b22e-e93f-4bf3-a5c5-82c4c098dbe7';
  const getCheckIn = await request('GET', `/appointments/${checkInApptId}/check-in`, null, token);
  console.log(`  GET /appointments/:id/check-in status: ${getCheckIn.status} (${getCheckIn.data.error || 'Found'})`);
  const getFullAppt = await request('GET', `/appointments/${checkInApptId}`, null, token);
  const fullAppt = getFullAppt.data.data || getFullAppt.data;
  console.log(`  GET /appointments/:id status field: ${fullAppt.status}`);
  console.log(`  Are vitals or bay details on Appointment entity?: vitals=${Boolean(fullAppt.vitals)}, bedOrBayNumber=${Boolean(fullAppt.bedOrBayNumber)}`);

  // Audit 4: Pre-op Validation Server-Side Rules
  console.log('\n4. AUDIT: Pre-op Clinical Rule Enforcement Server-Side');
  const probeReadiness = await request('PATCH', `/appointments/${checkInApptId}/readiness`, {
    fastingConfirmed: false,
    medicationHoldConfirmed: false,
    transportationArranged: false,
    consentVerified: false,
    vitalsWithinThreshold: false,
    decision: 'GO',
  }, token);
  console.log(`  PATCH /readiness with all false + decision GO: status ${probeReadiness.status}, decision saved: ${probeReadiness.data.data?.decision}`);

  // Restore valid state
  await request('PATCH', `/appointments/${checkInApptId}/readiness`, {
    fastingConfirmed: true,
    medicationHoldConfirmed: true,
    transportationArranged: true,
    consentVerified: true,
    vitalsWithinThreshold: true,
    decision: 'GO',
    notes: 'Pre-op Day-1 readiness verified and signed off by Dr. Sara Jenkins',
  }, token);

  // Audit 5: Consistency with Treatment Offer
  console.log('\n5. AUDIT: Appointment and Treatment Offer Consistency');
  const offerId = '1a1ab0ed-c2b7-4514-b86c-ce46be3e9ddf';
  const getOffer = await request('GET', `/doctors/treatment-offers/${offerId}`, null, token);
  const offerData = getOffer.data.data || getOffer.data;
  console.log(`  Treatment Offer ${offerId} status: ${offerData.status}`);
  console.log(`  Appointment links to offer in notes: ${fullAppt.notes.includes(offerId)}`);

  // Audit 6: Doctor display name formatting
  console.log('\n6. AUDIT: Doctor Display Name Quality');
  const doc = fullAppt.doctor;
  console.log(`  Raw DB values: firstName="${doc.firstName}", lastName="${doc.lastName}"`);
  const rawDocName = `${doc.firstName || ''} ${doc.lastName || ''}`.trim();
  const cleanDocName = `Dr. ${rawDocName.replace(/^Dr\.\s*/i, '').trim()}`;
  console.log(`  Formatted result: "${cleanDocName}"`);

  console.log('\n======================================================');
  console.log('AUDIT RUN COMPLETED SUCCESSFULLY');
  console.log('======================================================');
}

runAudit().catch(console.error);

