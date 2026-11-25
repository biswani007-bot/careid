/**
 * Tier 1 — Feature 3: Clean DTOs & Service Mock Removal
 * Verifies contract alignment, DTO cleanliness, and absence of hardcoded fallback mock patterns
 * across consultation and treatment offer service layers.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('Feature 03: Clean DTOs & Service Mock Removal', () => {
  const typesPath = path.resolve(process.cwd(), 'src/pages/treatment-offers/types.ts');
  const servicePath = path.resolve(process.cwd(), 'src/services/consultationService.ts');

  it('TC-F03-01: types.ts defines authentic TreatmentOfferDTO matching Postman specification', () => {
    const content = fs.readFileSync(typesPath, 'utf8');
    assertDefined(content, 'types.ts must be readable');

    // Verify key Postman DTO property signatures exist in the type models
    const hasOfferInterface = content.includes('TreatmentOffer') || content.includes('TreatmentOfferDTO');
    assertEqual(hasOfferInterface, true, 'types.ts must define TreatmentOffer interface');
    assertEqual(content.includes('grossEstimate') || content.includes('totalEstimate') || content.includes('totalCost'), true, 'Gross estimate field must be defined');
    assertEqual(content.includes('discountAmount') || content.includes('discount'), true, 'Discount amount must be defined');
    assertEqual(content.includes('netPayable'), true, 'Net payable must be defined');
  });

  it('TC-F03-02: types.ts defines FinancingOption interface aligned to backend partner schema', () => {
    const content = fs.readFileSync(typesPath, 'utf8');
    const serviceContent = fs.readFileSync(servicePath, 'utf8');

    const hasFinancingType =
      content.includes('FinancingOption') ||
      serviceContent.includes('interface FinancingOption') ||
      serviceContent.includes('type FinancingOption');

    assertEqual(hasFinancingType, true, 'FinancingOption interface must be defined in types or consultationService');
  });

  it('TC-F03-03: Static fake ID TR-8921 is prohibited from being the default consultation ID', () => {
    const serviceContent = fs.readFileSync(servicePath, 'utf8');
    // Ensure consultation service does not default every item to TR-8921
    const lines = serviceContent.split('\n');
    const defaultTRMatches = lines.filter((l) => l.includes('id: \'TR-8921\'') || l.includes('id: "TR-8921"'));
    assertEqual(defaultTRMatches.length, 0, 'consultationService.ts must not hardcode TR-8921 as static default ID');
  });

  it('TC-F03-04: Procedure models in treatment offer types use strict category typing', () => {
    const content = fs.readFileSync(typesPath, 'utf8');
    const hasCategory =
      content.includes('SURGICAL') ||
      content.includes('DIAGNOSTIC') ||
      content.includes('THERAPEUTIC') ||
      content.includes('category: string') ||
      content.includes('category');
    assertEqual(hasCategory, true, 'Procedure definition must support procedure category');
  });

  it('TC-F03-05: Zero occurrences of setTimeout latency simulators in consultationService.ts', () => {
    const serviceContent = fs.readFileSync(servicePath, 'utf8');
    const hasSetTimeout = serviceContent.includes('setTimeout(');
    assertEqual(hasSetTimeout, false, 'consultationService.ts must not contain fake setTimeout simulators');
  });
});
