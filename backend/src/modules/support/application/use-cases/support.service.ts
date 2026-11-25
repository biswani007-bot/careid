import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { ISupportRepository } from '../../domain/repositories/support.repository.interface';
import { CreateTicketDto, UpdateTicketDto, TicketReplyDto, TicketQueryDto, SupportTicketResponseDto } from '../../presentation/dto/support.dto';
import { SupportTicket, TicketReply } from '../../domain/entities/support.entity';

@Injectable()
export class SupportService {
  constructor(
    @Inject('ISupportRepository')
    private readonly supportRepo: ISupportRepository,
  ) {}

  private isStaffOrAdmin(roles: string[]): boolean {
    return roles.some((r) => ['ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN'].includes(r.toUpperCase()));
  }

  private mapToResponseDto(ticket: SupportTicket): SupportTicketResponseDto {
    const safeIso = (d: any): string => {
      if (!d) return new Date().toISOString();
      if (typeof d === 'string') return d;
      if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString();
      const parsed = new Date(d);
      return !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
    };

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      userId: ticket.userId,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      assignedTo: ticket.assignedTo || undefined,
      replies: ticket.replies?.map((r) => ({
        ...r,
        createdAt: safeIso(r.createdAt),
      })),
      createdAt: safeIso(ticket.createdAt),
      updatedAt: safeIso(ticket.updatedAt),
      isDemonstrationStorage: true,
      storageNotice: 'Operating on staging demonstration persistence. Dedicated PostgreSQL schema migration pending approval.',
    };
  }

  async createTicket(
    userId: string,
    userEmail: string | undefined,
    userName: string | undefined,
    dto: CreateTicketDto,
  ): Promise<SupportTicketResponseDto> {
    const created = await this.supportRepo.createTicket({
      userId,
      userEmail,
      userName,
      subject: dto.subject,
      description: dto.description,
      category: dto.category ? dto.category.toUpperCase() : 'GENERAL',
      priority: dto.priority ? dto.priority.toUpperCase() : 'MEDIUM',
      status: 'OPEN',
      assignedTo: null,
    });

    return this.mapToResponseDto(created);
  }

  async getTickets(
    userId: string,
    roles: string[],
    query: TicketQueryDto,
  ): Promise<{ data: SupportTicketResponseDto[]; total: number; page: number; limit: number }> {
    const canViewAll = this.isStaffOrAdmin(roles);
    const filterUserId = canViewAll ? undefined : userId;

    const res = await this.supportRepo.findTickets({
      userId: filterUserId,
      status: query.status,
      priority: query.priority,
      category: query.category,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: res.data.map((t) => this.mapToResponseDto(t)),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  async getTicketById(id: string, userId: string, roles: string[]): Promise<SupportTicketResponseDto> {
    const ticket = await this.supportRepo.findTicketById(id);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    if (!this.isStaffOrAdmin(roles) && ticket.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this ticket');
    }

    return this.mapToResponseDto(ticket);
  }

  async updateTicket(id: string, dto: UpdateTicketDto, updaterUserId: string, roles: string[]): Promise<SupportTicketResponseDto> {
    if (!this.isStaffOrAdmin(roles)) {
      throw new ForbiddenException('Only staff or administrators can update ticket status or assignment');
    }

    const ticket = await this.supportRepo.findTicketById(id);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const updates: Partial<SupportTicket> = {};
    if (dto.status) updates.status = dto.status.toUpperCase() as any;
    if (dto.priority) updates.priority = dto.priority.toUpperCase();
    if (dto.assignedTo !== undefined) updates.assignedTo = dto.assignedTo;

    const updated = await this.supportRepo.updateTicket(id, updates);
    if (!updated) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    return this.mapToResponseDto(updated);
  }

  async addReply(id: string, userId: string, roles: string[], dto: TicketReplyDto): Promise<TicketReply> {
    const ticket = await this.supportRepo.findTicketById(id);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const isStaff = this.isStaffOrAdmin(roles);
    if (!isStaff && ticket.userId !== userId) {
      throw new ForbiddenException('You do not have permission to reply to this ticket');
    }

    const roleName = roles[0] || 'USER';
    const reply = await this.supportRepo.addReply(id, {
      ticketId: id,
      userId,
      userRole: roleName,
      message: dto.message,
    });

    if (!reply) {
      throw new NotFoundException(`Ticket with ID ${id} could not be updated`);
    }

    return reply;
  }

  async getReplies(id: string, userId: string, roles: string[]): Promise<TicketReply[]> {
    const ticket = await this.supportRepo.findTicketById(id);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    if (!this.isStaffOrAdmin(roles) && ticket.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view replies for this ticket');
    }

    return this.supportRepo.getReplies(id);
  }
}

