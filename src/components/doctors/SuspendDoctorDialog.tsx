import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import './DoctorActionDialogs.css';
import suspendAlertIcon from '../../assets/doctors/icon-modal-suspend-alert.svg';

export interface SuspendDoctorDialogProps {
  isOpen: boolean;
  doctorName: string;
  isSuspended?: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const SuspendDoctorDialog: React.FC<SuspendDoctorDialogProps> = ({
  isOpen,
  doctorName,
  isSuspended = false,
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

  const displayName = doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`;

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
        aria-labelledby="suspend-doctor-dialog-title"
        onClick={(e) => e.stopPropagation()}
        data-name="Modal 1: Suspend Doctor Account"
      >
        <div className="doctor-modal-header">
          <div
            className={`doctor-modal-icon-wrap ${isSuspended ? 'activate' : 'suspend'}`}
            data-name="Background"
          >
            {isSuspended ? (
              <CheckCircle2 size={20} className="text-[#006a60]" />
            ) : (
              <img
                src={suspendAlertIcon}
                alt=""
                className="doctor-modal-icon-svg w-[22px] h-[19px]"
              />
            )}
          </div>

          <h3 id="suspend-doctor-dialog-title" className="doctor-modal-title">
            {isSuspended
              ? t('doctors.managementActions.modals.suspend.activateTitle', 'Activate Doctor Account')
              : t('doctors.managementActions.modals.suspend.title', 'Suspend Doctor Account')}
          </h3>
        </div>

        <div className="doctor-modal-body">
          <p className="doctor-modal-body-text">
            {isSuspended
              ? t(
                  'doctors.managementActions.modals.suspend.activateConfirm',
                  'Are you sure you want to activate {{name}}? Access to the Doctor App and Portal will be restored immediately.',
                  { name: displayName }
                )
              : t(
                  'doctors.managementActions.modals.suspend.confirm',
                  'Are you sure you want to suspend {{name}}? This will disable access to the Doctor App and Portal immediately.',
                  { name: displayName }
                )}
          </p>
        </div>

        <div className="doctor-modal-footer">
          <button
            type="button"
            className="doctor-modal-btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            {t('doctors.managementActions.modals.suspend.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            className={isSuspended ? 'doctor-modal-btn-activate' : 'doctor-modal-btn-suspend'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading
              ? '...'
              : isSuspended
              ? t('doctors.managementActions.modals.suspend.activateAction', 'Activate')
              : t('doctors.managementActions.modals.suspend.action', 'Suspend')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuspendDoctorDialog;
