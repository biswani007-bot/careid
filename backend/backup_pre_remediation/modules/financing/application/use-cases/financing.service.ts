import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Inject,
  Optional,
} from '@nestjs/common';
import { IFinancingRepository } from '../../domain/repositories/financing.repository.interface';
import {
  ApplyFinancingDto, UpdateApplicationStatusDto, FinancingOptionResponseDto, FinancingApplicationResponseDto,
} from '../../presentation/dto/financing.dto';
import { FinancingApplication, FinancingOption } from '../../domain/entities/financing.entity';
import { TreatmentOfferService } from '@modules/treatment-offer/application/use-cases/treatment-offer.service';

@Injectable()
export class FinancingService {
  constructor(
    @Inject('IFinancingRepository')
    private readonly financingRepo: IFinancingRepository,
    @Optional()
    private readonly treatmentOfferService?: TreatmentOfferService,
  ) {}

  private isStaffOrAdmin(roles: string[]): boolean {
    return roles.some((r) => ['ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN'].includes(r.toUpperCase()));
  }

  private mapOptionToDto(o: FinancingOption): FinancingOptionResponseDto {
    return {
      id: o.id,
      partnerName: o.partnerName,
      name: o.name,
      description: o.description,
      minAmount: o.minAmount,
      maxAmount: o.maxAmount,
      tenureMonths: o.tenureMonths,
      interestRate: o.interestRate,
      processingFee: o.processingFee,
      features: o.features,
      isDemonstrationCatalog: true,
      disclaimer: 'Demonstration catalog only. Real lender integration and credit underwriting subject to partner onboarding.',
    };
  }

  private mapApplicationToDto(a: FinancingApplication): FinancingApplicationResponseDto {
    return {
      id: a.id,
      applicationNumber: a.applicationNumber,
      userId: a.userId,
      optionId: a.optionId,
      partnerName: a.partnerName,
      treatmentName: a.treatmentName || undefined,
      requestedAmount: a.requestedAmount,
      tenureMonths: a.tenureMonths,
      monthlyEstimatedEmi: a.monthlyEstimatedEmi,
      status: a.status,
      adminNotes: a.adminNotes || undefined,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      isDemonstrationStorage: true,
      storageNotice: 'Operating on staging demonstration persistence. Dedicated PostgreSQL schema migration pending approval.',
    };
  }

  async getOptions(): Promise<FinancingOptionResponseDto[]> {
    const list = await this.financingRepo.getAvailableOptions();
    return list.map((o) => this.mapOptionToDto(o));
  }

  async getOffers(userId: string): Promise<any[]> {
    if (this.treatmentOfferService) {
      try {
        const finOffers = await this.treatmentOfferService.getFinancingOffers(userId);
        if (finOffers && finOffers.length > 0) {
          return finOffers;
        }
      } catch {}
    }
    // If no verified partner pre-approved offers exist, return empty availability response
    return [];
  }

  async getOfferById(id: string, userId: string): Promise<any> {
    if (this.treatmentOfferService) {
      try {
        return await this.treatmentOfferService.getFinancingOfferById(userId, id);
      } catch {}
    }

    const option = await this.financingRepo.getOptionById(id);
    if (option) return this.mapOptionToDto(option);
    const app = await this.financingRepo.findApplicationById(id);
    if (app) return this.mapApplicationToDto(app);
    throw new NotFoundException(`Financing offer '${id}' not found`);
  }

  async apply(
    userId: string,
    userEmail: string | undefined,
    userName: string | undefined,
    dto: ApplyFinancingDto,
  ): Promise<FinancingApplicationResponseDto> {
    const option = await this.financingRepo.getOptionById(dto.optionId);
    if (!option) {
      throw new BadRequestException(`Financing option ${dto.optionId} does not exist`);
    }

    if (dto.requestedAmount < option.minAmount || dto.requestedAmount > option.maxAmount) {
      throw new BadRequestException(
        `Requested amount must be between ${option.minAmount} and ${option.maxAmount}`,
      );
    }

    if (!option.tenureMonths.includes(dto.tenureMonths)) {
      throw new BadRequestException(
        `Selected tenure must be one of: ${option.tenureMonths.join(', ')} months`,
      );
    }

    // Calculate monthly estimated EMI
    let monthlyEstimatedEmi: number;
    if (option.interestRate === 0) {
      monthlyEstimatedEmi = Math.round(dto.requestedAmount / dto.tenureMonths);
    } else {
      const monthlyRate = option.interestRate / 12 / 100;
      const emi =
        (dto.requestedAmount * monthlyRate * Math.pow(1 + monthlyRate, dto.tenureMonths)) /
        (Math.pow(1 + monthlyRate, dto.tenureMonths) - 1);
      monthlyEstimatedEmi = Math.round(emi);
    }

    const application = await this.financingRepo.createApplication({
      userId,
      userEmail,
      userName,
      optionId: option.id,
      partnerName: option.partnerName,
      facilityId: dto.facilityId || null,
      treatmentName: dto.treatmentName || null,
      requestedAmount: dto.requestedAmount,
      tenureMonths: dto.tenureMonths,
      monthlyEstimatedEmi,
      monthlyIncome: dto.monthlyIncome || null,
      employmentType: dto.employmentType || null,
      panOrNationalId: dto.panOrNationalId || null,
      notes: dto.notes || null,
      status: 'PENDING',
      adminNotes: null,
    });

    return this.mapApplicationToDto(application);
  }

  async getApplications(
    userId: string,
    roles: string[],
    query: { status?: string; partnerName?: string; search?: string; page?: number; limit?: number },
  ): Promise<{ data: FinancingApplicationResponseDto[]; total: number; page: number; limit: number }> {
    const isStaff = this.isStaffOrAdmin(roles);
    const filterUserId = isStaff ? undefined : userId;

    const res = await this.financingRepo.findApplications({
      userId: filterUserId,
      status: query.status,
      partnerName: query.partnerName,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: res.data.map((a) => this.mapApplicationToDto(a)),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  async getApplicationById(id: string, userId: string, roles: string[]): Promise<FinancingApplicationResponseDto> {
    const app = await this.financingRepo.findApplicationById(id);
    if (!app) {
      throw new NotFoundException(`Financing application with ID ${id} not found`);
    }

    if (!this.isStaffOrAdmin(roles) && app.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this financing application');
    }

    return this.mapApplicationToDto(app);
  }

  async updateStatus(
    id: string,
    roles: string[],
    dto: UpdateApplicationStatusDto,
  ): Promise<FinancingApplicationResponseDto> {
    if (!this.isStaffOrAdmin(roles)) {
      throw new ForbiddenException('Only administrators or staff can update financing application status');
    }

    const app = await this.financingRepo.findApplicationById(id);
    if (!app) {
      throw new NotFoundException(`Financing application with ID ${id} not found`);
    }

    const allowedStatuses = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED'];
    const targetStatus = dto.status.toUpperCase();
    if (!allowedStatuses.includes(targetStatus)) {
      throw new BadRequestException(`Invalid status '${dto.status}'. Allowed: ${allowedStatuses.join(', ')}`);
    }

    if (['REJECTED', 'DISBURSED'].includes(app.status) && targetStatus !== app.status) {
      throw new BadRequestException(`Cannot change status of an application in terminal '${app.status}' state`);
    }

    const updated = await this.financingRepo.updateApplicationStatus(
      id,
      targetStatus as any,
      dto.notes,
    );

    if (!updated) {
      throw new NotFoundException(`Financing application with ID ${id} not found`);
    }

    return this.mapApplicationToDto(updated);
  }

  async acceptOffer(offerId: string, userId: string, dto?: any): Promise<any> {
    // 1. Check verified FinancingOffer
    if (this.treatmentOfferService) {
      try {
        const finOffer = await this.treatmentOfferService.getFinancingOfferById(userId, offerId);
        if (finOffer) {
          if (finOffer.status === 'ACCEPTED') {
            throw new BadRequestException('Financing offer has already been accepted');
          }
          if (finOffer.status === 'REJECTED' || finOffer.status === 'EXPIRED') {
            throw new BadRequestException(`Cannot accept financing offer in '${finOffer.status}' status`);
          }

          const created = await this.financingRepo.createApplication({
            userId,
            optionId: finOffer.id,
            partnerName: finOffer.partnerName,
            treatmentName: finOffer.treatmentOfferNumber ? `Treatment Offer ${finOffer.treatmentOfferNumber}` : 'Clinical Treatment',
            requestedAmount: finOffer.maxApprovedAmount,
            tenureMonths: finOffer.tenureMonths?.[0] || 12,
            monthlyEstimatedEmi: finOffer.monthlyEstimatedEmi || Math.round(finOffer.maxApprovedAmount / 12),
            status: 'UNDER_REVIEW',
            notes: dto?.notes || 'Patient accepted verified financing offer terms. Underwriting review initiated.',
          });
          return this.mapApplicationToDto(created);
        }
      } catch (err: any) {
        if (err instanceof BadRequestException || err instanceof ForbiddenException || err instanceof ConflictException) {
          throw err;
        }
      }
    }

    // 2. Check existing FinancingApplication
    let app = await this.financingRepo.findApplicationById(offerId);
    if (app) {
      if (app.userId !== userId) {
        throw new ForbiddenException('You do not have permission to accept this financing offer');
      }
      if (app.status === 'REJECTED' || app.status === 'DISBURSED') {
        throw new BadRequestException(`Cannot accept financing offer in '${app.status}' status`);
      }
      const updated = await this.financingRepo.updateApplicationStatus(
        app.id,
        'UNDER_REVIEW',
        'Patient accepted financing offer terms. Underwriting review in progress.',
      );
      return this.mapApplicationToDto(updated!);
    }

    // 3. Check catalog FinancingOption
    const option = await this.financingRepo.getOptionById(offerId);
    if (!option) {
      throw new NotFoundException(`Financing offer '${offerId}' not found`);
    }

    const created = await this.financingRepo.createApplication({
      userId,
      optionId: option.id,
      partnerName: option.partnerName,
      treatmentName: 'General Healthcare Service',
      requestedAmount: option.minAmount,
      tenureMonths: option.tenureMonths[0],
      monthlyEstimatedEmi: Math.round(option.minAmount / option.tenureMonths[0]),
      status: 'UNDER_REVIEW',
      notes: 'Patient accepted pre-approved financing offer terms. Underwriting review initiated.',
    });
    return this.mapApplicationToDto(created);
  }

  async rejectOffer(offerId: string, userId: string, reason?: string): Promise<any> {
    // 1. Check verified FinancingOffer
    if (this.treatmentOfferService) {
      try {
        const finOffer = await this.treatmentOfferService.getFinancingOfferById(userId, offerId);
        if (finOffer) {
          if (finOffer.status === 'REJECTED') {
            throw new BadRequestException('Financing offer is already rejected');
          }
          const created = await this.financingRepo.createApplication({
            userId,
            optionId: finOffer.id,
            partnerName: finOffer.partnerName,
            treatmentName: finOffer.treatmentOfferNumber ? `Treatment Offer ${finOffer.treatmentOfferNumber}` : 'Clinical Treatment',
            requestedAmount: finOffer.maxApprovedAmount,
            tenureMonths: finOffer.tenureMonths?.[0] || 12,
            monthlyEstimatedEmi: finOffer.monthlyEstimatedEmi || Math.round(finOffer.maxApprovedAmount / 12),
            status: 'REJECTED',
            notes: reason || 'Patient declined verified financing offer',
          });
          return this.mapApplicationToDto(created);
        }
      } catch (err: any) {
        if (err instanceof BadRequestException || err instanceof ForbiddenException || err instanceof ConflictException) {
          throw err;
        }
      }
    }

    // 2. Check existing FinancingApplication
    let app = await this.financingRepo.findApplicationById(offerId);
    if (app) {
      if (app.userId !== userId) {
        throw new ForbiddenException('You do not have permission to reject this financing offer');
      }
      if (app.status === 'REJECTED') {
        throw new BadRequestException('Financing offer is already rejected');
      }
      if (app.status === 'DISBURSED') {
        throw new BadRequestException('Cannot reject a disbursed financing application');
      }
      const updated = await this.financingRepo.updateApplicationStatus(
        app.id,
        'REJECTED',
        reason || 'Patient declined financing offer',
      );
      return this.mapApplicationToDto(updated!);
    }

    // 3. Check catalog FinancingOption
    const option = await this.financingRepo.getOptionById(offerId);
    if (!option) {
      throw new NotFoundException(`Financing offer '${offerId}' not found`);
    }

    const created = await this.financingRepo.createApplication({
      userId,
      optionId: option.id,
      partnerName: option.partnerName,
      treatmentName: 'General Healthcare Service',
      requestedAmount: option.minAmount,
      tenureMonths: option.tenureMonths[0],
      monthlyEstimatedEmi: Math.round(option.minAmount / option.tenureMonths[0]),
      status: 'REJECTED',
      notes: reason || 'Patient declined pre-approved financing offer',
    });
    return this.mapApplicationToDto(created);
  }
}

