import React, { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Search,
  Bell,
  Settings,
  HelpCircle,
  Plus,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  ChevronRight,
} from 'lucide-react';

// Shell Styling
import '../dashboard/AdminDashboard.css';
import './AdminFacilityDirectory.css';

// Shared Shell
import AdminSidebar from '../common/AdminSidebar';

// Service & Hooks
import { useFacilitiesQuery } from '../../services/facilityService';

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  const { data: facilities = [], isLoading } = useFacilitiesQuery();

  const handleNav = (path: string) => {
    setIsDrawerOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const filteredFacilities = facilities.filter((fac) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      fac.legalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.facilityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.clinicalLicense.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.npiNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || fac.status === statusFilter;
    const matchesType = typeFilter === 'All' || fac.facilityType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const totalCount = facilities.length;
  const activeCount = facilities.filter((f) => f.status === 'Active').length;
  const pendingCount = facilities.filter((f) => f.status === 'Pending Review').length;
  const stagingCount = facilities.filter((f) => f.status === 'Draft / Staging').length;

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
        <header className="careid-top-navbar" role="banner">
          <div className="careid-header-left">
            <button
              type="button"
              className="careid-mobile-toggle-btn md:hidden"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-sm font-semibold">
              <span className="text-[#494552]">/</span>
              <span className="text-[#0b1c30] font-bold">Admin Portal</span>
            </div>
          </div>

          <div className="careid-header-center-search">
            <Search size={16} className="careid-header-search-icon" />
            <input
              type="text"
              placeholder="Search facilities, patients, logs..."
              className="careid-header-search-input"
            />
          </div>

          <div className="careid-header-right">
            <button
              type="button"
              className="p-2 text-[#494552] hover:text-[#28006d] hover:bg-[#f2f4f6] rounded-lg transition-colors relative"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ba1a1a] rounded-full" />
            </button>
            <button
              type="button"
              className="p-2 text-[#494552] hover:text-[#28006d] hover:bg-[#f2f4f6] rounded-lg transition-colors hidden sm:inline-flex"
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>
            <button
              type="button"
              className="p-2 text-[#494552] hover:text-[#28006d] hover:bg-[#f2f4f6] rounded-lg transition-colors hidden sm:inline-flex"
              aria-label="Help"
            >
              <HelpCircle size={18} />
            </button>
            <div className="w-px h-6 bg-[#cbc4d4] hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#28006d] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                A
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-[#0b1c30] leading-none mb-0.5">Admin User</span>
                <span className="text-[11px] font-semibold text-[#00696b] leading-none">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

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
              <p className="facilities-kpi-value">{totalCount.toLocaleString()}</p>
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
              <p className="facilities-kpi-value">{activeCount.toLocaleString()}</p>
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
              <p className="facilities-kpi-value">{pendingCount.toLocaleString()}</p>
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
              <p className="facilities-kpi-value">{stagingCount.toLocaleString()}</p>
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
                onChange={(e) => setSearchTerm(e.target.value)}
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
                onChange={(e) => setStatusFilter(e.target.value)}
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
                onChange={(e) => setTypeFilter(e.target.value)}
                className="facilities-filter-select"
                aria-label="Filter by facility type"
              >
                <option value="All">All Types</option>
                <option value="Hospital Campus">Hospital Campus</option>
                <option value="Ambulatory Surgical Center">Ambulatory Surgical Center</option>
                <option value="Specialty Clinic">Specialty Clinic</option>
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
                    <th scope="col" className="col-name">Facility Name</th>
                    <th scope="col" className="col-id">Facility ID</th>
                    <th scope="col" className="col-type">Type</th>
                    <th scope="col" className="col-location">Location</th>
                    <th scope="col" className="col-license">License / NPI</th>
                    <th scope="col" className="col-status">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="facilities-empty-state">
                        Loading registered facilities...
                      </td>
                    </tr>
                  ) : filteredFacilities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="facilities-empty-state">
                        No facilities found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredFacilities.map((facility) => {
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminFacilityDirectory;
