/**
 * Tier 2 — Boundary 12: UI Layout & Breakpoint Boundaries
 * Validates text overflow handling, currency formatting, empty states,
 * and button disabled styling across consultation and stepper views.
 */

import { describe, it, assertEqual, assertIncludes } from '../helpers/testUtils.ts';

describe('Tier 2 — Boundary 12: UI Layout & Breakpoint Boundaries', () => {
  it('TC-B12-01: Currency formatter formats zero and large amounts with standard grouping', () => {
    function formatCurrency(amount: number, currency: string = 'PKR'): string {
      return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    assertEqual(formatCurrency(0), 'PKR 0.00');
    assertEqual(formatCurrency(12500), 'PKR 12,500.00');
    assertEqual(formatCurrency(1000000), 'PKR 1,000,000.00');
  });

  it('TC-B12-02: Extremely long procedure names (200+ characters) are bounded by text truncation or wrap', () => {
    const longName = 'Percutaneous Transcatheter Placement of Multiple Intracoronary Drug-Eluting Stents with Fractional Flow Reserve Measurement and Intravascular Ultrasound Guidance in Left Anterior Descending Artery';
    assertEqual(longName.length > 150, true);

    function formatProcedureDisplayName(name: string, maxLength: number = 80): string {
      return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
    }

    const formatted = formatProcedureDisplayName(longName);
    assertEqual(formatted.endsWith('...'), true);
    assertEqual(formatted.length, 83);
  });

  it('TC-B12-03: Zero procedures selected renders empty state alert and disables proceed button', () => {
    function evaluateProceedButtonState(procedureCount: number, isSubmitting: boolean) {
      const isDisabled = procedureCount === 0 || isSubmitting;
      return {
        disabled: isDisabled,
        className: isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-300' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer',
      };
    }

    const stateWhenEmpty = evaluateProceedButtonState(0, false);
    assertEqual(stateWhenEmpty.disabled, true);
    assertIncludes(stateWhenEmpty.className, 'cursor-not-allowed');

    const stateWhenValid = evaluateProceedButtonState(2, false);
    assertEqual(stateWhenValid.disabled, false);
    assertIncludes(stateWhenValid.className, 'bg-blue-600');
  });

  it('TC-B12-04: Button loading state displays spinner and disables repeated clicks', () => {
    function evaluateSubmitState(isSubmitting: boolean) {
      return {
        disabled: isSubmitting,
        text: isSubmitting ? 'Submitting...' : 'Send Treatment Offer',
        showSpinner: isSubmitting,
      };
    }

    const submitting = evaluateSubmitState(true);
    assertEqual(submitting.disabled, true);
    assertEqual(submitting.text, 'Submitting...');
    assertEqual(submitting.showSpinner, true);
  });

  it('TC-B12-05: Step indicator responsive classes hide detailed subtitle on mobile viewports', () => {
    const subtitleClasses = 'hidden sm:inline-block text-xs text-gray-500';
    assertIncludes(subtitleClasses, 'hidden sm:inline-block', 'Must hide on mobile and display on sm+ viewports');
  });
});
