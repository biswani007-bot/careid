/**
 * Tier 2 — Boundary 4: Statistics Calculations Edge Cases
 * Stress and boundary testing: empty sets, 100% cancelled, lowercase status handling,
 * and high-volume dataset aggregation performance.
 */

import { describe, it, assertEqual } from '../helpers/testUtils.ts';
import { calculateDashboardStatistics } from '../tier1_feature_coverage/feature04_authentic_dashboard_stats.test.ts';

describe('Tier 2 — Boundary 04: Statistics Calculations Edge Cases', () => {
  it('TC-B04-01: Empty appointments and offers arrays compute all metrics strictly to 0', () => {
    const stats = calculateDashboardStatistics([], []);
    assertEqual(stats.totalConsultations, 0);
    assertEqual(stats.activeScheduled, 0);
    assertEqual(stats.acceptedFinanced, 0);
    assertEqual(stats.proceduresCompleted, 0);
  });

  it('TC-B04-02: 100% cancelled appointments results in active = 0 and completed = 0', () => {
    const cancelledAppts = [
      { id: '1', status: 'CANCELLED' },
      { id: '2', status: 'CANCELLED' },
      { id: '3', status: 'CANCELLED' },
    ];
    const stats = calculateDashboardStatistics(cancelledAppts, []);
    assertEqual(stats.totalConsultations, 3);
    assertEqual(stats.activeScheduled, 0);
    assertEqual(stats.proceduresCompleted, 0);
  });

  it('TC-B04-03: 100% completed appointments results in active = 0 and completed = total', () => {
    const completedAppts = [
      { id: '1', status: 'COMPLETED' },
      { id: '2', status: 'COMPLETED' },
    ];
    const stats = calculateDashboardStatistics(completedAppts, []);
    assertEqual(stats.totalConsultations, 2);
    assertEqual(stats.activeScheduled, 0);
    assertEqual(stats.proceduresCompleted, 2);
  });

  it('TC-B04-04: Mixed lowercase / uppercase status values are normalized safely', () => {
    const mixedAppts = [
      { id: '1', status: 'scheduled' },
      { id: '2', status: 'Confirmed' },
      { id: '3', status: 'in_progress' },
      { id: '4', status: 'completed' },
    ];
    const mixedOffers = [
      { status: 'ratified_accepted' },
      { status: 'Draft' },
    ];
    const stats = calculateDashboardStatistics(mixedAppts, mixedOffers);
    assertEqual(stats.totalConsultations, 4);
    assertEqual(stats.activeScheduled, 3);
    assertEqual(stats.acceptedFinanced, 1);
    assertEqual(stats.proceduresCompleted, 1);
  });

  it('TC-B04-05: High-volume dataset (10,000 items) aggregates in under 50ms', () => {
    const largeAppts: Array<Record<string, unknown>> = [];
    for (let i = 0; i < 10000; i++) {
      largeAppts.push({
        id: `appt-${i}`,
        status: i % 2 === 0 ? 'CONFIRMED' : 'COMPLETED',
      });
    }

    const start = Date.now();
    const stats = calculateDashboardStatistics(largeAppts, []);
    const duration = Date.now() - start;

    assertEqual(stats.totalConsultations, 10000);
    assertEqual(stats.activeScheduled, 5000);
    assertEqual(stats.proceduresCompleted, 5000);
    assertEqual(duration < 50, true, `Aggregation of 10,000 items must be < 50ms, took ${duration}ms`);
  });
});
