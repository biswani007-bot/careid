/**
 * Tier 1 — Feature 1: Treatment Offer API Service
 * Comprehensive validation of REST endpoints for doctor treatment offers:
 * creation, retrieval, listing, optimistic-lock updates, cancellation, and status inspection.
 */

import { describe, it, assertEqual, assertDefined, assertGreaterThanOrEqual, assertMatches } from '../helpers/testUtils.ts';
import {
  createTreatmentOffer,
  getTreatmentOfferById,
  listTreatmentOffers,
  updateTreatmentOffer,
  cancelTreatmentOffer,
  getTreatmentOfferStatus,
} from '../helpers/consultationApiHelper.ts';
import { createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Feature 01: Treatment Offer API Service', () => {
  let createdOfferId: string;
  let currentVersion: number;

  it('TC-F01-01: Create draft proposal via POST /doctors/treatment-offers returns 201 with generated DRAFT DTO', async () => {
    const payload = createValidOfferPayload({
      clinicalIndication: `E2E F01 Angina Evaluation ${Date.now()}`,
    });

    const res = await createTreatmentOffer(payload);
    assertEqual(res.status, 201, 'Create offer must return HTTP 201 Created');
    assertDefined(res.body.data, 'Response body must contain data envelope');

    const offer = res.body.data!;
    assertDefined(offer.id, 'Offer ID must be generated');
    assertMatches(offer.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Offer ID must be a UUID');
    assertEqual(offer.status, 'DRAFT', 'Initial status must be DRAFT');
    assertEqual(offer.version, 1, 'Initial version must be 1');
    assertDefined(offer.offerNumber, 'Offer number must be assigned');
    assertEqual(offer.grossEstimate, 13000, 'Gross estimate must sum procedure costs (4500 + 8500)');
    assertEqual(offer.discountAmount, 1000, 'Discount amount must match payload');
    assertEqual(offer.netPayable, 12000, 'Net payable must equal gross - discount');

    createdOfferId = offer.id;
    currentVersion = offer.version;
  });

  it('TC-F01-02: Get treatment offer by ID via GET /doctors/treatment-offers/:id returns full DTO', async () => {
    assertDefined(createdOfferId, 'Must have a created offer ID');

    const res = await getTreatmentOfferById(createdOfferId);
    assertEqual(res.status, 200, 'Get offer by ID must return HTTP 200 OK');
    assertDefined(res.body.data, 'Data payload must be present');

    const offer = res.body.data!;
    assertEqual(offer.id, createdOfferId, 'Offer ID must match requested UUID');
    assertEqual(offer.status, 'DRAFT', 'Status must be DRAFT');
    assertGreaterThanOrEqual(offer.procedures.length, 1, 'Procedures array must be populated');
    assertEqual(offer.procedures[0].procedureCode, 'CPT-93458', 'Procedure code must match input');
  });

  it('TC-F01-03: List treatment proposals via GET /doctors/treatment-offers returns paginated results', async () => {
    const res = await listTreatmentOffers({ limit: 10, page: 1 });
    assertEqual(res.status, 200, 'Listing offers must return HTTP 200 OK');
    assertDefined(res.body.data, 'Response data must be defined');

    const pageData = res.body.data!;
    assertDefined(pageData.data, 'Page data array must be present');
    assertGreaterThanOrEqual(pageData.total, 1, 'Total authored offers should be at least 1');
    assertEqual(pageData.page, 1, 'Page number must match query');
  });

  it('TC-F01-04: Update draft treatment offer via PUT /doctors/treatment-offers/:id increments version', async () => {
    assertDefined(createdOfferId, 'Must have a created offer ID');

    const updatePayload = {
      clinicalIndication: 'Updated clinical indication with confirmed CAD',
      discountAmount: 1200,
      financingEligible: true,
      recommendedTenureMonths: 18,
      validUntil: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString(),
      clinicalNotes: 'Revised surgical strategy after cardiac review',
      termsAndConditions: 'Updated payment milestones',
      expectedVersion: currentVersion,
    };

    const res = await updateTreatmentOffer(createdOfferId, updatePayload);
    assertEqual(res.status, 200, 'Update draft must return HTTP 200 OK');
    assertDefined(res.body.data, 'Updated offer data must be present');

    const updated = res.body.data!;
    assertEqual(updated.discountAmount, 1200, 'Discount must be updated to 1200');
    assertEqual(updated.version, currentVersion + 1, 'Version must increment by 1');
    assertEqual(updated.clinicalIndication, 'Updated clinical indication with confirmed CAD');

    currentVersion = updated.version;
  });

  it('TC-F01-05: Inspect offer lifecycle status via GET /doctors/treatment-offers/:id/status', async () => {
    assertDefined(createdOfferId, 'Must have a created offer ID');

    const res = await getTreatmentOfferStatus(createdOfferId);
    assertEqual(res.status, 200, 'Status endpoint must return HTTP 200 OK');
    assertDefined(res.body.data, 'Status data must be present');

    const statusObj = res.body.data!;
    assertEqual(statusObj.id, createdOfferId, 'Status ID must match offer ID');
    assertEqual(statusObj.status, 'DRAFT', 'Status should be DRAFT before dispatch');
    assertEqual(statusObj.isExpired, false, 'Offer should not be expired');
    assertEqual(statusObj.version, currentVersion, 'Status version must match current version');
  });

  it('TC-F01-06: Cancel treatment proposal via POST /doctors/treatment-offers/:id/cancel transitions to CANCELLED', async () => {
    assertDefined(createdOfferId, 'Must have a created offer ID');

    const reason = 'Patient elected medical therapy instead of invasive catheterization';
    const res = await cancelTreatmentOffer(createdOfferId, reason, currentVersion);
    assertEqual(res.status, 200, 'Cancel offer must return HTTP 200 OK');
    assertDefined(res.body.data, 'Cancelled offer data must be present');

    const cancelled = res.body.data!;
    assertEqual(cancelled.status, 'CANCELLED', 'Offer status must transition to CANCELLED');
    assertEqual(cancelled.cancellationReason, reason, 'Cancellation reason must be recorded');
    assertEqual(cancelled.version, currentVersion + 1, 'Version must increment after cancellation');
  });
});
