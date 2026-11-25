import { apiClient } from './apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ProcedureCatalogueItem {
  code: string;
  name: string;
  category: string;
  description?: string;
  standardCharge: number;
  rvu?: number;
  status: 'ACTIVE' | 'INACTIVE';
  isOfficialCpt?: boolean;
}

export interface ListProceduresParams {
  category?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateProcedurePayload {
  code: string;
  name: string;
  category: string;
  description?: string;
  standardCharge?: number;
  rvu?: number;
  status?: 'ACTIVE' | 'INACTIVE';
  isOfficialCpt?: boolean;
}

export interface UpdateProcedurePayload {
  name?: string;
  category?: string;
  description?: string;
  standardCharge?: number;
  rvu?: number;
  status?: 'ACTIVE' | 'INACTIVE';
  isOfficialCpt?: boolean;
}

export const procedureService = {
  async listProcedures(params?: ListProceduresParams): Promise<{ data: ProcedureCatalogueItem[]; meta?: any }> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (typeof params?.page === 'number') query.append('page', String(params.page));
    if (typeof params?.limit === 'number') query.append('limit', String(params.limit));
    const qs = query.toString();

    const res = await apiClient.get<any>(`/api/v1/cpt${qs ? `?${qs}` : ''}`);
    let data: ProcedureCatalogueItem[] = [];
    let meta: any = res.meta;

    if (Array.isArray(res.data)) {
      data = res.data;
    } else if (res.data && Array.isArray(res.data.data)) {
      data = res.data.data;
      if (res.data.meta) {
        meta = { ...meta, ...res.data.meta };
      }
    } else if (Array.isArray(res)) {
      data = res;
    }

    return {
      data,
      meta,
    };
  },

  async searchProcedures(q: string): Promise<ProcedureCatalogueItem[]> {
    const res = await apiClient.get<any>(`/api/v1/cpt/search?q=${encodeURIComponent(q.trim())}`);
    const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
    return list;
  },

  async getProcedureByCode(code: string): Promise<ProcedureCatalogueItem> {
    const res = await apiClient.get<any>(`/api/v1/cpt/${encodeURIComponent(code.trim())}`);
    return res.data || res;
  },

  async createProcedure(payload: CreateProcedurePayload): Promise<ProcedureCatalogueItem> {
    const res = await apiClient.post<any>('/api/v1/cpt', payload);
    if (!res.success && res.message) {
      throw new Error(Array.isArray(res.message) ? res.message.join('; ') : res.message);
    }
    return res.data;
  },

  async updateProcedure(code: string, payload: UpdateProcedurePayload): Promise<ProcedureCatalogueItem> {
    const res = await apiClient.put<any>(`/api/v1/cpt/${encodeURIComponent(code.trim())}`, payload);
    if (!res.success && res.message) {
      throw new Error(Array.isArray(res.message) ? res.message.join('; ') : res.message);
    }
    return res.data;
  },

  async deleteProcedure(code: string): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient.del<any>(`/api/v1/cpt/${encodeURIComponent(code.trim())}`);
    return {
      success: Boolean(res.success),
      message: res.message,
    };
  },
};

export const useProceduresQuery = (params?: ListProceduresParams) => {
  return useQuery({
    queryKey: ['procedures', params],
    queryFn: () => procedureService.listProcedures(params),
    placeholderData: (previousData: any) => previousData,
    staleTime: 30 * 1000,
  });
};

export const useCreateProcedureMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProcedurePayload) => procedureService.createProcedure(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    },
  });
};

export const useUpdateProcedureMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: UpdateProcedurePayload }) =>
      procedureService.updateProcedure(code, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    },
  });
};

export const useDeleteProcedureMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => procedureService.deleteProcedure(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    },
  });
};
