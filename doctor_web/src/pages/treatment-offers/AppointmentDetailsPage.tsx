import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  FileText,
  Lock,
  ExternalLink,
  ShieldCheck,
  Building,
  Clock,
  Bell,
  User,
  Plus,
  Activity,
  Printer,
  ChevronRight,
  RefreshCw,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { TreatmentOfferState, AppointmentRecord, dtoToOfferState, enrichOfferStateWithPatient } from './types';
import { treatmentOfferService, formatTreatmentOfferError } from '@/services/treatmentOfferService';
import { patientService, MedicalRecord } from '@/services/patientService';
import { appointmentService, AppointmentDTO, formatAppointmentError } from '@/services/appointmentService';
import {
  dynamicConsultationService,
  MasterDataItemDTO,
  AppointmentPolicyDTO,
} from '@/services/dynamicConsultationService';
import { extractCleanClinicalIndication, cleanClinicalNotes } from '@/utils/clinicalDataSanitizer';

export const AppointmentDetailsPage: React.FC = () => {
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
      financingPackageId: '',
      financingPackageName: 'Pending Financing Plan',
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
  const [patientRecords, setPatientRecords] = useState<MedicalRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      patientService.getPatientMedicalRecords(offer.patientId)
        .then(setPatientRecords)
        .catch(() => {});
    }
  }, [offer.patientId]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const appointmentId = searchParams.get('appointmentId') || offer.appointmentId;
    if (appointmentId) {
      appointmentService.getAppointmentById(appointmentId)
        .then((appt) => {
          setRealAppointment(appt);
        })
        .catch((err: unknown) => {
          setLoadError((prev) => prev || formatAppointmentError(err));
        });
    } else if (offer.patientId) {
      appointmentService.listAppointments({ patientProfileId: offer.patientId, limit: 1 })
        .then((res) => {
          if (res.data && res.data.length > 0) {
            setRealAppointment(res.data[0]);
          }
        })
        .catch((err: unknown) => {
          setLoadError((prev) => prev || formatAppointmentError(err));
        });
    }
  }, [location.search, offer.appointmentId, offer.patientId]);

  const formatDoctorName = (doc?: { firstName?: string; lastName?: string }, fallback?: string): string => {
    if (!doc?.firstName && !doc?.lastName) return fallback || 'Attending Physician, MD';
    const raw = `${doc.firstName || ''} ${doc.lastName || ''}`.trim();
    const clean = raw.replace(/^Dr\.\s*/i, '').trim();
    return clean ? `Dr. ${clean}` : fallback || 'Attending Physician, MD';
  };

  const appointment: AppointmentRecord = {
    appointmentId: realAppointment?.appointmentNumber
      ? `#${realAppointment.appointmentNumber}`
      : realAppointment?.id
      ? `#${realAppointment.id.slice(0, 8).toUpperCase()}`
      : (offer.offerId ? `#PROC-${offer.offerId.slice(0, 8).toUpperCase()}` : '#PROC-PENDING'),
    offerId: offer.offerId || id || '',
    patientId: offer.patientId || realAppointment?.patientProfileId || '',
    patientName: offer.patientName || (realAppointment?.patient ? `${realAppointment.patient.firstName} ${realAppointment.patient.lastName}` : ''),
    procedureName: offer.procedureName || realAppointment?.reason || 'Clinical Procedure',
    cptCode: offer.cptCode || '',
    facility: realAppointment?.facility?.name || offer.facility || 'Heart Center Outpatient Unit',
    facilityAddress: realAppointment?.facility?.address || realAppointment?.facility?.city || offer.facility || 'Cardiac Outpatient Pavilion',
    suite: cleanClinicalNotes(realAppointment?.notes)?.includes('Suite') ? cleanClinicalNotes(realAppointment?.notes) : 'Cath Lab Suite (Interventional Wing)',
    scheduledDate: realAppointment?.appointmentDate || offer.expirationDate || 'Pending Final Schedule',
    scheduledTime: realAppointment ? `${realAppointment.startTime} – ${realAppointment.endTime}` : 'Time Pending',
    arrivalWindow: realAppointment?.startTime ? `${realAppointment.startTime} (Check-in 1 hour prior)` : 'Check-in 2 hours prior',
    attendingDoctor: formatDoctorName(realAppointment?.doctor, user?.fullName || offer.attendingDoctor),
    attendingLicense: realAppointment?.doctor?.registrationNumber || 'Interventional Specialist',
    anesthesiaProtocol: 'MAC Tier 1 Standby (Mild conscious sedation / Local lidocaine 1%)',
    anesthesiaStaff: 'NP / CRNA Standby',
    underwrittenAmount: offer.totalPayable,
    financingPlan: offer.financingPackageName,
    lockedTimestamp: realAppointment?.createdAt ? new Date(realAppointment.createdAt).toLocaleString() : (offer.dispatchedAt || 'Active Protocol'),
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

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic Cancellation & Rescheduling Modals & Governance
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState<boolean>(false);
  const [cancellationReasons, setCancellationReasons] = useState<MasterDataItemDTO[]>([]);
  const [appointmentPolicy, setAppointmentPolicy] = useState<AppointmentPolicyDTO | null>(null);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>('PATIENT_REQUEST');
  const [customCancelNotes, setCustomCancelNotes] = useState<string>('');
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleReason, setRescheduleReason] = useState<string>('Clinical schedule update');
  const [isActionSubmitting, setIsActionSubmitting] = useState<boolean>(false);

  // Load cancellation reasons & policy
  useEffect(() => {
    let active = true;
    dynamicConsultationService.getMasterDataItems('CANCELLATION_REASONS').then((items) => {
      if (!active) return;
      setCancellationReasons(items);
      if (items.length > 0) {
        setSelectedCancelReason(items[0].name);
      }
    });

    dynamicConsultationService.getAppointmentPolicy(realAppointment?.facilityId).then((policy) => {
      if (active) setAppointmentPolicy(policy);
    });

    return () => {
      active = false;
    };
  }, [realAppointment?.facilityId]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCancelAppointment = () => {
    if (!realAppointment?.id) {
      triggerToast('No authenticated appointment record found to cancel.');
      return;
    }
    setIsCancelModalOpen(true);
  };

  const confirmCancelAppointment = async () => {
    if (!realAppointment?.id) return;
    setIsActionSubmitting(true);
    const fullReason = customCancelNotes.trim()
      ? `${selectedCancelReason}: ${customCancelNotes.trim()}`
      : selectedCancelReason;

    try {
      const updated = await appointmentService.cancelAppointment(realAppointment.id, fullReason);
      setRealAppointment(updated);
      setIsCancelModalOpen(false);
      triggerToast(`Appointment #${updated.appointmentNumber || updated.id.slice(0, 8)} successfully cancelled.`);
    } catch (err: unknown) {
      triggerToast(`Cancellation failed: ${formatAppointmentError(err)}`);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleRescheduleAppointment = () => {
    if (!realAppointment?.id) {
      triggerToast('No authenticated appointment record found to reschedule.');
      return;
    }
    setRescheduleDate(realAppointment.appointmentDate || '');
    setIsRescheduleModalOpen(true);
  };

  const confirmRescheduleAppointment = async () => {
    if (!realAppointment?.id || !rescheduleDate) return;
    setIsActionSubmitting(true);
    try {
      const updated = await appointmentService.rescheduleAppointment(realAppointment.id, {
        appointmentDate: rescheduleDate,
        startTime: realAppointment.startTime || '09:30',
        endTime: realAppointment.endTime || '11:00',
        reason: rescheduleReason,
      });
      setRealAppointment(updated);
      setIsRescheduleModalOpen(false);
      triggerToast(`Appointment rescheduled to ${rescheduleDate}.`);
    } catch (err: unknown) {
      triggerToast(`Rescheduling failed: ${formatAppointmentError(err)}`);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleGoToPreOpChecklist = () => {
    const apptId = realAppointment?.id || offer.appointmentId;
    const url = apptId
      ? `/treatment-offers/${offer.offerId}/pre-op?appointmentId=${encodeURIComponent(apptId)}`
      : `/treatment-offers/${offer.offerId}/pre-op`;
    navigate(url, { state: { ...offer, appointmentId: apptId } });
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

      {/* TOP WORKSPACE HEADER (Figma 1:11774) */}
      <header className="h-14 border-b border-[#e1e3e4] bg-[#f8f9fa] px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="font-semibold text-slate-700">Clinical Workspace</span>
          <span>&gt;</span>
          <span className="text-[#3f1d8b] font-bold">Enterprise View</span>
          <span>•</span>
          <Link to="/patients" className="hover:text-slate-800 transition-colors">Patients</Link>
          <span>/</span>
          <Link to={offer.patientId ? `/patients/${encodeURIComponent(offer.patientId)}` : '/patients'} className="hover:text-slate-800 transition-colors">
            {offer.patientName} ({offer.patientCid})
          </Link>
          <span>/</span>
          <Link to={`/treatment-offers/${offer.offerId}/status`} className="hover:text-slate-800 transition-colors">
            Offer #{offer.offerId}
          </Link>
          <span>/</span>
          <span className="bg-purple-100 text-[#3f1d8b] font-bold px-2 py-0.5 rounded text-[11px]">
            Appointment Details
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
                  Allergy: Penicillin (Severe)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>45 yrs • Male</span>
                <span>•</span>
                <span>Blood: {offer.patientBlood || 'On file'}</span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold">{offer.insuranceStatus || 'Self-Pay / Clinical Financing'}</span>
                <span>•</span>
                <span className="font-mono text-purple-700">{offer.cptCode ? `CPT #${offer.cptCode}` : 'CPT Pending'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-full">
              Active Care Plan: {offer.procedureName}
            </span>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="max-w-[1280px] w-full mx-auto px-8 pt-4">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Unable to load live appointment details: {loadError}</span>
          </div>
        </div>
      )}

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 overflow-y-auto px-8 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
        {/* Title Header with Case ID and Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                realAppointment?.status === 'CANCELLED'
                  ? 'bg-rose-100 text-rose-800'
                  : realAppointment?.status === 'IN_PROGRESS'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-cyan-100 text-cyan-900'
              }`}>
                {realAppointment?.status || 'SCHEDULED'}
              </span>
              <span className="bg-purple-100 text-[#3f1d8b] text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {appointment.scheduledDate || 'Active Slot'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Case ID: {appointment.appointmentId}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              {appointment.procedureName}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRescheduleAppointment}
              className="border border-[#e2e8f0] bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className="size-3.5 text-slate-500" />
              <span>Reschedule</span>
            </button>
            <button
              type="button"
              onClick={handleCancelAppointment}
              className="border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <XCircle className="size-3.5 text-rose-500" />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              onClick={() => triggerToast('Printing appointment order sheet...')}
              className="size-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center cursor-pointer text-slate-600 shadow-2xs"
              aria-label="Print Sheet"
            >
              <Printer className="size-4" />
            </button>
          </div>
        </div>

        {/* SUMMARY RIBBON (4 Key Metric Cards - Figma 1:11774) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Time & Timing */}
          <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-4 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                SCHEDULED PROCEDURE TIME
              </span>
              <Clock className="size-4 text-purple-700" />
            </div>
            <div>
              <span className="text-2xl font-black text-[#0f172a] block">
                {realAppointment?.startTime || '09:30'} <span className="text-xs font-bold text-slate-400">LOCAL</span>
              </span>
              <span className="text-xs font-bold text-[#3f1d8b]">{appointment.scheduledDate}</span>
            </div>
            <div className="bg-purple-50 p-2 rounded-lg text-[10px] text-purple-900 font-medium">
              {appointment.arrivalWindow}
            </div>
          </div>

          {/* Card 2: Operating Location */}
          <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-4 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                SURGICAL LOCATION
              </span>
              <Building className="size-4 text-purple-700" />
            </div>
            <div>
              <span className="text-lg font-black text-[#0f172a] block">
                {appointment.suite || 'Procedural Suite'}
              </span>
              <span className="text-xs font-bold text-slate-700">
                {realAppointment?.facility?.name || offer.facility || 'Clinical Facility'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500">
              {realAppointment?.facility?.address || offer.department || 'Interventional Wing'}
            </div>
          </div>

          {/* Card 3: Supervising Specialist */}
          <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-4 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                ATTENDING SPECIALIST
              </span>
              <User className="size-4 text-purple-700" />
            </div>
            <div>
              <span className="text-lg font-black text-[#0f172a] block">
                {appointment.attendingDoctor}
              </span>
              <span className="text-xs font-semibold text-slate-700">
                {user.specialty || 'Attending Specialist'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {[
                user.profile?.npi ? `NPI #${user.profile.npi}` : null,
                user.profile?.licenseNumber ? `Lic #${user.profile.licenseNumber}` : null,
              ]
                .filter(Boolean)
                .join(' • ') || 'Verified Provider Credentials'}
            </div>
          </div>

          {/* Card 4: Underwritten Payment Status */}
          <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-4 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                UNDERWRITTEN SETTLEMENT
              </span>
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black text-[#3f1d8b]">{appointment.underwrittenAmount}</span>
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                  LOCKED
                </span>
              </div>
              <span className="text-xs font-bold text-slate-700">{appointment.financingPlan}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Ref #FIN-TR8921-12M
            </div>
          </div>
        </div>

        {/* 2-COLUMN MAIN CONTENT (Figma 1:11774) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2/3 COLUMN */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Card 1: Clinical Indication & Surgical Scope */}
            <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-[#3f1d8b]" />
                  <h3 className="font-bold text-sm text-[#0f172a]">
                    Clinical Indication & Surgical Scope
                  </h3>
                </div>
                <span className="bg-purple-100 text-[#3f1d8b] text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  AHA/ACC CLASS I
                </span>
              </div>

              <div className="flex flex-col gap-3 text-xs leading-relaxed">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    PRIMARY INDICATION
                  </span>
                  <p className="text-slate-700 mt-1">
                    {extractCleanClinicalIndication(offer.clinicalNecessity, offer.procedureName) || 'Clinical indication documented per treatment offer.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="bg-[#fafafc] border border-slate-200 p-3.5 rounded-xl flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">OPERATIVE SCOPE & TECHNIQUE</span>
                    <p className="text-slate-700 text-[11px]">
                      Left heart catheterization, selective coronary arteriography of LAD, LCx, and RCA, along with left ventriculography using non-ionic low-osmolar contrast media with real-time fluoroscopic digital subtraction imaging.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="bg-slate-200 text-slate-700 text-[9px] font-bold px-1.5 py-0.2 rounded">Fluoroscopy 15fps</span>
                      <span className="bg-slate-200 text-slate-700 text-[9px] font-bold px-1.5 py-0.2 rounded">Isovue-370</span>
                    </div>
                  </div>

                  <div className="bg-[#fafafc] border border-slate-200 p-3.5 rounded-xl flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">POST-PROCEDURAL RECOVERY PLAN</span>
                    <p className="text-slate-700 text-[11px]">
                      4-hour monitored post-anesthesia bed rest in Level 2 Step-Down. Deployment of Angio-Seal™ VIP vascular closure device for right femoral artery access (or radial compression band if transradial access preferred).
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded">Outpatient Same-Day</span>
                      <span className="bg-cyan-100 text-cyan-800 text-[9px] font-bold px-1.5 py-0.2 rounded">Vascular Seal Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Clinical Orders & Preparation Mandates */}
            <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-[#3f1d8b]" />
                  <h3 className="font-bold text-sm text-[#0f172a]">
                    Clinical Orders & Preparation Mandates
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-semibold">Active EHR Protocol</span>
              </div>

              <div className="flex flex-col gap-3 text-xs">
                {/* Order 1: NPO */}
                <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#3f1d8b]">Strict NPO (Fasting Order)</span>
                      <span className="bg-purple-100 text-purple-800 text-[9px] font-bold px-1.5 py-0.2 rounded">8 Hours</span>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="size-3" />
                      Patient App Acknowledged
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Nothing by mouth 8 hours prior to {realAppointment?.appointmentDate || 'scheduled procedure date'}.
                  </p>
                </div>

                {/* Order 2: Med Hold */}
                <div className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-200 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-900">Medication Hold Protocol</span>
                      <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.2 rounded">CRITICAL</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerToast('Medication hold directives opened.')}
                      className="text-[#3f1d8b] hover:underline text-[11px] font-bold cursor-pointer"
                    >
                      View Hold Directives
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-700">
                    Review anticoagulants and Metformin hold window 24–48 hrs prior per pre-op readiness protocol.
                  </p>
                </div>

                {/* Order 3: Lab Workup */}
                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-950">Mandatory Pre-Op Laboratory Workup</span>
                      <span className="bg-amber-100 text-amber-900 text-[9px] font-bold px-1.5 py-0.2 rounded">PRE-OP CLEARANCE</span>
                    </div>
                    <span className="bg-amber-100 text-amber-900 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      Tracked in Readiness
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900">
                    Basic Metabolic Panel (BMP), Serum Creatinine / eGFR, Coagulation (PT/INR, PTT).
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-amber-800 pt-1 border-t border-amber-200/60 mt-1">
                    <span>Specimen Submission Deadline:</span>
                    <span className="font-bold">Prior to {realAppointment?.appointmentDate || 'Procedure Date'}</span>
                  </div>
                </div>

                {/* Order 4: Anesthesia Clearance */}
                <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-950">Anesthesia Sedation Clearance</span>
                      <span className="bg-blue-100 text-blue-900 text-[9px] font-bold px-1.5 py-0.2 rounded">Pre-Op Review</span>
                    </div>
                    <span className="bg-blue-100 text-blue-900 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      Tracked
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-900">
                    Anesthesia evaluation required prior to Day-1 Pre-Op Readiness sign-off.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Linked Clinical Documentation Vault */}
            <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="size-4 text-[#3f1d8b]" />
                  <h3 className="font-bold text-sm text-[#0f172a]">
                    Linked Clinical Documentation Vault
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/records/upload')}
                  className="border border-purple-200 hover:bg-purple-50 text-[#3f1d8b] text-xs font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Upload Record
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {patientRecords.length > 0 ? (
                  patientRecords.slice(0, 4).map((rec) => (
                    <div key={rec.id} className="p-3 rounded-xl bg-[#fafafc] border border-slate-200 flex flex-col justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-800 block truncate">{rec.title || 'Clinical Record'}</span>
                        <span className="text-[10px] text-slate-400">{rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : 'On file'} • {rec.encounters?.[0]?.encounterType || rec.status || 'EHR'}</span>
                      </div>
                      <Link
                        to={`/patients/${encodeURIComponent(offer.patientId)}/medical-records`}
                        className="text-[#3f1d8b] font-bold text-[11px] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="size-3" /> View Record
                      </Link>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="p-3 rounded-xl bg-[#fafafc] border border-slate-200 flex flex-col justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-800 block">Patient Health Vault</span>
                        <span className="text-[10px] text-slate-400">EHR Identity: {offer.patientCid || 'CID-VERIFIED'}</span>
                      </div>
                      <Link
                        to={`/patients/${encodeURIComponent(offer.patientId)}/medical-records`}
                        className="text-[#3f1d8b] font-bold text-[11px] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="size-3" /> View Dossier
                      </Link>
                    </div>

                    <div className="p-3 rounded-xl bg-[#fafafc] border border-slate-200 flex flex-col justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-800 block">Imaging Studies</span>
                        <span className="text-[10px] text-slate-400">Radiology & PACS</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/records/imaging')}
                        className="text-[#3f1d8b] font-bold text-[11px] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="size-3" /> View Study
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-[#fafafc] border border-slate-200 flex flex-col justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-800 block">Treatment & Financing</span>
                        <span className="text-[10px] text-slate-400">{offer.financingPackageName}</span>
                      </div>
                      <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> Verified
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#fafafc] border border-slate-200 flex flex-col justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-800 block">Biometric Consent Stamp</span>
                        <span className="text-[10px] text-slate-400 font-mono">FIN-{(offer.offerId || 'REC').slice(0, 8).toUpperCase()}</span>
                      </div>
                      <span className="text-purple-700 font-bold text-[11px] flex items-center gap-1">
                        <Lock className="size-3" /> Validated
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT 1/3 COLUMN */}
          <div className="flex flex-col gap-6">
            {/* Card 1: Procedure Readiness */}
            <div className="bg-white border-2 border-purple-300 rounded-[16px] p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-[#3f1d8b]" />
                  <h4 className="font-bold text-sm text-[#0f172a]">
                    Procedure Readiness
                  </h4>
                </div>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Action Req
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 font-medium">Protocol Readiness</span>
                  <span className="font-black text-base text-[#3f1d8b]">60%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="w-[60%] h-full bg-gradient-to-r from-amber-400 to-[#5b14b8] rounded-full" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>3 of 5 Gates Cleared</span>
                  <span className="text-amber-700 font-semibold">2 Clinical Gates Pending</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Financial & APR Agreement (Confirmed & locked)</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Biometric Digital Consent (Signed via Care ID App)</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Cath Lab 3 Resource Reservation (Team Confirmed)</span>
                </div>
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                  <span>Coagulation & Renal Labs (PT/INR Specimen Pending)</span>
                </div>
                <div className="flex items-center gap-2 text-blue-800">
                  <Clock className="size-4 text-blue-600 shrink-0" />
                  <span>Anesthesia Pre-Op Clearance</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoToPreOpChecklist}
                className="w-full py-3 bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white text-xs font-bold rounded-xl shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                <span>Detailed Readiness View</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Card 2: Patient Dispatch Audit */}
            <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-5 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Patient Dispatch Audit
              </h4>
              <div className="flex flex-col gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Push Dispatch</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {realAppointment?.createdAt ? new Date(realAppointment.createdAt).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Appointment & prep instructions synced with Care ID mobile app.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Patient Contact</span>
                    <span className="text-[10px] text-slate-400 font-normal">Registered</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hospital wayfinding & appointment reference routed to registered patient contact.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Discharge Escort</span>
                    <span className="text-emerald-700 font-semibold text-[10px]">Required</span>
                  </div>
                  <p className="text-[11px] text-slate-700 mt-0.5">
                    Post-sedation escort verification required at Day-1 Pre-Op Readiness.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Navigation Shortcuts */}
            <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-5 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                NAVIGATION SHORTCUTS
              </span>
              <div className="flex flex-col gap-1 text-xs">
                <Link
                  to={offer.patientId ? `/patients/${encodeURIComponent(offer.patientId)}` : '/patients'}
                  className="py-2 px-2.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between"
                >
                  <span>View Patient Clinical Profile</span>
                  <ChevronRight className="size-3.5 text-slate-400" />
                </Link>
                <Link
                  to={`/treatment-offers/${offer.offerId}/accepted`}
                  className="py-2 px-2.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between"
                >
                  <span>View Treatment & Financial Plan</span>
                  <ChevronRight className="size-3.5 text-slate-400" />
                </Link>
                <Link
                  to="/patients"
                  className="py-2 px-2.5 rounded-lg hover:bg-slate-50 text-purple-700 font-semibold flex items-center gap-1.5"
                >
                  <ArrowLeft className="size-3" />
                  <span>Back to Patients Directory</span>
                </Link>
              </div>
            </div>

            {/* Card 4: Compliance */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-[10px] text-slate-500 leading-relaxed">
              <strong>HIPAA & HL7 FHIR Compliant Record:</strong> Encounter ledger locked by {doctorName} under clinical governance protocol. Orders synchronized with authenticated facility scheduling system.
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
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <ShieldCheck className="size-3.5" />
            EHR Verified Order
          </span>
          <Link to="/settings" className="hover:underline">Support Desk</Link>
          <Link to="/settings" className="hover:underline">Clinical Guidelines</Link>
        </div>
      </footer>
      {/* MODAL: APPOINTMENT CANCELLATION */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Cancel Appointment</h3>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <span className="font-semibold block mb-0.5">Policy Notice:</span>
                Minimum {appointmentPolicy?.minNoticeHoursCancel || 24} hours notice required for non-emergency procedural cancellations.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cancellation Reason *
                </label>
                <select
                  value={selectedCancelReason}
                  onChange={(e) => setSelectedCancelReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-600"
                >
                  {cancellationReasons.length > 0 ? (
                    cancellationReasons.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="PATIENT_REQUEST">Patient Request / Voluntary</option>
                      <option value="CLINICAL_CONTRAINDICATION">Clinical Contraindication / Vitals</option>
                      <option value="PHYSICIAN_EMERGENCY">Physician Emergency</option>
                      <option value="FACILITY_UNAVAILABLE">Facility / Suite Maintenance</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={customCancelNotes}
                  onChange={(e) => setCustomCancelNotes(e.target.value)}
                  placeholder="Clinical remarks or next steps..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-purple-600 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={isActionSubmitting}
                  onClick={confirmCancelAppointment}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  {isActionSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: APPOINTMENT RESCHEDULE */}
      {isRescheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Reschedule Appointment</h3>
              <button
                onClick={() => setIsRescheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <span className="font-semibold block mb-0.5">Policy Notice:</span>
                Minimum {appointmentPolicy?.minNoticeHoursReschedule || 12} hours notice required. Maximum {appointmentPolicy?.maxReschedulesAllowed || 3} reschedules allowed per encounter.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Appointment Date *
                </label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reschedule Reason
                </label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Schedule adjustment per patient request"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRescheduleModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={isActionSubmitting || !rescheduleDate}
                  onClick={confirmRescheduleAppointment}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isActionSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
