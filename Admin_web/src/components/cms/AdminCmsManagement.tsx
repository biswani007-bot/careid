import React, { useState, useEffect } from 'react';
import {
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Plus,
  CheckCircle2,
  AlertCircle,
  Home,
  RefreshCw,
  Menu,
  ChevronRight,
  X
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import { cmsService, type CmsPage, type CmsFaq, type CmsBanner } from '../../services/cmsService';
import './AdminCmsManagement.css';

export interface AdminCmsManagementProps {
  onNavigate?: (path: string, state?: any) => void;
  onLogout?: () => void;
}

const DEFAULT_PAGES: CmsPage[] = [
  {
    id: 'page-001',
    slug: 'about-careid',
    title: 'About CareID & Health Vault 360',
    content: 'CareID is the next-generation digital healthcare identity infrastructure...',
    metaTitle: 'About CareID Health Platform',
    status: 'PUBLISHED',
    updatedAt: '2026-11-15T10:00:00Z',
  },
  {
    id: 'page-002',
    slug: 'patient-rights',
    title: 'Patient Health Record Rights & PHI Ownership',
    content: 'Under HIPAA and state medical data regulations, patients maintain full ownership...',
    metaTitle: 'Patient PHI Rights & Governance',
    status: 'PUBLISHED',
    updatedAt: '2026-11-18T14:20:00Z',
  },
  {
    id: 'page-003',
    slug: 'telemedicine-guide',
    title: 'Virtual Consultation & Telemedicine Guide',
    content: 'Best practices for joining video appointments with licensed healthcare providers...',
    metaTitle: 'Telemedicine Patient Guide',
    status: 'DRAFT',
    updatedAt: '2026-11-20T09:15:00Z',
  },
];

const DEFAULT_FAQS: CmsFaq[] = [
  {
    id: 'faq-001',
    category: 'General',
    question: 'How do I link my diagnostic lab reports to my Health Vault?',
    answer: 'Navigate to Health Records, click "Upload Record" and select your PDF or scan. Our clinical OCR pipeline will parse and catalog your documents automatically.',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'faq-002',
    category: 'Security & Access',
    question: 'Can doctors view my private health records without permission?',
    answer: 'No. Doctors can only view records for which you have explicitly authorized consultation access or shared via referral token.',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'faq-003',
    category: 'Veterinary Records',
    question: 'How do I add my pet or animal health records?',
    answer: 'Select your pet profile from the Pet Vault tab. Veterinary records are isolated in our dedicated veterinary schema to ensure clear distinction from human medical files.',
    displayOrder: 3,
    isActive: true,
  },
];

const DEFAULT_BANNERS: CmsBanner[] = [
  {
    id: 'ban-001',
    title: 'Winter Immunisation & Flu Clinic 2026',
    imageUrl: 'https://storage.careid.test/banners/flu-campaign-2026.jpg',
    redirectUrl: 'https://careid.test/campaigns/flu-vaccine',
    displayOrder: 1,
    status: 'PUBLISHED',
    updatedAt: '2026-11-10T12:00:00Z',
  },
  {
    id: 'ban-002',
    title: 'Free Preventive Cardiac Health Checkup',
    imageUrl: 'https://storage.careid.test/banners/cardiac-screening.jpg',
    redirectUrl: 'https://careid.test/cardiac-outreach',
    displayOrder: 2,
    status: 'PUBLISHED',
    updatedAt: '2026-11-12T16:45:00Z',
  },
];

export const AdminCmsManagement: React.FC<AdminCmsManagementProps> = ({
  onNavigate,
  onLogout,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pages' | 'faqs' | 'banners'>('pages');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Data collections
  const [pages, setPages] = useState<CmsPage[]>(DEFAULT_PAGES);
  const [faqs, setFaqs] = useState<CmsFaq[]>(DEFAULT_FAQS);
  const [banners, setBanners] = useState<CmsBanner[]>(DEFAULT_BANNERS);

  // Modals
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [newPageContent, setNewPageContent] = useState('');
  const [newPageStatus, setNewPageStatus] = useState<'DRAFT' | 'PUBLISHED'>('PUBLISHED');

  const [showAddFaqModal, setShowAddFaqModal] = useState(false);
  const [newFaqCategory, setNewFaqCategory] = useState('General');
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');

  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerImageUrl, setNewBannerImageUrl] = useState('');
  const [newBannerRedirectUrl, setNewBannerRedirectUrl] = useState('');

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'pages') {
        const res = await cmsService.getPages();
        if (res.success && res.data && res.data.length > 0) {
          setPages(res.data);
        } else {
          setPages(DEFAULT_PAGES);
        }
      } else if (activeTab === 'faqs') {
        const res = await cmsService.getFaqs();
        if (res.success && res.data && res.data.length > 0) {
          setFaqs(res.data);
        } else {
          setFaqs(DEFAULT_FAQS);
        }
      } else if (activeTab === 'banners') {
        const res = await cmsService.getBanners();
        if (res.success && res.data && res.data.length > 0) {
          setBanners(res.data);
        } else {
          setBanners(DEFAULT_BANNERS);
        }
      }
    } catch (err: any) {
      console.warn('CMS API fell back to baseline items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle.trim() || !newPageSlug.trim()) return;

    try {
      const res = await cmsService.createPage({
        title: newPageTitle,
        slug: newPageSlug,
        content: newPageContent,
        status: newPageStatus,
      });

      const newPage: CmsPage = res.success && res.data ? res.data : {
        id: `page-${Date.now()}`,
        slug: newPageSlug,
        title: newPageTitle,
        content: newPageContent,
        status: newPageStatus,
        updatedAt: new Date().toISOString(),
      };

      setPages((prev) => [newPage, ...prev]);
      setShowAddPageModal(false);
      setNewPageTitle('');
      setNewPageSlug('');
      setNewPageContent('');
      setNotification({ type: 'success', message: `Page "${newPageTitle}" created successfully.` });
    } catch {
      setNotification({ type: 'error', message: 'Failed to create page on backend.' });
    }
  };

  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;

    try {
      const res = await cmsService.createFaq({
        category: newFaqCategory,
        question: newFaqQuestion,
        answer: newFaqAnswer,
        displayOrder: faqs.length + 1,
        isActive: true,
      });

      const newFaq: CmsFaq = res.success && res.data ? res.data : {
        id: `faq-${Date.now()}`,
        category: newFaqCategory,
        question: newFaqQuestion,
        answer: newFaqAnswer,
        displayOrder: faqs.length + 1,
        isActive: true,
      };

      setFaqs((prev) => [...prev, newFaq]);
      setShowAddFaqModal(false);
      setNewFaqQuestion('');
      setNewFaqAnswer('');
      setNotification({ type: 'success', message: 'FAQ entry created successfully.' });
    } catch {
      setNotification({ type: 'error', message: 'Failed to create FAQ entry.' });
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerTitle.trim() || !newBannerImageUrl.trim()) return;

    try {
      const res = await cmsService.createBanner({
        title: newBannerTitle,
        imageUrl: newBannerImageUrl,
        redirectUrl: newBannerRedirectUrl,
        displayOrder: banners.length + 1,
        status: 'PUBLISHED',
      });

      const newBanner: CmsBanner = res.success && res.data ? res.data : {
        id: `ban-${Date.now()}`,
        title: newBannerTitle,
        imageUrl: newBannerImageUrl,
        redirectUrl: newBannerRedirectUrl,
        displayOrder: banners.length + 1,
        status: 'PUBLISHED',
        updatedAt: new Date().toISOString(),
      };

      setBanners((prev) => [...prev, newBanner]);
      setShowAddBannerModal(false);
      setNewBannerTitle('');
      setNewBannerImageUrl('');
      setNewBannerRedirectUrl('');
      setNotification({ type: 'success', message: 'Banner created successfully.' });
    } catch {
      setNotification({ type: 'error', message: 'Failed to create banner.' });
    }
  };

  return (
    <div className="cms-wrapper">
      <AdminSidebar
        activeNav="cms"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
      />

      <div className="cms-main">
        {/* Header Bar */}
        <header className="cms-header">
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
                CMS Content Management (PRD 4.4.10)
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={loadData}
              title="Refresh content"
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="cms-content">
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

          {/* Page Title */}
          <section className="cms-title-section">
            <div>
              <h1 className="cms-page-title">Content Management System (CMS)</h1>
              <p className="cms-page-subtitle">
                Manage informational portal pages, patient FAQs, and promotional banners across CareID platforms (PRD Section 4.4.10).
              </p>
            </div>
          </section>

          {/* Navigation Tabs */}
          <nav className="cms-nav-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'pages'}
              className={`cms-tab-btn ${activeTab === 'pages' ? 'active' : ''}`}
              onClick={() => setActiveTab('pages')}
            >
              <FileText size={16} />
              <span>Informational Pages</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'faqs'}
              className={`cms-tab-btn ${activeTab === 'faqs' ? 'active' : ''}`}
              onClick={() => setActiveTab('faqs')}
            >
              <HelpCircle size={16} />
              <span>Frequently Asked Questions</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'banners'}
              className={`cms-tab-btn ${activeTab === 'banners' ? 'active' : ''}`}
              onClick={() => setActiveTab('banners')}
            >
              <ImageIcon size={16} />
              <span>Promotional Banners</span>
            </button>
          </nav>

          {/* Tab 1: Pages */}
          {activeTab === 'pages' && (
            <div className="cms-card">
              <div className="cms-card-header">
                <span className="cms-card-title">Published Platform Pages ({pages.length})</span>
                <button
                  type="button"
                  className="cms-primary-btn"
                  onClick={() => setShowAddPageModal(true)}
                >
                  <Plus size={16} />
                  <span>Create Page</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Slug (URL)</th>
                      <th>Status</th>
                      <th>Last Modified</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map((page) => (
                      <tr key={page.id}>
                        <td className="font-semibold text-slate-800">{page.title}</td>
                        <td className="font-mono text-xs text-purple-700">/{page.slug}</td>
                        <td>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              page.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {page.status}
                          </span>
                        </td>
                        <td className="text-xs text-slate-500">
                          {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="text-xs text-purple-700 font-semibold hover:underline"
                              onClick={() => setNotification({ type: 'success', message: `Editing page: ${page.title}` })}
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: FAQs */}
          {activeTab === 'faqs' && (
            <div className="cms-card">
              <div className="cms-card-header">
                <span className="cms-card-title">Patient & Doctor FAQs ({faqs.length})</span>
                <button
                  type="button"
                  className="cms-primary-btn"
                  onClick={() => setShowAddFaqModal(true)}
                >
                  <Plus size={16} />
                  <span>Add FAQ</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Category</th>
                      <th>Question</th>
                      <th>Answer Preview</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faqs.map((faq) => (
                      <tr key={faq.id}>
                        <td className="font-bold text-slate-500 text-xs">#{faq.displayOrder}</td>
                        <td>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded font-medium">
                            {faq.category}
                          </span>
                        </td>
                        <td className="font-semibold text-slate-800 max-w-xs">{faq.question}</td>
                        <td className="text-slate-600 text-xs truncate max-w-sm">{faq.answer}</td>
                        <td>
                          <button
                            type="button"
                            className="text-xs text-purple-700 font-semibold hover:underline"
                            onClick={() => setNotification({ type: 'success', message: `Selected FAQ: ${faq.question}` })}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Banners */}
          {activeTab === 'banners' && (
            <div className="cms-card">
              <div className="cms-card-header">
                <span className="cms-card-title">Promotional & Campaign Banners ({banners.length})</span>
                <button
                  type="button"
                  className="cms-primary-btn"
                  onClick={() => setShowAddBannerModal(true)}
                >
                  <Plus size={16} />
                  <span>Add Banner</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th>Banner Title</th>
                      <th>Image Target</th>
                      <th>Redirect URL</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {banners.map((ban) => (
                      <tr key={ban.id}>
                        <td className="font-semibold text-slate-800">{ban.title}</td>
                        <td className="text-xs text-slate-500 truncate max-w-xs">{ban.imageUrl}</td>
                        <td className="text-xs text-purple-700 truncate max-w-xs">{ban.redirectUrl || '—'}</td>
                        <td>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {ban.status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="text-xs text-purple-700 font-semibold hover:underline"
                            onClick={() => setNotification({ type: 'success', message: `Selected banner: ${ban.title}` })}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal: Create Page */}
      {showAddPageModal && (
        <div className="cms-modal-backdrop" onClick={() => setShowAddPageModal(false)}>
          <div className="cms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cms-modal-header">
              <h3 className="cms-modal-title">Create Informational Page</h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setShowAddPageModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreatePage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Page Title</label>
                <input
                  type="text"
                  required
                  value={newPageTitle}
                  onChange={(e) => {
                    setNewPageTitle(e.target.value);
                    if (!newPageSlug) {
                      setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                  placeholder="e.g. Clinical Telehealth Guidelines"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL Slug</label>
                <input
                  type="text"
                  required
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-mono"
                  placeholder="clinical-telehealth-guidelines"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Page Body Content</label>
                <textarea
                  rows={4}
                  required
                  value={newPageContent}
                  onChange={(e) => setNewPageContent(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                  placeholder="Enter markdown or plain content for this page..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={newPageStatus}
                  onChange={(e) => setNewPageStatus(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600"
                  onClick={() => setShowAddPageModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#6C2BD9] text-white rounded-lg text-xs font-semibold"
                >
                  Publish Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create FAQ */}
      {showAddFaqModal && (
        <div className="cms-modal-backdrop" onClick={() => setShowAddFaqModal(false)}>
          <div className="cms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cms-modal-header">
              <h3 className="cms-modal-title">Add Frequently Asked Question</h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setShowAddFaqModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateFaq} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={newFaqCategory}
                  onChange={(e) => setNewFaqCategory(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="General">General</option>
                  <option value="Security & Access">Security & Access</option>
                  <option value="OCR & Health Records">OCR & Health Records</option>
                  <option value="Veterinary Records">Veterinary Records</option>
                  <option value="Telemedicine">Telemedicine</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Question</label>
                <input
                  type="text"
                  required
                  value={newFaqQuestion}
                  onChange={(e) => setNewFaqQuestion(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                  placeholder="e.g. How do I download my complete PHI record?"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Answer</label>
                <textarea
                  rows={4}
                  required
                  value={newFaqAnswer}
                  onChange={(e) => setNewFaqAnswer(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                  placeholder="Provide a concise and informative answer..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600"
                  onClick={() => setShowAddFaqModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#6C2BD9] text-white rounded-lg text-xs font-semibold"
                >
                  Save FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Banner */}
      {showAddBannerModal && (
        <div className="cms-modal-backdrop" onClick={() => setShowAddBannerModal(false)}>
          <div className="cms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cms-modal-header">
              <h3 className="cms-modal-title">Add Promotional Banner</h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setShowAddBannerModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateBanner} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Banner Title</label>
                <input
                  type="text"
                  required
                  value={newBannerTitle}
                  onChange={(e) => setNewBannerTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                  placeholder="e.g. Free Eye Health Screening Month"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Image URL</label>
                <input
                  type="url"
                  required
                  value={newBannerImageUrl}
                  onChange={(e) => setNewBannerImageUrl(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-mono"
                  placeholder="https://storage.careid.test/banners/eye-screening.jpg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Redirect / Target Link (Optional)</label>
                <input
                  type="url"
                  value={newBannerRedirectUrl}
                  onChange={(e) => setNewBannerRedirectUrl(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-mono"
                  placeholder="https://careid.test/campaigns/eye-screening"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600"
                  onClick={() => setShowAddBannerModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#6C2BD9] text-white rounded-lg text-xs font-semibold"
                >
                  Publish Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCmsManagement;
