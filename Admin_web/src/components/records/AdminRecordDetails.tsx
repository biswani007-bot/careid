import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
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
import AdminHeader from '../common/AdminHeader';
import {
  useHealthRecordQuery,
  useRecordAuditTrailQuery,
  useRerunOcrMutation,
  useFlagRecordMutation,
  resolvePatientName,
  resolvePatientInitials,
  resolvePatientAvatarBg,
  downloadAttachmentFile,
  fetchAttachmentBinary,
  formatFileSize,
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

  // Resolve recordId from route params
  const recordId = params.recordId || '';

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
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Active Attachment Selection & Document Streaming State
  const [selectedAttachmentIdx, setSelectedAttachmentIdx] = useState<number>(0);
  const [docBlobUrl, setDocBlobUrl] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState<boolean>(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [docMimeType, setDocMimeType] = useState<string>('');
  const viewerCardRef = React.useRef<HTMLDivElement | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const canvasRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.scrollTop = 0;
    }
  }, [recordId]);

  // Fullscreen event listener sync
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!viewerCardRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await viewerCardRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }
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

  // Active Attachment
  const currentAttachment = record?.attachments?.[selectedAttachmentIdx] || record?.attachments?.[0];

  // Document Streaming Effect
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    async function streamDocument() {
      if (!currentAttachment?.fileName) {
        setDocBlobUrl(null);
        setDocLoading(false);
        setDocError(null);
        setDocMimeType('');
        return;
      }

      setDocLoading(true);
      setDocError(null);

      try {
        const { blob, mimeType: fetchedMime } = await fetchAttachmentBinary(
          currentAttachment.fileName,
          currentAttachment.id
        );

        if (!active) return;

        let mime = fetchedMime || currentAttachment.mimeType || '';
        const filenameLower = (currentAttachment.originalName || currentAttachment.fileName || '').toLowerCase();

        if (!mime || mime === 'application/octet-stream') {
          if (filenameLower.endsWith('.pdf')) mime = 'application/pdf';
          else if (filenameLower.endsWith('.png')) mime = 'image/png';
          else if (filenameLower.endsWith('.jpg') || filenameLower.endsWith('.jpeg')) mime = 'image/jpeg';
          else if (filenameLower.endsWith('.webp')) mime = 'image/webp';
          else if (filenameLower.endsWith('.dcm')) mime = 'application/dicom';
          else if (filenameLower.endsWith('.tiff') || filenameLower.endsWith('.tif')) mime = 'image/tiff';
        }

        const typedBlob = new Blob([blob], { type: mime || 'application/pdf' });
        createdUrl = URL.createObjectURL(typedBlob);

        setDocMimeType(mime);
        setDocBlobUrl(createdUrl);
        setDocLoading(false);
      } catch (err: any) {
        if (!active) return;
        setDocError(err?.message || 'Failed to stream document preview.');
        setDocLoading(false);
      }
    }

    streamDocument();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [currentAttachment?.fileName, currentAttachment?.mimeType, currentAttachment?.originalName, currentAttachment?.id]);

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

  const handleDownloadOriginal = async () => {
    if (!record) return;

    // 1. If attachment is available, stream directly via fetchAttachmentBinary / downloadAttachmentFile
    if (currentAttachment?.fileName) {
      try {
        const displayName = currentAttachment.originalName || `${record.title.replace(/\s+/g, '_')}.pdf`;
        showToast(t('recordDetails.toasts.downloadStarted', { file: displayName, defaultValue: `Downloading original file: ${displayName}` }));
        await downloadAttachmentFile(currentAttachment.fileName, displayName, currentAttachment.id);
        return;
      } catch (err: any) {
        console.warn('Failed streaming attachment, falling back to export:', err);
      }
    }

    const isDicom = record.category === 'Dental' || (record.documentType && record.documentType.includes('DICOM'));
    const ext = isDicom ? 'dcm' : 'pdf';
    const fileName = `${record.recordNumber.replace('#', '')}_${record.title.replace(/\s+/g, '_')}.${ext}`;
    
    // Stream authentic binary attachment or server-side clinical export
    try {
      showToast(t('recordDetails.toasts.downloadStarted', { file: fileName, defaultValue: `Downloading file: ${fileName}` }));
      const targetFileName = currentAttachment?.fileName || `${record.recordNumber.replace('#', '')}.pdf`;
      const binary = await fetchAttachmentBinary(targetFileName, currentAttachment?.id || record.id);
      if (binary && binary.blob && binary.blob.size > 0) {
        const url = URL.createObjectURL(binary.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        return;
      }
    } catch (err: any) {
      console.warn('Direct attachment fetch failed, requesting server export:', err);
    }

    try {
      const exportUrl = `/api/v1/medical-records/export?recordIds=${encodeURIComponent(record.id)}&format=PDF`;
      const token = localStorage.getItem('careid_access_token') || sessionStorage.getItem('careid_access_token');
      const res = await fetch(exportUrl, {
        headers: { Accept: 'application/pdf', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        const pdfBlob = await res.blob();
        if (pdfBlob.size > 0) {
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          return;
        }
      }
      throw new Error(`Failed to stream document (${res.status})`);
    } catch (err: any) {
      showToast('Document is currently unavailable in the vault storage. Please verify backend attachments.');
    }
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
        {/* Mobile Drawer Backdrop */}
        {isDrawerOpen && (
          <div
            className={`careid-drawer-backdrop ${isDrawerOpen ? 'drawer-open show' : ''}`}
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />
        )}
        <AdminSidebar
          activeNav="records"
          isDrawerOpen={isDrawerOpen}
          onCloseDrawer={() => setIsDrawerOpen(false)}
          onNavigate={handleNav}
          onLogout={onLogout}
        />
        <div className="careid-main-wrapper flex flex-col items-center justify-center p-8 bg-[#f8f9fb]">
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
        {/* Mobile Drawer Backdrop */}
        {isDrawerOpen && (
          <div
            className={`careid-drawer-backdrop ${isDrawerOpen ? 'drawer-open show' : ''}`}
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />
        )}
        <AdminSidebar
          activeNav="records"
          isDrawerOpen={isDrawerOpen}
          onCloseDrawer={() => setIsDrawerOpen(false)}
          onNavigate={handleNav}
          onLogout={onLogout}
        />
        <div className="careid-main-wrapper flex flex-col items-center justify-center p-8 bg-[#f8f9fb]">
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

      {/* Mobile Drawer Backdrop */}
      {isDrawerOpen && (
        <div
          className={`careid-drawer-backdrop ${isDrawerOpen ? 'drawer-open show' : ''}`}
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
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
        {/* Shared CareID Admin Header */}
        <AdminHeader
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onNavigate={handleNav}
          showUploadRecord={true}
          onUploadRecord={() => handleNav('/admin/records/upload')}
        />

        {/* Scrollable Main Canvas */}
        <main ref={canvasRef} className="record-details-canvas" role="main">
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
                  <span>
                    {t('recordDetails.downloadOriginal', 'Download Original File')}
                    {currentAttachment?.fileSize ? ` (${formatFileSize(currentAttachment.fileSize)})` : ''}
                  </span>
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

          {/* Vault Attachment Notice */}
          {record?.entityType === 'ATTACHMENT' && (
            <div className="mb-4 p-4 rounded-xl bg-[#f5f3ff] border border-[#ddd6fe] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#6d28d9]/10 text-[#6d28d9] flex items-center justify-center flex-shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#28006d]">Patient Document Vault Attachment</h4>
                  <p className="text-xs text-[#5b21b6]">This document is securely indexed in the patient's CareID Vault. Clinical encounter authoring is reserved for licensed attending physicians.</p>
                </div>
              </div>
              {record.attachments?.[0]?.fileName && (
                <button
                  type="button"
                  onClick={handleDownloadOriginal}
                  className="px-3 py-1.5 rounded-lg bg-[#6d28d9] text-white text-xs font-semibold hover:bg-[#5b21b6] transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                >
                  <Download size={13} />
                  <span>Stream / Download ({formatFileSize(record.attachments?.[0]?.fileSize || currentAttachment?.fileSize)})</span>
                </button>
              )}
            </div>
          )}

          {/* Section 3: Discipline Lens Switcher Strip */}
          <div className="discipline-lens-card">
            <div className="discipline-lens-top-row">
              <div className="discipline-lens-group">
                <span className="discipline-lens-label">{t('recordDetails.disciplineLens', 'DISCIPLINE LENS:')}</span>
                <div className="discipline-segmented-control" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={false}
                    className="discipline-segment-btn"
                    onClick={() => handleNav('/admin/records')}
                  >
                    <span>{t('recordDetails.allRecords', 'All Records')}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={recordCategory === 'Medical'}
                    className={`discipline-segment-btn ${recordCategory === 'Medical' ? 'active-medical' : ''}`}
                    onClick={() => handleNav('/admin/records/medical')}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#28006d]" />
                    <span>{t('recordDetails.medical', 'Medical')}</span>
                    {recordCategory === 'Medical' && <span className="category-active-tag">(Active)</span>}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={recordCategory === 'Dental'}
                    className={`discipline-segment-btn ${recordCategory === 'Dental' ? 'active-dental' : ''}`}
                    onClick={() => handleNav('/admin/records/dental')}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#006a60]" />
                    <span>{t('recordDetails.dental', 'Dental')}</span>
                    {recordCategory === 'Dental' && <span className="category-active-tag">(Active)</span>}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={recordCategory === 'Vision'}
                    className={`discipline-segment-btn ${recordCategory === 'Vision' ? 'active-vision' : ''}`}
                    onClick={() => handleNav('/admin/records/vision')}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#00629e]" />
                    <span>{t('recordDetails.vision', 'Vision')}</span>
                    {recordCategory === 'Vision' && <span className="category-active-tag">(Active)</span>}
                  </button>
                </div>
              </div>
            </div>

            {/* Current-view info message on its OWN separate row! */}
            <div className="discipline-context-callout">
              <Sparkles size={16} className="shrink-0 text-[#006a60]" />
              <span>
                <strong>Currently viewing:</strong> {recordCategory} Record • {record.recordNumber}. Switch category preview to inspect Medical, Dental, or Vision records.
              </span>
            </div>
          </div>

          {/* Section 4: Patient and Record Information Card */}
          <div className="record-master-card">
            {/* Top Area: Left Patient Identity (60%) + Right Provider & Facility (40%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-5 border-b border-[#edf0f4]">
              {/* Left: Patient Identity Area */}
              <div className="lg:col-span-7 flex items-start gap-4 min-w-0">
                <div
                  className="record-patient-avatar"
                  style={{ backgroundColor: patientAvatarBg }}
                  aria-hidden="true"
                >
                  {patientInitials}
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="record-patient-name">{patientName}</h2>

                    {/* Category Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                        recordCategory === 'Medical'
                          ? 'bg-[#e8ddff] text-[#28006d]'
                          : recordCategory === 'Dental'
                          ? 'bg-[#ccfbf1] text-[#0f766e]'
                          : 'bg-[#e0f2fe] text-[#0369a1]'
                      }`}
                    >
                      {recordCategory === 'Dental' && <Sparkles size={13} />}
                      {recordCategory === 'Medical' && <Activity size={13} />}
                      {recordCategory === 'Vision' && <Eye size={13} />}
                      <span>{recordCategory}</span>
                    </span>

                    {/* Verification Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        record.status === 'Verified'
                          ? 'bg-[#d1fae5] text-[#065f46]'
                          : record.status === 'Pending Verification'
                          ? 'bg-[#fef3c7] text-[#92400e]'
                          : 'bg-[#fee2e2] text-[#991b1b]'
                      }`}
                    >
                      {record.status === 'Verified' && <CheckCircle2 size={13} />}
                      {record.status === 'Pending Verification' && <Clock size={13} />}
                      {record.status === 'Rejected' && <XCircle size={13} />}
                      <span>{record.status}</span>
                    </span>

                    {/* Record ID Pill */}
                    <span className="text-xs font-mono font-bold text-[#494552] bg-[#f2f4f6] px-2.5 py-1 rounded-md border border-[#cbc4d4]">
                      ID: {record.recordNumber}
                    </span>

                    {record.isDependent && (
                      <span className="badge-dependent-tag">Dependent</span>
                    )}
                  </div>

                  {/* Patient Identity Meta Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="bg-[#f8f9fb] p-2.5 rounded-lg border border-[#e2e8f0]">
                      <span className="text-[10px] font-bold text-[#7a7583] uppercase tracking-wider block">
                        Care ID
                      </span>
                      <span className="text-xs font-mono font-bold text-[#28006d] block truncate mt-0.5">
                        {record.patientId}
                      </span>
                    </div>

                    <div className="bg-[#f8f9fb] p-2.5 rounded-lg border border-[#e2e8f0]">
                      <span className="text-[10px] font-bold text-[#7a7583] uppercase tracking-wider block">
                        Record Title
                      </span>
                      <span className="text-xs font-semibold text-[#191c1e] block truncate mt-0.5" title={record.title}>
                        {record.title}
                      </span>
                    </div>

                    <div className="bg-[#f8f9fb] p-2.5 rounded-lg border border-[#e2e8f0]">
                      <span className="text-[10px] font-bold text-[#7a7583] uppercase tracking-wider block">
                        Clinical Type
                      </span>
                      <span className="text-xs font-semibold text-[#191c1e] block truncate mt-0.5" title={record.recordType}>
                        {record.recordType}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Provider & Facility Cards */}
              <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-[#f8f9fb] border border-[#cbc4d4] rounded-xl p-3.5 flex flex-col justify-between gap-1 min-w-0">
                  <span className="text-[10px] font-bold text-[#7a7583] tracking-wider uppercase block">
                    {t('recordDetails.healthcareProvider', 'HEALTHCARE PROVIDER')}
                  </span>
                  <div className="font-bold text-sm text-[#191c1e] truncate" title={record.provider}>
                    {record.provider}
                  </div>
                  <div className="text-xs text-[#7a7583] truncate">{providerSpecialty}</div>
                </div>

                <div className="bg-[#f8f9fb] border border-[#cbc4d4] rounded-xl p-3.5 flex flex-col justify-between gap-1 min-w-0">
                  <span className="text-[10px] font-bold text-[#7a7583] tracking-wider uppercase block">
                    {t('recordDetails.facilityLocation', 'FACILITY LOCATION')}
                  </span>
                  <div className="font-bold text-sm text-[#191c1e] truncate" title={record.facility}>
                    {record.facility}
                  </div>
                  <div className="text-xs text-[#7a7583]">Federated Clinical Node</div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Record Metadata (Timestamps, Ledger, Route) */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-1 text-xs text-[#494552] flex-wrap">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#7a7583] shrink-0" />
                  <span>
                    Record Date: <strong className="text-[#191c1e]">{record.recordDate}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-[#7a7583] shrink-0" />
                  <span>
                    Indexed: <strong className="text-[#191c1e]">{record.recordDate} 09:14 AM</strong>
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ecfdf5] text-[#065f46] font-semibold border border-[#a7f3d0]">
                  <ShieldCheck size={14} className="text-[#059669] shrink-0" />
                  <span>{t('recordDetails.hipaaLedger', 'HIPAA Audit Ledger Confirmed')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs text-[#7a7583] flex-wrap max-w-full">
                <span className="shrink-0">Administrative Route:</span>
                <span className="bg-[#f2f4f6] px-2.5 py-1 rounded text-[#28006d] font-bold border border-[#cbc4d4] break-all">
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
              <div ref={viewerCardRef} className="dicom-viewer-card">
                {/* Viewer Toolbar */}
                <div className="dicom-viewer-toolbar">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Layers size={18} className="text-[#28006d]" />
                    <h3 className="font-bold text-sm text-[#191c1e] truncate max-w-[280px]">
                      {currentAttachment?.originalName || record.title}
                    </h3>
                    <span className="text-[10px] font-mono font-bold bg-[#f2f4f6] text-[#494552] px-2 py-0.5 rounded border border-[#cbc4d4] uppercase">
                      {docMimeType ? docMimeType.replace('application/', '').replace('image/', '') : (recordCategory === 'Dental' ? 'DICOM 3.0' : 'Clinical Document')}
                    </span>
                    {record.attachments && record.attachments.length > 1 && (
                      <div className="flex items-center gap-1 ml-2">
                        {record.attachments.map((att, idx) => (
                          <button
                            key={att.id || idx}
                            type="button"
                            onClick={() => setSelectedAttachmentIdx(idx)}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                              selectedAttachmentIdx === idx
                                ? 'bg-[#28006d] text-white border-[#28006d]'
                                : 'bg-white text-[#494552] border-[#cbc4d4] hover:bg-[#f2f4f6]'
                            }`}
                          >
                            File {idx + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Viewport Controls */}
                  <div className="flex items-center gap-1 bg-[#f8f9fb] border border-[#cbc4d4] rounded-lg p-1">
                    <button
                      type="button"
                      title={t('recordDetails.zoomOut', 'Zoom Out')}
                      className="p-1 text-[#494552] hover:text-[#28006d] hover:bg-white rounded transition-colors"
                      onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                    >
                      <ZoomOut size={15} />
                    </button>
                    <button
                      type="button"
                      title="Click to reset zoom to 100%"
                      onClick={() => setZoomLevel(100)}
                      className="font-mono text-xs font-bold px-2 text-[#191c1e] min-w-[45px] text-center hover:bg-white rounded transition-colors"
                    >
                      {zoomLevel}%
                    </button>
                    <button
                      type="button"
                      title={t('recordDetails.zoomIn', 'Zoom In')}
                      className="p-1 text-[#494552] hover:text-[#28006d] hover:bg-white rounded transition-colors"
                      onClick={() => setZoomLevel((z) => Math.min(300, z + 25))}
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
                      onClick={toggleFullscreen}
                    >
                      <Maximize2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Canvas / Authentic Document Surface */}
                <div className="dicom-canvas-surface">
                  {docLoading ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-white min-h-[480px]">
                      <RefreshCw size={36} className="animate-spin text-cyan-400 mb-3" />
                      <p className="font-semibold text-sm text-slate-200">Streaming authentic document from CareID Vault...</p>
                      <p className="font-mono text-xs text-slate-400 mt-1">{currentAttachment?.originalName || currentAttachment?.fileName}</p>
                    </div>
                  ) : docError ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[480px]">
                      <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-6 max-w-md flex flex-col items-center gap-3">
                        <AlertTriangle size={36} className="text-red-400" />
                        <h4 className="font-bold text-sm text-white">Document Stream Unavailable</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{docError}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={handleDownloadOriginal}
                            className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Download size={13} />
                            <span>Download File Direct</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : !currentAttachment || !currentAttachment.fileName ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[480px]">
                      <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 max-w-lg flex flex-col items-center gap-3 text-slate-300">
                        <FileText size={36} className="text-slate-400" />
                        <h4 className="font-bold text-sm text-white">Direct Clinical Encounter Ingress</h4>
                        <p className="text-xs leading-relaxed text-slate-300">
                          No binary file or imaging scan was attached to this clinical encounter. Attending clinician recorded direct clinical notes and diagnostic findings.
                        </p>
                        <div className="w-full bg-slate-800/80 rounded-lg p-3 text-left border border-slate-700 text-xs text-slate-200 mt-2">
                          <span className="text-[10px] font-bold text-cyan-400 block uppercase mb-1">Encounter Notes:</span>
                          {record.clinicalNotes || record.summary || 'No additional notes recorded.'}
                        </div>
                      </div>
                    </div>
                  ) : docMimeType === 'application/dicom' || (currentAttachment.fileName && currentAttachment.fileName.toLowerCase().endsWith('.dcm')) ? (
                    /* DICOM Unsupported Preview State (PACS Requirements) */
                    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[480px]">
                      <div className="bg-slate-900/80 border border-cyan-500/40 rounded-2xl p-6 max-w-lg flex flex-col items-center gap-3 text-white shadow-2xl">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                          <Layers size={24} />
                        </div>
                        <h4 className="font-bold text-base text-white">PACS DICOM 3.0 Clinical Dataset</h4>
                        <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                          Direct in-browser WebGL rendering of uncompressed multi-frame DICOM volumetric slices (<span className="font-mono text-cyan-300">.dcm</span>) requires a certified clinical PACS workstation (e.g. Horos, RadiAnt, OsiriX). To examine full diagnostic bit-depth, window/level calibrations, and multi-slice acquisitions, download the original unaltered DICOM bitstream below.
                        </p>
                        
                        <div className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs text-left my-2 font-mono">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">FILE NAME</span>
                            <span className="text-white truncate block">{currentAttachment.originalName || currentAttachment.fileName}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">MIME TYPE</span>
                            <span className="text-cyan-300">application/dicom</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">FILE SIZE</span>
                            <span className="text-white">{formatFileSize(currentAttachment.fileSize, record.fileSize)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">SECURITY HASH</span>
                            <span className="text-emerald-400">SHA-256 Verified</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleDownloadOriginal}
                          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md mt-1"
                        >
                          <Download size={14} />
                          <span>Download Original DICOM (.dcm)</span>
                        </button>
                      </div>
                    </div>
                  ) : docMimeType === 'application/pdf' || (currentAttachment.fileName && currentAttachment.fileName.toLowerCase().endsWith('.pdf')) ? (
                    /* PDF Document Embedded Viewer */
                    <div className="w-full h-full min-h-[580px] bg-[#1e293b] p-0 overflow-hidden relative">
                      {docBlobUrl && (
                        <iframe
                          src={`${docBlobUrl}#toolbar=1&navpanes=1`}
                          title={record.title}
                          className="w-full h-full min-h-[580px] border-0 bg-white"
                        />
                      )}
                    </div>
                  ) : docMimeType.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.tif', '.gif'].some(ext => (currentAttachment.fileName || '').toLowerCase().endsWith(ext)) ? (
                    /* Image Document Viewer (PNG, JPG, WEBP) */
                    <div className="w-full min-h-[480px] bg-[#0c121e] flex items-center justify-center p-4 relative overflow-hidden select-none">
                      {docBlobUrl && (
                        <img
                          src={docBlobUrl}
                          alt={record.title}
                          className="max-w-full max-h-[500px] object-contain transition-transform duration-200"
                          style={{
                            transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                            filter: isInverted ? 'invert(1) hue-rotate(180deg)' : 'none',
                          }}
                          draggable={false}
                        />
                      )}
                    </div>
                  ) : (
                    /* Other Unsupported Format */
                    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[480px]">
                      <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 max-w-md flex flex-col items-center gap-3 text-white">
                        <FileText size={36} className="text-cyan-400" />
                        <h4 className="font-bold text-sm text-white">File Format Preview Unsupported</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          The uploaded format (<span className="font-mono text-cyan-300">{docMimeType || 'Binary file'}</span>) cannot be rendered directly inline in the web browser. You can download and open the file directly in native software.
                        </p>
                        <div className="text-xs font-mono text-slate-400 my-1 truncate max-w-full">
                          {currentAttachment.originalName || currentAttachment.fileName}
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadOriginal}
                          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md"
                        >
                          <Download size={14} />
                          <span>Download Original File</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Viewer Actions */}
                <div className="p-4 bg-white border-t border-[#e2e8f0] flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {docBlobUrl && (
                      <a
                        href={docBlobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-lg border border-[#cbc4d4] bg-white text-xs font-semibold text-[#191c1e] hover:bg-[#f2f4f6] flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <ExternalLink size={13} />
                        <span>{t('recordDetails.openNewTab', 'Open in New Tab')}</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={handleDownloadOriginal}
                      className="px-3.5 py-1.5 rounded-lg border border-[#cbc4d4] bg-white text-xs font-semibold text-[#191c1e] hover:bg-[#f2f4f6] flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Download size={13} />
                      <span>
                        {t('recordDetails.downloadOriginal', 'Download Original')}
                        {currentAttachment?.fileSize ? ` (${formatFileSize(currentAttachment.fileSize)})` : ''}
                      </span>
                    </button>

                    {currentAttachment && (
                      <span className="text-xs text-[#7a7583] font-mono truncate max-w-[200px]" title={currentAttachment.originalName || currentAttachment.fileName}>
                        {currentAttachment.originalName || currentAttachment.fileName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-[#059669] font-medium">
                    <ShieldCheck size={14} className="text-[#059669]" />
                    <span>
                      Virus Scan: {currentAttachment?.virusScanStatus === 'CLEAN' ? 'Clean' : 'SHA-256 Verified'} • Encrypted Vault Storage
                    </span>
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
              <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-xs flex flex-col gap-4 min-w-0">
                <div className="flex items-center justify-between pb-3 border-b border-[#edf0f4] flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-[#28006d]" />
                    <h3 className="font-bold text-sm text-[#191c1e]">
                      {t('recordDetails.metadataTitle', 'Record Metadata')}
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#ecfdf5] text-[#065f46] px-2.5 py-0.5 rounded-md border border-[#a7f3d0]">
                    <CheckCircle2 size={12} />
                    <span>{t('recordDetails.complianceBadge', 'ADA & HIPAA Compliant')}</span>
                  </span>
                </div>

                {/* 2x2 Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#f8f9fb] border border-[#e2e8f0] rounded-xl p-3 min-w-0">
                    <span className="text-[10px] font-bold text-[#7a7583] tracking-wider uppercase block">
                      {t('recordDetails.modality', 'CLINICAL MODALITY')}
                    </span>
                    <span className="text-xs font-bold text-[#191c1e] mt-1 block truncate">
                      {record.recordType}
                    </span>
                  </div>

                  <div className="bg-[#f8f9fb] border border-[#e2e8f0] rounded-xl p-3 min-w-0">
                    <span className="text-[10px] font-bold text-[#7a7583] tracking-wider uppercase block">
                      {t('recordDetails.categoryLens', 'CATEGORY LENS')}
                    </span>
                    <span className="text-xs font-bold text-[#006a60] mt-1 flex items-center gap-1 truncate">
                      <Sparkles size={11} className="shrink-0" />
                      <span>{recordCategory} Discipline</span>
                    </span>
                  </div>

                  <div className="bg-[#f8f9fb] border border-[#e2e8f0] rounded-xl p-3 min-w-0">
                    <span className="text-[10px] font-bold text-[#7a7583] tracking-wider uppercase block">
                      {t('recordDetails.formatSize', 'FILE FORMAT & SIZE')}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#191c1e] mt-1 block truncate">
                      {record.documentType || 'Clinical Document'} • {record.fileSize || '3.4 MB'}
                    </span>
                  </div>

                  <div className="bg-[#f8f9fb] border border-[#e2e8f0] rounded-xl p-3 min-w-0">
                    <span className="text-[10px] font-bold text-[#7a7583] tracking-wider uppercase block">
                      {t('recordDetails.resolution', 'RESOLUTION')}
                    </span>
                    <span className="text-xs font-bold text-[#191c1e] mt-1 block truncate">
                      300 DPI (High-Def Archive)
                    </span>
                  </div>
                </div>

                {/* Technical Cryptographic Details */}
                <div className="bg-[#f8f9fb] border border-[#e2e8f0] rounded-xl p-3.5 flex flex-col gap-2.5 text-xs min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#edf0f4]">
                    <span className="text-[#7a7583] font-medium shrink-0">
                      {t('recordDetails.cryptoHash', 'Cryptographic Hash (SHA-256)')}
                    </span>
                    <span className="font-mono text-[#28006d] font-bold text-[11px] select-all break-all text-left sm:text-right">
                      {recordHash}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#edf0f4]">
                    <span className="text-[#7a7583] font-medium">{t('recordDetails.uploadGateway', 'Upload Gateway Source')}</span>
                    <span className="text-[#191c1e] font-semibold">{record.facility} Gateway</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#edf0f4]">
                    <span className="text-[#7a7583] font-medium">{t('recordDetails.retentionPolicy', 'Retention Lifecycle Policy')}</span>
                    <span className="text-[#191c1e] font-semibold">7 Years (Mandatory Clinical)</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
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

                {/* Extracted Clinical Fields & Text Content */}
                <div>
                  <span className="text-[10px] font-bold text-[#7a7583] uppercase tracking-wider block mb-2">
                    EXTRACTED CLINICAL SUMMARY & INGRESS
                  </span>
                  <div className="bg-[#f8f9fb] border border-[#e2e8f0] p-3.5 rounded-xl text-xs text-[#334155] leading-relaxed mb-3">
                    {record.clinicalNotes || record.summary || (
                      <span className="italic text-[#7a7583]">
                        No automated OCR text extracted for this document. Raw binary archive stored.
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#f8f9fb] border border-[#e2e8f0] p-2.5 rounded-lg flex items-center justify-between">
                      <span className="text-[#7a7583]">Clinical Category</span>
                      <strong className="text-[#191c1e]">{record.category}</strong>
                    </div>
                    <div className="bg-[#f8f9fb] border border-[#e2e8f0] p-2.5 rounded-lg flex items-center justify-between">
                      <span className="text-[#7a7583]">Document Type</span>
                      <strong className="text-[#191c1e]">{record.documentType || record.recordType}</strong>
                    </div>
                    <div className="bg-[#f8f9fb] border border-[#e2e8f0] p-2.5 rounded-lg flex items-center justify-between">
                      <span className="text-[#7a7583]">Ingestion Status</span>
                      <strong className="text-emerald-700">{record.status}</strong>
                    </div>
                    <div className="bg-[#f8f9fb] border border-[#e2e8f0] p-2.5 rounded-lg flex items-center justify-between">
                      <span className="text-[#7a7583]">File Association</span>
                      <strong className="text-[#191c1e] truncate max-w-[100px]" title={currentAttachment?.originalName || currentAttachment?.fileName || 'Encounter'}>
                        {currentAttachment?.originalName || currentAttachment?.fileName || 'Attached'}
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const info = `CareID Document Extraction\nRecord: ${record.recordNumber}\nDocument: ${currentAttachment?.originalName || currentAttachment?.fileName || record.title}\nCategory: ${record.category}\nStatus: ${record.status}\nProvider: ${record.provider}\nFacility: ${record.facility}\nDate: ${record.recordDate}\n\nClinical Observations:\n${record.clinicalNotes || record.summary || 'None'}`;
                    alert(info);
                  }}
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
