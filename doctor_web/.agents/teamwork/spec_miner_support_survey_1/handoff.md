# Handoff Report: Postman API Spec Mining for Support Module

## 1. Observation

1. **Postman Collection Location and Structure**:
   - File inspected: `Postman collection/CareID-Staging.postman_collection.json` (Release date: November 6, 2026, 27 top-level folders).
   - Environment file: `Postman collection/CareID-Staging.postman_environment.json`.
   - `baseUrl` in environment is `https://360api.vnvision.in/api/v1`.
   - Folder 25: `25. Support Tickets & Helpdesk` contains 6 endpoints:
     - `POST {{baseUrl}}/api/v1/support/tickets` (Create support ticket)
     - `GET {{baseUrl}}/api/v1/support/tickets?status=string&priority=string&category=string&search=string&page=1&limit=20` (List support tickets)
     - `GET {{baseUrl}}/api/v1/support/tickets/:id` (Get support ticket details by ID)
     - `PUT {{baseUrl}}/api/v1/support/tickets/:id` (Update support ticket status, priority or assignment - Admin/Staff)
     - `POST {{baseUrl}}/api/v1/support/tickets/:id/reply` (Add message reply to support ticket)
     - `GET {{baseUrl}}/api/v1/support/tickets/:id/replies` (Get all replies for support ticket)
   - Folder 21: `21. Content Management System (CMS)` contains:
     - `GET {{baseUrl}}/api/v1/cms/faqs?category=string` (List published FAQs)
     - `GET {{baseUrl}}/api/v1/cms/pages/search?q=string` (Search published CMS pages)
     - `GET {{baseUrl}}/api/v1/cms/pages` (List published CMS pages)
     - `GET {{baseUrl}}/api/v1/cms/blocks` (List content blocks)

2. **Absence of Specific Endpoints in Postman**:
   - Search across all 27 folders for `clinical guide`, `hotline`, `phone`, `extension`, or `helpdesk SLA` confirmed **zero endpoints** exist for:
     - Clinical Guides (`/api/v1/clinical-guides` does NOT exist)
     - IT Helpdesk Phone / Hotline / Speed Dial
     - Support SLA Guarantees
     - Ticket Attachments / File upload on tickets

3. **Live Staging API Probing**:
   - Target host: `https://360api.vnvision.in`.
   - Health check probe: `GET /api/v1/health` returned `200 OK` with `{"success":true,"statusCode":200,"data":{"status":"ok","service":"HVAPI Backend"}}`.
   - Authentication probe: Obtained JWT doctor access token for phone `+16505550003` via `/api/v1/auth/otp/request` and `/api/v1/auth/otp/verify` (using payload `{ challengeId, otpCode: "123456" }`). Doctor user ID: `fa502f2e-332c-4ec0-b6aa-83713216ec88`.
   - Support tickets unauthorized probe: `GET /api/v1/support/tickets` without Bearer token returned `401 UnauthorizedException` (`"message":"Unauthorized"`).
   - Support tickets authorized probe: `GET /api/v1/support/tickets` with Bearer token returned `200 OK` with paginated payload `{ data: [...], total: 4, page: 1, limit: 20 }`.
   - Ticket creation validation probe: `POST /api/v1/support/tickets` with empty body `{}` returned `400 Bad Request` with messages: `["subject must be a string", "subject should not be empty", "description must be a string", "description should not be empty"]`.
   - Ticket creation valid probe: `POST /api/v1/support/tickets` with `{ subject: "Test subject", description: "Test desc" }` returned `201 Created` with `data: { id: "915ecd24-af03-4609-b257-21f30af3a423", ticketNumber: "TKT-2026-00006", userId: "fa502f2e-332c-4ec0-b6aa-83713216ec88", status: "OPEN", category: "GENERAL", priority: "MEDIUM", isDemonstrationStorage: true }`.
   - Ticket update RBAC probe: `PUT /api/v1/support/tickets/:id` with doctor token returned `403 Forbidden` (`{"error":"ForbiddenException","message":"Forbidden resource"}`).
   - Ticket reply probe: `POST /api/v1/support/tickets/:id/reply` with `{ message: "Doctor follow-up reply regarding latency." }` returned `201 Created` with `data: { id: "9dc0d7b4-153c-4a2e-adaf-508663e63581", ticketId: "...", userId: "...", userRole: "DOCTOR", message: "..." }`.
   - Ticket replies list probe: `GET /api/v1/support/tickets/:id/replies` returned `200 OK` with array containing the created reply.
   - CMS FAQ probe: `GET /api/v1/cms/faqs` returned `200 OK` with `data: []` (public, no authentication needed, currently empty).

4. **Frontend Navigation & Mock Data Inspection**:
   - `src/pages/settings/SupportCenterPage.tsx`:
     - Line 59: `showToast('Support ticket #TKT-8940 submitted (Simulated Demo)')`
     - Lines 113-141: Settings tab strip rendering `Support` button
     - Line 301: Hardcoded phone `<span className="font-mono font-semibold text-slate-800">+1 (800) 555-CARE (Ext. 09)</span>`
     - Line 305: Hardcoded SLA `<span className="font-semibold text-emerald-600">&lt; 15 minutes for STAT</span>`
     - Line 509: Demo text `"Demonstration Note: This ticket submission is simulated locally..."`
     - Line 551: Speed dial `"Dial *4357 (*HELP)"`
   - `src/pages/settings/types.ts`:
     - Lines 59-88: Hardcoded `HELP_TOPICS` array containing 4 static topics.
   - `src/pages/settings/ProfessionalProfilePage.tsx` (lines 269-272), `AccountSecurityPage.tsx` (lines 397-400), `NotificationPreferencesPage.tsx` (lines 227-230): All render the `Support` tab button linking to `/settings/support`.
   - `src/routes/index.tsx` (lines 414-419): Maps both `/settings/support` and `/support` to `<SupportCenterPage />`.
   - `src/components/layout/PatientLayout.tsx` (lines 432-452): Sidebar Support link currently navigates to `/settings/support`.

---

## 2. Logic Chain

1. **API Contract Verification**:
   - By examining the Postman collection items and testing against `https://360api.vnvision.in`, we proved that live backend endpoints exist for:
     a) Ticket creation (`POST /api/v1/support/tickets`)
     b) Ticket listing (`GET /api/v1/support/tickets`)
     c) Ticket details (`GET /api/v1/support/tickets/:id`)
     d) Threaded replies (`POST /api/v1/support/tickets/:id/reply`, `GET /api/v1/support/tickets/:id/replies`)
     e) CMS FAQs (`GET /api/v1/cms/faqs`)
   - Therefore, the Support module can be fully connected to live backend APIs for ticket submission, status retrieval, and FAQs without inventing routes.

2. **Doctor Identity and Impersonation Prevention**:
   - Observations confirmed that `POST /api/v1/support/tickets` uses `req.user.id` from the decoded JWT Bearer token to populate `userId`.
   - Therefore, the frontend client only needs to pass `subject`, `description`, `category`, and `priority`, ensuring strict adherence to the authenticated doctor's session without impersonation.

3. **Missing Backend APIs (Gaps)**:
   - Exhaustive keyword searches across the 27 folders confirmed that clinical guides, helpdesk hotline phone numbers, and SLA guarantees are completely absent from the Postman collection.
   - Per requirements R3, R5, and R6, when an endpoint is absent, the frontend MUST NOT simulate backend responses or present fake operational numbers as verified data.
   - Therefore, hardcoded `HELP_TOPICS`, fake phone `+1 (800) 555-CARE`, fake speed dial `*4357`, and fake SLA `< 15 minutes` must be removed and replaced with standard empty/unconfigured states while preserving UI card dimensions and layout.

4. **Navigation Correction (R1)**:
   - Observations show that `/settings` tab navigation contains 4 tabs: My Profile, Security, Notifications, and Support.
   - Per R1, Support must be removed from the Profile settings top navigation inside `/settings`, keeping only My Profile, Security, and Notifications.
   - The standalone `/support` route and sidebar Support navigation must be preserved so that clicking Support in the sidebar directly opens the standalone Support page.

---

## 3. Caveats

- **Staging Database Persistence**: The backend response explicitly states `isDemonstrationStorage: true` and `storageNotice: "Operating on staging demonstration persistence. Dedicated PostgreSQL schema migration pending approval."` Data submitted during testing is stored in staging JSON persistence on the server.
- **Empty CMS FAQs**: The `GET /api/v1/cms/faqs` endpoint is live and returns `200 OK` with an empty array (`[]`). When wired up, the UI will appropriately display the empty state until content administrators publish FAQ records.

---

## 4. Conclusion

The authoritative Postman collection and live staging backend support:
- Live Support Ticket creation, listing, detail inspection, and replies under `/api/v1/support/tickets*`.
- Live CMS FAQs under `/api/v1/cms/faqs`.

The following are ABSENT from the backend contract and must NOT be simulated:
- Clinical guides (no backend endpoint; display empty state).
- Helpdesk hotline phone, extension, and speed dial (no backend endpoint; remove fake operational data).
- SLA response times (no backend endpoint; remove fake SLA text).
- Ticket attachments (not supported by ticket DTO).

The implementation roadmap is clearly defined and ready for execution:
1. Remove Support tab from `/settings` tab bars across settings pages.
2. Create `supportService.ts` and TypeScript interfaces matching the verified DTO schemas.
3. Integrate ticket submission in `SupportCenterPage.tsx` with `POST /api/v1/support/tickets`.
4. Replace simulated toast with actual backend `ticketNumber`.
5. Connect FAQs to `GET /api/v1/cms/faqs` and remove static `HELP_TOPICS`.
6. Remove fake contact/SLA strings and replace with clean unconfigured state.

---

## 5. Verification Method

To verify these findings independently:
1. **Postman Collection Inspection**:
   ```powershell
   $json = Get-Content -Raw -Path ".\Postman collection\CareID-Staging.postman_collection.json" | ConvertFrom-Json
   $json.item | Where-Object { $_.name -like "*Support*" } | Select-Object -ExpandProperty item | Select-Object name, @{n='Method';e={$_.request.method}}, @{n='URL';e={$_.request.url.raw}}
   ```
2. **Live Staging Health & Tickets Verification**:
   ```bash
   curl.exe -s https://360api.vnvision.in/api/v1/health
   curl.exe -s https://360api.vnvision.in/api/v1/cms/faqs
   ```
3. **Frontend Build & Type Check**:
   ```bash
   npm run build
   npx tsc --noEmit
   ```
