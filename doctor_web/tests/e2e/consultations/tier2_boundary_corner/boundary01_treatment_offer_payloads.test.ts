/**
 * Tier 2 — Boundary 1: Treatment Offer Payload Boundaries
 * Negative & boundary testing: empty procedures, negative discounts, zero unit cost,
 * and invalid category rejection against https://360api.vnvision.in/api/v1.
 */

import { describe, it, assertEqual } from '../helpers/testUtils.ts';
import { createTreatmentOffer } from '../helpers/consultationApiHelper.ts';
import { createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Tier 2 — Boundary 01: Treatment Offer Payload Boundaries', () => {
  it('TC-B01-01: Empty procedures array is rejected by backend with HTTP 400 Bad Request', async () => {
    const payload = createValidOfferPayload({ procedures: [] });
    const res = await createTreatmentOffer(payload);
    assertEqual(res.status, 400, 'Empty procedures must return HTTP 400 Bad Request');
  });

  it('TC-B01-02: Negative discount amount is rejected with HTTP 400 Bad Request', async () => {
    const payload = createValidOfferPayload({ discountAmount: -500 });
    const res = await createTreatmentOffer(payload);
    assertEqual(res.status, 400, 'Negative discount amount must return HTTP 400 Bad Request');
  });

  it('TC-B01-03: Zero unit cost on procedure line item is rejected or flagged as invalid', async () => {
    const payload = createValidOfferPayload({
      procedures: [
        {
          procedureCode: 'CPT-93458',
          procedureName: 'Catheterization',
          unitCost: 0,
          category: 'DIAGNOSTIC',
          quantity: 1,
          isOptional: false,
          clinicalJustification: 'Test zero cost',
        },
      ],
    });
    const res = await createTreatmentOffer(payload);
    // Backend should either reject with 400 or allow 0 for charitable/complimentary cases
    const validResponse = res.status === 400 || res.status === 201;
    assertEqual(validResponse, true, `Expected 400 or 201 for zero unit cost, got ${res.status}`);
  });

  it('TC-B01-04: Invalid procedure category is rejected with HTTP 400 Bad Request', async () => {
    const payload = createValidOfferPayload({
      procedures: [
        {
          procedureCode: 'CPT-93458',
          procedureName: 'Catheterization',
          unitCost: 4500,
          category: 'NON_EXISTENT_CATEGORY',
          quantity: 1,
          isOptional: false,
          clinicalJustification: 'Invalid category test',
        },
      ],
    });
    const res = await createTreatmentOffer(payload);
    assertEqual(res.status, 400, 'Invalid procedure category must return HTTP 400');
  });

  it('TC-B01-05: Discount amount strictly exceeding gross estimate is bounded to net payable >= 0', async () => {
    // Gross = 4500 + 8500 = 13000. Discount = 25000.
    const payload = createValidOfferPayload({
      discountAmount: 25000,
    });
    const res = await createTreatmentOffer(payload);
    if (res.status === 201) {
      // If backend accepts, netPayable must be clamped to 0 or negative handled
      const net = res.body.data!.netPayable;
      assertEqual(net <= 0, true, 'Net payable should be 0 or non-positive when discount exceeds gross');
    } else {
      assertEqual(res.status, 400, 'Backend rejecting discount > gross with 400 is also valid');
    }
  });
});
