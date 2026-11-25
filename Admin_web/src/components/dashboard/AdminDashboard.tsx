import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Plus,
  ArrowRight,
  TrendingUp,
  MoreVertical,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import './AdminDashboard.css';
import AdminSidebar from '../common/AdminSidebar';

// Header Assets
import headerBellIcon from '../../assets/dashboard/header-bell.svg';
import headerSettingsIcon from '../../assets/dashboard/header-settings.svg';
import headerAvatarImg from '../../assets/dashboard/header-avatar.png';

// KPI Assets
import kpiPatientsIcon from '../../assets/dashboard/kpi-patients.svg';
import kpiDoctorsIcon from '../../assets/dashboard/kpi-doctors.svg';
import kpiUsersIcon from '../../assets/dashboard/kpi-users.svg';
import kpiOcrIcon from '../../assets/dashboard/kpi-ocr.svg';
import kpiReferralsIcon from '../../assets/dashboard/kpi-referrals.svg';
import kpiApiIcon from '../../assets/dashboard/kpi-api.svg';

// Tasks Assets
import taskOcrIcon from '../../assets/dashboard/task-ocr.svg';
import taskReferralIcon from '../../assets/dashboard/task-referral.svg';
import taskDoctorIcon from '../../assets/dashboard/task-doctor.svg';

// Quick Actions & Logs Assets
import qaDoctorIcon from '../../assets/dashboard/qa-doctor.svg';
import qaOcrIcon from '../../assets/dashboard/qa-ocr.svg';
import qaReferralIcon from '../../assets/dashboard/qa-referral.svg';
import qaReportIcon from '../../assets/dashboard/qa-report.svg';
import logCheckIcon from '../../assets/dashboard/log-check.svg';
import logAlertIcon from '../../assets/dashboard/log-alert.svg';
import logUserIcon from '../../assets/dashboard/log-user.svg';
import logBackupIcon from '../../assets/dashboard/log-backup.svg';

// Live Backend Services & Context
import { useAuth } from '../../context/AuthContext';
import {
  useDashboardStatsQuery,
  useDashboardSummaryQuery,
  useDoctorStatsQuery,
  useReferralStatsQuery,
  useOcrStatsQuery,
  useSystemHealthQuery,
  useObservabilityDashboardQuery,
  useActiveSessionsQuery,
  useAuditLogsQuery,
  usePriorityTasksQuery,
  formatRelativeTime,
  type PriorityTaskItem,
} from '../../services/dashboardService';

export interface AdminDashboardProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const activeNav = 'dashboard';
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [tasksPage, setTasksPage] = useState(1);
  const tasksPerPage = 6;

  // ============================================================================
  // Live Backend TanStack Query Hooks
  // ============================================================================
  const statsQuery = useDashboardStatsQuery();
  const summaryQuery = useDashboardSummaryQuery();
  const doctorStatsQuery = useDoctorStatsQuery();
  const referralStatsQuery = useReferralStatsQuery();
  const ocrStatsQuery = useOcrStatsQuery();
  const healthQuery = useSystemHealthQuery();
  const obsDashboardQuery = useObservabilityDashboardQuery();
  const sessionsQuery = useActiveSessionsQuery();
  const auditLogsQuery = useAuditLogsQuery();
  const priorityTasksQuery = usePriorityTasksQuery();

  // Navigation Helper
  const navigateTo = (path: string) => {
    setIsDrawerOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const handleLogout = async () => {
    setIsDrawerOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      await logout();
      navigateTo('/');
    }
  };

  const handleRefreshAll = async () => {
    setIsRefetching(true);
    setTasksPage(1);
    try {
      await Promise.allSettled([
        statsQuery.refetch(),
        summaryQuery.refetch(),
        doctorStatsQuery.refetch(),
        referralStatsQuery.refetch(),
        ocrStatsQuery.refetch(),
        healthQuery.refetch(),
        obsDashboardQuery.refetch(),
        sessionsQuery.refetch(),
        auditLogsQuery.refetch(),
        priorityTasksQuery.refetch(),
      ]);
    } finally {
      setTimeout(() => setIsRefetching(false), 500);
    }
  };

  // Safe Metric Derivations - strictly from live API contracts without hardcoded values
  const verifiedPatientsCount = statsQuery.data?.totalPatients ?? summaryQuery.data?.totalPatients;
  const verifiedDoctorsCount = doctorStatsQuery.data?.verifiedDoctors;
  const pendingOcrCount = ocrStatsQuery.data?.reviewRequiredJobs ?? statsQuery.data?.pendingOcrReviews ?? 0;
  const pendingReferralsCount = referralStatsQuery.data?.pendingTriageCount ?? 0;
  const activeUsersCount = obsDashboardQuery.data?.activeUsers;

  const newPatientsGrowth = summaryQuery.data?.growthMetrics?.newPatientsThisMonth;
  const newDoctorsGrowth = summaryQuery.data?.growthMetrics?.newDoctorsThisMonth;

  // Priority Tasks Pagination Derivations
  const totalTasks = priorityTasksQuery.data?.length || 0;
  const totalTaskPages = Math.max(1, Math.ceil(totalTasks / tasksPerPage));
  const paginatedTasks = priorityTasksQuery.data
    ? priorityTasksQuery.data.slice((tasksPage - 1) * tasksPerPage, tasksPage * tasksPerPage)
    : [];

  // Audit Logs Icon and Label Mapping
  const getLogMeta = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('FAILED') || act.includes('FAIL') || act.includes('ALERT') || act.includes('ERROR')) {
      return { icon: logAlertIcon, circleClass: 'log-icon-red', title: 'Failed Security Event' };
    }
    if (act.includes('LOGIN') || act.includes('OTP') || act.includes('AUTH') || act.includes('USER')) {
      return {
        icon: logUserIcon,
        circleClass: 'log-icon-gray',
        title: act.includes('OTP') ? 'Security OTP Requested' : 'User Authentication Event',
      };
    }
    if (act.includes('BACKUP') || act.includes('DATABASE') || act.includes('SYSTEM')) {
      return { icon: logBackupIcon, circleClass: 'log-icon-amber', title: 'System Maintenance Event' };
    }
    return {
      icon: logCheckIcon,
      circleClass: 'log-icon-cyan',
      title: action ? action.replace(/_/g, ' ') : 'System Operation Executed',
    };
  };

  // Priority Task Icon Helper
  const getTaskIcon = (iconKey: 'ocr' | 'referral' | 'doctor') => {
    switch (iconKey) {
      case 'ocr':
        return taskOcrIcon;
      case 'referral':
        return taskReferralIcon;
      case 'doctor':
      default:
        return taskDoctorIcon;
    }
  };

  return (
    <div className="careid-dashboard-shell" data-node-id="20:151" aria-label="CareID Admin Portal Dashboard">
      {/* Mobile Drawer Backdrop */}
      <div
        className={`careid-drawer-backdrop ${isDrawerOpen ? 'drawer-open' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* ====================================================================
          20:444: PERSISTENT RESPONSIVE SIDEBAR
          ==================================================================== */}
      <AdminSidebar
        activeNav={activeNav}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={navigateTo}
        onLogout={handleLogout}
        ctaLabel="+ New Record"
        onCtaClick={() => navigateTo('/admin/records/upload')}
      />

      {/* ====================================================================
          20:152: MAIN CONTENT WRAPPER
          ==================================================================== */}
      <div className="careid-main-wrapper" data-node-id="20:152">
        {/* 20:153: Top Navigation Bar */}
        <header className="careid-top-navbar" data-node-id="20:153">
          <div className="header-left-cluster">
            {/* Hamburger menu for mobile/tablet */}
            <button
              type="button"
              className="header-menu-toggle"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>

            {/* Quick shortcuts connected to live routes */}
            <nav className="header-nav-shortcuts" data-node-id="20:154" aria-label="Quick Navigation">
              <button
                type="button"
                className="header-shortcut-btn"
                onClick={() => navigateTo('/admin/doctors/create')}
                data-node-id="20:155"
              >
                {t('dashboard.header.addDoctor')}
              </button>
              <button
                type="button"
                className="header-shortcut-btn"
                onClick={() => navigateTo('/admin/ocr/queue')}
                data-node-id="20:157"
              >
                {t('dashboard.header.approveOcr')}
              </button>
              <button
                type="button"
                className="header-shortcut-btn"
                onClick={() => navigateTo('/admin/referrals/escalations')}
                data-node-id="20:159"
              >
                {t('dashboard.header.reviewReferral')}
              </button>
              <button
                type="button"
                className="header-shortcut-btn"
                onClick={() => navigateTo('/admin/reports')}
                data-node-id="20:161"
              >
                {t('dashboard.header.generateReport')}
              </button>
            </nav>
          </div>

          <div className="header-right-cluster">
            {/* Security & Compliance Button */}
            <button
              type="button"
              className="header-security-btn"
              onClick={() => navigateTo('/admin/security-compliance')}
              data-node-id="20:163"
              title="View system security and compliance controls"
            >
              {t('dashboard.securityCompliance')}
            </button>

            {/* Right Controls */}
            <div className="header-controls" data-node-id="20:166">
              {/* Notifications */}
              <button
                type="button"
                className="header-icon-btn"
                onClick={() => {
                  navigateTo('/admin/notifications');
                }}
                title="Notifications"
                data-node-id="20:168"
              >
                <img src={headerBellIcon} alt="Notifications" data-node-id="20:168" />
                {auditLogsQuery.data?.some((l) => l.action.includes('FAIL')) && (
                  <span className="notification-dot" data-node-id="20:170" aria-label="Unread notification" />
                )}
              </button>

              {/* Settings */}
              <button
                type="button"
                className="header-icon-btn"
                onClick={() => navigateTo('/admin/settings/general')}
                title="System Audit & Settings"
                data-node-id="20:171"
              >
                <img src={headerSettingsIcon} alt="Settings" data-node-id="20:172" />
              </button>

              {/* Admin Avatar */}
              <button
                type="button"
                className="header-avatar-btn"
                onClick={() => navigateTo('/admin/profile')}
                title={`My Profile & Information (${user?.email || 'Administrator'})`}
                aria-label="My Profile & Information"
                data-node-id="20:174"
              >
                <img src={headerAvatarImg} alt="User Avatar" data-node-id="20:176" />
              </button>
            </div>
          </div>
        </header>

        {/* 20:177: Main Canvas */}
        <main className="careid-main-canvas" data-node-id="20:177">
          {/* 20:179: Heading & Header Actions */}
          <div className="dashboard-heading-section" data-node-id="20:179">
            <div className="dashboard-title-area" data-node-id="20:180">
              <h1 className="dashboard-heading-title" data-node-id="20:182">
                {t('dashboard.title')}
              </h1>
              <p className="dashboard-heading-subtitle" data-node-id="20:184">
                {t('dashboard.subtitle')}
              </p>
            </div>

            <div className="dashboard-header-actions" data-node-id="20:185">
              {/* Live Refresh Button */}
              <button
                type="button"
                className={`header-refresh-btn ${isRefetching ? 'spinning' : ''}`}
                onClick={handleRefreshAll}
                title="Refresh live metrics from API"
              >
                <RefreshCw size={14} />
                <span>{isRefetching ? t('dashboard.refreshing', 'Syncing...') : t('dashboard.refresh', 'Refresh')}</span>
              </button>

              <button
                type="button"
                className="btn-export-data"
                onClick={() => navigateTo('/admin/reports/system-health')}
                data-node-id="20:186"
              >
                {t('dashboard.exportData')}
              </button>
              <button
                type="button"
                className="btn-new-record"
                onClick={() => navigateTo('/admin/records/upload')}
                data-node-id="20:188"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span data-node-id="20:191">{t('dashboard.newRecord')}</span>
              </button>
            </div>
          </div>

          {/* 20:192: Fluid Responsive Dashboard Content Grid */}
          <div className="dashboard-grid-container" data-node-id="20:192">
            {/* --------------------------------------------------------------
                20:193: Left Column (Metrics + Table)
                -------------------------------------------------------------- */}
            <div className="dashboard-left-column" data-node-id="20:193">
              {/* 20:194: Bento Grid (6 Summary KPI Cards) */}
              <section className="bento-metrics-grid" data-node-id="20:194" aria-label="Key Performance Indicators">
                {/* Card 1: Verified Patients */}
                <article
                  className="bento-metric-card cursor-pointer transition-transform hover:scale-[1.01]"
                  data-node-id="20:195"
                  onClick={() => navigateTo('/admin/patients')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigateTo('/admin/patients');
                  }}
                  aria-label="View Patient Directory"
                >
                  <div className="card-ambient-blur blur-teal" data-node-id="20:196" />
                  <div className="card-top-row" data-node-id="20:197">
                    <div className="card-icon-box" data-node-id="20:198">
                      <img src={kpiPatientsIcon} alt="" data-node-id="20:200" />
                    </div>
                    {statsQuery.isError && summaryQuery.isError ? (
                      <span className="badge-error-state">
                        <button
                          type="button"
                          className="card-retry-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            statsQuery.refetch();
                            summaryQuery.refetch();
                          }}
                        >
                          Retry
                        </button>
                      </span>
                    ) : newPatientsGrowth !== undefined ? (
                      <span className="card-badge badge-mint" data-node-id="20:201">
                        <TrendingUp size={13} strokeWidth={2.5} />
                        <span data-node-id="20:204">
                          +{newPatientsGrowth}
                        </span>
                      </span>
                    ) : null}
                  </div>
                  <div className="card-bottom-row" data-node-id="20:205">
                    <div className="card-data-info" data-node-id="20:206">
                      <span className="card-data-label" data-node-id="20:207">
                        {t('dashboard.kpi.verifiedPatients', 'VERIFIED PATIENTS')}
                      </span>
                      <span className="card-data-value" data-node-id="20:209">
                        {statsQuery.isLoading || summaryQuery.isLoading ? (
                          <span className="skeleton-pulse" />
                        ) : statsQuery.isError && summaryQuery.isError ? (
                          <span style={{ fontSize: '15px', color: '#ba1a1a' }}>Unavailable</span>
                        ) : verifiedPatientsCount !== undefined ? (
                          verifiedPatientsCount.toLocaleString()
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>
                  </div>
                </article>

                {/* Card 2: Verified Doctors */}
                <article
                  className="bento-metric-card cursor-pointer transition-transform hover:scale-[1.01]"
                  data-node-id="20:210"
                  onClick={() => navigateTo('/admin/doctors')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigateTo('/admin/doctors');
                  }}
                  aria-label="View Doctor Directory"
                >
                  <div className="card-ambient-blur blur-purple" data-node-id="20:211" />
                  <div className="card-top-row" data-node-id="20:212">
                    <div className="card-icon-box" data-node-id="20:213">
                      <img src={kpiDoctorsIcon} alt="" data-node-id="20:215" />
                    </div>
                    {doctorStatsQuery.isError ? (
                      <span className="badge-error-state">
                        <button
                          type="button"
                          className="card-retry-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            doctorStatsQuery.refetch();
                          }}
                        >
                          Retry
                        </button>
                      </span>
                    ) : newDoctorsGrowth !== undefined ? (
                      <span className="card-badge badge-mint" data-node-id="20:216">
                        <TrendingUp size={13} strokeWidth={2.5} />
                        <span data-node-id="20:219">
                          +{newDoctorsGrowth}
                        </span>
                      </span>
                    ) : null}
                  </div>
                  <div className="card-bottom-row" data-node-id="20:220">
                    <div className="card-data-info" data-node-id="20:221">
                      <span className="card-data-label" data-node-id="20:222">
                        {t('dashboard.kpi.verifiedDoctors', 'VERIFIED DOCTORS')}
                      </span>
                      <span className="card-data-value" data-node-id="20:224">
                        {doctorStatsQuery.isLoading ? (
                          <span className="skeleton-pulse" />
                        ) : doctorStatsQuery.isError ? (
                          <span style={{ fontSize: '15px', color: '#ba1a1a' }}>Unavailable</span>
                        ) : verifiedDoctorsCount !== undefined ? (
                          verifiedDoctorsCount.toLocaleString()
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>
                  </div>
                </article>

                {/* Card 3: Active Users (Now) */}
                <article
                  className="bento-metric-card"
                  data-node-id="20:225"
                  title="Live active users reported by /api/v1/observability/dashboard telemetry"
                >
                  <div className="card-ambient-blur blur-yellow" data-node-id="20:226" />
                  <div className="card-top-row" data-node-id="20:227">
                    <div className="card-icon-box" data-node-id="20:228">
                      <img src={kpiUsersIcon} alt="" data-node-id="20:230" />
                    </div>
                    {obsDashboardQuery.isError ? (
                      <span className="card-badge badge-amber-outline">
                        <span>{t('dashboard.kpi.metricUnavailable')}</span>
                      </span>
                    ) : (
                      <span className="card-badge badge-live" data-node-id="20:231">
                        <span data-node-id="20:232">{t('dashboard.kpi.live')}</span>
                      </span>
                    )}
                  </div>
                  <div className="card-bottom-row" data-node-id="20:233">
                    <div className="card-data-info" data-node-id="20:234">
                      <span className="card-data-label" data-node-id="20:235">
                        {t('dashboard.kpi.activeUsers')}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span className="card-data-value" data-node-id="20:237">
                          {obsDashboardQuery.isLoading ? (
                            <span className="skeleton-pulse" />
                          ) : obsDashboardQuery.isError ? (
                            <span style={{ fontSize: '15px', color: '#ba1a1a' }}>Unavailable</span>
                          ) : activeUsersCount !== undefined ? (
                            activeUsersCount.toLocaleString()
                          ) : (
                            '—'
                          )}
                        </span>
                        <span style={{ fontSize: '11px', color: '#7a7585' }}>
                          Concurrent online
                        </span>
                      </div>
                    </div>
                  </div>
                </article>

                {/* Card 4: Pending OCR */}
                <article className="bento-metric-card card-ocr" data-node-id="20:238">
                  <div className="card-ambient-blur blur-red" data-node-id="20:239" />
                  <div className="card-top-row" data-node-id="20:240">
                    <div
                      className={`card-icon-box ${pendingOcrCount > 0 ? 'icon-box-red' : 'icon-box-cyan'}`}
                      data-node-id="20:241"
                    >
                      <img src={kpiOcrIcon} alt="" data-node-id="20:243" />
                    </div>
                    {ocrStatsQuery.isError && statsQuery.isError ? (
                      <span className="badge-error-state">
                        <button
                          type="button"
                          className="card-retry-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            ocrStatsQuery.refetch();
                            statsQuery.refetch();
                          }}
                        >
                          Retry
                        </button>
                      </span>
                    ) : pendingOcrCount > 0 ? (
                      <span className="card-badge badge-red-outline" data-node-id="20:244">
                        <span data-node-id="20:245">{t('dashboard.kpi.attentionRequired')}</span>
                      </span>
                    ) : (
                      <span className="card-badge badge-mint" style={{ border: '1px solid rgba(0,106,96,0.2)' }}>
                        <span>{t('dashboard.kpi.allVerified')}</span>
                      </span>
                    )}
                  </div>
                  <div className="card-bottom-row" data-node-id="20:246">
                    <div className="card-data-info" data-node-id="20:247">
                      <span className={`card-data-label ${pendingOcrCount > 0 ? 'label-red' : 'label-teal'}`} data-node-id="20:249">
                        {t('dashboard.kpi.pendingOcr')}
                      </span>
                      <span className="card-data-value" data-node-id="20:251">
                        {ocrStatsQuery.isLoading && statsQuery.isLoading ? (
                          <span className="skeleton-pulse" />
                        ) : ocrStatsQuery.isError && statsQuery.isError ? (
                          <span style={{ fontSize: '15px', color: '#ba1a1a' }}>Unavailable</span>
                        ) : (
                          pendingOcrCount.toLocaleString()
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="card-arrow-btn"
                      onClick={() => navigateTo('/admin/ocr/queue')}
                      data-node-id="20:252"
                      title="Open OCR verification queue"
                    >
                      <ArrowRight size={18} color={pendingOcrCount > 0 ? '#ba1a1a' : '#006a60'} strokeWidth={2.5} />
                    </button>
                  </div>
                </article>

                {/* Card 5: Pending Referrals */}
                <article className="bento-metric-card card-referrals" data-node-id="20:255">
                  <div className="card-ambient-blur blur-yellow" data-node-id="20:256" />
                  <div className="card-top-row" data-node-id="20:257">
                    <div
                      className={`card-icon-box ${pendingReferralsCount > 0 ? 'icon-box-amber' : 'icon-box-cyan'}`}
                      data-node-id="20:258"
                    >
                      <img src={kpiReferralsIcon} alt="" data-node-id="20:260" />
                    </div>
                    {pendingReferralsCount > 0 ? (
                      <span className="card-badge badge-amber-outline" data-node-id="20:261">
                        <span data-node-id="20:262">{t('dashboard.kpi.warning')}</span>
                      </span>
                    ) : (
                      <span className="card-badge badge-mint" style={{ border: '1px solid rgba(0,106,96,0.2)' }}>
                        <span>{t('dashboard.kpi.upToDate')}</span>
                      </span>
                    )}
                  </div>
                  <div className="card-bottom-row" data-node-id="20:263">
                    <div className="card-data-info" data-node-id="20:264">
                      <span
                        className={`card-data-label ${pendingReferralsCount > 0 ? 'label-amber' : 'label-teal'}`}
                        data-node-id="20:266"
                      >
                        {t('dashboard.kpi.pendingReferrals')}
                      </span>
                      <span className="card-data-value" data-node-id="20:268">
                        {referralStatsQuery.isLoading ? (
                          <span className="skeleton-pulse" />
                        ) : (
                          pendingReferralsCount.toLocaleString()
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="card-arrow-btn"
                      onClick={() => navigateTo('/admin/referrals/escalations')}
                      data-node-id="20:269"
                      title="Open referral review and escalations"
                    >
                      <ArrowRight size={18} color={pendingReferralsCount > 0 ? '#5b4300' : '#006a60'} strokeWidth={2.5} />
                    </button>
                  </div>
                </article>

                {/* Card 6: System Health */}
                <article
                  className="bento-metric-card card-system"
                  data-node-id="20:272"
                  title={`Live latency: ${healthQuery.data?.latencyMs || 0}ms. Service: ${healthQuery.data?.service || 'HVAPI'}`}
                >
                  <div className="card-ambient-blur blur-teal" data-node-id="20:273" />
                  <div className="card-top-row" data-node-id="20:274">
                    <div className="card-icon-box icon-box-cyan" data-node-id="20:275">
                      <img src={kpiApiIcon} alt="" data-node-id="20:277" />
                    </div>
                    <span
                      className={`card-badge ${healthQuery.data?.isHealthy ? 'badge-mint' : 'badge-amber-outline'}`}
                      style={{ border: '1px solid rgba(0,106,96,0.2)' }}
                      data-node-id="20:278"
                    >
                      <span data-node-id="20:279">
                        {healthQuery.isLoading
                          ? 'Checking...'
                          : healthQuery.data?.isHealthy
                          ? t('dashboard.kpi.healthy')
                          : t('dashboard.kpi.degraded')}
                      </span>
                    </span>
                  </div>
                  <div className="card-bottom-row" data-node-id="20:280">
                    <div className="card-data-info" data-node-id="20:281">
                      <span className="card-data-label label-teal" data-node-id="20:283">
                        {t('dashboard.kpi.systemApi')}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span className="card-data-value" data-node-id="20:285">
                          {healthQuery.isLoading ? (
                            <span className="skeleton-pulse" />
                          ) : healthQuery.isError ? (
                            <span style={{ fontSize: '15px', color: '#ba1a1a' }}>Unavailable</span>
                          ) : healthQuery.data?.isHealthy ? (
                            'UP'
                          ) : (
                            'Degraded'
                          )}
                        </span>
                        <span style={{ fontSize: '11px', color: '#494552' }} data-node-id="20:286">
                          {healthQuery.data?.latencyMs ? `${healthQuery.data.latencyMs}ms` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="sparkline-container" data-node-id="20:287" title={`Probe Latency: ${healthQuery.data?.latencyMs || 0}ms`}>
                      <div className="sparkline-bar" style={{ height: '9px' }} data-node-id="20:288" />
                      <div className="sparkline-bar" style={{ height: '14px' }} data-node-id="20:289" />
                      <div className="sparkline-bar" style={{ height: '19px' }} data-node-id="20:290" />
                      <div className="sparkline-bar" style={{ height: '12px' }} data-node-id="20:291" />
                      <div className="sparkline-bar" style={{ height: '21px' }} data-node-id="20:292" />
                      <div className="sparkline-bar" style={{ height: '24px' }} data-node-id="20:293" />
                    </div>
                  </div>
                </article>
              </section>

              {/* 20:294: High Priority Tasks Table Area */}
              <section className="priority-tasks-card" data-node-id="20:294" aria-label="High Priority Tasks">
                <header className="tasks-card-header" data-node-id="20:295">
                  <div className="tasks-header-title-box" data-node-id="20:296">
                    <h2 className="tasks-header-title" data-node-id="20:298">
                      {t('dashboard.tasks.title')}
                    </h2>
                    <p className="tasks-header-subtitle" data-node-id="20:300">
                      {t('dashboard.tasks.subtitle')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="tasks-view-all-btn"
                    onClick={() => navigateTo('/admin/ocr/queue')}
                    data-node-id="20:301"
                  >
                    {t('dashboard.tasks.viewAll')}
                  </button>
                </header>

                <div className="tasks-table-scroll-wrapper" data-node-id="20:303">
                  <table className="tasks-table">
                    <thead>
                      <tr data-node-id="20:304">
                        <th data-node-id="20:306">{t('dashboard.tasks.headers.taskType')}</th>
                        <th data-node-id="20:308">{t('dashboard.tasks.headers.entity')}</th>
                        <th data-node-id="20:310">{t('dashboard.tasks.headers.submitted')}</th>
                        <th data-node-id="20:312">{t('dashboard.tasks.headers.status')}</th>
                        <th data-node-id="20:314">{t('dashboard.tasks.headers.action')}</th>
                      </tr>
                    </thead>
                    <tbody data-node-id="20:315">
                      {priorityTasksQuery.isLoading ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '24px', textAlign: 'center' }}>
                            <span className="skeleton-pulse" style={{ width: '80%' }} />
                          </td>
                        </tr>
                      ) : priorityTasksQuery.isError ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#ba1a1a', fontSize: '13px' }}>
                            <span>Failed to load high priority tasks from API. </span>
                            <button
                              type="button"
                              onClick={() => priorityTasksQuery.refetch()}
                              style={{ textDecoration: 'underline', color: '#28006d', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              Retry
                            </button>
                          </td>
                        </tr>
                      ) : paginatedTasks.length > 0 ? (
                        paginatedTasks.map((task: PriorityTaskItem) => (
                          <tr key={task.id}>
                            <td>
                              <div className="task-type-cell">
                                <span className="task-type-icon">
                                  <img src={getTaskIcon(task.typeIconKey)} alt="" />
                                </span>
                                <span>{task.taskType}</span>
                              </div>
                            </td>
                            <td>
                              <span className="task-entity-text">{task.entity}</span>
                            </td>
                            <td>
                              <span className="task-time-text">{task.submittedAt}</span>
                            </td>
                            <td className="task-status-cell">
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                                <span
                                  className={`task-status-badge ${
                                    task.status === 'Critical' || task.status === 'Escalated'
                                      ? 'status-critical'
                                      : task.status === 'Pending' || task.status === 'Submitted'
                                      ? 'status-pending'
                                      : 'status-review'
                                  }`}
                                >
                                  {task.status}
                                </span>
                                {task.priority && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 600,
                                      color:
                                        task.priority === 'Critical'
                                          ? '#ba1a1a'
                                          : task.priority === 'Urgent' || task.priority === 'High'
                                          ? '#5b4300'
                                          : '#494552',
                                      paddingLeft: '2px',
                                    }}
                                  >
                                    {task.priority} Priority
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="task-action-cell">
                              <button
                                type="button"
                                className={task.isPrimaryAction ? 'btn-table-action-primary' : 'btn-table-action-outline'}
                                onClick={() => navigateTo(task.actionPath)}
                              >
                                {task.actionLabel}
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5}>
                            <div className="dashboard-empty-state">
                              <div className="empty-state-icon-box">
                                <CheckCircle2 size={24} />
                              </div>
                              <h3 className="empty-state-title">{t('dashboard.emptyTasksTitle')}</h3>
                              <p className="empty-state-desc">{t('dashboard.emptyTasksDesc')}</p>
                              <button
                                type="button"
                                className="empty-state-btn"
                                onClick={() => priorityTasksQuery.refetch()}
                              >
                                <RefreshCw size={13} />
                                <span>{t('dashboard.refresh')}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Task Pagination Footer */}
                {totalTasks > tasksPerPage && (
                  <footer className="tasks-card-footer">
                    <span className="tasks-pagination-text">
                      Showing {(tasksPage - 1) * tasksPerPage + 1} to {Math.min(tasksPage * tasksPerPage, totalTasks)} of {totalTasks} actionable tasks
                    </span>
                    <div className="tasks-pagination-controls">
                      <button
                        type="button"
                        className="tasks-page-btn"
                        disabled={tasksPage <= 1}
                        onClick={() => setTasksPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <span className="tasks-page-indicator">
                        {tasksPage} / {totalTaskPages}
                      </span>
                      <button
                        type="button"
                        className="tasks-page-btn"
                        disabled={tasksPage >= totalTaskPages}
                        onClick={() => setTasksPage((p) => Math.min(totalTaskPages, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  </footer>
                )}
              </section>
            </div>

            {/* --------------------------------------------------------------
                20:361: Right Column (Quick Actions & System Logs)
                -------------------------------------------------------------- */}
            <div className="dashboard-right-column" data-node-id="20:361">
              {/* 20:362: Quick Actions Grid */}
              <section className="quick-actions-card" data-node-id="20:362" aria-label="Quick Actions">
                <h2 className="quick-actions-title" data-node-id="20:364">
                  {t('dashboard.quickActions.title')}
                </h2>
                <div className="quick-actions-grid" data-node-id="20:365">
                  <button
                    type="button"
                    className="quick-action-btn"
                    onClick={() => navigateTo('/admin/doctors/create')}
                    data-node-id="20:366"
                  >
                    <img src={qaDoctorIcon} alt="" data-node-id="20:368" />
                    <span data-node-id="20:370">{t('dashboard.quickActions.addDoctor')}</span>
                  </button>

                  <button
                    type="button"
                    className="quick-action-btn"
                    onClick={() => navigateTo('/admin/ocr/queue')}
                    data-node-id="20:371"
                  >
                    <img src={qaOcrIcon} alt="" data-node-id="20:373" />
                    <span data-node-id="20:375">{t('dashboard.quickActions.approveOcr')}</span>
                  </button>

                  <button
                    type="button"
                    className="quick-action-btn"
                    onClick={() => navigateTo('/admin/referrals/escalations')}
                    data-node-id="20:376"
                  >
                    <img src={qaReferralIcon} alt="" data-node-id="20:378" />
                    <span data-node-id="20:380">{t('dashboard.quickActions.reviewReferral')}</span>
                  </button>

                  <button
                    type="button"
                    className="quick-action-btn"
                    onClick={() => navigateTo('/admin/reports')}
                    data-node-id="20:381"
                  >
                    <img src={qaReportIcon} alt="" data-node-id="20:383" />
                    <span data-node-id="20:385">{t('dashboard.quickActions.generateReport')}</span>
                  </button>
                </div>
              </section>

              {/* 20:386: System Logs Activity Feed */}
              <section className="system-logs-card" data-node-id="20:386" aria-label="System Activity Logs">
                <header className="system-logs-header" data-node-id="20:387">
                  <h2 className="system-logs-title" data-node-id="20:389">
                    {t('dashboard.systemLogs.title')}
                  </h2>
                  <button
                    type="button"
                    className="system-logs-kebab-btn"
                    onClick={() => navigateTo('/admin/audit-dashboard')}
                    title="Audit Log Options"
                    data-node-id="20:390"
                  >
                    <MoreVertical size={16} />
                  </button>
                </header>

                <div className="system-logs-list" data-node-id="20:393">
                  {auditLogsQuery.isLoading ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                      <span className="skeleton-pulse" style={{ width: '90%' }} />
                    </div>
                  ) : auditLogsQuery.isError ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#ba1a1a', fontSize: '13px' }}>
                      <span>Failed to load system audit trail. </span>
                      <button
                        type="button"
                        onClick={() => auditLogsQuery.refetch()}
                        style={{ textDecoration: 'underline', color: '#28006d', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Retry
                      </button>
                    </div>
                  ) : auditLogsQuery.data && auditLogsQuery.data.length > 0 ? (
                    auditLogsQuery.data.slice(0, 4).map((log) => {
                      const meta = getLogMeta(log.action);
                      return (
                        <div key={log.id} className="log-item-row" data-node-id="20:394">
                          <div className="log-item-connector" data-node-id="20:398" />
                          <div className={`log-item-icon-circle ${meta.circleClass}`} data-node-id="20:395">
                            <img src={meta.icon} alt="" data-node-id="20:397" />
                          </div>
                          <div className="log-item-content" data-node-id="20:399">
                            <span className="log-item-time" data-node-id="20:401">
                              {formatRelativeTime(log.createdAt)}
                            </span>
                            <strong className="log-item-title" data-node-id="20:403">
                              {meta.title}
                            </strong>
                            <p className="log-item-desc" data-node-id="20:405">
                              {log.details || `Action ${log.action} executed`}
                              {log.ipAddress ? ` (IP: ${log.ipAddress})` : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#7a7585', fontSize: '13px' }}>
                      {t('dashboard.emptyLogs')}
                    </div>
                  )}
                </div>

                <footer className="system-logs-footer" data-node-id="20:441">
                  <button
                    type="button"
                    className="system-logs-view-all-btn"
                    onClick={() => navigateTo('/admin/audit-dashboard')}
                    data-node-id="20:442"
                  >
                    {t('dashboard.systemLogs.viewFull')}
                  </button>
                </footer>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
