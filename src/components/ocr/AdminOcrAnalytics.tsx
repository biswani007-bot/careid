import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Search,
  Bell,
  Settings,
  HelpCircle,
  Calendar,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  EyeOff,
  Crop,
  Grid,
  ChevronRight,
  ShieldCheck,
  XCircle,
  RefreshCw,
} from 'lucide-react';

import AdminSidebar from '../common/AdminSidebar';
import {
  useOcrAnalyticsQuery,
  type OcrHourlyVolume,
} from '../../services/ocrService';
import './AdminOcrAnalytics.css';

export interface AdminOcrAnalyticsProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminOcrAnalytics: React.FC<AdminOcrAnalyticsProps> = ({ onNavigate, onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('Today');
  const [hoveredBar, setHoveredBar] = useState<OcrHourlyVolume | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // TanStack Query
  const { data: analyticsData, isLoading, isFetching } = useOcrAnalyticsQuery(selectedTimeRange);

  const kpis = analyticsData?.kpis || {
    todayVolume: 342,
    todayVolumeTrend: '+12%',
    avgConfidence: 92,
    avgConfidenceStatus: 'Stable',
    approvalRate: 94,
    approvalRateTrend: '+2%',
    rejectedRate: 6,
    rejectedRateTrend: '-1%',
    avgProcessingSec: 1.2,
  };

  // Figma Exact Hourly Volume Dataset
  const hourlyVolume: OcrHourlyVolume[] = analyticsData?.hourlyVolume?.length
    ? analyticsData.hourlyVolume
    : [
        { hour: '8a', processed: 30, exceptions: 0 },
        { hour: '9a', processed: 45, exceptions: 0 },
        { hour: '10a', processed: 55, exceptions: 5 },
        { hour: '11a', processed: 77, exceptions: 4 },
        { hour: '12p', processed: 83, exceptions: 12 },
        { hour: '1p', processed: 65, exceptions: 5 },
        { hour: '2p', processed: 50, exceptions: 0 },
        { hour: '3p', processed: 35, exceptions: 0 },
      ];

  // Figma Exact Document Distribution: 65% Lab Reports, 20% Imaging, 10% Prescriptions, 5% Other
  const distribution = [
    { category: 'Lab Reports', percentage: 65, color: '#28006d' },
    { category: 'Imaging Referrals', percentage: 20, color: '#006a60' },
    { category: 'Prescriptions', percentage: 10, color: '#483400' },
    { category: 'Other', percentage: 5, color: '#cbc4d4' },
  ];

  // Figma Exact Recent Exceptions:
  const recentExceptions = [
    {
      id: 'exc-1',
      title: 'Low Confidence Score (42%)',
      ocrId: 'DOC-8823',
      timeAgo: '2m ago',
      type: 'confidence' as const,
    },
    {
      id: 'exc-2',
      title: 'Missing Boundaries',
      ocrId: 'DOC-8819',
      timeAgo: '15m ago',
      type: 'boundary' as const,
    },
    {
      id: 'exc-3',
      title: 'Illegible Region Detected',
      ocrId: 'DOC-8790',
      timeAgo: '42m ago',
      type: 'illegible' as const,
    },
  ];

  return (
    <div className="ocr-analytics-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#1e1b4b] text-white px-5 py-3 rounded-xl shadow-2xl border border-indigo-400/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 size={18} className="text-[#10b981]" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Shared CareID Sidebar */}
      <AdminSidebar
        activeNav="ocr"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
        ctaLabel="+ New Record"
        onCtaClick={() => handleNav('/admin/records/upload')}
      />

      {/* Main Content Area */}
      <div className="careid-main-wrapper">
        {/* Stationary Top Global App Bar */}
        <header className="careid-top-navbar" role="banner">
          <div className="careid-header-left">
            <button
              type="button"
              className="careid-mobile-toggle-btn md:hidden"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-sm font-semibold">
              <span className="text-[#494552]">/</span>
              <span className="text-[#0b1c30] font-bold">Admin Portal</span>
            </div>
          </div>

          <div className="careid-header-center-search">
            <Search size={16} className="careid-header-search-icon" />
            <input
              type="text"
              placeholder="Search OCR records..."
              className="careid-header-search-input"
            />
          </div>

          <div className="careid-header-right">
            <button
              type="button"
              className="p-2 text-[#494552] hover:text-[#28006d] hover:bg-[#f2f4f6] rounded-lg transition-colors relative"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#f43f5e] rounded-full ring-2 ring-white" />
            </button>

            <button
              type="button"
              className="p-2 text-[#494552] hover:text-[#28006d] hover:bg-[#f2f4f6] rounded-lg transition-colors"
              aria-label="System Settings"
              onClick={() => handleNav('/admin/settings')}
            >
              <Settings size={18} />
            </button>

            <button
              type="button"
              className="p-2 text-[#494552] hover:text-[#28006d] hover:bg-[#f2f4f6] rounded-lg transition-colors"
              aria-label="Help & Support"
            >
              <HelpCircle size={18} />
            </button>

            <div className="w-px h-6 bg-[#cbc4d4] hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#28006d] text-white flex items-center justify-center font-bold text-xs ring-2 ring-[#cbc4d4]">
                AD
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-[#191c1e]">Admin Console</span>
                <span className="text-[10px] text-[#494552]">Super Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Canvas - Figma Node 20:3976 */}
        <main className="ocr-analytics-canvas" role="main">
          {/* Breadcrumbs & Header - Figma Node 20:3978 */}
          <div className="ocr-analytics-header-section">
            {/* Breadcrumb: OCR Verification > Analytics */}
            <div className="ocr-analytics-breadcrumb-row">
              <button
                type="button"
                onClick={() => handleNav('/admin/ocr/queue')}
                className="ocr-analytics-breadcrumb-link"
              >
                {t('ocrQueue.breadcrumb', 'OCR Verification')}
              </button>
              <span className="ocr-analytics-breadcrumb-separator">›</span>
              <span className="ocr-analytics-breadcrumb-current">
                {t('ocrAnalytics.breadcrumb', 'Analytics')}
              </span>
            </div>

            <div className="ocr-analytics-title-row">
              <div className="ocr-analytics-title-group">
                <div className="flex items-center gap-3">
                  <h1 className="ocr-analytics-title">
                    {t('ocrAnalytics.title', 'OCR Analytics Dashboard')}
                  </h1>
                  {isFetching && <RefreshCw size={18} className="text-[#28006d] animate-spin" />}
                </div>
                <p className="ocr-analytics-subtitle">
                  {t(
                    'ocrAnalytics.subtitle',
                    'Real-time operational metrics for document processing engine.'
                  )}
                </p>
              </div>

              {/* Action Buttons - Figma Node 20:3994 */}
              <div className="ocr-analytics-top-actions">
                {/* Date Filter Pill Button (Figma 20:3995) */}
                <div className="ocr-date-pill-wrapper">
                  <button
                    type="button"
                    onClick={() => {
                      const next = selectedTimeRange === 'Today' ? 'Last 7 Days' : 'Today';
                      setSelectedTimeRange(next);
                      showToast(`Date range set to ${next}`);
                    }}
                    className="ocr-date-pill-btn"
                    id="ocr-date-filter-btn"
                  >
                    <Calendar size={14} className="text-[#494552]" />
                    <span>{selectedTimeRange}</span>
                  </button>
                </div>

                {/* Export Report Button (Figma 20:3999) */}
                <button
                  type="button"
                  onClick={() => showToast('OCR Analytics summary report export initiated (PDF/CSV).')}
                  className="ocr-export-report-btn"
                  id="ocr-export-report-btn"
                >
                  <Download size={13} />
                  <span>{t('ocrAnalytics.exportReportBtn', 'Export Report')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Top 5 KPI Cards Row - Figma Node 20:4004 */}
          <div className="ocr-analytics-kpi-grid">
            {/* Card 1: Today's Volume - Figma Node 20:4005 */}
            <div className="ocr-kpi-bento-card">
              <div className="ocr-kpi-card-top">
                <div className="ocr-kpi-icon-circle bg-[rgba(63,29,139,0.1)] text-[#28006d]">
                  <FileText size={18} />
                </div>
                <div className="ocr-trend-pill ocr-trend-teal">
                  <TrendingUp size={11} />
                  <span>{kpis.todayVolumeTrend}</span>
                </div>
              </div>
              <div className="ocr-kpi-card-label">
                {t('ocrAnalytics.kpis.todayVolume', "TODAY'S VOLUME")}
              </div>
              <div className="ocr-kpi-card-value">{kpis.todayVolume}</div>
            </div>

            {/* Card 2: Avg Confidence - Figma Node 20:4018 */}
            <div className="ocr-kpi-bento-card">
              <div className="ocr-kpi-card-top">
                <div className="ocr-kpi-icon-circle bg-[rgba(133,246,229,0.2)] text-[#006a60]">
                  <ShieldCheck size={18} />
                </div>
                <div className="ocr-status-text-badge">
                  {kpis.avgConfidenceStatus}
                </div>
              </div>
              <div className="ocr-kpi-card-label">
                {t('ocrAnalytics.kpis.avgConfidence', 'AVG CONFIDENCE')}
              </div>
              <div className="ocr-kpi-card-value">{kpis.avgConfidence}%</div>
            </div>

            {/* Card 3: Approval Rate - Figma Node 20:4029 */}
            <div className="ocr-kpi-bento-card">
              <div className="ocr-kpi-card-top">
                <div className="ocr-kpi-icon-circle bg-[rgba(133,246,229,0.2)] text-[#006a60]">
                  <CheckCircle2 size={18} />
                </div>
                <div className="ocr-trend-pill ocr-trend-teal">
                  <TrendingUp size={11} />
                  <span>{kpis.approvalRateTrend}</span>
                </div>
              </div>
              <div className="ocr-kpi-card-label">
                {t('ocrAnalytics.kpis.approvalRate', 'APPROVAL RATE')}
              </div>
              <div className="ocr-kpi-card-value">{kpis.approvalRate}%</div>
            </div>

            {/* Card 4: Rejected Rate - Figma Node 20:4042 */}
            <div className="ocr-kpi-bento-card">
              <div className="ocr-kpi-card-top">
                <div className="ocr-kpi-icon-circle bg-[rgba(255,218,214,0.2)] text-[#ba1a1a]">
                  <XCircle size={18} />
                </div>
                <div className="ocr-trend-pill ocr-trend-coral">
                  <TrendingDown size={11} />
                  <span>{kpis.rejectedRateTrend}</span>
                </div>
              </div>
              <div className="ocr-kpi-card-label">
                {t('ocrAnalytics.kpis.rejectedRate', 'REJECTED RATE')}
              </div>
              <div className="ocr-kpi-card-value">{kpis.rejectedRate}%</div>
            </div>

            {/* Card 5: Avg Processing - Figma Node 20:4055 */}
            <div className="ocr-kpi-bento-card">
              <div className="ocr-kpi-card-top">
                <div className="ocr-kpi-icon-circle bg-[rgba(72,52,0,0.1)] text-[#483400]">
                  <Clock size={18} />
                </div>
              </div>
              <div className="ocr-kpi-card-label">
                {t('ocrAnalytics.kpis.avgProcessing', 'AVG PROCESSING')}
              </div>
              <div className="ocr-kpi-card-value flex items-baseline gap-1">
                <span>{kpis.avgProcessingSec}</span>
                <span className="text-sm font-semibold text-[#494552]">sec</span>
              </div>
            </div>
          </div>

          {/* Main Content Bento Grid - Figma Node 20:4003 */}
          <div className="ocr-analytics-bento-layout">
            {/* Left 8-col: Processing Volume Chart - Figma Node 20:4066 */}
            <section
              className="ocr-volume-chart-card"
              aria-label={t('ocrAnalytics.processingVolume.title', 'Processing Volume')}
            >
              <div className="ocr-chart-header-row">
                <div>
                  <h2 className="ocr-chart-title">
                    {t('ocrAnalytics.processingVolume.title', 'Processing Volume')}
                  </h2>
                  <p className="ocr-chart-subtitle">
                    {t('ocrAnalytics.processingVolume.subtitle', 'Hourly breakdown for today')}
                  </p>
                </div>

                {/* Legend - Figma Node 20:4074 */}
                <div className="ocr-chart-legend-wrap">
                  <div className="ocr-legend-item">
                    <span className="ocr-legend-dot bg-[#28006d]" />
                    <span className="ocr-legend-label">
                      {t('ocrAnalytics.processingVolume.processed', 'Processed')}
                    </span>
                  </div>
                  <div className="ocr-legend-item">
                    <span className="ocr-legend-dot bg-[#ffdad6]" />
                    <span className="ocr-legend-label">
                      {t('ocrAnalytics.processingVolume.exceptions', 'Exceptions')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stacked Bar Chart Visualization matching Figma Node 20:4099 */}
              <div className="ocr-chart-canvas-container">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center text-xs text-[#7a7583]">
                    Loading volume trends...
                  </div>
                ) : (
                  <div className="ocr-svg-chart-wrap relative">
                    <svg
                      viewBox="0 0 620 250"
                      className="w-full h-full"
                      preserveAspectRatio="none"
                    >
                      {/* Horizontal Grid lines at 100, 75, 50, 25, 0 */}
                      {[100, 75, 50, 25, 0].map((val) => {
                        const y = 200 - (val / 100) * 180 + 10;
                        return (
                          <g key={val}>
                            <text
                              x="25"
                              y={y + 4}
                              textAnchor="end"
                              className="fill-[#7a7583] text-[11px] font-medium font-sans"
                            >
                              {val}
                            </text>
                            <line
                              x1="36"
                              y1={y}
                              x2="610"
                              y2={y}
                              stroke="rgba(203,196,212,0.25)"
                              strokeWidth="1"
                            />
                          </g>
                        );
                      })}

                      {/* Stacked Vertical Bars */}
                      {hourlyVolume.map((item, idx) => {
                        const barWidth = 34;
                        const spacing = 70;
                        const x = 50 + idx * spacing;
                        const chartScale = 1.8; // 180px for 100%

                        const exceptionsHeight = item.exceptions * chartScale;
                        const processedHeight = item.processed * chartScale;

                        const baseY = 210;
                        const exceptionsY = baseY - exceptionsHeight;
                        const processedY = exceptionsY - processedHeight;

                        const isHovered = hoveredBar?.hour === item.hour;

                        return (
                          <g
                            key={item.hour}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredBar(item)}
                            onMouseLeave={() => setHoveredBar(null)}
                          >
                            {/* Exceptions Bar Segment (Peach #ffdad6 at bottom) */}
                            {item.exceptions > 0 && (
                              <rect
                                x={x}
                                y={exceptionsY}
                                width={barWidth}
                                height={exceptionsHeight}
                                fill="#ffdad6"
                              />
                            )}

                            {/* Processed Bar Segment (Deep Purple #28006d on top) */}
                            <rect
                              x={x}
                              y={processedY}
                              width={barWidth}
                              height={processedHeight}
                              rx="2"
                              fill="#28006d"
                              opacity={hoveredBar && !isHovered ? 0.75 : 1}
                            />

                            {/* X-axis label */}
                            <text
                              x={x + barWidth / 2}
                              y={baseY + 18}
                              textAnchor="middle"
                              className={`text-[11px] font-medium font-sans ${
                                isHovered ? 'fill-[#28006d] font-bold' : 'fill-[#7a7583]'
                              }`}
                            >
                              {item.hour}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Interactive Tooltip */}
                    {hoveredBar && (
                      <div className="ocr-chart-hover-tooltip">
                        <span className="font-bold block mb-1">
                          Hour {hoveredBar.hour} Breakdown
                        </span>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[#a5b4fc]">Processed:</span>
                          <strong className="text-white">{hoveredBar.processed}</strong>
                        </div>
                        {hoveredBar.exceptions > 0 && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-rose-300">Exceptions:</span>
                            <strong className="text-white">{hoveredBar.exceptions}</strong>
                          </div>
                        )}
                        <div className="border-t border-indigo-700/60 pt-1 mt-1 flex items-center justify-between font-bold">
                          <span>Total:</span>
                          <span className="text-[#85f6e5]">
                            {hoveredBar.processed + hoveredBar.exceptions}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Right 4-col: Document Distribution & Recent Exceptions */}
            <div className="ocr-analytics-side-col">
              {/* Document Distribution Card - Figma Node 20:4135 */}
              <section
                className="ocr-bento-subcard"
                aria-label={t('ocrAnalytics.documentDistribution.title', 'Document Distribution')}
              >
                <h2 className="ocr-subcard-title">
                  {t('ocrAnalytics.documentDistribution.title', 'Document Distribution')}
                </h2>

                <div className="ocr-distribution-stack">
                  {distribution.map((item) => (
                    <div key={item.category} className="ocr-dist-item">
                      <div className="ocr-dist-row">
                        <span className="ocr-dist-name">{item.category}</span>
                        <span className="ocr-dist-percent">{item.percentage}%</span>
                      </div>
                      <div className="ocr-dist-track">
                        <div
                          className="ocr-dist-fill"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recent Exceptions Card - Figma Node 20:4171 */}
              <section
                className="ocr-bento-subcard"
                aria-label={t('ocrAnalytics.recentExceptions.title', 'Recent Exceptions')}
              >
                <div className="ocr-exceptions-header-row">
                  <h2 className="ocr-subcard-title">
                    {t('ocrAnalytics.recentExceptions.title', 'Recent Exceptions')}
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleNav('/admin/ocr/queue?status=Rejected')}
                    className="ocr-view-all-link"
                    id="ocr-exceptions-view-all-btn"
                  >
                    {t('ocrAnalytics.recentExceptions.viewAll', 'View All')}
                  </button>
                </div>

                <div className="ocr-exceptions-stack">
                  {recentExceptions.map((exc) => (
                    <div
                      key={exc.id}
                      className="ocr-exception-item"
                      onClick={() => handleNav('/admin/ocr/queue')}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="ocr-exc-left">
                        <div className="ocr-exc-circle-icon">
                          {exc.type === 'confidence' && <EyeOff size={15} />}
                          {exc.type === 'boundary' && <Crop size={15} />}
                          {exc.type === 'illegible' && <Grid size={15} />}
                        </div>
                        <div className="ocr-exc-texts">
                          <span className="ocr-exc-title">{exc.title}</span>
                          <span className="ocr-exc-meta">
                            {exc.ocrId} • {exc.timeAgo}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={15} className="text-[#7a7583]" />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminOcrAnalytics;
