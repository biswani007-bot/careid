import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Filter,
  Eye,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  BarChart2,
  Check,
  Ban,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

import AdminSidebar from '../common/AdminSidebar';
import AdminHeader from '../common/AdminHeader';
import {
  useOcrQueueQuery,
  useOcrQueueStatsQuery,
  useApproveOcrMutation,
  useRejectOcrMutation,
  useRerunOcrJobMutation,
  type OcrQueueItem,
} from '../../services/ocrService';
import './AdminOcrQueue.css';

export interface AdminOcrQueueProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminOcrQueue: React.FC<AdminOcrQueueProps> = ({ onNavigate, onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Navigation helper
  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  // State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [confidenceFilter, setConfidenceFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Selected item for review modal
  const [selectedReviewItem, setSelectedReviewItem] = useState<OcrQueueItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // TanStack Query
  const filters = useMemo(
    () => ({
      status: statusFilter,
      confidenceLevel: confidenceFilter,
      documentCategory: categoryFilter,
      searchQuery,
    }),
    [statusFilter, confidenceFilter, categoryFilter, searchQuery]
  );

  const {
    data: queueData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useOcrQueueQuery(filters, currentPage, pageSize);
  const { data: statsData } = useOcrQueueStatsQuery();

  const handleResetFilters = () => {
    setStatusFilter('All');
    setConfidenceFilter('All');
    setCategoryFilter('All');
    setSearchQuery('');
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, confidenceFilter, categoryFilter, searchQuery]);

  // Mutations
  const approveMutation = useApproveOcrMutation();
  const rejectMutation = useRejectOcrMutation();
  const rerunMutation = useRerunOcrJobMutation();

  const handleApprove = (item: OcrQueueItem) => {
    approveMutation.mutate(
      { ocrId: item.id },
      {
        onSuccess: () => {
          showToast(t('ocrQueue.toasts.approved', { ocrId: item.ocrId, defaultValue: `Record ${item.ocrId} approved and indexed into patient health vault.` }));
          if (selectedReviewItem?.id === item.id) {
            setSelectedReviewItem(null);
          }
        },
        onError: (err: any) => {
          showToast(err?.message || 'Failed to approve record.');
        },
      }
    );
  };

  const handleReject = (item: OcrQueueItem) => {
    const reason = rejectionReason.trim() || 'Manual verification rejected by administrator';
    rejectMutation.mutate(
      { ocrId: item.id, reason },
      {
        onSuccess: () => {
          showToast(t('ocrQueue.toasts.rejected', { ocrId: item.ocrId, defaultValue: `Record ${item.ocrId} rejected and flagged for manual clinician review.` }));
          setShowRejectInput(false);
          setRejectionReason('');
          if (selectedReviewItem?.id === item.id) {
            setSelectedReviewItem(null);
          }
        },
        onError: (err: any) => {
          showToast(err?.message || 'Failed to reject record.');
        },
      }
    );
  };

  const handleRerun = (item: OcrQueueItem) => {
    setRunningJobId(item.id);
    rerunMutation.mutate(
      { ocrId: item.id },
      {
        onSuccess: () => {
          setRunningJobId(null);
          showToast(t('ocrQueue.toasts.rerunSuccess', { ocrId: item.ocrId, defaultValue: `OCR re-run completed for ${item.ocrId}. Confidence updated.` }));
        },
        onError: (err: any) => {
          setRunningJobId(null);
          showToast(err?.message || 'Failed to reprocess OCR job.');
        },
      }
    );
  };

  // Pagination calculation
  const totalRecords = queueData?.totalCount ?? 0;
  const totalPages = queueData?.totalPages || 1;
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  // Guard against invalid page index when totalPages changes
  useEffect(() => {
    if (queueData?.totalPages && currentPage > queueData.totalPages) {
      setCurrentPage(Math.max(1, queueData.totalPages));
    }
  }, [queueData?.totalPages, currentPage]);

  const paginationRange = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  return (
    <div className="ocr-queue-wrapper">
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

        {/* Scrollable Main Canvas */}
        <main className="ocr-queue-canvas" role="main">
          {/* Breadcrumb & Top Header */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#494552]">
              <button
                type="button"
                onClick={() => handleNav('/admin/dashboard')}
                className="hover:text-[#28006d] transition-colors"
              >
                Admin Portal
              </button>
              <span className="text-[#cbc4d4]">›</span>
              <span className="text-[#28006d] font-bold">
                {t('ocrQueue.breadcrumb', 'OCR Verification')}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap pt-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191c1e] tracking-tight">
                  {t('ocrQueue.title', 'OCR Processing Queue')}
                </h1>
                {isFetching && <RefreshCw size={16} className="text-[#28006d] animate-spin" />}
              </div>

              {/* Action Buttons */}
              <div className="ocr-header-actions">
                <button
                  type="button"
                  onClick={() => handleNav('/admin/ocr/analytics')}
                  className="ocr-header-btn ocr-header-btn-secondary"
                  id="ocr-analytics-btn"
                >
                  <BarChart2 size={16} className="shrink-0" />
                  <span>{t('ocrQueue.viewAnalyticsBtn', 'Analytics Dashboard')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const firstItem = queueData?.items.find((i) => i.status === 'Pending' || i.status === 'Under Review') || queueData?.items[0];
                    if (firstItem) {
                      handleNav(`/admin/ocr/verify/${firstItem.id}`);
                    } else {
                      handleNav('/admin/ocr/verify');
                    }
                  }}
                  className="ocr-header-btn ocr-header-btn-primary"
                  id="ocr-review-btn"
                >
                  <FileCheck size={16} className="shrink-0" />
                  <span>{t('ocrQueue.reviewOcrBtn', 'Review OCR')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4 Summary Cards Bento Grid */}
          <div className="ocr-kpi-grid">
            {/* Card 1: Pending Reviews */}
            <div className="ocr-kpi-card">
              <div className="ocr-kpi-header">
                <div className="ocr-kpi-icon-wrap bg-[#e7e8ea] text-[#494552]">
                  <Clock size={18} />
                </div>
                <span className="ocr-kpi-label">
                  {t('ocrQueue.kpi.pendingReviews', 'Pending Reviews')}
                </span>
              </div>
              <div className="ocr-kpi-value text-[#191c1e]">
                {statsData?.pendingReviews ?? 0}
              </div>
            </div>

            {/* Card 2: High Confidence */}
            <div className="ocr-kpi-card">
              <div className="ocr-kpi-header">
                <div className="ocr-kpi-icon-wrap bg-[#ecfdf5] text-[#006a60]">
                  <CheckCircle2 size={18} />
                </div>
                <span className="ocr-kpi-label">
                  {t('ocrQueue.kpi.highConfidence', 'High Confidence')}
                </span>
              </div>
              <div className="ocr-kpi-value text-[#006a60]">
                {statsData?.highConfidence ?? 0}
              </div>
            </div>

            {/* Card 3: Medium Confidence */}
            <div className="ocr-kpi-card">
              <div className="ocr-kpi-header">
                <div className="ocr-kpi-icon-wrap bg-[#fef3c7] text-[#92400e]">
                  <AlertTriangle size={18} />
                </div>
                <span className="ocr-kpi-label">
                  {t('ocrQueue.kpi.mediumConfidence', 'Medium Confidence')}
                </span>
              </div>
              <div className="ocr-kpi-value text-[#92400e]">
                {statsData?.mediumConfidence ?? 0}
              </div>
            </div>

            {/* Card 4: Low Confidence */}
            <div className="ocr-kpi-card">
              <div className="ocr-kpi-header">
                <div className="ocr-kpi-icon-wrap bg-[#fee2e2] text-[#ba1a1a]">
                  <AlertCircle size={18} />
                </div>
                <span className="ocr-kpi-label">
                  {t('ocrQueue.kpi.lowConfidence', 'Low Confidence')}
                </span>
              </div>
              <div className="ocr-kpi-value text-[#ba1a1a]">
                {statsData?.lowConfidence ?? 0}
              </div>
            </div>
          </div>

          {/* Filters Strip */}
          <div className="ocr-filters-strip">
            {/* Group 1: Status */}
            <button
              type="button"
              className={`ocr-filter-btn ${statusFilter === 'All' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('All');
                setCurrentPage(1);
              }}
            >
              <Filter size={13} />
              <span>{t('ocrQueue.filters.allStatus', 'All Status')}</span>
            </button>

            <button
              type="button"
              className={`ocr-filter-btn ${statusFilter === 'Pending' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter(statusFilter === 'Pending' ? 'All' : 'Pending');
                setCurrentPage(1);
              }}
            >
              <span>{t('ocrQueue.filters.pending', 'Pending')}</span>
            </button>

            <button
              type="button"
              className={`ocr-filter-btn ${statusFilter === 'Approved' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter(statusFilter === 'Approved' ? 'All' : 'Approved');
                setCurrentPage(1);
              }}
            >
              <span>{t('ocrQueue.filters.approved', 'Approved')}</span>
            </button>

            <button
              type="button"
              className={`ocr-filter-btn ${statusFilter === 'Rejected' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter(statusFilter === 'Rejected' ? 'All' : 'Rejected');
                setCurrentPage(1);
              }}
            >
              <span>{t('ocrQueue.filters.rejected', 'Rejected')}</span>
            </button>

            <div className="ocr-filter-divider hidden sm:block" />

            {/* Group 2: Confidence */}
            <button
              type="button"
              className={`ocr-filter-btn ${confidenceFilter === 'high' ? 'active' : ''}`}
              onClick={() => {
                setConfidenceFilter(confidenceFilter === 'high' ? 'All' : 'high');
                setCurrentPage(1);
              }}
            >
              <span>{t('ocrQueue.filters.highConfidence', 'High Confidence')}</span>
            </button>

            <button
              type="button"
              className={`ocr-filter-btn ${confidenceFilter === 'medium' ? 'active' : ''}`}
              onClick={() => {
                setConfidenceFilter(confidenceFilter === 'medium' ? 'All' : 'medium');
                setCurrentPage(1);
              }}
            >
              <span>{t('ocrQueue.filters.mediumConfidence', 'Medium Confidence')}</span>
            </button>

            <button
              type="button"
              className={`ocr-filter-btn ${confidenceFilter === 'low' ? 'active' : ''}`}
              onClick={() => {
                setConfidenceFilter(confidenceFilter === 'low' ? 'All' : 'low');
                setCurrentPage(1);
              }}
            >
              <span>{t('ocrQueue.filters.lowConfidence', 'Low Confidence')}</span>
            </button>

            <div className="ocr-filter-divider hidden sm:block" />

            {/* Group 3: Document Category */}
            <button
              type="button"
              className={`ocr-filter-btn ${categoryFilter === 'Lab Reports' ? 'active' : ''}`}
              onClick={() => {
                setCategoryFilter(categoryFilter === 'Lab Reports' ? 'All' : 'Lab Reports');
                setCurrentPage(1);
              }}
            >
              <span>{t('ocrQueue.filters.labReports', 'Lab Reports')}</span>
            </button>

            <button
              type="button"
              className={`ocr-filter-btn ${categoryFilter === 'Imaging' ? 'active' : ''}`}
              onClick={() => {
                setCategoryFilter(categoryFilter === 'Imaging' ? 'All' : 'Imaging');
                setCurrentPage(1);
              }}
            >
              <span>{t('ocrQueue.filters.imaging', 'Imaging')}</span>
            </button>

            <button
              type="button"
              className={`ocr-filter-btn ${categoryFilter === 'Prescriptions' ? 'active' : ''}`}
              onClick={() => {
                setCategoryFilter(categoryFilter === 'Prescriptions' ? 'All' : 'Prescriptions');
                setCurrentPage(1);
              }}
            >
              <span>{t('ocrQueue.filters.prescriptions', 'Prescriptions')}</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="ocr-table-card">
            <div className="ocr-table-wrapper">
              <table className="ocr-queue-table">
                <thead>
                  <tr>
                    <th>{t('ocrQueue.table.ocrId', 'OCR ID')}</th>
                    <th>{t('ocrQueue.table.patient', 'Patient')}</th>
                    <th>{t('ocrQueue.table.documentType', 'Document Type')}</th>
                    <th>{t('ocrQueue.table.confidence', 'Confidence')}</th>
                    <th>{t('ocrQueue.table.uploadDate', 'Upload Date')}</th>
                    <th>{t('ocrQueue.table.status', 'Status')}</th>
                    <th>{t('ocrQueue.table.reviewer', 'Reviewer')}</th>
                    <th className="text-right">{t('ocrQueue.table.action', 'Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#7a7583]">
                        <RefreshCw size={24} className="animate-spin mx-auto text-[#28006d] mb-2" />
                        <span className="text-sm font-semibold">{t('ocrQueue.table.loading', 'Loading OCR queue records...')}</span>
                      </td>
                    </tr>
                  ) : isError ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                            <AlertCircle size={24} />
                          </div>
                          <div className="font-bold text-base text-[#191c1e]">
                            {t('ocrQueue.table.errorTitle', 'Failed to load OCR queue records')}
                          </div>
                          <p className="text-sm text-[#7a7583] max-w-md">
                            {error instanceof Error ? error.message : t('ocrQueue.table.errorDesc', 'Unable to fetch data from the OCR platform. Please try again.')}
                          </p>
                          <button
                            type="button"
                            onClick={() => refetch()}
                            className="mt-2 bg-[#28006d] text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-[#3f1d8b] transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                          >
                            <RefreshCw size={14} />
                            <span>{t('ocrQueue.table.retry', 'Retry')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : queueData?.items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-[#f3f0f7] text-[#28006d] flex items-center justify-center">
                            <FileCheck size={24} />
                          </div>
                          <div className="font-bold text-base text-[#191c1e]">
                            {t('ocrQueue.table.noRecords', 'No OCR records found matching your filters.')}
                          </div>
                          <p className="text-sm text-[#7a7583] max-w-md">
                            {t('ocrQueue.table.noRecordsDesc', 'All automated document extractions have been reviewed or no documents are currently pending verification.')}
                          </p>
                          {(statusFilter !== 'All' || confidenceFilter !== 'All' || categoryFilter !== 'All' || searchQuery.trim()) && (
                            <button
                              type="button"
                              onClick={handleResetFilters}
                              className="mt-2 bg-white text-[#28006d] border border-[#28006d] px-4 py-2 rounded-full text-xs font-bold hover:bg-[#f3f0f7] transition-colors cursor-pointer"
                            >
                              {t('ocrQueue.table.clearFilters', 'Clear All Filters')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    queueData?.items.map((item) => (
                      <tr key={item.id}>
                        {/* OCR ID */}
                        <td>
                          <button
                            type="button"
                            onClick={() => handleNav(`/admin/ocr/verify/${item.id}`)}
                            className="font-bold text-[#28006d] hover:underline"
                          >
                            {item.ocrId}
                          </button>
                        </td>

                        {/* Patient */}
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#f1f5f9] text-[#28006d] font-bold text-xs flex items-center justify-center shrink-0 border border-[#e2e8f0]">
                              {item.patientInitials}
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="font-semibold text-xs text-[#191c1e]">
                                {item.patientName}
                              </span>
                              <span className="text-[11px] text-[#7a7583]">
                                {item.patientId}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Document Type */}
                        <td>
                          <span className="font-medium text-xs text-[#191c1e]">
                            {item.documentType}
                          </span>
                        </td>

                        {/* Confidence */}
                        <td>
                          <span
                            className={`ocr-confidence-badge ${
                              item.confidenceLevel === 'high'
                                ? 'ocr-confidence-high'
                                : item.confidenceLevel === 'medium'
                                ? 'ocr-confidence-medium'
                                : 'ocr-confidence-low'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.confidenceLevel === 'high'
                                  ? 'bg-[#006a60]'
                                  : item.confidenceLevel === 'medium'
                                  ? 'bg-[#92400e]'
                                  : 'bg-[#ba1a1a]'
                              }`}
                            />
                            <span>{item.confidence}%</span>
                          </span>
                        </td>

                        {/* Upload Date */}
                        <td>
                          <span className="text-xs text-[#494552] whitespace-nowrap">
                            {item.uploadDate}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className={`ocr-status-badge ${
                              item.status === 'Approved'
                                ? 'ocr-status-approved'
                                : item.status === 'Under Review'
                                ? 'ocr-status-under-review'
                                : item.status === 'Rejected'
                                ? 'ocr-status-rejected'
                                : 'ocr-status-pending'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        {/* Reviewer */}
                        <td>
                          <span className="text-xs text-[#494552]">
                            {item.reviewer}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="ocr-action-btn"
                              title="Quick View"
                              onClick={() => setSelectedReviewItem(item)}
                            >
                              <Eye size={14} />
                            </button>

                            <button
                              type="button"
                              className="ocr-action-btn"
                              title="Re-run OCR"
                              onClick={() => handleRerun(item)}
                              disabled={runningJobId === item.id}
                            >
                              <RotateCcw size={14} className={runningJobId === item.id ? 'animate-spin text-[#28006d]' : ''} />
                            </button>

                            <button
                              type="button"
                              className="ocr-review-btn"
                              onClick={() => handleNav(`/admin/ocr/verify/${item.id}`)}
                            >
                              {t('ocrQueue.table.reviewBtn', 'Review')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="ocr-pagination-footer p-4 bg-[#f8f9fb] border-t border-[#cbc4d4] flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[#494552]">
                  {totalRecords === 0
                    ? t('ocrQueue.table.noRecordsShowing', 'Showing 0 of 0 records')
                    : t('ocrQueue.table.showingRecords', {
                        start: startRecord,
                        end: endRecord,
                        total: totalRecords,
                        defaultValue: `Showing ${startRecord}–${endRecord} of ${totalRecords} records`,
                      })}
                </span>
                <span className="text-[#cbc4d4] hidden sm:inline">•</span>
                <span className="text-xs font-bold text-[#28006d] bg-[#e8ddff] px-2.5 py-1 rounded-full border border-[#d0bcff]">
                  {totalRecords === 0
                    ? t('ocrQueue.table.zeroPageStatus', 'Page 0 of 0')
                    : t('ocrQueue.table.pageStatus', {
                        current: currentPage,
                        total: totalPages,
                        defaultValue: `Page ${currentPage} of ${totalPages}`,
                      })}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="ocr-pagination-nav-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                  <span className="text-xs font-bold">Previous</span>
                </button>

                {paginationRange.map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-xs text-[#7a7583] font-bold">
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${item}`}
                      type="button"
                      className={`ocr-action-btn ${currentPage === item ? 'bg-[#28006d] text-white border-[#28006d] font-bold' : ''}`}
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
                  className="ocr-pagination-nav-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                >
                  <span className="text-xs font-bold">Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Review Modal Dialog */}
      {selectedReviewItem && (
        <div
          className="ocr-modal-scrim"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedReviewItem(null)}
        >
          <div className="ocr-modal-box" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-[#cbc4d4] flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-bold text-lg text-[#191c1e]">
                    {selectedReviewItem.ocrId} — {selectedReviewItem.documentType}
                  </h3>
                  <span
                    className={`ocr-confidence-badge ${
                      selectedReviewItem.confidenceLevel === 'high'
                        ? 'ocr-confidence-high'
                        : selectedReviewItem.confidenceLevel === 'medium'
                        ? 'ocr-confidence-medium'
                        : 'ocr-confidence-low'
                    }`}
                  >
                    {selectedReviewItem.confidence}% Confidence
                  </span>
                </div>
                <p className="text-xs text-[#494552]">
                  Patient: <strong className="text-[#191c1e]">{selectedReviewItem.patientName}</strong> ({selectedReviewItem.patientId}) • Uploaded {selectedReviewItem.uploadDate}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReviewItem(null)}
                className="p-1.5 text-[#7a7583] hover:text-[#191c1e] rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-6">
              {/* Document Source Card */}
              <div className="bg-[#1e1b4b]/5 border border-[#cbc4d4] rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#28006d]/10 text-[#28006d] flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-[#191c1e] block">
                      Document ID: {selectedReviewItem.id}
                    </span>
                    <span className="text-[11px] text-[#494552]">
                      Engine: PaddleOCR-CPU • Status: {selectedReviewItem.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRerun(selectedReviewItem)}
                    className="px-3 py-1.5 rounded-lg border border-[#cbc4d4] bg-white text-xs font-semibold text-[#494552] hover:text-[#28006d] flex items-center gap-1.5"
                    disabled={runningJobId === selectedReviewItem.id}
                  >
                    <RotateCcw size={13} className={runningJobId === selectedReviewItem.id ? 'animate-spin' : ''} />
                    <span>Re-run OCR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReviewItem(null);
                      handleNav(`/admin/ocr/verify/${selectedReviewItem.id}`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#28006d] text-white text-xs font-semibold hover:bg-[#1f0055] flex items-center gap-1.5"
                  >
                    <ExternalLink size={13} />
                    <span>Open Workspace</span>
                  </button>
                </div>
              </div>

              {/* Extracted Fields Checklist */}
              <div>
                <h4 className="text-xs font-bold text-[#494552] uppercase tracking-wider mb-3">
                  {t('ocrQueue.reviewModal.extractedFields', 'Extracted Clinical Fields')}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {Object.entries(selectedReviewItem.extractedFields).length > 0 ? (
                    Object.entries(selectedReviewItem.extractedFields).map(([key, val]) => (
                      <div
                        key={key}
                        className="p-3 bg-[#f8f9fb] border border-[#e2e8f0] rounded-xl flex flex-col gap-1"
                      >
                        <span className="text-[11px] font-bold text-[#494552] uppercase">{key.replace(/_/g, ' ')}</span>
                        <span className="text-xs font-semibold text-[#191c1e] font-mono">{String(val)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-4 text-xs text-[#7a7583]">
                      No structured fields extracted.
                    </div>
                  )}
                </div>
              </div>

              {/* Rejection input toggle */}
              {showRejectInput && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex flex-col gap-2">
                  <label className="text-xs font-bold text-rose-900">
                    {t('ocrQueue.reviewModal.rejectionPrompt', 'Enter reason for rejection or flag:')}
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g., Unclear sig line, dosage discrepancy..."
                    className="px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs outline-none focus:border-rose-600"
                  />
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#f8f9fb] border-t border-[#cbc4d4] flex items-center justify-between flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setSelectedReviewItem(null)}
                className="px-5 py-2 rounded-full border border-[#cbc4d4] text-xs font-bold text-[#494552] hover:bg-white"
              >
                {t('ocrQueue.reviewModal.cancel', 'Close')}
              </button>

              <div className="flex items-center gap-2">
                {!showRejectInput ? (
                  <button
                    type="button"
                    onClick={() => setShowRejectInput(true)}
                    className="px-4 py-2 rounded-full border border-rose-300 text-rose-700 bg-rose-50 text-xs font-bold hover:bg-rose-100 flex items-center gap-1.5"
                  >
                    <Ban size={14} />
                    <span>{t('ocrQueue.reviewModal.reject', 'Reject / Flag Document')}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleReject(selectedReviewItem)}
                    className="px-4 py-2 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 flex items-center gap-1.5"
                  >
                    <Ban size={14} />
                    <span>Confirm Rejection</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleApprove(selectedReviewItem)}
                  className="px-6 py-2 rounded-full bg-[#006a60] text-white text-xs font-bold hover:bg-[#005149] flex items-center gap-1.5 shadow-xs"
                >
                  <Check size={14} />
                  <span>{t('ocrQueue.reviewModal.approve', 'Approve Extraction')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOcrQueue;
