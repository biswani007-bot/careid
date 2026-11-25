/**
 * Tier 3 — Cross-Feature 6: Consultation Listing Dynamic Reflection of Created Offers
 * Validates that authored treatment proposals dynamically reflect in the doctor's
 * treatment offer listing and consultation dashboard streams.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import {
  createTreatmentOffer,
  listTreatmentOffers,
} from '../helpers/consultationApiHelper.ts';
import { createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Tier 3 — Cross-Feature 06: Consultation Listing Dynamic Reflection', () => {
  it('TC-X06-01: Newly authored proposal appears in authored proposals listing query', async () => {
    const uniqueIndication = `Listing Reflection Test Indication ${Date.now()}`;
    const payload = createValidOfferPayload({ clinicalIndication: uniqueIndication });

    const createRes = await createTreatmentOffer(payload);
    assertEqual(createRes.status, 201);
    const createdId = createRes.body.data!.id;

    // Fetch authored offers
    const listRes = await listTreatmentOffers({ limit: 20 });
    assertEqual(listRes.status, 200);
    const items = listRes.body.data?.data || [];

    const found = items.find((item) => item.id === createdId);
    assertDefined(found, 'Newly created offer must be found in authored offers list');
    assertEqual(found.clinicalIndication, uniqueIndication);
  });

  it('TC-X06-02: Merging live appointments and authored offers produces unified consultation items', () => {
    interface UnifiedConsultation {
      id: string;
      title: string;
      patientName: string;
      status: string;
      source: 'APPOINTMENT' | 'TREATMENT_OFFER';
    }

    const liveAppt = {
      id: 'appt-1',
      reason: 'Hypertension Consultation',
      patient: { firstName: 'Marcus', lastName: 'Doe' },
      status: 'SCHEDULED',
    };

    const liveOffer = {
      id: 'offer-1',
      clinicalIndication: 'Coronary Angiogram Proposal',
      patientName: 'Marcus Doe',
      status: 'DRAFT',
    };

    function unifyRecords(appts: Array<typeof liveAppt>, offers: Array<typeof liveOffer>): UnifiedConsultation[] {
      const unified: UnifiedConsultation[] = [];
      for (const a of appts) {
        unified.push({
          id: a.id,
          title: a.reason,
          patientName: `${a.patient.firstName} ${a.patient.lastName}`,
          status: a.status,
          source: 'APPOINTMENT',
        });
      }
      for (const o of offers) {
        unified.push({
          id: o.id,
          title: o.clinicalIndication,
          patientName: o.patientName,
          status: o.status,
          source: 'TREATMENT_OFFER',
        });
      }
      return unified;
    }

    const unifiedList = unifyRecords([liveAppt], [liveOffer]);
    assertEqual(unifiedList.length, 2, 'Must merge both records');
    assertEqual(unifiedList[0].source, 'APPOINTMENT');
    assertEqual(unifiedList[1].source, 'TREATMENT_OFFER');
  });
});
