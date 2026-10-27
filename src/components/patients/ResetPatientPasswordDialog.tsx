import React, { useState, useEffect, useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, Mail, Send } from 'lucide-react';
import './PatientActionDialogs.css';

export interface ResetPatientPasswordDialogProps {
  isOpen: boolean;
  patientEmail: string;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (options: { forceLogout: boolean }) => void;
}

export const ResetPatientPasswordDialog: React.FC<ResetPatientPasswordDialogProps> = ({
  isOpen,
  patientEmail,
  isLoading = false,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [forceLogout, setForceLogout] = useState(true);
  const emailInputId = useId();
  const checkboxId = useId();

  // Escape key listener
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
      setForceLogout(true);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      onConfirm({ forceLogout });
    }
  };

  return (
    <div
      className="patient-dialog-backdrop"
      onClick={() => {
        if (!isLoading) onClose();
      }}
      role="presentation"
      data-node-id="20:2170"
    >
      <div
        className="patient-dialog-card reset"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-reset-title"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="patient-dialog-body" data-node-id="20:2171">
            {/* Header Row (Figma Node 20:2172) */}
            <div className="patient-dialog-header" data-node-id="20:2172">
              <div className="patient-dialog-icon-wrap purple" data-node-id="20:2173">
                <RotateCcw size={22} color="#28006d" />
              </div>
              <h2 id="patient-reset-title" className="patient-dialog-title" data-node-id="20:2175">
                {t('patients.modals.resetTitle', 'Reset Patient Password')}
              </h2>
            </div>

            {/* Description Text (Figma Node 20:2178) */}
            <p className="patient-dialog-desc" data-node-id="20:2179">
              {t(
                'patients.modals.resetMessage',
                "Send a password reset link to the patient's registered email address. This will invalidate their current session."
              )}
            </p>

            {/* Registered Email Field (Figma Node 20:2180) */}
            <div className="patient-dialog-field-group" data-node-id="20:2180">
              <label htmlFor={emailInputId} className="patient-dialog-field-label" data-node-id="20:2181">
                {t('patients.modals.registeredEmailLabel', 'Registered Email')}
              </label>
              <div className="patient-dialog-input-wrap" data-node-id="20:2183">
                <Mail size={16} className="patient-dialog-input-icon" data-node-id="20:2185" />
                <input
                  id={emailInputId}
                  type="email"
                  value={patientEmail}
                  readOnly
                  disabled
                  className="patient-dialog-input-readonly"
                  data-node-id="20:2186"
                  aria-label="Registered Email"
                />
              </div>
            </div>

            {/* Force immediate logout checkbox (Figma Node 20:2189) */}
            <div className="patient-dialog-checkbox-row" data-node-id="20:2190">
              <input
                id={checkboxId}
                type="checkbox"
                checked={forceLogout}
                onChange={(e) => setForceLogout(e.target.checked)}
                className="patient-dialog-checkbox"
                data-node-id="20:2191"
              />
              <label htmlFor={checkboxId} className="patient-dialog-checkbox-label" data-node-id="20:2194">
                {t('patients.modals.forceLogoutLabel', 'Force immediate logout across all devices')}
              </label>
            </div>
          </div>

          {/* Footer Actions (Figma Node 20:2196) */}
          <div className="patient-dialog-footer" data-node-id="20:2196">
            <button
              type="button"
              className="patient-dialog-btn-cancel"
              onClick={onClose}
              disabled={isLoading}
              data-node-id="20:2197"
            >
              {t('patients.modals.cancel', 'Cancel')}
            </button>

            <button
              type="submit"
              className="patient-dialog-btn-primary"
              disabled={isLoading}
              data-node-id="20:2199"
            >
              <Send size={14} />
              <span>
                {isLoading
                  ? t('patients.modals.saving', 'Sending...')
                  : t('patients.modals.sendResetLink', 'Send Reset Link')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPatientPasswordDialog;
