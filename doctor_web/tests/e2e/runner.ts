/**
 * CareID Doctor Web Portal - Comprehensive E2E Master Test Runner
 * Executes Tiers 1-4 opaque-box E2E test suites against live backend https://360api.vnvision.in
 *
 * Usage:
 *   node --experimental-strip-types tests/e2e/runner.ts
 *   node --experimental-strip-types tests/e2e/runner.ts --tier=1
 *   node --experimental-strip-types tests/e2e/runner.ts --tier=2
 *   node --experimental-strip-types tests/e2e/runner.ts --tier=3
 *   node --experimental-strip-types tests/e2e/runner.ts --tier=4
 */

import { getRegisteredSuites } from './helpers/testUtils.ts';
import type { TestResult } from './helpers/testUtils.ts';
import { getDoctorToken } from './helpers/authHelper.ts';

// -----------------------------------------------------------------------------
// Import Tier 1 Suites: Feature Coverage (Features 1 - 15)
// -----------------------------------------------------------------------------
import './tier1_feature_coverage/feature01_multipart_client.test.ts';
import './tier1_feature_coverage/feature02_patient_demographics.test.ts';
import './tier1_feature_coverage/feature03_file_picker_upload.test.ts';
import './tier1_feature_coverage/feature04_camera_scan_capture.test.ts';
import './tier1_feature_coverage/feature05_multipage_pdf_import.test.ts';
import './tier1_feature_coverage/feature06_eliminate_object_url.test.ts';
import './tier1_feature_coverage/feature07_real_ocr_job_submission.test.ts';
import './tier1_feature_coverage/feature08_ocr_status_polling.test.ts';
import './tier1_feature_coverage/feature09_structured_fields_extraction.test.ts';
import './tier1_feature_coverage/feature10_dynamic_review_binding.test.ts';
import './tier1_feature_coverage/feature11_clinical_value_editing.test.ts';
import './tier1_feature_coverage/feature12_mock_data_removal.test.ts';
import './tier1_feature_coverage/feature13_medical_record_persistence.test.ts';
import './tier1_feature_coverage/feature14_duplicate_submission_prevention.test.ts';
import './tier1_feature_coverage/feature15_recent_uploads_sync.test.ts';

// -----------------------------------------------------------------------------
// Import Tier 2 Suites: Boundary & Corner Cases (Boundaries 1 - 15)
// -----------------------------------------------------------------------------
import './tier2_boundary_corner/boundary01_multipart_limits.test.ts';
import './tier2_boundary_corner/boundary02_patient_context_edge.test.ts';
import './tier2_boundary_corner/boundary03_upload_file_boundaries.test.ts';
import './tier2_boundary_corner/boundary04_camera_capture_edge.test.ts';
import './tier2_boundary_corner/boundary05_multipage_pdf_edge.test.ts';
import './tier2_boundary_corner/boundary06_object_url_security.test.ts';
import './tier2_boundary_corner/boundary07_ocr_submission_edge.test.ts';
import './tier2_boundary_corner/boundary08_ocr_polling_edge.test.ts';
import './tier2_boundary_corner/boundary09_fields_extraction_edge.test.ts';
import './tier2_boundary_corner/boundary10_dynamic_binding_edge.test.ts';
import './tier2_boundary_corner/boundary11_editing_boundaries.test.ts';
import './tier2_boundary_corner/boundary12_mock_elimination_edge.test.ts';
import './tier2_boundary_corner/boundary13_persistence_boundaries.test.ts';
import './tier2_boundary_corner/boundary14_duplicate_prevention_edge.test.ts';
import './tier2_boundary_corner/boundary15_recent_uploads_edge.test.ts';

// -----------------------------------------------------------------------------
// Import Tier 3 Suites: Cross-Feature Combinations (Cross 1 - 5)
// -----------------------------------------------------------------------------
import './tier3_cross_feature/cross01_camera_to_clinical_persistence.test.ts';
import './tier3_cross_feature/cross02_pdf_polling_correction_recent_sync.test.ts';
import './tier3_cross_feature/cross03_patient_mismatch_hard_stop.test.ts';
import './tier3_cross_feature/cross04_ocr_failure_recovery_flow.test.ts';
import './tier3_cross_feature/cross05_multi_format_batch_workflow.test.ts';

// -----------------------------------------------------------------------------
// Import Tier 4 Suites: Real-World Clinical Scenarios (Scenarios 1 - 8)
// -----------------------------------------------------------------------------
import './tier4_real_world_clinical/clinical01_complete_blood_count.test.ts';
import './tier4_real_world_clinical/clinical02_lipid_profile.test.ts';
import './tier4_real_world_clinical/clinical03_comprehensive_metabolic_panel.test.ts';
import './tier4_real_world_clinical/clinical04_thyroid_function_panel.test.ts';
import './tier4_real_world_clinical/clinical05_diagnostic_imaging_radiology.test.ts';
import './tier4_real_world_clinical/clinical06_multipage_pathology_summary.test.ts';
import './tier4_real_world_clinical/clinical07_urinalysis_microscopic.test.ts';
import './tier4_real_world_clinical/clinical08_cardiac_biomarkers_emergency.test.ts';

async function run() {
  const args = process.argv.slice(2);
  const tierArg = args.find((a) => a.startsWith('--tier='));
  const filterTier = tierArg ? tierArg.split('=')[1].trim() : 'all';

  console.log('='.repeat(80));
  console.log(' CareID Doctor Web Portal — Master E2E Test Suite');
  console.log(' Target Backend: https://360api.vnvision.in/api/v1');
  console.log(` Filter Tier: ${filterTier}`);
  console.log('='.repeat(80));

  // Warm authentication session upfront
  console.log('[Runner] Initializing live doctor session authentication...');
  try {
    const token = await getDoctorToken();
    console.log(`[Runner] Doctor authenticated successfully (Token length: ${token.length})`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Runner] Session warning: ${msg}. Continuing with cached/best-effort tokens.`);
  }

  const allSuites = getRegisteredSuites();
  let targetSuites = allSuites;

  if (filterTier === '1') {
    targetSuites = allSuites.filter((s) => s.name.startsWith('Feature'));
  } else if (filterTier === '2') {
    targetSuites = allSuites.filter((s) => s.name.startsWith('Tier 2'));
  } else if (filterTier === '3') {
    targetSuites = allSuites.filter((s) => s.name.startsWith('Tier 3'));
  } else if (filterTier === '4') {
    targetSuites = allSuites.filter((s) => s.name.startsWith('Tier 4'));
  }

  const results: TestResult[] = [];
  const overallStart = Date.now();

  for (const suite of targetSuites) {
    console.log(`\n▶ Suite: ${suite.name}`);
    for (const testCase of suite.tests) {
      const testStart = Date.now();
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
  console.log(' E2E TEST EXECUTION SUMMARY');
  console.log('='.repeat(80));
  console.log(` Total Suites Executed : ${targetSuites.length}`);
  console.log(` Total Test Cases      : ${total}`);
  console.log(` Passed                : ${passed}`);
  console.log(` Failed                : ${failed}`);
  console.log(` Pass Rate             : ${passRate}%`);
  console.log(` Execution Time        : ${(totalTime / 1000).toFixed(2)}s`);
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

run().catch((err) => {
  console.error('[Runner Fatal Error]', err);
  process.exit(1);
});
