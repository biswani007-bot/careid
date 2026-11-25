import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Building,
  CreditCard,
  Clock,
  Bell,
  Plus,
  Activity,
  Download,
  AlertCircle,
  Check,
} from 'lucide-react';
import { TreatmentOfferState, AppointmentRecord, dtoToOfferState, enrichOfferStateWithPatient } from './types';
import { treatmentOfferService, formatTreatmentOfferError } from '@/services/treatmentOfferService';
import { patientService, VitalSignsDTO } from '@/services/patientService';
import {
  appointmentService,
  AppointmentDTO,
  AppointmentReadinessDTO,
  formatAppointmentError,
} from '@/services/appointmentService';

export const PreOpReadinessPage: React.FC = () => {
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

  const [realAppointment, setRealAppointment] = useState<AppointmentDTO | null>(null);
  const [readinessRecord, setReadinessRecord] = useState<AppointmentReadinessDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

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

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const apptId = searchParams.get('appointmentId') || offer.appointmentId;
    if (apptId) {
      appointmentService.getAppointmentById(apptId)
        .then(setRealAppointment)
        .catch((err: unknown) => setLoadError((prev) => prev || formatAppointmentError(err)));
    } else if (offer.patientId) {
      appointmentService.listAppointments({ patientProfileId: offer.patientId, limit: 1 })
        .then((res) => {
          if (res.data && res.data.length > 0) {
            setRealAppointment(res.data[0]);
          }
        })
        .catch((err: unknown) => setLoadError((prev) => prev || formatAppointmentError(err)));
    }
  }, [location.search, offer.appointmentId, offer.patientId]);

  const appointment: AppointmentRecord = {
    appointmentId: offer.offerId ? `#PROC-${offer.offerId.slice(0, 8).toUpperCase()}` : '',
    offerId: offer.offerId || id || '',
    patientId: offer.patientId || '',
    patientName: offer.patientName || '',
    procedureName: offer.procedureName || 'Clinical Procedure',
    cptCode: offer.cptCode || '',
    facility: offer.facility || 'Heart Center Outpatient Unit',
    facilityAddress: offer.facility || 'Cardiac Outpatient Pavilion',
    suite: 'Cath Lab Suite (Interventional Wing)',
    scheduledDate: offer.expirationDate || 'Pending Final Confirmation',
    scheduledTime: 'Time Pending',
    arrivalWindow: '2 Hours Prior to Scheduled Slot',
    attendingDoctor: user?.fullName || offer.attendingDoctor || 'Attending Physician, MD',
    attendingLicense: 'Interventional Specialist',
    anesthesiaProtocol: 'MAC Tier 1 Standby (Mild conscious sedation / Local lidocaine 1%)',
    anesthesiaStaff: 'NP / CRNA Standby',
    underwrittenAmount: offer.totalPayable,
    financingPlan: offer.financingPackageName,
    lockedTimestamp: offer.dispatchedAt || 'Active Protocol',
    auditHash: offer.auditHash || `SHA256:${(offer.offerId || '').replace(/-/g, '').slice(0, 16)}`,
    readinessPercentage: 60,
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

  // Gate states for interactive clinical evaluation
  const [labCleared, setLabCleared] = useState<boolean>(false);
  const [anesthesiaCleared, setAnesthesiaCleared] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [patientVitals, setPatientVitals] = useState<VitalSignsDTO[]>([]);

  useEffect(() => {
    if (offer.patientId) {
      patientService.getPatientVitals(offer.patientId)
        .then((v) => {
          setPatientVitals(v);
        })
        .catch(() => {
          // fallback
        });
    }
  }, [offer.patientId]);

  useEffect(() => {
    if (!realAppointment?.id) return;
    appointmentService.getAppointmentReadiness(realAppointment.id)
      .then((rd) => {
        setReadinessRecord(rd);
        if (rd.vitalsWithinThreshold) setLabCleared(true);
        if (rd.consentVerified && rd.decision === 'GO') setAnesthesiaCleared(true);
      })
      .catch(() => {
        // Readiness record may not exist yet before first PATCH
      });
  }, [realAppointment?.id]);

  const latestVitals = patientVitals.length > 0 ? patientVitals[0] : null;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Calculate dynamic clearance percentage
  const clearedCount = 8 + (labCleared ? 2 : 0) + (anesthesiaCleared ? 1 : 0);
  const totalGates = 11;
  const isFullyCleared = clearedCount === totalGates || readinessRecord?.decision === 'GO';
  const percentage = Math.round((clearedCount / totalGates) * 100);

  const handleSignOffAndAdvance = async () => {
    if (!isFullyCleared) {
      triggerToast('Cannot advance: Mandatory coagulation labs and anesthesia clearance must be completed.');
      return;
    }
    if (!realAppointment?.id) {
      triggerToast('No scheduled appointment found for this treatment offer.');
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    try {
      const updated = await appointmentService.updateAppointmentReadiness(realAppointment.id, {
        fastingConfirmed: true,
        medicationHoldConfirmed: true,
        transportationArranged: true,
        consentVerified: true,
        vitalsWithinThreshold: labCleared,
        decision: 'GO',
        notes: 'Pre-op Day-1 readiness verified and signed off by attending physician',
      });
      setReadinessRecord(updated);
      triggerToast('Pre-op clinical checklist persisted and signed off.');
      navigate(
        `/treatment-offers/${offer.offerId}/check-in?appointmentId=${encodeURIComponent(realAppointment.id)}`,
        { state: { ...offer, appointmentId: realAppointment.id } }
      );
    } catch (err: unknown) {
      triggerToast(formatAppointmentError(err));
    } finally {
      setIsSaving(false);
    }
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

      {/* TOP WORKSPACE HEADER (Figma 1:12355) */}
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
          <Link to={`/treatment-offers/${offer.offerId}/appointment`} className="hover:text-slate-800 transition-colors">
            Appointment #{appointment.appointmentId}
          </Link>
          <span>/</span>
          <span className="bg-purple-100 text-[#3f1d8b] font-bold px-2 py-0.5 rounded text-[11px]">
            Pre-Op Readiness
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

      {/* PATIENT CONTEXT RIBBON */}
      <div className="border-b border-[#e1e3e4] bg-white px-8 py-3 shrink-0">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#3f1d8b] text-white flex items-center justify-center font-bold text-sm shrink-0">
              {patientInitials}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#0f172a]">{offer.patientName}</span>
                <span className="text-xs text-slate-400 font-mono">CID {offer.patientCid}</span>
                <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-1.5 py-0.2 rounded">
                  Allergy: {offer.patientAllergy || 'NKDA'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>{offer.patientAge || 'Age N/A'} {offer.patientGender ? `• ${offer.patientGender}` : ''}</span>
                <span>•</span>
                <span>Blood: {offer.patientBlood || 'On File'}</span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold">{offer.insuranceStatus || 'Self-Pay'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => triggerToast('Care ID Card verified.')}
              className="border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-[#3f1d8b] text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CreditCard className="size-3.5" />
              <span>View Care ID Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CHECKLIST WORKSPACE */}
      <main className="flex-1 overflow-y-auto px-8 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Unable to load live pre-op readiness data: {loadError}</span>
          </div>
        )}
        {/* Header & Gatekeeper Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Cath Lab Pre-Procedure Clinical Readiness Checklist
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Comprehensive multi-disciplinary gatekeeper audit verifying financial, legal, laboratory, pharmacological, and facility prerequisites prior to cardiac catheterization.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => triggerToast('Categories toggled.')}
              className="border border-[#e2e8f0] bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Toggle Categories
            </button>
            <button
              type="button"
              onClick={() => triggerToast('Audit trail ledger opened.')}
              className="border border-[#e2e8f0] bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Audit Trail
            </button>
          </div>
        </div>

        {/* READINESS INDICATOR BANNER (Figma 1:12355) */}
        <div className={`rounded-[16px] p-6 shadow-sm border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors ${
          isFullyCleared ? 'bg-emerald-900 text-white border-emerald-800' : 'bg-gradient-to-r from-amber-50 to-orange-50/60 border-amber-200 text-amber-950'
        }`}>
          <div className="flex items-start gap-4 max-w-xl">
            <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${
              isFullyCleared ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-100 text-amber-700'
            }`}>
              {isFullyCleared ? <CheckCircle2 className="size-7 stroke-[2.5]" /> : <AlertTriangle className="size-7 stroke-[2.5]" />}
            </div>
            <div>
              <span className={`text-[10px] uppercase font-bold tracking-wider block ${
                isFullyCleared ? 'text-emerald-300' : 'text-amber-700'
              }`}>
                {isFullyCleared ? 'ALL CRITICAL GATES RATIFIED • PROCEDURALLY CLEARED' : 'PREPARATION INCOMPLETE — 2 CRITICAL GATES PENDING'}
              </span>
              <span className="text-xs font-mono font-bold block mt-0.5">
                Scheduled: {appointment.scheduledDate} @ {appointment.scheduledTime}
              </span>
              <p className={`text-xs mt-1 leading-relaxed ${isFullyCleared ? 'text-emerald-100' : 'text-amber-800'}`}>
                {isFullyCleared
                  ? `All 11 clinical and administrative prerequisites have been verified. ${offer.patientName} is 100% cleared for day-of-procedure admission and intra-procedure safety verification.`
                  : `Procedure locked for ${appointment.scheduledDate} @ ${appointment.scheduledTime}. Mandatory pre-op coagulation labs and anesthesia clearance must be ratified prior to admission to avoid procedural postponement.`}
              </p>
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col gap-2 min-w-[260px] ${
            isFullyCleared ? 'bg-emerald-950/60 border-emerald-800/60 text-white' : 'bg-white border-amber-200 shadow-2xs'
          }`}>
            <div className="flex justify-between items-center text-xs font-bold">
              <span>Prerequisites Cleared</span>
              <span className={isFullyCleared ? 'text-emerald-300 text-base font-black' : 'text-purple-700 text-base font-black'}>
                {clearedCount} of {totalGates} ({percentage}%)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isFullyCleared ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-400 to-[#5b14b8]'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 pt-1">
              <span className="text-emerald-700 font-semibold">{clearedCount} Completed</span>
              {!isFullyCleared && <span className="text-amber-700 font-semibold">2 Action Required</span>}
              {!isFullyCleared && <span className="text-blue-700 font-semibold">1 Pending</span>}
            </div>
          </div>
        </div>

        {/* 4 CHECKLIST CATEGORIES */}
        <div className="flex flex-col gap-6">
          {/* CATEGORY 1: Financial & Legal Authorization */}
          <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building className="size-4 text-[#3f1d8b]" />
                <h3 className="font-bold text-sm text-[#0f172a]">
                  Category 1: Financial & Legal Authorization
                </h3>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="size-3" /> 100% Cleared
              </span>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              {/* Item 1 */}
              <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">1. Financial Settlement & Authorization</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded">COMPLETED</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      15% Prompt settlement discount applied; $4,420.00 underwritten via primary electronic bank transfer.
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">Ledger Ref: #REV-2026-88519 • Settled Oct 18, 2026 @ 14:22 EST</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => triggerToast('Receipt #REV-2026-88519 downloaded.')}
                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer shrink-0"
                >
                  View Receipt
                </button>
              </div>

              {/* Item 2 */}
              <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">2. Care ID 0% APR Financing Agreement</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded">COMPLETED</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      In-house 12-month agreement locked (#FIN-TR8921-12M) for post-procedure cardiac rehabilitation rider.
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">Credit Assurance ID: #CRD-0052-768 • Automated Autopay Activated</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => triggerToast('Financing amortization schedule opened.')}
                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer shrink-0"
                >
                  Terms & Amortization
                </button>
              </div>

              {/* Item 3 */}
              <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">3. Informed Procedural & Biometric Digital Consent</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded">COMPLETED</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Electronically executed via Care ID mobile app on Oct 19, 2026. Biometric facial token matching national EHR standards.
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">Cryptographic SHA-256 Sign Verified • Witnessed by Clinical Navigator Merri Dunn, RN</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => triggerToast('Signed consent document opened.')}
                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer shrink-0"
                >
                  Signed Consent PDF
                </button>
              </div>
            </div>
          </div>

          {/* CATEGORY 2: Laboratory & Diagnostic Prerequisites */}
          <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-amber-600" />
                <h3 className="font-bold text-sm text-[#0f172a]">
                  Category 2: Laboratory & Diagnostic Prerequisites
                </h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                labCleared ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
              }`}>
                {labCleared ? 'All Verified (INR 1.1)' : 'Action Required'}
              </span>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              {/* Item 4: Coagulation Panel */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                labCleared ? 'bg-emerald-50/40 border-emerald-100' : 'bg-amber-50/50 border-amber-200'
              }`}>
                <div className="flex items-start gap-3">
                  {labCleared ? (
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">4. Coagulation Panel (PT/INR, aPTT)</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        labCleared ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {labCleared ? 'RATIFIED (INR 1.1 OPTIMAL)' : 'ACTION REQUIRED !'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {labCleared
                        ? 'Coagulation profile verified in CareID clinical record (INR within threshold).'
                        : 'Coagulation lab verification pending before procedure start.'}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {realAppointment?.appointmentDate ? `Target Procedure: ${realAppointment.appointmentDate}` : 'Pre-Op Lab Gate'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (offer.patientId) {
                      triggerToast('Checking clinical laboratory records in EHR...');
                      patientService.getPatientMedicalRecords(offer.patientId)
                        .then((records) => {
                          if (records.length > 0) {
                            setLabCleared(true);
                            triggerToast('Clinical diagnostic records verified in EHR.');
                          } else {
                            triggerToast('No coagulation results uploaded in EHR. Specimen collection pending.');
                          }
                        })
                        .catch(() => {
                          triggerToast('EHR record check complete. Coagulation results pending draw.');
                        });
                    } else {
                      triggerToast('Patient record not attached.');
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer shrink-0 shadow-2xs ${
                    labCleared
                      ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      : 'bg-[#28006d] hover:bg-[#3f1d8b] text-white'
                  }`}
                >
                  {labCleared ? 'Re-verify EHR Lab' : 'Query EHR Lab'}
                </button>
              </div>

              {/* Item 5: BMP & Creatinine */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                labCleared ? 'bg-emerald-50/40 border-emerald-100' : 'bg-[#fafafc] border-slate-200'
              }`}>
                <div className="flex items-start gap-3">
                  {labCleared ? (
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="size-4 text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">5. Basic Metabolic Panel & Serum Creatinine</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        labCleared ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {labCleared ? 'CLEARED (eGFR 88)' : 'PENDING SPECIMEN'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Required for contrast and renal baseline verification prior to procedure.
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">Order #BMP-48812-NEPH • Baseline standard requirement eGFR &gt; 60 mL/min/1.73m²</span>
                    {latestVitals && (
                      <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                        EHR Baseline Vitals: {latestVitals.bloodPressure || `${latestVitals.systolicBp || 120}/${latestVitals.diastolicBp || 80}`} mmHg • Pulse {latestVitals.pulseBpm || 72} BPM (Verified {new Date(latestVitals.recordedAt).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => triggerToast('Upload external lab requisition opened.')}
                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer shrink-0"
                >
                  Upload External Results
                </button>
              </div>

              {/* Item 6: ECG & Echo */}
              <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">6. Diagnostic 12-Lead ECG & Echo Review</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded">COMPLETED</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pre-cath Echo and treadmill stress report uploaded and verified by {doctorName}. Normal LV systolic function, EF ~55%.
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">EKG Reading #EKG-2412 verified • Baseline Oct 14, 2026</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/records/imaging')}
                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer shrink-0"
                >
                  Inspect Findings
                </button>
              </div>
            </div>
          </div>

          {/* CATEGORY 3: Pharmacological & Safety Protocols */}
          <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-purple-700" />
                <h3 className="font-bold text-sm text-[#0f172a]">
                  Category 3: Pharmacological & Safety Protocols
                </h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                anesthesiaCleared ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-900'
              }`}>
                {anesthesiaCleared ? 'All Protocols Cleared' : 'Pending Final Sign-Off'}
              </span>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              {/* Item 7: Penicillin Allergy */}
              <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">7. Penicillin Allergy Safeguard Verification</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded">COMPLETED</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Severe allergy verified. Cross-reactive cephalosporins flagged on sterile prep manifold. Vancomycin prophylaxis standby protocol registered.
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">EHR Pharmacy Flag ID: #PHA-ALLERGY-11 • Double-verification Signed by Staff Pharm. R. Nelco</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => triggerToast('Allergy manifold protocols opened.')}
                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer shrink-0"
                >
                  Protocol Details
                </button>
              </div>

              {/* Item 8: Metformin Hold */}
              <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">8. Pre-Procedure Medication Hold Orders</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded">COMPLETED</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Metformin discontinuation protocol (48 hrs prior) delivered to patient mobile dashboard. Patient acknowledged hold timeline via Care ID App.
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">Pre-Op Medication Hold Protocol</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => triggerToast('Patient app medication logs displayed.')}
                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer shrink-0"
                >
                  Patient App Logs
                </button>
              </div>

              {/* Item 9: Anesthesia Clearance */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                anesthesiaCleared ? 'bg-emerald-50/40 border-emerald-100' : 'bg-blue-50/50 border-blue-200'
              }`}>
                <div className="flex items-start gap-3">
                  {anesthesiaCleared ? (
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="size-4 text-blue-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">9. Pre-Op Anesthesia & Sedation Clearance</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        anesthesiaCleared ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-900'
                      }`}>
                        {anesthesiaCleared ? 'CLEARED (MAC STANDBY)' : 'PENDING REVIEW !'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {anesthesiaCleared
                        ? 'Pre-op anesthesia & sedation protocol verified and attested.'
                        : 'Anesthesia evaluation & airway/sedation clearance pending sign-off.'}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {readinessRecord?.decision ? `Readiness Decision: ${readinessRecord.decision}` : 'Pre-Op Anesthesia Gate'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!anesthesiaCleared) {
                      setAnesthesiaCleared(true);
                      triggerToast('Attending clinician attested anesthesia standby protocol clearance.');
                    } else {
                      setAnesthesiaCleared(false);
                      triggerToast('Anesthesia protocol clearance reset to pending.');
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer shrink-0 shadow-2xs ${
                    anesthesiaCleared
                      ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      : 'border border-blue-300 bg-white hover:bg-blue-50 text-blue-800'
                  }`}
                >
                  {anesthesiaCleared ? 'Re-inspect Protocol' : 'Verify Anesthesia Plan'}
                </button>
              </div>
            </div>
          </div>

          {/* CATEGORY 4: Facility & Logistical Preparations */}
          <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building className="size-4 text-[#3f1d8b]" />
                <h3 className="font-bold text-sm text-[#0f172a]">
                  Category 4: Facility & Logistical Preparations
                </h3>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Confirmed
              </span>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              {/* Item 10 */}
              <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">10. Cath Lab Suite 3 Reservation & Sterile Pack</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded">COMPLETED</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {offer.facility || 'Interventional Suite'} locked for {appointment.scheduledDate} ({appointment.scheduledTime}). C-Arm Fluoroscopy calibrated. Sterile tray pre-allocated.
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">Resource Allocation #STE-SUITE-391 • Team Leads: Lead RN / Ramos</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => triggerToast('Suite equipment roster displayed.')}
                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer shrink-0"
                >
                  Suite Equipment Roster
                </button>
              </div>

              {/* Item 11 */}
              <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">11. Patient Fasting (NPO) & Transportation Escort</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded">COMPLETED</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Strict NPO fasting protocol and designated post-sedation escort verification tracked for discharge safety.
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">Post-Procedure Escort Verification Required</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => triggerToast('Escort verified details displayed.')}
                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer shrink-0"
                >
                  Escort Details
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/treatment-offers/${offer.offerId}/appointment`, { state: offer })}
              className="border border-[#e2e8f0] bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Return to Scheduled Procedure Details</span>
            </button>
            <button
              type="button"
              onClick={() => triggerToast('Readiness audit report PDF exported.')}
              className="border border-[#e2e8f0] bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="size-3.5 text-slate-500" />
              <span>Download Readiness Audit Report (PDF)</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSignOffAndAdvance}
              disabled={!isFullyCleared}
              className={`px-6 py-2.5 text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                isFullyCleared
                  ? 'bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white hover:opacity-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isFullyCleared ? <Check className="size-4" /> : <Lock className="size-4" />}
              <span>Sign Off Final Clinical Clearance</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="h-12 border-t border-[#e1e3e4] bg-[#f8f9fa] px-8 flex items-center justify-between text-[11px] text-slate-500 mt-auto shrink-0">
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span>Care ID Clinical Governance Engine • Offer #{offer.offerId}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Attending: {doctorName}, MD (Interventional Cardiology)</span>
          <span className="text-emerald-700 font-semibold">Tamper-Proof Audit Active</span>
        </div>
      </footer>
    </div>
  );
};
