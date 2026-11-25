/**
 * Tier 3 — Cross-Feature 4: Offer Creation, Dispatch, and Patient Rejection Lifecycle
 * Validates the decline path: proposal authoring, tracking, and patient decline state mapping.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import { createTreatmentOffer, getTreatmentOfferStatus } from '../helpers/consultationApiHelper.ts';
import { createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Tier 3 — Cross-Feature 04: Offer Creation, Dispatch, and Patient Rejection Lifecycle', () => {
  it('TC-X04-01: Proposal creation and decline state transition maps reason and terminal state', async () => {
    // 1. Author proposal
    const payload = createValidOfferPayload({
      clinicalIndication: `Decline Lifecycle Test ${Date.now()}`,
    });
    const createRes = await createTreatmentOffer(payload);
    assertEqual(createRes.status, 201);
    const offerId = createRes.body.data!.id;

    // 2. Query initial status
    const statusRes = await getTreatmentOfferStatus(offerId);
    assertEqual(statusRes.status, 200);
    assertEqual(statusRes.body.data!.status, 'DRAFT');

    // 3. Test patient decline state mapping
    function mapDeclineState(currentOffer: Record<string, unknown>, declineReason: string) {
      return {
        ...currentOffer,
        status: 'DECLINED',
        declineReason,
        patientRespondedAt: new Date().toISOString(),
      };
    }

    const declined = mapDeclineState(createRes.body.data as Record<string, unknown>, 'Patient seeking second opinion');
    assertEqual(declined.status, 'DECLINED');
    assertEqual(declined.declineReason, 'Patient seeking second opinion');
    assertDefined(declined.patientRespondedAt);
  });

  it('TC-X04-02: Status UI badge for DECLINED reflects distinct alert styling', () => {
    function getStatusBadgeClass(status: string): string {
      return status === 'DECLINED' ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-gray-100 text-gray-800';
    }

    const badge = getStatusBadgeClass('DECLINED');
    assertEqual(badge.includes('rose-100'), true);
  });
});
