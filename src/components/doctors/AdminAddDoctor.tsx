import React, { useState, useId, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Menu,
  Search,
  Check,
  HelpCircle,
  Settings,
} from 'lucide-react';

// Styling
import '../dashboard/AdminDashboard.css';
import './AdminAddDoctor.css';

// Authentic Assets from Figma Node 20:2510
import avatarAdminImg from '../../assets/patients/avatar-admin.png';
import iconBell from '../../assets/patients/icon-bell.svg';
import iconBackArrow from '../../assets/doctors/icon-back-arrow.svg';
import iconUploadPhoto from '../../assets/doctors/icon-upload-photo.svg';
import secPersonal from '../../assets/doctors/sec-personal.svg';
import secProfessional from '../../assets/doctors/sec-professional.svg';
import secHospital from '../../assets/doctors/sec-hospital.svg';
import secVerification from '../../assets/doctors/sec-verification.svg';
import secSecurity from '../../assets/doctors/sec-security.svg';
import docMedicalLicense from '../../assets/doctors/doc-medical-license.svg';
import docGovernmentId from '../../assets/doctors/doc-government-id.svg';
import docAffiliationLetter from '../../assets/doctors/doc-affiliation-letter.svg';
import iconCopyPassword from '../../assets/doctors/icon-copy-password.svg';
import iconBtnArrow from '../../assets/doctors/icon-btn-arrow.svg';

// Shared Shell & Snackbar
import AdminSidebar from '../common/AdminSidebar';
import ActionSuccessSnackbar from '../users/ActionSuccessSnackbar';

// Doctor Service & Mutation
import {
  useAddDoctorMutation,
  type CreateDoctorPayload,
} from '../../services/doctorService';

export interface AdminAddDoctorProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

const addDoctorSchema = z.object({
  firstName: z.string().min(2, 'First name is required (minimum 2 characters)'),
  lastName: z.string().min(2, 'Last name is required (minimum 2 characters)'),
  gender: z.string().min(1, 'Please select a gender'),
  dob: z.string().min(1, 'Date of birth is required'),
  license: z.string().min(3, 'Medical license number is required'),
  issuingBody: z.string().min(2, 'Issuing body is required'),
  licenseExpiry: z.string().min(1, 'License expiry date is required'),
  experienceYears: z.string().min(1, 'Years of experience is required'),
  specialty: z.string().min(1, 'Primary specialty is required'),
  subSpecialty: z.string().optional(),
  hospital: z.string().min(1, 'Primary hospital is required'),
  department: z.string().min(2, 'Department is required'),
  officeNumber: z.string().min(1, 'Office number is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(7, 'Please enter a valid phone number'),
  temporaryPassword: z.string().default('HV360-T9x#m2L'),
});

type AddDoctorFormData = z.infer<typeof addDoctorSchema>;

const GENDER_OPTIONS = [
  { value: '', label: 'Select Gender' },
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
  { value: 'Non-binary', label: 'Non-binary' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
];

const SPECIALTY_OPTIONS = [
  { value: '', label: 'Select Specialty' },
  { value: 'Cardiology', label: 'Cardiology' },
  { value: 'Neurology', label: 'Neurology' },
  { value: 'Oncology', label: 'Oncology' },
  { value: 'Pediatrics', label: 'Pediatrics' },
  { value: 'Dermatology', label: 'Dermatology' },
  { value: 'Orthopedics', label: 'Orthopedics' },
  { value: 'General Surgery', label: 'General Surgery' },
  { value: 'Psychiatry', label: 'Psychiatry' },
  { value: 'Internal Medicine', label: 'Internal Medicine' },
];

const HOSPITAL_OPTIONS = [
  { value: '', label: 'Select Hospital' },
  { value: 'Metropolitan General', label: 'Metropolitan General' },
  { value: 'St. Jude Medical Center', label: 'St. Jude Medical Center' },
  { value: 'City Health Clinic', label: 'City Health Clinic' },
  { value: 'Valley Children\'s Hospital', label: 'Valley Children\'s Hospital' },
];

export const AdminAddDoctor: React.FC<AdminAddDoctorProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchInputId = useId();

  // Navigation & Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('doctors');

  // Photo & Documents upload state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<{
    medicalLicense?: string;
    governmentId?: string;
    affiliationLetter?: string;
  }>({});

  // Feedback Snackbar & Success Modal
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const medLicenseInputRef = useRef<HTMLInputElement>(null);
  const govIdInputRef = useRef<HTMLInputElement>(null);
  const affLetterInputRef = useRef<HTMLInputElement>(null);

  // TanStack Query Mutation
  const addDoctorMutation = useAddDoctorMutation();

  // React Hook Form
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddDoctorFormData>({
    resolver: zodResolver(addDoctorSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      gender: '',
      dob: '',
      license: '',
      issuingBody: '',
      licenseExpiry: '',
      experienceYears: '',
      specialty: '',
      subSpecialty: '',
      hospital: '',
      department: '',
      officeNumber: '',
      email: '',
      phone: '',
      temporaryPassword: 'HV360-T9x#m2L',
    },
  });

  const temporaryPassword = watch('temporaryPassword');

  const handleNavClick = (navKey: string, path: string) => {
    setActiveNav(navKey);
    setIsDrawerOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const handleBack = () => {
    handleNavClick('doctors', '/admin/doctors');
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(temporaryPassword);
    setCopiedPassword(true);
    setSnackbarMessage(t('doctors.addDoctor.passwordCopied', 'Temporary password copied to clipboard.'));
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setSnackbarMessage('File size exceeds 2MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocChange = (
    type: 'medicalLicense' | 'governmentId' | 'affiliationLetter',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedDocs((prev) => ({ ...prev, [type]: file.name }));
      setSnackbarMessage(`Attached ${file.name}`);
    }
  };

  const onSubmit = async (data: AddDoctorFormData) => {
    try {
      const payload: CreateDoctorPayload = {
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        dob: data.dob,
        avatarUrl: avatarPreview || undefined,
        license: data.license,
        issuingBody: data.issuingBody,
        licenseExpiry: data.licenseExpiry,
        experienceYears: data.experienceYears,
        specialty: data.specialty,
        subSpecialty: data.subSpecialty,
        hospital: data.hospital,
        department: data.department,
        officeNumber: data.officeNumber,
        email: data.email,
        phone: data.phone,
        temporaryPassword: data.temporaryPassword,
        verificationDocuments: uploadedDocs,
        status: 'Pending',
      };

      await addDoctorMutation.mutateAsync(payload);
      setSnackbarMessage(`Dr. ${data.firstName} ${data.lastName} successfully registered.`);
      setTimeout(() => {
        handleNavClick('doctors', '/admin/doctors');
      }, 700);
    } catch {
      setSnackbarMessage('Failed to register doctor. Please check all fields.');
    }
  };

  return (
    <div className="careid-dashboard-shell" data-node-id="20:2510">
      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="careid-drawer-backdrop show"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ====================================================================
          PERSISTENT FIXED SIDEBAR (Standard Admin Shell)
          ==================================================================== */}
      <AdminSidebar
        activeNav={activeNav}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={(path) => handleNavClick('doctors', path)}
        onLogout={onLogout}
      />

      {/* ====================================================================
          MAIN CONTENT WRAPPER (Header + Scrollable Canvas)
          ==================================================================== */}
      <div className="careid-main-wrapper" data-node-id="20:2511">
        {/* Top Navigation Bar */}
        <header className="careid-top-navbar" data-node-id="20:2512">
          <div className="header-left-cluster">
            <button
              type="button"
              className="header-menu-toggle"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>

            {/* Header Search Input */}
            <div className="patients-header-search-wrap" data-node-id="20:2513">
              <Search size={16} className="patients-header-search-input-icon" />
              <input
                id={searchInputId}
                type="text"
                placeholder={t('doctors.actions.searchPlaceholder', 'Search...')}
                className="patients-header-search-input"
                aria-label="Search"
              />
            </div>
          </div>

          {/* Right Action Icons & Admin Profile */}
          <div className="users-header-actions" data-node-id="20:2519">
            <button
              type="button"
              className="users-header-icon-btn"
              aria-label="Notifications"
              data-node-id="20:2520"
              onClick={() => setSnackbarMessage('No new system notifications.')}
            >
              <img src={iconBell} alt="Notifications" />
              <span className="users-header-badge" />
            </button>

            <button
              type="button"
              className="users-header-icon-btn"
              aria-label="Settings"
              data-node-id="20:2523"
              onClick={() => setSnackbarMessage('System Settings')}
            >
              <Settings size={18} className="text-[#494552]" />
            </button>

            <button
              type="button"
              className="users-header-icon-btn"
              aria-label="Support & Help"
              data-node-id="20:2526"
              onClick={() => setSnackbarMessage('Help & Documentation loaded.')}
            >
              <HelpCircle size={18} className="text-[#494552]" />
            </button>

            <div className="users-header-avatar-wrap" data-node-id="20:2529">
              <img
                src={avatarAdminImg}
                alt="Administrator"
                className="users-header-avatar"
              />
            </div>
          </div>
        </header>

        {/* ====================================================================
            SCROLLABLE CANVAS (Figma Node 20:2531)
            ==================================================================== */}
        <main className="add-doctor-canvas" data-node-id="20:2531">
          <div className="add-doctor-content-wrapper">
            {/* Page Header with Back Button (Figma Node 20:2532) */}
            <div className="add-doctor-header" data-node-id="20:2532">
            <button
              type="button"
              className="add-doctor-back-btn"
              onClick={handleBack}
              aria-label="Back to Doctor Directory"
              data-node-id="20:2533"
            >
              <img src={iconBackArrow} alt="Back" />
            </button>

            <div className="add-doctor-title-box" data-node-id="20:2536">
              <h1 className="add-doctor-heading" data-node-id="20:2537">
                {t('doctors.addDoctor.title', 'Add Doctor Profile')}
              </h1>
              <p className="add-doctor-subheading" data-node-id="20:2539">
                {t(
                  'doctors.addDoctor.subtitle',
                  'Register a new medical professional in the system.'
                )}
              </p>
            </div>
          </div>

          {/* ====================================================================
              FORM CONTAINER (Figma Node 20:2541)
              ==================================================================== */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="add-doctor-form"
            data-node-id="20:2541"
            noValidate
          >
            {/* ------------------------------------------------------------------
                SECTION 1: PERSONAL DETAILS (Figma Node 20:2542)
                ------------------------------------------------------------------ */}
            <section className="add-doctor-section" data-node-id="20:2542">
              <div className="add-doctor-section-header" data-node-id="20:2543">
                <div className="add-doctor-section-title-wrap">
                  <div className="add-doctor-section-icon" data-node-id="20:2545">
                    <img src={secPersonal} alt="" />
                  </div>
                  <h2 className="add-doctor-section-title" data-node-id="20:2547">
                    {t('doctors.addDoctor.sections.personal', 'Personal Details')}
                  </h2>
                </div>
              </div>

              <div className="add-doctor-personal-row" data-node-id="20:2548">
                {/* Avatar Photo Upload (Node 20:2549) */}
                <div className="add-doctor-avatar-col" data-node-id="20:2549">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png, image/jpeg"
                    style={{ display: 'none' }}
                    onChange={handlePhotoChange}
                  />
                  <div
                    className="add-doctor-avatar-circle"
                    onClick={() => fileInputRef.current?.click()}
                    data-node-id="20:2550"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="preview" />
                    ) : (
                      <>
                        <img
                          src={iconUploadPhoto}
                          alt=""
                          className="add-doctor-avatar-upload-icon"
                          data-node-id="20:2551"
                        />
                        <span className="add-doctor-avatar-label" data-node-id="20:2554">
                          {t('doctors.addDoctor.uploadPhoto', 'Upload Photo')}
                        </span>
                      </>
                    )}
                  </div>
                  <span className="add-doctor-avatar-hint" data-node-id="20:2559">
                    {t('doctors.addDoctor.photoHint', 'JPG or PNG, max 2MB')}
                  </span>
                </div>

                {/* 2-Column Personal Details Inputs (Node 20:2560) */}
                <div className="add-doctor-personal-grid" data-node-id="20:2560">
                  {/* First Name */}
                  <div className="add-doctor-field-group" data-node-id="20:2561">
                    <label className="add-doctor-label" htmlFor="firstName">
                      {t('doctors.addDoctor.fields.firstName', 'First Name')}
                      <span className="req">*</span>
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      {...register('firstName')}
                      className={`add-doctor-input ${errors.firstName ? 'error' : ''}`}
                      placeholder="e.g. Robert"
                      data-node-id="20:2562"
                    />
                    {errors.firstName && (
                      <span className="add-doctor-error-msg">
                        {errors.firstName.message}
                      </span>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="add-doctor-field-group" data-node-id="20:2564">
                    <label className="add-doctor-label" htmlFor="lastName">
                      {t('doctors.addDoctor.fields.lastName', 'Last Name')}
                      <span className="req">*</span>
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      {...register('lastName')}
                      className={`add-doctor-input ${errors.lastName ? 'error' : ''}`}
                      placeholder="e.g. Chen"
                      data-node-id="20:2565"
                    />
                    {errors.lastName && (
                      <span className="add-doctor-error-msg">
                        {errors.lastName.message}
                      </span>
                    )}
                  </div>

                  {/* Gender */}
                  <div className="add-doctor-field-group" data-node-id="20:2569">
                    <label className="add-doctor-label" htmlFor="gender">
                      {t('doctors.addDoctor.fields.gender', 'Gender')}
                      <span className="req">*</span>
                    </label>
                    <select
                      id="gender"
                      {...register('gender')}
                      className={`add-doctor-select ${errors.gender ? 'error' : ''}`}
                      data-node-id="20:2570"
                    >
                      {GENDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.gender && (
                      <span className="add-doctor-error-msg">
                        {errors.gender.message}
                      </span>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="add-doctor-field-group" data-node-id="20:2577">
                    <label className="add-doctor-label" htmlFor="dob">
                      {t('doctors.addDoctor.fields.dob', 'Date of Birth')}
                      <span className="req">*</span>
                    </label>
                    <input
                      id="dob"
                      type="date"
                      {...register('dob')}
                      className={`add-doctor-input ${errors.dob ? 'error' : ''}`}
                      data-node-id="20:2578"
                    />
                    {errors.dob && (
                      <span className="add-doctor-error-msg">
                        {errors.dob.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ------------------------------------------------------------------
                SECTION 2: PROFESSIONAL DETAILS (Figma Node 20:2590)
                ------------------------------------------------------------------ */}
            <section className="add-doctor-section" data-node-id="20:2590">
              <div className="add-doctor-section-header" data-node-id="20:2591">
                <div className="add-doctor-section-title-wrap">
                  <div className="add-doctor-section-icon" data-node-id="20:2593">
                    <img src={secProfessional} alt="" />
                  </div>
                  <h2 className="add-doctor-section-title" data-node-id="20:2595">
                    {t('doctors.addDoctor.sections.professional', 'Professional Details')}
                  </h2>
                </div>
              </div>

              <div className="add-doctor-grid-2" data-node-id="20:2596">
                {/* Medical License Number */}
                <div className="add-doctor-field-group" data-node-id="20:2597">
                  <label className="add-doctor-label" htmlFor="license">
                    {t('doctors.addDoctor.fields.license', 'Medical License Number')}
                    <span className="req">*</span>
                  </label>
                  <input
                    id="license"
                    type="text"
                    {...register('license')}
                    className={`add-doctor-input ${errors.license ? 'error' : ''}`}
                    placeholder="e.g. MD-119284"
                    data-node-id="20:2598"
                  />
                  {errors.license && (
                    <span className="add-doctor-error-msg">
                      {errors.license.message}
                    </span>
                  )}
                </div>

                {/* Issuing Body */}
                <div className="add-doctor-field-group" data-node-id="20:2600">
                  <label className="add-doctor-label" htmlFor="issuingBody">
                    {t('doctors.addDoctor.fields.issuingBody', 'Issuing Body')}
                    <span className="req">*</span>
                  </label>
                  <input
                    id="issuingBody"
                    type="text"
                    {...register('issuingBody')}
                    className={`add-doctor-input ${errors.issuingBody ? 'error' : ''}`}
                    placeholder="e.g. State Medical Board"
                    data-node-id="20:2601"
                  />
                  {errors.issuingBody && (
                    <span className="add-doctor-error-msg">
                      {errors.issuingBody.message}
                    </span>
                  )}
                </div>

                {/* License Expiry Date */}
                <div className="add-doctor-field-group" data-node-id="20:2603">
                  <label className="add-doctor-label" htmlFor="licenseExpiry">
                    {t('doctors.addDoctor.fields.licenseExpiry', 'License Expiry Date')}
                    <span className="req">*</span>
                  </label>
                  <input
                    id="licenseExpiry"
                    type="date"
                    {...register('licenseExpiry')}
                    className={`add-doctor-input ${errors.licenseExpiry ? 'error' : ''}`}
                    data-node-id="20:2604"
                  />
                  {errors.licenseExpiry && (
                    <span className="add-doctor-error-msg">
                      {errors.licenseExpiry.message}
                    </span>
                  )}
                </div>

                {/* Experience (Years) */}
                <div className="add-doctor-field-group" data-node-id="20:2616">
                  <label className="add-doctor-label" htmlFor="experienceYears">
                    {t('doctors.addDoctor.fields.experienceYears', 'Experience (Years)')}
                    <span className="req">*</span>
                  </label>
                  <input
                    id="experienceYears"
                    type="number"
                    min="0"
                    max="60"
                    {...register('experienceYears')}
                    className={`add-doctor-input ${errors.experienceYears ? 'error' : ''}`}
                    placeholder="e.g. 12"
                    data-node-id="20:2617"
                  />
                  {errors.experienceYears && (
                    <span className="add-doctor-error-msg">
                      {errors.experienceYears.message}
                    </span>
                  )}
                </div>

                {/* Primary Specialty (Full width) */}
                <div className="add-doctor-field-group full-width" data-node-id="20:2623">
                  <label className="add-doctor-label" htmlFor="specialty">
                    {t('doctors.addDoctor.fields.specialty', 'Primary Specialty')}
                    <span className="req">*</span>
                  </label>
                  <select
                    id="specialty"
                    {...register('specialty')}
                    className={`add-doctor-select ${errors.specialty ? 'error' : ''}`}
                    data-node-id="20:2624"
                  >
                    {SPECIALTY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.specialty && (
                    <span className="add-doctor-error-msg">
                      {errors.specialty.message}
                    </span>
                  )}
                </div>

                {/* Sub-specialty (Optional) (Full width) */}
                <div className="add-doctor-field-group full-width" data-node-id="20:2631">
                  <label className="add-doctor-label" htmlFor="subSpecialty">
                    {t('doctors.addDoctor.fields.subSpecialty', 'Sub-specialty (Optional)')}
                  </label>
                  <input
                    id="subSpecialty"
                    type="text"
                    {...register('subSpecialty')}
                    className="add-doctor-input"
                    placeholder="e.g. Interventional Cardiology, Pediatric Oncology"
                    data-node-id="20:2632"
                  />
                </div>
              </div>
            </section>

            {/* ------------------------------------------------------------------
                SECTION 3: HOSPITAL ASSIGNMENT (Figma Node 20:2634)
                ------------------------------------------------------------------ */}
            <section className="add-doctor-section" data-node-id="20:2634">
              <div className="add-doctor-section-header" data-node-id="20:2635">
                <div className="add-doctor-section-title-wrap">
                  <div className="add-doctor-section-icon" data-node-id="20:2637">
                    <img src={secHospital} alt="" />
                  </div>
                  <h2 className="add-doctor-section-title" data-node-id="20:2639">
                    {t('doctors.addDoctor.sections.hospital', 'Hospital Assignment')}
                  </h2>
                </div>
              </div>

              <div className="add-doctor-grid-3" data-node-id="20:2640">
                {/* Primary Hospital */}
                <div className="add-doctor-field-group" data-node-id="20:2641">
                  <label className="add-doctor-label" htmlFor="hospital">
                    {t('doctors.addDoctor.fields.hospital', 'Primary Hospital')}
                    <span className="req">*</span>
                  </label>
                  <select
                    id="hospital"
                    {...register('hospital')}
                    className={`add-doctor-select ${errors.hospital ? 'error' : ''}`}
                    data-node-id="20:2642"
                  >
                    {HOSPITAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.hospital && (
                    <span className="add-doctor-error-msg">
                      {errors.hospital.message}
                    </span>
                  )}
                </div>

                {/* Department */}
                <div className="add-doctor-field-group" data-node-id="20:2649">
                  <label className="add-doctor-label" htmlFor="department">
                    {t('doctors.addDoctor.fields.department', 'Department')}
                    <span className="req">*</span>
                  </label>
                  <input
                    id="department"
                    type="text"
                    {...register('department')}
                    className={`add-doctor-input ${errors.department ? 'error' : ''}`}
                    placeholder="e.g. Cardiology"
                    data-node-id="20:2650"
                  />
                  {errors.department && (
                    <span className="add-doctor-error-msg">
                      {errors.department.message}
                    </span>
                  )}
                </div>

                {/* Office Number */}
                <div className="add-doctor-field-group" data-node-id="20:2652">
                  <label className="add-doctor-label" htmlFor="officeNumber">
                    {t('doctors.addDoctor.fields.officeNumber', 'Office Number')}
                    <span className="req">*</span>
                  </label>
                  <input
                    id="officeNumber"
                    type="text"
                    {...register('officeNumber')}
                    className={`add-doctor-input ${errors.officeNumber ? 'error' : ''}`}
                    placeholder="e.g. Suite 402"
                    data-node-id="20:2653"
                  />
                  {errors.officeNumber && (
                    <span className="add-doctor-error-msg">
                      {errors.officeNumber.message}
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* ------------------------------------------------------------------
                SECTION 4: VERIFICATION DOCUMENTS (Figma Node 20:2655)
                ------------------------------------------------------------------ */}
            <section className="add-doctor-section" data-node-id="20:2655">
              <div className="add-doctor-section-header" data-node-id="20:2656">
                <div className="add-doctor-section-title-wrap">
                  <div className="add-doctor-section-icon" data-node-id="20:2658">
                    <img src={secVerification} alt="" />
                  </div>
                  <h2 className="add-doctor-section-title" data-node-id="20:2660">
                    {t('doctors.addDoctor.sections.documents', 'Verification Documents')}
                  </h2>
                </div>
                <p className="add-doctor-section-subtitle" data-node-id="20:2662">
                  {t(
                    'doctors.addDoctor.documentsSubtitle',
                    'Upload necessary documentation for compliance.'
                  )}
                </p>
              </div>

              <div className="add-doctor-docs-grid" data-node-id="20:2663">
                {/* Document 1: Medical License */}
                <input
                  type="file"
                  ref={medLicenseInputRef}
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => handleDocChange('medicalLicense', e)}
                />
                <div
                  className={`add-doctor-doc-card ${
                    uploadedDocs.medicalLicense ? 'has-file' : ''
                  }`}
                  onClick={() => medLicenseInputRef.current?.click()}
                  data-node-id="20:2664"
                >
                  <div className="add-doctor-doc-icon" data-node-id="20:2665">
                    <img src={docMedicalLicense} alt="" />
                  </div>
                  <h3 className="add-doctor-doc-title" data-node-id="20:2668">
                    {t('doctors.addDoctor.docs.medicalLicense', 'Medical License')}
                  </h3>
                  <span className="add-doctor-doc-subtitle" data-node-id="20:2670">
                    {uploadedDocs.medicalLicense ? (
                      <span className="add-doctor-doc-file-name">
                        ✓ {uploadedDocs.medicalLicense}
                      </span>
                    ) : (
                      'PDF, max 5MB'
                    )}
                  </span>
                </div>

                {/* Document 2: Government ID */}
                <input
                  type="file"
                  ref={govIdInputRef}
                  accept=".pdf, image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleDocChange('governmentId', e)}
                />
                <div
                  className={`add-doctor-doc-card ${
                    uploadedDocs.governmentId ? 'has-file' : ''
                  }`}
                  onClick={() => govIdInputRef.current?.click()}
                  data-node-id="20:2675"
                >
                  <div className="add-doctor-doc-icon" data-node-id="20:2676">
                    <img src={docGovernmentId} alt="" />
                  </div>
                  <h3 className="add-doctor-doc-title" data-node-id="20:2679">
                    {t('doctors.addDoctor.docs.govId', 'Government ID')}
                  </h3>
                  <span className="add-doctor-doc-subtitle" data-node-id="20:2681">
                    {uploadedDocs.governmentId ? (
                      <span className="add-doctor-doc-file-name">
                        ✓ {uploadedDocs.governmentId}
                      </span>
                    ) : (
                      'PDF or Image'
                    )}
                  </span>
                </div>

                {/* Document 3: Affiliation Letter */}
                <input
                  type="file"
                  ref={affLetterInputRef}
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => handleDocChange('affiliationLetter', e)}
                />
                <div
                  className={`add-doctor-doc-card ${
                    uploadedDocs.affiliationLetter ? 'has-file' : ''
                  }`}
                  onClick={() => affLetterInputRef.current?.click()}
                  data-node-id="20:2686"
                >
                  <div className="add-doctor-doc-icon" data-node-id="20:2687">
                    <img src={docAffiliationLetter} alt="" />
                  </div>
                  <h3 className="add-doctor-doc-title" data-node-id="20:2690">
                    {t('doctors.addDoctor.docs.affiliation', 'Affiliation Letter')}
                  </h3>
                  <span className="add-doctor-doc-subtitle" data-node-id="20:2692">
                    {uploadedDocs.affiliationLetter ? (
                      <span className="add-doctor-doc-file-name">
                        ✓ {uploadedDocs.affiliationLetter}
                      </span>
                    ) : (
                      'PDF, max 5MB'
                    )}
                  </span>
                </div>
              </div>
            </section>

            {/* ------------------------------------------------------------------
                SECTION 5: ACCOUNT SECURITY (Figma Node 20:2697)
                ------------------------------------------------------------------ */}
            <section className="add-doctor-section" data-node-id="20:2697">
              <div className="add-doctor-section-header" data-node-id="20:2698">
                <div className="add-doctor-section-title-wrap">
                  <div className="add-doctor-section-icon" data-node-id="20:2700">
                    <img src={secSecurity} alt="" />
                  </div>
                  <h2 className="add-doctor-section-title" data-node-id="20:2702">
                    {t('doctors.addDoctor.sections.security', 'Account Security')}
                  </h2>
                </div>
              </div>

              <div className="add-doctor-grid-2" data-node-id="20:2703">
                {/* Email Address */}
                <div className="add-doctor-field-group" data-node-id="20:2704">
                  <label className="add-doctor-label" htmlFor="email">
                    {t('doctors.addDoctor.fields.email', 'Email Address')}
                    <span className="req">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    {...register('email')}
                    className={`add-doctor-input ${errors.email ? 'error' : ''}`}
                    placeholder="doctor@hospital.org"
                    data-node-id="20:2705"
                  />
                  {errors.email && (
                    <span className="add-doctor-error-msg">
                      {errors.email.message}
                    </span>
                  )}
                </div>

                {/* Mobile Number */}
                <div className="add-doctor-field-group" data-node-id="20:2707">
                  <label className="add-doctor-label" htmlFor="phone">
                    {t('doctors.addDoctor.fields.phone', 'Mobile Number')}
                    <span className="req">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    className={`add-doctor-input ${errors.phone ? 'error' : ''}`}
                    placeholder="+1 (555) 000-0000"
                    data-node-id="20:2708"
                  />
                  {errors.phone && (
                    <span className="add-doctor-error-msg">
                      {errors.phone.message}
                    </span>
                  )}
                </div>

                {/* Temporary Password (Auto-generated) */}
                <div className="add-doctor-field-group full-width" data-node-id="20:2710">
                  <label className="add-doctor-label" htmlFor="temporaryPassword">
                    {t(
                      'doctors.addDoctor.fields.temporaryPassword',
                      'Temporary Password (Auto-generated)'
                    )}
                  </label>
                  <div className="add-doctor-password-wrap" data-node-id="20:2711">
                    <input
                      id="temporaryPassword"
                      type="text"
                      readOnly
                      value={temporaryPassword}
                      className="add-doctor-password-input"
                      data-node-id="20:2713"
                    />
                    <button
                      type="button"
                      className="add-doctor-copy-btn"
                      onClick={handleCopyPassword}
                      title="Copy Temporary Password"
                      aria-label="Copy Temporary Password"
                      data-node-id="20:2715"
                    >
                      {copiedPassword ? (
                        <Check size={16} className="text-[#006a60]" />
                      ) : (
                        <img src={iconCopyPassword} alt="Copy" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ------------------------------------------------------------------
                FOOTER ACTIONS (Figma Node 20:2718)
                ------------------------------------------------------------------ */}
            <div className="add-doctor-footer-actions" data-node-id="20:2718">
              <button
                type="button"
                className="add-doctor-cancel-btn"
                onClick={handleBack}
                disabled={isSubmitting}
                data-node-id="20:2720"
              >
                {t('doctors.addDoctor.actions.cancel', 'Cancel')}
              </button>

              <button
                type="submit"
                className="add-doctor-submit-btn"
                disabled={isSubmitting || addDoctorMutation.isPending}
                data-node-id="20:2721"
              >
                <span>
                  {isSubmitting || addDoctorMutation.isPending
                    ? t('doctors.addDoctor.actions.submitting', 'Registering Doctor...')
                    : t('doctors.addDoctor.actions.submit', 'Register Doctor')}
                </span>
                <img src={iconBtnArrow} alt="" data-node-id="20:2723" />
              </button>
            </div>
          </form>
        </div>
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

export default AdminAddDoctor;
