/**
 * Tier 2 — Boundary 6: Consultation Filter & Search Boundaries
 * Boundary validation of search and filter engines: regex metacharacters safety,
 * whitespace trimming, unicode search, and empty filter sets.
 */

import { describe, it, assertEqual } from '../helpers/testUtils.ts';
import { filterConsultations } from '../tier1_feature_coverage/feature06_live_consultation_listing_filters.test.ts';
import type { ConsultationItem } from '../tier1_feature_coverage/feature06_live_consultation_listing_filters.test.ts';

describe('Tier 2 — Boundary 06: Consultation Filter & Search Boundaries', () => {
  const sampleItems: ConsultationItem[] = [
    {
      id: '1',
      patientName: 'Marcus Doe',
      patientMrn: 'PT-CAREID-2026-0004',
      facilityName: 'Metro General Hospital',
      doctorName: 'Dr. Sarah Jenkins',
      appointmentDate: '2026-11-09',
      status: 'CONFIRMED',
      procedureName: 'Left Heart Catheterization',
      title: 'Cardiac Evaluation',
    },
    {
      id: '2',
      patientName: 'Jane Smith (Specialist)',
      patientMrn: 'PT-CAREID-2026-0010',
      facilityName: 'Metro General Hospital',
      doctorName: 'Dr. Sarah Jenkins',
      appointmentDate: '2026-11-09',
      status: 'COMPLETED',
      procedureName: 'Knee Arthroplasty',
      title: 'Orthopedic Consult',
    },
  ];

  it('TC-B06-01: Regex metacharacters in search query (.*+?^${}()|[]) do not crash the filter', () => {
    // Queries containing regex characters that would throw in new RegExp(query) if unescaped
    const dangerousQueries = ['.*', '[a-z]+', '(specialist)', '^PT-', '$', '??', '{2,4}'];

    for (const q of dangerousQueries) {
      let threw = false;
      try {
        const results = filterConsultations(sampleItems, 'ALL', q);
        assertEqual(Array.isArray(results), true);
      } catch {
        threw = true;
      }
      assertEqual(threw, false, `Query "${q}" must not throw regex parsing exception`);
    }
  });

  it('TC-B06-02: Leading and trailing whitespace is trimmed in search matching', () => {
    const paddedResults = filterConsultations(sampleItems, 'ALL', '   Marcus   ');
    assertEqual(paddedResults.length, 1, 'Whitespace-padded search must match Marcus Doe');
    assertEqual(paddedResults[0].id, '1');
  });

  it('TC-B06-03: Search matching against partial MRN with hyphen succeeds', () => {
    const mrnResults = filterConsultations(sampleItems, 'ALL', '-0004');
    assertEqual(mrnResults.length, 1, 'Search "-0004" should find PT-CAREID-2026-0004');
    assertEqual(mrnResults[0].id, '1');
  });

  it('TC-B06-04: Non-matching query returns empty array without throwing', () => {
    const noMatch = filterConsultations(sampleItems, 'ALL', 'xyz-999-nonexistent');
    assertEqual(noMatch.length, 0, 'No match returns empty array');
  });

  it('TC-B06-05: Empty dataset with search query returns empty array', () => {
    const emptyResults = filterConsultations([], 'ALL', 'Marcus');
    assertEqual(emptyResults.length, 0, 'Empty dataset produces empty result');
  });
});
