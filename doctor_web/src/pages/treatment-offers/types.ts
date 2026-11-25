/**
 * CareID Doctor Web - Treatment Offers & Financing Types
 * Authoritative API Contract: CareID-Staging.postman_collection.json
 * - 05. Doctor Portal (Treatment proposals, draft management, dispatch, status, cancellation)
 * - 06. Patient App (Patient view, ratification/acceptance, decline)
 * - 27. Healthcare Financing & Assistance (Options, pre-approved offers, applications)
 */

import { calculateAge } from '@/services/patientService';
import { extractCleanClinicalIndication } from '@/utils/clinicalDataSanitizer';

// ============================================================================
// 1. Authoritative Backend DTOs (Postman 05 & 06)
// ============================================================================

export type TreatmentOfferStatus =
  | 'DRAFT'
  | 'DISPATCHED'
  | 'PATIENT_REVIEWING'
  | 'RATIFIED_ACCEPTED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED';

export type ProcedureCategory =
  | 'SURGICAL'
  | 'DIAGNOSTIC'
  | 'THERAPEUTIC'
  | string;

export interface TreatmentOfferProcedureDTO {
  id?: string;
  procedureCode: string;
  procedureName: string;
  category: ProcedureCategory;
  quantity: number;
  unitCost: number;
  totalCost?: number;
  isOptional: boolean;
  sequenceOrder?: number;
  clinicalJustification: string;
}

export interface TreatmentOfferHistoryItemDTO {
  id: string;
  newStatus: TreatmentOfferStatus | string;
  action: string;
  performedBy: string;
  createdAt: string;
  previousStatus?: TreatmentOfferStatus | string;
  performerRole?: string;
  notes?: string;
}

export interface TreatmentOfferDTO {
  id: string;
  offerNumber: string;
  doctorProfileId: string;
  patientProfileId: string;
  facilityId: string;
  clinicalIndication: string;
  grossEstimate: number;
  discountAmount: number;
  netPayable: number;
  currency: string;
  financingEligible: boolean;
  status: TreatmentOfferStatus;
  validUntil: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  recommendedTenureMonths?: number;
  dispatchedAt?: string;
  patientViewedAt?: string;
  patientRespondedAt?: string;
  patientResponseNotes?: string;
  cancellationReason?: string;
  encounterId?: string;
  clinicalNotes?: string;
  termsAndConditions?: string;
  doctorName?: string;
  patientName?: string;
  facilityName?: string;
  procedures: TreatmentOfferProcedureDTO[];
  history?: TreatmentOfferHistoryItemDTO[];
}

export interface CreateTreatmentOfferPayload {
  patientProfileId: string;
  facilityId: string;
  clinicalIndication: string;
  procedures: Array<{
    procedureCode: string;
    procedureName: string;
    unitCost: number;
    category: ProcedureCategory;
    quantity: number;
    isOptional: boolean;
    clinicalJustification: string;
  }>;
  validUntil: string; // ISO 8601 string
  encounterId?: string;
  discountAmount: number;
  financingEligible: boolean;
  recommendedTenureMonths: number;
  clinicalNotes: string;
  termsAndConditions: string;
}

export interface UpdateTreatmentOfferPayload {
  clinicalIndication?: string;
  procedures?: Array<{
    procedureCode: string;
    procedureName: string;
    unitCost: number;
    category: ProcedureCategory;
    quantity: number;
    isOptional: boolean;
    clinicalJustification: string;
  }>;
  discountAmount?: number;
  financingEligible?: boolean;
  recommendedTenureMonths?: number;
  validUntil?: string;
  clinicalNotes?: string;
  termsAndConditions?: string;
  expectedVersion: number;
}

export interface TreatmentOfferStatusResponse {
  id: string;
  offerNumber: string;
  status: TreatmentOfferStatus | string;
  isExpired: boolean;
  validUntil: string;
  version: number;
  dispatchedAt?: string;
  patientViewedAt?: string;
  patientRespondedAt?: string;
  patientResponseNotes?: string;
  cancellationReason?: string;
}

export interface TreatmentOfferCancelPayload {
  cancellationReason: string;
  expectedVersion: number;
}

export interface TreatmentOfferDeclinePayload {
  declineReason: string;
  expectedVersion: number;
}

export interface TreatmentOfferListParams {
  status?: TreatmentOfferStatus | string;
  patientId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// 2. Authoritative Financing DTOs (Postman 27)
// ============================================================================

export interface FinancingOptionDTO {
  id: string;
  partnerName: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  tenureMonths: number[];
  interestRate: number;
  processingFee: number;
  features: string[];
  isDemonstrationCatalog?: boolean;
  disclaimer?: string;
}

export interface FinancingApplicationPayload {
  optionId: string;
  facilityId?: string;
  treatmentName: string;
  requestedAmount: number;
  tenureMonths: number;
  monthlyIncome: number;
  employmentType: 'SALARIED' | 'SELF_EMPLOYED' | 'BUSINESS' | string;
  panOrNationalId: string;
  notes?: string;
}

export interface FinancingApplicationResponse {
  id: string;
  applicationNumber: string;
  userId: string;
  optionId: string;
  partnerName: string;
  treatmentName: string;
  requestedAmount: number;
  tenureMonths: number;
  monthlyEstimatedEmi: number;
  status: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  isDemonstrationStorage?: boolean;
  storageNotice?: string;
}

// ============================================================================
// 3. Common Pagination & Consultation Models
// ============================================================================

export interface PaginationMeta {
  totalItems: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ConsultationItem {
  id: string;
  appointmentId?: string;
  offerId?: string;
  patientProfileId: string;
  patientName: string;
  patientMrn: string;
  patientGender?: string;
  patientPhone?: string;
  patientAge?: string;
  facilityName: string;
  doctorName: string;
  doctorSpecialty?: string;
  appointmentDate: string;
  appointmentTime?: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  offerStatus?: TreatmentOfferStatus | 'SCHEDULED' | 'PROCEDURE_READY' | 'COMPLETED' | string;
  cptCode?: string;
  procedureName?: string;
  title: string;
  chiefComplaint?: string;
  clinicalNotes?: string;
  treatmentPlan?: string;
  totalCost?: number;
  netPayable?: number;
  createdAt?: string;
}

// ============================================================================
// 4. Legacy UI Form States & Deprecated Bridge Defaults (Milestones 2–4 Transition)
// ============================================================================

export interface ProceduralSlot {
  id: string;
  timeWindow: string;
  durationMinutes: number;
  suiteName: string;
  suiteNumber: number;
  status: 'available' | 'selected' | 'booked' | 'conflict' | 'maintenance';
  attendingName?: string;
  procedureType?: string;
  checkInTime?: string;
  holdExpiresMinutes?: number;
  tags?: string[];
}

export interface FinancingPackageOption {
  id: string;
  name: string;
  partnerTag: string;
  badge: string;
  termMonths: number;
  termMonthsDisplay: string;
  apr: number;
  aprDisplay: string;
  calculateMonthly: (net: number) => number;
  calculateTotal: (net: number) => number;
  enrollmentFee: string;
  penaltyFee: string;
  availableCredit: string;
}

export interface TreatmentOfferState {
  patientId: string;
  patientName: string;
  patientCid: string;
  patientAge: string;
  patientGender: string;
  patientBlood: string;
  patientAllergy: string;
  insuranceStatus: string;
  referralId: string;
  patientDob?: string;

  // Procedure
  cptCode: string;
  procedureName: string;
  department: string;
  facility: string;
  clinicalNecessity: string;
  baselineFee: number;

  // Discount
  discountEnabled: boolean;
  discountMode: 'percentage' | 'fixed';
  discountValue: number;
  calculatedDiscount: number;
  netProcedureCost: number;

  // Financing
  financingPackageId: string;
  financingPackageName: string;
  monthlyInstallment: string;
  termMonths: number;
  apr: string;
  totalPayable: string;

  // Terms & Remarks
  offerTitle: string;
  expirationDate: string;
  validUntil?: string;
  clinicalHoldDays: number;
  doctorNotes: string;
  termsAndConditions?: string;
  complianceConfirmed: boolean;
  clinicianAttested: boolean;

  // Meta
  offerId: string;
  offerNumber?: string;
  doctorProfileId?: string;
  attendingDoctorId?: string;
  status?: TreatmentOfferStatus;
  version?: number;
  currency?: string;
  facilityId?: string;
  appointmentId?: string;
  dispatchedAt?: string;
  attendingDoctor: string;
  doctorSpecialty: string;
  auditHash: string;
  history?: TreatmentOfferHistoryItemDTO[];
}

export interface AppointmentRecord {
  appointmentId: string;
  offerId: string;
  patientId: string;
  patientName: string;
  procedureName: string;
  cptCode: string;
  facility: string;
  facilityAddress: string;
  suite: string;
  scheduledDate: string;
  scheduledTime: string;
  arrivalWindow: string;
  attendingDoctor: string;
  attendingLicense: string;
  anesthesiaProtocol: string;
  anesthesiaStaff: string;
  underwrittenAmount: string;
  financingPlan: string;
  lockedTimestamp: string;
  auditHash: string;
  readinessPercentage: number;
}

/**
 * Helper to convert backend FinancingOptionDTO to UI FinancingPackageOption
 */
export function financingDtoToPackageOption(dto: FinancingOptionDTO): FinancingPackageOption {
  const preferredTenure = Array.isArray(dto.tenureMonths) && dto.tenureMonths.length > 0
    ? dto.tenureMonths[dto.tenureMonths.length - 1]
    : 12;
  const apr = typeof dto.interestRate === 'number' ? dto.interestRate : 0;
  const processingFee = typeof dto.processingFee === 'number' ? dto.processingFee : 0;

  const calculateMonthly = (net: number): number => {
    if (net <= 0) return 0;
    if (apr === 0) {
      return Number((net / preferredTenure).toFixed(2));
    }
    const r = (apr / 100) / 12;
    const emi = (net * r * Math.pow(1 + r, preferredTenure)) / (Math.pow(1 + r, preferredTenure) - 1);
    return Number(emi.toFixed(2));
  };

  const calculateTotal = (net: number): number => {
    if (net <= 0) return 0;
    const monthly = calculateMonthly(net);
    return Number((monthly * preferredTenure + processingFee).toFixed(2));
  };

  return {
    id: dto.id,
    name: dto.name,
    partnerTag: (dto.partnerName || 'CareID Partner').toUpperCase(),
    badge: apr === 0 ? '0% APR (Pre-Qualified)' : `${apr}% Fixed APR`,
    termMonths: preferredTenure,
    termMonthsDisplay: `${preferredTenure} Months Term`,
    apr,
    aprDisplay: apr === 0 ? '0.0% APR Fixed Rate' : `${apr}% Fixed APR`,
    calculateMonthly,
    calculateTotal,
    enrollmentFee: processingFee === 0 ? '$0 Enrollment Fee' : `$${processingFee} Processing Fee`,
    penaltyFee: 'No Early Payoff Penalty',
    availableCredit: dto.maxAmount ? `Up to $${dto.maxAmount.toLocaleString('en-US')}` : 'Credit subject to approval',
  };
}

/**
 * Prompt Full Cash Payment Option
 */
export const PROMPT_CASH_OPTION: FinancingPackageOption = {
  id: 'prompt-cash',
  name: 'No Financing / Prompt Full Cash Payment',
  partnerTag: 'SELF-PAY DIRECT',
  badge: 'Full Settlement',
  termMonths: 1,
  termMonthsDisplay: 'Single Settlement Payment at Intake',
  apr: 0.0,
  aprDisplay: '0.0% APR',
  calculateMonthly: (net: number) => net,
  calculateTotal: (net: number) => net,
  enrollmentFee: '$0 Fee',
  penaltyFee: 'None',
  availableCredit: 'N/A',
};

/**
 * Transforms an authentic TreatmentOfferDTO from the backend into the UI TreatmentOfferState model.
 */
export function dtoToOfferState(dto: TreatmentOfferDTO): TreatmentOfferState {
  const primaryProcedure = dto.procedures?.[0];
  const net = dto.netPayable ?? Math.max((dto.grossEstimate || 0) - (dto.discountAmount || 0), 0);
  const tenure = dto.recommendedTenureMonths || 1;
  const monthly = tenure > 0 ? (net / tenure).toFixed(2) : net.toFixed(2);
  const isDispatchedOrBeyond = dto.status !== 'DRAFT';

  return {
    patientId: dto.patientProfileId || '',
    patientName: dto.patientName || '',
    patientCid: '',
    patientAge: '',
    patientGender: '',
    patientBlood: '',
    patientAllergy: '',
    insuranceStatus: '',
    referralId: '',
    cptCode: primaryProcedure?.procedureCode || '',
    procedureName: primaryProcedure?.procedureName || '',
    department: '',
    facility: dto.facilityName || '',
    facilityId: dto.facilityId,
    clinicalNecessity: extractCleanClinicalIndication(dto.clinicalIndication, primaryProcedure?.procedureName),
    baselineFee: dto.grossEstimate || 0,
    discountEnabled: (dto.discountAmount || 0) > 0,
    discountMode: 'fixed',
    discountValue: dto.discountAmount || 0,
    calculatedDiscount: dto.discountAmount || 0,
    netProcedureCost: net,
    financingPackageId: dto.financingEligible ? '' : 'prompt-cash',
    financingPackageName: dto.financingEligible
      ? `Healthcare Financing (${tenure} Months)`
      : PROMPT_CASH_OPTION.name,
    monthlyInstallment: `$${monthly}`,
    termMonths: tenure,
    apr: '',
    totalPayable: `$${net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    offerTitle: dto.offerNumber || '',
    expirationDate: dto.validUntil ? new Date(dto.validUntil).toLocaleDateString() : '',
    validUntil: dto.validUntil,
    clinicalHoldDays: 14,
    doctorNotes: dto.clinicalNotes || '',
    termsAndConditions: dto.termsAndConditions || '',
    complianceConfirmed: isDispatchedOrBeyond,
    clinicianAttested: isDispatchedOrBeyond,
    offerId: dto.id || '',
    offerNumber: dto.offerNumber,
    doctorProfileId: dto.doctorProfileId,
    attendingDoctorId: dto.doctorProfileId,
    status: dto.status,
    version: dto.version,
    currency: dto.currency,
    dispatchedAt: dto.dispatchedAt ? new Date(dto.dispatchedAt).toLocaleString() : undefined,
    attendingDoctor: dto.doctorName || '',
    doctorSpecialty: '',
    auditHash: dto.offerNumber || dto.id || '',
    history: dto.history,
  };
}

/**
 * Enriches a TreatmentOfferState object with authentic patient profile demographics.
 */
export function enrichOfferStateWithPatient(
  state: TreatmentOfferState,
  p: {
    fullName: string;
    patientNumber?: string;
    mrn?: string;
    gender?: string | null;
    bloodGroup?: string | null;
    dateOfBirth?: string | null;
    knownAllergies?: string[];
    insurancePolicy?: { providerName?: string } | null;
  }
): TreatmentOfferState {
  state.patientName = p.fullName;
  state.patientCid = p.patientNumber || p.mrn || state.patientCid;
  state.patientGender = p.gender || '';
  state.patientBlood = p.bloodGroup || '';
  if (p.dateOfBirth) {
    state.patientDob = p.dateOfBirth;
    const age = calculateAge(p.dateOfBirth);
    if (age !== null) {
      state.patientAge = `${age}`;
    }
  }
  if (p.knownAllergies?.length) {
    state.patientAllergy = p.knownAllergies.join(', ');
  }
  if (p.insurancePolicy?.providerName) {
    state.insuranceStatus = `Insured (${p.insurancePolicy.providerName})`;
  }
  return state;
}
