import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { patientService, CreatePatientPayload } from '@/services/patientService';

export const PatientRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Field States (9 fields matching reference)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [residentialAddress, setResidentialAddress] = useState('');

  // Image Upload State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Validation & Submission States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Handle Photo Selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type: JPG, PNG, WEBP
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        photo: 'Please upload a valid image file (JPG, PNG, or WEBP).',
      }));
      return;
    }

    // Validate size: max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        photo: 'Image size exceeds maximum limit of 5MB.',
      }));
      return;
    }

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.photo;
      return copy;
    });

    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
  };

  const handleRemovePhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Client-Side Validation
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!firstName.trim()) {
      errs.firstName = 'First name is required.';
    } else if (firstName.trim().length < 2) {
      errs.firstName = 'First name must be at least 2 characters.';
    }

    if (!lastName.trim()) {
      errs.lastName = 'Last name is required.';
    } else if (lastName.trim().length < 2) {
      errs.lastName = 'Last name must be at least 2 characters.';
    }

    if (!dateOfBirth) {
      errs.dateOfBirth = 'Date of birth is required.';
    } else {
      const dobDate = new Date(dateOfBirth);
      const today = new Date();
      if (isNaN(dobDate.getTime())) {
        errs.dateOfBirth = 'Invalid date format.';
      } else if (dobDate > today) {
        errs.dateOfBirth = 'Date of birth cannot be in the future.';
      }
    }

    if (!gender) {
      errs.gender = 'Gender selection is required.';
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errs.email = 'Please provide a valid email address.';
      }
    }

    if (phone.trim()) {
      // Basic phone format check: allows +, digits, dashes, spaces
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
      if (!phoneRegex.test(phone.trim())) {
        errs.phone = 'Please provide a valid phone number with country code.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setWarningMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreatePatientPayload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        gender,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        residentialAddress: residentialAddress.trim() || undefined,
        photoFile: photoFile || undefined,
      };

      const result = await patientService.registerPatient(payload);

      setSubmitSuccess(`Patient "${result.patient.fullName}" registered successfully.`);
      if (result.photoWarning) {
        setWarningMessage(result.photoWarning);
      }

      // After brief confirmation, navigate to the newly created patient profile
      setTimeout(() => {
        navigate(`/patients/${result.patient.id}`);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register patient with server.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/patients"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5b14b8] hover:underline mb-2 cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Patients Directory</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#191c1d]">Register New Patient</h1>
          <p className="text-xs text-[#7a7583]">
            Enter demographic and contact details to onboard a new patient into CareID.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {submitError && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-3 shadow-sm"
        >
          <AlertCircle className="size-4.5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-rose-900">Registration Failed</p>
            <p className="text-rose-700 leading-relaxed">{submitError}</p>
          </div>
        </div>
      )}

      {warningMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs flex items-start gap-3 shadow-sm"
        >
          <AlertCircle className="size-4.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-900">Notice</p>
            <p className="text-amber-700 leading-relaxed">{warningMessage}</p>
          </div>
        </div>
      )}

      {submitSuccess && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-3 shadow-sm"
        >
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          <p className="font-semibold text-emerald-900">{submitSuccess}</p>
        </div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Personal Details */}
        <div className="bg-white border border-[#cbc4d4] rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-[#191c1d] flex items-center gap-2">
              <User className="size-4 text-[#5b14b8]" />
              <span>Personal Details</span>
            </h2>
            <p className="text-xs text-[#7a7583]">Primary identification and demographic information.</p>
          </div>

          {/* Patient Photo Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#191c1d]">Patient Photo</label>
            <div className="flex items-center gap-5">
              <div className="relative size-20 rounded-full border-2 border-dashed border-[#cbc4d4] bg-[#f8f9fa] flex items-center justify-center overflow-hidden shrink-0">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="size-full object-cover" />
                ) : (
                  <Camera className="size-7 text-[#7a7583]" />
                )}
              </div>

              <div className="space-y-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="patient-photo-upload"
                />
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="patient-photo-upload"
                    className="px-3.5 py-1.5 rounded-lg border border-[#cbc4d4] bg-white text-xs font-semibold text-[#191c1d] hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                  >
                    {photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </label>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                      title="Remove selected photo"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[#7a7583]">
                  Supported formats: JPG, PNG, WEBP. Maximum file size: 5MB.
                </p>
                {errors.photo && <p className="text-[11px] text-rose-600">{errors.photo}</p>}
              </div>
            </div>
          </div>

          {/* First Name & Last Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="reg-first-name" className="block text-xs font-bold text-[#191c1d]">
                First Name <span className="text-rose-600">*</span>
              </label>
              <input
                id="reg-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. John"
                className={cn(
                  'w-full h-10 px-3 rounded-lg border text-sm text-[#191c1d] placeholder:text-[#7a7583] focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                  errors.firstName ? 'border-rose-400 bg-rose-50/30' : 'border-[#cbc4d4] bg-white'
                )}
              />
              {errors.firstName && <p className="text-[11px] text-rose-600">{errors.firstName}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-last-name" className="block text-xs font-bold text-[#191c1d]">
                Last Name <span className="text-rose-600">*</span>
              </label>
              <input
                id="reg-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Doe"
                className={cn(
                  'w-full h-10 px-3 rounded-lg border text-sm text-[#191c1d] placeholder:text-[#7a7583] focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                  errors.lastName ? 'border-rose-400 bg-rose-50/30' : 'border-[#cbc4d4] bg-white'
                )}
              />
              {errors.lastName && <p className="text-[11px] text-rose-600">{errors.lastName}</p>}
            </div>
          </div>

          {/* Date of Birth & Gender */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="reg-dob" className="block text-xs font-bold text-[#191c1d]">
                Date of Birth <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="reg-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={cn(
                    'w-full h-10 px-3 rounded-lg border text-sm text-[#191c1d] focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                    errors.dateOfBirth ? 'border-rose-400 bg-rose-50/30' : 'border-[#cbc4d4] bg-white'
                  )}
                />
              </div>
              {errors.dateOfBirth && <p className="text-[11px] text-rose-600">{errors.dateOfBirth}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-gender" className="block text-xs font-bold text-[#191c1d]">
                Gender <span className="text-rose-600">*</span>
              </label>
              <select
                id="reg-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as 'MALE' | 'FEMALE' | 'OTHER')}
                className="w-full h-10 px-3 rounded-lg border border-[#cbc4d4] bg-white text-sm text-[#191c1d] focus:outline-none focus:ring-2 focus:ring-[#5b14b8] cursor-pointer"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              {errors.gender && <p className="text-[11px] text-rose-600">{errors.gender}</p>}
            </div>
          </div>
        </div>

        {/* Section 2: Contact Details */}
        <div className="bg-white border border-[#cbc4d4] rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-[#191c1d] flex items-center gap-2">
              <MapPin className="size-4 text-[#5b14b8]" />
              <span>Contact Details</span>
            </h2>
            <p className="text-xs text-[#7a7583]">Communication methods and residential information.</p>
          </div>

          {/* Email Address & Phone Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="block text-xs font-bold text-[#191c1d]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="size-4 absolute left-3 top-3 text-[#7a7583]" />
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={cn(
                    'w-full h-10 pl-9 pr-3 rounded-lg border text-sm text-[#191c1d] placeholder:text-[#7a7583] focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                    errors.email ? 'border-rose-400 bg-rose-50/30' : 'border-[#cbc4d4] bg-white'
                  )}
                />
              </div>
              {errors.email && <p className="text-[11px] text-rose-600">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-phone" className="block text-xs font-bold text-[#191c1d]">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="size-4 absolute left-3 top-3 text-[#7a7583]" />
                <input
                  id="reg-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 019 2834"
                  className={cn(
                    'w-full h-10 pl-9 pr-3 rounded-lg border text-sm text-[#191c1d] placeholder:text-[#7a7583] focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                    errors.phone ? 'border-rose-400 bg-rose-50/30' : 'border-[#cbc4d4] bg-white'
                  )}
                />
              </div>
              {errors.phone && <p className="text-[11px] text-rose-600">{errors.phone}</p>}
            </div>
          </div>

          {/* ZIP / Postal Code & Residential Address */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="reg-zip" className="block text-xs font-bold text-[#191c1d]">
                ZIP / Postal Code
              </label>
              <input
                id="reg-zip"
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="e.g. 90210"
                className="w-full h-10 px-3 rounded-lg border border-[#cbc4d4] bg-white text-sm text-[#191c1d] placeholder:text-[#7a7583] focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="reg-address" className="block text-xs font-bold text-[#191c1d]">
                Residential Address
              </label>
              <input
                id="reg-address"
                type="text"
                value={residentialAddress}
                onChange={(e) => setResidentialAddress(e.target.value)}
                placeholder="e.g. 742 Evergreen Terrace, Springfield"
                className="w-full h-10 px-3 rounded-lg border border-[#cbc4d4] bg-white text-sm text-[#191c1d] placeholder:text-[#7a7583] focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
              />
            </div>
          </div>
        </div>

        {/* Form Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/patients')}
            disabled={isSubmitting}
            className="h-10 px-5 rounded-lg border border-[#cbc4d4] bg-white text-xs font-semibold text-[#191c1d] hover:bg-slate-50 transition-colors shadow-sm focus:outline-none cursor-pointer disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-6 rounded-lg bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white text-xs font-semibold hover:opacity-95 transition-all shadow-sm flex items-center gap-2 focus:outline-none cursor-pointer disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
            <span>{isSubmitting ? 'Creating Patient...' : 'Create Patient'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientRegistrationPage;

