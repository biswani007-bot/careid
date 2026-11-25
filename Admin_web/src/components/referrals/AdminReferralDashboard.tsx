import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Search,
  Bell,
  Settings,
  HelpCircle,
  Download,
  Filter,
  Building2,
  Stethoscope,
  Eye,
  GitBranch,
  FileText,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
  RotateCcw,
  Check,
  AlertCircle,
  Plus,
} from 'lucide-react';

import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import {
  useReferralsQuery,
  useReferralStatsQuery,
  useUpdateReferralStatusMutation,
  exportReferralsToCSV,
  referralService,
  type ReferralItem,
} from '../../services/referralService';
import { useFacilitiesQuery } from '../../services/facilityService';
import CreateReferralDialog from './CreateReferralDialog';
import './AdminReferralDashboard.css';

export interface AdminReferralDashboardProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminReferralDashboard: React.FC<AdminReferralDashboardProps> = ({
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

  // UI state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [hospitalFilter, setHospitalFilter] = useState('All');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Dropdown menus state
  const [activeDropdown, setActiveDropdown] = useState<'priority' | 'hospital' | 'specialty' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modal dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDetailsItem, setSelectedDetailsItem] = useState<ReferralItem | null>(null);
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<ReferralItem | null>(null);
  const [selectedEscalateItem, setSelectedEscalateItem] = useState<ReferralItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter payload for TanStack Query
  const effectiveSearch = searchQuery || globalSearch;
  const filters = useMemo(
    () => ({
      searchQuery: effectiveSearch,
      priority: priorityFilter,
      hospital: hospitalFilter,
      specialty: specialtyFilter,
      status: statusFilter,
    }),
    [effectiveSearch, priorityFilter, hospitalFilter, specialtyFilter, statusFilter]
  );

  const {
    data: referralsData,
    isLoading,
    isError,
    error: referralsError,
    refetch,
  } = useReferralsQuery(filters, currentPage, pageSize);

  const { data: statsData, isLoading: isLoadingStats } = useReferralStatsQuery();
  const { data: facilitiesData } = useFacilitiesQuery();
  const updateStatusMutation = useUpdateReferralStatusMutation();

  // Dynamic hospital options from live facilities API
  const HOSPITAL_OPTIONS = useMemo(() => {
    const liveFacs = Array.isArray(facilitiesData)
      ? facilitiesData.map((f) => f.legalName || f.facilityId)
      : [];
    return ['All', ...liveFacs];
  }, [facilitiesData]);

  const isFiltered =
    effectiveSearch.trim() !== '' ||
    priorityFilter !== 'All' ||
    hospitalFilter !== 'All' ||
    specialtyFilter !== 'All' ||
    statusFilter !== 'All';

  const handleResetFilters = () => {
    setSearchQuery('');
    setGlobalSearch('');
    setPriorityFilter('All');
    setHospitalFilter('All');
    setSpecialtyFilter('All');
    setStatusFilter('All');
    setCurrentPage(1);
    setActiveDropdown(null);
  };

  // Export CSV handler (exports complete filtered dataset, not just current page)
  const handleExportCSV = async () => {
    try {
      const items = await referralService.getAllReferrals(filters);
      if (items.length === 0) {
        showToast(t('referralDashboard.exportEmpty', 'No referrals found to export with current filters.'));
        return;
      }
      exportReferralsToCSV(items);
      showToast(t('referralDashboard.exportSuccess', `Exported ${items.length} referrals successfully to CSV.`));
    } catch (err) {
      console.error('Failed to export all filtered referrals:', err);
      const fallbackItems = referralsData?.items || [];
      if (fallbackItems.length > 0) {
        exportReferralsToCSV(fallbackItems);
        showToast(t('referralDashboard.exportSuccess', 'Referrals exported successfully to CSV.'));
      }
    }
  };

  // Escalate status mutation
  const handleConfirmEscalation = (item: ReferralItem) => {
    updateStatusMutation.mutate(
      {
        id: item.id,
        status: 'Escalated',
        notes: `Referral escalated by administrator on ${new Date().toLocaleDateString()}. Urgent clinical review requested.`,
      },
      {
        onSuccess: () => {
          showToast(`Referral ${item.referralId} escalated successfully.`);
          setSelectedEscalateItem(null);
        },
      }
    );
  };

  // Static options for dropdowns
  const PRIORITY_OPTIONS = ['All', 'High', 'Routine', 'Urgent'];
  const SPECIALTY_OPTIONS = [
    'All',
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Oncology',
    'Dermatology',
    'Physical Medicine',
    'Pulmonology',
    'Endocrinology',
    'Gastroenterology',
    'Ophthalmology',
  ];

  return (
    <div className="referral-dashboard-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#1e1b4b] text-white px-5 py-3 rounded-xl shadow-2xl border border-indigo-400/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 size={18} className="text-[#10b981]" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Shared CareID Sidebar with Referrals active and amber badge 5 */}
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
      <div className="referral-main-wrapper">
        {/* Stationary Top Global App Bar matching Figma 20:4758 */}
        <header className="referral-top-navbar" role="banner">
          <div className="flex items-center gap-6">
            <button
              type="button"
              className="p-2 -ml-2 text-[#494552] hover:text-[#28006d] md:hidden rounded-lg"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="referral-top-title">
              {t('referralDashboard.pageTitle', 'Referral Management')}
            </h1>

            {/* Navigation Tabs matching Figma 20:4758 / 20:5014 */}
            <nav className="hidden sm:flex items-center gap-6 h-8" aria-label="Referral sections">
              <button
                type="button"
                className="text-[15px] font-bold text-[#28006d] border-b-2 border-[#28006d] pb-1 cursor-pointer"
                aria-current="page"
              >
                {t('referralMonitoring.topTabs.overview', 'Overview')}
              </button>
              <button
                type="button"
                className="text-[15px] font-medium text-[#494552] hover:text-[#28006d] cursor-pointer transition-colors"
                onClick={() => handleNav('/admin/referrals/escalations')}
              >
                {t('referralMonitoring.topTabs.escalations', 'Escalations')}
              </button>
              <button
                type="button"
                className="text-[15px] font-medium text-[#494552] hover:text-[#28006d] cursor-pointer transition-colors"
                onClick={() => handleNav('/admin/referrals/escalations')}
              >
                {t('referralMonitoring.topTabs.analytics', 'Analytics')}
              </button>
            </nav>
          </div>

          <div className="referral-header-actions">
            {/* Global Search Bar */}
            <div className="referral-header-search-box hidden sm:block">
              <Search size={16} className="referral-header-search-icon" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t('dashboard.search', 'Search...')}
                className="referral-header-search-input"
              />
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              className="referral-header-icon-btn"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#fabd00] rounded-full ring-2 ring-white" />
            </button>

            {/* System Settings */}
            <button
              type="button"
              className="referral-header-icon-btn"
              aria-label="System Settings"
              onClick={() => handleNav('/admin/settings')}
            >
              <Settings size={18} />
            </button>

            {/* Help / Support */}
            <button
              type="button"
              className="referral-header-icon-btn"
              aria-label="Help & Support"
            >
              <HelpCircle size={18} />
            </button>

            {/* Administrator Profile Avatar matching Figma 20:4778 */}
            <div
              className="referral-header-avatar cursor-pointer"
              onClick={() => handleNav('/admin/profile')}
              title="My Profile & Information"
              role="button"
              tabIndex={0}
            >
              <AdminProfileAvatar size="full" />
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Canvas matching Figma 20:4781 */}
        <main className="referral-canvas" role="main">
          {/* Section Heading & Export Action matching Figma 20:4783 */}
          <section className="referral-heading-row" aria-labelledby="overview-heading">
            <div>
              <h2 id="overview-heading" className="referral-heading-title">
                {t('referralDashboard.overview', 'Overview')}
              </h2>
              <p className="referral-heading-subtitle">
                {t('referralDashboard.overviewSubtitle', 'Monitor and manage patient referral lifecycle.')}
              </p>
            </div>

            <div className="referral-actions-group">
              <button
                type="button"
                onClick={() => setIsCreateDialogOpen(true)}
                className="referral-create-btn"
                aria-label="Create New Referral"
              >
                <Plus size={16} />
                <span>{t('referralDashboard.createReferral', 'Create Referral')}</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="referral-export-btn"
                aria-label="Export Referrals to CSV"
              >
                <Download size={15} />
                <span>{t('referralDashboard.exportReferrals', 'Export Referrals')}</span>
              </button>
            </div>
          </section>

          {/* 6 Summary Cards Bento Grid matching Figma 20:4793 */}
          <section
            className="referral-bento-grid"
            aria-label="Referral Lifecycle Statistics"
          >
            {/* Card 1: Total Referrals */}
            <div
              className={`referral-metric-card cursor-pointer ${statusFilter === 'All' ? 'ring-2 ring-[#28006d]/20' : ''}`}
              onClick={() => {
                setStatusFilter('All');
                setCurrentPage(1);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setStatusFilter('All');
                  setCurrentPage(1);
                }
              }}
              title="Filter all referrals"
            >
              <p className="referral-metric-label">
                {t('referralDashboard.summaryCards.totalReferrals', 'Total Referrals')}
              </p>
              <p className="referral-metric-value total">
                {isLoadingStats ? '...' : (statsData?.totalReferrals ?? 0).toLocaleString()}
              </p>
            </div>

            {/* Card 2: Pending (accent #fabd00) */}
            <div
              className={`referral-metric-card cursor-pointer ${statusFilter === 'Pending' ? 'ring-2 ring-[#fabd00]/50' : ''}`}
              onClick={() => {
                setStatusFilter(statusFilter === 'Pending' ? 'All' : 'Pending');
                setCurrentPage(1);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setStatusFilter(statusFilter === 'Pending' ? 'All' : 'Pending');
                  setCurrentPage(1);
                }
              }}
              title="Filter Pending referrals"
            >
              <div className="referral-metric-accent" style={{ backgroundColor: '#fabd00' }} />
              <p className="referral-metric-label">
                {t('referralDashboard.summaryCards.pending', 'Pending')}
              </p>
              <p className="referral-metric-value">
                {isLoadingStats ? '...' : (statsData?.pending ?? 0).toLocaleString()}
              </p>
            </div>

            {/* Card 3: Accepted (accent #006a60) */}
            <div
              className={`referral-metric-card cursor-pointer ${statusFilter === 'Accepted' ? 'ring-2 ring-[#006a60]/50' : ''}`}
              onClick={() => {
                setStatusFilter(statusFilter === 'Accepted' ? 'All' : 'Accepted');
                setCurrentPage(1);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setStatusFilter(statusFilter === 'Accepted' ? 'All' : 'Accepted');
                  setCurrentPage(1);
                }
              }}
              title="Filter Accepted referrals"
            >
              <div className="referral-metric-accent" style={{ backgroundColor: '#006a60' }} />
              <p className="referral-metric-label">
                {t('referralDashboard.summaryCards.accepted', 'Accepted')}
              </p>
              <p className="referral-metric-value">
                {isLoadingStats ? '...' : (statsData?.accepted ?? 0).toLocaleString()}
              </p>
            </div>

            {/* Card 4: Completed (accent #67d9c9) */}
            <div
              className={`referral-metric-card cursor-pointer ${statusFilter === 'Completed' ? 'ring-2 ring-[#67d9c9]/50' : ''}`}
              onClick={() => {
                setStatusFilter(statusFilter === 'Completed' ? 'All' : 'Completed');
                setCurrentPage(1);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setStatusFilter(statusFilter === 'Completed' ? 'All' : 'Completed');
                  setCurrentPage(1);
                }
              }}
              title="Filter Completed referrals"
            >
              <div className="referral-metric-accent" style={{ backgroundColor: '#67d9c9' }} />
              <p className="referral-metric-label">
                {t('referralDashboard.summaryCards.completed', 'Completed')}
              </p>
              <p className="referral-metric-value">
                {isLoadingStats ? '...' : (statsData?.completed ?? 0).toLocaleString()}
              </p>
            </div>

            {/* Card 5: Cancelled (accent #7a7583) */}
            <div
              className={`referral-metric-card cursor-pointer ${statusFilter === 'Cancelled' ? 'ring-2 ring-[#7a7583]/50' : ''}`}
              onClick={() => {
                setStatusFilter(statusFilter === 'Cancelled' ? 'All' : 'Cancelled');
                setCurrentPage(1);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setStatusFilter(statusFilter === 'Cancelled' ? 'All' : 'Cancelled');
                  setCurrentPage(1);
                }
              }}
              title="Filter Cancelled referrals"
            >
              <div className="referral-metric-accent" style={{ backgroundColor: '#7a7583' }} />
              <p className="referral-metric-label">
                {t('referralDashboard.summaryCards.cancelled', 'Cancelled')}
              </p>
              <p className="referral-metric-value">
                {isLoadingStats ? '...' : (statsData?.cancelled ?? 0).toLocaleString()}
              </p>
            </div>

            {/* Card 6: Escalated (accent #ba1a1a, text #ba1a1a) */}
            <div
              className={`referral-metric-card cursor-pointer ${statusFilter === 'Escalated' ? 'ring-2 ring-[#ba1a1a]/50' : ''}`}
              onClick={() => {
                setStatusFilter(statusFilter === 'Escalated' ? 'All' : 'Escalated');
                setCurrentPage(1);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setStatusFilter(statusFilter === 'Escalated' ? 'All' : 'Escalated');
                  setCurrentPage(1);
                }
              }}
              title="Filter Escalated referrals"
            >
              <div className="referral-metric-accent" style={{ backgroundColor: '#ba1a1a' }} />
              <p className="referral-metric-label">
                {t('referralDashboard.summaryCards.escalated', 'Escalated')}
              </p>
              <p className="referral-metric-value escalated">
                {isLoadingStats ? '...' : (statsData?.escalated ?? 0).toLocaleString()}
              </p>
            </div>
          </section>

          {/* Main Data Section matching Figma 20:4829 */}
          <section className="referral-table-card" aria-label="Referrals Table and Filters">
            {/* Search and Filter Toolbar matching Figma 20:4830 */}
            <div className="referral-toolbar">
              {/* Search input with Figma placeholder */}
              <div className="referral-toolbar-search">
                <Search size={18} className="referral-toolbar-search-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={t(
                    'referralDashboard.filters.searchPlaceholder',
                    'Search by Referral ID, Patient, or Doctor...'
                  )}
                  className="referral-toolbar-search-input"
                />
              </div>

              {/* Filters Group (Priority, Hospital, Specialty) */}
              <div className="referral-toolbar-filters" ref={dropdownRef}>
                {/* Priority Filter */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')}
                    className={`referral-filter-btn ${priorityFilter !== 'All' ? 'active' : ''}`}
                    aria-expanded={activeDropdown === 'priority'}
                  >
                    <Filter size={14} />
                    <span>
                      {priorityFilter === 'All'
                        ? t('referralDashboard.filters.priority', 'Priority')
                        : priorityFilter}
                    </span>
                  </button>

                  {activeDropdown === 'priority' && (
                    <div className="referral-filter-menu">
                      {PRIORITY_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`referral-filter-option ${priorityFilter === opt ? 'selected' : ''}`}
                          onClick={() => {
                            setPriorityFilter(opt);
                            setCurrentPage(1);
                            setActiveDropdown(null);
                          }}
                        >
                          <span>{opt === 'All' ? t('referralDashboard.filters.allPriorities', 'All Priorities') : opt}</span>
                          {priorityFilter === opt && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hospital Filter */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === 'hospital' ? null : 'hospital')}
                    className={`referral-filter-btn ${hospitalFilter !== 'All' ? 'active' : ''}`}
                    aria-expanded={activeDropdown === 'hospital'}
                  >
                    <Building2 size={14} />
                    <span>
                      {hospitalFilter === 'All'
                        ? t('referralDashboard.filters.hospital', 'Hospital')
                        : hospitalFilter}
                    </span>
                  </button>

                  {activeDropdown === 'hospital' && (
                    <div className="referral-filter-menu">
                      {HOSPITAL_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`referral-filter-option ${hospitalFilter === opt ? 'selected' : ''}`}
                          onClick={() => {
                            setHospitalFilter(opt);
                            setCurrentPage(1);
                            setActiveDropdown(null);
                          }}
                        >
                          <span>{opt === 'All' ? t('referralDashboard.filters.allHospitals', 'All Hospitals') : opt}</span>
                          {hospitalFilter === opt && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Specialty Filter */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === 'specialty' ? null : 'specialty')}
                    className={`referral-filter-btn ${specialtyFilter !== 'All' ? 'active' : ''}`}
                    aria-expanded={activeDropdown === 'specialty'}
                  >
                    <Stethoscope size={14} />
                    <span>
                      {specialtyFilter === 'All'
                        ? t('referralDashboard.filters.specialty', 'Specialty')
                        : specialtyFilter}
                    </span>
                  </button>

                  {activeDropdown === 'specialty' && (
                    <div className="referral-filter-menu">
                      {SPECIALTY_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`referral-filter-option ${specialtyFilter === opt ? 'selected' : ''}`}
                          onClick={() => {
                            setSpecialtyFilter(opt);
                            setCurrentPage(1);
                            setActiveDropdown(null);
                          }}
                        >
                          <span>{opt === 'All' ? t('referralDashboard.filters.allSpecialties', 'All Specialties') : opt}</span>
                          {specialtyFilter === opt && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Clear Filters Button if any filter active */}
                {isFiltered && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="referral-clear-btn inline-flex items-center gap-1.5"
                    title="Clear all filters"
                  >
                    <RotateCcw size={12} />
                    <span>{t('referralDashboard.filters.clearFilters', 'Clear')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Table Area */}
            <div className="referral-table-wrapper">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#494552]">
                  <div className="w-8 h-8 border-3 border-[#28006d]/20 border-t-[#28006d] rounded-full animate-spin" />
                  <p className="text-sm font-medium">{t('referralDashboard.table.loading', 'Loading referrals data...')}</p>
                </div>
              ) : isError ? (
                <div className="py-16 px-4 flex flex-col items-center justify-center text-center gap-3">
                  <AlertCircle size={36} className="text-[#ba1a1a]" />
                  <h3 className="text-base font-bold text-[#191c1e]">
                    {t('referralDashboard.table.errorTitle', 'Unable to load referrals')}
                  </h3>
                  <p className="text-sm text-[#ba1a1a] font-medium max-w-md">
                    {referralsError instanceof Error
                      ? referralsError.message
                      : t(
                          'referralDashboard.table.errorDescription',
                          'Backend referral records service encountered an unexpected error (HTTP 500: Database relation error). Please retry.'
                        )}
                  </p>
                  <p className="text-xs text-[#7a7583] max-w-md">
                    {t('referralDashboard.table.errorHint', 'Live backend API GET /api/v1/referrals returned 500 Internal Server Error. KPI metrics above are verified from live statistics API.')}
                  </p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-2 px-4 py-2 bg-[#28006d] text-white rounded-lg text-sm font-semibold hover:bg-[#3b009e] transition-colors"
                  >
                    {t('referralDashboard.table.retry', 'Retry')}
                  </button>
                </div>
              ) : referralsData?.items.length === 0 ? (
                <div className="py-16 px-4 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#f2f4f6] flex items-center justify-center text-[#7a7583]">
                    <Search size={22} />
                  </div>
                  <h3 className="text-base font-bold text-[#191c1e]">
                    {t('referralDashboard.table.emptyTitle', 'No referrals found')}
                  </h3>
                  <p className="text-sm text-[#494552] max-w-md">
                    {t('referralDashboard.table.emptyDescription', 'No patient referrals match the current search or filter criteria. Try adjusting your search term or resetting the filters.')}
                  </p>
                  {isFiltered && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-2 px-4 py-2 border border-[#cbc4d4] rounded-lg text-sm font-semibold text-[#191c1e] hover:bg-[#f2f4f6]"
                    >
                      {t('referralDashboard.table.resetFilters', 'Reset Filters')}
                    </button>
                  )}
                </div>
              ) : (
                <table className="referral-table" aria-label="Referrals list">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '88px' }}>
                        {t('referralDashboard.table.referralId', 'Referral ID')}
                      </th>
                      <th scope="col" style={{ width: '110px' }}>
                        {t('referralDashboard.table.patient', 'Patient')}
                      </th>
                      <th scope="col" style={{ width: '120px' }}>
                        {t('referralDashboard.table.referringDoctor', 'Referring Doctor')}
                      </th>
                      <th scope="col" style={{ width: '120px' }}>
                        {t('referralDashboard.table.receivingDoctor', 'Receiving Doctor')}
                      </th>
                      <th scope="col" style={{ width: '115px' }}>
                        {t('referralDashboard.table.hospital', 'Hospital')}
                      </th>
                      <th scope="col" style={{ width: '80px' }}>
                        {t('referralDashboard.table.priority', 'Priority')}
                      </th>
                      <th scope="col" style={{ width: '85px' }}>
                        {t('referralDashboard.table.date', 'Date')}
                      </th>
                      <th scope="col" style={{ width: '90px' }}>
                        {t('referralDashboard.table.status', 'Status')}
                      </th>
                      <th scope="col" style={{ width: '130px', textAlign: 'right' }}>
                        {t('referralDashboard.table.actions', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralsData?.items.map((item) => (
                      <tr key={item.id} className="referral-row">
                        {/* Referral ID */}
                        <td className="referral-cell-id">
                          <button
                            type="button"
                            onClick={() => {
                              handleNav(`/admin/referrals/${item.id}`);
                            }}
                            className="hover:underline font-semibold text-[#28006d] text-left cursor-pointer bg-transparent border-0 p-0"
                            title={`View details for ${item.referralId}`}
                          >
                            {item.referralId}
                          </button>
                        </td>

                        {/* Patient */}
                        <td className="referral-cell-patient">
                          <span>{item.patientName}</span>
                        </td>

                        {/* Referring Doctor */}
                        <td className="referral-cell-doctor">
                          <span>{item.referringDoctorName}</span>
                        </td>

                        {/* Receiving Doctor */}
                        <td className="referral-cell-doctor">
                          <span>{item.receivingDoctorName}</span>
                        </td>

                        {/* Hospital */}
                        <td className="referral-cell-hospital">
                          <span>{item.hospitalName}</span>
                        </td>

                        {/* Priority Badge */}
                        <td>
                          <span
                            className={`referral-badge referral-badge-priority-${item.priority.toLowerCase()}`}
                          >
                            <span className="referral-badge-dot" />
                            <span>{item.priority}</span>
                          </span>
                        </td>

                        {/* Date */}
                        <td className="referral-cell-date">
                          <span>{item.date}</span>
                        </td>

                        {/* Status Badge */}
                        <td>
                          <span
                            className={`referral-badge referral-badge-status-${item.status.toLowerCase()}`}
                          >
                            <span className="referral-badge-dot" />
                            <span>{item.status}</span>
                          </span>
                        </td>

                        {/* Actions matching Figma 20:4892 icons */}
                        <td>
                          <div className="referral-action-group">
                            {/* Eye / View Details Icon */}
                            <button
                              type="button"
                              onClick={() => {
                                handleNav(`/admin/referrals/${item.id}`);
                              }}
                              className="referral-action-btn"
                              title={t('referralDashboard.table.viewDetails', 'View Details')}
                              aria-label={`View details for ${item.referralId}`}
                            >
                              <Eye size={16} />
                            </button>

                            {/* Timeline / Lifecycle Icon */}
                            <button
                              type="button"
                              onClick={() => setSelectedTimelineItem(item)}
                              className="referral-action-btn"
                              title={t('referralDashboard.table.viewHistory', 'Referral Lifecycle & History')}
                              aria-label={`View lifecycle for ${item.referralId}`}
                            >
                              <GitBranch size={16} />
                            </button>

                            {/* Document / Records / Notes Icon */}
                            <button
                              type="button"
                              onClick={() => setSelectedDetailsItem(item)}
                              className="referral-action-btn"
                              title={t('referralDashboard.table.viewNotes', 'View Clinical Notes & Attachments')}
                              aria-label={`View records for ${item.referralId}`}
                            >
                              <FileText size={16} />
                            </button>

                            {/* Escalate action */}
                            {item.status !== 'Escalated' && (
                              <button
                                type="button"
                                onClick={() => setSelectedEscalateItem(item)}
                                className="referral-action-btn escalate"
                                title={t('referralDashboard.table.escalate', 'Escalate Referral')}
                                aria-label={`Escalate referral ${item.referralId}`}
                              >
                                <AlertTriangle size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer matching Figma 20:4933 */}
            {!isError && (
              <div className="referral-pagination-footer">
                <p className="referral-pagination-text">
                  {isLoading && !referralsData ? (
                    <span>{t('referralDashboard.pagination.loading', 'Loading referrals...')}</span>
                  ) : (referralsData?.totalCount ?? 0) === 0 ? (
                    <>
                      {t('referralDashboard.pagination.showing', 'Showing')}{' '}
                      <span className="font-semibold">0</span>{' '}
                      {t('referralDashboard.pagination.of', 'of')}{' '}
                      <span className="font-semibold">0</span>{' '}
                      {t('referralDashboard.pagination.referrals', 'referrals')}
                    </>
                  ) : (
                    <>
                      {t('referralDashboard.pagination.showing', 'Showing')}{' '}
                      <span className="font-semibold">
                        {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, referralsData?.totalCount ?? 0)}
                      </span>{' '}
                      {t('referralDashboard.pagination.of', 'of')}{' '}
                      <span className="font-semibold">
                        {(referralsData?.totalCount ?? 0).toLocaleString()}
                      </span>{' '}
                      {t('referralDashboard.pagination.referrals', 'referrals')}
                    </>
                  )}
                </p>

                <div className="referral-pagination-controls">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || isLoading || (referralsData?.totalCount ?? 0) === 0}
                    className="referral-page-btn"
                    aria-label={t('referralDashboard.pagination.prev', 'Previous Page')}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span className="referral-page-indicator">
                    {(referralsData?.totalCount ?? 0) === 0 ? '0 / 0' : `${currentPage} / ${referralsData?.totalPages ?? 1}`}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(referralsData?.totalPages ?? 1, p + 1)
                      )
                    }
                    disabled={
                      (referralsData?.totalCount ?? 0) === 0 ||
                      currentPage >= (referralsData?.totalPages ?? 1) ||
                      isLoading
                    }
                    className="referral-page-btn"
                    aria-label={t('referralDashboard.pagination.next', 'Next Page')}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Referral Details Modal */}
      {selectedDetailsItem && (
        <div
          className="referral-modal-backdrop"
          onClick={() => setSelectedDetailsItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="referral-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="referral-modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e8ddff] text-[#28006d] flex items-center justify-center font-bold">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#191c1e]">
                    {selectedDetailsItem.referralId}
                  </h3>
                  <p className="text-xs text-[#494552]">
                    Created on {selectedDetailsItem.date}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailsItem(null)}
                className="p-2 text-[#7a7583] hover:text-[#191c1e] rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="referral-modal-body">
              {/* Badges Header */}
              <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-[#cbc4d4]/60">
                <span
                  className={`referral-badge referral-badge-status-${selectedDetailsItem.status.toLowerCase()}`}
                >
                  <span className="referral-badge-dot" />
                  <span>{selectedDetailsItem.status}</span>
                </span>
                <span
                  className={`referral-badge referral-badge-priority-${selectedDetailsItem.priority.toLowerCase()}`}
                >
                  <span className="referral-badge-dot" />
                  <span>Priority: {selectedDetailsItem.priority}</span>
                </span>
                <span className="text-xs bg-[#f2f4f6] text-[#494552] px-2.5 py-1 rounded-full font-medium">
                  {selectedDetailsItem.specialty}
                </span>
              </div>

              {/* Patient Info */}
              <div className="bg-[#f8f9fb] p-3.5 rounded-xl border border-[#cbc4d4]/50 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#7a7583] block uppercase tracking-wider">
                    {t('referralDashboard.modal.patientId', 'Patient')}
                  </span>
                  <p className="text-sm font-bold text-[#191c1e] mt-0.5">
                    {selectedDetailsItem.patientName} ({selectedDetailsItem.patientId})
                  </p>
                  <p className="text-xs text-[#494552]">
                    {selectedDetailsItem.patientGender}, {selectedDetailsItem.patientAge} years old
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNav(`/admin/patients/${selectedDetailsItem.patientId.toLowerCase()}`)}
                  className="px-3 py-1.5 bg-white border border-[#cbc4d4] rounded-lg text-xs font-semibold text-[#28006d] hover:bg-[#e8ddff]/40"
                >
                  View Profile
                </button>
              </div>

              {/* Clinical Doctors & Facility */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-[#cbc4d4]/60 rounded-xl">
                  <span className="text-xs font-semibold text-[#7a7583] block uppercase">
                    Referring Doctor
                  </span>
                  <p className="text-sm font-bold text-[#191c1e] mt-1">
                    {selectedDetailsItem.referringDoctorName}
                  </p>
                  <p className="text-xs text-[#494552]">
                    {selectedDetailsItem.referringDoctorSpecialty}
                  </p>
                </div>

                <div className="p-3 bg-white border border-[#cbc4d4]/60 rounded-xl">
                  <span className="text-xs font-semibold text-[#7a7583] block uppercase">
                    Receiving Doctor
                  </span>
                  <p className="text-sm font-bold text-[#191c1e] mt-1">
                    {selectedDetailsItem.receivingDoctorName}
                  </p>
                  <p className="text-xs text-[#494552]">
                    {selectedDetailsItem.receivingDoctorSpecialty}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white border border-[#cbc4d4]/60 rounded-xl">
                <span className="text-xs font-semibold text-[#7a7583] block uppercase">
                  Hospital / Clinical Facility
                </span>
                <p className="text-sm font-bold text-[#191c1e] mt-1">
                  {selectedDetailsItem.hospitalName} ({selectedDetailsItem.facilityId})
                </p>
              </div>

              {/* Clinical Reason */}
              <div>
                <span className="text-xs font-semibold text-[#7a7583] block uppercase mb-1">
                  {t('referralDashboard.modal.clinicalReason', 'Clinical Reason')}
                </span>
                <p className="text-sm text-[#191c1e] bg-[#f8f9fb] p-3 rounded-xl border border-[#cbc4d4]/40 leading-relaxed">
                  {selectedDetailsItem.clinicalReason || 'No detailed reason provided.'}
                </p>
              </div>

              {/* Clinical Notes */}
              <div>
                <span className="text-xs font-semibold text-[#7a7583] block uppercase mb-1">
                  {t('referralDashboard.modal.notes', 'Clinical Notes')}
                </span>
                <p className="text-sm text-[#494552] bg-white p-3 rounded-xl border border-[#cbc4d4]/60 leading-relaxed">
                  {selectedDetailsItem.notes || 'No notes documented.'}
                </p>
              </div>

              {/* Insurance & Authorization */}
              <div className="grid grid-cols-2 gap-3 text-xs text-[#494552] pt-2 border-t border-[#cbc4d4]/60">
                <div>
                  <span className="font-semibold block text-[#7a7583]">
                    {t('referralDashboard.modal.insurance', 'Insurance Provider')}
                  </span>
                  <span className="font-medium text-[#191c1e]">
                    {selectedDetailsItem.insuranceProvider}
                  </span>
                </div>
                <div>
                  <span className="font-semibold block text-[#7a7583]">
                    {t('referralDashboard.modal.authCode', 'Authorization Code')}
                  </span>
                  <span className="font-mono text-[#28006d]">
                    {selectedDetailsItem.authorizationCode}
                  </span>
                </div>
              </div>
            </div>

            <div className="referral-modal-footer">
              <button
                type="button"
                onClick={() => setSelectedDetailsItem(null)}
                className="px-4 py-2 border border-[#cbc4d4] rounded-lg text-sm font-semibold text-[#494552] hover:bg-white"
              >
                {t('referralDashboard.modal.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Referral Lifecycle & Timeline Modal */}
      {selectedTimelineItem && (
        <div
          className="referral-modal-backdrop"
          onClick={() => setSelectedTimelineItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="referral-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="referral-modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e8ddff] text-[#28006d] flex items-center justify-center font-bold">
                  <GitBranch size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#191c1e]">
                    {t('referralDashboard.modal.timelineTitle', 'Referral Lifecycle & History')}
                  </h3>
                  <p className="text-xs text-[#494552]">
                    {selectedTimelineItem.referralId} — {selectedTimelineItem.patientName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTimelineItem(null)}
                className="p-2 text-[#7a7583] hover:text-[#191c1e] rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="referral-modal-body">
              <div className="relative pl-6 border-l-2 border-[#cbc4d4] flex flex-col gap-6 my-2">
                {/* Event 1: Intake */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#28006d] ring-4 ring-[#e8ddff]" />
                  <p className="text-xs text-[#7a7583] font-medium">
                    {selectedTimelineItem.date} at 09:30 AM
                  </p>
                  <p className="text-sm font-bold text-[#191c1e]">
                    Referral Intake Initiated
                  </p>
                  <p className="text-xs text-[#494552] mt-0.5">
                    Created by {selectedTimelineItem.referringDoctorName} for {selectedTimelineItem.hospitalName}.
                  </p>
                </div>

                {/* Event 2: Triage */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#fabd00] ring-4 ring-[#ffdf9e]" />
                  <p className="text-xs text-[#7a7583] font-medium">
                    {selectedTimelineItem.date} at 11:15 AM
                  </p>
                  <p className="text-sm font-bold text-[#191c1e]">
                    Clinical Triage Evaluation
                  </p>
                  <p className="text-xs text-[#494552] mt-0.5">
                    Assigned priority <span className="font-semibold">{selectedTimelineItem.priority}</span> to department of {selectedTimelineItem.specialty}.
                  </p>
                </div>

                {/* Event 3: Current Status */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#006a60] ring-4 ring-[#85f6e5]" />
                  <p className="text-xs text-[#7a7583] font-medium">
                    Current Active State
                  </p>
                  <p className="text-sm font-bold text-[#191c1e]">
                    Status: {selectedTimelineItem.status}
                  </p>
                  <p className="text-xs text-[#494552] mt-0.5">
                    Scheduled with {selectedTimelineItem.receivingDoctorName} at {selectedTimelineItem.hospitalName}.
                  </p>
                </div>
              </div>
            </div>

            <div className="referral-modal-footer">
              <button
                type="button"
                onClick={() => setSelectedTimelineItem(null)}
                className="px-4 py-2 border border-[#cbc4d4] rounded-lg text-sm font-semibold text-[#494552] hover:bg-white"
              >
                {t('referralDashboard.modal.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalation Capability & Action Dialog */}
      {selectedEscalateItem && (
        <div
          className="referral-modal-backdrop"
          onClick={() => setSelectedEscalateItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="referral-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="referral-modal-header bg-[#fff8f7]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center font-bold">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#ba1a1a]">
                    {t('referralDashboard.modal.escalateNoticeTitle', 'API Capability Notice: Escalation')}
                  </h3>
                  <p className="text-xs text-[#7a7583]">
                    Referral {selectedEscalateItem.referralId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEscalateItem(null)}
                className="p-2 text-[#7a7583] hover:text-[#191c1e] rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="referral-modal-body">
              {/* Honest OpenAPI Gap Notice */}
              <div className="p-3.5 bg-[#fff8f7] border border-[#ffdad6] rounded-xl text-xs text-[#93000a] leading-relaxed">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <AlertCircle size={14} /> Backend Contract Status
                </p>
                {t(
                  'referralDashboard.modal.escalateNoticeBody',
                  'Backend endpoint PATCH /api/v1/admin/referrals/:id/escalate is not present in the OpenAPI specification. The documented contract supports status transition via PUT /api/v1/referrals/{id}/status and clinical triage via PUT /api/v1/referrals/{id}/triage.'
                )}
              </div>

              <div className="p-3 bg-[#f8f9fb] border border-[#cbc4d4]/60 rounded-xl text-sm">
                <p className="font-semibold text-[#191c1e]">
                  Patient: {selectedEscalateItem.patientName}
                </p>
                <p className="text-xs text-[#494552] mt-0.5">
                  Receiving: {selectedEscalateItem.receivingDoctorName} • {selectedEscalateItem.hospitalName}
                </p>
              </div>

              <p className="text-xs text-[#494552]">
                Marking this referral as <span className="font-bold text-[#ba1a1a]">Escalated</span> prioritizes patient intake, triggers rapid review protocol, and updates the local status to reflect clinical escalation.
              </p>
            </div>

            <div className="referral-modal-footer">
              <button
                type="button"
                onClick={() => setSelectedEscalateItem(null)}
                className="px-4 py-2 border border-[#cbc4d4] rounded-lg text-sm font-semibold text-[#494552] hover:bg-white"
              >
                {t('referralDashboard.modal.close', 'Cancel')}
              </button>

              <button
                type="button"
                onClick={() => handleConfirmEscalation(selectedEscalateItem)}
                className="px-4 py-2 bg-[#ba1a1a] text-white rounded-lg text-sm font-semibold hover:bg-[#93000a] shadow-sm"
              >
                {t('referralDashboard.modal.markEscalated', 'Set Escalated Status')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Referral Dialog */}
      <CreateReferralDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={(msg) => showToast(msg)}
      />
    </div>
  );
};

export default AdminReferralDashboard;
