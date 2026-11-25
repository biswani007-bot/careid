import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Mail,
  RotateCcw,
  Save,
  ShieldAlert,
  Smartphone,
  Volume2,
} from 'lucide-react';
import { ApiError } from '../../services/apiClient';
import {
  NotificationPreferencesDTO,
  profileService,
} from '../../services/profileService';
import { NotificationPreferences } from './types';

function mapDtoToPrefs(dto: NotificationPreferencesDTO): NotificationPreferences {
  return {
    id: dto.id,
    userId: dto.userId,
    emailEnabled: Boolean(dto.emailEnabled),
    smsEnabled: Boolean(dto.smsEnabled),
    pushEnabled: Boolean(dto.pushEnabled),
    inAppEnabled: Boolean(dto.inAppEnabled),
    webhookEnabled: Boolean(dto.webhookEnabled),
    updatedAt: dto.updatedAt,
  };
}

export const NotificationPreferencesPage: React.FC = () => {
  const navigate = useNavigate();

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setSaveError(null);
    try {
      const dto = await profileService.getNotificationPreferences();
      setPrefs(mapDtoToPrefs(dto));
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Unable to load notification preferences from server.';
      setPrefs(null);
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  const toggleChannel = (
    channel: 'emailEnabled' | 'smsEnabled' | 'pushEnabled' | 'inAppEnabled'
  ) => {
    setPrefs((prev) => (prev ? { ...prev, [channel]: !prev[channel] } : prev));
  };

  const handleSave = async () => {
    if (!prefs || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await profileService.updateNotificationPreferences({
        emailEnabled: prefs.emailEnabled,
        smsEnabled: prefs.smsEnabled,
        pushEnabled: prefs.pushEnabled,
        inAppEnabled: prefs.inAppEnabled,
        webhookEnabled: prefs.webhookEnabled,
      });
      setPrefs(mapDtoToPrefs(updated));
      showToast('Notification preferences saved successfully');
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Failed to save notification preferences.';
      setSaveError(message);
      showToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!prefs || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await profileService.updateNotificationPreferences({
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
        webhookEnabled: prefs.webhookEnabled,
      });
      setPrefs(mapDtoToPrefs(updated));
      showToast('Channel preferences reset and saved');
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Failed to reset notification preferences.';
      setSaveError(message);
      showToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const controlsDisabled = isLoading || isSaving || !prefs;

  const workflowCategories = [
    {
      key: 'patientUpdates',
      title: 'Patient Updates & Vital Trends',
      subtitle: 'Vitals telemetry, lab releases, chart notes',
    },
    {
      key: 'referrals',
      title: 'Specialist Referrals',
      subtitle: 'Incoming consult requests, patient handoffs',
    },
    {
      key: 'prescriptions',
      title: 'Prescription Signatures',
      subtitle: 'Refill requests, e-prescribing queue notices',
    },
    {
      key: 'ocrDocuments',
      title: 'OCR & Document Parsing',
      subtitle: 'Extraction readiness, mismatch flags',
    },
  ];

  return (
    <div
      data-node-id="1:4834"
      data-testid="notification-preferences-page"
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

      {/* Header & Breadcrumbs (1:4837) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => navigate('/dashboard')}>
              Dashboard
            </span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-slate-700 font-medium">Settings</span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-slate-900 font-bold">Notification Preferences</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-900">Notification Preferences</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage how you receive clinical alerts, triage notices, and system updates.
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
            onClick={() => navigate('/settings/security')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Security
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-[#28006d] shadow-xs"
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

      {/* Backend Load / Save Error Banners */}
      {loadError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadPreferences()}
            className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 font-semibold hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {saveError && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {isLoading && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Loader2 className="size-4 animate-spin text-[#5b14b8]" />
          <span>Loading notification preferences...</span>
        </div>
      )}

      {/* Main 2-Column Bento Grid Layout (1:4849) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Main Alert Settings (1:4850, lg:col-span-8) */}
        <div
          data-node-id="1:4850"
          data-testid="notification-preferences-main-column"
          className="lg:col-span-8 space-y-6"
        >
          {/* Critical Alerts Card (1:4851) */}
          <div
            data-node-id="1:4851"
            className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] space-y-5 relative overflow-hidden"
          >
            {/* Left 4px Red Accent Bar (1:4862) */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ba1a1a]" />

            <div className="flex items-start gap-3.5">
              <div className="size-10 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0">
                <ShieldAlert className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Critical Clinical Alerts</h3>
                <p className="text-xs text-slate-500">
                  Immediate notifications for life-threatening or panic patient findings (e.g. STAT Potassium &gt; 6.0).
                </p>
              </div>
            </div>

            <div className="space-y-3.5 divide-y divide-slate-100">
              {/* Toggle 1: Urgent SMS */}
              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="size-4 text-slate-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">SMS / Text Message Alerts</div>
                    <div className="text-[11px] text-slate-400">
                      Send instant SMS alert to registered mobile phone
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(prefs?.smsEnabled)}
                  aria-label="SMS / Text Message Alerts"
                  disabled={controlsDisabled}
                  onClick={() => toggleChannel('smsEnabled')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                    prefs?.smsEnabled ? 'bg-[#5b14b8]' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                      prefs?.smsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Audible In-App Tone (Unsupported by backend schema) */}
              <div className="pt-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="size-4 text-slate-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Audible In-App Alert Tone</div>
                    <div className="text-[11px] text-slate-400">
                      Backend API preference not configured
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  aria-label="Audible In-App Alert Tone unavailable"
                  title="Audio alert tone preference is not supported by the backend API"
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 opacity-60 cursor-not-allowed focus:outline-none"
                >
                  <span className="inline-block size-4 transform rounded-full bg-white translate-x-1" />
                </button>
              </div>

              {/* Toggle 3: Browser Push Notifications */}
              <div className="pt-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="size-4 text-slate-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Browser Push Notifications</div>
                    <div className="text-[11px] text-slate-400">
                      High-priority desktop &amp; mobile system banners
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(prefs?.pushEnabled)}
                  aria-label="Browser Push Notifications"
                  disabled={controlsDisabled}
                  onClick={() => toggleChannel('pushEnabled')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                    prefs?.pushEnabled ? 'bg-[#5b14b8]' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                      prefs?.pushEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-[#ba1a1a] font-medium pt-1">
              * SMS and browser push toggles reflect your account-wide notification preferences stored on the server.
            </p>
          </div>

          {/* Standard Categories Card (1:4893) */}
          <div
            data-node-id="1:4893"
            className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] space-y-5"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="size-10 rounded-full bg-purple-50 text-[#28006d] flex items-center justify-center shrink-0">
                <Bell className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Standard Notification Channels</h3>
                <p className="text-xs text-slate-500">
                  Channel settings apply globally across clinical workflows (per-category backend routing API pending).
                </p>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                <span>Workflow Category</span>
                <div className="flex items-center gap-8 pr-2">
                  <span className="w-8 text-center">Email</span>
                  <span className="w-8 text-center">In-App</span>
                  <span className="w-8 text-center">SMS</span>
                </div>
              </div>

              {workflowCategories.map((cat, idx) => (
                <div
                  key={cat.key}
                  className={`flex items-center justify-between py-2 ${
                    idx < workflowCategories.length - 1 ? 'border-b border-slate-100/70' : ''
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{cat.title}</div>
                    <div className="text-[11px] text-slate-400">{cat.subtitle}</div>
                  </div>
                  <div className="flex items-center gap-8 pr-2">
                    <input
                      type="checkbox"
                      aria-label={`${cat.title} Email`}
                      disabled={controlsDisabled}
                      checked={Boolean(prefs?.emailEnabled)}
                      onChange={() => toggleChannel('emailEnabled')}
                      className="size-4 rounded text-[#5b14b8] focus:ring-[#5b14b8] disabled:opacity-50"
                    />
                    <input
                      type="checkbox"
                      aria-label={`${cat.title} In-App`}
                      disabled={controlsDisabled}
                      checked={Boolean(prefs?.inAppEnabled)}
                      onChange={() => toggleChannel('inAppEnabled')}
                      className="size-4 rounded text-[#5b14b8] focus:ring-[#5b14b8] disabled:opacity-50"
                    />
                    <input
                      type="checkbox"
                      aria-label={`${cat.title} SMS`}
                      disabled={controlsDisabled}
                      checked={Boolean(prefs?.smsEnabled)}
                      onChange={() => toggleChannel('smsEnabled')}
                      className="size-4 rounded text-[#5b14b8] focus:ring-[#5b14b8] disabled:opacity-50"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Global Digest & Action Area (1:4959, lg:col-span-4) */}
        <div
          data-node-id="1:4959"
          data-testid="notification-preferences-right-column"
          className="lg:col-span-4 space-y-6"
        >
          {/* Global Digest Card (1:4960) */}
          <div
            data-node-id="1:4960"
            className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] space-y-4"
          >
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <Mail className="size-4.5 text-[#5b14b8]" />
              <h3 className="text-base font-bold text-slate-900">Email Digest Summary</h3>
            </div>

            <p className="text-xs text-slate-500">
              Email digest scheduling is not supported by the current notification preferences API.
            </p>

            <div className="space-y-2.5">
              {[
                { id: 'daily', label: 'Daily Digest', desc: 'Sent every morning at 07:00 AM' },
                { id: 'weekly', label: 'Weekly Summary', desc: 'Sent every Monday at 08:00 AM' },
                { id: 'off', label: 'Immediate (Off)', desc: 'Deliver individual emails as they occur' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 opacity-60 flex items-start gap-3 cursor-not-allowed"
                >
                  <input
                    type="radio"
                    name="digestFrequency"
                    value={opt.id}
                    checked={false}
                    disabled
                    readOnly
                    className="size-4 text-[#5b14b8] mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                    <div className="text-[11px] text-slate-500">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* System Settings Card (1:4991) */}
          <div
            data-node-id="1:4991"
            className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">Platform Maintenance Alerts</h3>
              <button
                type="button"
                disabled
                aria-label="Platform Maintenance Alerts unavailable"
                title="Maintenance alert preference is not supported by the backend API"
                className="relative inline-flex h-5 w-9 items-center rounded-full bg-slate-200 opacity-60 cursor-not-allowed focus:outline-none"
              >
                <span className="inline-block size-3.5 transform rounded-full bg-white translate-x-1" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Backend API preference not configured for separate platform maintenance alerts.
            </p>
          </div>

          {/* Action Area (1:5004) */}
          <div
            data-node-id="1:5004"
            className="space-y-2 pt-2"
          >
            <button
              type="button"
              disabled={controlsDisabled}
              onClick={handleSave}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-b from-[#a44cff] to-[#5b14b8] hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
            </button>

            <button
              type="button"
              disabled={controlsDisabled}
              onClick={handleReset}
              className="w-full py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset to Default</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
