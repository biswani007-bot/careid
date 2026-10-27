import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Menu,
  Search,
  Bell,
  Settings,
  HelpCircle,
  UploadCloud,
  FileText,
  AlertTriangle,
  Clock,
  X,
  CheckCircle2,
  Archive,
  RotateCcw,
  RefreshCw,
  FolderArchive,
} from 'lucide-react';

import AdminSidebar from '../common/AdminSidebar';
import {
  useUploadHealthRecordMutation,
  useArchiveHealthRecordMutation,
  useRestoreHealthRecordMutation,
  useArchivedRecordsQuery,
  type HealthRecordItem,
} from '../../services/healthRecordService';
import './AdminUploadRecord.css';

const uploadSchema = z.object({
  patientId: z
    .string()
    .min(1, 'Patient Care ID is required')
    .regex(/^CID-\d{4}-\d{4}/, 'Patient ID must match format CID-XXXX-XXXX'),
  category: z.enum(['Medical', 'Dental', 'Vision'], {
    errorMap: () => ({ message: 'Please select a clinical category' }),
  }),
  recordType: z.string().min(3, 'Record type must be at least 3 characters'),
  provider: z.string().min(2, 'Healthcare provider name is required'),
  facility: z.string().min(2, 'Facility name is required'),
  summary: z.string().min(10, 'Clinical summary must be at least 10 characters'),
});

type UploadFormData = z.infer<typeof uploadSchema>;

export interface AdminUploadRecordProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminUploadRecord: React.FC<AdminUploadRecordProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  // Mobile Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(85);
  const [showActiveUpload, setShowActiveUpload] = useState<boolean>(true);

  // Duplicate Warning Alert State (from Figma)
  const [showDuplicateWarning, setShowDuplicateWarning] = useState<boolean>(true);

  // Session Recent Uploads
  const [sessionUploads, setSessionUploads] = useState<HealthRecordItem[]>([]);

  // Dialog States (matching Figma 20:3607 and 20:3621)
  const [showArchiveDialog, setShowArchiveDialog] = useState<boolean>(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState<boolean>(false);
  const [archiveTargetFile, setArchiveTargetFile] = useState<string>('Patient_File_12B.pdf');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Mutations & Queries
  const uploadMutation = useUploadHealthRecordMutation();
  const archiveMutation = useArchiveHealthRecordMutation();
  const restoreMutation = useRestoreHealthRecordMutation();
  const { data: archivedRecords = [] } = useArchivedRecordsQuery();

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      patientId: 'CID-9205-1289',
      category: 'Dental',
      recordType: 'Full Panoramic OPG X-Ray',
      provider: 'Dr. Michael Chen',
      facility: 'Apex Dental Care Center',
      summary: 'High-resolution digital orthopantomogram evaluating mandibular and maxillary bone density and dental arches.',
    },
  });

  // Allowed file validation
  const validateAndSetFile = (file: File) => {
    setFileError(null);
    const validExtensions = ['.pdf', '.dcm', '.dicom', '.png', '.jpg', '.jpeg'];
    const fileName = file.name.toLowerCase();
    const isValidType = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidType) {
      setFileError(t('recordUpload.validation.invalidType', 'Unsupported file format. Please upload PDF, DICOM, PNG, or JPG.'));
      return false;
    }

    // 25MB size limit
    if (file.size > 25 * 1024 * 1024) {
      setFileError(t('recordUpload.validation.fileTooLarge', 'File size exceeds the 25MB limit.'));
      return false;
    }

    setSelectedFile(file);
    setShowActiveUpload(true);
    setUploadProgress(100);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const onSubmit = (data: UploadFormData) => {
    if (!selectedFile && !showActiveUpload) {
      setFileError(t('recordUpload.validation.fileRequired', 'Please select a document or scan to upload.'));
      return;
    }

    uploadMutation.mutate(
      {
        file: selectedFile || { name: 'Patient_Intake_Form_Smith_J.pdf', size: 14 * 1024 * 1024, type: 'application/pdf' },
        patientId: data.patientId,
        category: data.category,
        recordType: data.recordType,
        provider: data.provider,
        facility: data.facility,
        summary: data.summary,
      },
      {
        onSuccess: (newRecord) => {
          setSessionUploads((prev) => [newRecord, ...prev]);
          showToast(t('recordUpload.toasts.uploadSuccess', 'Document successfully uploaded and indexed in CareID Vault.'));
          setSelectedFile(null);
          reset();
        },
        onError: () => {
          showToast(t('recordUpload.toasts.uploadError', 'Failed to upload document. Please check the file and try again.'));
        },
      }
    );
  };

  const handleArchiveConfirm = () => {
    archiveMutation.mutate(
      { recordId: 'rec-10491', fileName: archiveTargetFile },
      {
        onSuccess: () => {
          showToast(t('recordLifecycle.archive.toastSuccess', { fileName: archiveTargetFile, defaultValue: `Record ${archiveTargetFile} successfully archived to Vault.` }));
          setShowArchiveDialog(false);
        },
      }
    );
  };

  const handleRestoreConfirm = () => {
    const targetArchive = archivedRecords[0] || { id: 'arch-1', fileName: 'Consultation_Notes_Nov2023.docx' };
    restoreMutation.mutate(
      { archiveId: targetArchive.id },
      {
        onSuccess: (restored) => {
          if (restored) {
            setSessionUploads((prev) => [restored, ...prev]);
          }
          showToast(t('recordLifecycle.restore.toastSuccess', { fileName: targetArchive.fileName, defaultValue: `Record ${targetArchive.fileName} restored back to active directory.` }));
          setShowRestoreDialog(false);
        },
      }
    );
  };

  return (
    <div className="upload-records-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#1e1b4b] text-white px-5 py-3 rounded-xl shadow-2xl border border-indigo-400/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 size={18} className="text-[#10b981]" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <AdminSidebar
        activeNav="records"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
        ctaLabel="+ New Record"
      />

      {/* Main Content Workspace */}
      <div className="careid-main-wrapper">
        {/* Stationary Top App Bar */}
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
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#28006d] text-base sm:text-lg">Health Vault 360 Admin</span>
            </div>
          </div>

          <div className="careid-header-center-search">
            <Search size={16} className="careid-header-search-icon" />
            <input
              type="text"
              placeholder={t('recordUpload.searchPlaceholder', 'Search records...')}
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
              className="bg-[#28006d] text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-[#3f1d8b] transition-colors shadow-xs"
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.click();
              }}
            >
              Upload Record
            </button>

            <div className="w-8 h-8 rounded-full bg-[#cbc4d4] p-0.5 overflow-hidden">
              <div className="w-full h-full rounded-full bg-[#28006d] text-white flex items-center justify-center font-bold text-xs">
                AD
              </div>
            </div>
          </div>
        </header>

        {/* Canvas Body */}
        <main className="upload-records-canvas" role="main">
          {/* Page Header */}
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-extrabold text-[#191c1e] tracking-tight">
              {t('recordUpload.title', 'Upload & Manage Records')}
            </h1>
            <p className="text-sm text-[#494552]">
              {t('recordUpload.subtitle', 'Securely ingest patient data or manage existing archival records.')}
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="upload-bento-grid">
            {/* Main Workspace: Upload Zone (2 columns) */}
            <div className="upload-main-card">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#28006d]/10 text-[#28006d] flex items-center justify-center">
                  <UploadCloud size={22} />
                </div>
                <h2 className="text-lg font-bold text-[#191c1e]">
                  {t('recordUpload.workspaceTitle', 'Upload Workspace')}
                </h2>
              </div>

              {/* Drag & Drop Area */}
              <div
                className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.dcm,.dicom,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                />

                <div className="upload-dropzone-icon">
                  <FileText size={24} />
                </div>

                <h3 className="text-base font-bold text-[#191c1e] mb-1">
                  {t('recordUpload.dragDropTitle', 'Drag & Drop files here')}
                </h3>
                <p className="text-sm text-[#494552] max-w-sm mb-4">
                  {t(
                    'recordUpload.dragDropSubtitle',
                    'Support for PDF, JPG, PNG, and DICOM formats up to 25MB per file.'
                  )}
                </p>

                <button
                  type="button"
                  className="px-5 py-2 bg-[#e1e2e4] hover:bg-[#d2d4d8] border border-[#cbc4d4] rounded-full text-xs font-bold text-[#191c1e] tracking-wide transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (fileInputRef.current) fileInputRef.current.click();
                  }}
                >
                  {t('recordUpload.browseFiles', 'Browse Files')}
                </button>
              </div>

              {fileError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Metadata Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
                <h3 className="font-bold text-sm text-[#191c1e] pb-2 border-b border-[#edf0f4]">
                  {t('recordUpload.metadataForm.title', 'Record Metadata Association')}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Patient ID */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="patientId" className="text-xs font-bold text-[#494552]">
                      {t('recordUpload.metadataForm.patientId', 'Patient Care ID')} *
                    </label>
                    <input
                      id="patientId"
                      type="text"
                      {...register('patientId')}
                      placeholder="CID-9205-1289"
                      className="px-3.5 py-2 rounded-lg border border-[#cbc4d4] bg-white text-xs font-mono outline-none focus:border-[#28006d]"
                    />
                    {errors.patientId && (
                      <span className="text-[11px] text-rose-600 font-medium">{errors.patientId.message}</span>
                    )}
                  </div>

                  {/* Category */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="category" className="text-xs font-bold text-[#494552]">
                      {t('recordUpload.metadataForm.category', 'Clinical Category')} *
                    </label>
                    <select
                      id="category"
                      {...register('category')}
                      className="px-3.5 py-2 rounded-lg border border-[#cbc4d4] bg-white text-xs font-semibold outline-none focus:border-[#28006d]"
                    >
                      <option value="Dental">Dental</option>
                      <option value="Medical">Medical</option>
                      <option value="Vision">Vision</option>
                    </select>
                    {errors.category && (
                      <span className="text-[11px] text-rose-600 font-medium">{errors.category.message}</span>
                    )}
                  </div>

                  {/* Record Type */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="recordType" className="text-xs font-bold text-[#494552]">
                      {t('recordUpload.metadataForm.recordType', 'Record Type')} *
                    </label>
                    <input
                      id="recordType"
                      type="text"
                      {...register('recordType')}
                      placeholder="e.g., Full Panoramic OPG X-Ray"
                      className="px-3.5 py-2 rounded-lg border border-[#cbc4d4] bg-white text-xs outline-none focus:border-[#28006d]"
                    />
                    {errors.recordType && (
                      <span className="text-[11px] text-rose-600 font-medium">{errors.recordType.message}</span>
                    )}
                  </div>

                  {/* Provider */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="provider" className="text-xs font-bold text-[#494552]">
                      {t('recordUpload.metadataForm.provider', 'Healthcare Provider')} *
                    </label>
                    <input
                      id="provider"
                      type="text"
                      {...register('provider')}
                      placeholder="e.g., Dr. Michael Chen"
                      className="px-3.5 py-2 rounded-lg border border-[#cbc4d4] bg-white text-xs outline-none focus:border-[#28006d]"
                    />
                    {errors.provider && (
                      <span className="text-[11px] text-rose-600 font-medium">{errors.provider.message}</span>
                    )}
                  </div>

                  {/* Facility */}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label htmlFor="facility" className="text-xs font-bold text-[#494552]">
                      {t('recordUpload.metadataForm.facility', 'Facility')} *
                    </label>
                    <input
                      id="facility"
                      type="text"
                      {...register('facility')}
                      placeholder="e.g., Apex Dental Care Center"
                      className="px-3.5 py-2 rounded-lg border border-[#cbc4d4] bg-white text-xs outline-none focus:border-[#28006d]"
                    />
                    {errors.facility && (
                      <span className="text-[11px] text-rose-600 font-medium">{errors.facility.message}</span>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label htmlFor="summary" className="text-xs font-bold text-[#494552]">
                      {t('recordUpload.metadataForm.summary', 'Clinical Summary')} *
                    </label>
                    <textarea
                      id="summary"
                      rows={2}
                      {...register('summary')}
                      placeholder="Enter clinical notes, diagnosis observations, or encounter details..."
                      className="px-3.5 py-2 rounded-lg border border-[#cbc4d4] bg-white text-xs outline-none focus:border-[#28006d] resize-none"
                    />
                    {errors.summary && (
                      <span className="text-[11px] text-rose-600 font-medium">{errors.summary.message}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={uploadMutation.isPending}
                    className="px-6 py-2.5 bg-[#28006d] text-white rounded-full text-xs font-bold hover:bg-[#3f1d8b] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {uploadMutation.isPending && <RefreshCw size={14} className="animate-spin" />}
                    <span>
                      {uploadMutation.isPending
                        ? t('recordUpload.metadataForm.submitting', 'Ingesting to Vault...')
                        : t('recordUpload.metadataForm.submit', 'Upload & Process Record')}
                    </span>
                  </button>
                </div>
              </form>

              {/* Active Uploads (Mocked from Figma 20:3491) */}
              <div className="flex flex-col gap-3 pt-4 border-t border-[#edf0f4]">
                <h4 className="text-xs font-bold text-[#494552] tracking-wider uppercase">
                  {t('recordUpload.currentUploads', { count: (showActiveUpload ? 1 : 0) + (showDuplicateWarning ? 1 : 0), defaultValue: `CURRENT UPLOADS (${(showActiveUpload ? 1 : 0) + (showDuplicateWarning ? 1 : 0)})` })}
                </h4>

                {/* Progress Item */}
                {showActiveUpload && (
                  <div className="bg-[#f8f9fb] border border-[#cbc4d4] rounded-lg p-3 flex items-center gap-4">
                    <div className="w-8 h-8 rounded bg-[#28006d]/10 text-[#28006d] flex items-center justify-center shrink-0">
                      <FileText size={15} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#191c1e] truncate">
                          {selectedFile?.name || 'Patient_Intake_Form_Smith_J.pdf'}
                        </span>
                        <span className="text-xs font-bold text-[#28006d]">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-[#e1e2e4] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#28006d] h-full rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowActiveUpload(false)}
                      className="p-1 text-[#7a7583] hover:text-[#191c1e] rounded"
                      title="Cancel Upload"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Validation / Duplicate Warning Item (from Figma 20:3509) */}
                {showDuplicateWarning && (
                  <div className="bg-[#ffdad6]/20 border border-[#ba1a1a]/30 rounded-lg p-3 flex items-start gap-4">
                    <div className="w-8 h-8 rounded bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle size={15} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-[#93000a] block">DICOM_Scan_0987.dcm</span>
                      <p className="text-[11px] text-[#494552] mt-0.5">
                        {t(
                          'recordUpload.duplicateWarningTitle',
                          { patientId: '8849', defaultValue: 'Duplicate detection: Similar record exists for Patient ID #8849.' }
                        )}
                      </p>

                      <div className="flex items-center gap-3 mt-2">
                        <button
                          type="button"
                          className="text-xs font-bold text-[#28006d] hover:underline"
                          onClick={() => handleNav('/admin/records/rec-10491')}
                        >
                          {t('recordUpload.reviewDetails', 'Review Details')}
                        </button>
                        <button
                          type="button"
                          className="text-xs font-bold text-[#494552] hover:underline"
                          onClick={() => {
                            setShowDuplicateWarning(false);
                            showToast(t('recordUpload.toasts.duplicateDismissed', 'Duplicate detection warning dismissed.'));
                          }}
                        >
                          {t('recordUpload.dismiss', 'Dismiss')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side Panel: Recent Uploads & Lifecycle Triggers */}
            <div className="flex flex-col gap-6">
              {/* Recent Uploads Card */}
              <div className="upload-side-card">
                <div className="p-4 border-b border-[#cbc4d4]">
                  <h3 className="font-bold text-sm text-[#191c1e]">
                    {t('recordUpload.recentUploads', 'Recent Uploads')}
                  </h3>
                </div>

                {sessionUploads.length === 0 ? (
                  /* Empty State Component (from Figma 20:3528) */
                  <div className="p-8 flex flex-col items-center justify-center text-center bg-[#f8f9fb] flex-1">
                    <div className="w-16 h-16 rounded-full bg-[#e7e8ea] text-[#7a7583] flex items-center justify-center mb-4">
                      <Clock size={28} />
                    </div>
                    <h4 className="font-bold text-sm text-[#191c1e] mb-1">
                      {t('recordUpload.noRecentRecords', 'No Records Found')}
                    </h4>
                    <p className="text-xs text-[#494552] max-w-[200px] leading-relaxed">
                      {t(
                        'recordUpload.noRecentSubtitle',
                        "You haven't uploaded any records in the current session."
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 flex flex-col gap-3 bg-[#f8f9fb] flex-1">
                    {sessionUploads.map((rec) => (
                      <div
                        key={rec.id}
                        className="bg-white border border-[#e2e8f0] p-3 rounded-xl flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-[#191c1e] truncate block">{rec.title}</span>
                          <span className="text-[11px] text-[#7a7583] font-mono">
                            {rec.recordNumber} • {rec.category}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="px-2.5 py-1 bg-[#28006d] text-white rounded-md text-[11px] font-bold shrink-0 hover:bg-[#3f1d8b]"
                          onClick={() => handleNav(`/admin/records/${rec.id}`)}
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Archival Vault Quick Lifecycle Actions Card */}
              <div className="bg-white border border-[#cbc4d4] rounded-xl p-5 shadow-xs flex flex-col gap-3">
                <div className="flex items-center gap-2 pb-2 border-b border-[#edf0f4]">
                  <FolderArchive size={16} className="text-[#28006d]" />
                  <h4 className="font-bold text-xs text-[#191c1e]">Record Lifecycle Actions</h4>
                </div>
                <p className="text-xs text-[#494552] leading-relaxed">
                  CareID immutable archival policies require verified administrator confirmation before records are moved to or from the cold archive vault.
                </p>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setArchiveTargetFile('Patient_File_12B.pdf');
                      setShowArchiveDialog(true);
                    }}
                    className="w-full py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg text-xs font-bold text-amber-900 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Archive size={14} />
                    <span>Archive Confirmation Dialog</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRestoreDialog(true)}
                    className="w-full py-2 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-lg text-xs font-bold text-teal-900 flex items-center justify-center gap-2 transition-colors"
                  >
                    <RotateCcw size={14} />
                    <span>Restore Record Dialog</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* =========================================================================
          DIALOG 1: Archive Confirmation Dialog (matching Figma 20:3607)
         ========================================================================= */}
      {showArchiveDialog && (
        <div
          className="lifecycle-modal-scrim"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowArchiveDialog(false)}
        >
          <div className="lifecycle-dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 flex flex-col gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                <Archive size={22} />
              </div>

              <h2 className="text-xl font-bold text-[#191c1e] pt-1">
                {t('recordLifecycle.archive.dialogTitle', 'Archive Record?')}
              </h2>

              <p className="text-sm text-[#494552] leading-relaxed">
                {t('recordLifecycle.archive.dialogMessage', {
                  fileName: archiveTargetFile,
                  defaultValue: `Are you sure you want to archive ${archiveTargetFile}? Archived records are removed from the active directory but will remain accessible in the Archive Vault history.`,
                })}
              </p>
            </div>

            <div className="p-4 bg-[#f8f9fb] border-t border-[#cbc4d4] flex items-center justify-end gap-3">
              <button
                type="button"
                className="px-5 py-2 rounded-full border border-[#7a7583] text-xs font-bold text-[#494552] hover:bg-white"
                onClick={() => setShowArchiveDialog(false)}
              >
                {t('recordLifecycle.archive.cancel', 'Cancel')}
              </button>

              <button
                type="button"
                disabled={archiveMutation.isPending}
                className="px-5 py-2 rounded-full bg-[#28006d] text-white text-xs font-bold hover:bg-[#3f1d8b] shadow-xs disabled:opacity-50"
                onClick={handleArchiveConfirm}
              >
                {archiveMutation.isPending ? 'Archiving...' : t('recordLifecycle.archive.confirm', 'Archive')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DIALOG 2: Restore Record Dialog (matching Figma 20:3621)
         ========================================================================= */}
      {showRestoreDialog && (
        <div
          className="lifecycle-modal-scrim"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowRestoreDialog(false)}
        >
          <div className="lifecycle-dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center">
                <RotateCcw size={22} />
              </div>

              <h2 className="text-xl font-bold text-[#191c1e]">
                {t('recordLifecycle.restore.dialogTitle', 'Restore Record')}
              </h2>

              {/* Archived File Preview Card */}
              <div className="bg-[#f8f9fb] border border-[#cbc4d4] rounded-lg p-3 flex items-center gap-3">
                <FileText size={18} className="text-[#28006d]" />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#191c1e] block truncate">
                    Consultation_Notes_Nov2023.docx
                  </span>
                  <span className="text-[11px] text-[#494552]">
                    {t('recordLifecycle.restore.archivedOn', { date: '12 Nov 2023', defaultValue: 'Archived on: 12 Nov 2023' })}
                  </span>
                </div>
              </div>

              <p className="text-sm text-[#494552] leading-relaxed">
                {t('recordLifecycle.restore.dialogMessage', {
                  patientId: '4421',
                  defaultValue: 'Restoring this document will move it back to the active Record Directory for Patient #4421.',
                })}
              </p>
            </div>

            <div className="p-4 bg-[#f8f9fb] border-t border-[#cbc4d4] flex items-center justify-end gap-3">
              <button
                type="button"
                className="px-5 py-2 rounded-full border border-[#7a7583] text-xs font-bold text-[#494552] hover:bg-white"
                onClick={() => setShowRestoreDialog(false)}
              >
                {t('recordLifecycle.restore.cancel', 'Cancel')}
              </button>

              <button
                type="button"
                disabled={restoreMutation.isPending}
                className="px-5 py-2 rounded-full bg-[#006a60] text-white text-xs font-bold hover:bg-[#00534b] flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                onClick={handleRestoreConfirm}
              >
                <RotateCcw size={12} />
                <span>{restoreMutation.isPending ? 'Restoring...' : t('recordLifecycle.restore.confirm', 'Restore')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUploadRecord;
