/**
 * CareID Notification, Announcement & Support Service
 *
 * Implements genuine backend communication with https://360api.vnvision.in
 * following the authoritative Postman collection and live endpoints:
 *
 * 1. Notifications & Alerts (Folder 14):
 * - Notification Platform Stats: GET /api/v1/notifications/dashboard/stats
 * - List Notifications: GET /api/v1/notifications
 * - Notification Details: GET /api/v1/notifications/:id
 * - Mark as Read: PUT /api/v1/notifications/:id/read
 * - Soft Delete / Archive: DELETE /api/v1/notifications/:id
 * - Dispatch Notification: POST /api/v1/notifications
 *
 * 2. Content Management System (Folder 21):
 * - List Announcements: GET /api/v1/cms/announcements
 * - Create Announcement: POST /api/v1/cms/announcements
 * - Update Announcement: PUT /api/v1/cms/announcements/:id
 * - Delete Announcement: DELETE /api/v1/cms/announcements/:id
 *
 * 3. Support Tickets & Helpdesk (Folder 25):
 * - List Tickets: GET /api/v1/support/tickets
 * - Create Ticket: POST /api/v1/support/tickets
 * - Ticket Details: GET /api/v1/support/tickets/:id
 * - Update Ticket: PUT /api/v1/support/tickets/:id
 * - Post Ticket Reply: POST /api/v1/support/tickets/:id/reply
 * - Get Ticket Replies: GET /api/v1/support/tickets/:id/replies
 */

import { apiClient, type ApiResponse } from './apiClient';

export interface NotificationPlatformStats {
  totalNotifications: number;
  pendingCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  readCount: number;
  activeTemplatesCount: number;
  queuePendingCount: number;
}

export interface BackendNotification {
  id: string;
  recipientUserId?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  title: string;
  message: string;
  notificationType: string; // 'PATIENT' | 'SYSTEM' | 'SECURITY' | 'OCR' | 'REFERRAL' | 'RECORD' | 'AUDIT'
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';
  channel: 'SMS' | 'EMAIL' | 'IN_APP' | 'PUSH' | 'WHATSAPP';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ' | 'ARCHIVED' | 'QUEUED';
  sentAt?: string;
  readAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface BackendAnnouncement {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string;
  startDate?: string;
  endDate?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportReply {
  id: string;
  ticketId: string;
  userId: string;
  userRole?: string;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  subject: string;
  description: string;
  category: 'TECHNICAL' | 'BILLING' | 'ACCOUNT' | 'CLINICAL' | 'GENERAL' | string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | string;
  assignedTo?: string;
  replies?: SupportReply[];
  createdAt: string;
  updatedAt: string;
  isDemonstrationStorage?: boolean;
  storageNotice?: string;
}

export interface SupportTicketsResponse {
  data: SupportTicket[];
  total: number;
  page: number;
  limit: number;
}

export const notificationService = {
  /**
   * Get Enterprise Notification Platform stats & queue summary
   * GET /api/v1/notifications/dashboard/stats
   */
  async getDashboardStats(): Promise<ApiResponse<NotificationPlatformStats>> {
    return apiClient.get<NotificationPlatformStats>('/api/v1/notifications/dashboard/stats');
  },

  /**
   * Get total unread notifications count for current user
   * GET /api/v1/notifications/unread-count
   */
  async getUnreadCount(): Promise<ApiResponse<{ unreadCount: number }>> {
    return apiClient.get<{ unreadCount: number }>('/api/v1/notifications/unread-count');
  },

  /**
   * Mark all unread notifications as READ for current user
   * PUT /api/v1/notifications/read-all
   */
  async markAllAsRead(): Promise<ApiResponse<{ success: boolean; markedCount: number }>> {
    return apiClient.put<{ success: boolean; markedCount: number }>('/api/v1/notifications/read-all');
  },

  /**
   * List notifications for recipient or platform
   * GET /api/v1/notifications
   */
  async getNotifications(params?: {
    recipientUserId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<BackendNotification[]>> {
    const query = new URLSearchParams();
    if (params?.recipientUserId) query.append('recipientUserId', params.recipientUserId);
    if (params?.status) query.append('status', params.status);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));

    const qs = query.toString();
    const url = `/api/v1/notifications${qs ? `?${qs}` : ''}`;
    return apiClient.get<BackendNotification[]>(url);
  },

  /**
   * Get notification details by UUID
   * GET /api/v1/notifications/:id
   */
  async getNotificationById(id: string): Promise<ApiResponse<BackendNotification>> {
    return apiClient.get<BackendNotification>(`/api/v1/notifications/${id}`);
  },

  /**
   * Mark notification as READ
   * PUT /api/v1/notifications/:id/read
   */
  async markAsRead(id: string): Promise<ApiResponse<BackendNotification>> {
    return apiClient.put<BackendNotification>(`/api/v1/notifications/${id}/read`);
  },

  /**
   * Soft-delete / archive a notification
   * DELETE /api/v1/notifications/:id
   */
  async deleteNotification(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/api/v1/notifications/${id}`);
  },

  /**
   * Publish/dispatch a notification across channels
   * POST /api/v1/notifications
   */
  async dispatchNotification(payload: {
    title: string;
    message: string;
    recipientUserId?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    notificationType?: string;
    priority?: string;
    channel?: string;
    metadata?: Record<string, any>;
    scheduledAt?: string;
  }): Promise<ApiResponse<BackendNotification>> {
    return apiClient.post<BackendNotification>('/api/v1/notifications', {
      notificationType: 'SYSTEM',
      priority: 'NORMAL',
      channel: 'IN_APP',
      ...payload
    });
  },

  /**
   * List active announcements
   * GET /api/v1/cms/announcements
   */
  async getAnnouncements(params?: { activeOnly?: boolean }): Promise<ApiResponse<BackendAnnouncement[]>> {
    const query = new URLSearchParams();
    if (params?.activeOnly) query.append('activeOnly', 'true');

    const qs = query.toString();
    const url = `/api/v1/cms/announcements${qs ? `?${qs}` : ''}`;
    return apiClient.get<BackendAnnouncement[]>(url);
  },

  /**
   * Create a new system announcement
   * POST /api/v1/cms/announcements
   */
  async createAnnouncement(payload: {
    title: string;
    description: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<BackendAnnouncement>> {
    return apiClient.post<BackendAnnouncement>('/api/v1/cms/announcements', {
      priority: 'HIGH',
      status: 'PUBLISHED',
      ...payload
    });
  },

  /**
   * Update an existing announcement
   * PUT /api/v1/cms/announcements/:id
   */
  async updateAnnouncement(
    id: string,
    payload: Partial<BackendAnnouncement>
  ): Promise<ApiResponse<BackendAnnouncement>> {
    return apiClient.put<BackendAnnouncement>(`/api/v1/cms/announcements/${id}`, payload);
  },

  /**
   * Soft-delete an announcement
   * DELETE /api/v1/cms/announcements/:id
   */
  async deleteAnnouncement(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/v1/cms/announcements/${id}`);
  },

  // =========================================================================
  // Support Tickets & Helpdesk (Folder 25)
  // =========================================================================

  /**
   * List support tickets
   * GET /api/v1/support/tickets
   */
  async getSupportTickets(params?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<SupportTicketsResponse>> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const qs = query.toString();
    return apiClient.get<SupportTicketsResponse>(`/api/v1/support/tickets${qs ? `?${qs}` : ''}`);
  },

  /**
   * Get support ticket details
   * GET /api/v1/support/tickets/:id
   */
  async getSupportTicketById(id: string): Promise<ApiResponse<SupportTicket>> {
    return apiClient.get<SupportTicket>(`/api/v1/support/tickets/${id}`);
  },

  /**
   * Create a new support ticket
   * POST /api/v1/support/tickets
   */
  async createSupportTicket(payload: {
    subject: string;
    description: string;
    category: string;
    priority: string;
  }): Promise<ApiResponse<SupportTicket>> {
    return apiClient.post<SupportTicket>('/api/v1/support/tickets', payload);
  },

  /**
   * Update a support ticket status or priority
   * PUT /api/v1/support/tickets/:id
   */
  async updateSupportTicket(
    id: string,
    payload: {
      status?: string;
      priority?: string;
      assignedTo?: string;
    }
  ): Promise<ApiResponse<SupportTicket>> {
    return apiClient.put<SupportTicket>(`/api/v1/support/tickets/${id}`, payload);
  },

  /**
   * Post a reply to a support ticket
   * POST /api/v1/support/tickets/:id/reply
   */
  async replySupportTicket(
    id: string,
    message: string
  ): Promise<ApiResponse<SupportReply>> {
    return apiClient.post<SupportReply>(`/api/v1/support/tickets/${id}/reply`, { message });
  },

  /**
   * Get all replies for a support ticket
   * GET /api/v1/support/tickets/:id/replies
   */
  async getSupportTicketReplies(id: string): Promise<ApiResponse<SupportReply[]>> {
    return apiClient.get<SupportReply[]>(`/api/v1/support/tickets/${id}/replies`);
  }
};

export const supportService = {
  getTickets: notificationService.getSupportTickets,
  getTicketById: notificationService.getSupportTicketById,
  createTicket: notificationService.createSupportTicket,
  updateTicket: notificationService.updateSupportTicket,
  replyTicket: notificationService.replySupportTicket,
  getReplies: notificationService.getSupportTicketReplies
};

export default notificationService;
