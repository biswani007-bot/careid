import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Bell,
  Clock,
  HelpCircle,
  Menu,
  Download,
  AlertTriangle,
  FolderClock,
  Timer,
  SlidersHorizontal,
  MoreVertical,
  UserPlus,
  FileText,
  CheckCircle2,
  X,
  AlertCircle,
  Check,
  RotateCcw,
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import type {
  ReferralItem,
  EscalationFilters,
} from '../../services/referralService';
import {
  useEscalatedReferralsQuery,
  useReferralSlaMetricsQuery,
  useHospitalDelayStatsQuery,
  useSpecialtyDelayStatsQuery,
  useAssignAdminMutation,
  useResolveEscalationMutation,
  exportEscalationsToCSV,
} from '../../services/referralService';
import { useFacilitiesQuery } from '../../services/facilityService';
import { useDoctorsQuery } from '../../services/doctorService';
import './AdminReferralMonitoring.css';

interface AdminReferralMonitoringProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

const PRIORITY_FILTER_OPTIONS = [
  'All',
  'Urgent',
  'High',
  'Routine',
];

export const AdminReferralMonitoring: React.FC<AdminReferralMonitoringProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedAdminFilter, setSelectedAdminFilter] = useState('All');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Modal Dialogs state
  const [assignDialogItem, setAssignDialogItem] = useState<ReferralItem | null>(null);
  const [selectedAdminChoice, setSelectedAdminChoice] = useState('');
  const [notesDialogItem, setNotesDialogItem] = useState<ReferralItem | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [resolveDialogItem, setResolveDialogItem] = useState<ReferralItem | null>(null);
  const [showCapabilityNotice, setShowCapabilityNotice] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const filters: EscalationFilters = useMemo(
    () => ({
      searchQuery: globalSearch,
      hospital: selectedHospital !== 'All' ? selectedHospital : undefined,
      priority: selectedPriority !== 'All' ? selectedPriority : undefined,
      assignedAdmin: selectedAdminFilter !== 'All' ? selectedAdminFilter : undefined,
    }),
    [globalSearch, selectedHospital, selectedPriority, selectedAdminFilter]
  );

  // TanStack Query
  const {
    data: escalationsData,
    isLoading,
    isError,
    refetch,
  } = useEscalatedReferralsQuery(filters);

  const { data: metricsData, isLoading: isLoadingMetrics } = useReferralSlaMetricsQuery();
  const { data: hospitalDelayData } = useHospitalDelayStatsQuery();
  const { data: specialtyDelayData } = useSpecialtyDelayStatsQuery();
  const { data: facilitiesData } = useFacilitiesQuery();
  const { data: doctorsData } = useDoctorsQuery({ limit: 100 });

  const dynamicHospitalOptions = useMemo(() => {
    const names = Array.isArray(facilitiesData)
      ? facilitiesData.map((f) => f.legalName || f.facilityId)
      : [];
    return ['All', ...names];
  }, [facilitiesData]);

  const dynamicAdminOptions = useMemo(() => {
    const docs = Array.isArray(doctorsData?.doctors)
      ? doctorsData.doctors.map((d) => d.name || d.id)
      : [];
    return ['Unassigned', ...Array.from(new Set(docs))];
  }, [doctorsData]);

  // Mutations
  const assignAdminMutation = useAssignAdminMutation();
  const resolveEscalationMutation = useResolveEscalationMutation();

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  const handleExport = () => {
    if (escalationsData && escalationsData.length > 0) {
      exportEscalationsToCSV(escalationsData);
      setToastMessage(t('referralMonitoring.exportSuccess', 'Export report generated successfully.'));
    }
  };

  const handleSaveAssignment = async () => {
    if (!assignDialogItem || !selectedAdminChoice) return;
    try {
      await assignAdminMutation.mutateAsync({
        id: assignDialogItem.id,
        assignedAdmin: selectedAdminChoice,
      });
      setToastMessage(
        t('referralMonitoring.dialogs.assignSuccess', 'Assigned {{admin}} to {{refId}}.', {
          admin: selectedAdminChoice,
          refId: assignDialogItem.referralId,
        })
      );
      setAssignDialogItem(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveEscalation = async () => {
    if (!resolveDialogItem) return;
    try {
      await resolveEscalationMutation.mutateAsync({
        id: resolveDialogItem.id,
        notes: 'SLA Breach resolved and escalated status cleared by administrator.',
      });
      setToastMessage(
        t('referralMonitoring.dialogs.resolveSuccess', 'Escalation for {{refId}} resolved successfully.', {
          refId: resolveDialogItem.referralId,
        })
      );
      setResolveDialogItem(null);
    } catch (err) {
      console.error(err);
    }
  };

  const isFiltered =
    globalSearch.trim() !== '' ||
    selectedHospital !== 'All' ||
    selectedPriority !== 'All' ||
    selectedAdminFilter !== 'All';

  const handleResetFilters = () => {
    setGlobalSearch('');
    setSelectedHospital('All');
    setSelectedPriority('All');
    setSelectedAdminFilter('All');
  };

  return (
    <div className="monitoring-dashboard-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#1e1b4b] text-white px-5 py-3 rounded-xl shadow-2xl border border-indigo-400/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 size={18} className="text-[#10b981]" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Shared CareID Sidebar with Referrals active and single Plus icon */}
      <AdminSidebar
        activeNav="referrals"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
        ctaLabel="+ New Record"
        onCtaClick={() => handleNav('/admin/records/upload')}
      />

      {/* Main Content Area */}
      <div className="monitoring-main-wrapper">
        {/* Stationary Top Global App Bar matching Figma 20:5010 */}
        <header className="monitoring-top-navbar" role="banner">
          <div className="monitoring-top-left">
            <button
              type="button"
              className="monitoring-menu-toggle"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="monitoring-brand-title">
              {t('referralMonitoring.pageTitle', 'Referral Management')}
            </h1>

            {/* Navigation Tabs matching Figma 20:5014 */}
            <nav className="monitoring-nav-tabs hidden sm:flex" aria-label="Referral sections">
              <button
                type="button"
                className="monitoring-nav-tab"
                onClick={() => handleNav('/admin/referrals')}
              >
                {t('referralMonitoring.topTabs.overview', 'Overview')}
              </button>
              <button
                type="button"
                className="monitoring-nav-tab active"
                aria-current="page"
              >
                {t('referralMonitoring.topTabs.escalations', 'Escalations')}
              </button>
              <button
                type="button"
                className="monitoring-nav-tab"
                onClick={() => {
                  const el = document.getElementById('analytics-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {t('referralMonitoring.topTabs.analytics', 'Analytics')}
              </button>
            </nav>
          </div>

          <div className="monitoring-top-actions">
            {/* Global Search Bar */}
            <div className="monitoring-search-box hidden md:block">
              <Search size={16} className="monitoring-search-icon" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder={t('referralMonitoring.searchPlaceholder', 'Search Referrals...')}
                className="monitoring-search-input"
              />
            </div>

            {/* Notification Bell with red indicator dot matching Figma 20:5032 */}
            <button
              type="button"
              className="monitoring-icon-btn"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#ba1a1a] rounded-full ring-2 ring-white" />
            </button>

            {/* Operational History Clock */}
            <button
              type="button"
              className="monitoring-icon-btn secondary"
              aria-label="History"
              title="Referral Audit History"
              onClick={() => handleNav('/admin/referrals/audit')}
            >
              <Clock size={18} />
            </button>

            {/* Help Icon */}
            <button
              type="button"
              className="monitoring-icon-btn secondary"
              aria-label="Help & Documentation"
              onClick={() => setShowCapabilityNotice(true)}
            >
              <HelpCircle size={18} />
            </button>

            {/* Administrator Profile Avatar */}
            <button
              type="button"
              className="monitoring-avatar-btn p-0"
              aria-label="My Profile & Information"
              title="My Profile & Information"
              onClick={() => handleNav('/admin/profile')}
            >
              <AdminProfileAvatar size="full" />
            </button>
          </div>
        </header>

        {/* Scrollable Canvas matching Figma 20:5041 */}
        <main className="monitoring-canvas" role="main">
          <div className="monitoring-canvas-inner">
            {/* Heading Row matching Figma 20:5042 */}
            <div className="monitoring-heading-row">
            <div>
              <h2 className="monitoring-heading-title">
                {t('referralMonitoring.heading', 'Monitoring & Escalation Queue')}
              </h2>
              <p className="monitoring-heading-subtitle">
                {t('referralMonitoring.subtitle', 'Operational view focusing on SLA compliance.')}
              </p>
            </div>

            <button
              type="button"
              onClick={handleExport}
              className="monitoring-export-btn"
              title="Export SLA report as CSV"
            >
              <Download size={15} />
              <span>{t('referralMonitoring.exportReport', 'Export Report')}</span>
            </button>
          </div>

          {/* 3 Operational Metrics Bento Cards matching Figma 20:5052 */}
          <section className="monitoring-metrics-grid" aria-label="SLA Metrics Summary">
            {/* Card 1: Pending Referrals */}
            <div className="monitoring-metric-card standard">
              <div className="monitoring-metric-card-overlay purple" />
              <div className="monitoring-metric-header">
                <p className="monitoring-metric-label">
                  {t('referralMonitoring.metrics.pendingReferrals', 'PENDING REFERRALS')}
                </p>
                <FolderClock size={20} className="text-[#3f1d8b]" />
              </div>
              <div className="monitoring-metric-body">
                <span className="monitoring-metric-val">
                  {isLoadingMetrics ? '...' : (metricsData?.pendingReferrals ?? 0)}
                </span>
                <span className="monitoring-metric-badge green">
                  Live API
                </span>
              </div>
            </div>

            {/* Card 2: Delayed Referrals SLA Breach with Red Alert Overlay */}
            <div className="monitoring-metric-card breached">
              <div className="monitoring-metric-card-overlay" />
              <div className="monitoring-metric-header">
                <p className="monitoring-metric-label red">
                  {t('referralMonitoring.metrics.delayedReferrals', 'DELAYED REFERRALS (SLA BREACH)')}
                </p>
                <AlertTriangle size={20} className="text-[#ba1a1a]" />
              </div>
              <div className="monitoring-metric-body">
                <span className="monitoring-metric-val red">
                  {isLoadingMetrics ? '...' : (metricsData?.delayedReferrals ?? 0)}
                </span>
                <span className="monitoring-metric-badge red">
                  0 breaches
                </span>
              </div>
            </div>

            {/* Card 3: Avg Completion Time */}
            <div className="monitoring-metric-card standard">
              <div className="monitoring-metric-card-overlay teal" />
              <div className="monitoring-metric-header">
                <p className="monitoring-metric-label">
                  {t('referralMonitoring.metrics.avgCompletionTime', 'AVG COMPLETION TIME')}
                </p>
                <Timer size={20} className="text-[#006a60]" />
              </div>
              <div className="monitoring-metric-body">
                <span className="monitoring-metric-val">
                  {isLoadingMetrics
                    ? '...'
                    : metricsData?.avgCompletionTimeDays != null
                    ? metricsData.avgCompletionTimeDays
                    : '—'}
                  <span className="monitoring-metric-unit">
                    {t('referralMonitoring.metrics.days', 'Days')}
                  </span>
                </span>
              </div>
            </div>
          </section>

          {/* Critical Escalations Table Card matching Figma 20:5084 */}
          <section className="monitoring-table-card" aria-label="Critical Escalations Queue">
            {/* Table Header Row with Red Exclamation Pip and Filter Controls */}
            <div className="monitoring-table-header-row">
              <div className="monitoring-table-title-group">
                <div className="monitoring-alert-pip" aria-hidden="true" />
                <h3 className="monitoring-table-title">
                  {t('referralMonitoring.table.title', 'Critical Escalations')}
                </h3>
              </div>

              <div className="monitoring-table-tools" ref={filterMenuRef}>
                {/* Filter Trigger Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                    className={`monitoring-tool-btn ${isFiltered ? 'text-[#28006d] bg-[#edeef0]' : ''}`}
                    title="Filter Escalations"
                    aria-label="Filter Escalations"
                    aria-expanded={isFilterMenuOpen}
                  >
                    <SlidersHorizontal size={17} />
                  </button>

                  {/* Filter Menu Dropdown */}
                  {isFilterMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-[#cbc4d4] rounded-xl shadow-xl z-30 p-3 flex flex-col gap-3">
                      <div>
                        <label className="text-xs font-bold text-[#494552] uppercase tracking-wider block mb-1">
                          {t('referralMonitoring.table.filterPriority', 'Priority')}
                        </label>
                        <select
                          value={selectedPriority}
                          onChange={(e) => setSelectedPriority(e.target.value)}
                          className="w-full text-sm border border-[#cbc4d4] rounded-lg p-2 bg-[#f8f9fb]"
                        >
                          {PRIORITY_FILTER_OPTIONS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#494552] uppercase tracking-wider block mb-1">
                          {t('referralMonitoring.table.filterHospital', 'Hospital')}
                        </label>
                        <select
                          value={selectedHospital}
                          onChange={(e) => setSelectedHospital(e.target.value)}
                          className="w-full text-sm border border-[#cbc4d4] rounded-lg p-2 bg-[#f8f9fb]"
                        >
                          {dynamicHospitalOptions.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      {isFiltered && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="text-xs font-semibold text-[#ba1a1a] flex items-center justify-center gap-1.5 pt-1 hover:underline"
                        >
                          <RotateCcw size={12} />
                          <span>Reset Filters</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* More Options Button */}
                <button
                  type="button"
                  onClick={() => setShowCapabilityNotice(true)}
                  className="monitoring-tool-btn"
                  title="More Options"
                  aria-label="More Options"
                >
                  <MoreVertical size={17} />
                </button>
              </div>
            </div>

            {/* Table Scrollable Wrapper */}
            <div className="monitoring-table-wrapper">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#494552]">
                  <div className="w-8 h-8 border-3 border-[#28006d]/20 border-t-[#28006d] rounded-full animate-spin" />
                  <p className="text-sm font-medium">
                    {t('referralMonitoring.table.loading', 'Loading escalation queue...')}
                  </p>
                </div>
              ) : isError ? (
                <div className="py-16 px-4 flex flex-col items-center justify-center text-center gap-3">
                  <AlertCircle size={36} className="text-[#ba1a1a]" />
                  <h4 className="text-base font-bold text-[#191c1e]">Unable to load escalations</h4>
                  <p className="text-sm text-[#494552]">
                    There was an error communicating with the referral service.
                  </p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-2 px-4 py-2 bg-[#28006d] text-white rounded-lg text-sm font-semibold hover:bg-[#3b009e]"
                  >
                    {t('referralMonitoring.table.retry', 'Retry')}
                  </button>
                </div>
              ) : escalationsData?.length === 0 ? (
                <div className="py-16 px-4 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#f2f4f6] flex items-center justify-center text-[#7a7583]">
                    <CheckCircle2 size={24} className="text-[#006a60]" />
                  </div>
                  <h4 className="text-base font-bold text-[#191c1e]">
                    {t('referralMonitoring.table.emptyTitle', 'No critical escalations found')}
                  </h4>
                  <p className="text-sm text-[#494552] max-w-md">
                    {t(
                      'referralMonitoring.table.emptySubtitle',
                      'All patient referrals are currently within acceptable SLA response windows.'
                    )}
                  </p>
                  {isFiltered && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-2 px-4 py-2 border border-[#cbc4d4] rounded-lg text-sm font-semibold text-[#191c1e] hover:bg-[#f2f4f6]"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                <table className="monitoring-table" aria-label="Critical Escalations">
                  <thead>
                    <tr>
                      <th scope="col" className="monitoring-col-refid">
                        {t('referralMonitoring.table.refId', 'REF ID')}
                      </th>
                      <th scope="col" className="monitoring-col-patient">
                        {t('referralMonitoring.table.patient', 'PATIENT')}
                      </th>
                      <th scope="col" className="monitoring-col-hospital">
                        {t('referralMonitoring.table.currentHospital', 'CURRENT HOSPITAL')}
                      </th>
                      <th scope="col" className="monitoring-col-delay">
                        {t('referralMonitoring.table.delayDuration', 'DELAY DURATION')}
                      </th>
                      <th scope="col" className="monitoring-col-priority">
                        {t('referralMonitoring.table.priority', 'PRIORITY')}
                      </th>
                      <th scope="col" className="monitoring-col-admin">
                        {t('referralMonitoring.table.assignedAdmin', 'ASSIGNED ADMIN')}
                      </th>
                      <th scope="col" className="monitoring-col-actions">
                        {t('referralMonitoring.table.actions', 'ACTIONS')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {escalationsData?.map((item) => {
                      const isCriticalDelay =
                        (item.delayHours && item.delayHours >= 48) ||
                        item.delayDuration?.includes('48') ||
                        item.priority.toLowerCase() === 'urgent';
                      return (
                        <tr key={item.id} className="monitoring-row">
                          {/* REF ID matching Figma 20:5115 */}
                          <td className="monitoring-ref-id">
                            <span>{item.referralId}</span>
                          </td>

                          {/* Patient with Initials Avatar matching Figma 20:5117 */}
                          <td>
                            <div className="monitoring-patient-cell">
                              <div className="monitoring-patient-avatar">
                                {item.patientInitials ||
                                  item.patientName
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .substring(0, 2)
                                    .toUpperCase()}
                              </div>
                              <span className="monitoring-patient-name">{item.patientName}</span>
                            </div>
                          </td>

                          {/* Current Hospital matching Figma 20:5122 */}
                          <td>
                            <span className="text-[#494552]">{item.hospitalName}</span>
                          </td>

                          {/* Delay Duration with Clock icon matching Figma 20:5124 */}
                          <td>
                            <div
                              className={`monitoring-delay-cell ${
                                isCriticalDelay ? 'red' : 'amber'
                              }`}
                            >
                              <Clock size={14} />
                              <span>{item.delayDuration || '+24 Hours'}</span>
                            </div>
                          </td>

                          {/* Priority Badge matching Figma 20:5128 */}
                          <td>
                            <span
                              className={`monitoring-badge ${
                                item.priority.toLowerCase() === 'urgent' ? 'critical' : 'high'
                              }`}
                            >
                              {item.priority.toLowerCase() === 'urgent' ? 'CRITICAL' : item.priority.toUpperCase()}
                            </span>
                          </td>

                          {/* Assigned Admin matching Figma 20:5131 */}
                          <td>
                            <span
                              className={`monitoring-admin-cell ${
                                !item.assignedAdmin || item.assignedAdmin === 'Unassigned'
                                  ? 'unassigned'
                                  : ''
                              }`}
                            >
                              {item.assignedAdmin || t('referralMonitoring.table.unassigned', 'Unassigned')}
                            </span>
                          </td>

                          {/* Actions matching Figma 20:5133 icons */}
                          <td>
                            <div className="monitoring-action-group">
                              {/* Assign Admin (UserPlus icon) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAdminChoice(item.assignedAdmin || dynamicAdminOptions[1] || 'Unassigned');
                                  setAssignDialogItem(item);
                                }}
                                className="monitoring-action-btn"
                                title={t(
                                  'referralMonitoring.table.assignAdminTooltip',
                                  'Assign Administrator'
                                )}
                                aria-label={`Assign admin for ${item.referralId}`}
                              >
                                <UserPlus size={16} />
                              </button>

                              {/* Clinical Notes & Attachments (FileText icon) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setNewNoteText('');
                                  setNotesDialogItem(item);
                                }}
                                className="monitoring-action-btn"
                                title={t(
                                  'referralMonitoring.table.notesTooltip',
                                  'Clinical Notes & Attachments'
                                )}
                                aria-label={`View notes for ${item.referralId}`}
                              >
                                <FileText size={16} />
                              </button>

                              {/* Resolve SLA Breach (CheckCircle2 icon) */}
                              <button
                                type="button"
                                onClick={() => setResolveDialogItem(item)}
                                className="monitoring-action-btn resolve"
                                title={t(
                                  'referralMonitoring.table.resolveTooltip',
                                  'Resolve SLA Breach'
                                )}
                                aria-label={`Resolve escalation for ${item.referralId}`}
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Table Footer matching Figma 20:5172 */}
            <div className="monitoring-table-footer">
              <button
                type="button"
                onClick={() => handleNav('/admin/referrals')}
                className="monitoring-view-all-btn"
              >
                {t('referralMonitoring.table.viewAll', 'View All Escalations ({{count}})', {
                  count: escalationsData?.length ?? 42,
                })}
              </button>
            </div>
          </section>

          {/* Charts 2-Column Section matching Figma 20:5175 */}
          <section
            id="analytics-section"
            className="monitoring-charts-section"
            aria-label="SLA Analytics Visualizations"
          >
            {/* Card 1: Delay Volume by Hospital Bar Chart matching Figma 20:5176 */}
            <div className="monitoring-chart-card">
              <h4 className="monitoring-chart-title">
                {t('referralMonitoring.charts.hospitalTitle', 'Delay Volume by Hospital')}
              </h4>

              <div className="monitoring-bar-chart-container" role="img" aria-label="Hospital Delay Volume Bar Chart">
                {hospitalDelayData?.map((item) => (
                  <div key={item.id} className="monitoring-bar-col">
                    <div
                      className="monitoring-bar-pill"
                      style={{
                        height: `${item.heightPercent}%`,
                        backgroundColor: item.color,
                      }}
                      title={`${item.name}: ${item.count} delayed referrals`}
                    />
                  </div>
                ))}
              </div>

              <div className="monitoring-bar-labels">
                {hospitalDelayData?.map((item) => (
                  <span key={item.id} className="monitoring-bar-label">
                    {item.shortName}
                  </span>
                ))}
              </div>
            </div>

            {/* Card 2: Delays by Specialty Donut Chart matching Figma 20:5193 */}
            <div className="monitoring-chart-card">
              <h4 className="monitoring-chart-title">
                {t('referralMonitoring.charts.specialtyTitle', 'Delays by Specialty')}
              </h4>

              <div className="monitoring-donut-container">
                {/* SVG Donut with exact Figma reference angle arcs */}
                <div className="monitoring-donut-wrapper">
                  <svg viewBox="0 0 140 140" className="monitoring-donut-svg transform -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx="70"
                      cy="70"
                      r="50"
                      fill="transparent"
                      stroke="#f2f4f6"
                      strokeWidth="20"
                    />
                    {/* Cardiology 45% (dasharray ~141.3 of 314.16 circumference) */}
                    <circle
                      cx="70"
                      cy="70"
                      r="50"
                      fill="transparent"
                      stroke="#28006d"
                      strokeWidth="20"
                      strokeDasharray="141.37 314.16"
                      strokeDashoffset="0"
                    />
                    {/* Neurology 25% (dasharray ~78.54) */}
                    <circle
                      cx="70"
                      cy="70"
                      r="50"
                      fill="transparent"
                      stroke="#006a60"
                      strokeWidth="20"
                      strokeDasharray="78.54 314.16"
                      strokeDashoffset="-141.37"
                    />
                    {/* Oncology 20% (dasharray ~62.83) */}
                    <circle
                      cx="70"
                      cy="70"
                      r="50"
                      fill="transparent"
                      stroke="#fabd00"
                      strokeWidth="20"
                      strokeDasharray="62.83 314.16"
                      strokeDashoffset="-219.91"
                    />
                    {/* Other 10% (dasharray ~31.42) */}
                    <circle
                      cx="70"
                      cy="70"
                      r="50"
                      fill="transparent"
                      stroke="#e1e2e4"
                      strokeWidth="20"
                      strokeDasharray="31.42 314.16"
                      strokeDashoffset="-282.74"
                    />
                  </svg>
                  {/* Center Hub with 'SLA' Text matching Figma 20:5201 */}
                  <div className="monitoring-donut-center">
                    <span>{t('referralMonitoring.charts.sla', 'SLA')}</span>
                  </div>
                </div>

                {/* Donut Legend matching Figma 20:5202 */}
                <div className="monitoring-donut-legend">
                  {specialtyDelayData?.map((item) => (
                    <div key={item.specialty} className="monitoring-legend-item">
                      <div
                        className="monitoring-legend-dot"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>
                        {item.specialty} ({item.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>

      {/* =========================================================================
          MODALS & DIALOGS
         ========================================================================= */}

      {/* 1. Assign Administrator Modal */}
      {assignDialogItem && (
        <div className="monitoring-modal-backdrop" onClick={() => setAssignDialogItem(null)}>
          <div
            className="monitoring-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-modal-title"
          >
            <div className="monitoring-modal-header">
              <div>
                <h3 id="assign-modal-title" className="monitoring-modal-title">
                  {t('referralMonitoring.dialogs.assignTitle', 'Assign Administrator')}
                </h3>
                <p className="monitoring-modal-subtitle">
                  {t(
                    'referralMonitoring.dialogs.assignSubtitle',
                    'Designate a triage case manager for referral {{refId}}.',
                    { refId: assignDialogItem.referralId }
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignDialogItem(null)}
                className="monitoring-modal-close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="monitoring-modal-body">
              <div className="monitoring-info-box">
                <div className="monitoring-info-row">
                  <span className="monitoring-info-label">Patient:</span>
                  <span className="monitoring-info-value">{assignDialogItem.patientName}</span>
                </div>
                <div className="monitoring-info-row">
                  <span className="monitoring-info-label">Hospital:</span>
                  <span className="monitoring-info-value">{assignDialogItem.hospitalName}</span>
                </div>
                <div className="monitoring-info-row">
                  <span className="monitoring-info-label">Current Delay:</span>
                  <span className="monitoring-info-value danger">{assignDialogItem.delayDuration || '+24 Hours'}</span>
                </div>
              </div>

              <div className="monitoring-form-group">
                <label className="monitoring-form-label">
                  {t('referralMonitoring.dialogs.adminLabel', 'Assigned Administrator')}
                </label>
                <select
                  value={selectedAdminChoice}
                  onChange={(e) => setSelectedAdminChoice(e.target.value)}
                  className="monitoring-form-select"
                >
                  {dynamicAdminOptions.map((admin) => (
                    <option key={admin} value={admin}>
                      {admin}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="monitoring-modal-footer">
              <button
                type="button"
                onClick={() => setAssignDialogItem(null)}
                className="monitoring-btn monitoring-btn-secondary"
              >
                {t('referralMonitoring.dialogs.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveAssignment}
                disabled={assignAdminMutation.isPending}
                className="monitoring-btn monitoring-btn-primary"
              >
                {assignAdminMutation.isPending ? 'Saving...' : t('referralMonitoring.dialogs.assignBtn', 'Save Assignment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Clinical Notes & SLA Documentation Modal */}
      {notesDialogItem && (
        <div className="monitoring-modal-backdrop" onClick={() => setNotesDialogItem(null)}>
          <div
            className="monitoring-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notes-modal-title"
          >
            <div className="monitoring-modal-header">
              <div>
                <h3 id="notes-modal-title" className="monitoring-modal-title">
                  {t('referralMonitoring.dialogs.notesTitle', 'Clinical Notes & SLA Documentation')}
                </h3>
                <p className="monitoring-modal-subtitle">
                  {notesDialogItem.referralId} — {notesDialogItem.patientName} ({notesDialogItem.hospitalName})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotesDialogItem(null)}
                className="monitoring-modal-close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="monitoring-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div>
                <div className="monitoring-form-label" style={{ marginBottom: '6px' }}>
                  {t('referralMonitoring.dialogs.clinicalReason', 'Clinical Reason')}
                </div>
                <div className="monitoring-info-box" style={{ padding: '10px 14px', color: '#191c1e' }}>
                  {notesDialogItem.clinicalReason || 'No clinical reason specified.'}
                </div>
              </div>

              <div>
                <div className="monitoring-form-label" style={{ marginBottom: '6px' }}>
                  {t('referralMonitoring.dialogs.existingNotes', 'Clinical Notes')}
                </div>
                <div className="monitoring-info-box" style={{ padding: '10px 14px', color: '#494552', whiteSpace: 'pre-line' }}>
                  {notesDialogItem.notes || t('referralMonitoring.dialogs.noNotes', 'No notes recorded yet.')}
                </div>
              </div>

              <div className="monitoring-form-group">
                <label className="monitoring-form-label">
                  {t('referralMonitoring.dialogs.addNoteLabel', 'Add Operational Note')}
                </label>
                <textarea
                  rows={3}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder={t(
                    'referralMonitoring.dialogs.addNotePlaceholder',
                    'Enter case notes or SLA escalation notes...'
                  )}
                  className="monitoring-form-textarea"
                />
              </div>
            </div>

            <div className="monitoring-modal-footer">
              <button
                type="button"
                onClick={() => setNotesDialogItem(null)}
                className="monitoring-btn monitoring-btn-secondary"
              >
                {t('referralMonitoring.dialogs.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newNoteText.trim()) {
                    setToastMessage(
                      t('referralMonitoring.dialogs.noteAddedSuccess', 'Note appended to {{refId}}.', {
                        refId: notesDialogItem.referralId,
                      })
                    );
                    setNotesDialogItem(null);
                  }
                }}
                disabled={!newNoteText.trim()}
                className="monitoring-btn monitoring-btn-primary"
                style={{ opacity: !newNoteText.trim() ? 0.5 : 1 }}
              >
                {t('referralMonitoring.dialogs.addNoteBtn', 'Append Note')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Resolve Escalation Confirmation Dialog */}
      {resolveDialogItem && (
        <div className="monitoring-modal-backdrop" onClick={() => setResolveDialogItem(null)}>
          <div
            className="monitoring-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="resolve-modal-title"
          >
            <div className="monitoring-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9999px', backgroundColor: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#006a60' }}>
                  <Check size={18} />
                </div>
                <div>
                  <h3 id="resolve-modal-title" className="monitoring-modal-title">
                    {t('referralMonitoring.dialogs.resolveTitle', 'Resolve SLA Escalation')}
                  </h3>
                  <p className="monitoring-modal-subtitle">
                    {resolveDialogItem.referralId} — {resolveDialogItem.patientName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResolveDialogItem(null)}
                className="monitoring-modal-close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="monitoring-modal-body">
              <p style={{ color: '#494552', lineHeight: '1.6', margin: 0 }}>
                {t(
                  'referralMonitoring.dialogs.resolveMessage',
                  'Are you sure you want to resolve the escalation for referral {{refId}}? The record status will be updated to Accepted and the SLA breach flag will be cleared.',
                  { refId: resolveDialogItem.referralId }
                )}
              </p>
            </div>

            <div className="monitoring-modal-footer">
              <button
                type="button"
                onClick={() => setResolveDialogItem(null)}
                className="monitoring-btn monitoring-btn-secondary"
              >
                {t('referralMonitoring.dialogs.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleResolveEscalation}
                disabled={resolveEscalationMutation.isPending}
                className="monitoring-btn monitoring-btn-teal"
              >
                {resolveEscalationMutation.isPending
                  ? 'Resolving...'
                  : t('referralMonitoring.dialogs.resolveBtn', 'Resolve Escalation')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Honest Capability Notice Modal */}
      {showCapabilityNotice && (
        <div className="monitoring-modal-backdrop" onClick={() => setShowCapabilityNotice(false)}>
          <div
            className="monitoring-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cap-modal-title"
          >
            <div className="monitoring-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9999px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 id="cap-modal-title" className="monitoring-modal-title">
                    {t('referralMonitoring.dialogs.capabilityNoticeTitle', 'Backend API Capability Notice')}
                  </h3>
                  <p className="monitoring-modal-subtitle">CareID Referral Contract Specification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCapabilityNotice(false)}
                className="monitoring-modal-close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="monitoring-modal-body">
              <p style={{ color: '#494552', lineHeight: '1.6', margin: 0 }}>
                {t(
                  'referralMonitoring.dialogs.capabilityNoticeMessage',
                  'The CareID backend OpenAPI specification does not expose a dedicated PATCH /api/v1/admin/referrals/:id/escalate endpoint. Escalation resolution uses PUT /api/v1/referrals/:id/status and triage endpoints.'
                )}
              </p>
              <div className="monitoring-info-box" style={{ fontFamily: 'monospace', fontSize: '12px', color: '#191c1e' }}>
                <div>✓ GET /api/v1/referrals</div>
                <div>✓ GET /api/v1/referrals/dashboard/stats</div>
                <div>✓ GET /api/v1/referrals/{`{id}`}</div>
                <div>✓ PUT /api/v1/referrals/{`{id}`}/status</div>
                <div>✓ PUT /api/v1/referrals/{`{id}`}/triage</div>
                <div>✓ POST /api/v1/referrals/{`{id}`}/notes</div>
              </div>
            </div>

            <div className="monitoring-modal-footer">
              <button
                type="button"
                onClick={() => setShowCapabilityNotice(false)}
                className="monitoring-btn monitoring-btn-primary"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReferralMonitoring;
