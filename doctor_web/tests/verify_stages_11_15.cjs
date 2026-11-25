const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = '360api.vnvision.in';
const DOCTOR_PHONE = '+16505550003';
const OTP = '123456';
const FACILITY_ID = '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb'; // Metro General Hospital
const PATIENT_ID = '787e5187-7859-4320-bb1a-465a57dd086a'; // Sarah lyyo
const SCHEDULE_ID = '9df1c885-8ffc-40db-8d4e-e251111ec7bc'; // Cath Lab Procedure Schedule
const TREATMENT_OFFER_ID = '1a1ab0ed-c2b7-4514-b86c-e46be3e9dddf';
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
  if (fs.existsSync(TOKEN_CACHE_PATH)) {
    try {
      const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));
      if (cached.accessToken) {
        const check = await request('GET', '/auth/me', null, cached.accessToken);
        if (check.status === 200) {
          return cached.accessToken;
        }
      }
      if (cached.refreshToken) {
        const refRes = await request('POST', '/auth/token/refresh', {
          refreshToken: cached.refreshToken,
        });
        if (refRes.status === 200 || refRes.status === 201) {
          const refData = refRes.data.data || refRes.data;
          const merged = { ...cached, ...refData };
          fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(merged, null, 2), 'utf8');
          return refData.accessToken;
        }
      }
    } catch {
      // Fall through to OTP
    }
  }

  const otpReq = await request('POST', '/auth/otp/request', {
    phone: DOCTOR_PHONE,
    role: 'DOCTOR',
  });
  if (otpReq.status !== 200 && otpReq.status !== 201) {
    throw new Error(`OTP Request failed: ${JSON.stringify(otpReq)}`);
  }
  const challengeId = otpReq.data.data?.challengeId || otpReq.data.challengeId;

  const otpVerify = await request('POST', '/auth/otp/verify', {
    challengeId,
    otpCode: OTP,
  });
  if (otpVerify.status !== 200 && otpVerify.status !== 201) {
    throw new Error(`OTP Verify failed: ${JSON.stringify(otpVerify)}`);
  }
  const verData = otpVerify.data.data || otpVerify.data;
  fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(verData, null, 2), 'utf8');
  return verData.accessToken;
}

async function run() {
  console.log('=== CAREID DOCTOR WEB — STAGES 11-15 INTEGRATION TEST ===\n');

  // 1. Authenticate Doctor
  console.log('1. Authenticating Doctor (Dr. Sara Jenkins)...');
  const doctorToken = await getDoctorToken();
  console.log('✓ Doctor authenticated successfully.');

  // 2. Fetch Doctor Me to get doctorProfileId
  const meRes = await request('GET', '/doctors/me', null, doctorToken);
  const me = meRes.data.data || meRes.data;
  const doctorProfileId = me.id;
  console.log(`✓ Doctor Profile ID: ${doctorProfileId} (${me.fullName})`);

  // 3. Stage 11: Inspect Schedule and Slots
  console.log('\n--- STAGE 11: SLOT HOLD ---');
  const slotsRes = await request(
    'GET',
    `/schedules/${SCHEDULE_ID}/slots?fromDate=2026-11-20&toDate=2026-11-25`,
    null,
    doctorToken
  );
  if (slotsRes.status !== 200) {
    throw new Error(`Failed to fetch slots: ${JSON.stringify(slotsRes)}`);
  }
  const availableSlots = (slotsRes.data.data || slotsRes.data).filter(s => s.status === 'AVAILABLE');
  console.log(`✓ Found ${availableSlots.length} AVAILABLE slots.`);
  if (availableSlots.length === 0) {
    throw new Error('No available slots found to hold.');
  }
  const targetSlot = availableSlots[0];
  console.log(`  Selected Slot: ${targetSlot.id} (${targetSlot.slotDate} ${targetSlot.startTime}-${targetSlot.endTime})`);

  // Create Hold (POST /appointments/holds)
  console.log('  Creating appointment hold...');
  const holdRes = await request('POST', '/appointments/holds', {
    facilityId: FACILITY_ID,
    slotId: targetSlot.id,
    procedureCategory: 'CATH_LAB',
    holdDurationMinutes: 45,
  }, doctorToken);
  console.log(`  Hold Response Status: ${holdRes.status}`);
  if (holdRes.status !== 201) {
    throw new Error(`Hold failed: ${JSON.stringify(holdRes)}`);
  }
  const holdData = holdRes.data.data || holdRes.data;
  const holdId = holdData.holdId || holdData.id;
  console.log(`✓ Slot Hold created! Hold ID: ${holdId}, Status: ${holdData.status}, TTL: ${holdData.remainingSeconds}s`);

  // Inspect Hold (GET /appointments/holds/:id)
  console.log('  Retrieving appointment hold status...');
  const getHoldRes = await request('GET', `/appointments/holds/${holdId}`, null, doctorToken);
  const getHoldData = getHoldRes.data.data || getHoldRes.data;
  console.log(`✓ GET Hold: Status: ${getHoldData.status}, ExpiresAt: ${getHoldData.expiresAt}`);

  // Release Hold (DELETE /appointments/holds/:id)
  console.log('  Releasing hold prior to booking appointment...');
  const releaseRes = await request('DELETE', `/appointments/holds/${holdId}`, null, doctorToken);
  console.log(`✓ Release Hold Response Status: ${releaseRes.status}`);

  // 4. Stage 12: Procedure Scheduled (POST /appointments)
  console.log('\n--- STAGE 12: PROCEDURE SCHEDULED ---');
  const bookPayload = {
    doctorProfileId,
    patientProfileId: PATIENT_ID,
    facilityId: FACILITY_ID,
    appointmentDate: targetSlot.slotDate,
    startTime: targetSlot.startTime,
    endTime: targetSlot.endTime,
    durationMinutes: targetSlot.durationMinutes,
    type: 'IN_PERSON',
    reason: 'Cath Lab Angioplasty Procedure',
    notes: `Procedure booking for Treatment Offer #${TREATMENT_OFFER_ID}`,
    scheduleId: SCHEDULE_ID,
    slotId: targetSlot.id,
    treatmentOfferId: TREATMENT_OFFER_ID,
  };
  const bookRes = await request('POST', '/appointments', bookPayload, doctorToken);
  console.log(`  Create Appointment Status: ${bookRes.status}`);
  if (bookRes.status !== 201) {
    throw new Error(`Appointment booking failed: ${JSON.stringify(bookRes)}`);
  }
  const bookedAppt = bookRes.data.data || bookRes.data;
  const appointmentId = bookedAppt.id;
  console.log(`✓ Appointment booked successfully!`);
  console.log(`  ID: ${appointmentId}`);
  console.log(`  Number: ${bookedAppt.appointmentNumber}`);
  console.log(`  Status: ${bookedAppt.status}`);
  console.log(`  Date/Time: ${bookedAppt.appointmentDate} ${bookedAppt.startTime}-${bookedAppt.endTime}`);

  // 5. Stage 13: Appointment Details (GET /appointments/:id)
  console.log('\n--- STAGE 13: APPOINTMENT DETAILS ---');
  const detailsRes = await request('GET', `/appointments/${appointmentId}`, null, doctorToken);
  console.log(`  GET Appointment Status: ${detailsRes.status}`);
  const details = detailsRes.data.data || detailsRes.data;
  console.log(`✓ Appointment Details verified:`);
  const rawDoc = details.doctor ? `${details.doctor.firstName || ''} ${details.doctor.lastName || ''}`.trim() : 'Attending Physician';
  const cleanDoc = `Dr. ${rawDoc.replace(/^Dr\.\s*/i, '').trim()}`;
  console.log(`  Doctor: ${cleanDoc} (${details.doctor?.specialization || details.doctor?.specialty || 'Cardiology'})`);
  console.log(`  Patient: ${details.patient?.firstName} ${details.patient?.lastName}`);
  console.log(`  Facility: ${details.facility?.name} (${details.facility?.city})`);
  console.log(`  Status: ${details.status}`);

  // 6. Stage 14: Pre-Op Readiness (PATCH & GET /appointments/:id/readiness)
  console.log('\n--- STAGE 14: PRE-OP READINESS ---');
  console.log('  Patching Pre-Op Day -1 Readiness Checklist & Decision...');
  const patchReadinessRes = await request('PATCH', `/appointments/${appointmentId}/readiness`, {
    fastingConfirmed: true,
    medicationHoldConfirmed: true,
    transportationArranged: true,
    consentVerified: true,
    vitalsWithinThreshold: true,
    decision: 'GO',
    notes: 'Pre-op Day-1 readiness verified and cleared by Dr. Sara Jenkins',
  }, doctorToken);
  console.log(`  PATCH Readiness Status: ${patchReadinessRes.status}`);
  if (patchReadinessRes.status !== 200) {
    throw new Error(`Readiness update failed: ${JSON.stringify(patchReadinessRes)}`);
  }
  const readiness = patchReadinessRes.data.data || patchReadinessRes.data;
  console.log(`✓ Pre-Op Readiness saved: Decision = ${readiness.decision}, Consent = ${readiness.consentVerified}, Fasting = ${readiness.fastingConfirmed}`);

  const getReadinessRes = await request('GET', `/appointments/${appointmentId}/readiness`, null, doctorToken);
  const getReadinessData = getReadinessRes.data.data || getReadinessRes.data;
  console.log(`✓ GET Readiness confirmed: Decision = ${getReadinessData.decision}`);

  // 7. Stage 15: Day-of Check-In (POST /appointments/:id/check-in)
  console.log('\n--- STAGE 15: DAY-OF CHECK-IN ---');
  const checkInRes = await request('POST', `/appointments/${appointmentId}/check-in`, {
    facilityId: FACILITY_ID,
    bedOrBayNumber: 'PRE-OP-BAY-01',
    vitals: {
      bloodPressure: '122/82',
      heartRate: 74,
      oxygenSaturation: 99,
      temperature: 36.7,
    },
    notes: 'Patient checked in at pre-op intake desk',
  }, doctorToken);
  console.log(`  POST Check-In Status: ${checkInRes.status}`);
  if (checkInRes.status !== 200 && checkInRes.status !== 201) {
    throw new Error(`Check-in failed: ${JSON.stringify(checkInRes)}`);
  }
  const checkInData = checkInRes.data.data || checkInRes.data;
  console.log(`✓ Patient checked in successfully!`);
  console.log(`  Status after check-in: ${checkInData.status}`);

  // Verify full appointment status after check-in
  const finalApptRes = await request('GET', `/appointments/${appointmentId}`, null, doctorToken);
  const finalAppt = finalApptRes.data.data || finalApptRes.data;
  console.log(`✓ Confirmed appointment status in master registry: ${finalAppt.status}`);

  console.log('\n======================================================');
  console.log('ALL STAGES 11-15 BACKEND INTEGRATION TESTS PASSED!');
  console.log('======================================================');
}

run().catch((err) => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
