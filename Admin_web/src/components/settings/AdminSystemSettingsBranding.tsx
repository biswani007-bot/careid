import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Search,
  Bell,
  Settings,
  HelpCircle,
  Menu,
  Check,
  Building2,
  Palette,
  ShieldCheck,
  UserCheck,
  Database,
  Upload,
  Download,
  Image as ImageIcon,
  Lock,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import defaultCareIdLogo from '../../assets/CareIDlogo.png';
import doctorSarahJenkinsLarge from '../../assets/doctors/doctor-sarah-jenkins-large.png';
import {
  resolveBrandAssetUrl,
  testImageLoad,
  type AssetSourceType,
  type AssetStatusType
} from '../../utils/brandAssetUtils';
import {
  getPrimaryOrganization,
  updateOrganization,
  getSystemSettings,
  batchUpsertSystemSettings,
  type OrganizationProfile,
  type UpdateOrganizationPayload
} from '../../services/systemSettingsService';
import { useBranding } from '../../context/BrandingContext';
import './AdminSystemSettingsBranding.css';

// Hex color validation regex
const hexRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const brandingSchema = z.object({
  primaryColor: z
    .string()
    .regex(hexRegex, 'Must be a valid hex color code (e.g. #3F1D8B)'),
  secondaryColor: z
    .string()
    .regex(hexRegex, 'Must be a valid hex color code (e.g. #00E5FF)'),
  accentColor: z
    .string()
    .regex(hexRegex, 'Must be a valid hex color code (e.g. #7C4DFF)'),
  portalFooterText: z
    .string()
    .min(10, 'Footer text must be at least 10 characters')
    .max(200, 'Footer text cannot exceed 200 characters')
});

type BrandingFormValues = z.infer<typeof brandingSchema>;

const DEFAULT_BRANDING_VALUES: BrandingFormValues = {
  primaryColor: '#3F1D8B',
  secondaryColor: '#00E5FF',
  accentColor: '#7C4DFF',
  portalFooterText:
    '© 2026 Care ID Health Systems. All rights reserved. Secure Encrypted Health Record Vault.'
};

const BACKGROUND_GRADIENTS = [
  'linear-gradient(138deg, rgb(40, 0, 109) 0%, rgb(46, 8, 84) 50%, rgba(0, 106, 96, 0.3) 100%)',
  'linear-gradient(138deg, rgb(15, 23, 42) 0%, rgb(30, 58, 138) 50%, rgb(14, 116, 144) 100%)',
  'linear-gradient(138deg, rgb(6, 78, 59) 0%, rgb(15, 118, 110) 50%, rgb(17, 24, 39) 100%)',
  'linear-gradient(138deg, rgb(88, 28, 135) 0%, rgb(59, 7, 100) 50%, rgb(15, 23, 42) 100%)'
];

interface AdminSystemSettingsBrandingProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminSystemSettingsBranding: React.FC<AdminSystemSettingsBrandingProps> = ({
  onNavigate,
  onLogout
}) => {
  const { t } = useTranslation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [orgProfile, setOrgProfile] = useState<OrganizationProfile | null>(null);

  const { updateGlobalBranding, logoUrl: globalLogoUrl, faviconUrl: globalFaviconUrl } = useBranding();

  // Brand Asset Previews & Resolution State
  const [logoPreview, setLogoPreview] = useState<string>(globalLogoUrl || defaultCareIdLogo);
  const [logoSource, setLogoSource] = useState<AssetSourceType>('bundled');
  const [logoStatus, setLogoStatus] = useState<AssetStatusType>('ready');
  const [isAssetLoading, setIsAssetLoading] = useState(false);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(
    globalFaviconUrl && globalFaviconUrl !== '/favicon.svg' ? globalFaviconUrl : null
  );
  const [bgGradientIndex, setBgGradientIndex] = useState(0);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

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
    control,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: DEFAULT_BRANDING_VALUES,
    mode: 'onChange'
  });

  // Load existing branding configurations from live backend
  useEffect(() => {
    let isMounted = true;
    async function loadBranding() {
      try {
        const [org, settings] = await Promise.all([
          getPrimaryOrganization(),
          getSystemSettings('BRANDING')
        ]);

        if (!isMounted) return;

        if (org) {
          setOrgProfile(org);
          const rawLogo = org.logoUrl;
          const resolved = resolveBrandAssetUrl(rawLogo);
          if (resolved) {
            setIsAssetLoading(true);
            const isValid = await testImageLoad(resolved, 2500);
            if (!isMounted) return;
            setIsAssetLoading(false);
            if (isValid) {
              setLogoPreview(resolved);
              setLogoSource('backend');
              setLogoStatus('ready');
            } else {
              console.warn(
                `[CareID Branding] Remote asset "${resolved}" is inaccessible. Retaining authoritative CareID brand logo.`
              );
              setLogoPreview(defaultCareIdLogo);
              setLogoSource('bundled');
              setLogoStatus('fallback');
            }
          } else {
            setLogoPreview(defaultCareIdLogo);
            setLogoSource('bundled');
            setLogoStatus('ready');
          }
        }

        const settingsMap: Record<string, string> = {};
        settings.forEach((s) => {
          settingsMap[s.key] = s.value;
        });

        if (settingsMap['BG_GRADIENT_INDEX']) {
          const idx = parseInt(settingsMap['BG_GRADIENT_INDEX'], 10);
          if (!isNaN(idx) && idx >= 0 && idx < BACKGROUND_GRADIENTS.length) {
            setBgGradientIndex(idx);
          }
        }

        if (settingsMap['BROWSER_FAVICON_URL'] && settingsMap['BROWSER_FAVICON_URL'] !== '/favicon.svg') {
          setFaviconPreview(settingsMap['BROWSER_FAVICON_URL']);
        }

        reset({
          primaryColor: org?.primaryColor || settingsMap['PRIMARY_COLOR'] || DEFAULT_BRANDING_VALUES.primaryColor,
          secondaryColor: org?.secondaryColor || settingsMap['SECONDARY_COLOR'] || DEFAULT_BRANDING_VALUES.secondaryColor,
          accentColor: settingsMap['ACCENT_COLOR'] || DEFAULT_BRANDING_VALUES.accentColor,
          portalFooterText: settingsMap['PORTAL_FOOTER_TEXT'] || DEFAULT_BRANDING_VALUES.portalFooterText
        });
      } catch (err: any) {
        console.error('Failed to load branding data from backend:', err);
      }
    }
    loadBranding();
    return () => {
      isMounted = false;
    };
  }, [reset]);

  const watchedPrimary = watch('primaryColor');
  const watchedSecondary = watch('secondaryColor');
  const watchedAccent = watch('accentColor');
  const watchedFooterText = watch('portalFooterText') || '';

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  const handleTabClick = (tabPath: string, _tabLabel: string) => {
    handleNav(tabPath);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setNotification({
          type: 'info',
          message: 'Please select a valid image file (PNG, JPG, SVG, or WebP).'
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setNotification({
          type: 'info',
          message: 'File size exceeds 5MB limit. Please upload an optimized image.'
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setLogoPreview(dataUrl);
        setLogoSource('uploaded');
        setLogoStatus('ready');
        setNotification({
          type: 'success',
          message: `Staged new logo preview with ${file.name}. Save changes to persist.`
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setFaviconPreview(dataUrl);
        setNotification({
          type: 'success',
          message: `Updated browser favicon preview with ${file.name}.`
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadAsset = (assetUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = assetUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotification({
      type: 'success',
      message: `Downloading ${filename}...`
    });
  };

  const handleChangeBackground = () => {
    const nextIdx = (bgGradientIndex + 1) % BACKGROUND_GRADIENTS.length;
    setBgGradientIndex(nextIdx);
    setNotification({
      type: 'info',
      message: `Login preview background style changed to Theme ${nextIdx + 1}.`
    });
  };

  const handleDiscardChanges = () => {
    reset(DEFAULT_BRANDING_VALUES);
    setLogoPreview(defaultCareIdLogo);
    setLogoSource('bundled');
    setLogoStatus('ready');
    setFaviconPreview(null);
    setBgGradientIndex(0);
    updateGlobalBranding({
      logoUrl: defaultCareIdLogo,
      logoSource: 'bundled',
      logoStatus: 'ready',
      faviconUrl: '/favicon.svg',
      faviconStatus: 'ready',
      primaryColor: DEFAULT_BRANDING_VALUES.primaryColor,
      secondaryColor: DEFAULT_BRANDING_VALUES.secondaryColor,
      accentColor: DEFAULT_BRANDING_VALUES.accentColor,
      portalFooterText: DEFAULT_BRANDING_VALUES.portalFooterText
    });
    setNotification({
      type: 'info',
      message: 'Changes discarded. Restored default branding configuration.'
    });
  };

  const onSubmit = async (data: BrandingFormValues) => {
    try {
      setIsSaving(true);
      // 1. Update Organization with primary/secondary colors and logoUrl
      if (orgProfile?.id) {
        const orgPayload: UpdateOrganizationPayload = {
          name: orgProfile.name,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
        };

        if (logoSource === 'uploaded' && logoPreview.startsWith('data:')) {
          orgPayload.logoUrl = logoPreview;
        } else if (logoSource === 'backend' && orgProfile.logoUrl) {
          orgPayload.logoUrl = orgProfile.logoUrl;
        }

        const orgRes = await updateOrganization(orgProfile.id, orgPayload);
        if (orgRes.success && orgRes.data) {
          setOrgProfile(orgRes.data);
          if (orgPayload.logoUrl) {
            setLogoSource('backend');
            setLogoStatus('ready');
          }
        }
      }

      // 2. Persist Branding Platform Settings
      const result = await batchUpsertSystemSettings([
        {
          category: 'BRANDING',
          key: 'PRIMARY_COLOR',
          value: data.primaryColor,
          valueType: 'STRING',
          description: 'Official enterprise brand primary color'
        },
        {
          category: 'BRANDING',
          key: 'SECONDARY_COLOR',
          value: data.secondaryColor,
          valueType: 'STRING',
          description: 'Secondary brand color for interactive elements'
        },
        {
          category: 'BRANDING',
          key: 'ACCENT_COLOR',
          value: data.accentColor,
          valueType: 'STRING',
          description: 'Accent highlight color for tags and indicators'
        },
        {
          category: 'BRANDING',
          key: 'PORTAL_FOOTER_TEXT',
          value: data.portalFooterText,
          valueType: 'STRING',
          description: 'Legal copyright and portal footer text'
        },
        {
          category: 'BRANDING',
          key: 'BG_GRADIENT_INDEX',
          value: String(bgGradientIndex),
          valueType: 'NUMBER',
          description: 'Selected portal login background theme index'
        },
        {
          category: 'BRANDING',
          key: 'BROWSER_FAVICON_URL',
          value: faviconPreview || '/favicon.svg',
          valueType: 'STRING',
          description: 'Browser tab favicon asset URL or data URI'
        },
        {
          category: 'BRANDING',
          key: 'BRAND_LOGO_URL',
          value: logoPreview,
          valueType: 'STRING',
          description: 'Platform master brand logo asset URL or data URI'
        }
      ]);

      // 3. Immediately synchronize global application branding across all pages & browser tab
      updateGlobalBranding({
        logoUrl: logoPreview,
        logoSource: logoSource === 'uploaded' ? 'uploaded' : 'backend',
        logoStatus: 'ready',
        faviconUrl: faviconPreview || '/favicon.svg',
        faviconStatus: 'ready',
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        accentColor: data.accentColor,
        portalFooterText: data.portalFooterText,
        organization: orgProfile
      });

      if (result.success) {
        setNotification({
          type: 'success',
          message: 'Branding configuration and theme colors updated successfully in live backend.'
        });
      } else {
        setNotification({
          type: 'info',
          message: `Saved with notes: ${result.errors.join('; ')}`
        });
      }
    } catch (err: any) {
      console.error('Failed to save branding:', err);
      setNotification({
        type: 'error',
        message: `Failed to persist branding: ${err?.message || 'Server error'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="branding-wrapper">
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

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={logoInputRef}
        onChange={handleLogoUpload}
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        aria-hidden="true"
      />
      <input
        type="file"
        ref={faviconInputRef}
        onChange={handleFaviconUpload}
        accept="image/x-icon,image/png,image/svg+xml"
        className="hidden"
        aria-hidden="true"
      />

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
      <div className="branding-main flex-1 min-w-0 w-full flex flex-col h-screen overflow-hidden">
        {/* Stationary Top Global Navigation Bar (Figma 20:12789) */}
        <header className="branding-top-navbar" role="banner">
          <div className="branding-top-left">
            {/* Mobile Drawer Toggle */}
            <button
              type="button"
              className="p-2 -ml-2 text-[#494552] hover:text-[#28006d] md:hidden rounded-lg"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>

            {/* Breadcrumb Path (Figma 20:12790) */}
            <nav className="branding-breadcrumb" aria-label="Breadcrumbs">
              <button
                type="button"
                className="branding-breadcrumb-root"
                onClick={() => handleNav('/admin/dashboard')}
                title="Dashboard"
              >
                <Home size={13} />
              </button>
              <span className="branding-breadcrumb-sep">/</span>
              <button
                type="button"
                className="branding-breadcrumb-parent"
                onClick={() => handleNav('/admin/dashboard')}
              >
                {t('systemSettings.breadcrumb.portal', 'Admin Portal')}
              </button>
              <span className="branding-breadcrumb-sep">/</span>
              <button
                type="button"
                className="branding-breadcrumb-parent"
                onClick={() => handleNav('/admin/settings/general')}
              >
                {t('systemSettings.breadcrumb.settings', 'System Settings')}
              </button>
              <span className="branding-breadcrumb-sep">/</span>
              <span className="branding-breadcrumb-current" aria-current="page">
                {t('systemSettings.tabs.branding', 'Branding & Identity')}
              </span>
            </nav>
          </div>

          <div className="branding-top-right">
            {/* Global Search Input (Figma 20:12806) */}
            <div className="branding-search-bar hidden sm:block">
              <Search size={15} className="branding-search-icon" aria-hidden="true" />
              <input
                type="text"
                className="branding-search-input"
                placeholder={t(
                  'systemSettings.header.searchPlaceholder',
                  'Search facilities, patients, logs...'
                )}
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                aria-label="Search facilities, patients, logs"
              />
            </div>

            {/* Action Icons (Figma 20:12812) */}
            <div className="branding-actions-group">
              <button
                type="button"
                className="branding-icon-btn"
                title={t('common.notifications', 'Notifications')}
                aria-label="View notifications"
              >
                <Bell size={18} />
                <span className="branding-notif-dot" />
              </button>

              <button
                type="button"
                className="branding-icon-btn"
                title={t('common.settings', 'Settings')}
                aria-label="System Settings"
                onClick={() => handleNav('/admin/settings/general')}
              >
                <Settings size={18} />
              </button>

              <button
                type="button"
                className="branding-icon-btn"
                title={t('common.help', 'Help')}
                aria-label="Get help"
              >
                <HelpCircle size={18} />
              </button>
            </div>

            {/* Vertical Divider */}
            <div className="branding-top-divider" aria-hidden="true" />

            {/* Administrator Profile (Figma 20:12824) */}
            <button
              type="button"
              className="branding-profile-btn"
              onClick={() => handleNav('/admin/users')}
              aria-label="Admin profile options"
            >
              <div className="branding-profile-avatar">
                <img
                  src={doctorSarahJenkinsLarge}
                  alt="Admin User"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="branding-profile-info hidden sm:flex">
                <span className="branding-profile-name">
                  {t('systemSettings.header.adminUser', 'Admin User')}
                </span>
                <span className="branding-profile-role">
                  Enterprise SysAdmin
                </span>
              </div>
            </button>
          </div>
        </header>

        {/* Scrollable Canvas Body (Figma 20:12859) */}
        <main className="branding-scroll-canvas" role="main">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="branding-content-wrapper"
            noValidate
          >
            {/* Title & Top Action Bar (Figma 20:12860) */}
            <div className="branding-header-row">
              <div className="branding-header-left">
                <div className="branding-system-badge-row">
                  <span className="branding-system-badge">
                    DESIGN SYSTEM V3.2
                  </span>
                  <p className="branding-system-subtext">
                    Active Across All Clinical Portals
                  </p>
                </div>
                <h1 className="branding-title">
                  {t('systemSettings.tabs.branding', 'Branding & Identity')}
                </h1>
                <p className="branding-description">
                  Customize the visual appearance, official color tokens, typography, and asset logos across all Care ID clinical and administrative portals.
                </p>
              </div>

              <div className="branding-header-actions">
                <button
                  type="button"
                  className="btn-branding-discard"
                  onClick={handleDiscardChanges}
                >
                  Discard Changes
                </button>

                <button
                  type="submit"
                  className="btn-branding-save"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Check size={14} aria-hidden="true" />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
                </button>
              </div>
            </div>

            {/* Horizontal Sub-Navigation Tab Bar - Six Tabs (Figma 20:12833) */}
            <nav className="branding-tabs-bar" aria-label="Settings Categories">
              <div className="branding-tabs-container" role="tablist">
                {/* Tab 1: General & Organization */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="branding-tab-btn"
                  onClick={() => handleTabClick('/admin/settings/general', 'General & Organization')}
                >
                  <Building2 size={15} aria-hidden="true" />
                  <span>{t('systemSettings.tabs.general', 'General & Organization')}</span>
                </button>

                {/* Tab 2: Branding & Identity (ACTIVE) */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={true}
                  className="branding-tab-btn active"
                  onClick={() => handleTabClick('/admin/settings/branding', 'Branding & Identity')}
                >
                  <Palette size={15} aria-hidden="true" />
                  <span>{t('systemSettings.tabs.branding', 'Branding & Identity')}</span>
                </button>

                {/* Tab 3: Security Policies */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="branding-tab-btn"
                  onClick={() => handleTabClick('/admin/settings/security', 'Security Policies')}
                >
                  <ShieldCheck size={15} aria-hidden="true" />
                  <span>{t('systemSettings.tabs.security', 'Security Policies')}</span>
                </button>

                {/* Tab 4: Roles & Permissions */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="branding-tab-btn"
                  onClick={() => handleTabClick('/admin/settings/roles', 'Roles & Permissions')}
                >
                  <UserCheck size={15} aria-hidden="true" />
                  <span>{t('systemSettings.tabs.roles', 'Roles & Permissions')}</span>
                </button>

                {/* Tab 5: OCR & Notifications */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="branding-tab-btn"
                  onClick={() => handleTabClick('/admin/settings/ocr', 'OCR & Notifications')}
                >
                  <Bell size={15} aria-hidden="true" />
                  <span>{t('systemSettings.tabs.ocr', 'OCR & Notifications')}</span>
                </button>

                {/* Tab 6: Integrations & Backup */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="branding-tab-btn"
                  onClick={() => handleTabClick('/admin/settings/integrations', 'Integrations & Backup')}
                >
                  <Database size={15} aria-hidden="true" />
                  <span>{t('systemSettings.tabs.integrations', 'Integrations & Backup')}</span>
                </button>
              </div>
            </nav>

            {/* Bento Grid (Left 2 Columns, Right 1 Column) (Figma 20:12879) */}
            <div className="branding-bento-grid">
              {/* Left Column (2 Columns wide on desktop) */}
              <div className="branding-left-column">
                {/* 1. Official Color Palette Card (Figma 20:12881) */}
                <section className="branding-card" aria-labelledby="palette-title">
                  <div className="branding-card-header">
                    <div className="branding-card-title-group">
                      <Palette size={20} className="text-[#191c1e]" aria-hidden="true" />
                      <h2 id="palette-title" className="branding-card-title">
                        Official Color Palette
                      </h2>
                    </div>
                    <span className="branding-card-badge">
                      Accessible WCAG AA
                    </span>
                  </div>
                  <p className="branding-card-desc">
                    Define primary branding and secondary feedback tokens used across responsive mobile, clinician tablet, and desktop views.
                  </p>

                  <div className="branding-palette-row">
                    {/* Primary Color */}
                    <div className="branding-color-item">
                      <div className="branding-color-label-row">
                        <span className="branding-color-label">Primary Color</span>
                        <span className="branding-color-name">Deep Purple</span>
                      </div>
                      <div className="branding-color-input-row">
                        <div
                          className="branding-swatch-box"
                          style={{ backgroundColor: hexRegex.test(watchedPrimary) ? watchedPrimary : '#3F1D8B' }}
                          title="Click to pick primary color"
                        >
                          <input
                            type="color"
                            value={hexRegex.test(watchedPrimary) ? watchedPrimary : '#3F1D8B'}
                            onChange={(e) => setValue('primaryColor', e.target.value.toUpperCase())}
                            className="branding-swatch-native-input"
                            aria-label="Pick Primary Color"
                          />
                        </div>
                        <Controller
                          name="primaryColor"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              id="primaryColorInput"
                              type="text"
                              className={`branding-hex-input ${errors.primaryColor ? 'has-error' : ''}`}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              placeholder="#3F1D8B"
                              maxLength={7}
                              aria-label="Primary Color Hex"
                            />
                          )}
                        />
                      </div>
                      {errors.primaryColor && (
                        <p className="text-[11px] text-red-600 font-medium mt-1">
                          {errors.primaryColor.message}
                        </p>
                      )}
                    </div>

                    {/* Secondary Color */}
                    <div className="branding-color-item">
                      <div className="branding-color-label-row">
                        <span className="branding-color-label">Secondary Color</span>
                        <span className="branding-color-name teal-accent">Medical Cyan</span>
                      </div>
                      <div className="branding-color-input-row">
                        <div
                          className="branding-swatch-box"
                          style={{ backgroundColor: hexRegex.test(watchedSecondary) ? watchedSecondary : '#00E5FF' }}
                          title="Click to pick secondary color"
                        >
                          <input
                            type="color"
                            value={hexRegex.test(watchedSecondary) ? watchedSecondary : '#00E5FF'}
                            onChange={(e) => setValue('secondaryColor', e.target.value.toUpperCase())}
                            className="branding-swatch-native-input"
                            aria-label="Pick Secondary Color"
                          />
                        </div>
                        <Controller
                          name="secondaryColor"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              id="secondaryColorInput"
                              type="text"
                              className={`branding-hex-input ${errors.secondaryColor ? 'has-error' : ''}`}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              placeholder="#00E5FF"
                              maxLength={7}
                              aria-label="Secondary Color Hex"
                            />
                          )}
                        />
                      </div>
                      {errors.secondaryColor && (
                        <p className="text-[11px] text-red-600 font-medium mt-1">
                          {errors.secondaryColor.message}
                        </p>
                      )}
                    </div>

                    {/* Accent Color */}
                    <div className="branding-color-item">
                      <div className="branding-color-label-row">
                        <span className="branding-color-label">Accent Color</span>
                        <span className="branding-color-name">Vibrant Violet</span>
                      </div>
                      <div className="branding-color-input-row">
                        <div
                          className="branding-swatch-box"
                          style={{ backgroundColor: hexRegex.test(watchedAccent) ? watchedAccent : '#7C4DFF' }}
                          title="Click to pick accent color"
                        >
                          <input
                            type="color"
                            value={hexRegex.test(watchedAccent) ? watchedAccent : '#7C4DFF'}
                            onChange={(e) => setValue('accentColor', e.target.value.toUpperCase())}
                            className="branding-swatch-native-input"
                            aria-label="Pick Accent Color"
                          />
                        </div>
                        <Controller
                          name="accentColor"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              id="accentColorInput"
                              type="text"
                              className={`branding-hex-input ${errors.accentColor ? 'has-error' : ''}`}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              placeholder="#7C4DFF"
                              maxLength={7}
                              aria-label="Accent Color Hex"
                            />
                          )}
                        />
                      </div>
                      {errors.accentColor && (
                        <p className="text-[11px] text-red-600 font-medium mt-1">
                          {errors.accentColor.message}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/* 2. Logos & Visual Brand Assets Card (Figma 20:12940) */}
                <section className="branding-card" aria-labelledby="assets-title">
                  <div className="branding-card-header">
                    <div className="branding-card-title-group">
                      <ImageIcon size={20} className="text-[#191c1e]" aria-hidden="true" />
                      <h2 id="assets-title" className="branding-card-title">
                        Logos & Visual Brand Assets
                      </h2>
                    </div>
                    <span className="branding-card-badge-teal">
                      Vector & High-DPI Ready
                    </span>
                  </div>
                  <p className="branding-card-desc">
                    Upload and configure high-resolution brand assets for application navigation bars, browser tabs, and generated medical reports.
                  </p>

                  <div className="branding-assets-row">
                    {/* Main Care ID Logo Box */}
                    <div className="branding-asset-box">
                      <div className="flex flex-col gap-3">
                        <div className="branding-asset-header">
                          <h3 className="branding-asset-title">Main Care ID Logo</h3>
                          <span className="branding-asset-dim-badge">
                            {logoSource === 'uploaded'
                              ? 'Custom Staged Asset'
                              : logoSource === 'backend'
                              ? 'Enterprise Custom'
                              : logoStatus === 'fallback'
                              ? 'CareID Master Asset'
                              : '1248×747 PNG'}
                          </span>
                        </div>

                        <div className="branding-asset-display">
                          {isAssetLoading ? (
                            <div className="flex items-center justify-center p-6 text-purple-700 min-h-[120px]">
                              <Loader2 size={24} className="animate-spin" />
                            </div>
                          ) : (
                            <img
                              src={logoPreview}
                              alt="Care ID Logo Asset"
                              id="careid-logo-preview"
                              onError={(e) => {
                                console.warn('[CareID Branding] Preview element load error. Falling back to default logo.');
                                if (e.currentTarget.src !== defaultCareIdLogo) {
                                  e.currentTarget.src = defaultCareIdLogo;
                                  setLogoPreview(defaultCareIdLogo);
                                  setLogoSource('bundled');
                                  setLogoStatus('fallback');
                                }
                              }}
                            />
                          )}
                        </div>

                        <p className="branding-asset-desc">
                          Primary identity used in top navigation headers and client-facing medical exports.
                        </p>
                      </div>

                      <div className="branding-asset-actions">
                        <button
                          type="button"
                          className="btn-asset-replace"
                          onClick={() => logoInputRef.current?.click()}
                          id="btn-replace-logo"
                        >
                          <Upload size={13} aria-hidden="true" />
                          <span>Replace Logo</span>
                        </button>
                        <button
                          type="button"
                          className="btn-asset-download"
                          onClick={() => handleDownloadAsset(logoPreview, 'careid-logo.png')}
                          title="Download Logo"
                          aria-label="Download Logo"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Browser Favicon Box */}
                    <div className="branding-asset-box">
                      <div className="flex flex-col gap-3">
                        <div className="branding-asset-header">
                          <h3 className="branding-asset-title">Browser Favicon</h3>
                          <span className="branding-asset-dim-badge">32×32 / 64×64</span>
                        </div>

                        <div className="branding-asset-display">
                          {faviconPreview ? (
                            <img
                              src={faviconPreview}
                              alt="Browser Favicon Preview"
                              className="w-12 h-12 object-contain rounded"
                              id="favicon-preview-img"
                            />
                          ) : (
                            <div
                              className="branding-favicon-icon-preview"
                              style={{ backgroundColor: hexRegex.test(watchedPrimary) ? watchedPrimary : '#28006d' }}
                            >
                              <ShieldCheck size={24} />
                            </div>
                          )}
                        </div>

                        <p className="branding-asset-desc">
                          Displayed in browser tabs and home screen bookmarks. ICO or PNG format.
                        </p>
                      </div>

                      <div className="branding-asset-actions">
                        <button
                          type="button"
                          className="btn-asset-upload"
                          onClick={() => faviconInputRef.current?.click()}
                          id="btn-upload-favicon"
                        >
                          <Upload size={13} aria-hidden="true" />
                          <span>Upload Favicon</span>
                        </button>
                        <button
                          type="button"
                          className="btn-asset-download"
                          onClick={() =>
                            handleDownloadAsset(
                              faviconPreview || defaultCareIdLogo,
                              'favicon.png'
                            )
                          }
                          title="Download Favicon"
                          aria-label="Download Favicon"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. Portal Copy & Compliance Footer Card (Figma 20:12994) */}
                <section className="branding-card" aria-labelledby="footer-copy-title">
                  <div className="branding-card-header">
                    <div className="branding-card-title-group">
                      <Lock size={18} className="text-[#191c1e]" aria-hidden="true" />
                      <h2 id="footer-copy-title" className="branding-card-title">
                        Portal Copy & Compliance Footer
                      </h2>
                    </div>
                  </div>
                  <p className="branding-card-desc">
                    Global copyright, encryption disclosures, and disclaimers applied across patient and doctor vaults.
                  </p>

                  <div className="branding-footer-form">
                    <div className="branding-footer-input-group">
                      <label htmlFor="portalFooterText" className="branding-footer-label">
                        Portal Footer Text
                      </label>
                      <textarea
                        id="portalFooterText"
                        {...register('portalFooterText')}
                        className={`branding-footer-textarea ${errors.portalFooterText ? 'border-red-500' : ''}`}
                        rows={2}
                        maxLength={200}
                        placeholder="© 2026 Care ID Health Systems. All rights reserved."
                        aria-describedby="footer-char-counter"
                      />
                      {errors.portalFooterText && (
                        <p className="text-[11px] text-red-600 font-medium">
                          {errors.portalFooterText.message}
                        </p>
                      )}
                    </div>

                    <div className="branding-footer-meta">
                      <div className="branding-compliance-badge">
                        <Lock size={13} />
                        <span>HIPAA & GDPR Compliance String Embedded</span>
                      </div>
                      <span id="footer-char-counter" className="branding-char-counter">
                        {watchedFooterText.length} / 200 characters
                      </span>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column (Live Previews & Next Action) */}
              <div className="branding-right-column">
                {/* 4. Login Screen Preview Card (Figma 20:13016) */}
                <div className="branding-login-preview-card">
                  <div className="branding-preview-header">
                    <div className="branding-preview-title-group">
                      <Eye size={16} className="text-[#191c1e]" aria-hidden="true" />
                      <h3 className="branding-preview-title">Login Screen Preview</h3>
                    </div>
                    <span className="branding-live-badge">Live Synced</span>
                  </div>

                  {/* Scaled Mock Login Window */}
                  <div
                    className="branding-preview-stage"
                    style={{ backgroundImage: BACKGROUND_GRADIENTS[bgGradientIndex] }}
                  >
                    <div className="branding-mock-login-window">
                      {/* Identity Icon Box using Primary Color */}
                      <div
                        className="branding-mock-icon-box"
                        style={{
                          backgroundColor: hexRegex.test(watchedPrimary)
                            ? watchedPrimary
                            : '#28006d'
                        }}
                      >
                        <ShieldCheck size={20} />
                      </div>

                      {/* Header bar */}
                      <div className="branding-mock-bar" />

                      {/* Input Placeholders */}
                      <div className="branding-mock-inputs">
                        <div className="branding-mock-input" />
                        <div className="branding-mock-input" />
                      </div>

                      {/* Sign In Button using Secondary Color */}
                      <div
                        className="branding-mock-signin-btn"
                        style={{
                          backgroundColor: hexRegex.test(watchedSecondary)
                            ? watchedSecondary
                            : '#00e5ff'
                        }}
                      >
                        Sign In with Care ID
                      </div>
                    </div>
                  </div>

                  {/* Change Login Background Button */}
                  <div className="branding-preview-footer">
                    <button
                      type="button"
                      className="btn-change-bg"
                      onClick={handleChangeBackground}
                      id="btn-change-bg"
                    >
                      <ImageIcon size={15} aria-hidden="true" />
                      <span>Change Login Background</span>
                    </button>
                  </div>
                </div>

                {/* 5. Next Step: Security & Access Card (Figma 20:13042) */}
                <div className="branding-next-step-card">
                  <div className="branding-next-step-header">
                    <ShieldCheck size={20} className="branding-next-step-icon" aria-hidden="true" />
                    <div className="branding-next-step-content">
                      <h3 className="branding-next-step-title">
                        Next Step: Security & Access
                      </h3>
                      <p className="branding-next-step-desc">
                        Once branding tokens are published, verify MFA session timeouts and enterprise lockouts.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-proceed-security"
                    onClick={() =>
                      handleTabClick(
                        '/admin/settings/security',
                        'Security Policies'
                      )
                    }
                    id="btn-proceed-security"
                  >
                    Proceed to Security Policies →
                  </button>
                </div>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default AdminSystemSettingsBranding;
