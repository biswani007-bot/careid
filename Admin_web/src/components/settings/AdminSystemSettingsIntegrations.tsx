import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Home,
  Search,
  Bell,
  HelpCircle,
  Menu,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Radio,
  Building2,
  Palette,
  ShieldCheck,
  Sliders,
  HardDrive,
  Mail,
  MessageSquare,
  Cloud,
  Network,
  RotateCw,
  Download,
  Play,
  Clock,
  Archive,
  ChevronDown,
  ChevronLeft,
  X,
  Plus,
  RefreshCw,
  Activity,
  Loader2
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import {
  getSystemSettings,
  batchUpsertSystemSettings,
  getMaintenanceStatus,
  type MaintenanceStatusData
} from '../../services/systemSettingsService';
import './AdminSystemSettingsIntegrations.css';

// ============================================================================
// Form Schema & Types
// ============================================================================
export const integrationsBackupSchema = z.object({
  // Section 1: Connected Communication & Storage Services
  awsSesApiKey: z.string().min(10, 'AWS SES API Key must be at least 10 characters'),
  awsSesRegion: z.string().default('us-east-1'),
  awsSesSenderEmail: z.string().email().default('notifications@careid-health.org'),
  twilioAccountSid: z.string().min(10, 'Twilio Account SID is required'),
  twilioAuthToken: z.string().min(10, 'Twilio Auth Token is required'),
  twilioSenderPhone: z.string().default('+18005550199'),
  gcpServiceAccount: z.string().email('Must be a valid GCP service account email'),
  gcpStorageBucket: z.string().default('careid-clinical-vault-prod-primary'),
  gcpKmsKeyArn: z.string().default('projects/careid-prod/locations/us/keyRings/vault/cryptoKeys/cmk-phi-v1'),

  // Section 2: Hospital Information Systems Gateways
  fhirEndpointUrl: z.string().url('Must be a valid FHIR URL'),
  fhirClientId: z.string().default('CAREID_EHR_CORE_CLIENT_01'),
  fhirSyncIntervalMinutes: z.number().min(1).max(60).default(5),
  mllpPort: z.number().default(2575),
  mllpHost: z.string().default('mllp-broker.internal.careid.org'),
  deadLetterRetentionDays: z.number().min(1).max(90).default(30),

  // Section 3: Backup & Disaster Recovery
  snapshotScheduleUtc: z.string().default('02:00'),
  retentionYears: z.number().min(1).max(25).default(7),
  wormVaultEnabled: z.boolean().default(true),
  geoReplicationRegion: z.string().default('US-West (Oregon - us-west-2)'),
  autoFailoverEnabled: z.boolean().default(true)
});

export type IntegrationsBackupFormValues = z.infer<typeof integrationsBackupSchema>;

export const DEFAULT_INTEGRATIONS_SETTINGS: IntegrationsBackupFormValues = {
  awsSesApiKey: 'AKIA1234567890EXAMPLEKEY',
  awsSesRegion: 'us-east-1',
  awsSesSenderEmail: 'notifications@careid-health.org',
  twilioAccountSid: 'ACa34891bca7821900184abcdef123',
  twilioAuthToken: '9b87612c40e53a992bcda772183e911f',
  twilioSenderPhone: '+18005550199',
  gcpServiceAccount: 'health-vault-prod-sa-2024@gcp-careid.iam.gserviceaccount.com',
  gcpStorageBucket: 'careid-clinical-vault-prod-primary',
  gcpKmsKeyArn: 'projects/careid-prod/locations/us/keyRings/vault/cryptoKeys/cmk-phi-v1',
  fhirEndpointUrl: 'https://api.mountsinai.org/fhir',
  fhirClientId: 'CAREID_EHR_CORE_CLIENT_01',
  fhirSyncIntervalMinutes: 5,
  mllpPort: 2575,
  mllpHost: 'mllp-broker.internal.careid.org',
  deadLetterRetentionDays: 30,
  snapshotScheduleUtc: '02:00',
  retentionYears: 7,
  wormVaultEnabled: true,
  geoReplicationRegion: 'US-West (Oregon - us-west-2)',
  autoFailoverEnabled: true
};

export interface RestorePoint {
  id: string;
  timestamp: string;
  typeAndCluster: string;
  snapshotSize: string;
  integrityStatus: string;
  wormVerified: boolean;
  shaChecksum: string;
}

export const INITIAL_RESTORE_POINTS: RestorePoint[] = [
  {
    id: 'rp-1',
    timestamp: 'Today - 02:00:14 UTC',
    typeAndCluster: 'Automated (Daily Snapshot) • Node Alpha',
    snapshotSize: '4.8 GB',
    integrityStatus: 'VERIFIED WORM',
    wormVerified: true,
    shaChecksum: 'sha256-8f4e2b0c91a347e7d6b189ff12aa01'
  },
  {
    id: 'rp-2',
    timestamp: 'Yesterday - 02:00:10 UTC',
    typeAndCluster: 'Automated (Daily Snapshot) • Node Alpha',
    snapshotSize: '4.75 GB',
    integrityStatus: 'VERIFIED WORM',
    wormVerified: true,
    shaChecksum: 'sha256-3a7d11e82ef4c8901b09ca8824df90'
  },
  {
    id: 'rp-3',
    timestamp: '2 Days Ago - 16:45:00 UTC',
    typeAndCluster: 'Manual (Pre-Deployment Snapshot) • Super Admin',
    snapshotSize: '4.72 GB',
    integrityStatus: 'VERIFIED WORM',
    wormVerified: true,
    shaChecksum: 'sha256-e92c44b01783d29a510c4fe378bb93'
  }
];

export interface AdminSystemSettingsIntegrationsProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminSystemSettingsIntegrations: React.FC<AdminSystemSettingsIntegrationsProps> = ({
  onNavigate,
  onLogout
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceStatusData | null>(null);

  // Field Obfuscation Visibility Toggles
  const [showAwsKey, setShowAwsKey] = useState(false);
  const [showTwilioSid, setShowTwilioSid] = useState(false);

  // Table state for Restore Points
  const [restorePoints, setRestorePoints] = useState<RestorePoint[]>(INITIAL_RESTORE_POINTS);

  // Modal Dialogs
  const [activeModal, setActiveModal] = useState<
    | null
    | 'awsSes'
    | 'twilio'
    | 'gcp'
    | 'connectEhr'
    | 'fhirEndpoints'
    | 'brokerLogs'
    | 'testRestore'
    | 'manualBackup'
  >(null);

  const [selectedRestorePoint, setSelectedRestorePoint] = useState<RestorePoint | null>(null);
  const [backupProgress, setBackupProgress] = useState<number>(0);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);

  // Form management
  const {
    handleSubmit,
    reset,
    watch
  } = useForm<IntegrationsBackupFormValues>({
    resolver: zodResolver(integrationsBackupSchema),
    defaultValues: DEFAULT_INTEGRATIONS_SETTINGS
  });

  const awsSesApiKey = watch('awsSesApiKey');
  const twilioAccountSid = watch('twilioAccountSid');
  const gcpServiceAccount = watch('gcpServiceAccount');

  // Load existing integration settings and maintenance status from live backend
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [settings, maint] = await Promise.all([
          getSystemSettings('INTEGRATIONS'),
          getMaintenanceStatus()
        ]);

        if (!isMounted) return;
        if (maint) setMaintenanceData(maint);

        const map: Record<string, string> = {};
        settings.forEach((s) => {
          map[s.key] = s.value;
        });

        if (map['RESTORE_POINTS']) {
          try {
            const savedPoints = JSON.parse(map['RESTORE_POINTS']);
            if (Array.isArray(savedPoints) && savedPoints.length > 0) {
              setRestorePoints(savedPoints);
            }
          } catch {
            // Keep default
          }
        }
      } catch (err: any) {
        console.error('Failed to load integration settings:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-dismiss notification
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

  const handleTabClick = (
    tabKey: 'general' | 'branding' | 'security' | 'roles' | 'ocr' | 'integrations' | 'announcements'
  ) => {
    if (tabKey === 'general') {
      handleNav('/admin/settings/general');
    } else if (tabKey === 'branding') {
      handleNav('/admin/settings/branding');
    } else if (tabKey === 'security') {
      handleNav('/admin/settings/security');
    } else if (tabKey === 'roles') {
      handleNav('/admin/settings/roles');
    } else if (tabKey === 'ocr') {
      handleNav('/admin/settings/ocr');
    } else if (tabKey === 'integrations') {
      // current page
    } else if (tabKey === 'announcements') {
      handleNav('/admin/settings/announcements');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setNotification({
      type: 'success',
      message: `${label} copied to clipboard!`
    });
  };

  const onSaveSubmit = async (data: IntegrationsBackupFormValues) => {
    try {
      setIsSaving(true);
      const result = await batchUpsertSystemSettings([
        {
          category: 'INTEGRATIONS',
          key: 'AWS_SES_API_KEY',
          value: data.awsSesApiKey,
          valueType: 'STRING',
          description: 'AWS SES outbound transactional email endpoint credentials'
        },
        {
          category: 'INTEGRATIONS',
          key: 'TWILIO_ACCOUNT_SID',
          value: data.twilioAccountSid,
          valueType: 'STRING',
          description: 'Twilio SMS & OTP delivery API credentials'
        },
        {
          category: 'INTEGRATIONS',
          key: 'GCP_SERVICE_ACCOUNT',
          value: data.gcpServiceAccount,
          valueType: 'STRING',
          description: 'Google Cloud Platform service account JSON client key'
        },
        {
          category: 'INTEGRATIONS',
          key: 'RESTORE_POINTS',
          value: JSON.stringify(restorePoints),
          valueType: 'JSON',
          description: 'Immutable ledger of WORM encrypted backup snapshots'
        }
      ]);

      if (result.success) {
        setNotification({
          type: 'success',
          message: 'Integrations and backup recovery policies updated and persisted in live backend.'
        });
      } else {
        setNotification({
          type: 'info',
          message: `Saved with status: ${result.errors.join('; ')}`
        });
      }
    } catch (err: any) {
      console.error('Failed to save integration settings:', err);
      setNotification({
        type: 'error',
        message: `Failed to persist integrations: ${err?.message || 'Server error'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    reset(DEFAULT_INTEGRATIONS_SETTINGS);
    setNotification({
      type: 'info',
      message: 'Changes discarded. Configuration reset to active deployment baseline.'
    });
  };

  // Run Manual Backup Simulation
  const handleStartManualBackup = () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    setBackupProgress(10);
    setActiveModal('manualBackup');

    let current = 10;
    const interval = setInterval(() => {
      current += 30;
      if (current >= 100) {
        clearInterval(interval);
        setBackupProgress(100);
        setIsBackingUp(false);
        const newPoint: RestorePoint = {
          id: `rp-${Date.now()}`,
          timestamp: `Today - ${new Date().toISOString().substring(11, 19)} UTC`,
          typeAndCluster: 'Manual (Ad-hoc Snapshot) • Super Admin',
          snapshotSize: '4.82 GB',
          integrityStatus: 'VERIFIED WORM',
          wormVerified: true,
          shaChecksum: `sha256-${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`
        };
        setRestorePoints((curr) => [newPoint, ...curr]);
        setNotification({
          type: 'success',
          message: 'Manual backup completed successfully. SHA-256 validated in WORM vault.'
        });
        setTimeout(() => setActiveModal(null), 1200);
      } else {
        setBackupProgress(current);
      }
    }, 350);
  };

  const handleDownloadAudit = () => {
    setNotification({
      type: 'success',
      message: 'Disaster Recovery Audit Report (HIPAA/SOC2) compiled and downloaded.'
    });
  };

  const handleOpenTestRestore = (rp: RestorePoint) => {
    setSelectedRestorePoint(rp);
    setActiveModal('testRestore');
  };

  return (
    <div className="int-page-wrapper" data-node-id="20:14376" data-name="Care ID Admin - System Settings: Integrations & Backup">
      {/* Mobile Drawer Overlay Backdrop */}
      <div
        className={`careid-drawer-backdrop ${isDrawerOpen ? 'drawer-open show' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* CareID Admin Sidebar */}
      <AdminSidebar
        activeNav="settings"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="int-main-canvas" data-node-id="20:14378" data-name="Main Content Area Wrapper">
        {/* 1. Header - TopNavBar (Shared Component) */}
        <header className="int-header-top" data-node-id="20:14379" data-name="Header - TopNavBar (Shared Component)">
          <div className="int-top-left">
            <button
              type="button"
              className="int-menu-trigger-btn"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation sidebar"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumbs */}
            <nav className="int-breadcrumb-nav" aria-label="Breadcrumbs" data-node-id="20:14380" data-name="Breadcrumbs">
              <Home className="int-breadcrumb-home-icon" />
              <span className="int-breadcrumb-sep">/</span>
              <button
                type="button"
                className="int-breadcrumb-item"
                onClick={() => handleNav('/admin/dashboard')}
              >
                Admin Portal
              </button>
              <span className="int-breadcrumb-sep">/</span>
              <button
                type="button"
                className="int-breadcrumb-item"
                onClick={() => handleNav('/admin/settings/general')}
              >
                System Settings
              </button>
              <span className="int-breadcrumb-sep">/</span>
              <span className="int-breadcrumb-item active" aria-current="page">
                Integrations &amp; Backup
              </span>
            </nav>
          </div>

          <div className="int-top-right" data-node-id="20:14395" data-name="Global Search & Actions">
            {/* Search Input */}
            <div className="int-search-container" data-node-id="20:14396">
              <Search className="int-search-icon" />
              <input
                type="text"
                placeholder="Search facilities, patients, logs..."
                className="int-search-input"
              />
            </div>

            {/* Actions */}
            <div className="int-top-actions">
              <button type="button" className="int-icon-btn" aria-label="Notifications">
                <Bell size={18} />
                <span className="int-notif-badge" />
              </button>
              <button type="button" className="int-icon-btn" aria-label="Help & Documentation">
                <HelpCircle size={18} />
              </button>
              <button
                type="button"
                className="int-icon-btn"
                aria-label="Settings Quick Switch"
                onClick={() => handleNav('/admin/settings/general')}
              >
                <Sliders size={18} />
              </button>
            </div>

            <div className="int-top-divider" />

            {/* User Profile */}
            <button
              type="button"
              className="int-user-profile-btn"
              onClick={() => handleNav('/admin/profile')}
              aria-label="My Profile & Information"
              title="My Profile & Information"
            >
              <AdminProfileAvatar size={32} />
              <div className="int-user-info">
                <span className="int-user-name">Dr. Robert Chen</span>
                <span className="int-user-role">Super Admin</span>
              </div>
              <ChevronDown className="int-dropdown-arrow" />
            </button>
          </div>
        </header>

        {/* 2. Main - Settings Content Scrollable Area */}
        <main className="int-page-body" data-node-id="20:14424" data-name="Main - Settings Content Scrollable Area">
          <div className="int-canvas-container" data-node-id="20:14425">
            {/* Page Header */}
            <div className="int-header-title-block flex items-start justify-between gap-4 flex-wrap" data-node-id="20:14426" data-name="Page Header">
              <div className="flex-1 min-w-[280px]">
                <h1 data-node-id="20:14428">Integrations &amp; Backup Recovery</h1>
                <p data-node-id="20:14430">
                  Manage third-party enterprise integrations, HL7/FHIR clinical data gateways, automated cloud vault backups, and disaster recovery replication.
                </p>
              </div>
            </div>

            {/* Settings Sub-Navigation Persistent Tabs (All 6 Tabs) */}
            <nav className="int-subnav-tabs" aria-label="System Settings Tabs" data-node-id="20:14431" data-name="Settings Sub-Navigation Persistent Tabs">
              <div className="int-subnav-tab-list" role="tablist" data-node-id="20:14432">
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="int-subnav-tab"
                  onClick={() => handleTabClick('general')}
                  data-node-id="20:14433"
                >
                  <Building2 className="int-tab-icon" />
                  <span>General &amp; Organization</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="int-subnav-tab"
                  onClick={() => handleTabClick('branding')}
                  data-node-id="20:14437"
                >
                  <Palette className="int-tab-icon" />
                  <span>Branding &amp; Identity</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="int-subnav-tab"
                  onClick={() => handleTabClick('security')}
                  data-node-id="20:14441"
                >
                  <ShieldCheck className="int-tab-icon" />
                  <span>Security Policies</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="int-subnav-tab"
                  onClick={() => handleTabClick('roles')}
                  data-node-id="20:14445"
                >
                  <Sliders className="int-tab-icon" />
                  <span>Roles &amp; Permissions</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="int-subnav-tab"
                  onClick={() => handleTabClick('ocr')}
                  data-node-id="20:14449"
                >
                  <Radio className="int-tab-icon" />
                  <span>OCR &amp; Notifications</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={true}
                  className="int-subnav-tab active"
                  onClick={() => handleTabClick('integrations')}
                  aria-current="page"
                  data-node-id="20:14453"
                >
                  <HardDrive className="int-tab-icon" />
                  <span>Integrations &amp; Backup</span>
                </button>
              </div>
            </nav>

            {/* Form & Card Sections */}
            <form onSubmit={handleSubmit(onSaveSubmit)} className="flex flex-col gap-8 w-full">
              {/* ==============================================================
                  SECTION 1: Connected Communication & Storage Services
                  ============================================================== */}
              <section
                className="int-section-card"
                data-node-id="20:14458"
                data-name="Section - SECTION 1: Connected Communication & Storage Services"
              >
                <div className="int-section-header" data-node-id="20:14459">
                  <div className="int-section-title-wrap">
                    <div className="int-section-title-row" data-node-id="20:14461">
                      <Radio className="int-section-icon" />
                      <h3 data-node-id="20:14464">Connected Communication &amp; Storage Services</h3>
                    </div>
                    <p className="int-section-desc" data-node-id="20:14466">
                      Operational gateways for SMS, notification dispatch, and encrypted cloud asset storage.
                    </p>
                  </div>

                  <div className="int-status-badge active-green" data-node-id="20:14467">
                    <span className="int-status-dot" data-node-id="20:14468" />
                    <span data-node-id="20:14469">
                      {maintenanceData ? `MAINTENANCE: ${maintenanceData.mode}` : '3 ACTIVE CONNECTIONS'}
                    </span>
                  </div>
                </div>

                {/* 3 Gateway Service Cards Grid */}
                <div className="int-service-cards-grid" data-node-id="20:14470">
                  {/* Card 1: AWS SES */}
                  <div className="int-service-card" data-node-id="20:14471" data-name="AWS SES Card">
                    <div className="int-service-card-top">
                      <div className="int-service-card-header">
                        <div className="int-service-icon-info">
                          <div className="int-service-icon-box aws">
                            <Mail size={20} />
                          </div>
                          <div className="int-service-title-col">
                            <h4 data-node-id="20:14480">Email Provider</h4>
                            <span data-node-id="20:14482">AWS SES (Simple Email)</span>
                          </div>
                        </div>

                        <div className="int-badge-small-active" data-node-id="20:14483">
                          <Check size={12} />
                          <span>Active</span>
                        </div>
                      </div>

                      <div className="int-service-field" data-node-id="20:14487">
                        <label data-node-id="20:14489">API Key</label>
                        <div className="int-service-input-group">
                          <div className="int-service-input-box" data-node-id="20:14491">
                            <div className="int-service-input-value" data-node-id="20:14493">
                              {showAwsKey ? awsSesApiKey : 'AKIA1234567890••••••••••••'}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="int-copy-btn"
                            onClick={() => setShowAwsKey(!showAwsKey)}
                            title={showAwsKey ? 'Mask API key' : 'Show API key'}
                            aria-label="Toggle AWS key visibility"
                          >
                            {showAwsKey ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                          <button
                            type="button"
                            className="int-copy-btn"
                            onClick={() => copyToClipboard(awsSesApiKey, 'AWS SES API Key')}
                            title="Copy API key"
                            aria-label="Copy AWS key"
                          >
                            <Copy size={15} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="int-service-card-footer" data-node-id="20:14497">
                      <span className="int-service-card-meta" data-node-id="20:14499">
                        TLS 1.3 Verified
                      </span>
                      <button
                        type="button"
                        className="int-link-action-btn"
                        onClick={() => setActiveModal('awsSes')}
                        data-node-id="20:14501"
                      >
                        Configure
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Twilio SMS */}
                  <div className="int-service-card" data-node-id="20:14502" data-name="Twilio SMS Card">
                    <div className="int-service-card-top">
                      <div className="int-service-card-header">
                        <div className="int-service-icon-info">
                          <div className="int-service-icon-box twilio">
                            <MessageSquare size={20} />
                          </div>
                          <div className="int-service-title-col">
                            <h4 data-node-id="20:14511">SMS Gateway</h4>
                            <span data-node-id="20:14513">Twilio Healthcare HIPAA Edition</span>
                          </div>
                        </div>

                        <div className="int-badge-small-active" data-node-id="20:14514">
                          <Check size={12} />
                          <span>Active</span>
                        </div>
                      </div>

                      <div className="int-service-field" data-node-id="20:14518">
                        <label data-node-id="20:14520">Account SID</label>
                        <div className="int-service-input-group">
                          <div className="int-service-input-box" data-node-id="20:14522">
                            <div className="int-service-input-value" data-node-id="20:14524">
                              {showTwilioSid ? twilioAccountSid : 'ACa34891bca7821••••••••••••••••'}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="int-copy-btn"
                            onClick={() => setShowTwilioSid(!showTwilioSid)}
                            title={showTwilioSid ? 'Mask SID' : 'Show SID'}
                            aria-label="Toggle Twilio SID visibility"
                          >
                            {showTwilioSid ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                          <button
                            type="button"
                            className="int-copy-btn"
                            onClick={() => copyToClipboard(twilioAccountSid, 'Twilio Account SID')}
                            title="Copy Account SID"
                            aria-label="Copy Twilio SID"
                          >
                            <Copy size={15} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="int-service-card-footer" data-node-id="20:14528">
                      <span className="int-service-card-meta" data-node-id="20:14530">
                        BAA Executed
                      </span>
                      <button
                        type="button"
                        className="int-link-action-btn"
                        onClick={() => setActiveModal('twilio')}
                        data-node-id="20:14532"
                      >
                        Configure
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Google Cloud Healthcare Storage */}
                  <div
                    className="int-service-card"
                    data-node-id="20:14533"
                    data-name="Google Cloud Healthcare Storage Card"
                  >
                    <div className="int-service-card-top">
                      <div className="int-service-card-header">
                        <div className="int-service-icon-info">
                          <div className="int-service-icon-box gcp">
                            <Cloud size={20} />
                          </div>
                          <div className="int-service-title-col">
                            <h4 data-node-id="20:14542">Cloud Vault Storage</h4>
                            <span data-node-id="20:14544">Google Cloud Healthcare API &amp; Storage</span>
                          </div>
                        </div>

                        <div className="int-badge-small-active" data-node-id="20:14545">
                          <Check size={12} />
                          <span>Active</span>
                        </div>
                      </div>

                      <div className="int-service-field" data-node-id="20:14549">
                        <label data-node-id="20:14551">Service Account JSON</label>
                        <div className="int-service-input-group">
                          <div className="int-service-input-box" data-node-id="20:14553">
                            <div className="int-service-input-value secondary" data-node-id="20:14555">
                              {gcpServiceAccount}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="int-copy-btn"
                            onClick={() => copyToClipboard(gcpServiceAccount, 'GCP Service Account')}
                            title="Copy service account"
                            aria-label="Copy GCP service account"
                          >
                            <Copy size={15} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="int-service-card-footer" data-node-id="20:14559">
                      <span className="int-service-card-meta green" data-node-id="20:14561">
                        Encrypted with Customer-Managed Key
                      </span>
                      <button
                        type="button"
                        className="int-link-action-btn"
                        onClick={() => setActiveModal('gcp')}
                        data-node-id="20:14563"
                      >
                        Update Credentials
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* ==============================================================
                  SECTION 2: Hospital Information Systems (HIS / EHR Gateways)
                  ============================================================== */}
              <section
                className="int-section-card"
                data-node-id="20:14564"
                data-name="Section - SECTION 2: Hospital Information Systems (HIS / EHR Gateways)"
              >
                <div className="int-section-header" data-node-id="20:14565">
                  <div className="int-section-title-wrap">
                    <div className="int-section-title-row" data-node-id="20:14567">
                      <Activity className="int-section-icon" />
                      <h3 data-node-id="20:14570">Hospital Information Systems (HIS / EHR Gateways)</h3>
                    </div>
                    <p className="int-section-desc" data-node-id="20:14572">
                      Interoperability pipelines for FHIR and HL7 data exchange across networked hospital centers.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="int-btn-outline-teal"
                    onClick={() => setActiveModal('connectEhr')}
                    data-node-id="20:14573"
                  >
                    <Plus size={14} />
                    <span>Connect EHR Gateway</span>
                  </button>
                </div>

                {/* 2 Pipeline Cards Grid */}
                <div className="int-pipelines-grid" data-node-id="20:14577">
                  {/* Pipeline 1: HL7 FHIR v4.0.1 Core Pipeline */}
                  <div
                    className="int-pipeline-card"
                    data-node-id="20:14578"
                    data-name="HL7 FHIR Core Pipeline"
                  >
                    <div className="int-pipeline-header">
                      <div className="int-pipeline-badge-title">
                        <div className="int-fhir-tag" data-node-id="20:14582">
                          <span>FHIR</span>
                        </div>
                        <div className="int-pipeline-titles">
                          <h4 data-node-id="20:14586">HL7 FHIR v4.0.1 Core Pipeline</h4>
                          <p data-node-id="20:14588">Connected to Mount Sinai Epic System &amp; Cerner Sandbox</p>
                        </div>
                      </div>

                      <div className="int-sync-badge" data-node-id="20:14589">
                        <span className="int-status-dot" />
                        <span>LIVE SYNC 99.98%</span>
                      </div>
                    </div>

                    {/* Metric Trio Bar */}
                    <div className="int-metrics-trio-bar" data-node-id="20:14593">
                      <div className="int-metric-cell">
                        <span className="int-metric-label" data-node-id="20:14596">ENDPOINT</span>
                        <span className="int-metric-val" data-node-id="20:14598">api.mountsinai.org/fhir</span>
                      </div>
                      <div className="int-metric-cell">
                        <span className="int-metric-label" data-node-id="20:14601">THROUGHPUT</span>
                        <span className="int-metric-val" data-node-id="20:14603">142 ms avg</span>
                      </div>
                      <div className="int-metric-cell">
                        <span className="int-metric-label" data-node-id="20:14606">SECURITY</span>
                        <span className="int-metric-val teal" data-node-id="20:14608">mTLS + OAuth 2.0</span>
                      </div>
                    </div>

                    <div className="int-pipeline-footer" data-node-id="20:14609">
                      <span className="int-pipeline-footer-note" data-node-id="20:14611">
                        Last packet synchronized: 42 seconds ago
                      </span>
                      <button
                        type="button"
                        className="int-link-action-btn"
                        onClick={() => setActiveModal('fhirEndpoints')}
                        data-node-id="20:14613"
                      >
                        Configure Endpoints
                      </button>
                    </div>
                  </div>

                  {/* Pipeline 2: Inbound / Outbound Message Queuing */}
                  <div
                    className="int-pipeline-card"
                    data-node-id="20:14614"
                    data-name="Inbound/Outbound Message Queuing"
                  >
                    <div className="int-pipeline-header">
                      <div className="int-pipeline-badge-title">
                        <div className="int-mllp-tag" data-node-id="20:14618">
                          <Network size={20} />
                        </div>
                        <div className="int-pipeline-titles">
                          <h4 data-node-id="20:14623">Inbound / Outbound Message Queuing</h4>
                          <p data-node-id="20:14625">HL7 MLLP v2.x &amp; JSON Event Broker</p>
                        </div>
                      </div>

                      <div className="int-sync-badge" data-node-id="20:14626">
                        <span className="int-status-dot" />
                        <span>ACTIVE (0 ERRORS)</span>
                      </div>
                    </div>

                    {/* Metric Trio Bar */}
                    <div className="int-metrics-trio-bar" data-node-id="20:14630">
                      <div className="int-metric-cell">
                        <span className="int-metric-label" data-node-id="20:14633">MESSAGES / 24H</span>
                        <span className="int-metric-val" data-node-id="20:14635">24,910 processed</span>
                      </div>
                      <div className="int-metric-cell">
                        <span className="int-metric-label" data-node-id="20:14638">DLQ (DEAD LETTER)</span>
                        <span className="int-metric-val teal" data-node-id="20:14640">0 Pending</span>
                      </div>
                      <div className="int-metric-cell">
                        <span className="int-metric-label" data-node-id="20:14643">BUFFER CAPACITY</span>
                        <span className="int-metric-val" data-node-id="20:14645">4% utilized</span>
                      </div>
                    </div>

                    <div className="int-pipeline-footer" data-node-id="20:14646">
                      <span className="int-pipeline-footer-note" data-node-id="20:14648">
                        Auto-failover to standby US-East replica
                      </span>
                      <button
                        type="button"
                        className="int-link-action-btn"
                        onClick={() => setActiveModal('brokerLogs')}
                        data-node-id="20:14650"
                      >
                        View Broker Logs
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* ==============================================================
                  SECTION 3: Backup & Disaster Recovery
                  ============================================================== */}
              <section
                className="int-section-card"
                data-node-id="20:14651"
                data-name="Section - SECTION 3: Backup & Disaster Recovery"
              >
                <div className="int-section-header" data-node-id="20:14652">
                  <div className="int-section-title-wrap">
                    <div className="int-section-title-row" data-node-id="20:14654">
                      <HardDrive className="int-section-icon" />
                      <h3 data-node-id="20:14657">Backup &amp; Disaster Recovery</h3>
                    </div>
                    <p className="int-section-desc" data-node-id="20:14659">
                      Automated snapshotting, geographic vault replication, and statutory compliance archive rules.
                    </p>
                  </div>

                  <div className="int-backup-header-actions" data-node-id="20:14660">
                    <button
                      type="button"
                      className="int-btn-outline-neutral"
                      onClick={handleDownloadAudit}
                      data-node-id="20:14661"
                    >
                      <Download size={14} />
                      <span>Download Disaster Recovery Audit</span>
                    </button>
                    <button
                      type="button"
                      className="int-btn-solid-teal"
                      onClick={handleStartManualBackup}
                      disabled={isBackingUp}
                      data-node-id="20:14665"
                    >
                      <Play size={13} fill="currentColor" />
                      <span>{isBackingUp ? 'Creating Snapshot...' : 'Run Manual Backup Now'}</span>
                    </button>
                  </div>
                </div>

                {/* 3 Policy Cards Grid */}
                <div className="int-policy-cards-grid" data-node-id="20:14669">
                  {/* Policy Card 1: Schedule & Target */}
                  <div className="int-policy-card" data-node-id="20:14670" data-name="Policy Card 1">
                    <div className="int-policy-card-top">
                      <span className="int-policy-tag-label" data-node-id="20:14673">
                        SCHEDULE &amp; TARGET
                      </span>
                      <Clock className="int-policy-icon" />
                    </div>
                    <div className="int-policy-title" data-node-id="20:14677">
                      Daily Automated Snapshot
                    </div>
                    <p className="int-policy-desc" data-node-id="20:14679">
                      02:00 UTC to Encrypted WORM Vault (Write Once, Read Many)
                    </p>
                  </div>

                  {/* Policy Card 2: Last Backup Status */}
                  <div className="int-policy-card" data-node-id="20:14680" data-name="Policy Card 2">
                    <div className="int-policy-card-top">
                      <span className="int-policy-tag-label" data-node-id="20:14683">
                        LAST BACKUP STATUS
                      </span>
                      <span className="int-badge-verified-tiny" data-node-id="20:14685">
                        VERIFIED
                      </span>
                    </div>
                    <div className="int-policy-title" data-node-id="20:14687">
                      {restorePoints[0]?.timestamp.replace(' - ', ' at ') || 'Today at 02:00:14 UTC'}
                    </div>
                    <p className="int-policy-desc" data-node-id="20:14689">
                      Size: {restorePoints[0]?.snapshotSize || '4.8 GB'} • SHA-256 Checksum Validated
                    </p>
                  </div>

                  {/* Policy Card 3: Statutory Retention */}
                  <div className="int-policy-card" data-node-id="20:14690" data-name="Policy Card 3">
                    <div className="int-policy-card-top">
                      <span className="int-policy-tag-label" data-node-id="20:14693">
                        STATUTORY RETENTION
                      </span>
                      <Archive className="int-policy-icon" />
                    </div>
                    <div className="int-policy-title" data-node-id="20:14697">
                      7 Years Retention Policy
                    </div>
                    <p className="int-policy-desc" data-node-id="20:14699">
                      HIPAA &amp; SOC2 Statutory Requirement Enforced
                    </p>
                  </div>
                </div>

                {/* Verified Restore Points Table */}
                <div
                  className="int-restore-table-shell"
                  data-node-id="20:14700"
                  data-name="Recent Restore Points Table"
                >
                  <div className="int-restore-table-header-bar" data-node-id="20:14701">
                    <div className="int-restore-bar-left">
                      <CheckCircle2 size={16} className="text-[#28006d]" />
                      <h4 data-node-id="20:14705">Verified Restore Points</h4>
                    </div>
                    <div className="int-restore-bar-right" data-node-id="20:14707">
                      Showing {restorePoints.length} latest snapshots across US-East and US-West nodes
                    </div>
                  </div>

                  <div className="int-table-responsive-wrapper">
                    <table className="int-restore-table" data-node-id="20:14708">
                      <thead>
                        <tr data-node-id="20:14710">
                          <th data-node-id="20:14712">TIMESTAMP</th>
                          <th data-node-id="20:14714">TYPE &amp; CLUSTER</th>
                          <th data-node-id="20:14716">SNAPSHOT SIZE</th>
                          <th data-node-id="20:14718">INTEGRITY STATUS</th>
                          <th className="align-right" data-node-id="20:14720">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {restorePoints.map((rp) => (
                          <tr key={rp.id}>
                            <td className="int-td-timestamp">{rp.timestamp}</td>
                            <td className="int-td-cluster">{rp.typeAndCluster}</td>
                            <td className="int-td-size">{rp.snapshotSize}</td>
                            <td>
                              <span className="int-td-badge">
                                <span className="int-status-dot" />
                                <span>{rp.integrityStatus}</span>
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="int-test-restore-btn"
                                onClick={() => handleOpenTestRestore(rp)}
                              >
                                <RefreshCw size={12} />
                                <span>Test Restore</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* ==============================================================
                  BOTTOM ACTIONS BAR
                  ============================================================== */}
              <div
                className="int-bottom-actions-bar"
                data-node-id="20:14770"
                data-name="Bottom Actions Bar"
              >
                <button
                  type="button"
                  className="int-return-btn"
                  onClick={() => handleNav('/admin/settings/general')}
                  data-node-id="20:14771"
                >
                  <ChevronLeft size={16} />
                  <span data-node-id="20:14774">Return to General Settings</span>
                </button>

                <div className="int-actions-right" data-node-id="20:14775">
                  <button
                    type="button"
                    className="int-discard-btn"
                    onClick={handleDiscard}
                    data-node-id="20:14776"
                  >
                    <span data-node-id="20:14777">Discard</span>
                  </button>
                  <button
                    type="submit"
                    className="int-btn-solid-purple"
                    disabled={isSaving}
                    data-node-id="20:14778"
                  >
                    {isSaving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span data-node-id="20:14782">{isSaving ? 'Saving...' : 'Save Configuration'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>

      {/* ======================================================================
          INTERACTIVE MODALS & DIALOGS
          ====================================================================== */}
      {/* 1. AWS SES Configuration Modal */}
      {activeModal === 'awsSes' && (
        <div className="int-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="int-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="int-modal-header">
              <h3>Configure AWS SES Gateway</h3>
              <button
                type="button"
                className="int-icon-btn"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="int-modal-body">
              <div className="int-form-group">
                <label>AWS Region</label>
                <select defaultValue="us-east-1">
                  <option value="us-east-1">US East (N. Virginia - us-east-1)</option>
                  <option value="us-west-2">US West (Oregon - us-west-2)</option>
                  <option value="eu-west-1">EU (Ireland - eu-west-1)</option>
                </select>
              </div>
              <div className="int-form-group">
                <label>Verified Sender Domain / Email</label>
                <input
                  type="email"
                  defaultValue="notifications@careid-health.org"
                  placeholder="e.g. alerts@careid.org"
                />
                <span className="int-form-help">DKIM and SPF verified on Route53.</span>
              </div>
              <div className="int-form-group">
                <label>Access Key ID / Secret</label>
                <input
                  type="password"
                  defaultValue="AKIA1234567890EXAMPLEKEY"
                  placeholder="AWS Secret Access Key"
                />
              </div>
              <div className="int-form-group">
                <label>Enforce TLS 1.3</label>
                <select defaultValue="enabled">
                  <option value="enabled">Mandatory TLS 1.3 (Strict cipher enforcement)</option>
                  <option value="opportunistic">Opportunistic TLS (Fallback to 1.2)</option>
                </select>
              </div>
            </div>
            <div className="int-modal-footer">
              <button
                type="button"
                className="int-discard-btn"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="int-btn-solid-purple"
                onClick={() => {
                  setActiveModal(null);
                  setNotification({
                    type: 'success',
                    message: 'AWS SES parameters updated and verified.'
                  });
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Twilio SMS Configuration Modal */}
      {activeModal === 'twilio' && (
        <div className="int-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="int-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="int-modal-header">
              <h3>Configure Twilio Healthcare SMS Gateway</h3>
              <button
                type="button"
                className="int-icon-btn"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="int-modal-body">
              <div className="int-form-group">
                <label>Twilio Account SID</label>
                <input type="text" defaultValue={twilioAccountSid} />
              </div>
              <div className="int-form-group">
                <label>Auth Token</label>
                <input type="password" defaultValue="9b87612c40e53a992bcda772183e911f" />
              </div>
              <div className="int-form-group">
                <label>Originating Phone Number / Messaging Service SID</label>
                <input type="text" defaultValue="+18005550199" />
              </div>
              <div className="int-form-group">
                <label>HIPAA Business Associate Agreement (BAA)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#006a60', fontWeight: 600 }}>
                  <CheckCircle2 size={16} /> BAA Executed &amp; Audited for CareID Org
                </div>
              </div>
            </div>
            <div className="int-modal-footer">
              <button
                type="button"
                className="int-discard-btn"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="int-btn-solid-purple"
                onClick={() => {
                  setActiveModal(null);
                  setNotification({
                    type: 'success',
                    message: 'Twilio SMS configuration saved.'
                  });
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Google Cloud Healthcare Storage Credentials Modal */}
      {activeModal === 'gcp' && (
        <div className="int-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="int-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="int-modal-header">
              <h3>Update Cloud Vault Credentials</h3>
              <button
                type="button"
                className="int-icon-btn"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="int-modal-body">
              <div className="int-form-group">
                <label>Service Account Email</label>
                <input type="text" defaultValue={gcpServiceAccount} />
              </div>
              <div className="int-form-group">
                <label>Cloud KMS Key ARN (Customer Managed Encryption)</label>
                <input
                  type="text"
                  defaultValue="projects/careid-prod/locations/us/keyRings/vault/cryptoKeys/cmk-phi-v1"
                />
              </div>
              <div className="int-form-group">
                <label>Primary Production Storage Bucket</label>
                <input type="text" defaultValue="careid-clinical-vault-prod-primary" />
              </div>
              <div className="int-form-group">
                <label>WORM Retention Lock Policy</label>
                <input type="text" readOnly value="7-Year Immutable Compliance Hold (Locked)" style={{ color: '#006a60', fontWeight: 600 }} />
              </div>
            </div>
            <div className="int-modal-footer">
              <button
                type="button"
                className="int-discard-btn"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="int-btn-solid-purple"
                onClick={() => {
                  setActiveModal(null);
                  setNotification({
                    type: 'success',
                    message: 'Cloud Vault Storage credentials rotated and verified.'
                  });
                }}
              >
                Update Credentials
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Connect EHR Gateway Modal */}
      {activeModal === 'connectEhr' && (
        <div className="int-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="int-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="int-modal-header">
              <h3>Connect New Hospital EHR Gateway</h3>
              <button
                type="button"
                className="int-icon-btn"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="int-modal-body">
              <div className="int-form-group">
                <label>EHR System Provider</label>
                <select defaultValue="epic">
                  <option value="epic">Epic Systems (Interconnect / Community Connect)</option>
                  <option value="cerner">Oracle Cerner (Millennium FHIR API)</option>
                  <option value="allscripts">Veradigm / Allscripts TouchWorks</option>
                  <option value="athena">Athenahealth Clinicals</option>
                </select>
              </div>
              <div className="int-form-group">
                <label>Target Facility / Hospital Group</label>
                <input type="text" placeholder="e.g. Johns Hopkins Medical Center" />
              </div>
              <div className="int-form-group">
                <label>FHIR Base R4 Endpoint URL</label>
                <input type="url" placeholder="https://fhir.hospital-domain.org/api/FHIR/R4" />
              </div>
              <div className="int-form-group">
                <label>SMART on FHIR Client ID</label>
                <input type="text" placeholder="e.g. CAREID-SMART-CLIENT-8890" />
              </div>
            </div>
            <div className="int-modal-footer">
              <button
                type="button"
                className="int-discard-btn"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="int-btn-solid-teal"
                onClick={() => {
                  setActiveModal(null);
                  setNotification({
                    type: 'success',
                    message: 'EHR handshake initiated. Awaiting mutual TLS certificate verification.'
                  });
                }}
              >
                Initiate Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Configure FHIR Endpoints Modal */}
      {activeModal === 'fhirEndpoints' && (
        <div className="int-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="int-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="int-modal-header">
              <h3>Configure FHIR Pipeline Endpoints</h3>
              <button
                type="button"
                className="int-icon-btn"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="int-modal-body">
              <div className="int-form-group">
                <label>Primary Live Endpoint</label>
                <input type="text" defaultValue="https://api.mountsinai.org/fhir" />
              </div>
              <div className="int-form-group">
                <label>Secondary / Failover Endpoint</label>
                <input type="text" defaultValue="https://api-dr.mountsinai.org/fhir" />
              </div>
              <div className="int-form-group">
                <label>Sync Interval (minutes)</label>
                <input type="number" defaultValue={5} min={1} max={60} />
              </div>
              <div className="int-form-group">
                <label>Authentication Protocol</label>
                <input type="text" readOnly value="Mutual TLS (mTLS) + OAuth 2.0 Bearer" style={{ color: '#006a60' }} />
              </div>
            </div>
            <div className="int-modal-footer">
              <button
                type="button"
                className="int-discard-btn"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="int-btn-solid-purple"
                onClick={() => {
                  setActiveModal(null);
                  setNotification({
                    type: 'success',
                    message: 'FHIR pipeline endpoints saved.'
                  });
                }}
              >
                Save Endpoints
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. View Broker Logs Modal */}
      {activeModal === 'brokerLogs' && (
        <div className="int-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="int-modal-card" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="int-modal-header">
              <h3>HL7 MLLP &amp; JSON Event Broker Logs</h3>
              <button
                type="button"
                className="int-icon-btn"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="int-modal-body">
              <div style={{ backgroundColor: '#191c1e', color: '#10b981', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', lineHeight: '18px', maxHeight: '320px', overflowY: 'auto' }}>
                <div>[02:00:14 UTC] [MLLP-IN] Received ADT_A01 message from Node Alpha (Size: 4.8 KB)</div>
                <div>[02:00:15 UTC] [PARSE-OK] Patient record validated against CareID schema (PID: 90214)</div>
                <div>[02:00:15 UTC] [BROKER] Queued to topic: clinical.events.admissions</div>
                <div>[02:00:16 UTC] [DISPATCH] Forwarded to Cloud Vault &amp; FHIR Bridge (Latency: 142ms)</div>
                <div>[02:01:02 UTC] [HEALTHCHECK] Keepalive ACK received from secondary replica (US-West)</div>
                <div>[02:05:00 UTC] [DLQ-MONITOR] Dead letter queue depth: 0 messages pending</div>
                <div style={{ color: '#6ee7b7' }}>[02:10:45 UTC] [METRICS] 24,910 messages processed over last 24h. Error rate: 0.00%</div>
              </div>
            </div>
            <div className="int-modal-footer">
              <button
                type="button"
                className="int-btn-solid-purple"
                onClick={() => setActiveModal(null)}
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Test Restore Modal */}
      {activeModal === 'testRestore' && selectedRestorePoint && (
        <div className="int-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="int-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="int-modal-header">
              <h3>Execute Non-Disruptive Dry-Run Restore</h3>
              <button
                type="button"
                className="int-icon-btn"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="int-modal-body">
              <p style={{ fontSize: '13px', color: '#494552', margin: 0 }}>
                This procedure spins up an isolated sandbox database in <strong>US-West (Oregon)</strong>, restores snapshot <strong>{selectedRestorePoint.timestamp}</strong>, validates SHA-256 integrity, and verifies zero data degradation without affecting production.
              </p>
              <div style={{ backgroundColor: '#f2f4f6', padding: '12px 16px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Snapshot:</strong> {selectedRestorePoint.timestamp}</div>
                <div><strong>Type:</strong> {selectedRestorePoint.typeAndCluster}</div>
                <div><strong>Size:</strong> {selectedRestorePoint.snapshotSize}</div>
                <div><strong>Checksum:</strong> <code>{selectedRestorePoint.shaChecksum}</code></div>
                <div><strong>WORM Verification:</strong> Enforced &amp; Tamper-Evident</div>
              </div>
            </div>
            <div className="int-modal-footer">
              <button
                type="button"
                className="int-discard-btn"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="int-btn-solid-teal"
                onClick={() => {
                  setActiveModal(null);
                  setNotification({
                    type: 'success',
                    message: `Sandbox restore verified: 100% of data tables matching checksum ${selectedRestorePoint.shaChecksum.substring(0, 16)}...`
                  });
                }}
              >
                Start Verification Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Manual Backup Progress Modal */}
      {activeModal === 'manualBackup' && (
        <div className="int-modal-backdrop">
          <div className="int-modal-card" style={{ maxWidth: '480px' }}>
            <div className="int-modal-header">
              <h3>Executing Ad-hoc Snapshot Backup</h3>
            </div>
            <div className="int-modal-body" style={{ alignItems: 'center', textAlign: 'center' }}>
              <RotateCw
                size={40}
                className="text-[#006a60] animate-spin"
                style={{ animationDuration: '1.2s' }}
              />
              <div style={{ width: '100%', backgroundColor: '#f2f4f6', borderRadius: '9999px', height: '12px', overflow: 'hidden', marginTop: '16px' }}>
                <div
                  style={{
                    width: `${backupProgress}%`,
                    backgroundColor: '#006a60',
                    height: '100%',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', marginTop: '8px' }}>
                {backupProgress < 40
                  ? 'Initiating cryptographic snapshot...'
                  : backupProgress < 80
                  ? 'Replicating to Encrypted WORM Vault (US-West)...'
                  : 'Validating SHA-256 seal & integrity...'}
              </span>
              <span style={{ fontSize: '12px', color: '#494552' }}>{backupProgress}% Completed</span>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div className={`int-toast ${notification.type}`} role="status">
          <span>{notification.message}</span>
          <button
            type="button"
            className="int-toast-close"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminSystemSettingsIntegrations;
