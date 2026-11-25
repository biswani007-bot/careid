import React, { useState, useId, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Plus,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Download,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

// Shell Styling
import '../dashboard/AdminDashboard.css';
import './AdminFacilityDirectory.css';

// Shared Shell
import AdminSidebar from '../common/AdminSidebar';
import AdminHeader from '../common/AdminHeader';
import ActionSuccessSnackbar from '../users/ActionSuccessSnackbar';

// Service & Hooks
import {
  useFacilitiesQuery,
  useFacilityStatisticsQuery,
} from '../../services/facilityService';

export interface AdminFacilityDirectoryProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminFacilityDirectory: React.FC<AdminFacilityDirectoryProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchInputId = useId();

  // Shell State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'id' | 'type' | 'location' | 'status' | 'default'>('default');

  // Debounce search term to efficiently query backend search API
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Pagination State - 10 records per page contract
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Live Queries exclusively from Backend API
  const {
    data: facilities = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useFacilitiesQuery(debouncedSearch);

  const {
    data: liveStats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useFacilityStatisticsQuery();

  const handleRetryAll = () => {
    refetch();
    refetchStats();
  };

  const handleNav = (path: string) => {
    setIsDrawerOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  // Filter & Sort Logic
  const filteredFacilities = useMemo(() => {
    let result = facilities.filter((fac) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        fac.legalName.toLowerCase().includes(q) ||
        fac.facilityId.toLowerCase().includes(q) ||
        fac.city.toLowerCase().includes(q) ||
        fac.clinicalLicense.toLowerCase().includes(q) ||
        fac.npiNumber.toLowerCase().includes(q) ||
        fac.facilityType.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'All' || fac.status === statusFilter;
      const matchesType = typeFilter === 'All' || fac.facilityType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });

    if (sortBy === 'name') {
      result.sort((a, b) => a.legalName.localeCompare(b.legalName));
    } else if (sortBy === 'id') {
      result.sort((a, b) => a.facilityId.localeCompare(b.facilityId));
    } else if (sortBy === 'type') {
      result.sort((a, b) => a.facilityType.localeCompare(b.facilityType));
    } else if (sortBy === 'location') {
      result.sort((a, b) => a.city.localeCompare(b.city));
    } else if (sortBy === 'status') {
      result.sort((a, b) => a.status.localeCompare(b.status));
    }

    return result;
  }, [facilities, searchTerm, statusFilter, typeFilter, sortBy]);

  // Pagination Calculations
  const totalResults = filteredFacilities.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startResult = totalResults === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endResult = Math.min(safePage * pageSize, totalResults);
  const paginatedFacilities = filteredFacilities.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Stats Calculations
  const activeCountInList = facilities.filter((f) => f.status === 'Active').length;
  const pendingCountInList = facilities.filter((f) => f.status === 'Pending Review').length;
  const stagingCountInList = facilities.filter((f) => f.status === 'Draft / Staging').length;

  const totalCount = liveStats ? liveStats.totalFacilities : facilities.length;
  const activeCount = liveStats ? liveStats.verifiedFacilities : activeCountInList;
  const pendingCount = liveStats?.pendingFacilities !== undefined ? liveStats.pendingFacilities : pendingCountInList;
  const stagingCount = liveStats?.suspendedFacilities !== undefined ? liveStats.suspendedFacilities : stagingCountInList;

  // Export CSV Handler
  const handleExportCSV = () => {
    if (filteredFacilities.length === 0) {
      setSnackbarMessage('No facility records available to export.');
      return;
    }

    const headers = ['Facility Name', 'Facility ID', 'Type', 'City', 'State', 'License', 'NPI', 'Status', 'Phone', 'Email'];
    const rows = filteredFacilities.map((f) => [
      `"${f.legalName.replace(/"/g, '""')}"`,
      `"${f.facilityId}"`,
      `"${f.facilityType}"`,
      `"${f.city}"`,
      `"${f.state}"`,
      `"${f.clinicalLicense}"`,
      `"${f.npiNumber}"`,
      `"${f.status}"`,
      `"${f.mainTelephone}"`,
      `"${f.administrativeEmail}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `careid_facilities_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSnackbarMessage(`Exported ${filteredFacilities.length} facility records successfully.`);
  };

  return (
    <div className="careid-dashboard-shell">
      {/* Mobile Drawer Backdrop */}
      <div
        className={`careid-drawer-backdrop ${isDrawerOpen ? 'drawer-open' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Shared CareID Sidebar */}
      <AdminSidebar
        activeNav="facilities"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
      />

      {/* Main Content Area (Stationary Topbar + Scrollable Canvas) */}
      <div className="careid-main-wrapper">
        {/* Top Navigation Bar */}
        <AdminHeader
          onOpenDrawer={() => setIsDrawerOpen(true)}
          searchValue={searchTerm}
          onSearchChange={(val) => {
            setSearchTerm(val);
            setCurrentPage(1);
          }}
          onNavigate={handleNav}
          showUploadRecord={false}
        />

        {/* Scrollable Main Content Canvas */}
        <main className="facilities-main-canvas" role="main">
          {/* Header & Add Action */}
          <div className="facilities-header-cluster">
            <div className="facilities-title-box">
              <nav aria-label="Breadcrumb" className="facilities-breadcrumbs">
                <button
                  type="button"
                  className="facilities-breadcrumb-root"
                  onClick={() => handleNav('/admin/dashboard')}
                >
                  Admin
                </button>
                <span className="facilities-breadcrumb-sep">
                  <ChevronRight size={13} />
                </span>
                <span className="facilities-breadcrumb-current" aria-current="page">
                  Facilities
                </span>
              </nav>
              <h1 className="facilities-heading">
                {t('facilities.directory.title', 'Facility Directory')}
              </h1>
              <p className="facilities-subtitle">
                {t(
                  'facilities.directory.subtitle',
                  'Manage registered clinical hospital campuses, surgical centers, and regional health facilities.'
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="facilities-export-btn"
                onClick={handleExportCSV}
                title="Export filtered list to CSV"
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                id="btn-add-facility"
                onClick={() => handleNav('/admin/facilities/create')}
                className="facilities-add-btn"
              >
                <Plus size={18} />
                <span>{t('facilities.directory.addFacility', 'Add Facility')}</span>
              </button>
            </div>
          </div>

          {/* KPI Stats Cards */}
          <section className="facilities-kpi-grid" aria-label="Facility Metrics">
            {/* Card 1: Total Facilities */}
            <div className="facilities-kpi-card">
              <div className="facilities-kpi-top">
                <span className="facilities-kpi-label">
                  {t('facilities.directory.stats.total', 'Total Facilities')}
                </span>
                <div className="facilities-kpi-icon-wrap purple">
                  <Building2 size={19} />
                </div>
              </div>
              <p className="facilities-kpi-value">
                {isLoading || isStatsLoading ? '...' : totalCount.toLocaleString()}
              </p>
            </div>

            {/* Card 2: Active Campuses */}
            <div className="facilities-kpi-card">
              <div className="facilities-kpi-top">
                <span className="facilities-kpi-label">
                  {t('facilities.directory.stats.active', 'Active Campuses')}
                </span>
                <div className="facilities-kpi-icon-wrap teal">
                  <CheckCircle2 size={19} />
                </div>
              </div>
              <p className="facilities-kpi-value">
                {isLoading || isStatsLoading ? '...' : activeCount.toLocaleString()}
              </p>
            </div>

            {/* Card 3: Pending Accreditation */}
            <div className="facilities-kpi-card">
              <div className="facilities-kpi-top">
                <span className="facilities-kpi-label">
                  {t('facilities.directory.stats.pending', 'Pending Review')}
                </span>
                <div className="facilities-kpi-icon-wrap amber">
                  <Clock size={19} />
                </div>
              </div>
              <p className="facilities-kpi-value">
                {isLoading || isStatsLoading ? '...' : pendingCount.toLocaleString()}
              </p>
            </div>

            {/* Card 4: Draft / Staging */}
            <div className="facilities-kpi-card">
              <div className="facilities-kpi-top">
                <span className="facilities-kpi-label">
                  {t('facilities.directory.stats.staging', 'Draft / Staging')}
                </span>
                <div className="facilities-kpi-icon-wrap neutral">
                  <Layers size={19} />
                </div>
              </div>
              <p className="facilities-kpi-value">
                {isLoading || isStatsLoading ? '...' : stagingCount.toLocaleString()}
              </p>
            </div>
          </section>

          {/* Filter & Search Bar */}
          <div className="facilities-filter-bar">
            <div className="facilities-search-box">
              <Search size={16} className="facilities-search-icon" />
              <input
                id={searchInputId}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t(
                  'facilities.directory.searchPlaceholder',
                  'Search by facility name, ID, city, or license...'
                )}
                className="facilities-search-input"
                aria-label="Search facilities"
              />
            </div>

            <div className="facilities-filter-controls">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="facilities-filter-select"
                aria-label="Filter by operational status"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Draft / Staging">Draft / Staging</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="facilities-filter-select"
                aria-label="Filter by facility type"
              >
                <option value="All">All Types</option>
                <option value="Hospital Campus">Hospital Campus</option>
                <option value="Ambulatory Surgical Center">Ambulatory Surgical Center</option>
                <option value="Specialty Clinic">Specialty Clinic</option>
                <option value="Diagnostic Center">Diagnostic Center</option>
                <option value="Community Health Center">Community Health Center</option>
              </select>
            </div>
          </div>

          {/* Facilities Table Card */}
          <div className="facilities-table-card">
            <div className="facilities-table-wrapper">
              <table className="facilities-table" aria-label="Registered healthcare facilities">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="col-name cursor-pointer select-none"
                      onClick={() => {
                        setSortBy(sortBy === 'name' ? 'default' : 'name');
                        setCurrentPage(1);
                      }}
                      title="Sort by Name"
                    >
                      Facility Name {sortBy === 'name' ? '↑' : ''}
                    </th>
                    <th
                      scope="col"
                      className="col-id cursor-pointer select-none"
                      onClick={() => {
                        setSortBy(sortBy === 'id' ? 'default' : 'id');
                        setCurrentPage(1);
                      }}
                      title="Sort by ID"
                    >
                      Facility ID {sortBy === 'id' ? '↑' : ''}
                    </th>
                    <th
                      scope="col"
                      className="col-type cursor-pointer select-none"
                      onClick={() => {
                        setSortBy(sortBy === 'type' ? 'default' : 'type');
                        setCurrentPage(1);
                      }}
                      title="Sort by Type"
                    >
                      Type {sortBy === 'type' ? '↑' : ''}
                    </th>
                    <th
                      scope="col"
                      className="col-location cursor-pointer select-none"
                      onClick={() => {
                        setSortBy(sortBy === 'location' ? 'default' : 'location');
                        setCurrentPage(1);
                      }}
                      title="Sort by Location"
                    >
                      Location {sortBy === 'location' ? '↑' : ''}
                    </th>
                    <th scope="col" className="col-license">
                      License / NPI
                    </th>
                    <th
                      scope="col"
                      className="col-status cursor-pointer select-none"
                      onClick={() => {
                        setSortBy(sortBy === 'status' ? 'default' : 'status');
                        setCurrentPage(1);
                      }}
                      title="Sort by Status"
                    >
                      Status {sortBy === 'status' ? '↑' : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={`facility-skeleton-${i}`} className="facility-skeleton-row">
                        <td>
                          <div className="flex flex-col gap-2 py-2">
                            <span className="w-48 h-4 bg-slate-200 rounded animate-pulse" />
                            <span className="w-32 h-3 bg-slate-100 rounded animate-pulse" />
                          </div>
                        </td>
                        <td>
                          <span className="w-24 h-5 bg-slate-200 rounded animate-pulse block" />
                        </td>
                        <td>
                          <span className="w-28 h-4 bg-slate-200 rounded animate-pulse block" />
                        </td>
                        <td>
                          <span className="w-32 h-4 bg-slate-200 rounded animate-pulse block" />
                        </td>
                        <td>
                          <span className="w-24 h-4 bg-slate-200 rounded animate-pulse block" />
                        </td>
                        <td>
                          <span className="w-16 h-6 bg-slate-200 rounded-full animate-pulse block" />
                        </td>
                      </tr>
                    ))
                  ) : isError ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <AlertCircle size={32} className="text-[#ba1a1a]" />
                          <div className="text-[#ba1a1a] font-semibold text-sm">
                            Failed to load facility records from backend
                          </div>
                          <div className="text-[#7a7583] text-xs max-w-md">
                            {(error as Error)?.message || 'An unexpected error occurred while communicating with the API.'}
                          </div>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#28006d] text-white rounded-full text-xs font-semibold hover:bg-[#1f0054] transition-colors"
                            onClick={handleRetryAll}
                          >
                            <RefreshCw size={13} />
                            <span>Retry Request</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedFacilities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="facilities-empty-state">
                        <div className="flex flex-col items-center justify-center py-8">
                          <Building2 size={36} className="text-slate-300 mb-2" />
                          <p className="text-sm font-semibold text-[#0b1c30]">No facilities found</p>
                          <p className="text-xs text-[#7a7583] mt-1">No facility records matched your search query or active filters.</p>
                          {(searchTerm || statusFilter !== 'All' || typeFilter !== 'All') && (
                            <button
                              type="button"
                              className="mt-3 text-xs font-semibold text-[#28006d] underline hover:text-[#1f0054]"
                              onClick={() => {
                                setSearchTerm('');
                                setStatusFilter('All');
                                setTypeFilter('All');
                                setCurrentPage(1);
                              }}
                            >
                              Reset all filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedFacilities.map((facility) => {
                      const statusClass =
                        facility.status === 'Active'
                          ? 'active'
                          : facility.status === 'Pending Review'
                          ? 'pending'
                          : 'draft';

                      return (
                        <tr
                          key={facility.id}
                          className="cursor-pointer hover:bg-[#f8f9ff] transition-colors"
                          onClick={() => handleNav(`/admin/facilities/${facility.id}`)}
                          tabIndex={0}
                          role="link"
                          aria-label={`View details for ${facility.legalName}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleNav(`/admin/facilities/${facility.id}`);
                            }
                          }}
                        >
                          <td>
                            <div className="facilities-cell-name">
                              <button
                                type="button"
                                className="facilities-primary-name text-left hover:text-[#28006d] transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNav(`/admin/facilities/${facility.id}`);
                                }}
                              >
                                {facility.legalName}
                              </button>
                              <span className="facilities-address-sub">{facility.streetAddress1}</span>
                            </div>
                          </td>
                          <td>
                            <span className="facilities-id-badge">{facility.facilityId}</span>
                          </td>
                          <td>
                            <span className="facilities-type-cell">{facility.facilityType}</span>
                          </td>
                          <td>
                            <span className="facilities-location-cell">
                              <MapPin size={14} className="text-[#00696b] shrink-0" />
                              <span>
                                {facility.city}, {facility.state} {facility.postalCode}
                              </span>
                            </span>
                          </td>
                          <td>
                            <div className="facilities-license-cell">
                              <span className="facilities-license-lic">{facility.clinicalLicense}</span>
                              <span className="facilities-license-npi">NPI: {facility.npiNumber}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`facilities-status-pill ${statusClass}`}>
                              <span className="facilities-status-dot" />
                              <span>{facility.status}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="facilities-pagination" aria-label="Facility Pagination">
              <p className="facilities-pagination-text">
                {t('facilities.directory.pagination.showing', {
                  start: startResult,
                  end: endResult,
                  total: totalResults.toLocaleString(),
                  defaultValue: `Showing ${startResult} to ${endResult} of ${totalResults.toLocaleString()} facilities`,
                })}
              </p>

              <div className="facilities-pagination-controls">
                <button
                  type="button"
                  className="facilities-page-btn"
                  disabled={safePage <= 1 || isLoading}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={`page-${pageNum}`}
                    type="button"
                    className={`facilities-page-btn ${safePage === pageNum ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  className="facilities-page-btn"
                  disabled={safePage >= totalPages || isLoading}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Snackbar Notifications */}
      {snackbarMessage && (
        <ActionSuccessSnackbar
          isVisible={Boolean(snackbarMessage)}
          message={snackbarMessage}
          onDismiss={() => setSnackbarMessage(null)}
        />
      )}
    </div>
  );
};

export default AdminFacilityDirectory;
