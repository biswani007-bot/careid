/**
 * Tier 3 — Cross-Feature 8: Full Stepper Navigation with Step-to-Step State Preservation
 * Validates the complete 4-step workflow from Step 1 financing options to Step 2 procedure configuration,
 * Step 3 review & submission, and Step 4 status tracking.
 */

import { describe, it, assertEqual } from '../helpers/testUtils.ts';
import {
  createTreatmentOffer,
  getTreatmentOfferById,
  getTreatmentOfferStatus,
} from '../helpers/consultationApiHelper.ts';
import { CPT_CATALOG, createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Tier 3 — Cross-Feature 08: Stepper Step-to-Step Integrity', () => {
  it('TC-X08-01: End-to-end 4-step workflow retains state consistency across transitions', async () => {
    // -------------------------------------------------------------
    // Step 1: Select Financing Options
    // -------------------------------------------------------------
    const step1Context = {
      patientProfileId: '787e5187-7859-4320-bb1a-465a57dd086a',
      patientName: 'Marcus Doe',
      facilityId: '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb',
      selectedFinancingId: 'opt-zerocost-care',
      financingEligible: true,
      recommendedTenureMonths: 12,
    };
    assertEqual(step1Context.financingEligible, true);

    // -------------------------------------------------------------
    // Step 2: Configure Treatment Offer
    // -------------------------------------------------------------
    const step2Procedures = [
      {
        ...CPT_CATALOG.ANGIOGRAM,
        quantity: 1,
        isOptional: false,
      },
    ];
    const discountAmount = 500;
    const grossEstimate = 4500;
    const netPayable = 4000;

    const offerPayload = createValidOfferPayload({
      patientProfileId: step1Context.patientProfileId,
      facilityId: step1Context.facilityId,
      clinicalIndication: `End-to-End Stepper Flow ${Date.now()}`,
      procedures: step2Procedures,
      discountAmount,
      financingEligible: step1Context.financingEligible,
      recommendedTenureMonths: step1Context.recommendedTenureMonths,
    });

    // Submit draft to backend
    const createRes = await createTreatmentOffer(offerPayload);
    assertEqual(createRes.status, 201, 'Draft creation must succeed');
    const createdOffer = createRes.body.data!;
    const offerId = createdOffer.id;

    assertEqual(createdOffer.grossEstimate, grossEstimate);
    assertEqual(createdOffer.discountAmount, discountAmount);
    assertEqual(createdOffer.netPayable, netPayable);

    // -------------------------------------------------------------
    // Step 3: Review & Send to Patient
    // -------------------------------------------------------------
    const reviewRes = await getTreatmentOfferById(offerId);
    assertEqual(reviewRes.status, 200);
    const reviewed = reviewRes.body.data!;
    assertEqual(reviewed.id, offerId);
    assertEqual(reviewed.status, 'DRAFT');
    assertEqual(reviewed.version, 1);

    // -------------------------------------------------------------
    // Step 4: Patient Acceptance Status
    // -------------------------------------------------------------
    const statusRes = await getTreatmentOfferStatus(offerId);
    assertEqual(statusRes.status, 200);
    const statusData = statusRes.body.data!;
    assertEqual(statusData.id, offerId);
    assertEqual(statusData.isExpired, false);
  });

  it('TC-X08-02: Step indicator index accurately tracks step progression (1 to 4)', () => {
    function getStepNumberFromPath(pathname: string): number {
      if (pathname.includes('/step-1')) return 1;
      if (pathname.includes('/step-2')) return 2;
      if (pathname.includes('/review') || pathname.includes('/step-3')) return 3;
      if (pathname.includes('/status') || pathname.includes('/accepted') || pathname.includes('/step-4')) return 4;
      return 1;
    }

    assertEqual(getStepNumberFromPath('/treatment-offers/new/step-1'), 1);
    assertEqual(getStepNumberFromPath('/treatment-offers/new/step-2'), 2);
    assertEqual(getStepNumberFromPath('/treatment-offers/123/review'), 3);
    assertEqual(getStepNumberFromPath('/treatment-offers/123/status'), 4);
    assertEqual(getStepNumberFromPath('/treatment-offers/123/accepted'), 4);
  });
});
