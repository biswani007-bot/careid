import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Home,
  Search,
  Bell,
  Settings,
  HelpCircle,
  Menu,
  Check,
  CheckCircle2,
  AlertCircle,
  Building2,
  Palette,
  ShieldCheck,
  UserCheck,
  Database,
  FileText,
  Lock,
  Key,
  Clock,
  Smartphone,
  Fingerprint,
  HardDrive,
  Globe,
  Server,
  Network,
  RotateCcw,
  Save,
  ArrowRight,
  Plus,
  Trash2,
  X,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import {
  getSystemSettings,
  batchUpsertSystemSettings,
  getSecurityDashboard,
  type UpsertSettingPayload
} from '../../services/systemSettingsService';
import './AdminSystemSettingsSecurity.css';

// CIDR item schema
const subnetItemSchema = z.object({
  id: z.string(),
  cidr: z.string().min(1, 'CIDR block is required'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['on-premise', 'vpn', 'cloud']),
  active: z.boolean()
});

export type SubnetItem = z.infer<typeof subnetItemSchema>;

const securityPoliciesSchema = z.object({
  // Section 1: Authentication & 2FA
  mfaEnforced: z.boolean(),
  mfaSmsOtp: z.boolean(),
  mfaHardwareToken: z.boolean(),
  mfaBiometricPush: z.boolean(),
  onboardingGracePeriod: z.string(),

  // Section 2: Session & Timeout Controls
  inactivityTimeout: z.string(),
  concurrentSessionLimit: z.number().min(1).max(5),
  forceStepUpReauth: z.boolean(),

  // Section 3: Password Governance & Complexity
  passwordMinLength: z.string(),
  reqUppercase: z.boolean(),
  reqLowercase: z.boolean(),
  reqNumeric: z.boolean(),
  reqSpecialChar: z.boolean(),
  passwordRotationInterval: z.string(),
  preventPasswordReuseCount: z.number().min(1).max(24),
  maxFailedAttempts: z.number().min(1).max(20),
  lockoutDurationWindow: z.string(),

  // Section 4: Network & IP Access Restrictions
  ipWhitelistingActive: z.boolean(),
  whitelistedSubnets: z.array(subnetItemSchema)
});

export type SecurityPoliciesFormValues = z.infer<typeof securityPoliciesSchema>;

export const DEFAULT_SECURITY_POLICIES: SecurityPoliciesFormValues = {
  mfaEnforced: true,
  mfaSmsOtp: true,
  mfaHardwareToken: true,
  mfaBiometricPush: true,
  onboardingGracePeriod: '7 Days (Enterprise Recommended)',

  inactivityTimeout: '15 Minutes (Active Clinical Standard)',
  concurrentSessionLimit: 1,
  forceStepUpReauth: true,

  passwordMinLength: '12 Characters (Mandatory)',
  reqUppercase: true,
  reqLowercase: true,
  reqNumeric: true,
  reqSpecialChar: true,
  passwordRotationInterval: '90 Days (Enterprise Standard)',
  preventPasswordReuseCount: 5,
  maxFailedAttempts: 5,
  lockoutDurationWindow: '30 Minutes (Auto-Release)',

  ipWhitelistingActive: true,
  whitelistedSubnets: [
    {
      id: 'cidr-1',
      cidr: '192.168.10.0/24',
      description: 'Mount Sinai On-Premise (Cath Lab & Clinical Subnet)',
      type: 'on-premise',
      active: true
    },
    {
      id: 'cidr-2',
      cidr: '10.240.0.0/16',
      description: 'Care ID VPN Gateway (Staff Global Mesh)',
      type: 'vpn',
      active: true
    }
  ]
};

interface AdminSystemSettingsSecurityProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminSystemSettingsSecurity: React.FC<AdminSystemSettingsSecurityProps> = ({
  onNavigate,
  onLogout
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [backendCount, setBackendCount] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Modal for resetting defaults (Phase 5)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  // Modal for adding subnet
  const [isAddSubnetOpen, setIsAddSubnetOpen] = useState(false);
  const [newCidr, setNewCidr] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSubnetType, setNewSubnetType] = useState<'on-premise' | 'vpn' | 'cloud'>('on-premise');

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty }
  } = useForm<SecurityPoliciesFormValues>({
    resolver: zodResolver(securityPoliciesSchema),
    defaultValues: DEFAULT_SECURITY_POLICIES,
    mode: 'onBlur'
  });

  const formValues = watch();

  // Load existing security settings strictly from live backend API
  const loadSecurity = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [settings] = await Promise.all([
        getSystemSettings('SECURITY'),
        getSecurityDashboard().catch(() => null)
      ]);

      const map: Record<string, string> = {};
      settings.forEach((s) => {
        map[s.key] = s.value;
      });
      setBackendCount(settings.length);

      let loadedSubnets = DEFAULT_SECURITY_POLICIES.whitelistedSubnets;
      if (map['WHITELISTED_SUBNETS']) {
        try {
          loadedSubnets = JSON.parse(map['WHITELISTED_SUBNETS']);
        } catch {
          // Keep default subnets if parse fails
        }
      }

      reset({
        mfaEnforced: map['MFA_ENFORCED'] !== undefined ? map['MFA_ENFORCED'] === 'true' : DEFAULT_SECURITY_POLICIES.mfaEnforced,
        mfaSmsOtp: map['MFA_SMS_OTP'] !== undefined ? map['MFA_SMS_OTP'] === 'true' : DEFAULT_SECURITY_POLICIES.mfaSmsOtp,
        mfaHardwareToken: map['MFA_HARDWARE_TOKEN'] !== undefined ? map['MFA_HARDWARE_TOKEN'] === 'true' : DEFAULT_SECURITY_POLICIES.mfaHardwareToken,
        mfaBiometricPush: map['MFA_BIOMETRIC_PUSH'] !== undefined ? map['MFA_BIOMETRIC_PUSH'] === 'true' : DEFAULT_SECURITY_POLICIES.mfaBiometricPush,
        onboardingGracePeriod: map['ONBOARDING_GRACE_PERIOD'] || DEFAULT_SECURITY_POLICIES.onboardingGracePeriod,
        inactivityTimeout: map['SESSION_INACTIVITY_TIMEOUT'] || DEFAULT_SECURITY_POLICIES.inactivityTimeout,
        concurrentSessionLimit: map['MAX_CONCURRENT_SESSIONS'] ? parseInt(map['MAX_CONCURRENT_SESSIONS'], 10) : DEFAULT_SECURITY_POLICIES.concurrentSessionLimit,
        forceStepUpReauth: map['FORCE_STEP_UP_REAUTH'] !== undefined ? map['FORCE_STEP_UP_REAUTH'] === 'true' : DEFAULT_SECURITY_POLICIES.forceStepUpReauth,
        passwordMinLength: map['PASSWORD_MIN_LENGTH'] || DEFAULT_SECURITY_POLICIES.passwordMinLength,
        reqUppercase: map['REQ_UPPERCASE'] !== undefined ? map['REQ_UPPERCASE'] === 'true' : DEFAULT_SECURITY_POLICIES.reqUppercase,
        reqLowercase: map['REQ_LOWERCASE'] !== undefined ? map['REQ_LOWERCASE'] === 'true' : DEFAULT_SECURITY_POLICIES.reqLowercase,
        reqNumeric: map['REQ_NUMERIC'] !== undefined ? map['REQ_NUMERIC'] === 'true' : DEFAULT_SECURITY_POLICIES.reqNumeric,
        reqSpecialChar: map['REQ_SPECIAL_CHAR'] !== undefined ? map['REQ_SPECIAL_CHAR'] === 'true' : DEFAULT_SECURITY_POLICIES.reqSpecialChar,
        passwordRotationInterval: map['PASSWORD_ROTATION_INTERVAL'] || DEFAULT_SECURITY_POLICIES.passwordRotationInterval,
        preventPasswordReuseCount: map['PREVENT_PASSWORD_REUSE_COUNT'] ? parseInt(map['PREVENT_PASSWORD_REUSE_COUNT'], 10) : DEFAULT_SECURITY_POLICIES.preventPasswordReuseCount,
        maxFailedAttempts: map['MAX_FAILED_ATTEMPTS'] ? parseInt(map['MAX_FAILED_ATTEMPTS'], 10) : DEFAULT_SECURITY_POLICIES.maxFailedAttempts,
        lockoutDurationWindow: map['LOCKOUT_DURATION_WINDOW'] || DEFAULT_SECURITY_POLICIES.lockoutDurationWindow,
        ipWhitelistingActive: map['IP_WHITELISTING_ACTIVE'] !== undefined ? map['IP_WHITELISTING_ACTIVE'] === 'true' : DEFAULT_SECURITY_POLICIES.ipWhitelistingActive,
        whitelistedSubnets: loadedSubnets
      });
    } catch (err: any) {
      console.error('Failed to load security settings from backend:', err);
      setLoadError(err?.message || 'Failed to connect to backend security settings API.');
    } finally {
      setIsLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    loadSecurity();
  }, [loadSecurity]);

  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
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
      // already on security
    } else if (tabKey === 'roles') {
      handleNav('/admin/settings/roles');
    } else if (tabKey === 'ocr') {
      handleNav('/admin/settings/ocr');
    } else if (tabKey === 'integrations') {
      handleNav('/admin/settings/integrations');
    } else if (tabKey === 'announcements') {
      handleNav('/admin/settings/announcements');
    }
  };

  // Phase 5: Reset Defaults button handling
  const handleResetDefaults = () => {
    setIsResetDialogOpen(true);
  };

  const handleConfirmApplyDefaults = () => {
    reset(DEFAULT_SECURITY_POLICIES);
    setIsResetDialogOpen(false);
    setNotification({
      type: 'info',
      message: 'Compliance default values populated in form. Click "Save Security Policies" to commit them to the live backend.'
    });
  };

  const handleDiscardUnsaved = async () => {
    setIsResetDialogOpen(false);
    await loadSecurity();
    setNotification({
      type: 'info',
      message: 'Form re-synchronized with live backend security settings.'
    });
  };

  const onSubmit = async (data: SecurityPoliciesFormValues) => {
    try {
      setIsSaving(true);
      const settingsPayload: UpsertSettingPayload[] = [
        {
          category: 'SECURITY',
          key: 'MFA_ENFORCED',
          value: String(data.mfaEnforced),
          valueType: 'BOOLEAN',
          description: 'Two-factor multi-factor authentication enforcement'
        },
        {
          category: 'SECURITY',
          key: 'MFA_SMS_OTP',
          value: String(data.mfaSmsOtp),
          valueType: 'BOOLEAN',
          description: 'Permit SMS OTP fallback'
        },
        {
          category: 'SECURITY',
          key: 'MFA_HARDWARE_TOKEN',
          value: String(data.mfaHardwareToken),
          valueType: 'BOOLEAN',
          description: 'Permit FIDO2 hardware tokens'
        },
        {
          category: 'SECURITY',
          key: 'MFA_BIOMETRIC_PUSH',
          value: String(data.mfaBiometricPush),
          valueType: 'BOOLEAN',
          description: 'Permit Biometric push verification'
        },
        {
          category: 'SECURITY',
          key: 'ONBOARDING_GRACE_PERIOD',
          value: data.onboardingGracePeriod,
          valueType: 'STRING',
          description: 'Grace period for new staff MFA onboarding'
        },
        {
          category: 'SECURITY',
          key: 'SESSION_INACTIVITY_TIMEOUT',
          value: data.inactivityTimeout,
          valueType: 'STRING',
          description: 'Automatic session termination timeout threshold'
        },
        {
          category: 'SECURITY',
          key: 'MAX_CONCURRENT_SESSIONS',
          value: String(data.concurrentSessionLimit),
          valueType: 'NUMBER',
          description: 'Maximum concurrent active user login sessions'
        },
        {
          category: 'SECURITY',
          key: 'FORCE_STEP_UP_REAUTH',
          value: String(data.forceStepUpReauth),
          valueType: 'BOOLEAN',
          description: 'Force re-authentication for elevated clinical operations'
        },
        {
          category: 'SECURITY',
          key: 'PASSWORD_MIN_LENGTH',
          value: data.passwordMinLength,
          valueType: 'STRING',
          description: 'Minimum characters for user security passwords'
        },
        {
          category: 'SECURITY',
          key: 'REQ_UPPERCASE',
          value: String(data.reqUppercase),
          valueType: 'BOOLEAN',
          description: 'Require uppercase letters in passwords'
        },
        {
          category: 'SECURITY',
          key: 'REQ_LOWERCASE',
          value: String(data.reqLowercase),
          valueType: 'BOOLEAN',
          description: 'Require lowercase letters in passwords'
        },
        {
          category: 'SECURITY',
          key: 'REQ_NUMERIC',
          value: String(data.reqNumeric),
          valueType: 'BOOLEAN',
          description: 'Require numeric digits in passwords'
        },
        {
          category: 'SECURITY',
          key: 'REQ_SPECIAL_CHAR',
          value: String(data.reqSpecialChar),
          valueType: 'BOOLEAN',
          description: 'Require special punctuation characters in passwords'
        },
        {
          category: 'SECURITY',
          key: 'PASSWORD_ROTATION_INTERVAL',
          value: data.passwordRotationInterval,
          valueType: 'STRING',
          description: 'Password expiration and mandatory rotation policy'
        },
        {
          category: 'SECURITY',
          key: 'PREVENT_PASSWORD_REUSE_COUNT',
          value: String(data.preventPasswordReuseCount),
          valueType: 'NUMBER',
          description: 'Number of historical passwords prevented from reuse'
        },
        {
          category: 'SECURITY',
          key: 'MAX_FAILED_ATTEMPTS',
          value: String(data.maxFailedAttempts),
          valueType: 'NUMBER',
          description: 'Maximum consecutive failed login attempts before lockout'
        },
        {
          category: 'SECURITY',
          key: 'LOCKOUT_DURATION_WINDOW',
          value: data.lockoutDurationWindow,
          valueType: 'STRING',
          description: 'Account lockout duration before auto-release'
        },
        {
          category: 'SECURITY',
          key: 'IP_WHITELISTING_ACTIVE',
          value: String(data.ipWhitelistingActive),
          valueType: 'BOOLEAN',
          description: 'Active firewall IP subnet enforcement flag'
        },
        {
          category: 'SECURITY',
          key: 'WHITELISTED_SUBNETS',
          value: JSON.stringify(data.whitelistedSubnets),
          valueType: 'JSON',
          description: 'Enterprise CIDR whitelisted subnets for clinical access'
        }
      ];

      const result = await batchUpsertSystemSettings(settingsPayload);

      if (result.success) {
        // Phase 4.7: Refetch settings after successful update
        const freshSettings = await getSystemSettings('SECURITY');
        setBackendCount(freshSettings.length);

        setNotification({
          type: 'success',
          message: `Enterprise security policies saved and verified in live backend (${freshSettings.length} policies synchronized).`
        });
      } else {
        setNotification({
          type: 'error',
          message: `Failed to update security policies: ${result.errors.join('; ')}`
        });
      }
    } catch (err: any) {
      console.error('Failed to save security policies:', err);
      setNotification({
        type: 'error',
        message: `Failed to persist security configuration: ${err?.message || 'Server error'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubnet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCidr.trim() || !newDescription.trim()) return;

    const currentSubnets = formValues.whitelistedSubnets || [];
    const newEntry: SubnetItem = {
      id: `cidr-${Date.now()}`,
      cidr: newCidr.trim(),
      description: newDescription.trim(),
      type: newSubnetType,
      active: true
    };

    setValue('whitelistedSubnets', [...currentSubnets, newEntry]);
    setNewCidr('');
    setNewDescription('');
    setIsAddSubnetOpen(false);
    setNotification({
      type: 'success',
      message: `Subnet ${newEntry.cidr} added to whitelisted gateway pool.`
    });
  };

  const handleRemoveSubnet = (id: string) => {
    const currentSubnets = formValues.whitelistedSubnets || [];
    setValue('whitelistedSubnets', currentSubnets.filter((s) => s.id !== id));
  };

  return (
    <div className="security-settings-wrapper">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
            notification.type === 'success'
              ? 'bg-[#006a60] text-white border-teal-600'
              : 'bg-[#28006d] text-white border-purple-600'
          }`}
          role="status"
          aria-live="polite"
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="font-medium">{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="ml-2 hover:opacity-80 p-0.5 rounded text-white"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Drawer Overlay Backdrop */}
      <div
        className={`careid-drawer-backdrop ${isDrawerOpen ? 'drawer-open show' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Primary Left Navigation Bar (Shared Component with System Settings Active) */}
      <AdminSidebar
        activeNav="settings"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
        ctaLabel="+ New Record"
        onCtaClick={() => handleNav('/admin/records/upload')}
      />

      {/* Main Content Area */}
      <div className="security-settings-main">
        {/* 1. Stationary Top Global Navigation Bar */}
        <header className="security-top-navbar" data-name="Header - TopNavBar">
          <div className="security-top-left">
            <button
              type="button"
              className="lg:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav className="security-breadcrumb" aria-label="Breadcrumb">
              <button
                type="button"
                className="security-breadcrumb-root"
                onClick={() => handleNav('/admin/dashboard')}
                title="Dashboard"
              >
                <Home className="w-3.5 h-3.5" />
              </button>
              <span className="security-breadcrumb-sep">/</span>
              <button
                type="button"
                className="security-breadcrumb-parent"
                onClick={() => handleNav('/admin/dashboard')}
              >
                Admin Portal
              </button>
              <span className="security-breadcrumb-sep">/</span>
              <button
                type="button"
                className="security-breadcrumb-parent"
                onClick={() => handleNav('/admin/settings/general')}
              >
                System Settings
              </button>
              <span className="security-breadcrumb-sep">/</span>
              <span className="security-breadcrumb-current">Security Policies</span>
            </nav>
          </div>

          <div className="security-top-right">
            <div className="security-global-search-container">
              <Search className="security-global-search-icon" />
              <input
                type="text"
                className="security-global-search-input"
                placeholder="Search facilities, patients, logs..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                aria-label="Global search input"
              />
            </div>

            <div className="security-top-actions">
              <button
                type="button"
                className="security-icon-btn"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="security-notif-dot" />
              </button>
              <button
                type="button"
                className="security-icon-btn"
                title="Settings"
                aria-label="Settings"
                onClick={() => handleNav('/admin/settings/general')}
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="security-icon-btn"
                title="Help Center"
                aria-label="Help Center"
                onClick={() => handleNav('/admin/support')}
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-[#cbc4d4] hidden sm:block mx-1" />
              <button
                type="button"
                className="flex items-center gap-2 cursor-pointer p-0 bg-transparent border-none header-avatar-btn"
                onClick={() => handleNav('/admin/profile')}
                aria-label="My Profile & Information"
                title="My Profile & Information"
              >
                <AdminProfileAvatar size={32} />
              </button>
            </div>
          </div>
        </header>

        {/* 2. Scrollable Main Canvas */}
        <div className="security-content-scroll">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="security-canvas-container"
            noValidate
          >
            {/* Header & Quick Actions */}
            <div className="security-header-banner">
              <div className="security-header-info">
                <div className="security-header-title-row">
                  <div className="security-header-icon-box">
                    <ShieldCheck className="w-7 h-7 text-[#28006d]" />
                  </div>
                  <h1 className="security-header-title">
                    Security Policies &amp; Access Enforcement
                  </h1>
                </div>
                <p className="security-header-desc">
                  Configure enterprise-wide authentication requirements, session timeouts,
                  multi-factor security, password governance, and IP access constraints.
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Backend Connected: {backendCount} policies active
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    GET /api/v1/admin/settings?category=SECURITY
                  </span>
                </div>
              </div>

              <div className="security-header-actions">
                {isDirty && (
                  <span className="hidden sm:inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-850 border border-amber-300">
                    Unsaved Edits
                  </span>
                )}
                <button
                  type="button"
                  className="security-btn-secondary"
                  onClick={handleResetDefaults}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset to Compliance Defaults</span>
                </button>
                <button
                  type="submit"
                  className="security-btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save Security Policies'}</span>
                </button>
              </div>
            </div>

            {/* Sub-Navigation Tabs Bar - Six Tabs */}
            <nav className="security-subnav-bar" aria-label="Settings Sub Navigation">
              <div className="security-subnav-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="security-subnav-tab"
                  onClick={() => handleTabClick('general')}
                >
                  <Building2 className="w-4 h-4" />
                  <span>General &amp; Organization</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="security-subnav-tab"
                  onClick={() => handleTabClick('branding')}
                >
                  <Palette className="w-4 h-4" />
                  <span>Branding &amp; Identity</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={true}
                  className="security-subnav-tab active"
                  onClick={() => handleTabClick('security')}
                  aria-current="page"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Security Policies</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="security-subnav-tab"
                  onClick={() => handleTabClick('roles')}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Roles &amp; Permissions</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="security-subnav-tab"
                  onClick={() => handleTabClick('ocr')}
                >
                  <FileText className="w-4 h-4" />
                  <span>OCR &amp; Notifications</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="security-subnav-tab"
                  onClick={() => handleTabClick('integrations')}
                >
                  <Database className="w-4 h-4" />
                  <span>Integrations &amp; Backup</span>
                </button>
              </div>
            </nav>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl shadow-sm border border-slate-200 my-6">
                <Loader2 className="w-10 h-10 text-[#28006d] animate-spin mb-4" />
                <h3 className="text-base font-semibold text-slate-800">Loading Live Security Policies</h3>
                <p className="text-xs text-slate-500 mt-1">Retrieving authoritative security configuration from backend API...</p>
              </div>
            ) : loadError ? (
              <div className="p-8 bg-red-50 rounded-xl border border-red-200 my-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-red-900">Unable to Load Security Settings</h3>
                <p className="text-xs text-red-700 mt-1 mb-4">{loadError}</p>
                <button
                  type="button"
                  onClick={() => loadSecurity()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-xs hover:bg-red-700 transition"
                >
                  Retry Connection
                </button>
              </div>
            ) : (
              <>

            {/* ==============================================================
                SECTION 1: Authentication & Two-Factor Authentication (2FA) Policy
                ============================================================== */}
            <section
              className="security-section-card"
              aria-labelledby="section-auth-heading"
            >
              <div className="security-section-header">
                <div className="security-section-title-row">
                  <div className="security-section-icon">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <h2 id="section-auth-heading" className="security-section-title">
                    Authentication &amp; Two-Factor Authentication (2FA) Policy
                  </h2>
                </div>
                <p className="security-section-desc">
                  Enforce strong secondary identity verification across administrative, clinical, and vendor tiers.
                </p>
              </div>

              {/* Mandatory MFA Toggle Banner */}
              <div className="security-banner-box">
                <div className="security-banner-left">
                  <div className="security-banner-icon-badge">
                    <Key className="w-5 h-5" />
                  </div>
                  <div className="security-banner-text-group">
                    <h3 className="security-banner-title">
                      Mandatory Multi-Factor Authentication (MFA)
                    </h3>
                    <p className="security-banner-subtitle">
                      Enforced for all Super Admins, Facility Admins, and staff handling PHI records.
                    </p>
                  </div>
                </div>

                <label className="security-toggle" aria-label="Toggle Mandatory MFA">
                  <Controller
                    name="mfaEnforced"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        name={field.name}
                        id={field.name}
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    )}
                  />
                  <div className="security-toggle-track">
                    <div className="security-toggle-thumb" />
                  </div>
                </label>
              </div>

              {/* Supported MFA Methods & Grace Period Grid */}
              <div className="security-mfa-grid">
                {/* Left Column: Supported MFA Methods */}
                <div className="security-column-group">
                  <span className="security-field-label">Supported MFA Methods</span>

                  {/* Method 1: SMS OTP */}
                  <Controller
                    name="mfaSmsOtp"
                    control={control}
                    render={({ field }) => (
                      <div
                        className={`security-method-card ${field.value ? 'checked' : ''}`}
                        onClick={() => field.onChange(!field.value)}
                        role="checkbox"
                        aria-checked={field.value}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            field.onChange(!field.value);
                          }
                        }}
                      >
                        <div className="security-method-left">
                          <div className="security-method-icon">
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <div className="security-method-info">
                            <span className="security-method-title">SMS OTP Verification</span>
                            <span className="security-method-desc">
                              One-time passcodes sent to verified carrier phone
                            </span>
                          </div>
                        </div>
                        <div className={`security-checkbox-box ${field.value ? 'checked' : ''}`}>
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    )}
                  />

                  {/* Method 2: Hardware Token */}
                  <Controller
                    name="mfaHardwareToken"
                    control={control}
                    render={({ field }) => (
                      <div
                        className={`security-method-card ${field.value ? 'checked' : ''}`}
                        onClick={() => field.onChange(!field.value)}
                        role="checkbox"
                        aria-checked={field.value}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            field.onChange(!field.value);
                          }
                        }}
                      >
                        <div className="security-method-left">
                          <div className="security-method-icon">
                            <HardDrive className="w-4 h-4" />
                          </div>
                          <div className="security-method-info">
                            <span className="security-method-title">
                              Hardware Token (FIDO2 / RSA / YubiKey)
                            </span>
                            <span className="security-method-desc">
                              Cryptographic security keys for high-risk access
                            </span>
                          </div>
                        </div>
                        <div className={`security-checkbox-box ${field.value ? 'checked' : ''}`}>
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    )}
                  />

                  {/* Method 3: Biometric App Push */}
                  <Controller
                    name="mfaBiometricPush"
                    control={control}
                    render={({ field }) => (
                      <div
                        className={`security-method-card ${field.value ? 'checked' : ''}`}
                        onClick={() => field.onChange(!field.value)}
                        role="checkbox"
                        aria-checked={field.value}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            field.onChange(!field.value);
                          }
                        }}
                      >
                        <div className="security-method-left">
                          <div className="security-method-icon">
                            <Fingerprint className="w-4 h-4" />
                          </div>
                          <div className="security-method-info">
                            <span className="security-method-title">
                              Biometric App Push (Care ID Mobile App)
                            </span>
                            <span className="security-method-desc">
                              Instant biometric face/touch approval push alerts
                            </span>
                          </div>
                        </div>
                        <div className={`security-checkbox-box ${field.value ? 'checked' : ''}`}>
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    )}
                  />
                </div>

                {/* Right Column: Staff Onboarding Grace Period */}
                <div className="security-column-group">
                  <span className="security-field-label">Staff Onboarding Grace Period</span>

                  <div className="security-grace-card">
                    <p className="security-grace-text">
                      Allow new staff members a temporary window to register their primary authenticator before strict lockout:
                    </p>

                    <Controller
                      name="onboardingGracePeriod"
                      control={control}
                      render={({ field }) => (
                        <select
                          className="security-select-input"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          aria-label="Staff Onboarding Grace Period"
                        >
                          <option value="Immediate (0 Days - High Security)">
                            Immediate (0 Days - High Security)
                          </option>
                          <option value="3 Days (Accelerated)">3 Days (Accelerated)</option>
                          <option value="7 Days (Enterprise Recommended)">
                            7 Days (Enterprise Recommended)
                          </option>
                          <option value="14 Days (Extended)">14 Days (Extended)</option>
                          <option value="30 Days (Maximum)">30 Days (Maximum)</option>
                        </select>
                      )}
                    />

                    <p className="security-note-text">
                      Automated setup reminders will be emailed daily during this interval.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ==============================================================
                SECTION 2: Session & Timeout Controls
                ============================================================== */}
            <section
              className="security-section-card"
              aria-labelledby="section-session-heading"
            >
              <div className="security-section-header">
                <div className="security-section-title-row">
                  <div className="security-section-icon">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h2 id="section-session-heading" className="security-section-title">
                    Session &amp; Timeout Controls
                  </h2>
                </div>
                <p className="security-section-desc">
                  Mitigate unauthorized workstation takeover in clinical and remote environments.
                </p>
              </div>

              {/* 2-Column Session Grid */}
              <div className="security-session-grid">
                {/* Inactivity Timeout Card */}
                <div className="security-session-card">
                  <div className="security-card-top">
                    <h3 className="security-card-title">Admin Portal Inactivity Timeout</h3>
                    <span className="security-strict-badge">STRICT</span>
                  </div>
                  <p className="security-section-desc">
                    Terminate idle sessions automatically and lock the interface.
                  </p>

                  <Controller
                    name="inactivityTimeout"
                    control={control}
                    render={({ field }) => (
                      <select
                        className="security-select-input"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        aria-label="Admin Portal Inactivity Timeout"
                      >
                        <option value="5 Minutes (Ultra Strict)">5 Minutes (Ultra Strict)</option>
                        <option value="15 Minutes (Active Clinical Standard)">
                          15 Minutes (Active Clinical Standard)
                        </option>
                        <option value="30 Minutes (Standard Office)">30 Minutes (Standard Office)</option>
                        <option value="60 Minutes (Extended)">60 Minutes (Extended)</option>
                      </select>
                    )}
                  />
                </div>

                {/* Concurrent Session Limit Card */}
                <div className="security-session-card">
                  <div className="security-card-top">
                    <h3 className="security-card-title">Concurrent Session Policy</h3>
                  </div>
                  <p className="security-section-desc">
                    Limit to 1 active session per user. Logging in on a new device automatically terminates prior active tokens.
                  </p>

                  <div className="security-status-indicator">
                    <CheckCircle2 className="w-4 h-4 text-[#006a60]" />
                    <span>Active: 1 Concurrent Session / Auto-Invalidation Enabled</span>
                  </div>
                </div>
              </div>

              {/* Step-up Action Reauth Toggle Banner */}
              <div className="security-banner-box">
                <div className="security-banner-left">
                  <div className="security-banner-icon-badge">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="security-banner-text-group">
                    <h3 className="security-banner-title">
                      Force Periodic Re-authentication for Critical Clinical Actions
                    </h3>
                    <p className="security-banner-subtitle">
                      Requires password or biometric confirmation before approving patient transfers, purging records, or changing institutional keys.
                    </p>
                  </div>
                </div>

                <label className="security-toggle" aria-label="Toggle Step-up Action Re-authentication">
                  <Controller
                    name="forceStepUpReauth"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        name={field.name}
                        id={field.name}
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    )}
                  />
                  <div className="security-toggle-track">
                    <div className="security-toggle-thumb" />
                  </div>
                </label>
              </div>
            </section>

            {/* ==============================================================
                SECTION 3: Password Governance & Complexity
                ============================================================== */}
            <section
              className="security-section-card"
              aria-labelledby="section-password-heading"
            >
              <div className="security-section-header">
                <div className="security-section-title-row">
                  <div className="security-section-icon">
                    <Key className="w-5 h-5" />
                  </div>
                  <h2 id="section-password-heading" className="security-section-title">
                    Password Governance &amp; Complexity
                  </h2>
                </div>
                <p className="security-section-desc">
                  Standardized cryptographic hashing with strict entropy constraints.
                </p>
              </div>

              {/* 3-Column Bento Grid */}
              <div className="security-password-bento">
                {/* Card A: Minimum Length & Complexity */}
                <div className="security-bento-card">
                  <span className="security-field-label">Minimum Length &amp; Complexity</span>

                  <Controller
                    name="passwordMinLength"
                    control={control}
                    render={({ field }) => (
                      <select
                        className="security-select-input"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        aria-label="Minimum Length & Complexity"
                      >
                        <option value="8 Characters (Minimum)">8 Characters (Minimum)</option>
                        <option value="10 Characters (Moderate)">10 Characters (Moderate)</option>
                        <option value="12 Characters (Mandatory)">12 Characters (Mandatory)</option>
                        <option value="14 Characters (Enhanced)">14 Characters (Enhanced)</option>
                        <option value="16 Characters (Enterprise High Security)">
                          16 Characters (Enterprise High Security)
                        </option>
                      </select>
                    )}
                  />

                  <div className="security-rule-list">
                    <div className="security-rule-item">
                      <Check className="w-3.5 h-3.5 text-[#28006d]" />
                      <span>Requires Uppercase (A-Z)</span>
                    </div>
                    <div className="security-rule-item">
                      <Check className="w-3.5 h-3.5 text-[#28006d]" />
                      <span>Requires Lowercase (a-z)</span>
                    </div>
                    <div className="security-rule-item">
                      <Check className="w-3.5 h-3.5 text-[#28006d]" />
                      <span>Requires Numeric digits (0-9)</span>
                    </div>
                    <div className="security-rule-item">
                      <Check className="w-3.5 h-3.5 text-[#28006d]" />
                      <span>Requires Special characters (@$!%*?&amp;)</span>
                    </div>
                  </div>
                </div>

                {/* Card B: Password Expiry & History */}
                <div className="security-bento-card">
                  <span className="security-field-label">Password Expiry &amp; History</span>

                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-[#494552]">Rotation Interval</span>
                    <Controller
                      name="passwordRotationInterval"
                      control={control}
                      render={({ field }) => (
                        <select
                          className="security-select-input"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          aria-label="Password Rotation Interval"
                        >
                          <option value="30 Days (Frequent)">30 Days (Frequent)</option>
                          <option value="60 Days (Strict)">60 Days (Strict)</option>
                          <option value="90 Days (Enterprise Standard)">
                            90 Days (Enterprise Standard)
                          </option>
                          <option value="180 Days (Relaxed)">180 Days (Relaxed)</option>
                          <option value="Never (Not Recommended)">Never (Not Recommended)</option>
                        </select>
                      )}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-[#494552]">Rotation History Check</span>
                    <div className="security-pill-box">
                      Prevent re-use of last {formValues.preventPasswordReuseCount} passwords
                    </div>
                  </div>
                </div>

                {/* Card C: Lockout & Brute-Force Defense */}
                <div className="security-bento-card">
                  <span className="security-field-label">Lockout &amp; Brute-Force Defense</span>

                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-[#494552]">Max Failed Attempts</span>
                    <Controller
                      name="maxFailedAttempts"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="number"
                          min={1}
                          max={20}
                          className="security-number-input"
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 5)}
                          aria-label="Max Failed Attempts"
                        />
                      )}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-[#494552]">Account Lockout Window</span>
                    <Controller
                      name="lockoutDurationWindow"
                      control={control}
                      render={({ field }) => (
                        <select
                          className="security-select-input"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          aria-label="Account Lockout Window"
                        >
                          <option value="15 Minutes (Fast)">15 Minutes (Fast)</option>
                          <option value="30 Minutes (Auto-Release)">30 Minutes (Auto-Release)</option>
                          <option value="60 Minutes (Standard)">60 Minutes (Standard)</option>
                          <option value="Until Admin Unlock (Manual Strict)">
                            Until Admin Unlock (Manual Strict)
                          </option>
                        </select>
                      )}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ==============================================================
                SECTION 4: Network & IP Access Restrictions
                ============================================================== */}
            <section
              className="security-section-card"
              aria-labelledby="section-network-heading"
            >
              <div className="security-section-header">
                <div className="security-section-title-row">
                  <div className="security-section-icon">
                    <Globe className="w-5 h-5" />
                  </div>
                  <h2 id="section-network-heading" className="security-section-title">
                    Network &amp; IP Access Restrictions
                  </h2>
                </div>
                <p className="security-section-desc">
                  Isolate admin operations to authenticated hospital networks and verified hardware gateways.
                </p>
              </div>

              {/* Institutional IP Whitelisting Active Banner */}
              <div className="security-ip-banner">
                <ShieldCheck className="w-5 h-5 security-ip-banner-icon" />
                <div className="security-ip-banner-text">
                  <strong>Institutional IP Whitelisting Active:</strong> Connections originating outside designated medical subnets will be prompted for hardware challenge tokens.
                </div>
              </div>

              {/* Whitelisted CIDR Subnets Table */}
              <div className="security-cidr-table-wrap">
                <div className="security-cidr-header">
                  <span className="security-cidr-title">Whitelisted CIDR Subnets &amp; Gateways</span>
                  <button
                    type="button"
                    className="security-btn-sm-action"
                    onClick={() => setIsAddSubnetOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Subnet</span>
                  </button>
                </div>

                <div className="divide-y divide-[rgba(203,196,212,0.2)]">
                  {formValues.whitelistedSubnets && formValues.whitelistedSubnets.length > 0 ? (
                    formValues.whitelistedSubnets.map((subnet) => (
                      <div key={subnet.id} className="security-cidr-row">
                        <div className="security-cidr-left">
                          <div className="security-cidr-icon-badge">
                            {subnet.type === 'vpn' ? (
                              <Network className="w-4 h-4" />
                            ) : (
                              <Server className="w-4 h-4" />
                            )}
                          </div>
                          <div className="security-cidr-details">
                            <span className="security-cidr-code">{subnet.cidr}</span>
                            <span className="security-cidr-label">{subnet.description}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                          <button
                            type="button"
                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                            onClick={() => handleRemoveSubnet(subnet.id)}
                            title="Remove Subnet"
                            aria-label={`Remove subnet ${subnet.cidr}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No CIDR subnets whitelisted. All network traffic will be subject to hardware challenge.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Page Bottom Footer Actions Bar */}
            <div className="security-footer-bar">
              <button
                type="button"
                className="security-btn-secondary"
                onClick={handleResetDefaults}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset to Compliance Defaults</span>
              </button>

              <div className="security-footer-right">
                <button
                  type="submit"
                  className="security-btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save Security Policies'}</span>
                </button>

                <button
                  type="button"
                  className="security-btn-proceed"
                  onClick={() => handleNav('/admin/settings/roles')}
                >
                  <span>Proceed to Roles &amp; Permissions</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            </>
          )}
          </form>
        </div>
      </div>

      {/* Add Subnet Modal */}
      {isAddSubnetOpen && (
        <div
          className="security-modal-overlay"
          onClick={() => setIsAddSubnetOpen(false)}
        >
          <div
            className="security-modal-box"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-add-subnet-title"
          >
            <div className="flex items-center justify-between border-b pb-3 border-gray-200">
              <h3 id="modal-add-subnet-title" className="text-lg font-semibold text-gray-900">
                Add Whitelisted CIDR Subnet
              </h3>
              <button
                type="button"
                onClick={() => setIsAddSubnetOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubnet} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  CIDR Notation (e.g. 192.168.1.0/24)
                </label>
                <input
                  type="text"
                  required
                  placeholder="10.100.0.0/16"
                  value={newCidr}
                  onChange={(e) => setNewCidr(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Description / Department
                </label>
                <input
                  type="text"
                  required
                  placeholder="Cardiology Telemetry & PACS Gateway"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Subnet Type
                </label>
                <select
                  value={newSubnetType}
                  onChange={(e) => setNewSubnetType(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="on-premise">On-Premise Clinical Network</option>
                  <option value="vpn">VPN / Telehealth Gateway</option>
                  <option value="cloud">Cloud / Partner VPC</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAddSubnetOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#3f1d8b] text-white rounded-lg text-sm hover:bg-[#341773]"
                >
                  Add Subnet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Reset Defaults Confirmation Dialog (Phase 5) */}
      {isResetDialogOpen && (
        <div
          className="security-modal-overlay"
          onClick={() => setIsResetDialogOpen(false)}
        >
          <div
            className="security-modal-box max-w-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-reset-title"
          >
            <div className="flex items-center justify-between border-b pb-3 border-gray-200">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-[#3f1d8b]" />
                <h3 id="modal-reset-title" className="text-base font-semibold text-gray-900">
                  Reset Security Policies to Defaults
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetDialogOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 text-sm text-gray-600 flex flex-col gap-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs leading-relaxed">
                <span className="font-bold">Backend Dependency Notice:</span> The backend API does not currently expose an automated settings reset endpoint (<code className="font-mono bg-amber-100 px-1 rounded">POST /api/v1/admin/settings/reset</code>).
              </div>
              <p>
                To reset to standardized enterprise compliance settings, you may apply the standardized values into the form fields and click <strong>Save Security Policies</strong> to persist them to the live backend.
              </p>
              <p>
                Alternatively, click <strong>Reload Live Settings</strong> to discard any unsaved modifications and re-synchronize with the backend.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsResetDialogOpen(false)}
                className="px-3 py-2 border rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDiscardUnsaved}
                className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Reload Live Settings
              </button>
              <button
                type="button"
                onClick={handleConfirmApplyDefaults}
                className="px-3 py-2 bg-[#3f1d8b] text-white rounded-lg text-xs font-semibold hover:bg-[#341773]"
              >
                Apply Compliance Defaults to Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystemSettingsSecurity;
