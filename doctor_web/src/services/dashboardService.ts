/**
 * CareID Doctor Web - Dashboard Backend API Service
 * 
 * Source of Truth: Postman Collection (CareID-Staging.postman_collection.json)
 * - 05. Doctor Portal: GET /api/v1/doctors/me, GET /api/v1/doctors/patients, GET /api/v1/doctors/patients/:id/medical-records
 * - 10. Appointments: GET /api/v1/appointments/doctor/me, PUT /api/v1/appointments/:id/status
 * - 14. Notifications: GET /api/v1/notifications, PUT /api/v1/notifications/:id/read
 */

import { apiClient, ApiResponse } from './apiClient';
import { reportService, ReportItemDTO } from './reportService';

const VALID_NOTIFICATION_STATUSES = new Set([
  'PENDING',
  'QUEUED',
  'SENT',
  'DELIVERED',
  'FAILED',
  'READ',
]);

const inflightNotificationRequests = new Map<string, Promise<DashboardNotification[]>>();

export interface NotificationQueryParams {
  recipientUserId?: string;
  status?: string;
  unreadOnly?: boolean;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  profilePhotoUrl?: string;
  digitalSignatureUrl?: string;
  biography?: string;
  professionalSummary?: string;
  yearsOfExperience?: number;
  primarySpecialization?: string;
  secondarySpecializations?: string[];
  medicalCouncil?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  department?: string;
  facilityId?: string;
  facilityName?: string;
}

export interface PatientSummary {
  id: string;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string;
}

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type AppointmentType = 'IN_PERSON' | 'VIDEO' | 'PHONE' | 'HOME_VISIT';

export interface Appointment {
  id: string;
  appointmentNumber?: string;
  patientProfileId: string;
  doctorProfileId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  reason: string;
  notes?: string;
  facilityId?: string;
  patient?: PatientSummary;
  patientName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppointmentListResponse {
  data: Appointment[];
  meta?: {
    totalItems: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
}

export interface DiagnosticLabReport {
  id: string;
  patientProfileId?: string;
  title: string;
  description?: string;
  category: string;
  status: 'PENDING' | 'VERIFIED' | 'ARCHIVED' | string;
  reportDate?: string;
  prescribedBy?: string;
  providerName?: string;
  facilityName?: string;
  doctorName?: string;
  patientName?: string;
  isAbnormal?: boolean;
  severity?: 'CRITICAL' | 'HIGH' | 'NORMAL' | string;
  pageCount?: number;
  storageUrl?: string;
  createdAt?: string;
}

export interface DashboardNotification {
  id: string;
  recipientUserId?: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  title: string;
  message: string;
  notificationType?: string;
  type?: string;
  priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  channel?: string;
  status?: string;
  metadata?: Record<string, unknown> | null;
  scheduledAt?: string | null;
  sentAt?: string | null;
  readAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DoctorStatistics {
  totalDoctors?: number;
  verifiedDoctors?: number;
  pendingDoctors?: number;
  suspendedDoctors?: number;
}

export interface AppointmentQueryParams {
  page?: number;
  limit?: number;
  status?: AppointmentStatus;
  fromDate?: string;
  toDate?: string;
  patientProfileId?: string;
}

export const dashboardService = {
  /**
   * Fetch current authenticated doctor's profile
   * GET /api/v1/doctors/me (Postman folder: 05. Doctor Portal)
   */
  async getDoctorProfile(): Promise<DoctorProfile> {
    const res = await apiClient.get<DoctorProfile>('/api/v1/doctors/me');
    return res.data;
  },

  /**
   * Fetch appointments for authenticated doctor
   * GET /api/v1/appointments/doctor/me (Postman folder: 10. Appointments, Schedules & Shifts)
   */
  async getDoctorAppointments(params: AppointmentQueryParams = {}): Promise<AppointmentListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.status) query.append('status', params.status);
    if (params.fromDate) query.append('fromDate', params.fromDate);
    if (params.toDate) query.append('toDate', params.toDate);
    if (params.patientProfileId) query.append('patientProfileId', params.patientProfileId);

    const qs = query.toString();
    const endpoint = `/api/v1/appointments/doctor/me${qs ? `?${qs}` : ''}`;
    
    try {
      const res = await apiClient.get<AppointmentListResponse | Appointment[]>(endpoint);
      // Backend may return either { data: Appointment[], meta: ... } or Appointment[] directly
      if (Array.isArray(res.data)) {
        return {
          data: res.data,
          meta: {
            totalItems: res.data.length,
            page: 1,
            limit: res.data.length,
            totalPages: 1,
          },
        };
      }
      return res.data;
    } catch {
      // Try alias endpoint if /doctor/me is routed to /doctor/my-appointments
      const aliasEndpoint = `/api/v1/appointments/doctor/my-appointments${qs ? `?${qs}` : ''}`;
      const res = await apiClient.get<AppointmentListResponse | Appointment[]>(aliasEndpoint);
      if (Array.isArray(res.data)) {
        return {
          data: res.data,
          meta: {
            totalItems: res.data.length,
            page: 1,
            limit: res.data.length,
            totalPages: 1,
          },
        };
      }
      return res.data;
    }
  },

  /**
   * Update appointment status (Start Consult, End Consult, Cancel, Arrived)
   * PUT /api/v1/appointments/:id/status (Postman folder: 10. Appointments, Schedules & Shifts)
   */
  async updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus,
    notes?: string
  ): Promise<ApiResponse<Appointment>> {
    return apiClient.put<Appointment>(`/api/v1/appointments/${appointmentId}/status`, {
      status,
      notes: notes || `Status updated to ${status} via Doctor Web Portal`,
    });
  },

  /**
   * Fetch recent diagnostic medical reports / lab reviews.
   * Uses Doctor Portal endpoints (05. Doctor Portal) for DOCTOR sessions via reportService
   * to avoid the patient-scoped GET /api/v1/reports 404 error.
   */
  async getRecentLabReports(category?: string): Promise<DiagnosticLabReport[]> {
    const { reports } = await reportService.getReports({ category });
    return reports.map((r: ReportItemDTO): DiagnosticLabReport => {
      const upperStatus = String(r.status || '').toUpperCase();
      const mappedStatus =
        upperStatus === 'VERIFIED' || upperStatus === 'FINAL' || r.isVerified
          ? 'VERIFIED'
          : upperStatus === 'CRITICAL'
          ? 'CRITICAL'
          : 'PENDING';

      const isCritical = mappedStatus === 'CRITICAL';
      return {
        id: r.id,
        patientProfileId: r.patientProfileId,
        title: r.title,
        description: r.description,
        category: r.category,
        status: mappedStatus,
        reportDate: r.reportDate || r.createdAt,
        providerName: r.providerName,
        doctorName: r.doctorName,
        patientName: r.patientName,
        isAbnormal: isCritical,
        severity: isCritical ? 'CRITICAL' : 'NORMAL',
        storageUrl: r.storageUrl,
        createdAt: r.createdAt,
      };
    });
  },

  /**
   * Mark diagnostic report as VERIFIED with verification notes.
   * Routes DOCTOR sessions to PUT /api/v1/doctors/patients/:patientProfileId/medical-records/:id.
   */
  async verifyReport(
    reportId: string,
    notes?: string,
    patientProfileId?: string
  ): Promise<DiagnosticLabReport> {
    const res = await reportService.verifyReport(
      reportId,
      notes || 'Verified by Attending Physician via Doctor Web Portal',
      patientProfileId
    );
    const updated = res.data as Partial<DiagnosticLabReport> | undefined;
    return {
      id: updated?.id || reportId,
      patientProfileId: updated?.patientProfileId || patientProfileId,
      title: updated?.title || 'Diagnostic Report',
      category: updated?.category || 'LAB',
      status: 'VERIFIED',
      reportDate: updated?.createdAt,
      createdAt: updated?.createdAt,
    };
  },

  /**
   * Fetch system & clinical notifications/alerts.
   * GET /api/v1/notifications (Postman folder: 14. Notifications & Alerts)
   *
   * Note: Backend NotificationStatus enum accepts PENDING, QUEUED, SENT, DELIVERED, FAILED, READ.
   * Passing status=UNREAD causes HTTP 500 InternalServerError on staging; unread filtering is
   * therefore applied client-side unless a valid backend status enum is supplied.
   */
  async getNotifications(
    params?: string | NotificationQueryParams
  ): Promise<DashboardNotification[]> {
    let recipientUserId: string | undefined;
    let rawStatus: string | undefined;
    let unreadOnly = false;

    if (typeof params === 'string') {
      const trimmed = params.trim().toUpperCase();
      if (trimmed === 'UNREAD') {
        unreadOnly = true;
      } else if (trimmed) {
        rawStatus = trimmed;
      }
    } else if (params) {
      recipientUserId = params.recipientUserId?.trim() || undefined;
      unreadOnly = Boolean(params.unreadOnly) || params.status?.trim().toUpperCase() === 'UNREAD';
      if (params.status && params.status.trim().toUpperCase() !== 'UNREAD') {
        rawStatus = params.status.trim().toUpperCase();
      }
    }

    const query = new URLSearchParams();
    if (recipientUserId) {
      query.set('recipientUserId', recipientUserId);
    }
    if (rawStatus && VALID_NOTIFICATION_STATUSES.has(rawStatus)) {
      query.set('status', rawStatus);
    }

    const qs = query.toString() ? `?${query.toString()}` : '';
    const requestKey = `${qs}|unreadOnly=${unreadOnly}`;

    const existing = inflightNotificationRequests.get(requestKey);
    if (existing) {
      return existing;
    }

    const requestPromise = (async (): Promise<DashboardNotification[]> => {
      const res = await apiClient.get<DashboardNotification[] | { data: DashboardNotification[] }>(
        `/api/v1/notifications${qs}`
      );
      const payload = res && typeof res === 'object' && 'data' in res ? res.data : res;
      const list =
        payload && typeof payload === 'object' && 'data' in payload && Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload)
          ? payload
          : [];

      if (unreadOnly) {
        return list.filter((n) => String(n.status || '').toUpperCase() !== 'READ' && !n.readAt);
      }
      return list;
    })().finally(() => {
      inflightNotificationRequests.delete(requestKey);
    });

    inflightNotificationRequests.set(requestKey, requestPromise);
    return requestPromise;
  },

  /**
   * Mark a notification as read
   * PUT /api/v1/notifications/:id/read (Postman folder: 14. Notifications & Alerts)
   */
  async markNotificationRead(notificationId: string): Promise<void> {
    await apiClient.put(`/api/v1/notifications/${notificationId}/read`);
  },

  /**
   * Platform doctor directory statistics
   * GET /api/v1/doctors/statistics (Postman folder: 05. Doctor Portal)
   */
  async getDoctorStatistics(): Promise<DoctorStatistics> {
    const res = await apiClient.get<DoctorStatistics>('/api/v1/doctors/statistics');
    return res.data;
  },
};

