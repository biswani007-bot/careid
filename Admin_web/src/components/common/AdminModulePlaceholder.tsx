import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Home,
  Building2,
  Palette,
  ShieldCheck,
  UserCheck,
  Bell,
  Database,
  ArrowRight,
  LifeBuoy,
  Phone,
  Mail,
  FileText,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import avatarAdminImg from '../../assets/dashboard/header-avatar.png';
import '../settings/AdminSystemSettingsGeneral.css';

export interface AdminModulePlaceholderProps {
  moduleName: string;
  category: 'settings' | 'support' | 'general';
  description: string;
  activeNav?: string;
  settingsTab?: 'general' | 'branding' | 'security' | 'roles' | 'ocr' | 'integrations';
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminModulePlaceholder: React.FC<AdminModulePlaceholderProps> = ({
  moduleName,
  category,
  description,
  activeNav = category === 'settings' ? 'settings' : category === 'support' ? 'support' : 'dashboard',
  settingsTab,
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleNav = (path: string) => {
    setIsDrawerOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const handleSettingsTabClick = (path: string) => {
    handleNav(path);
  };

  return (
    <div className="careid-settings-shell flex min-h-screen bg-[#faf9fd] text-[#191c1e]">
      {/* Mobile Drawer Backdrop */}
      {isDrawerOpen && (
        <div
          className="careid-drawer-backdrop drawer-open"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Persistent Sidebar */}
      <AdminSidebar
        activeNav={activeNav}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
        ctaLabel="+ New Record"
        onCtaClick={() => handleNav('/admin/records/upload')}
      />

      {/* Main Layout Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="settings-top-navbar flex items-center justify-between px-6 py-3.5 bg-white border-b border-[#e1e2e4]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="settings-mobile-menu-btn md:hidden p-2 text-[#494552] hover:text-[#28006d]"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            {/* Breadcrumb Path */}
            <nav className="settings-breadcrumb flex items-center gap-2 text-sm text-[#494552]" aria-label="Breadcrumbs">
              <button
                type="button"
                className="hover:text-[#28006d] transition-colors flex items-center"
                onClick={() => handleNav('/admin/dashboard')}
                title="Dashboard"
              >
                <Home size={15} />
              </button>
              <span className="text-[#cac4d0]">/</span>
              <button
                type="button"
                className="hover:text-[#28006d] transition-colors"
                onClick={() => handleNav('/admin/dashboard')}
              >
                {t('systemSettings.breadcrumb.portal', 'Admin Portal')}
              </button>
              <span className="text-[#cac4d0]">/</span>
              {category === 'settings' ? (
                <>
                  <button
                    type="button"
                    className="hover:text-[#28006d] transition-colors"
                    onClick={() => handleNav('/admin/settings/general')}
                  >
                    {t('systemSettings.breadcrumb.settings', 'System Settings')}
                  </button>
                  <span className="text-[#cac4d0]">/</span>
                  <span className="font-semibold text-[#28006d]" aria-current="page">
                    {moduleName}
                  </span>
                </>
              ) : (
                <span className="font-semibold text-[#28006d]" aria-current="page">
                  {moduleName}
                </span>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-[#e1e2e4]">
              <img src={avatarAdminImg} alt="Admin" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="p-6 md:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
          {category === 'settings' && (
            <>
              {/* Settings Header Banner */}
              <div className="settings-header-banner bg-[#28006d] text-white p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white uppercase tracking-wider">
                      Configuration Console
                    </span>
                    <span className="text-xs text-purple-200">System Governance</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">Care ID Admin – System Settings</h1>
                  <p className="text-sm text-purple-200 mt-1">
                    Manage organization metadata, brand identity, access policies, and integrations.
                  </p>
                </div>
              </div>

              {/* Persistent 6-Tab Settings Navigation */}
              <nav className="settings-tabs-card bg-white border border-[#e1e2e4] rounded-xl overflow-x-auto shadow-sm" aria-label="Settings navigation">
                <div className="settings-tabs-list flex items-center min-w-max p-1 gap-1" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={settingsTab === 'general'}
                    className={`settings-tab-btn flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      settingsTab === 'general'
                        ? 'bg-[#f2e7fe] text-[#3f1d8b] font-semibold'
                        : 'text-[#494552] hover:bg-[#f8f9fb] hover:text-[#191c1e]'
                    }`}
                    onClick={() => handleSettingsTabClick('/admin/settings/general')}
                  >
                    <Building2 size={16} />
                    <span>General & Organization</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={settingsTab === 'branding'}
                    className={`settings-tab-btn flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      settingsTab === 'branding'
                        ? 'bg-[#f2e7fe] text-[#3f1d8b] font-semibold'
                        : 'text-[#494552] hover:bg-[#f8f9fb] hover:text-[#191c1e]'
                    }`}
                    onClick={() => handleSettingsTabClick('/admin/settings/branding')}
                  >
                    <Palette size={16} />
                    <span>Branding & Identity</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={settingsTab === 'security'}
                    className={`settings-tab-btn flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      settingsTab === 'security'
                        ? 'bg-[#f2e7fe] text-[#3f1d8b] font-semibold'
                        : 'text-[#494552] hover:bg-[#f8f9fb] hover:text-[#191c1e]'
                    }`}
                    onClick={() => handleSettingsTabClick('/admin/settings/security')}
                  >
                    <ShieldCheck size={16} />
                    <span>Security Policies</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={settingsTab === 'roles'}
                    className={`settings-tab-btn flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      settingsTab === 'roles'
                        ? 'bg-[#f2e7fe] text-[#3f1d8b] font-semibold'
                        : 'text-[#494552] hover:bg-[#f8f9fb] hover:text-[#191c1e]'
                    }`}
                    onClick={() => handleSettingsTabClick('/admin/settings/roles')}
                  >
                    <UserCheck size={16} />
                    <span>Roles & Permissions</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={settingsTab === 'ocr'}
                    className={`settings-tab-btn flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      settingsTab === 'ocr'
                        ? 'bg-[#f2e7fe] text-[#3f1d8b] font-semibold'
                        : 'text-[#494552] hover:bg-[#f8f9fb] hover:text-[#191c1e]'
                    }`}
                    onClick={() => handleSettingsTabClick('/admin/settings/ocr')}
                  >
                    <Bell size={16} />
                    <span>OCR & Notifications</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={settingsTab === 'integrations'}
                    className={`settings-tab-btn flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      settingsTab === 'integrations'
                        ? 'bg-[#f2e7fe] text-[#3f1d8b] font-semibold'
                        : 'text-[#494552] hover:bg-[#f8f9fb] hover:text-[#191c1e]'
                    }`}
                    onClick={() => handleSettingsTabClick('/admin/settings/integrations')}
                  >
                    <Database size={16} />
                    <span>Integrations & Backup</span>
                  </button>
                </div>
              </nav>
            </>
          )}

          {/* Page-Level State Card (No dialog/modal) */}
          <section className="bg-white border border-[#e1e2e4] rounded-2xl p-8 md:p-12 shadow-sm text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-[#f2e7fe] text-[#3f1d8b] flex items-center justify-center mb-5 shadow-inner">
              {category === 'support' ? (
                <LifeBuoy size={32} />
              ) : settingsTab === 'security' ? (
                <ShieldCheck size={32} />
              ) : settingsTab === 'roles' ? (
                <UserCheck size={32} />
              ) : settingsTab === 'ocr' ? (
                <Bell size={32} />
              ) : settingsTab === 'integrations' ? (
                <Database size={32} />
              ) : (
                <Clock size={32} />
              )}
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#e8def8] text-[#3f1d8b] mb-3">
              <span>Planned Module</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#3f1d8b]" />
              <span>Version Roadmap</span>
            </div>

            <h2 className="text-2xl font-bold text-[#191c1e] mb-2">{moduleName}</h2>
            <p className="text-sm text-[#494552] max-w-xl mb-8 leading-relaxed">
              {description}
            </p>

            {category === 'support' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-8 text-left">
                <div className="p-4 rounded-xl border border-[#e1e2e4] bg-[#faf9fd]">
                  <Phone size={18} className="text-[#3f1d8b] mb-2" />
                  <h4 className="font-semibold text-xs text-[#191c1e]">Admin Hotline</h4>
                  <p className="text-xs text-[#494552] mt-0.5">+1 (800) 555-CARE</p>
                  <span className="text-[10px] text-teal-700 font-medium">24/7 Priority Desk</span>
                </div>
                <div className="p-4 rounded-xl border border-[#e1e2e4] bg-[#faf9fd]">
                  <Mail size={18} className="text-[#3f1d8b] mb-2" />
                  <h4 className="font-semibold text-xs text-[#191c1e]">Security Support</h4>
                  <p className="text-xs text-[#494552] mt-0.5">security@careid-health.org</p>
                  <span className="text-[10px] text-[#494552]">HIPAA Level Response</span>
                </div>
                <div className="p-4 rounded-xl border border-[#e1e2e4] bg-[#faf9fd]">
                  <FileText size={18} className="text-[#3f1d8b] mb-2" />
                  <h4 className="font-semibold text-xs text-[#191c1e]">Compliance Docs</h4>
                  <p className="text-xs text-[#494552] mt-0.5">SOC2 & ISO 27001</p>
                  <span className="text-[10px] text-[#3f1d8b] font-medium">Portal Guides v2.4</span>
                </div>
              </div>
            ) : null}

            {/* Direct Navigation Links */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {category === 'settings' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleNav('/admin/settings/general')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3f1d8b] hover:bg-[#28006d] text-white text-sm font-semibold transition-all shadow-sm"
                  >
                    <Building2 size={16} />
                    <span>View General & Organization</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNav('/admin/settings/branding')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#cbc4d4] hover:bg-[#f8f9fb] text-[#191c1e] text-sm font-semibold transition-all"
                  >
                    <Palette size={16} />
                    <span>Open Branding & Identity</span>
                    <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleNav('/admin/dashboard')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3f1d8b] hover:bg-[#28006d] text-white text-sm font-semibold transition-all shadow-sm"
                >
                  <ArrowLeft size={16} />
                  <span>Return to Dashboard</span>
                </button>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminModulePlaceholder;

