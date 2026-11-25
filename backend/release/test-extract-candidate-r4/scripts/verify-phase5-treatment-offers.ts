import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../src/database/database.service';

const BASE_URL = 'http://127.0.0.1:3000/api/v1';

// Read JWT secret from .env
const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
const jwtSecretMatch = envContent.match(/JWT_SECRET=([^\r\n]+)/);
const jwtSecret = jwtSecretMatch ? jwtSecretMatch[1].trim() : 'super_secret_hvapi_jwt_key_2026_change_in_production';

function createToken(userId: string, roles: string[]): string {
  return jwt.sign(
    { sub: userId, userId, roles, permissions: [] },
    jwtSecret,
    { expiresIn: '2h' },
  );
}

const userIds = {
  admin: 'eff36819-1c8a-4209-b97c-8746d461215b',
  doctor: 'dbe69fae-cdc9-4069-8a7a-ede8d4040f5e',
  patient1: '04be3d93-a0c5-49e9-93a3-d14cbd80c115',
  patient2: 'db0897ba-3bf8-4b7e-99ee-7028187f54db',
  staff: 'c572282d-8f22-409c-95b5-d9b94b1088f6',
  familyMemberOnly: 'f0000000-0000-0000-0000-000000000001',
};

const tokens = {
  admin: createToken(userIds.admin, ['ADMIN']),
  doctor: createToken(userIds.doctor, ['DOCTOR']),
  patient1: createToken(userIds.patient1, ['PATIENT']),
  patient2: createToken(userIds.patient2, ['PATIENT']),
  staff: createToken(userIds.staff, ['STAFF']),
  familyMember: createToken(userIds.familyMemberOnly, ['FAMILY_MEMBER']),
};

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

async function getPayload(res: any): Promise<any> {
  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}

async function runSuite() {
  console.log('========================================================================');
  console.log('CAREID PHASE 5D: TREATMENT OFFERS CORRECTIVE FIXES VERIFICATION SUITE');
  console.log('========================================================================\n');

  const db = new DatabaseService();
  const createdOfferIds: string[] = [];
  const createdAppIds: string[] = [];
  const createdDocPrivilegeIds: string[] = [];

  try {
    // 1. Identify profiles
    const doctor = await db.doctorProfile.findUnique({
      where: { userId: userIds.doctor },
    });
    if (!doctor) throw new Error('Doctor profile not found');

    const patient1 = await db.patientProfile.findUnique({
      where: { userId: userIds.patient1 },
    });
    if (!patient1) throw new Error('Patient 1 profile not found');

    let patient2 = await db.patientProfile.findUnique({
      where: { userId: userIds.patient2 },
    });
    if (!patient2) {
      patient2 = await db.patientProfile.create({
        data: {
          userId: userIds.patient2,
          firstName: 'Jane',
          lastName: 'Smith',
        },
      });
    }

    // Verify / Ensure Doctor Facility privileges for Facility 1
    let docFacility = await db.doctorFacility.findFirst({
      where: { doctorId: doctor.id, isActive: true },
      include: { facility: true },
    });
    if (!docFacility) {
      const anyFacility = await db.facility.findFirst();
      if (!anyFacility) throw new Error('No facility found');
      docFacility = await db.doctorFacility.create({
        data: {
          doctorId: doctor.id,
          facilityId: anyFacility.id,
          isActive: true,
        },
        include: { facility: true },
      });
      createdDocPrivilegeIds.push(docFacility.id);
    }
    const facilityId = docFacility.facilityId;

    // Secondary / Unaffiliated Facility for Cross-Facility checks
    let otherFacility = await db.facility.findFirst({
      where: { id: { not: facilityId } },
    });
    if (!otherFacility) {
      otherFacility = await db.facility.create({
        data: {
          name: 'Secondary General Hospital',
          facilityCode: `SEC-${Date.now().toString(36)}`,
          registrationNumber: `REG-${Date.now()}`,
          facilityType: 'HOSPITAL',
          streetAddress: '45 Health Ave',
          city: 'Karachi',
          state: 'Sindh',
          phone: '+923001234567',
        },
      });
    }

    // Ensure staff member profile for userIds.staff linked to facilityId
    let staffMember = await db.staffMember.findFirst({
      where: { userId: userIds.staff, isDeleted: false },
    });
    if (!staffMember) {
      staffMember = await db.staffMember.create({
        data: {
          userId: userIds.staff,
          employeeCode: `STF-${Date.now().toString(36).slice(-6)}`,
          fullName: 'Alice Smith, RN',
          phone: '+16505550006',
          staffType: 'CLINICAL',
          designation: 'Registered Nurse',
          primaryFacilityId: facilityId,
          employmentType: 'PERMANENT',
          employmentStatus: 'ACTIVE',
          joiningDate: new Date(),
          noticePeriodDays: 30,
          languagesSpoken: ['English', 'Urdu'],
          verificationStatus: 'VERIFIED',
          isDeleted: false,
        },
      });
    }

    // Ensure doctor privileges for otherFacility as well so doctor can author there
    let docOtherPrivilege = await db.doctorFacility.findFirst({
      where: { doctorId: doctor.id, facilityId: otherFacility.id },
    });
    if (!docOtherPrivilege) {
      docOtherPrivilege = await db.doctorFacility.create({
        data: {
          doctorId: doctor.id,
          facilityId: otherFacility.id,
          isActive: true,
        },
      });
      createdDocPrivilegeIds.push(docOtherPrivilege.id);
    }

    const runTag = `PH5D-${Date.now()}`;

    // --- TEST 1: Doctor Creates Draft Treatment Offer ---
    console.log('\n--- 1. Testing Doctor Creates Treatment Offer Draft ---');
    const createOfferPayload = {
      patientProfileId: patient1.id,
      facilityId,
      clinicalIndication: `Complex Coronary Artery Disease [${runTag}]`,
      procedures: [
        {
          procedureCode: 'PCI-DES-001',
          procedureName: 'Percutaneous Coronary Intervention with Drug-Eluting Stent',
          category: 'SURGICAL',
          quantity: 2,
          unitCost: 125000.0,
          clinicalJustification: 'Severe 90% stenosis in proximal LAD',
        },
        {
          procedureCode: 'CATH-ROOM-001',
          procedureName: 'Cath Lab Room & Fluoroscopy Fee',
          category: 'ROOM_SUITE',
          quantity: 1,
          unitCost: 50000.0,
          clinicalJustification: 'Procedure suite usage',
        },
      ],
      discountAmount: 25000.0,
      financingEligible: true,
      recommendedTenureMonths: 12,
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      clinicalNotes: 'Pre-op echocardiogram shows preserved LVEF 55%.',
      termsAndConditions: 'Standard hospital billing and consent protocols apply.',
    };

    const createRes = await fetch(`${BASE_URL}/doctors/treatment-offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.doctor}` },
      body: JSON.stringify(createOfferPayload),
    });
    assert(createRes.status === 201, 'POST /doctors/treatment-offers returns 201 Created');
    const offer1 = await getPayload(createRes);
    createdOfferIds.push(offer1.id);
    assert(offer1.status === 'DRAFT', 'Created offer is initialized in DRAFT status');
    assert(offer1.grossEstimate === 300000, 'Gross estimate correctly calculated: 2*125000 + 50000 = 300000');
    assert(offer1.netPayable === 275000, 'Net payable correctly calculated: 300000 - 25000 = 275000');
    assert(offer1.version === 1, 'Initial version is 1');

    // --- TEST 2: Doctor Updates Draft with expectedVersion ---
    console.log('\n--- 2. Testing Doctor Updates Draft with Concurrency Control ---');
    const updateRes = await fetch(`${BASE_URL}/doctors/treatment-offers/${offer1.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.doctor}` },
      body: JSON.stringify({
        discountAmount: 30000.0,
        expectedVersion: 1,
      }),
    });
    assert(updateRes.status === 200, 'PUT /doctors/treatment-offers/:id with expectedVersion 1 returns 200 OK');
    const offer1Updated = await getPayload(updateRes);
    assert(offer1Updated.netPayable === 270000, 'Net payable updated to 270000');
    assert(offer1Updated.version === 2, 'Version incremented to 2');

    // Stale version update rejected
    const staleUpdateRes = await fetch(`${BASE_URL}/doctors/treatment-offers/${offer1.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.doctor}` },
      body: JSON.stringify({
        discountAmount: 35000.0,
        expectedVersion: 1, // Stale!
      }),
    });
    assert(staleUpdateRes.status === 409, 'Stale expectedVersion update rejected with 409 Conflict');

    // --- TEST 3: Atomic Offer Numbering & Concurrent Dispatch ---
    console.log('\n--- 3. Testing Atomic Sequence Offer Numbering & Concurrent Dispatch ---');
    // Create 2 additional drafts for concurrent dispatch test
    const createDraft2 = await (await fetch(`${BASE_URL}/doctors/treatment-offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.doctor}` },
      body: JSON.stringify({
        ...createOfferPayload,
        clinicalIndication: `Concurrent Test 2 [${runTag}]`,
      }),
    })).json();
    const offer2 = createDraft2.data || createDraft2;
    createdOfferIds.push(offer2.id);

    const createDraft3 = await (await fetch(`${BASE_URL}/doctors/treatment-offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.doctor}` },
      body: JSON.stringify({
        ...createOfferPayload,
        clinicalIndication: `Concurrent Test 3 [${runTag}]`,
      }),
    })).json();
    const offer3 = createDraft3.data || createDraft3;
    createdOfferIds.push(offer3.id);

    // Dispatch offers concurrently via Promise.all
    console.log('Dispatching 3 treatment offers concurrently...');
    const [dRes1, dRes2, dRes3] = await Promise.all([
      fetch(`${BASE_URL}/doctors/treatment-offers/${offer1.id}/dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.doctor}` },
      }),
      fetch(`${BASE_URL}/doctors/treatment-offers/${offer2.id}/dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.doctor}` },
      }),
      fetch(`${BASE_URL}/doctors/treatment-offers/${offer3.id}/dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.doctor}` },
      }),
    ]);

    assert(dRes1.status === 200, 'Concurrent Dispatch 1 returned 200 OK');
    assert(dRes2.status === 200, 'Concurrent Dispatch 2 returned 200 OK');
    assert(dRes3.status === 200, 'Concurrent Dispatch 3 returned 200 OK');

    const d1 = await getPayload(dRes1);
    const d2 = await getPayload(dRes2);
    const d3 = await getPayload(dRes3);

    const numRegex = /^TO-\d{4}-\d{5}$/;
    assert(numRegex.test(d1.offerNumber), `Offer 1 assigned atomic sequence number: ${d1.offerNumber}`);
    assert(numRegex.test(d2.offerNumber), `Offer 2 assigned atomic sequence number: ${d2.offerNumber}`);
    assert(numRegex.test(d3.offerNumber), `Offer 3 assigned atomic sequence number: ${d3.offerNumber}`);

    const distinctNumbers = new Set([d1.offerNumber, d2.offerNumber, d3.offerNumber]);
    assert(distinctNumbers.size === 3, 'Zero collisions under concurrent dispatch: all 3 offer numbers are distinct');

    // Duplicate dispatch on already dispatched offer rejected
    const dupDispatchRes = await fetch(`${BASE_URL}/doctors/treatment-offers/${offer1.id}/dispatch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.doctor}` },
    });
    assert(dupDispatchRes.status === 409, 'Duplicate dispatch rejected with 409 Conflict');

    // --- TEST 4: Financing Data Integrity (No Fake Pre-Approved Loans) ---
    console.log('\n--- 4. Testing Financing Data Integrity (No Fake Pre-Approved Loans) ---');
    // Ensure no fake 'HealthCredit CareAssistance' offers were created in financing_offers table
    const patientFinOffersRes = await fetch(`${BASE_URL}/financing/offers`, {
      headers: { Authorization: `Bearer ${tokens.patient1}` },
    });
    assert(patientFinOffersRes.status === 200, 'GET /financing/offers returns 200 OK');
    const finOffersList = await getPayload(patientFinOffersRes);
    const hasFakePartner = Array.isArray(finOffersList) && finOffersList.some((f: any) => f.partnerName === 'HealthCredit CareAssistance');
    assert(!hasFakePartner, 'Data integrity verified: No hardcoded fictional financing partner offers generated');

    // --- TEST 5: Facility-Level Staff Authorization ---
    console.log('\n--- 5. Testing Facility-Level Staff Authorization Boundaries ---');
    // Staff user is assigned to facilityId (Metro General Hospital)
    const staffReadOffer1Res = await fetch(`${BASE_URL}/doctors/treatment-offers/${offer1.id}`, {
      headers: { Authorization: `Bearer ${tokens.staff}` },
    });
    assert(staffReadOffer1Res.status === 200, 'Staff user can view offer belonging to their authorized facility (200 OK)');

    // Create an offer at otherFacility (Secondary General Hospital)
    const otherFacilityOfferRes = await fetch(`${BASE_URL}/doctors/treatment-offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.doctor}` },
      body: JSON.stringify({
        ...createOfferPayload,
        facilityId: otherFacility.id,
        clinicalIndication: `Cross-Facility Test Offer [${runTag}]`,
      }),
    });
    const otherFacOffer = await getPayload(otherFacilityOfferRes);
    createdOfferIds.push(otherFacOffer.id);

    // Staff member attempts to access cross-facility offer
    const staffCrossFacilityRes = await fetch(`${BASE_URL}/doctors/treatment-offers/${otherFacOffer.id}`, {
      headers: { Authorization: `Bearer ${tokens.staff}` },
    });
    assert(staffCrossFacilityRes.status === 403, 'Cross-facility access rejected with 403 Forbidden for Staff');

    // Admin has global facility access
    const adminReadCrossFacRes = await fetch(`${BASE_URL}/doctors/treatment-offers/${otherFacOffer.id}`, {
      headers: { Authorization: `Bearer ${tokens.admin}` },
    });
    assert(adminReadCrossFacRes.status === 200, 'Admin has global cross-facility access (200 OK)');

    // --- TEST 6: Family Member Unsupported Direct Access Enforcement ---
    console.log('\n--- 6. Testing Family Member Authorization Enforcement ---');
    const familyMemberAccessRes = await fetch(`${BASE_URL}/patients/treatment-offers`, {
      headers: { Authorization: `Bearer ${tokens.familyMember}` },
    });
    assert(familyMemberAccessRes.status === 403, 'Family member access without direct patient profile explicitly blocked with 403 Forbidden');
    const famError = await familyMemberAccessRes.json();
    assert(
      (famError.message || '').includes('unsupported without an explicit verified dependent context'),
      'Informative error message explaining required patient delegation context returned',
    );

    // --- TEST 7: Patient Views Offer & State Machine Transition ---
    console.log('\n--- 7. Testing Patient Views Offer & State Machine Transition ---');
    const patientViewRes = await fetch(`${BASE_URL}/patients/treatment-offers/${offer1.id}`, {
      headers: { Authorization: `Bearer ${tokens.patient1}` },
    });
    assert(patientViewRes.status === 200, 'GET /patients/treatment-offers/:id returns 200 OK');
    const patientView = await getPayload(patientViewRes);
    assert(patientView.status === 'PATIENT_REVIEWING', 'Status transitioned from DISPATCHED to PATIENT_REVIEWING upon viewing');
    assert(patientView.patientViewedAt !== null, 'patientViewedAt recorded');

    // --- TEST 8: Cross-Patient Isolation ---
    console.log('\n--- 8. Testing Cross-Patient Isolation ---');
    const p2AccessRes = await fetch(`${BASE_URL}/patients/treatment-offers/${offer1.id}`, {
      headers: { Authorization: `Bearer ${tokens.patient2}` },
    });
    assert(p2AccessRes.status === 403, 'Patient 2 cannot access Patient 1 treatment offer (403 Forbidden)');

    // --- TEST 9: Decoupled Financing Identifier & Clinical Ratification ---
    console.log('\n--- 9. Testing Decoupled Financing Identifier & Clinical Ratification ---');
    // Attempting to call financing endpoint with treatment offer ID returns 404 (decoupled domain IDs)
    const finAcceptWrongIdRes = await fetch(`${BASE_URL}/financing/offers/${offer1.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.patient1}` },
      body: JSON.stringify({ signatureConsent: true }),
    });
    assert(finAcceptWrongIdRes.status === 404, 'POST /financing/offers/:id/accept with TreatmentOfferId returns 404 Not Found (decoupled domain)');

    // Patient accepts clinical treatment proposal via clinical route
    const currentStatusRes = await fetch(`${BASE_URL}/doctors/treatment-offers/${offer1.id}/status`, {
      headers: { Authorization: `Bearer ${tokens.patient1}` },
    });
    const currentStatus = await getPayload(currentStatusRes);

    // Stale version ratification rejected
    const staleRatifyRes = await fetch(`${BASE_URL}/patients/treatment-offers/${offer1.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.patient1}` },
      body: JSON.stringify({
        signatureConsent: true,
        patientResponseNotes: 'I consent to the surgery',
        expectedVersion: 1, // Stale! Current is >= 3
      }),
    });
    assert(staleRatifyRes.status === 409, 'Ratification with stale expectedVersion rejected with 409 Conflict');

    // Ratify with correct consent
    const ratifyRes = await fetch(`${BASE_URL}/patients/treatment-offers/${offer1.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.patient1}` },
      body: JSON.stringify({
        signatureConsent: true,
        patientResponseNotes: 'I consent to the recommended PCI procedure.',
        expectedVersion: currentStatus.version,
      }),
    });
    assert(ratifyRes.status === 200, 'POST /patients/treatment-offers/:id/accept returns 200 OK');
    const ratified = await getPayload(ratifyRes);
    assert(ratified.status === 'RATIFIED_ACCEPTED', 'Treatment offer status is RATIFIED_ACCEPTED');
    assert(ratified.patientResponseNotes === 'I consent to the recommended PCI procedure.', 'Informed consent notes recorded');

    // Duplicate acceptance rejected
    const dupAcceptRes = await fetch(`${BASE_URL}/patients/treatment-offers/${offer1.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.patient1}` },
      body: JSON.stringify({ signatureConsent: true }),
    });
    assert(dupAcceptRes.status === 400, 'Duplicate acceptance rejected with 400 Bad Request');

    // --- TEST 10: DECLINED Lifecycle (Offer 2) ---
    console.log('\n--- 10. Testing DECLINED Lifecycle (Offer 2) ---');
    // Open Offer 2 as patient 1
    await fetch(`${BASE_URL}/patients/treatment-offers/${offer2.id}`, {
      headers: { Authorization: `Bearer ${tokens.patient1}` },
    });
    const declineRes = await fetch(`${BASE_URL}/patients/treatment-offers/${offer2.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.patient1}` },
      body: JSON.stringify({ declineReason: 'Seeking second opinion at specialized cardiac center' }),
    });
    assert(declineRes.status === 200, 'POST /patients/treatment-offers/:id/reject returns 200 OK');
    const declined = await getPayload(declineRes);
    assert(declined.status === 'DECLINED', 'Offer 2 transitioned to DECLINED');

    // --- TEST 11: CANCELLED Lifecycle (Offer 3) ---
    console.log('\n--- 11. Testing CANCELLED Lifecycle (Offer 3) ---');
    const cancelRes = await fetch(`${BASE_URL}/doctors/treatment-offers/${offer3.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.doctor}` },
      body: JSON.stringify({ cancellationReason: 'Patient blood work requires clinical reassessment' }),
    });
    assert(cancelRes.status === 200, 'POST /doctors/treatment-offers/:id/cancel returns 200 OK');
    const cancelled = await getPayload(cancelRes);
    assert(cancelled.status === 'CANCELLED', 'Offer 3 transitioned to CANCELLED');

    // --- TEST 12: Independent Financing Application Workflow ---
    console.log('\n--- 12. Testing Independent Financing Application Integration ---');
    const finOptionsJson = await (await fetch(`${BASE_URL}/financing/options`, { headers: { Authorization: `Bearer ${tokens.patient1}` } })).json();
    const finOptions = finOptionsJson.data || finOptionsJson;
    const optionId = finOptions[0]?.id;

    const applyFinRes = await fetch(`${BASE_URL}/financing/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.patient1}` },
      body: JSON.stringify({
        optionId,
        requestedAmount: 150000,
        tenureMonths: finOptions[0].tenureMonths[0],
        monthlyIncome: 85000,
        treatmentName: 'Coronary Angioplasty',
        notes: `Referencing treatment offer ${ratified.offerNumber}`,
      }),
    });
    assert(applyFinRes.status === 201, 'POST /financing/apply returns 201 Created');
    const finApp = await getPayload(applyFinRes);
    createdAppIds.push(finApp.id);
    assert(finApp.status === 'PENDING', 'Financing application initialized to PENDING');

    // Treatment ratification status remains unaffected by financing application
    const checkRatifiedRes = await fetch(`${BASE_URL}/patients/treatment-offers/${offer1.id}`, {
      headers: { Authorization: `Bearer ${tokens.patient1}` },
    });
    const checkRatified = await getPayload(checkRatifiedRes);
    assert(checkRatified.status === 'RATIFIED_ACCEPTED', 'Treatment offer status remains RATIFIED_ACCEPTED independently of financing application');

  } finally {
    // --- GUARANTEED TEST CLEANUP ---
    console.log('\n--- Guaranteed Test Cleanup ---');
    try {
      if (createdOfferIds.length > 0) {
        console.log(`Cleaning up ${createdOfferIds.length} test treatment offers and related child records...`);
        await db.financingOffer.deleteMany({ where: { treatmentOfferId: { in: createdOfferIds } } });
        await db.treatmentOfferProcedure.deleteMany({ where: { treatmentOfferId: { in: createdOfferIds } } });
        await db.treatmentOfferHistory.deleteMany({ where: { treatmentOfferId: { in: createdOfferIds } } });
        await db.treatmentOffer.deleteMany({ where: { id: { in: createdOfferIds } } });
      }

      if (createdAppIds.length > 0) {
        console.log(`Cleaning up ${createdAppIds.length} test financing applications...`);
        // Remove from staging demonstration file if exists
        try {
          const mockFile = path.join(process.cwd(), 'data', 'financing-applications.json');
          if (fs.existsSync(mockFile)) {
            const existing = JSON.parse(fs.readFileSync(mockFile, 'utf-8'));
            const filtered = existing.filter((a: any) => !createdAppIds.includes(a.id));
            fs.writeFileSync(mockFile, JSON.stringify(filtered, null, 2));
          }
        } catch {}
      }

      if (createdDocPrivilegeIds.length > 0) {
        await db.doctorFacility.deleteMany({ where: { id: { in: createdDocPrivilegeIds } } });
      }

      console.log('✔ All test records safely cleaned up from the database.');
    } catch (cleanupErr) {
      console.error('Error during test cleanup:', cleanupErr);
    } finally {
      await db.$disconnect();
    }
  }

  console.log('\n========================================================================');
  console.log(`PHASE 5D VERIFICATION SUMMARY: ${passCount}/${passCount + failCount} TESTS PASSED`);
  if (failCount > 0) {
    console.error(`❌ ${failCount} tests failed!`);
    process.exit(1);
  } else {
    console.log('✔ All Phase 5D Treatment Offers corrective fixes verified successfully!');
  }
}

runSuite().catch((err) => {
  console.error('Fatal suite failure:', err);
  process.exit(1);
});
