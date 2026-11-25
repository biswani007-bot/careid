/**
 * CareID Doctor Web — Chat Service (CR-07)
 * Maps to backend /api/v1/conversations endpoints.
 */

import { apiClient } from './apiClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderRole: string;
  content: string;
  attachmentId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  patientProfileId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  facilityId?: string;
  subject?: string;
  lastMessageAt: string;
  createdAt: string;
  lastMessage?: DirectMessage;
  unreadCount: number;
}

export interface CreateConversationPayload {
  participantId: string;
  facilityId?: string;
  subject?: string;
  initialMessage?: string;
}

export interface SendMessagePayload {
  content: string;
  attachmentId?: string;
}

export interface ChatTemplate {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateChatTemplatePayload {
  title: string;
  content: string;
}

export interface UpdateChatTemplatePayload {
  title?: string;
  content?: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function unwrap<T>(res: { data: T | { data: T } }): T {
  const p = res.data;
  if (p && typeof p === 'object' && 'data' in (p as object)) {
    return (p as { data: T }).data;
  }
  return p as T;
}

function unwrapArray<T>(res: { data: T[] | { data: T[] } }): T[] {
  const p = res.data;
  if (Array.isArray(p)) return p;
  if (p && typeof p === 'object' && Array.isArray((p as { data: T[] }).data)) {
    return (p as { data: T[] }).data;
  }
  return [];
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const chatService = {
  /**
   * List all conversations for the authenticated user.
   * GET /api/v1/conversations
   */
  async getConversations(): Promise<Conversation[]> {
    const res = await apiClient.get<Conversation[]>('/api/v1/conversations');
    return unwrapArray(res);
  },

  /**
   * Get a conversation by ID.
   * GET /api/v1/conversations/:id
   */
  async getConversationById(id: string): Promise<Conversation> {
    const res = await apiClient.get<Conversation>(`/api/v1/conversations/${encodeURIComponent(id)}`);
    return unwrap(res);
  },

  /**
   * Create a new conversation thread.
   * POST /api/v1/conversations
   */
  async createConversation(payload: CreateConversationPayload): Promise<Conversation> {
    const res = await apiClient.post<Conversation>('/api/v1/conversations', payload);
    return unwrap(res);
  },

  /**
   * Get message history for a conversation.
   * GET /api/v1/conversations/:id/messages
   */
  async getMessages(conversationId: string): Promise<DirectMessage[]> {
    const res = await apiClient.get<DirectMessage[]>(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`
    );
    return unwrapArray(res);
  },

  /**
   * Send a message in a conversation.
   * POST /api/v1/conversations/:id/messages
   */
  async sendMessage(conversationId: string, payload: SendMessagePayload): Promise<DirectMessage> {
    const res = await apiClient.post<DirectMessage>(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
      payload
    );
    return unwrap(res);
  },

  /**
   * Mark all messages in a conversation as read.
   * PUT /api/v1/conversations/:id/read
   */
  async markAsRead(conversationId: string): Promise<{ success: boolean }> {
    const res = await apiClient.put<{ success: boolean }>(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}/read`,
      {}
    );
    return unwrap(res);
  },

  /**
   * Get total unread message count badge.
   * GET /api/v1/conversations/unread-count
   */
  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<{ unreadCount: number }>('/api/v1/conversations/unread-count');
    const payload = unwrap(res);
    return payload?.unreadCount ?? 0;
  },

  /**
   * List customizable response templates (CR-07)
   * GET /api/v1/conversations/templates
   */
  async getTemplates(): Promise<ChatTemplate[]> {
    try {
      const res = await apiClient.get<ChatTemplate[]>('/api/v1/conversations/templates');
      return unwrapArray(res);
    } catch {
      return [];
    }
  },

  /**
   * Create a new custom response template (CR-07)
   * POST /api/v1/conversations/templates
   */
  async createTemplate(payload: CreateChatTemplatePayload): Promise<ChatTemplate> {
    const res = await apiClient.post<ChatTemplate>('/api/v1/conversations/templates', payload);
    return unwrap(res);
  },

  /**
   * Update an existing response template (CR-07)
   * PUT /api/v1/conversations/templates/:id
   */
  async updateTemplate(id: string, payload: UpdateChatTemplatePayload): Promise<ChatTemplate> {
    const res = await apiClient.put<ChatTemplate>(`/api/v1/conversations/templates/${encodeURIComponent(id)}`, payload);
    return unwrap(res);
  },

  /**
   * Delete a response template (CR-07)
   * DELETE /api/v1/conversations/templates/:id
   */
  async deleteTemplate(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/api/v1/conversations/templates/${encodeURIComponent(id)}`);
    return unwrap(res);
  },
};
