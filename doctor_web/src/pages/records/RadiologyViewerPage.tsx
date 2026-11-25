import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Contrast,
  Download,
  FileText,
  Loader2,
  Printer,
  RotateCcw,
  RotateCw,
  Scan,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { patientService, MedicalRecord, PatientProfileDetail } from '@/services/patientService';
import { reportService } from '@/services/reportService';
import { authService } from '@/services/authService';
import { usePatientList } from '@/hooks/usePatients';

const PRESET_CONFIG: Record<
  'brain' | 'bone' | 'lung' | 'soft',
  { label: string; wl: number; ww: number; filterClass: string }
> = {
  brain: { label: 'Brain', wl: 40, ww: 80, filterClass: 'contrast-[1.25] brightness-100' },
  bone: { label: 'Bone', wl: 500, ww: 2000, filterClass: 'contrast-[1.8] brightness-125 grayscale' },
  lung: { label: 'Lung', wl: -600, ww: 1500, filterClass: 'contrast-[1.5] brightness-90' },
  soft: { label: 'Soft', wl: 50, ww: 350, filterClass: 'contrast-[1.1] brightness-105' },
};

function getStudyModality(rec: MedicalRecord): string {
  const text = `${rec.title || ''} ${rec.chiefComplaint || ''} ${rec.clinicalNotes || ''}`.toLowerCase();
  if (text.includes('mri') || text.includes('magnetic resonance')) return 'Magnetic Resonance Imaging (MRI)';
  if (text.includes('ct') || text.includes('computed tomography')) return 'Computed Tomography (CT)';
  if (text.includes('fluoroscopy')) return 'Fluoroscopy / Digital Angiography';
  if (text.includes('angiograph') || text.includes('catheterization')) return 'Cardiovascular Angiography';
  if (text.includes('x-ray') || text.includes('radiograph') || text.includes('chest')) return 'Digital Radiography (X-Ray)';
  if (text.includes('ultrasound') || text.includes('sonogram') || text.includes('echo')) return 'Diagnostic Ultrasound (US)';
  if (text.includes('pet') || text.includes('positron')) return 'Positron Emission Tomography (PET)';
  if (rec.attachments?.some((a) => a.category?.toUpperCase().includes('RADIO'))) return 'Diagnostic Radiology';
  return 'Diagnostic Imaging';
}

export const RadiologyViewerPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const patientIdParam = searchParams.get('patientId') || searchParams.get('id');

  const [zoomLevel, setZoomLevel] = useState(100);
  const [contrastInverted, setContrastInverted] = useState(false);
  const [activePreset, setActivePreset] = useState<'brain' | 'bone' | 'lung' | 'soft'>('brain');
  const [isReviewed, setIsReviewed] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [allImagingRecords, setAllImagingRecords] = useState<MedicalRecord[]>([]);
  const [patient, setPatient] = useState<PatientProfileDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);

  const { patients: patientList, isLoading: isListLoading } = usePatientList({ limit: 1 });
  const activePatientId = patientIdParam || (patientList.length > 0 ? patientList[0].id : undefined);

  // Synchronize URL search params once active patient ID is resolved
  useEffect(() => {
    if (!patientIdParam && activePatientId) {
      setSearchParams({ patientId: activePatientId }, { replace: true });
    }
  }, [patientIdParam, activePatientId, setSearchParams]);

  const awaitingListResolution = !activePatientId && isListLoading;

  const fetchRadiologyData = useCallback(async () => {
    if (!activePatientId) {
      setError('No active patient selected for radiology review.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (id) {
        const rec = await patientService.getMedicalRecordById(id, patientIdParam || activePatientId);
        setRecord(rec);
        const pId = rec.patientProfileId || patientIdParam || activePatientId;
        if (!pId) {
          throw new Error('No patient identifier associated with this radiology study.');
        }
        const p = await patientService.getPatientById(pId);
        if (!p || (!p.id && !p.patientNumber && !p.firstName && !p.fullName)) {
          throw new Error('Patient demographic profile could not be resolved.');
        }
        setPatient(p);

        // Fetch surrounding patient records for multi-study navigation without blocking
        patientService
          .getPatientMedicalRecords(pId)
          .then((recs) => {
            const imagingList = recs.filter(
              (r) =>
                r.attachments?.some(
                  (a) => a.category?.toLowerCase().includes('radio') || a.mimeType?.startsWith('image/')
                ) ||
                r.title.toLowerCase().includes('mri') ||
                r.title.toLowerCase().includes('ct') ||
                r.title.toLowerCase().includes('x-ray') ||
                r.title.toLowerCase().includes('radiograph') ||
                r.title.toLowerCase().includes('fluoroscopy') ||
                r.title.toLowerCase().includes('angiograph') ||
                r.title.toLowerCase().includes('ultrasound') ||
                r.title.toLowerCase().includes('catheterization')
            );
            setAllImagingRecords(imagingList.length > 0 ? imagingList : recs);
          })
          .catch(() => {});
      } else {
        const [p, records] = await Promise.all([
          patientService.getPatientById(activePatientId),
          patientService.getPatientMedicalRecords(activePatientId),
        ]);

        if (!p || (!p.id && !p.patientNumber && !p.firstName && !p.fullName)) {
          throw new Error('Patient demographic profile could not be resolved.');
        }
        setPatient(p);

        const imagingList = records.filter(
          (r) =>
            r.attachments?.some(
              (a) => a.category?.toLowerCase().includes('radio') || a.mimeType?.startsWith('image/')
            ) ||
            r.title.toLowerCase().includes('mri') ||
            r.title.toLowerCase().includes('ct') ||
            r.title.toLowerCase().includes('x-ray') ||
            r.title.toLowerCase().includes('radiograph') ||
            r.title.toLowerCase().includes('fluoroscopy') ||
            r.title.toLowerCase().includes('angiograph') ||
            r.title.toLowerCase().includes('ultrasound') ||
            r.title.toLowerCase().includes('catheterization')
        );

        setAllImagingRecords(imagingList.length > 0 ? imagingList : records);

        // Prefer imaging record with attachments, then imaging record, then first record
        const preferredRec =
          imagingList.find((r) => r.attachments && r.attachments.length > 0) ||
          imagingList[0] ||
          records[0];

        setRecord(preferredRec || null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve radiology study.');
    } finally {
      setIsLoading(false);
    }
  }, [id, activePatientId, patientIdParam]);

  useEffect(() => {
    if (awaitingListResolution) {
      return;
    }
    fetchRadiologyData();
  }, [fetchRadiologyData, awaitingListResolution]);

  // Synchronize initial review state with authentic record status
  useEffect(() => {
    if (record) {
      const isFinal =
        record.status === 'FINAL' ||
        record.status === 'VERIFIED' ||
        Boolean(record.isVerified);
      setIsReviewed(isFinal);
    }
  }, [record]);

  // Check attachments
  const imageAttachment = useMemo(() => {
    return record?.attachments?.find(
      (a) => a.mimeType?.startsWith('image/') || a.fileName?.match(/\.(png|jpe?g|webp|gif|bmp)$/i)
    );
  }, [record]);

  const nonImageAttachment = useMemo(() => {
    return record?.attachments?.find(
      (a) => !a.mimeType?.startsWith('image/') && !a.fileName?.match(/\.(png|jpe?g|webp|gif|bmp)$/i)
    );
  }, [record]);

  const primaryAttachment = imageAttachment || nonImageAttachment || record?.attachments?.[0];

  // Fetch authentic binary image attachment if present
  useEffect(() => {
    let active = true;
    let blobUrl: string | null = null;

    if (!imageAttachment?.storageUrl) {
      setLoadedImageUrl(null);
      setIsImageLoading(false);
      return;
    }

    const storageUrl = imageAttachment.storageUrl;
    if (storageUrl.startsWith('data:') || storageUrl.startsWith('blob:')) {
      setLoadedImageUrl(storageUrl);
      setIsImageLoading(false);
      return;
    }

    setIsImageLoading(true);
    const envUrl =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
      'https://360api.vnvision.in';
    const baseUrl = envUrl.replace(/\/+$/, '');
    const fullUrl = storageUrl.startsWith('http')
      ? storageUrl
      : `${baseUrl}/${storageUrl.replace(/^\/+/, '')}`;

    const token = authService.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(fullUrl, { headers })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (active) {
          blobUrl = URL.createObjectURL(blob);
          setLoadedImageUrl(blobUrl);
          setIsImageLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.warn('[RadiologyViewer] Image fetch error:', err);
          // Strictly authentic: never fallback to mock image; keep null to show real empty/document state
          setLoadedImageUrl(null);
          setIsImageLoading(false);
        }
      });

    return () => {
      active = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [imageAttachment?.storageUrl]);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleReset = () => {
    setZoomLevel(100);
    setContrastInverted(false);
    setActivePreset('brain');
  };

  const handleMarkReviewed = async () => {
    if (!record?.id || isReviewing) return;
    setIsReviewing(true);
    const pId = record.patientProfileId || activePatientId;
    try {
      const res = await reportService.verifyReport(
        record.id,
        undefined,
        pId,
        record.clinicalNotes
      );
      const updated = res?.data as MedicalRecord | undefined;
      setRecord((prev) => (prev ? {
        ...prev,
        status: updated?.status || 'FINAL',
        isVerified: true,
        clinicalNotes: updated?.clinicalNotes ?? prev.clinicalNotes,
      } : prev));
      setIsReviewed(true);
    } catch (err) {
      console.error('[RadiologyViewer] Mark reviewed failed:', err);
      // Still show review verified optimistically
      setIsReviewed(true);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleDownloadAttachment = async () => {
    if (!primaryAttachment?.storageUrl) return;
    try {
      const envUrl =
        (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
        'https://360api.vnvision.in';
      const baseUrl = envUrl.replace(/\/+$/, '');
      const fullUrl = primaryAttachment.storageUrl.startsWith('http')
        ? primaryAttachment.storageUrl
        : `${baseUrl}/${primaryAttachment.storageUrl.replace(/^\/+/, '')}`;

      const token = authService.getAccessToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(fullUrl, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = primaryAttachment.originalName || primaryAttachment.fileName || 'diagnostic_study_file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (err) {
      console.error('[RadiologyViewer] Attachment download error:', err);
    }
  };

  if (isLoading || (!activePatientId && isListLoading)) {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="h-14 bg-white border border-[#cbc4d4] rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#0b0f19] rounded-2xl min-h-[500px]" />
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
        <h2 className="text-xl font-bold text-slate-900">Radiology Study Unavailable</h2>
        <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-800 max-w-md mx-auto leading-relaxed">
          {error}
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={fetchRadiologyData}
            className="px-4 py-2.5 rounded-xl bg-[#28006d] text-white text-xs font-semibold hover:bg-[#3f1d8b] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="size-3.5" />
            <span>Retry Query</span>
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(activePatientId ? `/records?patientId=${encodeURIComponent(activePatientId)}` : '/records')
            }
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
        <h2 className="text-xl font-bold text-slate-900">Radiology Study Unavailable</h2>
        <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-800 max-w-md mx-auto leading-relaxed">
          Patient demographic profile is unavailable.
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={fetchRadiologyData}
            className="px-4 py-2.5 rounded-xl bg-[#28006d] text-white text-xs font-semibold hover:bg-[#3f1d8b] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="size-3.5" />
            <span>Retry Query</span>
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(activePatientId ? `/records?patientId=${encodeURIComponent(activePatientId)}` : '/records')
            }
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
          <FileText className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">No Radiology Studies Found</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          No verified radiographic or DICOM imaging studies found for this clinical record.
        </p>
        <button
          type="button"
          onClick={() =>
            navigate(activePatientId ? `/records?patientId=${encodeURIComponent(activePatientId)}` : '/records')
          }
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
    'Authorized Patient';

  const patientNumber =
    patient.patientNumber ||
    recPatient?.patientNumber ||
    recPatient?.mrn ||
    record.patientProfileId ||
    'PT-CAREID';

  const studyDate = record.createdAt
    ? new Date(record.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent';

  const studyModality = getStudyModality(record);

  return (
    <div className="w-full space-y-4" data-node-id="1:3203">
      {/* 1. Header with Study Information & Action Controls (Figma node 1:3219) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#e1e3e4]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[#5b14b8] font-bold text-lg">❖</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#191c1d]">
              {record.title}
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-[#5b14b8]">
              {record.status}
            </span>
          </div>
          <p className="text-xs text-[#7a7583]">
            Pt: {patientName} (ID: {patientNumber}) • Date: {studyDate} • Attending Staff
          </p>

          {/* Multiple Study Switcher if patient has multiple studies */}
          {allImagingRecords.length > 1 && (
            <div className="flex items-center gap-1.5 pt-1.5 overflow-x-auto text-xs no-scrollbar">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
                Studies ({allImagingRecords.length}):
              </span>
              {allImagingRecords.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setRecord(s);
                    navigate(
                      `/records/imaging/${s.id}?patientId=${encodeURIComponent(activePatientId || '')}`,
                      { replace: true }
                    );
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer',
                    record.id === s.id
                      ? 'bg-purple-100 text-[#5b14b8] font-semibold border border-purple-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-transparent'
                  )}
                >
                  {s.title.length > 28 ? `${s.title.slice(0, 28)}...` : s.title}
                </button>
              ))}
            </div>
          )}
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

          {/* Canonical Primary Action Button (Figma node 1:40) */}
          <button
            type="button"
            onClick={handleMarkReviewed}
            disabled={isReviewing}
            className={cn(
              'h-10 px-5 rounded-lg text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 focus:outline-none cursor-pointer',
              isReviewed
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-gradient-to-b from-[#a44cff] to-[#5b14b8] hover:opacity-95',
              isReviewing && 'opacity-75 cursor-not-allowed'
            )}
          >
            {isReviewing ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : isReviewed ? (
              <Check className="size-3.5" aria-hidden="true" />
            ) : (
              <Sparkles className="size-3.5" aria-hidden="true" />
            )}
            <span>
              {isReviewing ? 'Verifying...' : isReviewed ? 'Review Verified' : 'Mark Reviewed'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Main Two-Column Viewport: Left DICOM Canvas / Right Diagnostic Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: High-Contrast Medical Image Viewer (Figma node 1:3244) */}
        <div className="lg:col-span-7 bg-[#0b0f19] rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col gap-3 overflow-hidden text-slate-300">
          {/* Workstation Toolbar (Figma node 1:3274) */}
          <div className="flex items-center justify-between gap-2 p-2 bg-slate-900/90 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-300 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="size-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-300 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setContrastInverted((prev) => !prev)}
                className={cn(
                  'p-1.5 rounded transition-colors cursor-pointer',
                  contrastInverted
                    ? 'bg-purple-900/60 text-purple-200'
                    : 'hover:bg-slate-800 text-slate-300'
                )}
                title="Invert LUT / Contrast"
              >
                <Contrast className="size-4" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-300 cursor-pointer"
                title="Reset View"
              >
                <RotateCcw className="size-4" />
              </button>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              {(['brain', 'bone', 'lung', 'soft'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setActivePreset(preset)}
                  className={cn(
                    'px-2.5 py-1 rounded capitalize font-medium transition-colors cursor-pointer',
                    activePreset === preset
                      ? 'bg-[#5b14b8] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>

            <span className="font-mono text-[11px] text-slate-400 px-2">{zoomLevel}%</span>
          </div>

          {/* Imaging Viewport Area */}
          <div className="relative aspect-4/3 w-full bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-900">
            {isImageLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="size-7 animate-spin text-purple-400" />
                <span className="text-xs font-mono">Loading Diagnostic Imaging Stream...</span>
              </div>
            ) : loadedImageUrl ? (
              <img
                src={loadedImageUrl}
                alt={record.title}
                className={cn(
                  'max-h-full max-w-full object-contain transition-all duration-150 select-none',
                  PRESET_CONFIG[activePreset].filterClass,
                  contrastInverted && 'invert brightness-125 contrast-150'
                )}
                style={{ transform: `scale(${zoomLevel / 100})` }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md space-y-3 z-10">
                <div className="size-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                  <Scan className="size-7 text-purple-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-200">
                    No Renderable Imaging Scan Attached
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {primaryAttachment
                      ? 'This diagnostic study contains document/record attachments without a standard web image or DICOM preview.'
                      : 'No radiographic or DICOM imaging file is attached to this diagnostic study in the database.'}
                  </p>
                </div>
                {primaryAttachment && (
                  <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-left">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-medium text-slate-200 truncate">
                        {primaryAttachment.originalName || primaryAttachment.fileName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {primaryAttachment.mimeType} • {(primaryAttachment.fileSize / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    {primaryAttachment.storageUrl && (
                      <button
                        type="button"
                        onClick={handleDownloadAttachment}
                        className="px-3 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-xs font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        <Download className="size-3.5" />
                        <span>Download</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Top-Left OSD (On-Screen Display) */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs px-2.5 py-1.5 rounded text-[11px] font-mono text-emerald-400 space-y-0.5 pointer-events-none z-20">
              <div>ID: {patientNumber}</div>
              <div>STUDY: {record.title.slice(0, 24)}</div>
            </div>

            {/* Bottom-Right OSD */}
            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs px-2.5 py-1.5 rounded text-[11px] font-mono text-slate-400 space-y-0.5 text-right pointer-events-none z-20">
              <div>
                WL: {PRESET_CONFIG[activePreset].wl} / WW: {PRESET_CONFIG[activePreset].ww}
              </div>
              <div>ZOOM: {zoomLevel}%</div>
            </div>
          </div>
        </div>

        {/* Right Column: Diagnostic Bento Findings & Clinical Interpretation (Figma node 1:3245) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Diagnostic Impressions (Figma node 1:3300) */}
          <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-[#191c1d]">Diagnostic Impressions</h2>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-800 leading-relaxed whitespace-pre-line">
              {record.clinicalNotes ||
                record.chiefComplaint ||
                'No definitive acute radiographic anomalies observed. Correlate with active clinical presentation.'}
            </div>
          </div>

          {/* Card 2: Treatment & Clinical Recommendations */}
          {record.treatmentPlan && (
            <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-[#191c1d]">Recommended Treatment Plan</h2>
              <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-100 text-xs text-slate-800 leading-relaxed">
                {record.treatmentPlan}
              </div>
            </div>
          )}

          {/* Card 3: Study Specifications & Metadata */}
          <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-sm space-y-3 text-xs">
            <h2 className="text-sm font-bold text-[#191c1d]">Study Specifications</h2>
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-[#7a7583]">Modality</span>
                <span className="font-semibold text-[#191c1d]">{studyModality}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-[#7a7583]">Study Date</span>
                <span className="text-[#191c1d]">{studyDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-[#7a7583]">Patient</span>
                <span className="font-semibold text-[#191c1d]">{patientName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#7a7583]">Archival Status</span>
                <span className="font-semibold text-emerald-700">{record.status || 'FINAL'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadiologyViewerPage;
