import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Search,
  Bell,
  Settings,
  HelpCircle,
  Folder,
  Activity,
  Sparkles,
  Eye,
  SlidersHorizontal,
  Download,
  Calendar,
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  ChevronLeft,
  X,
  ShieldCheck,
  RefreshCw,
  FileText,
} from 'lucide-react';

import AdminSidebar from '../common/AdminSidebar';
import {
  useHealthRecordsQuery,
  useSyncHealthRecordsMutation,
  resolvePatientName,
  resolvePatientInitials,
  resolvePatientAvatarBg,
  type HealthRecordItem,
} from '../../services/healthRecordService';
import './AdminAllHealthRecords.css';

interface AdminAllHealthRecordsProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminAllHealthRecords: React.FC<AdminAllHealthRecordsProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  // Mobile Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filter States
  const urlCategory = searchParams.get('category');
  const [activeCategory, setActiveCategory] = useState<string>(
    urlCategory && ['Medical', 'Dental', 'Vision'].includes(urlCategory) ? urlCategory : 'All'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<string>('All');
  const [selectedProvider, setSelectedProvider] = useState<string>('All');
  const [selectedFacility, setSelectedFacility] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [dateRangeText, setDateRangeText] = useState<string>('Oct 01 - Oct 24, 2026');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals & UI States
  const [selectedRecord, setSelectedRecord] = useState<HealthRecordItem | null>(null);
  const [showFilterPresets, setShowFilterPresets] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Sync Mutation
  const syncMutation = useSyncHealthRecordsMutation();

  // Query Data
  const { data: recordsData, isLoading } = useHealthRecordsQuery({
    search: searchQuery,
    category: activeCategory,
    patient: selectedPatient,
    provider: selectedProvider,
    facility: selectedFacility,
    status: selectedStatus,
    page: currentPage,
    pageSize,
  });

  const records = recordsData?.records || [];
  const total = recordsData?.total || 0;
  const totalPages = recordsData?.totalPages || 1;

  // Guard against invalid page index when totalPages changes safely with useEffect
  useEffect(() => {
    if (recordsData?.totalPages && currentPage > recordsData.totalPages) {
      setCurrentPage(Math.max(1, recordsData.totalPages));
    }
  }, [recordsData?.totalPages, currentPage]);

  // Dynamic pagination range generator
  const paginationRange = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
  }, [currentPage, totalPages]);

  // Distinct lists for dropdowns
  const patientOptions = useMemo(() => [
    'All Patients',
    'Robert J. Sterling',
    'Sarah Jenkins',
    'Marcus Vance',
    'Emily Watson',
    'David K. Patel',
    'Leo Jenkins',
    'Samantha Reed',
    'Arthur Pendelton',
    'Clara Higgins',
    'Eleanor Vance',
    'Marcus Sterling',
    'David K. Chen',
    'Elena Rostova',
    'Clara Oswald',
    'Michael B. Jordan',
    'Sophia Lorenze',
    'James H. Watson',
    'Rebecca Nurse',
    'Lucas Davenport',
  ], []);

  const providerOptions = useMemo(() => [
    'All Providers',
    'Dr. Julian Vance',
    'Dr. Aris Evans',
    'Dr. Elena Rostova',
    'Dr. Michael Chang',
    'Dr. Sarah Wilson',
    'Dr. Keith Miller',
  ], []);

  const facilityOptions = useMemo(() => [
    'All Facilities',
    'Metro Hospital',
    'Apex Dental Center',
    'Horizon Vision',
    'Metro Heart Center',
    'Family Health Clinic',
    'City Dental Specialists',
  ], []);

  const statusOptions = useMemo(() => [
    'All Statuses',
    'Verified',
    'Pending Verification',
    'Rejected',
  ], []);

  const datePresets = [
    'Oct 01 - Oct 24, 2026',
    'Last 7 Days (Oct 17 - Oct 24, 2026)',
    'Last 30 Days (Sep 24 - Oct 24, 2026)',
    'Q3 2026 (Jul 01 - Sep 30, 2026)',
    'Year to Date (2026)',
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCategorySelect = (category: string) => {
    if (category === 'Medical') {
      if (onNavigate) {
        onNavigate('/admin/records/medical');
        return;
      }
    } else if (category === 'Dental') {
      if (onNavigate) {
        onNavigate('/admin/records/dental');
        return;
      }
    } else if (category === 'Vision') {
      if (onNavigate) {
        onNavigate('/admin/records/vision');
        return;
      }
    }
    setActiveCategory(category);
    setCurrentPage(1);
    if (category === 'All') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', category);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveCategory('All');
    setSelectedPatient('All');
    setSelectedProvider('All');
    setSelectedFacility('All');
    setSelectedStatus('All');
    setDateRangeText('Oct 01 - Oct 24, 2026');
    setCurrentPage(1);
    searchParams.delete('category');
    setSearchParams(searchParams, { replace: true });
    showToast('Filters reset to default view.');
  };

  const handleApplyPreset = (presetName: string) => {
    setShowFilterPresets(false);
    if (presetName === 'unverified') {
      setSelectedStatus('Pending Verification');
      setActiveCategory('All');
      showToast('Applied Preset: Pending Verification Records');
    } else if (presetName === 'rejected') {
      setSelectedStatus('Rejected');
      setActiveCategory('All');
      showToast('Applied Preset: Rejected Encounters');
    } else if (presetName === 'hospital') {
      setSelectedFacility('Metro Hospital');
      setActiveCategory('Medical');
      showToast('Applied Preset: Metro Hospital Medical Encounters');
    } else if (presetName === 'highPriority') {
      setSearchQuery('Cardiology');
      setActiveCategory('All');
      showToast('Applied Preset: High Priority Cardiology Encounters');
    }
    setCurrentPage(1);
  };

  const handleExportCsv = () => {
    setIsExporting(true);
    setTimeout(() => {
      const csvHeader = 'Record ID,Title,Patient Name,Patient ID,Category,Record Type,Provider,Facility,Date,Status\n';
      const csvRows = records
        .map(
          (r) =>
            `"${r.recordNumber}","${r.title}","${r.patientName}","${r.patientId}","${r.category}","${r.recordType}","${r.provider}","${r.facility}","${r.recordDate}","${r.status}"`
        )
        .join('\n');
      const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `careid_health_records_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsExporting(false);
      showToast('Health Records exported to CSV.');
    }, 600);
  };

  const handleForceSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: () => {
        showToast(t('healthRecords.federated.syncedToast', 'Federated health records successfully synchronized across all 3 nodes.'));
      },
    });
  };

  return (
    <div className="health-records-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-[#0b1c30] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-[#28006d]/40 transition-all duration-300"
        >
          <span className="w-2.5 h-2.5 bg-[#00696b] rounded-full animate-ping" />
          <span className="text-sm font-semibold">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-gray-400 hover:text-white"
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Shared CareID Sidebar */}
      <AdminSidebar
        activeNav={
          activeCategory === 'Medical'
            ? 'records-medical'
            : activeCategory === 'Dental'
            ? 'records-dental'
            : activeCategory === 'Vision'
            ? 'records-vision'
            : 'records'
        }
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
        ctaLabel="+ New Record"
        onCtaClick={() => handleNav('/admin/records/upload')}
      />

      {/* Main Content Area */}
      <div className="careid-main-wrapper">
        {/* Stationary Top Navbar */}
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
              placeholder="Search facilities, patients, logs..."
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
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ba1a1a] rounded-full" />
            </button>

            <button
              type="button"
              className="p-2 text-[#494552] hover:text-[#28006d] hover:bg-[#f2f4f6] rounded-lg transition-colors hidden sm:inline-flex"
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>

            <button
              type="button"
              className="p-2 text-[#494552] hover:text-[#28006d] hover:bg-[#f2f4f6] rounded-lg transition-colors hidden sm:inline-flex"
              aria-label="Help"
            >
              <HelpCircle size={18} />
            </button>

            <button
              type="button"
              className="hidden sm:flex items-center gap-1.5 bg-[#28006d] text-white px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-[#3f1d8b] transition-colors"
              onClick={() => handleNav('/admin/records/upload')}
            >
              <FileText size={14} />
              <span>Upload Record</span>
            </button>

            <div className="w-px h-6 bg-[#cbc4d4] hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#28006d] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                SA
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-[#0b1c30] leading-none mb-0.5">Admin User</span>
                <span className="text-[11px] font-semibold text-[#00696b] leading-none">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content Canvas */}
        <main className="health-records-canvas" role="main">
          {/* Top Breadcrumb, Title & Top Actions */}
          <div className="records-title-strip">
            <div className="records-heading-group">
              <div className="records-breadcrumbs">
                <span className="text-[#494552]">{t('healthRecords.breadcrumbs.adminPortal', 'Admin Portal')}</span>
                <span className="text-[#cbc4d4]">›</span>
                <span className="text-[#494552]">{t('healthRecords.breadcrumbs.healthRecords', 'Health Records')}</span>
                <span className="text-[#cbc4d4]">›</span>
                <span className="text-[#28006d] font-bold">{t('healthRecords.breadcrumbs.allRecords', 'All Records')}</span>
              </div>
              <h1 className="records-heading-title">{t('healthRecords.title', 'Health Records')}</h1>
              <p className="records-heading-subtitle">
                {t('healthRecords.subtitle', 'View and manage patient health records across all clinical categories (Medical, Dental, Vision).')}
              </p>
            </div>

            <div className="records-header-actions relative">
              {/* Filter Presets Button */}
              <div className="relative">
                <button
                  type="button"
                  className="btn-filter-presets"
                  onClick={() => setShowFilterPresets(!showFilterPresets)}
                  aria-expanded={showFilterPresets}
                  aria-haspopup="true"
                >
                  <SlidersHorizontal size={14} />
                  <span>{t('healthRecords.actions.filterPresets', 'Filter Presets')}</span>
                </button>

                {showFilterPresets && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-[#e2e8f0] p-2 z-30 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 text-xs font-bold text-[#7a7583] uppercase tracking-wider">
                      Quick Filter Presets
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('unverified')}
                      className="w-full text-left px-3 py-2 text-sm text-[#0b1c30] hover:bg-[#f0f4fd] rounded-lg flex items-center justify-between font-medium"
                    >
                      <span>Pending Verification</span>
                      <span className="text-xs bg-[#ffdbc9] text-[#331200] px-2 py-0.5 rounded-full font-bold">Review</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('rejected')}
                      className="w-full text-left px-3 py-2 text-sm text-[#0b1c30] hover:bg-[#f0f4fd] rounded-lg flex items-center justify-between font-medium"
                    >
                      <span>Rejected Records</span>
                      <span className="text-xs bg-[#ffdad6] text-[#93000a] px-2 py-0.5 rounded-full font-bold">Fix</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('hospital')}
                      className="w-full text-left px-3 py-2 text-sm text-[#0b1c30] hover:bg-[#f0f4fd] rounded-lg flex items-center justify-between font-medium"
                    >
                      <span>Metro Hospital Records</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('highPriority')}
                      className="w-full text-left px-3 py-2 text-sm text-[#0b1c30] hover:bg-[#f0f4fd] rounded-lg flex items-center justify-between font-medium"
                    >
                      <span>Cardiology Reports</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Export CSV Button */}
              <button
                type="button"
                className="btn-export-csv"
                onClick={handleExportCsv}
                disabled={isExporting}
              >
                <Download size={14} className={isExporting ? 'animate-bounce' : ''} />
                <span>{isExporting ? t('healthRecords.actions.exportingCsv', 'Exporting...') : t('healthRecords.actions.exportCsv', 'Export CSV')}</span>
              </button>
            </div>
          </div>

          {/* Category Segments / Tab Nav */}
          <div className="records-category-strip">
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              {/* Segmented Group */}
              <div className="category-segmented-group" role="tablist" aria-label="Health record clinical categories">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === 'All'}
                  className={`category-tab-btn ${activeCategory === 'All' ? 'active' : ''}`}
                  onClick={() => handleCategorySelect('All')}
                >
                  <Folder size={15} />
                  <span>{t('healthRecords.tabs.all', 'All Records')}</span>
                  <span className="category-badge">14,820</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === 'Medical'}
                  className={`category-tab-btn ${activeCategory === 'Medical' ? 'active' : ''}`}
                  onClick={() => handleCategorySelect('Medical')}
                >
                  <Activity size={15} />
                  <span>{t('healthRecords.tabs.medical', 'Medical')}</span>
                  <span className="category-badge">8,940</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === 'Dental'}
                  className={`category-tab-btn ${activeCategory === 'Dental' ? 'active' : ''}`}
                  onClick={() => handleCategorySelect('Dental')}
                >
                  <Sparkles size={15} />
                  <span>{t('healthRecords.tabs.dental', 'Dental')}</span>
                  <span className="category-badge">3,410</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === 'Vision'}
                  className={`category-tab-btn ${activeCategory === 'Vision' ? 'active' : ''}`}
                  onClick={() => handleCategorySelect('Vision')}
                >
                  <Eye size={15} />
                  <span>{t('healthRecords.tabs.vision', 'Vision')}</span>
                  <span className="category-badge">2,470</span>
                </button>
              </div>

              {/* Gradient All Details Button */}
              <button
                type="button"
                className="btn-all-details"
                onClick={() => {
                  if (records[0]) {
                    setSelectedRecord(records[0]);
                  }
                }}
              >
                <span>{t('healthRecords.actions.allDetails', 'All Details')}</span>
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Federated Vault Sync Metric Spark Card */}
            <div className="federated-spark-card">
              <div className="federated-spark-text">
                <span className="text-xs font-semibold text-[#494552]">
                  {t('healthRecords.federated.label', 'Federated Nodes Active')}
                </span>
                <span className="text-sm font-bold text-[#0b1c30]">
                  {t('healthRecords.federated.status', '3/3 Operational')}
                </span>
              </div>
              <svg width="64" height="28" viewBox="0 0 64 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" aria-hidden="true">
                <path
                  d="M2 20L14 16L24 22L36 8L48 14L62 4"
                  stroke="#00696b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Search & Multi-facet Filter Bar */}
          <div className="records-filter-panel">
            {/* Top Row: Search Input + Date Selector + Reset */}
            <div className="filter-top-row">
              <div className="filter-search-box">
                <Search size={16} className="absolute left-3.5 text-[#7a7583] pointer-events-none" />
                <input
                  type="text"
                  placeholder={t('healthRecords.search.placeholder', 'Search patient, patient ID, or record ID...')}
                  className="filter-search-input"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* Inline Quick Date Selector */}
              <div className="relative">
                <button
                  type="button"
                  className="bg-[#eff4ff] hover:bg-[#e2edff] text-[#0b1c30] flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  aria-label="Select date filter range"
                >
                  <Calendar size={15} className="text-[#494552]" />
                  <span>{dateRangeText}</span>
                  <span className="text-[10px] text-[#7a7583]">▼</span>
                </button>

                {showDatePicker && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-[#e2e8f0] p-2 z-20">
                    <div className="px-3 py-1.5 text-xs font-bold text-[#7a7583] uppercase tracking-wider">
                      Date Range Presets
                    </div>
                    {datePresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setDateRangeText(preset.split(' (')[0]);
                          setShowDatePicker(false);
                          showToast(`Date filter applied: ${preset.split(' (')[0]}`);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors font-medium"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset Button */}
              <button
                type="button"
                className="bg-[#e5eeff] hover:bg-[#d8e5fc] text-[#494552] flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
                onClick={handleResetFilters}
              >
                <RotateCcw size={14} />
                <span>{t('healthRecords.search.reset', 'Reset Filters')}</span>
              </button>
            </div>

            {/* Filter Dropdowns Row */}
            <div className="filter-dropdowns-grid">
              {/* Category Dropdown */}
              <select
                className="custom-filter-select"
                value={activeCategory}
                onChange={(e) => handleCategorySelect(e.target.value)}
                aria-label="Filter by category"
              >
                <option value="All">{t('healthRecords.filters.categoryAll', 'Category: All')}</option>
                <option value="Medical">Category: Medical</option>
                <option value="Dental">Category: Dental</option>
                <option value="Vision">Category: Vision</option>
              </select>

              {/* Patient Dropdown */}
              <select
                className="custom-filter-select"
                value={selectedPatient}
                onChange={(e) => {
                  setSelectedPatient(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by patient"
              >
                {patientOptions.map((opt: string) => (
                  <option key={opt} value={opt === 'All Patients' ? 'All' : opt}>
                    {opt === 'All Patients' ? t('healthRecords.filters.patientAll', 'Patient: All Patients') : `Patient: ${opt}`}
                  </option>
                ))}
              </select>

              {/* Provider Dropdown */}
              <select
                className="custom-filter-select"
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by provider"
              >
                {providerOptions.map((opt: string) => (
                  <option key={opt} value={opt === 'All Providers' ? 'All' : opt}>
                    {opt === 'All Providers' ? t('healthRecords.filters.providerAll', 'Provider: All Providers') : `Provider: ${opt}`}
                  </option>
                ))}
              </select>

              {/* Facility Dropdown */}
              <select
                className="custom-filter-select"
                value={selectedFacility}
                onChange={(e) => {
                  setSelectedFacility(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by facility"
              >
                {facilityOptions.map((opt: string) => (
                  <option key={opt} value={opt === 'All Facilities' ? 'All' : opt}>
                    {opt === 'All Facilities' ? t('healthRecords.filters.facilityAll', 'Facility: All Facilities') : `Facility: ${opt}`}
                  </option>
                ))}
              </select>

              {/* Verification Status Dropdown */}
              <select
                className="custom-filter-select"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by verification status"
              >
                {statusOptions.map((opt: string) => (
                  <option key={opt} value={opt === 'All Statuses' ? 'All' : opt}>
                    {opt === 'All Statuses' ? t('healthRecords.filters.statusAll', 'Status: All Statuses') : `Status: ${opt}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Data Table Container */}
          <div className="records-table-card">
            <div className="records-table-scroll">
              <table className="records-table" aria-label="Health records list">
                <thead>
                  <tr>
                    <th className="col-record-name">{t('healthRecords.table.recordNameAndId', 'RECORD NAME & ID')}</th>
                    <th className="col-patient">{t('healthRecords.table.patient', 'PATIENT')}</th>
                    <th className="col-patient-id">{t('healthRecords.table.patientId', 'PATIENT ID')}</th>
                    <th className="col-category">{t('healthRecords.table.category', 'CATEGORY')}</th>
                    <th className="col-record-type">{t('healthRecords.table.recordType', 'RECORD TYPE')}</th>
                    <th className="col-provider">{t('healthRecords.table.providerFacility', 'PROVIDER / FACILITY')}</th>
                    <th className="col-record-date">{t('healthRecords.table.recordDate', 'RECORD DATE')}</th>
                    <th className="col-status">{t('healthRecords.table.status', 'STATUS')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-[#7a7583]">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <RefreshCw className="animate-spin text-[#28006d]" size={28} />
                          <span className="font-semibold text-sm">Loading authentic health records repository...</span>
                        </div>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#28006d]">
                            <Folder size={24} />
                          </div>
                          <div className="font-bold text-base text-[#0b1c30]">
                            {t('healthRecords.empty.title', 'No health records found matching your filters')}
                          </div>
                          <p className="text-sm text-[#7a7583] max-w-md">
                            {t('healthRecords.empty.subtitle', 'Try adjusting your search query, clinical category, date range, or status filters.')}
                          </p>
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="mt-2 bg-[#28006d] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#39009c] transition-colors"
                          >
                            {t('healthRecords.empty.reset', 'Clear All Filters')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr
                        key={record.id}
                        onClick={() => setSelectedRecord(record)}
                        className="cursor-pointer transition-colors"
                        tabIndex={0}
                        role="button"
                        aria-label={`View ${record.title} details`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedRecord(record);
                          }
                        }}
                      >
                        {/* RECORD NAME & ID */}
                        <td className="col-record-name">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#0b1c30] text-sm leading-tight">
                              {record.title}
                            </span>
                            <span className="text-xs font-mono font-bold text-[#7a7583] mt-0.5">
                              {record.recordNumber}
                            </span>
                          </div>
                        </td>

                        {/* PATIENT */}
                        <td className="col-patient">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm"
                              style={{ backgroundColor: resolvePatientAvatarBg(record) }}
                            >
                              {resolvePatientInitials(record)}
                            </div>
                            <span className="font-medium text-[#0b1c30] text-sm patient-name-label">
                              {resolvePatientName(record)}
                            </span>
                          </div>
                        </td>

                        {/* PATIENT ID */}
                        <td className="col-patient-id">
                          <span className="font-mono text-sm text-[#494552]">
                            {record.patientId || 'N/A'}
                          </span>
                        </td>

                        {/* CATEGORY */}
                        <td className="col-category">
                          {record.category === 'Medical' && (
                            <span className="badge-cat-medical">Medical</span>
                          )}
                          {record.category === 'Dental' && (
                            <span className="badge-cat-dental">Dental</span>
                          )}
                          {record.category === 'Vision' && (
                            <span className="badge-cat-vision">Vision</span>
                          )}
                        </td>

                        {/* RECORD TYPE */}
                        <td className="col-record-type">
                          <span className="text-sm text-[#494552] whitespace-nowrap">
                            {record.recordType}
                          </span>
                        </td>

                        {/* PROVIDER / FACILITY */}
                        <td className="col-provider">
                          <div className="flex flex-col">
                            <span className="font-medium text-[#0b1c30] text-sm leading-tight whitespace-nowrap">
                              {record.provider}
                            </span>
                            <span className="text-xs font-semibold text-[#7a7583] mt-0.5 whitespace-nowrap">
                              {record.facility}
                            </span>
                          </div>
                        </td>

                        {/* RECORD DATE */}
                        <td className="col-record-date">
                          <span className="text-sm text-[#494552] whitespace-nowrap">
                            {record.recordDate}
                          </span>
                        </td>

                        {/* STATUS */}
                        <td className="col-status">
                          {record.status === 'Verified' && (
                            <span className="badge-status-verified">
                              <CheckCircle2 size={12} />
                              <span>{t('healthRecords.status.verified', 'Verified')}</span>
                            </span>
                          )}
                          {record.status === 'Pending Verification' && (
                            <span className="badge-status-pending">
                              <Clock size={12} />
                              <span>{t('healthRecords.status.pendingVerification', 'Pending Verification')}</span>
                            </span>
                          )}
                          {record.status === 'Rejected' && (
                            <span className="badge-status-rejected">
                              <XCircle size={12} />
                              <span>{t('healthRecords.status.rejected', 'Rejected')}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Bar */}
            <div className="records-pagination-bar">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#494552]">
                <span>
                  {t('healthRecords.pagination.showing', {
                    start: total === 0 ? 0 : (currentPage - 1) * pageSize + 1,
                    end: Math.min(currentPage * pageSize, total),
                    total: total.toLocaleString(),
                    defaultValue: `Showing ${total === 0 ? 0 : (currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, total)} of ${total.toLocaleString()} records`,
                  })}
                </span>
                <span className="text-[#cbc4d4]">•</span>
                <div className="flex items-center gap-1.5">
                  <span>{t('healthRecords.pagination.rows', 'Rows:')}</span>
                  <select
                    className="bg-white rounded px-2 py-0.5 text-xs font-semibold text-[#0b1c30] border border-[#d2ddec] outline-none"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    aria-label="Rows per page"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>

                {paginationRange.map((item: number | string, idx: number) =>
                  item === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-[#7a7583] font-bold">
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${item}`}
                      type="button"
                      className={`pagination-btn ${currentPage === item ? 'active' : ''}`}
                      onClick={() => setCurrentPage(item as number)}
                      aria-label={`Page ${item}`}
                      aria-current={currentPage === item ? 'page' : undefined}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Repository Synchronization Status Banner */}
          <div className="records-sync-banner">
            <div className="flex items-center gap-3">
              <div className="sync-pulsing-dot" />
              <div className="text-sm font-bold text-[#494552]">
                <span>Federated Health Records Repository</span>
                <span className="font-normal text-[#494552]">
                  {` — Real-time synchronization active across Medical, Dental, and Vision clinical nodes.`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-mono font-bold text-[#7a7583]">
                Sync ID: #FED-99201-LIVE
              </span>
              <button
                type="button"
                className="text-sm font-semibold text-[#28006d] hover:underline flex items-center gap-1.5 disabled:opacity-50"
                onClick={handleForceSync}
                disabled={syncMutation.isPending}
              >
                <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} />
                <span>{syncMutation.isPending ? 'Syncing...' : t('healthRecords.actions.forceSync', 'Force Sync')}</span>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Record Inspection Modal / Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#cbc4d4] max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-[#f8f9fb] border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm shadow-sm"
                  style={{ backgroundColor: resolvePatientAvatarBg(selectedRecord) }}
                >
                  {resolvePatientInitials(selectedRecord)}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#0b1c30] leading-tight">
                    {selectedRecord.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono font-bold text-[#28006d]">
                      {selectedRecord.recordNumber}
                    </span>
                    <span className="text-xs text-[#7a7583]">•</span>
                    <span className="text-xs text-[#494552]">{selectedRecord.recordDate}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="p-1.5 text-[#7a7583] hover:text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors"
                onClick={() => setSelectedRecord(null)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-5 text-sm">
              {/* Status and Category Chips */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[#7a7583] uppercase tracking-wider">Category:</span>
                  {selectedRecord.category === 'Medical' && <span className="badge-cat-medical">Medical</span>}
                  {selectedRecord.category === 'Dental' && <span className="badge-cat-dental">Dental</span>}
                  {selectedRecord.category === 'Vision' && <span className="badge-cat-vision">Vision</span>}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[#7a7583] uppercase tracking-wider">Status:</span>
                  {selectedRecord.status === 'Verified' && (
                    <span className="badge-status-verified">
                      <CheckCircle2 size={12} /> Verified
                    </span>
                  )}
                  {selectedRecord.status === 'Pending Verification' && (
                    <span className="badge-status-pending">
                      <Clock size={12} /> Pending Verification
                    </span>
                  )}
                  {selectedRecord.status === 'Rejected' && (
                    <span className="badge-status-rejected">
                      <XCircle size={12} /> Rejected
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <ShieldCheck size={16} className="text-[#00696b]" />
                  <span className="text-xs font-semibold text-[#00696b]">
                    OCR Confidence: {selectedRecord.ocrConfidence}%
                  </span>
                </div>
              </div>

              {/* Patient & Provider Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#eff4ff] p-3.5 rounded-xl border border-[#d6e4ff]">
                  <span className="text-xs font-bold text-[#494552] uppercase tracking-wider block mb-1">
                    Patient Profile
                  </span>
                  <div className="font-bold text-[#0b1c30]">{resolvePatientName(selectedRecord)}</div>
                  <div className="text-xs font-mono text-[#7a7583] mt-0.5">ID: {selectedRecord.patientId || 'N/A'}</div>
                </div>

                <div className="bg-[#eff4ff] p-3.5 rounded-xl border border-[#d6e4ff]">
                  <span className="text-xs font-bold text-[#494552] uppercase tracking-wider block mb-1">
                    Attending Physician & Facility
                  </span>
                  <div className="font-bold text-[#0b1c30]">{selectedRecord.provider}</div>
                  <div className="text-xs font-semibold text-[#7a7583] mt-0.5">{selectedRecord.facility}</div>
                </div>
              </div>

              {/* Clinical Summary */}
              <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-xs">
                <h4 className="font-bold text-sm text-[#0b1c30] mb-2">Clinical Encounter Summary</h4>
                <p className="text-[#494552] leading-relaxed">{selectedRecord.summary}</p>
                {selectedRecord.clinicalNotes && (
                  <div className="mt-3 pt-3 border-t border-[#f1f3f7] text-xs font-mono text-[#28006d] bg-[#f8f9ff] p-2.5 rounded-lg">
                    {selectedRecord.clinicalNotes}
                  </div>
                )}
              </div>

              {/* Technical / File Metadata */}
              <div className="flex items-center justify-between text-xs text-[#7a7583] bg-[#f8f9fb] px-4 py-2.5 rounded-lg">
                <span>File Format: <strong>{selectedRecord.documentType}</strong></span>
                <span>Payload Size: <strong>{selectedRecord.fileSize}</strong></span>
                <span>Federated Hash: <strong>SHA-256 Verified</strong></span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-[#f8f9fb] border-t border-[#e2e8f0] flex items-center justify-between">
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setSelectedRecord(null)}
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-modal-details"
                  onClick={() => {
                    const targetId = selectedRecord.id;
                    setSelectedRecord(null);
                    navigate(`/admin/records/${targetId}`, { state: { from: location.pathname } });
                  }}
                >
                  <span>View Full Details & Audit Trail</span>
                  <ChevronRight size={14} />
                </button>

                <button
                  type="button"
                  className="btn-modal-download"
                  onClick={() => {
                    showToast(`Downloading: ${selectedRecord.recordNumber}.pdf`);
                    setSelectedRecord(null);
                  }}
                >
                  <Download size={15} />
                  <span>Download Document</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAllHealthRecords;
