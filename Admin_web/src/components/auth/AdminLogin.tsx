import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Phone, KeyRound, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
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
  const navigate = useNavigate();
  const { login, requestOtp, loginWithOtp } = useAuth();
  const { logoUrl } = useBranding();
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  // OTP Login State
  const [phone, setPhone] = useState('+16505550001');
  const [otpCode, setOtpCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [rememberMeOtp, setRememberMeOtp] = useState(true);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'superadmin@careid.test',
      password: '',
      rememberMe: true,
    },
  });

  const isPending = isSubmitting;

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    setStatusNotice(null);

    const result = await login({
      email: data.email,
      password: data.password,
      rememberMe: data.rememberMe,
    });

    if (result.success) {
      setStatusNotice(t('auth.validationPassed'));
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } else {
      // Map error code to translated user-friendly message
      if (result.statusCode === 401) {
        setErrorMessage(t('auth.invalidCredentials'));
      } else if (result.statusCode === 403) {
        setErrorMessage(t('auth.forbiddenAccess'));
      } else if (result.statusCode === 404) {
        setErrorMessage(result.error || t('auth.endpointUnavailable'));
      } else if (result.statusCode === 400) {
        setErrorMessage(result.error || t('auth.validationFailed'));
      } else if (result.statusCode === 0) {
        setErrorMessage(t('auth.networkError'));
      } else {
        setErrorMessage(result.error || t('auth.unexpectedError'));
      }
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !phone.trim()) {
      setErrorMessage('Please enter a valid mobile phone number.');
      return;
    }

    setErrorMessage(null);
    setStatusNotice(null);
    setIsSendingOtp(true);

    try {
      const res = await requestOtp(phone.trim());
      if (res.success && res.challengeId) {
        setChallengeId(res.challengeId);
        setCountdown(res.resendAfter || 60);
        setStatusNotice(res.message || t('auth.otpSentNotice', 'A 6-digit verification code has been sent to your mobile phone.'));
      } else {
        setErrorMessage(res.error || 'Failed to send OTP. Please check the phone number.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error sending OTP code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeId) {
      setErrorMessage('Please request an OTP code before verifying.');
      return;
    }
    if (!otpCode || otpCode.trim().length < 6) {
      setErrorMessage('Please enter the 6-digit OTP verification code.');
      return;
    }

    setErrorMessage(null);
    setStatusNotice(null);
    setIsVerifyingOtp(true);

    try {
      const result = await loginWithOtp(challengeId, otpCode.trim(), rememberMeOtp);
      if (result.success) {
        setStatusNotice(t('auth.validationPassed'));
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        setErrorMessage(result.error || 'Invalid or expired OTP code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setModalMessage(
      'Self-service password recovery is managed through your organization identity provider (Okta/Azure AD) or system SuperAdmin.'
    );
  };

  const handleSupportLink = (e: React.MouseEvent, type: 'privacy' | 'terms' | 'support') => {
    e.preventDefault();
    if (type === 'privacy') {
      navigate('/admin/legal/privacy-policy');
    } else if (type === 'terms') {
      navigate('/admin/legal/terms-conditions');
    } else {
      setModalMessage('Administrative support desk: contact superadmin@careid.com or reach out to internal IT ops.');
    }
  };

  return (
    <main className="admin-login-page" data-node-id="20:56" aria-label="CareID Admin Portal Login">
      {/* 20:57: Main Login Card */}
      <div className="login-card" data-node-id="20:57">
        {/* 20:58: Card Header */}
        <header className="login-header" data-node-id="20:58">
          <div className="login-logo-container" data-node-id="20:59">
            <img
              src={logoUrl || logoImg}
              alt={t('auth.title')}
              className="login-logo"
              id="careid-login-logo"
              data-node-id="20:60"
              onError={(e) => {
                if (e.currentTarget.src !== logoImg) {
                  e.currentTarget.src = logoImg;
                }
              }}
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
          {/* Method Selector Tabs (PRD Section 4.4.1) */}
          <div className="login-tab-bar" role="tablist" aria-label="Login Authentication Methods">
            <button
              type="button"
              role="tab"
              aria-selected={loginMode === 'password'}
              className={`login-tab-pill ${loginMode === 'password' ? 'active' : ''}`}
              onClick={() => {
                setLoginMode('password');
                setErrorMessage(null);
                setStatusNotice(null);
              }}
            >
              {t('auth.loginMethodEmail', 'Email & Password')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={loginMode === 'otp'}
              className={`login-tab-pill ${loginMode === 'otp' ? 'active' : ''}`}
              onClick={() => {
                setLoginMode('otp');
                setErrorMessage(null);
                setStatusNotice(null);
              }}
            >
              {t('auth.loginMethodOtp', 'Mobile Number & OTP')}
            </button>
          </div>

          {/* Global Alert Banners */}
          {errorMessage && (
            <div className="auth-error-banner" role="alert" aria-live="assertive">
              <span aria-hidden="true">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {statusNotice && (
            <div className="auth-notice-banner" role="status" aria-live="polite">
              <span>ℹ️</span>
              <span>{statusNotice}</span>
            </div>
          )}

          {loginMode === 'password' ? (
            <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate data-node-id="20:64">
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
                    disabled={isPending}
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
                    disabled={isPending}
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
                  disabled={isPending}
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
                disabled={isPending}
                data-node-id="20:95"
              >
                {isPending ? (
                  <>
                    <span className="btn-spinner" aria-hidden="true" />
                    <span>{t('auth.signingIn')}</span>
                  </>
                ) : (
                  <span data-node-id="20:96">{t('auth.signIn')}</span>
                )}
              </button>
            </form>
          ) : (
            /* Mobile Phone Number & OTP Verification Flow */
            <form className="login-form otp-login-form" onSubmit={challengeId ? handleVerifyOtp : handleSendOtp} noValidate>
              <div className="form-group">
                <label htmlFor="admin-phone" className="form-label">
                  {t('auth.phoneLabel', 'Mobile Phone Number')}
                </label>
                <div className="input-wrapper">
                  <span className="input-icon-left" aria-hidden="true">
                    <Phone size={18} className="text-[#64748B]" />
                  </span>
                  <input
                    id="admin-phone"
                    type="tel"
                    autoComplete="tel"
                    disabled={isSendingOtp || isVerifyingOtp || countdown > 0}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-field"
                    placeholder="+1 650 555 0001"
                  />
                  <button
                    type="button"
                    className="send-otp-btn"
                    disabled={isSendingOtp || isVerifyingOtp || !phone.trim() || countdown > 0}
                    onClick={handleSendOtp}
                  >
                    {isSendingOtp ? (
                      <span className="btn-spinner-sm" aria-hidden="true" />
                    ) : countdown > 0 ? (
                      <span>{countdown}s</span>
                    ) : (
                      <span>{challengeId ? t('auth.resendOtp', 'Resend') : t('auth.sendOtp', 'Send OTP')}</span>
                    )}
                  </button>
                </div>
                <p className="field-hint-text">
                  Registered administrator mobile number (+1 650 555 0001 for test superadmin)
                </p>
              </div>

              {challengeId && (
                <div className="form-group">
                  <label htmlFor="admin-otp-code" className="form-label">
                    {t('auth.otpCodeLabel', '6-Digit Verification Code')}
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon-left" aria-hidden="true">
                      <KeyRound size={18} className="text-[#64748B]" />
                    </span>
                    <input
                      id="admin-otp-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoComplete="one-time-code"
                      disabled={isVerifyingOtp}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="input-field otp-code-input"
                      placeholder="123456"
                    />
                  </div>
                </div>
              )}

              <div className="remember-me-row">
                <input
                  id="remember-me-otp"
                  type="checkbox"
                  disabled={isVerifyingOtp}
                  className="remember-checkbox"
                  checked={rememberMeOtp}
                  onChange={(e) => setRememberMeOtp(e.target.checked)}
                />
                <label htmlFor="remember-me-otp" className="remember-label">
                  {t('auth.rememberMe')}
                </label>
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={isVerifyingOtp || isSendingOtp || (challengeId ? otpCode.length < 6 : !phone.trim())}
              >
                {isVerifyingOtp ? (
                  <>
                    <span className="btn-spinner" aria-hidden="true" />
                    <span>{t('auth.verifyingOtp', 'Verifying Code...')}</span>
                  </>
                ) : !challengeId ? (
                  <span>{t('auth.sendOtp', 'Send OTP Code')}</span>
                ) : (
                  <>
                    <span>{t('auth.verifyAndSignIn', 'Verify & Sign In')}</span>
                    <ArrowRight size={16} className="ml-2 inline" />
                  </>
                )}
              </button>
            </form>
          )}
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
          onClick={(e) => handleSupportLink(e, 'privacy')}
          data-node-id="20:105"
        >
          {t('auth.privacyPolicy')}
        </button>
        <button
          type="button"
          className="support-link"
          onClick={(e) => handleSupportLink(e, 'terms')}
          data-node-id="20:107"
        >
          {t('auth.termsOfService')}
        </button>
        <button
          type="button"
          className="support-link"
          onClick={(e) => handleSupportLink(e, 'support')}
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
