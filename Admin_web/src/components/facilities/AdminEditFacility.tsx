import React, { useState, useId, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  Check,
  Lock,
  MapPin,
  Phone,
  PhoneCall,
  Mail,
  Clock,
  AlertTriangle,
  Search,
  Bell,
  Settings,
  HelpCircle,
  Menu,
  ShieldAlert,
  UploadCloud,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

// Shell & Local Styles
import '../dashboard/AdminDashboard.css';
import './AdminEditFacility.css';

// Authentic Assets
import mapManhattanImg from '../../assets/facilities/facility-map-manhattan.png';
import bgHipaaGeometry from '../../assets/facilities/bg-hipaa-geometry.svg';
import facilityIngressImg from '../../assets/facilities/facility-ingress.jpg';
import facilityCathLabImg from '../../assets/facilities/facility-cath-lab.jpg';
import facilityAmbulanceImg from '../../assets/facilities/facility-ambulance-bay.jpg';

// Shared Shell Components
import AdminSidebar from '../common/AdminSidebar';
import {
  getIanaTimezones,
  ISO_CURRENCIES,
  PRICING_FALLBACK_POLICIES,
} from '../../utils/facilityLocalization';

// Services & Queries
import {
  useFacilityQuery,
  useUpdateFacilityMutation,
} from '../../services/facilityService';

const editFacilitySchema = z.object({
  legalName: z.string().trim().min(3, 'Facility Legal Name is required (at least 3 characters)'),
  facilityType: z.string().trim().min(1, 'Please select a facility type'),
  facilityCode: z.string().default('FAC-NY-4981'),
  clinicalLicense: z.string().trim().min(2, 'Clinical license number is required'),
  npiNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'NPI must be a valid 10-digit numeric identifier'),
  status: z.enum(['Active', 'Pending Review', 'Draft / Staging']),
  capabilities: z.array(z.string()).default([]),
  streetAddress1: z.string().trim().min(3, 'Street address line 1 is required'),
  streetAddress2: z.string().trim().optional(),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State or province is required'),
  postalCode: z.string().trim().min(3, 'Postal or ZIP code is required'),
  country: z.string().trim().min(2, 'Country is required'),
  mainTelephone: z.string().trim().min(7, 'Facility main telephone is required'),
  emergencyTelephone: z.string().trim().optional(),
  administrativeEmail: z.string().trim().email('Please enter a valid official administrative email'),
  medicalEmail: z.string().trim().optional(),
  timezone: z.string().default('UTC'),
  billingCurrency: z.string().default('USD'),
  unconfiguredPricingPolicy: z.string().default('REQUIRE_EXPLICIT_PRICE'),
  tierBadge: z.string().optional(),
});

type EditFacilityFormData = z.infer<typeof editFacilitySchema>;

const FACILITY_TYPE_OPTIONS = [
  'Hospital Campus',
  'Ambulatory Surgical Center',
  'Specialty Clinic',
  'Diagnostic Center',
  'Urgent Care Center',
  'Community Health Center',
];

const COUNTRY_OPTIONS = [
  'United States (US)',
  'Canada (CA)',
  'United Kingdom (UK)',
  'Australia (AU)',
];


const DEPARTMENT_CAPABILITIES = [
  'Inpatient Cath Lab',
  'Emergency Triage',
  'Outpatient Surgery',
  'Diagnostic Radiology / DICOM Vault',
  'Telemedicine Virtual Care Hub',
];

export interface AdminEditFacilityProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminEditFacility: React.FC<AdminEditFacilityProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { facilityId } = useParams<{ facilityId: string }>();
  const searchInputId = useId();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch Facility Record
  const { data: facility, isLoading, isError } = useFacilityQuery(facilityId || '');
  const updateMutation = useUpdateFacilityMutation();

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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditFacilityFormData>({
    resolver: zodResolver(editFacilitySchema),
    defaultValues: {
      legalName: '',
      facilityType: 'Hospital Campus',
      facilityCode: '',
      clinicalLicense: '',
      npiNumber: '',
      status: 'Active',
      capabilities: [],
      streetAddress1: '',
      streetAddress2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'United States (US)',
      mainTelephone: '',
      emergencyTelephone: '',
      administrativeEmail: '',
      medicalEmail: '',
      timezone: 'UTC',
      billingCurrency: 'USD',
      unconfiguredPricingPolicy: 'REQUIRE_EXPLICIT_PRICE',
      tierBadge: 'Tier 1 Academic Center',
    },
  });

  // Prepopulate form when facility data resolves
  useEffect(() => {
    if (facility) {
      reset({
        legalName: facility.legalName || '',
        facilityType: facility.facilityType || 'Hospital Campus',
        facilityCode: facility.facilityId || '',
        clinicalLicense: facility.clinicalLicense || '',
        npiNumber: facility.npiNumber || '',
        status: facility.status || 'Active',
        capabilities: facility.capabilities && facility.capabilities.length > 0
          ? facility.capabilities
          : [
              'Inpatient Cath Lab',
              'Emergency Triage',
              'Outpatient Surgery',
              'Diagnostic Radiology / DICOM Vault',
            ],
        streetAddress1: facility.streetAddress1 || '',
        streetAddress2: facility.streetAddress2 || '',
        city: facility.city || '',
        state: facility.state || '',
        postalCode: facility.postalCode || '',
        country: facility.country || 'United States (US)',
        mainTelephone: facility.mainTelephone || '',
        emergencyTelephone: facility.emergencyTelephone || '+1 (212) 659-9911',
        administrativeEmail: facility.administrativeEmail || '',
        medicalEmail: 'interventional@mountsinai.careid.org',
        timezone: facility.timezone || 'UTC',
        billingCurrency: facility.billingCurrency || 'USD',
        unconfiguredPricingPolicy: facility.unconfiguredPricingPolicy || 'REQUIRE_EXPLICIT_PRICE',
        tierBadge: facility.tierBadge || 'Tier 1 Academic Center',
      });
    }
  }, [facility, reset]);

  const watchedStatus = watch('status');
  const watchedCapabilities = watch('capabilities') || [];
  const watchedLegalName = watch('legalName');
  const watchedNpi = watch('npiNumber');
  const watchedLicense = watch('clinicalLicense');

  const toggleCapability = (cap: string) => {
    const current = [...watchedCapabilities];
    const idx = current.indexOf(cap);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(cap);
    }
    setValue('capabilities', current, { shouldDirty: true });
  };

  const onSubmit = async (values: EditFacilityFormData) => {
    if (!facility) return;
    try {
      await updateMutation.mutateAsync({
        id: facility.id,
        updates: values,
      });
      showToast(t('facilities.edit.toast.saved', { name: values.legalName }));
      setTimeout(() => {
        handleNav(`/admin/facilities/${facility.id}`);
      }, 1000);
    } catch {
      showToast('Error saving facility updates. Please verify required fields.');
    }
  };

  const handleDiscard = () => {
    if (facility) {
      reset();
      showToast(t('facilities.edit.toast.discarded', 'Form reset to current saved values.'));
    }
  };

  const handleDeactivate = async () => {
    if (!facility) return;
    try {
      setValue('status', 'Pending Review', { shouldDirty: true });
      await updateMutation.mutateAsync({
        id: facility.id,
        updates: { status: 'Pending Review' },
      });
      showToast(t('facilities.edit.toast.deactivated', 'Facility operating status changed to Maintenance Hold.'));
    } catch {
      showToast('Failed to change facility status.');
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
        <div className="facility-edit-content">
          <main className="facility-edit-canvas">
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8">
              <div className="w-12 h-12 border-4 border-[#28006d]/20 border-t-[#28006d] rounded-full animate-spin mb-4" />
              <h2 className="text-lg font-bold text-[#0b1c30]">Loading Facility Details for Editing...</h2>
              <p className="text-sm text-[#7a7583]">Retrieving cryptographic credentials from CareID ledger</p>
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
        <div className="facility-edit-content">
          <main className="facility-edit-canvas">
            <div className="facility-edit-top-strip">
              <div className="facility-edit-crumbs-group">
                <button
                  type="button"
                  className="facility-edit-btn-back"
                  onClick={() => handleNav('/admin/facilities')}
                >
                  <ArrowLeft size={15} />
                  <span>{t('facilities.details.backToDirectory', 'Back to Facility Directory')}</span>
                </button>
              </div>
            </div>

            <div className="facility-edit-card" style={{ maxWidth: '640px', margin: '40px auto', padding: '40px 32px', textAlign: 'center' }}>
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
                className="facility-edit-btn-save"
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

  return (
    <div className="facility-edit-shell">
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

      {/* Main Content Area */}
      <div className="facility-edit-content">
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
                / Admin Portal
              </span>
              <span className="text-xs font-mono font-bold text-[#28006d] bg-[#eff4ff] px-2 py-0.5 rounded border border-[#d3e4fe]">
                {facility.facilityId}
              </span>
            </div>
          </div>

          <div className="careid-header-center-search">
            <label htmlFor={searchInputId} className="sr-only">
              Search facilities, patients, logs...
            </label>
            <Search
              size={16}
              className="careid-header-search-icon"
            />
            <input
              id={searchInputId}
              type="search"
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

        {/* Scrollable Form Canvas */}
        <main className="facility-edit-canvas" role="main">
          {/* Top Action Breadcrumb & Back Strip */}
          <div className="facility-edit-top-strip">
            <div className="facility-edit-crumbs-group">
              <button
                type="button"
                className="facility-edit-btn-back"
                onClick={() => handleNav(`/admin/facilities/${facility.id}`)}
              >
                <ArrowLeft size={14} />
                <span>{t('facilities.edit.backToDetails', 'Back to Facility Details')}</span>
              </button>

              <nav aria-label="Breadcrumbs" className="facility-edit-crumbs">
                <button
                  type="button"
                  className="facility-edit-crumb-link"
                  onClick={() => handleNav('/admin/dashboard')}
                >
                  Admin
                </button>
                <span>/</span>
                <button
                  type="button"
                  className="facility-edit-crumb-link"
                  onClick={() => handleNav('/admin/facilities')}
                >
                  Facilities
                </button>
                <span>/</span>
                <button
                  type="button"
                  className="facility-edit-crumb-link"
                  onClick={() => handleNav(`/admin/facilities/${facility.id}`)}
                >
                  {facility.legalName}
                </button>
                <span>/</span>
                <span className="facility-edit-crumb-current" aria-current="page">
                  {t('facilities.edit.breadcrumb', 'Edit Facility')}
                </span>
              </nav>
            </div>

            <div className="facility-edit-top-actions">
              <button
                type="button"
                id="btn-cancel-top"
                className="facility-edit-btn-cancel"
                onClick={() => handleNav(`/admin/facilities/${facility.id}`)}
              >
                <span>{t('facilities.edit.cancel', 'Cancel')}</span>
              </button>

              <button
                type="button"
                id="btn-save-top"
                className="facility-edit-btn-save"
                disabled={isSubmitting || updateMutation.isPending}
                onClick={handleSubmit(onSubmit)}
              >
                <Check size={16} />
                <span>
                  {updateMutation.isPending
                    ? 'Saving...'
                    : t('facilities.edit.saveChanges', 'Save Changes')}
                </span>
              </button>
            </div>
          </div>

          {/* Institutional Master Header Banner (Hero Card) */}
          <header className="facility-edit-hero-banner" aria-label="Facility Hero Information">
            <div className="facility-edit-hero-left">
              <div className="facility-edit-hero-logo">
                <Building2 size={28} />
              </div>
              <div className="facility-edit-hero-info">
                <h1 className="facility-edit-hero-title">
                  {t('facilities.edit.title', 'Edit Facility — {{name}}', {
                    name: watchedLegalName || facility.legalName,
                  })}
                </h1>
                <div className="facility-edit-hero-badge-row">
                  <div className="facility-edit-code-pill">
                    <span className="facility-edit-code-dot" />
                    <span>{facility.facilityId}</span>
                  </div>
                  <p className="facility-edit-hero-desc">
                    {t(
                      'facilities.edit.subtitle',
                      'Update institutional credentials, geographic location, operational capabilities, and status for Facility #{{code}}.',
                      { code: facility.facilityId }
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="facility-edit-accred-card">
              <span className="facility-edit-accred-label">
                {t('facilities.edit.accreditation.badge', 'ACCREDITATION CLASS')}
              </span>
              <span className="facility-edit-accred-title">
                {facility.tierBadge || t('facilities.edit.accreditation.title', 'Tier 1 Academic Center')}
              </span>
              <span className="facility-edit-accred-sub">
                {t('facilities.edit.accreditation.verified', 'Joint Commission Gold Seal Verified')}
              </span>
            </div>
          </header>

          {/* 2-Column Responsive Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-6">
            <div className="facility-edit-grid">
              {/* Left Column (8-col width on desktop) */}
              <div className="facility-edit-col-left">
                {/* SECTION 1: General Facility Information */}
                <section className="facility-edit-card" aria-label="General Facility Information">
                  <div className="facility-edit-card-header">
                    <div className="facility-edit-card-heading-group">
                      <div className="facility-edit-card-title-row">
                        <div className="facility-edit-card-icon-wrap">
                          <Building2 size={18} />
                        </div>
                        <h2 className="facility-edit-card-title">
                          {t('facilities.edit.sections.general.title', 'General Facility Information')}
                        </h2>
                      </div>
                      <p className="facility-edit-card-subtitle">
                        {t(
                          'facilities.edit.sections.general.subtitle',
                          'Federally registered designations and registry identifiers'
                        )}
                      </p>
                    </div>
                    <span className="facility-edit-step-pill">
                      {t('facilities.edit.sections.general.step', 'Step 1 of 4')}
                    </span>
                  </div>

                  <div className="facility-edit-card-body">
                    {/* Facility Legal Name */}
                    <div className="facility-edit-field-group">
                      <label htmlFor="edit-legalName" className="facility-edit-field-label">
                        {t('facilities.edit.sections.general.legalName', 'Facility Legal Name')}
                        <span className="facility-edit-required">*</span>
                      </label>
                      <input
                        id="edit-legalName"
                        type="text"
                        {...register('legalName')}
                        className={`facility-edit-input ${errors.legalName ? 'is-error' : ''}`}
                        placeholder="e.g. Mount Sinai Hospital – Interventional Pavilion"
                      />
                      <span className="facility-edit-field-hint">
                        {t(
                          'facilities.edit.sections.general.legalNameHint',
                          'Must mirror official CMS Form 855A filing'
                        )}
                      </span>
                      {errors.legalName && (
                        <span className="facility-edit-field-error">{errors.legalName.message}</span>
                      )}
                    </div>

                    {/* Facility Code & Facility Type */}
                    <div className="facility-edit-row-2col">
                      <div className="facility-edit-field-group">
                        <label htmlFor="edit-facilityCode" className="facility-edit-field-label">
                          {t('facilities.edit.sections.general.code', 'Facility Code / ID')}
                        </label>
                        <div className="facility-edit-input-wrap">
                          <input
                            id="edit-facilityCode"
                            type="text"
                            readOnly
                            value={facility.facilityId}
                            className="facility-edit-input is-readonly"
                          />
                          <Lock size={15} className="absolute right-3 text-[#7a7583]" />
                        </div>
                        <span className="facility-edit-field-hint">
                          {t(
                            'facilities.edit.sections.general.codeHint',
                            'System-locked globally unique ID'
                          )}
                        </span>
                      </div>

                      <div className="facility-edit-field-group">
                        <label htmlFor="edit-facilityType" className="facility-edit-field-label">
                          {t('facilities.edit.sections.general.type', 'Facility Type')}
                          <span className="facility-edit-required">*</span>
                        </label>
                        <select
                          id="edit-facilityType"
                          {...register('facilityType')}
                          className="facility-edit-input bg-white"
                        >
                          {FACILITY_TYPE_OPTIONS.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        {errors.facilityType && (
                          <span className="facility-edit-field-error">{errors.facilityType.message}</span>
                        )}
                      </div>
                    </div>

                    {/* License & NPI */}
                    <div className="facility-edit-row-2col">
                      <div className="facility-edit-field-group">
                        <label htmlFor="edit-clinicalLicense" className="facility-edit-field-label">
                          {t(
                            'facilities.edit.sections.general.license',
                            'Clinical License & Regulatory Number'
                          )}
                          <span className="facility-edit-required">*</span>
                        </label>
                        <input
                          id="edit-clinicalLicense"
                          type="text"
                          {...register('clinicalLicense')}
                          className={`facility-edit-input font-mono ${
                            errors.clinicalLicense ? 'is-error' : ''
                          }`}
                          placeholder="e.g. NY-HOSP-88319"
                        />
                        {errors.clinicalLicense && (
                          <span className="facility-edit-field-error">
                            {errors.clinicalLicense.message}
                          </span>
                        )}
                      </div>

                      <div className="facility-edit-field-group">
                        <label htmlFor="edit-npiNumber" className="facility-edit-field-label">
                          {t('facilities.edit.sections.general.npi', 'NPI / Institutional Provider ID')}
                          <span className="facility-edit-required">*</span>
                        </label>
                        <input
                          id="edit-npiNumber"
                          type="text"
                          maxLength={10}
                          {...register('npiNumber')}
                          className={`facility-edit-input font-mono ${
                            errors.npiNumber ? 'is-error' : ''
                          }`}
                          placeholder="10-digit numeric ID"
                        />
                        {errors.npiNumber && (
                          <span className="facility-edit-field-error">{errors.npiNumber.message}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION 2: Location & Address */}
                <section className="facility-edit-card" aria-label="Location and Address">
                  <div className="facility-edit-card-header">
                    <div className="facility-edit-card-heading-group">
                      <div className="facility-edit-card-title-row">
                        <div className="facility-edit-card-icon-wrap">
                          <MapPin size={18} />
                        </div>
                        <h2 className="facility-edit-card-title">
                          {t('facilities.edit.sections.location.title', 'Location & Address')}
                        </h2>
                      </div>
                      <p className="facility-edit-card-subtitle">
                        {t(
                          'facilities.edit.sections.location.subtitle',
                          'Public navigation endpoints and ambulance bay ingress'
                        )}
                      </p>
                    </div>
                    <span className="facility-edit-gis-pill">
                      {t('facilities.edit.sections.location.gisVerified', 'GIS Verified')}
                    </span>
                  </div>

                  <div className="facility-edit-card-body">
                    {/* Embedded Static Map View Widget */}
                    <div className="facility-edit-map-box">
                      <img
                        src={mapManhattanImg}
                        alt="Facility location map"
                        className="facility-edit-map-img"
                      />
                      <div className="facility-edit-map-badge">
                        <MapPin size={13} />
                        <span>Coordinates: {facility.gpsCoordinates || '40.7891° N, 73.9531° W'}</span>
                      </div>
                    </div>

                    {/* Street Address Line 1 */}
                    <div className="facility-edit-field-group">
                      <label htmlFor="edit-streetAddress1" className="facility-edit-field-label">
                        {t('facilities.edit.sections.location.street1', 'Street Address Line 1')}
                        <span className="facility-edit-required">*</span>
                      </label>
                      <input
                        id="edit-streetAddress1"
                        type="text"
                        {...register('streetAddress1')}
                        className={`facility-edit-input ${errors.streetAddress1 ? 'is-error' : ''}`}
                        placeholder="e.g. 1468 Madison Avenue"
                      />
                      {errors.streetAddress1 && (
                        <span className="facility-edit-field-error">
                          {errors.streetAddress1.message}
                        </span>
                      )}
                    </div>

                    {/* Street Address Line 2 */}
                    <div className="facility-edit-field-group">
                      <label htmlFor="edit-streetAddress2" className="facility-edit-field-label">
                        {t('facilities.edit.sections.location.street2', 'Street Address Line 2')}
                      </label>
                      <input
                        id="edit-streetAddress2"
                        type="text"
                        {...register('streetAddress2')}
                        className="facility-edit-input"
                        placeholder="Suite, Pavilion, or Wing (optional)"
                      />
                    </div>

                    {/* City, State, Postal Code */}
                    <div className="facility-edit-row-3col">
                      <div className="facility-edit-field-group">
                        <label htmlFor="edit-city" className="facility-edit-field-label">
                          {t('facilities.edit.sections.location.city', 'City')}
                          <span className="facility-edit-required">*</span>
                        </label>
                        <input
                          id="edit-city"
                          type="text"
                          {...register('city')}
                          className={`facility-edit-input ${errors.city ? 'is-error' : ''}`}
                          placeholder="e.g. New York"
                        />
                        {errors.city && (
                          <span className="facility-edit-field-error">{errors.city.message}</span>
                        )}
                      </div>

                      <div className="facility-edit-field-group">
                        <label htmlFor="edit-state" className="facility-edit-field-label">
                          {t('facilities.edit.sections.location.state', 'State / Province')}
                          <span className="facility-edit-required">*</span>
                        </label>
                        <input
                          id="edit-state"
                          type="text"
                          {...register('state')}
                          className={`facility-edit-input ${errors.state ? 'is-error' : ''}`}
                          placeholder="e.g. NY"
                        />
                        {errors.state && (
                          <span className="facility-edit-field-error">{errors.state.message}</span>
                        )}
                      </div>

                      <div className="facility-edit-field-group">
                        <label htmlFor="edit-postalCode" className="facility-edit-field-label">
                          {t('facilities.edit.sections.location.postalCode', 'Postal / ZIP Code')}
                          <span className="facility-edit-required">*</span>
                        </label>
                        <input
                          id="edit-postalCode"
                          type="text"
                          {...register('postalCode')}
                          className={`facility-edit-input ${errors.postalCode ? 'is-error' : ''}`}
                          placeholder="e.g. 10029"
                        />
                        {errors.postalCode && (
                          <span className="facility-edit-field-error">
                            {errors.postalCode.message}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Country */}
                    <div className="facility-edit-field-group">
                      <label htmlFor="edit-country" className="facility-edit-field-label">
                        {t('facilities.edit.sections.location.country', 'Country')}
                        <span className="facility-edit-required">*</span>
                      </label>
                      <select
                        id="edit-country"
                        {...register('country')}
                        className="facility-edit-input bg-white"
                      >
                        {COUNTRY_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                {/* SECTION 3: Contact & Operational Communications */}
                <section className="facility-edit-card" aria-label="Contact and Communications">
                  <div className="facility-edit-card-header">
                    <div className="facility-edit-card-heading-group">
                      <div className="facility-edit-card-title-row">
                        <div className="facility-edit-card-icon-wrap">
                          <Phone size={18} />
                        </div>
                        <h2 className="facility-edit-card-title">
                          {t(
                            'facilities.edit.sections.contact.title',
                            'Contact & Operational Communications'
                          )}
                        </h2>
                      </div>
                      <p className="facility-edit-card-subtitle">
                        {t(
                          'facilities.edit.sections.contact.subtitle',
                          'Direct encrypted endpoints, triage channels, and routing hubs'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="facility-edit-card-body">
                    {/* Telephones Row */}
                    <div className="facility-edit-row-2col">
                      <div className="facility-edit-field-group">
                        <label htmlFor="edit-mainTelephone" className="facility-edit-field-label">
                          {t(
                            'facilities.edit.sections.contact.switchboard',
                            'Main Switchboard Telephone'
                          )}
                          <span className="facility-edit-required">*</span>
                        </label>
                        <div className="facility-edit-input-wrap">
                          <Phone size={15} className="facility-edit-input-icon" />
                          <input
                            id="edit-mainTelephone"
                            type="text"
                            {...register('mainTelephone')}
                            className={`facility-edit-input has-icon ${
                              errors.mainTelephone ? 'is-error' : ''
                            }`}
                            placeholder="+1 (212) 659-8800"
                          />
                        </div>
                        {errors.mainTelephone && (
                          <span className="facility-edit-field-error">
                            {errors.mainTelephone.message}
                          </span>
                        )}
                      </div>

                      <div className="facility-edit-field-group">
                        <label htmlFor="edit-emergencyTelephone" className="facility-edit-field-label">
                          {t('facilities.edit.sections.contact.emergency', 'Emergency / Triage Line')}
                        </label>
                        <div className="facility-edit-input-wrap">
                          <PhoneCall size={15} className="facility-edit-input-icon text-red-600" />
                          <input
                            id="edit-emergencyTelephone"
                            type="text"
                            {...register('emergencyTelephone')}
                            className="facility-edit-input has-icon"
                            placeholder="+1 (212) 659-9911"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Emails Row */}
                    <div className="facility-edit-row-2col">
                      <div className="facility-edit-field-group">
                        <label htmlFor="edit-administrativeEmail" className="facility-edit-field-label">
                          {t(
                            'facilities.edit.sections.contact.adminEmail',
                            'Official Administrative Email'
                          )}
                          <span className="facility-edit-required">*</span>
                        </label>
                        <div className="facility-edit-input-wrap">
                          <Mail size={15} className="facility-edit-input-icon" />
                          <input
                            id="edit-administrativeEmail"
                            type="email"
                            {...register('administrativeEmail')}
                            className={`facility-edit-input has-icon font-mono ${
                              errors.administrativeEmail ? 'is-error' : ''
                            }`}
                            placeholder="facility.admin@mountsinai.careid.org"
                          />
                        </div>
                        {errors.administrativeEmail && (
                          <span className="facility-edit-field-error">
                            {errors.administrativeEmail.message}
                          </span>
                        )}
                      </div>

                      <div className="facility-edit-field-group">
                        <label htmlFor="edit-medicalEmail" className="facility-edit-field-label">
                          {t(
                            'facilities.edit.sections.contact.medicalEmail',
                            'Direct Encrypted Medical Mail'
                          )}
                        </label>
                        <div className="facility-edit-input-wrap">
                          <Lock size={15} className="facility-edit-input-icon text-[#006a60]" />
                          <input
                            id="edit-medicalEmail"
                            type="email"
                            {...register('medicalEmail')}
                            className="facility-edit-input has-icon font-mono"
                            placeholder="interventional@mountsinai.careid.org"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Timezone */}
                    <div className="facility-edit-field-group">
                      <label htmlFor="edit-timezone" className="facility-edit-field-label">
                        {t('facilities.edit.sections.contact.timezone', 'Facility Operating Timezone')}
                      </label>
                      <div className="facility-edit-input-wrap">
                        <Clock size={15} className="facility-edit-input-icon" />
                        <select
                          id="edit-timezone"
                          {...register('timezone')}
                          className="facility-edit-input has-icon bg-white"
                        >
                          {getIanaTimezones().map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Billing Currency (ISO 4217) */}
                    <div className="facility-edit-field-group">
                      <label htmlFor="edit-currency" className="facility-edit-field-label">
                        Billing Currency (ISO 4217)
                      </label>
                      <div className="facility-edit-input-wrap">
                        <select
                          id="edit-currency"
                          {...register('billingCurrency')}
                          className="facility-edit-input bg-white"
                        >
                          {ISO_CURRENCIES.map((cur) => (
                            <option key={cur.code} value={cur.code}>
                              {cur.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Pricing Fallback Governance Policy */}
                    <div className="facility-edit-field-group">
                      <label htmlFor="edit-pricing-policy" className="facility-edit-field-label">
                        Unconfigured Procedure Pricing Policy
                      </label>
                      <div className="facility-edit-input-wrap">
                        <select
                          id="edit-pricing-policy"
                          {...register('unconfiguredPricingPolicy')}
                          className="facility-edit-input bg-white"
                        >
                          {PRICING_FALLBACK_POLICIES.map((pol) => (
                            <option key={pol.value} value={pol.value}>
                              {pol.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION 4: Campus Imagery & Documentation */}
                <section className="facility-edit-card" aria-label="Campus Imagery and Documentation">
                  <div className="facility-edit-card-header">
                    <div className="facility-edit-card-heading-group">
                      <h2 className="facility-edit-card-title">
                        {t('facilities.edit.sections.media.title', 'Campus Imagery & Documentation')}
                      </h2>
                      <p className="facility-edit-card-subtitle">
                        {t(
                          'facilities.edit.sections.media.subtitle',
                          'Attached verified photographs of facility bay and ingress points'
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast('Media attachment uploader opened.')}
                      className="facility-edit-btn-cancel"
                      style={{ height: '34px', fontSize: '12px', padding: '0 14px' }}
                    >
                      <UploadCloud size={14} />
                      <span>{t('facilities.edit.sections.media.uploadBtn', 'Upload Media')}</span>
                    </button>
                  </div>

                  <div className="facility-edit-card-body">
                    <div className="facility-edit-photos-grid">
                      <div className="facility-edit-photo-card">
                        <img
                          src={facilityIngressImg}
                          alt="Main Ingress Pavilion"
                          className="facility-edit-photo-img"
                        />
                        <div className="facility-edit-photo-overlay">
                          <span className="facility-edit-photo-caption">
                            {t('facilities.edit.sections.media.caption1', 'Main Ingress Pavilion')}
                          </span>
                        </div>
                      </div>

                      <div className="facility-edit-photo-card">
                        <img
                          src={facilityCathLabImg}
                          alt="Cath Lab Room 3A"
                          className="facility-edit-photo-img"
                        />
                        <div className="facility-edit-photo-overlay">
                          <span className="facility-edit-photo-caption">
                            {t('facilities.edit.sections.media.caption2', 'Cath Lab Room 3A')}
                          </span>
                        </div>
                      </div>

                      <div className="facility-edit-photo-card">
                        <img
                          src={facilityAmbulanceImg}
                          alt="Emergency Ambulance Bay"
                          className="facility-edit-photo-img"
                        />
                        <div className="facility-edit-photo-overlay">
                          <span className="facility-edit-photo-caption">
                            {t(
                              'facilities.edit.sections.media.caption3',
                              'Emergency Ambulance Bay'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column (4-col width on desktop) */}
              <div className="facility-edit-col-right">
                {/* CARD 1: Physical Care ID Digital Twin Card */}
                <aside className="facility-edit-twin-card" aria-label="CareID Digital Twin">
                  <img
                    src={bgHipaaGeometry}
                    alt=""
                    className="facility-edit-twin-watermark"
                    aria-hidden="true"
                  />
                  <div className="facility-edit-twin-top">
                    <div className="facility-edit-twin-label-group">
                      <ShieldCheck size={16} className="text-[#5af8fb]" />
                      <span className="facility-edit-twin-node-badge">CARE ID VERIFIED</span>
                    </div>
                    <span className="facility-edit-twin-active-pill">ACTIVE</span>
                  </div>

                  <div className="facility-edit-twin-title-block">
                    <span className="facility-edit-twin-hlabel">FACILITY TITLE</span>
                    <span className="facility-edit-twin-facility-name">
                      {watchedLegalName || facility.legalName}
                    </span>
                    <span className="facility-edit-twin-meta">
                      NPI: {watchedNpi || facility.npiNumber} • {watchedLicense || facility.clinicalLicense}
                    </span>
                  </div>

                  <div className="facility-edit-twin-bottom">
                    <span className="facility-edit-twin-vault">
                      <Lock size={12} />
                      <span>End-to-End Encrypted Vault</span>
                    </span>
                    <span className="font-mono font-bold text-[#5af8fb]">
                      {facility.facilityId}
                    </span>
                  </div>
                </aside>

                {/* CARD 2: Operating Status & Department Capabilities */}
                <section className="facility-edit-card" aria-label="Operational Status and Capabilities">
                  <div className="facility-edit-card-header">
                    <div className="facility-edit-card-heading-group">
                      <h2 className="facility-edit-card-title">
                        {t('facilities.edit.sections.status.title', 'Operational Status')}
                      </h2>
                      <p className="facility-edit-card-subtitle">
                        {t('facilities.edit.sections.status.subtitle', 'Live clinical eligibility')}
                      </p>
                    </div>
                  </div>

                  <div className="facility-edit-card-body">
                    {/* Status Radio Choices */}
                    <div className="facility-edit-status-options" role="radiogroup" aria-label="Operating Status">
                      <div
                        className={`facility-edit-status-card-opt ${
                          watchedStatus === 'Active' ? 'is-selected' : ''
                        }`}
                        onClick={() => setValue('status', 'Active', { shouldDirty: true })}
                        role="radio"
                        aria-checked={watchedStatus === 'Active'}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            setValue('status', 'Active', { shouldDirty: true });
                          }
                        }}
                      >
                        <div className="facility-edit-radio-circle">
                          {watchedStatus === 'Active' && <div className="facility-edit-radio-dot" />}
                        </div>
                        <div className="facility-edit-status-text">
                          <span className="facility-edit-status-title">
                            {t('facilities.edit.sections.status.activeTitle', 'Active & Accredited')}
                          </span>
                          <span className="facility-edit-status-desc">
                            {t(
                              'facilities.edit.sections.status.activeDesc',
                              'Admitting patients and processing EHR sync'
                            )}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`facility-edit-status-card-opt ${
                          watchedStatus === 'Pending Review' ? 'is-selected' : ''
                        }`}
                        onClick={() => setValue('status', 'Pending Review', { shouldDirty: true })}
                        role="radio"
                        aria-checked={watchedStatus === 'Pending Review'}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            setValue('status', 'Pending Review', { shouldDirty: true });
                          }
                        }}
                      >
                        <div className="facility-edit-radio-circle">
                          {watchedStatus === 'Pending Review' && (
                            <div className="facility-edit-radio-dot" />
                          )}
                        </div>
                        <div className="facility-edit-status-text">
                          <span className="facility-edit-status-title">
                            {t('facilities.edit.sections.status.holdTitle', 'Maintenance Hold')}
                          </span>
                          <span className="facility-edit-status-desc">
                            {t(
                              'facilities.edit.sections.status.holdDesc',
                              'System audits or licensing updates pending'
                            )}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`facility-edit-status-card-opt ${
                          watchedStatus === 'Draft / Staging' ? 'is-selected' : ''
                        }`}
                        onClick={() => setValue('status', 'Draft / Staging', { shouldDirty: true })}
                        role="radio"
                        aria-checked={watchedStatus === 'Draft / Staging'}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            setValue('status', 'Draft / Staging', { shouldDirty: true });
                          }
                        }}
                      >
                        <div className="facility-edit-radio-circle">
                          {watchedStatus === 'Draft / Staging' && (
                            <div className="facility-edit-radio-dot" />
                          )}
                        </div>
                        <div className="facility-edit-status-text">
                          <span className="facility-edit-status-title">
                            {t('facilities.edit.sections.status.stagingTitle', 'Draft / Staging')}
                          </span>
                          <span className="facility-edit-status-desc">
                            {t(
                              'facilities.edit.sections.status.stagingDesc',
                              'Initial credentialing in progress'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Department Capabilities Checklist */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-[#f0f1f3]">
                      <span className="text-[11px] font-bold tracking-wider text-[#7a7583] uppercase">
                        {t(
                          'facilities.edit.sections.status.capabilitiesTitle',
                          'DEPARTMENT CAPABILITIES'
                        )}
                      </span>
                      <div className="facility-edit-caps-list">
                        {DEPARTMENT_CAPABILITIES.map((cap) => {
                          const isChecked = watchedCapabilities.includes(cap);
                          return (
                            <div
                              key={cap}
                              className={`facility-edit-cap-item ${isChecked ? 'is-checked' : ''}`}
                              onClick={() => toggleCapability(cap)}
                              role="checkbox"
                              aria-checked={isChecked}
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === ' ' || e.key === 'Enter') {
                                  e.preventDefault();
                                  toggleCapability(cap);
                                }
                              }}
                            >
                              <span>{cap}</span>
                              <div className="facility-edit-cap-checkbox">
                                {isChecked && <Check size={12} strokeWidth={3} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>

                {/* CARD 3: Danger Zone / Facility Lifecycle */}
                <aside className="facility-edit-danger-card" aria-label="Danger Zone">
                  <div className="facility-edit-danger-header">
                    <AlertTriangle size={18} className="text-[#dc2626]" />
                    <div>
                      <h2 className="facility-edit-danger-title">
                        {t('facilities.edit.sections.danger.title', 'Danger Zone')}
                      </h2>
                      <p className="facility-edit-danger-subtitle">
                        {t(
                          'facilities.edit.sections.danger.subtitle',
                          'Irreversible governance actions'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="facility-edit-danger-body">
                    <div className="facility-edit-danger-action">
                      <h3 className="facility-edit-danger-act-title">
                        {t('facilities.edit.sections.danger.deactivate', 'Deactivate Facility')}
                      </h3>
                      <p className="facility-edit-danger-act-desc">
                        {t(
                          'facilities.edit.sections.danger.deactivateDesc',
                          'Temporarily suspends scheduling, maintains historical medical records and audit trails.'
                        )}
                      </p>
                      <button
                        type="button"
                        id="btn-deactivate-facility"
                        onClick={handleDeactivate}
                        className="facility-edit-btn-deactivate"
                      >
                        {t('facilities.edit.sections.danger.deactivate', 'Deactivate Facility')}
                      </button>
                    </div>

                    <div className="facility-edit-danger-action pt-3 border-t border-[#fecaca]">
                      <h3 className="facility-edit-danger-act-title text-[#494552]">
                        {t('facilities.edit.sections.danger.delete', 'Delete Facility')}
                      </h3>
                      <p className="facility-edit-danger-act-desc">
                        {t(
                          'facilities.edit.sections.danger.deleteDesc',
                          'Only available if 0 active patient encounters and 0 mapped staff are associated.'
                        )}
                      </p>
                      <button
                        type="button"
                        disabled
                        title="Delete is disabled for accredited health system facilities."
                        className="facility-edit-btn-delete"
                      >
                        {t('facilities.edit.sections.danger.delete', 'Delete Facility')}
                      </button>
                    </div>
                  </div>
                </aside>
              </div>
            </div>

            {/* Bottom Sticky Action Bar / Audit Footer */}
            <div className="facility-edit-bottom-bar" role="toolbar" aria-label="Form Actions">
              <div className="facility-edit-bottom-left">
                <button
                  type="button"
                  id="btn-discard-changes"
                  onClick={handleDiscard}
                  className="facility-edit-btn-discard"
                >
                  <RotateCcw size={14} className="inline mr-1.5" />
                  <span>{t('facilities.edit.discardChanges', 'Discard Changes')}</span>
                </button>
                <span className="facility-edit-audit-meta">
                  •{' '}
                  {t('facilities.edit.lastModified', 'Last modified: Yesterday, 04:15 PM by Super Admin', {
                    date: facility.createdAt ? new Date(facility.createdAt).toLocaleDateString() : 'Yesterday, 04:15 PM',
                  })}
                </span>
              </div>

              <button
                type="submit"
                id="btn-save-return-bottom"
                disabled={isSubmitting || updateMutation.isPending}
                className="facility-edit-btn-save-return"
              >
                <span>
                  {updateMutation.isPending
                    ? 'Saving Changes...'
                    : t('facilities.edit.saveAndReturn', 'Save Changes & Return to Details')}
                </span>
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default AdminEditFacility;
