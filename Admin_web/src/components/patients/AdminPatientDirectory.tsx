import React, { useState, useId, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Search,
  Download,
  Eye,
  Edit3,
  KeyRound,
  UserX,
  UserCheck,
  FileText,
} from 'lucide-react';

// Styling
import '../dashboard/AdminDashboard.css';
import './AdminPatientDirectory.css';

import breadcrumbChevron from '../../assets/patients/icon-chevron-right.svg';
import iconBell from '../../assets/patients/icon-bell.svg';
import iconApps from '../../assets/patients/icon-apps.svg';
import iconExportSvg from '../../assets/patients/icon-export.svg';
import iconAddPatientSvg from '../../assets/patients/icon-add-patient.svg';
import kpiTotalIcon from '../../assets/patients/kpi-total-patients.svg';
import kpiTrendingUpIcon from '../../assets/patients/kpi-trending-up.svg';
import kpiVerifiedIcon from '../../assets/patients/kpi-verified.svg';
import kpiPendingIcon from '../../assets/patients/kpi-pending.svg';
import kpiInactiveIcon from '../../assets/patients/kpi-inactive.svg';
import iconDropdownChevron from '../../assets/patients/icon-dropdown-chevron.svg';
import iconSortBars from '../../assets/patients/icon-sort.svg';
import badgeVerifiedCheck from '../../assets/patients/badge-verified-check.svg';
import badgePendingClock from '../../assets/patients/badge-pending-clock.svg';
import tableLinkFamily from '../../assets/patients/table-link-family.svg';
import tableLinkRecords from '../../assets/patients/table-link-records.svg';
import tableKebabIcon from '../../assets/patients/table-kebab.svg';
import iconPagePrev from '../../assets/patients/icon-page-prev.svg';
import iconPageNext from '../../assets/patients/icon-page-next.svg';

// Authentic Shared Components
import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';

// Authentic Patient Action Dialogs (Figma Node 20:2149)
import DeactivatePatientDialog from './DeactivatePatientDialog';
import ResetPatientPasswordDialog from './ResetPatientPasswordDialog';
import EditPatientProfileDialog from './EditPatientProfileDialog';
import ActionSuccessSnackbar from '../users/ActionSuccessSnackbar';

// TanStack Query & Service
import {
  usePatientsQuery,
  useTogglePatientStatusMutation,
  useUpdatePatientMutation,
  useResetPatientAccountMutation,
  type PatientItem,
  type PatientStatus,
} from '../../services/patientService';

export interface AdminPatientDirectoryProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminPatientDirectory: React.FC<AdminPatientDirectoryProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchInputId = useId();

  // Navigation & Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('patients');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [dateRangeFilter, setDateRangeFilter] = useState<'All' | '30days' | 'year'>('All');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Female' | 'Male'>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'vaultId'>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Dropdown Popover Toggles
  const [openDropdown, setOpenDropdown] = useState<'status' | 'date' | 'gender' | 'sort' | null>(null);
  const [openActionMenuPatientId, setOpenActionMenuPatientId] = useState<string | null>(null);

  // Modal & Snackbar Feedback State
  const [selectedPatientForDeactivate, setSelectedPatientForDeactivate] = useState<PatientItem | null>(null);
  const [selectedPatientForReset, setSelectedPatientForReset] = useState<PatientItem | null>(null);
  const [selectedPatientForEdit, setSelectedPatientForEdit] = useState<PatientItem | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const actionMenuRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close open dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.patients-filter-pill') && !target.closest('.patients-sort-btn')) {
        setOpenDropdown(null);
      }
      if (!target.closest('.patients-action-btn') && !target.closest('.patients-row-menu')) {
        setOpenActionMenuPatientId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch Patients via TanStack Query
  const { data, isLoading, isError, error, refetch } = usePatientsQuery({
    search: searchTerm,
    statusFilter,
    dateRangeFilter,
    genderFilter,
    sortBy,
    page: currentPage,
    limit: 10,
  });

  const totalResults = data?.total ?? 0;
  const totalPages = data?.totalPages || Math.max(1, Math.ceil(totalResults / 10));
  const startResult = totalResults === 0 ? 0 : (currentPage - 1) * 10 + 1;
  const endResult = Math.min(currentPage * 10, totalResults);

  // Auto-clamp currentPage if totalPages shrinks
  useEffect(() => {
    if (!isLoading && data && totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, isLoading, data]);

  const toggleStatusMutation = useTogglePatientStatusMutation();
  const updatePatientMutation = useUpdatePatientMutation();
  const resetAccountMutation = useResetPatientAccountMutation();

  const handleNavClick = (navKey: string, path: string) => {
    setActiveNav(navKey);
    setIsDrawerOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const handleExportList = () => {
    if (!data?.patients || data.patients.length === 0) {
      setSnackbarMessage('No patient records to export.');
      return;
    }

    const headers = [
      'Name',
      'Vault ID',
      'Phone',
      'Email',
      'Demographics',
      'Gender',
      'Age',
      'Registered Date',
      'Verification Status',
      'Account Status',
      'Linked Records',
    ];

    const rows = data.patients.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.vaultId}"`,
      `"${p.phone}"`,
      `"${p.email}"`,
      `"${p.demographics}"`,
      `"${p.gender}"`,
      p.age,
      `"${p.registeredDate}"`,
      `"${p.verification}"`,
      `"${p.status}"`,
      p.links.records,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `CareID-Patients-Directory-${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSnackbarMessage(
      `Exported ${data.patients.length} patient record${data.patients.length === 1 ? '' : 's'} to CSV.`
    );
  };

  const handleTogglePatientStatusConfirm = async () => {
    if (!selectedPatientForDeactivate) return;
    const nextStatus: PatientStatus =
      selectedPatientForDeactivate.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    await toggleStatusMutation.mutateAsync({
      patientId: selectedPatientForDeactivate.id,
      nextStatus,
    });

    const isReactivating = selectedPatientForDeactivate.status === 'INACTIVE';
    setSnackbarMessage(
      isReactivating
        ? t('patients.toasts.activateSuccess', { name: selectedPatientForDeactivate.name })
        : t('patients.toasts.deactivateSuccess', { name: selectedPatientForDeactivate.name })
    );

    setSelectedPatientForDeactivate(null);
  };

  const handleResetPasswordConfirm = async () => {
    if (!selectedPatientForReset) return;
    await resetAccountMutation.mutateAsync({ patientId: selectedPatientForReset.id });
    const targetEmail =
      selectedPatientForReset.email ||
      `${selectedPatientForReset.name.toLowerCase().replace(/\s+/g, '.')}@example.com`;
    setSnackbarMessage(t('patients.toasts.resetSuccess', { email: targetEmail }));
    setSelectedPatientForReset(null);
  };

  const handleSaveEditProfile = async (formData: {
    id: string;
    name: string;
    email: string;
    phone: string;
    dob: string;
    avatarUrl?: string;
  }) => {
    await updatePatientMutation.mutateAsync({
      id: formData.id,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      dob: formData.dob,
      avatarUrl: formData.avatarUrl,
    });
    setSnackbarMessage(t('patients.toasts.updateSuccess', { name: formData.name }));
    setSelectedPatientForEdit(null);
  };

  const kpis = data?.kpis || {
    totalPatients: 0,
    totalGrowthText: 'Registered in CareID',
    verifiedPatients: 0,
    verifiedRatioText: 'Active & verified',
    pendingVerification: 0,
    pendingNoticeText: 'Awaiting review',
    inactiveAccounts: 0,
    inactiveNoticeText: 'Archived or locked',
  };

  const patientsList = data?.patients || [];

  return (
    <div className="careid-dashboard-shell" data-node-id="20:1643">
      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="careid-drawer-backdrop show"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ====================================================================
          PERSISTENT FIXED SIDEBAR (Standard Admin Shell)
          ==================================================================== */}
      <AdminSidebar
        activeNav={activeNav}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={(path) => handleNavClick('patients', path)}
        onLogout={onLogout}
      />

      {/* ====================================================================
          MAIN CONTENT WRAPPER (Header + Scrollable Canvas)
          ==================================================================== */}
      <div className="careid-main-wrapper" data-node-id="20:1644">
        {/* Top Navigation Bar (Header) */}
        <header className="careid-top-navbar" data-node-id="20:1646">
          <div className="header-left-cluster" data-node-id="20:1647">
            <button
              type="button"
              className="header-menu-toggle"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>

            {/* Breadcrumb: Admin > Patients Directory */}
            <div className="patients-breadcrumbs" data-node-id="20:1648">
              <button
                type="button"
                className="patients-breadcrumb-root"
                onClick={() => handleNavClick('dashboard', '/admin/dashboard')}
                data-node-id="20:1650"
              >
                {t('patients.breadcrumbs.admin', 'Admin')}
              </button>
              <span className="patients-breadcrumb-sep" data-node-id="20:1652">
                <img src={breadcrumbChevron} alt=">" />
              </span>
              <span className="patients-breadcrumb-current" data-node-id="20:1655">
                {t('patients.breadcrumbs.patients', 'Patients Directory')}
              </span>
            </div>
          </div>

          {/* Right Action Cluster */}
          <div className="users-header-actions" data-node-id="20:1656">
            {/* Search Trigger Input */}
            <div className="patients-header-search-wrap">
              <Search size={16} className="patients-header-search-input-icon" />
              <input
                id={searchInputId}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t('patients.actions.searchPlaceholder', 'Search patients, Vault ID...')}
                className="patients-header-search-input"
                aria-label="Search patients"
              />
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              className="users-header-icon-btn"
              aria-label="Notifications"
              data-node-id="20:1664"
              onClick={() =>
                setSnackbarMessage('You have 2 pending OCR verification items.')
              }
            >
              <img src={iconBell} alt="Notifications" />
              <span className="users-header-badge" />
            </button>

            {/* Apps Grid */}
            <button
              type="button"
              className="users-header-icon-btn"
              aria-label="Applications"
              data-node-id="20:1668"
              onClick={() =>
                setSnackbarMessage('CareID Suite application switcher.')
              }
            >
              <img src={iconApps} alt="Apps" />
            </button>

            {/* Divider */}
            <div className="users-header-divider" />

            {/* Support Button */}
            <button
              type="button"
              className="users-header-support-btn"
              onClick={() => handleNavClick('support', '/admin/dashboard')}
            >
              {t('users.support')}
            </button>

            {/* Admin Console Pill */}
            <button
              type="button"
              className="users-header-console-btn"
              onClick={() => handleNavClick('dashboard', '/admin/dashboard')}
              data-node-id="20:1673"
            >
              {t('users.adminConsole')}
            </button>

            {/* Admin User Avatar */}
            <div
              className="users-header-avatar cursor-pointer"
              onClick={() => (onNavigate ? onNavigate('/admin/profile') : navigate('/admin/profile'))}
              title="My Profile & Information"
              role="button"
              tabIndex={0}
              data-node-id="20:1676"
            >
              <AdminProfileAvatar size={32} />
            </div>
          </div>
        </header>

        {/* ====================================================================
            SCROLLABLE CANVAS AREA
            ==================================================================== */}
        <main className="patients-main-canvas" data-node-id="20:1678">
          {/* Page Header (Heading, Subtitle & Action Buttons) */}
          <div className="patients-page-header" data-node-id="20:1679">
            <div className="patients-header-title-box" data-node-id="20:1680">
              <h1 className="patients-title" data-node-id="20:1682">
                {t('patients.title', 'Patients Directory')}
              </h1>
              <p className="patients-subtitle" data-node-id="20:1684">
                {t('patients.subtitle', 'Manage and verify patient records within the CareID ecosystem.')}
              </p>
            </div>

            <div className="patients-header-actions" data-node-id="20:1685">
              <button
                type="button"
                className="patients-btn-export"
                onClick={handleExportList}
                data-node-id="20:1686"
              >
                <img src={iconExportSvg} alt="" style={{ width: 12, height: 12 }} />
                <span>{t('patients.actions.exportList', 'Export List')}</span>
              </button>

              <button
                type="button"
                className="patients-btn-add"
                onClick={() => handleNavClick('add-patient', '/admin/patients/create')}
                data-node-id="20:1690"
              >
                <img src={iconAddPatientSvg} alt="" style={{ width: 16, height: 12 }} />
                <span>{t('patients.actions.addPatient', 'Add Patient')}</span>
              </button>
            </div>
          </div>

          {/* ====================================================================
              BENTO KPI SUMMARY CARDS (Row of 4)
              ==================================================================== */}
          <div className="patients-kpi-grid" data-node-id="20:1694">
            {/* Card 1: Total Patients */}
            <div className="patients-kpi-card" data-node-id="20:1695">
              <div className="patients-kpi-overlay total" data-node-id="20:1696" />
              <div className="patients-kpi-header">
                <span className="patients-kpi-label" data-node-id="20:1699">
                  {t('patients.kpi.totalPatients', 'Total Patients')}
                </span>
                <div className="patients-kpi-icon-circle total" data-node-id="20:1700">
                  <img src={kpiTotalIcon} alt="" />
                </div>
              </div>
              <div className="patients-kpi-body">
                <div
                  className={`patients-kpi-value ${kpis.isError ? 'text-base font-semibold text-[#ba1a1a]' : ''}`}
                  data-node-id="20:1705"
                >
                  {isLoading ? (
                    <span className="skeleton-pulse" />
                  ) : kpis.isError ? (
                    'Unavailable'
                  ) : (
                    kpis.totalPatients.toLocaleString()
                  )}
                </div>
                <div className="patients-kpi-footer-trend" data-node-id="20:1706">
                  {!kpis.isError && (
                    <img src={kpiTrendingUpIcon} alt="" style={{ width: 11, height: 7 }} />
                  )}
                  <span
                    data-node-id="20:1709"
                    className={kpis.isError ? 'text-[#ba1a1a] font-medium' : ''}
                  >
                    {kpis.totalGrowthText}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Verified Patients */}
            <div className="patients-kpi-card" data-node-id="20:1710">
              <div className="patients-kpi-overlay verified" data-node-id="20:1711" />
              <div className="patients-kpi-header">
                <span className="patients-kpi-label" data-node-id="20:1714">
                  {t('patients.kpi.verifiedPatients', 'Verified Patients')}
                </span>
                <div className="patients-kpi-icon-circle verified" data-node-id="20:1715">
                  <img src={kpiVerifiedIcon} alt="" />
                </div>
              </div>
              <div className="patients-kpi-body">
                <div
                  className={`patients-kpi-value ${kpis.isError ? 'text-base font-semibold text-[#ba1a1a]' : ''}`}
                  data-node-id="20:1720"
                >
                  {isLoading ? (
                    <span className="skeleton-pulse" />
                  ) : kpis.isError ? (
                    'Unavailable'
                  ) : (
                    kpis.verifiedPatients.toLocaleString()
                  )}
                </div>
                <div className="patients-kpi-footer-text" data-node-id="20:1722">
                  <span className={kpis.isError ? 'text-[#ba1a1a] font-medium' : ''}>
                    {kpis.verifiedRatioText}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Pending Verification */}
            <div className="patients-kpi-card" data-node-id="20:1723">
              <div className="patients-kpi-overlay pending" data-node-id="20:1724" />
              <div className="patients-kpi-header">
                <span className="patients-kpi-label" data-node-id="20:1727">
                  {t('patients.kpi.pendingVerification', 'Pending Verification')}
                </span>
                <div className="patients-kpi-icon-circle pending" data-node-id="20:1728">
                  <img src={kpiPendingIcon} alt="" />
                </div>
              </div>
              <div className="patients-kpi-body">
                <div
                  className={`patients-kpi-value ${kpis.isError ? 'text-base font-semibold text-[#ba1a1a]' : ''}`}
                  data-node-id="20:1733"
                >
                  {isLoading ? (
                    <span className="skeleton-pulse" />
                  ) : kpis.isError ? (
                    'Unavailable'
                  ) : (
                    kpis.pendingVerification.toLocaleString()
                  )}
                </div>
                <div className="patients-kpi-footer-text" data-node-id="20:1735">
                  <span className={kpis.isError ? 'text-[#ba1a1a] font-medium' : ''}>
                    {kpis.pendingNoticeText}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Inactive Accounts */}
            <div className="patients-kpi-card" data-node-id="20:1736">
              <div className="patients-kpi-overlay inactive" data-node-id="20:1737" />
              <div className="patients-kpi-header">
                <span className="patients-kpi-label" data-node-id="20:1740">
                  {t('patients.kpi.inactiveAccounts', 'Inactive Accounts')}
                </span>
                <div className="patients-kpi-icon-circle inactive" data-node-id="20:1741">
                  <img src={kpiInactiveIcon} alt="" />
                </div>
              </div>
              <div className="patients-kpi-body">
                <div
                  className={`patients-kpi-value ${kpis.isError ? 'text-base font-semibold text-[#ba1a1a]' : ''}`}
                  data-node-id="20:1746"
                >
                  {isLoading ? (
                    <span className="skeleton-pulse" />
                  ) : kpis.isError ? (
                    'Unavailable'
                  ) : (
                    kpis.inactiveAccounts.toLocaleString()
                  )}
                </div>
                <div className="patients-kpi-footer-text" data-node-id="20:1748">
                  <span className={kpis.isError ? 'text-[#ba1a1a] font-medium' : ''}>
                    {kpis.inactiveNoticeText}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Explicit Error Banner for Statistics */}
          {kpis.isError && (
            <div
              className="patients-kpi-error-notice"
              style={{
                marginBottom: '16px',
                padding: '12px 16px',
                backgroundColor: 'rgba(186, 26, 26, 0.08)',
                border: '1px solid rgba(186, 26, 26, 0.25)',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#ba1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                <strong>Notice:</strong> {kpis.errorMessage || 'Patient statistics could not be retrieved from the backend API.'}
              </span>
              <button
                type="button"
                onClick={() => refetch()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ba1a1a',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* ====================================================================
              FILTERS & SORT TOOLBAR
              ==================================================================== */}
          <div className="patients-toolbar" ref={toolbarRef} data-node-id="20:1749">
            <div className="patients-toolbar-left" data-node-id="20:1750">
              {/* All Status Pill Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  className={`patients-filter-pill ${statusFilter !== 'All' ? 'active' : 'active'}`}
                  onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                  data-node-id="20:1751"
                  aria-haspopup="true"
                  aria-expanded={openDropdown === 'status'}
                >
                  <span data-node-id="20:1752">
                    {statusFilter === 'All'
                      ? t('patients.actions.filterStatus', 'All Status')
                      : statusFilter === 'Active'
                      ? t('patients.table.active', 'Active')
                      : t('patients.table.inactive', 'Inactive')}
                  </span>
                  <img src={iconDropdownChevron} alt="" className="patients-pill-chevron" />
                </button>

                {openDropdown === 'status' && (
                  <div className="patients-filter-menu" role="menu">
                    <button
                      type="button"
                      className={`patients-filter-menu-item ${statusFilter === 'All' ? 'selected' : ''}`}
                      onClick={() => {
                        setStatusFilter('All');
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                    >
                      {t('patients.actions.filterStatus', 'All Status')}
                    </button>
                    <button
                      type="button"
                      className={`patients-filter-menu-item ${statusFilter === 'Active' ? 'selected' : ''}`}
                      onClick={() => {
                        setStatusFilter('Active');
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                    >
                      {t('patients.table.active', 'Active')}
                    </button>
                    <button
                      type="button"
                      className={`patients-filter-menu-item ${statusFilter === 'Inactive' ? 'selected' : ''}`}
                      onClick={() => {
                        setStatusFilter('Inactive');
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                    >
                      {t('patients.table.inactive', 'Inactive')}
                    </button>
                  </div>
                )}
              </div>

              {/* Date Range Pill Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  className={`patients-filter-pill ${dateRangeFilter !== 'All' ? 'active' : ''}`}
                  onClick={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
                  data-node-id="20:1755"
                  aria-haspopup="true"
                  aria-expanded={openDropdown === 'date'}
                >
                  <span data-node-id="20:1756">
                    {dateRangeFilter === 'All'
                      ? t('patients.actions.filterDate', 'Date Range')
                      : dateRangeFilter === '30days'
                      ? 'Last 30 Days'
                      : 'This Year'}
                  </span>
                  <img src={iconDropdownChevron} alt="" className="patients-pill-chevron" />
                </button>

                {openDropdown === 'date' && (
                  <div className="patients-filter-menu" role="menu">
                    <button
                      type="button"
                      className={`patients-filter-menu-item ${dateRangeFilter === 'All' ? 'selected' : ''}`}
                      onClick={() => {
                        setDateRangeFilter('All');
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                    >
                      All Time
                    </button>
                    <button
                      type="button"
                      className={`patients-filter-menu-item ${dateRangeFilter === '30days' ? 'selected' : ''}`}
                      onClick={() => {
                        setDateRangeFilter('30days');
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                    >
                      Last 30 Days
                    </button>
                    <button
                      type="button"
                      className={`patients-filter-menu-item ${dateRangeFilter === 'year' ? 'selected' : ''}`}
                      onClick={() => {
                        setDateRangeFilter('year');
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                    >
                      This Year
                    </button>
                  </div>
                )}
              </div>

              {/* Gender Pill Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  className={`patients-filter-pill ${genderFilter !== 'All' ? 'active' : ''}`}
                  onClick={() => setOpenDropdown(openDropdown === 'gender' ? null : 'gender')}
                  data-node-id="20:1759"
                  aria-haspopup="true"
                  aria-expanded={openDropdown === 'gender'}
                >
                  <span data-node-id="20:1760">
                    {genderFilter === 'All'
                      ? t('patients.actions.filterGender', 'Gender')
                      : genderFilter}
                  </span>
                  <img src={iconDropdownChevron} alt="" className="patients-pill-chevron" />
                </button>

                {openDropdown === 'gender' && (
                  <div className="patients-filter-menu" role="menu">
                    <button
                      type="button"
                      className={`patients-filter-menu-item ${genderFilter === 'All' ? 'selected' : ''}`}
                      onClick={() => {
                        setGenderFilter('All');
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                    >
                      All Genders
                    </button>
                    <button
                      type="button"
                      className={`patients-filter-menu-item ${genderFilter === 'Female' ? 'selected' : ''}`}
                      onClick={() => {
                        setGenderFilter('Female');
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                    >
                      Female
                    </button>
                    <button
                      type="button"
                      className={`patients-filter-menu-item ${genderFilter === 'Male' ? 'selected' : ''}`}
                      onClick={() => {
                        setGenderFilter('Male');
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                    >
                      Male
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Sort By Dropdown */}
            <div className="patients-toolbar-right" data-node-id="20:1763">
              <span className="patients-sort-label" data-node-id="20:1765">
                {t('patients.actions.sortBy', 'Sort by:')}
              </span>
              <div className="relative">
                <button
                  type="button"
                  className="patients-sort-btn"
                  onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                  data-node-id="20:1766"
                >
                  <span data-node-id="20:1767">
                    {sortBy === 'newest'
                      ? t('patients.actions.newest', 'Newest Registered')
                      : sortBy === 'oldest'
                      ? t('patients.actions.oldest', 'Oldest Registered')
                      : sortBy === 'name'
                      ? t('patients.actions.nameAsc', 'Name (A-Z)')
                      : t('patients.actions.vaultIdAsc', 'Vault ID (A-Z)')}
                  </span>
                  <img src={iconSortBars} alt="" style={{ width: 10, height: 7 }} />
                </button>

                {openDropdown === 'sort' && (
                  <div className="patients-filter-menu" style={{ right: 0, left: 'auto' }} role="menu">
                    <button
                      type="button"
                      className={`patients-filter-menu-item ${sortBy === 'newest' ? 'selected' : ''}`}
                      onClick={() => {
                        setSortBy('newest');
                        setOpenDropdown(null);
                      }}
                    >
                      {t('patients.actions.newest', 'Newest Registered')}
                    </button>
                    <button
                      type="button"
                      className={`patients-filter-menu-item ${sortBy === 'oldest' ? 'selected' : ''}`}
                      onClick={() => {
                        setSortBy('oldest');
                        setOpenDropdown(null);
                      }}
                    >
                      {t('patients.actions.oldest', 'Oldest Registered')}
                    </button>
                    <button
                      type="button"
                      className={`patients-filter-menu-item ${sortBy === 'name' ? 'selected' : ''}`}
                      onClick={() => {
                        setSortBy('name');
                        setOpenDropdown(null);
                      }}
                    >
                      {t('patients.actions.nameAsc', 'Name (A-Z)')}
                    </button>
                    <button
                      type="button"
                      className={`patients-filter-menu-item ${sortBy === 'vaultId' ? 'selected' : ''}`}
                      onClick={() => {
                        setSortBy('vaultId');
                        setOpenDropdown(null);
                      }}
                    >
                      {t('patients.actions.vaultIdAsc', 'Vault ID (A-Z)')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ====================================================================
              DATA TABLE CONTAINER & HIGH-DENSITY ROWS
              ==================================================================== */}
          <div className="patients-table-container" data-node-id="20:1770">
            <div className="patients-table-scroll" data-node-id="20:1771">
              <table className="patients-table">
                {/* Header Row */}
                <thead className="patients-table-header" data-node-id="20:1772">
                  <tr>
                    <th style={{ width: '186px' }} data-node-id="20:1774">
                      {t('patients.table.patient', 'Patient')}
                    </th>
                    <th style={{ width: '118px' }} data-node-id="20:1776">
                      {t('patients.table.vaultId', 'Vault ID')}
                    </th>
                    <th style={{ width: '131px' }} data-node-id="20:1778">
                      {t('patients.table.demographics', 'Demographics')}
                    </th>
                    <th style={{ width: '112px' }} data-node-id="20:1780">
                      {t('patients.table.registered', 'Registered')}
                    </th>
                    <th style={{ width: '119px' }} data-node-id="20:1782">
                      {t('patients.table.verification', 'Verification')}
                    </th>
                    <th style={{ width: '90px' }} data-node-id="20:1784">
                      {t('patients.table.status', 'Status')}
                    </th>
                    <th style={{ width: '93px' }} data-node-id="20:1786">
                      {t('patients.table.links', 'Links')}
                    </th>
                    <th className="align-right" style={{ width: '84px' }} data-node-id="20:1788">
                      {t('patients.table.actions', 'Actions')}
                    </th>
                  </tr>
                </thead>

                {/* Body Rows */}
                <tbody data-node-id="20:1789">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`patient-skel-${i}`} className="patients-table-row">
                        <td colSpan={8} style={{ padding: '16px' }}>
                          <span
                            className="skeleton-pulse"
                            style={{ width: '100%', height: '24px', display: 'block' }}
                          />
                        </td>
                      </tr>
                    ))
                  ) : isError ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px 16px', textAlign: 'center' }}>
                        <div style={{ color: '#ba1a1a', fontWeight: 600, marginBottom: '8px' }}>
                          Failed to load patients from backend
                        </div>
                        <div style={{ color: '#7a7585', fontSize: '13px', marginBottom: '16px' }}>
                          {(error as Error)?.message ||
                            'An unexpected error occurred while communicating with the API.'}
                        </div>
                        <button
                          type="button"
                          className="patients-empty-reset-btn"
                          onClick={() => refetch()}
                        >
                          Retry Request
                        </button>
                      </td>
                    </tr>
                  ) : patientsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="patients-table-empty">
                        <div className="patients-empty-card">
                          <h3 className="patients-empty-title">
                            {searchTerm || statusFilter !== 'All' || dateRangeFilter !== 'All' || genderFilter !== 'All'
                              ? t('patients.emptyState.noResultsTitle', 'No Patients Found')
                              : t('patients.emptyState.zeroTitle', 'No Patient Records Yet')}
                          </h3>
                          <p className="patients-empty-desc">
                            {searchTerm || statusFilter !== 'All' || dateRangeFilter !== 'All' || genderFilter !== 'All'
                              ? t('patients.emptyState.noResultsDesc', 'No patient records matched your active filters or search query.')
                              : t('patients.emptyState.zeroDesc', 'Get started by creating your first patient profile in CareID.')}
                          </p>
                          {searchTerm || statusFilter !== 'All' || dateRangeFilter !== 'All' || genderFilter !== 'All' ? (
                            <button
                              type="button"
                              className="patients-empty-reset-btn"
                              onClick={() => {
                                setSearchTerm('');
                                setStatusFilter('All');
                                setDateRangeFilter('All');
                                setGenderFilter('All');
                                setCurrentPage(1);
                              }}
                            >
                              {t('patients.emptyState.clearFilters', 'Clear All Filters')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="patients-empty-reset-btn"
                              onClick={() => handleNavClick('add-patient', '/admin/patients/create')}
                            >
                              {t('patients.actions.addPatient', '+ Register New Patient')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    patientsList.map((patient) => {
                      const isInactive = patient.status === 'INACTIVE';
                      return (
                        <tr
                          key={patient.id}
                          className={`patients-table-row ${isInactive ? 'inactive' : ''}`}
                          data-node-id={patient.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            const targetPath = `/admin/patients/${patient.id}`;
                            if (onNavigate) {
                              onNavigate(targetPath);
                            } else {
                              navigate(targetPath);
                            }
                          }}
                        >
                          {/* Patient Name + Avatar + Phone */}
                          <td data-node-id="20:1791">
                            <div className="patients-cell-patient">
                              <div className="patients-avatar-wrap" data-node-id="20:1792">
                                {patient.avatarUrl ? (
                                  <img
                                    src={patient.avatarUrl}
                                    alt={patient.name}
                                    style={isInactive ? { filter: 'grayscale(1)' } : undefined}
                                  />
                                ) : (
                                  <span
                                    className="patients-avatar-initials size-full flex items-center justify-center"
                                    style={{
                                      backgroundColor: patient.avatarBg || '#edeef0',
                                      color: patient.avatarColor || '#494552',
                                    }}
                                  >
                                    {patient.initials}
                                  </span>
                                )}
                              </div>
                              <div className="patients-name-box">
                                <span className="patients-name" data-node-id="20:1796">
                                  {patient.name}
                                </span>
                                <span className="patients-phone" data-node-id="20:1798">
                                  {patient.phone}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Vault ID */}
                          <td data-node-id="20:1799">
                            <span className="patients-vault-id" data-node-id="20:1800">
                              {patient.vaultId}
                            </span>
                          </td>

                          {/* Demographics */}
                          <td data-node-id="20:1801">
                            <span className="patients-text-demographics" data-node-id="20:1802">
                              {patient.demographics}
                            </span>
                          </td>

                          {/* Registered */}
                          <td data-node-id="20:1803">
                            <span className="patients-text-date" data-node-id="20:1804">
                              {patient.registered}
                            </span>
                          </td>

                          {/* Verification */}
                          <td data-node-id="20:1805">
                            <div
                              className={`patients-badge-verification ${
                                patient.verification === 'Verified' ? 'verified' : 'pending'
                              }`}
                              title={
                                patient.verification === 'Pending'
                                  ? 'Patient onboarding in progress (profileStatus: DRAFT)'
                                  : 'Patient onboarding completed and verified'
                              }
                              data-node-id="20:1806"
                            >
                              <img
                                src={
                                  patient.verification === 'Verified'
                                    ? badgeVerifiedCheck
                                    : badgePendingClock
                                }
                                alt=""
                                className="patients-badge-icon"
                              />
                              <span data-node-id="20:1809">
                                {patient.verification === 'Verified'
                                  ? t('patients.table.verified', 'Verified')
                                  : t('patients.table.pending', 'Pending')}
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td data-node-id="20:1810">
                            <div className="patients-status-box" data-node-id="20:1811">
                              <span
                                className={`patients-status-dot ${
                                  patient.status === 'ACTIVE' ? 'active' : 'inactive'
                                }`}
                                data-node-id="20:1812"
                              />
                              <span
                                className={`patients-status-text ${
                                  patient.status === 'ACTIVE' ? 'active' : 'inactive'
                                }`}
                                data-node-id="20:1813"
                              >
                                {patient.status === 'ACTIVE'
                                  ? t('patients.table.active', 'Active')
                                  : t('patients.table.inactive', 'Inactive')}
                              </span>
                            </div>
                          </td>

                          {/* Links (Family & Records) */}
                          <td data-node-id="20:1814">
                            <div className="patients-links-box">
                              <div
                                className={`patients-link-item ${patient.links.family === 0 ? 'muted' : ''}`}
                                data-node-id="20:1815"
                              >
                                <img src={tableLinkFamily} alt="" className="patients-link-icon" />
                                <span data-node-id="20:1818">{patient.links.family}</span>
                              </div>
                              <div
                                className={`patients-link-item ${patient.links.records === 0 ? 'muted' : ''}`}
                                data-node-id="20:1819"
                              >
                                <img src={tableLinkRecords} alt="" className="patients-link-icon" />
                                <span data-node-id="20:1822">{patient.links.records}</span>
                              </div>
                            </div>
                          </td>

                          {/* Actions Kebab Menu */}
                          <td className="align-right" data-node-id="20:1823">
                            <div className="relative inline-block" ref={actionMenuRef}>
                              <button
                                type="button"
                                className="patients-action-btn"
                                aria-label={`Actions for ${patient.name}`}
                                aria-haspopup="true"
                                aria-expanded={openActionMenuPatientId === patient.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionMenuPatientId(
                                    openActionMenuPatientId === patient.id ? null : patient.id
                                  );
                                }}
                                data-node-id="20:1824"
                              >
                                <img src={tableKebabIcon} alt="Actions" />
                              </button>

                              {openActionMenuPatientId === patient.id && (
                                <div
                                  className="patients-row-menu"
                                  role="menu"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className="patients-row-menu-item"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenActionMenuPatientId(null);
                                      const targetPath = `/admin/patients/${patient.id}`;
                                      if (onNavigate) {
                                        onNavigate(targetPath);
                                      } else {
                                        navigate(targetPath);
                                      }
                                    }}
                                  >
                                    <Eye size={15} />
                                    <span>{t('patients.table.viewDetails', 'View Patient Details')}</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="patients-row-menu-item"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenActionMenuPatientId(null);
                                      setSelectedPatientForEdit(patient);
                                    }}
                                  >
                                    <Edit3 size={15} />
                                    <span>{t('patients.accountActions.edit.title', 'Edit Profile')}</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="patients-row-menu-item"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenActionMenuPatientId(null);
                                      setSelectedPatientForReset(patient);
                                    }}
                                  >
                                    <KeyRound size={15} />
                                    <span>{t('patients.accountActions.reset.title', 'Reset Password')}</span>
                                  </button>

                                  <button
                                    type="button"
                                    className={`patients-row-menu-item ${
                                      patient.status === 'ACTIVE' ? 'danger' : ''
                                    }`}
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenActionMenuPatientId(null);
                                      setSelectedPatientForDeactivate(patient);
                                    }}
                                  >
                                    {patient.status === 'ACTIVE' ? <UserX size={15} /> : <UserCheck size={15} />}
                                    <span>
                                      {patient.status === 'ACTIVE'
                                        ? t('patients.table.toggleStatus', 'Suspend Account')
                                        : t('patients.accountActions.reactivate.confirm', 'Activate Account')}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    className="patients-row-menu-item"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenActionMenuPatientId(null);
                                      const target = `/admin/ocr/queue?q=${encodeURIComponent(patient.vaultId || patient.name)}`;
                                      if (onNavigate) {
                                        onNavigate(target);
                                      } else {
                                        navigate(target);
                                      }
                                    }}
                                  >
                                    <FileText size={15} />
                                    <span>{t('patients.table.verifyOcr', 'Review OCR Documents')}</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="patients-row-menu-item"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenActionMenuPatientId(null);
                                      setSnackbarMessage(`Exporting patient summary for ${patient.name}`);
                                    }}
                                  >
                                    <Download size={15} />
                                    <span>{t('patients.table.exportRecord', 'Export Patient Record')}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="patients-pagination" data-node-id="20:1901">
              <p className="patients-pagination-text" data-node-id="20:1903">
                {t('patients.pagination.showing', {
                  start: startResult,
                  end: endResult,
                  total: totalResults.toLocaleString(),
                })}
              </p>

              <div className="patients-pagination-controls" data-node-id="20:1904">
                <button
                  type="button"
                  className="patients-page-btn"
                  disabled={currentPage <= 1 || isLoading}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous Page"
                  data-node-id="20:1905"
                >
                  <img src={iconPagePrev} alt="<" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={`page-${pageNum}`}
                    type="button"
                    className={`patients-page-btn ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                    data-node-id={`20:1908-${pageNum}`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  className="patients-page-btn"
                  disabled={currentPage >= totalPages || isLoading}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next Page"
                  data-node-id="20:1918"
                >
                  <img src={iconPageNext} alt=">" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ====================================================================
          AUTHENTIC PATIENT ACTION DIALOGS (Figma Node 20:2149)
          ==================================================================== */}
      <DeactivatePatientDialog
        isOpen={Boolean(selectedPatientForDeactivate)}
        patientName={selectedPatientForDeactivate?.name || ''}
        isReactivating={selectedPatientForDeactivate?.status === 'INACTIVE'}
        isLoading={toggleStatusMutation.isPending}
        onClose={() => setSelectedPatientForDeactivate(null)}
        onConfirm={handleTogglePatientStatusConfirm}
      />

      <ResetPatientPasswordDialog
        isOpen={Boolean(selectedPatientForReset)}
        patientEmail={
          selectedPatientForReset?.email ||
          (selectedPatientForReset
            ? `${selectedPatientForReset.name.toLowerCase().replace(/\s+/g, '.')}@example.com`
            : '')
        }
        isLoading={resetAccountMutation.isPending}
        onClose={() => setSelectedPatientForReset(null)}
        onConfirm={handleResetPasswordConfirm}
      />

      <EditPatientProfileDialog
        isOpen={Boolean(selectedPatientForEdit)}
        patient={selectedPatientForEdit}
        isLoading={updatePatientMutation.isPending}
        onClose={() => setSelectedPatientForEdit(null)}
        onSave={handleSaveEditProfile}
      />

      <ActionSuccessSnackbar
        isVisible={Boolean(snackbarMessage)}
        message={snackbarMessage || ''}
        onDismiss={() => setSnackbarMessage(null)}
      />
    </div>
  );
};

export default AdminPatientDirectory;
