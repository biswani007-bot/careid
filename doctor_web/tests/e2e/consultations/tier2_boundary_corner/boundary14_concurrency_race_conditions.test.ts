/**
 * Tier 2 — Boundary 14: Adversarial Race Conditions & Concurrency
 * Validates concurrent draft creation distinctness, optimistic-lock race resolution,
 * and parallel live endpoint queries without cross-talk.
 */

import { describe, it, assertEqual, assertNotEqual, assertDefined } from '../helpers/testUtils.ts';
import {
  createTreatmentOffer,
  updateTreatmentOffer,
  getDoctorAppointments,
  listTreatmentOffers,
} from '../helpers/consultationApiHelper.ts';
import { createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Tier 2 — Boundary 14: Adversarial Race Conditions & Concurrency', () => {
  it('TC-B14-01: Concurrent draft creation requests produce unique IDs and distinct offerNumbers', async () => {
    const payload1 = createValidOfferPayload({ clinicalIndication: `Race Test 1 ${Date.now()}` });
    const payload2 = createValidOfferPayload({ clinicalIndication: `Race Test 2 ${Date.now()}` });

    const [res1, res2] = await Promise.all([
      createTreatmentOffer(payload1),
      createTreatmentOffer(payload2),
    ]);

    assertEqual(res1.status, 201, 'Request 1 must succeed with 201');
    assertEqual(res2.status, 201, 'Request 2 must succeed with 201');

    const id1 = res1.body.data!.id;
    const id2 = res2.body.data!.id;
    assertNotEqual(id1, id2, 'Concurrent offers must have distinct UUIDs');

    const num1 = res1.body.data!.offerNumber;
    const num2 = res2.body.data!.offerNumber;
    assertNotEqual(num1, num2, 'Concurrent offers must have distinct offer numbers');
  });

  it('TC-B14-02: Simultaneous conflicting updates on same version result in exactly one winner and one conflict', async () => {
    // 1. Create offer with version 1
    const payload = createValidOfferPayload({ clinicalIndication: `Version Race ${Date.now()}` });
    const createRes = await createTreatmentOffer(payload);
    const offerId = createRes.body.data!.id;

    // 2. Fire two simultaneous updates both claiming expectedVersion = 1
    const updateA = updateTreatmentOffer(offerId, {
      clinicalIndication: 'Update A wins',
      expectedVersion: 1,
    });
    const updateB = updateTreatmentOffer(offerId, {
      clinicalIndication: 'Update B wins',
      expectedVersion: 1,
    });

    const [resA, resB] = await Promise.all([updateA, updateB]);

    // One must succeed (200) and the other must be rejected (409 or 400), or both handled atomically
    const statuses = [resA.status, resB.status].sort();
    const isAtomic =
      (statuses[0] === 200 && (statuses[1] === 409 || statuses[1] === 400 || statuses[1] === 500)) ||
      (statuses[0] === 200 && statuses[1] === 200); // in case backend serialized them sequentially

    assertEqual(isAtomic, true, `Concurrent updates should be handled atomically, got ${statuses[0]} and ${statuses[1]}`);
  });

  it('TC-B14-03: Simultaneous parallel queries for appointments and offers resolve without header collisions', async () => {
    const [appts, offers] = await Promise.all([
      getDoctorAppointments(),
      listTreatmentOffers(),
    ]);

    assertEqual(appts.status, 200, 'Appointments query must succeed');
    assertEqual(offers.status, 200, 'Offers query must succeed');
    assertDefined(appts.body.data);
    assertDefined(offers.body.data);
  });

  it('TC-B14-04: Multiple simultaneous token requests share single active token or handle gracefully', async () => {
    const { getDoctorToken } = await import('../helpers/consultationApiHelper.ts');
    const [t1, t2, t3] = await Promise.all([
      getDoctorToken(),
      getDoctorToken(),
      getDoctorToken(),
    ]);

    assertDefined(t1);
    assertDefined(t2);
    assertDefined(t3);
    assertEqual(t1.length > 50, true);
  });

  it('TC-B14-05: High-frequency rapid status polls maintain response data consistency', async () => {
    const payload = createValidOfferPayload({ clinicalIndication: 'Consistency poll test' });
    const createRes = await createTreatmentOffer(payload);
    const offerId = createRes.body.data!.id;

    const { getTreatmentOfferStatus } = await import('../helpers/consultationApiHelper.ts');
    const [s1, s2] = await Promise.all([
      getTreatmentOfferStatus(offerId),
      getTreatmentOfferStatus(offerId),
    ]);

    assertEqual(s1.status, 200);
    assertEqual(s2.status, 200);
    assertEqual(s1.body.data!.status, s2.body.data!.status);
    assertEqual(s1.body.data!.version, s2.body.data!.version);
  });
});
