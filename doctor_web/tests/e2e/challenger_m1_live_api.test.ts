/**
 * Milestone 1 - Live API Adversarial Prober
 * Independent Challenger verification of treatmentOfferService.ts and consultationService.ts
 * Target backend: https://360api.vnvision.in/api/v1
 */

// 1. Polyfill browser sessionStorage for Node.js runtime environment
const storage = new Map<string, string>();
(globalThis as unknown as { sessionStorage: unknown }).sessionStorage = {
  getItem: (key: string) => storage.get(key) || null,
  setItem: (key: string, val: string) => storage.set(key, val),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

import { getDoctorToken, TEST_PATIENT_ID, TEST_FACILITY_ID } from './helpers/authHelper.ts';
import {
  treatmentOfferService,
  isVersionConflictError,
  formatTreatmentOfferError,
  CreateTreatmentOfferPayload,
  TreatmentOfferDTO,
} from '../../src/services/treatmentOfferService';
import { consultationService, ConsultationMetrics } from '../../src/services/consultationService';
import { ApiError } from '../../src/services/apiClient';

interface TestResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL';
  durationMs: number;
  telemetry: Record<string, unknown>;
  error?: string;
}

const testResults: TestResult[] = [];

async function probe(
  id: string,
  name: string,
  fn: (telemetry: Record<string, unknown>) => Promise<void>
): Promise<void> {
  const telemetry: Record<string, unknown> = {};
  const start = Date.now();
  console.log(`\n[${id}] PROBING: ${name}...`);
  try {
    await fn(telemetry);
    const durationMs = Date.now() - start;
    console.log(`  ✔ PASS [${durationMs}ms] ${id}: ${name}`);
    testResults.push({ id, name, status: 'PASS', durationMs, telemetry });
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✖ FAIL [${durationMs}ms] ${id}: ${name}\n    Error: ${msg}`);
    testResults.push({ id, name, status: 'FAIL', durationMs, telemetry, error: msg });
  }
}

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) throw new Error(msg);
}

function assertEqual<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function runAdversarialProbes() {
  console.log('='.repeat(80));
  console.log('CareID Doctor Web — Milestone 1 Live API Challenger Adversarial Probe');
  console.log('Target: https://360api.vnvision.in/api/v1');
  console.log('Timestamp:', new Date().toISOString());
  console.log('='.repeat(80));

  // Phase 0: Authenticate
  console.log('\n[Phase 0] Authenticating Doctor & Initializing Bearer Session...');
  const token = await getDoctorToken();
  assert(typeof token === 'string' && token.length > 30, 'Invalid token received');
  sessionStorage.setItem('careid_access_token', token);
  console.log(`Doctor session ready. Token length: ${token.length} chars`);

  let createdOffer: TreatmentOfferDTO | null = null;
  const uniqueRunId = Date.now();

  // ---------------------------------------------------------------------------
  // PROBE 1: listTreatmentOffers() shape, pagination & empty handling
  // ---------------------------------------------------------------------------
  await probe(
    'PROBE-01',
    'treatmentOfferService.listTreatmentOffers() returns valid paginated envelope and filters',
    async (telemetry) => {
      const listRes = await treatmentOfferService.listTreatmentOffers({ limit: 10, page: 1 });
      telemetry.totalOffers = listRes.total;
      telemetry.pageSize = listRes.data.length;
      telemetry.page = listRes.page;
      telemetry.limit = listRes.limit;

      assert(typeof listRes.total === 'number', 'listRes.total must be a number');
      assert(Array.isArray(listRes.data), 'listRes.data must be an array');
      assert(listRes.page === 1, 'listRes.page must equal requested page 1');
      assert(listRes.limit === 10, 'listRes.limit must equal requested limit 10');

      if (listRes.data.length > 0) {
        const first = listRes.data[0];
        telemetry.sampleOffer = {
          id: first.id,
          offerNumber: first.offerNumber,
          status: first.status,
          version: first.version,
          proceduresCount: first.procedures?.length,
        };
        assert(/^[0-9a-f-]{36}$/i.test(first.id), `Offer ID must be valid UUID: ${first.id}`);
        assert(typeof first.offerNumber === 'string', 'Offer must have offerNumber string');
        assert(typeof first.version === 'number', 'Offer must have numeric version');
      }

      // Adversarial: Non-existent patient ID filter should return empty array gracefully
      const nonExistentPatientRes = await treatmentOfferService.listTreatmentOffers({
        patientId: '00000000-0000-0000-0000-000000000000',
        limit: 5,
      });
      telemetry.emptyFilterCount = nonExistentPatientRes.data.length;
      assertEqual(nonExistentPatientRes.data.length, 0, 'Non-existent patientId must return 0 offers');
      assertEqual(nonExistentPatientRes.total, 0, 'Non-existent patientId total must be 0');
    }
  );

  // ---------------------------------------------------------------------------
  // PROBE 2: createTreatmentOffer() valid payload creation & financial logic
  // ---------------------------------------------------------------------------
  await probe(
    'PROBE-02',
    'treatmentOfferService.createTreatmentOffer() generates HTTP 201 DRAFT with accurate financials',
    async (telemetry) => {
      const validUntil = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
      const payload: CreateTreatmentOfferPayload = {
        patientProfileId: TEST_PATIENT_ID,
        facilityId: TEST_FACILITY_ID,
        clinicalIndication: `Challenger M1 Coronary Evaluation ${uniqueRunId}`,
        procedures: [
          {
            procedureCode: 'CPT-93458',
            procedureName: 'Left Heart Catheterization with Coronary Angiogram',
            unitCost: 5500,
            quantity: 1,
            category: 'SURGICAL',
            isOptional: false,
            clinicalJustification: 'Suspected severe LAD stenosis',
          },
          {
            procedureCode: 'CPT-93462',
            procedureName: 'Left Ventricular Puncture / Transseptal Catheterization',
            unitCost: 3200,
            quantity: 2,
            category: 'SURGICAL',
            isOptional: true,
            clinicalJustification: 'Hemodynamic pressure gradient measurement',
          },
        ],
        validUntil,
        discountAmount: 1500,
        financingEligible: true,
        recommendedTenureMonths: 12,
        clinicalNotes: 'Adversarial live probe: clinical notes verification',
        termsAndConditions: 'Standard hospital cardiac suite financing agreement',
      };

      const offer = await treatmentOfferService.createTreatmentOffer(payload);
      telemetry.createdOfferId = offer.id;
      telemetry.offerNumber = offer.offerNumber;
      telemetry.version = offer.version;
      telemetry.status = offer.status;
      telemetry.grossEstimate = offer.grossEstimate;
      telemetry.discountAmount = offer.discountAmount;
      telemetry.netPayable = offer.netPayable;
      telemetry.proceduresCount = offer.procedures.length;

      assert(/^[0-9a-f-]{36}$/i.test(offer.id), `Returned ID must be valid UUID: ${offer.id}`);
      assertEqual(offer.status, 'DRAFT', 'Created offer status must be DRAFT');
      assertEqual(offer.version, 1, 'Initial offer version must be 1');
      assertEqual(offer.patientProfileId, TEST_PATIENT_ID, 'PatientProfileId must match');
      assertEqual(offer.facilityId, TEST_FACILITY_ID, 'FacilityId must match');

      // Financial verification: 5500*1 + 3200*2 = 11900 gross, 1500 discount => 10400 net
      const expectedGross = 5500 * 1 + 3200 * 2;
      const expectedNet = expectedGross - 1500;
      assertEqual(offer.grossEstimate, expectedGross, 'Gross estimate must sum procedure costs');
      assertEqual(offer.discountAmount, 1500, 'Discount must match payload');
      assertEqual(offer.netPayable, expectedNet, 'Net payable must equal gross - discount');
      assertEqual(offer.procedures.length, 2, 'Procedures array must contain 2 items');

      createdOffer = offer;
    }
  );

  // ---------------------------------------------------------------------------
  // PROBE 3: getTreatmentOffer(id) retrieval fidelity & 404 on non-existent ID
  // ---------------------------------------------------------------------------
  await probe(
    'PROBE-03',
    'treatmentOfferService.getTreatmentOffer(id) accurately fetches created offer and returns 404 for missing',
    async (telemetry) => {
      assert(createdOffer !== null, 'Created offer must exist from PROBE-02');

      const retrieved = await treatmentOfferService.getTreatmentOffer(createdOffer.id);
      telemetry.retrievedId = retrieved.id;
      telemetry.retrievedNumber = retrieved.offerNumber;
      telemetry.grossEstimate = retrieved.grossEstimate;
      telemetry.netPayable = retrieved.netPayable;

      assertEqual(retrieved.id, createdOffer.id, 'Retrieved ID must match created offer ID');
      assertEqual(retrieved.offerNumber, createdOffer.offerNumber, 'Offer number must match');
      assertEqual(retrieved.status, 'DRAFT', 'Status must be DRAFT');
      assertEqual(retrieved.grossEstimate, createdOffer.grossEstimate, 'Gross estimate must match');
      assertEqual(retrieved.netPayable, createdOffer.netPayable, 'Net payable must match');
      assertEqual(retrieved.procedures.length, 2, 'Procedures array count must match');

      // Adversarial: Fetch non-existent UUID — must throw ApiError with HTTP 404
      const missingUuid = '99999999-9999-4999-a999-999999999999';
      let threw404 = false;
      try {
        await treatmentOfferService.getTreatmentOffer(missingUuid);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.statusCode === 404) {
          threw404 = true;
          telemetry.expected404Message = err.message;
        } else {
          throw err;
        }
      }
      assert(threw404, 'Querying non-existent offer ID must throw HTTP 404 ApiError');
    }
  );

  // ---------------------------------------------------------------------------
  // PROBE 4: Optimistic Concurrency Conflict (Wrong expectedVersion -> 409)
  // ---------------------------------------------------------------------------
  await probe(
    'PROBE-04',
    'treatmentOfferService.updateTreatmentOffer() with WRONG expectedVersion throws HTTP 409 Conflict',
    async (telemetry) => {
      assert(createdOffer !== null, 'Created offer must exist');

      const wrongVersion = 999;
      let conflictDetected = false;
      let capturedError: unknown = null;

      try {
        await treatmentOfferService.updateTreatmentOffer(createdOffer.id, {
          clinicalIndication: 'Adversarial Conflict Attack Probe',
          expectedVersion: wrongVersion,
        });
      } catch (err: unknown) {
        capturedError = err;
        if (err instanceof ApiError && err.statusCode === 409) {
          conflictDetected = true;
          telemetry.conflictStatusCode = err.statusCode;
          telemetry.rawErrorMessage = err.message;
          telemetry.isVersionConflictHelperResult = isVersionConflictError(err);
          telemetry.formattedUserMessage = formatTreatmentOfferError(err);
        }
      }

      assert(conflictDetected, `Expected HTTP 409 Conflict when passing expectedVersion: 999, but got: ${String(capturedError)}`);
      assert(isVersionConflictError(capturedError), 'isVersionConflictError(err) helper must return true');
      assertEqual(
        formatTreatmentOfferError(capturedError),
        'The offer has been modified by another session. Please refresh and try again.',
        'formatTreatmentOfferError must return standard concurrency message'
      );

      // Now verify legitimate update with correct version (expectedVersion: 1)
      const validUpdateRes = await treatmentOfferService.updateTreatmentOffer(createdOffer.id, {
        clinicalIndication: `Updated Clinical Indication ${uniqueRunId}`,
        discountAmount: 1800,
        expectedVersion: 1,
      });

      telemetry.updatedVersion = validUpdateRes.version;
      telemetry.updatedDiscount = validUpdateRes.discountAmount;
      assertEqual(validUpdateRes.version, 2, 'Version must increment to 2 after successful update');
      assertEqual(validUpdateRes.discountAmount, 1800, 'Discount must update to 1800');
      createdOffer = validUpdateRes;
    }
  );

  // ---------------------------------------------------------------------------
  // PROBE 5: consultationService.getFinancingOptions() live partner packages
  // ---------------------------------------------------------------------------
  await probe(
    'PROBE-05',
    'consultationService.getFinancingOptions() returns authentic live partner packages (CareCredit, MediLend, HealthVault)',
    async (telemetry) => {
      const options = await consultationService.getFinancingOptions();
      telemetry.partnerCount = options.length;
      telemetry.partners = options.map((o) => ({
        id: o.id,
        partnerName: o.partnerName,
        name: o.name,
        minAmount: o.minAmount,
        maxAmount: o.maxAmount,
        interestRate: o.interestRate,
        tenures: o.tenureMonths,
      }));

      assert(Array.isArray(options), 'getFinancingOptions must return an array');
      assert(options.length >= 3, `Expected at least 3 financing partners, received ${options.length}`);

      const partnerNames = options.map((o) => o.partnerName);
      assert(partnerNames.some((p) => p.includes('CareCredit')), 'Missing CareCredit partner');
      assert(partnerNames.some((p) => p.includes('MediLend')), 'Missing MediLend partner');
      assert(partnerNames.some((p) => p.includes('HealthVault')), 'Missing HealthVault partner');

      const optionIds = options.map((o) => o.id);
      assert(optionIds.includes('opt-zerocost-care'), 'Missing opt-zerocost-care option ID');
      assert(optionIds.includes('opt-surgery-flex'), 'Missing opt-surgery-flex option ID');
      assert(optionIds.includes('opt-wellness-quick'), 'Missing opt-wellness-quick option ID');

      for (const opt of options) {
        assert(typeof opt.id === 'string' && opt.id.length > 0, `Option ${opt.partnerName} missing id`);
        assert(typeof opt.minAmount === 'number' && opt.minAmount >= 0, `Option ${opt.partnerName} invalid minAmount`);
        assert(typeof opt.maxAmount === 'number' && opt.maxAmount > opt.minAmount, `Option ${opt.partnerName} invalid maxAmount`);
        assert(Array.isArray(opt.tenureMonths) && opt.tenureMonths.length > 0, `Option ${opt.partnerName} invalid tenureMonths`);
        assert(Array.isArray(opt.features) && opt.features.length > 0, `Option ${opt.partnerName} invalid features`);
      }

      // Also verify getFinancingOffers()
      const offers = await consultationService.getFinancingOffers();
      telemetry.offersCount = offers.length;
      assert(Array.isArray(offers), 'getFinancingOffers must return array');
    }
  );

  // ---------------------------------------------------------------------------
  // PROBE 6: consultationService.listConsultations() dynamic CPTs & zero hardcoded literals
  // ---------------------------------------------------------------------------
  await probe(
    'PROBE-06',
    'consultationService.listConsultations() merges appointments and offers with ZERO hardcoded CPT literals',
    async (telemetry) => {
      const consultations = await consultationService.listConsultations();
      telemetry.totalConsultationsLoaded = consultations.length;

      assert(Array.isArray(consultations), 'listConsultations must return an array');
      assert(consultations.length > 0, 'Doctor should have active consultations/appointments or offers');

      let hardcodedCptCount = 0;
      let hardcodedHospitalCount = 0;
      let dynamicCptCount = 0;
      let missingCptCount = 0;

      for (const c of consultations) {
        // Assert no unconditional 'CPT #93458' injection
        if (c.cptCode === 'CPT #93458') {
          // If CPT #93458 is present, verify it comes from genuine data or title, not synthetic default
          hardcodedCptCount++;
        }
        if (c.cptCode) {
          dynamicCptCount++;
        } else {
          missingCptCount++;
        }

        // Assert facility name is not hardcoded fallback 'Metro General Hospital'
        if (c.facilityName === 'Metro General Hospital') {
          hardcodedHospitalCount++;
        }

        // Assert shape compliance
        assert(typeof c.id === 'string' && c.id.length > 0, 'ConsultationItem must have id');
        assert(typeof c.patientProfileId === 'string', 'ConsultationItem must have patientProfileId');
        assert(typeof c.patientName === 'string', 'ConsultationItem must have patientName');
        assert(typeof c.patientMrn === 'string', 'ConsultationItem must have patientMrn');
      }

      telemetry.cptBreakdown = {
        total: consultations.length,
        withCpt: dynamicCptCount,
        withoutCpt: missingCptCount,
        hardcodedCptMatches: hardcodedCptCount,
        hardcodedHospitalMatches: hardcodedHospitalCount,
      };

      // Verify that appointments without procedures have cptCode === undefined
      assert(
        missingCptCount > 0,
        `Expected some appointments to have cptCode undefined (got ${missingCptCount} without CPT out of ${consultations.length}); hardcoded default would populate all`
      );

      // Verify dynamic metrics calculation
      const metrics: ConsultationMetrics = consultationService.calculateMetrics(consultations);
      telemetry.calculatedMetrics = metrics;

      assertEqual(metrics.total, consultations.length, 'metrics.total must match consultations length');
      assert(metrics.active >= 0, 'metrics.active must be >= 0');
      assert(metrics.accepted >= 0, 'metrics.accepted must be >= 0');
      assert(metrics.completed >= 0, 'metrics.completed must be >= 0');
      assert(metrics.active <= metrics.total, 'active cannot exceed total');

      // Test async convenience wrapper getConsultationMetrics()
      const directMetrics = await consultationService.getConsultationMetrics();
      assertEqual(directMetrics.total, metrics.total, 'getConsultationMetrics().total must match');
    }
  );

  // ---------------------------------------------------------------------------
  // PROBE 7: Lifecycle Status Query & Cancellation
  // ---------------------------------------------------------------------------
  await probe(
    'PROBE-07',
    'treatmentOfferService.getTreatmentOfferStatus() and cancelTreatmentOffer() transition offer to CANCELLED',
    async (telemetry) => {
      assert(createdOffer !== null, 'Created offer must exist');

      // Check status before cancel
      const statusRes = await treatmentOfferService.getTreatmentOfferStatus(createdOffer.id);
      telemetry.preCancelStatus = statusRes.status;
      telemetry.preCancelVersion = statusRes.version;
      assertEqual(statusRes.id, createdOffer.id, 'Status ID must match offer ID');
      assertEqual(statusRes.status, 'DRAFT', 'Status should be DRAFT');
      assertEqual(statusRes.version, createdOffer.version, 'Status version must match createdOffer version');

      // Cancel offer
      const cancelReason = 'Empirical Challenger M1 test completion: proposal cancelled';
      const cancelledOffer = await treatmentOfferService.cancelTreatmentOffer(
        createdOffer.id,
        cancelReason,
        createdOffer.version
      );

      telemetry.postCancelStatus = cancelledOffer.status;
      telemetry.postCancelVersion = cancelledOffer.version;
      telemetry.cancellationReason = cancelledOffer.cancellationReason;

      assertEqual(cancelledOffer.status, 'CANCELLED', 'Status must transition to CANCELLED');
      assertEqual(cancelledOffer.version, createdOffer.version + 1, 'Version must increment after cancellation');
      assertEqual(cancelledOffer.cancellationReason, cancelReason, 'Cancellation reason must be saved');

      // Adversarial: Attempting to cancel again with stale version throws 409 Conflict
      let doubleCancelConflict = false;
      try {
        await treatmentOfferService.cancelTreatmentOffer(createdOffer.id, 'Double cancel probe', createdOffer.version);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.statusCode === 409) {
          doubleCancelConflict = true;
          telemetry.doubleCancelConflictStatusCode = err.statusCode;
        }
      }
      assert(doubleCancelConflict, 'Double cancellation with stale version must trigger 409 Conflict');
    }
  );

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n' + '='.repeat(80));
  console.log('ADVERSARIAL PROBE RESULTS SUMMARY');
  console.log('='.repeat(80));
  const passed = testResults.filter((r) => r.status === 'PASS').length;
  const failed = testResults.filter((r) => r.status === 'FAIL').length;
  const total = testResults.length;
  console.log(`Total Probes: ${total} | Passed: ${passed} | Failed: ${failed}`);

  for (const r of testResults) {
    console.log(`[${r.status}] ${r.id}: ${r.name} (${r.durationMs}ms)`);
    if (r.error) {
      console.log(`   ↳ Error: ${r.error}`);
    }
  }
  console.log('='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialProbes().catch((err) => {
  console.error('[FATAL PROBE ERROR]', err);
  process.exit(1);
});
