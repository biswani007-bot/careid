import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './apiClient';

export interface ClinicalPracticeTypeItem {
  id: string;
  code: string;
  displayName: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  clinicalAuthorizationMapping?: string;
  isCanonical: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    doctors: number;
    specialties: number;
  };
}

export interface CreateClinicalPracticeTypePayload {
  code: string;
  displayName: string;
  description?: string;
  clinicalAuthorizationMapping?: string;
}

export interface UpdateClinicalPracticeTypePayload {
  id: string;
  displayName?: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  clinicalAuthorizationMapping?: string;
}

export const useActiveClinicalPracticeTypesQuery = () => {
  return useQuery({
    queryKey: ['clinical-practice-types', 'active'],
    queryFn: async (): Promise<ClinicalPracticeTypeItem[]> => {
      const res = await apiClient.get<ClinicalPracticeTypeItem[]>('/api/v1/clinical-practice-types');
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 60 * 1000,
  });
};

export const useAdminClinicalPracticeTypesQuery = (params?: {
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}) => {
  return useQuery({
    queryKey: ['admin-clinical-practice-types', params],
    queryFn: async (): Promise<ClinicalPracticeTypeItem[]> => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append('search', params.search);
      if (params?.status) searchParams.append('status', params.status);
      const queryStr = searchParams.toString();
      const endpoint = `/api/v1/admin/clinical-practice-types${queryStr ? `?${queryStr}` : ''}`;
      const res = await apiClient.get<ClinicalPracticeTypeItem[]>(endpoint);
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 10 * 1000,
  });
};

export const useCreateClinicalPracticeTypeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateClinicalPracticeTypePayload) => {
      const res = await apiClient.post<ClinicalPracticeTypeItem>(
        '/api/v1/admin/clinical-practice-types',
        payload
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clinical-practice-types'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-practice-types'] });
    },
  });
};

export const useUpdateClinicalPracticeTypeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateClinicalPracticeTypePayload) => {
      const res = await apiClient.put<ClinicalPracticeTypeItem>(
        `/api/v1/admin/clinical-practice-types/${id}`,
        payload
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clinical-practice-types'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-practice-types'] });
    },
  });
};

export const useToggleClinicalPracticeTypeStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) => {
      const res = await apiClient.patch<ClinicalPracticeTypeItem>(
        `/api/v1/admin/clinical-practice-types/${id}/status`,
        { status }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clinical-practice-types'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-practice-types'] });
    },
  });
};

export const useDeleteClinicalPracticeTypeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/api/v1/admin/clinical-practice-types/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clinical-practice-types'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-practice-types'] });
    },
  });
};
