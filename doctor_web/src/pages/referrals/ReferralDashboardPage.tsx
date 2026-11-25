import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Download,
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Printer,
  ShieldCheck,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  ReferralRecord,
  mapBackendReferralToRecord,
} from './types';
import { referralService } from '@/services/referralService';
import { authService } from '@/services/authService';
import doctorAvatarPrimary from '@/assets/avatars/doctor-profile-primary.png';

const PAGE_SIZE = 10;

export const ReferralDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentDoctorId, setCurrentDoctorId] = useState<string | null>(null);

  const [backendStats, setBackendStats] = useState({
    totalReferrals: 0,
    pendingTriageCount: 0,
    acceptedCount: 0,
    completedCount: 0,
    avgCompletionTimeHours: 0,
  });

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Fetch live referrals and metrics from backend
  const loadReferralData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Resolve current authenticated doctor profile
      let docId = currentDoctorId;
      try {
        const docProfile = await authService.getDoctorMe();
        if (docProfile?.id) {
          docId = docProfile.id;
          setCurrentDoctorId(docProfile.id);
        }
      } catch (docErr) {
        console.warn('Could not fetch doctor profile claims:', docErr);
      }

      // 2. Fetch referrals in parallel: All list, Incoming, Outgoing, and Dashboard Stats
      const [allListRes, incomingRes, outgoingRes, statsRes] = await Promise.allSettled([
        referralService.getReferrals({ limit: 100 }),
        referralService.getIncomingReferrals({ limit: 100 }),
        referralService.getOutgoingReferrals({ limit: 100 }),
        referralService.getDashboardStats(),
      ]);

      // Process stats
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setBackendStats({
          totalReferrals: statsRes.value.totalReferrals ?? 0,
          pendingTriageCount: statsRes.value.pendingTriageCount ?? 0,
          acceptedCount: statsRes.value.acceptedCount ?? 0,
          completedCount: statsRes.value.completedCount ?? 0,
          avgCompletionTimeHours: statsRes.value.avgCompletionTimeHours ?? 0,
        });
      }

      // Merge records by ID to eliminate duplication while capturing complete metadata
      const recordsMap = new Map<string, ReferralRecord>();

      if (allListRes.status === 'fulfilled' && Array.isArray(allListRes.value.data)) {
        for (const item of allListRes.value.data) {
          recordsMap.set(item.id, mapBackendReferralToRecord(item, docId || undefined));
        }
      }

      if (incomingRes.status === 'fulfilled' && Array.isArray(incomingRes.value.data)) {
        for (const item of incomingRes.value.data) {
          const mapped = mapBackendReferralToRecord(item, docId || undefined);
          mapped.direction = 'incoming';
          recordsMap.set(item.id, mapped);
        }
      }

      if (outgoingRes.status === 'fulfilled' && Array.isArray(outgoingRes.value.data)) {
        for (const item of outgoingRes.value.data) {
          const mapped = mapBackendReferralToRecord(item, docId || undefined);
          mapped.direction = 'outgoing';
          recordsMap.set(item.id, mapped);
        }
      }

      const combinedRecords = Array.from(recordsMap.values());
      // Sort descending by date
      combinedRecords.sort((a, b) => (a.id < b.id ? 1 : -1));
      setReferrals(combinedRecords);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load live referrals from server.';
      setErrorMessage(msg);
      triggerToast(`Network error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentDoctorId]);

  useEffect(() => {
    loadReferralData();
  }, [loadReferralData]);

  // Filtered referrals
  const filteredReferrals = useMemo(() => {
    return referrals.filter((item) => {
      // Tab filtering
      if (selectedFilter === 'Outgoing' && item.direction !== 'outgoing') return false;
      if (selectedFilter === 'Incoming' && item.direction !== 'incoming') return false;
      if (selectedFilter === 'Pending' && item.status !== 'pending') return false;
      if (selectedFilter === 'Accepted' && item.status !== 'accepted') return false;
      if (selectedFilter === 'Urgent' && item.priority !== 'urgent') return false;

      // Search query filtering
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesPatient = item.patient.name.toLowerCase().includes(query);
        const matchesId = item.refNumber.toLowerCase().includes(query);
        const matchesSpecialty = item.specialty.toLowerCase().includes(query);
        const matchesDoctor =
          item.referringProvider.name.toLowerCase().includes(query) ||
          item.receivingProvider.name.toLowerCase().includes(query);
        const matchesFacility =
          item.referringProvider.facility.toLowerCase().includes(query) ||
          item.receivingProvider.facility.toLowerCase().includes(query);
        if (!matchesPatient && !matchesId && !matchesSpecialty && !matchesDoctor && !matchesFacility) {
          return false;
        }
      }

      return true;
    });
  }, [referrals, selectedFilter, searchQuery]);

  // Dynamic statistics calculated strictly from authenticated doctor's live records
  const stats = useMemo(() => {
    let outgoingCount = 0;
    let incomingCount = 0;
    let pendingCount = 0;
    let completedCount = 0;
    let urgentCount = 0;

    for (const r of referrals) {
      if (r.direction === 'outgoing') outgoingCount++;
      if (r.direction === 'incoming') incomingCount++;
      if (r.status === 'pending') pendingCount++;
      if (r.status === 'completed') completedCount++;
      if (r.priority === 'urgent' && r.status !== 'completed' && r.status !== 'declined' && r.status !== 'cancelled') {
        urgentCount++;
      }
    }

    return {
      outgoing: outgoingCount,
      incoming: incomingCount,
      pending: backendStats.pendingTriageCount > 0 ? backendStats.pendingTriageCount : pendingCount,
      completed: backendStats.completedCount > 0 ? backendStats.completedCount : completedCount,
      urgent: urgentCount,
    };
  }, [referrals, backendStats]);

  // Pagination calculation
  const totalItems = filteredReferrals.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const paginatedReferrals = filteredReferrals.slice(startIndex, endIndex);

  // Export handler: Generates CSV from real records or informs user
  const handleExport = () => {
    if (referrals.length === 0) {
      triggerToast('No live referral records available to export.');
      return;
    }

    try {
      const headers = ['Referral Number', 'Patient Name', 'Patient MRN', 'Direction', 'Specialty', 'Priority', 'Status', 'Date', 'Referring Doctor', 'Receiving Doctor'];
      const csvRows = [
        headers.join(','),
        ...referrals.map((r) =>
          [
            `"${r.refNumber}"`,
            `"${r.patient.name}"`,
            `"${r.patient.mrn}"`,
            `"${r.direction}"`,
            `"${r.specialty}"`,
            `"${r.priority}"`,
            `"${r.status}"`,
            `"${r.date}"`,
            `"${r.referringProvider.name}"`,
            `"${r.receivingProvider.name}"`,
          ].join(',')
        ),
      ];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `careid_referrals_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast('Exported authentic referral audit log CSV.');
    } catch {
      triggerToast('Failed to generate export file.');
    }
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#0b1c30] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-purple-500/30 text-xs animate-in fade-in slide-in-from-top-2">
          <ShieldCheck className="w-4 h-4 text-[#5af8fb] shrink-0" />
          <span className="font-medium">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setShowToast(false)}
            className="text-slate-400 hover:text-white ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header and Global Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Referral Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage incoming and outgoing patient transfers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadReferralData}
            disabled={isLoading}
            className="p-2.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-[#5b14b8] hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh referrals from server"
            aria-label="Refresh referrals"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin text-[#5b14b8]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/referrals/new')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#20005a] hover:bg-[#320078] active:scale-[0.98] text-white text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
          >
            <div className="size-5 rounded-full bg-white/20 flex items-center justify-center">
              <Plus className="size-3.5 stroke-[3]" />
            </div>
            <span>New Referral</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-xs text-red-700 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={loadReferralData}
            className="font-semibold underline hover:text-red-900"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 5 Bento Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* 1. Outgoing Referrals */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <ArrowUpRight className="size-5 text-slate-600" />
            <span className="px-2.5 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 rounded-full">
              Live Total
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900">
              {isLoading ? '...' : stats.outgoing}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Outgoing Referrals</div>
          </div>
        </div>

        {/* 2. Incoming Referrals */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <ArrowDownLeft className="size-5 text-slate-600" />
            <span className="px-2.5 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 rounded-full">
              Live Total
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900">
              {isLoading ? '...' : stats.incoming}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Incoming Referrals</div>
          </div>
        </div>

        {/* 3. Pending Action */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Clock className="size-5 text-teal-600" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-teal-600">
              {isLoading ? '...' : stats.pending}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Pending Action</div>
          </div>
        </div>

        {/* 4. Completed (30d) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <CheckCircle2 className="size-5 text-teal-700" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900">
              {isLoading ? '...' : stats.completed}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Completed (30d)</div>
          </div>
        </div>

        {/* 5. Urgent Attention */}
        <div className="bg-[#feecee] rounded-2xl border border-[#fecdd3] p-5 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <TriangleAlert className="size-5 text-red-600" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-red-600">
              {isLoading ? '...' : stats.urgent}
            </div>
            <div className="text-xs font-semibold text-red-700 mt-1">Urgent Attention</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search / Export Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['All', 'Outgoing', 'Incoming', 'Pending', 'Accepted', 'Urgent'].map((tab) => {
            const isSelected = selectedFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setSelectedFilter(tab);
                  setCurrentPage(1);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#3f1d8b] text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Search Bar & Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search referrals..."
              className="h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30 w-44 sm:w-56"
            />
          </div>

          <button
            type="button"
            onClick={() => triggerToast('Advanced referral filtering modal opened')}
            className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 shadow-sm"
          >
            <SlidersHorizontal className="size-3.5 text-slate-500" />
            <span>More Filters</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="size-9 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center justify-center shadow-sm"
            aria-label="Export records"
            title="Export CSV"
          >
            <Download className="size-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Referrals Data Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0px_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-semibold text-slate-500 tracking-wider">
                <th className="py-3.5 px-6">Patient Details</th>
                <th className="py-3.5 px-4">ID</th>
                <th className="py-3.5 px-4">Direction / Doctor</th>
                <th className="py-3.5 px-4">Specialty</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="size-6 text-[#5b14b8] animate-spin" />
                      <span>Loading real-time referral records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No referrals match your current filters.
                  </td>
                </tr>
              ) : (
                paginatedReferrals.map((item) => {
                  const isUrgent = item.priority === 'urgent';
                  const isOutgoing = item.direction === 'outgoing';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/referrals/${item.id}`)}
                    >
                      {/* Patient Details */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {item.patient.avatarUrl ? (
                            <img
                              src={doctorAvatarPrimary}
                              alt={item.patient.name}
                              className="size-9 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="size-9 rounded-full bg-purple-50 text-purple-700 font-semibold text-xs flex items-center justify-center border border-purple-100">
                              {item.patient.initials || 'PT'}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-[#5b14b8] transition-colors">
                              {item.patient.name}
                            </div>
                            <div className="text-xs text-slate-400">
                              DOB: {item.patient.dob}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ID */}
                      <td className="py-4 px-4 font-mono text-xs text-slate-500">
                        {item.refNumber}
                      </td>

                      {/* Direction / Doctor */}
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-2">
                          {isOutgoing ? (
                            <ArrowUpRight className="size-4 text-slate-400 shrink-0 mt-0.5" />
                          ) : (
                            <ArrowDownLeft className="size-4 text-slate-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="text-xs font-medium text-slate-800">
                              {isOutgoing
                                ? item.receivingProvider.name
                                : item.referringProvider.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {isOutgoing
                                ? item.receivingProvider.facility
                                : item.referringProvider.facility}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Specialty */}
                      <td className="py-4 px-4 text-xs font-medium text-slate-700">
                        {item.specialty}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-xs text-slate-500">
                        {item.date}
                      </td>

                      {/* Priority */}
                      <td className="py-4 px-4">
                        {isUrgent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#feecee] text-[#d92d20] border border-[#fecdd3]">
                            <TriangleAlert className="size-3" />
                            <span>Urgent</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                            Routine
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`size-2 rounded-full ${
                              item.status === 'pending'
                                ? 'bg-teal-500'
                                : item.status === 'accepted'
                                ? 'bg-[#3f1d8b]'
                                : item.status === 'completed'
                                ? 'bg-slate-400'
                                : 'bg-blue-500'
                            }`}
                          />
                          <span className="text-xs font-medium text-slate-800 capitalize">
                            {item.status === 'under_review' ? 'Under Review' : item.status}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-4 px-6 text-right relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuId(activeMenuId === item.id ? null : item.id)
                          }
                          className="size-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
                          aria-label="More actions"
                        >
                          <MoreVertical className="size-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuId === item.id && (
                          <div className="absolute right-6 top-12 z-20 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 text-xs animate-in fade-in zoom-in-95">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                navigate(`/referrals/${item.id}`);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                            >
                              <Eye className="size-3.5 text-slate-400" />
                              <span>View Referral Details</span>
                            </button>

                            {item.direction === 'incoming' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  navigate(`/referrals/incoming/${item.id}`);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-[#5b14b8] font-medium"
                              >
                                <FileText className="size-3.5 text-[#5b14b8]" />
                                <span>Review Incoming Triage</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                triggerToast(`Printing referral ${item.refNumber} slip...`);
                                window.print();
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                            >
                              <Printer className="size-3.5 text-slate-400" />
                              <span>Print Referral Slip</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing {totalItems === 0 ? 0 : startIndex + 1}–{endIndex} of {totalItems} referrals
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={validCurrentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="size-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`size-8 rounded-lg font-medium flex items-center justify-center ${
                  validCurrentPage === pageNum
                    ? 'bg-[#3f1d8b] text-white'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              disabled={validCurrentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="size-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
