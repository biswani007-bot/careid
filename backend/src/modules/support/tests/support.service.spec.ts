import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupportService } from '../application/use-cases/support.service';
import { ISupportRepository } from '../domain/repositories/support.repository.interface';
import { SupportTicket, TicketReply } from '../domain/entities/support.entity';

describe('SupportService', () => {
  let service: SupportService;
  let mockRepo: jest.Mocked<ISupportRepository>;

  const mockTicket: SupportTicket = {
    id: 'ticket-1',
    ticketNumber: 'TKT-2026-00001',
    userId: 'user-1',
    userEmail: 'user1@example.com',
    userName: 'John Doe',
    subject: 'Cannot download lab report',
    description: 'Report download button fails with timeout',
    category: 'TECHNICAL',
    priority: 'HIGH',
    status: 'OPEN',
    assignedTo: null,
    replies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockRepo = {
      createTicket: jest.fn().mockResolvedValue(mockTicket),
      findTickets: jest.fn().mockResolvedValue({
        data: [mockTicket],
        total: 1,
        page: 1,
        limit: 20,
      }),
      findTicketById: jest.fn().mockResolvedValue(mockTicket),
      updateTicket: jest.fn().mockImplementation(async (id, updates) => ({
        ...mockTicket,
        ...updates,
      })),
      addReply: jest.fn().mockResolvedValue({
        id: 'reply-1',
        ticketId: 'ticket-1',
        userId: 'user-1',
        userRole: 'PATIENT',
        message: 'Here is additional context',
        createdAt: new Date(),
      }),
      getReplies: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        {
          provide: 'ISupportRepository',
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
  });

  it('should create a support ticket', async () => {
    const res = await service.createTicket('user-1', 'user1@example.com', 'John Doe', {
      subject: 'Cannot download lab report',
      description: 'Report download button fails with timeout',
      category: 'TECHNICAL',
      priority: 'HIGH',
    });

    expect(res).toBeDefined();
    expect(res.id).toBe('ticket-1');
    expect(res.ticketNumber).toBe('TKT-2026-00001');
    expect(mockRepo.createTicket).toHaveBeenCalled();
  });

  it('should list tickets for regular patient scoped to user', async () => {
    const res = await service.getTickets('user-1', ['PATIENT'], { page: 1, limit: 10 });
    expect(res.data.length).toBe(1);
    expect(mockRepo.findTickets).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
  });

  it('should list all tickets for admin without user scope restriction', async () => {
    const res = await service.getTickets('admin-1', ['ADMIN'], { page: 1, limit: 10 });
    expect(res.data.length).toBe(1);
    expect(mockRepo.findTickets).toHaveBeenCalledWith(expect.objectContaining({ userId: undefined }));
  });

  it('should get ticket by ID for owner', async () => {
    const res = await service.getTicketById('ticket-1', 'user-1', ['PATIENT']);
    expect(res.id).toBe('ticket-1');
  });

  it('should throw ForbiddenException when unauthorized user views ticket', async () => {
    await expect(service.getTicketById('ticket-1', 'user-other', ['PATIENT'])).rejects.toThrow(ForbiddenException);
  });

  it('should update ticket when staff or admin', async () => {
    const res = await service.updateTicket('ticket-1', { status: 'RESOLVED' }, 'admin-1', ['ADMIN']);
    expect(res.status).toBe('RESOLVED');
  });

  it('should reject update if regular user attempts to change status', async () => {
    await expect(service.updateTicket('ticket-1', { status: 'RESOLVED' }, 'user-1', ['PATIENT'])).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should add reply to ticket', async () => {
    const res = await service.addReply('ticket-1', 'user-1', ['PATIENT'], { message: 'Here is additional context' });
    expect(res.id).toBe('reply-1');
    expect(mockRepo.addReply).toHaveBeenCalled();
  });
});

