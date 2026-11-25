export interface TicketReply {
  id: string;
  ticketId: string;
  userId: string;
  userRole?: string;
  message: string;
  createdAt: Date;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignedTo?: string | null;
  replies: TicketReply[];
  createdAt: Date;
  updatedAt: Date;
}

