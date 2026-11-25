import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  Download,
  FlaskConical,
  Printer,
  RotateCw,
  Stethoscope,
  Video,
  ZoomIn,
  ZoomOut,
  FileText,
  AlertTriangle,
  AlertCircle,
  ArrowLeft,
  Activity,
  Layers,
} from 'lucide-react';
import { patientService, MedicalRecord, PatientProfileDetail } from '@/services/patientService';
import { dashboardService, DoctorProfile } from '@/services/dashboardService';

function cleanClinicalText(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();
  if (
    !trimmed ||
    lower === 'string' ||
    lower === 'undefined' ||
    lower === 'null' ||
    lower === 'n/a' ||
    lower === 'none'
  ) {
    return null;
  }
  return trimmed;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 KB';
  if (bytes > 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function getFormatBadge(mimeType?: string, fileName?: string): string {
  if (mimeType?.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf')) return 'PDF';
  if (mimeType?.includes('image') || fileName?.match(/\.(png|jpg|jpeg|webp)$/i)) return 'IMG';
  if (mimeType?.includes('dicom') || fileName?.match(/\.(dcm|dicom)$/i)) return 'DCM';
  if (mimeType?.includes('json')) return 'JSON';
  return 'EHR';
}

export const RecordDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get('patientId');

  const [zoomLevel, setZoomLevel] = useState(100);
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [patient, setPatient] = useState<PatientProfileDetail | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isClinicalRoute = window.location.pathname.includes('/records/clinical');

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch doctor profile for clinician metadata
      try {
        const doc = await dashboardService.getDoctorProfile();
        setDoctorProfile(doc);
      } catch {
        // Non-critical, continue
      }

      // 2. Fetch medical record details
      let rec: MedicalRecord | null = null;
      let targetPatientId = patientIdParam;

      if (!targetPatientId) {
        const recent = patientService.getRecentlyViewed();
        if (recent.length > 0 && recent[0].id) {
          targetPatientId = recent[0].id;
        }
      }

      if (id && id !== 'clinical') {
        rec = await patientService.getMedicalRecordById(id, targetPatientId || undefined);
      } else if (targetPatientId) {
        // Clinical Reports route: find latest clinical consultation / progress note
        const records = await patientService.getPatientMedicalRecords(targetPatientId);
        rec =
          records.find(
            (r) =>
              r.attachments?.some((a) => a.category?.toLowerCase().includes('clinical')) ||
              r.title.toLowerCase().includes('consult') ||
              r.title.toLowerCase().includes('encounter') ||
              r.title.toLowerCase().includes('checkup') ||
              r.title.toLowerCase().includes('soap') ||
              r.title.toLowerCase().includes('history')
          ) || records[0] || null;
      }

      if (!rec) {
        throw new Error(
          id && id !== 'clinical'
            ? `Unable to locate clinical record with ID #${id}.`
            : 'No clinical consultation or encounter reports found for this patient.'
        );
      }

      setRecord(rec);

      // 3. Resolve associated patient profile
      const finalPatientId =
        targetPatientId ||
        rec.patientProfileId ||
        (rec as unknown as Record<string, unknown>).patientId;

      if (finalPatientId && typeof finalPatientId === 'string') {
        try {
          const p = await patientService.getPatientById(finalPatientId);
          setPatient(p);
        } catch {
          // Patient details optional if record has embedded patient
        }
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to load ${isClinicalRoute ? 'clinical report' : 'medical record'}`
      );
    } finally {
      setIsLoading(false);
    }
  }, [id, patientIdParam, isClinicalRoute]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="h-12 bg-white border border-[#cbc4d4] rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#f3f4f5] border border-[#cbc4d4] rounded-2xl min-h-[600px]" />
          <div className="lg:col-span-5 space-y-4">
            <div className="h-28 bg-white border border-[#cbc4d4] rounded-2xl" />
            <div className="h-44 bg-white border border-[#cbc4d4] rounded-2xl" />
            <div className="h-32 bg-white border border-[#cbc4d4] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="w-full max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="size-16 rounded-full bg-rose-50 text-[#ba1a1a] mx-auto flex items-center justify-center">
          <AlertTriangle className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          {isClinicalRoute ? 'Clinical Report Unavailable' : 'Medical Record Unavailable'}
        </h2>
        <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-800 max-w-md mx-auto leading-relaxed">
          {error || `Unable to locate clinical record with ID #${id}.`}
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={loadData}
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

  // --- Dynamic Data Resolution & Sanitization ---

  const recPatient = (record as unknown as {
    patient?: {
      firstName?: string;
      lastName?: string;
      fullName?: string;
      patientNumber?: string;
      mrn?: string;
    };
  })?.patient;

  const rawPatientName =
    patient?.fullName?.trim() ||
    [patient?.firstName, patient?.lastName].filter(Boolean).join(' ').trim() ||
    recPatient?.fullName?.trim() ||
    [recPatient?.firstName, recPatient?.lastName].filter(Boolean).join(' ').trim();

  const patientName =
    cleanClinicalText(rawPatientName) ||
    (record.patientProfileId ? `Patient #${record.patientProfileId.slice(0, 8)}` : 'Confidential Patient');

  const rawPatientNumber =
    recPatient?.patientNumber ||
    recPatient?.mrn ||
    patient?.patientNumber ||
    patient?.healthCard?.cardNumber ||
    record.patientProfileId;

  const patientNumber =
    cleanClinicalText(rawPatientNumber) ||
    (record.patientProfileId ? `HV-${record.patientProfileId.slice(0, 8).toUpperCase()}` : 'ID Unassigned');

  const dateFormatted = record.createdAt
    ? new Date(record.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent';

  // Attachments Handling
  const attachments = Array.isArray(record.attachments) ? record.attachments : [];
  const activeAttachment =
    attachments.length > 0
      ? attachments[Math.min(selectedAttachmentIndex, attachments.length - 1)]
      : null;

  const docName = activeAttachment?.fileName || `${record.title.replace(/\s+/g, '_')}.pdf`;
  const formatBadge = getFormatBadge(activeAttachment?.mimeType, activeAttachment?.fileName);

  // Metadata Extraction
  const encounterFacility = record.encounters?.[0]?.facilityName;
  const hospitalName =
    cleanClinicalText(encounterFacility) ||
    cleanClinicalText(record.facilityName) ||
    cleanClinicalText(doctorProfile?.department ? `${doctorProfile.department} Clinic` : null) ||
    'Authorized Healthcare Facility';

  const recExtras = record as unknown as Record<string, string | undefined>;
  const laboratoryName =
    cleanClinicalText(recExtras.laboratoryName) ||
    cleanClinicalText(recExtras.labName) ||
    cleanClinicalText(encounterFacility) ||
    cleanClinicalText(record.facilityName) ||
    'Diagnostic Laboratory';

  const encounterPhysician = record.encounters?.[0]?.providerName;
  const physicianName =
    cleanClinicalText(encounterPhysician) ||
    cleanClinicalText(doctorProfile?.fullName) ||
    'Attending Clinician';

  // Clinical findings cleaning
  const chiefComplaint = cleanClinicalText(record.chiefComplaint);
  const clinicalNotes = cleanClinicalText(record.clinicalNotes);
  const treatmentPlan = cleanClinicalText(record.treatmentPlan);
  const followUpInstructions = cleanClinicalText(record.followUpInstructions);

  const isFinal = record.status === 'FINAL';
  const isPreliminary = record.status === 'PRELIMINARY';
  const isArchived = record.status === 'ARCHIVED';

  return (
    <div className="w-full space-y-4" data-node-id="1:5719">
      {/* 1. Document Viewer Top Bar (Figma node 1:5721) */}
      <div className="bg-white border border-[#cbc4d4] rounded-xl px-4 py-2.5 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded bg-purple-100 text-[#5b14b8] flex items-center justify-center font-bold text-xs uppercase">
            {formatBadge}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#191c1d]">
              {docName}
            </span>
            {activeAttachment?.fileSize ? (
              <span className="text-xs text-[#7a7583]">
                ({formatFileSize(activeAttachment.fileSize)})
              </span>
            ) : null}
          </div>
        </div>

        {/* Action Controls on Document Bar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(75, prev - 15))}
              className="p-1 hover:bg-slate-200/60 rounded text-[#494552] transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="size-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[#191c1d]">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(150, prev + 15))}
              className="p-1 hover:bg-slate-200/60 rounded text-[#494552] transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="size-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setZoomLevel(100)}
            className="p-2 rounded-lg bg-white border border-slate-200 text-[#494552] hover:bg-slate-50 transition-colors cursor-pointer"
            title="Reset Zoom"
          >
            <RotateCw className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeAttachment?.storageUrl) {
                window.open(activeAttachment.storageUrl, '_blank');
              } else {
                window.print();
              }
            }}
            className="p-2 rounded-lg bg-white border border-slate-200 text-[#494552] hover:bg-slate-50 transition-colors cursor-pointer"
            title="Download / Print"
          >
            <Download className="size-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (60%, Span 7): Document Paper Canvas */}
        <div
          aria-label="Document Viewer Canvas"
          className="lg:col-span-7 bg-[#f3f4f5] border border-[#cbc4d4] rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col items-center justify-center min-h-[680px]"
        >
          {/* White Paper Canvas */}
          <div
            className="w-full bg-white border border-slate-200 rounded-xl p-8 shadow-md space-y-6 text-xs text-[#191c1d] transition-transform"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          >
            {/* Header: Clinical Report */}
            <div className="flex items-start justify-between pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#191c1d]">{hospitalName}</h2>
                <div className="text-xs text-[#7a7583]">Central Clinical Care System</div>
              </div>
              <div className="text-right text-xs">
                <div className="font-bold uppercase tracking-wider text-[#191c1d]">CONFIDENTIAL MEDICAL RECORD</div>
                <div className="text-[#7a7583]">Date: {dateFormatted}</div>
              </div>
            </div>

            {/* Purple Divider */}
            <div className="h-0.5 w-full bg-[#5b14b8]" />

            {/* Patient Information Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#5b14b8]">Patient Information</h3>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <div>
                  <span className="text-[#7a7583]">Name:</span>{' '}
                  <strong className="text-[#191c1d]">{patientName}</strong>
                </div>
                <div>
                  <span className="text-[#7a7583]">ID / MRN:</span>{' '}
                  <strong className="text-[#191c1d]">{patientNumber}</strong>
                </div>
                <div>
                  <span className="text-[#7a7583]">Document:</span>{' '}
                  <strong className="text-[#191c1d]">{record.title}</strong>
                </div>
                <div>
                  <span className="text-[#7a7583]">Status:</span>{' '}
                  <strong
                    className={
                      isFinal
                        ? 'text-emerald-700'
                        : isPreliminary
                        ? 'text-amber-700'
                        : 'text-slate-700'
                    }
                  >
                    {record.status}
                  </strong>
                </div>
              </div>
            </div>

            {/* Clinical Findings & Notes */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-[#5b14b8]">Clinical Examination &amp; Findings</h3>

              {chiefComplaint ? (
                <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-700">Chief Complaint:</span>
                  <p className="text-[#191c1d]">{chiefComplaint}</p>
                </div>
              ) : (
                <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-700">Chief Complaint:</span>
                  <p className="text-[#7a7583] italic">No chief complaint documented for this record.</p>
                </div>
              )}

              {clinicalNotes ? (
                <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-700">Clinical Notes:</span>
                  <p className="text-[#191c1d] whitespace-pre-line leading-relaxed">{clinicalNotes}</p>
                </div>
              ) : (
                <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-700">Clinical Notes:</span>
                  <p className="text-[#7a7583] italic">No clinical notes recorded.</p>
                </div>
              )}

              {treatmentPlan ? (
                <div className="space-y-1 bg-purple-50/50 p-3 rounded-lg border border-purple-100">
                  <span className="font-bold text-[#5b14b8]">Treatment Plan:</span>
                  <p className="text-[#191c1d] whitespace-pre-line leading-relaxed">{treatmentPlan}</p>
                </div>
              ) : (
                <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-700">Treatment Plan:</span>
                  <p className="text-[#7a7583] italic">No treatment plan documented.</p>
                </div>
              )}

              {followUpInstructions ? (
                <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-700">Follow-up Instructions:</span>
                  <p className="text-[#191c1d]">{followUpInstructions}</p>
                </div>
              ) : (
                <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-700">Follow-up Instructions:</span>
                  <p className="text-[#7a7583] italic">No follow-up instructions specified.</p>
                </div>
              )}

              {/* Diagnoses List */}
              {record.diagnoses && record.diagnoses.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="font-bold text-[#5b14b8]">Clinical Diagnoses:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {record.diagnoses.map((d, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs">
                        <div className="font-semibold text-[#191c1d]">{d.description}</div>
                        <div className="text-[10px] text-[#7a7583] flex items-center gap-2 mt-0.5">
                          {d.code && (
                            <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">
                              ICD: {d.code}
                            </span>
                          )}
                          {d.type && <span>{d.type}</span>}
                          {d.status && <span className="text-emerald-700 font-semibold">{d.status}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vital Signs List */}
              {record.vitalSigns && record.vitalSigns.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="font-bold text-[#5b14b8] flex items-center gap-1.5">
                    <Activity className="size-3.5" />
                    <span>Recorded Vital Signs:</span>
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {record.vitalSigns.map((vs, idx) => (
                      <div key={idx} className="p-2 rounded-lg border border-slate-100 bg-slate-50 text-xs space-y-0.5">
                        {vs.systolicBp && vs.diastolicBp && (
                          <div>
                            <span className="text-[#7a7583]">BP:</span>{' '}
                            <strong>{vs.systolicBp}/{vs.diastolicBp}</strong>{' '}
                            <span className="text-[10px] text-slate-500">mmHg</span>
                          </div>
                        )}
                        {vs.pulseBpm && (
                          <div>
                            <span className="text-[#7a7583]">Pulse:</span>{' '}
                            <strong>{vs.pulseBpm}</strong>{' '}
                            <span className="text-[10px] text-slate-500">bpm</span>
                          </div>
                        )}
                        {vs.temperatureC && (
                          <div>
                            <span className="text-[#7a7583]">Temp:</span>{' '}
                            <strong>{vs.temperatureC}</strong>{' '}
                            <span className="text-[10px] text-slate-500">°C</span>
                          </div>
                        )}
                        {vs.oxygenSaturation && (
                          <div>
                            <span className="text-[#7a7583]">SpO2:</span>{' '}
                            <strong>{vs.oxygenSaturation}</strong>{' '}
                            <span className="text-[10px] text-slate-500">%</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Procedures List */}
              {record.procedures && record.procedures.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="font-bold text-[#5b14b8]">Procedures Documented:</span>
                  <div className="space-y-1.5">
                    {record.procedures.map((proc, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-[#191c1d]">{proc.name}</div>
                          {proc.notes && <div className="text-[11px] text-[#7a7583]">{proc.notes}</div>}
                        </div>
                        <div className="text-right text-[11px] text-slate-500 font-mono">
                          {proc.code && <span className="bg-slate-100 px-1 py-0.5 rounded">{proc.code}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments List */}
              <div className="space-y-2 pt-2">
                <span className="font-bold text-[#5b14b8] flex items-center gap-1.5">
                  <Layers className="size-3.5" />
                  <span>Digital Attachments ({attachments.length}):</span>
                </span>
                {attachments.length > 0 ? (
                  <div className="space-y-2">
                    {attachments.map((att, idx) => {
                      const isSelected = idx === selectedAttachmentIndex;
                      return (
                        <div
                          key={att.id || idx}
                          onClick={() => setSelectedAttachmentIndex(idx)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#5b14b8] bg-purple-50/40 shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-[#5b14b8] shrink-0" />
                            <div>
                              <div className="font-semibold text-[#191c1d]">{att.fileName}</div>
                              <div className="text-[10px] text-[#7a7583]">
                                {att.category} • {formatFileSize(att.fileSize)} •{' '}
                                <span
                                  className={
                                    att.virusScanStatus === 'CLEAN'
                                      ? 'text-emerald-700 font-medium'
                                      : 'text-slate-500'
                                  }
                                >
                                  {att.virusScanStatus || 'Verified'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {att.storageUrl ? (
                            <a
                              href={att.storageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2.5 py-1 rounded text-xs font-semibold bg-purple-50 text-[#5b14b8] hover:bg-purple-100 border border-purple-200 flex items-center gap-1 transition-colors"
                            >
                              <Download className="size-3" />
                              <span>Download</span>
                            </a>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Verified Scan
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#7a7583] italic">No digital attachments linked to this record.</p>
                )}
              </div>
            </div>

            {/* Footer Certification */}
            <div className="pt-8 border-t border-slate-200 text-center text-[11px] text-[#7a7583]">
              End of Record. Verified through CareID Cryptographic Clinical Registry.
            </div>
          </div>
        </div>

        {/* Right Column (40%, Span 5): Clinical Findings & Actions (Figma node 1:5842) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Record Summary */}
          <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#191c1d]">{record.title}</h2>
                <div className="text-xs text-[#7a7583]">{dateFormatted}</div>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isFinal
                    ? 'bg-[#e0f7fa] text-[#00838f]'
                    : isPreliminary
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Check className="size-3 stroke-[3]" />
                <span>{record.status}</span>
              </span>
            </div>

            {isFinal ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-[#191c1d]">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Verified Clinical Record</div>
                  <div className="text-[#7a7583]">
                    {treatmentPlan ? 'Treatment plan documented and filed.' : 'Clinical review complete and finalized.'}
                  </div>
                </div>
              </div>
            ) : isPreliminary ? (
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-950">
                <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Preliminary Clinical Record</div>
                  <div className="text-amber-800">Awaiting secondary clinician sign-off or lab confirmation.</div>
                </div>
              </div>
            ) : isArchived ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-[#191c1d]">
                <FileText className="size-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Archived Record</div>
                  <div className="text-[#7a7583]">This record has been archived and made immutable.</div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-[#191c1d]">
                <FileText className="size-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Draft Record</div>
                  <div className="text-[#7a7583]">Clinical record documentation in progress.</div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Clinical Details */}
          <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-[#191c1d]">Record Details</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-[#7a7583]">Patient</span>
                <span className="font-semibold text-[#191c1d]">{patientName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-[#7a7583]">Health ID</span>
                <span className="font-mono text-[#191c1d]">{patientNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-[#7a7583]">Status</span>
                <span
                  className={`font-semibold ${
                    isFinal ? 'text-emerald-700' : isPreliminary ? 'text-amber-700' : 'text-slate-700'
                  }`}
                >
                  {record.status}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#7a7583]">Recorded On</span>
                <span className="text-[#191c1d]">{dateFormatted}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Metadata */}
          <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-sm space-y-3 text-xs">
            <h3 className="text-sm font-bold text-[#191c1d]">Metadata</h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="size-4 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                  +
                </span>
                <span className="text-[#7a7583]">Hospital / Clinic:</span>
                <span className="font-semibold text-[#191c1d] ml-auto text-right truncate max-w-[200px]" title={hospitalName}>
                  {hospitalName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FlaskConical className="size-3.5 text-[#7a7583] shrink-0" />
                <span className="text-[#7a7583]">Laboratory:</span>
                <span className="font-semibold text-[#191c1d] ml-auto text-right truncate max-w-[200px]" title={laboratoryName}>
                  {laboratoryName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Stethoscope className="size-3.5 text-[#7a7583] shrink-0" />
                <span className="text-[#7a7583]">Physician:</span>
                <span className="font-semibold text-[#191c1d] ml-auto text-right truncate max-w-[200px]" title={physicianName}>
                  {physicianName}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                const targetPatientId = patientIdParam || record.patientProfileId;
                if (targetPatientId) {
                  navigate(`/treatment-offers/new/step-1?patientId=${encodeURIComponent(targetPatientId)}`, {
                    state: {
                      patientId: targetPatientId,
                      recordId: record.id,
                    },
                  });
                } else {
                  navigate('/treatment-offers/new/step-1');
                }
              }}
              className="w-full h-11 rounded-xl bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white text-sm font-semibold hover:opacity-95 transition-all shadow-sm flex items-center justify-center gap-2 focus:outline-none cursor-pointer"
            >
              <Video className="size-4" />
              <span>Start Consultation</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (activeAttachment?.storageUrl) {
                    window.open(activeAttachment.storageUrl, '_blank');
                  } else {
                    window.print();
                  }
                }}
                className="h-10 px-3 rounded-lg bg-white border border-[#cbc4d4] text-xs font-semibold text-[#191c1d] hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm focus:outline-none cursor-pointer"
              >
                <Download className="size-3.5 text-[#494552]" />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="h-10 px-3 rounded-lg bg-white border border-[#cbc4d4] text-xs font-semibold text-[#191c1d] hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm focus:outline-none cursor-pointer"
              >
                <Printer className="size-3.5 text-[#494552]" />
                <span>Print Summary</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordDetailPage;
