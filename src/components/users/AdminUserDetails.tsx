import React, { useState, useId, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Menu,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';

// Styling
import '../dashboard/AdminDashboard.css';
import './AdminUserDetails.css';

// Authentic Branding & Shell Assets
import logoImg from '../../assets/dashboard/careid-logo.png';
import headerAvatarImg from '../../assets/dashboard/header-avatar.png';

// Sidebar Nav Assets
import navDashboardIcon from '../../assets/dashboard/nav-dashboard.svg';
import navUsersIcon from '../../assets/dashboard/nav-users.svg';
import navPatientsIcon from '../../assets/dashboard/nav-patients.svg';
import navDoctorsIcon from '../../assets/dashboard/nav-doctors.svg';
import navFacilitiesIcon from '../../assets/dashboard/nav-facilities.svg';
import navRecordsIcon from '../../assets/dashboard/nav-records.svg';
import navOcrIcon from '../../assets/dashboard/nav-ocr.svg';
import navReferralsIcon from '../../assets/dashboard/nav-referrals.svg';
import navReportsIcon from '../../assets/dashboard/nav-reports.svg';
import navSettingsIcon from '../../assets/dashboard/nav-settings.svg';
import navAuditIcon from '../../assets/dashboard/nav-audit.svg';
import navSupportIcon from '../../assets/dashboard/nav-support.svg';
import navOcrBtnIcon from '../../assets/dashboard/nav-ocr-btn.svg';
import SidebarLogoutButton from '../common/SidebarLogoutButton';
import DeactivateUserDialog from './DeactivateUserDialog';
import ResetPasswordDialog from './ResetPasswordDialog';
import ActionSuccessSnackbar from './ActionSuccessSnackbar';

// Header & Shared User Assets
import headerBellIcon from '../../assets/users/header-bell.svg';
import appsGridIcon from '../../assets/users/apps-grid.svg';
import breadcrumbChevron from '../../assets/users/breadcrumb-chevron.svg';

// User Details Specific Figma Assets (Node 20:882)
import profileJenkinsLarge from '../../assets/users/profile-jenkins-large.png';
import detailsSearchIcon from '../../assets/users/details-search.svg';
import iconResetPassword from '../../assets/users/icon-reset-password.svg';
import iconSuspend from '../../assets/users/icon-suspend.svg';
import iconEditProfile from '../../assets/users/icon-edit-profile.svg';
import iconActiveCheck from '../../assets/users/icon-active-check.svg';
import iconAvatarBadge from '../../assets/users/icon-avatar-badge.svg';
import iconAccountInfo from '../../assets/users/icon-account-info.svg';
import iconEmailVerified from '../../assets/users/icon-email-verified.svg';
import iconSecurityOverview from '../../assets/users/icon-security-overview.svg';
import iconTilePassword from '../../assets/users/icon-tile-password.svg';
import iconTile2fa from '../../assets/users/icon-tile-2fa.svg';
import iconTileSessions from '../../assets/users/icon-tile-sessions.svg';
import iconTileDevices from '../../assets/users/icon-tile-devices.svg';

// TanStack Query & Service
import {
  useUserQuery,
  useUpdateUserMutation,
  useToggleUserStatusMutation,
} from '../../services/userService';

// Zod Validation Schema for Edit Profile
const editProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(6, 'Please enter a valid phone number'),
  role: z.enum(['Doctor', 'Patient', 'Admin'] as const),
  status: z.enum(['ACTIVE', 'INACTIVE'] as const),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

export interface AdminUserDetailsProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminUserDetails: React.FC<AdminUserDetailsProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const routeParams = useParams<{ userId: string }>();
  const navigate = useNavigate();

  // Search and Accessibility IDs
  const searchInputId = useId();
  const formNameId = useId();
  const formEmailId = useId();
  const formPhoneId = useId();
  const formRoleId = useId();
  const formStatusId = useId();

  // Selected User ID (defaults to 'user-1' if direct navigation without param)
  const currentUserId = routeParams.userId || 'user-1';

  // Navigation Helper
  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  // State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ title: string; message: string } | null>(null);

  // Dialog States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // TanStack Query
  const { data: user, isLoading } = useUserQuery(currentUserId);
  const updateUserMutation = useUpdateUserMutation();
  const toggleStatusMutation = useToggleUserStatusMutation();

  // React Hook Form for Edit Profile
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'Doctor',
      status: 'ACTIVE',
    },
  });

  // Populate form when user data loads or modal opens
  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      });
    }
  }, [user, reset]);

  // Handle Edit Profile Form Submit
  const onEditProfileSubmit = async (formData: EditProfileFormData) => {
    if (!user) return;
    try {
      await updateUserMutation.mutateAsync({
        id: user.id,
        ...formData,
      });
      setIsEditModalOpen(false);
      setFeedbackToast({
        title: 'Profile Updated',
        message: t('userDetails.toasts.updateSuccess', { name: formData.name }),
      });
    } catch {
      setFeedbackToast({
        title: 'Update Failed',
        message: 'Could not update user profile. Please try again.',
      });
    }
  };

  // Handle Password Reset Confirm
  const handleConfirmResetPassword = () => {
    if (!user) return;
    setIsResetModalOpen(false);
    setSnackbarMessage(
      t('userActionDialogs.snackbar.passwordResetSuccess', 'User password has been reset successfully.')
    );
  };

  // Handle Suspend / Reactivate Confirm
  const handleConfirmToggleStatus = async () => {
    if (!user) return;
    try {
      const updated = await toggleStatusMutation.mutateAsync(user.id);
      setIsSuspendModalOpen(false);
      const isNowActive = updated.status === 'ACTIVE';
      setSnackbarMessage(
        isNowActive
          ? t('userActionDialogs.snackbar.activateSuccess', { name: user.name })
          : t('userActionDialogs.snackbar.deactivateSuccess', { name: user.name })
      );
    } catch {
      setFeedbackToast({
        title: 'Action Failed',
        message: 'Could not update account status. Please try again.',
      });
    }
  };

  const isUserActive = user?.status === 'ACTIVE';

  return (
    <div className="careid-dashboard-shell">
      {/* ====================================================================
          SIDEBAR NAVIGATION (Fixed shell component)
          ==================================================================== */}
      <aside className={`careid-sidebar ${isDrawerOpen ? 'drawer-open' : ''}`} data-node-id="20:1025">
        {/* Sidebar Logo */}
        <div className="sidebar-logo-container" data-node-id="20:1026">
          <img src={logoImg} alt="CareID" className="sidebar-logo" data-node-id="20:1029" />
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close sidebar navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav-list" data-node-id="20:1030" aria-label="Main Navigation">
          {/* Dashboard */}
          <button
            type="button"
            className="sidebar-nav-item"
            data-node-id="20:1031"
            onClick={() => handleNav('/admin/dashboard')}
          >
            <span className="sidebar-nav-icon">
              <img src={navDashboardIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.dashboard')}</span>
          </button>

          {/* Active Navigation: Users */}
          <button
            type="button"
            className="sidebar-nav-item active"
            data-node-id="20:1035"
            onClick={() => handleNav('/admin/users')}
            aria-current="page"
          >
            <span className="sidebar-nav-icon">
              <img src={navUsersIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.users')}</span>
          </button>

          {/* Patients */}
          <button
            type="button"
            className="sidebar-nav-item"
            data-node-id="20:1039"
            onClick={() => handleNav('/admin/patients')}
          >
            <span className="sidebar-nav-icon">
              <img src={navPatientsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.patients')}</span>
          </button>

          {/* Doctors */}
          <button
            type="button"
            className="sidebar-nav-item"
            data-node-id="20:1043"
            onClick={() => handleNav('/admin/doctors')}
          >
            <span className="sidebar-nav-icon">
              <img src={navDoctorsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.doctors')}</span>
          </button>

          {/* Facilities */}
          <button
            type="button"
            className="sidebar-nav-item"
            data-node-id="20:1047"
            onClick={() => handleNav('/admin/facilities')}
          >
            <span className="sidebar-nav-icon">
              <img src={navFacilitiesIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.facilities')}</span>
          </button>

          {/* Health Records */}
          <button
            type="button"
            className="sidebar-nav-item"
            data-node-id="20:1052"
            onClick={() => handleNav('/admin/records')}
          >
            <span className="sidebar-nav-icon">
              <img src={navRecordsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.healthRecords')}</span>
          </button>

          {/* OCR Verification with Badge 12 */}
          <button
            type="button"
            className="sidebar-nav-item"
            data-node-id="20:1056"
            onClick={() => handleNav('/admin/ocr')}
          >
            <span className="sidebar-nav-icon">
              <img src={navOcrIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.ocrVerification')}</span>
            <span className="sidebar-badge sidebar-badge-red" data-node-id="20:1061">
              12
            </span>
          </button>

          {/* Referrals with Badge 5 */}
          <button
            type="button"
            className="sidebar-nav-item"
            data-node-id="20:1063"
            onClick={() => handleNav('/admin/referrals')}
          >
            <span className="sidebar-nav-icon">
              <img src={navReferralsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.referrals')}</span>
            <span className="sidebar-badge sidebar-badge-amber" data-node-id="20:1068">
              5
            </span>
          </button>

          {/* Reports */}
          <button
            type="button"
            className="sidebar-nav-item"
            data-node-id="20:1070"
            onClick={() => handleNav('/admin/reports')}
          >
            <span className="sidebar-nav-icon">
              <img src={navReportsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.reports')}</span>
          </button>

          {/* Divider */}
          <div className="sidebar-divider" data-node-id="20:1074" role="separator" />

          {/* System Settings */}
          <button
            type="button"
            className="sidebar-nav-item"
            data-node-id="20:1075"
            onClick={() => handleNav('/admin/settings')}
          >
            <span className="sidebar-nav-icon">
              <img src={navSettingsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.systemSettings')}</span>
          </button>

          {/* Audit Logs */}
          <button
            type="button"
            className="sidebar-nav-item"
            data-node-id="20:1079"
            onClick={() => handleNav('/admin/audit')}
          >
            <span className="sidebar-nav-icon">
              <img src={navAuditIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.auditLogs')}</span>
          </button>

          {/* Support */}
          <button
            type="button"
            className="sidebar-nav-item"
            data-node-id="20:1083"
            onClick={() => handleNav('/admin/support')}
          >
            <span className="sidebar-nav-icon">
              <img src={navSupportIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.support')}</span>
          </button>
        </nav>

        {/* Stationary Bottom Actions: Review Pending OCR & Logout Button */}
        <div className="sidebar-footer" data-node-id="20:506">
          <button
            type="button"
            className="sidebar-cta-btn"
            onClick={() => handleNav('/admin/ocr')}
            data-node-id="20:507"
          >
            <img src={navOcrBtnIcon} alt="" data-node-id="20:508" />
            <span data-node-id="20:510">{t('dashboard.nav.reviewPendingOcr')}</span>
          </button>

          <SidebarLogoutButton onLogout={onLogout} />
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isDrawerOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ====================================================================
          MAIN CONTENT WRAPPER (Scrolls independently)
          ==================================================================== */}
      <div className="user-details-main">
        {/* Top App Bar Header */}
        <header className="user-details-header" data-node-id="20:884">
          <div className="user-details-header-left">
            <button
              type="button"
              className="user-details-hamburger"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open sidebar drawer"
            >
              <Menu size={22} />
            </button>

            {/* Top Search Pill */}
            <div className="user-details-search-pill" data-node-id="20:886">
              <span className="user-details-search-icon" data-node-id="20:891">
                <img src={detailsSearchIcon} alt="" />
              </span>
              <input
                id={searchInputId}
                type="text"
                className="user-details-search-input"
                placeholder={t('userDetails.header.searchPlaceholder')}
                data-node-id="20:887"
                aria-label="Search"
              />
            </div>
          </div>

          {/* Top Header Right Actions */}
          <div className="user-details-header-right" data-node-id="20:892">
            <button
              type="button"
              className="user-details-header-link"
              data-node-id="20:893"
              onClick={() =>
                setFeedbackToast({
                  title: 'Support',
                  message: 'Health Vault administrative support desk.',
                })
              }
            >
              {t('userDetails.header.support')}
            </button>

            <button
              type="button"
              className="user-details-header-console"
              data-node-id="20:895"
              onClick={() =>
                setFeedbackToast({
                  title: 'Admin Console',
                  message: 'Active Administrative Domain: Primary Tenant.',
                })
              }
            >
              {t('userDetails.header.adminConsole')}
            </button>

            <div className="user-details-header-icons" data-node-id="20:898">
              <button
                type="button"
                className="user-details-icon-btn"
                data-node-id="20:899"
                aria-label="Notifications"
                onClick={() =>
                  setFeedbackToast({
                    title: 'Notifications',
                    message: '1 unread security notification.',
                  })
                }
              >
                <img src={headerBellIcon} alt="Notifications" />
                <span className="user-details-header-badge" />
              </button>

              <button
                type="button"
                className="user-details-icon-btn"
                data-node-id="20:902"
                aria-label="Apps"
                onClick={() =>
                  setFeedbackToast({
                    title: 'Application Switcher',
                    message: 'Health Vault Suite.',
                  })
                }
              >
                <img src={appsGridIcon} alt="Apps" />
              </button>

              <div className="user-details-header-avatar" data-node-id="20:906">
                <img src={headerAvatarImg} alt="Admin Avatar" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Body Container */}
        <main className="user-details-container" data-node-id="20:907">
          {/* Breadcrumb & Page Title Bar */}
          <div className="user-details-title-bar" data-node-id="20:908">
            <div className="user-details-title-group" data-node-id="20:909">
              {/* Breadcrumb Nav */}
              <nav className="user-details-breadcrumbs" data-node-id="20:910" aria-label="Breadcrumb">
                <button
                  type="button"
                  className="user-details-breadcrumb-link"
                  data-node-id="20:911"
                  onClick={() => handleNav('/admin/users')}
                >
                  {t('userDetails.breadcrumbs.users')}
                </button>
                <span className="user-details-breadcrumb-separator" data-node-id="20:913">
                  <img src={breadcrumbChevron} alt=">" />
                </span>
                <span className="user-details-breadcrumb-current" data-node-id="20:915">
                  {t('userDetails.breadcrumbs.details')}
                </span>
              </nav>

              {/* Title Heading */}
              <h1 className="user-details-heading" data-node-id="20:917">
                {t('userDetails.title')}
              </h1>
            </div>

            {/* Action Buttons */}
            <div className="user-details-actions" data-node-id="20:919">
              {/* Reset Password Button */}
              <button
                type="button"
                className="btn-details-reset"
                data-node-id="20:920"
                onClick={() => setIsResetModalOpen(true)}
              >
                <img src={iconResetPassword} alt="" style={{ width: 15, height: 15 }} />
                <span>{t('userDetails.actions.resetPassword')}</span>
              </button>

              {/* Suspend or Reactivate Button */}
              {isUserActive ? (
                <button
                  type="button"
                  className="btn-details-suspend"
                  data-node-id="20:924"
                  onClick={() => setIsSuspendModalOpen(true)}
                >
                  <img src={iconSuspend} alt="" style={{ width: 15, height: 15 }} />
                  <span>{t('userDetails.actions.suspend')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-details-reactivate"
                  data-node-id="20:924"
                  onClick={() => setIsSuspendModalOpen(true)}
                >
                  <Check size={15} color="#006a60" />
                  <span>{t('userDetails.actions.reactivate')}</span>
                </button>
              )}

              {/* Edit Profile Button */}
              <button
                type="button"
                className="btn-details-edit"
                data-node-id="20:928"
                onClick={() => setIsEditModalOpen(true)}
              >
                <img src={iconEditProfile} alt="" style={{ width: 13.5, height: 13.5 }} />
                <span>{t('userDetails.actions.editProfile')}</span>
              </button>
            </div>
          </div>

          {/* Bento Grid Layout (12 columns) */}
          <div className="user-details-grid" data-node-id="20:932">
            {/* ====================================================================
                LEFT COLUMN (4 Columns): Profile Card
                ==================================================================== */}
            <div className="user-details-profile-card" data-node-id="20:933">
              {/* Avatar Wrap with Verified Badge */}
              <div className="profile-card-avatar-wrap" data-node-id="20:952">
                {user?.largeAvatarUrl || (user?.id === 'user-1' && profileJenkinsLarge) ? (
                  <img
                    src={user?.largeAvatarUrl || profileJenkinsLarge}
                    alt={user?.name || 'User Avatar'}
                    className="profile-card-avatar-img"
                    data-node-id="20:954"
                  />
                ) : user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="profile-card-avatar-img"
                    data-node-id="20:954"
                  />
                ) : (
                  <div
                    className="profile-card-avatar-initials"
                    style={{
                      backgroundColor: user?.avatarBg || '#3f1d8b',
                      color: user?.avatarColor || '#ab8efd',
                    }}
                    data-node-id="20:954"
                  >
                    {user?.initials || user?.name?.slice(0, 2).toUpperCase() || 'U'}
                  </div>
                )}

                {/* Verified Badge Icon (bottom-right of avatar) */}
                <div className="profile-card-avatar-badge" data-node-id="20:955">
                  <img src={iconAvatarBadge} alt="Verified" style={{ width: 14.67, height: 14 }} />
                </div>
              </div>

              {/* Name */}
              <h2 className="profile-card-name" data-node-id="20:935">
                {isLoading ? 'Loading...' : user?.name || 'Sarah Jenkins'}
              </h2>

              {/* Role */}
              <p className="profile-card-role" data-node-id="20:938">
                {user?.role || 'Doctor'}
              </p>

              {/* Status Badge */}
              <div
                className={`profile-card-status-badge ${
                  isUserActive ? 'status-active' : 'status-inactive'
                }`}
                data-node-id="20:941"
              >
                {isUserActive ? (
                  <>
                    <img src={iconActiveCheck} alt="" style={{ width: 11.67, height: 11.67 }} />
                    <span>{t('userDetails.profileCard.active')}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} color="#ba1a1a" />
                    <span>{t('userDetails.profileCard.inactive')}</span>
                  </>
                )}
              </div>

              {/* Health Vault ID Row at Bottom */}
              <div className="profile-card-hvid-row" data-node-id="20:946">
                <span className="profile-card-hvid-label" data-node-id="20:949">
                  {t('userDetails.profileCard.healthVaultId')}
                </span>
                <span className="profile-card-hvid-val" data-node-id="20:951">
                  {user?.hvid || 'HV-DOC-9821'}
                </span>
              </div>
            </div>

            {/* ====================================================================
                RIGHT COLUMN GROUP (8 Columns): Account Info & Security Overview
                ==================================================================== */}
            <div className="user-details-right-col" data-node-id="20:958">
              {/* Card 1: Account Information */}
              <div className="user-details-card" data-node-id="20:959">
                <div className="user-details-card-header" data-node-id="20:960">
                  <span className="user-details-card-icon" data-node-id="20:961">
                    <img src={iconAccountInfo} alt="" style={{ width: 20, height: 20 }} />
                  </span>
                  <h3 className="user-details-card-title" data-node-id="20:963">
                    {t('userDetails.accountInfo.title')}
                  </h3>
                </div>

                {/* 2x2 Field Grid */}
                <div className="user-details-info-grid" data-node-id="20:964">
                  {/* Email Address */}
                  <div className="user-details-field-item" data-node-id="20:965">
                    <span className="user-details-field-label" data-node-id="20:967">
                      {t('userDetails.accountInfo.email')}
                    </span>
                    <div className="user-details-field-val" data-node-id="20:968">
                      <span>{user?.email || 'sarah.jenkins@hospital.org'}</span>
                      {user?.verification === 'Verified' && (
                        <span className="user-details-verified-icon" data-node-id="20:970">
                          <img src={iconEmailVerified} alt="Verified" style={{ width: 14.67, height: 14 }} />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div className="user-details-field-item" data-node-id="20:972">
                    <span className="user-details-field-label" data-node-id="20:974">
                      {t('userDetails.accountInfo.phone')}
                    </span>
                    <div className="user-details-field-val" data-node-id="20:976">
                      <span>{user?.phone || '+1 (555) 019-2834'}</span>
                    </div>
                  </div>

                  {/* Created Date */}
                  <div className="user-details-field-item" data-node-id="20:977">
                    <span className="user-details-field-label" data-node-id="20:979">
                      {t('userDetails.accountInfo.createdDate')}
                    </span>
                    <div className="user-details-field-val" data-node-id="20:981">
                      <span>{user?.created || 'Oct 12, 2021'}</span>
                    </div>
                  </div>

                  {/* Last Login */}
                  <div className="user-details-field-item" data-node-id="20:982">
                    <span className="user-details-field-label" data-node-id="20:984">
                      {t('userDetails.accountInfo.lastLogin')}
                    </span>
                    <div className="user-details-field-val" data-node-id="20:986">
                      <span>{user?.lastLogin || 'Today, 08:45 AM'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Security Overview */}
              <div className="user-details-card" data-node-id="20:987">
                <div className="user-details-card-header" data-node-id="20:988">
                  <span className="user-details-card-icon" data-node-id="20:989">
                    <img src={iconSecurityOverview} alt="" style={{ width: 16, height: 20 }} />
                  </span>
                  <h3 className="user-details-card-title" data-node-id="20:991">
                    {t('userDetails.security.title')}
                  </h3>
                </div>

                {/* 2x2 Security Tiles */}
                <div className="user-details-security-grid" data-node-id="20:992">
                  {/* Tile 1: Password */}
                  <div className="user-details-security-tile" data-node-id="20:993">
                    <div className="security-tile-icon-wrap" data-node-id="20:994">
                      <img src={iconTilePassword} alt="" style={{ width: 38, height: 34 }} />
                    </div>
                    <div className="security-tile-content" data-node-id="20:996">
                      <h4 className="security-tile-title" data-node-id="20:998">
                        {t('userDetails.security.password')}
                      </h4>
                      <p className="security-tile-subtitle" data-node-id="20:1000">
                        {user?.passwordLastChanged || t('userDetails.security.passwordSub')}
                      </p>
                    </div>
                  </div>

                  {/* Tile 2: 2FA Status */}
                  <div className="user-details-security-tile tile-2fa" data-node-id="20:1001">
                    <div className="security-tile-icon-wrap" data-node-id="20:1002">
                      <img src={iconTile2fa} alt="" style={{ width: 36, height: 38 }} />
                    </div>
                    <div className="security-tile-content" data-node-id="20:1004">
                      <h4 className="security-tile-title" data-node-id="20:1006">
                        {t('userDetails.security.twoFactor')}
                      </h4>
                      <p className="security-tile-subtitle text-2fa-active" data-node-id="20:1008">
                        {user?.twoFactorStatus || t('userDetails.security.twoFactorSub')}
                      </p>
                    </div>
                  </div>

                  {/* Tile 3: Active Sessions */}
                  <div className="user-details-security-tile" data-node-id="20:1009">
                    <div className="security-tile-icon-wrap" data-node-id="20:1010">
                      <img src={iconTileSessions} alt="" style={{ width: 36, height: 38 }} />
                    </div>
                    <div className="security-tile-content" data-node-id="20:1012">
                      <h4 className="security-tile-title" data-node-id="20:1014">
                        {t('userDetails.security.sessions')}
                      </h4>
                      <p className="security-tile-subtitle" data-node-id="20:1016">
                        {user?.activeSessions || t('userDetails.security.sessionsSub')}
                      </p>
                    </div>
                  </div>

                  {/* Tile 4: Trusted Devices */}
                  <div className="user-details-security-tile" data-node-id="20:1017">
                    <div className="security-tile-icon-wrap" data-node-id="20:1018">
                      <img src={iconTileDevices} alt="" style={{ width: 32, height: 42 }} />
                    </div>
                    <div className="security-tile-content" data-node-id="20:1020">
                      <h4 className="security-tile-title" data-node-id="20:1022">
                        {t('userDetails.security.devices')}
                      </h4>
                      <p className="security-tile-subtitle" data-node-id="20:1024">
                        {user?.trustedDevices || t('userDetails.security.devicesSub')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ====================================================================
          MODAL: EDIT PROFILE FORM (React Hook Form + Zod)
          ==================================================================== */}
      {isEditModalOpen && (
        <div
          className="user-details-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
        >
          <div className="user-details-modal-box">
            <div className="user-details-modal-header">
              <div>
                <h3 id="edit-profile-title" className="user-details-modal-title">
                  {t('userDetails.modals.editProfileTitle')}
                </h3>
                <p className="user-details-modal-subtitle">
                  {t('userDetails.modals.editProfileSubtitle')}
                </p>
              </div>
              <button
                type="button"
                className="user-details-modal-close"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="Close edit profile dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onEditProfileSubmit)} className="flex flex-col gap-4">
              {/* Full Name */}
              <div className="modal-field">
                <label htmlFor={formNameId} className="modal-label">
                  {t('userDetails.modals.nameLabel')}
                </label>
                <input
                  id={formNameId}
                  type="text"
                  {...register('name')}
                  className="modal-input"
                />
                {errors.name && (
                  <span className="modal-error">{errors.name.message}</span>
                )}
              </div>

              {/* Email Address */}
              <div className="modal-field">
                <label htmlFor={formEmailId} className="modal-label">
                  {t('userDetails.modals.emailLabel')}
                </label>
                <input
                  id={formEmailId}
                  type="email"
                  {...register('email')}
                  className="modal-input"
                />
                {errors.email && (
                  <span className="modal-error">{errors.email.message}</span>
                )}
              </div>

              {/* Mobile Number */}
              <div className="modal-field">
                <label htmlFor={formPhoneId} className="modal-label">
                  {t('userDetails.modals.phoneLabel')}
                </label>
                <input
                  id={formPhoneId}
                  type="text"
                  {...register('phone')}
                  className="modal-input"
                />
                {errors.phone && (
                  <span className="modal-error">{errors.phone.message}</span>
                )}
              </div>

              {/* Role & Status (2 columns) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="modal-field">
                  <label htmlFor={formRoleId} className="modal-label">
                    {t('userDetails.modals.roleLabel')}
                  </label>
                  <select
                    id={formRoleId}
                    {...register('role')}
                    className="modal-input"
                  >
                    <option value="Doctor">Doctor</option>
                    <option value="Patient">Patient</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div className="modal-field">
                  <label htmlFor={formStatusId} className="modal-label">
                    {t('userDetails.modals.statusLabel')}
                  </label>
                  <select
                    id={formStatusId}
                    {...register('status')}
                    className="modal-input"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div className="modal-form-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  {t('userDetails.modals.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-modal-submit"
                >
                  {isSubmitting
                    ? t('userDetails.modals.saving')
                    : t('userDetails.modals.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: RESET PASSWORD DIALOG (Figma Node 20:1343)
          ==================================================================== */}
      {isResetModalOpen && (
        <ResetPasswordDialog
          isOpen={true}
          userEmail={user?.email || 'sarah.j@clinic.com'}
          onClose={() => setIsResetModalOpen(false)}
          onConfirm={handleConfirmResetPassword}
        />
      )}

      {/* ====================================================================
          MODAL: DEACTIVATE / ACTIVATE USER DIALOG (Figma Node 20:1327)
          ==================================================================== */}
      {isSuspendModalOpen && (
        <DeactivateUserDialog
          isOpen={true}
          userName={user?.name || 'Sarah Jenkins'}
          isReactivating={!isUserActive}
          isLoading={toggleStatusMutation.isPending}
          onClose={() => setIsSuspendModalOpen(false)}
          onConfirm={handleConfirmToggleStatus}
        />
      )}

      {/* Success Snackbar (Figma Node 20:1359) */}
      <ActionSuccessSnackbar
        isVisible={Boolean(snackbarMessage)}
        message={snackbarMessage || ''}
        onDismiss={() => setSnackbarMessage(null)}
      />

      {/* ====================================================================
          FEEDBACK TOAST NOTIFICATION
          ==================================================================== */}
      {feedbackToast && (
        <aside
          aria-live="polite"
          aria-label="Feedback notification"
          className="user-details-toast"
        >
          <div>
            <p className="user-details-toast-title">{feedbackToast.title}</p>
            <p className="user-details-toast-msg">{feedbackToast.message}</p>
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-white ml-2"
            onClick={() => setFeedbackToast(null)}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </aside>
      )}
    </div>
  );
};

export default AdminUserDetails;
