import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Search,
  Bell,
  History,
  HelpCircle,
  Menu,
  User,
  Download,
  Eye,
  AlertTriangle,
  FileText,
  Activity,
  X,
  Check,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';

import AdminSidebar from '../common/AdminSidebar';
import avatarAdminImg from '../../assets/patients/avatar-admin.png';
import './AdminReferralDetails.css';

import {
  useReferralDetailsQuery,
  useAddReferralNoteMutation,
  generateReferralSummaryDocument,
  type ReferralAttachmentItem,
} from '../../services/referralService';

export interface AdminReferralDetailsProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

// Zod Schema for Operational Note
const addNoteSchema = z.object({
  noteText: z
    .string()
    .min(3, 'Note must contain at least 3 characters')
    .max(1000, 'Note cannot exceed 1000 characters'),
  isPrivate: z.boolean().default(false),
});

type AddNoteFormData = z.infer<typeof addNoteSchema>;

export const AdminReferralDetails: React.FC<AdminReferralDetailsProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const { referralId } = useParams<{ referralId: string }>();
  const navigate = useNavigate();

  // Target referral ID (defaults to 'ref-9021' if none provided)
  const targetId = referralId || 'ref-9021';

  // Navigation handlers
  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      navigate('/');
    }
  };

  // State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<ReferralAttachmentItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // TanStack Query
  const { data: referral, isLoading, isError, refetch } = useReferralDetailsQuery(targetId);
  const addNoteMutation = useAddReferralNoteMutation();

  // React Hook Form for Add Note Modal
  const {
    register,
    handleSubmit,
    reset: resetNoteForm,
    formState: { errors, isSubmitting },
  } = useForm<AddNoteFormData>({
    resolver: zodResolver(addNoteSchema),
    defaultValues: {
      noteText: '',
      isPrivate: false,
    },
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Submit Note Handler
  const onSubmitNote = async (data: AddNoteFormData) => {
    if (!referral) return;
    try {
      await addNoteMutation.mutateAsync({
        referralId: referral.referralId,
        noteText: data.noteText,
        isPrivate: data.isPrivate,
      });
      resetNoteForm();
      setIsAddNoteModalOpen(false);
      showToast(t('referralDetails.notes.successToast', 'Operational note added successfully.'));
    } catch (err) {
      console.error('Failed to add note', err);
    }
  };

  // View Patient Profile
  const handleViewPatientProfile = () => {
    if (referral?.patientId) {
      handleNav(`/admin/patients/${referral.patientId}`);
    } else {
      handleNav('/admin/patients/pat-1');
    }
  };

  // Download PDF Report
  const handleDownloadPdf = () => {
    if (!referral) return;
    generateReferralSummaryDocument(referral);
    showToast(t('referralDetails.pdf.generated', 'Referral summary report opened for print/PDF export.'));
  };

  // Search input handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleNav(`/admin/referrals?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Status Pill Class Mapping
  const getStatusClass = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('pending')) return 'status-pill-pending-review';
    if (s.includes('accept') || s.includes('progress')) return 'status-pill-accepted';
    if (s.includes('escalat')) return 'status-pill-escalated';
    if (s.includes('complet')) return 'status-pill-completed';
    return 'status-pill-cancelled';
  };

  const getStatusLabel = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('pending')) return t('referralDetails.status.pendingReview', 'Pending Review');
    if (s.includes('accept')) return t('referralDetails.status.accepted', 'Accepted');
    if (s.includes('escalat')) return t('referralDetails.status.escalated', 'Escalated');
    if (s.includes('complet')) return t('referralDetails.status.completed', 'Completed');
    return status || t('referralDetails.status.pending', 'Pending');
  };

  // Patient Initials helper
  const getPatientInitials = () => {
    if (referral?.patientInitials) return referral.patientInitials;
    if (!referral?.patientName) return 'PT';
    const parts = referral.patientName.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="referral-details-wrapper">
      {/* Persistent Sidebar */}
      <AdminSidebar
        activeNav="referrals"
        isDrawerOpen={mobileMenuOpen}
        onCloseDrawer={() => setMobileMenuOpen(false)}
        onNavigate={handleNav}
        onLogout={handleLogout}
      />

      {/* Backdrop overlay for mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="careid-drawer-backdrop drawer-open"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content Area */}
      <main className="referral-details-main">
        {/* Stationary Top Bar */}
        <header className="referral-details-topbar">
          <div className="referral-details-topbar-left">
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg text-[#494552] hover:bg-[#edeef0] border border-[#cbc4d4]"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Toggle navigation menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="referral-details-page-title">
              {t('referralDetails.topNav.title', 'Referral Management')}
            </h1>
          </div>

          <div className="referral-details-topbar-right">
            {/* Pill Search */}
            <form onSubmit={handleSearchSubmit} className="referral-topbar-search">
              <span className="referral-topbar-search-icon">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder={t('referralDetails.topNav.searchPlaceholder', 'Search referrals...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search referrals"
              />
            </form>

            <div className="referral-topbar-actions">
              <button
                type="button"
                className="referral-topbar-btn"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={18} />
                <span className="referral-topbar-badge-dot" />
              </button>

              <button
                type="button"
                className="referral-topbar-btn"
                title="History"
                aria-label="History"
                onClick={() => handleNav('/admin/referrals/escalations')}
              >
                <History size={18} />
              </button>

              <button
                type="button"
                className="referral-topbar-btn"
                title="Help & Support"
                aria-label="Help"
              >
                <HelpCircle size={18} />
              </button>

              <div className="referral-topbar-avatar" title="Administrator">
                <img src={avatarAdminImg} alt="Admin profile" />
              </div>
            </div>
          </div>
        </header>

        {/* Content Canvas */}
        <div className="referral-details-canvas">
          {isLoading ? (
            <div className="referral-empty-state-card">
              <div className="referral-empty-state-icon">
                <Activity className="animate-spin text-[#28006d]" size={32} />
              </div>
              <h2 className="text-lg font-bold text-[#191c1e]">
                {t('referralDetails.states.loading', 'Loading referral details...')}
              </h2>
            </div>
          ) : isError ? (
            <div className="referral-empty-state-card">
              <div className="referral-empty-state-icon text-[#ba1a1a]">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-lg font-bold text-[#191c1e]">
                {t('referralDetails.states.errorTitle', 'Unable to Load Referral')}
              </h2>
              <p className="text-sm text-[#494552]">
                {t('referralDetails.states.errorDesc', 'An error occurred while loading this referral. Please try again.')}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 bg-[#28006d] text-white rounded-lg text-sm font-semibold hover:bg-[#3b009e]"
              >
                {t('referralDetails.states.retry', 'Retry')}
              </button>
            </div>
          ) : !referral ? (
            <div className="referral-empty-state-card">
              <div className="referral-empty-state-icon text-[#7a7583]">
                <FileText size={32} />
              </div>
              <h2 className="text-lg font-bold text-[#191c1e]">
                {t('referralDetails.states.notFoundTitle', 'Referral Not Found')}
              </h2>
              <p className="text-sm text-[#494552]">
                {t(
                  'referralDetails.states.notFoundDesc',
                  'The requested referral {{id}} does not exist or may have been removed.',
                  { id: targetId }
                )}
              </p>
              <button
                type="button"
                onClick={() => handleNav('/admin/referrals')}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[#cbc4d4] rounded-lg text-sm font-semibold text-[#191c1e] hover:bg-[#f2f4f6]"
              >
                <ArrowLeft size={16} />
                {t('referralDetails.states.backToReferrals', 'Return to Referral Management')}
              </button>
            </div>
          ) : (
            <>
              {/* Header Section with Breadcrumbs & Action Buttons */}
              <div className="referral-details-header-section">
                <div className="referral-header-left">
                  {/* Breadcrumb Navigation */}
                  <nav className="referral-breadcrumb-nav" aria-label="Breadcrumb">
                    <button
                      type="button"
                      className="referral-breadcrumb-link"
                      onClick={() => handleNav('/admin/referrals')}
                    >
                      {t('referralDetails.breadcrumb', 'Referrals')}
                    </button>
                    <span className="referral-breadcrumb-separator">/</span>
                    <span className="referral-breadcrumb-current">{referral.referralId}</span>
                  </nav>

                  {/* Title & Status Row */}
                  <div className="referral-title-status-row">
                    <h2 className="referral-main-heading">
                      {t('referralDetails.heading', 'Referral Details')}
                    </h2>
                    <span
                      className={`referral-status-pill ${getStatusClass(referral.status)}`}
                      aria-label={`Status: ${referral.status}`}
                    >
                      <span className="status-dot" />
                      <span>{getStatusLabel(referral.status)}</span>
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="referral-header-actions">
                  <button
                    type="button"
                    onClick={handleViewPatientProfile}
                    className="referral-btn-profile"
                    id="btn-view-patient-profile"
                  >
                    <User size={15} />
                    <span>{t('referralDetails.actions.viewPatientProfile', 'View Patient Profile')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="referral-btn-download-pdf"
                    id="btn-download-pdf"
                  >
                    <Download size={15} />
                    <span>{t('referralDetails.actions.downloadPdf', 'Download PDF')}</span>
                  </button>
                </div>
              </div>

              {/* 12-Column Grid */}
              <div className="referral-details-grid">
                {/* Left Panel (8 Columns) */}
                <div className="referral-left-column">
                  {/* Card 1: Referral Information */}
                  <div className="referral-panel-card" data-card="referral-information">
                    <div className="referral-card-header">
                      <h3 className="referral-card-title">
                        {t('referralDetails.infoCard.title', 'Referral Information')}
                      </h3>
                      {referral.priority === 'High' || referral.priority === 'Urgent' ? (
                        <span className="referral-priority-badge referral-priority-high">
                          <AlertTriangle size={12} />
                          <span>{t('referralDetails.infoCard.highPriority', 'HIGH PRIORITY')}</span>
                        </span>
                      ) : (
                        <span className="referral-priority-badge referral-priority-routine">
                          <span>{t('referralDetails.infoCard.routinePriority', 'ROUTINE')}</span>
                        </span>
                      )}
                    </div>

                    <div className="referral-info-fields-grid">
                      {/* Row 1: Referral ID & Health Vault ID */}
                      <div className="referral-field-group">
                        <span className="referral-field-label">
                          {t('referralDetails.infoCard.referralId', 'Referral ID')}
                        </span>
                        <span className="referral-field-value">{referral.referralId}</span>
                      </div>

                      <div className="referral-field-group">
                        <span className="referral-field-label">
                          {t('referralDetails.infoCard.healthVaultId', 'Health Vault ID')}
                        </span>
                        <span className="referral-field-value">
                          {referral.healthVaultId || `HV-${referral.patientId}`}
                        </span>
                      </div>

                      {/* Row 2: Patient Summary (Bordered top, span 2) */}
                      <div className="referral-field-group full-width">
                        <span className="referral-field-label">
                          {t('referralDetails.infoCard.patientSummary', 'Patient Summary')}
                        </span>
                        <div className="referral-patient-summary-box">
                          <div className="referral-patient-avatar" aria-hidden="true">
                            {getPatientInitials()}
                          </div>
                          <div className="referral-patient-details">
                            <span className="referral-patient-name">{referral.patientName}</span>
                            <span className="referral-patient-demographics">
                              {referral.patientGender || 'Unspecified'}
                              {referral.patientAge ? `, ${referral.patientAge} yrs` : ''}
                              {referral.patientDob ? ` • DOB: ${referral.patientDob}` : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Referring Doctor & Receiving Department */}
                      <div className="referral-field-group bordered">
                        <span className="referral-field-label">
                          {t('referralDetails.infoCard.referringDoctor', 'Referring Doctor')}
                        </span>
                        <span className="referral-field-value">{referral.referringDoctorName}</span>
                        <span className="referral-field-subtext">
                          {referral.referringDoctorSpecialty || 'General Practice'}
                        </span>
                      </div>

                      <div className="referral-field-group bordered">
                        <span className="referral-field-label">
                          {t('referralDetails.infoCard.receivingDepartment', 'Receiving Department')}
                        </span>
                        <span className="referral-field-value">{referral.specialty}</span>
                        <span className="referral-field-subtext">{referral.hospitalName}</span>
                      </div>

                      {/* Row 4: Referral Reason (Bordered top, span 2) */}
                      <div className="referral-field-group full-width">
                        <span className="referral-field-label">
                          {t('referralDetails.infoCard.referralReason', 'Referral Reason')}
                        </span>
                        <div className="referral-reason-box">
                          {referral.clinicalReason ||
                            t(
                              'referralDetails.infoCard.notSpecified',
                              'Patient requires comprehensive clinical consultation and specialized diagnostic workup.'
                            )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Attached Medical Records */}
                  <div className="referral-panel-card" data-card="attached-records">
                    <div className="referral-card-header">
                      <h3 className="referral-card-title">
                        {t('referralDetails.attachments.title', 'Attached Medical Records')}
                      </h3>
                    </div>

                    <div className="referral-attachments-list">
                      {!referral.attachments || referral.attachments.length === 0 ? (
                        <p className="text-sm text-[#494552] italic py-2">
                          {t(
                            'referralDetails.attachments.noAttachments',
                            'No medical records attached to this referral.'
                          )}
                        </p>
                      ) : (
                        referral.attachments.map((item, index) => {
                          const isPdf = item.fileType.toLowerCase().includes('pdf');
                          return (
                            <div key={item.id || index} className="referral-attachment-item">
                              <div className="referral-attachment-left">
                                <div
                                  className={`referral-attachment-icon-box ${
                                    isPdf ? 'purple' : 'teal'
                                  }`}
                                  aria-hidden="true"
                                >
                                  {isPdf ? <FileText size={20} /> : <Activity size={20} />}
                                </div>
                                <div className="referral-attachment-info">
                                  <span className="referral-attachment-title">{item.title}</span>
                                  <span className="referral-attachment-meta">
                                    {item.fileType} • {item.fileSize} • {t('referralDetails.attachments.added', 'Added')}{' '}
                                    {item.addedDate}
                                  </span>
                                </div>
                              </div>

                              <div className="referral-attachment-actions">
                                <button
                                  type="button"
                                  onClick={() => setSelectedAttachment(item)}
                                  className="referral-attachment-btn"
                                  title={`${t('referralDetails.attachments.view', 'View')} ${item.title}`}
                                  aria-label={`View ${item.title}`}
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    showToast(`Downloading ${item.title} (${item.fileSize})...`);
                                  }}
                                  className="referral-attachment-btn"
                                  title={`${t('referralDetails.attachments.download', 'Download')} ${item.title}`}
                                  aria-label={`Download ${item.title}`}
                                >
                                  <Download size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Card 3: Operational Notes */}
                  <div className="referral-panel-card" data-card="operational-notes">
                    <div className="referral-notes-card-header">
                      <h3 className="referral-card-title">
                        {t('referralDetails.notes.title', 'Operational Notes')}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsAddNoteModalOpen(true)}
                        className="referral-add-note-btn"
                        id="btn-add-operational-note"
                      >
                        {t('referralDetails.notes.addNote', 'Add Note')}
                      </button>
                    </div>

                    <div className="referral-notes-list">
                      {!referral.notesList || referral.notesList.length === 0 ? (
                        <p className="text-sm text-[#494552] italic py-2">
                          {t('referralDetails.notes.noNotes', 'No operational notes recorded yet.')}
                        </p>
                      ) : (
                        referral.notesList.map((note, index) => (
                          <div key={note.id || index} className="referral-note-bubble">
                            <div className="referral-note-header">
                              <div className="referral-note-avatar">
                                {note.authorName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="referral-note-meta">
                                <span className="referral-note-author">{note.authorName}</span>
                                <span className="referral-note-timestamp">{note.createdAt}</span>
                              </div>
                            </div>
                            <p className="referral-note-content">{note.noteText}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Panel (4 Columns) */}
                <div className="referral-right-column">
                  {/* Card 4: Activity Timeline */}
                  <div className="referral-panel-card" data-card="activity-timeline">
                    <div className="referral-card-header">
                      <h3 className="referral-card-title">
                        {t('referralDetails.timeline.title', 'Activity Timeline')}
                      </h3>
                    </div>

                    <div className="referral-timeline-track">
                      {!referral.statusHistory || referral.statusHistory.length === 0 ? (
                        <p className="text-sm text-[#494552] italic">
                          {t(
                            'referralDetails.timeline.noHistory',
                            'No lifecycle transition history recorded for this referral.'
                          )}
                        </p>
                      ) : (
                        referral.statusHistory.map((item, index) => {
                          const isCurrent = item.isCurrent || index === 0;
                          return (
                            <div key={item.id || index} className="referral-timeline-item">
                              {/* Dot on vertical border */}
                              <div
                                className={`referral-timeline-dot ${
                                  isCurrent ? 'current' : 'completed'
                                }`}
                                aria-hidden="true"
                              />

                              {/* Label or Timestamp */}
                              <span className="referral-timeline-label">{item.timestamp}</span>

                              {/* Title */}
                              <h4 className="referral-timeline-title">{item.title}</h4>

                              {/* Description */}
                              <p className="referral-timeline-desc">{item.description}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modal: Add Operational Note */}
      {isAddNoteModalOpen && referral && (
        <div
          className="referral-modal-backdrop"
          onClick={() => setIsAddNoteModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-note-title"
        >
          <div className="referral-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="referral-modal-header">
              <div>
                <h3 id="add-note-title" className="referral-modal-title">
                  {t('referralDetails.notes.modalTitle', 'Add Operational Note')}
                </h3>
                <p className="referral-modal-subtitle">
                  {t(
                    'referralDetails.notes.modalSubtitle',
                    'Add a coordination note to referral {{refId}}.',
                    { refId: referral.referralId }
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddNoteModalOpen(false)}
                className="referral-modal-close-btn"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitNote)}>
              <div className="referral-modal-body">
                <div className="referral-form-group">
                  <label htmlFor="noteText" className="referral-form-label">
                    {t('referralDetails.notes.noteLabel', 'Note Content')}
                  </label>
                  <textarea
                    id="noteText"
                    {...register('noteText')}
                    placeholder={t(
                      'referralDetails.notes.notePlaceholder',
                      'Enter case notes or operational coordination notes...'
                    )}
                    className="referral-form-textarea"
                    rows={4}
                  />
                  {errors.noteText && (
                    <p className="referral-form-error">{errors.noteText.message}</p>
                  )}
                </div>

                <div className="referral-form-group">
                  <label className="referral-form-checkbox-label">
                    <input type="checkbox" {...register('isPrivate')} />
                    <span>
                      {t(
                        'referralDetails.notes.privateLabel',
                        'Mark as Private (internal administrative view only)'
                      )}
                    </span>
                  </label>
                </div>
              </div>

              <div className="referral-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsAddNoteModalOpen(false)}
                  className="referral-modal-btn-cancel"
                >
                  {t('referralDetails.notes.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="referral-modal-btn-submit"
                  id="btn-submit-note"
                >
                  {isSubmitting
                    ? t('referralDetails.notes.submitting', 'Saving Note...')
                    : t('referralDetails.notes.submit', 'Save Note')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Attachment Preview */}
      {selectedAttachment && (
        <div
          className="referral-modal-backdrop"
          onClick={() => setSelectedAttachment(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-attachment-title"
        >
          <div className="referral-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="referral-modal-header">
              <div>
                <h3 id="preview-attachment-title" className="referral-modal-title">
                  {selectedAttachment.title}
                </h3>
                <p className="referral-modal-subtitle">
                  {selectedAttachment.fileType} • {selectedAttachment.fileSize} •{' '}
                  {t('referralDetails.attachments.added', 'Added')} {selectedAttachment.addedDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAttachment(null)}
                className="referral-modal-close-btn"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="referral-modal-body">
              <div className="p-8 bg-[#f2f4f6] rounded-xl border border-[#e1e2e4] flex flex-col items-center justify-center text-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#28006d]">
                  <FileText size={32} />
                </div>
                <h4 className="text-base font-semibold text-[#191c1e]">
                  {selectedAttachment.title}
                </h4>
                <p className="text-xs text-[#494552] max-w-sm">
                  Verified clinical medical attachment uploaded by{' '}
                  <strong>{selectedAttachment.attachedBy || 'Referring Physician'}</strong>.
                </p>
              </div>
            </div>

            <div className="referral-modal-footer">
              <button
                type="button"
                onClick={() => setSelectedAttachment(null)}
                className="referral-modal-btn-cancel"
              >
                {t('referralDetails.attachments.close', 'Close')}
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast(`Downloading ${selectedAttachment.title}...`);
                  setSelectedAttachment(null);
                }}
                className="referral-modal-btn-submit flex items-center gap-2"
              >
                <Download size={14} />
                <span>{t('referralDetails.attachments.download', 'Download Document')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="referral-toast" role="status">
          <Check size={16} className="text-[#85f6e5]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default AdminReferralDetails;
