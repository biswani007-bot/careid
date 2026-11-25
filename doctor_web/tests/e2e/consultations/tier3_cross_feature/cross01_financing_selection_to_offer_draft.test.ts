/**
 * Tier 3 — Cross-Feature 1: Financing Selection to Offer Draft Integration
 * Validates the pairwise interaction between Step 1 financing option selection
 * and Step 2 draft proposal creation on the live backend.
 */

import { describe, it, assertEqual, assertDefined, assertIncludes } from '../helpers/testUtils.ts';
import {
  getFinancingOptions,
  createTreatmentOffer,
  getTreatmentOfferById,
} from '../helpers/consultationApiHelper.ts';
import { createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Tier 3 — Cross-Feature 01: Financing Selection to Offer Draft Integration', () => {
  it('TC-X01-01: Selected CareCredit package in Step 1 propagates to financingEligible and tenure in draft offer', async () => {
    // 1. Fetch live partner packages (Step 1)
    const finRes = await getFinancingOptions();
    assertEqual(finRes.status, 200);
    const careCredit = finRes.body.data!.find((o) => o.id === 'opt-zerocost-care')!;
    assertDefined(careCredit, 'CareCredit package must exist in Step 1');

    const chosenTenure = careCredit.tenureMonths.includes(12) ? 12 : careCredit.tenureMonths[0];

    // 2. Transmit offer draft embedding Step 1 financing parameters (Step 2)
    const offerPayload = createValidOfferPayload({
      clinicalIndication: `Financing Cross Flow Test ${Date.now()}`,
      financingEligible: true,
      recommendedTenureMonths: chosenTenure,
      clinicalNotes: `Patient opted for ${careCredit.partnerName} with ${chosenTenure}-month tenure.`,
    });

    const createRes = await createTreatmentOffer(offerPayload);
    assertEqual(createRes.status, 201, 'Draft proposal must be created with HTTP 201');
    const createdOffer = createRes.body.data!;

    // 3. Verify persistence of financing contract fields
    assertEqual(createdOffer.financingEligible, true);
    assertEqual(createdOffer.recommendedTenureMonths, chosenTenure);
    assertIncludes(createdOffer.clinicalNotes, 'CareCredit');

    // 4. Retrieve draft from backend by ID and double check
    const getRes = await getTreatmentOfferById(createdOffer.id);
    assertEqual(getRes.status, 200);
    assertEqual(getRes.body.data!.financingEligible, true);
    assertEqual(getRes.body.data!.recommendedTenureMonths, chosenTenure);
  });

  it('TC-X01-02: Self-pay selection in Step 1 sets financingEligible = false with tenure = 12', async () => {
    const offerPayload = createValidOfferPayload({
      clinicalIndication: `Self-Pay Cross Flow Test ${Date.now()}`,
      financingEligible: false,
      recommendedTenureMonths: 12,
      clinicalNotes: 'Patient declined partner financing; proceeding with direct self-pay.',
    });

    const createRes = await createTreatmentOffer(offerPayload);
    assertEqual(createRes.status, 201);
    const offer = createRes.body.data!;

    assertEqual(offer.financingEligible, false);
    assertEqual(offer.recommendedTenureMonths, 12);
  });
});
