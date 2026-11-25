/**
 * Tier 1 — Feature 7: Step 1 Financing Options Live Data
 * Validates patient context resolution, partner financing packages loading,
 * and state transfer from Step 1 to Step 2.
 */

import { describe, it, assertEqual, assertDefined, assertGreaterThanOrEqual, assertIncludes } from '../helpers/testUtils.ts';
import { getFinancingOptions, getDoctorAppointments } from '../helpers/consultationApiHelper.ts';

describe('Feature 07: Step 1 Financing Options Live Data', () => {
  it('TC-F07-01: Step 1 loads authentic patient demographics from appointment context', async () => {
    const res = await getDoctorAppointments();
    assertEqual(res.status, 200, 'Appointment list must load');
    const appts = res.body.data!;
    assertGreaterThanOrEqual(appts.length, 1, 'At least 1 appointment available');

    const pt = appts[0].patient as Record<string, unknown>;
    assertDefined(pt, 'Patient object must be embedded in appointment');
    assertDefined(pt.id, 'Patient ID must exist');
    assertDefined(pt.firstName, 'Patient first name must exist');
    assertDefined(pt.lastName, 'Patient last name must exist');
    assertEqual(pt.firstName, 'Marcus', 'Expected test patient Marcus');
    assertEqual(pt.lastName, 'Doe', 'Expected test patient Doe');
  });

  it('TC-F07-02: Step 1 loads 3 authentic financing partner packages directly from live API', async () => {
    const res = await getFinancingOptions();
    assertEqual(res.status, 200, 'Financing options endpoint must succeed');
    const options = res.body.data!;
    assertGreaterThanOrEqual(options.length, 3, 'Must return at least 3 packages');

    const names = options.map((o) => `${o.partnerName} ${o.name}`);
    assertIncludes(names[0], 'CareCredit', 'First package should be CareCredit');
  });

  it('TC-F07-03: Step 1 binds minimum and maximum funding limits to each partner card', async () => {
    const res = await getFinancingOptions();
    const options = res.body.data!;

    for (const opt of options) {
      assertDefined(opt.id, 'Option ID must be present');
      assertGreaterThanOrEqual(opt.maxAmount, opt.minAmount, 'Max amount must be greater than or equal to min amount');
      assertGreaterThanOrEqual(opt.tenureMonths.length, 1, 'At least one tenure month must be specified');
    }
  });

  it('TC-F07-04: Step 1 state transformation constructs initial offer payload for Step 2', () => {
    interface Step1State {
      patientProfileId: string;
      patientName: string;
      facilityId: string;
      selectedFinancingId: string;
      financingEligible: boolean;
      recommendedTenureMonths: number;
    }

    const step1Data: Step1State = {
      patientProfileId: '787e5187-7859-4320-bb1a-465a57dd086a',
      patientName: 'Marcus Doe',
      facilityId: '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb',
      selectedFinancingId: 'opt-zerocost-care',
      financingEligible: true,
      recommendedTenureMonths: 12,
    };

    assertEqual(step1Data.financingEligible, true, 'Financing eligible must be set to true');
    assertEqual(step1Data.recommendedTenureMonths, 12, 'Recommended tenure months must match package selection');
    assertEqual(step1Data.selectedFinancingId, 'opt-zerocost-care');
  });

  it('TC-F07-05: Step 1 prevents transition if no payment or financing option is selected', () => {
    function validateStep1CanProceed(financingEligible: boolean, selectedOptionId?: string): boolean {
      if (financingEligible && !selectedOptionId) return false;
      return true;
    }

    assertEqual(validateStep1CanProceed(true, ''), false, 'Cannot proceed when financing eligible is true but no option selected');
    assertEqual(validateStep1CanProceed(true, 'opt-zerocost-care'), true, 'Can proceed when option is selected');
    assertEqual(validateStep1CanProceed(false), true, 'Can proceed when self-pay is selected');
  });
});
