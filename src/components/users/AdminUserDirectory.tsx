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
import UserEmptyState from './UserEmptyState';
import UserRowActionDropdown from './UserRowActionDropdown';
import DeactivateUserDialog from './DeactivateUserDialog';
import ResetPasswordDialog from './ResetPasswordDialog';
import ActionSuccessSnackbar from './ActionSuccessSnackbar';

// Styling
import '../dashboard/AdminDashboard.css';
import './AdminUserDirectory.css';

// Authentic Assets
import logoImg from '../../assets/dashboard/careid-logo.png';
import headerAvatarImg from '../../assets/dashboard/header-avatar.png';

// Nav Assets
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
import SidebarLogoutButton from '../common/SidebarLogoutButton';

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
  useCreateUserMutation,
  useUpdateUserMutation,
  useToggleUserStatusMutation,
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
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['Doctor', 'Patient', 'Admin'] as const),
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

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

  // TanStack Query Hooks & Mutations
  const { data, isLoading } = useUsersQuery({
    search: searchTerm,
    activeChip,
    page: currentPage,
    limit: pageSize,
  });

  const createUserMutation = useCreateUserMutation();
  const updateUserMutation = useUpdateUserMutation();
  const toggleUserStatusMutation = useToggleUserStatusMutation();

  // React Hook Form for Add User
  const {
    register,
    handleSubmit,
    reset,
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
        email: editCredentialsUser.email,
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
        ...formData,
      });
      const userName = editCredentialsUser.name;
      setEditCredentialsUser(null);
      setFeedbackToast({
        title: 'Credentials Updated',
        message: `System credentials and access role updated for ${userName}.`,
      });
    } catch {
      setFeedbackToast({
        title: 'Update Failed',
        message: 'Could not update user credentials. Please try again.',
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

  const handleNavClick = (id: string, name: string) => {
    setActiveNav(id);
    setIsDrawerOpen(false);

    if (id === 'dashboard') {
      if (onNavigate) onNavigate('/admin/dashboard');
      else navigate('/admin/dashboard');
      return;
    }

    if (id === 'users') {
      // Already on users
      return;
    }

    if (id === 'patients') {
      if (onNavigate) onNavigate('/admin/patients');
      else navigate('/admin/patients');
      return;
    }

    if (id === 'doctors') {
      if (onNavigate) onNavigate('/admin/doctors');
      else navigate('/admin/doctors');
      return;
    }

    if (id === 'facilities') {
      if (onNavigate) onNavigate('/admin/facilities');
      else navigate('/admin/facilities');
      return;
    }

    if (id === 'records' || id === 'health-records') {
      if (onNavigate) onNavigate('/admin/records');
      else navigate('/admin/records');
      return;
    }

    setFeedbackToast({
      title: name,
      message: `The ${name} module will be implemented in a subsequent phase.`,
    });
  };

  const handleLogout = () => {
    setIsDrawerOpen(false);
    if (onLogout) {
      onLogout();
    } else if (onNavigate) {
      onNavigate('/');
    }
  };

  const onAddUserSubmit = async (formData: AddUserFormData) => {
    try {
      await createUserMutation.mutateAsync(formData);
      setIsAddModalOpen(false);
      reset({
        name: '',
        hvid: 'HV-84921',
        email: '',
        phone: '',
        role: 'Patient',
        status: 'ACTIVE',
        verification: 'Verified',
      });
      setFeedbackToast({
        title: 'User Created',
        message: `${formData.name} was successfully registered.`,
      });
    } catch {
      setFeedbackToast({
        title: 'Error',
        message: 'Failed to create user record. Please try again.',
      });
    }
  };

  const totalResults = data?.total ?? 0;
  const startResult = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endResult = Math.min(currentPage * pageSize, totalResults);

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
      <aside
        className={`careid-sidebar ${isDrawerOpen ? 'drawer-open' : ''}`}
        data-node-id="20:815"
        aria-label="Main Navigation"
      >
        {/* Logo Container */}
        <div className="sidebar-logo-container" data-node-id="20:816">
          <img
            src={logoImg}
            alt="CareID"
            className="sidebar-logo"
            data-node-id="20:819"
          />
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="sidebar-nav-list" data-node-id="20:820">
          {/* Dashboard */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard', t('dashboard.nav.dashboard'))}
            data-node-id="20:821"
          >
            <span className="sidebar-nav-icon">
              <img src={navDashboardIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.dashboard')}</span>
          </button>

          {/* Active: Users */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'users' ? 'active' : ''}`}
            onClick={() => handleNavClick('users', t('dashboard.nav.users'))}
            data-node-id="20:825"
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
            className={`sidebar-nav-item ${activeNav === 'patients' ? 'active' : ''}`}
            onClick={() => handleNavClick('patients', t('dashboard.nav.patients'))}
            data-node-id="20:829"
          >
            <span className="sidebar-nav-icon">
              <img src={navPatientsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.patients')}</span>
          </button>

          {/* Doctors */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'doctors' ? 'active' : ''}`}
            onClick={() => handleNavClick('doctors', t('dashboard.nav.doctors'))}
            data-node-id="20:833"
          >
            <span className="sidebar-nav-icon">
              <img src={navDoctorsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.doctors')}</span>
          </button>

          {/* Facilities */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'facilities' ? 'active' : ''}`}
            onClick={() => handleNavClick('facilities', t('dashboard.nav.facilities'))}
            data-node-id="20:837"
          >
            <span className="sidebar-nav-icon">
              <img src={navFacilitiesIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.facilities')}</span>
          </button>

          {/* Health Records */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'records' ? 'active' : ''}`}
            onClick={() => handleNavClick('records', t('dashboard.nav.healthRecords'))}
            data-node-id="20:842"
          >
            <span className="sidebar-nav-icon">
              <img src={navRecordsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.healthRecords')}</span>
          </button>

          {/* OCR Verification with Badge 12 */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'ocr' ? 'active' : ''}`}
            onClick={() => handleNavClick('ocr', t('dashboard.nav.ocrVerification'))}
            data-node-id="20:846"
          >
            <span className="sidebar-nav-icon">
              <img src={navOcrIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.ocrVerification')}</span>
            <span className="sidebar-badge sidebar-badge-red" data-node-id="20:851">
              12
            </span>
          </button>

          {/* Referrals with Badge 5 */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'referrals' ? 'active' : ''}`}
            onClick={() => handleNavClick('referrals', t('dashboard.nav.referrals'))}
            data-node-id="20:853"
          >
            <span className="sidebar-nav-icon">
              <img src={navReferralsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.referrals')}</span>
            <span className="sidebar-badge sidebar-badge-amber" data-node-id="20:858">
              5
            </span>
          </button>

          {/* Reports */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'reports' ? 'active' : ''}`}
            onClick={() => handleNavClick('reports', t('dashboard.nav.reports'))}
            data-node-id="20:860"
          >
            <span className="sidebar-nav-icon">
              <img src={navReportsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.reports')}</span>
          </button>

          {/* Divider */}
          <div className="sidebar-divider" data-node-id="20:864" role="separator" />

          {/* System Settings */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'settings' ? 'active' : ''}`}
            onClick={() => handleNavClick('settings', t('dashboard.nav.systemSettings'))}
            data-node-id="20:865"
          >
            <span className="sidebar-nav-icon">
              <img src={navSettingsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.systemSettings')}</span>
          </button>

          {/* Audit Logs */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'audit' ? 'active' : ''}`}
            onClick={() => handleNavClick('audit', t('dashboard.nav.auditLogs'))}
            data-node-id="20:869"
          >
            <span className="sidebar-nav-icon">
              <img src={navAuditIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.auditLogs')}</span>
          </button>

          {/* Support */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'support' ? 'active' : ''}`}
            onClick={() => handleNavClick('support', t('dashboard.nav.support'))}
            data-node-id="20:873"
          >
            <span className="sidebar-nav-icon">
              <img src={navSupportIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">{t('dashboard.nav.support')}</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer" data-node-id="20:877">
          <button
            type="button"
            className="sidebar-cta-btn"
            onClick={() => setIsAddModalOpen(true)}
            data-node-id="20:878"
          >
            <Plus size={16} />
            <span>{t('users.newRecord')}</span>
          </button>

          <SidebarLogoutButton onLogout={handleLogout} />
        </div>
      </aside>

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
                  message: 'Health Vault Suite application switcher.',
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
                  message: 'Connecting to Health Vault administrative support.',
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
                  message: 'Current Console Scope: Health Vault Primary Tenant.',
                })
              }
            >
              {t('users.adminConsole')}
            </button>

            {/* Avatar */}
            <div className="users-header-avatar" data-node-id="20:542">
              <img src={headerAvatarImg} alt="Admin Profile" />
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
                {data?.kpis.totalUsers.toLocaleString() ?? '146,059'}
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
                {data?.kpis.activeUsers.toLocaleString() ?? '142,854'}
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
                {data?.kpis.inactiveUsers.toLocaleString() ?? '3,205'}
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
                {data?.kpis.pendingUsers.toLocaleString() ?? '847'}
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

          {/* ====================================================================
              HIGH DENSITY DATA TABLE CARD
              ==================================================================== */}
          <div className="users-table-card" data-node-id="20:619">
            <div className="users-table-scroll-container" data-node-id="20:620">
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
                    <tr>
                      <td colSpan={8} className="users-table-empty">
                        Loading users...
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
                                user.role === 'Admin'
                                  ? 'role-badge-admin'
                                  : user.role === 'Doctor'
                                    ? 'role-badge-doctor'
                                    : 'role-badge-patient'
                              }`}
                            >
                              {user.role}
                            </span>
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
                  total: (data?.kpis.totalUsers ?? 146059).toLocaleString(),
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
                    disabled={currentPage <= 1}
                    data-node-id="20:809"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    className="users-page-arrow-btn"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage * pageSize >= totalResults}
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
            }
          }}
          onEditCredentials={(u) => {
            setActiveKebab(null);
            setResetPasswordUser(u);
          }}
          onToggleStatus={(u) => {
            setActiveKebab(null);
            setConfirmToggleUser(u);
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
          onClose={() => setResetPasswordUser(null)}
          onConfirm={async () => {
            setResetPasswordUser(null);
            setSnackbarMessage(
              t('userActionDialogs.snackbar.passwordResetSuccess', 'User password has been reset successfully.')
            );
          }}
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
