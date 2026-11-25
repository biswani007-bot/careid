import * as crypto from 'crypto';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Inject,
  Optional,
} from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { SmsGatewayService } from '@modules/notifications/infrastructure/sms-gateway.service';
import { ITreatmentOfferRepository } from '../../domain/repositories/treatment-offer.repository.interface';
import {
  CreateTreatmentOfferDto,
  UpdateTreatmentOfferDto,
  DispatchTreatmentOfferDto,
  CancelTreatmentOfferDto,
  AcceptTreatmentOfferDto,
  RejectTreatmentOfferDto,
  TreatmentOfferQueryDto,
  TreatmentOfferSummaryDto,
  TreatmentOfferDetailDto,
  TreatmentOfferStatusResponseDto,
  FinancingOfferResponseDto,
  TreatmentOfferStatus,
  SubmitClinicalReviewDto,
  ClinicalReviewResponseDto,
  ClinicalReviewAction,
  SubmitClinicianAttestationDto,
  ClinicianAttestationResponseDto,
  FinancingPreviewDto,
  FinancingPreviewResponseDto,
  BindFinancingDto,
  ApproveDiscountDto,
  DiscountApprovalResponseDto,
  FacilityPricingRulesResponseDto,
  ResendOfferNotificationDto,
  ResendNotificationResponseDto,
} from '../../presentation/dto/treatment-offer.dto';

export const CONFIGURED_FINANCING_PARTNERS = [
  {
    partnerName: 'CareCredit Health',
    name: 'Zero-Cost Medical EMI',
    minAmount: 5000,
    maxAmount: 200000,
    supportedTenures: [3, 6, 9, 12],
    interestRate: 0,
    processingFee: 0,
    requiresCreditApproval: true,
  },
  {
    partnerName: 'MediLend Financial',
    name: 'Surgery & Inpatient Care Assist',
    minAmount: 25000,
    maxAmount: 1000000,
    supportedTenures: [12, 18, 24, 36],
    interestRate: 8.99,
    processingFee: 999,
    requiresCreditApproval: true,
  },
  {
    partnerName: 'HealthVault Direct',
    name: 'Diagnostics & Wellness Micro-Credit',
    minAmount: 1000,
    maxAmount: 50000,
    supportedTenures: [1, 2, 3, 6],
    interestRate: 0,
    processingFee: 0,
    requiresCreditApproval: false,
  },
];

@Injectable()
export class TreatmentOfferService {
  constructor(
    @Inject('ITreatmentOfferRepository')
    private readonly repo: ITreatmentOfferRepository,
    private readonly db: DatabaseService,
    @Optional() private readonly smsGatewayService?: SmsGatewayService,
  ) {}

  private isAdmin(roles: string[]): boolean {
    return roles.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()));
  }

  private isStaff(roles: string[]): boolean {
    return roles.some((r) => ['STAFF', 'FACILITY_ADMIN'].includes(r.toUpperCase()));
  }

  private async resolveStaffFacilities(userId: string): Promise<string[]> {
    const staff = await this.db.staffMember.findFirst({
      where: { userId, isDeleted: false },
      select: { primaryFacilityId: true, secondaryFacilityId: true },
    });
    if (!staff) {
      throw new ForbiddenException('Staff member profile not found for authenticated user');
    }
    return [staff.primaryFacilityId, staff.secondaryFacilityId].filter(Boolean) as string[];
  }

  private async resolveDoctorProfile(userId: string): Promise<string> {
    const doctor = await this.db.doctorProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        isDeleted: true,
        verificationStatus: true,
        user: { select: { status: true } },
      },
    });
    if (!doctor || doctor.isDeleted) {
      throw new ForbiddenException('Access denied: Caller is not a registered doctor');
    }
    if (doctor.user?.status && doctor.user.status !== 'ACTIVE') {
      throw new ForbiddenException(`Access denied: Doctor user account is inactive (${doctor.user.status})`);
    }
    if (doctor.verificationStatus !== 'VERIFIED') {
      throw new ForbiddenException(
        `Access denied: Doctor account must have VERIFIED status to perform clinical operations (current status: ${doctor.verificationStatus})`,
      );
    }
    return doctor.id;
  }

  private async resolvePatientProfile(userId: string, roles: string[] = []): Promise<string> {
    const isFamilyMember = roles.some((r) => r.toUpperCase() === 'FAMILY_MEMBER');
    const patient = await this.db.patientProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!patient) {
      if (isFamilyMember) {
        throw new ForbiddenException(
          'Family member / guardian access to treatment proposals is unsupported without an explicit verified dependent context. The patient must access and ratify their treatment proposal directly.',
        );
      }
      throw new NotFoundException('Patient profile not found for authenticated user');
    }
    return patient.id;
  }

  private toNumber(val: any): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    return Number(val.toString());
  }

  private mapSummary(o: any): TreatmentOfferSummaryDto {
    const validUntilDate = new Date(o.validUntil);
    let status = o.status as TreatmentOfferStatus;
    if (new Date() > validUntilDate && [TreatmentOfferStatus.DISPATCHED, TreatmentOfferStatus.PATIENT_REVIEWING].includes(status as any)) {
      status = TreatmentOfferStatus.EXPIRED;
    }

    const gross = this.toNumber(o.grossEstimate);
    const discount = this.toNumber(o.discountAmount);
    const discountPercent = gross > 0 ? Math.round((discount / gross) * 100 * 10) / 10 : 0;

    return {
      id: o.id,
      offerNumber: o.offerNumber,
      doctorProfileId: o.doctorProfileId,
      doctorName: o.doctor?.fullName,
      patientProfileId: o.patientProfileId,
      patientName: o.patient ? `${o.patient.firstName || ''} ${o.patient.lastName || ''}`.trim() : undefined,
      facilityId: o.facilityId,
      facilityName: o.facility?.name,
      clinicalIndication: o.clinicalIndication,
      grossEstimate: gross,
      discountAmount: discount,
      discountPercent,
      netPayable: this.toNumber(o.netPayable),
      currency: o.currency || 'PKR',
      financingEligible: Boolean(o.financingEligible),
      recommendedTenureMonths: o.recommendedTenureMonths || undefined,
      status,
      validUntil: validUntilDate.toISOString(),
      dispatchedAt: o.dispatchedAt ? new Date(o.dispatchedAt).toISOString() : undefined,
      patientViewedAt: o.patientViewedAt ? new Date(o.patientViewedAt).toISOString() : undefined,
      patientRespondedAt: o.patientRespondedAt ? new Date(o.patientRespondedAt).toISOString() : undefined,
      cancellationReason: o.cancellationReason || undefined,
      version: o.version || 1,
      createdAt: new Date(o.createdAt).toISOString(),
      updatedAt: new Date(o.updatedAt).toISOString(),
    };
  }

  private mapDetail(o: any): TreatmentOfferDetailDto {
    const summary = this.mapSummary(o);
    return {
      ...summary,
      encounterId: o.encounterId || undefined,
      clinicalNotes: o.clinicalNotes || undefined,
      termsAndConditions: o.termsAndConditions || undefined,
      patientResponseNotes: o.patientResponseNotes || undefined,
      procedures: (o.procedures || []).map((p: any) => ({
        id: p.id,
        procedureCode: p.procedureCode,
        procedureName: p.procedureName,
        category: p.category,
        quantity: p.quantity,
        unitCost: this.toNumber(p.unitCost),
        totalCost: this.toNumber(p.totalCost),
        isOptional: p.isOptional,
        sequenceOrder: p.sequenceOrder,
        clinicalJustification: p.clinicalJustification || undefined,
      })),
      history: (o.history || []).map((h: any) => ({
        id: h.id,
        previousStatus: h.previousStatus || undefined,
        newStatus: h.newStatus,
        action: h.action,
        performedBy: h.performedBy,
        performerRole: h.performerRole || undefined,
        notes: h.notes || undefined,
        createdAt: new Date(h.createdAt).toISOString(),
      })),
    };
  }

  private mapFinancingOffer(fo: any): FinancingOfferResponseDto {
    const maxAmount = this.toNumber(fo.maxApprovedAmount);
    const tenure = fo.tenureMonths && fo.tenureMonths.length > 0 ? fo.tenureMonths[0] : 12;
    const rate = this.toNumber(fo.interestRate);
    let monthlyEmi: number;
    if (rate === 0) {
      monthlyEmi = Math.round(maxAmount / tenure);
    } else {
      const r = rate / 12 / 100;
      monthlyEmi = Math.round((maxAmount * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1));
    }

    return {
      id: fo.id,
      offerNumber: fo.offerNumber,
      treatmentOfferId: fo.treatmentOfferId,
      treatmentOfferNumber: fo.treatmentOffer?.offerNumber,
      patientProfileId: fo.patientProfileId,
      partnerName: fo.partnerName,
      creditTier: fo.creditTier || undefined,
      maxApprovedAmount: maxAmount,
      minDownPayment: this.toNumber(fo.minDownPayment),
      tenureMonths: fo.tenureMonths,
      interestRate: rate,
      processingFee: this.toNumber(fo.processingFee),
      status: fo.status,
      expiresAt: fo.expiresAt && !isNaN(new Date(fo.expiresAt).getTime()) ? new Date(fo.expiresAt).toISOString() : new Date().toISOString(),
      monthlyEstimatedEmi: monthlyEmi,
      createdAt: fo.createdAt && !isNaN(new Date(fo.createdAt).getTime()) ? new Date(fo.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: fo.updatedAt && !isNaN(new Date(fo.updatedAt).getTime()) ? new Date(fo.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  // ─── 1. Doctor Creates Treatment Offer Draft ──────────────────────────────
  async createOffer(userId: string, dto: CreateTreatmentOfferDto): Promise<TreatmentOfferDetailDto> {
    const doctorProfileId = await this.resolveDoctorProfile(userId);

    // Verify patient profile
    const patient = await this.db.patientProfile.findUnique({
      where: { id: dto.patientProfileId },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException(`Patient profile with ID '${dto.patientProfileId}' not found`);
    }

    // Verify facility
    const facility = await this.db.facility.findUnique({
      where: { id: dto.facilityId },
      select: { id: true },
    });
    if (!facility) {
      throw new NotFoundException(`Facility with ID '${dto.facilityId}' not found`);
    }

    // Verify doctor clinical privileges at facility
    const privilege = await this.db.doctorFacility.findFirst({
      where: {
        doctorId: doctorProfileId,
        facilityId: dto.facilityId,
        isActive: true,
      },
    });
    if (!privilege) {
      throw new ForbiddenException('Doctor does not have active clinical privileges at the specified facility');
    }

    // Verify procedures
    if (!dto.procedures || dto.procedures.length === 0) {
      throw new BadRequestException('At least one itemized procedure is required to create a treatment offer');
    }

    const validUntil = new Date(dto.validUntil);
    if (isNaN(validUntil.getTime()) || validUntil <= new Date()) {
      throw new BadRequestException('Valid-until date must be a valid future timestamp');
    }

    // Calculate gross estimate
    let grossEstimate = 0;
    const proceduresWithTotals = dto.procedures.map((p: any, idx: number) => {
      const q = p.quantity && p.quantity > 0 ? p.quantity : 1;
      const unit = p.unitCost >= 0 ? p.unitCost : 0;
      const total = Math.round(q * unit * 100) / 100;
      grossEstimate += total;
      return {
        procedureCode: p.procedureCode,
        procedureName: p.procedureName,
        category: p.category,
        quantity: q,
        unitCost: unit,
        totalCost: total,
        isOptional: Boolean(p.isOptional),
        sequenceOrder: idx,
        clinicalJustification: p.clinicalJustification,
      };
    });

    const discount = dto.discountAmount && dto.discountAmount > 0 ? dto.discountAmount : 0;
    if (discount > grossEstimate) {
      throw new BadRequestException('Discount amount cannot exceed gross procedure estimate');
    }
    if (grossEstimate > 0 && discount > 0) {
      const discountPercent = (discount / grossEstimate) * 100;
      if (discountPercent > 30) {
        throw new BadRequestException('Discount cannot exceed maximum ceiling of 30%');
      }
    }
    const netPayable = Math.round((grossEstimate - discount) * 100) / 100;

    const tempNumber = `DRAFT-${Date.now().toString(36).toUpperCase()}`;

    const offer = await this.repo.createOffer({
      offerNumber: tempNumber,
      doctorProfileId,
      patientProfileId: dto.patientProfileId,
      facilityId: dto.facilityId,
      encounterId: dto.encounterId,
      clinicalIndication: dto.clinicalIndication,
      grossEstimate,
      discountAmount: discount,
      netPayable,
      currency: 'PKR',
      financingEligible: Boolean(dto.financingEligible),
      recommendedTenureMonths: dto.recommendedTenureMonths,
      validUntil,
      clinicalNotes: dto.clinicalNotes,
      termsAndConditions: dto.termsAndConditions,
      procedures: proceduresWithTotals,
      createdById: userId,
      performerRole: 'DOCTOR',
    });

    return this.mapDetail(offer);
  }

  // ─── 2. Doctor Lists Authored Treatment Offers ────────────────────────────
  async getDoctorOffers(
    userId: string,
    query: TreatmentOfferQueryDto,
    roles: string[] = [],
  ): Promise<{ data: TreatmentOfferSummaryDto[]; total: number; page: number; limit: number }> {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 20;

    if (this.isAdmin(roles)) {
      const where: any = {};
      if (query.status) where.status = query.status;
      if (query.patientId) where.patientProfileId = query.patientId;
      if (query.search) {
        where.OR = [
          { offerNumber: { contains: query.search, mode: 'insensitive' } },
          { clinicalIndication: { contains: query.search, mode: 'insensitive' } },
        ];
      }
      const [items, total] = await Promise.all([
        this.db.treatmentOffer.findMany({
          where,
          include: {
            doctor: { select: { id: true, fullName: true, primarySpecialization: true } },
            patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } },
            facility: { select: { id: true, name: true, city: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.db.treatmentOffer.count({ where }),
      ]);
      return {
        data: items.map((i) => this.mapSummary(i)),
        total,
        page,
        limit,
      };
    }

    if (this.isStaff(roles)) {
      const staffFacilities = await this.resolveStaffFacilities(userId);
      const where: any = { facilityId: { in: staffFacilities } };
      if (query.status) where.status = query.status;
      if (query.patientId) where.patientProfileId = query.patientId;
      if (query.search) {
        where.OR = [
          { offerNumber: { contains: query.search, mode: 'insensitive' } },
          { clinicalIndication: { contains: query.search, mode: 'insensitive' } },
        ];
      }
      const [items, total] = await Promise.all([
        this.db.treatmentOffer.findMany({
          where,
          include: {
            doctor: { select: { id: true, fullName: true, primarySpecialization: true } },
            patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } },
            facility: { select: { id: true, name: true, city: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.db.treatmentOffer.count({ where }),
      ]);
      return {
        data: items.map((i) => this.mapSummary(i)),
        total,
        page,
        limit,
      };
    }

    const doctorProfileId = await this.resolveDoctorProfile(userId);
    const res = await this.repo.findOffersForDoctor(doctorProfileId, {
      status: query.status,
      patientId: query.patientId,
      search: query.search,
      page,
      limit,
    });

    return {
      data: res.items.map((i) => this.mapSummary(i)),
      total: res.total,
      page,
      limit,
    };
  }

  // ─── 3. Doctor Reads Treatment Offer Details ──────────────────────────────
  async getDoctorOfferById(userId: string, offerId: string, roles: string[] = []): Promise<TreatmentOfferDetailDto> {
    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    if (!this.isAdmin(roles)) {
      if (this.isStaff(roles)) {
        const staffFacilities = await this.resolveStaffFacilities(userId);
        if (!staffFacilities.includes(offer.facilityId)) {
          throw new ForbiddenException('Access denied: You are not authorized to view treatment offers for this facility');
        }
      } else {
        const doctorProfileId = await this.resolveDoctorProfile(userId);
        if (offer.doctorProfileId !== doctorProfileId) {
          throw new ForbiddenException('You do not have permission to view this treatment offer');
        }
      }
    }

    // Check expiration on read
    if (new Date() > new Date(offer.validUntil) && [TreatmentOfferStatus.DISPATCHED, TreatmentOfferStatus.PATIENT_REVIEWING].includes(offer.status)) {
      const expired = await this.repo.expireOffer(offer.id);
      return this.mapDetail(expired);
    }

    return this.mapDetail(offer);
  }

  // ─── 4. Doctor Updates Draft Treatment Offer ──────────────────────────────
  async updateOffer(userId: string, offerId: string, dto: UpdateTreatmentOfferDto): Promise<TreatmentOfferDetailDto> {
    const doctorProfileId = await this.resolveDoctorProfile(userId);
    const existing = await this.repo.findOfferById(offerId);
    if (!existing) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    if (existing.doctorProfileId !== doctorProfileId) {
      throw new ForbiddenException('You can only edit your own treatment offers');
    }

    if (existing.status !== TreatmentOfferStatus.DRAFT) {
      throw new ConflictException(`Cannot edit offer in '${existing.status}' status. Only DRAFT offers can be edited.`);
    }

    let grossEstimate = this.toNumber(existing.grossEstimate);
    let proceduresWithTotals: any = undefined;

    if (dto.procedures) {
      if (dto.procedures.length === 0) {
        throw new BadRequestException('Procedures list cannot be empty');
      }
      grossEstimate = 0;
      proceduresWithTotals = dto.procedures.map((p: any, idx: number) => {
        const q = p.quantity && p.quantity > 0 ? p.quantity : 1;
        const unit = p.unitCost >= 0 ? p.unitCost : 0;
        const total = Math.round(q * unit * 100) / 100;
        grossEstimate += total;
        return {
          procedureCode: p.procedureCode,
          procedureName: p.procedureName,
          category: p.category,
          quantity: q,
          unitCost: unit,
          totalCost: total,
          isOptional: Boolean(p.isOptional),
          sequenceOrder: idx,
          clinicalJustification: p.clinicalJustification,
        };
      });
    }

    const discount = dto.discountAmount !== undefined ? dto.discountAmount : this.toNumber(existing.discountAmount);
    if (discount > grossEstimate) {
      throw new BadRequestException('Discount amount cannot exceed gross procedure estimate');
    }
    if (grossEstimate > 0 && discount > 0) {
      const discountPercent = (discount / grossEstimate) * 100;
      if (discountPercent > 30) {
        throw new BadRequestException('Discount cannot exceed maximum ceiling of 30%');
      }
    }
    const netPayable = Math.round((grossEstimate - discount) * 100) / 100;

    let validUntil: Date | undefined = undefined;
    if (dto.validUntil) {
      validUntil = new Date(dto.validUntil);
      if (isNaN(validUntil.getTime()) || validUntil <= new Date()) {
        throw new BadRequestException('Valid-until date must be a valid future timestamp');
      }
    }

    const updated = await this.repo.updateOffer(offerId, {
      clinicalIndication: dto.clinicalIndication,
      grossEstimate,
      discountAmount: discount,
      netPayable,
      financingEligible: dto.financingEligible,
      recommendedTenureMonths: dto.recommendedTenureMonths,
      validUntil,
      clinicalNotes: dto.clinicalNotes,
      termsAndConditions: dto.termsAndConditions,
      procedures: proceduresWithTotals,
      updatedById: userId,
      performerRole: 'DOCTOR',
      expectedVersion: dto.expectedVersion,
    });

    return this.mapDetail(updated);
  }

  // ─── 5. Doctor Dispatches Treatment Offer ─────────────────────────────────
  async dispatchOffer(userId: string, offerId: string, dto?: DispatchTreatmentOfferDto): Promise<TreatmentOfferDetailDto> {
    const doctorProfileId = await this.resolveDoctorProfile(userId);
    const existing = await this.repo.findOfferById(offerId);
    if (!existing) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    if (existing.doctorProfileId !== doctorProfileId) {
      throw new ForbiddenException('You can only dispatch your own treatment offers');
    }

    if (existing.status !== TreatmentOfferStatus.DRAFT) {
      throw new ConflictException(`Offer cannot be dispatched from status '${existing.status}'. Must be DRAFT.`);
    }

    if (dto?.expectedVersion !== undefined && existing.version !== dto.expectedVersion) {
      throw new ConflictException('The treatment offer was modified concurrently by another session. Please refresh.');
    }

    if (new Date() >= new Date(existing.validUntil)) {
      throw new BadRequestException('Cannot dispatch an offer whose valid-until date has already passed. Please update the validity date.');
    }

    if (!existing.procedures || existing.procedures.length === 0) {
      throw new BadRequestException('At least one procedure is required to dispatch a treatment offer');
    }

    // Verify doctor clinical privileges at facility
    const privilege = await this.db.doctorFacility.findFirst({
      where: {
        doctorId: doctorProfileId,
        facilityId: existing.facilityId,
        isActive: true,
      },
    });
    if (!privilege) {
      throw new ForbiddenException('Doctor does not have active clinical privileges at the specified facility');
    }

    // Verify discount approval if discount exceeds 15%
    const gross = this.toNumber(existing.grossEstimate);
    const discount = this.toNumber(existing.discountAmount);
    if (gross > 0 && discount > 0) {
      const discountPercent = (discount / gross) * 100;
      if (discountPercent > 30) {
        throw new BadRequestException('Offer discount exceeds maximum ceiling of 30%');
      }
      if (discountPercent > 15) {
        const discountApproval = await this.repo.findLatestOfferHistoryByAction(offerId, 'DISCOUNT_APPROVED');
        if (!discountApproval || !(discountApproval.metadata as any)?.approved) {
          throw new ConflictException(
            `Offer discount of ${Math.round(discountPercent)}% exceeds the 15% supervisor threshold. Supervisor approval (FACILITY_ADMIN/ADMIN) is required prior to dispatch.`,
          );
        }
      }
    }

    // Verify clinical review status (Mandatory: must exist and be APPROVED)
    const latestReview = await this.repo.findLatestOfferHistoryByAction(offerId, 'CLINICAL_REVIEW');
    if (!latestReview) {
      throw new ConflictException(
        'Treatment offer cannot be dispatched: Clinical review is missing. A multidisciplinary clinical review (APPROVED) must be documented prior to patient dispatch.',
      );
    }
    const reviewStatus = (latestReview.metadata as any)?.reviewStatus;
    if (reviewStatus !== ClinicalReviewAction.APPROVED) {
      if (reviewStatus === ClinicalReviewAction.REJECTED) {
        throw new ConflictException('Treatment offer cannot be dispatched because clinical review was REJECTED');
      }
      if (reviewStatus === ClinicalReviewAction.NEEDS_INFORMATION) {
        throw new ConflictException(
          'Treatment offer cannot be dispatched because clinical review is pending additional information (NEEDS_INFORMATION)',
        );
      }
      throw new ConflictException(
        `Treatment offer cannot be dispatched: Clinical review status '${reviewStatus}' is invalid. Must be APPROVED.`,
      );
    }

    // Verify clinician attestation (Must exist and match current proposal version)
    const latestAttestation = await this.repo.findLatestOfferHistoryByAction(offerId, 'CLINICIAN_ATTESTATION');
    const attestationValidForVersion =
      latestAttestation && (latestAttestation.metadata as any)?.offerVersion === existing.version;

    if (!attestationValidForVersion) {
      if (dto?.attestationStatement) {
        const doctor = await this.db.doctorProfile.findUnique({
          where: { id: doctorProfileId },
          select: { licenseNumber: true },
        });
        await this.submitAttestation(userId, offerId, {
          statement: dto.attestationStatement,
          licenseNumber: doctor?.licenseNumber,
          confirmTruthfulness: true,
        });
      } else {
        const reason = latestAttestation
          ? `Prior attestation was for offer version ${(latestAttestation.metadata as any)?.offerVersion}, but current offer is at version ${existing.version}. Re-attestation is required for the modified proposal.`
          : 'Prior clinician attestation is required.';
        throw new ConflictException(
          `Cannot dispatch treatment offer: ${reason} Please submit attestation via POST /api/v1/doctors/treatment-offers/:offerId/attest or provide attestationStatement in the dispatch request.`,
        );
      }
    }

    const officialNumber = await this.repo.generateOfferNumber();
    const dispatched = await this.repo.dispatchOffer(offerId, officialNumber, userId, 'DOCTOR', dto?.expectedVersion);
    return this.mapDetail(dispatched);
  }

  // ─── 6. Doctor / Staff / Patient Status Check ─────────────────────────────
  async getOfferStatus(userId: string, offerId: string, roles: string[] = []): Promise<TreatmentOfferStatusResponseDto> {
    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    if (!this.isAdmin(roles)) {
      if (this.isStaff(roles)) {
        const staffFacilities = await this.resolveStaffFacilities(userId);
        if (!staffFacilities.includes(offer.facilityId)) {
          throw new ForbiddenException('Access denied: You are not authorized to view treatment offer status for this facility');
        }
      } else {
        const isDoctor = roles.some((r) => ['DOCTOR', 'PRACTITIONER'].includes(r.toUpperCase()));
        if (isDoctor) {
          const doctorProfileId = await this.resolveDoctorProfile(userId);
          if (offer.doctorProfileId !== doctorProfileId) {
            throw new ForbiddenException('Access denied: You do not have permission to inspect this offer status');
          }
        } else {
          const patientProfileId = await this.resolvePatientProfile(userId, roles);
          if (offer.patientProfileId !== patientProfileId) {
            throw new ForbiddenException('Access denied: You do not have permission to inspect this offer status');
          }
        }
      }
    }

    const validUntilDate = new Date(offer.validUntil);
    const isExpired = new Date() > validUntilDate;
    let status = offer.status as TreatmentOfferStatus;
    if (isExpired && [TreatmentOfferStatus.DISPATCHED, TreatmentOfferStatus.PATIENT_REVIEWING].includes(status as any)) {
      status = TreatmentOfferStatus.EXPIRED;
    }

    return {
      id: offer.id,
      offerNumber: offer.offerNumber,
      status,
      isExpired,
      validUntil: validUntilDate.toISOString(),
      dispatchedAt: offer.dispatchedAt ? new Date(offer.dispatchedAt).toISOString() : undefined,
      patientViewedAt: offer.patientViewedAt ? new Date(offer.patientViewedAt).toISOString() : undefined,
      patientRespondedAt: offer.patientRespondedAt ? new Date(offer.patientRespondedAt).toISOString() : undefined,
      patientResponseNotes: offer.patientResponseNotes || undefined,
      cancellationReason: offer.cancellationReason || undefined,
      version: offer.version,
    };
  }

  // ─── 7. Doctor / Staff Cancels Treatment Offer ────────────────────────────
  async cancelOffer(userId: string, offerId: string, roles: string[] = [], dto: CancelTreatmentOfferDto): Promise<TreatmentOfferDetailDto> {
    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    if (!this.isAdmin(roles)) {
      if (this.isStaff(roles)) {
        const staffFacilities = await this.resolveStaffFacilities(userId);
        if (!staffFacilities.includes(offer.facilityId)) {
          throw new ForbiddenException('Access denied: You are not authorized to cancel treatment offers for this facility');
        }
      } else {
        const doctorProfileId = await this.resolveDoctorProfile(userId);
        if (offer.doctorProfileId !== doctorProfileId) {
          throw new ForbiddenException('You can only cancel your own treatment offers');
        }
      }
    }

    if (['RATIFIED_ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'].includes(offer.status)) {
      throw new ConflictException(`Cannot cancel treatment offer in terminal '${offer.status}' status`);
    }

    if (dto.expectedVersion !== undefined && offer.version !== dto.expectedVersion) {
      throw new ConflictException('The treatment offer was modified concurrently by another session. Please refresh.');
    }

    const cancelled = await this.repo.cancelOffer(
      offerId,
      dto.cancellationReason,
      userId,
      this.isAdmin(roles) ? 'ADMIN' : this.isStaff(roles) ? 'STAFF' : 'DOCTOR',
      dto.expectedVersion,
    );
    return this.mapDetail(cancelled);
  }

  // ─── 8. Patient Lists Received Treatment Offers ───────────────────────────
  async getPatientOffers(
    userId: string,
    query: TreatmentOfferQueryDto,
    roles: string[] = [],
  ): Promise<{ data: TreatmentOfferSummaryDto[]; total: number; page: number; limit: number }> {
    const patientProfileId = await this.resolvePatientProfile(userId, roles);
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 20;

    const res = await this.repo.findOffersForPatient(patientProfileId, {
      status: query.status,
      search: query.search,
      page,
      limit,
    });

    return {
      data: res.items.map((i) => this.mapSummary(i)),
      total: res.total,
      page,
      limit,
    };
  }

  // ─── 9. Patient Reads Offer (Triggers PATIENT_REVIEWING) ───────────────────
  async getPatientOfferById(userId: string, offerId: string, roles: string[] = []): Promise<TreatmentOfferDetailDto> {
    const patientProfileId = await this.resolvePatientProfile(userId, roles);
    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    if (offer.patientProfileId !== patientProfileId) {
      throw new ForbiddenException('You do not have permission to view this treatment offer');
    }

    if (offer.status === TreatmentOfferStatus.DRAFT) {
      throw new NotFoundException('Treatment offer is not available yet');
    }

    // Check expiration
    if (new Date() > new Date(offer.validUntil) && [TreatmentOfferStatus.DISPATCHED, TreatmentOfferStatus.PATIENT_REVIEWING].includes(offer.status)) {
      const expired = await this.repo.expireOffer(offer.id);
      return this.mapDetail(expired);
    }

    // Auto-transition DISPATCHED -> PATIENT_REVIEWING
    if (offer.status === TreatmentOfferStatus.DISPATCHED) {
      const reviewing = await this.repo.markOfferReviewing(offerId, userId);
      return this.mapDetail(reviewing);
    }

    return this.mapDetail(offer);
  }

  // ─── 10. Patient Accepts Treatment Offer (RATIFIED_ACCEPTED) ──────────────
  async ratifyOffer(
    userId: string,
    offerId: string,
    dto: AcceptTreatmentOfferDto,
    roles: string[] = [],
  ): Promise<TreatmentOfferDetailDto> {
    const patientProfileId = await this.resolvePatientProfile(userId, roles);
    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    if (offer.patientProfileId !== patientProfileId) {
      throw new ForbiddenException('You do not have permission to accept this treatment offer');
    }

    if (!dto.signatureConsent) {
      throw new BadRequestException('Informed consent acceptance is mandatory to ratify treatment');
    }

    if (offer.status === TreatmentOfferStatus.RATIFIED_ACCEPTED) {
      throw new BadRequestException('Treatment offer has already been accepted');
    }

    if (![TreatmentOfferStatus.DISPATCHED, TreatmentOfferStatus.PATIENT_REVIEWING].includes(offer.status)) {
      throw new BadRequestException(`Cannot accept offer in '${offer.status}' status`);
    }

    if (dto.expectedVersion !== undefined && offer.version !== dto.expectedVersion) {
      throw new ConflictException('The treatment offer was modified concurrently by another session. Please refresh.');
    }

    if (new Date() > new Date(offer.validUntil)) {
      await this.repo.expireOffer(offer.id);
      throw new BadRequestException('Treatment offer has expired and can no longer be accepted');
    }

    const ratified = await this.repo.ratifyOffer(offerId, dto.patientResponseNotes, userId, dto.expectedVersion);
    return this.mapDetail(ratified);
  }

  // ─── 11. Patient Rejects Treatment Offer (DECLINED) ───────────────────────
  async declineOffer(
    userId: string,
    offerId: string,
    dto: RejectTreatmentOfferDto,
    roles: string[] = [],
  ): Promise<TreatmentOfferDetailDto> {
    const patientProfileId = await this.resolvePatientProfile(userId, roles);
    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    if (offer.patientProfileId !== patientProfileId) {
      throw new ForbiddenException('You do not have permission to decline this treatment offer');
    }

    if (offer.status === TreatmentOfferStatus.DECLINED) {
      throw new BadRequestException('Treatment offer has already been declined');
    }

    if (![TreatmentOfferStatus.DISPATCHED, TreatmentOfferStatus.PATIENT_REVIEWING].includes(offer.status)) {
      throw new BadRequestException(`Cannot decline offer in '${offer.status}' status`);
    }

    if (dto.expectedVersion !== undefined && offer.version !== dto.expectedVersion) {
      throw new ConflictException('The treatment offer was modified concurrently by another session. Please refresh.');
    }

    const declined = await this.repo.declineOffer(offerId, dto.declineReason, userId, dto.expectedVersion);
    return this.mapDetail(declined);
  }

  // ─── 12. Patient Lists Financing Offers ───────────────────────────────────
  async getFinancingOffers(userId: string): Promise<FinancingOfferResponseDto[]> {
    const patientProfileId = await this.resolvePatientProfile(userId);
    const offers = await this.repo.findFinancingOffersForPatient(patientProfileId);
    return offers.map((f) => this.mapFinancingOffer(f));
  }

  // ─── 13. Patient Reads Financing Offer Details ────────────────────────────
  async getFinancingOfferById(userId: string, id: string): Promise<FinancingOfferResponseDto> {
    const patientProfileId = await this.resolvePatientProfile(userId);
    const offer = await this.repo.findFinancingOfferById(id);
    if (!offer) {
      throw new NotFoundException(`Financing offer '${id}' not found`);
    }

    if (offer.patientProfileId !== patientProfileId) {
      throw new ForbiddenException('You do not have permission to view this financing offer');
    }

    return this.mapFinancingOffer(offer);
  }

  // ─── 14. Offer Acceptance Certificate (Stage 8) ─────────────────────────
  async getAcceptanceCertificate(
    userId: string,
    offerId: string,
    roles: string[] = [],
  ): Promise<any> {
    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    // Must be in ACCEPTED status
    if (offer.status !== 'ACCEPTED') {
      throw new BadRequestException(
        `Acceptance certificate is only available for accepted treatment offers. Current status: ${offer.status}`,
      );
    }

    const patientRespondedAt = offer.patientRespondedAt || offer.updatedAt || new Date();
    const respondedIso = new Date(patientRespondedAt).toISOString();

    const verificationHash = crypto
      .createHash('sha256')
      .update(`${offer.id}:${offer.patientProfileId}:${respondedIso}`)
      .digest('hex');

    return {
      certificateId: `CERT-${offer.offerNumber}`,
      certificateStatus: 'VALID',
      issuedAt: new Date().toISOString(),
      verificationHash,
      offerId: offer.id,
      offerNumber: offer.offerNumber,
      status: offer.status,
      clinicalIndication: offer.clinicalIndication,
      patient: {
        id: offer.patient?.id || offer.patientProfileId,
        firstName: offer.patient?.firstName || null,
        lastName: offer.patient?.lastName || null,
        fullName: [offer.patient?.firstName, offer.patient?.lastName].filter(Boolean).join(' ') || 'Patient',
      },
      doctor: {
        id: offer.doctor?.id || offer.doctorProfileId,
        fullName: offer.doctor?.fullName || 'Doctor',
        primarySpecialization: offer.doctor?.primarySpecialization || null,
      },
      facility: {
        id: offer.facility?.id || offer.facilityId,
        name: offer.facility?.name || 'Facility',
        city: offer.facility?.city || null,
      },
      financialBreakdown: {
        grossEstimate: Number(offer.grossEstimate),
        discountAmount: Number(offer.discountAmount),
        netPayable: Number(offer.netPayable),
        currency: offer.currency,
        financingEligible: Boolean(offer.financingEligible),
        recommendedTenureMonths: offer.recommendedTenureMonths ?? null,
      },
      procedures: (offer.procedures || []).map((p: any) => ({
        id: p.id,
        procedureCode: p.procedureCode,
        procedureName: p.procedureName,
        category: p.category,
        quantity: p.quantity,
        unitCost: Number(p.unitCost),
        totalCost: Number(p.totalCost),
        sequenceOrder: p.sequenceOrder,
      })),
      termsAndConditions: offer.termsAndConditions,
      patientRespondedAt: respondedIso,
      patientResponseNotes: offer.patientResponseNotes,
    };
  }

  // ─── 15. Multidisciplinary Clearance (Stage 9) ──────────────────────────
  async getClearance(
    userId: string,
    offerId: string,
    roles: string[] = [],
  ): Promise<any> {
    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    const latestClearance = (offer.history || []).find(
      (h: any) => h.action === 'PRE_OP_CLEARANCE_UPDATE',
    );

    if (latestClearance && latestClearance.metadata) {
      return latestClearance.metadata;
    }

    return {
      treatmentOfferId: offer.id,
      offerNumber: offer.offerNumber,
      overallStatus: 'PENDING',
      cardiologyClearance: { status: 'PENDING', clearedBy: null, clearedAt: null, notes: null },
      anesthesiaClearance: { status: 'PENDING', clearedBy: null, clearedAt: null, notes: null },
      medicalClearance: { status: 'PENDING', clearedBy: null, clearedAt: null, notes: null },
      surgicalClearance: { status: 'PENDING', clearedBy: null, clearedAt: null, notes: null },
      labClearance: { status: 'PENDING', clearedBy: null, clearedAt: null, notes: null },
      lastUpdatedBy: null,
      lastUpdatedAt: null,
    };
  }

  async updateClearance(
    userId: string,
    offerId: string,
    dto: any,
    roles: string[] = [],
  ): Promise<any> {
    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    const current = await this.getClearance(userId, offerId, roles);
    const now = new Date().toISOString();

    const updatedCardiology = dto.cardiologyClearance
      ? {
          ...current.cardiologyClearance,
          ...dto.cardiologyClearance,
          clearedAt: dto.cardiologyClearance.status === 'CLEARED' ? (dto.cardiologyClearance.clearedAt || now) : null,
          clearedBy: dto.cardiologyClearance.status === 'CLEARED' ? (dto.cardiologyClearance.clearedBy || userId) : null,
        }
      : current.cardiologyClearance;

    const updatedAnesthesia = dto.anesthesiaClearance
      ? {
          ...current.anesthesiaClearance,
          ...dto.anesthesiaClearance,
          clearedAt: dto.anesthesiaClearance.status === 'CLEARED' ? (dto.anesthesiaClearance.clearedAt || now) : null,
          clearedBy: dto.anesthesiaClearance.status === 'CLEARED' ? (dto.anesthesiaClearance.clearedBy || userId) : null,
        }
      : current.anesthesiaClearance;

    const updatedMedical = dto.medicalClearance
      ? {
          ...current.medicalClearance,
          ...dto.medicalClearance,
          clearedAt: dto.medicalClearance.status === 'CLEARED' ? (dto.medicalClearance.clearedAt || now) : null,
          clearedBy: dto.medicalClearance.status === 'CLEARED' ? (dto.medicalClearance.clearedBy || userId) : null,
        }
      : current.medicalClearance;

    const updatedSurgical = dto.surgicalClearance
      ? {
          ...current.surgicalClearance,
          ...dto.surgicalClearance,
          clearedAt: dto.surgicalClearance.status === 'CLEARED' ? (dto.surgicalClearance.clearedAt || now) : null,
          clearedBy: dto.surgicalClearance.status === 'CLEARED' ? (dto.surgicalClearance.clearedBy || userId) : null,
        }
      : current.surgicalClearance;

    const updatedLab = dto.labClearance
      ? {
          ...current.labClearance,
          ...dto.labClearance,
          clearedAt: dto.labClearance.status === 'CLEARED' ? (dto.labClearance.clearedAt || now) : null,
          clearedBy: dto.labClearance.status === 'CLEARED' ? (dto.labClearance.clearedBy || userId) : null,
        }
      : current.labClearance;

    const domainStatuses = [
      updatedCardiology.status,
      updatedAnesthesia.status,
      updatedMedical.status,
      updatedSurgical.status,
      updatedLab.status,
    ];

    let overallStatus = 'PENDING';
    if (domainStatuses.some((s) => s === 'REJECTED')) {
      overallStatus = 'REJECTED';
    } else if (domainStatuses.every((s) => s === 'CLEARED' || s === 'NOT_REQUIRED')) {
      overallStatus = 'CLEARED';
    } else if (domainStatuses.some((s) => s === 'CLEARED')) {
      overallStatus = 'PARTIALLY_CLEARED';
    }

    const result = {
      treatmentOfferId: offer.id,
      offerNumber: offer.offerNumber,
      overallStatus,
      cardiologyClearance: updatedCardiology,
      anesthesiaClearance: updatedAnesthesia,
      medicalClearance: updatedMedical,
      surgicalClearance: updatedSurgical,
      labClearance: updatedLab,
      lastUpdatedBy: userId,
      lastUpdatedAt: now,
    };

    await this.repo.createHistory(
      offer.id,
      'PRE_OP_CLEARANCE_UPDATE',
      offer.status,
      offer.status,
      userId,
      roles[0] || 'CLINICIAN',
      dto.notes || `Clearance status updated to ${overallStatus}`,
      result,
    );

    return result;
  }

  // ─── 17. Clinical Review (Stages 1–6) ─────────────────────────────────────
  async submitClinicalReview(
    userId: string,
    offerId: string,
    dto: SubmitClinicalReviewDto,
    roles: string[] = [],
  ): Promise<ClinicalReviewResponseDto> {
    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    const reviewedAt = new Date().toISOString();
    const reviewerRole = roles[0] || 'DOCTOR';
    const metadata = {
      reviewStatus: dto.action,
      comments: dto.comments,
      criteria: dto.reviewCriteria || [],
      reviewedBy: userId,
      reviewerRole,
      reviewedAt,
    };

    await this.repo.createHistory(
      offer.id,
      'CLINICAL_REVIEW',
      offer.status,
      offer.status,
      userId,
      reviewerRole,
      dto.comments,
      metadata,
    );

    return {
      treatmentOfferId: offer.id,
      status: dto.action,
      comments: dto.comments,
      reviewCriteria: dto.reviewCriteria,
      reviewedBy: userId,
      reviewerRole,
      reviewedAt,
    };
  }

  async getClinicalReview(
    userId: string,
    offerId: string,
    roles: string[] = [],
  ): Promise<ClinicalReviewResponseDto> {
    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    const latest = await this.repo.findLatestOfferHistoryByAction(offerId, 'CLINICAL_REVIEW');
    if (!latest || !latest.metadata) {
      return {
        treatmentOfferId: offer.id,
        status: ClinicalReviewAction.APPROVED,
        comments: 'Standard baseline clinical review in effect',
        reviewedBy: offer.doctor?.userId || userId,
        reviewerRole: 'DOCTOR',
        reviewedAt: new Date(offer.createdAt).toISOString(),
      };
    }

    const m = latest.metadata as any;
    return {
      treatmentOfferId: offer.id,
      status: m.reviewStatus as ClinicalReviewAction,
      comments: m.comments || latest.notes || '',
      reviewCriteria: m.criteria,
      reviewedBy: m.reviewedBy || latest.performedBy,
      reviewerRole: m.reviewerRole || latest.performerRole,
      reviewedAt: m.reviewedAt || new Date(latest.createdAt).toISOString(),
    };
  }

  // ─── 18. Clinician Attestation (Stages 1–6) ───────────────────────────────
  async submitAttestation(
    userId: string,
    offerId: string,
    dto: SubmitClinicianAttestationDto,
  ): Promise<ClinicianAttestationResponseDto> {
    if (!dto.confirmTruthfulness) {
      throw new BadRequestException('Clinician must explicitly confirm the truthfulness and accuracy of the attestation');
    }

    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    const doctorProfileId = await this.resolveDoctorProfile(userId);
    if (offer.doctorProfileId !== doctorProfileId) {
      throw new ForbiddenException('You can only submit clinical attestation for your authored treatment offers');
    }

    let licenseNumber = dto.licenseNumber;
    if (!licenseNumber) {
      const doctor = await this.db.doctorProfile.findFirst({
        where: { id: doctorProfileId },
        select: { licenseNumber: true },
      });
      licenseNumber = doctor?.licenseNumber || undefined;
    }

    const termsVersion = dto.termsVersion || '2026.1';
    const attestedAt = new Date().toISOString();

    // Compute cryptographic SHA-256 integrity checksum over offer context, version, terms version, clinician ID and statement
    const integrityChecksum = crypto
      .createHash('sha256')
      .update(`${offer.id}:v${offer.version}:terms_${termsVersion}:${doctorProfileId}:${userId}:${dto.statement}:${attestedAt}`)
      .digest('hex');

    const metadata = {
      statement: dto.statement,
      licenseNumber,
      offerVersion: offer.version,
      termsVersion,
      cryptographicAttestationHash: integrityChecksum,
      digitalSignatureHash: integrityChecksum, // Retained as backward-compatible alias
      hashAlgorithm: 'SHA-256',
      attestationType: 'EXPLICIT_PHYSICIAN_INTEGRITY_ATTESTATION',
      attestedBy: userId,
      attestedAt,
    };

    const history = await this.repo.createHistory(
      offer.id,
      'CLINICIAN_ATTESTATION',
      offer.status,
      offer.status,
      userId,
      'DOCTOR',
      dto.statement,
      metadata,
    );

    return {
      id: history.id,
      treatmentOfferId: offer.id,
      statement: dto.statement,
      licenseNumber,
      offerVersion: offer.version,
      termsVersion,
      cryptographicAttestationHash: integrityChecksum,
      digitalSignatureHash: integrityChecksum,
      attestedBy: userId,
      attestedAt,
    };
  }

  async getAttestations(
    userId: string,
    offerId: string,
    roles: string[] = [],
  ): Promise<ClinicianAttestationResponseDto[]> {
    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    const items = await this.repo.findOfferHistoryByAction(offerId, 'CLINICIAN_ATTESTATION');
    return items.map((item) => {
      const m = (item.metadata as any) || {};
      const hash = m.cryptographicAttestationHash || m.digitalSignatureHash || '';
      return {
        id: item.id,
        treatmentOfferId: offer.id,
        statement: m.statement || item.notes || '',
        licenseNumber: m.licenseNumber,
        offerVersion: m.offerVersion,
        termsVersion: m.termsVersion,
        cryptographicAttestationHash: hash,
        digitalSignatureHash: hash,
        attestedBy: item.performedBy,
        attestedAt: m.attestedAt || item.createdAt.toISOString(),
      };
    });
  }

  // ─── 19. Facility Pricing & Discount Approval (Stages 1–6) ────────────────
  async approveDiscount(
    userId: string,
    offerId: string,
    dto: ApproveDiscountDto,
    roles: string[] = [],
  ): Promise<DiscountApprovalResponseDto> {
    if (!this.isAdmin(roles) && !this.isStaff(roles)) {
      throw new ForbiddenException('Only facility supervisors or administrators can approve discounts exceeding threshold');
    }

    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    const doctorProfileId = await this.resolveDoctorProfile(userId).catch(() => null);
    if (doctorProfileId && offer.doctorProfileId === doctorProfileId && !this.isAdmin(roles)) {
      throw new ForbiddenException('Attending physician cannot self-approve a discount exceeding 15%. Supervisor approval is required.');
    }

    const gross = this.toNumber(offer.grossEstimate);
    const discount = this.toNumber(offer.discountAmount);
    const discountPercent = gross > 0 ? Math.round((discount / gross) * 100 * 10) / 10 : 0;

    if (discountPercent > 30) {
      throw new BadRequestException('Cannot approve discount: exceeds platform maximum ceiling of 30%');
    }

    const now = new Date().toISOString();
    const action = dto.approved ? 'DISCOUNT_APPROVED' : 'DISCOUNT_REJECTED';
    const notes = dto.comments || (dto.approved ? 'Supervisor approved discount' : 'Supervisor rejected discount');

    const metadata = {
      approved: dto.approved,
      discountPercent: dto.approvedDiscountPercent || discountPercent,
      approvedBy: userId,
      approvedAt: now,
      comments: notes,
    };

    await this.repo.createHistory(
      offer.id,
      action,
      offer.status,
      offer.status,
      userId,
      roles[0] || 'SUPERVISOR',
      notes,
      metadata,
    );

    return {
      treatmentOfferId: offer.id,
      grossEstimate: gross,
      discountAmount: discount,
      discountPercent,
      requiresSupervisorApproval: discountPercent > 15,
      isApproved: dto.approved,
      approvalStatus: dto.approved ? 'APPROVED' : 'REJECTED',
      approvedBy: userId,
      approvedAt: now,
      comments: notes,
      maxAllowedDiscountPercent: 30,
      supervisorThresholdPercent: 15,
    };
  }

  async getDiscountStatus(
    userId: string,
    offerId: string,
    roles: string[] = [],
  ): Promise<DiscountApprovalResponseDto> {
    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    if (!this.isAdmin(roles) && !this.isStaff(roles)) {
      const isDoctor = roles.some((r) => ['DOCTOR', 'PRACTITIONER'].includes(r.toUpperCase()));
      if (isDoctor) {
        const doctorProfileId = await this.resolveDoctorProfile(userId).catch(() => null);
        if (offer.doctorProfileId !== doctorProfileId) {
          throw new ForbiddenException('You do not have permission to view discount status for this treatment offer');
        }
      }
    }

    const gross = this.toNumber(offer.grossEstimate);
    const discount = this.toNumber(offer.discountAmount);
    const discountPercent = gross > 0 ? Math.round((discount / gross) * 100 * 10) / 10 : 0;
    const requiresSupervisorApproval = discountPercent > 15;

    if (!requiresSupervisorApproval) {
      return {
        treatmentOfferId: offer.id,
        grossEstimate: gross,
        discountAmount: discount,
        discountPercent,
        requiresSupervisorApproval: false,
        isApproved: true,
        approvalStatus: 'NOT_REQUIRED',
        maxAllowedDiscountPercent: 30,
        supervisorThresholdPercent: 15,
      };
    }

    const approvedRecord = await this.repo.findLatestOfferHistoryByAction(offerId, 'DISCOUNT_APPROVED');
    const rejectedRecord = await this.repo.findLatestOfferHistoryByAction(offerId, 'DISCOUNT_REJECTED');

    if (rejectedRecord && (!approvedRecord || new Date(rejectedRecord.createdAt) > new Date(approvedRecord.createdAt))) {
      const m = (rejectedRecord.metadata as any) || {};
      return {
        treatmentOfferId: offer.id,
        grossEstimate: gross,
        discountAmount: discount,
        discountPercent,
        requiresSupervisorApproval: true,
        isApproved: false,
        approvalStatus: 'REJECTED',
        approvedBy: m.approvedBy || rejectedRecord.performedBy,
        approvedAt: m.approvedAt || new Date(rejectedRecord.createdAt).toISOString(),
        comments: m.comments || rejectedRecord.notes,
        maxAllowedDiscountPercent: 30,
        supervisorThresholdPercent: 15,
      };
    }

    if (approvedRecord) {
      const m = (approvedRecord.metadata as any) || {};
      return {
        treatmentOfferId: offer.id,
        grossEstimate: gross,
        discountAmount: discount,
        discountPercent,
        requiresSupervisorApproval: true,
        isApproved: true,
        approvalStatus: 'APPROVED',
        approvedBy: m.approvedBy || approvedRecord.performedBy,
        approvedAt: m.approvedAt || new Date(approvedRecord.createdAt).toISOString(),
        comments: m.comments || approvedRecord.notes,
        maxAllowedDiscountPercent: 30,
        supervisorThresholdPercent: 15,
      };
    }

    return {
      treatmentOfferId: offer.id,
      grossEstimate: gross,
      discountAmount: discount,
      discountPercent,
      requiresSupervisorApproval: true,
      isApproved: false,
      approvalStatus: 'PENDING',
      maxAllowedDiscountPercent: 30,
      supervisorThresholdPercent: 15,
    };
  }

  // ─── 20. Financing Simulation & Binding (Stages 1–6) ──────────────────────
  async getFinancingPreview(
    userId: string,
    offerId: string,
    dto?: FinancingPreviewDto,
  ): Promise<FinancingPreviewResponseDto> {
    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    const netPayable = this.toNumber(offer.netPayable);
    const requestedPartner = dto?.partnerName || 'CareCredit Health';
    const partnerConfig = CONFIGURED_FINANCING_PARTNERS.find(
      (p) => p.partnerName.toLowerCase() === requestedPartner.toLowerCase(),
    );
    if (!partnerConfig) {
      throw new BadRequestException(
        `Financing partner '${requestedPartner}' is not configured. Supported partners: ${CONFIGURED_FINANCING_PARTNERS.map((p) => p.partnerName).join(', ')}`,
      );
    }

    const downPercent = dto?.downPaymentPercent !== undefined ? dto.downPaymentPercent : 10;
    const downPayment = Math.round((netPayable * downPercent) / 100);
    const principal = netPayable - downPayment;
    const rate = dto?.interestRate !== undefined ? dto.interestRate : partnerConfig.interestRate;
    const inputTenures = dto?.tenureMonths
      ? (Array.isArray(dto.tenureMonths) ? dto.tenureMonths.map(Number) : [Number(dto.tenureMonths)])
      : undefined;
    let tenures = inputTenures && inputTenures.length > 0
      ? inputTenures.filter((t) => partnerConfig.supportedTenures.includes(t))
      : partnerConfig.supportedTenures;
    if (tenures.length === 0) {
      tenures = partnerConfig.supportedTenures;
    }

    const monthlyRate = (rate / 100) / 12;

    const options = tenures.map((t) => {
      let monthlyEmi: number;
      if (monthlyRate === 0) {
        monthlyEmi = Math.round(principal / t);
      } else {
        const factor = Math.pow(1 + monthlyRate, t);
        monthlyEmi = Math.round((principal * (monthlyRate * factor)) / (factor - 1));
      }
      const totalPayable = downPayment + (monthlyEmi * t);
      const totalInterest = totalPayable - netPayable;
      return {
        tenureMonths: t,
        interestRate: rate,
        monthlyEmi,
        downPayment,
        totalPayable,
        totalInterest: totalInterest > 0 ? totalInterest : 0,
      };
    });

    const recommended = options.find((o) => o.tenureMonths === 12) || options[0];

    return {
      treatmentOfferId: offer.id,
      partnerName: partnerConfig.partnerName,
      netPayable,
      downPayment,
      principalAmount: principal,
      simulationEstimateOnly: true,
      disclaimer: 'This financing calculation is an estimate for clinical decision support. Final loan approval and interest rates depend on institutional credit evaluation.',
      options,
      recommendedOption: recommended,
    };
  }

  async bindFinancing(
    userId: string,
    offerId: string,
    dto: BindFinancingDto,
  ): Promise<FinancingOfferResponseDto> {
    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    const doctorProfileId = await this.resolveDoctorProfile(userId);
    if (offer.doctorProfileId !== doctorProfileId) {
      throw new ForbiddenException('You can only configure financing packages for your authored treatment offers');
    }

    const partnerConfig = CONFIGURED_FINANCING_PARTNERS.find(
      (p) => p.partnerName.toLowerCase() === dto.partnerName.toLowerCase(),
    );
    if (!partnerConfig) {
      throw new BadRequestException(
        `Financing partner '${dto.partnerName}' is not configured. Supported partners: ${CONFIGURED_FINANCING_PARTNERS.map((p) => p.partnerName).join(', ')}`,
      );
    }

    const tenureMonths = Array.isArray(dto.tenureMonths)
      ? dto.tenureMonths.map(Number)
      : (dto.tenureMonths !== undefined ? [Number(dto.tenureMonths)] : partnerConfig.supportedTenures);

    const invalidTenures = tenureMonths.filter((t) => !partnerConfig.supportedTenures.includes(t));
    if (invalidTenures.length > 0) {
      throw new BadRequestException(
        `Partner '${partnerConfig.partnerName}' does not support tenure(s): [${invalidTenures.join(', ')}]. Supported: [${partnerConfig.supportedTenures.join(', ')}]`,
      );
    }

    const netPayable = this.toNumber(offer.netPayable);
    if (netPayable < partnerConfig.minAmount || netPayable > partnerConfig.maxAmount) {
      throw new BadRequestException(
        `Proposal amount (${netPayable}) is outside partner limits for '${partnerConfig.partnerName}' (min: ${partnerConfig.minAmount}, max: ${partnerConfig.maxAmount})`,
      );
    }

    // Verify patient profile association
    const patient = await this.db.patientProfile.findUnique({
      where: { id: offer.patientProfileId },
      select: { id: true, userId: true },
    });
    if (!patient) {
      throw new NotFoundException(`Associated patient profile '${offer.patientProfileId}' not found`);
    }

    const offerNumber = await this.repo.generateFinancingOfferNumber();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Server-enforced underwriting parameters: do not trust fabricated client approvals
    const requiresExternalUnderwriting = partnerConfig.requiresCreditApproval;
    const initialStatus = requiresExternalUnderwriting ? 'PENDING_UNDERWRITING' : 'AVAILABLE';
    const initialTier = requiresExternalUnderwriting ? 'PENDING_EVALUATION' : 'STANDARD';
    const approvedAmount = Math.min(netPayable, partnerConfig.maxAmount);

    const financingOffer = await this.repo.upsertFinancingOffer(offer.id, {
      offerNumber,
      patientProfileId: offer.patientProfileId,
      partnerName: partnerConfig.partnerName,
      creditTier: initialTier,
      maxApprovedAmount: approvedAmount,
      minDownPayment: dto.minDownPayment !== undefined ? dto.minDownPayment : 0,
      tenureMonths,
      interestRate: partnerConfig.interestRate,
      processingFee: partnerConfig.processingFee,
      status: initialStatus,
      expiresAt,
    });

    // Mark treatment offer financingEligible only if formal underwriting criteria are satisfied
    const isEligible =
      !requiresExternalUnderwriting &&
      netPayable >= partnerConfig.minAmount &&
      netPayable <= partnerConfig.maxAmount;

    await this.db.treatmentOffer.update({
      where: { id: offer.id },
      data: { financingEligible: isEligible },
    });

    return this.mapFinancingOffer(financingOffer);
  }

  async getOfferFinancing(
    userId: string,
    offerId: string,
    roles: string[] = [],
  ): Promise<FinancingOfferResponseDto> {
    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    const financing = await this.repo.findFinancingOfferByTreatmentOfferId(offerId);
    if (!financing) {
      throw new NotFoundException(`No bound financing package found for treatment offer '${offerId}'`);
    }

    return this.mapFinancingOffer(financing);
  }

  // ─── 21. Facility Pricing Rules ───────────────────────────────────────────
  async getFacilityPricingRules(facilityId: string): Promise<FacilityPricingRulesResponseDto> {
    const facility = await this.db.facility.findUnique({
      where: { id: facilityId },
      select: { id: true, name: true },
    });
    if (!facility) {
      throw new NotFoundException(`Facility with ID '${facilityId}' not found`);
    }

    let policyConfig = {
      standardDoctorDiscountThresholdPercent: 15,
      supervisorApprovalRequiredThresholdPercent: 15,
      maxDiscountCeilingPercent: 30,
      allowDoctorDiscretion: true,
      supervisorRoles: ['FACILITY_ADMIN', 'ADMIN', 'SUPER_ADMIN'],
    };

    try {
      const policy = await (this.db as any).cmsPolicy.findFirst({
        where: { policyType: 'DISCOUNT_GOVERNANCE', status: 'PUBLISHED', isDeleted: false },
        orderBy: { updatedAt: 'desc' },
      });
      if (policy?.content) {
        try {
          const parsed = JSON.parse(policy.content);
          policyConfig = { ...policyConfig, ...parsed };
        } catch {}
      }
    } catch {}

    return {
      facilityId: facility.id,
      facilityName: facility.name,
      currency: 'PKR',
      rules: policyConfig,
      effectiveDate: '2026-01-01T00:00:00.000Z',
    };
  }

  // ─── 22. CMS Treatment Terms ──────────────────────────────────────────────
  async getCmsTreatmentTerms(): Promise<any> {
    try {
      const policy = await (this.db as any).cmsPolicy.findFirst({
        where: { policyType: 'TREATMENT_TERMS', status: 'PUBLISHED', isDeleted: false },
        orderBy: { updatedAt: 'desc' },
      });
      if (policy?.content) {
        try {
          const parsed = JSON.parse(policy.content);
          return {
            ...parsed,
            version: policy.version || '2026.1',
            title: policy.title || 'Institutional Treatment Proposal & Clinical Care Terms',
            effectiveDate: policy.effectiveDate?.toISOString() || policy.updatedAt.toISOString(),
            status: 'APPROVED_INSTITUTIONAL_POLICY',
            isApprovedByInstitution: true,
          };
        } catch {
          return {
            version: policy.version || '2026.1',
            title: policy.title,
            content: policy.content,
            effectiveDate: policy.effectiveDate?.toISOString() || policy.updatedAt.toISOString(),
            status: 'APPROVED_INSTITUTIONAL_POLICY',
            isApprovedByInstitution: true,
          };
        }
      }
    } catch {}

    return {
      version: '2026.1',
      title: 'Institutional Treatment Proposal & Clinical Care Terms',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      status: 'SYSTEM_BASELINE_DRAFT',
      isApprovedByInstitution: false,
      sections: [
        {
          id: 'clinical_scope',
          title: 'Scope of Proposed Clinical Care',
          content: 'This treatment proposal represents an itemized estimate based on diagnostic evaluation. Additional intraoperative procedures may be undertaken if medically required.',
        },
        {
          id: 'financial_terms',
          title: 'Financial Responsibilities & Pricing',
          content: 'Estimates are valid until the specified validUntil timestamp. Institutional discounts are subject to supervisor audit. Patient copay or financing obligations remain binding.',
        },
        {
          id: 'cancellation_policy',
          title: 'Procedure Cancellation & Deferral',
          content: 'Elective interventions may be rescheduled or cancelled with clinical justification at least 48 hours prior to scheduled admission.',
        },
        {
          id: 'informed_consent',
          title: 'Informed Consent & Pre-op Clearance',
          content: 'Formal procedure admission requires signed informed consent and completion of all multidisciplinary clearance criteria.',
        },
      ],
    };
  }

  // ─── 23. Notification & SMS Resend (Stage 16) ─────────────────────────────
  async resendOfferNotification(
    userId: string,
    offerId: string,
    dto?: ResendOfferNotificationDto,
    roles: string[] = [],
  ): Promise<ResendNotificationResponseDto> {
    const offer = await this.repo.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    // Authorization: Authoring doctor, facility admin, or system admin
    if (!this.isAdmin(roles) && !this.isStaff(roles)) {
      const doctorProfileId = await this.resolveDoctorProfile(userId);
      if (offer.doctorProfileId !== doctorProfileId) {
        throw new ForbiddenException('You can only resend notifications for your own treatment proposals');
      }
    }

    // Status validation
    if (offer.status === TreatmentOfferStatus.DRAFT) {
      throw new ConflictException('Offer is still in DRAFT state. Must be dispatched before sending reminders.');
    }
    if (['CANCELLED', 'DECLINED'].includes(offer.status)) {
      throw new ConflictException(`Cannot resend notification for offer in terminal '${offer.status}' state`);
    }
    if (new Date(offer.validUntil).getTime() < Date.now()) {
      throw new ConflictException('Treatment proposal has expired. Cannot resend reminder for expired proposals.');
    }

    // Rate-limiting / cooldown: 60 seconds
    const resentHistory = await this.repo.findOfferHistoryByAction(offer.id, 'NOTIFICATION_RESENT');
    if (resentHistory && resentHistory.length > 0) {
      const latest = resentHistory[resentHistory.length - 1];
      const elapsedMs = Date.now() - new Date(latest.createdAt).getTime();
      if (elapsedMs < 60000) {
        const remainingSec = Math.ceil((60000 - elapsedMs) / 1000);
        throw new ConflictException(`Notification dispatch cooldown active. Please wait ${remainingSec} seconds before requesting another reminder.`);
      }
    }

    // Recipient lookup
    const patient = await this.db.patientProfile.findUnique({
      where: { id: offer.patientProfileId },
      include: { user: { select: { phone: true, email: true } } },
    });
    if (!patient || !patient.user?.phone) {
      throw new BadRequestException('Patient does not have a verified contact phone number on file');
    }

    const maskedPhone = `${patient.user.phone.slice(0, 4)}****${patient.user.phone.slice(-2)}`;
    const messageText = dto?.customMessage ||
      `CareID: Reminder from your doctor regarding formal treatment proposal ${offer.offerNumber}. Please review and ratify before ${new Date(offer.validUntil).toLocaleDateString()}.`;

    let smsResult: { success: boolean; messageId: string; provider: string; error?: string } = {
      success: true,
      messageId: `msg_${crypto.randomUUID()}`,
      provider: 'console-sandbox',
    };

    if (this.smsGatewayService) {
      smsResult = await this.smsGatewayService.sendSms(patient.user.phone, messageText);
    }

    const deliveryStatus: 'SENT' | 'FAILED' = smsResult.success ? 'SENT' : 'FAILED';

    // Record in offer history
    await this.repo.createHistory(
      offer.id,
      'NOTIFICATION_RESENT',
      offer.status,
      offer.status,
      userId,
      this.isAdmin(roles) ? 'ADMIN' : this.isStaff(roles) ? 'STAFF' : 'DOCTOR',
      `Notification reminder resent to patient via SMS. Provider: ${smsResult.provider}, MsgId: ${smsResult.messageId}, Status: ${deliveryStatus}`,
      {
        channel: 'SMS',
        provider: smsResult.provider,
        messageId: smsResult.messageId,
        deliveryStatus,
        recipientMasked: maskedPhone,
        dispatchedAt: new Date().toISOString(),
      },
    );

    // In-app notification creation
    try {
      await this.db.notification.create({
        data: {
          recipientUserId: patient.userId,
          title: 'Treatment Proposal Reminder',
          message: messageText,
          notificationType: 'GENERAL' as any,
          priority: 'HIGH' as any,
          channel: 'IN_APP' as any,
          status: 'PENDING' as any,
          metadata: JSON.stringify({
            treatmentOfferId: offer.id,
            offerNumber: offer.offerNumber,
            facilityId: offer.facilityId,
            resendTimestamp: new Date().toISOString(),
          }),
        },
      });
    } catch {
      // Non-blocking
    }

    // Platform audit log
    try {
      await this.db.securityPlatformAuditLog.create({
        data: {
          userId,
          action: 'RESEND_TREATMENT_OFFER_NOTIFICATION',
          resource: 'treatment_offers',
          resourceId: offer.id,
          result: smsResult.success ? 'SUCCESS' : 'FAILURE',
          details: JSON.stringify({
            offerNumber: offer.offerNumber,
            patientProfileId: offer.patientProfileId,
            channel: 'SMS',
            messageId: smsResult.messageId,
            provider: smsResult.provider,
            deliveryStatus,
          }),
        },
      });
    } catch {
      try {
        await (this.db as any).auditLog.create({
          data: {
            userId,
            action: 'RESEND_TREATMENT_OFFER_NOTIFICATION',
            details: `Resent proposal reminder ${offer.offerNumber} to patient phone via ${smsResult.provider}`,
          },
        });
      } catch {}
    }

    return {
      treatmentOfferId: offer.id,
      offerNumber: offer.offerNumber,
      channel: 'SMS',
      recipientMasked: maskedPhone,
      status: deliveryStatus,
      messageId: smsResult.messageId,
      provider: smsResult.provider,
      dispatchedAt: new Date().toISOString(),
      cooldownSeconds: 60,
    };
  }
}
