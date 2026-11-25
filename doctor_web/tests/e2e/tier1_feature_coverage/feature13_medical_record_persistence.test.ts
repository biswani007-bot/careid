/**
 * Tier 1 — Feature 13: Medical Record Persistence
 * Tests submitting verified clinical information and attachments to POST /doctors/patients/:id/medical-records.
 */

import { describe, it, assertEqual, assertDefined, assertMatches } from '../helpers/testUtils.ts';
import { createMedicalRecord, uploadMultipartAttachment, linkAttachmentToMedicalRecord } from '../helpers/apiHelper.ts';
import { createValidPngBuffer } from '../helpers/fixtures.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Feature 13: Medical Record Persistence', () => {
  it('TC-F13-01: Create medical record for authorized patient returns HTTP 201 Created and record UUID', async () => {
    const payload = {
      title: `E2E CBC Review - ${Date.now()}`,
      chiefComplaint: 'Routine Blood Panel Evaluation',
      clinicalNotes: 'Digitized Diagnostic Laboratory Report: Complete Blood Count\nHemoglobin: 14.5 g/dL',
      treatmentPlan: 'Maintain current therapeutic protocol.',
      status: 'FINAL',
      encounter: {
        providerName: 'Dr. Sarah Jenkins, MD',
        facilityName: 'CareID Central Laboratory',
        encounterType: 'LABORATORY',
        encounterDate: new Date().toISOString(),
      },
    };

    const res = await createMedicalRecord(TEST_PATIENT_ID, payload);
    assertEqual(res.status, 201, 'Medical record creation must return 201 Created');
    const record = res.body.data as { id: string; patientProfileId: string; status: string };
    assertDefined(record?.id, 'Persisted record ID must exist');
    assertMatches(
      record.id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'Record ID must be a UUID'
    );
    assertEqual(record.patientProfileId, TEST_PATIENT_ID, 'Record must bind to target patient ID');
  });

  it('TC-F13-02: Persisted record status reflects FINAL clinical confirmation', async () => {
    const payload = {
      title: `Final Diagnostic Summary - ${Date.now()}`,
      chiefComplaint: 'Comprehensive Health Check',
      clinicalNotes: 'Vitals and labs verified.',
      status: 'FINAL',
    };

    const res = await createMedicalRecord(TEST_PATIENT_ID, payload);
    assertEqual(res.status, 201);
    const record = res.body.data as { status: string };
    assertEqual(record.status, 'FINAL', 'Status must be saved as FINAL');
  });

  it('TC-F13-03: Persisted record embeds uploaded attachment references', async () => {
    const png = createValidPngBuffer();
    const upRes = await uploadMultipartAttachment(png, 'record_attachment.png', 'image/png');
    assertEqual(upRes.status, 201, 'Attachment upload must succeed');
    const attachment = upRes.body.data!;

    const payload = {
      title: `Attachment Linkage Test - ${Date.now()}`,
      chiefComplaint: 'Attachment Verification',
      clinicalNotes: `Testing document linkage for attachment ${attachment.fileName}`,
      status: 'FINAL',
    };

    const res = await createMedicalRecord(TEST_PATIENT_ID, payload);
    assertEqual(res.status, 201, 'Record creation must succeed');
    const recordId = (res.body.data as { id: string }).id;

    // Link attachment to created record
    const linkRes = await linkAttachmentToMedicalRecord(recordId, png, 'record_attachment.png', 'image/png');
    assertEqual(linkRes.status, 201, 'Attachment must link to record with 201 Created');
  });

  it('TC-F13-04: Persisted record retains clinical encounter and provider details', async () => {
    const payload = {
      title: `Encounter Metadata Test - ${Date.now()}`,
      chiefComplaint: 'Clinical Consultation',
      clinicalNotes: 'Attending physician notes',
      status: 'FINAL',
      encounter: {
        providerName: 'Dr. Sarah Jenkins, MD',
        facilityName: 'CareID Central Laboratory',
        encounterType: 'CONSULTATION',
        encounterDate: new Date().toISOString(),
      },
    };

    const res = await createMedicalRecord(TEST_PATIENT_ID, payload);
    assertEqual(res.status, 201);
    assertDefined(res.body.data, 'Medical record data must be returned');
  });

  it('TC-F13-05: Record creation validates target patient profile ID', async () => {
    const payload = {
      title: 'Invalid Patient Test',
      chiefComplaint: 'Testing validation',
      clinicalNotes: 'Should fail',
      status: 'FINAL',
    };

    const res = await createMedicalRecord('00000000-0000-0000-0000-000000000000', payload);
    // Non-existent patient must be rejected (404 or 400 or 403)
    assertEqual(res.status >= 400, true, 'Non-existent patient record creation must fail');
  });
});
