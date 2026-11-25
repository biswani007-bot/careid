import { SupportTicket, TicketReply } from '../entities/support.entity';

export interface TicketFilterOptions {
  userId?: string;
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ISupportRepository {
  createTicket(ticket: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'replies'>): Promise<SupportTicket>;
  findTickets(filters: TicketFilterOptions): Promise<{ data: SupportTicket[]; total: number; page: number; limit: number }>;
  findTicketById(id: string): Promise<SupportTicket | null>;
  updateTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket | null>;
  addReply(ticketId: string, reply: Omit<TicketReply, 'id' | 'createdAt'>): Promise<TicketReply | null>;
  getReplies(ticketId: string): Promise<TicketReply[]>;
}

