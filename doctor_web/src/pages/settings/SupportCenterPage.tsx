import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileCheck,
  FileText,
  Inbox,
  LifeBuoy,
  Loader2,
  MessageSquare,
  PhoneCall,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Stethoscope,
  X,
} from 'lucide-react';
import { supportService } from '../../services/supportService';
import type {
  FAQItemDTO,
  SupportTicketDTO,
  TicketCategory,
  TicketPriority,
} from './types';

export const SupportCenterPage: React.FC = () => {
  const navigate = useNavigate();

  // Search and FAQ state
  const [faqs, setFaqs] = useState<FAQItemDTO[]>([]);
  const [isLoadingFaqs, setIsLoadingFaqs] = useState<boolean>(true);
  const [faqError, setFaqError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // App preferences state
  const [telemetryEnabled, setTelemetryEnabled] = useState(true);
  const [offlineCacheEnabled, setOfflineCacheEnabled] = useState(true);

  // Ticket Modal state
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketModalTab, setTicketModalTab] = useState<'new' | 'history'>('new');
  const [ticketCategory, setTicketCategory] = useState<TicketCategory>('CLINICAL');
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>('LOW');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Ticket History state
  const [tickets, setTickets] = useState<SupportTicketDTO[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(false);
  const [ticketHistoryError, setTicketHistoryError] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [isSubmittingReply, setIsSubmittingReply] = useState<Record<string, boolean>>({});

  // Call helpdesk modal state
  const [showCallModal, setShowCallModal] = useState(false);

  // Legal Modal state
  const [activeLegalModal, setActiveLegalModal] = useState<'terms' | 'hipaa' | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load published FAQs from backend
  const loadFaqs = useCallback(async () => {
    setIsLoadingFaqs(true);
    setFaqError(null);
    try {
      const res = await supportService.getFaqs();
      const items = Array.isArray(res.data) ? res.data : [];
      setFaqs(items);
      if (items.length > 0) {
        setExpandedFaqId(items[0].id);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to retrieve published FAQs';
      setFaqError(errorMsg);
      setFaqs([]);
    } finally {
      setIsLoadingFaqs(false);
    }
  }, []);

  useEffect(() => {
    loadFaqs();
  }, [loadFaqs]);

  // Load tickets history from backend
  const fetchTicketHistory = useCallback(async () => {
    setIsLoadingTickets(true);
    setTicketHistoryError(null);
    try {
      const res = await supportService.getTickets({ limit: 10 });
      const items = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setTickets(items);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to retrieve ticket history';
      setTicketHistoryError(errorMsg);
    } finally {
      setIsLoadingTickets(false);
    }
  }, []);

  // Filtered FAQs based on category button and search text
  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      if (selectedCategory !== 'all') {
        const cat = (faq.category || '').toLowerCase();
        const selected = selectedCategory.toLowerCase();
        if (!cat.includes(selected) && !selected.includes(cat)) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchQuestion = (faq.question || '').toLowerCase().includes(q);
        const matchAnswer = (faq.answer || '').toLowerCase().includes(q);
        const matchCat = (faq.category || '').toLowerCase().includes(q);
        return matchQuestion || matchAnswer || matchCat;
      }
      return true;
    });
  }, [faqs, selectedCategory, searchQuery]);

  // Handle genuine ticket creation
  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim()) {
      setSubmissionError('Please enter a ticket subject.');
      return;
    }
    if (!ticketDescription.trim()) {
      setSubmissionError('Please provide a description of the issue.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const res = await supportService.createTicket({
        subject: ticketSubject.trim(),
        description: ticketDescription.trim(),
        category: ticketCategory,
        priority: ticketPriority,
      });

      const ticketRef = res.data?.ticketNumber || res.data?.id || 'SUBMITTED';
      showToast(`Support ticket #${ticketRef} submitted successfully`);
      setTicketSubject('');
      setTicketDescription('');
      setShowTicketModal(false);
      // Refresh ticket history
      fetchTicketHistory();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit IT support ticket';
      setSubmissionError(errorMsg);
      showToast(`Submission failed: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle adding reply to an existing ticket
  const handleAddReply = async (ticketId: string) => {
    const text = (replyDrafts[ticketId] || '').trim();
    if (!text) return;

    setIsSubmittingReply((prev) => ({ ...prev, [ticketId]: true }));
    try {
      await supportService.addTicketReply(ticketId, text);
      showToast('Reply submitted successfully');
      setReplyDrafts((prev) => ({ ...prev, [ticketId]: '' }));
      // Refresh tickets to reflect updated replies
      const res = await supportService.getTickets({ limit: 10 });
      const items = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setTickets(items);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit reply';
      showToast(`Error: ${errorMsg}`);
    } finally {
      setIsSubmittingReply((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'RESOLVED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-purple-50 text-[#5b14b8] border-purple-200';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'URGENT':
      case 'STAT':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'HIGH':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LOW':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div
      data-node-id="1:5113"
      data-testid="support-center-page"
      className="w-full space-y-6 pb-12"
    >
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Breadcrumbs (1:5116) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => navigate('/dashboard')}>
              Dashboard
            </span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-slate-900 font-bold">Support &amp; Help Center</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-900">Support &amp; Legal</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your app preferences, find help, and review clinical legal agreements.
          </p>
        </div>
      </div>

      {/* Main Bento Grid Layout (1:5121) */}
      <div className="space-y-6">
        {/* Row 1: Top 2 Cards (Help Center & Contact Support) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Top Left: Help Center & FAQ (1:5122, Span 8) */}
          <div
            data-node-id="1:5122"
            data-testid="help-center-card"
            className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-purple-50 text-[#28006d] flex items-center justify-center shrink-0">
                  <LifeBuoy className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Help Center &amp; Clinical Guides</h3>
                  <p className="text-xs text-slate-500">Search documentation on patient handoffs, OCR, and cath lab workflows.</p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles & FAQs..."
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50/60 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                />
              </div>
            </div>

            {/* Quick Topic Cards (1:5130) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'Clinical Workflows',
                  title: 'Clinical Workflows',
                  desc: 'Patient handoffs & referrals',
                  icon: Stethoscope,
                  color: 'text-purple-600 bg-purple-50',
                },
                {
                  id: 'Account Security',
                  title: 'Account Security',
                  desc: '2FA, YubiKey, and timeouts',
                  icon: ShieldCheck,
                  color: 'text-emerald-600 bg-emerald-50',
                },
                {
                  id: 'Troubleshooting',
                  title: 'Troubleshooting',
                  desc: 'Sync, OCR flags & telemetry',
                  icon: LifeBuoy,
                  color: 'text-cyan-600 bg-cyan-50',
                },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    selectedCategory === cat.id
                      ? 'border-[#5b14b8] bg-purple-50/50 shadow-xs'
                      : 'border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className={`size-8 rounded-lg ${cat.color} flex items-center justify-center mb-2`}>
                    <cat.icon className="size-4" />
                  </div>
                  <div className="text-xs font-bold text-slate-900">{cat.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{cat.desc}</div>
                </button>
              ))}
            </div>

            {/* Interactive Accordion List */}
            <div className="space-y-2 pt-1 divide-y divide-slate-100">
              {isLoadingFaqs ? (
                <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2 text-xs">
                  <Loader2 className="size-5 animate-spin text-[#5b14b8]" />
                  <span>Loading published help articles...</span>
                </div>
              ) : faqError ? (
                <div className="py-8 text-center text-xs text-rose-600 space-y-2">
                  <p>{faqError}</p>
                  <button
                    type="button"
                    onClick={loadFaqs}
                    className="text-[#5b14b8] font-semibold underline hover:text-[#28006d]"
                  >
                    Retry loading
                  </button>
                </div>
              ) : faqs.length === 0 ? (
                <div
                  data-testid="faqs-empty-state"
                  className="py-10 text-center text-xs text-slate-500 space-y-2"
                >
                  <LifeBuoy className="size-8 text-slate-300 mx-auto" />
                  <div className="font-semibold text-slate-700">No published help topics found</div>
                  <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
                    No knowledge base articles have been published for this environment yet. Please search or submit an IT support ticket for personalized assistance.
                  </p>
                </div>
              ) : filteredFaqs.length === 0 ? (
                <div
                  data-testid="faqs-no-search-results"
                  className="py-8 text-center text-xs text-slate-500 space-y-1"
                >
                  <Search className="size-5 text-slate-300 mx-auto mb-1" />
                  <div>No help topics found matching &ldquo;{searchQuery}&rdquo;.</div>
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  const isOpen = expandedFaqId === faq.id;
                  return (
                    <div key={faq.id} className="pt-2">
                      <button
                        type="button"
                        onClick={() => setExpandedFaqId(isOpen ? null : faq.id)}
                        className="w-full py-2 flex items-center justify-between text-left gap-4 hover:text-[#5b14b8] transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{faq.question}</div>
                          {faq.category && (
                            <div className="text-[11px] text-slate-500 capitalize">{faq.category}</div>
                          )}
                        </div>
                        <ChevronDown
                          className={`size-4 text-slate-400 transition-transform shrink-0 ${
                            isOpen ? 'rotate-180 text-[#5b14b8]' : ''
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="p-3 mt-1 mb-2 bg-slate-50/80 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed animate-in fade-in whitespace-pre-line">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Top Right: Contact Support (1:5149, Span 4) */}
          <div
            data-node-id="1:5149"
            data-testid="contact-support-card"
            className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] space-y-4"
          >
            <div className="size-10 rounded-full bg-[#e8ddff] text-[#28006d] flex items-center justify-center">
              <PhoneCall className="size-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Need Direct Assistance?</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Our hospital clinical IT engineering team is available 24/7 for urgent cath lab or telemetry workflow disruptions.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowTicketModal(true);
                  setTicketModalTab('new');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-b from-[#a44cff] to-[#5b14b8] hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <MessageSquare className="size-4" />
                <span>Submit IT Support Ticket</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCallModal(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <PhoneCall className="size-4 text-slate-500" />
                <span>Call Clinical IT Helpdesk</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
              <div className="flex items-center justify-between">
                <span>Clinical IT Hotline:</span>
                <span data-testid="hotline-indicator" className="font-mono font-semibold text-slate-500">
                  — (Unconfigured)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Direct SLA Response:</span>
                <span data-testid="sla-indicator" className="font-semibold text-slate-500">
                  Standard Institutional
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Bottom 2 Cards (App & Legal Info + Data & Privacy Preferences) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Bottom Left: App Info & Legal (1:5164, Span 6) */}
          <div
            data-node-id="1:5164"
            data-testid="app-legal-card"
            className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] space-y-4"
          >
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <FileCheck className="size-5 text-[#28006d]" />
              <h3 className="text-base font-bold text-slate-900">App &amp; Legal Governance</h3>
            </div>

            {/* Version Badge Card (1:5168) */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">CareID Doctor Portal</div>
                <div className="text-[11px] text-slate-500">Version 2.4.1 • Build #8940-PROD</div>
              </div>
              <button
                type="button"
                onClick={() => showToast('CareID Portal is up to date (Version 2.4.1)')}
                className="text-xs font-semibold text-[#5b14b8] hover:underline"
              >
                Check for Updates
              </button>
            </div>

            {/* Legal Document Links */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveLegalModal('terms')}
                className="w-full p-3 rounded-xl border border-slate-100 hover:bg-slate-50 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="size-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-800">
                    Terms of Service &amp; Clinical Governance
                  </span>
                </div>
                <ChevronRight className="size-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => setActiveLegalModal('hipaa')}
                className="w-full p-3 rounded-xl border border-slate-100 hover:bg-slate-50 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-800">
                    HIPAA Compliance &amp; Business Associate Agreement (BAA)
                  </span>
                </div>
                <ChevronRight className="size-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Bottom Right: Data Preferences (1:5196, Span 6) */}
          <div
            data-node-id="1:5196"
            data-testid="data-preferences-card"
            className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] space-y-4"
          >
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <Shield className="size-5 text-[#28006d]" />
              <h3 className="text-base font-bold text-slate-900">Data Preferences &amp; Telemetry</h3>
            </div>

            <div className="space-y-4 pt-1">
              {/* Telemetry Toggle */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-900">Crash Diagnostics &amp; Telemetry</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Share anonymized client performance logs to identify fluoroscopy viewer freezes and network latency.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTelemetryEnabled(!telemetryEnabled);
                    showToast(`Crash diagnostics ${!telemetryEnabled ? 'enabled' : 'disabled'}`);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 focus:outline-none ${
                    telemetryEnabled ? 'bg-[#5b14b8]' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                      telemetryEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Offline Cache Toggle */}
              <div className="flex items-start justify-between gap-4 pt-3 border-t border-slate-100">
                <div>
                  <div className="text-xs font-bold text-slate-900">Encrypted Cath Lab Offline Cache</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Store active procedure records and emergency allergy profiles locally in encrypted memory for offline surgical continuity.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOfflineCacheEnabled(!offlineCacheEnabled);
                    showToast(`Offline cache ${!offlineCacheEnabled ? 'enabled' : 'disabled'}`);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 focus:outline-none ${
                    offlineCacheEnabled ? 'bg-[#5b14b8]' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                      offlineCacheEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Ticket & History Modal */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-5 text-[#5b14b8]" />
                <h3 className="text-base font-bold text-slate-900">Clinical IT Support Workstation</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTicketModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="size-4.5" />
              </button>
            </div>

            {/* Navigation Tabs inside Modal */}
            <div className="flex items-center justify-between border-b border-slate-100">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTicketModalTab('new')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
                    ticketModalTab === 'new'
                      ? 'border-[#5b14b8] text-[#5b14b8]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Submit New Ticket
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTicketModalTab('history');
                    fetchTicketHistory();
                  }}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                    ticketModalTab === 'history'
                      ? 'border-[#5b14b8] text-[#5b14b8]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Recent Tickets</span>
                  {tickets.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-[#5b14b8] text-[10px]">
                      {tickets.length}
                    </span>
                  )}
                </button>
              </div>

              {ticketModalTab === 'history' && (
                <button
                  type="button"
                  onClick={fetchTicketHistory}
                  disabled={isLoadingTickets}
                  title="Refresh tickets"
                  className="pb-2 text-slate-400 hover:text-[#5b14b8] transition-colors"
                >
                  <RefreshCw className={`size-3.5 ${isLoadingTickets ? 'animate-spin text-[#5b14b8]' : ''}`} />
                </button>
              )}
            </div>

            {/* Modal Body: New Ticket Form */}
            {ticketModalTab === 'new' ? (
              <form onSubmit={handleTicketSubmit} className="space-y-4 text-xs">
                {submissionError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span>{submissionError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-700 font-bold">Category</label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value as TicketCategory)}
                      disabled={isSubmitting}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                    >
                      <option value="CLINICAL">Clinical Workflow &amp; Cath Lab</option>
                      <option value="TECHNICAL">Technical &amp; Telemetry Issues</option>
                      <option value="ACCOUNT">Account Credentials &amp; 2FA</option>
                      <option value="BILLING">Billing &amp; Hospital Invoicing</option>
                      <option value="GENERAL">General Support Inquiry</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-bold">Priority</label>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value as TicketPriority)}
                      disabled={isSubmitting}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                    >
                      <option value="LOW">Normal — Routine Question</option>
                      <option value="MEDIUM">Medium — Standard Request</option>
                      <option value="HIGH">High — Workflow Delayed</option>
                      <option value="URGENT">STAT — Active Procedure Blocked</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Subject</label>
                  <input
                    type="text"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="e.g. Cine loop recorder lag during angiography"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Description of Issue</label>
                  <textarea
                    rows={4}
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Provide clinical context, patient reference ID (if applicable), and steps to reproduce..."
                    className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowTicketModal(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white font-bold hover:opacity-95 shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5" />
                        <span>Submit Ticket</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Modal Body: Ticket History */
              <div className="space-y-3 text-xs">
                {isLoadingTickets ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="size-5 animate-spin text-[#5b14b8]" />
                    <span>Loading ticket history...</span>
                  </div>
                ) : ticketHistoryError ? (
                  <div className="py-8 text-center text-xs text-rose-600 space-y-2">
                    <p>{ticketHistoryError}</p>
                    <button
                      type="button"
                      onClick={fetchTicketHistory}
                      className="text-[#5b14b8] font-semibold underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 space-y-1">
                    <Inbox className="size-8 text-slate-300 mx-auto mb-1" />
                    <div className="font-semibold text-slate-700">No support tickets found</div>
                    <p className="text-slate-400">You have not submitted any support tickets yet.</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                    {tickets.map((t) => {
                      const isExpanded = expandedTicketId === t.id;
                      const replyCount = t.replies ? t.replies.length : 0;
                      return (
                        <div
                          key={t.id}
                          className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-2 transition-all"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[#28006d]">
                                #{t.ticketNumber || t.id.slice(0, 8)}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(
                                  t.status
                                )}`}
                              >
                                {t.status}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getPriorityBadgeClass(
                                  t.priority
                                )}`}
                              >
                                {t.priority}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="size-3" />
                              {new Date(t.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>

                          <div className="font-semibold text-slate-900">{t.subject}</div>
                          <div className="text-slate-600 text-[11px] leading-relaxed whitespace-pre-line">
                            {t.description}
                          </div>

                          {/* Replies Thread Toggle */}
                          <div className="pt-2 border-t border-slate-200/60">
                            <button
                              type="button"
                              onClick={() => setExpandedTicketId(isExpanded ? null : t.id)}
                              className="text-[11px] text-[#5b14b8] font-bold flex items-center gap-1 hover:underline"
                            >
                              <span>Conversation Replies ({replyCount})</span>
                              <ChevronDown
                                className={`size-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>

                            {/* Expanded Conversation */}
                            {isExpanded && (
                              <div className="mt-2 space-y-2 pt-1 animate-in fade-in">
                                {t.replies && t.replies.length > 0 ? (
                                  t.replies.map((reply, idx) => (
                                    <div
                                      key={reply.id || idx}
                                      className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] space-y-1"
                                    >
                                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                                        <span className="font-semibold text-slate-700">
                                          {reply.userRole || 'Support Staff'}
                                        </span>
                                        <span>
                                          {reply.createdAt ? new Date(reply.createdAt).toLocaleTimeString() : ''}
                                        </span>
                                      </div>
                                      <p className="text-slate-800">{reply.message}</p>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-[11px] text-slate-400 italic">No replies yet.</div>
                                )}

                                {/* Add Reply Input */}
                                <div className="flex items-center gap-2 pt-1">
                                  <input
                                    type="text"
                                    value={replyDrafts[t.id] || ''}
                                    onChange={(e) =>
                                      setReplyDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))
                                    }
                                    placeholder="Add a follow-up reply..."
                                    className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#5b14b8]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddReply(t.id)}
                                    disabled={isSubmittingReply[t.id] || !replyDrafts[t.id]?.trim()}
                                    className="h-8 px-3 rounded-lg bg-[#5b14b8] text-white font-semibold text-xs hover:bg-[#28006d] disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {isSubmittingReply[t.id] ? (
                                      <Loader2 className="size-3 animate-spin" />
                                    ) : (
                                      <Send className="size-3" />
                                    )}
                                    <span>Reply</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowTicketModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Call Helpdesk Informational Dialog */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="size-12 rounded-full bg-purple-100 text-[#5b14b8] flex items-center justify-center mx-auto">
              <PhoneCall className="size-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Clinical IT Hotline</h3>
              <p className="text-xs text-slate-500">
                Direct institutional voice helpline status.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="text-slate-400 font-medium">Institutional Voice Gateway</div>
              <div className="text-sm font-bold text-slate-700 font-mono">Not Configured</div>
              <div className="text-[11px] text-slate-500">
                Direct telephone dispatch is currently unconfigured for this deployment environment.
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              For rapid tracked assistance with cath lab or telemetry workflows, please submit an IT support ticket.
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowCallModal(false);
                  setShowTicketModal(true);
                  setTicketModalTab('new');
                }}
                className="w-full py-2 px-4 rounded-xl bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white font-bold text-xs hover:opacity-95 shadow-xs"
              >
                Submit IT Support Ticket
              </button>
              <button
                type="button"
                onClick={() => setShowCallModal(false)}
                className="w-full py-2 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal & HIPAA Agreement Dialog */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {activeLegalModal === 'terms'
                  ? 'Terms of Service & Clinical Governance'
                  : 'HIPAA Compliance & Business Associate Agreement'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveLegalModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3 text-xs text-slate-600 pr-2">
              <p>
                <strong>1. Authorized Physician Access:</strong> Access to the CareID Doctor Web Portal is strictly limited to credentialed healthcare providers and privileged personnel. All patient interactions, diagnostic reports, and procedure orders are cryptographically logged for clinical audit trails.
              </p>
              <p>
                <strong>2. Patient Data Confidentiality:</strong> All Protected Health Information (PHI) is encrypted at rest and in transit in accordance with HIPAA Security Rules (45 CFR Part 160 and Part 164). Unauthorized export or retention of medical imagery is strictly prohibited.
              </p>
              <p>
                <strong>3. Clinical Decision Support:</strong> Algorithmic laboratory interpretations and OCR extractions serve solely as clinical decision support tools and do not substitute for independent professional medical judgment.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveLegalModal(null)}
                className="px-5 py-2 rounded-xl bg-[#28006d] text-white font-bold text-xs hover:bg-[#3f1d8b]"
              >
                Acknowledge &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
