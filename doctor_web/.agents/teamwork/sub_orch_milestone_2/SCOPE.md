# Scope: Milestone 2 — Support API Service & DTOs

## Architecture
- **Service Layer**: Dedicated service module `src/services/supportService.ts` reusing existing `apiClient` (`src/services/apiClient.ts`).
- **Transport**: Standard JSON REST requests over HTTPS (`https://360api.vnvision.in/api/v1`) using Bearer token from session storage via `apiClient`.
- **Type Definitions**: `src/pages/settings/types.ts` and `src/services/supportService.ts` containing strict DTOs matching Postman Collection Folder 25 (Support Tickets) & Folder 21 (CMS).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 5 | Support API Service & TypeScript DTOs | Create `src/services/supportService.ts` strictly matching Postman contracts with TypeScript DTOs | M2 | R2, R6 |
| 6 | Mock Data Deprecation & Removal | Remove/deprecate `HELP_TOPICS` constant and local simulation state in `src/pages/settings/types.ts` | M2 | R6 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 2 | Support API Service & DTOs | Create `supportService.ts`, define DTOs, retire `HELP_TOPICS` mock constant | none | IN_PROGRESS |

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

export interface SupportTicketReplyDTO {
  id?: string;
  ticketId?: string;
  userId?: string;
  userRole?: string;
  message: string;
  createdAt?: string;
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
  replies?: SupportTicketReplyDTO[];
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

### Endpoints to Implement in `supportService.ts`:
- `createTicket(payload: CreateSupportTicketPayload): Promise<ApiResponse<SupportTicketDTO>>` -> `POST /support/tickets`
- `getTickets(params?: SupportTicketQueryParams): Promise<ApiResponse<PaginatedSupportTicketsDTO>>` -> `GET /support/tickets`
- `getTicketById(id: string): Promise<ApiResponse<SupportTicketDTO>>` -> `GET /support/tickets/${id}`
- `replyTicket(id: string, message: string): Promise<ApiResponse<SupportTicketReplyDTO>>` -> `POST /support/tickets/${id}/reply`
- `getTicketReplies(id: string): Promise<ApiResponse<SupportTicketReplyDTO[]>>` -> `GET /support/tickets/${id}/replies`
- `getFaqs(category?: string): Promise<ApiResponse<FAQItemDTO[]>>` -> `GET /cms/faqs`
- `getPolicies(policyType?: string): Promise<ApiResponse<CMSPolicyDTO[]>>` -> `GET /cms/policies`

## Write Ownership (Exclusively for M2)
- `src/services/supportService.ts`
- `src/pages/settings/types.ts`
