import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { ISupportRepository, TicketFilterOptions } from '../../domain/repositories/support.repository.interface';
import { SupportTicket, TicketReply } from '../../domain/entities/support.entity';

@Injectable()
export class SupportRepository implements ISupportRepository {
  private readonly logger = new Logger(SupportRepository.name);
  private readonly filePath = path.resolve(process.cwd(), 'data', 'support-tickets.json');
  private tickets: Map<string, SupportTicket> = new Map();
  private isLoaded = false;

  constructor() {
    this.loadTickets();
  }

  private loadTickets(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed: SupportTicket[] = JSON.parse(raw);
        for (const item of parsed) {
          this.tickets.set(item.id, {
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
            replies: (item.replies || []).map((r) => ({
              ...r,
              createdAt: new Date(r.createdAt),
            })),
          });
        }
      }
      this.isLoaded = true;
    } catch (err: any) {
      this.logger.warn(`Failed to read support tickets file, initialized in-memory: ${err.message}`);
      this.isLoaded = true;
    }
  }

  private persist(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const array = Array.from(this.tickets.values());
      fs.writeFileSync(this.filePath, JSON.stringify(array, null, 2), 'utf-8');
    } catch (err: any) {
      this.logger.error(`Failed to persist support tickets: ${err.message}`);
    }
  }

  async createTicket(
    data: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'replies'>,
  ): Promise<SupportTicket> {
    const id = randomUUID();
    const count = this.tickets.size + 1;
    const ticketNumber = `TKT-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;
    const now = new Date();

    const ticket: SupportTicket = {
      ...data,
      id,
      ticketNumber,
      replies: [],
      createdAt: now,
      updatedAt: now,
    };

    this.tickets.set(id, ticket);
    this.persist();
    return ticket;
  }

  async findTickets(filters: TicketFilterOptions): Promise<{ data: SupportTicket[]; total: number; page: number; limit: number }> {
    let items = Array.from(this.tickets.values());

    if (filters.userId) {
      items = items.filter((t) => t.userId === filters.userId);
    }

    if (filters.status) {
      const s = filters.status.toUpperCase();
      items = items.filter((t) => t.status === s);
    }

    if (filters.priority) {
      const p = filters.priority.toUpperCase();
      items = items.filter((t) => t.priority === p);
    }

    if (filters.category) {
      const c = filters.category.toUpperCase();
      items = items.filter((t) => t.category.toUpperCase() === c);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (t) =>
          t.ticketNumber.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.userEmail && t.userEmail.toLowerCase().includes(q)),
      );
    }

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const total = items.length;
    const startIndex = (page - 1) * limit;
    const data = items.slice(startIndex, startIndex + limit);

    return { data, total, page, limit };
  }

  async findTicketById(id: string): Promise<SupportTicket | null> {
    const ticket = this.tickets.get(id);
    return ticket || null;
  }

  async updateTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket | null> {
    const ticket = this.tickets.get(id);
    if (!ticket) return null;

    const updated: SupportTicket = {
      ...ticket,
      ...updates,
      updatedAt: new Date(),
    };

    this.tickets.set(id, updated);
    this.persist();
    return updated;
  }

  async addReply(ticketId: string, replyData: Omit<TicketReply, 'id' | 'createdAt'>): Promise<TicketReply | null> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return null;

    const reply: TicketReply = {
      ...replyData,
      id: randomUUID(),
      ticketId,
      createdAt: new Date(),
    };

    ticket.replies.push(reply);
    ticket.updatedAt = new Date();
    this.tickets.set(ticketId, ticket);
    this.persist();
    return reply;
  }

  async getReplies(ticketId: string): Promise<TicketReply[]> {
    const ticket = this.tickets.get(ticketId);
    return ticket ? ticket.replies : [];
  }
}

