import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, Plus } from 'lucide-react';
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

export interface AdminSidebarProps {
  activeNav: string;
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

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

  const isOcrActive =
    activeNav === 'ocr' ||
    activeNav.startsWith('ocr-') ||
    location.pathname.startsWith('/admin/ocr');

  const [isOcrExpanded, setIsOcrExpanded] = useState(isOcrActive);

  useEffect(() => {
    if (isOcrActive) {
      setIsOcrExpanded(true);
    }
  }, [isOcrActive, location.pathname]);

  const isQueueActive =
    activeNav === 'ocr-queue' ||
    location.pathname === '/admin/ocr/queue' ||
    location.pathname === '/admin/ocr' ||
    location.pathname === '/admin/ocr-verification/queue' ||
    (activeNav === 'ocr' && !location.pathname.includes('/rejected') && !location.pathname.includes('/history'));

  const isRejectedActive =
    activeNav === 'ocr-rejected' ||
    location.pathname === '/admin/ocr/rejected' ||
    location.pathname === '/admin/ocr-verification/rejected';

  const isHistoryActive =
    activeNav === 'ocr-history' ||
    location.pathname === '/admin/ocr/history' ||
    location.pathname === '/admin/ocr-verification/history';

  const isReferralsActive =
    activeNav === 'referrals' ||
    activeNav.startsWith('referral') ||
    location.pathname.startsWith('/admin/referral');

  const [isReferralsExpanded, setIsReferralsExpanded] = useState(isReferralsActive);

  useEffect(() => {
    if (isReferralsActive) {
      setIsReferralsExpanded(true);
    }
  }, [isReferralsActive, location.pathname]);

  const isReferralAuditActive =
    activeNav === 'referrals-audit' ||
    location.pathname === '/admin/referrals/audit';

  const isReferralMonitoringActive =
    activeNav === 'referrals-escalations' ||
    location.pathname.startsWith('/admin/referrals/escalations');

  const isReferralOverviewActive =
    (activeNav === 'referrals' || activeNav === 'referrals-overview') &&
    !isReferralAuditActive &&
    !isReferralMonitoringActive;

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
          src={logoImg}
          alt="CareID"
          className="sidebar-logo"
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
          className={`sidebar-nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/dashboard')}
          aria-current={activeNav === 'dashboard' ? 'page' : undefined}
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
          className={`sidebar-nav-item ${activeNav === 'users' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/users')}
          aria-current={activeNav === 'users' ? 'page' : undefined}
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
          className={`sidebar-nav-item ${activeNav === 'patients' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/patients')}
          aria-current={activeNav === 'patients' ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <img src={navPatientsIcon} alt="" />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.patients', 'Patients')}
          </span>
        </button>

        {/* Doctors */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeNav === 'doctors' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/doctors')}
          aria-current={activeNav === 'doctors' ? 'page' : undefined}
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
          className={`sidebar-nav-item ${activeNav === 'facilities' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/facilities')}
        >
          <span className="sidebar-nav-icon">
            <img src={navFacilitiesIcon} alt="" />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.facilities', 'Facilities')}
          </span>
        </button>

        {/* Health Records */}
        <div className="w-full flex flex-col">
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'records' || activeNav.startsWith('records-') ? 'active' : ''}`}
            onClick={() => handleNavClick('/admin/records')}
            aria-current={activeNav === 'records' ? 'page' : undefined}
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
                activeNav === 'records' || activeNav.startsWith('records-') ? 'rotate-180 text-white' : 'text-[#ab8efd]'
              }`}
            />
          </button>

          {(activeNav === 'records' || activeNav.startsWith('records-')) && (
            <div className="sidebar-subnav-list">
              <button
                type="button"
                className={`sidebar-subnav-item ${activeNav === 'records-medical' ? 'active' : ''}`}
                onClick={() => handleNavClick('/admin/records/medical')}
              >
                {t('healthRecords.subnav.medical', 'Medical Records')}
              </button>
              <button
                type="button"
                className={`sidebar-subnav-item ${activeNav === 'records-dental' ? 'active' : ''}`}
                onClick={() => handleNavClick('/admin/records/dental')}
              >
                {t('healthRecords.subnav.dental', 'Dental Records')}
              </button>
              <button
                type="button"
                className={`sidebar-subnav-item ${activeNav === 'records-vision' ? 'active' : ''}`}
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
            className={`sidebar-nav-item ${isOcrActive ? 'active' : ''}`}
            onClick={() => {
              if (isOcrActive) {
                setIsOcrExpanded(!isOcrExpanded);
              } else {
                handleNavClick('/admin/ocr/queue');
              }
            }}
            aria-current={isOcrActive ? 'page' : undefined}
            aria-expanded={isOcrExpanded}
          >
            <span className="sidebar-nav-icon">
              <img src={navOcrIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">
              {t('dashboard.nav.ocrVerification', 'OCR Verification')}
            </span>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="sidebar-badge sidebar-badge-red">12</span>
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
                className={`sidebar-subnav-item ${isQueueActive ? 'active' : ''}`}
                onClick={() => handleNavClick('/admin/ocr/queue')}
              >
                {t('dashboard.nav.ocrProcessingQueue', 'Processing Queue')}
              </button>
              <button
                type="button"
                className={`sidebar-subnav-item ${isRejectedActive ? 'active' : ''}`}
                onClick={() => handleNavClick('/admin/ocr/rejected')}
              >
                {t('dashboard.nav.ocrRejected', 'Rejected Documents')}
              </button>
              <button
                type="button"
                className={`sidebar-subnav-item ${isHistoryActive ? 'active' : ''}`}
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
            className={`sidebar-nav-item ${isReferralsActive ? 'active' : ''}`}
            onClick={() => {
              if (isReferralsActive) {
                setIsReferralsExpanded(!isReferralsExpanded);
              } else {
                handleNavClick('/admin/referrals');
              }
            }}
            aria-current={isReferralsActive ? 'page' : undefined}
            aria-expanded={isReferralsExpanded}
          >
            <span className="sidebar-nav-icon">
              <img src={navReferralsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label">
              {t('dashboard.nav.referrals', 'Referrals')}
            </span>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="sidebar-badge sidebar-badge-amber">5</span>
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
                className={`sidebar-subnav-item ${isReferralOverviewActive ? 'active' : ''}`}
                onClick={() => handleNavClick('/admin/referrals')}
              >
                {t('dashboard.nav.referralsOverview', 'Overview')}
              </button>
              <button
                type="button"
                className={`sidebar-subnav-item ${isReferralMonitoringActive ? 'active' : ''}`}
                onClick={() => handleNavClick('/admin/referrals/escalations')}
              >
                {t('dashboard.nav.referralsMonitoring', 'Monitoring & Queue')}
              </button>
              <button
                type="button"
                className={`sidebar-subnav-item ${isReferralAuditActive ? 'active' : ''}`}
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
          className={`sidebar-nav-item ${activeNav === 'reports' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/dashboard')}
        >
          <span className="sidebar-nav-icon">
            <img src={navReportsIcon} alt="" />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.reports', 'Reports')}
          </span>
        </button>

        {/* Divider */}
        <div className="sidebar-divider" role="separator" />

        {/* System Settings */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeNav === 'settings' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/dashboard')}
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
          className={`sidebar-nav-item ${activeNav === 'audit' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/dashboard')}
        >
          <span className="sidebar-nav-icon">
            <img src={navAuditIcon} alt="" />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.auditLogs', 'Audit Logs')}
          </span>
        </button>

        {/* Support */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeNav === 'support' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/dashboard')}
        >
          <span className="sidebar-nav-icon">
            <img src={navSupportIcon} alt="" />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.support', 'Support')}
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
              handleNavClick('/admin/dashboard');
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
