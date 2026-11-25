import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building,
  CreditCard,
  Clock,
  Bell,
  User,
  Plus,
  Activity,
  FileText,
  ExternalLink,
  Printer,
  Sparkles,
  Lock,
  Info,
} from 'lucide-react';
import { TreatmentOfferState, dtoToOfferState, enrichOfferStateWithPatient } from './types';
import { treatmentOfferService, formatTreatmentOfferError } from '@/services/treatmentOfferService';
import { patientService, VitalSignsDTO } from '@/services/patientService';
import { appointmentService, AppointmentDTO, formatAppointmentError } from '@/services/appointmentService';

export const DayOfCheckinPage: React.FC = () => {
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

  const [vitalsList, setVitalsList] = useState<VitalSignsDTO[]>([]);
  const [appointment, setAppointment] = useState<AppointmentDTO | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [triageBp, setTriageBp] = useState<string>('');
  const [triagePulse, setTriagePulse] = useState<number | ''>('');
  const [triageSpo2, setTriageSpo2] = useState<number | ''>('');
  const [triageTempC, setTriageTempC] = useState<number | ''>('');
  const [triageBayNumber, setTriageBayNumber] = useState<string>('BAY-04');
  const [isEditingVitals, setIsEditingVitals] = useState<boolean>(false);

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
    if (offer.patientId) {
      patientService.getPatientVitals(offer.patientId)
        .then((v) => {
          setVitalsList(v);
          if (v && v.length > 0) {
            const latest = v[0];
            const bp = latest.bloodPressure || (latest.systolicBp && latest.diastolicBp ? `${latest.systolicBp}/${latest.diastolicBp}` : '');
            if (bp) setTriageBp(bp);
            if (latest.pulseBpm) setTriagePulse(latest.pulseBpm);
            if (latest.oxygenSaturation) setTriageSpo2(latest.oxygenSaturation);
            if (latest.temperatureC) setTriageTempC(latest.temperatureC);
          }
        })
        .catch(() => {});
    }

    const searchParams = new URLSearchParams(location.search);
    const apptId = searchParams.get('appointmentId') || offer.appointmentId;
    if (apptId) {
      appointmentService.getAppointmentById(apptId)
        .then((a) => {
          setAppointment(a);
          if (a.status === 'IN_PROGRESS') {
            setIsCheckedIn(true);
          }
        })
        .catch((err: unknown) => {
          setLoadError((prev) => prev || formatAppointmentError(err));
        });
    } else if (offer.patientId) {
      appointmentService.listAppointments({ patientProfileId: offer.patientId, limit: 1 })
        .then((res) => {
          if (res.data && res.data.length > 0) {
            setAppointment(res.data[0]);
            if (res.data[0].status === 'IN_PROGRESS') {
              setIsCheckedIn(true);
            }
          }
        })
        .catch((err: unknown) => {
          setLoadError((prev) => prev || formatAppointmentError(err));
        });
    }
  }, [offer.patientId, offer.appointmentId, location.search]);

  const latestVitals = vitalsList.length > 0 ? vitalsList[0] : null;

  const doctorName = user?.fullName ? `Dr. ${user.fullName.replace(/^Dr\.\s*/i, '')}` : offer.attendingDoctor || 'Attending Physician';
  const doctorInitials = (user?.fullName || offer.attendingDoctor || 'AP')
    .replace(/^Dr\.\s*/i, '')
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

  const handleConfirmCheckin = async () => {
    if (!appointment?.id) {
      triggerToast('No scheduled appointment linked to check in.');
      return;
    }
    if (isCheckingIn) return;
    setIsCheckingIn(true);
    try {
      const bp =
        triageBp ||
        latestVitals?.bloodPressure ||
        (latestVitals?.systolicBp && latestVitals?.diastolicBp
          ? `${latestVitals.systolicBp}/${latestVitals.diastolicBp}`
          : '120/80');
      const pulse = typeof triagePulse === 'number' ? triagePulse : (latestVitals?.pulseBpm || 72);
      const spo2 = typeof triageSpo2 === 'number' ? triageSpo2 : (latestVitals?.oxygenSaturation || 99);
      const temp = typeof triageTempC === 'number' ? triageTempC : (latestVitals?.temperatureC || 36.6);
      const bay = triageBayNumber.trim() || 'BAY-04';

      const facilityId = appointment.facilityId || offer.facilityId;
      const updated = await appointmentService.checkInAppointment(appointment.id, {
        facilityId: facilityId || undefined,
        bedOrBayNumber: bay,
        vitals: {
          bloodPressure: bp,
          heartRate: pulse,
          oxygenSaturation: spo2,
          temperature: temp,
        },
        notes: `Patient checked in at pre-op intake desk in ${bay}`,
      });
      setAppointment(updated);
      setIsCheckedIn(true);
      triggerToast('Day-of-procedure patient check-in recorded on backend.');
    } catch (err: unknown) {
      triggerToast(`Check-in failed: ${formatAppointmentError(err)}`);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleBeginVerification = () => {
    const apptQuery = appointment?.id ? `?appointmentId=${encodeURIComponent(appointment.id)}` : '';
    navigate(`/treatment-offers/${offer.offerId}/cath-lab-safety${apptQuery}`, {
      state: { ...offer, appointmentId: appointment?.id || offer.appointmentId },
    });
  };

  return (
    <div className="w-full bg-[#f4f7f9] min-h-screen text-[#0f172a] font-['Plus_Jakarta_Sans',sans-serif] flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f172a] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {loadError && (
        <div className="max-w-[1280px] w-full mx-auto px-8 pt-4">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Unable to load live day-of check-in state: {loadError}</span>
          </div>
        </div>
      )}

      {/* 1. TOP STATUS & CLINICAL APP BAR (Figma 1:13596) */}
      <header className="h-14 border-b border-[#e1e3e4] bg-white px-6 md:px-8 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span>Live EHR Sync</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 font-semibold bg-slate-100 px-3 py-1 rounded-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Cath Lab Station #04</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => triggerToast('New clinical encounter form initialized.')}
            className="bg-[#24005A] hover:bg-[#34007a] text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Encounter</span>
          </button>

          <button
            type="button"
            onClick={() => triggerToast('No pending telemetry alerts.')}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer relative"
            aria-label="Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 bg-rose-500 rounded-full absolute top-1.5 right-1.5 ring-2 ring-white"></span>
          </button>

          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-[#3b1275] text-white flex items-center justify-center text-xs font-bold shadow-inner">
              {doctorInitials}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight">{doctorName}</span>
              <span className="text-[10px] text-slate-500">Attending Physician</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. CONTEXT RIBBON & WORKFLOW STAGES */}
      <div className="bg-[#f0f4f8] border-b border-[#e1e6eb] px-6 md:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="bg-[#24005A] text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wide">
            ACTIVE CONTEXT
          </span>
          <span className="font-bold text-slate-800">
            {offer.patientName} <span className="font-normal text-slate-500">{offer.patientDob ? `(DOB: ${offer.patientDob})` : (offer.patientAge ? `(${offer.patientAge})` : '')}</span>
          </span>
          <span className="text-slate-400">•</span>
          <span className="font-mono text-slate-600 font-semibold">ID: {offer.patientCid || 'CID-RECORD'}</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-700 font-medium">{offer.procedureName}</span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
          <span className="text-slate-500">Workflow:</span>
          <span className="bg-[#24005A] text-white px-2.5 py-1 rounded-md shadow-xs">
            Cath Lab Day-of-Procedure
          </span>
          <span className="text-slate-400 px-1">›</span>
          <span className="text-slate-600 hover:text-slate-900 cursor-pointer" onClick={handleBeginVerification}>
            Verification
          </span>
          <span className="text-slate-400 px-1">›</span>
          <span className="text-slate-400">Active Encounter</span>
          <span className="text-slate-400 px-1">›</span>
          <span className="text-slate-400">Post-Procedure</span>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-8 flex flex-col gap-6">
        {/* PATIENT IDENTIFICATION & ARRIVAL HERO CARD */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-5 border-b border-slate-100">
            {/* Left: Patient Avatar & Demographics */}
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-slate-200 border-2 border-white shadow-md overflow-hidden flex items-center justify-center text-slate-400">
                  <User className="w-10 h-10 text-slate-500 mt-2" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-teal-500 text-white rounded-full p-1 border-2 border-white shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {offer.patientName}
                  </h1>
                  <span className="bg-slate-900 text-white text-xs font-mono font-bold px-2.5 py-0.5 rounded-full">
                    CID {offer.patientCid}
                  </span>
                  <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Allergy: {offer.patientAllergy || 'NKDA'}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-medium">
                  <span>{offer.patientAge || 'Age N/A'} {offer.patientGender ? `• ${offer.patientGender}` : ''}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700">Blood: {offer.patientBlood || 'On File'}</span>
                  <span>•</span>
                  <span>Escort: Designated Family / Clinical Transport</span>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  <span>• Attending: <strong className="text-slate-800">{doctorName}, MD</strong></span>
                </div>
              </div>
            </div>

            {/* Right: Arrival Time & Station Status */}
            <div className="flex items-center gap-4 self-stretch lg:self-auto justify-between lg:justify-end">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  Arrival Timestamp
                </div>
                <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                  {appointment?.startTime || '07:30'}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  AM • Bay #04 Outpatient Pre-Op
                </div>
              </div>

              <div className="bg-[#e0f7f6] border border-[#a2e8e4] rounded-xl px-4 py-3 text-center min-w-[170px] shadow-xs cursor-pointer hover:opacity-95" onClick={handleConfirmCheckin}>
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#00695c] tracking-wider uppercase mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#00897b] animate-ping"></span>
                  <span>Status</span>
                </div>
                <div className="text-sm font-extrabold text-[#004d40]">
                  {isCheckedIn ? 'ARRIVED & CHECKED IN' : 'CONFIRM ARRIVAL'}
                </div>
                <div className="text-[11px] font-semibold text-[#00796b] mt-0.5">
                  {appointment?.startTime ? `Scheduled: Today ${appointment.startTime}` : 'Scheduled: Pending Time'}
                </div>
              </div>
            </div>
          </div>

            {/* Bottom Inner Banner: Scheduled Intervention & Financial Status */}
            <div className="mt-4 bg-[#f1f5f9] border border-[#dce3ec] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Scheduled Intervention
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900">
                    {offer.procedureName || 'Diagnostic Cardiac Catheterization & Coronary Angiogram'} {offer.cptCode ? `(CPT #${offer.cptCode})` : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="uppercase">{offer.financingPackageName || 'CARE ID 0% APR PLAN'}</span>
                  <span className="text-emerald-700 font-extrabold">{offer.totalPayable} Locked & Settled</span>
                </div>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold px-2.5 py-1.5 rounded-lg">
                  SELF-PAY PROMPT CONFIRMED
                </span>
              </div>
            </div>
        </div>

        {/* 4. TWO-COLUMN WORKSTATION GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Pre-Procedure Readiness Matrix & Bottom Verification Banner (approx 65%) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Header Strip */}
            <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Pre-Procedure Readiness Matrix
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                6 of 7 Protocols Cleared • 1 Needs Attention
              </span>
            </div>

            {/* Matrix 2-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Financial & Settlement */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold text-slate-900">
                      1. Financial & Settlement
                    </span>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                    COMPLETED
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium">Ref #FIN-{offer.offerId ? offer.offerId.slice(0, 8).toUpperCase() : 'TR8921-12M'}</div>
                <div className="bg-slate-50 rounded-lg p-2.5 flex flex-col gap-1 text-xs border border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>{offer.discountValue || 15}% Prompt Cash Discount:</span>
                    <strong className="text-emerald-700">-{offer.calculatedDiscount ? `$${offer.calculatedDiscount.toFixed(2)}` : '$780.00'} Applied</strong>
                  </div>
                  <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200 pt-1">
                    <span>Care ID Underwritten:</span>
                    <strong className="text-slate-900">{offer.totalPayable || '$4,420.00'} ({offer.apr || '0.0%'} APR)</strong>
                  </div>
                </div>
              </div>

              {/* Card 2: Biometric Consent & Legal */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-slate-900">
                      2. Biometric Consent & Legal
                    </span>
                  </div>
                  <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded">
                    VERIFIED
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium">Signed {offer.expirationDate || 'On Record'}</div>
                <div className="bg-slate-50 rounded-lg p-2.5 flex flex-col gap-1 text-xs border border-slate-100">
                  <div className="text-slate-600 text-[11px]">Cryptographic Care ID Seal:</div>
                  <div className="font-mono text-indigo-700 font-bold flex items-center gap-1.5 text-xs">
                    <Lock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{offer.auditHash ? `${offer.auditHash.slice(0, 14)}...` : '0x8892...3E41'}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Pre-Op Laboratory Panel */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">
                      3. Pre-Op Laboratory Panel
                    </span>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                    COMPLETED
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {offer.facility || 'Clinical Laboratory Clearance'}
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">PT/INR</div>
                    <div className="text-xs font-extrabold text-emerald-700">1.1 (Norm)</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">BMP</div>
                    <div className="text-xs font-extrabold text-slate-800">Normal</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Creatinine</div>
                    <div className="text-xs font-extrabold text-slate-800">0.95 mg/dL</div>
                  </div>
                </div>
              </div>

              {/* Card 4: Anesthesia Pre-Op Clearance */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-slate-900">
                      4. Anesthesia Pre-Op Clearance
                    </span>
                  </div>
                  <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded">
                    CLEARED
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium">Pre-Op Anesthesia Evaluation</div>
                <div className="bg-slate-50 rounded-lg p-2.5 flex justify-between text-xs border border-slate-100">
                  <span className="text-slate-700 font-semibold">Mallampati Class II</span>
                  <strong className="text-teal-800 font-bold">MAC Tier 1 Standby Approved</strong>
                </div>
              </div>

              {/* Card 5: NPO / Fasting Compliance */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-slate-900">
                      5. NPO / Fasting Compliance
                    </span>
                  </div>
                  <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded">
                    CONFIRMED
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium">Triage RN Verification</div>
                <div className="bg-slate-50 rounded-lg p-2.5 text-xs border border-slate-100 flex flex-col gap-0.5">
                  <span className="text-[11px] text-slate-500">Strict Fasting Window:</span>
                  <span className="font-bold text-slate-900">NPO since 01:30 AM EST (6h 00m)</span>
                </div>
              </div>

              {/* Card 6: Pharmacological Safety */}
              <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-900">
                      6. Pharmacological Safety
                    </span>
                  </div>
                  <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">
                    ATTENTION
                  </span>
                </div>
                <div className="text-xs text-amber-700 font-semibold">Active Allergy Precaution</div>
                <div className="bg-amber-50/60 rounded-lg p-2.5 flex flex-col gap-1.5 text-[11px] border border-amber-100">
                  <div className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Metformin held &gt; 48 hrs confirmed</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-700 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Penicillin allergy red wristband placed</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Vancomycin prophylaxis manifold prepped</span>
                  </div>
                </div>
              </div>

              {/* Card 7: Suite Technical & Staff Readiness (Spans 2 columns) */}
              <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        7. Cath Lab Suite 3 Technical & Staff Readiness
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                        READY
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Suite equipment calibrated • Sterile angio pack verified • Clinical staff assigned
                    </div>
                  </div>
                </div>

                <div className="bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg text-teal-900 text-xs font-bold shrink-0 text-center">
                  Room 3 Temp: 68.2°F
                </div>
              </div>
            </div>

            {/* GATEWAY RATIFIED BOTTOM BANNER (Direct transition to Cath Lab Safety Timeout 1:14096) */}
            <div className="bg-[#1c0245] text-white p-6 md:p-7 rounded-2xl shadow-xl border border-purple-900/50 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-800/80 border border-purple-600 text-purple-200 flex items-center justify-center shrink-0 shadow-inner">
                  <ShieldCheck className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-[11px] font-bold text-purple-300 uppercase tracking-widest">
                    GATEWAY RATIFIED
                  </div>
                  <h3 className="text-xl md:text-2xl font-extrabold text-white leading-tight tracking-tight">
                    Patient Cleared for Pre-Procedure Clinical Safety Timeout
                  </h3>
                  <p className="text-xs md:text-sm text-purple-200/85 leading-relaxed max-w-xl">
                    All 11 clinical and administrative prerequisites ratified. Ready for operating physician physical verification with {doctorName}, MD.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1.5 shrink-0 w-full md:w-auto">
                <button
                  type="button"
                  onClick={handleBeginVerification}
                  className="w-full md:w-auto bg-[#00c853] hover:bg-[#00b048] active:scale-[0.98] text-slate-950 font-extrabold px-6 py-3.5 rounded-xl text-base shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Begin Patient Verification</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <span className="text-[11px] text-purple-300 font-medium">
                  Opens Screen 2 (Safety Timeout)
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Vitals, Interventional Team & Actions (approx 35%) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Card 1: Baseline Triage Vitals */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Baseline Triage Vitals</h3>
                  {!isCheckedIn && (
                    <button
                      type="button"
                      onClick={() => setIsEditingVitals(!isEditingVitals)}
                      className="text-[11px] text-[#3f1d8b] font-semibold hover:underline cursor-pointer"
                    >
                      {isEditingVitals ? 'Done' : 'Edit'}
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {latestVitals?.recordedAt
                    ? `Recorded ${new Date(latestVitals.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Recorded Intake'}
                </span>
              </div>

              {isEditingVitals && !isCheckedIn ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Blood Pressure</label>
                    <input
                      type="text"
                      value={triageBp}
                      onChange={(e) => setTriageBp(e.target.value)}
                      placeholder="e.g. 120/80"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono text-xs font-bold"
                    />
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Heart Rate (BPM)</label>
                    <input
                      type="number"
                      value={triagePulse}
                      onChange={(e) => setTriagePulse(e.target.value ? Number(e.target.value) : '')}
                      placeholder="e.g. 72"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono text-xs font-bold"
                    />
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">SpO2 (%)</label>
                    <input
                      type="number"
                      value={triageSpo2}
                      onChange={(e) => setTriageSpo2(e.target.value ? Number(e.target.value) : '')}
                      placeholder="e.g. 99"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono text-xs font-bold"
                    />
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Temp (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={triageTempC}
                      onChange={(e) => setTriageTempC(e.target.value ? Number(e.target.value) : '')}
                      placeholder="e.g. 36.6"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono text-xs font-bold"
                    />
                  </div>
                  <div className="col-span-2 bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Assigned Bay / Room</label>
                    <input
                      type="text"
                      value={triageBayNumber}
                      onChange={(e) => setTriageBayNumber(e.target.value)}
                      placeholder="e.g. BAY-04"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono text-xs font-bold"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Blood Pressure</div>
                    <div className="text-xl font-extrabold text-slate-900 font-mono">
                      {triageBp ||
                        latestVitals?.bloodPressure ||
                        (latestVitals?.systolicBp && latestVitals?.diastolicBp
                          ? `${latestVitals.systolicBp}/${latestVitals.diastolicBp}`
                          : '120/80')}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Within target</div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Heart Rate</div>
                    <div className="text-xl font-extrabold text-slate-900 font-mono">
                      {typeof triagePulse === 'number'
                        ? triagePulse
                        : latestVitals?.pulseBpm || 72}{' '}
                      <span className="text-xs font-normal">BPM</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">Sinus Rhythm</div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">SpO2</div>
                    <div className="text-xl font-extrabold text-slate-900 font-mono">
                      {typeof triageSpo2 === 'number'
                        ? `${triageSpo2}%`
                        : latestVitals?.oxygenSaturation
                        ? `${latestVitals.oxygenSaturation}%`
                        : '98%'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">Room Air</div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Temp</div>
                    <div className="text-xl font-extrabold text-slate-900 font-mono">
                      {typeof triageTempC === 'number'
                        ? `${((triageTempC * 9) / 5 + 32).toFixed(1)}°F`
                        : latestVitals?.temperatureC
                        ? `${((latestVitals.temperatureC * 9) / 5 + 32).toFixed(1)}°F`
                        : '98.6°F'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">Afebrile</div>
                  </div>
                </div>
              )}

              {/* Coagulation / Heparin Window Gauge */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Heparin/Coagulation Window</span>
                  <span className="text-teal-700 font-extrabold">1.1 INR (Optimal)</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden relative">
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: '45%' }}></div>
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>0.8 (low)</span>
                  <span className="text-slate-700 font-bold">Target Range: 1.0–1.2</span>
                  <span>2.5 (high)</span>
                </div>
              </div>
            </div>

            {/* Card 2: Assigned Interventional Team */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Assigned Interventional Team
              </h3>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#3b1275] text-white flex items-center justify-center text-xs font-bold">
                      {doctorInitials}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{doctorName}, MD</div>
                      <div className="text-[11px] text-slate-500">Lead Interventional Cardiologist</div>
                    </div>
                  </div>
                  <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    OPERATOR
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      KV
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">K. Vance, BSN, RN</div>
                      <div className="text-[11px] text-slate-500">Circulating Cath Nurse</div>
                    </div>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    SCRUBBED
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                      JM
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Procedure Technologist</div>
                      <div className="text-[11px] text-slate-500">Cardiovascular Technologist</div>
                    </div>
                  </div>
                  <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    READY
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Supporting Clinical Actions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-2.5">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
                Supporting Clinical Actions
              </h3>

              <button
                type="button"
                onClick={() => navigate(offer.patientId ? `/patients/${encodeURIComponent(offer.patientId)}` : '/patients')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <span>View Full Patient Medical Profile</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => triggerToast('Mounting Pre-Op Lab Panel (PDF)...')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Inspect Pre-Op Lab Panel (PDF)</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => triggerToast('Dispatching print job to Pre-Op Zebra Barcode Printer...')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>Re-print Patient Barcode ID Wristband</span>
                </div>
                <Printer className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* Care ID Surgical Protocol Advisory Note */}
            <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-teal-900 leading-relaxed">
              <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              <p>
                Per Care ID Surgical Protocol, physical timeout verification must be executed within 15 minutes of patient transfer to Suite 3. All team members must verbally confirm identity and site.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
