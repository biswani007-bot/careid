/**
 * Tier 3 — Cross-Feature 7: Dashboard Statistics Live Metric Aggregation
 * Validates dynamic aggregation of live dashboard metrics across appointments
 * and treatment offer lifecycle transitions.
 */

import { describe, it, assertEqual, assertGreaterThanOrEqual } from '../helpers/testUtils.ts';
import {
  getDoctorAppointments,
  listTreatmentOffers,
} from '../helpers/consultationApiHelper.ts';
import { calculateDashboardStatistics } from '../tier1_feature_coverage/feature04_authentic_dashboard_stats.test.ts';

describe('Tier 3 — Cross-Feature 07: Dashboard Statistics Live Aggregation', () => {
  it('TC-X07-01: Metrics aggregated from live appointments and offers reflect authentic operational state', async () => {
    const apptsRes = await getDoctorAppointments();
    assertEqual(apptsRes.status, 200);
    const rawAppts = Array.isArray(apptsRes.body.data) ? apptsRes.body.data : [];

    const offersRes = await listTreatmentOffers();
    assertEqual(offersRes.status, 200);
    const rawOffers = offersRes.body.data?.data || [];

    const stats = calculateDashboardStatistics(rawAppts, rawOffers);
    assertEqual(stats.totalConsultations, rawAppts.length);
    assertGreaterThanOrEqual(stats.totalConsultations, 0);
    assertGreaterThanOrEqual(stats.activeScheduled, 0);
    assertGreaterThanOrEqual(stats.acceptedFinanced, 0);
    assertGreaterThanOrEqual(stats.proceduresCompleted, 0);
  });

  it('TC-X07-02: Ratifying an offer dynamically increments the Accepted & Financed metric', () => {
    const initialOffers = [{ status: 'DRAFT' }, { status: 'DISPATCHED' }];
    const initialStats = calculateDashboardStatistics([], initialOffers);
    assertEqual(initialStats.acceptedFinanced, 0);

    // Simulate patient acceptance
    const updatedOffers = [{ status: 'DRAFT' }, { status: 'RATIFIED_ACCEPTED' }];
    const updatedStats = calculateDashboardStatistics([], updatedOffers);
    assertEqual(updatedStats.acceptedFinanced, 1, 'Accepted & Financed must increment to 1');
  });
});
