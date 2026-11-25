import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  ChevronRight,
  ArrowLeft,
  Bell,
  Settings,
  HelpCircle,
  UserX,
  Check,
} from 'lucide-react';

// Shared Layout & Styling
import '../dashboard/AdminDashboard.css';
import './AdminDoctorProfile.css';

// Shared Navigation
import AdminSidebar from '../common/AdminSidebar';
import ActionSuccessSnackbar from '../users/ActionSuccessSnackbar';

// Action Dialogs
import SuspendDoctorDialog from './SuspendDoctorDialog';
import ResetDoctorPasswordDialog from './ResetDoctorPasswordDialog';
import EditDoctorProfileDialog from './EditDoctorProfileDialog';
import ViewDoctorDocDialog from './ViewDoctorDocDialog';

// Authentic Assets from Figma Node 20:3002
import iconVerifiedBadge from '../../assets/doctors/badge-verified.svg';
import iconEditPencil from '../../assets/doctors/icon-edit-pencil.svg';
import iconResetPwd from '../../assets/doctors/icon-reset-password.svg';
import iconSuspendDoc from '../../assets/doctors/icon-suspend-doctor.svg';
import iconAccountInfo from '../../assets/doctors/icon-account-info.svg';
import icon2faShield from '../../assets/doctors/icon-2fa-shield.svg';
import iconProfessional from '../../assets/doctors/icon-professional-details.svg';
import iconContactInfo from '../../assets/doctors/icon-contact-info.svg';
import iconEmail from '../../assets/doctors/icon-email.svg';
import iconPhone from '../../assets/doctors/icon-phone.svg';
import iconOfficeAddress from '../../assets/doctors/icon-office-address.svg';
import iconDocVerification from '../../assets/doctors/icon-doc-verification.svg';
import iconMedLicense from '../../assets/doctors/icon-medical-license.svg';
import iconIdentityDoc from '../../assets/doctors/icon-identity-doc.svg';
import iconAffiliationDoc from '../../assets/doctors/icon-affiliation-letter.svg';
import AdminProfileAvatar from '../common/AdminProfileAvatar';

// Service & TanStack Query
import {
  useDoctorQuery,
  useSuspendDoctorMutation,
  useVerifyDoctorMutation,
  useResetDoctorPasswordMutation,
  useUpdateDoctorProfileMutation,
  useDoctorDocumentsQuery,
  type DoctorItem,
} from '../../services/doctorService';

export interface AdminDoctorProfileProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminDoctorProfile: React.FC<AdminDoctorProfileProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const routeParams = useParams<{ doctorId: string }>();

  // Navigate to directory if no valid doctorId is present in the route
  const doctorId = routeParams.doctorId || '';

  // Navigation Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Dialog States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSuspendOpen, setIsSuspendOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [viewingDocTitle, setViewingDocTitle] = useState<string | null>(null);

  // Toast State
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [isSnackbarError, setIsSnackbarError] = useState(false);

  // TanStack Query
  const { data: doctor, isLoading, isError } = useDoctorQuery(doctorId);
  const { data: attachedDocs = [] } = useDoctorDocumentsQuery(doctorId);

  // Mutations
  const suspendMutation = useSuspendDoctorMutation();
  const verifyMutation = useVerifyDoctorMutation();
  const resetPasswordMutation = useResetDoctorPasswordMutation();
  const updateProfileMutation = useUpdateDoctorProfileMutation();

  const handleNavClick = (path: string) => {
    setIsDrawerOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const handleBack = () => {
    handleNavClick('/admin/doctors');
  };

  // Approve Doctor Registration Handler
  const handleVerifyDoctor = async () => {
    if (!doctor) return;
    try {
      await verifyMutation.mutateAsync({
        doctorId: doctor.id,
        reason: 'Credentials verified against registry by administrator',
      });
      setIsSnackbarError(false);
      setSnackbarMessage(
        t('doctors.profile.toasts.verified', {
          name: doctor.name.replace(/^Dr\.\s*/i, ''),
          defaultValue: `${doctor.name}'s registration has been approved & verified.`,
        })
      );
    } catch (err: any) {
      setIsSnackbarError(true);
      setSnackbarMessage(err?.message || 'Failed to approve doctor verification.');
    }
  };

  // Suspend / Activate Handler
  const handleConfirmSuspend = async () => {
    if (!doctor) return;
    const isCurrentlySuspended = doctor.status === 'Suspended';
    try {
      await suspendMutation.mutateAsync({
        doctorId: doctor.id,
        isSuspended: !isCurrentlySuspended,
      });
      setIsSuspendOpen(false);
      setIsSnackbarError(false);
      setSnackbarMessage(
        !isCurrentlySuspended
          ? t('doctors.profile.toasts.suspended', "Dr. {{name}}'s account has been suspended.", {
              name: doctor.name.replace(/^Dr\.\s*/i, ''),
            })
          : t('doctors.profile.toasts.activated', "Dr. {{name}}'s account has been activated.", {
              name: doctor.name.replace(/^Dr\.\s*/i, ''),
            })
      );
    } catch (err: any) {
      setIsSnackbarError(true);
      setSnackbarMessage(err?.message || 'Error updating doctor status.');
    }
  };

  // Password Reset Handler
  const handleConfirmResetPassword = async () => {
    if (!doctor) return;
    try {
      await resetPasswordMutation.mutateAsync({
        doctorId: doctor.id,
        email: doctor.email || 'doctor@hospital.org',
      });
      setIsResetOpen(false);
      setIsSnackbarError(false);
      setSnackbarMessage(
        t('doctors.profile.toasts.passwordResetSent', 'Password reset instructions sent to {{email}}.', {
          email: doctor.email || 'doctor@hospital.org',
        })
      );
    } catch (err: any) {
      setIsSnackbarError(true);
      setSnackbarMessage(err?.message || 'Error initiating password reset: not supported by backend.');
    }
  };

  // Save Edit Profile Handler
  const handleSaveEditProfile = async (updatedData: Partial<DoctorItem> & { id: string }) => {
    try {
      await updateProfileMutation.mutateAsync(updatedData);
      setIsEditOpen(false);
      setIsSnackbarError(false);
      const targetName = updatedData.name || doctor?.name || '';
      setSnackbarMessage(
        t('doctors.profile.toasts.profileUpdated', 'Doctor profile for Dr. {{name}} updated successfully.', {
          name: targetName.replace(/^Dr\.\s*/i, ''),
        })
      );
    } catch (err: any) {
      setIsSnackbarError(true);
      setSnackbarMessage(err?.message || 'Error saving profile changes.');
    }
  };

  const isSuspended = doctor?.status === 'Suspended';
  const isVerified = doctor?.status === 'Verified';

  return (
    <div className="careid-admin-app flex h-screen w-full bg-[#f8f9fb] overflow-hidden font-['Plus_Jakarta_Sans',system-ui,sans-serif]">
      {/* Drawer Backdrop for Tablet/Mobile */}
      <div
        className={`careid-drawer-backdrop ${isDrawerOpen ? 'drawer-open' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
        role="presentation"
      />

      {/* Shared CareID Sidebar */}
      <AdminSidebar
        activeNav="doctors"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNavClick}
        onLogout={onLogout || (() => navigate('/'))}
      />

      {/* Main Column */}
      <div className="careid-main-wrapper flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* TopAppBar with Breadcrumbs */}
        <header
          className="careid-top-navbar bg-white border-b border-[#e1e2e4] px-6 h-16 flex items-center justify-between shrink-0 z-10"
          data-node-id="20:3214"
        >
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="careid-drawer-toggle lg:hidden p-1.5 rounded-lg text-[#494552] hover:bg-[#f2f4f6]"
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb matching Figma Node 20:3215 */}
            <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
              <button
                type="button"
                className="text-[#494552] hover:text-[#191c1e] transition-colors"
                onClick={() => handleNavClick('/admin/dashboard')}
              >
                {t('doctors.profile.breadcrumbs.admin', 'Admin')}
              </button>
              <ChevronRight size={14} className="text-[#7a7583]" />
              <button
                type="button"
                className="text-[#494552] hover:text-[#191c1e] transition-colors"
                onClick={() => handleNavClick('/admin/doctors')}
              >
                {t('doctors.profile.breadcrumbs.doctors', 'Doctors')}
              </button>
              <ChevronRight size={14} className="text-[#7a7583]" />
              <span className="font-medium text-[#191c1e]">
                {doctor ? doctor.name : isLoading ? 'Loading...' : 'Doctor Not Found'}
              </span>
            </nav>
          </div>

          {/* Right: Actions & Admin Profile */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="p-2 rounded-full text-[#494552] hover:bg-[#f2f4f6] relative transition-colors"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 size-2 bg-[#ba1a1a] rounded-full" />
            </button>
            <button
              type="button"
              className="p-2 rounded-full text-[#494552] hover:bg-[#f2f4f6] transition-colors"
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>
            <button
              type="button"
              className="p-2 rounded-full text-[#494552] hover:bg-[#f2f4f6] transition-colors"
              aria-label="Help"
            >
              <HelpCircle size={18} />
            </button>
            <div className="size-8 rounded-full overflow-hidden border border-[#cbc4d4] shrink-0 ml-1">
              <AdminProfileAvatar size={32} />
            </div>
          </div>
        </header>

        {/* Content Canvas */}
        <main className="doctor-profile-canvas" data-node-id="20:3020">
          <div className="doctor-profile-wrapper">
            {/* Header: Title and Top Action Buttons (Figma Node 20:3004) */}
            <div className="doctor-profile-header" data-node-id="20:3004">
              <div className="doctor-profile-title-area" data-node-id="20:3005">
                <button
                  type="button"
                  className="doctor-profile-back-btn"
                  onClick={handleBack}
                  title="Back to Doctor Directory"
                  aria-label="Back to Doctor Directory"
                >
                  <ArrowLeft size={18} />
                </button>
                <h1 className="doctor-profile-title" data-node-id="20:3006">
                  {t('doctors.profile.title', 'Doctor Profile')}
                </h1>
              </div>

              {/* Action Buttons: Edit Profile, Reset Password, Suspend Doctor */}
              {doctor && (
                <div className="doctor-profile-actions" data-node-id="20:3007">
                  {doctor.status === 'Pending' && (
                    <button
                      type="button"
                      className="doctor-profile-btn px-4 py-2 bg-[#006a60] text-white hover:bg-[#005a52] rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      onClick={handleVerifyDoctor}
                      disabled={verifyMutation.isPending}
                    >
                      <Check size={14} />
                      <span>{verifyMutation.isPending ? 'Verifying...' : 'Approve Registration'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="doctor-profile-btn edit"
                    onClick={() => setIsEditOpen(true)}
                    data-node-id="20:3008"
                  >
                    <img src={iconEditPencil} alt="" />
                    <span>{t('doctors.profile.actions.editProfile', 'Edit Profile')}</span>
                  </button>

                  <button
                    type="button"
                    className="doctor-profile-btn reset"
                    onClick={() => setIsResetOpen(true)}
                    data-node-id="20:3012"
                  >
                    <img src={iconResetPwd} alt="" />
                    <span>{t('doctors.profile.actions.resetPassword', 'Reset Password')}</span>
                  </button>

                  <button
                    type="button"
                    className={`doctor-profile-btn ${isSuspended ? 'activate' : 'suspend'}`}
                    onClick={() => setIsSuspendOpen(true)}
                    data-node-id="20:3016"
                  >
                    <img src={iconSuspendDoc} alt="" />
                    <span>
                      {isSuspended
                        ? t('doctors.profile.actions.activateDoctor', 'Activate Doctor')
                        : t('doctors.profile.actions.suspendDoctor', 'Suspend Doctor')}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Error or Loading State */}
            {isLoading ? (
              <div className="py-24 text-center text-[#494552] text-sm font-medium">
                Loading doctor profile...
              </div>
            ) : isError || !doctor ? (
              <div className="py-20 flex flex-col items-center justify-center text-center px-4 bg-white rounded-2xl border border-[#e1e2e4] mt-4 shadow-sm">
                <div className="size-14 rounded-full bg-[#ba1a1a]/10 text-[#ba1a1a] flex items-center justify-center mb-3">
                  <UserX size={28} />
                </div>
                <h2 className="text-xl font-bold text-[#191c1e] mb-1.5">Doctor Record Not Found</h2>
                <p className="text-sm text-[#494552] max-w-md mb-6 leading-relaxed">
                  The requested doctor identifier does not exist in the directory or may have been removed.
                </p>
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-[#006a60] hover:bg-[#005a52] transition-colors shadow-sm"
                >
                  Return to Doctor Directory
                </button>
              </div>
            ) : (
              /* Two-Column Bento Layout (Figma Node 20:3020) */
              <div className="doctor-profile-grid">
                {/* Left Column: Profile Card + Account Info */}
                <div className="doctor-profile-left-col" data-node-id="20:3021">
                  {/* Card 1: Profile Card (Figma Node 20:3022) */}
                  <div className="doctor-profile-card main-profile" data-node-id="20:3022">
                    {/* Avatar with Verified Badge */}
                    <div className="doctor-profile-avatar-wrapper" data-node-id="20:3048">
                      {doctor.avatarUrl ? (
                        <img
                          src={doctor.avatarUrl}
                          alt={doctor.name}
                          className="doctor-profile-avatar-img"
                          style={isSuspended ? { filter: 'grayscale(1)' } : undefined}
                          data-node-id="20:3049"
                        />
                      ) : (
                        <div
                          className="doctor-profile-avatar-initials"
                          style={{
                            backgroundColor: doctor.avatarBg || '#edeef0',
                            color: doctor.avatarColor || '#28006d',
                          }}
                        >
                          {doctor.initials || 'DJ'}
                        </div>
                      )}

                      {/* Green Verified Check Badge on Avatar */}
                      {isVerified && (
                        <div className="doctor-profile-verified-badge" data-node-id="20:3050">
                          <img src={iconVerifiedBadge} alt="Verified" />
                        </div>
                      )}
                    </div>

                    {/* Name & Specialty */}
                    <h2 className="doctor-profile-name" data-node-id="20:3025">
                      {doctor.name}
                    </h2>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="doctor-profile-specialty" data-node-id="20:3028">
                        {doctor.specialty}
                      </span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        doctor.clinicalPracticeType === 'VETERINARY' || doctor.clinicalPracticeType === 'VETERINARY_MEDICINE'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}>
                        {doctor.clinicalPracticeType === 'VETERINARY' || doctor.clinicalPracticeType === 'VETERINARY_MEDICINE'
                          ? 'Veterinary Medicine'
                          : doctor.clinicalPracticeType === 'HUMAN' || doctor.clinicalPracticeType === 'HUMAN_HEALTHCARE'
                          ? 'Human Healthcare'
                          : doctor.clinicalPracticeType || 'Human Healthcare'}
                      </span>
                    </div>

                    {/* Meta Rows: Care ID, Medical License, Status */}
                    <div className="doctor-profile-meta-list" data-node-id="20:3030">
                      <div className="doctor-profile-meta-item" data-node-id="20:3031">
                        <span className="doctor-profile-meta-label" data-node-id="20:3033">
                          {t('doctors.profile.card.careId', 'Care ID')}
                        </span>
                        <span className="doctor-profile-meta-val" data-node-id="20:3035">
                          {doctor.hvId}
                        </span>
                      </div>

                      <div className="doctor-profile-meta-item" data-node-id="20:3036">
                        <span className="doctor-profile-meta-label" data-node-id="20:3038">
                          {t('doctors.profile.card.medicalLicense', 'Medical License')}
                        </span>
                        <span className="doctor-profile-meta-val" data-node-id="20:3040">
                          {doctor.license}
                        </span>
                      </div>

                      <div className="doctor-profile-meta-item" data-node-id="20:3041">
                        <span className="doctor-profile-meta-label" data-node-id="20:3043">
                          {t('doctors.profile.card.status', 'Status')}
                        </span>
                        <span
                          className={`doctor-profile-status-pill ${
                            isVerified ? 'verified' : isSuspended ? 'suspended' : 'pending'
                          }`}
                          data-node-id="20:3044"
                        >
                          <span className="dot" data-node-id="20:3045" />
                          <span data-node-id="20:3046">{doctor.status}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Account Info Card (Figma Node 20:3052) */}
                  <div className="doctor-profile-card" data-node-id="20:3052">
                    <div className="doctor-profile-section-heading" data-node-id="20:3053">
                      <div className="doctor-profile-section-heading-icon" data-node-id="20:3054">
                        <img src={iconAccountInfo} alt="" />
                      </div>
                      <h3 className="doctor-profile-section-heading-title" data-node-id="20:3056">
                        {t('doctors.profile.accountInfo.title', 'Account Info')}
                      </h3>
                    </div>

                    <div className="doctor-profile-account-fields" data-node-id="20:3057">
                      <div className="doctor-profile-field-block" data-node-id="20:3058">
                        <span className="doctor-profile-field-caption" data-node-id="20:3060">
                          {t('doctors.profile.accountInfo.registrationDate', 'REGISTRATION DATE')}
                        </span>
                        <span className="doctor-profile-field-value" data-node-id="20:3062">
                          {doctor.registered || '—'}
                        </span>
                      </div>

                      <div className="doctor-profile-field-block">
                        <span className="doctor-profile-field-caption">
                          LINKED USER ACCOUNT
                        </span>
                        <span className="doctor-profile-field-value text-xs font-semibold text-[#006a60]">
                          {doctor.userPhone ? `${doctor.userPhone} · ${doctor.userRole || 'Doctor'}` : '—'}
                        </span>
                      </div>

                      <div className="doctor-profile-field-block" data-node-id="20:3063">
                        <span className="doctor-profile-field-caption" data-node-id="20:3065">
                          {t('doctors.profile.accountInfo.lastLogin', 'LAST LOGIN')}
                        </span>
                        <span className="doctor-profile-field-value" data-node-id="20:3067">
                          {doctor.lastLogin || '—'}
                        </span>
                      </div>

                      <div className="doctor-profile-field-block" data-node-id="20:3068">
                        <span className="doctor-profile-field-caption" data-node-id="20:3070">
                          {t('doctors.profile.accountInfo.twoFactorStatus', '2FA STATUS')}
                        </span>
                        <div className="doctor-profile-2fa-row" data-node-id="20:3071">
                          <div className="doctor-profile-2fa-icon" data-node-id="20:3072">
                            <img src={icon2faShield} alt="" />
                          </div>
                          <span className="doctor-profile-field-value" data-node-id="20:3075">
                            {doctor.twoFactorStatus || '—'}
                          </span>
                        </div>
                      </div>

                      <div className="doctor-profile-field-block" data-node-id="20:3076">
                        <span className="doctor-profile-field-caption" data-node-id="20:3078">
                          {t('doctors.profile.accountInfo.accountStatus', 'ACCOUNT STATUS')}
                        </span>
                        <div>
                          <span
                            className={`doctor-profile-status-pill ${
                              doctor.accountStatus === 'Suspended' || isSuspended
                                ? 'suspended'
                                : 'active'
                            }`}
                            data-node-id="20:3079"
                          >
                            <span className="dot" data-node-id="20:3080" />
                            <span data-node-id="20:3081">
                              {isSuspended
                                ? t('doctors.profile.accountInfo.suspended', 'Suspended')
                                : t('doctors.profile.accountInfo.active', 'Active')}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Professional Details + Bottom Bento */}
                <div className="doctor-profile-right-col" data-node-id="20:3082">
                  {/* Card 3: Professional Details (Figma Node 20:3084) */}
                  <div className="doctor-profile-card" data-node-id="20:3084">
                    <div className="doctor-profile-section-heading" data-node-id="20:3085">
                      <div className="doctor-profile-section-heading-icon" data-node-id="20:3086">
                        <img src={iconProfessional} alt="" />
                      </div>
                      <h3 className="doctor-profile-section-heading-title" data-node-id="20:3088">
                        {t('doctors.profile.professionalDetails.title', 'Professional Details')}
                      </h3>
                    </div>

                    {/* 3-Column Grid */}
                    <div className="doctor-profile-prof-grid" data-node-id="20:3089">
                      {/* Medical Council Registration */}
                      <div className="doctor-profile-field-block" data-node-id="20:3090">
                        <span className="doctor-profile-field-caption">
                          {t('doctors.profile.professionalDetails.medicalCouncilReg', 'Medical Council Registration')}
                        </span>
                        <span className="doctor-profile-field-value bold" data-node-id="20:3094">
                          {doctor.medicalCouncilRegistration || doctor.license || '—'}
                        </span>
                      </div>

                      {/* License Expiry */}
                      <div className="doctor-profile-field-block" data-node-id="20:3095">
                        <span className="doctor-profile-field-caption">
                          {t('doctors.profile.professionalDetails.licenseExpiry', 'License Expiry')}
                        </span>
                        <span className="doctor-profile-field-value bold" data-node-id="20:3099">
                          {doctor.licenseExpiry || '—'}
                        </span>
                      </div>

                      {/* Years of Experience */}
                      <div className="doctor-profile-field-block" data-node-id="20:3100">
                        <span className="doctor-profile-field-caption">
                          {t('doctors.profile.professionalDetails.yearsExperience', 'Years of Experience')}
                        </span>
                        <span className="doctor-profile-field-value bold" data-node-id="20:3104">
                          {doctor.experienceYears ? `${doctor.experienceYears}` : '—'}
                        </span>
                      </div>

                      {/* Clinical Practice Type */}
                      <div className="doctor-profile-field-block">
                        <span className="doctor-profile-field-caption">
                          {t('doctors.profile.professionalDetails.clinicalPracticeType', 'Clinical Practice Type')}
                        </span>
                        <span className="doctor-profile-field-value bold">
                          {doctor.clinicalPracticeType === 'VETERINARY' || doctor.clinicalPracticeType === 'VETERINARY_MEDICINE'
                            ? 'Veterinary Medicine'
                            : doctor.clinicalPracticeType === 'HUMAN' || doctor.clinicalPracticeType === 'HUMAN_HEALTHCARE'
                            ? 'Human Healthcare'
                            : doctor.clinicalPracticeType || 'Human Healthcare'}
                        </span>
                      </div>

                      {/* Primary Specialty */}
                      <div className="doctor-profile-field-block" data-node-id="20:3105">
                        <span className="doctor-profile-field-caption">
                          {t('doctors.profile.professionalDetails.primarySpecialty', 'Primary Specialty')}
                        </span>
                        <span className="doctor-profile-field-value bold" data-node-id="20:3109">
                          {doctor.specialty}
                        </span>
                      </div>

                      {/* Sub-specialty */}
                      <div className="doctor-profile-field-block" data-node-id="20:3110">
                        <span className="doctor-profile-field-caption">
                          {t('doctors.profile.professionalDetails.subSpecialty', 'Sub-specialty')}
                        </span>
                        <span className="doctor-profile-field-value bold" data-node-id="20:3114">
                          {doctor.subSpecialty || '—'}
                        </span>
                      </div>

                      {/* Primary Facility */}
                      <div className="doctor-profile-field-block" data-node-id="20:3115">
                        <span className="doctor-profile-field-caption">
                          {t('doctors.profile.professionalDetails.primaryFacility', 'Primary Facility')}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap" data-node-id="20:3119">
                          <span className="doctor-profile-field-value bold">
                            {doctor.primaryFacility || doctor.hospital || 'Not assigned'}
                          </span>
                          {doctor.primaryFacilityAssignmentType && doctor.primaryFacility !== 'Not assigned' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]">
                              {doctor.primaryFacilityAssignmentType}
                            </span>
                          )}
                        </div>
                        {doctor.facilities && doctor.facilities.length > 1 && (
                          <span className="text-[11px] text-slate-500 mt-0.5">
                            +{doctor.facilities.length - 1} additional mapped {doctor.facilities.length > 2 ? 'facilities' : 'facility'}
                          </span>
                        )}
                      </div>

                      {/* Department */}
                      <div className="doctor-profile-field-block" data-node-id="20:3120">
                        <span className="doctor-profile-field-caption">
                          {t('doctors.profile.professionalDetails.department', 'Department')}
                        </span>
                        <span className="doctor-profile-field-value bold" data-node-id="20:3124">
                          {doctor.department || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bento Row: Contact Info & Document Verification */}
                  <div className="doctor-profile-bento-row" data-node-id="20:3083">
                    {/* Card 4: Contact Information (Figma Node 20:3125) */}
                    <div className="doctor-profile-card" data-node-id="20:3125">
                      <div className="doctor-profile-section-heading" data-node-id="20:3126">
                        <div className="doctor-profile-section-heading-icon" data-node-id="20:3127">
                          <img src={iconContactInfo} alt="" />
                        </div>
                        <h3 className="doctor-profile-section-heading-title" data-node-id="20:3129">
                          {t('doctors.profile.contactInfo.title', 'Contact Information')}
                        </h3>
                      </div>

                      <div className="doctor-profile-contact-list" data-node-id="20:3130">
                        {/* Email */}
                        <div className="doctor-profile-contact-item" data-node-id="20:3131">
                          <div className="doctor-profile-contact-icon-bg" data-node-id="20:3132">
                            <img src={iconEmail} alt="" />
                          </div>
                          <div className="doctor-profile-contact-texts" data-node-id="20:3135">
                            <span className="doctor-profile-contact-label">
                              {t('doctors.profile.contactInfo.emailAddress', 'Email Address')}
                            </span>
                            <span className="doctor-profile-contact-val" data-node-id="20:3139">
                              {doctor.email || '—'}
                            </span>
                          </div>
                        </div>

                        {/* Phone */}
                        <div className="doctor-profile-contact-item" data-node-id="20:3140">
                          <div className="doctor-profile-contact-icon-bg" data-node-id="20:3141">
                            <img src={iconPhone} alt="" />
                          </div>
                          <div className="doctor-profile-contact-texts" data-node-id="20:3144">
                            <span className="doctor-profile-contact-label">
                              {t('doctors.profile.contactInfo.mobile', 'Mobile')}
                            </span>
                            <span className="doctor-profile-contact-val" data-node-id="20:3148">
                              {doctor.phone || '—'}
                            </span>
                          </div>
                        </div>

                        {/* Office Address */}
                        <div className="doctor-profile-contact-item" data-node-id="20:3149">
                          <div className="doctor-profile-contact-icon-bg" data-node-id="20:3150">
                            <img src={iconOfficeAddress} alt="" />
                          </div>
                          <div className="doctor-profile-contact-texts" data-node-id="20:3153">
                            <span className="doctor-profile-contact-label">
                              {t('doctors.profile.contactInfo.officeAddress', 'Office Address')}
                            </span>
                            <span className="doctor-profile-contact-val whitespace-pre-line" data-node-id="20:3157">
                              {doctor.officeAddress || '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 5: Document Verification (Figma Node 20:3158) */}
                    <div className="doctor-profile-card" data-node-id="20:3158">
                      <div className="doctor-profile-section-heading" data-node-id="20:3160">
                        <div className="doctor-profile-section-heading-icon" data-node-id="20:3161">
                          <img src={iconDocVerification} alt="" />
                        </div>
                        <h3 className="doctor-profile-section-heading-title" data-node-id="20:3163">
                          {t('doctors.profile.documentVerification.title', 'Document Verification')}
                        </h3>
                      </div>

                      {/* Documents List */}
                      <div className="doctor-profile-docs-list" data-node-id="20:3165">
                        {attachedDocs && attachedDocs.length > 0 ? (
                          attachedDocs.map((doc: any, idx: number) => (
                            <div key={doc.id || idx} className="doctor-profile-doc-item">
                              <div className="doctor-profile-doc-left">
                                <div className="doctor-profile-doc-icon">
                                  <img src={iconMedLicense} alt="" />
                                </div>
                                <span className="doctor-profile-doc-name">
                                  {doc.documentType ? doc.documentType.replace(/_/g, ' ') : 'Credential Document'}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="doctor-profile-doc-view-btn"
                                onClick={() => setViewingDocTitle(doc.documentType ? doc.documentType.replace(/_/g, ' ') : 'Credential Document')}
                              >
                                {t('doctors.profile.documentVerification.view', 'View')}
                              </button>
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="doctor-profile-doc-item" data-node-id="20:3166">
                              <div className="doctor-profile-doc-left" data-node-id="20:3167">
                                <div className="doctor-profile-doc-icon" data-node-id="20:3168">
                                  <img src={iconMedLicense} alt="" />
                                </div>
                                <span className="doctor-profile-doc-name" data-node-id="20:3171">
                                  {t('doctors.profile.documentVerification.medicalLicense', 'Medical License')}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="doctor-profile-doc-view-btn"
                                onClick={() => setViewingDocTitle(t('doctors.profile.documentVerification.medicalLicense', 'Medical License'))}
                                data-node-id="20:3172"
                              >
                                {t('doctors.profile.documentVerification.view', 'View')}
                              </button>
                            </div>

                            <div className="doctor-profile-doc-item" data-node-id="20:3174">
                              <div className="doctor-profile-doc-left" data-node-id="20:3175">
                                <div className="doctor-profile-doc-icon" data-node-id="20:3176">
                                  <img src={iconIdentityDoc} alt="" />
                                </div>
                                <span className="doctor-profile-doc-name" data-node-id="20:3179">
                                  {t('doctors.profile.documentVerification.identityDoc', 'Identity Doc')}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="doctor-profile-doc-view-btn"
                                onClick={() => setViewingDocTitle(t('doctors.profile.documentVerification.identityDoc', 'Identity Doc'))}
                                data-node-id="20:3180"
                              >
                                {t('doctors.profile.documentVerification.view', 'View')}
                              </button>
                            </div>

                            <div className="doctor-profile-doc-item" data-node-id="20:3182">
                              <div className="doctor-profile-doc-left" data-node-id="20:3183">
                                <div className="doctor-profile-doc-icon" data-node-id="20:3184">
                                  <img src={iconAffiliationDoc} alt="" />
                                </div>
                                <span className="doctor-profile-doc-name" data-node-id="20:3187">
                                  {t('doctors.profile.documentVerification.affiliationLetter', 'Affiliation Letter')}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="doctor-profile-doc-view-btn"
                                onClick={() => setViewingDocTitle(t('doctors.profile.documentVerification.affiliationLetter', 'Affiliation Letter'))}
                                data-node-id="20:3188"
                              >
                                {t('doctors.profile.documentVerification.view', 'View')}
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Verification Timeline (Figma Node 20:3190) */}
                      <div className="doctor-profile-timeline-block" data-node-id="20:3190">
                        <div className="doctor-profile-timeline-heading" data-node-id="20:3192">
                          {t('doctors.profile.documentVerification.timelineTitle', 'Verification Timeline')}
                        </div>

                        <div className="doctor-profile-timeline-stepper" data-node-id="20:3193">
                          <div className="doctor-profile-timeline-line" data-node-id="20:3194" />

                          {(doctor.verificationTimeline && doctor.verificationTimeline.length > 0)
                            ? doctor.verificationTimeline.map((step, idx) => (
                                <div key={idx} className="doctor-profile-timeline-step" data-node-id={`timeline-step-${idx}`}>
                                  <div
                                    className={`doctor-profile-timeline-ring ${step.isCompleted ? 'completed' : ''}`}
                                    data-node-id={`timeline-ring-${idx}`}
                                  >
                                    {step.isCompleted && <div className="inner-dot" />}
                                  </div>
                                  <span className={`doctor-profile-timeline-step-title ${step.isCompleted ? '' : 'muted'}`}>
                                    {step.title}
                                  </span>
                                  <span className="doctor-profile-timeline-step-sub">
                                    {step.subtitle}
                                  </span>
                                </div>
                              ))
                            : (
                                <div className="doctor-profile-timeline-step">
                                  <div className={`doctor-profile-timeline-ring ${doctor.status === 'Verified' ? 'completed' : ''}`}>
                                    {doctor.status === 'Verified' && <div className="inner-dot" />}
                                  </div>
                                  <span className="doctor-profile-timeline-step-title">
                                    {doctor.status === 'Verified' ? t('doctors.profile.documentVerification.approved', 'Approved') : doctor.status === 'Suspended' ? t('doctors.profile.documentVerification.suspended', 'Suspended') : t('doctors.profile.documentVerification.underReview', 'Under Review')}
                                  </span>
                                  <span className="doctor-profile-timeline-step-sub">
                                    {doctor.registered || '—'}
                                  </span>
                                </div>
                              )
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Action Dialogs */}
      {doctor && (
        <>
          <SuspendDoctorDialog
            isOpen={isSuspendOpen}
            doctorName={doctor.name}
            isSuspended={isSuspended}
            isLoading={suspendMutation.isPending}
            onClose={() => setIsSuspendOpen(false)}
            onConfirm={handleConfirmSuspend}
          />

          <ResetDoctorPasswordDialog
            isOpen={isResetOpen}
            doctorName={doctor.name}
            doctorEmail={doctor.email || 'doctor@hospital.org'}
            isLoading={resetPasswordMutation.isPending}
            onClose={() => setIsResetOpen(false)}
            onConfirm={handleConfirmResetPassword}
          />

          <EditDoctorProfileDialog
            isOpen={isEditOpen}
            doctor={doctor}
            isLoading={updateProfileMutation.isPending}
            onClose={() => setIsEditOpen(false)}
            onSave={handleSaveEditProfile}
          />

          <ViewDoctorDocDialog
            isOpen={!!viewingDocTitle}
            docTitle={viewingDocTitle || ''}
            doctorName={doctor.name}
            onClose={() => setViewingDocTitle(null)}
          />
        </>
      )}

      {/* Snackbar Notification Toast */}
      <ActionSuccessSnackbar
        isVisible={!!snackbarMessage}
        message={snackbarMessage || ''}
        isError={isSnackbarError}
        onDismiss={() => setSnackbarMessage(null)}
      />
    </div>
  );
};

export default AdminDoctorProfile;
