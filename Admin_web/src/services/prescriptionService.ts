import { apiClient, type ApiResponse } from './apiClient';

export interface PrescriptionItem {
  id: string;
  drugName: string;
  dosage: string;
  form: string;
  route?: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
}

export interface Prescription {
  id: string;
  patientProfileId: string;
  doctorId: string;
  doctorName?: string;
  patientName?: string;
  diagnosisCode?: string;
  status: string;
  prescribedAt: string;
  createdAt: string;
  updatedAt?: string;
  items: PrescriptionItem[];
  pickupReminderEnabled?: boolean;
  pickupReminderHours?: number;
  collected?: boolean;
  collectedAt?: string;
  facilityName?: string;
}

export const prescriptionService = {
  getPrescriptions: async (params?: {
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<ApiResponse<Prescription[]>> => {
    const qs = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') qs.append('status', params.status);
    if (params?.limit) qs.append('limit', String(params.limit));
    if (params?.page) qs.append('page', String(params.page));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiClient.get<Prescription[]>(`/api/v1/prescriptions${query}`);
  },

  markCollected: async (prescriptionId: string): Promise<ApiResponse<Prescription>> => {
    return apiClient.patch<Prescription>(
      `/api/v1/prescriptions/${encodeURIComponent(prescriptionId)}/collect`,
      {}
    );
  },
};

export default prescriptionService;
