import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  Edit3,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Radio,
  ShieldCheck,
  Stethoscope,
  Upload,
  X,
} from 'lucide-react';
import { DoctorProfile } from './types';
import { useAuth } from '@/context/AuthContext';
import { profileService, UpdateDoctorProfilePayload, UpdateUserAccountPayload } from '@/services/profileService';
import { ApiError } from '@/services/apiClient';

const EMPTY_PROFILE: DoctorProfile = {
  name: '',
  credentials: '',
  title: '',
  specialty: '',
  npi: '',
  licenseNumber: '',
  licenseState: '',
  licenseStatus: '',
  licenseExpiry: '',
  hospital: '',
  department: '',
  office: '',
  email: '',
  phone: '',
  pager: '',
  bio: '',
  consultationTypes: [],
  certifications: [],
};

function getInitials(name?: string): string {
  if (!name) return 'DR';
  const clean = name.replace(/^Dr\.\s*/i, '').split(',')[0].trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const ProfessionalProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUserSession, isInitializing, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profile = user?.profile || EMPTY_PROFILE;
  const isVerified = profile.licenseStatus.toUpperCase().includes('VERIFIED');

  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<DoctorProfile>(() => user?.profile || EMPTY_PROFILE);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [user?.avatarUrl]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4000);
  };

  const handleOpenEdit = () => {
    setEditFormData({ ...(user?.profile || EMPTY_PROFILE) });
    setEditError(null);
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      setEditError('Authenticated doctor profile ID is not available.');
      return;
    }

    const trimmedName = editFormData.name.trim();
    if (!trimmedName) {
      setEditError('Physician name is required.');
      return;
    }

    setIsSaving(true);
    setEditError(null);
    let doctorUpdated = false;

    try {
      const doctorPayload: UpdateDoctorProfilePayload = {
        fullName: trimmedName,
      };
      const trimmedSpecialty = editFormData.specialty.trim();
      if (trimmedSpecialty) {
        doctorPayload.primarySpecialization = trimmedSpecialty;
      }
      const trimmedBio = editFormData.bio.trim();
      if (trimmedBio) {
        doctorPayload.biography = trimmedBio;
        doctorPayload.professionalSummary = trimmedBio;
      }

      const accountPayload: UpdateUserAccountPayload = {};
      const trimmedEmail = editFormData.email.trim();
      const trimmedPhone = editFormData.phone.trim();
      if (trimmedEmail && trimmedEmail !== profile.email) {
        accountPayload.email = trimmedEmail;
      }
      if (trimmedPhone && trimmedPhone !== profile.phone) {
        accountPayload.phone = trimmedPhone;
      }

      await profileService.updateDoctorProfile(user.id, doctorPayload);
      doctorUpdated = true;

      if (Object.keys(accountPayload).length > 0) {
        await profileService.updateUserAccount(accountPayload);
      }

      await refreshUserSession();
      setIsEditing(false);
      showToast('Professional profile updated successfully', 'success');
    } catch (err: unknown) {
      if (doctorUpdated) {
        await refreshUserSession().catch(() => undefined);
      }
      if (err instanceof ApiError) {
        setEditError(err.message);
      } else if (err instanceof Error) {
        setEditError(err.message);
      } else {
        setEditError('Failed to update professional profile.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Invalid file format. Please upload a PNG, JPG, or WEBP image.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('File size exceeds the 5 MB limit. Please select a smaller photo.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!user?.id) {
      showToast('Authenticated doctor profile ID is not available.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploadingPhoto(true);
    try {
      await profileService.uploadDoctorPhoto(user.id, file);
      setAvatarLoadError(false);
      await refreshUserSession();
      showToast('Profile photo updated successfully', 'success');
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Failed to upload profile photo.';
      showToast(msg, 'error');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      data-node-id="1:4281"
      data-testid="professional-profile-page"
      className="w-full space-y-6 pb-12"
    >
      {/* Toast Feedback */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === 'error'
              ? 'bg-[#ba1a1a] text-white'
              : 'bg-slate-900 text-white'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="size-4 text-white shrink-0" />
          ) : (
            <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Breadcrumb Navigation & Settings Submenu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => navigate('/dashboard')}>
              Dashboard
            </span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-slate-700 font-medium">Settings</span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-slate-900 font-bold">My Profile</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-900">Physician Profile & Credentials</h1>
        </div>

        {/* Settings Tab Navigation Strip */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-[#28006d] shadow-xs"
          >
            My Profile
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings/security')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Security
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings/notifications')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Notifications
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings/schedule')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Schedule
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings/ehr')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            EHR Sync
          </button>
        </div>
      </div>

      {isInitializing && !user?.fullName ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 flex items-center justify-center gap-3 text-sm text-slate-500">
          <Loader2 className="size-5 animate-spin text-[#5b14b8]" />
          <span>Loading physician profile...</span>
        </div>
      ) : (
        /* Main 2-Column Bento Layout (1:4290) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Profile Identity Card (Bento style) (1:4387) */}
          <div
            data-node-id="1:4387"
            data-testid="profile-identity-card"
            className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0px_1px_2px_rgba(0,0,0,0.04)] relative"
          >
            {/* Decorative Header Accent Banner */}
            <div className="h-24 bg-gradient-to-r from-[#28006d] via-[#4500b8] to-[#7c3aed] relative" />

            {/* Avatar Container with Overlap */}
            <div className="px-6 pb-6 pt-0 relative space-y-4">
              <div className="-mt-12 flex justify-center relative">
                <div className="size-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-[#3f1d8b] flex items-center justify-center relative group">
                  {user?.avatarUrl && !avatarLoadError ? (
                    <img
                      src={user.avatarUrl}
                      alt={profile.name || 'Doctor profile'}
                      className="size-full object-cover"
                      onError={() => setAvatarLoadError(true)}
                    />
                  ) : (
                    <span className="text-2xl font-bold text-white select-none">
                      {getInitials(profile.name)}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={isUploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
                    title="Upload New Photo"
                    aria-label="Upload New Photo"
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <>
                        <Camera className="size-5" />
                        <span className="text-[9px] font-bold mt-0.5">Change</span>
                      </>
                    )}
                  </button>
                </div>
                {isVerified && (
                  <div className="absolute bottom-0 right-1/2 translate-x-10 size-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-xs">
                    <BadgeCheck className="size-3.5" />
                  </div>
                )}
              </div>

              {/* Doctor Identity Header */}
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-slate-900">
                  {profile.name || 'Not provided'}
                </h2>
                {profile.credentials && (
                  <div className="text-xs font-semibold text-[#5b14b8]">{profile.credentials}</div>
                )}
                <p className="text-xs text-slate-500">{profile.title || 'Not specified'}</p>
                {(profile.primaryFacility?.name || profile.hospital) && (
                  <p className="text-xs text-slate-400 font-medium">
                    {profile.primaryFacility?.name || profile.hospital}
                  </p>
                )}
              </div>

              {/* Verification Badges */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                  <ShieldCheck className="size-3" />
                  <span>NPI: {profile.npi || 'Not provided'}</span>
                </span>
                {profile.certifications.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-purple-50 text-[#5b14b8] border border-purple-200 text-[11px] font-bold">
                    {profile.certifications[0]}
                  </span>
                )}
                {profile.specialty && (
                  <span className="px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 text-[11px] font-bold">
                    {profile.specialty}
                  </span>
                )}
              </div>

              {/* Clinical Bio */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                {profile.bio || 'No professional biography provided.'}
              </div>

              {/* Profile Action Buttons */}
              <div className="space-y-2 pt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  data-testid="profile-photo-input"
                  onChange={handlePhotoSelect}
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isUploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <Loader2 className="size-3.5 text-slate-500 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="size-3.5 text-slate-500" />
                        <span>Upload Photo</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-b from-[#a44cff] to-[#5b14b8] hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <Edit3 className="size-4" />
                  <span>Edit Profile</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/settings/security')}
                    className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <KeyRound className="size-3.5 text-slate-500" />
                    <span>Security</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      navigate('/auth/login', { replace: true });
                    }}
                    className="py-2 px-3 rounded-xl border border-red-200 bg-red-50/40 hover:bg-red-50 text-[#ba1a1a] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <LogOut className="size-3.5 text-[#ba1a1a]" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Detail Sections Container (1:4291) */}
          <div
            data-node-id="1:4291"
            data-testid="profile-details-container"
            className="lg:col-span-8 space-y-6"
          >
            {/* Section 1: Professional Information (1:4292) */}
            <div
              data-node-id="1:4292"
              className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] space-y-5"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="size-10 rounded-full bg-purple-50 text-[#28006d] flex items-center justify-center">
                  <Stethoscope className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Professional Information</h3>
                  <p className="text-xs text-slate-500">Medical credentialing, licensure, and clinical privileges.</p>
                </div>
              </div>

              {/* License & Affiliation 2-Card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Medical License Card */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Medical License
                  </div>
                  <div className="space-y-1">
                    <div className="text-base font-bold text-slate-900">
                      {profile.licenseNumber || 'Not provided'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {profile.licenseState || 'Not provided'}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        isVerified
                          ? 'text-emerald-700 bg-emerald-100/70'
                          : 'text-slate-700 bg-slate-200/70'
                      }`}
                    >
                      {profile.licenseStatus || 'Unknown'}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Exp: {profile.licenseExpiry || 'Not specified'}
                    </span>
                  </div>
                </div>

                {/* Primary Affiliation Card */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Primary Affiliation
                    </div>
                    {profile.primaryFacility?.assignmentType && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {profile.primaryFacility.assignmentType}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-900 leading-snug">
                      {profile.primaryFacility?.name || 'Not specified'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {profile.department || 'Not specified'}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="size-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{profile.office || 'Clinic address not provided'}</span>
                  </div>
                </div>
              </div>

              {/* Consultation Types Provided */}
              <div className="space-y-2.5 pt-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Clinical Consultation Types Provided
                </div>
                {profile.consultationTypes.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5">
                    {profile.consultationTypes.map((type) => (
                      <div
                        key={type}
                        className="px-3.5 py-2 rounded-xl bg-purple-50/60 border border-purple-200/80 text-xs font-semibold text-[#28006d] flex items-center gap-2"
                      >
                        <CheckCircle2 className="size-3.5 text-[#5b14b8]" />
                        <span>{type}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No consultation types configured.</p>
                )}
              </div>
            </div>

            {/* Section 2: Contact Information & Location (1:4342) */}
            <div
              data-node-id="1:4342"
              className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] space-y-5"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="size-10 rounded-full bg-cyan-50 text-cyan-800 flex items-center justify-center">
                  <Mail className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Direct Contact & Practice Location</h3>
                  <p className="text-xs text-slate-500">Official hospital communications and on-call routing.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Left Details */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-600 mt-0.5">
                      <Mail className="size-4" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Official Email</div>
                      <div className="text-xs font-bold text-slate-900 mt-0.5">
                        {profile.email || 'Not provided'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-600 mt-0.5">
                      <Phone className="size-4" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Office Phone & Extension</div>
                      <div className="text-xs font-bold text-slate-900 mt-0.5">
                        {profile.phone || 'Not provided'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-600 mt-0.5">
                      <Radio className="size-4" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Emergency Pager</div>
                      <div className="text-xs font-bold text-[#ba1a1a] mt-0.5">
                        {profile.pager || 'Not provided'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Location Card (1:4385) */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="size-4 text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Clinic Office Address</div>
                      <div className="text-xs font-bold text-slate-800 leading-snug">
                        {profile.office || 'Not provided'}
                      </div>
                    </div>
                  </div>

                  {/* Styled Map Graphic */}
                  <div
                    data-node-id="1:4385"
                    className="w-full h-32 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative flex items-center justify-center"
                  >
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#494552_1px,transparent_1px)] [background-size:12px_12px]" />
                    <div className="relative text-center p-3">
                      <div className="size-8 rounded-full bg-[#28006d] text-white flex items-center justify-center mx-auto shadow-md">
                        <Building2 className="size-4" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 block mt-1">
                        {profile.primaryFacility?.name || profile.hospital || 'Primary Practice Location'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {profile.department || 'Department not specified'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Dialog Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Physician Profile</h3>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {editError && (
                <div
                  role="alert"
                  className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2"
                >
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Physician Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Credentials</label>
                  <input
                    type="text"
                    value={editFormData.credentials}
                    readOnly
                    disabled
                    title="Credentials are managed by medical board verification"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Specialization</label>
                  <input
                    type="text"
                    value={editFormData.specialty}
                    onChange={(e) => setEditFormData({ ...editFormData, specialty: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Clinical Bio</label>
                <textarea
                  rows={3}
                  value={editFormData.bio}
                  onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                  className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Official Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Office Phone</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white font-bold hover:opacity-95 shadow-xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isSaving && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
