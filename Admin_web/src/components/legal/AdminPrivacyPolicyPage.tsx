import React, { useState, useEffect } from 'react';
import {
  FileText,
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
  ChevronRight
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import { cmsService, type CmsPolicy } from '../../services/cmsService';
import './AdminLegalDocumentPage.css';

export interface AdminPrivacyPolicyPageProps {
  onNavigate?: (path: string, state?: any) => void;
  onLogout?: () => void;
}

const DEFAULT_PRIVACY_POLICY: string = `# CareID / Health Vault 360 Privacy Policy
**Last Updated: November 2026 | Effective Date: November 1, 2026**

## 1. Commitment to Health Data Privacy
CareID and Health Vault 360 are dedicated to protecting your Personal Health Information (PHI) and safeguarding your fundamental right to medical confidentiality. All records, diagnostics, lab results, prescriptions, and veterinary documents uploaded or managed within our platform are subject to strict role-based access control, encryption in transit (TLS 1.3), and encryption at rest (AES-256).

## 2. Regulatory Compliance
We operate under strict compliance with:
- **HIPAA** (Health Insurance Portability and Accountability Act of 1996)
- **HITECH Act** (Health Information Technology for Economic and Clinical Health)
- **GDPR** (General Data Protection Regulation) where applicable
- State & National Medical Board Data Governance Standards

## 3. Data Collection and Usage
We collect health records exclusively for clinical continuity, diagnostic verification via OCR, and authorized provider consultations. We do not sell, license, or monetize identifiable medical records to third parties or advertising brokers.

## 4. Patient Rights & Data Portability
Patients maintain complete ownership of their digital Health Vault. You may at any time:
- Request full export of your longitudinal record in FHIR or standardized PDF format.
- Grant or revoke temporary doctor access to individual consultations.
- Request record correction or document redaction where permissible by medical record retention law.

## 5. Security & Audit Logging
Every access, view, download, or edit of patient health records generates an immutable, cryptographically signed audit log record stored in the CareID Security Vault.

## Contact Administration
For privacy inquiries or compliance auditing:
Email: compliance@careid.test | Phone: +1 (800) 555-0199
`;

export const AdminPrivacyPolicyPage: React.FC<AdminPrivacyPolicyPageProps> = ({
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
  const [title, setTitle] = useState('HIPAA & Patient Data Privacy Policy');
  const [version, setVersion] = useState('2.4');
  const [effectiveDate, setEffectiveDate] = useState('2026-11-01');
  const [status, setStatus] = useState<'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED'>('PUBLISHED');
  const [content, setContent] = useState(DEFAULT_PRIVACY_POLICY);
  const [updatedAt, setUpdatedAt] = useState<string>('2026-11-01T00:00:00Z');

  // Version History Simulation / Persistence
  const [historyList, setHistoryList] = useState<Array<{ version: string; date: string; status: string; author: string }>>([
    { version: '2.4', date: 'Nov 01, 2026', status: 'PUBLISHED', author: 'Super Admin' },
    { version: '2.3', date: 'Aug 15, 2026', status: 'ARCHIVED', author: 'Legal Team' },
    { version: '2.0', date: 'Jan 10, 2026', status: 'ARCHIVED', author: 'System Admin' },
  ]);

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const loadPolicy = async () => {
    setIsLoading(true);
    try {
      const res = await cmsService.getPolicies('PRIVACY');
      if (res.success && res.data && res.data.length > 0) {
        const pol = res.data[0];
        setPolicyId(pol.id);
        setTitle(pol.title || 'HIPAA & Patient Data Privacy Policy');
        setVersion(pol.version || '2.4');
        setContent(pol.content || DEFAULT_PRIVACY_POLICY);
        setStatus(pol.status || 'PUBLISHED');
        if (pol.effectiveDate) setEffectiveDate(pol.effectiveDate.split('T')[0]);
        if (pol.updatedAt) setUpdatedAt(pol.updatedAt);
      }
    } catch (err: any) {
      console.warn('Could not fetch existing policy from backend, using baseline template:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPolicy();
  }, []);

  const handleSave = async (publishImmediately: boolean = false) => {
    setIsSaving(true);
    setNotification(null);
    const targetStatus = publishImmediately ? 'PUBLISHED' : status;

    const payload: Partial<CmsPolicy> = {
      title,
      policyType: 'PRIVACY',
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
            ? `Privacy Policy v${version} published live to backend successfully!`
            : `Privacy Policy draft v${version} saved successfully.`,
        });
      } else {
        setNotification({
          type: 'error',
          message: res.error || 'Failed to persist policy to backend.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Network error saving policy.',
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
                Privacy Policy Management
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={loadPolicy}
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
              <h1 className="legal-page-title">Privacy Policy Management</h1>
              <p className="legal-page-subtitle">
                Configure, edit, and publish platform data governance and HIPAA privacy statements (PRD 4.4.6).
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
                  <FileText size={18} className="text-[#6C2BD9]" />
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
                  <label htmlFor="policy-title" className="legal-label">
                    Policy Title
                  </label>
                  <input
                    id="policy-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="legal-input"
                    placeholder="e.g. HIPAA & Patient Data Privacy Policy"
                  />
                </div>

                <div className="legal-form-group">
                  <label htmlFor="policy-version" className="legal-label">
                    Version Number
                  </label>
                  <input
                    id="policy-version"
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="legal-input"
                    placeholder="e.g. 2.4"
                  />
                </div>
              </div>

              <div className="legal-form-row">
                <div className="legal-form-group">
                  <label htmlFor="effective-date" className="legal-label">
                    Effective Date
                  </label>
                  <input
                    id="effective-date"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="legal-input"
                  />
                </div>

                <div className="legal-form-group">
                  <label htmlFor="policy-status" className="legal-label">
                    Publication Status
                  </label>
                  <select
                    id="policy-status"
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
                <label htmlFor="policy-content" className="legal-label mb-2 block">
                  Document Content (Markdown Supported)
                </label>
                {activeTab === 'edit' ? (
                  <textarea
                    id="policy-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="legal-textarea"
                    placeholder="Type or paste privacy policy content here..."
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
                  onClick={() => setContent(DEFAULT_PRIVACY_POLICY)}
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
                    <span className="legal-meta-label">Target Audience</span>
                    <span className="legal-meta-value">Patients & Doctors</span>
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

              {/* Compliance Badges */}
              <div className="legal-card bg-[#FAF5FF] border-[#E9D5FF]">
                <h4 className="text-sm font-semibold text-[#6C2BD9] mb-2 flex items-center gap-1.5">
                  <Shield size={15} />
                  <span>Compliance Verification</span>
                </h4>
                <ul className="text-xs space-y-1.5 text-slate-600">
                  <li className="flex items-center gap-1.5">
                    <Check size={13} className="text-emerald-600 shrink-0" />
                    <span>HIPAA Privacy Rule (45 CFR § 164.520)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check size={13} className="text-emerald-600 shrink-0" />
                    <span>HITECH Audit Logging Conformance</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check size={13} className="text-emerald-600 shrink-0" />
                    <span>Patient PHI Portability & Export Rights</span>
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

export default AdminPrivacyPolicyPage;
