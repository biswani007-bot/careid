import React, { useState, useRef, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Menu,
  User,
  IdCard,
  Calendar,
  ChevronDown,
  Camera,
  CheckCircle2,
  AlertCircle,
  X,
  UploadCloud,
} from 'lucide-react';

// Styling
import '../dashboard/AdminDashboard.css';
import './AdminPatientProfile.css';
import './AdminPatientRegistration.css';

// Authentic Shared Components & Branding
import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import iconBell from '../../assets/patients/icon-bell.svg';
import iconApps from '../../assets/patients/icon-apps.svg';
import breadcrumbChevron from '../../assets/patients/icon-chevron-right.svg';

// Service & Types
import {
  useCreatePatientMutation,
  type PatientItem,
  type PatientGender,
} from '../../services/patientService';

// Zod Validation Schema
const patientRegistrationSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'First name is required (minimum 2 characters)'),
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name is required (minimum 2 characters)'),
  dob: z
    .string()
    .trim()
    .min(1, 'Please enter a valid date of birth'),
  gender: z.enum(['Female', 'Male', 'Other', 'Prefer not to say'] as const, {
    errorMap: () => ({ message: 'Please select a gender' }),
  }),
  email: z
    .string()
    .trim()
    .email('A valid email address is required'),
  phone: z
    .string()
    .trim()
    .min(6, 'Phone number is required (minimum 6 digits)'),
  zipCode: z
    .string()
    .trim()
    .min(3, 'ZIP / Postal code is required'),
  address: z
    .string()
    .trim()
    .min(5, 'Residential address is required (minimum 5 characters)'),
});

type PatientRegistrationFormData = z.infer<typeof patientRegistrationSchema>;

export interface AdminPatientRegistrationProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminPatientRegistration: React.FC<AdminPatientRegistrationProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Navigation & Drawer State
  const [activeNav, setActiveNav] = useState('patients');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Photo Upload State (supporting empty initial state)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Success State & Modal
  const [createdPatient, setCreatedPatient] = useState<PatientItem | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // React Query Mutation
  const createPatientMutation = useCreatePatientMutation();

  // Accessibility unique IDs
  const firstNameId = useId();
  const lastNameId = useId();
  const dobId = useId();
  const genderId = useId();
  const emailId = useId();
  const phoneId = useId();
  const zipId = useId();
  const addressId = useId();

  // React Hook Form
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PatientRegistrationFormData>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dob: '',
      gender: '' as unknown as 'Female',
      email: '',
      phone: '',
      zipCode: '',
      address: '',
    },
  });

  // Photo handlers
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setSnackbarMessage('Please select a valid image file (JPG, PNG, WebP).');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Form Submission
  const onSubmit = async (formData: PatientRegistrationFormData) => {
    try {
      const newPatient = await createPatientMutation.mutateAsync({
        firstName: formData.firstName,
        lastName: formData.lastName,
        dob: formData.dob,
        gender: formData.gender as PatientGender,
        email: formData.email,
        phone: formData.phone,
        zipCode: formData.zipCode,
        address: formData.address,
        photoUrl: photoPreview || undefined,
      });

      setCreatedPatient(newPatient);
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      setSnackbarMessage(err?.message || 'Failed to register patient. Please verify your inputs and try again.');
    }
  };

  const handleResetForm = () => {
    reset();
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setCreatedPatient(null);
    setIsSuccessModalOpen(false);
  };

  // Navigation Handlers
  const handleNavClick = (navId: string, path: string) => {
    setActiveNav(navId);
    setIsDrawerOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="careid-dashboard-shell">
      {/* ====================================================================
          SIDEBAR NAVIGATION (Fixed Stationary Shell with Patients Active)
          ==================================================================== */}
      <AdminSidebar
        activeNav={activeNav}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={(path) => handleNavClick('patients', path)}
        onLogout={handleLogoutClick}
      />

      {/* Backdrop overlay for mobile drawer */}
      {isDrawerOpen && (
        <div
          className="careid-drawer-backdrop"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ====================================================================
          MAIN CONTENT AREA WITH TOP APP BAR
          ==================================================================== */}
      <div className="careid-main-wrapper patient-registration-container">
        {/* TopAppBar - Matching Figma Node 20:1990 */}
        <header className="careid-top-navbar" data-node-id="20:1990">
          <div className="header-left-cluster">
            <button
              type="button"
              className="header-menu-toggle"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>

            {/* Breadcrumbs matching Figma design hierarchy */}
            <div className="patients-breadcrumbs">
              <button
                type="button"
                className="patients-breadcrumb-root"
                onClick={() => handleNavClick('dashboard', '/admin/dashboard')}
              >
                {t('patientRegistration.breadcrumbs.admin', 'Admin')}
              </button>
              <span className="patients-breadcrumb-sep">
                <img src={breadcrumbChevron} alt=">" />
              </span>
              <button
                type="button"
                className="patients-breadcrumb-root"
                onClick={() => handleNavClick('patients', '/admin/patients')}
              >
                {t('patientRegistration.breadcrumbs.patients', 'Patients Directory')}
              </button>
              <span className="patients-breadcrumb-sep">
                <img src={breadcrumbChevron} alt=">" />
              </span>
              <span className="patients-breadcrumb-current">
                {t('patientRegistration.breadcrumbs.register', 'Register New Patient')}
              </span>
            </div>
          </div>

          {/* Right Action Cluster */}
          <div className="users-header-actions" data-node-id="20:1991">
            <button
              type="button"
              className="users-header-icon-btn"
              aria-label="Notifications"
              onClick={() => setSnackbarMessage('You have 2 pending notifications.')}
              data-node-id="20:1992"
            >
              <img src={iconBell} alt="Notifications" />
              <span className="users-header-badge" />
            </button>

            <button
              type="button"
              className="users-header-icon-btn"
              aria-label="Applications"
              onClick={() => setSnackbarMessage('CareID Suite application launcher.')}
              data-node-id="20:1995"
            >
              <img src={iconApps} alt="Apps" />
            </button>

            <div className="users-header-divider" data-node-id="20:1999" />

            <button
              type="button"
              className="patient-profile-admin-console-pill"
              onClick={() => handleNavClick('dashboard', '/admin/dashboard')}
              data-node-id="20:2001"
            >
              {t('header.adminConsole', 'Admin Console')}
            </button>

            <div
              className="users-header-avatar cursor-pointer"
              data-node-id="20:2003"
              onClick={() => handleNavClick('profile', '/admin/profile')}
              title="My Profile & Information"
            >
              <AdminProfileAvatar size={32} />
            </div>
          </div>
        </header>

        {/* ====================================================================
            SCROLLABLE CANVAS AREA (Figma Node 20:2005)
            ==================================================================== */}
        <main className="patient-registration-canvas" data-node-id="20:2005">
          <div className="patient-reg-form-wrapper" data-node-id="20:2006">
            {/* Page Header (Figma Node 20:2007) */}
            <div className="patient-reg-heading-box" data-node-id="20:2007">
              <h1 className="patient-reg-title" data-node-id="20:2009">
                {t('patientRegistration.title', 'Register New Patient')}
              </h1>
              <p className="patient-reg-subtitle" data-node-id="20:2011">
                {t(
                  'patientRegistration.subtitle',
                  'Enter the details below to create a new patient profile in the CareID system.'
                )}
              </p>
            </div>

            {/* Registration Form (Figma Node 20:2012) */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="patient-reg-form"
              data-node-id="20:2012"
            >
              {/* ================================================================
                  SECTION 1: PERSONAL DETAILS (Figma Node 20:2013)
                  ================================================================ */}
              <div className="patient-reg-card" data-node-id="20:2013">
                <div className="patient-reg-card-header" data-node-id="20:2014">
                  <div className="patient-reg-card-icon" data-node-id="20:2015">
                    <User size={18} />
                  </div>
                  <h2 className="patient-reg-card-title" data-node-id="20:2017">
                    {t('patientRegistration.personalDetails.title', 'Personal Details')}
                  </h2>
                </div>

                {/* Patient Photo Row (Figma Node 20:2020) */}
                <div className="patient-photo-row" data-node-id="20:2020">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={handlePhotoSelect}
                    aria-label="Upload Patient Photo"
                  />
                  <div
                    className="patient-photo-circle"
                    onClick={triggerFileInput}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        triggerFileInput();
                      }
                    }}
                    title="Click to upload patient photo"
                    data-node-id="20:2021"
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Patient preview"
                        className="patient-photo-preview"
                      />
                    ) : (
                      <div className="patient-photo-empty-icon" data-node-id="20:2022">
                        <Camera size={30} />
                      </div>
                    )}
                    <div className="patient-photo-overlay" data-node-id="20:2024">
                      <span>{photoPreview ? 'Change' : t('patientRegistration.personalDetails.uploadOverlay', 'Upload')}</span>
                    </div>
                  </div>

                  <div className="patient-photo-info" data-node-id="20:2027">
                    <div className="patient-photo-name" data-node-id="20:2029">
                      {t('patientRegistration.personalDetails.photoTitle', 'Patient Photo')}
                    </div>
                    <div className="patient-photo-help" data-node-id="20:2031">
                      {t(
                        'patientRegistration.personalDetails.photoSubtitle',
                        'Recommended size: 400x400px. JPG, PNG.'
                      )}
                    </div>
                    {photoPreview && (
                      <div className="patient-photo-actions">
                        <button
                          type="button"
                          className="patient-photo-action-btn"
                          onClick={triggerFileInput}
                        >
                          {t('patientRegistration.personalDetails.changePhoto', 'Change Photo')}
                        </button>
                        <button
                          type="button"
                          className="patient-photo-action-btn remove"
                          onClick={handleRemovePhoto}
                        >
                          {t('patientRegistration.personalDetails.removePhoto', 'Remove Photo')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Fields: Grid 2 Columns */}
                <div className="patient-reg-grid" data-node-id="20:2018">
                  {/* First Name (Figma Node 20:2032) */}
                  <div className="patient-reg-field" data-node-id="20:2032">
                    <div className="patient-reg-input-wrap">
                      <input
                        id={firstNameId}
                        type="text"
                        {...register('firstName')}
                        placeholder={t('patientRegistration.personalDetails.firstNameLabel', 'First Name')}
                        className={`patient-reg-input ${errors.firstName ? 'has-error' : ''}`}
                        aria-invalid={errors.firstName ? 'true' : 'false'}
                        data-node-id="20:2033"
                      />
                    </div>
                    {errors.firstName && (
                      <span className="patient-reg-error-text" role="alert">
                        <AlertCircle size={14} />
                        {errors.firstName.message}
                      </span>
                    )}
                  </div>

                  {/* Last Name (Figma Node 20:2035) */}
                  <div className="patient-reg-field" data-node-id="20:2035">
                    <div className="patient-reg-input-wrap">
                      <input
                        id={lastNameId}
                        type="text"
                        {...register('lastName')}
                        placeholder={t('patientRegistration.personalDetails.lastNameLabel', 'Last Name')}
                        className={`patient-reg-input ${errors.lastName ? 'has-error' : ''}`}
                        aria-invalid={errors.lastName ? 'true' : 'false'}
                        data-node-id="20:2036"
                      />
                    </div>
                    {errors.lastName && (
                      <span className="patient-reg-error-text" role="alert">
                        <AlertCircle size={14} />
                        {errors.lastName.message}
                      </span>
                    )}
                  </div>

                  {/* Date of Birth (Figma Node 20:2038) */}
                  <div className="patient-reg-field" data-node-id="20:2038">
                    <div className="patient-reg-input-wrap">
                      <label htmlFor={dobId} className="patient-reg-inner-label" data-node-id="20:2050">
                        {t('patientRegistration.personalDetails.dobLabel', 'Date of Birth')}
                      </label>
                      <input
                        id={dobId}
                        type="date"
                        {...register('dob')}
                        className={`patient-reg-input patient-reg-input-labeled ${errors.dob ? 'has-error' : ''}`}
                        aria-invalid={errors.dob ? 'true' : 'false'}
                        data-node-id="20:2039"
                      />
                      <div className="patient-reg-icon-right" data-node-id="20:2048">
                        <Calendar size={18} />
                      </div>
                    </div>
                    {errors.dob && (
                      <span className="patient-reg-error-text" role="alert">
                        <AlertCircle size={14} />
                        {errors.dob.message}
                      </span>
                    )}
                  </div>

                  {/* Gender (Figma Node 20:2051) */}
                  <div className="patient-reg-field" data-node-id="20:2051">
                    <div className="patient-reg-input-wrap">
                      <label htmlFor={genderId} className="patient-reg-inner-label" data-node-id="20:2058">
                        {t('patientRegistration.personalDetails.genderLabel', 'Gender')}
                      </label>
                      <Controller
                        name="gender"
                        control={control}
                        render={({ field }) => (
                          <select
                            id={genderId}
                            {...field}
                            className={`patient-reg-select ${errors.gender ? 'has-error' : ''}`}
                            aria-invalid={errors.gender ? 'true' : 'false'}
                            data-node-id="20:2052"
                          >
                            <option value="" disabled>
                              {t('patientRegistration.personalDetails.genderPlaceholder', 'Select gender')}
                            </option>
                            <option value="Female">
                              {t('patientRegistration.personalDetails.genderOptions.female', 'Female')}
                            </option>
                            <option value="Male">
                              {t('patientRegistration.personalDetails.genderOptions.male', 'Male')}
                            </option>
                            <option value="Other">
                              {t('patientRegistration.personalDetails.genderOptions.other', 'Other')}
                            </option>
                            <option value="Prefer not to say">
                              {t('patientRegistration.personalDetails.genderOptions.preferNotToSay', 'Prefer not to say')}
                            </option>
                          </select>
                        )}
                      />
                      <div className="patient-reg-icon-right" data-node-id="20:2055">
                        <ChevronDown size={18} />
                      </div>
                    </div>
                    {errors.gender && (
                      <span className="patient-reg-error-text" role="alert">
                        <AlertCircle size={14} />
                        {errors.gender.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ================================================================
                  SECTION 2: CONTACT DETAILS (Figma Node 20:2059)
                  ================================================================ */}
              <div className="patient-reg-card" data-node-id="20:2059">
                <div className="patient-reg-card-header" data-node-id="20:2060">
                  <div className="patient-reg-card-icon" data-node-id="20:2061">
                    <IdCard size={20} />
                  </div>
                  <h2 className="patient-reg-card-title" data-node-id="20:2063">
                    {t('patientRegistration.contactDetails.title', 'Contact Details')}
                  </h2>
                </div>

                <div className="patient-reg-grid" data-node-id="20:2064">
                  {/* Email Address (Full Width) (Figma Node 20:2065) */}
                  <div className="patient-reg-field patient-reg-field-full" data-node-id="20:2065">
                    <div className="patient-reg-input-wrap">
                      <input
                        id={emailId}
                        type="email"
                        {...register('email')}
                        placeholder={t('patientRegistration.contactDetails.emailLabel', 'Email Address')}
                        className={`patient-reg-input ${errors.email ? 'has-error' : ''}`}
                        aria-invalid={errors.email ? 'true' : 'false'}
                        data-node-id="20:2066"
                      />
                    </div>
                    {errors.email && (
                      <span className="patient-reg-error-text" role="alert">
                        <AlertCircle size={14} />
                        {errors.email.message}
                      </span>
                    )}
                  </div>

                  {/* Phone Number (Half Width) (Figma Node 20:2068) */}
                  <div className="patient-reg-field" data-node-id="20:2068">
                    <div className="patient-reg-input-wrap">
                      <input
                        id={phoneId}
                        type="tel"
                        {...register('phone')}
                        placeholder={t('patientRegistration.contactDetails.phoneLabel', 'Phone Number')}
                        className={`patient-reg-input ${errors.phone ? 'has-error' : ''}`}
                        aria-invalid={errors.phone ? 'true' : 'false'}
                        data-node-id="20:2069"
                      />
                    </div>
                    {errors.phone && (
                      <span className="patient-reg-error-text" role="alert">
                        <AlertCircle size={14} />
                        {errors.phone.message}
                      </span>
                    )}
                  </div>

                  {/* ZIP / Postal Code (Half Width) (Figma Node 20:2071) */}
                  <div className="patient-reg-field" data-node-id="20:2071">
                    <div className="patient-reg-input-wrap">
                      <input
                        id={zipId}
                        type="text"
                        {...register('zipCode')}
                        placeholder={t('patientRegistration.contactDetails.zipLabel', 'ZIP / Postal Code')}
                        className={`patient-reg-input ${errors.zipCode ? 'has-error' : ''}`}
                        aria-invalid={errors.zipCode ? 'true' : 'false'}
                        data-node-id="20:2072"
                      />
                    </div>
                    {errors.zipCode && (
                      <span className="patient-reg-error-text" role="alert">
                        <AlertCircle size={14} />
                        {errors.zipCode.message}
                      </span>
                    )}
                  </div>

                  {/* Residential Address (Full Width) (Figma Node 20:2074) */}
                  <div className="patient-reg-field patient-reg-field-full" data-node-id="20:2074">
                    <div className="patient-reg-input-wrap">
                      <input
                        id={addressId}
                        type="text"
                        {...register('address')}
                        placeholder={t('patientRegistration.contactDetails.addressLabel', 'Residential Address')}
                        className={`patient-reg-input ${errors.address ? 'has-error' : ''}`}
                        aria-invalid={errors.address ? 'true' : 'false'}
                        data-node-id="20:2075"
                      />
                    </div>
                    {errors.address && (
                      <span className="patient-reg-error-text" role="alert">
                        <AlertCircle size={14} />
                        {errors.address.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ================================================================
                  FORM FOOTER ACTIONS (Figma Node 20:2077)
                  ================================================================ */}
              <div className="patient-reg-actions" data-node-id="20:2077">
                <button
                  type="button"
                  className="patient-reg-btn-cancel"
                  onClick={() => handleNavClick('patients', '/admin/patients')}
                  data-node-id="20:2078"
                >
                  {t('patientRegistration.actions.cancel', 'Cancel')}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || createPatientMutation.isPending}
                  className="patient-reg-btn-submit"
                  data-node-id="20:2080"
                >
                  {isSubmitting || createPatientMutation.isPending ? (
                    <>
                      <UploadCloud size={16} className="animate-spin" />
                      <span>{t('patientRegistration.actions.submitting', 'Creating Account...')}</span>
                    </>
                  ) : (
                    <span>{t('patientRegistration.actions.createAccount', 'Create Account')}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>

      {/* ====================================================================
          REGISTRATION SUCCESS MODAL (Empty state to success feedback transition)
          ==================================================================== */}
      {isSuccessModalOpen && createdPatient && (
        <div
          className="patient-reg-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-dialog-title"
        >
          <div className="patient-reg-modal-card">
            <div className="patient-reg-modal-icon">
              <CheckCircle2 size={36} />
            </div>

            <h2 id="success-dialog-title" className="patient-reg-modal-title">
              {t('patientRegistration.successModal.title', 'Patient Registered Successfully')}
            </h2>

            <p className="patient-reg-modal-desc">
              {t('patientRegistration.successModal.message', {
                name: createdPatient.name,
                defaultValue: `A new patient profile for ${createdPatient.name} has been created and registered in CareID.`,
              })}
            </p>

            <div>
              <span className="text-xs text-[#494552] block mb-1">
                {t('patientRegistration.successModal.vaultIdLabel', 'Assigned Vault ID')}
              </span>
              <span className="patient-reg-modal-badge">{createdPatient.vaultId}</span>
            </div>

            <div className="patient-reg-modal-actions">
              <button
                type="button"
                className="patient-reg-modal-btn-primary"
                onClick={() => handleNavClick('patients', `/admin/patients/${createdPatient.id}`)}
              >
                {t('patientRegistration.successModal.viewProfile', 'View Patient Profile')}
              </button>

              <button
                type="button"
                className="patient-reg-modal-btn-secondary"
                onClick={handleResetForm}
              >
                {t('patientRegistration.successModal.registerAnother', 'Register Another Patient')}
              </button>

              <button
                type="button"
                className="patient-reg-modal-btn-tertiary"
                onClick={() => handleNavClick('patients', '/admin/patients')}
              >
                {t('patientRegistration.successModal.backToDirectory', 'Return to Patients Directory')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar feedback */}
      {snackbarMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 bg-[#191c1e] text-white px-5 py-3 rounded-lg shadow-xl text-sm flex items-center gap-3 z-50 animate-bounce"
        >
          <span>{snackbarMessage}</span>
          <button
            type="button"
            onClick={() => setSnackbarMessage(null)}
            className="text-gray-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminPatientRegistration;
