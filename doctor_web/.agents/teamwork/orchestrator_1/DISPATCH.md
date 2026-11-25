## 2026-11-09T17:45:36Z

Perform a complete forensic audit of CareID Clinical & Financing Trajectory Stages 6–15 in doctor-web-frontend-main without modifying any source code, producing a detailed stage-wise audit report.

Working directory: d:\New folder\New folder\doctor web\doctor-web-frontend-main
Integrity mode: demo
The team must NOT: modify any existing source code, configuration, or UI files in the workspace.

Backend: https://360api.vnvision.in/api/v1
API Source of Truth: Postman collection/CareID-Staging.postman_collection.json
Figma Reference: https://www.figma.com/design/Fxtcm2B1eab5Z8qVBjnsQI/CareID_int?node-id=0-1&m=dev and analysis_reports/01_figma_design_inventory.md

## Requirements

### R1. Stage-by-Stage Forensic Audit (Stages 6–15)
Perform an exhaustive forensic audit across Stages 6–15 (Clinical Review, Dispatched Status, Offer Accepted, Pre-Op Clearance, Suite Scheduling, Hold Review, Slot Confirmed, Appointment Ledger, Pre-Op Readiness, Day-of-Checkin), leaving Stages 1–5 unmodified. For each stage, inspect:
1. React component and route binding.
2. Figma design correspondence against the authoritative Figma URL and analysis_reports/01_figma_design_inventory.md.
3. Backend API availability via static contract analysis against Postman collection/CareID-Staging.postman_collection.json and frontend services.
4. Actual service implementation.
5. Request and response DTO alignment.
6. Patient and treatment-offer ID propagation.
7. Authentication and authorization.
8. Loading, error, and empty states.
9. Actual data persistence.
10. Hardcoded values and mock data.
11. Lifecycle transition validation.
12. Refresh and direct URL hydration.

### R2. Stage-Specific Critical Invariants Verification
Verify critical requirements per stage without assumptions:
- Stage 6: Actual treatment offer retrieval, clinical review data, and real dispatch operation with no simulated dispatch.
- Stage 7: Actual dispatch status, real-time status retrieval, and correct cancellation workflow with no fake polling or status changes.
- Stage 8: Actual patient acceptance status and authentic offer/patient data with no assumed acceptance.
- Stage 9: Actual clearance information and identified missing APIs with no automatic clearance completion.
- Stage 10: Real facility/suite availability and actual scheduling/appointment persistence with no fabricated slots.
- Stage 11: Actual hold status and review with no simulated approval or release.
- Stage 12: Actual confirmed appointment and correct appointment/offer relationship with no fabricated confirmation.
- Stage 13: Authentic appointment ledger with actual appointment date, time, patient, and procedure.
- Stage 14: Actual pre-operative readiness information and real clinical prerequisites with no fabricated lab or clearance results.
- Stage 15: Actual day-of-check-in information, real patient/appointment identification, and persisted check-in state.

### R3. Strict Read-Only Audit Constraints
Operate strictly as an audit without modifying source code, UI, backend, or configurations. Do not create new APIs, invent endpoints, or add features. Do not mark a stage complete merely because its React component exists. Verify actual API contracts against the Postman collection and distinguish implemented, partially implemented, missing, and unverified functionality.

### R4. Comprehensive Forensic Audit Report
Generate the final audit report saved at analysis_reports/stages_6_15_forensic_audit.md containing:
1. Stage-wise summary table:
   | Stage | Component | Route | API | Mock Data | UI Match | Actual Status |
2. Section A: Fully implemented stages.
3. Section B: Partially implemented stages.
4. Section C: Missing backend APIs.
5. Section D: Missing frontend functionality.
6. Section E: Hardcoded data locations.
7. Section F: Broken navigation and ID propagation.
8. Section G: Figma mismatches.
9. Section H: Required implementation order.
10. Section I: Static analysis verification results (TypeScript type-check, ESLint, and build execution).

## Verification Resources
- Postman Collection: `Postman collection/CareID-Staging.postman_collection.json`
- Staging Backend API reference: `https://360api.vnvision.in/api/v1`
- Figma Workspace: `https://www.figma.com/design/Fxtcm2B1eab5Z8qVBjnsQI/CareID_int?node-id=0-1&m=dev`
- Existing Design Inventory: `analysis_reports/01_figma_design_inventory.md`
- Quality verification commands: `npm run type-check`, `npm run lint`, `npm run build`

## Acceptance Criteria

### Audit Scope & Stage Coverage
- [ ] Every stage from 6 through 15 is audited across all 12 investigation dimensions.
- [ ] Stages 1 through 5 are verified to be untouched with no modifications.
- [ ] Zero source code, UI, or configuration files are modified in the repository.

### Contract & Implementation Verification
- [ ] Every API endpoint referenced across Stages 6–15 is checked against `Postman collection/CareID-Staging.postman_collection.json`.
- [ ] Implemented, partially implemented, missing, and unverified functionality are clearly categorized for all 10 stages.
- [ ] Critical checks for Stages 6 through 15 are explicitly evaluated against real implementations versus mocks/simulations.

### Report Generation & Static Checks
- [ ] The final forensic audit report is written to `analysis_reports/stages_6_15_forensic_audit.md`.
- [ ] The report contains the complete 7-column stage-wise table covering Stages 6–15.
- [ ] Sections A through I are populated with concrete file paths, line numbers, and implementation ordering.
- [ ] Static check commands (`npm run type-check`, `npm run lint`, `npm run build`) are executed and their actual outputs/results documented in Section I.
