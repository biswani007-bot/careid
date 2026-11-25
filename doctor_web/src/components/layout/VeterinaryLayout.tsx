import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Activity,
  Bell,
  ChevronDown,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  PawPrint,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Syringe,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { Breadcrumbs } from './Breadcrumbs';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const getInitials = (name?: string): string => {
  if (!name) return 'VT';
  const clean = name.replace(/^Dr\.\s*/i, '').split(',')[0].trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'VT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const VeterinaryLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isDashboardRoute = location.pathname === '/veterinary/dashboard' || location.pathname === '/veterinary';
  const isPetsRoute = location.pathname.startsWith('/veterinary/pets') || location.pathname === '/pets';

  const [isPetsExpanded, setIsPetsExpanded] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');

  const currentTab = new URLSearchParams(location.search).get('tab');
  const isVaultActive = isPetsRoute && currentTab === 'vault';
  const isEncountersActive = isPetsRoute && currentTab === 'encounters';
  const isVaccinationsActive = isPetsRoute && currentTab === 'vaccinations';
  const isDirectoryActive = isPetsRoute && !currentTab;

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/veterinary/pets?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/veterinary/pets');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d] flex font-sans">
      {/* Dedicated Veterinary Clinical Sidebar */}
      <aside
        className="w-64 shrink-0 bg-[#f3f4f5] border-r border-[#e1e3e4] h-screen sticky top-0 flex flex-col justify-between overflow-y-auto z-40"
        aria-label="CareID Veterinary Portal Navigation"
      >
        <div className="flex flex-col">
          {/* 1. CareID Brand Logo with Veterinary Badge */}
          <div className="pt-6 px-6 h-14 flex items-center justify-between">
            <NavLink
              to="/veterinary/dashboard"
              className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#5b14b8] rounded-md"
              aria-label="CareID Veterinary Dashboard"
            >
              <Logo className="h-6 w-auto" />
            </NavLink>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#006971]/10 text-[#006971]">
              <PawPrint className="size-3" />
              <span>VET</span>
            </span>
          </div>

          {/* 2. Attending Veterinarian Summary Card */}
          <div className="mt-6 px-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full overflow-hidden bg-[#3f1d8b] text-white flex items-center justify-center shrink-0 border border-[#e1e3e4] shadow-sm">
                {user?.sidebarAvatarUrl || user?.avatarUrl ? (
                  <img
                    src={user.sidebarAvatarUrl || user.avatarUrl}
                    alt={user.fullName || 'Veterinarian profile'}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold">{getInitials(user?.fullName)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#191c1d] truncate" title={user?.fullName || 'Veterinarian'}>
                  {user?.fullName || 'Dr. Alex Taylor'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block size-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <p className="text-xs text-[#494552] truncate">
                    {user?.specialty || 'Veterinary Practitioner'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Quick Action: New Clinical Encounter */}
          <div className="mt-6 px-6">
            <button
              type="button"
              onClick={() => navigate('/veterinary/pets')}
              className="w-full h-10 flex items-center justify-center gap-2 bg-[#5b14b8] hover:bg-[#3f1d8b] text-white text-sm font-medium rounded-full transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5b14b8] focus:ring-offset-2"
            >
              <Plus className="size-4 shrink-0" aria-hidden="true" />
              <span>Document Encounter</span>
            </button>
          </div>

          {/* 4. Veterinary Navigation Tree */}
          <nav className="mt-6 px-4 space-y-1" aria-label="Veterinary Workspace Navigation">
            {/* Dashboard */}
            <NavLink
              to="/veterinary/dashboard"
              className={cn(
                'w-full h-11 flex items-center gap-3 px-4 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                isDashboardRoute
                  ? 'bg-[#3f1d8b] text-[#ab8efd] font-semibold shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                  : 'text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d]'
              )}
            >
              <LayoutDashboard
                className={cn('size-5 shrink-0', isDashboardRoute ? 'text-[#ab8efd]' : 'text-[#494552]')}
                aria-hidden="true"
              />
              <span>Dashboard</span>
            </NavLink>

            {/* Companion Animals (Collapsible Group) */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  if (!isPetsRoute) {
                    navigate('/veterinary/pets');
                    setIsPetsExpanded(true);
                  } else {
                    setIsPetsExpanded((prev) => !prev);
                  }
                }}
                aria-expanded={isPetsExpanded}
                aria-controls="veterinary-pets-submenu"
                className={cn(
                  'w-full h-11 flex items-center justify-between px-4 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                  isPetsRoute
                    ? 'bg-[#3f1d8b] text-[#ab8efd] font-semibold shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                    : 'text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d]'
                )}
              >
                <div className="flex items-center gap-3">
                  <PawPrint
                    className={cn('size-5 shrink-0', isPetsRoute ? 'text-[#ab8efd]' : 'text-[#494552]')}
                    aria-hidden="true"
                  />
                  <span>Companion Animals</span>
                </div>
                <ChevronDown
                  className={cn(
                    'size-4 transition-transform duration-200',
                    isPetsRoute ? 'text-[#ab8efd]' : 'text-[#494552]',
                    isPetsExpanded && 'rotate-180'
                  )}
                  aria-hidden="true"
                />
              </button>

              {/* Sub-links */}
              {isPetsExpanded && (
                <div id="veterinary-pets-submenu" className="pl-6 space-y-1">
                  <NavLink
                    to="/veterinary/pets"
                    end
                    className={cn(
                      'w-[216px] h-10 flex items-center gap-2 px-4 rounded-full text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                      isDirectoryActive
                        ? 'bg-[#3f1d8b]/15 text-[#3f1d8b] font-semibold shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                        : 'text-[#494552] hover:bg-slate-200/60 font-normal'
                    )}
                  >
                    <span>Pet Directory</span>
                  </NavLink>

                  <NavLink
                    to="/veterinary/pets?tab=vault"
                    className={cn(
                      'w-[216px] h-10 flex items-center gap-2 px-4 rounded-full text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                      isVaultActive
                        ? 'bg-[#3f1d8b]/15 text-[#3f1d8b] font-semibold shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                        : 'text-[#494552] hover:bg-slate-200/60 font-normal'
                    )}
                  >
                    <FileText className="size-4 shrink-0" />
                    <span>Pet Health Vault</span>
                  </NavLink>

                  <NavLink
                    to="/veterinary/pets?tab=encounters"
                    className={cn(
                      'w-[216px] h-10 flex items-center gap-2 px-4 rounded-full text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                      isEncountersActive
                        ? 'bg-[#3f1d8b]/15 text-[#3f1d8b] font-semibold shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                        : 'text-[#494552] hover:bg-slate-200/60 font-normal'
                    )}
                  >
                    <Activity className="size-4 shrink-0" />
                    <span>Clinical Encounters</span>
                  </NavLink>

                  <NavLink
                    to="/veterinary/pets?tab=vaccinations"
                    className={cn(
                      'w-[216px] h-10 flex items-center gap-2 px-4 rounded-full text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                      isVaccinationsActive
                        ? 'bg-[#3f1d8b]/15 text-[#3f1d8b] font-semibold shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                        : 'text-[#494552] hover:bg-slate-200/60 font-normal'
                    )}
                  >
                    <Syringe className="size-4 shrink-0" />
                    <span>Immunizations</span>
                  </NavLink>
                </div>
              )}
            </div>

            {/* Office Chat (CR-07) */}
            <NavLink
              to="/chat"
              className={cn(
                'w-full h-11 flex items-center gap-3 px-4 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                location.pathname.startsWith('/communication/chat') || location.pathname === '/chat'
                  ? 'bg-[#3f1d8b] text-[#ab8efd] font-semibold shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                  : 'text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d]'
              )}
            >
              <MessageSquare
                className={cn(
                  'size-5 shrink-0',
                  location.pathname.startsWith('/communication/chat') || location.pathname === '/chat'
                    ? 'text-[#ab8efd]'
                    : 'text-[#494552]'
                )}
                aria-hidden="true"
              />
              <span>Office Chat</span>
            </NavLink>
          </nav>
        </div>

        {/* 5. Bottom Utilities & Logout */}
        <div className="p-4 border-t border-[#e1e3e4] space-y-1">
          <NavLink
            to="/support"
            className="w-full h-10 flex items-center gap-3 px-4 rounded-full text-sm font-medium text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
          >
            <HelpCircle className="size-5 shrink-0" />
            <span>Support</span>
          </NavLink>

          <NavLink
            to="/settings"
            className="w-full h-10 flex items-center gap-3 px-4 rounded-full text-sm font-medium text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
          >
            <Settings className="size-5 shrink-0" />
            <span>Settings</span>
          </NavLink>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full h-10 flex items-center gap-3 px-4 rounded-full text-sm font-medium text-[#ba1a1a] hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#ba1a1a]"
          >
            <LogOut className="size-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 px-6 bg-white border-b border-[#e1e3e4] flex items-center justify-between gap-4 sticky top-0 z-30 shrink-0">
          {/* Companion Animal Search */}
          <form onSubmit={handleGlobalSearch} className="flex-1 max-w-md relative">
            <Search className="size-4 text-[#79747e] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search companion animals, species, breed, microchip, or owner..."
              className="w-full h-10 pl-10 pr-4 text-sm bg-[#f8f9fa] border border-[#e1e3e4] rounded-full focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5b14b8] focus:border-transparent transition-all placeholder:text-[#79747e]"
            />
          </form>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#006971]/10 text-[#006971] border border-[#006971]/20">
              <ShieldCheck className="size-3.5" />
              <span>Veterinary Workspace Active</span>
            </span>

            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="p-2 rounded-full text-[#494552] hover:bg-slate-200/60 transition-colors focus:outline-none"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/support')}
              className="p-2 rounded-full text-[#494552] hover:bg-slate-200/60 transition-colors focus:outline-none"
              aria-label="Support"
            >
              <HelpCircle className="size-5" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="p-2 rounded-full text-[#494552] hover:bg-slate-200/60 transition-colors focus:outline-none"
              aria-label="Settings"
            >
              <Settings className="size-5" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="flex items-center rounded-full p-0.5 border-2 border-[#e7e8e9] hover:border-[#5b14b8] transition-colors focus:outline-none"
              aria-label={`Veterinary Profile: ${user?.fullName || 'Doctor'}`}
            >
              <div className="size-7 rounded-full overflow-hidden bg-[#3f1d8b] flex items-center justify-center">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName || 'Veterinarian profile'}
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
        </header>

        {/* Content Workspace */}
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none overflow-y-auto p-6">
          <div className="max-w-[1440px] mx-auto w-full">
            <Breadcrumbs />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
