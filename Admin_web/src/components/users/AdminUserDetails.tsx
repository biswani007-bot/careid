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
  Sparkles,
} from 'lucide-react';

// Styling
import '../dashboard/AdminDashboard.css';
import './AdminUserDetails.css';

// Authentic Branding & Shell Assets
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import AdminSidebar from '../common/AdminSidebar';
import DeactivateUserDialog from './DeactivateUserDialog';
import ResetPasswordDialog from './ResetPasswordDialog';
import ActionSuccessSnackbar from './ActionSuccessSnackbar';

// Header & Shared User Assets
import headerBellIcon from '../../assets/users/header-bell.svg';
import appsGridIcon from '../../assets/users/apps-grid.svg';
import breadcrumbChevron from '../../assets/users/breadcrumb-chevron.svg';

// User Details Specific Figma Assets (Node 20:882)
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
  useResetUserPasswordMutation,
  useUserSessionsQuery,
  useUserAuditLogsQuery,
  useRevokeSessionMutation,
  useRevokeAllSessionsMutation,
} from '../../services/userService';

// Zod Validation Schema for Edit Profile
const editProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(6, 'Please enter a valid phone number'),
  role: z.enum([
    'Doctor',
    'Patient',
    'Admin',
    'Staff',
    'Facility Admin',
    'Family Member',
    'Super Admin',
  ] as const),
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
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // TanStack Query
  const { data: user, isLoading } = useUserQuery(currentUserId);
  const updateUserMutation = useUpdateUserMutation();
  const toggleStatusMutation = useToggleUserStatusMutation();
  const resetPasswordMutation = useResetUserPasswordMutation();
  const revokeSessionMutation = useRevokeSessionMutation();
  const revokeAllSessionsMutation = useRevokeAllSessionsMutation();
  const { data: activeSessionsData, refetch: refetchSessions } = useUserSessionsQuery();
  const { data: userAuditLogsData } = useUserAuditLogsQuery(user?.id);

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
        name: formData.name,
        role: formData.role,
        status: formData.status,
      });
      setIsEditModalOpen(false);
      setFeedbackToast({
        title: 'Profile Updated',
        message: t('userDetails.toasts.updateSuccess', { name: formData.name }),
      });
    } catch (err: any) {
      setFeedbackToast({
        title: 'Update Failed',
        message: err?.message || 'Could not update user profile. Please try again.',
      });
    }
  };

  // Handle Password Reset Confirm
  const handleConfirmResetPassword = async () => {
    if (!user) return;
    try {
      await resetPasswordMutation.mutateAsync({ userId: user.id });
      setIsResetModalOpen(false);
      setSnackbarMessage(
        t('userActionDialogs.snackbar.passwordResetSuccess', 'User password has been reset successfully. Active sessions revoked.')
      );
    } catch (err: any) {
      setIsResetModalOpen(false);
      setFeedbackToast({
        title: 'Reset Failed',
        message: err?.message || 'Could not reset password. Please try again.',
      });
    }
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
      <AdminSidebar
        activeNav="users"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
        ctaLabel="+ New Record"
        onCtaClick={() => handleNav('/admin/records/upload')}
      />

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
      <div className="careid-main-wrapper user-details-main">
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
                  message: 'CareID administrative support desk.',
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
                    message: 'CareID Suite.',
                  })
                }
              >
                <img src={appsGridIcon} alt="Apps" />
              </button>

              <div
                className="user-details-header-avatar cursor-pointer flex items-center justify-center"
                onClick={() => handleNav('/admin/profile')}
                title="My Profile & Information"
                role="button"
                tabIndex={0}
                data-node-id="20:906"
              >
                <AdminProfileAvatar size={32} />
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
                {user?.largeAvatarUrl || user?.avatarUrl ? (
                  <img
                    src={user.largeAvatarUrl || user.avatarUrl}
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
                    {user?.initials || 'U'}
                  </div>
                )}

                {/* Verified Badge Icon (bottom-right of avatar) */}
                {user?.verification === 'Verified' && (
                  <div className="profile-card-avatar-badge" data-node-id="20:955">
                    <img src={iconAvatarBadge} alt="Verified" style={{ width: 14.67, height: 14 }} />
                  </div>
                )}
              </div>

              {/* Name */}
              <h2 className="profile-card-name" data-node-id="20:935">
                {isLoading ? 'Loading...' : user?.name || '—'}
              </h2>

              {/* Role */}
              <p className="profile-card-role" data-node-id="20:938">
                {user?.role || '—'}
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
                  {user?.hvid || '—'}
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
                      <span>{user?.email || '—'}</span>
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
                      <span>{user?.phone || '—'}</span>
                    </div>
                  </div>

                  {/* Created Date */}
                  <div className="user-details-field-item" data-node-id="20:977">
                    <span className="user-details-field-label" data-node-id="20:979">
                      {t('userDetails.accountInfo.createdDate')}
                    </span>
                    <div className="user-details-field-val" data-node-id="20:981">
                      <span>{user?.created || '—'}</span>
                    </div>
                  </div>

                  {/* Last Login */}
                  <div className="user-details-field-item" data-node-id="20:982">
                    <span className="user-details-field-label" data-node-id="20:984">
                      {t('userDetails.accountInfo.lastLogin')}
                    </span>
                    <div className="user-details-field-val" data-node-id="20:986">
                      <span>{user?.lastLogin || 'Never logged in'}</span>
                    </div>
                  </div>

                  {/* Linked Doctor Profile (if associated with Master Registry) */}
                  {user?.doctorProfile && (
                    <div className="user-details-field-item col-span-2 border-t border-[#edeef0] pt-3 mt-1">
                      <span className="user-details-field-label text-[#006a60] font-semibold">
                        LINKED DOCTOR PROFILE (MASTER REGISTRY)
                      </span>
                      <div className="flex items-center justify-between mt-1 text-sm flex-wrap gap-2">
                        <div>
                          <span className="font-bold text-[#191c1e]">{user.doctorProfile.name}</span>
                          <span className="text-[#494552] ml-2">· {user.doctorProfile.specialization} ({user.doctorProfile.registrationNumber})</span>
                        </div>
                        <a
                          href={`/admin/doctors/${user.doctorProfile.id}`}
                          className="text-[#006a60] underline text-xs font-semibold hover:text-[#004d40]"
                        >
                          View in Doctor Directory →
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Linked Staff Profile (if associated with Master Workforce Registry) */}
                  {user?.staffProfile && (
                    <div className="user-details-field-item col-span-2 border-t border-[#edeef0] pt-3 mt-1">
                      <span className="user-details-field-label text-[#0f52ba] font-semibold">
                        LINKED STAFF PROFILE (WORKFORCE REGISTRY)
                      </span>
                      <div className="flex items-center justify-between mt-1 text-sm flex-wrap gap-2">
                        <div>
                          <span className="font-bold text-[#191c1e]">{user.staffProfile.name}</span>
                          <span className="text-[#494552] ml-2">· {user.staffProfile.designation} ({user.staffProfile.employeeCode})</span>
                        </div>
                        <a
                          href="/admin/facilities"
                          className="text-[#0f52ba] underline text-xs font-semibold hover:text-[#0b3c85]"
                        >
                          View Facility Workforce →
                        </a>
                      </div>
                    </div>
                  )}
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
                  <div
                    className="user-details-security-tile cursor-pointer hover:border-[#28006d]"
                    onClick={() => setIsSessionsModalOpen(true)}
                    title="Click to view and manage active sessions"
                    data-node-id="20:1009"
                  >
                    <div className="security-tile-icon-wrap" data-node-id="20:1010">
                      <img src={iconTileSessions} alt="" style={{ width: 36, height: 38 }} />
                    </div>
                    <div className="security-tile-content" data-node-id="20:1012">
                      <h4 className="security-tile-title" data-node-id="20:1014">
                        {t('userDetails.security.sessions')}
                      </h4>
                      <p className="security-tile-subtitle" data-node-id="20:1016">
                        {Array.isArray(activeSessionsData)
                          ? `${activeSessionsData.length} Active (Click to manage)`
                          : (user?.activeSessions || t('userDetails.security.sessionsSub'))}
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

              {/* Card 3: Audit Activity Trail */}
              {userAuditLogsData && userAuditLogsData.length > 0 && (
                <div className="user-details-card mt-6" data-node-id="20:audit-logs">
                  <div className="user-details-card-header">
                    <span className="user-details-card-icon">
                      <Sparkles size={20} className="text-[#006a60]" />
                    </span>
                    <h3 className="user-details-card-title">
                      User Audit Activity ({userAuditLogsData.length} Events)
                    </h3>
                  </div>
                  <div className="divide-y divide-[#edeef0] text-xs">
                    {userAuditLogsData.slice(0, 5).map((log: any) => (
                      <div key={log.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-[#191c1e] bg-[#f0f4f8] px-2 py-0.5 rounded mr-2">
                            {log.action}
                          </span>
                          <span className="text-[#494552]">
                            {log.details ? (typeof log.details === 'object' ? JSON.stringify(log.details) : log.details) : 'Platform security event'}
                          </span>
                        </div>
                        <span className="text-[#75777a]">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                    <option value="Staff">Staff</option>
                    <option value="Facility Admin">Facility Admin</option>
                    <option value="Family Member">Family Member</option>
                    <option value="Super Admin">Super Admin</option>
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
          MODAL: ACTIVE SESSIONS (GET /api/v1/auth/sessions & DELETE /api/v1/auth/sessions/:id)
          ==================================================================== */}
      {isSessionsModalOpen && (
        <div
          className="user-details-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsSessionsModalOpen(false)}
        >
          <div className="user-details-modal-box max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="user-details-modal-header">
              <div>
                <h3 className="user-details-modal-title">Active Login Sessions</h3>
                <p className="user-details-modal-subtitle">
                  Live session management synchronized with centralized Redis/auth cluster.
                </p>
              </div>
              <button
                type="button"
                className="user-details-modal-close"
                onClick={() => setIsSessionsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#edeef0] text-xs pr-1">
              {Array.isArray(activeSessionsData) && activeSessionsData.length > 0 ? (
                activeSessionsData.map((s) => (
                  <div key={s.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#191c1e] flex items-center gap-2">
                        <span>IP: {s.ipAddress || '127.0.0.1'}</span>
                        <span className="font-mono text-[10px] text-gray-400">ID: {s.id.slice(0, 8)}</span>
                      </div>
                      <div className="text-[#64748b] text-[11px] truncate max-w-xs mt-0.5">
                        {s.userAgent || 'Authenticated API Session'}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        Established: {new Date(s.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-2.5 py-1 text-xs font-semibold text-[#ba1a1a] bg-[#ffdad6] hover:bg-[#ffb4ab] rounded transition-colors"
                      onClick={async () => {
                        try {
                          await revokeSessionMutation.mutateAsync(s.id);
                          setSnackbarMessage('Session successfully terminated.');
                          refetchSessions();
                        } catch (err: any) {
                          setFeedbackToast({
                            title: 'Revoke Failed',
                            message: err?.message || 'Could not revoke session.',
                          });
                        }
                      }}
                    >
                      Revoke
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-gray-500">No other active sessions detected.</div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#edeef0] mt-3">
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-semibold text-[#ba1a1a] border border-[#ba1a1a] rounded hover:bg-[#ffdad6] transition-colors"
                onClick={async () => {
                  try {
                    await revokeAllSessionsMutation.mutateAsync();
                    setSnackbarMessage('All other sessions revoked.');
                    refetchSessions();
                  } catch (err: any) {
                    setFeedbackToast({
                      title: 'Action Failed',
                      message: err?.message || 'Failed to revoke sessions.',
                    });
                  }
                }}
              >
                Revoke All Other Sessions
              </button>

              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setIsSessionsModalOpen(false)}
              >
                Close
              </button>
            </div>
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
