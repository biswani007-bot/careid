/**
 * CareID Doctor Web - Profile, Account Security & Notification Preferences Service
 *
 * Authoritative API Contract: Postman Collection (CareID-Staging.postman_collection.json)
 * - GET    /api/v1/auth/me
 * - PUT    /api/v1/auth/me
 * - POST   /api/v1/auth/password/change
 * - GET    /api/v1/auth/sessions
 * - DELETE /api/v1/auth/sessions
 * - DELETE /api/v1/auth/sessions/:sessionId
 * - POST   /api/v1/auth/logout-all
 * - GET    /api/v1/doctors/me
 * - PUT    /api/v1/doctors/:id
 * - POST   /api/v1/attachments
 * - GET    /api/v1/notifications/preferences
 * - PUT    /api/v1/notifications/preferences
 * - GET    /api/v1/security/audit
 */

import { apiClient, ApiError, ApiResponse } from './apiClient';
import { AuthMeData, DoctorMeData } from './authService';
import { AttachmentUploadResponse, getAttachmentFileUrl } from './attachmentService';

export interface UpdateDoctorProfilePayload {
  fullName?: string;
  primarySpecialization?: string;
  secondarySpecializations?: string[];
  department?: string;
  biography?: string;
  professionalSummary?: string;
  servicesOffered?: string[];
  emergencyPhone?: string;
  profilePhotoUrl?: string;
}

export interface UpdateUserAccountPayload {
  email?: string;
  phone?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface AuthSessionDTO {
  id: string;
  ipAddress: string | Record<string, unknown> | null;
  userAgent: string | Record<string, unknown> | null;
  createdAt: string;
}

export interface SecurityAuditLogDTO {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  result: string;
  details?: string;
  createdAt: string;
}

export interface NotificationPreferencesDTO {
  id: string;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  webhookEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateNotificationPreferencesPayload {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  webhookEnabled?: boolean;
}

export const profileService = {
  async getDoctorMe(): Promise<DoctorMeData> {
    const res: ApiResponse<DoctorMeData> = await apiClient.get<DoctorMeData>('/api/v1/doctors/me');
    return res.data;
  },

  async updateDoctorProfile(
    doctorId: string,
    payload: UpdateDoctorProfilePayload
  ): Promise<DoctorMeData> {
    const res: ApiResponse<DoctorMeData> = await apiClient.put<DoctorMeData>(
      `/api/v1/doctors/${encodeURIComponent(doctorId)}`,
      payload
    );
    return res.data;
  },

  async updateUserAccount(payload: UpdateUserAccountPayload): Promise<AuthMeData> {
    const res: ApiResponse<AuthMeData> = await apiClient.put<AuthMeData>(
      '/api/v1/auth/me',
      payload
    );
    return res.data;
  },

  /**
   * Upload doctor profile photo via Postman Folder 16 global attachment endpoint
   * (POST /api/v1/attachments, multipart field `file`) and persist returned URL
   * via PUT /api/v1/doctors/:id.
   *
   * Note: Live staging server may reject unlinked attachment uploads without patientProfileId;
   * errors are surfaced directly to the caller and never simulated.
   */
  async uploadDoctorPhoto(doctorId: string, file: File): Promise<DoctorMeData> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('category', 'PROFILE_PHOTO');

    const uploadRes: ApiResponse<AttachmentUploadResponse> =
      await apiClient.postFormData<AttachmentUploadResponse>('/api/v1/attachments', formData);

    const attachment = uploadRes.data;
    const resolvedPhotoUrl =
      attachment?.storageUrl ||
      (attachment?.fileName ? getAttachmentFileUrl(attachment.fileName) : '');

    if (!resolvedPhotoUrl) {
      throw new ApiError(500, 'Upload succeeded but no image URL was returned by the server.');
    }

    return profileService.updateDoctorProfile(doctorId, {
      profilePhotoUrl: resolvedPhotoUrl,
    });
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await apiClient.post<unknown>('/api/v1/auth/password/change', payload);
  },

  async getActiveSessions(): Promise<AuthSessionDTO[]> {
    const res: ApiResponse<AuthSessionDTO[]> = await apiClient.get<AuthSessionDTO[]>(
      '/api/v1/auth/sessions'
    );
    return Array.isArray(res.data) ? res.data : [];
  },

  async terminateSession(sessionId: string): Promise<void> {
    await apiClient.delete<unknown>(`/api/v1/auth/sessions/${encodeURIComponent(sessionId)}`);
  },

  async terminateOtherSessions(): Promise<void> {
    await apiClient.delete<unknown>('/api/v1/auth/sessions');
  },

  async logoutAllDevices(refreshToken: string): Promise<void> {
    await apiClient.post<unknown>('/api/v1/auth/logout-all', { refreshToken });
  },

  async getSecurityAuditLogs(userId?: string): Promise<SecurityAuditLogDTO[]> {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res: ApiResponse<SecurityAuditLogDTO[]> = await apiClient.get<SecurityAuditLogDTO[]>(
      `/api/v1/security/audit${query}`
    );
    return Array.isArray(res.data) ? res.data : [];
  },

  async getNotificationPreferences(): Promise<NotificationPreferencesDTO> {
    const res: ApiResponse<NotificationPreferencesDTO> =
      await apiClient.get<NotificationPreferencesDTO>('/api/v1/notifications/preferences');
    return res.data;
  },

  async updateNotificationPreferences(
    payload: UpdateNotificationPreferencesPayload
  ): Promise<NotificationPreferencesDTO> {
    const res: ApiResponse<NotificationPreferencesDTO> =
      await apiClient.put<NotificationPreferencesDTO>('/api/v1/notifications/preferences', payload);
    return res.data;
  },
};
