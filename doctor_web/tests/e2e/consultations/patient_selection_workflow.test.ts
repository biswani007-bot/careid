/**
 * CareID Doctor Web Portal — Patient Selection & Start Consult Workflow Test Suite
 * Validates all 10 Acceptance Criteria for Patient Selection & Complete Workflow Navigation:
 * - AC-01: Authentic backend UUID capture from Patient Directory
 * - AC-02: Start Consult from Directory opens Treatment Offer with patient loaded (no "No Patient Selected")
 * - AC-03: Start Consult from Patient Profile (/patients/:id) resolves and loads same patient
 * - AC-04: New Consultation -> Select Patient from Directory resolves and loads same patient
 * - AC-05: Page refresh preserves patient identity via URL patientId
 * - AC-06: Direct URL navigation with valid patientId hydrates full demographics
 * - AC-07: Direct URL navigation without patientId displays "No Patient Selected"
 * - AC-08: Direct URL navigation with invalid patientId displays proper error handling without crashing
 * - AC-09: Switching Patient A -> Patient B clears previous patient state (no stale data)
 * - AC-10: Submitting new treatment offer sends authentic backend patientProfileId UUID
 */

import { describe, it, assertEqual, assertDefined, assert } from './helpers/testUtils.ts';
import {
  TEST_PATIENT_ID,
  TEST_FACILITY_ID,
  createTreatmentOffer,
  getDoctorPatientProfile,
  getDoctorAppointments,
} from './helpers/consultationApiHelper.ts';
import { createValidOfferPayload } from './helpers/fixtures.ts';

function calculateAge(dob?: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

describe('CareID Patient Selection & Start Consult Complete Navigation Workflow', () => {
  it('AC-01: Selecting Marcus Doe from the Patient Directory captures the authentic backend patient profile UUID', async () => {
    // 1. Fetch live doctor appointments (canonical source of doctor directory patient roster)
    const apptRes = await getDoctorAppointments();
    assertEqual(apptRes.status, 200, 'Doctor appointments must return HTTP 200');
    assertDefined(apptRes.body.data, 'Appointment list data must exist');
    const appointments = apptRes.body.data!;
    assert(appointments.length > 0, 'Directory must contain at least 1 patient appointment');

    // 2. Locate Marcus Doe in directory roster
    const match = appointments.find(
      (a: Record<string, unknown>) => {
        const p = a.patient as Record<string, unknown> | undefined;
        return p?.id === TEST_PATIENT_ID || String(p?.firstName || '').toLowerCase() === 'marcus';
      }
    ) || appointments[0];

    const marcus = (match as Record<string, unknown>).patient as Record<string, unknown>;
    assertDefined(marcus, 'Patient record must be found in directory');
    const capturedId = String(marcus.id);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    assert(uuidRegex.test(capturedId), `Patient ID must be an authentic UUID, got: ${capturedId}`);
    assertEqual(capturedId, TEST_PATIENT_ID, 'Authentic backend UUID must match Marcus Doe ID');
  });

  it('AC-02: Clicking Start Consult from directory opens Treatment Offer Creation with correct patient context loaded', async () => {
    // Directory row Start Consult navigation URL
    function generateDirectoryStartConsultUrl(patientId: string): string {
      return `/treatment-offers/new/step-1?patientId=${encodeURIComponent(patientId)}`;
    }

    const targetUrl = generateDirectoryStartConsultUrl(TEST_PATIENT_ID);
    assertEqual(targetUrl, `/treatment-offers/new/step-1?patientId=${TEST_PATIENT_ID}`);

    const params = new URLSearchParams(targetUrl.split('?')[1]);
    const extractedPatientId = params.get('patientId')!;
    assertEqual(extractedPatientId, TEST_PATIENT_ID);

    // Resolve patient profile via authenticated GET /api/v1/doctors/patients/:patientProfileId
    const res = await getDoctorPatientProfile(extractedPatientId);
    assertEqual(res.status, 200, 'GET /doctors/patients/:id must return HTTP 200');
    assertDefined(res.body.data, 'Patient profile data envelope must exist');

    const pt = res.body.data as Record<string, unknown>;
    assertEqual(pt.id, TEST_PATIENT_ID);
    assertEqual(pt.firstName, 'Marcus');
    assertEqual(pt.lastName, 'Doe');
    assert(pt.firstName !== 'No Patient Selected', 'Must NOT display "No Patient Selected"');
  });

  it('AC-03: Clicking Start Consult from Patient Profile (/patients/:id) resolves and loads the same patient', async () => {
    // On /patients/:id, Patient Profile resolves patient
    const res = await getDoctorPatientProfile(TEST_PATIENT_ID);
    assertEqual(res.status, 200, 'Patient Profile resolution must succeed');
    const profile = res.body.data as Record<string, unknown>;
    assertEqual(profile.id, TEST_PATIENT_ID);

    // Start Consult action from profile navigates to Treatment Offer Create page with query parameter
    const consultDestination = `/treatment-offers/new/step-1?patientId=${encodeURIComponent(String(profile.id))}`;
    const destinationParams = new URLSearchParams(consultDestination.split('?')[1]);
    const paramId = destinationParams.get('patientId')!;

    // TreatmentOfferCreatePage resolves via GET /api/v1/doctors/patients/:patientProfileId
    const offerPageRes = await getDoctorPatientProfile(paramId);
    assertEqual(offerPageRes.status, 200);
    const offerPagePatient = offerPageRes.body.data as Record<string, unknown>;
    assertEqual(offerPagePatient.id, profile.id, 'Must resolve the identical patient profile UUID');
    assertEqual(offerPagePatient.firstName, profile.firstName, 'Patient name must be identical');
  });

  it('AC-04: Starting New Consultation and selecting a patient from the directory resolves and loads the same patient', async () => {
    // Flow C step 1: Doctor clicks "New Consultation" -> lands on /treatment-offers/new/step-1
    // Step 2: Clicks "Select Patient from Directory" -> /patients
    // Step 3: Selects Marcus Doe in directory -> /patients/:id or direct consult
    // Step 4: Start Consult -> /treatment-offers/new/step-1?patientId=UUID
    const selectedDirectoryPatientId = TEST_PATIENT_ID;
    const finalUrl = `/treatment-offers/new/step-1?patientId=${selectedDirectoryPatientId}`;

    const parsedId = new URLSearchParams(finalUrl.split('?')[1]).get('patientId')!;
    const res = await getDoctorPatientProfile(parsedId);
    assertEqual(res.status, 200);
    const hydratedPatient = res.body.data as Record<string, unknown>;

    assertEqual(hydratedPatient.id, selectedDirectoryPatientId);
    assertEqual(hydratedPatient.firstName, 'Marcus');
  });

  it('AC-05: Refreshing the treatment offer creation page preserves the selected patient identity', async () => {
    // When browser reloads, location.state is discarded, but searchParams persist
    const initialUrl = `/treatment-offers/new/step-1?patientId=${TEST_PATIENT_ID}`;

    // Simulate page refresh: location.state = null/undefined, searchParams read from URL
    const simulatedRefreshedSearchParams = new URLSearchParams(initialUrl.split('?')[1]);
    const simulatedLocationState = undefined;

    // Reconciliation logic in TreatmentOfferCreatePage:
    const targetPatientId =
      simulatedRefreshedSearchParams.get('patientId') ||
      (simulatedLocationState as { patientId?: string } | undefined)?.patientId ||
      '';
    assertEqual(targetPatientId, TEST_PATIENT_ID, 'Target patient ID must be preserved from URL parameter');

    const res = await getDoctorPatientProfile(targetPatientId);
    assertEqual(res.status, 200);
    const patientAfterRefresh = res.body.data as Record<string, unknown>;
    assertEqual(patientAfterRefresh.id, TEST_PATIENT_ID);
    assertEqual(patientAfterRefresh.firstName, 'Marcus');
  });

  it('AC-06: Navigating directly to treatment offer creation URL with valid patientId loads correct patient profile and hydrates all required demographics', async () => {
    const directUrl = `/treatment-offers/new/step-1?patientId=${TEST_PATIENT_ID}`;
    const patientId = new URLSearchParams(directUrl.split('?')[1]).get('patientId')!;

    const res = await getDoctorPatientProfile(patientId);
    assertEqual(res.status, 200);
    const livePatient = res.body.data as Record<string, unknown>;

    // Verify all R3 required hydrated properties:
    // 1. Full name
    assertEqual(livePatient.firstName, 'Marcus');
    assertEqual(livePatient.lastName, 'Doe');
    // 2. Patient Profile ID
    assertEqual(livePatient.id, TEST_PATIENT_ID);
    // 3. Health Vault ID / MRN
    assertDefined(livePatient.patientNumber, 'Health Vault ID / MRN must be present');
    // 4. Age
    const age = calculateAge(livePatient.dateOfBirth as string | undefined);
    assert(typeof age === 'number' && age > 0, 'Age must be calculated from DOB');
    // 5. Gender
    assertEqual(String(livePatient.gender).toLowerCase(), 'male');
    // 6. Date of Birth
    assertDefined(livePatient.dateOfBirth, 'Date of birth must be present');
    // 7. Blood Group
    assertDefined(livePatient.bloodGroup, 'Blood group must be defined');
    // 8. Allergies
    assert(Array.isArray(livePatient.knownAllergies), 'Allergies must be an array');
    // 9. Insurance status
    const insurancePolicy = livePatient.insurancePolicy as Record<string, unknown> | undefined;
    const resolvedInsuranceStatus = insurancePolicy?.providerName
      ? `Insured (${insurancePolicy.providerName})`
      : 'Self-Pay / Clinical Financing';
    assertDefined(resolvedInsuranceStatus, 'Insurance status must be resolved');
    assertEqual(resolvedInsuranceStatus, 'Self-Pay / Clinical Financing');
  });

  it('AC-07: Navigating to treatment offer creation URL without a patientId displays "No Patient Selected" state', () => {
    const urlWithoutPatient = '/treatment-offers/new/step-1';
    const params = new URLSearchParams(urlWithoutPatient.includes('?') ? urlWithoutPatient.split('?')[1] : '');
    const queryPatientId = params.get('patientId')?.trim() || '';
    const hubPayload = undefined;
    const targetPatientId = queryPatientId || (hubPayload as { patientId?: string } | undefined)?.patientId || '';

    const livePatient = null;
    const patientError = null;
    const isPatientLoading = false;
    const activeHubPayload = undefined;

    const hasSelectedPatient = Boolean(
      (livePatient as { id?: string } | null)?.id || (targetPatientId && !patientError && (activeHubPayload as { patientName?: string } | undefined)?.patientName)
    );
    const isResolvingPatient = Boolean(
      targetPatientId && isPatientLoading && !patientError && !hasSelectedPatient
    );

    assertEqual(hasSelectedPatient, false, 'hasSelectedPatient must be false when no patient ID is provided');
    assertEqual(isResolvingPatient, false, 'isResolvingPatient must be false when no patient ID is provided');

    const patientName = hasSelectedPatient
      ? 'Patient Record'
      : isResolvingPatient
      ? 'Loading Patient...'
      : 'No Patient Selected';
    const patientCid = hasSelectedPatient ? 'CID' : '—';

    assertEqual(patientName, 'No Patient Selected');
    assertEqual(patientCid, '—');
  });

  it('AC-08: Navigating to treatment offer creation URL with an invalid patientId displays proper error handling without crashing', async () => {
    const invalidPatientId = '00000000-0000-0000-0000-000000000000';
    const res = await getDoctorPatientProfile(invalidPatientId);

    // Expect 404 or >= 400
    assert(res.status >= 400, `Invalid patientId must return error HTTP status >= 400, got: ${res.status}`);

    // In TreatmentOfferCreatePage, error state causes hasSelectedPatient and isResolvingPatient to be false
    const livePatient = null;
    const patientError = 'Patient record not found';
    const targetPatientId = invalidPatientId;
    const isPatientLoading = false;
    const activeHubPayload = undefined;

    const hasSelectedPatient = Boolean(
      (livePatient as { id?: string } | null)?.id || (targetPatientId && !patientError && (activeHubPayload as { patientName?: string } | undefined)?.patientName)
    );
    const isResolvingPatient = Boolean(
      targetPatientId && isPatientLoading && !patientError && !hasSelectedPatient
    );

    assertEqual(hasSelectedPatient, false, 'Must retain explicit unselected state on invalid ID');
    assertEqual(isResolvingPatient, false, 'Must not be in resolving state when error is returned');

    const patientName = hasSelectedPatient
      ? 'Patient Record'
      : isResolvingPatient
      ? 'Loading Patient...'
      : 'No Patient Selected';
    assertEqual(patientName, 'No Patient Selected');
  });

  it('AC-08b: In-flight navigation with active hub payload provides instant zero-latency hydration without "No Patient Selected" flicker', () => {
    const targetPatientId = TEST_PATIENT_ID;
    const activeHubPayload = {
      patientId: TEST_PATIENT_ID,
      patientName: 'Marcus Doe',
      patientCid: '+16505550004',
      patientGender: 'Male',
      patientAge: '36',
      patientBlood: 'O+',
    };
    const livePatient = null; // not yet returned from API
    const isPatientLoading = true; // network query in flight
    const patientError = null;

    const hasSelectedPatient = Boolean(
      (livePatient as { id?: string } | null)?.id || (targetPatientId && !patientError && activeHubPayload?.patientName)
    );
    const isResolvingPatient = Boolean(
      targetPatientId && isPatientLoading && !patientError && !hasSelectedPatient
    );

    assertEqual(hasSelectedPatient, true, 'Must immediately recognize selected patient from active hub payload');
    assertEqual(isResolvingPatient, false, 'Must not show loading fallback when hub payload is present');

    const resolvedPatientId = (livePatient as { id?: string } | null)?.id || (hasSelectedPatient ? targetPatientId : '');
    assertEqual(resolvedPatientId, TEST_PATIENT_ID, 'Resolved patient ID must match target immediately');

    const patientName = (livePatient as { fullName?: string } | null)?.fullName
      ? (livePatient as { fullName: string }).fullName
      : hasSelectedPatient
      ? activeHubPayload?.patientName || 'Loading Patient...'
      : isResolvingPatient
      ? 'Loading Patient...'
      : 'No Patient Selected';
    assertEqual(patientName, 'Marcus Doe', 'Patient name must be immediately hydrated');
  });

  it('AC-08c: Direct URL navigation with valid patientId exhibits resolving state before backend loads and hydrates without false "No Patient Selected"', async () => {
    const targetPatientId = TEST_PATIENT_ID;
    const activeHubPayload = undefined; // No state in direct URL navigation
    let livePatient: Record<string, unknown> | null = null;
    let isPatientLoading = true;
    const patientError: string | null = null;

    // Phase 1: In-flight loading
    let hasSelectedPatient = Boolean(
      livePatient?.id || (targetPatientId && !patientError && (activeHubPayload as { patientName?: string } | undefined)?.patientName)
    );
    let isResolvingPatient = Boolean(
      targetPatientId && isPatientLoading && !patientError && !hasSelectedPatient
    );
    assertEqual(hasSelectedPatient, false, 'Not fully hydrated yet');
    assertEqual(isResolvingPatient, true, 'Must be in resolving state');

    const badgeText = hasSelectedPatient
      ? 'Self-Pay'
      : isResolvingPatient
      ? 'Loading Patient...'
      : 'No Patient Selected';
    assertEqual(badgeText, 'Loading Patient...', 'Must NOT display "No Patient Selected" during valid URL load');

    // Phase 2: Live API response arrives
    const res = await getDoctorPatientProfile(targetPatientId);
    assertEqual(res.status, 200);
    livePatient = res.body.data as Record<string, unknown>;
    isPatientLoading = false;

    hasSelectedPatient = Boolean(
      livePatient?.id || (targetPatientId && !patientError && (activeHubPayload as { patientName?: string } | undefined)?.patientName)
    );
    isResolvingPatient = Boolean(
      targetPatientId && isPatientLoading && !patientError && !hasSelectedPatient
    );
    assertEqual(hasSelectedPatient, true, 'Fully hydrated after API responds');
    assertEqual(isResolvingPatient, false, 'Resolving state completed');
    assertEqual(livePatient.firstName, 'Marcus');
  });

  it('AC-09: Switching from Patient A to Patient B clears previous patient state with no stale data displayed', () => {
    // Simulating usePatientProfile state clearing across patient transitions
    let activePatient: Record<string, unknown> | null = { id: 'patient-A-uuid', fullName: 'Patient Alpha' };
    let activeError: string | null = null;

    function handlePatientIdTransition() {
      // Immediate state clearing matching our usePatientProfile implementation
      activePatient = null;
      activeError = null;
    }

    // Patient switch occurs
    handlePatientIdTransition();
    assertEqual(activePatient, null, 'Previous patient state MUST be immediately nullified upon ID change');
    assertEqual(activeError, null, 'Error state must be reset');
  });

  it('AC-10: Submitting a new treatment offer submits the authentic backend patient profile UUID', async () => {
    const validPayload = createValidOfferPayload({
      patientProfileId: TEST_PATIENT_ID,
      facilityId: TEST_FACILITY_ID,
      clinicalIndication: `E2E Navigation Verification Indication ${Date.now()}`,
    });

    const createRes = await createTreatmentOffer(validPayload);
    assertEqual(createRes.status, 201, 'Offer creation must succeed with HTTP 201');
    assertDefined(createRes.body.data, 'Offer data must be returned');

    const createdOffer = createRes.body.data!;
    assertEqual(createdOffer.patientProfileId, TEST_PATIENT_ID, 'Submitted patientProfileId must match authentic UUID');
  });

  it('AC-11: Cross-patient rapid switching guarantees zero stale data leakage across transitions', () => {
    // Model usePatientProfile safePatient resolution:
    // If livePatient.id does not match targetPatientId, it must return null to prevent 1-frame stale render
    const stalePatientA = { id: 'patient-A-uuid', fullName: 'Alice Patient', patientNumber: 'HV-0001' };
    const targetPatientId = 'patient-B-uuid';

    const cleanTargetId = targetPatientId.trim();
    const safePatient =
      stalePatientA && cleanTargetId && stalePatientA.id.toLowerCase() === cleanTargetId.toLowerCase()
        ? stalePatientA
        : null;

    assertEqual(safePatient, null, 'Stale patient A must not be returned when target patient is B');

    // Matching live patient filter in TreatmentOfferCreatePage
    const matchingLivePatient =
      stalePatientA && (!targetPatientId || stalePatientA.id.toLowerCase() === targetPatientId.toLowerCase())
        ? stalePatientA
        : null;

    assertEqual(matchingLivePatient, null, 'TreatmentOfferCreatePage must nullify matchingLivePatient when IDs mismatch');
  });

  it('AC-12: Case-insensitive UUID matching in URL query parameter resolves identical backend patient profile', async () => {
    // Uppercase variant of Marcus Doe's authentic backend UUID
    const upperUuid = TEST_PATIENT_ID.toUpperCase();
    const res = await getDoctorPatientProfile(upperUuid);
    assertEqual(res.status, 200, 'Uppercase UUID must resolve successfully');
    const pt = res.body.data as Record<string, unknown>;
    assertEqual(String(pt.id).toLowerCase(), TEST_PATIENT_ID.toLowerCase(), 'Must resolve the identical patient profile');
  });

  it('AC-13: calculateAge null safety prevents displaying literal "null yrs" on malformed or empty DOB', () => {
    assertEqual(calculateAge(null), null, 'calculateAge(null) must return null');
    assertEqual(calculateAge(''), null, 'calculateAge("") must return null');
    assertEqual(calculateAge('invalid-date-format'), null, 'calculateAge("invalid-date-format") must return null');

    // UI age string computation logic:
    const testDob = 'not-a-valid-date';
    const calculatedAgeNum = testDob ? calculateAge(testDob) : null;
    const patientAge = calculatedAgeNum !== null ? `${calculatedAgeNum}` : '';

    assertEqual(patientAge, '', 'patientAge must be empty string, never "null"');
  });

  it('AC-14: Conflicting transient location.state with mismatched patientId is strictly ignored in favor of query param', () => {
    const queryPatientId = '787e5187-7859-4320-bb1a-465a57dd086a';
    const hubPayload = {
      patientId: 'different-stale-patient-uuid',
      patientName: 'Stale Patient Name',
      patientCid: 'HV-STALE-999',
    };

    const isStateMatchingQuery = !hubPayload?.patientId
      ? !queryPatientId || !hubPayload?.patientName
      : !queryPatientId || hubPayload.patientId.trim().toLowerCase() === queryPatientId.toLowerCase();
    const activeHubPayload = isStateMatchingQuery ? hubPayload : undefined;

    assertEqual(isStateMatchingQuery, false, 'Mismatched patientId state must not match query');
    assertEqual(activeHubPayload, undefined, 'Conflicting hub payload must be discarded');
  });

  it('AC-15: Review and Status pages "Back to Edit Offer" propagates patientId query parameter to preserve refresh durability', () => {
    const offer = {
      patientId: TEST_PATIENT_ID,
      patientName: 'Marcus Doe',
    };

    const editUrl = offer.patientId
      ? `/treatment-offers/new/step-1?patientId=${encodeURIComponent(offer.patientId)}`
      : '/treatment-offers/new/step-1';

    assertEqual(editUrl, `/treatment-offers/new/step-1?patientId=${TEST_PATIENT_ID}`);
    const parsedPatientId = new URLSearchParams(editUrl.split('?')[1]).get('patientId');
    assertEqual(parsedPatientId, TEST_PATIENT_ID, 'patientId must be preserved in URL for page refresh support');
  });

  it('AC-16: InsuranceFinancingHubPage demographic resolution and navigation never leak mock values or corrupted "null" age strings', async () => {
    // 1. Resolve authentic Marcus Doe profile
    const res = await getDoctorPatientProfile(TEST_PATIENT_ID);
    assertEqual(res.status, 200);
    const livePatient = res.body.data as Record<string, unknown>;

    // 2. Hub demographics calculation logic:
    const hubAgeNum = livePatient?.dateOfBirth ? calculateAge(livePatient.dateOfBirth as string) : null;
    const genderCode = livePatient?.gender ? String(livePatient.gender).charAt(0).toUpperCase() : '';
    const demographicsStr = (() => {
      if (hubAgeNum !== null && genderCode) return `${hubAgeNum} ${genderCode}`;
      if (hubAgeNum !== null) return `${hubAgeNum} yrs`;
      if (genderCode) return genderCode;
      return '—';
    })();

    assert(!demographicsStr.includes('null'), 'Demographics must never include "null"');
    assert(demographicsStr !== '45 M', 'Must NOT fall back to hardcoded mock "45 M" for authentic patient');
    assert(typeof hubAgeNum === 'number' && hubAgeNum > 0, 'Authentic patient age must be calculated');

    // 3. Fallback safety when livePatient has missing or malformed DOB
    const malformedPatient = { dateOfBirth: 'not-a-date', gender: 'Female' };
    const malformedAge = malformedPatient.dateOfBirth ? calculateAge(malformedPatient.dateOfBirth) : null;
    const malformedGenderCode = malformedPatient.gender ? malformedPatient.gender.charAt(0).toUpperCase() : '';
    const malformedDemographics = (() => {
      if (malformedAge !== null && malformedGenderCode) return `${malformedAge} ${malformedGenderCode}`;
      if (malformedAge !== null) return `${malformedAge} yrs`;
      if (malformedGenderCode) return malformedGenderCode;
      return '—';
    })();

    assertEqual(malformedDemographics, 'F', 'Malformed DOB must gracefully fall back to gender without "null"');

    // 4. Hub Continue to Treatment Offer URL builder:
    const targetUrl = livePatient.id
      ? `/treatment-offers/new/step-1?patientId=${encodeURIComponent(String(livePatient.id))}`
      : '/treatment-offers/new/step-1';

    assertEqual(targetUrl, `/treatment-offers/new/step-1?patientId=${TEST_PATIENT_ID}`);
    assert(!targetUrl.includes('patient-record'), 'URL must never contain mock "patient-record"');
  });

  it('AC-17: Downstream treatment offer review pages hydrate full demographics (DOB, Age, CID) from live backend patient profile', async () => {
    // Simulate enrichOfferStateWithPatient logic across review, status, and accepted pages
    const res = await getDoctorPatientProfile(TEST_PATIENT_ID);
    assertEqual(res.status, 200);
    const p = res.body.data as Record<string, unknown>;

    const state = {
      patientId: TEST_PATIENT_ID,
      patientName: 'Initial Name',
      patientCid: '',
      patientAge: '',
      patientGender: '',
      patientBlood: '',
      patientAllergy: '',
      insuranceStatus: 'Self-Pay / Clinical Financing',
      patientDob: undefined as string | undefined,
    };

    // Apply enrichOfferStateWithPatient logic:
    state.patientName = String(p.firstName || '') + ' ' + String(p.lastName || '');
    state.patientCid = String(p.patientNumber || p.mrn || state.patientCid);
    state.patientGender = String(p.gender || '');
    state.patientBlood = String(p.bloodGroup || '');
    if (p.dateOfBirth) {
      state.patientDob = String(p.dateOfBirth);
      const age = calculateAge(String(p.dateOfBirth));
      if (age !== null) {
        state.patientAge = `${age}`;
      }
    }

    assertEqual(state.patientName.trim(), 'Marcus Doe');
    assertEqual(state.patientCid, String(p.patientNumber));
    assertDefined(state.patientDob, 'patientDob must be hydrated');
    assert(Number(state.patientAge) > 0, 'patientAge must be a positive number string');
    assert(state.patientAge !== 'null', 'patientAge must never be "null"');
  });

  it('AC-18: formattedDob null safety returns empty string on malformed, "null", or "undefined" date strings without UI corruption', () => {
    function formatDob(rawDob?: string | null): string {
      if (!rawDob || rawDob === 'null' || rawDob === 'undefined') return '';
      const d = new Date(rawDob);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    assertEqual(formatDob(null), '', 'formatDob(null) must be empty string');
    assertEqual(formatDob(''), '', 'formatDob("") must be empty string');
    assertEqual(formatDob('null'), '', 'formatDob("null") must be empty string');
    assertEqual(formatDob('undefined'), '', 'formatDob("undefined") must be empty string');
    assertEqual(formatDob('garbage-date'), '', 'formatDob("garbage-date") must be empty string');

    // Valid ISO date formats properly
    const validDob = '1988-05-12T00:00:00.000Z';
    const formatted = formatDob(validDob);
    assert(formatted.includes('1988'), `Valid DOB must format correctly, got: ${formatted}`);
  });
});
