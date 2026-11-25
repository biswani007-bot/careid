import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  dashboardService,
  DoctorProfile,
  Appointment,
  DiagnosticLabReport,
  DashboardNotification,
  AppointmentStatus,
} from '@/services/dashboardService';
import { authService } from '@/services/authService';

export interface ScheduleItem {
  id: string;
  time: string;
  isUpcoming?: boolean;
  initials: string;
  initialsBg: string;
  initialsColor: string;
  name: string;
  reason: string;
  status: 'In-Session' | 'Arrived' | 'Scheduled' | 'Completed';
  statusBg: string;
  statusColor: string;
  dotColor: string;
  actionType: 'end-consult' | 'start-consult' | 'wait' | 'view';
  rawAppointment: Appointment;
}

export interface DashboardMetrics {
  todayAppointmentsCount: number | null;
  remainingAppointmentsCount: number | null;
  pendingLabReviewsCount: number | null;
  highPriorityLabCount: number | null;
  criticalAlertsCount: number | null;
  avgConsultTimeMinutes: number | null;
}

export interface UseDashboardReturn {
  // Doctor Profile
  doctor: DoctorProfile | null;
  isDoctorLoading: boolean;
  doctorError: string | null;
  refetchDoctor: () => Promise<void>;

  // Appointments / Schedule
  appointments: Appointment[];
  schedule: ScheduleItem[];
  isAppointmentsLoading: boolean;
  appointmentsError: string | null;
  refetchAppointments: () => Promise<void>;

  // Labs / Diagnostic Reports
  recentLabs: DiagnosticLabReport[];
  isLabsLoading: boolean;
  labsError: string | null;
  refetchLabs: () => Promise<void>;

  // Notifications / Alerts
  notifications: DashboardNotification[];
  isNotificationsLoading: boolean;
  notificationsError: string | null;
  refetchNotifications: () => Promise<void>;

  // Derived Performance Metrics
  metrics: DashboardMetrics;

  // Actions & Global Sync
  isRefetching: boolean;
  refetchAll: () => Promise<void>;
  isActionLoading: boolean;
  actionError: string | null;
  startConsultation: (appointmentId: string) => Promise<boolean>;
  endConsultation: (appointmentId: string) => Promise<boolean>;
  verifyLabReport: (reportId: string, patientProfileId?: string) => Promise<boolean>;
}

// Format ISO or HH:mm time string into 12-hour AM/PM format
function formatTime(timeStr?: string, dateStr?: string): string {
  if (!timeStr && !dateStr) return '09:00 AM';
  try {
    if (timeStr && timeStr.includes(':')) {
      const [hStr, mStr] = timeStr.split(':');
      let hour = parseInt(hStr, 10);
      const min = mStr ? mStr.slice(0, 2) : '00';
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      return `${hour.toString().padStart(2, '0')}:${min} ${ampm}`;
    }
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }
    }
  } catch {
    // fallback
  }
  return timeStr || '09:30 AM';
}

// Extract 2-letter uppercase initials from patient full name
function getInitials(name?: string): string {
  if (!name) return 'PT';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Map backend AppointmentStatus enum to Figma-specified visual badge tokens
function mapStatusToVisuals(status: AppointmentStatus): {
  displayStatus: 'In-Session' | 'Arrived' | 'Scheduled' | 'Completed';
  statusBg: string;
  statusColor: string;
  dotColor: string;
  actionType: 'end-consult' | 'start-consult' | 'wait' | 'view';
} {
  switch (status) {
    case 'IN_PROGRESS':
      return {
        displayStatus: 'In-Session',
        statusBg: '#e0f7f6',
        statusColor: '#006971',
        dotColor: '#006971',
        actionType: 'end-consult',
      };
    case 'ARRIVED':
      return {
        displayStatus: 'Arrived',
        statusBg: '#ede7f6',
        statusColor: '#5b14b8',
        dotColor: '#5b14b8',
        actionType: 'start-consult',
      };
    case 'COMPLETED':
      return {
        displayStatus: 'Completed',
        statusBg: '#f0fdf4',
        statusColor: '#16a34a',
        dotColor: '#16a34a',
        actionType: 'view',
      };
    case 'SCHEDULED':
    case 'CONFIRMED':
    default:
      return {
        displayStatus: 'Scheduled',
        statusBg: '#f3f4f5',
        statusColor: '#494552',
        dotColor: '#7a7583',
        actionType: 'wait',
      };
  }
}

export function useDashboard(): UseDashboardReturn {
  // Doctor Profile State
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [isDoctorLoading, setIsDoctorLoading] = useState<boolean>(true);
  const [doctorError, setDoctorError] = useState<string | null>(null);

  // Appointments State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState<boolean>(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  // Diagnostic Labs State
  const [recentLabs, setRecentLabs] = useState<DiagnosticLabReport[]>([]);
  const [isLabsLoading, setIsLabsLoading] = useState<boolean>(true);
  const [labsError, setLabsError] = useState<string | null>(null);

  // Notifications / Alerts State
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState<boolean>(true);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  // Global Refetch & Action States
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Doctor Profile
  const fetchDoctor = useCallback(async () => {
    setIsDoctorLoading(true);
    setDoctorError(null);
    try {
      const data = await dashboardService.getDoctorProfile();
      setDoctor(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve doctor profile';
      setDoctorError(msg);
      setDoctor(null);
    } finally {
      setIsDoctorLoading(false);
    }
  }, []);

  // 2. Fetch Doctor Appointments
  const fetchAppointments = useCallback(async () => {
    setIsAppointmentsLoading(true);
    setAppointmentsError(null);
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      const res = await dashboardService.getDoctorAppointments({
        fromDate: todayStr,
        toDate: todayStr,
        limit: 50,
      });
      setAppointments(res.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database error fetching appointments (HTTP 500)';
      setAppointmentsError(msg);
      setAppointments([]);
    } finally {
      setIsAppointmentsLoading(false);
    }
  }, []);

  // 3. Fetch Recent Labs
  const fetchLabs = useCallback(async () => {
    setIsLabsLoading(true);
    setLabsError(null);
    try {
      const data = await dashboardService.getRecentLabReports();
      setRecentLabs(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve diagnostic reports';
      setLabsError(msg);
      setRecentLabs([]);
    } finally {
      setIsLabsLoading(false);
    }
  }, []);

  // 4. Fetch Notifications / Alerts
  const fetchNotifications = useCallback(async () => {
    setIsNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const claims = authService.getJwtClaims();
      const recipientUserId = typeof claims?.sub === 'string' ? claims.sub : undefined;
      const data = await dashboardService.getNotifications({
        recipientUserId,
        unreadOnly: true,
      });
      setNotifications(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve alerts';
      setNotificationsError(msg);
      setNotifications([]);
    } finally {
      setIsNotificationsLoading(false);
    }
  }, []);

  // 5. Coordinated Global Sync
  const refetchAll = useCallback(async () => {
    setIsRefetching(true);
    await Promise.allSettled([
      fetchDoctor(),
      fetchAppointments(),
      fetchLabs(),
      fetchNotifications(),
    ]);
    setIsRefetching(false);
  }, [fetchDoctor, fetchAppointments, fetchLabs, fetchNotifications]);

  // Initial load on mount
  useEffect(() => {
    refetchAll();
  }, [refetchAll]);

  // Transform actual backend appointments into ScheduleItems for the Table
  // NO MOCK DATA, NO HARDCODED NAMES
  const schedule = useMemo<ScheduleItem[]>(() => {
    if (!appointments || appointments.length === 0) {
      return [];
    }

    return appointments.map((appt, idx) => {
      const patientName =
        appt.patient?.fullName ||
        appt.patientName ||
        (appt.patientProfileId ? `Patient #${appt.patientProfileId.slice(-4)}` : `Patient #${idx + 1}`);
      const initials = getInitials(patientName);
      const visuals = mapStatusToVisuals(appt.status);
      const isUpcoming = visuals.displayStatus === 'In-Session';

      return {
        id: appt.id,
        time: formatTime(appt.startTime, appt.appointmentDate),
        isUpcoming,
        initials,
        initialsBg: isUpcoming ? '#28006d' : '#e1e3e4',
        initialsColor: isUpcoming ? '#ffffff' : '#494552',
        name: patientName,
        reason: appt.reason || 'General Clinical Consultation',
        status: visuals.displayStatus,
        statusBg: visuals.statusBg,
        statusColor: visuals.statusColor,
        dotColor: visuals.dotColor,
        actionType: visuals.actionType,
        rawAppointment: appt,
      };
    });
  }, [appointments]);

  // Derive Bento Grid Performance Metrics strictly from legitimate API data
  const metrics = useMemo<DashboardMetrics>(() => {
    // 1. Appointments count
    const todayAppointmentsCount = appointmentsError !== null ? null : appointments.length;
    const remainingAppointmentsCount =
      appointmentsError !== null
        ? null
        : appointments.filter((a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED').length;

    // 2. Pending lab reviews count
    const pendingLabReviewsCount =
      labsError !== null ? null : recentLabs.filter((l) => l.status === 'PENDING').length;
    const highPriorityLabCount =
      labsError !== null
        ? null
        : recentLabs.filter((l) => l.isAbnormal || l.severity === 'CRITICAL' || l.severity === 'HIGH').length;

    // 3. Critical alerts count
    const criticalAlertsCount =
      notificationsError !== null
        ? null
        : notifications.filter((n) => n.priority === 'CRITICAL' || n.priority === 'HIGH').length;

    // 4. Average consultation time
    let avgConsultTimeMinutes: number | null = null;
    if (appointmentsError === null) {
      const completed = appointments.filter((a) => a.status === 'COMPLETED');
      if (completed.length > 0) {
        avgConsultTimeMinutes = Math.round(
          completed.reduce((acc, curr) => acc + (curr.durationMinutes || 15), 0) / completed.length
        );
      } else {
        avgConsultTimeMinutes = 0;
      }
    }

    return {
      todayAppointmentsCount,
      remainingAppointmentsCount,
      pendingLabReviewsCount,
      highPriorityLabCount,
      criticalAlertsCount,
      avgConsultTimeMinutes,
    };
  }, [appointments, appointmentsError, recentLabs, labsError, notifications, notificationsError]);

  // Action: Start Consultation (PUT /api/v1/appointments/:id/status)
  const startConsultation = useCallback(
    async (appointmentId: string): Promise<boolean> => {
      setIsActionLoading(true);
      setActionError(null);
      try {
        await dashboardService.updateAppointmentStatus(
          appointmentId,
          'IN_PROGRESS',
          'Consultation started by doctor via Web Portal'
        );
        await fetchAppointments();
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to start consultation';
        setActionError(msg);
        return false;
      } finally {
        setIsActionLoading(false);
      }
    },
    [fetchAppointments]
  );

  // Action: End Consultation (PUT /api/v1/appointments/:id/status)
  const endConsultation = useCallback(
    async (appointmentId: string): Promise<boolean> => {
      setIsActionLoading(true);
      setActionError(null);
      try {
        await dashboardService.updateAppointmentStatus(
          appointmentId,
          'COMPLETED',
          'Consultation concluded by doctor via Web Portal'
        );
        await fetchAppointments();
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to end consultation';
        setActionError(msg);
        return false;
      } finally {
        setIsActionLoading(false);
      }
    },
    [fetchAppointments]
  );

  // Action: Verify Lab Report
  const verifyLabReport = useCallback(
    async (reportId: string, patientProfileId?: string): Promise<boolean> => {
      setIsActionLoading(true);
      setActionError(null);
      try {
        const resolvedPatientId =
          patientProfileId || recentLabs.find((l) => l.id === reportId)?.patientProfileId;
        await dashboardService.verifyReport(
          reportId,
          'Verified by Attending Physician via Web Portal',
          resolvedPatientId
        );
        await fetchLabs();
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to verify lab report';
        setActionError(msg);
        return false;
      } finally {
        setIsActionLoading(false);
      }
    },
    [fetchLabs, recentLabs]
  );

  return {
    doctor,
    isDoctorLoading,
    doctorError,
    refetchDoctor: fetchDoctor,

    appointments,
    schedule,
    isAppointmentsLoading,
    appointmentsError,
    refetchAppointments: fetchAppointments,

    recentLabs,
    isLabsLoading,
    labsError,
    refetchLabs: fetchLabs,

    notifications,
    isNotificationsLoading,
    notificationsError,
    refetchNotifications: fetchNotifications,

    metrics,

    isRefetching,
    refetchAll,
    isActionLoading,
    actionError,
    startConsultation,
    endConsultation,
    verifyLabReport,
  };
}
