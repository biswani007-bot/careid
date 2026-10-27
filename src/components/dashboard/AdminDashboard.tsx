import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  X,
  Plus,
  ArrowRight,
  TrendingUp,
  MoreVertical,
} from 'lucide-react';
import './AdminDashboard.css';

// Authentic Brand Assets from Figma Frame 20:151
import logoImg from '../../assets/dashboard/careid-logo.png';

// Nav Assets
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
import SidebarLogoutButton from '../common/SidebarLogoutButton';

// Header Assets
import headerBellIcon from '../../assets/dashboard/header-bell.svg';
import headerSettingsIcon from '../../assets/dashboard/header-settings.svg';
import headerAvatarImg from '../../assets/dashboard/header-avatar.png';

// KPI Assets
import kpiPatientsIcon from '../../assets/dashboard/kpi-patients.svg';
import kpiDoctorsIcon from '../../assets/dashboard/kpi-doctors.svg';
import kpiUsersIcon from '../../assets/dashboard/kpi-users.svg';
import kpiOcrIcon from '../../assets/dashboard/kpi-ocr.svg';
import kpiReferralsIcon from '../../assets/dashboard/kpi-referrals.svg';
import kpiApiIcon from '../../assets/dashboard/kpi-api.svg';

// Tasks Assets
import taskOcrIcon from '../../assets/dashboard/task-ocr.svg';
import taskReferralIcon from '../../assets/dashboard/task-referral.svg';
import taskDoctorIcon from '../../assets/dashboard/task-doctor.svg';

// Quick Actions & Logs Assets
import qaDoctorIcon from '../../assets/dashboard/qa-doctor.svg';
import qaOcrIcon from '../../assets/dashboard/qa-ocr.svg';
import qaReferralIcon from '../../assets/dashboard/qa-referral.svg';
import qaReportIcon from '../../assets/dashboard/qa-report.svg';
import logCheckIcon from '../../assets/dashboard/log-check.svg';
import logAlertIcon from '../../assets/dashboard/log-alert.svg';
import logUserIcon from '../../assets/dashboard/log-user.svg';
import logBackupIcon from '../../assets/dashboard/log-backup.svg';

export interface AdminDashboardProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ title: string; message: string } | null>(null);

  const handleNavClick = (id: string, name: string) => {
    setActiveNav(id);
    setIsDrawerOpen(false);
    if (id === 'dashboard') {
      if (onNavigate) onNavigate('/admin/dashboard');
      else navigate('/admin/dashboard');
      return;
    }
    if (id === 'users') {
      if (onNavigate) onNavigate('/admin/users');
      else navigate('/admin/users');
      return;
    }
    if (id === 'patients') {
      if (onNavigate) onNavigate('/admin/patients');
      else navigate('/admin/patients');
      return;
    }
    if (id === 'doctors') {
      if (onNavigate) onNavigate('/admin/doctors');
      else navigate('/admin/doctors');
      return;
    }
    if (id === 'facilities') {
      if (onNavigate) onNavigate('/admin/facilities');
      else navigate('/admin/facilities');
      return;
    }
    if (id === 'records' || id === 'health-records') {
      if (onNavigate) onNavigate('/admin/records');
      else navigate('/admin/records');
      return;
    }
    if (id === 'ocr' || id === 'ocr-verification') {
      if (onNavigate) onNavigate('/admin/ocr/queue');
      else navigate('/admin/ocr/queue');
      return;
    }
    setFeedbackModal({
      title: name,
      message: `The ${name} module is scheduled for incremental development in subsequent phases.`,
    });
  };

  const handleActionPrompt = (title: string, message: string) => {
    setFeedbackModal({ title, message });
  };

  const handleLogout = () => {
    setIsDrawerOpen(false);
    if (onLogout) {
      onLogout();
    } else if (onNavigate) {
      onNavigate('/');
    }
  };

  return (
    <div className="careid-dashboard-shell" data-node-id="20:151" aria-label="CareID Admin Portal Dashboard">
      {/* Mobile Drawer Backdrop */}
      <div
        className={`careid-drawer-backdrop ${isDrawerOpen ? 'drawer-open' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* ====================================================================
          20:444: PERSISTENT RESPONSIVE SIDEBAR
          ==================================================================== */}
      <aside
        className={`careid-sidebar ${isDrawerOpen ? 'drawer-open' : ''}`}
        data-node-id="20:444"
        aria-label="Main Navigation"
      >
        {/* Logo Container */}
        <div className="sidebar-logo-container" data-node-id="20:445">
          <img src={logoImg} alt="CareID" className="sidebar-logo" data-node-id="20:448" />
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* 20:449: Nav Items */}
        <nav className="sidebar-nav-list" data-node-id="20:449">
          {/* Active: Dashboard */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard', t('dashboard.nav.dashboard'))}
            data-node-id="20:450"
            aria-current={activeNav === 'dashboard' ? 'page' : undefined}
          >
            <span className="sidebar-nav-icon" data-node-id="20:451">
              <img src={navDashboardIcon} alt="" />
            </span>
            <span className="sidebar-nav-label" data-node-id="20:453">{t('dashboard.nav.dashboard')}</span>
          </button>

          {/* Users */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'users' ? 'active' : ''}`}
            onClick={() => handleNavClick('users', t('dashboard.nav.users'))}
            data-node-id="20:454"
          >
            <span className="sidebar-nav-icon" data-node-id="20:455">
              <img src={navUsersIcon} alt="" />
            </span>
            <span className="sidebar-nav-label" data-node-id="20:457">{t('dashboard.nav.users')}</span>
          </button>

          {/* Patients */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'patients' ? 'active' : ''}`}
            onClick={() => handleNavClick('patients', t('dashboard.nav.patients'))}
            data-node-id="20:458"
          >
            <span className="sidebar-nav-icon" data-node-id="20:459">
              <img src={navPatientsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label" data-node-id="20:461">{t('dashboard.nav.patients')}</span>
          </button>

          {/* Doctors */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'doctors' ? 'active' : ''}`}
            onClick={() => handleNavClick('doctors', t('dashboard.nav.doctors'))}
            data-node-id="20:462"
          >
            <span className="sidebar-nav-icon" data-node-id="20:463">
              <img src={navDoctorsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label" data-node-id="20:465">{t('dashboard.nav.doctors')}</span>
          </button>

          {/* Facilities */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'facilities' ? 'active' : ''}`}
            onClick={() => handleNavClick('facilities', t('dashboard.nav.facilities'))}
            data-node-id="20:466"
          >
            <span className="sidebar-nav-icon" data-node-id="20:467">
              <img src={navFacilitiesIcon} alt="" />
            </span>
            <span className="sidebar-nav-label" data-node-id="20:470">{t('dashboard.nav.facilities')}</span>
          </button>

          {/* Health Records */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'records' ? 'active' : ''}`}
            onClick={() => handleNavClick('records', t('dashboard.nav.healthRecords'))}
            data-node-id="20:471"
          >
            <span className="sidebar-nav-icon" data-node-id="20:472">
              <img src={navRecordsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label" data-node-id="20:474">{t('dashboard.nav.healthRecords')}</span>
          </button>

          {/* OCR Verification with Badge 12 */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'ocr' ? 'active' : ''}`}
            onClick={() => handleNavClick('ocr', t('dashboard.nav.ocrVerification'))}
            data-node-id="20:475"
          >
            <span className="sidebar-nav-icon" data-node-id="20:477">
              <img src={navOcrIcon} alt="" />
            </span>
            <span className="sidebar-nav-label" data-node-id="20:479">{t('dashboard.nav.ocrVerification')}</span>
            <span className="sidebar-badge sidebar-badge-red" data-node-id="20:480">
              12
            </span>
          </button>

          {/* Referrals with Badge 5 */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'referrals' ? 'active' : ''}`}
            onClick={() => handleNavClick('referrals', t('dashboard.nav.referrals'))}
            data-node-id="20:482"
          >
            <span className="sidebar-nav-icon" data-node-id="20:484">
              <img src={navReferralsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label" data-node-id="20:486">{t('dashboard.nav.referrals')}</span>
            <span className="sidebar-badge sidebar-badge-amber" data-node-id="20:487">
              5
            </span>
          </button>

          {/* Reports */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'reports' ? 'active' : ''}`}
            onClick={() => handleNavClick('reports', t('dashboard.nav.reports'))}
            data-node-id="20:489"
          >
            <span className="sidebar-nav-icon" data-node-id="20:490">
              <img src={navReportsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label" data-node-id="20:492">{t('dashboard.nav.reports')}</span>
          </button>

          {/* Divider */}
          <div className="sidebar-divider" data-node-id="20:493" role="separator" />

          {/* System Settings */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'settings' ? 'active' : ''}`}
            onClick={() => handleNavClick('settings', t('dashboard.nav.systemSettings'))}
            data-node-id="20:494"
          >
            <span className="sidebar-nav-icon" data-node-id="20:495">
              <img src={navSettingsIcon} alt="" />
            </span>
            <span className="sidebar-nav-label" data-node-id="20:497">{t('dashboard.nav.systemSettings')}</span>
          </button>

          {/* Audit Logs */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'audit' ? 'active' : ''}`}
            onClick={() => handleNavClick('audit', t('dashboard.nav.auditLogs'))}
            data-node-id="20:498"
          >
            <span className="sidebar-nav-icon" data-node-id="20:499">
              <img src={navAuditIcon} alt="" />
            </span>
            <span className="sidebar-nav-label" data-node-id="20:501">{t('dashboard.nav.auditLogs')}</span>
          </button>

          {/* Support */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'support' ? 'active' : ''}`}
            onClick={() => handleNavClick('support', t('dashboard.nav.support'))}
            data-node-id="20:502"
          >
            <span className="sidebar-nav-icon" data-node-id="20:503">
              <img src={navSupportIcon} alt="" />
            </span>
            <span className="sidebar-nav-label" data-node-id="20:505">{t('dashboard.nav.support')}</span>
          </button>
        </nav>

        {/* 20:506 - 20:515: Sidebar Footer Buttons */}
        <div className="sidebar-footer" data-node-id="20:506">
          <button
            type="button"
            className="sidebar-cta-btn"
            onClick={() =>
              handleActionPrompt(
                t('dashboard.nav.reviewPendingOcr'),
                'Navigating to OCR batch verification queue (Mock interaction for Phase 2 demo).'
              )
            }
            data-node-id="20:507"
          >
            <img src={navOcrBtnIcon} alt="" data-node-id="20:508" />
            <span data-node-id="20:510">{t('dashboard.nav.reviewPendingOcr')}</span>
          </button>

          <SidebarLogoutButton onLogout={handleLogout} />
        </div>
      </aside>

      {/* ====================================================================
          20:152: MAIN CONTENT WRAPPER
          ==================================================================== */}
      <div className="careid-main-wrapper" data-node-id="20:152">
        {/* 20:153: Top Navigation Bar */}
        <header className="careid-top-navbar" data-node-id="20:153">
          <div className="header-left-cluster">
            {/* Hamburger menu for mobile/tablet */}
            <button
              type="button"
              className="header-menu-toggle"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>

            {/* Quick shortcuts */}
            <nav className="header-nav-shortcuts" data-node-id="20:154" aria-label="Quick Navigation">
              <button
                type="button"
                className="header-shortcut-btn"
                onClick={() => {
                  if (onNavigate) onNavigate('/admin/doctors/create');
                  else navigate('/admin/doctors/create');
                }}
                data-node-id="20:155"
              >
                {t('dashboard.header.addDoctor')}
              </button>
              <button
                type="button"
                className="header-shortcut-btn"
                onClick={() => handleActionPrompt(t('dashboard.header.approveOcr'), 'Quick shortcut triggered for approving OCR batches.')}
                data-node-id="20:157"
              >
                {t('dashboard.header.approveOcr')}
              </button>
              <button
                type="button"
                className="header-shortcut-btn"
                onClick={() => handleActionPrompt(t('dashboard.header.reviewReferral'), 'Quick shortcut triggered for reviewing referrals.')}
                data-node-id="20:159"
              >
                {t('dashboard.header.reviewReferral')}
              </button>
              <button
                type="button"
                className="header-shortcut-btn"
                onClick={() => handleActionPrompt(t('dashboard.header.generateReport'), 'Quick shortcut triggered for generating reports.')}
                data-node-id="20:161"
              >
                {t('dashboard.header.generateReport')}
              </button>
            </nav>
          </div>

          <div className="header-right-cluster">
            {/* Security & Compliance Button */}
            <button
              type="button"
              className="header-security-btn"
              onClick={() =>
                handleActionPrompt(
                  t('dashboard.securityCompliance'),
                  'Security, HIPAA governance, and role-based policies overview (Mock status: fully compliant).'
                )
              }
              data-node-id="20:163"
            >
              {t('dashboard.securityCompliance')}
            </button>

            {/* Right Controls */}
            <div className="header-controls" data-node-id="20:166">
              {/* Notifications */}
              <button
                type="button"
                className="header-icon-btn"
                onClick={() =>
                  handleActionPrompt(
                    'Notifications',
                    'You have 1 high-priority notification: "Failed Login Attempt detected 15 mins ago".'
                  )
                }
                title="Notifications"
                data-node-id="20:167"
              >
                <img src={headerBellIcon} alt="Notifications" data-node-id="20:168" />
                <span className="notification-dot" data-node-id="20:170" aria-label="Unread notification" />
              </button>

              {/* Settings */}
              <button
                type="button"
                className="header-icon-btn"
                onClick={() =>
                  handleActionPrompt('Settings', 'System preferences and portal settings (Mock interaction).')
                }
                title="System Settings"
                data-node-id="20:171"
              >
                <img src={headerSettingsIcon} alt="Settings" data-node-id="20:172" />
              </button>

              {/* Admin Avatar */}
              <button
                type="button"
                className="header-avatar-btn"
                onClick={() =>
                  handleActionPrompt(
                    'Administrator Profile',
                    'Signed in as Dr. Evelyn Vance (SuperAdmin). Demo session active.'
                  )
                }
                title="Dr. Evelyn Vance - Profile"
                data-node-id="20:174"
              >
                <img src={headerAvatarImg} alt="Dr. Evelyn Vance" data-node-id="20:176" />
              </button>
            </div>
          </div>
        </header>

        {/* 20:177: Main Canvas */}
        <main className="careid-main-canvas" data-node-id="20:177">
          {/* 20:179: Heading & Header Actions */}
          <div className="dashboard-heading-section" data-node-id="20:179">
            <div className="dashboard-title-area" data-node-id="20:180">
              <h1 className="dashboard-heading-title" data-node-id="20:182">
                {t('dashboard.title')}
              </h1>
              <p className="dashboard-heading-subtitle" data-node-id="20:184">
                {t('dashboard.subtitle')}
              </p>
            </div>

            <div className="dashboard-header-actions" data-node-id="20:185">
              <button
                type="button"
                className="btn-export-data"
                onClick={() =>
                  handleActionPrompt(
                    t('dashboard.exportData'),
                    'Initiating export for current system metrics (Demo: simulated CSV/PDF generation).'
                  )
                }
                data-node-id="20:186"
              >
                {t('dashboard.exportData')}
              </button>
              <button
                type="button"
                className="btn-new-record"
                onClick={() =>
                  handleActionPrompt(
                    t('dashboard.newRecord'),
                    'Opening New Health Record modal (Phase 2 demo placeholder).'
                  )
                }
                data-node-id="20:188"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span data-node-id="20:191">{t('dashboard.newRecord')}</span>
              </button>
            </div>
          </div>

          {/* 20:192: Fluid Responsive Dashboard Content Grid */}
          <div className="dashboard-grid-container" data-node-id="20:192">
            {/* --------------------------------------------------------------
                20:193: Left Column (Metrics + Table)
                -------------------------------------------------------------- */}
            <div className="dashboard-left-column" data-node-id="20:193">
              {/* 20:194: Bento Grid (6 Summary KPI Cards) */}
              <section className="bento-metrics-grid" data-node-id="20:194" aria-label="Key Performance Indicators">
                {/* Card 1: Total Patients */}
                <article className="bento-metric-card" data-node-id="20:195">
                  <div className="card-ambient-blur blur-teal" data-node-id="20:196" />
                  <div className="card-top-row" data-node-id="20:197">
                    <div className="card-icon-box" data-node-id="20:198">
                      <img src={kpiPatientsIcon} alt="" data-node-id="20:200" />
                    </div>
                    <span className="card-badge badge-mint" data-node-id="20:201">
                      <TrendingUp size={13} strokeWidth={2.5} />
                      <span data-node-id="20:204">4.2%</span>
                    </span>
                  </div>
                  <div className="card-bottom-row" data-node-id="20:205">
                    <div className="card-data-info" data-node-id="20:206">
                      <span className="card-data-label" data-node-id="20:207">{t('dashboard.kpi.totalPatients')}</span>
                      <span className="card-data-value" data-node-id="20:209">142,854</span>
                    </div>
                  </div>
                </article>

                {/* Card 2: Total Doctors */}
                <article
                  className="bento-metric-card cursor-pointer transition-transform hover:scale-[1.01]"
                  data-node-id="20:210"
                  onClick={() => {
                    if (onNavigate) onNavigate('/admin/doctors');
                    else navigate('/admin/doctors');
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (onNavigate) onNavigate('/admin/doctors');
                      else navigate('/admin/doctors');
                    }
                  }}
                  aria-label="View Doctor Directory"
                >
                  <div className="card-ambient-blur blur-purple" data-node-id="20:211" />
                  <div className="card-top-row" data-node-id="20:212">
                    <div className="card-icon-box" data-node-id="20:213">
                      <img src={kpiDoctorsIcon} alt="" data-node-id="20:215" />
                    </div>
                    <span className="card-badge badge-mint" data-node-id="20:216">
                      <TrendingUp size={13} strokeWidth={2.5} />
                      <span data-node-id="20:219">1.8%</span>
                    </span>
                  </div>
                  <div className="card-bottom-row" data-node-id="20:220">
                    <div className="card-data-info" data-node-id="20:221">
                      <span className="card-data-label" data-node-id="20:222">{t('dashboard.kpi.totalDoctors')}</span>
                      <span className="card-data-value" data-node-id="20:224">3,205</span>
                    </div>
                  </div>
                </article>

                {/* Card 3: Active Users */}
                <article className="bento-metric-card" data-node-id="20:225">
                  <div className="card-ambient-blur blur-yellow" data-node-id="20:226" />
                  <div className="card-top-row" data-node-id="20:227">
                    <div className="card-icon-box" data-node-id="20:228">
                      <img src={kpiUsersIcon} alt="" data-node-id="20:230" />
                    </div>
                    <span className="card-badge badge-live" data-node-id="20:231">
                      <span data-node-id="20:232">{t('dashboard.kpi.live')}</span>
                    </span>
                  </div>
                  <div className="card-bottom-row" data-node-id="20:233">
                    <div className="card-data-info" data-node-id="20:234">
                      <span className="card-data-label" data-node-id="20:235">{t('dashboard.kpi.activeUsers')}</span>
                      <span className="card-data-value" data-node-id="20:237">847</span>
                    </div>
                  </div>
                </article>

                {/* Card 4: Pending OCR */}
                <article className="bento-metric-card card-ocr" data-node-id="20:238">
                  <div className="card-ambient-blur blur-red" data-node-id="20:239" />
                  <div className="card-top-row" data-node-id="20:240">
                    <div className="card-icon-box icon-box-red" data-node-id="20:241">
                      <img src={kpiOcrIcon} alt="" data-node-id="20:243" />
                    </div>
                    <span className="card-badge badge-red-outline" data-node-id="20:244">
                      <span data-node-id="20:245">Attention<br />Required</span>
                    </span>
                  </div>
                  <div className="card-bottom-row" data-node-id="20:246">
                    <div className="card-data-info" data-node-id="20:247">
                      <span className="card-data-label label-red" data-node-id="20:249">{t('dashboard.kpi.pendingOcr')}</span>
                      <span className="card-data-value" data-node-id="20:251">12</span>
                    </div>
                    <button
                      type="button"
                      className="card-arrow-btn"
                      onClick={() => handleActionPrompt(t('dashboard.kpi.pendingOcr'), '12 OCR verification batches require attention.')}
                      data-node-id="20:252"
                      title="View Pending OCR"
                    >
                      <ArrowRight size={18} color="#ba1a1a" strokeWidth={2.5} />
                    </button>
                  </div>
                </article>

                {/* Card 5: Pending Referrals */}
                <article className="bento-metric-card card-referrals" data-node-id="20:255">
                  <div className="card-ambient-blur blur-yellow" data-node-id="20:256" />
                  <div className="card-top-row" data-node-id="20:257">
                    <div className="card-icon-box icon-box-amber" data-node-id="20:258">
                      <img src={kpiReferralsIcon} alt="" data-node-id="20:260" />
                    </div>
                    <span className="card-badge badge-amber-outline" data-node-id="20:261">
                      <span data-node-id="20:262">{t('dashboard.kpi.warning')}</span>
                    </span>
                  </div>
                  <div className="card-bottom-row" data-node-id="20:263">
                    <div className="card-data-info" data-node-id="20:264">
                      <span className="card-data-label label-amber" data-node-id="20:266">PENDING<br />REFERRALS</span>
                      <span className="card-data-value" data-node-id="20:268">5</span>
                    </div>
                    <button
                      type="button"
                      className="card-arrow-btn"
                      onClick={() => handleActionPrompt(t('dashboard.kpi.pendingReferrals'), '5 doctor referrals are awaiting clinical review.')}
                      data-node-id="20:269"
                      title="View Pending Referrals"
                    >
                      <ArrowRight size={18} color="#5b4300" strokeWidth={2.5} />
                    </button>
                  </div>
                </article>

                {/* Card 6: System Health */}
                <article className="bento-metric-card card-system" data-node-id="20:272">
                  <div className="card-ambient-blur blur-teal" data-node-id="20:273" />
                  <div className="card-top-row" data-node-id="20:274">
                    <div className="card-icon-box icon-box-cyan" data-node-id="20:275">
                      <img src={kpiApiIcon} alt="" data-node-id="20:277" />
                    </div>
                    <span className="card-badge badge-mint" style={{ border: '1px solid rgba(0,106,96,0.2)' }} data-node-id="20:278">
                      <span data-node-id="20:279">{t('dashboard.kpi.healthy')}</span>
                    </span>
                  </div>
                  <div className="card-bottom-row" data-node-id="20:280">
                    <div className="card-data-info" data-node-id="20:281">
                      <span className="card-data-label label-teal" data-node-id="20:283">{t('dashboard.kpi.systemApi')}</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span className="card-data-value" data-node-id="20:285">99.9%</span>
                        <span style={{ fontSize: '12px', color: '#494552' }} data-node-id="20:286">{t('dashboard.kpi.uptime')}</span>
                      </div>
                    </div>
                    <div className="sparkline-container" data-node-id="20:287" title="API latency and uptime metrics">
                      <div className="sparkline-bar" style={{ height: '9px' }} data-node-id="20:288" />
                      <div className="sparkline-bar" style={{ height: '14px' }} data-node-id="20:289" />
                      <div className="sparkline-bar" style={{ height: '19px' }} data-node-id="20:290" />
                      <div className="sparkline-bar" style={{ height: '12px' }} data-node-id="20:291" />
                      <div className="sparkline-bar" style={{ height: '21px' }} data-node-id="20:292" />
                      <div className="sparkline-bar" style={{ height: '24px' }} data-node-id="20:293" />
                    </div>
                  </div>
                </article>
              </section>

              {/* 20:294: High Priority Tasks Table Area */}
              <section className="priority-tasks-card" data-node-id="20:294" aria-label="High Priority Tasks">
                <header className="tasks-card-header" data-node-id="20:295">
                  <div className="tasks-header-title-box" data-node-id="20:296">
                    <h2 className="tasks-header-title" data-node-id="20:298">
                      {t('dashboard.tasks.title')}
                    </h2>
                    <p className="tasks-header-subtitle" data-node-id="20:300">
                      {t('dashboard.tasks.subtitle')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="tasks-view-all-btn"
                    onClick={() => handleActionPrompt(t('dashboard.tasks.title'), 'Showing all pending administrative priority items (Phase 2 demo).')}
                    data-node-id="20:301"
                  >
                    {t('dashboard.tasks.viewAll')}
                  </button>
                </header>

                <div className="tasks-table-scroll-wrapper" data-node-id="20:303">
                  <table className="tasks-table">
                    <thead>
                      <tr data-node-id="20:304">
                        <th data-node-id="20:306">{t('dashboard.tasks.headers.taskType')}</th>
                        <th data-node-id="20:308">{t('dashboard.tasks.headers.entity')}</th>
                        <th data-node-id="20:310">{t('dashboard.tasks.headers.submitted')}</th>
                        <th data-node-id="20:312">{t('dashboard.tasks.headers.status')}</th>
                        <th data-node-id="20:314">{t('dashboard.tasks.headers.action')}</th>
                      </tr>
                    </thead>
                    <tbody data-node-id="20:315">
                      {/* Row 1: OCR Verification */}
                      <tr data-node-id="20:316">
                        <td data-node-id="20:317">
                          <div className="task-type-cell">
                            <span className="task-type-icon" data-node-id="20:318">
                              <img src={taskOcrIcon} alt="" />
                            </span>
                            <span data-node-id="20:320">OCR Verification</span>
                          </div>
                        </td>
                        <td data-node-id="20:321">
                          <span className="task-entity-text" data-node-id="20:322">
                            Batch #8492 - Lab Results
                          </span>
                        </td>
                        <td data-node-id="20:323">
                          <span className="task-time-text" data-node-id="20:324">
                            10 mins ago
                          </span>
                        </td>
                        <td data-node-id="20:325">
                          <span className="task-status-badge status-critical" data-node-id="20:326">
                            Critical
                          </span>
                        </td>
                        <td className="task-action-cell" data-node-id="20:328">
                          <button
                            type="button"
                            className="btn-table-action-primary"
                            onClick={() =>
                              handleActionPrompt(
                                'Review OCR Batch #8492',
                                'Opening OCR comparison viewer for Lab Results (Mock action).'
                              )
                            }
                            data-node-id="20:329"
                          >
                            {t('dashboard.tasks.review')}
                          </button>
                        </td>
                      </tr>

                      {/* Row 2: Referral Review */}
                      <tr data-node-id="20:331">
                        <td data-node-id="20:332">
                          <div className="task-type-cell">
                            <span className="task-type-icon" data-node-id="20:333">
                              <img src={taskReferralIcon} alt="" />
                            </span>
                            <span data-node-id="20:335">Referral Review</span>
                          </div>
                        </td>
                        <td data-node-id="20:336">
                          <span className="task-entity-text" data-node-id="20:337">
                            Dr. Sarah Jenkins to Cardiology
                          </span>
                        </td>
                        <td data-node-id="20:338">
                          <span className="task-time-text" data-node-id="20:339">
                            1 hr ago
                          </span>
                        </td>
                        <td data-node-id="20:340">
                          <span className="task-status-badge status-pending" data-node-id="20:341">
                            Pending
                          </span>
                        </td>
                        <td className="task-action-cell" data-node-id="20:343">
                          <button
                            type="button"
                            className="btn-table-action-outline"
                            onClick={() =>
                              handleActionPrompt(
                                'Process Referral',
                                'Processing referral dispatch for Dr. Sarah Jenkins (Mock action).'
                              )
                            }
                            data-node-id="20:344"
                          >
                            {t('dashboard.tasks.process')}
                          </button>
                        </td>
                      </tr>

                      {/* Row 3: New Doctor Profile */}
                      <tr data-node-id="20:346">
                        <td data-node-id="20:347">
                          <div
                            className="task-type-cell cursor-pointer"
                            onClick={() => {
                              if (onNavigate) onNavigate('/admin/doctors');
                              else navigate('/admin/doctors');
                            }}
                          >
                            <span className="task-type-icon" data-node-id="20:348">
                              <img src={taskDoctorIcon} alt="" />
                            </span>
                            <span data-node-id="20:350">New Doctor Profile</span>
                          </div>
                        </td>
                        <td data-node-id="20:351">
                          <span
                            className="task-entity-text cursor-pointer hover:underline"
                            data-node-id="20:352"
                            onClick={() => {
                              if (onNavigate) onNavigate('/admin/doctors');
                              else navigate('/admin/doctors');
                            }}
                          >
                            Dr. Alan Grant (Neurology)
                          </span>
                        </td>
                        <td data-node-id="20:353">
                          <span className="task-time-text" data-node-id="20:354">
                            2 hrs ago
                          </span>
                        </td>
                        <td data-node-id="20:355">
                          <span className="task-status-badge status-review" data-node-id="20:356">
                            Review
                          </span>
                        </td>
                        <td className="task-action-cell" data-node-id="20:358">
                          <button
                            type="button"
                            className="btn-table-action-outline"
                            onClick={() =>
                              handleActionPrompt(
                                'Approve Doctor Profile',
                                'Credential approval simulated for Dr. Alan Grant (Neurology).'
                              )
                            }
                            data-node-id="20:359"
                          >
                            {t('dashboard.tasks.approve')}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* --------------------------------------------------------------
                20:361: Right Column (Quick Actions & System Logs)
                -------------------------------------------------------------- */}
            <div className="dashboard-right-column" data-node-id="20:361">
              {/* 20:362: Quick Actions Grid */}
              <section className="quick-actions-card" data-node-id="20:362" aria-label="Quick Actions">
                <h2 className="quick-actions-title" data-node-id="20:364">
                  {t('dashboard.quickActions.title')}
                </h2>
                <div className="quick-actions-grid" data-node-id="20:365">
                  <button
                    type="button"
                    className="quick-action-btn"
                    onClick={() => {
                      if (onNavigate) onNavigate('/admin/doctors/create');
                      else navigate('/admin/doctors/create');
                    }}
                    data-node-id="20:366"
                  >
                    <img src={qaDoctorIcon} alt="" data-node-id="20:368" />
                    <span data-node-id="20:370">{t('dashboard.quickActions.addDoctor')}</span>
                  </button>

                  <button
                    type="button"
                    className="quick-action-btn"
                    onClick={() => handleActionPrompt(t('dashboard.quickActions.approveOcr'), 'Trigger batch approval pipeline for OCR (Phase 2 demo).')}
                    data-node-id="20:371"
                  >
                    <img src={qaOcrIcon} alt="" data-node-id="20:373" />
                    <span data-node-id="20:375">{t('dashboard.quickActions.approveOcr')}</span>
                  </button>

                  <button
                    type="button"
                    className="quick-action-btn"
                    onClick={() => handleActionPrompt(t('dashboard.quickActions.reviewReferral'), 'Queue cardiology and pediatric referrals (Phase 2 demo).')}
                    data-node-id="20:376"
                  >
                    <img src={qaReferralIcon} alt="" data-node-id="20:378" />
                    <span data-node-id="20:380">{t('dashboard.quickActions.reviewReferral')}</span>
                  </button>

                  <button
                    type="button"
                    className="quick-action-btn"
                    onClick={() => handleActionPrompt(t('dashboard.quickActions.generateReport'), 'Generate monthly executive compliance summary (Phase 2 demo).')}
                    data-node-id="20:381"
                  >
                    <img src={qaReportIcon} alt="" data-node-id="20:383" />
                    <span data-node-id="20:385">{t('dashboard.quickActions.generateReport')}</span>
                  </button>
                </div>
              </section>

              {/* 20:386: System Logs Activity Feed */}
              <section className="system-logs-card" data-node-id="20:386" aria-label="System Activity Logs">
                <header className="system-logs-header" data-node-id="20:387">
                  <h2 className="system-logs-title" data-node-id="20:389">
                    {t('dashboard.systemLogs.title')}
                  </h2>
                  <button
                    type="button"
                    className="system-logs-kebab-btn"
                    onClick={() => handleActionPrompt('System Logs Options', 'Filter, search, or configure audit logging stream.')}
                    title="Log Options"
                    data-node-id="20:390"
                  >
                    <MoreVertical size={16} />
                  </button>
                </header>

                <div className="system-logs-list" data-node-id="20:393">
                  {/* Event 1: OCR Batch */}
                  <div className="log-item-row" data-node-id="20:394">
                    <div className="log-item-connector" data-node-id="20:398" />
                    <div className="log-item-icon-circle log-icon-cyan" data-node-id="20:395">
                      <img src={logCheckIcon} alt="" data-node-id="20:397" />
                    </div>
                    <div className="log-item-content" data-node-id="20:399">
                      <span className="log-item-time" data-node-id="20:401">Just now</span>
                      <strong className="log-item-title" data-node-id="20:403">
                        OCR Batch #8491 Processed
                      </strong>
                      <p className="log-item-desc" data-node-id="20:405">
                        45 documents successfully digitized and mapped to patient records by System Auto-parser.
                      </p>
                    </div>
                  </div>

                  {/* Event 2: Failed Login */}
                  <div className="log-item-row" data-node-id="20:406">
                    <div className="log-item-connector" data-node-id="20:410" />
                    <div className="log-item-icon-circle log-icon-red" data-node-id="20:407">
                      <img src={logAlertIcon} alt="" data-node-id="20:409" />
                    </div>
                    <div className="log-item-content" data-node-id="20:411">
                      <span className="log-item-time" data-node-id="20:413">15 mins ago</span>
                      <strong className="log-item-title" data-node-id="20:415">
                        Failed Login Attempt
                      </strong>
                      <p className="log-item-desc" data-node-id="20:417">
                        Multiple failed attempts detected for user ID: admin_support_02. Account temporarily locked.
                      </p>
                    </div>
                  </div>

                  {/* Event 3: New Admin Provisioned */}
                  <div className="log-item-row" data-node-id="20:418">
                    <div className="log-item-connector" data-node-id="20:422" />
                    <div className="log-item-icon-circle log-icon-gray" data-node-id="20:419">
                      <img src={logUserIcon} alt="" data-node-id="20:421" />
                    </div>
                    <div className="log-item-content" data-node-id="20:423">
                      <span className="log-item-time" data-node-id="20:425">2 hours ago</span>
                      <strong className="log-item-title" data-node-id="20:427">
                        New Admin Provisioned
                      </strong>
                      <p className="log-item-desc" data-node-id="20:429">
                        J. Smith added to role 'Compliance Officer' by SuperAdmin.
                      </p>
                    </div>
                  </div>

                  {/* Event 4: Database Backup */}
                  <div className="log-item-row" data-node-id="20:430">
                    <div className="log-item-connector" data-node-id="20:434" />
                    <div className="log-item-icon-circle log-icon-amber" data-node-id="20:431">
                      <img src={logBackupIcon} alt="" data-node-id="20:433" />
                    </div>
                    <div className="log-item-content" data-node-id="20:434">
                      <span className="log-item-time" data-node-id="20:436">4 hours ago</span>
                      <strong className="log-item-title" data-node-id="20:438">
                        Database Backup Complete
                      </strong>
                      <p className="log-item-desc" data-node-id="20:440">
                        Routine snapshot secured to cold storage region US-East.
                      </p>
                    </div>
                  </div>
                </div>

                <footer className="system-logs-footer" data-node-id="20:441">
                  <button
                    type="button"
                    className="system-logs-view-all-btn"
                    onClick={() =>
                      handleActionPrompt(
                        'Full Audit Log',
                        'Displaying comprehensive system immutable audit trail (Phase 2 demo).'
                      )
                    }
                    data-node-id="20:442"
                  >
                    {t('dashboard.systemLogs.viewFull')}
                  </button>
                </footer>
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* Interactive Modal for Mock Controls */}
      {feedbackModal && (
        <div
          className="careid-toast-backdrop"
          onClick={() => setFeedbackModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="careid-toast-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="careid-toast-title">{feedbackModal.title}</h3>
            <p className="careid-toast-msg">{feedbackModal.message}</p>
            <button
              type="button"
              className="careid-toast-btn"
              onClick={() => setFeedbackModal(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
