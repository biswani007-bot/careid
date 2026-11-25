import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Search,
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
  HeartPulse,
  Sparkles,
  Eye,
  Plus,
  AlertCircle,
  FileText,
  ArrowUpRight,
  Check,
} from 'lucide-react';

import AdminSidebar from '../common/AdminSidebar';
import AdminHeader from '../common/AdminHeader';
import {
  useHealthRecordsQuery,
  useCategoryHealthRecordKpisQuery,
  useAllCategoryRecordsQuery,
  useSyncHealthRecordsMutation,
  useUpdateHealthRecordStatusMutation,
  resolvePatientName,
  resolvePatientInitials,
  resolvePatientAvatarBg,
  downloadAttachmentFile,
  type HealthRecordCategory,
  type HealthRecordItem,
  type HealthRecordStatus,
} from '../../services/healthRecordService';
import './AdminCategoryHealthRecords.css';

// Zod validation schema for Add Record Form
const newRecordSchema = z.object({
  title: z.string().min(3, 'Record title must be at least 3 characters'),
  patientName: z.string().min(2, 'Patient name is required'),
  patientId: z.string().regex(/^CID-\d{4}-\d{4}/, 'Patient ID must match format CID-XXXX-XXXX'),
  recordType: z.string().min(2, 'Record type is required'),
  provider: z.string().min(2, 'Provider name is required'),
  facility: z.string().min(2, 'Facility is required'),
  summary: z.string().min(10, 'Clinical summary must be at least 10 characters'),
  clinicalNotes: z.string().optional(),
});

type NewRecordFormData = z.infer<typeof newRecordSchema>;

export interface AdminCategoryHealthRecordsProps {
  category: HealthRecordCategory;
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminCategoryHealthRecords: React.FC<AdminCategoryHealthRecordsProps> = ({
  category,
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Mobile Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filter States from URL / State
  const initialSearch = searchParams.get('q') || '';
  const initialPatient = searchParams.get('patient') || 'All';
  const initialProvider = searchParams.get('provider') || 'All';
  const initialFacility = searchParams.get('facility') || 'All';
  const initialStatus = searchParams.get('status') || 'All';

  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [selectedPatient, setSelectedPatient] = useState<string>(initialPatient);
  const [selectedProvider, setSelectedProvider] = useState<string>(initialProvider);
  const [selectedFacility, setSelectedFacility] = useState<string>(initialFacility);
  const [selectedRecordType, setSelectedRecordType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [dateRangeText, setDateRangeText] = useState<string>('All Dates');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals & Popups
  const [selectedRecord, setSelectedRecord] = useState<HealthRecordItem | null>(null);
  const [showFilterPresets, setShowFilterPresets] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Canvas ref for clean scroll reset when navigating between categories
  const canvasRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.scrollTop = 0;
    }
  }, [category, location.pathname]);

  // React Query: Fetch Records for this category with all active filters
  const { data: recordsData, isLoading, refetch } = useHealthRecordsQuery({
    search: searchQuery,
    category,
    patient: selectedPatient,
    provider: selectedProvider,
    facility: selectedFacility,
    recordType: selectedRecordType,
    status: selectedStatus,
    startDate,
    endDate,
    page: currentPage,
    pageSize,
  });

  // React Query: Category KPIs
  const { data: kpiData } = useCategoryHealthRecordKpisQuery(category);

  // React Query: All records in this category (for robust, persistent dropdown options)
  const { data: allCategoryRecords = [] } = useAllCategoryRecordsQuery(category);

  // Mutations
  const syncMutation = useSyncHealthRecordsMutation();
  const updateStatusMutation = useUpdateHealthRecordStatusMutation();

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

  // Navigation Helper
  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Add Record Form Hook
  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors, isSubmitting },
  } = useForm<NewRecordFormData>({
    resolver: zodResolver(newRecordSchema),
    defaultValues: {
      title: '',
      patientName: '',
      patientId: 'CID-',
      recordType: category === 'Dental' ? 'Dental Diagnostic' : category === 'Vision' ? 'Ophthalmology Scan' : 'Laboratory Report',
      provider: category === 'Dental' ? 'Dr. Aris Evans' : category === 'Vision' ? 'Dr. Elena Rostova' : 'Dr. Julian Vance',
      facility: category === 'Dental' ? 'Apex Dental Center' : category === 'Vision' ? 'Horizon Vision' : 'Metro Hospital',
      summary: '',
      clinicalNotes: '',
    },
  });

  const onAddRecordSubmit = async (data: NewRecordFormData) => {
    await new Promise((r) => setTimeout(r, 600));
    setShowAddModal(false);
    resetForm();
    showToast(t('healthRecords.toast.recordCreated', `New ${category} record "${data.title}" successfully indexed.`));
    refetch();
  };

  // Category-specific text and assets
  const categoryConfig = useMemo(() => {
    switch (category) {
      case 'Dental':
        return {
          title: t('healthRecords.dental.title', 'Dental Records'),
          nodeBadge: t('healthRecords.dental.nodeBadge', 'Live Dental Node'),
          subtitle: t(
            'healthRecords.dental.subtitle',
            'Federated dental records and clinical charts across connected nodes'
          ),
          searchPlaceholder: t(
            'healthRecords.dental.searchPlaceholder',
            'Search patient, patient ID, diagnosis, dentist, or record ID...'
          ),
          providerLabel: t('healthRecords.filters.providerDentist', 'PROVIDER / DENTIST'),
          providerDefault: 'All Dentists',
          providerList: ['All Dentists', 'Dr. Aris Evans', 'Dr. Keith Miller'],
          recordTypeDefault: 'All Dental Types',
          recordTypeList: [
            'All Dental Types',
            'Dental Diagnostic',
            'Dental Examination',
            'Dental Procedure',
            'Periodontal Charting',
          ],
          syncHash: '#FED-98201-DENTAL',
          infoSubbanner: t(
            'healthRecords.dental.info',
            'Showing odontogram records, bitewing & panoramic radiographs, periodontal charts, and endodontic operative summaries.'
          ),
          kpiCard1Title: t('healthRecords.dental.kpiTotal', 'Total Dental Records'),
          kpiCard2Subtitle: t('healthRecords.dental.kpiVerifiedSub', 'ADA & Clinical Compliance'),
          kpiCard3Subtitle: t('healthRecords.dental.kpiPendingSub', 'Awaiting OCR / clinical signoff'),
          iconClass: 'dental',
          activeNav: 'records-dental',
        };
      case 'Vision':
        return {
          title: t('healthRecords.vision.title', 'Vision Records'),
          nodeBadge: t('healthRecords.vision.nodeBadge', 'Live Vision Node'),
          subtitle: t(
            'healthRecords.vision.subtitle',
            'Federated vision health records and diagnostic repositories'
          ),
          searchPlaceholder: t(
            'healthRecords.vision.searchPlaceholder',
            'Search patient, patient ID, diagnosis, optometrist, or record ID...'
          ),
          providerLabel: t('healthRecords.filters.providerOptometrist', 'PROVIDER / OPTOMETRIST'),
          providerDefault: 'All Eye Specialists',
          providerList: ['All Eye Specialists', 'Dr. Elena Rostova'],
          recordTypeDefault: 'All Vision Types',
          recordTypeList: [
            'All Vision Types',
            'Ophthalmology Scan',
            'Vision Prescription',
            'Eye Health Record',
            'Visual Field Test',
            'Biomicroscopy',
          ],
          syncHash: '#FED-98201-VISION',
          infoSubbanner: t(
            'healthRecords.vision.info',
            'Showing visual acuity exams, OCT retinal scans, fundus photography, tonometry reports, and ophthalmic prescription records.'
          ),
          kpiCard1Title: t('healthRecords.vision.kpiTotal', 'Total Vision Records'),
          kpiCard2Subtitle: t('healthRecords.vision.kpiVerifiedSub', 'Clinical & Optometric Standard'),
          kpiCard3Subtitle: t('healthRecords.vision.kpiPendingSub', 'Awaiting OCR / ophthalmologist signoff'),
          iconClass: 'vision',
          activeNav: 'records-vision',
        };
      case 'Medical':
      default:
        return {
          title: t('healthRecords.medical.title', 'Medical Records'),
          nodeBadge: t('healthRecords.medical.nodeBadge', 'Live Repository'),
          subtitle: t(
            'healthRecords.medical.subtitle',
            'Federated medical health records across connected clinical repositories'
          ),
          searchPlaceholder: t(
            'healthRecords.medical.searchPlaceholder',
            'Search patient, patient ID, diagnosis, doctor, or record ID...'
          ),
          providerLabel: t('healthRecords.filters.providerDoctor', 'PROVIDER / DOCTOR'),
          providerDefault: 'All Providers',
          providerList: [
            'All Providers',
            'Dr. Julian Vance',
            'Dr. Michael Chang',
            'Dr. Sarah Wilson',
          ],
          recordTypeDefault: 'All Medical Types',
          recordTypeList: [
            'All Medical Types',
            'Laboratory Report',
            'Clinical Summary',
            'Immunization Card',
            'Hospital Record',
            'Diagnostic Radiology',
          ],
          syncHash: '#FED-98201-LIVE',
          infoSubbanner: t(
            'healthRecords.medical.info',
            'Showing comprehensive medical repository records, lab reports, inpatient summaries, and clinical encounters across federated health systems.'
          ),
          kpiCard1Title: t('healthRecords.medical.kpiTotal', 'Total Medical Records'),
          kpiCard2Subtitle: t('healthRecords.medical.kpiVerifiedSub', 'HIPAA & Clinical Compliance'),
          kpiCard3Subtitle: t('healthRecords.medical.kpiPendingSub', 'Awaiting OCR / clinical signoff'),
          iconClass: 'medical',
          activeNav: 'records-medical',
        };
    }
  }, [category, t]);

  // Options for Dropdowns derived strictly from the complete dataset of live records
  const patientOptions = useMemo(() => {
    const set = new Set<string>();
    allCategoryRecords.forEach((r) => {
      const name = resolvePatientName(r);
      if (name && name !== 'Unknown Patient') set.add(name);
    });
    return ['All Patients', ...Array.from(set).sort()];
  }, [allCategoryRecords]);

  const providerOptions = useMemo(() => {
    const set = new Set<string>();
    allCategoryRecords.forEach((r) => {
      if (r.provider && r.provider !== '—' && r.provider !== 'Attending Clinician') {
        set.add(r.provider);
      }
    });
    const defaultLabel = category === 'Dental' ? 'All Dentists' : category === 'Vision' ? 'All Eye Specialists' : 'All Providers';
    return [defaultLabel, ...Array.from(set).sort()];
  }, [allCategoryRecords, category]);

  const facilityOptions = useMemo(() => {
    const set = new Set<string>();
    allCategoryRecords.forEach((r) => {
      if (r.facility && r.facility !== '—') set.add(r.facility);
    });
    return ['All Facilities', ...Array.from(set).sort()];
  }, [allCategoryRecords]);

  const recordTypeOptions = useMemo(() => {
    const set = new Set<string>();
    allCategoryRecords.forEach((r) => {
      if (r.recordType && r.recordType !== '—') set.add(r.recordType);
      else if (r.title && r.title !== '—') set.add(r.title);
    });
    const defaultLabel = category === 'Dental' ? 'All Dental Types' : category === 'Vision' ? 'All Vision Types' : 'All Medical Types';
    return [defaultLabel, ...Array.from(set).sort()];
  }, [allCategoryRecords, category]);

  const statusOptions = useMemo(
    () => ['All Statuses', 'Verified', 'Pending Verification', 'Rejected'],
    []
  );

  const datePresets = [
    { label: 'All Dates', start: '', end: '' },
    { label: 'Last 7 Days', start: '2026-11-06', end: '2026-11-13' },
    { label: 'Last 30 Days', start: '2026-10-14', end: '2026-11-13' },
    { label: 'This Month (November 2026)', start: '2026-11-01', end: '2026-11-30' },
    { label: 'October 2026', start: '2026-10-01', end: '2026-10-31' },
    { label: 'Year to Date (2026)', start: '2026-01-01', end: '2026-12-31' },
  ];

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedPatient('All');
    setSelectedProvider('All');
    setSelectedFacility('All');
    setSelectedRecordType('All');
    setSelectedStatus('All');
    setDateRangeText('All Dates');
    setStartDate('');
    setEndDate('');
    setCustomStartDate('');
    setCustomEndDate('');
    setCurrentPage(1);
    setSearchParams({});
    showToast(t('healthRecords.toast.filtersReset', 'All filters reset to defaults.'));
  };

  // Export CSV Handler
  const handleExportCSV = async () => {
    setIsExporting(true);
    await new Promise((r) => setTimeout(r, 700));
    const header = 'Record ID,Title,Patient,Patient ID,Record Type,Provider,Facility,Date,Status\n';
    const rows = records
      .map(
        (r) =>
          `"${r.recordNumber}","${r.title}","${r.patientName}","${r.patientId}","${r.recordType}","${r.provider}","${r.facility}","${r.recordDate}","${r.status}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `careid_${category.toLowerCase()}_records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExporting(false);
    showToast(t('healthRecords.toast.exportSuccess', `Exported ${records.length} ${category} records to CSV.`));
  };

  // Status Change in Modal
  const handleStatusChange = async (newStatus: HealthRecordStatus) => {
    if (!selectedRecord) return;
    await updateStatusMutation.mutateAsync({
      recordId: selectedRecord.id,
      newStatus,
    });
    setSelectedRecord({ ...selectedRecord, status: newStatus });
    showToast(
      t('healthRecords.toast.statusUpdated', `Record ${selectedRecord.recordNumber} status updated to ${newStatus}.`)
    );
  };

  // Sync Trigger
  const handleManualSync = async () => {
    await syncMutation.mutateAsync();
    showToast(t('healthRecords.toast.syncSuccess', `Federated node ${categoryConfig.syncHash} synced successfully.`));
  };

  // Render category icon helper
  const renderCategoryIcon = (cat: HealthRecordCategory, size = 18) => {
    switch (cat) {
      case 'Medical':
        return <HeartPulse size={size} />;
      case 'Dental':
        return <Sparkles size={size} />;
      case 'Vision':
        return <Eye size={size} />;
    }
  };

  return (
    <div className="category-records-wrapper">
      {/* Mobile Drawer Backdrop */}
      {isDrawerOpen && (
        <div
          className={`careid-drawer-backdrop ${isDrawerOpen ? 'drawer-open show' : ''}`}
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* CareID Admin Shared Sidebar */}
      <AdminSidebar
        activeNav={categoryConfig.activeNav}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
        ctaLabel="New Record"
        onCtaClick={() => handleNav('/admin/records/upload')}
      />

      {/* Main Content Area */}
      <div className="careid-main-wrapper">
        {/* Shared CareID Admin Header */}
        <AdminHeader
          onOpenDrawer={() => setIsDrawerOpen(true)}
          searchValue={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          onNavigate={handleNav}
          showUploadRecord={true}
          onUploadRecord={() => handleNav('/admin/records/upload')}
        />

        {/* Main Scrollable Canvas */}
        <main ref={canvasRef} className="category-records-canvas" role="main">
          {/* 1. Header & Breadcrumbs Strip */}
        <section className="category-title-strip" aria-label="Page Title & Top Actions">
          <div className="category-heading-group">
            <nav className="category-breadcrumbs" aria-label="Breadcrumb">
              <span className="text-gray-500 font-medium">{t('nav.adminPortal', 'Admin Portal')}</span>
              <span className="text-gray-400">/</span>
              <button
                type="button"
                onClick={() => handleNav('/admin/records')}
                className="text-gray-500 font-medium hover:text-[#3f1d8b] hover:underline"
              >
                {t('dashboard.nav.healthRecords', 'Health Records')}
              </button>
              <span className="text-gray-400">/</span>
              <span className="text-[#3f1d8b] font-semibold">{categoryConfig.title}</span>
            </nav>

            <div className="category-title-row">
              <h1 className="category-heading-title">{categoryConfig.title}</h1>
              <span className="category-node-badge">
                <span className="category-node-badge-dot" />
                {categoryConfig.nodeBadge}
              </span>
            </div>

            <p className="category-heading-subtitle">{categoryConfig.subtitle}</p>
          </div>

          <div className="category-header-actions-col">
            <div className="category-live-status-pill">
              <span className="category-live-status-dot" />
              <span>{t('healthRecords.federatedStatus', 'Federated Repository: 3/3 Nodes Active')}</span>
            </div>

            <div className="category-header-buttons-row">
              <button
                type="button"
                className="btn-category-presets"
                onClick={() => setShowFilterPresets(true)}
              >
                <SlidersHorizontal size={15} />
                <span>{t('healthRecords.actions.filterPresets', 'Filter Presets')}</span>
              </button>

              <button
                type="button"
                className="btn-category-export"
                onClick={handleExportCSV}
                disabled={isExporting}
              >
                <Download size={15} />
                <span>{isExporting ? t('common.exporting', 'Exporting...') : t('healthRecords.actions.exportCsv', 'Export CSV')}</span>
              </button>

              <button
                type="button"
                className="btn-category-add"
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={16} />
                <span>{t('healthRecords.actions.addRecord', 'Add Record')}</span>
              </button>
            </div>
          </div>
        </section>

        {/* 2. Category Navigation Tabs Strip */}
        <section className="category-tabs-container" aria-label="Category Navigation">
          <div className="category-tabs-strip">
            <button
              type="button"
              className="category-tab-link"
              onClick={() => handleNav('/admin/records')}
            >
              <span>{t('healthRecords.tabs.all', 'All Records')}</span>
              <span className="category-tab-count-badge">
                {isLoading ? '...' : (recordsData?.totalAll ?? 0).toLocaleString()}
              </span>
            </button>

            <button
              type="button"
              className={`category-tab-link ${category === 'Medical' ? 'active' : ''}`}
              onClick={() => handleNav('/admin/records/medical')}
            >
              <HeartPulse size={15} />
              <span>{t('healthRecords.tabs.medical', 'Medical Records')}</span>
              <span className="category-tab-count-badge">
                {isLoading ? '...' : (recordsData?.totalMedical ?? 0).toLocaleString()}
              </span>
            </button>

            <button
              type="button"
              className={`category-tab-link ${category === 'Dental' ? 'active' : ''}`}
              onClick={() => handleNav('/admin/records/dental')}
            >
              <Sparkles size={15} />
              <span>{t('healthRecords.tabs.dental', 'Dental Records')}</span>
              <span className="category-tab-count-badge">
                {isLoading ? '...' : (recordsData?.totalDental ?? 0).toLocaleString()}
              </span>
            </button>

            <button
              type="button"
              className={`category-tab-link ${category === 'Vision' ? 'active' : ''}`}
              onClick={() => handleNav('/admin/records/vision')}
            >
              <Eye size={15} />
              <span>{t('healthRecords.tabs.vision', 'Vision Records')}</span>
              <span className="category-tab-count-badge">
                {isLoading ? '...' : (recordsData?.totalVision ?? 0).toLocaleString()}
              </span>
            </button>
          </div>

          <div className="category-info-subbanner">
            <AlertCircle size={16} className="text-[#3f1d8b] flex-shrink-0" />
            <span>{categoryConfig.infoSubbanner}</span>
          </div>
        </section>

        {/* 3. 4 KPI Summary Cards */}
        <section className="category-kpi-grid" aria-label="Category Key Performance Indicators">
          {/* Card 1: Total Records */}
          <div className="category-kpi-card">
            <div className="category-kpi-top">
              <h3 className="category-kpi-title">{categoryConfig.kpiCard1Title}</h3>
              <div className="category-kpi-icon-box purple">
                {renderCategoryIcon(category, 18)}
              </div>
            </div>
            <div className="category-kpi-bottom">
              <div className="category-kpi-value-row">
                <span className="category-kpi-number">{kpiData?.total?.toLocaleString() || '—'}</span>
                <span className="category-kpi-trend-pill positive">
                  <ArrowUpRight size={13} />
                  {kpiData?.totalTrend || '+5.0%'}
                </span>
              </div>
              <p className="category-kpi-subtitle">{kpiData?.totalSubtitle || 'vs last month'}</p>
            </div>
          </div>

          {/* Card 2: Verified */}
          <div className="category-kpi-card">
            <div className="category-kpi-top">
              <h3 className="category-kpi-title">{t('healthRecords.kpi.verified', 'Verified')}</h3>
              <div className="category-kpi-icon-box green">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="category-kpi-bottom">
              <div className="category-kpi-value-row">
                <span className="category-kpi-number">{kpiData?.verified?.toLocaleString() || '—'}</span>
                <span className="category-kpi-trend-pill positive">
                  {kpiData?.verifiedRate || '94%'}
                </span>
              </div>
              <p className="category-kpi-subtitle">{categoryConfig.kpiCard2Subtitle}</p>
            </div>
          </div>

          {/* Card 3: Pending Verification */}
          <div className="category-kpi-card">
            <div className="category-kpi-top">
              <h3 className="category-kpi-title">{t('healthRecords.kpi.pending', 'Pending Verification')}</h3>
              <div className="category-kpi-icon-box amber">
                <Clock size={18} />
              </div>
            </div>
            <div className="category-kpi-bottom">
              <div className="category-kpi-value-row">
                <span className="category-kpi-number">{kpiData?.pending?.toLocaleString() || '—'}</span>
                <span className="category-kpi-trend-pill action">
                  {kpiData?.pendingBadge || 'Requires Action'}
                </span>
              </div>
              <p className="category-kpi-subtitle">{categoryConfig.kpiCard3Subtitle}</p>
            </div>
          </div>

          {/* Card 4: Ingestion Pipeline / Processing */}
          <div className="category-kpi-card">
            <div className="category-kpi-top">
              <h3 className="category-kpi-title">{t('healthRecords.kpi.processing', 'Processing')}</h3>
              <div className="category-kpi-icon-box blue">
                <RefreshCw size={18} className="animate-spin-slow" />
              </div>
            </div>
            <div className="category-kpi-bottom">
              <div className="category-kpi-value-row">
                <span className="category-kpi-number">{kpiData?.processing?.toLocaleString() || '—'}</span>
                <span className="category-kpi-trend-pill queue">
                  {kpiData?.processingBadge || 'Active Queue'}
                </span>
              </div>
              <p className="category-kpi-subtitle">{kpiData?.processingSubtitle || 'Active pipeline ingestion'}</p>
            </div>
          </div>
        </section>

        {/* 4. Search and Compact Filters Bar */}
        <section className="category-filter-panel" aria-label="Search and Filters">
          {/* Top Search Line */}
          <div className="category-search-row">
            <div className="category-search-box">
              <Search size={18} className="absolute left-3 text-gray-400 pointer-events-none" />
              <input
                type="text"
                className="category-search-input"
                placeholder={categoryConfig.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              type="button"
              className="btn-category-reset"
              onClick={handleResetFilters}
            >
              <RotateCcw size={15} />
              <span>{t('healthRecords.actions.resetFilters', 'Reset Filters')}</span>
            </button>
          </div>

          {/* Compact Dropdown Filters Grid */}
          <div className="category-filters-row">
            {/* 1. Patient */}
            <div className="category-filter-item">
              <label className="category-filter-label" htmlFor="patient-select">
                {t('healthRecords.filters.patient', 'PATIENT')}
              </label>
              <select
                id="patient-select"
                className="category-select-control"
                value={selectedPatient}
                onChange={(e) => {
                  setSelectedPatient(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {patientOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Provider */}
            <div className="category-filter-item">
              <label className="category-filter-label" htmlFor="provider-select">
                {categoryConfig.providerLabel}
              </label>
              <select
                id="provider-select"
                className="category-select-control"
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {providerOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Facility */}
            <div className="category-filter-item">
              <label className="category-filter-label" htmlFor="facility-select">
                {t('healthRecords.filters.facility', 'FACILITY')}
              </label>
              <select
                id="facility-select"
                className="category-select-control"
                value={selectedFacility}
                onChange={(e) => {
                  setSelectedFacility(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {facilityOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Record Type */}
            <div className="category-filter-item">
              <label className="category-filter-label" htmlFor="record-type-select">
                {t('healthRecords.filters.recordType', 'RECORD TYPE')}
              </label>
              <select
                id="record-type-select"
                className="category-select-control"
                value={selectedRecordType}
                onChange={(e) => {
                  setSelectedRecordType(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {recordTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Status */}
            <div className="category-filter-item">
              <label className="category-filter-label" htmlFor="status-select">
                {t('healthRecords.filters.status', 'STATUS')}
              </label>
              <select
                id="status-select"
                className="category-select-control"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Date Range */}
            <div className="category-filter-item">
              <label className="category-filter-label">
                {t('healthRecords.filters.dateRange', 'DATE RANGE')}
              </label>
              <button
                type="button"
                className="category-date-button"
                onClick={() => setShowDatePicker(true)}
              >
                <span className="truncate">{dateRangeText}</span>
                <Calendar size={15} className="text-gray-500 flex-shrink-0" />
              </button>
            </div>
          </div>
        </section>

        {/* 5. 7/8-Column Clinical Records Table */}
        <section className="category-table-card" aria-label={`${category} Records Table`}>
          <div className="category-table-scroll">
            <table className="category-table">
              <thead>
                <tr>
                  <th scope="col" className="col-cat-record">{t('healthRecords.table.recordName', 'RECORD NAME & ID')}</th>
                  <th scope="col" className="col-cat-patient">{t('healthRecords.table.patient', 'PATIENT')}</th>
                  <th scope="col" className="col-cat-patient-id">{t('healthRecords.table.patientId', 'PATIENT ID')}</th>
                  <th scope="col" className="col-cat-type">{t('healthRecords.table.recordType', 'RECORD TYPE')}</th>
                  <th scope="col" className="col-cat-provider">{t('healthRecords.table.providerFacility', 'PROVIDER / FACILITY')}</th>
                  <th scope="col" className="col-cat-date">{t('healthRecords.table.recordDate', 'RECORD DATE')}</th>
                  <th scope="col" className="col-cat-status">{t('healthRecords.table.verificationStatus', 'VERIFICATION STATUS')}</th>
                  <th scope="col" className="col-cat-actions text-right">{t('healthRecords.table.actions', 'ACTIONS')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={24} className="animate-spin text-[#3f1d8b]" />
                        <span>{t('common.loading', 'Loading clinical records...')}</span>
                      </div>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <FileText size={36} className="text-gray-300" />
                        <span className="text-base font-semibold text-gray-700">
                          {t('healthRecords.empty.title', `No ${category} records found`)}
                        </span>
                        <p className="text-sm text-gray-500 max-w-sm">
                          {t('healthRecords.empty.subtitle', 'Try adjusting your search criteria, clear selected filters, or add a new record.')}
                        </p>
                        <button
                          type="button"
                          className="btn-category-reset mt-2"
                          onClick={handleResetFilters}
                        >
                          <RotateCcw size={14} />
                          <span>{t('healthRecords.actions.resetFilters', 'Reset Filters')}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((item) => (
                    <tr key={item.id}>
                      {/* 1. Record Name & ID with category icon */}
                      <td className="col-cat-record">
                        <div className="record-name-cluster">
                          <div className={`record-cat-icon-box ${categoryConfig.iconClass}`}>
                            {renderCategoryIcon(item.category, 18)}
                          </div>
                          <div className="record-name-texts">
                            <button
                              type="button"
                              className="record-title-link"
                              onClick={() => setSelectedRecord(item)}
                            >
                              {item.title}
                            </button>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="record-number-text">{item.recordNumber}</span>
                              {item.entityType === 'ATTACHMENT' ? (
                                <span className="badge-vault-attachment">Vault Attachment</span>
                              ) : (
                                <span className="badge-clinical-encounter">Clinical Encounter</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Patient */}
                      <td className="col-cat-patient">
                        <div className="patient-cluster">
                          <div
                            className="patient-avatar-circle"
                            style={{ backgroundColor: resolvePatientAvatarBg(item) }}
                          >
                            {resolvePatientInitials(item)}
                          </div>
                          <div className="patient-info-column">
                            <span className="patient-name-text">{resolvePatientName(item)}</span>
                            {item.isDependent && (
                              <span className="badge-dependent-tag">
                                {t('healthRecords.badges.dependent', 'DEPENDENT')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Patient ID */}
                      <td className="col-cat-patient-id patient-id-cell">{item.patientId || 'N/A'}</td>

                      {/* 4. Record Type */}
                      <td className="col-cat-type">
                        <span className="record-type-pill">
                          <span className="record-type-dot" />
                          {item.recordType}
                        </span>
                      </td>

                      {/* 5. Provider & Facility */}
                      <td className="col-cat-provider">
                        <div className="provider-cell-texts">
                          <span className="provider-name-text">{item.provider}</span>
                          <span className="facility-name-text">{item.facility}</span>
                        </div>
                      </td>

                      {/* 6. Record Date */}
                      <td className="col-cat-date text-gray-600 font-medium">{item.recordDate}</td>

                      {/* 7. Verification Status */}
                      <td className="col-cat-status">
                        {item.entityType === 'ATTACHMENT' || item.status === 'Uploaded Document' ? (
                          <span className="badge-verification-attachment">
                            <FileText size={13} strokeWidth={2.5} />
                            <span>{t('healthRecords.status.uploadedDocument', 'Uploaded Document')}</span>
                          </span>
                        ) : (
                          <>
                            {item.status === 'Verified' && (
                              <span className="badge-verification-verified">
                                <Check size={13} strokeWidth={2.5} />
                                <span>{t('healthRecords.status.verified', 'Verified')}</span>
                              </span>
                            )}
                            {item.status === 'Pending Verification' && (
                              <span className="badge-verification-pending">
                                <Clock size={13} strokeWidth={2.5} />
                                <span>{t('healthRecords.status.pending', 'Pending Verification')}</span>
                              </span>
                            )}
                            {item.status === 'Rejected' && (
                              <span className="badge-verification-rejected">
                                <XCircle size={13} strokeWidth={2.5} />
                                <span>{t('healthRecords.status.rejected', 'Rejected')}</span>
                              </span>
                            )}
                          </>
                        )}
                      </td>

                      {/* 8. Actions */}
                      <td className="col-cat-actions text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="btn-category-row-view"
                            onClick={() => setSelectedRecord(item)}
                          >
                            {t('common.view', 'View')}
                          </button>
                          {item.attachments?.[0]?.fileName && (
                            <button
                              type="button"
                              className="btn-category-row-download"
                              title="Download / Stream Original File"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  showToast(`Streaming ${item.title}...`);
                                  await downloadAttachmentFile(item.attachments![0].fileName, item.title);
                                } catch (err: any) {
                                  showToast(err?.message || 'Download failed');
                                }
                              }}
                            >
                              <Download size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 6. Pagination Bar */}
          <div className="category-pagination-bar">
            <span className="pagination-info-text">
              {t('healthRecords.pagination.showing', {
                start: total === 0 ? 0 : (currentPage - 1) * pageSize + 1,
                end: Math.min(currentPage * pageSize, total),
                total: total.toLocaleString(),
                defaultValue: `Showing ${total === 0 ? 0 : (currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, total)} of ${total.toLocaleString()} records`,
              })}
            </span>

            <div className="pagination-controls-row">
              <label htmlFor="page-size-select" className="text-xs text-gray-500 font-medium mr-1">
                {t('healthRecords.pagination.rows', 'Rows:')}
              </label>
              <select
                id="page-size-select"
                className="category-select-control !h-8 !py-0 !text-xs !w-20"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>

              <button
                type="button"
                className="pagination-page-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              {paginationRange.map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-500 font-bold">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${item}`}
                    type="button"
                    className={`pagination-page-btn ${currentPage === item ? 'active' : ''}`}
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
                className="pagination-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* 7. Bottom Federated Sync Banner */}
        <section className="category-sync-banner" aria-label="Federated Node Sync Status">
          <div className="category-sync-left">
            <span className="category-sync-pulsing-dot" />
            <div className="category-sync-text-group">
              <span className="category-sync-title">
                {t('healthRecords.syncBanner.title', {
                  hash: categoryConfig.syncHash,
                  defaultValue: `Live Federated Sync: Node ${categoryConfig.syncHash} is connected and operational.`,
                })}
              </span>
              <span className="category-sync-hash">
                {t('healthRecords.syncBanner.integrity', {
                  hash: categoryConfig.syncHash,
                  defaultValue: `Record Integrity Hash: ${categoryConfig.syncHash} • Cryptographically verified across 3 nodes.`,
                })}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn-category-manual-sync"
            onClick={handleManualSync}
            disabled={syncMutation.isPending}
          >
            <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} />
            <span>{syncMutation.isPending ? t('common.syncing', 'Syncing...') : t('healthRecords.actions.syncNow', 'Sync Now')}</span>
          </button>
        </section>
      </main>
      </div>

      {/* MODAL 1: Record Detail Inspection Modal */}
      {selectedRecord && (
        <div
          className="category-modal-backdrop"
          onClick={() => setSelectedRecord(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="category-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="category-modal-header">
              <div className="flex items-center gap-3">
                <div className={`record-cat-icon-box ${categoryConfig.iconClass}`}>
                  {renderCategoryIcon(selectedRecord.category, 20)}
                </div>
                <div>
                  <h3 className="category-modal-title">{selectedRecord.title}</h3>
                  <span className="text-xs text-gray-500 font-mono">{selectedRecord.recordNumber}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="category-modal-body">
              {/* Patient and Status Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#f8fafc] rounded-xl border border-gray-100">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Patient</span>
                  <span className="font-semibold text-sm text-[#0b1c30]">{resolvePatientName(selectedRecord)}</span>
                  <span className="text-xs text-gray-500 font-mono block">{selectedRecord.patientId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Provider</span>
                  <span className="font-semibold text-sm text-[#0b1c30]">{selectedRecord.provider}</span>
                  <span className="text-xs text-gray-500 block">{selectedRecord.facility}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Record Date</span>
                  <span className="font-semibold text-sm text-[#0b1c30]">{selectedRecord.recordDate}</span>
                  <span className="text-xs text-gray-500 block">{selectedRecord.documentType || 'Clinical Document'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Verification</span>
                  <span className="inline-block mt-1">
                    {selectedRecord.status === 'Verified' ? (
                      <span className="badge-verification-verified">
                        <Check size={12} /> Verified
                      </span>
                    ) : selectedRecord.status === 'Pending Verification' ? (
                      <span className="badge-verification-pending">
                        <Clock size={12} /> Pending Review
                      </span>
                    ) : (
                      <span className="badge-verification-rejected">
                        <XCircle size={12} /> Rejected
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* OCR Confidence Gauge */}
              {selectedRecord.ocrConfidence && (
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-[#3f1d8b]" />
                    <span className="text-sm font-semibold text-[#0b1c30]">CareID OCR Engine Confidence</span>
                  </div>
                  <span className="text-sm font-bold text-[#3f1d8b] bg-white px-3 py-1 rounded-full shadow-sm">
                    {selectedRecord.ocrConfidence}% Match
                  </span>
                </div>
              )}

              {/* Summary and Notes */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Clinical Summary</h4>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {selectedRecord.summary}
                </p>
              </div>

              {selectedRecord.clinicalNotes && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Extracted Diagnostic Notes
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100 font-mono text-xs">
                    {selectedRecord.clinicalNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="category-modal-footer">
              <button
                type="button"
                className="btn-category-modal-close"
                onClick={() => setSelectedRecord(null)}
              >
                Close
              </button>

              <button
                type="button"
                className="btn-category-modal-details"
                onClick={() => {
                  const targetId = selectedRecord.id;
                  setSelectedRecord(null);
                  navigate(`/admin/records/${targetId}`, { state: { from: location.pathname } });
                }}
              >
                <span>View Full Details & Audit Trail</span>
                <ArrowUpRight size={15} />
              </button>

              {selectedRecord.status !== 'Verified' && (
                <button
                  type="button"
                  className="btn-category-modal-verify"
                  onClick={() => handleStatusChange('Verified')}
                >
                  <Check size={15} />
                  <span>Verify Record</span>
                </button>
              )}

              {selectedRecord.status !== 'Rejected' && (
                <button
                  type="button"
                  className="btn-category-modal-reject"
                  onClick={() => handleStatusChange('Rejected')}
                >
                  <XCircle size={15} />
                  <span>Reject Record</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Filter Presets Modal */}
      {showFilterPresets && (
        <div
          className="category-modal-backdrop"
          onClick={() => setShowFilterPresets(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="category-modal-card !max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="category-modal-header">
              <h3 className="category-modal-title">Filter Presets</h3>
              <button
                type="button"
                onClick={() => setShowFilterPresets(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="category-modal-body">
              <p className="text-sm text-gray-600">
                Select a preset configuration to quickly filter {category.toLowerCase()} records:
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="p-3 text-left rounded-xl border border-gray-200 hover:border-[#3f1d8b] hover:bg-purple-50 transition-all flex items-center justify-between"
                  onClick={() => {
                    setSelectedStatus('Verified');
                    setShowFilterPresets(false);
                    showToast('Filter preset applied: Verified Records.');
                  }}
                >
                  <div>
                    <span className="font-semibold text-sm text-[#0b1c30] block">All Verified Records</span>
                    <span className="text-xs text-gray-500">Only records passing HIPAA / standard audit</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-400" />
                </button>

                <button
                  type="button"
                  className="p-3 text-left rounded-xl border border-gray-200 hover:border-[#3f1d8b] hover:bg-purple-50 transition-all flex items-center justify-between"
                  onClick={() => {
                    setSelectedStatus('Pending Verification');
                    setShowFilterPresets(false);
                    showToast('Filter preset applied: Awaiting Action / OCR.');
                  }}
                >
                  <div>
                    <span className="font-semibold text-sm text-[#0b1c30] block">Awaiting Action & OCR</span>
                    <span className="text-xs text-gray-500">Records queued for physician / specialist signoff</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-400" />
                </button>

                <button
                  type="button"
                  className="p-3 text-left rounded-xl border border-gray-200 hover:border-[#3f1d8b] hover:bg-purple-50 transition-all flex items-center justify-between"
                  onClick={() => {
                    setSelectedStatus('Rejected');
                    setShowFilterPresets(false);
                    showToast('Filter preset applied: Flagged / Rejected.');
                  }}
                >
                  <div>
                    <span className="font-semibold text-sm text-[#0b1c30] block">Flagged & Rejected</span>
                    <span className="text-xs text-gray-500">Discrepancy errors requiring re-authentication</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Date Range Picker Modal */}
      {showDatePicker && (
        <div
          className="category-modal-backdrop"
          onClick={() => setShowDatePicker(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="category-modal-card !max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="category-modal-header">
              <h3 className="category-modal-title">Select Date Range</h3>
              <button
                type="button"
                onClick={() => setShowDatePicker(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="category-modal-body">
              <div className="flex flex-col gap-2">
                {datePresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className={`p-3 text-left rounded-xl border transition-all flex items-center justify-between ${
                      dateRangeText === preset.label
                        ? 'border-[#3f1d8b] bg-purple-50 text-[#3f1d8b] font-semibold'
                        : 'border-gray-200 hover:border-gray-300 text-gray-800'
                    }`}
                    onClick={() => {
                      setDateRangeText(preset.label);
                      setStartDate(preset.start);
                      setEndDate(preset.end);
                      setCurrentPage(1);
                      setShowDatePicker(false);
                      showToast(`Date range set to ${preset.label}.`);
                    }}
                  >
                    <span className="text-sm">{preset.label}</span>
                    {dateRangeText === preset.label && <Check size={16} className="text-[#3f1d8b]" />}
                  </button>
                ))}
              </div>

              {/* Custom Date Range inputs */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Custom Date Range</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500 font-medium block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 font-medium block mb-1">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="w-full py-2 bg-[#3f1d8b] hover:bg-[#28006d] text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                  disabled={!customStartDate || !customEndDate}
                  onClick={() => {
                    if (customStartDate && customEndDate) {
                      setStartDate(customStartDate);
                      setEndDate(customEndDate);
                      setDateRangeText(`${customStartDate} - ${customEndDate}`);
                      setCurrentPage(1);
                      setShowDatePicker(false);
                      showToast(`Date range set to ${customStartDate} - ${customEndDate}.`);
                    }
                  }}
                >
                  Apply Custom Range
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: + Add Record Modal (Form with Zod) */}
      {showAddModal && (
        <div
          className="category-modal-backdrop"
          onClick={() => setShowAddModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="category-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="category-modal-header">
              <div className="flex items-center gap-2">
                <Plus size={20} className="text-[#3f1d8b]" />
                <h3 className="category-modal-title">Add {category} Record</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onAddRecordSubmit)}>
              <div className="category-modal-body">
                {/* Title */}
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                    Record Title *
                  </label>
                  <input
                    type="text"
                    {...register('title')}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#3f1d8b]"
                    placeholder="e.g. Full Panoramic OPG X-Ray"
                  />
                  {errors.title && <span className="text-xs text-rose-600 mt-1 block">{errors.title.message}</span>}
                </div>

                {/* Patient Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                      Patient Name *
                    </label>
                    <input
                      type="text"
                      {...register('patientName')}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#3f1d8b]"
                      placeholder="e.g. Sarah Jenkins"
                    />
                    {errors.patientName && (
                      <span className="text-xs text-rose-600 mt-1 block">{errors.patientName.message}</span>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                      Patient ID *
                    </label>
                    <input
                      type="text"
                      {...register('patientId')}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 font-mono focus:outline-none focus:border-[#3f1d8b]"
                      placeholder="CID-9205-1289"
                    />
                    {errors.patientId && (
                      <span className="text-xs text-rose-600 mt-1 block">{errors.patientId.message}</span>
                    )}
                  </div>
                </div>

                {/* Provider & Facility Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                      Attending Provider *
                    </label>
                    <input
                      type="text"
                      {...register('provider')}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#3f1d8b]"
                      placeholder="e.g. Dr. Aris Evans"
                    />
                    {errors.provider && (
                      <span className="text-xs text-rose-600 mt-1 block">{errors.provider.message}</span>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                      Facility *
                    </label>
                    <input
                      type="text"
                      {...register('facility')}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#3f1d8b]"
                      placeholder="e.g. Apex Dental Center"
                    />
                    {errors.facility && (
                      <span className="text-xs text-rose-600 mt-1 block">{errors.facility.message}</span>
                    )}
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                    Clinical Summary *
                  </label>
                  <textarea
                    rows={3}
                    {...register('summary')}
                    className="w-full p-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#3f1d8b]"
                    placeholder="Enter clinical encounter summary or diagnosis breakdown..."
                  />
                  {errors.summary && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.summary.message}</span>
                  )}
                </div>
              </div>

              <div className="category-modal-footer">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#28006d] text-white text-sm font-semibold hover:bg-[#39009c] flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Index Record</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          className="fixed bottom-6 right-6 z-50 bg-[#0b1c30] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-gray-700 animate-slide-up"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 size={18} className="text-[#56f5f8] flex-shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default AdminCategoryHealthRecords;
