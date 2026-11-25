import { apiClient, type ApiResponse } from './apiClient';

export interface FinancingOption {
  id: string;
  partnerName: string;
  planName: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  tenureMonths: number[];
  processingFeePercent?: number;
  isActive: boolean;
  description?: string;
}

export interface FinancingApplication {
  id: string;
  patientId: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  partnerName: string;
  requestedAmount: number;
  approvedAmount?: number;
  tenureMonths: number;
  monthlyEmi?: number;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED' | 'CANCELLED';
  reviewNotes?: string;
  facilityId?: string;
  facilityName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FinancingApplicationsFilter {
  status?: string;
  partnerName?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const financingService = {
  getOptions: async (): Promise<ApiResponse<FinancingOption[]>> => {
    return apiClient.get<FinancingOption[]>('/api/v1/financing/options');
  },

  getApplications: async (filter?: FinancingApplicationsFilter): Promise<ApiResponse<FinancingApplication[]>> => {
    const params = new URLSearchParams();
    if (filter?.status && filter.status !== 'ALL') params.append('status', filter.status);
    if (filter?.partnerName && filter.partnerName !== 'ALL') params.append('partnerName', filter.partnerName);
    if (filter?.search) params.append('search', filter.search);
    if (filter?.page) params.append('page', String(filter.page));
    if (filter?.limit) params.append('limit', String(filter.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<any>(`/api/v1/financing/applications${qs}`);
    const rawList = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
    const items = rawList.map((a: any) => ({
      ...a,
      id: a.applicationNumber || a.id,
      backendId: a.id,
      patientName: a.patientName || a.userName || `Patient (${(a.userId || 'USR').slice(0, 8)})`,
      monthlyEmi: a.monthlyEmi || a.monthlyEstimatedEmi,
      facilityName: a.facilityName || 'Mount Sinai Main Hospital',
    }));
    return {
      ...res,
      data: items,
    };
  },

  getApplicationById: async (id: string): Promise<ApiResponse<FinancingApplication>> => {
    return apiClient.get<FinancingApplication>(`/api/v1/financing/applications/${id}`);
  },

  updateApplicationStatus: async (
    id: string,
    status: string,
    reviewNotes?: string
  ): Promise<ApiResponse<FinancingApplication>> => {
    return apiClient.patch<FinancingApplication>(`/api/v1/financing/applications/${id}/status`, {
      status,
      notes: reviewNotes,
    });
  },
};

export default financingService;
