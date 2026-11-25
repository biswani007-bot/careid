import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Search,
  Bell,
  Settings,
  HelpCircle,
  FileText,
} from 'lucide-react';
import AdminProfileAvatar from './AdminProfileAvatar';

export interface AdminHeaderProps {
  onOpenDrawer?: () => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onNavigate?: (path: string) => void;
  showUploadRecord?: boolean;
  onUploadRecord?: () => void;
  actionButton?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    className?: string;
  } | null;
  breadcrumbTitle?: string;
  hasUnreadNotifications?: boolean;
  className?: string;
}

/**
 * Shared CareID Admin Portal Top Navigation Bar Header Component
 * Figma Alignment: Frame 20:16181 / Header Node 20:16802 & Node 20:153
 *
 * Implements:
 * 1. Perfectly aligned flex layout across right-side action controls.
 * 2. Upload Record primary button with sufficient padding, no text clipping, and whitespace-nowrap.
 * 3. Consistent vertical divider with balanced spacing on both sides.
 * 4. Fully visible circular profile avatar with Admin User and Super Admin details.
 * 5. Responsive compact layout for smaller viewports preventing any horizontal overflow.
 */
export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onOpenDrawer,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  onNavigate,
  showUploadRecord = true,
  onUploadRecord,
  actionButton,
  breadcrumbTitle,
  hasUnreadNotifications = true,
  className = '',
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const handleUploadClick = () => {
    if (onUploadRecord) {
      onUploadRecord();
    } else {
      handleNav('/admin/records/upload');
    }
  };

  return (
    <header className={`careid-top-navbar ${className}`} role="banner">
      {/* 1. Left Cluster: Mobile Drawer Menu Toggle + Breadcrumbs */}
      <div className="careid-header-left">
        {onOpenDrawer && (
          <button
            type="button"
            className="careid-mobile-toggle-btn md:hidden"
            onClick={onOpenDrawer}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="hidden sm:flex items-center gap-2 text-sm font-semibold select-none">
          <span className="text-[#494552]">/</span>
          <span className="text-[#0b1c30] font-bold">
            {breadcrumbTitle || t('common.adminPortal', 'Admin Portal')}
          </span>
        </div>
      </div>

      {/* 2. Center Search: Responsive Input */}
      <div className="careid-header-center-search">
        <Search size={16} className="careid-header-search-icon" aria-hidden="true" />
        <input
          type="text"
          placeholder={
            searchPlaceholder ||
            t('header.searchPlaceholder', 'Search facilities, patients, logs...')
          }
          value={searchValue !== undefined ? searchValue : undefined}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          className="careid-header-search-input"
          aria-label="Search"
        />
      </div>

      {/* 3. Right Cluster: Notifications, Settings, Help, Upload Action, Divider, Profile */}
      <div className="careid-header-right">
        {/* Notifications Icon Button */}
        <button
          type="button"
          className="careid-header-icon-btn"
          onClick={() => handleNav('/admin/notifications')}
          aria-label={t('header.notifications', 'Notifications')}
          title={t('header.notifications', 'Notifications')}
        >
          <Bell size={18} />
          {hasUnreadNotifications && (
            <span
              className="careid-header-notification-badge"
              aria-label="Unread notifications"
            />
          )}
        </button>

        {/* Settings Icon Button */}
        <button
          type="button"
          className="careid-header-icon-btn hidden sm:inline-flex"
          onClick={() => handleNav('/admin/settings/general')}
          aria-label={t('header.settings', 'Settings')}
          title={t('header.settings', 'Settings')}
        >
          <Settings size={18} />
        </button>

        {/* Support & Help Icon Button */}
        <button
          type="button"
          className="careid-header-icon-btn hidden sm:inline-flex"
          onClick={() => handleNav('/admin/notifications')}
          aria-label={t('header.help', 'Help & Documentation')}
          title={t('header.help', 'Help & Documentation')}
        >
          <HelpCircle size={18} />
        </button>

        {/* Custom Action Button (if provided) */}
        {actionButton && (
          <button
            type="button"
            className={actionButton.className || 'careid-header-action-btn hidden sm:inline-flex'}
            onClick={actionButton.onClick}
          >
            {actionButton.icon}
            <span className="whitespace-nowrap">{actionButton.label}</span>
          </button>
        )}

        {/* Upload Record Button (Figma purple action button) */}
        {!actionButton && showUploadRecord && (
          <button
            type="button"
            className="careid-header-action-btn hidden sm:inline-flex"
            onClick={handleUploadClick}
            title={t('header.uploadRecord', 'Upload Record')}
          >
            <FileText size={15} className="shrink-0" />
            <span className="whitespace-nowrap">{t('header.uploadRecord', 'Upload Record')}</span>
          </button>
        )}

        {/* Vertical Divider with balanced spacing */}
        <div className="careid-header-divider hidden sm:block" aria-hidden="true" />

        {/* Profile User Section with fully visible avatar and info */}
        <div
          className="careid-header-profile-wrap"
          onClick={() => handleNav('/admin/profile')}
          title={t('header.profileTitle', 'My Profile & Information')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleNav('/admin/profile');
            }
          }}
        >
          <div className="careid-header-profile-avatar-box">
            <AdminProfileAvatar size={34} alt="Admin User" />
          </div>
          <div className="careid-header-profile-info hidden sm:flex">
            <span className="careid-header-profile-name">
              {t('common.adminUser', 'Admin User')}
            </span>
            <span className="careid-header-profile-role">
              {t('common.superAdmin', 'Super Admin')}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;

