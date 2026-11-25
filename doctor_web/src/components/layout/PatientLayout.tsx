import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ChevronDown,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  Send,
  Settings,
  User,
  Users,
} from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { Breadcrumbs } from './Breadcrumbs';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const getInitials = (name?: string): string => {
  if (!name) return 'DR';
  const clean = name.replace(/^Dr\.\s*/i, '').split(',')[0].trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const PatientLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isSpecialWorkstation =
    location.pathname.includes('/financing') ||
    location.pathname.includes('/cath-lab-safety') ||
    location.pathname.includes('/encounter') ||
    location.pathname.includes('/post-op') ||
    location.pathname.includes('/completed') ||
    location.pathname.includes('/pre-op') ||
    location.pathname.includes('/ocr') ||
    location.pathname.includes('/records/upload') ||
    location.pathname.includes('/records/ocr') ||
    location.pathname.includes('/accepted') ||
    location.pathname.includes('/clearance') ||
    location.pathname.includes('/schedule') ||
    location.pathname.includes('/appointment') ||
    location.pathname.includes('/check-in') ||
    location.pathname.includes('/day-of-checkin') ||
    location.pathname.includes('/scheduled');

  const isDashboardRoute = location.pathname === '/dashboard';

  const isPatientsRoute =
    location.pathname.startsWith('/patients') ||
    (location.pathname.startsWith('/records') &&
      !location.pathname.startsWith('/records/labs') &&
      !location.pathname.startsWith('/records/imaging')) ||
    location.pathname.startsWith('/treatment-offers') ||
    location.pathname.startsWith('/cath-lab-safety') ||
    location.pathname.startsWith('/ocr');

  const isPatientDetailsActive = location.pathname.startsWith('/patients');
  const isHealthRecordsActive =
    location.pathname === '/records' ||
    (location.pathname.startsWith('/records') &&
      !location.pathname.startsWith('/records/labs') &&
      !location.pathname.startsWith('/records/imaging') &&
      !location.pathname.startsWith('/records/prescriptions'));
  const isConsultationsActive =
    location.pathname.startsWith('/treatment-offers') ||
    location.pathname.startsWith('/cath-lab-safety');
  const isPrescriptionsActive = location.pathname.startsWith('/records/prescriptions');

  const isReferralsRoute = location.pathname.startsWith('/referrals');
  const isChatRoute =
    location.pathname === '/chat' ||
    location.pathname.startsWith('/chat/') ||
    location.pathname.startsWith('/communication/chat');

  const isReportsRoute =
    location.pathname.startsWith('/reports') ||
    location.pathname.startsWith('/records/labs') ||
    location.pathname.startsWith('/records/imaging');
  const isLabReportsActive = location.pathname.startsWith('/records/labs');
  const isImagingActive = location.pathname.startsWith('/records/imaging');
  const isClinicalReportsActive =
    location.pathname === '/reports' ||
    (location.pathname.startsWith('/reports') &&
      !location.pathname.startsWith('/records/labs') &&
      !location.pathname.startsWith('/records/imaging'));

  const isSettingsRoute =
    location.pathname.startsWith('/settings') &&
    location.pathname !== '/settings/support';

  const isSupportRoute =
    location.pathname === '/support' ||
    location.pathname.startsWith('/support/') ||
    location.pathname === '/settings/support';

  const currentParams = new URLSearchParams(location.search);
  const currentPatientParam =
    currentParams.get('patientId') ||
    currentParams.get('id') ||
    (location.pathname.startsWith('/patients/') && !location.pathname.includes('/financing')
      ? location.pathname.split('/')[2]
      : undefined);
  const labReportsPath = currentPatientParam
    ? `/records/labs?patientId=${encodeURIComponent(currentPatientParam)}`
    : '/records/labs';
  const imagingPath = currentPatientParam
    ? `/records/imaging?patientId=${encodeURIComponent(currentPatientParam)}`
    : '/records/imaging';

  const [isPatientsExpanded, setIsPatientsExpanded] = useState(() => isPatientsRoute);
  const [isReportsExpanded, setIsReportsExpanded] = useState(() => isReportsRoute);

  useEffect(() => {
    if (isPatientsRoute) setIsPatientsExpanded(true);
  }, [isPatientsRoute]);

  useEffect(() => {
    if (isReportsRoute) setIsReportsExpanded(true);
  }, [isReportsRoute]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d] flex font-sans">
      {/* Left: Full-Height Dedicated Clinical Sidebar (Figma node 1:6934 / 1:667) */}
      <aside
        className="w-64 shrink-0 bg-[#f3f4f5] border-r border-[#e1e3e4] h-screen sticky top-0 flex flex-col justify-between overflow-y-auto z-40"
        aria-label="CareID Doctor Portal Navigation"
      >
        <div className="flex flex-col">
          {/* 1. CareID Brand Logo (Figma node 1:6936) */}
          <div className="pt-6 px-6 h-14 flex items-center">
            <NavLink
              to="/dashboard"
              className="flex items-center focus:outline-none focus:ring-2 focus:ring-[#5b14b8] rounded-md"
              aria-label="CareID Home"
            >
              <Logo size="md" />
            </NavLink>
          </div>

          {/* 2. Clinician Identity Card (Figma node 1:6939) */}
          <div className="mt-8 px-6 flex items-center gap-4">
            <div className="size-12 rounded-full overflow-hidden shrink-0 shadow-sm border border-slate-200 bg-[#3f1d8b] flex items-center justify-center">
              {user?.sidebarAvatarUrl ? (
                <img
                  src={user.sidebarAvatarUrl}
                  alt={user.sidebarDisplayLabel || user.fullName || 'Doctor profile'}
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-white">
                  {getInitials(user?.fullName)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-[#191c1d] leading-6 truncate">
                {user?.sidebarDisplayLabel || user?.fullName || '—'}
              </h2>
              <p className="text-xs font-medium text-[#494552] tracking-[0.5px] leading-4 truncate">
                {user?.organization || user?.specialty || '—'}
              </p>
            </div>
          </div>

          {/* 3. New Consultation CTA Button (Figma node 1:6948) */}
          <div className="mt-12 ml-6">
            <button
              type="button"
              onClick={() => {
                const patientMatch = location.pathname.match(/^\/patients\/([^/?#]+)/);
                const activeId = patientMatch && patientMatch[1] !== 'financing' ? patientMatch[1] : undefined;
                if (activeId) {
                  navigate(`/treatment-offers/new/step-1?patientId=${encodeURIComponent(activeId)}`);
                } else {
                  navigate('/treatment-offers/new/step-1');
                }
              }}
              className={cn(
                'w-[198px] h-11 rounded-full text-white font-medium text-sm',
                'bg-gradient-to-b from-[#a44cff] to-[#5b14b8]',
                'flex items-center justify-center gap-2 shadow-sm',
                'hover:opacity-95 active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-[#5b14b8]'
              )}
            >
              <Plus className="size-4 stroke-[2.5]" aria-hidden="true" />
              <span>New Consultation</span>
            </button>
          </div>

          {/* 4. Grouped Navigation Tree (Figma node 1:6952) */}
          <nav className="mt-6 px-2 space-y-1" aria-label="Main Navigation">
            {/* Dashboard */}
            <NavLink
              to="/dashboard"
              end
              className={cn(
                'w-full h-11 flex items-center gap-3 px-4 rounded-full text-sm font-medium transition-colors',
                isDashboardRoute
                  ? 'bg-[#3f1d8b] text-[#ab8efd] font-semibold'
                  : 'text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d]'
              )}
            >
              <LayoutDashboard
                className={cn(
                  'size-4.5 shrink-0 transition-colors',
                  isDashboardRoute ? 'text-[#ab8efd]' : 'text-[#494552]'
                )}
                aria-hidden="true"
              />
              <span>Dashboard</span>
            </NavLink>

            {/* Patients (Collapsible Group) */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  if (!isPatientsRoute) {
                    navigate('/patients');
                    setIsPatientsExpanded(true);
                  } else {
                    setIsPatientsExpanded((prev) => !prev);
                  }
                }}
                aria-expanded={isPatientsExpanded}
                aria-controls="patients-submenu"
                className={cn(
                  'w-full h-11 flex items-center justify-between px-4 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                  isPatientsRoute
                    ? 'bg-[#3f1d8b] text-[#ab8efd] font-semibold shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                    : 'text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d]'
                )}
              >
                <div className="flex items-center gap-3">
                  <Users
                    className={cn(
                      'size-5 shrink-0 transition-colors',
                      isPatientsRoute ? 'text-[#ab8efd]' : 'text-[#494552]'
                    )}
                    aria-hidden="true"
                  />
                  <span>Patients</span>
                </div>
                <ChevronDown
                  className={cn(
                    'size-4 transition-transform duration-200',
                    isPatientsRoute ? 'text-[#ab8efd]' : 'text-[#494552]',
                    isPatientsExpanded && 'rotate-180'
                  )}
                  aria-hidden="true"
                />
              </button>

              {/* Nested Patient Sub-links (Figma node 1:6968) */}
              {isPatientsExpanded && (
                <div id="patients-submenu" className="pl-6 space-y-1">
                  <NavLink
                    to="/patients"
                    className={cn(
                      'w-[216px] h-10 flex items-center px-4 rounded-full text-base transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                      isPatientDetailsActive
                        ? 'bg-[#3f1d8b]/15 text-[#3f1d8b] font-semibold shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                        : 'text-[#494552] hover:bg-slate-200/60 font-normal'
                    )}
                  >
                    Patient Details
                  </NavLink>

                  <NavLink
                    to="/records"
                    end
                    className={cn(
                      'w-[216px] h-10 flex items-center px-4 rounded-full text-base transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                      isHealthRecordsActive
                        ? 'bg-[#3f1d8b]/15 text-[#3f1d8b] font-semibold shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                        : 'text-[#494552] hover:bg-slate-200/60 font-normal'
                    )}
                  >
                    Health Records
                  </NavLink>

                  <NavLink
                    to="/treatment-offers"
                    className={cn(
                      'w-[216px] h-10 flex items-center px-4 rounded-full text-base transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                      isConsultationsActive
                        ? 'bg-[#3f1d8b]/15 text-[#3f1d8b] font-semibold shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                        : 'text-[#494552] hover:bg-slate-200/60 font-normal'
                    )}
                  >
                    Consultations
                  </NavLink>

                  <NavLink
                    to="/records/prescriptions"
                    className={cn(
                      'w-[216px] h-10 flex items-center px-4 rounded-full text-base transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                      isPrescriptionsActive
                        ? 'bg-[#3f1d8b]/15 text-[#3f1d8b] font-semibold shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                        : 'text-[#494552] hover:bg-slate-200/60 font-normal'
                    )}
                  >
                    Prescriptions
                  </NavLink>
                </div>
              )}
            </div>

            {/* Referrals */}
            <NavLink
              to="/referrals"
              className={cn(
                'w-full h-11 flex items-center gap-3 px-4 rounded-full text-sm font-medium transition-colors',
                isReferralsRoute
                  ? 'bg-[#3f1d8b] text-[#ab8efd] font-semibold'
                  : 'text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d]'
              )}
            >
              <Send
                className={cn(
                  'size-4.5 shrink-0 transition-colors',
                  isReferralsRoute ? 'text-[#ab8efd]' : 'text-[#494552]'
                )}
                aria-hidden="true"
              />
              <span>Referrals</span>
            </NavLink>

            {/* Office Chat (CR-07) */}
            <NavLink
              to="/chat"
              className={cn(
                'w-full h-11 flex items-center gap-3 px-4 rounded-full text-sm font-medium transition-colors',
                isChatRoute
                  ? 'bg-[#3f1d8b] text-[#ab8efd] font-semibold'
                  : 'text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d]'
              )}
            >
              <MessageSquare
                className={cn(
                  'size-4.5 shrink-0 transition-colors',
                  isChatRoute ? 'text-[#ab8efd]' : 'text-[#494552]'
                )}
                aria-hidden="true"
              />
              <span>Office Chat</span>
            </NavLink>

            {/* Reports (Collapsible Group — Figma node 1:2877/1:4514/1:6986) */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  if (!isReportsRoute) {
                    navigate(labReportsPath);
                    setIsReportsExpanded(true);
                  } else {
                    setIsReportsExpanded((prev) => !prev);
                  }
                }}
                aria-expanded={isReportsExpanded}
                aria-controls="reports-submenu"
                className={cn(
                  'w-full h-11 flex items-center justify-between px-4 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                  isReportsRoute
                    ? 'bg-[#3f1d8b] text-[#ab8efd] font-semibold shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                    : 'text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d]'
                )}
              >
                <div className="flex items-center gap-3">
                  <BarChart3
                    className={cn(
                      'size-4.5 shrink-0 transition-colors',
                      isReportsRoute ? 'text-[#ab8efd]' : 'text-[#494552]'
                    )}
                    aria-hidden="true"
                  />
                  <span>Reports</span>
                </div>
                <ChevronDown
                  className={cn(
                    'size-4 transition-transform duration-200',
                    isReportsRoute ? 'text-[#ab8efd]' : 'text-[#494552]',
                    isReportsExpanded && 'rotate-180'
                  )}
                  aria-hidden="true"
                />
              </button>

              {isReportsExpanded && (
                <div id="reports-submenu" className="pl-6 space-y-1">
                  <NavLink
                    to={labReportsPath}
                    className={cn(
                      'w-[216px] h-10 flex items-center px-4 rounded-full text-base transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                      isLabReportsActive
                        ? 'bg-[#3f1d8b]/15 text-[#3f1d8b] font-semibold shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                        : 'text-[#494552] hover:bg-slate-200/60 font-normal'
                    )}
                  >
                    Lab Reports
                  </NavLink>
                  <NavLink
                    to={imagingPath}
                    className={cn(
                      'w-[216px] h-10 flex items-center px-4 rounded-full text-base transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                      isImagingActive
                        ? 'bg-[#3f1d8b]/15 text-[#3f1d8b] font-semibold shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                        : 'text-[#494552] hover:bg-slate-200/60 font-normal'
                    )}
                  >
                    Imaging
                  </NavLink>
                  <NavLink
                    to="/reports"
                    className={cn(
                      'w-[216px] h-10 flex items-center px-4 rounded-full text-base transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                      isClinicalReportsActive
                        ? 'bg-[#3f1d8b]/15 text-[#3f1d8b] font-semibold shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                        : 'text-[#494552] hover:bg-slate-200/60 font-normal'
                    )}
                  >
                    Clinical Reports
                  </NavLink>
                </div>
              )}
            </div>

            {/* Profile */}
            <NavLink
              to="/settings"
              className={cn(
                'w-full h-11 flex items-center gap-3 px-4 rounded-full text-sm font-medium transition-colors',
                isSettingsRoute
                  ? 'bg-[#3f1d8b] text-[#ab8efd] font-semibold'
                  : 'text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d]'
              )}
            >
              <User
                className={cn(
                  'size-4.5 shrink-0 transition-colors',
                  isSettingsRoute ? 'text-[#ab8efd]' : 'text-[#494552]'
                )}
                aria-hidden="true"
              />
              <span>Profile</span>
            </NavLink>
          </nav>
        </div>

        {/* 5. Bottom Actions: Support & Sign Out (Figma node 1:7002) */}
        <div className="mt-auto px-2 pb-2 space-y-1">
          <NavLink
            to="/support"
            className={cn(
              'w-full h-11 flex items-center gap-3 px-4 rounded-full text-sm font-medium transition-colors',
              isSupportRoute
                ? 'bg-[#3f1d8b] text-[#ab8efd] font-semibold'
                : 'text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d]'
            )}
          >
            <HelpCircle
              className={cn(
                'size-5 shrink-0 transition-colors',
                isSupportRoute ? 'text-[#ab8efd]' : 'text-[#494552]'
              )}
              aria-hidden="true"
            />
            <span>Support</span>
          </NavLink>

          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/auth/login', { replace: true });
            }}
            className="w-full h-11 flex items-center gap-3 px-4 rounded-full text-sm font-medium text-[#ba1a1a] hover:bg-red-50 focus:outline-none transition-colors"
          >
            <LogOut className="size-4.5 shrink-0 text-[#ba1a1a]" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Right: Main Content Wrapper (Figma node 1:6658 / 1:474) */}
      <div className="flex-1 min-w-0 flex flex-col bg-[#f8f9fa] min-h-screen">
        {/* Workspace Header - TopNavBar (Figma node 1:6659 / 1:475) */}
        {!isSpecialWorkstation && (
          <header className="h-16 w-full bg-[#f8f9fa] border-b border-[#e1e3e4] px-6 flex items-center justify-between drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] sticky top-0 z-30 shrink-0">
            {/* Left: Global Search Input (Figma node 1:6661) */}
            <div className="relative w-full max-w-[410px]">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7a7583]">
                <Search className="size-4.5" aria-hidden="true" />
              </div>
              <input
                type="search"
                placeholder="Search patients, ID, or appointments..."
                className="w-full h-10 pl-10 pr-4 rounded-full bg-[#f3f4f5] border border-[#cbc4d4] text-sm text-[#191c1d] placeholder:text-[#494552] focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30 transition-colors"
              />
            </div>

            {/* Right: Utility Controls & Clinician Thumbnail (Figma node 1:6668) */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Notifications Button with Red Badge */}
              <button
                type="button"
                onClick={() => navigate('/notifications')}
                className="relative p-2 rounded-full text-[#494552] hover:bg-slate-200/60 transition-colors focus:outline-none"
                aria-label="Notifications"
              >
                <Bell className="size-5" />
                <span
                  className="absolute top-2 right-2 size-2 bg-[#ba1a1a] rounded-full border border-white"
                  aria-hidden="true"
                />
              </button>

              {/* Help Button */}
              <button
                type="button"
                onClick={() => navigate('/support')}
                className="p-2 rounded-full text-[#494552] hover:bg-slate-200/60 transition-colors focus:outline-none"
                aria-label="Help and Clinical Support"
              >
                <HelpCircle className="size-5" />
              </button>

              {/* Settings Button */}
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="p-2 rounded-full text-[#494552] hover:bg-slate-200/60 transition-colors focus:outline-none"
                aria-label="Settings"
              >
                <Settings className="size-5" />
              </button>

              {/* Doctor Profile Thumbnail (Figma node 1:6680) */}
              <div className="pl-2">
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="flex items-center rounded-full p-0.5 border-2 border-[#e7e8e9] hover:border-[#5b14b8] transition-colors focus:outline-none"
                  aria-label={`Doctor Profile: ${user?.fullName || 'Doctor'}`}
                >
                  <div className="size-7 rounded-full overflow-hidden bg-[#3f1d8b] flex items-center justify-center">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName || 'Doctor profile'}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-white">
                        {getInitials(user?.fullName)}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Main Content Workspace (Figma node 1:6683) */}
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'flex-1 outline-none overflow-y-auto',
            isSpecialWorkstation ? 'p-0' : 'p-6'
          )}
        >
          <div className={cn(isSpecialWorkstation ? 'w-full' : 'max-w-[1440px] mx-auto w-full')}>
            <Breadcrumbs />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
