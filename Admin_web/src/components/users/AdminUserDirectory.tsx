import React, { useState, useId, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Menu,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Reusable Components
import AdminSidebar from '../common/AdminSidebar';
import UserEmptyState from './UserEmptyState';
import UserRowActionDropdown from './UserRowActionDropdown';
import DeactivateUserDialog from './DeactivateUserDialog';
import ResetPasswordDialog from './ResetPasswordDialog';
import ActionSuccessSnackbar from './ActionSuccessSnackbar';

// Styling
import '../dashboard/AdminDashboard.css';
import './AdminUserDirectory.css';

// Authentic Assets
import AdminProfileAvatar from '../common/AdminProfileAvatar';

// User Directory Specific Assets
import homeIcon from '../../assets/users/home-icon.svg';
import breadcrumbChevron from '../../assets/users/breadcrumb-chevron.svg';
import headerBellIcon from '../../assets/users/header-bell.svg';
import appsGridIcon from '../../assets/users/apps-grid.svg';
import kpiTotalUsersIcon from '../../assets/users/kpi-total-users.svg';
import kpiActiveIcon from '../../assets/users/kpi-active.svg';
import kpiInactiveIcon from '../../assets/users/kpi-inactive.svg';
import kpiPendingIcon from '../../assets/users/kpi-pending.svg';
import searchIcon from '../../assets/users/search-icon.svg';
import kebabMenuIcon from '../../assets/users/kebab-menu.svg';

// TanStack Query & Service
import {
  useUsersQuery,
  useUpdateUserMutation,
  useToggleUserStatusMutation,
  useDeleteUserMutation,
  useRestoreUserMutation,
  useResetUserPasswordMutation,
  useCreateUserMutation,
  type UserItem,
} from '../../services/userService';

// Zod Validation Schema for Add User Form
const addUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  hvid: z.string().min(3, 'HV-ID is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(6, 'Please enter a valid phone number'),
  role: z.enum(['Doctor', 'Patient', 'Admin'] as const),
  status: z.enum(['ACTIVE', 'INACTIVE'] as const),
  verification: z.enum(['Verified', 'Pending'] as const),
});

type AddUserFormData = z.infer<typeof addUserSchema>;

// Zod Validation Schema for Edit Credentials Form
const editCredentialsSchema = z.object({
  name: z.string().trim().min(2, 'Full Name is required (minimum 2 characters)').optional(),
  email: z.string().email('Please enter a valid email address').optional(),
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

type EditCredentialsFormData = z.infer<typeof editCredentialsSchema>;

export interface AdminUserDirectoryProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

const FILTER_CHIPS = [
  'All Users',
  'Admins',
  'Doctors',
  'Staff',
  'Patients',
  'divider-1',
  'Active',
  'Inactive',
  'divider-2',
  'Pending',
  'Verified',
];

export const AdminUserDirectory: React.FC<AdminUserDirectoryProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchInputId = useId();
  const pageSizeSelectId = useId();
  const formNameId = useId();
  const formHvidId = useId();
  const formEmailId = useId();
  const formPhoneId = useId();
  const formRoleId = useId();
  const formStatusId = useId();
  const formVerificationId = useId();
  const credEmailId = useId();
  const credRoleId = useId();
  const credStatusId = useId();

  // Navigation & Drawer
  const [activeNav, setActiveNav] = useState('users');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ title: string; message: string } | null>(null);

  // Filters & Pagination State
  const [activeChip, setActiveChip] = useState('All Users');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Debounce text search to eliminate redundant requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 280);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Row Actions Dropdown State (Portal-based anchor)
  const [activeKebab, setActiveKebab] = useState<{
    userId: string;
    user: UserItem;
    triggerEl: HTMLElement;
  } | null>(null);

  // Modals for Row Actions
  const [editCredentialsUser, setEditCredentialsUser] = useState<UserItem | null>(null);
  const [confirmToggleUser, setConfirmToggleUser] = useState<UserItem | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserItem | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // TanStack Query Hooks & Mutations
  const { data, isLoading, isError, error, refetch } = useUsersQuery({
    search: debouncedSearch,
    activeChip,
    page: currentPage,
    limit: pageSize,
  });

  const updateUserMutation = useUpdateUserMutation();
  const toggleUserStatusMutation = useToggleUserStatusMutation();
  const deleteUserMutation = useDeleteUserMutation();
  const restoreUserMutation = useRestoreUserMutation();
  const resetPasswordMutation = useResetUserPasswordMutation();
  const createUserMutation = useCreateUserMutation();

  // React Hook Form for Add User
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddUserFormData>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      name: '',
      hvid: 'HV-84920',
      email: '',
      phone: '',
      role: 'Patient',
      status: 'ACTIVE',
      verification: 'Verified',
    },
  });

  // React Hook Form for Edit Credentials
  const {
    register: registerCred,
    handleSubmit: handleSubmitCred,
    reset: resetCred,
    formState: { errors: errorsCred, isSubmitting: isSubmittingCred },
  } = useForm<EditCredentialsFormData>({
    resolver: zodResolver(editCredentialsSchema),
    defaultValues: {
      email: '',
      role: 'Doctor',
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (editCredentialsUser) {
      resetCred({
        name: editCredentialsUser.name !== '—' ? editCredentialsUser.name : '',
        email: editCredentialsUser.email !== '—' ? editCredentialsUser.email : '',
        role: editCredentialsUser.role,
        status: editCredentialsUser.status,
      });
    }
  }, [editCredentialsUser, resetCred]);

  const onEditCredentialsSubmit = async (formData: EditCredentialsFormData) => {
    if (!editCredentialsUser) return;
    try {
      await updateUserMutation.mutateAsync({
        id: editCredentialsUser.id,
        name: formData.name,
        role: formData.role,
        status: formData.status,
      });
      const userName = formData.name || editCredentialsUser.name;
      setEditCredentialsUser(null);
      setFeedbackToast({
        title: 'Credentials & Roles Updated',
        message: `System roles and account status successfully updated for ${userName}.`,
      });
    } catch (err: any) {
      setFeedbackToast({
        title: 'Update Failed',
        message: err?.message || 'Could not update user credentials. Please try again.',
      });
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!confirmToggleUser) return;
    try {
      const updated = await toggleUserStatusMutation.mutateAsync(confirmToggleUser.id);
      const isNowActive = updated.status === 'ACTIVE';
      const userName = confirmToggleUser.name;
      setConfirmToggleUser(null);
      setSnackbarMessage(
        isNowActive
          ? t('userActionDialogs.snackbar.activateSuccess', { name: userName })
          : t('userActionDialogs.snackbar.deactivateSuccess', { name: userName })
      );
    } catch {
      setFeedbackToast({
        title: 'Action Failed',
        message: 'Could not update account status. Please try again.',
      });
    }
  };

  const handleNavClick = (id: string, nameOrPath?: string) => {
    setActiveNav(id);
    setIsDrawerOpen(false);

    let targetPath = nameOrPath && nameOrPath.startsWith('/') ? nameOrPath : '';
    if (!targetPath) {
      switch (id) {
        case 'dashboard':
          targetPath = '/admin/dashboard';
          break;
        case 'users':
          targetPath = '/admin/users';
          break;
        case 'patients':
          targetPath = '/admin/patients';
          break;
        case 'doctors':
          targetPath = '/admin/doctors';
          break;
        case 'facilities':
          targetPath = '/admin/facilities';
          break;
        case 'records':
        case 'health-records':
          targetPath = '/admin/records';
          break;
        case 'ocr':
        case 'ocr-verification':
          targetPath = '/admin/ocr/queue';
          break;
        case 'referrals':
          targetPath = '/admin/referrals';
          break;
        case 'reports':
          targetPath = '/admin/reports';
          break;
        case 'settings':
          targetPath = '/admin/settings/general';
          break;
        case 'audit':
        case 'auditLogs':
          targetPath = '/admin/referrals/audit';
          break;
        case 'support':
          targetPath = '/admin/support';
          break;
        default:
          targetPath = `/admin/${id}`;
          break;
      }
    }

    if (onNavigate) onNavigate(targetPath);
    else navigate(targetPath);
  };

  const handleLogout = () => {
    setIsDrawerOpen(false);
    if (onLogout) {
      onLogout();
    } else if (onNavigate) {
      onNavigate('/');
    }
  };

  const handleConfirmResetPassword = async () => {
    if (!resetPasswordUser) return;
    setIsProcessingAction(true);
    try {
      await resetPasswordMutation.mutateAsync({
        userId: resetPasswordUser.id,
      });
      const userName = resetPasswordUser.name;
      setResetPasswordUser(null);
      setSnackbarMessage(`Password reset successfully and sessions revoked for ${userName}.`);
    } catch (err: any) {
      setResetPasswordUser(null);
      setFeedbackToast({
        title: 'Password Reset Failed',
        message: err?.message || 'Could not reset password.',
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (!window.confirm(`Are you sure you want to block/soft-delete account for ${user.name}?`)) return;
    try {
      await deleteUserMutation.mutateAsync(user.id);
      setSnackbarMessage(`User account for ${user.name} has been blocked.`);
    } catch (err: any) {
      setFeedbackToast({
        title: 'Action Failed',
        message: err?.message || 'Failed to delete user.',
      });
    }
  };

  const handleRestoreUser = async (user: UserItem) => {
    try {
      await restoreUserMutation.mutateAsync(user.id);
      setSnackbarMessage(`User account for ${user.name} has been restored.`);
    } catch (err: any) {
      setFeedbackToast({
        title: 'Action Failed',
        message: err?.message || 'Failed to restore user.',
      });
    }
  };

  const onAddUserSubmit = async (formData: AddUserFormData) => {
    try {
      await createUserMutation.mutateAsync({
        fullName: formData.name,
        phone: formData.phone,
        email: formData.email,
        role: formData.role,
        status: formData.status === 'ACTIVE',
      });
      setIsAddModalOpen(false);
      setSnackbarMessage(`User ${formData.name} successfully created.`);
    } catch (err: any) {
      setFeedbackToast({
        title: 'User Creation Failed',
        message: err?.message || 'Could not create user on backend.',
      });
    }
  };

  const totalResults = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const startResult = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endResult = Math.min(currentPage * pageSize, totalResults);

  // Auto-clamp currentPage if totalPages shrinks after data has loaded
  useEffect(() => {
    if (!isLoading && data && totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, isLoading, data]);

  return (
    <div
      className="careid-dashboard-shell"
      data-node-id="20:516"
      aria-label="CareID Admin Portal User Directory"
    >
      {/* Mobile Drawer Backdrop */}
      <div
        className={`careid-drawer-backdrop ${isDrawerOpen ? 'drawer-open' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* ====================================================================
          STATIONARY PERSISTENT SIDEBAR
          ==================================================================== */}
      <AdminSidebar
        activeNav={activeNav}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={(p) => (onNavigate ? onNavigate(p) : navigate(p))}
        onLogout={handleLogout}
        ctaLabel="+ New Record"
        onCtaClick={() => setIsAddModalOpen(true)}
      />

      {/* ====================================================================
          MAIN CONTENT WRAPPER (Header + Scrollable Canvas)
          ==================================================================== */}
      <div className="careid-main-wrapper" data-node-id="20:517">
        {/* Top Navigation Bar (Header) */}
        <header className="careid-top-navbar" data-node-id="20:518">
          <div className="header-left-cluster">
            {/* Hamburger menu for mobile/tablet */}
            <button
              type="button"
              className="header-menu-toggle"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>

            {/* Breadcrumbs: Home > Users */}
            <div className="users-breadcrumbs" data-node-id="20:520">
              <span
                className="users-breadcrumb-home-icon cursor-pointer"
                data-node-id="20:521"
                onClick={() => handleNavClick('dashboard', t('dashboard.nav.dashboard'))}
                title="Go to Dashboard"
              >
                <img src={homeIcon} alt="" />
              </span>
              <span className="users-breadcrumb-separator" data-node-id="20:523">
                <img src={breadcrumbChevron} alt=">" />
              </span>
              <span className="users-breadcrumb-current" data-node-id="20:526">
                {t('users.breadcrumbs.users')}
              </span>
            </div>
          </div>

          {/* Right Action Cluster */}
          <div className="users-header-actions" data-node-id="20:527">
            {/* Notification Bell */}
            <button
              type="button"
              className="users-header-icon-btn"
              data-node-id="20:528"
              aria-label="Notifications"
              onClick={() =>
                setFeedbackToast({
                  title: 'Notifications',
                  message: 'You have 1 unread security alert.',
                })
              }
            >
              <img src={headerBellIcon} alt="Notifications" data-node-id="20:529" />
              <span className="users-header-badge" data-node-id="20:531" />
            </button>

            {/* Apps Grid */}
            <button
              type="button"
              className="users-header-icon-btn"
              data-node-id="20:532"
              aria-label="Applications"
              onClick={() =>
                setFeedbackToast({
                  title: 'Applications Grid',
                  message: 'CareID Suite application switcher.',
                })
              }
            >
              <img src={appsGridIcon} alt="Apps" data-node-id="20:533" />
            </button>

            {/* Divider */}
            <div className="users-header-divider" data-node-id="20:536" />

            {/* Support Button */}
            <button
              type="button"
              className="users-header-support-btn"
              data-node-id="20:537"
              onClick={() =>
                setFeedbackToast({
                  title: 'Support',
                  message: 'Connecting to CareID administrative support.',
                })
              }
            >
              {t('users.support')}
            </button>

            {/* Admin Console Pill */}
            <button
              type="button"
              className="users-header-console-btn"
              data-node-id="20:539"
              onClick={() =>
                setFeedbackToast({
                  title: 'Admin Console',
                  message: 'Current Console Scope: CareID Primary Tenant.',
                })
              }
            >
              {t('users.adminConsole')}
            </button>

            {/* Avatar */}
            <div
              className="users-header-avatar cursor-pointer flex items-center justify-center"
              onClick={() => (onNavigate ? onNavigate('/admin/profile') : navigate('/admin/profile'))}
              title="My Profile & Information"
              role="button"
              tabIndex={0}
              data-node-id="20:542"
            >
              <AdminProfileAvatar size={32} />
            </div>
          </div>
        </header>

        {/* ====================================================================
            SCROLLABLE MAIN CANVAS (User Directory Elements)
            ==================================================================== */}
        <main className="users-main-canvas" data-node-id="20:543">
          {/* Header Section: Title, Subtitle, and Add User Button */}
          <div className="users-page-title-row" data-node-id="20:544">
            <div className="users-page-heading" data-node-id="20:545">
              <h1 className="users-title" data-node-id="20:547">
                {t('users.title')}
              </h1>
              <p className="users-subtitle" data-node-id="20:549">
                {t('users.subtitle')}
              </p>
            </div>

            <button
              type="button"
              className="users-add-btn"
              onClick={() => {
                if (onNavigate) {
                  onNavigate('/admin/users/create');
                } else {
                  navigate('/admin/users/create');
                }
              }}
              data-node-id="20:550"
            >
              <Plus size={14} />
              <span>{t('users.addUser')}</span>
            </button>
          </div>

          {/* ====================================================================
              BENTO KPI SUMMARY CARDS (4 Cards)
              ==================================================================== */}
          <section
            className="users-bento-grid"
            data-node-id="20:554"
            aria-label="User Statistics Overview"
          >
            {/* Card 1: Total Users */}
            <div className="users-bento-card" data-node-id="20:555">
              <div className="users-bento-ambient users-ambient-total" data-node-id="20:556" />
              <div className="users-bento-top">
                <span className="users-bento-label" data-node-id="20:559">
                  {t('users.kpi.totalUsers')}
                </span>
                <span className="users-bento-icon" data-node-id="20:560">
                  <img src={kpiTotalUsersIcon} alt="" />
                </span>
              </div>
              <p className="users-bento-value" data-node-id="20:563">
                {isLoading ? (
                  <span className="skeleton-pulse" />
                ) : isError ? (
                  <span style={{ fontSize: '15px', color: '#ba1a1a' }}>Unavailable</span>
                ) : data?.kpis.totalUsers !== undefined ? (
                  data.kpis.totalUsers.toLocaleString()
                ) : (
                  '—'
                )}
              </p>
            </div>

            {/* Card 2: Active Users */}
            <div className="users-bento-card" data-node-id="20:564">
              <div className="users-bento-ambient users-ambient-active" data-node-id="20:565" />
              <div className="users-bento-top">
                <span className="users-bento-label" data-node-id="20:568">
                  {t('users.kpi.active')}
                </span>
                <span className="users-bento-icon" data-node-id="20:569">
                  <img src={kpiActiveIcon} alt="" />
                </span>
              </div>
              <p className="users-bento-value" data-node-id="20:572">
                {isLoading ? (
                  <span className="skeleton-pulse" />
                ) : isError ? (
                  <span style={{ fontSize: '15px', color: '#ba1a1a' }}>Unavailable</span>
                ) : data?.kpis.activeUsers !== undefined ? (
                  data.kpis.activeUsers.toLocaleString()
                ) : (
                  '—'
                )}
              </p>
            </div>

            {/* Card 3: Inactive Users */}
            <div className="users-bento-card" data-node-id="20:573">
              <div className="users-bento-ambient users-ambient-inactive" data-node-id="20:574" />
              <div className="users-bento-top">
                <span className="users-bento-label" data-node-id="20:577">
                  {t('users.kpi.inactive')}
                </span>
                <span className="users-bento-icon" data-node-id="20:578">
                  <img src={kpiInactiveIcon} alt="" />
                </span>
              </div>
              <p className="users-bento-value" data-node-id="20:581">
                {isLoading ? (
                  <span className="skeleton-pulse" />
                ) : isError ? (
                  <span style={{ fontSize: '15px', color: '#ba1a1a' }}>Unavailable</span>
                ) : data?.kpis.inactiveUsers !== undefined ? (
                  data.kpis.inactiveUsers.toLocaleString()
                ) : (
                  '—'
                )}
              </p>
            </div>

            {/* Card 4: Pending Verification */}
            <div className="users-bento-card" data-node-id="20:582">
              <div className="users-bento-ambient users-ambient-pending" data-node-id="20:583" />
              <div className="users-bento-top">
                <span className="users-bento-label" data-node-id="20:586">
                  {t('users.kpi.pending')}
                </span>
                <span className="users-bento-icon" data-node-id="20:587">
                  <img src={kpiPendingIcon} alt="" />
                </span>
              </div>
              <p className="users-bento-value" data-node-id="20:590">
                {isLoading ? (
                  <span className="skeleton-pulse" />
                ) : isError ? (
                  <span style={{ fontSize: '15px', color: '#ba1a1a' }}>Unavailable</span>
                ) : data?.kpis.pendingUsers !== undefined ? (
                  data.kpis.pendingUsers.toLocaleString()
                ) : (
                  '—'
                )}
              </p>
            </div>
          </section>

          {/* ====================================================================
              CONTROLS BAR (FILTER CHIPS & SEARCH INPUT)
              ==================================================================== */}
          <div className="users-controls-bar" data-node-id="20:591">
            {/* Filter Chips */}
            <div
              className="users-filter-chips-wrapper"
              data-node-id="20:592"
              role="tablist"
              aria-label="Filter user directory"
            >
              {FILTER_CHIPS.map((chip, index) => {
                if (chip.startsWith('divider')) {
                  return (
                    <div
                      key={`div-${index}`}
                      className="users-filter-divider"
                      data-node-id={chip === 'divider-1' ? '20:602' : '20:608'}
                      role="separator"
                    />
                  );
                }

                const isActive = activeChip === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    className={`users-filter-chip ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveChip(chip);
                      setCurrentPage(1);
                    }}
                    role="tab"
                    aria-selected={isActive}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="users-search-container" data-node-id="20:613">
              <span className="users-search-icon" data-node-id="20:617">
                <img src={searchIcon} alt="" />
              </span>
              <input
                id={searchInputId}
                type="text"
                className="users-search-input"
                placeholder={t('users.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                data-node-id="20:614"
                aria-label="Search users"
              />
            </div>
          </div>

          {/* Doctors Filter Clarification Banner */}
          {activeChip === 'Doctors' && (
            <div className="mx-6 mb-3 px-4 py-2.5 rounded-lg bg-[#eaf5f3] border border-[#b2dfdb] text-xs text-[#004d40] flex items-center justify-between">
              <span>
                Showing <strong>1 user</strong> with the primary <strong>DOCTOR</strong> role (Dr. Sarah Jenkins). <strong>2 other platform doctors</strong> hold administrative roles (Dr. Robert Chen: <em>Super Admin</em>, Dr. Julian Vance: <em>Facility Admin</em>) — view all 3 in the{' '}
                <button
                  type="button"
                  onClick={() => onNavigate ? onNavigate('/admin/doctors') : navigate('/admin/doctors')}
                  className="text-[#006a60] underline font-bold cursor-pointer hover:text-[#004d40]"
                >
                  Doctor Directory
                </button>{' '}
                or under the{' '}
                <button
                  type="button"
                  onClick={() => setActiveChip('Admins')}
                  className="text-[#006a60] underline font-bold cursor-pointer hover:text-[#004d40]"
                >
                  Admins filter
                </button>.
              </span>
            </div>
          )}

          {/* ====================================================================
              HIGH DENSITY DATA TABLE CARD
              ==================================================================== */}
          <div className="users-table-card" data-node-id="20:619">
            <div
              className="users-table-scroll-container"
              data-node-id="20:620"
              style={{ minHeight: `${pageSize * 60 + 41}px` }}
            >
              <table className="users-table" data-node-id="20:621">
                {/* Table Header */}
                <thead className="users-table-header" data-node-id="20:622">
                  <tr>
                    <th className="users-table-th" style={{ width: '220px' }} data-node-id="20:624">
                      {t('users.table.userDetails')}
                    </th>
                    <th className="users-table-th" style={{ width: '100px' }} data-node-id="20:626">
                      {t('users.table.role')}
                    </th>
                    <th className="users-table-th" style={{ width: '220px' }} data-node-id="20:628">
                      {t('users.table.contact')}
                    </th>
                    <th className="users-table-th" style={{ width: '100px' }} data-node-id="20:630">
                      {t('users.table.status')}
                    </th>
                    <th className="users-table-th" style={{ width: '110px' }} data-node-id="20:632">
                      {t('users.table.verification')}
                    </th>
                    <th className="users-table-th" style={{ width: '105px' }} data-node-id="20:634">
                      {t('users.table.created')}
                    </th>
                    <th className="users-table-th" style={{ width: '110px' }} data-node-id="20:636">
                      {t('users.table.lastLogin')}
                    </th>
                    <th className="users-table-th" style={{ width: '45px', textAlign: 'right' }}>
                      <span className="sr-only">{t('users.table.actions')}</span>
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody data-node-id="20:637">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`skel-${i}`}>
                        <td colSpan={8} style={{ padding: '16px' }}>
                          <span className="skeleton-pulse" style={{ width: '100%', display: 'block' }} />
                        </td>
                      </tr>
                    ))
                  ) : isError ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px 16px', textAlign: 'center' }}>
                        <div style={{ color: '#ba1a1a', fontWeight: 600, marginBottom: '8px' }}>
                          Failed to load platform users from backend
                        </div>
                        <div style={{ color: '#7a7585', fontSize: '13px', marginBottom: '16px' }}>
                          {(error as Error)?.message || 'An unexpected error occurred while communicating with the API.'}
                        </div>
                        <button
                          type="button"
                          className="empty-state-btn"
                          onClick={() => refetch()}
                        >
                          Retry Request
                        </button>
                      </td>
                    </tr>
                  ) : !data?.users || data.users.length === 0 ? (
                    <tr className="users-empty-row">
                      <td colSpan={8} style={{ padding: '32px 16px', background: '#ffffff', textAlign: 'center' }}>
                        <UserEmptyState
                          title={t('createUser.emptyState.title')}
                          description={t('createUser.emptyState.description')}
                          isCompact={true}
                          onClearFilters={() => {
                            setSearchTerm('');
                            setActiveChip('All Users');
                            setCurrentPage(1);
                          }}
                          onAddNewUser={() => {
                            if (onNavigate) {
                              onNavigate('/admin/users/create');
                            } else {
                              navigate('/admin/users/create');
                            }
                          }}
                        />
                      </td>
                    </tr>
                  ) : (
                    data.users.map((user) => {
                      const isInactive = user.status === 'INACTIVE';
                      return (
                        <tr
                          key={user.id}
                          className={`users-table-row ${isInactive ? 'row-inactive' : ''}`}
                          data-node-id={user.id}
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('.user-action-btn') || (e.target as HTMLElement).closest('[role="menu"]')) {
                              return;
                            }
                            if (onNavigate) {
                              onNavigate(`/admin/users/${user.id}`);
                            } else {
                              navigate(`/admin/users/${user.id}`);
                            }
                          }}
                        >
                          {/* User Details */}
                          <td className="users-table-td">
                            <div className="user-details-cell">
                              <div className="user-avatar-wrap">
                                {user.avatarUrl ? (
                                  <img
                                    src={user.avatarUrl}
                                    alt={user.name}
                                    style={isInactive ? { filter: 'grayscale(1)' } : undefined}
                                  />
                                ) : (
                                  <div
                                    className="user-avatar-initials size-full flex items-center justify-center"
                                    style={{
                                      backgroundColor: user.avatarBg || '#edeef0',
                                      color: user.avatarColor || '#191c1e',
                                    }}
                                  >
                                    {user.initials}
                                  </div>
                                )}
                              </div>
                              <div className="user-name-box">
                                <span className={`user-name ${isInactive ? 'user-name-inactive' : ''}`}>
                                  {user.name}
                                </span>
                                <span className="user-hvid">
                                  HV-ID: {user.hvid}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="users-table-td">
                            <span
                              className={`user-role-badge ${
                                user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Facility Admin'
                                  ? 'role-badge-admin'
                                  : user.role === 'Doctor'
                                    ? 'role-badge-doctor'
                                    : user.role === 'Staff'
                                      ? 'role-badge-staff'
                                      : 'role-badge-patient'
                              }`}
                            >
                              {user.role}
                            </span>
                            {user.doctorProfile && user.role !== 'Doctor' && (
                              <span className="text-[10px] text-[#006a60] font-semibold block mt-1 tracking-tight">
                                Doctor Profile: {user.doctorProfile.specialization}
                              </span>
                            )}
                            {user.staffProfile && user.role !== 'Staff' && (
                              <span className="text-[10px] text-[#0f52ba] font-semibold block mt-1 tracking-tight">
                                Staff: {user.staffProfile.designation}
                              </span>
                            )}
                          </td>

                          {/* Contact */}
                          <td className="users-table-td">
                            <div className="user-contact-box">
                              <span className="user-email">{user.email}</span>
                              <span className="user-phone">{user.phone}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="users-table-td">
                            <div className="user-status-box">
                              <span
                                className={`user-status-dot ${
                                  user.status === 'ACTIVE' ? 'dot-active' : 'dot-inactive'
                                }`}
                              />
                              <span
                                className={`user-status-text ${
                                  user.status === 'ACTIVE' ? 'status-active' : 'status-inactive'
                                }`}
                              >
                                {user.status}
                              </span>
                            </div>
                          </td>

                          {/* Verification */}
                          <td className="users-table-td">
                            <span
                              className={`user-verification-badge ${
                                user.verification === 'Verified'
                                  ? 'badge-verified'
                                  : 'badge-pending'
                              }`}
                            >
                              {user.verification}
                            </span>
                          </td>

                          {/* Created */}
                          <td className="users-table-td">
                            <span className={`user-date-cell ${isInactive ? 'date-inactive' : ''}`}>
                              {user.created}
                            </span>
                          </td>

                          {/* Last Login */}
                          <td className="users-table-td">
                            <span className={`user-date-cell ${isInactive ? 'date-inactive' : ''}`}>
                              {user.lastLogin}
                            </span>
                          </td>

                          {/* Action Kebab Trigger */}
                          <td className="users-table-td" style={{ textAlign: 'right' }}>
                            <button
                              id={`user-action-trigger-${user.id}`}
                              type="button"
                              className="user-action-btn"
                              aria-haspopup="menu"
                              aria-expanded={activeKebab?.userId === user.id}
                              aria-controls={`user-actions-menu-${user.id}`}
                              aria-label={`Actions for ${user.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeKebab?.userId === user.id) {
                                  setActiveKebab(null);
                                } else {
                                  setActiveKebab({
                                    userId: user.id,
                                    user,
                                    triggerEl: e.currentTarget,
                                  });
                                }
                              }}
                            >
                              <img src={kebabMenuIcon} alt="" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <footer className="users-pagination-footer" data-node-id="20:795">
              <div className="users-pagination-count" data-node-id="20:797">
                {t('users.pagination.showing', {
                  start: startResult,
                  end: endResult,
                  total: totalResults.toLocaleString(),
                })}
              </div>

              <div className="users-pagination-controls" data-node-id="20:798">
                {/* Rows per page selector */}
                <div className="users-rows-per-page-box" data-node-id="20:799">
                  <label htmlFor={pageSizeSelectId} className="users-rows-label" data-node-id="20:801">
                    {t('users.pagination.rowsPerPage')}
                  </label>
                  <select
                    id={pageSizeSelectId}
                    className="users-rows-select"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    data-node-id="20:807"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>

                {/* Page Navigation Arrows */}
                <div className="users-page-nav-arrows" data-node-id="20:808">
                  <button
                    type="button"
                    className="users-page-arrow-btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || isLoading}
                    data-node-id="20:809"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    className="users-page-arrow-btn"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages || isLoading}
                    data-node-id="20:812"
                    aria-label="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* ====================================================================
          ADD USER MODAL (React Hook Form + Zod)
          ==================================================================== */}
      {isAddModalOpen && (
        <div
          className="users-modal-backdrop"
          onClick={() => setIsAddModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-user-modal-title"
        >
          <div className="users-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="users-modal-header">
              <div>
                <h2 id="add-user-modal-title" className="users-modal-title">
                  {t('users.modal.title')}
                </h2>
                <p className="users-modal-subtitle">{t('users.modal.subtitle')}</p>
              </div>
              <button
                type="button"
                className="users-modal-close"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form className="users-form" onSubmit={handleSubmit(onAddUserSubmit)}>
              <div className="users-form-group">
                <label htmlFor={formNameId} className="users-form-label">{t('users.modal.name')}</label>
                <input
                  id={formNameId}
                  type="text"
                  className="users-form-input"
                  placeholder={t('users.modal.namePlaceholder')}
                  {...register('name')}
                />
                {errors.name && <p className="users-form-error">{errors.name.message}</p>}
              </div>

              <div className="users-form-group">
                <label htmlFor={formHvidId} className="users-form-label">CareID HV-ID</label>
                <input
                  id={formHvidId}
                  type="text"
                  className="users-form-input"
                  placeholder="e.g. DOC-98214"
                  {...register('hvid')}
                />
                {errors.hvid && <p className="users-form-error">{errors.hvid.message}</p>}
              </div>

              <div className="users-form-row">
                <div className="users-form-group">
                  <label htmlFor={formEmailId} className="users-form-label">{t('users.modal.email')}</label>
                  <input
                    id={formEmailId}
                    type="email"
                    className="users-form-input"
                    placeholder={t('users.modal.emailPlaceholder')}
                    {...register('email')}
                  />
                  {errors.email && <p className="users-form-error">{errors.email.message}</p>}
                </div>

                <div className="users-form-group">
                  <label htmlFor={formPhoneId} className="users-form-label">{t('users.modal.phone')}</label>
                  <input
                    id={formPhoneId}
                    type="text"
                    className="users-form-input"
                    placeholder={t('users.modal.phonePlaceholder')}
                    {...register('phone')}
                  />
                  {errors.phone && <p className="users-form-error">{errors.phone.message}</p>}
                </div>
              </div>

              <div className="users-form-row">
                <div className="users-form-group">
                  <label htmlFor={formRoleId} className="users-form-label">{t('users.modal.role')}</label>
                  <select id={formRoleId} className="users-form-select" {...register('role')}>
                    <option value="Doctor">Doctor</option>
                    <option value="Patient">Patient</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div className="users-form-group">
                  <label htmlFor={formStatusId} className="users-form-label">{t('users.modal.status')}</label>
                  <select id={formStatusId} className="users-form-select" {...register('status')}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="users-form-group">
                <label htmlFor={formVerificationId} className="users-form-label">{t('users.modal.verification')}</label>
                <select id={formVerificationId} className="users-form-select" {...register('verification')}>
                  <option value="Verified">Verified</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div className="users-modal-actions">
                <button
                  type="button"
                  className="users-modal-cancel-btn"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  {t('users.modal.cancel')}
                </button>
                <button
                  type="submit"
                  className="users-modal-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('users.modal.saving') : t('users.modal.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          PORTAL-BASED ROW ACTIONS DROPDOWN MENU
          ==================================================================== */}
      {activeKebab && (
        <UserRowActionDropdown
          user={activeKebab.user}
          triggerEl={activeKebab.triggerEl}
          isOpen={true}
          onClose={() => setActiveKebab(null)}
          onViewDetails={(u) => {
            setActiveKebab(null);
            if (onNavigate) {
              onNavigate(`/admin/users/${u.id}`);
            } else {
              navigate(`/admin/users/${u.id}`);
            }
          }}
          onEditCredentials={(u) => {
            setActiveKebab(null);
            setEditCredentialsUser(u);
          }}
          onToggleStatus={(u) => {
            setActiveKebab(null);
            setConfirmToggleUser(u);
          }}
          onResetPassword={(u) => {
            setActiveKebab(null);
            setResetPasswordUser(u);
          }}
          onDeleteUser={(u) => {
            setActiveKebab(null);
            handleDeleteUser(u);
          }}
          onRestoreUser={(u) => {
            setActiveKebab(null);
            handleRestoreUser(u);
          }}
        />
      )}

      {/* ====================================================================
          MODAL: EDIT CREDENTIALS (React Hook Form + Zod)
          ==================================================================== */}
      {editCredentialsUser && (
        <div
          className="users-modal-backdrop"
          onClick={() => setEditCredentialsUser(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-credentials-title"
        >
          <div className="users-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="users-modal-header">
              <div>
                <h2 id="edit-credentials-title" className="users-modal-title">
                  Edit Credentials
                </h2>
                <p className="users-modal-subtitle">
                  Update credentials and role for {editCredentialsUser.name} ({editCredentialsUser.hvid}).
                </p>
              </div>
              <button
                type="button"
                className="users-modal-close"
                onClick={() => setEditCredentialsUser(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form className="users-form" onSubmit={handleSubmitCred(onEditCredentialsSubmit)}>
              <div className="users-form-group">
                <label className="users-form-label">
                  Full Name
                </label>
                <input
                  type="text"
                  className="users-form-input"
                  placeholder="Enter full name"
                  {...registerCred('name')}
                />
                {errorsCred.name && (
                  <p className="users-form-error">{errorsCred.name.message}</p>
                )}
              </div>

              <div className="users-form-group">
                <label htmlFor={credEmailId} className="users-form-label">
                  Email Address
                </label>
                <input
                  id={credEmailId}
                  type="email"
                  className="users-form-input"
                  {...registerCred('email')}
                />
                {errorsCred.email && (
                  <p className="users-form-error">{errorsCred.email.message}</p>
                )}
              </div>

              <div className="users-form-row">
                <div className="users-form-group">
                  <label htmlFor={credRoleId} className="users-form-label">
                    Role
                  </label>
                  <select id={credRoleId} className="users-form-select" {...registerCred('role')}>
                    <option value="Doctor">Doctor</option>
                    <option value="Patient">Patient</option>
                    <option value="Admin">Admin</option>
                    <option value="Staff">Staff</option>
                    <option value="Facility Admin">Facility Admin</option>
                    <option value="Family Member">Family Member</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>

                <div className="users-form-group">
                  <label htmlFor={credStatusId} className="users-form-label">
                    Account Status
                  </label>
                  <select id={credStatusId} className="users-form-select" {...registerCred('status')}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="users-modal-actions">
                <button
                  type="button"
                  className="users-modal-cancel-btn"
                  onClick={() => setEditCredentialsUser(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="users-modal-submit-btn"
                  disabled={isSubmittingCred}
                >
                  {isSubmittingCred ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: DEACTIVATE / ACTIVATE USER DIALOG (Figma Node 20:1327)
          ==================================================================== */}
      {confirmToggleUser && (
        <DeactivateUserDialog
          isOpen={true}
          userName={confirmToggleUser.name}
          isReactivating={confirmToggleUser.status === 'INACTIVE'}
          isLoading={toggleUserStatusMutation.isPending}
          onClose={() => setConfirmToggleUser(null)}
          onConfirm={handleConfirmToggleStatus}
        />
      )}

      {/* ====================================================================
          MODAL: RESET PASSWORD DIALOG (Figma Node 20:1343)
          ==================================================================== */}
      {resetPasswordUser && (
        <ResetPasswordDialog
          isOpen={true}
          userEmail={resetPasswordUser.email}
          isLoading={isProcessingAction || resetPasswordMutation.isPending}
          onClose={() => setResetPasswordUser(null)}
          onConfirm={handleConfirmResetPassword}
        />
      )}

      {/* Success Snackbar (Figma Node 20:1359) */}
      <ActionSuccessSnackbar
        isVisible={Boolean(snackbarMessage)}
        message={snackbarMessage || ''}
        onDismiss={() => setSnackbarMessage(null)}
      />

      {/* Action Toast / Prompt Modal */}
      {feedbackToast && (
        <div
          className="users-modal-backdrop"
          onClick={() => setFeedbackToast(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="users-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="users-modal-header">
              <h2 className="users-modal-title">{feedbackToast.title}</h2>
              <button
                type="button"
                className="users-modal-close"
                onClick={() => setFeedbackToast(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <p className="users-subtitle" style={{ margin: '8px 0 20px 0' }}>
              {feedbackToast.message}
            </p>
            <div className="users-modal-actions">
              <button
                type="button"
                className="users-modal-submit-btn"
                onClick={() => setFeedbackToast(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserDirectory;
