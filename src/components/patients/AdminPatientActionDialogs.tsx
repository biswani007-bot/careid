import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  AlertTriangle,
  RotateCcw,
  FileEdit,
  CheckCircle2,
} from 'lucide-react';

// Styling
import '../dashboard/AdminDashboard.css';
import './AdminPatientProfile.css';
import './PatientActionDialogs.css';

// Shared Components & Branding
import AdminSidebar from '../common/AdminSidebar';
import avatarAdminImg from '../../assets/patients/avatar-admin.png';
import iconBell from '../../assets/patients/icon-bell.svg';
import iconApps from '../../assets/patients/icon-apps.svg';
import breadcrumbChevron from '../../assets/patients/icon-chevron-right.svg';

// Dialog Components
import DeactivatePatientDialog from './DeactivatePatientDialog';
import ResetPatientPasswordDialog from './ResetPatientPasswordDialog';
import EditPatientProfileDialog from './EditPatientProfileDialog';
import ActionSuccessSnackbar from '../users/ActionSuccessSnackbar';

// Mock Patient Data for Showcase (Sarah Jenkins from Figma Node 20:2149)
import { type PatientItem } from '../../services/patientService';

const SHOWCASE_PATIENT: PatientItem = {
  id: 'pat-sarah',
  name: 'Sarah Jenkins',
  phone: '+1 (555) 123-4567',
  email: 'sarah.jenkins@example.com',
  vaultId: 'HV-4921-7890-33',
  demographics: 'Female, 39',
  gender: 'Female',
  age: 39,
  registered: '12 Apr 2022',
  registeredDate: '2022-04-12',
  verification: 'Verified',
  status: 'ACTIVE',
  links: { family: 1, records: 84 },
  profile: {
    dob: '12 Apr 1985 (39y)',
    gender: 'Female',
    bloodGroup: 'A+',
    registeredDateFormatted: '12 Apr 2022',
    verificationLevel: 'Tier 3 (Gov ID)',
    lastLogin: '1 hour ago',
    email: 'sarah.jenkins@example.com',
    emailVerified: true,
    phone: '+1 (555) 123-4567',
    phoneVerified: true,
    primaryAddress: {
      line1: '1042 Pinecrest Avenue',
      cityStateZip: 'Seattle, WA 98104',
    },
    emergencyContact: {
      name: 'David Jenkins',
      relation: 'Spouse',
      phone: '+1 (555) 987-6543',
    },
    vaultSummary: {
      totalRecords: 84,
      latestUpload: 'Yesterday',
      pendingOcrCount: 0,
      vaxPassStatus: 'Verified',
    },
    dependents: [],
    dataSharingConsent: 'Active',
    activeProviderLinks: '3 Active',
  },
};

export interface AdminPatientActionDialogsProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminPatientActionDialogs: React.FC<AdminPatientActionDialogsProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Navigation & Shell State
  const [activeNav, setActiveNav] = useState('patients');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modal States
  const [activeDialog, setActiveDialog] = useState<
    'none' | 'deactivate' | 'reactivate' | 'reset' | 'edit'
  >('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const [patient, setPatient] = useState<PatientItem>(SHOWCASE_PATIENT);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

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

  // Actions handlers
  const handleConfirmDeactivate = async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 300));
    setIsProcessing(false);
    setPatient((prev) => ({ ...prev, status: 'INACTIVE' }));
    setActiveDialog('none');
    setSnackbarMessage(
      t('patients.toasts.suspendSuccess', { name: patient.name })
    );
  };

  const handleConfirmReactivate = async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 300));
    setIsProcessing(false);
    setPatient((prev) => ({ ...prev, status: 'ACTIVE' }));
    setActiveDialog('none');
    setSnackbarMessage(
      t('patients.toasts.reactivateSuccess', { name: patient.name })
    );
  };

  const handleConfirmResetPassword = async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 300));
    setIsProcessing(false);
    setActiveDialog('none');
    setSnackbarMessage(
      t('patients.toasts.resetSuccess', { email: patient.email })
    );
  };

  const handleSaveProfile = async (data: {
    name: string;
    email: string;
    phone: string;
    dob: string;
    avatarUrl?: string;
  }) => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 300));
    setIsProcessing(false);
    setPatient((prev) => ({
      ...prev,
      name: data.name,
      email: data.email,
      phone: data.phone,
      avatarUrl: data.avatarUrl || prev.avatarUrl,
      profile: prev.profile
        ? {
            ...prev.profile,
            email: data.email,
            phone: data.phone,
            dob: data.dob,
          }
        : undefined,
    }));
    setActiveDialog('none');
    setSnackbarMessage(
      t('patients.toasts.updateSuccess', { name: data.name })
    );
  };

  return (
    <div className="careid-dashboard-shell">
      {/* Stationary Sidebar */}
      <AdminSidebar
        activeNav={activeNav}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={(path) => handleNavClick('patients', path)}
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
      <div className="careid-main-wrapper patient-profile-container">
        {/* Top Navbar */}
        <header className="careid-top-navbar" data-node-id="20:2149">
          <div className="header-left-cluster">
            <button
              type="button"
              className="header-menu-toggle"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>

            <div className="patients-breadcrumbs">
              <button
                type="button"
                className="patients-breadcrumb-root"
                onClick={() => handleNavClick('dashboard', '/admin/dashboard')}
              >
                {t('patients.breadcrumbs.admin', 'Admin')}
              </button>
              <span className="patients-breadcrumb-sep">
                <img src={breadcrumbChevron} alt=">" />
              </span>
              <button
                type="button"
                className="patients-breadcrumb-root"
                onClick={() => handleNavClick('patients', '/admin/patients')}
              >
                {t('patients.breadcrumbs.patients', 'Patients Directory')}
              </button>
              <span className="patients-breadcrumb-sep">
                <img src={breadcrumbChevron} alt=">" />
              </span>
              <span className="patients-breadcrumb-current">
                {t('patients.accountActions.breadcrumb', 'Patient Account Actions')}
              </span>
            </div>
          </div>

          <div className="users-header-actions">
            <button
              type="button"
              className="users-header-icon-btn"
              aria-label="Notifications"
              onClick={() => setSnackbarMessage('You have 2 pending notifications.')}
            >
              <img src={iconBell} alt="Notifications" />
              <span className="users-header-badge" />
            </button>

            <button
              type="button"
              className="users-header-icon-btn"
              aria-label="Applications"
              onClick={() => setSnackbarMessage('CareID Suite application launcher.')}
            >
              <img src={iconApps} alt="Apps" />
            </button>

            <div className="users-header-divider" />

            <button
              type="button"
              className="patient-profile-admin-console-pill"
              onClick={() => handleNavClick('dashboard', '/admin/dashboard')}
            >
              {t('header.adminConsole', 'Admin Console')}
            </button>

            <div className="users-header-avatar">
              <img src={avatarAdminImg} alt="System Administrator" />
            </div>
          </div>
        </header>

        {/* Scrollable Showcase Canvas */}
        <main className="patient-profile-canvas">
          <div className="patient-reg-heading-box" style={{ maxWidth: 1200, width: '100%', margin: '0 auto' }}>
            <h1 className="patient-reg-title">
              {t('patients.accountActions.pageTitle', 'Admin Portal — Patient Account Actions')}
            </h1>
            <p className="patient-reg-subtitle">
              {t(
                'patients.accountActions.pageSubtitle',
                'Interactive dialogs for patient deactivation, credential reset, and profile modification matching Figma Node 20:2149.'
              )}
            </p>
          </div>

          {/* Interactive Trigger Cards Grid */}
          <div className="patient-dialogs-showcase-grid" data-node-id="20:2150">
            {/* Card 1: Deactivate Patient */}
            <div className="patient-dialogs-showcase-card">
              <div className="patient-dialogs-showcase-header">
                <div className="patient-dialogs-showcase-icon" style={{ backgroundColor: '#fce8e8', color: '#ba1a1a' }}>
                  <AlertTriangle size={22} />
                </div>
                <h3 className="patient-dialogs-showcase-title">
                  {t('patients.modals.deactivateTitle', 'Deactivate Patient Record')}
                </h3>
              </div>
              <p className="patient-dialogs-showcase-desc">
                {t(
                  'patients.accountActions.deactivateCardDesc',
                  'Trigger destructive confirmation dialog to suspend patient portal access and automated billing.'
                )}
              </p>
              <button
                type="button"
                className="patient-dialogs-showcase-btn"
                style={{ backgroundColor: '#ba1a1a' }}
                onClick={() => setActiveDialog('deactivate')}
              >
                {t('patients.accountActions.openDeactivate', 'Preview Deactivate Dialog')}
              </button>
            </div>

            {/* Card 2: Reset Password */}
            <div className="patient-dialogs-showcase-card">
              <div className="patient-dialogs-showcase-header">
                <div className="patient-dialogs-showcase-icon" style={{ backgroundColor: '#efe7fb', color: '#28006d' }}>
                  <RotateCcw size={22} />
                </div>
                <h3 className="patient-dialogs-showcase-title">
                  {t('patients.modals.resetTitle', 'Reset Patient Password')}
                </h3>
              </div>
              <p className="patient-dialogs-showcase-desc">
                {t(
                  'patients.accountActions.resetCardDesc',
                  "Dispatch a secure recovery link to the patient's registered email with session invalidation option."
                )}
              </p>
              <button
                type="button"
                className="patient-dialogs-showcase-btn"
                onClick={() => setActiveDialog('reset')}
              >
                {t('patients.accountActions.openReset', 'Preview Reset Password Dialog')}
              </button>
            </div>

            {/* Card 3: Edit Patient Profile */}
            <div className="patient-dialogs-showcase-card">
              <div className="patient-dialogs-showcase-header">
                <div className="patient-dialogs-showcase-icon" style={{ backgroundColor: '#efe7fb', color: '#28006d' }}>
                  <FileEdit size={22} />
                </div>
                <h3 className="patient-dialogs-showcase-title">
                  {t('patients.modals.editTitle', 'Edit Patient Profile')}
                </h3>
              </div>
              <p className="patient-dialogs-showcase-desc">
                {t(
                  'patients.accountActions.editCardDesc',
                  'Modify patient first name, last name, email address, date of birth, phone number, and photo.'
                )}
              </p>
              <button
                type="button"
                className="patient-dialogs-showcase-btn"
                onClick={() => setActiveDialog('edit')}
              >
                {t('patients.accountActions.openEdit', 'Preview Edit Profile Dialog')}
              </button>
            </div>

            {/* Card 4: Reactivate Patient Record */}
            <div className="patient-dialogs-showcase-card">
              <div className="patient-dialogs-showcase-header">
                <div className="patient-dialogs-showcase-icon" style={{ backgroundColor: '#e6f5f3', color: '#006a60' }}>
                  <CheckCircle2 size={22} />
                </div>
                <h3 className="patient-dialogs-showcase-title">
                  {t('patients.modals.reactivateTitle', 'Reactivate Patient Record')}
                </h3>
              </div>
              <p className="patient-dialogs-showcase-desc">
                {t(
                  'patients.accountActions.reactivateCardDesc',
                  'Restore active account status and reinstate portal access for deactivated patient records.'
                )}
              </p>
              <button
                type="button"
                className="patient-dialogs-showcase-btn"
                style={{ backgroundColor: '#006a60' }}
                onClick={() => setActiveDialog('reactivate')}
              >
                {t('patients.accountActions.openReactivate', 'Preview Reactivate Dialog')}
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* ====================================================================
          LIVE MODAL INSTANCES
          ==================================================================== */}
      <DeactivatePatientDialog
        isOpen={activeDialog === 'deactivate'}
        patientName={patient.name}
        isReactivating={false}
        isLoading={isProcessing}
        onClose={() => setActiveDialog('none')}
        onConfirm={handleConfirmDeactivate}
      />

      <DeactivatePatientDialog
        isOpen={activeDialog === 'reactivate'}
        patientName={patient.name}
        isReactivating={true}
        isLoading={isProcessing}
        onClose={() => setActiveDialog('none')}
        onConfirm={handleConfirmReactivate}
      />

      <ResetPatientPasswordDialog
        isOpen={activeDialog === 'reset'}
        patientEmail={patient.email}
        isLoading={isProcessing}
        onClose={() => setActiveDialog('none')}
        onConfirm={handleConfirmResetPassword}
      />

      <EditPatientProfileDialog
        isOpen={activeDialog === 'edit'}
        patient={patient}
        isLoading={isProcessing}
        onClose={() => setActiveDialog('none')}
        onSave={handleSaveProfile}
      />

      {/* Feedback Snackbar */}
      <ActionSuccessSnackbar
        isVisible={Boolean(snackbarMessage)}
        message={snackbarMessage || ''}
        onDismiss={() => setSnackbarMessage(null)}
      />
    </div>
  );
};

export default AdminPatientActionDialogs;
