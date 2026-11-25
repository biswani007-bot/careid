import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plus,
  ScanLine,
  Send,
  Settings,
  Stethoscope,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  onClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Patient Directory', path: '/patients', icon: Users },
    { name: 'Health Records', path: '/records', icon: FileText },
    { name: 'OCR Verification', path: '/ocr/upload', icon: ScanLine },
    { name: 'Referrals', path: '/referrals', icon: Send },
    { name: 'Office Chat', path: '/chat', icon: MessageSquare },
    { name: 'Facilities', path: '/facilities', icon: Building2 },
    { name: 'Clinical Reports', path: '/reports', icon: BarChart3 },
    { name: 'Treatment Lifecycle', path: '/treatment-offers', icon: Stethoscope },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed lg:sticky top-16 z-40 h-[calc(100vh-4rem)] w-64 bg-[#f3f4f5] border-r border-[#e1e3e4]',
          'flex flex-col justify-between p-4 transition-transform duration-200 ease-in-out shrink-0 overflow-y-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        aria-label="Doctor Portal Navigation"
      >
        <div className="space-y-4">
          {/* Doctor Profile Card (Figma node 1:408) */}
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/70 border border-[#e1e3e4]/60">
            <div className="size-12 rounded-full bg-[#3f1d8b] overflow-hidden shrink-0 shadow-sm border border-slate-200 flex items-center justify-center text-white text-sm font-semibold">
              {user?.sidebarAvatarUrl ? (
                <img
                  src={user.sidebarAvatarUrl}
                  alt={user.sidebarDisplayLabel || user.fullName || 'Doctor'}
                  className="size-full object-cover"
                />
              ) : (
                <span>
                  {(user?.fullName || 'DR')
                    .replace(/^Dr\.\s*/i, '')
                    .split(',')[0]
                    .trim()
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-[#191c1d] truncate">
                {user?.sidebarDisplayLabel || user?.fullName || '—'}
              </h2>
              <p className="text-xs font-medium text-[#494552] truncate">
                {user?.title || user?.specialty || '—'}
              </p>
            </div>
          </div>

          {/* New Consultation CTA Button (Figma node 1:417) */}
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
              if (onClose) onClose();
            }}
            className={cn(
              'w-full h-10 rounded-full text-white font-medium text-sm',
              'bg-gradient-to-b from-[#a44cff] to-[#5b14b8]',
              'flex items-center justify-center gap-2 shadow-sm',
              'hover:opacity-95 active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-[#5b14b8]'
            )}
          >
            <Plus className="size-4 stroke-[2.5]" aria-hidden="true" />
            <span>New Consultation</span>
          </button>

          {/* Primary Navigation Menu (Figma node 1:421) */}
          <nav className="space-y-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isItemActive =
                item.path === '/dashboard'
                  ? location.pathname === '/dashboard'
                  : item.path === '/chat'
                    ? location.pathname === '/chat' || location.pathname.startsWith('/communication/chat')
                    : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard'}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
                    isItemActive
                      ? 'rounded-full bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white font-semibold shadow-sm'
                      : 'rounded-lg text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d]'
                  )}
                >
                  <Icon
                    className={cn('size-4 shrink-0', isItemActive ? 'text-white' : 'text-[#494552]')}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Utility Actions (Figma node 1:439) */}
        <div className="pt-3 border-t border-[rgba(203,196,212,0.4)] space-y-1">
          <NavLink
            to="/settings"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]',
              location.pathname.startsWith('/settings')
                ? 'rounded-full bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white font-semibold'
                : 'rounded-lg text-[#494552] hover:bg-slate-200/60 hover:text-[#191c1d]'
            )}
          >
            <Settings
              className={cn(
                'size-4 shrink-0',
                location.pathname.startsWith('/settings') ? 'text-white' : 'text-[#494552]'
              )}
              aria-hidden="true"
            />
            <span className="truncate">Settings</span>
          </NavLink>

          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/auth/login', { replace: true });
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium',
              'text-[#ba1a1a] hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-[#ba1a1a] transition-colors'
            )}
          >
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
