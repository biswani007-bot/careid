import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, Plus } from 'lucide-react';

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

        {/* OCR Verification with Badge 12 */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeNav === 'ocr' || activeNav.startsWith('ocr-') ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/ocr/queue')}
          aria-current={activeNav === 'ocr' || activeNav.startsWith('ocr-') ? 'page' : undefined}
        >
          <span className="sidebar-nav-icon">
            <img src={navOcrIcon} alt="" />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.ocrVerification', 'OCR Verification')}
          </span>
          <span className="sidebar-badge sidebar-badge-red">12</span>
        </button>

        {/* Referrals with Badge 5 */}
        <button
          type="button"
          className={`sidebar-nav-item ${activeNav === 'referrals' ? 'active' : ''}`}
          onClick={() => handleNavClick('/admin/dashboard')}
        >
          <span className="sidebar-nav-icon">
            <img src={navReferralsIcon} alt="" />
          </span>
          <span className="sidebar-nav-label">
            {t('dashboard.nav.referrals', 'Referrals')}
          </span>
          <span className="sidebar-badge sidebar-badge-amber">5</span>
        </button>

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
              <span>{ctaLabel}</span>
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
