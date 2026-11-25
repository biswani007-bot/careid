import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  Heart,
  Thermometer,
  Gauge,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';
import { patientService, PatientProfileDetail, VitalSignsDTO, RecordVitalSignsPayload, calculateAge } from '@/services/patientService';

export const PatientVitalsDiagnosticsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<PatientProfileDetail | null>(null);
  const [vitalsList, setVitalsList] = useState<VitalSignsDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [formSystolic, setFormSystolic] = useState<number | ''>(120);
  const [formDiastolic, setFormDiastolic] = useState<number | ''>(80);
  const [formPulse, setFormPulse] = useState<number | ''>(72);
  const [formSpO2, setFormSpO2] = useState<number | ''>(98);
  const [formTemperature, setFormTemperature] = useState<number | ''>(36.8);
  const [formRespiration, setFormRespiration] = useState<number | ''>(16);
  const [formBloodSugar, setFormBloodSugar] = useState<number | ''>(95);
  const [formWeight, setFormWeight] = useState<number | ''>(70);
  const [formHeight, setFormHeight] = useState<number | ''>(175);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [pt, vitals] = await Promise.all([
        patientService.getPatientById(id),
        patientService.getPatientVitals(id, { limit: 50 }),
      ]);
      setPatient(pt);
      setVitalsList(vitals || []);
    } catch (err: any) {
      console.error('Failed to load vitals:', err);
      setError(err?.message || 'Failed to retrieve patient vital signs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleRecordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsSubmitting(true);
    setModalError(null);
    try {
      const payload: RecordVitalSignsPayload = {
        systolicBp: formSystolic !== '' ? Number(formSystolic) : undefined,
        diastolicBp: formDiastolic !== '' ? Number(formDiastolic) : undefined,
        pulseBpm: formPulse !== '' ? Number(formPulse) : undefined,
        oxygenSaturation: formSpO2 !== '' ? Number(formSpO2) : undefined,
        temperatureC: formTemperature !== '' ? Number(formTemperature) : undefined,
        respirationRate: formRespiration !== '' ? Number(formRespiration) : undefined,
        bloodSugarMgDl: formBloodSugar !== '' ? Number(formBloodSugar) : undefined,
        weightKg: formWeight !== '' ? Number(formWeight) : undefined,
        heightCm: formHeight !== '' ? Number(formHeight) : undefined,
      };

      await patientService.recordPatientVitals(id, payload);
      triggerToast('Physiological vitals recorded successfully.');
      setIsRecordModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Failed to record vitals:', err);
      setModalError(err?.message || 'Failed to record vitals. Please verify inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const latestVitals = vitalsList.length > 0 ? vitalsList[0] : null;

  if (loading) {
    return (
      <div className="min-h-[600px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-[#5b14b8]" />
        <span className="text-sm font-medium text-[#494552]">Retrieving physiological vitals & telemetry...</span>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl flex flex-col items-center text-center gap-4">
          <AlertTriangle className="size-10 text-red-600" />
          <div>
            <h3 className="text-base font-semibold text-red-900">Vitals Telemetry Unavailable</h3>
            <p className="text-sm text-red-700 mt-1">{error || 'Patient profile could not be resolved.'}</p>
          </div>
          <button
            onClick={() => navigate('/patients')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
          >
            Return to Patients Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a1721] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm border border-purple-500/30 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="size-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/patients/${id}`)}
          className="p-2 hover:bg-gray-100 rounded-lg text-[#494552] transition flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Patient Profile</span>
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-[#1a1721]">Physiological Vitals & Diagnostics</span>
      </div>

      {/* Patient Hero Banner */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-2xl bg-purple-100 text-[#5b14b8] flex items-center justify-center font-bold text-xl border border-purple-200">
            {patient.fullName ? patient.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'PT'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#1a1721]">{patient.fullName}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {patient.patientNumber || 'PT-VERIFIED'}
              </span>
            </div>
            <p className="text-sm text-[#716d7a] mt-0.5">
              {patient.gender || 'Not recorded'} • Age {calculateAge(patient.dateOfBirth)} • Blood Group: <span className="font-semibold text-[#1a1721]">{patient.bloodGroup || 'O+'}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Link
            to={`/patients/${id}/history`}
            className="px-3.5 py-2 border border-[#e5e7eb] hover:bg-gray-50 rounded-xl text-xs font-semibold text-[#494552] transition flex items-center gap-1.5"
          >
            <Clock className="size-4 text-[#5b14b8]" />
            <span>View Medical History</span>
          </Link>
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="px-4 py-2 bg-[#5b14b8] hover:bg-[#4a0f96] text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="size-4" />
            <span>Record Vital Signs</span>
          </button>
        </div>
      </div>

      {/* Latest Telemetry Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Blood Pressure */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#716d7a]">
            <span className="text-xs font-semibold">Blood Pressure</span>
            <Activity className="size-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-[#1a1721]">
            {latestVitals?.systolicBp && latestVitals?.diastolicBp
              ? `${latestVitals.systolicBp}/${latestVitals.diastolicBp}`
              : '--/--'}
            <span className="text-xs font-normal text-[#716d7a] ml-1">mmHg</span>
          </div>
          <div className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded w-fit">
            {latestVitals?.systolicBp && latestVitals.systolicBp > 130 ? 'Stage 1 Hypertension' : 'Normotensive'}
          </div>
        </div>

        {/* Pulse / Heart Rate */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#716d7a]">
            <span className="text-xs font-semibold">Heart Rate</span>
            <Heart className="size-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-[#1a1721]">
            {latestVitals?.pulseBpm || '--'}
            <span className="text-xs font-normal text-[#716d7a] ml-1">BPM</span>
          </div>
          <div className="text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded w-fit">
            Resting Sinus Rhythm
          </div>
        </div>

        {/* Oxygen Saturation SpO2 */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#716d7a]">
            <span className="text-xs font-semibold">Oxygen Saturation</span>
            <Gauge className="size-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-[#1a1721]">
            {latestVitals?.oxygenSaturation ? `${latestVitals.oxygenSaturation}%` : '--%'}
          </div>
          <div className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded w-fit">
            Room Air SpO2
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#716d7a]">
            <span className="text-xs font-semibold">Body Temperature</span>
            <Thermometer className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-[#1a1721]">
            {latestVitals?.temperatureC ? `${latestVitals.temperatureC}°C` : '--°C'}
          </div>
          <div className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded w-fit">
            Afebrile
          </div>
        </div>
      </div>

      {/* Historical Telemetry Table */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#f1f3f5] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#1a1721]">Physiological Vitals History</h2>
            <p className="text-xs text-[#716d7a]">Authentic telemetry measurements recorded by attending clinical staff.</p>
          </div>
          <span className="text-xs font-medium text-[#716d7a]">{vitalsList.length} Readings Logged</span>
        </div>

        {vitalsList.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#e5e7eb] rounded-xl bg-gray-50/50">
            <Activity className="size-10 text-gray-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-[#1a1721]">No Vital Signs Recorded</h3>
            <p className="text-xs text-[#716d7a] mt-1">Record physiological telemetry for this patient to establish a baseline.</p>
            <button
              onClick={() => setIsRecordModalOpen(true)}
              className="mt-4 px-3.5 py-1.5 bg-[#5b14b8] text-white rounded-lg text-xs font-semibold hover:bg-[#4a0f96] transition"
            >
              Record First Vitals
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8f9fa] text-[#494552] border-y border-[#e5e7eb] font-semibold">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">BP (mmHg)</th>
                  <th className="py-3 px-4">Pulse (BPM)</th>
                  <th className="py-3 px-4">SpO2 (%)</th>
                  <th className="py-3 px-4">Temp (°C)</th>
                  <th className="py-3 px-4">Resp Rate</th>
                  <th className="py-3 px-4">Blood Glucose</th>
                  <th className="py-3 px-4">BMI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[#1a1721]">
                {vitalsList.map((v, idx) => (
                  <tr key={v.id || idx} className="hover:bg-purple-50/30 transition">
                    <td className="py-3 px-4 font-medium text-[#5b14b8] flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      {new Date(v.recordedAt || (v as any).createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {v.systolicBp && v.diastolicBp ? `${v.systolicBp}/${v.diastolicBp}` : '--'}
                    </td>
                    <td className="py-3 px-4">{v.pulseBpm || '--'}</td>
                    <td className="py-3 px-4">{v.oxygenSaturation ? `${v.oxygenSaturation}%` : '--'}</td>
                    <td className="py-3 px-4">{v.temperatureC ? `${v.temperatureC}°C` : '--'}</td>
                    <td className="py-3 px-4">{v.respirationRate || '--'}</td>
                    <td className="py-3 px-4">{v.bloodSugarMgDl ? `${v.bloodSugarMgDl} mg/dL` : '--'}</td>
                    <td className="py-3 px-4">{v.bmi ? v.bmi.toFixed(1) : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Vitals Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="size-5 text-[#5b14b8]" />
                <h3 className="text-base font-bold text-[#1a1721]">Record Physiological Vital Signs</h3>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleRecordVitals} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#494552] mb-1">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    min="50"
                    max="260"
                    required
                    value={formSystolic}
                    onChange={(e) => setFormSystolic(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#494552] mb-1">Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    min="30"
                    max="160"
                    required
                    value={formDiastolic}
                    onChange={(e) => setFormDiastolic(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#494552] mb-1">Pulse / Heart Rate (BPM)</label>
                  <input
                    type="number"
                    min="30"
                    max="220"
                    required
                    value={formPulse}
                    onChange={(e) => setFormPulse(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#494552] mb-1">SpO2 Oxygen Saturation (%)</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    required
                    value={formSpO2}
                    onChange={(e) => setFormSpO2(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#494552] mb-1">Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="45"
                    value={formTemperature}
                    onChange={(e) => setFormTemperature(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#494552] mb-1">Respiration Rate (/min)</label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={formRespiration}
                    onChange={(e) => setFormRespiration(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#494552] mb-1">Blood Sugar (mg/dL)</label>
                  <input
                    type="number"
                    value={formBloodSugar}
                    onChange={(e) => setFormBloodSugar(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#494552] mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#494552] mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={formHeight}
                    onChange={(e) => setFormHeight(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#5b14b8] hover:bg-[#4a0f96] text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Record Vital Signs</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
