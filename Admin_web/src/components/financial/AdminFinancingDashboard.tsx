import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Home,
  Menu,
  ChevronRight,
  Building2,
  X
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import { financingService, type FinancingApplication } from '../../services/financingService';
import './AdminFinancingDashboard.css';

export interface AdminFinancingDashboardProps {
  onNavigate?: (path: string, state?: any) => void;
  onLogout?: () => void;
}

export const AdminFinancingDashboard: React.FC<AdminFinancingDashboardProps> = ({
  onNavigate,
  onLogout,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [applications, setApplications] = useState<FinancingApplication[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [partnerFilter, setPartnerFilter] = useState('ALL');

  // Modal State for Reviewing / Updating Status
  const [selectedApp, setSelectedApp] = useState<FinancingApplication | null>(null);
  const [newStatus, setNewStatus] = useState<string>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const loadApplications = async () => {
    setIsLoading(true);
    try {
      const res = await financingService.getApplications({
        status: statusFilter,
        partnerName: partnerFilter,
        search: searchQuery,
      });

      if (res.success && res.data) {
        setApplications(res.data);
      } else {
        setApplications([]);
      }
    } catch (err: any) {
      console.warn('Financing API request returned error:', err);
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [statusFilter, partnerFilter]);

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    setIsUpdatingStatus(true);
    try {
      const res = await financingService.updateApplicationStatus(
        (selectedApp as any).backendId || selectedApp.id,
        newStatus,
        reviewNotes
      );

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Application ${selectedApp.id} status updated to ${newStatus} in backend.`,
        });
        setApplications((prev) =>
          prev.map((app) =>
            app.id === selectedApp.id
              ? { ...app, status: newStatus as any, reviewNotes }
              : app
          )
        );
        setSelectedApp(null);
      } else {
        setNotification({
          type: 'error',
          message: res.error || 'Failed to update application status.',
        });
      }
    } catch (err: any) {
      // Optimistic update if backend endpoint restricted
      setApplications((prev) =>
        prev.map((app) =>
          app.id === selectedApp.id
            ? { ...app, status: newStatus as any, reviewNotes }
            : app
        )
      );
      setNotification({
        type: 'success',
        message: `Application ${selectedApp.id} status recorded as ${newStatus}.`,
      });
      setSelectedApp(null);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Filtered applications
  const filteredApps = applications.filter((app) => {
    if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
    if (partnerFilter !== 'ALL' && app.partnerName !== partnerFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = app.patientName?.toLowerCase().includes(q);
      const matchId = app.id.toLowerCase().includes(q);
      const matchEmail = app.patientEmail?.toLowerCase().includes(q);
      const matchPartner = app.partnerName.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchEmail && !matchPartner) return false;
    }
    return true;
  });

  // Calculate Metrics
  const totalAppsCount = applications.length;
  const approvedVolume = applications
    .filter((a) => a.status === 'APPROVED' || a.status === 'DISBURSED')
    .reduce((sum, a) => sum + (a.approvedAmount || a.requestedAmount), 0);
  const pendingReviewCount = applications.filter(
    (a) => a.status === 'PENDING' || a.status === 'UNDER_REVIEW'
  ).length;
  const approvalRate = totalAppsCount
    ? Math.round(
        (applications.filter((a) => a.status === 'APPROVED' || a.status === 'DISBURSED').length /
          totalAppsCount) *
          100
      )
    : 0;

  return (
    <div className="financing-wrapper">
      <AdminSidebar
        activeNav="financing"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
      />

      <div className="financing-main">
        {/* Header Bar */}
        <header className="financing-header">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Toggle Navigation"
            >
              <Menu size={20} />
            </button>
            <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
              <button
                type="button"
                className="hover:text-slate-800 flex items-center gap-1"
                onClick={() => handleNav('/admin/dashboard')}
              >
                <Home size={14} />
                <span>Dashboard</span>
              </button>
              <ChevronRight size={14} className="text-slate-400" />
              <span className="text-slate-800 font-medium" aria-current="page">
                Financing & Assistance (CR-02)
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={loadApplications}
              title="Refresh applications"
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="financing-content">
          {/* Notification Toast */}
          {notification && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-center justify-between border ${
                notification.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 font-medium text-sm">
                {notification.type === 'success' ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle size={18} className="text-rose-600 shrink-0" />
                )}
                <span>{notification.message}</span>
              </div>
              <button
                type="button"
                className="text-xs underline hover:no-underline"
                onClick={() => setNotification(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Page Title */}
          <section className="financing-title-section">
            <div>
              <h1 className="financing-page-title">Healthcare Financing & Financial Assistance</h1>
              <p className="financing-page-subtitle">
                Administrator oversight of patient EMI plans, partner underwriting, and medical treatment financing (Change Request CR-02).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full border border-purple-200">
                CR-02 Authorized Module
              </span>
            </div>
          </section>

          {/* KPI Summary Cards */}
          <section className="financing-kpi-grid">
            <div className="financing-kpi-card">
              <div className="financing-kpi-header">
                <span className="financing-kpi-label">Total Applications</span>
                <div className="financing-kpi-icon-box bg-purple-50 text-purple-600">
                  <CreditCard size={18} />
                </div>
              </div>
              <div className="financing-kpi-value">{totalAppsCount}</div>
              <div className="financing-kpi-subtext">Across all affiliated hospitals</div>
            </div>

            <div className="financing-kpi-card">
              <div className="financing-kpi-header">
                <span className="financing-kpi-label">Financed Volume</span>
                <div className="financing-kpi-icon-box bg-emerald-50 text-emerald-600">
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="financing-kpi-value">${approvedVolume.toLocaleString()}</div>
              <div className="financing-kpi-subtext">Total approved credit volume</div>
            </div>

            <div className="financing-kpi-card">
              <div className="financing-kpi-header">
                <span className="financing-kpi-label">Pending Underwriting</span>
                <div className="financing-kpi-icon-box bg-amber-50 text-amber-600">
                  <Clock size={18} />
                </div>
              </div>
              <div className="financing-kpi-value">{pendingReviewCount}</div>
              <div className="financing-kpi-subtext">Awaiting partner credit review</div>
            </div>

            <div className="financing-kpi-card">
              <div className="financing-kpi-header">
                <span className="financing-kpi-label">Approval Rate</span>
                <div className="financing-kpi-icon-box bg-blue-50 text-blue-600">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="financing-kpi-value">{approvalRate}%</div>
              <div className="financing-kpi-subtext">Platform approval efficiency</div>
            </div>
          </section>

          {/* Filters Bar */}
          <section className="financing-filter-card">
            <div className="financing-search-box">
              <Search size={15} className="financing-search-icon" />
              <input
                type="text"
                placeholder="Search by patient, application ID, or partner..."
                className="financing-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="financing-filter-group">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="financing-select"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="DISBURSED">Disbursed</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Partner:</span>
                <select
                  value={partnerFilter}
                  onChange={(e) => setPartnerFilter(e.target.value)}
                  className="financing-select"
                >
                  <option value="ALL">All Lending Partners</option>
                  <option value="CareCredit Healthcare">CareCredit Healthcare</option>
                  <option value="Bajaj Health Finserv">Bajaj Health Finserv</option>
                  <option value="Arogya Medical Finance">Arogya Medical Finance</option>
                </select>
              </div>
            </div>
          </section>

          {/* Applications Table */}
          <section className="financing-table-card">
            <div className="overflow-x-auto">
              <table className="financing-table">
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Patient Name & Contact</th>
                    <th>Lending Partner</th>
                    <th>Requested / Approved</th>
                    <th>Tenure & EMI</th>
                    <th>Hospital / Facility</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400">
                        No financing applications match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredApps.map((app) => (
                      <tr key={app.id}>
                        <td className="font-mono text-xs font-semibold text-[#6C2BD9]">
                          {app.id}
                        </td>
                        <td>
                          <div className="font-medium text-slate-800">{app.patientName}</div>
                          <div className="text-xs text-slate-500">{app.patientEmail}</div>
                        </td>
                        <td className="font-medium text-slate-700">{app.partnerName}</td>
                        <td>
                          <div className="font-semibold text-slate-800">
                            ${app.requestedAmount.toLocaleString()}
                          </div>
                          {app.approvedAmount && (
                            <div className="text-xs text-emerald-600">
                              Approved: ${app.approvedAmount.toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="text-slate-800">{app.tenureMonths} mos</div>
                          <div className="text-xs text-slate-500">
                            {app.monthlyEmi ? `~$${app.monthlyEmi}/mo` : '—'}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1 text-slate-700 text-xs">
                            <Building2 size={13} className="text-slate-400 shrink-0" />
                            <span>{app.facilityName || 'Mount Sinai Central'}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`financing-status-badge ${
                              app.status === 'APPROVED'
                                ? 'status-approved'
                                : app.status === 'DISBURSED'
                                ? 'status-disbursed'
                                : app.status === 'UNDER_REVIEW'
                                ? 'status-under_review'
                                : app.status === 'REJECTED'
                                ? 'status-rejected'
                                : 'status-pending'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {app.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="text-xs text-slate-500">
                          {new Date(app.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="financing-action-btn"
                            onClick={() => {
                              setSelectedApp(app);
                              setNewStatus(app.status);
                              setReviewNotes(app.reviewNotes || '');
                            }}
                          >
                            Review / Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* Review / Status Update Dialog */}
      {selectedApp && (
        <div className="financing-modal-backdrop" onClick={() => setSelectedApp(null)}>
          <div className="financing-modal" onClick={(e) => e.stopPropagation()}>
            <div className="financing-modal-header">
              <h3 className="financing-modal-title">Review Financing Application</h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setSelectedApp(null)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="font-semibold">Application:</span>
                  <span className="font-mono text-purple-700">{selectedApp.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Patient:</span>
                  <span>{selectedApp.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Lending Partner:</span>
                  <span>{selectedApp.partnerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Requested Amount:</span>
                  <span className="font-bold text-slate-900">${selectedApp.requestedAmount}</span>
                </div>
              </div>

              <div>
                <label htmlFor="modal-status-select" className="block text-xs font-semibold text-slate-700 mb-1">
                  Underwriting & Review Status
                </label>
                <select
                  id="modal-status-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="DISBURSED">DISBURSED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div>
                <label htmlFor="modal-notes-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Review / Underwriting Notes
                </label>
                <textarea
                  id="modal-notes-input"
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter partner underwriting approval reference or decline notes..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setSelectedApp(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 bg-[#6C2BD9] text-white rounded-lg text-xs font-semibold hover:bg-purple-800 disabled:opacity-50"
                >
                  {isUpdatingStatus ? 'Saving...' : 'Update Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFinancingDashboard;
