import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  Megaphone,
  Sliders,
  Mail,
  Bell,
  MessageSquare,
  Clock,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  X,
  ChevronDown,
  Building2,
  Palette,
  ShieldCheck,
  UserCheck,
  HardDrive,
  Search,
  Menu,
  HelpCircle,
  Check,
  Radio
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import doctorSarahJenkinsLarge from '../../assets/doctors/doctor-sarah-jenkins-large.png';
import {
  getSystemNotifications,
  getSystemSettings,
  upsertSystemSetting
} from '../../services/systemSettingsService';
import './AdminSystemSettingsAnnouncements.css';

// ============================================================================
// Form Validation Schema & Types (Zod)
// ============================================================================
const announcementFormSchema = z.object({
  title: z
    .string()
    .min(3, 'Announcement title must be at least 3 characters')
    .max(120, 'Title cannot exceed 120 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description cannot exceed 1000 characters'),
  priority: z.enum(['Maintenance', 'Low', 'Medium', 'High', 'Critical']),
  targetAudience: z
    .array(z.string())
    .min(1, 'Please select at least one target audience group'),
  startDate: z.string().min(1, 'Start date & time are required'),
  endDate: z.string().min(1, 'End date & time are required')
});

export type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;

export const AUDIENCE_OPTIONS = [
  'All Staff & Doctors',
  'Doctors & Clinicians',
  'Facility Administrators',
  'Patients & Portal Users',
  'Technical Staff'
];

export interface PastAnnouncement {
  id: string;
  title: string;
  description: string;
  priority: 'Maintenance' | 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'active' | 'scheduled' | 'expired';
  targetAudience: string[];
  startDate: string;
  endDate: string;
  reachCount: number;
}

export const INITIAL_PAST_ANNOUNCEMENTS: PastAnnouncement[] = [
  {
    id: 'ann-01',
    title: 'Scheduled Platform Maintenance (v2.4.0)',
    description:
      'All services will undergo routine maintenance on Sunday from 02:00 UTC to 04:00 UTC. Minor disruptions in OCR processing may be observed.',
    priority: 'Maintenance',
    status: 'active',
    targetAudience: ['All Staff & Doctors', 'Facility Administrators'],
    startDate: 'Nov 02, 2026 - 02:00 UTC',
    endDate: 'Nov 02, 2026 - 04:00 UTC',
    reachCount: 1420
  },
  {
    id: 'ann-02',
    title: 'HIPAA Security Protocol Updates Required',
    description:
      'Mandatory two-factor re-authentication will be enforced for all clinical workstations starting next Monday morning.',
    priority: 'High',
    status: 'active',
    targetAudience: ['All Staff & Doctors', 'Technical Staff'],
    startDate: 'Oct 28, 2026 - 09:00 UTC',
    endDate: 'Nov 05, 2026 - 18:00 UTC',
    reachCount: 3840
  },
  {
    id: 'ann-03',
    title: 'New FHIR v4 Diagnostic Import Module Available',
    description:
      'Clinicians can now preview incoming HL7 FHIR diagnostic attachments directly from the patient record review portal.',
    priority: 'Low',
    status: 'scheduled',
    targetAudience: ['Doctors & Clinicians'],
    startDate: 'Nov 10, 2026 - 08:00 UTC',
    endDate: 'Nov 17, 2026 - 20:00 UTC',
    reachCount: 0
  },
  {
    id: 'ann-04',
    title: 'Completed: Emergency Database Patching Cycle',
    description:
      'PostgreSQL failover replica maintenance has concluded successfully. All system response times have normalized.',
    priority: 'Critical',
    status: 'expired',
    targetAudience: ['Technical Staff', 'Facility Administrators'],
    startDate: 'Oct 15, 2026 - 01:00 UTC',
    endDate: 'Oct 15, 2026 - 03:30 UTC',
    reachCount: 295
  }
];

export interface AdminSystemSettingsAnnouncementsProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminSystemSettingsAnnouncements: React.FC<
  AdminSystemSettingsAnnouncementsProps
> = ({ onNavigate, onLogout }) => {
  const { t } = useTranslation();

  // Mobile drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Search input state
  const [globalSearch, setGlobalSearch] = useState('');

  const isFromNotifications =
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/admin/announcements') ||
     window.location.pathname.startsWith('/admin/notifications'));

  // Toast / Snackbar state
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (snackbarMessage) {
      const timer = setTimeout(() => {
        setSnackbarMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [snackbarMessage]);

  // Modals state
  const [isPastModalOpen, setIsPastModalOpen] = useState(false);
  const [isDetailedLogOpen, setIsDetailedLogOpen] = useState(false);

  // Audience multi-select dropdown open state
  const [isAudienceDropdownOpen, setIsAudienceDropdownOpen] = useState(false);
  const audienceDropdownRef = useRef<HTMLDivElement>(null);

  // Close audience dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        audienceDropdownRef.current &&
        !audienceDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAudienceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Delivery Channels Toggle States (Figma: Email ON, Push ON, SMS OFF)
  const [deliveryChannels, setDeliveryChannels] = useState({
    email: true,
    push: true,
    sms: false
  });

  // Granular Controls Checkbox States
  const [granularControls, setGranularControls] = useState({
    ocr: true,
    referral: true,
    records: true,
    security: true,
    maintenance: true
  });

  // Past announcements list
  const [pastAnnouncements, setPastAnnouncements] = useState<
    PastAnnouncement[]
  >(INITIAL_PAST_ANNOUNCEMENTS);

  // Load announcements & live notifications from backend
  useEffect(() => {
    let isMounted = true;
    async function loadNotifications() {
      try {
        const [settings] = await Promise.all([
          getSystemSettings('NOTIFICATIONS'),
          getSystemNotifications()
        ]);

        if (!isMounted) return;

        const map: Record<string, string> = {};
        settings.forEach((s) => {
          map[s.key] = s.value;
        });

        if (map['ANNOUNCEMENTS_LIST']) {
          try {
            const list = JSON.parse(map['ANNOUNCEMENTS_LIST']);
            if (Array.isArray(list) && list.length > 0) {
              setPastAnnouncements(list);
            }
          } catch {
            // Keep default
          }
        }
      } catch (err: any) {
        console.error('Failed to load notifications from backend:', err);
      }
    }
    loadNotifications();
    return () => {
      isMounted = false;
    };
  }, []);

  // React Hook Form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      title: 'Scheduled Platform Maintenance (v2.4.0)',
      description:
        'All services will undergo routine maintenance on Sunday from 02:00 UTC to 04:00 UTC. Minor disruptions in OCR processing may be observed during this window.',
      priority: 'Maintenance',
      targetAudience: ['All Staff & Doctors', 'Facility Administrators'],
      startDate: '2026-11-02T02:00',
      endDate: '2026-11-02T04:00'
    }
  });

  const selectedAudiences = watch('targetAudience') || [];

  const toggleAudienceOption = (option: string) => {
    if (selectedAudiences.includes(option)) {
      if (selectedAudiences.length > 1) {
        setValue(
          'targetAudience',
          selectedAudiences.filter((item) => item !== option),
          { shouldValidate: true }
        );
      }
    } else {
      setValue('targetAudience', [...selectedAudiences, option], {
        shouldValidate: true
      });
    }
  };

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  const handleTabClick = (
    tabKey:
      | 'general'
      | 'branding'
      | 'security'
      | 'roles'
      | 'ocr'
      | 'integrations'
      | 'announcements'
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
      handleNav('/admin/settings/integrations');
    } else if (tabKey === 'announcements') {
      // Current active page
    }
  };

  const onPublishSubmit = async (data: AnnouncementFormValues) => {
    try {
      setIsSaving(true);
      const newAnnouncement: PastAnnouncement = {
        id: `ann-${Date.now()}`,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: 'active',
        targetAudience: data.targetAudience,
        startDate: data.startDate,
        endDate: data.endDate,
        reachCount: 1540
      };
      const updatedList = [newAnnouncement, ...pastAnnouncements];
      setPastAnnouncements(updatedList);

      // Persist to backend settings
      await upsertSystemSetting({
        category: 'NOTIFICATIONS',
        key: 'ANNOUNCEMENTS_LIST',
        value: JSON.stringify(updatedList),
        valueType: 'JSON',
        description: 'System announcements ledger published across clinical network'
      });

      setSnackbarMessage(
        `Announcement "${data.title}" published and persisted in live backend!`
      );
    } catch (err: any) {
      console.error('Failed to publish announcement:', err);
      setSnackbarMessage(`Failed to publish: ${err?.message || 'Server error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const onDraftClick = () => {
    const currentTitle = watch('title') || 'Untitled Draft';
    setSnackbarMessage(`Announcement "${currentTitle}" saved to drafts.`);
  };

  const handleUpdatePreferences = () => {
    setSnackbarMessage(
      'Global delivery channels and granular alert controls updated successfully!'
    );
  };

  return (
    <div
      className="announcements-wrapper"
      data-node-id="20:8723"
      data-name="Admin Portal - Announcements & Preferences"
    >
      {/* 280px Fixed Sidebar - Desktop permanently fixed; Drawer on mobile/tablet */}
      <AdminSidebar
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onLogout={onLogout}
        onNavigate={handleNav}
        activeNav={isFromNotifications ? 'support' : 'settings'}
      />

      {/* Main Canvas Area - Starts at 280px margin-left on Desktop (>=1024px) */}
      <div className="announcements-main">
        {/* 1. Stationary Top Navigation Bar (64px, Figma Node 20:8956) */}
        <header
          className="announcements-top-navbar"
          data-node-id="20:8956"
          data-name="Stationary Top Global Navigation Bar"
        >
          <div className="announcements-top-left">
            <button
              type="button"
              className="announcements-mobile-menu-btn"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>

            <h2 className="announcements-portal-heading">CareID Admin Portal</h2>

            <div className="announcements-search-container">
              <Search size={16} className="announcements-search-icon" />
              <input
                type="text"
                className="announcements-search-input"
                placeholder="Search announcements, policies, settings..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                aria-label="Search settings and announcements"
              />
            </div>
          </div>

          <div className="announcements-top-right">
            <button
              type="button"
              className="announcements-action-btn"
              aria-label="Help and Documentation"
              onClick={() => handleNav('/admin/docs')}
            >
              <HelpCircle size={19} />
            </button>

            <button
              type="button"
              className="announcements-action-btn"
              aria-label="System Notifications"
              onClick={() => handleNav('/admin/audit-logs')}
            >
              <Bell size={19} />
            </button>

            <button
              type="button"
              className="announcements-profile-pill"
              onClick={() => handleNav('/admin/profile')}
              aria-label="My Profile & Information"
              title="My Profile & Information"
            >
              <div className="announcements-avatar-wrap">
                <img
                  src={doctorSarahJenkinsLarge}
                  alt="Admin User"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="announcements-profile-text hidden sm:flex">
                <span className="announcements-user-name">Dr. Robert Chen</span>
                <span className="announcements-user-role">Super Admin</span>
              </div>
              <ChevronDown size={14} className="text-[#494552] ml-1" />
            </button>
          </div>
        </header>

        {/* 2. Scrollable Canvas & Layout Container */}
        <main
          className="announcements-scroll-canvas"
          data-node-id="20:8724"
          data-name="Scrollable Main Canvas"
        >
          <div className="announcements-content-wrapper">
            {/* Header Row: Breadcrumbs & Page Title & Action Button */}
            <div
              className="announcements-header-row"
              data-node-id="20:8727"
              data-name="Header Row"
            >
              <div className="announcements-header-left">
                <nav
                  className="announcements-breadcrumbs"
                  aria-label="Breadcrumb navigation"
                >
                  <button
                    type="button"
                    className="announcements-breadcrumb-link"
                    onClick={() => handleNav(isFromNotifications ? '/admin/notifications' : '/admin/settings/general')}
                  >
                    {isFromNotifications ? 'Support & Notifications' : 'System Settings'}
                  </button>
                  <span className="announcements-breadcrumb-sep">&gt;</span>
                  <span className="announcements-breadcrumb-current">
                    Announcements &amp; Preferences
                  </span>
                </nav>

                <h1 className="announcements-page-title" data-node-id="20:8733">
                  Announcements &amp; Preferences
                </h1>
              </div>

              <div className="announcements-header-actions flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  className="btn-past-announcements"
                  onClick={() => setIsPastModalOpen(true)}
                  data-node-id="20:8734"
                >
                  <Clock size={18} />
                  <span>Past Announcements</span>
                </button>
              </div>
            </div>

            {/* Sub-Navigation Tabs Bar - Six Tabs */}
            <nav
              className="announcements-subnav-bar"
              aria-label="System Settings Navigation"
              data-node-id="20:8960"
            >
              <div
                className="announcements-subnav-tabs"
                role="tablist"
                data-node-id="20:8961"
              >
                {/* Tab 1: General & Organization */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="announcements-subnav-tab"
                  onClick={() => handleTabClick('general')}
                  data-node-id="20:8962"
                >
                  <Building2 size={15} />
                  <span>
                    {t('systemSettings.tabs.general', 'General & Organization')}
                  </span>
                </button>

                {/* Tab 2: Branding & Identity */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="announcements-subnav-tab"
                  onClick={() => handleTabClick('branding')}
                  data-node-id="20:8965"
                >
                  <Palette size={15} />
                  <span>
                    {t('systemSettings.tabs.branding', 'Branding & Identity')}
                  </span>
                </button>

                {/* Tab 3: Security Policies */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="announcements-subnav-tab"
                  onClick={() => handleTabClick('security')}
                  data-node-id="20:8968"
                >
                  <ShieldCheck size={15} />
                  <span>
                    {t('systemSettings.tabs.security', 'Security Policies')}
                  </span>
                </button>

                {/* Tab 4: Roles & Permissions */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="announcements-subnav-tab"
                  onClick={() => handleTabClick('roles')}
                  data-node-id="20:8971"
                >
                  <UserCheck size={15} />
                  <span>
                    {t('systemSettings.tabs.roles', 'Roles & Permissions')}
                  </span>
                </button>

                {/* Tab 5: OCR & Notifications */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="announcements-subnav-tab"
                  onClick={() => handleTabClick('ocr')}
                  data-node-id="20:8974"
                >
                  <Radio size={15} />
                  <span>
                    {t('systemSettings.tabs.ocr', 'OCR & Notifications')}
                  </span>
                </button>

                {/* Tab 6: Integrations & Backup */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="announcements-subnav-tab"
                  onClick={() => handleTabClick('integrations')}
                  data-node-id="20:8977"
                >
                  <HardDrive size={15} />
                  <span>
                    {t('systemSettings.tabs.integrations', 'Integrations & Backup')}
                  </span>
                </button>
              </div>
            </nav>

            {/* 12-Column Grid Layout (7 Cols / 5 Cols, Figma Node 20:8744) */}
            <div
              className="announcements-grid"
              data-node-id="20:8744"
              data-name="Main 12-Column Grid"
            >
              {/* ==============================================================
                  LEFT COLUMN: Create New Announcement (7 cols, Node 20:8745)
                  ============================================================== */}
              <div className="announcements-col-create">
                <div
                  className="announcements-card"
                  data-node-id="20:8745"
                  data-name="Create Announcement Card"
                >
                  {/* Card Header with Purple Badge */}
                  <div
                    className="announcements-card-header"
                    data-node-id="20:8746"
                  >
                    <div
                      className="announcements-badge-icon purple-badge"
                      data-node-id="20:8747"
                    >
                      <Megaphone size={22} />
                    </div>

                    <div className="announcements-card-heading-group">
                      <h3
                        className="announcements-card-title"
                        data-node-id="20:8751"
                      >
                        Create New Announcement
                      </h3>
                      <p
                        className="announcements-card-desc"
                        data-node-id="20:8753"
                      >
                        Broadcast system-wide updates or critical alerts
                      </p>
                    </div>
                  </div>

                  {/* Announcement Form */}
                  <form
                    onSubmit={handleSubmit(onPublishSubmit)}
                    className="announcements-form"
                    data-node-id="20:8756"
                    noValidate
                  >
                    {/* Announcement Title */}
                    <div className="form-group" data-node-id="20:8757">
                      <label htmlFor="announcement-title" className="form-label">
                        ANNOUNCEMENT TITLE
                      </label>
                      <input
                        id="announcement-title"
                        type="text"
                        className="form-input-text"
                        placeholder="e.g. Scheduled Maintenance Notice"
                        {...register('title')}
                        data-node-id="20:8760"
                      />
                      {errors.title && (
                        <span className="text-xs text-red-600 mt-1 font-medium">
                          {errors.title.message}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <div className="form-group" data-node-id="20:8764">
                      <label
                        htmlFor="announcement-desc"
                        className="form-label"
                      >
                        DESCRIPTION
                      </label>
                      <textarea
                        id="announcement-desc"
                        className="form-textarea"
                        placeholder="Provide detailed notice regarding downtime, updates, or instructions..."
                        {...register('description')}
                        data-node-id="20:8767"
                      />
                      {errors.description && (
                        <span className="text-xs text-red-600 mt-1 font-medium">
                          {errors.description.message}
                        </span>
                      )}
                    </div>

                    {/* 2-Column Row: Priority Level & Target Audience */}
                    <div className="form-two-col" data-node-id="20:8771">
                      {/* Priority Level */}
                      <div className="form-group" data-node-id="20:8772">
                        <label
                          htmlFor="announcement-priority"
                          className="form-label"
                        >
                          PRIORITY LEVEL
                        </label>
                        <div className="form-select-wrap">
                          <select
                            id="announcement-priority"
                            className="form-select"
                            {...register('priority')}
                            data-node-id="20:8775"
                          >
                            <option value="Maintenance">Maintenance</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                          <ChevronDown
                            size={16}
                            className="form-select-icon"
                          />
                        </div>
                      </div>

                      {/* Target Audience Dropdown */}
                      <div
                        className="form-group"
                        ref={audienceDropdownRef}
                        data-node-id="20:8781"
                      >
                        <label className="form-label">TARGET AUDIENCE</label>
                        <div className="audience-multiselect-container">
                          <button
                            type="button"
                            className={`audience-display-btn ${
                              isAudienceDropdownOpen ? 'open' : ''
                            }`}
                            onClick={() =>
                              setIsAudienceDropdownOpen(!isAudienceDropdownOpen)
                            }
                            aria-haspopup="listbox"
                            aria-expanded={isAudienceDropdownOpen}
                          >
                            {selectedAudiences.length > 0 ? (
                              selectedAudiences.map((aud) => (
                                <span key={aud} className="audience-tag">
                                  {aud}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-sm">
                                Select audiences...
                              </span>
                            )}
                            <ChevronDown
                              size={16}
                              className="form-select-icon"
                            />
                          </button>

                          {isAudienceDropdownOpen && (
                            <div
                              className="audience-dropdown-menu"
                              role="listbox"
                            >
                              {AUDIENCE_OPTIONS.map((aud) => {
                                const isSelected =
                                  selectedAudiences.includes(aud);
                                return (
                                  <div
                                    key={aud}
                                    className="audience-dropdown-item"
                                    onClick={() => toggleAudienceOption(aud)}
                                    role="option"
                                    aria-selected={isSelected}
                                  >
                                    <div
                                      className={`custom-checkbox ${
                                        isSelected ? 'checked' : ''
                                      }`}
                                    >
                                      {isSelected && <Check size={14} />}
                                    </div>
                                    <span>{aud}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {errors.targetAudience && (
                          <span className="text-xs text-red-600 mt-1 font-medium">
                            {errors.targetAudience.message}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2-Column Row: Start Date & End Date */}
                    <div className="form-two-col" data-node-id="20:8802">
                      <div className="form-group" data-node-id="20:8803">
                        <label
                          htmlFor="announcement-start-date"
                          className="form-label"
                        >
                          START DATE
                        </label>
                        <input
                          id="announcement-start-date"
                          type="datetime-local"
                          className="form-input-text"
                          {...register('startDate')}
                          data-node-id="20:8806"
                        />
                        {errors.startDate && (
                          <span className="text-xs text-red-600 mt-1 font-medium">
                            {errors.startDate.message}
                          </span>
                        )}
                      </div>

                      <div className="form-group" data-node-id="20:8812">
                        <label
                          htmlFor="announcement-end-date"
                          className="form-label"
                        >
                          END DATE
                        </label>
                        <input
                          id="announcement-end-date"
                          type="datetime-local"
                          className="form-input-text"
                          {...register('endDate')}
                          data-node-id="20:8815"
                        />
                        {errors.endDate && (
                          <span className="text-xs text-red-600 mt-1 font-medium">
                            {errors.endDate.message}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons: Publish Announcement (Primary) & Draft (Secondary) */}
                    <div
                      className="announcements-actions-row"
                      data-node-id="20:8821"
                    >
                      <button
                        type="submit"
                        className="btn-publish-announcement"
                        disabled={isSaving}
                        data-node-id="20:8822"
                      >
                        <Megaphone size={18} />
                        <span>{isSaving ? 'Publishing...' : 'Publish Announcement'}</span>
                      </button>

                      <button
                        type="button"
                        className="btn-draft-announcement"
                        onClick={onDraftClick}
                        data-node-id="20:8828"
                      >
                        <span>Draft</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* ==============================================================
                  RIGHT COLUMN: Global Notification Preferences (5 cols, Node 20:8835)
                  ============================================================== */}
              <div className="announcements-col-preferences">
                <div
                  className="announcements-card"
                  data-node-id="20:8835"
                  data-name="Global Preferences Card"
                >
                  {/* Card Header with Teal Badge */}
                  <div
                    className="announcements-card-header"
                    data-node-id="20:8836"
                  >
                    <div
                      className="announcements-badge-icon teal-badge"
                      data-node-id="20:8837"
                    >
                      <Sliders size={22} />
                    </div>

                    <div className="announcements-card-heading-group">
                      <h3
                        className="announcements-card-title"
                        data-node-id="20:8841"
                      >
                        Global Preferences
                      </h3>
                      <p
                        className="announcements-card-desc"
                        data-node-id="20:8843"
                      >
                        Configure system-wide delivery channels
                      </p>
                    </div>
                  </div>

                  {/* Section 1: Delivery Channels */}
                  <div
                    className="pref-section-wrap"
                    data-node-id="20:8846"
                    data-name="Delivery Channels Section"
                  >
                    <h4
                      className="pref-section-title"
                      data-node-id="20:8847"
                    >
                      DELIVERY CHANNELS
                    </h4>

                    {/* Email Notifications */}
                    <div className="channel-card" data-node-id="20:8848">
                      <div className="channel-left">
                        <Mail size={22} className="channel-icon" />
                        <div className="channel-text">
                          <span
                            className="channel-name"
                            data-node-id="20:8853"
                          >
                            Email Notifications
                          </span>
                          <span
                            className="channel-desc"
                            data-node-id="20:8855"
                          >
                            Send digests and urgent system emails
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={deliveryChannels.email}
                        className={`toggle-switch ${
                          deliveryChannels.email ? 'on' : ''
                        }`}
                        onClick={() =>
                          setDeliveryChannels({
                            ...deliveryChannels,
                            email: !deliveryChannels.email
                          })
                        }
                        aria-label="Toggle Email Notifications"
                        data-node-id="20:8856"
                      >
                        <div className="toggle-handle" />
                      </button>
                    </div>

                    {/* Push Notifications */}
                    <div className="channel-card" data-node-id="20:8860">
                      <div className="channel-left">
                        <Bell size={22} className="channel-icon" />
                        <div className="channel-text">
                          <span
                            className="channel-name"
                            data-node-id="20:8865"
                          >
                            Push Notifications
                          </span>
                          <span
                            className="channel-desc"
                            data-node-id="20:8867"
                          >
                            Web browser and mobile app alerts
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={deliveryChannels.push}
                        className={`toggle-switch ${
                          deliveryChannels.push ? 'on' : ''
                        }`}
                        onClick={() =>
                          setDeliveryChannels({
                            ...deliveryChannels,
                            push: !deliveryChannels.push
                          })
                        }
                        aria-label="Toggle Push Notifications"
                        data-node-id="20:8868"
                      >
                        <div className="toggle-handle" />
                      </button>
                    </div>

                    {/* SMS Alerts */}
                    <div className="channel-card" data-node-id="20:8872">
                      <div className="channel-left">
                        <MessageSquare size={22} className="channel-icon" />
                        <div className="channel-text">
                          <span
                            className="channel-name"
                            data-node-id="20:8877"
                          >
                            SMS Alerts
                          </span>
                          <span
                            className="channel-desc"
                            data-node-id="20:8879"
                          >
                            Urgent direct patient and staff messaging
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={deliveryChannels.sms}
                        className={`toggle-switch ${
                          deliveryChannels.sms ? 'on' : ''
                        }`}
                        onClick={() =>
                          setDeliveryChannels({
                            ...deliveryChannels,
                            sms: !deliveryChannels.sms
                          })
                        }
                        aria-label="Toggle SMS Alerts"
                        data-node-id="20:8880"
                      >
                        <div className="toggle-handle" />
                      </button>
                    </div>
                  </div>

                  {/* Section 2: Granular Controls */}
                  <div
                    className="pref-section-wrap"
                    data-node-id="20:8884"
                    data-name="Granular Controls Section"
                  >
                    <h4
                      className="pref-section-title"
                      data-node-id="20:8885"
                    >
                      GRANULAR CONTROLS
                    </h4>

                    <div className="granular-list" data-node-id="20:8886">
                      {/* OCR Verification Status */}
                      <div
                        className="granular-item"
                        onClick={() =>
                          setGranularControls({
                            ...granularControls,
                            ocr: !granularControls.ocr
                          })
                        }
                        data-node-id="20:8887"
                      >
                        <div className="granular-item-left">
                          <span className="granular-dot teal" />
                          <span className="granular-label">
                            OCR Verification Status
                          </span>
                        </div>
                        <div
                          className={`custom-checkbox ${
                            granularControls.ocr ? 'checked' : ''
                          }`}
                        >
                          {granularControls.ocr && <Check size={14} />}
                        </div>
                      </div>

                      {/* Referral Assignments */}
                      <div
                        className="granular-item"
                        onClick={() =>
                          setGranularControls({
                            ...granularControls,
                            referral: !granularControls.referral
                          })
                        }
                        data-node-id="20:8893"
                      >
                        <div className="granular-item-left">
                          <span className="granular-dot teal" />
                          <span className="granular-label">
                            Referral Assignments
                          </span>
                        </div>
                        <div
                          className={`custom-checkbox ${
                            granularControls.referral ? 'checked' : ''
                          }`}
                        >
                          {granularControls.referral && <Check size={14} />}
                        </div>
                      </div>

                      {/* Medical Record Ingestion */}
                      <div
                        className="granular-item"
                        onClick={() =>
                          setGranularControls({
                            ...granularControls,
                            records: !granularControls.records
                          })
                        }
                        data-node-id="20:8899"
                      >
                        <div className="granular-item-left">
                          <span className="granular-dot teal" />
                          <span className="granular-label">
                            Medical Record Ingestion
                          </span>
                        </div>
                        <div
                          className={`custom-checkbox ${
                            granularControls.records ? 'checked' : ''
                          }`}
                        >
                          {granularControls.records && <Check size={14} />}
                        </div>
                      </div>

                      {/* Security & Breach Alerts */}
                      <div
                        className="granular-item"
                        onClick={() =>
                          setGranularControls({
                            ...granularControls,
                            security: !granularControls.security
                          })
                        }
                        data-node-id="20:8905"
                      >
                        <div className="granular-item-left">
                          <span className="granular-dot red" />
                          <span className="granular-label">
                            Security &amp; Breach Alerts
                          </span>
                        </div>
                        <div
                          className={`custom-checkbox ${
                            granularControls.security ? 'checked' : ''
                          }`}
                        >
                          {granularControls.security && <Check size={14} />}
                        </div>
                      </div>

                      {/* Platform Maintenance */}
                      <div
                        className="granular-item"
                        onClick={() =>
                          setGranularControls({
                            ...granularControls,
                            maintenance: !granularControls.maintenance
                          })
                        }
                        data-node-id="20:8911"
                      >
                        <div className="granular-item-left">
                          <span className="granular-dot amber" />
                          <span className="granular-label">
                            Platform Maintenance
                          </span>
                        </div>
                        <div
                          className={`custom-checkbox ${
                            granularControls.maintenance ? 'checked' : ''
                          }`}
                        >
                          {granularControls.maintenance && <Check size={14} />}
                        </div>
                      </div>
                    </div>

                    {/* Update Preference Logic Button */}
                    <button
                      type="button"
                      className="btn-update-logic"
                      onClick={handleUpdatePreferences}
                      data-node-id="20:8918"
                    >
                      Update Preference Logic
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ==============================================================
                8. Analytics Preview Footer Row (Figma Node 20:8929)
                ============================================================== */}
            <div
              className="announcements-analytics-card"
              data-node-id="20:8929"
              data-name="Analytics Metrics Banner Row"
            >
              <div className="analytics-metrics-cluster">
                {/* Metric 1: Current Active Banners */}
                <div
                  className="analytics-metric-box"
                  data-node-id="20:8931"
                >
                  <span className="metric-label">CURRENT ACTIVE BANNERS</span>
                  <span className="metric-value">02</span>
                </div>

                <div className="analytics-vdivider" />

                {/* Metric 2: Reach Rate */}
                <div
                  className="analytics-metric-box"
                  data-node-id="20:8936"
                >
                  <span className="metric-label">REACH RATE</span>
                  <span className="metric-value">98.4%</span>
                </div>

                <div className="analytics-vdivider" />

                {/* Metric 3: Opt-in Trend */}
                <div
                  className="analytics-metric-box"
                  data-node-id="20:8941"
                >
                  <span className="metric-label">OPT-IN TREND</span>
                  <div className="trend-badge">
                    <span className="metric-value text-[#006a60]">+12%</span>
                    <TrendingUp size={20} className="text-[#006a60]" />
                  </div>
                </div>
              </div>

              {/* View Detailed Log Button with ArrowRight */}
              <button
                type="button"
                className="btn-view-detailed-log"
                onClick={() => setIsDetailedLogOpen(true)}
                data-node-id="20:8948"
              >
                <span>View Detailed Log</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* ==============================================================
          9. Status Toast / Snackbar (Figma Node 20:9041)
          ============================================================== */}
      {snackbarMessage && (
        <div
          className="announcements-snackbar"
          role="status"
          aria-live="polite"
          data-node-id="20:9041"
          data-name="Status Snackbar"
        >
          <CheckCircle2 size={20} className="text-[#85f6e5] flex-shrink-0" />
          <span className="snackbar-text">{snackbarMessage}</span>
          <button
            type="button"
            className="snackbar-close-btn"
            onClick={() => setSnackbarMessage(null)}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ==============================================================
          10. Past Announcements Modal Dialog
          ============================================================== */}
      {isPastModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsPastModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="past-announcements-title"
        >
          <div
            className="modal-content-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-row">
                <Clock size={20} className="text-[#28006d]" />
                <h3 id="past-announcements-title" className="modal-title">
                  Past Announcements &amp; Broadcast History
                </h3>
              </div>
              <button
                type="button"
                className="snackbar-close-btn"
                onClick={() => setIsPastModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="modal-body">
              {pastAnnouncements.map((item) => (
                <div key={item.id} className="past-announcement-item">
                  <div className="past-item-top">
                    <span className="past-item-title">{item.title}</span>
                    <span
                      className={`status-badge ${
                        item.status === 'active'
                          ? 'active-status'
                          : item.status === 'scheduled'
                          ? 'scheduled-status'
                          : 'expired-status'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="past-item-body">{item.description}</p>
                  <div className="past-item-meta">
                    <span>
                      <strong>Audiences:</strong>{' '}
                      {item.targetAudience.join(', ')}
                    </span>
                    <span>
                      <strong>Window:</strong> {item.startDate} &mdash;{' '}
                      {item.endDate}
                    </span>
                    {item.reachCount > 0 && (
                      <span>
                        <strong>Audience Reach:</strong>{' '}
                        {item.reachCount.toLocaleString()} users
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-draft-announcement"
                onClick={() => setIsPastModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          11. Detailed Notification Log Modal Dialog
          ============================================================== */}
      {isDetailedLogOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsDetailedLogOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="detailed-log-title"
        >
          <div
            className="modal-content-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-row">
                <TrendingUp size={20} className="text-[#28006d]" />
                <h3 id="detailed-log-title" className="modal-title">
                  Detailed Notification &amp; Delivery Log
                </h3>
              </div>
              <button
                type="button"
                className="snackbar-close-btn"
                onClick={() => setIsDetailedLogOpen(false)}
                aria-label="Close dialog"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="modal-body">
              <div className="p-4 bg-gray-50 rounded-xl mb-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">
                  System Dispatch Summary
                </h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white p-3 rounded-lg border border-gray-100">
                    <span className="text-xs text-gray-500 uppercase">
                      Total Dispatched
                    </span>
                    <p className="text-lg font-bold text-[#28006d]">5,555</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-100">
                    <span className="text-xs text-gray-500 uppercase">
                      Delivery Success
                    </span>
                    <p className="text-lg font-bold text-[#006a60]">98.4%</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-100">
                    <span className="text-xs text-gray-500 uppercase">
                      Bounced / Failed
                    </span>
                    <p className="text-lg font-bold text-[#ba1a1a]">1.6%</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-800">
                  Recent Dispatch Events
                </h4>
                <div className="p-3 bg-white border border-gray-200 rounded-lg text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-900">
                      Scheduled Platform Maintenance (v2.4.0)
                    </span>
                    <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded font-medium">
                      Delivered (1,420)
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Dispatched via AWS SES &amp; Push Gateway • Today at 02:00
                    UTC
                  </p>
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded-lg text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-900">
                      Emergency Security Protocol Notice
                    </span>
                    <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded font-medium">
                      Delivered (3,840)
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Dispatched via AWS SES &amp; Webhook • Oct 28, 2026 at 09:00
                    UTC
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-draft-announcement"
                onClick={() => setIsDetailedLogOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystemSettingsAnnouncements;
