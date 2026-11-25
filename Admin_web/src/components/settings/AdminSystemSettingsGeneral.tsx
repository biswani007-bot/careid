import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Search,
  Bell,
  Settings,
  HelpCircle,
  ChevronDown,
  Menu,
  SlidersHorizontal,
  RotateCcw,
  Check,
  Building2,
  Palette,
  ShieldCheck,
  UserCheck,
  Database,
  ArrowRight,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Share2,
  Stethoscope
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import doctorSarahJenkinsLarge from '../../assets/doctors/doctor-sarah-jenkins-large.png';
import {
  getPrimaryOrganization,
  updateOrganization,
  getSystemSettings,
  batchUpsertSystemSettings,
  type OrganizationProfile
} from '../../services/systemSettingsService';
import './AdminSystemSettingsGeneral.css';

// Form validation schema using Zod
const generalSettingsSchema = z.object({
  platformName: z.string().min(2, 'Platform name must be at least 2 characters'),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  supportEmail: z.string().email('Please enter a valid email address'),
  supportPhone: z.string().min(7, 'Please enter a valid phone number'),
  primaryEnterpriseNode: z.string().min(2, 'Primary enterprise node is required'),
  clinicalSubEntities: z.string().min(2, 'Clinical sub-entities & facilities are required'),
  operatingTimezone: z.string().min(1, 'Please select an operating timezone'),
  systemDefaultLocale: z.string().min(1, 'Please select a system default locale'),
  socialLinkedin: z.string().optional(),
  socialTwitter: z.string().optional(),
  socialFacebook: z.string().optional(),
  socialInstagram: z.string().optional(),
  socialYoutube: z.string().optional()
});

type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>;

// Default design reference values strictly matching Figma 20:12532
const DEFAULT_FORM_VALUES: GeneralSettingsFormValues = {
  platformName: 'Care ID Enterprise',
  organizationName: 'Mount Sinai Health System & Care ID Network',
  supportEmail: 'admin-support@careid-health.org',
  supportPhone: '+1 (800) 555-0199',
  primaryEnterpriseNode: 'Mount Sinai Central Health Vault (NODE-US-EAST-01)',
  clinicalSubEntities: '14 Licensed Clinics · 4 Emergency Hubs · 2 Lab Facilities',
  operatingTimezone: 'Eastern Time (US & Canada) [UTC -05:00]',
  systemDefaultLocale: 'English (US) / Spanish (ES) - Bilingual Medical Pack',
  socialLinkedin: 'https://linkedin.com/company/careid-health',
  socialTwitter: 'https://twitter.com/careid_health',
  socialFacebook: 'https://facebook.com/careid.health',
  socialInstagram: 'https://instagram.com/careid.health',
  socialYoutube: 'https://youtube.com/@careid-health'
};

const TIMEZONE_OPTIONS = [
  'Eastern Time (US & Canada) [UTC -05:00]',
  'Central Time (US & Canada) [UTC -06:00]',
  'Mountain Time (US & Canada) [UTC -07:00]',
  'Pacific Time (US & Canada) [UTC -08:00]',
  'UTC [UTC +00:00]',
  'Greenwich Mean Time (GMT) [UTC +00:00]',
  'Central European Time (CET) [UTC +01:00]',
  'India Standard Time (IST) [UTC +05:30]'
];

const LOCALE_OPTIONS = [
  'English (US) / Spanish (ES) - Bilingual Medical Pack',
  'English (US) - Standard Clinical Pack',
  'English (UK) - NHS Clinical Terminology',
  'Spanish (ES/MX) - Clinical Terminology Pack',
  'French (FR/CA) - Medical Translation Pack'
];

interface AdminSystemSettingsGeneralProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminSystemSettingsGeneral: React.FC<AdminSystemSettingsGeneralProps> = ({
  onNavigate,
  onLogout
}) => {
  const { t } = useTranslation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'security' | 'roles' | 'ocr' | 'integrations' | 'announcements' | 'clinical-practice-types'>('general');
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [orgProfile, setOrgProfile] = useState<OrganizationProfile | null>(null);

  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: DEFAULT_FORM_VALUES,
    mode: 'onBlur'
  });

  // Load live organization and platform settings on mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [org, settings] = await Promise.all([
          getPrimaryOrganization(),
          getSystemSettings('GENERAL')
        ]);

        if (!isMounted) return;

        if (org) {
          setOrgProfile(org);
        }

        // Map settings array to keyed map
        const settingsMap: Record<string, string> = {};
        settings.forEach((s) => {
          settingsMap[s.key] = s.value;
        });

        reset({
          platformName: settingsMap['PLATFORM_NAME'] || DEFAULT_FORM_VALUES.platformName,
          organizationName: org?.name || settingsMap['ORGANIZATION_NAME'] || DEFAULT_FORM_VALUES.organizationName,
          supportEmail: org?.email || settingsMap['SUPPORT_EMAIL'] || DEFAULT_FORM_VALUES.supportEmail,
          supportPhone: org?.phone || settingsMap['SUPPORT_PHONE'] || DEFAULT_FORM_VALUES.supportPhone,
          primaryEnterpriseNode: settingsMap['PRIMARY_ENTERPRISE_NODE'] || (org?.streetAddress ? `${org.name} (${org.streetAddress})` : DEFAULT_FORM_VALUES.primaryEnterpriseNode),
          clinicalSubEntities: settingsMap['CLINICAL_SUB_ENTITIES'] || DEFAULT_FORM_VALUES.clinicalSubEntities,
          operatingTimezone: org?.timezone === 'America/New_York' ? 'Eastern Time (US & Canada) [UTC -05:00]' : (settingsMap['OPERATING_TIMEZONE'] || DEFAULT_FORM_VALUES.operatingTimezone),
          systemDefaultLocale: org?.language === 'en' ? 'English (US) / Spanish (ES) - Bilingual Medical Pack' : (settingsMap['SYSTEM_DEFAULT_LOCALE'] || DEFAULT_FORM_VALUES.systemDefaultLocale),
          socialLinkedin: settingsMap['SOCIAL_LINKEDIN'] || DEFAULT_FORM_VALUES.socialLinkedin,
          socialTwitter: settingsMap['SOCIAL_TWITTER'] || DEFAULT_FORM_VALUES.socialTwitter,
          socialFacebook: settingsMap['SOCIAL_FACEBOOK'] || DEFAULT_FORM_VALUES.socialFacebook,
          socialInstagram: settingsMap['SOCIAL_INSTAGRAM'] || DEFAULT_FORM_VALUES.socialInstagram,
          socialYoutube: settingsMap['SOCIAL_YOUTUBE'] || DEFAULT_FORM_VALUES.socialYoutube
        });
      } catch (err: any) {
        console.error('Failed to load system settings from backend:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [reset]);

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  const handleTabClick = (tabKey: 'general' | 'branding' | 'security' | 'roles' | 'ocr' | 'integrations' | 'announcements' | 'clinical-practice-types', _tabLabel: string) => {
    if (tabKey === 'general') {
      setActiveTab('general');
    } else if (tabKey === 'branding') {
      handleNav('/admin/settings/branding');
    } else if (tabKey === 'security') {
      handleNav('/admin/settings/security');
    } else if (tabKey === 'roles') {
      handleNav('/admin/settings/roles');
    } else if (tabKey === 'ocr') {
      handleNav('/admin/settings/ocr');
    } else if (tabKey === 'integrations') {
      handleNav('/admin/settings/integrations');
    } else if (tabKey === 'announcements') {
      handleNav('/admin/settings/announcements');
    } else if (tabKey === 'clinical-practice-types') {
      handleNav('/admin/settings/clinical-practice-types');
    }
  };

  const handleResetDefaults = () => {
    reset(DEFAULT_FORM_VALUES);
    setNotification({
      type: 'info',
      message: 'System settings form reset to default template.'
    });
  };

  const onSubmit = async (data: GeneralSettingsFormValues) => {
    try {
      setIsSaving(true);
      // 1. Update Organization Profile if ID exists
      if (orgProfile?.id) {
        await updateOrganization(orgProfile.id, {
          name: data.organizationName,
          email: data.supportEmail,
          phone: data.supportPhone,
          timezone: data.operatingTimezone.includes('Eastern') ? 'America/New_York' : 'UTC',
          language: data.systemDefaultLocale.includes('Spanish') ? 'en-US,es-ES' : 'en-US'
        });
      }

      // 2. Persist Platform Settings in live backend
      const result = await batchUpsertSystemSettings([
        {
          category: 'GENERAL',
          key: 'PLATFORM_NAME',
          value: data.platformName,
          valueType: 'STRING',
          description: 'Official enterprise platform display name'
        },
        {
          category: 'GENERAL',
          key: 'ORGANIZATION_NAME',
          value: data.organizationName,
          valueType: 'STRING',
          description: 'Licensed healthcare system organization name'
        },
        {
          category: 'GENERAL',
          key: 'SUPPORT_EMAIL',
          value: data.supportEmail,
          valueType: 'STRING',
          description: 'Platform support & helpdesk email'
        },
        {
          category: 'GENERAL',
          key: 'SUPPORT_PHONE',
          value: data.supportPhone,
          valueType: 'STRING',
          description: 'Emergency and technical support hotline'
        },
        {
          category: 'GENERAL',
          key: 'PRIMARY_ENTERPRISE_NODE',
          value: data.primaryEnterpriseNode,
          valueType: 'STRING',
          description: 'Primary health vault regional cluster node'
        },
        {
          category: 'GENERAL',
          key: 'CLINICAL_SUB_ENTITIES',
          value: data.clinicalSubEntities,
          valueType: 'STRING',
          description: 'Licensed clinical sub-entities & affiliated clinics'
        },
        {
          category: 'GENERAL',
          key: 'OPERATING_TIMEZONE',
          value: data.operatingTimezone,
          valueType: 'STRING',
          description: 'System standard operating timezone'
        },
        {
          category: 'GENERAL',
          key: 'SYSTEM_DEFAULT_LOCALE',
          value: data.systemDefaultLocale,
          valueType: 'STRING',
          description: 'Clinical terminology locale & language packs'
        },
        {
          category: 'BRANDING',
          key: 'SOCIAL_LINKEDIN',
          value: data.socialLinkedin || '',
          valueType: 'STRING',
          description: 'Official organization LinkedIn profile URL (PRD 4.4.9)'
        },
        {
          category: 'BRANDING',
          key: 'SOCIAL_TWITTER',
          value: data.socialTwitter || '',
          valueType: 'STRING',
          description: 'Official organization Twitter/X handle URL (PRD 4.4.9)'
        },
        {
          category: 'BRANDING',
          key: 'SOCIAL_FACEBOOK',
          value: data.socialFacebook || '',
          valueType: 'STRING',
          description: 'Official organization Facebook page URL (PRD 4.4.9)'
        },
        {
          category: 'BRANDING',
          key: 'SOCIAL_INSTAGRAM',
          value: data.socialInstagram || '',
          valueType: 'STRING',
          description: 'Official organization Instagram profile URL (PRD 4.4.9)'
        },
        {
          category: 'BRANDING',
          key: 'SOCIAL_YOUTUBE',
          value: data.socialYoutube || '',
          valueType: 'STRING',
          description: 'Official organization YouTube channel URL (PRD 4.4.9)'
        }
      ]);

      if (result.success) {
        setNotification({
          type: 'success',
          message: `General settings for "${data.organizationName}" saved and verified in live backend.`
        });
      } else {
        setNotification({
          type: 'error',
          message: `Saved with warnings: ${result.errors.join('; ')}`
        });
      }
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setNotification({
        type: 'error',
        message: `Failed to persist settings: ${err?.message || 'Server error'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-wrapper">
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
            <CheckCircle2 size={18} className="shrink-0 text-teal-200" />
          ) : (
            <AlertCircle size={18} className="shrink-0 text-purple-200" />
          )}
          <span className="font-medium">{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="ml-2 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Dismiss notification"
          >
            <X size={14} />
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

      {/* Main Content Layout Container */}
      <div className="settings-main flex-1 min-w-0 w-full flex flex-col h-screen overflow-hidden">
        {/* Stationary Top Global Navigation Bar (Figma 20:12534) */}
        <header className="settings-top-navbar" role="banner">
          <div className="settings-top-left">
            {/* Mobile Drawer Toggle */}
            <button
              type="button"
              className="p-2 -ml-2 text-[#494552] hover:text-[#28006d] md:hidden rounded-lg"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>

            {/* Breadcrumb Path (Figma 20:12535) */}
            <nav className="settings-breadcrumb" aria-label="Breadcrumbs">
              <button
                type="button"
                className="settings-breadcrumb-root"
                onClick={() => handleNav('/admin/dashboard')}
                title="Dashboard"
              >
                <Home size={14} />
              </button>
              <span className="settings-breadcrumb-sep">/</span>
              <button
                type="button"
                className="settings-breadcrumb-parent"
                onClick={() => handleNav('/admin/dashboard')}
              >
                {t('systemSettings.breadcrumb.portal', 'Admin Portal')}
              </button>
              <span className="settings-breadcrumb-sep">/</span>
              <button
                type="button"
                className="settings-breadcrumb-parent"
                onClick={() => handleNav('/admin/settings/general')}
              >
                {t('systemSettings.breadcrumb.settings', 'System Settings')}
              </button>
              <span className="settings-breadcrumb-sep">/</span>
              <span className="settings-breadcrumb-current" aria-current="page">
                {t('systemSettings.breadcrumb.general', 'General & Organization')}
              </span>
            </nav>
          </div>

          <div className="settings-top-right">
            {/* Global Search Input (Figma 20:12551) */}
            <div className="settings-search-bar hidden sm:block">
              <Search size={14} className="settings-search-icon" aria-hidden="true" />
              <input
                type="text"
                className="settings-search-input"
                placeholder={t(
                  'systemSettings.header.searchPlaceholder',
                  'Search facilities, patients, logs...'
                )}
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                aria-label="Search facilities, patients, logs"
              />
            </div>

            {/* Header Action Icons (Figma 20:12557) */}
            <div className="settings-actions-group">
              <button
                type="button"
                className="settings-icon-btn"
                title={t('common.notifications', 'Notifications')}
                aria-label="View notifications"
              >
                <Bell size={18} />
                <span className="settings-notif-dot" />
              </button>

              <button
                type="button"
                className="settings-icon-btn"
                title={t('common.settings', 'Settings')}
                aria-label="System Settings"
              >
                <Settings size={18} />
              </button>

              <button
                type="button"
                className="settings-icon-btn"
                title={t('common.help', 'Help')}
                aria-label="Get help"
              >
                <HelpCircle size={18} />
              </button>
            </div>

            {/* Vertical Divider (Figma 20:12568) */}
            <div className="settings-top-divider" aria-hidden="true" />

            {/* Administrator Profile (Figma 20:12568) */}
            <button
              type="button"
              className="settings-profile-container"
              onClick={() => handleNav('/admin/profile')}
              aria-label="My Profile & Information"
              title="My Profile & Information"
            >
              <div className="settings-profile-avatar">
                <img
                  src={doctorSarahJenkinsLarge}
                  alt="Admin User"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="settings-profile-info hidden sm:flex">
                <div className="settings-profile-name-row">
                  <span className="settings-profile-name">
                    {t('systemSettings.header.adminUser', 'Admin User')}
                  </span>
                  <ChevronDown size={11} className="text-[#494552]" aria-hidden="true" />
                </div>
                <span className="settings-profile-role">
                  {t('systemSettings.header.superAdmin', 'Super Admin')}
                </span>
              </div>
            </button>
          </div>
        </header>

        {/* Scrollable Canvas Body (Figma 20:12578) */}
        <main className="settings-scroll-canvas" role="main">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="settings-content-wrapper"
            noValidate
          >
            {/* Header Title Banner (Figma 20:12580) */}
            <section className="settings-banner-card" aria-labelledby="settings-banner-title">
              <div className="settings-banner-left">
                <div className="settings-banner-heading-row">
                  <SlidersHorizontal size={20} className="settings-banner-icon" aria-hidden="true" />
                  <h1 id="settings-banner-title" className="settings-banner-title">
                    {t(
                      'systemSettings.banner.title',
                      'System Settings — General & Organization'
                    )}
                  </h1>
                </div>
                <p className="settings-banner-desc">
                  {t(
                    'systemSettings.banner.description',
                    'Manage core platform preferences, legal designations, and localized system defaults for the Care ID Enterprise ecosystem.'
                  )}
                </p>
              </div>

              <div className="settings-banner-actions">
                <button
                  type="button"
                  className="btn-secondary-settings"
                  onClick={handleResetDefaults}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  <span>{t('systemSettings.banner.resetDefaults', 'Reset Defaults')}</span>
                </button>

                <button
                  type="submit"
                  className="btn-primary-settings"
                >
                  <Check size={14} aria-hidden="true" />
                  <span>{t('systemSettings.banner.saveChanges', 'Save Changes')}</span>
                </button>
              </div>
            </section>

            {/* Persistent Sub-Navigation Tabs - Six Tabs (Figma 20:12600) */}
            <nav
              className="settings-tabs-card"
              aria-label="Settings categories navigation"
            >
              <div className="settings-tabs-list" role="tablist">
                {/* Tab 1: General & Organization (ACTIVE) */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'general'}
                  className={`settings-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                  onClick={() => handleTabClick('general', 'General & Organization')}
                >
                  <Building2 size={15} aria-hidden="true" />
                  <span>{t('systemSettings.tabs.general', 'General & Organization')}</span>
                </button>

                {/* Tab 2: Branding & Identity */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'branding'}
                  className={`settings-tab-btn ${activeTab === 'branding' ? 'active' : ''}`}
                  onClick={() => handleTabClick('branding', 'Branding & Identity')}
                >
                  <Palette size={15} aria-hidden="true" />
                  <span>{t('systemSettings.tabs.branding', 'Branding & Identity')}</span>
                </button>

                {/* Tab 3: Security Policies */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'security'}
                  className={`settings-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                  onClick={() => handleTabClick('security', 'Security Policies')}
                >
                  <ShieldCheck size={15} aria-hidden="true" />
                  <span>{t('systemSettings.tabs.security', 'Security Policies')}</span>
                </button>

                {/* Tab 4: Roles & Permissions */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'roles'}
                  className={`settings-tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
                  onClick={() => handleTabClick('roles', 'Roles & Permissions')}
                >
                  <UserCheck size={15} aria-hidden="true" />
                  <span>{t('systemSettings.tabs.roles', 'Roles & Permissions')}</span>
                </button>

                {/* Tab 5: OCR & Notifications */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'ocr'}
                  className={`settings-tab-btn ${activeTab === 'ocr' ? 'active' : ''}`}
                  onClick={() => handleTabClick('ocr', 'OCR & Notifications')}
                >
                  <Bell size={15} aria-hidden="true" />
                  <span>{t('systemSettings.tabs.ocr', 'OCR & Notifications')}</span>
                </button>

                {/* Tab 6: Integrations & Backup */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'integrations'}
                  className={`settings-tab-btn ${activeTab === 'integrations' ? 'active' : ''}`}
                  onClick={() => handleTabClick('integrations', 'Integrations & Backup')}
                >
                  <Database size={15} aria-hidden="true" />
                  <span>{t('systemSettings.tabs.integrations', 'Integrations & Backup')}</span>
                </button>

                {/* Tab 7: Clinical Practice Types */}
                <button
                  type="button"
                  role="tab"
                  data-tab="clinical-practice-types"
                  aria-selected={activeTab === 'clinical-practice-types'}
                  className={`settings-tab-btn ${activeTab === 'clinical-practice-types' ? 'active' : ''}`}
                  onClick={() => handleTabClick('clinical-practice-types', 'Clinical Practice Types')}
                >
                  <Stethoscope size={15} aria-hidden="true" />
                  <span>Clinical Practice Types</span>
                </button>
              </div>
            </nav>

            {/* Form Settings Canvas Content */}
            <div className="flex flex-col gap-[24px] w-full">
              {/* Configuration Card 1: Platform & Primary Contact (Figma 20:12633) */}
              <section
                className="settings-config-card"
                aria-labelledby="card1-heading"
              >
                <div className="settings-card-header">
                  <div className="settings-card-title-group">
                    <h2 id="card1-heading" className="settings-card-title">
                      {t('systemSettings.card1.heading', 'Platform & Primary Contact')}
                    </h2>
                    <p className="settings-card-description">
                      {t(
                        'systemSettings.card1.description',
                        'Core identification metadata rendered across patient credentials and medical access portals.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="settings-fields-grid">
                  {/* Field 1: PLATFORM NAME */}
                  <div className="settings-field-group">
                    <label
                      htmlFor="platformName"
                      className="settings-field-label"
                    >
                      {t('systemSettings.fields.platformName.label', 'PLATFORM NAME')}
                    </label>
                    <input
                      id="platformName"
                      type="text"
                      className={`settings-field-input ${errors.platformName ? 'has-error' : ''}`}
                      {...register('platformName')}
                      placeholder="Care ID Enterprise"
                      aria-invalid={errors.platformName ? 'true' : 'false'}
                      aria-describedby="platformName-helper"
                    />
                    {errors.platformName ? (
                      <p className="settings-field-error" role="alert">
                        {errors.platformName.message}
                      </p>
                    ) : (
                      <p id="platformName-helper" className="settings-field-helper">
                        {t(
                          'systemSettings.fields.platformName.helper',
                          'Displayed across system title bars and official clinical verification headers.'
                        )}
                      </p>
                    )}
                  </div>

                  {/* Field 2: ORGANIZATION NAME */}
                  <div className="settings-field-group">
                    <label
                      htmlFor="organizationName"
                      className="settings-field-label"
                    >
                      {t('systemSettings.fields.organizationName.label', 'ORGANIZATION NAME')}
                    </label>
                    <input
                      id="organizationName"
                      type="text"
                      className={`settings-field-input ${errors.organizationName ? 'has-error' : ''}`}
                      {...register('organizationName')}
                      placeholder="Mount Sinai Health System & Care ID Network"
                      aria-invalid={errors.organizationName ? 'true' : 'false'}
                      aria-describedby="organizationName-helper"
                    />
                    {errors.organizationName ? (
                      <p className="settings-field-error" role="alert">
                        {errors.organizationName.message}
                      </p>
                    ) : (
                      <p id="organizationName-helper" className="settings-field-helper">
                        {t(
                          'systemSettings.fields.organizationName.helper',
                          'Designated registered corporate entity for regulatory compliance audits.'
                        )}
                      </p>
                    )}
                  </div>

                  {/* Field 3: SUPPORT EMAIL */}
                  <div className="settings-field-group">
                    <label
                      htmlFor="supportEmail"
                      className="settings-field-label"
                    >
                      {t('systemSettings.fields.supportEmail.label', 'SUPPORT EMAIL')}
                    </label>
                    <input
                      id="supportEmail"
                      type="email"
                      className={`settings-field-input ${errors.supportEmail ? 'has-error' : ''}`}
                      {...register('supportEmail')}
                      placeholder="admin-support@careid-health.org"
                      aria-invalid={errors.supportEmail ? 'true' : 'false'}
                      aria-describedby="supportEmail-helper"
                    />
                    {errors.supportEmail ? (
                      <p className="settings-field-error" role="alert">
                        {errors.supportEmail.message}
                      </p>
                    ) : (
                      <p id="supportEmail-helper" className="settings-field-helper">
                        {t(
                          'systemSettings.fields.supportEmail.helper',
                          'Receives urgent system escalations, failover alerts, and admin notifications.'
                        )}
                      </p>
                    )}
                  </div>

                  {/* Field 4: SUPPORT PHONE */}
                  <div className="settings-field-group">
                    <label
                      htmlFor="supportPhone"
                      className="settings-field-label"
                    >
                      {t('systemSettings.fields.supportPhone.label', 'SUPPORT PHONE')}
                    </label>
                    <input
                      id="supportPhone"
                      type="tel"
                      className={`settings-field-input ${errors.supportPhone ? 'has-error' : ''}`}
                      {...register('supportPhone')}
                      placeholder="+1 (800) 555-0199"
                      aria-invalid={errors.supportPhone ? 'true' : 'false'}
                      aria-describedby="supportPhone-helper"
                    />
                    {errors.supportPhone ? (
                      <p className="settings-field-error" role="alert">
                        {errors.supportPhone.message}
                      </p>
                    ) : (
                      <p id="supportPhone-helper" className="settings-field-helper">
                        {t(
                          'systemSettings.fields.supportPhone.helper',
                          '24/7 designated hotline for hospital network administrators.'
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Configuration Card 2: Organization Hierarchy & Legal Taxonomy (Figma 20:12668) */}
              <section
                className="settings-config-card"
                aria-labelledby="card2-heading"
              >
                <div className="settings-card-header">
                  <div className="settings-card-title-group">
                    <h2 id="card2-heading" className="settings-card-title">
                      {t('systemSettings.card2.heading', 'Organization Hierarchy & Legal Taxonomy')}
                    </h2>
                    <p className="settings-card-description">
                      {t(
                        'systemSettings.card2.description',
                        'Manage structural entity nodes, jurisdictional classification, and localized runtime parameters.'
                      )}
                    </p>
                  </div>
                  <div className="settings-verified-badge">
                    {t('systemSettings.card2.verifiedNode', 'Verified Node')}
                  </div>
                </div>

                <div className="settings-fields-grid">
                  {/* Field 1: PRIMARY ENTERPRISE NODE */}
                  <div className="settings-field-group">
                    <label
                      htmlFor="primaryEnterpriseNode"
                      className="settings-field-label"
                    >
                      {t('systemSettings.fields.primaryNode.label', 'PRIMARY ENTERPRISE NODE')}
                    </label>
                    <input
                      id="primaryEnterpriseNode"
                      type="text"
                      className={`settings-field-input ${errors.primaryEnterpriseNode ? 'has-error' : ''}`}
                      {...register('primaryEnterpriseNode')}
                      placeholder="Mount Sinai Central Health Vault (NODE-US-EAST-01)"
                      aria-invalid={errors.primaryEnterpriseNode ? 'true' : 'false'}
                    />
                    {errors.primaryEnterpriseNode && (
                      <p className="settings-field-error" role="alert">
                        {errors.primaryEnterpriseNode.message}
                      </p>
                    )}
                  </div>

                  {/* Field 2: CLINICAL SUB-ENTITIES & FACILITIES */}
                  <div className="settings-field-group">
                    <label
                      htmlFor="clinicalSubEntities"
                      className="settings-field-label"
                    >
                      {t('systemSettings.fields.subEntities.label', 'CLINICAL SUB-ENTITIES & FACILITIES')}
                    </label>
                    <input
                      id="clinicalSubEntities"
                      type="text"
                      className={`settings-field-input ${errors.clinicalSubEntities ? 'has-error' : ''}`}
                      {...register('clinicalSubEntities')}
                      placeholder="14 Licensed Clinics · 4 Emergency Hubs · 2 Lab Facilities"
                      aria-invalid={errors.clinicalSubEntities ? 'true' : 'false'}
                    />
                    {errors.clinicalSubEntities && (
                      <p className="settings-field-error" role="alert">
                        {errors.clinicalSubEntities.message}
                      </p>
                    )}
                  </div>

                  {/* Field 3: OPERATING TIMEZONE */}
                  <div className="settings-field-group">
                    <label
                      htmlFor="operatingTimezone"
                      className="settings-field-label"
                    >
                      {t('systemSettings.fields.timezone.label', 'OPERATING TIMEZONE')}
                    </label>
                    <div className="settings-select-wrapper">
                      <select
                        id="operatingTimezone"
                        className={`settings-field-select ${errors.operatingTimezone ? 'has-error' : ''}`}
                        {...register('operatingTimezone')}
                        aria-invalid={errors.operatingTimezone ? 'true' : 'false'}
                      >
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="settings-select-chevron" aria-hidden="true" />
                    </div>
                    {errors.operatingTimezone && (
                      <p className="settings-field-error" role="alert">
                        {errors.operatingTimezone.message}
                      </p>
                    )}
                  </div>

                  {/* Field 4: SYSTEM DEFAULT LOCALE */}
                  <div className="settings-field-group">
                    <label
                      htmlFor="systemDefaultLocale"
                      className="settings-field-label"
                    >
                      {t('systemSettings.fields.locale.label', 'SYSTEM DEFAULT LOCALE')}
                    </label>
                    <div className="settings-select-wrapper">
                      <select
                        id="systemDefaultLocale"
                        className={`settings-field-select ${errors.systemDefaultLocale ? 'has-error' : ''}`}
                        {...register('systemDefaultLocale')}
                        aria-invalid={errors.systemDefaultLocale ? 'true' : 'false'}
                      >
                        {LOCALE_OPTIONS.map((locale) => (
                          <option key={locale} value={locale}>
                            {locale}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="settings-select-chevron" aria-hidden="true" />
                    </div>
                    {errors.systemDefaultLocale && (
                      <p className="settings-field-error" role="alert">
                        {errors.systemDefaultLocale.message}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Configuration Card 3: Social Media & Public Communications Channels (PRD Section 4.4.9) */}
              <section
                className="settings-config-card"
                aria-labelledby="card3-heading"
              >
                <div className="settings-card-header">
                  <div className="settings-card-title-group">
                    <h2 id="card3-heading" className="settings-card-title">
                      <Share2 size={18} className="text-[#6C2BD9]" aria-hidden="true" />
                      <span>{t('systemSettings.social.title', 'Social Media Channels')}</span>
                    </h2>
                    <p className="settings-card-subtitle">
                      {t('systemSettings.social.subtitle', 'Configure persistent enterprise social media handles displayed on client portals, patient emails, and public notices (PRD Section 4.4.9).')}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full border border-purple-200">
                    PRD 4.4.9
                  </span>
                </div>

                <div className="settings-form-grid">
                  {/* LinkedIn */}
                  <div className="settings-field-group">
                    <label htmlFor="socialLinkedin" className="settings-field-label">
                      LINKEDIN PROFILE
                    </label>
                    <input
                      id="socialLinkedin"
                      type="url"
                      className="settings-field-input"
                      {...register('socialLinkedin')}
                      placeholder="https://linkedin.com/company/careid-health"
                    />
                    <p className="settings-field-helper">Official corporate LinkedIn organisation page URL.</p>
                  </div>

                  {/* Twitter / X */}
                  <div className="settings-field-group">
                    <label htmlFor="socialTwitter" className="settings-field-label">
                      TWITTER / X HANDLE
                    </label>
                    <input
                      id="socialTwitter"
                      type="url"
                      className="settings-field-input"
                      {...register('socialTwitter')}
                      placeholder="https://twitter.com/careid_health"
                    />
                    <p className="settings-field-helper">Official platform Twitter / X feed URL.</p>
                  </div>

                  {/* Facebook */}
                  <div className="settings-field-group">
                    <label htmlFor="socialFacebook" className="settings-field-label">
                      FACEBOOK PAGE
                    </label>
                    <input
                      id="socialFacebook"
                      type="url"
                      className="settings-field-input"
                      {...register('socialFacebook')}
                      placeholder="https://facebook.com/careid.health"
                    />
                    <p className="settings-field-helper">Official Facebook community and public announcements page.</p>
                  </div>

                  {/* Instagram */}
                  <div className="settings-field-group">
                    <label htmlFor="socialInstagram" className="settings-field-label">
                      INSTAGRAM PROFILE
                    </label>
                    <input
                      id="socialInstagram"
                      type="url"
                      className="settings-field-input"
                      {...register('socialInstagram')}
                      placeholder="https://instagram.com/careid.health"
                    />
                    <p className="settings-field-helper">Official Instagram handle for hospital outreach.</p>
                  </div>

                  {/* YouTube */}
                  <div className="settings-field-group sm:col-span-2">
                    <label htmlFor="socialYoutube" className="settings-field-label">
                      YOUTUBE CHANNEL
                    </label>
                    <input
                      id="socialYoutube"
                      type="url"
                      className="settings-field-input"
                      {...register('socialYoutube')}
                      placeholder="https://youtube.com/@careid-health"
                    />
                    <p className="settings-field-helper">Official video channel for patient education and health guides.</p>
                  </div>
                </div>
              </section>

              {/* Bottom Action Area / Footer (Figma 20:12704) */}
              <footer className="settings-footer">
                <div className="settings-footer-left">
                  <button
                    type="button"
                    className="btn-footer-reset"
                    onClick={handleResetDefaults}
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                    <span>
                      {t('systemSettings.footer.resetOrganization', 'Reset to Organization Defaults')}
                    </span>
                  </button>
                </div>

                <div className="settings-footer-right">
                  <button
                    type="submit"
                    className="btn-footer-save"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Check size={14} aria-hidden="true" />
                    )}
                    <span>{isSaving ? 'Saving...' : t('systemSettings.footer.saveChanges', 'Save Changes')}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-footer-proceed"
                    onClick={() => handleTabClick('branding', 'Branding & Identity')}
                  >
                    <span>
                      {t('systemSettings.footer.proceedBranding', 'Proceed to Branding & Identity')}
                    </span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>
              </footer>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default AdminSystemSettingsGeneral;
