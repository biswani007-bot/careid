import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Menu,
  Search,
  Bell,
  Settings,
  HelpCircle,
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
} from 'lucide-react';

import AdminSidebar from '../common/AdminSidebar';
import {
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

  // Determine active record ID (fallback to first demo record if not provided)
  const activeRecordId = id || 'ocr-8821';

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
  const totalPages = 3;

  // Rejection Dialog State
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Query OCR Item
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
      patientName: 'Jane Doe',
      patientId: 'HV-884-2',
      collectionDate: '10/24/2023',
      provider: 'Dr. Smi??',
      clinicalValues: [
        { id: 'cv-1', testName: 'Glucose', value: '95', unit: 'mg/dL', status: 'ok' },
        { id: 'cv-2', testName: 'BUN', value: '14', unit: 'mg/dL', status: 'ok' },
        {
          id: 'cv-3',
          testName: 'Creatinine',
          value: '1.??',
          unit: 'mg/dL',
          status: 'error',
          isLowConfidence: true,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'clinicalValues',
  });

  // Populate form with record data when query returns
  useEffect(() => {
    if (ocrRecord) {
      // Map extractedFields or use default CMP blueprint
      const mappedClinical: Array<z.infer<typeof clinicalValueItemSchema>> = [];
      const keys = Object.keys(ocrRecord.extractedFields || {});

      if (keys.length > 0) {
        keys.forEach((key, idx) => {
          const rawVal = String(ocrRecord.extractedFields[key]);
          const parts = rawVal.split(' ');
          const val = parts[0] || rawVal;
          const unit = parts.slice(1).join(' ') || '';
          const hasError = val.includes('?') || ocrRecord.confidence < 75;

          mappedClinical.push({
            id: `cv-${idx}-${Date.now()}`,
            testName: key,
            value: val,
            unit: unit || 'mg/dL',
            status: hasError ? 'error' : 'ok',
            isLowConfidence: hasError,
          });
        });
      } else {
        mappedClinical.push(
          { id: 'cv-1', testName: 'Glucose', value: '95', unit: 'mg/dL', status: 'ok' },
          { id: 'cv-2', testName: 'BUN', value: '14', unit: 'mg/dL', status: 'ok' },
          {
            id: 'cv-3',
            testName: 'Creatinine',
            value: '1.??',
            unit: 'mg/dL',
            status: 'error',
            isLowConfidence: true,
          }
        );
      }

      reset({
        patientName: ocrRecord.patientName || 'Jane Doe',
        patientId: ocrRecord.patientId || 'HV-884-2',
        collectionDate: ocrRecord.uploadDate || '10/24/2023',
        provider: ocrRecord.reviewer !== 'Unassigned' ? ocrRecord.reviewer : 'Dr. Smi??',
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
    const taskId = ocrRecord?.ocrId || '#HV-992-OCR';
    const updatedExtracted: Record<string, string | number> = {};
    data.clinicalValues.forEach((row) => {
      updatedExtracted[row.testName] = `${row.value} ${row.unit}`.trim();
    });

    saveDraftMutation.mutate(
      {
        ocrId: ocrRecord?.ocrId || activeRecordId,
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
      }
    );
  };

  // Approve & File Action
  const handleApproveAndFile = (data: OcrVerificationFormData) => {
    const taskId = ocrRecord?.ocrId || '#HV-992-OCR';
    const updatedExtracted: Record<string, string | number> = {};
    data.clinicalValues.forEach((row) => {
      updatedExtracted[row.testName] = `${row.value} ${row.unit}`.trim();
    });

    // Save modifications first, then approve
    saveDraftMutation.mutate({
      ocrId: ocrRecord?.ocrId || activeRecordId,
      updates: {
        patientName: data.patientName,
        patientId: data.patientId,
        status: 'Approved',
        extractedFields: updatedExtracted,
      },
    });

    approveMutation.mutate(
      { ocrId: ocrRecord?.ocrId || activeRecordId },
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

    const taskId = ocrRecord?.ocrId || '#HV-992-OCR';
    rejectMutation.mutate(
      {
        ocrId: ocrRecord?.ocrId || activeRecordId,
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
      }
    );
  };

  // Add Missing Clinical Row
  const handleAddMissingRow = () => {
    append({
      id: `cv-${Date.now()}`,
      testName: 'New Analyte',
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
  const recordConfidence = ocrRecord?.confidence ?? 88;
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
  if (isRecordLoading) {
    return (
      <div className="ocr-workspace-root">
        <AdminSidebar activeNav="ocr" isDrawerOpen={isDrawerOpen} onCloseDrawer={() => setIsDrawerOpen(false)} onNavigate={handleNav} />
        <div className="careid-main-wrapper flex flex-col flex-1 h-screen overflow-hidden">
          <div className="flex-1 flex items-center justify-center bg-[#f8f9fb]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#28006d] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#494552] font-medium">
                {t('ocrWorkspace.loading', 'Loading OCR Verification Workspace...')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Missing Record Error State
  if (isRecordError || (!ocrRecord && activeRecordId !== 'ocr-8821')) {
    return (
      <div className="ocr-workspace-root">
        <AdminSidebar activeNav="ocr" isDrawerOpen={isDrawerOpen} onCloseDrawer={() => setIsDrawerOpen(false)} onNavigate={handleNav} />
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
                  'The OCR verification task you requested does not exist or has already been archived.'
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

  const taskId = ocrRecord?.ocrId || '#HV-992-OCR';
  const taskStatus = ocrRecord?.status || 'Pending';
  const documentTitle = ocrRecord?.documentType || 'Comprehensive Metabolic Panel';

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
        activeNav="ocr"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
        ctaLabel="+ New Record"
        onCtaClick={() => handleNav('/admin/records/upload')}
      />

      {/* Main Content Area */}
      <div className="careid-main-wrapper flex flex-col flex-1 h-screen overflow-hidden">
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
            <div className="flex items-center gap-2 text-sm font-semibold">
              <button
                type="button"
                onClick={() => handleNav('/admin/ocr/queue')}
                className="text-[#494552] hover:text-[#28006d] flex items-center gap-1.5 transition-colors font-medium"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">{t('ocrWorkspace.backToQueue', 'Back to OCR Queue')}</span>
              </button>
              <span className="text-[#cbc4d4]">/</span>
              <span className="text-[#0b1c30] font-bold">
                {t('ocrWorkspace.breadcrumbs.workspace', 'Verification Workspace')}
              </span>
            </div>
          </div>

          <div className="careid-header-center-search hidden md:flex">
            <Search size={16} className="careid-header-search-icon" />
            <input
              type="text"
              placeholder={t('ocrQueue.filters.searchPlaceholder', 'Search records, patients...')}
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
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#f43f5e] rounded-full ring-2 ring-white" />
            </button>

            <button
              type="button"
              className="p-2 text-[#494552] hover:text-[#28006d] hover:bg-[#f2f4f6] rounded-lg transition-colors"
              aria-label="System Settings"
              onClick={() => handleNav('/admin/settings')}
            >
              <Settings size={18} />
            </button>

            <button
              type="button"
              className="p-2 text-[#494552] hover:text-[#28006d] hover:bg-[#f2f4f6] rounded-lg transition-colors"
              aria-label="Help & Support"
            >
              <HelpCircle size={18} />
            </button>

            <div className="w-px h-6 bg-[#cbc4d4] hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#28006d] text-white flex items-center justify-center font-bold text-xs ring-2 ring-[#cbc4d4]">
                AD
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-[#191c1e]">Admin Console</span>
                <span className="text-[10px] text-[#494552]">Super Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Workspace Canvas */}
        <div className="ocr-workspace-canvas">
          {/* Workspace Header - Figma Node 20:4294 */}
          <section className="ocr-workspace-header" aria-label="Verification Task Header">
            <div className="ocr-workspace-task-meta">
              <div className="ocr-workspace-task-id-row">
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

          {/* Three-Panel Workspace Layout - Figma Node 20:4310 */}
          <div className="ocr-workspace-panels-grid">
            {/* ----------------------------------------------------------- */}
            {/* LEFT PANEL: Source Document Preview - Figma Node 20:4311 */}
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
                </div>
              </div>

              {/* Document Canvas with Bounding Boxes */}
              <div className="ocr-doc-canvas">
                <div
                  className="ocr-doc-paper"
                  style={{
                    transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                  }}
                >
                  {/* Faux Document Header */}
                  <div className="border-b-2 border-[#d4d4d4] pb-2 mb-6">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-[#737373] font-bold">
                      {t('ocrWorkspace.sourceDocument.memorialHospital', 'MEMORIAL HOSPITAL')}
                    </p>
                    <p className="text-[10px] text-[#8c8c8c] tracking-tight">
                      {t(
                        'ocrWorkspace.sourceDocument.clinicalLaboratory',
                        'DEPARTMENT OF PATHOLOGY & LABORATORY MEDICINE'
                      )}
                    </p>
                  </div>

                  {/* Document Content with Interactive OCR Bounding Boxes */}
                  <div className="space-y-4">
                    {/* High Confidence Token (Green) */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-mono mb-1">
                          Patient Name
                        </div>
                        <div
                          className="p-1.5 rounded border-2 border-[#22c55e] bg-[rgba(34,197,94,0.12)] text-xs font-mono font-medium text-[#191c1e]"
                          title="High Confidence: 98%"
                        >
                          {ocrRecord?.patientName || 'Jane Doe'}
                        </div>
                      </div>

                      {/* Medium Confidence Token (Amber) */}
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-mono mb-1">
                          Patient ID
                        </div>
                        <div
                          className="p-1.5 rounded border-2 border-[#f59e0b] bg-[rgba(245,158,11,0.12)] text-xs font-mono font-medium text-[#191c1e]"
                          title="Medium Confidence: 74%"
                        >
                          {ocrRecord?.patientId || 'HV-884-2'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-mono mb-1">
                          Collection Date
                        </div>
                        <div className="p-1.5 rounded border-2 border-[#22c55e] bg-[rgba(34,197,94,0.12)] text-xs font-mono text-[#191c1e]">
                          {ocrRecord?.uploadDate || '10/24/2023'}
                        </div>
                      </div>

                      {/* Low Confidence Token (Red) */}
                      <div>
                        <div className="text-[10px] text-[#ba1a1a] uppercase font-mono mb-1 font-bold">
                          Attending Provider
                        </div>
                        <div
                          className="p-1.5 rounded border-2 border-[#ba1a1a] bg-[rgba(186,26,26,0.12)] text-xs font-mono font-bold text-[#ba1a1a]"
                          title="Low Confidence: 42% (Uncertain spelling)"
                        >
                          Dr. Smi??
                        </div>
                      </div>
                    </div>

                    {/* Table Extract Representation */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="text-[11px] font-mono text-gray-500 uppercase font-semibold mb-2">
                        PANEL READINGS
                      </div>
                      <div className="space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between items-center p-1 rounded border border-[#22c55e] bg-[rgba(34,197,94,0.08)]">
                          <span>Glucose</span>
                          <span className="font-bold">95 mg/dL</span>
                        </div>
                        <div className="flex justify-between items-center p-1 rounded border border-[#22c55e] bg-[rgba(34,197,94,0.08)]">
                          <span>BUN</span>
                          <span className="font-bold">14 mg/dL</span>
                        </div>
                        <div className="flex justify-between items-center p-1 rounded border-2 border-[#ba1a1a] bg-[rgba(186,26,26,0.12)] text-[#ba1a1a]">
                          <span className="font-bold">Creatinine</span>
                          <span className="font-bold underline">1.?? mg/dL</span>
                        </div>
                      </div>
                    </div>

                    {/* Abstract scanned text lines */}
                    <div className="pt-4 space-y-1 opacity-40">
                      <div className="h-2 bg-gray-300 rounded w-full" />
                      <div className="h-2 bg-gray-300 rounded w-5/6" />
                      <div className="h-2 bg-gray-300 rounded w-3/4" />
                    </div>
                  </div>
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
            {/* CENTER PANEL: Extracted Data (Form) - Figma Node 20:4368 */}
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
                  {/* Section 1: Patient & Document Meta - Figma Node 20:4375 */}
                  <div className="ocr-section-header">
                    <h3 className="ocr-section-title">
                      {t('ocrWorkspace.extractedData.patientMetaSection', 'PATIENT & DOCUMENT META')}
                    </h3>
                  </div>

                  <div className="ocr-meta-grid">
                    {/* Patient Name (High Confidence) */}
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

                    {/* Patient ID (Medium Confidence) */}
                    <div className="ocr-meta-field">
                      <div className="ocr-field-label-row">
                        <label htmlFor="patientId" className="ocr-field-label">
                          {t('ocrWorkspace.extractedData.patientId', 'Patient ID')}
                        </label>
                        <span
                          className="ocr-confidence-dot ocr-confidence-dot-med"
                          title="Medium Confidence"
                        />
                      </div>
                      <input
                        id="patientId"
                        type="text"
                        {...register('patientId')}
                        className="ocr-input-med"
                      />
                      {errors.patientId && (
                        <span className="text-[11px] text-red-600 font-medium">
                          {errors.patientId.message}
                        </span>
                      )}
                    </div>

                    {/* Collection Date (High Confidence) */}
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

                    {/* Provider (Low Confidence / Red Alert) */}
                    <div className="ocr-meta-field">
                      <div className="ocr-field-label-row">
                        <label
                          htmlFor="provider"
                          className="ocr-field-label text-[#ba1a1a] font-bold"
                        >
                          {t('ocrWorkspace.extractedData.provider', 'Provider')}
                        </label>
                        <span
                          className="ocr-confidence-dot ocr-confidence-dot-low"
                          title="Low Confidence / Needs Review"
                        />
                      </div>
                      <input
                        id="provider"
                        type="text"
                        {...register('provider')}
                        className="ocr-input-low font-medium"
                      />
                      {errors.provider && (
                        <span className="text-[11px] text-red-600 font-medium">
                          {errors.provider.message}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Extracted Clinical Values - Figma Node 20:4415 */}
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

                  {/* Add Missing Row Button - Figma Node 20:4460 */}
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
            {/* RIGHT PANEL: Analysis - Figma Node 20:4464 */}
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
                {/* Circular Global Confidence Card - Figma Node 20:4469 */}
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

                {/* Alerts Section - Figma Node 20:4479 */}
                <div>
                  <div className="ocr-section-header">
                    <h3 className="ocr-section-title">
                      {t('ocrWorkspace.analysis.alerts', 'ALERTS')}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {/* Alert 1: Possible Duplicate (Amber) - Figma Node 20:4482 */}
                    <div className="ocr-alert-card ocr-alert-amber">
                      <AlertTriangle size={18} className="text-[#f59e0b] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="ocr-alert-title">
                          {t('ocrWorkspace.analysis.possibleDuplicate', 'Possible Duplicate')}
                        </h4>
                        <p className="ocr-alert-desc">
                          {t('ocrWorkspace.analysis.possibleDuplicateDesc', {
                            name: ocrRecord?.patientName || 'Jane Doe',
                            date: '2023-10-23',
                            defaultValue: `A metabolic panel for '${
                              ocrRecord?.patientName || 'Jane Doe'
                            }' was processed on 2023-10-23.`,
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Alert 2: Low Confidence Field (Red) - Figma Node 20:4490 */}
                    <div className="ocr-alert-card ocr-alert-red">
                      <AlertCircle size={18} className="text-[#ba1a1a] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="ocr-alert-title">
                          {t('ocrWorkspace.analysis.lowConfidenceAlert', 'Low Confidence Field')}
                        </h4>
                        <p className="ocr-alert-desc">
                          {t(
                            'ocrWorkspace.analysis.lowConfidenceAlertDesc',
                            'Provider name and Creatinine value require manual verification.'
                          )}
                        </p>
                      </div>
                    </div>
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
