import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Microscope,
  AlertTriangle,
  CheckCircle2,
  Download,
  Plus,
  Loader2,
  X,
} from 'lucide-react';
import { patientService, PatientListItem, PatientProfileDetail } from '@/services/patientService';
import { laboratoryService, LaboratoryReportDTO, CreateLaboratoryReportPayload } from '@/services/laboratoryService';

export const PathologyReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId') || '';

  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [patientDetail, setPatientDetail] = useState<PatientProfileDetail | null>(null);
  const [reports, setReports] = useState<LaboratoryReportDTO[]>([]);
  const [selectedReport, setSelectedReport] = useState<LaboratoryReportDTO | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State for Logging Pathology Specimen
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [labName, setLabName] = useState('CareID Central Pathology Diagnostics');
  const [specimenType, setSpecimenType] = useState('TISSUE_BIOPSY');
  const [collectedDate, setCollectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [overallNotes, setOverallNotes] = useState('Coronary arterial wall biopsy negative for acute vasculitis. Mild intimal hyperplasia noted.');
  const [testParamName, setTestParamName] = useState('Intimal Plaque Index');
  const [testValue, setTestValue] = useState<number | ''>(1.4);
  const [testRefRange, setTestRefRange] = useState('< 1.0 Normal');
  const [testFlag, setTestFlag] = useState('HIGH');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load patients list on mount
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await patientService.listPatients({ limit: 100 });
        setPatients(res.data || []);
        if (!selectedPatientId && res.data && res.data.length > 0) {
          setSelectedPatientId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load patients for pathology:', err);
      }
    };
    fetchPatients();
  }, []);

  // Hydrate patient and pathology reports
  const loadReports = async () => {
    if (!selectedPatientId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [pt, reps] = await Promise.all([
        patientService.getPatientById(selectedPatientId),
        laboratoryService.getPatientLabResults(selectedPatientId),
      ]);
      setPatientDetail(pt);
      setReports(reps || []);
      if (reps && reps.length > 0) {
        setSelectedReport(reps[0]);
      } else {
        setSelectedReport(null);
      }
    } catch (err: any) {
      console.error('Failed to load pathology reports:', err);
      setError(err?.message || 'Failed to retrieve pathology results.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [selectedPatientId]);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    setIsSubmitting(true);
    setModalError(null);
    try {
      const payload: CreateLaboratoryReportPayload = {
        laboratoryName: labName.trim(),
        specimenType: specimenType.trim(),
        collectedDate: new Date(collectedDate).toISOString(),
        reportedDate: new Date().toISOString(),
        status: 'FINAL',
        overallNotes: overallNotes.trim(),
        testItems: [
          {
            testName: testParamName.trim(),
            testCategory: specimenType.replace('_', ' '),
            numericValue: testValue !== '' ? Number(testValue) : undefined,
            referenceRange: testRefRange.trim(),
            flag: testFlag,
          },
        ],
      };

      await laboratoryService.createPatientLabResult(selectedPatientId, payload);
      triggerToast('Pathology specimen report logged successfully.');
      setIsAddModalOpen(false);
      await loadReports();
    } catch (err: any) {
      console.error('Failed to log pathology report:', err);
      setModalError(err?.message || 'Failed to log pathology report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a1721] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm border border-purple-500/30 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="size-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/records')}
            className="p-2 hover:bg-gray-100 rounded-lg text-[#494552] transition flex items-center gap-1 text-sm font-medium"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Medical Records</span>
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-[#1a1721]">Pathology & Histology Reports</span>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-[#5b14b8] hover:bg-[#4a0f96] text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="size-4" />
          <span>Log Pathology Specimen</span>
        </button>
      </div>

      {/* Patient Selector Bar */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-[#1a1721]">Target Patient:</label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg p-2.5 bg-white min-w-[260px] focus:outline-none focus:border-[#5b14b8]"
          >
            {patients.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.fullName} ({pt.patientNumber || 'PT-RECORD'})
              </option>
            ))}
          </select>
        </div>

        {patientDetail && (
          <div className="text-xs text-[#716d7a] flex items-center gap-2">
            <span>MRN: <strong className="text-[#1a1721]">{patientDetail.patientNumber || 'PT-302602'}</strong></span>
            <span>•</span>
            <span>Blood: <strong className="text-[#1a1721]">{patientDetail.bloodGroup || 'O+'}</strong></span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-xs text-red-700">
          <AlertTriangle className="size-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Content Layout: Reports List & Detailed Findings */}
      {isLoading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#5b14b8]" />
          <span className="text-sm font-medium text-[#494552]">Loading pathology and histology diagnostic reports...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-dashed border-[#e5e7eb] rounded-2xl p-12 text-center space-y-3">
          <Microscope className="size-12 text-gray-300 mx-auto" />
          <h3 className="text-base font-bold text-[#1a1721]">No Pathology Reports Found</h3>
          <p className="text-xs text-[#716d7a] max-w-md mx-auto">
            No histology, tissue biopsy, or cytological specimen reports have been recorded for this patient.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-[#5b14b8] text-white rounded-xl text-xs font-semibold hover:bg-[#4a0f96] transition"
          >
            Log New Pathology Specimen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Specimen Reports List */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#716d7a]">
              Specimen Reports ({reports.length})
            </h2>

            {reports.map((rep) => (
              <div
                key={rep.id}
                onClick={() => setSelectedReport(rep)}
                className={`p-4 rounded-2xl border transition cursor-pointer space-y-2 ${
                  selectedReport?.id === rep.id
                    ? 'bg-purple-50/50 border-[#5b14b8] shadow-xs'
                    : 'bg-white border-[#e5e7eb] hover:border-purple-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-[#5b14b8]">
                    {rep.specimenType || 'BIOPSY'}
                  </span>
                  <span className="text-[11px] font-medium text-[#716d7a]">
                    {new Date(rep.collectedDate || rep.reportedDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-[#1a1721] line-clamp-1">
                  {rep.laboratoryName || 'Diagnostic Pathology Lab'}
                </h3>

                <p className="text-[11px] text-[#716d7a] line-clamp-2">
                  {rep.overallNotes || 'Histopathological examination completed.'}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[11px] text-[#716d7a]">
                  <span>Status: <strong className="text-emerald-700">{rep.status}</strong></span>
                  <span>{rep.testItems?.length || 0} Test Parameters</span>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Diagnostic Report View */}
          <div className="lg:col-span-2">
            {selectedReport ? (
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm space-y-6">
                {/* Report Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#f1f3f5] pb-4 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Microscope className="size-5 text-[#5b14b8]" />
                      <h2 className="text-base font-bold text-[#1a1721]">{selectedReport.laboratoryName}</h2>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {selectedReport.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#716d7a] mt-1">
                      Specimen: <strong className="text-[#1a1721]">{selectedReport.specimenType || 'TISSUE_BIOPSY'}</strong> • Collected: {new Date(selectedReport.collectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {selectedReport.attachment && (
                    <a
                      href={selectedReport.attachment.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 border border-purple-200 hover:bg-purple-50 text-[#5b14b8] rounded-xl text-xs font-semibold transition flex items-center gap-1.5 w-fit"
                    >
                      <Download className="size-3.5" />
                      <span>Download PDF</span>
                    </a>
                  )}
                </div>

                {/* Pathological Diagnosis / Clinical Notes */}
                <div className="bg-[#fcfbfe] border border-purple-100 rounded-xl p-4 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#5b14b8]">
                    Pathologist Diagnostic Summary
                  </span>
                  <p className="text-xs text-[#1a1721] whitespace-pre-wrap leading-relaxed">
                    {selectedReport.overallNotes || 'Specimen margins clear. No malignant histological features identified.'}
                  </p>
                </div>

                {/* Discrete Parameter Results Table */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-[#1a1721]">Discrete Histochemical & Test Item Flags</h3>

                  {selectedReport.testItems && selectedReport.testItems.length > 0 ? (
                    <div className="overflow-x-auto border border-[#e5e7eb] rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#f8f9fa] text-[#494552] border-b border-[#e5e7eb] font-semibold">
                          <tr>
                            <th className="py-2.5 px-4">Test Parameter</th>
                            <th className="py-2.5 px-4">Value</th>
                            <th className="py-2.5 px-4">Reference Range</th>
                            <th className="py-2.5 px-4">Clinical Flag</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[#1a1721]">
                          {selectedReport.testItems.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-purple-50/20">
                              <td className="py-2.5 px-4 font-medium">{item.testName}</td>
                              <td className="py-2.5 px-4 font-bold">
                                {item.numericValue !== undefined ? `${item.numericValue} ${item.unit || ''}` : item.textValue || '--'}
                              </td>
                              <td className="py-2.5 px-4 text-[#716d7a]">{item.referenceRange}</td>
                              <td className="py-2.5 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.flag === 'HIGH' || item.flag === 'CRITICAL'
                                      ? 'bg-rose-100 text-rose-800'
                                      : item.flag === 'LOW'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {item.flag || 'NORMAL'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-[#716d7a]">No discrete quantitative parameters attached.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-12 text-center text-xs text-[#716d7a]">
                Select a pathology report from the left panel to review findings.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Pathology Specimen Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Microscope className="size-5 text-[#5b14b8]" />
                <h3 className="text-base font-bold text-[#1a1721]">Log Pathology & Specimen Report</h3>
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

            <form onSubmit={handleCreateReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#494552] mb-1">Laboratory / Pathology Facility *</label>
                <input
                  type="text"
                  required
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#494552] mb-1">Specimen Category</label>
                  <select
                    value={specimenType}
                    onChange={(e) => setSpecimenType(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white focus:outline-none focus:border-[#5b14b8]"
                  >
                    <option value="TISSUE_BIOPSY">Tissue Biopsy</option>
                    <option value="HISTOLOGY">Histology Slide</option>
                    <option value="SURGICAL_PATHOLOGY">Surgical Pathology</option>
                    <option value="CYTOLOGY">Cytology Smear</option>
                    <option value="BONE_MARROW">Bone Marrow Aspirate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#494552] mb-1">Specimen Collection Date</label>
                  <input
                    type="date"
                    required
                    value={collectedDate}
                    onChange={(e) => setCollectedDate(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#494552] mb-1">Diagnostic Summary / Histopathology Findings *</label>
                <textarea
                  rows={3}
                  required
                  value={overallNotes}
                  onChange={(e) => setOverallNotes(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#5b14b8]"
                />
              </div>

              {/* Discrete Item */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <span className="text-[11px] font-bold text-[#494552] block">Primary Parameter / Index</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Test Parameter Name"
                    value={testParamName}
                    onChange={(e) => setTestParamName(e.target.value)}
                    className="text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-[#5b14b8]"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Quantitative Value"
                    value={testValue}
                    onChange={(e) => setTestValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-[#5b14b8]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Reference Range (e.g. < 1.0)"
                    value={testRefRange}
                    onChange={(e) => setTestRefRange(e.target.value)}
                    className="text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-[#5b14b8]"
                  />
                  <select
                    value={testFlag}
                    onChange={(e) => setTestFlag(e.target.value)}
                    className="text-xs border border-gray-300 rounded-lg p-2 bg-white focus:outline-none focus:border-[#5b14b8]"
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH (Abnormal)</option>
                    <option value="LOW">LOW (Abnormal)</option>
                    <option value="CRITICAL">CRITICAL (Panic)</option>
                  </select>
                </div>
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
                    <span>Save Pathology Report</span>
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
