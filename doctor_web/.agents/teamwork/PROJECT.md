# Project: CareID Doctor Web Portal — Support Module & Navigation Integration

## Architecture
- **Application Stack**: React 18, Vite, TypeScript, Tailwind CSS, React Router DOM v6, Lucide Icons.
- **Backend API Base**: `https://360api.vnvision.in/api/v1`
- **Route Topology**:
  - `/settings`: `ProfessionalProfilePage` (Profile settings; 3 tabs: My Profile, Security, Notifications)
  - `/settings/security`: `AccountSecurityPage` (3 tabs: My Profile, Security, Notifications)
  - `/settings/notifications`: `NotificationPreferencesPage` (3 tabs: My Profile, Security, Notifications)
  - `/settings/support`: Redirect `<Navigate to="/support" replace />` (decoupled from settings)
  - `/support`: `SupportCenterPage` (Standalone Support & Legal workstation)
- **Navigation Architecture**:
  - Sidebar: Profile item is direct `<NavLink to="/settings">` with NO dropdown. Support item is `<NavLink to="/support">`.
  - Header: Help icon triggers `navigate('/support')`.
- **Service Layer**:
  - `src/services/apiClient.ts`: Core HTTP transport with Bearer token injection from `sessionStorage`, 401 refresh queue, and unified error handling.
  - `src/services/supportService.ts`: Dedicated service implementing Postman Folder 25 (Support Tickets) and Folder 21 (CMS FAQs & Policies).
- **Data Models**:
  - `src/pages/settings/types.ts`: TypeScript DTO interfaces aligned to Postman collection (`SupportTicketDTO`, `CreateSupportTicketPayload`, `PaginatedSupportTicketsDTO`, `FAQItemDTO`, `CMSPolicyDTO`). Retired `HELP_TOPICS` mock constant.
- **UI State & Layout**:
  - `SupportCenterPage.tsx`: Standalone 12-column Bento grid.
    - Span 8: Help Center & Clinical Guides (live query to `supportService.getFaqs()`; clean UI empty state when empty; search & category filter preserved).
    - Span 4: Direct Assistance (CTA "Submit IT Support Ticket" wired to live backend `POST /api/v1/support/tickets`; fake phone and fake SLA replaced with honest unconfigured indicators `—` / institutional notice without altering card dimensions).
    - Modals: Live ticket submission with genuine `ticketNumber` / ID display and backend error handling; institutional helpdesk guidance.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Settings Tab Navigation Correction | Remove Support tab from top nav in `ProfessionalProfilePage`, `AccountSecurityPage`, `NotificationPreferencesPage` | M1 | R1 |
| 2 | Route Mapping Decoupling | Decouple `/settings/support` route with redirect to standalone `/support` in `routes/index.tsx` | M1 | R1 |
| 3 | Sidebar & Header Support Navigation | Update sidebar Support target to `/support` and verify direct Profile nav without dropdown | M1 | R1 |
| 4 | Support Page Header Clean-up | Remove duplicate settings tab strip and simplify breadcrumb in `SupportCenterPage.tsx` | M1 | R1, R6 |
| 5 | Support API Service & TypeScript DTOs | Create `src/services/supportService.ts` strictly matching Postman contracts with TypeScript DTOs | M2 | R2, R6 |
| 6 | Mock Data Deprecation & Removal | Remove `HELP_TOPICS` constant and local simulation state | M2 | R6 |
| 7 | Help Center & Clinical Guides Live Integration | Wire FAQ search and accordion to `supportService.getFaqs()`; display UI empty state when `[]` | M3 | R3, R6 |
| 8 | Support Ticket Submission Live Integration | Connect ticket submission modal to `supportService.createTicket()`; display real ticket number & backend errors | M3 | R4, R6 |
| 9 | Ticket History Integration Scope | Integrate ticket history/status within existing UI elements without adding new UI cards | M3 | R4, R6 |
| 10 | Direct Assistance Contact/SLA Verification | Replace fake phone `+1 (800) 555-CARE` and fake SLA `< 15 min` with truthful unconfigured state | M3 | R5, R6 |
| 11 | Opaque-Box E2E Testing Suite (Tiers 1-4) | Comprehensive E2E test suite covering navigation, tickets, CMS, and error handling | M4 | Acceptance Criteria |
| 12 | Final Quality Verification & Report | Verify TypeScript, ESLint, production build, live staging tests, and deliver 11-point report | M4 | R7 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Navigation & Route Decoupling | Remove Support tab from settings, decouple routes, update sidebar/header, verify direct Profile link | none | DONE (audited CLEAN by auditor_m1) |
| 2 | Support API Service & DTOs | Create `supportService.ts`, define DTOs, retire `HELP_TOPICS` mock constant | none | DONE (audited CLEAN by auditor_m2) |
| 3 | Standalone Support Page UI Integration | Wire ticket submission, FAQs, unconfigured contact/SLA indicators into `SupportCenterPage.tsx` | M1, M2 | DONE (audited CLEAN by auditor_m3) |
| 4 | E2E Testing, Quality Gates & Final Report | Run and pass E2E test suite, verify `type-check`, `lint`, `build`, staging API test, generate report | M1, M2, M3 | DONE (audited CLEAN by auditor_m4) |

## Interface Contracts

### `src/services/supportService.ts`
```typescript
import { apiClient, ApiResponse } from './apiClient';

export interface CreateSupportTicketPayload {
  subject: string;
  description: string;
  category?: 'TECHNICAL' | 'BILLING' | 'CLINICAL' | 'ACCOUNT' | 'GENERAL';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export interface SupportTicketDTO {
  id: string;
  ticketNumber: string;
  userId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
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
```

## Code Layout
- `src/pages/settings/ProfessionalProfilePage.tsx` — Owned by M1 (Tab navigation strip)
- `src/pages/settings/AccountSecurityPage.tsx` — Owned by M1 (Tab navigation strip)
- `src/pages/settings/NotificationPreferencesPage.tsx` — Owned by M1 (Tab navigation strip)
- `src/routes/index.tsx` — Owned by M1 (Route decoupling)
- `src/components/layout/PatientLayout.tsx` — Owned by M1 (Sidebar & Header Help buttons)
- `src/components/layout/Header.tsx` — Owned by M1 (Header Help button)
- `src/services/supportService.ts` — Owned by M2 (Dedicated Support & CMS client)
- `src/pages/settings/types.ts` — Owned by M2 (Support DTOs and type contracts)
- `src/pages/settings/SupportCenterPage.tsx` — Owned by M1 (Header cleanup) & M3 (Live backend integration)
- `tests/e2e/` — Owned by M4 (E2E Test cases and runner)
