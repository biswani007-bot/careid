import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  HelpCircle,
  Menu,
  Megaphone,
  Mail,
  Calendar,
  AlertCircle,
  Server,
  Scan,
  ArrowRightLeft,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Archive,
  Check,
  CheckCircle2,
  X,
  AlertTriangle,
  Info,
  RotateCcw,
  RefreshCw,
  LifeBuoy,
  MessageSquare,
  PlusCircle,
  Send,
  Clock
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import notificationService, {
  type BackendNotification,
  type NotificationPlatformStats,
  type SupportTicket,
  type SupportReply
} from '../../services/notificationService';
import './AdminNotificationDashboard.css';

// ============================================================================
// Types & Data Structures
// ============================================================================
export type NotificationSeverity = 'critical' | 'warning' | 'information' | 'success';
export type NotificationModule = 'OCR' | 'REFERRAL' | 'SYSTEM' | 'RECORD' | 'AUDIT';
export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface AdminNotification {
  id: string; // Authentic Backend UUID
  displayCode: string; // e.g. "NTF-D4D978" for UI presentation
  module: NotificationModule;
  subModule?: string;
  severity: NotificationSeverity;
  status: NotificationStatus;
  title: string;
  description: string;
  time: string;
  timestamp: string;
  targetPath?: string;
  auditSignature?: string;
  rawNotification: BackendNotification;
}

function formatTimeAgo(dateStr: string): string {
  try {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  } catch {
    return 'Recently';
  }
}

export interface AdminNotificationDashboardProps {
  initialTab?: 'notifications' | 'support';
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminNotificationDashboard: React.FC<AdminNotificationDashboardProps> = ({
  initialTab,
  onNavigate,
  onLogout
}) => {
  const location = useLocation();
  const routerNavigate = useNavigate();

  // Active module view: 'notifications' | 'support'
  const [activeModuleTab, setActiveModuleTab] = useState<'notifications' | 'support'>(() => {
    if (initialTab) return initialTab;
    if (location.pathname.includes('/admin/support')) return 'support';
    return 'notifications';
  });

  // Mobile drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');

  // Active filter state for Notifications
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'unread' | 'read' | 'archived' | 'critical' | 'warning' | 'information' | 'success' | 'system' | 'ocr' | 'referral'
  >('all');

  // Active filter state for Support Tickets
  const [activeTicketFilter, setActiveTicketFilter] = useState<
    'all' | 'open' | 'in_progress' | 'resolved' | 'closed' | 'technical' | 'billing' | 'clinical'
  >('all');

  // Live Backend Data States
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [stats, setStats] = useState<NotificationPlatformStats | null>(null);
  const [liveUnreadCount, setLiveUnreadCount] = useState<number | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTicketsLoading, setIsTicketsLoading] = useState(false);

  // Selected notification for Detail Modal
  const [selectedNotification, setSelectedNotification] = useState<AdminNotification | null>(null);

  // Selected ticket for Detail & Reply Modal
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketReplies, setTicketReplies] = useState<SupportReply[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isUpdatingTicketStatus, setIsUpdatingTicketStatus] = useState(false);

  // Announcement Dialog state
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [isPublishingAnnouncement, setIsPublishingAnnouncement] = useState(false);

  // Create Support Ticket Dialog state
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketDescription, setNewTicketDescription] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState<'TECHNICAL' | 'BILLING' | 'ACCOUNT' | 'CLINICAL' | 'GENERAL'>('TECHNICAL');
  const [newTicketPriority, setNewTicketPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentTicketPage, setCurrentTicketPage] = useState<number>(1);
  const itemsPerPage = 4; // matching the 4 visible rows in Figma frame

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      routerNavigate(path);
    }
  };

  // Map Backend Notification to AdminNotification UI Type
  const mapBackendNotification = useCallback((item: BackendNotification): AdminNotification => {
    const rawType = (item.notificationType || 'SYSTEM').toUpperCase();
    let module: NotificationModule = 'SYSTEM';
    let targetPath = '/admin/security-compliance';

    if (rawType.includes('OCR')) {
      module = 'OCR';
      targetPath = '/admin/ocr/queue';
    } else if (rawType.includes('REFERRAL')) {
      module = 'REFERRAL';
      targetPath = '/admin/referrals';
    } else if (rawType.includes('RECORD') || rawType.includes('PATIENT')) {
      module = 'RECORD';
      targetPath = '/admin/patients';
    } else if (rawType.includes('AUDIT')) {
      module = 'AUDIT';
      targetPath = '/admin/security-compliance';
    } else {
      module = 'SYSTEM';
      targetPath = '/admin/security-compliance';
    }

    const rawPriority = (item.priority || 'NORMAL').toUpperCase();
    let severity: NotificationSeverity = 'information';
    if (rawPriority === 'CRITICAL' || rawPriority === 'URGENT') {
      severity = 'critical';
    } else if (rawPriority === 'HIGH') {
      severity = 'warning';
    } else if (rawPriority === 'LOW') {
      severity = 'success';
    }

    const status: NotificationStatus =
      item.status === 'ARCHIVED'
        ? 'archived'
        : item.status === 'READ' || !!item.readAt
        ? 'read'
        : 'unread';

    return {
      id: item.id, // Genuine backend UUID
      displayCode: `NTF-${item.id.slice(0, 6).toUpperCase()}`,
      module,
      subModule: rawType !== module ? rawType : undefined,
      severity,
      status,
      title: item.title,
      description: item.message,
      time: formatTimeAgo(item.createdAt),
      timestamp: item.createdAt,
      targetPath,
      auditSignature: `sha256-${item.id.replace(/-/g, '')}`,
      rawNotification: item
    };
  }, []);

  // Fetch Live Notifications & Stats
  const loadNotificationsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, unreadRes, notifsRes] = await Promise.all([
        notificationService.getDashboardStats().catch(() => ({ success: false, data: null })),
        notificationService.getUnreadCount().catch(() => ({ success: false, data: null })),
        notificationService.getNotifications({ limit: 100 }).catch(() => ({ success: false, data: [] }))
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      if (unreadRes.success && unreadRes.data && typeof unreadRes.data.unreadCount === 'number') {
        setLiveUnreadCount(unreadRes.data.unreadCount);
      }

      if (notifsRes.success && Array.isArray(notifsRes.data)) {
        const mapped = notifsRes.data.map(mapBackendNotification);
        setNotifications(mapped);
      }
    } catch {
      showToast('Unable to load live notifications from backend.');
    } finally {
      setIsLoading(false);
    }
  }, [mapBackendNotification]);

  // Fetch Live Support Tickets
  const loadTicketsData = useCallback(async () => {
    setIsTicketsLoading(true);
    try {
      const res = await notificationService.getSupportTickets({ limit: 100 });
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        setTickets(list);
      }
    } catch {
      showToast('Unable to load support tickets from backend.');
    } finally {
      setIsTicketsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotificationsData();
    loadTicketsData();
  }, [loadNotificationsData, loadTicketsData]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    setCurrentTicketPage(1);
  }, [activeTicketFilter, searchQuery]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.module.toLowerCase().includes(q) ||
          item.displayCode.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Active Filter
      if (activeFilter === 'unread') return item.status === 'unread';
      if (activeFilter === 'read') return item.status === 'read';
      if (activeFilter === 'archived') return item.status === 'archived';
      if (activeFilter === 'critical') return item.severity === 'critical';
      if (activeFilter === 'warning') return item.severity === 'warning';
      if (activeFilter === 'information') return item.severity === 'information';
      if (activeFilter === 'success') return item.severity === 'success';
      if (activeFilter === 'system') return item.module === 'SYSTEM';
      if (activeFilter === 'ocr') return item.module === 'OCR';
      if (activeFilter === 'referral') return item.module === 'REFERRAL';

      return true;
    });
  }, [notifications, searchQuery, activeFilter]);

  // Paginated notifications
  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / itemsPerPage));
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredNotifications.slice(start, start + itemsPerPage);
  }, [filteredNotifications, currentPage, itemsPerPage]);

  // Filtered support tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          t.ticketNumber?.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q);
        if (!matches) return false;
      }

      const status = (t.status || 'OPEN').toUpperCase();
      const cat = (t.category || '').toUpperCase();

      if (activeTicketFilter === 'open') return status === 'OPEN';
      if (activeTicketFilter === 'in_progress') return status === 'IN_PROGRESS';
      if (activeTicketFilter === 'resolved') return status === 'RESOLVED';
      if (activeTicketFilter === 'closed') return status === 'CLOSED';
      if (activeTicketFilter === 'technical') return cat === 'TECHNICAL';
      if (activeTicketFilter === 'billing') return cat === 'BILLING';
      if (activeTicketFilter === 'clinical') return cat === 'CLINICAL';

      return true;
    });
  }, [tickets, searchQuery, activeTicketFilter]);

  const totalTicketPages = Math.max(1, Math.ceil(filteredTickets.length / itemsPerPage));
  const paginatedTickets = useMemo(() => {
    const start = (currentTicketPage - 1) * itemsPerPage;
    return filteredTickets.slice(start, start + itemsPerPage);
  }, [filteredTickets, currentTicketPage, itemsPerPage]);

  // Notification Actions
  const handleToggleReadStatus = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await notificationService.markAsRead(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: 'read' } : item))
        );
        showToast('Notification marked as read in live database.');
        loadNotificationsData();
      } else {
        showToast(res.error || 'Failed to update notification status.');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating status.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await notificationService.markAllAsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((item) => ({ ...item, status: 'read' })));
        setLiveUnreadCount(0);
        showToast('All notifications marked as read in live database.');
        loadNotificationsData();
      } else {
        showToast(res.error || 'Failed to mark all notifications as read.');
      }
    } catch (err: any) {
      showToast(err.message || 'Error marking all as read.');
    }
  };

  const handleArchiveNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await notificationService.deleteNotification(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: 'archived' } : item))
        );
        showToast('Notification soft-deleted / archived in live database.');
        loadNotificationsData();
      } else {
        showToast(res.error || 'Failed to archive notification.');
      }
    } catch (err: any) {
      showToast(err.message || 'Error archiving notification.');
    }
  };

  const handleOpenDetail = async (item: AdminNotification) => {
    setSelectedNotification(item);
    // Refresh authoritative details from backend
    try {
      const res = await notificationService.getNotificationById(item.id);
      if (res.success && res.data) {
        setSelectedNotification(mapBackendNotification(res.data));
      }
    } catch {
      // Keep existing mapped item
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementText.trim()) return;
    setIsPublishingAnnouncement(true);
    try {
      const title = announcementTitle.trim() || 'CareID System Broadcast';
      const res = await notificationService.createAnnouncement({
        title,
        description: announcementText.trim(),
        priority: announcementPriority,
        status: 'PUBLISHED'
      });

      if (res.success && res.data) {
        showToast(`Announcement published to live backend: "${title}"`);
        setIsAnnouncementModalOpen(false);
        setAnnouncementTitle('');
        setAnnouncementText('');
        loadNotificationsData();
      } else {
        showToast(res.error || 'Failed to publish announcement.');
      }
    } catch (err: any) {
      showToast(err.message || 'Error creating announcement.');
    } finally {
      setIsPublishingAnnouncement(false);
    }
  };

  // Support Ticket Actions
  const handleOpenTicketDetail = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    try {
      const [ticketRes, repliesRes] = await Promise.all([
        notificationService.getSupportTicketById(ticket.id),
        notificationService.getSupportTicketReplies(ticket.id)
      ]);
      if (ticketRes.success && ticketRes.data) {
        setSelectedTicket(ticketRes.data);
      }
      if (repliesRes.success && Array.isArray(repliesRes.data)) {
        setTicketReplies(repliesRes.data);
      } else if (ticket.replies) {
        setTicketReplies(ticket.replies);
      }
    } catch {
      if (ticket.replies) setTicketReplies(ticket.replies);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    setIsSendingReply(true);
    try {
      const res = await notificationService.replySupportTicket(selectedTicket.id, replyMessage.trim());
      if (res.success && res.data) {
        setTicketReplies((prev) => [...prev, res.data!]);
        setReplyMessage('');
        showToast('Reply dispatched and recorded in live database.');
        loadTicketsData();
      } else {
        showToast(res.error || 'Failed to send reply.');
      }
    } catch (err: any) {
      showToast(err.message || 'Error posting reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleUpdateTicketStatus = async (newStatus: string) => {
    if (!selectedTicket) return;
    setIsUpdatingTicketStatus(true);
    try {
      const res = await notificationService.updateSupportTicket(selectedTicket.id, {
        status: newStatus
      });
      if (res.success && res.data) {
        setSelectedTicket(res.data);
        setTickets((prev) => prev.map((t) => (t.id === selectedTicket.id ? res.data! : t)));
        showToast(`Ticket status updated to ${newStatus}.`);
      } else {
        showToast(res.error || 'Failed to update ticket status.');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating status.');
    } finally {
      setIsUpdatingTicketStatus(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicketSubject.trim() || !newTicketDescription.trim()) return;
    setIsSubmittingTicket(true);
    try {
      const res = await notificationService.createSupportTicket({
        subject: newTicketSubject.trim(),
        description: newTicketDescription.trim(),
        category: newTicketCategory,
        priority: newTicketPriority
      });
      if (res.success && res.data) {
        showToast(`Support ticket ${res.data.ticketNumber || 'created'} successfully!`);
        setIsCreateTicketModalOpen(false);
        setNewTicketSubject('');
        setNewTicketDescription('');
        loadTicketsData();
      } else {
        showToast(res.error || 'Failed to create support ticket.');
      }
    } catch (err: any) {
      showToast(err.message || 'Error creating ticket.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Bento Card Counts for Notifications
  const unreadCount =
    liveUnreadCount !== null
      ? liveUnreadCount
      : notifications.filter((n) => n.status === 'unread').length;
  const totalCount = stats?.totalNotifications ?? notifications.length;
  const criticalCount = notifications.filter((n) => n.severity === 'critical').length;
  const systemCount = notifications.filter((n) => n.module === 'SYSTEM').length;
  const ocrCount = notifications.filter((n) => n.module === 'OCR').length;
  const referralCount = notifications.filter((n) => n.module === 'REFERRAL').length;

  // Bento Card Counts for Support Tickets
  const totalTicketsCount = tickets.length;
  const openTicketsCount = tickets.filter((t) => (t.status || 'OPEN').toUpperCase() === 'OPEN').length;
  const inProgressTicketsCount = tickets.filter((t) => (t.status || '').toUpperCase() === 'IN_PROGRESS').length;
  const resolvedTicketsCount = tickets.filter(
    (t) => (t.status || '').toUpperCase() === 'RESOLVED' || (t.status || '').toUpperCase() === 'CLOSED'
  ).length;

  return (
    <div
      className="notification-dashboard-wrapper"
      data-node-id="20:9051"
      data-name="Admin Portal - Notification Management Dashboard"
    >
      {/* 280px Fixed Sidebar - Desktop permanently fixed; Drawer on mobile/tablet */}
      <AdminSidebar
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onLogout={onLogout}
        onNavigate={handleNav}
        activeNav="support"
      />

      {/* Main Content Area - Desktop offset by 280px margin-left */}
      <div className="notification-dashboard-main" data-node-id="20:9052">
        {/* ==============================================================
            1. Stationary Top Global Navigation Bar (64px, Node 20:9264)
            ============================================================== */}
        <header
          className="notification-top-navbar"
          data-node-id="20:9264"
          data-name="Header - Top Navigation Bar"
        >
          <div className="notification-top-left" data-node-id="20:9265">
            <button
              type="button"
              className="notification-mobile-menu-btn"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open sidebar menu"
            >
              <Menu size={20} />
            </button>

            {/* Search Input Box */}
            <div className="notification-search-box" data-node-id="20:9266">
              <Search size={18} className="notification-search-icon" data-node-id="20:9267" />
              <input
                type="text"
                className="notification-search-input"
                placeholder={
                  activeModuleTab === 'notifications'
                    ? 'Search enterprise notifications & alerts...'
                    : 'Search support tickets & issues...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search notifications and records"
                data-node-id="20:9270"
              />
            </div>
          </div>

          <div className="notification-top-right" data-node-id="20:9273">
            {/* Refresh Button */}
            <button
              type="button"
              className="notification-top-icon-btn"
              onClick={() => {
                loadNotificationsData();
                loadTicketsData();
              }}
              title="Refresh Live Data"
              aria-label="Refresh live data"
            >
              <RefreshCw size={18} className={isLoading || isTicketsLoading ? 'animate-spin' : ''} />
            </button>

            {/* Help Docs / Support switcher */}
            <button
              type="button"
              className={`notification-top-icon-btn ${activeModuleTab === 'support' ? 'bg-[#e8ddff] text-[#28006d]' : ''}`}
              onClick={() => setActiveModuleTab('support')}
              title="Support & Helpdesk"
              aria-label="Help & Documentation"
              data-node-id="20:9274"
            >
              <HelpCircle size={19} />
            </button>

            {/* Notification Bell */}
            <button
              type="button"
              className={`notification-top-icon-btn ${activeModuleTab === 'notifications' ? 'bg-[#e8ddff] text-[#28006d]' : ''}`}
              onClick={() => setActiveModuleTab('notifications')}
              title="Enterprise Notifications"
              aria-label="Notifications"
              data-node-id="20:9277"
            >
              <Bell size={19} />
            </button>

            {/* Admin Portal Profile Pill */}
            <button
              type="button"
              className="notification-profile-btn"
              onClick={() => handleNav('/admin/profile')}
              aria-label="My Profile & Information"
              title="My Profile & Information"
              data-node-id="20:9281"
            >
              <span data-node-id="20:9283">Admin Portal</span>
              <AdminProfileAvatar size={20} />
            </button>
          </div>
        </header>

        {/* ==============================================================
            2. Main - Scrollable Canvas (Node 20:9053)
            ============================================================== */}
        <main
          className="notification-scroll-canvas"
          data-node-id="20:9053"
          data-name="Main - Scrollable Canvas"
        >
          <div className="notification-content-container">
            {/* Header Section: Breadcrumbs + Title + Tab Switcher + Action Button */}
            <div
              className="notification-header-row"
              data-node-id="20:9054"
              data-name="Header Section"
            >
              <div className="notification-header-left" data-node-id="20:9055">
                <nav
                  className="notification-breadcrumbs"
                  aria-label="Breadcrumb navigation"
                  data-node-id="20:9056"
                >
                  <button
                    type="button"
                    className="notification-breadcrumb-link"
                    onClick={() => setActiveModuleTab('support')}
                    data-node-id="20:9058"
                  >
                    Support
                  </button>
                  <ChevronRight size={13} className="notification-breadcrumb-sep" data-node-id="20:9060" />
                  <span className="notification-breadcrumb-current" data-node-id="20:9062">
                    {activeModuleTab === 'notifications' ? 'Notifications' : 'Helpdesk Tickets'}
                  </span>
                </nav>

                <h1 className="notification-page-title" data-node-id="20:9064">
                  {activeModuleTab === 'notifications' ? 'Notification Dashboard' : 'Support Tickets & Helpdesk'}
                </h1>

                {/* View Switcher Pills */}
                <div className="module-tab-switcher">
                  <button
                    type="button"
                    className={`module-tab-btn ${activeModuleTab === 'notifications' ? 'active' : ''}`}
                    onClick={() => setActiveModuleTab('notifications')}
                  >
                    <Bell size={14} />
                    <span>System Notifications</span>
                  </button>
                  <button
                    type="button"
                    className={`module-tab-btn ${activeModuleTab === 'support' ? 'active' : ''}`}
                    onClick={() => setActiveModuleTab('support')}
                  >
                    <LifeBuoy size={14} />
                    <span>Support Tickets</span>
                  </button>
                </div>
              </div>

              {/* Action Button: Create Announcement OR Create Ticket */}
              {activeModuleTab === 'notifications' ? (
                <button
                  type="button"
                  className="btn-create-announcement"
                  onClick={() => setIsAnnouncementModalOpen(true)}
                  data-node-id="20:9065"
                >
                  <Megaphone size={16} data-node-id="20:9068" />
                  <span data-node-id="20:9069">Create Announcement</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-create-announcement"
                  onClick={() => setIsCreateTicketModalOpen(true)}
                >
                  <PlusCircle size={16} />
                  <span>Create Support Ticket</span>
                </button>
              )}
            </div>

            {/* ==========================================================
                VIEW 1: NOTIFICATIONS DASHBOARD
                ========================================================== */}
            {activeModuleTab === 'notifications' && (
              <>
                {/* 3. Summary Cards: Bento Grid (6 Cards, Node 20:9070) */}
                <div
                  className="notification-bento-grid"
                  data-node-id="20:9070"
                  data-name="Summary Cards: Bento Grid"
                >
                  {/* Card 1: UNREAD (Node 20:9071) */}
                  <div
                    className={`bento-card unread ${activeFilter === 'unread' ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'unread' ? 'all' : 'unread')}
                    data-node-id="20:9071"
                    data-name="Unread"
                  >
                    <span className="bento-card-label" data-node-id="20:9073">UNREAD</span>
                    <div className="bento-card-bottom" data-node-id="20:9075">
                      <span className="bento-card-value" data-node-id="20:9076">{unreadCount}</span>
                      <Mail size={16} className="bento-card-icon" data-node-id="20:9077" />
                    </div>
                  </div>

                  {/* Card 2: TODAY / TOTAL (Node 20:9078) */}
                  <div
                    className={`bento-card ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                    data-node-id="20:9078"
                    data-name="Today"
                  >
                    <span className="bento-card-label" data-node-id="20:9080">TOTAL NOTIFICATIONS</span>
                    <div className="bento-card-bottom" data-node-id="20:9082">
                      <span className="bento-card-value" data-node-id="20:9083">{totalCount}</span>
                      <Calendar size={16} className="bento-card-icon text-[#191c1e]" data-node-id="20:9084" />
                    </div>
                  </div>

                  {/* Card 3: CRITICAL (Node 20:9085) */}
                  <div
                    className={`bento-card critical ${activeFilter === 'critical' ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'critical' ? 'all' : 'critical')}
                    data-node-id="20:9085"
                    data-name="Critical"
                  >
                    <span className="bento-card-label" data-node-id="20:9087">CRITICAL</span>
                    <div className="bento-card-bottom" data-node-id="20:9089">
                      <span className="bento-card-value" data-node-id="20:9090">{criticalCount}</span>
                      <AlertCircle size={16} className="bento-card-icon" data-node-id="20:9091" />
                    </div>
                  </div>

                  {/* Card 4: SYSTEM (Node 20:9092) */}
                  <div
                    className={`bento-card ${activeFilter === 'system' ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'system' ? 'all' : 'system')}
                    data-node-id="20:9092"
                    data-name="System"
                  >
                    <span className="bento-card-label" data-node-id="20:9094">SYSTEM ALERTS</span>
                    <div className="bento-card-bottom" data-node-id="20:9096">
                      <span className="bento-card-value" data-node-id="20:9097">{systemCount}</span>
                      <Server size={16} className="bento-card-icon text-[#191c1e]" data-node-id="20:9098" />
                    </div>
                  </div>

                  {/* Card 5: OCR ALERTS (Node 20:9099) */}
                  <div
                    className={`bento-card ${activeFilter === 'ocr' ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'ocr' ? 'all' : 'ocr')}
                    data-node-id="20:9099"
                    data-name="OCR"
                  >
                    <span className="bento-card-label" data-node-id="20:90101">OCR ALERTS</span>
                    <div className="bento-card-bottom" data-node-id="20:9103">
                      <span className="bento-card-value" data-node-id="20:9104">{ocrCount}</span>
                      <Scan size={16} className="bento-card-icon text-[#191c1e]" data-node-id="20:9105" />
                    </div>
                  </div>

                  {/* Card 6: REFERRALS (Node 20:9106) */}
                  <div
                    className={`bento-card referrals ${activeFilter === 'referral' ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'referral' ? 'all' : 'referral')}
                    data-node-id="20:9106"
                    data-name="Referral"
                  >
                    <span className="bento-card-label" data-node-id="20:9108">REFERRALS</span>
                    <div className="bento-card-bottom" data-node-id="20:9110">
                      <span className="bento-card-value" data-node-id="20:9111">{referralCount}</span>
                      <ArrowRightLeft size={16} className="bento-card-icon" data-node-id="20:9112" />
                    </div>
                  </div>
                </div>

                {/* 4. Filters Section (Node 20:9113) */}
                <div
                  className="notification-filters-row"
                  data-node-id="20:9113"
                  data-name="Filters Section"
                >
                  <span className="filters-label" data-node-id="20:9115">Quick Filter:</span>

                  {/* Mark All as Read Action if unread notifications exist */}
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="filter-pill"
                      onClick={handleMarkAllAsRead}
                      style={{ borderColor: '#006a60', color: '#006a60', fontWeight: 600 }}
                      title="Mark all notifications as read in live database"
                    >
                      <CheckCircle2 size={13} />
                      <span>Mark All as Read</span>
                    </button>
                  )}

                  {/* Unread Pill */}
                  <button
                    type="button"
                    className={`filter-pill ${activeFilter === 'unread' ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'unread' ? 'all' : 'unread')}
                    data-node-id="20:9116"
                  >
                    <span data-node-id="20:9117">Unread</span>
                    {activeFilter === 'unread' && <Check size={13} data-node-id="20:9119" />}
                  </button>

                  {/* Read Pill */}
                  <button
                    type="button"
                    className={`filter-pill ${activeFilter === 'read' ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'read' ? 'all' : 'read')}
                    data-node-id="20:9120"
                  >
                    <span data-node-id="20:9121">Read</span>
                    {activeFilter === 'read' && <Check size={13} />}
                  </button>

                  {/* Archived Pill */}
                  <button
                    type="button"
                    className={`filter-pill ${activeFilter === 'archived' ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'archived' ? 'all' : 'archived')}
                    data-node-id="20:9122"
                  >
                    <span data-node-id="20:9123">Archived</span>
                    {activeFilter === 'archived' && <Check size={13} />}
                  </button>

                  {/* Vertical Divider */}
                  <div className="filter-divider" data-node-id="20:9125" />

                  {/* Critical Pill */}
                  <button
                    type="button"
                    className={`filter-pill critical-pill ${activeFilter === 'critical' ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'critical' ? 'all' : 'critical')}
                    data-node-id="20:9126"
                  >
                    <span data-node-id="20:9127">Critical</span>
                    <span className="filter-dot-red" data-node-id="20:9128" />
                  </button>

                  {/* Warning Pill */}
                  <button
                    type="button"
                    className={`filter-pill warning-pill ${activeFilter === 'warning' ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'warning' ? 'all' : 'warning')}
                    data-node-id="20:9129"
                  >
                    <span data-node-id="20:9130">Warning</span>
                  </button>

                  {/* Information Pill */}
                  <button
                    type="button"
                    className={`filter-pill info-pill ${activeFilter === 'information' ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'information' ? 'all' : 'information')}
                    data-node-id="20:9131"
                  >
                    <span data-node-id="20:9132">Information</span>
                  </button>

                  {/* Success Pill */}
                  <button
                    type="button"
                    className={`filter-pill success-pill ${activeFilter === 'success' ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'success' ? 'all' : 'success')}
                    data-node-id="20:9133"
                  >
                    <span data-node-id="20:9134">Success</span>
                  </button>

                  {activeFilter !== 'all' && (
                    <button
                      type="button"
                      className="filter-pill"
                      onClick={() => setActiveFilter('all')}
                      style={{ background: 'transparent', border: '1px dashed #cbc4d4' }}
                    >
                      <RotateCcw size={12} />
                      <span>Reset Filter</span>
                    </button>
                  )}
                </div>

                {/* 5. Notification List: Data Table (Node 20:9135) */}
                <div
                  className="notification-table-card"
                  data-node-id="20:9135"
                  data-name="Notification List: Data Table"
                >
                  <div className="notification-table-scroll">
                    <table className="notification-table" data-node-id="20:9136">
                      <thead className="notification-thead" data-node-id="20:9137">
                        <tr data-node-id="20:9138">
                          <th className="notification-th center" style={{ width: 96 }} data-node-id="20:9139">
                            STATUS
                          </th>
                          <th className="notification-th" style={{ width: 128 }} data-node-id="20:9141">
                            MODULE
                          </th>
                          <th className="notification-th" data-node-id="20:9143">
                            ALERT &amp; DESCRIPTION
                          </th>
                          <th className="notification-th" style={{ width: 160 }} data-node-id="20:9145">
                            TIME
                          </th>
                          <th className="notification-th right" style={{ width: 136 }} data-node-id="20:9147">
                            ACTIONS
                          </th>
                        </tr>
                      </thead>

                      <tbody data-node-id="20:9149">
                        {paginatedNotifications.length > 0 ? (
                          paginatedNotifications.map((item) => {
                            const isCritical = item.severity === 'critical';
                            const isWarning = item.severity === 'warning';
                            const isSuccess = item.severity === 'success';
                            const isInfo = item.severity === 'information';

                            return (
                              <tr
                                key={item.id}
                                className={`notification-row ${
                                  item.status === 'unread' ? 'unread-row' : 'read-row'
                                }`}
                                onClick={() => handleOpenDetail(item)}
                              >
                                {/* Status Icon Column */}
                                <td className="notification-td center">
                                  <div className="status-indicator-wrap">
                                    {isCritical && (
                                      <AlertCircle className="status-icon-svg text-[#ba1a1a]" />
                                    )}
                                    {isWarning && (
                                      <AlertTriangle className="status-icon-svg text-[#fabd00]" />
                                    )}
                                    {isInfo && (
                                      <Info className="status-icon-svg text-[#28006d]" />
                                    )}
                                    {isSuccess && (
                                      <CheckCircle2 className="status-icon-svg text-[#006a60]" />
                                    )}
                                  </div>
                                </td>

                                {/* Module Column */}
                                <td className="notification-td">
                                  <div className="module-badge-stack">
                                    {isCritical ? (
                                      <div>
                                        <span className="module-badge critical">CRITICAL</span>
                                        {item.subModule && (
                                          <div className="module-subtag">{item.subModule}</div>
                                        )}
                                      </div>
                                    ) : item.module === 'REFERRAL' ? (
                                      <span className="module-badge referral">REFERRAL</span>
                                    ) : item.module === 'SYSTEM' ? (
                                      <span className="module-badge system">SYSTEM</span>
                                    ) : item.module === 'RECORD' ? (
                                      <span className="module-badge record">RECORD</span>
                                    ) : (
                                      <span className="module-badge audit">AUDIT</span>
                                    )}
                                  </div>
                                </td>

                                {/* Alert & Description Column */}
                                <td className="notification-td">
                                  <div className="alert-content-group">
                                    <div className="flex items-center gap-2">
                                      <span className="alert-title">{item.title}</span>
                                      <span className="text-[11px] font-mono text-gray-400">
                                        {item.displayCode}
                                      </span>
                                    </div>
                                    <span className="alert-desc">{item.description}</span>
                                  </div>
                                </td>

                                {/* Time Column */}
                                <td className="notification-td">
                                  <span className="alert-time">{item.time}</span>
                                </td>

                                {/* Actions Column */}
                                <td className="notification-td right">
                                  <div className="notification-actions-group">
                                    {item.status === 'unread' && (
                                      <button
                                        type="button"
                                        className="notification-action-btn"
                                        onClick={(e) => handleToggleReadStatus(item.id, e)}
                                        title="Mark as Read"
                                        aria-label={`Mark as read ${item.title}`}
                                      >
                                        <Check size={18} className="text-[#006a60]" />
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      className="notification-action-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenDetail(item);
                                      }}
                                      title="View Details"
                                      aria-label={`View details for ${item.title}`}
                                    >
                                      <ExternalLink size={18} />
                                    </button>

                                    <button
                                      type="button"
                                      className="notification-action-btn"
                                      onClick={(e) => handleArchiveNotification(item.id, e)}
                                      title={item.status === 'archived' ? 'Archived' : 'Archive'}
                                      aria-label={`Archive notification ${item.title}`}
                                    >
                                      <Archive size={18} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-gray-500 text-sm">
                              {isLoading
                                ? 'Loading live enterprise notifications...'
                                : 'No notifications found matching your search or filter criteria.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Bar (Node 20:9231) */}
                  <div
                    className="notification-pagination-bar"
                    data-node-id="20:9231"
                    data-name="Pagination"
                  >
                    <p className="pagination-info-text" data-node-id="20:9233">
                      Showing {filteredNotifications.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
                      {Math.min(currentPage * itemsPerPage, filteredNotifications.length)} of{' '}
                      {filteredNotifications.length} notifications
                    </p>

                    <div className="pagination-controls" data-node-id="20:9234">
                      <button
                        type="button"
                        className="pagination-btn"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                        data-node-id="20:9235"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                            onClick={() => setCurrentPage(pageNum)}
                            aria-label={`Go to page ${pageNum}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        className="pagination-btn"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        aria-label="Next page"
                        data-node-id="20:9244"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ==========================================================
                VIEW 2: SUPPORT TICKETS & HELPDESK
                ========================================================== */}
            {activeModuleTab === 'support' && (
              <>
                {/* Support Tickets Bento Grid */}
                <div className="notification-bento-grid">
                  <div
                    className={`bento-card ${activeTicketFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTicketFilter('all')}
                  >
                    <span className="bento-card-label">TOTAL TICKETS</span>
                    <div className="bento-card-bottom">
                      <span className="bento-card-value">{totalTicketsCount}</span>
                      <LifeBuoy size={16} className="bento-card-icon text-[#191c1e]" />
                    </div>
                  </div>

                  <div
                    className={`bento-card unread ${activeTicketFilter === 'open' ? 'active' : ''}`}
                    onClick={() => setActiveTicketFilter(activeTicketFilter === 'open' ? 'all' : 'open')}
                  >
                    <span className="bento-card-label">OPEN TICKETS</span>
                    <div className="bento-card-bottom">
                      <span className="bento-card-value">{openTicketsCount}</span>
                      <AlertCircle size={16} className="bento-card-icon" />
                    </div>
                  </div>

                  <div
                    className={`bento-card referrals ${activeTicketFilter === 'in_progress' ? 'active' : ''}`}
                    onClick={() => setActiveTicketFilter(activeTicketFilter === 'in_progress' ? 'all' : 'in_progress')}
                  >
                    <span className="bento-card-label">IN PROGRESS</span>
                    <div className="bento-card-bottom">
                      <span className="bento-card-value">{inProgressTicketsCount}</span>
                      <Clock size={16} className="bento-card-icon" />
                    </div>
                  </div>

                  <div
                    className={`bento-card ${activeTicketFilter === 'resolved' ? 'active' : ''}`}
                    onClick={() => setActiveTicketFilter(activeTicketFilter === 'resolved' ? 'all' : 'resolved')}
                  >
                    <span className="bento-card-label">RESOLVED / CLOSED</span>
                    <div className="bento-card-bottom">
                      <span className="bento-card-value">{resolvedTicketsCount}</span>
                      <CheckCircle2 size={16} className="bento-card-icon text-[#006a60]" />
                    </div>
                  </div>
                </div>

                {/* Support Tickets Filter Row */}
                <div className="notification-filters-row">
                  <span className="filters-label">Quick Filter:</span>

                  <button
                    type="button"
                    className={`filter-pill ${activeTicketFilter === 'open' ? 'active' : ''}`}
                    onClick={() => setActiveTicketFilter(activeTicketFilter === 'open' ? 'all' : 'open')}
                  >
                    <span>Open</span>
                    {activeTicketFilter === 'open' && <Check size={13} />}
                  </button>

                  <button
                    type="button"
                    className={`filter-pill ${activeTicketFilter === 'in_progress' ? 'active' : ''}`}
                    onClick={() => setActiveTicketFilter(activeTicketFilter === 'in_progress' ? 'all' : 'in_progress')}
                  >
                    <span>In Progress</span>
                    {activeTicketFilter === 'in_progress' && <Check size={13} />}
                  </button>

                  <button
                    type="button"
                    className={`filter-pill ${activeTicketFilter === 'resolved' ? 'active' : ''}`}
                    onClick={() => setActiveTicketFilter(activeTicketFilter === 'resolved' ? 'all' : 'resolved')}
                  >
                    <span>Resolved</span>
                    {activeTicketFilter === 'resolved' && <Check size={13} />}
                  </button>

                  <div className="filter-divider" />

                  <button
                    type="button"
                    className={`filter-pill info-pill ${activeTicketFilter === 'technical' ? 'active' : ''}`}
                    onClick={() => setActiveTicketFilter(activeTicketFilter === 'technical' ? 'all' : 'technical')}
                  >
                    <span>Technical</span>
                  </button>

                  <button
                    type="button"
                    className={`filter-pill warning-pill ${activeTicketFilter === 'billing' ? 'active' : ''}`}
                    onClick={() => setActiveTicketFilter(activeTicketFilter === 'billing' ? 'all' : 'billing')}
                  >
                    <span>Billing</span>
                  </button>

                  <button
                    type="button"
                    className={`filter-pill success-pill ${activeTicketFilter === 'clinical' ? 'active' : ''}`}
                    onClick={() => setActiveTicketFilter(activeTicketFilter === 'clinical' ? 'all' : 'clinical')}
                  >
                    <span>Clinical</span>
                  </button>

                  {activeTicketFilter !== 'all' && (
                    <button
                      type="button"
                      className="filter-pill"
                      onClick={() => setActiveTicketFilter('all')}
                      style={{ background: 'transparent', border: '1px dashed #cbc4d4' }}
                    >
                      <RotateCcw size={12} />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Support Tickets Table */}
                <div className="notification-table-card">
                  <div className="notification-table-scroll">
                    <table className="notification-table">
                      <thead className="notification-thead">
                        <tr>
                          <th className="notification-th" style={{ width: 140 }}>TICKET ID</th>
                          <th className="notification-th" style={{ width: 130 }}>CATEGORY</th>
                          <th className="notification-th">SUBJECT &amp; DESCRIPTION</th>
                          <th className="notification-th" style={{ width: 110 }}>PRIORITY</th>
                          <th className="notification-th" style={{ width: 120 }}>STATUS</th>
                          <th className="notification-th" style={{ width: 140 }}>CREATED</th>
                          <th className="notification-th right" style={{ width: 100 }}>ACTIONS</th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedTickets.length > 0 ? (
                          paginatedTickets.map((t) => {
                            const status = (t.status || 'OPEN').toUpperCase();
                            const priority = (t.priority || 'MEDIUM').toUpperCase();
                            return (
                              <tr
                                key={t.id}
                                className="notification-row read-row"
                                onClick={() => handleOpenTicketDetail(t)}
                              >
                                <td className="notification-td">
                                  <span className="font-mono text-xs font-bold text-[#28006d]">
                                    {t.ticketNumber || t.id.slice(0, 8)}
                                  </span>
                                </td>

                                <td className="notification-td">
                                  <span className="module-badge system">
                                    {t.category || 'GENERAL'}
                                  </span>
                                </td>

                                <td className="notification-td">
                                  <div className="alert-content-group">
                                    <span className="alert-title">{t.subject}</span>
                                    <span className="alert-desc">{t.description}</span>
                                  </div>
                                </td>

                                <td className="notification-td">
                                  {priority === 'CRITICAL' ? (
                                    <span className="text-xs font-bold text-[#ba1a1a]">CRITICAL</span>
                                  ) : priority === 'HIGH' ? (
                                    <span className="text-xs font-bold text-[#b45309]">HIGH</span>
                                  ) : priority === 'MEDIUM' ? (
                                    <span className="text-xs font-semibold text-[#475569]">MEDIUM</span>
                                  ) : (
                                    <span className="text-xs font-semibold text-[#006a60]">LOW</span>
                                  )}
                                </td>

                                <td className="notification-td">
                                  {status === 'OPEN' && (
                                    <span className="status-badge-open">OPEN</span>
                                  )}
                                  {status === 'IN_PROGRESS' && (
                                    <span className="status-badge-in-progress">IN PROGRESS</span>
                                  )}
                                  {status === 'RESOLVED' && (
                                    <span className="status-badge-resolved">RESOLVED</span>
                                  )}
                                  {status === 'CLOSED' && (
                                    <span className="status-badge-closed">CLOSED</span>
                                  )}
                                </td>

                                <td className="notification-td">
                                  <span className="alert-time">{formatTimeAgo(t.createdAt)}</span>
                                </td>

                                <td className="notification-td right">
                                  <div className="notification-actions-group">
                                    <button
                                      type="button"
                                      className="notification-action-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenTicketDetail(t);
                                      }}
                                      title="View Ticket & Discussion"
                                    >
                                      <MessageSquare size={18} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-500 text-sm">
                              {isTicketsLoading
                                ? 'Loading live support tickets...'
                                : 'No support tickets found matching your filter criteria.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Bar */}
                  <div className="notification-pagination-bar">
                    <p className="pagination-info-text">
                      Showing {filteredTickets.length > 0 ? (currentTicketPage - 1) * itemsPerPage + 1 : 0} to{' '}
                      {Math.min(currentTicketPage * itemsPerPage, filteredTickets.length)} of{' '}
                      {filteredTickets.length} tickets
                    </p>

                    <div className="pagination-controls">
                      <button
                        type="button"
                        className="pagination-btn"
                        disabled={currentTicketPage === 1}
                        onClick={() => setCurrentTicketPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft size={16} />
                      </button>

                      {Array.from({ length: totalTicketPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            className={`pagination-btn ${currentTicketPage === pageNum ? 'active' : ''}`}
                            onClick={() => setCurrentTicketPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        className="pagination-btn"
                        disabled={currentTicketPage === totalTicketPages}
                        onClick={() => setCurrentTicketPage((p) => Math.min(totalTicketPages, p + 1))}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ==========================================================
                6. High Integrity Data Monitoring Banner (Node 20:9247)
                ========================================================== */}
            <div
              className="notification-backdrop-card"
              data-node-id="20:9247"
              data-name="Subtle Backdrop Animation/Effect"
            >
              <h3 className="backdrop-title" data-node-id="20:9252">
                High Integrity Data Monitoring
              </h3>
              <p className="backdrop-desc" data-node-id="20:9254">
                CareID systems are continuously monitored. Notifications, support tickets, and system announcements
                are synchronized with central PostgreSQL backend and audit streams.
              </p>
            </div>
          </div>
        </main>

        {/* ==============================================================
            7. Stationary Footer Info (40px, Node 20:9255)
            ============================================================== */}
        <footer
          className="notification-footer-bar"
          data-node-id="20:9255"
          data-name="Footer Info"
        >
          <div className="footer-left-cluster" data-node-id="20:9256">
            <span data-node-id="20:9258">
              System Status: <strong className="status-optimal">Optimal</strong>
            </span>
            <div className="footer-vdivider" data-node-id="20:9259" />
            <span data-node-id="20:9261">Version 3.4.2-enterprise</span>
          </div>

          <div data-node-id="20:9263">
            <span>&copy; 2026 CareID Healthcare Solutions</span>
          </div>
        </footer>
      </div>

      {/* ==============================================================
          8. Notification Detail Modal Dialog
          ============================================================== */}
      {selectedNotification && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedNotification(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-notif-title"
        >
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                {selectedNotification.severity === 'critical' ? (
                  <AlertCircle size={22} className="text-[#ba1a1a]" />
                ) : selectedNotification.severity === 'warning' ? (
                  <AlertTriangle size={22} className="text-[#fabd00]" />
                ) : (
                  <Info size={22} className="text-[#28006d]" />
                )}
                <h3 id="modal-notif-title" className="modal-title">
                  {selectedNotification.displayCode} &mdash; {selectedNotification.module}
                </h3>
              </div>
              <button
                type="button"
                className="notification-action-btn"
                onClick={() => setSelectedNotification(null)}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-1">
                  {selectedNotification.title}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedNotification.description}
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Backend UUID:</span>
                  <span className="font-mono text-gray-800 break-all select-all">
                    {selectedNotification.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Timestamp:</span>
                  <span className="font-medium text-gray-800">
                    {new Date(selectedNotification.timestamp).toLocaleString()} ({selectedNotification.time})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Severity:</span>
                  <span className="font-semibold uppercase text-gray-800">
                    {selectedNotification.severity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-semibold uppercase text-gray-800">
                    {selectedNotification.status}
                  </span>
                </div>
                {selectedNotification.auditSignature && (
                  <div className="pt-1 border-t border-gray-200">
                    <span className="text-gray-500 block mb-0.5">Cryptographic Audit Signature:</span>
                    <code className="text-xs text-[#28006d] font-mono break-all">
                      {selectedNotification.auditSignature}
                    </code>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="filter-pill"
                onClick={() => handleToggleReadStatus(selectedNotification.id)}
              >
                <Check size={14} />
                <span>
                  {selectedNotification.status === 'unread' ? 'Mark as Read' : 'Already Read'}
                </span>
              </button>

              {selectedNotification.targetPath && (
                <button
                  type="button"
                  className="btn-create-announcement"
                  style={{ padding: '8px 18px', fontSize: '13px' }}
                  onClick={() => {
                    const target = selectedNotification.targetPath;
                    setSelectedNotification(null);
                    if (target) handleNav(target);
                  }}
                >
                  <span>Open Related Module</span>
                  <ExternalLink size={14} />
                </button>
              )}

              <button
                type="button"
                className="filter-pill"
                onClick={() => setSelectedNotification(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          9. Quick Announcement Modal Dialog
          ============================================================== */}
      {isAnnouncementModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsAnnouncementModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-modal-title"
        >
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Megaphone size={20} className="text-[#28006d]" />
                <h3 id="announcement-modal-title" className="modal-title">
                  Create System Announcement
                </h3>
              </div>
              <button
                type="button"
                className="notification-action-btn"
                onClick={() => setIsAnnouncementModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p className="text-xs text-gray-500">
                Creates an authoritative announcement via <code>POST /api/v1/cms/announcements</code> persisted in the live database.
              </p>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Announcement Title
                </label>
                <input
                  type="text"
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#28006d]"
                  placeholder="e.g. Scheduled System Maintenance or Clinical Update"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Priority Level
                </label>
                <select
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#28006d]"
                  value={announcementPriority}
                  onChange={(e: any) => setAnnouncementPriority(e.target.value)}
                >
                  <option value="LOW">Low (Informational)</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High (Important)</option>
                  <option value="CRITICAL">Critical (Urgent Alert)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Announcement Description
                </label>
                <textarea
                  className="w-full h-24 p-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#28006d]"
                  placeholder="Enter details of the bulletin, advisory, or scheduled system event..."
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                />
              </div>

              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Target: All Enterprise Personnel</span>
                <button
                  type="button"
                  className="text-[#28006d] font-semibold hover:underline"
                  onClick={() => {
                    setIsAnnouncementModalOpen(false);
                    handleNav('/admin/announcements');
                  }}
                >
                  Announcements Center &gt;
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="filter-pill"
                onClick={() => setIsAnnouncementModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-create-announcement"
                style={{ padding: '8px 20px', fontSize: '13px' }}
                onClick={handleSendAnnouncement}
                disabled={!announcementText.trim() || isPublishingAnnouncement}
              >
                <span>{isPublishingAnnouncement ? 'Saving to Database...' : 'Publish Announcement'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          10. Create Support Ticket Modal Dialog
          ============================================================== */}
      {isCreateTicketModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsCreateTicketModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <LifeBuoy size={20} className="text-[#28006d]" />
                <h3 className="modal-title">Create Support Ticket</h3>
              </div>
              <button
                type="button"
                className="notification-action-btn"
                onClick={() => setIsCreateTicketModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p className="text-xs text-gray-500">
                Submit an authoritative ticket via <code>POST /api/v1/support/tickets</code>.
              </p>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Subject
                </label>
                <input
                  type="text"
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#28006d]"
                  placeholder="e.g. Latency observed on medical records download"
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#28006d]"
                    value={newTicketCategory}
                    onChange={(e: any) => setNewTicketCategory(e.target.value)}
                  >
                    <option value="TECHNICAL">Technical</option>
                    <option value="BILLING">Billing</option>
                    <option value="ACCOUNT">Account</option>
                    <option value="CLINICAL">Clinical</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Priority
                  </label>
                  <select
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#28006d]"
                    value={newTicketPriority}
                    onChange={(e: any) => setNewTicketPriority(e.target.value)}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Description &amp; Steps
                </label>
                <textarea
                  className="w-full h-24 p-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#28006d]"
                  placeholder="Describe the issue, steps to reproduce, or support requirements..."
                  value={newTicketDescription}
                  onChange={(e) => setNewTicketDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="filter-pill"
                onClick={() => setIsCreateTicketModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-create-announcement"
                style={{ padding: '8px 20px', fontSize: '13px' }}
                onClick={handleCreateTicket}
                disabled={!newTicketSubject.trim() || !newTicketDescription.trim() || isSubmittingTicket}
              >
                <span>{isSubmittingTicket ? 'Submitting...' : 'Submit Support Ticket'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          11. Support Ticket Detail & Reply Modal Dialog
          ============================================================== */}
      {selectedTicket && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedTicket(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-content-card" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <LifeBuoy size={22} className="text-[#28006d]" />
                <h3 className="modal-title">
                  {selectedTicket.ticketNumber || selectedTicket.id.slice(0, 8)} &mdash; {selectedTicket.category}
                </h3>
              </div>
              <button
                type="button"
                className="notification-action-btn"
                onClick={() => setSelectedTicket(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-1">
                  {selectedTicket.subject}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Status and Action bar */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium">Status:</span>
                  <select
                    className="p-1 border border-gray-300 rounded font-bold text-xs bg-white text-gray-800"
                    value={selectedTicket.status || 'OPEN'}
                    disabled={isUpdatingTicketStatus}
                    onChange={(e) => handleUpdateTicketStatus(e.target.value)}
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium">Priority:</span>
                  <span className="font-bold uppercase text-gray-800">{selectedTicket.priority}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium">Created:</span>
                  <span className="font-medium text-gray-800">{new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Communication / Replies Thread */}
              <div>
                <h5 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageSquare size={13} />
                  <span>Discussion &amp; Support Replies ({ticketReplies.length})</span>
                </h5>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {ticketReplies.length > 0 ? (
                    ticketReplies.map((r) => (
                      <div key={r.id} className="ticket-reply-bubble">
                        <div className="flex justify-between items-center text-[11px] text-gray-500 mb-1">
                          <span className="font-bold text-[#28006d]">
                            {r.userRole || 'CareID Support'}
                          </span>
                          <span>{formatTimeAgo(r.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-800 leading-relaxed m-0">{r.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 italic">No replies posted yet.</p>
                  )}
                </div>
              </div>

              {/* Reply Box */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Post a Reply
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 p-2 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-[#28006d]"
                    placeholder="Type response to ticket..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendReply();
                    }}
                  />
                  <button
                    type="button"
                    className="btn-create-announcement"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                    onClick={handleSendReply}
                    disabled={!replyMessage.trim() || isSendingReply}
                  >
                    <Send size={14} />
                    <span>{isSendingReply ? 'Sending...' : 'Reply'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="filter-pill"
                onClick={() => setSelectedTicket(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          12. Floating Toast Message
          ============================================================== */}
      {toastMessage && (
        <div className="notification-toast" role="status">
          <CheckCircle2 size={18} className="text-[#85f6e5]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationDashboard;
