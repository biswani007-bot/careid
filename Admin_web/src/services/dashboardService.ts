/**
 * CareID Admin Dashboard Service
 *
 * Implements typed data fetching and TanStack Query integration for
 * the live hosted backend API at https://360api.vnvision.in
 * strictly following the Postman collection:
 *
 * Authoritative Postman Endpoints:
 * - GET /api/v1/admin/dashboard/stats (04. Admin Portal & System Operations)
 * - GET /api/v1/admin/dashboard/summary (04. Admin Portal & System Operations)
 * - GET /api/v1/referrals/dashboard/stats (11. Referrals & Care Coordination)
 * - GET /api/v1/ocr/dashboard (15. OCR & Document Verification)
 * - GET /api/v1/ocr/review (15. OCR & Document Verification)
 * - GET /api/v1/referrals (11. Referrals & Care Coordination)
 * - GET /api/v1/health (01. Environment & Health Checks)
 * - GET /api/v1/observability/health (23. Observability & Performance Probes)
 * - GET /api/v1/observability/health/live (23. Observability & Performance Probes)
 * - GET /api/v1/observability/dashboard (23. Observability & Performance Probes)
 * - GET /api/v1/auth/sessions (03. User Profile & Account)
 * - GET /api/v1/admin/audit-logs (04. Admin Portal & System Operations)
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './apiClient';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface DashboardStatsData {
  totalPatients: number;
  totalDoctors: number;
  pendingOcrReviews: number;
  systemLogsCount: number;
}

export interface ActivityLogItem {
  id: string;
  userId?: string;
  action: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export interface DashboardSummaryData {
  totalPatients: number;
  totalDoctors: number;
  totalFacilities: number;
  totalStaff: number;
  totalHealthCards: number;
  totalInsurancePolicies: number;
  totalImmunisationRecords: number;
  totalActiveSchedules: number;
  recentActivities?: ActivityLogItem[];
  growthMetrics?: {
    newPatientsThisMonth: number;
    newDoctorsThisMonth: number;
    newFacilitiesThisMonth: number;
  };
}

export interface DoctorStatsData {
  totalDoctors: number;
  verifiedDoctors: number;
  pendingDoctors: number;
  suspendedDoctors: number;
}

export interface ReferralStatsData {
  totalReferrals: number;
  pendingTriageCount: number;
  acceptedCount: number;
  completedCount: number;
  avgCompletionTimeHours: number;
}

export interface OcrStatsData {
  totalJobs: number;
  completedJobs: number;
  reviewRequiredJobs: number;
  failedJobs: number;
  averageConfidence: number;
  activeTemplatesCount: number;
}

export interface HealthComponentItem {
  id: string;
  component: string;
  status: string;
  checkedAt: string;
  responseTimeMs: number;
  details?: Record<string, any>;
}

export interface ObservabilityHealthData {
  status: string;
  components: HealthComponentItem[];
}

export interface ObservabilityDashboardData {
  overallStatus: string;
  totalRequests24h: number;
  avgResponseTimeMs: number;
  errorRatePercentage: number;
  cacheHitRatePercentage: number;
  queueDepth: number;
  activeUsers: number;
  unhealthyComponentsCount: number;
}

export interface HealthCheckData {
  status: string;
  service: string;
  timestamp: string;
  isHealthy: boolean;
  latencyMs: number;
  components?: HealthComponentItem[];
  avgResponseTimeMs?: number;
}

export interface ActiveSessionItem {
  id: string;
  ipAddress: string;
  userAgent?: string;
  createdAt: string;
}

export interface PriorityTaskItem {
  id: string;
  taskType: 'OCR Verification' | 'Referral Review' | 'Doctor Credentialing' | 'System Task';
  typeIconKey: 'ocr' | 'referral' | 'doctor';
  entity: string;
  submittedAt: string;
  rawTimestamp?: string;
  status: 'Critical' | 'Pending' | 'Review' | 'Routine' | 'Under Review' | 'Escalated' | string;
  priority?: 'Critical' | 'Urgent' | 'High' | 'Medium' | 'Routine' | string;
  actionLabel: string;
  actionPath: string;
  isPrimaryAction?: boolean;
}

// ============================================================================
// Helper Formatting Functions
// ============================================================================

export function formatRelativeTime(dateString: string): string {
  if (!dateString) return 'Recently';
  try {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 30) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export function formatTaskDateTime(dateString: string): string {
  if (!dateString) return 'Recent';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Recent';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Recent';
  }
}

export function formatDocumentType(rawType?: string): string {
  if (!rawType) return 'Clinical Document';
  const upper = rawType.toUpperCase();
  if (upper.includes('LAB') || upper.includes('BLOOD')) return 'Lab Report';
  if (upper.includes('MRI') || upper.includes('LUMBAR')) return 'MRI Scan';
  if (upper.includes('PRESCRIPTION')) return 'Prescription';
  if (upper.includes('DISCHARGE')) return 'Discharge Summary';
  if (upper.includes('PATHOLOGY')) return 'Pathology Report';
  if (upper.includes('CARDIO') || upper.includes('ECG')) return 'Cardiology ECG';
  if (upper.includes('DIAGNOSTIC')) return 'Diagnostic Report';
  return rawType.replace(/_/g, ' ');
}

// ============================================================================
// API Fetchers
// ============================================================================

/**
 * Fetch core dashboard statistics (Total Patients, Total Doctors, Pending OCR, System Logs Count)
 * Postman: GET /api/v1/admin/dashboard/stats
 */
export async function getDashboardStats(): Promise<DashboardStatsData> {
  const response = await apiClient.get<DashboardStatsData>('/api/v1/admin/dashboard/stats');
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch admin dashboard stats');
  }
  return response.data;
}

/**
 * Fetch dashboard platform summary and growth metrics
 * Postman: GET /api/v1/admin/dashboard/summary
 */
export async function getDashboardSummary(): Promise<DashboardSummaryData> {
  const response = await apiClient.get<DashboardSummaryData>('/api/v1/admin/dashboard/summary');
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch admin dashboard summary');
  }
  return response.data;
}

/**
 * Fetch authoritative clinical doctor statistics (Verified Doctors, Suspended, Pending)
 * Postman: GET /api/v1/doctors/statistics
 */
export async function getDoctorStats(): Promise<DoctorStatsData> {
  const response = await apiClient.get<DoctorStatsData>('/api/v1/doctors/statistics');
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch doctor platform stats');
  }
  return response.data;
}

/**
 * Fetch referral metrics including pending referrals count
 * Postman: GET /api/v1/referrals/dashboard/stats
 */
export async function getReferralStats(): Promise<ReferralStatsData> {
  const response = await apiClient.get<ReferralStatsData>('/api/v1/referrals/dashboard/stats');
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch referral dashboard stats');
  }
  return response.data;
}

/**
 * Fetch OCR platform analytics
 * Postman: GET /api/v1/ocr/dashboard
 */
export async function getOcrStats(): Promise<OcrStatsData> {
  const response = await apiClient.get<OcrStatsData>('/api/v1/ocr/dashboard');
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch OCR dashboard stats');
  }
  return response.data;
}

/**
 * Fetch observability dashboard metrics (Active Users, error rates, latency)
 * Postman: GET /api/v1/observability/dashboard
 */
export async function getObservabilityDashboard(): Promise<ObservabilityDashboardData | null> {
  const response = await apiClient.get<ObservabilityDashboardData>('/api/v1/observability/dashboard');
  if (!response.success || !response.data) {
    return null;
  }
  return response.data;
}

/**
 * Fetch live system health status and component breakdown
 * Postman: GET /api/v1/health & GET /api/v1/observability/health
 */
export async function getSystemHealth(): Promise<HealthCheckData> {
  const start = performance.now();
  const [healthRes, obsHealthRes, liveRes] = await Promise.allSettled([
    apiClient.get<any>('/api/v1/health', { requiresAuth: false }),
    apiClient.get<ObservabilityHealthData>('/api/v1/observability/health'),
    apiClient.get<any>('/api/v1/observability/health/live', { requiresAuth: false }),
  ]);
  const latencyMs = Math.round(performance.now() - start);

  const healthData = healthRes.status === 'fulfilled' && healthRes.value.success ? healthRes.value.data : null;
  const obsData = obsHealthRes.status === 'fulfilled' && obsHealthRes.value.success ? obsHealthRes.value.data : null;
  const liveData = liveRes.status === 'fulfilled' && liveRes.value.success ? liveRes.value.data : null;

  const isHealthy = Boolean(
    healthData?.status === 'ok' ||
    obsData?.status === 'HEALTHY' ||
    liveData?.status === 'UP'
  );
  const service = healthData?.service || 'HVAPI Backend';
  const timestamp = healthData?.timestamp || liveData?.timestamp || new Date().toISOString();
  const status = isHealthy ? 'UP' : 'Degraded';

  return {
    status,
    service,
    timestamp,
    isHealthy,
    latencyMs,
    components: obsData?.components || [],
    avgResponseTimeMs: obsData?.components ? Math.round(obsData.components.reduce((acc, c) => acc + (c.responseTimeMs || 0), 0) / (obsData.components.length || 1)) : undefined,
  };
}

/**
 * Fetch active sessions from /api/v1/auth/sessions
 * Postman: GET /api/v1/auth/sessions
 */
export async function getActiveSessions(): Promise<ActiveSessionItem[]> {
  const response = await apiClient.get<ActiveSessionItem[]>('/api/v1/auth/sessions');
  if (!response.success || !Array.isArray(response.data)) {
    return [];
  }
  return response.data;
}

/**
 * Fetch system immutable audit logs
 * Postman: GET /api/v1/admin/audit-logs
 */
export async function getAuditLogs(): Promise<ActivityLogItem[]> {
  const response = await apiClient.get<any>('/api/v1/admin/audit-logs');
  if (!response.success || !response.data) {
    return [];
  }
  if (Array.isArray(response.data)) {
    return response.data;
  }
  if (Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return [];
}

/**
 * Fetch real high priority tasks by querying actionable OCR reviews
 * and pending care referrals.
 * Strict eligibility:
 * - Excludes Completed / Approved records.
 * - Excludes Failed / Rejected records.
 * - Excludes Cancelled records.
 * - Requires genuine pending human action.
 * Postman: GET /api/v1/ocr/review & GET /api/v1/referrals?limit=100
 */
export async function getPriorityTasks(): Promise<PriorityTaskItem[]> {
  const tasks: PriorityTaskItem[] = [];

  try {
    const [ocrRes, refRes] = await Promise.allSettled([
      apiClient.get<any[]>('/api/v1/ocr/review'),
      apiClient.get<any>('/api/v1/referrals?limit=100'),
    ]);

    // 1. Process genuine actionable OCR review jobs
    if (ocrRes.status === 'fulfilled' && ocrRes.value.success) {
      const rawOcrData: any = ocrRes.value.data;
      const ocrJobs: any[] = Array.isArray(rawOcrData?.data)
        ? rawOcrData.data
        : Array.isArray(rawOcrData)
        ? rawOcrData
        : [];

      ocrJobs.forEach((job: any) => {
        const rawStatus = (job.status || '').toUpperCase();
        // Strict exclusion: Approved, Completed, Failed, Rejected, Cancelled
        if (
          rawStatus === 'COMPLETED' ||
          rawStatus === 'APPROVED' ||
          rawStatus === 'FAILED' ||
          rawStatus === 'REJECTED' ||
          rawStatus === 'CANCELLED'
        ) {
          return;
        }

        // Only include actionable review-required records
        const isActionable =
          rawStatus === 'REVIEW_REQUIRED' ||
          rawStatus === 'UNDER_REVIEW' ||
          rawStatus === 'PENDING' ||
          Boolean(job.requiresReview);

        if (!isActionable) {
          return;
        }

        // Exclude if already verified by administrator
        if (Array.isArray(job.verifications) && job.verifications.some((v: any) => v.reviewStatus === 'APPROVED')) {
          return;
        }

        const confLvl = (job.confidenceLevel || '').toUpperCase();
        const confScore = job.overallConfidence ?? 1;
        const isLowConf = confLvl === 'LOW' || confScore < 0.7;
        const priority = isLowConf ? 'High' : 'Medium';

        const docName = formatDocumentType(job.documentType);
        const rawTimestamp = job.createdAt || job.startedAt || new Date().toISOString();

        tasks.push({
          id: `ocr-${job.id}`,
          taskType: 'OCR Verification',
          typeIconKey: 'ocr',
          entity: `Batch #${String(job.id).slice(0, 8)} — ${docName}`,
          submittedAt: formatTaskDateTime(rawTimestamp),
          rawTimestamp,
          status: 'Under Review',
          priority,
          actionLabel: 'Review',
          actionPath: `/admin/ocr/verify/${job.id}`,
          isPrimaryAction: true,
        });
      });
    }

    // 2. Process genuine actionable pending/escalated referrals
    if (refRes.status === 'fulfilled' && refRes.value.success) {
      const referralList: any[] =
        refRes.value.data?.data || (Array.isArray(refRes.value.data) ? refRes.value.data : []);

      referralList.forEach((r: any) => {
        const rawStatus = (r.status || '').toUpperCase();
        // Strict exclusion: Accepted, Completed, Cancelled, Rejected
        if (
          rawStatus === 'ACCEPTED' ||
          rawStatus === 'COMPLETED' ||
          rawStatus === 'CANCELLED' ||
          rawStatus === 'REJECTED'
        ) {
          return;
        }

        // Only actionable: SUBMITTED, PENDING, ESCALATED
        if (rawStatus !== 'SUBMITTED' && rawStatus !== 'PENDING' && rawStatus !== 'ESCALATED') {
          return;
        }

        const rawPriority = (r.priority || '').toUpperCase();
        const isCritical = rawPriority === 'CRITICAL' || rawPriority === 'STAT' || rawStatus === 'ESCALATED';
        const isUrgent = rawPriority === 'URGENT';
        const priority = isCritical ? 'Critical' : isUrgent ? 'Urgent' : 'Routine';

        const status = rawStatus === 'ESCALATED' ? 'Escalated' : 'Pending';
        const rawTimestamp = r.createdAt || new Date().toISOString();

        tasks.push({
          id: `ref-${r.id}`,
          taskType: 'Referral Review',
          typeIconKey: 'referral',
          entity: `${r.referralNumber || 'Referral #' + String(r.id).slice(0, 6)} — ${r.specialtyRequired || 'Specialist'}`,
          submittedAt: formatTaskDateTime(rawTimestamp),
          rawTimestamp,
          status,
          priority,
          actionLabel: 'Process',
          actionPath: `/admin/referrals/details/${r.id}`,
          isPrimaryAction: false,
        });
      });
    }

    // 3. Sort tasks: Critical / Escalated first, then newest timestamp descending
    tasks.sort((a, b) => {
      const getRank = (t: PriorityTaskItem) =>
        t.status === 'Escalated' || t.priority === 'Critical'
          ? 3
          : t.priority === 'Urgent' || t.priority === 'High'
          ? 2
          : 1;

      const rankDiff = getRank(b) - getRank(a);
      if (rankDiff !== 0) return rankDiff;

      const timeA = a.rawTimestamp ? new Date(a.rawTimestamp).getTime() : 0;
      const timeB = b.rawTimestamp ? new Date(b.rawTimestamp).getTime() : 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error('Error fetching priority tasks from API:', err);
  }

  return tasks;
}

// ============================================================================
// TanStack Query Hooks
// ============================================================================

export const DASHBOARD_QUERY_KEYS = {
  STATS: ['admin', 'dashboard', 'stats'] as const,
  SUMMARY: ['admin', 'dashboard', 'summary'] as const,
  DOCTOR_STATS: ['admin', 'doctors', 'statistics'] as const,
  REFERRAL_STATS: ['admin', 'referrals', 'stats'] as const,
  OCR_STATS: ['admin', 'ocr', 'stats'] as const,
  HEALTH: ['system', 'health'] as const,
  OBSERVABILITY_DASHBOARD: ['system', 'observability', 'dashboard'] as const,
  SESSIONS: ['admin', 'auth', 'sessions'] as const,
  AUDIT_LOGS: ['admin', 'audit-logs'] as const,
  PRIORITY_TASKS: ['admin', 'priority-tasks'] as const,
};

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.STATS,
    queryFn: getDashboardStats,
    staleTime: 30_000,
    retry: 2,
  });
}

export function useDoctorStatsQuery() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.DOCTOR_STATS,
    queryFn: getDoctorStats,
    staleTime: 30_000,
    retry: 2,
  });
}

export function useDashboardSummaryQuery() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.SUMMARY,
    queryFn: getDashboardSummary,
    staleTime: 60_000,
    retry: 2,
  });
}

export function useReferralStatsQuery() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.REFERRAL_STATS,
    queryFn: getReferralStats,
    staleTime: 30_000,
    retry: 2,
  });
}

export function useOcrStatsQuery() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.OCR_STATS,
    queryFn: getOcrStats,
    staleTime: 30_000,
    retry: 2,
  });
}

export function useObservabilityDashboardQuery() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.OBSERVABILITY_DASHBOARD,
    queryFn: getObservabilityDashboard,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useSystemHealthQuery() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.HEALTH,
    queryFn: getSystemHealth,
    staleTime: 15_000,
    refetchInterval: 30_000, // Poll health every 30s
    retry: 1,
  });
}

export function useActiveSessionsQuery() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.SESSIONS,
    queryFn: getActiveSessions,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useAuditLogsQuery() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.AUDIT_LOGS,
    queryFn: getAuditLogs,
    staleTime: 30_000,
    retry: 2,
  });
}

export function usePriorityTasksQuery() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.PRIORITY_TASKS,
    queryFn: getPriorityTasks,
    staleTime: 30_000,
    retry: 2,
  });
}
