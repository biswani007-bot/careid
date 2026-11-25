import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Search,
  Bell,
  Settings,
  HelpCircle,
  Menu,
  Check,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  Layers,
  Upload,
  FlaskConical,
  ClipboardList,
  Film,
  Pill,
  Receipt,
  ArrowRight,
  RotateCcw,
  ChevronDown,
  Home,
  X,
  Loader2
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import {
  getSystemSettings,
  batchUpsertSystemSettings
} from '../../services/systemSettingsService';
import './AdminSystemSettingsOcr.css';

// ============================================================================
// Form Schema & Types
// ============================================================================
export const ocrSettingsSchema = z.object({
  primaryOcrProvider: z.string().min(1, 'Please select a primary OCR provider'),
  autoApprovalThreshold: z.number().min(50).max(100),
  manualReviewThreshold: z.number().min(10).max(80),
  maxUploadSizeMb: z.number().min(5).max(100),
  acceptedFormats: z.array(z.string()).min(1, 'At least one format must be accepted'),
  autoRetryOnFailure: z.boolean(),
  supportedDocTypes: z.object({
    labReports: z.boolean(),
    clinicalProgressNotes: z.boolean(),
    imagingRadiology: z.boolean(),
    prescriptionPads: z.boolean(),
    billingInvoices: z.boolean()
  }),
  notificationRouting: z.object({
    systemCriticalAlerts: z.object({
      email: z.boolean(),
      sms: z.boolean(),
      appPush: z.boolean()
    }),
    ocrExceptions: z.object({
      email: z.boolean(),
      sms: z.boolean(),
      appPush: z.boolean()
    }),
    referralRouting: z.object({
      email: z.boolean(),
      sms: z.boolean(),
      appPush: z.boolean()
    }),
    facilityAccreditation: z.object({
      email: z.boolean(),
      sms: z.boolean(),
      appPush: z.boolean()
    })
  })
});

export type OcrSettingsFormValues = z.infer<typeof ocrSettingsSchema>;

export const DEFAULT_OCR_SETTINGS: OcrSettingsFormValues = {
  primaryOcrProvider: 'Care ID Medical Vision AI (Enterprise v4.2)',
  autoApprovalThreshold: 90,
  manualReviewThreshold: 60,
  maxUploadSizeMb: 25,
  acceptedFormats: ['PDF', 'JPG', 'PNG', 'DICOM'],
  autoRetryOnFailure: true,
  supportedDocTypes: {
    labReports: true,
    clinicalProgressNotes: true,
    imagingRadiology: true,
    prescriptionPads: true,
    billingInvoices: false
  },
  notificationRouting: {
    systemCriticalAlerts: {
      email: true,
      sms: true,
      appPush: true
    },
    ocrExceptions: {
      email: true,
      sms: false,
      appPush: true
    },
    referralRouting: {
      email: true,
      sms: false,
      appPush: false
    },
    facilityAccreditation: {
      email: true,
      sms: true,
      appPush: true
    }
  }
};

export interface AdminSystemSettingsOcrProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminSystemSettingsOcr: React.FC<AdminSystemSettingsOcrProps> = ({
  onNavigate,
  onLogout
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue
  } = useForm<OcrSettingsFormValues>({
    resolver: zodResolver(ocrSettingsSchema),
    defaultValues: DEFAULT_OCR_SETTINGS
  });

  const autoApprovalThreshold = watch('autoApprovalThreshold');
  const manualReviewThreshold = watch('manualReviewThreshold');
  const supportedDocTypes = watch('supportedDocTypes');
  const notificationRouting = watch('notificationRouting');
  const autoRetryOnFailure = watch('autoRetryOnFailure');
  const acceptedFormats = watch('acceptedFormats');

  // Load existing OCR settings from live backend on mount
  useEffect(() => {
    let isMounted = true;
    async function loadOcrSettings() {
      try {
        const settings = await getSystemSettings('OCR');
        if (!isMounted) return;

        const map: Record<string, string> = {};
        settings.forEach((s) => {
          map[s.key] = s.value;
        });

        let loadedDocTypes = DEFAULT_OCR_SETTINGS.supportedDocTypes;
        if (map['SUPPORTED_DOC_TYPES']) {
          try {
            loadedDocTypes = JSON.parse(map['SUPPORTED_DOC_TYPES']);
          } catch {
            // Keep default
          }
        }

        let loadedFormats = DEFAULT_OCR_SETTINGS.acceptedFormats;
        if (map['ACCEPTED_FORMATS']) {
          try {
            loadedFormats = JSON.parse(map['ACCEPTED_FORMATS']);
          } catch {
            // Keep default
          }
        }

        let loadedRouting = DEFAULT_OCR_SETTINGS.notificationRouting;
        if (map['NOTIFICATION_ROUTING']) {
          try {
            loadedRouting = JSON.parse(map['NOTIFICATION_ROUTING']);
          } catch {
            // Keep default
          }
        }

        reset({
          primaryOcrProvider: map['PRIMARY_OCR_PROVIDER'] || DEFAULT_OCR_SETTINGS.primaryOcrProvider,
          autoApprovalThreshold: map['AUTO_APPROVAL_THRESHOLD'] ? parseInt(map['AUTO_APPROVAL_THRESHOLD'], 10) : DEFAULT_OCR_SETTINGS.autoApprovalThreshold,
          manualReviewThreshold: map['MANUAL_REVIEW_THRESHOLD'] ? parseInt(map['MANUAL_REVIEW_THRESHOLD'], 10) : DEFAULT_OCR_SETTINGS.manualReviewThreshold,
          maxUploadSizeMb: map['MAX_UPLOAD_SIZE_MB'] ? parseInt(map['MAX_UPLOAD_SIZE_MB'], 10) : DEFAULT_OCR_SETTINGS.maxUploadSizeMb,
          supportedDocTypes: loadedDocTypes,
          acceptedFormats: loadedFormats,
          notificationRouting: loadedRouting,
          autoRetryOnFailure: map['AUTO_RETRY_ON_FAILURE'] ? map['AUTO_RETRY_ON_FAILURE'] === 'true' : DEFAULT_OCR_SETTINGS.autoRetryOnFailure
        });
      } catch (err: any) {
        console.error('Failed to load OCR settings from backend:', err);
      }
    }
    loadOcrSettings();
    return () => {
      isMounted = false;
    };
  }, [reset]);

  // Auto-dismiss notifications after 4.5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4500);
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
      handleNav('/admin/settings/security');
    } else if (tabKey === 'roles') {
      handleNav('/admin/settings/roles');
    } else if (tabKey === 'ocr') {
      // current tab
    } else if (tabKey === 'integrations') {
      handleNav('/admin/settings/integrations');
    } else if (tabKey === 'announcements') {
      handleNav('/admin/settings/announcements');
    }
  };

  // Toggle document type
  const handleToggleDocType = (key: keyof OcrSettingsFormValues['supportedDocTypes']) => {
    setValue(`supportedDocTypes.${key}`, !supportedDocTypes[key], { shouldDirty: true });
  };

  // Toggle notification channel
  const handleToggleNotification = (
    rowKey: keyof OcrSettingsFormValues['notificationRouting'],
    channel: 'email' | 'sms' | 'appPush'
  ) => {
    const currentVal = notificationRouting[rowKey][channel];
    setValue(`notificationRouting.${rowKey}.${channel}`, !currentVal, { shouldDirty: true });
  };

  // Toggle accepted format badge
  const handleToggleFormat = (format: string) => {
    if (acceptedFormats.includes(format)) {
      if (acceptedFormats.length === 1) {
        setNotification({
          type: 'info',
          message: 'At least one file format must remain enabled.'
        });
        return;
      }
      setValue(
        'acceptedFormats',
        acceptedFormats.filter((f) => f !== format),
        { shouldDirty: true }
      );
    } else {
      setValue('acceptedFormats', [...acceptedFormats, format], { shouldDirty: true });
    }
  };

  // Discard changes
  const handleDiscard = () => {
    reset(DEFAULT_OCR_SETTINGS);
    setNotification({
      type: 'info',
      message: 'OCR engine thresholds and notification routing rules reset to system defaults.'
    });
  };

  // Save form values
  const onSaveSubmit = async (data: OcrSettingsFormValues) => {
    try {
      setIsSaving(true);
      const result = await batchUpsertSystemSettings([
        {
          category: 'OCR',
          key: 'AUTO_APPROVAL_THRESHOLD',
          value: String(data.autoApprovalThreshold),
          valueType: 'NUMBER',
          description: 'Confidence threshold percentage for automatic verification'
        },
        {
          category: 'OCR',
          key: 'MANUAL_REVIEW_THRESHOLD',
          value: String(data.manualReviewThreshold),
          valueType: 'NUMBER',
          description: 'Confidence floor threshold requiring manual human review'
        },
        {
          category: 'OCR',
          key: 'SUPPORTED_DOC_TYPES',
          value: JSON.stringify(data.supportedDocTypes),
          valueType: 'JSON',
          description: 'Enabled medical document classification models'
        },
        {
          category: 'OCR',
          key: 'ACCEPTED_FORMATS',
          value: JSON.stringify(data.acceptedFormats),
          valueType: 'JSON',
          description: 'Permitted document MIME types and file extensions'
        },
        {
          category: 'OCR',
          key: 'NOTIFICATION_ROUTING',
          value: JSON.stringify(data.notificationRouting),
          valueType: 'JSON',
          description: 'Multi-channel alert routing matrix for OCR verification events'
        },
        {
          category: 'OCR',
          key: 'AUTO_RETRY_ON_FAILURE',
          value: String(data.autoRetryOnFailure),
          valueType: 'BOOLEAN',
          description: 'Automatic retry flag for degraded optical recognition'
        },
        {
          category: 'OCR',
          key: 'PRIMARY_OCR_PROVIDER',
          value: data.primaryOcrProvider,
          valueType: 'STRING',
          description: 'Designated primary optical engine runtime'
        },
        {
          category: 'OCR',
          key: 'MAX_UPLOAD_SIZE_MB',
          value: String(data.maxUploadSizeMb),
          valueType: 'NUMBER',
          description: 'Maximum document payload upload size in megabytes'
        }
      ]);

      if (result.success) {
        setNotification({
          type: 'success',
          message: 'OCR engine parsing thresholds and notification routing saved and active in live backend.'
        });
      } else {
        setNotification({
          type: 'info',
          message: `Saved with status: ${result.errors.join('; ')}`
        });
      }
    } catch (err: any) {
      console.error('Failed to save OCR settings:', err);
      setNotification({
        type: 'error',
        message: `Failed to persist OCR settings: ${err?.message || 'Server error'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="ocr-settings-page">
      {/* Mobile Drawer Overlay Backdrop */}
      <div
        className={`careid-drawer-backdrop ${isDrawerOpen ? 'drawer-open show' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Shared Admin Sidebar (280px in Figma) with '+ New Record' CTA */}
      <AdminSidebar
        activeNav="settings"
        onNavigate={handleNav}
        onLogout={onLogout}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        ctaLabel="+ New Record"
        onCtaClick={() => handleNav('/admin/records')}
      />

      <div className="ocr-main-content">
        {/* 1. Header - TopNavBar (Stationary 64px) */}
        <header className="ocr-top-navbar" aria-label="Top Navigation">
          <div className="ocr-top-left">
            <button
              type="button"
              className="ocr-mobile-menu-btn"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Navigation */}
            <nav className="ocr-breadcrumb-nav" aria-label="Breadcrumb">
              <button
                type="button"
                className="ocr-breadcrumb-item"
                onClick={() => handleNav('/admin/dashboard')}
                aria-label="Home"
              >
                <Home className="ocr-breadcrumb-home-icon" />
              </button>
              <span className="ocr-breadcrumb-sep">/</span>
              <button
                type="button"
                className="ocr-breadcrumb-item"
                onClick={() => handleNav('/admin/dashboard')}
              >
                Admin Portal
              </button>
              <span className="ocr-breadcrumb-sep">/</span>
              <button
                type="button"
                className="ocr-breadcrumb-item"
                onClick={() => handleNav('/admin/settings/general')}
              >
                System Settings
              </button>
              <span className="ocr-breadcrumb-sep">/</span>
              <span className="ocr-breadcrumb-item active" aria-current="page">
                OCR &amp; Notifications
              </span>
            </nav>
          </div>

          <div className="ocr-top-right">
            <div className="ocr-search-box">
              <Search className="ocr-search-icon" />
              <input
                type="search"
                className="ocr-search-input"
                placeholder="Search facilities, patients, logs..."
                aria-label="Search"
              />
            </div>

            <div className="ocr-top-actions">
              <button
                type="button"
                className="ocr-icon-btn"
                title="System Alerts"
                aria-label="System Alerts"
              >
                <Bell className="w-4 h-4" />
                <span className="ocr-notif-badge" />
              </button>

              <button
                type="button"
                className="ocr-icon-btn"
                title="System Settings"
                aria-label="System Settings"
                onClick={() => handleNav('/admin/settings/general')}
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="ocr-icon-btn"
                title="Help & Documentation"
                aria-label="Help & Documentation"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="ocr-top-divider" />

            <button
              type="button"
              className="ocr-user-profile-btn"
              onClick={() => handleNav('/admin/profile')}
              aria-label="My Profile & Information"
              title="My Profile & Information"
            >
              <AdminProfileAvatar size={32} />
              <div className="ocr-user-info">
                <span className="ocr-user-name">Sarah Chen, MD</span>
                <span className="ocr-user-role">Principal Vault Admin</span>
              </div>
              <ChevronDown className="ocr-dropdown-arrow" />
            </button>
          </div>
        </header>

        {/* 2. Scrollable Canvas & Centered 1140px Container */}
        <main className="ocr-page-body">
          <div className="ocr-canvas-container">
            {/* Header Title Block */}
            <div className="ocr-header-title-block flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[280px]">
                <h1>OCR Engine &amp; Notification Routing</h1>
                <p>
                  Configure automated AI extraction confidence thresholds, document parsing rules, and cross-channel
                  administrative notification triggers.
                </p>
              </div>
            </div>

            {/* Persistent Sub-Navigation Tabs */}
            <nav className="ocr-subnav-tabs" aria-label="System Settings Tabs">
              <div className="ocr-subnav-tab-list" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="ocr-subnav-tab"
                  onClick={() => handleTabClick('general')}
                >
                  <span>General &amp; Organization</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="ocr-subnav-tab"
                  onClick={() => handleTabClick('branding')}
                >
                  <span>Branding &amp; Identity</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="ocr-subnav-tab"
                  onClick={() => handleTabClick('security')}
                >
                  <span>Security Policies</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="ocr-subnav-tab"
                  onClick={() => handleTabClick('roles')}
                >
                  <span>Roles &amp; Permissions</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={true}
                  className="ocr-subnav-tab active"
                  onClick={() => handleTabClick('ocr')}
                  aria-current="page"
                >
                  <span>OCR &amp; Notifications</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="ocr-subnav-tab"
                  onClick={() => handleTabClick('integrations')}
                >
                  <span>Integrations &amp; Backup</span>
                </button>
              </div>
            </nav>

            {/* Form wrapper */}
            <form onSubmit={handleSubmit(onSaveSubmit)} className="flex flex-col gap-6 w-full">
              {/* 3-Column Content Grid: Left Col (2 cols) & Right Col (1 col) */}
              <div className="ocr-content-grid">
                {/* Left Column (2 Cols Span) */}
                <div className="ocr-grid-left-col">
                  {/* Card 1: OCR Engine Configuration */}
                  <section className="ocr-card" aria-labelledby="ocr-engine-title">
                    <div className="ocr-card-header">
                      <div className="ocr-card-title-group">
                        <div className="ocr-card-icon-wrap">
                          <Cpu className="w-5 h-5" />
                        </div>
                        <div className="ocr-card-title-text">
                          <h2 id="ocr-engine-title">OCR Engine Configuration</h2>
                          <p>Core computer vision parser and automated decision matrix</p>
                        </div>
                      </div>
                      <span className="ocr-live-badge">
                        <span className="ocr-live-dot" />
                        Live Production
                      </span>
                    </div>

                    {/* Primary OCR Provider Dropdown */}
                    <div className="ocr-form-group">
                      <label htmlFor="primaryOcrProvider" className="ocr-form-label">
                        Primary OCR Provider
                      </label>
                      <div className="ocr-select-wrapper">
                        <Controller
                          name="primaryOcrProvider"
                          control={control}
                          render={({ field }) => (
                            <select
                              id="primaryOcrProvider"
                              className="ocr-select-control"
                              {...field}
                            >
                              <option value="Care ID Medical Vision AI (Enterprise v4.2)">
                                Care ID Medical Vision AI (Enterprise v4.2)
                              </option>
                              <option value="Google Cloud Healthcare Document AI v2.1">
                                Google Cloud Healthcare Document AI v2.1
                              </option>
                              <option value="AWS Comprehend Medical Parser v3.0">
                                AWS Comprehend Medical Parser v3.0
                              </option>
                              <option value="Azure Health Cognitive Services v1.4">
                                Azure Health Cognitive Services v1.4
                              </option>
                            </select>
                          )}
                        />
                        <ChevronDown className="ocr-select-chevron" />
                      </div>
                    </div>

                    {/* Dual Sliders Grid */}
                    <div className="ocr-sliders-grid">
                      {/* Slider 1: Auto-Approval Threshold */}
                      <div className="ocr-slider-card">
                        <div className="ocr-slider-header">
                          <span className="ocr-slider-label">Auto-Approval Threshold</span>
                          <span className="ocr-slider-metric-auto">{autoApprovalThreshold}%</span>
                        </div>
                        <Controller
                          name="autoApprovalThreshold"
                          control={control}
                          render={({ field }) => (
                            <input
                              type="range"
                              min="50"
                              max="100"
                              step="1"
                              className="ocr-slider-range"
                              value={field.value}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              aria-label="Auto-Approval Threshold Percentage"
                            />
                          )}
                        />
                        <p className="ocr-slider-helptext">
                          Records above this confidence score bypass manual verification directly into the patient vault.
                        </p>
                      </div>

                      {/* Slider 2: Manual Review Threshold */}
                      <div className="ocr-slider-card">
                        <div className="ocr-slider-header">
                          <span className="ocr-slider-label">Manual Review Threshold</span>
                          <span className="ocr-slider-metric-manual">{manualReviewThreshold}%</span>
                        </div>
                        <Controller
                          name="manualReviewThreshold"
                          control={control}
                          render={({ field }) => (
                            <input
                              type="range"
                              min="10"
                              max="80"
                              step="1"
                              className="ocr-slider-range"
                              value={field.value}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              aria-label="Manual Review Threshold Percentage"
                            />
                          )}
                        />
                        <p className="ocr-slider-helptext">
                          Records below this score require human admin intervention before database ingestion.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Card 2: Supported Medical Document Types */}
                  <section className="ocr-card" aria-labelledby="supported-doc-types-title">
                    <div className="ocr-card-header">
                      <div className="ocr-card-title-group">
                        <div className="ocr-card-icon-wrap">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div className="ocr-card-title-text">
                          <h2 id="supported-doc-types-title">Supported Medical Document Types</h2>
                          <p>Select document schemas enabled for automatic classification and semantic extraction</p>
                        </div>
                      </div>
                    </div>

                    <div className="ocr-doc-types-grid">
                      {/* 1. Lab Reports */}
                      <div
                        className="ocr-doc-type-card"
                        onClick={() => handleToggleDocType('labReports')}
                        role="checkbox"
                        aria-checked={supportedDocTypes.labReports}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === ' ' && handleToggleDocType('labReports')}
                      >
                        <div className="ocr-doc-type-left">
                          <div className="ocr-doc-icon-wrap">
                            <FlaskConical className="w-4 h-4" />
                          </div>
                          <div className="ocr-doc-label-group">
                            <span className="ocr-doc-title">Lab Reports</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`ocr-checkbox-btn ${supportedDocTypes.labReports ? 'checked' : ''}`}
                          aria-label="Toggle Lab Reports"
                          tabIndex={-1}
                        >
                          {supportedDocTypes.labReports && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      </div>

                      {/* 2. Clinical Progress Notes */}
                      <div
                        className="ocr-doc-type-card"
                        onClick={() => handleToggleDocType('clinicalProgressNotes')}
                        role="checkbox"
                        aria-checked={supportedDocTypes.clinicalProgressNotes}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === ' ' && handleToggleDocType('clinicalProgressNotes')}
                      >
                        <div className="ocr-doc-type-left">
                          <div className="ocr-doc-icon-wrap">
                            <ClipboardList className="w-4 h-4" />
                          </div>
                          <div className="ocr-doc-label-group">
                            <span className="ocr-doc-title">Clinical Progress Notes</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`ocr-checkbox-btn ${supportedDocTypes.clinicalProgressNotes ? 'checked' : ''}`}
                          aria-label="Toggle Clinical Progress Notes"
                          tabIndex={-1}
                        >
                          {supportedDocTypes.clinicalProgressNotes && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      </div>

                      {/* 3. Imaging & Radiology Requisitions */}
                      <div
                        className="ocr-doc-type-card"
                        onClick={() => handleToggleDocType('imagingRadiology')}
                        role="checkbox"
                        aria-checked={supportedDocTypes.imagingRadiology}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === ' ' && handleToggleDocType('imagingRadiology')}
                      >
                        <div className="ocr-doc-type-left">
                          <div className="ocr-doc-icon-wrap">
                            <Film className="w-4 h-4" />
                          </div>
                          <div className="ocr-doc-label-group">
                            <span className="ocr-doc-title">Imaging &amp; Radiology Requisitions</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`ocr-checkbox-btn ${supportedDocTypes.imagingRadiology ? 'checked' : ''}`}
                          aria-label="Toggle Imaging & Radiology Requisitions"
                          tabIndex={-1}
                        >
                          {supportedDocTypes.imagingRadiology && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      </div>

                      {/* 4. Prescription Pads */}
                      <div
                        className="ocr-doc-type-card"
                        onClick={() => handleToggleDocType('prescriptionPads')}
                        role="checkbox"
                        aria-checked={supportedDocTypes.prescriptionPads}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === ' ' && handleToggleDocType('prescriptionPads')}
                      >
                        <div className="ocr-doc-type-left">
                          <div className="ocr-doc-icon-wrap">
                            <Pill className="w-4 h-4" />
                          </div>
                          <div className="ocr-doc-label-group">
                            <span className="ocr-doc-title">Prescription Pads</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`ocr-checkbox-btn ${supportedDocTypes.prescriptionPads ? 'checked' : ''}`}
                          aria-label="Toggle Prescription Pads"
                          tabIndex={-1}
                        >
                          {supportedDocTypes.prescriptionPads && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      </div>

                      {/* 5. Billing Invoices (Full span) */}
                      <div
                        className="ocr-doc-type-card full-span"
                        onClick={() => handleToggleDocType('billingInvoices')}
                        role="checkbox"
                        aria-checked={supportedDocTypes.billingInvoices}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === ' ' && handleToggleDocType('billingInvoices')}
                      >
                        <div className="ocr-doc-type-left">
                          <div className="ocr-doc-icon-wrap">
                            <Receipt className="w-4 h-4" />
                          </div>
                          <div className="ocr-doc-label-group flex flex-row items-center gap-2">
                            <span className="ocr-doc-title">Billing Invoices</span>
                            <span className="ocr-doc-subtitle">(Handled via Revenue Cycle Subsystem)</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`ocr-checkbox-btn ${supportedDocTypes.billingInvoices ? 'checked' : ''}`}
                          aria-label="Toggle Billing Invoices"
                          tabIndex={-1}
                        >
                          {supportedDocTypes.billingInvoices && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Right Column (1 Col Span) */}
                <div className="ocr-grid-right-col">
                  {/* Card 3: Upload Limits & Retry */}
                  <section className="ocr-card" aria-labelledby="upload-limits-title">
                    <div className="ocr-card-header">
                      <div className="ocr-card-title-group">
                        <div className="ocr-card-icon-wrap">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div className="ocr-card-title-text">
                          <h2 id="upload-limits-title">Upload Limits &amp; Retry</h2>
                        </div>
                      </div>
                    </div>

                    {/* Max Upload Size */}
                    <div className="ocr-form-group">
                      <label htmlFor="maxUploadSizeMb" className="ocr-form-label">
                        Max Upload Size (MB)
                      </label>
                      <div className="ocr-input-with-suffix">
                        <Controller
                          name="maxUploadSizeMb"
                          control={control}
                          render={({ field }) => (
                            <input
                              id="maxUploadSizeMb"
                              type="number"
                              min="5"
                              max="100"
                              className="ocr-input-number"
                              value={field.value}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          )}
                        />
                        <span className="ocr-input-suffix">MB</span>
                      </div>
                    </div>

                    {/* Accepted Formats */}
                    <div className="ocr-form-group">
                      <span className="ocr-form-label">Accepted Formats</span>
                      <div className="ocr-format-pills">
                        {['PDF', 'JPG', 'PNG', 'DICOM'].map((format) => {
                          const isEnabled = acceptedFormats.includes(format);
                          const isDicom = format === 'DICOM';
                          return (
                            <button
                              key={format}
                              type="button"
                              className={`ocr-format-pill ${isDicom ? 'highlight' : ''} ${
                                isEnabled ? '' : 'opacity-40 line-through'
                              }`}
                              onClick={() => handleToggleFormat(format)}
                              title={`Toggle ${format} support`}
                            >
                              {format}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="ocr-divider-line">
                      {/* Auto-Retry Switch */}
                      <div className="ocr-switch-row">
                        <div className="ocr-switch-info">
                          <span className="ocr-switch-title">Auto-Retry on Failure</span>
                          <span className="ocr-switch-desc">Attempts 3 re-passes with filter adjust</span>
                        </div>
                        <button
                          type="button"
                          className={`ocr-toggle-switch ${autoRetryOnFailure ? 'checked' : ''}`}
                          onClick={() => setValue('autoRetryOnFailure', !autoRetryOnFailure, { shouldDirty: true })}
                          role="switch"
                          aria-checked={autoRetryOnFailure}
                          aria-label="Auto-Retry on Failure"
                        >
                          <span className="ocr-toggle-thumb" />
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Card 4: Audit Trail Synchronization Gradient Card */}
                  <section className="ocr-gradient-card" aria-labelledby="audit-trail-title">
                    <div className="ocr-gradient-badge">
                      <ShieldCheck className="w-4 h-4 text-[#5af8fb]" />
                      <span>HIPAA &amp; ISO 27001 READY</span>
                    </div>
                    <h3 id="audit-trail-title">Audit Trail Synchronization</h3>
                    <p>
                      All changes to OCR thresholds and alert routes are timestamped and digitally signed in the
                      immutable system compliance log.
                    </p>
                  </section>
                </div>
              </div>

              {/* 5. Notification Routing Matrix (Full Width Card across 1140px) */}
              <section className="ocr-matrix-section" aria-labelledby="notification-matrix-title">
                <div className="ocr-card">
                  <div className="ocr-card-header">
                    <div className="ocr-card-title-group">
                      <div className="ocr-card-icon-wrap">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="ocr-card-title-text">
                        <h2 id="notification-matrix-title">Notification Routing Matrix</h2>
                        <p>
                          Dispatch critical operational and security event notifications across verified administrative
                          endpoints.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="ocr-matrix-container">
                    <div className="ocr-matrix-table-wrap">
                      <table className="ocr-matrix-table">
                        <thead>
                          <tr>
                            <th className="col-event">EVENT &amp; ROUTE SPECIFICATION</th>
                            <th className="col-center">EMAIL</th>
                            <th className="col-center">SMS</th>
                            <th className="col-center">APP PUSH</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Row 1: System Critical Alerts */}
                          <tr>
                            <td>
                              <div className="ocr-event-info">
                                <span className="ocr-event-title">System Critical Alerts</span>
                                <span className="ocr-event-subtext">
                                  Cluster health degradation, database failovers, and capacity thresholds.
                                </span>
                              </div>
                            </td>
                            <td className="ocr-matrix-checkbox-cell">
                              <button
                                type="button"
                                className={`ocr-checkbox-btn ${
                                  notificationRouting.systemCriticalAlerts.email ? 'checked' : ''
                                }`}
                                onClick={() => handleToggleNotification('systemCriticalAlerts', 'email')}
                                aria-label="Toggle Email for System Critical Alerts"
                              >
                                {notificationRouting.systemCriticalAlerts.email && (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </button>
                            </td>
                            <td className="ocr-matrix-checkbox-cell">
                              <button
                                type="button"
                                className={`ocr-checkbox-btn ${
                                  notificationRouting.systemCriticalAlerts.sms ? 'checked' : ''
                                }`}
                                onClick={() => handleToggleNotification('systemCriticalAlerts', 'sms')}
                                aria-label="Toggle SMS for System Critical Alerts"
                              >
                                {notificationRouting.systemCriticalAlerts.sms && (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </button>
                            </td>
                            <td className="ocr-matrix-checkbox-cell">
                              <button
                                type="button"
                                className={`ocr-checkbox-btn ${
                                  notificationRouting.systemCriticalAlerts.appPush ? 'checked' : ''
                                }`}
                                onClick={() => handleToggleNotification('systemCriticalAlerts', 'appPush')}
                                aria-label="Toggle App Push for System Critical Alerts"
                              >
                                {notificationRouting.systemCriticalAlerts.appPush && (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Row 2: OCR Exceptions & Ambiguities */}
                          <tr>
                            <td>
                              <div className="ocr-event-info">
                                <span className="ocr-event-title">OCR Exceptions &amp; Ambiguities</span>
                                <span className="ocr-event-subtext">
                                  Documents falling below 60% confidence or failing field validation rules.
                                </span>
                              </div>
                            </td>
                            <td className="ocr-matrix-checkbox-cell">
                              <button
                                type="button"
                                className={`ocr-checkbox-btn ${
                                  notificationRouting.ocrExceptions.email ? 'checked' : ''
                                }`}
                                onClick={() => handleToggleNotification('ocrExceptions', 'email')}
                                aria-label="Toggle Email for OCR Exceptions"
                              >
                                {notificationRouting.ocrExceptions.email && (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </button>
                            </td>
                            <td className="ocr-matrix-checkbox-cell">
                              <button
                                type="button"
                                className={`ocr-checkbox-btn ${
                                  notificationRouting.ocrExceptions.sms ? 'checked' : ''
                                }`}
                                onClick={() => handleToggleNotification('ocrExceptions', 'sms')}
                                aria-label="Toggle SMS for OCR Exceptions"
                              >
                                {notificationRouting.ocrExceptions.sms && (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </button>
                            </td>
                            <td className="ocr-matrix-checkbox-cell">
                              <button
                                type="button"
                                className={`ocr-checkbox-btn ${
                                  notificationRouting.ocrExceptions.appPush ? 'checked' : ''
                                }`}
                                onClick={() => handleToggleNotification('ocrExceptions', 'appPush')}
                                aria-label="Toggle App Push for OCR Exceptions"
                              >
                                {notificationRouting.ocrExceptions.appPush && (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Row 3: Referral Routing & Escalations */}
                          <tr>
                            <td>
                              <div className="ocr-event-info">
                                <span className="ocr-event-title">Referral Routing &amp; Escalations</span>
                                <span className="ocr-event-subtext">
                                  Unclaimed urgent clinical consultations and specialty handoff timeouts.
                                </span>
                              </div>
                            </td>
                            <td className="ocr-matrix-checkbox-cell">
                              <button
                                type="button"
                                className={`ocr-checkbox-btn ${
                                  notificationRouting.referralRouting.email ? 'checked' : ''
                                }`}
                                onClick={() => handleToggleNotification('referralRouting', 'email')}
                                aria-label="Toggle Email for Referral Routing"
                              >
                                {notificationRouting.referralRouting.email && (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </button>
                            </td>
                            <td className="ocr-matrix-checkbox-cell">
                              <button
                                type="button"
                                className={`ocr-checkbox-btn ${
                                  notificationRouting.referralRouting.sms ? 'checked' : ''
                                }`}
                                onClick={() => handleToggleNotification('referralRouting', 'sms')}
                                aria-label="Toggle SMS for Referral Routing"
                              >
                                {notificationRouting.referralRouting.sms && (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </button>
                            </td>
                            <td className="ocr-matrix-checkbox-cell">
                              <button
                                type="button"
                                className={`ocr-checkbox-btn ${
                                  notificationRouting.referralRouting.appPush ? 'checked' : ''
                                }`}
                                onClick={() => handleToggleNotification('referralRouting', 'appPush')}
                                aria-label="Toggle App Push for Referral Routing"
                              >
                                {notificationRouting.referralRouting.appPush && (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Row 4: Facility Accreditation Updates */}
                          <tr>
                            <td>
                              <div className="ocr-event-info">
                                <span className="ocr-event-title">Facility Accreditation Updates</span>
                                <span className="ocr-event-subtext">
                                  License renewals, CLIA certifications, and compliance status changes.
                                </span>
                              </div>
                            </td>
                            <td className="ocr-matrix-checkbox-cell">
                              <button
                                type="button"
                                className={`ocr-checkbox-btn ${
                                  notificationRouting.facilityAccreditation.email ? 'checked' : ''
                                }`}
                                onClick={() => handleToggleNotification('facilityAccreditation', 'email')}
                                aria-label="Toggle Email for Facility Accreditation Updates"
                              >
                                {notificationRouting.facilityAccreditation.email && (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </button>
                            </td>
                            <td className="ocr-matrix-checkbox-cell">
                              <button
                                type="button"
                                className={`ocr-checkbox-btn ${
                                  notificationRouting.facilityAccreditation.sms ? 'checked' : ''
                                }`}
                                onClick={() => handleToggleNotification('facilityAccreditation', 'sms')}
                                aria-label="Toggle SMS for Facility Accreditation Updates"
                              >
                                {notificationRouting.facilityAccreditation.sms && (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </button>
                            </td>
                            <td className="ocr-matrix-checkbox-cell">
                              <button
                                type="button"
                                className={`ocr-checkbox-btn ${
                                  notificationRouting.facilityAccreditation.appPush ? 'checked' : ''
                                }`}
                                onClick={() => handleToggleNotification('facilityAccreditation', 'appPush')}
                                aria-label="Toggle App Push for Facility Accreditation Updates"
                              >
                                {notificationRouting.facilityAccreditation.appPush && (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </section>

              {/* 6. Actions Bar Footer */}
              <div className="ocr-footer-bar">
                <button
                  type="button"
                  className="ocr-btn-discard"
                  onClick={handleDiscard}
                >
                  Discard
                </button>

                <div className="ocr-footer-right-buttons">
                  <button
                    type="submit"
                    className="ocr-btn-save"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                  </button>

                  <button
                    type="button"
                    className="ocr-btn-proceed"
                    onClick={() => handleNav('/admin/settings/integrations')}
                  >
                    <span>Proceed to Integrations &amp; Backup</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </main>

        {/* Toast Notification */}
        {notification && (
          <div
            className={`ocr-toast-notification ${
              notification.type === 'error'
                ? 'bg-rose-900 border-rose-500'
                : notification.type === 'info'
                ? 'bg-[#191c1e]'
                : 'bg-[#28006d]'
            }`}
            role="status"
            aria-live="polite"
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : notification.type === 'error' ? (
              <X className="w-4 h-4 text-rose-400" />
            ) : (
              <RotateCcw className="w-4 h-4 text-cyan-300" />
            )}
            <span>{notification.message}</span>
            <button
              type="button"
              className="ml-2 text-white/70 hover:text-white"
              onClick={() => setNotification(null)}
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSystemSettingsOcr;
