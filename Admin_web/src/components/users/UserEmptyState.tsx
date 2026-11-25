import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import emptyIllustration from '../../assets/users/empty-users-illustration.png';

export interface UserEmptyStateProps {
  title?: string;
  description?: string;
  onClearFilters?: () => void;
  onAddNewUser?: () => void;
  className?: string;
  isCompact?: boolean;
}

export const UserEmptyState: React.FC<UserEmptyStateProps> = ({
  title,
  description,
  onClearFilters,
  onAddNewUser,
  className = '',
  isCompact = false,
}) => {
  const { t } = useTranslation();

  const resolvedTitle = title || t('createUser.emptyState.title');
  const resolvedDesc = description || t('createUser.emptyState.description');

  return (
    <div
      className={`user-empty-state-card ${isCompact ? 'compact' : ''} ${className}`.trim()}
      data-node-id="20:1201"
      role="region"
      aria-label="Empty State"
    >
      <div className="user-empty-illustration-wrapper" data-node-id="20:1215">
        <img
          src={emptyIllustration}
          alt=""
          className="user-empty-illustration"
          data-node-id="20:1216"
        />
      </div>

      <h2 className="user-empty-title" data-node-id="20:1204">
        {resolvedTitle}
      </h2>

      <p className="user-empty-desc" data-node-id="20:1206">
        {resolvedDesc}
      </p>

      <div className="user-empty-actions" data-node-id="20:1207">
        {onClearFilters && (
          <button
            type="button"
            className="user-empty-clear-btn"
            onClick={onClearFilters}
            data-node-id="20:1208"
          >
            {t('createUser.emptyState.clearFilters')}
          </button>
        )}

        {onAddNewUser && (
          <button
            type="button"
            className="user-empty-add-btn"
            onClick={onAddNewUser}
            data-node-id="20:1210"
          >
            <Plus size={15} />
            <span>{t('createUser.emptyState.addNewUser')}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default UserEmptyState;
