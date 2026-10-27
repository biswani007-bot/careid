import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import './PatientActionDialogs.css';

export interface DeactivatePatientDialogProps {
  isOpen: boolean;
  patientName: string;
  isReactivating?: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeactivatePatientDialog: React.FC<DeactivatePatientDialogProps> = ({
  isOpen,
  patientName,
  isReactivating = false,
  isLoading = false,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();

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

  if (!isOpen) return null;

  return (
    <div
      className="patient-dialog-backdrop"
      onClick={() => {
        if (!isLoading) onClose();
      }}
      role="presentation"
      data-node-id="20:2151"
    >
      <div
        className="patient-dialog-card deactivate"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-deactivate-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="patient-dialog-body" data-node-id="20:2152">
          {/* Header Row (Figma Node 20:2153) */}
          <div className="patient-dialog-header" data-node-id="20:2153">
            <div
              className={`patient-dialog-icon-wrap ${isReactivating ? 'purple' : 'danger'}`}
              data-node-id="20:2154"
            >
              {isReactivating ? (
                <CheckCircle2 size={24} color="#006a60" />
              ) : (
                <AlertTriangle size={24} color="#ba1a1a" />
              )}
            </div>
            <h2 id="patient-deactivate-title" className="patient-dialog-title" data-node-id="20:2156">
              {isReactivating
                ? t('patients.modals.reactivateTitle', 'Reactivate Patient Record')
                : t('patients.modals.deactivateTitle', 'Deactivate Patient Record')}
            </h2>
          </div>

          {/* Description Text (Figma Node 20:2158) */}
          <p className="patient-dialog-desc" data-node-id="20:2158">
            {isReactivating ? (
              <>
                {t(
                  'patients.modals.reactivateMessagePrefix',
                  'Are you sure you want to reactivate the record for '
                )}
                <strong>{patientName}</strong>?{' '}
                {t(
                  'patients.modals.reactivateMessageSuffix',
                  'This action will restore access to their patient portal and automated billing cycles.'
                )}
              </>
            ) : (
              <>
                {t(
                  'patients.modals.deactivateMessagePrefix',
                  'Are you sure you want to deactivate the record for '
                )}
                <strong>{patientName}</strong>?{' '}
                {t(
                  'patients.modals.deactivateMessageSuffix',
                  'This action will suspend access to their patient portal and halt automated billing cycles. This action can be reversed by an administrator later.'
                )}
              </>
            )}
          </p>
        </div>

        {/* Footer Actions (Figma Node 20:2165) */}
        <div className="patient-dialog-footer" data-node-id="20:2165">
          <button
            type="button"
            className="patient-dialog-btn-cancel"
            onClick={onClose}
            disabled={isLoading}
            data-node-id="20:2166"
          >
            {t('patients.modals.cancel', 'Cancel')}
          </button>

          <button
            type="button"
            className={
              isReactivating
                ? 'patient-dialog-btn-primary'
                : 'patient-dialog-btn-destructive'
            }
            onClick={onConfirm}
            disabled={isLoading}
            data-node-id="20:2168"
          >
            {isLoading
              ? t('patients.modals.saving', 'Processing...')
              : isReactivating
              ? t('patients.modals.reactivateConfirm', 'Reactivate')
              : t('patients.modals.deactivateConfirm', 'Deactivate')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeactivatePatientDialog;
