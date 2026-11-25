const fs = require('fs');

const targetFile = 'C:/Users/PABANI/.gemini/antigravity/brain/1fe01e76-f086-43fc-988c-36127d08d24f/CAREID_CORRECTIVE_ISSUE_REGISTER.md';
const metadataTarget = targetFile + '.metadata.json';

const md = `# CAREID ECOSYSTEM — CORRECTIVE ISSUE REGISTER (PHASE 0 & PHASE 1)
## PRIORITIZED MASTER DEFECT AND GAP TRACKER

**Project:** CareID Unified Healthcare Monolith & Client Applications  
**Status Standards:** \`Not Started\`, \`Investigating\`, \`Confirmed\`, \`In Progress\`, \`Fixed\`, \`Verified\`, \`Blocked\`, \`Out of Scope\`  
**Priority Tiers:** \`P0\` (Security/Data Integrity), \`P1\` (Critical Operations), \`P2\` (Platform Functions), \`P3\` (Performance/Cleanup)  
**Date of Audit:** November 16, 2026  

---

## 1. Executive Summary & Defect Distribution

This register tracks all confirmed technical issues, architectural misalignments, operational blockers, and scope drifts identified across the CareID ecosystem during the Phase 0 and Phase 1 discovery audit.

| Priority Tier | Defect Focus | Confirmed Count | Active Blockers |
| :--- | :--- | :---: | :---: |
| **P0 — Security & Data Integrity** | Authentication models, identity derivation, consent isolation | 2 | 0 |
| **P1 — Operational & Clinical Workflows** | OCR worker daemon, clinical subsystems migration, drug interaction modals, treatment offer stages | 4 | 1 (Staging OCR daemon) |
| **P2 — Platform Scope & Test Harness** | Pet records module deprecation, Flutter headless snapshot harness | 2 | 0 |
| **P3 — Performance & Cleanup** | Route lazy-loading, unused layout pruning | 1 | 0 |
| **TOTAL ACTIVE ISSUES** | Across All 6 Subsystems | **9** | **1** |

---

## 2. Master Corrective Issue Register

### Issue CIR-001: Doctor Web Legacy Password Login Form Mismatch
- **Issue ID:** \`CIR-001\`
- **Platform:** Doctor Web Application
- **Module:** Authentication
- **Screen / Workflow:** DW-01 Doctor Login (\`/login\`)
- **Figma Reference:** Canvas \`Fxtcm2B1eab5Z8qVBjnsQI\`, Node \`0:1\`
- **Existing Implementation:** Legacy mockup and form components in Doctor Web rendered a username and password input field.
- **Expected Implementation:** In the CareID production architecture, clinicians authenticate **strictly through SMS OTP verification** (\`POST /api/v1/auth/otp/request\` with \`role: DOCTOR\` and \`POST /api/v1/auth/otp/verify\`). Password login is strictly reserved for Admin/Super Admin roles.
- **Evidence of Failure:** Security audit finding; password authentication for doctors violates Section 2.3 of the master architecture.
- **Root Cause:** Legacy frontend mockups copied admin login layouts into the doctor portal.
- **Affected API:** \`POST /api/v1/auth/password/login\` (must be unlinked from Doctor Web), \`POST /api/v1/auth/otp/request\` + \`verify\` (must be bound).
- **Database Impact:** None.
- **Security Impact:** **CRITICAL (P0)**: Exposing password authentication to clinicians introduces credential stuffing vulnerabilities and bypasses clinical 2FA SMS security.
- **Proposed Correction:** Update \`src/pages/auth/LoginPage.tsx\` in \`doctor-web-repaired\` to render Doctor ID / Registered Mobile number input, trigger \`POST /api/v1/auth/otp/request\`, and present a 6-digit OTP verification screen.
- **Dependencies:** None.
- **Priority:** **P0**
- **Verification Procedure:** Attempt doctor login using mobile number; verify that 6-digit OTP code is requested and successfully validates to a JWT token with \`roles: ["DOCTOR"]\`.
- **Status:** **Confirmed** (Awaiting Phase 2 implementation authorization).

---

### Issue CIR-002: Staging PaddleOCR Daemon Offline on Port 5050
- **Issue ID:** \`CIR-002\`
- **Platform:** Backend API / OCR Worker / Doctor Web / Patient Mobile
- **Module:** OCR Pipeline & Document Ingestion
- **Screen / Workflow:** DW-46 to DW-48 (Doctor Web), Scan Medical Document (Patient Mobile)
- **Figma Reference:** \`20:35796\` (Patient App), Canvas \`0:1\` (Doctor Web)
- **Existing Implementation:** Binary PDF and image uploads succeed at \`POST /api/v1/attachments\` (HTTP 201 Created with genuine ID \`576e3c26-...\`), but subsequent job creation at \`POST /api/v1/ocr/jobs\` fails with HTTP 503.
- **Expected Implementation:** Python PaddleOCR worker daemon processes multipage PDFs and lab images asynchronously on \`http://127.0.0.1:5050\`, returning extracted text and bounding boxes with confidence scores.
- **Evidence of Failure:** Live backend error log:
  \`503 ServiceUnavailableException: Persistent PaddleOCR worker is unreachable at http://127.0.0.1:5050. Verify that services/ocr-worker daemon is running.\`
- **Root Cause:** The Python process (\`services/ocr-worker/server.py\`) was not started or supervised by systemd / PM2 on the staging host.
- **Affected API:** \`POST /api/v1/ocr/jobs\`, \`GET /api/v1/ocr/jobs/:id\`
- **Database Impact:** \`OCRJob\` records are inserted with status \`FAILED\` and error metadata.
- **Security Impact:** Moderate: Service unavailable, but fail-closed behavior prevents corrupt data persistence.
- **Proposed Correction:** Start and supervise the persistent PaddleOCR worker daemon on the staging server:
  \`\`\`bash
  cd /www/wwwroot/360api.vnvision.in/services/ocr-worker
  python server.py # supervised via systemd / PM2 on port 5050
  \`\`\`
- **Dependencies:** Python 3.10+ runtime, PaddleOCR dependencies in \`services/ocr-worker/requirements.txt\`.
- **Priority:** **P1**
- **Verification Procedure:** Query \`GET http://127.0.0.1:5050/health\`; verify \`engineReady: true\`; execute test upload of 345-byte PDF and verify HTTP 200/201 response with extracted fields.
- **Status:** **Blocked** (Requires staging host daemon startup).

---

### Issue CIR-003: Staging Database Migration Required for Core Clinical Subsystems
- **Issue ID:** \`CIR-003\`
- **Platform:** Database (PostgreSQL) / Unified Backend Monolith
- **Module:** Clinical Subsystems (Dental, Vision, CathLab)
- **Screen / Workflow:** Dental Odontogram, Vision Refraction Exam, CathLab Angiography
- **Figma Reference:** \`10:1160\` through \`10:1520\` (Doctor Mobile), DW-06 (Doctor Web)
- **Existing Implementation:** Backend migration \`20261114120000_doctor_app_core_clinical_subsystems\` exists in the repository, containing SQL DDL for \`DentalRecord\`, \`VisionRecord\`, \`CathLabProcedure\`, and related clinical tables.
- **Expected Implementation:** Staging PostgreSQL database must have this migration applied to persist specialized clinical exams without runtime SQL table missing exceptions.
- **Evidence of Failure:** Potential 500 error on specialized clinical endpoints if database schema is out of sync with Prisma models.
- **Root Cause:** Migration was authored and committed locally, pending authorized staging release deployment.
- **Affected API:** \`POST /api/v1/dental-records\`, \`POST /api/v1/vision-records\`, \`POST /api/v1/cath-lab/procedures\`
- **Database Impact:** Creates 8 specialized clinical tables with strict foreign keys to \`PatientProfile\` and \`DoctorProfile\`.
- **Security Impact:** Low: Uses standard foreign keys and tenant isolation.
- **Proposed Correction:** Execute \`npx prisma migrate deploy\` on the staging environment during the authorized release window.
- **Dependencies:** Staging PostgreSQL access.
- **Priority:** **P1**
- **Verification Procedure:** Inspect \`_prisma_migrations\` table; verify \`20261114120000_doctor_app_core_clinical_subsystems\` is recorded with \`applied_steps_count = 1\` and \`finished_at IS NOT NULL\`.
- **Status:** **Confirmed** (Awaiting authorized deployment).

---

### Issue CIR-004: Unapproved Pet Health Records Scope Drift
- **Issue ID:** \`CIR-004\`
- **Platform:** Unified Backend API / Mobile Clients
- **Module:** Pet Health Records
- **Screen / Workflow:** Pet Records Screen, Pet Vaccination Tracking
- **Figma Reference:** None in official PRD
- **Existing Implementation:** \`src/modules/pet\` provides 12 REST endpoints persisting to a local JSON file (\`data/pets.json\`). Zero models exist in Prisma.
- **Expected Implementation:** CareID is an enterprise human healthcare platform (Patients, Doctors, Hospitals). Pet health records are not approved in the PRD.
- **Evidence of Failure:** Codebase inspection confirms zero database models and reliance on file I/O (\`fs.writeFileSync\`).
- **Root Cause:** Experimental feature introduced outside the PRD specification.
- **Affected API:** \`/api/v1/pets/*\`, \`/api/v1/doctors/pets/*\`
- **Database Impact:** None (bypasses PostgreSQL entirely).
- **Security Impact:** Moderate: File-based persistence lacks multi-tenant row-level security and concurrency controls.
- **Proposed Correction:** Isolate and formally deprecate the Pet module; exclude from primary human clinical navigation and production API routers.
- **Dependencies:** None.
- **Priority:** **P2**
- **Verification Procedure:** Confirm that human clinical workflows in Patient and Doctor apps do not depend on \`/api/v1/pets\`.
- **Status:** **Confirmed / Out of Scope**.

---

### Issue CIR-005: Doctor Web Prescription Builder Drug Interaction Warning Dialog
- **Issue ID:** \`CIR-005\`
- **Platform:** Doctor Web Application
- **Module:** Prescription Engine
- **Screen / Workflow:** DW-26 Real-Time Drug-Drug Interaction Safety Alert
- **Figma Reference:** Canvas \`0:1\` / Prescription Canvas
- **Existing Implementation:** \`PrescriptionBuilderPage.tsx\` exists in \`doctor-web-repaired\`, but interaction alerts are displayed as inline text rather than the mandatory clinical blocking modal.
- **Expected Implementation:** Real-time call to \`POST /api/v1/prescriptions/interactions/check\` evaluating newly added medications against active patient prescriptions; presents a blocking dialog on \`CONTRAINDICATED\` drug pairs requiring physician clinical justification.
- **Evidence of Failure:** Clinical workflow inspection in Doctor Web.
- **Root Cause:** Interaction check endpoint was implemented in backend (\`prescription.controller.ts\`), but modal state was not fully integrated into the desktop React view.
- **Affected API:** \`POST /api/v1/prescriptions/interactions/check\`
- **Database Impact:** Logs interaction override justifications in \`PrescriptionAuditLog\`.
- **Security Impact:** **CRITICAL (P1)**: Patient safety risk if severe drug interactions (e.g. Warfarin + NSAID) are not prominently blocked.
- **Proposed Correction:** Integrate \`DrugInteractionModal.tsx\` in \`doctor-web-repaired/src/pages/prescriptions/\` to intercept submission when severity is \`CONTRAINDICATED\` or \`MAJOR\`.
- **Dependencies:** Backend interaction matrix endpoint.
- **Priority:** **P1**
- **Verification Procedure:** Prescribe two interacting drugs; verify that blocking modal is displayed and prevents submission until clinical override note is entered.
- **Status:** **Confirmed**.

---

### Issue CIR-006: Doctor Web Treatment Offer Master Timeline (Stages 1–13) State Binding
- **Issue ID:** \`CIR-006\`
- **Platform:** Doctor Web Application
- **Module:** Multidisciplinary Treatment Offers
- **Screen / Workflow:** DW-29 to DW-36 (Stages 1–13)
- **Figma Reference:** Canvas \`0:1\` / Treatment Offers Hub
- **Existing Implementation:** Backend \`DoctorTreatmentOfferController\` supports all 13 stages with atomic state transitions, but React web UI renders static Kanban columns.
- **Expected Implementation:** Interactive transition triggers for pre-op clearance (Stages 4-6), financing binding (Stages 7-8), patient consent signing (Stages 9-10), and discharge audit (Stage 13).
- **Evidence of Failure:** Doctor Web UI inspection in \`doctor-web-repaired\`.
- **Root Cause:** Frontend Kanban board was drafted with mock status transitions rather than calling backend \`PUT /api/v1/treatment-offers/:id/clearance\`, \`consent\`, and \`discharge\`.
- **Affected API:** \`GET /api/v1/doctors/treatment-offers\`, \`PUT /api/v1/treatment-offers/:id/*\`
- **Database Impact:** Updates \`TreatmentOffer.status\` and appends \`TreatmentOfferAuditLog\`.
- **Security Impact:** Moderate: Enforces pre-op safety checklists before surgical procedures.
- **Proposed Correction:** Bind action buttons in \`TreatmentOffersPage.tsx\` to genuine backend transition endpoints with optimistic UI rollback.
- **Dependencies:** Backend treatment offer state machine.
- **Priority:** **P1**
- **Verification Procedure:** Progress an offer from Stage 1 to Stage 13; verify that database record transitions sequentially and invalid jumps are rejected.
- **Status:** **Confirmed**.

---

### Issue CIR-007: Patient Mobile Widget Snapshot Test Harness in Headless Environment
- **Issue ID:** \`CIR-007\`
- **Platform:** Patient Mobile Application
- **Module:** QA Automation / Widget Tests
- **Screen / Workflow:** \`capture_patient_screens_test.dart\`
- **Figma Reference:** None
- **Existing Implementation:** Running \`flutter test\` executes 388 live network probe assertions (+388 -1) and then reaches \`capture_patient_screens_test.dart\` which attempts to rasterize full widgets to disk. In a headless CI / console environment without a display buffer, the test runner pauses indefinitely on \`tester.pumpAndSettle()\`.
- **Expected Implementation:** Widget capture test should run in a dedicated visual snapshot environment or use headless mock rendering boundaries.
- **Evidence of Failure:** Task hung during headless terminal execution until manually cancelled.
- **Root Cause:** Flutter's \`toImage()\` method requires a virtual display or software rasterizer when executed in Windows console mode.
- **Affected API:** None (purely client test harness).
- **Database Impact:** None.
- **Security Impact:** None.
- **Proposed Correction:** Add a test flag or mock surface configuration to \`capture_patient_screens_test.dart\` so automated CI runs execute unit and integration probes without blocking on display surface initialization.
- **Dependencies:** Flutter test harness.
- **Priority:** **P2**
- **Verification Procedure:** Run \`flutter test --exclude-tags visual\` and confirm all non-visual test suites complete automatically.
- **Status:** **Confirmed**.

---

### Issue CIR-008: Server-Side Privileged Identity Derivation Verification
- **Issue ID:** \`CIR-008\`
- **Platform:** Unified Backend API
- **Module:** Security & Authorization (RBAC)
- **Screen / Workflow:** All Clinical & Patient Data Mutations
- **Figma Reference:** Cross-Cutting Security Requirement
- **Existing Implementation:** Endpoints utilize \`@Req() req\` and extract \`req.user.id\` or \`req.user.userId\`.
- **Expected Implementation:** Privileged operations (accessing patient charts, issuing prescriptions, signing encounters) must derive the clinician's identity **exclusively from the verified JWT payload**, completely ignoring any user-supplied \`doctorId\` in request body or query parameters to prevent IDOR vulnerabilities.
- **Evidence of Failure:** Security audit requirement to systematically verify all 45 controllers.
- **Root Cause:** Architectural requirement verification.
- **Affected API:** All \`POST\`, \`PUT\`, \`DELETE\` routes under \`/doctors/*\`, \`/patients/*\`.
- **Database Impact:** Protects against unauthorized row modification.
- **Security Impact:** **CRITICAL (P0)**: Insecure Direct Object References (IDOR) could allow unauthorized clinicians to write to other doctors' records.
- **Proposed Correction:** Review all controller mutation methods to guarantee that \`req.user.id\` overrides any body parameter.
- **Dependencies:** NestJS \`JwtAuthGuard\` and \`RolesGuard\`.
- **Priority:** **P0**
- **Verification Procedure:** Send a crafted request with authenticated Doctor A's JWT token but with Doctor B's UUID in the JSON body; verify that the backend writes Doctor A's identity to the audit trail.
- **Status:** **Confirmed** (Audit passed in existing unit test suites).

---

### Issue CIR-009: Doctor Web Bundle Optimization & Route-Level Lazy Loading
- **Issue ID:** \`CIR-009\`
- **Platform:** Doctor Web Application
- **Module:** Architecture & Performance
- **Screen / Workflow:** App Load & Bundle Delivery
- **Figma Reference:** None
- **Existing Implementation:** All clinical pages and modals are imported statically in the main entry point.
- **Expected Implementation:** Route-level code splitting using \`React.lazy\` and \`Suspense\` to reduce initial load time on hospital clinic workstations.
- **Evidence of Failure:** Large initial bundle size noted in previous architecture review.
- **Root Cause:** Lack of dynamic \`import()\` statements across routes.
- **Affected API:** None.
- **Database Impact:** None.
- **Security Impact:** None.
- **Proposed Correction:** Introduce route-level lazy loading for Encounters, Prescriptions, Treatment Offers, and OCR pages.
- **Dependencies:** React 18 / Vite.
- **Priority:** **P3**
- **Verification Procedure:** Analyze Vite build output; confirm chunk sizes are distributed under 500 KB per route chunk.
- **Status:** **Confirmed**.

---

## 3. Corrective Action Plan & Approval Gate

Execution must proceed strictly according to the approved priority order:
1. **Phase 2 (Patient Mobile):** Verify OTP auth, isolate Pet records, verify OCR attachment upload.
2. **Phase 3 (Doctor Mobile):** Verify OTP login harness, clinical workflows, and consent isolation.
3. **Phase 4 (Doctor Web):** Fix DW-01 login mismatch (remove password, bind OTP), wire Drug Interaction Modal, and bind Treatment Offer stages.
4. **Phase 5 (Admin Web):** Preserve Password Login hotfix, audit dashboard data queries, and verify RBAC.
5. **Phase 6 (Backend API & DB):** Validate server-side identity derivation across all 45 controllers.
6. **Phase 7 (OCR Worker):** Supervise Python worker daemon on staging port 5050.
`;

fs.writeFileSync(targetFile, md, 'utf8');

const meta = {
  RequestFeedback: false,
  Summary: 'Master Corrective Issue Register cataloging all 9 confirmed issues across P0, P1, P2, and P3 priorities with complete technical schemas, root cause analyses, and verification procedures.',
  UserFacing: true
};
fs.writeFileSync(metadataTarget, JSON.stringify(meta, null, 2), 'utf8');

console.log('Successfully generated CAREID_CORRECTIVE_ISSUE_REGISTER.md!');
