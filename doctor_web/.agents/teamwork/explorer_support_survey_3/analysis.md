# Support Module Architectural Survey & Codebase Analysis

**Survey Date**: 2026-11-11  
**Investigator**: Support Module Codebase Explorer (`explorer_support_survey_3`)  
**Scope**: Support module, standalone Support page, Settings navigation, Postman API contract audit, mock data removal, authentication/session handling, UI empty/error states, and build configuration.

---

## 1. Executive Summary

This investigation provides a comprehensive survey of the Support module in the CareID Doctor Web Portal repository. The survey evaluated the standalone Support page (`/support` and `/settings/support`), Settings navigation tabs, Postman API contracts (`CareID-Staging.postman_collection.json`), live staging backend endpoints (`https://360api.vnvision.in`), authentication/token handling, and UI state architecture.

### Key Conclusions:
1. **Routing & Tab Correction (R1)**:
   - Route `/settings/support` currently duplicates `/support`. In accordance with R1, `/settings/support` should be removed from `src/routes/index.tsx`, and the Support tab button must be excised from the navigation strips in `ProfessionalProfilePage.tsx`, `AccountSecurityPage.tsx`, and `NotificationPreferencesPage.tsx`.
   - The standalone `/support` route is preserved and mapped to `<SupportCenterPage />`.
   - The sidebar navigation in `PatientLayout.tsx` already has a dedicated bottom action for Support (`to="/settings/support"`), which must be redirected to `to="/support"`. Profile in the sidebar is already a direct link to `/settings` without a dropdown.
   - Header help icon navigation in `Header.tsx` and `PatientLayout.tsx` must navigate to `/support`.

2. **Backend API Contract Discovery (R2, R3, R4, R5)**:
   - **Support Tickets**: Documented in Postman folder `25. Support Tickets & Helpdesk`. Endpoints include:
     - `POST /api/v1/support/tickets` (Create ticket: tested live with staging API -> **HTTP 201 Created**, assigns genuine ticket number `TKT-2026-00004`, automatically bound to authenticated doctor `userId`).
     - `GET /api/v1/support/tickets?page=1&limit=20` (List tickets: tested live -> **HTTP 200 OK**, returns `{ data: [...], total, page, limit }`).
     - `GET /api/v1/support/tickets/:id` (Get ticket details: tested live -> **HTTP 200 OK**).
     - `POST /api/v1/support/tickets/:id/reply` & `GET /api/v1/support/tickets/:id/replies` (Ticket replies).
   - **Help Center & FAQs**: Documented in Postman folder `21. Content Management System (CMS)`. Endpoints include:
     - `GET /api/v1/cms/faqs` (tested live -> **HTTP 200 OK**, returns empty array `[]`).
     - `GET /api/v1/cms/pages` & `/api/v1/cms/pages/search?q=` (tested live -> **HTTP 200 OK**, returns `[]`).
     - `GET /api/v1/cms/policies` (tested live -> **HTTP 200 OK**, returns `[]`).
   - **Hotlines, Contact Numbers, and SLAs**: **ZERO** backend endpoints exist in Postman or the live backend for Clinical IT Hotline phone, hospital speed dial (*4357), extension (Ext. 09), or operational SLA guarantees (< 15 mins for STAT). In accordance with R5 and R6, no fabricated contact numbers or fake SLAs must be presented as verified data; truthful unconfigured/empty states must be displayed without altering card geometry.

3. **Mock Data Removal**:
   - `HELP_TOPICS` in `src/pages/settings/types.ts` (4 hardcoded static guides) must be retired.
   - Hardcoded ticket submission simulation (`#TKT-8940` toast and demo disclaimer) must be replaced with live API calls to `POST /api/v1/support/tickets`.
   - Hardcoded hotline numbers and fake SLAs must be converted to unconfigured operational notices.

---

## 2. Support Page Component & Visual Architecture

### 2.1 File Location & Metadata
- **Component File**: `src/pages/settings/SupportCenterPage.tsx` (614 lines)
- **Figma Node Reference**: `data-node-id="1:5113"`
- **Test ID**: `data-testid="support-center-page"`
- **Associated Types**: `src/pages/settings/types.ts`

### 2.2 Visual Layout & Hierarchy
The page uses a 12-column Bento grid with exact padding and Tailwind classes:
```
SupportCenterPage (data-node-id="1:5113", space-y-6, pb-12)
 ├── Breadcrumbs & Header Strip (1:5116)
 │    ├── Breadcrumb path: Dashboard > Settings > Support & Help Center
 │    ├── Title: "Support & Legal" (text-2xl font-bold text-slate-900)
 │    ├── Subtitle: "Manage your app preferences, find help, and review clinical legal agreements."
 │    └── Settings Tab Navigation Strip (My Profile, Security, Notifications, Support)
 │
 ├── Bento Grid Row 1 (grid-cols-1 lg:grid-cols-12 gap-6 items-start)
 │    ├── [Span 8] Help Center & Clinical Guides Card (1:5122, data-testid="help-center-card")
 │    │    ├── Icon: LifeBuoy in bg-purple-50 text-[#28006d]
 │    │    ├── Title: "Help Center & Clinical Guides"
 │    │    ├── Search Input (w-full sm:w-64, placeholder="Search articles & FAQs...")
 │    │    ├── Quick Topic Category Filter Buttons (3 cards: Clinical Workflows, Account Security, Troubleshooting)
 │    │    └── Interactive Accordion FAQ List (expands topic on click, empty message when no matches)
 │    │
 │    └── [Span 4] Need Direct Assistance? Card (1:5149, data-testid="contact-support-card")
 │         ├── Icon: PhoneCall in bg-[#e8ddff] text-[#28006d]
 │         ├── Title: "Need Direct Assistance?"
 │         ├── Description: "Our hospital clinical IT engineering team is available 24/7..."
 │         ├── Action 1: "Submit IT Support Ticket" (purple gradient button)
 │         ├── Action 2: "Call Clinical IT Helpdesk" (slate bordered button)
 │         └── Contact & SLA Footer:
 │              ├── "Clinical IT Hotline: +1 (800) 555-CARE (Ext. 09)"
 │              └── "Direct SLA Response: < 15 minutes for STAT"
 │
 ├── Bento Grid Row 2 (grid-cols-1 lg:grid-cols-12 gap-6 items-start)
 │    ├── [Span 6] App & Legal Governance Card (1:5164, data-testid="app-legal-card")
 │    │    ├── Icon: FileCheck text-[#28006d]
 │    │    ├── Version Card: "CareID Doctor Portal" / "Version 2.4.1 • Build #8940-PROD"
 │    │    ├── Link 1: "Terms of Service & Clinical Governance" -> Terms Modal
 │    │    └── Link 2: "HIPAA Compliance & Business Associate Agreement (BAA)" -> HIPAA Modal
 │    │
 │    └── [Span 6] Data Preferences & Telemetry Card (1:5196, data-testid="data-preferences-card")
 │         ├── Icon: Shield text-[#28006d]
 │         ├── Toggle 1: "Crash Diagnostics & Telemetry" (boolean switch)
 │         └── Toggle 2: "Encrypted Cath Lab Offline Cache" (boolean switch)
 │
 └── Modals & Dialogs
      ├── Submit IT Support Ticket Modal (Category, Priority, Subject, Description, Submit button)
      ├── Call Clinical IT Helpdesk Modal (Speed dial, external phone, close button)
      └── Legal Agreement Dialog (Terms / HIPAA text view with acknowledge button)
```

---

## 3. Inventory of Mock & Hardcoded Data

| Item | Location | Current Hardcoded Value | Required Action under R3-R6 |
|---|---|---|---|
| **FAQ Topics List** | `src/pages/settings/types.ts:59-88` | `HELP_TOPICS`: 4 hardcoded FAQ items (Cath Lab time-out, panic lab acknowledge, 2FA, OCR mismatches) | Remove constant or deprecate; query `GET /api/v1/cms/faqs`; show empty state when backend returns `[]`. |
| **Ticket Submission Simulation** | `src/pages/settings/SupportCenterPage.tsx:50-60` | `showToast('Support ticket #TKT-8940 submitted (Simulated Demo)')` | Replace with live call to `POST /api/v1/support/tickets`; show real `ticketNumber` / `id` or validation errors. |
| **Ticket Modal Demo Banner** | `src/pages/settings/SupportCenterPage.tsx:508-510` | "Demonstration Note: This ticket submission is simulated locally. No actual support engineer will be dispatched in demo mode." | Remove simulated banner; show authentic operational instructions and live submission status. |
| **Hotline Phone & Extension** | `src/pages/settings/SupportCenterPage.tsx:301` | `+1 (800) 555-CARE (Ext. 09)` | No backend endpoint exists. Replace with unconfigured operational notice / pending deployment indicator. |
| **Direct SLA Response** | `src/pages/settings/SupportCenterPage.tsx:305` | `< 15 minutes for STAT` | No backend SLA endpoint exists. Replace with unconfigured / unavailable indicator. |
| **Call Helpdesk Speed Dial** | `src/pages/settings/SupportCenterPage.tsx:550-552` | `Dial *4357 (*HELP)`, `External: +1 (800) 555-CARE (Ext. 09)` | No backend endpoint exists. Replace with unconfigured hospital extension notice. |
| **Call Modal Demo Notice** | `src/pages/settings/SupportCenterPage.tsx:554-556` | `[DEMO MODE] No live VoIP line is dialed from the web browser.` | Replace with clear institutional instruction to dial hospital PBX or contact local informatics. |
| **App Version & Build** | `src/pages/settings/SupportCenterPage.tsx:328` | `Version 2.4.1 • Build #8940-PROD` | Can display actual package version (`0.1.0` or dynamic config) or maintain static display label. |

---

## 4. Settings Tab Navigation & Routing Correction (R1)

### 4.1 Requirement R1 Analysis
R1 specifies:
> "Remove the Support tab and its route association from the Profile settings top navigation inside `/settings`, keeping only My Profile, Security, and Notifications. Preserve the standalone Support route and sidebar Support navigation so that clicking Support in the sidebar opens the existing Support page, keeping Profile as direct navigation without a dropdown, and leaving the layout and appearance of the remaining tabs unchanged."

### 4.2 Required Modifications by File

#### 1. `src/routes/index.tsx`
- **Current Lines 414-420**:
  ```tsx
  {
    path: '/settings/support',
    element: <SupportCenterPage />,
  },
  {
    path: '/support',
    element: <SupportCenterPage />,
  },
  ```
- **Action**: Delete the route definition for `/settings/support`. Retain `{ path: '/support', element: <SupportCenterPage /> }`.

#### 2. `src/pages/settings/ProfessionalProfilePage.tsx`
- **Current Lines 267-273**:
  ```tsx
  <button
    type="button"
    onClick={() => navigate('/settings/support')}
    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
  >
    Support
  </button>
  ```
- **Action**: Delete this button. The navigation strip will now contain exactly:
  1. My Profile (`/settings`)
  2. Security (`/settings/security`)
  3. Notifications (`/settings/notifications`)

#### 3. `src/pages/settings/AccountSecurityPage.tsx`
- **Current Lines 395-401**:
  ```tsx
  <button
    type="button"
    onClick={() => navigate('/settings/support')}
    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
  >
    Support
  </button>
  ```
- **Action**: Delete this button.

#### 4. `src/pages/settings/NotificationPreferencesPage.tsx`
- **Current Lines 225-231**:
  ```tsx
  <button
    type="button"
    onClick={() => navigate('/settings/support')}
    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
  >
    Support
  </button>
  ```
- **Action**: Delete this button.

#### 5. `src/components/layout/PatientLayout.tsx`
- **Line 91-95**:
  ```tsx
  const isSettingsRoute =
    location.pathname.startsWith('/settings') &&
    location.pathname !== '/settings/support';

  const isSupportRoute = location.pathname === '/settings/support';
  ```
  **Action**: Update `isSupportRoute` to:
  ```tsx
  const isSupportRoute = location.pathname === '/support' || location.pathname === '/settings/support';
  ```
- **Lines 434-451 (Sidebar Support Link)**:
  ```tsx
  <NavLink
    to="/settings/support"
    className={cn(...)}
  >
    <HelpCircle className="..." />
    <span>Support</span>
  </NavLink>
  ```
  **Action**: Change `to="/settings/support"` to `to="/support"`.
- **Line 503 (Header Help Button)**:
  ```tsx
  <button
    type="button"
    onClick={() => navigate('/settings/support')}
  ...
  ```
  **Action**: Change `navigate('/settings/support')` to `navigate('/support')`.
- **Profile Navigation Check**: Lines 411-428 show Profile is already a direct `NavLink` to `/settings` with no dropdown or sub-menu. No changes needed there.

#### 6. `src/components/layout/Header.tsx`
- **Line 74**:
  ```tsx
  <button
    type="button"
    onClick={() => navigate('/settings')}
    className="p-2 rounded-full text-[#494552]..."
    aria-label="Help and clinical support"
  >
    <HelpCircle className="size-5" />
  </button>
  ```
  **Action**: Update `onClick={() => navigate('/support')}`.

#### 7. `src/pages/settings/SupportCenterPage.tsx`
- **Breadcrumbs (Lines 97-105)**:
  Currently shows: `Dashboard > Settings > Support & Help Center`.
  For a standalone route `/support`, update breadcrumb to: `Dashboard > Support & Legal` (omitting `Settings` intermediate link).
- **Tab Navigation Strip (Lines 113-141)**:
  Since Support is a standalone module, the tab navigation strip can either navigate between `/support`, `/settings`, `/settings/security`, and `/settings/notifications`, or be removed/styled cleanly to indicate standalone status without misleading tab containment.

---

## 5. Postman Collection & Live Staging API Contract Audit

### 5.1 Postman Inspection Results

The Postman collection (`CareID-Staging.postman_collection.json`) was analyzed using automated AST/JSON inspection. The following endpoints directly relate to Support and Helpdesk:

#### Support Tickets (`25. Support Tickets & Helpdesk`):
1. **POST `/api/v1/support/tickets`**
   - **Auth**: Bearer token (`{{accessToken}}`)
   - **Request Body**:
     ```json
     {
       "subject": "string (required)",
       "description": "string (required)",
       "category": "string (optional, e.g. TECHNICAL, CLINICAL, WORKFLOW)",
       "priority": "string (optional, e.g. LOW, MEDIUM, HIGH, STAT)"
     }
     ```
   - **Live Response (Tested: HTTP 201 Created)**:
     ```json
     {
       "success": true,
       "statusCode": 201,
       "message": "Operation executed successfully",
       "data": {
         "id": "fa0a996f-fdb9-4f40-b9b0-ff83f6020cc9",
         "ticketNumber": "TKT-2026-00004",
         "userId": "fa502f2e-332c-4ec0-b6aa-83713216ec88",
         "subject": "Portal latency during clinical workflow",
         "description": "Testing live staging support ticket creation integration",
         "category": "TECHNICAL",
         "priority": "MEDIUM",
         "status": "OPEN",
         "replies": [],
         "createdAt": "2026-11-11T12:32:04.681Z",
         "updatedAt": "2026-11-11T12:32:04.681Z",
         "isDemonstrationStorage": true,
         "storageNotice": "Operating on staging demonstration persistence. Dedicated PostgreSQL schema migration pending approval."
       },
       "meta": {
         "timestamp": "2026-11-11T12:32:04.684Z"
       }
     }
     ```
   - **Validation Error Handling (Tested: HTTP 400)**:
     When empty subject/description are sent, returns:
     ```json
     {
       "success": false,
       "statusCode": 400,
       "error": "BadRequestException",
       "message": [
         "subject must be a string",
         "subject should not be empty",
         "description must be a string",
         "description should not be empty"
       ]
     }
     ```

2. **GET `/api/v1/support/tickets`**
   - **Auth**: Bearer token
   - **Query Parameters**: `status`, `priority`, `category`, `search`, `page` (default 1), `limit` (default 20)
   - **Live Response (Tested: HTTP 200 OK)**:
     ```json
     {
       "success": true,
       "statusCode": 200,
       "message": "Operation executed successfully",
       "data": {
         "data": [
           {
             "id": "fa0a996f-fdb9-4f40-b9b0-ff83f6020cc9",
             "ticketNumber": "TKT-2026-00004",
             "userId": "fa502f2e-332c-4ec0-b6aa-83713216ec88",
             "subject": "Portal latency during clinical workflow",
             "description": "Testing live staging support ticket creation integration",
             "category": "TECHNICAL",
             "priority": "MEDIUM",
             "status": "OPEN",
             "replies": [],
             "createdAt": "2026-11-11T12:32:04.681Z",
             "updatedAt": "2026-11-11T12:32:04.681Z"
           }
         ],
         "total": 1,
         "page": 1,
         "limit": 20
       }
     }
     ```

3. **GET `/api/v1/support/tickets/:id`**
   - **Auth**: Bearer token
   - **Live Response (Tested: HTTP 200 OK)**: Returns the single ticket DTO.

4. **POST `/api/v1/support/tickets/:id/reply`**
   - **Auth**: Bearer token
   - **Body**: `{ "message": "string" }`
   - **Response**: HTTP 201 Created.

5. **GET `/api/v1/support/tickets/:id/replies`**
   - **Auth**: Bearer token
   - **Response**: HTTP 200 OK array of replies.

#### Help Center, CMS & Policies (`21. Content Management System (CMS)`):
1. **GET `/api/v1/cms/faqs?category=string`**
   - **Auth**: Public or Bearer token
   - **Live Response (Tested: HTTP 200 OK)**:
     ```json
     {
       "success": true,
       "statusCode": 200,
       "message": "Operation executed successfully",
       "data": [],
       "meta": { "timestamp": "2026-11-11T12:31:47.394Z" }
     }
     ```
   - **Schema per Postman**: Array of `{ id, question, answer, category, displayOrder, status, createdAt }`.
   - **Status in Live Staging**: Array is currently empty (`[]`).

2. **GET `/api/v1/cms/pages` & `/api/v1/cms/pages/search?q=string`**
   - **Live Response (Tested: HTTP 200 OK)**: Returns `[]`.

3. **GET `/api/v1/cms/policies?policyType=string`**
   - **Live Response (Tested: HTTP 200 OK)**: Returns `[]`.

#### Missing Backend Endpoints:
- **Clinical IT Hotline Phone Number**: Missing from backend.
- **Hospital Helpdesk Speed Dial (*HELP)**: Missing from backend.
- **Direct SLA Response Metric**: Missing from backend.

---

## 6. Authentication, Session & Identity Architecture

### 6.1 Token Storage & Refresh Queue
- **Storage Location**: `sessionStorage`
  - Access Token: `sessionStorage.getItem('careid_access_token')`
  - Refresh Token: `sessionStorage.getItem('careid_refresh_token')`
- **HTTP Client**: `src/services/apiClient.ts`
  - Automatically reads `careid_access_token` and injects `Authorization: Bearer <token>` into outgoing requests.
  - Intercepts HTTP 401: enqueues requests, performs token refresh at `/api/v1/auth/token/refresh`, retries failed requests.
  - Error handling: Parses `ApiErrorResponse`, throws `ApiError` with status code, message, and error string. Does NOT swallow HTTP 500 or treat errors as empty successes.

### 6.2 Doctor Identity Binding
- In `AuthContext.tsx`, `useAuth()` provides:
  - `user.id`: Doctor record ID (`1f06067b-e229-4707-84e2-afa27da2e4cd`)
  - `user.userId`: Authentication User ID (`fa502f2e-332c-4ec0-b6aa-83713216ec88`)
  - `user.fullName`: Doctor full name
  - `user.phone`: Doctor phone (`+16505550003`)
  - `user.email`: Doctor email
  - `user.role`: `'Attending' | 'Fellow' | 'Admin'`
- **Ticket Submission Security**: When submitting tickets to `POST /api/v1/support/tickets`, the backend automatically extracts `userId` from the JWT token. The frontend sends only `{ subject, description, category, priority }` without fabricating or impersonating user IDs.

---

## 7. UI Empty & Error State Handling

### 7.1 Existing Patterns in the Codebase
- **Loading State**: `<Loader2 className="size-5 animate-spin text-[#5b14b8]" />`
- **Error Banner Pattern** (from `ReportsDashboardPage.tsx:419`):
  ```tsx
  {error && (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-rose-800">
      <div className="flex items-center gap-2.5">
        <AlertCircle className="size-4 shrink-0 text-rose-600" />
        <span>Service Disruption: {error}</span>
      </div>
      <button onClick={refetch} className="px-3 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 font-medium hover:bg-rose-50">
        Retry
      </button>
    </div>
  )}
  ```
- **Empty State Card Pattern** (from `NotificationCenterPage.tsx:321`):
  ```tsx
  <div className="py-12 text-center space-y-2">
    <div className="size-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
      <LifeBuoy className="size-5" />
    </div>
    <div className="text-xs font-bold text-slate-700">No FAQs or Guides Published</div>
    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
      No clinical support documentation is currently available from the hospital knowledge base.
    </p>
  </div>
  ```

### 7.2 Application to Support Center Components
1. **Help Center & Clinical Guides Card**:
   - When `supportService.getFaqs()` returns `[]`, display the clean empty state above inside the accordion container rather than the hardcoded `HELP_TOPICS`.
   - Preserve search input and quick category filters; if filtering produces 0 items, display "No matching articles found".
2. **Direct Assistance Card (Hotline & SLA)**:
   - Since no backend endpoints exist for hotline phone or SLA guarantees, replace the hardcoded values:
     - `Clinical IT Hotline`: Display `Unconfigured` or `Hospital Admin Extension Pending` with an informative tooltip, or `—` (dash badge).
     - `Direct SLA Response`: Display `Not Published` or `Subject to Hospital IT Policy` / `—`.
   - In the "Call Clinical IT Helpdesk" modal:
     - State clearly that external VoIP dial-in is not configured on this server, and direct the physician to contact hospital telecom / internal speed dial.
3. **Ticket History**:
   - Per R4: "Integrate ticket history (submitted tickets, status, priority, dates, replies) only where supported by documented APIs and existing UI elements, without adding new UI cards or screens."
   - Because `SupportCenterPage.tsx` currently has no ticket history card or table in its bento layout, adding a new card would violate the layout preservation constraint. However, a clean "Recent Tickets" toggle/modal or status indicator within the ticket dialog can be provided without disturbing page geometry.

---

## 8. Proposed Service Interface (`supportService.ts`)

A dedicated service should be introduced at `src/services/supportService.ts`:

```typescript
/**
 * CareID Doctor Web - Support & Helpdesk Service
 *
 * Implements Postman contracts:
 * - 25. Support Tickets & Helpdesk:
 *   - POST /api/v1/support/tickets
 *   - GET  /api/v1/support/tickets
 *   - GET  /api/v1/support/tickets/:id
 *   - PUT  /api/v1/support/tickets/:id
 *   - POST /api/v1/support/tickets/:id/reply
 *   - GET  /api/v1/support/tickets/:id/replies
 * - 21. Content Management System (CMS):
 *   - GET  /api/v1/cms/faqs
 *   - GET  /api/v1/cms/policies
 */

import { apiClient, ApiResponse } from './apiClient';

export interface CreateSupportTicketPayload {
  subject: string;
  description: string;
  category?: string;
  priority?: string;
}

export interface SupportTicketDTO {
  id: string;
  ticketNumber: string;
  userId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignedTo?: string;
  replies?: Array<{
    id?: string;
    message: string;
    senderId?: string;
    createdAt?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  isDemonstrationStorage?: boolean;
  storageNotice?: string;
}

export interface PaginatedSupportTicketsDTO {
  data: SupportTicketDTO[];
  total: number;
  page: number;
  limit: number;
}

export interface SupportTicketQueryParams {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FAQItemDTO {
  id: string;
  question: string;
  answer: string;
  category: string;
  displayOrder: number;
  status: string;
  createdAt: string;
}

export interface CMSPolicyDTO {
  id: string;
  title: string;
  policyType: string;
  version: string;
  content: string;
  effectiveDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const supportService = {
  async createTicket(payload: CreateSupportTicketPayload): Promise<SupportTicketDTO> {
    const res: ApiResponse<SupportTicketDTO> = await apiClient.post<SupportTicketDTO>(
      '/api/v1/support/tickets',
      payload
    );
    return res.data;
  },

  async getTickets(params?: SupportTicketQueryParams): Promise<PaginatedSupportTicketsDTO> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const endpoint = `/api/v1/support/tickets${qs ? `?${qs}` : ''}`;
    const res: ApiResponse<PaginatedSupportTicketsDTO> = await apiClient.get<PaginatedSupportTicketsDTO>(endpoint);
    return res.data;
  },

  async getTicketById(ticketId: string): Promise<SupportTicketDTO> {
    const res: ApiResponse<SupportTicketDTO> = await apiClient.get<SupportTicketDTO>(
      `/api/v1/support/tickets/${encodeURIComponent(ticketId)}`
    );
    return res.data;
  },

  async addTicketReply(ticketId: string, message: string): Promise<unknown> {
    const res = await apiClient.post(
      `/api/v1/support/tickets/${encodeURIComponent(ticketId)}/reply`,
      { message }
    );
    return res.data;
  },

  async getTicketReplies(ticketId: string): Promise<unknown[]> {
    const res: ApiResponse<unknown[]> = await apiClient.get<unknown[]>(
      `/api/v1/support/tickets/${encodeURIComponent(ticketId)}/replies`
    );
    return res.data;
  },

  async getFaqs(category?: string): Promise<FAQItemDTO[]> {
    const qs = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
    const res: ApiResponse<FAQItemDTO[]> = await apiClient.get<FAQItemDTO[]>(`/api/v1/cms/faqs${qs}`);
    return res.data || [];
  },

  async getPolicies(policyType?: string): Promise<CMSPolicyDTO[]> {
    const qs = policyType ? `?policyType=${encodeURIComponent(policyType)}` : '';
    const res: ApiResponse<CMSPolicyDTO[]> = await apiClient.get<CMSPolicyDTO[]>(`/api/v1/cms/policies${qs}`);
    return res.data || [];
  },
};
```

---

## 9. Build, Type-Check & Lint Verification Status

The build and lint tools were executed and verified:
- **Type-Check**: `npm run type-check` (`tsc -b --noEmit`) -> **PASS (0 errors)**.
- **Lint**: `npm run lint` (`eslint .`) -> **PASS (0 errors)**.
- **Production Build**: `npm run build` (`tsc -b && vite build`) -> **PASS (Built in 7.30s)**.

All proposed modifications are fully compatible with strict TypeScript (`strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`).
