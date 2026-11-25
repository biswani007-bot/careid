import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Search,
  Bell,
  Settings,
  HelpCircle,
  Menu,
  Check,
  CheckCircle2,
  Building2,
  Palette,
  ShieldCheck,
  UserCheck,
  Database,
  FileText,
  Lock,
  History,
  Plus,
  X,
  Shield,
  CreditCard,
  Scan,
  Sliders,
  ChevronRight,
  Loader2
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import {
  getRbacRoles,
  getPermissionMatrix,
  getSystemSettings,
  batchUpsertSystemSettings
} from '../../services/systemSettingsService';
import './AdminSystemSettingsRoles.css';

// Permission Matrix Scope Schema
export interface PermissionScope {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

export type PermissionKey = keyof PermissionScope;

export interface ModulePermissionRow {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const MODULE_ROWS: ModulePermissionRow[] = [
  { id: 'patientRecords', label: 'Patient Health Records', icon: FileText },
  { id: 'doctorPrivileges', label: 'Doctor Privileges & Mapping', icon: UserCheck },
  { id: 'facilityConfig', label: 'Facility Configuration & Governance', icon: Building2 },
  { id: 'ocrVerification', label: 'OCR Verification & Correction', icon: Scan },
  { id: 'treatmentFinancing', label: 'Treatment Offers & Financing', icon: CreditCard },
  { id: 'systemConfig', label: 'System Configurations', icon: Sliders },
  { id: 'auditLogs', label: 'Immutable Audit Governance Logs', icon: Database }
];

export const PERMISSION_COLUMNS: { key: PermissionKey; label: string }[] = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'approve', label: 'Approve' },
  { key: 'export', label: 'Export' }
];

// Default Matrix Presets
export const DEFAULT_ROLE_MATRICES: Record<string, Record<string, PermissionScope>> = {
  'Super Admin': {
    patientRecords: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    doctorPrivileges: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
    facilityConfig: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    ocrVerification: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    treatmentFinancing: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    systemConfig: { view: true, create: true, edit: true, delete: false, approve: false, export: true },
    auditLogs: { view: true, create: false, edit: false, delete: false, approve: false, export: true }
  },
  'Facility Admin': {
    patientRecords: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
    doctorPrivileges: { view: true, create: true, edit: true, delete: false, approve: false, export: true },
    facilityConfig: { view: true, create: false, edit: true, delete: false, approve: false, export: false },
    ocrVerification: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
    treatmentFinancing: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
    systemConfig: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
    auditLogs: { view: true, create: false, edit: false, delete: false, approve: false, export: true }
  },
  'Attending Doctor': {
    patientRecords: { view: true, create: true, edit: true, delete: false, approve: true, export: false },
    doctorPrivileges: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
    facilityConfig: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    ocrVerification: { view: true, create: false, edit: true, delete: false, approve: true, export: false },
    treatmentFinancing: { view: true, create: true, edit: false, delete: false, approve: false, export: false },
    systemConfig: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    auditLogs: { view: false, create: false, edit: false, delete: false, approve: false, export: false }
  },
  'Clinical Staff / Nurse': {
    patientRecords: { view: true, create: true, edit: true, delete: false, approve: false, export: false },
    doctorPrivileges: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
    facilityConfig: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    ocrVerification: { view: true, create: true, edit: false, delete: false, approve: false, export: false },
    treatmentFinancing: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    systemConfig: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    auditLogs: { view: false, create: false, edit: false, delete: false, approve: false, export: false }
  },
  'OCR Reviewer': {
    patientRecords: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
    doctorPrivileges: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    facilityConfig: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    ocrVerification: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
    treatmentFinancing: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    systemConfig: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    auditLogs: { view: false, create: false, edit: false, delete: false, approve: false, export: false }
  },
  'Support Staff': {
    patientRecords: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
    doctorPrivileges: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
    facilityConfig: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
    ocrVerification: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    treatmentFinancing: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    systemConfig: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    auditLogs: { view: false, create: false, edit: false, delete: false, approve: false, export: false }
  }
};

const rolesSettingsFormSchema = z.object({
  emailPassword: z.boolean(),
  smsOtp: z.boolean(),
  biometric: z.boolean(),
  mfaRequirement: z.enum([
    'Always Require MFA',
    'Risk-Based Adaptive MFA',
    'Grace Period Active (14 Days)'
  ]),
  inactivityTimeout: z.enum(['15 Minutes', '30 Minutes', '60 Minutes', '120 Minutes']),
  forcePasswordReset90Days: z.boolean()
});

type RolesSettingsFormValues = z.infer<typeof rolesSettingsFormSchema>;

const DEFAULT_AUTH_FORM_VALUES: RolesSettingsFormValues = {
  emailPassword: true,
  smsOtp: true,
  biometric: true,
  mfaRequirement: 'Always Require MFA',
  inactivityTimeout: '15 Minutes',
  forcePasswordReset90Days: true
};

interface AdminSystemSettingsRolesProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminSystemSettingsRoles: React.FC<AdminSystemSettingsRolesProps> = ({
  onNavigate,
  onLogout
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  // Role selection & matrix state
  const [rolesList, setRolesList] = useState<string[]>([
    'SUPER_ADMIN',
    'ADMIN',
    'DOCTOR',
    'PATIENT',
    'FACILITY_ADMIN',
    'STAFF',
    'FAMILY_MEMBER'
  ]);
  const [activeRole, setActiveRole] = useState<string>('SUPER_ADMIN');
  const [roleMatrices, setRoleMatrices] = useState<Record<string, Record<string, PermissionScope>>>(
    JSON.parse(JSON.stringify(DEFAULT_ROLE_MATRICES))
  );

  // Custom role dialog state
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [customRoleName, setCustomRoleName] = useState('');
  const [customRoleDesc, setCustomRoleDesc] = useState('');
  const [customRoleTemplate, setCustomRoleTemplate] = useState('FACILITY_ADMIN');

  // React Hook Form for Authentication & Session Protocols
  const {
    control,
    handleSubmit,
    reset
  } = useForm<RolesSettingsFormValues>({
    resolver: zodResolver(rolesSettingsFormSchema),
    defaultValues: DEFAULT_AUTH_FORM_VALUES,
    mode: 'onBlur'
  });

  // Load real RBAC roles, permission matrix, and role settings from live backend
  useEffect(() => {
    let isMounted = true;
    async function loadRoles() {
      try {
        const [roles, , settings] = await Promise.all([
          getRbacRoles(),
          getPermissionMatrix(),
          getSystemSettings('ROLES')
        ]);

        if (!isMounted) return;

        if (roles && roles.length > 0) {
          const roleNames = roles.map((r) => r.name);
          setRolesList(roleNames);
          if (!roleNames.includes(activeRole)) {
            setActiveRole(roleNames[0]);
          }
        }

        const map: Record<string, string> = {};
        settings.forEach((s) => {
          map[s.key] = s.value;
        });

        if (map['ROLE_MATRICES']) {
          try {
            const savedMatrices = JSON.parse(map['ROLE_MATRICES']);
            setRoleMatrices((prev) => ({ ...prev, ...savedMatrices }));
          } catch {
            // Keep current
          }
        }
      } catch (err: any) {
        console.error('Failed to load roles from backend:', err);
      }
    }
    loadRoles();
    return () => {
      isMounted = false;
    };
  }, []);

  // Dismiss notification toast after 4s
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  const handleTabClick = (tabKey: 'general' | 'branding' | 'security' | 'roles' | 'ocr' | 'integrations' | 'announcements') => {
    if (tabKey === 'general') {
      handleNav('/admin/settings/general');
    } else if (tabKey === 'branding') {
      handleNav('/admin/settings/branding');
    } else if (tabKey === 'security') {
      handleNav('/admin/settings/security');
    } else if (tabKey === 'roles') {
      // current tab
    } else if (tabKey === 'ocr') {
      handleNav('/admin/settings/ocr');
    } else if (tabKey === 'integrations') {
      handleNav('/admin/settings/integrations');
    } else if (tabKey === 'announcements') {
      handleNav('/admin/settings/announcements');
    }
  };

  // Toggle permission cell
  const handleTogglePermission = (moduleId: string, scopeKey: PermissionKey) => {
    setRoleMatrices((prev) => {
      const currentRoleMatrix = prev[activeRole] || {};
      const currentModuleScope = currentRoleMatrix[moduleId] || {
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        export: false
      };

      const updated = {
        ...prev,
        [activeRole]: {
          ...currentRoleMatrix,
          [moduleId]: {
            ...currentModuleScope,
            [scopeKey]: !currentModuleScope[scopeKey]
          }
        }
      };
      return updated;
    });
  };

  // Create custom role
  const handleCreateCustomRole = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customRoleName.trim();
    if (!trimmed) {
      setNotification({
        type: 'info',
        message: 'Please provide a valid Role Name.'
      });
      return;
    }

    if (rolesList.includes(trimmed)) {
      setNotification({
        type: 'info',
        message: `Role "${trimmed}" already exists.`
      });
      return;
    }

    // Clone base template matrix or use default
    const templateMatrix = roleMatrices[customRoleTemplate] || DEFAULT_ROLE_MATRICES['Facility Admin'];
    const clonedMatrix = JSON.parse(JSON.stringify(templateMatrix));

    setRolesList((prev) => [...prev, trimmed]);
    setRoleMatrices((prev) => ({
      ...prev,
      [trimmed]: clonedMatrix
    }));
    setActiveRole(trimmed);
    setIsAddRoleModalOpen(false);
    setCustomRoleName('');
    setCustomRoleDesc('');

    setNotification({
      type: 'success',
      message: `Custom role "${trimmed}" created based on ${customRoleTemplate} template.`
    });
  };

  // Reset / Cancel
  const handleCancel = () => {
    setRoleMatrices(JSON.parse(JSON.stringify(DEFAULT_ROLE_MATRICES)));
    reset(DEFAULT_AUTH_FORM_VALUES);
    setNotification({
      type: 'info',
      message: 'Role permissions and session protocols have been reset to defaults.'
    });
  };

  // Save Permissions
  const onSaveSubmit = async (data: RolesSettingsFormValues) => {
    try {
      setIsSaving(true);
      // Save role matrix snapshot in live settings
      const result = await batchUpsertSystemSettings([
        {
          category: 'ROLES',
          key: 'ROLE_MATRICES',
          value: JSON.stringify(roleMatrices),
          valueType: 'JSON',
          description: 'Granular CRUD permission matrix across all platform roles'
        },
        {
          category: 'ROLES',
          key: 'AUTH_SESSION_PROTOCOLS',
          value: JSON.stringify(data),
          valueType: 'JSON',
          description: 'MFA requirement and password reset protocols for RBAC'
        }
      ]);

      if (result.success) {
        setNotification({
          type: 'success',
          message: `Role permissions and authentication protocols for "${activeRole}" persisted and active in live backend.`
        });
      } else {
        setNotification({
          type: 'info',
          message: `Saved with status: ${result.errors.join('; ')}`
        });
      }
    } catch (err: any) {
      console.error('Failed to save role permissions:', err);
      setNotification({
        type: 'error',
        message: `Failed to save role permissions: ${err?.message || 'Server error'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Current active role matrix
  const currentMatrix = roleMatrices[activeRole] || DEFAULT_ROLE_MATRICES['Super Admin'];

  return (
    <div className="roles-settings-page">
      {/* Mobile Drawer Overlay Backdrop */}
      <div
        className={`careid-drawer-backdrop ${isDrawerOpen ? 'drawer-open show' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Shared Admin Sidebar */}
      <AdminSidebar
        activeNav="settings"
        onNavigate={handleNav}
        onLogout={onLogout}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
      />

      <div className="roles-main-content">
        {/* 1. Header - TopNavBar (Shared Component) */}
        <header className="roles-top-navbar" aria-label="Top Navigation">
          <div className="roles-top-left">
            <button
              type="button"
              className="roles-mobile-menu-btn"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Navigation */}
            <nav className="roles-breadcrumb-nav" aria-label="Breadcrumb">
              <button
                type="button"
                className="roles-breadcrumb-item"
                onClick={() => handleNav('/admin/dashboard')}
              >
                Admin Portal
              </button>
              <span className="roles-breadcrumb-sep">/</span>
              <button
                type="button"
                className="roles-breadcrumb-item"
                onClick={() => handleNav('/admin/settings/general')}
              >
                System Settings
              </button>
              <span className="roles-breadcrumb-sep">/</span>
              <span className="roles-breadcrumb-item active" aria-current="page">
                Roles &amp; Permissions
              </span>
            </nav>
          </div>

          <div className="roles-top-right">
            <div className="roles-search-box">
              <Search className="roles-search-icon" />
              <input
                type="text"
                placeholder="Search facilities, patients, logs..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="roles-search-input"
                aria-label="Global search input"
              />
            </div>

            <button
              type="button"
              className="roles-icon-btn"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="roles-notif-badge" />
            </button>

            <button
              type="button"
              className="roles-icon-btn"
              title="Settings"
              aria-label="Settings"
              onClick={() => handleNav('/admin/settings/general')}
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              type="button"
              className="roles-icon-btn"
              title="Help Center"
              aria-label="Help Center"
              onClick={() => handleNav('/admin/support')}
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Admin User Profile */}
            <div
              className="roles-user-profile-btn cursor-pointer"
              onClick={() => handleNav('/admin/profile')}
              title="My Profile & Information"
              role="button"
              tabIndex={0}
            >
              <AdminProfileAvatar size={32} />
              <div className="roles-user-info">
                <span className="roles-user-name">Dr. Evelyn Reed</span>
                <span className="roles-user-role">Super Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {/* 2. Main Page Content */}
        <main className="roles-page-body">
          {/* Card 1: Settings Header & Persistent Sub-Nav Tabs */}
          <section className="roles-header-card" aria-label="System Settings Header">
            <div className="roles-header-top-row">
              <div className="roles-header-title-block">
                <h1>System Settings &amp; Governance</h1>
                <p>
                  Manage global security policies, granular role matrices, tenant configurations, and integration hooks.
                </p>
              </div>
              <div className="roles-header-actions flex items-center gap-3 flex-wrap">
                <div className="roles-compliance-badge">
                  <span className="roles-compliance-dot" />
                  <span>HIPAA &amp; SOC2 Type II Compliant</span>
                </div>
              </div>
            </div>

            {/* Persistent 6-Tab Navigation Bar */}
            <div className="roles-subnav-container" aria-label="Settings Tabs">
              <div className="roles-subnav-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="roles-subnav-tab"
                  onClick={() => handleTabClick('general')}
                >
                  <Building2 className="w-4 h-4" />
                  <span>General &amp; Organization</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="roles-subnav-tab"
                  onClick={() => handleTabClick('branding')}
                >
                  <Palette className="w-4 h-4" />
                  <span>Branding &amp; Identity</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="roles-subnav-tab"
                  onClick={() => handleTabClick('security')}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Security Policies</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={true}
                  className="roles-subnav-tab active"
                  onClick={() => handleTabClick('roles')}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Roles &amp; Permissions</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="roles-subnav-tab"
                  onClick={() => handleTabClick('ocr')}
                >
                  <FileText className="w-4 h-4" />
                  <span>OCR &amp; Notifications</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="roles-subnav-tab"
                  onClick={() => handleTabClick('integrations')}
                >
                  <Database className="w-4 h-4" />
                  <span>Integrations &amp; Backup</span>
                </button>
              </div>
            </div>
          </section>

          {/* Card 2: Section - Roles & Permissions RBAC Panel */}
          <section className="roles-section-card" aria-label="Roles & Permissions RBAC Panel">
            {/* Header + Actions */}
            <div className="roles-section-header">
              <div className="roles-section-title-wrap">
                <div className="roles-title-with-pill">
                  <h2>Roles &amp; Permissions (RBAC)</h2>
                  <span className="roles-active-role-pill">{activeRole} Active</span>
                </div>
                <p className="roles-section-subtitle">
                  Define access tiers, granular privilege matrices, and delegation boundaries across administrative, clinical, and support personnel.
                </p>
              </div>

              <div className="roles-section-actions">
                <button
                  type="button"
                  className="roles-btn-audit"
                  onClick={() => handleNav('/admin/referrals/audit')}
                  title="View Access Audit History"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Audit History</span>
                </button>
                <button
                  type="button"
                  className="roles-btn-add-role"
                  onClick={() => setIsAddRoleModalOpen(true)}
                  title="Create Custom Role Tier"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Role</span>
                </button>
              </div>
            </div>

            {/* Role Selection Pills */}
            <div className="roles-pill-bar" role="tablist" aria-label="Select Role Tier">
              {rolesList.map((role) => {
                const isActive = activeRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`roles-role-pill ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveRole(role)}
                  >
                    {role === 'Super Admin' && <Shield className="w-3.5 h-3.5" />}
                    <span>{role}</span>
                  </button>
                );
              })}
            </div>

            {/* Permission Matrix Table */}
            <div className="roles-matrix-container">
              <div className="roles-matrix-table-wrap">
                <table className="roles-matrix-table" aria-label="Permissions Matrix">
                  <thead>
                    <tr>
                      <th className="col-scope">Module / Scope</th>
                      {PERMISSION_COLUMNS.map((col) => (
                        <th key={col.key} className="col-center">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MODULE_ROWS.map((moduleRow) => {
                      const IconComponent = moduleRow.icon;
                      const moduleScope = currentMatrix[moduleRow.id] || {
                        view: false,
                        create: false,
                        edit: false,
                        delete: false,
                        approve: false,
                        export: false
                      };

                      return (
                        <tr key={moduleRow.id}>
                          <td>
                            <div className="roles-scope-cell">
                              <div className="roles-scope-icon-wrap">
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <span className="roles-scope-label">{moduleRow.label}</span>
                            </div>
                          </td>
                          {PERMISSION_COLUMNS.map((col) => {
                            const isChecked = !!moduleScope[col.key];
                            return (
                              <td key={col.key} className="roles-checkbox-cell">
                                <button
                                  type="button"
                                  className={`roles-checkbox-btn ${isChecked ? 'checked' : ''}`}
                                  onClick={() => handleTogglePermission(moduleRow.id, col.key)}
                                  title={`${moduleRow.label} - ${col.label}: ${isChecked ? 'Allowed' : 'Denied'}`}
                                  aria-label={`${moduleRow.label} ${col.label}`}
                                >
                                  {isChecked && <Check className="w-3.5 h-3.5" />}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Card 3: Authentication & Session Protocols */}
          <form onSubmit={handleSubmit(onSaveSubmit)}>
            <section className="roles-auth-protocols-card" aria-label="Authentication & Session Protocols">
              <div className="roles-auth-protocols-header">
                <div className="roles-auth-protocols-title-wrap">
                  <h2>Authentication &amp; Session Protocols</h2>
                  <p>
                    Configure multi-factor thresholds, biometrics, and active session lifetimes for the {activeRole} role tier.
                  </p>
                </div>
                <div className="roles-2fa-badge">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Mandatory 2FA</span>
                </div>
              </div>

              {/* Two Column Grid */}
              <div className="roles-auth-grid">
                {/* Left Card: Standard Login Requirements */}
                <div className="roles-auth-subcard">
                  <div className="roles-auth-subcard-header">
                    <h3>Standard Login Requirements</h3>
                    <span className="roles-auth-tier-pill">{activeRole.toUpperCase()} TIER</span>
                  </div>

                  {/* Email & Password Switch */}
                  <div className="roles-switch-row">
                    <div className="roles-switch-info">
                      <span className="roles-switch-title">Email &amp; Password</span>
                      <span className="roles-switch-desc">
                        SSO via Okta / Azure AD or Enterprise Vault password
                      </span>
                    </div>
                    <Controller
                      name="emailPassword"
                      control={control}
                      render={({ field }) => (
                        <button
                          type="button"
                          className={`roles-toggle-switch ${field.value ? 'checked' : ''}`}
                          onClick={() => field.onChange(!field.value)}
                          aria-label="Email and Password Switch"
                        >
                          <span className="roles-toggle-thumb" />
                        </button>
                      )}
                    />
                  </div>

                  {/* Mobile SMS OTP Switch */}
                  <div className="roles-switch-row">
                    <div className="roles-switch-info">
                      <span className="roles-switch-title">Mobile SMS OTP</span>
                      <span className="roles-switch-desc">
                        Hardware key / SMS secondary one-time verification
                      </span>
                    </div>
                    <Controller
                      name="smsOtp"
                      control={control}
                      render={({ field }) => (
                        <button
                          type="button"
                          className={`roles-toggle-switch ${field.value ? 'checked' : ''}`}
                          onClick={() => field.onChange(!field.value)}
                          aria-label="Mobile SMS OTP Switch"
                        >
                          <span className="roles-toggle-thumb" />
                        </button>
                      )}
                    />
                  </div>

                  {/* Biometric Switch */}
                  <div className="roles-switch-row">
                    <div className="roles-switch-info">
                      <span className="roles-switch-title">Biometric (Mobile App)</span>
                      <span className="roles-switch-desc">
                        FIDO2 WebAuthn / FaceID / TouchID biometric token
                      </span>
                    </div>
                    <Controller
                      name="biometric"
                      control={control}
                      render={({ field }) => (
                        <button
                          type="button"
                          className={`roles-toggle-switch ${field.value ? 'checked' : ''}`}
                          onClick={() => field.onChange(!field.value)}
                          aria-label="Biometric Switch"
                        >
                          <span className="roles-toggle-thumb" />
                        </button>
                      )}
                    />
                  </div>
                </div>

                {/* Right Card: Flow Constraints & Lifecycle */}
                <div className="roles-auth-subcard">
                  <div className="roles-auth-subcard-header">
                    <h3>Flow Constraints &amp; Lifecycle</h3>
                    <span className="roles-auth-tier-pill">POLICY RULES</span>
                  </div>

                  {/* Admin Login MFA Requirement */}
                  <div className="roles-form-group">
                    <label htmlFor="mfaRequirement" className="roles-form-label">
                      Admin Login MFA Requirement
                    </label>
                    <Controller
                      name="mfaRequirement"
                      control={control}
                      render={({ field }) => (
                        <select
                          id="mfaRequirement"
                          className="roles-select-control"
                          value={field.value}
                          onChange={field.onChange}
                        >
                          <option value="Always Require MFA">Always Require MFA</option>
                          <option value="Risk-Based Adaptive MFA">Risk-Based Adaptive MFA</option>
                          <option value="Grace Period Active (14 Days)">Grace Period Active (14 Days)</option>
                        </select>
                      )}
                    />
                  </div>

                  {/* Session Inactivity Timeout */}
                  <div className="roles-form-group">
                    <label htmlFor="inactivityTimeout" className="roles-form-label">
                      Session Inactivity Timeout
                    </label>
                    <Controller
                      name="inactivityTimeout"
                      control={control}
                      render={({ field }) => (
                        <select
                          id="inactivityTimeout"
                          className="roles-select-control"
                          value={field.value}
                          onChange={field.onChange}
                        >
                          <option value="15 Minutes">15 Minutes</option>
                          <option value="30 Minutes">30 Minutes</option>
                          <option value="60 Minutes">60 Minutes</option>
                          <option value="120 Minutes">120 Minutes</option>
                        </select>
                      )}
                    />
                  </div>

                  {/* Force Password Reset Checkbox */}
                  <Controller
                    name="forcePasswordReset90Days"
                    control={control}
                    render={({ field }) => (
                      <div
                        className="roles-checkbox-row"
                        onClick={() => field.onChange(!field.value)}
                        role="checkbox"
                        aria-checked={field.value}
                      >
                        <button
                          type="button"
                          className={`roles-checkbox-btn ${field.value ? 'checked' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            field.onChange(!field.value);
                          }}
                          aria-label="Force password reset every 90 days"
                        >
                          {field.value && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <span className="roles-checkbox-label">
                          Force password reset every 90 days (Admins)
                        </span>
                      </div>
                    )}
                  />
                </div>
              </div>

              {/* Actions Bar Footer */}
              <div className="roles-footer-bar">
                <div className="roles-footer-info">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Changes apply immediately across 24 enterprise facilities.</span>
                </div>

                <div className="roles-footer-buttons">
                  <button
                    type="button"
                    className="roles-btn-cancel"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="roles-btn-save"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>{isSaving ? 'Saving...' : 'Save Permissions'}</span>
                  </button>
                  <button
                    type="button"
                    className="roles-btn-proceed"
                    onClick={() => handleNav('/admin/settings/ocr')}
                  >
                    <span>Proceed to OCR &amp; Notifications</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>
          </form>
        </main>
      </div>

      {/* Add Custom Role Modal */}
      {isAddRoleModalOpen && (
        <div className="roles-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="custom-role-modal-title">
          <div className="roles-modal-card">
            <div className="roles-modal-header">
              <h3 id="custom-role-modal-title">Add Custom Role Tier</h3>
              <button
                type="button"
                className="roles-modal-close"
                onClick={() => setIsAddRoleModalOpen(false)}
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomRole} className="roles-modal-body">
              <div className="roles-form-group">
                <label className="roles-form-label">Role Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Compliance Auditor, Billing Analyst"
                  className="roles-modal-input"
                  value={customRoleName}
                  onChange={(e) => setCustomRoleName(e.target.value)}
                  required
                />
              </div>

              <div className="roles-form-group">
                <label className="roles-form-label">Description</label>
                <input
                  type="text"
                  placeholder="Describe role scope and operational delegation boundaries"
                  className="roles-modal-input"
                  value={customRoleDesc}
                  onChange={(e) => setCustomRoleDesc(e.target.value)}
                />
              </div>

              <div className="roles-form-group">
                <label className="roles-form-label">Base Role Template</label>
                <select
                  className="roles-select-control"
                  value={customRoleTemplate}
                  onChange={(e) => setCustomRoleTemplate(e.target.value)}
                >
                  <option value="Super Admin">Super Admin (Full Root Access)</option>
                  <option value="Facility Admin">Facility Admin (Facility Governance)</option>
                  <option value="Attending Doctor">Attending Doctor (Clinical Privileges)</option>
                  <option value="Clinical Staff / Nurse">Clinical Staff / Nurse (Care Support)</option>
                  <option value="OCR Reviewer">OCR Reviewer (Document Processing)</option>
                  <option value="Support Staff">Support Staff (Helpdesk Read)</option>
                </select>
              </div>

              <div className="roles-modal-footer">
                <button
                  type="button"
                  className="roles-btn-cancel"
                  onClick={() => setIsAddRoleModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="roles-btn-save">
                  Create Role Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div className="roles-toast-notification" role="status" aria-live="polite">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
};

export default AdminSystemSettingsRoles;
