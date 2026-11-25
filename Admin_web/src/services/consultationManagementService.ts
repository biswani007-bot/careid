import { apiClient } from './apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ─── 1. Facility Chargemaster & Pricing ─────────────────────────────────────

export interface FacilityChargemasterItem {
  id: string;
  cptCode: string;
  procedureName: string;
  category: string;
  description?: string;
  department?: string;
  standardCharge: number;
  baseCharge: number;
  discountedCashPrice: number;
  insuredPrice: number;
  currency: string;
  isFacilityOverride: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  status: string;
}

export interface FacilityChargemasterResponse {
  facilityId: string;
  facilityName: string;
  facilityType: string;
  currency: string;
  chargemasterVersion: string;
  lastUpdatedAt: string;
  itemCount: number;
  items: FacilityChargemasterItem[];
}

export interface SetFacilityPricePayload {
  facilityId: string;
  procedureCode: string;
  price: number;
  currency?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

// ─── 2. Financing Packages ──────────────────────────────────────────────────

export interface FinancingPackageItem {
  id: string;
  code: string;
  name: string;
  provider: string;
  description?: string;
  apr: number;
  minDownPaymentPercent: number;
  maxLoanMultiplier: number;
  minCreditScore: number;
  tenureMonths: number[];
  processingFee: number;
  facilityId?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── 3. Appointment Policies ───────────────────────────────────────────────

export interface AppointmentPolicyItem {
  id?: string;
  facilityId?: string | null;
  minNoticeHoursCancel: number;
  minNoticeHoursReschedule: number;
  maxReschedulesAllowed: number;
  slotHoldMinutes: number;
  maxAdvanceBookingDays: number;
  slotGenerationDays: number;
  defaultSlotDuration: number;
  defaultBufferMinutes: number;
  isActive: boolean;
}

// ─── 4. Master Data (Consultation Reasons, Remark Templates, Cancellation) ──

export interface MasterDataItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  status: 'ACTIVE' | 'INACTIVE';
  clinicalPracticeType?: string;
}

// ─── 5. Clinical Clearance Requirements & Policies ──────────────────────────

export interface ClearanceRequirementItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  clinicalPracticeType: string;
  procedureGroup?: string | null;
  facilityId?: string | null;
  requiredEvidenceType: string;
  reviewerRole: string;
  requiredApprovalsCount: number;
  requiredSpecialties: string[];
  isMandatory: boolean;
  isSchedulingPrerequisite?: boolean;
  dependencies: string[];
  sortOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
  version: number;
  createdAt?: string;
  updatedAt?: string;
  facility?: { id: string; name: string; facilityCode: string } | null;
}

export interface ClearancePolicyItemDef {
  id?: string;
  requirementId: string;
  isMandatory: boolean;
  sortOrder: number;
  requiredSpecialties: string[];
  validityDays: number;
  requirement?: ClearanceRequirementItem;
}

export interface ClearancePolicyItem {
  id: string;
  policyNumber: string;
  name: string;
  description?: string;
  facilityId?: string | null;
  procedureCode?: string | null;
  clinicalPracticeType: string;
  workflowStage?: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  schedulingPrerequisites: string[];
  createdAt?: string;
  updatedAt?: string;
  facility?: { id: string; name: string; facilityCode: string } | null;
  procedure?: { id: string; code: string; name: string; category: string } | null;
  items: ClearancePolicyItemDef[];
}

// ─── 6. Clinical Safety Hold Categories & Display Config ───────────────────

export interface SafetyHoldCategoryItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  clinicalPracticeType?: string;
  procedureCategories?: string[];
  facilityIds?: string[];
  sortOrder?: number;
  status: 'ACTIVE' | 'INACTIVE';
  requiredReviewerRole?: string;
  requiredEvidenceType?: string;
  resolutionPolicy?: string;
}

export interface ClinicalSummaryConfigItem {
  showProcedureCode: boolean;
  showClinicalIndication: boolean;
  showFacility: boolean;
  showSupervisingAttending: boolean;
  showFinancialTerms: boolean;
  showProceduralHoldWindow: boolean;
  showSafetyHoldHistory: boolean;
  safetyHoldPanelCollapsedByDefault: boolean;
  requireClinicalReviewForHoldClearance: boolean;
  customSectionLabels?: Record<string, string>;
}

export interface LegacyReconciliationStatus {
  totalOffers: number;
  contaminatedOffers: number;
  cleanOffers: number;
  totalStructuredHolds: number;
  reconciliationRequired: boolean;
}

export interface LegacyReconciliationResult {
  success: boolean;
  scannedCount: number;
  reconciledCount: number;
  createdHoldsCount: number;
  dryRun: boolean;
  records: Array<{
    offerId: string;
    patientId: string;
    originalNarrative: string;
    cleanIndication: string;
    holdsFound: number;
  }>;
}

// ─── Service API Calls ──────────────────────────────────────────────────────

export const consultationManagementService = {
  // Chargemaster
  async getChargemaster(facilityId: string): Promise<FacilityChargemasterResponse> {
    const res = await apiClient.get<any>(`/api/v1/facilities/${encodeURIComponent(facilityId)}/chargemaster`);
    return res.data || res;
  },

  async setFacilityProcedurePrice(payload: SetFacilityPricePayload): Promise<any> {
    const { facilityId, ...body } = payload;
    const res = await apiClient.post<any>(`/api/v1/facilities/${encodeURIComponent(facilityId)}/chargemaster`, body);
    if (!res.success && res.message) {
      throw new Error(Array.isArray(res.message) ? res.message.join('; ') : res.message);
    }
    return res.data || res;
  },

  // Financing Packages
  async listFinancingPackages(): Promise<FinancingPackageItem[]> {
    const res = await apiClient.get<any>('/api/v1/financing/packages');
    return Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
  },

  async createFinancingPackage(payload: Partial<FinancingPackageItem>): Promise<FinancingPackageItem> {
    const res = await apiClient.post<any>('/api/v1/financing/packages', payload);
    if (!res.success && res.message) {
      throw new Error(Array.isArray(res.message) ? res.message.join('; ') : res.message);
    }
    return res.data || res;
  },

  async updateFinancingPackage(id: string, payload: Partial<FinancingPackageItem>): Promise<FinancingPackageItem> {
    const res = await apiClient.put<any>(`/api/v1/financing/packages/${encodeURIComponent(id)}`, payload);
    if (!res.success && res.message) {
      throw new Error(Array.isArray(res.message) ? res.message.join('; ') : res.message);
    }
    return res.data || res;
  },

  async toggleFinancingPackageStatus(id: string, isActive: boolean): Promise<any> {
    const res = await apiClient.patch<any>(`/api/v1/financing/packages/${encodeURIComponent(id)}/status`, { isActive });
    return res.data || res;
  },

  async deleteFinancingPackage(id: string): Promise<any> {
    const res = await apiClient.del<any>(`/api/v1/financing/packages/${encodeURIComponent(id)}`);
    return res.data || res;
  },

  // Appointment Policies
  async getAppointmentPolicy(facilityId?: string): Promise<AppointmentPolicyItem> {
    const qs = facilityId ? `?facilityId=${encodeURIComponent(facilityId)}` : '';
    const res = await apiClient.get<any>(`/api/v1/appointments/policies${qs}`);
    return res.data || res;
  },

  async updateAppointmentPolicy(payload: Partial<AppointmentPolicyItem>): Promise<AppointmentPolicyItem> {
    const res = await apiClient.put<any>('/api/v1/appointments/policies', payload);
    if (!res.success && res.message) {
      throw new Error(Array.isArray(res.message) ? res.message.join('; ') : res.message);
    }
    return res.data || res;
  },

  // Master Data
  async listMasterDataItems(categoryCode: string): Promise<MasterDataItem[]> {
    try {
      const res = await apiClient.get<any>(`/api/v1/governance/master-data/items?categoryCode=${encodeURIComponent(categoryCode)}`);
      return Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },

  async createMasterDataItem(payload: { categoryCode: string; code: string; name: string; description?: string }): Promise<any> {
    const res = await apiClient.post<any>('/api/v1/governance/master-data/items', payload);
    if (!res.success && res.message) {
      throw new Error(Array.isArray(res.message) ? res.message.join('; ') : res.message);
    }
    return res.data || res;
  },

  // Clearance Requirements Catalogue
  async listClearanceRequirements(query?: { page?: number; limit?: number; category?: string; status?: string; search?: string }): Promise<{ data: ClearanceRequirementItem[]; meta: any }> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.category) params.set('category', query.category);
    if (query?.status) params.set('status', query.status);
    if (query?.search) params.set('search', query.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<any>(`/api/v1/admin/clearance/requirements${qs}`);
    const payload = res.data || res;
    if (Array.isArray(payload)) {
      return { data: payload, meta: { total: payload.length, page: 1, limit: payload.length, totalPages: 1 } };
    }
    return {
      data: payload?.data || [],
      meta: payload?.meta || { total: (payload?.data || []).length, page: 1, limit: 10, totalPages: 1 },
    };
  },

  async createClearanceRequirement(payload: Partial<ClearanceRequirementItem>): Promise<ClearanceRequirementItem> {
    const res = await apiClient.post<any>('/api/v1/admin/clearance/requirements', payload);
    if (!res.success && res.message) {
      throw new Error(Array.isArray(res.message) ? res.message.join('; ') : res.message);
    }
    return res.data || res;
  },

  async updateClearanceRequirement(id: string, payload: Partial<ClearanceRequirementItem>): Promise<ClearanceRequirementItem> {
    const res = await apiClient.put<any>(`/api/v1/admin/clearance/requirements/${encodeURIComponent(id)}`, payload);
    if (!res.success && res.message) {
      throw new Error(Array.isArray(res.message) ? res.message.join('; ') : res.message);
    }
    return res.data || res;
  },

  async toggleClearanceRequirementStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<any> {
    const res = await apiClient.patch<any>(`/api/v1/admin/clearance/requirements/${encodeURIComponent(id)}/status`, { status });
    return res.data || res;
  },

  async deleteClearanceRequirement(id: string): Promise<any> {
    const res = await apiClient.del<any>(`/api/v1/admin/clearance/requirements/${encodeURIComponent(id)}`);
    return res.data || res;
  },

  // Clearance Policies
  async listClearancePolicies(query?: { page?: number; limit?: number; facilityId?: string; procedureCode?: string; status?: string; search?: string }): Promise<{ data: ClearancePolicyItem[]; meta: any }> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.facilityId) params.set('facilityId', query.facilityId);
    if (query?.procedureCode) params.set('procedureCode', query.procedureCode);
    if (query?.status) params.set('status', query.status);
    if (query?.search) params.set('search', query.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<any>(`/api/v1/admin/clearance/policies${qs}`);
    const payload = res.data || res;
    if (Array.isArray(payload)) {
      return { data: payload, meta: { total: payload.length, page: 1, limit: payload.length, totalPages: 1 } };
    }
    return {
      data: payload?.data || [],
      meta: payload?.meta || { total: (payload?.data || []).length, page: 1, limit: 10, totalPages: 1 },
    };
  },

  async getClearancePolicy(id: string): Promise<ClearancePolicyItem> {
    const res = await apiClient.get<any>(`/api/v1/admin/clearance/policies/${encodeURIComponent(id)}`);
    return res.data || res;
  },

  async createClearancePolicy(payload: Partial<ClearancePolicyItem>): Promise<ClearancePolicyItem> {
    const res = await apiClient.post<any>('/api/v1/admin/clearance/policies', payload);
    if (!res.success && res.message) {
      throw new Error(Array.isArray(res.message) ? res.message.join('; ') : res.message);
    }
    return res.data || res;
  },

  async updateClearancePolicy(id: string, payload: Partial<ClearancePolicyItem>): Promise<ClearancePolicyItem> {
    const res = await apiClient.put<any>(`/api/v1/admin/clearance/policies/${encodeURIComponent(id)}`, payload);
    if (!res.success && res.message) {
      throw new Error(Array.isArray(res.message) ? res.message.join('; ') : res.message);
    }
    return res.data || res;
  },

  async deleteClearancePolicy(id: string): Promise<any> {
    const res = await apiClient.del<any>(`/api/v1/admin/clearance/policies/${encodeURIComponent(id)}`);
    return res.data || res;
  },

  // Safety Hold Categories
  async listSafetyHoldCategories(query?: {
    page?: number;
    limit?: number;
    clinicalPracticeType?: string;
    status?: string;
    search?: string;
  }): Promise<{ data: SafetyHoldCategoryItem[]; meta: any }> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.clinicalPracticeType) params.set('clinicalPracticeType', query.clinicalPracticeType);
    if (query?.status) params.set('status', query.status);
    if (query?.search) params.set('search', query.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<any>(`/api/v1/admin/safety-holds/categories${qs}`);
    const payload = res.data || res;
    if (Array.isArray(payload)) {
      return { data: payload, meta: { total: payload.length, page: 1, limit: payload.length, totalPages: 1 } };
    }
    return {
      data: payload?.data || [],
      meta: payload?.meta || { total: (payload?.data || []).length, page: 1, limit: 10, totalPages: 1 },
    };
  },

  async createSafetyHoldCategory(payload: Partial<SafetyHoldCategoryItem>): Promise<SafetyHoldCategoryItem> {
    const res = await apiClient.post<any>('/api/v1/admin/safety-holds/categories', payload);
    if (!res.success && res.message) {
      throw new Error(Array.isArray(res.message) ? res.message.join('; ') : res.message);
    }
    return res.data || res;
  },

  async updateSafetyHoldCategory(id: string, payload: Partial<SafetyHoldCategoryItem>): Promise<SafetyHoldCategoryItem> {
    const res = await apiClient.put<any>(`/api/v1/admin/safety-holds/categories/${encodeURIComponent(id)}`, payload);
    if (!res.success && res.message) {
      throw new Error(Array.isArray(res.message) ? res.message.join('; ') : res.message);
    }
    return res.data || res;
  },

  async toggleSafetyHoldCategoryStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<any> {
    const res = await apiClient.patch<any>(`/api/v1/admin/safety-holds/categories/${encodeURIComponent(id)}/status`, { status });
    return res.data || res;
  },

  async deleteSafetyHoldCategory(id: string): Promise<any> {
    const res = await apiClient.del<any>(`/api/v1/admin/safety-holds/categories/${encodeURIComponent(id)}`);
    return res.data || res;
  },

  // Clinical Summary Display Configuration
  async getClinicalSummaryConfig(): Promise<ClinicalSummaryConfigItem> {
    const res = await apiClient.get<any>('/api/v1/admin/safety-holds/summary-config');
    return res.data || res;
  },

  async updateClinicalSummaryConfig(payload: Partial<ClinicalSummaryConfigItem>): Promise<ClinicalSummaryConfigItem> {
    const res = await apiClient.put<any>('/api/v1/admin/safety-holds/summary-config', payload);
    if (!res.success && res.message) {
      throw new Error(Array.isArray(res.message) ? res.message.join('; ') : res.message);
    }
    return res.data || res;
  },

  // Legacy Safety Hold Reconciliation
  async getReconciliationStatus(): Promise<LegacyReconciliationStatus> {
    const res = await apiClient.get<any>('/api/v1/admin/safety-holds/reconciliation-status');
    return res.data || res;
  },

  async reconcileLegacySafetyHolds(payload?: { targetOfferId?: string; dryRun?: boolean }): Promise<LegacyReconciliationResult> {
    const res = await apiClient.post<any>('/api/v1/admin/safety-holds/reconcile-legacy', payload || {});
    if (!res.success && res.message) {
      throw new Error(Array.isArray(res.message) ? res.message.join('; ') : res.message);
    }
    return res.data || res;
  },
};

// ─── React Query Hooks ──────────────────────────────────────────────────────

export const useChargemasterQuery = (facilityId?: string) => {
  return useQuery({
    queryKey: ['chargemaster', facilityId],
    queryFn: () => (facilityId ? consultationManagementService.getChargemaster(facilityId) : null),
    enabled: Boolean(facilityId),
  });
};

export const useSetFacilityPriceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SetFacilityPricePayload) => consultationManagementService.setFacilityProcedurePrice(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chargemaster', variables.facilityId] });
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    },
  });
};

export const useFinancingPackagesQuery = () => {
  return useQuery({
    queryKey: ['financing-packages'],
    queryFn: () => consultationManagementService.listFinancingPackages(),
  });
};

export const useCreateFinancingPackageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<FinancingPackageItem>) => consultationManagementService.createFinancingPackage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing-packages'] });
    },
  });
};

export const useUpdateFinancingPackageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<FinancingPackageItem> }) =>
      consultationManagementService.updateFinancingPackage(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing-packages'] });
    },
  });
};

export const useToggleFinancingPackageStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      consultationManagementService.toggleFinancingPackageStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing-packages'] });
    },
  });
};

export const useDeleteFinancingPackageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => consultationManagementService.deleteFinancingPackage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing-packages'] });
    },
  });
};

export const useAppointmentPolicyQuery = (facilityId?: string) => {
  return useQuery({
    queryKey: ['appointment-policy', facilityId],
    queryFn: () => consultationManagementService.getAppointmentPolicy(facilityId),
  });
};

export const useUpdateAppointmentPolicyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AppointmentPolicyItem>) =>
      consultationManagementService.updateAppointmentPolicy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-policy'] });
    },
  });
};

export const useMasterDataItemsQuery = (categoryCode: string) => {
  return useQuery({
    queryKey: ['master-data-items', categoryCode],
    queryFn: () => consultationManagementService.listMasterDataItems(categoryCode),
    enabled: Boolean(categoryCode),
  });
};

export const useCreateMasterDataItemMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { categoryCode: string; code: string; name: string; description?: string }) =>
      consultationManagementService.createMasterDataItem(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['master-data-items', variables.categoryCode] });
    },
  });
};

export const useClearanceRequirementsQuery = (query?: { page?: number; limit?: number; category?: string; status?: string; search?: string }) => {
  return useQuery({
    queryKey: ['clearance-requirements', query],
    queryFn: () => consultationManagementService.listClearanceRequirements(query),
  });
};

export const useClearancePoliciesQuery = (query?: { page?: number; limit?: number; facilityId?: string; procedureCode?: string; status?: string; search?: string }) => {
  return useQuery({
    queryKey: ['clearance-policies', query],
    queryFn: () => consultationManagementService.listClearancePolicies(query),
  });
};

export const useCreateClearanceRequirementMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ClearanceRequirementItem>) =>
      consultationManagementService.createClearanceRequirement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clearance-requirements'] });
    },
  });
};

export const useUpdateClearanceRequirementMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ClearanceRequirementItem> }) =>
      consultationManagementService.updateClearanceRequirement(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clearance-requirements'] });
    },
  });
};

export const useToggleClearanceRequirementStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      consultationManagementService.toggleClearanceRequirementStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clearance-requirements'] });
    },
  });
};

export const useDeleteClearanceRequirementMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => consultationManagementService.deleteClearanceRequirement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clearance-requirements'] });
    },
  });
};

export const useCreateClearancePolicyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ClearancePolicyItem>) =>
      consultationManagementService.createClearancePolicy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clearance-policies'] });
    },
  });
};

export const useUpdateClearancePolicyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ClearancePolicyItem> }) =>
      consultationManagementService.updateClearancePolicy(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clearance-policies'] });
    },
  });
};

export const useDeleteClearancePolicyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => consultationManagementService.deleteClearancePolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clearance-policies'] });
    },
  });
};

// ─── Safety Hold Categories & Clinical Summary Hooks ────────────────────────

export const useSafetyHoldCategoriesQuery = (query?: {
  page?: number;
  limit?: number;
  clinicalPracticeType?: string;
  status?: string;
  search?: string;
}) => {
  return useQuery({
    queryKey: ['safety-hold-categories', query],
    queryFn: () => consultationManagementService.listSafetyHoldCategories(query),
  });
};

export const useCreateSafetyHoldCategoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<SafetyHoldCategoryItem>) =>
      consultationManagementService.createSafetyHoldCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-hold-categories'] });
    },
  });
};

export const useUpdateSafetyHoldCategoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<SafetyHoldCategoryItem> }) =>
      consultationManagementService.updateSafetyHoldCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-hold-categories'] });
    },
  });
};

export const useToggleSafetyHoldCategoryStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      consultationManagementService.toggleSafetyHoldCategoryStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-hold-categories'] });
    },
  });
};

export const useDeleteSafetyHoldCategoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => consultationManagementService.deleteSafetyHoldCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-hold-categories'] });
    },
  });
};

export const useClinicalSummaryConfigQuery = () => {
  return useQuery({
    queryKey: ['clinical-summary-config'],
    queryFn: () => consultationManagementService.getClinicalSummaryConfig(),
  });
};

export const useUpdateClinicalSummaryConfigMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ClinicalSummaryConfigItem>) =>
      consultationManagementService.updateClinicalSummaryConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-summary-config'] });
    },
  });
};

export const useReconciliationStatusQuery = () => {
  return useQuery({
    queryKey: ['safety-hold-reconciliation-status'],
    queryFn: () => consultationManagementService.getReconciliationStatus(),
  });
};

export const useReconcileLegacySafetyHoldsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: { targetOfferId?: string; dryRun?: boolean }) =>
      consultationManagementService.reconcileLegacySafetyHolds(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-hold-reconciliation-status'] });
      queryClient.invalidateQueries({ queryKey: ['safety-hold-categories'] });
    },
  });
};
