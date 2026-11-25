/**
 * CareID Doctor-Web Support & CMS API Service
 *
 * Authoritative API Contracts: Postman Collection (CareID-Staging.postman_collection.json)
 * - Folder 25: Support Tickets & Helpdesk
 *   - POST   /api/v1/support/tickets             (Create ticket)
 *   - GET    /api/v1/support/tickets             (List paginated tickets)
 *   - GET    /api/v1/support/tickets/:id         (Get ticket by ID)
 *   - POST   /api/v1/support/tickets/:id/reply   (Add message reply to ticket)
 *   - GET    /api/v1/support/tickets/:id/replies (Get ticket replies)
 * - Folder 21: Content Management System (CMS)
 *   - GET    /api/v1/cms/faqs                    (List published FAQs with optional category)
 *   - GET    /api/v1/cms/pages/search            (Search published CMS pages)
 *   - GET    /api/v1/cms/pages                   (List published CMS pages)
 *   - GET    /api/v1/cms/blocks                  (List content blocks)
 */

import { apiClient, ApiResponse, ApiError } from './apiClient';
import type {
  CreateSupportTicketPayload,
  SupportTicketDTO,
  SupportTicketReplyDTO,
  PaginatedSupportTicketsDTO,
  SupportTicketQueryParams,
  FAQItemDTO,
  CMSPolicyDTO,
  CMSPageDTO,
  CMSBlockDTO,
} from '../pages/settings/types';

// Re-export DTOs for service consumers
export type {
  CreateSupportTicketPayload,
  SupportTicketDTO,
  SupportTicketReplyDTO,
  PaginatedSupportTicketsDTO,
  SupportTicketQueryParams,
  FAQItemDTO,
  CMSPolicyDTO,
  CMSPageDTO,
  CMSBlockDTO,
};
export { ApiError };

/**
 * Create a new support ticket using authenticated doctor's JWT session.
 * Backend automatically populates userId from req.user.id.
 */
export async function createTicket(
  payload: CreateSupportTicketPayload
): Promise<ApiResponse<SupportTicketDTO>> {
  return apiClient.post<SupportTicketDTO>('/api/v1/support/tickets', payload);
}

/**
 * List support tickets owned by authenticated user (or all tickets for staff/admin).
 * Supports status, priority, category, search, page, limit query filters.
 */
export async function getTickets(
  params?: SupportTicketQueryParams
): Promise<ApiResponse<PaginatedSupportTicketsDTO>> {
  const query = new URLSearchParams();
  if (params) {
    if (params.status) query.set('status', params.status);
    if (params.priority) query.set('priority', params.priority);
    if (params.category) query.set('category', params.category);
    if (params.search) query.set('search', params.search);
    if (params.page !== undefined && params.page !== null) query.set('page', String(params.page));
    if (params.limit !== undefined && params.limit !== null) query.set('limit', String(params.limit));
  }
  const queryString = query.toString();
  const endpoint = queryString ? `/api/v1/support/tickets?${queryString}` : '/api/v1/support/tickets';
  return apiClient.get<PaginatedSupportTicketsDTO>(endpoint);
}

/**
 * Retrieve support ticket details by ID.
 */
export async function getTicketById(
  id: string
): Promise<ApiResponse<SupportTicketDTO>> {
  return apiClient.get<SupportTicketDTO>(`/api/v1/support/tickets/${encodeURIComponent(id)}`);
}

/**
 * Add a follow-up reply message to an existing support ticket.
 */
export async function addTicketReply(
  id: string,
  message: string
): Promise<ApiResponse<SupportTicketReplyDTO>> {
  return apiClient.post<SupportTicketReplyDTO>(
    `/api/v1/support/tickets/${encodeURIComponent(id)}/reply`,
    { message }
  );
}

/**
 * Retrieve all conversation replies for a support ticket.
 */
export async function getTicketReplies(
  id: string
): Promise<ApiResponse<SupportTicketReplyDTO[]>> {
  return apiClient.get<SupportTicketReplyDTO[]>(
    `/api/v1/support/tickets/${encodeURIComponent(id)}/replies`
  );
}

/**
 * Retrieve published FAQs, optionally filtered by category.
 */
export async function getFaqs(
  category?: string
): Promise<ApiResponse<FAQItemDTO[]>> {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiClient.get<FAQItemDTO[]>(`/api/v1/cms/faqs${query}`);
}

/**
 * Search published CMS pages by query keyword.
 */
export async function searchCmsPages(
  query: string
): Promise<ApiResponse<CMSPolicyDTO[]>> {
  return apiClient.get<CMSPolicyDTO[]>(
    `/api/v1/cms/pages/search?q=${encodeURIComponent(query)}`
  );
}

/**
 * Retrieve all published CMS pages / platform policies.
 */
export async function getCmsPages(): Promise<ApiResponse<CMSPolicyDTO[]>> {
  return apiClient.get<CMSPolicyDTO[]>('/api/v1/cms/pages');
}

/**
 * Retrieve reusable CMS content blocks.
 * Note: May require administrative privileges on staging backend.
 */
export async function getCmsBlocks(): Promise<ApiResponse<unknown[]>> {
  return apiClient.get<unknown[]>('/api/v1/cms/blocks');
}

export const supportService = {
  createTicket,
  getTickets,
  getTicketById,
  addTicketReply,
  getTicketReplies,
  getFaqs,
  searchCmsPages,
  getCmsPages,
  getCmsBlocks,
};

export default supportService;
