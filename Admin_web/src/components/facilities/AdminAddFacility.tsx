import React, { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Menu,
  Search,
  Bell,
  Settings,
  HelpCircle,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';

// Styling
import './AdminAddFacility.css';

// Authentic Assets from Figma Node 20:9946
import iconSaveCheck from '../../assets/facilities/icon-save-check.svg';
import iconFacilityInfo from '../../assets/facilities/icon-facility-info.svg';
import iconFacilityId from '../../assets/facilities/icon-facility-id.svg';
import iconDropdownChevron from '../../assets/facilities/icon-dropdown-chevron.svg';
import iconGovernance from '../../assets/facilities/icon-governance.svg';
import iconAdminPool from '../../assets/facilities/icon-admin-pool.svg';
import iconLocation from '../../assets/facilities/icon-location.svg';
import iconGpsCrosshair from '../../assets/facilities/icon-gps-crosshair.svg';
import iconContactOps from '../../assets/facilities/icon-contact-ops.svg';
import iconHipaaShield from '../../assets/facilities/icon-hipaa-shield.svg';
import iconVaultLock from '../../assets/facilities/icon-vault-lock.svg';
import bgHipaaGeometry from '../../assets/facilities/bg-hipaa-geometry.svg';
import iconLedgerShield from '../../assets/facilities/icon-ledger-shield.svg';
import iconBtnArrowRight from '../../assets/facilities/icon-btn-arrow-right.svg';
import mapManhattanImg from '../../assets/facilities/facility-map-manhattan.png';

// Shared Components
import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import ActionSuccessSnackbar from '../users/ActionSuccessSnackbar';
import {
  getIanaTimezones,
  ISO_CURRENCIES,
  PRICING_FALLBACK_POLICIES,
} from '../../utils/facilityLocalization';

// Service & Mutation
import {
  useCreateFacilityMutation,
  type CreateFacilityPayload,
} from '../../services/facilityService';

export interface AdminAddFacilityProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

const addFacilitySchema = z.object({
  legalName: z.string().trim().min(3, 'Facility Legal Name is required (at least 3 characters)'),
  facilityType: z.string().trim().min(1, 'Please select a facility type'),
  facilityCode: z.string().default('FAC-NY-4981'),
  clinicalLicense: z.string().trim().min(2, 'Clinical license number is required'),
  npiNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'NPI must be a valid 10-digit numeric identifier'),
  status: z.enum(['Active', 'Pending Review', 'Draft / Staging']),
  initialAdmin: z.string().trim().min(1, 'Initial facility administrator is required'),
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
  billingContact: z.string().trim().optional(),
  timezone: z.string().default('UTC'),
  billingCurrency: z.string().default('USD'),
  unconfiguredPricingPolicy: z.string().default('REQUIRE_EXPLICIT_PRICE'),
});

type AddFacilityFormData = z.infer<typeof addFacilitySchema>;

const FACILITY_TYPE_OPTIONS = [
  'Hospital Campus',
  'Ambulatory Surgical Center',
  'Specialty Clinic',
  'Diagnostic Center',
  'Urgent Care Center',
  'Community Health Center',
];

const ADMIN_ASSIGNMENT_OPTIONS = [
  'Elena Rostova, MHA — Super Admin Pool (Verified)',
  'Dr. Sarah Jenkins — Clinical Director Pool',
  'Marcus Vance, MD — Regional Admin',
  'Assign Later / Unassigned',
];

const COUNTRY_OPTIONS = [
  'United States (US)',
  'Canada (CA)',
  'United Kingdom (UK)',
  'Australia (AU)',
];


const DEPARTMENT_CAPABILITIES = [
  { id: 'Inpatient Cath Lab', label: 'Inpatient Cath Lab', fullWidth: false },
  { id: 'Emergency Triage', label: 'Emergency Triage', fullWidth: false },
  { id: 'Outpatient Surgery', label: 'Outpatient Surgery', fullWidth: false },
  { id: 'Diagnostic Radiology / DICOM Vault', label: 'Diagnostic Radiology / DICOM Vault', fullWidth: false },
  { id: 'Telemedicine Virtual Care Hub', label: 'Telemedicine Virtual Care Hub', fullWidth: true },
];

export const AdminAddFacility: React.FC<AdminAddFacilityProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreateFacilityMutation();

  const legalNameId = useId();
  const facilityTypeId = useId();
  const licenseId = useId();
  const npiId = useId();
  const adminId = useId();
  const address1Id = useId();
  const address2Id = useId();
  const cityId = useId();
  const stateId = useId();
  const postalCodeId = useId();
  const countryId = useId();
  const mainPhoneId = useId();
  const emergencyPhoneId = useId();
  const emailId = useId();
  const billingId = useId();
  const timezoneId = useId();
  const currencyId = useId();
  const pricingPolicyId = useId();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AddFacilityFormData>({
    resolver: zodResolver(addFacilitySchema),
    defaultValues: {
      legalName: '',
      facilityType: 'Hospital Campus',
      facilityCode: 'FAC-NY-4981',
      clinicalLicense: '',
      npiNumber: '',
      status: 'Active',
      initialAdmin: 'Elena Rostova, MHA — Super Admin Pool (Verified)',
      capabilities: [
        'Inpatient Cath Lab',
        'Emergency Triage',
        'Outpatient Surgery',
        'Diagnostic Radiology / DICOM Vault',
      ],
      streetAddress1: '',
      streetAddress2: '',
      city: 'New York',
      state: 'NY',
      postalCode: '10019',
      country: 'United States (US)',
      mainTelephone: '',
      emergencyTelephone: '',
      administrativeEmail: '',
      billingContact: '',
      timezone: 'UTC',
      billingCurrency: 'USD',
      unconfiguredPricingPolicy: 'REQUIRE_EXPLICIT_PRICE',
    },
  });

  const currentCapabilities = watch('capabilities') || [];

  const handleNav = (path: string) => {
    setIsDrawerOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const handleCancel = () => {
    handleNav('/admin/facilities');
  };

  const toggleCapability = (capId: string) => {
    if (currentCapabilities.includes(capId)) {
      setValue(
        'capabilities',
        currentCapabilities.filter((c) => c !== capId),
        { shouldValidate: true }
      );
    } else {
      setValue('capabilities', [...currentCapabilities, capId], { shouldValidate: true });
    }
  };

  const onSubmit = async (data: AddFacilityFormData) => {
    try {
      setErrorMessage(null);
      const payload: CreateFacilityPayload = {
        legalName: data.legalName,
        facilityType: data.facilityType,
        facilityCode: data.facilityCode,
        clinicalLicense: data.clinicalLicense,
        npiNumber: data.npiNumber,
        status: data.status,
        initialAdmin: data.initialAdmin,
        capabilities: data.capabilities,
        streetAddress1: data.streetAddress1,
        streetAddress2: data.streetAddress2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        mainTelephone: data.mainTelephone,
        emergencyTelephone: data.emergencyTelephone,
        administrativeEmail: data.administrativeEmail,
        billingContact: data.billingContact,
        timezone: data.timezone,
        billingCurrency: data.billingCurrency,
        unconfiguredPricingPolicy: data.unconfiguredPricingPolicy,
      };

      await createMutation.mutateAsync(payload);
      setSnackbarMessage(
        t('facilities.create.toast.success', {
          name: data.legalName,
          defaultValue: `Facility "${data.legalName}" successfully registered on Care ID cryptographic ledger.`,
        })
      );

      // Navigate to facilities directory
      setTimeout(() => {
        handleNav('/admin/facilities');
      }, 700);
    } catch (err: any) {
      console.error('Failed to create facility:', err);
      const msg = err?.message || 'Failed to create facility. Please check the details and try again.';
      setErrorMessage(msg);
    }
  };

  const isBusy = isSubmitting || createMutation.isPending;

  return (
    <div className="facility-add-shell" data-node-id="20:9946">
      {/* Mobile Drawer Backdrop */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Shared CareID Sidebar */}
      <AdminSidebar
        activeNav="facilities"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="facility-add-content">
        {/* Top App Bar */}
        <header className="facility-add-topbar" data-node-id="20:10258">
          <div className="facility-add-topbar-left">
            <button
              type="button"
              className="facility-add-topbar-toggle"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="facility-add-topbar-breadcrumb">
              <span className="text-[#494552] text-sm font-semibold">/</span>
              <span className="text-[#0b1c30] text-sm font-bold">Admin Portal</span>
            </div>
          </div>

          <div className="facility-add-topbar-search-box" data-node-id="20:10266">
            <Search size={16} className="facility-add-topbar-search-icon" />
            <input
              type="text"
              placeholder="Search facilities, patients, logs..."
              className="facility-add-topbar-search-input"
              data-node-id="20:10268"
            />
          </div>

          <div className="facility-add-topbar-right" data-node-id="20:10272">
            <button type="button" className="facility-add-topbar-btn" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button type="button" className="facility-add-topbar-btn" aria-label="Settings">
              <Settings size={18} />
            </button>
            <button type="button" className="facility-add-topbar-btn" aria-label="Help">
              <HelpCircle size={18} />
            </button>
            <div className="facility-add-topbar-divider" />
            <div
              className="facility-add-topbar-user cursor-pointer"
              data-node-id="20:10283"
              onClick={() => (onNavigate ? onNavigate('/admin/profile') : navigate('/admin/profile'))}
              title="My Profile & Information"
              role="button"
              tabIndex={0}
            >
              <AdminProfileAvatar size={32} />
              <div className="facility-add-topbar-user-name flex flex-col">
                <span className="text-xs font-bold text-[#0b1c30]">Admin User</span>
                <span className="text-[11px] font-semibold text-[#00696b]">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Body Container */}
        <main className="facility-add-body">
          {/* Top Action & Context Header */}
          <div className="facility-add-header-cluster" data-node-id="20:9949">
            <div className="facility-add-header-left">
              {/* Breadcrumb Trail */}
              <nav className="facility-add-breadcrumbs" aria-label="Breadcrumb" data-node-id="20:9952">
                <span
                  role="button"
                  tabIndex={0}
                  className="facility-add-crumb-link"
                  onClick={() => handleNav('/admin/dashboard')}
                  onKeyDown={(e) => e.key === 'Enter' && handleNav('/admin/dashboard')}
                >
                  {t('facilities.create.breadcrumbs.admin', 'Admin')}
                </span>
                <span className="facility-add-crumb-separator">/</span>
                <span
                  role="button"
                  tabIndex={0}
                  className="facility-add-crumb-link"
                  onClick={() => handleNav('/admin/facilities')}
                  onKeyDown={(e) => e.key === 'Enter' && handleNav('/admin/facilities')}
                >
                  {t('facilities.create.breadcrumbs.facilities', 'Facilities')}
                </span>
                <span className="facility-add-crumb-separator">/</span>
                <span className="facility-add-crumb-current" aria-current="page">
                  {t('facilities.create.breadcrumbs.addFacility', 'Add Facility')}
                </span>
              </nav>

              <h1 className="facility-add-heading" data-node-id="20:9964">
                {t('facilities.create.heading', 'Add New Facility')}
              </h1>
              <p className="facility-add-subtitle" data-node-id="20:9967">
                {t(
                  'facilities.create.subtitle',
                  'Register and onboard a new clinical hospital campus, surgical center, or branch to the Care ID ecosystem.'
                )}
              </p>
            </div>

            {/* Top Right Action Buttons */}
            <div className="facility-add-header-actions" data-node-id="20:9968">
              <button
                type="button"
                className="facility-btn-cancel-top"
                onClick={handleCancel}
                disabled={isBusy}
              >
                {t('facilities.create.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                form="add-facility-form"
                className="facility-btn-save-top"
                disabled={isBusy}
              >
                {isBusy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{t('facilities.create.saving', 'Saving...')}</span>
                  </>
                ) : (
                  <>
                    <img src={iconSaveCheck} alt="" className="w-4 h-4" />
                    <span>{t('facilities.create.saveFacility', 'Save Facility')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Feedback Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
                <div className="text-sm">
                  <div className="font-bold">Error Registering Facility</div>
                  <div className="mt-0.5 text-red-600">{errorMessage}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-700 font-bold p-1"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}

          {/* Registration Form */}
          <form
            id="add-facility-form"
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            className="w-full"
          >
            {/* Main Form Two-Column Grid (Figma 7 cols left / 5 cols right) */}
            <div className="facility-form-grid" data-node-id="20:9977">
              {/* ==============================================================
                  LEFT COLUMN: Core Identity & Operational Governance
                  ============================================================== */}
              <div className="facility-grid-left" data-node-id="20:9978">
                {/* CARD 1: General Facility Information */}
                <div className="facility-card" data-node-id="20:9979">
                  <div className="facility-card-blur-glow" />

                  {/* Header */}
                  <div className="facility-card-header" data-node-id="20:9980">
                    <div className="facility-card-header-left">
                      <div className="facility-card-icon-wrap purple" data-node-id="20:9982">
                        <img src={iconFacilityInfo} alt="" className="w-5 h-5" />
                      </div>
                      <div className="facility-card-title-group">
                        <h2 className="facility-card-title" data-node-id="20:9987">
                          {t('facilities.create.card1.title', 'General Facility Information')}
                        </h2>
                        <p className="facility-card-subtitle" data-node-id="20:9989">
                          {t(
                            'facilities.create.card1.subtitle',
                            'State registry credentials and clinical taxonomy'
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="facility-tier1-badge" data-node-id="20:9990">
                      {t('facilities.create.card1.tier1Badge', 'Tier 1 Verification')}
                    </div>
                  </div>

                  {/* Field: Facility Legal Name */}
                  <div className="facility-field-group">
                    <div className="facility-field-label-row">
                      <label htmlFor={legalNameId} className="facility-field-label">
                        {t('facilities.create.card1.legalName', 'Facility Legal Name')}{' '}
                        <span className="facility-field-required">*</span>
                      </label>
                      <span className="facility-field-hint">
                        {t('facilities.create.card1.legalNameHint', 'As shown on state license')}
                      </span>
                    </div>
                    <input
                      id={legalNameId}
                      type="text"
                      placeholder={t(
                        'facilities.create.card1.legalNamePlaceholder',
                        'e.g., Mount Sinai West Ambulatory Center'
                      )}
                      disabled={isBusy}
                      {...register('legalName')}
                      className={`facility-input ${errors.legalName ? 'has-error' : ''}`}
                    />
                    {errors.legalName && (
                      <p className="facility-field-error">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{errors.legalName.message}</span>
                      </p>
                    )}
                  </div>

                  {/* Row: Facility Code (Auto-Assigned) & Facility Type */}
                  <div className="facility-two-col-row">
                    <div className="facility-field-group">
                      <div className="facility-field-label-row">
                        <span className="facility-field-label">
                          {t('facilities.create.card1.facilityCode', 'Facility Code / ID Prefix')}
                        </span>
                        <span className="facility-field-auto-tag">
                          {t('facilities.create.card1.autoAssigned', 'AUTO-ASSIGNED')}
                        </span>
                      </div>
                      <div className="facility-input read-only-id">
                        <img src={iconFacilityId} alt="" className="facility-id-prefix-icon w-3.5 h-3.5" />
                        <span>FAC-NY-4981</span>
                      </div>
                    </div>

                    <div className="facility-field-group">
                      <label htmlFor={facilityTypeId} className="facility-field-label">
                        {t('facilities.create.card1.facilityType', 'Facility Type')}{' '}
                        <span className="facility-field-required">*</span>
                      </label>
                      <div className="facility-select-wrap">
                        <select
                          id={facilityTypeId}
                          disabled={isBusy}
                          {...register('facilityType')}
                          className={`facility-select ${errors.facilityType ? 'has-error' : ''}`}
                        >
                          {FACILITY_TYPE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <img src={iconDropdownChevron} alt="" className="facility-select-chevron w-3 h-2" />
                      </div>
                      {errors.facilityType && (
                        <p className="facility-field-error">
                          <AlertCircle size={13} className="shrink-0" />
                          <span>{errors.facilityType.message}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row: Clinical License & NPI Number */}
                  <div className="facility-two-col-row">
                    <div className="facility-field-group">
                      <label htmlFor={licenseId} className="facility-field-label">
                        {t('facilities.create.card1.license', 'Clinical License & Reg. Number')}{' '}
                        <span className="facility-field-required">*</span>
                      </label>
                      <input
                        id={licenseId}
                        type="text"
                        placeholder={t(
                          'facilities.create.card1.licensePlaceholder',
                          'State Lic #NY-HOSP-88319'
                        )}
                        disabled={isBusy}
                        {...register('clinicalLicense')}
                        className={`facility-input ${errors.clinicalLicense ? 'has-error' : ''}`}
                      />
                      {errors.clinicalLicense && (
                        <p className="facility-field-error">
                          <AlertCircle size={13} className="shrink-0" />
                          <span>{errors.clinicalLicense.message}</span>
                        </p>
                      )}
                    </div>

                    <div className="facility-field-group">
                      <label htmlFor={npiId} className="facility-field-label">
                        {t('facilities.create.card1.npi', 'NPI / Institutional Provider ID')}{' '}
                        <span className="facility-field-required">*</span>
                      </label>
                      <input
                        id={npiId}
                        type="text"
                        maxLength={10}
                        placeholder={t(
                          'facilities.create.card1.npiPlaceholder',
                          '10-digit NPI e.g. 1982049102'
                        )}
                        disabled={isBusy}
                        {...register('npiNumber')}
                        className={`facility-input ${errors.npiNumber ? 'has-error' : ''}`}
                      />
                      {errors.npiNumber && (
                        <p className="facility-field-error">
                          <AlertCircle size={13} className="shrink-0" />
                          <span>{errors.npiNumber.message}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* CARD 4: Governance & Initial Status */}
                <div className="facility-card" data-node-id="20:10037">
                  {/* Header */}
                  <div className="facility-card-header">
                    <div className="facility-card-header-left">
                      <div className="facility-card-icon-wrap cyan">
                        <img src={iconGovernance} alt="" className="w-5 h-5" />
                      </div>
                      <div className="facility-card-title-group">
                        <h2 className="facility-card-title">
                          {t('facilities.create.card4.title', 'Governance & Initial Status')}
                        </h2>
                        <p className="facility-card-subtitle">
                          {t(
                            'facilities.create.card4.subtitle',
                            'Cryptographic authority mapping and access tier'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Operational Status Designation */}
                  <div className="facility-field-group">
                    <span className="facility-field-label">
                      {t('facilities.create.card4.statusLabel', 'Operational Status Designation')}
                    </span>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <div className="facility-status-cards-row">
                          {/* Active */}
                          <div
                            className={`facility-status-card ${
                              field.value === 'Active' ? 'selected' : ''
                            }`}
                            onClick={() => field.onChange('Active')}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && field.onChange('Active')}
                          >
                            <div className="facility-status-radio-dot">
                              {field.value === 'Active' && (
                                <div className="facility-status-radio-inner" />
                              )}
                            </div>
                            <h3 className="facility-status-card-title">
                              {t('facilities.create.card4.statusActive', 'Active')}
                            </h3>
                            <p className="facility-status-card-desc">
                              {t(
                                'facilities.create.card4.statusActiveDesc',
                                'Ready for immediate staff onboarding'
                              )}
                            </p>
                          </div>

                          {/* Pending Review */}
                          <div
                            className={`facility-status-card ${
                              field.value === 'Pending Review' ? 'selected' : ''
                            }`}
                            onClick={() => field.onChange('Pending Review')}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && field.onChange('Pending Review')}
                          >
                            <div className="facility-status-radio-dot">
                              {field.value === 'Pending Review' && (
                                <div className="facility-status-radio-inner" />
                              )}
                            </div>
                            <h3 className="facility-status-card-title">
                              {t('facilities.create.card4.statusPending', 'Pending Review')}
                            </h3>
                            <p className="facility-status-card-desc">
                              {t(
                                'facilities.create.card4.statusPendingDesc',
                                'Awaiting document accreditation'
                              )}
                            </p>
                          </div>

                          {/* Draft / Staging */}
                          <div
                            className={`facility-status-card ${
                              field.value === 'Draft / Staging' ? 'selected' : ''
                            }`}
                            onClick={() => field.onChange('Draft / Staging')}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && field.onChange('Draft / Staging')}
                          >
                            <div className="facility-status-radio-dot">
                              {field.value === 'Draft / Staging' && (
                                <div className="facility-status-radio-inner" />
                              )}
                            </div>
                            <h3 className="facility-status-card-title">
                              {t('facilities.create.card4.statusDraft', 'Draft / Staging')}
                            </h3>
                            <p className="facility-status-card-desc">
                              {t(
                                'facilities.create.card4.statusDraftDesc',
                                'Config sandbox isolation'
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    />
                  </div>

                  {/* Initial Facility Admin Assignment */}
                  <div className="facility-field-group">
                    <label htmlFor={adminId} className="facility-field-label">
                      {t('facilities.create.card4.adminLabel', 'Initial Facility Admin Assignment')}
                    </label>
                    <div className="facility-select-wrap">
                      <img src={iconAdminPool} alt="" className="facility-select-left-icon w-4 h-4" />
                      <select
                        id={adminId}
                        disabled={isBusy}
                        {...register('initialAdmin')}
                        className="facility-select with-left-icon"
                      >
                        {ADMIN_ASSIGNMENT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <img src={iconDropdownChevron} alt="" className="facility-select-chevron w-3 h-2" />
                    </div>
                  </div>

                  {/* Department Capabilities Checklist */}
                  <div className="facility-field-group">
                    <span className="facility-field-label">
                      {t('facilities.create.card4.capabilitiesLabel', 'Department Capabilities')}
                    </span>
                    <div className="facility-capabilities-grid">
                      {DEPARTMENT_CAPABILITIES.map((cap) => {
                        const isSelected = currentCapabilities.includes(cap.id);
                        return (
                          <div
                            key={cap.id}
                            className={`facility-cap-pill ${isSelected ? 'selected' : ''} ${
                              cap.fullWidth ? 'full-width' : ''
                            }`}
                            onClick={() => toggleCapability(cap.id)}
                            role="checkbox"
                            aria-checked={isSelected}
                            tabIndex={0}
                            onKeyDown={(e) => e.key === ' ' && toggleCapability(cap.id)}
                          >
                            <div className="facility-cap-checkbox">
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                            <span className="facility-cap-label">{cap.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* ==============================================================
                  RIGHT COLUMN: Location, Communications & Visual Context
                  ============================================================== */}
              <div className="facility-grid-right" data-node-id="20:10113">
                {/* CARD 2: Location & Address Details */}
                <div className="facility-card" data-node-id="20:10114">
                  {/* Header */}
                  <div className="facility-card-header">
                    <div className="facility-card-header-left">
                      <div className="facility-card-icon-wrap blue">
                        <img src={iconLocation} alt="" className="w-5 h-5" />
                      </div>
                      <div className="facility-card-title-group">
                        <h2 className="facility-card-title">
                          {t('facilities.create.card2.title', 'Location & Address')}
                        </h2>
                        <p className="facility-card-subtitle">
                          {t(
                            'facilities.create.card2.subtitle',
                            'Physical coordinates & routing'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Street Address Line 1 */}
                  <div className="facility-field-group">
                    <label htmlFor={address1Id} className="facility-field-label">
                      {t('facilities.create.card2.address1', 'Street Address Line 1')}{' '}
                      <span className="facility-field-required">*</span>
                    </label>
                    <input
                      id={address1Id}
                      type="text"
                      placeholder={t(
                        'facilities.create.card2.address1Placeholder',
                        'e.g. 1000 10th Avenue'
                      )}
                      disabled={isBusy}
                      {...register('streetAddress1')}
                      className={`facility-input ${errors.streetAddress1 ? 'has-error' : ''}`}
                    />
                    {errors.streetAddress1 && (
                      <p className="facility-field-error">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{errors.streetAddress1.message}</span>
                      </p>
                    )}
                  </div>

                  {/* Street Address Line 2 */}
                  <div className="facility-field-group">
                    <label htmlFor={address2Id} className="facility-field-label">
                      {t('facilities.create.card2.address2', 'Street Address Line 2')}
                    </label>
                    <input
                      id={address2Id}
                      type="text"
                      placeholder={t(
                        'facilities.create.card2.address2Placeholder',
                        'Suite / Pavilion / Interventional Wing'
                      )}
                      disabled={isBusy}
                      {...register('streetAddress2')}
                      className="facility-input"
                    />
                  </div>

                  {/* Row: City & State */}
                  <div className="facility-two-col-row">
                    <div className="facility-field-group">
                      <label htmlFor={cityId} className="facility-field-label">
                        {t('facilities.create.card2.city', 'City')}{' '}
                        <span className="facility-field-required">*</span>
                      </label>
                      <input
                        id={cityId}
                        type="text"
                        placeholder={t('facilities.create.card2.cityPlaceholder', 'New York')}
                        disabled={isBusy}
                        {...register('city')}
                        className={`facility-input ${errors.city ? 'has-error' : ''}`}
                      />
                      {errors.city && (
                        <p className="facility-field-error">
                          <AlertCircle size={13} className="shrink-0" />
                          <span>{errors.city.message}</span>
                        </p>
                      )}
                    </div>

                    <div className="facility-field-group">
                      <label htmlFor={stateId} className="facility-field-label">
                        {t('facilities.create.card2.state', 'State / Province')}{' '}
                        <span className="facility-field-required">*</span>
                      </label>
                      <input
                        id={stateId}
                        type="text"
                        placeholder={t('facilities.create.card2.statePlaceholder', 'NY')}
                        disabled={isBusy}
                        {...register('state')}
                        className={`facility-input ${errors.state ? 'has-error' : ''}`}
                      />
                      {errors.state && (
                        <p className="facility-field-error">
                          <AlertCircle size={13} className="shrink-0" />
                          <span>{errors.state.message}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row: Postal Code & Country */}
                  <div className="facility-two-col-row">
                    <div className="facility-field-group">
                      <label htmlFor={postalCodeId} className="facility-field-label">
                        {t('facilities.create.card2.postalCode', 'Postal / ZIP Code')}{' '}
                        <span className="facility-field-required">*</span>
                      </label>
                      <input
                        id={postalCodeId}
                        type="text"
                        placeholder={t('facilities.create.card2.postalCodePlaceholder', '10019')}
                        disabled={isBusy}
                        {...register('postalCode')}
                        className={`facility-input ${errors.postalCode ? 'has-error' : ''}`}
                      />
                      {errors.postalCode && (
                        <p className="facility-field-error">
                          <AlertCircle size={13} className="shrink-0" />
                          <span>{errors.postalCode.message}</span>
                        </p>
                      )}
                    </div>

                    <div className="facility-field-group">
                      <label htmlFor={countryId} className="facility-field-label">
                        {t('facilities.create.card2.country', 'Country')}{' '}
                        <span className="facility-field-required">*</span>
                      </label>
                      <div className="facility-select-wrap">
                        <select
                          id={countryId}
                          disabled={isBusy}
                          {...register('country')}
                          className="facility-select"
                        >
                          {COUNTRY_OPTIONS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <img src={iconDropdownChevron} alt="" className="facility-select-chevron w-3 h-2" />
                      </div>
                    </div>
                  </div>

                  {/* Geographic Validation Map Element */}
                  <div className="facility-field-group pt-2">
                    <div className="facility-field-label-row">
                      <span className="facility-field-label text-sm text-[#494552]">
                        {t('facilities.create.card2.geoValidation', 'Geographic Validation')}
                      </span>
                      <div className="flex items-center gap-1 text-[#00696b] text-xs font-bold">
                        <img src={iconGpsCrosshair} alt="" className="w-3.5 h-3.5" />
                        <span>{t('facilities.create.card2.gpsLocked', 'GPS Locked')}</span>
                      </div>
                    </div>

                    <div className="facility-map-container">
                      <img src={mapManhattanImg} alt="Map" className="facility-map-bg-img" />
                      <div className="facility-map-scrim" />
                      <div className="facility-map-coords-badge">
                        <div className="facility-map-beacon-dot" />
                        <span className="facility-map-coords-text">
                          {t(
                            'facilities.create.card2.coordinates',
                            '40.7712° N, 73.9876° W (Manhattan District)'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 3: Contact & Operational Details */}
                <div className="facility-card" data-node-id="20:10180">
                  {/* Header */}
                  <div className="facility-card-header">
                    <div className="facility-card-header-left">
                      <div className="facility-card-icon-wrap blue">
                        <img src={iconContactOps} alt="" className="w-5 h-5" />
                      </div>
                      <div className="facility-card-title-group">
                        <h2 className="facility-card-title">
                          {t('facilities.create.card3.title', 'Contact & Operations')}
                        </h2>
                        <p className="facility-card-subtitle">
                          {t(
                            'facilities.create.card3.subtitle',
                            'Direct lines, triage & dispatch'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Row: Main Telephone & Emergency Phone */}
                  <div className="facility-two-col-row">
                    <div className="facility-field-group">
                      <label htmlFor={mainPhoneId} className="facility-field-label">
                        {t('facilities.create.card3.mainPhone', 'Facility Main Telephone')}{' '}
                        <span className="facility-field-required">*</span>
                      </label>
                      <input
                        id={mainPhoneId}
                        type="tel"
                        placeholder={t(
                          'facilities.create.card3.mainPhonePlaceholder',
                          '+1 (212) 523-4000'
                        )}
                        disabled={isBusy}
                        {...register('mainTelephone')}
                        className={`facility-input ${errors.mainTelephone ? 'has-error' : ''}`}
                      />
                      {errors.mainTelephone && (
                        <p className="facility-field-error">
                          <AlertCircle size={13} className="shrink-0" />
                          <span>{errors.mainTelephone.message}</span>
                        </p>
                      )}
                    </div>

                    <div className="facility-field-group">
                      <div className="facility-field-label-row">
                        <label htmlFor={emergencyPhoneId} className="facility-field-label">
                          {t('facilities.create.card3.emergencyPhone', 'Emergency / Triage')}
                        </label>
                        <span className="facility-field-priority-tag">
                          {t('facilities.create.card3.priorityBadge', 'Priority')}
                        </span>
                      </div>
                      <input
                        id={emergencyPhoneId}
                        type="tel"
                        placeholder={t(
                          'facilities.create.card3.emergencyPhonePlaceholder',
                          '+1 (212) 523-4911'
                        )}
                        disabled={isBusy}
                        {...register('emergencyTelephone')}
                        className="facility-input"
                      />
                    </div>
                  </div>

                  {/* Administrative Email */}
                  <div className="facility-field-group">
                    <label htmlFor={emailId} className="facility-field-label">
                      {t('facilities.create.card3.email', 'Official Administrative Email')}{' '}
                      <span className="facility-field-required">*</span>
                    </label>
                    <input
                      id={emailId}
                      type="email"
                      placeholder={t(
                        'facilities.create.card3.emailPlaceholder',
                        'admissions.west@careid-health.org'
                      )}
                      disabled={isBusy}
                      {...register('administrativeEmail')}
                      className={`facility-input ${errors.administrativeEmail ? 'has-error' : ''}`}
                    />
                    {errors.administrativeEmail && (
                      <p className="facility-field-error">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{errors.administrativeEmail.message}</span>
                      </p>
                    )}
                  </div>

                  {/* Billing Contact */}
                  <div className="facility-field-group">
                    <label htmlFor={billingId} className="facility-field-label">
                      {t('facilities.create.card3.billing', 'Billing & Fiduciary Contact')}
                    </label>
                    <input
                      id={billingId}
                      type="email"
                      placeholder={t(
                        'facilities.create.card3.billingPlaceholder',
                        'billing-ny@careid-health.org'
                      )}
                      disabled={isBusy}
                      {...register('billingContact')}
                      className="facility-input"
                    />
                  </div>

                  {/* Timezone (IANA Standards-based) */}
                  <div className="facility-field-group">
                    <label htmlFor={timezoneId} className="facility-field-label">
                      {t('facilities.create.card3.timezone', 'Facility Operating Timezone (IANA)')}
                    </label>
                    <div className="facility-select-wrap">
                      <select
                        id={timezoneId}
                        disabled={isBusy}
                        {...register('timezone')}
                        className="facility-select"
                      >
                        {getIanaTimezones().map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                      <img src={iconDropdownChevron} alt="" className="facility-select-chevron w-3 h-2" />
                    </div>
                  </div>

                  {/* Billing Currency (ISO 4217) */}
                  <div className="facility-field-group">
                    <label htmlFor={currencyId} className="facility-field-label">
                      Billing Currency (ISO 4217)
                    </label>
                    <div className="facility-select-wrap">
                      <select
                        id={currencyId}
                        disabled={isBusy}
                        {...register('billingCurrency')}
                        className="facility-select"
                      >
                        {ISO_CURRENCIES.map((cur) => (
                          <option key={cur.code} value={cur.code}>
                            {cur.name}
                          </option>
                        ))}
                      </select>
                      <img src={iconDropdownChevron} alt="" className="facility-select-chevron w-3 h-2" />
                    </div>
                  </div>

                  {/* Pricing Fallback Governance Policy */}
                  <div className="facility-field-group">
                    <label htmlFor={pricingPolicyId} className="facility-field-label">
                      Unconfigured Procedure Pricing Policy
                    </label>
                    <div className="facility-select-wrap">
                      <select
                        id={pricingPolicyId}
                        disabled={isBusy}
                        {...register('unconfiguredPricingPolicy')}
                        className="facility-select"
                      >
                        {PRICING_FALLBACK_POLICIES.map((pol) => (
                          <option key={pol.value} value={pol.value}>
                            {pol.label}
                          </option>
                        ))}
                      </select>
                      <img src={iconDropdownChevron} alt="" className="facility-select-chevron w-3 h-2" />
                    </div>
                  </div>
                </div>

                {/* CARD 5: HIPAA & FHIR R4 Ready Context Widget */}
                <div className="facility-hipaa-card" data-node-id="20:10227">
                  <img src={bgHipaaGeometry} alt="" className="facility-hipaa-watermark" />
                  <div className="facility-hipaa-header">
                    <img src={iconHipaaShield} alt="" className="w-4 h-4" />
                    <h3 className="facility-hipaa-title">
                      {t('facilities.create.hipaa.badge', 'HIPAA & FHIR R4 READY')}
                    </h3>
                  </div>
                  <p className="facility-hipaa-desc">
                    {t(
                      'facilities.create.hipaa.text',
                      'Upon creation, an institutional root public key and FHIR interoperability endpoints are automatically provisioned. Staff accounts will immediately inherit localized RBAC privileges.'
                    )}
                  </p>
                  <div className="facility-hipaa-footer">
                    <img src={iconVaultLock} alt="" className="w-3.5 h-3.5" />
                    <span>
                      {t('facilities.create.hipaa.sha', 'SHA-256 Vault Hash Verification')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ==============================================================
                BOTTOM ACTION BAR (Full width)
                ============================================================== */}
            <div className="facility-bottom-action-bar" data-node-id="20:10243">
              <div className="facility-bottom-ledger-notice">
                <div className="facility-ledger-icon-wrap">
                  <img src={iconLedgerShield} alt="" className="w-3.5 h-4" />
                </div>
                <p className="facility-ledger-text">
                  {t(
                    'facilities.create.ledgerNotice',
                    'Facility will be registered on the Care ID cryptographic ledger upon save.'
                  )}
                </p>
              </div>

              <div className="facility-bottom-actions">
                <button
                  type="button"
                  className="facility-btn-discard"
                  onClick={handleCancel}
                  disabled={isBusy}
                >
                  {t('facilities.create.discardChanges', 'Discard Changes')}
                </button>
                <button
                  type="submit"
                  className="facility-btn-save-continue"
                  disabled={isBusy}
                >
                  {isBusy ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{t('facilities.create.saving', 'Saving...')}</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {t(
                          'facilities.create.saveAndContinue',
                          'Save & Continue to Facility Details'
                        )}
                      </span>
                      <img src={iconBtnArrowRight} alt="" className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </main>
      </div>

      {/* Snackbar Feedback */}
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

export default AdminAddFacility;
