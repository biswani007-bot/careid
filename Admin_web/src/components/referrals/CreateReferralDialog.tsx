import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  X,
  AlertCircle,
  UserCheck,
  Building2,
  Stethoscope,
  FileText,
  Activity,
  ArrowRight,
} from 'lucide-react';
import {
  useCreateReferralMutation,
  type CreateReferralPayload,
} from '../../services/referralService';
import { usePatientsQuery } from '../../services/patientService';
import { useFacilitiesQuery, useFacilityDoctorsQuery } from '../../services/facilityService';
import { useDoctorsQuery } from '../../services/doctorService';
import './CreateReferralDialog.css';

const createReferralSchema = z.object({
  patientId: z.string().min(1, 'Please select a patient'),
  receivingFacilityId: z.string().min(1, 'Please select a receiving facility'),
  receivingDoctorId: z.string().min(1, 'Please select a receiving doctor'),
  priority: z.enum(['ROUTINE', 'URGENT', 'EMERGENCY']),
  referralType: z.enum([
    'SPECIALIST_CONSULTATION',
    'DIAGNOSTIC',
    'TRANSFER',
    'SECOND_OPINION',
  ]),
  specialtyRequired: z
    .string()
    .trim()
    .min(2, 'Specialty is required (e.g. Cardiology)'),
  reasonForReferral: z
    .string()
    .trim()
    .min(5, 'Reason for referral must be at least 5 characters'),
  clinicalSummary: z
    .string()
    .trim()
    .min(5, 'Clinical summary must be at least 5 characters'),
});

type CreateReferralFormData = z.infer<typeof createReferralSchema>;

export interface CreateReferralDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export const CreateReferralDialog: React.FC<CreateReferralDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [backendError, setBackendError] = useState<string | null>(null);

  // Live backend data hooks
  const { data: patientsData, isLoading: isLoadingPatients } = usePatientsQuery({
    limit: 100,
  });
  const { data: facilitiesData, isLoading: isLoadingFacilities } =
    useFacilitiesQuery();
  const { data: doctorsData, isLoading: isLoadingDoctors } = useDoctorsQuery({
    limit: 100,
  });

  const createMutation = useCreateReferralMutation();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateReferralFormData>({
    resolver: zodResolver(createReferralSchema),
    defaultValues: {
      patientId: '',
      receivingFacilityId: '',
      receivingDoctorId: '',
      priority: 'URGENT',
      referralType: 'SPECIALIST_CONSULTATION',
      specialtyRequired: 'Cardiology',
      reasonForReferral: '',
      clinicalSummary: '',
    },
  });

  const selectedFacilityId = watch('receivingFacilityId');
  const { data: facilityDoctors, isLoading: isLoadingFacilityDoctors } =
    useFacilityDoctorsQuery(selectedFacilityId || '');

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const onSubmit = async (formData: CreateReferralFormData) => {
    setBackendError(null);
    try {
      await createMutation.mutateAsync(formData as CreateReferralPayload);
      reset();
      if (onSuccess) {
        onSuccess('Referral created successfully.');
      }
      onClose();
    } catch (err: any) {
      setBackendError(
        err?.message || 'Failed to create patient referral on backend.'
      );
    }
  };

  const patientsList = Array.isArray(patientsData?.patients)
    ? patientsData.patients
    : Array.isArray(patientsData)
    ? patientsData
    : [];

  const facilitiesList = Array.isArray(facilitiesData) ? facilitiesData : [];

  const allDoctorsList = Array.isArray(doctorsData?.doctors)
    ? doctorsData.doctors
    : Array.isArray(doctorsData)
    ? doctorsData
    : [];

  // If a facility is selected, prioritize affiliated doctors to adhere to backend rules
  const affiliatedDoctors = selectedFacilityId && Array.isArray(facilityDoctors) && facilityDoctors.length > 0
    ? facilityDoctors.map((doc: any) => ({
        id: doc.id,
        name: doc.fullName || doc.name,
        specialty: doc.specialization || doc.specialty || 'Specialist',
      }))
    : [];

  const effectiveDoctors = selectedFacilityId
    ? affiliatedDoctors
    : allDoctorsList.map((d: any) => ({
        id: d.id,
        name: d.name || d.fullName,
        specialty: d.specialty || d.department || 'Specialist',
      }));

  return (
    <div
      className="create-referral-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-referral-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="create-referral-modal" role="document">
        {/* Header */}
        <div className="create-referral-header">
          <div className="create-referral-title-area">
            <h2 id="create-referral-title" className="create-referral-title">
              Create Patient Care Referral
            </h2>
            <p className="create-referral-subtitle">
              Provision an official clinical care coordination referral via live backend API.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="create-referral-close-btn"
            aria-label="Close dialog"
            title="Close dialog (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Container */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="create-referral-form"
          noValidate
        >
          {/* Scrollable Form Body */}
          <div className="create-referral-body">
            {/* Backend Error Banner */}
            {backendError && (
              <div
                className="create-referral-error-banner"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle size={18} className="create-referral-error-icon" />
                <div className="create-referral-error-content">
                  <div className="create-referral-error-title">
                    Backend Response Error
                  </div>
                  <div>{backendError}</div>
                </div>
              </div>
            )}

            {/* Row 1: Patient Selection */}
            <div className="create-referral-field">
              <label htmlFor="cr-patient-select" className="create-referral-label">
                <UserCheck size={15} className="create-referral-label-icon" />
                Patient <span className="create-referral-required">*</span>
              </label>
              <select
                id="cr-patient-select"
                {...register('patientId')}
                disabled={isLoadingPatients || isSubmitting}
                className={`create-referral-select ${
                  errors.patientId ? 'has-error' : ''
                }`}
                aria-invalid={!!errors.patientId}
                aria-describedby={errors.patientId ? 'cr-patient-err' : undefined}
              >
                <option value="">
                  {isLoadingPatients
                    ? 'Loading live patients...'
                    : '-- Select Patient --'}
                </option>
                {patientsList.map((p: any) => {
                  const patientDisplayName =
                    p.name ||
                    [p.firstName, p.lastName].filter(Boolean).join(' ') ||
                    p.fullName ||
                    'Patient';
                  const patientIdCode =
                    p.vaultId ||
                    p.patientNumber ||
                    p.healthCardNumber ||
                    p.hvId ||
                    p.id.slice(0, 8);
                  return (
                    <option key={p.id} value={p.id}>
                      {patientDisplayName} ({patientIdCode})
                    </option>
                  );
                })}
              </select>
              {errors.patientId && (
                <p id="cr-patient-err" className="create-referral-error-text">
                  {errors.patientId.message}
                </p>
              )}
            </div>

            {/* Row 2: Receiving Facility & Receiving Doctor */}
            <div className="create-referral-grid-2">
              <div className="create-referral-field">
                <label
                  htmlFor="cr-facility-select"
                  className="create-referral-label"
                >
                  <Building2 size={15} className="create-referral-label-icon" />
                  Receiving Facility <span className="create-referral-required">*</span>
                </label>
                <select
                  id="cr-facility-select"
                  {...register('receivingFacilityId')}
                  disabled={isLoadingFacilities || isSubmitting}
                  className={`create-referral-select ${
                    errors.receivingFacilityId ? 'has-error' : ''
                  }`}
                  aria-invalid={!!errors.receivingFacilityId}
                  aria-describedby={
                    errors.receivingFacilityId ? 'cr-facility-err' : undefined
                  }
                >
                  <option value="">
                    {isLoadingFacilities
                      ? 'Loading facilities...'
                      : '-- Select Facility --'}
                  </option>
                  {facilitiesList.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.name || f.legalName || f.facilityId}
                    </option>
                  ))}
                </select>
                {errors.receivingFacilityId && (
                  <p id="cr-facility-err" className="create-referral-error-text">
                    {errors.receivingFacilityId.message}
                  </p>
                )}
              </div>

              <div className="create-referral-field">
                <label
                  htmlFor="cr-doctor-select"
                  className="create-referral-label"
                >
                  <Stethoscope size={15} className="create-referral-label-icon" />
                  Receiving Doctor <span className="create-referral-required">*</span>
                </label>
                <select
                  id="cr-doctor-select"
                  {...register('receivingDoctorId')}
                  disabled={isLoadingDoctors || isLoadingFacilityDoctors || isSubmitting}
                  className={`create-referral-select ${
                    errors.receivingDoctorId ? 'has-error' : ''
                  }`}
                  aria-invalid={!!errors.receivingDoctorId}
                  aria-describedby={
                    errors.receivingDoctorId ? 'cr-doctor-err' : undefined
                  }
                >
                  <option value="">
                    {isLoadingDoctors || (selectedFacilityId && isLoadingFacilityDoctors)
                      ? 'Loading affiliated doctors...'
                      : selectedFacilityId && effectiveDoctors.length === 0
                      ? '-- No doctors affiliated with this facility --'
                      : '-- Select Doctor --'}
                  </option>
                  {effectiveDoctors.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialty || 'Specialist'})
                    </option>
                  ))}
                </select>
                {errors.receivingDoctorId && (
                  <p id="cr-doctor-err" className="create-referral-error-text">
                    {errors.receivingDoctorId.message}
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: Priority & Referral Type */}
            <div className="create-referral-grid-2">
              <div className="create-referral-field">
                <label
                  htmlFor="cr-priority-select"
                  className="create-referral-label"
                >
                  <Activity size={15} className="create-referral-label-icon" />
                  Priority <span className="create-referral-required">*</span>
                </label>
                <select
                  id="cr-priority-select"
                  {...register('priority')}
                  disabled={isSubmitting}
                  className="create-referral-select"
                >
                  <option value="ROUTINE">Routine</option>
                  <option value="URGENT">Urgent</option>
                  <option value="EMERGENCY">Emergency</option>
                </select>
              </div>

              <div className="create-referral-field">
                <label
                  htmlFor="cr-type-select"
                  className="create-referral-label"
                >
                  <FileText size={15} className="create-referral-label-icon" />
                  Referral Type <span className="create-referral-required">*</span>
                </label>
                <select
                  id="cr-type-select"
                  {...register('referralType')}
                  disabled={isSubmitting}
                  className="create-referral-select"
                >
                  <option value="SPECIALIST_CONSULTATION">Specialist Consultation</option>
                  <option value="DIAGNOSTIC">Diagnostic</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="SECOND_OPINION">Second Opinion</option>
                </select>
              </div>
            </div>

            {/* Row 4: Specialty Required */}
            <div className="create-referral-field">
              <label
                htmlFor="cr-specialty-input"
                className="create-referral-label"
              >
                <Stethoscope size={15} className="create-referral-label-icon" />
                Specialty Required <span className="create-referral-required">*</span>
              </label>
              <input
                id="cr-specialty-input"
                type="text"
                {...register('specialtyRequired')}
                disabled={isSubmitting}
                placeholder="e.g. Cardiology, Neurology, Orthopedics"
                className={`create-referral-input ${
                  errors.specialtyRequired ? 'has-error' : ''
                }`}
                aria-invalid={!!errors.specialtyRequired}
                aria-describedby={
                  errors.specialtyRequired ? 'cr-specialty-err' : undefined
                }
              />
              {errors.specialtyRequired && (
                <p id="cr-specialty-err" className="create-referral-error-text">
                  {errors.specialtyRequired.message}
                </p>
              )}
            </div>

            {/* Row 5: Reason for Referral */}
            <div className="create-referral-field">
              <label
                htmlFor="cr-reason-input"
                className="create-referral-label"
              >
                <FileText size={15} className="create-referral-label-icon" />
                Reason for Referral <span className="create-referral-required">*</span>
              </label>
              <textarea
                id="cr-reason-input"
                {...register('reasonForReferral')}
                disabled={isSubmitting}
                rows={2}
                placeholder="e.g. Patient presents with persistent chest pain and abnormal ECG findings"
                className={`create-referral-textarea ${
                  errors.reasonForReferral ? 'has-error' : ''
                }`}
                aria-invalid={!!errors.reasonForReferral}
                aria-describedby={
                  errors.reasonForReferral ? 'cr-reason-err' : undefined
                }
              />
              {errors.reasonForReferral && (
                <p id="cr-reason-err" className="create-referral-error-text">
                  {errors.reasonForReferral.message}
                </p>
              )}
            </div>

            {/* Row 6: Clinical Summary */}
            <div className="create-referral-field">
              <label
                htmlFor="cr-summary-input"
                className="create-referral-label"
              >
                Clinical Summary <span className="create-referral-required">*</span>
              </label>
              <textarea
                id="cr-summary-input"
                {...register('clinicalSummary')}
                disabled={isSubmitting}
                rows={3}
                placeholder="e.g. Blood pressure 145/95 mmHg, elevated cardiac markers. Prior Holter scan episodes."
                className={`create-referral-textarea ${
                  errors.clinicalSummary ? 'has-error' : ''
                }`}
                aria-invalid={!!errors.clinicalSummary}
                aria-describedby={
                  errors.clinicalSummary ? 'cr-summary-err' : undefined
                }
              />
              {errors.clinicalSummary && (
                <p id="cr-summary-err" className="create-referral-error-text">
                  {errors.clinicalSummary.message}
                </p>
              )}
            </div>
          </div>

          {/* Sticky Non-Clipped Footer */}
          <div className="create-referral-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="create-referral-cancel-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              className="create-referral-submit-btn"
            >
              {isSubmitting || createMutation.isPending ? (
                <>Submitting...</>
              ) : (
                <>
                  <span>Create Referral</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateReferralDialog;
