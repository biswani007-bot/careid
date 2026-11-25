/**
 * Tier 3 — Cross-Feature 5: Doctor Cancellation of Draft / Active Offer
 * Validates the multi-step lifecycle: proposal creation -> update with version bump ->
 * doctor cancellation with clinical justification -> audit trail verification.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import {
  createTreatmentOffer,
  updateTreatmentOffer,
  cancelTreatmentOffer,
  getTreatmentOfferById,
} from '../helpers/consultationApiHelper.ts';
import { createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Tier 3 — Cross-Feature 05: Doctor Cancellation of Active Offer', () => {
  it('TC-X05-01: Updating draft and then cancelling correctly tracks version increments and audit history', async () => {
    // 1. Create draft (version 1)
    const payload = createValidOfferPayload({
      clinicalIndication: `Cancellation Flow Test ${Date.now()}`,
    });
    const createRes = await createTreatmentOffer(payload);
    assertEqual(createRes.status, 201);
    const offerId = createRes.body.data!.id;
    assertEqual(createRes.body.data!.version, 1);

    // 2. Update draft (version bumps to 2)
    const updateRes = await updateTreatmentOffer(offerId, {
      clinicalIndication: 'Revised indication before deciding to cancel',
      expectedVersion: 1,
    });
    assertEqual(updateRes.status, 200);
    assertEqual(updateRes.body.data!.version, 2);

    // 3. Cancel offer (version bumps to 3)
    const cancelReason = 'Emergency transfer to cardiothoracic surgical center';
    const cancelRes = await cancelTreatmentOffer(offerId, cancelReason, 2);
    assertEqual(cancelRes.status, 200, 'Cancellation must succeed with HTTP 200');
    const cancelled = cancelRes.body.data!;

    assertEqual(cancelled.status, 'CANCELLED');
    assertEqual(cancelled.cancellationReason, cancelReason);
    assertEqual(cancelled.version, 3);

    // 4. Verify history audit trail
    const fetchRes = await getTreatmentOfferById(offerId);
    assertEqual(fetchRes.status, 200);
    const fetched = fetchRes.body.data!;
    assertDefined(fetched.history, 'History array must exist');
    const cancelHistory = fetched.history.find((h) => h.action === 'DOCTOR_CANCELLED');
    assertDefined(cancelHistory, 'History must contain DOCTOR_CANCELLED action');
    assertEqual(cancelHistory.newStatus, 'CANCELLED');
  });

  it('TC-X05-02: Cancelled proposal prevents subsequent updates', async () => {
    const payload = createValidOfferPayload({ clinicalIndication: 'Cancel Lock Test' });
    const createRes = await createTreatmentOffer(payload);
    const offerId = createRes.body.data!.id;

    await cancelTreatmentOffer(offerId, 'Cancelled for lock test', 1);

    // Attempt update on cancelled offer
    const updateRes = await updateTreatmentOffer(offerId, {
      clinicalIndication: 'Attempted edit after cancel',
      expectedVersion: 2,
    });

    const isBlocked = updateRes.status === 400 || updateRes.status === 409 || updateRes.status === 422;
    assertEqual(isBlocked, true, `Update on cancelled offer must be rejected, got ${updateRes.status}`);
  });
});
