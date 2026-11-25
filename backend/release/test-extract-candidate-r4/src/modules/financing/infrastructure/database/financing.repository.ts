import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { IFinancingRepository, FinancingFilterOptions } from '../../domain/repositories/financing.repository.interface';
import { FinancingApplication, FinancingOption } from '../../domain/entities/financing.entity';

@Injectable()
export class FinancingRepository implements IFinancingRepository {
  private readonly logger = new Logger(FinancingRepository.name);
  private readonly filePath = path.resolve(process.cwd(), 'data', 'financing-applications.json');
  private applications: Map<string, FinancingApplication> = new Map();

  private readonly options: FinancingOption[] = [
    {
      id: 'opt-zerocost-care',
      partnerName: 'CareCredit Health',
      name: 'Zero-Cost Medical EMI',
      description: 'Interest-free medical financing for up to 12 months across all network hospitals.',
      minAmount: 5000,
      maxAmount: 200000,
      tenureMonths: [3, 6, 9, 12],
      interestRate: 0,
      processingFee: 0,
      features: ['Zero Interest', 'Instant Digital Approval', 'No Pre-closure Penalty'],
    },
    {
      id: 'opt-surgery-flex',
      partnerName: 'MediLend Financial',
      name: 'Surgery & Inpatient Care Assist',
      description: 'Extended flexible tenure financing for elective and emergency inpatient treatments.',
      minAmount: 25000,
      maxAmount: 1000000,
      tenureMonths: [12, 18, 24, 36],
      interestRate: 8.99,
      processingFee: 999,
      features: ['High Loan Limit up to 10 Lakhs', 'Co-borrower Support', 'Disbursal within 2 hours'],
    },
    {
      id: 'opt-wellness-quick',
      partnerName: 'HealthVault Direct',
      name: 'Diagnostics & Wellness Micro-Credit',
      description: 'Instant micro-credit line for health checkups, dental, vision, and OPD consults.',
      minAmount: 1000,
      maxAmount: 50000,
      tenureMonths: [1, 2, 3, 6],
      interestRate: 0,
      processingFee: 0,
      features: ['Instant QR Scan & Pay', 'No Documentation Required', 'Rewards on Repayment'],
    },
  ];

  constructor() {
    this.loadApplications();
  }

  private loadApplications(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        if (!raw.trim()) {
          this.logger.warn('Financing applications file is empty. Starting with empty store.');
          return;
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          this.logger.warn('Financing applications file does not contain a JSON array. Starting with empty store.');
          return;
        }
        for (const item of parsed) {
          if (item && item.id) {
            this.applications.set(item.id, {
              ...item,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt),
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to read financing applications file, initialized in-memory: ${err.message}`);
    }
  }

  private persist(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const array = Array.from(this.applications.values());
      const tempPath = `${this.filePath}.${Date.now()}.${randomUUID().slice(0, 8)}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(array, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err: any) {
      this.logger.error(`Failed to persist financing applications: ${err.message}`);
    }
  }

  async getAvailableOptions(): Promise<FinancingOption[]> {
    return this.options;
  }

  async getOptionById(id: string): Promise<FinancingOption | null> {
    const opt = this.options.find((o) => o.id === id);
    return opt || null;
  }

  async createApplication(
    data: Omit<FinancingApplication, 'id' | 'applicationNumber' | 'createdAt' | 'updatedAt'>,
  ): Promise<FinancingApplication> {
    const id = randomUUID();
    const count = this.applications.size + 1;
    const applicationNumber = `FIN-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;
    const now = new Date();

    const app: FinancingApplication = {
      ...data,
      id,
      applicationNumber,
      createdAt: now,
      updatedAt: now,
    };

    this.applications.set(id, app);
    this.persist();
    return app;
  }

  async findApplications(
    filters: FinancingFilterOptions,
  ): Promise<{ data: FinancingApplication[]; total: number; page: number; limit: number }> {
    let items = Array.from(this.applications.values());

    if (filters.userId) {
      items = items.filter((a) => a.userId === filters.userId);
    }

    if (filters.status) {
      const s = filters.status.toUpperCase();
      items = items.filter((a) => a.status === s);
    }

    if (filters.partnerName) {
      const p = filters.partnerName.toLowerCase();
      items = items.filter((a) => a.partnerName.toLowerCase().includes(p));
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (a) =>
          a.applicationNumber.toLowerCase().includes(q) ||
          (a.treatmentName && a.treatmentName.toLowerCase().includes(q)) ||
          a.partnerName.toLowerCase().includes(q),
      );
    }

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const total = items.length;
    const startIndex = (page - 1) * limit;
    const data = items.slice(startIndex, startIndex + limit);

    return { data, total, page, limit };
  }

  async findApplicationById(id: string): Promise<FinancingApplication | null> {
    const app = this.applications.get(id);
    return app || null;
  }

  async updateApplicationStatus(
    id: string,
    status: FinancingApplication['status'],
    adminNotes?: string,
  ): Promise<FinancingApplication | null> {
    const app = this.applications.get(id);
    if (!app) return null;

    const updated: FinancingApplication = {
      ...app,
      status,
      adminNotes: adminNotes !== undefined ? adminNotes : app.adminNotes,
      updatedAt: new Date(),
    };

    this.applications.set(id, updated);
    this.persist();
    return updated;
  }
}

