import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Download,
  Fingerprint,
  Key,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  Monitor,
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../services/apiClient';
import { authService } from '../../services/authService';
import {
  AuthSessionDTO,
  profileService,
  SecurityAuditLogDTO,
} from '../../services/profileService';
import { SecurityAuditEntry, TrustedDevice } from './types';

function extractReadableField(
  value: string | Record<string, unknown> | null | undefined,
  preferredKeys: string[],
  fallback: string
): string {
  if (!value) return fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === 'object') {
    for (const key of preferredKeys) {
      const candidate = value[key];
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
    const serialized = Object.entries(value)
      .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
      .map(([, v]) => String(v).trim())
      .filter(Boolean)
      .join(' • ');
    return serialized || fallback;
  }
  return fallback;
}

function summarizeUserAgent(rawUa: string): { name: string; platform: string } {
  const ua = rawUa.trim();
  if (!ua || ua === 'Unknown Client') {
    return { name: 'Authenticated Session', platform: 'Web / API Client' };
  }

  let browser = 'Web Client';
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Google Chrome';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Apple Safari';
  else if (ua.toLowerCase().includes('postman')) browser = 'API Client';
  else if (ua.toLowerCase().includes('node')) browser = 'Node.js Client';

  let os = 'Unknown OS';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X') || ua.includes('Macintosh')) os = 'macOS';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'Apple iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';

  if (browser === 'Web Client' && os === 'Unknown OS') {
    return {
      name: ua.length > 48 ? `${ua.slice(0, 48)}...` : ua,
      platform: 'Registered Session',
    };
  }

  return {
    name: `${browser} on ${os}`,
    platform: os,
  };
}

function formatDateTime(iso?: string): string {
  if (!iso) return 'Not recorded';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapSessionToDevice(session: AuthSessionDTO, currentSessionId?: string): TrustedDevice {
  const rawUa = extractReadableField(
    session.userAgent,
    ['userAgent', 'raw', 'browser', 'client', 'name'],
    'Unknown Client'
  );
  const { name, platform } = summarizeUserAgent(rawUa);
  const ip = extractReadableField(
    session.ipAddress,
    ['ip', 'ipAddress', 'address', 'remoteAddress'],
    'IP unavailable'
  );

  return {
    id: session.id,
    name,
    platform,
    location: ip,
    lastActive: formatDateTime(session.createdAt),
    isCurrent: Boolean(currentSessionId && session.id === currentSessionId),
  };
}

function mapAuditDtoToEntry(entry: SecurityAuditLogDTO): SecurityAuditEntry {
  const rawUa = entry.userAgent?.trim() || entry.resource || 'System Event';
  const { name } = summarizeUserAgent(rawUa);
  const deviceDisplay = entry.userAgent ? name : entry.resource || 'CareID Auth';

  return {
    id: entry.id,
    device: deviceDisplay,
    location: entry.ipAddress?.trim() || 'Not recorded',
    timestamp: formatDateTime(entry.createdAt),
    method: entry.action || 'Event',
    status: entry.result || 'Recorded',
  };
}

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const AccountSecurityPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEntry[]>([]);
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [auditNotice, setAuditNotice] = useState<string | null>(null);

  // Modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2faModal, setShow2faModal] = useState(false);
  const [deviceToRevoke, setDeviceToRevoke] = useState<TrustedDevice | null>(null);
  const [isRevokingDevice, setIsRevokingDevice] = useState(false);

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<'success' | 'error'>('success');
  const toastTimerRef = React.useRef<number | null>(null);

  const showToast = useCallback((msg: string, tone: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastTone(tone);
    setToastMessage(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3500);
  }, []);

  const loadSecurityData = useCallback(async () => {
    setIsLoadingSecurity(true);
    setSessionsError(null);
    setAuditNotice(null);

    const rawSessionId = authService.getJwtClaims()?.sessionId;
    const currentSessionId = typeof rawSessionId === 'string' ? rawSessionId : undefined;

    const [sessionsResult, auditResult] = await Promise.allSettled([
      profileService.getActiveSessions(),
      profileService.getSecurityAuditLogs(user.userId || undefined),
    ]);

    if (sessionsResult.status === 'fulfilled') {
      setDevices(
        sessionsResult.value.map((session) => mapSessionToDevice(session, currentSessionId))
      );
    } else {
      const reason = sessionsResult.reason;
      const message =
        reason instanceof ApiError || reason instanceof Error
          ? reason.message
          : 'Unable to load active sessions from server.';
      setDevices([]);
      setSessionsError(message);
    }

    if (auditResult.status === 'fulfilled') {
      setAuditLogs(auditResult.value.map(mapAuditDtoToEntry));
      if (auditResult.value.length === 0) {
        setAuditNotice('No recent security audit events recorded for this account.');
      }
    } else {
      const reason = auditResult.reason;
      setAuditLogs([]);
      if (reason instanceof ApiError && reason.statusCode === 403) {
        setAuditNotice(
          'Security audit history requires elevated admin/compliance permissions (HTTP 403).'
        );
      } else if (reason instanceof ApiError && reason.statusCode === 404) {
        setAuditNotice('Security audit log endpoint is not available for this account.');
      } else {
        const message =
          reason instanceof Error
            ? reason.message
            : 'Unable to retrieve security audit activity.';
        setAuditNotice(message);
      }
    }

    setIsLoadingSecurity(false);
  }, [user.userId]);

  useEffect(() => {
    void loadSecurityData();
  }, [loadSecurityData]);

  const openPasswordModal = () => {
    setPasswordError(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordError(null);
    setIsUpdatingPassword(true);

    try {
      await profileService.changePassword({
        currentPassword,
        newPassword,
      });
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully');
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Unable to update password.';
      setPasswordError(message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleRevokeDevice = async () => {
    if (!deviceToRevoke || isRevokingDevice) return;
    setIsRevokingDevice(true);
    try {
      await profileService.terminateSession(deviceToRevoke.id);
      const revokedName = deviceToRevoke.name;
      setDevices((prev) => prev.filter((d) => d.id !== deviceToRevoke.id));
      setDeviceToRevoke(null);
      showToast(`Session revoked for ${revokedName}`);
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Failed to revoke session.';
      showToast(message, 'error');
    } finally {
      setIsRevokingDevice(false);
    }
  };

  const handleExportAuditLog = () => {
    if (auditLogs.length === 0) {
      showToast('No security audit log records available to export', 'error');
      return;
    }
    const header = ['Device / Client', 'Location & IP', 'Date & Time', 'Method', 'Status'];
    const rows = auditLogs.map((log) =>
      [log.device, log.location, log.timestamp, log.method, log.status]
        .map(escapeCsvCell)
        .join(',')
    );
    const csvContent = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `careid-security-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Security audit log exported (.csv)');
  };

  return (
    <div
      data-node-id="1:4531"
      data-testid="account-security-page"
      className="w-full space-y-6 pb-12"
    >
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          {toastTone === 'error' ? (
            <AlertTriangle className="size-4 text-red-400" />
          ) : (
            <CheckCircle2 className="size-4 text-emerald-400" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Breadcrumbs (1:4534) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => navigate('/dashboard')}>
              Dashboard
            </span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-slate-700 font-medium">Settings</span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-slate-900 font-bold">Account & Security</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your clinical security preferences, active sessions, and authentication credentials.
          </p>
        </div>

        {/* Settings Tab Navigation Strip */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            My Profile
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-[#28006d] shadow-xs"
          >
            Security
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings/notifications')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Notifications
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings/schedule')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Schedule
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings/ehr')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            EHR Sync
          </button>
        </div>
      </div>

      {/* Bento Grid Layout (1:4546) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Security Controls (1:4547, lg:col-span-4) */}
        <div
          data-node-id="1:4547"
          data-testid="security-controls-column"
          className="lg:col-span-4 space-y-6"
        >
          {/* 2FA Status Card (1:4548) */}
          <div
            data-node-id="1:4548"
            className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] space-y-4 relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-[#e8ddff] text-[#28006d] flex items-center justify-center shrink-0">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Two-Factor Auth</h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                      user.phone
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        user.phone ? 'bg-emerald-600' : 'bg-slate-400'
                      }`}
                    />
                    <span>{user.phone ? 'Phone OTP Active' : 'Not Configured'}</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShow2faModal(true)}
                className="text-xs font-semibold text-[#5b14b8] hover:underline"
              >
                Configure
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {user.phone
                ? `Account verification uses phone OTP (${user.phone}). TOTP authenticator and hardware key APIs are not available on this server.`
                : 'Account verification status is managed by the backend auth service.'}
            </p>

            <button
              type="button"
              onClick={() => setShow2faModal(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Key className="size-3.5 text-slate-500" />
              <span>Manage 2FA Credentials</span>
            </button>
          </div>

          {/* Additional Security Settings (1:4568) */}
          <div
            data-node-id="1:4568"
            className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Authentication Credentials
            </h3>

            {/* Password Row */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100/70">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <Lock className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Password</div>
                  <div className="text-[11px] text-slate-400">Managed via Auth Service</div>
                </div>
              </div>
              <button
                type="button"
                onClick={openPasswordModal}
                className="text-xs font-semibold text-[#28006d] hover:text-[#5b14b8] px-2.5 py-1 rounded-lg hover:bg-purple-50 transition-colors"
              >
                Update
              </button>
            </div>

            {/* Quick PIN Row */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100/70">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <KeyRound className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Quick PIN</div>
                  <div className="text-[11px] text-slate-400">Backend API not configured</div>
                </div>
              </div>
              <button
                type="button"
                disabled
                title="Quick PIN management endpoint is not available in the backend API"
                className="text-xs font-semibold text-slate-400 px-2.5 py-1 rounded-lg cursor-not-allowed"
              >
                Unavailable
              </button>
            </div>

            {/* Biometrics Toggle Row */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100/70">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <Fingerprint className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Biometric Login</div>
                  <div className="text-[11px] text-slate-400">Backend API not configured</div>
                </div>
              </div>
              <button
                type="button"
                disabled
                aria-label="Biometric login unavailable"
                title="Biometric enrollment endpoint is not available in the backend API"
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 opacity-60 cursor-not-allowed focus:outline-none"
              >
                <span className="inline-block size-4 transform rounded-full bg-white translate-x-1" />
              </button>
            </div>

            {/* Session Timeout Selector (1:4605) */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700">Clinical Session Timeout</label>
              <select
                disabled
                value="server-managed"
                aria-label="Clinical Session Timeout"
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500 cursor-not-allowed focus:outline-none"
              >
                <option value="server-managed">Managed by server JWT policy</option>
              </select>
              <p className="text-[11px] text-slate-400">
                Session duration is enforced by server token expiry (no user-configurable timeout endpoint).
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Activity & Devices (1:4618, lg:col-span-8) */}
        <div
          data-node-id="1:4618"
          data-testid="activity-devices-column"
          className="lg:col-span-8 space-y-6"
        >
          {/* Trusted Devices Section (1:4619) */}
          <div
            data-node-id="1:4619"
            className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <Laptop className="size-5 text-[#28006d]" />
                <h3 className="text-base font-bold text-slate-900">Trusted Clinical Devices</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {isLoadingSecurity ? 'Loading...' : `${devices.length} Active Sessions`}
              </span>
            </div>

            {sessionsError ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{sessionsError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void loadSecurityData()}
                  className="px-2.5 py-1 rounded-lg bg-white border border-red-200 text-red-700 font-semibold hover:bg-red-100"
                >
                  Retry
                </button>
              </div>
            ) : isLoadingSecurity ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="size-4 animate-spin text-[#5b14b8]" />
                <span>Loading active sessions...</span>
              </div>
            ) : devices.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No active sessions returned by the server.
              </div>
            ) : (
              <div className="space-y-3">
                {devices.map((dev) => (
                  <div
                    key={dev.id}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="size-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs">
                        {dev.platform.includes('Apple') ||
                        dev.platform.includes('iOS') ||
                        dev.platform.includes('Android') ? (
                          <Smartphone className="size-5" />
                        ) : (
                          <Monitor className="size-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{dev.name}</span>
                          {dev.isCurrent && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-[#5b14b8]">
                              Current Workstation
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {dev.platform} • {dev.location}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Created: {dev.lastActive}
                        </div>
                      </div>
                    </div>

                    {!dev.isCurrent && (
                      <button
                        type="button"
                        onClick={() => setDeviceToRevoke(dev)}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-[#ba1a1a] hover:bg-red-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Login History Table (1:4654) */}
          <div
            data-node-id="1:4654"
            className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0px_1px_2px_rgba(0,0,0,0.04)]"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="size-5 text-[#28006d]" />
                <h3 className="text-base font-bold text-slate-900">Recent Security Activity</h3>
              </div>
              <button
                type="button"
                onClick={handleExportAuditLog}
                className="text-xs font-semibold text-[#5b14b8] hover:underline flex items-center gap-1"
              >
                <Download className="size-3.5" />
                <span>Export Log</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-5 py-3">Device / Client</th>
                    <th className="px-5 py-3">Location & IP</th>
                    <th className="px-5 py-3">Date & Time</th>
                    <th className="px-5 py-3">Method</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingSecurity ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-slate-500">
                        Loading security activity...
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-slate-500">
                        {auditNotice || 'No security activity records available.'}
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3 font-semibold text-slate-900">{log.device}</td>
                        <td className="px-5 py-3 text-slate-600 font-mono text-[11px]">
                          {log.location}
                        </td>
                        <td className="px-5 py-3 text-slate-500">{log.timestamp}</td>
                        <td className="px-5 py-3 text-slate-700">{log.method}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${
                              log.status.toLowerCase().includes('fail') ||
                              log.status.toLowerCase().includes('denied')
                                ? 'bg-red-50 text-red-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                log.status.toLowerCase().includes('fail') ||
                                log.status.toLowerCase().includes('denied')
                                  ? 'bg-red-600'
                                  : 'bg-emerald-600'
                              }`}
                            />
                            <span>{log.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Dialog Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Update Clinical Password</h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Current Password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold">New Password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Must be at least 8 characters with numbers & symbols.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Confirm New Password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                  required
                />
              </div>

              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-purple-900 text-[11px] leading-tight">
                <strong>HIPAA Security Notice:</strong> Passwords must not be reused across outside
                personal accounts. Changes are validated directly by the CareID auth service.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={isUpdatingPassword}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-5 py-2 rounded-xl bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white font-bold hover:opacity-95 shadow-xs disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isUpdatingPassword && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{isUpdatingPassword ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Configuration Modal */}
      {show2faModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Two-Factor Authentication Status
              </h3>
              <button
                type="button"
                onClick={() => setShow2faModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <ShieldCheck className="size-6 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-900">Phone OTP Authentication</div>
                  <div className="text-[11px] text-emerald-700">
                    {user.phone
                      ? `Verified phone number: ${user.phone}`
                      : 'No phone number registered'}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <Key className="size-4 text-slate-600" />
                  <span>TOTP &amp; Hardware Security Keys (FIDO2)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Not supported: Backend TOTP enrollment and FIDO2 hardware key endpoints are not
                  available in the current API.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShow2faModal(false)}
                className="px-5 py-2 rounded-xl bg-[#28006d] text-white font-bold hover:bg-[#3f1d8b]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Device Confirmation Dialog */}
      {deviceToRevoke && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="size-12 rounded-full bg-red-100 text-[#ba1a1a] flex items-center justify-center mx-auto">
              <AlertTriangle className="size-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Revoke Device Session?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to revoke access for{' '}
                <strong className="text-slate-800">{deviceToRevoke.name}</strong>? The session will
                be terminated immediately.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeviceToRevoke(null)}
                disabled={isRevokingDevice}
                className="py-2 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeDevice}
                disabled={isRevokingDevice}
                className="py-2 px-4 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white font-bold text-xs disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {isRevokingDevice && <Loader2 className="size-3.5 animate-spin" />}
                <span>{isRevokingDevice ? 'Revoking...' : 'Revoke Session'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
