import React from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  LogOut,
  ArrowRight,
  Stethoscope,
  PawPrint,
  Lock,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export interface RoleRouteGuardProps {
  requiredWorkspace?: 'HUMAN' | 'VETERINARIAN' | 'ANY';
  children?: React.ReactNode;
}

/**
 * RoleRouteGuard enforces strict Option A clinical workspace isolation.
 *
 * Requirements enforced:
 * 1. Halts execution if user has dual-role ambiguity (stops privilege merging).
 * 2. Rejects cross-workspace direct URL access with a 403 Access Denied screen.
 * 3. Protects both HUMAN_DOCTOR and VETERINARIAN clinical routes.
 */
export const RoleRouteGuard: React.FC<RoleRouteGuardProps> = ({
  requiredWorkspace,
  children,
}) => {
  const { user, isAuthenticated, isInitializing, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#5b14b8]" />
          <span className="text-sm font-medium text-[#494552]">Verifying workspace authorization...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // 1. Dual-Role Ambiguity Clarification Screen
  // R1: "If a user has verified authorization for both professional roles,
  // document the ambiguity and STOP for clarification before implementing any switching mechanism.
  // Do not merge clinical menus or infer cross-role privileges."
  if (user.hasDualRoleAmbiguity) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-2xl bg-white border border-[#e1e3e4] rounded-2xl shadow-sm p-8 space-y-6">
          {/* Header Badge */}
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="size-6" />
            </div>
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 mb-1">
                Clinical Safety Gate R1
              </span>
              <h1 className="text-2xl font-bold text-[#191c1d]">Dual Clinical Role Ambiguity Detected</h1>
            </div>
          </div>

          <div className="text-sm text-[#494552] space-y-3 leading-relaxed">
            <p>
              Your credentials indicate verified authorization in both <strong className="text-[#191c1d]">Human Healthcare</strong> and <strong className="text-[#191c1d]">Veterinary Medicine</strong>:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              <div className="p-3.5 rounded-xl border border-purple-100 bg-[#fbf9fe] flex items-start gap-3">
                <Stethoscope className="size-5 text-[#5b14b8] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5b14b8]">Human Healthcare</h4>
                  <p className="text-xs text-[#494552] mt-0.5">Physician / Attending Medical Scope</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-teal-100 bg-[#f3fafb] flex items-start gap-3">
                <PawPrint className="size-5 text-[#006971] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#006971]">Veterinary Medicine</h4>
                  <p className="text-xs text-[#494552] mt-0.5">Accredited Companion Animal Scope</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#494552] space-y-2">
              <p className="font-semibold text-slate-800">
                CareID Clinical Species Isolation Policy (Option A):
              </p>
              <p>
                To prevent clinical record cross-contamination and protect patient confidentiality, CareID strictly prohibits merging human and veterinary clinical menus, screens, or records. Cross-role privileges cannot be automatically inferred.
              </p>
              <p>
                Please contact your facility administrator or system medical director to configure your primary clinical workspace role, or log in using your role-specific credential.
              </p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#e1e3e4]">
            <button
              type="button"
              onClick={() => navigate('/support')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#e1e3e4] text-xs font-medium text-[#494552] hover:bg-slate-50 transition-colors"
            >
              <HelpCircle className="size-4" />
              <span>Contact Clinical Administration</span>
            </button>

            <button
              type="button"
              onClick={() => logout()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#5b14b8] text-white text-xs font-medium hover:bg-[#3f1d8b] transition-colors"
            >
              <LogOut className="size-4" />
              <span>Sign Out & Switch Credentials</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Direct URL Cross-Workspace Access Rejection (403 Forbidden)
  if (requiredWorkspace && requiredWorkspace !== 'ANY' && user.workspaceType !== requiredWorkspace) {
    const isHumanTryingVet = requiredWorkspace === 'VETERINARIAN';

    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-xl bg-white border border-[#e1e3e4] rounded-2xl shadow-sm p-8 text-center space-y-6">
          <div className="size-16 rounded-2xl bg-rose-50 border border-rose-200 text-[#ba1a1a] mx-auto flex items-center justify-center">
            <Lock className="size-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
              403 Access Denied • Role Guard Barrier
            </span>
            <h2 className="text-2xl font-bold text-[#191c1d]">
              {isHumanTryingVet
                ? 'Veterinary Workspace Restricted'
                : 'Human Clinical Workspace Restricted'}
            </h2>
            <p className="text-sm text-[#494552] max-w-md mx-auto leading-relaxed">
              {isHumanTryingVet ? (
                <>
                  You are authenticated in the <strong className="text-[#191c1d]">Human Healthcare Workspace</strong>.
                  Direct URL access to companion animal records, the Pet Health Vault, and veterinary clinical documentation is strictly restricted to accredited veterinarians.
                </>
              ) : (
                <>
                  You are authenticated in the <strong className="text-[#191c1d]">Veterinarian Workspace</strong>.
                  Direct URL access to human patient directories, EHR vaults, consultations, and prescriptions is strictly restricted to licensed human medical doctors.
                </>
              )}
            </p>
          </div>

          <div className="pt-4 border-t border-[#e1e3e4] flex flex-col sm:flex-row items-center justify-center gap-3">
            {isHumanTryingVet ? (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#5b14b8] text-white text-xs font-medium hover:bg-[#3f1d8b] transition-colors"
              >
                <Stethoscope className="size-4" />
                <span>Return to Doctor Dashboard</span>
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/veterinary/dashboard')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#5b14b8] text-white text-xs font-medium hover:bg-[#3f1d8b] transition-colors"
              >
                <PawPrint className="size-4" />
                <span>Return to Veterinary Dashboard</span>
                <ArrowRight className="size-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => logout()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#e1e3e4] text-xs font-medium text-[#494552] hover:bg-slate-50 transition-colors"
            >
              <LogOut className="size-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authorized for requested workspace
  return children ? <>{children}</> : <Outlet />;
};
