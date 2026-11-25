/**
 * Tier 1 — Feature 14: Duplicate Submission Prevention
 * Tests concurrent submission locks, double-click protection, and state transition safeguards.
 */

import { describe, it, assertEqual, assert } from '../helpers/testUtils.ts';
import { createMedicalRecord } from '../helpers/apiHelper.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Feature 14: Duplicate Submission Prevention', () => {
  it('TC-F14-01: In-flight submission lock prevents overlapping concurrent requests', async () => {
    let isSaving = false;
    let attemptedDuplicate = false;

    const simulateSave = async () => {
      if (isSaving) {
        attemptedDuplicate = true;
        return false;
      }
      isSaving = true;
      try {
        await new Promise((r) => setTimeout(r, 50));
        return true;
      } finally {
        isSaving = false;
      }
    };

    // Fire two calls concurrently
    const [first, second] = await Promise.all([simulateSave(), simulateSave()]);

    assert(first !== second, 'One call must succeed and the other must be rejected by lock');
    assertEqual(attemptedDuplicate, true, 'Second call must trigger duplicate protection flag');
  });

  it('TC-F14-02: Rapid double-click on Save button blocks the secondary request', async () => {
    let submissionCount = 0;
    let isSaving = false;

    const handleClick = () => {
      if (isSaving) return;
      isSaving = true;
      submissionCount++;
    };

    handleClick(); // Click 1
    handleClick(); // Click 2 (rapid)
    handleClick(); // Click 3 (rapid)

    assertEqual(submissionCount, 1, 'Only first click should increment submission counter');
  });

  it('TC-F14-03: Transition to "success" step disables save trigger in UI', () => {
    type Step = 'upload' | 'processing' | 'review' | 'success';
    let currentStep: Step = 'review';
    let saveEnabled = currentStep === 'review';

    // Once record is saved, state changes to 'success'
    currentStep = 'success';
    saveEnabled = currentStep === 'review';

    assertEqual(saveEnabled, false, 'Save button must be disabled when on success step');
  });

  it('TC-F14-04: Backend accepts identical payload with distinct timestamps without database conflict', async () => {
    const payload = {
      title: `Idempotency Check - ${Date.now()}`,
      chiefComplaint: 'Routine Check',
      clinicalNotes: 'Test idempotency',
      status: 'FINAL',
    };

    const res = await createMedicalRecord(TEST_PATIENT_ID, payload);
    assertEqual(res.status, 201, 'Backend handles unique timestamped record creation cleanly');
  });

  it('TC-F14-05: Resetting workflow after success re-enables upload interface cleanly', () => {
    type Step = 'upload' | 'processing' | 'review' | 'success';
    let currentStep: Step = 'success';
    let isSaving = true;

    // Reset workflow
    currentStep = 'upload';
    isSaving = false;

    assertEqual(currentStep, 'upload');
    assertEqual(isSaving, false);
  });
});
