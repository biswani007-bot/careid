import { apiClient } from './apiClient';

export interface MasterDataItemDTO {
  id: string;
  code: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  sortOrder?: number;
}

export interface AppointmentPolicyDTO {
  id?: string;
  facilityId?: string | null;
  minNoticeHoursCancel: number;
  minNoticeHoursReschedule: number;
  maxReschedulesAllowed: number;
  slotHoldMinutes: number;
  defaultSlotDurationMinutes?: number;
  allowPatientSelfReschedule?: boolean;
  autoReleaseUnconfirmedSlots?: boolean;
}

export interface HolidayDTO {
  id: string;
  name: string;
  date: string;
  isRecurring?: boolean;
  status?: string;
}

export interface FacilityProcedurePriceDTO {
  cptCode: string;
  procedureName: string;
  category?: string;
  facilityId: string;
  facilityName: string;
  standardCharge: number;
  effectivePrice: number;
  currency: string;
  isFacilityOverride: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export interface FinancingPackageDTO {
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
}

export const dynamicConsultationService = {
  /**
   * Fetches active master data items for a category (e.g. CLINICAL_REMARK_TEMPLATES, CANCELLATION_REASONS)
   */
  async getMasterDataItems(categoryCode: string): Promise<MasterDataItemDTO[]> {
    try {
      const res = await apiClient.get<any>(
        `/api/v1/governance/master-data/items?categoryCode=${encodeURIComponent(categoryCode)}`
      );
      const items = res.data || res;
      return Array.isArray(items) ? items : [];
    } catch (err) {
      console.warn(`[dynamicConsultationService] Failed to load master data items for ${categoryCode}:`, err);
      return [];
    }
  },

  /**
   * Fetches the dynamic appointment policy for a facility or the global default
   */
  async getAppointmentPolicy(facilityId?: string | null): Promise<AppointmentPolicyDTO> {
    try {
      const url = facilityId
        ? `/api/v1/appointments/policies?facilityId=${encodeURIComponent(facilityId)}`
        : '/api/v1/appointments/policies';
      const res = await apiClient.get<any>(url);
      const data = res.data || res;
      return data || {
        minNoticeHoursCancel: 24,
        minNoticeHoursReschedule: 12,
        maxReschedulesAllowed: 3,
        slotHoldMinutes: 45,
        defaultSlotDurationMinutes: 30,
      };
    } catch (err) {
      console.warn('[dynamicConsultationService] Failed to load appointment policy:', err);
      return {
        minNoticeHoursCancel: 24,
        minNoticeHoursReschedule: 12,
        maxReschedulesAllowed: 3,
        slotHoldMinutes: 45,
        defaultSlotDurationMinutes: 30,
      };
    }
  },

  /**
   * Fetches the official calendar holidays to prevent booking on off-days
   */
  async getHolidays(): Promise<HolidayDTO[]> {
    try {
      const res = await apiClient.get<any>('/api/v1/holidays');
      const data = res.data || res;
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('[dynamicConsultationService] Failed to load holidays:', err);
      return [];
    }
  },

  /**
   * Fetches the facility chargemaster price override for a specific procedure code
   */
  async getFacilityProcedurePrice(facilityId: string, procedureCode: string): Promise<FacilityProcedurePriceDTO | null> {
    try {
      const res = await apiClient.get<any>(
        `/api/v1/facilities/${encodeURIComponent(facilityId)}/procedures/${encodeURIComponent(procedureCode)}/price`
      );
      return res.data || res;
    } catch (err) {
      console.warn(`[dynamicConsultationService] Failed to load price for ${procedureCode}:`, err);
      return null;
    }
  },

  /**
   * Fetches live database-backed financing packages
   */
  async getFinancingPackages(): Promise<FinancingPackageDTO[]> {
    try {
      const res = await apiClient.get<any>('/api/v1/financing/packages');
      const data = res.data || res;
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('[dynamicConsultationService] Failed to load financing packages:', err);
      return [];
    }
  },
};
