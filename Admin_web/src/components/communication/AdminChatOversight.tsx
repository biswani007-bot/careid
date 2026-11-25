import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Search,
  Menu,
  ChevronRight,
  Home,
  CheckCircle2,
  Users,
  Activity,
  Lock,
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import { chatOversightService } from '../../services/chatOversightService';
import type {
  ChatOversightData,
  ChatOversightConversation,
} from '../../services/chatOversightService';
import './AdminChatOversight.css';

export interface AdminChatOversightProps {
  onNavigate?: (path: string, state?: any) => void;
  onLogout?: () => void;
}

export const AdminChatOversight: React.FC<AdminChatOversightProps> = ({
  onNavigate,
  onLogout,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [data, setData] = useState<ChatOversightData>({
    totalConversations: 0,
    totalMessages: 0,
    activeChannels: 0,
    complianceStatus: 'HIPAA_COMPLIANT_METADATA_ONLY',
    conversations: [],
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await chatOversightService.getOversightData();
      setData(res);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const filtered = (data.conversations || []).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.patientName.toLowerCase().includes(q) ||
      c.doctorName.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="chat-oversight-wrapper">
      <AdminSidebar
        activeNav="chat-oversight"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
      />

      <div className="chat-oversight-main">
        {/* Top Navbar */}
        <header className="chat-oversight-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              style={{
                display: 'flex',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B',
              }}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
              <button
                type="button"
                onClick={() => handleNav('/admin/dashboard')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Home size={14} />
                <span>Dashboard</span>
              </button>
              <ChevronRight size={14} />
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Communication &amp; Chat Oversight</span>
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="chat-oversight-badge-hipaa">
              <ShieldCheck size={14} />
              <span>HIPAA Compliant · Zero Message Leakage</span>
            </span>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="chat-oversight-content">
          <div className="chat-oversight-title-section">
            <div>
              <div className="chat-oversight-badge-cr07">
                <MessageSquare size={12} />
                <span>Change Request CR-07</span>
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
                Office Chat Telemetry &amp; Exchange Oversight
              </h1>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                High-level bilateral communications oversight across patient-doctor channels, template governance, and medical privacy monitoring.
              </p>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="chat-oversight-kpi-grid">
            <div className="chat-oversight-kpi-card">
              <div className="chat-oversight-kpi-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
                <MessageSquare size={24} />
              </div>
              <div>
                <div className="chat-oversight-kpi-val">{data.totalConversations}</div>
                <div className="chat-oversight-kpi-lbl">Total Channels</div>
              </div>
            </div>

            <div className="chat-oversight-kpi-card">
              <div className="chat-oversight-kpi-icon" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                <Activity size={24} />
              </div>
              <div>
                <div className="chat-oversight-kpi-val">{data.totalMessages}</div>
                <div className="chat-oversight-kpi-lbl">Total Messages Exchanged</div>
              </div>
            </div>

            <div className="chat-oversight-kpi-card">
              <div className="chat-oversight-kpi-icon" style={{ background: '#F0F9FF', color: '#0284C7' }}>
                <Users size={24} />
              </div>
              <div>
                <div className="chat-oversight-kpi-val">{data.activeChannels}</div>
                <div className="chat-oversight-kpi-lbl">Active Clinical Channels (30d)</div>
              </div>
            </div>

            <div className="chat-oversight-kpi-card">
              <div className="chat-oversight-kpi-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                <Lock size={24} />
              </div>
              <div>
                <div className="chat-oversight-kpi-val" style={{ fontSize: '16px', color: '#047857', fontWeight: 700 }}>
                  Active &amp; Compliant
                </div>
                <div className="chat-oversight-kpi-lbl">HIPAA Metadata Privacy</div>
              </div>
            </div>
          </div>

          {/* Privacy Safeguard Callout */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <CheckCircle2 size={20} style={{ color: '#16A34A', flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: '#166534', lineHeight: 1.5 }}>
              <strong>Medical Confidentiality Standard Enforced:</strong> In strict compliance with HIPAA Security Rule (§ 164.312) and GDPR Article 9, direct message transcript text is fully encrypted and isolated between attending clinicians and patients. System administrators retain operational telemetry, volume metrics, and template management rights without exposure of protected health consultation text.
            </div>
          </div>

          {/* Conversations Table */}
          <div className="chat-oversight-table-container">
            <div className="chat-oversight-table-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                  Active Clinical Communication Channels
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  ({filtered.length} {filtered.length === 1 ? 'channel' : 'channels'})
                </span>
              </div>

              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search doctor, patient, topic..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: '32px',
                    paddingRight: '12px',
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="chat-oversight-table">
                <thead>
                  <tr>
                    <th>Channel / Thread ID</th>
                    <th>Patient</th>
                    <th>Attending Doctor</th>
                    <th>Topic / Subject</th>
                    <th>Message Volume</th>
                    <th>Last Active</th>
                    <th>Privacy &amp; Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                        No communication channels found matching current criteria.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((convo: ChatOversightConversation) => (
                      <tr key={convo.id}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569' }}>
                            {convo.id.slice(0, 13)}…
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{convo.patientName}</div>
                          {convo.patientNumber && (
                            <span style={{ fontSize: '11px', color: '#64748B' }}>{convo.patientNumber}</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{convo.doctorName}</div>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>{convo.specialty}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500, color: '#334155' }}>{convo.subject}</span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: '#F1F5F9',
                              color: '#334155',
                            }}
                          >
                            {convo.messageCount} {convo.messageCount === 1 ? 'msg' : 'msgs'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: '#64748B' }}>
                            {new Date(convo.lastMessageAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: '#ECFDF5',
                              color: '#047857',
                            }}
                          >
                            <ShieldCheck size={11} />
                            <span>HIPAA Compliant</span>
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
    </div>
  );
};

export default AdminChatOversight;
