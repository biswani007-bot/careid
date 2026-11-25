import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plus,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { patientService, PatientProfileDetail, PatientListItem } from '@/services/patientService';
import { consultationService, ClinicalEncounterPayload } from '@/services/consultationService';

export const CreateClinicalNotePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId') || '';

  const { user } = useAuth();

  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [patientDetail, setPatientDetail] = useState<PatientProfileDetail | null>(null);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State: Subjective (S)
  const [title, setTitle] = useState('Outpatient Cardiology Clinical Consultation');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [hpi, setHpi] = useState('');
  const [reviewOfSystems, setReviewOfSystems] = useState('');

  // Form State: Objective (O)
  const [physicalExam, setPhysicalExam] = useState('');
  const [systolicBp, setSystolicBp] = useState<number | ''>(120);
  const [diastolicBp, setDiastolicBp] = useState<number | ''>(80);
  const [pulseBpm, setPulseBpm] = useState<number | ''>(72);
  const [oxygenSaturation, setOxygenSaturation] = useState<number | ''>(98);
  const [temperatureC, setTemperatureC] = useState<number | ''>(36.8);

  // Form State: Assessment (A)
  const [clinicalAssessment, setClinicalAssessment] = useState('');
  const [primaryIcdCode, setPrimaryIcdCode] = useState('I25.10');
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState('Atherosclerotic heart disease of native coronary artery');
  const [secondaryDiagnoses, setSecondaryDiagnoses] = useState<Array<{ code: string; description: string }>>([
    { code: 'I10', description: 'Essential (primary) hypertension' },
  ]);

  // Form State: Plan (P)
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [followUpInstructions, setFollowUpInstructions] = useState('Follow up in clinical practice in 4 weeks with repeat CMP.');
  const [noteStatus, setNoteStatus] = useState<'DRAFT' | 'FINAL'>('FINAL');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load patients directory on mount
  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoadingPatients(true);
      try {
        const res = await patientService.listPatients({ limit: 100 });
        setPatients(res.data || []);
        if (!selectedPatientId && res.data && res.data.length > 0) {
          setSelectedPatientId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load patients for SOAP notes:', err);
      } finally {
        setIsLoadingPatients(false);
      }
    };
    fetchPatients();
  }, []);

  // Hydrate selected patient profile
  useEffect(() => {
    if (!selectedPatientId) {
      setPatientDetail(null);
      return;
    }
    const fetchDetail = async () => {
      try {
        const detail = await patientService.getPatientById(selectedPatientId);
        setPatientDetail(detail);
      } catch (err) {
        console.error('Failed to load patient detail:', err);
      }
    };
    fetchDetail();
  }, [selectedPatientId]);

  const handleAddSecondaryDiagnosis = () => {
    setSecondaryDiagnoses([...secondaryDiagnoses, { code: '', description: '' }]);
  };

  const handleRemoveSecondaryDiagnosis = (idx: number) => {
    setSecondaryDiagnoses(secondaryDiagnoses.filter((_, i) => i !== idx));
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setError('Please select an authorized patient.');
      return;
    }
    if (!chiefComplaint.trim()) {
      setError('Chief Complaint (Subjective) is required.');
      return;
    }
    if (!primaryDiagnosis.trim()) {
      setError('Primary Assessment Diagnosis is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Build structured SOAP clinical note
    const structuredClinicalNotes = [
      `[SUBJECTIVE]\nChief Complaint: ${chiefComplaint.trim()}\nHPI: ${hpi.trim() || 'No acute progression reported.'}\nROS: ${reviewOfSystems.trim() || 'Reviewed and negative except as noted.'}`,
      `[OBJECTIVE]\nPhysical Examination: ${physicalExam.trim() || 'Patient in no acute distress. Alert and oriented x3.'}`,
      `[ASSESSMENT]\nSummary: ${clinicalAssessment.trim() || primaryDiagnosis.trim()}`,
      `[PLAN]\nInterventions: ${treatmentPlan.trim() || 'Conservative medical management.'}\nFollow-Up: ${followUpInstructions.trim()}`,
    ].join('\n\n');

    const payload: ClinicalEncounterPayload = {
      title: title.trim() || 'Structured Clinical SOAP Note',
      chiefComplaint: chiefComplaint.trim(),
      clinicalNotes: structuredClinicalNotes,
      treatmentPlan: treatmentPlan.trim() || 'Clinical care plan initiated.',
      followUpInstructions: followUpInstructions.trim(),
      status: noteStatus,
      encounter: {
        providerName: user?.fullName || 'Attending Physician',
        encounterType: 'CONSULTATION',
        encounterDate: new Date().toISOString(),
      },
      diagnoses: [
        {
          code: primaryIcdCode.trim().toUpperCase() || 'R69',
          description: primaryDiagnosis.trim(),
          type: 'PRIMARY',
          status: 'ACTIVE',
        },
        ...secondaryDiagnoses
          .filter((d) => d.description.trim())
          .map((d) => ({
            code: d.code.trim().toUpperCase() || 'R69',
            description: d.description.trim(),
            type: 'SECONDARY',
            status: 'ACTIVE',
          })),
      ],
      vitalSigns: systolicBp && diastolicBp ? {
        systolicBp: Number(systolicBp),
        diastolicBp: Number(diastolicBp),
        pulseBpm: pulseBpm ? Number(pulseBpm) : undefined,
        oxygenSaturation: oxygenSaturation ? Number(oxygenSaturation) : undefined,
        temperatureC: temperatureC ? Number(temperatureC) : undefined,
      } : undefined,
    };

    try {
      await consultationService.createClinicalEncounter(selectedPatientId, payload);
      triggerToast(`Clinical SOAP note saved successfully as ${noteStatus}.`);
      setTimeout(() => {
        navigate(`/records?patientId=${selectedPatientId}`);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to save SOAP note:', err);
      setError(err?.message || 'Failed to save clinical encounter. Please verify inputs.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a1721] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm border border-purple-500/30 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="size-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/records')}
            className="p-2 hover:bg-gray-100 rounded-lg text-[#494552] transition flex items-center gap-1 text-sm font-medium"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Medical Records</span>
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-[#1a1721]">Create Clinical SOAP Note</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#716d7a]">Document Status:</span>
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setNoteStatus('DRAFT')}
              className={`px-3 py-1 rounded-lg transition ${
                noteStatus === 'DRAFT' ? 'bg-white text-[#1a1721] shadow-xs' : 'text-[#716d7a]'
              }`}
            >
              Draft
            </button>
            <button
              type="button"
              onClick={() => setNoteStatus('FINAL')}
              className={`px-3 py-1 rounded-lg transition ${
                noteStatus === 'FINAL' ? 'bg-[#5b14b8] text-white shadow-xs' : 'text-[#716d7a]'
              }`}
            >
              Final & Signed
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-xs text-red-700">
          <AlertTriangle className="size-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Patient Selection Bar */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="block text-xs font-bold text-[#1a1721] mb-1">Target Patient *</label>
            {isLoadingPatients ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="size-3.5 animate-spin text-[#5b14b8]" />
                <span>Loading authorized patients...</span>
              </div>
            ) : (
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg p-2.5 bg-white min-w-[280px] focus:outline-none focus:border-[#5b14b8]"
              >
                {patients.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.fullName} ({pt.patientNumber || 'PT-RECORD'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {patientDetail && (
            <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-3 flex items-center gap-4 text-xs">
              <div>
                <span className="text-[#716d7a]">MRN: </span>
                <span className="font-semibold text-[#1a1721]">{patientDetail.patientNumber || 'PT-302602'}</span>
              </div>
              <div className="h-4 w-px bg-purple-200" />
              <div>
                <span className="text-[#716d7a]">Gender/Age: </span>
                <span className="font-semibold text-[#1a1721]">
                  {patientDetail.gender || 'M'} • 38y
                </span>
              </div>
              <div className="h-4 w-px bg-purple-200" />
              <div>
                <span className="text-[#716d7a]">Blood: </span>
                <span className="font-semibold text-[#1a1721]">{patientDetail.bloodGroup || 'O+'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main SOAP Documentation Form */}
      <form onSubmit={handleSubmitNote} className="space-y-6">
        {/* Document Title */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm space-y-2">
          <label className="block text-xs font-bold text-[#1a1721]">Encounter Title *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
          />
        </div>

        {/* SECTION S: Subjective */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#f1f3f5] pb-3">
            <span className="size-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
              S
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#1a1721]">Subjective Documentation</h2>
              <p className="text-[11px] text-[#716d7a]">Chief complaint, history of present illness, patient-reported symptoms.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#494552] mb-1">Chief Complaint *</label>
            <input
              type="text"
              required
              placeholder="e.g. Recurrent retrosternal chest pain with exertion lasting 15 minutes"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#494552] mb-1">History of Present Illness (HPI)</label>
            <textarea
              rows={3}
              placeholder="Onset, location, duration, character, aggravating/relieving factors, radiation..."
              value={hpi}
              onChange={(e) => setHpi(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#494552] mb-1">Review of Systems (ROS)</label>
            <textarea
              rows={2}
              placeholder="Cardiovascular: Palpitations (+). Resp: Dyspnea on exertion (+). Neuro: Lightheadedness (-)..."
              value={reviewOfSystems}
              onChange={(e) => setReviewOfSystems(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
            />
          </div>
        </div>

        {/* SECTION O: Objective */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#f1f3f5] pb-3">
            <span className="size-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
              O
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#1a1721]">Objective Findings & Telemetry</h2>
              <p className="text-[11px] text-[#716d7a]">Physical examination, vital signs, and clinical observations.</p>
            </div>
          </div>

          {/* Vitals Telemetry Row */}
          <div>
            <label className="block text-xs font-semibold text-[#494552] mb-2">Encounter Vital Signs</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <span className="text-[11px] text-[#716d7a] block mb-1">Systolic BP</span>
                <input
                  type="number"
                  value={systolicBp}
                  onChange={(e) => setSystolicBp(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-[#5b14b8]"
                />
              </div>
              <div>
                <span className="text-[11px] text-[#716d7a] block mb-1">Diastolic BP</span>
                <input
                  type="number"
                  value={diastolicBp}
                  onChange={(e) => setDiastolicBp(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-[#5b14b8]"
                />
              </div>
              <div>
                <span className="text-[11px] text-[#716d7a] block mb-1">Heart Rate (BPM)</span>
                <input
                  type="number"
                  value={pulseBpm}
                  onChange={(e) => setPulseBpm(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-[#5b14b8]"
                />
              </div>
              <div>
                <span className="text-[11px] text-[#716d7a] block mb-1">SpO2 (%)</span>
                <input
                  type="number"
                  value={oxygenSaturation}
                  onChange={(e) => setOxygenSaturation(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-[#5b14b8]"
                />
              </div>
              <div>
                <span className="text-[11px] text-[#716d7a] block mb-1">Temp (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={temperatureC}
                  onChange={(e) => setTemperatureC(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-[#5b14b8]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#494552] mb-1">Physical Examination Findings</label>
            <textarea
              rows={3}
              placeholder="Cardiovascular: Regular rate and rhythm, normal S1/S2, no murmurs. Lungs: Clear to auscultation bilaterally..."
              value={physicalExam}
              onChange={(e) => setPhysicalExam(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
            />
          </div>
        </div>

        {/* SECTION A: Assessment */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#f1f3f5] pb-3">
            <span className="size-7 rounded-lg bg-purple-100 text-[#5b14b8] font-bold text-xs flex items-center justify-center">
              A
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#1a1721]">Assessment & Diagnoses</h2>
              <p className="text-[11px] text-[#716d7a]">Clinical diagnostic synthesis, primary & secondary ICD-10 coding.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#494552] mb-1">Primary ICD-10 Code *</label>
              <input
                type="text"
                required
                value={primaryIcdCode}
                onChange={(e) => setPrimaryIcdCode(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-[#494552] mb-1">Primary Clinical Diagnosis Description *</label>
              <input
                type="text"
                required
                value={primaryDiagnosis}
                onChange={(e) => setPrimaryDiagnosis(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
              />
            </div>
          </div>

          {/* Secondary Diagnoses */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#494552]">Secondary / Comorbid Diagnoses</label>
              <button
                type="button"
                onClick={handleAddSecondaryDiagnosis}
                className="text-xs text-[#5b14b8] hover:underline font-medium flex items-center gap-1"
              >
                <Plus className="size-3.5" />
                <span>Add Diagnosis</span>
              </button>
            </div>

            {secondaryDiagnoses.map((diag, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Code (e.g. I10)"
                  value={diag.code}
                  onChange={(e) => {
                    const next = [...secondaryDiagnoses];
                    next[idx].code = e.target.value;
                    setSecondaryDiagnoses(next);
                  }}
                  className="w-28 text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-[#5b14b8]"
                />
                <input
                  type="text"
                  placeholder="Diagnosis Description"
                  value={diag.description}
                  onChange={(e) => {
                    const next = [...secondaryDiagnoses];
                    next[idx].description = e.target.value;
                    setSecondaryDiagnoses(next);
                  }}
                  className="flex-1 text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-[#5b14b8]"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSecondaryDiagnosis(idx)}
                  className="p-2 text-gray-400 hover:text-red-600 transition"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#494552] mb-1">Clinical Synthesis / Assessment Summary</label>
            <textarea
              rows={2}
              placeholder="Clinical reasoning and differential considerations..."
              value={clinicalAssessment}
              onChange={(e) => setClinicalAssessment(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
            />
          </div>
        </div>

        {/* SECTION P: Plan */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#f1f3f5] pb-3">
            <span className="size-7 rounded-lg bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center">
              P
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#1a1721]">Care Plan & Disposition</h2>
              <p className="text-[11px] text-[#716d7a]">Pharmacotherapy, diagnostic orders, patient education, follow-up schedule.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#494552] mb-1">Treatment Plan & Orders</label>
            <textarea
              rows={3}
              placeholder="1. Initiate Statin therapy. 2. Order stress myocardial perfusion scan. 3. Low-sodium diet education provided..."
              value={treatmentPlan}
              onChange={(e) => setTreatmentPlan(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#494552] mb-1">Follow-Up Instructions & Schedule</label>
            <input
              type="text"
              value={followUpInstructions}
              onChange={(e) => setFollowUpInstructions(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/records')}
            className="px-5 py-2.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-[#5b14b8] hover:bg-[#4a0f96] text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Signing & Persisting...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="size-4 text-emerald-300" />
                <span>{noteStatus === 'FINAL' ? 'Finalize & Sign Clinical Note' : 'Save SOAP Draft'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
