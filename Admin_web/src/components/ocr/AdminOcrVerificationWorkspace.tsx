import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowLeft,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  X,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import AdminSidebar from '../common/AdminSidebar';
import AdminHeader from '../common/AdminHeader';
import {
  useOcrQueueQuery,
  useOcrItemQuery,
  useApproveOcrMutation,
  useRejectOcrMutation,
  useSaveOcrDraftMutation,
} from '../../services/ocrService';
import './AdminOcrVerificationWorkspace.css';

// ---------------------------------------------------------------------------
// Form Validation Schema using Zod
// ---------------------------------------------------------------------------
const clinicalValueItemSchema = z.object({
  id: z.string(),
  testName: z.string().min(1, 'Test name is required'),
  value: z.string().min(1, 'Value is required'),
  unit: z.string(),
  status: z.enum(['ok', 'warning', 'error']),
  isLowConfidence: z.boolean().optional(),
});

const ocrVerificationSchema = z.object({
  patientName: z.string().min(1, 'Patient name is required'),
  patientId: z.string().min(1, 'Patient ID is required'),
  collectionDate: z.string().min(1, 'Collection date is required'),
  provider: z.string().min(1, 'Provider is required'),
  clinicalValues: z.array(clinicalValueItemSchema),
});

export type OcrVerificationFormData = z.infer<typeof ocrVerificationSchema>;

export interface AdminOcrVerificationWorkspaceProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminOcrVerificationWorkspace: React.FC<AdminOcrVerificationWorkspaceProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Fetch queue to find first record if ID was not specified in the URL
  const { data: queueData, isLoading: isQueueLoading } = useOcrQueueQuery({}, 1, 10);
  const activeRecordId = id || queueData?.items?.[0]?.id || '';

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [docViewMode, setDocViewMode] = useState<'image' | 'text'>('image');
  const totalPages = 1;

  // Rejection Dialog State
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Query OCR Item by ID
  const {
    data: ocrRecord,
    isLoading: isRecordLoading,
    isError: isRecordError,
  } = useOcrItemQuery(activeRecordId);

  // Mutations
  const approveMutation = useApproveOcrMutation();
  const rejectMutation = useRejectOcrMutation();
  const saveDraftMutation = useSaveOcrDraftMutation();

  // Setup React Hook Form
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OcrVerificationFormData>({
    resolver: zodResolver(ocrVerificationSchema),
    defaultValues: {
      patientName: '',
      patientId: '',
      collectionDate: '',
      provider: '',
      clinicalValues: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'clinicalValues',
  });

  // Populate form with record data when query returns
  useEffect(() => {
    if (ocrRecord) {
      const mappedClinical: Array<z.infer<typeof clinicalValueItemSchema>> = [];
      const keys = Object.keys(ocrRecord.extractedFields || {});

      if (keys.length > 0) {
        keys.forEach((key, idx) => {
          // Skip meta fields in the clinical table
          if (key === 'patient_name' || key === 'mrn' || key === 'report_date' || key === 'provider') return;
          
          const rawVal = String(ocrRecord.extractedFields[key]);
          const parts = rawVal.split(' ');
          const val = parts[0] || rawVal;
          const unit = parts.slice(1).join(' ') || '';
          const hasError = val.includes('?') || ocrRecord.confidence < 70;

          mappedClinical.push({
            id: `cv-${idx}-${Date.now()}`,
            testName: key.replace(/_/g, ' ').toUpperCase(),
            value: val,
            unit: unit || 'std',
            status: hasError ? 'error' : 'ok',
            isLowConfidence: hasError,
          });
        });
      }

      // If no clinical specific fields were found, add the test_name or general analyte
      if (mappedClinical.length === 0) {
        mappedClinical.push({
          id: `cv-0-${Date.now()}`,
          testName: String(ocrRecord.extractedFields.test_name || 'Lab Panel Examination'),
          value: 'Completed',
          unit: 'Result',
          status: 'ok',
        });
      }

      reset({
        patientName: ocrRecord.patientName,
        patientId: ocrRecord.patientId,
        collectionDate: String(ocrRecord.extractedFields.report_date || ocrRecord.uploadDate || '2026-07-31'),
        provider: String(ocrRecord.extractedFields.provider || ocrRecord.reviewer || 'CareID Diagnostic Center'),
        clinicalValues: mappedClinical,
      });
    }
  }, [ocrRecord, reset]);

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 15, 60));
  const handleResetZoom = () => {
    setZoomLevel(100);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  // Pagination handlers
  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  // Save Draft Action
  const handleSaveDraft = (data: OcrVerificationFormData) => {
    const taskId = ocrRecord?.ocrId || `#OCR-${activeRecordId.slice(0, 8).toUpperCase()}`;
    const updatedExtracted: Record<string, string | number> = {
      patient_name: data.patientName,
      mrn: data.patientId,
      report_date: data.collectionDate,
      provider: data.provider,
    };
    data.clinicalValues.forEach((row) => {
      updatedExtracted[row.testName.toLowerCase().replace(/\s+/g, '_')] = `${row.value} ${row.unit}`.trim();
    });

    saveDraftMutation.mutate(
      {
        ocrId: activeRecordId,
        updates: {
          patientName: data.patientName,
          patientId: data.patientId,
          extractedFields: updatedExtracted,
        },
      },
      {
        onSuccess: () => {
          showToast(
            t('ocrWorkspace.toasts.draftSaved', {
              id: taskId,
              defaultValue: `Draft saved successfully for ${taskId}.`,
            })
          );
        },
        onError: (err: any) => {
          showToast(err?.message || 'Failed to save draft corrections.');
        },
      }
    );
  };

  // Approve & File Action
  const handleApproveAndFile = (data: OcrVerificationFormData) => {
    const taskId = ocrRecord?.ocrId || `#OCR-${activeRecordId.slice(0, 8).toUpperCase()}`;
    const updatedExtracted: Record<string, string | number> = {
      patient_name: data.patientName,
      mrn: data.patientId,
      report_date: data.collectionDate,
      provider: data.provider,
    };
    data.clinicalValues.forEach((row) => {
      updatedExtracted[row.testName.toLowerCase().replace(/\s+/g, '_')] = `${row.value} ${row.unit}`.trim();
    });

    const corrections: Array<{ fieldName: string; correctedValue: string; confidence?: number }> = [];
    Object.entries(updatedExtracted).forEach(([fieldName, val]) => {
      corrections.push({ fieldName, correctedValue: String(val), confidence: 1 });
    });

    approveMutation.mutate(
      {
        ocrId: activeRecordId,
        reviewNotes: 'Verified and approved by administrator in CareID Admin Portal.',
        corrections,
      },
      {
        onSuccess: () => {
          showToast(
            t('ocrWorkspace.toasts.approved', {
              id: taskId,
              defaultValue: `Record ${taskId} approved and filed into health records.`,
            })
          );
          setTimeout(() => handleNav('/admin/ocr/queue'), 1200);
        },
        onError: (err: any) => {
          showToast(err?.message || 'Failed to submit approval.');
        },
      }
    );
  };

  // Reject Action
  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) {
      setRejectionError(
        t('ocrWorkspace.errors.rejectionReasonRequired', 'Please enter a reason for rejecting this record.')
      );
      return;
    }

    const taskId = ocrRecord?.ocrId || `#OCR-${activeRecordId.slice(0, 8).toUpperCase()}`;
    rejectMutation.mutate(
      {
        ocrId: activeRecordId,
        reason: rejectionReason.trim(),
      },
      {
        onSuccess: () => {
          setIsRejectDialogOpen(false);
          showToast(
            t('ocrWorkspace.toasts.rejected', {
              id: taskId,
              defaultValue: `Record ${taskId} has been rejected.`,
            })
          );
          setTimeout(() => handleNav('/admin/ocr/queue'), 1200);
        },
        onError: (err: any) => {
          showToast(err?.message || 'Failed to submit rejection.');
        },
      }
    );
  };

  // Add Missing Clinical Row
  const handleAddMissingRow = () => {
    append({
      id: `cv-${Date.now()}`,
      testName: 'NEW ANALYTE',
      value: '1.0',
      unit: 'mg/dL',
      status: 'ok',
    });
    showToast(t('ocrWorkspace.toasts.rowAdded', 'New clinical row added.'));
  };

  const onFormError = () => {
    showToast('Please complete all required clinical fields before proceeding.');
  };

  // Confidence computation for circular gauge
  const recordConfidence = ocrRecord?.confidence ?? 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * recordConfidence) / 100;

  // Status pill styling helper
  const getStatusBadge = (status?: string) => {
    const s = (status || 'Pending').toLowerCase();
    if (s.includes('approved')) return 'ocr-status-pill-approved';
    if (s.includes('rejected')) return 'ocr-status-pill-rejected';
    if (s.includes('review')) return 'ocr-status-pill-review';
    return 'ocr-status-pill-pending';
  };

  // Render Loading State
  if (isQueueLoading || (activeRecordId && isRecordLoading)) {
    return (
      <div className="ocr-workspace-root">
        <AdminSidebar activeNav="ocr-queue" isDrawerOpen={isDrawerOpen} onCloseDrawer={() => setIsDrawerOpen(false)} onNavigate={handleNav} />
        <div className="careid-main-wrapper flex flex-col flex-1 h-screen overflow-hidden">
          <div className="flex-1 flex items-center justify-center bg-[#f8f9fb]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#28006d] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#494552] font-medium">
                {t('ocrWorkspace.loading', 'Loading OCR Verification Workspace from live backend...')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Missing Record Error State
  if (isRecordError || !ocrRecord) {
    return (
      <div className="ocr-workspace-root">
        <AdminSidebar activeNav="ocr-queue" isDrawerOpen={isDrawerOpen} onCloseDrawer={() => setIsDrawerOpen(false)} onNavigate={handleNav} />
        <div className="careid-main-wrapper flex flex-col flex-1 h-screen overflow-hidden">
          <div className="flex-1 flex items-center justify-center bg-[#f8f9fb] p-6">
            <div className="bg-white border border-[#cbc4d4] rounded-2xl p-8 max-w-md w-full shadow-lg text-center">
              <div className="w-14 h-14 bg-red-50 text-[#ba1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} />
              </div>
              <h2 className="text-xl font-bold text-[#191c1e] mb-2">
                {t('ocrWorkspace.notFound.title', 'OCR Record Not Found')}
              </h2>
              <p className="text-sm text-[#494552] mb-6">
                {t(
                  'ocrWorkspace.notFound.message',
                  'The OCR verification task you requested does not exist or has already been completed.'
                )}
              </p>
              <button
                type="button"
                onClick={() => handleNav('/admin/ocr/queue')}
                className="w-full bg-[#28006d] text-white py-2.5 px-4 rounded-full text-sm font-semibold hover:bg-[#1f0055] transition-colors inline-flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                <span>{t('ocrWorkspace.notFound.backBtn', 'Return to OCR Processing Queue')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const taskId = ocrRecord.ocrId;
  const taskStatus = ocrRecord.status;
  const documentTitle = ocrRecord.documentType;

  return (
    <div className="ocr-workspace-root">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#1e1b4b] text-white px-5 py-3 rounded-xl shadow-2xl border border-indigo-400/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 size={18} className="text-[#10b981]" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Shared CareID Sidebar */}
      <AdminSidebar
        activeNav="ocr-queue"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
        ctaLabel="+ New Record"
        onCtaClick={() => handleNav('/admin/records/upload')}
      />

      {/* Main Content Area */}
      <div className="careid-main-wrapper flex flex-col flex-1 h-screen overflow-hidden">
        {/* Top Global Navigation Bar */}
        <AdminHeader
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onNavigate={handleNav}
          showUploadRecord={true}
          onUploadRecord={() => handleNav('/admin/records/upload')}
        />

        {/* Scrollable Workspace Canvas */}
        <div className="ocr-workspace-canvas">
          {/* Workspace Header */}
          <section className="ocr-workspace-header" aria-label="Verification Task Header">
            <div className="ocr-workspace-task-meta">
              <div className="ocr-workspace-task-id-row">
                <button
                  type="button"
                  onClick={() => handleNav('/admin/ocr/queue')}
                  className="text-xs font-semibold text-[#494552] hover:text-[#28006d] flex items-center gap-1 transition-colors mr-2"
                >
                  <ArrowLeft size={14} />
                  <span>Queue</span>
                </button>
                <span className="ocr-workspace-task-id">
                  {t('ocrWorkspace.taskIdPrefix', 'VERIFICATION TASK ID:')} {taskId}
                </span>
                <span className={`ocr-status-pill ${getStatusBadge(taskStatus)}`}>
                  {taskStatus}
                </span>
              </div>
              <h1 className="ocr-workspace-title">{documentTitle}</h1>
            </div>

            <div className="ocr-workspace-actions">
              <button
                type="button"
                onClick={handleSubmit(handleSaveDraft, onFormError)}
                disabled={saveDraftMutation.isPending}
                className="ocr-btn-save-draft"
                id="ocr-save-draft-btn"
              >
                <span>
                  {saveDraftMutation.isPending
                    ? t('ocrWorkspace.actions.savingDraft', 'Saving Draft...')
                    : t('ocrWorkspace.actions.saveDraft', 'Save Draft')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRejectionReason('');
                  setRejectionError(null);
                  setIsRejectDialogOpen(true);
                }}
                className="ocr-btn-reject"
                id="ocr-reject-btn"
              >
                <span>{t('ocrWorkspace.actions.rejectOcr', 'Reject OCR')}</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit(handleApproveAndFile, onFormError)}
                disabled={approveMutation.isPending}
                className="ocr-btn-approve"
                id="ocr-approve-btn"
              >
                <span>
                  {approveMutation.isPending
                    ? t('ocrWorkspace.actions.approving', 'Approving...')
                    : t('ocrWorkspace.actions.approveAndFile', 'Approve & File')}
                </span>
              </button>
            </div>
          </section>

          {/* Three-Panel Workspace Layout */}
          <div className="ocr-workspace-panels-grid">
            {/* ----------------------------------------------------------- */}
            {/* LEFT PANEL: Source Document Preview */}
            {/* ----------------------------------------------------------- */}
            <section
              className="ocr-panel-card ocr-panel-doc"
              aria-label={t('ocrWorkspace.sourceDocument.title', 'Source Document')}
            >
              <div className="ocr-panel-header">
                <div className="ocr-panel-title-group">
                  <FileText size={18} className="text-[#28006d]" />
                  <h2 className="ocr-panel-title">
                    {t('ocrWorkspace.sourceDocument.title', 'Source Document')}
                  </h2>
                </div>

                {/* Zoom & Rotate Toolbar */}
                <div className="ocr-doc-toolbar" role="toolbar" aria-label="Document View Controls">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="ocr-doc-toolbar-btn"
                    title={t('ocrWorkspace.sourceDocument.zoomOut', 'Zoom Out')}
                    aria-label="Zoom Out"
                    id="ocr-zoom-out-btn"
                  >
                    <ZoomOut size={14} />
                  </button>

                  <span className="ocr-doc-zoom-label" id="ocr-zoom-level-indicator">
                    {zoomLevel}%
                  </span>

                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="ocr-doc-toolbar-btn"
                    title={t('ocrWorkspace.sourceDocument.zoomIn', 'Zoom In')}
                    aria-label="Zoom In"
                    id="ocr-zoom-in-btn"
                  >
                    <ZoomIn size={14} />
                  </button>

                  <div className="ocr-doc-toolbar-divider" />

                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="ocr-doc-toolbar-btn"
                    title={t('ocrWorkspace.sourceDocument.resetZoom', 'Reset Zoom')}
                    aria-label="Reset Zoom"
                    id="ocr-reset-zoom-btn"
                  >
                    <RotateCcw size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={handleRotate}
                    className="ocr-doc-toolbar-btn"
                    title="Rotate 90°"
                    aria-label="Rotate Document"
                    id="ocr-rotate-btn"
                  >
                    <RefreshCw size={14} />
                  </button>

                  <div className="ocr-doc-toolbar-divider" />

                  {/* Toggle between original scan view and raw extracted text */}
                  <button
                    type="button"
                    onClick={() => setDocViewMode(docViewMode === 'image' ? 'text' : 'image')}
                    className={`ocr-doc-toolbar-btn px-2 text-[11px] font-bold ${docViewMode === 'image' ? 'bg-[#28006d] text-white hover:bg-[#1f0055]' : 'bg-slate-100 text-[#494552]'}`}
                    title="Toggle between original scanned document and extracted text"
                    id="ocr-toggle-view-mode-btn"
                  >
                    <span>{docViewMode === 'image' ? 'Original Scan' : 'Extracted Text'}</span>
                  </button>
                </div>
              </div>

              {/* Document Canvas with Live Extracted Document Content */}
              <div className="ocr-doc-canvas">
                <div
                  className="ocr-doc-paper"
                  style={{
                    transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                  }}
                >
                  {/* Document Header */}
                  <div className="border-b-2 border-[#d4d4d4] pb-2 mb-4">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-[#737373] font-bold">
                      CAREID CLINICAL HEALTH VAULT - OCR SCAN
                    </p>
                    <p className="text-[10px] text-[#8c8c8c] tracking-tight">
                      ATTACHMENT ID: {ocrRecord.id}
                    </p>
                  </div>

                  {/* Original Scanned Document View (when authenticated downloadUrl is available) */}
                  {docViewMode === 'image' && ocrRecord.documentUrl && (ocrRecord.documentUrl.startsWith('http') || ocrRecord.documentUrl.startsWith('data:')) ? (
                    <div className="flex flex-col items-center justify-center p-2 bg-slate-50/50 rounded-lg">
                      <img
                        src={ocrRecord.documentUrl}
                        alt={`Scanned document for ${ocrRecord.ocrId}`}
                        className="max-w-full h-auto rounded shadow-sm object-contain"
                        style={{ maxHeight: '600px' }}
                      />
                    </div>
                  ) : ocrRecord.extractedText ? (
                    /* Raw Text Output from PaddleOCR */
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono whitespace-pre-wrap leading-relaxed text-[#191c1e] max-h-96 overflow-y-auto">
                      {ocrRecord.extractedText}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase font-mono mb-1">
                            Patient Name
                          </div>
                          <div className="p-1.5 rounded border-2 border-[#22c55e] bg-[rgba(34,197,94,0.12)] text-xs font-mono font-medium text-[#191c1e]">
                            {ocrRecord.patientName}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-gray-400 uppercase font-mono mb-1">
                            Patient ID / MRN
                          </div>
                          <div className="p-1.5 rounded border-2 border-[#22c55e] bg-[rgba(34,197,94,0.12)] text-xs font-mono font-medium text-[#191c1e]">
                            {ocrRecord.patientId}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase font-mono mb-1">
                            Collection Date
                          </div>
                          <div className="p-1.5 rounded border-2 border-[#22c55e] bg-[rgba(34,197,94,0.12)] text-xs font-mono text-[#191c1e]">
                            {ocrRecord.uploadDate}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-gray-400 uppercase font-mono mb-1">
                            Document Type
                          </div>
                          <div className="p-1.5 rounded border-2 border-[#22c55e] bg-[rgba(34,197,94,0.12)] text-xs font-mono text-[#191c1e]">
                            {ocrRecord.documentType}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-Page Navigation Footer */}
              <div className="ocr-doc-page-footer">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="ocr-doc-page-btn"
                  aria-label={t('ocrWorkspace.sourceDocument.prevPage', 'Previous Page')}
                  id="ocr-prev-page-btn"
                >
                  <ArrowLeft size={14} />
                </button>

                <span className="ocr-doc-page-text">
                  {t('ocrWorkspace.sourceDocument.pageIndicator', {
                    current: currentPage,
                    total: totalPages,
                    defaultValue: `Page ${currentPage} of ${totalPages}`,
                  })}
                </span>

                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="ocr-doc-page-btn"
                  aria-label={t('ocrWorkspace.sourceDocument.nextPage', 'Next Page')}
                  id="ocr-next-page-btn"
                >
                  <ArrowLeft size={14} className="rotate-180" />
                </button>
              </div>
            </section>

            {/* ----------------------------------------------------------- */}
            {/* CENTER PANEL: Extracted Data (Form) */}
            {/* ----------------------------------------------------------- */}
            <section
              className="ocr-panel-card ocr-panel-extracted"
              aria-label={t('ocrWorkspace.extractedData.title', 'Extracted Data')}
            >
              <div className="ocr-panel-header">
                <div className="ocr-panel-title-group">
                  <CheckCircle2 size={18} className="text-[#006a60]" />
                  <h2 className="ocr-panel-title">
                    {t('ocrWorkspace.extractedData.title', 'Extracted Data')}
                  </h2>
                </div>
              </div>

              <div className="ocr-extracted-content">
                <form id="ocr-verification-form" onSubmit={handleSubmit(handleApproveAndFile)}>
                  {/* Section 1: Patient & Document Meta */}
                  <div className="ocr-section-header">
                    <h3 className="ocr-section-title">
                      {t('ocrWorkspace.extractedData.patientMetaSection', 'PATIENT & DOCUMENT META')}
                    </h3>
                  </div>

                  <div className="ocr-meta-grid">
                    {/* Patient Name */}
                    <div className="ocr-meta-field">
                      <div className="ocr-field-label-row">
                        <label htmlFor="patientName" className="ocr-field-label">
                          {t('ocrWorkspace.extractedData.patientName', 'Patient Name')}
                        </label>
                        <span
                          className="ocr-confidence-dot ocr-confidence-dot-high"
                          title="High Confidence"
                        />
                      </div>
                      <input
                        id="patientName"
                        type="text"
                        {...register('patientName')}
                        className="ocr-input-high"
                      />
                      {errors.patientName && (
                        <span className="text-[11px] text-red-600 font-medium">
                          {errors.patientName.message}
                        </span>
                      )}
                    </div>

                    {/* Patient ID */}
                    <div className="ocr-meta-field">
                      <div className="ocr-field-label-row">
                        <label htmlFor="patientId" className="ocr-field-label">
                          {t('ocrWorkspace.extractedData.patientId', 'Patient ID')}
                        </label>
                        <span
                          className="ocr-confidence-dot ocr-confidence-dot-high"
                          title="High Confidence"
                        />
                      </div>
                      <input
                        id="patientId"
                        type="text"
                        {...register('patientId')}
                        className="ocr-input-high"
                      />
                      {errors.patientId && (
                        <span className="text-[11px] text-red-600 font-medium">
                          {errors.patientId.message}
                        </span>
                      )}
                    </div>

                    {/* Collection Date */}
                    <div className="ocr-meta-field">
                      <div className="ocr-field-label-row">
                        <label htmlFor="collectionDate" className="ocr-field-label">
                          {t('ocrWorkspace.extractedData.collectionDate', 'Collection Date')}
                        </label>
                        <span
                          className="ocr-confidence-dot ocr-confidence-dot-high"
                          title="High Confidence"
                        />
                      </div>
                      <div className="relative">
                        <input
                          id="collectionDate"
                          type="text"
                          {...register('collectionDate')}
                          className="ocr-input-high pr-8"
                        />
                        <Calendar
                          size={14}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        />
                      </div>
                      {errors.collectionDate && (
                        <span className="text-[11px] text-red-600 font-medium">
                          {errors.collectionDate.message}
                        </span>
                      )}
                    </div>

                    {/* Provider */}
                    <div className="ocr-meta-field">
                      <div className="ocr-field-label-row">
                        <label
                          htmlFor="provider"
                          className="ocr-field-label text-[#191c1e] font-semibold"
                        >
                          {t('ocrWorkspace.extractedData.provider', 'Provider')}
                        </label>
                        <span
                          className="ocr-confidence-dot ocr-confidence-dot-high"
                          title="Provider"
                        />
                      </div>
                      <input
                        id="provider"
                        type="text"
                        {...register('provider')}
                        className="ocr-input-high font-medium"
                      />
                      {errors.provider && (
                        <span className="text-[11px] text-red-600 font-medium">
                          {errors.provider.message}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Extracted Clinical Values */}
                  <div className="ocr-section-header mt-6">
                    <h3 className="ocr-section-title">
                      {t('ocrWorkspace.extractedData.clinicalValuesSection', 'EXTRACTED CLINICAL VALUES')}
                    </h3>
                  </div>

                  <table
                    className="ocr-clinical-table"
                    aria-label={t(
                      'ocrWorkspace.extractedData.clinicalValuesSection',
                      'Extracted Clinical Values'
                    )}
                  >
                    <thead>
                      <tr>
                        <th style={{ width: '40%' }}>
                          {t('ocrWorkspace.extractedData.table.testName', 'Test Name')}
                        </th>
                        <th style={{ width: '28%' }}>
                          {t('ocrWorkspace.extractedData.table.value', 'Value')}
                        </th>
                        <th style={{ width: '20%' }}>
                          {t('ocrWorkspace.extractedData.table.unit', 'Unit')}
                        </th>
                        <th style={{ width: '12%', textAlign: 'center' }}>
                          {t('ocrWorkspace.extractedData.table.status', 'Status')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => {
                        const isAlert = field.status === 'error' || field.isLowConfidence;
                        return (
                          <tr key={field.id} className={isAlert ? 'ocr-row-alert' : ''}>
                            {/* Test Name */}
                            <td>
                              <input
                                type="text"
                                {...register(`clinicalValues.${index}.testName` as const)}
                                className="ocr-table-input font-medium"
                                placeholder="Test name..."
                              />
                            </td>

                            {/* Value */}
                            <td>
                              <input
                                type="text"
                                {...register(`clinicalValues.${index}.value` as const)}
                                className={`ocr-table-input ocr-table-input-val ${
                                  isAlert ? 'text-[#ba1a1a] font-bold' : ''
                                }`}
                                placeholder="Value..."
                              />
                            </td>

                            {/* Unit */}
                            <td>
                              <input
                                type="text"
                                {...register(`clinicalValues.${index}.unit` as const)}
                                className="ocr-table-input text-[#494552]"
                                placeholder="Unit..."
                              />
                            </td>

                            {/* Status & Actions */}
                            <td className="text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {isAlert ? (
                                  <span title="Low Confidence / Discrepancy" className="inline-flex">
                                    <AlertCircle size={16} className="text-[#ba1a1a]" />
                                  </span>
                                ) : (
                                  <span title="Verified Match" className="inline-flex">
                                    <CheckCircle2 size={16} className="text-[#006a60]" />
                                  </span>
                                )}
                                {fields.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      remove(index);
                                      showToast(t('ocrWorkspace.toasts.rowRemoved', 'Row removed.'));
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                    title={t('ocrWorkspace.extractedData.removeRow', 'Remove Row')}
                                    aria-label={`Remove row ${index + 1}`}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Add Missing Row Button */}
                  <button
                    type="button"
                    onClick={handleAddMissingRow}
                    className="ocr-btn-add-row"
                    id="ocr-add-row-btn"
                  >
                    <Plus size={16} />
                    <span>{t('ocrWorkspace.extractedData.addMissingRow', 'Add Missing Row')}</span>
                  </button>
                </form>
              </div>
            </section>

            {/* ----------------------------------------------------------- */}
            {/* RIGHT PANEL: Analysis */}
            {/* ----------------------------------------------------------- */}
            <section
              className="ocr-panel-card ocr-panel-analysis"
              aria-label={t('ocrWorkspace.analysis.title', 'Analysis')}
            >
              <div className="ocr-panel-header">
                <div className="ocr-panel-title-group">
                  <h2 className="ocr-panel-title">
                    {t('ocrWorkspace.analysis.title', 'Analysis')}
                  </h2>
                </div>
              </div>

              <div className="ocr-analysis-content">
                {/* Circular Global Confidence Card */}
                <div className="ocr-global-confidence-card">
                  <div className="ocr-circle-meter-wrap">
                    <svg className="ocr-circle-meter-svg" viewBox="0 0 96 96">
                      <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        fill="none"
                        stroke="#cbc4d4"
                        strokeWidth="8"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        fill="none"
                        stroke={
                          recordConfidence >= 85
                            ? '#006a60'
                            : recordConfidence >= 60
                            ? '#f59e0b'
                            : '#ba1a1a'
                        }
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="ocr-circle-meter-text">{recordConfidence}%</span>
                  </div>

                  <div className="ocr-global-confidence-label">
                    <span>GLOBAL</span>
                    <span>CONFIDENCE</span>
                  </div>
                </div>

                {/* Engine Info & Validation Status */}
                <div className="p-4 bg-[#f8f9fb] border border-[#e2e8f0] rounded-xl flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#191c1e]">
                    <ShieldCheck size={16} className="text-[#006a60]" />
                    <span>Neural OCR Extraction</span>
                  </div>
                  <p className="text-[11px] text-[#494552] leading-relaxed">
                    Extracted using PaddleOCR engine. Overall document confidence is <strong>{recordConfidence}%</strong>.
                  </p>
                </div>

                {/* Alerts Section */}
                <div>
                  <div className="ocr-section-header">
                    <h3 className="ocr-section-title">
                      {t('ocrWorkspace.analysis.alerts', 'ALERTS')}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {recordConfidence >= 85 ? (
                      <div className="ocr-alert-card bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 size={18} className="text-[#006a60] shrink-0 mt-0.5" />
                        <div>
                          <h4 className="ocr-alert-title text-[#006a60]">
                            High Confidence Verified
                          </h4>
                          <p className="ocr-alert-desc text-[#006a60]">
                            All detected clinical entities meet required quality thresholds.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="ocr-alert-card ocr-alert-red">
                        <AlertCircle size={18} className="text-[#ba1a1a] shrink-0 mt-0.5" />
                        <div>
                          <h4 className="ocr-alert-title">
                            {t('ocrWorkspace.analysis.lowConfidenceAlert', 'Low Confidence Field')}
                          </h4>
                          <p className="ocr-alert-desc">
                            Document values require manual administrator review before indexing.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Rejection Modal Dialog */}
      {/* ------------------------------------------------------------- */}
      {isRejectDialogOpen && (
        <div
          className="ocr-dialog-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-dialog-title"
        >
          <div className="ocr-dialog-card">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 text-[#ba1a1a] flex items-center justify-center shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 id="reject-dialog-title" className="text-lg font-bold text-[#191c1e]">
                    {t('ocrWorkspace.rejectDialog.title', 'Reject OCR Extraction')}
                  </h3>
                  <p className="text-xs text-[#494552]">
                    {t(
                      'ocrWorkspace.rejectDialog.subtitle',
                      'Provide reason for rejecting this automated extraction.'
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="rejection-reason-input"
                  className="block text-xs font-semibold text-[#494552] mb-1.5"
                >
                  {t('ocrWorkspace.rejectDialog.reasonLabel', 'Rejection / Discrepancy Reason')}
                </label>
                <textarea
                  id="rejection-reason-input"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (rejectionError) setRejectionError(null);
                  }}
                  placeholder={t(
                    'ocrWorkspace.rejectDialog.reasonPlaceholder',
                    'e.g., Scan is illegible, incorrect patient matched, duplicate lab submission...'
                  )}
                  className="w-full border border-[#cbc4d4] rounded-lg p-3 text-sm text-[#191c1e] outline-none focus:border-[#ba1a1a] focus:ring-2 focus:ring-red-100 transition-all resize-none"
                />
                {rejectionError && (
                  <p className="text-xs text-red-600 mt-1 font-medium">{rejectionError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsRejectDialogOpen(false)}
                  className="px-4 py-2 border border-[#cbc4d4] rounded-full text-xs font-semibold text-[#494552] hover:bg-gray-100 transition-colors"
                >
                  {t('ocrWorkspace.rejectDialog.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={rejectMutation.isPending}
                  className="px-5 py-2 bg-[#ba1a1a] text-white rounded-full text-xs font-semibold hover:bg-[#931414] transition-colors inline-flex items-center gap-1.5"
                >
                  {rejectMutation.isPending ? (
                    <span>{t('ocrWorkspace.actions.rejecting', 'Rejecting...')}</span>
                  ) : (
                    <>
                      <X size={14} />
                      <span>{t('ocrWorkspace.rejectDialog.confirm', 'Confirm Rejection')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOcrVerificationWorkspace;
