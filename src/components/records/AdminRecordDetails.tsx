import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Search,
  Bell,
  Settings,
  HelpCircle,
  ArrowLeft,
  Download,
  ShieldCheck,
  Printer,
  Sparkles,
  Activity,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  SunMedium,
  Maximize2,
  ExternalLink,
  Lock,
  RefreshCw,
  Flag,
  CheckCircle2,
  Calendar,
  Clock,
  XCircle,
  FileText,
  AlertTriangle,
  Layers,
  Database,
  AlertCircle,
} from 'lucide-react';

import AdminSidebar from '../common/AdminSidebar';
import {
  useHealthRecordQuery,
  useRecordAuditTrailQuery,
  useRerunOcrMutation,
  useFlagRecordMutation,
  resolvePatientName,
  resolvePatientInitials,
  resolvePatientAvatarBg,
  type HealthRecordCategory,
} from '../../services/healthRecordService';
import './AdminRecordDetails.css';

export interface AdminRecordDetailsProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminRecordDetails: React.FC<AdminRecordDetailsProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ recordId: string }>();

  // Resolve recordId from route params or fallback to default record from Figma
  const recordId = params.recordId || 'rec-10491';

  // Navigation helper respecting onNavigate prop and location state
  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  // Mobile Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Viewer Interactive Controls State
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isInverted, setIsInverted] = useState<boolean>(false);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Queries
  const {
    data: record,
    isLoading: isRecordLoading,
    isError: isRecordError,
  } = useHealthRecordQuery(recordId);

  const {
    data: auditEvents = [],
    isLoading: isAuditLoading,
  } = useRecordAuditTrailQuery(recordId);

  // Mutations
  const rerunOcrMutation = useRerunOcrMutation();
  const flagRecordMutation = useFlagRecordMutation();

  // Determine effective category
  const recordCategory: HealthRecordCategory = record?.category || 'Dental';

  // Originating route back navigation logic
  const getBackPath = (): string => {
    if (location.state && typeof location.state === 'object' && 'from' in location.state) {
      const fromPath = (location.state as { from: string }).from;
      if (fromPath && typeof fromPath === 'string') return fromPath;
    }
    if (recordCategory === 'Dental') return '/admin/records/dental';
    if (recordCategory === 'Medical') return '/admin/records/medical';
    if (recordCategory === 'Vision') return '/admin/records/vision';
    return '/admin/records';
  };

  const backPath = getBackPath();

  const getBackLabel = (): string => {
    if (backPath === '/admin/records' || backPath.endsWith('/records')) return 'All Records';
    if (backPath.includes('medical')) return 'Medical Records';
    if (backPath.includes('dental')) return 'Dental Records';
    if (backPath.includes('vision')) return 'Vision Records';
    return 'Health Records';
  };

  const handleDownloadOriginal = () => {
    if (!record) return;
    const isDicom = record.category === 'Dental' || (record.documentType && record.documentType.includes('DICOM'));
    const ext = isDicom ? 'dcm' : 'pdf';
    const fileName = `${record.recordNumber.replace('#', '')}_${record.title.replace(/\s+/g, '_')}.${ext}`;
    
    // Trigger synthetic blob download
    const dummyContent = `CareID Clinical Export\nRecord: ${record.recordNumber}\nTitle: ${record.title}\nPatient: ${resolvePatientName(record)} (${record.patientId})\nFacility: ${record.facility}\nDate: ${record.recordDate}\nSummary: ${record.summary}\nNotes: ${record.clinicalNotes || 'None'}`;
    const blob = new Blob([dummyContent], { type: isDicom ? 'application/dicom' : 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(t('recordDetails.toasts.downloadStarted', { file: fileName, defaultValue: `Downloading original file: ${fileName}` }));
  };

  const handleAuditLogClick = () => {
    const el = document.getElementById('audit-timeline-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePrintSummary = () => {
    window.print();
  };

  const handleRerunOcr = () => {
    if (record) {
      rerunOcrMutation.mutate(record.id, {
        onSuccess: () => {
          showToast(t('recordDetails.toasts.ocrTriggered', 'OCR re-run queued with high-priority neural pipeline.'));
        },
      });
    }
  };

  const handleFlagClarification = () => {
    if (record) {
      const reason = `Clinical verification requires clarification for ${record.recordNumber}`;
      flagRecordMutation.mutate(
        { recordId: record.id, reason },
        {
          onSuccess: () => {
            showToast(t('recordDetails.toasts.recordFlagged', 'Record flagged for clinical clarification.'));
          },
        }
      );
    }
  };

  const handleExportAuditCsv = () => {
    if (!record || auditEvents.length === 0) {
      showToast('No audit events available to export.');
      return;
    }
    const header = 'Event ID,Action,Actor,Role,Timestamp,Status,Details,Hash\n';
    const rows = auditEvents
      .map(
        (e) =>
          `"${e.id}","${e.action}","${e.actor}","${e.actorRole || ''}","${e.timestamp}","${e.status}","${e.details || ''}","${e.hash || ''}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${record.recordNumber.replace('#', '')}_audit_trail.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(t('recordDetails.toasts.exportStarted', 'Audit trail exported to CSV.'));
  };

  if (isRecordLoading) {
    return (
      <div className="record-details-wrapper">
        <AdminSidebar
          activeNav="records"
          isDrawerOpen={isDrawerOpen}
          onCloseDrawer={() => setIsDrawerOpen(false)}
          onNavigate={handleNav}
          onLogout={onLogout}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#f8f9fb]">
          <RefreshCw size={36} className="text-[#28006d] animate-spin mb-4" />
          <h2 className="text-lg font-bold text-[#0b1c30]">
            {t('recordDetails.loading', 'Loading record details and audit trail...')}
          </h2>
        </div>
      </div>
    );
  }

  if (isRecordError || !record) {
    return (
      <div className="record-details-wrapper">
        <AdminSidebar
          activeNav="records"
          isDrawerOpen={isDrawerOpen}
          onCloseDrawer={() => setIsDrawerOpen(false)}
          onNavigate={handleNav}
          onLogout={onLogout}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#f8f9fb]">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-[#0b1c30] mb-2">
            {t('recordDetails.notFoundTitle', 'Record Not Found')}
          </h2>
          <p className="text-[#494552] text-sm max-w-md text-center mb-6">
            {t('recordDetails.notFoundDesc', 'The requested health record could not be found or has been archived.')}
          </p>
          <button
            type="button"
            className="px-5 py-2.5 bg-[#28006d] text-white rounded-full font-semibold text-sm hover:bg-[#3f1d8b] flex items-center gap-2"
            onClick={() => handleNav(backPath)}
          >
            <ArrowLeft size={16} />
            <span>{t('recordDetails.backToRecords', 'Back to Records')}</span>
          </button>
        </div>
      </div>
    );
  }

  const patientName = resolvePatientName(record);
  const patientInitials = resolvePatientInitials(record, patientName);
  const patientAvatarBg = resolvePatientAvatarBg(record, patientName);

  // Dynamic provider specialty text based on category
  const providerSpecialty =
    recordCategory === 'Dental'
      ? 'DDS, Oral Radiologist & Surgeon'
      : recordCategory === 'Vision'
      ? 'OD / MD, Clinical Ophthalmologist'
      : 'MD, Attending Physician';

  // Resolved cryptographic hash
  const recordHash =
    auditEvents[0]?.hash ||
    `0x8f4e${record.id.replace(/[^a-z0-9]/gi, '').slice(0, 8)}...39b`;

  return (
    <div className={`record-details-wrapper ${isFullscreen ? 'viewer-fullscreen' : ''}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#1e1b4b] text-white px-5 py-3 rounded-xl shadow-2xl border border-indigo-400/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 size={18} className="text-[#10b981]" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Shared CareID Sidebar */}
      <AdminSidebar
        activeNav={
          recordCategory === 'Medical'
            ? 'records-medical'
            : recordCategory === 'Dental'
            ? 'records-dental'
            : recordCategory === 'Vision'
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
              placeholder="Search records, patient ID, MRN, hash..."
              className="careid-header-search-input"
            />
            <span className="text-[10px] bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 font-mono text-gray-500 mr-2 hidden sm:inline-block">
              ⌘K
            </span>
          </div>

          <div className="careid-header-right">
            <div className="hidden lg:flex items-center gap-2 text-xs text-[#494552] font-medium mr-2">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span>Environment: Production Vault US-East</span>
            </div>

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
              <div className="w-8 h-8 rounded-full bg-[#e8ddff] text-[#28006d] flex items-center justify-center font-bold text-xs ring-2 ring-[#28006d]/20">
                EV
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-[#191c1e] leading-tight">Dr. Evelyn Vance</span>
                <span className="text-[11px] font-medium text-[#7a7583] leading-tight">Chief Record Officer</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Canvas */}
        <main className="record-details-canvas" role="main">
          {/* Breadcrumb & Top Action Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#494552]">
              <button
                type="button"
                onClick={() => handleNav('/admin/dashboard')}
                className="hover:text-[#28006d] transition-colors"
              >
                Admin Portal
              </button>
              <span className="text-[#cbc4d4]">›</span>
              <button
                type="button"
                onClick={() => handleNav('/admin/records')}
                className="hover:text-[#28006d] transition-colors"
              >
                Health Records
              </button>
              <span className="text-[#cbc4d4]">›</span>
              <button
                type="button"
                onClick={() => handleNav(backPath)}
                className="hover:text-[#28006d] transition-colors"
              >
                {recordCategory}
              </button>
              <span className="text-[#cbc4d4]">›</span>
              <span className="text-[#28006d] font-bold">Record Detail</span>
            </div>

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191c1e] tracking-tight">
                    {t('recordDetails.title', 'Health Record Detail')}
                  </h1>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#e8ddff] text-[#28006d] border border-[#d0bcff]">
                    {t('recordDetails.schemaBadge', 'Shared Care ID Schema v2.4')}
                  </span>
                </div>
                <p className="text-sm text-[#494552]">
                  {t(
                    'recordDetails.subtitle',
                    'Unified clinical inspection, document preview, and verification audit for patient health records.'
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleNav(backPath)}
                  className="btn-details-back"
                >
                  <ArrowLeft size={14} />
                  <span>Back to {getBackLabel()}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadOriginal}
                  className="btn-details-download"
                >
                  <Download size={14} />
                  <span>{t('recordDetails.downloadOriginal', 'Download Original File')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAuditLogClick}
                  className="btn-details-audit"
                >
                  <ShieldCheck size={14} className="text-[#006a60]" />
                  <span>{t('recordDetails.auditLog', 'Audit Log')}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintSummary}
                  className="btn-details-print"
                >
                  <Printer size={14} />
                  <span>{t('recordDetails.printExport', 'Print / Export Summary')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Discipline Lens Switcher Strip */}
          <div className="discipline-lens-strip">
            <div className="discipline-lens-group">
              <span className="discipline-lens-label">{t('recordDetails.disciplineLens', 'DISCIPLINE LENS:')}</span>
              <div className="discipline-pill-container">
                <button
                  type="button"
                  className="discipline-pill-btn"
                  onClick={() => handleNav('/admin/records')}
                >
                  <span>{t('recordDetails.allRecords', 'All Records')}</span>
                </button>
                <button
                  type="button"
                  className={`discipline-pill-btn ${recordCategory === 'Medical' ? 'active-medical active' : ''}`}
                  onClick={() => handleNav('/admin/records/medical')}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#28006d]" />
                  <span>{t('recordDetails.medical', 'Medical')}</span>
                </button>
                <button
                  type="button"
                  className={`discipline-pill-btn ${recordCategory === 'Dental' ? 'active' : ''}`}
                  onClick={() => handleNav('/admin/records/dental')}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span>{t('recordDetails.dentalActive', 'Dental (Active)')}</span>
                </button>
                <button
                  type="button"
                  className={`discipline-pill-btn ${recordCategory === 'Vision' ? 'active-vision active' : ''}`}
                  onClick={() => handleNav('/admin/records/vision')}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00629e]" />
                  <span>{t('recordDetails.vision', 'Vision')}</span>
                </button>
              </div>
            </div>

            <div className="discipline-context-callout">
              <Sparkles size={14} />
              <span>
                Currently viewing: {recordCategory} Record • {record.recordNumber}. Switch category preview to inspect Medical, Dental, or Vision records.
              </span>
            </div>
          </div>

          {/* Record Identity & Master Info Header Card */}
          <div className="record-master-card">
            <div className="record-master-top">
              {/* Left: Patient Avatar & Demographics */}
              <div className="record-patient-nexus">
                <div
                  className="record-patient-avatar"
                  style={{ backgroundColor: patientAvatarBg }}
                >
                  {patientInitials}
                </div>

                <div className="record-patient-meta">
                  <div className="record-patient-header-row">
                    <h2 className="record-patient-name">{patientName}</h2>

                    {/* Category Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        recordCategory === 'Medical'
                          ? 'bg-[#e8ddff] text-[#28006d]'
                          : recordCategory === 'Dental'
                          ? 'bg-[#ccfbf1] text-[#0f766e]'
                          : 'bg-[#e0f2fe] text-[#0369a1]'
                      }`}
                    >
                      {recordCategory === 'Dental' && <Sparkles size={12} />}
                      {recordCategory === 'Medical' && <Activity size={12} />}
                      {recordCategory === 'Vision' && <Eye size={12} />}
                      <span>{recordCategory}</span>
                    </span>

                    {/* Verification Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        record.status === 'Verified'
                          ? 'bg-[#d1fae5] text-[#065f46]'
                          : record.status === 'Pending Verification'
                          ? 'bg-[#fef3c7] text-[#92400e]'
                          : 'bg-[#fee2e2] text-[#991b1b]'
                      }`}
                    >
                      {record.status === 'Verified' && <CheckCircle2 size={12} />}
                      {record.status === 'Pending Verification' && <Clock size={12} />}
                      {record.status === 'Rejected' && <XCircle size={12} />}
                      <span>{record.status}</span>
                    </span>

                    {/* Record ID Pill */}
                    <span className="text-xs font-mono font-bold text-[#494552] bg-[#f2f4f6] px-2.5 py-0.5 rounded-md border border-[#cbc4d4]">
                      ID: {record.recordNumber}
                    </span>
                  </div>

                  <div className="text-xs text-[#494552] flex items-center gap-2 flex-wrap">
                    <span>
                      <strong className="text-[#191c1e]">Care ID:</strong>{' '}
                      <span className="font-mono font-bold text-[#28006d]">{record.patientId}</span>
                    </span>
                    <span className="text-[#cbc4d4]">•</span>
                    <span>
                      <strong className="text-[#191c1e]">Record Title:</strong> {record.title}
                    </span>
                    <span className="text-[#cbc4d4]">•</span>
                    <span>
                      <strong className="text-[#191c1e]">Clinical Type:</strong> {record.recordType}
                    </span>
                    {record.isDependent && (
                      <>
                        <span className="text-[#cbc4d4]">•</span>
                        <span className="badge-dependent-tag">Dependent</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Provider & Facility Metadata Cards */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-[#f8f9fb] border border-[#cbc4d4] rounded-xl p-3 min-w-[150px]">
                  <span className="text-[10px] font-bold text-[#7a7583] tracking-wider uppercase block">
                    {t('recordDetails.healthcareProvider', 'HEALTHCARE PROVIDER')}
                  </span>
                  <div className="font-bold text-sm text-[#191c1e] mt-0.5">{record.provider}</div>
                  <div className="text-xs text-[#7a7583]">{providerSpecialty}</div>
                </div>

                <div className="bg-[#f8f9fb] border border-[#cbc4d4] rounded-xl p-3 min-w-[150px]">
                  <span className="text-[10px] font-bold text-[#7a7583] tracking-wider uppercase block">
                    {t('recordDetails.facilityLocation', 'FACILITY LOCATION')}
                  </span>
                  <div className="font-bold text-sm text-[#191c1e] mt-0.5">{record.facility}</div>
                  <div className="text-xs text-[#7a7583]">Federated Clinical Node</div>
                </div>
              </div>
            </div>

            {/* Bottom Timestamps & Ledger Route Bar */}
            <div className="flex items-center justify-between gap-4 text-xs text-[#494552] flex-wrap">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#7a7583]" />
                  <span>
                    Record Date: <strong className="text-[#191c1e]">{record.recordDate}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-[#7a7583]" />
                  <span>
                    Indexed: <strong className="text-[#191c1e]">{record.recordDate} 09:14 AM</strong>
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ecfdf5] text-[#065f46] font-semibold border border-[#a7f3d0]">
                  <ShieldCheck size={13} className="text-[#059669]" />
                  <span>{t('recordDetails.hipaaLedger', 'HIPAA Audit Ledger Confirmed')}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#7a7583]">
                <span>Administrative Route:</span>
                <span className="bg-[#f2f4f6] px-2 py-0.5 rounded text-[#28006d] font-bold border border-[#cbc4d4]">
                  /vault/records/{recordCategory.toLowerCase()}/2026/{record.recordNumber.replace(/[^0-9]/g, '') || record.id}
                </span>
              </div>
            </div>
          </div>

          {/* Main 2-Column Split Grid */}
          <div className="record-details-grid">
            {/* Left 7 Columns: Document & Imaging Inspection Viewer + Clinical Summary */}
            <div className="flex flex-col gap-6">
              {/* Card 1: High-Fidelity Document & Imaging Inspection Viewer */}
              <div className="dicom-viewer-card">
                {/* Viewer Toolbar */}
                <div className="dicom-viewer-toolbar">
                  <div className="flex items-center gap-2.5">
                    <Layers size={18} className="text-[#28006d]" />
                    <h3 className="font-bold text-sm text-[#191c1e]">
                      {record.recordType} Preview
                    </h3>
                    <span className="text-[10px] font-mono font-bold bg-[#f2f4f6] text-[#494552] px-2 py-0.5 rounded border border-[#cbc4d4]">
                      {record.documentType || (recordCategory === 'Dental' ? 'DICOM 3.0' : 'Clinical PDF')}
                    </span>
                  </div>

                  {/* Viewport Controls */}
                  <div className="flex items-center gap-1 bg-[#f8f9fb] border border-[#cbc4d4] rounded-lg p-1">
                    <button
                      type="button"
                      title={t('recordDetails.zoomOut', 'Zoom Out')}
                      className="p-1 text-[#494552] hover:text-[#28006d] hover:bg-white rounded transition-colors"
                      onClick={() => setZoomLevel((z) => Math.max(50, z - 20))}
                    >
                      <ZoomOut size={15} />
                    </button>
                    <span className="font-mono text-xs font-bold px-2 text-[#191c1e] min-w-[45px] text-center">
                      {zoomLevel}%
                    </span>
                    <button
                      type="button"
                      title={t('recordDetails.zoomIn', 'Zoom In')}
                      className="p-1 text-[#494552] hover:text-[#28006d] hover:bg-white rounded transition-colors"
                      onClick={() => setZoomLevel((z) => Math.min(250, z + 20))}
                    >
                      <ZoomIn size={15} />
                    </button>

                    <div className="w-px h-4 bg-[#cbc4d4] mx-1" />

                    <button
                      type="button"
                      title={t('recordDetails.rotateCcw', 'Rotate Counter-Clockwise')}
                      className="p-1 text-[#494552] hover:text-[#28006d] hover:bg-white rounded transition-colors"
                      onClick={() => setRotation((r) => r - 90)}
                    >
                      <RotateCcw size={15} />
                    </button>
                    <button
                      type="button"
                      title={t('recordDetails.rotateCw', 'Rotate Clockwise')}
                      className="p-1 text-[#494552] hover:text-[#28006d] hover:bg-white rounded transition-colors"
                      onClick={() => setRotation((r) => r + 90)}
                    >
                      <RotateCw size={15} />
                    </button>
                    <button
                      type="button"
                      title={t('recordDetails.contrast', 'Toggle Contrast / Invert')}
                      className={`p-1 rounded transition-colors ${
                        isInverted ? 'bg-[#28006d] text-white' : 'text-[#494552] hover:text-[#28006d] hover:bg-white'
                      }`}
                      onClick={() => setIsInverted(!isInverted)}
                    >
                      <SunMedium size={15} />
                    </button>
                    <button
                      type="button"
                      title={t('recordDetails.fullscreen', 'Toggle Fullscreen')}
                      className={`p-1 rounded transition-colors ${
                        isFullscreen ? 'bg-[#28006d] text-white' : 'text-[#494552] hover:text-[#28006d] hover:bg-white'
                      }`}
                      onClick={() => setIsFullscreen(!isFullscreen)}
                    >
                      <Maximize2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Canvas / Imaging Surface */}
                <div className="dicom-canvas-surface">
                  <div
                    className="w-full h-full min-h-[440px] flex items-center justify-center p-6 relative overflow-hidden transition-all duration-200"
                    style={{
                      transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                      filter: isInverted ? 'invert(1) hue-rotate(180deg)' : 'none',
                    }}
                  >
                    {/* Category-Specific Preview Surface */}
                    {recordCategory === 'Dental' && (
                      <div className="w-full max-w-[500px] h-[340px] rounded-xl bg-gradient-to-b from-[#1a2332] via-[#0d1624] to-[#080d16] border border-cyan-500/30 shadow-2xl relative flex items-center justify-center overflow-hidden">
                        {/* Grid overlay */}
                        <div
                          className="absolute inset-0 opacity-15"
                          style={{
                            backgroundImage:
                              'linear-gradient(to right, #00b4d8 1px, transparent 1px), linear-gradient(to bottom, #00b4d8 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                          }}
                        />

                        {/* Dental Arch Radiograph Outline */}
                        <svg
                          viewBox="0 0 400 240"
                          className="w-full h-full opacity-80"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M40,190 C70,60 330,60 360,190"
                            stroke="#38bdf8"
                            strokeWidth="12"
                            strokeLinecap="round"
                            opacity="0.4"
                          />
                          <path
                            d="M70,160 C100,80 300,80 330,160"
                            stroke="#94a3b8"
                            strokeWidth="8"
                            strokeLinecap="round"
                            opacity="0.6"
                          />
                          {Array.from({ length: 14 }).map((_, i) => {
                            const angle = Math.PI * 0.15 + (i * Math.PI * 0.7) / 13;
                            const cx = 200 - Math.cos(angle) * 130;
                            const cy = 200 - Math.sin(angle) * 110;
                            return (
                              <rect
                                key={i}
                                x={cx - 7}
                                y={cy - 12}
                                width="14"
                                height="24"
                                rx="3"
                                fill="#f8fafc"
                                opacity={i === 5 || i === 8 ? 0.95 : 0.65}
                                stroke="#0284c7"
                                strokeWidth="1.5"
                              />
                            );
                          })}
                        </svg>

                        {/* Diagnostic ROI Annotation Markers */}
                        {showAnnotations && (
                          <>
                            <div
                              className="dicom-roi-annotation"
                              style={{ width: '70px', height: '48px', left: '26%', top: '48%' }}
                              onClick={() => showToast('Annotated Region: Tooth #18 Composite Restoration')}
                            >
                              <span className="dicom-roi-label">#18 Restoration [Verified]</span>
                            </div>
                            <div
                              className="dicom-roi-annotation"
                              style={{ width: '64px', height: '48px', left: '60%', top: '48%' }}
                              onClick={() => showToast('Annotated Region: Tooth #19 Composite Restoration')}
                            >
                              <span className="dicom-roi-label">#19 Restoration [Verified]</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {recordCategory === 'Medical' && (
                      <div className="w-full max-w-[500px] h-[340px] rounded-xl bg-white border border-[#cbd5e1] shadow-2xl relative flex flex-col p-5 overflow-hidden text-left">
                        {/* Clinical Document Header */}
                        <div className="border-b border-[#e2e8f0] pb-2 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-[#64748b] tracking-wider uppercase block">
                              CAREID CLINICAL DIAGNOSTIC REPORT
                            </span>
                            <span className="text-xs font-bold text-[#0b1c30]">{record.title}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold bg-[#eff6ff] text-[#1d4ed8] px-2 py-0.5 rounded border border-[#bfdbfe]">
                            EHR / FHIR Verified
                          </span>
                        </div>

                        {/* Demographics row */}
                        <div className="grid grid-cols-2 gap-2 my-2 py-1 bg-[#f8fafc] rounded p-2 text-[11px]">
                          <div>
                            <span className="text-[#64748b]">Patient:</span> <strong>{patientName}</strong>
                          </div>
                          <div>
                            <span className="text-[#64748b]">MRN:</span> <strong className="font-mono">{record.patientId}</strong>
                          </div>
                          <div>
                            <span className="text-[#64748b]">Provider:</span> <strong>{record.provider}</strong>
                          </div>
                          <div>
                            <span className="text-[#64748b]">Date:</span> <strong>{record.recordDate}</strong>
                          </div>
                        </div>

                        {/* Clinical findings preview */}
                        <div className="flex-1 overflow-hidden flex flex-col justify-center">
                          <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider block mb-1">
                            DIAGNOSTIC FINDINGS & OBSERVATIONS:
                          </span>
                          <p className="text-xs text-[#334155] leading-relaxed line-clamp-3 bg-[#f1f5f9] p-2 rounded border border-[#e2e8f0]">
                            {record.clinicalNotes || record.summary}
                          </p>
                        </div>

                        {/* Signoff seal */}
                        <div className="mt-2 pt-2 border-t border-[#e2e8f0] flex items-center justify-between text-[10px] text-[#64748b]">
                          <span>Attending: <strong>{record.provider}</strong></span>
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 size={12} /> Electronically Authenticated
                          </span>
                        </div>
                      </div>
                    )}

                    {recordCategory === 'Vision' && (
                      <div className="w-full max-w-[500px] h-[340px] rounded-xl bg-gradient-to-b from-[#0f172a] via-[#020617] to-[#0b1120] border border-blue-500/30 shadow-2xl relative flex items-center justify-center overflow-hidden">
                        {/* Grid overlay */}
                        <div
                          className="absolute inset-0 opacity-15"
                          style={{
                            backgroundImage:
                              'linear-gradient(to right, #0284c7 1px, transparent 1px), linear-gradient(to bottom, #0284c7 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                          }}
                        />

                        {/* Retinal Fundus & OCT Scan Visualization */}
                        <svg viewBox="0 0 400 240" className="w-full h-full opacity-85" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {/* Optic Disc */}
                          <circle cx="150" cy="120" r="42" fill="#fdba74" opacity="0.4" stroke="#fb923c" strokeWidth="2" />
                          <circle cx="150" cy="120" r="22" fill="#ffedd5" opacity="0.6" />
                          {/* Macula */}
                          <circle cx="260" cy="120" r="16" fill="#f87171" opacity="0.3" stroke="#ef4444" strokeWidth="1.5" />
                          {/* Retinal Vasculature */}
                          <path d="M150,120 Q180,80 230,60 Q270,50 320,55" stroke="#ef4444" strokeWidth="3" opacity="0.75" />
                          <path d="M150,120 Q190,160 250,180 Q290,190 330,175" stroke="#ef4444" strokeWidth="3" opacity="0.75" />
                          <path d="M150,120 Q120,70 80,60" stroke="#3b82f6" strokeWidth="2.5" opacity="0.75" />
                          <path d="M150,120 Q110,160 70,175" stroke="#3b82f6" strokeWidth="2.5" opacity="0.75" />
                        </svg>

                        {showAnnotations && (
                          <div
                            className="dicom-roi-annotation"
                            style={{ width: '80px', height: '44px', left: '56%', top: '44%' }}
                            onClick={() => showToast('Annotated Region: Fovea & Macula Center')}
                          >
                            <span className="dicom-roi-label">Macula [Normal]</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* HUD Overlay Top-Left */}
                  <div className="dicom-hud-watermark">
                    <p className="font-bold text-emerald-400">CARE ID CLINICAL INSPECTION VIEWER</p>
                    <p>PATIENT: {patientName.toUpperCase()}</p>
                    <p>MRN: #{record.patientId}</p>
                    <p>STUDY: {record.title.toUpperCase()}</p>
                  </div>

                  {/* HUD Overlay Top-Right */}
                  <div className="dicom-hud-facility">
                    <p className="font-bold text-sky-400">SHA-256 VERIFIED SEAL</p>
                    <p>{record.facility.toUpperCase()}</p>
                    <p>RAD/PROV: {record.provider.toUpperCase()}</p>
                    <p>DATE: {record.recordDate} 09:14 UTC</p>
                  </div>

                  {/* Calibration Scale Ruler */}
                  <div className="dicom-calibration-scale">
                    <div className="flex items-center gap-2">
                      <span className="scale-ruler-bar" />
                      <span>Scale: 10 mm</span>
                    </div>
                    <span>Render Pipeline: Care ID Direct-WebGL v2.8</span>
                    <span className="text-emerald-400">Status: Unaltered Bitstream Archive</span>
                  </div>
                </div>

                {/* Bottom Viewer Actions */}
                <div className="p-4 bg-white border-t border-[#e2e8f0] flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => showToast(`Opening high-resolution viewport for ${record.recordNumber}...`)}
                      className="px-3.5 py-1.5 rounded-lg border border-[#cbc4d4] bg-white text-xs font-semibold text-[#191c1e] hover:bg-[#f2f4f6] flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <ExternalLink size={13} />
                      <span>{t('recordDetails.openHighRes', 'Open High-Res Viewport')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAnnotations(!showAnnotations)}
                      className="px-3.5 py-1.5 rounded-lg border border-[#cbc4d4] bg-white text-xs font-semibold text-[#191c1e] hover:bg-[#f2f4f6] flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Eye size={13} />
                      <span>
                        {showAnnotations ? 'Hide Annotations' : 'Show Annotations'}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-[#059669] font-medium">
                    <Lock size={13} />
                    <span>{t('recordDetails.zeroKnowledge', 'Zero-Knowledge Encrypted In-Transit')}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Clinical Encounter Summary & Diagnostic Notes */}
              <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-xs flex flex-col gap-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-[#edf0f4]">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-[#28006d]" />
                    <h3 className="font-bold text-sm text-[#191c1e]">
                      Clinical Encounter Summary & Findings
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-[#00696b] bg-[#effbfb] px-2.5 py-0.5 rounded-full border border-[#ccfbf1]">
                    Verified Clinical Ingress
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[#7a7583] uppercase tracking-wider block mb-1">
                    ENCOUNTER SUMMARY
                  </span>
                  <p className="text-sm text-[#494552] leading-relaxed bg-[#f8f9fb] p-3 rounded-xl border border-[#e2e8f0]">
                    {record.summary || 'Clinical encounter recorded into CareID federated health records system.'}
                  </p>
                </div>

                {record.clinicalNotes ? (
                  <div className="mt-1">
                    <span className="text-[10px] font-bold text-[#7a7583] uppercase tracking-wider block mb-1">
                      EXTRACTED DIAGNOSTIC NOTES & ANATOMICAL MARKERS
                    </span>
                    <div className="p-3 bg-[#f8f9fb] border border-[#e2e8f0] rounded-xl font-mono text-xs text-[#0b1c30] leading-relaxed whitespace-pre-wrap">
                      {record.clinicalNotes}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[#7a7583] italic">
                    No extracted diagnostic notes recorded for this payload.
                  </div>
                )}
              </div>

              {/* Card 3: Multi-Discipline Schema Standardization Card */}
              <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#edf0f4] flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Database size={18} className="text-[#28006d]" />
                    <h4 className="font-bold text-sm text-[#191c1e]">
                      {t('recordDetails.standardizationTitle', 'Unified Multi-Discipline Schema Standardization')}
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold bg-[#f3e8ff] text-[#7e22ce] px-2.5 py-0.5 rounded-full border border-[#e9d5ff]">
                    {t('recordDetails.harmonizerBadge', 'Care ID Harmonizer')}
                  </span>
                </div>

                <p className="text-xs text-[#494552] leading-relaxed">
                  Care ID’s unified architecture dynamically maps Medical, Dental, and Vision clinical payloads into the same standardized verification layout without schema friction or duplicate user flows:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Medical */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      recordCategory === 'Medical'
                        ? 'border-[#28006d] bg-[#f5f3ff] shadow-xs ring-1 ring-[#28006d]/20'
                        : 'border-[#e2e8f0] bg-[#f8f9fb]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Activity size={14} className="text-[#28006d]" />
                      <span className="font-bold text-xs text-[#191c1e]">
                        Medical Payloads {recordCategory === 'Medical' ? '(Active)' : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#494552] leading-normal">
                      Blood Chemistry Panels, Lipid Profiles, EHR CDA/FHIR extracts, Cardiology ECG sweeps.
                    </p>
                  </div>

                  {/* Dental */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      recordCategory === 'Dental'
                        ? 'border-[#006a60] bg-[#f0fdfa] shadow-xs ring-1 ring-[#006a60]/20'
                        : 'border-[#e2e8f0] bg-[#f8f9fb]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Sparkles size={14} className="text-[#006a60]" />
                      <span className="font-bold text-xs text-[#006a60]">
                        Dental Payloads {recordCategory === 'Dental' ? '(Active)' : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#494552] leading-normal">
                      Orthopantomograms (OPG), Bitewing radiographs, 3D CBCT models, Periodontal charts.
                    </p>
                  </div>

                  {/* Vision */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      recordCategory === 'Vision'
                        ? 'border-[#00629e] bg-[#f0f9ff] shadow-xs ring-1 ring-[#00629e]/20'
                        : 'border-[#e2e8f0] bg-[#f8f9fb]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Eye size={14} className="text-[#00629e]" />
                      <span className="font-bold text-xs text-[#191c1e]">
                        Vision Payloads {recordCategory === 'Vision' ? '(Active)' : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#494552] leading-normal">
                      Optical Coherence Tomography (OCT), Fundus Auto-fluorescence, Visual Field Perimetry.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 4: Administrative Authority Boundary & Pure Route Actions */}
              <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 max-w-md">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-[#28006d] flex items-center justify-center shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-[#191c1e]">
                      {t('recordDetails.authorityBoundary', 'Administrative Authority Boundary')}
                    </h5>
                    <p className="text-[11px] text-[#7a7583] mt-0.5 leading-normal">
                      {t(
                        'recordDetails.authorityDesc',
                        'Pure administrative inspection & verification routing. No medical alterations or diagnosis generation permitted.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleRerunOcr}
                    disabled={rerunOcrMutation.isPending}
                    className="btn-details-rerun disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={rerunOcrMutation.isPending ? 'animate-spin' : ''} />
                    <span>{rerunOcrMutation.isPending ? 'Re-running...' : t('recordDetails.rerunOcr', 'Re-run OCR')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFlagClarification}
                    disabled={flagRecordMutation.isPending}
                    className="btn-details-flag disabled:opacity-50"
                  >
                    <Flag size={13} />
                    <span>{flagRecordMutation.isPending ? 'Flagging...' : t('recordDetails.flagClarification', 'Flag for Clarification')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Record Metadata, OCR Validation, and Immutable Audit Timeline */}
            <div className="flex flex-col gap-6">
              {/* Card 1: Record Metadata Panel */}
              <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#edf0f4]">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-[#28006d]" />
                    <h3 className="font-bold text-sm text-[#191c1e]">
                      {t('recordDetails.metadataTitle', 'Record Metadata')}
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#ecfdf5] text-[#065f46] px-2 py-0.5 rounded-md border border-[#a7f3d0]">
                    <CheckCircle2 size={11} />
                    <span>{t('recordDetails.complianceBadge', 'ADA & HIPAA Compliant')}</span>
                  </span>
                </div>

                {/* 2x2 Metadata Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#f8f9fb] border border-[#e2e8f0] rounded-xl p-3">
                    <span className="text-[10px] font-bold text-[#7a7583] tracking-wider uppercase block">
                      {t('recordDetails.modality', 'CLINICAL MODALITY')}
                    </span>
                    <span className="text-xs font-bold text-[#191c1e] mt-1 block">
                      {record.recordType}
                    </span>
                  </div>

                  <div className="bg-[#f8f9fb] border border-[#e2e8f0] rounded-xl p-3">
                    <span className="text-[10px] font-bold text-[#7a7583] tracking-wider uppercase block">
                      {t('recordDetails.categoryLens', 'CATEGORY LENS')}
                    </span>
                    <span className="text-xs font-bold text-[#006a60] mt-1 flex items-center gap-1">
                      <Sparkles size={11} />
                      <span>{recordCategory} Discipline</span>
                    </span>
                  </div>

                  <div className="bg-[#f8f9fb] border border-[#e2e8f0] rounded-xl p-3">
                    <span className="text-[10px] font-bold text-[#7a7583] tracking-wider uppercase block">
                      {t('recordDetails.formatSize', 'FILE FORMAT & SIZE')}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#191c1e] mt-1 block">
                      {record.documentType || 'Clinical Document'} • {record.fileSize || '3.4 MB'}
                    </span>
                  </div>

                  <div className="bg-[#f8f9fb] border border-[#e2e8f0] rounded-xl p-3">
                    <span className="text-[10px] font-bold text-[#7a7583] tracking-wider uppercase block">
                      {t('recordDetails.resolution', 'RESOLUTION')}
                    </span>
                    <span className="text-xs font-bold text-[#191c1e] mt-1 block">300 DPI (High-Def Archive)</span>
                  </div>
                </div>

                {/* Technical Cryptographic Details */}
                <div className="bg-[#f8f9fb] border border-[#e2e8f0] rounded-xl p-3.5 flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#7a7583] font-medium">{t('recordDetails.cryptoHash', 'Cryptographic Hash (SHA-256)')}</span>
                    <span className="font-mono text-[#28006d] font-bold text-[11px] select-all">
                      {recordHash}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7a7583] font-medium">{t('recordDetails.uploadGateway', 'Upload Gateway Source')}</span>
                    <span className="text-[#191c1e] font-semibold">{record.facility} Gateway</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7a7583] font-medium">{t('recordDetails.retentionPolicy', 'Retention Lifecycle Policy')}</span>
                    <span className="text-[#191c1e] font-semibold">7 Years (Mandatory Clinical)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7a7583] font-medium">{t('recordDetails.encryptionStandard', 'Encryption Standard')}</span>
                    <span className="text-emerald-700 font-semibold font-mono text-[11px]">AES-256-GCM Hardware Vault</span>
                  </div>
                </div>
              </div>

              {/* Card 2: OCR Extraction & Validation */}
              <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#edf0f4]">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-[#006a60]" />
                    <h3 className="font-bold text-sm text-[#191c1e]">
                      {t('recordDetails.ocrTitle', 'OCR Extraction & Validation')}
                    </h3>
                  </div>
                  <span className="text-xs font-bold bg-[#ccfbf1] text-[#0f766e] px-2.5 py-0.5 rounded-full border border-[#99f6e4]">
                    {record.ocrConfidence !== undefined
                      ? `${record.ocrConfidence}% Confidence`
                      : 'Manual Verification'}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-[#f0fdfa] border border-[#a7f3d0] rounded-xl p-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-[#047857] block">PROCESSED ENGINE</span>
                    <span className="font-semibold text-[#065f46]">Care ID Neural OCR Engine (v4.2)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-[#047857] block">SCHEMA MATCH</span>
                    <span className="font-bold text-emerald-800">Automated Schema Match</span>
                  </div>
                </div>

                {/* Extracted Fields Checklist */}
                <div>
                  <span className="text-[10px] font-bold text-[#7a7583] uppercase tracking-wider block mb-2">
                    EXTRACTED CLINICAL FIELDS
                  </span>
                  {recordCategory === 'Dental' && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#f8f9fb] border border-[#e2e8f0] p-2.5 rounded-lg flex items-center justify-between">
                        <span className="text-[#7a7583]">Jaw Alignment</span>
                        <strong className="text-[#191c1e]">Normal</strong>
                      </div>
                      <div className="bg-[#f8f9fb] border border-[#e2e8f0] p-2.5 rounded-lg flex items-center justify-between">
                        <span className="text-[#7a7583]">Dentition Count</span>
                        <strong className="text-[#191c1e]">32 Teethed</strong>
                      </div>
                      <div className="bg-[#f8f9fb] border border-[#e2e8f0] p-2.5 rounded-lg flex items-center justify-between">
                        <span className="text-[#7a7583]">Impacted Molars</span>
                        <strong className="text-emerald-700">None detected</strong>
                      </div>
                      <div className="bg-[#f8f9fb] border border-[#e2e8f0] p-2.5 rounded-lg flex items-center justify-between">
                        <span className="text-[#7a7583]">Restorations</span>
                        <strong className="text-[#191c1e]">Noted (#18, #19)</strong>
                      </div>
                    </div>
                  )}

                  {recordCategory === 'Medical' && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#f8f9fb] border border-[#e2e8f0] p-2.5 rounded-lg flex items-center justify-between">
                        <span className="text-[#7a7583]">Metabolic Panel</span>
                        <strong className="text-emerald-700">Verified</strong>
                      </div>
                      <div className="bg-[#f8f9fb] border border-[#e2e8f0] p-2.5 rounded-lg flex items-center justify-between">
                        <span className="text-[#7a7583]">Reference Bounds</span>
                        <strong className="text-[#191c1e]">Standard Match</strong>
                      </div>
                      <div className="bg-[#f8f9fb] border border-[#e2e8f0] p-2.5 rounded-lg flex items-center justify-between">
                        <span className="text-[#7a7583]">Specimen Quality</span>
                        <strong className="text-emerald-700">Adequate</strong>
                      </div>
                      <div className="bg-[#f8f9fb] border border-[#e2e8f0] p-2.5 rounded-lg flex items-center justify-between">
                        <span className="text-[#7a7583]">Signoff Status</span>
                        <strong className="text-[#191c1e]">{record.status}</strong>
                      </div>
                    </div>
                  )}

                  {recordCategory === 'Vision' && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#f8f9fb] border border-[#e2e8f0] p-2.5 rounded-lg flex items-center justify-between">
                        <span className="text-[#7a7583]">Optic Disc</span>
                        <strong className="text-emerald-700">Sharp & Distinct</strong>
                      </div>
                      <div className="bg-[#f8f9fb] border border-[#e2e8f0] p-2.5 rounded-lg flex items-center justify-between">
                        <span className="text-[#7a7583]">Macular Thickness</span>
                        <strong className="text-[#191c1e]">Normal (260 µm)</strong>
                      </div>
                      <div className="bg-[#f8f9fb] border border-[#e2e8f0] p-2.5 rounded-lg flex items-center justify-between">
                        <span className="text-[#7a7583]">Cup-to-Disc</span>
                        <strong className="text-[#191c1e]">0.35 (Symmetric)</strong>
                      </div>
                      <div className="bg-[#f8f9fb] border border-[#e2e8f0] p-2.5 rounded-lg flex items-center justify-between">
                        <span className="text-[#7a7583]">Vasculature</span>
                        <strong className="text-emerald-700">Intact (AV 2:3)</strong>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => showToast(`Displaying raw neural extraction dump for ${record.recordNumber}...`)}
                  className="btn-details-raw-ocr"
                >
                  <FileText size={14} />
                  <span>{t('recordDetails.viewOcrResults', 'View OCR Results & Raw Extraction')}</span>
                </button>
              </div>

              {/* Card 3: Immutable Audit Timeline */}
              <div
                id="audit-timeline-section"
                className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-xs flex flex-col gap-4 scroll-mt-6"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#edf0f4]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-[#28006d]" />
                    <h3 className="font-bold text-sm text-[#191c1e]">
                      {t('recordDetails.auditTitle', 'Immutable Audit Timeline')}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-[#7a7583]">
                    {t('recordDetails.ledgerSubtitle', 'Append-Only Ledger')}
                  </span>
                </div>

                {/* Timeline Items */}
                {isAuditLoading ? (
                  <div className="py-8 flex justify-center">
                    <RefreshCw size={20} className="animate-spin text-[#28006d]" />
                  </div>
                ) : auditEvents.length === 0 ? (
                  <div className="py-8 px-4 text-center rounded-xl bg-[#f8f9fb] border border-[#e2e8f0] flex flex-col items-center justify-center gap-2">
                    <AlertCircle size={22} className="text-[#7a7583]" />
                    <span className="text-xs font-semibold text-[#494552]">
                      Audit data is not available or not yet connected for this record in the current environment.
                    </span>
                  </div>
                ) : (
                  <div className="audit-timeline-container">
                    <div className="audit-timeline-line" />
                    {auditEvents.map((evt) => (
                      <div key={evt.id} className="audit-timeline-node">
                        <div
                          className={`audit-timeline-dot ${
                            evt.status === 'verified'
                              ? 'verified'
                              : evt.status === 'success'
                              ? 'success'
                              : 'info'
                          }`}
                        />
                        <div className="audit-timeline-content">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-bold text-[#191c1e]">{evt.action}</span>
                            <span className="text-[11px] font-mono text-[#7a7583] whitespace-nowrap">
                              {evt.timestampRelative || evt.timestamp}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#494552]">
                            by <strong>{evt.actor}</strong> {evt.actorRole ? `(${evt.actorRole})` : ''}
                          </span>
                          {evt.details && (
                            <p className="text-[11px] text-[#64748b] mt-0.5 leading-snug">
                              {evt.details}
                            </p>
                          )}
                          {evt.hash && (
                            <span className="text-[10px] font-mono text-[#28006d] block mt-0.5">
                              Hash: {evt.hash}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bottom Routing Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-[#edf0f4] text-xs">
                  <button
                    type="button"
                    onClick={() => showToast(`Verified Cryptographic Audit Certificate #${recordHash.slice(0, 14)}`)}
                    className="text-[#28006d] font-semibold hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={12} />
                    <span>{t('recordDetails.viewAuditCertificate', 'View Full Cryptographic Audit Certificate')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportAuditCsv}
                    className="text-[#7a7583] hover:text-[#191c1e] font-semibold transition-colors disabled:opacity-50"
                    disabled={auditEvents.length === 0}
                  >
                    {t('recordDetails.exportCsv', 'Export as CSV')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminRecordDetails;
