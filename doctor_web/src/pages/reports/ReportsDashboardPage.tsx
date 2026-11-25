import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudUpload,
  Download,
  Eye,
  FileText,
  FlaskConical,
  Loader2,
  Plus,
  RotateCw,
  Scan,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ReportRecord, ReportType } from './types';
import { reportService, ReportItemDTO } from '@/services/reportService';

function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'PT';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function mapToReportType(category?: string, title?: string): ReportType {
  const c = (category || '').toUpperCase();
  const t = (title || '').toLowerCase();
  if (t.includes('metabolic') || t.includes('cmp')) return 'Comprehensive Metabolic Panel (CMP)';
  if (t.includes('cardiac') || t.includes('troponin')) return 'Cardiac Biomarkers';
  if (c === 'LAB' || t.includes('blood') || t.includes('cbc')) return 'CBC Panel';
  if (t.includes('angio') || t.includes('ct')) return 'CT Angiography';
  if (c === 'RADIOLOGY' || t.includes('mri') || t.includes('scan') || t.includes('x-ray')) return 'MRI Scan';
  if (c === 'PATHOLOGY' || t.includes('biopsy')) return 'Pathology';
  return 'Consult Note';
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return 'Recently';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

export const ReportsDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All Types');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('Last 7 Days');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting('PDF');
      triggerToast('Generating diagnostic reports PDF export...');
      await reportService.downloadReportsPdf();
      triggerToast('Diagnostic reports PDF downloaded successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export reports PDF.';
      triggerToast(`Export error: ${msg}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting('CSV');
      triggerToast('Exporting diagnostic reports to CSV...');
      await reportService.downloadReportsCsv();
      triggerToast('Diagnostic reports CSV downloaded successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export reports CSV.';
      triggerToast(`Export error: ${msg}`);
    } finally {
      setIsExporting(null);
    }
  };

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await reportService.getReports();

      const mapped: ReportRecord[] = res.reports.map((item: ReportItemDTO) => {
        const pName = item.patientName || 'Authorized Patient';
        const pInit = getInitials(pName);
        const repType = mapToReportType(item.category, item.title);
        const isStat = item.status?.toLowerCase() === 'critical' || item.status === 'CRITICAL';
        const isVer = item.status?.toLowerCase() === 'verified' || item.isVerified || item.status === 'FINAL';

        return {
          id: item.id,
          patientName: pName,
          patientInitials: pInit,
          patientId: item.patientMrn || item.patientProfileId || 'CAREID-PT',
          patientProfileId: item.patientProfileId,
          patientAge: item.patientAge || 48,
          patientGender: item.patientGender || 'Unspecified',
          patientMrn: item.patientMrn || 'PT-CAREID-2026',
          reportType: repType,
          hospital: item.providerName || 'Metro General Hospital',
          createdDate: item.createdAt
            ? new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Recent',
          status: isStat ? 'critical' : isVer ? 'verified' : 'pending',
          priority: isStat ? 'stat' : 'routine',
          receivedAgo: formatRelativeTime(item.createdAt),
          primaryDx: item.description || item.title,
          lastVisit: 'Recent Encounter',
          panelName: item.title,
          narrativeSummary: item.description || item.title,
          criticalValues: item.criticalValues,
          followUpWorkflow: {
            title: 'Diagnostic Review Workflow',
            description: 'Evaluate diagnostic findings and coordinate follow-up with attending staff.',
            actions: ['Open Diagnostic Viewer', 'Document Clinical Note'],
          },
        };
      });

      setReports(mapped);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve reports from server';
      setError(msg);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Compute live metric summary counts from authentic data
  const metrics = useMemo(() => {
    const todayReports = reports.length;
    const pendingReviews = reports.filter((r) => r.status === 'pending').length;
    const criticalResults = reports.filter((r) => r.status === 'critical').length;
    const recentlyUploaded = reports.filter((r) => r.status === 'verified').length;
    return {
      todayReports,
      pendingReviews,
      criticalResults,
      recentlyUploaded,
    };
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      // Status filter
      if (selectedStatus === 'Verified' && item.status !== 'verified') return false;
      if (selectedStatus === 'Pending' && item.status !== 'pending') return false;
      if (selectedStatus === 'Critical' && item.status !== 'critical') return false;

      // Type filter
      if (selectedType !== 'All Types' && !item.reportType.includes(selectedType)) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesPatient = item.patientName.toLowerCase().includes(query);
        const matchesId = item.patientId.toLowerCase().includes(query) || item.id.toLowerCase().includes(query);
        const matchesHospital = item.hospital.toLowerCase().includes(query);
        const matchesType = item.reportType.toLowerCase().includes(query);
        if (!matchesPatient && !matchesId && !matchesHospital && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [reports, selectedStatus, selectedType, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  const handleRowClick = (report: ReportRecord) => {
    const ptId = report.patientProfileId;
    const ptQuery = ptId ? `?patientId=${encodeURIComponent(ptId)}` : '';
    if (report.status === 'critical') {
      navigate(`/reports/critical/${report.id}${ptQuery}`);
    } else if (
      report.reportType.includes('CBC') ||
      report.reportType.includes('Metabolic') ||
      report.reportType.includes('Biomarkers')
    ) {
      navigate(`/records/labs/${report.id}${ptQuery}`);
    } else if (report.reportType.includes('MRI') || report.reportType.includes('Angiography')) {
      navigate(`/records/imaging/${report.id}${ptQuery}`);
    } else {
      navigate(`/records/clinical/${report.id}${ptQuery}`);
    }
  };

  return (
    <div className="w-full space-y-6 pb-20">
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

      {/* Page Header and Global Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Reports Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage and review all patient reports across clinical domains.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting !== null}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all disabled:opacity-60 cursor-pointer"
          >
            {isExporting === 'PDF' ? (
              <Loader2 className="size-3.5 text-[#5b14b8] animate-spin" />
            ) : (
              <Download className="size-3.5 text-slate-500" />
            )}
            <span>{isExporting === 'PDF' ? 'Exporting PDF...' : 'Export PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting !== null}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all disabled:opacity-60 cursor-pointer"
          >
            {isExporting === 'CSV' ? (
              <Loader2 className="size-3.5 text-[#5b14b8] animate-spin" />
            ) : (
              <Download className="size-3.5 text-slate-500" />
            )}
            <span>{isExporting === 'CSV' ? 'Exporting CSV...' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/reports/outcomes')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Activity className="size-3.5 text-[#006666]" />
            <span>Outcomes</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/reports/exports')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <ShieldCheck className="size-3.5 text-blue-600" />
            <span>Audit Logs</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/records/upload')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#20005a] hover:bg-[#320078] active:scale-[0.98] text-white text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#5b14b8] cursor-pointer"
          >
            <Plus className="size-3.5 stroke-[3]" />
            <span>Upload Report</span>
          </button>
        </div>
      </div>

      {/* 4 Bento Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Reports */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="size-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Calendar className="size-4" />
            </div>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-teal-50 text-teal-700 rounded-full border border-teal-100">
              Verified Panel
            </span>
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-500">Today&apos;s Reports</div>
            <div className="text-3xl font-bold text-slate-900 mt-0.5">
              {isLoading || error ? '—' : metrics.todayReports}
            </div>
          </div>
        </div>

        {/* Card 2: Pending Reviews */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="size-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
              <Clock className="size-4" />
            </div>
            <span className="size-5 rounded-full bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center">
              !
            </span>
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-500">Pending Reviews</div>
            <div className="text-3xl font-bold text-red-600 mt-0.5">
              {isLoading || error ? '—' : metrics.pendingReviews}
            </div>
          </div>
        </div>

        {/* Card 3: Critical Results (Interactive Filter) */}
        <div
          onClick={() => {
            setSelectedStatus(selectedStatus === 'Critical' ? 'All' : 'Critical');
            triggerToast(selectedStatus === 'Critical' ? 'Reset to All Reports' : 'Filtered to Critical Diagnostic Alerts');
          }}
          className={`rounded-2xl border p-5 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] flex flex-col justify-between cursor-pointer transition-all ${
            selectedStatus === 'Critical'
              ? 'bg-[#feecee] border-red-300 ring-2 ring-red-400'
              : 'bg-white border-slate-200/90 hover:border-red-200 hover:bg-red-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="size-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="size-4" />
            </div>
            <span className="text-[10px] font-bold text-red-700 bg-red-100/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Stat Action
            </span>
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-500">Critical Results</div>
            <div className="text-3xl font-bold text-red-700 mt-0.5">
              {isLoading || error ? '—' : metrics.criticalResults}
            </div>
          </div>
        </div>

        {/* Card 4: Recently Uploaded */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="size-8 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <CloudUpload className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-500">Recently Verified</div>
            <div className="text-3xl font-bold text-slate-900 mt-0.5">
              {isLoading || error ? '—' : metrics.recentlyUploaded}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
        {/* Left: Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Patient or HV ID..."
            className="w-full h-10 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30 transition-colors shadow-xs"
          />
        </div>

        {/* Right Filter Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Report Type Dropdown */}
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-10 pl-3 pr-8 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30 appearance-none text-slate-800 shadow-xs cursor-pointer"
            >
              <option value="All Types">All Types</option>
              <option value="CBC">CBC Panel</option>
              <option value="MRI">MRI Scan</option>
              <option value="Consult">Consult Note</option>
              <option value="Metabolic">Comprehensive Metabolic Panel (CMP)</option>
              <option value="Cardiac">Cardiac Biomarkers</option>
            </select>
            <ChevronDown className="size-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Pills Container */}
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center gap-1 shadow-xs">
            <button
              type="button"
              onClick={() => setSelectedStatus('All')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedStatus === 'All'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus('Verified')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedStatus === 'Verified'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Verified
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus('Pending')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                selectedStatus === 'Pending'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pending</span>
              <span className="size-1.5 rounded-full bg-red-600" />
            </button>
          </div>

          {/* Date Filter Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setSelectedDateFilter(selectedDateFilter === 'Last 7 Days' ? 'Last 30 Days' : 'Last 7 Days')
              }
              className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-2 shadow-xs transition-colors"
            >
              <Calendar className="size-3.5 text-slate-500" />
              <span>{selectedDateFilter}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert if query fails */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="size-4 text-rose-600 shrink-0" />
            <span>Diagnostic Archive Query Disruption: {error}</span>
          </div>
          <button
            type="button"
            onClick={fetchReports}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <RotateCw className="size-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Reports Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0px_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                <th className="py-3.5 px-6">Patient</th>
                <th className="py-3.5 px-4">HV ID</th>
                <th className="py-3.5 px-4">Report Type</th>
                <th className="py-3.5 px-4">Hospital</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="size-6 animate-spin text-[#5b14b8]" />
                      <span className="text-xs">Loading clinical diagnostic reports...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-rose-600 text-xs font-medium">
                    Unable to load diagnostic reports. Please retry above.
                  </td>
                </tr>
              ) : paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No diagnostic reports match your current filters.
                  </td>
                </tr>
              ) : (
                paginatedReports.map((report) => {
                  const isCritical = report.status === 'critical';
                  const isPending = report.status === 'pending';

                  return (
                    <tr
                      key={report.id}
                      onClick={() => handleRowClick(report)}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      {/* Patient Name with Avatar */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`size-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                              report.patientInitials === 'JS'
                                ? 'bg-cyan-100 text-cyan-800'
                                : report.patientInitials === 'MR'
                                ? 'bg-pink-100 text-pink-800'
                                : report.patientInitials === 'DL'
                                ? 'bg-slate-200 text-slate-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {report.patientInitials}
                          </div>
                          <span className="font-semibold text-slate-900 group-hover:text-[#5b14b8] transition-colors">
                            {report.patientName}
                          </span>
                        </div>
                      </td>

                      {/* HV ID */}
                      <td className="py-4 px-4 font-mono text-slate-600">
                        {report.patientId}
                      </td>

                      {/* Report Type Badge */}
                      <td className="py-4 px-4">
                        {report.reportType.includes('CBC') ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-100">
                            <FlaskConical className="size-3.5 text-cyan-600" />
                            <span>CBC Panel</span>
                          </span>
                        ) : report.reportType.includes('MRI') ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                            <Scan className="size-3.5 text-purple-600" />
                            <span>MRI Scan</span>
                          </span>
                        ) : report.reportType.includes('Consult') ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <FileText className="size-3.5 text-slate-500" />
                            <span>Consult Note</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                            <AlertTriangle className="size-3.5 text-red-600" />
                            <span>{report.reportType}</span>
                          </span>
                        )}
                      </td>

                      {/* Hospital */}
                      <td className="py-4 px-4 text-slate-600">
                        {report.hospital}
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-4 text-slate-500">
                        {report.createdDate}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1.5 text-red-600 font-semibold">
                            <span className="size-2 rounded-full bg-red-600 animate-pulse" />
                            <span>Critical Alert</span>
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1.5 text-[#d92d20] font-medium">
                            <span className="size-2 rounded-full bg-[#d92d20]" />
                            <span>Pending</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-teal-700 font-medium">
                            <CheckCircle2 className="size-3.5 text-teal-600" />
                            <span>Verified</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-4 px-6 text-right"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(report);
                        }}
                      >
                        <button
                          type="button"
                          className="size-8 rounded-lg text-[#5b14b8] hover:bg-purple-50 flex items-center justify-center transition-colors ml-auto cursor-pointer"
                          aria-label={`View report for ${report.patientName}`}
                        >
                          <Eye className="size-4" />
                        </button>
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
            Showing {filteredReports.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, filteredReports.length)} of {filteredReports.length} entries
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="size-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`size-8 rounded-lg font-medium flex items-center justify-center cursor-pointer ${
                    currentPage === pageNum
                      ? 'bg-[#20005a] text-white'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="size-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
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

export default ReportsDashboardPage;
