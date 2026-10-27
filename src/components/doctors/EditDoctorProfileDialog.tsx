import React, { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, FileEdit, AlertCircle, Loader2 } from 'lucide-react';
import { type DoctorItem } from '../../services/doctorService';
import './DoctorActionDialogs.css';

const editDoctorSchema = z.object({
  name: z.string().trim().min(2, 'Doctor name is required (at least 2 characters)'),
  specialty: z.string().trim().min(2, 'Primary specialty is required'),
  subSpecialty: z.string().trim().optional(),
  hospital: z.string().trim().min(2, 'Primary hospital is required'),
  department: z.string().trim().optional(),
  medicalCouncilRegistration: z.string().trim().optional(),
  licenseExpiry: z.string().trim().optional(),
  experienceYears: z.string().trim().optional(),
  email: z.string().trim().email('Please enter a valid email address'),
  phone: z.string().trim().min(6, 'Please enter a valid mobile number'),
  officeAddress: z.string().trim().optional(),
});

export type EditDoctorFormData = z.infer<typeof editDoctorSchema>;

export interface EditDoctorProfileDialogProps {
  isOpen: boolean;
  doctor: DoctorItem | null;
  isLoading?: boolean;
  onClose: () => void;
  onSave: (data: Partial<DoctorItem> & { id: string }) => void;
}

export const EditDoctorProfileDialog: React.FC<EditDoctorProfileDialogProps> = ({
  isOpen,
  doctor,
  isLoading = false,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();

  const nameId = useId();
  const specialtyId = useId();
  const subSpecialtyId = useId();
  const hospitalId = useId();
  const departmentId = useId();
  const regId = useId();
  const expiryId = useId();
  const expYearsId = useId();
  const emailId = useId();
  const phoneId = useId();
  const addressId = useId();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditDoctorFormData>({
    resolver: zodResolver(editDoctorSchema),
    defaultValues: {
      name: '',
      specialty: '',
      subSpecialty: '',
      hospital: '',
      department: '',
      medicalCouncilRegistration: '',
      licenseExpiry: '',
      experienceYears: '',
      email: '',
      phone: '',
      officeAddress: '',
    },
  });

  useEffect(() => {
    if (doctor) {
      reset({
        name: doctor.name || '',
        specialty: doctor.specialty || '',
        subSpecialty: doctor.subSpecialty || '',
        hospital: doctor.hospital || '',
        department: doctor.department || '',
        medicalCouncilRegistration: doctor.medicalCouncilRegistration || '',
        licenseExpiry: doctor.licenseExpiry || '',
        experienceYears: doctor.experienceYears ? String(doctor.experienceYears) : '',
        email: doctor.email || '',
        phone: doctor.phone || '',
        officeAddress: doctor.officeAddress || '',
      });
    }
  }, [doctor, isOpen, reset]);

  // Lock background scroll and handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, isLoading, isSubmitting, onClose]);

  if (!isOpen || !doctor) return null;

  const handleCancel = () => {
    if (isLoading || isSubmitting) return;
    reset();
    onClose();
  };

  const onSubmit = (data: EditDoctorFormData) => {
    onSave({
      id: doctor.id,
      name: data.name,
      specialty: data.specialty,
      subSpecialty: data.subSpecialty,
      hospital: data.hospital,
      department: data.department,
      medicalCouncilRegistration: data.medicalCouncilRegistration,
      licenseExpiry: data.licenseExpiry,
      experienceYears: data.experienceYears,
      email: data.email,
      phone: data.phone,
      officeAddress: data.officeAddress,
    });
  };

  const isBusy = isLoading || isSubmitting;

  return (
    <div
      className="doctor-dialog-backdrop"
      onClick={handleCancel}
      role="presentation"
    >
      <div
        className="doctor-edit-dialog-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-doctor-profile-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================================================================
            HEADER REGION (20–24px padding, icon badge, title, subtitle, close)
            ================================================================ */}
        <div className="doctor-edit-header">
          <div className="doctor-edit-header-left">
            <div className="doctor-edit-header-icon">
              <FileEdit size={20} />
            </div>
            <div className="doctor-edit-header-text">
              <h2 id="edit-doctor-profile-title" className="doctor-edit-title">
                {t('doctors.profile.dialogs.editTitle', 'Edit Doctor Profile')}
              </h2>
              <p className="doctor-edit-subtitle">
                <span className="font-semibold text-[#494552]">{doctor.name}</span>
                <span>•</span>
                <span className="doctor-edit-badge-id">{doctor.hvId}</span>
                {doctor.specialty && (
                  <>
                    <span>•</span>
                    <span className="text-[#006a60] font-medium">{doctor.specialty}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isBusy}
            className="doctor-edit-header-close"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* ================================================================
            SCROLLABLE FORM BODY (20–24px padding, 2 equal columns, min-height: 0)
            ================================================================ */}
        <form
          id="edit-doctor-form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="doctor-edit-body"
        >
          <div className="doctor-edit-grid">
            {/* ROW 1: Doctor Name (Left) | Primary Specialty (Right) */}
            <div className="doctor-edit-field">
              <label htmlFor={nameId} className="doctor-edit-label">
                Doctor Name <span className="doctor-edit-required">*</span>
              </label>
              <input
                id={nameId}
                type="text"
                placeholder="e.g. Dr. Sarah Jenkins"
                disabled={isBusy}
                {...register('name')}
                className={`doctor-edit-input ${errors.name ? 'has-error' : ''}`}
              />
              {errors.name && (
                <p className="doctor-edit-error-msg">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{errors.name.message}</span>
                </p>
              )}
            </div>

            <div className="doctor-edit-field">
              <label htmlFor={specialtyId} className="doctor-edit-label">
                Primary Specialty <span className="doctor-edit-required">*</span>
              </label>
              <input
                id={specialtyId}
                type="text"
                placeholder="e.g. Cardiology"
                disabled={isBusy}
                {...register('specialty')}
                className={`doctor-edit-input ${errors.specialty ? 'has-error' : ''}`}
              />
              {errors.specialty && (
                <p className="doctor-edit-error-msg">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{errors.specialty.message}</span>
                </p>
              )}
            </div>

            {/* ROW 2: Sub-specialty (Left) | Primary Hospital (Right) */}
            <div className="doctor-edit-field">
              <label htmlFor={subSpecialtyId} className="doctor-edit-label">
                Sub-specialty
              </label>
              <input
                id={subSpecialtyId}
                type="text"
                placeholder="e.g. Interventional Cardiology"
                disabled={isBusy}
                {...register('subSpecialty')}
                className="doctor-edit-input"
              />
            </div>

            <div className="doctor-edit-field">
              <label htmlFor={hospitalId} className="doctor-edit-label">
                Primary Hospital <span className="doctor-edit-required">*</span>
              </label>
              <input
                id={hospitalId}
                type="text"
                placeholder="e.g. Mercy General Hospital"
                disabled={isBusy}
                {...register('hospital')}
                className={`doctor-edit-input ${errors.hospital ? 'has-error' : ''}`}
              />
              {errors.hospital && (
                <p className="doctor-edit-error-msg">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{errors.hospital.message}</span>
                </p>
              )}
            </div>

            {/* ROW 3: Department (Left) | Medical Council Registration (Right) */}
            <div className="doctor-edit-field">
              <label htmlFor={departmentId} className="doctor-edit-label">
                Department
              </label>
              <input
                id={departmentId}
                type="text"
                placeholder="e.g. Cardiovascular Care"
                disabled={isBusy}
                {...register('department')}
                className="doctor-edit-input"
              />
            </div>

            <div className="doctor-edit-field">
              <label htmlFor={regId} className="doctor-edit-label">
                Medical Council Registration
              </label>
              <input
                id={regId}
                type="text"
                placeholder="e.g. Reg. 882910-US"
                disabled={isBusy}
                {...register('medicalCouncilRegistration')}
                className="doctor-edit-input"
              />
            </div>

            {/* ROW 4: License Expiry (Left) | Years of Experience (Right) */}
            <div className="doctor-edit-field">
              <label htmlFor={expiryId} className="doctor-edit-label">
                License Expiry
              </label>
              <input
                id={expiryId}
                type="text"
                placeholder="e.g. Oct 2026"
                disabled={isBusy}
                {...register('licenseExpiry')}
                className="doctor-edit-input"
              />
            </div>

            <div className="doctor-edit-field">
              <label htmlFor={expYearsId} className="doctor-edit-label">
                Years of Experience
              </label>
              <input
                id={expYearsId}
                type="text"
                placeholder="e.g. 12+ Years"
                disabled={isBusy}
                {...register('experienceYears')}
                className="doctor-edit-input"
              />
            </div>

            {/* ROW 5: Email Address (Left) | Mobile Number (Right) */}
            <div className="doctor-edit-field">
              <label htmlFor={emailId} className="doctor-edit-label">
                Email Address <span className="doctor-edit-required">*</span>
              </label>
              <input
                id={emailId}
                type="email"
                placeholder="e.g. dr.jenkins@hospital.org"
                disabled={isBusy}
                {...register('email')}
                className={`doctor-edit-input ${errors.email ? 'has-error' : ''}`}
              />
              {errors.email && (
                <p className="doctor-edit-error-msg">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{errors.email.message}</span>
                </p>
              )}
            </div>

            <div className="doctor-edit-field">
              <label htmlFor={phoneId} className="doctor-edit-label">
                Mobile Number <span className="doctor-edit-required">*</span>
              </label>
              <input
                id={phoneId}
                type="tel"
                placeholder="e.g. +1 555-019-2834"
                disabled={isBusy}
                {...register('phone')}
                className={`doctor-edit-input ${errors.phone ? 'has-error' : ''}`}
              />
              {errors.phone && (
                <p className="doctor-edit-error-msg">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{errors.phone.message}</span>
                </p>
              )}
            </div>

            {/* ROW 6: Office Address — Full Width */}
            <div className="doctor-edit-field full-width">
              <label htmlFor={addressId} className="doctor-edit-label">
                Office Address
              </label>
              <textarea
                id={addressId}
                rows={3}
                placeholder="Building, Suite / Floor, Hospital Campus"
                disabled={isBusy}
                {...register('officeAddress')}
                className="doctor-edit-textarea"
              />
            </div>
          </div>
        </form>

        {/* ================================================================
            FOOTER REGION (16–24px padding, subtle top border, clear gap)
            ================================================================ */}
        <div className="doctor-edit-footer">
          <button
            type="button"
            className="doctor-edit-btn-cancel"
            onClick={handleCancel}
            disabled={isBusy}
          >
            {t('doctors.profile.dialogs.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            form="edit-doctor-form"
            className="doctor-edit-btn-save"
            disabled={isBusy}
          >
            {isBusy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{t('doctors.profile.dialogs.saving', 'Saving...')}</span>
              </>
            ) : (
              <span>{t('doctors.profile.dialogs.save', 'Save Changes')}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditDoctorProfileDialog;
