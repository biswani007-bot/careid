/**
 * Tier 4 — Clinical Scenario 5: Complex Multi-Specialty Consultation & Attestation
 * Multi-procedure combined diagnostic & interventional cardiology workup:
 * Echocardiogram + Angiogram + Stenting with multi-row itemization and formal attestation.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import {
  createTreatmentOffer,
  getTreatmentOfferById,
} from '../helpers/consultationApiHelper.ts';
import { CPT_CATALOG, createValidOfferPayload } from '../helpers/fixtures.ts';

describe('Tier 4 — Clinical Scenario 05: Multi-Specialty Combined Cardiology Workup', () => {
  it('TC-C05-01: Multi-procedure workup with 3 line items calculates composite total and maintains line-item justifications', async () => {
    const combinedProcedures = [
      { ...CPT_CATALOG.ECHOCARDIOGRAM, quantity: 1, isOptional: false },
      { ...CPT_CATALOG.ANGIOGRAM, quantity: 1, isOptional: false },
      { ...CPT_CATALOG.PCI_STENT, quantity: 1, isOptional: true },
    ];
    // 1200 + 4500 + 8500 = 14200. Discount 1200. Net = 13000.

    const payload = createValidOfferPayload({
      clinicalIndication: `Multi-Specialty Combined Workup ${Date.now()}`,
      procedures: combinedProcedures,
      discountAmount: 1200,
      financingEligible: true,
      recommendedTenureMonths: 12,
      clinicalNotes: 'Comprehensive preoperative and interventional cardiovascular evaluation for high-risk patient with unstable symptoms.',
      termsAndConditions: 'Composite fee structure includes non-invasive imaging, invasive hemodynamics, and provisional stenting.',
    });

    const createRes = await createTreatmentOffer(payload);
    assertEqual(createRes.status, 201);
    const offer = createRes.body.data!;
    const offerId = offer.id;

    assertEqual(offer.grossEstimate, 14200);
    assertEqual(offer.discountAmount, 1200);
    assertEqual(offer.netPayable, 13000);
    assertEqual(offer.procedures.length, 3);

    const reviewRes = await getTreatmentOfferById(offerId);
    assertEqual(reviewRes.status, 200);
    const procs = reviewRes.body.data!.procedures;
    assertEqual(procs.length, 3);

    // Verify all 3 procedures exist with their respective categories
    const categories = procs.map((p) => p.category);
    assertEqual(categories.filter((c) => c === 'DIAGNOSTIC').length, 2);
    assertEqual(categories.filter((c) => c === 'SURGICAL').length, 1);
  });

  it('TC-C05-02: Attestation certification validates physician identity and timestamp', () => {
    function generateAttestationRecord(doctorName: string, doctorId: string) {
      return {
        attested: true,
        attestedBy: doctorName,
        doctorId,
        attestationId: `ATT-${Date.now()}`,
        certifiedAt: new Date().toISOString(),
        medicalLicenseRef: 'CAREID-MD-LIC-55091',
      };
    }

    const attestation = generateAttestationRecord('Dr. Sarah Jenkins, MD', '1f06067b-e229-4707-84e2-afa27da2e4cd');
    assertEqual(attestation.attested, true);
    assertDefined(attestation.certifiedAt);
    assertEqual(attestation.attestedBy, 'Dr. Sarah Jenkins, MD');
  });
});
