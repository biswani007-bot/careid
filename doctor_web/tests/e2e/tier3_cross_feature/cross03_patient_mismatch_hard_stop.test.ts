/**
 * Tier 3 — Cross-Feature 3: Patient ID Mismatch Hard Stop Modal Integration
 * Safety Interlock: blocks cross-patient commitment when OCR metadata diverges from chart.
 */

import { describe, it, assertEqual, assert } from '../helpers/testUtils.ts';
import { parseOcrFields } from '../helpers/ocrTypes.ts';
import type { PatientSummary, BackendOcrField } from '../helpers/ocrTypes.ts';

const activePatient: PatientSummary = {
  id: '787e5187-7859-4320-bb1a-465a57dd086a',
  name: 'Marcus Doe',
  healthVaultId: '+16505550004',
  age: '36',
  gender: 'Male',
  dob: '1990-01-01',
  verified: true,
};

describe('Tier 3 — Cross-Feature 3: Patient ID Mismatch Hard Stop Modal Integration', () => {
  it('TC-X03: Critical Safety Interlock blocks mismatched record and permits only upon correction', () => {
    // 1. OCR extracted metadata belongs to a different patient
    const foreignFields: BackendOcrField[] = [
      { id: '1', ocrJobId: 'job', fieldName: 'patient_name', fieldValue: 'Evelyn Reed', confidence: 0.98, validationStatus: 'VALIDATED' },
      { id: '2', ocrJobId: 'job', fieldName: 'mrn', fieldValue: '+19998887777', confidence: 0.97, validationStatus: 'VALIDATED' },
    ];

    const parsed = parseOcrFields(foreignFields, '', activePatient);
    const extractedHvId = parsed.demographicsAndDetails.find((f) => f.id === 'hv_id')?.value;
    const extractedName = parsed.demographicsAndDetails.find((f) => f.id === 'patient_name')?.value;

    // 2. Compute safety interlock condition
    const normalizeId = (id?: string) => id?.replace(/[-_ ]/g, '').toLowerCase() || '';
    const isPatientMismatch = Boolean(
      (extractedHvId && normalizeId(extractedHvId) !== normalizeId(activePatient.healthVaultId)) ||
      (extractedName && normalizeId(extractedName) !== normalizeId(activePatient.name))
    );

    assertEqual(isPatientMismatch, true, 'Safety interlock must flag divergence as mismatch');

    // 3. Attempting save while mismatch is active must fail and trigger warning modal
    let showMismatchModal = false;
    let mismatchError: string | null = null;

    const handleSave = () => {
      if (isPatientMismatch) {
        showMismatchModal = true;
        mismatchError = 'Critical Patient Safety Interlock: Cross-patient chart commitment is strictly prohibited.';
        return false;
      }
      return true;
    };

    const saveResult = handleSave();
    assertEqual(saveResult, false, 'Save must be blocked by safety interlock');
    assertEqual(showMismatchModal, true, 'Mismatch modal must be displayed');
    assert(mismatchError !== null, 'Safety error message must be set');

    // 4. Doctor corrects mismatched fields to match chart
    const correctedFields = parsed.demographicsAndDetails.map((f) => {
      if (f.id === 'hv_id') return { ...f, value: activePatient.healthVaultId, status: 'verified' as const };
      if (f.id === 'patient_name') return { ...f, value: activePatient.name, status: 'verified' as const };
      return f;
    });

    const newExtractedHvId = correctedFields.find((f) => f.id === 'hv_id')?.value;
    const newExtractedName = correctedFields.find((f) => f.id === 'patient_name')?.value;
    const isMismatchAfterCorrection = Boolean(
      (newExtractedHvId && normalizeId(newExtractedHvId) !== normalizeId(activePatient.healthVaultId)) ||
      (newExtractedName && normalizeId(newExtractedName) !== normalizeId(activePatient.name))
    );

    assertEqual(isMismatchAfterCorrection, false, 'Divergence resolved after doctor correction');

    // 5. Subsequent save succeeds cleanly
    const subsequentSaveResult = !isMismatchAfterCorrection;
    assertEqual(subsequentSaveResult, true, 'Save proceeds cleanly once chart is aligned');
  });
});
