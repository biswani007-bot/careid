import React from 'react';
import { useTranslation } from 'react-i18next';
import navLogoutIcon from '../../assets/dashboard/nav-logout.svg';

export interface SidebarLogoutButtonProps {
  onLogout?: () => void;
  className?: string;
}

export const SidebarLogoutButton: React.FC<SidebarLogoutButtonProps> = ({
  onLogout,
  className = '',
}) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className={`sidebar-logout-btn ${className}`.trim()}
      onClick={onLogout}
      data-node-id="20:512"
      title="Log out of Admin Portal"
      aria-label={t('dashboard.nav.logout')}
    >
      <img src={navLogoutIcon} alt="" data-node-id="20:513" />
      <span data-node-id="20:515">{t('dashboard.nav.logout')}</span>
    </button>
  );
};

export default SidebarLogoutButton;
