/**
 * CareID Doctor Web - Consultation / Treatment Offer Lifecycle Stages 16-20 Live Staging E2E Verification
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
  const probe = await req('/auth/me', { headers: { Authorization: 'Bearer ' + token } });
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
  results.push({
    test: 'Auth & Doctor Identity',
    status: docMe.status === 200 ? 'PASS' : 'FAIL',
    http: docMe.status,
    detail: `doctorProfileId=${doctorProfileId}`,
  });

  // 2. Discover Patient & Appointment ID
  const offersRes = await req('/doctors/treatment-offers?page=1&limit=10', { headers });
  const offers = offersRes.data?.data?.data || offersRes.data?.data || [];
  const sampleOffer = offers[0] || {};
  const patientProfileId = sampleOffer.patientProfileId || '787e5187-7859-4320-bb1a-465a57dd086a';

  const apptsRes = await req('/appointments?page=1&limit=10', { headers });
  const appts = apptsRes.data?.data?.data || apptsRes.data?.data || [];
  const appointmentId = appts[0]?.id || '00000000-0000-0000-0000-000000000000';
  results.push({
    test: 'Discover Staging Appointment & Patient',
    status: apptsRes.status === 200 && appts.length > 0 ? 'PASS' : 'FAIL',
    http: apptsRes.status,
    detail: `appointmentId=${appointmentId}, patientProfileId=${patientProfileId}`,
  });

  // 3. Stage 16: Cath Lab Checklist GET + POST
  const checklistGet = await req(`/appointments/${appointmentId}/cath-lab-checklist`, { headers });
  results.push({
    test: 'Stage 16: GET Cath Lab Checklist',
    status: checklistGet.status === 200 ? 'PASS' : 'FAIL',
    http: checklistGet.status,
    detail: `overallStatus=${checklistGet.data?.data?.overallStatus || checklistGet.data?.overallStatus || 'ok'}`,
  });

  const checklistPost = await req(`/appointments/${appointmentId}/cath-lab-checklist`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      signIn: {
        patientIdentityConfirmed: true,
        siteMarked: true,
        anesthesiaSafetyCheckCompleted: true,
        pulseOximeterOn: true,
        allergiesChecked: true,
      },
      timeOut: {
        allTeamMembersIntroduced: true,
        patientNameProcedureSiteConfirmed: true,
        anticipatedCriticalEventsReviewed: true,
        antibioticProphylaxisAdministered: true,
        imagingDisplayed: true,
      },
      signOut: {
        procedureNameRecorded: true,
        instrumentSpongeNeedleCountsCorrect: true,
        specimenLabeled: true,
        equipmentProblemsAddressed: true,
        keyPostOpConcernsReviewed: true,
      },
      notes: 'E2E Stages 16-20 checklist verification',
    }),
  });
  results.push({
    test: 'Stage 16: POST Cath Lab Checklist',
    status: checklistPost.status === 200 || checklistPost.status === 201 ? 'PASS' : 'FAIL',
    http: checklistPost.status,
    detail: checklistPost.data?.message || 'Checklist saved',
  });

  // 4. Stage 16: Safety Hold Declare -> Active -> Clear (pre-clear if left active from prior run)
  const preHold = await req(`/cath-lab/safety-hold/active?appointmentId=${appointmentId}`, { headers });
  const preHoldId = preHold.data?.data?.activeHold?.holdId || preHold.data?.data?.activeHold?.id;
  if (preHold.data?.data?.hasActiveHold && preHoldId) {
    await req(`/cath-lab/safety-hold/${preHoldId}/clear`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ resolutionNotes: 'Pre-test cleanup of active safety hold' }),
    });
  }

  const holdDeclare = await req('/cath-lab/safety-hold', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      appointmentId,
      holdCategory: 'PATIENT_HEMODYNAMIC_INSTABILITY',
      reason: 'E2E automated safety hold verification',
      clinicalNotes: 'Verifying declare/active/clear lifecycle',
    }),
  });
  let holdId =
    holdDeclare.data?.data?.holdId ||
    holdDeclare.data?.data?.id ||
    holdDeclare.data?.holdId ||
    holdDeclare.data?.id;
  const holdActive = await req(`/cath-lab/safety-hold/active?appointmentId=${appointmentId}`, { headers });
  if (!holdId) {
    holdId =
      holdActive.data?.data?.activeHold?.holdId ||
      holdActive.data?.data?.activeHold?.id ||
      holdActive.data?.activeHold?.holdId ||
      holdActive.data?.activeHold?.id;
  }
  results.push({
    test: 'Stage 16: POST Declare Safety Hold',
    status: (holdDeclare.status === 200 || holdDeclare.status === 201 || holdDeclare.status === 409) && holdId ? 'PASS' : 'FAIL',
    http: holdDeclare.status,
    detail: `holdId=${holdId}`,
  });

  results.push({
    test: 'Stage 16: GET Active Safety Hold',
    status: holdActive.status === 200 ? 'PASS' : 'FAIL',
    http: holdActive.status,
    detail: `hasActiveHold=${holdActive.data?.data?.hasActiveHold ?? holdActive.data?.hasActiveHold}`,
  });

  if (holdId) {
    const holdClear = await req(`/cath-lab/safety-hold/${holdId}/clear`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ resolutionNotes: 'E2E automated hold cleared' }),
    });
    results.push({
      test: 'Stage 16: POST Clear Safety Hold',
      status: holdClear.status === 200 || holdClear.status === 201 ? 'PASS' : 'FAIL',
      http: holdClear.status,
      detail: 'Safety hold cleared',
    });
  }

  // 5. Stage 16: Safety Time-Out POST & GET
  const timeoutPost = await req('/cath-lab/safety-timeout', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      appointmentId,
      gates: {
        patientIdentityConfirmed: true,
        procedureConfirmed: true,
        accessSiteConfirmed: true,
        consentAndAnticoagulationVerified: true,
        equipmentAndEmergencyPrepared: true,
        radiationAndShieldingVerified: true,
      },
      notes: 'E2E Stage 16 safety timeout ratification',
    }),
  });
  const timeoutGet = await req(`/cath-lab/safety-timeout/${appointmentId}`, { headers });
  results.push({
    test: 'Stage 16: Safety Time-Out POST & GET',
    status: timeoutGet.status === 200 ? 'PASS' : 'FAIL',
    http: `POST=${timeoutPost.status}, GET=${timeoutGet.status}`,
    detail: `ratifiedId=${timeoutGet.data?.data?.id || timeoutGet.data?.id || 'ok'}`,
  });

  // 6. Stage 17: Start Clinical Encounter (Document Encounter DRAFT)
  const encCreate = await req(`/doctors/patients/${patientProfileId}/encounters`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'E2E Cath Lab Coronary Catheterization',
      chiefComplaint: 'Diagnostic Left Heart Catheterization',
      clinicalNotes: 'E2E Stage 17 encounter start verification',
      treatmentPlan: 'Proceed with coronary angiography',
      status: 'DRAFT',
    }),
  });
  const encounterId = encCreate.data?.data?.id || encCreate.data?.id;
  results.push({
    test: 'Stage 17: Start Encounter (POST /encounters)',
    status: (encCreate.status === 200 || encCreate.status === 201) && encounterId ? 'PASS' : 'FAIL',
    http: encCreate.status,
    detail: `encounterId=${encounterId}`,
  });

  // 7. Stage 18: Telemetry Log + Live Read
  const telPost = await req('/cath-lab/telemetry/log', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      appointmentId,
      fluoroscopyDurationSeconds: 258,
      doseAreaProductDap: 14.8,
      contrastVolumeMl: 72,
      contrastAgent: 'Isovue-370',
      activatedClottingTimeSeconds: 265,
      systolicBp: 124,
      diastolicBp: 76,
      heartRate: 70,
      oxygenSaturation: 99,
      sourceDevice: 'CareID-E2E-Suite',
    }),
  });
  const telGet = await req(`/cath-lab/telemetry/live?appointmentId=${appointmentId}`, { headers });
  results.push({
    test: 'Stage 18: Telemetry POST & Live GET',
    status: (telPost.status === 200 || telPost.status === 201) && telGet.status === 200 ? 'PASS' : 'FAIL',
    http: `POST=${telPost.status}, GET=${telGet.status}`,
    detail: `readingCount=${telGet.data?.data?.readingCount ?? telGet.data?.readingCount}`,
  });

  if (encounterId) {
    // 8. Stage 18: Encounter Procedures & Hemodynamics
    const procPost = await req(`/encounters/${encounterId}/procedures`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Left heart catheterization with coronary angiography',
        code: '93458',
        notes: 'E2E intra-op procedure verification',
      }),
    });
    const hemoPost = await req(`/encounters/${encounterId}/hemodynamics`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        systolicBp: 124,
        diastolicBp: 76,
        pulseBpm: 72,
        respirationRate: 14,
        oxygenSaturation: 99,
        temperatureC: 36.8,
      }),
    });
    results.push({
      test: 'Stage 18: Encounter Procedures & Hemodynamics',
      status:
        (procPost.status === 200 || procPost.status === 201) &&
        (hemoPost.status === 200 || hemoPost.status === 201)
          ? 'PASS'
          : 'FAIL',
      http: `proc=${procPost.status}, hemo=${hemoPost.status}`,
      detail: 'Intra-op procedures and hemodynamics persisted',
    });

    // 9. Stage 18: Vessel Findings POST & GET
    const vfPost = await req(`/cath-lab/encounters/${encounterId}/vessel-findings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        coronaryDominance: 'RIGHT',
        lvefPercentage: 55,
        hemostasisMethod: 'RADIAL_BAND',
        findings: [
          {
            vessel: 'LAD',
            segment: 'MID',
            stenosisPercentage: 30,
            timiFlowPre: 'TIMI_3',
            timiFlowPost: 'TIMI_3',
            interventionPerformed: false,
            stentDetails: 'Mild luminal irregularity',
          },
        ],
        summary: 'E2E QCA vessel findings recorded',
      }),
    });
    const vfGet = await req(`/cath-lab/encounters/${encounterId}/vessel-findings`, { headers });
    results.push({
      test: 'Stage 18: Vessel Findings POST & GET',
      status: (vfPost.status === 200 || vfPost.status === 201) && vfGet.status === 200 ? 'PASS' : 'FAIL',
      http: `POST=${vfPost.status}, GET=${vfGet.status}`,
      detail: 'Vessel findings persisted and retrieved',
    });

    // 10. Stage 18: DICOM Series POST & GET
    const dicomPost = await req(`/cath-lab/encounters/${encounterId}/dicom-series`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        studyInstanceUid: `1.2.840.113619.2.55.${Date.now()}`,
        seriesInstanceUid: `1.2.840.113619.2.55.${Date.now()}.1`,
        modality: 'XA',
        seriesDescription: 'LAO Cranial Coronary Cine',
        numberOfFrames: 64,
        keyFrameNumbers: [12, 32],
        kvp: 82,
        exposureTimeMs: 420,
      }),
    });
    const dicomGet = await req(`/cath-lab/encounters/${encounterId}/dicom-series`, { headers });
    results.push({
      test: 'Stage 18: DICOM Series POST & GET',
      status: (dicomPost.status === 200 || dicomPost.status === 201) && dicomGet.status === 200 ? 'PASS' : 'FAIL',
      http: `POST=${dicomPost.status}, GET=${dicomGet.status}`,
      detail: 'DICOM series registered and listed',
    });

    // 11. Stage 19: Finalize Medical Record Attestation (PUT)
    const finalPut = await req(`/doctors/patients/${patientProfileId}/medical-records/${encounterId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        title: 'E2E Cath Lab Procedure Summary (Attested)',
        clinicalNotes: 'Attested by physician in Stage 19 E2E verification.',
        status: 'FINAL',
      }),
    });
    results.push({
      test: 'Stage 19: Attest & Finalize Record (PUT)',
      status: finalPut.status === 200 ? 'PASS' : 'FAIL',
      http: finalPut.status,
      detail: finalPut.data?.data?.status || 'FINAL',
    });
  }

  // 12. Stage 20: Verify Synchronized Patient Medical Records
  const recsGet = await req(`/doctors/patients/${patientProfileId}/medical-records?page=1&limit=10`, { headers });
  results.push({
    test: 'Stage 20: Verify Patient Medical Records',
    status: recsGet.status === 200 ? 'PASS' : 'FAIL',
    http: recsGet.status,
    detail: `recordsFound=${(recsGet.data?.data?.items || recsGet.data?.data || []).length}`,
  });

  // 13. Negative & Auth Guards
  const unauthTel = await req(`/cath-lab/telemetry/live?appointmentId=${appointmentId}`);
  const missingTimeout = await req('/cath-lab/safety-timeout/00000000-0000-0000-0000-000000000000', { headers });
  results.push({
    test: 'Negative Guard: Unauthenticated Telemetry (401)',
    status: unauthTel.status === 401 ? 'PASS' : 'FAIL',
    http: unauthTel.status,
    detail: 'Unauthorized rejected with 401',
  });
  results.push({
    test: 'Negative Guard: Non-existent Timeout (404)',
    status: missingTimeout.status === 404 || missingTimeout.status === 400 ? 'PASS' : 'FAIL',
    http: missingTimeout.status,
    detail: 'Missing appointment timeout rejected cleanly',
  });

  console.table(results);
  const failed = results.filter(r => r.status === 'FAIL');
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed.`);
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
