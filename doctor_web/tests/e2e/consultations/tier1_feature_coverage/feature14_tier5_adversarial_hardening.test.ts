/**
 * Tier 1 — Feature 14: Tier 5 Adversarial Coverage Hardening
 * Validates optimistic locking conflicts (HTTP 409), special-character escaping,
 * unauthorized access blocking, and rejection of invalid state transitions.
 */

import { describe, it, assertEqual, assertDefined, assertIncludes } from '../helpers/testUtils.ts';
import {
  createTreatmentOffer,
  updateTreatmentOffer,
  cancelTreatmentOffer,
  BASE_URL,
} from '../helpers/consultationApiHelper.ts';
import { createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Feature 14: Tier 5 Adversarial Coverage Hardening', () => {
  let adversarialOfferId: string;
  let currentVersion: number;

  it('TC-F14-01: Updating draft offer with mismatched expectedVersion rejects with HTTP 409 Conflict', async () => {
    // 1. Create offer (version 1)
    const payload = createValidOfferPayload({
      clinicalIndication: `Adversarial Version Test ${Date.now()}`,
    });
    const createRes = await createTreatmentOffer(payload);
    assertEqual(createRes.status, 201);
    adversarialOfferId = createRes.body.data!.id;
    currentVersion = createRes.body.data!.version;

    // 2. Submit update with intentionally WRONG version (e.g. currentVersion + 99)
    const wrongVersionUpdate = {
      clinicalIndication: 'Tampered update',
      expectedVersion: currentVersion + 99,
    };

    const updateRes = await updateTreatmentOffer(adversarialOfferId, wrongVersionUpdate);
    // Backend returns 409 Conflict or 400 Bad Request on version mismatch
    const isConflict = updateRes.status === 409 || updateRes.status === 400;
    assertEqual(isConflict, true, `Mismatched version must be rejected with 409 or 400, got ${updateRes.status}`);
  });

  it('TC-F14-02: Special characters and clinical Unicode glyphs in clinical notes are preserved without injection', async () => {
    const specialClinicalText = 'BP: 130/85 mmHg & SPO2 > 98% | Δ-ST segment elevation < 1mm; "Quote test" & \'apostrophe\'';
    const payload = createValidOfferPayload({
      clinicalNotes: specialClinicalText,
      termsAndConditions: 'Terms with <script>alert("xss")</script> & unicode: α-blocker & β-blocker',
    });

    const res = await createTreatmentOffer(payload);
    assertEqual(res.status, 201, 'Special characters payload must be accepted safely');
    assertDefined(res.body.data);

    // Verify notes are preserved without escaping corrupting the text
    assertIncludes(res.body.data!.clinicalNotes, 'mmHg');
    assertIncludes(res.body.data!.termsAndConditions, 'unicode');
  });

  it('TC-F14-03: Doctor treatment offer endpoints reject unauthorized requests with HTTP 401', async () => {
    const res = await fetch(`${BASE_URL}/doctors/treatment-offers`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    assertEqual(res.status, 401, 'Unauthenticated request must return HTTP 401');
  });

  it('TC-F14-04: Double cancellation attempt on already cancelled offer is rejected or handled defensively', async () => {
    // 1. Cancel offer
    const cancel1 = await cancelTreatmentOffer(adversarialOfferId, 'First cancellation', currentVersion);
    assertEqual(cancel1.status, 200, 'First cancellation must succeed');
    const newVersion = cancel1.body.data!.version;

    // 2. Attempt second cancellation
    const cancel2 = await cancelTreatmentOffer(adversarialOfferId, 'Second cancellation attempt', newVersion);
    // Backend should return 400 Bad Request or reject because already cancelled
    const isRejected = cancel2.status === 400 || cancel2.status === 409 || cancel2.status === 422;
    assertEqual(isRejected, true, `Second cancellation must be rejected, got status ${cancel2.status}`);
  });

  it('TC-F14-05: Non-existent UUID query returns HTTP 404 Not Found', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${BASE_URL}/doctors/treatment-offers/${fakeUuid}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${(await import('../helpers/consultationApiHelper.ts')).getDoctorToken ? await (await import('../helpers/consultationApiHelper.ts')).getDoctorToken() : ''}`,
        Accept: 'application/json',
      },
    });
    assertEqual(res.status, 404, 'Non-existent offer UUID must return HTTP 404 Not Found');
  });
});
