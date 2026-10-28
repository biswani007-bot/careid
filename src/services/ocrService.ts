import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type OcrConfidenceLevel = 'high' | 'medium' | 'low';
export type OcrStatus = 'Pending' | 'Under Review' | 'Approved' | 'Rejected';
export type OcrDocumentType =
  | 'Lab Report - Blood Panel'
  | 'MRI Scan - Lumbar'
  | 'Prescription - Handwritten'
  | 'Discharge Summary'
  | 'Pathology Report'
  | 'Cardiology ECG Trace'
  | 'Dental Radiograph'
  | 'Ophthalmology OCT';

export interface OcrQueueItem {
  id: string;
  ocrId: string;
  patientId: string;
  patientName: string;
  patientAvatar?: string;
  patientInitials: string;
  documentType: OcrDocumentType;
  confidence: number;
  confidenceLevel: OcrConfidenceLevel;
  uploadDate: string;
  uploadTimestamp: string;
  status: OcrStatus;
  reviewer: string;
  extractedFields: Record<string, string | number>;
  documentUrl?: string;
  exceptionReason?: string;
}

export interface OcrQueueStats {
  pendingReviews: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  totalRecords: number;
}

export interface OcrQueueFilters {
  status?: string; // 'All' | 'Pending' | 'Approved' | 'Rejected'
  confidenceLevel?: string; // 'All' | 'High' | 'Medium' | 'Low'
  documentCategory?: string; // 'All' | 'Lab Reports' | 'Imaging' | 'Prescription'
  searchQuery?: string;
}

export interface OcrKpiMetrics {
  todayVolume: number;
  todayVolumeTrend: string; // "+12%"
  avgConfidence: number;
  avgConfidenceStatus: string; // "Stable"
  approvalRate: number;
  approvalRateTrend: string; // "+2%"
  rejectedRate: number;
  rejectedRateTrend: string; // "-1%"
  avgProcessingSec: number;
}

export interface OcrHourlyVolume {
  hour: string; // "8a", "9a", ...
  processed: number;
  exceptions: number;
}

export interface OcrDistributionItem {
  category: string;
  percentage: number;
  color: string;
}

export interface OcrExceptionItem {
  id: string;
  title: string;
  ocrId: string;
  timeAgo: string;
  type: 'confidence' | 'boundary' | 'illegible';
}

export interface OcrAnalyticsData {
  timeRange: string;
  kpis: OcrKpiMetrics;
  hourlyVolume: OcrHourlyVolume[];
  distribution: OcrDistributionItem[];
  recentExceptions: OcrExceptionItem[];
}

// --------------------------------------------------------------------------
// MOCK DATA STORE (CareID Production Vault Schema)
// --------------------------------------------------------------------------

const initialQueueItems: OcrQueueItem[] = [
  {
    id: 'ocr-8821',
    ocrId: '#OCR-8821',
    patientId: 'CID-9205-1289',
    patientName: 'Sarah Jenkins',
    patientInitials: 'SJ',
    documentType: 'Lab Report - Blood Panel',
    confidence: 98,
    confidenceLevel: 'high',
    uploadDate: 'Oct 24, 09:15 AM',
    uploadTimestamp: '2026-10-24T09:15:00Z',
    status: 'Pending',
    reviewer: 'Unassigned',
    extractedFields: {
      'Hemoglobin (Hgb)': '14.2 g/dL',
      'White Blood Cells (WBC)': '6.8 x10^3/uL',
      'Platelets': '245 x10^3/uL',
      'Fasting Glucose': '92 mg/dL',
    },
  },
  {
    id: 'ocr-8822',
    ocrId: '#OCR-8822',
    patientId: 'CID-8849-0021',
    patientName: 'Marcus Reed',
    patientInitials: 'MR',
    documentType: 'MRI Scan - Lumbar',
    confidence: 74,
    confidenceLevel: 'medium',
    uploadDate: 'Oct 24, 08:42 AM',
    uploadTimestamp: '2026-10-24T08:42:00Z',
    status: 'Under Review',
    reviewer: 'Dr. E. Vance',
    extractedFields: {
      'Study Description': 'MRI Lumbar Spine Without Contrast',
      'Finding 1': 'L4-L5 mild disc bulge without canal stenosis',
      'Finding 2': 'L5-S1 desiccated disc with disc height loss',
      'Impression': 'Degenerative changes prominent at L5-S1',
    },
  },
  {
    id: 'ocr-8823',
    ocrId: '#OCR-8823',
    patientId: 'CID-7104-5512',
    patientName: 'Elena Rostova',
    patientInitials: 'ER',
    documentType: 'Prescription - Handwritten',
    confidence: 42,
    confidenceLevel: 'low',
    uploadDate: 'Oct 23, 11:20 PM',
    uploadTimestamp: '2026-10-23T23:20:00Z',
    status: 'Pending',
    reviewer: 'Unassigned',
    exceptionReason: 'Low Confidence Score (42%) - cursive script ambiguity',
    extractedFields: {
      'Medication 1': 'Amoxicillin 500mg (Unverified)',
      'Dosage': 'TID x 7 days (?)',
      'Prescriber': 'Dr. Robert Torres (NPI unconfirmed)',
    },
  },
  {
    id: 'ocr-8824',
    ocrId: '#OCR-8824',
    patientId: 'CID-6632-9014',
    patientName: 'James Palmer',
    patientInitials: 'JP',
    documentType: 'Discharge Summary',
    confidence: 95,
    confidenceLevel: 'high',
    uploadDate: 'Oct 23, 04:15 PM',
    uploadTimestamp: '2026-10-23T16:15:00Z',
    status: 'Pending',
    reviewer: 'Unassigned',
    extractedFields: {
      'Admission Date': 'Oct 19, 2026',
      'Discharge Date': 'Oct 23, 2026',
      'Primary Diagnosis': 'Acute Gastroenteritis - Resolved',
      'Discharge Disposition': 'Home under self-care with oral rehydration',
    },
  },
  {
    id: 'ocr-8825',
    ocrId: '#OCR-8825',
    patientId: 'CID-5402-8871',
    patientName: 'Amara Okafor',
    patientInitials: 'AO',
    documentType: 'Lab Report - Blood Panel',
    confidence: 99,
    confidenceLevel: 'high',
    uploadDate: 'Oct 23, 02:30 PM',
    uploadTimestamp: '2026-10-23T14:30:00Z',
    status: 'Approved',
    reviewer: 'Dr. E. Vance',
    extractedFields: {
      'Total Cholesterol': '184 mg/dL',
      'HDL': '58 mg/dL',
      'LDL': '108 mg/dL',
      'Triglycerides': '138 mg/dL',
    },
  },
  {
    id: 'ocr-8826',
    ocrId: '#OCR-8826',
    patientId: 'CID-3310-9944',
    patientName: 'David Kim',
    patientInitials: 'DK',
    documentType: 'MRI Scan - Lumbar',
    confidence: 68,
    confidenceLevel: 'low',
    uploadDate: 'Oct 23, 01:10 PM',
    uploadTimestamp: '2026-10-23T13:10:00Z',
    status: 'Under Review',
    reviewer: 'Dr. Michael Chen',
    exceptionReason: 'Missing Boundaries in scan margin region',
    extractedFields: {
      'Sagittal Alignment': 'Normal lordosis maintained',
      'Vertebral Heights': 'Grossly intact',
    },
  },
  {
    id: 'ocr-8827',
    ocrId: '#OCR-8827',
    patientId: 'CID-4491-2209',
    patientName: 'Chloe Bennett',
    patientInitials: 'CB',
    documentType: 'Cardiology ECG Trace',
    confidence: 96,
    confidenceLevel: 'high',
    uploadDate: 'Oct 23, 11:45 AM',
    uploadTimestamp: '2026-10-23T11:45:00Z',
    status: 'Approved',
    reviewer: 'Dr. Aris Evans',
    extractedFields: {
      'Heart Rate': '72 bpm',
      'PR Interval': '148 ms',
      'QRS Duration': '86 ms',
      'QT/QTc': '390/415 ms',
      'Rhythm': 'Normal Sinus Rhythm',
    },
  },
  {
    id: 'ocr-8828',
    ocrId: '#OCR-8828',
    patientId: 'CID-1198-3482',
    patientName: 'Vikram Patel',
    patientInitials: 'VP',
    documentType: 'Prescription - Handwritten',
    confidence: 54,
    confidenceLevel: 'low',
    uploadDate: 'Oct 23, 09:20 AM',
    uploadTimestamp: '2026-10-23T09:20:00Z',
    status: 'Rejected',
    reviewer: 'Dr. E. Vance',
    exceptionReason: 'Illegible Region Detected across sig line',
    extractedFields: {
      'Rx Item': 'Illegible (Signature unverified)',
      'Refills': '0',
    },
  },
  {
    id: 'ocr-8829',
    ocrId: '#OCR-8829',
    patientId: 'CID-8820-4172',
    patientName: 'Hannah Larson',
    patientInitials: 'HL',
    documentType: 'Dental Radiograph',
    confidence: 97,
    confidenceLevel: 'high',
    uploadDate: 'Oct 22, 05:40 PM',
    uploadTimestamp: '2026-10-22T17:40:00Z',
    status: 'Approved',
    reviewer: 'Dr. Aris Evans',
    extractedFields: {
      'Modality': 'Digital Panoramic OPG',
      'Mandible': 'Continuous cortex, no fractures',
      'Restorations': 'Tooth #18, #19 composites verified',
    },
  },
  {
    id: 'ocr-8830',
    ocrId: '#OCR-8830',
    patientId: 'CID-9912-7634',
    patientName: 'Lucas Morales',
    patientInitials: 'LM',
    documentType: 'Pathology Report',
    confidence: 84,
    confidenceLevel: 'medium',
    uploadDate: 'Oct 22, 03:15 PM',
    uploadTimestamp: '2026-10-22T15:15:00Z',
    status: 'Pending',
    reviewer: 'Unassigned',
    extractedFields: {
      'Specimen Type': 'Punch biopsy skin left forearm',
      'Microscopic Description': 'Solar lentigo, no atypia or malignancy',
      'Margin Status': 'Involved at lateral margin',
    },
  },
  {
    id: 'ocr-8831',
    ocrId: '#OCR-8831',
    patientId: 'CID-7741-0092',
    patientName: 'Sophia Turner',
    patientInitials: 'ST',
    documentType: 'Ophthalmology OCT',
    confidence: 94,
    confidenceLevel: 'high',
    uploadDate: 'Oct 22, 01:05 PM',
    uploadTimestamp: '2026-10-22T13:05:00Z',
    status: 'Pending',
    reviewer: 'Unassigned',
    extractedFields: {
      'Central Foveal Thickness': '248 um (OD) / 252 um (OS)',
      'Retinal Nerve Fiber Layer': 'Normal thickness bilaterally',
      'Vitreomacular Interface': 'Attached, no traction',
    },
  },
  {
    id: 'ocr-8832',
    ocrId: '#OCR-8832',
    patientId: 'CID-6523-8910',
    patientName: 'Ethan Brooks',
    patientInitials: 'EB',
    documentType: 'Lab Report - Blood Panel',
    confidence: 91,
    confidenceLevel: 'high',
    uploadDate: 'Oct 22, 10:50 AM',
    uploadTimestamp: '2026-10-22T10:50:00Z',
    status: 'Approved',
    reviewer: 'Dr. Michael Chen',
    extractedFields: {
      'eGFR': '98 mL/min/1.73m2',
      'Serum Creatinine': '0.94 mg/dL',
      'BUN': '14 mg/dL',
      'Potassium': '4.2 mEq/L',
    },
  },
];

// In-memory queue repository for active sessions
let ocrQueueStore: OcrQueueItem[] = [...initialQueueItems];

// --------------------------------------------------------------------------
// SERVICE FUNCTIONS
// --------------------------------------------------------------------------

export async function fetchOcrQueue(
  filters: OcrQueueFilters = {},
  page: number = 1,
  pageSize: number = 10
): Promise<{ items: OcrQueueItem[]; totalCount: number; page: number; totalPages: number }> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 80));

  let filtered = [...ocrQueueStore];

  // Status Filter
  if (filters.status && filters.status !== 'All' && filters.status !== 'All Status') {
    filtered = filtered.filter((item) => item.status.toLowerCase() === filters.status?.toLowerCase());
  }

  // Confidence Filter
  if (filters.confidenceLevel && filters.confidenceLevel !== 'All') {
    filtered = filtered.filter(
      (item) => item.confidenceLevel.toLowerCase() === filters.confidenceLevel?.toLowerCase()
    );
  }

  // Document Category Filter
  if (filters.documentCategory && filters.documentCategory !== 'All') {
    const cat = filters.documentCategory.toLowerCase();
    if (cat.includes('lab')) {
      filtered = filtered.filter((i) => i.documentType.toLowerCase().includes('lab'));
    } else if (cat.includes('image') || cat.includes('mri') || cat.includes('scan')) {
      filtered = filtered.filter(
        (i) =>
          i.documentType.toLowerCase().includes('mri') ||
          i.documentType.toLowerCase().includes('radiograph') ||
          i.documentType.toLowerCase().includes('oct')
      );
    } else if (cat.includes('prescription')) {
      filtered = filtered.filter((i) => i.documentType.toLowerCase().includes('prescription'));
    }
  }

  // Search Query
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (i) =>
        i.ocrId.toLowerCase().includes(q) ||
        i.patientName.toLowerCase().includes(q) ||
        i.patientId.toLowerCase().includes(q) ||
        i.documentType.toLowerCase().includes(q) ||
        i.reviewer.toLowerCase().includes(q)
    );
  }

  const actualCount = filtered.length;
  const startIndex = (page - 1) * pageSize;
  const items = filtered.slice(startIndex, startIndex + pageSize);

  return {
    items,
    totalCount: actualCount,
    page,
    totalPages: Math.max(1, Math.ceil(actualCount / pageSize)),
  };
}

export async function fetchOcrQueueStats(): Promise<OcrQueueStats> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  // Matches Figma 20:3664 KPI numbers: 124, 89, 22, 13
  return {
    pendingReviews: 124,
    highConfidence: 89,
    mediumConfidence: 22,
    lowConfidence: 13,
    totalRecords: 124,
  };
}

export async function fetchOcrAnalyticsData(timeRange: string = 'Today'): Promise<OcrAnalyticsData> {
  await new Promise((resolve) => setTimeout(resolve, 80));

  // Matches Figma 20:3975 layout, KPIs, stacked chart & distributions identically
  return {
    timeRange,
    kpis: {
      todayVolume: 342,
      todayVolumeTrend: '+12%',
      avgConfidence: 92,
      avgConfidenceStatus: 'Stable',
      approvalRate: 94,
      approvalRateTrend: '+2%',
      rejectedRate: 6,
      rejectedRateTrend: '-1%',
      avgProcessingSec: 1.2,
    },
    hourlyVolume: [
      { hour: '8a', processed: 30, exceptions: 0 },
      { hour: '9a', processed: 40, exceptions: 0 },
      { hour: '10a', processed: 50, exceptions: 8 },
      { hour: '11a', processed: 72, exceptions: 6 },
      { hour: '12p', processed: 78, exceptions: 15 },
      { hour: '1p', processed: 58, exceptions: 8 },
      { hour: '2p', processed: 44, exceptions: 0 },
      { hour: '3p', processed: 32, exceptions: 0 },
    ],
    distribution: [
      { category: 'Lab Reports', percentage: 65, color: '#28006d' },
      { category: 'Imaging Referrals', percentage: 20, color: '#006a60' },
      { category: 'Prescriptions', percentage: 10, color: '#854d0e' },
      { category: 'Other', percentage: 5, color: '#94a3b8' },
    ],
    recentExceptions: [
      {
        id: 'exc-1',
        title: 'Low Confidence Score (42%)',
        ocrId: 'DOC-8823',
        timeAgo: '2m ago',
        type: 'confidence',
      },
      {
        id: 'exc-2',
        title: 'Missing Boundaries',
        ocrId: 'DOC-8819',
        timeAgo: '15m ago',
        type: 'boundary',
      },
      {
        id: 'exc-3',
        title: 'Illegible Region Detected',
        ocrId: 'DOC-8790',
        timeAgo: '42m ago',
        type: 'illegible',
      },
    ],
  };
}

// --------------------------------------------------------------------------
// TANSTACK QUERY HOOKS
// --------------------------------------------------------------------------

export function useOcrQueueQuery(filters: OcrQueueFilters = {}, page: number = 1, pageSize: number = 10) {
  return useQuery({
    queryKey: ['ocrQueue', filters, page, pageSize],
    queryFn: () => fetchOcrQueue(filters, page, pageSize),
    staleTime: 1000 * 60,
    placeholderData: (previousData) => previousData,
  });
}

export function useOcrQueueStatsQuery() {
  return useQuery({
    queryKey: ['ocrQueueStats'],
    queryFn: fetchOcrQueueStats,
    staleTime: 1000 * 60,
  });
}

export function useOcrAnalyticsQuery(timeRange: string = 'Today') {
  return useQuery({
    queryKey: ['ocrAnalytics', timeRange],
    queryFn: () => fetchOcrAnalyticsData(timeRange),
    staleTime: 1000 * 60,
  });
}

export function useApproveOcrMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ocrId, reviewer = 'Dr. E. Vance' }: { ocrId: string; reviewer?: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      ocrQueueStore = ocrQueueStore.map((item) =>
        item.ocrId === ocrId || item.id === ocrId ? { ...item, status: 'Approved', reviewer } : item
      );
      return { success: true, ocrId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ocrQueue'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem', variables.ocrId] });
      queryClient.invalidateQueries({ queryKey: ['ocrQueueStats'] });
      queryClient.invalidateQueries({ queryKey: ['ocrAnalytics'] });
    },
  });
}

export function useRejectOcrMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ocrId,
      reason,
      reviewer = 'Dr. E. Vance',
    }: {
      ocrId: string;
      reason: string;
      reviewer?: string;
    }) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      ocrQueueStore = ocrQueueStore.map((item) =>
        item.ocrId === ocrId || item.id === ocrId
          ? { ...item, status: 'Rejected', reviewer, exceptionReason: reason }
          : item
      );
      return { success: true, ocrId, reason };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ocrQueue'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem', variables.ocrId] });
      queryClient.invalidateQueries({ queryKey: ['ocrQueueStats'] });
      queryClient.invalidateQueries({ queryKey: ['ocrAnalytics'] });
    },
  });
}

export function useRerunOcrJobMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ocrId }: { ocrId: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      ocrQueueStore = ocrQueueStore.map((item) =>
        item.ocrId === ocrId || item.id === ocrId
          ? {
              ...item,
              confidence: Math.min(99, item.confidence + 15),
              confidenceLevel: 'high',
              status: 'Under Review',
            }
          : item
      );
      return { success: true, ocrId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ocrQueue'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem', variables.ocrId] });
      queryClient.invalidateQueries({ queryKey: ['ocrQueueStats'] });
      queryClient.invalidateQueries({ queryKey: ['ocrAnalytics'] });
    },
  });
}

export async function fetchOcrItemById(idOrOcrId: string): Promise<OcrQueueItem | null> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  if (!idOrOcrId) return null;
  const normalized = idOrOcrId.toLowerCase().replace('#', '').trim();
  const match = ocrQueueStore.find(
    (item) =>
      item.id.toLowerCase() === normalized ||
      item.ocrId.toLowerCase().replace('#', '') === normalized ||
      item.ocrId.toLowerCase() === idOrOcrId.toLowerCase()
  );
  return match || null;
}

export function useOcrItemQuery(idOrOcrId: string) {
  return useQuery({
    queryKey: ['ocrItem', idOrOcrId],
    queryFn: () => fetchOcrItemById(idOrOcrId),
    enabled: Boolean(idOrOcrId),
    staleTime: 1000 * 60,
  });
}

export function useSaveOcrDraftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ocrId,
      updates,
    }: {
      ocrId: string;
      updates: Partial<OcrQueueItem>;
    }) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      ocrQueueStore = ocrQueueStore.map((item) =>
        item.ocrId === ocrId || item.id === ocrId ? { ...item, ...updates } : item
      );
      return { success: true, ocrId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ocrQueue'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem', variables.ocrId] });
      queryClient.invalidateQueries({ queryKey: ['ocrQueueStats'] });
    },
  });
}

export interface OcrRejectedItem {
  id: string;
  ocrId: string;
  fileName: string;
  fileSize?: string;
  uploadDate: string;
  uploadTimestamp?: string;
  rejectionReason: string;
  explanation: string;
  reviewerName: string;
  reviewerAvatar?: string;
  reviewerInitials: string;
  documentUrl?: string;
  thumbnailUrl?: string;
  patientName?: string;
  patientId?: string;
  canReprocess?: boolean;
}

export interface OcrRejectedFilters {
  reason?: string;
  reviewer?: string;
  searchQuery?: string;
}

const initialRejectedItems: OcrRejectedItem[] = [
  {
    id: 'rej-1',
    ocrId: 'DOC-9921',
    fileName: 'LabResults_Q3_Smith.pdf',
    fileSize: '2.4 MB',
    uploadDate: 'Oct 24, 2023',
    uploadTimestamp: '2026-10-24T09:15:00Z',
    rejectionReason: 'Unreadable Text',
    explanation: 'DPI too low, artifacts present.',
    reviewerName: 'S. Jenkins',
    reviewerInitials: 'SJ',
    canReprocess: true,
  },
  {
    id: 'rej-2',
    ocrId: 'DOC-9844',
    fileName: 'Prescription_DrDavis.pdf',
    fileSize: '1.1 MB',
    uploadDate: 'Oct 23, 2023',
    uploadTimestamp: '2026-10-23T14:30:00Z',
    rejectionReason: 'Missing Signature',
    explanation: 'Signature not detected.',
    reviewerName: 'R. Vance',
    reviewerInitials: 'RV',
    canReprocess: true,
  },
  {
    id: 'rej-3',
    ocrId: '#OCR-8828',
    fileName: 'Prescription_Handwritten_Patel.pdf',
    fileSize: '3.8 MB',
    uploadDate: 'Oct 23, 2023',
    uploadTimestamp: '2026-10-23T09:20:00Z',
    rejectionReason: 'Illegible Region',
    explanation: 'Illegible Region Detected across sig line.',
    reviewerName: 'Dr. E. Vance',
    reviewerInitials: 'EV',
    canReprocess: true,
  },
];

let ocrRejectedStore: OcrRejectedItem[] = [...initialRejectedItems];

export function useOcrRejectedQuery(filters?: OcrRejectedFilters) {
  return useQuery({
    queryKey: ['ocrRejected', filters],
    queryFn: async (): Promise<OcrRejectedItem[]> => {
      await new Promise((resolve) => setTimeout(resolve, 80));

      // Combine dedicated rejected items with any rejected items from ocrQueueStore
      const queueRejectedMapped: OcrRejectedItem[] = ocrQueueStore
        .filter((item) => item.status === 'Rejected')
        .map((item) => {
          const initials =
            item.reviewer && item.reviewer !== 'Unassigned'
              ? item.reviewer
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              : 'EV';
          return {
            id: `rej-${item.id}`,
            ocrId: item.ocrId,
            fileName: `${item.documentType.replace(/\s+/g, '_')}.pdf`,
            fileSize: '1.8 MB',
            uploadDate: item.uploadDate,
            uploadTimestamp: item.uploadTimestamp,
            rejectionReason: item.exceptionReason?.split(' ')[0] || 'Verification Failed',
            explanation: item.exceptionReason || 'Document flagged during manual verification.',
            reviewerName: item.reviewer || 'Dr. E. Vance',
            reviewerInitials: initials,
            patientName: item.patientName,
            patientId: item.patientId,
            canReprocess: true,
          };
        });

      // De-duplicate by ocrId
      const seen = new Set<string>();
      const combined: OcrRejectedItem[] = [];

      for (const it of [...ocrRejectedStore, ...queueRejectedMapped]) {
        const key = it.ocrId.toLowerCase().replace('#', '');
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(it);
        }
      }

      let filtered = [...combined];

      if (filters?.reason && filters.reason !== 'All') {
        filtered = filtered.filter(
          (it) => it.rejectionReason.toLowerCase() === filters.reason?.toLowerCase()
        );
      }

      if (filters?.reviewer && filters.reviewer !== 'All') {
        filtered = filtered.filter((it) =>
          it.reviewerName.toLowerCase().includes(filters.reviewer!.toLowerCase())
        );
      }

      if (filters?.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          (it) =>
            it.fileName.toLowerCase().includes(q) ||
            it.ocrId.toLowerCase().includes(q) ||
            it.explanation.toLowerCase().includes(q) ||
            it.rejectionReason.toLowerCase().includes(q) ||
            it.reviewerName.toLowerCase().includes(q)
        );
      }

      return filtered;
    },
    staleTime: 1000 * 60,
  });
}

export function useReprocessRejectedOcrMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ocrId }: { id: string; ocrId: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      // In a real API, this calls POST /api/v1/ocr/jobs with medicalAttachmentId
      // In local state, mark as re-queued
      ocrRejectedStore = ocrRejectedStore.filter((it) => it.id !== id && it.ocrId !== ocrId);
      ocrQueueStore = ocrQueueStore.map((it) =>
        it.ocrId === ocrId || it.id === id
          ? { ...it, status: 'Under Review', confidence: Math.min(95, it.confidence + 15) }
          : it
      );
      return { success: true, ocrId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ocrRejected'] });
      queryClient.invalidateQueries({ queryKey: ['ocrQueue'] });
      queryClient.invalidateQueries({ queryKey: ['ocrQueueStats'] });
      queryClient.invalidateQueries({ queryKey: ['ocrAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem', variables.ocrId] });
    },
  });
}

export function useReplaceOcrDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ocrId,
      fileName,
      notes,
    }: {
      id: string;
      ocrId: string;
      fileName: string;
      notes?: string;
    }) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      // In a real API, this registers an attachment via POST /api/v1/attachments and triggers POST /api/v1/ocr/jobs
      ocrRejectedStore = ocrRejectedStore.filter((it) => it.id !== id && it.ocrId !== ocrId);
      ocrQueueStore = ocrQueueStore.map((it) =>
        it.ocrId === ocrId || it.id === id
          ? {
              ...it,
              status: 'Under Review',
              confidence: 90,
              confidenceLevel: 'high',
              exceptionReason: notes || 'Replaced with high-resolution scan',
            }
          : it
      );
      return { success: true, ocrId, fileName };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ocrRejected'] });
      queryClient.invalidateQueries({ queryKey: ['ocrQueue'] });
      queryClient.invalidateQueries({ queryKey: ['ocrQueueStats'] });
      queryClient.invalidateQueries({ queryKey: ['ocrAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem', variables.ocrId] });
    },
  });
}
