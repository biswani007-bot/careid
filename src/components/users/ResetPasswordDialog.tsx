import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw } from 'lucide-react';
import iconResetBadge from '../../assets/users/dialog-icon-reset.png';
import './UserActionDialogs.css';

export interface ResetPasswordDialogProps {
  isOpen: boolean;
  userEmail?: string;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  /** Optional static mode: disables backdrop/overlay when rendered side-by-side in showcase */
  isStaticPreview?: boolean;
}

export const ResetPasswordDialog: React.FC<ResetPasswordDialogProps> = ({
  isOpen,
  userEmail = 'sarah.j@clinic.com',
  isLoading = false,
  onClose,
  onConfirm,
  isStaticPreview = false,
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Keyboard navigation: Escape key closes modal
  useEffect(() => {
    if (!isOpen || isStaticPreview) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    confirmBtnRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, onClose, isStaticPreview]);

  if (!isOpen && !isStaticPreview) return null;

  const title = t('userActionDialogs.resetPassword.title', 'Reset Password');
  const description = t(
    'userActionDialogs.resetPassword.description',
    'Send password reset instructions to {{email}}?',
    { email: userEmail }
  );
  const confirmText = isLoading
    ? t('userActionDialogs.resetPassword.loading', 'Sending...')
    : t('userActionDialogs.resetPassword.confirm', 'Send Reset Link');

  const cardContent = (
    <div
      ref={dialogRef}
      className="user-dialog-card"
      data-node-id="20:1343"
      role="dialog"
      aria-modal={!isStaticPreview}
      aria-labelledby="reset-password-dialog-title"
      aria-describedby="reset-password-dialog-desc"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Icon Badge */}
      <div className="user-dialog-badge reset" data-node-id="20:1346">
        {iconResetBadge ? (
          <img
            src={iconResetBadge}
            alt=""
            className="user-dialog-badge-img"
            data-node-id="20:1348"
          />
        ) : (
          <RotateCw size={20} />
        )}
      </div>

      {/* Dialog Title */}
      <h2 id="reset-password-dialog-title" className="user-dialog-title" data-node-id="20:1350">
        {title}
      </h2>

      {/* Dialog Description */}
      <p id="reset-password-dialog-desc" className="user-dialog-desc" data-node-id="20:1352">
        {description}
      </p>

      {/* Action Buttons */}
      <div className="user-dialog-actions" data-node-id="20:1354">
        <button
          type="button"
          className="user-dialog-btn-cancel"
          onClick={onClose}
          disabled={isLoading}
          data-node-id="20:1355"
        >
          {t('userActionDialogs.resetPassword.cancel', 'Cancel')}
        </button>

        <button
          ref={confirmBtnRef}
          type="button"
          className="user-dialog-btn-reset"
          onClick={onConfirm}
          disabled={isLoading}
          data-node-id="20:1357"
        >
          {confirmText}
        </button>
      </div>
    </div>
  );

  if (isStaticPreview) {
    return cardContent;
  }

  return (
    <div
      className="user-dialog-backdrop"
      data-node-id="20:1326"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      {cardContent}
    </div>
  );
};

export default ResetPasswordDialog;
