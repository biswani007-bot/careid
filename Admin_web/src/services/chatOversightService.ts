import { apiClient } from './apiClient';

export interface ChatOversightConversation {
  id: string;
  patientId?: string;
  patientName: string;
  patientNumber?: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  subject: string;
  messageCount: number;
  lastMessageRole?: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface ChatOversightData {
  totalConversations: number;
  totalMessages: number;
  activeChannels: number;
  complianceStatus: string;
  conversations: ChatOversightConversation[];
}

export const chatOversightService = {
  async getOversightData(): Promise<ChatOversightData> {
    const res = await apiClient.get<ChatOversightData>('/api/v1/conversations/admin/oversight');
    if (res.data && typeof res.data === 'object' && 'data' in res.data) {
      return (res.data as any).data;
    }
    return (res.data as ChatOversightData) || {
      totalConversations: 0,
      totalMessages: 0,
      activeChannels: 0,
      complianceStatus: 'HIPAA_COMPLIANT_METADATA_ONLY',
      conversations: [],
    };
  },
};
