import React, { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Search,
  UserX,
  KeyRound,
  Sparkles,
} from 'lucide-react';

// Styling
import '../dashboard/AdminDashboard.css';
import './AdminCreateUser.css';
import './UserActionDialogs.css';

// Authentic Assets
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import headerBellIcon from '../../assets/users/header-bell.svg';
import breadcrumbChevron from '../../assets/users/breadcrumb-chevron.svg';

import AdminSidebar from '../common/AdminSidebar';

// Dialog Components
import DeactivateUserDialog from './DeactivateUserDialog';
import ResetPasswordDialog from './ResetPasswordDialog';
import ActionSuccessSnackbar from './ActionSuccessSnackbar';

export interface AdminUserActionDialogsProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminUserActionDialogs: React.FC<AdminUserActionDialogsProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchInputId = useId();

  // Navigation & Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Live Modal States for interactive demo
  const [activeModal, setActiveModal] = useState<'none' | 'deactivate' | 'activate' | 'reset'>('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(
    'User password has been reset successfully.'
  );

  const handleNav = (path: string) => {
    setIsDrawerOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const handleConfirmDeactivate = async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsProcessing(false);
    setActiveModal('none');
    setSnackbarMessage(
      t('userActionDialogs.snackbar.deactivateSuccess', { name: 'Sarah Jenkins' })
    );
  };

  const handleConfirmReset = async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsProcessing(false);
    setActiveModal('none');
    setSnackbarMessage(
      t('userActionDialogs.snackbar.passwordResetSuccess', 'User password has been reset successfully.')
    );
  };

  return (
    <div className="careid-dashboard-shell" data-node-id="20:1284">
      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="careid-drawer-backdrop show"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ====================================================================
          PERSISTENT FIXED SIDEBAR (Standard Admin Shell)
          ==================================================================== */}
      <AdminSidebar
        activeNav="users"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
        ctaLabel="+ New Record"
        onCtaClick={() => handleNav('/admin/records/upload')}
      />

      {/* ====================================================================
          MAIN CONTENT WRAPPER
          ==================================================================== */}
      <div className="careid-main-wrapper" data-node-id="20:1309">
        {/* Top Navigation Bar (Header) */}
        <header className="careid-top-navbar" data-node-id="20:1310">
          <div className="header-left-cluster">
            <button
              type="button"
              className="header-menu-toggle create-user-mobile-menu-btn"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>

            {/* Header Search Input */}
            <div className="create-user-header-search" data-node-id="20:1371">
              <Search size={16} className="create-user-header-search-icon" />
              <input
                id={searchInputId}
                type="text"
                placeholder={t('createUser.searchPlaceholder')}
                className="create-user-header-search-input"
                aria-label="Search patients, doctors, or ID"
              />
            </div>
          </div>

          <div className="users-header-actions" data-node-id="20:1313">
            <button
              type="button"
              className="users-header-icon-btn"
              aria-label="Notifications"
            >
              <img src={headerBellIcon} alt="Notifications" />
              <span className="users-header-badge" />
            </button>

            <button
              type="button"
              className="users-header-support-btn"
              onClick={() => handleNav('/admin/users')}
            >
              {t('users.support')}
            </button>

            <button
              type="button"
              className="users-header-console-btn"
              onClick={() => handleNav('/admin/dashboard')}
            >
              {t('users.adminConsole')}
            </button>

            <div
              className="users-header-avatar cursor-pointer flex items-center justify-center"
              onClick={() => handleNav('/admin/profile')}
              title="My Profile & Information"
              role="button"
              tabIndex={0}
              data-node-id="20:1318"
            >
              <AdminProfileAvatar size={32} />
            </div>
          </div>
        </header>

        {/* Scrollable Canvas */}
        <main className="user-dialogs-screen-canvas" data-node-id="20:1319">
          {/* Breadcrumbs & Title */}
          <div className="create-user-breadcrumbs" data-node-id="20:520">
            <button
              type="button"
              className="create-user-crumb-link"
              onClick={() => handleNav('/admin/users')}
            >
              {t('users.title')}
            </button>
            <span className="create-user-crumb-sep">
              <img src={breadcrumbChevron} alt=">" />
            </span>
            <span className="create-user-crumb-active">
              {t('userActionDialogs.screen.heading', 'User Action Dialogs')}
            </span>
          </div>

          <div className="user-dialogs-screen-header">
            <h1 className="user-dialogs-screen-title">
              {t('userActionDialogs.screen.heading', 'User Action Dialogs')}
            </h1>
            <p className="user-dialogs-screen-subtitle">
              {t('userActionDialogs.screen.subtitle', 'Interactive modals for user suspension, access revocation, and credential reset flows.')}
            </p>
          </div>

          {/* ====================================================================
              FIGMA FRAME 20:1284 SHOWCASE CONTAINER
              Demonstrates the side-by-side Figma frame with blurred context
              ==================================================================== */}
          <div className="user-dialogs-showcase" data-node-id="20:1285">
            {/* Blurred Background Table Context */}
            <div className="user-dialogs-blurred-bg" aria-hidden="true" />

            {/* Side-by-side Dialog Grid matching Figma 20:1284 */}
            <div className="user-dialogs-grid" data-node-id="20:1326">
              {/* Deactivate User Dialog (Node 20:1327) */}
              <DeactivateUserDialog
                isOpen={true}
                isStaticPreview={true}
                userName="Sarah Jenkins"
                onClose={() => {}}
                onConfirm={() => {
                  setSnackbarMessage(
                    t('userActionDialogs.snackbar.deactivateSuccess', { name: 'Sarah Jenkins' })
                  );
                }}
              />

              {/* Reset Password Dialog (Node 20:1343) */}
              <ResetPasswordDialog
                isOpen={true}
                isStaticPreview={true}
                userEmail="sarah.j@clinic.com"
                onClose={() => {}}
                onConfirm={() => {
                  setSnackbarMessage(
                    t('userActionDialogs.snackbar.passwordResetSuccess', 'User password has been reset successfully.')
                  );
                }}
              />
            </div>
          </div>

          {/* Interactive Trigger Controls */}
          <div className="user-dialogs-toolbar">
            <button
              type="button"
              className="user-dialogs-toolbar-btn danger"
              onClick={() => setActiveModal('deactivate')}
            >
              <UserX size={16} />
              <span>{t('userActionDialogs.screen.openDeactivate', 'Preview Deactivate Dialog')}</span>
            </button>

            <button
              type="button"
              className="user-dialogs-toolbar-btn"
              onClick={() => setActiveModal('reset')}
            >
              <KeyRound size={16} />
              <span>{t('userActionDialogs.screen.openReset', 'Preview Reset Password Dialog')}</span>
            </button>

            <button
              type="button"
              className="user-dialogs-toolbar-btn primary"
              onClick={() => {
                setSnackbarMessage('User password has been reset successfully.');
              }}
            >
              <Sparkles size={16} />
              <span>{t('userActionDialogs.screen.showSnackbar', 'Trigger Success Snackbar')}</span>
            </button>
          </div>
        </main>
      </div>

      {/* ====================================================================
          LIVE INTERACTIVE MODALS
          ==================================================================== */}
      {activeModal === 'deactivate' && (
        <DeactivateUserDialog
          isOpen={true}
          userName="Sarah Jenkins"
          isLoading={isProcessing}
          onClose={() => setActiveModal('none')}
          onConfirm={handleConfirmDeactivate}
        />
      )}

      {activeModal === 'reset' && (
        <ResetPasswordDialog
          isOpen={true}
          userEmail="sarah.j@clinic.com"
          isLoading={isProcessing}
          onClose={() => setActiveModal('none')}
          onConfirm={handleConfirmReset}
        />
      )}

      {/* Success Snackbar (Node 20:1359) */}
      <ActionSuccessSnackbar
        isVisible={Boolean(snackbarMessage)}
        message={snackbarMessage || ''}
        onDismiss={() => setSnackbarMessage(null)}
      />
    </div>
  );
};

export default AdminUserActionDialogs;
