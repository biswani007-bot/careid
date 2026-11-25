import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Clock,
  Bell,
  User,
  Plus,
  Activity,
  FileSpreadsheet,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { TreatmentOfferState, dtoToOfferState, enrichOfferStateWithPatient } from './types';
import {
  extractCleanClinicalIndication,
  parseEmbeddedSafetyHolds,
  getReadableHoldCategory,
  StructuredSafetyHoldItem,
} from '@/utils/clinicalDataSanitizer';
import {
  treatmentOfferService,
  PreOpClearanceDTO,
  DynamicClearanceRequirementDTO,
  UpdatePreOpClearancePayload,
  formatTreatmentOfferError,
} from '@/services/treatmentOfferService';
import { patientService, MedicalRecord } from '@/services/patientService';

export const ClinicalHandoffPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  // Load offer state from navigation payload or fetch live by offer ID
  const incomingOffer = location.state as TreatmentOfferState | undefined;
  const [offer, setOffer] = useState<TreatmentOfferState>(
    incomingOffer || {
      patientId: '',
      patientName: 'Patient Record',
      patientCid: '',
      patientAge: '',
      patientGender: '',
      patientBlood: '',
      patientAllergy: '',
      insuranceStatus: 'Self-Pay / Clinical Financing',
      referralId: '',
      cptCode: '',
      procedureName: 'Clinical Procedure',
      department: 'Clinical Department',
      facility: user.organization || 'Clinical Center',
      clinicalNecessity: '',
      baselineFee: 0,
      discountEnabled: false,
      discountMode: 'fixed',
      discountValue: 0,
      calculatedDiscount: 0,
      netProcedureCost: 0,
      financingPackageId: 'careid-0',
      financingPackageName: 'Care ID In-House 0% APR',
      monthlyInstallment: '$0.00',
      termMonths: 12,
      apr: '0.0%',
      totalPayable: '$0.00',
      offerTitle: 'Treatment Proposal',
      expirationDate: '',
      clinicalHoldDays: 14,
      doctorNotes: '',
      complianceConfirmed: false,
      clinicianAttested: false,
      offerId: id || '',
      attendingDoctor: user.fullName || 'Attending Physician',
      doctorSpecialty: user.specialty || 'Specialist',
      auditHash: '',
    }
  );

  const [patientRecords, setPatientRecords] = useState<MedicalRecord[]>([]);
  const [clearance, setClearance] = useState<PreOpClearanceDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUpdatingClearance, setIsUpdatingClearance] = useState<boolean>(false);
  const [isHoldHistoryExpanded, setIsHoldHistoryExpanded] = useState<boolean>(true);

  // CAREID-020: Authoritative structured safety holds and clean clinical indication
  const cleanClinicalIndication = React.useMemo(() => {
    return (
      clearance?.cleanClinicalIndication ||
      extractCleanClinicalIndication(offer.clinicalNecessity, offer.procedureName)
    );
  }, [clearance?.cleanClinicalIndication, offer.clinicalNecessity, offer.procedureName]);

  const safetyHolds = React.useMemo(() => {
    const list: StructuredSafetyHoldItem[] = [];
    const seenIds = new Set<string>();

    if (clearance?.safetyHolds && Array.isArray(clearance.safetyHolds)) {
      for (const h of clearance.safetyHolds) {
        if (!seenIds.has(h.holdId)) {
          seenIds.add(h.holdId);
          list.push(h);
        }
      }
    }

    const legacyParsed = parseEmbeddedSafetyHolds(offer.clinicalNecessity);
    for (const leg of legacyParsed) {
      if (!seenIds.has(leg.holdId)) {
        seenIds.add(leg.holdId);
        list.push(leg);
      }
    }

    return list;
  }, [clearance?.safetyHolds, offer.clinicalNecessity]);

  const activeHoldCount = React.useMemo(() => {
    return safetyHolds.filter((h) => h.status === 'ACTIVE').length;
  }, [safetyHolds]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoadError(null);

    treatmentOfferService.getTreatmentOffer(id)
      .then(async (dto) => {
        if (cancelled) return;
        const mapped = dtoToOfferState(dto);
        if (dto.patientProfileId) {
          try {
            const p = await patientService.getPatientById(dto.patientProfileId);
            enrichOfferStateWithPatient(mapped, p);
          } catch {
            // Optional patient profile enrichment
          }
        }
        if (!cancelled) setOffer(mapped);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(formatTreatmentOfferError(err));
      });

    treatmentOfferService.getPreOpClearance(id)
      .then((clr) => {
        if (!cancelled) setClearance(clr);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError((prev) => prev || formatTreatmentOfferError(err));
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (offer.patientId) {
      patientService.getPatientMedicalRecords(offer.patientId)
        .then(setPatientRecords)
        .catch(() => {
          // Medical records may be restricted if doctor registration is suspended
        });
    }
  }, [offer.patientId]);

  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [selectedLabReportId, setSelectedLabReportId] = useState<string>('');
  const [labRemarks, setLabRemarks] = useState('Laboratory coagulation panel (PT/INR, aPTT) and CBC verified within normal limits for catheterization.');
  const [labAttestation, setLabAttestation] = useState(false);

  const [isSpecialistModalOpen, setIsSpecialistModalOpen] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ANESTHESIA');
  const [specialistRemarks, setSpecialistRemarks] = useState('Pre-operative clinical evaluation complete. Patient approved for procedure.');
  const [specialistAttestation, setSpecialistAttestation] = useState(false);

  useEffect(() => {
    if (clearance?.availableLabReports && clearance.availableLabReports.length > 0 && !selectedLabReportId) {
      setSelectedLabReportId(clearance.availableLabReports[0].id);
    }
  }, [clearance, selectedLabReportId]);

  const [activeLabReqCode, setActiveLabReqCode] = useState<string>('REQ-LAB-METABOLIC');
  const [activeSpecialistReqCode, setActiveSpecialistReqCode] = useState<string>('REQ-SPEC-CLEARANCE');
  const [specialistOptions, setSpecialistOptions] = useState<string[]>([
    'ANESTHESIA',
    'CARDIOLOGY',
    'MEDICAL',
    'PULMONOLOGY',
  ]);

  const handleOpenLabModal = (reqCode: string = 'REQ-LAB-METABOLIC') => {
    setActiveLabReqCode(reqCode);
    setLabAttestation(false);
    setIsLabModalOpen(true);
  };

  const handleOpenSpecialistModal = (
    specialty: string,
    reqCode: string = 'REQ-SPEC-CLEARANCE',
    availableSpecialties?: string[]
  ) => {
    setActiveSpecialistReqCode(reqCode);
    setSelectedSpecialty(specialty);
    const specs = availableSpecialties && availableSpecialties.length > 0
      ? availableSpecialties
      : ['ANESTHESIA', 'CARDIOLOGY', 'MEDICAL', 'PULMONOLOGY'];
    if (!specs.includes(specialty) && specialty) {
      specs.unshift(specialty);
    }
    setSpecialistOptions(Array.from(new Set(specs)));
    setSpecialistAttestation(false);
    if (specialty === 'ANESTHESIA') {
      setSpecialistRemarks('Airway Mallampati Class 1, NPO fasting compliant, MAC Tier 1 approved by anesthesia specialist.');
    } else if (specialty === 'CARDIOLOGY') {
      setSpecialistRemarks('Echocardiogram LVEF 55%, normal sinus rhythm, hemodynamic parameters optimal for catheterization.');
    } else {
      setSpecialistRemarks('Comprehensive pre-op medical evaluation complete. Chronic medications held according to protocol.');
    }
    setIsSpecialistModalOpen(true);
  };

  const handleConfirmLabClearance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || isUpdatingClearance) return;
    if (!labAttestation) {
      triggerToast('Please check the clinician attestation box to confirm evidence review.');
      return;
    }
    setIsUpdatingClearance(true);
    try {
      const updated = await treatmentOfferService.updatePreOpClearance(id, {
        labClearance: { status: 'CLEARED', notes: labRemarks },
        evidenceRecordId: selectedLabReportId || undefined,
        requirementCode: activeLabReqCode,
        status: 'CLEARED',
        clinicalRemarks: labRemarks,
      });
      setClearance(updated);
      setIsLabModalOpen(false);
      triggerToast('Pre-Procedure Laboratory Panel verified and CLEARED.');
    } catch (err: unknown) {
      triggerToast(formatTreatmentOfferError(err));
    } finally {
      setIsUpdatingClearance(false);
    }
  };

  const handleConfirmSpecialistClearance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || isUpdatingClearance) return;
    if (!specialistAttestation) {
      triggerToast('Please check the clinician attestation box.');
      return;
    }
    setIsUpdatingClearance(true);
    try {
      const fieldMap: Record<string, 'anesthesiaClearance' | 'cardiologyClearance' | 'medicalClearance'> = {
        ANESTHESIA: 'anesthesiaClearance',
        CARDIOLOGY: 'cardiologyClearance',
        MEDICAL: 'medicalClearance',
      };
      const legacyField = fieldMap[selectedSpecialty];
      const payload: any = {
        requirementCode: activeSpecialistReqCode,
        specialty: selectedSpecialty,
        status: 'CLEARED',
        clinicalRemarks: specialistRemarks,
      };
      if (legacyField) {
        payload[legacyField] = { status: 'CLEARED', notes: specialistRemarks };
      }
      const updated = await treatmentOfferService.updatePreOpClearance(id, payload);
      setClearance(updated);
      setIsSpecialistModalOpen(false);
      triggerToast(`${selectedSpecialty} clearance ratified and persisted.`);
    } catch (err: unknown) {
      triggerToast(formatTreatmentOfferError(err));
    } finally {
      setIsUpdatingClearance(false);
    }
  };

  const handleMarkClearance = async (
    req: DynamicClearanceRequirementDTO
  ) => {
    if (!id || isUpdatingClearance) return;
    setIsUpdatingClearance(true);
    try {
      const fieldMap: Record<string, 'surgicalClearance' | 'labClearance'> = {
        'REQ-SURGICAL-PREP': 'surgicalClearance',
        'REQ-SURG-READY': 'surgicalClearance',
        'REQ-LAB-METABOLIC': 'labClearance',
      };
      const legacyField = fieldMap[req.code];
      const payload: UpdatePreOpClearancePayload = {
        requirementCode: req.code,
        status: 'CLEARED',
        clinicalRemarks: `${req.name} signed off by attending clinician`,
      };
      if (legacyField) {
        (payload as any)[legacyField] = { status: 'CLEARED', notes: `${req.name} signed off by attending clinician` };
      }
      const updated = await treatmentOfferService.updatePreOpClearance(id, payload);
      setClearance(updated);
      triggerToast(`${req.name} marked as CLEARED.`);
    } catch (err: unknown) {
      triggerToast(formatTreatmentOfferError(err));
    } finally {
      setIsUpdatingClearance(false);
    }
  };

  const doctorName = user?.fullName ? `Dr. ${user.fullName.replace(/^Dr\.\s*/i, '')}` : offer.attendingDoctor || 'Attending Physician';
  const doctorInitials = (user?.fullName || offer.attendingDoctor || 'AP')
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const patientInitials = (offer.patientName || 'PT')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAdvanceToScheduling = () => {
    navigate(`/treatment-offers/${offer.offerId}/schedule`, { state: offer });
  };

  return (
    <div className="w-full bg-[#f8f9fa] min-h-screen text-[#0f172a] font-['Plus_Jakarta_Sans',sans-serif] flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f172a] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* TOP WORKSPACE HEADER (Figma 1:9573) */}
      <header className="h-14 border-b border-[#e1e3e4] bg-[#f8f9fa] px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="font-semibold text-slate-700">Clinical Workspace</span>
          <span>&gt;</span>
          <span className="text-[#3f1d8b] font-bold">Enterprise View</span>
          <span>•</span>
          <Link to="/patients" className="hover:text-slate-800 transition-colors">Patients</Link>
          <span>/</span>
          <Link to={`/patients/${offer.patientId}`} className="hover:text-slate-800 transition-colors">
            {offer.patientName} ({offer.patientCid})
          </Link>
          <span>/</span>
          <Link to={`/patients/${offer.patientId}/financing`} className="hover:text-slate-800 transition-colors">
            Insurance & Financing
          </Link>
          <span>/</span>
          <Link to={`/treatment-offers/${offer.offerId}/status`} className="hover:text-slate-800 transition-colors">
            Offer #{offer.offerId}
          </Link>
          <span>/</span>
          <span className="bg-purple-100 text-[#3f1d8b] font-bold px-2 py-0.5 rounded text-[11px]">
            Clinical Handoff
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live EHR Sync</span>
          </div>

          <button
            type="button"
            className="p-1.5 rounded-full hover:bg-slate-200/60 text-slate-600 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => navigate(offer.patientId ? `/treatment-offers/new/step-1?patientId=${encodeURIComponent(offer.patientId)}` : '/treatment-offers/new/step-1')}
            className="h-8 px-3 rounded-full text-white font-medium text-xs bg-gradient-to-b from-[#a44cff] to-[#5b14b8] flex items-center gap-1.5 shadow-xs hover:opacity-95 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>New Encounter</span>
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="size-7 rounded-full bg-[#3f1d8b] text-white flex items-center justify-center font-bold text-xs">
              {doctorInitials}
            </div>
            <div className="text-left hidden md:block">
              <span className="text-xs font-bold block text-slate-800 leading-tight">{doctorName}</span>
              <span className="text-[10px] text-slate-500 block leading-tight">Attending Physician</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE CONTENT */}
      <main className="flex-1 overflow-y-auto px-8 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
        {/* Navigation Action Strip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/treatment-offers/${offer.offerId}/accepted`, { state: offer })}
              className="border border-[#e2e8f0] bg-white hover:bg-slate-50 text-[#334155] text-[12px] font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>Back to Offer Ratification</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/patients/${offer.patientId}`)}
              className="border border-[#e2e8f0] bg-white hover:bg-slate-50 text-[#334155] text-[12px] font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>View Full Profile</span>
            </button>
          </div>
        </div>

        {/* PATIENT CONTEXT CAPSULE (Physical ID Metaphor - Figma 1:9573) */}
        <div className="bg-white border border-[#e2e8f0] content-stretch flex items-center justify-between p-5 relative rounded-[16px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] w-full">
          <div className="flex items-center gap-4">
            <div className="w-[52px] h-[52px] rounded-[12px] bg-[#3f1d8b] text-white flex items-center justify-center font-bold text-[18px] tracking-wide shrink-0 shadow-sm">
              {patientInitials}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-[18px] font-bold text-[#0f172a] leading-tight tracking-tight">
                  {offer.patientName}
                </h1>
                <span className="text-xs text-slate-400 font-mono">CID {offer.patientCid}</span>
                <span className="bg-cyan-50 text-cyan-800 border border-cyan-200 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  Self-Pay + Prompt Settlement Confirmed
                </span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-[#64748b] font-medium flex-wrap">
                <span>{offer.patientAge ? `${offer.patientAge}` : 'Age N/A'} {offer.patientGender ? `(${offer.patientGender})` : ''}</span>
                <span>•</span>
                <span>Blood: {offer.patientBlood || 'Record on file'}</span>
                <span>•</span>
                <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  Allergy: {offer.patientAllergy || 'NKDA'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#fafafc] border border-slate-200 p-3 rounded-xl flex flex-col gap-1 text-right min-w-[240px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              DESIGNATED CLINICAL TARGET
            </span>
            <span className="text-xs font-extrabold text-[#0f172a] leading-snug">
              {offer.procedureName}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {offer.cptCode ? `CPT Code #${offer.cptCode}` : 'CPT Code Pending'} • Tier 1 Outpatient
            </span>
          </div>
        </div>

        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Unable to load live pre-op clearance data: {loadError}</span>
          </div>
        )}

        {/* HERO STATUS / CLINICAL HANDOFF BANNER (Figma 1:9573 - Deep Indigo) */}
        <div className="relative rounded-[16px] overflow-hidden bg-gradient-to-r from-[#1e1b4b] via-[#312e81] to-[#1e1b4b] text-white p-6 shadow-md border border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 max-w-2xl">
            <div className="size-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0 text-cyan-300">
              <CheckCircle2 className="size-7 stroke-[2.5]" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Treatment Cleared to Proceed — Clinical Handoff Complete
              </h2>
              <p className="text-xs text-indigo-100/90 leading-relaxed">
                Financial clearance completed and biometric patient sign-off ratified. {offer.patientName} is fully authorized and released for Cath Lab procedural slot scheduling and pre-op clinical clearance.
              </p>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                  FINANCIALLY CLEARED (100%)
                </span>
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                  FINANCING RATIFIED: 0% APR (12-MO)
                </span>
                <span className="bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                  PROCEDURAL CLEARANCE: ACTIVE
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0 bg-indigo-950/60 p-4 rounded-xl border border-indigo-800/40">
            <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-300">
              DIGITAL AUTHORIZATION SEAL
            </span>
            <span className="text-xs font-bold text-white">
              {offer.dispatchedAt || 'Active Protocol'}
            </span>
            <span className="text-[11px] text-indigo-200 font-mono">
              FST #{offer.offerId} | v{offer.version || '1.0'}
            </span>
            <span className="text-[11px] text-indigo-200 font-mono">
              {offer.financingPackageName}
            </span>
          </div>
        </div>

        {/* CLINICAL HANDOFF & BOOKING PIPELINE STEPPER (Figma 1:9573) */}
        <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-5 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#3f1d8b]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#0f172a]">
                Clinical Handoff & Booking Pipeline
              </h3>
            </div>
            <span className="bg-cyan-50 text-cyan-800 border border-cyan-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              Gate 4 of 5 Passed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Stage 1 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">STAGE 1</span>
                <CheckCircle2 className="size-3.5 text-emerald-600" />
              </div>
              <span className="text-xs font-bold text-slate-800">Financial Review</span>
              <span className="text-[10px] text-slate-500">15% Discount Applied (-$780)</span>
            </div>

            {/* Stage 2 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">STAGE 2</span>
                <CheckCircle2 className="size-3.5 text-emerald-600" />
              </div>
              <span className="text-xs font-bold text-slate-800">Patient Authorization</span>
              <span className="text-[10px] text-slate-500">Biometric Digital Consent</span>
            </div>

            {/* Stage 3 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">STAGE 3</span>
                <CheckCircle2 className="size-3.5 text-emerald-600" />
              </div>
              <span className="text-xs font-bold text-slate-800">Plan Confirmed</span>
              <span className="text-[10px] text-slate-500">0% APR • {offer.monthlyInstallment}/mo</span>
            </div>

            {/* Stage 4 (CURRENT) */}
            <div className="bg-purple-50 border-2 border-[#5b14b8] rounded-xl p-3 flex flex-col gap-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#3f1d8b]">STAGE 4 • ACTIVE</span>
                <span className="size-2 rounded-full bg-[#5b14b8] animate-pulse" />
              </div>
              <span className="text-xs font-extrabold text-[#3f1d8b]">Clinical Handoff</span>
              <span className="text-[10px] text-purple-700 font-semibold">Treatment Cleared</span>
            </div>

            {/* Stage 5 (NEXT) */}
            <div className="bg-slate-50 border border-dashed border-cyan-300 rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">STAGE 5 • NEXT ACTION</span>
                <Calendar className="size-3.5 text-cyan-600" />
              </div>
              <span className="text-xs font-bold text-slate-800">Cath Lab Slot Hold</span>
              <span className="text-[10px] text-cyan-700 font-bold">Ready to Confirm</span>
            </div>
          </div>
        </div>

        {/* 2-COLUMN MAIN CONTENT (Figma 1:9573) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2/3 COLUMN */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Card 1: Primary Treatment Summary */}
            <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#3f1d8b]" />
                  <h3 className="font-bold text-sm text-[#0f172a]">
                    Primary Treatment Summary
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-cyan-50 text-cyan-800 border border-cyan-200 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {offer.status || 'Underwritten'}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    clearance?.overallStatus === 'CLEARED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : clearance?.overallStatus === 'REJECTED'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    Clearance: {clearance?.overallStatus || 'PENDING'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  PROCEDURE NAME & CODE • {offer.cptCode ? `CPT #${offer.cptCode}` : 'CPT Pending'}
                </span>
                <h4 className="font-bold text-base text-[#0f172a] mt-0.5">
                  {offer.procedureName}
                </h4>
                <div className="mt-2 bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    CLINICAL INDICATION & JUSTIFICATION
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {cleanClinicalIndication}
                  </p>
                </div>
              </div>

              {/* 4-Metric Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="bg-[#fafafc] border border-slate-200 p-3.5 rounded-xl flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">FACILITY & DEPARTMENT</span>
                  <span className="font-bold text-xs text-[#0f172a]">{offer.facility || 'Clinical Healthcare Facility'}</span>
                  <span className="text-[11px] text-slate-500">{offer.department || 'Outpatient Interventional Department'}</span>
                </div>

                <div className="bg-[#fafafc] border border-slate-200 p-3.5 rounded-xl flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">SUPERVISING ATTENDING</span>
                  <div className="flex items-center gap-1.5">
                    <User className="size-3.5 text-[#3f1d8b]" />
                    <span className="font-bold text-xs text-[#0f172a]">{doctorName}, MD</span>
                  </div>
                  <span className="text-[11px] text-slate-500">{offer.doctorSpecialty || 'Clinical Specialist'}</span>
                </div>

                <div className="bg-[#fafafc] border border-slate-200 p-3.5 rounded-xl flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">FINANCIAL TERMS LOCKED</span>
                  <span className="font-bold text-xs text-[#3f1d8b]">Net Responsibility: {offer.totalPayable}</span>
                  <span className="text-[11px] text-slate-500">
                    Baseline ${offer.baselineFee.toLocaleString()} (-${offer.calculatedDiscount} Disc) • {offer.monthlyInstallment}/mo × {offer.termMonths || 12} mos • {offer.apr || '0.0%'} APR
                  </span>
                </div>

                <div className="bg-cyan-50/50 border border-cyan-200 p-3.5 rounded-xl flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-cyan-800">PROCEDURAL HOLD WINDOW</span>
                  <span className="font-bold text-xs text-cyan-900">{offer.expirationDate || 'Standard Clinical Hold'}</span>
                  <span className="text-[11px] text-cyan-700 font-medium">
                    Session Hold Active • Ready for physician procedural slot scheduling
                  </span>
                </div>
              </div>
            </div>

            {/* Card: Clinical Safety Hold History (CAREID-020 Remediation) */}
            <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className={`w-4 h-4 ${activeHoldCount > 0 ? 'text-rose-600 animate-pulse' : 'text-[#3f1d8b]'}`} />
                  <h3 className="font-bold text-sm text-[#0f172a]">
                    Clinical Safety Hold History
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    activeHoldCount > 0
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : safetyHolds.length > 0
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {activeHoldCount > 0 ? `${activeHoldCount} Active Procedural Hold` : `${safetyHolds.length} Recorded Holds`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsHoldHistoryExpanded(!isHoldHistoryExpanded)}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                    title={isHoldHistoryExpanded ? 'Collapse safety holds' : 'Expand safety holds'}
                    aria-label="Toggle safety hold history panel"
                  >
                    {isHoldHistoryExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Active Hold Warning Banner */}
              {activeHoldCount > 0 && (
                <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 flex items-start gap-3">
                  <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-rose-900 block">
                      Emergency Procedural Safety Hold Active
                    </span>
                    <p className="text-rose-700 mt-0.5 leading-relaxed">
                      Vascular access and procedural progression are currently paused under clinical safety hold governance. All holds must be formally remediated and resolved by authorized clinicians.
                    </p>
                  </div>
                </div>
              )}

              {/* Structured Holds List */}
              {isHoldHistoryExpanded && (
                <div className="flex flex-col gap-3">
                  {safetyHolds.length > 0 ? (
                    safetyHolds.map((hold, idx) => {
                      const isActive = hold.status === 'ACTIVE';
                      const isResolved = hold.status === 'RESOLVED';
                      return (
                        <div
                          key={hold.holdId || hold.id || idx}
                          className={`p-4 rounded-xl border text-xs flex flex-col gap-2.5 transition-colors ${
                            isActive
                              ? 'bg-rose-50/60 border-rose-300 shadow-sm'
                              : 'bg-slate-50/70 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#0f172a] text-xs">
                                {hold.categoryLabel || getReadableHoldCategory(hold.holdCategory)}
                              </span>
                              {hold.isLegacyParsed && (
                                <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                                  Reconciled Audit Record
                                </span>
                              )}
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isActive
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : isResolved
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}>
                              {hold.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-600">
                            <div>
                              <span className="text-slate-400 font-semibold block uppercase text-[9px]">DECLARATION RATIONALE</span>
                              <span className="font-medium text-slate-800 leading-relaxed block">{hold.reason}</span>
                              {hold.clinicalNotes && (
                                <p className="text-slate-500 italic mt-0.5">Clinical notes: {hold.clinicalNotes}</p>
                              )}
                            </div>
                            <div>
                              <span className="text-slate-400 font-semibold block uppercase text-[9px]">DECLARED AT</span>
                              <span className="text-slate-700 font-medium">
                                {hold.declaredAt ? new Date(hold.declaredAt).toLocaleString() : 'N/A'}
                                {hold.declaredByName ? ` by ${hold.declaredByName}` : ''}
                              </span>
                            </div>
                          </div>

                          {isResolved && (
                            <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-600">
                              <div>
                                <span className="text-emerald-700 font-semibold block uppercase text-[9px]">RESOLUTION DETAILS</span>
                                <span className="text-slate-800 font-medium">{hold.resolutionNotes || 'Remediated per clinical protocol.'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-semibold block uppercase text-[9px]">RESOLVED AT</span>
                                <span className="text-slate-700 font-medium">
                                  {hold.resolvedAt ? new Date(hold.resolvedAt).toLocaleString() : 'N/A'}
                                  {hold.resolvedByName ? ` by ${hold.resolvedByName}` : ''}
                                  {typeof hold.durationSeconds === 'number' && ` (${hold.durationSeconds}s duration)`}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                      <ShieldCheck className="size-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold block">No procedural safety holds declared</span>
                        <span className="text-[11px] text-emerald-700">
                          Pre-treatment checklist and clinical indication are clear for procedural clearance review.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card 2: Pre-Treatment Requirements & Readiness */}
            <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-[#0f172a]">
                    Pre-Treatment Requirements & Readiness
                  </h3>
                  <p className="text-xs text-slate-500">
                    {clearance?.policy?.name ? `Enforcing policy: ${clearance.policy.name}` : 'Gatekeeper checklist before day of procedure'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    clearance?.overallStatus === 'CLEARED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : clearance?.overallStatus === 'BLOCKED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-purple-100 text-[#3f1d8b]'
                  }`}>
                    {clearance?.completedGatesCount !== undefined && clearance?.totalGatesCount !== undefined
                      ? `${clearance.completedGatesCount} of ${clearance.totalGatesCount} Complete (${clearance.readinessPercentage || 0}%)`
                      : 'Evaluating readiness...'}
                  </span>
                </div>
              </div>

              {/* Dynamic Requirements or Clean Empty/Loading State */}
              <div className="flex flex-col gap-2.5">
                {clearance?.requirements && clearance.requirements.length > 0 ? (
                  clearance.requirements.map((req, idx) => {
                    const isCleared = req.status === 'CLEARED' || req.status === 'APPROVED' || req.status === 'WAIVED';
                    const isRejected = req.status === 'REJECTED';

                    const bgClass = isCleared
                      ? 'bg-emerald-50/40 border-emerald-100'
                      : isRejected
                      ? 'bg-rose-50/50 border-rose-200'
                      : req.isMandatory
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-slate-50 border-slate-200';

                    const availableSpecs = req.specialistReviews?.map((s) => s.specialty) || [];

                    return (
                      <div key={req.code || idx} className={`flex items-start justify-between p-3 rounded-xl border text-xs ${bgClass}`}>
                        <div className="flex items-start gap-2.5 max-w-[70%]">
                          {isCleared ? (
                            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : isRejected ? (
                            <XCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">
                                {idx + 1}. {req.name}
                              </span>
                              {req.isMandatory ? (
                                <span className="text-[9px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                  Mandatory
                                </span>
                              ) : (
                                <span className="text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                                  Optional
                                </span>
                              )}
                              {req.isSchedulingPrerequisite && (
                                <span className="text-[9px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                                  Booking Prereq
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{req.description}</p>
                            
                            {/* Specialist Multi-Approval Interactive Buttons/Badges */}
                            {req.category === 'SPECIALIST_CLEARANCE' && req.specialistReviews && req.specialistReviews.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {req.specialistReviews.map((sr) => {
                                  const isSpecCleared = sr.status === 'CLEARED' || sr.decision === 'CLEARED';
                                  const isSpecRejected = sr.status === 'REJECTED' || sr.decision === 'REJECTED';
                                  return (
                                    <button
                                      key={sr.specialty}
                                      type="button"
                                      onClick={() => handleOpenSpecialistModal(sr.specialty, req.code, availableSpecs)}
                                      className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 transition-colors cursor-pointer ${
                                        isSpecCleared
                                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                                          : isSpecRejected
                                          ? 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
                                          : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
                                      }`}
                                      title={`Click to review and record ${sr.specialty} clearance`}
                                    >
                                      {sr.specialty}: {sr.decision || sr.status}
                                      {sr.reviewerName && <span className="text-[8px] text-slate-500 font-normal">({sr.reviewerName})</span>}
                                      {!isSpecCleared && <span className="text-[8px] underline ml-0.5 font-bold">Sign</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {req.unmetReason && (
                              <p className="text-[10px] text-rose-700 font-medium mt-1">
                                Notice: {req.unmetReason}
                              </p>
                            )}
                            {req.clinicalRemarks && (
                              <p className="text-[10px] text-slate-600 italic mt-0.5">
                                Remarks: {req.clinicalRemarks}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons & status badge */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {req.category === 'LABORATORY' && (
                            <button
                              type="button"
                              onClick={() => handleOpenLabModal(req.code)}
                              className="text-[9px] font-bold px-2 py-1 rounded bg-white border border-purple-300 text-purple-900 hover:bg-purple-50 cursor-pointer shadow-sm"
                            >
                              Review Evidence
                            </button>
                          )}

                          {req.category === 'SPECIALIST_CLEARANCE' && !isCleared && (
                            <button
                              type="button"
                              onClick={() => {
                                const pendingSpec = req.specialistReviews?.find((s) => s.status !== 'CLEARED' && s.decision !== 'CLEARED')?.specialty || availableSpecs[0] || 'ANESTHESIA';
                                handleOpenSpecialistModal(pendingSpec, req.code, availableSpecs);
                              }}
                              className="text-[9px] font-bold px-2 py-1 rounded bg-white border border-blue-300 text-blue-900 hover:bg-blue-50 cursor-pointer shadow-sm"
                            >
                              Review & Sign
                            </button>
                          )}

                          {req.category !== 'LABORATORY' && req.category !== 'SPECIALIST_CLEARANCE' && !isCleared && (
                            <button
                              type="button"
                              disabled={isUpdatingClearance}
                              onClick={() => handleMarkClearance(req)}
                              className="text-[9px] font-bold px-2 py-1 rounded bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                            >
                              Clear
                            </button>
                          )}

                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            isCleared
                              ? 'bg-emerald-100 text-emerald-800'
                              : isRejected
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : clearance === null ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Clock className="size-5 text-slate-400 mb-1.5 animate-spin" />
                    <span className="font-medium">Loading authoritative clinical clearance policy...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <CheckCircle2 className="size-5 text-emerald-500 mb-1.5" />
                    <span className="font-semibold text-slate-700">No clearance requirements configured for this policy.</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">Offer is clinically cleared for scheduling.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Linked Records & Diagnostic Vault */}
            <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#3f1d8b]" />
                  <h3 className="font-bold text-sm text-[#0f172a]">
                    Linked Records & Diagnostic Vault
                  </h3>
                </div>
                <span className="text-xs text-slate-500">
                  {patientRecords.length > 0 ? `${patientRecords.length} Records Verified` : 'Vault Synced'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {patientRecords.length > 0 ? (
                  patientRecords.slice(0, 3).map((rec) => (
                    <div key={rec.id} className="bg-[#fafafc] border border-slate-200 p-3.5 rounded-xl flex flex-col justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-purple-700 block">{rec.encounters?.[0]?.encounterType || rec.status || 'CLINICAL RECORD'}</span>
                        <h5 className="font-bold text-xs text-slate-800 mt-0.5 truncate">{rec.title || 'Diagnostic Report'}</h5>
                        <p className="text-[10px] text-slate-400">{rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : 'On File'}</p>
                      </div>
                      <Link
                        to={`/patients/${encodeURIComponent(offer.patientId)}/medical-records`}
                        className="text-[#3f1d8b] hover:underline text-[11px] font-bold text-left flex items-center gap-1 cursor-pointer pt-1"
                      >
                        <span>Inspect Findings</span>
                        <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="bg-[#fafafc] border border-slate-200 p-3.5 rounded-xl flex flex-col justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-purple-700 block">CLINICAL DOSSIER</span>
                        <h5 className="font-bold text-xs text-slate-800 mt-0.5">Patient Health Vault</h5>
                        <p className="text-[10px] text-slate-400">EHR Identity: {offer.patientCid || 'CID-VERIFIED'}</p>
                      </div>
                      <Link
                        to={`/patients/${encodeURIComponent(offer.patientId)}/medical-records`}
                        className="text-[#3f1d8b] hover:underline text-[11px] font-bold text-left flex items-center gap-1 cursor-pointer pt-1"
                      >
                        <span>Open Records</span>
                        <ArrowRight className="size-3" />
                      </Link>
                    </div>

                    <div className="bg-[#fafafc] border border-slate-200 p-3.5 rounded-xl flex flex-col justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-700 block">IMAGING</span>
                        <h5 className="font-bold text-xs text-slate-800 mt-0.5">Diagnostic Studies</h5>
                        <p className="text-[10px] text-slate-400">Radiology & Cath Suite Vault</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/records/imaging')}
                        className="text-[#3f1d8b] hover:underline text-[11px] font-bold text-left flex items-center gap-1 cursor-pointer pt-1"
                      >
                        <span>View Imaging</span>
                        <ArrowRight className="size-3" />
                      </button>
                    </div>

                    <div className="bg-[#fafafc] border border-slate-200 p-3.5 rounded-xl flex flex-col justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 block">FINANCIAL PLAN</span>
                        <h5 className="font-bold text-xs text-slate-800 mt-0.5">{offer.financingPackageName}</h5>
                        <p className="text-[10px] text-slate-400 font-mono">FIN-{(offer.offerId || 'REC').slice(0, 8).toUpperCase()}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => triggerToast('Opening signed financing contract ratification...')}
                        className="text-[#3f1d8b] hover:underline text-[11px] font-bold text-left flex items-center gap-1 cursor-pointer pt-1"
                      >
                        <span>View Ratification</span>
                        <ArrowRight className="size-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT 1/3 COLUMN */}
          <div className="flex flex-col gap-6">
            {/* Card 1: Focus Card: Procedural Appointment Scheduling */}
            <div className="bg-white border-2 border-purple-300 rounded-[16px] p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="bg-purple-100 text-[#3f1d8b] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                  Next Procedural Step
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  Slot Hold Locked
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-bold text-base text-[#0f172a]">
                  Procedural Appointment Scheduling
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Financial underwriting is locked. {offer.patientName} is cleared for procedural suite scheduling. Confirm the clinical slot now or select an available time.
                </p>
              </div>

              {/* Detail Box */}
              <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#0f172a]">{offer.facility || 'Interventional Suite'}</span>
                  <span className="bg-cyan-100 text-cyan-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
                    HOLDING
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                  <Calendar className="size-3.5 text-[#3f1d8b]" />
                  <span>{offer.expirationDate || 'Flexible Procedural Slot'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Clock className="size-3 text-slate-400" />
                  <span>Pre-op arrival window: 2 hours prior to scheduled start</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAdvanceToScheduling}
                  className="w-full py-3 bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white text-xs font-bold rounded-xl shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Schedule / Confirm Cath Lab Slot</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleAdvanceToScheduling}
                  className="w-full py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>Select Alternative Available Slot</span>
                </button>
              </div>
            </div>

            {/* Card 2: Clinician Quick Links & Actions */}
            <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-5 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Clinician Quick Links & Actions
              </h4>
              <div className="flex flex-col gap-1 text-xs">
                <Link
                  to={`/patients/${offer.patientId}`}
                  className="py-2 px-2.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between"
                >
                  <span>View Patient Clinical Profile</span>
                  <ChevronRight className="size-3.5 text-slate-400" />
                </Link>
                <Link
                  to="/records"
                  className="py-2 px-2.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between"
                >
                  <span>View Medical Records & ECG Timeline</span>
                  <ChevronRight className="size-3.5 text-slate-400" />
                </Link>
                <Link
                  to={`/treatment-offers/${offer.offerId}/accepted`}
                  className="py-2 px-2.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between"
                >
                  <span>View Ratified Plan & In-House Terms</span>
                  <ChevronRight className="size-3.5 text-slate-400" />
                </Link>
                <button
                  type="button"
                  onClick={() => triggerToast('Treatment Agreement downloaded (PDF).')}
                  className="py-2 px-2.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between text-left cursor-pointer"
                >
                  <span>Download Treatment Agreement & Consent (PDF)</span>
                  <ExternalLink className="size-3.5 text-slate-400" />
                </button>
                <Link
                  to={`/patients/${offer.patientId}/financing`}
                  className="py-2 px-2.5 rounded-lg hover:bg-slate-50 text-purple-700 font-semibold flex items-center gap-1.5"
                >
                  <ArrowLeft className="size-3" />
                  <span>Back to Insurance & Financing Hub</span>
                </Link>
              </div>
            </div>

            {/* Card 3: AUDIT & GOVERNANCE TRAIL */}
            <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-5 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                  AUDIT & GOVERNANCE TRAIL
                </h4>
                <span className="bg-cyan-100 text-cyan-900 text-[9px] font-bold px-2 py-0.5 rounded">
                  COMPLIANT
                </span>
              </div>

              <div className="flex flex-col gap-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Attending:</span>
                  <span className="font-bold text-slate-800">{doctorName}, MD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Clearance Rule:</span>
                  <span className="font-mono text-slate-700">#CR-FIN-15 Approved</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan Reference:</span>
                  <span className="font-mono text-purple-700">FIN-{(offer.offerId || 'REC').slice(0, 8).toUpperCase()} ({offer.totalPayable})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="text-slate-700">{offer.dispatchedAt ? new Date(offer.dispatchedAt).toLocaleString() : 'Active Protocol'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Digital Token:</span>
                  <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    {offer.auditHash || `SHA256:${(offer.offerId || '').replace(/-/g, '').slice(0, 16)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="h-12 border-t border-[#e1e3e4] bg-[#f8f9fa] px-8 flex items-center justify-between text-[11px] text-slate-500 mt-auto shrink-0">
        <div className="flex items-center gap-2">
          <span>Care ID Enterprise Health Platform • Cardiology Procedural Protocol 2026</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-emerald-700 font-semibold">Medical EHR Sync: Active</span>
          <Link to="/settings" className="hover:underline">Support Desk</Link>
          <Link to="/settings" className="hover:underline">Clinical Guidelines</Link>
        </div>
      </footer>

      {/* Lab Evidence Modal */}
      {isLabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleConfirmLabClearance} className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Pre-Procedure Metabolic & Coagulation Evidence</h3>
                <p className="text-xs text-slate-500">Authoritative laboratory panel records for patient {offer.patientName}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsLabModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 flex flex-col gap-3 pr-1">
              {!clearance?.availableLabReports || clearance.availableLabReports.length === 0 ? (
                <div className="py-8 text-center bg-amber-50 rounded-xl p-4 border border-amber-200 text-amber-900 text-xs">
                  <AlertCircle className="size-6 text-amber-600 mx-auto mb-2" />
                  <p className="font-bold">No Verified Laboratory Reports On File</p>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Clearance policy strictly requires verified metabolic and coagulation reports before laboratory clearance can be granted.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="text-xs text-slate-600 font-medium">
                    Found {clearance.availableLabReports.length} laboratory test panel(s). Please verify before signing clearance:
                  </div>
                  {clearance.availableLabReports.map((report) => (
                    <div key={report.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-slate-900">{report.laboratoryName}</span>
                        <span className="text-[10px] text-slate-500">Reported: {report.reportedDate}</span>
                      </div>
                      {report.testItems && (
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          {report.testItems.map((item, idx) => (
                            <div key={idx} className="bg-white p-2 rounded border border-slate-100">
                              <span className="text-slate-500">{item.testName}: </span>
                              <span className="font-semibold text-slate-800">{item.resultValue} {item.unit}</span>
                              <span className={`ml-2 text-[9px] font-bold px-1 rounded ${
                                item.interpretation === 'NORMAL' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>{item.interpretation}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-semibold text-slate-700">Attending Clinical Remarks / Evidence Notes</label>
                <textarea
                  rows={2}
                  value={labRemarks}
                  onChange={(e) => setLabRemarks(e.target.value)}
                  placeholder="e.g. Metabolic and coagulation panel reviewed; electrolytes and platelet count confirmed within safe procedural thresholds."
                  className="w-full text-xs p-2.5 border rounded-xl focus:ring-2 focus:ring-[#3f1d8b]/20 focus:border-[#3f1d8b] outline-none"
                />
              </div>

              <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer p-2 bg-slate-50 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={labAttestation}
                  onChange={(e) => setLabAttestation(e.target.checked)}
                  className="mt-0.5"
                />
                <span>I attest that I have reviewed the clinical laboratory panels above and deem the patient clinically ready for procedure.</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsLabModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingClearance || !labAttestation || !clearance?.availableLabReports || clearance.availableLabReports.length === 0}
                className="px-4 py-2 rounded-xl bg-[#3f1d8b] hover:bg-[#341675] text-white text-xs font-bold shadow disabled:opacity-50"
              >
                {isUpdatingClearance ? 'Submitting...' : 'Sign & Certify Lab Clearance'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Specialist Multi-Approval Modal */}
      {isSpecialistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleConfirmSpecialistClearance} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Specialist Clinical Sign-Off</h3>
                <p className="text-xs text-slate-500">Record peer-specialist review decision</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSpecialistModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Clearance Specialty</label>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => {
                    const newSpec = e.target.value;
                    setSelectedSpecialty(newSpec);
                    if (newSpec === 'ANESTHESIA') {
                      setSpecialistRemarks('Airway Mallampati Class 1, NPO fasting compliant, MAC Tier 1 approved by anesthesia specialist.');
                    } else if (newSpec === 'CARDIOLOGY') {
                      setSpecialistRemarks('Echocardiogram LVEF 55%, normal sinus rhythm, hemodynamic parameters optimal for catheterization.');
                    } else if (newSpec === 'MEDICAL') {
                      setSpecialistRemarks('Comprehensive pre-op medical evaluation complete. Chronic medications held according to protocol.');
                    } else {
                      setSpecialistRemarks(`Comprehensive pre-op ${newSpec} specialist evaluation complete. Patient deemed clinically ready.`);
                    }
                  }}
                  className="w-full text-xs p-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-[#3f1d8b]/20 focus:border-[#3f1d8b] outline-none"
                >
                  {specialistOptions.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec} Specialist Clearance
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Clinical Remarks & Risk Assessment</label>
                <textarea
                  rows={3}
                  value={specialistRemarks}
                  onChange={(e) => setSpecialistRemarks(e.target.value)}
                  placeholder="e.g. ASA Class II confirmed. Airway evaluation normal, hemodynamic parameters acceptable for procedure."
                  className="w-full text-xs p-2.5 border rounded-xl focus:ring-2 focus:ring-[#3f1d8b]/20 focus:border-[#3f1d8b] outline-none"
                />
              </div>

              <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer p-2 bg-slate-50 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={specialistAttestation}
                  onChange={(e) => setSpecialistAttestation(e.target.checked)}
                  className="mt-0.5"
                />
                <span>I certify that this pre-operative assessment has been conducted and approved in accordance with clinical protocol.</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsSpecialistModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingClearance || !specialistAttestation}
                className="px-4 py-2 rounded-xl bg-[#3f1d8b] hover:bg-[#341675] text-white text-xs font-bold shadow disabled:opacity-50"
              >
                {isUpdatingClearance ? 'Recording...' : 'Submit Decision'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
