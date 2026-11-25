# Handoff Report: Support Module Architectural Survey & Codebase Analysis

**Agent Archetype**: Teamwork Explorer (`explorer_support_survey_3`)  
**State Folder**: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_support_survey_3`  
**Handoff Type**: Hard (Investigation & Architectural Survey Complete)  
**Timestamp**: 2026-11-11T12:40:00Z  

---

## 1. Observation

Direct observations from source inspection, AST scanning, and live staging API execution:

### 1.1 Support Page Components & Bento Layout
- **File**: `src/pages/settings/SupportCenterPage.tsx`
  - Container (`data-node-id="1:5113"`, `data-testid="support-center-page"`, line 81-85): 12-column Bento grid with top header strip.
  - Header & Breadcrumbs (lines 95-142): Breadcrumb shows `Dashboard > Settings > Support & Help Center`. Right-aligned settings tab strip renders 4 buttons: `My Profile`, `Security`, `Notifications`, and `Support` (active).
  - Row 1 (lines 147-309):
    - Span 8: Help Center & Clinical Guides (`data-node-id="1:5122"`, `data-testid="help-center-card"`), search input (`searchQuery`), 3 category filter buttons (`Clinical Workflows`, `Account Security`, `Troubleshooting`), accordion FAQ list mapped from `filteredTopics` (based on `HELP_TOPICS`).
    - Span 4: Direct Assistance (`data-node-id="1:5149"`, `data-testid="contact-support-card"`), CTA button "Submit IT Support Ticket", button "Call Clinical IT Helpdesk", footer with:
      - Line 301: `Clinical IT Hotline: +1 (800) 555-CARE (Ext. 09)`
      - Line 305: `Direct SLA Response: < 15 minutes for STAT`
  - Row 2 (lines 312-437):
    - Span 6: App & Legal Governance (`data-node-id="1:5164"`), version card ("CareID Doctor Portal", "Version 2.4.1 • Build #8940-PROD"), links to Terms and HIPAA modals.
    - Span 6: Data Preferences & Telemetry (`data-node-id="1:5196"`), Crash Diagnostics toggle, Encrypted Cath Lab Offline Cache toggle.
  - Modals:
    - Ticket Modal (lines 440-531): Category select, Priority select, Subject input, Description textarea. Demonstration note: *"Demonstration Note: This ticket submission is simulated locally. No actual support engineer will be dispatched in demo mode."* Ticket submission logic:
      ```typescript
      // lines 50-60
      const handleTicketSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticketSubject.trim()) {
          showToast('Please enter a ticket subject');
          return;
        }
        setShowTicketModal(false);
        setTicketSubject('');
        setTicketDescription('');
        showToast('Support ticket #TKT-8940 submitted (Simulated Demo)');
      };
      ```
    - Call Modal (lines 534-567): Speed dial `*4357 (*HELP)`, External `+1 (800) 555-CARE (Ext. 09)`, note `[DEMO MODE] No live VoIP line is dialed from the web browser.`
    - Legal Modal (lines 569-611): Static paragraphs for Terms of Service and HIPAA Agreement.

### 1.2 Hardcoded Mock Data
- **File**: `src/pages/settings/types.ts` (lines 51-88):
  - Interface `FAQTopic { id: string; category: string; title: string; description: string; details: string; }`
  - Constant `HELP_TOPICS`: 4 hardcoded FAQ items (`topic-1`: Cath Lab clinical time-out; `topic-2`: Reviewing STAT Critical Diagnostic Findings; `topic-3`: Configuring 2FA; `topic-4`: Resolving OCR Scanned Record Mismatches).

### 1.3 Routing & Navigation Settings References
- **File**: `src/routes/index.tsx`:
  - Lines 414-416: `{ path: '/settings/support', element: <SupportCenterPage /> },`
  - Lines 417-420: `{ path: '/support', element: <SupportCenterPage /> },`
- **File**: `src/pages/settings/ProfessionalProfilePage.tsx` (lines 267-273): Contains `<button onClick={() => navigate('/settings/support')}>Support</button>`.
- **File**: `src/pages/settings/AccountSecurityPage.tsx` (lines 395-401): Contains `<button onClick={() => navigate('/settings/support')}>Support</button>`.
- **File**: `src/pages/settings/NotificationPreferencesPage.tsx` (lines 225-231): Contains `<button onClick={() => navigate('/settings/support')}>Support</button>`.
- **File**: `src/components/layout/PatientLayout.tsx`:
  - Line 95: `const isSupportRoute = location.pathname === '/settings/support';`
  - Lines 411-428: Profile item is a direct NavLink `<NavLink to="/settings" ...>` without dropdown or sub-menu.
  - Lines 434-451: Sidebar bottom support action `<NavLink to="/settings/support" ...>`.
  - Line 503: Header help button `<button onClick={() => navigate('/settings/support')} ...>`.
- **File**: `src/components/layout/Header.tsx`:
  - Line 74: Header help button `<button onClick={() => navigate('/settings')} ...>`.
- **File**: `src/components/layout/Breadcrumbs.tsx`:
  - Line 87: Breadcrumbs suppression list includes `location.pathname === '/support'`.

### 1.4 Postman API Contracts & Live Backend Staging
- **Postman Collection**: `Postman collection/CareID-Staging.postman_collection.json`
- **Folder 25: Support Tickets & Helpdesk**:
  - `POST {{baseUrl}}/api/v1/support/tickets`:
    - Payload: `{ subject: string, description: string, category?: string, priority?: string }`
    - Live Test Result: **HTTP 201 Created**:
      ```json
      {
        "success": true,
        "statusCode": 201,
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
          "createdAt": "2026-11-11T12:32:04.681Z"
        }
      }
      ```
  - `GET {{baseUrl}}/api/v1/support/tickets?status=string&priority=string&category=string&search=string&page=1&limit=20`:
    - Live Test Result: **HTTP 200 OK**:
      ```json
      {
        "success": true,
        "statusCode": 200,
        "data": {
          "data": [
            {
              "id": "fa0a996f-fdb9-4f40-b9b0-ff83f6020cc9",
              "ticketNumber": "TKT-2026-00004",
              "userId": "fa502f2e-332c-4ec0-b6aa-83713216ec88",
              "subject": "Portal latency during clinical workflow",
              "status": "OPEN"
            }
          ],
          "total": 1,
          "page": 1,
          "limit": 20
        }
      }
      ```
  - `GET {{baseUrl}}/api/v1/support/tickets/:id`: Live Test Result: **HTTP 200 OK**.
  - `POST {{baseUrl}}/api/v1/support/tickets/:id/reply`: documented in Postman.
  - `GET {{baseUrl}}/api/v1/support/tickets/:id/replies`: documented in Postman.
- **Folder 21: Content Management System (CMS)**:
  - `GET {{baseUrl}}/api/v1/cms/faqs?category=string`:
    - Live Test Result: **HTTP 200 OK**, data is empty array `[]`.
  - `GET {{baseUrl}}/api/v1/cms/pages`: Live Test Result: **HTTP 200 OK**, data is `[]`.
  - `GET {{baseUrl}}/api/v1/cms/policies`: Live Test Result: **HTTP 200 OK**, data is `[]`.
- **Search for Hotline / SLA / Contact endpoints in Postman**:
  - `hotline`: 0 requests found.
  - `sla`: Only referrals SLA metric found (`/api/v1/referrals/dashboard/stats`). 0 support SLA endpoints.
  - `helpdesk`: Only Folder 25 (tickets). 0 contact endpoints.

### 1.5 Authentication & Session Management
- **File**: `src/services/apiClient.ts`:
  - Base URL resolved from `import.meta.env.VITE_API_BASE_URL` (defaults to `https://360api.vnvision.in`).
  - Access token retrieved via `sessionStorage.getItem('careid_access_token')`.
  - Automatic `Authorization: Bearer <token>` injection for all requests.
  - Intercepts HTTP 401 with token refresh queue via `POST /api/v1/auth/token/refresh` using `careid_refresh_token`.
- **Doctor Identity**: `AuthContext.tsx` provides doctor record `user.id` and auth `user.userId` (`fa502f2e-332c-4ec0-b6aa-83713216ec88`), authenticated via `DOCTOR` role.

### 1.6 Build and Verification Commands
- `npm run type-check` (`tsc -b --noEmit`): Exited with code 0 (zero errors).
- `npm run lint` (`eslint .`): Exited with code 0 (zero errors).
- `npm run build` (`tsc -b && vite build`): Exited with code 0 (built in 7.30s).

---

## 2. Logic Chain

1. **Routing & Tab Separation (R1)**:
   - *From Observation 1.1 & 1.3*: Both `/settings/support` and `/support` load `<SupportCenterPage />`. The Profile settings tabs in `ProfessionalProfilePage.tsx`, `AccountSecurityPage.tsx`, and `NotificationPreferencesPage.tsx` explicitly navigate to `/settings/support`.
   - *Therefore*: Removing `/settings/support` from `routes/index.tsx` and removing the Support tab button from `ProfessionalProfilePage`, `AccountSecurityPage`, and `NotificationPreferencesPage` leaves exactly three tabs (`My Profile`, `Security`, `Notifications`), fulfilling R1 without altering remaining tab layout or styling.
   - *From Observation 1.3*: In `PatientLayout.tsx`, the sidebar Support link navigates to `/settings/support`. Changing this target to `/support` preserves sidebar Support navigation to the standalone Support page. In `Sidebar.tsx` and `PatientLayout.tsx`, Profile is already a direct NavLink to `/settings` with no dropdown. Updating `Header.tsx` and `PatientLayout.tsx` help buttons to `/support` ensures consistent navigation.

2. **Ticket Creation Integration (R4)**:
   - *From Observation 1.1 & 1.4*: Currently, `SupportCenterPage.tsx` uses simulated local state with a hardcoded `#TKT-8940` toast and demo banner. However, the backend endpoint `POST /api/v1/support/tickets` is live, functional, and requires `{ subject, description }` with optional `category` and `priority`.
   - *From Observation 1.4 & 1.5*: Calling `POST /api/v1/support/tickets` via `apiClient.ts` automatically attaches the doctor's Bearer token. The backend successfully creates the ticket, assigns a genuine sequential ticket number (e.g. `TKT-2026-00004`), and returns HTTP 201.
   - *Therefore*: Replacing the mock submission with a call to `supportService.createTicket` will provide genuine backend ticket reference display and honest validation error handling, satisfying R4.

3. **Help Center & FAQ Integration (R3)**:
   - *From Observation 1.2 & 1.4*: `src/pages/settings/types.ts` contains 4 static mock topics (`HELP_TOPICS`). The backend Postman collection defines `GET /api/v1/cms/faqs`, which was tested live and returned HTTP 200 with an empty array `[]`.
   - *From Requirement R3 & Acceptance Criteria*: If backend endpoints return empty data, no simulated responses may be shown; the existing UI empty state must be displayed.
   - *Therefore*: Retiring `HELP_TOPICS` and querying `supportService.getFaqs()` will render the clean UI empty state ("No clinical guides or FAQs currently published") when the backend has no records, satisfying R3 and R6.

4. **Hotline & SLA Verification (R5)**:
   - *From Observation 1.1 & 1.4*: The phone number `+1 (800) 555-CARE (Ext. 09)`, speed dial `*4357`, and SLA `< 15 minutes for STAT` are hardcoded in `SupportCenterPage.tsx`. Exhaustive Postman collection scanning confirmed that zero backend endpoints exist for clinical IT hotlines or helpdesk SLAs.
   - *From Requirement R5*: If no official contact or SLA endpoints exist, fabricated operational contact numbers or fake SLA guarantees must NOT be displayed as verified data.
   - *Therefore*: Replacing these hardcoded strings with unconfigured / unavailable indicators (e.g. `Unconfigured — Contact hospital IT administration` or `—`) preserves card layout, dimensions, typography, and colors while eliminating fabricated operational guarantees, satisfying R5.

5. **Ticket History Scope (R4)**:
   - *From Observation 1.1*: `SupportCenterPage.tsx` has no ticket history table or card in its existing Bento grid.
   - *From Requirement R4 & R6*: "Integrate ticket history... only where supported by documented APIs and existing UI elements, without adding new UI cards or screens" and "do not alter the visual styling, card dimensions, typography, colors, or component structure".
   - *Therefore*: Adding a new card or table to the Bento grid would violate R4 and R6. Ticket history can be accessed via a status view in the ticket dialog or referenced via submitted ticket confirmation without modifying the grid structure.

---

## 3. Caveats

1. **CMS Staging Data Density**: In the live staging environment (`https://360api.vnvision.in`), `GET /api/v1/cms/faqs`, `GET /api/v1/cms/pages`, and `GET /api/v1/cms/policies` currently return empty arrays (`[]`). When live FAQs are published by backend CMS administrators, they will populate automatically via `supportService.getFaqs()`.
2. **Missing Hotline & SLA Endpoints**: No backend endpoints exist for hotline phone or SLA metrics. This is a confirmed backend contract limitation that requires documentation in the final report per R7.
3. **Legal Modal Content**: While CMS policies exist at `GET /api/v1/cms/policies`, the staging backend currently returns an empty list. The legal modals should display clean empty states or hospital governance notices when no CMS policies are returned.

---

## 4. Conclusion

1. **Feasibility**: All requirements (R1, R2, R3, R4, R5, R6) are completely achievable using existing repository architecture.
2. **Architecture Strategy**:
   - Create `src/services/supportService.ts` wrapping Postman endpoints:
     - `POST /api/v1/support/tickets`
     - `GET /api/v1/support/tickets`
     - `GET /api/v1/support/tickets/:id`
     - `POST /api/v1/support/tickets/:id/reply`
     - `GET /api/v1/support/tickets/:id/replies`
     - `GET /api/v1/cms/faqs`
     - `GET /api/v1/cms/policies`
   - Update `src/routes/index.tsx`: remove `/settings/support`, retain `/support`.
   - Update `src/pages/settings/ProfessionalProfilePage.tsx`, `AccountSecurityPage.tsx`, and `NotificationPreferencesPage.tsx`: remove the Support tab button from the tab navigation strip.
   - Update `src/components/layout/PatientLayout.tsx`: change sidebar Support link and Header help button to `/support`.
   - Update `src/components/layout/Header.tsx`: change Help button to `/support`.
   - Update `src/pages/settings/SupportCenterPage.tsx`:
     - Connect ticket submission to `supportService.createTicket`.
     - Remove simulated demo notice and hardcoded ticket ID toast.
     - Connect FAQ accordion to `supportService.getFaqs()`; show existing empty state when `[]`.
     - Replace fake hotline and SLA with truthful unconfigured/empty states (`—` / unconfigured notice).
     - Update breadcrumbs to reflect standalone route (`Dashboard > Support & Legal`).
   - Remove `HELP_TOPICS` from `src/pages/settings/types.ts`.

---

## 5. Verification Method

To independently verify the survey observations and findings:

1. **Verify Postman Endpoints**:
   ```bash
   node -e "
     const fs = require('fs');
     const col = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));
     const supportFolder = col.item.find(i => i.name.includes('25.'));
     console.log('Support requests:', supportFolder.item.map(r => r.name));
   "
   ```
2. **Verify Live Backend Ticket Submission**:
   ```bash
   node -e "
     const fs = require('fs');
     const token = JSON.parse(fs.readFileSync('.token_cache.json', 'utf8')).accessToken;
     fetch('https://360api.vnvision.in/api/v1/support/tickets', {
       method: 'POST',
       headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
       body: JSON.stringify({ subject: 'Verification Probe', description: 'Testing endpoint validity' })
     }).then(r => r.json()).then(console.log);
   "
   ```
3. **Verify Build & Type Safety**:
   ```bash
   npm run type-check
   npm run lint
   npm run build
   ```
4. **Invalidation Conditions**:
   - The findings would be invalidated if backend added official hotline/SLA endpoints not in Postman.
   - The findings would be invalidated if `/settings/support` was required to remain as a tab in Profile settings (directly contradicted by R1).
