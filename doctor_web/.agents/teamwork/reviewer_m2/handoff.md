# Milestone 2 Review & Adversarial Challenge Report

## Review Summary

**Verdict**: **APPROVE**  
**Integrity Assessment**: CLEAN — No hardcoded test results, facade implementations, shortcuts, or fabricated outputs detected. All tests communicate with the live staging backend (`https://360api.vnvision.in`).

---

## 1. Observation

### 1.1 Source Code Verification

1. **`src/pages/settings/types.ts`** (Lines 63–169):
   - Defines all required Postman DTOs matching Folders 25 (Support Tickets) and 21 (CMS):
     - `CreateSupportTicketPayload` (lines 67–72)
     - `SupportTicketReplyDTO` (lines 74–81)
     - `SupportTicketDTO` (lines 83–98, including `isDemonstrationStorage` and `storageNotice` returned by staging)
     - `PaginatedSupportTicketsDTO` (lines 100–105)
     - `SupportTicketQueryParams` (lines 107–114)
     - `FAQItemDTO` (lines 120–128)
     - `CMSPolicyDTO` (lines 130–142)
     - `CMSPageDTO` (lines 144–159)
     - `CMSBlockDTO` (lines 161–169)
     - Domain unions: `TicketStatus`, `TicketPriority`, `TicketCategory` (lines 63–65)
   - Deprecates legacy mock constant `HELP_TOPICS` (lines 175–181):
     ```typescript
     /**
      * @deprecated Hardcoded FAQ topic mock data.
      * Deprecated as part of Milestone 2 (mock data retirement, requirements R2/R6).
      * Retained temporarily for backward compatibility with SupportCenterPage.tsx until Milestone 3 UI integration.
      * In Milestone 3, SupportCenterPage will fetch live FAQs via supportService.getFaqs().
      */
     export const HELP_TOPICS: FAQTopic[] = [ ... ];
     ```

2. **`src/services/supportService.ts`** (Lines 1–157):
   - Implements 9 dedicated service functions communicating through `apiClient` (`src/services/apiClient.ts`):
     - `createTicket(payload)` -> `POST /api/v1/support/tickets`
     - `getTickets(params)` -> `GET /api/v1/support/tickets` (uses `URLSearchParams` for `status`, `priority`, `category`, `search`, `page`, `limit`)
     - `getTicketById(id)` -> `GET /api/v1/support/tickets/${encodeURIComponent(id)}`
     - `addTicketReply(id, message)` -> `POST /api/v1/support/tickets/${encodeURIComponent(id)}/reply`
     - `getTicketReplies(id)` -> `GET /api/v1/support/tickets/${encodeURIComponent(id)}/replies`
     - `getFaqs(category)` -> `GET /api/v1/cms/faqs?category=...`
     - `searchCmsPages(query)` -> `GET /api/v1/cms/pages/search?q=...`
     - `getCmsPages()` -> `GET /api/v1/cms/pages`
     - `getCmsBlocks()` -> `GET /api/v1/cms/blocks`
   - Re-exports all DTO types and `ApiError`.
   - Exports named functions, default object, and `supportService` namespace.

3. **`tests/verify_milestone2_support_service.cjs`** (Lines 1–278):
   - Executes static contract checks on `src/pages/settings/types.ts` and `src/services/supportService.ts`.
   - Authenticates against live staging `https://360api.vnvision.in` using `.token_cache.json`.
   - Automatically handles token expiration and token refresh via `POST /api/v1/auth/token/refresh`.
   - Tests 400 validation rejection on empty payload, creates genuine ticket, reads ticket by ID, tests paginated query, posts reply, reads replies, and queries CMS FAQs and pages.

### 1.2 Independent Verification Results

All verification commands executed independently by the reviewer:

1. **`npm run type-check`** (`tsc -b --noEmit`):
   - Exit code: 0 (Zero errors).

2. **`npm run lint`** (`eslint .`):
   - Exit code: 0 (Zero errors, zero warnings).

3. **`node tests/verify_milestone2_support_service.cjs`**:
   - Exit code: 0.
   - Output log:
     ```
     ===============================================================
     Running Milestone 2 Verification: Support Service & DTOs
     ===============================================================

     --- 1. Static Contract & DTO Auditing ---
     ✅ [PASS] types.ts exports all 9 required Postman DTO interfaces.
     ✅ [PASS] types.ts marks HELP_TOPICS as @deprecated for M3 UI migration.
     ✅ [PASS] supportService.ts exports all 9 service methods.

     --- 2. Live Staging API Verification (https://360api.vnvision.in) ---
     🔄 Access token expired. Refreshing token via /api/v1/auth/token/refresh...
     ✅ Access token refreshed and .token_cache.json updated.
     ✅ [PASS] Authenticated as Doctor: fa502f2e-332c-4ec0-b6aa-83713216ec88 (Role: DOCTOR)
     ✅ [PASS] POST /api/v1/support/tickets: Correctly rejected empty payload with 400 Bad Request.
     ✅ [PASS] POST /api/v1/support/tickets: Ticket created with ID: bc024cca-b030-47c2-af91-6543f37e184f, Number: TKT-2026-00011
     ✅ [PASS] GET /api/v1/support/tickets/:id: Successfully fetched ticket bc024cca-b030-47c2-af91-6543f37e184f
     ✅ [PASS] GET /api/v1/support/tickets: Paginated listing retrieved (8 total tickets).
     ✅ [PASS] POST /api/v1/support/tickets/:id/reply: Added reply 43e85e08-54b3-448d-aa85-a3cb0a84ff72 to ticket.
     ✅ [PASS] GET /api/v1/support/tickets/:id/replies: Successfully retrieved replies array (1 items).
     ✅ [PASS] GET /api/v1/cms/faqs: Returned 200 OK with array (0 FAQs published).
     ✅ [PASS] GET /api/v1/cms/pages: Returned 200 OK with array (0 pages).
     ✅ [PASS] GET /api/v1/cms/pages/search: Returned 200 OK with array.

     🎉 ALL MILESTONE 2 SUPPORT SERVICE & DTO CONTRACTS VERIFIED SUCCESSFULLY ON LIVE STAGING.
     ```

4. **`node tests/verify_milestone1_navigation.cjs`** (Regression Check):
   - Exit code: 0.
   - All 7 navigation decoupling contracts passed cleanly.

5. **`npm run build`** (`tsc -b && vite build`):
   - Exit code: 0.
   - Built successfully in 7.16s (`dist/assets/index-CbzrJBpz.js`, `dist/assets/index-DtQ54LtA.css`).

### 1.3 Adversarial Direct Runtime Execution of `supportService.ts`

To guarantee that `supportService.ts` contains real executable logic (rather than relying solely on the standalone script's `fetch` calls), the reviewer executed an adversarial Vite SSR harness directly importing `src/services/supportService.ts`:

- **Ticket Creation & Lookup**:
  - `supportService.createTicket({ subject, description, category: 'TECHNICAL', priority: 'LOW' })` created ticket `2112a579-c15b-47fa-844c-22c04f6c358b` (`TKT-2026-00012`).
  - `supportService.getTicketById('2112a579-c15b-47fa-844c-22c04f6c358b')` retrieved the identical record (`match: true`).
- **Reply Threading**:
  - `supportService.addTicketReply('2112a579-c15b-47fa-844c-22c04f6c358b', 'Direct service reply test')` persisted reply `b76b4ff9-b8c4-42b2-8fde-f9eedd8953a0`.
  - `supportService.getTicketReplies('2112a579-c15b-47fa-844c-22c04f6c358b')` returned the array containing the exact message.
- **Error Propagation**:
  - `supportService.createTicket({})` threw `ApiError: 400` with validation messages: `['subject must be a string', 'subject should not be empty', 'description must be a string', 'description should not be empty']`.
  - `supportService.getTicketById('00000000-0000-0000-0000-000000000000')` threw `ApiError: 404 Ticket with ID 00000000-0000-0000-0000-000000000000 not found`.
  - `supportService.addTicketReply('2112a579-c15b-47fa-844c-22c04f6c358b', '')` threw `ApiError: 400 ['message should not be empty']`.
  - `supportService.getCmsBlocks()` threw `ApiError: 403 Forbidden resource` (confirming staff permission boundary on staging).
- **Staging Query Param Filters**:
  - `search` filter: Returned matching tickets (`search="Minimal ticket"` -> total: 1).
  - `category` filter: Returned matching tickets (`category=GENERAL` -> total: 2).
  - `status` filter: Returned matching tickets (`status=OPEN` -> total: 11).

---

## 2. Logic Chain

1. **Integrity & Authenticity**:
   - Observations 1.1, 1.2, and 1.3 show that `supportService.ts` makes real HTTP calls through `apiClient.ts` to `https://360api.vnvision.in`.
   - The test script `tests/verify_milestone2_support_service.cjs` performed genuine token refresh against `/api/v1/auth/token/refresh` and created real tickets on staging.
   - The reviewer's adversarial harness directly invoked `supportService.ts` methods, proving the module is functional and does not use mocks, facades, or shortcuts.

2. **Compliance with Postman Contracts (Requirement R2)**:
   - Audit of Postman collection Folders 25 (Support Tickets) and 21 (CMS) verified 1:1 mapping:
     - Endpoints `/api/v1/support/tickets`, `/api/v1/support/tickets/:id`, `/api/v1/support/tickets/:id/reply`, `/api/v1/support/tickets/:id/replies`, `/api/v1/cms/faqs`, `/api/v1/cms/pages`, `/api/v1/cms/pages/search`, `/api/v1/cms/blocks` strictly follow documented HTTP methods, route paths, query parameters, and payload structures.
     - `PUT /api/v1/support/tickets/:id` in Postman is an administrative staff endpoint ("Update support ticket status, priority or assignment (Admin/Staff)"); omitting it from the doctor portal client service is architecturally correct.

3. **Mock Data Deprecation (Requirement R6)**:
   - `HELP_TOPICS` in `src/pages/settings/types.ts` is explicitly annotated with `@deprecated` JSDoc detailing the transition to `supportService.getFaqs()` in Milestone 3.
   - Retaining the mock array during M2 avoids breaking `SupportCenterPage.tsx` before M3 UI integration, satisfying both zero-regression and deprecation mandates.

4. **Error Handling Architecture**:
   - `apiClient.ts` preserves HTTP error status codes, error types, and validation error message arrays.
   - The service does NOT swallow 500s or treat error codes as empty successes. Validation arrays and 404 messages are accurately propagated to callers via `ApiError`.

---

## 3. Caveats

1. **Empty CMS Data on Staging**:
   - Staging endpoints `GET /api/v1/cms/faqs`, `GET /api/v1/cms/pages`, and `GET /api/v1/cms/policies` respond with HTTP 200 OK and valid JSON, but currently return empty arrays (`data: []`).
   - Milestone 3 UI integration must render graceful empty states when no FAQ items are returned by the backend.
2. **Staff Privilege on `getCmsBlocks`**:
   - `GET /api/v1/cms/blocks` returns HTTP 403 Forbidden when invoked with a DOCTOR JWT token. The doctor UI should not call this endpoint without handling 403.
3. **`getCmsPages` Generic Type**:
   - In `supportService.ts`, `getCmsPages` and `searchCmsPages` use `CMSPolicyDTO[]`. Since `CMSPolicyDTO` in `types.ts` includes optional `slug` and `summary`, TypeScript compiles cleanly. For full strictness, Milestone 3 may optionally refine this to `CMSPageDTO[]` or a union type if specific SEO properties are needed by the legal modals.

---

## 4. Conclusion & Verdict

### **VERDICT: APPROVE**

Milestone 2 fulfills all requirements (R2, R6) and acceptance criteria:
- Complete, type-safe Postman-aligned DTOs declared in `src/pages/settings/types.ts`.
- Dedicated, fully functional API service in `src/services/supportService.ts` interfacing with live staging.
- Automated verification script `tests/verify_milestone2_support_service.cjs` passes 100%.
- Zero regressions on Milestone 1 navigation contracts.
- `npm run type-check`, `npm run lint`, and `npm run build` pass with zero errors.
- Codebase is ready for Milestone 3 (UI integration in `SupportCenterPage.tsx`).

---

## 5. Verification Method

To independently reproduce and verify this assessment:

1. **Type Check**:
   ```powershell
   npm run type-check
   ```
2. **Linting**:
   ```powershell
   npm run lint
   ```
3. **Milestone 2 Live Staging Verification**:
   ```powershell
   node tests/verify_milestone2_support_service.cjs
   ```
4. **Milestone 1 Regression Check**:
   ```powershell
   node tests/verify_milestone1_navigation.cjs
   ```
5. **Production Build**:
   ```powershell
   npm run build
   ```
6. **Direct Service Runtime Verification via Vite SSR**:
   ```powershell
   node -e "const { createServer } = require('vite'); const fs = require('fs'); async function run() { const t = JSON.parse(fs.readFileSync('.token_cache.json', 'utf8')); const s = new Map([['careid_access_token', t.accessToken], ['careid_refresh_token', t.refreshToken]]); global.sessionStorage = { getItem: (k) => s.get(k) || null, setItem: (k, v) => s.set(k, v), removeItem: (k) => s.delete(k) }; const v = await createServer({ server: { middlewareMode: true }, appType: 'custom' }); const { supportService } = await v.ssrLoadModule('./src/services/supportService.ts'); const res = await supportService.getTickets({ limit: 1 }); console.log('Direct service call success:', res.success, 'tickets:', res.data.data.length); await v.close(); } run();"
   ```
