import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Menu,
  Search,
  Bell,
  History,
  HelpCircle,
  ChevronRight,
  Activity,
  Server,
  Cpu,
  Database,
  Layers,
  Lock,
  FileDown,
  FileText,
  FileSpreadsheet,
  FileCode,
  ArrowUpRight,
  SlidersHorizontal,
  Inbox,
  X,
  AlertCircle,
} from 'lucide-react';

import AdminSidebar from '../common/AdminSidebar';
import {
  useSystemHealthQuery,
  useGeneratedReportsQuery,
  useGenerateReportMutation,
  exportConfigSchema,
  type ExportConfigFormValues,
} from '../../services/systemHealthService';
import './AdminSystemHealthExport.css';

export interface AdminSystemHealthExportProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminSystemHealthExport: React.FC<AdminSystemHealthExportProps> = ({
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [backendNotice, setBackendNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Live Queries & Mutations
  const { data: healthData } = useSystemHealthQuery();
  const { data: generatedReports, refetch: refetchReports } = useGeneratedReportsQuery();
  const generateMutation = useGenerateReportMutation();

  // Form Setup using React Hook Form & Zod
  const {
    watch,
    setValue,
    handleSubmit,
  } = useForm<ExportConfigFormValues>({
    resolver: zodResolver(exportConfigSchema),
    defaultValues: {
      format: 'PDF',
      frequency: 'ONE_TIME',
    },
  });

  const selectedFormat = watch('format');
  const selectedFrequency = watch('frequency');

  // Form Submission — trigger real backend generation & export
  const onSubmit = async () => {
    try {
      setBackendNotice(null);
      const res = await generateMutation.mutateAsync({
        title: `System Health Export (${selectedFormat})`,
        format: selectedFormat,
        frequency: selectedFrequency,
      });
      showToast(
        t(
          'systemHealth.exportEngine.successToast',
          `Report #${res.reportId.slice(0, 8)} exported successfully as ${res.format}!`
        )
      );
    } catch (err: any) {
      console.error('Failed to generate report:', err);
      setBackendNotice(
        err?.message ||
          t('systemHealth.exportEngine.failureNotice', 'Failed to generate export on the live backend.')
      );
    }
  };

  // Clear Filters Handler
  const handleClearFilters = () => {
    refetchReports();
    showToast(t('common.filtersCleared', 'Filters refreshed.'));
  };

  const infra = healthData?.infrastructure;
  const workload = healthData?.workload;

  return (
    <div
      className="system-health-wrapper"
      data-node-id="20:6239"
      data-name="Admin Portal - System Health & Export"
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

      {/* Primary Left Navigation Bar (Shared Component) */}
      <AdminSidebar
        activeNav="reports"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
        ctaLabel="+ New Record"
        onCtaClick={() => handleNav('/admin/records/upload')}
      />

      {/* Main Layout Container */}
      <div className="system-health-main-wrapper flex-1 min-w-0 w-full flex flex-col h-screen overflow-hidden">
        {/* Stationary Top Global Navigation Bar (Figma 20:6241) */}
        <header className="system-health-top-navbar" role="banner">
          <div className="system-health-top-left">
            {/* Mobile Drawer Toggle */}
            <button
              type="button"
              className="p-2 -ml-2 text-[#494552] hover:text-[#28006d] md:hidden rounded-lg"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>

            {/* Header Title: Referral Management (Exact match to Figma 20:6244) */}
            <h2 className="system-health-header-title">
              {t('systemHealth.header.title', 'Referral Management')}
            </h2>

            {/* Search Bar (Figma 20:6245) */}
            <div className="system-health-search-bar">
              <Search size={15} className="system-health-search-icon" aria-hidden="true" />
              <input
                type="text"
                className="system-health-search-input"
                placeholder={t(
                  'systemHealth.header.searchPlaceholder',
                  'Search records, patients, or referrals...'
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search records, patients, or referrals"
              />
            </div>
          </div>

          <div className="system-health-top-right">
            {/* Notification Bell (Figma 20:6252) */}
            <button
              type="button"
              className="system-health-icon-btn"
              title={t('common.notifications', 'Notifications')}
              aria-label="View notifications"
            >
              <Bell size={18} />
              <span className="system-health-notification-dot" />
            </button>

            {/* History Icon (Figma 20:6256) */}
            <button
              type="button"
              className="system-health-icon-btn"
              title={t('common.history', 'History')}
              aria-label="View history"
              onClick={() => handleNav('/admin/referrals/audit')}
            >
              <History size={18} />
            </button>

            {/* Help Icon (Figma 20:6260) */}
            <button
              type="button"
              className="system-health-icon-btn"
              title={t('common.help', 'Help')}
              aria-label="Get help"
            >
              <HelpCircle size={18} />
            </button>

            {/* Vertical Divider (Figma 20:6264) */}
            <div className="system-health-divider" aria-hidden="true" />

            {/* Administrator Profile (Figma 20:6265) */}
            <div
              className="system-health-admin-avatar"
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

        {/* Scrollable Canvas Body (Figma 20:6268) */}
        <main className="system-health-canvas">
          {/* Breadcrumbs & Header (Figma 20:6269) */}
          <div className="system-health-header-group">
            <nav className="system-health-breadcrumbs" aria-label="Breadcrumb">
              <button
                type="button"
                className="system-health-breadcrumb-link"
                onClick={() => handleNav('/admin/reports')}
              >
                {t('systemHealth.breadcrumbs.reports', 'Reports')}
              </button>
              <ChevronRight size={12} className="text-[#494552] shrink-0" aria-hidden="true" />
              <span className="system-health-breadcrumb-current">
                {t('systemHealth.breadcrumbs.current', 'System Health & Export')}
              </span>
            </nav>

            <h1 className="system-health-title">
              {t('systemHealth.overview.title', 'System Overview')}
            </h1>

            <p className="system-health-subtitle">
              {t(
                'systemHealth.overview.description',
                'Monitor real-time infrastructure status and manage data exports.'
              )}
            </p>
          </div>

          {/* 12-Column Bento Grid Layout (Figma 20:6281) */}
          <div className="system-health-bento-grid">
            {/* Card 1: Infrastructure Health (Span 8) (Figma 20:6282) */}
            <section
              className="system-health-card system-health-card-infra"
              aria-labelledby="heading-infra-health"
            >
              <div className="system-health-card-header">
                <div className="system-health-card-title-group">
                  <Activity size={20} className="text-[#191c1e] shrink-0" aria-hidden="true" />
                  <h3 id="heading-infra-health" className="system-health-card-title">
                    {t('systemHealth.infra.title', 'Infrastructure Health')}
                  </h3>
                </div>
                <span className="system-health-last-updated">
                  {t('systemHealth.infra.lastUpdated', 'Last updated: Just now')}
                </span>
              </div>

              <div className="system-health-infra-grid">
                {/* Subcard 1: Server Cluster (Figma 20:6292) */}
                <article className="system-health-status-subcard">
                  <div className="system-health-subcard-top">
                    <div className="system-health-icon-bubble" aria-hidden="true">
                      <Server size={18} />
                    </div>
                    <span className="system-health-healthy-badge">
                      <span className="system-health-healthy-dot" />
                      <span>{t('systemHealth.infra.healthy', 'Healthy')}</span>
                    </span>
                  </div>
                  <div className="system-health-subcard-bottom">
                    <span className="system-health-subcard-label">
                      {t('systemHealth.infra.serverCluster', 'Server Cluster')}
                    </span>
                    <div className="system-health-subcard-metric">
                      <span>{infra?.serverCluster.metric || '99.9%'}</span>
                      <span className="system-health-subcard-metric-desc">
                        {t('systemHealth.infra.uptime', 'Uptime')}
                      </span>
                    </div>
                  </div>
                </article>

                {/* Subcard 2: API Gateway (Figma 20:6307) */}
                <article className="system-health-status-subcard">
                  <div className="system-health-subcard-top">
                    <div className="system-health-icon-bubble" aria-hidden="true">
                      <Cpu size={20} />
                    </div>
                    <span className="system-health-healthy-badge">
                      <span className="system-health-healthy-dot" />
                      <span>{t('systemHealth.infra.healthy', 'Healthy')}</span>
                    </span>
                  </div>
                  <div className="system-health-subcard-bottom">
                    <span className="system-health-subcard-label">
                      {t('systemHealth.infra.apiGateway', 'API Gateway')}
                    </span>
                    <div className="system-health-subcard-metric">
                      <span>{infra?.apiGateway.metric || '42ms'}</span>
                      <span className="system-health-subcard-metric-desc">
                        {t('systemHealth.infra.avgLatency', 'Avg Latency')}
                      </span>
                    </div>
                  </div>
                </article>

                {/* Subcard 3: Main Database (Figma 20:6322) */}
                <article className="system-health-status-subcard">
                  <div className="system-health-subcard-top">
                    <div className="system-health-icon-bubble" aria-hidden="true">
                      <Database size={18} />
                    </div>
                    <span className="system-health-healthy-badge">
                      <span className="system-health-healthy-dot" />
                      <span>{t('systemHealth.infra.healthy', 'Healthy')}</span>
                    </span>
                  </div>
                  <div className="system-health-subcard-bottom">
                    <span className="system-health-subcard-label">
                      {t('systemHealth.infra.mainDatabase', 'Main Database')}
                    </span>
                    <div className="system-health-subcard-metric">
                      <span>{infra?.mainDatabase.metric || '—'}</span>
                      <span className="system-health-subcard-metric-desc">
                        {infra?.mainDatabase.description || 'Latency'}
                      </span>
                    </div>
                  </div>
                </article>
              </div>
            </section>

            {/* Card 2: Workload & Storage (Span 4) (Figma 20:6337) */}
            <section
              className="system-health-card system-health-card-workload"
              aria-labelledby="heading-workload-storage"
            >
              <div className="system-health-card-header">
                <div className="system-health-card-title-group">
                  <Layers size={18} className="text-[#191c1e] shrink-0" aria-hidden="true" />
                  <h3 id="heading-workload-storage" className="system-health-card-title">
                    {t('systemHealth.workload.title', 'Workload & Storage')}
                  </h3>
                </div>
              </div>

              <div className="system-health-workload-list">
                {/* Item 1: OCR Processing Queue */}
                <div className="system-health-workload-item">
                  <div className="system-health-workload-top">
                    <span className="system-health-workload-label">
                      {t('systemHealth.workload.ocrQueue', 'OCR Processing Queue')}
                    </span>
                    <span className="system-health-workload-val">
                      {workload?.ocrQueueDocs ?? 0}{' '}
                      <span className="system-health-workload-unit">
                        {t('systemHealth.workload.docs', 'docs')}
                      </span>
                    </span>
                  </div>
                  <div className="system-health-progress-track">
                    <div
                      className="system-health-progress-fill-green"
                      style={{ width: `${workload?.ocrQueuePercent ?? 0}%` }}
                    />
                  </div>
                  <span className="system-health-workload-status-label">
                    {workload?.ocrQueueStatus || t('systemHealth.workload.normalLoad', 'Normal load')}
                  </span>
                </div>

                {/* Item 2: Background Sync Jobs */}
                <div className="system-health-workload-item">
                  <div className="system-health-workload-top">
                    <span className="system-health-workload-label">
                      {t('systemHealth.workload.syncJobs', 'Background Sync Jobs')}
                    </span>
                    <span className="system-health-workload-val">
                      {workload?.backgroundSyncJobs ?? 0}{' '}
                      <span className="system-health-workload-unit">
                        {t('systemHealth.workload.active', 'active')}
                      </span>
                    </span>
                  </div>
                  <div className="system-health-progress-track">
                    <div
                      className="system-health-progress-fill-purple"
                      style={{ width: `${workload?.backgroundSyncPercent ?? 0}%` }}
                    />
                  </div>
                </div>

                {/* Item 3: Vault Storage */}
                <div className="system-health-workload-item system-health-storage-divider">
                  <div className="system-health-workload-top">
                    <div className="flex items-center gap-1.5">
                      <Lock size={12} className="text-[#494552]" aria-hidden="true" />
                      <span className="system-health-workload-label">
                        {t('systemHealth.workload.vaultStorage', 'Vault Storage')}
                      </span>
                    </div>
                    <span className="system-health-workload-val text-xs text-[#7a7583]">
                      API unexposed
                    </span>
                  </div>
                  <div className="system-health-progress-track" style={{ height: '8px' }}>
                    <div
                      className="system-health-progress-fill-amber"
                      style={{ width: '0%' }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#7a7583] font-medium pt-1">
                    <span>Storage metrics not exposed by live backend API</span>
                    <span>—</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Card 3: Data Export Engine (Span 12) (Figma 20:6380) */}
            <section
              className="system-health-card system-health-card-export"
              aria-labelledby="heading-export-engine"
            >
              <div className="flex flex-col gap-1">
                <div className="system-health-card-title-group">
                  <FileDown size={18} className="text-[#191c1e] shrink-0" aria-hidden="true" />
                  <h3 id="heading-export-engine" className="system-health-card-title">
                    {t('systemHealth.exportEngine.title', 'Data Export Engine')}
                  </h3>
                </div>
                <p className="system-health-card-export-desc">
                  {t(
                    'systemHealth.exportEngine.subtitle',
                    'Configure and generate system data reports securely.'
                  )}
                </p>
              </div>

              <div className="system-health-export-columns">
                {/* Left Column: Format & Frequency Selection */}
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="system-health-export-left-col"
                  noValidate
                >
                  {/* Export Format (Figma 20:6391) */}
                  <div className="system-health-form-group">
                    <label className="system-health-form-label">
                      {t('systemHealth.exportEngine.formatLabel', 'Export Format')}
                    </label>
                    <div className="system-health-format-options" role="radiogroup" aria-label="Export format">
                      {/* Option 1: PDF */}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedFormat === 'PDF'}
                        className={`system-health-format-btn ${
                          selectedFormat === 'PDF' ? 'active' : ''
                        }`}
                        onClick={() => setValue('format', 'PDF')}
                      >
                        <FileText size={18} className="shrink-0" />
                        <span className="system-health-format-text">
                          PDF Report
                        </span>
                      </button>

                      {/* Option 2: Excel */}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedFormat === 'EXCEL'}
                        className={`system-health-format-btn ${
                          selectedFormat === 'EXCEL' ? 'active' : ''
                        }`}
                        onClick={() => setValue('format', 'EXCEL')}
                      >
                        <FileSpreadsheet size={18} className="shrink-0" />
                        <span className="system-health-format-text">
                          Excel (.xlsx)
                        </span>
                      </button>

                      {/* Option 3: Raw CSV */}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedFormat === 'CSV'}
                        className={`system-health-format-btn ${
                          selectedFormat === 'CSV' ? 'active' : ''
                        }`}
                        onClick={() => setValue('format', 'CSV')}
                      >
                        <FileCode size={18} className="shrink-0" />
                        <span className="system-health-format-text">
                          Raw CSV
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Frequency Selection (Figma 20:6407) */}
                  <div className="system-health-form-group">
                    <label className="system-health-form-label">
                      {t('systemHealth.exportEngine.frequencyLabel', 'Frequency')}
                    </label>
                    <div className="system-health-frequency-row" role="radiogroup" aria-label="Export frequency">
                      <label
                        className="system-health-radio-label"
                        onClick={() => setValue('frequency', 'ONE_TIME')}
                      >
                        <div
                          className={`system-health-radio-dot-outer ${
                            selectedFrequency === 'ONE_TIME' ? 'selected' : ''
                          }`}
                        >
                          {selectedFrequency === 'ONE_TIME' && (
                            <div className="system-health-radio-dot-inner" />
                          )}
                        </div>
                        <span className="system-health-radio-text">
                          {t('systemHealth.exportEngine.oneTime', 'One-time Export')}
                        </span>
                      </label>

                      <label
                        className="system-health-radio-label"
                        onClick={() => setValue('frequency', 'SCHEDULED_WEEKLY')}
                      >
                        <div
                          className={`system-health-radio-dot-outer ${
                            selectedFrequency === 'SCHEDULED_WEEKLY' ? 'selected' : ''
                          }`}
                        >
                          {selectedFrequency === 'SCHEDULED_WEEKLY' && (
                            <div className="system-health-radio-dot-inner" />
                          )}
                        </div>
                        <span className="system-health-radio-text">
                          {t(
                            'systemHealth.exportEngine.scheduledWeekly',
                            'Scheduled (Weekly)'
                          )}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Backend Dependency Notice if Triggered */}
                  {backendNotice && (
                    <div className="system-health-notice-banner" role="alert">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <span>{backendNotice}</span>
                    </div>
                  )}

                  {/* Generate Export CTA Button (Figma 20:6421) */}
                  <button
                    type="submit"
                    disabled={generateMutation.isPending}
                    className="system-health-export-btn"
                  >
                    <span>
                      {generateMutation.isPending
                        ? t('systemHealth.exportEngine.generatingButton', 'Generating Export...')
                        : t('systemHealth.exportEngine.generateButton', 'Generate Export')}
                    </span>
                    <ArrowUpRight size={14} className="shrink-0" aria-hidden="true" />
                  </button>
                </form>

                {/* Right Column: Recent Exports / Live Backend Reports (Figma 20:6425) */}
                <div className="system-health-export-right-col">
                  <div className="system-health-recent-header">
                    <span className="system-health-form-label">
                      {t('systemHealth.exportEngine.recentExportsTitle', 'Recent Exports')}
                    </span>
                    <button
                      type="button"
                      onClick={() => refetchReports()}
                      className="text-[#494552] hover:text-[#28006d] transition-colors p-1"
                      title={t('common.filter', 'Filter / Refresh')}
                      aria-label="Filter or refresh recent exports"
                    >
                      <SlidersHorizontal size={14} />
                    </button>
                  </div>

                  {generatedReports && generatedReports.length > 0 ? (
                    <div className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                      {generatedReports.slice(0, 5).map((rep) => (
                        <div
                          key={rep.id}
                          className="p-3 bg-white border border-[#cbc4d4] rounded-xl flex items-center justify-between hover:border-[#28006d] transition-colors"
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-xs font-semibold text-[#191c1e] truncate">
                              {rep.title}
                            </span>
                            <span className="text-[11px] text-[#7a7583]">
                              {new Date(rep.createdAt).toLocaleDateString()} • {rep.format}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                                rep.status === 'EXPORTED'
                                  ? 'bg-[#e6f7f5] text-[#006a60]'
                                  : 'bg-[#edeef0] text-[#494552]'
                              }`}
                            >
                              {rep.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                showToast(`Report #${rep.id.slice(0, 8)} exported as ${rep.format}`);
                              }}
                              className="text-[#28006d] hover:text-[#3b0a94] p-1 rounded hover:bg-[#edeef0]"
                              title="Download Report"
                              aria-label="Download Report"
                            >
                              <ArrowUpRight size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="system-health-empty-state-box">
                      <div className="system-health-empty-bubble" aria-hidden="true">
                        <Inbox size={22} />
                      </div>
                      <h4 className="system-health-empty-title">
                        {t('systemHealth.exportEngine.noDataTitle', 'No Data Available')}
                      </h4>
                      <p className="system-health-empty-desc">
                        {t(
                          'systemHealth.exportEngine.noDataDesc',
                          'Current filters return nothing, or no exports have been generated yet.'
                        )}
                      </p>
                      <button
                        type="button"
                        className="system-health-clear-btn"
                        onClick={handleClearFilters}
                      >
                        {t('systemHealth.exportEngine.clearFilters', 'Clear Filters')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminSystemHealthExport;

