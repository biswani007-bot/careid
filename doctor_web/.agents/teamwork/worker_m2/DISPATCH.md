# Dispatch: Worker Milestone 2 — Support API Service & TypeScript DTOs

## Objective
Implement `src/services/supportService.ts` and define Postman-aligned TypeScript DTOs in `src/pages/settings/types.ts`. Ensure mock data is deprecated/retired according to requirements R2, R6. Create an automated test runner `tests/verify_milestone2_support_service.cjs` to verify all methods against the live staging API and local static checks.

## Authoritative Inputs
- ORIGINAL_REQUEST.md: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md`
- PROJECT.md: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\PROJECT.md`
- Survey Handoff: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\spec_miner_support_survey_1\handoff.md`
- Token Cache: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.token_cache.json`
- Existing API Client: `src/services/apiClient.ts`
- Reference Service: `src/services/profileService.ts`

## File Ownership
- Exclusively owns:
  - `src/services/supportService.ts` (NEW)
  - `src/pages/settings/types.ts` (EDIT)
  - `tests/verify_milestone2_support_service.cjs` (NEW)
- DO NOT modify `SupportCenterPage.tsx` or other files in this milestone (owned by M3). Ensure `HELP_TOPICS` in `types.ts` is handled cleanly (e.g. mark `@deprecated` or retain type compatibility so `npm run type-check` remains 100% green without breaking `SupportCenterPage.tsx`).

## Scope & Specifications
1. `src/pages/settings/types.ts`:
   - Export all Postman-aligned interfaces:
     - `CreateSupportTicketPayload` (`subject: string`, `description: string`, `category?: string`, `priority?: string`)
     - `SupportTicketReplyDTO` (`id: string`, `ticketId?: string`, `userId?: string`, `userRole?: string`, `message: string`, `createdAt: string`)
     - `SupportTicketDTO` (`id: string`, `ticketNumber: string`, `userId: string`, `subject: string`, `description: string`, `category: string`, `priority: string`, `status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'`, `assignedTo?: string`, `replies?: SupportTicketReplyDTO[]`, `createdAt: string`, `updatedAt: string`, `isDemonstrationStorage?: boolean`, `storageNotice?: string`)
     - `PaginatedSupportTicketsDTO` (`data: SupportTicketDTO[]`, `total: number`, `page: number`, `limit: number`)
     - `SupportTicketQueryParams` (`status?: string`, `priority?: string`, `category?: string`, `search?: string`, `page?: number`, `limit?: number`)
     - `FAQItemDTO` (`id: string`, `question: string`, `answer: string`, `category: string`, `displayOrder: number`, `status: string`, `createdAt: string`)
     - `CMSPolicyDTO` (`id: string`, `title: string`, `policyType: string`, `version: string`, `content: string`, `effectiveDate: string`, `status: string`, `createdAt: string`, `updatedAt: string`)
   - Mark `HELP_TOPICS` as deprecated with clear comments that it will be removed during M3 UI integration, keeping temporary compatibility so `SupportCenterPage.tsx` builds.

2. `src/services/supportService.ts`:
   - Re-use `apiClient`, `ApiResponse`, and `ApiError` from `./apiClient`.
   - Implement methods:
     - `createTicket(payload: CreateSupportTicketPayload): Promise<ApiResponse<SupportTicketDTO>>` -> `POST /api/v1/support/tickets`
     - `getTickets(params?: SupportTicketQueryParams): Promise<ApiResponse<PaginatedSupportTicketsDTO>>` -> `GET /api/v1/support/tickets` with URL query parameters
     - `getTicketById(id: string): Promise<ApiResponse<SupportTicketDTO>>` -> `GET /api/v1/support/tickets/:id`
     - `addTicketReply(id: string, message: string): Promise<ApiResponse<SupportTicketReplyDTO>>` -> `POST /api/v1/support/tickets/:id/reply` with `{ message }`
     - `getTicketReplies(id: string): Promise<ApiResponse<SupportTicketReplyDTO[]>>` -> `GET /api/v1/support/tickets/:id/replies`
     - `getFaqs(category?: string): Promise<ApiResponse<FAQItemDTO[]>>` -> `GET /api/v1/cms/faqs` with optional category
     - `searchCmsPages(query: string): Promise<ApiResponse<CMSPolicyDTO[]>>` -> `GET /api/v1/cms/pages/search?q=${query}`
     - `getCmsPages(): Promise<ApiResponse<CMSPolicyDTO[]>>` -> `GET /api/v1/cms/pages`
     - `getCmsBlocks(): Promise<ApiResponse<unknown[]>>` -> `GET /api/v1/cms/blocks`
   - Export `supportService` object and individual functions.

3. `tests/verify_milestone2_support_service.cjs`:
   - Node script using `fetch` or importing tokens from `.token_cache.json`.
   - Verify:
     - Token validation against `/api/v1/auth/me`.
     - `POST /api/v1/support/tickets` validation rejection on empty body (400).
     - `POST /api/v1/support/tickets` creation with valid doctor credentials.
     - `GET /api/v1/support/tickets` listing paginated tickets.
     - `POST /api/v1/support/tickets/:id/reply` adding a reply to the created ticket.
     - `GET /api/v1/support/tickets/:id/replies` retrieving replies.
     - `GET /api/v1/cms/faqs` retrieving FAQs (returns 200 with array).
     - Static check verifying all required DTO interfaces exist and are exported in `src/pages/settings/types.ts`.

4. Verification Commands:
   - `npm run type-check`
   - `npm run lint`
   - `node tests/verify_milestone2_support_service.cjs`
   - `node tests/verify_milestone1_navigation.cjs` (regression check)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Completion Requirements
Write handoff report to `.agents/teamwork/worker_m2/handoff.md` documenting:
- Observation (what was implemented, files touched)
- Logic Chain (how Postman schema was satisfied)
- Caveats
- Conclusion
- Verification commands & exact terminal outputs


## 2026-11-11T13:47:23Z
You are assigned to implement Milestone 2 of the CareID Doctor Web Portal Support Module Integration.

Read your task dispatch file at:
d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\worker_m2\DISPATCH.md

Also read the authoritative requirements at:
d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md
and the project master plan at:
d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\PROJECT.md

Scope:
- Implement `src/services/supportService.ts` according to Postman contracts.
- Define and export all Postman-aligned TypeScript DTOs in `src/pages/settings/types.ts`.
- Create and run `tests/verify_milestone2_support_service.cjs` against live staging API (`https://360api.vnvision.in`).
- Run `npm run type-check`, `npm run lint`, and verify all tests pass.
- Write your comprehensive handoff report to `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\worker_m2\handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
