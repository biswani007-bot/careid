import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Search,
  Bell,
  History,
  HelpCircle,
  Calendar,
  ChevronDown,
  FileDown,
  TrendingUp,
  Timer,
  AlertTriangle,
  MoreVertical,
  X,
} from 'lucide-react';

import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import {
  useReferralActivityReportQuery,
  type ReferralActivityReportData,
} from '../../services/referralReportService';
import './AdminReferralActivityReport.css';

export interface AdminReferralActivityReportProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminReferralActivityReport: React.FC<AdminReferralActivityReportProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Navigation handler
  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  // State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [isHospitalMenuOpen, setIsHospitalMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Server state query
  const { data: reportData, isLoading } = useReferralActivityReportQuery(dateRange);
  const data: ReferralActivityReportData = reportData || {
    totalVolume: {
      value: 0,
      formattedValue: isLoading ? '...' : '0',
      trend: 'Platform data',
      subtext: 'requests logged',
    },
    avgCompletionTime: {
      value: isLoading ? '...' : '0',
      unit: 'Days',
      trend: 'Average',
    },
    escalatedPriority: {
      value: '0',
      unit: 'Cases',
      trend: '0 SLA breaches',
    },
    pipelineStatus: [],
    hospitalDistribution: [],
    topDepartments: [],
  };

  // Dynamic sparkline bar heights derived from live volume
  const sparklineHeights = useMemo(() => {
    if (data.totalVolume.value === 0) {
      return [4, 4, 4, 4, 4, 4, 4, 4, 4];
    }
    const base = Math.min(100, Math.max(30, data.totalVolume.value * 25));
    return [
      Math.round(base * 0.3),
      Math.round(base * 0.45),
      Math.round(base * 0.35),
      Math.round(base * 0.6),
      Math.round(base * 0.55),
      Math.round(base * 0.7),
      Math.round(base * 0.65),
      Math.round(base * 0.9),
      base,
    ];
  }, [data.totalVolume.value]);

  const handleExportPdf = () => {
    showToast(t('common.exportStarted', 'Exporting Referral Activity Report PDF...'));
    window.print();
  };

  return (
    <div
      className="referral-activity-wrapper"
      data-node-id="20:6510"
      data-name="Admin Portal - Referral Activity Report"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-[#191c1e] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <div className="w-2 h-2 rounded-full bg-[#85f6e5]" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-gray-400 hover:text-white ml-2"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Primary Left Navigation Bar (Shared Component with Reports Active) */}
      <AdminSidebar
        activeNav="reports"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
        ctaLabel="+ New Record"
        onCtaClick={() => handleNav('/admin/records/upload')}
      />

      {/* Main Content Layout Container */}
      <div className="referral-activity-main flex-1 min-w-0 w-full flex flex-col h-screen overflow-hidden">
        {/* Stationary Top Global Navigation Bar (Figma 20:6512) */}
        <header className="referral-activity-top-navbar" role="banner">
          <div className="referral-activity-top-left">
            {/* Mobile Drawer Toggle */}
            <button
              type="button"
              className="p-2 -ml-2 text-[#494552] hover:text-[#28006d] md:hidden rounded-lg"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>

            {/* Header Title: Referral Management (Exact match to Figma 20:6515) */}
            <h2 className="referral-activity-header-title">
              {t('referralActivityReport.header.title', 'Referral Management')}
            </h2>

            {/* Search Bar (Figma 20:6516) */}
            <div className="referral-activity-search-bar">
              <Search size={15} className="referral-activity-search-icon" aria-hidden="true" />
              <input
                type="text"
                className="referral-activity-search-input"
                placeholder={t(
                  'referralActivityReport.header.searchPlaceholder',
                  'Search patients, providers, or IDs...'
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search patients, providers, or IDs"
              />
            </div>
          </div>

          <div className="referral-activity-top-right">
            {/* Notification Bell (Figma 20:6523) */}
            <button
              type="button"
              className="referral-activity-icon-btn"
              title={t('common.notifications', 'Notifications')}
              aria-label="View notifications"
            >
              <Bell size={18} />
            </button>

            {/* History / Clock Icon (Figma 20:6526) */}
            <button
              type="button"
              className="referral-activity-icon-btn"
              title={t('common.history', 'History')}
              aria-label="View history"
              onClick={() => handleNav('/admin/referrals/audit')}
            >
              <History size={18} />
            </button>

            {/* Help Icon (Figma 20:6529) */}
            <button
              type="button"
              className="referral-activity-icon-btn"
              title={t('common.help', 'Help')}
              aria-label="Get help"
            >
              <HelpCircle size={18} />
            </button>

            {/* Vertical Divider (Figma 20:6533) */}
            <div className="referral-activity-divider" aria-hidden="true" />

            {/* Administrator Profile (Figma 20:6534) */}
            <button
              type="button"
              className="referral-activity-avatar-btn"
              onClick={() => handleNav('/admin/profile')}
              aria-label="My Profile & Information"
              title="My Profile & Information"
            >
              <div className="referral-activity-avatar-circle">
                <AdminProfileAvatar size="full" />
              </div>
              <ChevronDown size={12} className="text-[#494552]" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Scrollable Canvas Body (Figma 20:6538) */}
        <main className="referral-activity-canvas">
          {/* Page Heading & Actions (Figma 20:6539) */}
          <div className="referral-activity-header">
            <div className="referral-activity-title-group">
              <h1 className="referral-activity-title">
                {t('referralActivityReport.page.title', 'Referral Activity Report')}
              </h1>
              <p className="referral-activity-subtitle">
                {t(
                  'referralActivityReport.page.description',
                  'Comprehensive overview of inbound and outbound referral metrics.'
                )}
              </p>
            </div>

            <div className="referral-activity-actions">
              {/* Date Range Selector Dropdown (Figma 20:6546) */}
              <div className="relative">
                <button
                  type="button"
                  className="referral-activity-date-btn"
                  onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                  aria-expanded={isDateMenuOpen}
                  aria-haspopup="listbox"
                >
                  <Calendar size={16} className="text-[#494552]" aria-hidden="true" />
                  <span>{dateRange}</span>
                  <ChevronDown size={16} className="text-[#494552]" aria-hidden="true" />
                </button>

                {isDateMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-44 bg-white border border-[#cbc4d4] rounded-lg shadow-xl z-30 py-1"
                    role="listbox"
                  >
                    {['Last 7 Days', 'Last 30 Days', 'Last 90 Days'].map((range) => (
                      <button
                        key={range}
                        type="button"
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-[#edeef0] transition-colors ${
                          dateRange === range ? 'font-bold text-[#28006d]' : 'text-[#191c1e]'
                        }`}
                        onClick={() => {
                          setDateRange(range);
                          setIsDateMenuOpen(false);
                          showToast(`Filtered by ${range}`);
                        }}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Export PDF Button (Figma 20:6555) */}
              <button
                type="button"
                className="referral-activity-export-btn"
                onClick={handleExportPdf}
                aria-label="Export Referral Activity Report as PDF"
              >
                <FileDown size={14} aria-hidden="true" />
                <span>{t('referralActivityReport.page.exportPdf', 'Export PDF')}</span>
              </button>
            </div>
          </div>

          {/* Top Metrics Bento Grid (Figma 20:6559) */}
          <section className="referral-activity-top-grid" aria-label="Top Referral Metrics">
            {/* Highlight Card: Total Referral Volume (Spans 2 columns) (Figma 20:6588) */}
            <article
              className="referral-activity-card-volume"
              aria-labelledby="heading-total-volume"
            >
              <div className="referral-activity-volume-glow" aria-hidden="true" />

              <div className="referral-activity-volume-top">
                <h3 id="heading-total-volume" className="referral-activity-volume-title">
                  {t('referralActivityReport.kpis.totalVolume', 'Total Referral Volume')}
                </h3>
                <div className="referral-activity-volume-badge">
                  <TrendingUp size={12} className="shrink-0" aria-hidden="true" />
                  <span>{data.totalVolume.trend}</span>
                </div>
              </div>

              <div className="referral-activity-volume-metric">
                <span className="referral-activity-volume-number">
                  {data.totalVolume.formattedValue}
                </span>
                <span className="referral-activity-volume-subtext">
                  {t('referralActivityReport.kpis.requestsLogged', 'requests logged')}
                </span>
              </div>

              {/* Simulated Sparkline Chart (Figma 20:6602) */}
              <div
                className="referral-activity-sparkline"
                aria-hidden="true"
                role="img"
                aria-label="Volume sparkline trend"
              >
                {sparklineHeights.map((pct, idx) => (
                  <div
                    key={idx}
                    className="referral-activity-spark-bar"
                    style={{
                      height: `${pct}%`,
                      backgroundColor: idx === sparklineHeights.length - 1 ? '#ab8efd' : `rgba(171, 142, 253, ${(idx + 3) * 0.08})`,
                    }}
                  />
                ))}
              </div>
            </article>

            {/* KPI Card 2: Average Completion Time (Figma 20:6560) */}
            <article
              className="referral-activity-kpi-card"
              aria-labelledby="heading-avg-completion"
            >
              <div className="referral-activity-kpi-top">
                <div className="referral-activity-icon-bubble-yellow" aria-hidden="true">
                  <Timer size={18} />
                </div>
                <span className="referral-activity-badge-teal">
                  {data.avgCompletionTime.trend}
                </span>
              </div>

              <div className="referral-activity-kpi-bottom">
                <span id="heading-avg-completion" className="referral-activity-kpi-label">
                  {t('referralActivityReport.kpis.avgCompletionTime', 'AVG COMPLETION TIME')}
                </span>
                <div className="referral-activity-kpi-val">
                  <span>{data.avgCompletionTime.value}</span>
                  <span className="referral-activity-kpi-unit">
                    {t('referralActivityReport.kpis.days', 'Days')}
                  </span>
                </div>
              </div>
            </article>

            {/* KPI Card 3: Escalated Priority (Figma 20:6574) */}
            <article
              className="referral-activity-kpi-card"
              aria-labelledby="heading-escalated-priority"
            >
              <div className="referral-activity-kpi-top">
                <div className="referral-activity-icon-bubble-red" aria-hidden="true">
                  <AlertTriangle size={18} />
                </div>
                <span className="referral-activity-badge-red">
                  {data.escalatedPriority.trend}
                </span>
              </div>

              <div className="referral-activity-kpi-bottom">
                <span id="heading-escalated-priority" className="referral-activity-kpi-label">
                  {t('referralActivityReport.kpis.escalatedPriority', 'ESCALATED PRIORITY')}
                </span>
                <div className="referral-activity-kpi-val">
                  <span>{data.escalatedPriority.value}</span>
                  <span className="referral-activity-kpi-unit">
                    {t('referralActivityReport.kpis.cases', 'Cases')}
                  </span>
                </div>
              </div>
            </article>
          </section>

          {/* Bottom Section Bento Grid: Status Breakdown & Charts (Figma 20:6612) */}
          <section
            className="referral-activity-bottom-grid"
            aria-label="Breakdown and Department Distributions"
          >
            {/* Column 1: Pipeline Status (Span 4) (Figma 20:6613) */}
            <div className="referral-activity-pipeline-col">
              <h3 className="referral-activity-section-title">
                {t('referralActivityReport.pipeline.title', 'Pipeline Status')}
              </h3>

              {data.pipelineStatus.map((status) => (
                <article key={status.id} className="referral-activity-status-card">
                  <div className="referral-activity-status-left">
                    <div
                      className="referral-activity-status-indicator"
                      style={{ backgroundColor: status.color }}
                      aria-hidden="true"
                    />
                    <div className="referral-activity-status-text">
                      <span className="referral-activity-status-name">
                        {status.label}
                      </span>
                      <span className="referral-activity-status-num">
                        {status.count}
                      </span>
                    </div>
                  </div>
                  <span className="referral-activity-percent-badge">
                    {status.percentage}
                  </span>
                </article>
              ))}
            </div>

            {/* Column 2: Hospital Distribution (Span 4) (Figma 20:6647) */}
            <article
              className="referral-activity-hospital-col"
              aria-labelledby="heading-hospital-distribution"
            >
              <div className="referral-activity-chart-header">
                <h3 id="heading-hospital-distribution" className="referral-activity-section-title p-0">
                  {t('referralActivityReport.hospital.title', 'Hospital Distribution')}
                </h3>
                <div className="relative">
                  <button
                    type="button"
                    className="p-1 text-[#494552] hover:text-[#28006d] rounded"
                    onClick={() => setIsHospitalMenuOpen(!isHospitalMenuOpen)}
                    aria-label="More hospital distribution options"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {isHospitalMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-[#cbc4d4] rounded-lg shadow-lg z-20 py-1 text-xs">
                      <button
                        type="button"
                        className="w-full text-left px-3 py-1.5 hover:bg-[#edeef0]"
                        onClick={() => {
                          showToast('Filtered by primary facility.');
                          setIsHospitalMenuOpen(false);
                        }}
                      >
                        Filter Primary
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-1.5 hover:bg-[#edeef0]"
                        onClick={() => {
                          handleNav('/admin/facilities');
                          setIsHospitalMenuOpen(false);
                        }}
                      >
                        View Facilities
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bar Chart Area (Figma 20:6656) */}
              <div className="referral-activity-barchart-container">
                <div className="referral-activity-barchart-stage" role="img" aria-label="Hospital distribution chart">
                  {data.hospitalDistribution.map((hosp) => (
                    <div key={hosp.id} className="referral-activity-bar-slot">
                      <div
                        className="referral-activity-bar-fill"
                        style={{ height: `${hosp.percentage}%` }}
                      >
                        <div className="referral-activity-bar-tooltip">
                          {hosp.count.toLocaleString()} ({hosp.fullName})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="referral-activity-barchart-labels">
                  {data.hospitalDistribution.map((hosp) => (
                    <span key={hosp.id} className="referral-activity-x-label">
                      {hosp.label}
                    </span>
                  ))}
                </div>
              </div>
            </article>

            {/* Column 3: Top Departments (Span 4) (Figma 20:6683) */}
            <article
              className="referral-activity-dept-col"
              aria-labelledby="heading-top-departments"
            >
              <div className="referral-activity-chart-header">
                <h3 id="heading-top-departments" className="referral-activity-section-title p-0">
                  {t('referralActivityReport.departments.title', 'Top Departments')}
                </h3>
                <button
                  type="button"
                  className="referral-activity-view-all"
                  onClick={() => handleNav('/admin/referrals')}
                >
                  {t('referralActivityReport.departments.viewAll', 'View All')}
                </button>
              </div>

              <div className="referral-activity-dept-list">
                {data.topDepartments.map((dept) => (
                  <div key={dept.id} className="referral-activity-dept-row">
                    <div className="referral-activity-dept-header">
                      <span className="referral-activity-dept-name">{dept.name}</span>
                      <span className="referral-activity-dept-count">
                        {dept.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="referral-activity-dept-bar-track">
                      <div
                        className="referral-activity-dept-bar-fill"
                        style={{
                          width: `${dept.percentage}%`,
                          backgroundColor: dept.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminReferralActivityReport;

