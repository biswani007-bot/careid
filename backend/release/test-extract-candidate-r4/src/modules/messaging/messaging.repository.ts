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
}

