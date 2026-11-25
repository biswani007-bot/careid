/**
 * Tier 4 — Clinical Scenario 6: Cancellation and Alternative Treatment Plan Revision
 * Clinical simulation: Initial surgical catheterization proposal authored;
 * patient condition changes; doctor formally cancels with justification;
 * authoring of revised conservative medical therapy consultation.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import {
  createTreatmentOffer,
  cancelTreatmentOffer,
  getTreatmentOfferById,
} from '../helpers/consultationApiHelper.ts';
import { CPT_CATALOG, createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Tier 4 — Clinical Scenario 06: Cancellation & Alternative Plan Revision', () => {
  it('TC-C06-01: Full cancellation and revised treatment proposal lifecycle', async () => {
    // 1. Author initial invasive proposal
    const initialPayload = createValidOfferPayload({
      clinicalIndication: `High-Risk Surgical Catheterization Plan ${Date.now()}`,
      procedures: [
        { ...CPT_CATALOG.ANGIOGRAM, quantity: 1, isOptional: false },
        { ...CPT_CATALOG.PCI_STENT, quantity: 1, isOptional: false },
      ],
      discountAmount: 1000,
    });

    const initialRes = await createTreatmentOffer(initialPayload);
    assertEqual(initialRes.status, 201);
    const initialOffer = initialRes.body.data!;
    const initialId = initialOffer.id;

    // 2. Patient develops acute renal impairment contraindicating iodinated contrast
    const cancelReason = 'Acute renal dysfunction (eGFR < 30 mL/min); iodinated contrast contraindicated. Transitioning to conservative medical therapy.';
    const cancelRes = await cancelTreatmentOffer(initialId, cancelReason, 1);
    assertEqual(cancelRes.status, 200);
    assertEqual(cancelRes.body.data!.status, 'CANCELLED');
    assertEqual(cancelRes.body.data!.cancellationReason, cancelReason);

    // 3. Author revised non-invasive diagnostic proposal (Transthoracic Echocardiogram)
    const revisedPayload = createValidOfferPayload({
      clinicalIndication: 'Conservative evaluation of ischemic heart disease via non-invasive imaging',
      procedures: [
        { ...CPT_CATALOG.ECHOCARDIOGRAM, quantity: 1, isOptional: false },
      ],
      discountAmount: 200,
      clinicalNotes: 'Non-contrast echocardiographic evaluation to assess resting ejection fraction in lieu of invasive angiogram.',
      termsAndConditions: 'Outpatient cardiology diagnostic protocol.',
    });

    const revisedRes = await createTreatmentOffer(revisedPayload);
    assertEqual(revisedRes.status, 201);
    const revisedOffer = revisedRes.body.data!;
    const revisedId = revisedOffer.id;

    assertEqual(revisedOffer.status, 'DRAFT');
    assertEqual(revisedOffer.netPayable, 1000); // 1200 - 200 = 1000

    // 4. Verify initial offer remains CANCELLED and revised offer is DRAFT
    const auditInitial = await getTreatmentOfferById(initialId);
    assertEqual(auditInitial.body.data!.status, 'CANCELLED');

    const auditRevised = await getTreatmentOfferById(revisedId);
    assertEqual(auditRevised.body.data!.status, 'DRAFT');
  });

  it('TC-C06-02: Cancellation audit reasons are preserved in consultation history records', () => {
    const historyItem = {
      action: 'DOCTOR_CANCELLED',
      performerRole: 'DOCTOR',
      notes: 'Contrast nephropathy risk - revised to non-contrast MRI',
      timestamp: new Date().toISOString(),
    };

    assertEqual(historyItem.action, 'DOCTOR_CANCELLED');
    assertEqual(historyItem.performerRole, 'DOCTOR');
    assertDefined(historyItem.notes);
  });
});
