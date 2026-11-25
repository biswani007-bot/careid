import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
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
  Search,
} from 'lucide-react';

import AdminSidebar from '../common/AdminSidebar';
import AdminHeader from '../common/AdminHeader';
import {
  useUploadHealthRecordMutation,
  useArchiveHealthRecordMutation,
  useRestoreHealthRecordMutation,
  useArchivedRecordsQuery,
  useHealthRecordsQuery,
  getVaultAttachments,
  validateDocumentFile,
  type HealthRecordItem,
} from '../../services/healthRecordService';
import {
  searchVerifiedPatients,
  type VerifiedPatientOption,
  type PatientSearchResponse,
} from '../../services/patientService';
import './AdminUploadRecord.css';

const uploadSchema = z.object({
  patientId: z
    .string()
    .trim()
    .min(3, 'Please select a verified patient'),
  category: z.enum(['Medical', 'Dental', 'Vision'], {
    errorMap: () => ({ message: 'Please select a clinical category' }),
  }),
  recordType: z.string().trim().optional(),
  provider: z.string().trim().optional(),
  facility: z.string().trim().optional(),
  summary: z.string().trim().optional(),
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
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showActiveUpload, setShowActiveUpload] = useState<boolean>(false);
  const [isValidatingFile, setIsValidatingFile] = useState<boolean>(false);
  const [validatedFileMeta, setValidatedFileMeta] = useState<{
    name: string;
    sizeFormatted: string;
    format: string;
    mimeType: string;
  } | null>(null);

  // Verified Patient Autocomplete State
  const [selectedPatient, setSelectedPatient] = useState<VerifiedPatientOption | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>('');
  const [isSearchingPatient, setIsSearchingPatient] = useState<boolean>(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const [verifiedPatientResults, setVerifiedPatientResults] = useState<VerifiedPatientOption[]>([]);
  const [unverifiedPatientMatches, setUnverifiedPatientMatches] = useState<PatientSearchResponse['unverifiedMatches']>([]);
  const patientSearchTimerRef = useRef<any>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Duplicate Warning Alert State (from Figma)
  const [showDuplicateWarning, setShowDuplicateWarning] = useState<boolean>(false);

  // Session Recent Uploads (seeded from persistent Vault attachments)
  const [sessionUploads, setSessionUploads] = useState<HealthRecordItem[]>(() => getVaultAttachments());

  // Dialog States (matching Figma 20:3607 and 20:3621)
  const [showArchiveDialog, setShowArchiveDialog] = useState<boolean>(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState<boolean>(false);
  const [archiveTargetFile, setArchiveTargetFile] = useState<string>('Patient_File_12B.pdf');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Mutations & Queries
  const uploadMutation = useUploadHealthRecordMutation();
  const archiveMutation = useArchiveHealthRecordMutation();
  const restoreMutation = useRestoreHealthRecordMutation();
  const { data: archivedRecords = [] } = useArchivedRecordsQuery();

  // Live Recent Uploads from backend + session uploads
  const { data: healthRecordsData, isLoading: isLoadingRecent } = useHealthRecordsQuery({
    page: 1,
    pageSize: 5,
  });

  const recentRecords = useMemo(() => {
    const backendRecords = healthRecordsData?.records || [];
    const combined = [...sessionUploads];
    for (const r of backendRecords) {
      if (!combined.some((c) => c.id === r.id)) {
        combined.push(r);
      }
    }
    return combined.slice(0, 5);
  }, [sessionUploads, healthRecordsData]);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      patientId: '',
      category: 'Medical',
      recordType: '',
      provider: '',
      facility: '',
      summary: '',
    },
  });

  // Cleanup timers & click outside listeners
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (patientSearchTimerRef.current) clearTimeout(patientSearchTimerRef.current);
    };
  }, []);

  const executePatientSearch = async (query: string) => {
    setIsSearchingPatient(true);
    try {
      const res = await searchVerifiedPatients(query);
      setVerifiedPatientResults(res.verifiedPatients);
      setUnverifiedPatientMatches(res.unverifiedMatches);
      setIsSearchDropdownOpen(true);
    } catch (err) {
      console.error('Failed to search verified patients:', err);
      setVerifiedPatientResults([]);
      setUnverifiedPatientMatches([]);
    } finally {
      setIsSearchingPatient(false);
    }
  };

  const handlePatientSearchInputChange = (val: string) => {
    setPatientSearchQuery(val);
    if (patientSearchTimerRef.current) clearTimeout(patientSearchTimerRef.current);

    patientSearchTimerRef.current = setTimeout(() => {
      executePatientSearch(val);
    }, 300);
  };

  const handlePatientInputFocus = () => {
    if (!selectedPatient) {
      setIsSearchDropdownOpen(true);
      executePatientSearch(patientSearchQuery);
    }
  };

  const handleSelectPatient = (patient: VerifiedPatientOption) => {
    setSelectedPatient(patient);
    setValue('patientId', patient.id, { shouldValidate: true });
    clearErrors('patientId');
    setIsSearchDropdownOpen(false);
    setPatientSearchQuery('');
  };

  const handleClearSelectedPatient = () => {
    setSelectedPatient(null);
    setValue('patientId', '', { shouldValidate: true });
    setPatientSearchQuery('');
    setTimeout(() => {
      executePatientSearch('');
    }, 50);
  };

  // Asynchronous binary signature and file validation
  const validateAndSetFile = async (file: File) => {
    setFileError(null);
    setIsValidatingFile(true);

    try {
      const res = await validateDocumentFile(file);
      if (!res.isValid) {
        setFileError(res.error || 'Invalid file format or corrupted contents.');
        setSelectedFile(null);
        setValidatedFileMeta(null);
        setShowActiveUpload(false);
        return false;
      }

      setSelectedFile(file);
      setValidatedFileMeta({
        name: file.name,
        sizeFormatted: res.fileSizeFormatted,
        format: res.detectedFormat || 'Document',
        mimeType: res.detectedMimeType || file.type || 'application/octet-stream',
      });
      setShowActiveUpload(true);
      setUploadProgress(100);
      return true;
    } catch (err: any) {
      setFileError(err?.message || 'File inspection failed.');
      setSelectedFile(null);
      setValidatedFileMeta(null);
      setShowActiveUpload(false);
      return false;
    } finally {
      setIsValidatingFile(false);
    }
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
    if (!selectedPatient) {
      setError('patientId', {
        type: 'manual',
        message: 'A verified patient must be selected before uploading documents.',
      });
      return;
    }

    if (!selectedFile) {
      setFileError(t('recordUpload.validation.fileRequired', 'Please select a document or scan to upload.'));
      return;
    }

    setUploadProgress(40);
    uploadMutation.mutate(
      {
        file: selectedFile,
        patientId: selectedPatient.id,
        category: data.category,
        recordType: data.recordType || undefined,
        provider: data.provider || undefined,
        facility: data.facility || undefined,
        summary: data.summary || undefined,
      },
      {
        onSuccess: (newRecord) => {
          setUploadProgress(100);
          setSessionUploads((prev) => [newRecord, ...prev]);
          showToast(t('recordUpload.toasts.attachmentSuccess', 'Document successfully uploaded and indexed in CareID Document Vault.'));
          setSelectedFile(null);
          setValidatedFileMeta(null);
          setShowActiveUpload(false);
          reset({
            patientId: selectedPatient.id,
            category: data.category,
            recordType: '',
            provider: '',
            facility: '',
            summary: '',
          });
        },
        onError: (err: any) => {
          setUploadProgress(0);
          showToast(err?.message || t('recordUpload.toasts.uploadError', 'Failed to upload document. Please check the file and try again.'));
        },
      }
    );
  };

  const handleArchiveConfirm = () => {
    archiveMutation.mutate(
      { recordId: '4f6e73c6-6711-407e-9823-79d433d887fd', fileName: archiveTargetFile },
      {
        onSuccess: () => {
          showToast(t('recordLifecycle.archive.toastSuccess', { fileName: archiveTargetFile, defaultValue: `Record ${archiveTargetFile} successfully archived to Vault.` }));
          setShowArchiveDialog(false);
        },
        onError: (err: any) => {
          showToast(err?.message || 'Archival request completed.');
          setShowArchiveDialog(false);
        },
      }
    );
  };

  const handleRestoreConfirm = () => {
    const targetArchive = archivedRecords[0] || { id: '4f6e73c6-6711-407e-9823-79d433d887fd', fileName: 'Consultation_Notes_Nov2023.docx' };
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
        onError: (err: any) => {
          showToast(err?.message || 'Restore request completed.');
          setShowRestoreDialog(false);
        },
      }
    );
  };

  return (
    <div className="upload-records-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="upload-toast-notification fixed top-5 right-5 z-50 bg-[#1e1b4b] text-white px-5 py-3 rounded-xl shadow-2xl border border-indigo-400/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
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
        {/* Shared CareID Admin Header */}
        <AdminHeader
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onNavigate={handleNav}
          showUploadRecord={true}
          onUploadRecord={() => {
            if (fileInputRef.current) fileInputRef.current.click();
          }}
        />

        {/* Canvas Body */}
        <main className="upload-records-canvas" role="main">
          {/* Page Header Strip */}
          <div className="upload-header-strip">
            <h1 className="upload-header-title">
              {t('recordUpload.title', 'Upload & Manage Records')}
            </h1>
            <p className="upload-header-subtitle">
              {t('recordUpload.subtitle', 'Securely ingest patient data or manage existing archival records.')}
            </p>
          </div>

          {/* 70% / 30% Two-Column Bento Grid Layout */}
          <div className="upload-bento-grid">
            {/* Left Column: Upload Main Workspace Card (~70%) */}
            <div className="upload-main-card">
              {/* Card Header */}
              <div className="upload-card-header">
                <div className="upload-card-header-icon">
                  <UploadCloud size={20} />
                </div>
                <h2 className="upload-card-header-title">
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
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileChange}
                />

                <div className="upload-dropzone-icon">
                  <FileText size={22} />
                </div>

                <h3 className="upload-dropzone-title">
                  {t('recordUpload.dragDropTitle', 'Drag & Drop files here')}
                </h3>
                <p className="upload-dropzone-subtitle">
                  {t(
                    'recordUpload.dragDropSubtitle',
                    'Support for PDF, JPG, PNG, and WEBP formats up to 15MB per file.'
                  )}
                </p>

                <button
                  type="button"
                  className="upload-browse-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (fileInputRef.current) fileInputRef.current.click();
                  }}
                >
                  {t('recordUpload.browseFiles', 'Browse Files')}
                </button>
              </div>

              {/* File Inspection & Validation Feedback State */}
              {isValidatingFile && (
                <div className="upload-feedback-card validating">
                  <RefreshCw size={15} className="animate-spin shrink-0 mt-0.5" />
                  <span>Inspecting file binary signatures and format integrity...</span>
                </div>
              )}

              {fileError && (
                <div className="upload-feedback-card error">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <strong className="block text-rose-950 font-bold mb-0.5">File Validation Error</strong>
                    <span className="leading-relaxed">{fileError}</span>
                  </div>
                </div>
              )}

              {selectedFile && validatedFileMeta && !fileError && (
                <div className="upload-verified-file-card">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="upload-verified-icon">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#191c1e] truncate" title={validatedFileMeta.name}>
                          {validatedFileMeta.name}
                        </span>
                        <span className="upload-verified-badge">
                          {validatedFileMeta.format}
                        </span>
                      </div>
                      <span className="text-[11.5px] text-[#5c5966] block truncate">
                        Size: <strong>{validatedFileMeta.sizeFormatted}</strong> • MIME: <code className="font-mono text-emerald-800">{validatedFileMeta.mimeType}</code> • Binary Signature Confirmed
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setValidatedFileMeta(null);
                      setShowActiveUpload(false);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 rounded-md text-[#7a7583] hover:text-[#191c1e] hover:bg-emerald-200/50 transition-colors shrink-0"
                    title="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Metadata Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="upload-metadata-form">
                <h3 className="upload-form-section-title">
                  {t('recordUpload.metadataForm.title', 'Record Metadata Association')}
                </h3>

                <div className="upload-form-grid">
                  {/* Row 1 Left: Verified Patient Search & Autocomplete */}
                  <div className="upload-form-group">
                    <label htmlFor="patientSearchInput" className="upload-form-label">
                      <span>
                        {t('recordUpload.metadataForm.patientId', 'Patient Care ID / Verified Patient')} <span className="req-star">*</span>
                      </span>
                      {selectedPatient && (
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={12} /> {selectedPatient.fullName}
                        </span>
                      )}
                    </label>

                    {selectedPatient ? (
                      /* Confirmed Verified Patient Card */
                      <div className="patient-confirmed-card" id="confirmed-patient-card">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="patient-item-avatar">
                            {selectedPatient.fullName
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-[13px] text-[#191c1e] truncate">
                                {selectedPatient.fullName}
                              </span>
                              <span className="patient-item-verified-badge">
                                <CheckCircle2 size={11} /> Verified
                              </span>
                            </div>
                            <div className="text-[11.5px] text-[#5c5966] font-mono flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="font-semibold text-[#28006d]">{selectedPatient.patientNumber}</span>
                              {selectedPatient.bloodGroup && (
                                <span className="text-gray-400">• Blood: {selectedPatient.bloodGroup}</span>
                              )}
                              {selectedPatient.gender && (
                                <span className="text-gray-400">• {selectedPatient.gender}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearSelectedPatient}
                          className="patient-confirmed-change-btn"
                          id="change-patient-btn"
                          title="Select a different patient"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      /* Patient Search Input & Autocomplete Dropdown */
                      <div className="patient-autocomplete-container" ref={searchContainerRef}>
                        <div className="patient-search-input-wrapper">
                          <Search size={16} className="patient-search-icon" />
                          <input
                            id="patientSearchInput"
                            type="text"
                            value={patientSearchQuery}
                            onChange={(e) => handlePatientSearchInputChange(e.target.value)}
                            onFocus={handlePatientInputFocus}
                            placeholder="Search verified patient by Name or Care ID (e.g. PT-CAREID-2026-0004, Marcus)..."
                            className="patient-search-input"
                            autoComplete="off"
                          />
                          {isSearchingPatient ? (
                            <RefreshCw size={14} className="patient-search-spinner animate-spin" />
                          ) : patientSearchQuery ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPatientSearchQuery('');
                                executePatientSearch('');
                              }}
                              className="patient-search-clear-btn"
                              title="Clear search"
                            >
                              <X size={14} />
                            </button>
                          ) : null}
                        </div>

                        {/* Dropdown Results */}
                        {isSearchDropdownOpen && (
                          <div className="patient-dropdown-menu" id="patient-autocomplete-dropdown">
                            {isSearchingPatient ? (
                              <div className="patient-dropdown-feedback flex items-center gap-2 justify-center py-6">
                                <RefreshCw size={14} className="animate-spin text-[#28006d]" />
                                <span>Searching verified patients in CareID registry...</span>
                              </div>
                            ) : verifiedPatientResults.length > 0 ? (
                              <>
                                <div className="patient-dropdown-header">
                                  Verified Patients ({verifiedPatientResults.length})
                                </div>
                                {verifiedPatientResults.map((patient) => (
                                  <div
                                    key={patient.id}
                                    onClick={() => handleSelectPatient(patient)}
                                    className="patient-dropdown-item"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleSelectPatient(patient);
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="patient-item-avatar">
                                        {patient.fullName
                                          .split(' ')
                                          .map((n) => n[0])
                                          .slice(0, 2)
                                          .join('')
                                          .toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-semibold text-[13px] text-[#191c1e] truncate">
                                            {patient.fullName}
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-[#5c5966] font-mono flex items-center gap-2 flex-wrap">
                                          <span className="font-bold text-[#28006d]">{patient.patientNumber}</span>
                                          {patient.bloodGroup && (
                                            <span className="text-gray-400">• Blood: {patient.bloodGroup}</span>
                                          )}
                                          {patient.gender && (
                                            <span className="text-gray-400">• {patient.gender}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <span className="patient-item-verified-badge">
                                      <CheckCircle2 size={11} /> Verified
                                    </span>
                                  </div>
                                ))}
                              </>
                            ) : null}

                            {/* Unverified / Excluded Warning Notice */}
                            {!isSearchingPatient && unverifiedPatientMatches.length > 0 && (
                              <div className="p-3 bg-amber-50 border-t border-amber-200 text-amber-900 text-[11.5px] leading-relaxed">
                                <div className="font-semibold flex items-center gap-1.5 text-amber-950 mb-1">
                                  <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                                  <span>Unverified Account(s) Excluded</span>
                                </div>
                                {unverifiedPatientMatches.map((unv, idx) => (
                                  <div key={idx} className="mt-1 pl-4">
                                    • <strong>{unv.fullName}</strong> ({unv.patientNumber}) has status <code className="bg-amber-100 px-1 py-0.5 rounded text-[10.5px]">{unv.status}</code> ({unv.reason}). Document uploads require verified, active patient accounts.
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Zero Matches Feedback */}
                            {!isSearchingPatient &&
                              verifiedPatientResults.length === 0 &&
                              unverifiedPatientMatches.length === 0 && (
                                <div className="patient-dropdown-feedback text-center py-5">
                                  <p className="font-medium text-[#191c1e]">No verified patients found</p>
                                  <p className="text-[11px] text-[#7a7583] mt-0.5">
                                    Try searching with a full Patient Care ID (e.g. <code>PT-CAREID-2026-0004</code>) or patient name.
                                  </p>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hidden input to satisfy react-hook-form registration */}
                    <input type="hidden" {...register('patientId')} />

                    {errors.patientId && (
                      <span className="upload-form-error">{errors.patientId.message}</span>
                    )}
                  </div>

                  {/* Row 1 Right: Clinical Category */}
                  <div className="upload-form-group">
                    <label htmlFor="category" className="upload-form-label">
                      <span>
                        {t('recordUpload.metadataForm.category', 'Clinical Category')} <span className="req-star">*</span>
                      </span>
                    </label>
                    <select
                      id="category"
                      {...register('category')}
                      className="upload-form-select"
                    >
                      <option value="Dental">Dental</option>
                      <option value="Medical">Medical</option>
                      <option value="Vision">Vision</option>
                    </select>
                    {errors.category && (
                      <span className="upload-form-error">{errors.category.message}</span>
                    )}
                  </div>

                  {/* Row 2 Left: Record Type (Optional) */}
                  <div className="upload-form-group">
                    <label htmlFor="recordType" className="upload-form-label">
                      <span>{t('recordUpload.metadataForm.recordType', 'Document Label / Type')}</span>
                      <span className="opt-tag">(Optional)</span>
                    </label>
                    <input
                      id="recordType"
                      type="text"
                      {...register('recordType')}
                      placeholder="e.g., Full Panoramic OPG X-Ray, Blood Chemistry"
                      className="upload-form-input"
                    />
                  </div>

                  {/* Row 2 Right: Provider (Optional) */}
                  <div className="upload-form-group">
                    <label htmlFor="provider" className="upload-form-label">
                      <span>{t('recordUpload.metadataForm.provider', 'Healthcare Provider')}</span>
                      <span className="opt-tag">(Optional)</span>
                    </label>
                    <input
                      id="provider"
                      type="text"
                      {...register('provider')}
                      placeholder="e.g., Dr. Michael Chen"
                      className="upload-form-input"
                    />
                  </div>

                  {/* Row 3 Full Width: Facility (Optional) */}
                  <div className="upload-form-group col-span-full">
                    <label htmlFor="facility" className="upload-form-label">
                      <span>{t('recordUpload.metadataForm.facility', 'Facility')}</span>
                      <span className="opt-tag">(Optional)</span>
                    </label>
                    <input
                      id="facility"
                      type="text"
                      {...register('facility')}
                      placeholder="e.g., Apex Dental Care Center"
                      className="upload-form-input"
                    />
                  </div>

                  {/* Row 4 Full Width: Summary (Optional) */}
                  <div className="upload-form-group col-span-full">
                    <label htmlFor="summary" className="upload-form-label">
                      <span>{t('recordUpload.metadataForm.summary', 'Administrative Vault Notes')}</span>
                      <span className="opt-tag">(Optional)</span>
                    </label>
                    <textarea
                      id="summary"
                      rows={2}
                      {...register('summary')}
                      placeholder="Enter optional indexing notes, observations, or encounter details..."
                      className="upload-form-textarea"
                    />
                  </div>

                  {/* Row 5 Full Width: Backend Storage Notice (Never clipped, natural wrapping) */}
                  <div className="upload-storage-notice col-span-full">
                    <FileText size={16} className="text-[#28006d] shrink-0 mt-0.5" />
                    <div>
                      <strong>Backend Storage Notice:</strong> Uploaded binary files are securely persisted in the CareID Vault and linked to the patient profile and clinical category. Optional indexing notes below are stored in the administrator vault cache; formal clinical encounter attestation is reserved for attending physicians.
                    </div>
                  </div>
                </div>

                {/* Form Actions: Upload & Process Record Button */}
                <div className="upload-form-actions">
                  <button
                    type="submit"
                    disabled={uploadMutation.isPending || !selectedFile || Boolean(fileError) || isValidatingFile || !selectedPatient}
                    className="upload-submit-btn"
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

              {/* Current Uploads Section */}
              <div className="upload-current-section">
                <h4 className="upload-current-header">
                  {t('recordUpload.currentUploads', {
                    count: (showActiveUpload ? 1 : 0) + (showDuplicateWarning ? 1 : 0),
                    defaultValue: `CURRENT UPLOADS (${(showActiveUpload ? 1 : 0) + (showDuplicateWarning ? 1 : 0)})`,
                  })}
                </h4>

                {/* Progress Item */}
                {showActiveUpload && (
                  <div className="upload-progress-card">
                    <div className="upload-progress-icon">
                      <FileText size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className="text-xs font-bold text-[#191c1e] truncate"
                          title={selectedFile?.name || 'Patient_Intake_Form_Smith_J.pdf'}
                        >
                          {selectedFile?.name || 'Patient_Intake_Form_Smith_J.pdf'}
                        </span>
                        <span className="text-xs font-bold text-[#28006d]">{uploadProgress}%</span>
                      </div>
                      <div className="upload-progress-bar-bg">
                        <div
                          className="upload-progress-bar-fill"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowActiveUpload(false)}
                      className="p-1 text-[#7a7583] hover:text-[#191c1e] rounded transition-colors shrink-0"
                      title="Cancel Upload"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                {/* Validation / Duplicate Warning Item */}
                {showDuplicateWarning && (
                  <div className="bg-[#ffdad6]/25 border border-[#ba1a1a]/30 rounded-xl p-3.5 flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-[#93000a] block truncate">DICOM_Scan_0987.dcm</span>
                      <p className="text-[11.5px] text-[#494552] mt-0.5 leading-relaxed">
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

            {/* Right Column: Recent Uploads & Lifecycle Actions (~30%) */}
            <div className="upload-side-column">
              {/* Recent Uploads Card */}
              <div className="upload-side-card">
                <div className="upload-side-card-header">
                  <h3 className="upload-side-card-title">
                    {t('recordUpload.recentUploads', 'Recent Uploads')}
                  </h3>
                  {recentRecords.length > 0 && (
                    <span className="upload-side-card-badge">
                      {recentRecords.length}
                    </span>
                  )}
                </div>

                {isLoadingRecent && recentRecords.length === 0 ? (
                  <div className="p-4 flex flex-col gap-2.5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="bg-white border border-[#e2e8f0] p-3 rounded-xl animate-pulse flex items-center justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentRecords.length === 0 ? (
                  <div className="upload-recent-empty">
                    <div className="upload-recent-empty-icon">
                      <Clock size={24} />
                    </div>
                    <h4 className="font-bold text-sm text-[#191c1e] mb-1">
                      {t('recordUpload.noRecentRecords', 'No Records Found')}
                    </h4>
                    <p className="text-xs text-[#5c5966] max-w-[220px] leading-relaxed">
                      {t(
                        'recordUpload.noRecentSubtitle',
                        "No uploaded records recorded yet."
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="upload-recent-list">
                    {recentRecords.map((rec) => (
                      <div
                        key={rec.id}
                        className="upload-recent-item"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <span
                            className="upload-recent-item-title block truncate"
                            title={rec.title}
                          >
                            {rec.title}
                          </span>
                          <span
                            className="upload-recent-item-meta block truncate"
                            title={`${rec.recordNumber} • ${rec.category} • ${rec.patientName}`}
                          >
                            {rec.recordNumber} • {rec.category} • {rec.patientName}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="upload-recent-view-btn"
                          onClick={() => handleNav(`/admin/records/${rec.id}`)}
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Record Lifecycle Actions Card */}
              <div className="upload-lifecycle-card">
                <div className="upload-lifecycle-header">
                  <FolderArchive size={16} className="text-[#28006d]" />
                  <h4 className="upload-lifecycle-title">Record Lifecycle Actions</h4>
                </div>
                <p className="upload-lifecycle-desc">
                  CareID immutable archival policies require verified administrator confirmation before records are moved to or from the cold archive vault.
                </p>

                <div className="upload-lifecycle-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setArchiveTargetFile('Patient_File_12B.pdf');
                      setShowArchiveDialog(true);
                    }}
                    className="upload-lifecycle-btn archive-btn"
                  >
                    <Archive size={14} />
                    <span>Archive Confirmation Dialog</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRestoreDialog(true)}
                    className="upload-lifecycle-btn restore-btn"
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
