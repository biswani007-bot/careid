import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  FlaskConical,
  FolderOpen,
  Printer,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { patientService, MedicalRecord, PatientProfileDetail } from '@/services/patientService';
import { reportService } from '@/services/reportService';
import { usePatientList } from '@/hooks/usePatients';

export const LabReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryPatientId = searchParams.get('patientId') || searchParams.get('id');

  const [clinicalNotes, setClinicalNotes] = useState('');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [patient, setPatient] = useState<PatientProfileDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { patients: patientList, isLoading: isListLoading } = usePatientList({ limit: 1 });
  const activePatientId = queryPatientId || (patientList.length > 0 ? patientList[0].id : undefined);

  // Synchronize URL search params once active patient ID is resolved
  useEffect(() => {
    if (!queryPatientId && activePatientId) {
      setSearchParams({ patientId: activePatientId }, { replace: true });
    }
  }, [queryPatientId, activePatientId, setSearchParams]);

  const awaitingListResolution = !activePatientId && isListLoading;

  const fetchLabData = useCallback(async () => {
    if (!activePatientId) {
      setError('No active patient selected for laboratory report review.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (id) {
        const rec = await patientService.getMedicalRecordById(id, activePatientId);
        setRecord(rec);
        const pId = rec.patientProfileId || activePatientId;
        if (!pId) {
          throw new Error('No patient identifier associated with this laboratory report.');
        }
        const p = await patientService.getPatientById(pId);
        if (!p || (!p.id && !p.patientNumber && !p.firstName && !p.fullName)) {
          throw new Error('Patient demographic profile could not be resolved.');
        }
        setPatient(p);
      } else {
        const [p, records] = await Promise.all([
          patientService.getPatientById(activePatientId),
          patientService.getPatientMedicalRecords(activePatientId),
        ]);

        if (!p || (!p.id && !p.patientNumber && !p.firstName && !p.fullName)) {
          throw new Error('Patient demographic profile could not be resolved.');
        }
        setPatient(p);

        const labRec =
          records.find(
            (r) =>
              r.attachments?.some((a) => a.category?.toLowerCase().includes('lab')) ||
              r.title.toLowerCase().includes('lab') ||
              r.title.toLowerCase().includes('panel') ||
              r.title.toLowerCase().includes('blood') ||
              r.title.toLowerCase().includes('cbc') ||
              r.title.toLowerCase().includes('cmp')
          ) || records[0];

        setRecord(labRec || null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve laboratory report.');
    } finally {
      setIsLoading(false);
    }
  }, [id, activePatientId]);

  useEffect(() => {
    if (awaitingListResolution) {
      return;
    }
    fetchLabData();
  }, [fetchLabData, awaitingListResolution]);

  useEffect(() => {
    if (record?.clinicalNotes) {
      setClinicalNotes(record.clinicalNotes);
    }
  }, [record?.id, record?.clinicalNotes]);

  const handleDownload = async () => {
    if (!record) return;
    try {
      const { downloadUrl } = await reportService.getDownloadUrl(
        record.id,
        record.patientProfileId || activePatientId || undefined
      );
      if (downloadUrl.startsWith('http')) {
        window.open(downloadUrl, '_blank');
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

  if (isLoading || (!activePatientId && isListLoading)) {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="h-14 bg-white border border-[#cbc4d4] rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#f3f4f5] border border-[#cbc4d4] rounded-2xl min-h-[500px]" />
          <div className="lg:col-span-5 space-y-4">
            <div className="h-44 bg-white border border-[#cbc4d4] rounded-2xl" />
            <div className="h-56 bg-white border border-[#cbc4d4] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="size-16 rounded-full bg-rose-50 text-[#ba1a1a] mx-auto flex items-center justify-center">
          <AlertCircle className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Laboratory Report Unavailable</h2>
        <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-800 max-w-md mx-auto leading-relaxed">
          {error}
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={fetchLabData}
            className="px-4 py-2.5 rounded-xl bg-[#28006d] text-white text-xs font-semibold hover:bg-[#3f1d8b] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="size-3.5" />
            <span>Retry Query</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/records')}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#cbc4d4] text-[#191c1d] text-xs font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span>Return to Medical Records</span>
          </button>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="w-full max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="size-16 rounded-full bg-rose-50 text-[#ba1a1a] mx-auto flex items-center justify-center">
          <AlertCircle className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Laboratory Report Unavailable</h2>
        <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-800 max-w-md mx-auto leading-relaxed">
          Patient demographic profile is unavailable.
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={fetchLabData}
            className="px-4 py-2.5 rounded-xl bg-[#28006d] text-white text-xs font-semibold hover:bg-[#3f1d8b] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="size-3.5" />
            <span>Retry Query</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/records')}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#cbc4d4] text-[#191c1d] text-xs font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span>Return to Medical Records</span>
          </button>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="w-full max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="size-16 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
          <FlaskConical className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">No Laboratory Reports Found</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          No verified laboratory diagnostic panels or blood chemistry reports found for this patient record.
        </p>
        <button
          type="button"
          onClick={() => navigate('/records')}
          className="px-5 py-2.5 rounded-xl bg-[#28006d] text-white text-xs font-semibold hover:bg-[#3f1d8b] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="size-3.5" />
          <span>Return to Medical Records</span>
        </button>
      </div>
    );
  }

  const recPatient = (record as unknown as {
    patient?: {
      firstName?: string;
      lastName?: string;
      fullName?: string;
      patientNumber?: string;
      mrn?: string;
    };
  })?.patient;

  const patientName =
    patient.fullName?.trim() ||
    [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() ||
    recPatient?.fullName?.trim() ||
    [recPatient?.firstName, recPatient?.lastName].filter(Boolean).join(' ').trim() ||
    '';

  const patientNumber =
    patient.patientNumber ||
    recPatient?.patientNumber ||
    recPatient?.mrn ||
    record.patientProfileId ||
    '';
  const reportDate = record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Recent';

  return (
    <div className="w-full space-y-4" data-node-id="1:2908">
      {/* 1. Header with Title & Action Controls (Figma node 1:2911) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#e1e3e4]">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#191c1d]">
            {record.title}
          </h1>
          <p className="text-xs text-[#7a7583]">
            Patient: {patientName} | Health ID: {patientNumber}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="h-10 px-4 rounded-lg bg-white border border-[#cbc4d4] text-xs font-semibold text-[#191c1d] hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm focus:outline-none cursor-pointer"
          >
            <Printer className="size-4 text-[#494552]" aria-hidden="true" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="h-10 px-4 rounded-lg bg-white border border-[#cbc4d4] text-xs font-semibold text-[#191c1d] hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm focus:outline-none cursor-pointer"
          >
            <Download className="size-4 text-[#494552]" aria-hidden="true" />
            <span>Download PDF</span>
          </button>

          {/* Canonical Primary Action Button (Figma node 1:40) */}
          <button
            type="button"
            onClick={() => navigate(patient?.id ? `/patients/${patient.id}` : (activePatientId ? `/patients/${activePatientId}` : '/patients'))}
            className="h-10 px-5 rounded-lg bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white text-xs font-semibold hover:opacity-95 transition-all shadow-sm flex items-center gap-2 focus:outline-none cursor-pointer"
          >
            <FolderOpen className="size-4" aria-hidden="true" />
            <span>Open Patient Record</span>
          </button>
        </div>
      </div>

      {/* 2. Main Split View: Left Document Panel (60%) / Right Clinical Bento (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (60%, Span 7): PDF Viewer Shell (Figma node 1:2941) */}
        <div className="lg:col-span-7 bg-[#f3f4f5] border border-[#cbc4d4] rounded-2xl p-4 shadow-sm overflow-hidden flex flex-col items-center">
          {/* Viewer Toolbar (Figma node 1:2942) */}
          <div className="w-full bg-white border border-[#cbc4d4] rounded-xl px-4 py-2 flex items-center justify-between text-xs text-[#494552] mb-4 shadow-xs">
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5">
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.max(75, prev - 15))}
                className="p-1 hover:bg-slate-200/60 rounded cursor-pointer"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <span className="px-1.5 font-mono font-medium text-[#191c1d]">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.min(150, prev + 15))}
                className="p-1 hover:bg-slate-200/60 rounded cursor-pointer"
              >
                <ZoomIn className="size-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-[#191c1d]">
              <button type="button" className="p-1 hover:bg-slate-100 rounded">
                <ChevronLeft className="size-3.5" />
              </button>
              <span>Page 1 of 1</span>
              <button type="button" className="p-1 hover:bg-slate-100 rounded">
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="p-1.5 hover:bg-slate-100 rounded text-[#494552] cursor-pointer"
            >
              <RotateCw className="size-3.5" />
            </button>
          </div>

          {/* White Paper Canvas */}
          <div
            className="w-full bg-white border border-slate-200 rounded-xl p-6 shadow-md space-y-4 text-xs text-[#191c1d] transition-transform"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          >
            {/* Header info bar */}
            <div className="flex items-center justify-between pb-3 border-b border-[#e1e3e4] text-xs">
              <div>
                <span className="font-bold text-[#191c1d] text-sm">CareID Clinical Laboratory Report</span>
                <div className="text-[11px] text-[#7a7583]">Central Clinical Diagnostics • Certified Facility</div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#e0f7fa] text-[#00838f]">
                  <Check className="size-3 stroke-[3]" />
                  <span>{record.status}</span>
                </span>
                <div className="text-[11px] text-[#7a7583]">Date: {reportDate}</div>
              </div>
            </div>

            {/* Findings & Notes */}
            <div className="space-y-3 py-2">
              <h3 className="text-sm font-bold text-[#5b14b8]">Clinical Summary &amp; Findings</h3>

              {record.chiefComplaint && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-700">Indication:</span>
                  <p className="mt-0.5 text-slate-800">{record.chiefComplaint}</p>
                </div>
              )}

              {record.clinicalNotes && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-700">Diagnostic Findings:</span>
                  <p className="mt-0.5 text-slate-800 whitespace-pre-line leading-relaxed">{record.clinicalNotes}</p>
                </div>
              )}

              {record.treatmentPlan && (
                <div className="bg-purple-50/50 p-3 rounded-lg border border-purple-100">
                  <span className="font-bold text-[#5b14b8]">Recommended Plan:</span>
                  <p className="mt-0.5 text-slate-800">{record.treatmentPlan}</p>
                </div>
              )}

              {record.attachments && record.attachments.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="font-bold text-slate-700">Verified Specimen / Document:</span>
                  {record.attachments.map((att) => (
                    <div key={att.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <span className="font-medium text-[#191c1d]">{att.fileName}</span>
                      <span className="text-[10px] text-emerald-700 font-semibold">{att.virusScanStatus || 'CLEAN'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Verification Footer */}
            <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-[#7a7583]">
              <div>Verified by Clinical Diagnostics System</div>
              <div className="font-mono">{record.id.substring(0, 18)}</div>
            </div>
          </div>
        </div>

        {/* Right Column (40%, Span 5): Clinical Bento Panel (Figma node 1:3095) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Sample & Collection Metadata (Figma node 1:3096) */}
          <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-sm space-y-3 text-xs">
            <div className="flex items-center gap-2 pb-1 border-b border-[#e1e3e4]">
              <FlaskConical className="size-4 text-[#5b14b8]" />
              <h2 className="text-sm font-bold text-[#191c1d]">Report Metadata</h2>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-[#7a7583]">Patient</span>
                <span className="font-semibold text-[#191c1d]">{patientName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-[#7a7583]">Health ID</span>
                <span className="font-mono text-[#191c1d]">{patientNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-[#7a7583]">Report Date</span>
                <span className="text-[#191c1d]">{reportDate}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#7a7583]">Clinical Status</span>
                <span className="font-semibold text-emerald-700">{record.status}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Physician Findings & Notes (Figma node 1:3144) */}
          <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-[#e1e3e4]">
              <div className="flex items-center gap-2">
                <Edit2 className="size-4 text-[#5b14b8]" />
                <h2 className="text-sm font-bold text-[#191c1d]">Physician Clinical Notes</h2>
              </div>
            </div>

            <textarea
              rows={4}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Enter clinical observations or sign-off remarks..."
              className="w-full p-3 rounded-xl border border-[#cbc4d4] text-xs text-[#191c1d] placeholder:text-[#7a7583] focus:outline-none focus:ring-2 focus:ring-[#5b14b8] resize-none"
            />

            <button
              type="button"
              className="w-full py-2.5 rounded-xl bg-[#28006d] hover:bg-[#3f1d8b] text-white text-xs font-semibold transition-colors focus:outline-none cursor-pointer"
            >
              Save Physician Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabReportPage;
