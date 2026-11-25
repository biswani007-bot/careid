/**
 * CareID Doctor Web - Appointment API Service
 * 
 * Source of Truth: Postman Collection (CareID-Staging.postman_collection.json)
 * - Folder 08. Appointment Booking & Management:
 *   1. POST /api/v1/appointments (Book a new appointment)
 *   2. GET /api/v1/appointments (List appointments with filtering and pagination)
 *   3. GET /api/v1/appointments/doctor/my-appointments (Get appointments scheduled for authenticated doctor)
 *   4. GET /api/v1/appointments/doctor/me (Get appointments scheduled for authenticated doctor)
 *   5. GET /api/v1/appointments/:id (Get appointment details by ID)
 *   6. PUT /api/v1/appointments/:id/reschedule (Reschedule an existing appointment)
 *   7. PUT /api/v1/appointments/:id/cancel (Cancel an appointment)
 *   8. PUT /api/v1/appointments/:id/status (Update appointment status - clinical & operational staff)
 */

import { apiClient, ApiResponse, ApiError } from './apiClient';

// --- Type Definitions ---

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'NO_SHOW';

export type AppointmentType = 'IN_PERSON' | 'TELECONSULTATION';

export interface AppointmentPatientDTO {
  id: string;
  firstName: string;
  lastName: string;
  mrn?: string;
  gender?: string;
  phone?: string;
  dateOfBirth?: string;
}

export interface AppointmentDoctorDTO {
  id: string;
  firstName: string;
  lastName: string;
  specialization?: string;
  registrationNumber?: string;
  phone?: string;
}

export interface AppointmentFacilityDTO {
  id: string;
  name: string;
  city?: string;
  phone?: string;
  address?: string;
}

export interface AppointmentDTO {
  id: string;
  appointmentNumber: string;
  patientProfileId: string;
  doctorProfileId: string;
  facilityId?: string;
  scheduleId?: string;
  slotId?: string;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMinutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  bookedBy?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  rescheduledFromId?: string;
  createdAt: string;
  updatedAt: string;
  patient?: AppointmentPatientDTO;
  doctor?: AppointmentDoctorDTO;
  facility?: AppointmentFacilityDTO;
}

export interface CreateAppointmentPayload {
  doctorProfileId: string;
  patientProfileId: string;
  facilityId: string;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMinutes: number;
  type: AppointmentType;
  reason: string;
  notes?: string;
  scheduleId?: string;
  slotId?: string;
  treatmentOfferId?: string;
}

export interface RescheduleAppointmentPayload {
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  slotId?: string;
  reason?: string;
}

export interface ScheduleDTO {
  id: string;
  facilityId?: string;
  doctorProfileId?: string;
  roomId?: string;
  name?: string;
  dayOfWeek?: number | string;
  startTime?: string;
  endTime?: string;
  slotDurationMinutes?: number;
  isActive?: boolean;
}

export interface ScheduleSlotDTO {
  id: string;
  scheduleId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
  statusReason?: string | null;
}

export interface AppointmentHoldDTO {
  id?: string;
  holdId?: string;
  slotId?: string;
  facilityId?: string;
  procedureCategory?: string;
  holdDurationMinutes?: number;
  expiresAt?: string;
  heldAt?: string;
  remainingSeconds?: number;
  isExpired?: boolean;
  status?: string;
}

export interface AppointmentReadinessDTO {
  appointmentId?: string;
  appointmentNumber?: string;
  fastingConfirmed: boolean;
  medicationHoldConfirmed: boolean;
  transportationArranged: boolean;
  consentVerified: boolean;
  vitalsWithinThreshold: boolean;
  decision?: 'GO' | 'HOLD' | 'DEFER' | 'PENDING' | string;
  notes?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
  updatedAt?: string;
  updatedBy?: string;
}

export interface UpdateReadinessPayload {
  fastingConfirmed: boolean;
  medicationHoldConfirmed: boolean;
  transportationArranged: boolean;
  consentVerified: boolean;
  vitalsWithinThreshold: boolean;
  decision: 'GO' | 'HOLD' | 'DEFER' | 'PENDING';
  notes?: string;
}

export interface CheckInAppointmentPayload {
  checkInTime?: string;
  facilityId?: string;
  bedOrBayNumber?: string;
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    oxygenSaturation?: number;
    temperature?: number;
  } | null;
  notes?: string;
}

export interface UpdateAppointmentStatusPayload {
  status: AppointmentStatus | string;
  notes?: string;
}

export interface ListAppointmentsParams {
  patientProfileId?: string;
  doctorProfileId?: string;
  facilityId?: string;
  status?: AppointmentStatus | string;
  type?: AppointmentType | string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAppointments {
  data: AppointmentDTO[];
  total: number;
  page: number;
  limit: number;
}

// --- Envelope Unwrapping Helpers ---

function unwrapAppointmentDTO(res: ApiResponse<AppointmentDTO | { data: AppointmentDTO }>): AppointmentDTO {
  const payload = res.data;
  if (payload && typeof payload === 'object') {
    if ('data' in payload && (payload as { data: AppointmentDTO }).data) {
      return (payload as { data: AppointmentDTO }).data;
    }
    return payload as AppointmentDTO;
  }
  throw new Error('Malformed appointment response received from server');
}

function unwrapAppointmentsList(
  res: ApiResponse<PaginatedAppointments | AppointmentDTO[] | { data: AppointmentDTO[]; meta?: { totalItems: number; page: number; limit: number } }>
): PaginatedAppointments {
  const payload = res.data;
  if (Array.isArray(payload)) {
    return {
      data: payload,
      total: payload.length,
      page: 1,
      limit: payload.length,
    };
  }
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) {
      const meta = (payload as { meta?: { totalItems: number; page: number; limit: number } }).meta;
      return {
        data: payload.data,
        total: meta?.totalItems ?? payload.data.length,
        page: meta?.page ?? 1,
        limit: meta?.limit ?? 20,
      };
    }
  }
  return { data: [], total: 0, page: 1, limit: 20 };
}

// --- Service Implementation ---

export const appointmentService = {
  /**
   * 1. Book a new appointment
   * Endpoint: POST /api/v1/appointments
   */
  async createAppointment(payload: CreateAppointmentPayload): Promise<AppointmentDTO> {
    const res = await apiClient.post<AppointmentDTO | { data: AppointmentDTO }>(
      '/api/v1/appointments',
      payload
    );
    return unwrapAppointmentDTO(res);
  },

  /**
   * 2. Get appointment details by ID
   * Endpoint: GET /api/v1/appointments/:id
   */
  async getAppointmentById(id: string): Promise<AppointmentDTO> {
    const res = await apiClient.get<AppointmentDTO | { data: AppointmentDTO }>(
      `/api/v1/appointments/${encodeURIComponent(id)}`
    );
    return unwrapAppointmentDTO(res);
  },

  /**
   * 3. List appointments with filtering and pagination
   * Endpoint: GET /api/v1/appointments
   */
  async listAppointments(params?: ListAppointmentsParams): Promise<PaginatedAppointments> {
    const query = new URLSearchParams();
    if (params?.patientProfileId) query.append('patientProfileId', params.patientProfileId);
    if (params?.doctorProfileId) query.append('doctorProfileId', params.doctorProfileId);
    if (params?.facilityId) query.append('facilityId', params.facilityId);
    if (params?.status) query.append('status', params.status);
    if (params?.type) query.append('type', params.type);
    if (params?.fromDate) query.append('fromDate', params.fromDate);
    if (params?.toDate) query.append('toDate', params.toDate);
    if (typeof params?.page === 'number') query.append('page', params.page.toString());
    if (typeof params?.limit === 'number') query.append('limit', params.limit.toString());

    const qs = query.toString();
    const endpoint = `/api/v1/appointments${qs ? `?${qs}` : ''}`;

    const res = await apiClient.get<PaginatedAppointments | AppointmentDTO[]>(endpoint);
    return unwrapAppointmentsList(res);
  },

  /**
   * 4. Get appointments scheduled for authenticated doctor
   * Endpoint: GET /api/v1/appointments/doctor/me
   */
  async getDoctorMyAppointments(params?: ListAppointmentsParams): Promise<PaginatedAppointments> {
    const query = new URLSearchParams();
    if (params?.patientProfileId) query.append('patientProfileId', params.patientProfileId);
    if (params?.facilityId) query.append('facilityId', params.facilityId);
    if (params?.status) query.append('status', params.status);
    if (params?.type) query.append('type', params.type);
    if (params?.fromDate) query.append('fromDate', params.fromDate);
    if (params?.toDate) query.append('toDate', params.toDate);
    if (typeof params?.page === 'number') query.append('page', params.page.toString());
    if (typeof params?.limit === 'number') query.append('limit', params.limit.toString());

    const qs = query.toString();
    const endpoint = `/api/v1/appointments/doctor/me${qs ? `?${qs}` : ''}`;

    const res = await apiClient.get<PaginatedAppointments | AppointmentDTO[]>(endpoint);
    return unwrapAppointmentsList(res);
  },

  /**
   * 5. Reschedule an existing appointment
   * Endpoint: PUT /api/v1/appointments/:id/reschedule
   */
  async rescheduleAppointment(id: string, payload: RescheduleAppointmentPayload): Promise<AppointmentDTO> {
    const res = await apiClient.put<AppointmentDTO | { data: AppointmentDTO }>(
      `/api/v1/appointments/${encodeURIComponent(id)}/reschedule`,
      payload
    );
    return unwrapAppointmentDTO(res);
  },

  /**
   * 6. Cancel an appointment
   * Endpoint: PUT /api/v1/appointments/:id/cancel
   */
  async cancelAppointment(id: string, cancellationReason: string): Promise<AppointmentDTO> {
    const res = await apiClient.put<AppointmentDTO | { data: AppointmentDTO }>(
      `/api/v1/appointments/${encodeURIComponent(id)}/cancel`,
      { cancellationReason }
    );
    return unwrapAppointmentDTO(res);
  },

  /**
   * 7. Update appointment status (clinical & operational staff)
   * Endpoint: PUT /api/v1/appointments/:id/status
   */
  async updateAppointmentStatus(id: string, payload: UpdateAppointmentStatusPayload): Promise<AppointmentDTO> {
    const res = await apiClient.put<AppointmentDTO | { data: AppointmentDTO }>(
      `/api/v1/appointments/${encodeURIComponent(id)}/status`,
      payload
    );
    return unwrapAppointmentDTO(res);
  },

  /**
   * 8. List facility/doctor schedules
   * Endpoint: GET /api/v1/schedules
   */
  async listSchedules(params?: { facilityId?: string; doctorProfileId?: string; roomId?: string }): Promise<ScheduleDTO[]> {
    const query = new URLSearchParams();
    if (params?.facilityId) query.append('facilityId', params.facilityId);
    if (params?.doctorProfileId) query.append('doctorProfileId', params.doctorProfileId);
    if (params?.roomId) query.append('roomId', params.roomId);
    const qs = query.toString();
    const res = await apiClient.get<ScheduleDTO[] | { data: ScheduleDTO[] }>(
      `/api/v1/schedules${qs ? `?${qs}` : ''}`
    );
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object' && Array.isArray((payload as { data: ScheduleDTO[] }).data)) {
      return (payload as { data: ScheduleDTO[] }).data;
    }
    return [];
  },

  /**
   * 9. Get generated slots for a schedule in date range
   * Endpoint: GET /api/v1/schedules/:id/slots
   */
  async getScheduleSlots(scheduleId: string, fromDate: string, toDate: string): Promise<ScheduleSlotDTO[]> {
    const query = new URLSearchParams({ fromDate, toDate });
    const res = await apiClient.get<ScheduleSlotDTO[] | { data: ScheduleSlotDTO[] }>(
      `/api/v1/schedules/${encodeURIComponent(scheduleId)}/slots?${query.toString()}`
    );
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object' && Array.isArray((payload as { data: ScheduleSlotDTO[] }).data)) {
      return (payload as { data: ScheduleSlotDTO[] }).data;
    }
    return [];
  },

  /**
   * 10. Create an appointment slot hold (Stage 11)
   * Endpoint: POST /api/v1/appointments/holds
   */
  async createAppointmentHold(payload: {
    facilityId: string;
    slotId: string;
    procedureCategory: string;
    holdDurationMinutes: number;
  }): Promise<AppointmentHoldDTO> {
    const res = await apiClient.post<AppointmentHoldDTO | { data: AppointmentHoldDTO }>(
      '/api/v1/appointments/holds',
      payload
    );
    const data = (res.data && typeof res.data === 'object' && 'data' in res.data && (res.data as { data: AppointmentHoldDTO }).data)
      ? (res.data as { data: AppointmentHoldDTO }).data
      : (res.data as AppointmentHoldDTO);
    if (data && !data.id && data.holdId) {
      data.id = data.holdId;
    }
    return data;
  },

  /**
   * 11. Get appointment slot hold status (Stage 11)
   * Endpoint: GET /api/v1/appointments/holds/:holdId
   */
  async getAppointmentHold(holdId: string): Promise<AppointmentHoldDTO> {
    const res = await apiClient.get<AppointmentHoldDTO | { data: AppointmentHoldDTO }>(
      `/api/v1/appointments/holds/${encodeURIComponent(holdId)}`
    );
    const data = (res.data && typeof res.data === 'object' && 'data' in res.data && (res.data as { data: AppointmentHoldDTO }).data)
      ? (res.data as { data: AppointmentHoldDTO }).data
      : (res.data as AppointmentHoldDTO);
    if (data && !data.id && data.holdId) {
      data.id = data.holdId;
    }
    return data;
  },

  /**
   * 12. Release an appointment hold (Stage 11)
   * Endpoint: DELETE /api/v1/appointments/holds/:holdId
   */
  async releaseAppointmentHold(holdId: string): Promise<void> {
    await apiClient.delete(`/api/v1/appointments/holds/${encodeURIComponent(holdId)}`);
  },

  /**
   * 13. Get Pre-Op Day -1 Readiness Checklist (Stage 14)
   * Endpoint: GET /api/v1/appointments/:appointmentId/readiness
   */
  async getAppointmentReadiness(appointmentId: string): Promise<AppointmentReadinessDTO> {
    const res = await apiClient.get<AppointmentReadinessDTO | { data: AppointmentReadinessDTO }>(
      `/api/v1/appointments/${encodeURIComponent(appointmentId)}/readiness`
    );
    const data = res.data;
    if (data && typeof data === 'object' && 'data' in data && (data as { data: AppointmentReadinessDTO }).data) {
      return (data as { data: AppointmentReadinessDTO }).data;
    }
    return data as AppointmentReadinessDTO;
  },

  /**
   * 14. Update Pre-Op Day -1 Readiness Checklist & Decision (Stage 14)
   * Endpoint: PATCH /api/v1/appointments/:appointmentId/readiness
   */
  async updateAppointmentReadiness(
    appointmentId: string,
    payload: UpdateReadinessPayload
  ): Promise<AppointmentReadinessDTO> {
    const res = await apiClient.patch<AppointmentReadinessDTO | { data: AppointmentReadinessDTO }>(
      `/api/v1/appointments/${encodeURIComponent(appointmentId)}/readiness`,
      payload
    );
    const data = res.data;
    if (data && typeof data === 'object' && 'data' in data && (data as { data: AppointmentReadinessDTO }).data) {
      return (data as { data: AppointmentReadinessDTO }).data;
    }
    return data as AppointmentReadinessDTO;
  },

  /**
   * 15. Day-of-Procedure Patient Check-In (Stage 15)
   * Endpoint: POST /api/v1/appointments/:appointmentId/check-in
   */
  async checkInAppointment(
    appointmentId: string,
    payload: CheckInAppointmentPayload
  ): Promise<AppointmentDTO> {
    const res = await apiClient.post<AppointmentDTO | { data: AppointmentDTO }>(
      `/api/v1/appointments/${encodeURIComponent(appointmentId)}/check-in`,
      payload
    );
    const checkedIn = unwrapAppointmentDTO(res);
    try {
      const full = await this.getAppointmentById(appointmentId);
      return { ...full, ...checkedIn };
    } catch {
      return checkedIn;
    }
  },
};

/**
 * Extracts a user-facing error message from an ApiError or unknown exception.
 */
export function formatAppointmentError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.messages && error.messages.length > 0) {
      return error.messages.join('. ');
    }
    if (error.message) {
      return error.message;
    }
    if (error.statusCode === 400) {
      return 'Invalid appointment parameters.';
    }
    if (error.statusCode === 404) {
      return 'Appointment record not found.';
    }
    if (error.statusCode === 409) {
      return 'Appointment slot conflict or double-booking detected.';
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred while processing the appointment.';
}

