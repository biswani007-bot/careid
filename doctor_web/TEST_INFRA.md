# CareID Doctor Web Portal — Consultations & Treatment Lifecycle Test Infrastructure

**Document Version**: 2.0.0  
**Target Backend**: `https://360api.vnvision.in/api/v1`  
**Authoritative Contracts**: Postman Collection (`Postman collection/CareID-Staging.postman_collection.json`)  
**Scope**: Module A (Consultations & 18-Stage Trajectory: `/treatment-offers`) & Module B (Multi-Step Treatment Offer Creation Stepper: `/treatment-offers/new/step-1` to `step-4`, `/review`, `/status`, `/accepted`)  
**Author**: E2E Testing Orchestrator / Test Writer (`test_writer_e2e_consultations_1`)  
**Status**: APPROVED & ACTIVE  

---

## 1. Test Philosophy & Core Principles

The test suite for the Consultations & Treatment Lifecycle is engineered around five fundamental principles:

1. **Opaque-Box Empirical Verification**:
   Tests interact exclusively with authentic public contracts — live HTTP endpoints on `https://360api.vnvision.in/api/v1`, real doctor bearer tokens, exported TypeScript service interfaces, and observable UI state. No internal mocks, fake in-memory state machines, or simulated promises are accepted as proof of correctness.

2. **Zero Mock & Hardcoded Data Elimination**:
   All static placeholders, fake patient names ("Robert"), hardcoded consultation IDs (`TR-8921`), fabricated CPT codes (`#93458`), simulated timers (`setTimeout(600)`), and mock `localStorage` stores (`careid_treatment_offers_store`) are systematically audited and rejected.

3. **Progressive Testability**:
   Test suites are organized into strict operational tiers. Tier 1 independently verifies API contracts, transport headers, DTO validation, and service methods without requiring a full browser DOM. Tiers 2-4 progress from boundary condition stress tests to cross-feature pairwise integrations, culminating in realistic end-to-end clinical workflows.

4. **Defensive Contract & Backend Resiliency**:
   Where backend endpoints exhibit known staging limitations (e.g., HTTP 500 on `/doctors/patients` or dispatch notification triggers), tests verify precise error categorization (`ApiError`), graceful error recovery, optimistic lock conflict detection (`HTTP 409`), and defensive fallback to authenticated doctor context without frontend crashes.

5. **Pixel-for-Pixel UI Preservation**:
   All tests assert that UI layout structures, 18-stage pipeline cards, color indicators, typography tokens, button labels, and accessibility attributes strictly preserve the approved clinical design.

---

## 2. Test Architecture & Tier Hierarchy

The test harness is implemented in TypeScript and executed via Node 22+ native type-stripping (`node --experimental-strip-types`), guaranteeing zero external bundling friction and sub-second cold starts.

```
tests/e2e/consultations/
├── helpers/
│   ├── consultationApiHelper.ts       # Live HTTP client for Treatment Offers, Financing & Appointments
│   ├── fixtures.ts                    # Realistic clinical scenarios, CPT codes, DTO payloads, boundary data
│   └── testUtils.ts                   # Standardized assertion primitives & suite registry
├── tier1_feature_coverage/            # Features 1 - 14 (≥5 tests per feature; ≥70 tests)
│   ├── feature01_treatment_offer_api_service.test.ts
│   ├── feature02_financing_integration.test.ts
│   ├── feature03_clean_dtos_mock_removal.test.ts
│   ├── feature04_authentic_dashboard_stats.test.ts
│   ├── feature05_trajectory_18_stage_navigation.test.ts
│   ├── feature06_live_consultation_listing_filters.test.ts
│   ├── feature07_step1_financing_options_live.test.ts
│   ├── feature08_step2_configure_offer_persistence.test.ts
│   ├── feature09_step3_review_real_dispatch.test.ts
│   ├── feature10_step4_patient_acceptance_status.test.ts
│   ├── feature11_workflow_state_persistence_refresh.test.ts
│   ├── feature12_pixel_for_pixel_ui_preservation.test.ts
│   ├── feature13_e2e_testing_suite_quality_gates.test.ts
│   └── feature14_tier5_adversarial_hardening.test.ts
├── tier2_boundary_corner/             # Boundary & stress testing (≥5 tests per feature; ≥70 tests)
│   ├── boundary01_treatment_offer_payloads.test.ts
│   ├── boundary02_financing_limits_tenures.test.ts
│   ├── boundary03_dto_schema_strictness.test.ts
│   ├── boundary04_statistics_edge_cases.test.ts
│   ├── boundary05_trajectory_navigation_edges.test.ts
│   ├── boundary06_consultation_search_filter_edges.test.ts
│   ├── boundary07_step1_demographics_edges.test.ts
│   ├── boundary08_step2_pricing_discount_edges.test.ts
│   ├── boundary09_step3_dispatch_version_edges.test.ts
│   ├── boundary10_step4_status_query_expiry_edges.test.ts
│   ├── boundary11_refresh_state_loss_edges.test.ts
│   ├── boundary12_ui_responsive_overflow_edges.test.ts
│   ├── boundary13_quality_gate_checks_edges.test.ts
│   └── boundary14_concurrency_race_conditions.test.ts
├── tier3_cross_feature/               # Pairwise cross-feature interactions (8 suites; ≥16 tests)
│   ├── cross01_financing_selection_to_offer_draft.test.ts
│   ├── cross02_multi_procedure_to_dispatch_transition.test.ts
│   ├── cross03_offer_creation_and_acceptance_lifecycle.test.ts
│   ├── cross04_offer_creation_and_rejection_lifecycle.test.ts
│   ├── cross05_doctor_cancellation_lifecycle.test.ts
│   ├── cross06_consultation_listing_reflection.test.ts
│   ├── cross07_dashboard_stats_live_aggregation.test.ts
│   └── cross08_stepper_step_to_step_integrity.test.ts
├── tier4_real_world_clinical/         # Multi-step clinical workflows (6 suites; ≥12 tests)
│   ├── clinical01_interventional_cardiology_angiogram.test.ts
│   ├── clinical02_orthopedic_knee_replacement_financing.test.ts
│   ├── clinical03_ophthalmology_cataract_phacoemulsification.test.ts
│   ├── clinical04_general_surgery_laparoscopic_cholecystectomy.test.ts
│   ├── clinical05_multi_specialty_consultation_attestation.test.ts
│   └── clinical06_consultation_cancel_and_alternative_plan.test.ts
└── runner.ts                          # Master test orchestrator & CLI reporter
```

---

## 3. Feature Inventory (14 Features from PROJECT.md)

| Feature # | Feature Name | Primary Endpoint / Module | Description & Scope | Minimum Target Tests |
|:---:|:---|:---|:---|:---:|
| **F01** | Treatment Offer API Service | `POST /doctors/treatment-offers`, `GET ...`, `PUT ...`, `POST .../cancel` | Full REST client for draft creation, listing, details query, updates with optimistic locking, and cancellation. | ≥ 5 |
| **F02** | Live Healthcare Financing Integration | `GET /financing/options`, `offers`, `POST /financing/apply` | Integration with partner financing catalog (CareCredit, MediLend, HealthVault) and EMI application submission. | ≥ 5 |
| **F03** | Clean DTOs & Service Mock Removal | `src/services/consultationService.ts`, `types.ts` | Complete elimination of `localStorage` mock stores, static CPT injections, and dummy fallback objects. | ≥ 5 |
| **F04** | Authentic Dashboard Statistics | `/treatment-offers` Dashboard | Dynamic calculation of Total Consultations, Active/Scheduled, Accepted & Financed, Procedures Completed from live data. | ≥ 5 |
| **F05** | Dynamic 18-Stage Trajectory Navigation | `/treatment-offers` Trajectory | Connecting 18 clinical stages to live appointment/offer models; marking missing sub-endpoints (9, 11, 14, 16) as NOT IMPLEMENTED. | ≥ 5 |
| **F06** | Live Consultation Listing & Filters | `/treatment-offers` Listing | Authentic records display, All/Active/Accepted/Completed tabs, real-time patient search query, and manual refresh trigger. | ≥ 5 |
| **F07** | Step 1 Financing Options Live Data | `/treatment-offers/new/step-1` | Live patient demographic context, authentic partner options, baseline tenure & APR binding, passing data to Step 2. | ≥ 5 |
| **F08** | Step 2 Configure Offer Persistence | `/treatment-offers/new/step-2` | Procedure line items, unit costs, quantity, discount deduction, clinical necessity, remarks conforming to DTO. | ≥ 5 |
| **F09** | Step 3 Review & Real Dispatch | `/treatment-offers/:id/review` | Proposal draft submission, attestation certification, real dispatch endpoint call, elimination of fake 600ms timer. | ≥ 5 |
| **F10** | Step 4 Authentic Patient Acceptance Status | `/treatment-offers/:id/status`, `/accepted` | Querying real lifecycle status via `GET .../status`, eliminating hardcoded dates and mock acceptance states. | ≥ 5 |
| **F11** | Workflow State Persistence Across Refresh | Stepper routes & state management | Recovery of offer context via URL path / query params when `location.state` is lost; duplicate submission prevention. | ≥ 5 |
| **F12** | Pixel-for-Pixel UI Preservation | All Consultation & Stepper Pages | Strict preservation of layout dimensions, colors, status badges, typography, lucide icons, and button styling. | ≥ 5 |
| **F13** | E2E Testing Suite & Quality Gates | Test runner, TypeScript, ESLint | 100% pass rate across test tiers, zero `tsc` type errors, zero `eslint` violations, clean production Vite build. | ≥ 5 |
| **F14** | Tier 5 Adversarial Coverage Hardening | Test harness & security probes | Stress testing concurrent operations, optimistic lock conflicts (`409`), SQL/script injection defense, unauthenticated access blocks. | ≥ 5 |

---

## 4. Coverage Thresholds & Quality Gates

To guarantee production readiness, code merges must satisfy all following gates:

1. **Test Suite Pass Rate**:
   - Tier 1 (Feature Coverage): **100% Pass** (≥ 70 tests across 14 features)
   - Tier 2 (Boundary & Corner): **100% Pass** (≥ 70 tests across 14 features)
   - Tier 3 (Cross-Feature): **100% Pass** (≥ 16 tests across 8 suites)
   - Tier 4 (Real-World Clinical): **100% Pass** (≥ 12 tests across 6 suites)
   - Overall suite pass rate: **100%** (≥ 168 tests total).

2. **Static Analysis & Type Integrity**:
   - `npm run type-check` (`tsc -b --noEmit`): **0 errors, 0 warnings**.
   - `npm run lint` (`eslint .`): **0 errors, 0 warnings**.
   - Build Verification (`npm run build`): **Vite production build succeeds** without unresolved module errors.

3. **Data Integrity Audits**:
   - Zero occurrences of `careid_treatment_offers_store` in active services.
   - Zero occurrences of hardcoded patient `"Robert"` or ID `"8472-9901"`.
   - Zero occurrences of hardcoded offer ID `"TR-8921"`.
   - Zero occurrences of fake `setTimeout` operations simulating API latency.

---

## 5. Execution Commands & CLI Options

The test harness supports selective tier execution, individual suite execution, and full end-to-end runs:

```bash
# Execute entire E2E test suite (Tiers 1-4)
node --experimental-strip-types tests/e2e/consultations/runner.ts

# Execute specific tier
node --experimental-strip-types tests/e2e/consultations/runner.ts --tier=1
node --experimental-strip-types tests/e2e/consultations/runner.ts --tier=2
node --experimental-strip-types tests/e2e/consultations/runner.ts --tier=3
node --experimental-strip-types tests/e2e/consultations/runner.ts --tier=4

# Run via npm script
npm run test:consultations
```
