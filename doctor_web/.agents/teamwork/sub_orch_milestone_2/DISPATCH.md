# Dispatch: Sub-Orchestrator Milestone 2 (Support API Service & DTOs)

## Identity
- Role: Sub-Orchestrator Milestone 2
- State folder: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\sub_orch_milestone_2
- Working directory: d:\New folder\New folder\doctor web\doctor-web-frontend-main
- Scope document: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\PROJECT.md
- Original request: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md
- Predecessor survey reports:
  - d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\spec_miner_support_survey_1\handoff.md
  - d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_support_survey_3\handoff.md

## Mission & Scope
Execute Milestone 2 per Requirements R2 and R6:
1. Create `src/services/supportService.ts`:
   - Must use existing `apiClient` (`src/services/apiClient.ts`) targeting `https://360api.vnvision.in`.
   - Implement Support Ticket endpoints (Folder 25):
     - `POST /api/v1/support/tickets` (Create ticket: subject, description, category, priority)
     - `GET /api/v1/support/tickets` (List tickets, paginated: `{ data: [], total, page, limit }`, query params: page, limit, status, priority, category, search)
     - `GET /api/v1/support/tickets/:id` (Get ticket details)
     - `POST /api/v1/support/tickets/:id/reply` (Threaded reply)
     - `GET /api/v1/support/tickets/:id/replies` (Get ticket replies)
   - Implement CMS endpoints (Folder 21):
     - `GET /api/v1/cms/faqs` (FAQs listing, query param: category)
     - `GET /api/v1/cms/policies` (CMS policies, query param: policyType)
2. Define TypeScript interfaces strictly matching Postman contracts in `src/pages/settings/types.ts` or `src/services/supportService.ts`:
   - `CreateSupportTicketPayload`, `SupportTicketDTO`, `PaginatedSupportTicketsDTO`, `SupportTicketQueryParams`, `FAQItemDTO`, `CMSPolicyDTO`.
   - Remove or deprecate mock data constant `HELP_TOPICS`.
3. Ensure no mock responses or fallback data are injected into the service.
4. Run iteration loop: Explorer -> Worker -> Reviewer -> Challenger -> Auditor -> Gate check.
5. Report back when Milestone 2 is verified and complete.
