import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  Heart,
  AlertTriangle,
  Plus,
  Loader2,
  FileText,
  Calendar,
  CheckCircle2,
  X,
  Stethoscope,
} from 'lucide-react';
import { patientService, PatientProfileDetail, MedicalRecord, calculateAge } from '@/services/patientService';
import { consultationService } from '@/services/consultationService';

export const PatientMedicalHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<PatientProfileDetail | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for adding history entry
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<'SURGICAL_HISTORY' | 'CHRONIC_CONDITION' | 'FAMILY_HISTORY' | 'PAST_ILLNESS'>('SURGICAL_HISTORY');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formDiagnosisCode, setFormDiagnosisCode] = useState('');
  const [formFacility, setFormFacility] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [pt, recs] = await Promise.all([
        patientService.getPatientById(id),
        patientService.getPatientMedicalRecords(id, { includeArchived: true }),
      ]);
      setPatient(pt);
      setRecords(recs || []);
    } catch (err: any) {
      console.error('Failed to load medical history:', err);
      setError(err?.message || 'Failed to retrieve patient medical history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !formTitle.trim()) {
      setModalError('Title or condition name is required.');
      return;
    }
    setIsSubmitting(true);
    setModalError(null);
    try {
      await consultationService.createMedicalRecord(id, {
        title: `[${formCategory.replace('_', ' ')}] ${formTitle.trim()}`,
        chiefComplaint: formCategory.replace('_', ' '),
        clinicalNotes: formDescription.trim(),
        treatmentPlan: 'Documented in longitudinal medical history.',
        status: 'FINAL',
        encounter: {
          facilityName: formFacility.trim() || undefined,
          encounterType: formCategory,
          encounterDate: new Date(formDate).toISOString(),
        },
        diagnoses: formDiagnosisCode.trim() ? [
          {
            description: formTitle.trim(),
            code: formDiagnosisCode.trim().toUpperCase(),
            type: 'SECONDARY',
            status: 'ACTIVE',
          }
        ] : undefined,
      });

      triggerToast('Medical history entry recorded successfully.');
      setIsAddModalOpen(false);
      setFormTitle('');
      setFormDescription('');
      setFormDiagnosisCode('');
      setFormFacility('');
      await loadData();
    } catch (err: any) {
      console.error('Failed to save history entry:', err);
      setModalError(err?.message || 'Failed to record entry. Please verify inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[600px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-[#5b14b8]" />
        <span className="text-sm font-medium text-[#494552]">Loading longitudinal medical history...</span>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl flex flex-col items-center text-center gap-4">
          <AlertTriangle className="size-10 text-red-600" />
          <div>
            <h3 className="text-base font-semibold text-red-900">Medical History Unavailable</h3>
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
        <span className="text-sm font-semibold text-[#1a1721]">Longitudinal Medical History</span>
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

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Link
            to={`/patients/${id}/vitals`}
            className="px-3.5 py-2 border border-[#e5e7eb] hover:bg-gray-50 rounded-xl text-xs font-semibold text-[#494552] transition flex items-center gap-1.5"
          >
            <Activity className="size-4 text-[#5b14b8]" />
            <span>View Telemetry</span>
          </Link>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-[#5b14b8] hover:bg-[#4a0f96] text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="size-4" />
            <span>Add History Entry</span>
          </button>
        </div>
      </div>

      {/* Chronic Conditions & Allergies Quick Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chronic Conditions */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="size-4 text-rose-500" />
            <h2 className="text-sm font-bold text-[#1a1721]">Chronic Conditions & Active Diagnoses</h2>
          </div>
          {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {patient.chronicConditions.map((cond, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                >
                  {cond}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#716d7a]">No documented chronic illnesses recorded in registry.</p>
          )}
        </div>

        {/* Allergies */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="size-4 text-amber-500" />
            <h2 className="text-sm font-bold text-[#1a1721]">Known Allergies & Contraindications</h2>
          </div>
          {patient.knownAllergies && patient.knownAllergies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {patient.knownAllergies.map((allergy, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                >
                  {allergy}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#716d7a]">No known drug or environmental allergies reported.</p>
          )}
        </div>
      </div>

      {/* Longitudinal Timeline */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-[#f1f3f5] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#1a1721]">Longitudinal Clinical Timeline</h2>
            <p className="text-xs text-[#716d7a]">Chronological history of medical records, past surgeries, and documented encounters.</p>
          </div>
          <span className="text-xs font-medium text-[#716d7a]">{records.length} Events Logged</span>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#e5e7eb] rounded-xl bg-gray-50/50">
            <FileText className="size-10 text-gray-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-[#1a1721]">No History Recorded Yet</h3>
            <p className="text-xs text-[#716d7a] mt-1">This patient has no prior surgical history or clinical entries.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-3.5 py-1.5 bg-[#5b14b8] text-white rounded-lg text-xs font-semibold hover:bg-[#4a0f96] transition"
            >
              Add First Entry
            </button>
          </div>
        ) : (
          <div className="relative border-l-2 border-purple-200 ml-4 pl-6 space-y-6">
            {records.map((rec) => (
              <div key={rec.id} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-[33px] top-1.5 size-4 rounded-full bg-[#5b14b8] border-4 border-white shadow-sm" />
                
                <div className="bg-[#fdfdfe] border border-[#e5e7eb] hover:border-purple-300 rounded-xl p-4 transition shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-semibold text-[#5b14b8] flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      {new Date(rec.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-[#494552] w-fit">
                      {rec.status || 'FINAL'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#1a1721]">{rec.title}</h3>

                  {rec.chiefComplaint && (
                    <p className="text-xs text-[#494552] mt-1">
                      <strong className="text-[#1a1721]">Complaint/Context:</strong> {rec.chiefComplaint}
                    </p>
                  )}

                  {rec.clinicalNotes && (
                    <p className="text-xs text-[#716d7a] mt-1 whitespace-pre-wrap leading-relaxed">
                      {rec.clinicalNotes}
                    </p>
                  )}

                  {rec.diagnoses && rec.diagnoses.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {rec.diagnoses.map((diag, dIdx) => (
                        <span
                          key={dIdx}
                          className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-[#5b14b8] border border-purple-100"
                        >
                          {diag.code ? `${diag.code} - ` : ''}{diag.description}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add History Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="size-5 text-[#5b14b8]" />
                <h3 className="text-base font-bold text-[#1a1721]">Add Medical History Entry</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
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

            <form onSubmit={handleCreateEntry} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#494552] mb-1">Entry Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white focus:outline-none focus:border-[#5b14b8]"
                >
                  <option value="SURGICAL_HISTORY">Past Surgical Procedure</option>
                  <option value="CHRONIC_CONDITION">Chronic Illness / Ongoing Condition</option>
                  <option value="FAMILY_HISTORY">Family Medical History</option>
                  <option value="PAST_ILLNESS">Past Major Illness / Hospitalization</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#494552] mb-1">Title / Procedure Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Appendectomy, Coronary Stenting, Hypertension"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#494552] mb-1">Approximate Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#494552] mb-1">ICD-10 Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. I25.10, K35.8"
                    value={formDiagnosisCode}
                    onChange={(e) => setFormDiagnosisCode(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#494552] mb-1">Facility / Hospital (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Metro General Hospital"
                  value={formFacility}
                  onChange={(e) => setFormFacility(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#494552] mb-1">Clinical Notes & Findings</label>
                <textarea
                  rows={3}
                  placeholder="Complications, implant details, histology outcome, or ongoing management..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
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
                    <span>Save to Patient History</span>
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
