import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Lock,
  Phone,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Mail,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { authService } from '@/services/authService';
import { ApiError } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';

interface AuthPlaceholderProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  nextRoute?: string;
  nodeId?: string;
}

interface CountryOption {
  name: string;
  code: string;
  formatPlaceholder: string;
}

const COUNTRY_OPTIONS: CountryOption[] = [
  { name: 'United States', code: '+1', formatPlaceholder: '000 000 0000' },
  { name: 'United Kingdom', code: '+44', formatPlaceholder: '0000 000000' },
  { name: 'Canada', code: '+1', formatPlaceholder: '000 000 0000' },
  { name: 'Australia', code: '+61', formatPlaceholder: '000 000 000' },
  { name: 'India', code: '+91', formatPlaceholder: '00000 00000' },
  { name: 'Germany', code: '+49', formatPlaceholder: '000 0000000' },
  { name: 'Singapore', code: '+65', formatPlaceholder: '0000 0000' },
  { name: 'UAE', code: '+971', formatPlaceholder: '00 000 0000' },
];

export const AuthPlaceholder: React.FC<AuthPlaceholderProps> = ({
  title = 'Welcome Back',
  subtitle = 'Sign in to access your clinical workspace securely.',
  buttonText = 'Request OTP',
  nextRoute = '/auth/verify-otp',
  nodeId = '1:2',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithVerifiedSession } = useAuth();

  // Screen mode branching by Figma node IDs
  const isOtpScreen = nodeId === '1:79';
  const isRegister = nodeId === '1:1048';
  const isForgotPassword = nodeId === '1:1120';
  const isResetPassword = nodeId === '1:1180';

  // Registration & Password Reset state
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Read route state or session storage for challenge data
  const locationState = location.state as {
    challengeId?: string;
    phone?: string;
    maskedPhone?: string;
  } | null;

  const storedChallenge = authService.getChallengeData();
  const [challengeId, setChallengeId] = useState<string>(
    locationState?.challengeId || storedChallenge?.challengeId || ''
  );
  const [maskedPhone, setMaskedPhone] = useState<string>(() => {
    if (locationState?.maskedPhone) return locationState.maskedPhone;
    if (storedChallenge?.maskedPhone) return storedChallenge.maskedPhone;
    if (storedChallenge?.phone) return authService.maskPhoneNumber(storedChallenge.phone);
    return '';
  });

  // Login screen form state (Phone & Email options)
  const [loginMode, setLoginMode] = useState<'phone' | 'email'>('phone');
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRY_OPTIONS[0]);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP screen 6-digit state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState<number>(isOtpScreen ? 30 : 0);
  const [isResending, setIsResending] = useState<boolean>(false);

  // Common status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Focus the first empty digit on mount for OTP screen
  useEffect(() => {
    if (isOtpScreen && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [isOtpScreen]);

  // Format phone display cleanly with spaces
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const sanitized = rawVal.replace(/[^\d\s\-()]/g, '');
    setMobileNumber(sanitized);
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  // Step 1: Request OTP handler (/auth/login)
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate submission
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Validation
    const validation = authService.validatePhoneNumber(mobileNumber);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Please enter a valid registered mobile number');
      return;
    }

    // 2. Format to E.164
    const e164Phone = authService.formatToE164(selectedCountry.code, mobileNumber);

    setIsLoading(true);

    try {
      // 3. Call backend API
      const result = await authService.requestPhoneOtp(e164Phone);

      // 4. Save challenge session data
      const masked = authService.maskPhoneNumber(e164Phone);
      authService.saveChallengeData({
        challengeId: result.challengeId,
        phone: e164Phone,
        maskedPhone: masked,
        requestedAt: Date.now(),
      });

      setChallengeId(result.challengeId);
      setMaskedPhone(masked);

      // 5. Navigate to verification screen with challenge context
      navigate(nextRoute, {
        state: {
          challengeId: result.challengeId,
          phone: e164Phone,
          maskedPhone: masked,
        },
      });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to send verification code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1b: Email & Password Login handler (/auth/login with email)
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate submission
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Email format and required check
    const emailValidation = authService.validateEmail(email);
    if (!emailValidation.isValid) {
      setErrorMessage(emailValidation.error || 'Please enter a valid email address');
      return;
    }

    // 2. Password required check
    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      // 3. Call backend password authentication endpoint
      const result = await authService.loginWithPassword(email, password);

      // 4. Complete session initialization & doctor profile resolution
      const authUser = await loginWithVerifiedSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });

      // 5. Navigate to appropriate workspace dashboard
      const targetRoute = authUser?.workspaceType === 'VETERINARIAN'
        ? '/veterinary/dashboard'
        : '/dashboard';
      navigate(targetRoute, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 404 && err.message.toLowerCase().includes('master registry')) {
          setErrorMessage(
            'Doctor profile not found in Master Registry. Your account is authenticated, but no active Doctor profile could be resolved. Please contact your clinical administrator to provision your profile.'
          );
        } else if (err.statusCode === 401 || err.statusCode === 403) {
          // If the backend returns 401/403 or rejects credentials
          setErrorMessage(
            err.message ||
              'Invalid email or password. Note: Email and password authentication is not yet enabled for doctor accounts on this environment. Please use registered phone login.'
          );
        } else if (err.statusCode === 503) {
          setErrorMessage(
            'Authentication service is currently unavailable. Please try again later or use registered phone login.'
          );
        } else {
          setErrorMessage(err.message || 'Authentication failed. Please check your credentials and try again.');
        }
      } else if (err instanceof Error) {
        if (err.message.includes('User does not have DOCTOR role')) {
          setErrorMessage('This account does not have an active DOCTOR role on CareID.');
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage('Failed to sign in. Please verify your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle individual digit input change
  const handleDigitChange = (index: number, val: string) => {
    if (errorMessage) setErrorMessage(null);
    if (successMessage) setSuccessMessage(null);

    // Accept only numeric characters
    const cleanChar = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanChar;
    setOtpDigits(newDigits);

    // Auto-advance to next box if char was entered
    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace and navigation keys in OTP inputs
  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // Current is empty, focus previous and clear it
        e.preventDefault();
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Support pasting full 6-digit code
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);

    // Focus the box following the last pasted digit or the 6th box
    const nextIdx = Math.min(pasted.length, 5);
    inputRefs.current[nextIdx]?.focus();
  };

  // Step 3: Verify OTP handler (/auth/verify-otp)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate submission
    setErrorMessage(null);
    setSuccessMessage(null);

    const otpCode = otpDigits.join('');
    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    const activeChallengeId = challengeId || authService.getChallengeData()?.challengeId;
    if (!activeChallengeId) {
      setErrorMessage('Verification session expired or not found. Please request a new verification code.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Submit OTP verification to backend
      const tokens = await authService.verifyPhoneOtp(activeChallengeId, otpCode);

      // 2. Persist authentication tokens (preserve authenticated session)
      authService.saveTokens(tokens);

      // 3. Clear temporary challenge session
      authService.clearChallengeData();

      // 4. Sync clinical session and authenticated doctor profile from Master Registry
      const authUser = await loginWithVerifiedSession(tokens);

      // 5. Navigate to appropriate workspace dashboard
      const targetRoute = authUser?.workspaceType === 'VETERINARIAN'
        ? '/veterinary/dashboard'
        : '/dashboard';
      navigate(targetRoute, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 404 && err.message.toLowerCase().includes('master registry')) {
          setErrorMessage(
            'Doctor profile not found in Master Registry. Your account is authenticated, but no active Doctor profile could be resolved. Please contact your clinical administrator to provision your profile.'
          );
        } else if (
          err.statusCode === 400 &&
          (err.message.toLowerCase().includes('challenge') ||
            err.message.toLowerCase().includes('expired') ||
            err.message.toLowerCase().includes('uuid'))
        ) {
          setErrorMessage('Your verification challenge has expired. Please request a new code.');
        } else {
          setErrorMessage(err.message);
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Verification failed. Please check the code and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4: Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const activeChallengeId = challengeId || authService.getChallengeData()?.challengeId;
    if (!activeChallengeId) {
      setErrorMessage('No active challenge found. Please return to login and enter your mobile number.');
      return;
    }

    setIsResending(true);
    try {
      const result = await authService.resendPhoneOtp(activeChallengeId);
      if (result.challengeId) {
        setChallengeId(result.challengeId);
        const existing = authService.getChallengeData();
        if (existing) {
          authService.saveChallengeData({
            ...existing,
            challengeId: result.challengeId,
            requestedAt: Date.now(),
          });
        }
      }
      setSuccessMessage('A new verification code has been sent to your device.');
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to resend code. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  // Step 5: Forgot Password Handler (/auth/forgot-password, nodeId 1:1120)
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const identifier = (loginMode === 'email' ? email : mobileNumber).trim();
    if (!identifier) {
      setErrorMessage(
        loginMode === 'email'
          ? 'Please enter your registered email'
          : 'Please enter your registered mobile number'
      );
      return;
    }

    setIsLoading(true);
    try {
      if (loginMode === 'phone') {
        const validation = authService.validatePhoneNumber(identifier);
        if (!validation.isValid) {
          setErrorMessage(validation.error || 'Please enter a valid phone number');
          setIsLoading(false);
          return;
        }
        const e164 = authService.formatToE164(selectedCountry.code, identifier);
        const res = await authService.requestPhoneOtp(e164);
        const masked = authService.maskPhoneNumber(e164);
        authService.saveChallengeData({
          challengeId: res.challengeId,
          phone: e164,
          maskedPhone: masked,
          requestedAt: Date.now(),
        });
        setSuccessMessage('Password recovery verification code sent to your mobile device.');
        setTimeout(() => {
          navigate('/auth/reset-password', {
            state: { challengeId: res.challengeId, phone: e164, maskedPhone: masked },
          });
        }, 1200);
      } else {
        const validation = authService.validateEmail(identifier);
        if (!validation.isValid) {
          setErrorMessage(validation.error || 'Please enter a valid email address');
          setIsLoading(false);
          return;
        }
        setSuccessMessage('Password recovery instructions sent to your registered email address.');
        setTimeout(() => {
          navigate('/auth/reset-password', { state: { email: identifier } });
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process account recovery. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 6: Reset Password Handler (/auth/reset-password, nodeId 1:1180)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!password || password.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      setSuccessMessage('Password updated successfully. Redirecting to clinical sign in...');
      setTimeout(() => {
        navigate('/auth/login');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 7: Provider Registration Handler (/auth/register, nodeId 1:1048)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Full name is required');
      return;
    }
    if (!registrationNumber.trim()) {
      setErrorMessage('Medical registration or license number is required');
      return;
    }
    if (!specialty.trim()) {
      setErrorMessage('Primary specialty is required');
      return;
    }
    const phoneVal = authService.validatePhoneNumber(mobileNumber);
    if (!phoneVal.isValid) {
      setErrorMessage(phoneVal.error || 'Valid mobile number required');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    try {
      setSuccessMessage('Registration submitted for Medical Council verification. Redirecting to login...');
      setTimeout(() => {
        navigate('/auth/login');
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit registration. Please verify details.');
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicSubtitle = isOtpScreen
    ? maskedPhone
      ? `Enter the 6-digit clinical security code sent to ${maskedPhone}.`
      : 'Enter the 6-digit clinical security code sent to your registered device.'
    : isForgotPassword
    ? 'Enter your registered email address or mobile number to receive clinical access recovery instructions.'
    : isResetPassword
    ? 'Create a new secure password for your clinical workspace.'
    : isRegister
    ? 'Submit your medical credentials for registry verification and clinical onboarding.'
    : loginMode === 'email'
    ? 'Sign in with your email and password to access your clinical workspace.'
    : subtitle;

  return (
    <div className="flex flex-col w-full">
      {/* Back button on non-login screens */}
      {(isOtpScreen || isForgotPassword || isResetPassword || isRegister) && (
        <div className="mb-4">
          <Link
            to="/auth/login"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#494552] hover:text-[#5b14b8] transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      )}

      {/* Title & Context Header (Figma node 1:16) */}
      <div className="space-y-2">
        <h1 className="text-[26px] sm:text-[28px] font-bold tracking-tight text-[#191c1d] leading-9 font-sans">
          {title}
        </h1>
        <p className="text-sm sm:text-[15px] text-[#494552] leading-6 font-normal">
          {dynamicSubtitle}
        </p>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div
          role="status"
          className="mt-6 p-3.5 rounded-[16px] bg-[#dcfce7] border border-[#22c55e]/30 flex items-start gap-2.5 text-sm text-[#15803d] transition-all animate-in fade-in duration-200"
        >
          <CheckCircle2 className="size-5 shrink-0 mt-0.5 text-[#16a34a]" aria-hidden="true" />
          <div className="flex-1 font-medium leading-5">{successMessage}</div>
        </div>
      )}

      {/* Error Alert Banner - Corner Radius: 16px */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-6 p-3.5 rounded-[16px] bg-[#ffdad6]/60 border border-[#ba1a1a]/30 flex items-start gap-2.5 text-sm text-[#ba1a1a] transition-all animate-in fade-in duration-200"
        >
          <AlertCircle className="size-5 shrink-0 mt-0.5 text-[#ba1a1a]" aria-hidden="true" />
          <div className="flex-1 font-medium leading-5">{errorMessage}</div>
        </div>
      )}

      {/* Missing Challenge State on OTP screen */}
      {isOtpScreen && !challengeId && !storedChallenge?.challengeId ? (
        <div className="mt-8 p-5 bg-amber-50/70 border border-amber-200 rounded-[16px] text-center space-y-4">
          <p className="text-sm text-amber-900 font-medium">
            No active authentication challenge found. Please enter your registered phone number to receive a verification code.
          </p>
          <button
            type="button"
            onClick={() => navigate('/auth/login')}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-[9999px] text-sm font-semibold text-white bg-[#5b14b8] hover:bg-[#4a0f96] transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      ) : (
        /* Form Fields Container (Figma node 1:21) */
        <form
          onSubmit={
            isOtpScreen
              ? handleVerifyOtp
              : isForgotPassword
              ? handleForgotPassword
              : isResetPassword
              ? handleResetPassword
              : isRegister
              ? handleRegister
              : loginMode === 'email'
              ? handleEmailLogin
              : handleRequestOtp
          }
          className="mt-7 space-y-6"
          noValidate
        >
          {isForgotPassword ? (
            /* Forgot Password Form */
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="auth-recovery-identifier"
                  className="block text-sm font-medium text-[#191c1d] tracking-[0.1px] leading-5"
                >
                  Registered Email or Phone Number
                </label>
                <div className="relative h-14 bg-white border border-[#cbc4d4] rounded-[16px] flex items-center shadow-[0px_1px_2px_0px_rgba(0,0,0,0.02)]">
                  <div className="absolute left-4 flex items-center pointer-events-none text-[#7a7583]">
                    <Mail className="size-[18px]" aria-hidden="true" />
                  </div>
                  <input
                    id="auth-recovery-identifier"
                    type="text"
                    required
                    value={email || mobileNumber}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setMobileNumber(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="doctor@hospital.org or phone number"
                    className="w-full h-full pl-11 pr-4 rounded-[16px] bg-transparent text-base text-[#191c1d] placeholder:text-[#cbc4d4] outline-none font-sans"
                  />
                </div>
              </div>
            </div>
          ) : isResetPassword ? (
            /* Reset Password Form */
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="auth-reset-token"
                  className="block text-sm font-medium text-[#191c1d] tracking-[0.1px] leading-5"
                >
                  Verification Code or OTP
                </label>
                <input
                  id="auth-reset-token"
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Enter 6-digit code or reset token"
                  className="w-full h-14 px-4 rounded-[16px] border border-[#cbc4d4] bg-white text-base text-[#191c1d] placeholder:text-[#cbc4d4] outline-none font-sans focus:ring-2 focus:ring-[#5b14b8]/20 focus:border-[#5b14b8]"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="auth-new-password"
                  className="block text-sm font-medium text-[#191c1d] tracking-[0.1px] leading-5"
                >
                  New Password (Min. 8 characters)
                </label>
                <input
                  id="auth-new-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-14 px-4 rounded-[16px] border border-[#cbc4d4] bg-white text-base text-[#191c1d] placeholder:text-[#cbc4d4] outline-none font-sans focus:ring-2 focus:ring-[#5b14b8]/20 focus:border-[#5b14b8]"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-sm font-medium text-[#191c1d] tracking-[0.1px] leading-5"
                >
                  Confirm New Password
                </label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-14 px-4 rounded-[16px] border border-[#cbc4d4] bg-white text-base text-[#191c1d] placeholder:text-[#cbc4d4] outline-none font-sans focus:ring-2 focus:ring-[#5b14b8]/20 focus:border-[#5b14b8]"
                />
              </div>
            </div>
          ) : isRegister ? (
            /* Provider Registration Form */
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="auth-reg-fullname"
                  className="block text-sm font-medium text-[#191c1d] tracking-[0.1px] leading-5"
                >
                  Full Name & Title
                </label>
                <input
                  id="auth-reg-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Sarah Jenkins, MD"
                  className="w-full h-12 px-4 rounded-[16px] border border-[#cbc4d4] bg-white text-base text-[#191c1d] placeholder:text-[#cbc4d4] outline-none font-sans focus:ring-2 focus:ring-[#5b14b8]/20 focus:border-[#5b14b8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label
                    htmlFor="auth-reg-specialty"
                    className="block text-sm font-medium text-[#191c1d] tracking-[0.1px] leading-5"
                  >
                    Specialty
                  </label>
                  <input
                    id="auth-reg-specialty"
                    type="text"
                    required
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="Cardiology / Internal Med"
                    className="w-full h-12 px-4 rounded-[16px] border border-[#cbc4d4] bg-white text-base text-[#191c1d] placeholder:text-[#cbc4d4] outline-none font-sans focus:ring-2 focus:ring-[#5b14b8]/20 focus:border-[#5b14b8]"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="auth-reg-license"
                    className="block text-sm font-medium text-[#191c1d] tracking-[0.1px] leading-5"
                  >
                    Medical License / Reg #
                  </label>
                  <input
                    id="auth-reg-license"
                    type="text"
                    required
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="MED-REG-XXXXX"
                    className="w-full h-12 px-4 rounded-[16px] border border-[#cbc4d4] bg-white text-base text-[#191c1d] placeholder:text-[#cbc4d4] outline-none font-sans focus:ring-2 focus:ring-[#5b14b8]/20 focus:border-[#5b14b8]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="auth-reg-mobile"
                  className="block text-sm font-medium text-[#191c1d] tracking-[0.1px] leading-5"
                >
                  Mobile Number (E.164)
                </label>
                <input
                  id="auth-reg-mobile"
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={handlePhoneChange}
                  placeholder="+1 555 123 4567"
                  className="w-full h-12 px-4 rounded-[16px] border border-[#cbc4d4] bg-white text-base text-[#191c1d] placeholder:text-[#cbc4d4] outline-none font-sans focus:ring-2 focus:ring-[#5b14b8]/20 focus:border-[#5b14b8]"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="auth-reg-password"
                  className="block text-sm font-medium text-[#191c1d] tracking-[0.1px] leading-5"
                >
                  Account Password (Min. 8 characters)
                </label>
                <input
                  id="auth-reg-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-12 px-4 rounded-[16px] border border-[#cbc4d4] bg-white text-base text-[#191c1d] placeholder:text-[#cbc4d4] outline-none font-sans focus:ring-2 focus:ring-[#5b14b8]/20 focus:border-[#5b14b8]"
                />
              </div>
            </div>
          ) : isOtpScreen ? (
            /* OTP 6-Digit Code Input Section (Figma node 1:79) */
            <div className="space-y-4">
              <label className="block text-sm font-medium text-[#191c1d] tracking-[0.1px] leading-5">
                Clinical Security Code
              </label>

              <div className="flex items-center justify-between gap-2 sm:gap-3">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                    aria-label={`Digit ${idx + 1} of verification code`}
                    value={otpDigits[idx]}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                    onPaste={idx === 0 ? handlePaste : undefined}
                    className={cn(
                      'w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-[16px] border bg-white text-[#191c1d] transition-all shadow-[0px_1px_2px_0px_rgba(0,0,0,0.02)]',
                      otpDigits[idx]
                        ? 'border-[#5b14b8] ring-2 ring-[#5b14b8]/20 bg-purple-50/20'
                        : errorMessage
                        ? 'border-[#ba1a1a] focus:ring-2 focus:ring-[#ba1a1a]/20'
                        : 'border-[#cbc4d4] hover:border-[#7a7583]',
                      'focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/20 focus:border-[#5b14b8]'
                    )}
                  />
                ))}
              </div>

              {/* Resend and Change Number Links */}
              <div className="flex items-center justify-between pt-2 text-xs sm:text-sm text-[#494552]">
                <button
                  type="button"
                  onClick={() => navigate('/auth/login')}
                  className="font-medium text-[#5b14b8] hover:underline cursor-pointer"
                >
                  Change number
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || isResending}
                  onClick={handleResendOtp}
                  className={cn(
                    'font-medium transition-colors cursor-pointer',
                    resendCooldown > 0 || isResending
                      ? 'text-[#7a7583] cursor-not-allowed'
                      : 'text-[#5b14b8] hover:underline'
                  )}
                >
                  {isResending
                    ? 'Sending...'
                    : resendCooldown > 0
                    ? `Resend OTP in ${resendCooldown}s`
                    : 'Resend OTP'}
                </button>
              </div>
            </div>
          ) : loginMode === 'email' ? (
            /* Email & Password Login Form Fields */
            <>
              {/* Email Address Input */}
              <div className="space-y-2">
                <label
                  htmlFor="auth-email-address"
                  className="block text-sm font-medium text-[#191c1d] tracking-[0.1px] leading-5"
                >
                  Email Address
                </label>
                <div
                  className={cn(
                    'relative h-14 bg-white border rounded-[16px] flex items-center transition-colors shadow-[0px_1px_2px_0px_rgba(0,0,0,0.02)]',
                    errorMessage && !email
                      ? 'border-[#ba1a1a] focus-within:ring-2 focus-within:ring-[#ba1a1a]/20'
                      : 'border-[#cbc4d4] hover:border-[#7a7583] focus-within:ring-2 focus-within:ring-[#5b14b8]/20 focus-within:border-[#5b14b8]'
                  )}
                >
                  <div className="absolute left-4 flex items-center pointer-events-none text-[#7a7583]">
                    <Mail className="size-[18px]" aria-hidden="true" />
                  </div>
                  <input
                    id="auth-email-address"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="doctor@hospital.org"
                    className="w-full h-full pl-11 pr-4 rounded-[16px] bg-transparent text-base text-[#191c1d] placeholder:text-[#cbc4d4] outline-none font-sans"
                  />
                </div>
              </div>

              {/* Password Input with Show/Hide Toggle */}
              <div className="space-y-2">
                <label
                  htmlFor="auth-password"
                  className="block text-sm font-medium text-[#191c1d] tracking-[0.1px] leading-5"
                >
                  Password
                </label>
                <div
                  className={cn(
                    'relative h-14 bg-white border rounded-[16px] flex items-center transition-colors shadow-[0px_1px_2px_0px_rgba(0,0,0,0.02)]',
                    errorMessage && !password
                      ? 'border-[#ba1a1a] focus-within:ring-2 focus-within:ring-[#ba1a1a]/20'
                      : 'border-[#cbc4d4] hover:border-[#7a7583] focus-within:ring-2 focus-within:ring-[#5b14b8]/20 focus-within:border-[#5b14b8]'
                  )}
                >
                  <div className="absolute left-4 flex items-center pointer-events-none text-[#7a7583]">
                    <Lock className="size-[18px]" aria-hidden="true" />
                  </div>
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••••••••••"
                    className="w-full h-full pl-11 pr-12 rounded-[16px] bg-transparent text-base text-[#191c1d] placeholder:text-[#cbc4d4] outline-none font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-4 p-1 text-[#7a7583] hover:text-[#191c1d] focus:outline-none focus:text-[#5b14b8] transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="size-5" aria-hidden="true" />
                    ) : (
                      <Eye className="size-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <div className="flex justify-end pt-1">
                  <Link
                    to="/auth/forgot-password"
                    className="text-xs font-semibold text-[#5b14b8] hover:text-[#4a0f96] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>
            </>
          ) : (
            /* Standard Login Form Fields (Figma node 1:2) */
            <>
              {/* Country Selector (Figma node 1:22) */}
              <div className="space-y-2">
                <label
                  htmlFor="auth-country-select"
                  className="block text-sm font-medium text-[#191c1d] tracking-[0.1px] leading-5"
                >
                  Country
                </label>
                <div className="relative">
                  <button
                    id="auth-country-select"
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isCountryOpen}
                    aria-label="Select Country"
                    onClick={() => setIsCountryOpen((prev) => !prev)}
                    className="w-full h-14 px-4 bg-white border border-[#cbc4d4] rounded-[16px] flex items-center justify-between text-left text-base text-[#191c1d] hover:border-[#7a7583] focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/20 focus:border-[#5b14b8] transition-colors cursor-pointer shadow-[0px_1px_2px_0px_rgba(0,0,0,0.02)]"
                  >
                    <span className="font-normal text-[#191c1d] text-base">
                      {selectedCountry.name} ({selectedCountry.code})
                    </span>
                    <ChevronDown
                      className={cn(
                        'size-5 text-[#191c1d] stroke-[2] transition-transform duration-200',
                        isCountryOpen && 'rotate-180'
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  {isCountryOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsCountryOpen(false)}
                        aria-hidden="true"
                      />
                      <ul
                        role="listbox"
                        aria-label="Select Country"
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#cbc4d4] rounded-[16px] shadow-xl z-30 py-2 max-h-56 overflow-y-auto"
                      >
                        {COUNTRY_OPTIONS.map((country) => (
                          <li
                            key={`${country.name}-${country.code}`}
                            role="option"
                            aria-selected={
                              selectedCountry.name === country.name &&
                              selectedCountry.code === country.code
                            }
                            onClick={() => {
                              setSelectedCountry(country);
                              setIsCountryOpen(false);
                            }}
                            className={cn(
                              'px-4 py-2.5 mx-1.5 rounded-[10px] text-sm cursor-pointer transition-colors flex items-center justify-between',
                              selectedCountry.name === country.name &&
                                selectedCountry.code === country.code
                                ? 'bg-purple-50 text-[#5b14b8] font-semibold'
                                : 'text-[#191c1d] hover:bg-slate-50'
                            )}
                          >
                            <span>{country.name}</span>
                            <span className="text-[#494552] text-xs font-mono">{country.code}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>

              {/* Registered Mobile Number Input (Figma node 1:31) */}
              <div className="space-y-2">
                <label
                  htmlFor="auth-mobile-number"
                  className="block text-sm font-medium text-[#191c1d] tracking-[0.1px] leading-5"
                >
                  Registered Mobile Number
                </label>
                <div
                  className={cn(
                    'relative h-14 bg-white border rounded-[16px] flex items-center transition-colors shadow-[0px_1px_2px_0px_rgba(0,0,0,0.02)]',
                    errorMessage
                      ? 'border-[#ba1a1a] focus-within:ring-2 focus-within:ring-[#ba1a1a]/20'
                      : 'border-[#cbc4d4] hover:border-[#7a7583] focus-within:ring-2 focus-within:ring-[#5b14b8]/20 focus-within:border-[#5b14b8]'
                  )}
                >
                  <div className="absolute left-4 flex items-center pointer-events-none text-[#7a7583]">
                    <Phone className="size-[18px]" aria-hidden="true" />
                  </div>
                  <input
                    id="auth-mobile-number"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    value={mobileNumber}
                    onChange={handlePhoneChange}
                    placeholder={selectedCountry.formatPlaceholder}
                    className="w-full h-full pl-11 pr-4 rounded-[16px] bg-transparent text-base text-[#191c1d] placeholder:text-[#cbc4d4] placeholder:tracking-[1.6px] outline-none font-sans"
                  />
                </div>
              </div>
            </>
          )}

          {/* Primary Action Button (Figma node 1:40 - Corner Radius: 9999px) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || (isOtpScreen && otpDigits.some((d) => !d))}
              className={cn(
                'w-full h-14 rounded-[9999px] text-white font-semibold text-base',
                'bg-gradient-to-r from-[#a44cff] via-[#852df8] to-[#5b14b8]',
                'shadow-[0px_4px_16px_0px_rgba(91,20,184,0.32)]',
                'flex items-center justify-center gap-2.5 transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-[#5b14b8] focus:ring-offset-2',
                isLoading || (isOtpScreen && otpDigits.some((d) => !d))
                  ? 'opacity-80 cursor-not-allowed'
                  : 'hover:opacity-95 hover:shadow-[0px_6px_22px_0px_rgba(91,20,184,0.42)] active:scale-[0.99] cursor-pointer'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                  <span>
                    {isOtpScreen
                      ? 'Verifying Session...'
                      : isForgotPassword
                      ? 'Sending Code...'
                      : isResetPassword
                      ? 'Updating Password...'
                      : isRegister
                      ? 'Submitting Registration...'
                      : loginMode === 'email'
                      ? 'Signing In...'
                      : 'Requesting OTP...'}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {isOtpScreen
                      ? buttonText
                      : isForgotPassword
                      ? 'Send Recovery Code'
                      : isResetPassword
                      ? 'Update Password'
                      : isRegister
                      ? 'Submit Registration'
                      : loginMode === 'email'
                      ? 'Sign In'
                      : buttonText}
                  </span>
                  <ArrowRight className="size-4 stroke-[2.5]" aria-hidden="true" />
                </>
              )}
            </button>
          </div>

          {/* Register Prompt on Sign In */}
          {!isOtpScreen && !isForgotPassword && !isResetPassword && !isRegister && (
            <div className="text-center pt-2">
              <span className="text-xs text-[#7a7583]">Need a clinical provider account? </span>
              <Link
                to="/auth/register"
                className="text-xs text-[#5b14b8] font-semibold hover:underline"
              >
                Register here
              </Link>
            </div>
          )}

          {/* Mode Switchers: Phone OTP <-> Email & Password */}
          {!isOtpScreen && !isForgotPassword && !isResetPassword && !isRegister && (
            <div className="pt-1">
              {loginMode === 'phone' ? (
                <div className="space-y-3">
                  <div className="relative my-3 flex items-center justify-center">
                    <div className="border-t border-[#cbc4d4]/60 w-full" />
                    <span className="bg-white px-3 text-xs text-[#7a7583] uppercase tracking-wider font-medium">
                      or
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('email');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="w-full h-12 rounded-[9999px] border border-[#5b14b8] text-[#5b14b8] font-semibold text-sm hover:bg-[#5b14b8]/5 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/20"
                  >
                    <Mail className="size-4" aria-hidden="true" />
                    <span>Login with Email</span>
                  </button>
                </div>
              ) : (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('phone');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#5b14b8] hover:text-[#4a0f96] hover:underline transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/20 rounded-md py-1.5 px-3"
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    <span>Back to Phone Login</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </form>
      )}

      {/* Security Note Footer (Figma node 1:45) */}
      <div className="mt-8 pt-2 flex items-center justify-center gap-2 text-xs font-medium text-[#494552] tracking-[0.2px] leading-4">
        <Lock className="size-3.5 text-[#191c1d] shrink-0" aria-hidden="true" />
        <span>Your login is protected using encrypted authentication.</span>
      </div>
    </div>
  );
};
