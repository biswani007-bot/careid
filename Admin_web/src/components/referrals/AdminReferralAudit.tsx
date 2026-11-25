import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Bell,
  Clock,
  HelpCircle,
  Menu,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  FileEdit,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  AlertCircle,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import type {
  ReferralAuditLogItem,
  AuditLogFilters,
} from '../../services/referralService';
import {
  useReferralAuditLogsQuery,
  useEscalatedReferralsQuery,
  exportAuditLogsToCSV,
} from '../../services/referralService';
import './AdminReferralAudit.css';

interface AdminReferralAuditProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

const ACTION_OPTIONS = ['All', 'Escalated', 'Verified', 'Modified', 'Approved'];

export const AdminReferralAudit: React.FC<AdminReferralAuditProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCapabilityNotice, setShowCapabilityNotice] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters state
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('All');
  const [selectedUser, setSelectedUser] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const filters: AuditLogFilters = useMemo(
    () => ({
      searchQuery: globalSearch,
      action: selectedAction !== 'All' ? selectedAction : undefined,
      userId: selectedUser !== 'All' ? selectedUser : undefined,
    }),
    [globalSearch, selectedAction, selectedUser]
  );

  // Queries
  const {
    data: auditData,
    isLoading: isAuditLoading,
    isError: isAuditError,
    refetch: refetchAudit,
  } = useReferralAuditLogsQuery(filters, page, pageSize, {
    refetchInterval: isLiveActive ? 10000 : false,
  });

  const { data: escalationsData } = useEscalatedReferralsQuery();

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  const handleExportCSV = () => {
    if (!auditData?.records || auditData.records.length === 0) {
      setToastMessage(t('referralAudit.table.emptyTitle', 'No Audit Records Found'));
      return;
    }
    exportAuditLogsToCSV(auditData.records);
    setToastMessage(
      t('referralAudit.exportSuccess', 'Audit log CSV exported successfully ({{count}} records).', {
        count: auditData.records.length,
      })
    );
  };

  const handleResetFilters = () => {
    setSelectedAction('All');
    setSelectedUser('All');
    setGlobalSearch('');
    setPage(1);
    setShowFilterModal(false);
  };

  const dynamicUserOptions = useMemo(() => {
    const users = (auditData?.records || [])
      .map((r) => r.userId)
      .filter(Boolean);
    return ['All', ...Array.from(new Set(users))];
  }, [auditData?.records]);

  const isFiltered =
    globalSearch.trim() !== '' ||
    selectedAction !== 'All' ||
    selectedUser !== 'All';

  // Escalations condition: if real data is empty
  const isEscalationsEmpty = !escalationsData || escalationsData.length === 0;

  return (
    <div className="audit-dashboard-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#1e1b4b] text-white px-5 py-3 rounded-xl shadow-2xl border border-indigo-400/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 size={18} className="text-[#10b981]" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Shared CareID Sidebar with Referrals active and Referral Audit highlighted */}
      <AdminSidebar
        activeNav="referrals-audit"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
        ctaLabel="+ New Record"
        onCtaClick={() => handleNav('/admin/records/upload')}
      />

      {/* Main Content Area */}
      <div className="audit-main-wrapper">
        {/* Stationary Top Global App Bar matching Figma 20:5537 */}
        <header className="audit-top-navbar" role="banner">
          <div className="audit-top-left">
            <button
              type="button"
              className="audit-menu-toggle"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="audit-brand-title">
              {t('referralMonitoring.pageTitle', 'Referral Management')}
            </h1>

            {/* Navigation Tabs */}
            <nav className="audit-nav-tabs" aria-label="Referral sections">
              <button
                type="button"
                className="audit-nav-tab"
                onClick={() => handleNav('/admin/referrals')}
              >
                {t('referralMonitoring.topTabs.overview', 'Overview')}
              </button>
              <button
                type="button"
                className="audit-nav-tab"
                onClick={() => handleNav('/admin/referrals/escalations')}
              >
                {t('referralMonitoring.topTabs.escalations', 'Escalations')}
              </button>
              <button
                type="button"
                className="audit-nav-tab active"
                aria-current="page"
              >
                {t('referralAudit.breadcrumbs.auditHistory', 'Audit History')}
              </button>
            </nav>
          </div>

          <div className="audit-top-actions">
            {/* Global Search Bar matching Figma 20:5541 */}
            <div className="audit-search-box">
              <Search size={16} className="audit-search-icon" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t('referralMonitoring.searchPlaceholder', 'Search referrals...')}
                className="audit-search-input"
              />
            </div>

            {/* Notification Bell with red indicator dot matching Figma 20:5548 */}
            <button
              type="button"
              className="audit-icon-btn"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#ba1a1a] rounded-full ring-2 ring-white" />
            </button>

            {/* Operational History Button matching Figma 20:5552 (Active state) */}
            <button
              type="button"
              className="audit-icon-btn active-history"
              aria-label="Audit History"
              title="Audit History active view"
            >
              <Clock size={18} />
            </button>

            {/* Help Icon matching Figma 20:5555 */}
            <button
              type="button"
              className="audit-icon-btn hidden sm:flex"
              aria-label="Help & Documentation"
              onClick={() => setShowCapabilityNotice(true)}
            >
              <HelpCircle size={18} />
            </button>

            {/* Administrator Profile Avatar matching Figma 20:5559 */}
            <button
              type="button"
              className="audit-avatar-btn p-0"
              aria-label="My Profile & Information"
              title="My Profile & Information"
              onClick={() => handleNav('/admin/profile')}
            >
              <AdminProfileAvatar size="full" />
            </button>
          </div>
        </header>

        {/* Scrollable Canvas matching Figma 20:5561 */}
        <main className="audit-canvas" role="main">
          <div className="audit-canvas-inner">
            {/* Page Header matching Figma 20:5562 */}
            <div className="audit-page-header">
              <div>
                {/* Breadcrumbs matching Figma 20:5564 */}
                <div className="audit-breadcrumb-row" aria-label="Breadcrumb">
                  <button
                    type="button"
                    onClick={() => handleNav('/admin/referrals')}
                    className="audit-breadcrumb-link"
                  >
                    {t('referralAudit.breadcrumbs.referrals', 'Referrals')}
                  </button>
                  <span className="audit-breadcrumb-sep">
                    <ChevronRight size={12} />
                  </span>
                  <span className="audit-breadcrumb-current">
                    {t('referralAudit.breadcrumbs.auditHistory', 'Audit History')}
                  </span>
                </div>

                <h2 className="audit-page-title">
                  {t('referralAudit.title', 'System Audit Log')}
                </h2>
                <p className="audit-page-description">
                  {t(
                    'referralAudit.description',
                    'Tracking lifecycle events and escalations for all referrals.'
                  )}
                </p>
              </div>

              {/* Header Actions matching Figma 20:5575 */}
              <div className="audit-header-actions">
                <button
                  type="button"
                  onClick={() => setShowFilterModal(true)}
                  className={`audit-action-btn filter ${isFiltered ? 'active' : ''}`}
                  title="Filter audit records"
                >
                  <Filter size={13} />
                  <span>{t('referralAudit.actions.filter', 'Filter')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="audit-action-btn export"
                  title="Export audit log as CSV"
                >
                  <Download size={13} />
                  <span>{t('referralAudit.actions.exportCsv', 'Export CSV')}</span>
                </button>
              </div>
            </div>

            {/* Truthful Backend API Capability Notice */}
            <div className="audit-capability-banner" role="status">
              <div className="audit-capability-text">
                <ShieldCheck size={18} className="text-[#28006d] shrink-0" />
                <span>
                  <strong>{t('referralAudit.capabilityNotice.badge', 'Contract Specification')}:</strong>{' '}
                  {t(
                    'referralAudit.capabilityNotice.description',
                    'The CareID backend does not expose a dedicated GET /api/v1/referrals/audit endpoint. Audit events reflect actual status transitions and administrative operations.'
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCapabilityNotice(true)}
                className="text-xs font-semibold text-[#28006d] underline hover:text-[#3b009e] whitespace-nowrap"
              >
                View Contract Details
              </button>
            </div>

            {/* Bento Grid Layout matching Figma 20:5584 */}
            <div className="audit-bento-grid">
              {/* Main Audit Log (Spans 2 columns on XL) matching Figma 20:5585 */}
              <div className="audit-main-log-col">
                <div className="audit-log-card">
                  {/* Card Header matching Figma 20:5587 */}
                  <div className="audit-card-header">
                    <div className="audit-card-title-group">
                      <SlidersHorizontal size={18} className="text-[#191c1e]" />
                      <h3 className="audit-card-title">
                        {t('referralAudit.table.title', 'Recent Activity Log')}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsLiveActive(!isLiveActive)}
                        className="audit-status-badge"
                        title={t('referralAudit.actions.toggleLive', 'Toggle Live Sync')}
                      >
                        {isLiveActive && <span className="audit-live-dot" />}
                        <span>
                          {isLiveActive
                            ? t('referralAudit.actions.liveActive', 'Live Updates Active')
                            : t('referralAudit.actions.livePaused', 'Static Snapshot')}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Contained Scrollable Table matching Figma 20:5595 */}
                  <div className="audit-table-wrapper">
                    {isAuditLoading ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#494552]">
                        <div className="w-8 h-8 border-3 border-[#28006d] border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-medium">
                          {t('referralAudit.table.loading', 'Loading audit history...')}
                        </p>
                      </div>
                    ) : isAuditError ? (
                      <div className="py-16 px-4 flex flex-col items-center justify-center text-center gap-3">
                        <AlertCircle size={36} className="text-[#ba1a1a]" />
                        <h4 className="text-base font-bold text-[#191c1e]">
                          {t('referralAudit.table.errorTitle', 'Unable to Load Audit Trail')}
                        </h4>
                        <p className="text-sm text-[#494552]">
                          {t(
                            'referralAudit.table.errorSubtitle',
                            'There was an error retrieving referral lifecycle events.'
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => refetchAudit()}
                          className="mt-2 px-4 py-2 bg-[#28006d] text-white rounded-lg text-sm font-semibold hover:bg-[#3b009e]"
                        >
                          {t('referralAudit.table.retry', 'Retry')}
                        </button>
                      </div>
                    ) : !auditData?.records || auditData.records.length === 0 ? (
                      /* Genuine Empty State */
                      <div className="py-16 px-6 flex flex-col items-center justify-center text-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#f2f4f6] flex items-center justify-center text-[#7a7583]">
                          <Activity size={24} className="text-[#28006d]" />
                        </div>
                        <h4 className="text-base font-bold text-[#191c1e]">
                          {t('referralAudit.table.emptyTitle', 'No Audit Records Found')}
                        </h4>
                        <p className="text-sm text-[#494552] max-w-md">
                          {t(
                            'referralAudit.table.emptySubtitle',
                            'No lifecycle status transitions or administrative events have been recorded for referrals yet.'
                          )}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          {isFiltered && (
                            <button
                              type="button"
                              onClick={handleResetFilters}
                              className="px-4 py-2 border border-[#cbc4d4] rounded-lg text-sm font-semibold text-[#191c1e] hover:bg-[#f2f4f6]"
                            >
                              {t('referralAudit.actions.reset', 'Reset Filter')}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Populated Audit Log Table */
                      <table className="audit-table" aria-label="Referral Audit Trail">
                        <thead>
                          <tr>
                            <th scope="col" className="audit-col-timestamp">
                              {t('referralAudit.table.cols.timestamp', 'Timestamp')}
                            </th>
                            <th scope="col" className="audit-col-userid">
                              {t('referralAudit.table.cols.userId', 'User ID')}
                            </th>
                            <th scope="col" className="audit-col-action">
                              {t('referralAudit.table.cols.action', 'Action')}
                            </th>
                            <th scope="col" className="audit-col-status">
                              {t('referralAudit.table.cols.statusChange', 'Status Change')}
                            </th>
                            <th scope="col" className="audit-col-ip">
                              {t('referralAudit.table.cols.ipAddress', 'IP Address')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditData.records.map((item: ReferralAuditLogItem) => (
                            <tr key={item.id} className="audit-row">
                              {/* Timestamp with status pip matching Figma 20:5610 */}
                              <td>
                                <div className="audit-timestamp-cell">
                                  <span
                                    className={`audit-pip ${item.pipColor || 'teal'}`}
                                    aria-hidden="true"
                                  />
                                  <span>{item.timestampFormatted}</span>
                                </div>
                              </td>

                              {/* User ID in monospaced purple matching Figma 20:5613 */}
                              <td>
                                <span className="audit-userid-cell">{item.userId}</span>
                              </td>

                              {/* Action badge matching Figma 20:5615 */}
                              <td>
                                <span
                                  className={`audit-action-badge ${item.action.toLowerCase()}`}
                                >
                                  {item.action === 'Escalated' && (
                                    <AlertTriangle size={12} className="text-[#93000a]" />
                                  )}
                                  {item.action === 'Verified' && (
                                    <SlidersHorizontal size={11} className="text-[#191c1e]" />
                                  )}
                                  {item.action === 'Modified' && (
                                    <FileEdit size={11} className="text-[#191c1e]" />
                                  )}
                                  {item.action === 'Approved' && (
                                    <Check size={12} className="text-[#191c1e]" />
                                  )}
                                  <span>{item.action}</span>
                                </span>
                              </td>

                              {/* Status Change with strikethrough matching Figma 20:5620 */}
                              <td>
                                <div className="audit-status-cell">
                                  {item.fromStatus && (
                                    <>
                                      <span className="audit-status-old">
                                        {item.fromStatus}
                                      </span>
                                      <span className="audit-status-arrow">→</span>
                                    </>
                                  )}
                                  <span
                                    className={`audit-status-new ${
                                      item.toStatus.toLowerCase().includes('critical') ||
                                      item.toStatus.toLowerCase().includes('escalated')
                                        ? 'critical'
                                        : item.toStatus.toLowerCase().includes('pending')
                                        ? 'pending-review'
                                        : 'active'
                                    }`}
                                  >
                                    {item.toStatus}
                                  </span>
                                </div>
                              </td>

                              {/* IP Address matching Figma 20:5627 */}
                              <td>
                                <span className="audit-ip-cell">{item.ipAddress}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Table Footer matching Figma 20:5689 */}
                  {auditData && auditData.total > 0 && (
                    <div className="audit-table-footer">
                      <span className="audit-records-count">
                        {t('referralAudit.table.showingRecords', 'Showing {{start}}–{{end}} of {{total}} records', {
                          start: (auditData.page - 1) * pageSize + 1,
                          end: Math.min(auditData.page * pageSize, auditData.total),
                          total: auditData.total,
                        })}
                      </span>

                      <div className="audit-pagination-btns">
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={auditData.page <= 1}
                          className="audit-page-arrow-btn"
                          aria-label="Previous Page"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.min(auditData.totalPages, p + 1))}
                          disabled={auditData.page >= auditData.totalPages}
                          className="audit-page-arrow-btn"
                          aria-label="Next Page"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Escalations Empty State Panel matching Figma 20:5700 */}
              <div className="audit-empty-state-col">
                <div className="audit-escalation-panel">
                  {isEscalationsEmpty ? (
                    <>
                      {/* Icon inside 64px circular container matching Figma 20:5704 */}
                      <div className="audit-panel-icon-wrap">
                        <CheckCircle2 size={32} />
                      </div>

                      {/* Heading matching Figma 20:5709 */}
                      <h4 className="audit-panel-heading">
                        {t('referralAudit.escalationsPanel.emptyHeading', 'No Escalations Found')}
                      </h4>

                      {/* Description matching Figma 20:5712 */}
                      <p className="audit-panel-description">
                        {t(
                          'referralAudit.escalationsPanel.emptyDescription',
                          'All critical referral workflows are operating normally. No manual intervention required.'
                        )}
                      </p>

                      {/* Check Monitoring Button matching Figma 20:5713 */}
                      <button
                        type="button"
                        onClick={() => handleNav('/admin/referrals/escalations')}
                        className="audit-check-btn"
                      >
                        <Activity size={14} />
                        <span>
                          {t('referralAudit.escalationsPanel.checkMonitoring', 'Check Monitoring')}
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Active Escalations detected */}
                      <div className="audit-panel-icon-wrap" style={{ backgroundColor: '#ffdad6', color: '#93000a' }}>
                        <AlertTriangle size={32} />
                      </div>

                      <h4 className="audit-panel-heading" style={{ color: '#93000a' }}>
                        {t('referralAudit.escalationsPanel.activeHeading', 'Escalations Pending ({{count}})', {
                          count: escalationsData.length,
                        })}
                      </h4>

                      <p className="audit-panel-description">
                        {t(
                          'referralAudit.escalationsPanel.activeDescription',
                          'Critical referral SLA delays detected requiring triage intervention.'
                        )}
                      </p>

                      <div className="flex flex-col gap-2 items-center">
                        <button
                          type="button"
                          onClick={() => handleNav('/admin/referrals/escalations')}
                          className="audit-check-btn"
                        >
                          <Activity size={14} />
                          <span>
                            {t('referralAudit.escalationsPanel.viewQueue', 'Check Monitoring')}
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* =========================================================================
          MODALS & DIALOGS
         ========================================================================= */}

      {/* 1. Filter Audit Trail Modal */}
      {showFilterModal && (
        <div
          className="audit-modal-backdrop"
          onClick={() => setShowFilterModal(false)}
        >
          <div
            className="audit-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-modal-title"
          >
            <div className="audit-modal-header">
              <div>
                <h3 id="filter-modal-title" className="audit-modal-title">
                  {t('referralAudit.filterModal.title', 'Filter Audit Trail')}
                </h3>
                <p className="audit-modal-subtitle">
                  {t(
                    'referralAudit.filterModal.subtitle',
                    'Narrow down lifecycle events by action, user, or status.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="audit-modal-close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="audit-modal-body">
              {/* Action Filter */}
              <div className="audit-form-group">
                <label className="audit-form-label">
                  {t('referralAudit.filterModal.actionLabel', 'Action Type')}
                </label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="audit-form-select"
                >
                  {ACTION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === 'All'
                        ? t('referralAudit.filterModal.allActions', 'All Actions')
                        : opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* User ID Filter */}
              <div className="audit-form-group">
                <label className="audit-form-label">
                  {t('referralAudit.filterModal.userLabel', 'User ID / System Bot')}
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="audit-form-select"
                >
                  {dynamicUserOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === 'All'
                        ? t('referralAudit.filterModal.allUsers', 'All Users')
                        : opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Details Filter */}
              <div className="audit-form-group">
                <label className="audit-form-label">
                  {t('referralAudit.filterModal.searchLabel', 'Search Event Details')}
                </label>
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder={t(
                    'referralAudit.filterModal.searchPlaceholder',
                    'Search IP, status, or details...'
                  )}
                  className="audit-form-input"
                />
              </div>
            </div>

            <div className="audit-modal-footer">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 border border-[#cbc4d4] rounded-lg text-sm font-semibold text-[#191c1e] hover:bg-[#f2f4f6]"
              >
                {t('referralAudit.actions.reset', 'Reset')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setShowFilterModal(false);
                }}
                className="px-4 py-2 bg-[#28006d] text-white rounded-lg text-sm font-semibold hover:bg-[#3b009e]"
              >
                {t('referralAudit.actions.apply', 'Apply Filter')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. OpenAPI Capability Notice Modal */}
      {showCapabilityNotice && (
        <div
          className="audit-modal-backdrop"
          onClick={() => setShowCapabilityNotice(false)}
        >
          <div
            className="audit-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cap-notice-title"
          >
            <div className="audit-modal-header">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#fef3c7] flex items-center justify-center text-[#b45309]">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 id="cap-notice-title" className="audit-modal-title">
                    {t('referralAudit.capabilityNotice.title', 'Referral Audit Capability Notice')}
                  </h3>
                  <p className="audit-modal-subtitle">CareID OpenAPI Contract Specification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCapabilityNotice(false)}
                className="audit-modal-close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="audit-modal-body">
              <p className="text-sm text-[#494552] leading-relaxed">
                The CareID backend OpenAPI specification does not expose a dedicated endpoint for referral audit logs (such as <code>GET /api/v1/referrals/audit</code>).
              </p>
              <div className="bg-[#f8f9fb] border border-[#cbc4d4] rounded-lg p-3 text-xs font-mono space-y-1">
                <div className="text-emerald-700 font-semibold">Verified Endpoints in Contract:</div>
                <div>GET /api/v1/referrals</div>
                <div>GET /api/v1/referrals/{'{'}id{'}'}/history (status transition log)</div>
                <div>GET /api/v1/admin/audit-logs (global system trail)</div>
                <div className="text-amber-700 pt-1 font-semibold">Missing from Contract:</div>
                <div className="line-through text-red-600">GET /api/v1/referrals/audit</div>
              </div>
              <p className="text-xs text-[#7a7583]">
                Audit entries displayed reflect actual lifecycle operations recorded in the application state and transition logs.
              </p>
            </div>

            <div className="audit-modal-footer">
              <button
                type="button"
                onClick={() => setShowCapabilityNotice(false)}
                className="px-4 py-2 bg-[#28006d] text-white rounded-lg text-sm font-semibold hover:bg-[#3b009e]"
              >
                {t('referralAudit.capabilityNotice.dismiss', 'Understood')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReferralAudit;
