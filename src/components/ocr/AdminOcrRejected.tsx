import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Search,
  Bell,
  Settings,
  HelpCircle,
  Filter,
  FileText,
  RotateCcw,
  Upload,
  ChevronRight,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileCheck,
} from 'lucide-react';

import AdminSidebar from '../common/AdminSidebar';
import {
  useOcrRejectedQuery,
  useReprocessRejectedOcrMutation,
  useReplaceOcrDocumentMutation,
  type OcrRejectedItem,
  type OcrRejectedFilters,
} from '../../services/ocrService';
import './AdminOcrRejected.css';

export interface AdminOcrRejectedProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminOcrRejected: React.FC<AdminOcrRejectedProps> = ({ onNavigate, onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isHistoryRoute = location.pathname.includes('/history');

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
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [replaceTargetDoc, setReplaceTargetDoc] = useState<OcrRejectedItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  // Filter form state
  const [filterReason, setFilterReason] = useState('All');
  const [filterReviewer, setFilterReviewer] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Applied filters state
  const [appliedFilters, setAppliedFilters] = useState<OcrRejectedFilters>({
    reason: 'All',
    reviewer: 'All',
    searchQuery: '',
  });

  // Replace modal form state
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [replacementNotes, setReplacementNotes] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // TanStack Query & Mutations
  const {
    data: rejectedItems = [],
    isLoading,
    isFetching,
    refetch,
  } = useOcrRejectedQuery(appliedFilters);

  const reprocessMutation = useReprocessRejectedOcrMutation();
  const replaceMutation = useReplaceOcrDocumentMutation();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handle Reprocess action
  const handleReprocess = async (item: OcrRejectedItem) => {
    try {
      setReprocessingId(item.id);
      await reprocessMutation.mutateAsync({ id: item.id, ocrId: item.ocrId });
      showToast(
        t('ocrRejected.toasts.reprocessSuccess', 'OCR re-run queued for {{id}}.', {
          id: item.ocrId,
        })
      );
    } catch {
      showToast(t('ocrRejected.toasts.error', 'Failed to process document operation.'));
    } finally {
      setReprocessingId(null);
    }
  };

  // Open Replace Modal
  const handleOpenReplaceModal = (item: OcrRejectedItem) => {
    setReplaceTargetDoc(item);
    setReplacementFile(null);
    setReplacementNotes('');
  };

  // Handle Replace Submit
  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceTargetDoc) return;

    const fileNameToUse = replacementFile ? replacementFile.name : `Replaced_${replaceTargetDoc.fileName}`;

    try {
      await replaceMutation.mutateAsync({
        id: replaceTargetDoc.id,
        ocrId: replaceTargetDoc.ocrId,
        fileName: fileNameToUse,
        notes: replacementNotes,
      });

      showToast(
        t('ocrRejected.toasts.replaceSuccess', 'Replacement scan uploaded and queued for processing for {{id}}.', {
          id: replaceTargetDoc.ocrId,
        })
      );
      setReplaceTargetDoc(null);
    } catch {
      showToast(t('ocrRejected.toasts.error', 'Failed to process document operation.'));
    }
  };

  // Filter application
  const handleApplyFilters = () => {
    setAppliedFilters({
      reason: filterReason,
      reviewer: filterReviewer,
      searchQuery: searchQuery,
    });
    setIsFilterModalOpen(false);
  };

  const handleResetFilters = () => {
    setFilterReason('All');
    setFilterReviewer('All');
    setSearchQuery('');
    setAppliedFilters({
      reason: 'All',
      reviewer: 'All',
      searchQuery: '',
    });
    setIsFilterModalOpen(false);
  };

  const hasActiveFilters =
    appliedFilters.reason !== 'All' ||
    appliedFilters.reviewer !== 'All' ||
    Boolean(appliedFilters.searchQuery && appliedFilters.searchQuery.trim().length > 0);

  return (
    <div className="ocr-rejected-wrapper">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="ocr-toast" role="alert" aria-live="polite">
          <CheckCircle2 size={16} className="text-[#4ade80]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Shared CareID Sidebar - Active nav item: ocr-rejected or ocr-history */}
      <AdminSidebar
        activeNav={isHistoryRoute ? 'ocr-history' : 'ocr-rejected'}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
        ctaLabel="+ New Record"
        onCtaClick={() => handleNav('/admin/records/upload')}
      />

      {/* Main Content Area */}
      <div className="careid-main-wrapper">
        {/* Stationary Top Global App Bar (Figma Node 20:4671) */}
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
              placeholder={t('ocrRejected.searchPlaceholder', 'Search records...')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setAppliedFilters((prev) => ({ ...prev, searchQuery: e.target.value }));
              }}
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

        {/* Scrollable Main Content Canvas (Figma Node 20:4584, width: 1000px, x: 280, y: 64) */}
        <main className="ocr-rejected-canvas" role="main">
          <div className="ocr-rejected-content-container">
            {/* Header & Breadcrumbs Section (Figma Node 20:4586, width: 936px, height: 88px) */}
            <section className="ocr-rejected-header-section" aria-label="Page Header">
              {/* Breadcrumb Nav (Figma Node 20:4587) */}
              <nav className="ocr-rejected-breadcrumb-row" aria-label="Breadcrumb">
                <button
                  type="button"
                  onClick={() => handleNav('/admin/ocr/queue')}
                  className="ocr-rejected-breadcrumb-link"
                >
                  {t('ocrRejected.breadcrumb', 'OCR Verification')}
                </button>
                <div className="ocr-rejected-breadcrumb-separator" aria-hidden="true">
                  <ChevronRight size={13} />
                </div>
                <span className="ocr-rejected-breadcrumb-current" aria-current="page">
                  {isHistoryRoute
                    ? t('ocrRejected.breadcrumbHistory', 'Review History')
                    : t('ocrRejected.breadcrumbRejected', 'Rejected')}
                </span>
              </nav>

              {/* Title, Subtitle and Filter Button Row (Figma Node 20:4594) */}
              <div className="ocr-rejected-title-row">
                <div className="ocr-rejected-title-group">
                  <div className="flex items-center gap-3">
                    <h1 className="ocr-rejected-title">
                      {isHistoryRoute
                        ? t('ocrRejected.historyTitle', 'Review History')
                        : t('ocrRejected.title', 'Rejected Documents')}
                    </h1>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="p-1 rounded-full text-[#79747e] hover:text-[#28006d] hover:bg-[#f2f4f6] transition-colors"
                      title="Refresh rejected documents"
                      aria-label="Refresh rejected documents"
                    >
                      <RefreshCw size={16} className={isFetching ? 'text-[#28006d] animate-spin' : ''} />
                    </button>
                  </div>
                  <p className="ocr-rejected-subtitle">
                    {isHistoryRoute
                      ? t(
                          'ocrRejected.historySubtitle',
                          'Review past OCR validation decisions, reprocessing outcomes, and audit logs.'
                        )
                      : t(
                          'ocrRejected.subtitle',
                          'Review and manage scans that failed OCR processing.'
                        )}
                  </p>
                </div>

                {/* Filter Action Button (Figma Node 20:4601, width: 88.44px, height: 34px) */}
                <button
                  type="button"
                  id="ocr-rejected-filter-button"
                  className={`ocr-rejected-filter-btn ${hasActiveFilters ? 'active' : ''}`}
                  onClick={() => setIsFilterModalOpen(true)}
                  aria-label="Filter rejected documents"
                  aria-expanded={isFilterModalOpen}
                >
                  <Filter className="ocr-filter-icon" />
                  <span>{t('ocrRejected.filterBtn', 'Filter')}</span>
                </button>
              </div>

              {/* Active Filter Chips indicator */}
              {hasActiveFilters && (
                <div className="ocr-rejected-active-filters-bar">
                  <span>Filtered by:</span>
                  {appliedFilters.reason !== 'All' && (
                    <span className="ocr-rejected-filter-chip">
                      Reason: {appliedFilters.reason}
                    </span>
                  )}
                  {appliedFilters.reviewer !== 'All' && (
                    <span className="ocr-rejected-filter-chip">
                      Reviewer: {appliedFilters.reviewer}
                    </span>
                  )}
                  {appliedFilters.searchQuery && (
                    <span className="ocr-rejected-filter-chip">
                      Query: &ldquo;{appliedFilters.searchQuery}&rdquo;
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="ocr-rejected-clear-filters-btn"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </section>

            {/* Data Table Container (Figma Node 20:4605, width: 936px, radius: 16px) */}
            <div className="ocr-rejected-table-card" role="region" aria-label="Rejected Documents Table">
              <div className="ocr-rejected-table-scroll">
                <table className="ocr-rejected-table">
                  <thead className="ocr-rejected-table-head">
                    <tr>
                      <th scope="col" className="ocr-rejected-th col-details">
                        {t('ocrRejected.table.documentDetails', 'DOCUMENT DETAILS')}
                      </th>
                      <th scope="col" className="ocr-rejected-th col-reason">
                        {t('ocrRejected.table.rejectionReason', 'REJECTION REASON')}
                      </th>
                      <th scope="col" className="ocr-rejected-th col-reviewer">
                        {t('ocrRejected.table.reviewer', 'REVIEWER')}
                      </th>
                      <th scope="col" className="ocr-rejected-th col-actions">
                        {t('ocrRejected.table.actions', 'ACTIONS')}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} className="ocr-rejected-td">
                          <div className="ocr-rejected-empty-state">
                            <RefreshCw size={28} className="text-[#28006d] animate-spin" />
                            <p className="ocr-rejected-empty-subtitle">
                              {t('ocrRejected.table.loading', 'Loading rejected documents...')}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : rejectedItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="ocr-rejected-td">
                          <div className="ocr-rejected-empty-state">
                            <FileCheck className="ocr-rejected-empty-icon" />
                            <h3 className="ocr-rejected-empty-title">
                              {t('ocrRejected.table.emptyTitle', 'No Rejected Documents')}
                            </h3>
                            <p className="ocr-rejected-empty-subtitle">
                              {t(
                                'ocrRejected.table.emptySubtitle',
                                'Documents that fail automated extraction or manual review will appear here.'
                              )}
                            </p>
                            {hasActiveFilters && (
                              <button
                                type="button"
                                onClick={handleResetFilters}
                                className="ocr-btn-reprocess"
                                style={{ marginTop: '8px' }}
                              >
                                Reset Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rejectedItems.map((item) => {
                        const isProcessing =
                          reprocessingId === item.id ||
                          (reprocessMutation.isPending && reprocessMutation.variables?.id === item.id);

                        return (
                          <tr key={item.id} className="ocr-rejected-tr" id={`row-${item.ocrId}`}>
                            {/* Column 1: DOCUMENT DETAILS */}
                            <td className="ocr-rejected-td">
                              <div className="ocr-doc-details-cell">
                                {/* Thumbnail: 48x64 px */}
                                <div className="ocr-doc-thumbnail" aria-hidden="true">
                                  <FileText className="ocr-doc-thumbnail-icon" />
                                  <span className="ocr-doc-thumbnail-tag">PDF</span>
                                </div>

                                <div className="ocr-doc-meta">
                                  <span
                                    className="ocr-doc-filename"
                                    title={item.fileName}
                                  >
                                    {item.fileName}
                                  </span>
                                  <div className="ocr-doc-id-row">
                                    <span className="ocr-doc-id-pill">{item.ocrId}</span>
                                    <span>•</span>
                                    <span className="ocr-doc-date">{item.uploadDate}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Column 2: REJECTION REASON */}
                            <td className="ocr-rejected-td">
                              <div className="ocr-reason-cell">
                                <span className="ocr-reason-badge">
                                  <AlertCircle size={12} />
                                  <span>{item.rejectionReason}</span>
                                </span>
                                <p className="ocr-reason-explanation">
                                  {item.explanation}
                                </p>
                              </div>
                            </td>

                            {/* Column 3: REVIEWER */}
                            <td className="ocr-rejected-td">
                              <div className="ocr-reviewer-cell">
                                <div className="ocr-reviewer-avatar" aria-hidden="true">
                                  {item.reviewerInitials}
                                </div>
                                <span className="ocr-reviewer-name">{item.reviewerName}</span>
                              </div>
                            </td>

                            {/* Column 4: ACTIONS */}
                            <td className="ocr-rejected-td">
                              <div className="ocr-actions-cell">
                                {/* Reprocess Action Button (Figma 82.59 x 30 px, outlined) */}
                                <button
                                  type="button"
                                  onClick={() => handleReprocess(item)}
                                  disabled={isProcessing}
                                  className="ocr-btn-reprocess"
                                  title={`Reprocess document ${item.ocrId}`}
                                  aria-label={`Reprocess document ${item.ocrId}`}
                                >
                                  {isProcessing ? (
                                    <RefreshCw size={13} className="animate-spin text-[#28006d]" />
                                  ) : (
                                    <RotateCcw size={13} className="text-[#28006d]" />
                                  )}
                                  <span>{t('ocrRejected.table.reprocess', 'Reprocess')}</span>
                                </button>

                                {/* Replace Action Button (Figma 81.90 x 28 px, primary filled) */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenReplaceModal(item)}
                                  className="ocr-btn-replace"
                                  title={`Replace scan for ${item.ocrId}`}
                                  aria-label={`Replace scan for ${item.ocrId}`}
                                >
                                  <Upload size={12} />
                                  <span>{t('ocrRejected.table.replace', 'Replace')}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Filter Modal / Dialog */}
      {isFilterModalOpen && (
        <div
          className="ocr-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="filter-modal-title"
          onClick={() => setIsFilterModalOpen(false)}
        >
          <div
            className="ocr-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ocr-modal-header">
              <h2 id="filter-modal-title" className="ocr-modal-title">
                {t('ocrRejected.filterModal.title', 'Filter Rejected Documents')}
              </h2>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="ocr-modal-close-btn"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ocr-modal-body">
              {/* Reason Selector */}
              <div className="ocr-form-group">
                <label className="ocr-form-label" htmlFor="filter-reason-select">
                  {t('ocrRejected.filterModal.reasonLabel', 'Rejection Reason')}
                </label>
                <select
                  id="filter-reason-select"
                  className="ocr-form-select"
                  value={filterReason}
                  onChange={(e) => setFilterReason(e.target.value)}
                >
                  <option value="All">All Reasons</option>
                  <option value="Unreadable Text">Unreadable Text</option>
                  <option value="Missing Signature">Missing Signature</option>
                  <option value="Illegible Region">Illegible Region</option>
                  <option value="Low Confidence">Low Confidence</option>
                  <option value="Verification Failed">Verification Failed</option>
                </select>
              </div>

              {/* Reviewer Selector */}
              <div className="ocr-form-group">
                <label className="ocr-form-label" htmlFor="filter-reviewer-select">
                  {t('ocrRejected.filterModal.reviewerLabel', 'Reviewer')}
                </label>
                <select
                  id="filter-reviewer-select"
                  className="ocr-form-select"
                  value={filterReviewer}
                  onChange={(e) => setFilterReviewer(e.target.value)}
                >
                  <option value="All">All Reviewers</option>
                  <option value="Jenkins">S. Jenkins</option>
                  <option value="Vance">R. Vance / Dr. E. Vance</option>
                </select>
              </div>

              {/* Search Query */}
              <div className="ocr-form-group">
                <label className="ocr-form-label" htmlFor="filter-search-input">
                  Search Filename or ID
                </label>
                <input
                  id="filter-search-input"
                  type="text"
                  placeholder="e.g. LabResults, DOC-9921"
                  className="ocr-form-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="ocr-modal-footer">
              <button
                type="button"
                onClick={handleResetFilters}
                className="ocr-modal-btn-secondary"
              >
                {t('ocrRejected.filterModal.reset', 'Reset')}
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="ocr-modal-btn-primary"
              >
                {t('ocrRejected.filterModal.apply', 'Apply Filter')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replace Document Scan Modal */}
      {replaceTargetDoc && (
        <div
          className="ocr-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="replace-modal-title"
          onClick={() => setReplaceTargetDoc(null)}
        >
          <div
            className="ocr-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ocr-modal-header">
              <div>
                <h2 id="replace-modal-title" className="ocr-modal-title">
                  {t('ocrRejected.replaceModal.title', 'Replace Document Scan')}
                </h2>
                <p className="text-xs text-[#79747e] mt-1">
                  {t(
                    'ocrRejected.replaceModal.subtitle',
                    'Upload a higher resolution scan or corrected document for {{docId}}.',
                    { docId: replaceTargetDoc.ocrId }
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplaceTargetDoc(null)}
                className="ocr-modal-close-btn"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReplaceSubmit}>
              <div className="ocr-modal-body">
                {/* Current Doc info */}
                <div className="p-3 bg-[#f8f9fb] border border-[#e2e8f0] rounded-lg text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#191c1e] block">
                      {replaceTargetDoc.fileName}
                    </span>
                    <span className="text-[#79747e]">
                      Reason: {replaceTargetDoc.rejectionReason}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[#28006d]">
                    {replaceTargetDoc.ocrId}
                  </span>
                </div>

                {/* Upload Dropzone */}
                <div
                  className={`ocr-dropzone ${isDragOver ? 'drag-active' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setReplacementFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => {
                    document.getElementById('ocr-replace-file-input')?.click();
                  }}
                >
                  <Upload className="ocr-dropzone-icon" />
                  <div className="text-sm font-semibold text-[#191c1e]">
                    {t(
                      'ocrRejected.replaceModal.dropzoneTitle',
                      'Drop new scan here, or click to browse'
                    )}
                  </div>
                  <div className="text-xs text-[#79747e]">
                    {t(
                      'ocrRejected.replaceModal.dropzoneHint',
                      'Supported formats: PDF, JPG, PNG (Max 15MB)'
                    )}
                  </div>
                  <input
                    id="ocr-replace-file-input"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setReplacementFile(e.target.files[0]);
                      }
                    }}
                  />
                  {replacementFile && (
                    <div className="mt-2 text-xs font-bold text-[#28006d] bg-white px-3 py-1.5 rounded-full border border-[#28006d]/20">
                      Selected: {replacementFile.name} ({(replacementFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>

                {/* Notes Input */}
                <div className="ocr-form-group">
                  <label className="ocr-form-label" htmlFor="replace-notes">
                    {t(
                      'ocrRejected.replaceModal.replaceNoteLabel',
                      'Replacement Notes (Optional)'
                    )}
                  </label>
                  <textarea
                    id="replace-notes"
                    rows={2}
                    className="ocr-form-textarea"
                    placeholder={t(
                      'ocrRejected.replaceModal.replaceNotePlaceholder',
                      'e.g., High-resolution 300 DPI re-scan with clear physician signature...'
                    )}
                    value={replacementNotes}
                    onChange={(e) => setReplacementNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="ocr-modal-footer">
                <button
                  type="button"
                  onClick={() => setReplaceTargetDoc(null)}
                  className="ocr-modal-btn-secondary"
                >
                  {t('ocrRejected.replaceModal.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={replaceMutation.isPending}
                  className="ocr-modal-btn-primary"
                >
                  {replaceMutation.isPending ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>
                        {t('ocrRejected.replaceModal.uploading', 'Uploading & Re-processing...')}
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>
                        {t('ocrRejected.replaceModal.uploadAndRerun', 'Upload & Re-run OCR')}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOcrRejected;
