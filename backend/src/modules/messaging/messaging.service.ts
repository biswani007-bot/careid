import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MessagingRepository } from './messaging.repository';
import {
  CreateConversationDto,
  SendMessageDto,
  ConversationResponseDto,
  DirectMessageResponseDto,
  ChatTemplateDto,
  UpdateChatTemplateDto,
  ChatTemplateResponseDto,
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

  private validateParticipant(conv: any, userId: string): void {
    const isParticipant =
      conv.doctorProfile?.userId === userId ||
      conv.patientProfile?.userId === userId;
    if (!isParticipant) {
      throw new ForbiddenException('Access denied: You are not a participant in this conversation');
    }
  }

  async getConversationById(id: string, userId: string): Promise<ConversationResponseDto> {
    const conv = await this.repo.findConversationById(id);
    if (!conv) {
      throw new NotFoundException(`Conversation '${id}' not found`);
    }
    this.validateParticipant(conv, userId);

    return this.mapConversation(conv, userId);
  }

  async getMessages(conversationId: string, userId: string): Promise<DirectMessageResponseDto[]> {
    const conv = await this.repo.findConversationById(conversationId);
    if (!conv) {
      throw new NotFoundException(`Conversation '${conversationId}' not found`);
    }
    this.validateParticipant(conv, userId);

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
    this.validateParticipant(conv, userId);

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
    const conv = await this.repo.findConversationById(conversationId);
    if (!conv) {
      throw new NotFoundException(`Conversation '${conversationId}' not found`);
    }
    this.validateParticipant(conv, userId);

    await this.repo.markMessagesRead(conversationId, userId);
    return { success: true };
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const count = await this.repo.getUnreadCount(userId);
    return { unreadCount: count };
  }

  // ─── CR-07 Customizable Response Templates ───────────────────────────────────

  private getDefaultTemplates(): ChatTemplateResponseDto[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'tpl-default-1',
        title: 'Appointment Confirmation',
        content: 'Your appointment is confirmed for the scheduled time.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tpl-default-2',
        title: 'Medication Adherence',
        content: 'Please take your prescribed medication as directed.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tpl-default-3',
        title: 'Diagnostic Results Ready',
        content: 'Your test results are ready. Please come in for a follow-up.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tpl-default-4',
        title: 'Request Acknowledged',
        content: 'We have received your request and will respond shortly.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tpl-default-5',
        title: 'Recovery Guidance',
        content: 'Please rest and ensure adequate hydration.',
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  async getTemplates(userId: string): Promise<ChatTemplateResponseDto[]> {
    const stored = await this.repo.getUserTemplates(userId);
    if (!stored || stored.length === 0) {
      return this.getDefaultTemplates();
    }
    return stored;
  }

  async createTemplate(userId: string, dto: ChatTemplateDto): Promise<ChatTemplateResponseDto> {
    if (!dto.title?.trim() || !dto.content?.trim()) {
      throw new BadRequestException('Template title and content are required.');
    }
    const current = await this.getTemplates(userId);
    const now = new Date().toISOString();
    const newTemplate: ChatTemplateResponseDto = {
      id: randomUUID(),
      title: dto.title.trim(),
      content: dto.content.trim(),
      createdAt: now,
      updatedAt: now,
    };
    const updated = [...current, newTemplate];
    await this.repo.saveUserTemplates(userId, updated);
    return newTemplate;
  }

  async updateTemplate(
    userId: string,
    templateId: string,
    dto: UpdateChatTemplateDto,
  ): Promise<ChatTemplateResponseDto> {
    const current = await this.getTemplates(userId);
    const idx = current.findIndex((t) => t.id === templateId);
    if (idx === -1) {
      throw new NotFoundException(`Template '${templateId}' not found`);
    }
    const target = current[idx];
    const updatedTemplate: ChatTemplateResponseDto = {
      ...target,
      title: dto.title !== undefined ? dto.title.trim() : target.title,
      content: dto.content !== undefined ? dto.content.trim() : target.content,
      updatedAt: new Date().toISOString(),
    };
    current[idx] = updatedTemplate;
    await this.repo.saveUserTemplates(userId, current);
    return updatedTemplate;
  }

  async deleteTemplate(userId: string, templateId: string): Promise<{ success: boolean }> {
    const current = await this.getTemplates(userId);
    const filtered = current.filter((t) => t.id !== templateId);
    if (filtered.length === current.length) {
      throw new NotFoundException(`Template '${templateId}' not found`);
    }
    await this.repo.saveUserTemplates(userId, filtered);
    return { success: true };
  }

  // ─── CR-07 Admin Office Chat Oversight ──────────────────────────────────────

  async getAdminOversight(): Promise<any> {
    return this.repo.getAdminOversight();
  }
}


