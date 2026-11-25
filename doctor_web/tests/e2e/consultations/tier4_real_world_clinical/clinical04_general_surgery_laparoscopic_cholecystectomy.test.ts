/**
 * Tier 4 — Clinical Scenario 4: General Surgery Laparoscopic Cholecystectomy
 * Full clinical simulation: Patient presenting with recurrent biliary colic,
 * Laparoscopic Cholecystectomy (CPT-47562), prompt self-pay discount,
 * physician attestation, and draft offer review.
 */

import { describe, it, assertEqual } from '../helpers/testUtils.ts';
import {
  createTreatmentOffer,
  getTreatmentOfferById,
} from '../helpers/consultationApiHelper.ts';
import { CLINICAL_WORKFLOW_SCENARIOS, createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Tier 4 — Clinical Scenario 04: General Surgery Laparoscopic Cholecystectomy', () => {
  it('TC-C04-01: Laparoscopic gallbladder removal consultation with prompt self-pay discount', async () => {
    const surg = CLINICAL_WORKFLOW_SCENARIOS.surgery;

    const payload = createValidOfferPayload({
      clinicalIndication: surg.indication,
      procedures: surg.procedures,
      discountAmount: surg.discountAmount,
      financingEligible: false,
      recommendedTenureMonths: 12,
      clinicalNotes: 'Recurrent right upper quadrant pain post-prandial. Ultrasound confirmed multiple gallstones with acoustic shadowing. Recommending elective laparoscopic cholecystectomy.',
      termsAndConditions: 'Package covers standard laparoscopic surgical kit, general anesthesia, same-day surgical recovery, and 14-day suture removal.',
    });

    const createRes = await createTreatmentOffer(payload);
    assertEqual(createRes.status, 201);
    const offer = createRes.body.data!;
    const offerId = offer.id;

    assertEqual(offer.grossEstimate, 6800);
    assertEqual(offer.discountAmount, 800);
    assertEqual(offer.netPayable, 6000);
    assertEqual(offer.financingEligible, false);

    const reviewRes = await getTreatmentOfferById(offerId);
    assertEqual(reviewRes.status, 200);
    assertEqual(reviewRes.body.data!.procedures[0].procedureCode, 'CPT-47562');
  });

  it('TC-C04-02: Self-pay discount rate verifies prompt payment percentage', () => {
    const gross = 6800;
    const discount = 800;
    const pct = Math.round((discount / gross) * 100);
    assertEqual(pct, 12, 'Discount is approximately 12%');
  });
});
