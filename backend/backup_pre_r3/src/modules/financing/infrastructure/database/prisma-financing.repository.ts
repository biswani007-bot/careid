import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  IFinancingRepository,
  FinancingFilterOptions,
} from '../../domain/repositories/financing.repository.interface';
import { FinancingApplication, FinancingOption } from '../../domain/entities/financing.entity';
import { FinancingCryptoService } from '../security/financing-crypto.service';

@Injectable()
export class PrismaFinancingRepository implements IFinancingRepository {
  private readonly logger = new Logger(PrismaFinancingRepository.name);

  // Exact 3 configured demonstration catalog options
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

  constructor(
    private readonly db: DatabaseService,
    private readonly cryptoService: FinancingCryptoService,
  ) {}

  async getAvailableOptions(): Promise<FinancingOption[]> {
    return this.options;
  }

  async getOptionById(id: string): Promise<FinancingOption | null> {
    const opt = this.options.find((o) => o.id === id);
    return opt || null;
  }

  private mapToDomain(r: any): FinancingApplication {
    let decryptedPan: string | null = null;
    if (r.panOrNationalId) {
      try {
        if (this.cryptoService.isCiphertext(r.panOrNationalId)) {
          decryptedPan = this.cryptoService.decrypt(r.panOrNationalId, `${r.id}:panOrNationalId`);
        } else {
          decryptedPan = r.panOrNationalId;
        }
      } catch (err) {
        this.logger.error(`Failed to decrypt national ID for application ${r.id}`);
      }
    }

    let decryptedIncome: number | null = null;
    if (r.monthlyIncomeEncrypted) {
      try {
        if (this.cryptoService.isCiphertext(r.monthlyIncomeEncrypted)) {
          const valStr = this.cryptoService.decrypt(r.monthlyIncomeEncrypted, `${r.id}:monthlyIncome`);
          decryptedIncome = parseFloat(valStr);
        } else {
          decryptedIncome = parseFloat(r.monthlyIncomeEncrypted);
        }
      } catch (err) {
        this.logger.error(`Failed to decrypt monthly income for application ${r.id}`);
      }
    }

    return {
      id: r.id,
      applicationNumber: r.applicationNumber,
      userId: r.userId,
      optionId: r.optionId,
      partnerName: r.partnerName,
      facilityId: r.facilityId || null,
      treatmentName: r.treatmentName || null,
      requestedAmount: Number(r.requestedAmount),
      tenureMonths: r.tenureMonths,
      monthlyEstimatedEmi: Number(r.monthlyEstimatedEmi),
      monthlyIncome: decryptedIncome,
      employmentType: r.employmentType || null,
      panOrNationalId: decryptedPan,
      status: r.status,
      adminNotes: r.adminNotes || null,
      notes: r.notes || null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async createApplication(
    data: Omit<FinancingApplication, 'id' | 'applicationNumber' | 'createdAt' | 'updatedAt'>,
  ): Promise<FinancingApplication> {
    const id = randomUUID();

    // 1. Allocate unique application number using PostgreSQL native atomic sequence
    const seqResult: any = await this.db.$queryRaw`SELECT nextval('financing_application_seq')::text AS seq`;
    const nextVal = parseInt(seqResult[0]?.seq, 10);
    const applicationNumber = `FIN-${new Date().getFullYear()}-${String(nextVal).padStart(5, '0')}`;

    // 2. Resolve patientProfileId from userId
    let patientProfileId: string | null = null;
    if (data.userId) {
      const patient = await this.db.patientProfile.findUnique({
        where: { userId: data.userId },
        select: { id: true },
      });
      if (patient) {
        patientProfileId = patient.id;
      }
    }

    // 3. Encrypt sensitive fields with AAD binding
    let encryptedPan: string | null = null;
    if (data.panOrNationalId) {
      encryptedPan = this.cryptoService.encrypt(String(data.panOrNationalId), `${id}:panOrNationalId`);
    }

    let encryptedIncome: string | null = null;
    if (data.monthlyIncome !== null && data.monthlyIncome !== undefined) {
      encryptedIncome = this.cryptoService.encrypt(String(data.monthlyIncome), `${id}:monthlyIncome`);
    }

    // 4. Atomic transaction creating application and audit history
    const created = await this.db.$transaction(async (tx) => {
      const app = await tx.financingApplication.create({
        data: {
          id,
          applicationNumber,
          userId: data.userId,
          patientProfileId,
          facilityId: data.facilityId || null,
          treatmentOfferId: null,
          financingOfferId: null,
          optionId: data.optionId,
          partnerName: data.partnerName,
          treatmentName: data.treatmentName || null,
          requestedAmount: new Prisma.Decimal(data.requestedAmount),
          tenureMonths: data.tenureMonths,
          monthlyEstimatedEmi: new Prisma.Decimal(data.monthlyEstimatedEmi),
          monthlyIncomeEncrypted: encryptedIncome,
          employmentType: data.employmentType || null,
          panOrNationalId: encryptedPan,
          notes: data.notes || null,
          status: 'PENDING',
          adminNotes: data.adminNotes || null,
          version: 1,
        },
      });

      await tx.financingApplicationHistory.create({
        data: {
          applicationId: id,
          previousStatus: null,
          newStatus: 'PENDING',
          action: 'APPLICATION_CREATED',
          performedBy: data.userId,
          performerRole: 'PATIENT',
          notes: data.notes || 'Financing application created',
        },
      });

      return app;
    });

    return this.mapToDomain(created);
  }

  async findApplications(
    filters: FinancingFilterOptions,
  ): Promise<{ data: FinancingApplication[]; total: number; page: number; limit: number }> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.FinancingApplicationWhereInput = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.status) {
      where.status = filters.status.toUpperCase() as any;
    }

    if (filters.partnerName) {
      where.partnerName = { contains: filters.partnerName, mode: 'insensitive' };
    }

    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { applicationNumber: { contains: q, mode: 'insensitive' } },
        { partnerName: { contains: q, mode: 'insensitive' } },
        { treatmentName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [records, total] = await Promise.all([
      this.db.financingApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.financingApplication.count({ where }),
    ]);

    return {
      data: records.map((r) => this.mapToDomain(r)),
      total,
      page,
      limit,
    };
  }

  async findApplicationById(id: string): Promise<FinancingApplication | null> {
    const r = await this.db.financingApplication.findUnique({
      where: { id },
    });
    return r ? this.mapToDomain(r) : null;
  }

  async updateApplicationStatus(
    id: string,
    status: FinancingApplication['status'],
    adminNotes?: string,
  ): Promise<FinancingApplication | null> {
    return await this.db.$transaction(async (tx) => {
      const existing = await tx.financingApplication.findUnique({
        where: { id },
      });
      if (!existing) return null;

      const previousStatus = existing.status;

      const updated = await tx.financingApplication.update({
        where: { id },
        data: {
          status: status as any,
          adminNotes: adminNotes !== undefined ? adminNotes : existing.adminNotes,
          version: { increment: 1 },
          reviewedAt: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(status) ? new Date() : existing.reviewedAt,
          disbursedAt: status === 'DISBURSED' ? new Date() : existing.disbursedAt,
        },
      });

      await tx.financingApplicationHistory.create({
        data: {
          applicationId: id,
          previousStatus: previousStatus as any,
          newStatus: status as any,
          action: `STATUS_UPDATED_TO_${status}`,
          performedBy: 'ADMIN_OR_STAFF',
          performerRole: 'ADMIN',
          notes: adminNotes || `Status updated to ${status}`,
        },
      });

      return this.mapToDomain(updated);
    });
  }
}

