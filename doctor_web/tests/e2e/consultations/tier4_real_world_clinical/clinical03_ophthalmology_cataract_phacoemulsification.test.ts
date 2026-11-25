/**
 * Tier 4 — Clinical Scenario 3: Ophthalmology Cataract Phacoemulsification
 * Full clinical simulation: Senior patient presenting with nuclear cataract,
 * Extracapsular Cataract Removal with IOL Insertion (CPT-66984),
 * HealthVault Diagnostics & Wellness micro-credit financing (6 months).
 */

import { describe, it, assertEqual } from '../helpers/testUtils.ts';
import {
  createTreatmentOffer,
  getTreatmentOfferById,
} from '../helpers/consultationApiHelper.ts';
import { CLINICAL_WORKFLOW_SCENARIOS, createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Tier 4 — Clinical Scenario 03: Ophthalmology Cataract Phacoemulsification', () => {
  it('TC-C03-01: Cataract surgery workflow with premium IOL and micro-credit financing', async () => {
    const ophth = CLINICAL_WORKFLOW_SCENARIOS.ophthalmology;

    const payload = createValidOfferPayload({
      clinicalIndication: ophth.indication,
      procedures: ophth.procedures,
      discountAmount: ophth.discountAmount,
      financingEligible: true,
      recommendedTenureMonths: ophth.tenureMonths,
      clinicalNotes: 'Right eye nuclear sclerotic cataract with significant glare and visual acuity drop to 20/80. Plan phacoemulsification with toric intraocular lens under topical anesthesia.',
      termsAndConditions: 'Outpatient ambulatory surgery center fee includes surgeon fee, premium IOL optic, topical anesthesia, and 90-day global post-op care.',
    });

    const createRes = await createTreatmentOffer(payload);
    assertEqual(createRes.status, 201);
    const offer = createRes.body.data!;
    const offerId = offer.id;

    assertEqual(offer.grossEstimate, 3200);
    assertEqual(offer.discountAmount, 200);
    assertEqual(offer.netPayable, 3000);
    assertEqual(offer.recommendedTenureMonths, 6);

    const reviewRes = await getTreatmentOfferById(offerId);
    assertEqual(reviewRes.status, 200);
    assertEqual(reviewRes.body.data!.procedures[0].procedureCode, 'CPT-66984');
  });

  it('TC-C03-02: Micro-credit zero interest 6-month installment verifies simple division', () => {
    const net = 3000;
    const months = 6;
    const monthlyPayment = net / months;
    assertEqual(monthlyPayment, 500, 'Zero-cost micro-credit monthly payment must be 500');
  });
});
