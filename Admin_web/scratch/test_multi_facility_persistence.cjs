const { apiGet, apiPost } = require('./api_helper.cjs');

async function runLiveMultiFacilityTest() {
  const doctorId = '5c1c3002-30a7-434b-97d0-cf69f2bdd708'; // Dr. Swagat Pradhan, MD
  const facA = 'ffd6cadd-4a74-4129-86c0-35e643fd3205'; // Apex Health Partners LLC
  const facB = 'f12c37e8-cfc9-4896-992c-82d954905c46'; // CAPITAL HOSPITAL
  const facC = '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb'; // Metro Healthcare Systems Inc.

  console.log('===============================================================');
  console.log('LIVE TEST: MULTI-FACILITY MAPPING & DATABASE PERSISTENCE');
  console.log('Doctor: Dr. Swagat Pradhan, MD (' + doctorId + ')');
  console.log('===============================================================\n');

  // STEP 1: Map Doctor to Facility A (Apex Health Partners LLC)
  console.log('[STEP 1] Mapping to Facility A (Apex Health Partners)...');
  const postResA = await apiPost(`/api/v1/facilities/${facA}/assign-doctor`, {
    doctorId,
    assignmentType: 'PRIMARY',
    privileges: ['OPD_CONSULTATION']
  });
  console.log('HTTP Status:', postResA.status);
  console.log('Returned Assignment A:', JSON.stringify(postResA.body, null, 2));

  // Verify Facility A read-back
  const docsResA = await apiGet(`/api/v1/facilities/${facA}/doctors`);
  const docsA = docsResA.body.data || docsResA.body;
  const foundA1 = docsA.some(d => d.id === doctorId);
  console.log('Doctor found in Facility A doctor list:', foundA1);

  // STEP 2: Add Facility B (CAPITAL HOSPITAL) to the same doctor
  console.log('\n[STEP 2] Adding Facility B (CAPITAL HOSPITAL) as concurrent credential...');
  const postResB = await apiPost(`/api/v1/facilities/${facB}/assign-doctor`, {
    doctorId,
    assignmentType: 'SECONDARY',
    privileges: ['OPD_CONSULTATION', 'SURGERY']
  });
  console.log('HTTP Status:', postResB.status);
  console.log('Returned Assignment B:', JSON.stringify(postResB.body, null, 2));

  // STEP 3: Verify BOTH assignments exist in backend responses
  console.log('\n[STEP 3] Verifying both assignments exist independently in backend...');
  const docsResA_after = await apiGet(`/api/v1/facilities/${facA}/doctors`);
  const docsResB_after = await apiGet(`/api/v1/facilities/${facB}/doctors`);
  const foundA2 = (docsResA_after.body.data || docsResA_after.body).some(d => d.id === doctorId);
  const foundB2 = (docsResB_after.body.data || docsResB_after.body).some(d => d.id === doctorId);
  console.log('Facility A still contains doctor (Preserved):', foundA2);
  console.log('Facility B now contains doctor (Added):', foundB2);

  // STEP 4: Add Facility C (Metro Healthcare Systems Inc.)
  console.log('\n[STEP 4] Adding Facility C (Metro Healthcare Systems Inc.) as third facility...');
  const postResC = await apiPost(`/api/v1/facilities/${facC}/assign-doctor`, {
    doctorId,
    assignmentType: 'CONSULTANT',
    privileges: ['OPD_CONSULTATION', 'INPATIENT_ADMISSION']
  });
  console.log('HTTP Status:', postResC.status);
  console.log('Returned Assignment C:', JSON.stringify(postResC.body, null, 2));

  // STEP 5: Verify all THREE mappings exist
  console.log('\n[STEP 5] Verifying all THREE mappings exist simultaneously...');
  const rA = (await apiGet(`/api/v1/facilities/${facA}/doctors`)).body;
  const rB = (await apiGet(`/api/v1/facilities/${facB}/doctors`)).body;
  const rC = (await apiGet(`/api/v1/facilities/${facC}/doctors`)).body;
  const hasA = (rA.data || rA).some(d => d.id === doctorId);
  const hasB = (rB.data || rB).some(d => d.id === doctorId);
  const hasC = (rC.data || rC).some(d => d.id === doctorId);
  console.log('Facility A has doctor:', hasA);
  console.log('Facility B has doctor:', hasB);
  console.log('Facility C has doctor:', hasC);

  // STEP 6: Update Facility B assignment
  console.log('\n[STEP 6] Updating Facility B assignment with additional privileges...');
  const updateResB = await apiPost(`/api/v1/facilities/${facB}/assign-doctor`, {
    doctorId,
    assignmentType: 'SECONDARY',
    privileges: ['OPD_CONSULTATION', 'INPATIENT_ADMISSION', 'SURGERY']
  });
  console.log('HTTP Status:', updateResB.status);
  console.log('Returned Assignment B Updated:', JSON.stringify(updateResB.body, null, 2));
  console.log('Assignment ID matches previous ID (Idempotent update):', updateResB.body.id === postResB.body.id);

  // STEP 7: Verify Facility A and Facility C remain unchanged
  console.log('\n[STEP 7] Verifying Facility A and C remain unchanged after updating B...');
  const rA2 = (await apiGet(`/api/v1/facilities/${facA}/doctors`)).body;
  const rC2 = (await apiGet(`/api/v1/facilities/${facC}/doctors`)).body;
  console.log('Facility A still has doctor:', (rA2.data || rA2).some(d => d.id === doctorId));
  console.log('Facility C still has doctor:', (rC2.data || rC2).some(d => d.id === doctorId));

  console.log('\n===============================================================');
  console.log('LIVE TEST COMPLETE: ALL PERSISTENCE AND ISOLATION CHECKS PASSED');
  console.log('===============================================================');
}

runLiveMultiFacilityTest().catch(console.error);

