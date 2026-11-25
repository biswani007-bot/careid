import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, Plus, ShieldCheck, PawPrint, CreditCard, FileText, BarChart2, Pill, MessageSquare, Stethoscope } from 'lucide-react';
import '../dashboard/AdminDashboard.css';

// Authentic Assets
import logoImg from '../../assets/dashboard/careid-logo.png';
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
import navOcrBtnIcon from '../../assets/dashboard/nav-ocr-btn.svg';
import SidebarLogoutButton from './SidebarLogoutButton';
import { useOcrQueueStatsQuery } from '../../services/ocrService';
import { useReferralStatsQuery } from '../../services/referralService';
import { useBranding } from '../../context/BrandingContext';

export interface AdminSidebarProps {
  activeNav: string;
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

/**
 * Resolves exactly ONE active leaf navigation key across the entire Admin sidebar.
 * Avoids broad pathname.startsWith() conflicts (e.g., reports vs capacity/financing, records vs rx-pickup).
 */
export const resolveActiveSidebarLeaf = (pathname: string, activeNav?: string): string => {
  const p = pathname.toLowerCase();

  // 1. Dashboard
  if (p === '/admin/dashboard' || p === '/dashboard' || (activeNav === 'dashboard' && (p === '/admin/dashboard' || p === '/dashboard' || p === '/'))) {
    return 'dashboard';
  }

  // 2. Operational Scheduling & Capacity (CR-03 & CR-04) — High precedence before reports
  if (p === '/admin/operations/capacity' || p.startsWith('/admin/operations/capacity') || p === '/admin/capacity' || p === '/admin/scheduling-capacity' || activeNav === 'capacity') {
    return 'capacity';
  }

  // 3. Prescription Collection Tracking (CR-08) — High precedence before records & reports
  if (p === '/admin/operations/prescriptions' || p.startsWith('/admin/operations/prescriptions') || p.startsWith('/admin/prescriptions') || p === '/admin/prescription-pickup' || activeNav === 'prescriptions') {
    return 'prescriptions';
  }

  // 3b. Office Chat Oversight (CR-07)
  if (p === '/admin/communication/chat-oversight' || p.startsWith('/admin/communication') || p === '/admin/chat-oversight' || p === '/admin/chat' || activeNav === 'chat-oversight') {
    return 'chat-oversight';
  }

  // 4. Financing (CR-02) — High precedence before reports
  if (p === '/admin/financing' || p.startsWith('/admin/financing') || p === '/financing' || activeNav === 'financing') {
    return 'financing';
  }

  // 4b. Consultation & Slot Management (CR-015 / Goal 016)
  if (p === '/admin/consultation-management' || p.startsWith('/admin/consultation-management') || activeNav === 'consultation-management') {
    return 'consultation-management';
  }

  // 5. CMS Content Management & Legal Documents
  if (p === '/admin/cms' || p.startsWith('/admin/cms') || p.startsWith('/admin/legal') || p === '/cms' || activeNav === 'cms') {
    return 'cms';
  }

  // 6. Users
  if (p === '/admin/users' || p.startsWith('/admin/users') || p.startsWith('/users') || activeNav === 'users') {
    return 'users';
  }

  // 7. Patients
  if (p === '/admin/patients' || p.startsWith('/admin/patients') || p.startsWith('/patients') || activeNav === 'patients') {
    return 'patients';
  }

  // 8. Pet Health Vault
  if (p === '/admin/pets' || p.startsWith('/admin/pets') || p.startsWith('/pets') || activeNav === 'pets') {
    return 'pets';
  }

  // 9. Doctors
  if (p === '/admin/doctors' || p.startsWith('/admin/doctors') || p.startsWith('/doctors') || activeNav === 'doctors') {
    return 'doctors';
  }

  // 10. Facilities
  if (p === '/admin/facilities' || p.startsWith('/admin/facilities') || p.startsWith('/facilities') || activeNav === 'facilities') {
    return 'facilities';
  }

  // 11. Health Records Submenu Leaves
  if (p === '/admin/records/medical' || p.startsWith('/admin/records/medical') || p.startsWith('/admin/health-records/medical') || activeNav === 'records-medical') {
    return 'records-medical';
  }
  if (p === '/admin/records/dental' || p.startsWith('/admin/records/dental') || p.startsWith('/admin/health-records/dental') || activeNav === 'records-dental') {
    return 'records-dental';
  }
  if (p === '/admin/records/vision' || p.startsWith('/admin/records/vision') || p.startsWith('/admin/health-records/vision') || activeNav === 'records-vision') {
    return 'records-vision';
  }
  if (p === '/admin/records' || p === '/admin/health-records' || p === '/records' || p.startsWith('/admin/records/upload') || p.startsWith('/admin/records/details') || activeNav === 'records') {
    return 'records';
  }

  // 12. OCR Verification Submenu Leaves
  if (p === '/admin/ocr/rejected' || p === '/admin/ocr-verification/rejected' || activeNav === 'ocr-rejected') {
    return 'ocr-rejected';
  }
  if (p === '/admin/ocr/history' || p === '/admin/ocr-verification/history' || activeNav === 'ocr-history') {
    return 'ocr-history';
  }
  if (p === '/admin/ocr/queue' || p === '/admin/ocr' || p.startsWith('/admin/ocr/verify') || p.startsWith('/admin/ocr/workspace') || p.startsWith('/admin/ocr-verification') || activeNav === 'ocr-queue' || activeNav === 'ocr') {
    return 'ocr-queue';
  }

  // 13. Referrals Submenu Leaves
  if (p === '/admin/referrals/audit' || p.startsWith('/admin/referrals/audit') || activeNav === 'referrals-audit') {
    return 'referrals-audit';
  }
  if (p === '/admin/referrals/escalations' || p.startsWith('/admin/referrals/escalations') || p.startsWith('/admin/referrals/monitoring') || p.startsWith('/admin/referrals/queue') || activeNav === 'referrals-escalations' || activeNav === 'referrals-monitoring') {
    return 'referrals-escalations';
  }
  if (p === '/admin/referrals' || p.startsWith('/admin/referrals/') || p === '/admin/referral-details' || p.startsWith('/admin/referral-details/') || p.startsWith('/referrals') || activeNav === 'referrals' || activeNav === 'referrals-overview') {
    return 'referrals-overview';
  }

  // 14. Reports Module (Strictly reports, excluding capacity/financing)
  if (p === '/admin/reports' || p.startsWith('/admin/reports') || p.startsWith('/reports') || activeNav === 'reports') {
    return 'reports';
  }

  // 15. System Settings
  if (p === '/admin/settings' || p.startsWith('/admin/settings') || p.startsWith('/settings') || activeNav === 'settings') {
    return 'settings';
  }

  // 16. Audit Logs
  if ((p.startsWith('/admin/audit') && !p.startsWith('/admin/referrals/audit')) || p === '/audit' || activeNav === 'audit' || activeNav === 'auditLogs') {
    return 'audit';
  }

  // 17. Security & Compliance
  if (p.startsWith('/admin/security') || p.startsWith('/admin/compliance') || p.startsWith('/compliance') || activeNav === 'security' || activeNav === 'compliance') {
    return 'security';
  }

  // 18. Support & Notifications
  if (p.startsWith('/admin/notifications') || p.startsWith('/admin/announcements') || p.startsWith('/admin/support') || p === '/notifications' || p === '/support' || activeNav === 'support' || activeNav === 'notifications') {
    return 'support';
  }

  return activeNav || '';
};

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeNav,
  isDrawerOpen,
  onCloseDrawer,
  onNavigate,
  onLogout,
  ctaLabel,
  onCtaClick,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { logoUrl } = useBranding();

  // Dynamic OCR total records count from verified backend API
  const ocrStatsQuery = useOcrQueueStatsQuery();
  const totalOcrCount = ocrStatsQuery.data?.totalRecords;

  // Dynamic Referrals total count from verified backend API (GET /api/v1/referrals/dashboard/stats)
  const referralStatsQuery = useReferralStatsQuery();
  const totalReferralsCount = referralStatsQuery.data?.totalReferrals;

  // Exactly ONE active leaf across the entire sidebar
  const activeLeaf = resolveActiveSidebarLeaf(location.pathname, activeNav);

  // Submenu expansion states (separated from leaf active state)
  const isRecordsSection =
    activeLeaf.startsWith('records') ||
    location.pathname.startsWith('/admin/records') ||
    location.pathname.startsWith('/admin/health-records');
  const [isRecordsExpanded, setIsRecordsExpanded] = useState(isRecordsSection);

  useEffect(() => {
    if (isRecordsSection) {
      setIsRecordsExpanded(true);
    }
  }, [isRecordsSection, location.pathname]);

  const isOcrSection =
    activeLeaf.startsWith('ocr') ||
    location.pathname.startsWith('/admin/ocr') ||
    location.pathname.startsWith('/admin/ocr-verification');
  const [isOcrExpanded, setIsOcrExpanded] = useState(isOcrSection);

  useEffect(() => {
    if (isOcrSection) {
      setIsOcrExpanded(true);
    }
  }, [isOcrSection, location.pathname]);

  const isReferralsSection =
    activeLeaf.startsWith('referral') ||
    location.pathname.startsWith('/admin/referral');
  const [isReferralsExpanded, setIsReferralsExpanded] = useState(isReferralsSection);

  useEffect(() => {
    if (isReferralsSection) {
      setIsReferralsExpanded(true);
    }
  }, [isReferralsSection, location.pathname]);

  const handleNavClick = (path: string) => {
    onCloseDrawer();
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const handleLogout = () => {
    onCloseDrawer();
    if (onLogout) {
      onLogout();
    } else {
      navigate('/');
    }
  };

  return (
    <aside
      className={`careid-sidebar ${isDrawerOpen ? 'drawer-open' : ''}`}
      aria-label="Main Navigation"
    >
      {/* Logo Container */}
      <div className="sidebar-logo-container">
        <img
          src={logoUrl || logoImg}
          alt="CareID"
          className="sidebar-logo"
          id="careid-sidebar-logo"
          onError={(e) => {
            if (e.currentTarget.src !== logoImg) {
              e.currentTarget.src = logoImg;
            }
          }}
        />
        {/* Mobile close button (hidden on desktop) */}
        <button
          type="button"
          className="sidebar-close-btn"
          onClick={onCloseDrawer}
          aria-label="Close navigation menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Items List */}
      <nav className="sidebar-nav-list" role="navigation">
        {/* Dashboard */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeLeaf === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/dashboard')}
          aria-current={activeLeaf === 'dashboard' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <img src={navDashboardIcon} alt="" />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.dashboard', 'Dashboard')}
          </span>
        </button>

        {/* Users */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeLeaf === 'users' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/users')}
          aria-current={activeLeaf === 'users' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <img src={navUsersIcon} alt="" />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.users', 'Users')}
          </span>
        </button>

        {/* Patients */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeLeaf === 'patients' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/patients')}
          aria-current={activeLeaf === 'patients' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <img src={navPatientsIcon} alt="" />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.patients', 'Patients')}
          </span>
        </button>

        {/* Pet Health Vault */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeLeaf === 'pets' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/pets')}
          aria-current={activeLeaf === 'pets' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon flex items-center justify-center text-slate-500">
            <PawPrint size={18} />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.pets', 'Pet Vault')}
          </span>
        </button>

        {/* Doctors */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeLeaf === 'doctors' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/doctors')}
          aria-current={activeLeaf === 'doctors' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <img src={navDoctorsIcon} alt="" />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.doctors', 'Doctors')}
          </span>
        </button>

        {/* Facilities */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeLeaf === 'facilities' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/facilities')}
          aria-current={activeLeaf === 'facilities' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <img src={navFacilitiesIcon} alt="" />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.facilities', 'Facilities')}
          </span>
        </button>

        {/* Health Records with Submenu */}
        <div className="w-full flex flex-col">
          <button
            type="button"
            className={`sidebar-nav-item ${activeLeaf === 'records' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              setIsRecordsExpanded((prev) => !prev);
            }}
            aria-current={activeLeaf === 'records' ? 'page' : undefined}
            aria-expanded={isRecordsExpanded}
            aria-controls="sidebar-records-subnav"
          >
            <span className="sidebar-nav-icon">
              <img src={navRecordsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">
              {t('dashboard.nav.healthRecords', 'Health Records')}
            </span>
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${
                isRecordsExpanded ? 'rotate-180 text-white' : 'text-[#ab8efd]'
              }`}
            />
          </button>

          {isRecordsExpanded && (
            <div className="sidebar-subnav-list" id="sidebar-records-subnav">
              <button
                type="button"
                className={`sidebar-subnav-item ${activeLeaf === 'records-medical' ? 'active' : ''}`}
                onClick={() => handleNavClick('/admin/records/medical')}
              >
                {t('healthRecords.subnav.medical', 'Medical Records')}
              </button>
              <button
                type="button"
                className={`sidebar-subnav-item ${activeLeaf === 'records-dental' ? 'active' : ''}`}
                onClick={() => handleNavClick('/admin/records/dental')}
              >
                {t('healthRecords.subnav.dental', 'Dental Records')}
              </button>
              <button
                type="button"
                className={`sidebar-subnav-item ${activeLeaf === 'records-vision' ? 'active' : ''}`}
                onClick={() => handleNavClick('/admin/records/vision')}
              >
                {t('healthRecords.subnav.vision', 'Vision Records')}
              </button>
            </div>
          )}
        </div>

        {/* OCR Verification with Submenu */}
        <div className="w-full flex flex-col">
          <button
            type="button"
            className={`sidebar-nav-item ${activeLeaf === 'ocr' ? 'active' : ''}`}
            onClick={() => {
              setIsOcrExpanded(!isOcrExpanded);
            }}
            aria-current={activeLeaf === 'ocr' ? 'page' : undefined}
            aria-expanded={isOcrExpanded}
          >
            <span className="sidebar-nav-icon">
              <img src={navOcrIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">
              {t('dashboard.nav.ocrVerification', 'OCR Verification')}
            </span>
            <div className="flex items-center gap-1.5 ml-auto">
              {ocrStatsQuery.isLoading ? (
                <span className="sidebar-badge sidebar-badge-loading animate-pulse" title="Loading total OCR records">
                  …
                </span>
              ) : ocrStatsQuery.isError ? (
                null
              ) : typeof totalOcrCount === 'number' && totalOcrCount > 0 ? (
                <span className="sidebar-badge sidebar-badge-red" title={`${totalOcrCount} total OCR records`}>
                  {totalOcrCount}
                </span>
              ) : typeof totalOcrCount === 'number' && totalOcrCount === 0 ? (
                <span className="sidebar-badge sidebar-badge-mint" title="0 total OCR records">
                  0
                </span>
              ) : null}
              <ChevronDown
                size={15}
                className={`transition-transform duration-200 ${
                  isOcrExpanded ? 'rotate-180 text-white' : 'text-[#ab8efd]'
                }`}
              />
            </div>
          </button>

          {isOcrExpanded && (
            <div className="sidebar-subnav-list">
              <button
                type="button"
                className={`sidebar-subnav-item ${activeLeaf === 'ocr-queue' ? 'active' : ''}`}
                onClick={() => handleNavClick('/admin/ocr/queue')}
              >
                {t('dashboard.nav.ocrProcessingQueue', 'Processing Queue')}
              </button>
              <button
                type="button"
                className={`sidebar-subnav-item ${activeLeaf === 'ocr-rejected' ? 'active' : ''}`}
                onClick={() => handleNavClick('/admin/ocr/rejected')}
              >
                {t('dashboard.nav.ocrRejected', 'Rejected Documents')}
              </button>
              <button
                type="button"
                className={`sidebar-subnav-item ${activeLeaf === 'ocr-history' ? 'active' : ''}`}
                onClick={() => handleNavClick('/admin/ocr/history')}
              >
                {t('dashboard.nav.ocrHistory', 'Review History')}
              </button>
            </div>
          )}
        </div>

        {/* Referrals with Submenu */}
        <div className="w-full flex flex-col">
          <button
            type="button"
            className={`sidebar-nav-item ${activeLeaf === 'referrals' ? 'active' : ''}`}
            onClick={() => {
              setIsReferralsExpanded(!isReferralsExpanded);
            }}
            aria-current={activeLeaf === 'referrals' ? 'page' : undefined}
            aria-expanded={isReferralsExpanded}
          >
            <span className="sidebar-nav-icon">
              <img src={navReferralsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">
              {t('dashboard.nav.referrals', 'Referrals')}
            </span>
            <div className="flex items-center gap-1.5 ml-auto">
              {referralStatsQuery.isLoading ? (
                <span className="sidebar-badge sidebar-badge-loading animate-pulse" title="Loading total referrals">
                  …
                </span>
              ) : referralStatsQuery.isError ? (
                null
              ) : typeof totalReferralsCount === 'number' ? (
                <span className="sidebar-badge sidebar-badge-amber" title={`${totalReferralsCount} total referrals`}>
                  {totalReferralsCount}
                </span>
              ) : null}
              <ChevronDown
                size={15}
                className={`transition-transform duration-200 ${
                  isReferralsExpanded ? 'rotate-180 text-white' : 'text-[#ab8efd]'
                }`}
              />
            </div>
          </button>

          {isReferralsExpanded && (
            <div className="sidebar-subnav-list">
              <button
                type="button"
                className={`sidebar-subnav-item ${activeLeaf === 'referrals-overview' ? 'active' : ''}`}
                onClick={() => handleNavClick('/admin/referrals')}
              >
                {t('dashboard.nav.referralsOverview', 'Overview')}
              </button>
              <button
                type="button"
                className={`sidebar-subnav-item ${activeLeaf === 'referrals-escalations' ? 'active' : ''}`}
                onClick={() => handleNavClick('/admin/referrals/escalations')}
              >
                {t('dashboard.nav.referralsMonitoring', 'Monitoring & Queue')}
              </button>
              <button
                type="button"
                className={`sidebar-subnav-item ${activeLeaf === 'referrals-audit' ? 'active' : ''}`}
                onClick={() => handleNavClick('/admin/referrals/audit')}
              >
                {t('dashboard.nav.referralAudit', 'Referral Audit')}
              </button>
            </div>
          )}
        </div>

        {/* Reports */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeLeaf === 'reports' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/reports')}
          aria-current={activeLeaf === 'reports' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <img src={navReportsIcon} alt="" />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.reports', 'Reports')}
          </span>
        </button>

        {/* Financing & Assistance (CR-02) */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeLeaf === 'financing' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/financing')}
          aria-current={activeLeaf === 'financing' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <CreditCard size={18} />
          </span>
          <span className="sidebar-nav-label">
            Financing (CR-02)
          </span>
        </button>

        {/* Consultation & Scheduling Hub (Goal 015 / 016) */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeLeaf === 'consultation-management' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/consultation-management')}
          aria-current={activeLeaf === 'consultation-management' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <Stethoscope size={18} />
          </span>
          <span className="sidebar-nav-label">
            Consultation Hub
          </span>
        </button>

        {/* Capacity Monitoring (CR-03 & CR-04) */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeLeaf === 'capacity' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/operations/capacity')}
          aria-current={activeLeaf === 'capacity' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <BarChart2 size={18} />
          </span>
          <span className="sidebar-nav-label">
            Capacity Monitor
          </span>
        </button>

        {/* Prescription Pickup Tracking (CR-08) */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeLeaf === 'prescriptions' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/operations/prescriptions')}
          aria-current={activeLeaf === 'prescriptions' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <Pill size={18} />
          </span>
          <span className="sidebar-nav-label">
            Prescription Pickup
          </span>
        </button>

        {/* Office Chat Oversight (CR-07) */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeLeaf === 'chat-oversight' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/communication/chat-oversight')}
          aria-current={activeLeaf === 'chat-oversight' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <MessageSquare size={18} />
          </span>
          <span className="sidebar-nav-label">
            Chat Oversight
          </span>
        </button>

        {/* CMS Content Management (PRD 4.4.10) */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeLeaf === 'cms' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/cms')}
          aria-current={activeLeaf === 'cms' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <FileText size={18} />
          </span>
          <span className="sidebar-nav-label">
            CMS Content
          </span>
        </button>

        {/* Divider */}
        <div className="sidebar-divider" role="separator" />

        {/* System Settings */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeLeaf === 'settings' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/settings/general')}
          aria-current={activeLeaf === 'settings' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <img src={navSettingsIcon} alt="" />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.systemSettings', 'System Settings')}
          </span>
        </button>

        {/* Audit Logs */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeLeaf === 'audit' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/audit-dashboard')}
          aria-current={activeLeaf === 'audit' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <img src={navAuditIcon} alt="" />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.auditLogs', 'Audit Logs')}
          </span>
        </button>

        {/* Security & Compliance (Figma 20:8001) */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeLeaf === 'security' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/security-compliance')}
          aria-current={activeLeaf === 'security' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <ShieldCheck size={18} />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.securityCompliance', 'Security & Compliance')}
          </span>
        </button>

        {/* Support & Notifications */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeLeaf === 'support' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/notifications')}
          aria-current={activeLeaf === 'support' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <img src={navSupportIcon} alt="" />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.support', 'Support & Notifications')}
          </span>
        </button>
      </nav>

      {/* Sidebar Footer Buttons */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-cta-btn"
          onClick={() => {
            if (onCtaClick) {
              onCtaClick();
            } else {
              handleNavClick('/admin/ocr/queue');
            }
          }}
        >
          {ctaLabel ? (
            <>
              <Plus size={18} />
              <span>{ctaLabel.replace(/^\+\s*/, '')}</span>
            </>
          ) : (
            <>
              <img src={navOcrBtnIcon} alt="" />
              <span>{t('dashboard.nav.reviewPendingOcr', 'Review Pending OCR')}</span>
            </>
          )}
        </button>

        <SidebarLogoutButton onLogout={handleLogout} />
      </div>
    </aside>
  );
};

export default AdminSidebar;
