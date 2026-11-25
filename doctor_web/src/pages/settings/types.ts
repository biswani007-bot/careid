import type { PrimaryFacilityInfo, DoctorFacilityAssignmentDTO } from '@/services/facilityService';

export interface DoctorProfile {
  name: string;
  credentials: string;
  title: string;
  specialty: string;
  npi: string;
  licenseNumber: string;
  licenseState: string;
  licenseStatus: string;
  licenseExpiry: string;
  hospital: string;
  department: string;
  office: string;
  email: string;
  phone: string;
  pager: string;
  bio: string;
  consultationTypes: string[];
  certifications: string[];
  primaryFacility?: PrimaryFacilityInfo | null;
  facilities?: DoctorFacilityAssignmentDTO[];
}

export interface TrustedDevice {
  id: string;
  name: string;
  platform: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface SecurityAuditEntry {
  id: string;
  device: string;
  location: string;
  timestamp: string;
  method: string;
  status: string;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  webhookEnabled: boolean;
  updatedAt?: string;
}

// ==========================================
// Support Tickets & Helpdesk DTOs (Postman Folder 25)
// ==========================================

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory = 'TECHNICAL' | 'BILLING' | 'CLINICAL' | 'ACCOUNT' | 'GENERAL';

export interface CreateSupportTicketPayload {
  subject: string;
  description: string;
  category?: TicketCategory | string;
  priority?: TicketPriority | string;
}

export interface SupportTicketReplyDTO {
  id: string;
  ticketId?: string;
  userId?: string;
  userRole?: string;
  message: string;
  createdAt: string;
}

export interface SupportTicketDTO {
  id: string;
  ticketNumber: string;
  userId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: TicketStatus | string;
  assignedTo?: string;
  replies?: SupportTicketReplyDTO[];
  createdAt: string;
  updatedAt: string;
  isDemonstrationStorage?: boolean;
  storageNotice?: string;
}

export interface PaginatedSupportTicketsDTO {
  data: SupportTicketDTO[];
  total: number;
  page: number;
  limit: number;
}

export interface SupportTicketQueryParams {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ==========================================
// Content Management System (CMS) DTOs (Postman Folder 21)
// ==========================================

export interface FAQItemDTO {
  id: string;
  question: string;
  answer: string;
  category: string;
  displayOrder: number;
  status: string;
  createdAt: string;
}

export interface CMSPolicyDTO {
  id: string;
  title: string;
  policyType?: string;
  version?: string;
  content: string;
  effectiveDate?: string;
  status: string;
  slug?: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CMSPageDTO {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  status: string;
  publishedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CMSBlockDTO {
  id: string;
  name: string;
  code: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}


