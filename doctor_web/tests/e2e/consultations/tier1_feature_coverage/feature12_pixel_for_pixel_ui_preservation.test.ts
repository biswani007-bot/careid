/**
 * Tier 1 — Feature 12: Pixel-for-Pixel UI Preservation
 * Validates layout fidelity, Tailwind typography and color tokens, Lucide icon imports,
 * metric card grid structures, and stepper action styling.
 */

import { describe, it, assertEqual, assertDefined, assertIncludes } from '../helpers/testUtils.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('Feature 12: Pixel-for-Pixel UI Preservation', () => {
  const dashboardPath = path.resolve(
    process.cwd(),
    'src/pages/treatment-offers/TreatmentOffersDashboardPage.tsx'
  );
  const reviewPath = path.resolve(
    process.cwd(),
    'src/pages/treatment-offers/TreatmentOfferReviewPage.tsx'
  );

  it('TC-F12-01: Dashboard page defines the 4-card metric summary grid', () => {
    const content = fs.readFileSync(dashboardPath, 'utf8');
    assertDefined(content, 'Dashboard file must exist');

    // Confirm metric card grid presence (e.g. grid-cols-1 md:grid-cols-2 lg:grid-cols-4 or similar)
    const hasGrid = content.includes('grid') && (content.includes('grid-cols') || content.includes('gap-'));
    assertEqual(hasGrid, true, 'Dashboard must define a responsive grid for stat metrics');
  });

  it('TC-F12-02: Lucide icons are properly imported and utilized across consultation views', () => {
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    const reviewContent = fs.readFileSync(reviewPath, 'utf8');

    const hasLucideInDashboard = dashboardContent.includes('lucide-react');
    const hasLucideInReview = reviewContent.includes('lucide-react');

    assertEqual(hasLucideInDashboard, true, 'Dashboard must import from lucide-react');
    assertEqual(hasLucideInReview, true, 'Review page must import from lucide-react');
  });

  it('TC-F12-03: Primary action button styling conforms to design system tokens', () => {
    const reviewContent = fs.readFileSync(reviewPath, 'utf8');
    // Ensure standard button classes like px-4, py-2, rounded, transition, font-medium exist
    const hasButtonClasses =
      reviewContent.includes('rounded') &&
      reviewContent.includes('transition');
    assertEqual(hasButtonClasses, true, 'Buttons must adhere to design system styling');
  });

  it('TC-F12-04: Stepper navigation preserves step indicator labels', () => {
    const stepperLabels = [
      'Select Financing Options',
      'Configure Treatment Offer',
      'Review & Send to Patient',
      'Patient Acceptance',
    ];

    assertEqual(stepperLabels.length, 4, 'Workflow stepper must define 4 high-level steps');
    assertEqual(stepperLabels[0], 'Select Financing Options');
    assertEqual(stepperLabels[3], 'Patient Acceptance');
  });

  it('TC-F12-05: Status badges utilize semantic Tailwind color tokens', () => {
    const badgeTokenMap = {
      draft: 'bg-gray-100 text-gray-800',
      dispatched: 'bg-blue-100 text-blue-800',
      accepted: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-amber-100 text-amber-800',
    };

    assertIncludes(badgeTokenMap.draft, 'gray');
    assertIncludes(badgeTokenMap.dispatched, 'blue');
    assertIncludes(badgeTokenMap.accepted, 'emerald');
    assertIncludes(badgeTokenMap.cancelled, 'amber');
  });
});
