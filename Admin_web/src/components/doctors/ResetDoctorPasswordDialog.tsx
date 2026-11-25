import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './DoctorActionDialogs.css';
import resetLockIcon from '../../assets/doctors/icon-modal-reset-lock.svg';

export interface ResetDoctorPasswordDialogProps {
  isOpen: boolean;
  doctorName: string;
  doctorEmail: string;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ResetDoctorPasswordDialog: React.FC<ResetDoctorPasswordDialogProps> = ({
  isOpen,
  doctorName: _doctorName,
  doctorEmail,
  isLoading = false,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();

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

  if (!isOpen) return null;

  const emailDisplay = doctorEmail.endsWith('?') ? doctorEmail : `${doctorEmail}?`;

  return (
    <div
      className="doctor-dialog-backdrop"
      onClick={() => {
        if (!isLoading) onClose();
      }}
      role="presentation"
      data-name="Modal Scrim (High contrast overlay)"
    >
      <div
        className="doctor-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-doctor-pwd-title"
        onClick={(e) => e.stopPropagation()}
        data-name="Modal 2: Reset Doctor Password"
      >
        <div className="doctor-modal-header">
          <div className="doctor-modal-icon-wrap reset-pwd" data-name="Overlay">
            <img
              src={resetLockIcon}
              alt=""
              className="doctor-modal-icon-svg w-[20px] h-[20px]"
            />
          </div>

          <h3 id="reset-doctor-pwd-title" className="doctor-modal-title">
            {t('doctors.managementActions.modals.reset.title', 'Reset Doctor Password')}
          </h3>
        </div>

        <div className="doctor-modal-email-box" data-name="Background">
          <p className="doctor-modal-email-label">
            {t(
              'doctors.managementActions.modals.reset.instruction',
              'Send a temporary password reset link to:'
            )}
          </p>
          <p className="doctor-modal-email-target">{emailDisplay}</p>
          <p className="text-[11px] text-[#7a7583] mt-2 leading-tight">
            Note: Doctor password resets are administered via the central Identity & Access system. The Master Registry endpoint is not supported in the active backend schema.
          </p>
        </div>

        <div className="doctor-modal-footer">
          <button
            type="button"
            className="doctor-modal-btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            {t('doctors.managementActions.modals.reset.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            className="doctor-modal-btn-reset"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading
              ? '...'
              : t('doctors.managementActions.modals.reset.sendLink', 'Send Link')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetDoctorPasswordDialog;
