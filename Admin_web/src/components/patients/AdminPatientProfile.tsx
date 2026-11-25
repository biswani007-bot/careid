import React, { useState, useId } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Search,
  AlertCircle,
} from 'lucide-react';

// Styling
import '../dashboard/AdminDashboard.css';
import './AdminPatientProfile.css';

// Authentic Shared Components & Branding
import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';


// Header & Profile Icons
import iconBell from '../../assets/patients/icon-bell.svg';
import iconApps from '../../assets/patients/icon-apps.svg';
import breadcrumbChevron from '../../assets/patients/icon-chevron-right.svg';

// Semantic Patient Profile Assets from Figma Node 20:1368
import iconResetAccount from '../../assets/patients/icon-reset-account.svg';
import iconSuspendAccount from '../../assets/patients/icon-suspend-account.svg';
import iconEditProfileWhite from '../../assets/patients/icon-edit-profile-white.svg';
import iconBadgeActiveCheck from '../../assets/patients/icon-badge-active-check.svg';
import iconBloodDrop from '../../assets/patients/icon-blood-drop.svg';
import iconAccountDetailsShield from '../../assets/patients/icon-account-details-shield.svg';
import iconPersonalInfoCard from '../../assets/patients/icon-personal-info-card.svg';
import iconVerifiedCheckGreen from '../../assets/patients/icon-verified-check-green.svg';
import iconVaultFolder from '../../assets/patients/icon-vault-folder.svg';
import iconTotalRecordsFile from '../../assets/patients/icon-total-records-file.svg';
import iconFamilySharingGroup from '../../assets/patients/icon-family-sharing-group.svg';

// Dialog Components & Feedback
import DeactivatePatientDialog from './DeactivatePatientDialog';
import ResetPatientPasswordDialog from './ResetPatientPasswordDialog';
import EditPatientProfileDialog from './EditPatientProfileDialog';
import ActionSuccessSnackbar from '../users/ActionSuccessSnackbar';

// TanStack Query & Service
import {
  usePatientsQuery,
  usePatientQuery,
  useUpdatePatientMutation,
  useTogglePatientStatusMutation,
  useResetPatientAccountMutation,
  type PatientStatus,
} from '../../services/patientService';

export interface AdminPatientProfileProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminPatientProfile: React.FC<AdminPatientProfileProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const routeParams = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  // Route identifier: dynamically resolves to active backend patient if default/empty
  const isDefaultId = !routeParams.patientId || routeParams.patientId === 'pat-1';
  const { data: dirData, isLoading: isDirLoading } = usePatientsQuery(
    { limit: 5 },
    { enabled: isDefaultId }
  );
  const activePatientId = (!isDefaultId && routeParams.patientId)
    ? routeParams.patientId
    : dirData?.patients?.[0]?.id || routeParams.patientId || '';

  // Navigation & Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('patients');

  // Dialog & Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editApiError, setEditApiError] = useState<string | null>(null);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  // Snackbar State
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Accessibility IDs
  const searchInputId = useId();

  // TanStack Query
  const { data: patient, isLoading: isPatientLoading, isError, error } = usePatientQuery(activePatientId);
  const isLoading = isPatientLoading || (isDefaultId && isDirLoading && !patient);

  // Mutations
  const updatePatientMutation = useUpdatePatientMutation();
  const toggleStatusMutation = useTogglePatientStatusMutation();
  const resetAccountMutation = useResetPatientAccountMutation();

  // Open Edit Modal
  const handleOpenEditModal = () => {
    if (!patient) return;
    if (patient.profileErrorStatus === 500) {
      setSnackbarMessage('Demographic editing is disabled because the backend profile service returned HTTP 500.');
      return;
    }
    setEditApiError(null);
    setIsEditModalOpen(true);
  };

  // Form Submit Handler for Edit Patient Profile
  const handleSaveEditProfile = async (formData: {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    phone: string;
    dob: string;
    avatarUrl?: string;
  }) => {
    if (!patient) return;
    setEditApiError(null);
    try {
      await updatePatientMutation.mutateAsync({
        id: formData.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        dob: formData.dob,
        avatarUrl: formData.avatarUrl,
      });
      setIsEditModalOpen(false);
      setSnackbarMessage(
        t('patients.toasts.updateSuccess', { name: formData.name })
      );
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to update patient profile. Please try again.';
      setEditApiError(errMsg);
    }
  };

  // Toggle Suspend / Reactivate
  const handleConfirmToggleStatus = async () => {
    if (!patient) return;
    const nextStatus: PatientStatus = patient.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await toggleStatusMutation.mutateAsync({
        patientId: patient.id,
        userId: patient.userId,
        nextStatus,
      });
      setIsSuspendDialogOpen(false);
      setSnackbarMessage(
        nextStatus === 'INACTIVE'
          ? t('patientProfile.toasts.suspendSuccess', { name: patient.name })
          : t('patientProfile.toasts.reactivateSuccess', { name: patient.name })
      );
    } catch {
      setSnackbarMessage('Failed to update patient status. Please try again.');
    }
  };

  // Confirm Reset Account
  const handleConfirmResetAccount = async () => {
    if (!patient) return;
    try {
      await resetAccountMutation.mutateAsync({ patientId: patient.id });
      setIsResetDialogOpen(false);
      setSnackbarMessage(
        t('patientProfile.toasts.resetSuccess', {
          email: patient.profile?.email || patient.email,
        })
      );
    } catch {
      setSnackbarMessage('Failed to send account reset link. Please try again.');
    }
  };

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

  const isInactive = patient?.status === 'INACTIVE';
  const profile = patient?.profile;

  return (
    <div className="careid-dashboard-shell">
      {/* ====================================================================
          SIDEBAR NAVIGATION (Fixed Stationary Shell with Purple Gradient Active)
          ==================================================================== */}
      <AdminSidebar
        activeNav={activeNav}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={(path) => handleNavClick('patients', path)}
        onLogout={handleLogoutClick}
      />

      {/* Backdrop overlay for mobile drawer */}
      {isDrawerOpen && (
        <div
          className="careid-drawer-backdrop"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ====================================================================
          MAIN CONTENT AREA WITH TOP APP BAR
          ==================================================================== */}
      <div className="careid-main-wrapper patient-profile-container">
        {/* TopAppBar - Matching Shared Shell & Figma Node 20:1370 */}
        <header className="careid-top-navbar" data-node-id="20:1370">
          <div className="header-left-cluster">
            <button
              type="button"
              className="header-menu-toggle"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>

            <div className="patient-profile-search-wrap" data-node-id="20:1371">
              <label htmlFor={searchInputId} className="sr-only">
                {t('patientProfile.header.searchPlaceholder', 'Search patients, doctors...')}
              </label>
              <Search size={16} className="patient-profile-search-icon" />
              <input
                id={searchInputId}
                type="text"
                placeholder={t(
                  'patientProfile.header.searchPlaceholder',
                  'Search patients, doctors...'
                )}
                className="patient-profile-search-input"
              />
            </div>
          </div>

          <div className="users-header-actions" data-node-id="20:1377">
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
              className="users-header-support-btn"
              onClick={() => handleNavClick('support', '/admin/dashboard')}
            >
              {t('patientProfile.header.support', 'Support')}
            </button>

            <button
              type="button"
              className="patient-profile-admin-console-pill"
              onClick={() => handleNavClick('dashboard', '/admin/dashboard')}
            >
              {t('patientProfile.header.adminConsole', 'Admin Console')}
            </button>

            <div
              className="users-header-avatar cursor-pointer"
              data-node-id="20:1390"
              onClick={() => handleNavClick('profile', '/admin/profile')}
              title="My Profile & Information"
            >
              <AdminProfileAvatar size={32} />
            </div>
          </div>
        </header>

        {/* Page Canvas */}
        <main className="patient-profile-canvas" data-node-id="20:1391">
          {isLoading ? (
            <div className="patient-profile-loading">
              <div className="patient-profile-spinner" />
              <p>Loading patient profile...</p>
            </div>
          ) : isError || !patient ? (
            <div className="patient-profile-loading" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <AlertCircle size={44} color="#ba1a1a" style={{ marginBottom: 16 }} />
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>
                {error?.message?.includes('not found') || error?.message?.includes('404')
                  ? 'Patient Record Not Found'
                  : 'Unable to Load Patient Profile'}
              </h2>
              <p style={{ color: '#4b5563', maxWidth: 480, margin: '0 auto 24px', fontSize: '14px', lineHeight: 1.5 }}>
                {error instanceof Error ? error.message : 'The requested patient profile could not be retrieved from the server.'}
              </p>
              <button
                type="button"
                className="patient-profile-btn-edit"
                onClick={() => navigate('/admin/patients')}
                style={{ margin: '0 auto' }}
              >
                Back to Patient Directory
              </button>
            </div>
          ) : (
            <>
              {/* ================================================================
                  PAGE HEADER & PROFILE ACTIONS (Reset, Suspend, Edit Profile)
                  ================================================================ */}
              <div className="patient-profile-header" data-node-id="20:1393">
                <div className="patient-profile-header-left" data-node-id="20:1394">
                  {/* Breadcrumbs */}
                  <div className="patient-profile-breadcrumbs" data-node-id="20:1395">
                    <button
                      type="button"
                      className="patient-profile-crumb-parent"
                      onClick={() => handleNavClick('patients', '/admin/patients')}
                      data-node-id="20:1397"
                    >
                      {t('patientProfile.breadcrumbs.patients', 'Patients')}
                    </button>
                    <img
                      src={breadcrumbChevron}
                      alt=""
                      className="patient-profile-crumb-chevron"
                      data-node-id="20:1398"
                    />
                    <span className="patient-profile-crumb-current" data-node-id="20:1401">
                      {t('patientProfile.breadcrumbs.profile', 'Profile')}
                    </span>
                  </div>

                  <h1 className="patient-profile-title" data-node-id="20:1403">
                    {t('patientProfile.title', 'Patient Profile')}
                  </h1>
                </div>

                {/* Profile Actions */}
                <div className="patient-profile-actions" data-node-id="20:1404">
                  <button
                    type="button"
                    className="patient-profile-btn-reset"
                    onClick={() => setIsResetDialogOpen(true)}
                    data-node-id="20:1405"
                  >
                    <img src={iconResetAccount} alt="" style={{ width: 15, height: 15 }} />
                    <span>{t('patientProfile.actions.resetAccount', 'Reset Account')}</span>
                  </button>

                  <button
                    type="button"
                    className={
                      isInactive
                        ? 'patient-profile-btn-reactivate'
                        : 'patient-profile-btn-suspend'
                    }
                    onClick={() => setIsSuspendDialogOpen(true)}
                    data-node-id="20:1409"
                  >
                    <img src={iconSuspendAccount} alt="" style={{ width: 15, height: 15 }} />
                    <span>
                      {isInactive
                        ? t('patientProfile.actions.reactivate', 'Reactivate')
                        : t('patientProfile.actions.suspend', 'Suspend')}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="patient-profile-btn-edit"
                    onClick={handleOpenEditModal}
                    data-node-id="20:1413"
                  >
                    <img src={iconEditProfileWhite} alt="" style={{ width: 13.5, height: 13.5 }} />
                    <span>{t('patientProfile.actions.editProfile', 'Edit Profile')}</span>
                  </button>
                </div>
              </div>

              {/* Profile Backend Service Notice (when GET /admin/patients/:id returns 500) */}
              {patient.profileErrorStatus === 500 && (
                <div
                  className="patient-profile-server-error-banner"
                  role="alert"
                  style={{
                    backgroundColor: '#fff8f6',
                    border: '1px solid #fecdd3',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                  }}
                >
                  <AlertCircle size={22} style={{ flexShrink: 0, marginTop: '2px', color: '#dc2626' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#991b1b', marginBottom: '4px' }}>
                      Clinical Profile Demographic Service Notice (HTTP 500)
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#7f1d1d', lineHeight: '1.5' }}>
                      The backend clinical profile endpoint <code>GET /api/v1/admin/patients/{patient.id}</code> encountered an unhandled server error (HTTP 500) due to a database relational constraint. Resilient fallback safely recovered authentic patient identity, account status (<strong>{patient.accountStatus || patient.status}</strong>), and contact records from the primary user service.
                    </p>
                  </div>
                </div>
              )}

              {/* ================================================================
                  BENTO GRID LAYOUT (Col 1: 4 columns, Col 2: 8 columns)
                  ================================================================ */}
              <div className="patient-profile-grid" data-node-id="20:1417">
                {/* --------------------------------------------------------------
                    LEFT COLUMN: CORE PROFILE & ACCOUNT DETAILS
                    -------------------------------------------------------------- */}
                <div className="patient-profile-col-left" data-node-id="20:1418">
                  {/* Card 1: Core Profile */}
                  <div className="patient-profile-card-core" data-node-id="20:1419">
                    <div className="patient-profile-avatar-border" data-node-id="20:1421">
                      {patient.heroPhotoUrl || patient.avatarUrl ? (
                        <img
                          src={patient.heroPhotoUrl || patient.avatarUrl}
                          alt={patient.name}
                          className="patient-profile-avatar-img"
                          style={isInactive ? { filter: 'grayscale(1)' } : undefined}
                          data-node-id="20:1422"
                        />
                      ) : (
                        <span className="patient-profile-avatar-initials">
                          {patient.initials || patient.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <h2 className="patient-profile-name" data-node-id="20:1425">
                      {patient.name}
                    </h2>

                    <div className="patient-profile-vault-id" data-node-id="20:1428">
                      {patient.vaultId}
                    </div>

                    {/* Status Badge */}
                    <div
                      className={`patient-profile-status-badge ${
                        patient.accountStatus === 'BLOCKED' || isInactive
                          ? 'inactive'
                          : patient.verification === 'Verified'
                          ? 'verified'
                          : 'pending'
                      }`}
                      data-node-id="20:1430"
                    >
                      <img
                        src={iconBadgeActiveCheck}
                        alt=""
                        style={{ width: 13, height: 12.5 }}
                        data-node-id="20:1431"
                      />
                      <span data-node-id="20:1433">
                        {patient.accountStatus === 'BLOCKED'
                          ? 'Blocked Account'
                          : isInactive
                          ? t('patientProfile.coreCard.inactive', 'Inactive')
                          : patient.verification === 'Verified'
                          ? t('patientProfile.coreCard.activeVerified', 'Active Verified')
                          : t('patientProfile.coreCard.pendingVerification', 'Pending Verification')}
                      </span>
                    </div>

                    {/* Demographics Grid: DOB, Gender, Blood Group */}
                    <div className="patient-profile-demographics-grid" data-node-id="20:1434">
                      <div className="patient-profile-demo-field" data-node-id="20:1435">
                        <span className="patient-profile-demo-label" data-node-id="20:1437">
                          {t('patientProfile.coreCard.dob', 'DOB')}
                        </span>
                        <span className="patient-profile-demo-value" data-node-id="20:1438">
                          {profile?.dob || 'Not provided'}
                        </span>
                      </div>

                      <div className="patient-profile-demo-field" data-node-id="20:1439">
                        <span className="patient-profile-demo-label" data-node-id="20:1441">
                          {t('patientProfile.coreCard.gender', 'Gender')}
                        </span>
                        <span className="patient-profile-demo-value" data-node-id="20:1442">
                          {profile?.gender || patient.gender}
                        </span>
                      </div>

                      <div className="patient-profile-demo-field" data-node-id="20:1443">
                        <span className="patient-profile-demo-label" data-node-id="20:1445">
                          {t('patientProfile.coreCard.bloodGroup', 'Blood Group')}
                        </span>
                        <div className="patient-profile-blood-group" data-node-id="20:1446">
                          <img
                            src={iconBloodDrop}
                            alt=""
                            className="patient-profile-blood-icon"
                            data-node-id="20:1447"
                          />
                          <span className="patient-profile-demo-value" data-node-id="20:1449">
                            {profile?.bloodGroup || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Account Details */}
                  <div className="patient-profile-card-account" data-node-id="20:1450">
                    <div className="patient-profile-card-title" data-node-id="20:1451">
                      <img
                        src={iconAccountDetailsShield}
                        alt=""
                        className="patient-profile-card-title-icon"
                        data-node-id="20:1452"
                      />
                      <span data-node-id="20:1454">
                        {t('patientProfile.accountDetails.title', 'Account Details')}
                      </span>
                    </div>

                    <div className="patient-profile-account-rows" data-node-id="20:1455">
                      <div className="patient-profile-row" data-node-id="20:1456">
                        <span className="patient-profile-row-label" data-node-id="20:1458">
                          {t('patientProfile.accountDetails.registered', 'Registered')}
                        </span>
                        <span className="patient-profile-row-value" data-node-id="20:1460">
                          {profile?.registeredDateFormatted || patient.registered}
                        </span>
                      </div>

                      <div className="patient-profile-row" data-node-id="20:1461">
                        <span className="patient-profile-row-label" data-node-id="20:1463">
                          {t('patientProfile.accountDetails.verificationLevel', 'Verification Level')}
                        </span>
                        <span className="patient-profile-row-value" data-node-id="20:1465">
                          {patient.profileErrorStatus === 500
                            ? 'Identity Verified (Profile Sync Pending)'
                            : profile?.verificationLevel || (patient.verification === 'Verified' ? 'Tier 3 (Gov ID)' : 'Tier 1 (Pending Onboarding)')}
                        </span>
                      </div>

                      <div className="patient-profile-row" data-node-id="20:1466">
                        <span className="patient-profile-row-label" data-node-id="20:1468">
                          {t('patientProfile.accountDetails.lastLogin', 'Last Login')}
                        </span>
                        <span className="patient-profile-row-value" data-node-id="20:1470">
                          {profile?.lastLogin && profile.lastLogin !== '2 hours ago' ? profile.lastLogin : 'Never logged in'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* --------------------------------------------------------------
                    RIGHT COLUMN: PERSONAL INFORMATION & MEDICAL/FAMILY SUMMARY
                    -------------------------------------------------------------- */}
                <div className="patient-profile-col-right" data-node-id="20:1471">
                  {/* Card 3: Personal Information */}
                  <div className="patient-profile-card-personal" data-node-id="20:1472">
                    <div className="patient-profile-personal-header" data-node-id="20:1473">
                      <img
                        src={iconPersonalInfoCard}
                        alt=""
                        className="patient-profile-card-title-icon"
                        data-node-id="20:1474"
                      />
                      <span data-node-id="20:1476">
                        {t('patientProfile.personalInfo.title', 'Personal Information')}
                      </span>
                    </div>

                    <div className="patient-profile-personal-grid" data-node-id="20:1477">
                      {/* Left subcol: Email & Phone */}
                      <div className="patient-profile-contact-col" data-node-id="20:1478">
                        <div className="patient-profile-field-group" data-node-id="20:1479">
                          <span className="patient-profile-field-label" data-node-id="20:1481">
                            {t('patientProfile.personalInfo.email', 'Email Address')}
                          </span>
                          <div className="patient-profile-field-value-row" data-node-id="20:1482">
                            <span className="patient-profile-field-value" data-node-id="20:1483">
                              {profile?.email || patient.email}
                            </span>
                            <img
                              src={iconVerifiedCheckGreen}
                              alt="Verified"
                              className="patient-profile-verified-icon"
                              data-node-id="20:1484"
                            />
                          </div>
                        </div>

                        <div className="patient-profile-field-group" data-node-id="20:1486">
                          <span className="patient-profile-field-label" data-node-id="20:1488">
                            {t('patientProfile.personalInfo.phone', 'Phone Number')}
                          </span>
                          <div className="patient-profile-field-value-row" data-node-id="20:1489">
                            <span className="patient-profile-field-value" data-node-id="20:1490">
                              {profile?.phone || patient.phone}
                            </span>
                            <img
                              src={iconVerifiedCheckGreen}
                              alt="Verified"
                              className="patient-profile-verified-icon"
                              data-node-id="20:1491"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right subcol: Primary Address */}
                      <div className="patient-profile-field-group" data-node-id="20:1493">
                        <span className="patient-profile-field-label" data-node-id="20:1496">
                          {t('patientProfile.personalInfo.primaryAddress', 'Primary Address')}
                        </span>
                        <div data-node-id="20:1498">
                          <p className="patient-profile-address-text">
                            {profile?.primaryAddress?.line1 && profile.primaryAddress.line1 !== '4822 Willow Creek Dr.'
                              ? profile.primaryAddress.line1
                              : 'Not provided (Pending Onboarding)'}
                          </p>
                          {profile?.primaryAddress?.line2 && (
                            <p className="patient-profile-address-text">
                              {profile.primaryAddress.line2}
                            </p>
                          )}
                          <p className="patient-profile-address-text">
                            {profile?.primaryAddress?.cityStateZip && profile.primaryAddress.cityStateZip !== 'Seattle, WA 98101'
                              ? profile.primaryAddress.cityStateZip
                              : '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contact Container */}
                    <div className="patient-profile-emergency-box" data-node-id="20:1499">
                      <span className="patient-profile-emergency-label" data-node-id="20:1501">
                        {t('patientProfile.personalInfo.emergencyContact', 'Emergency Contact')}
                      </span>
                      <div className="patient-profile-emergency-content" data-node-id="20:1502">
                        <div className="patient-profile-emergency-details" data-node-id="20:1503">
                          <span className="patient-profile-emergency-name" data-node-id="20:1504">
                            {profile?.emergencyContact?.name && profile.emergencyContact.name !== 'Not provided (Pending Onboarding)'
                              ? `${profile.emergencyContact.name} (${profile.emergencyContact.relation || 'Contact'})`
                              : 'Not provided (Pending Onboarding)'}
                          </span>
                          <span className="patient-profile-emergency-phone" data-node-id="20:1505">
                            {profile?.emergencyContact?.phone || 'No emergency contact on file'}
                          </span>
                        </div>
                        {profile?.emergencyContact?.name && profile.emergencyContact.name !== 'Not provided (Pending Onboarding)' && (
                          <button
                            type="button"
                            className="patient-profile-emergency-btn"
                            onClick={() => {
                              setSnackbarMessage('Opening Emergency Contact Authorization Form...');
                            }}
                            data-node-id="20:1507"
                          >
                            {t('patientProfile.personalInfo.viewAuthForm', 'View Auth Form')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dual Bottom Subcards: Vault Summary & Family & Sharing */}
                  <div className="patient-profile-bottom-cards" data-node-id="20:1508">
                    {/* Subcard 1: Vault Summary */}
                    <div className="patient-profile-card-vault" data-node-id="20:1509">
                      <div className="patient-profile-card-title" data-node-id="20:1510">
                        <img
                          src={iconVaultFolder}
                          alt=""
                          className="patient-profile-card-title-icon"
                          data-node-id="20:1511"
                        />
                        <span data-node-id="20:1513">
                          {t('patientProfile.vaultSummary.title', 'Vault Summary')}
                        </span>
                      </div>

                      <div className="patient-profile-account-rows" data-node-id="20:1514">
                        {/* Total Records Banner */}
                        <div className="patient-profile-vault-banner" data-node-id="20:1515">
                          <div className="patient-profile-vault-banner-left" data-node-id="20:1516">
                            <div className="patient-profile-vault-icon-box" data-node-id="20:1517">
                              <img
                                src={iconTotalRecordsFile}
                                alt=""
                                style={{ width: 16, height: 20 }}
                                data-node-id="20:1518"
                              />
                            </div>
                            <div className="patient-profile-vault-banner-info" data-node-id="20:1520">
                              <span className="patient-profile-vault-banner-title" data-node-id="20:1522">
                                {t('patientProfile.vaultSummary.totalRecords', 'Total Records')}
                              </span>
                              <span className="patient-profile-vault-banner-sub" data-node-id="20:1523">
                                {t('patientProfile.vaultSummary.encryptedAndStored', 'Encrypted & Stored')}
                              </span>
                            </div>
                          </div>
                          <span className="patient-profile-vault-banner-count" data-node-id="20:1525">
                            {profile?.vaultSummary?.totalRecords ?? patient.links?.records ?? 0}
                          </span>
                        </div>

                        <div className="patient-profile-row" data-node-id="20:1526">
                          <span className="patient-profile-row-label" data-node-id="20:1528">
                            {t('patientProfile.vaultSummary.latestUpload', 'Latest Upload')}
                          </span>
                          <span className="patient-profile-row-value" data-node-id="20:1530">
                            {profile?.vaultSummary?.latestUpload && profile.vaultSummary.latestUpload !== '12 Oct 2023'
                              ? profile.vaultSummary.latestUpload
                              : 'No records uploaded'}
                          </span>
                        </div>

                        <div className="patient-profile-row" data-node-id="20:1531">
                          <span className="patient-profile-row-label" data-node-id="20:1533">
                            {t('patientProfile.vaultSummary.pendingOcr', 'Pending OCR')}
                          </span>
                          <span className="patient-profile-ocr-badge" data-node-id="20:1535">
                            {t('patientProfile.vaultSummary.documents', {
                              count: profile?.vaultSummary?.pendingOcrCount ?? 0,
                            })}
                          </span>
                        </div>

                        <div className="patient-profile-row" data-node-id="20:1536">
                          <span className="patient-profile-row-label" data-node-id="20:1538">
                            {t('patientProfile.vaultSummary.vaxPassStatus', 'Vax Pass Status')}
                          </span>
                          <span className="patient-profile-vax-status" data-node-id="20:1540">
                            {profile?.vaultSummary?.vaxPassStatus && profile.vaultSummary.vaxPassStatus !== 'Up to date'
                              ? profile.vaultSummary.vaxPassStatus
                              : 'Not enrolled'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Subcard 2: Family & Sharing */}
                    <div className="patient-profile-card-family" data-node-id="20:1541">
                      <div className="patient-profile-card-title" data-node-id="20:1542">
                        <img
                          src={iconFamilySharingGroup}
                          alt=""
                          className="patient-profile-card-title-icon"
                          data-node-id="20:1543"
                        />
                        <span data-node-id="20:1545">
                          {t('patientProfile.familySharing.title', 'Family & Sharing')}
                        </span>
                      </div>

                      <div className="patient-profile-account-rows" data-node-id="20:1546">
                        <span className="patient-profile-field-label" data-node-id="20:1549">
                          {t('patientProfile.familySharing.dependents', {
                            count: profile?.dependents?.length ?? 0,
                          })}
                        </span>

                        <div className="patient-profile-dependents-list" data-node-id="20:1550">
                          {profile?.dependents && profile.dependents.length > 0 ? (
                            profile.dependents.map((dep, idx) => (
                              <div
                                key={`${dep.name}-${idx}`}
                                className="patient-profile-dependent-item"
                                data-node-id={idx === 0 ? '20:1551' : '20:1558'}
                              >
                                <div className="patient-profile-dependent-avatar">
                                  {dep.initials}
                                </div>
                                <div className="patient-profile-dependent-info">
                                  <span className="patient-profile-dependent-name">
                                    {dep.name}
                                  </span>
                                  <span className="patient-profile-dependent-relation">
                                    {dep.relation}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="patient-profile-row-label">No dependents linked.</p>
                          )}
                        </div>

                        <div className="patient-profile-family-bottom" data-node-id="20:1565">
                          <div className="patient-profile-row" data-node-id="20:1566">
                            <span className="patient-profile-row-label" data-node-id="20:1568">
                              {t(
                                'patientProfile.familySharing.dataSharingConsent',
                                'Data Sharing Consent'
                              )}
                            </span>
                            <span className="patient-profile-consent-status" data-node-id="20:1570">
                              {profile?.dataSharingConsent || 'Not configured'}
                            </span>
                          </div>

                          <div className="patient-profile-row" data-node-id="20:1571">
                            <span className="patient-profile-row-label" data-node-id="20:1573">
                              {t(
                                'patientProfile.familySharing.activeProviderLinks',
                                'Active Provider Links'
                              )}
                            </span>
                            <span className="patient-profile-facilities-count" data-node-id="20:1575">
                              {profile?.activeProviderLinks && profile.activeProviderLinks !== '3 Facilities'
                                ? profile.activeProviderLinks
                                : 'None'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* ====================================================================
          PATIENT ACCOUNT ACTIONS DIALOGS (Figma Node 20:2149)
          ==================================================================== */}
      <EditPatientProfileDialog
        isOpen={isEditModalOpen}
        patient={patient || null}
        isLoading={updatePatientMutation.isPending}
        apiError={editApiError}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditApiError(null);
        }}
        onSave={handleSaveEditProfile}
      />

      <DeactivatePatientDialog
        isOpen={isSuspendDialogOpen}
        patientName={patient?.name || 'Eleanor Vance'}
        isReactivating={isInactive}
        isLoading={toggleStatusMutation.isPending}
        onClose={() => setIsSuspendDialogOpen(false)}
        onConfirm={handleConfirmToggleStatus}
      />

      <ResetPatientPasswordDialog
        isOpen={isResetDialogOpen}
        patientEmail={patient?.profile?.email || patient?.email || 'eleanor.vance@example.com'}
        isLoading={resetAccountMutation.isPending}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleConfirmResetAccount}
      />

      {/* ====================================================================
          ACTION SUCCESS FEEDBACK SNACKBAR
          ==================================================================== */}
      {snackbarMessage && (
        <ActionSuccessSnackbar
          isVisible={Boolean(snackbarMessage)}
          message={snackbarMessage}
          onDismiss={() => setSnackbarMessage(null)}
        />
      )}
    </div>
  );
};

export default AdminPatientProfile;
