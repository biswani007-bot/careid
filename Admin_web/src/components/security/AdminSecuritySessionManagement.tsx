import React, { useState, useEffect } from 'react';
import {
  Menu,
  Search,
  HelpCircle,
  Bell,
  User,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Laptop,
  Smartphone,
  Monitor,
  MapPin,
  Globe,
  Clock,
  KeyRound,
  AlertTriangle,
  Check,
  Minus,
  X,
  ChevronRight,
  ShieldAlert,
  Info,
  RefreshCw
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import profileJenkinsLarge from '../../assets/users/profile-jenkins-large.png';
import securityService, { type UserSessionData } from '../../services/securityService';
import { getSystemSettings, getPermissionMatrix } from '../../services/systemSettingsService';
import './AdminSecuritySessionManagement.css';

export interface AdminSecuritySessionManagementProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

interface PermissionRow {
  id: string;
  module: string;
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  actions: string;
}

interface ActiveSessionItem {
  id: string;
  name: string;
  location: string;
  detail: string;
  isCurrent: boolean;
  type: 'laptop' | 'mobile' | 'desktop';
  lastActive: string;
}

export const AdminSecuritySessionManagement: React.FC<AdminSecuritySessionManagementProps> = ({
  onNavigate,
  onLogout
}) => {
  const { user } = useAuth();

  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);

  // Modal States
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Active Sessions State
  const [sessions, setSessions] = useState<ActiveSessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Live Permission Matrix State
  const [permissionRows, setPermissionRows] = useState<PermissionRow[]>([
    { id: 'patients', module: 'Patients', read: true, create: true, update: true, delete: true, actions: 'Export/Approve' },
    { id: 'ocr', module: 'OCR Verification', read: true, create: true, update: true, delete: true, actions: 'Override/Verify' },
    { id: 'audit', module: 'Audit Logs', read: true, create: false, update: false, delete: false, actions: 'Full Traceback' },
    { id: 'settings', module: 'System Settings', read: true, create: true, update: true, delete: true, actions: 'Global Access' },
    { id: 'security', module: 'Security & KMS', read: true, create: true, update: true, delete: true, actions: 'Rotate/Resolve' }
  ]);

  // Security Policies State
  const [mfaActive, setMfaActive] = useState(true);
  const [idleTimeout, setIdleTimeout] = useState('30m');

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Load Sessions from Backend
  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await securityService.getActiveSessions();
      if (res.success && Array.isArray(res.data)) {
        const rawSessions: UserSessionData[] = res.data;
        const mapped: ActiveSessionItem[] = rawSessions.map((s, idx) => {
          const isCurrent = idx === 0; // The active bearer token session
          const ua = (s.userAgent || '').toLowerCase();
          const isMobile = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');
          const isDesktop = ua.includes('windows') || ua.includes('linux');
          const type: 'laptop' | 'mobile' | 'desktop' = isMobile ? 'mobile' : isDesktop ? 'desktop' : 'laptop';

          const devName = isCurrent
            ? `Admin Console (${type === 'mobile' ? 'Mobile App' : 'Browser Session'})`
            : s.userAgent
            ? s.userAgent.slice(0, 32)
            : `Client Workstation (${s.ipAddress})`;

          return {
            id: s.id,
            name: isCurrent ? `${devName} (Current Device)` : devName,
            location: `IP: ${s.ipAddress || 'Client Workstation'}`,
            detail: isCurrent ? 'Active REST Session' : `Created: ${new Date(s.createdAt).toLocaleDateString()}`,
            isCurrent,
            type,
            lastActive: isCurrent ? 'ACTIVE NOW' : new Date(s.createdAt).toLocaleDateString()
          };
        });
        setSessions(mapped);
      }
    } catch {
      showToast('Unable to fetch active sessions from server.');
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Load Security Settings & Matrix
  const loadSecurityConfig = async () => {
    try {
      const [settingsItems, matrixData] = await Promise.all([
        getSystemSettings('SECURITY').catch(() => []),
        getPermissionMatrix().catch(() => null)
      ]);

      if (Array.isArray(settingsItems) && settingsItems.length > 0) {
        const secMap: Record<string, any> = {};
        settingsItems.forEach((s: any) => {
          secMap[s.key] = s.value;
        });
        if (secMap['security.mfaEnforced'] !== undefined) {
          setMfaActive(Boolean(secMap['security.mfaEnforced']));
        }
        if (secMap['security.sessionTimeout']) {
          setIdleTimeout(`${secMap['security.sessionTimeout']}m`);
        }
      }

      if (matrixData && Array.isArray(matrixData.permissions) && matrixData.permissions.length > 0) {
        const currentRoleName = user?.roles?.[0] || 'SUPER_ADMIN';
        const targetRole = matrixData.roles.find(
          (r) => r.name.toUpperCase() === currentRoleName.toUpperCase()
        ) || matrixData.roles[0];
        const assigned = targetRole?.assignedPermissions || [];

        // Group by category/module
        const categoryMap: Record<string, string[]> = {};
        matrixData.permissions.forEach((p) => {
          const cat = p.category || 'General';
          if (!categoryMap[cat]) categoryMap[cat] = [];
          if (assigned.includes(p.name) || assigned.includes('*')) {
            categoryMap[cat].push(p.name);
          }
        });

        const dynamicRows: PermissionRow[] = Object.keys(categoryMap).map((catKey) => {
          const perms = categoryMap[catKey] || [];
          return {
            id: catKey.toLowerCase().replace(/\s+/g, '-'),
            module: catKey,
            read: perms.some((p) => p.includes('read') || p.includes('view') || p.includes('*')),
            create: perms.some((p) => p.includes('create') || p.includes('write') || p.includes('*')),
            update: perms.some((p) => p.includes('update') || p.includes('edit') || p.includes('*')),
            delete: perms.some((p) => p.includes('delete') || p.includes('*')),
            actions: `${perms.length} Active Grants`
          };
        });

        if (dynamicRows.length > 0) {
          setPermissionRows(dynamicRows);
        }
      }
    } catch {
      // Keep sensible fallbacks
    }
  };

  useEffect(() => {
    loadSessions();
    loadSecurityConfig();
  }, []);

  // Handle Password Update Form Submit
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(
      'Password modification endpoint is unavailable on the backend server (POST /api/v1/auth/password/change returned 404). Password management is enforced via Phone OTP authentication.'
    );
  };

  // Handle Terminate Single Session
  const handleEndSession = async (sessionId: string) => {
    try {
      const res = await securityService.terminateSession(sessionId);
      if (res.success || res.statusCode === 204 || res.statusCode === 200) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        showToast('Session terminated successfully in live backend.');
        loadSessions();
      } else {
        showToast(res.error || 'Failed to terminate session on backend.');
      }
    } catch (e: any) {
      showToast(e.message || 'Error terminating session.');
    }
  };

  // Handle Logout All Remote Devices
  const handleConfirmLogoutAll = async () => {
    try {
      const res = await securityService.terminateAllOtherSessions();
      if (res.success || res.statusCode === 204 || res.statusCode === 200) {
        setSessions((prev) => prev.filter((s) => s.isCurrent));
        setShowLogoutAllModal(false);
        showToast('All other remote device sessions terminated on backend.');
        loadSessions();
      } else {
        showToast(res.error || 'Failed to terminate all sessions.');
      }
    } catch (e: any) {
      showToast(e.message || 'Error terminating sessions.');
    }
  };

  // Filter permission rows by search query
  const filteredPermissions = permissionRows.filter(
    (row) =>
      row.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.actions.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="sec-session-page-wrapper"
      data-node-id="20:9632"
      data-name="Admin Portal - Security & Session Management"
    >
      {/* 280px Left Sidebar */}
      <AdminSidebar
        activeNav="security-session-management"
        isDrawerOpen={mobileDrawerOpen}
        onCloseDrawer={() => setMobileDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
      />

      {/* Main Content Area (offset by 280px on desktop) */}
      <main className="sec-session-page-main" data-node-id="20:9633" data-name="Content Wrapper">
        {/* Top Global Navigation Bar (64px, Node 20:9856) */}
        <header className="sec-session-navbar" data-node-id="20:9856" data-name="Header - TopNavBar">
          <div className="sec-session-nav-left" data-node-id="20:9857">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="sec-session-mobile-menu-btn"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            {/* Title / Heading */}
            <h1 className="sec-session-page-title" data-node-id="20:9859">
              Security & Session Settings
            </h1>

            {/* Search Input Bar */}
            <div className="sec-session-search-wrapper" data-node-id="20:9860">
              <Search size={16} className="sec-session-search-icon" data-node-id="20:9865" />
              <input
                type="text"
                className="sec-session-search-input"
                data-node-id="20:9861"
                placeholder="Search permissions & modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="sec-session-nav-right" data-node-id="20:9866">
            {/* Account Secure Badge */}
            <div className="sec-session-status-pill" data-node-id="20:9867" data-name="Background">
              <ShieldCheck size={14} data-node-id="20:9868" />
              <span data-node-id="20:9871">Account Secure</span>
            </div>

            {/* Refresh Sessions */}
            <button
              type="button"
              className="sec-session-icon-btn"
              title="Refresh Sessions"
              onClick={loadSessions}
            >
              <RefreshCw size={17} className={isLoadingSessions ? 'animate-spin' : ''} />
            </button>

            {/* Notification Bell */}
            <button
              type="button"
              className="sec-session-icon-btn"
              data-node-id="20:9872"
              title="Notifications"
              onClick={() => handleNav('/admin/notifications')}
            >
              <Bell size={18} />
            </button>

            {/* Help / Support Icon */}
            <button
              type="button"
              className="sec-session-icon-btn"
              data-node-id="20:9875"
              title="Help & Protocols"
              onClick={() => showToast('CareID Enterprise Security: Idle timeout ' + idleTimeout)}
            >
              <HelpCircle size={18} />
            </button>

            {/* User Profile Avatar */}
            <button
              type="button"
              className="sec-session-avatar-btn header-avatar-btn"
              data-node-id="20:9878"
              title={`Admin Profile (${user?.phone || user?.email || 'Super Admin'})`}
              onClick={() => handleNav('/admin/profile')}
            >
              <img
                src={profileJenkinsLarge}
                alt={user?.email || 'Super Admin'}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <User size={18} className="text-purple-700" />
            </button>
          </div>
        </header>

        {/* Main Content Canvas (Node 20:9634) */}
        <div className="sec-session-content-canvas" data-node-id="20:9634" data-name="Main Content Canvas">
          {/* Breadcrumb Bar */}
          <nav className="sec-session-breadcrumb" aria-label="Breadcrumb">
            <span
              className="sec-session-breadcrumb-link"
              onClick={() => handleNav('/admin')}
            >
              CareID
            </span>
            <ChevronRight size={14} />
            <span
              className="sec-session-breadcrumb-link"
              onClick={() => handleNav('/admin/security-compliance')}
            >
              Security &amp; Compliance
            </span>
            <ChevronRight size={14} />
            <span className="sec-session-breadcrumb-current">
              Security &amp; Session Management
            </span>
          </nav>

          {/* Bento Grid: Security Controls & Permission Matrix (Node 20:9635) */}
          <section
            className="sec-session-bento-grid"
            data-node-id="20:9635"
            data-name="Bento Grid Section: Security Controls & Permission Matrix"
          >
            {/* Column 1-5: Security Controls + Informational Box */}
            <div
              className="sec-session-col-controls"
              data-node-id="20:9636"
              data-name="Section 1: Security Controls (Col 1-5)"
            >
              {/* Security Controls Card (Node 20:9637) */}
              <div
                className="sec-session-card"
                data-node-id="20:9637"
                data-name="Background+Border+Shadow"
              >
                {/* Header */}
                <div className="sec-session-card-header" data-node-id="20:9638">
                  <div className="sec-session-card-title-group">
                    <Lock size={18} className="text-purple-900" />
                    <h2 className="sec-session-card-title" data-node-id="20:9642">
                      Security Controls
                    </h2>
                  </div>
                </div>

                {/* Password Form */}
                <form
                  onSubmit={handleUpdatePassword}
                  className="sec-session-form"
                  data-node-id="20:9643"
                  data-name="Form"
                >
                  <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#b45309' }} />
                    <span>Password modification is currently unavailable. The backend API does not provide an authenticated password change endpoint. Authentication is managed via Phone OTP and Bearer JWT.</span>
                  </div>
                  {/* Current Password Field */}
                  <div className="sec-session-field-group" data-node-id="20:9644">
                    <label className="sec-session-label" data-node-id="20:9645">
                      Current Password
                    </label>
                    <div className="sec-session-input-wrapper">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        className="sec-session-input"
                        data-node-id="20:9646"
                        placeholder="••••••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="sec-session-input-toggle"
                        onClick={() => setShowCurrent(!showCurrent)}
                        aria-label="Toggle password visibility"
                      >
                        {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* 2-Column New & Confirm Password Fields */}
                  <div className="sec-session-passwords-row" data-node-id="20:9649">
                    <div className="sec-session-field-group" data-node-id="20:9650">
                      <label className="sec-session-label" data-node-id="20:9651">
                        New Password
                      </label>
                      <div className="sec-session-input-wrapper">
                        <input
                          type={showNew ? 'text' : 'password'}
                          className="sec-session-input"
                          data-node-id="20:9652"
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="sec-session-input-toggle"
                          onClick={() => setShowNew(!showNew)}
                          aria-label="Toggle password visibility"
                        >
                          {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="sec-session-field-group" data-node-id="20:9653">
                      <label className="sec-session-label" data-node-id="20:9654">
                        Confirm Password
                      </label>
                      <div className="sec-session-input-wrapper">
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          className="sec-session-input"
                          data-node-id="20:9655"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="sec-session-input-toggle"
                          onClick={() => setShowConfirm(!showConfirm)}
                          aria-label="Toggle password visibility"
                        >
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Validation Feedback */}
                  {passwordFeedback && (
                    <div className="text-xs text-red-600 flex items-center gap-1.5 mt-1">
                      <AlertTriangle size={13} />
                      <span>{passwordFeedback}</span>
                    </div>
                  )}

                  {/* Update Password Button */}
                  <button
                    type="submit"
                    className="sec-session-btn-update"
                    data-node-id="20:9656"
                    data-name="Button"
                  >
                    <span data-node-id="20:9657">Update Password</span>
                  </button>
                </form>

                {/* Two-Factor Authentication Section (Node 20:9658) */}
                <div
                  className="sec-session-2fa-section"
                  data-node-id="20:9658"
                  data-name="HorizontalBorder"
                >
                  <div className="sec-session-2fa-info" data-node-id="20:9659">
                    <div data-node-id="20:9660">
                      <h3 className="sec-session-2fa-title" data-node-id="20:9662">
                        Two-Factor Authentication
                      </h3>
                      <p className="sec-session-2fa-desc" data-node-id="20:9664">
                        {mfaActive ? 'Backend policy active & enforced' : 'Optional for this role'}
                      </p>
                    </div>

                    {/* Enabled Badge */}
                    <div
                      className="sec-session-badge-enabled"
                      data-node-id="20:9665"
                      data-name="Background"
                    >
                      <Check size={12} strokeWidth={2.5} />
                      <span data-node-id="20:9669">{mfaActive ? 'Enforced' : 'Optional'}</span>
                    </div>
                  </div>

                  {/* Configure 2FA Button */}
                  <div>
                    <button
                      type="button"
                      className="sec-session-btn-configure-2fa"
                      data-node-id="20:9670"
                      onClick={() => setShow2FAModal(true)}
                    >
                      <KeyRound size={15} />
                      <span data-node-id="20:9673">View 2FA Policies</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Informational Box: Vault Compliance (Node 20:9674) */}
              <div
                className="sec-session-compliance-box"
                data-node-id="20:9674"
                data-name="Informational Box"
              >
                <ShieldCheck className="sec-session-compliance-watermark" data-node-id="20:9675" />

                <div data-node-id="20:9677">
                  <h3 className="sec-session-compliance-title" data-node-id="20:9679">
                    KMS Enterprise Security
                  </h3>
                  <p className="sec-session-compliance-text" data-node-id="20:9681">
                    Your session is bound to live OAuth2 Bearer token encryption. Idle session timeout
                    is configured to {idleTimeout} across all clinical workstations.
                  </p>
                </div>
              </div>
            </div>

            {/* Column 6-12: Permission Matrix (Node 20:9682) */}
            <div
              className="sec-session-col-permissions"
              data-node-id="20:9682"
              data-name="Section 2: Permission Matrix (Col 6-12)"
            >
              <div
                className="sec-session-card"
                data-node-id="20:9683"
                data-name="Background+Border+Shadow"
              >
                {/* Header */}
                <div className="sec-session-card-header" data-node-id="20:9684">
                  <div className="sec-session-card-title-group" data-node-id="20:9685">
                    <ShieldCheck size={20} className="text-purple-900" data-node-id="20:9686" />
                    <h2 className="sec-session-card-title" data-node-id="20:9689">
                      Permission Summary
                    </h2>
                  </div>

                  {/* Role Badge */}
                  <span className="sec-session-role-pill" data-node-id="20:9690">
                    <span data-node-id="20:9691">{user?.roles?.[0] || 'SUPER_ADMIN'}</span>
                  </span>
                </div>

                {/* Table (Node 20:9693) */}
                <div className="sec-session-table-container" data-node-id="20:9692">
                  <table className="sec-session-table" data-node-id="20:9693">
                    <thead>
                      <tr data-node-id="20:9694">
                        <th className="sec-session-th" data-node-id="20:9695">
                          Module
                        </th>
                        <th className="sec-session-th center" data-node-id="20:9697">
                          Read
                        </th>
                        <th className="sec-session-th center" data-node-id="20:9699">
                          Create
                        </th>
                        <th className="sec-session-th center" data-node-id="20:9701">
                          Update
                        </th>
                        <th className="sec-session-th center" data-node-id="20:9703">
                          Delete
                        </th>
                        <th className="sec-session-th center" data-node-id="20:9705">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody data-node-id="20:9707">
                      {filteredPermissions.length > 0 ? (
                        filteredPermissions.map((row) => (
                          <tr key={row.id} className="sec-session-tr">
                            <td className="sec-session-td">
                              <span className="sec-session-module-title">{row.module}</span>
                            </td>
                            <td className="sec-session-td center">
                              {row.read ? (
                                <span className="sec-session-check-circle" title="Allowed">
                                  <Check size={16} strokeWidth={2.5} />
                                </span>
                              ) : (
                                <span className="sec-session-dash-circle" title="Restricted">
                                  <Minus size={16} />
                                </span>
                              )}
                            </td>
                            <td className="sec-session-td center">
                              {row.create ? (
                                <span className="sec-session-check-circle" title="Allowed">
                                  <Check size={16} strokeWidth={2.5} />
                                </span>
                              ) : (
                                <span className="sec-session-dash-circle" title="Restricted">
                                  <Minus size={16} />
                                </span>
                              )}
                            </td>
                            <td className="sec-session-td center">
                              {row.update ? (
                                <span className="sec-session-check-circle" title="Allowed">
                                  <Check size={16} strokeWidth={2.5} />
                                </span>
                              ) : (
                                <span className="sec-session-dash-circle" title="Restricted">
                                  <Minus size={16} />
                                </span>
                              )}
                            </td>
                            <td className="sec-session-td center">
                              {row.delete ? (
                                <span className="sec-session-check-circle" title="Allowed">
                                  <Check size={16} strokeWidth={2.5} />
                                </span>
                              ) : (
                                <span className="sec-session-dash-circle" title="Restricted">
                                  <Minus size={16} />
                                </span>
                              )}
                            </td>
                            <td className="sec-session-td center">
                              <span className="sec-session-action-tag">{row.actions}</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-sm text-gray-500">
                            No modules match "{searchQuery}"
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Overlay Notice Box (Node 20:9773) */}
                <div
                  className="sec-session-notice-box"
                  data-node-id="20:9773"
                  data-name="Overlay+Border"
                >
                  <Info size={18} className="sec-session-notice-icon" data-node-id="20:9775" />
                  <p className="sec-session-notice-text" data-node-id="20:9777">
                    Permissions are loaded live from the backend RBAC permission matrix. To modify grants,
                    navigate to <strong>System Settings → Roles &amp; Permissions</strong>.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Active Sessions (Full Width, Node 20:9778) */}
          <section
            className="sec-session-sessions-card"
            data-node-id="20:9778"
            data-name="Section 3: Active Sessions"
          >
            {/* Header */}
            <div className="sec-session-card-header" data-node-id="20:9779">
              <div className="sec-session-card-title-group" data-node-id="20:9780">
                <Monitor size={20} className="text-purple-900" data-node-id="20:9781" />
                <h2 className="sec-session-card-title" data-node-id="20:9784">
                  Active Sessions ({sessions.length})
                </h2>
              </div>

              {/* Logout All Devices Button */}
              {sessions.filter((s) => !s.isCurrent).length > 0 && (
                <button
                  type="button"
                  className="sec-session-btn-logout-all"
                  data-node-id="20:9785"
                  onClick={() => setShowLogoutAllModal(true)}
                >
                  <span data-node-id="20:9786">Logout All Other Devices</span>
                </button>
              )}
            </div>

            {/* Sessions List */}
            <div className="sec-session-list" data-node-id="20:9787">
              {isLoadingSessions ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  Loading active user sessions from server...
                </div>
              ) : sessions.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  No active sessions found.
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`sec-session-item ${session.isCurrent ? 'current' : 'other'}`}
                    data-node-id={session.isCurrent ? '20:9788' : '20:9810'}
                  >
                    <div className="sec-session-item-left">
                      <div className="sec-session-device-icon-wrap">
                        {session.type === 'laptop' && <Laptop size={22} />}
                        {session.type === 'mobile' && <Smartphone size={22} />}
                        {session.type === 'desktop' && <Monitor size={22} />}
                      </div>

                      <div className="sec-session-device-meta">
                        <div className="sec-session-device-title-row">
                          <span className="sec-session-device-name">{session.name}</span>
                          {session.isCurrent && (
                            <span className="sec-session-badge-active" data-node-id="20:9798">
                              ACTIVE NOW
                            </span>
                          )}
                        </div>

                        <div className="sec-session-details-row">
                          <span className="sec-session-detail-item">
                            <MapPin size={12} className="text-gray-500" />
                            <span>{session.location}</span>
                          </span>

                          <span className="sec-session-detail-item">
                            {session.isCurrent ? (
                              <Globe size={12} className="text-gray-500" />
                            ) : (
                              <Clock size={12} className="text-gray-500" />
                            )}
                            <span>{session.detail}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* End Session Button */}
                    <button
                      type="button"
                      className={`sec-session-btn-end ${session.isCurrent ? 'danger' : 'neutral'}`}
                      data-node-id={session.isCurrent ? '20:9808' : '20:9826'}
                      onClick={() => handleEndSession(session.id)}
                    >
                      <span>Terminate</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* 4. Footer / Branding (Node 20:9846) */}
        <footer className="sec-session-footer" data-node-id="20:9846" data-name="Footer / Branding">
          <div data-node-id="20:9847">
            <p data-node-id="20:9848">
              &copy; 2026 CareID Enterprise Health Vault. Real-time cryptographic session enforcement.
            </p>
          </div>

          <div className="sec-session-footer-links" data-node-id="20:9849">
            <span
              className="sec-session-footer-link"
              data-node-id="20:9850"
              onClick={() => handleNav('/admin/settings/security')}
            >
              Security Settings
            </span>
            <span
              className="sec-session-footer-link"
              data-node-id="20:9852"
              onClick={() => handleNav('/admin/security-compliance')}
            >
              Compliance Overview
            </span>
            <span className="sec-session-footer-version" data-node-id="20:9854">
              CareID v4.8.2
            </span>
          </div>
        </footer>
      </main>

      {/* Modal 1: Configure 2FA Methods */}
      {show2FAModal && (
        <div className="sec-session-modal-overlay" onClick={() => setShow2FAModal(false)}>
          <div
            className="sec-session-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="sec-session-modal-header">
              <div className="flex items-center gap-2">
                <KeyRound size={20} className="text-purple-700" />
                <h3 className="sec-session-modal-title">Two-Factor Authentication Status</h3>
              </div>
              <button
                type="button"
                className="sec-session-modal-close"
                onClick={() => setShow2FAModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sec-session-modal-body">
              <p className="mb-4">
                Two-factor authentication policies are governed globally by the central backend settings.
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-xl bg-purple-50/50 border-purple-200">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} className="text-purple-700" />
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">Authenticator App (TOTP)</div>
                      <div className="text-xs text-gray-500">Google Authenticator, Authy, or 1Password</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-100 text-teal-800">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-xl bg-gray-50 border-gray-200">
                  <div className="flex items-center gap-3">
                    <Smartphone size={20} className="text-gray-600" />
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">SMS OTP Challenge</div>
                      <div className="text-xs text-gray-500">Registered administrator phone number</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">
                    Configured
                  </span>
                </div>
              </div>
            </div>

            <div className="sec-session-modal-actions">
              <button
                type="button"
                className="sec-session-modal-btn-cancel"
                onClick={() => setShow2FAModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Logout All Devices Confirmation */}
      {showLogoutAllModal && (
        <div className="sec-session-modal-overlay" onClick={() => setShowLogoutAllModal(false)}>
          <div
            className="sec-session-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="sec-session-modal-header">
              <div className="flex items-center gap-2 text-red-600">
                <ShieldAlert size={22} />
                <h3 className="sec-session-modal-title">Logout All Other Devices</h3>
              </div>
              <button
                type="button"
                className="sec-session-modal-close"
                onClick={() => setShowLogoutAllModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sec-session-modal-body">
              <p className="mb-2">
                Are you sure you want to terminate all remote active sessions via <code>DELETE /api/v1/auth/sessions</code>?
              </p>
              <p className="text-xs text-gray-500 bg-red-50 p-3 rounded-lg border border-red-200">
                This will immediately revoke active tokens on {sessions.filter((s) => !s.isCurrent).length} other session(s). Your current session will remain active.
              </p>
            </div>

            <div className="sec-session-modal-actions">
              <button
                type="button"
                className="sec-session-modal-btn-cancel"
                onClick={() => setShowLogoutAllModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sec-session-modal-btn-confirm"
                onClick={handleConfirmLogoutAll}
              >
                Logout Other Devices
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="sec-session-toast">
          <Info size={16} className="text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default AdminSecuritySessionManagement;
