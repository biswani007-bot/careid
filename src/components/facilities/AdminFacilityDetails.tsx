import React, { useState, useId } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  ShieldCheck,
  Layers,
  Stethoscope,
  Users,
  Phone,
  PhoneCall,
  Mail,
  MapPin,
  Calendar,
  Navigation,
  Pencil,
  Plus,
  UserPlus,
  ExternalLink,
  Activity,
  Check,
  X,
  Search,
  Bell,
  Settings,
  HelpCircle,
  Menu,
  ShieldAlert,
  Clock,
} from 'lucide-react';

// Shell & Local Styles
import '../dashboard/AdminDashboard.css';
import './AdminFacilityDetails.css';

// Shared Shell Components
import AdminSidebar from '../common/AdminSidebar';

// Services & Queries
import {
  useFacilityQuery,
  useUpdateFacilityMutation,
  useMapDoctorMutation,
} from '../../services/facilityService';
import type { MappedDoctor } from '../../services/facilityService';
import { useDoctorsQuery } from '../../services/doctorService';
import type { DoctorItem } from '../../services/doctorService';

const editFacilitySchema = z.object({
  legalName: z.string().min(3, 'Facility legal name is required'),
  facilityType: z.string().min(1, 'Facility type is required'),
  clinicalLicense: z.string().min(1, 'Clinical license is required'),
  npiNumber: z.string().regex(/^\d{10}$/, 'NPI must be a 10-digit number'),
  status: z.enum(['Active', 'Pending Review', 'Draft / Staging']),
  streetAddress1: z.string().min(1, 'Street address is required'),
  streetAddress2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  mainTelephone: z.string().min(1, 'Main telephone is required'),
  emergencyTelephone: z.string().optional(),
  administrativeEmail: z.string().email('Please enter a valid email address'),
  tierBadge: z.string().optional(),
});

type EditFacilityFormValues = z.infer<typeof editFacilitySchema>;

export interface AdminFacilityDetailsProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminFacilityDetails: React.FC<AdminFacilityDetailsProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { facilityId } = useParams<{ facilityId: string }>();
  const searchInputId = useId();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'doctors' | 'staff' | 'governance'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMapDoctorModalOpen, setIsMapDoctorModalOpen] = useState(false);
  const [isAssignAdminModalOpen, setIsAssignAdminModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Map Doctor Form Local State
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('Associate Attending');
  const [selectedPrivilege, setSelectedPrivilege] = useState<'Verified & Active' | 'Pending Credential' | 'Dual-Privilege'>('Verified & Active');

  // Assign Admin Form Local State
  const [newAdminName, setNewAdminName] = useState<string>('');
  const [newAdminEmail, setNewAdminEmail] = useState<string>('');

  // Fetch Facility Record
  const { data: facility, isLoading, isError } = useFacilityQuery(facilityId || '');
  const { data: doctorsData } = useDoctorsQuery();
  const doctorDirectory: DoctorItem[] = doctorsData?.doctors || [];

  const updateMutation = useUpdateFacilityMutation();
  const mapDoctorMutation = useMapDoctorMutation();

  const handleNav = (path: string) => {
    setIsDrawerOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Edit Facility Form Setup
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditFacilityFormValues>({
    resolver: zodResolver(editFacilitySchema),
    values: facility
      ? {
          legalName: facility.legalName || '',
          facilityType: facility.facilityType || 'Hospital Campus',
          clinicalLicense: facility.clinicalLicense || '',
          npiNumber: facility.npiNumber || '',
          status: facility.status || 'Active',
          streetAddress1: facility.streetAddress1 || '',
          streetAddress2: facility.streetAddress2 || '',
          city: facility.city || '',
          state: facility.state || '',
          postalCode: facility.postalCode || '',
          country: facility.country || 'USA',
          mainTelephone: facility.mainTelephone || '',
          emergencyTelephone: facility.emergencyTelephone || '',
          administrativeEmail: facility.administrativeEmail || '',
          tierBadge: facility.tierBadge || 'Tier-1 Hub',
        }
      : undefined,
  });

  const onEditSubmit = async (values: EditFacilityFormValues) => {
    if (!facility) return;
    try {
      await updateMutation.mutateAsync({
        id: facility.id,
        updates: values,
      });
      setIsEditModalOpen(false);
      showToast(t('facilities.details.editModal.success', 'Facility details updated successfully.'));
    } catch {
      showToast('Failed to update facility. Please verify input fields.');
    }
  };

  const handleMapDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility || !selectedDoctorId) return;

    const matchedDoctor = doctorDirectory.find((d: DoctorItem) => d.id === selectedDoctorId);
    const doctorName = matchedDoctor ? matchedDoctor.name : 'Dr. Alexander Ward, MD';
    const doctorSpecialty = matchedDoctor ? matchedDoctor.specialty : 'Clinical Cardiology';
    const doctorNpi = matchedDoctor ? matchedDoctor.license : '1984029103';
    const initials = matchedDoctor
      ? `${matchedDoctor.firstName?.[0] || 'D'}${matchedDoctor.lastName?.[0] || 'R'}`
      : 'AW';

    const newMappedDoc: MappedDoctor = {
      id: selectedDoctorId,
      name: doctorName,
      hvId: matchedDoctor?.hvId || `HV-${Math.floor(39000 + Math.random() * 999)}`,
      npi: doctorNpi,
      specialty: doctorSpecialty,
      licenseNumber: matchedDoctor?.license || `NY-MED-${Math.floor(20000 + Math.random() * 70000)}`,
      clinicalRole: selectedRole,
      status: selectedPrivilege,
      initials,
      avatarBg: 'rgba(40, 0, 109, 0.1)',
      avatarColor: '#28006d',
    };

    try {
      await mapDoctorMutation.mutateAsync({
        facilityId: facility.id,
        doctor: newMappedDoc,
      });
      setIsMapDoctorModalOpen(false);
      setSelectedDoctorId('');
      showToast(t('facilities.details.mapModal.success', 'Doctor successfully mapped to facility.'));
    } catch {
      showToast('Error mapping doctor to facility.');
    }
  };

  const handleAssignAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility || !newAdminName.trim()) return;

    try {
      await updateMutation.mutateAsync({
        id: facility.id,
        updates: {
          initialAdmin: newAdminName.trim(),
          adminEmail: newAdminEmail.trim() || facility.adminEmail,
        },
      });
      setIsAssignAdminModalOpen(false);
      showToast(`Facility administrator re-assigned to ${newAdminName.trim()}`);
    } catch {
      showToast('Error assigning administrator.');
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="careid-dashboard-shell">
        <AdminSidebar
          activeNav="facilities"
          isDrawerOpen={isDrawerOpen}
          onCloseDrawer={() => setIsDrawerOpen(false)}
          onNavigate={handleNav}
          onLogout={onLogout}
        />
        <div className="careid-main-wrapper">
          <main className="facility-details-canvas">
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8">
              <div className="w-12 h-12 border-4 border-[#28006d]/20 border-t-[#28006d] rounded-full animate-spin mb-4" />
              <h2 className="text-lg font-bold text-[#0b1c30]">Loading Facility Details...</h2>
              <p className="text-sm text-[#7a7583]">Connecting to Care ID administrative directory</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Error / Not Found State
  if (isError || !facility) {
    return (
      <div className="careid-dashboard-shell">
        <AdminSidebar
          activeNav="facilities"
          isDrawerOpen={isDrawerOpen}
          onCloseDrawer={() => setIsDrawerOpen(false)}
          onNavigate={handleNav}
          onLogout={onLogout}
        />
        <div className="careid-main-wrapper">
          <main className="facility-details-canvas">
            <div className="facility-nav-strip">
              <div className="facility-back-and-crumbs">
                <button
                  type="button"
                  className="facility-btn-back"
                  onClick={() => handleNav('/admin/facilities')}
                >
                  <ArrowLeft size={15} />
                  <span>{t('facilities.details.backToDirectory', 'Back to Facility Directory')}</span>
                </button>
              </div>
            </div>

            <div className="facility-detail-card" style={{ maxWidth: '640px', margin: '40px auto', padding: '40px 32px', textAlign: 'center' }}>
              <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert size={32} />
              </div>
              <h2 className="text-xl font-bold text-[#0b1c30] mb-2">
                {t('facilities.details.notFound.title', 'Facility Not Found')}
              </h2>
              <p className="text-sm text-[#7a7583] mb-6 leading-relaxed">
                {t(
                  'facilities.details.notFound.desc',
                  'The healthcare facility record with ID "{{id}}" does not exist or has been removed.',
                  { id: facilityId }
                )}
              </p>
              <button
                type="button"
                onClick={() => handleNav('/admin/facilities')}
                className="facility-btn-action-mapdoc"
                style={{ margin: '0 auto' }}
              >
                <span>{t('facilities.details.notFound.backBtn', 'Back to Facility Directory')}</span>
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const mappedDoctors = facility.mappedDoctors || [];
  const assignedStaff = facility.assignedStaff || [];
  const auditEvents = facility.auditEvents || [];

  return (
    <div className="careid-dashboard-shell">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-[#0b1c30] text-white rounded-xl shadow-2xl border border-slate-700 animate-slide-in-right"
        >
          <div className="w-6 h-6 rounded-full bg-[#006a60] flex items-center justify-center text-white shrink-0">
            <Check size={14} />
          </div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

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

      {/* Main Container */}
      <div className="careid-main-wrapper">
        {/* Top Navbar */}
        <header className="careid-top-navbar" role="banner">
          <div className="careid-header-left">
            <button
              type="button"
              className="careid-mobile-toggle-btn md:hidden"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Toggle navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#7a7583] uppercase tracking-wider hidden sm:inline">
                Facility Record
              </span>
              <span className="text-xs font-mono font-bold text-[#28006d] bg-[#eff4ff] px-2 py-0.5 rounded border border-[#d3e4fe]">
                {facility.facilityId}
              </span>
            </div>
          </div>

          <div className="careid-header-center-search">
            <label htmlFor={searchInputId} className="sr-only">
              Search staff, doctors, rooms...
            </label>
            <Search
              size={16}
              className="careid-header-search-icon"
            />
            <input
              id={searchInputId}
              type="search"
              placeholder="Search staff, doctors, rooms..."
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
              aria-label="Help Center"
            >
              <HelpCircle size={18} />
            </button>

            <div className="w-px h-6 bg-[#cbc4d4] hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#28006d] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                SA
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-[#0b1c30] leading-none mb-0.5">Admin User</span>
                <span className="text-[11px] font-semibold text-[#00696b] leading-none">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Facility Details Canvas */}
        <main className="facility-details-canvas" role="main">
          {/* Top Back & Breadcrumbs & Status Strip */}
          <div className="facility-nav-strip">
            <div className="facility-back-and-crumbs">
              <button
                type="button"
                className="facility-btn-back"
                onClick={() => handleNav('/admin/facilities')}
              >
                <ArrowLeft size={14} />
                <span>{t('facilities.details.backToDirectory', 'Back to Facility Directory')}</span>
              </button>

              <nav aria-label="Breadcrumbs" className="facility-crumbs-trail">
                <button
                  type="button"
                  className="facility-crumb-link"
                  onClick={() => handleNav('/admin/dashboard')}
                >
                  Admin
                </button>
                <ChevronRight size={12} className="text-[#cbc4d4]" />
                <button
                  type="button"
                  className="facility-crumb-link"
                  onClick={() => handleNav('/admin/facilities')}
                >
                  Facilities
                </button>
                <ChevronRight size={12} className="text-[#cbc4d4]" />
                <span className="facility-crumb-current" aria-current="page">
                  {facility.legalName}
                </span>
              </nav>
            </div>

            <div className="facility-status-strip">
              <div className="facility-status-pill-lg">
                <span className="facility-status-dot-lg" />
                <span>{t('facilities.details.activeAndAccredited', 'Active & Accredited')}</span>
              </div>
              <div className="facility-fhir-pill">
                <ShieldCheck size={14} className="text-[#28006d]" />
                <span>{t('facilities.details.fhirLive', 'EHR FHIR v4.0.1 Live')}</span>
              </div>
            </div>
          </div>

          {/* Master Facility Header Card */}
          <section className="facility-master-card" aria-label="Facility Master Record">
            <div className="facility-master-top">
              <div className="facility-master-identity">
                <div className="facility-master-logo">
                  <Building2 size={28} />
                </div>
                <div className="facility-master-info">
                  <div className="facility-master-title-row">
                    <h1 className="facility-master-title">{facility.legalName}</h1>
                    <span className="facility-tier-badge">
                      {facility.tierBadge || t('facilities.details.tier1Hub', 'Tier-1 Hub')}
                    </span>
                  </div>
                  <div className="facility-master-meta">
                    <span className="facility-master-facid">{facility.facilityId}</span>
                    <span className="facility-master-type">{facility.facilityType}</span>
                    <div className="facility-master-bullets">
                      <span className="facility-meta-bullet">
                        Lic: <strong>{facility.clinicalLicense}</strong>
                      </span>
                      <span>•</span>
                      <span className="facility-meta-bullet">
                        NPI: <strong>{facility.npiNumber}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Cluster */}
              <div className="facility-master-actions">
                <button
                  type="button"
                  id="btn-edit-facility"
                  onClick={() => handleNav(`/admin/facilities/${facility.id}/edit`)}
                  className="facility-btn-action-edit"
                >
                  <Pencil size={15} />
                  <span>{t('facilities.details.editFacility', 'Edit Facility')}</span>
                </button>

                <button
                  type="button"
                  id="btn-map-doctor"
                  onClick={() => handleNav(`/admin/facilities/${facility.id}/map-doctor`)}
                  className="facility-btn-action-mapdoc"
                >
                  <Plus size={16} />
                  <span>{t('facilities.details.mapDoctor', '+ Map Doctor')}</span>
                </button>

                <button
                  type="button"
                  id="btn-map-staff"
                  onClick={() => handleNav(`/admin/facilities/${facility.id}/staff-mapping`)}
                  className="facility-btn-action-mapstaff"
                >
                  <UserPlus size={15} />
                  <span>{t('facilities.details.mapStaff', '+ Map Staff')}</span>
                </button>

                <button
                  type="button"
                  id="btn-assign-admin"
                  onClick={() => {
                    setNewAdminName(facility.initialAdmin || '');
                    setNewAdminEmail(facility.adminEmail || facility.administrativeEmail || '');
                    setIsAssignAdminModalOpen(true);
                  }}
                  className="facility-btn-action-assignadmin"
                >
                  <ShieldCheck size={15} />
                  <span>{t('facilities.details.assignAdmin', 'Assign Admin')}</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="facility-quick-metrics-strip" aria-label="Facility Quick Stats">
              <div className="facility-quick-metric-item">
                <div className="facility-quick-metric-icon-wrap purple">
                  <Stethoscope size={20} />
                </div>
                <div className="facility-quick-metric-text">
                  <span className="facility-quick-metric-val">
                    {(facility.activeDoctorsCount || mappedDoctors.length || 142).toLocaleString()}
                  </span>
                  <span className="facility-quick-metric-lbl">
                    {t('facilities.details.activeDoctors', 'Active Doctors')}
                  </span>
                </div>
              </div>

              <div className="facility-quick-metric-item">
                <div className="facility-quick-metric-icon-wrap teal">
                  <Users size={20} />
                </div>
                <div className="facility-quick-metric-text">
                  <span className="facility-quick-metric-val">
                    {(facility.medicalStaffCount || assignedStaff.length || 420).toLocaleString()}
                  </span>
                  <span className="facility-quick-metric-lbl">
                    {t('facilities.details.medicalStaff', 'Medical Staff')}
                  </span>
                </div>
              </div>

              <div className="facility-quick-metric-item">
                <div className="facility-quick-metric-icon-wrap blue">
                  <Layers size={20} />
                </div>
                <div className="facility-quick-metric-text">
                  <span className="facility-quick-metric-val">
                    {(facility.operatingSuitesCount || 12).toLocaleString()}
                  </span>
                  <span className="facility-quick-metric-lbl">
                    {t('facilities.details.operatingSuites', 'Operating Suites')}
                  </span>
                </div>
              </div>

              <div className="facility-quick-metric-item">
                <div className="facility-quick-metric-icon-wrap cyan">
                  <Activity size={20} />
                </div>
                <div className="facility-quick-metric-text">
                  <span className="facility-quick-metric-val">
                    {facility.clinicalOperationsHours || '24/7'}
                  </span>
                  <span className="facility-quick-metric-lbl">
                    {t('facilities.details.clinicalOperations', 'Clinical Operations')}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Interactive Navigation Filter Tabs */}
          <nav aria-label="Facility Record Views" className="facility-tabs-bar">
            <button
              type="button"
              className={`facility-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <Layers size={15} />
              <span>{t('facilities.details.tabs.overview', 'Overview & Capacity')}</span>
            </button>

            <button
              type="button"
              className={`facility-tab-btn ${activeTab === 'doctors' ? 'active' : ''}`}
              onClick={() => setActiveTab('doctors')}
            >
              <Stethoscope size={15} />
              <span>{t('facilities.details.tabs.mappedDoctors', 'Mapped Doctors')}</span>
              <span className="facility-tab-count-pill">{mappedDoctors.length}</span>
            </button>

            <button
              type="button"
              className={`facility-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
              onClick={() => setActiveTab('staff')}
            >
              <Users size={15} />
              <span>{t('facilities.details.tabs.assignedStaff', 'Assigned Staff')}</span>
              <span className="facility-tab-count-pill">{assignedStaff.length}</span>
            </button>

            <button
              type="button"
              className={`facility-tab-btn ${activeTab === 'governance' ? 'active' : ''}`}
              onClick={() => setActiveTab('governance')}
            >
              <ShieldCheck size={15} />
              <span>{t('facilities.details.tabs.governance', 'Facility Admin & Governance')}</span>
            </button>
          </nav>

          {/* 2-Column Responsive Content Grid */}
          <div className="facility-details-grid">
            {/* Left Column (8-col width on desktop) */}
            <div className="facility-details-col-left">
              {/* SECTION 1: Facility Information & Contact Nexus (Overview & Governance) */}
              {(activeTab === 'overview' || activeTab === 'governance') && (
                <article className="facility-detail-card" aria-label="Facility Contact Nexus">
                  <div className="facility-card-header-bar">
                    <div className="facility-card-heading-group">
                      <div className="facility-card-title-row">
                        <h2 className="facility-card-title">
                          {t('facilities.details.nexus.title', 'Facility Information & Contact Nexus')}
                        </h2>
                        <span className="facility-badge-cyan">
                          {t('facilities.details.nexus.hqVerified', 'HQ Verified')}
                        </span>
                      </div>
                      <p className="facility-card-subtitle">
                        Official registered coordinates, emergency response, and verified administrative contact channels.
                      </p>
                    </div>
                  </div>

                  <div className="facility-nexus-grid">
                    {/* Left Sub-Column */}
                    <div className="facility-nexus-subcol">
                      <div className="facility-nexus-field-item">
                        <div className="facility-nexus-icon-wrap purple">
                          <MapPin size={17} />
                        </div>
                        <div className="facility-nexus-field-content">
                          <span className="facility-nexus-field-lbl">
                            {t('facilities.details.nexus.locationTitle', 'PHYSICAL LOCATION')}
                          </span>
                          <span className="facility-nexus-field-val">
                            {facility.streetAddress1}
                            {facility.streetAddress2 ? `, ${facility.streetAddress2}` : ''}
                          </span>
                          <span className="facility-nexus-field-sub">
                            {facility.city}, {facility.state} {facility.postalCode}, {facility.country}
                          </span>
                        </div>
                      </div>

                      <div className="facility-nexus-field-item">
                        <div className="facility-nexus-icon-wrap teal">
                          <Phone size={17} />
                        </div>
                        <div className="facility-nexus-field-content">
                          <span className="facility-nexus-field-lbl">
                            {t('facilities.details.nexus.switchboard', 'Main Switchboard')}
                          </span>
                          <span className="facility-nexus-field-val">
                            {facility.mainTelephone}
                          </span>
                          <span className="facility-nexus-field-sub">
                            Ext: {facility.internalExtension || '4900 (Automated Attendant)'}
                          </span>
                        </div>
                      </div>

                      <div className="facility-nexus-field-item">
                        <div className="facility-nexus-icon-wrap red">
                          <PhoneCall size={17} />
                        </div>
                        <div className="facility-nexus-field-content">
                          <span className="facility-nexus-field-lbl">
                            {t('facilities.details.nexus.trauma', 'Trauma & Emergency')}
                          </span>
                          <span className="facility-nexus-field-val text-red-700">
                            {facility.emergencyTelephone || '+1 (555) 019-9911'}
                          </span>
                          <span className="facility-nexus-field-sub">
                            24/7 Level-1 Dedicated Triage Line
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Sub-Column */}
                    <div className="facility-nexus-subcol">
                      <div className="facility-nexus-field-item">
                        <div className="facility-nexus-icon-wrap purple">
                          <Mail size={17} />
                        </div>
                        <div className="facility-nexus-field-content">
                          <span className="facility-nexus-field-lbl">
                            {t('facilities.details.nexus.encryptedMail', 'Direct Encrypted Mail')}
                          </span>
                          <span className="facility-nexus-field-val font-mono">
                            {facility.administrativeEmail}
                          </span>
                          <span className="facility-nexus-field-sub">
                            TLS 1.3 Certified Healthcare Inbox
                          </span>
                        </div>
                      </div>

                      <div className="facility-nexus-field-item">
                        <div className="facility-nexus-icon-wrap">
                          <Calendar size={17} />
                        </div>
                        <div className="facility-nexus-field-content">
                          <span className="facility-nexus-field-lbl">
                            {t('facilities.details.nexus.timezoneTitle', 'TIMEZONE & INAUGURATION')}
                          </span>
                          <span className="facility-nexus-field-val">
                            {facility.timezone || 'Eastern Standard Time (UTC-05:00)'}
                          </span>
                          <span className="facility-nexus-field-sub">
                            Inaugurated: {facility.inaugurationDate || 'October 14, 2012'}
                          </span>
                        </div>
                      </div>

                      <div className="facility-nexus-field-item">
                        <div className="facility-nexus-icon-wrap teal">
                          <Navigation size={17} />
                        </div>
                        <div className="facility-nexus-field-content">
                          <span className="facility-nexus-field-lbl">
                            GPS COORDINATES
                          </span>
                          <span className="facility-nexus-field-val font-mono">
                            {facility.gpsCoordinates || '40.7589° N, 73.9851° W'}
                          </span>
                          <span className="facility-nexus-field-sub">
                            Elevation: 22m • Geocoded by CareID Core
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              )}

              {/* SECTION 2: Mapped Doctors Table (Overview & Doctors tab) */}
              {(activeTab === 'overview' || activeTab === 'doctors') && (
                <article className="facility-detail-card" aria-label="Mapped Doctors">
                  <div className="facility-card-header-bar">
                    <div className="facility-card-heading-group">
                      <div className="facility-card-title-row">
                        <h2 className="facility-card-title">
                          {t('facilities.details.doctors.title', 'Mapped Doctors')}
                        </h2>
                        <span className="facility-badge-count">
                          {mappedDoctors.length} {t('facilities.details.doctors.total', 'Total')}
                        </span>
                      </div>
                      <p className="facility-card-subtitle">
                        {t(
                          'facilities.details.doctors.subtitle',
                          'Accredited attending, surgical, and specialist practitioners linked to Care ID credentialing.'
                        )}
                      </p>
                    </div>

                    <div className="facility-card-header-actions">
                      <button
                        type="button"
                        id="btn-section-map-doctor"
                        onClick={() => handleNav(`/admin/facilities/${facility.id}/map-doctor`)}
                        className="facility-btn-action-mapdoc"
                        style={{ height: '34px', fontSize: '12px', padding: '0 14px' }}
                      >
                        <Plus size={14} />
                        <span>{t('facilities.details.doctors.mapDoctorBtn', 'Map Doctor')}</span>
                      </button>
                    </div>
                  </div>

                  <div className="facility-card-table-wrapper">
                    <table className="facility-sub-table">
                      <thead>
                        <tr>
                          <th scope="col">{t('facilities.details.doctors.table.doctorName', 'Doctor Name')}</th>
                          <th scope="col">{t('facilities.details.doctors.table.specialty', 'Specialty')}</th>
                          <th scope="col">{t('facilities.details.doctors.table.license', 'License #')}</th>
                          <th scope="col">{t('facilities.details.doctors.table.clinicalRole', 'Clinical Role')}</th>
                          <th scope="col">{t('facilities.details.doctors.table.status', 'Status')}</th>
                          <th scope="col" style={{ textAlign: 'right' }}>
                            {t('facilities.details.doctors.table.actions', 'Actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {mappedDoctors.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#7a7583' }}>
                              {t('facilities.details.doctors.empty', 'No accredited doctors mapped to this facility.')}
                            </td>
                          </tr>
                        ) : (
                          mappedDoctors.map((doc) => (
                            <tr key={doc.id}>
                              <td>
                                <div className="facility-doc-name-cell">
                                  <div
                                    className="facility-doc-avatar"
                                    style={{
                                      backgroundColor: doc.avatarBg || 'rgba(40, 0, 109, 0.1)',
                                      color: doc.avatarColor || '#28006d',
                                    }}
                                  >
                                    {doc.initials}
                                  </div>
                                  <div className="facility-doc-text-wrap">
                                    <button
                                      type="button"
                                      className="facility-doc-name text-left hover:text-[#28006d] transition-colors"
                                      onClick={() => handleNav(`/admin/doctors/${doc.id}`)}
                                    >
                                      {doc.name}
                                    </button>
                                    <span className="facility-doc-npi">
                                      {doc.hvId || 'HV-DOC'} • NPI: {doc.npi}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="font-semibold text-[#0b1c30]">{doc.specialty}</span>
                              </td>
                              <td>
                                <span className="font-mono text-xs font-semibold text-[#494552]">
                                  {doc.licenseNumber}
                                </span>
                              </td>
                              <td>
                                <span className="facility-role-chip">{doc.clinicalRole}</span>
                              </td>
                              <td>
                                <span className="facility-status-pill-sm">
                                  <span className="facility-status-dot-lg" style={{ width: '6px', height: '6px' }} />
                                  <span>{doc.status}</span>
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="facility-btn-row-action"
                                  onClick={() => handleNav(`/admin/doctors/${doc.id}`)}
                                  title="View Doctor Profile"
                                  aria-label={`View ${doc.name} Profile`}
                                >
                                  <ExternalLink size={15} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              )}

              {/* SECTION 3: Assigned Clinical Staff Table (Overview & Staff tab) */}
              {(activeTab === 'overview' || activeTab === 'staff') && (
                <article className="facility-detail-card" aria-label="Assigned Clinical Staff">
                  <div className="facility-card-header-bar">
                    <div className="facility-card-heading-group">
                      <div className="facility-card-title-row">
                        <h2 className="facility-card-title">
                          {t('facilities.details.staff.title', 'Assigned Clinical Staff')}
                        </h2>
                        <span className="facility-badge-cyan">
                          {assignedStaff.length} {t('facilities.details.staff.active', 'Active')}
                        </span>
                      </div>
                      <p className="facility-card-subtitle">
                        {t(
                          'facilities.details.staff.subtitle',
                          'Specialized nurses, perfusionists, surgical techs, and cath suite navigators.'
                        )}
                      </p>
                    </div>

                    <div className="facility-card-header-actions">
                      <button
                        type="button"
                        id="btn-section-map-staff"
                        onClick={() => handleNav(`/admin/facilities/${facility?.id || 'fac-1'}/staff-mapping`)}
                        className="facility-btn-action-mapstaff"
                        style={{ height: '34px', fontSize: '12px', padding: '0 14px' }}
                      >
                        <UserPlus size={14} />
                        <span>{t('facilities.details.staff.mapStaffBtn', 'Map Staff')}</span>
                      </button>
                    </div>
                  </div>

                  <div className="facility-card-table-wrapper">
                    <table className="facility-sub-table">
                      <thead>
                        <tr>
                          <th scope="col">{t('facilities.details.staff.table.staffName', 'Staff Name')}</th>
                          <th scope="col">{t('facilities.details.staff.table.role', 'Role Designation')}</th>
                          <th scope="col">{t('facilities.details.staff.table.department', 'Department / Suite')}</th>
                          <th scope="col">{t('facilities.details.staff.table.shift', 'Shift Roster')}</th>
                          <th scope="col">{t('facilities.details.staff.table.status', 'Status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignedStaff.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#7a7583' }}>
                              {t('facilities.details.staff.empty', 'No clinical staff assigned to this facility.')}
                            </td>
                          </tr>
                        ) : (
                          assignedStaff.map((staff) => (
                            <tr key={staff.id}>
                              <td>
                                <span className="font-bold text-[#0b1c30]">{staff.name}</span>
                              </td>
                              <td>
                                <span className="text-xs font-semibold text-[#28006d]">
                                  {staff.roleDesignation}
                                </span>
                              </td>
                              <td>
                                <span className="text-xs text-[#494552]">{staff.departmentSuite}</span>
                              </td>
                              <td>
                                <span className="font-mono text-xs text-[#7a7583]">{staff.shiftRoster}</span>
                              </td>
                              <td>
                                <span className="facility-status-pill-sm">
                                  <span className="facility-status-dot-lg" style={{ width: '6px', height: '6px' }} />
                                  <span>{staff.status}</span>
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              )}
            </div>

            {/* Right Column (4-col width on desktop) */}
            <div className="facility-details-col-right">
              {/* CARD 1: Facility Administrator (Governance ID Card) */}
              <aside className="facility-admin-card" aria-label="Facility Governance Officer">
                <div className="facility-admin-accent-bar" />
                <div className="facility-admin-card-inner">
                  <div className="facility-admin-card-header">
                    <span className="facility-admin-card-label">
                      {t('facilities.details.governance.officerLabel', 'FACILITY GOVERNANCE OFFICER')}
                    </span>
                    <span className="facility-admin-auth-badge">
                      {t('facilities.details.governance.activeAuth', 'Active & Authenticated')}
                    </span>
                  </div>

                  <div className="facility-admin-profile-row">
                    <div className="facility-admin-avatar">
                      {facility.initialAdmin
                        ? facility.initialAdmin
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase()
                        : 'ER'}
                    </div>
                    <div className="facility-admin-details">
                      <span className="facility-admin-name">
                        {facility.initialAdmin || 'Elena Rostova, MHA'}
                      </span>
                      <span className="facility-admin-role">Chief Operating Officer & Administrator</span>
                      <span className="facility-admin-date">
                        {t('facilities.details.governance.assignedBy', 'Assigned by Super Admin')}
                      </span>
                    </div>
                  </div>

                  <div className="facility-admin-contacts">
                    <div className="facility-admin-contact-item">
                      <Mail size={14} className="text-[#28006d]" />
                      <span className="font-mono font-medium">
                        {facility.adminEmail || facility.administrativeEmail}
                      </span>
                    </div>
                    <div className="facility-admin-contact-item">
                      <Phone size={14} className="text-[#006a60]" />
                      <span>{facility.mainTelephone} • Ext. 4012</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setNewAdminName(facility.initialAdmin || '');
                      setNewAdminEmail(facility.adminEmail || facility.administrativeEmail || '');
                      setIsAssignAdminModalOpen(true);
                    }}
                    className="facility-btn-reassign"
                  >
                    <ShieldCheck size={15} />
                    <span>{t('facilities.details.governance.reassignBtn', 'Change / Reassign Admin')}</span>
                  </button>
                </div>
              </aside>

              {/* CARD 2: Capacity & Operational Telemetry */}
              <article className="facility-detail-card" aria-label="Capacity and Operational Telemetry">
                <div className="facility-card-header-bar">
                  <div className="facility-card-heading-group">
                    <div className="facility-card-title-row">
                      <h2 className="facility-card-title">
                        {t('facilities.details.capacity.title', 'Capacity & Infrastructure')}
                      </h2>
                      <span className="facility-badge-cyan">
                        {t('facilities.details.capacity.healthy', 'Healthy')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="facility-capacity-inner">
                  <div className="facility-progress-section">
                    <div className="facility-progress-meta">
                      <span>{t('facilities.details.capacity.suitesAllocation', 'Cath & Surgical Suites Allocation')}</span>
                      <span>{facility.utilizationPercent || 94}% {t('facilities.details.capacity.utilization', 'Utilization')}</span>
                    </div>
                    <div className="facility-progress-track">
                      <div
                        className="facility-progress-fill"
                        style={{ width: `${facility.utilizationPercent || 94}%` }}
                      />
                    </div>
                  </div>

                  <div className="facility-telemetry-list">
                    <div className="facility-telemetry-row">
                      <span className="facility-telemetry-key">
                        <Building2 size={14} />
                        <span>{t('facilities.details.capacity.totalBays', 'Total Certified Bays')}</span>
                      </span>
                      <span className="facility-telemetry-val">
                        {facility.suitesAllocation || '480 Inpatient / 64 ICU'}
                      </span>
                    </div>

                    <div className="facility-telemetry-row">
                      <span className="facility-telemetry-key">
                        <Activity size={14} />
                        <span>{t('facilities.details.capacity.ehrPipeline', 'EHR Core Pipeline')}</span>
                      </span>
                      <span className="facility-telemetry-badge">
                        {facility.infrastructureHealth || '99.98% Telemetry Normal'}
                      </span>
                    </div>

                    <div className="facility-telemetry-row">
                      <span className="facility-telemetry-key">
                        <ShieldCheck size={14} />
                        <span>{t('facilities.details.capacity.dataEncryption', 'Data Encryption')}</span>
                      </span>
                      <span className="facility-telemetry-val">AES-256 GCM</span>
                    </div>

                    <div className="facility-telemetry-row">
                      <span className="facility-telemetry-key">
                        <Clock size={14} />
                        <span>{t('facilities.details.capacity.networkSync', 'Care ID Network Sync')}</span>
                      </span>
                      <span className="facility-telemetry-val text-[#006a60]">
                        {t('facilities.details.capacity.subSecond', 'Sub-second')}
                      </span>
                    </div>
                  </div>
                </div>
              </article>

              {/* CARD 3: Activity & Audit Ledger */}
              <article className="facility-detail-card" aria-label="Facility Activity and Audit Events">
                <div className="facility-card-header-bar">
                  <h2 className="facility-card-title">
                    {t('facilities.details.audit.title', 'Facility Activity & Audit')}
                  </h2>
                </div>

                <div className="facility-audit-inner">
                  <div className="facility-audit-timeline">
                    {auditEvents.map((evt) => (
                      <div key={evt.id} className="facility-audit-item">
                        <div
                          className={`facility-audit-dot ${
                            evt.category === 'accreditation'
                              ? 'green'
                              : evt.category === 'staff'
                              ? 'blue'
                              : ''
                          }`}
                        >
                          <Check size={9} strokeWidth={3} />
                        </div>
                        <div className="facility-audit-content">
                          <span className="facility-audit-timestamp">{evt.timestamp}</span>
                          <span className="facility-audit-desc">{evt.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => showToast('Full audit log export opened in cryptographic ledger view.')}
                    className="facility-audit-link"
                  >
                    <span>{t('facilities.details.audit.viewEvents', 'View Full Audit Events')}</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </article>
            </div>
          </div>
        </main>
      </div>

      {/* ==========================================================================
          MODAL: EDIT FACILITY DETAILS
          ========================================================================== */}
      {isEditModalOpen && (
        <div
          className="facility-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-facility-title"
        >
          <div className="facility-modal-card">
            <div className="facility-modal-header">
              <div>
                <h3 id="edit-facility-title" className="facility-modal-title">
                  {t('facilities.details.editModal.title', 'Edit Facility Details')}
                </h3>
                <p className="facility-modal-subtitle">
                  {t(
                    'facilities.details.editModal.subtitle',
                    'Update operational and administrative credentials for this facility.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onEditSubmit)} className="flex flex-col flex-1 overflow-hidden">
              <div className="facility-modal-body">
                {/* Legal Name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-legalName" className="text-xs font-bold text-[#0b1c30]">
                    Facility Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-legalName"
                    type="text"
                    {...register('legalName')}
                    className="px-3 py-2 text-sm border border-[#e1e2e4] rounded-lg focus:outline-none focus:border-[#28006d]"
                  />
                  {errors.legalName && (
                    <span className="text-xs text-red-600">{errors.legalName.message}</span>
                  )}
                </div>

                {/* Facility Type & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="edit-facilityType" className="text-xs font-bold text-[#0b1c30]">
                      Facility Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="edit-facilityType"
                      {...register('facilityType')}
                      className="px-3 py-2 text-sm border border-[#e1e2e4] rounded-lg focus:outline-none focus:border-[#28006d] bg-white"
                    >
                      <option value="Hospital Campus">Hospital Campus</option>
                      <option value="Ambulatory Surgical Center">Ambulatory Surgical Center</option>
                      <option value="Specialty Clinic">Specialty Clinic</option>
                      <option value="Diagnostic Center">Diagnostic Center</option>
                      <option value="Urgent Care Center">Urgent Care Center</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="edit-status" className="text-xs font-bold text-[#0b1c30]">
                      Operating Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="edit-status"
                      {...register('status')}
                      className="px-3 py-2 text-sm border border-[#e1e2e4] rounded-lg focus:outline-none focus:border-[#28006d] bg-white"
                    >
                      <option value="Active">Active</option>
                      <option value="Pending Review">Pending Review</option>
                      <option value="Draft / Staging">Draft / Staging</option>
                    </select>
                  </div>
                </div>

                {/* License & NPI */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="edit-clinicalLicense" className="text-xs font-bold text-[#0b1c30]">
                      Clinical License <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="edit-clinicalLicense"
                      type="text"
                      {...register('clinicalLicense')}
                      className="px-3 py-2 text-sm font-mono border border-[#e1e2e4] rounded-lg focus:outline-none focus:border-[#28006d]"
                    />
                    {errors.clinicalLicense && (
                      <span className="text-xs text-red-600">{errors.clinicalLicense.message}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="edit-npiNumber" className="text-xs font-bold text-[#0b1c30]">
                      NPI / Institutional ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="edit-npiNumber"
                      type="text"
                      maxLength={10}
                      {...register('npiNumber')}
                      className="px-3 py-2 text-sm font-mono border border-[#e1e2e4] rounded-lg focus:outline-none focus:border-[#28006d]"
                    />
                    {errors.npiNumber && (
                      <span className="text-xs text-red-600">{errors.npiNumber.message}</span>
                    )}
                  </div>
                </div>

                {/* Street Address */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-streetAddress1" className="text-xs font-bold text-[#0b1c30]">
                    Street Address Line 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-streetAddress1"
                    type="text"
                    {...register('streetAddress1')}
                    className="px-3 py-2 text-sm border border-[#e1e2e4] rounded-lg focus:outline-none focus:border-[#28006d]"
                  />
                  {errors.streetAddress1 && (
                    <span className="text-xs text-red-600">{errors.streetAddress1.message}</span>
                  )}
                </div>

                {/* City, State, Postal Code */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="edit-city" className="text-xs font-bold text-[#0b1c30]">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="edit-city"
                      type="text"
                      {...register('city')}
                      className="px-3 py-2 text-sm border border-[#e1e2e4] rounded-lg focus:outline-none focus:border-[#28006d]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="edit-state" className="text-xs font-bold text-[#0b1c30]">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="edit-state"
                      type="text"
                      {...register('state')}
                      className="px-3 py-2 text-sm border border-[#e1e2e4] rounded-lg focus:outline-none focus:border-[#28006d]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="edit-postalCode" className="text-xs font-bold text-[#0b1c30]">
                      Postal Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="edit-postalCode"
                      type="text"
                      {...register('postalCode')}
                      className="px-3 py-2 text-sm border border-[#e1e2e4] rounded-lg focus:outline-none focus:border-[#28006d]"
                    />
                  </div>
                </div>

                {/* Phone & Admin Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="edit-mainTelephone" className="text-xs font-bold text-[#0b1c30]">
                      Main Telephone <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="edit-mainTelephone"
                      type="text"
                      {...register('mainTelephone')}
                      className="px-3 py-2 text-sm border border-[#e1e2e4] rounded-lg focus:outline-none focus:border-[#28006d]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="edit-administrativeEmail" className="text-xs font-bold text-[#0b1c30]">
                      Administrative Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="edit-administrativeEmail"
                      type="email"
                      {...register('administrativeEmail')}
                      className="px-3 py-2 text-sm font-mono border border-[#e1e2e4] rounded-lg focus:outline-none focus:border-[#28006d]"
                    />
                    {errors.administrativeEmail && (
                      <span className="text-xs text-red-600">
                        {errors.administrativeEmail.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="facility-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#494552] hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('facilities.details.editModal.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || updateMutation.isPending}
                  className="facility-btn-action-mapdoc"
                  style={{ height: '36px', fontSize: '12.5px' }}
                >
                  <Check size={15} />
                  <span>
                    {updateMutation.isPending
                      ? 'Saving...'
                      : t('facilities.details.editModal.save', 'Save Changes')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL: MAP DOCTOR TO FACILITY
          ========================================================================== */}
      {isMapDoctorModalOpen && (
        <div
          className="facility-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="map-doctor-title"
        >
          <div className="facility-modal-card" style={{ maxWidth: '520px' }}>
            <div className="facility-modal-header">
              <div>
                <h3 id="map-doctor-title" className="facility-modal-title">
                  {t('facilities.details.mapModal.title', 'Map Doctor to Facility')}
                </h3>
                <p className="facility-modal-subtitle">
                  {t(
                    'facilities.details.mapModal.subtitle',
                    'Select an accredited doctor and assign clinical operating privileges.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMapDoctorModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleMapDoctorSubmit} className="flex flex-col flex-1">
              <div className="facility-modal-body">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="map-select-doc" className="text-xs font-bold text-[#0b1c30]">
                    {t('facilities.details.mapModal.selectDoctor', 'Select Doctor')}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="map-select-doc"
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    required
                    className="px-3 py-2 text-sm border border-[#e1e2e4] rounded-lg focus:outline-none focus:border-[#28006d] bg-white"
                  >
                    <option value="">-- Choose Accredited Physician --</option>
                    {doctorDirectory.map((doc: DoctorItem) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} — {doc.specialty} ({doc.hvId})
                      </option>
                    ))}
                    <option value="doc-new-1">Dr. Raymond Chen, MD — Pediatric Surgery (HV-55214)</option>
                    <option value="doc-new-2">Dr. Alistair Finch, MD — Neuro-Intervention (HV-61029)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="map-clinical-role" className="text-xs font-bold text-[#0b1c30]">
                    Clinical Role Designation <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="map-clinical-role"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="px-3 py-2 text-sm border border-[#e1e2e4] rounded-lg focus:outline-none focus:border-[#28006d] bg-white"
                  >
                    <option value="Attending Chief">Attending Chief</option>
                    <option value="Attending Surgeon">Attending Surgeon</option>
                    <option value="Associate Attending">Associate Attending</option>
                    <option value="Consulting Specialist">Consulting Specialist</option>
                    <option value="Interventional Fellow">Interventional Fellow</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="map-privilege-level" className="text-xs font-bold text-[#0b1c30]">
                    {t('facilities.details.mapModal.privilegeLevel', 'Clinical Privilege Level')}
                  </label>
                  <select
                    id="map-privilege-level"
                    value={selectedPrivilege}
                    onChange={(e) =>
                      setSelectedPrivilege(
                        e.target.value as 'Verified & Active' | 'Pending Credential' | 'Dual-Privilege'
                      )
                    }
                    className="px-3 py-2 text-sm border border-[#e1e2e4] rounded-lg focus:outline-none focus:border-[#28006d] bg-white"
                  >
                    <option value="Verified & Active">Verified & Active (Full Admitting Privileges)</option>
                    <option value="Dual-Privilege">Dual-Privilege (Campus Affiliate)</option>
                    <option value="Pending Credential">Pending Credential Verification</option>
                  </select>
                </div>
              </div>

              <div className="facility-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsMapDoctorModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#494552] hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('facilities.details.mapModal.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!selectedDoctorId || mapDoctorMutation.isPending}
                  className="facility-btn-action-mapdoc"
                  style={{ height: '36px', fontSize: '12.5px' }}
                >
                  <Plus size={15} />
                  <span>
                    {mapDoctorMutation.isPending
                      ? 'Mapping...'
                      : t('facilities.details.mapModal.confirm', 'Confirm & Map Doctor')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL: REASSIGN ADMINISTRATOR
          ========================================================================== */}
      {isAssignAdminModalOpen && (
        <div
          className="facility-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-admin-title"
        >
          <div className="facility-modal-card" style={{ maxWidth: '480px' }}>
            <div className="facility-modal-header">
              <div>
                <h3 id="assign-admin-title" className="facility-modal-title">
                  {t('facilities.details.governance.reassignBtn', 'Change / Reassign Admin')}
                </h3>
                <p className="facility-modal-subtitle">
                  Designate an authorized signatory and operational administrator for this facility.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignAdminModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignAdminSubmit} className="flex flex-col flex-1">
              <div className="facility-modal-body">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="assign-admin-name" className="text-xs font-bold text-[#0b1c30]">
                    Administrator Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="assign-admin-name"
                    type="text"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    required
                    placeholder="e.g. Dr. Arthur Vance, MHA"
                    className="px-3 py-2 text-sm border border-[#e1e2e4] rounded-lg focus:outline-none focus:border-[#28006d]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="assign-admin-email" className="text-xs font-bold text-[#0b1c30]">
                    Administrator Encrypted Email
                  </label>
                  <input
                    id="assign-admin-email"
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="e.g. admin@metrohealth.org"
                    className="px-3 py-2 text-sm font-mono border border-[#e1e2e4] rounded-lg focus:outline-none focus:border-[#28006d]"
                  />
                </div>
              </div>

              <div className="facility-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsAssignAdminModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#494552] hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newAdminName.trim() || updateMutation.isPending}
                  className="facility-btn-action-mapdoc"
                  style={{ height: '36px', fontSize: '12.5px' }}
                >
                  <ShieldCheck size={15} />
                  <span>{updateMutation.isPending ? 'Updating...' : 'Save Administrator'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFacilityDetails;
