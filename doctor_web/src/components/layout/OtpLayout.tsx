import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/apiClient';
import careidCardLogo from '@/assets/branding/careid-card-logo.png';
import careidSecurityShield from '@/assets/illustrations/careid-security-shield.png';

/**
 * OtpLayout - Authentic CareID Two-Factor Verification Screen
 * 
 * Source of Truth: Figma Canvas 0:1, Frame 1:79 ("Otp")
 * Frame Dimensions: 1280 × 1024 px
 */
export const OtpLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithVerifiedSession } = useAuth();

  // Retrieve challenge context from navigation state or sessionStorage
  const [challenge, setChallenge] = useState(() => {
    const stateData = location.state as { challengeId?: string; phone?: string; maskedPhone?: string } | null;
    if (stateData?.challengeId) {
      return {
        challengeId: stateData.challengeId,
        phone: stateData.phone || '',
        maskedPhone: stateData.maskedPhone || authService.maskPhoneNumber(stateData.phone || ''),
      };
    }
    const sessionData = authService.getChallengeData();
    if (sessionData?.challengeId) {
      return {
        challengeId: sessionData.challengeId,
        phone: sessionData.phone,
        maskedPhone: sessionData.maskedPhone,
      };
    }
    return null;
  });

  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState<number>(30);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Active countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleInputChange = (idx: number, value: string) => {
    const cleanDigit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otpValues];
    newOtp[idx] = cleanDigit;
    setOtpValues(newOtp);

    if (errorMessage) {
      setErrorMessage(null);
    }

    // Auto-advance focus to next input
    if (cleanDigit && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  // Support pasting full 6-digit OTP code (e.g. from SMS auto-fill or clipboard)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtpValues(newOtp);

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || isResending) return;

    if (!challenge?.challengeId) {
      setErrorMessage('No active challenge found. Please request a new code.');
      return;
    }

    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await authService.resendPhoneOtp(challenge.challengeId);
      // Update challenge if a new challengeId was issued
      if (result.challengeId && result.challengeId !== challenge.challengeId) {
        const updatedChallenge = {
          ...challenge,
          challengeId: result.challengeId,
        };
        setChallenge(updatedChallenge);
        authService.saveChallengeData({
          challengeId: result.challengeId,
          phone: challenge.phone,
          maskedPhone: challenge.maskedPhone,
          requestedAt: Date.now(),
        });
      }

      setCountdown(30);
      setSuccessMessage('A new verification code has been dispatched to your mobile number.');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to resend verification code. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const otpCode = otpValues.join('');
    if (otpCode.length < 6) {
      setErrorMessage('Please enter all 6 verification digits');
      return;
    }

    if (!challenge?.challengeId) {
      setErrorMessage('Session expired or invalid. Please start sign-in again.');
      return;
    }

    setIsVerifying(true);

    try {
      const tokens = await authService.verifyPhoneOtp(challenge.challengeId, otpCode);
      
      // Temporarily store tokens for immediate authenticated profile calls
      authService.saveTokens(tokens);

      // Verify user claims and DOCTOR role authorization
      const userMe = await authService.getAuthMe(tokens.accessToken);
      const isAuthorizedDoctor = userMe.roles?.some(
        (r) => r === 'DOCTOR' || r === 'ADMIN' || r === 'SUPER_ADMIN'
      );

      if (!isAuthorizedDoctor) {
        authService.clearSession();
        throw new Error(
          'Access restricted to authorized Doctor profiles. Your account does not have clinician privileges.'
        );
      }

      // Retrieve full Doctor profile from Master Registry
      const doctorMe = await authService.getDoctorMe(tokens.accessToken);

      // Establish verified clinician session in context
      loginWithVerifiedSession(tokens, userMe, doctorMe);
      authService.clearChallengeData();

      // Navigate to authenticated portal dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Verification failed. Please check the code and try again.');
      }
      // Reset inputs on failure and refocus first digit
      setOtpValues(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  }, [challenge, otpValues, loginWithVerifiedSession, navigate]);

  return (
    <div className="h-screen w-screen max-h-screen max-w-full overflow-hidden flex flex-col font-sans bg-[#f8f9fa] selection:bg-[#a44cff]/20 selection:text-[#28006d]">
      {/* Main Two-Column Layout (Figma Frame 1:79, 1280x1024) */}
      <div className="flex-1 flex flex-col lg:flex-row items-stretch justify-center w-full h-full min-h-0">
        
        {/* Left Column: Authentication Area (Figma node 1:80, 576x1024) */}
        <div
          className="w-full lg:w-[480px] xl:w-[576px] lg:shrink-0 flex flex-col justify-between items-center px-4 py-4 sm:px-8 sm:py-6 lg:px-10 lg:py-6 h-full min-h-0 overflow-y-auto lg:overflow-y-visible"
          style={{
            backgroundImage:
              'linear-gradient(125.99deg, #ffffff 0%, rgba(40, 0, 109, 0.05) 50%, rgba(0, 105, 113, 0.05) 100%)',
          }}
        >
          {/* Card Wrapper centered vertically with my-auto */}
          <div className="my-auto w-full max-w-[440px] xl:max-w-[480px] flex flex-col items-center">
            {/* Floating Verification Card - Corner Radius: 28-32px */}
            <div className="w-full bg-white rounded-[28px] sm:rounded-[32px] border border-[rgba(203,196,212,0.3)] shadow-[0px_8px_32px_0px_rgba(40,0,109,0.06),0px_1px_4px_0px_rgba(0,0,0,0.02)] p-5 sm:p-7 xl:p-9">
              {/* Embedded Logo inside Card (Figma node 1:83 / 1:153) */}
              <div className="flex justify-center h-9 sm:h-10 mb-4 sm:mb-5">
                <img
                  src={careidCardLogo}
                  alt="CareID"
                  className="h-9 sm:h-10 w-auto max-w-[220px] sm:max-w-[260px] object-contain select-none"
                />
              </div>

              {/* Title & Description (Figma node 1:84) */}
              <div className="text-center mb-4 sm:mb-5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#191c1d] leading-7 sm:leading-8 font-sans">
                  Verify Your Identity
                </h1>
                <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-[#494552] leading-5 max-w-[340px] mx-auto">
                  Enter the 6-digit verification code sent to your registered mobile number:
                </p>
                {challenge?.maskedPhone ? (
                  <p className="mt-1 sm:mt-1.5 text-sm sm:text-base font-bold text-[#191c1d] tracking-wide leading-6 font-mono">
                    {challenge.maskedPhone}
                  </p>
                ) : (
                  <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm font-medium text-[#7a7583]">
                    No registered mobile number linked
                  </p>
                )}
              </div>

              {/* Error Banner - Corner Radius: 14-16px */}
              {errorMessage && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mb-4 p-3 rounded-[14px] sm:rounded-[16px] bg-[#ffdad6]/60 border border-[#ba1a1a]/30 flex items-start gap-2.5 text-xs sm:text-sm text-[#ba1a1a] transition-all animate-in fade-in"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5 text-[#ba1a1a]" aria-hidden="true" />
                  <div className="flex-1 font-medium leading-5">{errorMessage}</div>
                </div>
              )}

              {/* Success Banner - Corner Radius: 14-16px */}
              {successMessage && (
                <div
                  role="status"
                  className="mb-4 p-3 rounded-[14px] sm:rounded-[16px] bg-teal-50 border border-teal-200 flex items-start gap-2.5 text-xs sm:text-sm text-[#006971] transition-all animate-in fade-in"
                >
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-[#006971]" aria-hidden="true" />
                  <div className="flex-1 font-medium leading-5">{successMessage}</div>
                </div>
              )}

              {/* Missing Challenge Warning */}
              {!challenge && (
                <div className="mb-4 p-3 rounded-[14px] sm:rounded-[16px] bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                  <span>No active session. Please start sign-in again.</span>
                  <Link to="/auth/login" className="font-semibold text-[#5b14b8] hover:underline flex items-center gap-1 shrink-0 ml-2">
                    <ArrowLeft className="size-3.5" /> Back to Login
                  </Link>
                </div>
              )}

              {/* OTP Input Form (Figma node 1:91) */}
              <form onSubmit={handleVerify} className="flex flex-col">
                {/* 6 Digit Inputs Container - Responsive Corner Radius: 12-16px per box */}
                <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 w-full">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <input
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      id={`otp-input-${idx}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={otpValues[idx]}
                      onChange={(e) => handleInputChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={idx === 0 ? handlePaste : undefined}
                      className="w-10 h-12 sm:w-12 sm:h-14 xl:w-13 xl:h-15 text-center text-xl sm:text-2xl font-bold rounded-[14px] sm:rounded-[16px] border border-[#cbc4d4] bg-white text-[#191c1d] focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/20 focus:border-[#5b14b8] transition-all"
                      aria-label={`Digit ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* Action Container: Button + Resend (Figma node 1:111) */}
                <div className="mt-5 sm:mt-6 flex flex-col">
                  {/* Action Button - Corner Radius: 9999px */}
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full h-11 sm:h-13 xl:h-14 rounded-[9999px] text-white font-semibold text-sm sm:text-base bg-gradient-to-r from-[#a44cff] via-[#852df8] to-[#5b14b8] shadow-[0px_4px_16px_0px_rgba(91,20,184,0.32)] flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#5b14b8] focus:ring-offset-2 hover:opacity-95 hover:shadow-[0px_6px_22px_0px_rgba(91,20,184,0.42)] active:scale-[0.99] cursor-pointer disabled:opacity-80 disabled:cursor-wait"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="size-4 sm:size-5 animate-spin" aria-hidden="true" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Continue</span>
                        <ArrowRight className="size-4 stroke-[2.5]" aria-hidden="true" />
                      </>
                    )}
                  </button>

                  {/* Resend Link Container (Figma node 1:117) */}
                  <div className="mt-3.5 pt-1 text-center flex flex-col items-center">
                    {countdown > 0 ? (
                      <p className="text-xs sm:text-sm text-[#494552] leading-5">
                        Resend available in{' '}
                        <strong className="text-[#191c1d] font-mono">
                          00:{countdown < 10 ? `0${countdown}` : countdown}
                        </strong>
                      </p>
                    ) : (
                      <p className="text-xs sm:text-sm text-[#494552] leading-5">
                        Didn&apos;t receive code?
                      </p>
                    )}
                    
                    <button
                      type="button"
                      disabled={countdown > 0 || isResending || !challenge}
                      onClick={handleResendOtp}
                      className="mt-1 text-xs sm:text-sm font-semibold text-[#5b14b8] hover:underline transition-colors leading-5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isResending ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 className="size-3.5 animate-spin" /> Dispatching code...
                        </span>
                      ) : (
                        'Resend OTP'
                      )}
                    </button>
                  </div>

                  <div className="mt-2 text-center">
                    <Link
                      to="/auth/login"
                      className="text-xs text-[#7a7583] hover:text-[#5b14b8] transition-colors"
                    >
                      Change mobile number
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Footer (Figma node 1:123 matching node 1:53) */}
          <footer className="shrink-0 w-full pt-3 pb-1 text-center text-xs font-medium text-[#494552] tracking-[0.3px]">
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
              <span>© 2026 Health Vault 360</span>
              <span className="text-slate-300">•</span>
              <a href="#privacy" className="hover:text-[#5b14b8] transition-colors">
                Privacy Policy
              </a>
              <span className="text-slate-300">•</span>
              <a href="#terms" className="hover:text-[#5b14b8] transition-colors">
                Terms of Service
              </a>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 text-[#006971] font-semibold">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                <span>HIPAA Compliant</span>
              </span>
            </div>
          </footer>
        </div>

        {/* Right Column: Visual Brand Area with Deep Navy Theme (Figma node 1:141, 704x1024) */}
        <div
          className="hidden lg:flex flex-1 lg:w-[50%] xl:w-[55%] h-full min-h-0 flex-col justify-between p-8 xl:p-12 2xl:p-16 relative overflow-hidden select-none"
          style={{
            background:
              'radial-gradient(circle at 50% 40%, #1e095b 0%, #140445 42%, #0e0240 75%, #09012a 100%)',
          }}
          data-name="Aside - Right Column: Visual Brand Area"
        >
          {/* Subtle ambient lighting gradients for depth (Figma nodes 1:143 & 1:144) */}
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#76f1ff]/10 rounded-full blur-[90px] pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#5b14b8]/20 rounded-full blur-[80px] pointer-events-none" />

          {/* Organic blue/purple radial glow centered naturally behind the security shield */}
          <div
            className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[380px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(118, 241, 255, 0.18) 0%, rgba(133, 45, 248, 0.22) 40%, rgba(40, 0, 109, 0.15) 65%, transparent 75%)',
              filter: 'blur(36px)',
            }}
          />

          {/* Centered Security Illustration Container - Preserves Aspect Ratio with Zero Distortion */}
          <div className="flex-1 min-h-0 flex items-center justify-center p-4 relative z-10">
            <img
              src={careidSecurityShield}
              alt="Enterprise Clinical Security"
              className="max-h-[36vh] xl:max-h-[42vh] 2xl:max-h-[46vh] w-auto max-w-[85%] object-contain select-none pointer-events-none transition-transform duration-300"
            />
          </div>

          {/* Value Prop Text Overlay - Left-Aligned matching Figma node 1:148 */}
          <div className="shrink-0 w-full max-w-[560px] space-y-2.5 xl:space-y-4 px-2 pb-2 relative z-10">
            <h2 className="text-2xl xl:text-[34px] 2xl:text-[38px] font-bold tracking-tight text-white leading-[1.2] text-left font-sans">
              Enterprise–Grade<br />Clinical Security
            </h2>
            <p className="text-xs sm:text-sm xl:text-base font-normal text-white/80 leading-relaxed text-left max-w-[496px]">
              Your credentials are secured with state-of-the-art encryption, ensuring patient data integrity across the CareID ecosystem.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
