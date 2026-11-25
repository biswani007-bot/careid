import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MessagingService } from '../messaging.service';
import { MessagingRepository } from '../messaging.repository';

describe('MessagingService (Phase 22)', () => {
  let service: MessagingService;
  let repo: jest.Mocked<MessagingRepository>;

  const mockDoctorProfile = {
    id: 'doc-prof-1',
    userId: 'user-doc-1',
    user: { firstName: 'Gregory', lastName: 'House' },
  };

  const mockPatientProfile = {
    id: 'pat-prof-1',
    userId: 'user-pat-1',
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockConversation = {
    id: 'conv-001',
    patientProfileId: 'pat-prof-1',
    doctorId: 'doc-prof-1',
    facilityId: null,
    subject: 'Post-Op Follow-up Question',
    lastMessageAt: new Date('2026-11-14T10:00:00Z'),
    createdAt: new Date('2026-11-14T10:00:00Z'),
    patientProfile: mockPatientProfile,
    doctorProfile: mockDoctorProfile,
    messages: [
      {
        id: 'msg-001',
        conversationId: 'conv-001',
        senderUserId: 'user-pat-1',
        senderRole: 'PATIENT',
        content: 'Is it normal to feel slight tenderness on day 2?',
        attachmentId: null,
        isRead: false,
        readAt: null,
        createdAt: new Date('2026-11-14T10:00:00Z'),
      },
    ],
  };

  beforeEach(async () => {
    const mockRepo: Partial<jest.Mocked<MessagingRepository>> = {
      findDoctorProfile: jest.fn(),
      findPatientProfile: jest.fn(),
      createConversation: jest.fn(),
      findConversationById: jest.fn(),
      findConversationsForUser: jest.fn(),
      createMessage: jest.fn(),
      findMessagesByConversation: jest.fn(),
      markMessagesRead: jest.fn(),
      getUnreadCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: MessagingRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    repo = module.get(MessagingRepository) as jest.Mocked<MessagingRepository>;
  });

  describe('createConversation', () => {
    it('should create conversation from doctor to patient', async () => {
      repo.findDoctorProfile.mockResolvedValue(mockDoctorProfile as any);
      repo.findPatientProfile.mockResolvedValue(mockPatientProfile as any);
      repo.createConversation.mockResolvedValue({ id: 'conv-001' } as any);
      repo.findConversationById.mockResolvedValue(mockConversation as any);

      const res = await service.createConversation('user-doc-1', {
        participantId: 'pat-prof-1',
        subject: 'Post-Op Follow-up Question',
      }, ['DOCTOR']);

      expect(res.id).toBe('conv-001');
      expect(res.doctorId).toBe('doc-prof-1');
      expect(res.patientProfileId).toBe('pat-prof-1');
    });
  });

  describe('sendMessage', () => {
    it('should send direct message with correct senderRole', async () => {
      repo.findConversationById.mockResolvedValue(mockConversation as any);
      repo.createMessage.mockResolvedValue({
        id: 'msg-002',
        conversationId: 'conv-001',
        senderUserId: 'user-doc-1',
        senderRole: 'DOCTOR',
        content: 'Tenderness is completely expected for 48 hours. Take prescribed analgesics.',
        attachmentId: null,
        isRead: false,
        readAt: null,
        createdAt: new Date(),
      } as any);

      const res = await service.sendMessage('conv-001', 'user-doc-1', {
        content: 'Tenderness is completely expected for 48 hours. Take prescribed analgesics.',
      }, ['DOCTOR']);

      expect(res.id).toBe('msg-002');
      expect(res.senderRole).toBe('DOCTOR');
      expect(repo.createMessage).toHaveBeenCalled();
    });
  });

  describe('unread count and markAsRead', () => {
    it('should return unread count for user', async () => {
      repo.getUnreadCount.mockResolvedValue(3);
      const res = await service.getUnreadCount('user-doc-1');
      expect(res.unreadCount).toBe(3);
    });

    it('should mark messages as read', async () => {
      repo.markMessagesRead.mockResolvedValue(1 as any);
      const res = await service.markAsRead('conv-001', 'user-doc-1');
      expect(res.success).toBe(true);
    });
  });
});

