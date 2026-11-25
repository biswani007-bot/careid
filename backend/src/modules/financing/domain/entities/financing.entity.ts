export interface FinancingOption {
  id: string;
  code?: string;
  partnerName: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  tenureMonths: number[];
  interestRate: number;
  processingFee: number;
  minDownPaymentPercent?: number;
  maxLoanMultiplier?: number;
  minCreditScore?: number;
  features: string[];
}

export interface FinancingApplication {
  id: string;
  applicationNumber: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  optionId: string;
  partnerName: string;
  facilityId?: string | null;
  treatmentName?: string | null;
  requestedAmount: number;
  tenureMonths: number;
  monthlyEstimatedEmi: number;
  monthlyIncome?: number | null;
  employmentType?: string | null;
  panOrNationalId?: string | null;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED';
  adminNotes?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

