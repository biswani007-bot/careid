# Dispatch Log

## 2026-11-11T12:21:46Z

Integrate the CareID Doctor Web Portal Support module with live NestJS backend APIs documented in the Postman collection, remove mock and hardcoded data, and remove the Support tab from Profile settings navigation while preserving the standalone Support page and existing UI layout.

Working directory: d:\New folder\New folder\doctor web\doctor-web-frontend-main
Integrity mode: development

## Requirements

### R1. Profile Settings Tab Navigation Correction
Remove the Support tab and its route association from the Profile settings top navigation inside `/settings`, keeping only My Profile, Security, and Notifications. Preserve the standalone Support route and sidebar Support navigation so that clicking Support in the sidebar opens the existing Support page, keeping Profile as direct navigation without a dropdown, and leaving the layout and appearance of the remaining tabs unchanged.

### R2. Postman Collection Audit and API Contract Compliance
Audit the updated Postman collection at `D:\New folder\New folder\doctor web\doctor-web-frontend-main\Postman collection` for all endpoints related to support tickets, help center, FAQs, clinical guides, ticket creation/listing/details/status/replies/attachments, helpdesk contact information, categories, and priorities. The Postman collection is the authoritative API contract: follow HTTP methods, routes, authentication requirements, query parameters, request bodies, and response structures strictly as documented, without inventing endpoints or request fields.

### R3. Help Center and Clinical Guides Integration
Integrate help articles, FAQs, clinical guides, search inputs, and expandable topics with backend APIs if documented in Postman. If the backend does not provide these endpoints, do not fabricate article content or simulate backend responses; display existing UI empty/error states and document missing backend API requirements.

### R4. Support Ticket Submission and History Integration
Connect the Submit IT Support Ticket action to the documented backend ticket creation workflow using the authenticated doctor's identity from the JWT/session, sending only documented fields and displaying actual backend ticket references or validation errors. Integrate ticket history (submitted tickets, status, priority, dates, replies) only where supported by documented APIs and existing UI elements, without adding new UI cards or screens.

### R5. Direct Assistance and Contact Information Verification
Verify Clinical IT Hotline phone, extension, and SLA response against backend endpoints. If official contact or SLA endpoints exist, display their actual values; if not, do not display fabricated operational contact numbers or fake SLA guarantees as verified data, using existing empty/error states and documenting missing endpoints without altering UI layout.

### R6. Mock Data Removal and Architecture Compliance
Remove all mock data, hardcoded FAQ lists, static clinical guides, fake phone numbers, fake SLAs, mock tickets, and simulated responses across the Support module. Reuse the existing API client and authentication interceptors targeting `https://360api.vnvision.in`, adhere to existing service and hook conventions, define TypeScript interfaces from Postman schemas, handle errors properly without swallowing HTTP 500 or treating error codes as empty successes, and do not alter the visual styling, card dimensions, typography, colors, or component structure of the Support page.

### R7. Final Integration Report
Provide a comprehensive final report documenting: Postman endpoints discovered, APIs successfully integrated, Help Center integration status, Support ticket integration status, ticket history integration status, contact/SLA data source, mock and hardcoded data removed, missing backend APIs and required DTO fields, files modified, live staging test results, and build/type-check results.

## Acceptance Criteria

### Navigation & Tab Integrity
- [ ] `/settings` displays only My Profile, Security, and Notifications tabs with unchanged appearance.
- [ ] Support tab is completely removed from `/settings` tab navigation and route mapping.
- [ ] Sidebar Support navigation remains intact and navigates to the standalone Support page.
- [ ] Sidebar Profile item retains direct navigation without a dropdown.

### Backend Integration & Data Integrity
- [ ] All integrated endpoints strictly match routes, methods, and DTOs from the Postman collection.
- [ ] Authenticated doctor identity from JWT/session is used for ticket submissions without user impersonation.
- [ ] Successful ticket submission displays genuine backend ticket reference ID; validation errors display actual backend error messages.
- [ ] If help center or contact endpoints are absent in Postman, no fabricated or simulated data is displayed; existing UI empty or error states are shown.
- [ ] No hardcoded fake hotline numbers or fake SLA response times are presented as verified operational data.

### Code Quality & Build Verification
- [ ] TypeScript type-check passes with zero errors.
- [ ] ESLint passes with zero errors.
- [ ] Production build (`npm run build`) completes successfully without errors.
- [ ] Integration is tested and verified against the live staging API at `https://360api.vnvision.in` using existing session/auth tokens or login mechanisms in the frontend repository.
- [ ] Final report covering all 11 required status and audit points is delivered.
