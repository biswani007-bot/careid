import React, { useState, useId, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Search,
  Eye,
  Edit3,
  UserX,
  UserCheck,
  Download,
  HelpCircle,
  Settings,
  KeyRound,
} from 'lucide-react';

// Styling
import '../dashboard/AdminDashboard.css';
import './AdminDoctorDirectory.css';

// Authentic Assets from Figma Node 20:2270
import avatarAdminImg from '../../assets/patients/avatar-admin.png';
import iconBell from '../../assets/patients/icon-bell.svg';
import iconAddDoctorSvg from '../../assets/doctors/icon-add-doctor.svg';
import kpiTotalIcon from '../../assets/doctors/kpi-total-doctors.svg';
import kpiVerifiedIcon from '../../assets/doctors/kpi-verified-doctors.svg';
import kpiPendingIcon from '../../assets/doctors/kpi-pending-doctors.svg';
import kpiSuspendedIcon from '../../assets/doctors/kpi-suspended-doctors.svg';
import iconChevronDown from '../../assets/doctors/icon-chevron-down.svg';
import iconChevronRight from '../../assets/doctors/icon-chevron-right.svg';
import iconKebab from '../../assets/doctors/icon-kebab.svg';

// Authentic Shared Shell
import AdminSidebar from '../common/AdminSidebar';
import ActionSuccessSnackbar from '../users/ActionSuccessSnackbar';

// Dialog Components
import SuspendDoctorDialog from './SuspendDoctorDialog';
import ResetDoctorPasswordDialog from './ResetDoctorPasswordDialog';
import EditDoctorProfileDialog from './EditDoctorProfileDialog';

// TanStack Query & Service
import {
  useDoctorsQuery,
  useSuspendDoctorMutation,
  useResetDoctorPasswordMutation,
  useUpdateDoctorProfileMutation,
  type DoctorItem,
} from '../../services/doctorService';

export interface AdminDoctorDirectoryProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

const SPECIALTY_OPTIONS = [
  'All Specialties',
  'Cardiology',
  'Neurology',
  'Oncology',
  'Pediatrics',
  'Dermatology',
  'Orthopedics',
];

const HOSPITAL_OPTIONS = [
  'All Hospitals',
  'Metropolitan General',
  'St. Jude Medical Center',
  'City Health Clinic',
  'Valley Children\'s Hospital',
];

export const AdminDoctorDirectory: React.FC<AdminDoctorDirectoryProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchInputId = useId();

  // Navigation & Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('doctors');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Verified' | 'Pending' | 'Suspended'>('All');
  const [specialtyFilter, setSpecialtyFilter] = useState('All Specialties');
  const [hospitalFilter, setHospitalFilter] = useState('All Hospitals');
  const [sortBy, setSortBy] = useState<'name' | 'hvId' | 'specialty' | 'status' | 'default'>('default');

  // Dropdown Popovers
  const [isSpecialtyOpen, setIsSpecialtyOpen] = useState(false);
  const [isHospitalOpen, setIsHospitalOpen] = useState(false);
  const [openActionMenuDoctorId, setOpenActionMenuDoctorId] = useState<string | null>(null);

  // Snackbar Toast
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const specialtyDropdownRef = useRef<HTMLDivElement>(null);
  const hospitalDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (specialtyDropdownRef.current && !specialtyDropdownRef.current.contains(target)) {
        setIsSpecialtyOpen(false);
      }
      if (hospitalDropdownRef.current && !hospitalDropdownRef.current.contains(target)) {
        setIsHospitalOpen(false);
      }
      if (!target.closest('.doctors-action-btn') && !target.closest('.doctors-row-menu')) {
        setOpenActionMenuDoctorId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch Doctors via TanStack Query
  const { data, isLoading } = useDoctorsQuery({
    search: searchTerm,
    statusFilter,
    specialtyFilter,
    hospitalFilter,
    sortBy,
  });

  const suspendMutation = useSuspendDoctorMutation();
  const resetMutation = useResetDoctorPasswordMutation();
  const updateMutation = useUpdateDoctorProfileMutation();

  // Action Modals State
  const [selectedDoctorForAction, setSelectedDoctorForAction] = useState<DoctorItem | null>(null);
  const [activeModalAction, setActiveModalAction] = useState<'none' | 'suspend' | 'reset' | 'edit'>('none');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const handleNavClick = (navKey: string, path: string) => {
    setActiveNav(navKey);
    setIsDrawerOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const handleAddDoctorClick = () => {
    handleNavClick('doctors', '/admin/doctors/create');
  };

  const handleConfirmSuspend = async () => {
    if (!selectedDoctorForAction) return;
    setIsProcessingAction(true);
    const nextSuspended = selectedDoctorForAction.status !== 'Suspended';
    try {
      await suspendMutation.mutateAsync({
        doctorId: selectedDoctorForAction.id,
        isSuspended: nextSuspended,
      });
      setActiveModalAction('none');
      setSnackbarMessage(
        nextSuspended
          ? t('doctors.profile.toasts.suspended', {
              name: selectedDoctorForAction.name.replace(/^Dr\.\s*/i, ''),
              defaultValue: `${selectedDoctorForAction.name}'s account has been suspended.`,
            })
          : t('doctors.profile.toasts.activated', {
              name: selectedDoctorForAction.name.replace(/^Dr\.\s*/i, ''),
              defaultValue: `${selectedDoctorForAction.name}'s account has been activated.`,
            })
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!selectedDoctorForAction) return;
    setIsProcessingAction(true);
    try {
      await resetMutation.mutateAsync({
        doctorId: selectedDoctorForAction.id,
        email: selectedDoctorForAction.email || 'dr.vance@clinic.org',
      });
      setActiveModalAction('none');
      setSnackbarMessage(
        t('doctors.profile.toasts.passwordResetSent', {
          email: selectedDoctorForAction.email || 'dr.vance@clinic.org',
          defaultValue: `Password reset instructions sent to ${selectedDoctorForAction.email || 'dr.vance@clinic.org'}.`,
        })
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleSaveProfile = async (updatedData: Partial<DoctorItem> & { id: string }) => {
    if (!selectedDoctorForAction) return;
    setIsProcessingAction(true);
    try {
      await updateMutation.mutateAsync({
        ...updatedData,
        id: selectedDoctorForAction.id,
      });
      setActiveModalAction('none');
      const targetName = updatedData.name || selectedDoctorForAction.name;
      setSnackbarMessage(
        t('doctors.profile.toasts.profileUpdated', {
          name: targetName.replace(/^Dr\.\s*/i, ''),
          defaultValue: `Doctor profile for ${targetName} updated successfully.`,
        })
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  const doctorsList = data?.doctors || [];
  const kpis = data?.kpis || {
    totalDoctors: 3842,
    verifiedDoctors: 3510,
    pendingDoctors: 248,
    suspendedDoctors: 84,
  };

  return (
    <div className="careid-dashboard-shell" data-node-id="20:2270">
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
        onNavigate={(path) => handleNavClick('doctors', path)}
        onLogout={onLogout}
      />

      {/* ====================================================================
          MAIN CONTENT WRAPPER (Header + Scrollable Canvas)
          ==================================================================== */}
      <div className="careid-main-wrapper" data-node-id="20:2271">
        {/* Top Navigation Bar (Header) */}
        <header className="careid-top-navbar" data-node-id="20:2272">
          <div className="header-left-cluster">
            <button
              type="button"
              className="header-menu-toggle"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>

            {/* Global Search Bar */}
            <div className="patients-header-search-wrap" data-node-id="20:2274">
              <Search size={16} className="patients-header-search-input-icon" />
              <input
                id={searchInputId}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t(
                  'doctors.actions.searchPlaceholder',
                  'Search records, IDs, or patients...'
                )}
                className="patients-header-search-input"
                aria-label="Search records"
              />
            </div>
          </div>

          {/* Right Action Icons & Admin Profile */}
          <div className="users-header-actions" data-node-id="20:2280">
            {/* Notification Bell */}
            <button
              type="button"
              className="users-header-icon-btn"
              aria-label="Notifications"
              data-node-id="20:2281"
              onClick={() =>
                setSnackbarMessage('You have 3 doctor verification requests pending review.')
              }
            >
              <img src={iconBell} alt="Notifications" />
              <span className="users-header-badge" />
            </button>

            {/* Settings */}
            <button
              type="button"
              className="users-header-icon-btn"
              aria-label="Settings"
              data-node-id="20:2285"
              onClick={() =>
                setSnackbarMessage('Doctor directory configuration opened.')
              }
            >
              <Settings size={18} className="text-[#494552]" />
            </button>

            {/* Support / Help */}
            <button
              type="button"
              className="users-header-icon-btn"
              aria-label="Support & Help"
              data-node-id="20:2289"
              onClick={() =>
                setSnackbarMessage('Help & Documentation loaded.')
              }
            >
              <HelpCircle size={18} className="text-[#494552]" />
            </button>

            {/* Admin Avatar */}
            <div className="users-header-avatar-wrap" data-node-id="20:2293">
              <img
                src={avatarAdminImg}
                alt="Administrator"
                className="users-header-avatar"
              />
            </div>
          </div>
        </header>

        {/* ====================================================================
            SCROLLABLE CANVAS (Figma Node 20:2295)
            ==================================================================== */}
        <main className="doctors-main-canvas" data-node-id="20:2295">
          {/* Page Header & Breadcrumbs (Node 20:2297) */}
          <div className="doctors-header-cluster" data-node-id="20:2297">
            <div className="doctors-title-box" data-node-id="20:2298">
              {/* Breadcrumb: Admin > Doctors */}
              <div className="doctors-breadcrumbs" data-node-id="20:2299">
                <button
                  type="button"
                  className="doctors-breadcrumb-root"
                  onClick={() => handleNavClick('dashboard', '/admin/dashboard')}
                  data-node-id="20:2301"
                >
                  {t('doctors.breadcrumbs.admin', 'Admin')}
                </button>
                <span className="doctors-breadcrumb-sep" data-node-id="20:2302">
                  <img src={iconChevronRight} alt=">" />
                </span>
                <span className="doctors-breadcrumb-current" data-node-id="20:2305">
                  {t('doctors.breadcrumbs.doctors', 'Doctors')}
                </span>
              </div>

              {/* Title */}
              <h1 className="doctors-heading" data-node-id="20:2307">
                {t('doctors.title', 'Doctor Directory')}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold rounded-full border border-[#006a60] text-[#006a60] bg-white hover:bg-[#e6f5f3] flex items-center gap-1.5 transition-colors"
                onClick={() => handleNavClick('doctors', '/admin/doctors/actions')}
              >
                <span>{t('doctors.managementActions.pageTitle', 'Actions & States')}</span>
              </button>

              {/* Add Doctor Primary Button */}
              <button
                type="button"
                className="doctors-add-btn"
                onClick={handleAddDoctorClick}
                data-node-id="20:2308"
              >
                <img src={iconAddDoctorSvg} alt="" />
                <span>{t('doctors.actions.addDoctor', 'Add Doctor')}</span>
              </button>
            </div>
          </div>

          {/* ====================================================================
              SUMMARY CARDS (Figma Node 20:2314)
              ==================================================================== */}
          <section className="doctors-kpi-grid" aria-label="Doctor Statistics" data-node-id="20:2314">
            {/* Card 1: TOTAL DOCTORS */}
            <div className="doctors-kpi-card" data-node-id="20:2315">
              <div className="doctors-kpi-top">
                <span className="doctors-kpi-label" data-node-id="20:2319">
                  {t('doctors.kpis.totalDoctors', 'TOTAL DOCTORS')}
                </span>
                <div className="doctors-kpi-icon-wrap purple" data-node-id="20:2320">
                  <img src={kpiTotalIcon} alt="" />
                </div>
              </div>
              <h2 className="doctors-kpi-value" data-node-id="20:2324">
                {kpis.totalDoctors.toLocaleString()}
              </h2>
            </div>

            {/* Card 2: VERIFIED */}
            <div className="doctors-kpi-card" data-node-id="20:2325">
              <div className="doctors-kpi-top">
                <span className="doctors-kpi-label" data-node-id="20:2329">
                  {t('doctors.kpis.verified', 'VERIFIED')}
                </span>
                <div className="doctors-kpi-icon-wrap teal" data-node-id="20:2330">
                  <img src={kpiVerifiedIcon} alt="" />
                </div>
              </div>
              <h2 className="doctors-kpi-value" data-node-id="20:2334">
                {kpis.verifiedDoctors.toLocaleString()}
              </h2>
            </div>

            {/* Card 3: PENDING */}
            <div className="doctors-kpi-card" data-node-id="20:2335">
              <div className="doctors-kpi-top">
                <span className="doctors-kpi-label" data-node-id="20:2339">
                  {t('doctors.kpis.pending', 'PENDING')}
                </span>
                <div className="doctors-kpi-icon-wrap amber" data-node-id="20:2340">
                  <img src={kpiPendingIcon} alt="" />
                </div>
              </div>
              <h2 className="doctors-kpi-value" data-node-id="20:2344">
                {kpis.pendingDoctors.toLocaleString()}
              </h2>
            </div>

            {/* Card 4: SUSPENDED */}
            <div className="doctors-kpi-card" data-node-id="20:2345">
              <div className="doctors-kpi-top">
                <span className="doctors-kpi-label" data-node-id="20:2349">
                  {t('doctors.kpis.suspended', 'SUSPENDED')}
                </span>
                <div className="doctors-kpi-icon-wrap red" data-node-id="20:2350">
                  <img src={kpiSuspendedIcon} alt="" />
                </div>
              </div>
              <h2 className="doctors-kpi-value" data-node-id="20:2354">
                {kpis.suspendedDoctors.toLocaleString()}
              </h2>
            </div>
          </section>

          {/* ====================================================================
              FILTER BAR (Figma Node 20:2355)
              ==================================================================== */}
          <section className="doctors-filter-bar" aria-label="Filter Controls" data-node-id="20:2355">
            {/* Status Pills */}
            <div className="doctors-status-pills" data-node-id="20:2357">
              <button
                type="button"
                className={`doctors-pill ${statusFilter === 'All' ? 'active-all' : ''}`}
                onClick={() => setStatusFilter('All')}
                data-node-id="20:2358"
              >
                {t('doctors.filters.all', 'All')}
              </button>
              <button
                type="button"
                className={`doctors-pill ${statusFilter === 'Verified' ? 'active-verified' : ''}`}
                onClick={() => setStatusFilter('Verified')}
                data-node-id="20:2361"
              >
                {t('doctors.filters.verified', 'Verified')}
              </button>
              <button
                type="button"
                className={`doctors-pill ${statusFilter === 'Pending' ? 'active-pending' : ''}`}
                onClick={() => setStatusFilter('Pending')}
                data-node-id="20:2364"
              >
                {t('doctors.filters.pending', 'Pending')}
              </button>
              <button
                type="button"
                className={`doctors-pill ${statusFilter === 'Suspended' ? 'active-suspended' : ''}`}
                onClick={() => setStatusFilter('Suspended')}
                data-node-id="20:2367"
              >
                {t('doctors.filters.suspended', 'Suspended')}
              </button>
            </div>

            {/* Right Dropdowns: Specialties & Hospitals */}
            <div className="doctors-dropdowns-cluster" data-node-id="20:2369">
              {/* Specialties Dropdown */}
              <div className="doctors-dropdown-wrap" ref={specialtyDropdownRef} data-node-id="20:2370">
                <button
                  type="button"
                  className={`doctors-dropdown-btn ${isSpecialtyOpen ? 'open active' : ''}`}
                  onClick={() => {
                    setIsSpecialtyOpen(!isSpecialtyOpen);
                    setIsHospitalOpen(false);
                  }}
                  aria-expanded={isSpecialtyOpen}
                  data-node-id="20:2371"
                >
                  <span>{specialtyFilter}</span>
                  <img src={iconChevronDown} alt="" className="doctors-dropdown-chevron" />
                </button>

                {isSpecialtyOpen && (
                  <div className="doctors-dropdown-menu" role="menu">
                    {SPECIALTY_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        role="menuitem"
                        className={`doctors-dropdown-item ${specialtyFilter === opt ? 'selected' : ''}`}
                        onClick={() => {
                          setSpecialtyFilter(opt);
                          setIsSpecialtyOpen(false);
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Hospitals Dropdown */}
              <div className="doctors-dropdown-wrap" ref={hospitalDropdownRef} data-node-id="20:2380">
                <button
                  type="button"
                  className={`doctors-dropdown-btn ${isHospitalOpen ? 'open active' : ''}`}
                  onClick={() => {
                    setIsHospitalOpen(!isHospitalOpen);
                    setIsSpecialtyOpen(false);
                  }}
                  aria-expanded={isHospitalOpen}
                  data-node-id="20:2381"
                >
                  <span>{hospitalFilter}</span>
                  <img src={iconChevronDown} alt="" className="doctors-dropdown-chevron" />
                </button>

                {isHospitalOpen && (
                  <div className="doctors-dropdown-menu" role="menu">
                    {HOSPITAL_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        role="menuitem"
                        className={`doctors-dropdown-item ${hospitalFilter === opt ? 'selected' : ''}`}
                        onClick={() => {
                          setHospitalFilter(opt);
                          setIsHospitalOpen(false);
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ====================================================================
              DOCTOR DATA TABLE (Figma Node 20:2389)
              ==================================================================== */}
          <section className="doctors-table-card" aria-label="Doctors Table" data-node-id="20:2389">
            <div className="doctors-table-wrapper">
              <table className="doctors-table">
                {/* Header */}
                <thead>
                  <tr data-node-id="20:2391">
                    <th className="col-avatar" aria-label="Avatar" />
                    <th
                      className="col-name cursor-pointer select-none"
                      onClick={() => setSortBy('name')}
                      title="Sort by Name"
                      data-node-id="20:2393"
                    >
                      {t('doctors.table.name', 'Name')} {sortBy === 'name' ? '↑' : ''}
                    </th>
                    <th
                      className="col-hvid cursor-pointer select-none"
                      onClick={() => setSortBy('hvId')}
                      title="Sort by HV ID"
                      data-node-id="20:2395"
                    >
                      {t('doctors.table.hvId', 'HV ID')} {sortBy === 'hvId' ? '↑' : ''}
                    </th>
                    <th className="col-license" data-node-id="20:2397">
                      {t('doctors.table.license', 'License')}
                    </th>
                    <th
                      className="col-specialty cursor-pointer select-none"
                      onClick={() => setSortBy('specialty')}
                      title="Sort by Specialty"
                      data-node-id="20:2399"
                    >
                      {t('doctors.table.specialty', 'Specialty')} {sortBy === 'specialty' ? '↑' : ''}
                    </th>
                    <th
                      className="col-status cursor-pointer select-none"
                      onClick={() => setSortBy('status')}
                      title="Sort by Status"
                      data-node-id="20:2401"
                    >
                      {t('doctors.table.status', 'Status')} {sortBy === 'status' ? '↑' : ''}
                    </th>
                    <th className="col-actions" aria-label="Actions" />
                  </tr>
                </thead>

                {/* Body */}
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-[#6b7280]">
                        Loading doctor records...
                      </td>
                    </tr>
                  ) : doctorsList.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="doctors-empty-card">
                          <h3 className="doctors-empty-title">
                            {t('doctors.emptyState.noResultsTitle', 'No Doctors Found')}
                          </h3>
                          <p className="doctors-empty-desc">
                            {t(
                              'doctors.emptyState.noResultsDesc',
                              'No doctor records matched your search query or active filters.'
                            )}
                          </p>
                          <button
                            type="button"
                            className="doctors-empty-reset-btn"
                            onClick={() => {
                              setSearchTerm('');
                              setStatusFilter('All');
                              setSpecialtyFilter('All Specialties');
                              setHospitalFilter('All Hospitals');
                            }}
                          >
                            {t('doctors.emptyState.clearFilters', 'Reset Filters')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    doctorsList.map((doc) => {
                      const isVerified = doc.status === 'Verified';
                      const isPending = doc.status === 'Pending';
                      const isSuspended = doc.status === 'Suspended';

                      return (
                        <tr
                          key={doc.id}
                          data-node-id={doc.id}
                          className="cursor-pointer hover:bg-[#f8f9fb] transition-colors"
                          onClick={() => handleNavClick('doctors', `/admin/doctors/${doc.id}`)}
                        >
                          {/* Avatar Column */}
                          <td className="col-avatar">
                            <div className="doctors-avatar-container">
                              {doc.avatarUrl ? (
                                <img
                                  src={doc.avatarUrl}
                                  alt={doc.name}
                                  style={isSuspended ? { filter: 'grayscale(1)' } : undefined}
                                />
                              ) : (
                                <span
                                  className="doctors-avatar-initials"
                                  style={{
                                    backgroundColor: doc.avatarBg || '#edeef0',
                                    color: doc.avatarColor || '#494552',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    height: '100%',
                                  }}
                                >
                                  {doc.initials}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Name Column */}
                          <td className="col-name">
                            <span className="doctors-doctor-name">{doc.name}</span>
                          </td>

                          {/* HV ID Column */}
                          <td className="col-hvid">
                            <span className="doctors-doctor-hvid">{doc.hvId}</span>
                          </td>

                          {/* License Column */}
                          <td className="col-license">
                            <span className="doctors-doctor-license">{doc.license}</span>
                          </td>

                          {/* Specialty Column */}
                          <td className="col-specialty">
                            <span className="doctors-doctor-specialty">{doc.specialty}</span>
                          </td>

                          {/* Status Badge Column */}
                          <td className="col-status">
                            <span
                              className={`doctors-status-badge ${
                                isVerified ? 'verified' : isPending ? 'pending' : 'suspended'
                              }`}
                            >
                              <span className="dot" />
                              <span>{doc.status}</span>
                            </span>
                          </td>

                          {/* Row Actions Kebab Menu */}
                          <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                            <div className="relative inline-block">
                              <button
                                type="button"
                                className="doctors-action-btn"
                                aria-label={`Actions for ${doc.name}`}
                                aria-haspopup="true"
                                aria-expanded={openActionMenuDoctorId === doc.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionMenuDoctorId(
                                    openActionMenuDoctorId === doc.id ? null : doc.id
                                  );
                                }}
                              >
                                <img src={iconKebab} alt="Actions" />
                              </button>

                              {openActionMenuDoctorId === doc.id && (
                                <div
                                  className="doctors-row-menu"
                                  role="menu"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className="doctors-row-menu-item"
                                    role="menuitem"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionMenuDoctorId(null);
                                      handleNavClick('doctors', `/admin/doctors/${doc.id}`);
                                    }}
                                  >
                                    <Eye size={15} />
                                    <span>
                                      {t('doctors.table.viewDetails', 'View Doctor Profile')}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    className="doctors-row-menu-item"
                                    role="menuitem"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionMenuDoctorId(null);
                                      setSelectedDoctorForAction(doc);
                                      setActiveModalAction('edit');
                                    }}
                                  >
                                    <Edit3 size={15} />
                                    <span>
                                      {t('doctors.table.editDoctor', 'Edit Doctor Info')}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    className="doctors-row-menu-item"
                                    role="menuitem"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionMenuDoctorId(null);
                                      setSelectedDoctorForAction(doc);
                                      setActiveModalAction('reset');
                                    }}
                                  >
                                    <KeyRound size={15} />
                                    <span>
                                      {t('doctors.managementActions.cards.resetCardTitle', 'Reset Password')}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    className={`doctors-row-menu-item ${
                                      doc.status !== 'Suspended' ? 'danger' : ''
                                    }`}
                                    role="menuitem"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionMenuDoctorId(null);
                                      setSelectedDoctorForAction(doc);
                                      setActiveModalAction('suspend');
                                    }}
                                  >
                                    {doc.status !== 'Suspended' ? (
                                      <UserX size={15} />
                                    ) : (
                                      <UserCheck size={15} />
                                    )}
                                    <span>
                                      {doc.status !== 'Suspended'
                                        ? t('doctors.table.suspendDoctor', 'Suspend Account')
                                        : t('doctors.table.activateDoctor', 'Activate Account')}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    className="doctors-row-menu-item"
                                    role="menuitem"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionMenuDoctorId(null);
                                      setSnackbarMessage(
                                        `Exporting record for ${doc.name}`
                                      );
                                    }}
                                  >
                                    <Download size={15} />
                                    <span>
                                      {t('doctors.table.exportRecord', 'Export Profile')}
                                    </span>
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
          </section>
        </main>
      </div>

      {/* Doctor Action Modals */}
      {selectedDoctorForAction && (
        <>
          <SuspendDoctorDialog
            isOpen={activeModalAction === 'suspend'}
            doctorName={selectedDoctorForAction.name}
            isSuspended={selectedDoctorForAction.status === 'Suspended'}
            isLoading={isProcessingAction}
            onClose={() => setActiveModalAction('none')}
            onConfirm={handleConfirmSuspend}
          />

          <ResetDoctorPasswordDialog
            isOpen={activeModalAction === 'reset'}
            doctorName={selectedDoctorForAction.name}
            doctorEmail={selectedDoctorForAction.email || 'dr.vance@clinic.org'}
            isLoading={isProcessingAction}
            onClose={() => setActiveModalAction('none')}
            onConfirm={handleConfirmReset}
          />

          <EditDoctorProfileDialog
            isOpen={activeModalAction === 'edit'}
            doctor={selectedDoctorForAction}
            isLoading={isProcessingAction}
            onClose={() => setActiveModalAction('none')}
            onSave={handleSaveProfile}
          />
        </>
      )}

      {/* Action Snackbar Toast */}
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

export default AdminDoctorDirectory;
