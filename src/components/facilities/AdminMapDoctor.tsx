import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowLeft,
  Search,
  Check,
  AlertTriangle,
  Lock,
  ChevronRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

// Shell & Local Styles
import '../dashboard/AdminDashboard.css';
import './AdminMapDoctor.css';

// Shared Shell Components
import AdminSidebar from '../common/AdminSidebar';

// Services & Queries
import {
  useFacilityQuery,
  useMapDoctorMutation,
  type MappedDoctor,
} from '../../services/facilityService';
import {
  useDoctorsQuery,
  type DoctorItem,
} from '../../services/doctorService';

// Validation Schema
const mapDoctorSchema = z.object({
  privilegeLevel: z.string().min(1, 'facilities.mapDoctorScreen.drawer.form.privilegeLevelRequired'),
  department: z.string().min(1, 'Department assignment is required'),
  operatingSuites: z.array(z.string()).min(1, 'Please select at least one operating suite'),
  effectiveDate: z.string().min(1, 'Effective start date is required'),
  notes: z.string().optional(),
});

type MapDoctorFormValues = z.infer<typeof mapDoctorSchema>;

export interface AdminMapDoctorProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminMapDoctor: React.FC<AdminMapDoctorProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { facilityId, doctorId } = useParams<{ facilityId?: string; doctorId?: string }>();

  // State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [affiliationFilter, setAffiliationFilter] = useState('All');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctorId || 'doc-amanda-foster');

  // Facility Query
  const effectiveFacilityId = facilityId || 'fac-1';
  const {
    data: facility,
    isLoading: isFacilityLoading,
    isError: isFacilityError,
  } = useFacilityQuery(effectiveFacilityId);

  // Doctors Query
  const {
    data: doctorsData,
    isLoading: isDoctorsLoading,
  } = useDoctorsQuery({ limit: 50 });

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
    }, 4500);
  };

  // Doctors List
  const allDoctors = useDoctorsQuery().data?.doctors || doctorsData?.doctors || [];

  // Check which doctors are already mapped to this facility
  const mappedDoctorIds = useMemo(() => {
    if (!facility?.mappedDoctors) return new Set<string>();
    return new Set(facility.mappedDoctors.map((d) => d.id || d.npi));
  }, [facility]);

  // Filtered Doctors for Directory
  const filteredDoctors = useMemo(() => {
    return allDoctors.filter((doc) => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = doc.name.toLowerCase().includes(query);
        const matchesNpi = (doc.npi || '').includes(query);
        const matchesLic = (doc.license || '').toLowerCase().includes(query);
        const matchesSpec = doc.specialty.toLowerCase().includes(query);
        const matchesDept = (doc.department || '').toLowerCase().includes(query);
        if (!matchesName && !matchesNpi && !matchesLic && !matchesSpec && !matchesDept) {
          return false;
        }
      }

      // Specialty filter
      if (selectedSpecialty !== 'All') {
        if (!doc.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase())) {
          return false;
        }
      }

      // Affiliation filter
      if (affiliationFilter === 'Unmapped') {
        if (mappedDoctorIds.has(doc.id) || (doc.npi && mappedDoctorIds.has(doc.npi))) {
          return false;
        }
      } else if (affiliationFilter === 'Mapped') {
        if (!mappedDoctorIds.has(doc.id) && (!doc.npi || !mappedDoctorIds.has(doc.npi))) {
          return false;
        }
      }

      return true;
    });
  }, [allDoctors, searchQuery, selectedSpecialty, affiliationFilter, mappedDoctorIds]);

  // Selected Doctor
  const selectedDoctor: DoctorItem | undefined = useMemo(() => {
    return (
      allDoctors.find((d) => d.id === selectedDoctorId) ||
      allDoctors.find((d) => d.id === 'doc-amanda-foster') ||
      allDoctors[0]
    );
  }, [allDoctors, selectedDoctorId]);

  // Is selected doctor already mapped?
  const isSelectedDoctorMapped = useMemo(() => {
    if (!selectedDoctor) return false;
    if (mappedDoctorIds.has(selectedDoctor.id)) return true;
    if (selectedDoctor.npi && mappedDoctorIds.has(selectedDoctor.npi)) return true;
    if (selectedDoctor.privilegeStatus === 'Currently Mapped') return true;
    return false;
  }, [selectedDoctor, mappedDoctorIds]);

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MapDoctorFormValues>({
    resolver: zodResolver(mapDoctorSchema),
    defaultValues: {
      privilegeLevel: 'Attending Surgeon (Full Operating Rights)',
      department: selectedDoctor?.department || 'Vascular & Interventional Services',
      operatingSuites: ['Cath Lab Suites 1–4', 'Interventional OR 1–2'],
      effectiveDate: '2026-11-15',
      notes: '',
    },
  });

  // Handle Form Submit
  const onSubmit = async (values: MapDoctorFormValues) => {
    if (!facility || !selectedDoctor) return;

    if (isSelectedDoctorMapped) {
      showToast(
        t('facilities.mapDoctorScreen.toast.duplicateError', {
          name: selectedDoctor.name,
          defaultValue: `Dr. ${selectedDoctor.name} is already mapped to this facility.`,
        })
      );
      return;
    }

    try {
      const payload: MappedDoctor = {
        id: selectedDoctor.id,
        name: selectedDoctor.name,
        hvId: selectedDoctor.hvId,
        npi: selectedDoctor.npi || '1447812903',
        specialty: selectedDoctor.specialty,
        licenseNumber: selectedDoctor.license,
        clinicalRole: values.privilegeLevel,
        status: 'Verified & Active',
        initials: selectedDoctor.initials || 'MD',
        avatarBg: selectedDoctor.avatarBg || 'rgba(40, 0, 109, 0.1)',
        avatarColor: selectedDoctor.avatarColor || '#28006d',
        avatarUrl: selectedDoctor.avatarUrl,
      };

      await mapDoctorMutation.mutateAsync({
        facilityId: facility.id,
        doctor: payload,
      });

      showToast(
        t('facilities.mapDoctorScreen.toast.success', {
          name: selectedDoctor.name,
          facilityName: facility.legalName,
          privilegeLevel: values.privilegeLevel,
          defaultValue: `Dr. ${selectedDoctor.name} has been successfully mapped to ${facility.legalName}.`,
        })
      );

      // Return to facility details after a brief delay
      setTimeout(() => {
        handleNav(`/admin/facilities/${facility.id}`);
      }, 1200);
    } catch (err) {
      showToast(
        t('facilities.mapDoctorScreen.toast.error', {
          defaultValue: 'Failed to map doctor to facility. Please try again.',
        })
      );
    }
  };

  // Loading / Error Screen
  if (isFacilityLoading || isDoctorsLoading) {
    return (
      <div className="mapdoc-shell">
        <AdminSidebar
          activeNav="facilities"
          isDrawerOpen={isDrawerOpen}
          onCloseDrawer={() => setIsDrawerOpen(false)}
          onNavigate={handleNav}
          onLogout={onLogout}
        />
        <div className="mapdoc-main-area">
          <div className="mapdoc-content-container flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#28006d]" />
              <p className="text-sm font-medium">Loading clinical privileges workspace...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isFacilityError || !facility) {
    return (
      <div className="mapdoc-shell">
        <AdminSidebar
          activeNav="facilities"
          isDrawerOpen={isDrawerOpen}
          onCloseDrawer={() => setIsDrawerOpen(false)}
          onNavigate={handleNav}
          onLogout={onLogout}
        />
        <div className="mapdoc-main-area">
          <div className="mapdoc-content-container">
            <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-lg mx-auto text-center mt-12 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert size={28} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Facility Not Found</h2>
              <p className="text-sm text-slate-600 mb-6">
                Unable to locate the specified healthcare facility record for ID &quot;{effectiveFacilityId}&quot;.
              </p>
              <button
                type="button"
                onClick={() => handleNav('/admin/facilities')}
                className="mapdoc-return-btn"
              >
                Return to Facility Directory
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mapdoc-shell">
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

      {/* Shared Admin Sidebar */}
      <AdminSidebar
        activeNav="facilities"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
      />

      <div className="mapdoc-main-area">
        <div className="mapdoc-content-container">
          {/* Top Breadcrumb & Return Bar */}
          <div className="mapdoc-nav-bar">
            <div className="mapdoc-breadcrumb" aria-label="Breadcrumb">
              <button
                type="button"
                className="mapdoc-breadcrumb-link"
                onClick={() => handleNav('/admin/dashboard')}
              >
                Admin
              </button>
              <span className="mapdoc-breadcrumb-sep">/</span>
              <button
                type="button"
                className="mapdoc-breadcrumb-link"
                onClick={() => handleNav('/admin/facilities')}
              >
                {t('facilities.mapDoctorScreen.breadcrumbFacilities', 'Facilities')}
              </button>
              <span className="mapdoc-breadcrumb-sep">/</span>
              <button
                type="button"
                className="mapdoc-breadcrumb-link"
                onClick={() => handleNav(`/admin/facilities/${facility.id}`)}
              >
                {facility.legalName}
              </button>
              <span className="mapdoc-breadcrumb-sep">/</span>
              <span className="mapdoc-breadcrumb-current">
                {t('facilities.mapDoctorScreen.breadcrumb', 'Map Doctors')}
              </span>
            </div>

            <button
              type="button"
              id="btn-return-facility"
              className="mapdoc-return-btn"
              onClick={() => handleNav(`/admin/facilities/${facility.id}`)}
            >
              <ArrowLeft size={14} />
              <span>{t('facilities.mapDoctorScreen.returnBtn', 'Return to Facility Details')}</span>
            </button>
          </div>

          {/* Hero Context Banner (Figma Node 20:12016) */}
          <section className="mapdoc-hero-banner" aria-label="Privileges Workspace Header">
            <div className="mapdoc-hero-text">
              <div className="mapdoc-hero-badge">
                <span className="mapdoc-hero-dot" />
                <span>
                  {t(
                    'facilities.mapDoctorScreen.badge',
                    'CLINICAL PRIVILEGES WORKSPACE • ACCREDITATION ENGINE V4.2'
                  )}
                </span>
              </div>
              <h1 className="mapdoc-hero-title">
                {t('facilities.mapDoctorScreen.title', 'Map Doctors to Facility')}
              </h1>
              <p className="mapdoc-hero-desc">
                {t(
                  'facilities.mapDoctorScreen.subtitle',
                  'Credential certified medical doctors, assign operating suite clinical privileges, and register institutional dual-practice agreements.'
                )}
              </p>
            </div>

            <div className="mapdoc-hero-quota-card" aria-label="Quota Capacity">
              <span className="mapdoc-quota-label">
                {t('facilities.mapDoctorScreen.quota.label', 'QUOTA CAPACITY')}
              </span>
              <span className="mapdoc-quota-val">
                {t('facilities.mapDoctorScreen.quota.ratio', '24 / 30 Specialists')}
              </span>
              <div className="mapdoc-quota-status">
                <span className="mapdoc-quota-dot" />
                <span>
                  {t('facilities.mapDoctorScreen.quota.activeBadge', 'Live Capacity Verified')}
                </span>
              </div>
            </div>
          </section>

          {/* Command & Filter Bar */}
          <section className="mapdoc-filter-strip" aria-label="Search and Filter Controls">
            <div className="mapdoc-search-box">
              <Search size={16} className="text-[#94a3b8] shrink-0" />
              <input
                id="search-doctors-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(
                  'facilities.mapDoctorScreen.filters.searchPlaceholder',
                  'Search doctors by name, NPI, or clinical specialization...'
                )}
              />
            </div>

            <div className="mapdoc-filter-group">
              <select
                id="filter-specialty-select"
                className="mapdoc-filter-select"
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                aria-label="Filter by Specialty"
              >
                <option value="All">{t('facilities.mapDoctorScreen.filters.allSpecialties', 'All Specialties')}</option>
                <option value="Interventional Cardiology">Interventional Cardiology</option>
                <option value="Vascular Surgery">Vascular Surgery</option>
                <option value="Cardiology Specialist">Cardiology Specialist</option>
                <option value="Radiology & Imaging">Radiology & Imaging</option>
                <option value="Endocrinology">Endocrinology</option>
              </select>

              <select
                id="filter-affiliation-select"
                className="mapdoc-filter-select"
                value={affiliationFilter}
                onChange={(e) => setAffiliationFilter(e.target.value)}
                aria-label="Filter by Affiliation"
              >
                <option value="All">{t('facilities.mapDoctorScreen.filters.allDoctors', 'All Doctors')}</option>
                <option value="Unmapped">{t('facilities.mapDoctorScreen.filters.onlyUnmapped', 'Available / Unassigned')}</option>
                <option value="Mapped">{t('facilities.mapDoctorScreen.filters.onlyMapped', 'Already Credentialed')}</option>
              </select>
            </div>
          </section>

          {/* Two-Column Layout (7 cols / 5 cols) */}
          <div className="mapdoc-workspace-grid">
            {/* Left Column: Accredited Practitioner Directory */}
            <section className="mapdoc-directory-card" aria-label="Accredited Practitioner Directory">
              <div className="mapdoc-directory-header">
                <h2 className="mapdoc-directory-title">
                  {t('facilities.mapDoctorScreen.directory.title', 'Accredited Practitioner Directory')}
                </h2>
                <div className="mapdoc-directory-badge">
                  <span className="mapdoc-directory-badge-dot" />
                  <span>
                    {t('facilities.mapDoctorScreen.directory.badge', {
                      count: filteredDoctors.length,
                      defaultValue: `${filteredDoctors.length} Available Live Real-time State`,
                    })}
                  </span>
                </div>
              </div>

              <div className="mapdoc-table-container">
                <table className="mapdoc-table">
                  <thead>
                    <tr>
                      <th scope="col">{t('facilities.mapDoctorScreen.directory.colDoctor', 'DOCTOR & IDENTIFIERS')}</th>
                      <th scope="col">{t('facilities.mapDoctorScreen.directory.colSpecialty', 'PRIMARY SPECIALTY')}</th>
                      <th scope="col">{t('facilities.mapDoctorScreen.directory.colFacility', 'PRIMARY FACILITY')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDoctors.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="mapdoc-empty-state">
                          {t('facilities.mapDoctorScreen.directory.empty', 'No accredited doctors match your criteria.')}
                        </td>
                      </tr>
                    ) : (
                      filteredDoctors.map((doc) => {
                        const isMapped =
                          mappedDoctorIds.has(doc.id) ||
                          (doc.npi && mappedDoctorIds.has(doc.npi)) ||
                          doc.privilegeStatus === 'Currently Mapped';
                        const isSelected = selectedDoctor?.id === doc.id;

                        return (
                          <tr
                            key={doc.id}
                            id={`doctor-row-${doc.id}`}
                            className={`mapdoc-row ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedDoctorId(doc.id)}
                          >
                            <td>
                              <div className="mapdoc-doc-cell">
                                <div
                                  className="mapdoc-avatar-wrap"
                                  style={{
                                    backgroundColor: doc.avatarBg || 'rgba(40, 0, 109, 0.1)',
                                    color: doc.avatarColor || '#28006d',
                                  }}
                                >
                                  {doc.avatarUrl ? (
                                    <img
                                      src={doc.avatarUrl}
                                      alt={doc.name}
                                      className="mapdoc-avatar-img"
                                    />
                                  ) : (
                                    <span>{doc.initials || 'MD'}</span>
                                  )}
                                </div>
                                <div className="mapdoc-doc-info">
                                  <span className="mapdoc-doc-name">{doc.name}</span>
                                  <span className="mapdoc-doc-identifiers">
                                    NPI: {doc.npi || '1043928192'} • LIC: {doc.license || 'NY-29401'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td>
                              <span className="mapdoc-spec-title">{doc.specialty}</span>
                              <span className="mapdoc-subspec-title">
                                {doc.subSpecialty || doc.department || 'Clinical Specialist'}
                              </span>
                            </td>

                            <td>
                              {isMapped ? (
                                <div>
                                  <span className="mapdoc-status-badge mapped">
                                    <Check size={12} />
                                    <span>{t('facilities.mapDoctorScreen.directory.currentlyMapped', 'Currently Mapped')}</span>
                                  </span>
                                  <span className="mapdoc-role-subtext">
                                    {doc.affiliationStatus || 'Primary Lead'}
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="mapdoc-facility-text">
                                    {doc.primaryFacility || doc.hospital || 'Unassigned / Independent'}
                                  </span>
                                  <span
                                    className={`mapdoc-status-badge mt-1 ${
                                      doc.privilegeStatus === 'Dual-Privilege Requested'
                                        ? 'requested'
                                        : doc.privilegeStatus === 'Dual-Privilege Eligible'
                                        ? 'eligible'
                                        : 'available'
                                    }`}
                                  >
                                    {doc.privilegeStatus || 'Available Immediately'}
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Right Column: Privilege Specification Drawer */}
            <aside className="mapdoc-drawer-card" aria-label="Privilege Specification Configuration">
              <div className="mapdoc-drawer-header">
                <div className="mapdoc-drawer-title-group">
                  <span
                    className={`mapdoc-stage-badge ${
                      isSelectedDoctorMapped ? 'mapped' : 'ready'
                    }`}
                  >
                    {isSelectedDoctorMapped
                      ? t('facilities.mapDoctorScreen.drawer.stageMapped', 'ALREADY CREDENTIALED')
                      : t('facilities.mapDoctorScreen.drawer.stageReady', 'READY TO COMMIT')}
                  </span>
                  <h2 className="mapdoc-drawer-title">
                    {t('facilities.mapDoctorScreen.drawer.title', 'Privilege Specification')}
                  </h2>
                  <p className="mapdoc-drawer-subtitle">
                    {t('facilities.mapDoctorScreen.drawer.subtitle', 'Configure clinical privileges and operating suite access.')}
                  </p>
                </div>
              </div>

              {selectedDoctor ? (
                <>
                  {/* Selected Doctor Identity Mini-Card */}
                  <div className="mapdoc-doc-identity-box">
                    <div
                      className="mapdoc-identity-avatar"
                      style={{
                        backgroundColor: selectedDoctor.avatarBg || 'rgba(0, 106, 96, 0.15)',
                        color: selectedDoctor.avatarColor || '#006a60',
                      }}
                    >
                      {selectedDoctor.avatarUrl ? (
                        <img
                          src={selectedDoctor.avatarUrl}
                          alt={selectedDoctor.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{selectedDoctor.initials || 'MD'}</span>
                      )}
                    </div>
                    <div className="mapdoc-identity-details">
                      <span className="mapdoc-identity-name">{selectedDoctor.name}</span>
                      <div className="mapdoc-identity-meta">
                        <span>NPI: {selectedDoctor.npi || '1447812903'}</span>
                        <span>•</span>
                        <span>{selectedDoctor.primaryFacility || 'Unassigned / Independent'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Duplicate / Already Mapped Warning */}
                  {isSelectedDoctorMapped && (
                    <div className="mapdoc-alert-box" role="alert">
                      <AlertTriangle size={18} className="mapdoc-alert-icon" />
                      <div>
                        <h4 className="mapdoc-alert-title">
                          {t('facilities.mapDoctorScreen.drawer.alreadyMappedAlert.title', 'Doctor Already Credentialed')}
                        </h4>
                        <p className="mapdoc-alert-desc">
                          {t('facilities.mapDoctorScreen.drawer.alreadyMappedAlert.desc', {
                            facilityName: facility.legalName,
                            defaultValue: `This doctor already holds an active clinical mapping at ${facility.legalName}. Duplicate privilege mappings are prohibited under standard governance.`,
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Privilege Specification Form */}
                  <form onSubmit={handleSubmit(onSubmit)} className="mapdoc-form">
                    {/* Clinical Privilege Level */}
                    <div className="mapdoc-form-group">
                      <label htmlFor="privilege-level-select" className="mapdoc-form-label">
                        <span>{t('facilities.mapDoctorScreen.drawer.form.privilegeLevel', 'Clinical Privilege Level')}</span>
                        <span className="mapdoc-required-star">*</span>
                      </label>
                      <select
                        id="privilege-level-select"
                        {...register('privilegeLevel')}
                        disabled={isSelectedDoctorMapped}
                        className="mapdoc-form-select"
                      >
                        <option value="Attending Surgeon (Full Operating Rights)">
                          {t('facilities.mapDoctorScreen.drawer.form.attendingSurgeon', 'Attending Surgeon (Full Operating Rights)')}
                        </option>
                        <option value="Associate Attending (Supervised Cases)">
                          {t('facilities.mapDoctorScreen.drawer.form.associateAttending', 'Associate Attending (Supervised Cases)')}
                        </option>
                        <option value="Consulting Specialist (Evaluation & Rounding)">
                          {t('facilities.mapDoctorScreen.drawer.form.consultingSpecialist', 'Consulting Specialist (Evaluation & Rounding)')}
                        </option>
                        <option value="Courtesy / Dual-Privilege Staff">
                          {t('facilities.mapDoctorScreen.drawer.form.courtesyStaff', 'Courtesy / Dual-Privilege Staff')}
                        </option>
                      </select>
                      {errors.privilegeLevel && (
                        <span className="mapdoc-form-error">{errors.privilegeLevel.message}</span>
                      )}
                    </div>

                    {/* Operating Suite Privileges */}
                    <div className="mapdoc-form-group">
                      <span className="mapdoc-form-label">
                        <span>{t('facilities.mapDoctorScreen.drawer.form.operatingSuites', 'Operating Suite Privileges')}</span>
                        <span className="mapdoc-required-star">*</span>
                      </span>

                      <Controller
                        name="operatingSuites"
                        control={control}
                        render={({ field }) => {
                          const toggleSuite = (suite: string) => {
                            if (isSelectedDoctorMapped) return;
                            const current = field.value || [];
                            if (current.includes(suite)) {
                              field.onChange(current.filter((s) => s !== suite));
                            } else {
                              field.onChange([...current, suite]);
                            }
                          };

                          const isCathChecked = (field.value || []).includes('Cath Lab Suites 1–4');
                          const isInterventionalChecked = (field.value || []).includes('Interventional OR 1–2');

                          return (
                            <div className="mapdoc-suites-grid">
                              <label
                                className={`mapdoc-suite-checkbox ${isCathChecked ? 'checked' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  id="suite-cath-lab"
                                  checked={isCathChecked}
                                  disabled={isSelectedDoctorMapped}
                                  onChange={() => toggleSuite('Cath Lab Suites 1–4')}
                                />
                                <div className="mapdoc-suite-info">
                                  <span className="mapdoc-suite-name">
                                    {t('facilities.mapDoctorScreen.drawer.form.suiteCathLab', 'Cath Lab Suites 1–4')}
                                  </span>
                                  <span className="mapdoc-suite-desc">
                                    {t('facilities.mapDoctorScreen.drawer.form.suiteCathLabDesc', 'Angiography & Stent')}
                                  </span>
                                </div>
                              </label>

                              <label
                                className={`mapdoc-suite-checkbox ${isInterventionalChecked ? 'checked' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  id="suite-interventional-or"
                                  checked={isInterventionalChecked}
                                  disabled={isSelectedDoctorMapped}
                                  onChange={() => toggleSuite('Interventional OR 1–2')}
                                />
                                <div className="mapdoc-suite-info">
                                  <span className="mapdoc-suite-name">
                                    {t('facilities.mapDoctorScreen.drawer.form.suiteInterventional', 'Interventional OR 1–2')}
                                  </span>
                                  <span className="mapdoc-suite-desc">
                                    {t('facilities.mapDoctorScreen.drawer.form.suiteInterventionalDesc', 'Hybrid Open Suites')}
                                  </span>
                                </div>
                              </label>
                            </div>
                          );
                        }}
                      />
                      {errors.operatingSuites && (
                        <span className="mapdoc-form-error">{errors.operatingSuites.message}</span>
                      )}
                    </div>

                    {/* Department Assignment */}
                    <div className="mapdoc-form-group">
                      <label htmlFor="input-department" className="mapdoc-form-label">
                        <span>{t('facilities.mapDoctorScreen.drawer.form.department', 'Department Assignment')}</span>
                        <span className="mapdoc-required-star">*</span>
                      </label>
                      <input
                        id="input-department"
                        type="text"
                        {...register('department')}
                        disabled={isSelectedDoctorMapped}
                        placeholder={t('facilities.mapDoctorScreen.drawer.form.departmentPlaceholder', 'e.g. Vascular & Interventional Services')}
                        className="mapdoc-form-input"
                      />
                      {errors.department && (
                        <span className="mapdoc-form-error">{errors.department.message}</span>
                      )}
                    </div>

                    {/* Effective Start Date */}
                    <div className="mapdoc-form-group">
                      <label htmlFor="input-effective-date" className="mapdoc-form-label">
                        <span>{t('facilities.mapDoctorScreen.drawer.form.effectiveDate', 'Effective Start Date')}</span>
                        <span className="mapdoc-required-star">*</span>
                      </label>
                      <input
                        id="input-effective-date"
                        type="date"
                        {...register('effectiveDate')}
                        disabled={isSelectedDoctorMapped}
                        className="mapdoc-form-input"
                      />
                      <span className="mapdoc-form-helper">
                        {t('facilities.mapDoctorScreen.drawer.form.dateHelp', 'Immediately active after institutional sign-off')}
                      </span>
                      {errors.effectiveDate && (
                        <span className="mapdoc-form-error">{errors.effectiveDate.message}</span>
                      )}
                    </div>

                    {/* Compliance & Audit Note */}
                    <div className="mapdoc-compliance-box">
                      <Lock size={15} className="text-[#28006d] shrink-0 mt-0.5" />
                      <p className="mapdoc-compliance-text">
                        {t(
                          'facilities.mapDoctorScreen.drawer.form.complianceDesc',
                          'This credential action initiates an automated HL7 credential notification to Mount Sinai Credentialing Board and updates state NPI registry associations.'
                        )}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="mapdoc-actions-container">
                      <button
                        type="submit"
                        id="btn-confirm-map-doctor"
                        disabled={isSelectedDoctorMapped || isSubmitting || mapDoctorMutation.isPending}
                        className="mapdoc-btn-submit"
                      >
                        {mapDoctorMutation.isPending ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>{t('facilities.mapDoctorScreen.drawer.actions.confirming', 'Processing Credentialing...')}</span>
                          </>
                        ) : isSelectedDoctorMapped ? (
                          <span>{t('facilities.mapDoctorScreen.drawer.actions.alreadyMappedBtn', 'Already Credentialed at this Facility')}</span>
                        ) : (
                          <>
                            <span>{t('facilities.mapDoctorScreen.drawer.actions.confirm', 'Confirm & Map Doctor to Facility')}</span>
                            <ChevronRight size={16} />
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        id="btn-cancel-mapping"
                        onClick={() => handleNav(`/admin/facilities/${facility.id}`)}
                        className="mapdoc-btn-cancel"
                      >
                        {t('facilities.mapDoctorScreen.drawer.actions.cancel', 'Cancel Selection')}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="text-center py-8 text-sm text-slate-500">
                  {t('facilities.mapDoctorScreen.drawer.noDoctorSelected', 'Select a doctor from the directory to configure clinical privileges.')}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMapDoctor;
