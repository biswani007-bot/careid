## 2026-11-11T12:44:45Z
You are a specification investigator (teamwork_spec_miner).
MANDATORY FIRST STEP: Read ORIGINAL_REQUEST.md and SCOPE.md before starting any work.

Original request: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md
Scope document: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\sub_orch_milestone_2\SCOPE.md
Project document: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\PROJECT.md
Dispatch file: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\spec_miner_m2_1\DISPATCH.md
State folder: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\spec_miner_m2_1
Working directory: d:\New folder\New folder\doctor web\doctor-web-frontend-main

Investigate the authoritative Postman collection and environment files in:
d:\New folder\New folder\doctor web\doctor-web-frontend-main\Postman collection
- CareID-Staging.postman_collection.json
- CareID-Staging.postman_environment.json

Investigate:
1. Folder 25: Support Tickets & Helpdesk (create, list, details, replies, etc.)
2. Folder 21: CMS (FAQs, policies, pages)
3. Extract exact paths, HTTP methods, query parameters, payload schemas, and response DTO shapes for:
   - POST /api/v1/support/tickets
   - GET /api/v1/support/tickets
   - GET /api/v1/support/tickets/:id
   - POST /api/v1/support/tickets/:id/reply
   - GET /api/v1/support/tickets/:id/replies
   - GET /api/v1/cms/faqs
   - GET /api/v1/cms/policies
4. Confirm whether any endpoints exist for clinical guides, hotline phone numbers, or SLA guarantees (or verify they are absent).
5. Document exact TypeScript interface definitions needed for src/services/supportService.ts and src/pages/settings/types.ts.

Write your complete report to:
d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\spec_miner_m2_1\handoff.md

When complete, send a message to caller with your findings and path to handoff.md. Do NOT modify any source code files.
