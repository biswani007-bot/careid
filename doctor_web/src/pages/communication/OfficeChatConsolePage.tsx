/**
 * CareID Doctor Web — Office Chat Console (CR-07)
 * 2-way doctor ↔ patient secure messaging via /api/v1/conversations
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  RefreshCw,
  Search,
  Plus,
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  User,
  X,
  Settings,
  Edit2,
  Trash2,
  Bookmark,
} from 'lucide-react';
import {
  chatService,
  Conversation,
  DirectMessage,
  CreateConversationPayload,
  ChatTemplate,
} from '@/services/chatService';
import { patientService, PatientListItem } from '@/services/patientService';
import { useAuth } from '@/context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── New Conversation Modal ───────────────────────────────────────────────────

interface NewChatModalProps {
  onClose: () => void;
  onCreate: (payload: CreateConversationPayload) => Promise<void>;
  initialPatientId?: string;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ onClose, onCreate, initialPatientId }) => {
  const [participantId, setParticipantId] = useState(initialPatientId || '');
  const [patientSearch, setPatientSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setPatientsLoading(true);
    patientService
      .listPatients({ limit: 100 })
      .then((res) => {
        if (active && res.data) {
          setPatients(res.data);
          if (initialPatientId) {
            setParticipantId(initialPatientId);
          } else if (res.data.length > 0 && !participantId) {
            setParticipantId(res.data[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setPatientsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialPatientId]);

  const filteredPatients = patients.filter((p) => {
    if (!patientSearch.trim()) return true;
    const q = patientSearch.toLowerCase();
    const name = (p.fullName || `${p.firstName} ${p.lastName}`).toLowerCase();
    const num = (p.patientNumber || '').toLowerCase();
    return name.includes(q) || num.includes(q);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantId.trim()) {
      setError('Patient selection or Profile ID is required.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onCreate({
        participantId: participantId.trim(),
        subject: subject.trim() || undefined,
        initialMessage: initialMessage.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create conversation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-[#e1e3e4]">
          <h3 className="text-base font-semibold text-[#1a1a2e]">New Conversation</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Patient <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setManualEntry(!manualEntry)}
                className="text-xs text-[#006666] hover:underline"
              >
                {manualEntry ? 'Select from directory' : 'Enter UUID directly'}
              </button>
            </div>
            {manualEntry ? (
              <input
                type="text"
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                placeholder="Enter patient profile UUID…"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e1e3e4] text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006666]/30 focus:border-[#006666]"
                required
              />
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPatientSearch(val);
                      const q = val.toLowerCase().trim();
                      if (q) {
                        const match = patients.find(
                          (p) =>
                            (p.fullName || `${p.firstName} ${p.lastName}`).toLowerCase().includes(q) ||
                            (p.patientNumber || '').toLowerCase().includes(q)
                        );
                        setParticipantId(match ? match.id : '');
                      } else {
                        if (initialPatientId && patients.some((p) => p.id === initialPatientId)) {
                          setParticipantId(initialPatientId);
                        } else if (patients.length > 0) {
                          setParticipantId(patients[0].id);
                        }
                      }
                    }}
                    placeholder="Search patient by name or ID…"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#e1e3e4] text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006666]/30 focus:border-[#006666]"
                  />
                </div>
                <select
                  value={participantId}
                  onChange={(e) => setParticipantId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e1e3e4] text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#006666]/30 focus:border-[#006666]"
                  required
                >
                  <option value="" disabled>
                    {patientsLoading ? 'Loading patients…' : filteredPatients.length === 0 ? 'No matching patients' : 'Choose a patient…'}
                  </option>
                  {initialPatientId && !filteredPatients.some((p) => p.id === initialPatientId) && (
                    <option key={initialPatientId} value={initialPatientId}>
                      Selected Patient ({initialPatientId})
                    </option>
                  )}
                  {filteredPatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName || `${p.firstName} ${p.lastName}`} {p.patientNumber ? `(${p.patientNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Consultation topic (optional)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e1e3e4] text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006666]/30 focus:border-[#006666]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Initial Message</label>
            <textarea
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Opening message to patient (optional)"
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e1e3e4] text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006666]/30 focus:border-[#006666] resize-none"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#e1e3e4] text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-[#006666] text-white text-sm font-semibold hover:bg-[#005555] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating…' : 'Start Conversation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Message Bubble ───────────────────────────────────────────────────────────

const MessageBubble: React.FC<{ msg: DirectMessage; isOwn: boolean }> = ({ msg, isOwn }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
    {!isOwn && (
      <div className="size-7 rounded-full bg-slate-200 flex items-center justify-center mr-2 mt-1 shrink-0">
        <User size={14} className="text-slate-500" />
      </div>
    )}
    <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
      <div
        className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? 'bg-[#006666] text-white rounded-tr-sm'
            : 'bg-white border border-[#e1e3e4] text-slate-800 rounded-tl-sm'
        }`}
      >
        {msg.content}
      </div>
      <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
        <span className="text-[10px] text-slate-400">{formatTime(msg.createdAt)}</span>
        {isOwn && (
          <span className="text-[10px] text-slate-400">
            {msg.isRead ? (
              <CheckCheck size={12} className="text-[#006666]" />
            ) : (
              <Check size={12} className="text-slate-400" />
            )}
          </span>
        )}
      </div>
    </div>
  </div>
);

// ─── Quick Reply Templates & Management (CR-07) ──────────────────────────────

const DEFAULT_FALLBACK_TEMPLATES: ChatTemplate[] = [
  { id: 'tpl-1', title: 'Appointment Confirmation', content: 'Your appointment is confirmed for the scheduled time.' },
  { id: 'tpl-2', title: 'Medication Adherence', content: 'Please take your prescribed medication as directed.' },
  { id: 'tpl-3', title: 'Lab Results Ready', content: 'Your test results are ready. Please come in for a follow-up.' },
  { id: 'tpl-4', title: 'Request Received', content: 'We have received your request and will respond shortly.' },
  { id: 'tpl-5', title: 'Post-Visit Care', content: 'Please rest and ensure adequate hydration.' },
];

interface ManageTemplatesModalProps {
  onClose: () => void;
  templates: ChatTemplate[];
  onInsert: (content: string) => void;
  onRefresh: () => Promise<void>;
}

const ManageTemplatesModal: React.FC<ManageTemplatesModalProps> = ({
  onClose,
  templates,
  onInsert,
  onRefresh,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      setError('Title and content are required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await chatService.createTemplate({
        title: newTitle.trim(),
        content: newContent.trim(),
      });
      setNewTitle('');
      setNewContent('');
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save template.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (tpl: ChatTemplate) => {
    setEditingId(tpl.id);
    setEditTitle(tpl.title);
    setEditContent(tpl.content);
    setError(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim() || !editContent.trim()) {
      setError('Title and content cannot be empty.');
      return;
    }
    setSubmitting(true);
    try {
      await chatService.updateTemplate(id, {
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      setEditingId(null);
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update template.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this response template?')) return;
    setSubmitting(true);
    try {
      await chatService.deleteTemplate(id);
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete template.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[#e1e3e4]">
          <div className="flex items-center gap-2">
            <Bookmark size={18} className="text-[#006666]" />
            <h3 className="text-base font-semibold text-[#1a1a2e]">Manage Office Chat Templates (CR-07)</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Create New Template Section */}
          <form onSubmit={handleCreate} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">+ Add New Template</h4>
            <div>
              <input
                type="text"
                placeholder="Template Title (e.g. Follow-Up Lab Schedule)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#006666]"
                required
              />
            </div>
            <div>
              <textarea
                placeholder="Template message content inserted into chat composer..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#006666] resize-none"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !newTitle.trim() || !newContent.trim()}
                className="px-3 py-1.5 rounded-lg bg-[#006666] text-white text-xs font-semibold hover:bg-[#005555] disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                {submitting && <RefreshCw size={12} className="animate-spin" />}
                <span>Save Template</span>
              </button>
            </div>
          </form>

          {/* Existing Templates List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Saved Templates ({templates.length})</h4>
            {templates.length === 0 ? (
              <p className="text-xs text-slate-400">No response templates configured.</p>
            ) : (
              <div className="space-y-2">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#006666]/40 transition-colors space-y-2">
                    {editingId === tpl.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#006666]"
                        />
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={2}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#006666] resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(tpl.id)}
                            disabled={submitting}
                            className="px-2.5 py-1 rounded-lg bg-[#006666] text-white text-xs font-semibold hover:bg-[#005555]"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-slate-800">{tpl.title}</div>
                          <div className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{tpl.content}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onInsert(tpl.content);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-md bg-[#006666]/10 text-[#006666] text-[11px] font-semibold hover:bg-[#006666]/20 transition-colors"
                            title="Insert into chat input"
                          >
                            Insert
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(tpl)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Edit template"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tpl.id)}
                            className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete template"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const OfficeChatConsolePage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryPatientId = searchParams.get('patientId');
  const queryConvoId = searchParams.get('conversationId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [templates, setTemplates] = useState<ChatTemplate[]>(DEFAULT_FALLBACK_TEMPLATES);
  const [showManageTemplates, setShowManageTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const convos = await chatService.getConversations();
      // Sort by lastMessageAt desc
      convos.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      setConversations(convos);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const items = await chatService.getTemplates();
      if (items && items.length > 0) {
        setTemplates(items);
      }
    } catch {
      // Keep default templates
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadTemplates();
  }, [loadConversations, loadTemplates]);

  const selectConversation = useCallback(async (convo: Conversation) => {
    setSelected(convo);
    setMessages([]);
    setMessagesLoading(true);
    try {
      const msgs = await chatService.getMessages(convo.id);
      msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(msgs);
      // Mark as read
      await chatService.markAsRead(convo.id).catch(() => {});
      setConversations((prev) =>
        prev.map((c) => (c.id === convo.id ? { ...c, unreadCount: 0 } : c))
      );
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, []);

  // Auto-select conversation or open new modal if query parameter is provided
  const autoHandledPatientRef = useRef<string | null>(null);
  const autoHandledConvoRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (queryConvoId) {
      if (autoHandledConvoRef.current === queryConvoId) return;
      const target = conversations.find((c) => c.id === queryConvoId);
      if (target) {
        autoHandledConvoRef.current = queryConvoId;
        if (target.id !== selected?.id) {
          selectConversation(target);
        }
      }
    } else if (queryPatientId) {
      if (autoHandledPatientRef.current === queryPatientId) return;
      const target = conversations.find((c) => c.patientProfileId === queryPatientId);
      if (target) {
        autoHandledPatientRef.current = queryPatientId;
        if (target.id !== selected?.id) {
          selectConversation(target);
        }
      } else {
        autoHandledPatientRef.current = queryPatientId;
        setShowNewChat(true);
      }
    }
  }, [loading, conversations, queryConvoId, queryPatientId, selectConversation, selected?.id]);

  // Periodic near-real-time polling for active messages (every 4 seconds)
  useEffect(() => {
    if (!selected) return;
    let active = true;
    const interval = setInterval(async () => {
      if (sending || messagesLoading) return;
      try {
        const msgs = await chatService.getMessages(selected.id);
        if (!active) return;
        msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMessages((prev) => {
          if (
            prev.length !== msgs.length ||
            (msgs.length > 0 && prev[prev.length - 1]?.id !== msgs[msgs.length - 1]?.id)
          ) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
            return msgs;
          }
          return prev;
        });
      } catch {
        // Silent polling catch
      }
    }, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selected, sending, messagesLoading]);

  const handleSend = useCallback(async () => {
    if (!selected || !messageInput.trim() || sending) return;
    const content = messageInput.trim();
    setMessageInput('');
    setSending(true);
    setShowQuickReplies(false);
    try {
      const msg = await chatService.sendMessage(selected.id, { content });
      setMessages((prev) => [...prev, msg]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selected.id
            ? { ...c, lastMessage: msg, lastMessageAt: msg.createdAt }
            : c
        )
      );
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      setMessageInput(content); // restore on error
    } finally {
      setSending(false);
    }
  }, [selected, messageInput, sending]);

  const handleCreateConversation = useCallback(async (payload: CreateConversationPayload) => {
    const convo = await chatService.createConversation(payload);
    setConversations((prev) => [convo, ...prev]);
    await selectConversation(convo);
  }, [selectConversation]);

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.patientName?.toLowerCase().includes(q) ||
      c.subject?.toLowerCase().includes(q) ||
      c.lastMessage?.content?.toLowerCase().includes(q)
    );
  });

  const isOwnMessage = useCallback(
    (msg: DirectMessage) => {
      const myUserId = user?.userId || user?.id;
      return (
        msg.senderUserId === myUserId ||
        msg.senderUserId === user?.id ||
        msg.senderUserId === user?.userId ||
        msg.senderRole === 'DOCTOR'
      );
    },
    [user?.id, user?.userId]
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#f8f9fb]">
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onCreate={handleCreateConversation}
          initialPatientId={queryPatientId || undefined}
        />
      )}

      {/* Left pane — conversation list */}
      <div className="w-80 shrink-0 bg-white border-r border-[#e1e3e4] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#e1e3e4]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#1a1a2e] flex items-center gap-2">
              <MessageSquare size={18} className="text-[#006666]" />
              Inbox
            </h2>
            <button
              onClick={() => setShowNewChat(true)}
              className="size-8 rounded-lg bg-[#006666] text-white flex items-center justify-center hover:bg-[#005555] transition-colors"
              title="New conversation"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#e1e3e4] text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006666]/30"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <RefreshCw size={18} className="animate-spin mr-2" />
              Loading…
            </div>
          )}
          {!loading && error && (
            <div className="p-4 text-center text-sm text-red-600">
              <AlertCircle size={20} className="mx-auto mb-1" />
              {error}
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-400">
              <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
              {search ? 'No matches.' : 'No conversations yet.'}
            </div>
          )}
          {filtered.map((convo) => (
            <button
              key={convo.id}
              onClick={() => selectConversation(convo)}
              className={`w-full text-left p-3.5 border-b border-[#e1e3e4]/60 hover:bg-slate-50 transition-colors ${
                selected?.id === convo.id ? 'bg-[#006666]/5 border-l-2 border-l-[#006666]' : ''
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="size-9 rounded-full bg-[#3f1d8b]/10 flex items-center justify-center shrink-0 text-xs font-semibold text-[#3f1d8b]">
                  {(convo.patientName || 'PT').trim().slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800 truncate">
                      {convo.patientName || 'Patient'}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                      {formatTime(convo.lastMessageAt)}
                    </span>
                  </div>
                  {convo.subject && (
                    <p className="text-xs text-slate-500 truncate">{convo.subject}</p>
                  )}
                  {convo.lastMessage && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {convo.lastMessage.content}
                    </p>
                  )}
                </div>
                {convo.unreadCount > 0 && (
                  <span className="size-5 rounded-full bg-[#006666] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {convo.unreadCount > 9 ? '9+' : convo.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Refresh */}
        <div className="p-3 border-t border-[#e1e3e4]">
          <button
            onClick={loadConversations}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-slate-500 hover:text-[#006666] transition-colors"
          >
            <RefreshCw size={12} />
            Refresh conversations
          </button>
        </div>
      </div>

      {/* Right pane — chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p className="text-sm">Select a conversation to start messaging</p>
            <button
              onClick={() => setShowNewChat(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#006666] text-white text-sm font-medium hover:bg-[#005555] transition-colors"
            >
              <Plus size={16} />
              New Conversation
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-[#e1e3e4] px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#1a1a2e]">
                  {selected.patientName || 'Patient'}
                </h3>
                {selected.subject && (
                  <p className="text-xs text-slate-500">{selected.subject}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock size={11} />
                  {formatTime(selected.createdAt)}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#f8f9fb]">
              {messagesLoading && (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <RefreshCw size={16} className="animate-spin mr-2" />
                  Loading messages…
                </div>
              )}
              {!messagesLoading && messages.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-8">
                  No messages yet. Start the conversation.
                </div>
              )}
              {!messagesLoading &&
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isOwn={isOwnMessage(msg)}
                  />
                ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies */}
            {showQuickReplies && (
              <div className="bg-white border-t border-[#e1e3e4] px-4 py-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500 font-medium">Quick Reply Templates (CR-07)</p>
                  <button
                    onClick={() => setShowManageTemplates(true)}
                    className="text-xs text-[#006666] hover:underline font-semibold flex items-center gap-1"
                  >
                    <Settings size={12} />
                    <span>Manage Templates</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        setMessageInput(tpl.content);
                        setShowQuickReplies(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs text-slate-700 hover:bg-[#006666]/10 hover:text-[#006666] transition-colors text-left"
                      title={tpl.content}
                    >
                      {tpl.title || tpl.content}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="bg-white border-t border-[#e1e3e4] px-4 py-3 flex items-end gap-3">
              <button
                onClick={() => setShowQuickReplies((v) => !v)}
                className="shrink-0 size-9 rounded-xl border border-[#e1e3e4] flex items-center justify-center text-slate-500 hover:border-[#006666] hover:text-[#006666] transition-colors"
                title="Quick replies"
              >
                <MessageSquare size={16} />
              </button>
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message… (Enter to send)"
                rows={1}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#e1e3e4] text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006666]/30 focus:border-[#006666] resize-none"
                style={{ minHeight: '42px', maxHeight: '120px' }}
              />
              <button
                onClick={handleSend}
                disabled={!messageInput.trim() || sending}
                className="shrink-0 size-9 rounded-xl bg-[#006666] text-white flex items-center justify-center hover:bg-[#005555] disabled:opacity-40 transition-colors"
              >
                {sending ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Manage Templates Modal (CR-07) */}
      {showManageTemplates && (
        <ManageTemplatesModal
          onClose={() => setShowManageTemplates(false)}
          templates={templates}
          onInsert={(content) => {
            setMessageInput(content);
            setShowManageTemplates(false);
          }}
          onRefresh={loadTemplates}
        />
      )}
    </div>
  );
};

export default OfficeChatConsolePage;
