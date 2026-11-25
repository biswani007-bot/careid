/**
 * Tier 4 — Clinical Scenario 1: Interventional Cardiology
 * Full clinical simulation: Patient Marcus Doe presenting with unstable angina,
 * diagnostic catheterization with provisional PCI stenting, CareCredit zero-cost financing,
 * draft proposal authoring, and review verification.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import {
  createTreatmentOffer,
  getTreatmentOfferById,
  getTreatmentOfferStatus,
} from '../helpers/consultationApiHelper.ts';
import { CLINICAL_WORKFLOW_SCENARIOS, createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Tier 4 — Clinical Scenario 01: Interventional Cardiology (Marcus Doe)', () => {
  it('TC-C01-01: Complete cardiac consultation workflow from CPT selection to review and status tracking', async () => {
    const cardScenario = CLINICAL_WORKFLOW_SCENARIOS.cardiology;

    // 1. Configure clinical proposal
    const validUntil = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    const payload = createValidOfferPayload({
      clinicalIndication: cardScenario.indication,
      procedures: cardScenario.procedures,
      discountAmount: cardScenario.discountAmount,
      financingEligible: true,
      recommendedTenureMonths: cardScenario.tenureMonths,
      validUntil,
      clinicalNotes: 'Patient Marcus Doe evaluated for severe progressive angina. Recommending diagnostic catheterization with ad-hoc stenting of LAD if critical stenosis confirmed.',
      termsAndConditions: 'Cath lab procedural package includes standard stent implant, overnight telemetry observation, and antiplatelet protocol counseling.',
    });

    // 2. Transmit draft offer to live backend
    const createRes = await createTreatmentOffer(payload);
    assertEqual(createRes.status, 201, 'Cardiac proposal creation must succeed with HTTP 201');
    const offer = createRes.body.data!;
    const offerId = offer.id;

    // 3. Assert clinical & financial data integrity
    assertEqual(offer.grossEstimate, cardScenario.grossEstimate, 'Gross estimate should equal $13,000');
    assertEqual(offer.discountAmount, cardScenario.discountAmount, 'Discount should equal $500');
    assertEqual(offer.netPayable, cardScenario.netPayable, 'Net payable should equal $12,500');
    assertEqual(offer.status, 'DRAFT');
    assertEqual(offer.procedures.length, 2);

    // 4. Clinical Review presentation verification
    const reviewRes = await getTreatmentOfferById(offerId);
    assertEqual(reviewRes.status, 200, 'Clinical review query must return 200 OK');
    const reviewed = reviewRes.body.data!;
    assertEqual(reviewed.clinicalIndication, cardScenario.indication);

    // 5. Inspect status endpoint
    const statusRes = await getTreatmentOfferStatus(offerId);
    assertEqual(statusRes.status, 200);
    assertEqual(statusRes.body.data!.status, 'DRAFT');
  });

  it('TC-C01-02: Diagnostic procedure line item is mandatory while stenting is optional', () => {
    const cardScenario = CLINICAL_WORKFLOW_SCENARIOS.cardiology;
    const angio = cardScenario.procedures.find((p) => p.procedureCode === 'CPT-93458');
    const stent = cardScenario.procedures.find((p) => p.procedureCode === 'CPT-92928');

    assertDefined(angio);
    assertDefined(stent);
    assertEqual(angio.isOptional, false, 'Diagnostic angiogram must be non-optional');
    assertEqual(stent.isOptional, true, 'Provisional stenting must be optional based on anatomy');
  });
});
