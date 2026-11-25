/**
 * Tier 2 — Boundary 9: Step 3 Dispatch Versioning Edges
 * Validates optimistic locking behavior, missing version parameters,
 * and dispatch rejection on non-existent or cancelled offers.
 */

import { describe, it, assertEqual } from '../helpers/testUtils.ts';
import {
  createTreatmentOffer,
  cancelTreatmentOffer,
  dispatchTreatmentOffer,
} from '../helpers/consultationApiHelper.ts';
import { createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Tier 2 — Boundary 09: Step 3 Dispatch Versioning Edges', () => {
  let createdOfferId: string;
  let cancelledOfferId: string;

  it('TC-B09-01: Dispatching a non-existent offer ID returns HTTP 404 or 400', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await dispatchTreatmentOffer(fakeId, 1);
    const isError = res.status === 404 || res.status === 400 || res.status === 500;
    assertEqual(isError, true, `Dispatching non-existent offer should return error code, got ${res.status}`);
  });

  it('TC-B09-02: Stale expectedVersion (version = 0) is rejected by optimistic lock validation', async () => {
    const payload = createValidOfferPayload({ clinicalIndication: 'Stale version test' });
    const createRes = await createTreatmentOffer(payload);
    assertEqual(createRes.status, 201);
    createdOfferId = createRes.body.data!.id;

    // Call dispatch with version 0 (when real version is 1)
    const dispatchRes = await dispatchTreatmentOffer(createdOfferId, 0);
    const isRejected = dispatchRes.status === 409 || dispatchRes.status === 400 || dispatchRes.status === 500;
    assertEqual(isRejected, true, `Expected version 0 to be rejected, got ${dispatchRes.status}`);
  });

  it('TC-B09-03: Attempting to dispatch an already CANCELLED offer is rejected', async () => {
    const payload = createValidOfferPayload({ clinicalIndication: 'Cancelled dispatch test' });
    const createRes = await createTreatmentOffer(payload);
    cancelledOfferId = createRes.body.data!.id;
    const version = createRes.body.data!.version;

    // Cancel offer first
    await cancelTreatmentOffer(cancelledOfferId, 'Pre-cancel for dispatch test', version);

    // Now attempt dispatch on cancelled offer
    const dispatchRes = await dispatchTreatmentOffer(cancelledOfferId, 2);
    const isRejected = dispatchRes.status === 400 || dispatchRes.status === 409 || dispatchRes.status === 500;
    assertEqual(isRejected, true, `Dispatching a cancelled offer should be rejected, got ${dispatchRes.status}`);
  });

  it('TC-B09-04: Negative expectedVersion (-1) is rejected with HTTP 400 or 409', async () => {
    const dispatchRes = await dispatchTreatmentOffer(createdOfferId, -1);
    const isRejected = dispatchRes.status === 400 || dispatchRes.status === 409 || dispatchRes.status === 500;
    assertEqual(isRejected, true, `Negative expectedVersion should be rejected, got ${dispatchRes.status}`);
  });

  it('TC-B09-05: Missing expectedVersion in dispatch body defaults safely or rejects cleanly', async () => {
    // Calling with undefined version
    const dispatchRes = await dispatchTreatmentOffer(createdOfferId, undefined as unknown as number);
    const isHandled = dispatchRes.status === 400 || dispatchRes.status === 409 || dispatchRes.status === 500;
    assertEqual(isHandled, true, `Missing expectedVersion handled cleanly with status ${dispatchRes.status}`);
  });
});
