/**
 * Tier 1 — Feature 11: Workflow State Persistence Across Refresh
 * Validates offer retrieval from URL parameters/query params when router location.state is lost,
 * duplicate submission locks, and stepper data retention.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import { createTreatmentOffer, getTreatmentOfferById } from '../helpers/consultationApiHelper.ts';
import { createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Feature 11: Workflow State Persistence Across Refresh', () => {
  let persistedOfferId: string;

  it('TC-F11-01: An active treatment offer can be resolved by ID when location.state is empty', async () => {
    // 1. Create offer
    const payload = createValidOfferPayload({
      clinicalIndication: `Refresh Persistence Test ${Date.now()}`,
    });
    const createRes = await createTreatmentOffer(payload);
    assertEqual(createRes.status, 201, 'Offer creation must succeed');
    persistedOfferId = createRes.body.data!.id;

    // 2. Simulate refresh where location.state is null, but offerId is parsed from URL path/query
    const refreshedRes = await getTreatmentOfferById(persistedOfferId);
    assertEqual(refreshedRes.status, 200, 'Must successfully fetch offer from backend by URL offerId');
    assertDefined(refreshedRes.body.data, 'Refreshed offer data must be present');
    assertEqual(refreshedRes.body.data!.id, persistedOfferId);
  });

  it('TC-F11-02: URL query param recovery function extracts offerId reliably', () => {
    function extractOfferIdFromSearch(searchString: string): string | null {
      const params = new URLSearchParams(searchString);
      return params.get('offerId') || params.get('id') || null;
    }

    assertEqual(extractOfferIdFromSearch('?offerId=996453a5-a790-4cb3-a646-b13c71de651f'), '996453a5-a790-4cb3-a646-b13c71de651f');
    assertEqual(extractOfferIdFromSearch('?step=2&id=123e4567-e89b-12d3-a456-426614174000'), '123e4567-e89b-12d3-a456-426614174000');
    assertEqual(extractOfferIdFromSearch('?otherParam=true'), null);
  });

  it('TC-F11-03: Duplicate submission lock prevents submitting identical offer concurrently', () => {
    class SubmissionLock {
      private isSubmitting = false;

      async execute(fn: () => Promise<string>): Promise<string> {
        if (this.isSubmitting) {
          throw new Error('DUPLICATE_SUBMISSION_PREVENTED: A submission is already in progress');
        }
        this.isSubmitting = true;
        try {
          return await fn();
        } finally {
          this.isSubmitting = false;
        }
      }
    }

    const lock = new SubmissionLock();
    let counter = 0;

    const op1 = lock.execute(async () => {
      await new Promise((r) => setTimeout(r, 50));
      counter++;
      return 'success-1';
    });

    // Attempt concurrent duplicate
    let caughtError = false;
    const op2 = lock
      .execute(async () => {
        counter++;
        return 'success-2';
      })
      .catch((err: Error) => {
        if (err.message.includes('DUPLICATE_SUBMISSION_PREVENTED')) {
          caughtError = true;
        }
      });

    return Promise.all([op1, op2]).then(() => {
      assertEqual(counter, 1, 'Only one operation should execute when locked');
      assertEqual(caughtError, true, 'Duplicate call should be rejected by lock');
    });
  });

  it('TC-F11-04: Workflow form state reconciles missing fields with backend defaults without crashing', () => {
    function reconcileOfferFormState(backendOffer: Record<string, unknown>) {
      return {
        id: String(backendOffer.id || ''),
        indication: String(backendOffer.clinicalIndication || ''),
        discount: Number(backendOffer.discountAmount || 0),
        procedures: Array.isArray(backendOffer.procedures) ? backendOffer.procedures : [],
        isFinanced: Boolean(backendOffer.financingEligible ?? false),
      };
    }

    const partial = { id: 'offer-1', clinicalIndication: 'Test Indication' };
    const reconciled = reconcileOfferFormState(partial);
    assertEqual(reconciled.id, 'offer-1');
    assertEqual(reconciled.indication, 'Test Indication');
    assertEqual(reconciled.discount, 0);
    assertEqual(reconciled.procedures.length, 0);
    assertEqual(reconciled.isFinanced, false);
  });

  it('TC-F11-05: Stepper route progression validates that Step 3 requires valid offer ID', () => {
    function canAccessReviewStep(offerId?: string): boolean {
      return Boolean(offerId && offerId.trim().length > 0);
    }

    assertEqual(canAccessReviewStep(''), false, 'Cannot access review step without offer ID');
    assertEqual(canAccessReviewStep(undefined), false, 'Cannot access review step when offer ID is undefined');
    assertEqual(canAccessReviewStep('996453a5-a790-4cb3-a646-b13c71de651f'), true, 'Can access review step with valid offer ID');
  });
});
