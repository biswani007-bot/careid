import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Lock } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import careidCloudMark from '@/assets/branding/careid-cloud-mark.png';
import { OtpLayout } from './OtpLayout';

export const AuthLayout: React.FC = () => {
  const location = useLocation();

  if (location.pathname === '/auth/verify-otp') {
    return <OtpLayout />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#f8f9fa] selection:bg-[#a44cff]/20 selection:text-[#28006d] relative overflow-x-hidden">
      {/* Top App Bar Header (Figma node 1:3 - corner radius: 0px) */}
      <header className="h-16 sm:h-20 border-b border-[rgba(203,196,212,0.3)] px-4 sm:px-8 lg:px-12 flex items-center justify-between bg-white/90 backdrop-blur-md sticky top-0 z-20">
        <Link
          to="/auth/login"
          className="focus:outline-none focus:ring-2 focus:ring-[#5b14b8] rounded-md transition-opacity hover:opacity-90"
          aria-label="CareID Login Home"
        >
          <Logo size="lg" variant="auth" />
        </Link>

        <div className="flex flex-col items-end gap-0.5">
          <span className="text-sm sm:text-base font-semibold text-[#191c1d] leading-5 sm:leading-6 font-sans">
            Secure Clinical Workspace
          </span>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#006971] tracking-[0.1px] leading-4 sm:leading-5">
            <Lock className="size-3 sm:size-3.5 text-[#006971]" aria-hidden="true" />
            <span>Encrypted Access</span>
          </div>
        </div>
      </header>

      {/* Main Content: Two-Column Layout (Figma node 1:13) */}
      <div
        className="flex-1 flex flex-col lg:flex-row items-center justify-center max-w-[1440px] w-full mx-auto relative px-4 sm:px-6 lg:px-8 py-6 sm:py-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 85% 15%, rgba(118, 241, 255, 0.12) 0%, rgba(255, 255, 255, 0) 50%), radial-gradient(circle at 15% 85%, rgba(164, 76, 255, 0.08) 0%, rgba(255, 255, 255, 0) 50%)',
        }}
      >
        {/* Left Column: Auth Card & Footer Container (Figma node 1:14) */}
        <div className="w-full lg:w-[540px] xl:w-[576px] lg:shrink-0 flex flex-col items-center justify-center py-4 sm:py-6">
          {/* Floating Auth Card (Reference for 28-32px corner radius design language) */}
          <div
            className="w-full max-w-[460px] sm:max-w-[480px] bg-white rounded-[32px] border border-[rgba(203,196,212,0.3)] shadow-[0px_8px_32px_0px_rgba(40,0,109,0.06),0px_1px_4px_0px_rgba(0,0,0,0.02)] p-6 sm:p-10 lg:p-[48px] transition-all"
          >
            <Outlet />
          </div>

          {/* Footer Legal & Compliance Links (Figma node 1:50 / 1:51) */}
          <footer className="mt-8 text-center text-xs font-medium text-[#191c1d] tracking-[0.4px] space-y-2">
            <div className="flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap text-[#494552]">
              <span>© 2026 Health Vault 360</span>
              <span className="text-[#cbc4d4]">|</span>
              <a href="#privacy" className="hover:text-[#5b14b8] transition-colors">
                Privacy Policy
              </a>
              <span className="text-[#cbc4d4]">|</span>
              <a href="#terms" className="hover:text-[#5b14b8] transition-colors">
                Terms of Service
              </a>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[#006971] font-semibold">
              <ShieldCheck className="size-4" aria-hidden="true" />
              <span>HIPAA Compliant</span>
            </div>
          </footer>
        </div>

        {/* Right Column: Hero Graphic & Clinical Value Proposition (Figma node 1:65) */}
        <div className="hidden lg:flex flex-1 lg:w-[600px] xl:w-[704px] flex-col items-center justify-center p-8 lg:p-12 relative overflow-hidden self-stretch">
          {/* Ambient Lighting Orbs */}
          <div className="absolute top-10 right-10 size-64 rounded-full bg-cyan-200/25 blur-[72px] pointer-events-none" />
          <div className="absolute bottom-10 left-10 size-72 rounded-full bg-purple-300/20 blur-[80px] pointer-events-none" />

          <div className="max-w-[520px] text-center space-y-6 relative z-10">
            {/* Authentic CareID Cloud Graphic with Category Icons & Badge */}
            <div className="flex justify-center">
              <img
                src={careidCloudMark}
                alt="CareID Cloud Workspace - Medical, Dental, Vision, Appointments, Referrals, Forms & Intake"
                className="w-full max-w-[440px] xl:max-w-[480px] h-auto object-contain select-none transition-transform hover:scale-[1.01] duration-300"
              />
            </div>

            <div className="space-y-3 pt-2">
              <h2 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#28006d] leading-8 font-sans">
                Secure Clinical Workspace
              </h2>
              <p className="text-sm sm:text-base font-normal text-[#494552] leading-6 max-w-[460px] mx-auto">
                Streamline secure patient care and clinical productivity with instant access to protected medical records and intelligent diagnostics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
