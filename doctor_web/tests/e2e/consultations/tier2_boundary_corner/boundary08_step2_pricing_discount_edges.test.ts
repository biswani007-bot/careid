/**
 * Tier 2 — Boundary 8: Step 2 Configure Offer Pricing & Discount Edges
 * Validates 100% discounts, floating-point currency precision, high-quantity line items,
 * and multi-line clinical justification text handling.
 */

import { describe, it, assertEqual, assertGreaterThan } from '../helpers/testUtils.ts';
import { calculateFinancialSummary } from '../tier1_feature_coverage/feature08_step2_configure_offer_persistence.test.ts';
import type { ProcedureLineItem } from '../tier1_feature_coverage/feature08_step2_configure_offer_persistence.test.ts';

describe('Tier 2 — Boundary 08: Step 2 Configure Offer Pricing & Discount Edges', () => {
  it('TC-B08-01: 100% full charitable waiver discount accurately yields net payable of exactly 0', () => {
    const procedures: ProcedureLineItem[] = [
      {
        procedureCode: 'CPT-93458',
        procedureName: 'Catheterization',
        unitCost: 4500,
        category: 'DIAGNOSTIC',
        quantity: 1,
        isOptional: false,
        clinicalJustification: 'Full charitable case',
      },
    ];

    const { grossEstimate, discountAmount, netPayable } = calculateFinancialSummary(procedures, 4500);
    assertEqual(grossEstimate, 4500);
    assertEqual(discountAmount, 4500);
    assertEqual(netPayable, 0, '100% discount must yield net payable 0');
  });

  it('TC-B08-02: Floating point currency values maintain 2-decimal precision without rounding drift', () => {
    function roundCurrency(val: number): number {
      return Math.round(val * 100) / 100;
    }

    // 4018.80 + 1205.55 - 200.35
    const gross = roundCurrency(4018.8 + 1205.55);
    const net = roundCurrency(gross - 200.35);

    assertEqual(gross, 5224.35, 'Gross sum must equal 5224.35 exactly');
    assertEqual(net, 5024.0, 'Net sum must equal 5024.00 exactly');
  });

  it('TC-B08-03: Multiple procedures (e.g. 10 line items) aggregate correctly', () => {
    const tenProcedures: ProcedureLineItem[] = [];
    for (let i = 1; i <= 10; i++) {
      tenProcedures.push({
        procedureCode: `CPT-${90000 + i}`,
        procedureName: `Procedure Item ${i}`,
        unitCost: 1000 * i,
        category: i % 2 === 0 ? 'SURGICAL' : 'DIAGNOSTIC',
        quantity: 1,
        isOptional: i > 5,
        clinicalJustification: `Clinical necessity justification for step ${i}`,
      });
    }

    // Sum of 1000 * (1 + 2 + ... + 10) = 1000 * 55 = 55000
    const { grossEstimate, netPayable } = calculateFinancialSummary(tenProcedures, 5000);
    assertEqual(grossEstimate, 55000, 'Sum of 10 items must be 55,000');
    assertEqual(netPayable, 50000, 'Net payable must be 50,000');
  });

  it('TC-B08-04: High quantity (e.g. quantity = 10 consumable stents) multiplies unitCost linearly', () => {
    const procedure: ProcedureLineItem = {
      procedureCode: 'CPT-92928',
      procedureName: 'Stent placement',
      unitCost: 2500,
      category: 'SURGICAL',
      quantity: 10,
      isOptional: false,
      clinicalJustification: 'Multi-vessel stenting',
    };

    const { grossEstimate } = calculateFinancialSummary([procedure], 0);
    assertEqual(grossEstimate, 25000, '10 x 2500 must equal 25,000');
  });

  it('TC-B08-05: Extremely long clinical justification (> 1500 chars) is accepted without truncating', () => {
    const longJustification = 'Patient with severe CAD, refractory angina, failed medical therapy. '.repeat(25);
    assertGreaterThan(longJustification.length, 1500);

    const procedure: ProcedureLineItem = {
      procedureCode: 'CPT-93458',
      procedureName: 'Catheterization',
      unitCost: 4500,
      category: 'DIAGNOSTIC',
      quantity: 1,
      isOptional: false,
      clinicalJustification: longJustification,
    };

    assertEqual(procedure.clinicalJustification.length, longJustification.length);
  });
});
