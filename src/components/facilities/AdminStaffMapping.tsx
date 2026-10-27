import React, { useState, useEffect, useId, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  Stethoscope,
  Users,
  Search,
  Bell,
  Settings,
  HelpCircle,
  Menu,
  ShieldAlert,
  Lock,
  Check,
  X,
  Activity,
  Zap,
  Radio,
  FileCheck2,
  UserCheck,
  RotateCcw,
  ArrowRight,
  Save,
} from 'lucide-react';

// Shell & Local Styles
import '../dashboard/AdminDashboard.css';
import './AdminStaffMapping.css';

// Shared Shell Components
import AdminSidebar from '../common/AdminSidebar';

// Services & Queries
import {
  useFacilityQuery,
  useUpdateStaffRosterMutation,
  useAssignFacilityAdminMutation,
  DEFAULT_ASSIGNED_STAFF,
} from '../../services/facilityService';
import type { AssignedStaff } from '../../services/facilityService';

// Authentic Assets
import rostovaAvatar from '../../assets/users/avatar-rostova.png';
import doctorChenImg from '../../assets/doctors/doctor-robert-chen.png';
import doctorJenkinsImg from '../../assets/doctors/doctor-sarah-jenkins.png';

export interface AdminStaffMappingProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

// Zod Schema for Mapping/Reassigning Staff
const staffMappingSchema = z.object({
  departmentSuite: z.string().min(1, 'Please select or enter an assigned suite / wing'),
  shiftRoster: z.string().min(1, 'Please specify a shift roster'),
  rosterState: z.enum(['Active', 'Standby Pool', 'Dual-Roster']),
});

type StaffMappingFormValues = z.infer<typeof staffMappingSchema>;

interface AdminPoolMember {
  id: string;
  name: string;
  role: string;
  email: string;
  tenure: string;
  vaultToken: string;
  avatarUrl?: string;
  initials: string;
}

const ADMIN_POOL_OPTIONS: AdminPoolMember[] = [
  {
    id: 'admin-1',
    name: 'Elena Rostova, MHA',
    role: 'Chief Operations Officer',
    email: 'e.rostova@mountsinai.careid.health',
    tenure: 'Assigned Jan 15, 2023 • 14 mos active',
    vaultToken: '#ADM-NY-0941',
    avatarUrl: rostovaAvatar,
    initials: 'ER',
  },
  {
    id: 'admin-2',
    name: 'Marcus Vance, MBA',
    role: 'Regional Governance Lead',
    email: 'm.vance@careid-health.org',
    tenure: 'Assigned Oct 2026 • Tier-1 Lead',
    vaultToken: '#ADM-NY-1022',
    initials: 'MV',
  },
  {
    id: 'admin-3',
    name: 'Dr. Sarah Chen, MD, MHA',
    role: 'Executive VP of Operations',
    email: 's.chen@careid-health.org',
    tenure: 'Assigned Oct 2026 • Tier-1 Lead',
    vaultToken: '#ADM-NY-4401',
    avatarUrl: doctorChenImg,
    initials: 'SC',
  },
  {
    id: 'admin-4',
    name: 'Julian Davies, FACHE',
    role: 'Health System Director',
    email: 'j.davies@careid-health.org',
    tenure: 'Assigned Oct 2026 • Tier-1 Lead',
    vaultToken: '#ADM-NY-8920',
    initials: 'JD',
  },
];

const SUITE_OPTIONS = [
  'Cath Suite #01',
  'Cath Suite #02',
  'Cath Suite #03',
  'Outpatient Wing',
  'Memorial Pavilion',
  'Pre-Op / Post-Op Recovery Bay',
  'Cardiovascular ICU',
  'Currently Unassigned',
];

const SHIFT_OPTIONS = [
  'Day (07:00 - 15:30)',
  'Rotation On-Call',
  'Standby Pool On-Call',
  'Dual-Rotation (08:00 - 16:30)',
  'Standard (08:00 - 17:00)',
  'Night Triage (23:00 - 07:30)',
];

export const AdminStaffMapping: React.FC<AdminStaffMappingProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { facilityId } = useParams<{ facilityId?: string }>();
  const searchInputId = useId();

  const currentFacilityId = facilityId || 'fac-1';

  // Navigation Helper
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const handleNav = (path: string) => {
    setIsDrawerOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  // Queries & Mutations
  const { data: facility } = useFacilityQuery(currentFacilityId);
  const updateRosterMutation = useUpdateStaffRosterMutation();
  const assignAdminMutation = useAssignFacilityAdminMutation();

  // Local Staff Roster State
  const [staffRoster, setStaffRoster] = useState<AssignedStaff[]>(DEFAULT_ASSIGNED_STAFF);
  const [isDirty, setIsDirty] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync with fetched facility
  useEffect(() => {
    if (facility?.assignedStaff && facility.assignedStaff.length > 0) {
      setStaffRoster(facility.assignedStaff);
      setIsDirty(false);
    }
  }, [facility]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'clinicalStaff' | 'adminAssign'>('clinicalStaff');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('All Roles');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Admin Assignment Local State
  const [selectedAdminId, setSelectedAdminId] = useState<string>('admin-1');
  const currentAdmin = useMemo(() => {
    const found = ADMIN_POOL_OPTIONS.find((a) => a.id === selectedAdminId);
    return found || ADMIN_POOL_OPTIONS[0];
  }, [selectedAdminId]);

  // Modals Local State
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<AssignedStaff | null>(null);
  const [isUnassignDialogOpen, setIsUnassignDialogOpen] = useState(false);
  const [unassigningStaff, setUnassigningStaff] = useState<AssignedStaff | null>(null);

  // Form for Editing/Mapping Staff
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StaffMappingFormValues>({
    resolver: zodResolver(staffMappingSchema),
  });

  const openMapModal = (staff: AssignedStaff) => {
    setEditingStaff(staff);
    reset({
      departmentSuite: staff.departmentSuite === 'Currently Unassigned' ? 'Cath Suite #03' : staff.departmentSuite,
      shiftRoster: staff.shiftRoster || 'Day (07:00 - 15:30)',
      rosterState: staff.rosterState === 'Standby Pool' ? 'Active' : staff.rosterState || 'Active',
    });
    setIsMapModalOpen(true);
  };

  const closeMapModal = () => {
    setIsMapModalOpen(false);
    setEditingStaff(null);
  };

  const onSaveStaffMapping = (values: StaffMappingFormValues) => {
    if (!editingStaff) return;
    const updated = staffRoster.map((s) => {
      if (s.id === editingStaff.id) {
        return {
          ...s,
          departmentSuite: values.departmentSuite,
          shiftRoster: values.shiftRoster,
          rosterState: values.rosterState,
          status: (values.rosterState === 'Standby Pool' ? 'Standby Pool' : 'Active') as AssignedStaff['status'],
        };
      }
      return s;
    });

    setStaffRoster(updated);
    setIsDirty(true);
    closeMapModal();
    showToast(
      t('facilities.staffMapping.toast.staffMapped', {
        name: editingStaff.name,
        suite: values.departmentSuite,
        defaultValue: `Staff member ${editingStaff.name} successfully mapped to ${values.departmentSuite}.`,
      })
    );
  };

  const openUnassignDialog = (staff: AssignedStaff) => {
    setUnassigningStaff(staff);
    setIsUnassignDialogOpen(true);
  };

  const confirmUnassign = () => {
    if (!unassigningStaff) return;
    const updated = staffRoster.map((s) => {
      if (s.id === unassigningStaff.id) {
        return {
          ...s,
          departmentSuite: 'Currently Unassigned',
          shiftRoster: 'Standby Pool On-Call',
          rosterState: 'Standby Pool' as const,
          status: 'Standby Pool' as const,
        };
      }
      return s;
    });

    setStaffRoster(updated);
    setIsDirty(true);
    setIsUnassignDialogOpen(false);
    showToast(
      t('facilities.staffMapping.toast.staffUnassigned', {
        name: unassigningStaff.name,
        defaultValue: `${unassigningStaff.name} unassigned and moved to Standby Pool.`,
      })
    );
    setUnassigningStaff(null);
  };

  // Discard All Changes
  const handleDiscardChanges = () => {
    if (facility?.assignedStaff) {
      setStaffRoster(facility.assignedStaff);
    } else {
      setStaffRoster(DEFAULT_ASSIGNED_STAFF);
    }
    setIsDirty(false);
    showToast(t('facilities.staffMapping.toast.discarded', 'Staff mapping changes have been discarded.'));
  };

  // Confirm All Mappings
  const handleConfirmAllMappings = async () => {
    try {
      await updateRosterMutation.mutateAsync({
        facilityId: currentFacilityId,
        staffList: staffRoster,
      });
      setIsDirty(false);
      showToast(
        t(
          'facilities.staffMapping.toast.allConfirmed',
          'All staff mappings successfully confirmed and logged to audit trail.'
        )
      );
      setTimeout(() => {
        handleNav(`/admin/facilities/${currentFacilityId}`);
      }, 1000);
    } catch (err) {
      console.error('Failed to confirm staff mappings', err);
      showToast('Error saving staff mappings. Please try again.');
    }
  };

  // Save Admin Assignment
  const handleSaveAdminAssignment = async () => {
    try {
      await assignAdminMutation.mutateAsync({
        facilityId: currentFacilityId,
        adminPayload: {
          adminName: currentAdmin.name,
          adminRole: currentAdmin.role,
          adminEmail: currentAdmin.email,
          adminTenure: currentAdmin.tenure,
          adminVaultToken: currentAdmin.vaultToken,
        },
      });
      showToast(
        t('facilities.staffMapping.toast.adminSaved', {
          name: currentAdmin.name,
          defaultValue: `Facility Administrator successfully updated to ${currentAdmin.name}.`,
        })
      );
    } catch (err) {
      console.error('Failed to assign facility admin', err);
      showToast('Error saving facility admin assignment.');
    }
  };

  // Filtered Roster
  const filteredStaff = useMemo(() => {
    return staffRoster.filter((staff) => {
      // Role category filter
      if (selectedRoleFilter !== 'All Roles') {
        if (staff.roleCategory !== selectedRoleFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = staff.name.toLowerCase().includes(q);
        const matchesId = staff.staffCode?.toLowerCase().includes(q) || false;
        const matchesRole = staff.roleDesignation.toLowerCase().includes(q);
        const matchesSuite = staff.departmentSuite.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesRole && !matchesSuite) {
          return false;
        }
      }

      return true;
    });
  }, [staffRoster, selectedRoleFilter, searchQuery]);

  const facilityName = facility?.legalName || 'Mount Sinai Hospital – Interventional Pavilion';
  const facilityCode = facility?.facilityId || 'FAC-NY-0941';

  return (
    <div className="staff-mapping-shell">
      {/* CareID Admin Shared Sidebar */}
      <AdminSidebar
        activeNav="facilities"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
      />

      <div className="staff-mapping-main-area">
        {/* Top Navbar (Figma Node 20:11910) */}
        <header className="careid-top-navbar" role="banner">
          <div className="careid-header-left">
            <button
              type="button"
              className="careid-mobile-toggle-btn md:hidden"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open sidebar menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-sm text-[#494552]">
              <span className="text-[#94a3b8] font-medium">/</span>
              <span className="font-bold text-[#0b1c30]">Admin Portal</span>
            </div>
          </div>

          <div className="careid-header-center-search">
            <label htmlFor={searchInputId} className="sr-only">
              {t('facilities.staffMapping.filters.searchPlaceholder', 'Search facilities, patients, logs...')}
            </label>
            <Search className="careid-header-search-icon" size={16} />
            <input
              id={searchInputId}
              type="search"
              className="careid-header-search-input"
              placeholder={t('dashboard.header.searchPlaceholder', 'Search facilities, patients, logs...')}
            />
          </div>

          <div className="careid-header-right">
            <button
              type="button"
              className="p-2 text-[#494552] hover:text-[#28006d] hover:bg-[#f2f4f6] rounded-lg transition-colors relative"
              title={t('dashboard.header.notifications', 'Notifications')}
              aria-label={t('dashboard.header.notifications', 'Notifications')}
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ba1a1a] rounded-full" />
            </button>

            <button
              type="button"
              className="p-2 text-[#494552] hover:text-[#28006d] hover:bg-[#f2f4f6] rounded-lg transition-colors hidden sm:inline-flex"
              title={t('dashboard.header.settings', 'Settings')}
              aria-label={t('dashboard.header.settings', 'Settings')}
            >
              <Settings size={18} />
            </button>

            <button
              type="button"
              className="p-2 text-[#494552] hover:text-[#28006d] hover:bg-[#f2f4f6] rounded-lg transition-colors hidden sm:inline-flex"
              title={t('dashboard.header.help', 'Help')}
              aria-label={t('dashboard.header.help', 'Help')}
            >
              <HelpCircle size={18} />
            </button>

            <div className="w-px h-6 bg-[#cbc4d4] hidden sm:block" />

            <div className="flex items-center gap-2.5 pl-1" role="button" tabIndex={0} aria-label="Admin Profile menu">
              <div className="w-8 h-8 rounded-full bg-[#28006d] text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0 overflow-hidden">
                <img
                  src={rostovaAvatar}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[13px] font-bold text-[#0b1c30] leading-none mb-0.5">Admin User</span>
                <span className="text-[11px] font-semibold text-[#00696b] leading-none">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Container */}
        <main className="staff-mapping-content-container" role="main">
          {/* Top Navigation & Return Bar */}
          <div className="staff-mapping-nav-bar">
            <div className="staff-mapping-header-titles">
              <nav aria-label="Breadcrumb" className="staff-mapping-breadcrumb">
                <button
                  type="button"
                  className="staff-mapping-breadcrumb-link"
                  onClick={() => handleNav('/admin/dashboard')}
                >
                  Admin
                </button>
                <span className="staff-mapping-breadcrumb-sep">/</span>
                <button
                  type="button"
                  className="staff-mapping-breadcrumb-link"
                  onClick={() => handleNav('/admin/facilities')}
                >
                  Facilities
                </button>
                <span className="staff-mapping-breadcrumb-sep">/</span>
                <button
                  type="button"
                  className="staff-mapping-breadcrumb-link facility-name"
                  onClick={() => handleNav(`/admin/facilities/${currentFacilityId}`)}
                >
                  {facilityName}
                </button>
                <span className="staff-mapping-breadcrumb-sep">/</span>
                <span className="staff-mapping-breadcrumb-current">
                  {t('facilities.staffMapping.breadcrumb', 'Staff & Governance Mapping')}
                </span>
              </nav>
              <h1 className="staff-mapping-page-title">
                {t('facilities.staffMapping.title', 'Staff Mapping & Governance Assignment')}
              </h1>
              <p className="staff-mapping-page-subtitle">
                {t(
                  'facilities.staffMapping.subtitle',
                  'Administrators can manage staff-to-facility associations, departmental clinical wings, and administrative governance assignments.'
                )}
              </p>
            </div>

            <button
              id="btn-return-facility-details"
              type="button"
              className="staff-mapping-btn-return"
              onClick={() => handleNav(`/admin/facilities/${currentFacilityId}`)}
            >
              <ArrowLeft size={16} />
              <span>{t('facilities.staffMapping.returnBtn', 'Return to Facility Details')}</span>
            </button>
          </div>

          {/* Facility Context Banner */}
          <section className="staff-mapping-hero-banner" aria-label="Facility Context Banner">
            <div className="staff-mapping-banner-left">
              <div className="staff-mapping-banner-icon">
                <Building2 size={28} />
              </div>
              <div className="staff-mapping-banner-text">
                <h2 className="staff-mapping-banner-title">{facilityName}</h2>
                <div className="staff-mapping-banner-badges">
                  <span className="staff-mapping-status-pill">
                    <span className="staff-mapping-status-dot" />
                    {t('facilities.staffMapping.banner.activeStatus', 'ACTIVE STATUS')}
                  </span>
                  <span className="staff-mapping-code-pill">#{facilityCode}</span>
                </div>
                <p className="staff-mapping-banner-desc">
                  {facility?.facilityType || 'Hospital Campus'} •{' '}
                  {facility?.streetAddress1 || 'Centralized cryptographic credentialing & role allocation hub.'}
                </p>
              </div>
            </div>

            <div className="staff-mapping-banner-ribbon">
              <div className="staff-mapping-ribbon-item">
                <span className="staff-mapping-ribbon-label">
                  {t('facilities.staffMapping.banner.assignedStaff', 'ASSIGNED STAFF')}
                </span>
                <div className="staff-mapping-ribbon-val-row">
                  <span className="staff-mapping-ribbon-val-num">
                    {facility?.medicalStaffCount || 420}
                  </span>
                  <span className="staff-mapping-ribbon-live-badge">
                    {t('facilities.staffMapping.banner.live', 'Live')}
                  </span>
                </div>
              </div>

              <div className="staff-mapping-ribbon-divider" />

              <div className="staff-mapping-ribbon-item">
                <span className="staff-mapping-ribbon-label">
                  {t('facilities.staffMapping.banner.currentAdmin', 'CURRENT ADMINISTRATOR')}
                </span>
                <div className="staff-mapping-ribbon-admin-val">
                  <ShieldCheck size={16} className="text-[#5af8fb]" />
                  <span>{facility?.initialAdmin?.split('—')[0] || currentAdmin.name}</span>
                </div>
              </div>
            </div>

            <div className="staff-mapping-banner-ambient-1" />
            <div className="staff-mapping-banner-ambient-2" />
          </section>

          {/* Workspace Tabs */}
          <div className="staff-mapping-tabs-bar" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'clinicalStaff'}
              className={`staff-mapping-tab-btn ${activeTab === 'clinicalStaff' ? 'active' : 'inactive'}`}
              onClick={() => setActiveTab('clinicalStaff')}
            >
              <Stethoscope size={16} />
              <span>{t('facilities.staffMapping.tabs.clinicalStaff', 'Map Clinical Staff (Active)')}</span>
              <span className="staff-mapping-tab-count-pill">
                {t('facilities.staffMapping.tabs.recordsCount', {
                  count: staffRoster.length,
                  defaultValue: `${staffRoster.length} Live Records`,
                })}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'adminAssign'}
              className={`staff-mapping-tab-btn ${activeTab === 'adminAssign' ? 'active' : 'inactive'}`}
              onClick={() => setActiveTab('adminAssign')}
            >
              <UserCheck size={16} />
              <span>{t('facilities.staffMapping.tabs.adminAssign', 'Assign Facility Administrator')}</span>
              <span className="staff-mapping-tab-dot-online" />
            </button>
          </div>

          {/* Main Split Layout Grid */}
          <div className="staff-mapping-grid">
            {/* LEFT COLUMN: Map Staff Interface (8 cols) */}
            <section className="staff-mapping-roster-card" aria-label="Staff Mapping Roster">
              {/* Filter and Search Bar */}
              <div className="staff-mapping-controls-header">
                <div className="staff-mapping-search-row">
                  <div className="staff-mapping-search-input-wrap">
                    <Search className="staff-mapping-search-icon" size={16} />
                    <input
                      type="text"
                      className="staff-mapping-search-input"
                      placeholder={t(
                        'facilities.staffMapping.filters.searchPlaceholder',
                        'Search nurses, technologists, navigators by name, employee ID, or role...'
                      )}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <span className="staff-mapping-count-pill">
                    <Users size={14} />
                    <span>
                      {t('facilities.staffMapping.filters.staffDisplayed', {
                        count: filteredStaff.length,
                        defaultValue: `${filteredStaff.length} Staff Displayed`,
                      })}
                    </span>
                  </span>
                </div>

                {/* Role Filter Chips */}
                <div className="staff-mapping-role-chips-row">
                  <span className="staff-mapping-role-label">
                    {t('facilities.staffMapping.filters.roleFilter', 'Role Filter:')}
                  </span>
                  {[
                    'All Roles',
                    'Circulating Nurse (RN)',
                    'Cath Lab Tech (RCIS)',
                    'Recovery RN (BSN)',
                    'Radiation Tech',
                    'Clinical Navigator',
                  ].map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={`staff-mapping-chip-btn ${selectedRoleFilter === role ? 'selected' : ''}`}
                      onClick={() => setSelectedRoleFilter(role)}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action & Audit Subbar */}
              <div className="staff-mapping-action-subbar">
                <button
                  type="button"
                  className="staff-mapping-btn-discard"
                  onClick={handleDiscardChanges}
                  disabled={!isDirty}
                >
                  <RotateCcw size={14} className="inline mr-1" />
                  <span>{t('facilities.staffMapping.actionSubbar.discard', 'Discard Changes')}</span>
                </button>

                <div className="staff-mapping-audit-notice">
                  <ShieldCheck size={15} className="text-[#006a60]" />
                  <span>
                    {t(
                      'facilities.staffMapping.actionSubbar.auditNotice',
                      'All mappings logged to Care ID audit trail #AUD-FAC-8891'
                    )}
                  </span>
                </div>

                <button
                  id="btn-confirm-all-mappings"
                  type="button"
                  className="staff-mapping-btn-confirm-all"
                  onClick={handleConfirmAllMappings}
                >
                  <span>
                    {t(
                      'facilities.staffMapping.actionSubbar.confirm',
                      'Confirm All Mappings & Return to Facility Details'
                    )}
                  </span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Staff Roster Table */}
              <div className="staff-mapping-table-wrap">
                <table className="staff-mapping-table">
                  <thead>
                    <tr>
                      <th scope="col">
                        {t('facilities.staffMapping.table.colIdentity', 'STAFF IDENTITY & ID')}
                      </th>
                      <th scope="col">
                        {t('facilities.staffMapping.table.colDesignation', 'CLINICAL DESIGNATION')}
                      </th>
                      <th scope="col">
                        {t('facilities.staffMapping.table.colSuite', 'ASSIGNED SUITE / WING')}
                      </th>
                      <th scope="col">
                        {t('facilities.staffMapping.table.colRoster', 'ROSTER STATE')}
                      </th>
                      <th scope="col" style={{ textAlign: 'right' }}>
                        {t('facilities.staffMapping.table.colActions', 'ACTIONS')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                          No staff found matching the selected filter or search terms.
                        </td>
                      </tr>
                    ) : (
                      filteredStaff.map((staff) => {
                        const isUnassigned = staff.departmentSuite === 'Currently Unassigned';
                        const isDual = staff.rosterState === 'Dual-Roster';

                        return (
                          <tr key={staff.id}>
                            {/* Staff Identity */}
                            <td>
                              <div className="staff-identity-cell">
                                <div
                                  className="staff-avatar-circle"
                                  style={{
                                    backgroundColor: staff.avatarBg || '#28006D',
                                    color: staff.avatarColor || '#ffffff',
                                  }}
                                >
                                  {staff.initials || 'ST'}
                                </div>
                                <div className="staff-identity-meta">
                                  <span className="staff-name-title">{staff.name}</span>
                                  <span className="staff-code-label">
                                    ID: {staff.staffCode || 'STF-0000'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Clinical Designation */}
                            <td>
                              <div className="staff-designation-cell">
                                {staff.roleCategory === 'Circulating Nurse (RN)' && (
                                  <Stethoscope size={15} className="staff-designation-icon" />
                                )}
                                {staff.roleCategory === 'Cath Lab Tech (RCIS)' && (
                                  <Activity size={15} className="staff-designation-icon" />
                                )}
                                {staff.roleCategory === 'Recovery RN (BSN)' && (
                                  <Zap size={15} className="staff-designation-icon" />
                                )}
                                {staff.roleCategory === 'Radiation Tech' && (
                                  <Radio size={15} className="staff-designation-icon" />
                                )}
                                {staff.roleCategory === 'Clinical Navigator' && (
                                  <FileCheck2 size={15} className="staff-designation-icon" />
                                )}
                                <span>{staff.roleDesignation}</span>
                              </div>
                            </td>

                            {/* Assigned Suite / Wing */}
                            <td>
                              <span
                                className={`staff-suite-pill ${
                                  isUnassigned
                                    ? 'unassigned-suite'
                                    : isDual
                                    ? 'dual-suite'
                                    : 'active-suite'
                                }`}
                              >
                                {staff.departmentSuite}
                              </span>
                            </td>

                            {/* Roster State */}
                            <td>
                              <span
                                className={`staff-roster-state-badge ${
                                  staff.rosterState === 'Active'
                                    ? 'active'
                                    : staff.rosterState === 'Dual-Roster'
                                    ? 'dual'
                                    : 'standby'
                                }`}
                              >
                                <span className="staff-roster-dot" />
                                <span>{staff.rosterState || 'Active'}</span>
                              </span>
                            </td>

                            {/* Actions */}
                            <td>
                              <div className="staff-row-actions">
                                {isUnassigned ? (
                                  <button
                                    type="button"
                                    className="staff-btn-map-action"
                                    onClick={() => openMapModal(staff)}
                                  >
                                    + {t('facilities.staffMapping.table.mapAction', 'Map to Wing')}
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="staff-btn-edit-action"
                                      onClick={() => openMapModal(staff)}
                                    >
                                      {t('facilities.staffMapping.table.reassignAction', 'Reassign')}
                                    </button>
                                    <button
                                      type="button"
                                      className="staff-btn-unassign-icon"
                                      onClick={() => openUnassignDialog(staff)}
                                      title={t('facilities.staffMapping.table.unassignAction', 'Unassign')}
                                      aria-label={`Unassign ${staff.name}`}
                                    >
                                      <X size={15} />
                                    </button>
                                  </>
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

              {/* Roster Footer Info Bar */}
              <div className="staff-mapping-footer-bar">
                <span>
                  {t('facilities.staffMapping.table.footer', {
                    count: filteredStaff.length,
                    total: facility?.medicalStaffCount || 420,
                    name: facilityName,
                    code: facilityCode,
                    defaultValue: `Showing ${filteredStaff.length} of ${
                      facility?.medicalStaffCount || 420
                    } personnel mapped to ${facilityName} #${facilityCode}`,
                  })}
                </span>
                <div className="staff-pagination-group">
                  <button type="button" className="staff-page-btn" disabled>
                    ‹
                  </button>
                  <span>
                    {t('facilities.staffMapping.table.page', {
                      page: 1,
                      totalPages: 84,
                      defaultValue: 'Page 1 of 84',
                    })}
                  </span>
                  <button type="button" className="staff-page-btn">
                    ›
                  </button>
                </div>
              </div>
            </section>

            {/* RIGHT COLUMN: Facility Administrator Assignment Panel (4 cols) */}
            <aside className="staff-mapping-admin-card" aria-label="Facility Administrator Assignment Panel">
              <div className="admin-panel-header">
                <div className="admin-panel-title-row">
                  <ShieldCheck size={20} className="admin-panel-title-icon" />
                  <h3 className="admin-panel-heading">
                    {t('facilities.staffMapping.adminPanel.title', 'Facility Administrator Assignment')}
                  </h3>
                </div>
                <p className="admin-panel-subtitle">
                  {t(
                    'facilities.staffMapping.adminPanel.subtitle',
                    'Assign a certified healthcare administrator (MHA/MBA) to oversee facility governance, clinical quotas, and cryptographic audit credentials.'
                  )}
                </p>
              </div>

              {/* Current Administrator Physical-Card Metaphor */}
              <div className="admin-designated-card">
                <div className="admin-card-badges-row">
                  <span className="admin-badge-active-head">
                    <span className="staff-roster-dot" style={{ backgroundColor: '#10b981' }} />
                    {t('facilities.staffMapping.adminPanel.activeHead', 'ACTIVE DESIGNATED HEAD')}
                  </span>
                  <span className="admin-badge-vault">
                    {t('facilities.staffMapping.adminPanel.vaultKey', 'RSA-2048 VAULT')}
                  </span>
                </div>

                <div className="admin-card-profile-row">
                  {currentAdmin.avatarUrl ? (
                    <img
                      src={currentAdmin.avatarUrl}
                      alt={currentAdmin.name}
                      className="admin-profile-photo"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="admin-profile-photo">{currentAdmin.initials}</div>
                  )}

                  <div className="admin-profile-info">
                    <span className="admin-profile-name">{currentAdmin.name}</span>
                    <span className="admin-profile-role">{currentAdmin.role}</span>
                    <span className="admin-profile-tenure">{currentAdmin.tenure}</span>
                  </div>
                </div>

                <div className="admin-card-token-strip">
                  <span className="admin-token-lbl">
                    {t('facilities.staffMapping.adminPanel.tokenLabel', 'CARE ID CRYPTOGRAPHIC TOKEN')}
                  </span>
                  <span className="admin-token-val">{currentAdmin.vaultToken}</span>
                </div>

                <ShieldCheck size={90} className="admin-card-watermark" />
              </div>

              {/* Form: Reassign Administrator Dropdown */}
              <div className="admin-select-group">
                <label htmlFor="select-admin-pool" className="admin-select-lbl">
                  {t('facilities.staffMapping.adminPanel.selectAdmin', 'Select Verified Admin User from Pool')}
                </label>
                <select
                  id="select-admin-pool"
                  className="admin-select-dropdown"
                  value={selectedAdminId}
                  onChange={(e) => setSelectedAdminId(e.target.value)}
                >
                  {ADMIN_POOL_OPTIONS.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name} ({admin.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Delegation Scope Box */}
              <div className="admin-delegation-card">
                <div className="admin-delegation-header">
                  <h4 className="admin-delegation-title">
                    {t('facilities.staffMapping.adminPanel.delegationScope', 'Delegation Scope')}
                  </h4>
                  <span className="admin-tier-badge">
                    {t('facilities.staffMapping.adminPanel.tier1Authority', 'TIER-1 AUTHORITY')}
                  </span>
                </div>
                <ul className="admin-scope-list">
                  <li className="admin-scope-item">
                    <Check size={14} className="admin-check-icon" />
                    <span>
                      {t(
                        'facilities.staffMapping.adminPanel.scope1',
                        'Facility configuration & hardware vault keys'
                      )}
                    </span>
                  </li>
                  <li className="admin-scope-item">
                    <Check size={14} className="admin-check-icon" />
                    <span>
                      {t(
                        'facilities.staffMapping.adminPanel.scope2',
                        'Doctor credentialing & clinical staff quotas'
                      )}
                    </span>
                  </li>
                  <li className="admin-scope-item">
                    <Check size={14} className="admin-check-icon" />
                    <span>
                      {t(
                        'facilities.staffMapping.adminPanel.scope3',
                        'Statutory audit trails & transfer protocols'
                      )}
                    </span>
                  </li>
                </ul>
              </div>

              {/* Security Cryptographic Notice */}
              <div className="admin-security-notice">
                <Lock size={18} className="admin-security-icon" />
                <p className="admin-security-text">
                  <strong>{t('facilities.staffMapping.adminPanel.securityNoticeTitle', 'Security Notice:')}</strong>{' '}
                  {t(
                    'facilities.staffMapping.adminPanel.securityNoticeDesc',
                    "Assigning a new Facility Admin will transfer primary operational alerts and cryptographic approval gates. All pending transfers will re-verify under the recipient's institutional key."
                  )}
                </p>
              </div>

              {/* Save Admin CTA */}
              <button
                id="btn-save-admin-assignment"
                type="button"
                className="admin-btn-save"
                onClick={handleSaveAdminAssignment}
                disabled={assignAdminMutation.isPending}
              >
                <Save size={16} />
                <span>
                  {assignAdminMutation.isPending
                    ? t('facilities.staffMapping.adminPanel.saving', 'Saving...')
                    : t('facilities.staffMapping.adminPanel.saveAdminBtn', 'Save Facility Admin Assignment')}
                </span>
              </button>

              {/* Pavilion Key Contacts Secondary Context */}
              <div className="admin-key-contacts-card">
                <div className="contacts-card-header">
                  <h4 className="contacts-card-title">
                    {t('facilities.staffMapping.adminPanel.keyContactsTitle', 'Pavilion Key Contacts')}
                  </h4>
                  <button
                    type="button"
                    className="contacts-dir-link"
                    onClick={() => handleNav('/admin/doctors')}
                  >
                    {t('facilities.staffMapping.adminPanel.directoryLink', 'Directory')} →
                  </button>
                </div>

                <div className="contacts-item">
                  <img
                    src={doctorChenImg}
                    alt="Dr. Jonathan Mercer"
                    className="contacts-photo"
                  />
                  <div className="contacts-meta">
                    <span className="contacts-name">Dr. Jonathan Mercer, MD</span>
                    <span className="contacts-role">Chief of Interventional Cardiology</span>
                  </div>
                </div>

                <div className="contacts-item">
                  <img
                    src={doctorJenkinsImg}
                    alt="Nia Thorne, PharmD"
                    className="contacts-photo"
                  />
                  <div className="contacts-meta">
                    <span className="contacts-name">Nia Thorne, PharmD</span>
                    <span className="contacts-role">Director of Inpatient Pharmacotherapy</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* Map / Reassign Staff Modal Dialog */}
      {isMapModalOpen && editingStaff && (
        <div className="staff-mapping-modal-backdrop" role="dialog" aria-modal="true">
          <div className="staff-mapping-modal-dialog">
            <div className="staff-mapping-modal-header">
              <h3 className="staff-mapping-modal-title">
                {editingStaff.departmentSuite === 'Currently Unassigned'
                  ? t('facilities.staffMapping.modals.mapStaffTitle', 'Map Staff Member to Wing')
                  : t('facilities.staffMapping.modals.reassignStaffTitle', 'Reassign Clinical Suite & Wing')}
              </h3>
              <button
                type="button"
                className="staff-mapping-modal-close-btn"
                onClick={closeMapModal}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSaveStaffMapping)}>
              <div className="staff-mapping-modal-body">
                <div className="modal-field-group">
                  <label className="modal-field-label">
                    {t('facilities.staffMapping.modals.staffMember', 'Staff Member')}
                  </label>
                  <div className="staff-identity-cell" style={{ padding: '8px 0' }}>
                    <div
                      className="staff-avatar-circle"
                      style={{
                        backgroundColor: editingStaff.avatarBg || '#28006D',
                        color: editingStaff.avatarColor || '#ffffff',
                      }}
                    >
                      {editingStaff.initials || 'ST'}
                    </div>
                    <div className="staff-identity-meta">
                      <span className="staff-name-title">{editingStaff.name}</span>
                      <span className="staff-code-label">
                        {editingStaff.staffCode} • {editingStaff.roleDesignation}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="modal-field-group">
                  <label htmlFor="input-suite-wing" className="modal-field-label">
                    {t('facilities.staffMapping.modals.suiteWing', 'Assigned Suite / Wing')}
                  </label>
                  <select
                    id="input-suite-wing"
                    className="modal-field-select"
                    {...register('departmentSuite')}
                  >
                    {SUITE_OPTIONS.map((suite) => (
                      <option key={suite} value={suite}>
                        {suite}
                      </option>
                    ))}
                  </select>
                  {errors.departmentSuite && (
                    <span className="text-xs text-red-600 mt-1">{errors.departmentSuite.message}</span>
                  )}
                </div>

                <div className="modal-field-group">
                  <label htmlFor="input-shift-roster" className="modal-field-label">
                    {t('facilities.staffMapping.modals.shiftRoster', 'Shift Roster')}
                  </label>
                  <select
                    id="input-shift-roster"
                    className="modal-field-select"
                    {...register('shiftRoster')}
                  >
                    {SHIFT_OPTIONS.map((shift) => (
                      <option key={shift} value={shift}>
                        {shift}
                      </option>
                    ))}
                  </select>
                  {errors.shiftRoster && (
                    <span className="text-xs text-red-600 mt-1">{errors.shiftRoster.message}</span>
                  )}
                </div>

                <div className="modal-field-group">
                  <label htmlFor="input-roster-state" className="modal-field-label">
                    {t('facilities.staffMapping.modals.rosterState', 'Roster State')}
                  </label>
                  <select
                    id="input-roster-state"
                    className="modal-field-select"
                    {...register('rosterState')}
                  >
                    <option value="Active">Active</option>
                    <option value="Standby Pool">Standby Pool</option>
                    <option value="Dual-Roster">Dual-Roster</option>
                  </select>
                  {errors.rosterState && (
                    <span className="text-xs text-red-600 mt-1">{errors.rosterState.message}</span>
                  )}
                </div>
              </div>

              <div className="staff-mapping-modal-footer">
                <button type="button" className="modal-btn-cancel" onClick={closeMapModal}>
                  {t('facilities.staffMapping.modals.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="modal-btn-primary"
                  disabled={isSubmitting}
                >
                  {t('facilities.staffMapping.modals.save', 'Save Assignment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unassign Confirmation Dialog */}
      {isUnassignDialogOpen && unassigningStaff && (
        <div className="staff-mapping-modal-backdrop" role="dialog" aria-modal="true">
          <div className="staff-mapping-modal-dialog">
            <div className="staff-mapping-modal-header">
              <h3 className="staff-mapping-modal-title text-red-700 flex items-center gap-2">
                <ShieldAlert size={18} />
                <span>
                  {t('facilities.staffMapping.modals.unassignConfirmTitle', 'Move Staff to Standby Pool?')}
                </span>
              </h3>
              <button
                type="button"
                className="staff-mapping-modal-close-btn"
                onClick={() => setIsUnassignDialogOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="staff-mapping-modal-body">
              <p className="text-sm text-slate-700 leading-relaxed">
                {t('facilities.staffMapping.modals.unassignConfirmDesc', {
                  name: unassigningStaff.name,
                  suite: unassigningStaff.departmentSuite,
                  defaultValue: `Are you sure you want to remove ${unassigningStaff.name} from ${unassigningStaff.departmentSuite}? They will be marked as Standby Pool and can be reassigned later.`,
                })}
              </p>
            </div>

            <div className="staff-mapping-modal-footer">
              <button
                type="button"
                className="modal-btn-cancel"
                onClick={() => setIsUnassignDialogOpen(false)}
              >
                {t('facilities.staffMapping.modals.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                className="modal-btn-danger"
                onClick={confirmUnassign}
              >
                {t('facilities.staffMapping.modals.confirmUnassign', 'Unassign to Standby Pool')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <aside className="staff-mapping-toast" role="alert">
          <ShieldCheck size={18} className="text-[#34d399]" />
          <span>{toastMessage}</span>
        </aside>
      )}
    </div>
  );
};

export default AdminStaffMapping;
