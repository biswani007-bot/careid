import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  AlertTriangle,
  RotateCcw,
  FileEdit,
  CheckCircle2,
  ChevronRight,
  Eye,
  Layers,
} from 'lucide-react';

// Styling
import '../dashboard/AdminDashboard.css';
import './DoctorActionDialogs.css';

// Shared Components & Shell
import AdminSidebar from '../common/AdminSidebar';
import ActionSuccessSnackbar from '../users/ActionSuccessSnackbar';

// Dialog Components
import SuspendDoctorDialog from './SuspendDoctorDialog';
import ResetDoctorPasswordDialog from './ResetDoctorPasswordDialog';
import EditDoctorProfileDialog from './EditDoctorProfileDialog';

// Assets
import avatarAdminImg from '../../assets/patients/avatar-admin.png';
import bellIcon from '../../assets/doctors/icon-contact-info.svg';
import emptyCaughtUpIcon from '../../assets/doctors/icon-empty-caught-up.svg';
import suspendAlertIcon from '../../assets/doctors/icon-modal-suspend-alert.svg';
import resetLockIcon from '../../assets/doctors/icon-modal-reset-lock.svg';

// Doctor Data Service
import {
  type DoctorItem,
  useDoctorQuery,
  useSuspendDoctorMutation,
  useResetDoctorPasswordMutation,
  useUpdateDoctorProfileMutation,
} from '../../services/doctorService';

export interface AdminDoctorActionDialogsProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminDoctorActionDialogs: React.FC<AdminDoctorActionDialogsProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Navigation & Shell State
  const [activeNav, setActiveNav] = useState('doctors');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Active Doctor Context (Default to Dr. Julian Vance from Figma Node 20:3308 & 20:3324)
  const [selectedDoctorId, setSelectedDoctorId] = useState('doc-vance');
  const { data: doctorData } = useDoctorQuery(selectedDoctorId);

  // Local optimistic state if doctorData is loading
  const doctor: DoctorItem = doctorData || {
    id: 'doc-vance',
    name: 'Dr. Julian Vance',
    hvId: 'HV-39508',
    license: 'MD-881923',
    specialty: 'Internal Medicine',
    hospital: 'St. Jude Medical Center',
    status: 'Verified',
    email: 'dr.vance@clinic.org',
    phone: '+1 (555) 789-0123',
    accountStatus: 'Active',
  };

  // View Mode: 'hub' (Interactive Card Hub), 'figma-dual' (Exact Figma Node 20:3306 Dual Modal Scrim), 'caught-up' (Empty state)
  const [viewMode, setViewMode] = useState<'hub' | 'figma-dual' | 'caught-up'>('figma-dual');

  // Modal triggers for in-situ dialogs
  const [activeDialog, setActiveDialog] = useState<
    'none' | 'suspend' | 'reset' | 'edit'
  >('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // TanStack Mutations
  const suspendMutation = useSuspendDoctorMutation();
  const resetMutation = useResetDoctorPasswordMutation();
  const updateMutation = useUpdateDoctorProfileMutation();

  const handleNavClick = (navId: string, path: string) => {
    setActiveNav(navId);
    setIsDrawerOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      navigate('/');
    }
  };

  // Handle Suspend/Activate Action
  const handleConfirmSuspend = async () => {
    setIsProcessing(true);
    const nextSuspended = doctor.status !== 'Suspended';
    try {
      await suspendMutation.mutateAsync({
        doctorId: doctor.id,
        isSuspended: nextSuspended,
      });
      setActiveDialog('none');
      setSnackbarMessage(
        nextSuspended
          ? t('doctors.profile.toasts.suspended', {
              name: doctor.name,
              defaultValue: `${doctor.name}'s account has been suspended.`,
            })
          : t('doctors.profile.toasts.activated', {
              name: doctor.name,
              defaultValue: `${doctor.name}'s account has been activated.`,
            })
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Password Reset Action
  const handleConfirmReset = async () => {
    setIsProcessing(true);
    try {
      await resetMutation.mutateAsync({
        doctorId: doctor.id,
        email: doctor.email || 'dr.vance@clinic.org',
      });
      setActiveDialog('none');
      setSnackbarMessage(
        t('doctors.profile.toasts.passwordResetSent', {
          email: doctor.email || 'dr.vance@clinic.org',
          defaultValue: `Password reset instructions sent to ${doctor.email || 'dr.vance@clinic.org'}.`,
        })
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Edit Doctor Profile Action
  const handleSaveProfile = async (updatedData: Partial<DoctorItem> & { id: string }) => {
    setIsProcessing(true);
    try {
      await updateMutation.mutateAsync({
        ...updatedData,
        id: doctor.id,
      });
      setActiveDialog('none');
      setSnackbarMessage(
        t('doctors.profile.toasts.profileUpdated', {
          name: updatedData.name || doctor.name,
          defaultValue: `Doctor profile for ${updatedData.name || doctor.name} updated successfully.`,
        })
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const isDoctorSuspended = doctor.status === 'Suspended';

  return (
    <div className="doctor-actions-screen-shell" data-node-id="20:3306">
      {/* Shared Stationary CareID Admin Sidebar */}
      <AdminSidebar
        activeNav={activeNav}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={(path) => handleNavClick('doctors', path)}
        onLogout={handleLogoutClick}
      />

      {isDrawerOpen && (
        <div
          className="careid-drawer-backdrop"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content Area */}
      <div className="doctor-actions-main-content">
        {/* Top Header App Bar (Node 20:3344) */}
        <header className="doctor-actions-topbar" data-node-id="20:3344">
          <div className="doctor-actions-topbar-left">
            <button
              type="button"
              className="md:hidden p-1.5 rounded-lg border border-[#e1e2e4] text-[#494552] hover:bg-[#f2f4f6]"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="doctor-actions-topbar-title hover:underline cursor-pointer bg-transparent border-0 p-0"
                onClick={() => handleNavClick('doctors', '/admin/doctors')}
              >
                {t('doctors.profile.breadcrumbs.doctors', 'Doctors')}
              </button>
              <ChevronRight size={14} className="text-[#8c9199]" />
              <span className="text-[#494552] text-sm font-medium">
                {t('doctors.managementActions.breadcrumb', 'Doctor Management Actions & States')}
              </span>
            </div>
          </div>

          <div className="doctor-actions-topbar-right">
            <button
              type="button"
              className="doctor-actions-topbar-bell-btn"
              aria-label="Notifications"
              onClick={() => setSnackbarMessage('System is running normally. 0 alerts.')}
            >
              <img src={bellIcon} alt="" className="size-5 opacity-70" />
            </button>

            <div className="doctor-actions-topbar-avatar" data-name="Admin Profile">
              <img src={avatarAdminImg} alt="System Administrator" />
            </div>
          </div>
        </header>

        {/* View Mode: Caught-Up State Only */}
        {viewMode === 'caught-up' && (
          <div className="doctor-empty-state-canvas" data-node-id="20:3353">
            <div className="doctor-empty-badge-circle" data-name="Background">
              <img
                src={emptyCaughtUpIcon}
                alt=""
                className="doctor-empty-badge-icon"
              />
            </div>
            <h2 className="doctor-empty-caught-up-title" data-name="Heading 2">
              {t('doctors.managementActions.emptyState.title', "You're all caught up!")}
            </h2>
            <p className="doctor-empty-caught-up-subtitle">
              {t(
                'doctors.managementActions.emptyState.subtitle',
                'No Pending Verifications'
              )}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="doctor-empty-caught-up-btn"
                onClick={() => handleNavClick('doctors', '/admin/doctors')}
              >
                {t(
                  'doctors.managementActions.emptyState.reviewDirectory',
                  'Review Doctor Directory'
                )}
              </button>
              <button
                type="button"
                className="px-5 py-2 text-xs font-semibold rounded-full border border-[#006a60] text-[#006a60] bg-white hover:bg-[#e6f5f3]"
                onClick={() => setViewMode('figma-dual')}
              >
                {t('doctors.managementActions.controls.toggleDualView', 'Figma Dual-Modal Layout')}
              </button>
            </div>
          </div>
        )}

        {/* View Mode: Figma Dual-Modal Simulation View (matching Node 20:3306) */}
        {viewMode === 'figma-dual' && (
          <div className="relative flex-1 min-h-[calc(100vh-64px)] overflow-auto">
            {/* Underlying blurred background with Empty State content (Node 20:3353) */}
            <div className="blur-[2px] opacity-40 pointer-events-none doctor-empty-state-canvas">
              <div className="doctor-empty-badge-circle">
                <img
                  src={emptyCaughtUpIcon}
                  alt=""
                  className="doctor-empty-badge-icon"
                />
              </div>
              <h2 className="doctor-empty-caught-up-title">
                {t('doctors.managementActions.emptyState.title', "You're all caught up!")}
              </h2>
              <p className="doctor-empty-caught-up-subtitle">
                {t(
                  'doctors.managementActions.emptyState.subtitle',
                  'No Pending Verifications'
                )}
              </p>
              <button type="button" className="doctor-empty-caught-up-btn">
                {t(
                  'doctors.managementActions.emptyState.reviewDirectory',
                  'Review Doctor Directory'
                )}
              </button>
            </div>

            {/* High Contrast Scrim Overlay with Modal 1 and Modal 2 (Node 20:3307) */}
            <div
              className="absolute inset-0 bg-[rgba(25,28,30,0.4)] flex flex-col items-center justify-center p-6 gap-6 z-10"
              data-node-id="20:3307"
              data-name="Modal Scrim (High contrast overlay)"
            >
              {/* Context Selector Bar for Testing */}
              <div className="bg-white/95 backdrop-blur-md border border-[#e1e2e4] rounded-2xl md:rounded-full px-4 py-2 flex flex-wrap items-center justify-center gap-2 md:gap-4 shadow-md text-xs max-w-full">
                <span className="font-semibold text-[#191c1e]">
                  {t('doctors.managementActions.controls.selectDoctor', 'Active Doctor Context:')}
                </span>
                <select
                  className="border border-[#c4c7c5] rounded-md px-2 py-1 bg-white text-[#191c1e] font-medium outline-none cursor-pointer"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                >
                  <option value="doc-vance">Dr. Julian Vance (Figma Target)</option>
                  <option value="doc-2">Dr. Sarah Jenkins</option>
                  <option value="doc-1">Dr. Robert Chen</option>
                  <option value="doc-4">Dr. Marcus Sterling (Pending)</option>
                </select>

                <div className="h-4 w-px bg-[#e1e2e4]" />

                <span
                  className={`doctor-status-badge ${
                    isDoctorSuspended
                      ? 'suspended'
                      : doctor.status === 'Pending'
                      ? 'pending'
                      : 'verified'
                  }`}
                >
                  {doctor.status}
                </span>

                <div className="h-4 w-px bg-[#e1e2e4]" />

                <button
                  type="button"
                  className="text-[#006a60] font-semibold hover:underline"
                  onClick={() => setViewMode('hub')}
                >
                  Interactive Hub View
                </button>
              </div>

              {/* Dual Modal Container (Side-by-side per Figma Node 20:3306) */}
              <div className="doctor-actions-dual-modal-container">
                {/* Modal 1: Suspend / Activate Doctor Account (Node 20:3308) */}
                <div
                  className="doctor-modal-card"
                  data-node-id="20:3308"
                  data-name="Modal 1: Suspend Doctor Account"
                >
                  <div className="doctor-modal-header">
                    <div
                      className={`doctor-modal-icon-wrap ${
                        isDoctorSuspended ? 'activate' : 'suspend'
                      }`}
                      data-name="Background"
                    >
                      {isDoctorSuspended ? (
                        <CheckCircle2 size={20} className="text-[#006a60]" />
                      ) : (
                        <img
                          src={suspendAlertIcon}
                          alt=""
                          className="doctor-modal-icon-svg w-[22px] h-[19px]"
                        />
                      )}
                    </div>

                    <h3 className="doctor-modal-title" data-name="Heading 3">
                      {isDoctorSuspended
                        ? t(
                            'doctors.managementActions.modals.suspend.activateTitle',
                            'Activate Doctor Account'
                          )
                        : t(
                            'doctors.managementActions.modals.suspend.title',
                            'Suspend Doctor Account'
                          )}
                    </h3>
                  </div>

                  <div className="doctor-modal-body">
                    <p className="doctor-modal-body-text">
                      {isDoctorSuspended
                        ? t(
                            'doctors.managementActions.modals.suspend.activateConfirm',
                            'Are you sure you want to activate {{name}}? Access to the Doctor App and Portal will be restored immediately.',
                            { name: doctor.name }
                          )
                        : t(
                            'doctors.managementActions.modals.suspend.confirm',
                            'Are you sure you want to suspend {{name}}? This will disable access to the Doctor App and Portal immediately.',
                            { name: doctor.name }
                          )}
                    </p>
                  </div>

                  <div className="doctor-modal-footer">
                    <button
                      type="button"
                      className="doctor-modal-btn-cancel"
                      onClick={() => setViewMode('hub')}
                    >
                      {t('doctors.managementActions.modals.suspend.cancel', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      className={
                        isDoctorSuspended
                          ? 'doctor-modal-btn-activate'
                          : 'doctor-modal-btn-suspend'
                      }
                      onClick={handleConfirmSuspend}
                      disabled={isProcessing}
                    >
                      {isProcessing
                        ? '...'
                        : isDoctorSuspended
                        ? t(
                            'doctors.managementActions.modals.suspend.activateAction',
                            'Activate'
                          )
                        : t(
                            'doctors.managementActions.modals.suspend.action',
                            'Suspend'
                          )}
                    </button>
                  </div>
                </div>

                {/* Modal 2: Reset Doctor Password (Node 20:3324) */}
                <div
                  className="doctor-modal-card"
                  data-node-id="20:3324"
                  data-name="Modal 2: Reset Doctor Password"
                >
                  <div className="doctor-modal-header">
                    <div className="doctor-modal-icon-wrap reset-pwd" data-name="Overlay">
                      <img
                        src={resetLockIcon}
                        alt=""
                        className="doctor-modal-icon-svg w-[20px] h-[20px]"
                      />
                    </div>

                    <h3 className="doctor-modal-title" data-name="Heading 3">
                      {t(
                        'doctors.managementActions.modals.reset.title',
                        'Reset Doctor Password'
                      )}
                    </h3>
                  </div>

                  <div className="doctor-modal-email-box" data-name="Background">
                    <p className="doctor-modal-email-label">
                      {t(
                        'doctors.managementActions.modals.reset.instruction',
                        'Send a temporary password reset link to:'
                      )}
                    </p>
                    <p className="doctor-modal-email-target">
                      {doctor.email ? `${doctor.email}?` : 'dr.vance@clinic.org?'}
                    </p>
                  </div>

                  <div className="doctor-modal-footer">
                    <button
                      type="button"
                      className="doctor-modal-btn-cancel"
                      onClick={() => setViewMode('hub')}
                    >
                      {t('doctors.managementActions.modals.reset.cancel', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      className="doctor-modal-btn-reset"
                      onClick={handleConfirmReset}
                      disabled={isProcessing}
                    >
                      {isProcessing
                        ? '...'
                        : t(
                            'doctors.managementActions.modals.reset.sendLink',
                            'Send Link'
                          )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Direct View Mode Switchers */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-semibold rounded-full bg-white text-[#191c1e] border border-[#e1e2e4] hover:bg-[#f2f4f6]"
                  onClick={() => setViewMode('caught-up')}
                >
                  View Background Caught-Up Screen
                </button>
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-semibold rounded-full bg-white text-[#191c1e] border border-[#e1e2e4] hover:bg-[#f2f4f6]"
                  onClick={() => handleNavClick('doctors', '/admin/doctors')}
                >
                  Review Doctor Directory
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Mode: Interactive Management Hub */}
        {viewMode === 'hub' && (
          <main className="doctor-actions-body">
            {/* Header info */}
            <div className="doctor-actions-header-box">
              <h1 className="doctor-actions-page-title">
                {t(
                  'doctors.managementActions.pageTitle',
                  'Doctor Management Actions & States'
                )}
              </h1>
              <p className="doctor-actions-page-subtitle">
                {t(
                  'doctors.managementActions.pageSubtitle',
                  'Interactive administrative dialogs, credential resets, account suspension, and verification states matching Figma Node 20:3306.'
                )}
              </p>
            </div>

            {/* Context and status selector */}
            <div className="doctor-actions-toolbar">
              <div className="doctor-actions-toolbar-group">
                <span className="doctor-actions-toolbar-label">
                  {t(
                    'doctors.managementActions.controls.selectDoctor',
                    'Active Doctor Context:'
                  )}
                </span>
                <select
                  className="doctor-actions-select"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                >
                  <option value="doc-vance">Dr. Julian Vance (dr.vance@clinic.org)</option>
                  <option value="doc-2">Dr. Sarah Jenkins (dr.jenkins@hospital.org)</option>
                  <option value="doc-1">Dr. Robert Chen (robert.chen@careid.health)</option>
                  <option value="doc-4">Dr. Marcus Sterling (Pending)</option>
                </select>

                <div className="doctor-actions-pills">
                  <span
                    className={`doctor-status-badge ${
                      isDoctorSuspended
                        ? 'suspended'
                        : doctor.status === 'Pending'
                        ? 'pending'
                        : 'verified'
                    }`}
                  >
                    {doctor.status}
                  </span>
                </div>
              </div>

              <div className="doctor-actions-toolbar-group">
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-semibold rounded-full bg-[#28006d] text-white hover:bg-[#3f1d8b] flex items-center gap-2"
                  onClick={() => setViewMode('figma-dual')}
                >
                  <Layers size={14} />
                  <span>{t('doctors.managementActions.controls.toggleDualView', 'Figma Dual-Modal Layout')}</span>
                </button>

                <button
                  type="button"
                  className="px-4 py-2 text-xs font-semibold rounded-full border border-[#006a60] text-[#006a60] bg-white hover:bg-[#e6f5f3] flex items-center gap-2"
                  onClick={() => handleNavClick('doctors', `/admin/doctors/${doctor.id}`)}
                >
                  <Eye size={14} />
                  <span>View Doctor Profile</span>
                </button>
              </div>
            </div>

            {/* Showcase Trigger Cards Grid */}
            <div className="doctor-actions-grid">
              {/* Card 1: Suspend / Activate Account */}
              <div className="doctor-action-card">
                <div>
                  <div className="doctor-action-card-header">
                    <div
                      className={`doctor-action-card-icon ${
                        isDoctorSuspended ? 'edit' : 'suspend'
                      }`}
                    >
                      {isDoctorSuspended ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <AlertTriangle size={20} />
                      )}
                    </div>
                    <h3 className="doctor-action-card-title">
                      {isDoctorSuspended ? 'Activate Doctor Account' : 'Suspend Doctor Account'}
                    </h3>
                  </div>
                  <p className="doctor-action-card-desc">
                    {t(
                      'doctors.managementActions.cards.suspendCardDesc',
                      'Disables access to the Doctor App and CareID Portal immediately or restores account access.'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  className="doctor-action-card-btn"
                  style={{
                    backgroundColor: isDoctorSuspended ? '#006a60' : '#ba1a1a',
                  }}
                  onClick={() => setActiveDialog('suspend')}
                >
                  {isDoctorSuspended
                    ? 'Preview Activate Dialog'
                    : 'Preview Suspend Dialog'}
                </button>
              </div>

              {/* Card 2: Reset Password */}
              <div className="doctor-action-card">
                <div>
                  <div className="doctor-action-card-header">
                    <div className="doctor-action-card-icon reset">
                      <RotateCcw size={20} />
                    </div>
                    <h3 className="doctor-action-card-title">
                      {t('doctors.managementActions.cards.resetCardTitle', 'Reset Doctor Password')}
                    </h3>
                  </div>
                  <p className="doctor-action-card-desc">
                    {t(
                      'doctors.managementActions.cards.resetCardDesc',
                      "Dispatches a temporary password reset link directly to the doctor's verified email address."
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  className="doctor-action-card-btn"
                  style={{ backgroundColor: '#3f1d8b' }}
                  onClick={() => setActiveDialog('reset')}
                >
                  {t('doctors.managementActions.cards.openReset', 'Preview Reset Dialog')}
                </button>
              </div>

              {/* Card 3: Edit Profile */}
              <div className="doctor-action-card">
                <div>
                  <div className="doctor-action-card-header">
                    <div className="doctor-action-card-icon edit">
                      <FileEdit size={20} />
                    </div>
                    <h3 className="doctor-action-card-title">
                      {t('doctors.managementActions.cards.editCardTitle', 'Edit Doctor Profile')}
                    </h3>
                  </div>
                  <p className="doctor-action-card-desc">
                    {t(
                      'doctors.managementActions.cards.editCardDesc',
                      'Modifies clinical specialization, licensing data, and hospital facility assignments.'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  className="doctor-action-card-btn"
                  style={{ backgroundColor: '#006a60' }}
                  onClick={() => setActiveDialog('edit')}
                >
                  {t('doctors.managementActions.cards.openEdit', 'Preview Edit Dialog')}
                </button>
              </div>

              {/* Card 4: Caught Up View */}
              <div className="doctor-action-card">
                <div>
                  <div className="doctor-action-card-header">
                    <div className="doctor-action-card-icon empty">
                      <CheckCircle2 size={20} />
                    </div>
                    <h3 className="doctor-action-card-title">
                      {t('doctors.managementActions.cards.emptyStateTitle', 'All Caught Up State')}
                    </h3>
                  </div>
                  <p className="doctor-action-card-desc">
                    {t(
                      'doctors.managementActions.cards.emptyStateDesc',
                      'Displays verification completion state when no doctor credential verifications are pending.'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  className="doctor-action-card-btn"
                  style={{ backgroundColor: '#28006d' }}
                  onClick={() => setViewMode('caught-up')}
                >
                  {t('doctors.managementActions.cards.openEmpty', 'Preview Caught Up State')}
                </button>
              </div>
            </div>
          </main>
        )}
      </div>

      {/* In-situ Modals triggered from Hub Cards */}
      <SuspendDoctorDialog
        isOpen={activeDialog === 'suspend'}
        doctorName={doctor.name}
        isSuspended={isDoctorSuspended}
        isLoading={isProcessing}
        onClose={() => setActiveDialog('none')}
        onConfirm={handleConfirmSuspend}
      />

      <ResetDoctorPasswordDialog
        isOpen={activeDialog === 'reset'}
        doctorName={doctor.name}
        doctorEmail={doctor.email || 'dr.vance@clinic.org'}
        isLoading={isProcessing}
        onClose={() => setActiveDialog('none')}
        onConfirm={handleConfirmReset}
      />

      <EditDoctorProfileDialog
        isOpen={activeDialog === 'edit'}
        doctor={doctor}
        isLoading={isProcessing}
        onClose={() => setActiveDialog('none')}
        onSave={handleSaveProfile}
      />

      {/* Snackbar Alert for Action Confirmations */}
      <ActionSuccessSnackbar
        isVisible={!!snackbarMessage}
        message={snackbarMessage || ''}
        onDismiss={() => setSnackbarMessage(null)}
      />
    </div>
  );
};

export default AdminDoctorActionDialogs;
