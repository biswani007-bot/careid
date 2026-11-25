import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';

@Injectable()
export class MessagingRepository {
  constructor(private readonly db: DatabaseService) {}

  async createConversation(data: {
    patientProfileId: string;
    doctorId: string;
    facilityId?: string;
    subject?: string;
  }) {
    return this.db.conversation.create({
      data: {
        patientProfileId: data.patientProfileId,
        doctorId: data.doctorId,
        facilityId: data.facilityId || null,
        subject: data.subject || null,
      },
      include: {
        patientProfile: true,
        doctorProfile: { include: { user: true } },
      },
    });
  }

  async findConversationById(id: string) {
    return this.db.conversation.findUnique({
      where: { id },
      include: {
        patientProfile: true,
        doctorProfile: { include: { user: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async findConversationsForUser(userId: string) {
    // Check if user is a doctor or patient
    const doctor = await this.db.doctorProfile.findUnique({ where: { userId } });
    const patient = await this.db.patientProfile.findUnique({ where: { userId } });

    return this.db.conversation.findMany({
      where: {
        OR: [
          ...(doctor ? [{ doctorId: doctor.id }] : []),
          ...(patient ? [{ patientProfileId: patient.id }] : []),
        ],
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        patientProfile: true,
        doctorProfile: { include: { user: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async createMessage(data: {
    conversationId: string;
    senderUserId: string;
    senderRole: string;
    content: string;
    attachmentId?: string;
  }) {
    const msg = await this.db.directMessage.create({
      data: {
        conversationId: data.conversationId,
        senderUserId: data.senderUserId,
        senderRole: data.senderRole,
        content: data.content,
        attachmentId: data.attachmentId || null,
      },
    });

    await this.db.conversation.update({
      where: { id: data.conversationId },
      data: { lastMessageAt: new Date() },
    });

    return msg;
  }

  async findMessagesByConversation(conversationId: string, limit = 50) {
    return this.db.directMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async markMessagesRead(conversationId: string, currentUserId: string) {
    return this.db.directMessage.updateMany({
      where: {
        conversationId,
        senderUserId: { not: currentUserId },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    const doctor = await this.db.doctorProfile.findUnique({ where: { userId } });
    const patient = await this.db.patientProfile.findUnique({ where: { userId } });

    const conversationIds = (
      await this.db.conversation.findMany({
        where: {
          OR: [
            ...(doctor ? [{ doctorId: doctor.id }] : []),
            ...(patient ? [{ patientProfileId: patient.id }] : []),
          ],
        },
        select: { id: true },
      })
    ).map((c) => c.id);

    if (conversationIds.length === 0) return 0;

    return this.db.directMessage.count({
      where: {
        conversationId: { in: conversationIds },
        senderUserId: { not: userId },
        isRead: false,
      },
    });
  }

  async findDoctorProfile(idOrUserId: string) {
    return this.db.doctorProfile.findFirst({
      where: {
        OR: [{ id: idOrUserId }, { userId: idOrUserId }],
      },
    });
  }

  async findPatientProfile(idOrUserId: string) {
    return this.db.patientProfile.findFirst({
      where: {
        OR: [{ id: idOrUserId }, { userId: idOrUserId }],
      },
    });
  }

  async getUserTemplates(userId: string): Promise<any[]> {
    const setting = await this.db.platformSetting.findUnique({
      where: { key: `CHAT_TEMPLATES_${userId}` },
    });
    if (!setting || !setting.value) return [];
    try {
      const parsed = JSON.parse(setting.value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async getAdminOversight() {
    const totalConversations = await this.db.conversation.count();
    const totalMessages = await this.db.directMessage.count();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeConversationsCount = await this.db.conversation.count({
      where: { lastMessageAt: { gte: thirtyDaysAgo } },
    });

    // List conversations with metadata ONLY (NO message text, preserving HIPAA compliance)
    const conversations = await this.db.conversation.findMany({
      take: 50,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        patientProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            patientNumber: true,
          },
        },
        doctorProfile: {
          select: {
            id: true,
            fullName: true,
            primarySpecialization: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            createdAt: true,
            senderRole: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return {
      totalConversations,
      totalMessages,
      activeChannels: activeConversationsCount,
      complianceStatus: 'HIPAA_COMPLIANT_METADATA_ONLY',
      conversations: conversations.map((c: any) => ({
        id: c.id,
        patientId: c.patientProfile?.id,
        patientName: c.patientProfile
          ? `${c.patientProfile.firstName || ''} ${c.patientProfile.lastName || ''}`.trim()
          : 'Unknown Patient',
        patientNumber: c.patientProfile?.patientNumber || undefined,
        doctorId: c.doctorId,
        doctorName: c.doctorProfile?.fullName
          ? (c.doctorProfile.fullName.startsWith('Dr.') ? c.doctorProfile.fullName : `Dr. ${c.doctorProfile.fullName}`)
          : 'Attending Clinician',
        specialty: c.doctorProfile?.primarySpecialization || 'General Practice',
        subject: c.subject || 'Clinical Consultation',
        messageCount: c._count?.messages || 0,
        lastMessageRole: c.messages?.[0]?.senderRole,
        lastMessageAt: c.lastMessageAt instanceof Date ? c.lastMessageAt.toISOString() : c.lastMessageAt,
        createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
      })),
    };
  }

  async saveUserTemplates(userId: string, templates: any[]): Promise<any[]> {
    const setting = await this.db.platformSetting.upsert({
      where: { key: `CHAT_TEMPLATES_${userId}` },
      create: {
        key: `CHAT_TEMPLATES_${userId}`,
        category: 'OFFICE_CHAT_TEMPLATES',
        value: JSON.stringify(templates),
        valueType: 'JSON',
        description: `Custom office chat response templates for user ${userId}`,
        isPublic: false,
        updatedBy: userId,
      },
      update: {
        value: JSON.stringify(templates),
        updatedBy: userId,
      },
    });
    try {
      return JSON.parse(setting.value);
    } catch {
      return templates;
    }
  }
}


