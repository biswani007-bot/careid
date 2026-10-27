import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import './AdminLogin.css';

// Authentic assets imported directly from Figma frame 20:56
import logoImg from '../../assets/CareIDlogo.png';
import mailIcon from '../../assets/icon-mail.svg';
import lockIcon from '../../assets/icon-lock.svg';
import eyeIcon from '../../assets/icon-eye.svg';
import shieldIcon from '../../assets/icon-shield.svg';

export interface AdminLoginProps {
  onLoginSuccess?: () => void;
}

// Zod validation schema matching exact specification
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required.')
    .email('Please enter a valid email address.'),
  password: z
    .string()
    .min(1, 'Password is required.'),
  rememberMe: z.boolean().default(true),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@careid.com',
      password: '',
      rememberMe: true,
    },
  });

  const onSubmit = (_data: LoginFormData) => {
    setStatusNotice(null);
    setIsSubmittingManual(true);

    // Simulate authentic client-side submission and transition to Dashboard Overview
    setTimeout(() => {
      setIsSubmittingManual(false);
      setStatusNotice(t('auth.validationPassed'));
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    }, 600);
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setModalMessage(
      'Self-service password recovery is managed through your organization identity provider (Okta/Azure AD) or system SuperAdmin.'
    );
  };

  const handleSupportLink = (e: React.MouseEvent, title: string) => {
    e.preventDefault();
    setModalMessage(`${title} document viewer will be available once legal modules are connected.`);
  };

  return (
    <main className="admin-login-page" data-node-id="20:56" aria-label="CareID Admin Portal Login">
      {/* 20:57: Main Login Card */}
      <div className="login-card" data-node-id="20:57">
        {/* 20:58: Card Header */}
        <header className="login-header" data-node-id="20:58">
          <div className="login-logo-container" data-node-id="20:59">
            <img
              src={logoImg}
              alt={t('auth.title')}
              className="login-logo"
              data-node-id="20:60"
            />
          </div>
          <div data-node-id="20:61">
            <h1 className="login-subtitle" data-node-id="20:62">
              {t('auth.portalName')}
            </h1>
          </div>
        </header>

        {/* 20:63: Form Area */}
        <section className="login-form-area" data-node-id="20:63">
          <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate data-node-id="20:64">
            {/* Notification Banner when submitted */}
            {statusNotice && (
              <div className="auth-notice-banner" role="status" aria-live="polite">
                <span>ℹ️</span>
                <span>{statusNotice}</span>
              </div>
            )}

            {/* 20:65: Email Field */}
            <div className="form-group" data-node-id="20:65">
              <label htmlFor="admin-email" className="form-label" data-node-id="20:67">
                {t('auth.emailLabel')}
              </label>
              <div className="input-wrapper" data-node-id="20:68">
                <span className="input-icon-left" data-node-id="20:73" aria-hidden="true">
                  <img src={mailIcon} alt="" />
                </span>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  className={`input-field ${errors.email ? 'input-error' : ''}`}
                  placeholder={t('auth.emailPlaceholder')}
                  {...register('email')}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  data-node-id="20:69"
                />
              </div>
              {errors.email && (
                <p id="email-error" className="error-message" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* 20:75: Password Field */}
            <div className="form-group" data-node-id="20:75">
              <div className="form-label-row" data-node-id="20:76">
                <label htmlFor="admin-password" className="form-label" data-node-id="20:78">
                  {t('auth.passwordLabel')}
                </label>
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={handleForgotPassword}
                  data-node-id="20:80"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
              <div className="input-wrapper" data-node-id="20:81">
                <span className="input-icon-left" data-node-id="20:86" aria-hidden="true">
                  <img src={lockIcon} alt="" />
                </span>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`input-field input-field-password ${errors.password ? 'input-error' : ''}`}
                  placeholder={t('auth.passwordPlaceholder')}
                  {...register('password')}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  data-node-id="20:82"
                />
                <button
                  type="button"
                  className="input-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  data-node-id="20:88"
                >
                  <img src={eyeIcon} alt="" />
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="error-message" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* 20:91: Remember Me */}
            <div className="remember-me-row" data-node-id="20:91">
              <input
                id="remember-me-checkbox"
                type="checkbox"
                className="remember-checkbox"
                {...register('rememberMe')}
                data-node-id="20:92"
              />
              <label
                htmlFor="remember-me-checkbox"
                className="remember-label"
                data-node-id="20:94"
              >
                {t('auth.rememberMe')}
              </label>
            </div>

            {/* 20:95: Submit Button */}
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmittingManual}
              data-node-id="20:95"
            >
              {isSubmittingManual ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  <span>{t('auth.signingIn')}</span>
                </>
              ) : (
                <span data-node-id="20:96">{t('auth.signIn')}</span>
              )}
            </button>
          </form>
        </section>

        {/* 20:97: Footer / Notice */}
        <footer className="login-card-footer" data-node-id="20:97">
          <div className="security-badge" data-node-id="20:98">
            <img
              src={shieldIcon}
              alt=""
              className="security-icon"
              data-node-id="20:100"
              aria-hidden="true"
            />
            <span className="security-text" data-node-id="20:101">
              {t('auth.secureEnterprise')}
            </span>
          </div>
        </footer>
      </div>

      {/* 20:102: Support Links */}
      <nav
        className="support-links-container"
        data-node-id="20:103"
        aria-label="Support & Legal Links"
      >
        <button
          type="button"
          className="support-link"
          onClick={(e) => handleSupportLink(e, t('auth.privacyPolicy'))}
          data-node-id="20:105"
        >
          {t('auth.privacyPolicy')}
        </button>
        <button
          type="button"
          className="support-link"
          onClick={(e) => handleSupportLink(e, t('auth.termsOfService'))}
          data-node-id="20:107"
        >
          {t('auth.termsOfService')}
        </button>
        <button
          type="button"
          className="support-link"
          onClick={(e) => handleSupportLink(e, t('auth.adminSupport'))}
          data-node-id="20:109"
        >
          {t('auth.adminSupport')}
        </button>
      </nav>

      {/* Info Modal / Prompt */}
      {modalMessage && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '16px',
          }}
          onClick={() => setModalMessage(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '400px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#494552', marginBottom: '12px' }}>
              Notice
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '20px', marginBottom: '20px' }}>
              {modalMessage}
            </p>
            <button
              type="button"
              style={{
                padding: '8px 20px',
                borderRadius: '9999px',
                background: '#6C2BD9',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => setModalMessage(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default AdminLogin;
