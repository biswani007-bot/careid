import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  FlaskConical,
  Loader2,
  MapPin,
  RotateCw,
  SlidersHorizontal,
  TrendingDown,
  TriangleAlert,
  UserPlus,
  Users,
} from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    doctor,
    isDoctorLoading,
    schedule,
    isAppointmentsLoading,
    appointmentsError,
    refetchAppointments,
    recentLabs,
    isLabsLoading,
    labsError,
    refetchLabs,
    isNotificationsLoading,
    notificationsError,
    metrics,
    isRefetching,
    isActionLoading,
    actionError,
    refetchAll,
    startConsultation,
    endConsultation,
    verifyLabReport,
  } = useDashboard();

  // Current formatted date string
  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Time-based greeting (Morning, Afternoon, Evening)
  const greetingTimeOfDay = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning';
    if (hours < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Department name strictly from authenticated doctor profile
  const departmentName = useMemo(() => {
    if (doctor?.primarySpecialization) {
      return `${doctor.primarySpecialization} Department`;
    }
    return doctor?.department || 'Clinical Practice';
  }, [doctor]);

  // Doctor display name strictly from authenticated doctor profile
  const doctorDisplayName = useMemo(() => {
    if (doctor?.fullName) {
      return doctor.fullName.startsWith('Dr.') ? doctor.fullName : `Dr. ${doctor.fullName}`;
    }
    return 'Doctor';
  }, [doctor]);

  return (
    <div className="w-full">
      {/* Action Error Banner if a mutation fails */}
      {actionError && (
        <div
          role="alert"
          className="mb-4 p-3.5 rounded-xl bg-[#ffdad6]/60 border border-[#ba1a1a]/30 flex items-center justify-between text-xs sm:text-sm text-[#ba1a1a] transition-all"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-[#ba1a1a]" aria-hidden="true" />
            <span className="font-medium">{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => refetchAll()}
            className="font-semibold underline hover:no-underline ml-3 cursor-pointer shrink-0"
          >
            Refresh
          </button>
        </div>
      )}

      {/* 1. Header - Welcome Section & Quick Actions (Figma node 1:158) */}
      <section
        aria-label="Welcome and Quick Actions"
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 h-auto md:h-[67.5px]"
      >
        <div>
          {isDoctorLoading ? (
            <div className="h-9 w-64 bg-slate-200/80 rounded-lg animate-pulse" />
          ) : (
            <h1 className="text-2xl sm:text-[32px] font-bold text-[#191c1d] leading-10 tracking-[-0.8px]">
              {greetingTimeOfDay}, {doctorDisplayName}
            </h1>
          )}

          <div className="flex items-center gap-2 text-sm text-[#494552] mt-1 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4 text-[#494552]" aria-hidden="true" />
              <span>{currentDateFormatted}</span>
            </span>
            <span aria-hidden="true" className="text-[#cbc4d4]">•</span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 text-[#494552]" aria-hidden="true" />
              <span>{departmentName}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Synchronize Live Data Button */}
          <button
            type="button"
            onClick={() => refetchAll()}
            disabled={isRefetching}
            title="Synchronize All Live Clinical Data"
            className="h-[38px] px-3.5 rounded-lg bg-white border border-[#cbc4d4] text-sm font-semibold text-[#494552] hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5b14b8] cursor-pointer disabled:opacity-60"
          >
            <RotateCw
              className={`size-3.5 text-[#494552] ${isRefetching ? 'animate-spin text-[#5b14b8]' : ''}`}
              aria-hidden="true"
            />
            <span className="text-xs">{isRefetching ? 'Syncing...' : 'Sync'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/patients/new')}
            className="h-[38px] px-4 rounded-lg bg-white border border-[#cbc4d4] text-sm font-semibold text-[#191c1d] hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5b14b8] cursor-pointer"
          >
            <UserPlus className="size-4 text-[#494552]" aria-hidden="true" />
            <span>Add New Patient</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="h-[38px] px-4 rounded-lg bg-white border border-[#5b14b8] text-sm font-semibold text-[#5b14b8] hover:bg-purple-50 transition-colors flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5b14b8] cursor-pointer"
          >
            <Calendar className="size-4 text-[#5b14b8]" aria-hidden="true" />
            <span>Schedule Appointment</span>
          </button>
        </div>
      </section>

      {/* 2. Key Performance Metrics - Bento Grid Style (Figma node 1:180) */}
      <section
        aria-label="Key Performance Metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6"
      >
        {/* Metric 1: Today's Appointments */}
        <div className="relative bg-white rounded-2xl border border-[#e1e3e4] p-5 shadow-sm overflow-hidden flex flex-col justify-between h-[140px]">
          <div
            className="absolute -top-3 -right-3 size-24 rounded-full bg-[#5b14b8]/10 blur-xl pointer-events-none"
            aria-hidden="true"
          />
          <div className="flex items-start justify-between">
            <h2 className="text-sm font-medium text-[#494552] leading-snug max-w-[120px]">
              Today&apos;s Appointments
            </h2>
            <div className="size-8 rounded-full bg-[#28006d]/10 flex items-center justify-center shrink-0">
              <Users className="size-4 text-[#28006d]" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            {isAppointmentsLoading ? (
              <div className="h-9 w-16 bg-slate-200/80 rounded animate-pulse" />
            ) : appointmentsError !== null ? (
              <>
                <span className="text-2xl font-bold text-[#ba1a1a] leading-none" title={appointmentsError}>
                  —
                </span>
                <span className="bg-[#ffdad6] text-[#ba1a1a] text-xs font-semibold px-2 py-0.5 rounded">
                  Service Error
                </span>
              </>
            ) : (
              <>
                <span className="text-3xl sm:text-[40px] font-bold text-[#191c1d] leading-none tracking-[-0.8px]">
                  {metrics.todayAppointmentsCount ?? 0}
                </span>
                <span className="bg-[#76f1ff]/40 text-[#006971] text-xs font-semibold px-2.5 py-1 rounded">
                  {metrics.remainingAppointmentsCount ?? 0} remaining
                </span>
              </>
            )}
          </div>
        </div>

        {/* Metric 2: Pending Lab Reviews */}
        <div className="relative bg-white rounded-2xl border border-[#e1e3e4] p-5 shadow-sm overflow-hidden flex flex-col justify-between h-[140px]">
          <div
            className="absolute -top-3 -right-3 size-24 rounded-full bg-[#006971]/10 blur-xl pointer-events-none"
            aria-hidden="true"
          />
          <div className="flex items-start justify-between">
            <h2 className="text-sm font-medium text-[#494552] leading-snug max-w-[120px]">
              Pending Lab Reviews
            </h2>
            <div className="size-8 rounded-full bg-[#006971]/10 flex items-center justify-center shrink-0">
              <FlaskConical className="size-4 text-[#006971]" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            {isLabsLoading ? (
              <div className="h-9 w-16 bg-slate-200/80 rounded animate-pulse" />
            ) : labsError !== null ? (
              <>
                <span className="text-2xl font-bold text-[#ba1a1a] leading-none" title={labsError}>
                  —
                </span>
                <span className="text-xs font-medium text-[#ba1a1a] pb-0.5">
                  Service Error
                </span>
              </>
            ) : (
              <>
                <span className="text-3xl sm:text-[40px] font-bold text-[#191c1d] leading-none tracking-[-0.8px]">
                  {metrics.pendingLabReviewsCount ?? 0}
                </span>
                <span className="text-xs font-medium text-[#494552] pb-0.5">
                  {(metrics.highPriorityLabCount ?? 0) > 0
                    ? `${metrics.highPriorityLabCount} high priority`
                    : 'All normal'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Metric 3: Critical Alerts */}
        <div
          onClick={() => navigate('/notifications')}
          className="relative bg-white rounded-2xl border border-[#e1e3e4] p-5 shadow-sm overflow-hidden flex flex-col justify-between h-[140px] cursor-pointer hover:border-[#ba1a1a]/40 transition-colors"
        >
          <div
            className="absolute -top-3 -right-3 size-24 rounded-full bg-[#ba1a1a]/10 blur-xl pointer-events-none"
            aria-hidden="true"
          />
          <div className="flex items-start justify-between">
            <h2 className="text-sm font-medium text-[#ba1a1a] leading-snug">
              Critical Alerts
            </h2>
            <div className="size-8 rounded-full bg-[#ba1a1a]/10 flex items-center justify-center shrink-0">
              <TriangleAlert className="size-4 text-[#ba1a1a]" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            {isNotificationsLoading ? (
              <div className="h-9 w-16 bg-slate-200/80 rounded animate-pulse" />
            ) : notificationsError !== null ? (
              <>
                <span className="text-2xl font-bold text-[#ba1a1a] leading-none" title={notificationsError}>
                  —
                </span>
                <span className="text-xs font-medium text-[#ba1a1a] pb-0.5">
                  Service Error
                </span>
              </>
            ) : (
              <>
                <span className="text-3xl sm:text-[40px] font-bold text-[#ba1a1a] leading-none tracking-[-0.8px]">
                  {metrics.criticalAlertsCount ?? 0}
                </span>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded ${
                    (metrics.criticalAlertsCount ?? 0) > 0
                      ? 'bg-[#ba1a1a] text-white'
                      : 'bg-slate-100 text-[#494552]'
                  }`}
                >
                  {(metrics.criticalAlertsCount ?? 0) > 0 ? 'Requires Action' : 'All Clear'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Metric 4: Avg. Consult Time */}
        <div className="relative bg-white rounded-2xl border border-[#e1e3e4] p-5 shadow-sm overflow-hidden flex flex-col justify-between h-[140px]">
          <div
            className="absolute -top-3 -right-3 size-24 rounded-full bg-slate-200/50 blur-xl pointer-events-none"
            aria-hidden="true"
          />
          <div className="flex items-start justify-between">
            <h2 className="text-sm font-medium text-[#494552] leading-snug">
              Avg. Consult Time
            </h2>
            <div className="size-8 rounded-full bg-[#f3f4f5] flex items-center justify-center shrink-0">
              <Clock className="size-4 text-[#494552]" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            {isAppointmentsLoading ? (
              <div className="h-9 w-16 bg-slate-200/80 rounded animate-pulse" />
            ) : (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-[40px] font-bold text-[#191c1d] leading-none tracking-[-0.8px]">
                    {metrics.avgConsultTimeMinutes ?? 0}
                  </span>
                  <span className="text-sm font-medium text-[#494552]">min</span>
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-[#7a7583] pb-0.5">
                  <TrendingDown className="size-3.5 text-[#5b14b8]" aria-hidden="true" />
                  <span>Based on records</span>
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 3. Main Content Grid (Figma node 1:234) */}
      <section
        aria-label="Clinical Operations"
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 items-start"
      >
        {/* Left: Today's Clinical Schedule (Figma node 1:235) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e1e3e4] shadow-sm flex flex-col h-[500px]">
          {/* Schedule Header */}
          <div className="px-5 py-4 border-b border-[#e1e3e4] flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#191c1d]">
              Today&apos;s Schedule
            </h3>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-xs font-semibold text-[#5b14b8] hover:underline cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#5b14b8] rounded"
            >
              View Full Calendar
            </button>
          </div>

          {/* Schedule Body: Loading State */}
          {isAppointmentsLoading && (
            <div className="p-5 flex-1 flex flex-col justify-center space-y-3.5">
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          )}

          {/* Schedule Body: Error State (Backend API 500 / Network Error) */}
          {!isAppointmentsLoading && appointmentsError !== null && (
            <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
              <div className="size-12 rounded-full bg-red-50 text-[#ba1a1a] flex items-center justify-center mb-3">
                <AlertCircle className="size-6" aria-hidden="true" />
              </div>
              <h4 className="text-base font-bold text-[#191c1d]">
                Unable to Load Schedule
              </h4>
              <p className="text-xs text-[#7a7583] mt-1.5 max-w-[360px] leading-relaxed">
                The appointment service returned an unexpected error ({appointmentsError}). Please retry or check backend availability.
              </p>
              <button
                type="button"
                onClick={() => refetchAppointments()}
                className="mt-4 px-4 py-2 rounded-lg border border-[#cbc4d4] text-xs font-semibold text-[#191c1d] hover:bg-slate-50 transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-[#5b14b8] cursor-pointer"
              >
                <RotateCw className="size-3.5 text-[#5b14b8]" aria-hidden="true" />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* Schedule Body: Empty State (Successful response with 0 appointments) */}
          {!isAppointmentsLoading && appointmentsError === null && schedule.length === 0 && (
            <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
              <div className="size-12 rounded-full bg-slate-100 text-[#7a7583] flex items-center justify-center mb-3">
                <Calendar className="size-6" aria-hidden="true" />
              </div>
              <h4 className="text-base font-bold text-[#191c1d]">
                No Appointments Scheduled Today
              </h4>
              <p className="text-xs text-[#7a7583] mt-1.5 max-w-[340px] leading-relaxed">
                Your clinical schedule is currently clear for today. New bookings from the patient portal will appear here automatically.
              </p>
              <button
                type="button"
                onClick={() => navigate('/patients')}
                className="mt-4 px-4 py-2 rounded-lg bg-[#28006d] text-xs font-semibold text-white hover:bg-[#3f1d8b] transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-[#28006d] cursor-pointer"
              >
                <UserPlus className="size-3.5" aria-hidden="true" />
                <span>Register / Book Patient</span>
              </button>
            </div>
          )}

          {/* Schedule Body: Success State with Real Table */}
          {!isAppointmentsLoading && appointmentsError === null && schedule.length > 0 && (
            <div className="p-5 flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[560px]">
                <thead>
                  <tr className="border-b border-[#e1e3e4]/60 text-xs font-semibold text-[#7a7583]">
                    <th scope="col" className="py-2.5 font-medium w-[96px]">Time</th>
                    <th scope="col" className="py-2.5 font-medium w-[130px]">Patient</th>
                    <th scope="col" className="py-2.5 font-medium">Reason</th>
                    <th scope="col" className="py-2.5 font-medium w-[100px]">Status</th>
                    <th scope="col" className="py-2.5 font-medium text-right w-[110px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {schedule.map((row) => (
                    <tr key={row.id} className="h-[49px] hover:bg-slate-50/60 transition-colors">
                      {/* Time */}
                      <td className="py-1">
                        <span
                          className={
                            row.isUpcoming
                              ? 'font-semibold text-[#5b14b8]'
                              : 'text-[#494552]'
                          }
                        >
                          {row.time}
                        </span>
                      </td>

                      {/* Patient Name & Initials strictly from backend */}
                      <td className="py-1">
                        <div
                          onClick={() => {
                            const patientId = row.rawAppointment.patientProfileId || row.rawAppointment.patient?.id;
                            if (patientId) {
                              navigate(`/patients/${patientId}`);
                            }
                          }}
                          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
                          title="View Patient Medical Profile"
                        >
                          <div
                            style={{ backgroundColor: row.initialsBg, color: row.initialsColor }}
                            className="size-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0"
                            aria-hidden="true"
                          >
                            {row.initials}
                          </div>
                          <span className="font-semibold text-[#191c1d] whitespace-nowrap hover:text-[#5b14b8]">
                            {row.name}
                          </span>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="py-1 text-[#494552] text-xs sm:text-sm leading-tight pr-2">
                        {row.reason}
                      </td>

                      {/* Status */}
                      <td className="py-1">
                        <span
                          style={{ backgroundColor: row.statusBg, color: row.statusColor }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                        >
                          <span
                            style={{ backgroundColor: row.dotColor }}
                            className="size-1.5 rounded-full"
                            aria-hidden="true"
                          />
                          {row.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-1 text-right">
                        <div className="flex justify-end">
                          {row.actionType === 'end-consult' && (
                            <button
                              type="button"
                              onClick={() => endConsultation(row.id)}
                              disabled={isActionLoading}
                              className="w-[100px] h-[26px] rounded border border-[#ba1a1a] text-[#ba1a1a] hover:bg-red-50 text-xs font-semibold flex items-center justify-center transition-colors focus:outline-none focus:ring-1 focus:ring-[#ba1a1a] cursor-pointer disabled:opacity-50"
                            >
                              {isActionLoading ? <Loader2 className="size-3 animate-spin" /> : 'End Consult'}
                            </button>
                          )}
                          {row.actionType === 'start-consult' && (
                            <button
                              type="button"
                              onClick={() => startConsultation(row.id)}
                              disabled={isActionLoading}
                              className="w-[104px] h-[36px] rounded bg-[#28006d] hover:bg-[#3f1d8b] text-white text-xs font-semibold leading-tight flex flex-col items-center justify-center transition-colors focus:outline-none focus:ring-1 focus:ring-[#28006d] cursor-pointer disabled:opacity-50"
                            >
                              {isActionLoading ? (
                                <Loader2 className="size-4 animate-spin my-auto" />
                              ) : (
                                <>
                                  <span>Start</span>
                                  <span>Consult</span>
                                </>
                              )}
                            </button>
                          )}
                          {row.actionType === 'wait' && (
                            <button
                              type="button"
                              className="w-[54px] h-[26px] rounded border border-[#cbc4d4] text-[#494552] hover:bg-slate-50 text-xs font-semibold flex items-center justify-center transition-colors focus:outline-none focus:ring-1 focus:ring-[#cbc4d4]"
                            >
                              Wait
                            </button>
                          )}
                          {row.actionType === 'view' && (
                            <button
                              type="button"
                              onClick={() => {
                                const patientId = row.rawAppointment.patientProfileId || row.rawAppointment.patient?.id;
                                if (patientId) navigate(`/patients/${patientId}`);
                              }}
                              className="w-[74px] h-[26px] rounded border border-[#16a34a] text-[#16a34a] hover:bg-green-50 text-xs font-semibold flex items-center justify-center transition-colors focus:outline-none focus:ring-1 focus:ring-[#16a34a] cursor-pointer"
                            >
                              Completed
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Recent Labs (Figma node 1:341) */}
        <div className="relative">
          {/* 500px Card Shell with Header, Real Feed Items, and Pinned Footer */}
          <div className="bg-white rounded-2xl border border-[#e1e3e4] shadow-sm flex flex-col h-[500px] relative">
            {/* Labs Header */}
            <div className="px-5 py-4 border-b border-[#e1e3e4] flex items-center justify-between bg-white rounded-t-2xl z-10">
              <h3 className="text-lg font-bold text-[#191c1d]">
                Recent Labs
              </h3>
              <button
                type="button"
                onClick={() => navigate('/records/labs')}
                aria-label="Filter lab results"
                className="p-1 rounded text-[#494552] hover:bg-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-[#5b14b8] cursor-pointer"
              >
                <SlidersHorizontal className="size-4" aria-hidden="true" />
              </button>
            </div>

            {/* Labs Feed: Loading State */}
            {isLabsLoading && (
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-center">
                <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
              </div>
            )}

            {/* Labs Feed: Error State */}
            {!isLabsLoading && labsError !== null && (
              <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
                <div className="size-10 rounded-full bg-red-50 text-[#ba1a1a] flex items-center justify-center mb-2.5">
                  <AlertCircle className="size-5" aria-hidden="true" />
                </div>
                <h4 className="text-sm font-bold text-[#191c1d]">
                  Diagnostic Reports Unavailable
                </h4>
                <p className="text-xs text-[#7a7583] mt-1 max-w-[280px] leading-relaxed">
                  {labsError}
                </p>
                <button
                  type="button"
                  onClick={() => refetchLabs()}
                  className="mt-3.5 px-3 py-1.5 rounded-lg border border-[#cbc4d4] text-xs font-semibold text-[#191c1d] hover:bg-slate-50 transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-[#5b14b8] cursor-pointer"
                >
                  <RotateCw className="size-3.5 text-[#5b14b8]" aria-hidden="true" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Labs Feed: Empty State */}
            {!isLabsLoading && labsError === null && recentLabs.length === 0 && (
              <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
                <div className="size-10 rounded-full bg-teal-50 text-[#006971] flex items-center justify-center mb-2.5">
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                </div>
                <h4 className="text-sm font-bold text-[#191c1d]">
                  No Pending Lab Reviews
                </h4>
                <p className="text-xs text-[#7a7583] mt-1 max-w-[260px] leading-relaxed">
                  All diagnostic medical records and laboratory results have been signed off.
                </p>
              </div>
            )}

            {/* Labs Feed: Success State with Real Backend Reports */}
            {!isLabsLoading && labsError === null && recentLabs.length > 0 && (
              <div className="p-2 space-y-2 relative flex-1 overflow-y-auto">
                {recentLabs.slice(0, 3).map((lab) => {
                  const isCritical = lab.severity === 'CRITICAL' || lab.isAbnormal;
                  const patientDisplay = lab.patientName || (lab.patientProfileId ? `Patient #${lab.patientProfileId.slice(-4)}` : 'Patient');

                  return (
                    <div
                      key={lab.id}
                      className={`rounded-xl p-3 border space-y-2 ${
                        isCritical
                          ? 'border-[#ffdad6] bg-[#fff8f7]'
                          : 'border-[#e1e3e4] bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-[#191c1d]">
                          {isCritical ? (
                            <svg className="size-3.5 text-[#ba1a1a] fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12 2a1 1 0 0 1 1 1v5.586l3.95-3.95a1 1 0 1 1 1.414 1.414L14.414 10H20a1 1 0 1 1 0 2h-5.586l3.95 3.95a1 1 0 0 1-1.414 1.414L13 13.414V19a1 1 0 1 1-2 0v-5.586l-3.95 3.95a1 1 0 0 1-1.414-1.414L9.586 12H4a1 1 0 1 1 0-2h5.586L5.636 6.05a1 1 0 0 1 1.414-1.414L11 8.586V3a1 1 0 0 1 1-1z" />
                            </svg>
                          ) : (
                            <Activity className="size-4 text-[#5b14b8]" aria-hidden="true" />
                          )}
                          <span>{lab.title}</span>
                        </div>
                        <span className="text-xs text-[#7a7583]">
                          {lab.reportDate ? new Date(lab.reportDate).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>

                      <p className="text-xs text-[#494552] leading-relaxed">
                        Patient: {patientDisplay} • {lab.description || 'Diagnostic laboratory report.'}
                      </p>

                      <div className="flex justify-end pt-1">
                        {isCritical ? (
                          <button
                            type="button"
                            onClick={() => verifyLabReport(lab.id, lab.patientProfileId)}
                            className="px-3 py-1 rounded text-xs font-semibold border border-[#ba1a1a] text-[#ba1a1a] hover:bg-red-50 transition-colors focus:outline-none focus:ring-1 focus:ring-[#ba1a1a] cursor-pointer"
                          >
                            Review Critical
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                lab.id
                                  ? `/records/labs/${lab.id}${lab.patientProfileId ? `?patientId=${lab.patientProfileId}` : ''}`
                                  : lab.patientProfileId
                                  ? `/records/labs?patientId=${lab.patientProfileId}`
                                  : '/records/labs'
                              )
                            }
                            className="px-3 py-1 rounded text-xs font-semibold border border-[#5b14b8] text-[#5b14b8] hover:bg-purple-50 transition-colors focus:outline-none focus:ring-1 focus:ring-[#5b14b8] cursor-pointer"
                          >
                            View Report
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Labs Footer - pinned at bottom of 500px card */}
            <div className="absolute bottom-0 inset-x-0 h-[65px] px-4 border-t border-[#e1e3e4] bg-white rounded-b-2xl flex items-center justify-center z-10">
              <button
                type="button"
                onClick={() => navigate('/records/labs')}
                className="text-xs font-semibold text-[#5b14b8] hover:underline flex items-center justify-center gap-2 focus:outline-none focus:ring-1 focus:ring-[#5b14b8] rounded py-1 px-2 cursor-pointer"
              >
                <RotateCw className="size-3.5 text-[#5b14b8]" aria-hidden="true" />
                <span>View All Processed Labs</span>
              </button>
            </div>
          </div>

          {/* Fourth Lab Item: Rendered if 4th backend report exists */}
          {!isLabsLoading && labsError === null && recentLabs.length > 3 && (
            <div className="mt-1 px-2">
              <div className="rounded-xl p-3 border border-[#e1e3e4] bg-white shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-[#191c1d]">
                    <Activity className="size-4 text-[#5b14b8]" aria-hidden="true" />
                    <span>{recentLabs[3].title}</span>
                  </div>
                  <span className="text-xs text-[#7a7583]">
                    {recentLabs[3].reportDate ? new Date(recentLabs[3].reportDate).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
                <p className="text-xs text-[#494552] leading-relaxed">
                  Patient: {recentLabs[3].patientName || 'Patient'} • {recentLabs[3].description || 'Processed by lab.'}
                </p>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => verifyLabReport(recentLabs[3].id, recentLabs[3].patientProfileId)}
                    className="px-3 py-1 rounded text-xs font-semibold border border-[#5b14b8] text-[#5b14b8] hover:bg-purple-50 transition-colors focus:outline-none focus:ring-1 focus:ring-[#5b14b8] cursor-pointer"
                  >
                    Review
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
