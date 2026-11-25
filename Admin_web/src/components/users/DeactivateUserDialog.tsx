import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UserX, UserCheck } from 'lucide-react';
import iconDeactivateBadge from '../../assets/users/dialog-icon-deactivate.png';
import './UserActionDialogs.css';

export interface DeactivateUserDialogProps {
  isOpen: boolean;
  userName?: string;
  isReactivating?: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  /** Optional static mode: disables backdrop/overlay when rendered side-by-side in showcase */
  isStaticPreview?: boolean;
}

export const DeactivateUserDialog: React.FC<DeactivateUserDialogProps> = ({
  isOpen,
  userName = 'User',
  isReactivating = false,
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
    // Focus the primary action button on open
    confirmBtnRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, onClose, isStaticPreview]);

  if (!isOpen && !isStaticPreview) return null;

  const title = isReactivating
    ? t('userActionDialogs.activate.title', 'Activate User?')
    : t('userActionDialogs.deactivate.title', 'Deactivate User?');

  const description = isReactivating
    ? t(
        'userActionDialogs.activate.description',
        'Are you sure you want to reactivate access for {{name}}? Access to the platform will be restored immediately.',
        { name: userName }
      )
    : t(
        'userActionDialogs.deactivate.description',
        'Are you sure you want to deactivate {{name}}? Access to the platform will be immediately suspended.',
        { name: userName }
      );

  const confirmText = isLoading
    ? isReactivating
      ? t('userActionDialogs.activate.loading', 'Activating...')
      : t('userActionDialogs.deactivate.loading', 'Deactivating...')
    : isReactivating
    ? t('userActionDialogs.activate.confirm', 'Activate')
    : t('userActionDialogs.deactivate.confirm', 'Deactivate');

  const cardContent = (
    <div
      ref={dialogRef}
      className="user-dialog-card"
      data-node-id="20:1327"
      role="dialog"
      aria-modal={!isStaticPreview}
      aria-labelledby="deactivate-dialog-title"
      aria-describedby="deactivate-dialog-desc"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Icon Badge */}
      <div
        className={`user-dialog-badge ${isReactivating ? 'activate' : 'deactivate'}`}
        data-node-id="20:1330"
      >
        {isReactivating ? (
          <UserCheck size={22} />
        ) : iconDeactivateBadge ? (
          <img
            src={iconDeactivateBadge}
            alt=""
            className="user-dialog-badge-img"
            data-node-id="20:1332"
          />
        ) : (
          <UserX size={20} />
        )}
      </div>

      {/* Dialog Title */}
      <h2 id="deactivate-dialog-title" className="user-dialog-title" data-node-id="20:1334">
        {title}
      </h2>

      {/* Dialog Description */}
      <p id="deactivate-dialog-desc" className="user-dialog-desc" data-node-id="20:1336">
        {description}
      </p>

      {/* Action Buttons */}
      <div className="user-dialog-actions" data-node-id="20:1338">
        <button
          type="button"
          className="user-dialog-btn-cancel"
          onClick={onClose}
          disabled={isLoading}
          data-node-id="20:1339"
        >
          {t('userActionDialogs.deactivate.cancel', 'Cancel')}
        </button>

        <button
          ref={confirmBtnRef}
          type="button"
          className={isReactivating ? 'user-dialog-btn-activate' : 'user-dialog-btn-deactivate'}
          onClick={onConfirm}
          disabled={isLoading}
          data-node-id="20:1341"
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

export default DeactivateUserDialog;
