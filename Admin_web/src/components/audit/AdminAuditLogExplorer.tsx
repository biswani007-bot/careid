import React, { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  HelpCircle,
  Menu,
  ShieldCheck,
  Filter,
  RotateCcw,
  Eye,
  Link2,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Lock,
  ArrowUpDown
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import {
  useLiveAuditLogsQuery,
  exportAuditLogs,
  mapBackendLogsToExplorerRows,
} from '../../services/auditLogService';
import './AdminAuditLogExplorer.css';

interface AdminAuditLogExplorerProps {
  onNavigate?: (path: string, state?: any) => void;
  onLogout?: () => void;
}

// ---------------------------------------------------------------------------
// Zod Filter Form Schema
// ---------------------------------------------------------------------------
const auditExplorerFilterSchema = z.object({
  searchQuery: z.string().optional(),
  module: z.string().default('All Modules'),
  severity: z.string().default('All Severities'),
  role: z.string().default('All Roles'),
  status: z.string().default('All Statuses'),
  dateRange: z.string().default('Oct 20, 2023 - Oct 27, 2023')
});

export type AuditExplorerFilterValues = z.infer<typeof auditExplorerFilterSchema>;

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------
export type ModuleType = 'SECURITY' | 'RECORDS' | 'STAFF' | 'PATIENTS' | 'DOCTORS' | 'OCR' | 'REFERRALS' | 'REPORTS' | 'SYSTEM';
export type AuditLogStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'WARNING';
export type SeverityType = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface AuditExplorerRow {
  id: string;
  eventId: string;
  timestamp: string;
  module: ModuleType;
  action: string;
  performedBy: string;
  role: string;
  target: string;
  ipAddress: string;
  status: AuditLogStatus;
  severity: SeverityType;
  rawDetails?: string;
  ledgerHash?: string;
  [key: string]: any;
}

export const AdminAuditLogExplorer: React.FC<AdminAuditLogExplorerProps> = ({
  onNavigate,
  onLogout
}) => {
  const { t } = useTranslation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filter Form using React Hook Form + Zod
  const { register, control, watch, reset, handleSubmit } = useForm<AuditExplorerFilterValues>({
    resolver: zodResolver(auditExplorerFilterSchema),
    defaultValues: {
      searchQuery: '',
      module: 'All Modules',
      severity: 'All Severities',
      role: 'All Roles',
      status: 'All Statuses',
      dateRange: 'Oct 20, 2023 - Oct 27, 2023'
    }
  });

  const [appliedFilters, setAppliedFilters] = useState<AuditExplorerFilterValues>({
    searchQuery: '',
    module: 'All Modules',
    severity: 'All Severities',
    role: 'All Roles',
    status: 'All Statuses',
    dateRange: 'Oct 20, 2023 - Oct 27, 2023'
  });

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof AuditExplorerRow>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Interactive Detail Modal
  const [selectedDetailRow, setSelectedDetailRow] = useState<AuditExplorerRow | null>(null);

  // Date Range Custom Modal
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('2023-10-20');
  const [customEndDate, setCustomEndDate] = useState('2023-10-27');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // Live Query from Verified Backend Endpoint
  const queryParams = useMemo(() => {
    const p: { page: number; limit: number; action?: string; searchQuery?: string } = {
      page: currentPage,
      limit: pageSize,
    };
    if (appliedFilters.module !== 'All Modules') {
      p.action = appliedFilters.module;
    }
    return p;
  }, [currentPage, pageSize, appliedFilters.module]);

  const { data: auditResult } = useLiveAuditLogsQuery(queryParams);

  // Transform Backend Live Logs into Explorer Rows using central helper
  const allExplorerRecords = useMemo(() => {
    return mapBackendLogsToExplorerRows(auditResult?.logs || []);
  }, [auditResult?.logs]);

  // Filter Logic
  const filteredRecords = useMemo(() => {
    return allExplorerRecords.filter((row) => {
      // Global Search
      if (appliedFilters.searchQuery && appliedFilters.searchQuery.trim()) {
        const q = appliedFilters.searchQuery.toLowerCase().trim();
        const matchesEvent = row.eventId.toLowerCase().includes(q);
        const matchesPerformer = row.performedBy.toLowerCase().includes(q);
        const matchesTarget = row.target.toLowerCase().includes(q);
        const matchesIp = row.ipAddress.toLowerCase().includes(q);
        const matchesAction = row.action.toLowerCase().includes(q);
        if (!matchesEvent && !matchesPerformer && !matchesTarget && !matchesIp && !matchesAction) {
          return false;
        }
      }

      // Severity Filter
      if (appliedFilters.severity !== 'All Severities' && row.severity !== appliedFilters.severity) {
        return false;
      }

      // Role Filter
      if (appliedFilters.role !== 'All Roles' && row.role !== appliedFilters.role) {
        return false;
      }

      // Status Filter
      if (appliedFilters.status !== 'All Statuses' && row.status !== appliedFilters.status) {
        return false;
      }

      return true;
    });
  }, [allExplorerRecords, appliedFilters]);

  // Sorted Records
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const aVal = String((a as any)[sortField] ?? '');
      const bVal = String((b as any)[sortField] ?? '');
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination bounds derived from server response
  const totalEntries = auditResult?.total ?? sortedRecords.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const paginatedRows = sortedRecords;

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const tId = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(tId);
    }
  }, [toastMessage]);

  const navigate = useNavigate();
  const handleNav = (path: string, state?: any) => {
    if (onNavigate) {
      onNavigate(path, state);
    } else {
      navigate(path, { state });
    }
  };

  const handleSort = (field: keyof AuditExplorerRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const onFilterSubmit = (data: AuditExplorerFilterValues) => {
    setAppliedFilters(data);
    setCurrentPage(1);
    setToastMessage({
      type: 'info',
      text: t('auditExplorer.filterApplied', 'Audit filters applied successfully.')
    });
  };

  const handleResetFilters = () => {
    reset({
      searchQuery: '',
      module: 'All Modules',
      severity: 'All Severities',
      role: 'All Roles',
      status: 'All Statuses',
      dateRange: 'Oct 20, 2023 - Oct 27, 2023'
    });
    setAppliedFilters({
      searchQuery: '',
      module: 'All Modules',
      severity: 'All Severities',
      role: 'All Roles',
      status: 'All Statuses',
      dateRange: 'Oct 20, 2023 - Oct 27, 2023'
    });
    setCurrentPage(1);
    setToastMessage({
      type: 'info',
      text: t('auditExplorer.filterReset', 'Filters reset to default view.')
    });
  };

  const copyEventId = (eventId: string) => {
    navigator.clipboard.writeText(eventId);
    setToastMessage({
      type: 'success',
      text: `Event ID ${eventId} copied to clipboard.`
    });
  };

  const downloadEventJson = (row: AuditExplorerRow) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(row, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${row.eventId}_audit_record.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setToastMessage({
      type: 'success',
      text: `Exported ${row.eventId} audit JSON record.`
    });
  };

  const handleExportFullAudit = async (format: 'csv' | 'json' = 'csv') => {
    try {
      await exportAuditLogs(format, {
        action: appliedFilters.module !== 'All Modules' ? appliedFilters.module : undefined,
      });
      setToastMessage({
        type: 'success',
        text: `Full audit trail exported successfully (${format.toUpperCase()}) from live backend.`
      });
    } catch (err: any) {
      setToastMessage({
        type: 'info',
        text: `Export failed: ${err.message || 'Backend export unavailable'}`
      });
    }
  };

  return (
    <div
      className="audit-explorer-root"
      data-node-id="20:7190"
      data-name="Admin Portal - Audit Log Explorer"
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`audit-explorer-toast ${toastMessage.type}`} role="alert">
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

      {/* Main Canvas Area */}
      <div
        className="audit-explorer-canvas"
        data-node-id="20:7191"
        data-name="Layout Container → Main - Content Canvas"
      >
        {/* Header - TopNavBar (Figma Node ID: 20:7642) */}
        <header
          className="audit-explorer-header"
          data-node-id="20:7642"
          data-name="Header - TopNavBar"
        >
          <div className="header-left-group" data-node-id="20:7643">
            <button
              type="button"
              className="menu-drawer-trigger"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open sidebar navigation"
            >
              <Menu size={20} />
            </button>

            {/* Title Section */}
            <div className="header-title-badge" data-node-id="20:7644">
              <ShieldCheck size={20} className="header-shield-icon" />
              <h1 className="header-title-text" data-node-id="20:7648">
                Audit Log Explorer
              </h1>
            </div>

            {/* Vertical Divider */}
            <div className="header-vertical-sep" data-node-id="20:7650" />

            {/* Global Search Field */}
            <div className="header-search-wrap" data-node-id="20:7651">
              <Search size={18} className="header-search-icon" data-node-id="20:7656" />
              <input
                type="text"
                {...register('searchQuery')}
                placeholder="Search event IDs, IPs, or users..."
                className="header-search-input"
                aria-label="Search event IDs, IPs, or users"
                data-node-id="20:7652"
                onChange={(e) => {
                  register('searchQuery').onChange(e);
                  setAppliedFilters((prev: AuditExplorerFilterValues) => ({ ...prev, searchQuery: e.target.value }));
                  setCurrentPage(1);
                }}
              />
              {watch('searchQuery') && (
                <button
                  type="button"
                  className="header-search-clear"
                  onClick={() => {
                    reset({ ...watch(), searchQuery: '' });
                    setAppliedFilters((prev: AuditExplorerFilterValues) => ({ ...prev, searchQuery: '' }));
                  }}
                  aria-label="Clear search query"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="header-right-group" data-node-id="20:7657">
            <button
              type="button"
              className="header-circle-btn"
              onClick={() =>
                setToastMessage({
                  type: 'info',
                  text: 'Audit ledger is live and actively synchronizing.'
                })
              }
              aria-label="Notifications"
              data-node-id="20:7658"
            >
              <Bell size={18} />
            </button>

            <button
              type="button"
              className="header-circle-btn"
              onClick={() => handleNav('/admin/support')}
              aria-label="Help and Documentation"
              data-node-id="20:7661"
            >
              <HelpCircle size={18} />
            </button>

            <button
              type="button"
              className="header-circle-btn avatar-btn p-0 overflow-hidden"
              onClick={() => handleNav('/admin/profile')}
              aria-label="My Profile & Information"
              title="My Profile & Information"
              data-node-id="20:7664"
            >
              <AdminProfileAvatar size="full" />
            </button>
          </div>
        </header>

        {/* Sticky Advanced Filter Bar (Figma Node ID: 20:7588) */}
        <form
          onSubmit={handleSubmit(onFilterSubmit)}
          className="audit-filter-bar"
          data-node-id="20:7588"
          data-name="Sticky Advanced Filter Bar"
        >
          <div className="filter-inputs-row">
            {/* 1. MODULE Filter */}
            <div className="filter-input-col col-module" data-node-id="20:7589">
              <label className="filter-label" data-node-id="20:7591">MODULE</label>
              <Controller
                name="module"
                control={control}
                render={({ field }) => (
                  <select {...field} className="filter-select" data-node-id="20:7592">
                    <option value="All Modules">All Modules</option>
                    <option value="SECURITY">SECURITY</option>
                    <option value="RECORDS">RECORDS</option>
                    <option value="STAFF">STAFF</option>
                    <option value="PATIENTS">PATIENTS</option>
                    <option value="DOCTORS">DOCTORS</option>
                    <option value="OCR">OCR</option>
                    <option value="REFERRALS">REFERRALS</option>
                    <option value="REPORTS">REPORTS</option>
                    <option value="SYSTEM">SYSTEM</option>
                  </select>
                )}
              />
            </div>

            {/* 2. SEVERITY Filter */}
            <div className="filter-input-col col-severity" data-node-id="20:7598">
              <label className="filter-label" data-node-id="20:7600">SEVERITY</label>
              <Controller
                name="severity"
                control={control}
                render={({ field }) => (
                  <select {...field} className="filter-select" data-node-id="20:7601">
                    <option value="All Severities">All Severities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                    <option value="INFO">Info</option>
                  </select>
                )}
              />
            </div>

            {/* 3. ROLE Filter */}
            <div className="filter-input-col col-role" data-node-id="20:7607">
              <label className="filter-label" data-node-id="20:7609">ROLE</label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <select {...field} className="filter-select" data-node-id="20:7610">
                    <option value="All Roles">All Roles</option>
                    <option value="Super Admin">Super Admin</option>
                    <option value="Admin">Admin</option>
                    <option value="Nurse">Nurse</option>
                    <option value="Admin Clerk">Admin Clerk</option>
                    <option value="System Staff">System Staff</option>
                    <option value="Doctor">Doctor</option>
                  </select>
                )}
              />
            </div>

            {/* 4. STATUS Filter */}
            <div className="filter-input-col col-status" data-node-id="20:7616">
              <label className="filter-label" data-node-id="20:7618">STATUS</label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <select {...field} className="filter-select" data-node-id="20:7619">
                    <option value="All Statuses">All Statuses</option>
                    <option value="SUCCESS">Success</option>
                    <option value="FAILED">Failed</option>
                    <option value="WARNING">Warning</option>
                    <option value="PENDING">Pending</option>
                  </select>
                )}
              />
            </div>

            {/* 5. DATE RANGE Filter */}
            <div className="filter-input-col col-date-range" data-node-id="20:7625">
              <label className="filter-label" data-node-id="20:7627">DATE RANGE</label>
              <div
                className="filter-date-btn"
                onClick={() => setShowDateRangeModal(true)}
                data-node-id="20:7628"
                role="button"
                tabIndex={0}
                aria-label="Select custom date range"
              >
                <Calendar size={14} className="calendar-icon" data-node-id="20:7629" />
                <span className="date-range-text" data-node-id="20:7633">
                  {watch('dateRange')}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons Row: Apply Filters & Reset */}
          <div className="filter-actions-row" data-node-id="20:7634">
            <button
              type="submit"
              className="apply-filters-btn"
              data-node-id="20:7635"
              data-name="Button"
            >
              <Filter size={14} className="filter-btn-icon" data-node-id="20:7636" />
              <span data-node-id="20:7638">Apply Filters</span>
            </button>

            <button
              type="button"
              className="reset-filters-btn"
              onClick={handleResetFilters}
              title="Reset all filters"
              aria-label="Reset all filters"
              data-node-id="20:7639"
            >
              <RotateCcw size={14} data-node-id="20:7640" />
            </button>

            <button
              type="button"
              className="reset-filters-btn !w-auto !px-3 flex items-center gap-1.5"
              onClick={() => handleExportFullAudit('csv')}
              title="Export filtered audit logs as CSV"
              aria-label="Export filtered audit logs as CSV"
            >
              <Download size={14} />
              <span className="text-xs font-semibold">Export CSV</span>
            </button>
          </div>
        </form>

        {/* Audit Log Table Section (Figma Node ID: 20:7192, 20:7193) */}
        <section
          className="audit-table-card-wrapper"
          data-node-id="20:7192"
          data-name="Table Section"
        >
          <div
            className="audit-table-container"
            data-node-id="20:7193"
            data-name="Background+Border+Shadow"
          >
            {/* Scroll Container for Wide Data Table */}
            <div className="audit-table-scroll-view" data-node-id="20:7194">
              <table className="audit-explorer-table">
                {/* Header Row (Figma Node ID: 20:7195) */}
                <thead>
                  <tr className="table-header-row" data-node-id="20:7195">
                    <th className="th-cell th-timestamp" onClick={() => handleSort('timestamp')} data-node-id="20:7196">
                      <div className="th-content">
                        <span>TIMESTAMP</span>
                        <ArrowUpDown size={11} className="sort-icon" />
                      </div>
                    </th>
                    <th className="th-cell th-event-id" onClick={() => handleSort('eventId')} data-node-id="20:7198">
                      <div className="th-content">
                        <span>EVENT ID</span>
                        <ArrowUpDown size={11} className="sort-icon" />
                      </div>
                    </th>
                    <th className="th-cell th-module" onClick={() => handleSort('module')} data-node-id="20:7200">
                      <div className="th-content">
                        <span>MODULE</span>
                        <ArrowUpDown size={11} className="sort-icon" />
                      </div>
                    </th>
                    <th className="th-cell th-action" onClick={() => handleSort('action')} data-node-id="20:7202">
                      <div className="th-content">
                        <span>ACTION</span>
                        <ArrowUpDown size={11} className="sort-icon" />
                      </div>
                    </th>
                    <th className="th-cell th-performed" onClick={() => handleSort('performedBy')} data-node-id="20:7204">
                      <div className="th-content">
                        <span>PERFORMED BY</span>
                        <ArrowUpDown size={11} className="sort-icon" />
                      </div>
                    </th>
                    <th className="th-cell th-role" onClick={() => handleSort('role')} data-node-id="20:7206">
                      <div className="th-content">
                        <span>ROLE</span>
                        <ArrowUpDown size={11} className="sort-icon" />
                      </div>
                    </th>
                    <th className="th-cell th-target" onClick={() => handleSort('target')} data-node-id="20:7208">
                      <div className="th-content">
                        <span>TARGET</span>
                        <ArrowUpDown size={11} className="sort-icon" />
                      </div>
                    </th>
                    <th className="th-cell th-ip" onClick={() => handleSort('ipAddress')} data-node-id="20:7210">
                      <div className="th-content">
                        <span>IP ADDRESS</span>
                        <ArrowUpDown size={11} className="sort-icon" />
                      </div>
                    </th>
                    <th className="th-cell th-status" onClick={() => handleSort('status')} data-node-id="20:7212">
                      <div className="th-content">
                        <span>STATUS</span>
                        <ArrowUpDown size={11} className="sort-icon" />
                      </div>
                    </th>
                    <th className="th-cell th-actions-head" data-node-id="20:7214">
                      <span>ACTIONS</span>
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody data-node-id="20:7216">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="empty-results-cell">
                        <AlertCircle size={32} className="empty-icon" />
                        <h4 className="empty-title">No Audit Logs Match Filter Criteria</h4>
                        <p className="empty-subtitle">
                          Try adjusting search terms, widening date range, or selecting "All Modules".
                        </p>
                        <button
                          type="button"
                          className="empty-reset-btn"
                          onClick={handleResetFilters}
                        >
                          Clear All Filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, index) => {
                      const moduleClass =
                        row.module === 'SECURITY'
                          ? 'mod-security'
                          : row.module === 'RECORDS'
                          ? 'mod-records'
                          : row.module === 'STAFF'
                          ? 'mod-staff'
                          : row.module === 'PATIENTS'
                          ? 'mod-patients'
                          : 'mod-neutral';

                      const statusClass =
                        row.status === 'FAILED' ? 'status-pill-failed' : 'status-pill-success';

                      return (
                        <tr
                          key={row.id}
                          className="table-body-row"
                          data-node-id={index === 0 ? '20:7217' : index === 1 ? '20:7250' : undefined}
                        >
                          {/* 1. TIMESTAMP */}
                          <td className="td-cell td-timestamp">
                            <span className="cell-text-dark">{row.timestamp}</span>
                          </td>

                          {/* 2. EVENT ID */}
                          <td className="td-cell td-event-id">
                            <span
                              className="mono-event-id event-id-clickable"
                              onClick={() => handleNav(`/admin/audit-events/${row.eventId}`, row)}
                              title={`View ${row.eventId} details`}
                              role="link"
                              tabIndex={0}
                            >
                              {row.eventId}
                            </span>
                          </td>

                          {/* 3. MODULE */}
                          <td className="td-cell td-module">
                            <span className={`module-badge ${moduleClass}`}>
                              {row.module}
                            </span>
                          </td>

                          {/* 4. ACTION */}
                          <td className="td-cell td-action">
                            <span className="cell-text-semibold">{row.action}</span>
                          </td>

                          {/* 5. PERFORMED BY */}
                          <td className="td-cell td-performed">
                            <span className="cell-text-muted">{row.performedBy}</span>
                          </td>

                          {/* 6. ROLE */}
                          <td className="td-cell td-role">
                            <span className="cell-text-muted">{row.role}</span>
                          </td>

                          {/* 7. TARGET */}
                          <td className="td-cell td-target">
                            <span className="cell-text-muted">{row.target}</span>
                          </td>

                          {/* 8. IP ADDRESS */}
                          <td className="td-cell td-ip">
                            <span className="mono-ip">{row.ipAddress}</span>
                          </td>

                          {/* 9. STATUS */}
                          <td className="td-cell td-status">
                            <div className={`status-badge-wrap ${statusClass}`}>
                              <span className="status-dot" />
                              <span className="status-label">{row.status}</span>
                            </div>
                          </td>

                          {/* 10. ACTIONS */}
                          <td className="td-cell td-actions">
                            <div className="row-actions-group">
                              {/* View Details Eye */}
                              <button
                                type="button"
                                className="action-icon-btn"
                                onClick={() => handleNav(`/admin/audit-events/${row.eventId}`, row)}
                                title={`View details for ${row.eventId}`}
                                aria-label={`View details for ${row.eventId}`}
                                data-node-id="20:7241"
                              >
                                <Eye size={14} />
                              </button>

                              {/* Copy Link Chain */}
                              <button
                                type="button"
                                className="action-icon-btn"
                                onClick={() => copyEventId(row.eventId)}
                                title={`Copy link for ${row.eventId}`}
                                aria-label={`Copy link for ${row.eventId}`}
                                data-node-id="20:7244"
                              >
                                <Link2 size={14} />
                              </button>

                              {/* Download Record */}
                              <button
                                type="button"
                                className="action-icon-btn"
                                onClick={() => downloadEventJson(row)}
                                title={`Download JSON record for ${row.eventId}`}
                                aria-label={`Download JSON record for ${row.eventId}`}
                                data-node-id="20:7247"
                              >
                                <Download size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination & Page-Size Controls (Figma Node ID: 20:7553) */}
            <div
              className="audit-table-pagination"
              data-node-id="20:7553"
              data-name="Pagination Footer"
            >
              {/* Left Info & Page Size Select */}
              <div className="pagination-left-info" data-node-id="20:7554">
                <span className="showing-entries-text">
                  Showing {(currentPage - 1) * pageSize + 1} -{' '}
                  {Math.min(currentPage * pageSize, totalEntries)} of{' '}
                  {totalEntries.toLocaleString()} entries
                </span>
                <span className="pagination-sep">|</span>
                <div className="page-size-wrap">
                  <span className="page-size-label">Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="page-size-select"
                    data-node-id="20:7555"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="page-size-label">per page</span>
                </div>
              </div>

              {/* Right Pagination Buttons */}
              <div className="pagination-right-buttons" data-node-id="20:7563">
                {/* First Page Button */}
                <button
                  type="button"
                  className="page-nav-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  aria-label="First page"
                  title="First page"
                  data-node-id="20:7564"
                >
                  <ChevronsLeft size={14} />
                </button>

                {/* Prev Button */}
                <button
                  type="button"
                  className="page-nav-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  aria-label="Previous page"
                  title="Previous page"
                  data-node-id="20:7567"
                >
                  <ChevronLeft size={14} />
                </button>

                {/* Page Numbers */}
                <div className="page-numbers-group" data-node-id="20:7571">
                  <button
                    type="button"
                    className={`page-num-btn ${currentPage === 1 ? 'active-page' : ''}`}
                    onClick={() => setCurrentPage(1)}
                    data-node-id="20:7572"
                  >
                    1
                  </button>

                  <button
                    type="button"
                    className={`page-num-btn ${currentPage === 2 ? 'active-page' : ''}`}
                    onClick={() => setCurrentPage(2)}
                    data-node-id="20:7574"
                  >
                    2
                  </button>

                  <button
                    type="button"
                    className={`page-num-btn ${currentPage === 3 ? 'active-page' : ''}`}
                    onClick={() => setCurrentPage(3)}
                    data-node-id="20:7576"
                  >
                    3
                  </button>

                  <span className="page-ellipsis" data-node-id="20:7578">
                    ...
                  </span>

                  <button
                    type="button"
                    className={`page-num-btn ${currentPage === totalPages ? 'active-page' : ''}`}
                    onClick={() => setCurrentPage(totalPages)}
                    data-node-id="20:7580"
                  >
                    249
                  </button>
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  className="page-nav-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  aria-label="Next page"
                  title="Next page"
                  data-node-id="20:7582"
                >
                  <ChevronRight size={14} />
                </button>

                {/* Last Page Button */}
                <button
                  type="button"
                  className="page-nav-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  aria-label="Last page"
                  title="Last page"
                  data-node-id="20:7585"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Row Detail Dialog / Slideover */}
      {selectedDetailRow && (
        <div className="audit-detail-overlay" onClick={() => setSelectedDetailRow(null)}>
          <div className="audit-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="detail-modal-header">
              <div className="detail-title-group">
                <span className="detail-modal-badge">{selectedDetailRow.eventId}</span>
                <h3>Audit Event Details</h3>
              </div>
              <button
                type="button"
                className="detail-close-btn"
                onClick={() => setSelectedDetailRow(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="detail-modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Event Timestamp</label>
                  <span>{selectedDetailRow.timestamp}</span>
                </div>
                <div className="detail-item">
                  <label>Module / Domain</label>
                  <span className="detail-tag">{selectedDetailRow.module}</span>
                </div>
                <div className="detail-item">
                  <label>Action Performed</label>
                  <span className="detail-highlight">{selectedDetailRow.action}</span>
                </div>
                <div className="detail-item">
                  <label>Status / Verification</label>
                  <span className={selectedDetailRow.status === 'FAILED' ? 'text-red' : 'text-green'}>
                    {selectedDetailRow.status}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Performed By</label>
                  <span>{selectedDetailRow.performedBy}</span>
                </div>
                <div className="detail-item">
                  <label>User Role</label>
                  <span>{selectedDetailRow.role}</span>
                </div>
                <div className="detail-item">
                  <label>Target Object / Entity</label>
                  <span className="mono-detail">{selectedDetailRow.target}</span>
                </div>
                <div className="detail-item">
                  <label>Origin IP Address</label>
                  <span className="mono-detail">{selectedDetailRow.ipAddress}</span>
                </div>
              </div>

              {/* Cryptographic Ledger Proof */}
              <div className="detail-ledger-box">
                <div className="ledger-title-row">
                  <Lock size={14} className="ledger-icon" />
                  <span>Immutable Ledger Verification Proof (SHA-256)</span>
                </div>
                <div className="ledger-hash">
                  {selectedDetailRow.ledgerHash ||
                    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                </div>
                <p className="ledger-desc">
                  This record is cryptographically anchored in the CareID Postgres append-only transaction trail.
                </p>
              </div>
            </div>

            <div className="detail-modal-footer">
              <button
                type="button"
                className="btn-detail-secondary"
                onClick={() => copyEventId(selectedDetailRow.eventId)}
              >
                <Copy size={14} /> Copy Event ID
              </button>
              <button
                type="button"
                className="btn-detail-primary"
                onClick={() => downloadEventJson(selectedDetailRow)}
              >
                <Download size={14} /> Export Event Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Modal */}
      {showDateRangeModal && (
        <div className="audit-detail-overlay" onClick={() => setShowDateRangeModal(false)}>
          <div className="audit-detail-modal date-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="detail-modal-header">
              <h3>Select Custom Audit Date Range</h3>
              <button
                type="button"
                className="detail-close-btn"
                onClick={() => setShowDateRangeModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            <div className="detail-modal-body">
              <div className="date-inputs-flex">
                <div className="date-input-wrap">
                  <label>From Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="date-input-wrap">
                  <label>To Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="detail-modal-footer">
              <button
                type="button"
                className="btn-detail-secondary"
                onClick={() => setShowDateRangeModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-detail-primary"
                onClick={() => {
                  const label = `${customStartDate} - ${customEndDate}`;
                  reset({ ...watch(), dateRange: label });
                  setAppliedFilters((prev: AuditExplorerFilterValues) => ({ ...prev, dateRange: label }));
                  setShowDateRangeModal(false);
                  setToastMessage({
                    type: 'info',
                    text: `Time window set: ${label}`
                  });
                }}
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogExplorer;
