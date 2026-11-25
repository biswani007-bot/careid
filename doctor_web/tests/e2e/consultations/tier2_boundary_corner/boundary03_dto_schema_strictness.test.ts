/**
 * Tier 2 — Boundary 3: DTO Schema Strictness
 * Validates mandatory field presence, UUID syntax checks, non-nullable types,
 * and rejection of malformed payloads on POST /doctors/treatment-offers.
 */

import { describe, it, assertEqual } from '../helpers/testUtils.ts';
import { createTreatmentOffer } from '../helpers/consultationApiHelper.ts';
import { createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Tier 2 — Boundary 03: DTO Schema Strictness', () => {
  it('TC-B03-01: Omitting mandatory patientProfileId is rejected with HTTP 400 Bad Request', async () => {
    const payload = createValidOfferPayload();
    delete (payload as Record<string, unknown>).patientProfileId;

    const res = await createTreatmentOffer(payload);
    assertEqual(res.status, 400, 'Missing patientProfileId must return HTTP 400 Bad Request');
  });

  it('TC-B03-02: Omitting mandatory facilityId is rejected with HTTP 400 Bad Request', async () => {
    const payload = createValidOfferPayload();
    delete (payload as Record<string, unknown>).facilityId;

    const res = await createTreatmentOffer(payload);
    assertEqual(res.status, 400, 'Missing facilityId must return HTTP 400 Bad Request');
  });

  it('TC-B03-03: Non-UUID format string for patientProfileId is rejected with HTTP 400', async () => {
    const payload = createValidOfferPayload({
      patientProfileId: 'not-a-valid-uuid-string-12345',
    });

    const res = await createTreatmentOffer(payload);
    assertEqual(res.status, 400, 'Non-UUID patientProfileId must return HTTP 400 Bad Request');
  });

  it('TC-B03-04: Empty string clinicalIndication is rejected with HTTP 400 Bad Request', async () => {
    const payload = createValidOfferPayload({
      clinicalIndication: '',
    });

    const res = await createTreatmentOffer(payload);
    assertEqual(res.status, 400, 'Empty clinicalIndication must return HTTP 400 Bad Request');
  });

  it('TC-B03-05: Malformed procedure item missing procedureCode is rejected with HTTP 400', async () => {
    const payload = createValidOfferPayload({
      procedures: [
        {
          procedureName: 'Catheterization without code',
          unitCost: 4500,
          category: 'DIAGNOSTIC',
          quantity: 1,
          isOptional: false,
          clinicalJustification: 'Test missing code',
        },
      ],
    });

    const res = await createTreatmentOffer(payload);
    assertEqual(res.status, 400, 'Procedure without procedureCode must return HTTP 400 Bad Request');
  });
});
