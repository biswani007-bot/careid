import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
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
  ChevronDown,
  ShieldCheck,
  XCircle,
  RefreshCw,
} from 'lucide-react';

import AdminSidebar from '../common/AdminSidebar';
import AdminHeader from '../common/AdminHeader';
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
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<OcrHourlyVolume | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // TanStack Query
  const { data: analyticsData, isLoading, isFetching } = useOcrAnalyticsQuery(selectedTimeRange);

  const kpis = analyticsData?.kpis || {
    todayVolume: 0,
    todayVolumeTrend: '0%',
    avgConfidence: 0,
    avgConfidenceStatus: 'Idle',
    approvalRate: 0,
    approvalRateTrend: '0%',
    rejectedRate: 0,
    rejectedRateTrend: '0%',
    avgProcessingSec: 0,
  };

  const hourlyVolume: OcrHourlyVolume[] = analyticsData?.hourlyVolume || [];
  const distribution = analyticsData?.distribution || [];
  const recentExceptions = analyticsData?.recentExceptions || [];

  // Export report as CSV
  const handleExportReport = () => {
    if (!analyticsData) {
      showToast('Analytics data not loaded yet.');
      return;
    }
    const lines: string[] = [];
    lines.push(`CareID Admin Portal - OCR Analytics Report`);
    lines.push(`Date Range,${selectedTimeRange}`);
    lines.push(`Exported At,${new Date().toISOString()}`);
    lines.push(``);
    lines.push(`KPI Metrics`);
    lines.push(`Metric,Value,Trend/Status`);
    lines.push(`Volume,${kpis.todayVolume},${kpis.todayVolumeTrend}`);
    lines.push(`Average Confidence,${kpis.avgConfidence}%,${kpis.avgConfidenceStatus}`);
    lines.push(`Approval Rate,${kpis.approvalRate}%,${kpis.approvalRateTrend}`);
    lines.push(`Rejected Rate,${kpis.rejectedRate}%,${kpis.rejectedRateTrend}`);
    lines.push(`Average Processing Duration,${kpis.avgProcessingSec} sec,-`);
    lines.push(``);
    lines.push(`Processing Volume Breakdown`);
    lines.push(`Time Slot,Processed,Exceptions,Total`);
    hourlyVolume.forEach((h) => {
      lines.push(`"${h.hour}",${h.processed},${h.exceptions},${h.processed + h.exceptions}`);
    });
    lines.push(``);
    lines.push(`Document Distribution`);
    lines.push(`Category,Percentage`);
    distribution.forEach((d) => {
      lines.push(`"${d.category}",${d.percentage}%`);
    });
    lines.push(``);
    lines.push(`Recent Exceptions`);
    lines.push(`OCR ID,Failure Reason,Time Ago,Type`);
    recentExceptions.forEach((e) => {
      lines.push(`"${e.ocrId}","${e.title.replace(/"/g, '""')}","${e.timeAgo}","${e.type}"`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `careid_ocr_analytics_${selectedTimeRange.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`OCR Analytics summary report downloaded (CSV).`);
  };

  // Dynamic Chart Scaling
  const maxVal = Math.max(1, ...hourlyVolume.map((v) => v.processed + v.exceptions));
  const chartMax =
    maxVal <= 5
      ? 5
      : maxVal <= 10
      ? 10
      : maxVal <= 25
      ? 25
      : maxVal <= 50
      ? 50
      : maxVal <= 100
      ? 100
      : Math.ceil(maxVal / 50) * 50;
  const yTicks = [chartMax, Math.round(chartMax * 0.75), Math.round(chartMax * 0.5), Math.round(chartMax * 0.25), 0];
  const chartScale = 180 / chartMax;

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
        {/* Shared CareID Admin Header */}
        <AdminHeader
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onNavigate={handleNav}
          showUploadRecord={true}
          onUploadRecord={() => handleNav('/admin/records/upload')}
        />

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
                {/* Date Filter Pill Button with Dropdown (Figma 20:3995) */}
                <div className="ocr-date-pill-wrapper relative">
                  <button
                    type="button"
                    onClick={() => setIsDateMenuOpen((prev) => !prev)}
                    className="ocr-date-pill-btn flex items-center gap-1.5"
                    id="ocr-date-filter-btn"
                    aria-expanded={isDateMenuOpen}
                    aria-haspopup="true"
                  >
                    <Calendar size={14} className="text-[#494552]" />
                    <span>{selectedTimeRange}</span>
                    <ChevronDown
                      size={13}
                      className={`text-[#494552] transition-transform duration-200 ${
                        isDateMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isDateMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-xl border border-[#cbc4d4]/40 py-1.5 z-30 animate-in fade-in slide-in-from-top-2 duration-150"
                      role="menu"
                    >
                      {(['Today', 'Last 7 Days', 'Last 30 Days', 'All Time'] as const).map((range) => (
                        <button
                          key={range}
                          type="button"
                          role="menuitem"
                          className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                            selectedTimeRange === range
                              ? 'text-[#28006d] bg-purple-50 font-bold'
                              : 'text-[#494552] hover:bg-slate-50'
                          }`}
                          onClick={() => {
                            setSelectedTimeRange(range);
                            setIsDateMenuOpen(false);
                            showToast(`Date range set to ${range}`);
                          }}
                        >
                          <span>{range}</span>
                          {selectedTimeRange === range && (
                            <CheckCircle2 size={13} className="text-[#28006d]" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Export Report Button (Figma 20:3999) */}
                <button
                  type="button"
                  onClick={handleExportReport}
                  className="ocr-export-report-btn"
                  id="ocr-export-report-btn"
                  title="Export OCR Analytics Report (CSV)"
                >
                  <Download size={13} />
                  <span>{t('ocrAnalytics.exportReportBtn', 'Export Report')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Top 5 KPI Cards Row - Figma Node 20:4004 */}
          <div className="ocr-analytics-kpi-grid">
            {/* Card 1: Volume - Figma Node 20:4005 */}
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
                {selectedTimeRange === 'Today'
                  ? t('ocrAnalytics.kpis.todayVolume', "TODAY'S VOLUME")
                  : `${selectedTimeRange.toUpperCase()} VOLUME`}
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
                    {selectedTimeRange === 'Today'
                      ? t('ocrAnalytics.processingVolume.subtitle', 'Hourly breakdown for today')
                      : selectedTimeRange === 'Last 7 Days'
                      ? 'Daily breakdown for past 7 days'
                      : `Breakdown across ${selectedTimeRange.toLowerCase()}`}
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
                ) : hourlyVolume.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-[#7a7583]">
                    No processing records found for this time range.
                  </div>
                ) : (
                  <div className="ocr-svg-chart-wrap relative">
                    <svg
                      viewBox="0 0 620 250"
                      className="w-full h-full"
                      preserveAspectRatio="none"
                    >
                      {/* Dynamic Horizontal Grid lines based on data scale */}
                      {yTicks.map((val) => {
                        const y = 210 - (val / chartMax) * 180;
                        return (
                          <g key={val}>
                            <text
                              x="28"
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
                        const count = Math.max(1, hourlyVolume.length);
                        const availableWidth = 560; // 610 - 50
                        const spacing = availableWidth / count;
                        const barWidth = Math.min(34, Math.max(14, spacing * 0.55));
                        const x = 45 + idx * spacing + (spacing - barWidth) / 2;

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
                            {item.processed > 0 && (
                              <rect
                                x={x}
                                y={processedY}
                                width={barWidth}
                                height={processedHeight}
                                rx="2"
                                fill="#28006d"
                                opacity={hoveredBar && !isHovered ? 0.75 : 1}
                              />
                            )}

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
                          {selectedTimeRange === 'Today' ? `Hour ${hoveredBar.hour}` : hoveredBar.hour} Breakdown
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
                  {distribution.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#7a7583]">
                      {t('ocrAnalytics.documentDistribution.none', 'No document distribution data recorded.')}
                    </div>
                  ) : (
                    distribution.map((item) => (
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
                    ))
                  )}
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
                  {recentExceptions.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#7a7583]">
                      {t('ocrAnalytics.recentExceptions.none', 'No exceptions recorded in this time range.')}
                    </div>
                  ) : (
                    recentExceptions.map((exc) => (
                      <div
                        key={exc.id}
                        className="ocr-exception-item"
                        onClick={() => handleNav('/admin/ocr/queue')}
                        role="button"
                        tabIndex={0}
                        title={exc.title}
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
                    ))
                  )}
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

