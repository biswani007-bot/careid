# Postman API Specification Analysis: Support & Helpdesk Module

- **Audited Files**:
  - `Postman collection/CareID-Staging.postman_collection.json` (Release: November 6, 2026)
  - `Postman collection/CareID-Staging.postman_environment.json`
- **Live Staging Host**: `https://360api.vnvision.in`
- **Target Module**: CareID Doctor Web Portal — Support Center, Helpdesk, and Legal Governance
- **Miner Role**: Postman API Spec Miner
- **Date**: 2026-11-11

---

## 1. Executive Summary

A comprehensive audit was performed across all 27 folders and 400+ endpoints in the Postman collection `CareID API — Staging Integration Collection (November 6, 2026 Release)` and validated against live staging at `https://360api.vnvision.in`.

### Key Conclusions:
1. **Support Tickets Subsystem (`Folder 25: Support Tickets & Helpdesk`)**:
   - Backend provides 6 fully functioning REST endpoints for ticket creation, listing, detail retrieval, admin updating, threaded message replies, and reply listing.
   - Live staging verification confirmed that ticket creation (`POST /api/v1/support/tickets`) automatically associates the ticket with the authenticated doctor's JWT `sub` ID (`fa502f2e-332c-4ec0-b6aa-83713216ec88`), preventing user impersonation.
   - Successful creation generates a genuine sequential ticket reference ID (`TKT-2026-xxxxx`).
   - Query filters (`status`, `category`, `priority`, `search`, `page`, `limit`) are active and verified.
   - Doctor role has read/create/reply access; status updates (`PUT /api/v1/support/tickets/:id`) are restricted to Admin/Staff (`403 Forbidden`).
   - **Ticket attachments are NOT supported** in the ticket creation schema or dedicated endpoints.

2. **Help Center & FAQs (`Folder 21: Content Management System`)**:
   - `GET /api/v1/cms/faqs?category=string` is documented and public (returns 200 OK, currently `data: []` on staging).
   - `GET /api/v1/cms/pages/search?q=string` and `GET /api/v1/cms/pages` exist for published CMS articles.
   - **Clinical Guides endpoints DO NOT EXIST** anywhere in the Postman collection. No endpoint exists for cath lab guides, fluoroscopy workflows, or diagnostic protocol guides. Static mock guides must be removed, and existing UI empty/error states displayed.

3. **Direct Contact & SLA Guarantees**:
   - **NO endpoints exist** for Clinical IT Hotline phone number, hospital internal speed dial (`*4357`), extension (`09`), or direct SLA response guarantees (`< 15 minutes for STAT`).
   - Hardcoded fake operational data must be removed to avoid presenting unverified promises to clinicians.

---

## 2. Postman Collection Endpoints Discovered

### A. Folder 25: Support Tickets & Helpdesk

| # | Endpoint Name | Method | Raw Route | Auth | Request Body DTO | Response Status & Body | Discovered Via |
|---|---------------|--------|-----------|------|------------------|------------------------|----------------|
| 1 | Create support ticket | `POST` | `{{baseUrl}}/api/v1/support/tickets` | Bearer (JWT) | `subject` (string, req), `description` (string, req), `category` (string, opt, def: "GENERAL"), `priority` (string, opt, def: "MEDIUM") | `201 Created` — Returns `SupportTicketDTO` with `id`, `ticketNumber`, `userId`, `status: "OPEN"`, `isDemonstrationStorage: true`, `storageNotice` | Postman Coll & Live Staging Probe |
| 2 | List support tickets | `GET` | `{{baseUrl}}/api/v1/support/tickets?status=&priority=&category=&search=&page=1&limit=20` | Bearer (JWT) | None (Query parameters) | `200 OK` — Paginated `{ data: SupportTicketDTO[], total: number, page: number, limit: number }`. Automatically scoped to current user for DOCTOR role. | Postman Coll & Live Staging Probe |
| 3 | Get support ticket details by ID | `GET` | `{{baseUrl}}/api/v1/support/tickets/:id` | Bearer (JWT) | None | `200 OK` — Returns `SupportTicketDTO` | Postman Coll & Live Staging Probe |
| 4 | Update support ticket | `PUT` | `{{baseUrl}}/api/v1/support/tickets/:id` | Bearer (JWT) | `status` (string), `priority` (string), `assignedTo` (string) | `200 OK` (Admin/Staff only). For DOCTOR role: `403 Forbidden` (`ForbiddenException`). | Postman Coll & Live Staging Probe |
| 5 | Add message reply to support ticket | `POST` | `{{baseUrl}}/api/v1/support/tickets/:id/reply` | Bearer (JWT) | `message` (string, req) | `201 Created` — Returns `TicketReplyDTO` (`id`, `ticketId`, `userId`, `userRole: "DOCTOR"`, `message`, `createdAt`) | Postman Coll & Live Staging Probe |
| 6 | Get all replies for support ticket | `GET` | `{{baseUrl}}/api/v1/support/tickets/:id/replies` | Bearer (JWT) | None | `200 OK` — Returns array of `TicketReplyDTO[]` | Postman Coll & Live Staging Probe |

### B. Folder 21: Content Management System (CMS) — Related to Help Center

| # | Endpoint Name | Method | Raw Route | Auth | Request Body DTO | Response Status & Body | Discovered Via |
|---|---------------|--------|-----------|------|------------------|------------------------|----------------|
| 7 | List published FAQs | `GET` | `{{baseUrl}}/api/v1/cms/faqs?category=string` | Public | None | `200 OK` — Array of FAQ objects: `[{ id, question, answer, category, displayOrder, status, createdAt }]` | Postman Coll & Live Staging Probe |
| 8 | Search published CMS pages | `GET` | `{{baseUrl}}/api/v1/cms/pages/search?q=string` | Public | None | `200 OK` — Array of CMS page objects | Postman Coll & Live Staging Probe |
| 9 | List published CMS pages | `GET` | `{{baseUrl}}/api/v1/cms/pages?status=ARCHIVED` | Public | None | `200 OK` — Array of CMS page objects | Postman Coll & Live Staging Probe |
| 10 | Get CMS page by ID or slug | `GET` | `{{baseUrl}}/api/v1/cms/pages/:id` | Public | None | `200 OK` — Single CMS page object | Postman Coll & Live Staging Probe |
| 11 | List reusable content blocks | `GET` | `{{baseUrl}}/api/v1/cms/blocks` | Bearer (JWT) | None | `200 OK` — Array of content block objects | Postman Coll & Live Staging Probe |

---

## 3. Data Transfer Object (DTO) Schemas

### 1. `CreateSupportTicketDTO`
```typescript
export interface CreateSupportTicketDTO {
  subject: string;      // Required, non-empty
  description: string;  // Required, non-empty
  category?: string;    // Optional, defaults to "GENERAL"
  priority?: string;    // Optional, defaults to "MEDIUM"
}
```

### 2. `SupportTicketDTO`
```typescript
export interface SupportTicketDTO {
  id: string;                     // UUID
  ticketNumber: string;           // E.g. "TKT-2026-00006"
  userId: string;                 // Doctor user UUID
  subject: string;                // Issue title
  description: string;            // Detailed context
  category: string;               // E.g. "TECHNICAL", "GENERAL", "BILLING"
  priority: string;               // E.g. "LOW", "MEDIUM", "HIGH"
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignedTo?: string | null;     // Staff UUID
  replies?: TicketReplyDTO[];     // Embedded replies array
  createdAt: string;              // ISO-8601 timestamp
  updatedAt: string;              // ISO-8601 timestamp
  isDemonstrationStorage: boolean;// Staging indicator (true)
  storageNotice?: string;         // Staging persistence advisory
}
```

### 3. `TicketReplyDTO`
```typescript
export interface TicketReplyDTO {
  id: string;        // Reply UUID
  ticketId: string;  // Parent ticket UUID
  userId: string;    // Author user UUID
  userRole: string;  // "DOCTOR", "ADMIN", "STAFF"
  message: string;   // Reply content
  createdAt: string; // ISO-8601 timestamp
}
```

### 4. `CmsFaqDTO`
```typescript
export interface CmsFaqDTO {
  id: string;
  question: string;
  answer: string;
  category: string;
  displayOrder: number;
  status: string;
  createdAt: string;
}
```

---

## 4. Requirement Verification & Gap Analysis

### R1. Profile Settings Tab Navigation Correction
- **Current Frontend State**:
  - `SupportCenterPage.tsx` renders a tab bar with: My Profile, Security, Notifications, Support.
  - `ProfessionalProfilePage.tsx`, `AccountSecurityPage.tsx`, and `NotificationPreferencesPage.tsx` all render the `Support` tab button routing to `/settings/support`.
  - Route `/settings/support` maps to `SupportCenterPage`.
  - Standalone route `/support` also maps to `SupportCenterPage`.
  - Sidebar in `PatientLayout.tsx` links to `/settings/support` (needs update to `/support`).
- **Required Changes**:
  - Remove `Support` tab from `/settings` tab strips across all 3 settings pages (`ProfessionalProfilePage`, `AccountSecurityPage`, `NotificationPreferencesPage`).
  - Keep `/settings` tab bar strictly to: `My Profile`, `Security`, and `Notifications`.
  - Retain `/support` as the canonical standalone route for SupportCenterPage.
  - Update sidebar Support link to `/support`.
  - In `SupportCenterPage.tsx`, update breadcrumb navigation and replace the settings tab strip if needed to preserve standalone status without linking back into settings tabs.

### R2. Postman Collection Audit and API Contract Compliance
- **Compliance Status**: Full audit completed.
- **Base URL**:
  - In `CareID-Staging.postman_environment.json`, `baseUrl` is set to `https://360api.vnvision.in/api/v1`.
  - In collection requests, raw URLs are `{{baseUrl}}/api/v1/...`.
  - Frontend `src/services/apiClient.ts` uses root `https://360api.vnvision.in` and appends `/api/v1/...`. This aligns perfectly with backend path routing.
- **Authentication**: JWT Bearer token in `Authorization: Bearer <token>` header.
- **Envelope**: All live NestJS endpoints return `{ success, statusCode, message, data, meta }`.

### R3. Help Center and Clinical Guides Integration
- **Postman Support**:
  - FAQs: Supported via `GET /api/v1/cms/faqs?category=string` (public, returns empty array on staging).
  - Clinical Guides: **NOT SUPPORTED / ABSENT**.
- **Requirement Rule**: Do NOT fabricate article content or simulate responses. When `data` is empty, display existing UI empty/error states and document missing backend clinical guide endpoints.
- **Action**:
  - Remove hardcoded `HELP_TOPICS` from `src/pages/settings/types.ts`.
  - Call `GET /api/v1/cms/faqs` via a new service `cmsService.ts` or `supportService.ts`.
  - If no FAQs are returned from backend, display a clean empty state ("No clinical FAQs or guides published at this time").

### R4. Support Ticket Submission and History Integration
- **Postman Support**:
  - Ticket Creation: Supported via `POST /api/v1/support/tickets`.
  - Ticket History: Supported via `GET /api/v1/support/tickets`.
- **Authentication & User Identity**:
  - Authenticated doctor token is sent via Bearer auth.
  - Backend extracts `userId` from token.
  - Fields sent: `subject`, `description`, optional `category`, optional `priority`.
- **UI Behavior**:
  - Current UI simulates submission: `showToast('Support ticket #TKT-8940 submitted (Simulated Demo)')`.
  - Replace simulation with actual call to `POST /api/v1/support/tickets`.
  - On 201 Created: display genuine ticket number (e.g. `Ticket #TKT-2026-00006 created successfully`) and reset form.
  - On 400 Bad Request: display actual backend validation error messages (e.g., `subject should not be empty`).
  - No new UI cards or screens should be added (preserving existing layout).

### R5. Direct Assistance and Contact Information Verification
- **Postman Support**:
  - Hotline phone: **ABSENT**.
  - Extension: **ABSENT**.
  - SLA Guarantees: **ABSENT**.
- **Current UI**:
  - Displays `+1 (800) 555-CARE (Ext. 09)` and `< 15 minutes for STAT`.
  - Call modal displays `*4357 (*HELP)`.
- **Requirement Rule**: Do not display fabricated operational contact numbers or fake SLA guarantees as verified data.
- **Action**:
  - Remove fake hotline number and fake SLA response text.
  - Display non-operational placeholder or empty/unconfigured indicator (e.g. "Direct hotline unconfigured on staging" or "Contact clinical administrator").
  - In Call Modal, clearly indicate hotline telephony is unconfigured on the staging environment.

### R6. Mock Data Removal and Architecture Compliance
- **Items to Remove**:
  1. `HELP_TOPICS` static array in `src/pages/settings/types.ts`.
  2. Hardcoded ticket ID `#TKT-8940` in `SupportCenterPage.tsx`.
  3. Demo disclaimer in modal: replace "This ticket submission is simulated locally" with live backend integration feedback.
  4. Fake phone number `+1 (800) 555-CARE (Ext. 09)`.
  5. Fake SLA `< 15 minutes for STAT`.
  6. Fake speed-dial `*4357 (*HELP)`.
- **Preserved**:
  - Card dimensions, styling, typography, Tailwind classes, and component layout.
  - Legal Governance modals (Terms, HIPAA) which reflect institutional policies.

---

## 5. Live Staging Probing Results & Edge Cases Observed

| # | Feature / Action | Input | Observed Behavior | HTTP Code | Status |
|---|------------------|-------|-------------------|-----------|--------|
| 1 | Health Check | `GET /api/v1/health` | Returns health status and backend timestamp | `200 OK` | Verified Live |
| 2 | CMS FAQs (Unauth) | `GET /api/v1/cms/faqs` | Returns `{ success: true, data: [] }` | `200 OK` | Verified Live |
| 3 | Support Tickets (Unauth) | `GET /api/v1/support/tickets` | Returns `{ error: "UnauthorizedException", message: "Unauthorized" }` | `401` | Verified Live |
| 4 | Support Tickets (Auth) | `GET /api/v1/support/tickets` | Returns paginated list of user's tickets | `200 OK` | Verified Live |
| 5 | Ticket Filter Status | `GET /api/v1/support/tickets?status=OPEN` | Filters tickets where status = "OPEN" | `200 OK` | Verified Live |
| 6 | Ticket Filter Search | `GET /api/v1/support/tickets?search=latency` | Matches tickets containing "latency" | `200 OK` | Verified Live |
| 7 | Create Ticket (Empty) | `POST /api/v1/support/tickets` with `{}` | Returns `["subject must be a string", "subject should not be empty", ...]` | `400` | Verified Live |
| 8 | Create Ticket (Empty Subject) | `POST /api/v1/support/tickets` with `{ subject: "" }` | Returns `["subject should not be empty", ...]` | `400` | Verified Live |
| 9 | Create Ticket (Valid) | `POST /api/v1/support/tickets` with subject & desc | Creates ticket, generates `TKT-2026-xxxxx`, status "OPEN", attaches auth userId | `201` | Verified Live |
| 10 | Create Ticket (Omit category/priority) | `POST /api/v1/support/tickets` with only subject & desc | Defaults category to "GENERAL", priority to "MEDIUM" | `201` | Verified Live |
| 11 | Update Ticket as Doctor | `PUT /api/v1/support/tickets/:id` with `{ status: "RESOLVED" }` | Returns `ForbiddenException` ("Forbidden resource") | `403` | Verified Live |
| 12 | Add Reply to Ticket | `POST /api/v1/support/tickets/:id/reply` with `{ message: "..." }` | Returns 201 with created reply object, userRole: "DOCTOR" | `201` | Verified Live |
| 13 | Get Ticket Replies | `GET /api/v1/support/tickets/:id/replies` | Returns array containing added replies | `200 OK` | Verified Live |
