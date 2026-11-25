import { apiClient } from './apiClient';

export interface WorkingHoursItem {
  id?: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  sessionType?: string;
  startTime: string; // '09:00'
  endTime: string;   // '17:00'
  breakStart?: string;
  breakEnd?: string;
  isEnabled?: boolean;
}

export interface ScheduleFullDTO {
  id: string;
  ownerType: 'DOCTOR' | 'STAFF' | 'FACILITY' | 'DEPARTMENT';
  doctorProfileId?: string;
  facilityId?: string;
  title: string;
  timezone: string;
  slotDurationMinutes: number;
  bufferMinutes: number;
  maxPatientsPerSlot: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  notes?: string;
  workingHours: WorkingHoursItem[];
  exceptions?: Array<{
    id: string;
    exceptionType: string;
    reason: string;
    fromDate: string;
    toDate: string;
    isAllDay: boolean;
  }>;
}

export interface CreateSchedulePayload {
  ownerType: string;
  doctorProfileId?: string;
  facilityId?: string;
  title: string;
  timezone: string;
  slotDurationMinutes: number;
  bufferMinutes: number;
  maxPatientsPerSlot: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive?: boolean;
  notes?: string;
  workingHours: WorkingHoursItem[];
}

export interface GeneratedSlotDTO {
  id: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'BOOKED' | 'HELD' | 'BLOCKED' | 'CANCELLED';
  currentBookings: number;
  maxCapacity: number;
  isAvailable: boolean;
}

export const scheduleService = {
  /**
   * List schedules, optionally filtered by doctor or facility
   */
  async listSchedules(params?: { doctorProfileId?: string; facilityId?: string }): Promise<ScheduleFullDTO[]> {
    const query = new URLSearchParams();
    if (params?.doctorProfileId) query.append('doctorProfileId', params.doctorProfileId);
    if (params?.facilityId) query.append('facilityId', params.facilityId);
    const qs = query.toString();
    const res = await apiClient.get<ScheduleFullDTO[] | { data: ScheduleFullDTO[] }>(
      `/api/v1/schedules${qs ? `?${qs}` : ''}`
    );
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object' && 'data' in payload && Array.isArray((payload as { data: ScheduleFullDTO[] }).data)) {
      return (payload as { data: ScheduleFullDTO[] }).data;
    }
    return [];
  },

  /**
   * Get schedule details by ID
   */
  async getScheduleById(id: string): Promise<ScheduleFullDTO> {
    const res = await apiClient.get<ScheduleFullDTO | { data: ScheduleFullDTO }>(
      `/api/v1/schedules/${encodeURIComponent(id)}`
    );
    const payload = res.data;
    if (payload && typeof payload === 'object' && 'data' in payload && (payload as { data: ScheduleFullDTO }).data) {
      return (payload as { data: ScheduleFullDTO }).data;
    }
    return payload as ScheduleFullDTO;
  },

  /**
   * Create a schedule profile
   */
  async createSchedule(payload: CreateSchedulePayload): Promise<ScheduleFullDTO> {
    const res = await apiClient.post<ScheduleFullDTO | { data: ScheduleFullDTO }>(
      '/api/v1/schedules',
      payload
    );
    const data = res.data;
    return (data && typeof data === 'object' && 'data' in data && (data as { data: ScheduleFullDTO }).data)
      ? (data as { data: ScheduleFullDTO }).data
      : (data as ScheduleFullDTO);
  },

  /**
   * Update an existing schedule profile and working hours
   */
  async updateSchedule(id: string, payload: Partial<CreateSchedulePayload>): Promise<ScheduleFullDTO> {
    const res = await apiClient.put<ScheduleFullDTO | { data: ScheduleFullDTO }>(
      `/api/v1/schedules/${encodeURIComponent(id)}`,
      payload
    );
    const data = res.data;
    return (data && typeof data === 'object' && 'data' in data && (data as { data: ScheduleFullDTO }).data)
      ? (data as { data: ScheduleFullDTO }).data
      : (data as ScheduleFullDTO);
  },

  /**
   * Trigger slot generation engine for a date range
   */
  async generateSlots(id: string, payload: { fromDate: string; toDate: string }): Promise<GeneratedSlotDTO[]> {
    const res = await apiClient.post<GeneratedSlotDTO[] | { data: GeneratedSlotDTO[] }>(
      `/api/v1/schedules/${encodeURIComponent(id)}/generate-slots`,
      payload
    );
    const payloadData = res.data;
    if (Array.isArray(payloadData)) return payloadData;
    if (payloadData && typeof payloadData === 'object' && 'data' in payloadData && Array.isArray((payloadData as { data: GeneratedSlotDTO[] }).data)) {
      return (payloadData as { data: GeneratedSlotDTO[] }).data;
    }
    return [];
  },

  /**
   * Get generated slots in a date range
   */
  async getSlots(id: string, fromDate: string, toDate: string): Promise<GeneratedSlotDTO[]> {
    const query = new URLSearchParams({ fromDate, toDate });
    const res = await apiClient.get<GeneratedSlotDTO[] | { data: GeneratedSlotDTO[] }>(
      `/api/v1/schedules/${encodeURIComponent(id)}/slots?${query.toString()}`
    );
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object' && 'data' in payload && Array.isArray((payload as { data: GeneratedSlotDTO[] }).data)) {
      return (payload as { data: GeneratedSlotDTO[] }).data;
    }
    return [];
  },

  /**
   * Block a schedule for time-off / emergency
   */
  async blockSchedule(id: string, payload: {
    exceptionType?: string;
    reason: string;
    fromDate: string;
    toDate: string;
    isAllDay?: boolean;
    startTime?: string;
    endTime?: string;
  }): Promise<ScheduleFullDTO> {
    const res = await apiClient.post<ScheduleFullDTO | { data: ScheduleFullDTO }>(
      `/api/v1/schedules/${encodeURIComponent(id)}/block`,
      payload
    );
    const data = res.data;
    return (data && typeof data === 'object' && 'data' in data && (data as { data: ScheduleFullDTO }).data)
      ? (data as { data: ScheduleFullDTO }).data
      : (data as ScheduleFullDTO);
  },
};
