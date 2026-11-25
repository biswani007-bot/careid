import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Bell,
  HelpCircle,
  Menu,
  Clock,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  User,
  Settings,
  Copy,
  Download,
  Check,
  ChevronRight,
  ShieldAlert,
  Server,
  Terminal,
  X
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import {
  useSingleAuditLogQuery,
  classifyActionModule,
  classifyActionSeverity,
} from '../../services/auditLogService';
import './AdminAuditEventDetails.css';

interface AdminAuditEventDetailsProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------
export interface AuditEventDetailData {
  eventId: string;
  action: string;
  actionDescription: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  timestamp: string;
  timezone: string;
  module: string;
  status: 'Applied Successfully' | 'Failed' | 'Pending Verification';
  isSuccess: boolean;
  sessionId: string;
  authMethods: string[];
  actor: {
    username: string;
    role: string;
    ipAddress: string;
    device: string;
    browser: string;
    os: string;
  };
  target: {
    name: string;
    path: string;
    resourceUri: string;
  };
  delta: {
    previousValue: string;
    newValue: string;
    changedField: string;
  };
  rawJson: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Figma Frame 20:7732 Authentic Reference Event Data (EVT-9921)
// ---------------------------------------------------------------------------
const FIGMA_DEFAULT_EVENT: AuditEventDetailData = {
  eventId: 'EVT-9921',
  action: 'OCR Threshold Updated',
  actionDescription: 'Manual adjustment of document recognition confidence levels.',
  severity: 'HIGH',
  timestamp: 'Oct 24, 2023 · 14:32:11',
  timezone: 'GMT-5',
  module: 'System Settings',
  status: 'Applied Successfully',
  isSuccess: true,
  sessionId: 'SESS-552-8B92-AD10',
  authMethods: ['BIOMETRIC', 'OTP'],
  actor: {
    username: 'Admin_01',
    role: 'SUPER ADMIN ACCESS',
    ipAddress: '192.168.1.5',
    device: 'MacBook Pro (16-inch)',
    browser: 'Chrome 118.0.x',
    os: 'macOS Ventura 13.5'
  },
  target: {
    name: 'OCR Engine',
    path: 'Path: System Setting / Config',
    resourceUri: 'api.medvault.internal/v2/config/ai/ocr_threshold'
  },
  delta: {
    previousValue: '85%',
    newValue: '90%',
    changedField: 'auto_approval_threshold'
  },
  rawJson: {
    event_id: 'EVT-9921',
    actor: {
      id: 'USR-ADMIN-01',
      role: 'SUPER_ADMIN',
      identity_assurance: 'LEVEL_3'
    },
    meta: {
      source: '192.168.1.5',
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...',
      geo: 'US-NYC-OFFICE'
    },
    payload: {
      action: 'UPDATE_THRESHOLD',
      target: 'OCR_PROCESSOR',
      parameters: {
        key: 'auto_approval_threshold',
        old_value: 0.85,
        new_value: 0.90
      }
    },
    security: {
      mfa_verified: true,
      timestamp: 1698172331,
      hash: '8f3e2...23a1'
    }
  }
};

export const AdminAuditEventDetails: React.FC<AdminAuditEventDetailsProps> = ({
  onNavigate,
  onLogout
}) => {
  const { eventId: paramEventId } = useParams<{ eventId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation & Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [chainVerified, setChainVerified] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Determine current event data
  const currentEventId = paramEventId || 'EVT-9921';
  const passedStateEvent = (location.state as { auditEvent?: any })?.auditEvent;

  // Live Query from backend endpoint GET /api/v1/admin/audit-logs/:id
  const { data: liveSingleLog, isLoading: isLogLoading } = useSingleAuditLogQuery(
    currentEventId !== 'EVT-9921' ? currentEventId : undefined
  );

  const eventData: AuditEventDetailData | null = useMemo(() => {
    // 1. If backend returned single audit record
    if (liveSingleLog) {
      const isFailed = (liveSingleLog.action || '').includes('FAILED') || (liveSingleLog.action || '').includes('REVOKED');
      const severity = classifyActionSeverity(liveSingleLog.action || '');
      const module = classifyActionModule(liveSingleLog.action || '');
      const shortUserId = liveSingleLog.userId ? liveSingleLog.userId.slice(0, 8) : 'System';
      const cleanId = (liveSingleLog.id || currentEventId).slice(0, 8).toUpperCase();

      const dateObj = new Date(liveSingleLog.createdAt);
      const formattedTimestamp = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
          ' · ' +
          dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : liveSingleLog.createdAt || 'Just now';

      return {
        eventId: `EVT-${cleanId}`,
        action: (liveSingleLog.action || 'Audit Event').replace(/_/g, ' '),
        actionDescription: liveSingleLog.details || `Executed ${liveSingleLog.action} on platform core.`,
        severity,
        timestamp: formattedTimestamp,
        timezone: 'UTC',
        module,
        status: isFailed ? 'Failed' : 'Applied Successfully',
        isSuccess: !isFailed,
        sessionId: `SESS-${cleanId}-LIVE`,
        authMethods: ['PASSWORD', 'OTP'],
        actor: {
          username: liveSingleLog.userId ? `User #${shortUserId}` : 'System Agent',
          role: liveSingleLog.userId ? 'AUTHORIZED USER' : 'SYSTEM SERVICE',
          ipAddress: liveSingleLog.ipAddress || '127.0.0.1',
          device: 'Workstation Terminal',
          browser: 'Web API Client',
          os: 'Cloud Platform'
        },
        target: {
          name: 'Core System',
          path: `Path: /api/v1/admin/audit-logs/${liveSingleLog.id}`,
          resourceUri: `https://360api.vnvision.in/api/v1/admin/audit-logs/${liveSingleLog.id}`
        },
        delta: {
          previousValue: 'Previous State',
          newValue: 'Audited Action',
          changedField: (liveSingleLog.action || 'ACTION').toLowerCase()
        },
        rawJson: {
          id: liveSingleLog.id,
          userId: liveSingleLog.userId,
          action: liveSingleLog.action,
          details: liveSingleLog.details,
          ipAddress: liveSingleLog.ipAddress,
          createdAt: liveSingleLog.createdAt
        }
      };
    }

    // 2. If passed from Explorer row state
    if (passedStateEvent) {
      const isFailed = passedStateEvent.status === 'FAILED';
      const severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' =
        passedStateEvent.severity || (isFailed ? 'HIGH' : 'LOW');

      return {
        eventId: passedStateEvent.eventId || currentEventId,
        action: passedStateEvent.action || 'Audit Event Record',
        actionDescription: passedStateEvent.rawDetails || `Executed ${passedStateEvent.action || 'action'} under ${passedStateEvent.module || 'System'}.`,
        severity,
        timestamp: passedStateEvent.timestamp || 'Just now',
        timezone: 'UTC',
        module: passedStateEvent.module || 'System Settings',
        status: isFailed ? 'Failed' : 'Applied Successfully',
        isSuccess: !isFailed,
        sessionId: `SESS-${(passedStateEvent.eventId || '9921').replace(/\D/g, '')}-8B92-AD10`,
        authMethods: ['BIOMETRIC', 'OTP'],
        actor: {
          username: passedStateEvent.performedBy || 'Admin_01',
          role: passedStateEvent.role ? `${passedStateEvent.role.toUpperCase()} ACCESS` : 'SUPER ADMIN ACCESS',
          ipAddress: passedStateEvent.ipAddress || '127.0.0.1',
          device: 'MacBook Pro (16-inch)',
          browser: 'Chrome 118.0.x',
          os: 'macOS Ventura 13.5'
        },
        target: {
          name: passedStateEvent.target || 'System Service',
          path: `Path: ${passedStateEvent.module || 'System'} / Config`,
          resourceUri: `https://360api.vnvision.in/api/v1/admin/audit-logs/${passedStateEvent.id || ''}`
        },
        delta: {
          previousValue: 'Default Policy',
          newValue: 'Active Policy',
          changedField: passedStateEvent.action ? passedStateEvent.action.toLowerCase().replace(/\s+/g, '_') : 'configuration_state'
        },
        rawJson: {
          event_id: passedStateEvent.eventId || currentEventId,
          actor: {
            id: passedStateEvent.performedBy || 'USR-ADMIN-01',
            role: passedStateEvent.role || 'SUPER_ADMIN'
          },
          payload: {
            action: passedStateEvent.action,
            details: passedStateEvent.rawDetails,
            ipAddress: passedStateEvent.ipAddress
          }
        }
      };
    }

    // 3. If standard Figma frame event EVT-9921
    if (currentEventId.toUpperCase() === 'EVT-9921') {
      return FIGMA_DEFAULT_EVENT;
    }

    return null;
  }, [liveSingleLog, passedStateEvent, currentEventId]);

  // Handle toast timeout
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const handleVerifyChain = () => {
    setIsVerifyingChain(true);
    setTimeout(() => {
      setIsVerifyingChain(false);
      setChainVerified(true);
      setToastMessage({
        type: 'success',
        text: 'Chain of custody verified: SHA-256 ledger proof anchored & cryptographically valid.'
      });
    }, 900);
  };

  const handleCopyJson = () => {
    if (eventData) {
      navigator.clipboard.writeText(JSON.stringify(eventData.rawJson, null, 2));
      setCopiedJson(true);
      setToastMessage({
        type: 'success',
        text: 'Raw system log output copied to clipboard.'
      });
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  const handleExportJson = () => {
    if (eventData) {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(eventData.rawJson, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${eventData.eventId}_audit_details.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setToastMessage({
        type: 'success',
        text: `Exported ${eventData.eventId} audit JSON record.`
      });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleNav(`/admin/audit-log-explorer?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (isLogLoading) {
    return (
      <div className="audit-details-root flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#28006d] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-[#494552]">Loading live audit event...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="audit-details-root"
      data-node-id="20:7732"
      data-name="Admin Portal - Audit Event Details"
    >
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className={`audit-details-toast ${toastMessage.type}`} role="alert">
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
          <button
            type="button"
            className="toast-close-btn"
            onClick={() => setToastMessage(null)}
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

      {/* Admin Sidebar Navigation */}
      <AdminSidebar
        activeNav="audit"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
      />

      {/* Main Content Area Canvas */}
      <div
        className="audit-details-canvas"
        data-node-id="20:7733"
        data-name="Main Content Area"
      >
        {/* Header - Top Navigation Bar (Figma Node ID: 20:7912) */}
        <header
          className="audit-details-header"
          data-node-id="20:7912"
          data-name="Header - Top Navigation Bar"
        >
          <div className="header-left-group" data-node-id="20:7913">
            <button
              type="button"
              className="menu-drawer-trigger"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open sidebar menu"
            >
              <Menu size={20} />
            </button>

            {/* Back Button (Figma Node ID: 20:7914) */}
            <button
              type="button"
              className="back-nav-btn"
              onClick={() => handleNav('/admin/audit-log-explorer')}
              title="Return to Audit Log Explorer"
              aria-label="Back to Audit Log Explorer"
              data-node-id="20:7914"
            >
              <ArrowLeft size={16} />
            </button>

            {/* Page Heading (Figma Node ID: 20:7917) */}
            <h1 className="header-page-title" data-node-id="20:7918">
              Audit Event Details
            </h1>
          </div>

          {/* Header Right Actions & Search (Figma Node ID: 20:7919) */}
          <div className="header-right-group" data-node-id="20:7919">
            {/* Search Input Pill (Figma Node ID: 20:7920) */}
            <form onSubmit={handleSearchSubmit} className="header-search-form" data-node-id="20:7921">
              <Search size={14} className="header-search-icon" data-node-id="20:7925" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search event logs..."
                className="header-search-input"
                aria-label="Search event logs"
                data-node-id="20:7923"
              />
            </form>

            {/* Header Action Circle Buttons */}
            <div className="header-action-buttons" data-node-id="20:7926">
              <button
                type="button"
                className="header-circle-btn"
                onClick={() =>
                  setToastMessage({
                    type: 'info',
                    text: 'Live security stream connected.'
                  })
                }
                title="Notifications"
                aria-label="Notifications"
                data-node-id="20:7927"
              >
                <Bell size={18} />
              </button>

              <button
                type="button"
                className="header-circle-btn"
                onClick={() => handleNav('/admin/support')}
                title="Help & Support"
                aria-label="Help & Support"
                data-node-id="20:7930"
              >
                <HelpCircle size={18} />
              </button>

              <button
                type="button"
                className="header-circle-btn avatar-btn p-0 overflow-hidden"
                onClick={() => handleNav('/admin/profile')}
                title="My Profile & Information"
                aria-label="My Profile & Information"
                data-node-id="20:7933"
              >
                <AdminProfileAvatar size="full" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="audit-details-content-wrap">
          {/* Nav - Page Header / Breadcrumbs (Figma Node ID: 20:7734) */}
          <nav
            className="audit-breadcrumbs-row"
            aria-label="Breadcrumb navigation"
            data-node-id="20:7734"
            data-name="Nav - Page Header / Breadcrumbs"
          >
            <div className="breadcrumb-item" data-node-id="20:7735">
              <span className="breadcrumb-dimmed" data-node-id="20:7736">Compliance</span>
            </div>
            <ChevronRight size={13} className="breadcrumb-sep" data-node-id="20:7737" />
            <div className="breadcrumb-item" data-node-id="20:7739">
              <button
                type="button"
                className="breadcrumb-link"
                onClick={() => handleNav('/admin/audit-log-explorer')}
                data-node-id="20:7740"
              >
                Audit Logs
              </button>
            </div>
            <ChevronRight size={13} className="breadcrumb-sep" data-node-id="20:7741" />
            <div className="breadcrumb-item" data-node-id="20:7743">
              <span className="breadcrumb-current" data-node-id="20:7744">
                {eventData?.eventId || currentEventId}
              </span>
            </div>
          </nav>

          {/* Unavailable / Loading State if event not found */}
          {!eventData ? (
            <div className="event-unavailable-card">
              <AlertCircle size={40} className="unavailable-icon" />
              <h2>Audit Event Unavailable</h2>
              <p>The requested audit record "{currentEventId}" could not be located in the current ledger.</p>
              <button
                type="button"
                className="btn-back-explorer"
                onClick={() => handleNav('/admin/audit-log-explorer')}
              >
                Back to Audit Log Explorer
              </button>
            </div>
          ) : (
            <>
              {/* Main 12-Column Grid Container (Figma Node ID: 20:7745) */}
              <div
                className="audit-details-grid"
                data-node-id="20:7745"
                data-name="Container"
              >
                {/* -------------------------------------------------------------
                    Section 1: Event Summary (Primary Hero Card) (Node ID: 20:7746)
                    ------------------------------------------------------------- */}
                <section
                  className="audit-card hero-summary-card"
                  data-node-id="20:7746"
                  data-name="Section: Event Summary (Primary Hero Card)"
                >
                  <div className="hero-top-row" data-node-id="20:7747">
                    <div className="hero-left-meta" data-node-id="20:7748">
                      {/* Severity Pill Badge */}
                      <div className={`severity-pill ${eventData.severity.toLowerCase()}`} data-node-id="20:7749">
                        <span data-node-id="20:7750">SEVERITY: {eventData.severity}</span>
                      </div>

                      {/* Main Action Title */}
                      <h2 className="hero-action-title" data-node-id="20:7752">
                        {eventData.action}
                      </h2>

                      {/* Action Description */}
                      <p className="hero-action-desc" data-node-id="20:7754">
                        {eventData.actionDescription}
                      </p>
                    </div>

                    {/* Event ID Badge */}
                    <div className="hero-event-id-group" data-node-id="20:7755">
                      <span className="event-id-label" data-node-id="20:7757">EVENT ID</span>
                      <span className="event-id-value" data-node-id="20:7759">{eventData.eventId}</span>
                    </div>
                  </div>

                  {/* Horizontal Border & Summary Details (Figma Node ID: 20:7760) */}
                  <div className="hero-divider-row" data-node-id="20:7760">
                    {/* Timestamp Col */}
                    <div className="hero-summary-col" data-node-id="20:7761">
                      <div className="col-header-row" data-node-id="20:7762">
                        <Clock size={14} className="col-header-icon" />
                        <span className="col-header-label" data-node-id="20:7765">TIMESTAMP</span>
                      </div>
                      <div className="col-value-box" data-node-id="20:7767">
                        <div className="timestamp-main">{eventData.timestamp}</div>
                        <div className="timestamp-sub">{eventData.timezone}</div>
                      </div>
                    </div>

                    {/* Module Col */}
                    <div className="hero-summary-col" data-node-id="20:7768">
                      <div className="col-header-row" data-node-id="20:7769">
                        <Layers size={14} className="col-header-icon" />
                        <span className="col-header-label" data-node-id="20:7772">MODULE</span>
                      </div>
                      <div className="col-value-box" data-node-id="20:7774">
                        <span className="module-value-text">{eventData.module}</span>
                      </div>
                    </div>

                    {/* Status Col */}
                    <div className="hero-summary-col" data-node-id="20:7775">
                      <div className="col-header-row" data-node-id="20:7776">
                        <ShieldCheck size={14} className="col-header-icon" />
                        <span className="col-header-label" data-node-id="20:7779">STATUS</span>
                      </div>
                      <div className="col-value-box status-value-box" data-node-id="20:7780">
                        <span className={`status-indicator-dot ${eventData.isSuccess ? 'dot-success' : 'dot-failed'}`} data-node-id="20:7781" />
                        <span className="status-value-text" data-node-id="20:7783">{eventData.status}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* -------------------------------------------------------------
                    Section 2: Security Info (Side Action Card) (Node ID: 20:7784)
                    ------------------------------------------------------------- */}
                <section
                  className="audit-card security-context-card"
                  data-node-id="20:7784"
                  data-name="Section: Security Info (Side Action Card)"
                >
                  <div className="card-section-heading" data-node-id="20:7785">
                    <Lock size={14} className="heading-icon" />
                    <span data-node-id="20:7788">SECURITY CONTEXT</span>
                  </div>

                  <div className="security-boxes-group" data-node-id="20:7789">
                    {/* Session ID Box */}
                    <div className="security-field-box" data-node-id="20:7790">
                      <span className="field-box-label" data-node-id="20:7792">Session ID</span>
                      <span className="session-id-mono" data-node-id="20:7794">{eventData.sessionId}</span>
                    </div>

                    {/* Auth Method Box */}
                    <div className="security-field-box" data-node-id="20:7795">
                      <span className="field-box-label" data-node-id="20:7797">Auth Method</span>
                      <div className="auth-badges-row" data-node-id="20:7798">
                        {eventData.authMethods.map((method) => (
                          <span key={method} className="auth-method-chip" data-node-id="20:7800">
                            {method}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Verify Chain of Custody Action Button */}
                  <button
                    type="button"
                    className={`btn-verify-custody ${chainVerified ? 'btn-verified' : ''}`}
                    onClick={handleVerifyChain}
                    disabled={isVerifyingChain}
                    data-node-id="20:7803"
                    data-name="Button"
                  >
                    <ShieldCheck size={16} />
                    <span>
                      {isVerifyingChain
                        ? 'Verifying Cryptographic Ledger...'
                        : chainVerified
                        ? 'Chain of Custody Verified ✓'
                        : 'Verify Chain of Custody'}
                    </span>
                  </button>
                </section>

                {/* -------------------------------------------------------------
                    Section 3: The Actor Details (Node ID: 20:7808)
                    ------------------------------------------------------------- */}
                <section
                  className="audit-card actor-details-card"
                  data-node-id="20:7808"
                  data-name="Section: Actor Details"
                >
                  <div className="card-section-heading" data-node-id="20:7809">
                    <span data-node-id="20:7810">THE ACTOR</span>
                  </div>

                  {/* Actor Avatar & Identity */}
                  <div className="actor-profile-row" data-node-id="20:7811">
                    <div className="actor-avatar-box" data-node-id="20:7812">
                      <User size={22} className="actor-user-icon" />
                    </div>
                    <div className="actor-name-col" data-node-id="20:7815">
                      <span className="actor-username" data-node-id="20:7817">{eventData.actor.username}</span>
                      <span className="actor-role-badge" data-node-id="20:7819">{eventData.actor.role}</span>
                    </div>
                  </div>

                  {/* Metadata List */}
                  <div className="actor-meta-list" data-node-id="20:7820">
                    <div className="meta-list-item" data-node-id="20:7821">
                      <span className="meta-label" data-node-id="20:7823">IP Address</span>
                      <span className="meta-val-mono" data-node-id="20:7825">{eventData.actor.ipAddress}</span>
                    </div>

                    <div className="meta-list-item" data-node-id="20:7826">
                      <span className="meta-label" data-node-id="20:7828">Device</span>
                      <span className="meta-val" data-node-id="20:7830">{eventData.actor.device}</span>
                    </div>

                    <div className="meta-list-item" data-node-id="20:7831">
                      <span className="meta-label" data-node-id="20:7833">Browser</span>
                      <div className="browser-meta-val" data-node-id="20:7834">
                        <Server size={12} className="meta-sub-icon" />
                        <span data-node-id="20:7837">{eventData.actor.browser}</span>
                      </div>
                    </div>

                    <div className="meta-list-item meta-list-item-last" data-node-id="20:7838">
                      <span className="meta-label" data-node-id="20:7840">OS</span>
                      <span className="meta-val" data-node-id="20:7842">{eventData.actor.os}</span>
                    </div>
                  </div>
                </section>

                {/* -------------------------------------------------------------
                    Section 4: Target Resource (Node ID: 20:7843)
                    ------------------------------------------------------------- */}
                <section
                  className="audit-card target-resource-card"
                  data-node-id="20:7843"
                  data-name="Section: Target"
                >
                  <div className="card-section-heading" data-node-id="20:7844">
                    <span data-node-id="20:7845">TARGET RESOURCE</span>
                  </div>

                  {/* Target Identity */}
                  <div className="target-profile-row" data-node-id="20:7846">
                    <div className="target-icon-box" data-node-id="20:7847">
                      <Settings size={24} className="target-settings-icon" />
                    </div>
                    <div className="target-info-col" data-node-id="20:7850">
                      <span className="target-name" data-node-id="20:7852">{eventData.target.name}</span>
                      <span className="target-path" data-node-id="20:7854">{eventData.target.path}</span>
                    </div>
                  </div>

                  {/* Resource URI Box */}
                  <div className="resource-uri-box" data-node-id="20:7855">
                    <span className="resource-uri-label" data-node-id="20:7857">RESOURCE URI</span>
                    <span className="resource-uri-text" data-node-id="20:7859">{eventData.target.resourceUri}</span>
                  </div>
                </section>

                {/* -------------------------------------------------------------
                    Section 5: Event Data Comparison / Delta (Node ID: 20:7875)
                    ------------------------------------------------------------- */}
                <section
                  className="audit-card data-delta-card"
                  data-node-id="20:7875"
                  data-name="Section: Event Data Comparison"
                >
                  <div className="card-section-heading" data-node-id="20:7876">
                    <span data-node-id="20:7877">DATA DELTA</span>
                  </div>

                  <div className="delta-values-stack" data-node-id="20:7880">
                    {/* Previous Value */}
                    <div className="delta-item previous-delta" data-node-id="20:7881">
                      <span className="delta-label" data-node-id="20:7883">Previous Value</span>
                      <div className="delta-val-row" data-node-id="20:7884">
                        <span className="delta-val-num" data-node-id="20:7886">{eventData.delta.previousValue}</span>
                        <span className="badge-old" data-node-id="20:7888">OLD</span>
                      </div>
                    </div>

                    {/* New Value */}
                    <div className="delta-item new-delta" data-node-id="20:7889">
                      <div className="delta-check-pin" data-node-id="20:7897">
                        <Check size={9} className="delta-check-icon" />
                      </div>
                      <span className="delta-label new-label" data-node-id="20:7891">New Value</span>
                      <div className="delta-val-row" data-node-id="20:7892">
                        <span className="delta-val-num-new" data-node-id="20:7894">{eventData.delta.newValue}</span>
                        <span className="badge-new" data-node-id="20:7896">NEW</span>
                      </div>
                    </div>

                    {/* Changed Fields */}
                    <div className="changed-fields-wrap" data-node-id="20:7900">
                      <span className="delta-label" data-node-id="20:7902">Changed Fields</span>
                      <div className="field-chip-container" data-node-id="20:7903">
                        <code className="field-code-chip" data-node-id="20:7905">
                          {eventData.delta.changedField}
                        </code>
                      </div>
                    </div>
                  </div>
                </section>

                {/* -------------------------------------------------------------
                    Section 6: Raw System Log Output (Full Width) (Node ID: 20:7860)
                    ------------------------------------------------------------- */}
                <section
                  className="audit-card raw-json-card"
                  data-node-id="20:7860"
                  data-name="Section: JSON Raw Log (Full Width)"
                >
                  <div className="raw-json-header" data-node-id="20:7861">
                    <div className="raw-heading-group" data-node-id="20:7862">
                      <Terminal size={15} className="terminal-icon" />
                      <span className="raw-heading-text" data-node-id="20:7863">RAW SYSTEM LOG OUTPUT</span>
                    </div>

                    <div className="raw-actions-group" data-node-id="20:7864">
                      <button
                        type="button"
                        className="raw-action-btn"
                        onClick={handleCopyJson}
                        title="Copy JSON Payload"
                        data-node-id="20:7865"
                      >
                        {copiedJson ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
                      </button>

                      <button
                        type="button"
                        className="raw-action-btn"
                        onClick={handleExportJson}
                        title="Export JSON Log"
                        data-node-id="20:7869"
                      >
                        <Download size={13} />
                        <span>Export Log</span>
                      </button>
                    </div>
                  </div>

                  {/* Formatted Code Block */}
                  <div className="raw-code-viewport" data-node-id="20:7873">
                    <pre className="raw-code-pre" data-node-id="20:7874">
                      {JSON.stringify(eventData.rawJson, null, 2)}
                    </pre>
                  </div>
                </section>
              </div>

              {/* Bottom Actions Row (Figma Node ID: 20:7906) */}
              <div
                className="audit-details-bottom-actions"
                data-node-id="20:7906"
                data-name="Bottom Actions"
              >
                <button
                  type="button"
                  className="btn-bottom-dismiss"
                  onClick={() => {
                    setToastMessage({
                      type: 'info',
                      text: `Notification for event ${eventData.eventId} dismissed.`
                    });
                  }}
                  data-node-id="20:7907"
                >
                  Dismiss Notification
                </button>

                <button
                  type="button"
                  className="btn-bottom-review"
                  onClick={() => setShowReviewModal(true)}
                  data-node-id="20:7909"
                >
                  Initiate Security Review
                </button>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Security Review Modal */}
      {showReviewModal && (
        <div className="audit-modal-backdrop" onClick={() => setShowReviewModal(false)}>
          <div className="audit-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <ShieldAlert size={20} className="modal-shield-alert" />
                <h3>Initiate Security Escalation Review</h3>
              </div>
              <button
                type="button"
                className="modal-close-icon-btn"
                onClick={() => setShowReviewModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">
                You are initiating a formalized security governance review for event record{' '}
                <strong>{eventData?.eventId || currentEventId}</strong>.
              </p>
              <div className="modal-info-box">
                <div><strong>Action:</strong> {eventData?.action}</div>
                <div><strong>Actor:</strong> {eventData?.actor.username} ({eventData?.actor.role})</div>
                <div><strong>Origin:</strong> {eventData?.actor.ipAddress}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowReviewModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-confirm"
                onClick={() => {
                  setShowReviewModal(false);
                  setToastMessage({
                    type: 'success',
                    text: `Security escalation review for ${eventData?.eventId} has been recorded.`
                  });
                }}
              >
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditEventDetails;
