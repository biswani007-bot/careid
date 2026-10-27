import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileEdit, X, Calendar, User } from 'lucide-react';
import { type PatientItem } from '../../services/patientService';
import './PatientActionDialogs.css';

const editPatientSchema = z.object({
  firstName: z.string().trim().min(2, 'First name is required (min 2 chars)'),
  lastName: z.string().trim().min(2, 'Last name is required (min 2 chars)'),
  email: z.string().trim().email('Valid email address is required'),
  dob: z.string().trim().min(1, 'Date of birth is required'),
  phone: z.string().trim().min(6, 'Valid phone number is required'),
});

type EditPatientFormData = z.infer<typeof editPatientSchema>;

export interface EditPatientProfileDialogProps {
  isOpen: boolean;
  patient: PatientItem | null;
  isLoading?: boolean;
  onClose: () => void;
  onSave: (data: {
    id: string;
    name: string;
    email: string;
    phone: string;
    dob: string;
    avatarUrl?: string;
  }) => void;
}

export const EditPatientProfileDialog: React.FC<EditPatientProfileDialogProps> = ({
  isOpen,
  patient,
  isLoading = false,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const dobId = useId();
  const phoneId = useId();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditPatientFormData>({
    resolver: zodResolver(editPatientSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      dob: '',
      phone: '',
    },
  });

  // Populate form when patient opens
  useEffect(() => {
    if (patient) {
      const parts = patient.name.split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      // Format date if needed
      let rawDob = patient.profile?.dob || '';
      if (rawDob.includes('(')) {
        rawDob = rawDob.split('(')[0].trim();
      }

      reset({
        firstName,
        lastName,
        email: patient.profile?.email || patient.email || '',
        dob: rawDob || '1985-04-12',
        phone: patient.profile?.phone || patient.phone || '',
      });

      setPhotoPreview(patient.heroPhotoUrl || patient.avatarUrl || null);
    }
  }, [patient, reset, isOpen]);

  // Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    },
    [isLoading, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !patient) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (formData: EditPatientFormData) => {
    onSave({
      id: patient.id,
      name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      dob: formData.dob.trim(),
      avatarUrl: photoPreview || undefined,
    });
  };

  return (
    <div
      className="patient-dialog-backdrop"
      onClick={() => {
        if (!isLoading) onClose();
      }}
      role="presentation"
      data-node-id="20:2203"
    >
      <div
        className="patient-dialog-card edit-profile"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar (Figma Node 20:2204) */}
        <div className="patient-edit-dialog-header" data-node-id="20:2204">
          <div className="patient-edit-header-left" data-node-id="20:2205">
            <FileEdit size={20} color="#28006d" data-node-id="20:2206" />
            <h2 id="patient-edit-title" className="patient-edit-header-title" data-node-id="20:2209">
              {t('patients.modals.editTitle', 'Edit Patient Profile')}
            </h2>
          </div>
          <button
            type="button"
            className="patient-edit-header-close"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close dialog"
            data-node-id="20:2210"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Scrollable Container (Figma Node 20:2213) */}
          <div className="patient-edit-dialog-scroll" data-node-id="20:2213">
            {/* Avatar Section (Figma Node 20:2214) */}
            <div className="patient-edit-avatar-section" data-node-id="20:2214">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif"
                className="sr-only"
                onChange={handlePhotoUpload}
                aria-label="Upload Photo"
              />
              <div
                className="patient-edit-avatar-circle"
                data-node-id="20:2215"
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt={patient.name}
                    className="patient-edit-avatar-img"
                  />
                ) : (
                  <User size={28} color="#7a7583" />
                )}
              </div>
              <div className="patient-edit-avatar-info" data-node-id="20:2218">
                <button
                  type="button"
                  className="patient-edit-btn-change-photo"
                  onClick={() => fileInputRef.current?.click()}
                  data-node-id="20:2219"
                >
                  {t('patients.modals.changePhoto', 'Change Photo')}
                </button>
                <p className="patient-edit-avatar-hint" data-node-id="20:2222">
                  {t('patients.modals.photoRequirements', 'JPG, GIF or PNG. Max size of 800K')}
                </p>
              </div>
            </div>

            {/* Form Fields Grid (Figma Node 20:2223) */}
            <div className="patient-edit-form-grid" data-node-id="20:2223">
              {/* First Name (Figma Node 20:2224) */}
              <div className="patient-dialog-field-group" data-node-id="20:2224">
                <label htmlFor={firstNameId} className="patient-dialog-field-label" data-node-id="20:2225">
                  {t('patients.modals.firstNameLabel', 'First Name')}
                </label>
                <input
                  id={firstNameId}
                  type="text"
                  {...register('firstName')}
                  className={`patient-edit-input ${errors.firstName ? 'has-error' : ''}`}
                  data-node-id="20:2227"
                  aria-invalid={errors.firstName ? 'true' : 'false'}
                />
                {errors.firstName && (
                  <span className="patient-edit-error-text" role="alert">
                    {errors.firstName.message}
                  </span>
                )}
              </div>

              {/* Last Name (Figma Node 20:2230) */}
              <div className="patient-dialog-field-group" data-node-id="20:2230">
                <label htmlFor={lastNameId} className="patient-dialog-field-label" data-node-id="20:2231">
                  {t('patients.modals.lastNameLabel', 'Last Name')}
                </label>
                <input
                  id={lastNameId}
                  type="text"
                  {...register('lastName')}
                  className={`patient-edit-input ${errors.lastName ? 'has-error' : ''}`}
                  data-node-id="20:2233"
                  aria-invalid={errors.lastName ? 'true' : 'false'}
                />
                {errors.lastName && (
                  <span className="patient-edit-error-text" role="alert">
                    {errors.lastName.message}
                  </span>
                )}
              </div>

              {/* Email Address (Full Width) (Figma Node 20:2236) */}
              <div className="patient-dialog-field-group patient-edit-field-full" data-node-id="20:2236">
                <label htmlFor={emailId} className="patient-dialog-field-label" data-node-id="20:2237">
                  {t('patients.modals.emailLabel', 'Email Address')}
                </label>
                <input
                  id={emailId}
                  type="email"
                  {...register('email')}
                  className={`patient-edit-input ${errors.email ? 'has-error' : ''}`}
                  data-node-id="20:2239"
                  aria-invalid={errors.email ? 'true' : 'false'}
                />
                {errors.email && (
                  <span className="patient-edit-error-text" role="alert">
                    {errors.email.message}
                  </span>
                )}
              </div>

              {/* Date of Birth (Figma Node 20:2242) */}
              <div className="patient-dialog-field-group" data-node-id="20:2242">
                <label htmlFor={dobId} className="patient-dialog-field-label" data-node-id="20:2243">
                  {t('patients.modals.dobLabel', 'Date of Birth')}
                </label>
                <div className="patient-dialog-input-wrap">
                  <input
                    id={dobId}
                    type="text"
                    {...register('dob')}
                    placeholder="MM/DD/YYYY"
                    className={`patient-edit-input ${errors.dob ? 'has-error' : ''}`}
                    data-node-id="20:2246"
                    aria-invalid={errors.dob ? 'true' : 'false'}
                  />
                  <div className="patient-dialog-input-icon" style={{ left: 'auto', right: 12 }}>
                    <Calendar size={16} color="#7a7583" />
                  </div>
                </div>
                {errors.dob && (
                  <span className="patient-edit-error-text" role="alert">
                    {errors.dob.message}
                  </span>
                )}
              </div>

              {/* Phone Number (Figma Node 20:2259) */}
              <div className="patient-dialog-field-group" data-node-id="20:2259">
                <label htmlFor={phoneId} className="patient-dialog-field-label" data-node-id="20:2260">
                  {t('patients.modals.phoneLabel', 'Phone Number')}
                </label>
                <input
                  id={phoneId}
                  type="tel"
                  {...register('phone')}
                  className={`patient-edit-input ${errors.phone ? 'has-error' : ''}`}
                  data-node-id="20:2262"
                  aria-invalid={errors.phone ? 'true' : 'false'}
                />
                {errors.phone && (
                  <span className="patient-edit-error-text" role="alert">
                    {errors.phone.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer Bar (Figma Node 20:2265) */}
          <div className="patient-dialog-footer" data-node-id="20:2265">
            <button
              type="button"
              className="patient-dialog-btn-cancel"
              onClick={onClose}
              disabled={isLoading}
              data-node-id="20:2267"
            >
              {t('patients.modals.discardChanges', 'Discard Changes')}
            </button>

            <button
              type="submit"
              className="patient-dialog-btn-primary"
              disabled={isLoading}
              data-node-id="20:2269"
            >
              {isLoading
                ? t('patients.modals.savingProfile', 'Saving Profile...')
                : t('patients.modals.saveProfile', 'Save Profile')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPatientProfileDialog;
