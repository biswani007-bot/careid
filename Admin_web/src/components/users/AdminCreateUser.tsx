import React, { useState, useId } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Menu,
  X,
  ChevronDown,
  RefreshCw,
  Search,
} from 'lucide-react';

// Styling
import '../dashboard/AdminDashboard.css';
import './AdminCreateUser.css';

// Authentic Assets
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import headerBellIcon from '../../assets/users/header-bell.svg';
import breadcrumbChevron from '../../assets/users/breadcrumb-chevron.svg';
import iconSaveUser from '../../assets/users/icon-save-user.svg';
import iconInputEmail from '../../assets/users/icon-input-email.svg';
import iconInputPhone from '../../assets/users/icon-input-phone.svg';
import iconInputLock from '../../assets/users/icon-input-lock.svg';

import AdminSidebar from '../common/AdminSidebar';

// Reusable Empty State
import UserEmptyState from './UserEmptyState';

// TanStack Query & Service
import { useCreateUserMutation } from '../../services/userService';

// Zod Validation Schema
const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Full Name is required (minimum 2 characters)'),
  email: z.string().trim().email('Valid email address is required'),
  phone: z.string().trim().min(8, 'Phone number is required (e.g. +16505550099)'),
  role: z.string().min(1, 'Please select a system role'),
  password: z.string().min(6, 'Password is required (minimum 6 characters)'),
  status: z.boolean().optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let generated = 'H3alth!';
  for (let i = 0; i < 4; i++) {
    generated += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return generated;
}

export interface AdminCreateUserProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
  showEmptyState?: boolean;
}

export const AdminCreateUser: React.FC<AdminCreateUserProps> = ({
  onNavigate,
  onLogout,
  showEmptyState,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAlternativeEmptyView = showEmptyState ?? (searchParams.get('view') === 'empty');

  // Search and Accessibility IDs
  const searchInputId = useId();
  const nameInputId = useId();
  const emailInputId = useId();
  const phoneInputId = useId();
  const roleSelectId = useId();
  const passwordInputId = useId();

  // Navigation & Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ title: string; message: string } | null>(null);

  // TanStack Query Mutation
  const createUserMutation = useCreateUserMutation();

  // Form State
  const [accountStatus, setAccountStatus] = useState(true);

  // React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'STAFF',
      password: 'H3alth!2024',
      status: true,
    },
  });

  const handleNav = (path: string) => {
    setIsDrawerOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  // Secure Password Generator
  const generateNewPassword = () => {
    const generated = generateRandomPassword();
    setValue('password', generated, { shouldValidate: true });
    setFeedbackToast({
      title: 'Password Generated',
      message: `Temporary password updated to "${generated}".`,
    });
  };

  const onSubmit = async (formData: CreateUserFormData) => {
    try {
      await createUserMutation.mutateAsync({
        fullName: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        role: formData.role,
        password: formData.password,
        status: accountStatus ? 'ACTIVE' : 'INACTIVE',
      });
      setFeedbackToast({
        title: 'User Created Successfully',
        message: `Account for ${formData.name} (${formData.email}) has been provisioned. Redirecting to User Directory...`,
      });
      setTimeout(() => {
        handleNav('/admin/users');
      }, 1000);
    } catch (err: any) {
      setFeedbackToast({
        title: 'User Creation Failed',
        message: err?.message || 'Failed to create user on backend. Please verify inputs and permissions.',
      });
    }
  };

  return (
    <div className="careid-dashboard-shell">
      {/* ====================================================================
          SIDEBAR NAVIGATION (Fixed shell component)
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

      {/* Mobile Drawer Backdrop */}
      {isDrawerOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ====================================================================
          MAIN CONTENT WRAPPER
          ==================================================================== */}
      <div className="create-user-main" data-node-id="20:1093">
        {/* Top App Bar Header */}
        <header className="create-user-header" data-node-id="20:1094">
          <div className="create-user-header-left">
            <button
              type="button"
              className="create-user-hamburger"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation drawer"
            >
              <Menu size={22} />
            </button>

            {/* Top Search Pill */}
            <div className="create-user-search-pill" data-node-id="20:1095">
              <span className="create-user-search-icon" data-node-id="20:1101">
                <Search size={18} />
              </span>
              <input
                id={searchInputId}
                type="text"
                className="create-user-search-input"
                placeholder={t('createUser.searchPlaceholder')}
                data-node-id="20:1097"
                aria-label="Search"
              />
            </div>
          </div>

          {/* Top Header Right Actions */}
          <div className="create-user-header-right" data-node-id="20:1102">
            <button
              type="button"
              className="create-user-icon-btn"
              data-node-id="20:1103"
              aria-label="Notifications"
            >
              <img src={headerBellIcon} alt="" />
              <span className="create-user-header-badge" data-node-id="20:1106" />
            </button>

            <button
              type="button"
              className="create-user-header-link"
              data-node-id="20:1107"
              onClick={() =>
                setFeedbackToast({
                  title: 'Support Desk',
                  message: 'CareID administrative support desk.',
                })
              }
            >
              Support
            </button>

            <div className="create-user-header-divider" data-node-id="20:1110" />

            <button
              type="button"
              className="create-user-header-console"
              data-node-id="20:1111"
              onClick={() => handleNav('/admin/dashboard')}
            >
              Admin Console
            </button>

            <div
              className="create-user-header-avatar cursor-pointer flex items-center justify-center"
              onClick={() => handleNav('/admin/profile')}
              title="My Profile & Information"
              role="button"
              tabIndex={0}
              data-node-id="20:1114"
            >
              <AdminProfileAvatar size={32} />
            </div>
          </div>
        </header>

        {/* Page Content Canvas */}
        <main className="create-user-container" data-node-id="20:1115">
          {/* Breadcrumbs */}
          <nav className="create-user-breadcrumbs" data-node-id="20:1117" aria-label="Breadcrumbs">
            <button
              type="button"
              className="create-user-breadcrumb-link"
              data-node-id="20:1118"
              onClick={() => handleNav('/admin/users')}
            >
              {t('users.title')}
            </button>
            <span className="create-user-breadcrumb-sep" data-node-id="20:1120">
              <img src={breadcrumbChevron} alt="" />
            </span>
            <span className="create-user-breadcrumb-current" data-node-id="20:1122">
              {isAlternativeEmptyView ? t('createUser.alternativeView') : t('createUser.breadcrumb')}
            </span>
          </nav>

          {/* Page Header */}
          <div className="create-user-header-block" data-node-id="20:1124">
            <h1 className="create-user-heading" data-node-id="20:1125">
              {isAlternativeEmptyView ? t('createUser.emptyState.title') : t('createUser.title')}
            </h1>
            <p className="create-user-subtitle" data-node-id="20:1127">
              {isAlternativeEmptyView ? t('createUser.emptyState.description') : t('createUser.subtitle')}
            </p>
          </div>

          {isAlternativeEmptyView ? (
            /* Empty State Card Demonstration (Rendered ONLY when empty view is requested) */
            <UserEmptyState
              title={t('createUser.emptyState.title')}
              description={t('createUser.emptyState.description')}
              onClearFilters={() => {
                setFeedbackToast({
                  title: 'Filters Cleared',
                  message: 'All search queries and filter criteria have been reset.',
                });
              }}
              onAddNewUser={() => {
                handleNav('/admin/users/create');
              }}
            />
          ) : (
            /* ====================================================================
                CREATE NEW USER FORM CARD (Node 20:1129)
                ==================================================================== */
            <section className="create-user-card" data-node-id="20:1129">
            {/* Backend Provisioning Guidance */}
            <div className="create-user-policy-banner">
              <div className="create-user-policy-title">
                Platform Identity Provisioning
              </div>
              <div className="create-user-policy-text">
                User accounts provisioned here gain immediate access to CareID authentication services. Specialized clinical and patient accounts can also be created via dedicated workflows:
              </div>
              <div className="create-user-policy-actions">
                <button
                  type="button"
                  className="create-user-policy-btn"
                  onClick={() => handleNav('/admin/doctors/create')}
                >
                  Add Doctor Profile &rarr;
                </button>
                <button
                  type="button"
                  className="create-user-policy-btn"
                  onClick={() => handleNav('/admin/patients/create')}
                >
                  Register Patient &rarr;
                </button>
                <button
                  type="button"
                  className="create-user-policy-btn"
                  onClick={() => handleNav('/admin/facilities')}
                >
                  Facility Staff Mapping &rarr;
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="create-user-form-grid" data-node-id="20:1130">
                {/* Full Name * (Span 2) */}
                <div className="create-user-field create-user-span-2" data-node-id="20:1131">
                  <label htmlFor={nameInputId} className="create-user-label" data-node-id="20:1132">
                    {t('createUser.fullName')}
                    <span className="create-user-required-star">*</span>
                  </label>
                  <div className="create-user-input-wrap">
                    <input
                      id={nameInputId}
                      type="text"
                      className={`create-user-input ${errors.name ? 'is-error' : ''}`}
                      placeholder={t('createUser.fullNamePlaceholder')}
                      data-node-id="20:1134"
                      {...register('name')}
                    />
                  </div>
                  {errors.name && (
                    <p className="create-user-error-text">{errors.name.message}</p>
                  )}
                </div>

                {/* Email Address * (Column 1) */}
                <div className="create-user-field" data-node-id="20:1137">
                  <label htmlFor={emailInputId} className="create-user-label" data-node-id="20:1138">
                    {t('createUser.email')}
                    <span className="create-user-required-star">*</span>
                  </label>
                  <div className="create-user-input-wrap" data-node-id="20:1140">
                    <span className="create-user-input-icon" data-node-id="20:1144">
                      <img src={iconInputEmail} alt="" />
                    </span>
                    <input
                      id={emailInputId}
                      type="email"
                      className={`create-user-input has-icon ${errors.email ? 'is-error' : ''}`}
                      placeholder={t('createUser.emailPlaceholder')}
                      data-node-id="20:1141"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="create-user-error-text">{errors.email.message}</p>
                  )}
                </div>

                {/* Mobile Number * (Column 2) */}
                <div className="create-user-field" data-node-id="20:1146">
                  <label htmlFor={phoneInputId} className="create-user-label" data-node-id="20:1147">
                    {t('createUser.mobile')}
                    <span className="create-user-required-star">*</span>
                  </label>
                  <div className="create-user-input-wrap" data-node-id="20:1149">
                    <span className="create-user-input-icon" data-node-id="20:1153">
                      <img src={iconInputPhone} alt="" />
                    </span>
                    <input
                      id={phoneInputId}
                      type="tel"
                      className={`create-user-input has-icon ${errors.phone ? 'is-error' : ''}`}
                      placeholder={t('createUser.mobilePlaceholder')}
                      data-node-id="20:1150"
                      {...register('phone')}
                    />
                  </div>
                  {errors.phone && (
                    <p className="create-user-error-text">{errors.phone.message}</p>
                  )}
                </div>

                {/* System Role * (Column 1) */}
                <div className="create-user-field" data-node-id="20:1155">
                  <label htmlFor={roleSelectId} className="create-user-label" data-node-id="20:1156">
                    {t('createUser.role')}
                    <span className="create-user-required-star">*</span>
                  </label>
                  <div className="create-user-select-wrap" data-node-id="20:1158">
                    <select
                      id={roleSelectId}
                      className={`create-user-select ${errors.role ? 'is-error' : ''}`}
                      data-node-id="20:1159"
                      {...register('role')}
                    >
                      <option value="STAFF">Staff (FACILITY STAFF)</option>
                      <option value="DOCTOR">Doctor (PHYSICIAN)</option>
                      <option value="PATIENT">Patient (HEALTHVAULT HOLDER)</option>
                      <option value="ADMIN">Administrator (SYSTEM ADMIN)</option>
                      <option value="FACILITY_ADMIN">Facility Admin</option>
                      <option value="SUPER_ADMIN">Super Administrator</option>
                    </select>
                    <span className="create-user-select-arrow" data-node-id="20:1165">
                      <ChevronDown size={18} />
                    </span>
                  </div>
                  {errors.role && (
                    <p className="create-user-error-text">{errors.role.message}</p>
                  )}
                </div>

                {/* Temporary Password with Generator (Column 2) */}
                <div className="create-user-field" data-node-id="20:1167">
                  <label htmlFor={passwordInputId} className="create-user-label" data-node-id="20:1168">
                    {t('createUser.temporaryPassword')}
                    <span className="create-user-required-star">*</span>
                  </label>
                  <div className="create-user-pwd-group" data-node-id="20:1170">
                    <div className="create-user-input-wrap" data-node-id="20:1171">
                      <span className="create-user-input-icon" data-node-id="20:1175">
                        <img src={iconInputLock} alt="" />
                      </span>
                      <input
                        id={passwordInputId}
                        type="text"
                        className={`create-user-input has-icon ${errors.password ? 'is-error' : ''}`}
                        placeholder="H3alth!2024"
                        data-node-id="20:1172"
                        {...register('password')}
                      />
                    </div>
                    <button
                      type="button"
                      className="create-user-generate-btn"
                      onClick={generateNewPassword}
                      title={t('createUser.generatePassword')}
                      aria-label={t('createUser.generatePassword')}
                      data-node-id="20:1177"
                    >
                      <RefreshCw size={17} />
                    </button>
                  </div>
                  {errors.password && (
                    <p className="create-user-error-text">{errors.password.message}</p>
                  )}
                </div>

                {/* Account Status Toggle (Span 2) */}
                <div className="create-user-span-2" data-node-id="20:1180">
                  <div className="create-user-toggle-section" data-node-id="20:1181">
                    <div className="create-user-toggle-info" data-node-id="20:1182">
                      <h3 className="create-user-toggle-title" data-node-id="20:1183">
                        {t('createUser.accountStatus')}
                      </h3>
                      <p className="create-user-toggle-sub" data-node-id="20:1185">
                        {t('createUser.accountStatusSubtitle')}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={accountStatus}
                      className={`create-user-switch ${accountStatus ? 'is-active' : ''}`}
                      onClick={() => setAccountStatus(!accountStatus)}
                      data-node-id="20:1187"
                      aria-label="Toggle user active status immediately"
                    >
                      <span className="create-user-switch-thumb" data-node-id="20:1188" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="create-user-actions-bottom" data-node-id="20:1189">
                <button
                  type="button"
                  className="create-user-cancel-btn"
                  onClick={() => handleNav('/admin/users')}
                  data-node-id="20:1190"
                >
                  {t('createUser.cancel')}
                </button>

                <button
                  type="submit"
                  className="create-user-save-btn"
                  disabled={isSubmitting || createUserMutation.isPending}
                  data-node-id="20:1192"
                >
                  <img src={iconSaveUser} alt="" data-node-id="20:1194" />
                  <span>
                    {isSubmitting || createUserMutation.isPending
                      ? t('createUser.saving')
                      : t('createUser.saveUser')}
                  </span>
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
      </div>

      {/* Interactive Toast Notification */}
      {feedbackToast && (
        <div className="user-details-toast" role="status" aria-live="polite">
          <div>
            <p className="user-details-toast-title">{feedbackToast.title}</p>
            <p className="user-details-toast-msg">{feedbackToast.message}</p>
          </div>
          <button
            type="button"
            className="user-details-toast-btn"
            onClick={() => setFeedbackToast(null)}
            aria-label="Close notification"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ab8efd',
              cursor: 'pointer',
              marginLeft: '8px',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminCreateUser;
