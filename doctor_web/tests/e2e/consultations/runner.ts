/**
 * CareID Doctor Web Portal — Consultations & Treatment Lifecycle Master E2E Runner
 * Executes Tiers 1-4 opaque-box E2E test suites against live backend https://360api.vnvision.in/api/v1
 *
 * Usage:
 *   node --experimental-strip-types tests/e2e/consultations/runner.ts
 *   node --experimental-strip-types tests/e2e/consultations/runner.ts --tier=1
 *   node --experimental-strip-types tests/e2e/consultations/runner.ts --tier=2
 *   node --experimental-strip-types tests/e2e/consultations/runner.ts --tier=3
 *   node --experimental-strip-types tests/e2e/consultations/runner.ts --tier=4
 */

import { getRegisteredSuites } from './helpers/testUtils.ts';
import type { TestResult } from './helpers/testUtils.ts';
import { getDoctorToken } from './helpers/consultationApiHelper.ts';

// -----------------------------------------------------------------------------
// Tier 1 Suites: Feature Coverage (Features 1 - 14)
// -----------------------------------------------------------------------------
import './tier1_feature_coverage/feature01_treatment_offer_api_service.test.ts';
import './tier1_feature_coverage/feature02_financing_integration.test.ts';
import './tier1_feature_coverage/feature03_clean_dtos_mock_removal.test.ts';
import './tier1_feature_coverage/feature04_authentic_dashboard_stats.test.ts';
import './tier1_feature_coverage/feature05_trajectory_18_stage_navigation.test.ts';
import './tier1_feature_coverage/feature06_live_consultation_listing_filters.test.ts';
import './tier1_feature_coverage/feature07_step1_financing_options_live.test.ts';
import './tier1_feature_coverage/feature08_step2_configure_offer_persistence.test.ts';
import './tier1_feature_coverage/feature09_step3_review_real_dispatch.test.ts';
import './tier1_feature_coverage/feature10_step4_patient_acceptance_status.test.ts';
import './tier1_feature_coverage/feature11_workflow_state_persistence_refresh.test.ts';
import './tier1_feature_coverage/feature12_pixel_for_pixel_ui_preservation.test.ts';
import './tier1_feature_coverage/feature13_e2e_testing_suite_quality_gates.test.ts';
import './tier1_feature_coverage/feature14_tier5_adversarial_hardening.test.ts';
import './patient_selection_workflow.test.ts';

// -----------------------------------------------------------------------------
// Tier 2 Suites: Boundary & Corner Cases (Boundaries 1 - 14)
// -----------------------------------------------------------------------------
import './tier2_boundary_corner/boundary01_treatment_offer_payloads.test.ts';
import './tier2_boundary_corner/boundary02_financing_limits_tenures.test.ts';
import './tier2_boundary_corner/boundary03_dto_schema_strictness.test.ts';
import './tier2_boundary_corner/boundary04_statistics_edge_cases.test.ts';
import './tier2_boundary_corner/boundary05_trajectory_navigation_edges.test.ts';
import './tier2_boundary_corner/boundary06_consultation_search_filter_edges.test.ts';
import './tier2_boundary_corner/boundary07_step1_demographics_edges.test.ts';
import './tier2_boundary_corner/boundary08_step2_pricing_discount_edges.test.ts';
import './tier2_boundary_corner/boundary09_step3_dispatch_version_edges.test.ts';
import './tier2_boundary_corner/boundary10_step4_status_query_expiry_edges.test.ts';
import './tier2_boundary_corner/boundary11_refresh_state_loss_edges.test.ts';
import './tier2_boundary_corner/boundary12_ui_responsive_overflow_edges.test.ts';
import './tier2_boundary_corner/boundary13_quality_gate_checks_edges.test.ts';
import './tier2_boundary_corner/boundary14_concurrency_race_conditions.test.ts';

// -----------------------------------------------------------------------------
// Tier 3 Suites: Cross-Feature Combinations (Cross 1 - 8)
// -----------------------------------------------------------------------------
import './tier3_cross_feature/cross01_financing_selection_to_offer_draft.test.ts';
import './tier3_cross_feature/cross02_multi_procedure_to_dispatch_transition.test.ts';
import './tier3_cross_feature/cross03_offer_creation_and_acceptance_lifecycle.test.ts';
import './tier3_cross_feature/cross04_offer_creation_and_rejection_lifecycle.test.ts';
import './tier3_cross_feature/cross05_doctor_cancellation_lifecycle.test.ts';
import './tier3_cross_feature/cross06_consultation_listing_reflection.test.ts';
import './tier3_cross_feature/cross07_dashboard_stats_live_aggregation.test.ts';
import './tier3_cross_feature/cross08_stepper_step_to_step_integrity.test.ts';

// -----------------------------------------------------------------------------
// Tier 4 Suites: Real-World Clinical Scenarios (Clinical 1 - 6)
// -----------------------------------------------------------------------------
import './tier4_real_world_clinical/clinical01_interventional_cardiology_angiogram.test.ts';
import './tier4_real_world_clinical/clinical02_orthopedic_knee_replacement_financing.test.ts';
import './tier4_real_world_clinical/clinical03_ophthalmology_cataract_phacoemulsification.test.ts';
import './tier4_real_world_clinical/clinical04_general_surgery_laparoscopic_cholecystectomy.test.ts';
import './tier4_real_world_clinical/clinical05_multi_specialty_consultation_attestation.test.ts';
import './tier4_real_world_clinical/clinical06_consultation_cancel_and_alternative_plan.test.ts';

async function main() {
  const args = process.argv.slice(2);
  const tierArg = args.find((a) => a.startsWith('--tier='));
  const filterTier = tierArg ? tierArg.split('=')[1].trim() : 'all';

  console.log('='.repeat(80));
  console.log(' CareID Doctor Web Portal — Consultations & Treatment Lifecycle E2E Suite');
  console.log(' Target Backend: https://360api.vnvision.in/api/v1');
  console.log(` Selected Tier Filter: ${filterTier}`);
  console.log('='.repeat(80));

  // Warm live doctor authentication session
  console.log('[Runner] Acquiring live doctor session token...');
  try {
    const token = await getDoctorToken();
    console.log(`[Runner] Doctor authenticated successfully (Token length: ${token.length})`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Runner] Doctor authentication notice: ${msg}`);
  }

  const allSuites = getRegisteredSuites();
  let targetSuites = allSuites;

  if (filterTier === '1') {
    targetSuites = allSuites.filter((s) => s.tier === 1);
  } else if (filterTier === '2') {
    targetSuites = allSuites.filter((s) => s.tier === 2);
  } else if (filterTier === '3') {
    targetSuites = allSuites.filter((s) => s.tier === 3);
  } else if (filterTier === '4') {
    targetSuites = allSuites.filter((s) => s.tier === 4);
  }

  console.log(`[Runner] Total registered suites: ${allSuites.length} | Suites to execute: ${targetSuites.length}`);

  const results: TestResult[] = [];
  const tierStats: Record<number, { total: number; passed: number; failed: number }> = {
    1: { total: 0, passed: 0, failed: 0 },
    2: { total: 0, passed: 0, failed: 0 },
    3: { total: 0, passed: 0, failed: 0 },
    4: { total: 0, passed: 0, failed: 0 },
  };

  const overallStart = Date.now();

  for (const suite of targetSuites) {
    console.log(`\n▶ Suite [Tier ${suite.tier}]: ${suite.name}`);
    for (const testCase of suite.tests) {
      const testStart = Date.now();
      tierStats[suite.tier].total++;
      try {
        await Promise.race([
          testCase.fn(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Test timed out after ${testCase.timeoutMs}ms`)), testCase.timeoutMs)
          ),
        ]);
        const duration = Date.now() - testStart;
        results.push({
          suiteName: suite.name,
          testName: testCase.name,
          passed: true,
          durationMs: duration,
        });
        tierStats[suite.tier].passed++;
        console.log(`  ✔ PASS [${duration}ms] ${testCase.name}`);
      } catch (err: unknown) {
        const duration = Date.now() - testStart;
        const errMessage = err instanceof Error ? err.message : String(err);
        results.push({
          suiteName: suite.name,
          testName: testCase.name,
          passed: false,
          durationMs: duration,
          error: errMessage,
        });
        tierStats[suite.tier].failed++;
        console.log(`  ✖ FAIL [${duration}ms] ${testCase.name}`);
        console.log(`    ↳ Error: ${errMessage}`);
      }
    }
  }

  const totalTime = Date.now() - overallStart;
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';

  console.log('\n' + '='.repeat(80));
  console.log(' CONSULTATIONS & TREATMENT LIFECYCLE E2E TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(` Total Suites Executed : ${targetSuites.length}`);
  console.log(` Total Test Cases      : ${total}`);
  console.log(` Total Passed          : ${passed}`);
  console.log(` Total Failed          : ${failed}`);
  console.log(` Overall Pass Rate     : ${passRate}%`);
  console.log(` Total Execution Time  : ${(totalTime / 1000).toFixed(2)}s`);
  console.log('-'.repeat(80));
  console.log(' TIER BREAKDOWN:');
  console.log(`   Tier 1 (Feature Coverage)      : ${tierStats[1].passed} / ${tierStats[1].total} passed (${tierStats[1].total > 0 ? ((tierStats[1].passed / tierStats[1].total) * 100).toFixed(1) : 0}%)`);
  console.log(`   Tier 2 (Boundary & Corner)     : ${tierStats[2].passed} / ${tierStats[2].total} passed (${tierStats[2].total > 0 ? ((tierStats[2].passed / tierStats[2].total) * 100).toFixed(1) : 0}%)`);
  console.log(`   Tier 3 (Cross-Feature Pairwise): ${tierStats[3].passed} / ${tierStats[3].total} passed (${tierStats[3].total > 0 ? ((tierStats[3].passed / tierStats[3].total) * 100).toFixed(1) : 0}%)`);
  console.log(`   Tier 4 (Real-World Clinical)   : ${tierStats[4].passed} / ${tierStats[4].total} passed (${tierStats[4].total > 0 ? ((tierStats[4].passed / tierStats[4].total) * 100).toFixed(1) : 0}%)`);
  console.log('='.repeat(80));

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r, idx) => {
        console.log(`  ${idx + 1}. [${r.suiteName}] ${r.testName}`);
        console.log(`     Error: ${r.error}`);
      });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[Runner Fatal Error]', err);
  process.exit(1);
});
