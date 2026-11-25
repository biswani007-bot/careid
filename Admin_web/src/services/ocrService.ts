import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './apiClient';
import { patientProfileCache } from './patientService';

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
  extractedText?: string;
  rawJson?: any;
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
  todayVolumeTrend: string;
  avgConfidence: number;
  avgConfidenceStatus: string;
  approvalRate: number;
  approvalRateTrend: string;
  rejectedRate: number;
  rejectedRateTrend: string;
  avgProcessingSec: number;
}

export interface OcrHourlyVolume {
  hour: string;
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

function mapDocumentType(docType?: string): OcrDocumentType {
  if (!docType) return 'Lab Report - Blood Panel';
  const upper = docType.toUpperCase();
  if (upper.includes('LAB') || upper.includes('BLOOD')) return 'Lab Report - Blood Panel';
  if (upper.includes('MRI') || upper.includes('LUMBAR')) return 'MRI Scan - Lumbar';
  if (upper.includes('PRESCRIPTION')) return 'Prescription - Handwritten';
  if (upper.includes('DISCHARGE')) return 'Discharge Summary';
  if (upper.includes('PATHOLOGY')) return 'Pathology Report';
  if (upper.includes('CARDIO') || upper.includes('ECG')) return 'Cardiology ECG Trace';
  if (upper.includes('DENTAL')) return 'Dental Radiograph';
  if (upper.includes('VISION') || upper.includes('OCT') || upper.includes('OPHTHAL')) return 'Ophthalmology OCT';
  return 'Lab Report - Blood Panel';
}

export function resolveOcrJobStatus(
  raw: any,
  reviewHistoryMap?: Map<string, any>
): OcrStatus {
  // 1. Authoritative check on verifications array attached directly to job
  if (Array.isArray(raw?.verifications) && raw.verifications.length > 0) {
    const sorted = [...raw.verifications].sort(
      (a: any, b: any) =>
        new Date(b.completedAt || b.createdAt || 0).getTime() -
        new Date(a.completedAt || a.createdAt || 0).getTime()
    );
    const latest = sorted[0];
    const rev = String(latest.reviewStatus || '').toUpperCase();
    if (rev === 'REJECTED') return 'Rejected';
    if (rev === 'APPROVED') return 'Approved';
  }

  // 2. Authoritative check on review history map
  if (reviewHistoryMap && raw?.id && reviewHistoryMap.has(raw.id)) {
    const hist = reviewHistoryMap.get(raw.id);
    const rev = String(hist.reviewStatus || '').toUpperCase();
    if (rev === 'REJECTED') return 'Rejected';
    if (rev === 'APPROVED') return 'Approved';
  }

  // 3. Direct reviewStatus property on raw job
  if (raw?.reviewStatus) {
    const rev = String(raw.reviewStatus).toUpperCase();
    if (rev === 'REJECTED') return 'Rejected';
    if (rev === 'APPROVED') return 'Approved';
  }

  // 4. Extracted fields validation status check
  if (Array.isArray(raw?.extractedFields) && raw.extractedFields.length > 0) {
    const hasRejected = raw.extractedFields.some(
      (f: any) => String(f.validationStatus || '').toUpperCase() === 'REJECTED'
    );
    const hasApproved = raw.extractedFields.some((f: any) =>
      ['APPROVED', 'VALIDATED'].includes(String(f.validationStatus || '').toUpperCase())
    );
    if (hasRejected && !hasApproved) {
      return 'Rejected';
    }
  }

  // 5. Execution status fallback
  const st = String(raw?.status || '').toUpperCase();
  if (st === 'REVIEW_REQUIRED' || st === 'UNDER_REVIEW') return 'Under Review';
  if (st === 'FAILED') return 'Rejected';
  if (st === 'COMPLETED' || st === 'APPROVED') return 'Approved';
  if (st === 'PENDING' || st === 'PROCESSING') return 'Pending';

  return 'Pending';
}

function mapRawOcrJob(
  raw: any,
  attachmentPatientMap?: Map<string, { patientId: string; patientNumber: string; patientName: string }>,
  reviewHistoryMap?: Map<string, any>
): OcrQueueItem {
  const rawConf = raw.overallConfidence ?? (raw.confidence || 0);
  const confidence = rawConf <= 1 && rawConf > 0 ? Math.round(rawConf * 100) : Math.round(rawConf);
  
  let confidenceLevel: OcrConfidenceLevel = 'low';
  if (raw.confidenceLevel) {
    const lvl = String(raw.confidenceLevel).toLowerCase();
    if (lvl === 'high' || lvl === 'medium' || lvl === 'low') {
      confidenceLevel = lvl;
    } else {
      confidenceLevel = confidence >= 90 ? 'high' : confidence >= 70 ? 'medium' : 'low';
    }
  } else {
    confidenceLevel = confidence >= 90 ? 'high' : confidence >= 70 ? 'medium' : 'low';
  }

  // Extract structured fields
  const extractedFields: Record<string, string | number> = {};
  if (Array.isArray(raw.extractedFields)) {
    raw.extractedFields.forEach((f: any) => {
      if (f.fieldName) extractedFields[f.fieldName] = f.fieldValue ?? '';
    });
  } else if (raw.extractedFields && typeof raw.extractedFields === 'object') {
    Object.keys(raw.extractedFields).forEach((key) => {
      const val = raw.extractedFields[key];
      extractedFields[key] = val && typeof val === 'object' && 'value' in val ? val.value : val;
    });
  }

  // Authoritative Patient Identity Resolution
  // 1. Correlate with linked clinical attachment from medical records API
  // 2. Correlate with patient profile or extracted clinical entity
  let patientName = raw.patientName;
  let patientId = raw.patientId;

  if (raw.medicalAttachmentId && attachmentPatientMap?.has(raw.medicalAttachmentId)) {
    const pInfo = attachmentPatientMap.get(raw.medicalAttachmentId)!;
    patientName = pInfo.patientName;
    patientId = pInfo.patientNumber || pInfo.patientId;
  }

  // Check if imagePath contains patient profile UUID (e.g. att-787e5187-7859-4320-bb1a-465a57dd086a-...)
  if ((!patientName || patientName === 'CareID Patient') && Array.isArray(raw.pages) && raw.pages.length > 0) {
    for (const page of raw.pages) {
      const match = String(page.imagePath || '').match(/att-([0-9a-fA-F-]{36})/);
      if (match && match[1]) {
        const pid = match[1];
        const cached = patientProfileCache.get(pid);
        if (cached) {
          const cName = [cached.firstName, cached.lastName].filter(Boolean).join(' ').trim() || cached.fullName;
          if (cName) patientName = cName;
          if (cached.patientNumber) patientId = cached.patientNumber;
          break;
        }
      }
    }
  }

  if (!patientName && extractedFields.patient_name) {
    patientName = String(extractedFields.patient_name);
  }
  if (!patientName) {
    patientName = raw.submittedBy ? `Patient (${raw.submittedBy.slice(0, 8)})` : 'CareID Patient';
  }

  // Patient ID / MRN
  if (!patientId && extractedFields.mrn) {
    patientId = String(extractedFields.mrn);
  }
  if (!patientId && raw.medicalAttachmentId) {
    patientId = `PAT-${String(raw.medicalAttachmentId).slice(0, 6).toUpperCase()}`;
  }
  if (!patientId) {
    patientId = 'PAT-CAREID';
  }

  const patientInitials = patientName
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CP';

  const uploadDate = raw.createdAt
    ? new Date(raw.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent';

  // Get raw extracted text if available from pages
  let extractedText = raw.rawText || '';
  if (!extractedText && Array.isArray(raw.pages) && raw.pages.length > 0) {
    extractedText = raw.pages
      .map((p: any) => p.rawText)
      .filter(Boolean)
      .join('\n\n--- Page Break ---\n\n');
  }

  const resolvedStatus = resolveOcrJobStatus(raw, reviewHistoryMap);

  let reviewer = 'PaddleOCR Engine';
  if (raw.verifications?.[0]?.reviewedBy) {
    reviewer = raw.verifications[0].reviewedBy;
  } else if (raw.verifications?.[0]?.reviewerId) {
    reviewer = raw.verifications[0].reviewerId;
  } else if (reviewHistoryMap?.get(raw.id)?.reviewedBy) {
    reviewer = reviewHistoryMap.get(raw.id).reviewedBy;
  } else if (raw.reviewer) {
    reviewer = raw.reviewer;
  }

  let exceptionReason = raw.failureReason || raw.exceptionReason;
  if (!exceptionReason && raw.verifications?.[0]?.reviewNotes) {
    exceptionReason = raw.verifications[0].reviewNotes;
  }
  if (!exceptionReason && reviewHistoryMap?.get(raw.id)?.reviewNotes) {
    exceptionReason = reviewHistoryMap.get(raw.id).reviewNotes;
  }

  return {
    id: raw.id || `ocr-${Date.now()}`,
    ocrId: raw.ocrId || `#OCR-${(raw.id || '').slice(0, 8).toUpperCase() || '0000'}`,
    patientId,
    patientName,
    patientInitials,
    documentType: mapDocumentType(raw.documentType),
    confidence,
    confidenceLevel,
    uploadDate,
    uploadTimestamp: raw.createdAt || new Date().toISOString(),
    status: resolvedStatus,
    reviewer,
    extractedFields,
    documentUrl: raw.pages?.[0]?.imagePath || raw.documentUrl,
    exceptionReason,
    extractedText,
    rawJson: raw,
  };
}

// --------------------------------------------------------------------------
// LIVE BACKEND API SERVICE FUNCTIONS
// --------------------------------------------------------------------------

export async function fetchOcrQueue(
  filters: OcrQueueFilters = {},
  page: number = 1,
  pageSize: number = 10
): Promise<{ items: OcrQueueItem[]; totalCount: number; page: number; totalPages: number }> {
  // Query live OCR jobs from backend across pages to encompass complete database
  // and correlate with live review history to accurately resolve rejection/approval statuses
  const [jobsPage1Res, jobsPage2Res, reviewRes, historyRes, recordsRes] = await Promise.all([
    apiClient.get<any[]>('/api/v1/ocr/jobs?limit=100&page=1'),
    apiClient.get<any[]>('/api/v1/ocr/jobs?limit=100&page=2'),
    apiClient.get<any[]>('/api/v1/ocr/review'),
    apiClient.get<any[]>('/api/v1/ocr/reviews/history?limit=100'),
    apiClient.get<any[]>('/api/v1/admin/medical-records?limit=50'),
  ]);

  if (!jobsPage1Res.success && jobsPage1Res.statusCode !== 404 && jobsPage1Res.statusCode !== 200) {
    throw new Error(jobsPage1Res.message || jobsPage1Res.error || 'Failed to fetch OCR jobs from live backend.');
  }

  const reviewHistoryMap = new Map<string, any>();
  const historyList = Array.isArray(historyRes.data)
    ? historyRes.data
    : (historyRes.data as any)?.data || [];
  historyList.forEach((h: any) => {
    if (h && h.ocrJobId) {
      reviewHistoryMap.set(h.ocrJobId, h);
    }
  });

  const attachmentPatientMap = new Map<string, { patientId: string; patientNumber: string; patientName: string }>();
  const recordsData = Array.isArray(recordsRes.data) ? recordsRes.data : (recordsRes.data as any)?.data || [];
  recordsData.forEach((r: any) => {
    if (r.patient && Array.isArray(r.attachments)) {
      const pName = [r.patient.firstName, r.patient.lastName].filter(Boolean).join(' ').trim() || r.patient.patientNumber || 'CareID Patient';
      r.attachments.forEach((att: any) => {
        if (att.id) {
          attachmentPatientMap.set(att.id, {
            patientId: r.patient.id || r.patientProfileId,
            patientNumber: r.patient.patientNumber || `CID-${att.id.slice(0, 8).toUpperCase()}`,
            patientName: pName,
          });
        }
      });
    }
  });

  const page1Jobs: any[] = Array.isArray(jobsPage1Res.data)
    ? jobsPage1Res.data
    : (jobsPage1Res.data as any)?.data || [];
  const page2Jobs: any[] = Array.isArray(jobsPage2Res.data)
    ? jobsPage2Res.data
    : (jobsPage2Res.data as any)?.data || [];
  const reviewData: any[] = Array.isArray(reviewRes.data)
    ? reviewRes.data
    : (reviewRes.data as any)?.data || [];

  // Combine and deduplicate
  const seen = new Set<string>();
  const combined: any[] = [];
  for (const j of [...page1Jobs, ...page2Jobs, ...reviewData]) {
    if (j && j.id && !seen.has(j.id)) {
      seen.add(j.id);
      combined.push(j);
    }
  }

  let items = combined.map((rawJob) => mapRawOcrJob(rawJob, attachmentPatientMap, reviewHistoryMap));

  // Filter strictly by authoritative resolved status
  if (filters.status && filters.status !== 'All' && filters.status !== 'All Status') {
    const s = filters.status.toLowerCase();
    items = items.filter((item) => {
      const itemStatus = item.status.toLowerCase();
      if (s.includes('approv')) return itemStatus === 'approved';
      if (s.includes('reject')) return itemStatus === 'rejected';
      if (s.includes('review') || s.includes('under')) return itemStatus === 'under review';
      if (s.includes('pend')) return itemStatus === 'pending';
      return itemStatus === s;
    });
  }

  // Filter by document category
  if (filters.documentCategory && filters.documentCategory !== 'All') {
    const cat = filters.documentCategory.toLowerCase();
    items = items.filter((item) => {
      const dt = item.documentType.toLowerCase();
      if (cat.includes('lab')) return dt.includes('lab') || dt.includes('blood');
      if (cat.includes('imaging') || cat.includes('diagnostic')) return dt.includes('mri') || dt.includes('scan') || dt.includes('radiograph') || dt.includes('oct');
      if (cat.includes('prescript')) return dt.includes('prescription');
      return true;
    });
  }

  // Client-side confidence filter
  if (filters.confidenceLevel && filters.confidenceLevel !== 'All') {
    items = items.filter(
      (item) => item.confidenceLevel.toLowerCase() === filters.confidenceLevel?.toLowerCase()
    );
  }

  // Client-side search query
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    items = items.filter(
      (i) =>
        i.ocrId.toLowerCase().includes(q) ||
        i.patientName.toLowerCase().includes(q) ||
        i.patientId.toLowerCase().includes(q) ||
        i.documentType.toLowerCase().includes(q) ||
        i.reviewer.toLowerCase().includes(q)
    );
  }

  const actualCount = items.length;
  const startIndex = (page - 1) * pageSize;
  const paginatedItems = items.slice(startIndex, startIndex + pageSize);

  return {
    items: paginatedItems,
    totalCount: actualCount,
    page,
    totalPages: Math.max(1, Math.ceil(actualCount / pageSize)),
  };
}

export async function fetchOcrQueueStats(): Promise<OcrQueueStats> {
  const [dashRes, statsRes, reviewRes, jobsRes] = await Promise.allSettled([
    apiClient.get<any>('/api/v1/ocr/dashboard'),
    apiClient.get<any>('/api/v1/ocr/statistics'),
    apiClient.get<any[]>('/api/v1/ocr/review'),
    apiClient.get<any[]>('/api/v1/ocr/jobs'),
  ]);

  const dashVal: any = dashRes.status === 'fulfilled' && dashRes.value.success ? dashRes.value.data : null;
  const statsVal: any = statsRes.status === 'fulfilled' && statsRes.value.success ? statsRes.value.data : null;
  const reviewVal: any = reviewRes.status === 'fulfilled' && reviewRes.value.success ? reviewRes.value.data : null;
  const jobsVal: any = jobsRes.status === 'fulfilled' && jobsRes.value.success ? jobsRes.value.data : null;

  if (!dashVal && !statsVal && !reviewVal && !jobsVal) {
    const errorMsg =
      (dashRes.status === 'fulfilled' && dashRes.value.message) ||
      (statsRes.status === 'fulfilled' && statsRes.value.message) ||
      (jobsRes.status === 'fulfilled' && jobsRes.value.message) ||
      'Failed to fetch OCR statistics from backend.';
    throw new Error(errorMsg);
  }

  const d = dashVal || {};
  const s = statsVal || {};
  const reviewList: any[] = Array.isArray(reviewVal)
    ? reviewVal
    : (reviewVal?.data && Array.isArray(reviewVal.data) ? reviewVal.data : []);
  const jobsList: any[] = Array.isArray(jobsVal)
    ? jobsVal
    : (jobsVal?.data && Array.isArray(jobsVal.data) ? jobsVal.data : []);

  // Pending reviews: jobs whose actual backend status is pending review
  const pendingFromJobs = jobsList.filter((j: any) => {
    const st = String(j.status || '').toUpperCase();
    return st === 'REVIEW_REQUIRED' || st === 'PENDING' || st === 'UNDER_REVIEW';
  }).length;

  const pending =
    typeof d.reviewRequiredJobs === 'number'
      ? d.reviewRequiredJobs
      : typeof s.reviewRequiredJobs === 'number'
      ? s.reviewRequiredJobs
      : pendingFromJobs || reviewList.length;

  const total = d.totalJobs ?? s.totalJobs ?? jobsList.length ?? reviewList.length;

  // Compute confidence counts from actual backend jobs classification
  let high = 0;
  let medium = 0;
  let low = 0;

  if (jobsList.length > 0) {
    jobsList.forEach((job: any) => {
      const confLevel = String(job.confidenceLevel || '').toUpperCase();
      const rawConf = job.overallConfidence ?? (job.confidence || 0);
      const confVal = rawConf <= 1 && rawConf > 0 ? rawConf * 100 : rawConf;

      if (confLevel === 'HIGH' || confVal >= 90) {
        high++;
      } else if (confLevel === 'MEDIUM' || (confVal >= 70 && confVal < 90)) {
        medium++;
      } else {
        low++;
      }
    });
  } else {
    const completed = d.completedJobs ?? s.completedJobs ?? 0;
    const failed = d.failedJobs ?? s.failedJobs ?? 0;
    const avgConf = d.averageConfidence ?? s.averageConfidence ?? 0;
    const avgPct = avgConf <= 1 && avgConf > 0 ? avgConf * 100 : avgConf;

    if (completed > 0) {
      if (avgPct >= 90) high = completed;
      else if (avgPct >= 70) medium = completed;
      else low = completed;
    }
    if (failed > 0) low += failed;
  }

  return {
    pendingReviews: pending,
    highConfidence: high,
    mediumConfidence: medium,
    lowConfidence: low,
    totalRecords: total,
  };
}

function formatAnalyticsTimeAgo(dateStr: string): string {
  if (!dateStr) return 'Recently';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export async function fetchOcrAnalyticsData(timeRange: string = 'Today'): Promise<OcrAnalyticsData> {
  const [dashRes, statsRes, p1Res, p2Res, historyRes] = await Promise.allSettled([
    apiClient.get<any>('/api/v1/ocr/dashboard'),
    apiClient.get<any>('/api/v1/ocr/statistics'),
    apiClient.get<any>('/api/v1/ocr/jobs?limit=100&page=1'),
    apiClient.get<any>('/api/v1/ocr/jobs?limit=100&page=2'),
    apiClient.get<any>('/api/v1/ocr/reviews/history?limit=100'),
  ]);

  const dashData = dashRes.status === 'fulfilled' && dashRes.value.success ? dashRes.value.data : null;
  const statsData = statsRes.status === 'fulfilled' && statsRes.value.success ? statsRes.value.data : null;
  const p1Data = p1Res.status === 'fulfilled' && p1Res.value.success ? p1Res.value.data : [];
  const p2Data = p2Res.status === 'fulfilled' && p2Res.value.success ? p2Res.value.data : [];
  const historyData = historyRes.status === 'fulfilled' && historyRes.value.success ? historyRes.value.data : [];

  const allJobs: any[] = [
    ...(Array.isArray(p1Data) ? p1Data : p1Data?.data || []),
    ...(Array.isArray(p2Data) ? p2Data : p2Data?.data || []),
  ];

  const allReviews: any[] = Array.isArray(historyData) ? historyData : historyData?.data || [];

  const now = new Date();
  let filteredJobs = allJobs;
  let filteredReviews = allReviews;

  const todayIsoPrefix = now.toISOString().slice(0, 10);
  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)).getTime();
  const startOfTodayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const todayBoundary = Math.min(startOfTodayUtc, startOfTodayLocal);

  if (timeRange === 'Today') {
    filteredJobs = allJobs.filter((j: any) => {
      if (!j.createdAt) return false;
      return j.createdAt.startsWith(todayIsoPrefix) || new Date(j.createdAt).getTime() >= todayBoundary;
    });
    filteredReviews = allReviews.filter((r: any) => {
      const dt = r.completedAt || r.createdAt;
      if (!dt) return false;
      return dt.startsWith(todayIsoPrefix) || new Date(dt).getTime() >= todayBoundary;
    });
  } else if (timeRange === 'Last 7 Days') {
    const cutoff7d = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    filteredJobs = allJobs.filter((j: any) => new Date(j.createdAt).getTime() >= cutoff7d);
    filteredReviews = allReviews.filter((r: any) => new Date(r.completedAt || r.createdAt).getTime() >= cutoff7d);
  } else if (timeRange === 'Last 30 Days') {
    const cutoff30d = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    filteredJobs = allJobs.filter((j: any) => new Date(j.createdAt).getTime() >= cutoff30d);
    filteredReviews = allReviews.filter((r: any) => new Date(r.completedAt || r.createdAt).getTime() >= cutoff30d);
  }

  // Volume
  const volume = filteredJobs.length;
  const volumeTrend = volume > 0 ? `+${volume} scans` : '0%';

  // Average confidence
  const scoredJobs = filteredJobs.filter((j: any) => typeof j.overallConfidence === 'number' && j.overallConfidence > 0);
  let avgConfidence = 0;
  if (scoredJobs.length > 0) {
    const sum = scoredJobs.reduce((acc: number, j: any) => acc + (j.overallConfidence <= 1 ? j.overallConfidence * 100 : j.overallConfidence), 0);
    avgConfidence = Math.round(sum / scoredJobs.length);
  } else if (filteredJobs.length === 0 || timeRange === 'All Time') {
    const raw = statsData?.averageConfidence ?? dashData?.averageConfidence ?? 0;
    avgConfidence = Math.round(raw <= 1 && raw > 0 ? raw * 100 : raw);
  }

  const avgConfidenceStatus =
    avgConfidence >= 90 ? 'Optimal' : avgConfidence >= 75 ? 'Stable' : 'Needs Review';

  // Human Review Decisions (Approval & Rejection rates)
  const targetReviews = filteredReviews.length > 0 ? filteredReviews : allReviews;
  let approvedCount = 0;
  let rejectedCount = 0;
  targetReviews.forEach((r: any) => {
    const st = String(r.reviewStatus || '').toUpperCase();
    if (st === 'APPROVED') approvedCount++;
    else if (st === 'REJECTED') rejectedCount++;
  });
  const totalReviews = approvedCount + rejectedCount;
  const approvalRate = totalReviews > 0 ? Math.round((approvedCount / totalReviews) * 100) : 0;
  const rejectedRate = totalReviews > 0 ? Math.round((rejectedCount / totalReviews) * 100) : 0;
  const approvalRateTrend = approvedCount > 0 ? `+${approvedCount} approved` : '0%';
  const rejectedRateTrend = rejectedCount > 0 ? `${rejectedCount} flagged` : '0%';

  // Average Processing Time in seconds
  const timedJobs = filteredJobs.filter((j: any) => typeof j.processingTimeMs === 'number' && j.processingTimeMs > 0);
  let avgProcessingSec = 0;
  if (timedJobs.length > 0) {
    const sumMs = timedJobs.reduce((acc: number, j: any) => acc + j.processingTimeMs, 0);
    avgProcessingSec = Number((sumMs / timedJobs.length / 1000).toFixed(1));
  } else if (allJobs.length > 0) {
    const sumMs = allJobs.reduce((acc: number, j: any) => acc + (j.processingTimeMs || 0), 0);
    avgProcessingSec = Number((sumMs / allJobs.length / 1000).toFixed(1));
  }

  // Processing Volume Chart (hourlyVolume)
  let hourlyVolume: OcrHourlyVolume[] = [];
  if (timeRange === 'Today') {
    const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
    hourlyVolume = hours.map((h) => ({ hour: h, processed: 0, exceptions: 0 }));
    filteredJobs.forEach((j: any) => {
      const d = new Date(j.createdAt);
      const h = d.getHours();
      const slotIndex = Math.min(5, Math.floor(h / 4));
      if (j.status === 'FAILED') {
        hourlyVolume[slotIndex].exceptions++;
      } else {
        hourlyVolume[slotIndex].processed++;
      }
    });
  } else if (timeRange === 'Last 7 Days') {
    const days: { label: string; isoDate: string; processed: number; exceptions: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const isoDate = d.toISOString().slice(0, 10);
      days.push({ label, isoDate, processed: 0, exceptions: 0 });
    }
    filteredJobs.forEach((j: any) => {
      const jDate = j.createdAt ? j.createdAt.slice(0, 10) : '';
      const dayBucket = days.find((d) => d.isoDate === jDate);
      if (dayBucket) {
        if (j.status === 'FAILED') dayBucket.exceptions++;
        else dayBucket.processed++;
      }
    });
    hourlyVolume = days.map((d) => ({ hour: d.label, processed: d.processed, exceptions: d.exceptions }));
  } else {
    // Last 30 Days or All Time
    const dateMap = new Map<string, { processed: number; exceptions: number; time: number }>();
    filteredJobs.forEach((j: any) => {
      if (!j.createdAt) return;
      const d = new Date(j.createdAt);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dateMap.has(label)) {
        dateMap.set(label, { processed: 0, exceptions: 0, time: d.getTime() });
      }
      const b = dateMap.get(label)!;
      if (j.status === 'FAILED') b.exceptions++;
      else b.processed++;
    });
    const sorted = Array.from(dateMap.entries()).sort((a, b) => a[1].time - b[1].time);
    hourlyVolume = sorted.map(([label, b]) => ({
      hour: label,
      processed: b.processed,
      exceptions: b.exceptions,
    }));
  }

  // Document Distribution
  const typeMap = new Map<string, number>();
  filteredJobs.forEach((j: any) => {
    const rawType = String(j.documentType || 'LAB_REPORT').toUpperCase();
    let label = 'Lab Reports';
    if (rawType.includes('PRESCRIPTION')) label = 'Prescriptions';
    else if (rawType.includes('DIAGNOSTIC') || rawType.includes('IMAGING')) label = 'Diagnostic & Scans';
    else if (rawType.includes('DISCHARGE')) label = 'Discharge Summaries';
    else if (rawType.includes('PATHOLOGY')) label = 'Pathology Reports';
    typeMap.set(label, (typeMap.get(label) || 0) + 1);
  });
  const colors = ['#28006d', '#006a60', '#ba1a1a', '#483400', '#4f46e5'];
  const distribution: OcrDistributionItem[] = [];
  let cIdx = 0;
  for (const [category, count] of typeMap.entries()) {
    distribution.push({
      category,
      percentage: volume > 0 ? Math.round((count / volume) * 100) : 0,
      color: colors[cIdx++ % colors.length],
    });
  }

  // Recent Exceptions
  const failedJobsPool = filteredJobs.filter((j: any) => j.status === 'FAILED');
  const targetFailedJobs = failedJobsPool.length > 0
    ? failedJobsPool
    : allJobs.filter((j: any) => j.status === 'FAILED');

  const sortedFailed = [...targetFailedJobs].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  const recentExceptions: OcrExceptionItem[] = sortedFailed.slice(0, 5).map((j: any) => {
    const reason = j.failureReason || 'Processing failure';
    const reasonLower = reason.toLowerCase();
    let excType: 'confidence' | 'boundary' | 'illegible' = 'illegible';
    if (reasonLower.includes('confidence') || reasonLower.includes('score')) {
      excType = 'confidence';
    } else if (reasonLower.includes('worker') || reasonLower.includes('server') || reasonLower.includes('file') || reasonLower.includes('source')) {
      excType = 'boundary';
    }

    return {
      id: j.id,
      title: reason,
      ocrId: '#' + (j.id ? j.id.slice(0, 8) : 'UNKNOWN'),
      timeAgo: formatAnalyticsTimeAgo(j.createdAt),
      type: excType,
    };
  });

  return {
    timeRange,
    kpis: {
      todayVolume: volume,
      todayVolumeTrend: volumeTrend,
      avgConfidence,
      avgConfidenceStatus,
      approvalRate,
      approvalRateTrend,
      rejectedRate,
      rejectedRateTrend,
      avgProcessingSec,
    },
    hourlyVolume,
    distribution,
    recentExceptions,
  };
}

export async function fetchOcrItemById(idOrOcrId: string): Promise<OcrQueueItem | null> {
  if (!idOrOcrId) return null;
  const cleanId = idOrOcrId.replace('#', '').replace('OCR-', '').trim();

  try {
    const [jobRes, textRes, fieldsRes, recordsRes, historyRes] = await Promise.all([
      apiClient.get<any>(`/api/v1/ocr/jobs/${cleanId}`),
      apiClient.get<any>(`/api/v1/ocr/jobs/${cleanId}/text`).catch(() => null),
      apiClient.get<any>(`/api/v1/ocr/jobs/${cleanId}/fields`).catch(() => null),
      apiClient.get<any[]>('/api/v1/admin/medical-records?limit=50').catch(() => null),
      apiClient.get<any[]>('/api/v1/ocr/reviews/history?limit=100').catch(() => null),
    ]);

    const reviewHistoryMap = new Map<string, any>();
    const historyList = Array.isArray(historyRes?.data)
      ? historyRes.data
      : (historyRes?.data as any)?.data || [];
    historyList.forEach((h: any) => {
      if (h && h.ocrJobId) {
        reviewHistoryMap.set(h.ocrJobId, h);
      }
    });

    const attachmentPatientMap = new Map<string, { patientId: string; patientNumber: string; patientName: string }>();
    const recordsData = Array.isArray(recordsRes?.data) ? recordsRes.data : (recordsRes?.data as any)?.data || [];
    recordsData.forEach((r: any) => {
      if (r.patient && Array.isArray(r.attachments)) {
        const pName = [r.patient.firstName, r.patient.lastName].filter(Boolean).join(' ').trim() || r.patient.patientNumber || 'CareID Patient';
        r.attachments.forEach((att: any) => {
          if (att.id) {
            attachmentPatientMap.set(att.id, {
              patientId: r.patient.id || r.patientProfileId,
              patientNumber: r.patient.patientNumber || `CID-${att.id.slice(0, 8).toUpperCase()}`,
              patientName: pName,
            });
          }
        });
      }
    });

    if (jobRes.success && jobRes.data) {
      const item = mapRawOcrJob(jobRes.data, attachmentPatientMap, reviewHistoryMap);
      
      // Fetch authenticated document download URL for real scan image preview
      if (jobRes.data.medicalAttachmentId) {
        try {
          const dlRes = await apiClient.get<any>(`/api/v1/attachments/${jobRes.data.medicalAttachmentId}/download-url`);
          if (dlRes.success && dlRes.data?.downloadUrl) {
            item.documentUrl = dlRes.data.downloadUrl;
          }
        } catch {
          // Keep default documentUrl fallback
        }
      }

      if (textRes?.success && textRes.data) {
        item.extractedText = typeof textRes.data === 'string' ? textRes.data : textRes.data.text || item.extractedText;
      }
      
      if (fieldsRes?.success && fieldsRes.data) {
        const fieldsList = Array.isArray(fieldsRes.data)
          ? fieldsRes.data
          : Array.isArray((fieldsRes.data as any)?.data)
          ? (fieldsRes.data as any).data
          : [];
        fieldsList.forEach((f: any) => {
          if (f.fieldName) {
            item.extractedFields[f.fieldName] = f.fieldValue ?? '';
          }
        });
      }
      
      // Merge local draft edits if present
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const draftRaw = localStorage.getItem(`careid_ocr_draft_${cleanId}`);
          if (draftRaw) {
            const draft = JSON.parse(draftRaw);
            if (draft.updates?.extractedFields) {
              item.extractedFields = {
                ...item.extractedFields,
                ...draft.updates.extractedFields,
              };
            }
            if (draft.updates?.patientName) item.patientName = draft.updates.patientName;
            if (draft.updates?.patientId) item.patientId = draft.updates.patientId;
          }
        } catch {
          // Ignore draft parsing errors
        }
      }

      item.rawJson = {
        ...jobRes.data,
        fields: fieldsRes?.data || jobRes.data.extractedFields,
      };

      return item;
    }
  } catch {
    // Return null if not found
  }
  return null;
}

// --------------------------------------------------------------------------
// TANSTACK QUERY HOOKS & MUTATIONS
// --------------------------------------------------------------------------

export function useOcrQueueQuery(filters: OcrQueueFilters = {}, page: number = 1, pageSize: number = 10) {
  return useQuery({
    queryKey: ['ocrQueue', filters, page, pageSize],
    queryFn: () => fetchOcrQueue(filters, page, pageSize),
    staleTime: 1000 * 30,
  });
}

export function useOcrQueueStatsQuery() {
  return useQuery({
    queryKey: ['ocrQueueStats'],
    queryFn: fetchOcrQueueStats,
    staleTime: 1000 * 30,
  });
}

export function useOcrAnalyticsQuery(timeRange: string = 'Today') {
  return useQuery({
    queryKey: ['ocrAnalytics', timeRange],
    queryFn: () => fetchOcrAnalyticsData(timeRange),
    staleTime: 1000 * 30,
  });
}

export function useApproveOcrMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ocrId,
      reviewNotes,
      corrections,
    }: {
      ocrId: string;
      reviewer?: string;
      reviewNotes?: string;
      corrections?: Array<{ fieldName: string; correctedValue: string; confidence?: number }>;
    }) => {
      const cleanId = ocrId.replace('#', '').replace('OCR-', '').trim();
      const res = await apiClient.post(`/api/v1/ocr/review/${cleanId}`, {
        reviewStatus: 'APPROVED',
        reviewNotes: reviewNotes || 'Verified and approved by administrator in CareID Admin Portal.',
        corrections: corrections && corrections.length > 0 ? corrections : undefined,
      });
      if (!res.success) {
        throw new Error(res.message || res.error || 'Failed to submit OCR verification approval.');
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(`careid_ocr_draft_${cleanId}`);
      }
      return { success: true, ocrId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ocrQueue'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem', variables.ocrId] });
      queryClient.invalidateQueries({ queryKey: ['ocrQueueStats'] });
      queryClient.invalidateQueries({ queryKey: ['ocrAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['ocrRejected'] });
      queryClient.invalidateQueries({ queryKey: ['ocrReviewHistory'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'ocr', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'stats'] });
    },
  });
}

export function useRejectOcrMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ocrId,
      reason,
    }: {
      ocrId: string;
      reason: string;
      reviewer?: string;
    }) => {
      const cleanId = ocrId.replace('#', '').replace('OCR-', '').trim();
      const res = await apiClient.post(`/api/v1/ocr/review/${cleanId}`, {
        reviewStatus: 'REJECTED',
        reviewNotes: reason || 'Manual verification rejected by administrator in CareID Admin Portal.',
      });
      if (!res.success) {
        throw new Error(res.message || res.error || 'Failed to submit OCR rejection.');
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(`careid_ocr_draft_${cleanId}`);
      }
      return { success: true, ocrId, reason };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ocrQueue'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem', variables.ocrId] });
      queryClient.invalidateQueries({ queryKey: ['ocrQueueStats'] });
      queryClient.invalidateQueries({ queryKey: ['ocrAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['ocrRejected'] });
      queryClient.invalidateQueries({ queryKey: ['ocrReviewHistory'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'ocr', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'stats'] });
    },
  });
}

export function useRerunOcrJobMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ocrId }: { ocrId: string }) => {
      const cleanId = ocrId.replace('#', '').replace('OCR-', '').trim();
      // Reprocess job via live dedicated POST /api/v1/ocr/reprocess/:jobId
      const res = await apiClient.post(`/api/v1/ocr/reprocess/${cleanId}`, {});
      if (!res.success) {
        throw new Error(res.message || res.error || 'Failed to reprocess OCR job.');
      }
      return { success: true, ocrId, data: res.data };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ocrQueue'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem', variables.ocrId] });
      queryClient.invalidateQueries({ queryKey: ['ocrQueueStats'] });
      queryClient.invalidateQueries({ queryKey: ['ocrAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'ocr', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'stats'] });
    },
  });
}

export function useOcrItemQuery(idOrOcrId: string) {
  return useQuery({
    queryKey: ['ocrItem', idOrOcrId],
    queryFn: () => fetchOcrItemById(idOrOcrId),
    enabled: Boolean(idOrOcrId),
    staleTime: 1000 * 30,
  });
}

export function useSaveOcrDraftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ocrId,
      updates,
      notes,
    }: {
      ocrId: string;
      updates?: Partial<OcrQueueItem>;
      notes?: string;
    }) => {
      const cleanId = ocrId.replace('#', '').replace('OCR-', '').trim();
      // Persist draft locally without altering server status or submitting approval/rejection decisions
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(
          `careid_ocr_draft_${cleanId}`,
          JSON.stringify({
            updates,
            notes,
            savedAt: new Date().toISOString(),
          })
        );
      }
      return { success: true, ocrId };
    },
    onSuccess: (_, variables) => {
      const cleanId = variables.ocrId.replace('#', '').replace('OCR-', '').trim();
      queryClient.invalidateQueries({ queryKey: ['ocrItem', cleanId] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem', variables.ocrId] });
    },
  });
}

export function useOcrRejectedQuery(filters?: OcrRejectedFilters) {
  return useQuery({
    queryKey: ['ocrRejected', filters],
    queryFn: async (): Promise<OcrRejectedItem[]> => {
      const [p1Res, p2Res, histRes] = await Promise.all([
        apiClient.get<any[]>('/api/v1/ocr/jobs?limit=100&page=1'),
        apiClient.get<any[]>('/api/v1/ocr/jobs?limit=100&page=2'),
        apiClient.get<any[]>('/api/v1/ocr/reviews/history?limit=100'),
      ]);

      const jobs1: any[] = Array.isArray(p1Res.data) ? p1Res.data : (p1Res.data as any)?.data || [];
      const jobs2: any[] = Array.isArray(p2Res.data) ? p2Res.data : (p2Res.data as any)?.data || [];
      const histData: any[] = Array.isArray(histRes.data) ? histRes.data : (histRes.data as any)?.data || [];

      const reviewHistoryMap = new Map<string, any>();
      histData.forEach((h: any) => {
        if (h && h.ocrJobId) {
          reviewHistoryMap.set(h.ocrJobId, h);
        }
      });

      const seen = new Set<string>();
      const combined: any[] = [];
      for (const j of [...jobs1, ...jobs2]) {
        if (j && j.id && !seen.has(j.id)) {
          seen.add(j.id);
          combined.push(j);
        }
      }

      // Filter only jobs whose authoritative resolved status is 'Rejected'
      const rejectedJobs = combined.filter(
        (job) => resolveOcrJobStatus(job, reviewHistoryMap) === 'Rejected'
      );

      let items: OcrRejectedItem[] = rejectedJobs.map((job) => {
        const hist = reviewHistoryMap.get(job.id);
        const ver = Array.isArray(job.verifications) && job.verifications.length > 0 ? job.verifications[0] : null;
        const notes = ver?.reviewNotes || hist?.reviewNotes || job.failureReason || 'Manual review rejection';
        const reviewer = ver?.reviewedBy || ver?.reviewerId || hist?.reviewedBy || job.reviewer || 'CareID Administrator';

        return {
          id: job.id,
          ocrId: `#OCR-${(job.id || '').slice(0, 8).toUpperCase()}`,
          fileName: `${(job.documentType || 'document').replace(/\s+/g, '_')}.pdf`,
          fileSize: '1.8 MB',
          uploadDate: job.createdAt
            ? new Date(job.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
              })
            : 'Recent',
          uploadTimestamp: job.createdAt || new Date().toISOString(),
          rejectionReason: notes.length > 25 ? notes.slice(0, 22) + '...' : notes,
          explanation: notes || 'Document flagged during automated verification or rejected by administrator.',
          reviewerName: reviewer,
          reviewerInitials: (reviewer || 'AD').slice(0, 2).toUpperCase(),
          canReprocess: true,
        };
      });

      if (filters?.reason && filters.reason !== 'All') {
        items = items.filter(
          (it) => it.rejectionReason.toLowerCase() === filters.reason?.toLowerCase()
        );
      }

      if (filters?.reviewer && filters.reviewer !== 'All') {
        items = items.filter((it) =>
          it.reviewerName.toLowerCase().includes(filters.reviewer!.toLowerCase())
        );
      }

      if (filters?.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        items = items.filter(
          (it) =>
            it.fileName.toLowerCase().includes(q) ||
            it.ocrId.toLowerCase().includes(q) ||
            it.explanation.toLowerCase().includes(q) ||
            it.rejectionReason.toLowerCase().includes(q) ||
            it.reviewerName.toLowerCase().includes(q)
        );
      }

      return items;
    },
    staleTime: 1000 * 30,
  });
}

export function useReprocessRejectedOcrMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ocrId }: { id: string; ocrId: string }) => {
      const cleanId = ocrId.replace('#', '').replace('OCR-', '').trim();
      const res = await apiClient.post(`/api/v1/ocr/reprocess/${cleanId}`, {});
      if (!res.success) {
        throw new Error(res.message || res.error || 'Failed to submit document for reprocessing.');
      }
      return { success: true, ocrId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ocrRejected'] });
      queryClient.invalidateQueries({ queryKey: ['ocrReviewHistory'] });
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
      ocrId,
      fileName,
    }: {
      id: string;
      ocrId: string;
      fileName: string;
      notes?: string;
    }) => {
      const cleanId = ocrId.replace('#', '').replace('OCR-', '').trim();
      const res = await apiClient.post(`/api/v1/ocr/reprocess/${cleanId}`, {});
      return { success: res.success, ocrId, fileName };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ocrRejected'] });
      queryClient.invalidateQueries({ queryKey: ['ocrReviewHistory'] });
      queryClient.invalidateQueries({ queryKey: ['ocrQueue'] });
      queryClient.invalidateQueries({ queryKey: ['ocrQueueStats'] });
      queryClient.invalidateQueries({ queryKey: ['ocrAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem'] });
      queryClient.invalidateQueries({ queryKey: ['ocrItem', variables.ocrId] });
    },
  });
}

export interface OcrReviewHistoryItem {
  id: string;
  ocrJobId: string;
  reviewedBy: string;
  reviewStatus: 'APPROVED' | 'REJECTED' | string;
  reviewNotes: string;
  completedAt: string;
  createdAt: string;
  job?: {
    id: string;
    medicalAttachmentId: string;
    documentType: string;
    status: string;
    overallConfidence: number;
  };
  fields?: Array<{
    id: string;
    ocrJobId: string;
    fieldName: string;
    fieldValue: string;
    confidence: number;
    validationStatus: string;
    requiresReview: boolean;
    createdAt?: string;
  }>;
}

export function useOcrReviewHistoryQuery(params: { page?: number; limit?: number; status?: string } = {}) {
  return useQuery({
    queryKey: ['ocrReviewHistory', params],
    queryFn: async (): Promise<OcrReviewHistoryItem[]> => {
      const q = new URLSearchParams();
      if (params.page) q.set('page', String(params.page));
      if (params.limit) q.set('limit', String(params.limit || 50));
      if (params.status && params.status !== 'All') q.set('status', params.status);
      const queryString = q.toString() ? `?${q.toString()}` : '';
      const res = await apiClient.get<any>(`/api/v1/ocr/reviews/history${queryString}`);
      const list: any[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray((res.data as any)?.data)
        ? (res.data as any).data
        : [];
      return list;
    },
    staleTime: 1000 * 30,
  });
}





