import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Search,
  Bell,
  History,
  HelpCircle,
  Calendar,
  Download,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Scan,
  CheckCircle2,
  BarChart3,
  Clock,
  ArrowRight,
  X,
  Check,
} from 'lucide-react';

import AdminSidebar from '../common/AdminSidebar';
import {
  useOcrPerformanceReportQuery,
  exportOcrPerformanceToCSV,
  type OcrPerformanceReportData,
} from '../../services/ocrReportService';
import './AdminOcrPerformanceReport.css';

export interface AdminOcrPerformanceReportProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminOcrPerformanceReport: React.FC<AdminOcrPerformanceReportProps> = ({
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

  // State (no invented tabs - strictly Figma node 20:5968)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('Last 30 Days');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsTimeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // TanStack Query
  const { data: reportData, isLoading } = useOcrPerformanceReportQuery(timeRange);
  const data: OcrPerformanceReportData = reportData || {
    timeRange,
    isLiveSync: true,
    kpis: {
      totalRequests: 0,
      totalRequestsFormatted: isLoading ? '...' : '0',
      totalRequestsTrend: 'Platform total',
      autoApprovalRate: 0,
      autoApprovalRateFormatted: isLoading ? '...' : '0%',
      autoApprovalRateTrend: 'Live verified',
      avgConfidenceScore: 0,
      avgConfidenceScoreFormatted: isLoading ? '...' : '0%',
      avgConfidenceScoreTrend: 'Model confidence',
      avgProcessingTime: 0,
      avgProcessingTimeFormatted: '—',
      avgProcessingTimeTrend: 'Telemetry unexposed',
    },
    statusCounts: {
      rejectedDocuments: 0,
      rejectedSubtext: '0 failed threshold',
      pendingHumanReview: 0,
      pendingSubtext: '0 pending validation',
    },
    distribution: [],
    trend: [],
  };

  const timeRangeOptions = ['Today', 'Last 7 Days', 'Last 30 Days', 'Last 90 Days'];

  // Handle Export
  const handleExport = () => {
    exportOcrPerformanceToCSV(data);
    showToast(t('ocrPerformanceReport.exportSuccess', 'OCR Performance Report exported successfully as CSV.'));
  };

  return (
    <div className="ocr-perf-wrapper" data-node-id="20:5968">
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

      {/* Primary Left Navigation Bar (Figma 20:5969) */}
      <AdminSidebar
        activeNav="reports"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
        ctaLabel="+ New Record"
        onCtaClick={() => handleNav('/admin/records/upload')}
      />

      {/* Main Content Area */}
      <div className="ocr-perf-main">
        {/* Stationary Top Global Navigation Bar (Figma 20:6034) */}
        <header className="ocr-perf-top-navbar" role="banner">
          <div className="ocr-perf-top-left">
            {/* Mobile Drawer Toggle */}
            <button
              type="button"
              className="p-2 -ml-2 text-[#494552] hover:text-[#28006d] md:hidden rounded-lg"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
          </div>

          <div className="ocr-perf-top-right">
            {/* Search Input Box (Figma 20:6038) */}
            <div className="ocr-perf-search-box">
              <Search size={15} className="ocr-perf-search-icon" />
              <input
                type="text"
                placeholder={t('ocrPerformanceReport.searchPlaceholder', 'Search records...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ocr-perf-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="ocr-perf-search-clear"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Notification Bell (Figma 20:6045) */}
            <button
              type="button"
              className="ocr-perf-icon-btn"
              title="Notifications"
              aria-label="View notifications"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#fabd00] rounded-full ring-2 ring-white" />
            </button>

            {/* History Icon (Figma 20:6048) */}
            <button
              type="button"
              className="ocr-perf-icon-btn"
              title="History"
              aria-label="View history"
              onClick={() => handleNav('/admin/referrals/audit')}
            >
              <History size={18} />
            </button>

            {/* Help Outline (Figma 20:6051) */}
            <button
              type="button"
              className="ocr-perf-icon-btn"
              title="Help & Support"
              aria-label="Get help"
            >
              <HelpCircle size={20} />
            </button>

            {/* Profile Avatar (Figma 20:6054) */}
            <div
              className="ocr-perf-admin-avatar cursor-pointer"
              title="Dr. Evelyn Vance (Super Admin)"
              onClick={() => handleNav('/admin/users')}
            >
              <img
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&auto=format&fit=crop&q=80"
                alt="Super Admin avatar"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </header>

        {/* Scrollable Canvas Body (Figma 20:6057) */}
        <main className="ocr-perf-canvas">
          {/* Page Header (Figma 20:6058) */}
          <div className="ocr-perf-header-row">
            <div className="ocr-perf-header-left">
              {/* Breadcrumbs: REPORTS > OCR PROCESSING */}
              <nav className="ocr-perf-breadcrumbs" aria-label="Breadcrumb navigation">
                <button
                  type="button"
                  className="ocr-perf-breadcrumb-item"
                  onClick={() => handleNav('/admin/reports')}
                >
                  {t('ocrPerformanceReport.breadcrumbs.reports', 'REPORTS')}
                </button>
                <ChevronRight size={12} className="ocr-perf-breadcrumb-sep" />
                <span className="ocr-perf-breadcrumb-active">
                  {t('ocrPerformanceReport.breadcrumbs.ocrProcessing', 'OCR PROCESSING')}
                </span>
              </nav>

              {/* Heading: OCR Performance Report */}
              <h1 className="ocr-perf-title">
                {t('ocrPerformanceReport.header.title', 'OCR Performance Report')}
              </h1>
            </div>

            {/* Header Action Buttons (Figma 20:6069) */}
            <div className="ocr-perf-actions-group" ref={dropdownRef}>
              {/* Date Filter: Last 30 Days (Figma 20:6070) */}
              <div className="ocr-perf-dropdown-wrapper">
                <button
                  type="button"
                  className="ocr-perf-btn-action"
                  onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                  aria-expanded={isTimeDropdownOpen}
                  aria-haspopup="listbox"
                  id="ocr-perf-time-btn"
                >
                  <Calendar size={16} className="text-[#191c1e]" />
                  <span>{timeRange}</span>
                  <ChevronDown size={14} className="text-[#191c1e]" />
                </button>

                {isTimeDropdownOpen && (
                  <div className="ocr-perf-dropdown-menu" role="listbox">
                    {timeRangeOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`ocr-perf-dropdown-item ${timeRange === opt ? 'selected' : ''}`}
                        onClick={() => {
                          setTimeRange(opt);
                          setIsTimeDropdownOpen(false);
                          showToast(`Time filter set to ${opt}`);
                        }}
                        role="option"
                        aria-selected={timeRange === opt}
                      >
                        <span>{opt}</span>
                        {timeRange === opt && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Export Button (Figma 20:6076) */}
              <button
                type="button"
                className="ocr-perf-btn-action"
                onClick={handleExport}
                id="ocr-perf-export-btn"
                title="Export report metrics"
              >
                <Download size={15} className="text-[#191c1e]" />
                <span>{t('ocrPerformanceReport.header.export', 'Export')}</span>
              </button>
            </div>
          </div>

          {/* Bento Metrics Grid (Figma 20:6080) */}
          <section className="ocr-perf-bento-grid" aria-label="Key Performance Indicators">
            {/* Metric 1: Total OCR Requests (Figma 20:6081) */}
            <article className="ocr-perf-kpi-card" aria-labelledby="kpi-total-requests">
              <div className="ocr-perf-kpi-top">
                <div className="ocr-perf-icon-circle bg-[#e8ddff] text-[#28006d]">
                  <Scan size={20} aria-hidden="true" />
                </div>
                <div className="ocr-perf-trend-pill bg-[rgba(133,246,229,0.3)] text-[#006a60]">
                  <ArrowUpRight size={12} className="shrink-0" />
                  <span>{data.kpis.totalRequestsTrend}</span>
                </div>
              </div>
              <div className="ocr-perf-kpi-bottom">
                <span id="kpi-total-requests" className="ocr-perf-kpi-label">
                  {t('ocrPerformanceReport.kpis.totalRequests', 'Total OCR Requests')}
                </span>
                <span className="ocr-perf-kpi-val">{data.kpis.totalRequestsFormatted}</span>
              </div>
            </article>

            {/* Metric 2: Auto-Approval Rate (Figma 20:6096) */}
            <article className="ocr-perf-kpi-card" aria-labelledby="kpi-approval-rate">
              <div className="ocr-perf-kpi-top">
                <div className="ocr-perf-icon-circle bg-[#85f6e5] text-[#006a60]">
                  <CheckCircle2 size={20} aria-hidden="true" />
                </div>
                <div className="ocr-perf-trend-pill bg-[rgba(133,246,229,0.3)] text-[#006a60]">
                  <ArrowUpRight size={12} className="shrink-0" />
                  <span>{data.kpis.autoApprovalRateTrend}</span>
                </div>
              </div>
              <div className="ocr-perf-kpi-bottom">
                <span id="kpi-approval-rate" className="ocr-perf-kpi-label">
                  {t('ocrPerformanceReport.kpis.autoApprovalRate', 'Auto-Approval Rate')}
                </span>
                <span className="ocr-perf-kpi-val">{data.kpis.autoApprovalRateFormatted}</span>
              </div>
            </article>

            {/* Metric 3: Avg. Confidence Score (Figma 20:6111) */}
            <article className="ocr-perf-kpi-card" aria-labelledby="kpi-confidence-score">
              <div className="ocr-perf-kpi-top">
                <div className="ocr-perf-icon-circle bg-[#ffdf9e] text-[#2d2000]">
                  <BarChart3 size={18} aria-hidden="true" />
                </div>
                <div className="ocr-perf-trend-pill bg-[#e1e2e4] text-[#494552]">
                  <Minus size={10} className="shrink-0" />
                  <span>{data.kpis.avgConfidenceScoreTrend}</span>
                </div>
              </div>
              <div className="ocr-perf-kpi-bottom">
                <span id="kpi-confidence-score" className="ocr-perf-kpi-label">
                  {t('ocrPerformanceReport.kpis.avgConfidenceScore', 'Avg. Confidence Score')}
                </span>
                <span className="ocr-perf-kpi-val">{data.kpis.avgConfidenceScoreFormatted}</span>
              </div>
            </article>

            {/* Metric 4: Avg. Processing Time (Figma 20:6126) */}
            <article className="ocr-perf-kpi-card" aria-labelledby="kpi-processing-time">
              <div className="ocr-perf-kpi-top">
                <div className="ocr-perf-icon-circle bg-[#e1e2e4] text-[#494552]">
                  <Clock size={20} aria-hidden="true" />
                </div>
                <div className="ocr-perf-trend-pill bg-[rgba(255,218,214,0.5)] text-[#ba1a1a]">
                  <ArrowDownRight size={12} className="shrink-0" />
                  <span>{data.kpis.avgProcessingTimeTrend}</span>
                </div>
              </div>
              <div className="ocr-perf-kpi-bottom">
                <span id="kpi-processing-time" className="ocr-perf-kpi-label">
                  {t('ocrPerformanceReport.kpis.avgProcessingTime', 'Avg. Processing Time')}
                </span>
                <span className="ocr-perf-kpi-val">{data.kpis.avgProcessingTimeFormatted}</span>
              </div>
            </article>
          </section>

          {/* Secondary Section: Status Column & Charts (Figma 20:6141) */}
          <section className="ocr-perf-secondary-grid" aria-label="Status & Distribution Overview">
            {/* Column 1: Status Cards (Figma 20:6142) */}
            <div className="ocr-perf-status-col">
              {/* Rejected Documents Card (Figma 20:6143) */}
              <article className="ocr-perf-status-card ocr-perf-status-card-rejected">
                <div className="ocr-perf-status-info">
                  <span className="ocr-perf-status-tag text-[#93000a]">
                    {t('ocrPerformanceReport.status.requiresAction', 'REQUIRES ACTION')}
                  </span>
                  <h3 className="ocr-perf-status-title">
                    {t('ocrPerformanceReport.status.rejectedDocuments', 'Rejected Documents')}
                  </h3>
                  <p className="ocr-perf-status-subtext">
                    {t(
                      'ocrPerformanceReport.status.rejectedSubtext',
                      'Failed OCR confidence threshold'
                    )}
                  </p>
                </div>
                <div className="ocr-perf-status-action-side">
                  <span className="ocr-perf-status-count text-[#ba1a1a]">
                    {data.statusCounts.rejectedDocuments}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNav('/admin/ocr/rejected')}
                    className="ocr-perf-status-link-btn text-[#ba1a1a]"
                    aria-label="Review rejected documents"
                  >
                    <span>{t('ocrPerformanceReport.status.review', 'Review')}</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              </article>

              {/* Pending Human Review Card (Figma 20:6158) */}
              <article className="ocr-perf-status-card ocr-perf-status-card-pending">
                <div className="ocr-perf-status-info">
                  <span className="ocr-perf-status-tag text-[#cb9900]">
                    {t('ocrPerformanceReport.status.inQueue', 'IN QUEUE')}
                  </span>
                  <h3 className="ocr-perf-status-title">
                    {t('ocrPerformanceReport.status.pendingHumanReview', 'Pending Human Review')}
                  </h3>
                  <p className="ocr-perf-status-subtext">
                    {t(
                      'ocrPerformanceReport.status.pendingSubtext',
                      'Flagged for manual validation'
                    )}
                  </p>
                </div>
                <div className="ocr-perf-status-action-side">
                  <span className="ocr-perf-status-count text-[#2d2000]">
                    {data.statusCounts.pendingHumanReview}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNav('/admin/ocr/queue')}
                    className="ocr-perf-status-link-btn text-[#2d2000]"
                    aria-label="Process pending reviews"
                  >
                    <span>{t('ocrPerformanceReport.status.process', 'Process')}</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              </article>
            </div>

            {/* Column 2: Document Type Distribution (Figma 20:6174) */}
            <article className="ocr-perf-chart-card" aria-labelledby="chart-doc-distribution">
              <div className="ocr-perf-chart-header">
                <h3 id="chart-doc-distribution" className="ocr-perf-chart-title">
                  {t('ocrPerformanceReport.charts.docTypeDistribution', 'Document Type Distribution')}
                </h3>
              </div>

              <div className="ocr-perf-distribution-list">
                {data.distribution.map((item) => (
                  <div key={item.category} className="ocr-perf-dist-item">
                    <div className="ocr-perf-dist-row">
                      <span className="ocr-perf-dist-label">{item.category}</span>
                      <span className="ocr-perf-dist-pct">{item.percentage}%</span>
                    </div>
                    <div className="ocr-perf-dist-track">
                      <div
                        className="ocr-perf-dist-fill"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            {/* Column 3: Approval Rate Trend (Figma 20:6214) */}
            <article className="ocr-perf-chart-card" aria-labelledby="chart-approval-trend">
              <div className="ocr-perf-chart-header">
                <h3 id="chart-approval-trend" className="ocr-perf-chart-title">
                  {t('ocrPerformanceReport.charts.approvalTrend', 'Approval Trend')}
                </h3>
                <span className="ocr-perf-chart-sub">
                  {t('ocrPerformanceReport.charts.past7Days', 'Past 7 Days')}
                </span>
              </div>

              {/* SVG Bezier Line Chart matching Figma 20:6216 */}
              <div className="ocr-perf-trend-svg-container">
                <svg
                  viewBox="0 0 280 140"
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                  aria-label="Approval rate past 7 days trend chart"
                >
                  <defs>
                    <linearGradient id="purpleTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#28006d" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#28006d" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="0" y1="35" x2="280" y2="35" stroke="#e1e2e4" strokeDasharray="3 3" />
                  <line x1="0" y1="70" x2="280" y2="70" stroke="#e1e2e4" strokeDasharray="3 3" />
                  <line x1="0" y1="105" x2="280" y2="105" stroke="#e1e2e4" strokeDasharray="3 3" />

                  {/* Smooth Area Path */}
                  <path
                    d="M 10 110 Q 55 125 100 80 T 190 35 T 270 20 L 270 140 L 10 140 Z"
                    fill="url(#purpleTrendGrad)"
                  />

                  {/* Smooth Curve Line */}
                  <path
                    d="M 10 110 Q 55 125 100 80 T 190 35 T 270 20"
                    fill="none"
                    stroke="#28006d"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Interactive Data Points matching Figma 20:6222 */}
                  <circle cx="100" cy="80" r="4.5" fill="#28006d" stroke="#ffffff" strokeWidth="2" />
                  <circle cx="190" cy="35" r="4.5" fill="#28006d" stroke="#ffffff" strokeWidth="2" />
                  <circle cx="270" cy="20" r="4.5" fill="#28006d" stroke="#ffffff" strokeWidth="2" />
                </svg>
              </div>

              {/* X Axis Labels matching Figma 20:6230 */}
              <div className="ocr-perf-xaxis-labels">
                <span className="ocr-perf-xaxis-label">Mon</span>
                <span className="ocr-perf-xaxis-label">Wed</span>
                <span className="ocr-perf-xaxis-label">Fri</span>
                <span className="ocr-perf-xaxis-label">Sun</span>
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminOcrPerformanceReport;
