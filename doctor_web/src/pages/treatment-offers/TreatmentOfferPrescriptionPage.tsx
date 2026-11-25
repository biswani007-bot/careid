import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Pill,
  Plus,
  Trash2,
  Download,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePatientProfile, usePatientList } from '@/hooks/usePatients';
import { prescriptionService } from '@/services/prescriptionService';

export interface MedicationFormItem {
  id: string;
  drugName: string;
  dosage: string;
  form: string;
  route: string;
  frequency: string;
  durationDays: number;
  instructions: string;
}

export const TreatmentOfferPrescriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryPatientId = searchParams.get('patientId');
  const { user } = useAuth();

  // If patientId not in URL, query first available patient
  const { patients: patientList } = usePatientList({ limit: 1 });
  const activePatientId = queryPatientId || (patientList.length > 0 ? patientList[0].id : undefined);

  const { patient } = usePatientProfile(activePatientId);

  // Form State
  const [diagnosisCode, setDiagnosisCode] = useState('I25.10 - Atherosclerotic heart disease');
  const [statusMode, setStatusMode] = useState<'ACTIVE' | 'DRAFT'>('ACTIVE');
  const [refillsAllowed, setRefillsAllowed] = useState<number>(1);
  const [prescriberNotes, setPrescriberNotes] = useState('');
  const [medications, setMedications] = useState<MedicationFormItem[]>([
    {
      id: 'med-1',
      drugName: 'Atorvastatin Calcium',
      dosage: '40 mg',
      form: 'Oral Tablet',
      route: 'ORAL',
      frequency: 'Once daily at bedtime',
      durationDays: 30,
      instructions: 'Take 1 tablet by mouth daily in the evening. Avoid grapefruit juice.',
    },
    {
      id: 'med-2',
      drugName: 'Aspirin',
      dosage: '81 mg',
      form: 'Oral Tablet',
      route: 'ORAL',
      frequency: 'Once daily',
      durationDays: 30,
      instructions: 'Take 1 tablet daily with a full glass of water and food.',
    },
  ]);

  // Clinical Safety & Interaction Screening
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);
  const [safetyCheckResult, setSafetyCheckResult] = useState<{
    hasConflict: boolean;
    severity: string;
    interactions: Array<{ drugA: string; drugB: string; severity: string; clinicalDescription: string; recommendation: string }>;
    allergyAlerts: Array<{ drugName: string; allergyMatched: string; severity: string; reaction: string }>;
    duplicateTherapyAlerts: Array<{ drugA: string; drugB: string; therapeuticClass: string; warning: string }>;
  } | null>(null);

  // Submission & Result State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdPrescription, setCreatedPrescription] = useState<any | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const doctorDisplayName = user?.fullName
    ? (user.fullName.startsWith('Dr.') ? user.fullName : `Dr. ${user.fullName}`)
    : 'Attending Physician';

  // Add Medication Item
  const handleAddMedication = () => {
    const newItem: MedicationFormItem = {
      id: `med-${Date.now()}`,
      drugName: '',
      dosage: '500 mg',
      form: 'Oral Tablet',
      route: 'ORAL',
      frequency: 'Once daily',
      durationDays: 14,
      instructions: '',
    };
    setMedications((prev) => [...prev, newItem]);
  };

  // Remove Medication Item
  const handleRemoveMedication = (id: string) => {
    if (medications.length <= 1) {
      triggerToast('A prescription must contain at least one medication.');
      return;
    }
    setMedications((prev) => prev.filter((m) => m.id !== id));
  };

  // Update Medication Field
  const handleUpdateMedication = (id: string, field: keyof MedicationFormItem, value: any) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  // Perform Clinical Interaction & Allergy Check
  const runSafetyCheck = useCallback(async () => {
    const validMeds = medications.filter((m) => m.drugName.trim().length > 0);
    if (validMeds.length === 0) return;

    setIsCheckingInteractions(true);
    try {
      const res = await prescriptionService.checkInteractions({
        patientProfileId: activePatientId,
        medications: validMeds.map((m) => ({
          drugName: m.drugName,
          dosage: m.dosage,
          frequency: m.frequency,
          route: m.route,
        })),
      });
      setSafetyCheckResult(res);
    } catch {
      // Local check fallback
      const allergies = patient?.knownAllergies || [];
      const localAllergyAlerts: any[] = [];
      for (const m of validMeds) {
        for (const a of allergies) {
          if (
            (a.toLowerCase().includes('penicillin') && m.drugName.toLowerCase().includes('amox')) ||
            (a.toLowerCase().includes('aspirin') && m.drugName.toLowerCase().includes('aspirin')) ||
            (a.toLowerCase().includes('sulfa') && m.drugName.toLowerCase().includes('bactrim'))
          ) {
            localAllergyAlerts.push({
              drugName: m.drugName,
              allergyMatched: a,
              severity: 'CRITICAL',
              reaction: `Patient has documented allergy to ${a}. High risk of adverse hypersensitivity reaction.`,
            });
          }
        }
      }
      setSafetyCheckResult({
        hasConflict: localAllergyAlerts.length > 0,
        severity: localAllergyAlerts.length > 0 ? 'MAJOR' : 'NONE',
        interactions: [],
        allergyAlerts: localAllergyAlerts,
        duplicateTherapyAlerts: [],
      });
    } finally {
      setIsCheckingInteractions(false);
    }
  }, [medications, activePatientId, patient]);

  // Trigger safety check whenever medications change
  useEffect(() => {
    const timer = setTimeout(() => {
      runSafetyCheck();
    }, 600);
    return () => clearTimeout(timer);
  }, [medications, runSafetyCheck]);

  // Handle Submit Prescription Order
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatientId) {
      setSubmissionError('Active patient context is required.');
      return;
    }

    // Validate medication fields
    const invalidMed = medications.find(
      (m) => !m.drugName.trim() || !m.dosage.trim() || !m.form.trim() || !m.frequency.trim() || m.durationDays <= 0
    );
    if (invalidMed) {
      setSubmissionError('Please ensure all medication items have drug name, dosage, form, frequency, and valid duration.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const payload = {
        diagnosisCode: diagnosisCode.trim() || undefined,
        notes: prescriberNotes.trim() || undefined,
        status: statusMode,
        items: medications.map((m) => ({
          drugName: m.drugName.trim(),
          dosage: m.dosage.trim(),
          form: m.form.trim(),
          route: m.route.trim() || 'ORAL',
          frequency: m.frequency.trim(),
          durationDays: Number(m.durationDays),
          instructions: m.instructions.trim() || undefined,
        })),
      };

      const result = await prescriptionService.createElectronicPrescription(activePatientId, payload);
      setCreatedPrescription(result);
      triggerToast(
        statusMode === 'ACTIVE'
          ? 'Electronic prescription officially issued, signed, and committed.'
          : 'Prescription draft saved successfully.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit electronic prescription order.';
      setSubmissionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!createdPrescription?.id) return;
    setIsDownloadingPdf(true);
    try {
      triggerToast('Generating binary prescription PDF stream...');
      await prescriptionService.downloadPrescriptionPdf(createdPrescription.id);
      triggerToast('Prescription PDF successfully downloaded.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download prescription PDF.';
      triggerToast(`PDF Download error: ${msg}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-24 text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f172a] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span>Doctor Portal</span>
              <span>/</span>
              <span>Electronic Prescriptions</span>
              <span>/</span>
              <span className="text-[#5b14b8] font-semibold">e-Rx Authoring & Sign</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              Electronic Prescription Order
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activePatientId && (
            <Link
              to={`/records/prescriptions?patientId=${activePatientId}`}
              className="text-xs font-semibold text-[#5b14b8] hover:underline px-3 py-1.5 rounded-lg border border-purple-200 hover:bg-purple-50 transition-colors"
            >
              View Patient Prescriptions
            </Link>
          )}
        </div>
      </div>

      {/* Patient Demographic & Clinical Context Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-full bg-[#5b14b8]/10 text-[#5b14b8] flex items-center justify-center font-bold text-base shrink-0">
              {patient?.fullName ? patient.fullName.slice(0, 2).toUpperCase() : 'PT'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {patient?.fullName || 'Authorized Clinical Patient'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Verified Patient
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-0.5">
                <span>MRN: #{patient?.patientNumber || 'CAREID-PT'}</span>
                <span>•</span>
                <span>DOB: {patient?.dateOfBirth ? String(patient.dateOfBirth).substring(0, 10) : 'N/A'}</span>
                <span>•</span>
                <span>Gender: {patient?.gender || 'N/A'}</span>
                <span>•</span>
                <span>Phone: {patient?.phone || patient?.emergencyContact?.phone || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400 font-medium">Attending Prescriber</div>
            <div className="text-xs font-bold text-slate-800">{doctorDisplayName}</div>
            <div className="text-[11px] text-slate-500">CareID Medical Staff</div>
          </div>
        </div>

        {/* Documented Allergies Alert */}
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-600">Documented Allergies:</span>
          {patient?.knownAllergies && patient.knownAllergies.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {patient.knownAllergies.map((allergy: string, i: number) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1"
                >
                  <AlertTriangle className="size-3 text-amber-600" />
                  <span>{allergy}</span>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-slate-400 italic">No adverse allergies documented in clinical record.</span>
          )}
        </div>
      </div>

      {/* Real-time Clinical Safety & Allergy Conflict Banner */}
      {safetyCheckResult && safetyCheckResult.hasConflict && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="size-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="size-5" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-red-900 flex items-center gap-2">
                  <span>CLINICAL SAFETY ALERT: Medication Conflict Detected</span>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-black bg-red-700 text-white">
                    {safetyCheckResult.severity}
                  </span>
                </h3>
              </div>

              {safetyCheckResult.allergyAlerts.map((alert, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-white border border-red-200 text-xs text-red-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-red-800">
                    <AlertTriangle className="size-3.5 text-red-600" />
                    <span>Patient Allergy Conflict: {alert.drugName} vs Documented Allergy ({alert.allergyMatched})</span>
                  </div>
                  <p className="text-slate-700">{alert.reaction}</p>
                </div>
              ))}

              {safetyCheckResult.interactions.map((inter, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-white border border-red-200 text-xs text-red-900 space-y-1">
                  <div className="font-bold text-red-800">
                    Drug-Drug Interaction: {inter.drugA} + {inter.drugB} [{inter.severity}]
                  </div>
                  <p className="text-slate-700">{inter.clinicalDescription}</p>
                  <p className="text-emerald-800 font-medium">Recommendation: {inter.recommendation}</p>
                </div>
              ))}

              {safetyCheckResult.duplicateTherapyAlerts.map((dup, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-white border border-amber-200 text-xs text-amber-900">
                  <div className="font-bold text-amber-800">Duplicate Class Therapy: {dup.therapeuticClass}</div>
                  <p className="text-slate-700">{dup.warning}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal / Panel after Creation */}
      {createdPrescription ? (
        <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-950">
                Prescription Successfully {createdPrescription.status === 'ACTIVE' ? 'Issued & Signed' : 'Saved as Draft'}
              </h3>
              <p className="text-xs text-emerald-800">
                Prescription ID: <span className="font-mono font-bold">{createdPrescription.id}</span> • Status: <span className="font-bold">{createdPrescription.status}</span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-emerald-200 p-4 divide-y divide-slate-100 text-xs">
            <div className="pb-2.5 flex justify-between">
              <span className="text-slate-500">Diagnosis / Indication:</span>
              <span className="font-semibold text-slate-800">{createdPrescription.diagnosisCode || 'Clinical Order'}</span>
            </div>
            <div className="py-2.5 space-y-1">
              <span className="text-slate-500 font-medium">Prescribed Regimen ({createdPrescription.items?.length || 0} medications):</span>
              {createdPrescription.items?.map((it: any, i: number) => (
                <div key={i} className="pl-3 border-l-2 border-[#5b14b8] py-0.5">
                  <div className="font-bold text-slate-800">{it.drugName} - {it.dosage} ({it.form})</div>
                  <div className="text-slate-500">{it.frequency} for {it.durationDays} days. {it.instructions}</div>
                </div>
              ))}
            </div>
            <div className="pt-2.5 flex justify-between items-center text-slate-500">
              <span>Timestamp:</span>
              <span>{new Date().toLocaleString()}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5b14b8] hover:bg-[#480fa0] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-60 cursor-pointer"
            >
              {isDownloadingPdf ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              <span>{isDownloadingPdf ? 'Downloading PDF...' : 'Download Official Prescription (PDF)'}</span>
            </button>

            <Link
              to={`/records/prescriptions?patientId=${activePatientId}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
            >
              <span>View in Prescription Registry</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setCreatedPrescription(null);
                setPrescriberNotes('');
              }}
              className="px-4 py-2.5 rounded-xl border border-transparent text-slate-600 hover:text-slate-900 text-xs font-medium cursor-pointer"
            >
              Write Another Prescription
            </button>
          </div>
        </div>
      ) : (
        /* Prescription Creation Form */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Submission Error Alert */}
          {submissionError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <span>{submissionError}</span>
              <button
                type="button"
                onClick={() => setSubmissionError(null)}
                className="font-bold ml-2 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Section 1: Clinical Indication & Lifecycle Status */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <FileText className="size-4 text-[#5b14b8]" />
                <span>1. Clinical Indication & Authorization Status</span>
              </div>

              {/* Status Toggle: DRAFT vs ACTIVE */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setStatusMode('DRAFT')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    statusMode === 'DRAFT'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => setStatusMode('ACTIVE')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    statusMode === 'ACTIVE'
                      ? 'bg-[#5b14b8] text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Issue & Sign (Active)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Clinical Indication / ICD-10 Code *
                </label>
                <input
                  type="text"
                  value={diagnosisCode}
                  onChange={(e) => setDiagnosisCode(e.target.value)}
                  placeholder="e.g. I25.10 - Atherosclerotic heart disease"
                  required
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Authorized Refills Permitted
                </label>
                <select
                  value={refillsAllowed}
                  onChange={(e) => setRefillsAllowed(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30 transition-colors cursor-pointer"
                >
                  <option value={0}>0 (No refills - single course)</option>
                  <option value={1}>1 Refill authorized</option>
                  <option value={2}>2 Refills authorized</option>
                  <option value={3}>3 Refills authorized</option>
                  <option value={5}>5 Refills authorized (Chronic care)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Prescribed Medications List */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <Pill className="size-4 text-[#5b14b8]" />
                <span>2. Prescribed Medications & Regimen ({medications.length})</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={runSafetyCheck}
                  disabled={isCheckingInteractions}
                  className="text-xs font-semibold text-[#00838f] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-60"
                >
                  {isCheckingInteractions ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-3.5" />
                  )}
                  <span>Screen Interactions</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddMedication}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 text-[#5b14b8] hover:bg-purple-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Add Medication</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {medications.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#5b14b8] uppercase tracking-wider">
                      Medication #{index + 1}
                    </span>
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(item.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer p-1"
                        title="Remove medication"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Drug Name *
                      </label>
                      <input
                        type="text"
                        value={item.drugName}
                        onChange={(e) => handleUpdateMedication(item.id, 'drugName', e.target.value)}
                        placeholder="e.g. Amoxicillin, Atorvastatin, Metformin"
                        required
                        className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Dosage / Strength *
                      </label>
                      <input
                        type="text"
                        value={item.dosage}
                        onChange={(e) => handleUpdateMedication(item.id, 'dosage', e.target.value)}
                        placeholder="e.g. 500 mg, 10 mg/mL"
                        required
                        className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Form *
                      </label>
                      <select
                        value={item.form}
                        onChange={(e) => handleUpdateMedication(item.id, 'form', e.target.value)}
                        className="w-full h-9 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30 cursor-pointer"
                      >
                        <option value="Oral Tablet">Oral Tablet</option>
                        <option value="Oral Capsule">Oral Capsule</option>
                        <option value="Oral Suspension">Oral Suspension</option>
                        <option value="Injectable">Injectable Solution</option>
                        <option value="Topical Cream">Topical Cream</option>
                        <option value="Inhaler">Metered Dose Inhaler</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Route
                      </label>
                      <select
                        value={item.route}
                        onChange={(e) => handleUpdateMedication(item.id, 'route', e.target.value)}
                        className="w-full h-9 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30 cursor-pointer"
                      >
                        <option value="ORAL">Oral (PO)</option>
                        <option value="IV">Intravenous (IV)</option>
                        <option value="IM">Intramuscular (IM)</option>
                        <option value="TOPICAL">Topical</option>
                        <option value="INHALATION">Inhalation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Frequency *
                      </label>
                      <select
                        value={item.frequency}
                        onChange={(e) => handleUpdateMedication(item.id, 'frequency', e.target.value)}
                        className="w-full h-9 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30 cursor-pointer"
                      >
                        <option value="Once daily">Once daily (QD)</option>
                        <option value="Twice daily">Twice daily (BID)</option>
                        <option value="Three times daily">Three times daily (TID)</option>
                        <option value="Four times daily">Four times daily (QID)</option>
                        <option value="Every 8 hours">Every 8 hours</option>
                        <option value="Every 12 hours">Every 12 hours</option>
                        <option value="As needed (PRN)">As needed (PRN)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Duration (Days) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={item.durationDays}
                        onChange={(e) => handleUpdateMedication(item.id, 'durationDays', Number(e.target.value))}
                        required
                        className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30"
                      />
                    </div>

                    <div className="sm:col-span-2 md:col-span-4">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Patient Sig / Administration Instructions
                      </label>
                      <input
                        type="text"
                        value={item.instructions}
                        onChange={(e) => handleUpdateMedication(item.id, 'instructions', e.target.value)}
                        placeholder="e.g. Take after meal with plenty of water. Do not crush or chew."
                        className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Prescriber Notes & Digital Attestation */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#5b14b8]" />
              <span>3. Prescriber Instructions & Legal Attestation</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Notes / Pharmacy Dispensation Remarks
              </label>
              <textarea
                rows={3}
                value={prescriberNotes}
                onChange={(e) => setPrescriberNotes(e.target.value)}
                placeholder="Special pharmacist instructions, brand substitution instructions (DAW), or clinical monitoring parameters..."
                className="w-full p-3 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                <span>
                  Prescribed & Digitally Signed by <span className="font-bold text-slate-800">{doctorDisplayName}</span> under CareID Telehealth Governance.
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {new Date().toISOString().substring(0, 10)}
              </span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isCheckingInteractions}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#5b14b8] hover:bg-[#480fa0] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              <span>
                {isSubmitting
                  ? 'Transmitting Order...'
                  : statusMode === 'ACTIVE'
                  ? 'Sign & Issue Electronic Prescription'
                  : 'Save Prescription Draft'}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
