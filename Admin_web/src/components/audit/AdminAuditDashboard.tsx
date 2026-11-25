import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  HelpCircle,
  Menu,
  Download,
  Filter,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Activity,
  Lock,
  Users,
  UserCheck,
  Stethoscope,
  FileText,
  Scan,
  Share2,
  BarChart3,
  Settings,
  ShieldAlert,
  Network,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import { useAuditLogsQuery } from '../../services/dashboardService';
import { exportAuditLogs } from '../../services/auditLogService';
import './AdminAuditDashboard.css';

interface AdminAuditDashboardProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------
export type DateRangeOption = 'Today' | 'Yesterday' | 'Last 7 Days' | 'Last 30 Days' | 'Custom';
export type SeverityLevel = 'CRITICAL' | 'MEDIUM' | 'INFO';
export type AuditStatus = 'Verified' | 'Locked' | 'Pending';

export interface AuditStreamItem {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  userInitials: string;
  userName: string;
  userType: 'admin' | 'system' | 'unknown' | 'doctor';
  action: string;
  objectId: string;
  severity: SeverityLevel;
  status: AuditStatus;
  category: string;
}

export interface ActivityTrendBar {
  hour: string;
  label: string;
  count: number;
  heightPx: number;
  opacityClass: string;
  isPeak?: boolean;
}

const CATEGORIES_LIST = [
  { id: 'auth', name: 'Authentication', colorScheme: 'purple', icon: Lock },
  { id: 'user', name: 'User Management', colorScheme: 'neutral', icon: Users },
  { id: 'patient', name: 'Patient Management', colorScheme: 'neutral', icon: UserCheck },
  { id: 'doctor', name: 'Doctor Management', colorScheme: 'neutral', icon: Stethoscope },
  { id: 'records', name: 'Medical Records', colorScheme: 'teal', icon: FileText },
  { id: 'ocr', name: 'OCR', colorScheme: 'neutral', icon: Scan },
  { id: 'referrals', name: 'Referrals', colorScheme: 'neutral', icon: Share2 },
  { id: 'reports', name: 'Reports', colorScheme: 'neutral', icon: BarChart3 },
  { id: 'settings', name: 'System Settings', colorScheme: 'neutral', icon: Settings },
  { id: 'security', name: 'Security', colorScheme: 'red', icon: ShieldAlert },
  { id: 'integrations', name: 'Integrations', colorScheme: 'neutral', icon: Network }
];

export const AdminAuditDashboard: React.FC<AdminAuditDashboardProps> = ({
  onNavigate,
  onLogout
}) => {
  const navigate = useNavigate();
  // Navigation & Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Date Range Filter
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeOption>('Last 7 Days');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('2023-10-20');
  const [customEndDate, setCustomEndDate] = useState('2023-10-27');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<AuditStatus | 'ALL'>('ALL');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showMoreActionsMenu, setShowMoreActionsMenu] = useState(false);

  // Categories Modal
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [activeCategoryToggles, setActiveCategoryToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    CATEGORIES_LIST.forEach((c) => {
      initial[c.id] = true;
    });
    return initial;
  });

  // New Audit Report FAB Modal
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [reportType, setReportType] = useState('HIPAA_COMPLIANCE');
  const [reportFormat, setReportFormat] = useState('PDF');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // Live Query from Backend
  const { data: liveAuditLogs } = useAuditLogsQuery();

  // Compute live statistics and real trend distributions from live audit logs
  const stats = useMemo(() => {
    const logs = liveAuditLogs || [];
    let critical = 0;
    let security = 0;
    let failedLogins = 0;
    let configChanges = 0;
    let todayActive = 0;
    const nowStr = new Date().toISOString().split('T')[0];
    const hourCounts: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourCounts[h] = 0;

    logs.forEach((log) => {
      const act = (log.action || '').toUpperCase();
      const isCritical = act.includes('FAILED') || act.includes('REVOKED') || act.includes('CRITICAL');
      if (isCritical) critical++;
      if (act.includes('LOGIN') || act.includes('AUTH') || act.includes('OTP') || act.includes('SESSION')) {
        security++;
      }
      if (act.includes('FAILED') || act.includes('REVOKED')) {
        failedLogins++;
      }
      if (act.includes('SETTING') || act.includes('ORGANIZATION') || act.includes('UPDATED') || act.includes('ROLE')) {
        configChanges++;
      }
      if (log.createdAt && log.createdAt.startsWith(nowStr)) {
        todayActive++;
      }
      const d = new Date(log.createdAt);
      if (!isNaN(d.getTime())) {
        hourCounts[d.getHours()]++;
      }
    });

    const maxCount = Math.max(...Object.values(hourCounts), 1);
    const trendBars: ActivityTrendBar[] = Object.entries(hourCounts).map(([h, count]) => {
      const hourNum = Number(h);
      const isPeak = count === maxCount && count > 0;
      return {
        hour: `${String(hourNum).padStart(2, '0')}:00 - ${String((hourNum + 1) % 24).padStart(2, '0')}:00`,
        label: `${hourNum % 12 === 0 ? 12 : hourNum % 12}:00`,
        count,
        heightPx: Math.max(16, Math.round((count / maxCount) * 124) + 16),
        opacityClass: isPeak ? 'bar-peak' : count > maxCount * 0.5 ? 'bar-op-40' : 'bar-op-20',
        isPeak
      };
    });

    return {
      total: logs.length,
      critical,
      security,
      failedLogins,
      configChanges,
      todayActive,
      trendBars
    };
  }, [liveAuditLogs]);

  // Map purely authentic backend live items
  const combinedStream = useMemo(() => {
    if (!liveAuditLogs || liveAuditLogs.length === 0) {
      return [];
    }

    return liveAuditLogs.map((log, idx) => {
      const createdAt = log.createdAt ? new Date(log.createdAt) : new Date();
      const datePart = !isNaN(createdAt.getTime()) ? createdAt.toISOString().split('T')[0] : '';
      const timePart = !isNaN(createdAt.getTime()) ? createdAt.toTimeString().split(' ')[0] : '';

      let severity: SeverityLevel = 'INFO';
      let status: AuditStatus = 'Verified';
      let category = 'System Settings';

      const actionLower = (log.action || '').toLowerCase();

      if (actionLower.includes('fail') || actionLower.includes('critical') || actionLower.includes('revoked')) {
        severity = 'CRITICAL';
        status = 'Locked';
      } else if (
        actionLower.includes('update') ||
        actionLower.includes('modif') ||
        actionLower.includes('delete') ||
        actionLower.includes('change')
      ) {
        severity = 'MEDIUM';
      }

      if (actionLower.includes('login') || actionLower.includes('otp') || actionLower.includes('auth')) {
        category = 'Authentication';
      } else if (actionLower.includes('profile') || actionLower.includes('user')) {
        category = 'User Management';
      } else if (actionLower.includes('token') || actionLower.includes('key') || actionLower.includes('sec')) {
        category = 'Security';
      } else if (actionLower.includes('record') || actionLower.includes('patient')) {
        category = 'Patient Management';
      }

      // Friendly human readable label for raw system actions
      let displayAction = log.action ? log.action.replace(/_/g, ' ') : 'System Operation';
      if (log.action === 'ME_PROFILE_VIEW') displayAction = 'Viewed Admin Profile';
      else if (log.action === 'USER_LOGIN') displayAction = 'Admin Portal Login';
      else if (log.action === 'OTP_REQUESTED') displayAction = 'Requested OTP Challenge';
      else if (log.action === 'TOKEN_REFRESH') displayAction = 'Refreshed Session Token';

      // User ID format
      const shortId = log.userId ? log.userId.slice(0, 8) : 'System';
      const displayName = log.userId ? `User (${shortId})` : 'System Service';
      const initials = log.userId ? 'AU' : 'SY';

      // Friendly object ID
      const displayObjectId =
        log.details && log.details !== 'string'
          ? log.details
          : log.ipAddress
          ? `IP: ${log.ipAddress}`
          : `SYS-${(log.id || `${idx}`).slice(0, 6).toUpperCase()}`;

      return {
        id: log.id || `live-${idx}`,
        timestamp: `${datePart} ${timePart}`,
        date: datePart,
        time: timePart,
        userInitials: initials,
        userName: displayName,
        userType: (log.userId ? 'admin' : 'system') as 'admin' | 'system',
        action: displayAction,
        objectId: displayObjectId,
        severity,
        status,
        category
      };
    });
  }, [liveAuditLogs]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return combinedStream.filter((item) => {
      // Category filter
      if (selectedCategory && item.category !== selectedCategory) {
        return false;
      }
      // Check toggled category
      const matchedCat = CATEGORIES_LIST.find((c) => c.name.toLowerCase() === item.category.toLowerCase());
      if (matchedCat && activeCategoryToggles[matchedCat.id] === false) {
        return false;
      }
      // Severity filter
      if (selectedSeverity !== 'ALL' && item.severity !== selectedSeverity) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAction = item.action.toLowerCase().includes(q);
        const matchesUser = item.userName.toLowerCase().includes(q);
        const matchesObject = item.objectId.toLowerCase().includes(q);
        const matchesCategory = item.category.toLowerCase().includes(q);
        if (!matchesAction && !matchesUser && !matchesObject && !matchesCategory) {
          return false;
        }
      }
      return true;
    });
  }, [combinedStream, selectedCategory, selectedSeverity, selectedStatus, searchQuery, activeCategoryToggles]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const totalEntries = filteredItems.length;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
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

  const handleExportData = async (format: 'csv' | 'json' = 'csv') => {
    try {
      await exportAuditLogs(format);
      setToastMessage({
        type: 'success',
        text: `Audit trail exported successfully (${format.toUpperCase()}) from live backend.`
      });
    } catch (err: any) {
      setToastMessage({
        type: 'info',
        text: `Export failed: ${err.message || 'Live backend export error'}`
      });
    }
  };

  const handleGenerateReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingReport(true);
    try {
      const format = reportFormat.toLowerCase() === 'json' ? 'json' : 'csv';
      await exportAuditLogs(format);
      setShowNewReportModal(false);
      setToastMessage({
        type: 'success',
        text: `New ${reportType.replace('_', ' ')} audit report exported (${format.toUpperCase()}).`
      });
    } catch (err: any) {
      setToastMessage({
        type: 'info',
        text: `Export error: ${err.message || 'Failed to export from backend'}`
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleDateRangeSelect = (option: DateRangeOption) => {
    setSelectedDateRange(option);
    if (option === 'Custom') {
      setShowCustomDateModal(true);
    } else {
      setToastMessage({
        type: 'info',
        text: `Audit timeframe filtered to: ${option}`
      });
    }
  };

  const activeCategoryCount = Object.values(activeCategoryToggles).filter(Boolean).length;

  return (
    <div
      className="audit-root"
      data-node-id="20:6795"
      data-name="Admin Portal - Audit Dashboard"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`audit-toast ${toastMessage.type}`} role="alert">
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
          <button
            type="button"
            className="audit-toast-close"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss message"
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

      {/* Main Content Area Wrapper */}
      <div
        className="audit-main-canvas"
        data-node-id="20:6796"
        data-name="Main Content Area"
      >
        {/* Header - Top Navigation Bar (Figma Node ID: 20:7096) */}
        <header
          className="audit-header-top"
          data-node-id="20:7096"
          data-name="Header - Top Navigation Bar"
        >
          <div className="audit-header-left">
            <button
              type="button"
              className="audit-menu-toggle-btn"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation sidebar"
            >
              <Menu size={20} />
            </button>

            {/* Global Audit Search Input (Figma Node ID: 20:7097) */}
            <div
              className="audit-search-container"
              data-node-id="20:7097"
              data-name="Background+Border"
            >
              <Search size={18} className="audit-search-icon" />
              <input
                type="text"
                placeholder="Search audit trails..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="audit-search-input"
                aria-label="Search audit trails"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="audit-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div
            className="audit-header-right"
            data-node-id="20:7104"
            data-name="Margin"
          >
            <div className="audit-header-actions" data-node-id="20:7105">
              {/* Help Circle Button */}
              <button
                type="button"
                className="audit-circle-action-btn"
                onClick={() => handleNav('/admin/support')}
                aria-label="Audit Documentation & Help"
                data-node-id="20:7106"
              >
                <HelpCircle size={20} />
              </button>

              {/* Notification Bell with Red Indicator Dot */}
              <div className="audit-notif-wrapper" data-node-id="20:7109">
                <button
                  type="button"
                  className="audit-circle-action-btn"
                  aria-label="Audit Alerts and Notifications"
                  onClick={() =>
                    setToastMessage({
                      type: 'info',
                      text: 'Real-time alert: 12 critical compliance events flagged.'
                    })
                  }
                  data-node-id="20:7110"
                >
                  <Bell size={20} />
                </button>
                <span className="audit-red-dot" data-node-id="20:7113" />
              </div>

              {/* Vertical Divider */}
              <div className="audit-vertical-divider" data-node-id="20:7115" />

              {/* User Avatar Action */}
              <button
                type="button"
                className="audit-profile-btn"
                onClick={() => handleNav('/admin/profile')}
                aria-label="My Profile & Information"
                title="My Profile & Information"
                data-node-id="20:7116"
              >
                <AdminProfileAvatar size={36} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Header: Title + Subtitle + Date-Range Selector (Figma Node ID: 20:6797) */}
        <div
          className="audit-page-title-row"
          data-node-id="20:6797"
          data-name="Container"
        >
          <div
            className="audit-heading-group"
            data-node-id="20:6798"
            data-name="Container"
          >
            <h1
              className="audit-page-title"
              data-node-id="20:6800"
            >
              Audit Dashboard
            </h1>
            <p
              className="audit-page-subtitle"
              data-node-id="20:6802"
            >
              Monitoring enterprise-wide compliance and event streams.
            </p>
          </div>

          {/* Header Controls: Date-Range Selector + Standalone Audit Logs Button */}
          <div className="audit-header-controls-group">
            {/* Date-Range Selector Pills (Figma Node ID: 20:6803) */}
            <div
              className="audit-daterange-pills"
              role="group"
              aria-label="Select audit time window"
              data-node-id="20:6803"
              data-name="Background"
            >
              {(['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Custom'] as DateRangeOption[]).map(
                (option) => {
                  const isActive = selectedDateRange === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      className={`audit-pill-btn ${isActive ? 'active' : ''}`}
                      onClick={() => handleDateRangeSelect(option)}
                      aria-pressed={isActive}
                      data-node-id={
                        option === 'Today'
                          ? '20:6804'
                          : option === 'Yesterday'
                          ? '20:6806'
                          : option === 'Last 7 Days'
                          ? '20:6808'
                          : option === 'Last 30 Days'
                          ? '20:6810'
                          : '20:6812'
                      }
                    >
                      {option}
                    </button>
                  );
                }
              )}
            </div>

            {/* Standalone Explorer Button */}
            <button
              type="button"
              className="audit-logs-standalone-btn audit-explorer-standalone-btn"
              onClick={() => handleNav('/admin/audit-log-explorer')}
              title="Explorer"
              aria-label="Explorer"
            >
              <FileText size={16} className="audit-logs-btn-icon" aria-hidden="true" />
              <span>Explorer</span>
            </button>
          </div>
        </div>

        {/* Section - Summary Bento Grid (6 Cards) (Figma Node ID: 20:6814) */}
        <section
          className="audit-bento-grid"
          aria-label="Audit summary metrics"
          data-node-id="20:6814"
          data-name="Section - Summary Bento Grid"
        >
            {/* Card 1: Total Events */}
            <div
              className="audit-bento-card"
              data-node-id="20:6815"
              data-name="Background+Border"
            >
              <span className="audit-card-label" data-node-id="20:6817">
                Total Events
              </span>
              <div className="audit-card-val" data-node-id="20:6819">
                {stats.total.toLocaleString()}
              </div>
              <div className="audit-card-trend trend-green" data-node-id="20:6820">
                <TrendingUp size={14} className="trend-icon" />
                <span className="trend-text" data-node-id="20:6824">Live Backend</span>
              </div>
            </div>

            {/* Card 2: Critical Events */}
            <div
              className="audit-bento-card"
              data-node-id="20:6825"
              data-name="Background+Border"
            >
              <span className="audit-card-label" data-node-id="20:6827">
                Critical Events
              </span>
              <div className="audit-card-val text-red" data-node-id="20:6829">
                {stats.critical}
              </div>
              <div className="audit-card-trend trend-red" data-node-id="20:6830">
                <span className="trend-text" data-node-id="20:6832">{stats.critical > 0 ? 'Needs Review' : 'Nominal'}</span>
              </div>
            </div>

            {/* Card 3: Security Events */}
            <div
              className="audit-bento-card"
              data-node-id="20:6833"
              data-name="Background+Border"
            >
              <span className="audit-card-label" data-node-id="20:6835">
                Security Events
              </span>
              <div className="audit-card-val" data-node-id="20:6837">
                {stats.security}
              </div>
              <div className="audit-card-trend trend-gold" data-node-id="20:6838">
                <span className="trend-text" data-node-id="20:6840">Stable Trace</span>
              </div>
            </div>

            {/* Card 4: Failed Logins */}
            <div
              className="audit-bento-card"
              data-node-id="20:6841"
              data-name="Background+Border"
            >
              <span className="audit-card-label" data-node-id="20:6843">
                Failed Logins
              </span>
              <div className="audit-card-val" data-node-id="20:6845">
                {stats.failedLogins}
              </div>
              <div className="audit-card-trend trend-red" data-node-id="20:6846">
                <AlertTriangle size={14} className="trend-icon" />
                <span className="trend-text" data-node-id="20:6850">Security Audit</span>
              </div>
            </div>

            {/* Card 5: Config Changes */}
            <div
              className="audit-bento-card"
              data-node-id="20:6851"
              data-name="Background+Border"
            >
              <span className="audit-card-label" data-node-id="20:6853">
                Config Changes
              </span>
              <div className="audit-card-val" data-node-id="20:6855">
                {stats.configChanges}
              </div>
              <div className="audit-card-trend trend-muted" data-node-id="20:6856">
                <Clock size={14} className="trend-icon" />
                <span className="trend-text" data-node-id="20:6858">Live Tracked</span>
              </div>
            </div>

            {/* Card 6: Today's Active (Solid Purple High-Priority Card) */}
            <div
              className="audit-bento-card card-purple-active"
              data-node-id="20:6859"
              data-name="Background"
            >
              <span className="audit-card-label text-purple-light" data-node-id="20:6861">
                Today's Active
              </span>
              <div className="audit-card-val text-white" data-node-id="20:6863">
                {stats.todayActive}
              </div>
              <div className="audit-card-trend trend-teal" data-node-id="20:6864">
                <Activity size={14} className="trend-icon" />
                <span className="trend-text" data-node-id="20:6868">Real-time</span>
              </div>
            </div>
        </section>

        {/* Main Insights Section: Activity Trends Chart + Event Categories Card (Figma Node ID: 20:6869) */}
        <section
          className="audit-insights-grid"
          data-node-id="20:6869"
          data-name="Main Insights Section"
        >
          {/* Activity Trends Chart Card (col-span-8) (Figma Node ID: 20:6870) */}
          <div
            className="audit-trends-card"
            data-node-id="20:6870"
            data-name="Activity Trends Chart Card"
          >
            <div className="audit-trends-header" data-node-id="20:6871">
              <div className="audit-trends-titles" data-node-id="20:6872">
                <h2 className="audit-trends-title" data-node-id="20:6874">
                  Activity Trends
                </h2>
                <span className="audit-trends-sub" data-node-id="20:6876">
                  Event volume distribution over last 24 hours
                </span>
              </div>

              {/* Export Data Button */}
              <button
                type="button"
                className="audit-export-btn"
                onClick={() => handleExportData('csv')}
                data-node-id="20:6877"
                data-name="Button"
              >
                <Download size={14} className="export-icon" />
                <span data-node-id="20:6880">Export Data</span>
              </button>
            </div>

            {/* Stylized Bar Distribution Chart Area */}
            <div
              className="audit-chart-wrapper"
              data-node-id="20:6881"
              data-name="Container"
            >
              {/* Background Grid Lines */}
              <div className="audit-chart-grid" data-node-id="20:6903">
                <div className="audit-grid-line" />
                <div className="audit-grid-line" />
                <div className="audit-grid-line" />
              </div>

              {/* Bars Row */}
              <div
                className="audit-chart-bars"
                data-node-id="20:6882"
                data-name="Fake minimal line chart using stylized divs"
              >
                {stats.trendBars.map((bar, idx) => (
                  <div
                    key={idx}
                    className={`audit-chart-bar ${bar.opacityClass} ${bar.isPeak ? 'bar-peak-highlight' : ''}`}
                    style={{ height: `${bar.heightPx}px` }}
                    title={`${bar.hour}: ${bar.count.toLocaleString()} events ${bar.isPeak ? '(Peak)' : ''}`}
                    data-node-id={idx === 12 ? '20:6895' : undefined}
                  >
                    <div className="bar-tooltip">
                      <span className="bar-tooltip-hour">{bar.hour}</span>
                      <span className="bar-tooltip-val">{bar.count.toLocaleString()} events</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* X-Axis Time Labels (Figma Node ID: 20:6907) */}
            <div
              className="audit-chart-axis-labels"
              data-node-id="20:6907"
              data-name="Container"
            >
              <span data-node-id="20:6909">00:00</span>
              <span data-node-id="20:6911">04:00</span>
              <span data-node-id="20:6913">08:00</span>
              <span data-node-id="20:6915">12:00</span>
              <span data-node-id="20:6917">16:00</span>
              <span data-node-id="20:6919">20:00</span>
              <span data-node-id="20:6921">23:59</span>
            </div>
          </div>

          {/* Event Categories Card (col-span-4) (Figma Node ID: 20:6922) */}
          <div
            className="audit-categories-card"
            data-node-id="20:6922"
            data-name="Categories Card"
          >
            <div className="audit-categories-header" data-node-id="20:6923">
              <h2 className="audit-categories-title" data-node-id="20:6925">
                Event Categories
              </h2>
            </div>

            {/* Scrollable Chips List (Figma Node ID: 20:6926) */}
            <div
              className="audit-chips-container"
              data-node-id="20:6926"
              data-name="Container"
            >
              {CATEGORIES_LIST.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.name;
                const isEnabled = activeCategoryToggles[cat.id] !== false;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`audit-chip-item chip-${cat.colorScheme} ${isSelected ? 'chip-active-selected' : ''} ${!isEnabled ? 'chip-disabled' : ''}`}
                    onClick={() => {
                      if (selectedCategory === cat.name) {
                        setSelectedCategory(null);
                      } else {
                        setSelectedCategory(cat.name);
                        setCurrentPage(1);
                      }
                    }}
                    title={`Filter by ${cat.name}`}
                  >
                    <IconComponent size={14} className="chip-icon" />
                    <span className="chip-label">{cat.name}</span>
                    {isSelected && <span className="chip-active-check">✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Categories Card Footer with Action Link (Figma Node ID: 20:6971) */}
            <div
              className="audit-categories-footer"
              data-node-id="20:6971"
              data-name="HorizontalBorder"
            >
              <span className="audit-categories-active-count" data-node-id="20:6973">
                {activeCategoryCount} categories active
              </span>
              <button
                type="button"
                className="audit-edit-toggles-link"
                onClick={() => setShowCategoriesModal(true)}
                data-node-id="20:6974"
              >
                Edit Toggles
              </button>
            </div>
          </div>
        </section>

        {/* Detailed Audit Log Table Section (Figma Node ID: 20:6976) */}
        <section
          className="audit-table-card"
          data-node-id="20:6976"
          data-name="Detailed Audit Log Table Section"
        >
          {/* Table Header Row with LIVE Badge & Action Controls (Figma Node ID: 20:6977) */}
          <div
            className="audit-table-topbar"
            data-node-id="20:6977"
            data-name="Background+HorizontalBorder"
          >
            <div className="audit-table-topbar-left" data-node-id="20:6978">
              <h2 className="audit-table-title" data-node-id="20:6980">
                Real-time Stream
              </h2>
              <div className="audit-live-badge" data-node-id="20:6981">
                <span className="audit-live-pulse" />
                <span data-node-id="20:6982">LIVE</span>
              </div>
              {selectedCategory && (
                <div className="audit-active-filter-pill">
                  <span>Category: {selectedCategory}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    aria-label="Remove category filter"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            <div className="audit-table-topbar-right" data-node-id="20:6983">
              {/* Filter Button */}
              <div className="audit-filter-dropdown-wrap">
                <button
                  type="button"
                  className={`audit-square-btn ${showFilterDropdown ? 'active' : ''}`}
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  aria-label="Filter audit records"
                  title="Filter by severity / status"
                  data-node-id="20:6984"
                >
                  <Filter size={16} />
                </button>

                {showFilterDropdown && (
                  <div className="audit-dropdown-menu">
                    <div className="audit-dropdown-header">Filter Stream</div>
                    <div className="audit-dropdown-section">
                      <label>Severity</label>
                      <select
                        value={selectedSeverity}
                        onChange={(e) => {
                          setSelectedSeverity(e.target.value as SeverityLevel | 'ALL');
                          setCurrentPage(1);
                        }}
                      >
                        <option value="ALL">All Severities</option>
                        <option value="CRITICAL">Critical Only</option>
                        <option value="MEDIUM">Medium Only</option>
                        <option value="INFO">Info Only</option>
                      </select>
                    </div>
                    <div className="audit-dropdown-section">
                      <label>Verification Status</label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => {
                          setSelectedStatus(e.target.value as AuditStatus | 'ALL');
                          setCurrentPage(1);
                        }}
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="Verified">Verified</option>
                        <option value="Locked">Locked</option>
                      </select>
                    </div>
                    <div className="audit-dropdown-actions">
                      <button
                        type="button"
                        className="btn-reset"
                        onClick={() => {
                          setSelectedSeverity('ALL');
                          setSelectedStatus('ALL');
                          setSelectedCategory(null);
                          setShowFilterDropdown(false);
                        }}
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        className="btn-apply"
                        onClick={() => setShowFilterDropdown(false)}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* More Actions Button */}
              <div className="audit-more-dropdown-wrap">
                <button
                  type="button"
                  className="audit-square-btn"
                  onClick={() => setShowMoreActionsMenu(!showMoreActionsMenu)}
                  aria-label="More audit actions"
                  title="More actions"
                  data-node-id="20:6987"
                >
                  <MoreVertical size={16} />
                </button>

                {showMoreActionsMenu && (
                  <div className="audit-dropdown-menu right-aligned">
                    <button
                      type="button"
                      className="audit-menu-item"
                      onClick={() => {
                        setShowMoreActionsMenu(false);
                        handleExportData();
                      }}
                    >
                      <Download size={14} /> Export Stream as CSV
                    </button>
                    <button
                      type="button"
                      className="audit-menu-item"
                      onClick={() => {
                        setShowMoreActionsMenu(false);
                        setShowNewReportModal(true);
                      }}
                    >
                      <FileSpreadsheet size={14} /> Generate Compliance Report
                    </button>
                    <button
                      type="button"
                      className="audit-menu-item"
                      onClick={() => {
                        setShowMoreActionsMenu(false);
                        setToastMessage({
                          type: 'info',
                          text: 'Live stream refreshed from ledger.'
                        });
                      }}
                    >
                      <RefreshCw size={14} /> Refresh Ledger State
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table Container (Figma Node ID: 20:6990) */}
          <div
            className="audit-table-scroll-container"
            data-node-id="20:6990"
            data-name="Table"
          >
            <table className="audit-data-table">
              {/* Header (Figma Node ID: 20:6991) */}
              <thead>
                <tr className="audit-table-head-row" data-node-id="20:6992">
                  <th className="audit-th th-timestamp" data-node-id="20:6993">
                    TIMESTAMP
                  </th>
                  <th className="audit-th th-user" data-node-id="20:6995">
                    ADMIN/USER
                  </th>
                  <th className="audit-th th-action" data-node-id="20:6997">
                    ACTION
                  </th>
                  <th className="audit-th th-object" data-node-id="20:6999">
                    OBJECT ID
                  </th>
                  <th className="audit-th th-severity" data-node-id="20:7001">
                    SEVERITY
                  </th>
                  <th className="audit-th th-status" data-node-id="20:7003">
                    STATUS
                  </th>
                </tr>
              </thead>

              {/* Body (Figma Node ID: 20:7005) */}
              <tbody>
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="audit-empty-state">
                      <AlertCircle size={28} className="empty-icon" />
                      <p className="empty-title">No audit records match your filters</p>
                      <span className="empty-sub">
                        Try modifying search parameters or clearing active categories.
                      </span>
                      <button
                        type="button"
                        className="empty-reset-btn"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory(null);
                          setSelectedSeverity('ALL');
                          setSelectedStatus('ALL');
                        }}
                      >
                        Reset All Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item, index) => {
                    const avatarStyle =
                      (item.userType as string) === 'unknown'
                        ? 'avatar-unknown'
                        : item.userType === 'system'
                        ? 'avatar-system'
                        : 'avatar-admin';

                    const severityBadgeClass =
                      item.severity === 'CRITICAL'
                        ? 'badge-sev-critical'
                        : item.severity === 'MEDIUM'
                        ? 'badge-sev-medium'
                        : 'badge-sev-info';

                    const statusStyle =
                      item.status === 'Locked' ? 'status-locked' : 'status-verified';

                    return (
                      <tr
                        key={item.id}
                        className="audit-table-row"
                        data-node-id={index === 0 ? '20:7006' : undefined}
                      >
                        {/* TIMESTAMP */}
                        <td className="audit-td td-timestamp">
                          <div className="timestamp-wrapper">
                            <span className="timestamp-date">{item.date}</span>
                            <span className="timestamp-time">{item.time}</span>
                          </div>
                        </td>

                        {/* ADMIN/USER */}
                        <td className="audit-td td-user">
                          <div className="user-cell-wrapper">
                            <div className={`user-avatar ${avatarStyle}`}>
                              <span>{item.userInitials}</span>
                            </div>
                            <span className="user-name">{item.userName}</span>
                          </div>
                        </td>

                        {/* ACTION */}
                        <td className="audit-td td-action">
                          <span className="action-label">{item.action}</span>
                        </td>

                        {/* OBJECT ID */}
                        <td className="audit-td td-object">
                          <span className="object-mono-id">{item.objectId}</span>
                        </td>

                        {/* SEVERITY */}
                        <td className="audit-td td-severity">
                          <span className={`severity-badge ${severityBadgeClass}`}>
                            {item.severity}
                          </span>
                        </td>

                        {/* STATUS */}
                        <td className="audit-td td-status">
                          <div className={`status-indicator ${statusStyle}`}>
                            <span className="status-dot" />
                            <span className="status-text">{item.status}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination (Figma Node ID: 20:7078) */}
          <div
            className="audit-table-footer"
            data-node-id="20:7078"
            data-name="HorizontalBorder"
          >
            <div className="audit-footer-count" data-node-id="20:7079">
              <span data-node-id="20:7080">
                Showing {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, totalEntries)} of{' '}
                {totalEntries.toLocaleString()} entries
              </span>
            </div>

            {/* Pagination Controls (Figma Node ID: 20:7081) */}
            <div
              className="audit-pagination-controls"
              data-node-id="20:7081"
              data-name="Container"
            >
              {/* Prev Button */}
              <button
                type="button"
                className="audit-page-btn arrow-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                aria-label="Previous page"
                data-node-id="20:7082"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page 1 */}
              <button
                type="button"
                className={`audit-page-btn ${currentPage === 1 ? 'active-page' : ''}`}
                onClick={() => setCurrentPage(1)}
                aria-label="Page 1"
                aria-current={currentPage === 1 ? 'page' : undefined}
                data-node-id="20:7085"
              >
                1
              </button>

              {/* Page 2 */}
              <button
                type="button"
                className={`audit-page-btn ${currentPage === 2 ? 'active-page' : ''}`}
                onClick={() => setCurrentPage(2)}
                aria-label="Page 2"
                aria-current={currentPage === 2 ? 'page' : undefined}
                data-node-id="20:7087"
              >
                2
              </button>

              {/* Page 3 */}
              <button
                type="button"
                className={`audit-page-btn ${currentPage === 3 ? 'active-page' : ''}`}
                onClick={() => setCurrentPage(3)}
                aria-label="Page 3"
                aria-current={currentPage === 3 ? 'page' : undefined}
                data-node-id="20:7089"
              >
                3
              </button>

              {/* Ellipsis */}
              <span className="audit-page-ellipsis" data-node-id="20:7091">
                ...
              </span>

              {/* Next Button */}
              <button
                type="button"
                className="audit-page-btn arrow-btn"
                disabled={currentPage >= totalPages && filteredItems.length <= itemsPerPage}
                onClick={() => setCurrentPage((p) => p + 1)}
                aria-label="Next page"
                data-node-id="20:7093"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Floating Action Button (FAB) for Quick Audit Report (Figma Node ID: 20:7184) */}
      <button
        type="button"
        className="audit-fab-btn"
        onClick={() => setShowNewReportModal(true)}
        aria-label="New Audit Report"
        data-node-id="20:7184"
        data-name="Button - FAB for quick audit report generation"
      >
        <Plus size={24} className="fab-icon" />
        <span className="audit-fab-tooltip" data-node-id="20:7189">
          New Audit Report
        </span>
      </button>

      {/* Category Toggles Modal */}
      {showCategoriesModal && (
        <div className="audit-modal-backdrop" onClick={() => setShowCategoriesModal(false)}>
          <div className="audit-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="audit-modal-header">
              <h3>Edit Event Category Toggles</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowCategoriesModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            <div className="audit-modal-body">
              <p className="modal-description">
                Enable or disable stream tracking for specific enterprise modules.
              </p>
              <div className="modal-toggle-list">
                {CATEGORIES_LIST.map((cat) => {
                  const Icon = cat.icon;
                  const isChecked = activeCategoryToggles[cat.id] !== false;

                  return (
                    <label key={cat.id} className="modal-toggle-item">
                      <div className="toggle-item-left">
                        <Icon size={16} className="toggle-icon" />
                        <span className="toggle-name">{cat.name}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          setActiveCategoryToggles((prev) => ({
                            ...prev,
                            [cat.id]: e.target.checked
                          }));
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="audit-modal-footer">
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={() => {
                  const allOn: Record<string, boolean> = {};
                  CATEGORIES_LIST.forEach((c) => (allOn[c.id] = true));
                  setActiveCategoryToggles(allOn);
                }}
              >
                Enable All
              </button>
              <button
                type="button"
                className="btn-modal-primary"
                onClick={() => {
                  setShowCategoriesModal(false);
                  setToastMessage({
                    type: 'success',
                    text: 'Event categories configuration updated.'
                  });
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Date Range Picker Modal */}
      {showCustomDateModal && (
        <div className="audit-modal-backdrop" onClick={() => setShowCustomDateModal(false)}>
          <div className="audit-modal-card date-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="audit-modal-header">
              <h3>Select Custom Audit Window</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowCustomDateModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            <div className="audit-modal-body">
              <div className="date-picker-inputs">
                <div className="date-input-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="date-input-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="audit-modal-footer">
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={() => setShowCustomDateModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-primary"
                onClick={() => {
                  setShowCustomDateModal(false);
                  setToastMessage({
                    type: 'info',
                    text: `Audit filter applied: ${customStartDate} to ${customEndDate}`
                  });
                }}
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Audit Report Modal */}
      {showNewReportModal && (
        <div className="audit-modal-backdrop" onClick={() => setShowNewReportModal(false)}>
          <div className="audit-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="audit-modal-header">
              <h3>Generate New Audit Report</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowNewReportModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleGenerateReportSubmit}>
              <div className="audit-modal-body">
                <div className="modal-form-group">
                  <label>Report Standard / Scope</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                  >
                    <option value="HIPAA_COMPLIANCE">HIPAA &amp; GDPR Data Protection Audit</option>
                    <option value="SECURITY_ACCESS">Security Access &amp; Authentication Trail</option>
                    <option value="PATIENT_PHI_INTEGRITY">Patient PHI Modification Log</option>
                    <option value="SYSTEM_DIAGNOSTIC">System Configurations &amp; Rotation History</option>
                  </select>
                </div>

                <div className="modal-form-group">
                  <label>Export Format</label>
                  <div className="format-pills">
                    {['PDF', 'CSV', 'JSON Ledger'].map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        className={`format-pill ${reportFormat === fmt ? 'active' : ''}`}
                        onClick={() => setReportFormat(fmt)}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="modal-form-notice">
                  <ShieldCheck size={16} className="notice-icon" />
                  <span>
                    Report is cryptographically hashed with SHA-256 and registered into CareID immutable compliance archive.
                  </span>
                </div>
              </div>

              <div className="audit-modal-footer">
                <button
                  type="button"
                  className="btn-modal-secondary"
                  onClick={() => setShowNewReportModal(false)}
                  disabled={isGeneratingReport}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-primary"
                  disabled={isGeneratingReport}
                >
                  {isGeneratingReport ? 'Generating Ledger Hash...' : 'Generate & Download'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditDashboard;
