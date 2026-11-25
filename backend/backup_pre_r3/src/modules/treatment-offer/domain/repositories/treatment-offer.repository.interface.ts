import { TreatmentOfferStatus, ProcedureCategory } from '@prisma/client';

export interface CreateProcedureData {
  procedureCode: string;
  procedureName: string;
  category?: ProcedureCategory;
  quantity?: number;
  unitCost: number;
  totalCost: number;
  isOptional?: boolean;
  sequenceOrder?: number;
  clinicalJustification?: string;
}

export interface CreateTreatmentOfferData {
  offerNumber: string;
  doctorProfileId: string;
  patientProfileId: string;
  facilityId: string;
  encounterId?: string;
  clinicalIndication: string;
  grossEstimate: number;
  discountAmount: number;
  netPayable: number;
  currency?: string;
  financingEligible?: boolean;
  recommendedTenureMonths?: number;
  validUntil: Date;
  clinicalNotes?: string;
  termsAndConditions?: string;
  procedures: CreateProcedureData[];
  createdById: string;
  performerRole?: string;
}

export interface UpdateTreatmentOfferData {
  clinicalIndication?: string;
  grossEstimate?: number;
  discountAmount?: number;
  netPayable?: number;
  financingEligible?: boolean;
  recommendedTenureMonths?: number;
  validUntil?: Date;
  clinicalNotes?: string;
  termsAndConditions?: string;
  procedures?: CreateProcedureData[];
  updatedById: string;
  performerRole?: string;
  expectedVersion?: number;
}

export interface ITreatmentOfferRepository {
  findOfferById(id: string): Promise<any | null>;
  findOfferByNumber(offerNumber: string): Promise<any | null>;
  findOffersForDoctor(doctorProfileId: string, filter: { status?: TreatmentOfferStatus; patientId?: string; search?: string; page: number; limit: number }): Promise<{ items: any[]; total: number }>;
  findOffersForPatient(patientProfileId: string, filter: { status?: TreatmentOfferStatus; search?: string; page: number; limit: number }): Promise<{ items: any[]; total: number }>;
  generateOfferNumber(): Promise<string>;
  generateFinancingOfferNumber(): Promise<string>;
  createOffer(data: CreateTreatmentOfferData): Promise<any>;
  updateOffer(id: string, data: UpdateTreatmentOfferData): Promise<any>;
  dispatchOffer(id: string, offerNumber: string, userId: string, role?: string, expectedVersion?: number): Promise<any>;
  cancelOffer(id: string, reason: string, userId: string, role?: string, expectedVersion?: number): Promise<any>;
  markOfferReviewing(id: string, userId: string): Promise<any>;
  ratifyOffer(id: string, notes: string | undefined, userId: string, expectedVersion?: number): Promise<any>;
  declineOffer(id: string, reason: string, userId: string, expectedVersion?: number): Promise<any>;
  expireOffer(id: string): Promise<any>;
  createHistory(treatmentOfferId: string, action: string, previousStatus: TreatmentOfferStatus | null, newStatus: TreatmentOfferStatus, performedBy: string, performerRole?: string, notes?: string, metadata?: any): Promise<any>;
  findFinancingOffersForPatient(patientProfileId: string): Promise<any[]>;
  findFinancingOfferById(id: string): Promise<any | null>;
  findFinancingOfferByTreatmentOfferId(treatmentOfferId: string): Promise<any | null>;
  createFinancingOffer(data: any): Promise<any>;
  upsertFinancingOffer(treatmentOfferId: string, data: any): Promise<any>;
  findOfferHistoryByAction(treatmentOfferId: string, action: string): Promise<any[]>;
  findLatestOfferHistoryByAction(treatmentOfferId: string, action: string): Promise<any | null>;
}

