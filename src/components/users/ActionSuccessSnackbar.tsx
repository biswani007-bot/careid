import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import iconCheck from '../../assets/users/snackbar-icon-check.png';
import './UserActionDialogs.css';

export interface ActionSuccessSnackbarProps {
  isVisible: boolean;
  message?: string;
  onDismiss: () => void;
  autoHideDuration?: number;
}

export const ActionSuccessSnackbar: React.FC<ActionSuccessSnackbarProps> = ({
  isVisible,
  message = 'User password has been reset successfully.',
  onDismiss,
  autoHideDuration = 5000,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [isVisible, autoHideDuration, onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className="user-action-snackbar"
      data-node-id="20:1359"
      role="status"
      aria-live="polite"
    >
      <div className="user-action-snackbar-left" data-node-id="20:1360">
        <span className="user-action-snackbar-icon" data-node-id="20:1362">
          {iconCheck ? (
            <img src={iconCheck} alt="" data-node-id="20:1363" />
          ) : (
            <CheckCircle2 size={18} color="#10b981" />
          )}
        </span>
        <span className="user-action-snackbar-text" data-node-id="20:1365">
          {message}
        </span>
      </div>

      <button
        type="button"
        className="user-action-snackbar-btn"
        onClick={onDismiss}
        data-node-id="20:1366"
      >
        {t('userActionDialogs.snackbar.dismiss', 'DISMISS')}
      </button>
    </div>
  );
};

export default ActionSuccessSnackbar;
