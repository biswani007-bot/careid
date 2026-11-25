/**
 * Tier 2 — Boundary 2: Financing Limits & Tenures
 * Negative & boundary testing: requested amount < minAmount, requested amount > maxAmount,
 * invalid tenure months, negative income, and invalid employment type.
 */

import { describe, it, assertEqual } from '../helpers/testUtils.ts';
import { applyForFinancing, TEST_FACILITY_ID } from '../helpers/consultationApiHelper.ts';

describe('Tier 2 — Boundary 02: Financing Limits & Tenures', () => {
  it('TC-B02-01: Requested financing amount below partner minAmount (100 < 5000) is rejected with HTTP 400', async () => {
    const payload = {
      optionId: 'opt-zerocost-care',
      facilityId: TEST_FACILITY_ID,
      treatmentName: 'Cardiology Angiogram',
      requestedAmount: 100, // Min is 5000
      tenureMonths: 12,
      monthlyIncome: 75000,
      employmentType: 'SALARIED',
      panOrNationalId: 'CAREID-PT-001',
    };
    const res = await applyForFinancing(payload);
    assertEqual(res.status, 400, 'Amount below minimum should return HTTP 400 Bad Request');
  });

  it('TC-B02-02: Requested financing amount exceeding partner maxAmount (5,000,000 > 200,000) is rejected with HTTP 400', async () => {
    const payload = {
      optionId: 'opt-zerocost-care',
      facilityId: TEST_FACILITY_ID,
      treatmentName: 'Cardiology Angiogram',
      requestedAmount: 5000000, // Max is 200,000
      tenureMonths: 12,
      monthlyIncome: 150000,
      employmentType: 'SALARIED',
      panOrNationalId: 'CAREID-PT-001',
    };
    const res = await applyForFinancing(payload);
    assertEqual(res.status, 400, 'Amount exceeding maximum should return HTTP 400 Bad Request');
  });

  it('TC-B02-03: Unsupported tenure months (99 months) is rejected with HTTP 400 Bad Request', async () => {
    const payload = {
      optionId: 'opt-zerocost-care',
      facilityId: TEST_FACILITY_ID,
      treatmentName: 'Cardiology Angiogram',
      requestedAmount: 50000,
      tenureMonths: 99, // Allowed: 3, 6, 9, 12
      monthlyIncome: 75000,
      employmentType: 'SALARIED',
      panOrNationalId: 'CAREID-PT-001',
    };
    const res = await applyForFinancing(payload);
    assertEqual(res.status, 400, 'Unsupported tenure months should return HTTP 400 Bad Request');
  });

  it('TC-B02-04: Negative monthly income is rejected with HTTP 400 Bad Request', async () => {
    const payload = {
      optionId: 'opt-zerocost-care',
      facilityId: TEST_FACILITY_ID,
      treatmentName: 'Cardiology Angiogram',
      requestedAmount: 50000,
      tenureMonths: 12,
      monthlyIncome: -50000,
      employmentType: 'SALARIED',
      panOrNationalId: 'CAREID-PT-001',
    };
    const res = await applyForFinancing(payload);
    assertEqual(res.status, 400, 'Negative income should return HTTP 400 Bad Request');
  });

  it('TC-B02-05: Invalid employment type string is rejected with HTTP 400 or 500 error envelope', async () => {
    const payload = {
      optionId: 'opt-zerocost-care',
      facilityId: TEST_FACILITY_ID,
      treatmentName: 'Cardiology Angiogram',
      requestedAmount: 50000,
      tenureMonths: 12,
      monthlyIncome: 75000,
      employmentType: 'UNKNOWN_OCCUPATION_TYPE',
      panOrNationalId: 'CAREID-PT-001',
    };
    const res = await applyForFinancing(payload);
    const isRejected = res.status === 400 || res.status === 500;
    assertEqual(isRejected, true, `Invalid employment type should be rejected by backend, got status ${res.status}`);
  });
});
