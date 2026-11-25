import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Search,
  HelpCircle,
  Bell,
  User,
  ShieldCheck,
  Lock,
  Camera,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Laptop,
  Clock,
  KeyRound,
  Download,
  LogOut,
  X,
  ChevronRight,
  SlidersHorizontal,
  AlertCircle
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import securityService, { type FullAdminProfile, type UserSessionData } from '../../services/securityService';
import profileJenkinsLarge from '../../assets/users/profile-jenkins-large.png';
import './AdminProfileInformation.css';

export interface AdminProfileInformationProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

interface ProfileData {
  fullName: string;
  primaryEmail: string;
  officePhone: string;
  designation: string;
  officeLocation: string;
  emergencyContact: string;
  department: string;
  adminId: string;
  roleBadge: string;
  twoFactorEnabled: boolean;
  lastPasswordReset: string;
  accountCreated: string;
  avatarUrl: string;
}

export const AdminProfileInformation: React.FC<AdminProfileInformationProps> = ({
  onNavigate,
  onLogout
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Mobile drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Search input state
  const [globalSearch, setGlobalSearch] = useState('');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('success');

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Admin profile and active session live backend state
  const [adminProfile, setAdminProfile] = useState<FullAdminProfile | null>(null);
  const [activeSession, setActiveSession] = useState<UserSessionData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);

  // Live session timer state
  const [sessionDuration, setSessionDuration] = useState('00:00:00');

  // Profile data state (defaults initialize from authenticated user session, updated live from backend)
  const [profile, setProfile] = useState<ProfileData>(() => {
    const sessionEmail = user?.email || 'superadmin@careid.test';
    const sessionPhone = user?.phone || '+16505550001';
    const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN') ?? true;
    const shortId = user?.id ? user.id.slice(0, 8).toUpperCase() : 'ROOT';

    return {
      fullName: 'Super Administrator',
      primaryEmail: sessionEmail,
      officePhone: sessionPhone,
      designation: isSuperAdmin ? 'Super Administrator' : 'System Administrator',
      officeLocation: 'CareID Central Administration',
      emergencyContact: `Verified Mobile (${sessionPhone})`,
      department: 'Clinical Operations & Security',
      adminId: `ID: AD-${shortId}`,
      roleBadge: isSuperAdmin ? 'Super Administrator' : 'Administrator',
      twoFactorEnabled: true,
      lastPasswordReset: 'Managed via SMS OTP Challenge',
      accountCreated: 'Oct 28, 2026',
      avatarUrl: profileJenkinsLarge
    };
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: profile.fullName,
    officePhone: profile.officePhone,
    designation: profile.designation,
    officeLocation: profile.officeLocation,
    emergencyContact: profile.emergencyContact
  });

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Photo URL input
  const [photoInputUrl, setPhotoInputUrl] = useState('');

  const triggerToast = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  // Load live admin profile and active session from verified backend APIs
  useEffect(() => {
    let isMounted = true;
    const loadProfileData = async () => {
      setIsLoadingProfile(true);
      try {
        const [profRes, sessRes] = await Promise.all([
          securityService.getAdminProfile(),
          securityService.getActiveSessions().catch(() => ({ success: false, data: [] as UserSessionData[] }))
        ]);

        if (isMounted && profRes.success && profRes.data) {
          const data = profRes.data;
          setAdminProfile(data);
          const isSuperAdmin = data.roles?.includes('SUPER_ADMIN') ?? true;
          const shortId = data.id ? data.id.slice(0, 8).toUpperCase() : 'ROOT';

          const formattedCreated = data.createdAt
            ? new Date(data.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Oct 28, 2026';

          const updatedProfile: ProfileData = {
            fullName: data.fullName || 'Super Administrator',
            primaryEmail: data.email || user?.email || 'superadmin@careid.test',
            officePhone: data.phone || user?.phone || '—',
            designation: data.designation || (isSuperAdmin ? 'Super Administrator' : 'Administrator'),
            officeLocation: 'CareID Central Administration',
            emergencyContact: data.phone ? `Verified Mobile (${data.phone})` : 'Registered via Identity Provider',
            department: data.department || 'Clinical Operations & Security',
            adminId: `ID: AD-${shortId}`,
            roleBadge: isSuperAdmin ? 'Super Administrator' : 'Administrator',
            twoFactorEnabled: true,
            lastPasswordReset: 'Managed via Phone OTP Challenge',
            accountCreated: formattedCreated,
            avatarUrl: profileJenkinsLarge
          };

          setProfile(updatedProfile);
          setEditForm({
            fullName: updatedProfile.fullName,
            officePhone: updatedProfile.officePhone,
            designation: updatedProfile.designation,
            officeLocation: updatedProfile.officeLocation,
            emergencyContact: updatedProfile.emergencyContact
          });
        }

        if (isMounted && sessRes.success && Array.isArray(sessRes.data) && sessRes.data.length > 0) {
          setActiveSession(sessRes.data[0]);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load admin profile:', err);
        }
      } finally {
        if (isMounted) setIsLoadingProfile(false);
      }
    };

    loadProfileData();
    return () => { isMounted = false; };
  }, [user]);

  // Live session timer based on current session
  useEffect(() => {
    const sessionStart = activeSession?.createdAt ? new Date(activeSession.createdAt).getTime() : Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - sessionStart) / 1000));
      const hours = String(Math.floor(elapsed / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
      const seconds = String(elapsed % 60).padStart(2, '0');
      setSessionDuration(`${hours}:${minutes}:${seconds}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const currentDeviceLabel = (() => {
    const ua = navigator.userAgent || '';
    const os = ua.includes('Windows')
      ? 'Windows Workstation'
      : ua.includes('Mac')
      ? 'MacBook Workstation'
      : ua.includes('Linux')
      ? 'Linux Workstation'
      : ua.includes('Android') || ua.includes('iPhone')
      ? 'Mobile Device'
      : 'Browser Session';
    const browser = ua.includes('Chrome')
      ? 'Chrome'
      : ua.includes('Firefox')
      ? 'Firefox'
      : ua.includes('Safari')
      ? 'Safari'
      : ua.includes('Edge')
      ? 'Edge'
      : 'Web Client';
    const ip = activeSession?.ipAddress ? `(IP: ${activeSession.ipAddress})` : '';
    return `${os} - ${browser} ${ip}`.trim();
  })();

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText(profile.primaryEmail);
    triggerToast('Email address copied to clipboard!', 'info');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast(
      'Administrator profile editing is not supported on the backend (PUT /api/v1/auth/me is unavailable). Profile updates cannot be persisted.',
      'error'
    );
  };

  const handleSavePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (photoInputUrl.trim()) {
      setProfile(prev => ({ ...prev, avatarUrl: photoInputUrl.trim() }));
      setIsPhotoModalOpen(false);
      setPhotoInputUrl('');
      triggerToast('Profile photo updated in active view.', 'info');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProfile(prev => ({ ...prev, avatarUrl: String(event.target?.result) }));
          setIsPhotoModalOpen(false);
          triggerToast('Profile avatar loaded in active view.', 'info');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast(
      'Password modification is unavailable: The backend API does not provide a password change endpoint (POST /api/v1/auth/password/change returned 404). Authentication credentials are verified via Phone OTP.',
      'error'
    );
  };

  const handleExportActivity = async () => {
    try {
      triggerToast('Querying live audit records from server...', 'info');
      const auditRes = await securityService.getAuditLogs({ limit: 50 }).catch(() => ({ success: false, data: [] }));
      const events = auditRes.success && Array.isArray(auditRes.data) ? auditRes.data : [];

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        adminUser: {
          id: adminProfile?.id || user?.id,
          fullName: profile.fullName,
          email: profile.primaryEmail,
          phone: profile.officePhone,
          roles: adminProfile?.roles || user?.roles,
          status: adminProfile?.status || user?.status,
        },
        activeSession: {
          id: activeSession?.id || 'live-token-session',
          ipAddress: activeSession?.ipAddress || 'Client IP',
          userAgent: navigator.userAgent,
          duration: sessionDuration,
        },
        verifiedAuditTrail: events.slice(0, 25),
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute('href', dataStr);
      dlAnchor.setAttribute('download', `careid-profile-audit-${Date.now()}.json`);
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
      triggerToast('Verified activity audit log exported successfully.', 'success');
    } catch {
      triggerToast('Failed to export activity log.', 'error');
    }
  };

  return (
    <div
      className="profile-page-wrapper"
      data-node-id="20:9351"
      data-name="Admin Portal - My Profile & Information"
    >
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
            toastType === 'success'
              ? 'bg-[#006a60] text-white border-teal-600'
              : toastType === 'error'
              ? 'bg-[#ba1a1a] text-white border-red-600'
              : 'bg-[#28006d] text-white border-purple-600'
          }`}
          role="status"
          aria-live="polite"
        >
          {toastType === 'success' ? (
            <CheckCircle2 size={18} className="shrink-0 text-teal-200" />
          ) : toastType === 'error' ? (
            <AlertCircle size={18} className="shrink-0 text-red-200" />
          ) : (
            <Check size={18} className="shrink-0 text-purple-200" />
          )}
          <span className="font-medium">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Dismiss message"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 280px Fixed Sidebar - Desktop permanently fixed; Drawer on mobile/tablet */}
      <AdminSidebar
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onLogout={onLogout}
        onNavigate={handleNav}
        activeNav="profile"
      />

      {/* Main Canvas Area - Starts at 280px margin-left on Desktop (>=1024px) */}
      <div className="profile-page-main" data-node-id="20:9352" data-name="Main Content Canvas">
        {/* ==============================================================
            1. Stationary Top Global Navigation Bar (64px, Node 20:9545)
            ============================================================== */}
        <header
          className="profile-top-navbar"
          data-node-id="20:9545"
          data-name="Header - Top Navigation Bar"
        >
          <div className="profile-top-left" data-node-id="20:9546">
            <button
              type="button"
              className="profile-mobile-menu-btn"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation drawer"
            >
              <Menu size={20} />
            </button>

            <h2 className="profile-portal-heading">CareID Admin Portal</h2>

            <div
              className="profile-search-container"
              data-node-id="20:9547"
              data-name="Search Container"
            >
              <Search size={16} className="profile-search-icon" data-node-id="20:9548" />
              <input
                type="text"
                className="profile-search-input"
                placeholder={t('profile.header.search', 'Search enterprise records...')}
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                aria-label="Search enterprise records"
                data-node-id="20:9553"
              />
            </div>
          </div>

          <div className="profile-top-right" data-node-id="20:9554">
            <button
              type="button"
              className="profile-action-btn"
              aria-label="Help Documentation"
              onClick={() => handleNav('/admin/docs')}
              data-node-id="20:9555"
              title="Help and Documentation"
            >
              <HelpCircle size={19} />
            </button>

            <button
              type="button"
              className="profile-action-btn"
              aria-label="Notifications"
              onClick={() => handleNav('/admin/notifications')}
              data-node-id="20:9558"
              title="System Notifications"
            >
              <Bell size={19} />
            </button>

            {/* Profile Avatar Pill in Top Navbar */}
            <button
              type="button"
              className="profile-top-pill"
              onClick={() => handleNav('/admin/profile')}
              title="My Profile & Information"
              aria-label="Admin Profile"
              data-node-id="20:9562"
            >
              <div className="profile-top-pill-avatar" data-node-id="20:9565">
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <span className="profile-top-pill-label" data-node-id="20:9564">
                Admin Portal
              </span>
            </button>
          </div>
        </header>

        {/* ==============================================================
            2. Scrollable Canvas Body (Node 20:9353)
            ============================================================== */}
        <main
          className="profile-scroll-canvas"
          role="main"
          data-node-id="20:9353"
          data-name="Scrollable Main Canvas"
        >
          {/* Breadcrumbs (Node 20:9354) */}
          <nav
            className="profile-breadcrumbs"
            aria-label="Breadcrumb navigation"
            data-node-id="20:9354"
            data-name="Nav - Breadcrumbs"
          >
            <button
              type="button"
              className="profile-breadcrumb-link"
              onClick={() => handleNav('/admin/dashboard')}
              data-node-id="20:9356"
            >
              MedVault
            </button>
            <span className="profile-breadcrumb-sep" data-node-id="20:9357">&gt;</span>
            <button
              type="button"
              className="profile-breadcrumb-link"
              onClick={() => handleNav('/admin/settings/general')}
              data-node-id="20:9360"
            >
              Settings
            </button>
            <span className="profile-breadcrumb-sep" data-node-id="20:9361">&gt;</span>
            <span
              className="profile-breadcrumb-current"
              aria-current="page"
              data-node-id="20:9364"
            >
              Admin Profile
            </span>
          </nav>

          {/* ============================================================
              3. Profile Hero Section (Node 20:9365)
              ============================================================ */}
          <section
            className="profile-hero-card"
            aria-label="Administrator Identity Banner"
            data-node-id="20:9365"
            data-name="Profile Hero Section"
          >
            <div
              className="profile-hero-shader"
              aria-hidden="true"
              data-node-id="20:9383"
            />

            <div className="profile-hero-content">
              {/* Left Group: Avatar + Identity Info */}
              <div className="profile-identity-group">
                {/* Profile Photo Area (Node 20:9384) */}
                <div
                  className="profile-photo-area"
                  data-node-id="20:9384"
                  data-name="Profile Photo Area"
                >
                  <div
                    className="profile-avatar-large"
                    data-node-id="20:9385"
                    data-name="Background+Border+Shadow"
                  >
                    <img
                      src={profile.avatarUrl}
                      alt={profile.fullName}
                      data-node-id="20:9386"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="profile-avatar-camera-btn"
                    onClick={() => setIsPhotoModalOpen(true)}
                    title="Change Profile Photo"
                    aria-label="Change profile photo"
                    data-node-id="20:9387"
                  >
                    <Camera size={16} data-node-id="20:9389" />
                  </button>
                </div>

                {/* Identity Info (Node 20:9391) */}
                <div
                  className="profile-identity-details"
                  data-node-id="20:9391"
                  data-name="Identity Info"
                >
                  <div className="profile-name-row" data-node-id="20:9392">
                    <h1 className="profile-name-title" data-node-id="20:9394">
                      {isLoadingProfile ? 'Loading profile...' : profile.fullName}
                    </h1>
                    <span className="profile-role-badge" data-node-id="20:9396">
                      {profile.roleBadge}
                    </span>
                  </div>

                  <div className="profile-meta-row" data-node-id="20:9397">
                    <div className="profile-meta-item" data-node-id="20:9398">
                      <BadgeCheck size={16} className="text-[#28006d]" data-node-id="20:9399" />
                      <span data-node-id="20:9402">{profile.adminId}</span>
                    </div>
                    <div className="profile-meta-item" data-node-id="20:9403">
                      <Building2 size={15} className="text-[#494552]" data-node-id="20:9404" />
                      <span data-node-id="20:9407">{profile.department}</span>
                    </div>
                  </div>

                  <div className="profile-hero-buttons" data-node-id="20:9408">
                    <button
                      type="button"
                      className="btn-profile-edit"
                      onClick={() => {
                        setEditForm({
                          fullName: profile.fullName,
                          officePhone: profile.officePhone,
                          designation: profile.designation,
                          officeLocation: profile.officeLocation,
                          emergencyContact: profile.emergencyContact
                        });
                        setIsEditModalOpen(true);
                      }}
                      data-node-id="20:9409"
                    >
                      <span>Edit Profile</span>
                    </button>

                    <button
                      type="button"
                      className="btn-profile-photo"
                      onClick={() => setIsPhotoModalOpen(true)}
                      data-node-id="20:9411"
                    >
                      <span>Update Photo</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Group: Account Status Cards (Node 20:9366) */}
              <div
                className="profile-status-cards"
                data-node-id="20:9366"
                data-name="Account Status Cards"
              >
                {/* Card 1: ACCOUNT SECURITY (Node 20:9367) */}
                <div
                  className="profile-status-card"
                  data-node-id="20:9367"
                  data-name="Background+Border"
                >
                  <span className="profile-status-card-label" data-node-id="20:9369">
                    ACCOUNT SECURITY
                  </span>
                  <div className="profile-status-card-body" data-node-id="20:9370">
                    <span className="profile-status-card-value" data-node-id="20:9372">
                      Verified
                    </span>
                    <ShieldCheck size={22} className="text-[#007166]" data-node-id="20:9373" />
                  </div>
                </div>

                {/* Card 2: PERMISSIONS (Node 20:9375) */}
                <div
                  className="profile-status-card"
                  data-node-id="20:9375"
                  data-name="Background+Border"
                >
                  <span className="profile-status-card-label" data-node-id="20:9377">
                    PERMISSIONS
                  </span>
                  <div className="profile-status-card-body" data-node-id="20:9378">
                    <span className="profile-status-card-value" data-node-id="20:9380">
                      Full Access
                    </span>
                    <Lock size={19} className="text-[#191c1e]" data-node-id="20:9381" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================
              4. Detailed Personal Info Bento Grid (Node 20:9413)
              ============================================================ */}
          <div
            className="profile-bento-grid"
            data-node-id="20:9413"
            data-name="Detailed Personal Info Grid"
          >
            {/* Left Column (Spans 2 columns, Node 20:9414) */}
            <div
              className="profile-left-column"
              data-node-id="20:9414"
              data-name="Primary Information"
            >
              {/* Card 1: Personal Information (Node 20:9415) */}
              <div
                className="profile-card"
                data-node-id="20:9415"
                data-name="Background+Border"
              >
                <div className="profile-card-header" data-node-id="20:9416">
                  <User size={18} className="text-[#28006d]" data-node-id="20:9417" />
                  <h2 className="profile-card-title" data-node-id="20:9420">
                    Personal Information
                  </h2>
                </div>

                <div
                  className="personal-info-fields-grid"
                  data-node-id="20:9421"
                  data-name="Container"
                >
                  {/* Field 1: FULL NAME */}
                  <div className="info-field-block" data-node-id="20:9422">
                    <span className="info-field-label" data-node-id="20:9423">
                      FULL NAME
                    </span>
                    <div className="info-field-value" data-node-id="20:9425">
                      {profile.fullName}
                    </div>
                  </div>

                  {/* Field 2: PRIMARY EMAIL */}
                  <div className="info-field-block" data-node-id="20:9426">
                    <span className="info-field-label" data-node-id="20:9427">
                      PRIMARY EMAIL
                    </span>
                    <div className="info-field-value-row" data-node-id="20:9428">
                      <span className="info-field-value" data-node-id="20:9429">
                        {profile.primaryEmail}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="copy-badge-btn"
                        title="Copy Email"
                        aria-label="Copy primary email"
                        data-node-id="20:9430"
                      >
                        <Copy size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Field 3: OFFICE PHONE */}
                  <div className="info-field-block" data-node-id="20:9432">
                    <span className="info-field-label" data-node-id="20:9433">
                      OFFICE PHONE
                    </span>
                    <div className="info-field-value" data-node-id="20:9435">
                      {profile.officePhone}
                    </div>
                  </div>

                  {/* Field 4: DESIGNATION */}
                  <div className="info-field-block" data-node-id="20:9436">
                    <span className="info-field-label" data-node-id="20:9437">
                      DESIGNATION
                    </span>
                    <div className="info-field-value" data-node-id="20:9439">
                      {profile.designation}
                    </div>
                  </div>

                  {/* Field 5: OFFICE LOCATION */}
                  <div className="info-field-block" data-node-id="20:9440">
                    <span className="info-field-label" data-node-id="20:9441">
                      OFFICE LOCATION
                    </span>
                    <div className="info-field-value" data-node-id="20:9443">
                      {profile.officeLocation}
                    </div>
                  </div>

                  {/* Field 6: EMERGENCY CONTACT */}
                  <div className="info-field-block" data-node-id="20:9444">
                    <span className="info-field-label" data-node-id="20:9445">
                      EMERGENCY CONTACT
                    </span>
                    <div className="info-field-value" data-node-id="20:9447">
                      {profile.emergencyContact}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: System Access Details (Node 20:9448) */}
              <div
                className="profile-card"
                data-node-id="20:9448"
                data-name="Security & Login Activity"
              >
                <div className="profile-card-header" data-node-id="20:9449">
                  <ShieldCheck size={19} className="text-[#28006d]" data-node-id="20:9450" />
                  <h2 className="profile-card-title" data-node-id="20:9453">
                    System Access Details
                  </h2>
                </div>

                {/* Sub-card: Current Device (Node 20:9455) */}
                <div className="device-active-card" data-node-id="20:9455">
                  <div className="device-info-left" data-node-id="20:9456">
                    <div className="device-icon-wrap" data-node-id="20:9457">
                      <Laptop size={20} data-node-id="20:9458" />
                    </div>
                    <div className="device-text-group" data-node-id="20:9460">
                      <span className="device-name" data-node-id="20:9462">
                        Current Device
                      </span>
                      <span className="device-subtext" data-node-id="20:9464">
                        {currentDeviceLabel}
                      </span>
                    </div>
                  </div>
                  <span className="badge-active-pill" data-node-id="20:9466">
                    ACTIVE
                  </span>
                </div>

                {/* 2 Access Cards Row (Node 20:9467) */}
                <div className="access-sub-cards-row" data-node-id="20:9467">
                  {/* Two-Factor Authentication */}
                  <div className="access-sub-card" data-node-id="20:9468">
                    <span className="access-sub-card-label" data-node-id="20:9470">
                      Two-Factor Authentication
                    </span>
                    <div className="access-sub-card-value highlight" data-node-id="20:9471">
                      <Check size={15} data-node-id="20:9472" />
                      <span data-node-id="20:9474">Phone OTP Active</span>
                    </div>
                  </div>

                  {/* Authentication Protocol */}
                  <div className="access-sub-card" data-node-id="20:9475">
                    <span className="access-sub-card-label" data-node-id="20:9477">
                      Authentication Protocol
                    </span>
                    <div className="access-sub-card-value" data-node-id="20:9479">
                      OAuth2 Bearer JWT
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (1 column, Node 20:9480) */}
            <div
              className="profile-right-column"
              data-node-id="20:9480"
              data-name="Metadata & Side Widgets"
            >
              {/* Widget 1: Session Stats / Metadata (Node 20:9481) */}
              <div
                className="metadata-purple-card"
                data-node-id="20:9481"
                data-name="Session Stats"
              >
                <Clock className="metadata-decor-icon" aria-hidden="true" data-node-id="20:9482" />
                <div className="metadata-card-header" data-node-id="20:9485">
                  METADATA
                </div>

                <div className="metadata-item-block" data-node-id="20:9487">
                  <span className="metadata-item-label" data-node-id="20:9489">
                    SESSION ACTIVE IP
                  </span>
                  <span className="metadata-item-val" data-node-id="20:9491">
                    {activeSession?.ipAddress || 'Client Workstation'}
                  </span>
                </div>

                <div className="metadata-item-block" data-node-id="20:9492">
                  <span className="metadata-item-label" data-node-id="20:9494">
                    ACCOUNT CREATED
                  </span>
                  <span className="metadata-item-val" data-node-id="20:9496">
                    {profile.accountCreated}
                  </span>
                </div>

                <div className="metadata-divider" data-node-id="20:9497">
                  <span className="metadata-session-duration-label" data-node-id="20:9500">
                    Session Duration
                  </span>
                  <span className="metadata-session-duration-val" data-node-id="20:9502">
                    {sessionDuration}
                  </span>
                </div>
              </div>

              {/* Widget 2: Quick Actions Card / Account Management (Node 20:9503) */}
              <div
                className="profile-card"
                data-node-id="20:9503"
                data-name="Quick Actions Card"
              >
                <h3 className="profile-card-title text-base" data-node-id="20:9505">
                  Account Management
                </h3>

                <div className="flex flex-col gap-1" data-node-id="20:9506">
                  <button
                    type="button"
                    className="quick-action-item"
                    onClick={() => setIsPasswordModalOpen(true)}
                    data-node-id="20:9507"
                  >
                    <div className="quick-action-left" data-node-id="20:9508">
                      <KeyRound size={17} className="text-[#494552]" data-node-id="20:9509" />
                      <span className="quick-action-label" data-node-id="20:9512">
                        Change Password
                      </span>
                    </div>
                    <ChevronRight size={15} className="text-[#79747e]" data-node-id="20:9513" />
                  </button>

                  <button
                    type="button"
                    className="quick-action-item"
                    onClick={() => handleNav('/admin/notifications')}
                    data-node-id="20:9515"
                  >
                    <div className="quick-action-left" data-node-id="20:9516">
                      <SlidersHorizontal size={17} className="text-[#494552]" data-node-id="20:9517" />
                      <span className="quick-action-label" data-node-id="20:9520">
                        Alert Preferences
                      </span>
                    </div>
                    <ChevronRight size={15} className="text-[#79747e]" data-node-id="20:9521" />
                  </button>

                  <button
                    type="button"
                    className="quick-action-item"
                    onClick={handleExportActivity}
                    data-node-id="20:9523"
                  >
                    <div className="quick-action-left" data-node-id="20:9524">
                      <Download size={17} className="text-[#494552]" data-node-id="20:9525" />
                      <span className="quick-action-label" data-node-id="20:9528">
                        Activity Export
                      </span>
                    </div>
                    <ChevronRight size={15} className="text-[#79747e]" data-node-id="20:9529" />
                  </button>

                  <button
                    type="button"
                    className="quick-action-item danger"
                    onClick={() => {
                      if (onLogout) {
                        onLogout();
                      } else {
                        handleNav('/login');
                      }
                    }}
                    data-node-id="20:9531"
                  >
                    <div className="quick-action-left" data-node-id="20:9532">
                      <LogOut size={17} className="text-[#ba1a1a]" data-node-id="20:9533" />
                      <span className="quick-action-label" data-node-id="20:9536">
                        Sign Out
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Widget 3: Visual Accent / Secure Environment (Node 20:9537) */}
              <div
                className="secure-accent-card"
                data-node-id="20:9537"
                data-name="Visual Accent (Animated Shader Placeholder)"
              >
                <div className="secure-accent-grid-pattern" aria-hidden="true" />
                <div className="secure-accent-gradient-overlay" aria-hidden="true" />
                <div className="secure-accent-text-block" data-node-id="20:9540">
                  <span className="secure-accent-title" data-node-id="20:9542">
                    Secure Environment
                  </span>
                  <span className="secure-accent-subtitle" data-node-id="20:9544">
                    Encryption Layer Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ================================================================
          Modal: Edit Profile Details
          ================================================================ */}
      {isEditModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="profile-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3 className="profile-modal-title">Edit Profile Information</h3>
              <button
                type="button"
                className="profile-modal-close-btn"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveProfile}>
              <div className="profile-modal-body">
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '14px' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#b45309' }} />
                  <span>Administrator profile editing is currently restricted by the backend API. Directory user accounts cannot be modified directly via REST endpoint (<code>PUT /api/v1/auth/me</code> is unavailable).</span>
                </div>
                <div className="profile-form-group">
                  <label className="profile-form-label">Full Name</label>
                  <input
                    type="text"
                    className="profile-form-input"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>
                <div className="profile-form-group">
                  <label className="profile-form-label">Office Phone</label>
                  <input
                    type="text"
                    className="profile-form-input"
                    value={editForm.officePhone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, officePhone: e.target.value }))}
                  />
                </div>
                <div className="profile-form-group">
                  <label className="profile-form-label">Designation / Role Title</label>
                  <input
                    type="text"
                    className="profile-form-input"
                    value={editForm.designation}
                    onChange={(e) => setEditForm(prev => ({ ...prev, designation: e.target.value }))}
                  />
                </div>
                <div className="profile-form-group">
                  <label className="profile-form-label">Office Location</label>
                  <input
                    type="text"
                    className="profile-form-input"
                    value={editForm.officeLocation}
                    onChange={(e) => setEditForm(prev => ({ ...prev, officeLocation: e.target.value }))}
                  />
                </div>
                <div className="profile-form-group">
                  <label className="profile-form-label">Emergency Contact</label>
                  <input
                    type="text"
                    className="profile-form-input"
                    value={editForm.emergencyContact}
                    onChange={(e) => setEditForm(prev => ({ ...prev, emergencyContact: e.target.value }))}
                  />
                </div>
              </div>
              <div className="profile-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================
          Modal: Update Profile Photo
          ================================================================ */}
      {isPhotoModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsPhotoModalOpen(false)}>
          <div className="profile-modal-container max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3 className="profile-modal-title">Update Profile Photo</h3>
              <button
                type="button"
                className="profile-modal-close-btn"
                onClick={() => setIsPhotoModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSavePhoto}>
              <div className="profile-modal-body">
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#28006d] shadow-md">
                    <img
                      src={photoInputUrl || profile.avatarUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <label className="btn-profile-photo cursor-pointer">
                    <span>Upload Local Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                <div className="profile-form-group">
                  <label className="profile-form-label">Or Image URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    className="profile-form-input"
                    value={photoInputUrl}
                    onChange={(e) => setPhotoInputUrl(e.target.value)}
                  />
                </div>
              </div>
              <div className="profile-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsPhotoModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Set Photo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================
          Modal: Change Password
          ================================================================ */}
      {isPasswordModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="profile-modal-container max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3 className="profile-modal-title">Change Password</h3>
              <button
                type="button"
                className="profile-modal-close-btn"
                onClick={() => setIsPasswordModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSavePassword}>
              <div className="profile-modal-body">
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '14px' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#b45309' }} />
                  <span>Password modification is currently unavailable. The backend API does not provide a password change endpoint (<code>POST /api/v1/auth/password/change</code> is unavailable). Authentication is verified via Phone OTP.</span>
                </div>
                <div className="profile-form-group">
                  <label className="profile-form-label">Current Password</label>
                  <input
                    type="password"
                    className="profile-form-input"
                    placeholder="••••••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="profile-form-group">
                  <label className="profile-form-label">New Password</label>
                  <input
                    type="password"
                    className="profile-form-input"
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="profile-form-group">
                  <label className="profile-form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="profile-form-input"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="profile-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsPasswordModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfileInformation;

