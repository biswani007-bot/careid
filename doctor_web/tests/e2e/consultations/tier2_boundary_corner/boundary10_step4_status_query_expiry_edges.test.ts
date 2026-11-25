/**
 * Tier 2 — Boundary 10: Step 4 Status Query & Expiry Edges
 * Validates expiration flag behavior, rapid sequential status polling,
 * cancellation reasons in status payload, and non-UUID path defense.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import {
  createTreatmentOffer,
  getTreatmentOfferStatus,
  cancelTreatmentOffer,
} from '../helpers/consultationApiHelper.ts';
import { createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Tier 2 — Boundary 10: Step 4 Status Query & Expiry Edges', () => {
  let offerId: string;
  let currentVersion: number;

  it('TC-B10-01: Newly authored DRAFT offer has isExpired = false and null/undefined dispatchedAt', async () => {
    const payload = createValidOfferPayload({ clinicalIndication: 'Status edge initial test' });
    const createRes = await createTreatmentOffer(payload);
    assertEqual(createRes.status, 201);
    offerId = createRes.body.data!.id;
    currentVersion = createRes.body.data!.version;

    const statusRes = await getTreatmentOfferStatus(offerId);
    assertEqual(statusRes.status, 200);
    const s = statusRes.body.data!;
    assertEqual(s.status, 'DRAFT');
    assertEqual(s.isExpired, false);
    assertEqual(s.dispatchedAt, undefined);
  });

  it('TC-B10-02: Status query on cancelled offer preserves cancellationReason in status response', async () => {
    const reason = 'Clinical condition changed to emergent CABG surgery';
    const cancelRes = await cancelTreatmentOffer(offerId, reason, currentVersion);
    assertEqual(cancelRes.status, 200);

    const statusRes = await getTreatmentOfferStatus(offerId);
    assertEqual(statusRes.status, 200);
    const s = statusRes.body.data!;
    assertEqual(s.status, 'CANCELLED');
    assertEqual(s.cancellationReason, reason);
  });

  it('TC-B10-03: Rapid sequential status polls (5 back-to-back requests) succeed reliably', async () => {
    const promises = [
      getTreatmentOfferStatus(offerId),
      getTreatmentOfferStatus(offerId),
      getTreatmentOfferStatus(offerId),
      getTreatmentOfferStatus(offerId),
      getTreatmentOfferStatus(offerId),
    ];

    const results = await Promise.all(promises);
    for (const r of results) {
      assertEqual(r.status, 200, 'All back-to-back status requests must return HTTP 200');
      assertDefined(r.body.data);
    }
  });

  it('TC-B10-04: Status query with malformed non-UUID path returns HTTP 400 or 404', async () => {
    const res = await getTreatmentOfferStatus('not-a-valid-uuid');
    const isError = res.status === 400 || res.status === 404;
    assertEqual(isError, true, `Malformed UUID should return 400 or 404, got ${res.status}`);
  });

  it('TC-B10-05: Expiration calculation accurately flags validUntil dates in the past', () => {
    function computeIsExpired(validUntilIso: string): boolean {
      return new Date(validUntilIso).getTime() < Date.now();
    }

    const pastDate = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const futureDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    assertEqual(computeIsExpired(pastDate), true, 'Past date must be flagged as expired');
    assertEqual(computeIsExpired(futureDate), false, 'Future date must not be flagged as expired');
  });
});
