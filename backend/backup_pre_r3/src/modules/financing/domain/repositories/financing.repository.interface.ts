import { FinancingApplication, FinancingOption } from '../entities/financing.entity';

export interface FinancingFilterOptions {
  userId?: string;
  status?: string;
  partnerName?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IFinancingRepository {
  getAvailableOptions(): Promise<FinancingOption[]>;
  getOptionById(id: string): Promise<FinancingOption | null>;
  createApplication(
    data: Omit<FinancingApplication, 'id' | 'applicationNumber' | 'createdAt' | 'updatedAt'>,
  ): Promise<FinancingApplication>;
  findApplications(
    filters: FinancingFilterOptions,
  ): Promise<{ data: FinancingApplication[]; total: number; page: number; limit: number }>;
  findApplicationById(id: string): Promise<FinancingApplication | null>;
  updateApplicationStatus(
    id: string,
    status: FinancingApplication['status'],
    adminNotes?: string,
  ): Promise<FinancingApplication | null>;
}

