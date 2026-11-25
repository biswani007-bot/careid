# Dispatch: Worker Milestone 3 — Standalone Support Page UI Integration

## Objective
Integrate `src/pages/settings/SupportCenterPage.tsx` with live backend APIs via `supportService.ts`:
1. Wire Help Center & FAQs to `supportService.getFaqs()` with graceful empty state and clean search/category filtering.
2. Connect "Submit IT Support Ticket" to `supportService.createTicket()`, displaying genuine backend ticket number / reference ID and authentic error messages.
3. Integrate ticket history (submitted tickets, status, priority, dates, replies) within existing UI elements (e.g. view recent tickets within the ticket modal) without adding new UI cards or screens to the Bento grid.
4. Replace fake phone `+1 (800) 555-CARE` and fake SLA `< 15 min` with truthful unconfigured indicators (`—` / unconfigured notice) while preserving exact UI card layout and dimensions.
5. In `src/pages/settings/types.ts`, remove the deprecated `HELP_TOPICS` mock constant completely.
6. Verify static checks (`npm run type-check`, `npm run lint`, `npm run build`) and create `tests/verify_milestone3_ui_integration.cjs`.

## Authoritative Inputs
- ORIGINAL_REQUEST.md: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md`
- PROJECT.md: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\PROJECT.md`
- Support Service: `src/services/supportService.ts`
- TypeScript Types: `src/pages/settings/types.ts`
- Token Cache: `.token_cache.json`

## File Ownership
- Exclusively owns:
  - `src/pages/settings/SupportCenterPage.tsx`
  - `src/pages/settings/types.ts` (remove `HELP_TOPICS` completely)
  - `tests/verify_milestone3_ui_integration.cjs` (NEW)
- DO NOT touch files owned by other milestones (`routes/index.tsx`, `PatientLayout.tsx`, `Header.tsx`).

## Implementation Details
1. **FAQ & Help Center (R3)**:
   - Call `supportService.getFaqs()` on component mount.
   - Map returned `FAQItemDTO` to topic items. If backend returns empty array `[]` (as staging currently does), show a clean empty state in the accordion area: "No published help topics found. Please search or submit a support ticket."
   - Search bar filters question and answer text. Quick topic buttons filter by category.
2. **Submit IT Support Ticket (R4)**:
   - When form is submitted:
     - Map priority (`Normal` -> `'LOW'`, `High` -> `'HIGH'`, `STAT` -> `'URGENT'`).
     - Map category (`'CLINICAL'`, `'TECHNICAL'`, `'ACCOUNT'`, etc.).
     - Call `await supportService.createTicket({ subject, description, category, priority })`.
     - On success: show toast with real backend ticket number: `showToast(\`Support ticket #\${res.data.ticketNumber || res.data.id} submitted successfully\`)`.
     - Reset form fields, close modal.
     - On error: catch `ApiError` and display actual backend error message in toast or banner (`err.message`).
     - Provide loading indicator during submission.
     - Remove the local simulation disclaimer banner (`Demonstration Note: This ticket submission is simulated locally...`).
3. **Ticket History (R4)**:
   - Inside the Ticket modal, provide a tab or toggle to switch between "New Ticket" and "Recent Tickets" (calling `supportService.getTickets({ limit: 10 })`).
   - For recent tickets, display: ticketNumber, subject, status badge (OPEN, IN_PROGRESS, RESOLVED, CLOSED), priority badge, created date, and expandable thread showing replies.
   - No new cards or screens added to the main Bento grid layout!
4. **Direct Assistance Verification (R5)**:
   - Replace fake phone number `+1 (800) 555-CARE (Ext. 09)` with `— (Unconfigured)` or `Not Configured`.
   - Replace fake SLA `< 15 minutes for STAT` with `— (Standard Support)` or `Standard Institutional`.
   - In Helpdesk Call modal: update description to state direct telephone hotline is unconfigured for this environment, and guide doctor to submit an IT ticket.
   - Maintain the exact card dimensions, typography, colors, and layout.
5. **Mock Data Removal (R6)**:
   - Remove `HELP_TOPICS` constant and its `FAQTopic` interface if no longer needed from `src/pages/settings/types.ts`.
   - Ensure zero mock data remain across `SupportCenterPage.tsx`.

## Verification Commands
- `npm run type-check`
- `npm run lint`
- `node tests/verify_milestone3_ui_integration.cjs`
- `node tests/verify_milestone2_support_service.cjs` (regression check)
- `node tests/verify_milestone1_navigation.cjs` (regression check)
- `npm run build`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Completion Requirements
Write handoff report to `.agents/teamwork/worker_m3/handoff.md`.


## 2026-11-11T15:03:04Z
You are assigned to implement Milestone 3 of the CareID Doctor Web Portal Support Module Integration.

Read your task dispatch file at:
d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\worker_m3\DISPATCH.md

Also read the authoritative requirements at:
d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md
and the project master plan at:
d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\PROJECT.md

Scope:
- Wire `src/pages/settings/SupportCenterPage.tsx` to `supportService.ts` for FAQs, ticket creation, and ticket history.
- Replace fake phone and fake SLA with truthful unconfigured indicators while preserving card layout and styling.
- Remove `HELP_TOPICS` from `src/pages/settings/types.ts`.
- Create and run `tests/verify_milestone3_ui_integration.cjs`.
- Run all static checks (`npm run type-check`, `npm run lint`, `npm run build`) and regression test suites.
- Write your comprehensive handoff report to `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\worker_m3\handoff.md`.
