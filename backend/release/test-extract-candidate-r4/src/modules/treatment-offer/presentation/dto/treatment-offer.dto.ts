import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MinLength,
  Equals,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TreatmentOfferStatus, ProcedureCategory } from '@prisma/client';

export { TreatmentOfferStatus, ProcedureCategory };

export class CreateProcedureItemDto {
  @ApiProperty({ description: 'Clinical procedure code (e.g., PCI-001, CATH-002)' })
  @IsString()
  @IsNotEmpty()
  procedureCode!: string;

  @ApiProperty({ description: 'Descriptive procedure name' })
  @IsString()
  @IsNotEmpty()
  procedureName!: string;

  @ApiPropertyOptional({ enum: ProcedureCategory, default: ProcedureCategory.SURGICAL })
  @IsEnum(ProcedureCategory)
  @IsOptional()
  category?: ProcedureCategory;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiProperty({ description: 'Unit cost in PKR/standard currency' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost!: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isOptional?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clinicalJustification?: string;
}

export class CreateTreatmentOfferDto {
  @ApiProperty({ description: 'Target Patient Profile UUID' })
  @IsUUID()
  patientProfileId!: string;

  @ApiProperty({ description: 'Operating Facility UUID' })
  @IsUUID()
  facilityId!: string;

  @ApiPropertyOptional({ description: 'Originating Medical Encounter UUID' })
  @IsUUID()
  @IsOptional()
  encounterId?: string;

  @ApiProperty({ description: 'Clinical diagnosis and indication for proposed care' })
  @IsString()
  @IsNotEmpty()
  clinicalIndication!: string;

  @ApiProperty({ type: [CreateProcedureItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProcedureItemDto)
  procedures!: CreateProcedureItemDto[];

  @ApiPropertyOptional({ default: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  discountAmount?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  financingEligible?: boolean;

  @ApiPropertyOptional({ description: 'Recommended tenure in months if financed' })
  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  recommendedTenureMonths?: number;

  @ApiProperty({ description: 'ISO date string until when offer is valid' })
  @IsDateString()
  validUntil!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clinicalNotes?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  termsAndConditions?: string;
}

export class UpdateTreatmentOfferDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clinicalIndication?: string;

  @ApiPropertyOptional({ type: [CreateProcedureItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProcedureItemDto)
  @IsOptional()
  procedures?: CreateProcedureItemDto[];

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  discountAmount?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  financingEligible?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  recommendedTenureMonths?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clinicalNotes?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @ApiPropertyOptional({ description: 'Expected version for optimistic concurrency' })
  @IsInt()
  @IsOptional()
  expectedVersion?: number;
}

export class DispatchTreatmentOfferDto {
  @ApiPropertyOptional({ description: 'Expected version for optimistic concurrency' })
  @IsInt()
  @IsOptional()
  expectedVersion?: number;

  @ApiPropertyOptional({ description: 'Optional inline clinician attestation confirming medical appropriateness' })
  @IsString()
  @IsOptional()
  attestationStatement?: string;
}

export class CancelTreatmentOfferDto {
  @ApiProperty({ description: 'Mandatory clinical rationale for cancelling proposal' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  cancellationReason!: string;

  @ApiPropertyOptional({ description: 'Expected version for optimistic concurrency' })
  @IsInt()
  @IsOptional()
  expectedVersion?: number;
}

export class AcceptTreatmentOfferDto {
  @ApiProperty({ description: 'Mandatory legal informed consent ratification', example: true })
  @IsBoolean()
  @Equals(true, { message: 'Informed consent acceptance is mandatory to ratify treatment' })
  signatureConsent!: boolean;

  @ApiPropertyOptional({ description: 'Patient acceptance note or instructions' })
  @IsString()
  @IsOptional()
  patientResponseNotes?: string;

  @ApiPropertyOptional({ description: 'Expected version for optimistic concurrency' })
  @IsInt()
  @IsOptional()
  expectedVersion?: number;
}

export class RejectTreatmentOfferDto {
  @ApiProperty({ description: 'Patient decline rationale', example: 'Seeking second opinion' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  declineReason!: string;

  @ApiPropertyOptional({ description: 'Expected version for optimistic concurrency' })
  @IsInt()
  @IsOptional()
  expectedVersion?: number;
}

export class TreatmentOfferQueryDto {
  @ApiPropertyOptional({ enum: TreatmentOfferStatus })
  @IsEnum(TreatmentOfferStatus)
  @IsOptional()
  status?: TreatmentOfferStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  patientId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}

// ─── Response DTOs ─────────────────────────────────────────────────────────

export class ProcedureResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id!: string;

  @ApiProperty({ example: 'PCI-STENT-001' })
  procedureCode!: string;

  @ApiProperty({ example: 'Percutaneous Coronary Intervention with Drug-Eluting Stent' })
  procedureName!: string;

  @ApiProperty({ example: 'SURGICAL', enum: ['SURGICAL', 'DIAGNOSTIC', 'ANESTHESIA', 'ROOM_SUITE', 'MEDICATION', 'DEVICE_IMPLANT', 'OTHER'] })
  category!: string;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: 125000 })
  unitCost!: number;

  @ApiProperty({ example: 125000 })
  totalCost!: number;

  @ApiProperty({ example: false })
  isOptional!: boolean;

  @ApiProperty({ example: 0 })
  sequenceOrder!: number;

  @ApiPropertyOptional({ example: 'Primary lesion in LAD' })
  clinicalJustification?: string;
}

export class OfferHistoryItemDto {
  @ApiProperty({ example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22' })
  id!: string;

  @ApiPropertyOptional({ example: 'DRAFT', enum: TreatmentOfferStatus })
  previousStatus?: string;

  @ApiProperty({ example: 'DISPATCHED', enum: TreatmentOfferStatus })
  newStatus!: string;

  @ApiProperty({ example: 'DISPATCHED_TO_PATIENT' })
  action!: string;

  @ApiProperty({ example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33' })
  performedBy!: string;

  @ApiPropertyOptional({ example: 'DOCTOR' })
  performerRole?: string;

  @ApiPropertyOptional({ example: 'Offer finalized and dispatched to patient' })
  notes?: string;

  @ApiProperty({ example: '2026-11-06T12:00:00.000Z' })
  createdAt!: string;
}

export class TreatmentOfferSummaryDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id!: string;

  @ApiProperty({ example: 'TO-2026-00001' })
  offerNumber!: string;

  @ApiProperty({ example: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44' })
  doctorProfileId!: string;

  @ApiPropertyOptional({ example: 'Dr. Sarah Jenkins' })
  doctorName?: string;

  @ApiProperty({ example: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55' })
  patientProfileId!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  patientName?: string;

  @ApiProperty({ example: 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66' })
  facilityId!: string;

  @ApiPropertyOptional({ example: 'Metro General Hospital' })
  facilityName?: string;

  @ApiProperty({ example: 'Severe coronary artery disease requiring PCI stenting' })
  clinicalIndication!: string;

  @ApiProperty({ example: 300000 })
  grossEstimate!: number;

  @ApiProperty({ example: 25000 })
  discountAmount!: number;

  @ApiPropertyOptional({ example: 8.3, description: 'Calculated discount percentage based on grossEstimate and discountAmount' })
  discountPercent?: number;

  @ApiProperty({ example: 275000 })
  netPayable!: number;

  @ApiProperty({ example: 'PKR' })
  currency!: string;

  @ApiProperty({ example: true })
  financingEligible!: boolean;

  @ApiPropertyOptional({ example: 12 })
  recommendedTenureMonths?: number;

  @ApiProperty({ enum: TreatmentOfferStatus, example: TreatmentOfferStatus.DISPATCHED })
  status!: TreatmentOfferStatus;

  @ApiProperty({ example: '2026-12-31T23:59:59.000Z' })
  validUntil!: string;

  @ApiPropertyOptional({ example: '2026-11-06T12:00:00.000Z' })
  dispatchedAt?: string;

  @ApiPropertyOptional({ example: '2026-11-06T12:05:00.000Z' })
  patientViewedAt?: string;

  @ApiPropertyOptional({ example: '2026-11-06T12:10:00.000Z' })
  patientRespondedAt?: string;

  @ApiPropertyOptional({ example: 'Patient clinical condition changed' })
  cancellationReason?: string;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ example: '2026-11-06T11:55:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-11-06T12:00:00.000Z' })
  updatedAt!: string;
}

export class TreatmentOfferDetailDto extends TreatmentOfferSummaryDto {
  @ApiPropertyOptional({ example: 'encounter-uuid-001' })
  encounterId?: string;

  @ApiPropertyOptional({ example: 'Patient assessed as stable for elective intervention.' })
  clinicalNotes?: string;

  @ApiPropertyOptional({ example: 'Package includes 2 nights stay in standard room suite.' })
  termsAndConditions?: string;

  @ApiPropertyOptional({ example: 'Patient ratified proposal with informed consent.' })
  patientResponseNotes?: string;

  @ApiProperty({ type: [ProcedureResponseDto] })
  procedures!: ProcedureResponseDto[];

  @ApiProperty({ type: [OfferHistoryItemDto] })
  history!: OfferHistoryItemDto[];
}

export class TreatmentOfferStatusResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id!: string;

  @ApiProperty({ example: 'TO-2026-00001' })
  offerNumber!: string;

  @ApiProperty({ enum: TreatmentOfferStatus, example: TreatmentOfferStatus.DISPATCHED })
  status!: TreatmentOfferStatus;

  @ApiProperty({ example: false })
  isExpired!: boolean;

  @ApiProperty({ example: '2026-12-31T23:59:59.000Z' })
  validUntil!: string;

  @ApiPropertyOptional({ example: '2026-11-06T12:00:00.000Z' })
  dispatchedAt?: string;

  @ApiPropertyOptional({ example: '2026-11-06T12:05:00.000Z' })
  patientViewedAt?: string;

  @ApiPropertyOptional({ example: '2026-11-06T12:10:00.000Z' })
  patientRespondedAt?: string;

  @ApiPropertyOptional({ example: 'Accepted with informed consent' })
  patientResponseNotes?: string;

  @ApiPropertyOptional({ example: 'Elective procedure deferred' })
  cancellationReason?: string;

  @ApiProperty({ example: 1 })
  version!: number;
}

export class FinancingOfferResponseDto {
  @ApiProperty({ example: 'fo-uuid-001' })
  id!: string;

  @ApiProperty({ example: 'FO-2026-00001' })
  offerNumber!: string;

  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  treatmentOfferId!: string;

  @ApiPropertyOptional({ example: 'TO-2026-00001' })
  treatmentOfferNumber?: string;

  @ApiProperty({ example: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55' })
  patientProfileId!: string;

  @ApiProperty({ example: 'CareCredit Health' })
  partnerName!: string;

  @ApiPropertyOptional({ example: 'TIER_1' })
  creditTier?: string;

  @ApiProperty({ example: 250000 })
  maxApprovedAmount!: number;

  @ApiProperty({ example: 25000 })
  minDownPayment!: number;

  @ApiProperty({ type: [Number], example: [6, 12, 18, 24] })
  tenureMonths!: number[];

  @ApiProperty({ example: 8.5 })
  interestRate!: number;

  @ApiProperty({ example: 1500 })
  processingFee!: number;

  @ApiProperty({ example: 'AVAILABLE' })
  status!: string;

  @ApiProperty({ example: '2026-12-31T23:59:59.000Z' })
  expiresAt!: string;

  @ApiPropertyOptional({ example: 21500 })
  monthlyEstimatedEmi?: number;

  @ApiProperty({ example: '2026-11-06T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-11-06T12:00:00.000Z' })
  updatedAt!: string;
}

// ─── STAGE 1–6 CLINICAL LIFECYCLE DTOs ──────────────────────────────────────────

export enum ClinicalReviewAction {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NEEDS_INFORMATION = 'NEEDS_INFORMATION',
}

export class SubmitClinicalReviewDto {
  @ApiProperty({ enum: ClinicalReviewAction, example: ClinicalReviewAction.APPROVED })
  @IsEnum(ClinicalReviewAction)
  @IsNotEmpty()
  action!: ClinicalReviewAction;

  @ApiProperty({ example: 'All clinical indications verified and procedures appropriate' })
  @IsString()
  @IsNotEmpty()
  comments!: string;

  @ApiPropertyOptional({ example: ['medicalNecessityVerified', 'contraindicationsScreened'] })
  @IsArray()
  @IsOptional()
  reviewCriteria?: string[];
}

export class ClinicalReviewResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  treatmentOfferId!: string;

  @ApiProperty({ enum: ClinicalReviewAction, example: ClinicalReviewAction.APPROVED })
  status!: ClinicalReviewAction;

  @ApiProperty({ example: 'All clinical indications verified' })
  comments!: string;

  @ApiPropertyOptional({ example: ['medicalNecessityVerified'] })
  reviewCriteria?: string[];

  @ApiProperty({ example: 'doc-user-uuid' })
  reviewedBy!: string;

  @ApiPropertyOptional({ example: 'DOCTOR' })
  reviewerRole?: string;

  @ApiProperty({ example: '2026-11-12T10:00:00.000Z' })
  reviewedAt!: string;
}

export class SubmitClinicianAttestationDto {
  @ApiProperty({ example: 'I attest that the proposed procedures are clinically appropriate and medically necessary.' })
  @IsString()
  @IsNotEmpty()
  statement!: string;

  @ApiPropertyOptional({ example: 'MD-98765-PK' })
  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @ApiPropertyOptional({ example: '2026.1', description: 'Institutional terms and conditions template version' })
  @IsString()
  @IsOptional()
  termsVersion?: string;

  @ApiPropertyOptional({ example: 'd41d8cd98f00b204e9800998ecf8427e', description: 'Client verification hash' })
  @IsString()
  @IsOptional()
  digitalSignatureHash?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  confirmTruthfulness!: boolean;
}

export class ClinicianAttestationResponseDto {
  @ApiProperty({ example: 'attestation-uuid' })
  id!: string;

  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  treatmentOfferId!: string;

  @ApiProperty({ example: 'I attest that the proposed procedures are clinically appropriate and medically necessary.' })
  statement!: string;

  @ApiPropertyOptional({ example: 'MD-98765-PK' })
  licenseNumber?: string;

  @ApiPropertyOptional({ example: 1, description: 'Version of the treatment offer when attested' })
  offerVersion?: number;

  @ApiPropertyOptional({ example: '2026.1', description: 'Version of the institutional treatment terms' })
  termsVersion?: string;

  @ApiProperty({ example: '3f5b8c...', description: 'SHA-256 cryptographic attestation integrity checksum digest' })
  cryptographicAttestationHash?: string;

  @ApiProperty({ example: '3f5b8c...', description: 'Cryptographic attestation checksum (legacy property alias)' })
  digitalSignatureHash!: string;

  @ApiProperty({ example: 'doc-user-uuid' })
  attestedBy!: string;

  @ApiProperty({ example: '2026-11-12T10:00:00.000Z' })
  attestedAt!: string;
}

export class FinancingPreviewDto {
  @ApiPropertyOptional({ example: 'CareCredit Health' })
  @IsString()
  @IsOptional()
  partnerName?: string;

  @ApiPropertyOptional({ type: [Number], example: [6, 12, 18, 24, 36] })
  @IsArray()
  @IsOptional()
  tenureMonths?: number[];

  @ApiPropertyOptional({ example: 8.5 })
  @IsNumber()
  @IsOptional()
  interestRate?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  downPaymentPercent?: number;
}

export class FinancingPreviewOptionDto {
  @ApiProperty({ example: 12 })
  tenureMonths!: number;

  @ApiProperty({ example: 8.5 })
  interestRate!: number;

  @ApiProperty({ example: 21500 })
  monthlyEmi!: number;

  @ApiProperty({ example: 25000 })
  downPayment!: number;

  @ApiProperty({ example: 258000 })
  totalPayable!: number;

  @ApiProperty({ example: 8000 })
  totalInterest!: number;
}

export class FinancingPreviewResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  treatmentOfferId!: string;

  @ApiProperty({ example: 'CareCredit Health' })
  partnerName!: string;

  @ApiProperty({ example: 250000 })
  netPayable!: number;

  @ApiProperty({ example: 25000 })
  downPayment!: number;

  @ApiProperty({ example: 225000 })
  principalAmount!: number;

  @ApiProperty({ example: true })
  simulationEstimateOnly!: boolean;

  @ApiPropertyOptional({ example: 'This financing calculation is an estimate for clinical decision support. Final loan approval and interest rates depend on institutional credit evaluation.' })
  disclaimer?: string;

  @ApiProperty({ type: [FinancingPreviewOptionDto] })
  options!: FinancingPreviewOptionDto[];

  @ApiPropertyOptional({ type: FinancingPreviewOptionDto })
  recommendedOption?: FinancingPreviewOptionDto;
}

export class BindFinancingDto {
  @ApiProperty({ example: 'CareCredit Health' })
  @IsString()
  @IsNotEmpty()
  partnerName!: string;

  @ApiProperty({ type: [Number], example: [6, 12, 18, 24] })
  @IsArray()
  @IsNotEmpty()
  tenureMonths!: number[];

  @ApiProperty({ example: 8.5 })
  @IsNumber()
  @Min(0)
  interestRate!: number;

  @ApiPropertyOptional({ example: 25000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minDownPayment?: number;

  @ApiPropertyOptional({ example: 250000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxApprovedAmount?: number;

  @ApiPropertyOptional({ example: 1500 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  processingFee?: number;

  @ApiPropertyOptional({ example: 'TIER_1' })
  @IsString()
  @IsOptional()
  creditTier?: string;
}

export class ApproveDiscountDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  approved!: boolean;

  @ApiPropertyOptional({ example: 'Approved as per institutional indigent care policy' })
  @IsString()
  @IsOptional()
  comments?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsNumber()
  @Min(0)
  @Max(30)
  @IsOptional()
  approvedDiscountPercent?: number;
}

export class DiscountApprovalResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  treatmentOfferId!: string;

  @ApiProperty({ example: 250000 })
  grossEstimate!: number;

  @ApiProperty({ example: 50000 })
  discountAmount!: number;

  @ApiProperty({ example: 20 })
  discountPercent!: number;

  @ApiProperty({ example: true })
  requiresSupervisorApproval!: boolean;

  @ApiProperty({ example: true })
  isApproved!: boolean;

  @ApiProperty({ example: 'APPROVED' })
  approvalStatus!: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ example: 'supervisor-user-uuid' })
  approvedBy?: string;

  @ApiPropertyOptional({ example: '2026-11-12T10:00:00.000Z' })
  approvedAt?: string;

  @ApiPropertyOptional({ example: 'Approved under indigent subsidy policy' })
  comments?: string;

  @ApiProperty({ example: 30 })
  maxAllowedDiscountPercent!: number;

  @ApiProperty({ example: 15 })
  supervisorThresholdPercent!: number;
}

export class FacilityPricingRulesDto {
  @ApiProperty({ example: 15 })
  standardDoctorDiscountThresholdPercent!: number;

  @ApiProperty({ example: 15 })
  supervisorApprovalRequiredThresholdPercent!: number;

  @ApiProperty({ example: 30 })
  maxDiscountCeilingPercent!: number;

  @ApiProperty({ example: true })
  allowDoctorDiscretion!: boolean;

  @ApiProperty({ type: [String], example: ['FACILITY_ADMIN', 'ADMIN', 'SUPER_ADMIN'] })
  supervisorRoles!: string[];
}

export class FacilityPricingRulesResponseDto {
  @ApiProperty({ example: 'fac-uuid' })
  facilityId!: string;

  @ApiProperty({ example: 'National Hospital' })
  facilityName!: string;

  @ApiProperty({ example: 'PKR' })
  currency!: string;

  @ApiProperty({ type: FacilityPricingRulesDto })
  rules!: FacilityPricingRulesDto;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  effectiveDate!: string;
}

// ─── STAGE 16 NOTIFICATION & SMS RESEND DTOs ──────────────────────────────────

export class ResendOfferNotificationDto {
  @ApiPropertyOptional({ example: 'SMS', enum: ['SMS', 'EMAIL', 'ALL'], default: 'SMS' })
  @IsString()
  @IsOptional()
  channel?: 'SMS' | 'EMAIL' | 'ALL';

  @ApiPropertyOptional({ example: 'Reminder: Your care proposal expires soon. Please review.' })
  @IsString()
  @IsOptional()
  customMessage?: string;
}

export class ResendNotificationResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  treatmentOfferId!: string;

  @ApiProperty({ example: 'TO-2026-00001' })
  offerNumber!: string;

  @ApiProperty({ example: 'SMS' })
  channel!: string;

  @ApiProperty({ example: '+165****03' })
  recipientMasked!: string;

  @ApiProperty({ example: 'SENT', enum: ['QUEUED', 'SENT', 'DELIVERED', 'FAILED'] })
  status!: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED';

  @ApiPropertyOptional({ example: 'msg_98a72b01-...' })
  messageId?: string;

  @ApiPropertyOptional({ example: 'console-sandbox' })
  provider?: string;

  @ApiProperty({ example: '2026-11-12T12:00:00.000Z' })
  dispatchedAt!: string;

  @ApiProperty({ example: 60 })
  cooldownSeconds!: number;
}


