import React, { useState, useEffect } from 'react';
import {
  Save,
  Send,
  Eye,
  Edit3,
  Shield,
  History,
  CheckCircle2,
  AlertCircle,
  Home,
  RefreshCw,
  Menu,
  Check,
  ChevronRight,
  Scale
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import { cmsService, type CmsPolicy } from '../../services/cmsService';
import './AdminLegalDocumentPage.css';

export interface AdminTermsConditionsPageProps {
  onNavigate?: (path: string, state?: any) => void;
  onLogout?: () => void;
}

const DEFAULT_TERMS_CONDITIONS: string = `# CareID / Health Vault 360 Terms & Conditions of Service
**Last Updated: November 2026 | Effective Date: November 1, 2026**

## 1. Acceptance of Terms
By accessing or using the CareID web applications, mobile applications (iOS/Android), API services, or connected healthcare provider portals, you agree to be bound by these Terms & Conditions and our Privacy Policy. If you do not agree, do not access or use the platform.

## 2. Platform Description & Scope
Health Vault 360 is a digital personal health record (PHR) and clinical communication infrastructure connecting patients, licensed human healthcare providers, and licensed veterinary professionals. 

**DISCLAIMER OF EMERGENCY MEDICAL SERVICES**:
Health Vault 360 is NOT an emergency response system. In case of acute medical emergency or life-threatening symptoms, immediately dial 911 (or local emergency dispatch) or proceed to the nearest emergency room.

## 3. Account Responsibilities
- Users must provide truthful, current, and verifiable identity information.
- Users are responsible for maintaining the confidentiality of their authentication credentials and one-time password (OTP) verification codes.
- Healthcare providers utilizing the platform warrant that they hold valid, unrestricted licensure in their jurisdiction.

## 4. Clinical Ownership & Doctor-Patient Relationship
The creation of a Health Vault 360 account does not in itself establish a doctor-patient relationship. Professional relationships are formed when a licensed physician accepts a consultation, clinic booking, or official referral.

## 5. Intellectual Property & License
All proprietary software, OCR algorithms, user interfaces, branding, and workflows are the exclusive intellectual property of CareID Technologies. Users receive a revocable, non-exclusive license for personal health management or authorized clinical administration.

## 6. Termination of Access
CareID reserves the right to suspend or terminate accounts that violate medical security regulations, attempt unauthorized extraction of PHI, or engage in malicious API abuse.

## Contact Legal Department
CareID Legal & Compliance Operations:
Email: legal@careid.test | Direct line: +1 (800) 555-0199
`;

export const AdminTermsConditionsPage: React.FC<AdminTermsConditionsPageProps> = ({
  onNavigate,
  onLogout,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [policyId, setPolicyId] = useState<string | null>(null);
  const [title, setTitle] = useState('CareID Master Terms & Conditions of Service');
  const [version, setVersion] = useState('3.1');
  const [effectiveDate, setEffectiveDate] = useState('2026-11-01');
  const [status, setStatus] = useState<'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED'>('PUBLISHED');
  const [content, setContent] = useState(DEFAULT_TERMS_CONDITIONS);
  const [updatedAt, setUpdatedAt] = useState<string>('2026-11-01T00:00:00Z');

  // Version History Simulation / Persistence
  const [historyList, setHistoryList] = useState<Array<{ version: string; date: string; status: string; author: string }>>([
    { version: '3.1', date: 'Nov 01, 2026', status: 'PUBLISHED', author: 'Super Admin' },
    { version: '3.0', date: 'Sep 10, 2026', status: 'ARCHIVED', author: 'Legal Operations' },
    { version: '2.5', date: 'Mar 20, 2026', status: 'ARCHIVED', author: 'System Admin' },
  ]);

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const loadTerms = async () => {
    setIsLoading(true);
    try {
      const res = await cmsService.getPolicies('TERMS');
      if (res.success && res.data && res.data.length > 0) {
        const pol = res.data[0];
        setPolicyId(pol.id);
        setTitle(pol.title || 'CareID Master Terms & Conditions of Service');
        setVersion(pol.version || '3.1');
        setContent(pol.content || DEFAULT_TERMS_CONDITIONS);
        setStatus(pol.status || 'PUBLISHED');
        if (pol.effectiveDate) setEffectiveDate(pol.effectiveDate.split('T')[0]);
        if (pol.updatedAt) setUpdatedAt(pol.updatedAt);
      }
    } catch (err: any) {
      console.warn('Could not fetch existing terms from backend, using baseline template:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTerms();
  }, []);

  const handleSave = async (publishImmediately: boolean = false) => {
    setIsSaving(true);
    setNotification(null);
    const targetStatus = publishImmediately ? 'PUBLISHED' : status;

    const payload: Partial<CmsPolicy> = {
      title,
      policyType: 'TERMS',
      version,
      content,
      effectiveDate,
      status: targetStatus,
    };

    try {
      let res;
      if (policyId) {
        res = await cmsService.updatePolicy(policyId, payload);
      } else {
        res = await cmsService.createPolicy(payload);
        if (res.success && res.data?.id) {
          setPolicyId(res.data.id);
        }
      }

      if (res.success) {
        setStatus(targetStatus);
        setUpdatedAt(new Date().toISOString());
        setHistoryList((prev) => [
          { version, date: 'Just now', status: targetStatus, author: 'Current Admin' },
          ...prev.filter((h) => h.version !== version),
        ]);
        setNotification({
          type: 'success',
          message: publishImmediately
            ? `Terms & Conditions v${version} published live to backend successfully!`
            : `Terms & Conditions draft v${version} saved successfully.`,
        });
      } else {
        setNotification({
          type: 'error',
          message: res.error || 'Failed to persist terms to backend.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Network error saving terms.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="legal-mgmt-wrapper">
      <AdminSidebar
        activeNav="cms"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
      />

      <div className="legal-mgmt-main">
        {/* Header Bar */}
        <header className="legal-mgmt-header">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Toggle Navigation"
            >
              <Menu size={20} />
            </button>
            <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
              <button
                type="button"
                className="hover:text-slate-800 flex items-center gap-1"
                onClick={() => handleNav('/admin/dashboard')}
              >
                <Home size={14} />
                <span>Dashboard</span>
              </button>
              <ChevronRight size={14} className="text-slate-400" />
              <button
                type="button"
                className="hover:text-slate-800"
                onClick={() => handleNav('/admin/settings/general')}
              >
                Settings
              </button>
              <ChevronRight size={14} className="text-slate-400" />
              <span className="text-slate-800 font-medium" aria-current="page">
                Terms & Conditions Management
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={loadTerms}
              title="Refresh from server"
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="legal-mgmt-content">
          {/* Notification Toast */}
          {notification && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-center justify-between border ${
                notification.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 font-medium text-sm">
                {notification.type === 'success' ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle size={18} className="text-rose-600 shrink-0" />
                )}
                <span>{notification.message}</span>
              </div>
              <button
                type="button"
                className="text-xs underline hover:no-underline"
                onClick={() => setNotification(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Page Title Section */}
          <section className="legal-title-section">
            <div className="legal-title-left">
              <h1 className="legal-page-title">Terms & Conditions Management</h1>
              <p className="legal-page-subtitle">
                Author, version, and publish binding platform terms, liability disclosures, and provider agreements (PRD 4.4.7).
              </p>
            </div>

            <div className="legal-title-badges">
              <span
                className={`legal-status-pill ${
                  status === 'PUBLISHED'
                    ? 'legal-status-published'
                    : status === 'DRAFT'
                    ? 'legal-status-draft'
                    : 'legal-status-review'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {status}
              </span>
              <span className="legal-version-pill">Version {version}</span>
            </div>
          </section>

          {/* Grid Layout */}
          <div className="legal-grid">
            {/* Main Form & Editor */}
            <div className="legal-card">
              <div className="legal-card-header">
                <h2 className="legal-card-title">
                  <Scale size={18} className="text-[#6C2BD9]" />
                  <span>Document Editor</span>
                </h2>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    className={`legal-tool-btn ${activeTab === 'edit' ? 'active' : ''}`}
                    onClick={() => setActiveTab('edit')}
                  >
                    <Edit3 size={14} />
                    <span>Markdown</span>
                  </button>
                  <button
                    type="button"
                    className={`legal-tool-btn ${activeTab === 'preview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('preview')}
                  >
                    <Eye size={14} />
                    <span>Preview</span>
                  </button>
                </div>
              </div>

              <div className="legal-form-row">
                <div className="legal-form-group">
                  <label htmlFor="terms-title" className="legal-label">
                    Document Title
                  </label>
                  <input
                    id="terms-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="legal-input"
                    placeholder="e.g. CareID Master Terms & Conditions of Service"
                  />
                </div>

                <div className="legal-form-group">
                  <label htmlFor="terms-version" className="legal-label">
                    Version Number
                  </label>
                  <input
                    id="terms-version"
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="legal-input"
                    placeholder="e.g. 3.1"
                  />
                </div>
              </div>

              <div className="legal-form-row">
                <div className="legal-form-group">
                  <label htmlFor="terms-effective-date" className="legal-label">
                    Effective Date
                  </label>
                  <input
                    id="terms-effective-date"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="legal-input"
                  />
                </div>

                <div className="legal-form-group">
                  <label htmlFor="terms-status" className="legal-label">
                    Publication Status
                  </label>
                  <select
                    id="terms-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="legal-select"
                  >
                    <option value="PUBLISHED">PUBLISHED (Live to Users)</option>
                    <option value="DRAFT">DRAFT (Internal Review)</option>
                    <option value="REVIEW">IN REVIEW (Legal Review)</option>
                    <option value="ARCHIVED">ARCHIVED (Deprecated)</option>
                  </select>
                </div>
              </div>

              {/* Editor or Preview Pane */}
              <div className="mt-4">
                <label htmlFor="terms-content" className="legal-label mb-2 block">
                  Document Content (Markdown Supported)
                </label>
                {activeTab === 'edit' ? (
                  <textarea
                    id="terms-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="legal-textarea"
                    placeholder="Type or paste terms and conditions content here..."
                  />
                ) : (
                  <div className="legal-preview-box">
                    {content}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="legal-actions-bar">
                <button
                  type="button"
                  className="legal-btn-secondary"
                  disabled={isSaving}
                  onClick={() => setContent(DEFAULT_TERMS_CONDITIONS)}
                >
                  <RefreshCw size={14} />
                  <span>Reset Template</span>
                </button>
                <button
                  type="button"
                  className="legal-btn-secondary"
                  disabled={isSaving}
                  onClick={() => handleSave(false)}
                >
                  <Save size={14} />
                  <span>Save Draft</span>
                </button>
                <button
                  type="button"
                  className="legal-btn-primary"
                  disabled={isSaving}
                  onClick={() => handleSave(true)}
                >
                  <Send size={14} />
                  <span>{isSaving ? 'Publishing...' : 'Publish Live'}</span>
                </button>
              </div>
            </div>

            {/* Sidebar Metadata & Revision History */}
            <aside className="space-y-6">
              {/* Publication Status Card */}
              <div className="legal-card">
                <div className="legal-card-header">
                  <h3 className="legal-card-title">
                    <Shield size={16} className="text-[#059669]" />
                    <span>Live Metadata</span>
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="legal-meta-item">
                    <span className="legal-meta-label">Current Version</span>
                    <span className="legal-meta-value">v{version}</span>
                  </div>
                  <div className="legal-meta-item">
                    <span className="legal-meta-label">Status</span>
                    <span className="legal-meta-value font-semibold text-emerald-600">{status}</span>
                  </div>
                  <div className="legal-meta-item">
                    <span className="legal-meta-label">Last Updated</span>
                    <span className="legal-meta-value">{new Date(updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="legal-meta-item">
                    <span className="legal-meta-label">Applicable Platform</span>
                    <span className="legal-meta-value">Mobile & Web Clients</span>
                  </div>
                </div>
              </div>

              {/* Version History Card */}
              <div className="legal-card">
                <div className="legal-card-header">
                  <h3 className="legal-card-title">
                    <History size={16} className="text-[#6C2BD9]" />
                    <span>Version History</span>
                  </h3>
                </div>
                <div className="space-y-3">
                  {historyList.map((item, idx) => (
                    <div key={idx} className="legal-history-item">
                      <div className="legal-history-header">
                        <span className="legal-history-version">v{item.version}</span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="legal-history-date">{item.date}</span>
                        <span className="legal-history-author">{item.author}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal Checklist */}
              <div className="legal-card bg-[#F0FDF4] border-[#BBF7D0]">
                <h4 className="text-sm font-semibold text-[#15803D] mb-2 flex items-center gap-1.5">
                  <Scale size={15} />
                  <span>Enforceability Standards</span>
                </h4>
                <ul className="text-xs space-y-1.5 text-slate-600">
                  <li className="flex items-center gap-1.5">
                    <Check size={13} className="text-emerald-600 shrink-0" />
                    <span>Emergency Care Non-Reliance Clause</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check size={13} className="text-emerald-600 shrink-0" />
                    <span>Doctor Licensure & Scope Warranty</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check size={13} className="text-emerald-600 shrink-0" />
                    <span>Arbitration & Dispute Resolution</span>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminTermsConditionsPage;
