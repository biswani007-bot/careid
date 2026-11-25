import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { MessagingRepository } from './messaging.repository';
import {
  CreateConversationDto,
  SendMessageDto,
  ConversationResponseDto,
  DirectMessageResponseDto,
} from './dto/messaging.dto';

@Injectable()
export class MessagingService {
  constructor(private readonly repo: MessagingRepository) {}

  private mapMessage(m: any): DirectMessageResponseDto {
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderUserId: m.senderUserId,
      senderRole: m.senderRole,
      content: m.content,
      attachmentId: m.attachmentId || undefined,
      isRead: m.isRead,
      readAt: m.readAt ? (m.readAt instanceof Date ? m.readAt.toISOString() : new Date(m.readAt).toISOString()) : undefined,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : new Date(m.createdAt).toISOString(),
    };
  }

  private mapConversation(c: any, userId?: string): ConversationResponseDto {
    const patientName = c.patientProfile
      ? `${c.patientProfile.firstName || ''} ${c.patientProfile.lastName || ''}`.trim()
      : undefined;

    const docUser = c.doctorProfile?.user;
    const doctorName = docUser
      ? `Dr. ${docUser.firstName || ''} ${docUser.lastName || ''}`.trim()
      : undefined;

    const lastMsg = c.messages && c.messages.length > 0 ? this.mapMessage(c.messages[0]) : undefined;

    return {
      id: c.id,
      patientProfileId: c.patientProfileId,
      patientName,
      doctorId: c.doctorId,
      doctorName,
      facilityId: c.facilityId || undefined,
      subject: c.subject || undefined,
      lastMessageAt: c.lastMessageAt instanceof Date ? c.lastMessageAt.toISOString() : new Date(c.lastMessageAt).toISOString(),
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : new Date(c.createdAt).toISOString(),
      lastMessage: lastMsg,
      unreadCount: 0,
    };
  }

  async getConversations(userId: string): Promise<ConversationResponseDto[]> {
    const list = await this.repo.findConversationsForUser(userId);
    return list.map((c) => this.mapConversation(c, userId));
  }

  async createConversation(
    userId: string,
    dto: CreateConversationDto,
    roles: string[] = [],
  ): Promise<ConversationResponseDto> {
    const isDoctor = roles.includes('DOCTOR');
    let patientProfileId: string;
    let doctorId: string;

    if (isDoctor) {
      const docProfile = await this.repo.findDoctorProfile(userId);
      if (!docProfile) throw new NotFoundException('Doctor profile not found');
      doctorId = docProfile.id;

      const patient = await this.repo.findPatientProfile(dto.participantId);
      if (!patient) throw new NotFoundException(`Patient profile '${dto.participantId}' not found`);
      patientProfileId = patient.id;
    } else {
      const patient = await this.repo.findPatientProfile(userId);
      if (!patient) throw new NotFoundException('Patient profile not found');
      patientProfileId = patient.id;

      const doctor = await this.repo.findDoctorProfile(dto.participantId);
      if (!doctor) throw new NotFoundException(`Doctor profile '${dto.participantId}' not found`);
      doctorId = doctor.id;
    }

    const conv = await this.repo.createConversation({
      patientProfileId,
      doctorId,
      facilityId: dto.facilityId,
      subject: dto.subject,
    });

    if (dto.initialMessage) {
      await this.repo.createMessage({
        conversationId: conv.id,
        senderUserId: userId,
        senderRole: isDoctor ? 'DOCTOR' : 'PATIENT',
        content: dto.initialMessage,
      });
    }

    const fetched = await this.repo.findConversationById(conv.id);
    return this.mapConversation(fetched, userId);
  }

  async getConversationById(id: string, userId: string): Promise<ConversationResponseDto> {
    const conv = await this.repo.findConversationById(id);
    if (!conv) {
      throw new NotFoundException(`Conversation '${id}' not found`);
    }

    return this.mapConversation(conv, userId);
  }

  async getMessages(conversationId: string, userId: string): Promise<DirectMessageResponseDto[]> {
    const conv = await this.repo.findConversationById(conversationId);
    if (!conv) {
      throw new NotFoundException(`Conversation '${conversationId}' not found`);
    }

    const messages = await this.repo.findMessagesByConversation(conversationId);
    return messages.map((m) => this.mapMessage(m));
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    dto: SendMessageDto,
    roles: string[] = [],
  ): Promise<DirectMessageResponseDto> {
    const conv = await this.repo.findConversationById(conversationId);
    if (!conv) {
      throw new NotFoundException(`Conversation '${conversationId}' not found`);
    }

    const isDoctor = roles.includes('DOCTOR');
    const senderRole = isDoctor ? 'DOCTOR' : 'PATIENT';

    const msg = await this.repo.createMessage({
      conversationId,
      senderUserId: userId,
      senderRole,
      content: dto.content,
      attachmentId: dto.attachmentId,
    });

    return this.mapMessage(msg);
  }

  async markAsRead(conversationId: string, userId: string): Promise<{ success: boolean }> {
    await this.repo.markMessagesRead(conversationId, userId);
    return { success: true };
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const count = await this.repo.getUnreadCount(userId);
    return { unreadCount: count };
  }
}

